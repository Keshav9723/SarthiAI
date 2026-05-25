"use client";

// components/ui/DateRangePicker.tsx
// Self-contained calendar range picker. No external dep.
//
// Behaviour:
//   - First click selects the start, clears any previous end.
//   - Second click selects the end (auto-swaps if user picked earlier date).
//   - Third click starts a fresh range.
//   - Hovering between start and (no end yet) previews the range.
//   - Dates earlier than `minDate` (default = today) are disabled.
//
// Renders a single month on mobile, two side-by-side on md+.
// Inputs/outputs use ISO yyyy-mm-dd strings so consumers can swap in HTML
// `<input type="date">` interchangeably.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";

interface Props {
  startDate: string; // yyyy-mm-dd or empty
  endDate: string;
  onChange: (start: string, end: string) => void;
  /** Inclusive minimum date the user can pick. Defaults to today. */
  minDate?: Date;
  /** Inclusive maximum. */
  maxDate?: Date;
  /** When set, after a start date is picked the picker only allows end
   *  dates that produce a night count within [minNights, maxNights]. Used
   *  by the Surprise wizard to lock the calendar to the chosen duration. */
  nightsRange?: { minNights: number; maxNights: number };
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Cell {
  date: Date;
  inMonth: boolean;
}

function buildMonthGrid(view: Date): Cell[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startWeekday = first.getDay();
  const startDate = new Date(first);
  startDate.setDate(first.getDate() - startWeekday);

  // 6 weeks × 7 days = 42 cells (covers any month layout)
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    cells.push({ date, inMonth: date.getMonth() === view.getMonth() });
  }
  return cells;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  nightsRange,
}: Props) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  const [viewMonth, setViewMonth] = useState<Date>(() =>
    start ? new Date(start.getFullYear(), start.getMonth(), 1) : new Date()
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const min = useMemo(() => stripTime(minDate ?? new Date()), [minDate]);
  const max = useMemo(() => (maxDate ? stripTime(maxDate) : null), [maxDate]);

  function handlePick(date: Date) {
    const picked = stripTime(date);
    // If no start yet, or both start and end exist (= start a fresh range), set start.
    if (!start || (start && end)) {
      onChange(toISO(picked), "");
      return;
    }
    // We have a start but no end — set end, swapping if user picked earlier.
    if (picked < start) {
      onChange(toISO(picked), toISO(start));
    } else if (sameDay(picked, start)) {
      // Pick same date twice — treat as single-day trip.
      onChange(toISO(start), toISO(start));
    } else {
      onChange(toISO(start), toISO(picked));
    }
  }

  function isInRange(d: Date): boolean {
    if (!start) return false;
    const rangeEnd = end ?? hoverDate;
    if (!rangeEnd) return false;
    const a = stripTime(start);
    const b = stripTime(rangeEnd);
    const t = stripTime(d).getTime();
    const lo = Math.min(a.getTime(), b.getTime());
    const hi = Math.max(a.getTime(), b.getTime());
    return t >= lo && t <= hi;
  }

  function isDisabled(d: Date): boolean {
    if (d < min) return true;
    if (max && d > max) return true;
    // Lock the end-date pick to the allowed nights window when a start has
    // been chosen and we're constrained by a Surprise-Me duration option.
    if (nightsRange && start && !end) {
      const startStripped = stripTime(start);
      const cand = stripTime(d);
      // Don't disable the start date itself (so the user can re-click it).
      if (sameDay(cand, startStripped)) return false;
      const dayDiff = Math.round(
        (cand.getTime() - startStripped.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Only forward selection inside this mode; otherwise both bounds.
      if (dayDiff < nightsRange.minNights) return true;
      if (dayDiff > nightsRange.maxNights) return true;
    }
    return false;
  }

  function renderMonth(view: Date) {
    const cells = buildMonthGrid(view);
    return (
      <div className="min-w-0">
        <p className="text-center font-semibold text-gray-900 mb-3">
          {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
        </p>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell, i) => {
            const { date, inMonth } = cell;
            const disabled = isDisabled(date);
            // Range / pill styling must NEVER apply to out-of-month cells —
            // the 42-cell grid overflows into next/prev months, and without
            // this guard the start/end pill bleeds into the wrong calendar.
            const isStart = inMonth && !!start && sameDay(date, start);
            const isEnd = inMonth && !!end && sameDay(date, end);
            const inRange = inMonth && isInRange(date);
            // Round only the edge of the highlighted range.
            const isRangeStart =
              inRange && start && sameDay(date, start);
            const isRangeEnd =
              inRange && (end ? sameDay(date, end) : hoverDate && sameDay(date, hoverDate));

            return (
              <button
                key={i}
                type="button"
                disabled={disabled || !inMonth}
                onClick={() => handlePick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() =>
                  setHoverDate((curr) => (curr === date ? null : curr))
                }
                aria-label={date.toDateString()}
                aria-pressed={isStart || isEnd}
                className={`h-9 text-sm font-medium transition-colors relative ${
                  !inMonth
                    ? "text-transparent pointer-events-none"
                    : disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-800 hover:bg-gray-100"
                } ${
                  isStart || isEnd
                    ? "bg-green-600 text-white hover:bg-green-700 z-10"
                    : inRange
                      ? "bg-green-50 text-green-700"
                      : ""
                } ${
                  isRangeStart ? "rounded-l-full" : ""
                } ${isRangeEnd ? "rounded-r-full" : ""} ${
                  isStart && isEnd ? "rounded-full" : ""
                } ${
                  isStart && !isEnd ? "rounded-l-full" : ""
                } ${
                  isEnd && !isStart ? "rounded-r-full" : ""
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function clear() {
    onChange("", "");
  }

  // ---- Quick-pick presets ----
  // Filter presets to ones whose nights fit the active duration constraint
  // (so "weekend" mode doesn't show a 10-day "In a month" chip).
  const presets = useMemo(() => {
    const all = buildPresets();
    if (!nightsRange) return all;
    return all.filter((p) => {
      const nights = p.days - 1;
      return nights >= nightsRange.minNights && nights <= nightsRange.maxNights;
    });
  }, [nightsRange]);
  function applyPreset(p: { start: Date; end: Date }) {
    onChange(toISO(p.start), toISO(p.end));
    setViewMonth(new Date(p.start.getFullYear(), p.start.getMonth(), 1));
  }

  // ---- Wheel / trackpad month scroll ----
  // React's onWheel handler is registered as passive, so e.preventDefault()
  // is a no-op there. We have to attach a native non-passive listener via
  // ref + useEffect to actually capture the wheel and stop the page from
  // scrolling. We accumulate deltaY across small wheel events and step one
  // month per ~60px, throttled to a max of one tick / 120 ms.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef(0);
  const accumRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(this: HTMLDivElement, e: WheelEvent) {
      // Always swallow — we're claiming wheel scroll over the calendar.
      e.preventDefault();
      const now = Date.now();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      accumRef.current += delta;
      if (now - lastTickRef.current < 120) return;
      if (Math.abs(accumRef.current) < 60) return;

      const dir = accumRef.current > 0 ? 1 : -1;
      setViewMonth((m) => addMonths(m, dir));
      accumRef.current = 0;
      lastTickRef.current = now;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---- Touch swipe for mobile ----
  const touchStartXRef = useRef<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const startX = touchStartXRef.current;
    if (startX == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX;
    if (Math.abs(dx) > 50) {
      // Swipe right (positive dx) = previous month, left = next
      setViewMonth((m) => addMonths(m, dx > 0 ? -1 : 1));
    }
    touchStartXRef.current = null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
      {/* ----- Presets bar (hidden when the active duration constraint
            filters every preset out — keeps the empty section from showing) ----- */}
      <div className={`px-5 pt-5 pb-3 border-b border-gray-100 ${presets.length === 0 ? "hidden" : ""}`}>
        <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-2">
          Quick pick
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                start && end && sameDay(start, p.start) && sameDay(end, p.end)
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {p.label}
              <span className="ml-1.5 text-gray-400 font-normal">
                {p.days}d
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-5">
        {/* Header with month nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
            className="grid place-items-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Pick your dates
          </p>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="grid place-items-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>

        {/* One month on mobile, two on md+ (equal-width grid columns so
            the second month doesn't squish). Wheel/touch swipe to navigate. */}
        <div
          ref={scrollRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {renderMonth(viewMonth)}
          <div className="hidden md:block min-w-0">
            {renderMonth(addMonths(viewMonth, 1))}
          </div>
        </div>
        <p className="hidden md:block text-[10px] text-gray-400 mt-2 text-center">
          Scroll or swipe to change months
        </p>

        {/* Footer summary + clear */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-700 flex-1 min-w-0">
            {start && end ? (
              <div>
                <p>
                  <span className="font-semibold">{formatPretty(start)}</span>
                  <span className="text-gray-400 mx-1.5">→</span>
                  <span className="font-semibold">{formatPretty(end)}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tripLength(start, end)}
                </p>
              </div>
            ) : start ? (
              <p>
                <span className="font-semibold">{formatPretty(start)}</span>
                <span className="text-gray-400 ml-2">— pick an end date</span>
              </p>
            ) : (
              <p className="text-gray-500">Tap a quick-pick or click a start date.</p>
            )}
          </div>
          {(start || end) && (
            <button
              type="button"
              onClick={clear}
              className="text-sm font-semibold text-gray-500 hover:text-rose-600 underline underline-offset-2 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-pick preset ranges, computed from "today"
// ---------------------------------------------------------------------------

interface Preset {
  label: string;
  start: Date;
  end: Date;
  days: number;
}

function buildPresets(): Preset[] {
  const today = stripTime(new Date());
  const dow = today.getDay(); // 0 = Sunday … 6 = Saturday
  // Days until next Friday (long weekend kickoff)
  const daysToFriday = (5 - dow + 7) % 7 || 7;
  const nextFri = new Date(today);
  nextFri.setDate(today.getDate() + daysToFriday);
  const nextSun = new Date(nextFri);
  nextSun.setDate(nextFri.getDate() + 2);

  const nextMon = new Date(today);
  nextMon.setDate(today.getDate() + ((1 - dow + 7) % 7 || 7));
  const nextFri2 = new Date(nextMon);
  nextFri2.setDate(nextMon.getDate() + 4);

  // 2 weeks out, 7-night trip
  const twoWeeks = new Date(today);
  twoWeeks.setDate(today.getDate() + 14);
  const twoWeeksEnd = new Date(twoWeeks);
  twoWeeksEnd.setDate(twoWeeks.getDate() + 6);

  // 1 month out, 10-night trip
  const oneMonth = new Date(today);
  oneMonth.setDate(today.getDate() + 30);
  const oneMonthEnd = new Date(oneMonth);
  oneMonthEnd.setDate(oneMonth.getDate() + 9);

  return [
    { label: "This weekend", start: nextFri, end: nextSun, days: 3 },
    { label: "Next week",    start: nextMon, end: nextFri2, days: 5 },
    { label: "In 2 weeks",   start: twoWeeks, end: twoWeeksEnd, days: 7 },
    { label: "In a month",   start: oneMonth, end: oneMonthEnd, days: 10 },
  ];
}

function formatPretty(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tripLength(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  const nights = days - 1;
  return `${nights} nights / ${days} days`;
}
