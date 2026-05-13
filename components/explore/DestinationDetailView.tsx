// components/explore/DestinationDetailView.tsx
// /explore/[destination] — full destination detail page.
// Server-renderable; only the FAQ accordion is a Client child.

import Link from "next/link";
import Image from "next/image";
import DestinationFAQ from "./DestinationFAQ";
import DestinationGallery from "./DestinationGallery";
import ItineraryCard from "@/components/cards/ItineraryCard";
import {
  MOCK_ITINERARIES,
  destinationHref,
  findItineraryForDestination,
  formatINRCompact,
  type Destination,
  type DestinationExtras,
} from "@/lib/mockData";
import {
  ArrowRightIcon,
  CalendarIcon,
  CloudSunIcon,
  CompassIcon,
  MapPinIcon,
  SparklesIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

const ALL_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Props {
  destination: Destination;
  extras?: DestinationExtras;
}

export default function DestinationDetailView({
  destination,
  extras,
}: Props) {
  // Match every itinerary whose destination string mentions the place — this
  // gives travellers a "see actual day-by-day plans" section, not just specs.
  const existing = findItineraryForDestination(destination.name);
  const matchedItineraries = MOCK_ITINERARIES.filter((it) => {
    const tokens = destination.name.toLowerCase().split(/\s+/);
    const haystack =
      `${it.destination} ${it.state} ${it.title}`.toLowerCase();
    return tokens.some((t) => t.length > 2 && haystack.includes(t));
  });

  const bestMonthsLower = destination.bestMonths.map((m) =>
    m.slice(0, 3).toLowerCase()
  );

  const ctaHref = existing
    ? `/itinerary/${existing.id}`
    : destinationHref(destination.name);
  const ctaLabel = existing ? "View ready-made trip" : "Plan this trip";

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] w-full text-white overflow-hidden">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/40 via-forest-950/20 to-forest-950/90" />

        <div className="relative h-full max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-12 md:pt-14 md:pb-16 flex flex-col">
          <div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white font-semibold"
            >
              ← Back to Explore
            </Link>
          </div>
          <div className="mt-auto max-w-3xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/80 inline-flex items-center gap-1.5">
              <MapPinIcon size={14} />
              {destination.state}
            </p>
            <h1 className="mt-2 text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
              {destination.name}
            </h1>
            <p className="mt-3 text-xl md:text-2xl text-white/90 font-medium">
              {destination.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {destination.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/15"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick facts strip */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-10">
        <div className="bg-white rounded-3xl shadow-card-hover border border-gray-100 p-5 md:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Fact
            icon={<CalendarIcon size={18} className="text-green-700" />}
            label="Best season"
            value={destination.season}
          />
          <Fact
            icon={<WalletIcon size={18} className="text-green-700" />}
            label="From"
            value={`${formatINRCompact(destination.budgetFrom)} /person`}
          />
          <Fact
            icon={<CompassIcon size={18} className="text-green-700" />}
            label="Recommended"
            value={destination.recommendedDuration}
          />
          <Fact
            icon={<CloudSunIcon size={18} className="text-green-700" />}
            label="Weather"
            value={destination.temperature}
          />
        </div>
      </section>

      {/* Overview */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              The shape of a {destination.name} trip
            </h2>
            <p className="mt-4 text-gray-700 leading-relaxed text-lg">
              {destination.description}
            </p>

            {extras?.knownFor && (
              <div className="mt-6">
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                  Known for
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {extras.knownFor.map((k) => (
                    <li
                      key={k}
                      className="px-3 py-1 rounded-full bg-cream border border-gray-100 text-sm text-gray-700"
                    >
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extras?.travelTime && (
              <p className="mt-4 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">
                  Travel time:
                </span>{" "}
                {extras.travelTime}
              </p>
            )}
          </div>

          {/* Sidebar CTA */}
          <aside className="lg:sticky lg:top-20 self-start rounded-3xl overflow-hidden bg-gradient-to-br from-green-600 to-forest-950 text-white p-6">
            <SparklesIcon size={20} className="text-saffron-400" />
            <p className="mt-3 text-xs font-semibold tracking-widest uppercase text-white/70">
              {existing ? "Ready when you are" : "Get started"}
            </p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight">
              {existing
                ? `A trip to ${destination.name} is one click away`
                : `Build your custom ${destination.name} plan`}
            </h3>
            <p className="mt-2 text-sm text-white/85">
              {existing
                ? "We already have a fully-routed itinerary for this destination. Tweak any day with Sarthi AI."
                : "Tell Sarthi a few preferences and you'll have a day-by-day plan in minutes."}
            </p>
            <Link
              href={ctaHref}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-green-700 hover:bg-cream font-semibold transition-colors"
            >
              {ctaLabel}
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              href="/surprise"
              className="mt-2 block text-center text-xs text-white/80 hover:text-white underline underline-offset-2"
            >
              Or let me surprise you instead
            </Link>
          </aside>
        </div>
      </section>

      {/* Gallery */}
      {destination.gallery.length > 1 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-5">
            Gallery
          </h2>
          <DestinationGallery
            destinationName={destination.name}
            gallery={destination.gallery}
          />
        </section>
      )}

      {/* Top experiences */}
      {extras?.topExperiences && extras.topExperiences.length > 0 && (
        <section className="bg-white border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Top experiences
            </h2>
            <p className="mt-1 text-gray-500">
              The things people remember about {destination.name}.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {extras.topExperiences.map((e) => (
                <div
                  key={e.title}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-cream border border-gray-100"
                >
                  <span className="text-3xl shrink-0">{e.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{e.title}</p>
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                      {e.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best months */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          When to go
        </h2>
        <p className="mt-1 text-gray-500">
          Highlighted months are the best windows for{" "}
          <span className="font-semibold text-gray-700">{destination.name}</span>.
        </p>
        <div className="mt-5 grid grid-cols-6 md:grid-cols-12 gap-2">
          {ALL_MONTHS.map((m) => {
            const isBest = bestMonthsLower.includes(m.toLowerCase());
            return (
              <div
                key={m}
                className={`text-center py-3 rounded-xl font-semibold text-sm border-2 ${
                  isBest
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                {m}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sample itineraries */}
      {matchedItineraries.length > 0 && (
        <section className="bg-cream border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                  Sample itineraries
                </h2>
                <p className="mt-1 text-gray-500">
                  Real day-by-day plans built by Sarthi for {destination.name}.
                </p>
              </div>
              <Link
                href="/generate"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Or generate a custom one
                <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {matchedItineraries.map((it) => (
                <ItineraryCard
                  key={it.id}
                  itinerary={it}
                  variant="grid"
                  showFromBadge={false}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {extras?.faqs && extras.faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 md:px-8 py-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Frequently asked
          </h2>
          <p className="mt-1 text-gray-500">
            Everything we get asked before a {destination.name} trip.
          </p>
          <div className="mt-6">
            <DestinationFAQ faqs={extras.faqs} />
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
        <div className="rounded-3xl bg-forest-950 text-white p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Ready to {existing ? "see" : "plan"} {destination.name}?
            </h2>
            <p className="mt-2 text-white/80 max-w-xl">
              {existing
                ? "Open the ready-made itinerary, or let Sarthi build a custom version from scratch."
                : "Sarthi will build a day-by-day plan based on your group, budget, and dates."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold whitespace-nowrap"
            >
              {ctaLabel}
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid place-items-center w-10 h-10 rounded-full bg-green-50 shrink-0">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
