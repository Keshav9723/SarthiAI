"use client";

// lib/useTripStartDate.ts
// Per-itinerary start date the user explicitly sets. Used by:
//   - the .ics calendar export (where Day 1 begins)
//   - the Live "Today" view (computes today's day index against this)
//
// Stored as `sarthi_trip_starts: { [itineraryId]: "yyyy-mm-dd" }` so it's
// trivially serializable and survives refresh.

import { useCallback, useEffect, useState } from "react";

const KEY = "sarthi_trip_starts";
const EVENT = "sarthi:trip-starts";

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeAll(state: Record<string, string>) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

export function useTripStartDate(itineraryId: string) {
  const [startDate, setStartDateState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStartDateState(readAll()[itineraryId] ?? "");
    setHydrated(true);
    function onChange() {
      setStartDateState(readAll()[itineraryId] ?? "");
    }
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, [itineraryId]);

  const setStartDate = useCallback(
    (iso: string) => {
      const all = readAll();
      if (iso) all[itineraryId] = iso;
      else delete all[itineraryId];
      writeAll(all);
    },
    [itineraryId]
  );

  const clear = useCallback(() => setStartDate(""), [setStartDate]);

  return { startDate, setStartDate, clear, hydrated };
}
