"use client";

// components/wishlist/WishlistView.tsx
// Shows everything the user has saved across destinations and itineraries,
// grouped by kind. Empty state nudges towards Explore / Surprise Me.

import Link from "next/link";
import { useMemo } from "react";
import { useWishlist } from "@/lib/useWishlist";
import {
  MOCK_DESTINATIONS,
  MOCK_ITINERARIES,
} from "@/lib/mockData";
import DestinationCard from "@/components/cards/DestinationCard";
import ItineraryCard from "@/components/cards/ItineraryCard";
import {
  HeartIcon,
  ArrowRightIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { toast } from "@/lib/toast";

export default function WishlistView() {
  const { items, hydrated, clear } = useWishlist();

  const { destinations, itineraries } = useMemo(() => {
    const destinationIds = new Set(
      items.filter((i) => i.kind === "destination").map((i) => i.id)
    );
    const itineraryIds = new Set(
      items.filter((i) => i.kind === "itinerary").map((i) => i.id)
    );
    return {
      destinations: MOCK_DESTINATIONS.filter((d) => destinationIds.has(d.id)),
      itineraries: MOCK_ITINERARIES.filter((it) => itineraryIds.has(it.id)),
    };
  }, [items]);

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-10 w-1/3 bg-gray-100 rounded animate-pulse" />
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = items.length === 0;

  function handleClear() {
    if (!window.confirm("Clear your entire wishlist?")) return;
    clear();
    toast.success("Wishlist cleared.");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold tracking-widest uppercase border border-rose-100">
            <HeartIcon size={12} />
            Wishlist
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Saved for later
          </h1>
          <p className="mt-2 text-gray-500">
            {items.length === 0
              ? "Heart any destination or trip to keep it here."
              : `${items.length} item${items.length !== 1 ? "s" : ""} saved.`}
          </p>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-gray-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 text-sm font-semibold text-gray-700 transition-colors"
          >
            <TrashIcon size={14} />
            Clear all
          </button>
        )}
      </header>

      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="mt-10 space-y-12">
          {destinations.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Destinations · {destinations.length}
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {destinations.map((d) => (
                  <DestinationCard
                    key={d.id}
                    destination={d}
                    variant="square"
                  />
                ))}
              </div>
            </section>
          )}

          {itineraries.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Itineraries · {itineraries.length}
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {itineraries.map((it) => (
                  <ItineraryCard
                    key={it.id}
                    itinerary={it}
                    variant="grid"
                    showFromBadge={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 max-w-md mx-auto text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-rose-50 text-rose-500">
        <HeartIcon size={28} />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-gray-900">
        Nothing here yet
      </h2>
      <p className="mt-2 text-gray-500">
        Tap the heart on any destination or itinerary card to save it for
        later.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
        >
          Browse destinations
          <ArrowRightIcon size={14} />
        </Link>
        <Link
          href="/surprise"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-saffron-500 text-saffron-600 hover:bg-saffron-500 hover:text-white text-sm font-semibold"
        >
          Surprise Me 🎲
        </Link>
      </div>
    </div>
  );
}
