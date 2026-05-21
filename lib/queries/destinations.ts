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
    // Fill in any missing images via Unsplash (caches to DB on first hit)
    const missing = destinations.filter((d) => !d.image);
    if (missing.length > 0) {
      const imgMap = await getDestinationImages(
        missing.map((d) => ({ slug: d.id, name: d.name }))
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
    const imgMap = await getDestinationImages([{ slug: dest.id, name: dest.name }]);
    const img = imgMap.get(dest.id);
    if (img) dest.image = img.url;
  }
  return dest;
}
