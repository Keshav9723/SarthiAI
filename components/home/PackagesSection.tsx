"use client";

// components/home/PackagesSection.tsx
// Section 5 — duration-bucketed packages with a tab selector.

import { useState } from "react";
import PackageCard from "@/components/cards/PackageCard";
import { MOCK_PACKAGES, type Package } from "@/lib/mockData";

const TABS: { id: Package["durationBucket"]; label: string }[] = [
  { id: "short", label: "3–5 Days" },
  { id: "mid", label: "6–9 Days" },
  { id: "long", label: "10+ Days" },
];

export default function PackagesSection() {
  const [active, setActive] = useState<Package["durationBucket"]>("short");
  const filtered = MOCK_PACKAGES.filter((p) => p.durationBucket === active);

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
        {filtered.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>
    </section>
  );
}
