// lib/api/embed-server.ts
// Server-side embedding helper. Wraps Ollama's /api/embeddings endpoint for use
// inside API routes + server components. Runs ONLY on the server because it
// expects the Ollama daemon on localhost.
//
// Mirrors the scraper's scripts/scrape/embed.ts (same model, same dims, same
// truncation rule) — kept as a separate file so the app doesn't import scripts/.

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "mxbai-embed-large";
const EMBED_DIMS = 1024;

// mxbai-embed-large has a 512-token context. Hard-truncate inputs to ~470
// tokens-worth of chars to dodge the "input length exceeds context" 500.
const MAX_EMBED_CHARS = 1880;

interface OllamaEmbedResponse {
  embedding: number[];
}

export async function embed(text: string): Promise<number[]> {
  if (!text || typeof text !== "string") {
    throw new Error("embed: input must be a non-empty string");
  }
  const safeText =
    text.length > MAX_EMBED_CHARS ? text.slice(0, MAX_EMBED_CHARS) : text;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: safeText }),
    // Server-only: no caching, no edge-runtime concerns.
    cache: "no-store",
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
      `Ollama embed returned wrong shape: got ${json.embedding?.length ?? "n/a"}, expected ${EMBED_DIMS}`
    );
  }
  return json.embedding;
}
