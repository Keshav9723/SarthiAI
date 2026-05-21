// app/api/surprise/score/route.ts
// Surprise Me scoring endpoint. Takes the wizard's preferences and returns the
// top-5 ranked destinations with match scores + reasons.
//
// Architecture (no LLM needed for ranking — pure scoring):
//   1. Resolve the travel month from startDate (or pick a sensible default)
//   2. Pull candidates from the seasonal_scores table for that month, scored
//      by climate comfort (>= 50)
//   3. Apply avoid filters
//   4. Run the scoring formula (weather/style/budget/duration weights)
//   5. Sort, take top 5, attach image + tagline metadata
//   6. Return as DestinationMatch[]-shaped JSON

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import {
  scoreDestination,
  shouldAvoid,
  daysForDuration,
  type CandidateDestination,
  type ScoringPreferences,
} from "@/lib/scoring";
import { getDestinationImages } from "@/lib/api/destination-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SurpriseRequestSchema = z.object({
  group: z.enum(["couple", "family", "friends", "solo"]).nullable(),
  groupSize: z.number().int().min(1).max(20),
  vibes: z.array(z.string()).default([]),
  customVibe: z.string().optional(),
  budget: z.number().int().min(5000),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.enum(["weekend", "short", "long", "extended"]).nullable(),
  avoid: z.array(z.string()).default([]),
  vegetarian: z.boolean().optional(),
  familySafe: z.boolean().optional(),
  coupleFriendly: z.boolean().optional(),
});

interface RpcRow {
  destination_id: string;
  slug: string;
  name: string;
  state: string;
  destination_type: string | null;
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
  tags: string[] | null;
}

interface DestinationExtras {
  id: string;
  tagline: string | null;
  image: string | null;
  region: string | null;
}

export async function POST(req: NextRequest) {
  // ---- Validate body ----
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = SurpriseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // ---- Resolve target month ----
  const month = resolveMonth(input.startDate);

  // ---- Pull candidates from the DB ----
  const sb = createServerClient();
  const { data: rows, error } = await sb.rpc("best_destinations_for_month", {
    target_month: month,
    min_score: 50,       // lower than the default — we'll re-rank ourselves
    result_limit: 40,    // pull more candidates than we need so the avoid + scoring
                         // filters have room to work
  });
  if (error) {
    return NextResponse.json(
      { error: `Database query failed: ${error.message}` },
      { status: 500 }
    );
  }

  const candidates: CandidateDestination[] = (rows ?? []).map((r: RpcRow) => ({
    destination_id: r.destination_id,
    slug: r.slug,
    name: r.name,
    state: r.state,
    destination_type: r.destination_type,
    region: null,
    tags: r.tags,
    score: r.score,
    avg_temp_c: r.avg_temp_c == null ? null : Number(r.avg_temp_c),
    rain_mm: r.rain_mm == null ? null : Number(r.rain_mm),
  }));

  // ---- Apply avoid filters ----
  const filtered = candidates.filter((c) => !shouldAvoid(c, input.avoid).drop);

  // ---- Score + sort ----
  const prefs: ScoringPreferences = {
    group: input.group,
    groupSize: input.groupSize,
    vibes: input.vibes,
    customVibe: input.customVibe,
    budgetPerPerson: input.budget,
    duration: input.duration,
    avoid: input.avoid,
    vegetarian: input.vegetarian,
    familySafe: input.familySafe,
    coupleFriendly: input.coupleFriendly,
  };

  const scored = filtered
    .map((c) => scoreDestination(c, prefs))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  if (scored.length === 0) {
    return NextResponse.json(
      {
        error: "No destinations matched your preferences. Try loosening 'avoid' or expanding your budget.",
      },
      { status: 404 }
    );
  }

  // ---- Enrich with taglines from destinations table ----
  const ids = scored.map((s) => s.destination_id);
  const { data: extras } = await sb
    .from("destinations")
    .select("id, tagline, image, region")
    .in("id", ids);
  const extrasMap = new Map<string, DestinationExtras>(
    (extras ?? []).map((e) => [e.id, e as DestinationExtras])
  );

  // ---- Resolve images via Unsplash (cached to DB after first hit) ----
  const imageMap = await getDestinationImages(
    scored.map((s) => ({ slug: s.slug, name: s.name }))
  );

  // ---- Shape response as DestinationMatch (matches frontend type) ----
  const days = daysForDuration(input.duration);
  const results = scored.map((s) => {
    const x = extrasMap.get(s.destination_id);
    const img = imageMap.get(s.slug);
    return {
      id: s.slug,
      name: s.name,
      state: s.state,
      tagline: x?.tagline ?? `${s.destination_type ?? "Destination"} in ${s.state}`,
      description: "",
      image: img?.url ?? `https://picsum.photos/seed/${s.slug}/640/360`,
      gallery: [],
      tags: s.tags ?? [s.destination_type ?? "destination"].filter(Boolean),
      bestFor: input.group ? [input.group] : [],
      season: monthName(month),
      bestMonths: [monthName(month)],
      budgetFrom: s.estimatedBudget,
      recommendedDuration: `${days} days`,
      weather: s.weatherSummary,
      temperature: s.avg_temp_c != null ? `${s.avg_temp_c.toFixed(0)}°C` : "—",
      // DestinationMatch additions:
      matchScore: s.matchScore,
      matchReasons: s.matchReasons,
      estimatedBudget: s.estimatedBudget,
      weatherSummary: s.weatherSummary,
    };
  });

  return NextResponse.json({
    month,
    monthName: monthName(month),
    days,
    candidatesEvaluated: filtered.length,
    results,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveMonth(startDate?: string): number {
  if (startDate) {
    const m = new Date(startDate).getUTCMonth() + 1;
    if (m >= 1 && m <= 12) return m;
  }
  // Default: pick the month 2 months out (gives shoulder-season flexibility)
  const now = new Date();
  return ((now.getUTCMonth() + 2) % 12) + 1;
}

function monthName(m: number): string {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][m - 1];
}
