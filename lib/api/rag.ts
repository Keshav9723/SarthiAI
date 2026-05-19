// lib/api/rag.ts
// Retrieval-Augmented Generation layer. Embeds a user query via Ollama's
// mxbai-embed-large, then calls the Supabase `match_chunks` RPC to find the
// top-K most-similar knowledge_chunks rows. Optionally filter by destination
// and/or by content_type.
//
// Used by:
//   • /api/generate     — fetches destination-specific chunks for itinerary gen
//   • /api/chat         — fetches relevant chunks for "tell me about X" intents
//   • Surprise Me       — fetches across destinations for scoring + summaries

import { createServerClient } from "@/lib/supabase/server";
import { embed } from "@/lib/api/embed-server";
import type { ContentType } from "@/lib/types/content";

export interface RetrievedChunk {
  id: string;
  destinationId: string;
  contentType: ContentType;
  sourceUrl: string;
  sourceName: string;
  heading: string | null;
  text: string;
  similarity: number; // cosine similarity in [0, 1], higher = more relevant
}

export interface RetrieveOptions {
  /** The user's query. Will be embedded with mxbai-embed-large. */
  query: string;
  /** Restrict to one destination (UUID from destinations.id). Optional. */
  destinationId?: string;
  /** Restrict to specific content categories. Optional. */
  contentTypes?: ContentType[];
  /** Number of top chunks to return. Default 8. */
  k?: number;
}

interface MatchChunksRow {
  id: string;
  destination_id: string;
  content_type: ContentType;
  source_url: string;
  source_name: string;
  heading: string | null;
  text: string;
  similarity: number;
}

export async function retrieveContext(
  opts: RetrieveOptions
): Promise<RetrievedChunk[]> {
  if (!opts.query?.trim()) {
    throw new Error("retrieveContext: query must be non-empty");
  }

  const k = opts.k ?? 8;
  const embedding = await embed(opts.query);
  const sb = createServerClient();

  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: k,
    filter_destination: opts.destinationId ?? null,
    filter_content_types: opts.contentTypes ?? null,
  });

  if (error) {
    throw new Error(`match_chunks RPC failed: ${error.message}`);
  }

  const rows = (data ?? []) as MatchChunksRow[];
  return rows.map((r) => ({
    id: r.id,
    destinationId: r.destination_id,
    contentType: r.content_type,
    sourceUrl: r.source_url,
    sourceName: r.source_name,
    heading: r.heading,
    text: r.text,
    similarity: r.similarity,
  }));
}

/**
 * Convenience: format an array of chunks as a numbered context block ready to
 * paste into an LLM prompt. Each entry shows the source, heading, and text.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no relevant context found)";
  return chunks
    .map((c, i) => {
      const head = c.heading ? ` — ${c.heading}` : "";
      return `[chunk ${i + 1} | ${c.contentType} | ${c.sourceName}${head}]\n${c.text}`;
    })
    .join("\n\n");
}
