// lib/scoring.ts
// Pure scoring functions for the Surprise Me wizard.
//
// Scoring formula (from the project spec):
//   total = 0.30 × weather + 0.30 × style + 0.25 × budget + 0.15 × duration
//
// Each component is 0-100. Final score also 0-100. The handler in
// /api/surprise/score uses these to rank candidates pulled from the
// seasonal_scores table.

import type { GroupType } from "@/lib/mockData";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ScoringPreferences {
  group: GroupType | null;
  groupSize: number;
  vibes: string[];                // ids: "beach" | "mountain" | "culture" | "nature" | "party" | "wellness"
  customVibe?: string;
  budgetPerPerson: number;        // INR per traveller
  duration: "weekend" | "short" | "long" | "extended" | null;
  avoid: string[];                // ids: "too-cold" | "too-hot" | "crowded" | "long-travel" | "international" | "remote"
  vegetarian?: boolean;
  familySafe?: boolean;
  coupleFriendly?: boolean;
}

export interface CandidateDestination {
  destination_id: string;
  slug: string;
  name: string;
  state: string;
  destination_type: string | null; // beach | hill_station | metro | heritage | ...
  region?: string | null;
  tags?: string[] | null;
  score: number;                   // 0-100 seasonal comfort score
  avg_temp_c: number | null;
  rain_mm: number | null;
}

export interface ScoredDestination extends CandidateDestination {
  matchScore: number;              // 0-100 weighted total
  matchReasons: string[];          // 2-3 short human reasons
  weatherScore: number;
  styleScore: number;
  budgetScore: number;
  durationScore: number;
  estimatedBudget: number;         // INR per person for the trip
  weatherSummary: string;          // "warm + dry · 28°C" etc.
}

// ---------------------------------------------------------------------------
// Vibe ↔ destination type affinity map (0-100 per pair)
// ---------------------------------------------------------------------------

const VIBE_TYPE_AFFINITY: Record<string, Record<string, number>> = {
  beach:    { beach: 100, island: 95, city: 30, metro: 30, heritage: 25, hill_station: 10, snow: 0,   desert: 10, pilgrimage: 20, wildlife: 30, offbeat: 40 },
  mountain: { snow: 100, hill_station: 95, offbeat: 80, wildlife: 60, nature: 90, heritage: 30, beach: 5,  metro: 10, city: 15, pilgrimage: 50, desert: 30, island: 5 },
  culture:  { heritage: 100, pilgrimage: 90, metro: 70, city: 70, offbeat: 50, hill_station: 40, beach: 30, wildlife: 30, snow: 30, desert: 40, island: 25 },
  nature:   { wildlife: 100, hill_station: 90, beach: 70, island: 80, snow: 80, offbeat: 75, desert: 70, heritage: 30, metro: 10, city: 20, pilgrimage: 40 },
  party:    { metro: 100, beach: 95, city: 70, island: 60, hill_station: 30, heritage: 25, snow: 10, desert: 20, pilgrimage: 0, wildlife: 0, offbeat: 30 },
  wellness: { hill_station: 90, beach: 85, offbeat: 80, pilgrimage: 80, wildlife: 50, heritage: 40, nature: 80, snow: 60, desert: 50, island: 80, city: 30, metro: 10 },
};

// ---------------------------------------------------------------------------
// Per-destination-type rough daily cost band (INR / person, mid-tier)
// ---------------------------------------------------------------------------

const DAILY_COST_BY_TYPE: Record<string, { min: number; mid: number; max: number }> = {
  metro:         { min: 3000, mid: 5000, max: 9000 },
  city:          { min: 2500, mid: 4500, max: 8000 },
  beach:         { min: 3000, mid: 6000, max: 12000 },
  hill_station:  { min: 2500, mid: 5000, max: 9000 },
  snow:          { min: 5000, mid: 9000, max: 18000 },
  desert:        { min: 4000, mid: 7000, max: 13000 },
  heritage:      { min: 2500, mid: 4500, max: 8000 },
  pilgrimage:    { min: 1500, mid: 3000, max: 5500 },
  wildlife:      { min: 4000, mid: 7500, max: 14000 },
  offbeat:       { min: 3000, mid: 5500, max: 10000 },
  island:        { min: 8000, mid: 13000, max: 22000 },
};

// ---------------------------------------------------------------------------
// Duration preference → days
// ---------------------------------------------------------------------------

export function daysForDuration(d: ScoringPreferences["duration"]): number {
  switch (d) {
    case "weekend":  return 3;
    case "short":    return 5;
    case "long":     return 8;
    case "extended": return 12;
    default:         return 5;
  }
}

// ---------------------------------------------------------------------------
// Avoid filtering — returns true if the destination should be DROPPED
// ---------------------------------------------------------------------------

export function shouldAvoid(
  cand: CandidateDestination,
  avoid: string[]
): { drop: boolean; reason?: string } {
  if (!avoid?.length) return { drop: false };

  for (const a of avoid) {
    if (a === "too-cold" && (cand.avg_temp_c != null && cand.avg_temp_c < 10)) {
      return { drop: true, reason: "too cold in this month" };
    }
    if (a === "too-hot" && (cand.avg_temp_c != null && cand.avg_temp_c > 32)) {
      return { drop: true, reason: "too hot in this month" };
    }
    if (a === "crowded" && (cand.destination_type === "metro" || cand.destination_type === "city")) {
      return { drop: true, reason: "user wants to avoid crowds" };
    }
    if (a === "remote" && (cand.destination_type === "offbeat" || cand.destination_type === "snow")) {
      return { drop: true, reason: "user wants to avoid remote spots" };
    }
    // "long-travel" and "international" are handled at the API layer (need fromCity)
    // "international" is moot — all our destinations are in India
  }
  return { drop: false };
}

