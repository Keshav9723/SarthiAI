"use client";

// components/ui/SafeImage.tsx
// Drop-in replacement for next/image that gracefully falls back to a
// deterministic picsum placeholder when the source URL 404s, 5xxs, or
// errors out at the network layer.
//
// Why: Unsplash photos sometimes get removed by their uploaders, causing
// hard-coded URLs in MOCK_DESTINATIONS to break with "upstream image response
// failed". Wrapping every <Image> in SafeImage means those failures degrade
// silently to a placeholder instead of crashing the page.
//
// Use exactly like next/image:
//   <SafeImage src={...} alt={...} fill sizes="..." className="..." />
// Pass an optional `fallbackSeed` to control the picsum seed (defaults to alt).

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type Props = Omit<ImageProps, "onError"> & {
  /** Seed for the picsum placeholder — defaults to alt text. */
  fallbackSeed?: string;
};

// Hosts that aggressively rate-limit image-optimizer fetches when we proxy
// through Next's `/_next/image`. Loading their URLs directly (unoptimized)
// bypasses our server's outbound calls and lets the browser hit them with
// its own (much higher) rate budget. Wikimedia is the main offender — 50+
// destination pages all pulling 6 photos each through one Next dev server
// will burn through their quota in seconds.
const SKIP_OPTIMIZATION_HOSTS = [
  "upload.wikimedia.org",
  "commons.wikimedia.org",
];

function shouldSkipOptimization(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return false;
  try {
    const u = new URL(src);
    return SKIP_OPTIMIZATION_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}

export default function SafeImage({ src, alt, fallbackSeed, ...rest }: Props) {
  const seed =
    encodeURIComponent(fallbackSeed ?? alt ?? "sarthi-placeholder")
      .toLowerCase()
      .replace(/%20/g, "-");
  const fallback = `https://picsum.photos/seed/${seed}/1200/675`;

  const [currentSrc, setCurrentSrc] = useState<ImageProps["src"]>(src);

  // Reset when the upstream src changes (e.g. user navigates between cards)
  useEffect(() => { setCurrentSrc(src); }, [src]);

  // Bypass Next's image optimizer for Wikimedia — the proxy hits their
  // rate limit fast on /explore (which loads 312 destinations). Direct
  // browser fetches are individually cached + much higher quota.
  const unoptimized = shouldSkipOptimization(currentSrc);

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      unoptimized={unoptimized || (rest as { unoptimized?: boolean }).unoptimized}
      onError={() => {
        if (currentSrc !== fallback) setCurrentSrc(fallback);
      }}
    />
  );
}
