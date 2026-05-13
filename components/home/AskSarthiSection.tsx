"use client";

// components/home/AskSarthiSection.tsx
// Dark "spotlight" section. Sits between Why-Sarthi stats and Packages.
// The forest-950 backdrop with saffron + green radial glows makes the AI
// chat preview pop visually — this is the differentiator vs MakeMyTrip /
// PickYourTrail, so we want it to be the most striking section on the page.
//
// Clicking a sample prompt dispatches `sarthi:open-chat` with a prompt
// payload — the global ChatWidget catches it, slides in, then auto-sends.

import {
  CompassIcon,
  SparklesIcon,
  ArrowRightIcon,
  SendIcon,
} from "@/components/ui/Icons";

const SAMPLE_PROMPTS = [
  "I have ₹40k and 5 days, where should I go?",
  "Best cold places to visit in May?",
  "Plan a vegetarian-friendly Rajasthan trip",
  "How accurate are the budget estimates?",
];

const FEATURE_BULLETS = [
  "Natural language — no forms, no clicking through menus",
  "Knows IRCTC quirks, monsoon windows, and permit rules",
  "Edits any day of your plan in seconds",
];

export default function AskSarthiSection() {
  function ask(prompt: string) {
    window.dispatchEvent(
      new CustomEvent("sarthi:open-chat", { detail: { prompt } })
    );
  }

  return (
    <section className="relative overflow-hidden bg-forest-950 text-white">
      {/* Decorative glows — large blurred coloured circles for ambient depth.
          aria-hidden because they're purely cosmetic. */}
      <span
        aria-hidden
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-saffron-500/15 blur-3xl"
      />
      <span
        aria-hidden
        className="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full bg-green-500/15 blur-3xl"
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]"
      />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-[10px] font-semibold tracking-widest uppercase text-white/90">
              <SparklesIcon size={12} className="text-saffron-400" />
              AI Travel Assistant
            </span>
            <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              Talk to an AI that
              <br />
              <span className="bg-gradient-to-r from-saffron-300 via-saffron-400 to-green-300 bg-clip-text text-transparent">
                actually knows India
              </span>
            </h2>
            <p className="mt-5 text-white/80 text-base md:text-lg leading-relaxed max-w-xl">
              Sarthi isn&apos;t just a planner. Ask it natural-language
              questions about your trip, budget, or anywhere in India — and
              it&apos;ll answer in seconds.
            </p>

            <ul className="mt-7 space-y-3">
              {FEATURE_BULLETS.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-sm md:text-base text-white/85"
                >
                  <span className="mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-saffron-500 text-white shrink-0">
                    <SparklesIcon size={11} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-saffron-300 uppercase">
              Tap a question to try it
              <ArrowRightIcon size={12} />
            </div>
          </div>

          {/* Right — chat preview card */}
          <div className="relative">
            {/* Subtle floating glow behind the card */}
            <span
              aria-hidden
              className="absolute -inset-4 bg-gradient-to-br from-saffron-500/20 to-green-500/20 blur-2xl rounded-3xl"
            />

            <div className="relative bg-white rounded-3xl shadow-chat overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-br from-forest-950 to-green-700 text-white flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-full bg-white/15">
                  <CompassIcon size={20} strokeWidth={2} />
                </span>
                <div className="flex-1">
                  <p className="font-semibold tracking-tight flex items-center gap-1.5">
                    Sarthi AI
                    <SparklesIcon size={14} className="text-saffron-400" />
                  </p>
                  <p className="text-xs text-white/70 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    Online · usually replies instantly
                  </p>
                </div>
              </div>

              {/* Conversation preview */}
              <div className="p-5 bg-cream">
                <div className="flex gap-2 justify-start">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-forest-950 text-white">
                    <CompassIcon size={14} strokeWidth={2} />
                  </span>
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white text-sm text-gray-800 border border-gray-100 shadow-sm">
                    Hi! Try one of these and I&apos;ll answer instantly:
                  </div>
                </div>

                {/* Clickable prompts */}
                <div className="mt-4 space-y-2">
                  {SAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => ask(p)}
                      className="group w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all"
                    >
                      <span className="text-sm text-gray-800 group-hover:text-green-900">
                        {p}
                      </span>
                      <ArrowRightIcon
                        size={16}
                        className="text-gray-400 group-hover:text-green-700 group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Fake input bar — visually mimics the real chat input so the
                  preview feels complete, but it's non-interactive on purpose. */}
              <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <div className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full text-gray-400">
                  Type your own question…
                </div>
                <span
                  aria-hidden
                  className="grid place-items-center w-10 h-10 rounded-full bg-green-600 text-white"
                >
                  <SendIcon size={18} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
