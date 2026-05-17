// scripts/scrape/sources/wikidata.ts
// One-shot SPARQL query against the Wikidata public endpoint to bulk-fetch
// structured metadata (lat/lng, elevation, population, Wikipedia/Wikivoyage
// article titles, image) for every destination we know about.
//
// We send our destination names as labels and let Wikidata's full-text search
// resolve them. The response is shaped so the orchestrator can look up
// metadata by destination slug.

import { fetchJson } from "../fetch";
import type { WikidataMetadata } from "../types";

// Limit the query to "things located in India" so we don't accidentally match
// a Goa, Spain or a Manali, USA.
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

interface SparqlBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  lat?: { value: string };
  lng?: { value: string };
  coord?: { value: string };
  elevation?: { value: string };
  population?: { value: string };
  wpTitle?: { value: string };
  wvTitle?: { value: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

function buildQuery(wikipediaTitles: string[]): string {
  // VALUES { "Goa"@en "Jaipur"@en … } — limited to 100-150 at a time to stay
  // under URL length and execution-time limits on the public endpoint.
  const values = wikipediaTitles
    .map((t) => `"${t.replace(/"/g, '\\"')}"@en`)
    .join(" ");

  return `
SELECT ?item ?itemLabel ?wpTitle ?wvTitle ?coord ?elevation ?population WHERE {
  VALUES ?wpTitle { ${values} }

  ?wpArticle schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> ;
             schema:name ?wpTitle .

  ?item wdt:P17 wd:Q668 .                       # country = India

  OPTIONAL { ?item wdt:P625 ?coord . }          # coordinate location
  OPTIONAL { ?item wdt:P2044 ?elevation . }     # elevation
  OPTIONAL { ?item wdt:P1082 ?population . }    # population

  OPTIONAL {
    ?wvArticle schema:about ?item ;
               schema:isPartOf <https://en.wikivoyage.org/> ;
               schema:name ?wvTitle .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`.trim();
}

function parseCoord(coord?: { value: string }): { lat: number; lng: number } | null {
  if (!coord?.value) return null;
  // Wikidata format: "Point(LONGITUDE LATITUDE)"
  const m = coord.value.match(/Point\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)/);
  if (!m) return null;
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

// Fetches Wikidata metadata for a batch of destinations, keyed by the
// Wikipedia title we sent. Returns Map<wikipediaTitle, metadata>.
export async function fetchWikidataMetadata(
  wikipediaTitles: string[]
): Promise<Map<string, WikidataMetadata>> {
  const out = new Map<string, WikidataMetadata>();

  // Chunk to keep query latency reasonable.
  const BATCH = 80;
  for (let i = 0; i < wikipediaTitles.length; i += BATCH) {
    const batch = wikipediaTitles.slice(i, i + BATCH);
    const query = buildQuery(batch);
    const url = `${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;

    let res: SparqlResponse;
    try {
      res = await fetchJson<SparqlResponse>(url);
    } catch (err) {
      console.warn(`[wikidata] batch ${i / BATCH} failed: ${(err as Error).message}`);
      continue;
    }

    for (const b of res.results.bindings) {
      const title = b.wpTitle?.value;
      if (!title) continue;
      const coord = parseCoord(b.coord);
      const meta: WikidataMetadata = {
        wikidataId: b.item?.value.split("/").pop(),
        wikipediaTitle: title,
        wikivoyageTitle: b.wvTitle?.value,
        latitude: coord?.lat,
        longitude: coord?.lng,
        elevationM: b.elevation ? Math.round(parseFloat(b.elevation.value)) : undefined,
        population: b.population ? Math.round(parseFloat(b.population.value)) : undefined,
      };
      // Prefer the first non-null record per title (the Wikipedia article
      // disambiguates better than the Wikivoyage one).
      if (!out.has(title)) out.set(title, meta);
    }
  }

  return out;
}
