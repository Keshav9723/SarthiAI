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
import {
  formatINR,
  type Itinerary,
} from "@/lib/mockData";
import { CheckIcon, SparklesIcon } from "@/components/ui/Icons";

type Tab = "trip" | "inclusions" | "budget";

interface Props {
  itinerary: Itinerary;
  previewBanner?: boolean;
}

export default function ItineraryView({
  itinerary,
  previewBanner = false,
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

      <PhotoGrid title={itinerary.title} gallery={itinerary.gallery} />

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
            <section className="mt-6">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Itinerary
              </h2>
              <div className="mt-4 space-y-1">
                {groups.map((g, gi) => (
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
                    {g.transferToNext && (
                      <TransitConnector transfer={g.transferToNext} />
                    )}
                  </div>
                ))}
              </div>
            </section>
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
                  {formatINR(itinerary.totalBudget)}
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
        <RouteSidebar itinerary={itinerary} />
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
  // Walk the days in order and bucket them by `location`. We then attach the
  // transferToNext from the matching route stop so the connector slots in
  // after each group.
  const buckets: DayGroup[] = [];
  for (const day of itinerary.days) {
    const last = buckets[buckets.length - 1];
    if (last && last.city === day.location) {
      last.days.push(day);
    } else {
      buckets.push({ city: day.location, nights: 0, days: [day] });
    }
  }

  // Annotate nights + transfer info using the route metadata. We match by
  // city name in order so duplicates (rare here) still resolve correctly.
  let routeCursor = 0;
  for (const b of buckets) {
    const route = itinerary.route
      .slice(routeCursor)
      .find((r) => r.city === b.city);
    if (route) {
      b.nights = route.nights;
      b.transferToNext = route.transferToNext;
      const idx = itinerary.route.indexOf(route);
      routeCursor = idx + 1;
    } else {
      // Fallback: count days minus departure days.
      b.nights = Math.max(0, b.days.length - 1);
    }
  }
  return buckets;
}
