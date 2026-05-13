"use client";

// app/itinerary/[id]/error.tsx — scoped to itinerary view crashes.

import { useEffect } from "react";
import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ItineraryError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Sarthi/itinerary] error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
      <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-rose-50 text-rose-600">
        <CompassIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Couldn&apos;t render this itinerary
      </h1>
      <p className="mt-2 text-gray-600">
        The day-grid or budget data may be malformed. Try reloading, or open
        a different trip.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Try again
          <ArrowRightIcon size={14} />
        </button>
        <Link
          href="/my-itineraries"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold"
        >
          My itineraries
        </Link>
      </div>
    </div>
  );
}
