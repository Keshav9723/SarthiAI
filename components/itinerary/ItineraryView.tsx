"use client";

// components/itinerary/ItineraryView.tsx
// Full itinerary detail view. Used by /itinerary/[id] AND /itinerary/preview
// (preview just renders this with `previewBanner` set).

import { useMemo, useState } from "react";
import PhotoGrid from "./PhotoGrid";
import LocationGroupHeader from "./LocationGroupHeader";
import DayRow from "./DayRow";
import TransitConnector from "./TransitConnector";
import RouteSidebar from "./RouteSidebar";
import TripMap from "./TripMap";
import {
  formatINR,
  type Itinerary,
} from "@/lib/mockData";
import { CheckIcon, SparklesIcon } from "@/components/ui/Icons";

type Tab = "trip" | "inclusions" | "budget";

export interface SeasonalWeather {
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
}

interface Props {
  itinerary: Itinerary;
  previewBanner?: boolean;
  /** Pre-rendered server component (FlightCard). Rendered between the Trip
      Overview and the day-by-day itinerary if provided. */
  flightCard?: React.ReactNode;
  /** Real seasonal climate stats for the destination, fetched server-side. */
  weather?: SeasonalWeather | null;
  /** When true, the trip is a curated template — sidebar shows Save Trip. */
  isTemplate?: boolean;
}

