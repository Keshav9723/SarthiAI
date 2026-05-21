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
  /** Optional list of stops if the trip is multi-city. First = origin. */
  stops?: Array<{ city: string }>;
  /** Optional starting city (the "from" city) — drawn as the origin of the route. */
  fromCity?: string;
}

export default function TripMap({ destination, stops, fromCity }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [errored, setErrored] = useState(false);

  if (!apiKey || errored) return null;

  const src = buildEmbedSrc({ apiKey, destination, stops, fromCity });

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          Trip map
        </h2>
        <a
          href={buildOpenInMapsUrl({ destination, stops, fromCity })}
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function buildEmbedSrc(opts: {
  apiKey: string;
  destination: string;
  stops?: Array<{ city: string }>;
  fromCity?: string;
}): string {
  const base = "https://www.google.com/maps/embed/v1";

  // Multi-city: build origin → waypoints → destination chain
  const cities = [
    ...(opts.fromCity ? [opts.fromCity] : []),
    ...(opts.stops?.map((s) => s.city) ?? []),
  ].filter((c) => c && c.trim().length);

  if (cities.length >= 2) {
    const origin = encodeURIComponent(`${cities[0]}, India`);
    const dest = encodeURIComponent(`${cities[cities.length - 1]}, India`);
    const waypoints =
      cities.length > 2
        ? `&waypoints=${cities
            .slice(1, -1)
            .map((c) => encodeURIComponent(`${c}, India`))
            .join("|")}`
        : "";
    return `${base}/directions?key=${opts.apiKey}&origin=${origin}&destination=${dest}&mode=driving${waypoints}`;
  }

  // Single destination — place mode
  const q = encodeURIComponent(`${opts.destination}, India`);
  return `${base}/place?key=${opts.apiKey}&q=${q}&zoom=11`;
}

function buildOpenInMapsUrl(opts: {
  destination: string;
  stops?: Array<{ city: string }>;
  fromCity?: string;
}): string {
  const cities = [
    ...(opts.fromCity ? [opts.fromCity] : []),
    ...(opts.stops?.map((s) => s.city) ?? []),
  ].filter(Boolean);

  if (cities.length >= 2) {
    const origin = encodeURIComponent(`${cities[0]}, India`);
    const dest = encodeURIComponent(`${cities[cities.length - 1]}, India`);
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
  }
  const q = encodeURIComponent(`${opts.destination}, India`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
