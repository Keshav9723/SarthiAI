// app/api/debug/orchestrate/route.ts
// Dev-only endpoint to drive the orchestrator end-to-end. Accepts a wizard-
// shaped input, runs the tool-use loop with all registered tools, and returns:
//   • The final validated itinerary
//   • Every tool call the LLM made (args + result + duration + errors)
//   • The full conversation transcript (for debugging)
//
// Use:
//   curl -X POST http://localhost:3000/api/debug/orchestrate \
//     -H "Content-Type: application/json" \
//     -d '{"destination":"manali","days":5,"group":"couple","group_size":2,"budget_per_person":8000,"from_city":"Delhi","month":10}'

import { NextResponse, type NextRequest } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator/loop";
import { ALL_TOOLS } from "@/lib/orchestrator/tools";
import { ItinerarySchema, WizardInputSchema } from "@/lib/schemas/itinerary";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — tool-use loop can run long

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug routes are disabled in production." },
      { status: 403 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = WizardInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid wizard input", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Look up destination row so we can pass the UUID + name + state to the LLM
  const sb = createServerClient();
  const { data: dest, error: destErr } = await sb
    .from("destinations")
    .select("id, name, state, destination_type, region, latitude, longitude")
    .eq("slug", input.destination)
    .maybeSingle();
  if (destErr || !dest) {
    return NextResponse.json(
      { error: `Destination not found: ${input.destination}` },
      { status: 404 }
    );
  }

  // ---- Build the system + user prompt ----
  const totalBudget = input.budget_per_person * input.group_size * input.days;
  const startDate = input.start_date ?? guessStartDate(input.month);
  const monthName = new Date(`${startDate}T00:00:00Z`).toLocaleString("en", { month: "long" });

  const system = `
You are Sarthi, an expert India travel itinerary planner. Plan a personalized trip for the user using ONLY the data returned by your tools — do not invent prices, attractions, or restaurants that the tools haven't told you about.

You have access to these tools:
  • get_transport_quotes — flight/train/bus/drive prices between cities for the date (ONE-WAY, per route)
  • get_hotel_prices — per-night prices by tier for the destination + check-in date
  • get_local_transport_estimate — per-day local transport cost inside the destination
  • get_destination_facts — verified facts from the knowledge base (RAG retrieval)
  • get_climate — monthly comfort scores + temperature/rain for the destination
  • compare_to_typical — judge whether a quoted price is LOW/NORMAL/HIGH

Approach the planning in this order:
  1. Call get_transport_quotes for the route + date.
  2. Pick the most reasonable transport mode for the user's budget.
  3. Call get_hotel_prices for the destination + check-in, tier appropriate to budget.
  4. Call get_local_transport_estimate for the destination + days.
  5. Calculate remaining budget for activities + food.
  6. Call get_destination_facts a few times to gather attractions / food / activities.
  7. Call get_climate for context on the travel month.
  8. (Optional) Call compare_to_typical on transport + hotel prices to surface insights.
  9. Finally, emit the complete itinerary as a single JSON object.

CRITICAL — Math + budget rules:
  • group_type MUST match group_size. If user specified 4 people, group_type cannot be "couple" — use "friends" or "family" instead. couple ⇔ 2, solo ⇔ 1, family ≥ 3, friends ≥ 2.
  • Transport prices from get_transport_quotes are ONE-WAY per passenger. For ROUND-TRIP cost: cheapest_inr × passengers × 2.
  • total_budget = round-trip transport (all pax) + hotel total_for_stay_inr + local transport total + estimated meals/activities for all pax.
  • price_per_person = total_budget / group_size.
  • Verify your math: re-check that total_budget / group_size = price_per_person to the integer.

CRITICAL — Route rules:
  • The route array MUST include the origin city (with nights:0 and transfer_to_next describing the outbound leg) AND every destination city.
  • Example for Mumbai → Goa 3 nights → Mumbai:
    [
      { "city": "Mumbai", "nights": 0, "transfer_to_next": { "mode":"train", "label":"Mumbai → Goa", "duration":"8h" } },
      { "city": "Goa", "nights": 3, "transfer_to_next": { "mode":"train", "label":"Goa → Mumbai (return)", "duration":"8h" } }
    ]

CRITICAL — Final output rules:
  • Final answer MUST be valid JSON, no markdown, no prose around it.
  • Must match this shape (all fields required unless marked optional):
{
  "title": string,
  "destination": string,
  "state": string,
  "duration": string,                    // e.g. "4 nights / 5 days"
  "nights": integer,
  "total_days": integer,
  "group_type": "couple"|"family"|"friends"|"solo",
  "group_size": integer,
  "highlights": [string, ...],           // 4-8 trip highlights
  "total_budget": integer,               // in INR — see math rules above
  "price_per_person": integer,           // in INR — total_budget / group_size
  "days": [
    { "day_number": integer, "location": string,
      "morning": string, "afternoon": string, "evening": string,
      "type": "arrival"|"explore"|"relax"|"adventure"|"cultural"|"food"|"transfer"|"departure" }
  ],
  "route": [
    { "city": string, "nights": integer,
      "transfer_to_next": null | { "mode":"flight"|"train"|"bus"|"drive"|"taxi", "label":string, "duration":string } }
  ],
  "inclusions": [string, ...],           // include ROUND-TRIP transport cost, hotel total, local transport
  "exclusions": [string, ...]
}
`;

  const user = `
Please plan this trip:

Destination: ${dest.name}, ${dest.state}
Destination UUID (for tool calls): ${dest.id}
Destination type: ${dest.destination_type ?? "unknown"}
Days: ${input.days}
Nights: ${input.days - 1}
Travel month: ${monthName} (use date ${startDate} for transport queries)
From city: ${input.from_city}
Group: ${input.group_size} ${input.group}
Daily budget per person: ₹${input.budget_per_person.toLocaleString("en-IN")}
Total trip budget: ₹${totalBudget.toLocaleString("en-IN")}
`.trim();

  const startedAt = Date.now();
  const result = await runOrchestrator({
    system, user,
    tools: ALL_TOOLS,
    finalSchema: ItinerarySchema,
    maxIterations: 10,
    temperature: 0.3,
  });
  const totalMs = Date.now() - startedAt;

  return NextResponse.json({
    durationMs: totalMs,
    iterations: result.iterations,
    error: result.error,
    toolCalls: result.toolCalls,
    itinerary: result.final,
    // Optionally include the full conversation transcript — uncomment if needed
    // conversation: result.conversation,
  });
}

/** If no start_date provided, pick the 12th of the requested month at the current year. */
function guessStartDate(month: number): string {
  const now = new Date();
  let year = now.getUTCFullYear();
  if (month < now.getUTCMonth() + 1) year += 1; // month already passed — assume next year
  const mm = month.toString().padStart(2, "0");
  return `${year}-${mm}-12`;
}
