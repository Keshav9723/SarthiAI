// lib/queries/destinations.ts
// Server-side query helpers for the destinations table. Mirrors the frontend
// `Destination` shape from lib/mockData.ts so server components can hand the
// data straight to existing UI components without translation.

import { createServerClient } from "@/lib/supabase/server";
import { getDestinationImages } from "@/lib/api/destination-image";
import type { Destination, GroupType } from "@/lib/mockData";

interface DestinationRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  tagline: string | null;
  description: string | null;
  image: string | null;
  gallery: string[] | null;
  tags: string[] | null;
  best_for: string[] | null;
  season: string | null;
  best_months: string[] | null;
  budget_from: number | null;
  recommended_duration: string | null;
  weather: string | null;
  temperature: string | null;
  destination_type: string | null;
  region: string | null;
  is_minimal: boolean | null;
  trending_rank?: number | null;
}

function rowToDestination(r: DestinationRow): Destination {
  return {
    id: r.slug,
    name: r.name,
    state: r.state,
    tagline: r.tagline ?? humanizeType(r.destination_type, r.state),
    description: r.description ?? "",
    image: r.image ?? "",  // will be filled in by resolveImages step
    gallery: r.gallery ?? [],
    tags: (r.tags && r.tags.length ? r.tags : tagsFromType(r.destination_type)) as string[],
    bestFor: ((r.best_for ?? []) as GroupType[]),
    season: r.season ?? bestSeasonFromType(r.destination_type),
    bestMonths: r.best_months ?? [],
    budgetFrom: r.budget_from ?? estimateBudget(r.destination_type),
    recommendedDuration: r.recommended_duration ?? "3-5 days",
    weather: r.weather ?? "",
    temperature: r.temperature ?? "",
  };
}

function humanizeType(type: string | null, state: string): string {
  const t = type ?? "destination";
  const map: Record<string, string> = {
    metro: "Modern metro with culture & food",
    city: "Vibrant city full of stories",
    beach: "Sun, sand, and coastline calm",
    hill_station: "Cool hills and pine air",
    snow: "Snow peaks and dramatic vistas",
    desert: "Golden dunes and starry skies",
    heritage: "Centuries of history and architecture",
    pilgrimage: "Spiritual pause and timeless rituals",
    wildlife: "Wild encounters and forest stays",
    offbeat: "Quiet, off-the-grid escape",
    island: "Tropical island paradise",
  };
  return map[t] ?? `Discover ${state}`;
}

function tagsFromType(type: string | null): string[] {
  const t = type ?? "destination";
  const map: Record<string, string[]> = {
    metro: ["city", "food", "shopping"],
    city: ["city", "culture"],
    beach: ["beach", "relax", "sea"],
    hill_station: ["hills", "scenic", "cool"],
    snow: ["snow", "adventure", "mountains"],
    desert: ["desert", "adventure"],
    heritage: ["heritage", "architecture", "culture"],
    pilgrimage: ["spiritual", "temples"],
    wildlife: ["wildlife", "nature", "safari"],
    offbeat: ["offbeat", "scenic"],
    island: ["beach", "island", "snorkel"],
  };
  return map[t] ?? ["destination"];
}

function bestSeasonFromType(type: string | null): string {
  switch (type) {
    case "snow":
    case "hill_station": return "Mar–Jun";
    case "beach":
    case "island": return "Nov–Feb";
    case "desert": return "Oct–Mar";
    default: return "Oct–Mar";
  }
}

