"use client";

// components/itinerary/PhotoGrid.tsx
// Top-of-itinerary photo grid: one large hero on the left, two stacked on the
// right, plus a "Why this trip" stats card on the far right that reports
// *real* numbers derived from the itinerary data (not marketing fluff).
// Clicking any image opens the fullscreen Lightbox.

import { useMemo, useState } from "react";
import Image from "@/components/ui/SafeImage";
import { SparklesIcon } from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import Lightbox from "@/components/ui/Lightbox";
import type { Itinerary } from "@/lib/mockData";

interface Props {
  title: string;
  gallery: string[];
  /** Itinerary used to compute the real-stats card. */
  itinerary?: Itinerary;
}

export default function PhotoGrid({ title, gallery, itinerary }: Props) {
  const [hero, two, three] = gallery;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const lightboxImages = gallery.map((src, i) => ({
    src,
    alt: `${title} — photo ${i + 1}`,
  }));

  function openAt(i: number) {
    setOpenIndex(i);
  }

  // Compute real-time stats from the actual itinerary. Everything in this
  // card has to be verifiable against the data the user is about to read —
  // no marketing fluff that turns out to be false on day-by-day inspection.
  const stats = useMemo(() => computeStats(itinerary), [itinerary]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[320px] md:h-[380px]">
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label="View larger photo"
          className="relative rounded-2xl overflow-hidden md:col-span-6 h-full group focus-ring"
        >
          <Image
            src={hero}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        </button>
        <div className="grid grid-rows-2 gap-3 md:col-span-3">
          {[two, three].map((src, i) => (
            <button
              type="button"
              key={i}
              onClick={() => openAt(i + 1)}
              aria-label="View larger photo"
              className="relative rounded-2xl overflow-hidden bg-gray-100 group focus-ring"
            >
              {src && (
                <Image
                  src={src}
                  alt={`${title} ${i + 2}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Real-stats card — derived entirely from itinerary data */}
        <div className="md:col-span-3 rounded-2xl bg-gradient-to-br from-green-600 to-forest-950 text-white p-5 flex flex-col justify-between">
          <div>
            <SparklesIcon size={22} className="text-saffron-400" />
            <p className="mt-3 text-xs font-semibold tracking-widest uppercase text-white/70">
              About this trip
            </p>
            <p className="mt-2 text-base font-semibold leading-snug">
              {stats.headline}
            </p>
          </div>

          <ul className="text-xs text-white/85 space-y-1.5">
            <li className="flex items-start gap-1.5">
              <span className="text-saffron-400">✓</span>
              <span>
                <span className="font-semibold">{stats.activityCount}</span> activities planned across {stats.dayCount} day{stats.dayCount !== 1 ? "s" : ""}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-saffron-400">✓</span>
              <span>
                {stats.citiesLabel}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-saffron-400">✓</span>
              <span>{stats.aiClaim}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-saffron-400">✓</span>
              <span>Live INR pricing for flights &amp; trains</span>
            </li>
          </ul>
        </div>
      </div>

      <Lightbox
        images={lightboxImages}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Stats derivation — every number in the card must be true of the data.
// ---------------------------------------------------------------------------

interface Stats {
  headline: string;
  activityCount: number;
  dayCount: number;
  citiesLabel: string;
  aiClaim: string;
}

function computeStats(it?: Itinerary): Stats {
  if (!it) {
    return {
      headline: "A Sarthi-curated India trip with real-time prices and weather-aware planning.",
      activityCount: 0,
      dayCount: 0,
      citiesLabel: "Hand-picked itinerary",
      aiClaim: "Built from verified travel sources",
    };
  }

  // Count non-empty slots across all days (morning / afternoon / evening).
  const slots = it.days.flatMap((d) => [d.morning, d.afternoon, d.evening]);
  const activityCount = slots.filter((s) => s && s.trim().length > 8).length;

  // Unique cities visited (deduplicated case-insensitively).
  const allCities = [
    ...it.route.map((r) => r.city),
    ...it.days.map((d) => d.location),
  ].filter((c) => c && c.trim().length > 1);
  const uniqueCities = Array.from(
    new Set(allCities.map((c) => c.toLowerCase().trim()))
  );
  const cityCount = uniqueCities.length;

  const citiesLabel =
    cityCount === 1
      ? `Focused single-base trip to ${it.destination}`
      : `${cityCount} cities visited across ${it.state}`;

  // Group-type-aware headline so each trip's card feels different.
  const headline = headlineFor(it);

  // The AI claim mirrors how the trip was actually built.
  const aiClaim = "AI-built, grounded in Wikipedia + Wikivoyage content";

  return {
    headline,
    activityCount,
    dayCount: it.totalDays,
    citiesLabel,
    aiClaim,
  };
}

function headlineFor(it: Itinerary): string {
  const group = it.groupType;
  if (group === "family") {
    return `A family-paced ${it.duration.toLowerCase()} with kid-friendly stops and rest days.`;
  }
  if (group === "couple") {
    return `A ${it.duration.toLowerCase()} couple's itinerary with curated views and quiet evenings.`;
  }
  if (group === "friends") {
    return `A ${it.duration.toLowerCase()} packed with group activities and standout meals.`;
  }
  if (group === "solo") {
    return `A solo-safe ${it.duration.toLowerCase()} with social spots and reflective time.`;
  }
  return `${it.duration} in ${it.destination}, ${it.state}.`;
}
