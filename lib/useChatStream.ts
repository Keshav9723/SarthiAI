"use client";

// lib/useChatStream.ts
// Hook that drives the chat panel: sends a user message to /api/chat and
// consumes the SSE stream, calling callbacks as tokens / metadata arrive.

import { useCallback, useRef, useState } from "react";

export interface StreamCallbacks {
  /** Called once when the classifier returns an intent. */
  onIntent?: (intent: string, confidence: number, extracted?: Record<string, unknown>) => void;
  /** Called for every text token chunk. The component appends to the message. */
  onToken: (content: string) => void;
  /** Called when the handler emits intent-specific metadata. */
  onMetadata?: (data: Record<string, unknown>) => void;
  /** Called once at end or on fatal error. */
  onDone?: () => void;
  /** Called on a recoverable error within the stream. The token stream may still continue. */
  onError?: (message: string) => void;
}

export interface SendOptions {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: string;
  pageDestination?: string;
}

export function useChatStream(callbacks: StreamCallbacks) {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const send = useCallback(async (opts: SendOptions) => {
    // Cancel any in-flight stream from a previous call
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        cbRef.current.onError?.(`Chat failed: HTTP ${res.status}. ${text.slice(0, 120)}`);
        cbRef.current.onDone?.();
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (!block.startsWith("data: ")) continue;
          const json = block.slice(6);
          try {
            const event = JSON.parse(json);
            handleEvent(event);
          } catch {
            // ignore malformed
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        cbRef.current.onError?.((err as Error).message);
      }
    } finally {
      cbRef.current.onDone?.();
      setStreaming(false);
    }

    function handleEvent(e: { type: string; [k: string]: unknown }) {
      if (e.type === "intent") {
        cbRef.current.onIntent?.(
          String(e.intent),
          Number(e.confidence ?? 0),
          (e.extracted as Record<string, unknown>) ?? undefined
        );
      } else if (e.type === "token") {
        if (typeof e.content === "string") cbRef.current.onToken(e.content);
      } else if (e.type === "metadata") {
        cbRef.current.onMetadata?.((e.data as Record<string, unknown>) ?? {});
      } else if (e.type === "error") {
        cbRef.current.onError?.(String(e.message ?? "unknown error"));
      } else if (e.type === "done") {
        // handled by the outer `finally` block on stream close
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  return { send, cancel, streaming };
}
