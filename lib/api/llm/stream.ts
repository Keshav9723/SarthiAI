// lib/api/llm/stream.ts
// Provider-agnostic streaming LLM wrapper. Yields tokens as they arrive from
// the configured provider (Ollama or Gemini). Used by chatbot intent handlers
// for word-by-word streamed replies.

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

const OPENROUTER_HOST = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free";

export interface StreamOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

function getProvider(): "ollama" | "gemini" | "openrouter" {
  const p = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "openrouter") return "openrouter";
  return "ollama";
}

export async function* streamText(opts: StreamOptions): AsyncGenerator<string> {
  const provider = getProvider();
  if (provider === "gemini") yield* streamGemini(opts);
  else if (provider === "openrouter") yield* streamOpenRouter(opts);
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
// OpenRouter — /v1/chat/completions with stream:true
// OpenAI-compatible SSE: each chunk is `data: {...}\n\n`, terminated by
// `data: [DONE]\n\n`. Yields delta.content as it arrives.
// ---------------------------------------------------------------------------

async function* streamOpenRouter(opts: StreamOptions): AsyncGenerator<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  // Try primary, then fallbacks on 429 / 503 / 502. Once a stream connects
  // successfully we commit to it (can't switch mid-stream).
  const primary = process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL;
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",").map((s) => s.trim()).filter((s) => s && s !== primary);
  const chain = [primary, ...fallbacks];

  let lastErr: Error | null = null;
  let res: Response | null = null;

  for (const model of chain) {
    const r = await fetch(`${OPENROUTER_HOST}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Sarthi Travel Planner",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 2048,
        stream: true,
      }),
    });
    if (r.ok && r.body) {
      res = r;
      break;
    }
    const t = await r.text().catch(() => "");
    const retryable = r.status === 429 || r.status === 503 || r.status === 502;
    lastErr = new Error(`OpenRouter stream [${model}] HTTP ${r.status} — ${t.slice(0, 200)}`);
    if (!retryable) throw lastErr;
    console.warn(`[stream/openrouter] ${model} → ${r.status}, trying next fallback…`);
  }

  if (!res || !res.body) throw lastErr ?? new Error("OpenRouter stream: no usable response");

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
      if (payload === "[DONE]") return;
      try {
        const obj = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = obj.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          yield content;
        }
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
