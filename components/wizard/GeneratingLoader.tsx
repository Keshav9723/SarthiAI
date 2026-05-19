"use client";

// components/wizard/GeneratingLoader.tsx
// Full-screen "generating..." overlay used at the end of both wizards.
// Cycles through status lines while a spinning compass rotates in the centre.

import { useEffect, useState } from "react";
import { CompassIcon } from "@/components/ui/Icons";

interface Props {
  lines: string[];
  /** Total duration in ms before onDone fires. Ignored when `indeterminate` is true. */
  durationMs?: number;
  /** When true, cycle the status lines indefinitely (does NOT auto-call onDone).
   *  Use when waiting on a real API — let the parent decide when to call onDone. */
  indeterminate?: boolean;
  /** Override the heading. Defaults to "Generating your itinerary…". */
  title?: string;
  onDone?: () => void;
}

export default function GeneratingLoader({
  lines,
  durationMs = 2000,
  indeterminate = false,
  title,
  onDone,
}: Props) {
  const [index, setIndex] = useState(0);

  // Rotate through the status lines so the user sees progress.
  useEffect(() => {
    if (lines.length === 0) return;
    // In indeterminate mode, we have no idea how long the real API will take.
    // Cycle every 4 sec so the user sees movement; clamp at the last line so
    // we don't loop back to the start awkwardly.
    const each = indeterminate
      ? 4000
      : Math.max(400, Math.floor(durationMs / lines.length));
    const id = window.setInterval(() => {
      setIndex((i) => Math.min(lines.length - 1, i + 1));
    }, each);

    let timeout: number | null = null;
    if (!indeterminate && onDone) {
      timeout = window.setTimeout(onDone, durationMs);
    }
    return () => {
      window.clearInterval(id);
      if (timeout != null) window.clearTimeout(timeout);
    };
  }, [durationMs, lines.length, indeterminate, onDone]);

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-cream px-4">
      <div className="text-center max-w-md">
        <span className="relative inline-grid place-items-center w-24 h-24 rounded-full bg-white shadow-card-hover">
          <span className="absolute inset-0 rounded-full ring-2 ring-green-200 animate-pulse-ring" />
          <CompassIcon
            size={56}
            strokeWidth={2}
            className="text-green-600 animate-compass-spin"
          />
        </span>
        <h2 className="mt-8 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          {title ?? "Generating your itinerary…"}
        </h2>
        <p className="mt-3 text-base text-gray-600 min-h-[1.75rem] transition-all">
          {lines[index] ?? lines[lines.length - 1]}
        </p>
        <div className="mt-6 flex items-center justify-center gap-1">
          {lines.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= index ? "w-8 bg-green-600" : "w-3 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
