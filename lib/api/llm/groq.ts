// lib/api/llm/groq.ts
// Groq wrapper for single-shot JSON generation via the OpenAI-compatible
// Chat Completions endpoint. Groq supports `response_format: { type: "json_object" }`
// which guarantees parseable JSON for capable models.
//
// To enable:
//   1. Get key at console.groq.com
//   2. .env.local:
//        GROQ_API_KEY=gsk_...
//        LLM_PROVIDER=groq
//        GROQ_MODEL=openai/gpt-oss-120b   # optional, this is the default

const GROQ_HOST = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

interface GroqGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GroqChatCompletionsResponse {
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

/** Strip markdown fences in case the model wraps JSON despite json_object mode. */
function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return t;
}

export async function groqGenerate(opts: GroqGenerateInput): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY not set. Get one at console.groq.com and add to .env.local."
    );
  }
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const jsonGuard =
    "\n\nIMPORTANT: respond with ONLY valid JSON matching the schema. " +
    "No prose, no markdown fences, no commentary before or after.";

  const userPrompt = opts.hint
    ? `${opts.user}\n\nIMPORTANT: your previous response was rejected — ${opts.hint}\nReturn ONLY valid JSON matching the schema.`
    : opts.user;

  const body = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system", content: opts.system + jsonGuard },
      { role: "user", content: userPrompt },
    ],
  };

  const res = await fetch(`${GROQ_HOST}/chat/completions`, {
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
      `Groq generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as GroqChatCompletionsResponse;
  if (json.error?.message) throw new Error(`Groq error: ${json.error.message}`);

  const raw = json.choices?.[0]?.message?.content ?? "";
  if (!raw.trim()) {
    throw new Error(
      `Groq returned no usable text. finish_reason=${json.choices?.[0]?.finish_reason ?? "?"}`
    );
  }
  return stripFences(raw);
}
