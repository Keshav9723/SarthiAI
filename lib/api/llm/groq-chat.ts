// lib/api/llm/groq-chat.ts
// Groq chat-completion wrapper with tool-use. Drop-in compatible with
// ollamaChat / geminiChat / anthropicChat so the orchestrator can call any
// of them through the same interface. Uses Groq's OpenAI-compatible
// /v1/chat/completions endpoint.

import type {
  ChatMessage,
  OllamaChatResponse,
  ToolCallRequest,
  ToolDefinitionForLLM,
} from "./ollama-chat";

const GROQ_HOST = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

interface OpenAIToolCall {
  id?: string;
  type?: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface GroqChatCompletionsResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

function safeJSONParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return {}; }
}

/** Convert our internal ChatMessage list to OpenAI/Groq message shape.
 *  Tool-result messages need a matching `tool_call_id` from the preceding
 *  assistant tool_use, so we track ids as we go. */
function toOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  const pendingToolIds: string[] = [];

  for (const m of messages) {
    if (m.role === "system" || m.role === "user") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const toolCalls: OpenAIToolCall[] | undefined =
        m.tool_calls && m.tool_calls.length > 0
          ? m.tool_calls.map((tc, i) => {
              const id = `call_${out.length}_${i}`;
              pendingToolIds.push(id);
              const argsStr =
                typeof tc.function.arguments === "string"
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments ?? {});
              return {
                id,
                type: "function",
                function: { name: tc.function.name, arguments: argsStr },
              };
            })
          : undefined;
      out.push({
        role: "assistant",
        content: m.content ?? "",
        tool_calls: toolCalls,
      });
      continue;
    }
    if (m.role === "tool") {
      const id = pendingToolIds.shift() ?? `call_orphan_${out.length}`;
      out.push({
        role: "tool",
        content: m.content,
        tool_call_id: id,
      });
    }
  }
  return out;
}

/** Fetch wrapper that honors Groq's 429 retry-after header. Bails out
 *  immediately if the caller's AbortSignal fires during the wait — otherwise
 *  a disconnected client would still pay for 30+ second backoffs. */
async function fetchGroqWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 1,
  signal?: AbortSignal
): Promise<Response> {
  let attempt = 0;
  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= maxRetries) return res;

    const ra = res.headers.get("retry-after");
    // Cap the wait at 15s — if Groq says it'll be longer, give up and surface
    // the 429 so the orchestrator can fail fast instead of stalling the user.
    let waitMs = 6_000;
    if (ra) {
      const asNum = Number(ra);
      if (Number.isFinite(asNum) && asNum > 0) {
        waitMs = Math.min(15_000, Math.ceil(asNum * 1000));
      }
    }
    await res.text().catch(() => "");
    console.warn(`[groq] 429 rate-limited; waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
    // Sleep, but wake immediately if the signal aborts.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, waitMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
    attempt++;
  }
}

export async function groqChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<OllamaChatResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY not set. Get one at console.groq.com and add to .env.local."
    );
  }
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.3,
    messages: toOpenAIMessages(opts.messages),
  };
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools;
    body.tool_choice = "auto";
  }

  const res = await fetchGroqWithRetry(
    `${GROQ_HOST}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: opts.signal,
    },
    1,
    opts.signal
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Groq chat [${model}] HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as GroqChatCompletionsResponse;
  if (json.error?.message) throw new Error(`Groq error: ${json.error.message}`);

  const choice = json.choices?.[0]?.message;
  const text = choice?.content ?? "";
  const toolCallsRaw = choice?.tool_calls ?? [];

  const toolCalls: ToolCallRequest[] = toolCallsRaw.map((tc) => ({
    function: {
      name: tc.function.name,
      arguments: safeJSONParse(tc.function.arguments ?? ""),
    },
  }));

  return {
    done: true,
    message: {
      role: "assistant",
      content: text,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
}
