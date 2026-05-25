"use client";

// components/itinerary/TripMap.tsx
// Embedded Google Map for an itinerary. Uses the Maps Embed API (iframe) so
// we don't need to install the @react-google-maps/api package — saves ~150 KB
// from the bundle and the Embed API has the highest free quota.
//
// Three render modes:
//   • Single destination → "place" mode, centered on the city
//   • Multi-stop route   → "directions" mode, draws the line origin → dest
//   • No key configured  → renders nothing (graceful no-op)

import { useState } from "react";

interface Props {
  /** Display name for the SR-only label. */
  destination: string;
  /** Multi-city route stops (city, nights). First = arrival city. */
  stops?: Array<{ city: string }>;
  /** Per-day locations — used to derive extra waypoints when the route is
      single-stop but the days hop between sub-locations. */
  days?: Array<{ location: string }>;
  /** User's origin city. Not drawn on the map, but used to FILTER OUT any
      day/stop that happens to be set to the origin (e.g. when the LLM put
      "Day 1 location: Delhi" for a Delhi → Leh trip). */
  fromCity?: string;
}

export default function TripMap({ destination, stops, days, fromCity }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  // Missing API key — render a visible placeholder instead of silently
  // hiding the section. The Embed API key MUST be NEXT_PUBLIC_-prefixed so
  // client code can read it; the server-side GOOGLE_MAPS_API_KEY used by
  // /api/debug/health is a different variable.
  if (!apiKey) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
          Trip map
        </h2>
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            Map unavailable — add{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 text-xs">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{" "}
            to your{" "}
            <code className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 text-xs">
              .env.local
            </code>{" "}
            and restart the dev server.
          </p>
        </div>
      </section>
    );
  }

  const cities = collectCities({ destination, stops, days, fromCity });
  const src = buildEmbedSrc({ apiKey, cities, destination });

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          Trip map
        </h2>
        <a
          href={buildOpenInMapsUrl({ cities, destination })}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
        >
          Open in Google Maps →
        </a>
      </div>
      <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-card bg-gray-100">
        <iframe
          title={`Map of ${destination}`}
          src={src}
          width="100%"
          height="360"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          onError={() => setErrored(true)}
          style={{ border: 0, display: "block" }}
        />
      </div>
      {cities.length > 1 && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          Route through {cities.length} cit{cities.length === 1 ? "y" : "ies"}:
          {" "}
          <span className="text-gray-700">{cities.join(" → ")}</span>
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// City extraction
// ---------------------------------------------------------------------------

/**
 * Build the ordered list of cities to draw on the map. The user's ORIGIN
 * city is deliberately excluded — the map should focus on the destination
 * region (the places they'll actually visit on the ground), not the long-
 * haul travel that already gets a Flight / Train card and a "Your Route"
 * timeline on the sidebar.
 *
 * Priority:
 *   1. Per-day locations  — finest granularity (e.g. Anjuna → Panaji → Palolem)
 *   2. Route stops        — coarser fallback (e.g. Manali → Kaza → Manali)
 *   3. Bare destination   — single pin
 *
 * Always deduplicates consecutive same-city entries and caps at 12 nodes so
 * Google's embed stays readable.
 */
function collectCities(opts: {
  destination: string;
  stops?: Array<{ city: string }>;
  days?: Array<{ location: string }>;
  fromCity?: string;
}): string[] {
  const ordered: string[] = [];

  // Anything matching the origin should be stripped — the map is about the
  // destination region, not the long-haul leg.
  const originLc = opts.fromCity?.trim().toLowerCase();
  const isOrigin = (c: string) => originLc && c.toLowerCase() === originLc;

  // Prefer day-by-day locations when they exist (most granular).
  const fromDays = (opts.days ?? [])
    .map((d) => d.location?.trim())
    .filter((c): c is string => !!c && c.length > 1 && !isOrigin(c));
  if (fromDays.length > 0) {
    for (const c of fromDays) ordered.push(c);
  } else {
    // Otherwise use route stops.
    const fromStops = (opts.stops ?? [])
      .map((s) => s.city?.trim())
      .filter((c): c is string => !!c && c.length > 1 && !isOrigin(c));
    for (const c of fromStops) ordered.push(c);
  }

  if (ordered.length === 0) ordered.push(opts.destination);

  // Deduplicate consecutive matches (case-insensitive).
  const dedup: string[] = [];
  for (const c of ordered) {
    if (dedup.length === 0 || dedup[dedup.length - 1].toLowerCase() !== c.toLowerCase()) {
      dedup.push(c);
    }
  }

  return dedup.slice(0, 12);
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function buildEmbedSrc(opts: {
  apiKey: string;
  cities: string[];
  destination: string;
}): string {
  const base = "https://www.google.com/maps/embed/v1";

  if (opts.cities.length >= 2) {
    const origin = encodeURIComponent(`${opts.cities[0]}, India`);
    const dest = encodeURIComponent(`${opts.cities[opts.cities.length - 1]}, India`);
    const waypoints =
      opts.cities.length > 2
        ? `&waypoints=${opts.cities
            .slice(1, -1)
            .map((c) => encodeURIComponent(`${c}, India`))
            .join("|")}`
        : "";
    // `mode=driving` keeps the polyline on the road network. Note: the Embed
    // API does NOT accept `&hl=en` for directions/place modes — adding it
    // returns "Invalid request. Unexpected parameter 'hl'."
    return (
      `${base}/directions?key=${opts.apiKey}` +
      `&origin=${origin}&destination=${dest}&mode=driving${waypoints}`
    );
  }

  // Single city — place mode, zoomed in
  const q = encodeURIComponent(`${opts.destination}, India`);
  return `${base}/place?key=${opts.apiKey}&q=${q}&zoom=11`;
}

function buildOpenInMapsUrl(opts: {
  cities: string[];
  destination: string;
}): string {
  if (opts.cities.length >= 2) {
    const origin = encodeURIComponent(`${opts.cities[0]}, India`);
    const dest = encodeURIComponent(`${opts.cities[opts.cities.length - 1]}, India`);
    const waypoints =
      opts.cities.length > 2
        ? `&waypoints=${opts.cities
            .slice(1, -1)
            .map((c) => encodeURIComponent(`${c}, India`))
            .join("|")}`
        : "";
    return (
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${origin}&destination=${dest}&travelmode=driving${waypoints}`
    );
  }
  const q = encodeURIComponent(`${opts.destination}, India`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
