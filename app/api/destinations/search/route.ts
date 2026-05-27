// app/api/destinations/search/route.ts
// Live search over the destinations table. Backs the wizard's From/To picker
// so users can find any seeded destination, not just the 6 in mockData.
//
// GET /api/destinations/search?q=as&limit=24
//   → { results: [{ name, state, tagline, season, destination_type }, ...] }

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DestinationRow {
  name: string;
  state: string;
  tagline: string | null;
  season: string | null;
  destination_type: string | null;
}

// Fill in tagline/season for rows that don't have curated values, so every
// card in the picker shows the same shape (name + tagline + best season).
// Mirrors the helpers in lib/queries/destinations.ts.
function humanizeType(type: string | null, state: string): string {
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
  return map[type ?? ""] ?? `Discover ${state}`;
}

function bestSeasonFromType(type: string | null): string {
  switch (type) {
    case "snow":
    case "hill_station":
      return "Mar–Jun";
    case "beach":
    case "island":
      return "Nov–Feb";
    case "desert":
      return "Oct–Mar";
    default:
      return "Oct–Mar";
  }
}

function enrich(row: DestinationRow): DestinationRow {
  return {
    ...row,
    tagline: row.tagline ?? humanizeType(row.destination_type, row.state),
    season: row.season ?? bestSeasonFromType(row.destination_type),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "24", 10) || 24, 1),
    50
  );

  const sb = createServerClient();
  let query = sb
    .from("destinations")
    .select("name, state, tagline, season, destination_type, trending_rank")
    .order("trending_rank", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (q.length > 0) {
    // Postgres `or` with ilike across the searchable text columns. The wildcard
    // is what makes typing "as" surface "Rajasthan", "Assam", "Varanasi", etc.
    const pattern = `%${q}%`;
    query = query.or(
      `name.ilike.${pattern},state.ilike.${pattern},tagline.ilike.${pattern}`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: error.message, results: [] },
      { status: 500 }
    );
  }

  const rows = ((data ?? []) as DestinationRow[]).map(enrich);
  return NextResponse.json({ results: rows });
}
