// lib/prompts/intent.ts
// Prompt builder for the intent classifier. Returns {system, user} ready to
// pass into generateStructured(IntentClassificationSchema, ...).

import type { HandlerContext } from "@/lib/intents/types";

const INTENT_DESCRIPTIONS = [
  ["location_info",   "User asks about a specific destination — what to do/eat/see, when to visit, history, culture, attractions, food, safety, etc."],
  ["view_itineraries","User wants to see their saved trips or itineraries (e.g. 'show my trips', 'what's planned for next month')."],
  ["surprise_me",     "User asks WHERE they should go without naming a destination (e.g. 'where should I go in March', 'best places for a beach trip')."],
  ["weather",         "User asks about CURRENT or near-term weather for a destination (e.g. 'weather in Goa today', 'is it raining in Mumbai now')."],
  ["quick_plan",      "User asks Sarthi to plan a trip with key details in the message (e.g. 'plan 5 days in Kerala for ₹50k', 'create a trip to Manali for couple')."],
  ["modify_itinerary","User wants to CHANGE / EDIT / REPLACE / SWAP something in the itinerary they're currently viewing (e.g. 'swap day 3 evening with a sunset cruise', 'replace the temple visit on day 2 with a beach walk', 'rename this trip', 'add scuba diving to day 4'). Only valid when the user is on an /itinerary/[id] page."],
  ["general_chat",    "Greetings, thanks, off-topic, or anything that doesn't fit the above. The catch-all."],
] as const;

export function buildIntentPrompt(
  message: string,
  history: HandlerContext["history"]
): { system: string; user: string } {
  const intentList = INTENT_DESCRIPTIONS
    .map(([name, desc]) => `  • ${name} — ${desc}`)
    .join("\n");

  const historyBlock =
    history.length === 0
      ? "(no prior messages)"
      : history
          .slice(-6)
          .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
          .join("\n");

  const system =
    `You are an intent classifier for the Sarthi India travel chatbot. ` +
    `Read the user's latest message (in the context of recent chat history) and ` +
    `pick exactly ONE intent from the list below. Also extract any structured ` +
    `details mentioned (destination, month, days, budget, etc.).\n\n` +
    `Intents:\n${intentList}\n\n` +
    `Rules:\n` +
    `  • Return JSON only. No prose, no markdown.\n` +
    `  • confidence is your certainty 0-1. If < 0.7, prefer general_chat.\n` +
    `  • Extract destination as the standard English name (e.g. "Goa", "Manali", "Kerala").\n` +
    `  • month is 1-12 (e.g. "March" → 3). null if not mentioned.\n` +
    `  • Only include "extracted" fields the user actually mentioned. Skip the field if absent.\n\n` +
    `Output schema:\n` +
    `{\n` +
    `  "intent": "<one of the listed intents>",\n` +
    `  "confidence": <number 0-1>,\n` +
    `  "extracted": {\n` +
    `    "destination": "<string or null>",\n` +
    `    "month": <1-12 or null>,\n` +
    `    "days": <integer or null>,\n` +
    `    "budget_inr": <integer or null>,\n` +
    `    "from_city": "<string or null>",\n` +
    `    "group": "<couple|family|friends|solo or null>"\n` +
    `  }\n` +
    `}`;

  const user =
    `Recent chat history:\n${historyBlock}\n\n` +
    `Latest user message:\n${message}\n\n` +
    `Classify the intent and extract any structured details mentioned.`;

  return { system, user };
}
