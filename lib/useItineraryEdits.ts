"use client";

// lib/useItineraryEdits.ts
// Lets users tweak a generated itinerary inline. Edits are stored in
// localStorage keyed by itinerary id + day number + slot, so they survive
// refreshes without needing a backend. When the real Supabase wiring lands,
// this hook becomes the local-cache layer.

import { useCallback, useEffect, useState } from "react";

export type Slot = "morning" | "afternoon" | "evening";

const KEY = "sarthi_itinerary_edits";
const EVENT = "sarthi:itinerary-edits";

type ItineraryEdits = Record<
  string, // itineraryId
  Record<string, string> // `${day}:${slot}` → edited text
>;

function readAll(): ItineraryEdits {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ItineraryEdits;
    }
    return {};
  } catch {
    return {};
  }
}

function writeAll(state: ItineraryEdits) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

export function useItineraryEdits(itineraryId: string) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = readAll();
    setEdits(all[itineraryId] ?? {});
    setHydrated(true);
    function onChange() {
      const all = readAll();
      setEdits(all[itineraryId] ?? {});
    }
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, [itineraryId]);

  const get = useCallback(
    (day: number, slot: Slot, fallback: string) => {
      return edits[`${day}:${slot}`] ?? fallback;
    },
    [edits]
  );

  const setEdit = useCallback(
    (day: number, slot: Slot, text: string) => {
      const all = readAll();
      const next = { ...(all[itineraryId] ?? {}) };
      next[`${day}:${slot}`] = text;
      writeAll({ ...all, [itineraryId]: next });
    },
    [itineraryId]
  );

  const clearEdit = useCallback(
    (day: number, slot: Slot) => {
      const all = readAll();
      const next = { ...(all[itineraryId] ?? {}) };
      delete next[`${day}:${slot}`];
      writeAll({ ...all, [itineraryId]: next });
    },
    [itineraryId]
  );

  const resetAll = useCallback(() => {
    const all = readAll();
    delete all[itineraryId];
    writeAll(all);
  }, [itineraryId]);

  const hasAny = Object.keys(edits).length > 0;

  return { get, setEdit, clearEdit, resetAll, hasAny, hydrated };
}
