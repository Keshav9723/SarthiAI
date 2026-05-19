
// scripts/scrape/sources/nominatim.ts
// Geocoding fallback for destinations Wikidata didn't return coords for.
// Nominatim is OpenStreetMap's free, no-key geocoder.
//
// Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
//   • Max 1 request per second per IP — enforced via HOST_DELAYS in fetch.ts
//   • Real User-Agent required — already set in fetch.ts
//   • No bulk / batch — we hit the search endpoint one destination at a time
//
// We bias the query with `countrycodes=in` and add "India" to the query
// string so we don't pick up a Patna in Sweden.

import { fetchJson } from "../fetch";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance?: number;
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  matchedDisplay: string;
}

export async function geocodeWithNominatim(
  name: string,
  state: string
): Promise<GeocodingResult | null> {
  const query = `${name}, ${state}, India`;
  const url =
    `${NOMINATIM_URL}?q=${encodeURIComponent(query)}` +
    `&format=json&limit=5&countrycodes=in&addressdetails=0`;

  let results: NominatimResult[];
  try {
    results = await fetchJson<NominatimResult[]>(url);
  } catch (err) {
    return null;
  }

  if (!Array.isArray(results) || results.length === 0) return null;

  // Prefer results whose display_name actually contains the destination's
  // state — protects against a wrong-region match for ambiguous place names.
  const stateLower = state.toLowerCase();
  const stateMatch = results.find((r) =>
    r.display_name.toLowerCase().includes(stateLower)
  );
  const best = stateMatch ?? results[0];

  const lat = parseFloat(best.lat);
  const lng = parseFloat(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { latitude: lat, longitude: lng, matchedDisplay: best.display_name };
}
