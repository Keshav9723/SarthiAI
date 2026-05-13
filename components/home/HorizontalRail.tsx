"use client";

// components/home/HorizontalRail.tsx
// Generic horizontal scroller used by Recently Generated and Trending
// Destinations. Left/right arrow buttons scroll the rail; on touch the user
// can swipe natively.

import { useRef, useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";

interface Props {
  children: React.ReactNode;
  scrollAmount?: number;
}

export default function HorizontalRail({
  children,
  scrollAmount = 360,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function update() {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function scroll(dir: -1 | 1) {
    ref.current?.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        disabled={!canScrollLeft}
        className={`hidden md:grid absolute -left-4 top-1/2 -translate-y-1/2 z-10 place-items-center w-10 h-10 rounded-full bg-white shadow-card-hover border border-gray-100 text-gray-700 hover:text-gray-900 transition-opacity ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronLeftIcon size={20} />
      </button>

      <div
        ref={ref}
        className="flex items-stretch gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        disabled={!canScrollRight}
        className={`hidden md:grid absolute -right-4 top-1/2 -translate-y-1/2 z-10 place-items-center w-10 h-10 rounded-full bg-white shadow-card-hover border border-gray-100 text-gray-700 hover:text-gray-900 transition-opacity ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronRightIcon size={20} />
      </button>
    </div>
  );
}
