"use client";

// components/itinerary/TodayView.tsx
// Focused, mid-trip view of an itinerary. Computes "today's day" by diffing
// `now` against the user's saved start date for the trip (lib/useTripStartDate).
//
// Three phases the page handles:
//   1. No start date set → ask the user to pick one
//   2. Start date in the future → "Departing in N days" preview
//   3. Within trip → render today's plan + tomorrow's preview
//   4. Past the last day → completion summary

import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CloudSunIcon,
  CompassIcon,
  HeartIcon,
  MapPinIcon,
  SparklesIcon,
  SunriseIcon,
  SunsetIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import { useTripStartDate } from "@/lib/useTripStartDate";
import { useItineraryEdits } from "@/lib/useItineraryEdits";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { toast } from "@/lib/toast";
import type {
  Itinerary,
  ItineraryDay,
  RouteStop,
} from "@/lib/mockData";

// Tourist & emergency helplines, india-wide. The destination-specific add-ons
// in checklistData cover Inner Line permits etc; this strip is for the
// universal "I need help now" set.
const EMERGENCY_CONTACTS = [
  { label: "Police", number: "100" },
  { label: "Ambulance", number: "102" },
  { label: "Tourist helpline", number: "1363" },
  { label: "Women's helpline", number: "1091" },
];

interface Props {
  itinerary: Itinerary;
}

