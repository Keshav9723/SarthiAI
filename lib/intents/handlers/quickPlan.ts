// lib/intents/handlers/quickPlan.ts
// "Plan a 5-day trip to Kerala for ₹50k" — extracts trip params from the
// message and forwards to /generate as a deep link, rather than running the
// orchestrator inline (which would block the chat thread for 30-120 sec).
//
// Returns a short reply with a prefilled /generate URL so the user lands on
// the wizard with their parameters already populated.

import type { HandlerContext, HandlerEvent } from "../types";
import { handleSurpriseMe } from "./surpriseMe";

export async function* handleQuickPlan(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  const ex = ctx.classification.extracted ?? {};
  const dest = ex.destination;
  const days = ex.days;
  const budget = ex.budget_inr;
  const group = ex.group;
  const month = ex.month;
  const fromCity = ex.from_city;

  // No destination but we have budget/days/group context → the user is
  // really asking "where should I go" (e.g. "I have ₹40k and 5 days, where
  // should I go?"). Fall through to the Surprise Me handler so the user
  // gets actual destination recommendations instead of a generic "which
  // destination?" prompt.
  if (!dest) {
    if (budget || days || group) {
      yield* handleSurpriseMe(ctx);
      return;
    }
    yield {
      type: "token",
      content:
        "Sure! Tell me where you'd like to go (e.g. \"plan 5 days in Goa for ₹50k\") — or describe your constraints and I'll suggest destinations (\"where should I go in March with ₹40k for 5 days?\").",
    };
    return;
  }

  // Build the prefilled /generate URL
  const params = new URLSearchParams();
  params.set("destination", dest);
  if (days) params.set("days", String(days));
  if (budget) params.set("budget", String(budget));
  if (group) params.set("group", group);
  if (month) params.set("month", String(month));
  if (fromCity) params.set("from", fromCity);
  const url = `/generate?${params.toString()}`;

  const summary = [
    `Got it — let's plan a trip to **${dest}**.`,
    days ? `Length: ${days} days.` : null,
    group ? `Group: ${group}.` : null,
    budget ? `Budget: ₹${budget.toLocaleString("en-IN")}/person.` : null,
    month ? `Month: ${MONTHS[month - 1]}.` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    summary,
    "",
    `I'll prefill the wizard for you with what you mentioned — you can adjust anything before generating.`,
    "",
    `[Open the wizard](${url})`,
  ];

  // Stream in small chunks
  const reply = lines.join("\n");
  for (let i = 0; i < reply.length; i += 50) {
    yield { type: "token", content: reply.slice(i, i + 50) };
    await new Promise((r) => setTimeout(r, 18));
  }

  yield {
    type: "metadata",
    data: { generate_url: url, destination: dest },
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
