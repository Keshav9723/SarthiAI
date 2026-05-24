// lib/api/destination-image.ts
// Server-side resolver for destination hero images. Lookup order:
//   1. Hardcoded curated overrides (for ambiguous state-level destinations)
//   2. destinations.image column in Supabase (cached from prior call)
//   3. Wikipedia / Wikimedia Commons — pulls the actual photos embedded in
//      the article. Way more accurate than Unsplash keyword search.
//   4. Unsplash search API (if UNSPLASH_ACCESS_KEY set) as a fallback for
//      destinations Wikipedia can't resolve (rare).
//   5. Picsum seeded placeholder (deterministic per slug, always loads)
//
// Used by surprise me + explore + any other server-side renderer that needs a
// hero image for a scraped destination. Both the hero and the gallery (up to
// 6 thumbnails) get cached to Supabase on first resolve.

import { createServerClient } from "@/lib/supabase/server";
import { fetchWikipediaImages } from "@/lib/api/wikipedia-images";

const UNSPLASH_HOST = "https://api.unsplash.com";

interface UnsplashSearchResponse {
  results?: Array<{
    urls?: { regular?: string };
    description?: string | null;
    alt_description?: string | null;
    user?: { name?: string };
  }>;
}

export interface DestinationImage {
  url: string;
  attribution: string;
  source: "db_cache" | "wikipedia" | "unsplash" | "placeholder" | "override";
}

// ---------------------------------------------------------------------------
// Curated overrides for ambiguous destinations that confuse Unsplash search.
// e.g. "Rajasthan India travel" often returns Taj Mahal photos (which is in UP).
// Keyed by slug. The URL is a verified Unsplash image that fits the place.
// ---------------------------------------------------------------------------

const IMAGE_OVERRIDES: Record<string, string> = {
  rajasthan:        "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80",
  kerala:           "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80",
  "andaman-islands":"https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=1200&q=80",
  goa:              "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=80",
};

// ---------------------------------------------------------------------------
// Per-destination-type search keywords to disambiguate the Unsplash query.
// e.g. for hill_station destinations we add "mountains hills" so we don't
// get random skyline shots.
// ---------------------------------------------------------------------------

const TYPE_KEYWORDS: Record<string, string> = {
  beach:        "beach coast",
  hill_station: "mountains hills",
  snow:         "snow peaks",
  desert:       "desert dunes",
  heritage:     "heritage architecture",
  pilgrimage:   "temple",
  wildlife:     "wildlife forest safari",
  city:         "city streets",
  metro:        "skyline streets",
  offbeat:      "scenic landscape",
  island:       "island tropical",
};

// In-process cache so multiple calls for the same slug within one request hit
// the DB at most once. Cleared on server restart — fine.
const memoryCache = new Map<string, string>();

// Circuit breaker: once Unsplash returns a 403 (quota burned for the hour) we
// stop calling it for the rest of this process. Otherwise a single page render
// of /explore fires 300+ doomed requests and stalls the response. Resets when
// the dev server restarts.
let unsplashCircuitOpen = false;
let unsplashCircuitOpenedAt = 0;
const UNSPLASH_CIRCUIT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Resolve a hero image URL for a destination.
 * Always returns a usable URL (never throws).
 */
