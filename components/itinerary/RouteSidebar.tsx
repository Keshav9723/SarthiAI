"use client";

// components/itinerary/RouteSidebar.tsx
// Sticky right rail on the itinerary page: Edit-with-Sarthi CTA, Save toggle,
// Your Route timeline, weather badge, budget summary.

import Link from "next/link";
import { useState } from "react";
import {
  CompassIcon,
  HeartIcon,
  PlusIcon,
  TrainIcon,
  PlaneIcon,
  CarIcon,
  CloudSunIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import {
  formatINR,
  type Itinerary,
} from "@/lib/mockData";
import { toast } from "@/lib/toast";
import ShareMenu from "@/components/share/ShareMenu";
import CalendarExportDialog from "@/components/share/CalendarExportDialog";
import { useItineraryEdits } from "@/lib/useItineraryEdits";

interface Props {
  itinerary: Itinerary;
}

const TRANSFER_ICON = {
  train: TrainIcon,
  flight: PlaneIcon,
  car: CarIcon,
  bus: CarIcon,
} as const;

export default function RouteSidebar({ itinerary }: Props) {
  const [saved, setSaved] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { hasAny, resetAll } = useItineraryEdits(itinerary.id);

  function handleResetEdits() {
    if (!window.confirm("Reset all your inline edits on this itinerary?"))
      return;
    resetAll();
    toast.info("All edits reverted to the AI-generated plan.");
  }

  function handleSave() {
    setSaved((s) => !s);
    toast.success(saved ? "Removed from saved" : "Itinerary saved!");
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      {/* Edit + Save + Share */}
      <div className="space-y-2 print:hidden">
        <button
          type="button"
          onClick={() => {
            // Tell the global ChatWidget (mounted in AppChrome) to open. The
            // widget listens for the `sarthi:open-chat` event and slides in.
            window.dispatchEvent(new CustomEvent("sarthi:open-chat"));
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors focus-ring"
        >
          <CompassIcon size={18} strokeWidth={2} />
          Edit Itinerary with Sarthi
        </button>
        <button
          type="button"
          onClick={handleSave}
          aria-pressed={saved}
          className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold border-2 transition-colors focus-ring ${
            saved
              ? "border-rose-500 text-rose-600 bg-rose-50"
              : "border-gray-200 text-gray-800 hover:border-gray-300"
          }`}
        >
          <HeartIcon size={18} />
          {saved ? "Saved" : "Save Itinerary"}
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

      {/* Your Route */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-5">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Your Route
        </p>
        <ol className="mt-4 space-y-1.5">
          {itinerary.route.map((stop, i) => {
            const Icon = stop.transferToNext
              ? TRANSFER_ICON[stop.transferToNext.mode]
              : null;
            return (
              <li key={`${stop.city}-${i}`}>
                <div className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-forest-950 text-white text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{stop.city}</p>
                    <p className="text-xs text-gray-500">
                      {stop.nights} Night{stop.nights !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {Icon && stop.transferToNext && (
                  <div className="ml-3 pl-1 mt-1 mb-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="grid place-items-center w-5 h-5 rounded-full bg-gray-100 text-gray-600">
                      <Icon size={12} />
                    </span>
                    <span className="capitalize">{stop.transferToNext.mode}</span>
                    <span>· {stop.transferToNext.duration}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() =>
            toast.info("Add a city — coming next. Ask Sarthi to insert one for now.")
          }
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 border-2 border-dashed border-green-200 hover:border-green-400 rounded-xl py-2.5 transition-colors"
        >
          <PlusIcon size={16} />
          Add City
        </button>
      </div>

      {/* Weather */}
      <div className="rounded-2xl bg-cream border border-gray-100 p-5 flex items-start gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-full bg-saffron-50 text-saffron-600 shrink-0">
          <CloudSunIcon size={22} />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Weather Forecast
          </p>
          <p className="mt-1 font-semibold text-gray-900">{itinerary.weather}</p>
          <p className="text-xs text-gray-500 mt-1">
            Based on average conditions for this region.
          </p>
        </div>
      </div>

      {/* Live trip: Today view */}
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

      {/* Checklist link */}
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

      {/* Budget summary */}
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
  // Prepend a metadata row so the file is self-describing when opened cold.
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
  // Escape per RFC-4180 — wrap in quotes if the cell has comma, quote, or newline.
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
