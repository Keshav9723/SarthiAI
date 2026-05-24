"use client";

// components/itinerary/RouteSidebar.tsx
// Sticky right rail on the itinerary page. Order is chosen for scroll context
// — actions on top, then big-picture (budget, route timeline, weather),
// then in-the-moment helpers (today view, pre-departure checklist) at the
// bottom where they're useful as the trip approaches.

import Link from "next/link";
import { useState } from "react";
import {
  CompassIcon,
  PlusIcon,
  TrainIcon,
  PlaneIcon,
  CarIcon,
  CloudSunIcon,
  WalletIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import {
  formatINR,
  type Itinerary,
} from "@/lib/mockData";
import { toast } from "@/lib/toast";
import { confirmDialog } from "@/lib/confirm";
import ShareMenu from "@/components/share/ShareMenu";
import SaveTemplateButton from "./SaveTemplateButton";
import CalendarExportDialog from "@/components/share/CalendarExportDialog";
import { useItineraryEdits } from "@/lib/useItineraryEdits";

export interface SeasonalWeather {
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
}

interface Props {
  itinerary: Itinerary;
  /** Real seasonal climate stats — drives the Weather card content. */
  weather?: SeasonalWeather | null;
  /** When true, this is a curated template — show a Save Trip CTA at the
      top of the rail so users can copy it into their own collection. */
  isTemplate?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TRANSFER_ICON = {
  train: TrainIcon,
  flight: PlaneIcon,
  car: CarIcon,
  bus: CarIcon,
} as const;

const TRANSFER_LABEL = {
  train: "by train",
  flight: "by flight",
  car: "by car",
  bus: "by bus",
} as const;

export default function RouteSidebar({ itinerary, weather, isTemplate = false }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { hasAny, resetAll } = useItineraryEdits(itinerary.id);

  async function handleResetEdits() {
    const ok = await confirmDialog({
      title: "Reset all edits?",
      message: "Reset every inline edit on this itinerary back to the AI-generated plan. Your text changes will be lost.",
      confirmLabel: "Reset",
      cancelLabel: "Keep edits",
      destructive: true,
    });
    if (!ok) return;
    resetAll();
    toast.info("All edits reverted to the AI-generated plan.");
  }

  const stops = itinerary.route.filter((s) => s.nights > 0);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      {/* 1 — Action buttons (always on top) */}
      <div className="space-y-2 print:hidden">
        {/* Save Trip — only visible on template (read-only) itineraries.
            User-owned trips are already in their collection, no save needed. */}
        {isTemplate && (
          <SaveTemplateButton
            templateId={itinerary.id}
            templateTitle={itinerary.title}
          />
        )}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("sarthi:open-chat"))}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors focus-ring"
        >
          <CompassIcon size={18} strokeWidth={2} />
          Edit Itinerary with Sarthi
        </button>
        <ShareMenu
          title={itinerary.title}
          summary={`${itinerary.duration} · ${itinerary.destination} · ${formatINR(itinerary.pricePerPerson)}/person`}
          csvData={() => buildItineraryCSV(itinerary)}
          onAddToCalendar={() => setCalendarOpen(true)}
        />
        <CalendarExportDialog
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          itinerary={itinerary}
        />
        {hasAny && (
          <button
            type="button"
            onClick={handleResetEdits}
            className="w-full text-center text-xs font-semibold text-gray-500 hover:text-rose-600 underline underline-offset-2"
          >
            Reset all inline edits
          </button>
        )}
      </div>

      {/* 2 — Total budget (key number, surfaced high) */}
      <Link
        href={`/budget/${itinerary.id}`}
        className="block rounded-2xl bg-forest-950 text-white p-5 hover:bg-forest-900 transition-colors print:hidden"
      >
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-white/60 uppercase">
          <WalletIcon size={14} />
          Total Budget
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          {formatINR(itinerary.totalBudget)}
        </p>
        <p className="mt-0.5 text-sm text-white/70">
          {formatINR(itinerary.pricePerPerson)} / person · {itinerary.groupSize}{" "}
          travellers
        </p>
        <p className="mt-3 text-xs text-saffron-400 font-semibold">
          Open budget tracker →
        </p>
      </Link>

      {/* 3 — Your Route (vertical timeline) */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-5">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Your Route
        </p>

        <ol className="mt-4 relative">
          {/* Arrival cap — small flight/transfer marker before the first stop */}
          {itinerary.fromCity && (
            <li className="relative pl-8 pb-3">
              <span className="absolute left-0 top-1 grid place-items-center w-6 h-6 rounded-full border-2 border-gray-200 bg-white text-gray-500">
                <PlaneIcon size={11} />
              </span>
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Arrival
              </p>
              <p className="text-sm text-gray-700">
                from {itinerary.fromCity}
              </p>
            </li>
          )}

          {/* Stops + transfer connectors */}
          {stops.map((stop, i) => {
            const isLast = i === stops.length - 1;
            const Icon = stop.transferToNext
              ? TRANSFER_ICON[stop.transferToNext.mode]
              : null;
            return (
              <li key={`${stop.city}-${i}`} className="relative pl-8">
                {/* Vertical connecting line — drawn behind the dot */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[11px] top-7 bottom-0 w-px border-l-2 border-dashed border-gray-200"
                  />
                )}
                {/* Stop marker dot */}
                <span className="absolute left-0 top-1 grid place-items-center w-6 h-6 rounded-full bg-forest-950 text-white text-[10px] font-bold">
                  {i + 1}
                </span>

                <p className="font-semibold text-gray-900 leading-tight">
                  {stop.city}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stop.nights} Night{stop.nights !== 1 ? "s" : ""}
                </p>

                {/* Transfer connector to next stop */}
                {Icon && stop.transferToNext && !isLast && (
                  <div className="mt-3 mb-4 -ml-8 pl-8 relative">
                    <span className="absolute left-[-1px] top-1.5 grid place-items-center w-6 h-6 rounded-full border-2 border-dashed border-gray-200 bg-cream text-gray-500">
                      <Icon size={11} />
                    </span>
                    <p className="text-[11px] font-medium text-gray-500 leading-tight">
                      Transfer {TRANSFER_LABEL[stop.transferToNext.mode]}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {stop.transferToNext.duration}
                    </p>
                  </div>
                )}
              </li>
            );
          })}

          {/* Departure cap */}
          {itinerary.fromCity && (
            <li className="relative pl-8 pt-3">
              <span className="absolute left-0 top-4 grid place-items-center w-6 h-6 rounded-full border-2 border-gray-200 bg-white text-gray-500">
                <PlaneIcon size={11} />
              </span>
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                Departure
              </p>
              <p className="text-sm text-gray-700">
                back to {itinerary.fromCity}
              </p>
            </li>
          )}
        </ol>

        <button
          type="button"
          onClick={() =>
            toast.info("Add a city — coming next. Ask Sarthi to insert one for now.")
          }
          className="mt-5 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 border-2 border-dashed border-green-200 hover:border-green-400 rounded-xl py-2.5 transition-colors"
        >
          <PlusIcon size={16} />
          Add City
        </button>
      </div>

      {/* 4 — Travel tips */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-5">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-green-50 text-green-700">
            <SparklesIcon size={14} />
          </span>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Travel tips
          </p>
        </div>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-700">
          {tipsForTrip(itinerary).map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="text-saffron-500 mt-0.5">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5 — Weather (real climate data when available) */}
      <div className="rounded-2xl bg-cream border border-gray-100 p-5 flex items-start gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-full bg-saffron-50 text-saffron-600 shrink-0">
          <CloudSunIcon size={22} />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Weather Forecast
          </p>
          {weather && weather.avg_temp_c != null ? (
            <>
              <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 leading-none">
                {Math.round(weather.avg_temp_c)}°C
                <span className="ml-2 text-xs font-semibold text-gray-500 align-middle">
                  avg in {MONTHS[(((new Date().getMonth() + 1) % 12)) ]}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                {weather.rain_mm != null && (
                  <span>{Math.round(weather.rain_mm)}mm rain</span>
                )}
                <span>·</span>
                <span>Comfort {weather.score}/100</span>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 font-semibold text-gray-900">
                {itinerary.weather || "Pleasant"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on average conditions for this region.
              </p>
            </>
          )}
        </div>
      </div>

      {/* 6 — Pre-departure + mid-trip (live trip helpers, lowest priority) */}
      <Link
        href={`/checklist/${itinerary.id}`}
        className="block rounded-2xl bg-saffron-50 border border-saffron-100 p-5 hover:bg-saffron-100 transition-colors print:hidden"
      >
        <p className="text-xs font-semibold tracking-widest text-saffron-700 uppercase">
          Pre-departure
        </p>
        <p className="mt-1 font-semibold text-gray-900">
          Trip checklist
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Documents, money, connectivity, packing — tuned for your destination.
        </p>
        <p className="mt-3 text-xs text-saffron-700 font-semibold">
          Open checklist →
        </p>
      </Link>

      <Link
        href={`/itinerary/${itinerary.id}/today`}
        className="block rounded-2xl bg-gradient-to-br from-green-600 to-forest-950 text-white p-5 hover:from-green-700 transition-colors print:hidden"
      >
        <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
          Mid-trip mode
        </p>
        <p className="mt-1 font-semibold">Open Today view</p>
        <p className="mt-1 text-xs text-white/80">
          Just today + tomorrow, with weather and emergency numbers at a glance.
        </p>
        <p className="mt-3 text-xs text-saffron-400 font-semibold">
          Start Today mode →
        </p>
      </Link>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// CSV export — flat day-by-day rows suitable for Excel / Sheets
// ---------------------------------------------------------------------------

function buildItineraryCSV(it: Itinerary) {
  const rows: string[][] = [
    ["Day", "Type", "Location", "Morning", "Afternoon", "Evening"],
    ...it.days.map((d) => [
      String(d.dayNumber),
      d.type,
      d.location,
      d.morning,
      d.afternoon,
      d.evening,
    ]),
  ];
  const header = [
    [`# Sarthi · ${it.title}`],
    [`# ${it.duration} · ${it.groupSize} travellers · ${formatINR(it.pricePerPerson)}/person`],
    [],
  ];
  const csv = [...header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  return {
    filename: `sarthi-${slugify(it.title)}.csv`,
    csv,
  };
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Travel tips — destination-aware, India-relevant
// ---------------------------------------------------------------------------

function tipsForTrip(it: Itinerary): string[] {
  const tips: string[] = [];
  const state = (it.state || "").toLowerCase();
  const dest = (it.destination || "").toLowerCase();
  const cities = it.route.map((r) => r.city.toLowerCase()).join(" ");
  const haystack = `${state} ${dest} ${cities}`;

  if (/himachal|ladakh|leh|spiti|uttarakhand|sikkim|arunachal|kashmir|nubra|kullu|manali/.test(haystack)) {
    tips.push("Acclimatise for a day before climbing higher — altitude sickness is real above 3,000 m.");
    tips.push("Carry layered clothing; mountain nights drop sharply even in summer.");
  }
  if (/goa|kerala|andaman|pondicherry|gokarna|varkala|alibaug/.test(haystack)) {
    tips.push("Reef-safe sunscreen + a quick-dry towel make a big difference at the coast.");
    tips.push("Beach shacks shut earlier than you'd expect — finish dinner by 10:30 PM.");
  }
  if (/rajasthan|jaisalmer|bikaner|jodhpur|thar/.test(haystack)) {
    tips.push("Cover head, neck and ankles during daytime — Rajasthan sun is intense year-round.");
    tips.push("Bargain at markets — first quote is usually 2-3× the fair price.");
  }
  if (/varanasi|haridwar|rishikesh|tirupati|amritsar|bodhgaya|pushkar/.test(haystack)) {
    tips.push("Modest clothing covering shoulders and knees is expected inside temples and ghats.");
    tips.push("Photography is restricted in many sanctums — look for signs before clicking.");
  }
  if (/jim corbett|kanha|bandhavgarh|ranthambore|kaziranga|sundarbans|periyar/.test(haystack)) {
    tips.push("Book safari slots online ahead of arrival — gate quotas sell out quickly.");
    tips.push("Wear earth-toned clothing; bright colours startle wildlife.");
  }
  tips.push("Keep ₹500-1000 in small notes for cabs, snacks, and tips; UPI works almost everywhere too.");
  tips.push("Carry an Indian eSIM or local SIM — most booking confirmations need OTPs to an Indian number.");

  return tips.slice(0, 5);
}
