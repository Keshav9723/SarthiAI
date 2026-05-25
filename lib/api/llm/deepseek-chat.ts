// lib/api/llm/deepseek-chat.ts
// DeepSeek chat-completion wrapper with tool-use. OpenAI-compatible API,
// so this is a thin re-host of the openai-chat wrapper.
//
// Note: tool-use is supported on deepseek-chat. deepseek-reasoner does not
// currently support function calling, so for tool-driven flows always use
// DEEPSEEK_MODEL=deepseek-chat (the default).

import type {
  ChatMessage,
  OllamaChatResponse,
  ToolCallRequest,
  ToolDefinitionForLLM,
} from "./ollama-chat";

const DEEPSEEK_HOST = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";

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

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: OpenAIChatMessage;
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
}

function toOpenAIMessages(messages: ChatMessage[]): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
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
      const prev = out[out.length - 1];
      let toolCallId: string | undefined;
      if (prev?.role === "assistant" && prev.tool_calls?.length) {
        toolCallId = prev.tool_calls[0].id;
      } else {
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

export async function deepseekChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OllamaChatResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Get one at platform.deepseek.com and add to .env.local."
    );
  }
  const model = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

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
      `DeepSeek chat [${model}] HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as DeepSeekChatResponse;
  if (json.error?.message) throw new Error(`DeepSeek error: ${json.error.message}`);

  const choice = json.choices?.[0];
  if (!choice?.message) {
    throw new Error(
      `DeepSeek returned no message. finish_reason=${choice?.finish_reason ?? "?"}`
    );
  }

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
