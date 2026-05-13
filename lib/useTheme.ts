"use client";

// lib/useTheme.ts
// Theme = "light" | "dark" | "system". System follows the prefers-color-scheme
// media query. Stored as `sarthi_theme` in localStorage.

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const KEY = "sarthi_theme";
const EVENT = "sarthi:theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const effective =
    theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", effective === "dark");
  document.documentElement.style.colorScheme = effective;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readTheme();
    setThemeState(initial);
    applyTheme(initial);
    setHydrated(true);

    function onChange() {
      const next = readTheme();
      setThemeState(next);
      applyTheme(next);
    }
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);

    // React to OS-level theme changes when we're on "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onMQ() {
      if (readTheme() === "system") applyTheme("system");
    }
    if (mq.addEventListener) mq.addEventListener("change", onMQ);
    else mq.addListener(onMQ);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
      if (mq.removeEventListener) mq.removeEventListener("change", onMQ);
      else mq.removeListener(onMQ);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const effective: "light" | "dark" =
    theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;

  return { theme, setTheme, effective, hydrated };
}
