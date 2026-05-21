"use client";

// components/explore/DestinationGallery.tsx
// Click-to-zoom gallery for /explore/[destination]. First tile is large (2x2),
// the rest are square. Lightbox renders the full set in order.

import { useState } from "react";
import Image from "@/components/ui/SafeImage";
import Lightbox from "@/components/ui/Lightbox";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

interface Props {
  destinationName: string;
  gallery: string[];
}

export default function DestinationGallery({
  destinationName,
  gallery,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const shown = gallery.slice(0, 6);
  const lightboxImages = gallery.map((src, i) => ({
    src,
    alt: `${destinationName} — photo ${i + 1}`,
  }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {shown.map((src, i) => (
          <button
            type="button"
            key={src + i}
            onClick={() => setOpenIndex(i)}
            aria-label={`View ${destinationName} photo ${i + 1} fullscreen`}
            className={`relative rounded-2xl overflow-hidden group focus-ring ${
              i === 0
                ? "col-span-2 row-span-2 aspect-[4/3]"
                : "aspect-square"
            }`}
          >
            <Image
              src={src}
              alt={`${destinationName} ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
          </button>
        ))}
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