export default function TodayView({ itinerary }: Props) {
  const { startDate, setStartDate, hydrated } = useTripStartDate(itinerary.id);
  const { get } = useItineraryEdits(itinerary.id);

  // Compute today's index relative to the user's chosen start date.
  const phase = useMemo(() => computePhase(startDate, itinerary), [
    startDate,
    itinerary,
  ]);

  if (!hydrated) {
    return <TodaySkeleton />;
  }

  if (!startDate || !phase) {
    return (
      <NoStartDate
        itinerary={itinerary}
        onSet={(iso) => {
          setStartDate(iso);
          toast.success("Trip dates set.");
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6">
      <Header itinerary={itinerary} phase={phase} startDate={startDate} />

      {phase.kind === "upcoming" && (
        <UpcomingPanel itinerary={itinerary} phase={phase} get={get} />
      )}

      {phase.kind === "active" && (
        <>
          <TodayPanel
            day={phase.today}
            itinerary={itinerary}
            get={get}
            nextTransfer={phase.nextTransfer}
          />
          <EmergencyStrip />
          {phase.tomorrow && (
            <TomorrowPanel day={phase.tomorrow} get={get} />
          )}
        </>
      )}

      {phase.kind === "completed" && <CompletedPanel itinerary={itinerary} />}

      <ChangeDatesFooter
        startDate={startDate}
        onChange={(iso) => {
          setStartDate(iso);
          toast.info("Dates updated.");
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase computation
// ---------------------------------------------------------------------------

type Phase =
  | { kind: "upcoming"; daysAway: number; firstDay: ItineraryDay }
  | {
      kind: "active";
      todayIndex: number; // zero-based
      today: ItineraryDay;
      tomorrow: ItineraryDay | null;
      nextTransfer: RouteStop["transferToNext"] | null;
    }
  | { kind: "completed"; daysSinceEnd: number };

function computePhase(startDateIso: string, itinerary: Itinerary): Phase | null {
  if (!startDateIso) return null;
  const start = parseIso(startDateIso);
  if (!start) return null;
  const today = stripTime(new Date());
  const diffDays = Math.round(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const lastIndex = itinerary.days.length - 1;

  if (diffDays < 0) {
    return {
      kind: "upcoming",
      daysAway: -diffDays,
      firstDay: itinerary.days[0],
    };
  }

  if (diffDays > lastIndex) {
    return { kind: "completed", daysSinceEnd: diffDays - lastIndex };
  }

  const todayDay = itinerary.days[diffDays];
  const tomorrowDay =
    diffDays + 1 <= lastIndex ? itinerary.days[diffDays + 1] : null;

  // If tomorrow is in a different city, surface the transfer from the route.
  let nextTransfer: RouteStop["transferToNext"] | null = null;
  if (tomorrowDay && tomorrowDay.location !== todayDay.location) {
    const stop = itinerary.route.find((s) => s.city === todayDay.location);
    nextTransfer = stop?.transferToNext ?? null;
  }

  return {
    kind: "active",
    todayIndex: diffDays,
    today: todayDay,
    tomorrow: tomorrowDay,
    nextTransfer,
  };
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  itinerary,
  phase,
  startDate,
}: {
  itinerary: Itinerary;
  phase: Phase;
  startDate: string;
}) {
  const start = parseIso(startDate);
  const end = start
    ? new Date(start.getTime() + (itinerary.days.length - 1) * 86400000)
    : null;

  const statusLabel =
    phase.kind === "upcoming"
      ? `Departing in ${phase.daysAway} day${phase.daysAway !== 1 ? "s" : ""}`
      : phase.kind === "active"
        ? `Day ${phase.todayIndex + 1} of ${itinerary.days.length}`
        : "Trip complete";

  const statusColor =
    phase.kind === "active"
      ? "bg-green-600 text-white"
      : phase.kind === "upcoming"
        ? "bg-saffron-500 text-white"
        : "bg-gray-700 text-white";

  return (
    <header className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-card grid grid-cols-1 md:grid-cols-[200px_1fr]">
      <div className="relative h-32 md:h-full md:min-h-[160px]">
        <Image
          src={itinerary.image}
          alt={itinerary.title}
          fill
          sizes="200px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Live trip · {itinerary.title}
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Today
            </h1>
            {start && end && (
              <p className="text-sm text-gray-500 mt-1">
                {formatShort(start)} → {formatShort(end)}
              </p>
            )}
          </div>
          <span
            className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full ${statusColor}`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
          <Link
            href={`/itinerary/${itinerary.id}`}
            className="text-green-700 hover:text-green-800 font-semibold inline-flex items-center gap-1"
          >
            Full itinerary
            <ArrowRightIcon size={12} />
          </Link>
          <Link
            href={`/checklist/${itinerary.id}`}
            className="text-green-700 hover:text-green-800 font-semibold inline-flex items-center gap-1"
          >
            Checklist
            <ArrowRightIcon size={12} />
          </Link>
          <Link
            href={`/budget/${itinerary.id}`}
            className="text-green-700 hover:text-green-800 font-semibold inline-flex items-center gap-1"
          >
            Budget
            <ArrowRightIcon size={12} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Phase panels
// ---------------------------------------------------------------------------

function UpcomingPanel({
  itinerary,
  phase,
  get,
}: {
  itinerary: Itinerary;
  phase: Extract<Phase, { kind: "upcoming" }>;
  get: (day: number, slot: "morning" | "afternoon" | "evening", fallback: string) => string;
}) {
  const morning = get(1, "morning", phase.firstDay.morning);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-saffron-50 to-saffron-100 border border-saffron-200 p-6 text-center">
        <p className="text-6xl font-bold tracking-tight text-saffron-700">
          {phase.daysAway}
        </p>
        <p className="mt-1 text-sm font-semibold text-saffron-800">
          day{phase.daysAway !== 1 ? "s" : ""} to go
        </p>
        <p className="mt-2 text-xs text-gray-600">
          Day 1 lands in {itinerary.days[0].location}
        </p>
        <Link
          href={`/checklist/${itinerary.id}`}
          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold"
        >
          Open trip checklist
          <ArrowRightIcon size={14} />
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-5">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Sneak peek · Day 1 morning
        </p>
        <p className="mt-2 text-base text-gray-800 leading-relaxed">
          {morning}
        </p>
      </div>
    </div>
  );
}

function TodayPanel({
  day,
  itinerary,
  get,
  nextTransfer,
}: {
  day: ItineraryDay;
  itinerary: Itinerary;
  get: (d: number, s: "morning" | "afternoon" | "evening", fb: string) => string;
  nextTransfer: RouteStop["transferToNext"] | null;
}) {
  const morning = get(day.dayNumber, "morning", day.morning);
  const afternoon = get(day.dayNumber, "afternoon", day.afternoon);
  const evening = get(day.dayNumber, "evening", day.evening);

  return (
    <section className="rounded-3xl bg-white border border-gray-100 shadow-card overflow-hidden">
      {/* Top strip — location + weather */}
      <div className="px-5 py-4 bg-green-50 border-b border-green-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="inline-flex items-center gap-2 font-semibold text-green-900">
          <MapPinIcon size={16} />
          {day.location}
          <span className="text-xs font-normal text-green-700 ml-2">
            {day.type}
          </span>
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <CloudSunIcon size={16} className="text-saffron-600" />
          {itinerary.weather}
        </span>
      </div>

      {/* Slots */}
      <ul className="divide-y divide-gray-100">
        <Slot
          icon={<SunriseIcon size={16} className="text-saffron-500" />}
          label="Morning"
          text={morning}
        />
        <Slot
          icon={<SunsetIcon size={16} className="text-saffron-600" />}
          label="Afternoon"
          text={afternoon}
        />
        <Slot
          icon={<SparklesIcon size={16} className="text-violet-500" />}
          label="Evening"
          text={evening}
        />
      </ul>

      {/* Next transfer cue */}
      {nextTransfer && (
        <div className="px-5 py-4 bg-cream border-t border-gray-100 flex items-start gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-white text-gray-700 shrink-0 border border-gray-200">
            <CompassIcon size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Tomorrow&apos;s transfer
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {nextTransfer.label}
            </p>
            <p className="text-xs text-gray-500">
              {nextTransfer.duration} · {capitalize(nextTransfer.mode)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function TomorrowPanel({
  day,
  get,
}: {
  day: ItineraryDay;
  get: (d: number, s: "morning" | "afternoon" | "evening", fb: string) => string;
}) {
  const morning = get(day.dayNumber, "morning", day.morning);
  return (
    <section className="rounded-2xl bg-white border border-gray-100 shadow-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Tomorrow · Day {day.dayNumber} · {day.location}
        </p>
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Preview
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-700 leading-relaxed">{morning}</p>
    </section>
  );
}

function CompletedPanel({ itinerary }: { itinerary: Itinerary }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-8 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-white text-green-700">
        <HeartIcon size={28} />
      </span>
      <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Welcome back!
      </h2>
      <p className="mt-2 text-gray-700">
        Hope your {itinerary.title} trip was unforgettable. Plan another?
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href={`/itinerary/${itinerary.id}`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border-2 border-gray-200 text-gray-800 text-sm font-semibold hover:border-gray-300"
        >
          Relive the plan
        </Link>
        <Link
          href="/generate"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
        >
          Plan next trip
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Slot({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <li className="px-5 py-4 flex items-start gap-3">
      <span className="grid place-items-center w-9 h-9 rounded-full bg-saffron-50 shrink-0 mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          {label}
        </p>
        <p className="mt-1 text-sm md:text-[15px] text-gray-800 leading-relaxed">
          {text}
        </p>
      </div>
    </li>
  );
}

function EmergencyStrip() {
  return (
    <section
      aria-label="Emergency contacts"
      className="rounded-2xl bg-rose-50 border border-rose-200 p-4"
    >
      <p className="text-xs font-semibold tracking-widest text-rose-700 uppercase">
        Emergency · India-wide
      </p>
      <ul className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        {EMERGENCY_CONTACTS.map((c) => (
          <li key={c.label}>
            <a
              href={`tel:${c.number}`}
              className="block px-3 py-2 rounded-xl bg-white border border-rose-200 text-center hover:bg-rose-100 transition-colors"
            >
              <p className="text-[10px] font-semibold tracking-widest text-rose-700 uppercase">
                {c.label}
              </p>
              <p className="text-base font-bold text-gray-900 tabular-nums">
                {c.number}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Empty / setup state
// ---------------------------------------------------------------------------

function NoStartDate({
  itinerary,
  onSet,
}: {
  itinerary: Itinerary;
  onSet: (iso: string) => void;
}) {
  const [draft, setDraft] = useState<string>(() => {
    const d = new Date();
    return toIso(d);
  });

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-saffron-50 text-saffron-600">
        <CalendarIcon size={28} />
      </span>
      <h1 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        Set your trip dates
      </h1>
      <p className="mt-3 text-gray-600">
        Once we know when Day 1 begins, Today mode shows exactly where you
        should be — and what&apos;s next.
      </p>
      <div className="mt-7 max-w-xs mx-auto">
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-center"
        />
        <button
          type="button"
          onClick={() => onSet(draft)}
          disabled={!draft}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold"
        >
          Start Today mode
          <ArrowRightIcon size={14} />
        </button>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        {itinerary.days.length} days · Saved on this device only — no account
        needed.
      </p>
    </div>
  );
}

function ChangeDatesFooter({
  startDate,
  onChange,
}: {
  startDate: string;
  onChange: (iso: string) => void;
}) {
  const [draft, setDraft] = useState(startDate);
  const [editing, setEditing] = useState(false);
  return (
    <footer className="rounded-2xl bg-cream border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        <WalletIcon size={12} className="inline mr-1.5 text-gray-400" />
        Day 1 set to{" "}
        <span className="font-semibold text-gray-700">
          {formatShort(parseIso(startDate) ?? new Date())}
        </span>
      </p>
      {!editing ? (
        <button
          type="button"
          onClick={() => {
            setDraft(startDate);
            setEditing(true);
          }}
          className="text-xs font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
        >
          Change dates
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              setEditing(false);
            }}
            className="px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-1.5 text-xs text-gray-500"
          >
            Cancel
          </button>
        </div>
      )}
    </footer>
  );
}

function TodaySkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-4">
      <div className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="h-72 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
