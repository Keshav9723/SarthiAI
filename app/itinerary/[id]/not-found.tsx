// app/itinerary/[id]/not-found.tsx

import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-green-50 text-green-700">
        <CompassIcon size={28} />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        We can&apos;t find that itinerary
      </h1>
      <p className="mt-3 text-gray-600">
        It may have been removed, or the link could be incorrect. Try one of
        our trending plans or start a new one.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-gray-200 hover:border-gray-300 font-semibold text-gray-800"
        >
          Back to home
        </Link>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Plan a new trip
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
