"use client";

// lib/useTripStartDate.ts
// Per-itinerary start date the user explicitly sets. Used by:
//   - the .ics calendar export (where Day 1 begins)
//   - the Live "Today" view (computes today's day index against this)
//
// Signed-in users get DB sync via /api/trip-start-date/[itineraryId].
// Guests stay on localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

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
  const { user, hydrated: authHydrated } = useAuth();
  const lastSyncedRef = useRef<string | null>(null);

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

  // Hydrate from DB on sign-in. Skip mock templates whose ids aren't uuids —
  // the API would 500 trying to query a uuid column with a string like "3".
  useEffect(() => {
    if (!authHydrated || !user || !itineraryId) {
      lastSyncedRef.current = null;
      return;
    }
    if (!isUuid(itineraryId)) return;
    const syncKey = `${user.email}:${itineraryId}`;
    if (lastSyncedRef.current === syncKey) return;
    lastSyncedRef.current = syncKey;

    (async () => {
      try {
        const res = await fetch(`/api/trip-start-date/${itineraryId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote: string | null = data.startDate ?? null;
        const all = readAll();
        const local = all[itineraryId] ?? "";

        if (remote && !local) {
          all[itineraryId] = remote;
          writeAll(all);
        } else if (local && !remote) {
          await fetch(`/api/trip-start-date/${itineraryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startDate: local }),
          });
        } else if (remote && local && remote !== local) {
          // Both set + different — server wins (more recent intent is usually
          // there since DB persists across devices).
          all[itineraryId] = remote;
          writeAll(all);
        }
      } catch {
        // Network failure: stay on local.
      }
    })();
  }, [authHydrated, user, itineraryId]);

  const setStartDate = useCallback(
    (iso: string) => {
      const all = readAll();
      if (iso) all[itineraryId] = iso;
      else delete all[itineraryId];
      writeAll(all);
      if (user && isUuid(itineraryId)) {
        if (iso) {
          fetch(`/api/trip-start-date/${itineraryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startDate: iso }),
          }).catch(() => {});
        } else {
          fetch(`/api/trip-start-date/${itineraryId}`, { method: "DELETE" }).catch(() => {});
        }
      }
    },
    [itineraryId, user]
  );

  const clear = useCallback(() => setStartDate(""), [setStartDate]);

  return { startDate, setStartDate, clear, hydrated };
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
