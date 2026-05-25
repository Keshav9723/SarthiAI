// lib/api/llm/stream.ts
// Provider-agnostic streaming LLM wrapper. Yields tokens as they arrive from
// the configured provider (Ollama, Gemini, or Anthropic). Used by chatbot
// intent handlers for word-by-word streamed replies.

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
// Chat-specific model can be smaller than the orchestrator's — chat replies
// don't need to emit 1000-token JSON. Default to the chat-specific env var
// if set, else fall back to the global LLM model.
const OLLAMA_MODEL =
  process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_LLM_MODEL ?? "qwen2.5:1.5b";
const OLLAMA_NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX ?? "8192", 10);

const GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

const ANTHROPIC_HOST = "https://api.anthropic.com/v1";
const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

export interface StreamOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

function getProvider(): "ollama" | "gemini" | "anthropic" {
  const p = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "anthropic") return "anthropic";
  return "ollama";
}

export async function* streamText(opts: StreamOptions): AsyncGenerator<string> {
  const provider = getProvider();
  if (provider === "gemini") yield* streamGemini(opts);
  else if (provider === "anthropic") yield* streamAnthropic(opts);
  else yield* streamOllama(opts);
}

// ---------------------------------------------------------------------------
// Ollama — /api/generate with stream:true returns NDJSON
// ---------------------------------------------------------------------------

async function* streamOllama(opts: StreamOptions): AsyncGenerator<string> {
  // 2-minute hard timeout so we don't hang forever if Ollama is stuck
  // loading the model or otherwise unresponsive.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  console.log("[stream/ollama] calling", OLLAMA_BASE_URL, "model:", OLLAMA_MODEL);

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: opts.system,
        prompt: opts.user,
        stream: true,
        options: {
          temperature: opts.temperature ?? 0.5,
          num_ctx: OLLAMA_NUM_CTX,
          num_predict: opts.maxTokens ?? 2048,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error(`Ollama stream connect failed: ${(err as Error).message}`);
  }

  if (!res.ok || !res.body) {
    clearTimeout(timeoutId);
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama stream failed: HTTP ${res.status} — ${t.slice(0, 200)}`);
  }
  // Refresh the timeout once we've started getting data — model is loaded.
  clearTimeout(timeoutId);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // NDJSON — one JSON object per line
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line) as { response?: string; done?: boolean };
        if (typeof obj.response === "string" && obj.response.length > 0) {
          yield obj.response;
        }
        if (obj.done) return;
      } catch {
        // ignore malformed line
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Anthropic — /v1/messages with stream:true
// SSE events: message_start, content_block_start, content_block_delta (text_delta),
// content_block_stop, message_delta, message_stop. We only care about
// content_block_delta with delta.type === "text_delta".
// ---------------------------------------------------------------------------

async function* streamAnthropic(opts: StreamOptions): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const model = process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT_MODEL;

  const { fetchAnthropicWithRetry } = await import("./anthropic-chat");
  const res = await fetchAnthropicWithRetry(`${ANTHROPIC_HOST}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      temperature: opts.temperature ?? 0.5,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic stream failed: HTTP ${res.status} — ${t.slice(0, 200)}`);
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
      const dataLines = block
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6));
      if (dataLines.length === 0) continue;
      const payload = dataLines.join("");
      try {
        const obj = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
          const t = obj.delta.text;
          if (typeof t === "string" && t.length > 0) yield t;
        }
        if (obj.type === "message_stop") return;
      } catch {
        // skip malformed
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gemini — /v1beta/models/{model}:streamGenerateContent?alt=sse
// Server-Sent Events: each chunk is `data: {...}\n\n`
// ---------------------------------------------------------------------------

async function* streamGemini(opts: StreamOptions): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const model = process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;

  const url =
    `${GEMINI_HOST}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.5,
      maxOutputTokens: opts.maxTokens ?? 4096,
      // Disable Gemini 2.5 thinking — we want immediate streaming output.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini stream failed: HTTP ${res.status} — ${t.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE: split on blank lines
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Each block may have multiple "data: " lines; concatenate them
      const dataLines = block
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6));
      if (dataLines.length === 0) continue;
      const payload = dataLines.join("");
      if (payload === "[DONE]") return;
      try {
        const obj = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const parts = obj.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
          if (typeof p.text === "string" && p.text.length > 0) {
            yield p.text;
          }
        }
      } catch {
        // skip malformed event
      }
    }
  }
}
