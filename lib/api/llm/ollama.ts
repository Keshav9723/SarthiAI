// lib/api/llm/ollama.ts
// Server-side wrapper around Ollama's /api/generate endpoint.
// Uses qwen3.5:9b by default with JSON mode forced on so the response is a
// parseable JSON string. The provider router in lib/api/llm.ts picks this
// when LLM_PROVIDER is "ollama" (the default).

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "qwen3.5:9b";
const LLM_NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX ?? "8192", 10);

export interface OllamaGenerateInput {
  system: string;
  user: string;
  /** On a retry, the parse/validation error from the previous attempt.
   *  We append it to the prompt as a hint so the model can self-correct. */
  hint?: string;
  /** Lower = more deterministic. Default 0.4. */
  temperature?: number;
  /** Output cap. Default 4096. */
  maxTokens?: number;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export async function ollamaGenerate(opts: OllamaGenerateInput): Promise<string> {
  // If we're retrying, weave the prior error into the user prompt. This is more
  // reliable than relying on the model to remember a multi-turn conversation.
  const userPrompt = opts.hint
    ? `${opts.user}\n\nIMPORTANT: your previous response was rejected — ${opts.hint}\nReturn ONLY valid JSON matching the schema. No prose, no markdown, no commentary.`
    : opts.user;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      system: opts.system,
      prompt: userPrompt,
      format: "json",          // forces parseable JSON output
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.4,
        num_ctx: LLM_NUM_CTX,
        num_predict: opts.maxTokens ?? 4096,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ollama generate failed: HTTP ${res.status} — ${body.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as OllamaGenerateResponse;
  if (typeof json.response !== "string") {
    throw new Error("Ollama generate returned non-string response field");
  }
  return json.response;
}
