// lib/api/wikipedia-images.ts
// Pulls relevant photos for an Indian destination straight from its Wikipedia
// article. Way more accurate than Unsplash's global keyword search (which
// happily returns Japanese lanterns for "lantern India temple"), and gives
// us 4-6 images per destination instead of just one.
//
// API used: Wikipedia REST `/page/media-list/{title}` returns every media
// item embedded in the article in document order. We filter to landscape
// JPEGs/PNGs, skip the obvious non-photos (maps, flags, coats of arms,
// diagrams), and rank by which article section the photo appears in so the
// lead-section image becomes our hero.
//
// All Wikimedia images are CC-licensed; attribution links back to the source
// article. The user-facing card shows "Photos via Wikipedia/Commons".

const REST_HOST = "https://en.wikipedia.org/api/rest_v1";

// Sarthi-branded UA — Wikimedia rejects generic UAs after a while.
const UA =
  "Sarthi-Travel-Planner/1.0 (https://sarthi.ai; major project NorthCap; devops@biocipher.in)";

interface MediaItem {
  type?: string;
  section_id?: number;
  showInGallery?: boolean;
  srcset?: Array<{ src: string; scale?: string }>;
  title?: string;
  caption?: { text?: string };
}

interface MediaListResponse {
  items?: MediaItem[];
}

export interface DestinationImages {
  hero: string | null;
  gallery: string[];
  attribution: string;
  sourceUrl: string;
}

// Reject any file whose name suggests it's not a real photo of the place.
const SKIP_PATTERNS = [
  /logo/i, /coat[\s_-]?of[\s_-]?arms/i, /flag[\s_-]?of/i,
  /\bmap\b/i, /location/i, /diagram/i, /chart/i, /graph/i,
  /infobox/i, /stub/i, /icon/i, /symbol/i, /seal\.svg/i,
  /emblem/i, /satellite/i, /topographic/i, /outline/i,
  /\.svg$/i, /\.ogg$/i, /\.ogv$/i, /\.webm$/i,
];

const MAX_IMAGES = 6;

// Slugs whose Wikipedia article lives under a non-obvious title. Keyed by the
// slug we use in `destinations.slug`. Values are alternative titles to try
// (in order) in addition to the slug-based defaults. Without these, the
// fetcher returns "no images found" because Wikipedia 404s on the bare slug.
const SLUG_TITLE_OVERRIDES: Record<string, string[]> = {
  "ajanta-ellora":      ["Ajanta Caves", "Ellora Caves"],
  "auli":               ["Auli, India"],
  "ranthambore":        ["Ranthambore National Park"],
  "diu":                ["Diu, India", "Diu (city)"],
  "katra":              ["Katra, Jammu and Kashmir"],
  "kanha":              ["Kanha National Park", "Kanha Tiger Reserve"],
  "pench":              ["Pench National Park", "Pench Tiger Reserve"],
  "statue-of-unity":    ["Statue of Unity"],
  "havelock":           ["Swaraj Dweep", "Havelock Island"],
  "chitrakoot":         ["Chitrakoot, Madhya Pradesh", "Chitrakoot Dham"],
  "hanle":              ["Hanle, India", "Hanle village"],
  "hogenakkal":         ["Hogenakkal Falls"],
  "vaishali":           ["Vaishali (ancient city)", "Vaishali district"],
  "mon-nagaland":       ["Mon, India", "Mon district"],
  "tirthan-valley":     ["Tirthan Valley", "Great Himalayan National Park"],
  "barnawapara":        ["Barnawapara Wildlife Sanctuary"],
  "bastar":             ["Bastar district", "Bastar State"],
  "betla":              ["Betla National Park"],
  "damdama":            ["Damdama Lake"],
  "diglipur":           ["Diglipur"],
  "champaner":          ["Champaner-Pavagadh Archaeological Park"],
};

