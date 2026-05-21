// lib/intents/classify.ts
// One-shot LLM call that turns a user message + recent history into an intent
// classification. Falls back to general_chat on low confidence or LLM failure.

import { generateStructured } from "@/lib/api/llm";
import { buildIntentPrompt } from "@/lib/prompts/intent";
import {
  IntentClassificationSchema,
  type IntentClassification,
  type HandlerContext,
} from "./types";

const CONFIDENCE_FLOOR = 0.7;

export async function classifyIntent(
  message: string,
  history: HandlerContext["history"]
): Promise<IntentClassification> {
  const { system, user } = buildIntentPrompt(message, history);

  try {
    const result = await generateStructured({
      system,
      user,
      schema: IntentClassificationSchema,
      temperature: 0.1,
      maxRetries: 1,
      maxTokens: 512,
    });

    // Floor: anything below confidence threshold gets routed to general_chat
    if (result.confidence < CONFIDENCE_FLOOR && result.intent !== "general_chat") {
      return { ...result, intent: "general_chat" };
    }
    return result;
  } catch (err) {
    console.warn(`[classify] LLM failed: ${(err as Error).message} — defaulting to general_chat`);
    return { intent: "general_chat", confidence: 0.5 };
  }
}
