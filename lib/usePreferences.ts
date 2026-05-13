"use client";

// lib/usePreferences.ts
// Travel-default preferences kept in localStorage under `sarthi_prefs`.
// Used by the Profile page and pre-fills the Generate wizard the first time.
//
// Stored separately from the User object so we can let guests set
// preferences without forcing a sign-up.

import { useEffect, useState } from "react";
import type { GroupType } from "./mockData";

export type DietaryPreference =
  | "none"
  | "vegetarian"
  | "vegan"
  | "jain"
  | "halal";

export type HotelTier = "budget" | "comfort" | "premium" | "luxury";

export interface Preferences {
  preferredGroup?: GroupType;
  hotelTier?: HotelTier;
  dietary?: DietaryPreference;
  fromCity?: string;
  notes?: string;
}

const KEY = "sarthi_prefs";
const EVENT = "sarthi:prefs";

function readPrefs(): Preferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Preferences;
    return {};
  } catch {
    return {};
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
    const onChange = () => setPrefs(readPrefs());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  function update(patch: Partial<Preferences>) {
    const next = { ...readPrefs(), ...patch };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }

  function clear() {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  }

  return { prefs, update, clear, hydrated };
}
