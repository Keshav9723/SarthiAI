"use client";

// components/home/HomeFAQSection.tsx
// Compact 4-question accordion of the highest-frequency pre-purchase Qs.
// Linked to the full /faq page for everything else. Kept local to the
// homepage (rather than reusing FAQAccordion) so we don't render category
// headers — we want a single uncategorized list here.

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

interface QA {
  q: string;
  a: string;
}

const TOP_FAQS: QA[] = [
  {
    q: "Is Sarthi free?",
    a: "Free forever for the core planner, AI chat, and budget tracker. We don't take commissions on bookings or hide premium tiers behind a paywall.",
  },
  {
    q: "Do I need an account to plan a trip?",
    a: "No — you can use Generate, Surprise Me, and the budget tracker without signing up. An account lets us save itineraries across devices and remember your preferences.",
  },
  {
    q: "How accurate are the prices?",
    a: "Prices come from live Amadeus + OpenWeatherMap data with a 10% buffer. They include flights, hotels, food, intercity transport, and activities — they exclude home-city flights, travel insurance, and personal shopping.",
  },
  {
    q: "Does Sarthi book my flights and hotels?",
    a: "Not yet. We surface live availability and link out to the carrier or hotel. In-app booking is on the roadmap once we clear the regulatory paperwork.",
  },
];

export default function HomeFAQSection() {
  // Single-open accordion. -1 means all closed.
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="bg-white">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Common questions
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Quick answers
        </h2>
        <p className="mt-2 text-gray-500">
          Everything new travellers ask before they start planning.
        </p>
      </div>

      <ul className="divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-card">
        {TOP_FAQS.map((f, i) => {
          const isOpen = openIndex === i;
          return (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 group focus-ring rounded-2xl"
              >
                <span className="font-semibold text-gray-900">{f.q}</span>
                <ChevronDownIcon
                  size={18}
                  className={`text-gray-500 shrink-0 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed -mt-1 animate-slide-down">
                  {f.a}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 text-center">
        <Link
          href="/faq"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          See all FAQs
          <ArrowRightIcon size={14} />
        </Link>
      </div>
      </div>
    </section>
  );
}
