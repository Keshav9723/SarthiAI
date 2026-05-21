// lib/api/llm/openrouter-chat.ts
// OpenRouter chat-completion wrapper with tool-use. Drop-in compatible with
// ollamaChat + geminiChat so the orchestrator dispatches to any of them via
// the same interface.
//
// OpenRouter follows the OpenAI API shape almost exactly:
//   • "system" / "user" / "assistant" / "tool" roles
//   • tool_calls are an array on assistant messages, with `{id, type, function:{name, arguments}}`
//   • arguments arrives as a JSON-string (we parse it for normalization)
//   • Tool results sent back as { role: "tool", tool_call_id, content }

import type {
  ChatMessage,
  OllamaChatResponse,
  ToolCallRequest,
  ToolDefinitionForLLM,
} from "./ollama-chat";

const OPENROUTER_HOST = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free";

/** Build the model fallback chain. Primary = OPENROUTER_MODEL. Fallbacks
 *  come from OPENROUTER_FALLBACK_MODELS (comma-separated). On any 429 or
 *  503 from the primary, we cycle through fallbacks in order. */
function modelChain(): string[] {
  const primary = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const fallbackEnv = process.env.OPENROUTER_FALLBACK_MODELS ?? "";
  const fallbacks = fallbackEnv
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m !== primary);
  return [primary, ...fallbacks];
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: OpenAIChatMessage;
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: number };
}

function commonHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Sarthi Travel Planner",
  };
}

/** Convert our internal ChatMessage[] (Ollama shape) → OpenAI shape. */
function toOpenAIMessages(messages: ChatMessage[]): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
  // Track the most recently emitted tool_call_id per name so we can pair
  // incoming `tool` results back with the call that produced them.
  const callIdByName = new Map<string, string>();

  for (const m of messages) {
    if (m.role === "system" || m.role === "user") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const toolCalls = m.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const calls: OpenAIToolCall[] = toolCalls.map((tc, i) => {
          const id = `call_${out.length}_${i}`;
          callIdByName.set(tc.function.name, id);
          const args =
            typeof tc.function.arguments === "string"
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments ?? {});
          return {
            id,
            type: "function" as const,
            function: { name: tc.function.name, arguments: args },
          };
        });
        out.push({
          role: "assistant",
          content: m.content || null,
          tool_calls: calls,
        });
      } else {
        out.push({ role: "assistant", content: m.content });
      }
      continue;
    }
    if (m.role === "tool") {
      // We need a tool_call_id. Find it from the most recent assistant tool call.
      const prev = out[out.length - 1];
      let toolCallId: string | undefined;
      if (prev?.role === "assistant" && prev.tool_calls?.length) {
        toolCallId = prev.tool_calls[0].id;
      } else {
        // Last resort: pick any cached id
        toolCallId = Array.from(callIdByName.values()).pop();
      }
      out.push({
        role: "tool",
        content: m.content,
        tool_call_id: toolCallId,
      });
    }
  }
  return out;
}

export async function openrouterChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OllamaChatResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY not set. Get one free at openrouter.ai/keys and add to .env.local."
    );
  }
  const chain = modelChain();

  // Try each model in order. 429/503 from one → try the next. Other errors
  // (auth, schema, etc.) bubble up immediately since they won't fix on retry.
  let lastErr: Error | null = null;
  let json: OpenRouterChatResponse | null = null;

  for (const model of chain) {
    const body: Record<string, unknown> = {
      model,
      messages: toOpenAIMessages(opts.messages),
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
    };
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools;
      body.tool_choice = "auto";
    }

    const res = await fetch(`${OPENROUTER_HOST}/chat/completions`, {
      method: "POST",
      headers: commonHeaders(apiKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      json = (await res.json()) as OpenRouterChatResponse;
      if (json.error?.message) {
        lastErr = new Error(`OpenRouter [${model}] error: ${json.error.message}`);
        json = null;
        continue; // try next model
      }
      break; // success
    }

    const text = await res.text().catch(() => "");
    const isRetryable = res.status === 429 || res.status === 503 || res.status === 502;
    lastErr = new Error(
      `OpenRouter [${model}] HTTP ${res.status} — ${text.slice(0, 300)}`
    );
    if (!isRetryable) throw lastErr;
    // else fall through to next model in chain
    console.warn(`[openrouter] ${model} → ${res.status}, trying next fallback…`);
  }

  if (!json) {
    throw lastErr ?? new Error("OpenRouter chat: all fallback models exhausted");
  }

  const choice = json.choices?.[0];
  if (!choice?.message) {
    throw new Error(
      `OpenRouter returned no message. finish_reason=${choice?.finish_reason ?? "?"}`
    );
  }

  // Convert OpenAI shape back to our internal ChatMessage shape.
  const toolCalls: ToolCallRequest[] = (choice.message.tool_calls ?? []).map((tc) => {
    let parsedArgs: unknown = {};
    try {
      parsedArgs = JSON.parse(tc.function.arguments);
    } catch {
      parsedArgs = {};
    }
    return {
      function: {
        name: tc.function.name,
        arguments: parsedArgs,
      },
    };
  });

  return {
    done: true,
    message: {
      role: "assistant",
      content: choice.message.content ?? "",
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
}
