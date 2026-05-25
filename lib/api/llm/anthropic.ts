// lib/api/llm/anthropic.ts
// Anthropic (Claude) wrapper for single-shot JSON generation via the
// Messages API. Anthropic has no native JSON-mode flag like OpenAI's
// response_format, so we instruct the model in the system prompt and
// strip any leading/trailing prose just in case.
//
// To enable:
//   1. Get key at console.anthropic.com
//   2. .env.local:
//        ANTHROPIC_API_KEY=sk-ant-...
//        LLM_PROVIDER=anthropic
//        ANTHROPIC_MODEL=claude-sonnet-4-6    # optional, this is the default

import { fetchAnthropicWithRetry } from "./anthropic-chat";

const ANTHROPIC_HOST = "https://api.anthropic.com/v1";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AnthropicMessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  error?: { message?: string; type?: string };
}

/** Anthropic returns content as an array of blocks. We concatenate text blocks. */
function extractText(json: AnthropicMessagesResponse): string {
  const parts = (json.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string);
  return parts.join("");
}

/** Strip markdown fences and any leading prose so JSON.parse succeeds. */
function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return t;
}

export async function anthropicGenerate(opts: AnthropicGenerateInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Get one at console.anthropic.com and add to .env.local."
    );
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const jsonGuard =
    "\n\nIMPORTANT: respond with ONLY valid JSON matching the schema. " +
    "No prose, no markdown fences, no commentary before or after.";

  const userPrompt = opts.hint
    ? `${opts.user}\n\nIMPORTANT: your previous response was rejected — ${opts.hint}\nReturn ONLY valid JSON matching the schema.`
    : opts.user;

  const body = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system + jsonGuard,
    messages: [{ role: "user", content: userPrompt }],
    temperature: opts.temperature ?? 0.4,
  };

  const res = await fetchAnthropicWithRetry(`${ANTHROPIC_HOST}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Anthropic generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as AnthropicMessagesResponse;
  if (json.error?.message) throw new Error(`Anthropic error: ${json.error.message}`);

  const raw = extractText(json);
  if (!raw.trim()) {
    throw new Error(
      `Anthropic returned no usable text. stop_reason=${json.stop_reason ?? "?"}`
    );
  }
  return stripFences(raw);
}
