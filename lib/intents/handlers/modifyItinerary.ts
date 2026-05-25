// lib/intents/handlers/modifyItinerary.ts
// "Swap day 3 evening with a sunset cruise" — LLM rewrites parts of the
// itinerary the user is currently viewing.
//
// Flow:
//   1. Intent classifier (already done) routes here with extracted destination
//      and the user's edit request
//   2. We need the itinerary id — read from ctx.pageContext + page params (the
//      chat widget passes the itinerary uuid as ctx.pageDestination for the
//      /itinerary/[id] page)
//   3. Load the itinerary from DB
//   4. Build a prompt that includes:
//        - Current itinerary days (compact)
//        - The user's edit request
//        - Available patch operations (schema description)
//   5. Call generateStructured with ItineraryPatchSchema
//   6. POST /api/itinerary/[id] with the patches to apply them
//   7. Stream a confirmation message to the user

import { generateStructured } from "@/lib/api/llm";
import { ItineraryPatchSchema } from "@/lib/schemas/itinerary-patch";
import { getItineraryById } from "@/lib/queries/itineraries";
import { createServerClient } from "@/lib/supabase/server";
import { applyItineraryPatch } from "@/lib/itinerary/applyPatch";
import { ItinerarySchema } from "@/lib/schemas/itinerary";
import type { HandlerContext, HandlerEvent } from "../types";

const SYSTEM = `You are Sarthi, editing an existing travel itinerary at the user's request.

You will receive:
  • The current itinerary's days (with day_number, location, morning, afternoon, evening)
  • The user's edit request

You must respond with a JSON object containing a "patches" array describing concrete edits to apply, plus a short user-visible "summary" of what you changed.

Patch operations:
  • {"op":"replace_slot","day_number":N,"slot":"morning|afternoon|evening","text":"<new text>"}
    — Completely replace one half-day with new content.
  • {"op":"append_slot","day_number":N,"slot":"morning|afternoon|evening","text":"<addition>"}
    — Add a note to an existing slot WITHOUT replacing it.
  • {"op":"replace_day","day_number":N,"morning":"...","afternoon":"...","evening":"...","location":"...","type":"explore"}
    — Replace all three slots of a day.
  • {"op":"rename_title","title":"<new title>"} — Change the trip title.
  • {"op":"set_highlights","highlights":["...","..."]} — Replace the highlights list.

RULES:
  • Emit ONLY valid JSON. No markdown. No commentary outside the JSON.
  • Output schema:
    {
      "patches": [<one or more op objects>],
      "summary": "<short, plain-English description of what you changed>"
    }
  • Keep new text concrete and time-appropriate (e.g. "morning" should sound like a morning activity).
  • Don't change anything the user didn't ask for. If they say "swap day 3 evening", emit ONE patch for day 3 evening only.
  • If the request is ambiguous or you can't determine which day/slot, return:
    {"patches":[], "summary":"I need a bit more detail — which day were you thinking of?"}`;

