"use client";

// lib/usePreferences.ts
// Travel-default preferences. Behaviour depends on auth state:
//   • Signed-out user → read/write localStorage (`sarthi_prefs`) only.
//   • Signed-in user  → read/write Supabase `user_preferences` table via
//     /api/preferences. We also mirror to localStorage so the UI is instant
//     and survives a refresh while the network call is in flight.
//
// On sign-in, any guest-mode localStorage prefs are merged INTO the DB row
// (DB wins for keys that exist on both sides — server is source of truth).

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
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

function readLocal(): Preferences {
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

function writeLocal(p: Preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(EVENT));
}

function clearLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [hydrated, setHydrated] = useState(false);
  const { user, hydrated: authHydrated } = useAuth();
  // Track the latest user id we've synced for, so the effect doesn't refetch
  // on every render once the user object reference changes but the id is the
  // same.
  const lastSyncedUserId = useRef<string | null>(null);

  // Hydrate from localStorage immediately so the UI isn't blank.
  useEffect(() => {
    setPrefs(readLocal());
    setHydrated(true);
    const onChange = () => setPrefs(readLocal());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  // When the user signs in, pull the DB row + merge with any guest-mode
  // localStorage entries, then write the merge back so DB is canonical.
  useEffect(() => {
    if (!authHydrated) return;
    if (!user) {
      lastSyncedUserId.current = null;
      return;
    }
    if (lastSyncedUserId.current === user.email) return;
    lastSyncedUserId.current = user.email;

    (async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remote: Preferences = data.preferences ?? {};
        const local = readLocal();
        // DB wins for any key set on both sides; local fills in keys the
        // user set as a guest but never persisted to the server.
        const merged: Preferences = { ...local, ...remote };
        // If local had anything the server didn't, push it back.
        const hasLocalOnly = Object.keys(local).some(
          (k) => (remote as Record<string, unknown>)[k] === undefined
            && (local as Record<string, unknown>)[k] !== undefined
        );
        if (hasLocalOnly) {
          await fetch("/api/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(merged),
          });
        }
        writeLocal(merged);
        setPrefs(merged);
      } catch {
        // Network failure: just stay on localStorage values.
      }
    })();
  }, [authHydrated, user]);

  const update = useCallback(
    (patch: Partial<Preferences>) => {
      const next = { ...readLocal(), ...patch };
      writeLocal(next);
      // Fire-and-forget DB write when signed in.
      if (user) {
        fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        }).catch(() => {
          // Silent: the localStorage write succeeded, user sees the change.
        });
      }
    },
    [user]
  );

  const clear = useCallback(() => {
    clearLocal();
    if (user) {
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  }, [user]);

  return { prefs, update, clear, hydrated };
}