function estimateBudget(type: string | null): number {
  switch (type) {
    case "island": return 35000;
    case "snow": return 30000;
    case "wildlife": return 22000;
    case "beach": return 18000;
    case "hill_station": return 15000;
    case "metro": return 15000;
    default: return 12000;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch every destination from Supabase. Server-side only.
 * Resolves missing images via Unsplash on first call (cached to DB after).
 */
export async function listDestinations(opts: {
  resolveImages?: boolean;
  limit?: number;
} = {}): Promise<Destination[]> {
  const sb = createServerClient();
  let query = sb
    .from("destinations")
    .select(
      "id, slug, name, state, tagline, description, image, gallery, tags, best_for, season, best_months, budget_from, recommended_duration, weather, temperature, destination_type, region, is_minimal"
    )
    .order("trending_rank", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) {
    console.warn(`[destinations] list failed: ${error.message}`);
    return [];
  }

  const destinations = (data as DestinationRow[]).map(rowToDestination);

  if (opts.resolveImages !== false) {
    // Fill in any missing images via Unsplash (caches to DB on first hit).
    // Pass state + destination_type so the search query is disambiguating.
    const rawMap = new Map<string, DestinationRow>(
      (data as DestinationRow[]).map((r) => [r.slug, r])
    );
    const missing = destinations.filter((d) => !d.image);
    if (missing.length > 0) {
      const imgMap = await getDestinationImages(
        missing.map((d) => {
          const raw = rawMap.get(d.id);
          return {
            slug: d.id,
            name: d.name,
            state: d.state,
            destinationType: raw?.destination_type ?? null,
          };
        })
      );
      for (const d of destinations) {
        if (!d.image) {
          const img = imgMap.get(d.id);
          if (img) d.image = img.url;
        }
      }
    }
  }

  return destinations;
}

/**
 * Top N destinations for the homepage trending row.
 * Prefers rows with a curated `tagline` (the original seeded set), falls back
 * to any row with an image set, then any row at all.
 */
export async function listTrendingDestinations(limit = 8): Promise<Destination[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("destinations")
    .select(
      "id, slug, name, state, tagline, description, image, gallery, tags, best_for, season, best_months, budget_from, recommended_duration, weather, temperature, destination_type, region, is_minimal, trending_rank"
    )
    .order("trending_rank", { ascending: true, nullsFirst: false })
    .not("tagline", "is", null)
    .limit(limit);
  if (error) {
    console.warn(`[destinations] trending failed: ${error.message}`);
    return [];
  }
  const destinations = (data as DestinationRow[]).map(rowToDestination);

  // Fill in missing images
  const rawMap = new Map((data as DestinationRow[]).map((r) => [r.slug, r]));
  const missing = destinations.filter((d) => !d.image);
  if (missing.length > 0) {
    const imgMap = await getDestinationImages(
      missing.map((d) => {
        const r = rawMap.get(d.id);
        return {
          slug: d.id, name: d.name, state: d.state,
          destinationType: r?.destination_type ?? null,
        };
      })
    );
    for (const d of destinations) {
      if (!d.image) {
        const img = imgMap.get(d.id);
        if (img) d.image = img.url;
      }
    }
  }

  return destinations;
}

/**
 * Look up the seasonal climate score for a destination + month from the
 * `seasonal_scores` table (populated by the Open-Meteo scraper). Used by the
 * itinerary detail page to show real average temperature + rainfall instead
 * of the generic "Pleasant" placeholder.
 *
 * The lookup is forgiving — the LLM sometimes writes destinations as
 * "Jaipur, Rajasthan", "the pink city", "Goa beaches" etc. so we try:
 *   1. Exact slug match  (Goa → "goa")
 *   2. Exact name match  ("Goa")
 *   3. Fuzzy name ILIKE  ("%Goa%")
 *   4. First word slug   ("Jaipur, Rajasthan" → "jaipur")
 *   5. First word name   ("Jaipur")
 */
export async function getSeasonalScore(opts: {
  destinationName: string;
  month: number;  // 1-12
}): Promise<{
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
} | null> {
  const sb = createServerClient();
  const raw = opts.destinationName.trim();
  if (!raw) return null;

  const slugOf = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const firstWord = raw.split(/[,\s]+/)[0] ?? raw;
  const fullSlug = slugOf(raw);
  const firstSlug = slugOf(firstWord);

  // Try each lookup in turn. First hit wins.
  const attempts: Array<{ kind: "slug" | "name" | "ilike"; value: string }> = [
    { kind: "slug", value: fullSlug },
    { kind: "name", value: raw },
    { kind: "slug", value: firstSlug },
    { kind: "name", value: firstWord },
    { kind: "ilike", value: `%${raw}%` },
    { kind: "ilike", value: `%${firstWord}%` },
  ];

  let destinationId: string | null = null;
  for (const a of attempts) {
    const filter =
      a.kind === "slug"
        ? sb.from("destinations").select("id").eq("slug", a.value)
        : a.kind === "name"
          ? sb.from("destinations").select("id").ilike("name", a.value)
          : sb.from("destinations").select("id").ilike("name", a.value);
    const { data } = await filter.limit(1).maybeSingle();
    if (data?.id) {
      destinationId = (data as { id: string }).id;
      break;
    }
  }

  // Fallback: the destination might be a STATE name ("Himachal Pradesh",
  // "Kerala") that doesn't have its own destinations row. Find any city in
  // that state with seasonal data and use its score as a state-level proxy.
  if (!destinationId) {
    const { data: stateMatch } = await sb
      .from("destinations")
      .select("id")
      .ilike("state", raw)
      .limit(1)
      .maybeSingle();
    if (stateMatch?.id) {
      destinationId = (stateMatch as { id: string }).id;
    }
  }

  if (!destinationId) {
    console.warn(`[seasonal-score] no destinations row for "${raw}"`);
    return null;
  }

  const { data, error } = await sb
    .from("seasonal_scores")
    .select("score, avg_temp_c, rain_mm")
    .eq("destination_id", destinationId)
    .eq("month", opts.month)
    .maybeSingle();
  if (error || !data) {
    console.warn(`[seasonal-score] no row for destination_id=${destinationId} month=${opts.month}`);
    return null;
  }
  return data as { score: number; avg_temp_c: number | null; rain_mm: number | null };
}

export async function getDestinationBySlug(slug: string): Promise<Destination | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("destinations")
    .select(
      "id, slug, name, state, tagline, description, image, gallery, tags, best_for, season, best_months, budget_from, recommended_duration, weather, temperature, destination_type, region, is_minimal"
    )
    .or(`slug.eq.${slug},name.ilike.${slug}`)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const dest = rowToDestination(data as DestinationRow);
  if (!dest.image) {
    const raw = data as DestinationRow;
    const imgMap = await getDestinationImages([{
      slug: dest.id,
      name: dest.name,
      state: dest.state,
      destinationType: raw.destination_type ?? null,
    }]);
    const img = imgMap.get(dest.id);
    if (img) dest.image = img.url;
  }
  return dest;
}
