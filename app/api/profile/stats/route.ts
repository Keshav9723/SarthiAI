// app/api/profile/stats/route.ts
// Aggregates the signed-in user's real travel stats from the itineraries
// table. Returns counts that feed the Profile page's "Travel stats" cards.
//
//   GET → {
//     trips: number,          // count of itineraries the user owns
//     placesVisited: number,  // distinct states across those trips
//     totalBudget: number,    // sum of total_budget across all trips (INR)
//     favouriteGroup: string | null,  // most-used groupType (couple/family/…)
//   }
//
// Returns zeroes (not an error) when signed out so the Profile page can
// render the empty state without special-casing the response.

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = {
  trips: 0,
  placesVisited: 0,
  totalBudget: 0,
  favouriteGroup: null as string | null,
};

interface ItineraryRow {
  state: string | null;
  total_budget: number | null;
  group_type: string | null;
}

export async function GET() {
  try {
    const sb = createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json(EMPTY);

    const { data, error } = await sb
      .from("itineraries")
      .select("state, total_budget, group_type")
      .eq("user_id", user.id)
      .eq("is_template", false);

    if (error) {
      console.warn(`[profile/stats] DB error: ${error.message}`);
      return NextResponse.json(EMPTY);
    }

    const rows = (data ?? []) as ItineraryRow[];
    if (rows.length === 0) return NextResponse.json(EMPTY);

    // Distinct states (split on "·" / "," so "Goa, Maharashtra" counts as 2)
    const stateSet = new Set<string>();
    for (const r of rows) {
      const raw = (r.state ?? "").trim();
      if (!raw) continue;
      raw
        .split(/[·,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => stateSet.add(s));
    }

    const totalBudget = rows.reduce(
      (s, r) => s + (typeof r.total_budget === "number" ? r.total_budget : 0),
      0
    );

    // Most-used group type — couple / family / friends / solo
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const g = r.group_type ?? "";
      if (!g) continue;
      counts[g] = (counts[g] ?? 0) + 1;
    }
    const favouriteGroup =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return NextResponse.json({
      trips: rows.length,
      placesVisited: stateSet.size,
      totalBudget,
      favouriteGroup,
    });
  } catch (err) {
    console.warn(`[profile/stats] unexpected: ${(err as Error).message}`);
    return NextResponse.json(EMPTY);
  }
}
