// components/cards/PackageCard.tsx
// Homepage Section 5 — Packages By Duration tab content. Whole card is
// clickable: if a matching pre-generated itinerary exists, we jump straight
// to /itinerary/[id]; otherwise we open /generate with the destination
// pre-filled so the user can customise.

import Link from "next/link";
import Image from "next/image";
import {
  destinationHref,
  findItineraryForDestination,
  formatINR,
  type Package,
} from "@/lib/mockData";
import { ArrowRightIcon } from "@/components/ui/Icons";

export default function PackageCard({ pkg }: { pkg: Package }) {
  const existing = findItineraryForDestination(pkg.destination);
  const href = existing
    ? `/itinerary/${existing.id}`
    : destinationHref(pkg.destination);
  const ctaLabel = existing ? "View Trip" : "Customise";

  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden focus-ring"
    >
      <div className="relative h-48 w-full">
        <Image
          src={pkg.image}
          alt={pkg.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/95 text-gray-800">
          {pkg.duration}
        </span>
        {existing && (
          <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-green-600 text-white">
            Ready-made plan
          </span>
        )}
      </div>
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
            {pkg.title}
          </h3>
          <p className="text-sm text-gray-500">{pkg.destination}</p>
        </div>
        <ul className="space-y-1">
          {pkg.highlights.map((h) => (
            <li
              key={h}
              className="text-sm text-gray-600 flex items-center gap-2"
            >
              <span className="w-1 h-1 rounded-full bg-green-500" />
              {h}
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              From
            </p>
            <p className="text-xl font-bold text-gray-900 leading-none mt-1">
              {formatINR(pkg.pricePerPerson)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">per person</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 group-hover:text-green-800">
            {ctaLabel}
            <ArrowRightIcon
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
