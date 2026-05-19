// app/api/debug/rag/route.ts
// Dev-only debug endpoint to verify the RAG retrieval layer works end-to-end.
// Hits the embedder, calls match_chunks, and returns the top-K chunks with
// previews + similarity scores.
//
// Disabled in production to avoid exposing internal data.
//
// Examples:
//   curl "http://localhost:3000/api/debug/rag?q=beaches+in+goa"
//   curl "http://localhost:3000/api/debug/rag?q=manali+food&k=12"
//   curl "http://localhost:3000/api/debug/rag?q=temples&dest=<uuid>&k=5"

import { NextResponse, type NextRequest } from "next/server";
import { retrieveContext } from "@/lib/api/rag";
import { ALL_CONTENT_TYPES, isContentType, type ContentType } from "@/lib/types/content";

export const runtime = "nodejs";       // we need fetch + crypto, not edge
export const dynamic = "force-dynamic"; // never cache debug results

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug routes are disabled in production." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      {
        error: "Missing ?q= parameter.",
        examples: [
          "/api/debug/rag?q=beaches+in+goa",
          "/api/debug/rag?q=manali+food&k=12",
          "/api/debug/rag?q=safety&types=safety,practical",
        ],
        knownContentTypes: ALL_CONTENT_TYPES,
      },
      { status: 400 }
    );
  }

  const destinationId = url.searchParams.get("dest") ?? undefined;
  const k = Math.min(50, Math.max(1, parseInt(url.searchParams.get("k") ?? "8", 10)));

  // Optional content_type filter
  const typesParam = url.searchParams.get("types");
  let contentTypes: ContentType[] | undefined;
  if (typesParam) {
    const requested = typesParam.split(",").map((s) => s.trim());
    const invalid = requested.filter((t) => !isContentType(t));
    if (invalid.length) {
      return NextResponse.json(
        {
          error: `Unknown content_type(s): ${invalid.join(", ")}`,
          knownContentTypes: ALL_CONTENT_TYPES,
        },
        { status: 400 }
      );
    }
    contentTypes = requested as ContentType[];
  }

  try {
    const start = Date.now();
    const chunks = await retrieveContext({
      query,
      destinationId,
      contentTypes,
      k,
    });
    const durationMs = Date.now() - start;

    return NextResponse.json({
      query,
      k,
      destinationId: destinationId ?? null,
      contentTypes: contentTypes ?? "any",
      durationMs,
      count: chunks.length,
      chunks: chunks.map((c) => ({
        similarity: Number(c.similarity.toFixed(4)),
        contentType: c.contentType,
        sourceName: c.sourceName,
        heading: c.heading,
        sourceUrl: c.sourceUrl,
        preview:
          c.text.length > 280 ? c.text.slice(0, 280).trimEnd() + "…" : c.text,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, query, k },
      { status: 500 }
    );
  }
}
