// lib/api/llm/anthropic-chat.ts
// Anthropic chat-completion wrapper with tool-use. Drop-in compatible with
// ollamaChat + geminiChat so the orchestrator can call any of them
// through the same interface.
//
// Anthropic Messages API tool-use shape:
//   • tools[] = [{ name, description, input_schema }]   (note: input_schema, NOT parameters)
//   • assistant tool calls = content blocks of type "tool_use" with {id, name, input}
//   • tool results = user messages with content blocks of type "tool_result"
//     { tool_use_id, content }
//   • The system prompt is a top-level field, NOT a message with role:"system"

import type {
  ChatMessage,
  OllamaChatResponse,
  ToolCallRequest,
  ToolDefinitionForLLM,
} from "./ollama-chat";

const ANTHROPIC_HOST = "https://api.anthropic.com/v1";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicTextBlock { type: "text"; text: string }
interface AnthropicToolUseBlock { type: "tool_use"; id: string; name: string; input: unknown }
interface AnthropicToolResultBlock { type: "tool_result"; tool_use_id: string; content: string }
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock | AnthropicToolResultBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicMessagesResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  error?: { message?: string; type?: string };
}

/** Extract the system prompt (if any) and convert the rest of the messages
 *  to Anthropic's shape. Tool-result messages need to be merged back into
 *  user messages as tool_result blocks. */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string;
  messages: AnthropicMessage[];
} {
  let system = "";
  const out: AnthropicMessage[] = [];
  // We need to remember the most recent assistant tool_use id so that an
  // incoming `role: "tool"` message can be paired back to it.
  const lastToolIds: string[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      system = system ? `${system}\n\n${m.content}` : m.content;
      continue;
    }
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
      continue;
    }
    if (m.role === "assistant") {
      const blocks: AnthropicContentBlock[] = [];
      if (m.content && m.content.trim()) {
        blocks.push({ type: "text", text: m.content });
      }
      if (m.tool_calls && m.tool_calls.length > 0) {
        lastToolIds.length = 0;
        m.tool_calls.forEach((tc, i) => {
          const id = `tool_${out.length}_${i}`;
          lastToolIds.push(id);
          const input =
            typeof tc.function.arguments === "string"
              ? safeJSONParse(tc.function.arguments)
              : (tc.function.arguments ?? {});
          blocks.push({
            type: "tool_use",
            id,
            name: tc.function.name,
            input,
          });
        });
      }
      if (blocks.length === 0) blocks.push({ type: "text", text: "" });
      out.push({ role: "assistant", content: blocks });
      continue;
    }
    if (m.role === "tool") {
      // Pair this result back to the most-recent unconsumed tool_use id.
      const id = lastToolIds.shift() ?? `tool_orphan_${out.length}`;
      const block: AnthropicToolResultBlock = {
        type: "tool_result",
        tool_use_id: id,
        content: m.content,
      };
      // Merge into preceding user message if it's already a tool_result batch,
      // otherwise create a new user message.
      const prev = out[out.length - 1];
      if (prev?.role === "user" && Array.isArray(prev.content) &&
          prev.content.every((b) => b.type === "tool_result")) {
        (prev.content as AnthropicContentBlock[]).push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
    }
  }
  return { system, messages: out };
}

function safeJSONParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return {}; }
}

/** Fetch wrapper that honors Anthropic's 429 retry-after header. Free-tier
 *  limits (5 RPM on Haiku 4.5) routinely trip during the orchestrator's
 *  multi-iteration tool-use loop, so we wait and retry up to twice. */
export async function fetchAnthropicWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= maxRetries) return res;

    // Anthropic returns retry-after in seconds (sometimes an HTTP-date).
    const ra = res.headers.get("retry-after");
    let waitMs = 12_000; // default: enough for a 5-RPM window to clear
    if (ra) {
      const asNum = Number(ra);
      if (Number.isFinite(asNum) && asNum > 0) {
        waitMs = Math.min(60_000, Math.ceil(asNum * 1000));
      }
    }
    // Drain the body so the connection can be reused.
    await res.text().catch(() => "");
    console.warn(`[anthropic] 429 rate-limited; waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, waitMs));
    attempt++;
  }
}

/** Convert our internal tool definition (OpenAI shape) to Anthropic shape. */
function toAnthropicTools(tools: ToolDefinitionForLLM[]): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

export async function anthropicChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OllamaChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Get one at console.anthropic.com and add to .env.local."
    );
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const { system, messages } = toAnthropicMessages(opts.messages);

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 4096,
    messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (system) body.system = system;
  if (opts.tools && opts.tools.length > 0) {
    body.tools = toAnthropicTools(opts.tools);
  }

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
      `Anthropic chat [${model}] HTTP ${res.status} — ${text.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as AnthropicMessagesResponse;
  if (json.error?.message) throw new Error(`Anthropic error: ${json.error.message}`);

  const blocks = json.content ?? [];
  const textParts = blocks
    .filter((b): b is AnthropicTextBlock => b.type === "text")
    .map((b) => b.text);
  const toolUses = blocks.filter((b): b is AnthropicToolUseBlock => b.type === "tool_use");

  const toolCalls: ToolCallRequest[] = toolUses.map((tu) => ({
    function: {
      name: tu.name,
      arguments: tu.input ?? {},
    },
  }));

  return {
    done: true,
    message: {
      role: "assistant",
      content: textParts.join(""),
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
}
