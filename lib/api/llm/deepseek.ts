// lib/api/llm/deepseek.ts
// DeepSeek wrapper for single-shot JSON generation. DeepSeek's API is
// OpenAI-compatible — same /v1/chat/completions shape, different host.
//
// To enable:
//   1. Get key at platform.deepseek.com
//   2. .env.local:
//        DEEPSEEK_API_KEY=sk-...
//        LLM_PROVIDER=deepseek
//        DEEPSEEK_MODEL=deepseek-chat    # optional, this is the default
//                                        # use "deepseek-reasoner" for the R1 reasoning model

const DEEPSEEK_HOST = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";

interface DeepSeekGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
}

export async function deepseekGenerate(opts: DeepSeekGenerateInput): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Get one at platform.deepseek.com and add to .env.local."
    );
  }
  const model = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

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

  const res = await fetch(`${DEEPSEEK_HOST}/chat/completions`, {
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
      `DeepSeek generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as DeepSeekChatResponse;
  if (json.error?.message) throw new Error(`DeepSeek error: ${json.error.message}`);

  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `DeepSeek returned no usable text. finish_reason=${json.choices?.[0]?.finish_reason ?? "?"}`
    );
  }
  return text;
}
