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

import { useMemo, useState } from "react";
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
    return false;
  }

  function renderMonth(view: Date) {
    const cells = buildMonthGrid(view);
    return (
      <div className="flex-1 min-w-0">
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
            const isStart = !!start && sameDay(date, start);
            const isEnd = !!end && sameDay(date, end);
            const inRange = isInRange(date);
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
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

      {/* One month on mobile, two on md+ */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {renderMonth(viewMonth)}
        <div className="hidden md:block">{renderMonth(addMonths(viewMonth, 1))}</div>
      </div>

      {/* Footer summary + clear */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-700">
          {start && end ? (
            <>
              <span className="font-semibold">{formatPretty(start)}</span>
              <span className="text-gray-400 mx-1.5">→</span>
              <span className="font-semibold">{formatPretty(end)}</span>
              <span className="text-gray-500 ml-2">
                · {tripLength(start, end)}
              </span>
            </>
          ) : start ? (
            <>
              <span className="font-semibold">{formatPretty(start)}</span>
              <span className="text-gray-400 ml-2">— pick an end date</span>
            </>
          ) : (
            <span className="text-gray-500">Click a start date to begin.</span>
          )}
        </p>
        {(start || end) && (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
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
