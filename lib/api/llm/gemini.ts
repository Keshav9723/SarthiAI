// lib/api/llm/gemini.ts
// Google Gemini wrapper for single-shot JSON generation. Used by the provider
// router in lib/api/llm.ts when LLM_PROVIDER=gemini.
//
// Why Gemini: free tier covers our usage during dev (15 RPM / 1500 RPD on
// gemini-2.5-flash), tool-use works well, JSON mode is native, and there's no
// VRAM contention because everything runs in the cloud. ~10× faster than
// local qwen3.5:9b on this hardware.
//
// To enable:
//   1. Get key at aistudio.google.com/app/apikey
//   2. .env.local:
//        GEMINI_API_KEY=...
//        LLM_PROVIDER=gemini
//        GEMINI_MODEL=gemini-2.5-flash   # optional, default below

const GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

interface GeminiGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

export async function geminiGenerate(opts: GeminiGenerateInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set. Get one at aistudio.google.com/app/apikey and add to .env.local."
    );
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  // Same retry-hint pattern as ollama.ts — woven into the user prompt so the
  // model can self-correct on a retry.
  const userPrompt = opts.hint
    ? `${opts.user}\n\nIMPORTANT: your previous response was rejected — ${opts.hint}\nReturn ONLY valid JSON matching the schema. No prose, no markdown, no commentary.`
    : opts.user;

  const url = `${GEMINI_HOST}/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 8192,
      responseMimeType: "application/json",   // native JSON mode
      // Disable Gemini 2.5 thinking mode — we want raw JSON, not chain-of-thought.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Gemini generate failed: HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as GeminiResponse;

  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt: ${json.promptFeedback.blockReason}`);
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(
      `Gemini returned no usable text. finishReason=${json.candidates?.[0]?.finishReason ?? "?"}`
    );
  }
  return text;
}
