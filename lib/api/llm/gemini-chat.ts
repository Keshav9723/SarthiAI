// lib/api/llm/gemini-chat.ts
// Gemini chat-completion wrapper with tool-use support. Mirrors the interface
// of lib/api/llm/ollama-chat.ts so the orchestrator can swap providers without
// changing its loop logic.
//
// Key Gemini differences from Ollama/OpenAI:
//   • "assistant" role → "model"
//   • "tool" role → "function" with a functionResponse part
//   • "system" is NOT in `contents`; it's a top-level systemInstruction field
//   • Tool calls return as `functionCall` parts inside a model message
//   • Tool definitions live under a single `tools[0].function_declarations[]`
//   • responseMimeType cannot be set when tools are present

import type {
  ChatMessage,
  OllamaChatResponse,
  ToolCallRequest,
  ToolDefinitionForLLM,
} from "./ollama-chat";

const GEMINI_HOST = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

interface GeminiContentPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiContentPart[];
}

interface GeminiChatResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

/** Convert our ChatMessage[] (Ollama shape) → Gemini's contents[] shape. */
function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction: { parts: Array<{ text: string }> } | undefined;
  contents: GeminiContent[];
} {
  let systemText = "";
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemText = systemText ? `${systemText}\n\n${m.content}` : m.content;
      continue;
    }

    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }

    if (m.role === "assistant") {
      // Either a final text answer OR a tool-call request.
      if (m.tool_calls && m.tool_calls.length > 0) {
        contents.push({
          role: "model",
          parts: m.tool_calls.map((tc) => ({
            functionCall: {
              name: tc.function.name,
              args: (typeof tc.function.arguments === "object" && tc.function.arguments !== null
                ? tc.function.arguments
                : {}) as Record<string, unknown>,
            },
          })),
        });
      } else if (m.content) {
        contents.push({ role: "model", parts: [{ text: m.content }] });
      }
      continue;
    }

    if (m.role === "tool") {
      // Pair this tool result with the immediately preceding model functionCall
      // by name. Gemini's functionResponse must include the same `name` and a
      // `response` object (not a raw string).
      const prevModel = contents[contents.length - 1];
      const fnName =
        prevModel?.role === "model" && prevModel.parts[0]?.functionCall?.name
          ? prevModel.parts[0].functionCall.name
          : "unknown_function";
      let payload: Record<string, unknown>;
      try {
        const parsed = JSON.parse(m.content);
        payload = typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>)
          : { result: parsed };
      } catch {
        payload = { result: m.content };
      }
      contents.push({
        role: "function",
        parts: [{ functionResponse: { name: fnName, response: payload } }],
      });
    }
  }

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents,
  };
}

/** Convert OpenAI/Ollama-style tools into Gemini's function_declarations shape. */
function toGeminiTools(tools: ToolDefinitionForLLM[] | undefined) {
  if (!tools || tools.length === 0) return undefined;
  return [
    {
      function_declarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

/**
 * Drop-in replacement for ollamaChat. Same input shape, same output shape so
 * lib/orchestrator/loop.ts doesn't need provider-specific branches.
 */
export async function geminiChat(opts: {
  messages: ChatMessage[];
  tools?: ToolDefinitionForLLM[];
  temperature?: number;
  maxTokens?: number;
}): Promise<OllamaChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set. Get one at aistudio.google.com/app/apikey and add to .env.local."
    );
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  const { systemInstruction, contents } = toGeminiContents(opts.messages);
  const tools = toGeminiTools(opts.tools);

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      // Gemini 2.5 thinking burns output tokens silently — give plenty of headroom.
      maxOutputTokens: opts.maxTokens ?? 16384,
      // Disable thinking mode for tool-use loop. We don't need internal
      // chain-of-thought; we want fast, structured tool calls + JSON output.
      // Ignored by older Gemini models, so safe to leave in.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (tools) body.tools = tools;

  const url = `${GEMINI_HOST}/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini chat failed: HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as GeminiChatResponse;
  if (json.error?.message) throw new Error(`Gemini error: ${json.error.message}`);
  if (json.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the request: ${json.promptFeedback.blockReason}`);
  }

  const candidate = json.candidates?.[0];
  if (!candidate?.content) {
    throw new Error(
      `Gemini returned no candidate. finishReason=${candidate?.finishReason ?? "?"}`
    );
  }

  // Walk the parts to produce a ChatMessage equivalent.
  const toolCalls: ToolCallRequest[] = [];
  const textParts: string[] = [];
  for (const part of candidate.content.parts ?? []) {
    if (part.functionCall) {
      toolCalls.push({
        function: {
          name: part.functionCall.name,
          arguments: part.functionCall.args ?? {},
        },
      });
    } else if (typeof part.text === "string") {
      textParts.push(part.text);
    }
  }

  const finishReason = candidate.finishReason ?? "STOP";
  // Sanity check: empty response when expected to either tool-call or finalize.
  // MAX_TOKENS / SAFETY / RECITATION are all reasons Gemini might bail without
  // emitting anything we can use — surface that explicitly so the orchestrator
  // logs are useful.
  if (toolCalls.length === 0 && textParts.join("").trim().length === 0) {
    throw new Error(
      `Gemini returned empty response (no text, no function calls). ` +
        `finishReason=${finishReason}. This usually means the model hit MAX_TOKENS ` +
        `(thinking budget burned the output), SAFETY block, or RECITATION block.`
    );
  }

  return {
    done: true,
    message: {
      role: "assistant",
      content: textParts.join("\n").trim(),
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
}
