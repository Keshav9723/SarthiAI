"use client";

// components/itinerary/PhotoGrid.tsx
// Top-of-itinerary photo grid: one large hero on the left, two stacked on the
// right, plus a "Because you're a Sarthi traveller" info card on the far right.
// Clicking any image opens the fullscreen Lightbox.

import { useState } from "react";
import Image from "next/image";
import { SparklesIcon } from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import Lightbox from "@/components/ui/Lightbox";

interface Props {
  title: string;
  gallery: string[];
}

export default function PhotoGrid({ title, gallery }: Props) {
  const [hero, two, three] = gallery;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const lightboxImages = gallery.map((src, i) => ({
    src,
    alt: `${title} — photo ${i + 1}`,
  }));

  function openAt(i: number) {
    setOpenIndex(i);
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[320px] md:h-[380px]">
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label="View larger photo"
          className="relative rounded-2xl overflow-hidden md:col-span-6 h-full group focus-ring"
        >
          <Image
            src={hero}
            alt={title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        </button>
        <div className="grid grid-rows-2 gap-3 md:col-span-3">
          {[two, three].map((src, i) => (
            <button
              type="button"
              key={i}
              onClick={() => openAt(i + 1)}
              aria-label="View larger photo"
              className="relative rounded-2xl overflow-hidden bg-gray-100 group focus-ring"
            >
              {src && (
                <Image
                  src={src}
                  alt={`${title} ${i + 2}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
              )}
            </button>
          ))}
        </div>
        <div className="md:col-span-3 rounded-2xl bg-gradient-to-br from-green-600 to-forest-950 text-white p-5 flex flex-col justify-between">
          <div>
            <SparklesIcon size={22} className="text-saffron-400" />
            <p className="mt-3 text-xs font-semibold tracking-widest uppercase text-white/70">
              Because you&apos;re a Sarthi traveller
            </p>
            <p className="mt-2 text-base font-semibold leading-snug">
              Hand-picked guides, weather-aware day order, and 24/7 chat support.
            </p>
          </div>
          <ul className="text-xs text-white/85 space-y-1">
            <li>✓ Free cancellations up to 72h</li>
            <li>✓ Real-time INR pricing</li>
            <li>✓ Senior &amp; kid-friendly pacing</li>
          </ul>
        </div>
      </div>

      <Lightbox
        images={lightboxImages}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
      />
    </>
  );
}
