"use client";

// components/faq/FAQAccordion.tsx
// A grouped accordion. Multiple items can be open at once (unlike the
// destination FAQ which only allows one). State is local — no need to lift
// since each section is independent.

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/Icons";

export interface FAQGroup {
  category: string;
  items: { question: string; answer: string }[];
}

export default function FAQAccordion({ groups }: { groups: FAQGroup[] }) {
  // Open the first item of each group by default so the page doesn't read empty.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      if (g.items[0]) init[`${g.category}::${g.items[0].question}`] = true;
    }
    return init;
  });

  function toggle(key: string) {
    setOpenMap((m) => ({ ...m, [key]: !m[key] }));
  }

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {group.category}
          </h2>
          <ul className="mt-4 divide-y divide-gray-100 bg-white rounded-2xl border border-gray-100 shadow-card">
            {group.items.map((f) => {
              const key = `${group.category}::${f.question}`;
              const isOpen = !!openMap[key];
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 group focus-ring rounded-2xl"
                  >
                    <span className="font-semibold text-gray-900">
                      {f.question}
                    </span>
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
        </section>
      ))}
    </div>
  );
}
