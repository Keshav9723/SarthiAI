// lib/blurPlaceholder.ts
// Single static blurDataURL shared across every next/image that wants a real
// blur-up transition. Unsplash URLs can't be auto-analyzed at build time, so
// we use a small base64 SVG (cream-tinted gray gradient).
//
// Usage:
//   <Image placeholder="blur" blurDataURL={BLUR_DATA_URL} ... />

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 6">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E5E7EB"/>
      <stop offset="100%" stop-color="#F3F4F6"/>
    </linearGradient>
  </defs>
  <rect width="8" height="6" fill="url(#g)"/>
</svg>`;

const toBase64 = (s: string): string =>
  typeof window === "undefined"
    ? Buffer.from(s).toString("base64")
    : window.btoa(s);

export const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(SVG)}`;
