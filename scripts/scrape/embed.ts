// scripts/scrape/embed.ts
// Thin wrapper around Ollama's /api/embeddings endpoint. mxbai-embed-large
// returns 1024-dim vectors — verify with EMBED_DIMS at the call site.
//
// Embeddings run sequentially through Ollama because the 3070Ti laptop only
// has 8 GB VRAM; parallel calls would queue inside Ollama anyway. ~50ms per
// call when the model is warm.

import { EMBED_DIMS, EMBED_MODEL, OLLAMA_BASE_URL } from "./config";

interface OllamaEmbedResponse {
  embedding: number[];
}

// mxbai-embed-large has a 512-token context window. The chunker targets ~380
// tokens, but our chars/4 estimator is approximate and dense English prose
// can pack 5+ chars/token. Hard-truncate any input that exceeds ~470 tokens
// worth of chars (≈ 1880 chars) to guarantee we never overflow Ollama.
const MAX_EMBED_CHARS = 1880;

export async function embed(text: string): Promise<number[]> {
  const safeText =
    text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: safeText }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ollama embed failed: HTTP ${res.status} ${res.statusText} — ${body.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as OllamaEmbedResponse;
  if (!Array.isArray(json.embedding) || json.embedding.length !== EMBED_DIMS) {
    throw new Error(
      `Ollama embed returned wrong shape: got ${json.embedding?.length}, expected ${EMBED_DIMS}`
    );
  }
  return json.embedding;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("cosine: vector length mismatch");
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