export async function* handleModifyItinerary(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  // 1. Determine which itinerary to edit. The chat widget passes the page
  // context — on /itinerary/[id] the page param ends up as pageDestination
  // (we'll improve this later by adding a dedicated pageItineraryId field).
  if (ctx.pageContext !== "itinerary" || !ctx.pageDestination) {
    yield {
      type: "token",
      content: "Open the itinerary you want to edit first — then ask me to change something. For example: \"swap day 3 evening with a sunset cruise\".",
    };
    return;
  }

  if (!ctx.userId) {
    yield {
      type: "token",
      content: "Sign in to edit your itineraries — your changes need to save to your account.",
    };
    return;
  }

  // 2. Load the itinerary (the pageDestination is the id-or-slug from the URL)
  const itineraryRow = await getItineraryById(ctx.pageDestination);
  if (!itineraryRow) {
    yield {
      type: "token",
      content: "Couldn't find that itinerary. Try refreshing the page.",
    };
    return;
  }
  if (itineraryRow.is_template) {
    yield {
      type: "token",
      content: "This is a pre-built template — I can't edit it directly. Generate your own copy first (Generate → pick this destination) and I'll be able to edit that one.",
    };
    return;
  }
  if (itineraryRow.user_id !== ctx.userId) {
    yield {
      type: "token",
      content: "You can only edit itineraries that belong to your account.",
    };
    return;
  }

  // 3. Reconstruct an ItinerarySchema-shaped object
  const itineraryParse = ItinerarySchema.safeParse({
    title: itineraryRow.title,
    destination: itineraryRow.destination,
    state: itineraryRow.state,
    duration: itineraryRow.duration,
    nights: itineraryRow.nights,
    total_days: itineraryRow.total_days,
    group_type: itineraryRow.group_type,
    group_size: itineraryRow.group_size,
    highlights: itineraryRow.highlights ?? [],
    total_budget: itineraryRow.total_budget,
    price_per_person: itineraryRow.price_per_person,
    days: itineraryRow.days,
    route: itineraryRow.route,
    inclusions: itineraryRow.inclusions ?? [],
    exclusions: itineraryRow.exclusions ?? [],
  });
  if (!itineraryParse.success) {
    yield {
      type: "token",
      content: "This itinerary has an unexpected format — I can't edit it. Try regenerating it.",
    };
    return;
  }
  const itinerary = itineraryParse.data;

  // 4. Build the prompt
  const daysBlock = itinerary.days
    .map(
      (d) =>
        `Day ${d.day_number} (${d.location}, ${d.type ?? "explore"}):\n` +
        `  morning: ${d.morning}\n` +
        `  afternoon: ${d.afternoon}\n` +
        `  evening: ${d.evening}`
    )
    .join("\n\n");

  const userPrompt =
    `Trip: ${itinerary.title} — ${itinerary.destination}, ${itinerary.state} ` +
    `(${itinerary.total_days} days for ${itinerary.group_size} ${itinerary.group_type})\n\n` +
    `Current plan:\n${daysBlock}\n\n` +
    `Current highlights: ${itinerary.highlights.join(", ")}\n\n` +
    `User's edit request: "${ctx.message}"\n\n` +
    `Emit the JSON patch now.`;

  // 5. Generate the patch
  let patch;
  try {
    patch = await generateStructured({
      system: SYSTEM,
      user: userPrompt,
      schema: ItineraryPatchSchema,
      temperature: 0.3,
      maxRetries: 1,
      maxTokens: 1500,
    });
  } catch (err) {
    yield {
      type: "token",
      content: `I couldn't figure out how to make that edit — ${(err as Error).message}. Try phrasing it more specifically, like "replace day 2 morning with a beach walk".`,
    };
    return;
  }

  // 6. If LLM returned 0 patches (ambiguous), surface its summary
  if (patch.patches.length === 0) {
    for (const chunk of chunkString(patch.summary, 60)) {
      yield { type: "token", content: chunk };
      await new Promise((r) => setTimeout(r, 18));
    }
    return;
  }

  // 7. Apply + persist
  const updated = applyItineraryPatch(itinerary, patch);
  const sb = createServerClient();
  // .select() returns the updated rows so we can tell if RLS silently
  // dropped the write (success with zero rows affected — common when the
  // server client can't see the user's session JWT for some reason).
  const { data: updatedRows, error: updateErr } = await sb
    .from("itineraries")
    .update({
      title: updated.title,
      days: updated.days,
      highlights: updated.highlights,
    })
    .eq("id", itineraryRow.id)
    .select("id");

  if (updateErr) {
    yield {
      type: "token",
      content: `I planned the edit but couldn't save it: ${updateErr.message}`,
    };
    return;
  }
  if (!updatedRows || updatedRows.length === 0) {
    console.error("[modify_itinerary] update affected 0 rows", {
      itineraryId: itineraryRow.id,
      userId: ctx.userId,
    });
    yield {
      type: "token",
      content: "I planned the edit but the save was blocked — your session may have expired. Try signing out and back in, then ask again.",
    };
    return;
  }

  // 8. Stream the confirmation
  const reply =
    `✓ ${patch.summary}\n\n` +
    `Applied ${patch.patches.length} change${patch.patches.length === 1 ? "" : "s"} to your itinerary.\n\n` +
    `**Refresh the page** to see the updated plan.`;
  for (const chunk of chunkString(reply, 60)) {
    yield { type: "token", content: chunk };
    await new Promise((r) => setTimeout(r, 18));
  }

  yield {
    type: "metadata",
    data: {
      itinerary_id: itineraryRow.id,
      patches: patch.patches,
    },
  };
}

function chunkString(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}
