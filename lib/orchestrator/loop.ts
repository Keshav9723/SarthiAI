import { ollamaChat, type ChatMessage } from "@/lib/api/llm/ollama-chat";
import { geminiChat } from "@/lib/api/llm/gemini-chat";
import { anthropicChat } from "@/lib/api/llm/anthropic-chat";
import { toolsForLLM } from "./tools";

function getChatCaller() {
  const p = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (p === "gemini") return geminiChat;
  if (p === "anthropic") return anthropicChat;
  return ollamaChat;
}
import type {
  AnyToolSpec,
  OrchestratorResult,
  RunOptions,
  ToolCallTrace,
} from "./types";

/**
 * Run the orchestrator. The LLM will iteratively call tools (described in the
 * system prompt + tool registry) until it emits a final JSON answer that
 * validates against opts.finalSchema.
 */
export async function runOrchestrator<TFinal>(
  opts: RunOptions<TFinal>
): Promise<OrchestratorResult<TFinal>> {
  const maxIterations = opts.maxIterations ?? 8;
  const toolMap = new Map<string, AnyToolSpec>(opts.tools.map((t) => [t.name, t]));

  const conversation: ChatMessage[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  const toolCalls: ToolCallTrace[] = [];
  const llmTools = toolsForLLM(opts.tools);
  const chatCall = getChatCaller();
  // Track whether we've already injected a "respond in JSON" nudge after the
  // model returned prose. One nudge max per run — prevents infinite loops if
  // the model is genuinely unable to comply.
  let jsonNudgeUsed = false;
  // Same idea for "finalize now" — fires once when the model spends too many
  // iterations gathering tool data without producing a final answer.
  let finalizeNudgeUsed = false;
  const finalizeAfter = Math.max(4, Math.ceil(maxIterations * 0.7));

  for (let i = 1; i <= maxIterations; i++) {
    // ----- 1. Call the model -----
    let response;
    try {
      response = await chatCall({
        messages: conversation,
        tools: llmTools,
        temperature: opts.temperature ?? 0.3,
      });
    } catch (err) {
      return {
        iterations: i,
        toolCalls,
        final: null,
        conversation,
        error: `LLM call failed at iteration ${i}: ${(err as Error).message}`,
      };
    }

    const msg = response.message;
    conversation.push(msg);

    // ----- 2. Did the model request tool calls? -----
    const requests = msg.tool_calls ?? [];
    if (requests.length === 0) {
      // No more tool calls — this should be the final answer.
      let parsed: unknown;
      let parseError: string | null = null;
      try {
        parsed = JSON.parse(msg.content);
      } catch {
        // Try extracting the first {…} block in case the model wrapped JSON in prose.
        const extracted = extractJsonObject(msg.content);
        if (extracted) {
          try {
            parsed = JSON.parse(extracted);
          } catch (e) {
            parseError = `Could not parse extracted JSON block: ${(e as Error).message}`;
          }
        } else {
          parseError = `No JSON block found in model output`;
        }
      }

      // If we got parsed JSON, validate against schema and either return or
      // (on schema failure) optionally retry with a hint.
      if (parsed !== undefined && !parseError) {
        const validation = opts.finalSchema.safeParse(parsed);
        if (validation.success) {
          return {
            iterations: i,
            toolCalls,
            final: validation.data,
            conversation,
          };
        }
        parseError = `Schema validation failed: ${validation.error.message.slice(0, 400)}`;
      }

      // First time we hit a parse/schema failure, inject a strict JSON nudge
      // and let the model try again. qwen3.5:9b in particular tends to drift
      // into prose (or generic training-data templates like "Los Angeles
      // Adventure") after a long tool-use chain. The nudge repeats the
      // expected schema VERBATIM so the model can't claim ignorance.
      if (!jsonNudgeUsed) {
        jsonNudgeUsed = true;
        conversation.push({
          role: "user",
          content:
            `Your previous response could not be parsed as the required itinerary. ` +
            `IMPORTANT: this trip is in INDIA. Do NOT use foreign cities or generic templates.\n\n` +
            `Respond NOW with ONLY a single JSON object — no markdown, no prose, no commentary, ` +
            `just the raw JSON starting with { and ending with }. ` +
            `Use EXACTLY these field names (no aliases, no synonyms):\n\n` +
            `{\n` +
            `  "title": "<short Indian-trip title>",\n` +
            `  "destination": "<the exact destination from the user prompt>",\n` +
            `  "state": "<the exact state from the user prompt>",\n` +
            `  "duration": "<N nights / N+1 days>",\n` +
            `  "nights": <integer>,\n` +
            `  "total_days": <integer>,\n` +
            `  "group_type": "couple"|"family"|"friends"|"solo",\n` +
            `  "group_size": <integer>,\n` +
            `  "highlights": [<string>, ...],\n` +
            `  "total_budget": <integer rupees>,\n` +
            `  "price_per_person": <integer rupees>,\n` +
            `  "days": [{ "day_number": 1, "location": "...", "morning": "...", "afternoon": "...", "evening": "...", "type": "arrival" }, ...],\n` +
            `  "route": [{ "city": "...", "nights": <int>, "transfer_to_next": null | { "mode": "...", "label": "...", "duration": "..." } }, ...],\n` +
            `  "inclusions": [<string>, ...],\n` +
            `  "exclusions": [<string>, ...]\n` +
            `}\n\n` +
            (parseError ? `Specific issue with your previous output: ${parseError}` : ""),
        });
        continue; // skip to next iteration without erroring out
      }

      // Already used our nudge — surrender.
      return {
        iterations: i,
        toolCalls,
        final: null,
        conversation,
        error: `Model returned non-JSON final answer: ${msg.content.slice(0, 200)}`,
      };
    }

    // ----- 2b. If we're past the budget for exploration, nudge the model
    //          to wrap up and emit the final itinerary. Only once. -----
    if (!finalizeNudgeUsed && i >= finalizeAfter) {
      finalizeNudgeUsed = true;
      // Append BEFORE executing the requested tools so they still run, but
      // the model sees on the NEXT turn that it should now finalize.
      // We do this by pushing both the tool results AND the nudge below.
      // (handled at the end of this for-loop)
    }

    // ----- 3. Execute each requested tool, append results -----
    for (const call of requests) {
      const name = call.function.name;
      const args = call.function.arguments;
      const tool = toolMap.get(name);
      const startedAt = Date.now();

      if (!tool) {
        const traceErr = `Unknown tool: ${name}`;
        toolCalls.push({
          iteration: i, name, args, result: null,
          error: traceErr, durationMs: 0,
        });
        conversation.push({
          role: "tool",
          content: JSON.stringify({ error: traceErr }),
        });
        continue;
      }

      // Validate args
      const parsedArgs = tool.argsSchema.safeParse(args);
      if (!parsedArgs.success) {
        const traceErr = `Invalid args for ${name}: ${parsedArgs.error.message.slice(0, 200)}`;
        toolCalls.push({
          iteration: i, name, args, result: null,
          error: traceErr, durationMs: Date.now() - startedAt,
        });
        conversation.push({
          role: "tool",
          content: JSON.stringify({ error: traceErr }),
        });
        continue;
      }

      // Run handler
      try {
        const result = await tool.handler(parsedArgs.data);
        toolCalls.push({
          iteration: i, name, args: parsedArgs.data, result,
          durationMs: Date.now() - startedAt,
        });
        conversation.push({
          role: "tool",
          content: JSON.stringify(result),
        });
      } catch (err) {
        const errMsg = (err as Error).message;
        toolCalls.push({
          iteration: i, name, args: parsedArgs.data, result: null,
          error: errMsg, durationMs: Date.now() - startedAt,
        });
        conversation.push({
          role: "tool",
          content: JSON.stringify({ error: errMsg }),
        });
      }
    }

    // If we're past the exploration budget, push a finalize nudge so the
    // model sees it AFTER all the tool results this turn. Next iteration
    // it should stop calling tools and emit the JSON itinerary.
    if (finalizeNudgeUsed && i === finalizeAfter) {
      conversation.push({
        role: "user",
        content:
          `You have now gathered enough information across ${toolCalls.length} tool calls. ` +
          `STOP calling tools. On your next turn, emit the FINAL itinerary as a single JSON object ` +
          `matching the schema in the system prompt. No more tool calls, no prose — just the JSON.`,
      });
    }
  }

  // ----- 4. Hit max iterations without a final answer -----
  return {
    iterations: maxIterations,
    toolCalls,
    final: null,
    conversation,
    error: `Max iterations (${maxIterations}) reached without a final answer.`,
  };
}

/** Crude JSON-object extractor — finds the first balanced { … } block. */
function extractJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
