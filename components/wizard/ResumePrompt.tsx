"use client";

// components/wizard/ResumePrompt.tsx
// Banner that appears on top of a wizard when a saved draft exists. The
// wizard owns the draft logic; this component is presentational + emits
// "continue" / "discard" intents.

import {
  SparklesIcon,
  ArrowRightIcon,
  XIcon,
} from "@/components/ui/Icons";

interface Props {
  summary: string; // e.g. "Couple · Goa · ₹50k"
  step: number;
  totalSteps: number;
  savedAt: number; // epoch ms
  onContinue: () => void;
  onDiscard: () => void;
}

export default function ResumePrompt({
  summary,
  step,
  totalSteps,
  savedAt,
  onContinue,
  onDiscard,
}: Props) {
  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-saffron-50 to-saffron-100 border border-saffron-200 p-4 md:p-5 flex items-start gap-4 animate-slide-down">
      <span className="grid place-items-center w-10 h-10 rounded-full bg-white text-saffron-600 shrink-0">
        <SparklesIcon size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold tracking-widest text-saffron-700 uppercase">
          Continue where you left off · {formatRelative(savedAt)}
        </p>
        <p className="mt-1 text-base font-semibold text-gray-900 truncate">
          {summary || "Trip planning in progress"}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          Step {step} of {totalSteps} · we saved your answers locally
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-semibold transition-colors"
          >
            Continue
            <ArrowRightIcon size={14} />
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="text-sm font-semibold text-gray-600 hover:text-rose-600 underline underline-offset-2"
          >
            Start fresh
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDiscard}
        aria-label="Dismiss"
        className="grid place-items-center w-8 h-8 rounded-full text-gray-400 hover:bg-white/60 hover:text-gray-700 shrink-0"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}

function formatRelative(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return "yesterday";
}
