// app/not-found.tsx — global 404 catch-all.

import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-green-50 text-green-700">
        <CompassIcon size={28} className="animate-compass-spin" />
      </span>
      <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
        Lost the trail
      </h1>
      <p className="mt-3 text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist. Sarthi will guide
        you back to the start.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Back to home
          <ArrowRightIcon size={16} />
        </Link>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold"
        >
          Plan a new trip
        </Link>
      </div>
    </div>
  );
}
