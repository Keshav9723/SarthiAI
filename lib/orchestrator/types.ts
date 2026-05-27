// lib/orchestrator/types.ts
// Shared types for the LLM tool-use orchestrator loop.

import type { z } from "zod";
import type { ChatMessage, ToolDefinitionForLLM } from "@/lib/api/llm/ollama-chat";

/**
 * One registered tool the orchestrator can dispatch to.
 * argsSchema validates LLM-emitted arguments before we run the handler;
 * the handler returns plain data that will be JSON-stringified and fed
 * back into the conversation as a `tool` message.
 *
 * Note on the schema typing: we use `ZodTypeAny` for `argsSchema` /
 * `resultSchema` because many of our schemas use `.default()` or
 * `.optional()`, which makes the inferred INPUT type different from the
 * OUTPUT type (e.g. input `k?: number`, output `k: number`). The strict
 * `ZodType<T, ZodTypeDef, T>` shape doesn't allow that asymmetry, so we
 * let Zod infer freely and rely on the handler's own typing for safety.
 */
export interface ToolSpec<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  argsSchema: z.ZodTypeAny;
  resultSchema?: z.ZodTypeAny;
  /** JSON Schema object used as the `parameters` field in the LLM tool definition. */
  jsonSchema: Record<string, unknown>;
  /** Handler runs the actual logic (calls APIs, queries DB, etc.). */
  handler: (args: TArgs) => Promise<TResult>;
}

export interface ToolCallTrace {
  iteration: number;
  name: string;
  args: unknown;
  result: unknown;
  error?: string;
  durationMs: number;
}

export interface OrchestratorResult<TFinal> {
  iterations: number;
  toolCalls: ToolCallTrace[];
  final: TFinal | null;
  conversation: ChatMessage[];   // full message log for debugging
  error?: string;
}

export interface RunOptions<TFinal> {
  system: string;
  user: string;
  tools: AnyToolSpec[];
  /** Schema the FINAL assistant message must satisfy after JSON-parsing its content. */
  finalSchema: z.ZodType<TFinal>;
  maxIterations?: number;    // default 8 — safety against tool-call loops
  temperature?: number;
  /** Abort signal — typically `req.signal` from the route handler. When the
   *  client disconnects, the orchestrator and underlying LLM fetches bail
   *  out instead of grinding through retries against rate-limited providers. */
  signal?: AbortSignal;
}

/**
 * Heterogeneous-tool collection helper. A `ToolSpec[]` (without generics)
 * defaults its slot to `ToolSpec<unknown, unknown>`, and the handler's
 * contravariant arg position prevents assigning a `ToolSpec<SpecificArgs, …>`
 * into that slot. Using `any` for the slot args sidesteps the variance
 * mismatch and is the standard pattern for tool registries (LangChain,
 * @anthropic-ai/sdk, ai-sdk all do this).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyToolSpec = ToolSpec<any, any>;

export type ToolDefinitionsForLLM = ToolDefinitionForLLM[];
