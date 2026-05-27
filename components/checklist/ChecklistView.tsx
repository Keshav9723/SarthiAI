"use client";

// components/checklist/ChecklistView.tsx
// Pre-departure checklist for a single itinerary. State persists in
// localStorage via useChecklist. Renders progress bar + grouped sections.

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useChecklist } from "@/lib/useChecklist";
import { buildChecklist } from "@/lib/checklistData";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { toast } from "@/lib/toast";
import {
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import type { Itinerary } from "@/lib/mockData";

export default function ChecklistView({
  itinerary,
}: {
  itinerary: Itinerary;
}) {
  const { checked, toggle, reset, hydrated } = useChecklist(itinerary.id);
  const sections = useMemo(() => buildChecklist(itinerary), [itinerary]);

  const total = sections.reduce((s, sec) => s + sec.items.length, 0);
  const done = sections.reduce(
    (s, sec) => s + sec.items.filter((i) => checked.has(i.id)).length,
    0
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function handleReset() {
    const { confirmDialog } = await import("@/lib/confirm");
    const ok = await confirmDialog({
      title: "Reset checklist?",
      message: "Uncheck every item on this list. You can re-check them anytime.",
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    reset();
    toast.info("Checklist reset.");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12">
      {/* Header card */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <div className="relative h-40 md:h-full md:min-h-[160px]">
          <Image
            src={itinerary.image}
            alt={itinerary.title}
            fill
            sizes="220px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
        </div>
        <div className="p-5 md:p-6">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Pre-departure checklist
          </p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {itinerary.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {itinerary.duration} · {itinerary.groupSize} traveller
            {itinerary.groupSize !== 1 ? "s" : ""}
          </p>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Progress
              </p>
              <p className="text-sm font-bold text-gray-900">
                {done} / {total}{" "}
                <span className="text-xs font-medium text-gray-500">
                  ({pct}%)
                </span>
              </p>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct === 100
                    ? "bg-green-600"
                    : pct > 50
                      ? "bg-green-500"
                      : "bg-saffron-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <Link
              href={`/itinerary/${itinerary.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Open itinerary
              <ArrowRightIcon size={14} />
            </Link>
            {done > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-semibold text-gray-500 hover:text-rose-600 underline underline-offset-2"
              >
                Reset list
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion celebration */}
      {pct === 100 && (
        <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-5 flex items-start gap-3 animate-slide-up">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-green-600 text-white shrink-0">
            <SparklesIcon size={20} />
          </span>
          <div>
            <p className="font-semibold text-green-900">
              You&apos;re ready to travel 🎉
            </p>
            <p className="text-sm text-green-800 mt-0.5">
              Everything&apos;s checked off. Have an incredible trip.
            </p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="mt-8 space-y-6">
        {sections.map((section) => {
          const sectionDone = section.items.filter((i) =>
            checked.has(i.id)
          ).length;
          return (
            <section
              key={section.id}
              className="rounded-2xl bg-white border border-gray-100 shadow-card overflow-hidden"
            >
              <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold text-gray-900">
                  <span className="text-xl">{section.icon}</span>
                  {section.title}
                </h2>
                <span className="text-xs font-semibold text-gray-500">
                  {sectionDone} / {section.items.length}
                </span>
              </header>
              <ul className="divide-y divide-gray-100">
                {section.items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        disabled={!hydrated}
                        aria-pressed={isChecked}
                        className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-cream dark:hover:bg-forest-800 transition-colors disabled:cursor-not-allowed"
                      >
                        <span
                          className={`mt-0.5 grid place-items-center w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${
                            isChecked
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {isChecked && (
                            <CheckIcon size={12} strokeWidth={3} />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className={`text-sm font-medium block ${
                              isChecked
                                ? "text-gray-500 line-through"
                                : "text-gray-900"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="block mt-0.5 text-xs text-gray-500 leading-relaxed">
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
