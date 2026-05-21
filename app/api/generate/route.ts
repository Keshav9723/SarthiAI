// app/api/generate/route.ts
// Production Generate Itinerary endpoint. Auth-gated: only signed-in users
// can hit this. Runs the orchestrator with the user's wizard input and
// persists the resulting itinerary to the `itineraries` table.
//
// Request body (JSON):
//   {
//     fromCity:     "Mumbai",
//     destinations: ["Goa"],          // first one used; multi-city in Phase F
//     group:        "couple",
//     groupSize:    2,
//     budget:       6000,             // per-person daily-ish (we treat as full per-person)
//     startDate:    "2026-11-12",     // optional
//     endDate:      "2026-11-15",     // optional
//     skipDates:    false,
//     interests:    ["food","beaches"], // optional
//     pace:         "balanced",        // optional
//     hotelType:    "boutique",        // optional
//     notes:        "..."              // optional free text
//   }
//
// Response (JSON):
//   { id: "uuid", durationMs: number }
//
// Errors:
//   401 — no session                              (must sign in)
//   400 — invalid body
//   404 — destination not found in our DB
//   500 — orchestrator / LLM / DB failure        (with .error field)

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/orchestrator/loop";
import { ALL_TOOLS } from "@/lib/orchestrator/tools";
import { ItinerarySchema } from "@/lib/schemas/itinerary";
import { insertGeneratedItinerary } from "@/lib/queries/itineraries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// What we accept from the wizard. Looser than WizardInputSchema because the
// frontend hasn't been refactored yet — we adapt fields here.
const GenerateRequestSchema = z.object({
  fromCity:     z.string().min(1),
  destinations: z.array(z.string().min(1)).min(1),
  group:        z.enum(["couple", "family", "friends", "solo"]),
  groupSize:    z.number().int().min(1).max(20),
  budget:       z.number().int().min(5000),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
  skipDates:    z.boolean().optional(),
  interests:    z.array(z.string()).optional(),
  pace:         z.string().nullable().optional(),
  hotelType:    z.string().nullable().optional(),
  notes:        z.string().optional(),
});
type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export async function POST(req: NextRequest) {
  // ---- 1. Auth gate ----
  const sb = createServerClient();
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json(
      { error: "Sign in to generate trips." },
      { status: 401 }
    );
  }

  // ---- 2. Validate body ----
  let parsed: GenerateRequest;
  try {
    const body = await req.json();
    const result = GenerateRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.format() },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ---- 3. Resolve destination row (uuid + state + lat/lng) ----
  const destinationName = parsed.destinations[0];
  const { data: dest, error: destErr } = await sb
    .from("destinations")
    .select("id, name, slug, state, destination_type, region, latitude, longitude")
    .ilike("name", destinationName)
    .limit(1)
    .maybeSingle();

  if (destErr || !dest) {
    return NextResponse.json(
      { error: `We don't have data for "${destinationName}" yet.` },
      { status: 404 }
    );
  }

  // ---- 4. Compute trip params from wizard input ----
  const { days, startDate, monthNumber } = deriveTripDates(parsed);
  const totalBudget = parsed.budget * parsed.groupSize;
  const monthName = new Date(`${startDate}T00:00:00Z`).toLocaleString("en", { month: "long" });

  // ---- 5. Build prompts + run orchestrator ----
  const system = buildSystemPrompt();
  const user_prompt = buildUserPrompt({
    dest, parsed, days, startDate, monthName, totalBudget,
  });

  const startedAt = Date.now();
  const orchestratorResult = await runOrchestrator({
    system,
    user: user_prompt,
    tools: ALL_TOOLS,
    finalSchema: ItinerarySchema,
    maxIterations: 15,    // 70% threshold ≈ 11 → finalize nudge fires at iter 11
    temperature: 0.3,
  });

  if (!orchestratorResult.final) {
    return NextResponse.json(
      {
        error: orchestratorResult.error ?? "Couldn't generate the itinerary.",
        iterations: orchestratorResult.iterations,
        toolCallCount: orchestratorResult.toolCalls.length,
      },
      { status: 500 }
    );
  }

  // ---- 6. Persist to DB ----
  try {
    const { id } = await insertGeneratedItinerary({
      userId: user.id,
      itinerary: orchestratorResult.final,
      fromCity: parsed.fromCity,
    });
    return NextResponse.json({
      id,
      durationMs: Date.now() - startedAt,
      iterations: orchestratorResult.iterations,
      toolCallCount: orchestratorResult.toolCalls.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveTripDates(parsed: GenerateRequest): {
  days: number;
  startDate: string;     // YYYY-MM-DD
  monthNumber: number;
} {
  // Case 1: user gave both start + end dates → use them directly
  if (!parsed.skipDates && parsed.startDate && parsed.endDate) {
    const s = new Date(parsed.startDate);
    const e = new Date(parsed.endDate);
    const ms = e.getTime() - s.getTime();
    const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
    return {
      days,
      startDate: parsed.startDate,
      monthNumber: s.getUTCMonth() + 1,
    };
  }

  // Case 2: just a start date — assume 5-day trip
  if (!parsed.skipDates && parsed.startDate) {
    const s = new Date(parsed.startDate);
    return {
      days: 5,
      startDate: parsed.startDate,
      monthNumber: s.getUTCMonth() + 1,
    };
  }

  // Case 3: skipped or no dates → default to 5 days, two months out
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 12));
  const iso = target.toISOString().slice(0, 10);
  return {
    days: 5,
    startDate: iso,
    monthNumber: target.getUTCMonth() + 1,
  };
}

function buildSystemPrompt(): string {
  return `
You are Sarthi, an expert India travel itinerary planner. Plan a personalized trip for the user using ONLY the data returned by your tools — do not invent prices, attractions, or restaurants that the tools haven't told you about.

You have access to these tools:
  • get_transport_quotes — flight/train/bus/drive prices between cities for the date (ONE-WAY, per passenger)
  • get_hotel_prices — per-night prices by tier for the destination + check-in date
  • get_local_transport_estimate — per-day local transport cost inside the destination
  • get_destination_facts — verified facts from the knowledge base (RAG retrieval)
  • get_climate — monthly comfort scores + temperature/rain for the destination
  • compare_to_typical — judge whether a quoted price is LOW/NORMAL/HIGH

Approach the planning in this order:
  1. Call get_transport_quotes for the route + date.
  2. Pick the most reasonable transport mode given the user's budget.
  3. Call get_hotel_prices for the destination + check-in, tier appropriate to budget.
  4. Call get_local_transport_estimate for the destination + days.
  5. Call get_destination_facts a few times to gather attractions / food / activities (use content_types filter).
  6. Call get_climate for context on the travel month.
  7. (Optional) Call compare_to_typical on transport + hotel prices for insight notes.
  8. Finally, emit the complete itinerary as a single JSON object.

CRITICAL — Math + budget rules:
  • group_type MUST match group_size. couple ⇔ 2, solo ⇔ 1, family ≥ 3, friends ≥ 2.
  • Transport prices from get_transport_quotes are ONE-WAY per passenger. Round-trip total = cheapest_inr × passengers × 2.
  • total_budget = round-trip transport (all pax) + hotel total_for_stay_inr + local transport total + estimated meals/activities for all pax.
  • price_per_person = total_budget / group_size.
  • Verify: total_budget / group_size = price_per_person to the integer.

CRITICAL — Route rules:
  • The route array MUST include the origin city (nights:0, with outbound transfer_to_next) AND every destination city.
  • Add a return-leg transfer_to_next on the last destination unless the user explicitly skips return.

CRITICAL — Final output rules:
  • Final answer MUST be valid JSON, no markdown, no prose around it.
  • Schema:
{
  "title": string,
  "destination": string,
  "state": string,
  "duration": string,
  "nights": integer,
  "total_days": integer,
  "group_type": "couple"|"family"|"friends"|"solo",
  "group_size": integer,
  "highlights": [string, ...],
  "total_budget": integer,
  "price_per_person": integer,
  "days": [
    { "day_number": integer, "location": string,
      "morning": string, "afternoon": string, "evening": string,
      "type": "arrival"|"explore"|"relax"|"adventure"|"cultural"|"food"|"transfer"|"departure" }
  ],
  "route": [
    { "city": string, "nights": integer,
      "transfer_to_next": null | { "mode":"flight"|"train"|"bus"|"drive"|"taxi", "label":string, "duration":string } }
  ],
  "inclusions": [string, ...],
  "exclusions": [string, ...]
}
`.trim();
}

function buildUserPrompt(opts: {
  dest: { id: string; name: string; state: string; destination_type: string | null };
  parsed: GenerateRequest;
  days: number;
  startDate: string;
  monthName: string;
  totalBudget: number;
}): string {
  const { dest, parsed, days, startDate, monthName, totalBudget } = opts;
  const prefs: string[] = [];
  if (parsed.interests?.length) prefs.push(`Interests: ${parsed.interests.join(", ")}`);
  if (parsed.pace) prefs.push(`Pace: ${parsed.pace}`);
  if (parsed.hotelType) prefs.push(`Hotel style: ${parsed.hotelType}`);
  if (parsed.notes?.trim()) prefs.push(`Notes: ${parsed.notes.trim()}`);

  return `
Plan this trip:

Destination: ${dest.name}, ${dest.state}
Destination UUID (use for tool calls): ${dest.id}
Destination type: ${dest.destination_type ?? "unknown"}
Days: ${days}
Nights: ${days - 1}
Travel month: ${monthName} (use date ${startDate} for transport queries)
From city: ${parsed.fromCity}
Group: ${parsed.groupSize} ${parsed.group}
Daily budget per person: ₹${parsed.budget.toLocaleString("en-IN")}
Total trip budget: ₹${totalBudget.toLocaleString("en-IN")}
${prefs.length ? `\nUser preferences:\n${prefs.map((p) => `  • ${p}`).join("\n")}` : ""}
`.trim();
}
