// lib/api/places.ts
// Unsplash wrapper for destination hero images.
// Falls back to a Wikipedia-style placeholder when UNSPLASH_ACCESS_KEY is
// not set. The placeholder is built from Wikimedia's Special:FilePath endpoint
// which serves images via a deterministic URL — no API call needed.
//
// To enable real Unsplash calls:
//   1. Sign up at unsplash.com/developers → "New Application"
//   2. UNSPLASH_ACCESS_KEY=...
// Restart dev server. Done.

const UNSPLASH_HOST = "https://api.unsplash.com";

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: { regular?: string; raw?: string };
    user?: { name?: string; username?: string };
    description?: string | null;
    alt_description?: string | null;
  }>;
}

export interface HeroImage {
  url: string;
  attribution: string;
  alt: string;
  is_mock: boolean;
}

export async function getHeroImage(query: string): Promise<HeroImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return mockHeroImage(query);
  }

  try {
    const url =
      `${UNSPLASH_HOST}/search/photos` +
      `?query=${encodeURIComponent(query + " India travel")}` +
      `&orientation=landscape&per_page=5`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[unsplash] HTTP ${res.status} — falling back to mock`);
      return mockHeroImage(query);
    }
    const data = (await res.json()) as UnsplashSearchResponse;
    const first = data.results?.[0];
    if (!first?.urls?.regular) return mockHeroImage(query);

    return {
      url: first.urls.regular,
      attribution: `Photo by ${first.user?.name ?? "Unsplash"} on Unsplash`,
      alt: first.alt_description ?? first.description ?? query,
      is_mock: false,
    };
  } catch (err) {
    console.warn(`[unsplash] error: ${(err as Error).message} — using mock`);
    return mockHeroImage(query);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — uses Unsplash's free random image endpoint (no key needed)
// ---------------------------------------------------------------------------

function mockHeroImage(query: string): HeroImage {
  // Source.unsplash.com used to serve random images but was deprecated. Use a
  // stable Picsum placeholder seeded by the query so each destination gets a
  // consistent (if generic) image until the real Unsplash key is added.
  const seed = encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"));
  return {
    url: `https://picsum.photos/seed/${seed}/1600/900`,
    attribution: "Placeholder via Picsum",
    alt: query,
    is_mock: true,
  };
}
