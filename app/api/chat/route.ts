// app/api/chat/route.ts
// Streaming chat endpoint. Receives a user message + recent history, classifies
// the intent, dispatches to the matching handler, and streams the response
// back via Server-Sent Events (SSE).
//
// SSE event types emitted:
//   • { type: "intent",   intent, confidence, extracted }  — fires once, very early
//   • { type: "token",    content: "..." }                  — many; each is a partial reply
//   • { type: "metadata", data: {...} }                     — optional, intent-specific extras
//   • { type: "error",    message: "..." }                  — recoverable error
//   • { type: "done" }                                      — fires once at the end
//
// Frontend reads via fetch + ReadableStream.getReader().

import { type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { classifyIntent } from "@/lib/intents/classify";
import { dispatchIntent } from "@/lib/intents/dispatch";
import type { HandlerContext } from "@/lib/intents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_CONTEXTS = [
  "home", "explore", "generate", "surprise", "itinerary",
  "budget", "my-itineraries", "auth", "default",
] as const;

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20)
    .optional(),
  pageContext: z.enum(PAGE_CONTEXTS).optional(),
  pageDestination: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Validate body
  let parsed: z.infer<typeof ChatRequestSchema>;
  try {
    const body = await req.json();
    const result = ChatRequestSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Invalid body", details: result.error.format() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    parsed = result.data;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get user (chat works for anon too — handlers handle the gating individually)
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  const userId = user?.id ?? null;

  const encoder = new TextEncoder();
  const sse = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const tStart = Date.now();
      try {
        console.log(`[chat] "${parsed.message.slice(0, 60)}" — classifying…`);

        // 1. Classify intent (single short LLM call)
        const classification = await classifyIntent(
          parsed.message,
          parsed.history ?? []
        );
        console.log(
          `[chat] intent=${classification.intent} confidence=${classification.confidence} (took ${Date.now() - tStart}ms)`
        );
        controller.enqueue(
          sse({
            type: "intent",
            intent: classification.intent,
            confidence: classification.confidence,
            extracted: classification.extracted,
          })
        );

        // 2. Dispatch
        const ctx: HandlerContext = {
          message: parsed.message,
          classification,
          userId,
          history: parsed.history ?? [],
          pageContext: parsed.pageContext,
          pageDestination: parsed.pageDestination,
        };

        let tokenCount = 0;
        for await (const event of dispatchIntent(ctx)) {
          if (event.type === "token") tokenCount++;
          controller.enqueue(sse(event));
        }
        console.log(
          `[chat] done — ${tokenCount} tokens (total ${Date.now() - tStart}ms)`
        );

        controller.enqueue(sse({ type: "done" }));
      } catch (err) {
        console.error("[chat] fatal:", err);
        controller.enqueue(sse({
          type: "error",
          message: (err as Error).message,
        }));
      } finally {
        // Defer close() to the next tick — Node 22's TransformStream
        // implementation has a GC race where closing in the same tick as
        // the last enqueue() can throw "transformAlgorithm is not a
        // function". Yielding to the event loop lets Node finalize the
        // pending writes first. Harmless on Node 20.
        await new Promise((r) => setTimeout(r, 0));
        try {
          controller.close();
        } catch {
          // Already closed by Node's wrapper — nothing to do.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disables nginx buffering if deployed behind one
    },
  });
}
