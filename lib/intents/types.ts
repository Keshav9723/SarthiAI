// lib/intents/types.ts
// Shared types for the chatbot intent system.

import { z } from "zod";

/** All supported intents. Adding a new one requires:
 *   1. Add to this enum
 *   2. Add a description in lib/prompts/intent.ts
 *   3. Write a handler in lib/intents/handlers/<intent>.ts
 *   4. Register it in lib/intents/dispatch.ts
 */
export const INTENTS = [
  "location_info",
  "view_itineraries",
  "surprise_me",
  "weather",
  "quick_plan",
  "modify_itinerary",
  "general_chat",
] as const;
export type Intent = (typeof INTENTS)[number];

export const IntentClassificationSchema = z.object({
  intent: z.enum(INTENTS),
  confidence: z.number().min(0).max(1),
  /** Optional structured fields the classifier extracted from the message. */
  extracted: z
    .object({
      destination: z.string().nullable().optional(),
      month: z.number().int().min(1).max(12).nullable().optional(),
      days: z.number().int().min(1).max(60).nullable().optional(),
      budget_inr: z.number().int().nonnegative().nullable().optional(),
      from_city: z.string().nullable().optional(),
      group: z.enum(["couple", "family", "friends", "solo"]).nullable().optional(),
    })
    .partial()
    .optional(),
});
export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

/** Context passed to every intent handler. */
export interface HandlerContext {
  message: string;
  classification: IntentClassification;
  /** Authenticated user's UUID, or null if signed-out. */
  userId: string | null;
  /** Recent chat history, oldest → newest, capped at ~10 messages. */
  history: Array<{ role: "user" | "assistant"; content: string }>;
  /** Page context the user was on when they sent the message. */
  pageContext?:
    | "home" | "explore" | "generate" | "surprise" | "itinerary"
    | "budget" | "my-itineraries" | "auth" | "default";
  /** If on /itinerary/[id], the destination name; helps "modify this trip" intents. */
  pageDestination?: string;
}

/**
 * Every handler is an async generator that yields tokens. The dispatcher
 * forwards each token through SSE to the browser.
 *
 * Handlers can also yield SSE event objects (type !== "token") which get
 * encoded as their own SSE events — useful for sending citations, suggested
 * follow-up chips, or metadata at the end of a stream.
 */
export type HandlerEvent =
  | { type: "token"; content: string }
  | { type: "metadata"; data: Record<string, unknown> }
  | { type: "error"; message: string };

export type IntentHandler = (ctx: HandlerContext) => AsyncGenerator<HandlerEvent>;
