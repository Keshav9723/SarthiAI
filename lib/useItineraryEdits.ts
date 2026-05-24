"use client";

// lib/useItineraryEdits.ts
// Per-itinerary inline-edit overrides for morning / afternoon / evening
// slots. Local-first for instant UI; signed-in users get DB sync via
// /api/itinerary-edits/[itineraryId] so edits follow them across devices.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

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
  const { user, hydrated: authHydrated } = useAuth();
  const lastSyncedRef = useRef<string | null>(null);

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

  // Sync DB ↔ local on sign-in. Skip when the itinerary id isn't a UUID —
  // that means it's a mock template ("1", "2", "3", …) whose state lives
  // only in localStorage. Calling the API with a non-UUID id 500s on the
  // server (Postgres rejects bad uuid casts).
  useEffect(() => {
    if (!authHydrated || !user || !itineraryId) {
      lastSyncedRef.current = null;
      return;
    }
    if (!isUuid(itineraryId)) return;
    const syncKey = `${user.id}:${itineraryId}`;
    if (lastSyncedRef.current === syncKey) return;
    lastSyncedRef.current = syncKey;

    (async () => {
      try {
        const res = await fetch(`/api/itinerary-edits/${itineraryId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote: Record<string, string> = data.edits ?? {};
        const all = readAll();
        const local = all[itineraryId] ?? {};

        // Server wins for any slot present on both sides — keeps the
        // "latest server intent" canonical. Local fills in any slot the
        // user edited as a guest.
        const merged: Record<string, string> = { ...local, ...remote };
        const localOnly = Object.keys(local).some((k) => !(k in remote));
        if (localOnly) {
          await fetch(`/api/itinerary-edits/${itineraryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edits: merged }),
          });
        }
        writeAll({ ...all, [itineraryId]: merged });
      } catch {
        // Network failure: stay local.
      }
    })();
  }, [authHydrated, user, itineraryId]);

  const persist = useCallback(
    (next: Record<string, string>) => {
      const all = readAll();
      writeAll({ ...all, [itineraryId]: next });
      if (user && isUuid(itineraryId)) {
        fetch(`/api/itinerary-edits/${itineraryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edits: next }),
        }).catch(() => {});
      }
    },
    [itineraryId, user]
  );

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
      persist(next);
    },
    [itineraryId, persist]
  );

  const clearEdit = useCallback(
    (day: number, slot: Slot) => {
      const all = readAll();
      const next = { ...(all[itineraryId] ?? {}) };
      delete next[`${day}:${slot}`];
      persist(next);
    },
    [itineraryId, persist]
  );

  const resetAll = useCallback(() => {
    persist({});
    if (user && isUuid(itineraryId)) {
      fetch(`/api/itinerary-edits/${itineraryId}`, { method: "DELETE" }).catch(() => {});
    }
  }, [itineraryId, persist, user]);

  const hasAny = Object.keys(edits).length > 0;

  return { get, setEdit, clearEdit, resetAll, hasAny, hydrated };
}

// Mock templates have string ids like "1", "2" — only real Supabase rows are
// uuids and only those can be PUT to the API.
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
