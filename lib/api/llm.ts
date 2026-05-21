// lib/api/llm.ts
// Provider-agnostic LLM wrapper. Pick Ollama (default, local) or Claude
// (later) via LLM_PROVIDER env var. Validates output against a Zod schema and
// retries once on parse/schema failure.
//
// Used everywhere an LLM needs to emit structured JSON:
//   • /api/generate     — itinerary JSON
//   • /api/chat         — intent classification, modify-itinerary patches
//   • Surprise Me       — match reasons
//   • Pricing insights  — "low / normal / high" verdicts

import { z } from "zod";
import { ollamaGenerate, type OllamaGenerateInput } from "./llm/ollama";
import { claudeGenerate } from "./llm/claude";
import { geminiGenerate } from "./llm/gemini";
import { openrouterGenerate } from "./llm/openrouter";

export type LLMProvider = "ollama" | "claude" | "gemini" | "openrouter";

function getProvider(): LLMProvider {
  const v = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (v === "ollama" || v === "claude" || v === "gemini" || v === "openrouter") return v;
  throw new Error(`Unknown LLM_PROVIDER "${v}". Use "ollama", "gemini", "openrouter", or "claude".`);
}

export interface GenerateStructuredOptions<T extends z.ZodTypeAny> {
  /** System prompt — role + rules + schema description. */
  system: string;
  /** User prompt — the actual request, including any RAG context blocks. */
  user: string;
  /** Zod schema the response must satisfy. Used both to type the result and
   *  to validate the model's JSON output. */
  schema: T;
  /** Number of retries on parse/validation failure. Default 1. */
  maxRetries?: number;
  /** 0 = deterministic, 1 = creative. Default 0.4. */
  temperature?: number;
  /** Output token cap. Default 4096. */
  maxTokens?: number;
}

export async function generateStructured<T extends z.ZodTypeAny>(
  opts: GenerateStructuredOptions<T>
): Promise<z.infer<T>> {
  const provider = getProvider();
  const callModel: (input: OllamaGenerateInput) => Promise<string> =
    provider === "claude" ? claudeGenerate :
    provider === "gemini" ? geminiGenerate :
    provider === "openrouter" ? openrouterGenerate :
    ollamaGenerate;

  const maxRetries = opts.maxRetries ?? 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const raw = await callModel({
      system: opts.system,
      user: opts.user,
      hint: lastError?.message,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
    });

    // Step 1: parse JSON.
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      lastError = new Error(
        `Invalid JSON from model (attempt ${attempt + 1}): ${(err as Error).message}. ` +
          `Got: ${raw.slice(0, 120)}…`
      );
      continue;
    }

    // Step 2: validate against schema.
    const result = opts.schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    lastError = new Error(
      `Schema validation failed (attempt ${attempt + 1}): ${result.error.message}`
    );
  }

  throw lastError ?? new Error("generateStructured: exhausted retries");
}

/**
 * Generate a free-form string from the LLM (no JSON enforcement, no schema).
 * Used by chat handlers that stream natural-language replies.
 */
export async function generateText(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const provider = getProvider();
  const callModel: (input: OllamaGenerateInput) => Promise<string> =
    provider === "claude" ? claudeGenerate :
    provider === "gemini" ? geminiGenerate :
    provider === "openrouter" ? openrouterGenerate :
    ollamaGenerate;
  return callModel({
    system: opts.system,
    user: opts.user,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });
}
