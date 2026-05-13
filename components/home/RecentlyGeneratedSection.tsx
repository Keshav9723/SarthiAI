// components/home/RecentlyGeneratedSection.tsx
// Section 2 — live feed of itineraries other travellers have generated.

import HorizontalRail from "./HorizontalRail";
import ItineraryCard from "@/components/cards/ItineraryCard";
import {
  MOCK_RECENT_GENERATIONS,
  getItineraryById,
} from "@/lib/mockData";

export default function RecentlyGeneratedSection() {
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
        {MOCK_RECENT_GENERATIONS.map((rg) => {
          const it = getItineraryById(rg.itineraryId);
          if (!it) return null;
          // Layer the rail metadata on top of the base itinerary so each card
          // shows its own "From X · Y ago" line.
          const merged = { ...it, fromCity: rg.fromCity, postedAgo: rg.postedAgo };
          return (
            // h-full + the card's internal h-full keep every tile in the
            // rail the same height even when highlights wrap differently.
            <div key={rg.id} className="snap-start h-full">
              <ItineraryCard itinerary={merged} />
            </div>
          );
        })}
      </HorizontalRail>
    </section>
  );
}
