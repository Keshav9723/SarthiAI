// components/home/HowItWorksSection.tsx
// Replaces the "Recently Generated" rail. Quick 3-step explainer so a first-
// time visitor understands the Sarthi flow without having to start the wizard
// to figure it out.

import Link from "next/link";
import {
  SearchIcon,
  SparklesIcon,
  CompassIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

const STEPS = [
  {
    Icon: SearchIcon,
    title: "Tell us your trip",
    body:
      "Pick where you're going, who's coming, your budget and dates. Two minutes — or hit Surprise Me and we'll pick a destination for you.",
    accent: "bg-saffron-50 text-saffron-600",
  },
  {
    Icon: SparklesIcon,
    title: "Sarthi builds your plan",
    body:
      "AI generates a day-by-day itinerary grounded in real weather, live flight prices, and India-specific local knowledge. No template copy-paste.",
    accent: "bg-green-50 text-green-700",
  },
  {
    Icon: CompassIcon,
    title: "Refine, then travel",
    body:
      "Edit any day in plain English, track your budget, tick off the pack list, and use Today mode while you're on the road. We're with you start to finish.",
    accent: "bg-violet-50 text-violet-700",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            How it works
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            From &ldquo;where should we go?&rdquo; to &ldquo;we&apos;re packed&rdquo;
          </h2>
          <p className="mt-2 text-gray-500 max-w-xl">
            Three quiet steps. No travel-agent calls, no spreadsheets, no
            commission games.
          </p>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold whitespace-nowrap self-start"
        >
          Start planning
          <ArrowRightIcon size={14} />
        </Link>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 relative">
        {/* Dashed connector line — visible only on md+ between the cards. */}
        <span
          aria-hidden
          className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px border-t border-dashed border-gray-200"
        />

        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="relative rounded-2xl bg-white border border-gray-100 shadow-card p-6 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                Step {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div
              className={`relative grid place-items-center w-12 h-12 rounded-2xl ${step.accent}`}
            >
              <step.Icon size={22} strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-gray-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
