// lib/intents/handlers/locationInfo.ts
// "Tell me about <destination>" — uses RAG to ground the LLM in real scraped
// facts about the place. Streams the answer + emits source-citation metadata.

import { streamText } from "@/lib/api/llm/stream";
import { retrieveContext, formatChunksForPrompt } from "@/lib/api/rag";
import { createServerClient } from "@/lib/supabase/server";
import type { HandlerContext, HandlerEvent } from "../types";

const SYSTEM = `You are Sarthi, an expert India travel assistant.
Answer the user's question about a destination using ONLY the facts in the
provided context. If the context doesn't cover the question, say so honestly
and suggest a related question they can ask.

FORMAT (very important — this is a chat UI, not a Wikipedia article):
  • Keep the WHOLE reply under ~200 words.
  • Open with a single ## heading naming the destination + 1-line summary.
  • Then 2-4 sub-sections, each with a ## heading + 1-3 sentences underneath.
  • Use bullet lists (•) for "top 3-5 X" type content.
  • Use **bold** sparingly — only for proper names of places, dishes, festivals.
  • If the user asked a focused question (food, beaches, weather), answer JUST
    that — drop the encyclopedia entry, ONE section is enough.
  • DON'T write "Source: ..." in your text — the UI shows source pills below.
  • DON'T repeat the same fact twice; merge if needed.

Example shape for a broad "tell me about X" question:

## Goa
A small coastal state on India's west coast, famous for beaches and Portuguese heritage.

## Top attractions
• **Bom Jesus Basilica** in Old Goa — UNESCO World Heritage Site
• **Calangute & Baga beaches** — lively, water sports, busy
• **Palolem** in the south — quiet, palm-fringed, good for couples

## Food highlights
Goan cuisine blends Portuguese and Konkani — try **fish curry rice**, **prawn balchao**, and **bebinca** (layered pudding).

## Best time to visit
Mid-November to mid-February — dry, warm, and the post-monsoon greenery is gorgeous.`;

export async function* handleLocationInfo(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  const destinationName =
    ctx.classification.extracted?.destination ?? ctx.pageDestination ?? null;

  if (!destinationName) {
    yield {
      type: "token",
      content:
        "Which destination would you like to know about? Try something like \"tell me about Hampi\" or open a destination from /explore.",
    };
    return;
  }

  // Resolve destination row → uuid (so we can filter the RAG retrieval)
  const sb = createServerClient();
  const { data: dest } = await sb
    .from("destinations")
    .select("id, name, state, destination_type")
    .ilike("name", destinationName)
    .limit(1)
    .maybeSingle();

  if (!dest) {
    yield {
      type: "token",
      content: `I don't have detailed information on "${destinationName}" yet. Try Goa, Manali, Jaipur, Kerala, or another major Indian destination.`,
    };
    return;
  }

  // Retrieve top chunks. We pull more for "general info" queries since the
  // user might want a broad overview. If the embedding service is down
  // (e.g. Ollama not running locally), fall back to answering from the
  // LLM's general knowledge — better than a hard error to the user.
  let chunks: Awaited<ReturnType<typeof retrieveContext>> = [];
  let ragUnavailable = false;
  try {
    chunks = await retrieveContext({
      query: ctx.message,
      destinationId: dest.id,
      k: 8,
    });
  } catch (err) {
    console.warn(
      `[locationInfo] RAG retrieval failed, falling back to general knowledge: ${(err as Error).message}`
    );
    ragUnavailable = true;
  }

  if (!ragUnavailable && chunks.length === 0) {
    yield {
      type: "token",
      content: `I don't have detailed scraped info on ${dest.name} yet — try Goa, Manali, Jaipur, or another major destination.`,
    };
    return;
  }

  const user = ragUnavailable
    ? `Destination: ${dest.name}, ${dest.state}\n\n` +
      `User's question: ${ctx.message}\n\n` +
      `(Our scraped-facts database is temporarily unavailable. Answer from your general knowledge of India travel, but keep it accurate and clearly grounded in well-known facts about ${dest.name}. If you're unsure of a specific detail, say so rather than inventing it.)`
    : `Destination: ${dest.name}, ${dest.state}\n\n` +
      `User's question: ${ctx.message}\n\n` +
      `Verified facts from our travel database:\n\n${formatChunksForPrompt(chunks)}\n\n` +
      `Answer the user's question using only the facts above. Be conversational and concise.`;

  try {
    for await (const token of streamText({
      system: SYSTEM,
      user,
      temperature: 0.4,
      maxTokens: 400,                    // hard cap to enforce brevity
    })) {
      yield { type: "token", content: token };
    }
  } catch (err) {
    yield { type: "error", message: (err as Error).message };
    return;
  }

  // Emit metadata at the end so the UI can show source pills
  yield {
    type: "metadata",
    data: {
      destination: dest.name,
      destination_id: dest.id,
      sources: ragUnavailable
        ? []
        : Array.from(new Set(chunks.map((c) => c.sourceUrl))).slice(0, 4),
    },
  };
}
