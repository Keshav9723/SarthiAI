// scripts/scrape/sources/wikivoyage.ts
// Wikivoyage scraper. Loads the page via the standard `/wiki/{Title}` route,
// passes it through the heading-aware splitter with Wikivoyage-specific
// exclude selectors. Wikivoyage's structure (See/Do/Eat/Sleep…) is so clean
// that Tier 1 heading classification covers ~70% of these chunks.

import { load } from "cheerio";
import { fetchHtml } from "../fetch";
import { splitByHeadings } from "../chunk";
import type { DestinationConfig, RawChunk } from "../types";

const BASE = "https://en.wikivoyage.org/wiki";

// Selectors to strip BEFORE chunking. Cheerio mutates the tree, so once we
// remove these the splitter never sees their text.
const EXCLUDES = [
  ".mw-editsection",
  ".mw-jump-link",
  ".reference",
  ".reflist",
  ".navbox",
  ".navbox-styles",
  ".infobox",
  ".vcard",
  ".sister-project",
  ".metadata",
  ".printfooter",
  ".mw-empty-elt",
  "#toc",
  "#siteSub",
  ".thumbcaption",
  ".gallery",
  "table.wikitable",     // most Wikivoyage tables are listings (hotels, restaurants) — keep prose instead
  ".mbox-image",
  ".mw-collapsible-toggle",
];

export interface WikivoyageResult {
  url: string;
  chunks: RawChunk[];
  skipped?: string;        // reason if we skipped without throwing
}

export async function scrapeWikivoyage(
  dest: DestinationConfig
): Promise<WikivoyageResult> {
  if (dest.skipWikivoyage) {
    return { url: "", chunks: [], skipped: "marked skipWikivoyage in config" };
  }

  const title = dest.wikivoyageTitle ?? dest.name.replace(/ /g, "_");
  const url = `${BASE}/${encodeURIComponent(title)}`;

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    return { url, chunks: [], skipped: `fetch failed: ${(err as Error).message}` };
  }

  const $ = load(html);

  // Wikivoyage occasionally redirects to a stub or shows "Wikivoyage does not
  // yet have an article" — detect via low content + ".noarticletext" or empty
  // mw-parser-output.
  if ($(".noarticletext").length || $("#mw-content-text .mw-parser-output").length === 0) {
    return { url, chunks: [], skipped: "no article on Wikivoyage" };
  }

  const pageTitle = $("h1#firstHeading").text().trim() || dest.name;

  const chunks = splitByHeadings({
    $,
    rootSelector: "#mw-content-text .mw-parser-output",
    excludeSelectors: EXCLUDES,
    destinationSlug: dest.slug,
    sourceUrl: url,
    sourceName: "wikivoyage",
    pageTitle,
  });

  return { url, chunks };
}