export async function getDestinationImage(opts: {
  slug: string;
  name: string;
  state?: string;
  destinationType?: string | null;
}): Promise<DestinationImage> {
  // 0. Curated override — beats everything (used for state-level entries)
  const override = IMAGE_OVERRIDES[opts.slug];
  if (override) {
    memoryCache.set(opts.slug, override);
    return { url: override, attribution: "Curated", source: "override" };
  }
  // 1. In-process cache
  const cached = memoryCache.get(opts.slug);
  if (cached) return { url: cached, attribution: "", source: "db_cache" };

  // 2. DB cache (destinations.image)
  const sb = createServerClient();
  const { data: row } = await sb
    .from("destinations")
    .select("image, gallery")
    .eq("slug", opts.slug)
    .maybeSingle();
  if (row?.image && typeof row.image === "string" && row.image.startsWith("http")) {
    memoryCache.set(opts.slug, row.image);
    return { url: row.image, attribution: "", source: "db_cache" };
  }

  // 3. Wikipedia / Commons (preferred — accurate, multi-image, CC-licensed)
  try {
    const wiki = await fetchWikipediaImages({
      destinationName: opts.name,
      state: opts.state,
      slug: opts.slug,
      maxImages: 6,
    });
    if (wiki.hero) {
      memoryCache.set(opts.slug, wiki.hero);
      // Persist hero + gallery in one write so future renders skip the API call.
      sb.from("destinations")
        .update({ image: wiki.hero, gallery: wiki.gallery })
        .eq("slug", opts.slug)
        .then(({ error }) => {
          if (error) console.warn(`[destination-image] cache write failed for ${opts.slug}: ${error.message}`);
        });
      return { url: wiki.hero, attribution: wiki.attribution, source: "wikipedia" };
    }
  } catch (err) {
    console.warn(`[destination-image] wiki lookup failed for ${opts.slug}: ${(err as Error).message}`);
  }

  // 4. Unsplash fallback (for destinations Wikipedia can't resolve)
  const unsplashUrl = await fetchUnsplashImage(opts.name, opts.state, opts.destinationType);
  if (unsplashUrl) {
    memoryCache.set(opts.slug, unsplashUrl);
    sb.from("destinations").update({ image: unsplashUrl }).eq("slug", opts.slug)
      .then(({ error }) => {
        if (error) console.warn(`[destination-image] cache write failed for ${opts.slug}: ${error.message}`);
      });
    return { url: unsplashUrl, attribution: "Photo via Unsplash", source: "unsplash" };
  }

  // 5. Picsum deterministic placeholder
  const placeholder = `https://picsum.photos/seed/${encodeURIComponent(opts.slug)}/1200/675`;
  memoryCache.set(opts.slug, placeholder);
  return { url: placeholder, attribution: "Placeholder", source: "placeholder" };
}

async function fetchUnsplashImage(
  name: string,
  state?: string,
  destinationType?: string | null
): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  // Circuit breaker — if we recently hit a 403/429, skip Unsplash entirely.
  if (unsplashCircuitOpen) {
    if (Date.now() - unsplashCircuitOpenedAt > UNSPLASH_CIRCUIT_COOLDOWN_MS) {
      // Cooldown elapsed — try again
      unsplashCircuitOpen = false;
    } else {
      return null;
    }
  }

  try {
    // Build a tight query: name + state (if different) + type keyword.
    // Avoids the "India travel" trap that returns Taj for everything.
    const stateSuffix = state && state.toLowerCase() !== name.toLowerCase() ? ` ${state}` : "";
    const typeSuffix = destinationType ? ` ${TYPE_KEYWORDS[destinationType] ?? destinationType}` : "";
    const q = `${name}${stateSuffix}${typeSuffix} India`.trim();
    const url = `${UNSPLASH_HOST}/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=5`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      // 403 / 429 = rate limit. Open the circuit so the rest of this request
      // doesn't waste time on doomed calls. Run `npm run seed:images` to
      // pre-warm the DB cache slowly without burning the limit.
      if (res.status === 403 || res.status === 429) {
        unsplashCircuitOpen = true;
        unsplashCircuitOpenedAt = Date.now();
        console.warn(
          `[unsplash] HTTP ${res.status} — quota burned. Pausing Unsplash for 1 hour. ` +
            `Run "npm run seed:images" overnight to fill the DB cache and avoid this at runtime.`
        );
      } else {
        console.warn(`[unsplash] HTTP ${res.status} for "${q}"`);
      }
      return null;
    }
    const data = (await res.json()) as UnsplashSearchResponse;
    const results = data.results ?? [];
    // Filter out obvious wrong-region matches (e.g. Taj Mahal returned for Rajasthan)
    const looksWrong = (txt: string | null | undefined): boolean => {
      if (!txt) return false;
      const t = txt.toLowerCase();
      // If we're NOT searching for Agra/Taj, drop any result whose caption is dominated by it
      const isTajQuery = name.toLowerCase().includes("agra") || name.toLowerCase().includes("taj");
      if (!isTajQuery && (t.includes("taj mahal") || t.includes("taj-mahal"))) return true;
      return false;
    };
    const filtered = results.filter(
      (r) => !looksWrong(r.description) && !looksWrong(r.alt_description)
    );
    return (filtered[0] ?? results[0])?.urls?.regular ?? null;
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
  destinations: Array<{ slug: string; name: string; state?: string; destinationType?: string | null }>
): Promise<Map<string, DestinationImage>> {
  const results = await Promise.all(
    destinations.map(async (d) => [d.slug, await getDestinationImage(d)] as const)
  );
  return new Map(results);
}
