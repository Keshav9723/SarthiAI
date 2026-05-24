// components/home/RecentlyGeneratedSection.tsx
// Section 2 — live feed of itineraries. Server-fetched from Supabase using
// template itineraries (which are the curated "ready-to-view" trips). When
// real user-generated trips are made public in the future, this rail will
// pick them up too.

import HorizontalRail from "./HorizontalRail";
import ItineraryCard from "@/components/cards/ItineraryCard";
import { listTemplateItineraries, rowToUiItinerary } from "@/lib/queries/itineraries";

// Plausible "posted N ago" cycle — purely cosmetic. Templates don't have a
// real "posted" timestamp; this just makes the rail feel alive.
const POSTED_AGO_CYCLE = ["2h ago", "5h ago", "12h ago", "1d ago", "1d ago", "2d ago"];
const FROM_CITIES = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"];

export default async function RecentlyGeneratedSection() {
  const rows = await listTemplateItineraries(8);
  if (rows.length === 0) return null;

  return (
    <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Recently Generated Itineraries
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            See what India is planning right now
          </h2>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-xs font-semibold whitespace-nowrap">
          <span className="relative grid place-items-center w-2 h-2">
            <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="w-1 h-1 rounded-full bg-red-600" />
          </span>
          Live · 143+ trips this week
        </span>
      </div>

      <HorizontalRail>
        {rows.map((r, i) => {
          const it = rowToUiItinerary(r);
          // Layer cosmetic "from X · Y ago" so each card looks distinct
          const merged = {
            ...it,
            fromCity: it.fromCity || FROM_CITIES[i % FROM_CITIES.length],
            postedAgo: it.postedAgo || POSTED_AGO_CYCLE[i % POSTED_AGO_CYCLE.length],
          };
          return (
            <div key={r.id} className="snap-start h-full">
              <ItineraryCard itinerary={merged} />
            </div>
          );
        })}
      </HorizontalRail>
    </section>
  );
}
