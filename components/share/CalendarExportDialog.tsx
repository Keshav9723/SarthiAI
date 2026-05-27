"use client";

// components/share/CalendarExportDialog.tsx
// Small modal triggered from ShareMenu → "Add to calendar". Asks for a trip
// start date, previews the date range, then generates and downloads an .ics
// file the user can import into Google / Apple / Outlook.
//
// Reuses the saved trip start date (lib/useTripStartDate) so the Today view
// and the calendar export stay in sync.

import { useEffect, useMemo, useState } from "react";
import { useTripStartDate } from "@/lib/useTripStartDate";
import { buildItineraryIcs } from "@/lib/buildIcs";
import { toast } from "@/lib/toast";
import type { Itinerary } from "@/lib/mockData";
import {
  XIcon,
  CalendarIcon,
  DownloadIcon,
} from "@/components/ui/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  itinerary: Itinerary;
}

export default function CalendarExportDialog({
  open,
  onClose,
  itinerary,
}: Props) {
  const { startDate, setStartDate, hydrated } = useTripStartDate(itinerary.id);
  const [draftStart, setDraftStart] = useState<string>("");
  const [persistChoice, setPersistChoice] = useState(true);

  // Initialise the draft date when the dialog opens. Prefer the user's saved
  // date, otherwise default to today + 14 days as a sensible "next time you
  // travel" placeholder.
  useEffect(() => {
    if (!open) return;
    if (startDate) {
      setDraftStart(startDate);
      return;
    }
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    setDraftStart(toIso(fallback));
  }, [open, startDate]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const preview = useMemo(() => {
    if (!draftStart) return null;
    const start = parseIso(draftStart);
    if (!start) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + itinerary.days.length - 1);
    return { start, end };
  }, [draftStart, itinerary.days.length]);

  function handleDownload() {
    if (!preview) {
      toast.error("Pick a start date first.");
      return;
    }
    if (persistChoice) {
      setStartDate(draftStart);
    }
    const { filename, content } = buildItineraryIcs({
      itinerary,
      startDate: preview.start,
    });
    triggerDownload(filename, content);
    toast.success("Calendar file downloaded.");
    onClose();
  }

  if (!open || !hydrated) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add itinerary to calendar"
      className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm grid place-items-center px-4 animate-fade-in print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-card-hover overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-green-50 text-green-700 shrink-0">
            <CalendarIcon size={20} />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Add to calendar</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              We&apos;ll generate one all-day event per day in your trip.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-forest-800 text-gray-500 dark:text-gray-300"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Day 1 starts on
            </span>
            <input
              type="date"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
              min={toIso(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))}
              className="mt-1.5 w-full px-4 py-3 bg-cream border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
            />
          </label>

          {preview && (
            <div className="rounded-2xl bg-cream border border-gray-100 p-4">
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Preview
              </p>
              <p className="mt-1 text-sm text-gray-800">
                <strong>{itinerary.days.length}</strong> events from{" "}
                <strong>{formatPretty(preview.start)}</strong> to{" "}
                <strong>{formatPretty(preview.end)}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                One event per day with location, type, and Morning / Afternoon /
                Evening notes.
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={persistChoice}
              onChange={(e) => setPersistChoice(e.target.checked)}
              className="mt-0.5 rounded text-green-600 focus:ring-green-500"
            />
            Remember these dates for the &ldquo;Today&rdquo; view too
          </label>
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!preview}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            <DownloadIcon size={14} />
            Download .ics
          </button>
        </div>

        <p className="px-5 pb-4 text-[11px] text-gray-400 leading-relaxed">
          Works with Google Calendar, Apple Calendar, Outlook, and any
          standards-compliant calendar app.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatPretty(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Hint mail clients (some interpret webcal:// for subscriptions).
  a.setAttribute("type", "text/calendar");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