// ---------------------------------------------------------------------------
// The four component scores (0-100 each)
// ---------------------------------------------------------------------------

function weatherScore(cand: CandidateDestination): number {
  return Math.max(0, Math.min(100, cand.score));
}

function styleScore(cand: CandidateDestination, vibes: string[]): number {
  if (!vibes.length) return 70; // no preference → neutral mid score
  const type = cand.destination_type ?? "city";
  const scores = vibes
    .map((v) => VIBE_TYPE_AFFINITY[v]?.[type] ?? 40)
    .sort((a, b) => b - a);
  // Take the best-matching vibe (most aspirational) blended with the average.
  // Pure best would over-reward, pure average under-reward people who picked
  // many vibes — the 0.6/0.4 blend balances it.
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const best = scores[0];
  return Math.round(best * 0.6 + avg * 0.4);
}

function budgetScore(
  cand: CandidateDestination,
  budgetPerPerson: number,
  days: number
): { score: number; estimated: number } {
  const type = cand.destination_type ?? "city";
  const band = DAILY_COST_BY_TYPE[type] ?? DAILY_COST_BY_TYPE.city;
  const estimated = band.mid * days;

  // Score how well the user's budget covers this estimated trip cost.
  // If budget >= estimated × 1.1 → 100 (comfortable)
  // If budget == estimated → 80
  // If budget == band.min × days → 50 (tight)
  // If budget < band.min × days → drops off linearly
  if (budgetPerPerson >= estimated * 1.1) return { score: 100, estimated };
  if (budgetPerPerson >= estimated)       return { score: 90,  estimated };
  if (budgetPerPerson >= band.min * days * 1.3) return { score: 75, estimated };
  if (budgetPerPerson >= band.min * days)       return { score: 55, estimated };
  // Below floor — penalty grows the further under we are.
  const ratio = budgetPerPerson / (band.min * days);
  return { score: Math.max(10, Math.round(ratio * 50)), estimated };
}

function durationScore(
  cand: CandidateDestination,
  duration: ScoringPreferences["duration"]
): number {
  if (!duration) return 75;
  const type = cand.destination_type ?? "city";

  // Affinity grid: which destination types are good for which trip lengths
  const grid: Record<string, Record<string, number>> = {
    weekend:  { metro: 95, city: 90, beach: 75, heritage: 80, pilgrimage: 70, hill_station: 70, offbeat: 30, snow: 20, desert: 30, wildlife: 40, island: 20 },
    short:    { metro: 80, city: 85, beach: 95, heritage: 90, pilgrimage: 80, hill_station: 95, offbeat: 70, snow: 70, desert: 80, wildlife: 75, island: 75 },
    long:     { metro: 50, city: 60, beach: 90, heritage: 95, pilgrimage: 70, hill_station: 90, offbeat: 90, snow: 95, desert: 90, wildlife: 95, island: 95 },
    extended: { metro: 30, city: 40, beach: 85, heritage: 90, pilgrimage: 70, hill_station: 80, offbeat: 95, snow: 100, desert: 85, wildlife: 95, island: 100 },
  };
  return grid[duration]?.[type] ?? 60;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function scoreDestination(
  cand: CandidateDestination,
  prefs: ScoringPreferences
): ScoredDestination {
  const days = daysForDuration(prefs.duration);

  const w = weatherScore(cand);
  const s = styleScore(cand, prefs.vibes);
  const { score: b, estimated } = budgetScore(cand, prefs.budgetPerPerson, days);
  const d = durationScore(cand, prefs.duration);

  // 0.30 weather + 0.30 style + 0.25 budget + 0.15 duration
  const total = Math.round(0.30 * w + 0.30 * s + 0.25 * b + 0.15 * d);

  return {
    ...cand,
    matchScore: total,
    matchReasons: buildReasons(cand, w, s, b, d, prefs),
    weatherScore: w,
    styleScore: s,
    budgetScore: b,
    durationScore: d,
    estimatedBudget: estimated,
    weatherSummary: weatherSummaryText(cand),
  };
}

function buildReasons(
  cand: CandidateDestination,
  w: number, s: number, b: number, d: number,
  prefs: ScoringPreferences
): string[] {
  const reasons: string[] = [];

  if (w >= 80) reasons.push(`Excellent weather (${cand.avg_temp_c?.toFixed(0) ?? "?"}°C, low rain)`);
  else if (w >= 60) reasons.push(`Comfortable weather this month`);

  if (s >= 80 && prefs.vibes.length) {
    const topVibe = prefs.vibes[0];
    const label = { beach: "beaches", mountain: "mountains", culture: "culture & heritage", nature: "nature", party: "nightlife", wellness: "slow / wellness" }[topVibe] ?? topVibe;
    reasons.push(`Strong fit for ${label}`);
  }

  if (b >= 80) reasons.push(`Within your ₹${(prefs.budgetPerPerson / 1000).toFixed(0)}k/person budget`);
  else if (b >= 60) reasons.push(`Budget works with some flex`);

  if (d >= 85) reasons.push(`Ideal for a ${prefs.duration ?? "short"} trip`);

  // Always at least 1 reason
  if (reasons.length === 0) {
    reasons.push(`Solid all-round match for your preferences`);
  }
  return reasons.slice(0, 3);
}

function weatherSummaryText(cand: CandidateDestination): string {
  const temp = cand.avg_temp_c != null ? `${cand.avg_temp_c.toFixed(0)}°C avg` : "—";
  const rain = cand.rain_mm != null
    ? cand.rain_mm < 50 ? "dry" : cand.rain_mm < 200 ? "light rain" : "heavy rain"
    : "";
  return rain ? `${temp} · ${rain}` : temp;
}
