// lib/intents/handlers/viewItineraries.ts
// "Show my trips" — fetches the user's itineraries from Supabase and emits
// a formatted list. No LLM call needed — pure data lookup + templating.

import { listUserItineraries } from "@/lib/queries/itineraries";
import type { HandlerContext, HandlerEvent } from "../types";

export async function* handleViewItineraries(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  if (!ctx.userId) {
    yield {
      type: "token",
      content:
        "You'll need to sign in to see your saved trips. Tap the avatar in the top right, or visit /auth.",
    };
    return;
  }

  let rows;
  try {
    rows = await listUserItineraries(ctx.userId);
  } catch (err) {
    yield {
      type: "token",
      content: `Couldn't load your itineraries (${(err as Error).message}).`,
    };
    return;
  }

  if (rows.length === 0) {
    yield {
      type: "token",
      content:
        "You don't have any saved trips yet. Try generating one — head to /generate, or just tell me \"plan 5 days in Goa for ₹50k\".",
    };
    return;
  }

  const lines: string[] = [];
  lines.push(`You have **${rows.length} saved trip${rows.length === 1 ? "" : "s"}**:\n`);

  for (const it of rows.slice(0, 10)) {
    const budget = it.total_budget
      ? `₹${it.total_budget.toLocaleString("en-IN")}`
      : "—";
    lines.push(`  • **${it.title}** — ${it.duration} · ${budget}`);
    lines.push(`    → /itinerary/${it.id}`);
  }
  if (rows.length > 10) {
    lines.push(`\n…and ${rows.length - 10} more. See /my-itineraries.`);
  }

  // Stream in small chunks so the typing animation feels real
  const reply = lines.join("\n");
  for (let i = 0; i < reply.length; i += 60) {
    yield { type: "token", content: reply.slice(i, i + 60) };
    await new Promise((r) => setTimeout(r, 15));
  }

  yield {
    type: "metadata",
    data: {
      count: rows.length,
      ids: rows.slice(0, 10).map((it) => it.id),
    },
  };
}
