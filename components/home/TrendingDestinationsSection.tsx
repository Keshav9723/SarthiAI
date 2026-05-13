// components/home/TrendingDestinationsSection.tsx
// Trending Indian Destinations rail. Rendered on a white background so it
// alternates with the cream/dark sections above & below for visual rhythm.

import Link from "next/link";
import HorizontalRail from "./HorizontalRail";
import DestinationCard from "@/components/cards/DestinationCard";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { MOCK_DESTINATIONS } from "@/lib/mockData";

export default function TrendingDestinationsSection() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Trending Destinations
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            India is on the move
          </h2>
          <p className="mt-1 text-gray-500">
            The most-booked Indian destinations on Sarthi this season.
          </p>
        </div>
        <Link
          href="/explore"
          className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 whitespace-nowrap"
        >
          See all destinations
          <ArrowRightIcon
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      <HorizontalRail scrollAmount={300}>
        {MOCK_DESTINATIONS.map((d) => (
          <div key={d.id} className="snap-start">
            <DestinationCard destination={d} />
          </div>
        ))}
      </HorizontalRail>

      {/* Mobile-only CTA — the inline link in the header is hidden on small screens */}
      <Link
        href="/explore"
        className="md:hidden mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
      >
        See all destinations
        <ArrowRightIcon size={14} />
      </Link>
      </div>
    </section>
  );
}
