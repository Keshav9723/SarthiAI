"use client";

// components/explore/DestinationFAQ.tsx
// Lightweight accordion. Only one item open at a time. No external dep.

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/Icons";
import type { DestinationFAQ as FAQItem } from "@/lib/mockData";

export default function DestinationFAQ({ faqs }: { faqs: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-gray-100 border-y border-gray-100 bg-white rounded-2xl shadow-card">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 group focus-ring rounded-2xl"
            >
              <span className="font-semibold text-gray-900">{f.question}</span>
              <ChevronDownIcon
                size={18}
                className={`text-gray-500 shrink-0 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed -mt-1 animate-slide-down">
                {f.answer}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
