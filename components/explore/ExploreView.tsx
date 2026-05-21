"use client";

// components/explore/ExploreView.tsx
// /explore — searchable, filterable destination grid. The full list of
// destinations is fetched server-side and passed in via props (so we get
// real Supabase data + Unsplash-resolved images without bloating the client
// bundle). Filtering itself is client-side for instant feedback.

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import ExploreCard from "./ExploreCard";
import {
  MOCK_GROUP_TYPES,
  type Destination,
  type GroupType,
} from "@/lib/mockData";
import {
  SearchIcon,
  SparklesIcon,
  CompassIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

interface Props {
  destinations: Destination[];
}

export default function ExploreView({ destinations }: Props) {
  // Available tags come from the fetched data (not a hardcoded list) so the
  // filter chips always reflect what's actually browseable.
  const ALL_TAGS = useMemo(
    () => Array.from(new Set(destinations.flatMap((d) => d.tags))).sort(),
    [destinations]
  );

  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [bestFor, setBestFor] = useState<GroupType[]>([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return destinations.filter((d) => {
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.tagline.toLowerCase().includes(q) &&
        !d.description.toLowerCase().includes(q) &&
        !d.state.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (tags.length > 0 && !tags.some((t) => d.tags.includes(t))) {
        return false;
      }
      if (bestFor.length > 0 && !bestFor.some((g) => d.bestFor.includes(g))) {
        return false;
      }
      return true;
    });
  }, [destinations, query, tags, bestFor]);

  function toggleTag(t: string) {
    setTags((s) =>
      s.includes(t) ? s.filter((x) => x !== t) : [...s, t]
    );
  }

  function toggleGroup(g: GroupType) {
    setBestFor((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]));
  }

  const hasFilters = !!query || tags.length > 0 || bestFor.length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-forest-950 text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1920"
            alt="Backwaters at sunset"
            fill
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/85 via-forest-950/70 to-forest-950/95" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-12 md:pt-20 md:pb-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm">
              <CompassIcon size={14} />
              Explore India
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              Find your next destination
            </h1>
            <p className="mt-3 text-white/80 text-lg max-w-xl">
              Beaches, forts, snow, backwaters, ghats — start with the place,
              we&apos;ll handle the plan.
            </p>
          </div>

          <div className="mt-7 max-w-2xl">
            <div className="relative">
              <SearchIcon
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search beaches, forts, hill stations…"
                className="w-full pl-11 pr-4 py-3.5 text-base bg-white border border-transparent rounded-2xl text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none shadow-card"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="space-y-5">
          <FilterGroup label="Tags">
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => {
                const selected = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-colors capitalize ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup label="Best for">
            <div className="flex flex-wrap gap-2">
              {MOCK_GROUP_TYPES.map((g) => {
                const selected = bestFor.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                      selected
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span>{g.emoji}</span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </FilterGroup>
        </div>

        {/* Results header */}
        <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{results.length}</span>{" "}
            destination{results.length !== 1 ? "s" : ""}
            {hasFilters && " match your filters"}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTags([]);
                setBestFor([]);
              }}
              className="text-sm font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Grid */}
        {results.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((d) => (
              <ExploreCard key={d.id} destination={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 max-w-md mx-auto text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-saffron-50 text-saffron-600">
        <SparklesIcon size={28} />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-gray-900">
        No destinations match
      </h2>
      <p className="mt-2 text-gray-500">
        Try removing a filter, or let Sarthi surprise you instead.
      </p>
      <Link
        href="/surprise"
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold"
      >
        Surprise Me 🎲
        <ArrowRightIcon size={14} />
      </Link>
    </div>
  );
}