export default function ItineraryView({
  itinerary,
  previewBanner = false,
  flightCard,
  weather,
  isTemplate = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("trip");

  // Group consecutive days by location so we can render the mint-green header
  // followed by the contained days followed by a transit connector.
  const groups = useMemo(() => groupDaysByCity(itinerary), [itinerary]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
      {previewBanner && (
        <div className="mb-5 px-4 py-3 rounded-2xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-white flex items-center gap-3">
          <SparklesIcon size={18} />
          <p className="text-sm md:text-[15px]">
            This is your AI-generated itinerary. Save it or edit with Sarthi AI →
          </p>
        </div>
      )}

      {/* Title row */}
      <header className="mb-5">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          {itinerary.state}
        </p>
        <h1 className="mt-1 text-2xl md:text-4xl font-bold tracking-tight text-gray-900">
          {itinerary.title}
        </h1>
        <p className="mt-1 text-gray-500">
          {itinerary.duration} · {itinerary.groupSize} traveller
          {itinerary.groupSize !== 1 ? "s" : ""} · {itinerary.weather}
        </p>
      </header>

      <PhotoGrid
        title={itinerary.title}
        gallery={itinerary.gallery}
        itinerary={itinerary}
      />

      {flightCard}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left column */}
        <div>
          <div
            role="tablist"
            aria-label="Itinerary sections"
            className="flex gap-2 border-b border-gray-100"
          >
            {(
              [
                { id: "trip", label: "Your Trip" },
                { id: "inclusions", label: "Inclusions" },
                { id: "budget", label: "Budget" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? "text-green-700"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span
                    aria-hidden
                    className="absolute left-3 right-3 -bottom-px h-0.5 bg-green-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {tab === "trip" && (
            <>
            <TripMap
              destination={itinerary.destination}
              stops={itinerary.route.map((s) => ({ city: s.city }))}
              days={itinerary.days.map((d) => ({ location: d.location }))}
              fromCity={itinerary.fromCity}
            />
            <section className="mt-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Itinerary
              </h2>
              <div className="mt-4 space-y-1">
                {groups.map((g, gi) => {
                  const isLast = gi === groups.length - 1;
                  return (
                    <div key={`${g.city}-${gi}`}>
                      <LocationGroupHeader city={g.city} nights={g.nights} />
                      <div className="mt-2 pl-1 md:pl-2">
                        {g.days.map((d) => (
                          <DayRow
                            key={d.dayNumber}
                            day={d}
                            itineraryId={itinerary.id}
                          />
                        ))}
                      </div>
                      {/* Only render the transit connector BETWEEN groups,
                          never after the last one — there's nowhere to
                          transfer to. */}
                      {g.transferToNext && !isLast && (
                        <TransitConnector transfer={g.transferToNext} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            </>
          )}

          {tab === "inclusions" && (
            <section className="mt-6 grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  What&apos;s included
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {itinerary.inclusions.map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="grid place-items-center w-5 h-5 rounded-full bg-green-100 text-green-700 shrink-0 mt-0.5">
                        <CheckIcon size={12} strokeWidth={3} />
                      </span>
                      <span className="text-sm text-gray-700">{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  Not included
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {itinerary.exclusions.map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="grid place-items-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 shrink-0 mt-0.5 text-xs">
                        –
                      </span>
                      <span className="text-sm text-gray-600">{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {tab === "budget" && (
            <section className="mt-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Budget overview
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Total planned:{" "}
                <span className="font-semibold text-gray-900">
                  {formatINR(itinerary.pricePerPerson * itinerary.groupSize)}
                </span>{" "}
                · {formatINR(itinerary.pricePerPerson)} per person
              </p>
              <p className="mt-6 text-sm text-gray-500">
                For a category-wise breakdown and to add expenses, open the{" "}
                <a
                  href={`/budget/${itinerary.id}`}
                  className="text-green-700 font-semibold underline underline-offset-2"
                >
                  Budget tracker
                </a>
                .
              </p>
            </section>
          )}
        </div>

        {/* Right rail */}
        <RouteSidebar itinerary={itinerary} weather={weather} isTemplate={isTemplate} />
      </div>
    </div>
  );
}

interface DayGroup {
  city: string;
  nights: number;
  days: Itinerary["days"];
  transferToNext?: Itinerary["route"][number]["transferToNext"];
}

function groupDaysByCity(itinerary: Itinerary): DayGroup[] {
  // Step 1 — Walk the days in order and bucket them by `location`.
  const buckets: DayGroup[] = [];
  for (const day of itinerary.days) {
    const last = buckets[buckets.length - 1];
    if (last && last.city === day.location) {
      last.days.push(day);
    } else {
      buckets.push({ city: day.location, nights: 0, days: [day] });
    }
  }

  // Step 2 — Attach the transferToNext from the matching route stop. We
  // intentionally do NOT trust route.nights here; the LLM frequently emits
  // 0 across every stop. We recompute nights from day counts after merging.
  let routeCursor = 0;
  for (const b of buckets) {
    const route = itinerary.route
      .slice(routeCursor)
      .find((r) => r.city === b.city);
    if (route) {
      b.transferToNext = route.transferToNext;
      const idx = itinerary.route.indexOf(route);
      routeCursor = idx + 1;
    }
  }

  // Step 3 — Merge stub buckets (single-day, 0-night) into adjacent ones:
  //   • LEADING stub (origin / transit day) → folded into the next real bucket.
  //   • TRAILING stub (departure day) → folded into the previous bucket.
  //   • MIDDLE stubs (rare — transit day with no overnight) → folded into
  //     the previous bucket too.
  //
  // We DROP the merged-bucket's transferToNext; the route sidebar handles
  // cross-city transits on its own.
  const merged: DayGroup[] = [];
  let pendingDays: Itinerary["days"] = [];
  for (const b of buckets) {
    const isStub = b.days.length === 1;
    if (isStub && merged.length === 0) {
      pendingDays = [...pendingDays, ...b.days];
      continue;
    }
    if (isStub && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.days = [...prev.days, ...b.days];
      continue;
    }
    if (pendingDays.length > 0) {
      b.days = [...pendingDays, ...b.days];
      pendingDays = [];
    }
    merged.push(b);
  }

  // If every bucket was a stub (the LLM gave each day a slightly different
  // location string like "Goa - North Beaches" vs "Goa - South Beaches"),
  // merged ends up empty. Collapse all those stub days into one bucket using
  // the trip's overall destination as the city name.
  if (merged.length === 0 && pendingDays.length > 0) {
    merged.push({
      city: itinerary.destination,
      nights: 0,
      days: pendingDays,
    });
    pendingDays = [];
  } else if (pendingDays.length > 0 && merged.length > 0) {
    // Defensive: any leftover pending days fold into the last bucket.
    merged[merged.length - 1].days.push(...pendingDays);
  }

  // Step 4 — Recompute nights for every surviving bucket from its FINAL
  // day count (nights = days − 1). This is the source of truth; the LLM's
  // route.nights is too unreliable to be used directly.
  for (const b of merged) {
    b.nights = Math.max(0, b.days.length - 1);
  }

  return merged;
}
