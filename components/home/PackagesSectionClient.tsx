"use client";

// components/home/PackagesSectionClient.tsx
// Client-side tab selector + grid for the Packages section. Data comes from
// the server component PackagesSection.

import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import { useMemo, useState } from "react";
import {
  destinationHref,
  findItineraryForDestination,
  formatINR,
} from "@/lib/mockData";
import { ArrowRightIcon, MapPinIcon } from "@/components/ui/Icons";
import type { BucketedPackage } from "./PackagesSection";

const TABS: { id: BucketedPackage["durationBucket"]; label: string }[] = [
  { id: "short", label: "3–5 Days" },
  { id: "mid", label: "6–9 Days" },
  { id: "long", label: "10+ Days" },
];

export default function PackagesSectionClient({ packages }: { packages: BucketedPackage[] }) {
  const [active, setActive] = useState<BucketedPackage["durationBucket"]>("short");
  const filtered = useMemo(
    () => packages.filter((p) => p.durationBucket === active).slice(0, 6),
    [packages, active]
  );

  return (
    <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Curated Packages
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            By how long you have
          </h2>
        </div>
        <div
          role="tablist"
          aria-label="Trip duration"
          className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-100 self-start"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                active === t.id
                  ? "bg-white text-green-700 shadow-card"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <p className="text-gray-500 col-span-full">
            No {TABS.find((t) => t.id === active)?.label.toLowerCase()} packages yet —
            try the Generate wizard.
          </p>
        ) : (
          filtered.map((p) => <PackageTile key={p.id} pkg={p} />)
        )}
      </div>
    </section>
  );
}

function PackageTile({ pkg }: { pkg: BucketedPackage }) {
  const existing = findItineraryForDestination(pkg.destination);
  const ctaHref = existing
    ? `/itinerary/${existing.id}`
    : `/itinerary/${pkg.id}`;

  return (
    <Link
      href={ctaHref}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden focus-ring"
    >
      <div className="relative h-44 w-full">
        <Image
          src={pkg.image}
          alt={pkg.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-gray-800 text-[10px] font-semibold tracking-widest uppercase">
          {pkg.duration}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase flex items-center gap-1">
          <MapPinIcon size={10} />
          {pkg.destination}
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 line-clamp-2">
          {pkg.title}
        </h3>
        <ul className="space-y-1">
          {pkg.highlights.slice(0, 3).map((h) => (
            <li key={h} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="mt-1 w-1 h-1 rounded-full bg-green-500 shrink-0" />
              <span className="line-clamp-1">{h}</span>
            </li>
          ))}
        </ul>
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">
            {formatINR(pkg.pricePerPerson)}
            <span className="text-xs font-medium text-gray-500"> /person</span>
          </p>
          <span className="text-xs font-semibold text-green-700 inline-flex items-center gap-1 group-hover:text-green-800">
            View Trip
            <ArrowRightIcon
              size={12}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
