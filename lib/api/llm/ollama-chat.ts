// lib/api/llm/ollama-chat.ts
// Chat-completion wrapper for Ollama that supports tool-use (function calling).
// Different from lib/api/llm/ollama.ts which uses the /api/generate endpoint
// for single-shot JSON output — this one uses /api/chat which supports a
// full conversation with tool_calls + tool results.
//
// Sample conversation flow:
//   1. We send: [system, user] + tools[]
//   2. Model responds: { role: "assistant", tool_calls: [{ name, arguments }] }
//   3. We execute the tool, append: { role: "tool", content: <result-json> }
//   4. We send the whole conversation again
//   5. Loop until model responds with no tool_calls (final answer)

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL ?? "qwen3.5:9b";
const LLM_NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX ?? "8192", 10);

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Only present on assistant messages that requested a tool. */
  tool_calls?: ToolCallRequest[];
  /** Only present on tool-result messages. Optional — qwen ignores it. */
  tool_call_id?: string;
}

export interface ToolDefinitionForLLM {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export interface ToolCallRequest {
  function: {
    name: string;
    /** Ollama sometimes returns this as a string, sometimes as an object — we normalize. */
    arguments: unknown;
  };
}

export interface OllamaChatResponse {
  message: ChatMessage;
  done: boolean;
}

interface OllamaChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  stream: false;
  options: { temperature: number; num_ctx: number; num_predict?: number };
}

export async function ollamaChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OllamaChatResponse> {
  const body: OllamaChatRequest = {
    model: LLM_MODEL,
    messages: opts.messages,
    tools: opts.tools,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.4,
      num_ctx: LLM_NUM_CTX,
      num_predict: opts.maxTokens ?? 4096,
    },
  };

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama chat failed: HTTP ${res.status} — ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as OllamaChatResponse;
  // Normalize: if `arguments` came as a string, parse it; if object, leave it.
  if (json.message?.tool_calls) {
    for (const tc of json.message.tool_calls) {
      if (typeof tc.function.arguments === "string") {
        try { tc.function.arguments = JSON.parse(tc.function.arguments); }
        catch { /* leave as string; the orchestrator will report a schema error */ }
      }
    }
  }
  return json;
}
