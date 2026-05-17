// scripts/scrape/sources/wikipedia.ts
// Wikipedia scraper using the REST API at /api/rest_v1/page/html/{Title}.
// This is the OFFICIAL, well-documented endpoint designed for downstream
// consumers — better than scraping the rendered web page because the HTML
// is pre-cleaned (no nav, no sidebars, no edit links) and arrives faster.

import { load } from "cheerio";
import { fetchHtml } from "../fetch";
import { splitByHeadings } from "../chunk";
import type { DestinationConfig, RawChunk } from "../types";

const BASE = "https://en.wikipedia.org/api/rest_v1/page/html";

const EXCLUDES = [
  ".mw-editsection",
  ".reference",
  ".reflist",
  ".navbox",
  ".infobox",
  ".vcard",
  ".sister-project",
  ".metadata",
  ".thumbcaption",
  ".gallery",
  ".hatnote",
  ".sidebar",
  ".portalbox",
  "#toc",
  "table.wikitable",
  ".mw-empty-elt",
  ".noprint",
  ".citation",
  "style",
  "link",
];

export interface WikipediaResult {
  url: string;
  chunks: RawChunk[];
  skipped?: string;
}

export async function scrapeWikipedia(
  dest: DestinationConfig
): Promise<WikipediaResult> {
  const title = dest.wikipediaTitle ?? dest.name.replace(/ /g, "_");
  const url = `${BASE}/${encodeURIComponent(title)}`;

  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    return { url, chunks: [], skipped: `fetch failed: ${(err as Error).message}` };
  }

  const $ = load(html);

  // The REST API may return a redirect stub with just a single link. Detect
  // by checking section count.
  if ($("body").text().trim().length < 500) {
    return { url, chunks: [], skipped: "Wikipedia page too short / redirect stub" };
  }

  // REST API returns a fragment with section divs — root is just <body>.
  // Use a citation-friendly page link in source_url though.
  const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const pageTitle = $("title").text().replace(/ - Wikipedia$/, "").trim() || dest.name;

  const chunks = splitByHeadings({
    $,
    rootSelector: "body",
    excludeSelectors: EXCLUDES,
    destinationSlug: dest.slug,
    sourceUrl: articleUrl,
    sourceName: "wikipedia",
    pageTitle,
  });

  return { url: articleUrl, chunks };
}
