"use client";

// components/layout/ThemeToggle.tsx
// 3-way toggle (light / system / dark) styled as a small segmented control.
// Used in the navbar account dropdown.
//
// Also exports ThemeIconToggle — a single-button cycle (light → dark → system
// → light…) for the navbar when the user isn't signed in.

import { useTheme, type Theme } from "@/lib/useTheme";

const OPTIONS: { id: Theme; label: string; icon: string }[] = [
  { id: "light", label: "Light", icon: "☀️" },
  { id: "system", label: "Auto", icon: "🖥️" },
  { id: "dark", label: "Dark", icon: "🌙" },
];

export default function ThemeToggle() {
  const { theme, setTheme, hydrated } = useTheme();
  if (!hydrated) return <div className="h-9" aria-hidden />;

  return (
    <div className="px-3 pt-2 pb-1">
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        Theme
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-1.5 flex p-0.5 rounded-full bg-gray-100 dark:bg-forest-800 border border-gray-200 dark:border-forest-700 w-full"
      >
        {OPTIONS.map((o) => {
          const selected = theme === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(o.id)}
              title={o.label}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selected
                  ? "bg-white dark:bg-forest-900 text-green-700 dark:text-green-400 shadow-card"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span aria-hidden className="text-[11px] leading-none">
                {o.icon}
              </span>
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CYCLE: Theme[] = ["light", "dark", "system"];

export function ThemeIconToggle() {
  const { theme, setTheme, hydrated } = useTheme();
  if (!hydrated) {
    return <div className="w-10 h-10" aria-hidden />;
  }
  const current = OPTIONS.find((o) => o.id === theme);
  function cycle() {
    const i = CYCLE.indexOf(theme);
    setTheme(CYCLE[(i + 1) % CYCLE.length]);
  }
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${current?.label ?? "Auto"} — tap to change`}
      title={`Theme: ${current?.label ?? "Auto"}`}
      className="grid place-items-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-forest-800 transition-colors text-gray-700 dark:text-gray-200 focus-ring text-base"
    >
      <span aria-hidden>{current?.icon ?? "🖥️"}</span>
    </button>
  );
}
