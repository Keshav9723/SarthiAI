// lib/api/llm/openrouter.ts
// OpenRouter wrapper for single-shot JSON generation. OpenRouter is an
// OpenAI-compatible aggregator that proxies hundreds of LLMs through one API
// — including several free tiers (deepseek-v4-flash:free, llama-3.3:free,
// gemma-2:free, etc.). Useful as a fallback when Gemini quota is exhausted.
//
// To enable:
//   1. Get key at openrouter.ai/keys (free, no credit card)
//   2. .env.local:
//        OPENROUTER_API_KEY=sk-or-...
//        LLM_PROVIDER=openrouter
//        OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free    # optional

const OPENROUTER_HOST = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free";

interface OpenRouterGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: number };
}

function commonHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // OpenRouter analytics — recommended but optional. Helps them rank apps.
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Sarthi Travel Planner",
  };
}

export async function openrouterGenerate(opts: OpenRouterGenerateInput): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY not set. Get one free at openrouter.ai/keys and add to .env.local."
    );
  }
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  // Same retry-hint pattern as the other providers.
  const userPrompt = opts.hint
    ? `${opts.user}\n\nIMPORTANT: your previous response was rejected — ${opts.hint}\nReturn ONLY valid JSON matching the schema. No prose, no markdown, no commentary.`
    : opts.user;

  const body = {
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4096,
    // OpenAI-compatible JSON mode — supported by most models on OpenRouter.
    response_format: { type: "json_object" },
  };

  const res = await fetch(`${OPENROUTER_HOST}/chat/completions`, {
    method: "POST",
    headers: commonHeaders(apiKey),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as OpenRouterChatResponse;
  if (json.error?.message) throw new Error(`OpenRouter error: ${json.error.message}`);

  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `OpenRouter returned no usable text. finish_reason=${json.choices?.[0]?.finish_reason ?? "?"}`
    );
  }
  return text;
}
