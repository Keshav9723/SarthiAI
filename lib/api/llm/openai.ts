// lib/api/llm/openai.ts
// OpenAI wrapper for single-shot JSON generation. Uses the standard
// /v1/chat/completions endpoint with response_format=json_object.
//
// To enable:
//   1. Get key at platform.openai.com/api-keys
//   2. .env.local:
//        OPENAI_API_KEY=sk-...
//        LLM_PROVIDER=openai
//        OPENAI_MODEL=gpt-4o-mini    # optional, default below

const OPENAI_HOST = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAIGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
}

export async function openaiGenerate(opts: OpenAIGenerateInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY not set. Get one at platform.openai.com/api-keys and add to .env.local."
    );
  }
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

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
    response_format: { type: "json_object" },
  };

  const res = await fetch(`${OPENAI_HOST}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenAI generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as OpenAIChatResponse;
  if (json.error?.message) throw new Error(`OpenAI error: ${json.error.message}`);

  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `OpenAI returned no usable text. finish_reason=${json.choices?.[0]?.finish_reason ?? "?"}`
    );
  }
  return text;
}
