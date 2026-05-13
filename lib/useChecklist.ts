"use client";

// lib/useChecklist.ts
// Per-itinerary pre-departure checklist. Each itinerary gets its own keyed
// store so a Goa trip and a Ladakh trip don't share check state.

import { useCallback, useEffect, useState } from "react";

const KEY = "sarthi_checklist";
const EVENT = "sarthi:checklist";

interface State {
  // Map of itineraryId → set of checked item ids.
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

  const toggle = useCallback(
    (id: string) => {
      const state = readState();
      const list = new Set(state[itineraryId] ?? []);
      if (list.has(id)) list.delete(id);
      else list.add(id);
      writeState({ ...state, [itineraryId]: Array.from(list) });
    },
    [itineraryId]
  );

  const reset = useCallback(() => {
    const state = readState();
    writeState({ ...state, [itineraryId]: [] });
  }, [itineraryId]);

  return { checked, toggle, reset, hydrated };
}
