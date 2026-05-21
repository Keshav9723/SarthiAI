// lib/api/destination-image.ts
// Server-side resolver for destination hero images. Lookup order:
//   1. destinations.image column in Supabase (cached from prior call)
//   2. Unsplash search API (if UNSPLASH_ACCESS_KEY set) → save back to DB
//   3. Picsum seeded placeholder (deterministic per slug, always loads)
//
// Used by surprise me + explore + any other server-side renderer that needs a
// hero image for a scraped destination. After the first time a destination is
// asked for, all subsequent requests hit the DB cache — no Unsplash quota burn.

import { createServerClient } from "@/lib/supabase/server";

const UNSPLASH_HOST = "https://api.unsplash.com";

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: { regular?: string };
    user?: { name?: string };
  }>;
}

export interface DestinationImage {
  url: string;
  attribution: string;
  source: "db_cache" | "unsplash" | "placeholder";
}

// In-process cache so multiple calls for the same slug within one request hit
// the DB at most once. Cleared on server restart — fine.
const memoryCache = new Map<string, string>();

/**
 * Resolve a hero image URL for a destination by slug + display name.
 * Always returns a usable URL (never throws).
 */
export async function getDestinationImage(opts: {
  slug: string;
  name: string;
}): Promise<DestinationImage> {
  // 1. In-process cache
  const cached = memoryCache.get(opts.slug);
  if (cached) return { url: cached, attribution: "", source: "db_cache" };

  // 2. DB cache (destinations.image)
  const sb = createServerClient();
  const { data: row } = await sb
    .from("destinations")
    .select("image")
    .eq("slug", opts.slug)
    .maybeSingle();
  if (row?.image && typeof row.image === "string" && row.image.startsWith("http")) {
    memoryCache.set(opts.slug, row.image);
    return { url: row.image, attribution: "", source: "db_cache" };
  }

  // 3. Unsplash fetch + save to DB
  const unsplashUrl = await fetchUnsplashImage(opts.name);
  if (unsplashUrl) {
    memoryCache.set(opts.slug, unsplashUrl);
    // Fire and forget the DB write so we don't block the response
    sb.from("destinations").update({ image: unsplashUrl }).eq("slug", opts.slug)
      .then(({ error }) => {
        if (error) console.warn(`[destination-image] failed to cache for ${opts.slug}: ${error.message}`);
      });
    return { url: unsplashUrl, attribution: "Photo via Unsplash", source: "unsplash" };
  }

  // 4. Picsum deterministic placeholder
  const placeholder = `https://picsum.photos/seed/${encodeURIComponent(opts.slug)}/1200/675`;
  memoryCache.set(opts.slug, placeholder);
  return { url: placeholder, attribution: "Placeholder", source: "placeholder" };
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    // Bias the query toward India travel scenes
    const q = `${query} India travel`;
    const url = `${UNSPLASH_HOST}/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=3`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[unsplash] HTTP ${res.status} for "${query}"`);
      return null;
    }
    const data = (await res.json()) as UnsplashSearchResponse;
    return data.results?.[0]?.urls?.regular ?? null;
  } catch (err) {
    console.warn(`[unsplash] error: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Bulk-resolve images for multiple destinations in parallel.
 * Returns a map of slug → image URL. Order preserved via the input array.
 */
export async function getDestinationImages(
  destinations: Array<{ slug: string; name: string }>
): Promise<Map<string, DestinationImage>> {
  const results = await Promise.all(
    destinations.map(async (d) => [d.slug, await getDestinationImage(d)] as const)
  );
  return new Map(results);
}