/**
 * Fetch the hero + gallery for a destination from Wikipedia.
 * Tries several title variants ("Goa", "Goa, India", "Goa (state)")
 * because Wikipedia's article slugs aren't perfectly predictable.
 * If a slug is in SLUG_TITLE_OVERRIDES, those titles are tried first.
 * Returns empty arrays if nothing usable is found.
 */
export async function fetchWikipediaImages(opts: {
  destinationName: string;
  state?: string;
  slug?: string;
  maxImages?: number;
}): Promise<DestinationImages> {
  const max = opts.maxImages ?? MAX_IMAGES;
  const name = opts.destinationName.trim();
  const state = opts.state?.trim();
  const slug = opts.slug?.trim().toLowerCase();

  // Manual overrides first (most accurate when set), then the auto-generated
  // candidates from the destination name + state.
  const overrides = slug ? SLUG_TITLE_OVERRIDES[slug] ?? [] : [];
  const candidates = Array.from(new Set([
    ...overrides,
    name,
    state && state.toLowerCase() !== name.toLowerCase() ? `${name}, ${state}` : null,
    `${name} (city)`,
    `${name} (town)`,
    `${name} (district)`,
    state ? `${name} (${state})` : null,
  ].filter(Boolean))) as string[];

  for (const title of candidates) {
    try {
      const result = await tryFetch(title, max);
      if (result && result.gallery.length > 0) return result;
    } catch (err) {
      // Quietly try the next candidate — most failures are 404s on alt titles.
      console.warn(`[wiki-images] ${title}: ${(err as Error).message}`);
    }
  }

  return { hero: null, gallery: [], attribution: "", sourceUrl: "" };
}

async function tryFetch(title: string, maxImages: number): Promise<DestinationImages | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, "_"));
  const url = `${REST_HOST}/page/media-list/${encoded}`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Api-User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) {
    // 404 just means this title doesn't exist — try the next candidate.
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}`);
  }

  const data = (await res.json()) as MediaListResponse;
  const all = data.items ?? [];

  // Filter to photos likely to BE the destination, not chart-junk.
  const usable = all.filter((it) => {
    if (it.type !== "image") return false;
    if (it.showInGallery === false) return false;
    const filename = (it.title ?? it.srcset?.[0]?.src ?? "").toString();
    if (SKIP_PATTERNS.some((rx) => rx.test(filename))) return false;
    return true;
  });

  if (usable.length === 0) return null;

  // Sort: lead-section images first (section_id 0 is the infobox / opening
  // photo), then by position. Wikipedia tends to put the iconic shots up top.
  usable.sort((a, b) => {
    const sa = a.section_id ?? 99;
    const sb = b.section_id ?? 99;
    return sa - sb;
  });

  // Resolve each to a CDN URL, deduplicate, take the top N.
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const it of usable) {
    const src = pickBestSrc(it.srcset ?? []);
    if (!src) continue;
    // Deduplicate on the file path (different scales of same image)
    const key = src.replace(/\/\d+px-/, "/").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(src);
    if (urls.length >= maxImages) break;
  }

  if (urls.length === 0) return null;

  return {
    hero: urls[0],
    gallery: urls,
    attribution: "Photos via Wikipedia / Wikimedia Commons",
    sourceUrl: `https://en.wikipedia.org/wiki/${encoded}`,
  };
}

// Pick the largest 2x src — Wikipedia returns srcsets like
// [{src: "//upload.wikimedia.org/.../1280px-Goa.jpg", scale: "1.5x"}, ...].
function pickBestSrc(srcset: Array<{ src: string; scale?: string }>): string | null {
  if (srcset.length === 0) return null;
  // Prefer 2x → 1.5x → 1x.
  const order = ["2x", "1.5x", "1x"];
  for (const scale of order) {
    const hit = srcset.find((s) => s.scale === scale);
    if (hit?.src) return normalize(hit.src);
  }
  return normalize(srcset[0].src);
}

function normalize(src: string): string {
  if (src.startsWith("//")) return "https:" + src;
  return src;
}
