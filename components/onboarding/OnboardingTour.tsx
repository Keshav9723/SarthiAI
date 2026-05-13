"use client";

// components/onboarding/OnboardingTour.tsx
// Lightweight first-visit walkthrough. Renders a centered modal with stepped
// content (no DOM-spotlighting overlay — kept simple to avoid coupling to
// specific layouts). Stores completion in localStorage so it never repeats.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CompassIcon,
  DiceIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  XIcon,
  SearchIcon,
  HeartIcon,
} from "@/components/ui/Icons";

const KEY = "sarthi_onboarded";

interface Step {
  emoji: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  hint?: string;
}

const STEPS: Step[] = [
  {
    emoji: "🧭",
    Icon: CompassIcon,
    title: "Welcome to Sarthi",
    body:
      "An AI travel planner built for India. We'll help you plan day-by-day itineraries, track budgets, and discover destinations.",
    hint: "Takes about 30 seconds.",
  },
  {
    emoji: "✨",
    Icon: SparklesIcon,
    title: "Generate or Surprise",
    body:
      "Know where you want to go? Generate a custom itinerary. Not sure? Hit Surprise Me and we'll pick 5 perfect matches.",
    cta: { label: "Try Generate", href: "/generate" },
  },
  {
    emoji: "🔍",
    Icon: SearchIcon,
    title: "Search anything",
    body:
      "Press ⌘ K (or / on Windows) anywhere to search destinations, trips, and articles in seconds.",
  },
  {
    emoji: "🤖",
    Icon: DiceIcon,
    title: "Ask Sarthi anytime",
    body:
      "Tap the green compass bottom-right on any page. The chatbot knows the page you're on and can edit your itinerary in plain English.",
  },
  {
    emoji: "❤️",
    Icon: HeartIcon,
    title: "Save what catches your eye",
    body:
      "Tap the heart on any destination or trip to save it to your wishlist for later.",
    cta: { label: "Explore destinations", href: "/explore" },
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  // Check localStorage on mount — first-visit users get the tour, repeat
  // visitors do not.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = window.localStorage.getItem(KEY);
      if (!done) {
        // Small delay so the homepage hero renders first and the modal feels
        // like an addition, not a gate.
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // Ignore — if localStorage isn't available we just won't show the tour.
    }
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" && step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else if (e.key === "ArrowLeft" && step > 0) {
        setStep((s) => s - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function finish() {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm animate-fade-in grid place-items-center px-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-card-hover overflow-hidden animate-slide-up">
        {/* Decorative header */}
        <div className="relative h-32 bg-gradient-to-br from-forest-950 via-green-700 to-saffron-500 flex items-center justify-center">
          <span className="text-6xl">{current.emoji}</span>
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {current.title}
          </h2>
          <p className="mt-2 text-gray-700 leading-relaxed">
            {current.body}
          </p>
          {current.hint && (
            <p className="mt-3 text-xs text-gray-500 inline-flex items-center gap-1.5">
              <SparklesIcon size={12} className="text-saffron-500" />
              {current.hint}
            </p>
          )}
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={finish}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              {current.cta.label}
              <ArrowRightIcon size={14} />
            </Link>
          )}

          {/* Step dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-green-600" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer nav */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon size={16} />
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Get started
              <ArrowRightIcon size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Next
              <ArrowRightIcon size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
