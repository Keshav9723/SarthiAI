"use client";

// components/cards/GroupTypeCard.tsx
// Horizontal arrow card used by the Homepage Hero "Who's coming along?" row
// and by the Generate/Surprise wizards. Single source of truth for the
// group-type selector look so all three feel cohesive.

import { ChevronRightIcon } from "@/components/ui/Icons";
import type { GroupType } from "@/lib/mockData";

interface Props {
  id: GroupType;
  emoji: string;
  label: string;
  subtitle: string;
  selected?: boolean;
  onClick?: (id: GroupType) => void;
  variant?: "horizontal" | "tile";
}

export default function GroupTypeCard({
  id,
  emoji,
  label,
  subtitle,
  selected = false,
  onClick,
  variant = "horizontal",
}: Props) {
  if (variant === "tile") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(id)}
        aria-pressed={selected}
        className={`group relative text-left rounded-2xl border-2 px-5 py-6 transition-all focus-ring ${
          selected
            ? "border-green-600 bg-green-50 shadow-card"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-card"
        }`}
      >
        <span className="text-4xl block leading-none">{emoji}</span>
        <p className="mt-4 font-semibold text-base text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
        {selected && (
          <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-600 text-white grid place-items-center text-xs">
            ✓
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      aria-pressed={selected}
      className={`group flex items-center gap-3 sm:gap-4 w-full text-left rounded-2xl border-2 px-4 sm:px-5 py-4 transition-all focus-ring ${
        selected
          ? "border-green-600 bg-green-50 shadow-card"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className="text-3xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold whitespace-nowrap ${selected ? "text-green-700" : "text-gray-900"}`}
        >
          {label}
        </p>
        {/* No line-clamp here — subtitles like "Romantic getaways" /
            "Your pace, your call" are short enough to render in full. The
            card grows by a few pixels if they ever wrap to two lines. */}
        <p className="text-sm text-gray-500 leading-snug">{subtitle}</p>
      </div>
      <span
        className={`grid place-items-center w-7 h-7 rounded-full shrink-0 transition-colors ${
          selected
            ? "bg-green-600 text-white"
            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
        }`}
      >
        <ChevronRightIcon size={16} />
      </span>
    </button>
  );
}
