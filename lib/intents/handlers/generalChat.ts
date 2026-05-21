// lib/intents/handlers/generalChat.ts
// Fallback handler. Streams a friendly LLM reply with light Sarthi-flavour
// system priming. Used for greetings, off-topic chat, and any message where
// the classifier wasn't confident enough to pick a specific intent.

import { streamText } from "@/lib/api/llm/stream";
import type { HandlerContext, HandlerEvent } from "../types";

const SYSTEM = `You are Sarthi, a friendly AI travel assistant focused on India.
Keep replies short (2-4 sentences). Be warm and conversational but stay on-topic
when the user steers toward travel.

If the user asks something travel-related you can't fully answer here, suggest
they use the wizard at /generate or ask you a more specific question like
"Tell me about Hampi" or "Where should I go in March".`;

export async function* handleGeneralChat(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  const historyText = ctx.history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Sarthi"}: ${m.content}`)
    .join("\n");

  const user =
    historyText
      ? `Recent conversation:\n${historyText}\n\nNew message from user:\n${ctx.message}\n\nReply briefly.`
      : `User: ${ctx.message}\n\nReply briefly.`;

  try {
    for await (const token of streamText({
      system: SYSTEM,
      user,
      temperature: 0.6,
      maxTokens: 400,
    })) {
      yield { type: "token", content: token };
    }
  } catch (err) {
    yield {
      type: "error",
      message: `Couldn't reach the language model: ${(err as Error).message}`,
    };
  }
}
