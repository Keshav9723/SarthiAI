// scripts/scrape/chunk.ts
// Heading-aware splitter. Walks the parsed DOM, finds every <h2>/<h3>, and
// collects sibling <p>/<li>/<dl> text up to the next heading of equal or
// higher level. Long sections (>700 tokens) are sliced into ~450-token windows
// with 100-token overlap so retrieval doesn't lose context mid-thought.
//
// Source-specific drivers (sources/wikivoyage.ts etc.) call splitByHeadings()
// with selectors that exclude nav, footer, citations, infoboxes, etc.

import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import {
  CHUNK_MAX_TOKENS,
  CHUNK_MIN_TOKENS,
  CHUNK_OVERLAP_TOKENS,
  CHUNK_TARGET_TOKENS,
} from "./config";
import type { RawChunk, SourceName } from "./types";

// Rough token estimator: chars / 4. The actual tokenizer (mxbai's BPE) isn't
// available in JS, but the 4-chars/token rule is accurate within ~15% for
// English prose, which is good enough for chunk-sizing decisions.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface SplitOptions {
  $: CheerioAPI;
  rootSelector: string;          // e.g. "#mw-content-text .mw-parser-output"
  excludeSelectors: string[];    // e.g. [".reflist", ".navbox", ".mw-editsection"]
  destinationSlug: string;
  sourceUrl: string;
  sourceName: SourceName;
  pageTitle: string;             // top-level h1 — used for headingPath[0]
}

export function splitByHeadings(opts: SplitOptions): RawChunk[] {
  const { $, rootSelector, excludeSelectors, destinationSlug, sourceUrl, sourceName, pageTitle } = opts;

  const root = $(rootSelector).first();
  if (!root.length) return [];

  // Strip noise once, in place. Cheerio mutates the tree in this method.
  for (const sel of excludeSelectors) root.find(sel).remove();

  // Capture the page's lead paragraphs (everything before the first h2) as
  // an "Overview" chunk — Wikipedia/Wikivoyage articles often have key intro
  // text outside any heading.
  const chunks: RawChunk[] = [];
  let position = 0;

  const leadText = collectTextUntilHeading($, root, null);
  if (estimateTokens(leadText) >= CHUNK_MIN_TOKENS) {
    chunks.push(
      ...splitLongChunk(
        {
          destinationSlug,
          sourceUrl,
          sourceName,
          heading: "Overview",
          headingPath: [pageTitle, "Overview"],
          text: leadText,
          position: position++,
        },
      )
    );
  }

  // Walk h2 + h3 in document order. We treat h2 as section, h3 as subsection.
  const headings = root.find("h2, h3").toArray();
  let currentH2: string | null = null;

  for (const h of headings) {
    const $h = $(h);
    const level = h.tagName.toLowerCase();          // "h2" | "h3"
    const heading = cleanHeading($h.text());
    if (!heading) continue;
    if (level === "h2") currentH2 = heading;

    const body = collectTextUntilHeading($, root, h, level);
    if (estimateTokens(body) < CHUNK_MIN_TOKENS) continue;

    const headingPath =
      level === "h2"
        ? [pageTitle, heading]
        : [pageTitle, currentH2 ?? "", heading].filter(Boolean);

    chunks.push(
      ...splitLongChunk(
        {
          destinationSlug,
          sourceUrl,
          sourceName,
          heading,
          headingPath,
          text: body,
          position: position++,
        },
      )
    );
  }

  return chunks;
}

// Collects text from all element siblings AFTER `startEl` up to the next
// heading of the same or higher level. If startEl is null, collects from the
// top of `root` until the first h2.
function collectTextUntilHeading(
  $: CheerioAPI,
  root: Cheerio<Element>,
  startEl: Element | null,
  level: "h2" | "h3" = "h2"
): string {
  const stopAt = level === "h2" ? ["h2"] : ["h2", "h3"];
  const parts: string[] = [];

  // Walk through ALL descendants in order, starting AFTER startEl.
  let collecting = startEl === null;
  const descendants = root.find("*").toArray();

  for (const el of descendants) {
    if (!collecting) {
      if (el === startEl) collecting = true;
      continue;
    }
    const tag = el.tagName?.toLowerCase();
    if (tag && stopAt.includes(tag)) break;

    // Only collect direct content-bearing tags. This avoids pulling text from
    // inside nested elements twice (the outer <div> AND its <p> children).
    if (tag === "p" || tag === "li" || tag === "dd" || tag === "dt") {
      const text = $(el).text().trim();
      if (text) parts.push(text);
    }
  }

  return parts.join("\n\n").replace(/\s+/g, " ").trim();
}

function cleanHeading(s: string): string {
  return s.replace(/\[edit\]?$/, "").replace(/\s+/g, " ").trim();
}

// Splits a single chunk into ≤CHUNK_MAX_TOKENS windows with overlap. Uses a
// crude char-based slicer — close enough for embeddings, no tokenizer needed.
function splitLongChunk(chunk: RawChunk): RawChunk[] {
  const tokens = estimateTokens(chunk.text);
  if (tokens <= CHUNK_MAX_TOKENS) return [chunk];

  const targetChars = CHUNK_TARGET_TOKENS * 4;
  const overlapChars = CHUNK_OVERLAP_TOKENS * 4;
  const slices: string[] = [];
  let i = 0;
  while (i < chunk.text.length) {
    const end = Math.min(i + targetChars, chunk.text.length);
    let sliceEnd = end;
    // Try to break on sentence boundary near the target.
    if (end < chunk.text.length) {
      const lastPeriod = chunk.text.lastIndexOf(". ", end);
      if (lastPeriod > i + targetChars * 0.6) sliceEnd = lastPeriod + 1;
    }
    slices.push(chunk.text.slice(i, sliceEnd).trim());
    if (sliceEnd >= chunk.text.length) break;
    i = sliceEnd - overlapChars;
  }

  return slices.map((text, idx) => ({
    ...chunk,
    text,
    // Stretch position so each slice gets a unique (source_url, position) key.
    // 1000-step gap leaves room for re-runs adding more chunks between.
    position: chunk.position * 1000 + idx,
  }));
}
