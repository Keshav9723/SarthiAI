"use client";

// components/ui/Lightbox.tsx
// Fullscreen photo viewer. Keyboard: Esc closes, ← / → navigate. Click backdrop
// to dismiss. Locks body scroll while open.

import { useCallback, useEffect } from "react";
import Image from "next/image";
import {
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface Props {
  images: LightboxImage[];
  /** Currently visible index, or `null` to keep closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: Props) {
  const isOpen = index !== null && index >= 0 && index < images.length;

  const goNext = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  // Keyboard navigation while open.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, goNext, goPrev]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const current = images[index!];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[200] bg-black/95 animate-fade-in print:hidden"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close photo viewer"
        className="absolute top-4 right-4 z-10 grid place-items-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-ring"
      >
        <XIcon size={22} />
      </button>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous photo"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-ring"
          >
            <ChevronLeftIcon size={26} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next photo"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 grid place-items-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-ring"
          >
            <ChevronRightIcon size={26} />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="absolute inset-4 md:inset-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full">
          <Image
            src={current.src}
            alt={current.alt}
            fill
            sizes="100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-contain"
          />
        </div>
      </div>

      {/* Counter + caption */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm font-medium pointer-events-none">
        {current.caption && (
          <p className="mb-1 text-white">{current.caption}</p>
        )}
        {images.length > 1 && (
          <p>
            {index! + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
}
