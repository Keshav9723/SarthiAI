"use client";

// lib/useChecklist.ts
// Per-itinerary pre-departure checklist. Signed-in users get DB sync so
// checks follow them across devices; guests stay on localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";

const KEY = "sarthi_checklist";
const EVENT = "sarthi:checklist";

interface State {
  // Map of itineraryId → array of checked item ids.
  [itineraryId: string]: string[];
}

function readState(): State {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as State;
    }
    return {};
  } catch {
    return {};
  }
}

function writeState(state: State) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT));
}

export function useChecklist(itineraryId: string) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const { user, hydrated: authHydrated } = useAuth();
  const lastSyncedRef = useRef<string | null>(null);

  // Local hydrate + cross-tab listener.
  useEffect(() => {
    const state = readState();
    setChecked(new Set(state[itineraryId] ?? []));
    setHydrated(true);
    function onChange() {
      const s = readState();
      setChecked(new Set(s[itineraryId] ?? []));
    }
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, [itineraryId]);

  // Pull DB list on sign-in + push any local-only items up. Mock template
  // ids like "3" can't be persisted server-side (uuid column rejects them),
  // so skip the sync entirely — they stay localStorage-only.
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
        const res = await fetch(`/api/checklist/${itineraryId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote: string[] = data.checked ?? [];
        const state = readState();
        const local = state[itineraryId] ?? [];

        // Union (server wins for membership — anything checked anywhere stays checked).
        const merged = Array.from(new Set([...remote, ...local]));
        const localOnly = merged.length !== remote.length
          || !merged.every((m) => remote.includes(m));
        if (localOnly) {
          await fetch(`/api/checklist/${itineraryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checked: merged }),
          });
        }
        writeState({ ...state, [itineraryId]: merged });
      } catch {
        // Network failure: stay on local values.
      }
    })();
  }, [authHydrated, user, itineraryId]);

  // Helper that persists the new list to localStorage + (if signed in) DB.
  const persist = useCallback(
    (next: string[]) => {
      const state = readState();
      writeState({ ...state, [itineraryId]: next });
      if (user && isUuid(itineraryId)) {
        fetch(`/api/checklist/${itineraryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checked: next }),
        }).catch(() => {});
      }
    },
    [itineraryId, user]
  );

  const toggle = useCallback(
    (id: string) => {
      const state = readState();
      const list = new Set(state[itineraryId] ?? []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      persist(Array.from(list));
    },
    [itineraryId, persist]
  );

  const reset = useCallback(() => {
    persist([]);
  }, [persist]);

  return { checked, toggle, reset, hydrated };
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
