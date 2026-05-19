// lib/orchestrator/types.ts
// Shared types for the LLM tool-use orchestrator loop.

import type { z } from "zod";
import type { ChatMessage, ToolDefinitionForLLM } from "@/lib/api/llm/ollama-chat";

/**
 * One registered tool the orchestrator can dispatch to.
 * argsSchema validates LLM-emitted arguments before we run the handler;
 * the handler returns plain data that will be JSON-stringified and fed
 * back into the conversation as a `tool` message.
 */
export interface ToolSpec<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  argsSchema: z.ZodType<TArgs>;
  resultSchema?: z.ZodType<TResult>;
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
  tools: ToolSpec[];
  /** Schema the FINAL assistant message must satisfy after JSON-parsing its content. */
  finalSchema: z.ZodType<TFinal>;
  maxIterations?: number;    // default 8 — safety against tool-call loops
  temperature?: number;
}

export type ToolDefinitionsForLLM = ToolDefinitionForLLM[];
