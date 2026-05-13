"use client";

// lib/useAuth.ts
// Reads the mock user from localStorage and re-renders if it changes. Used by
// the Navbar (login button vs avatar) and any auth-gated page like /my-itineraries.
//
// Login/logout fire a `sarthi:auth` event so consumers update without a refresh.

import { useEffect, useState } from "react";
import type { User } from "./mockData";

const STORAGE_KEY = "sarthi_user";
const EVENT = "sarthi:auth";

function readUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as User).name === "string" &&
      typeof (parsed as User).email === "string"
    ) {
      return parsed as User;
    }
    // Stale or malformed entry — clean it up so we don't keep crashing.
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useAuth() {
  // Always start with null on first render to match SSR and avoid hydration mismatch.
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setHydrated(true);

    const onChange = () => setUser(readUser());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  function login(next: User) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT));
  }

  return { user, login, logout, hydrated };
}
