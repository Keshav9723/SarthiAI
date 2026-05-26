// lib/intents/handlers/surpriseMe.ts
// "Where should I go in <month>" — uses seasonal_scores' best_destinations_for_month
// RPC to fetch climate-suitable candidates, joins their budget data from the
// destinations table, applies user budget + duration + group filters, then
// asks the LLM to write a friendly recommendation.

import { streamText } from "@/lib/api/llm/stream";
import { createServerClient } from "@/lib/supabase/server";
import type { HandlerContext, HandlerEvent } from "../types";

const SYSTEM = `You are Sarthi, an Indian travel assistant. The user gave you their
constraints (budget, days, group). Recommend 2-4 destinations from the ranked list
provided that genuinely fit those constraints. For each pick, briefly explain why
(climate score, budget fit, days suitability). If a destination busts the budget,
say so honestly instead of recommending it. Conversational tone. End with a
follow-up suggestion ("would you prefer hills or beaches?").`;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface RpcRow {
  destination_id: string;
  slug: string;
  name: string;
  state: string;
  destination_type: string | null;
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
}

interface DestBudgetRow {
  id: string;
  budget_from: number | null;
  recommended_duration: string | null;
  trending_rank: number | null;
}

export async function* handleSurpriseMe(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  // Pull every constraint the classifier extracted from the message
  const ex = ctx.classification.extracted ?? {};
  const monthFromExtraction = ex.month ?? null;
  const budget = ex.budget_inr ?? null;
  const days = ex.days ?? null;
  const group = ex.group ?? null;

  // Month default: next month from today
  const now = new Date();
  const month = monthFromExtraction ?? (((now.getUTCMonth() + 1) % 12) + 1);
  const monthName = MONTH_NAMES[month - 1];

  // Fetch top climate-comfort candidates for the month
  const sb = createServerClient();
  const { data, error } = await sb.rpc("best_destinations_for_month", {
    target_month: month,
    min_score: 65,
    result_limit: 12,  // pull more so the budget filter has room to cut
  });
  if (error) {
    yield {
      type: "token",
      content: `Couldn't fetch destination scores: ${error.message}`,
    };
    return;
  }

  let rows = (data ?? []) as RpcRow[];
  if (rows.length === 0) {
    yield {
      type: "token",
      content: `No high-comfort destinations matched ${monthName} above the threshold. Try a different month?`,
    };
    return;
  }

  // Join each candidate with its budget + duration + popularity metadata.
  const ids = rows.map((r) => r.destination_id);
  const { data: destData } = await sb
    .from("destinations")
    .select("id, budget_from, recommended_duration, trending_rank")
    .in("id", ids);
  const budgetMap = new Map<string, DestBudgetRow>(
    (destData ?? []).map((d) => [(d as DestBudgetRow).id, d as DestBudgetRow])
  );

  // Apply soft budget filter — drop destinations whose `budget_from` is 50%+
  // over the user's stated budget. Keep ones at-or-under, and ones we lack
  // data for (better to recommend than to silently drop).
  if (budget && budget > 0) {
    rows = rows.filter((r) => {
      const b = budgetMap.get(r.destination_id)?.budget_from;
      if (b == null) return true;
      return b <= budget * 1.5;
    });
  }

  // Bias toward FAMOUS destinations — we marked the 12 most well-known with
  // a trending_rank in the destinations table. Pull those first, then fill
  // with any remaining lesser-known candidates so the user still gets a mix.
  // This prevents recommendations like "Kasol" when the user would expect
  // "Manali" or "Goa" as default suggestions.
  const famous = rows.filter((r) => budgetMap.get(r.destination_id)?.trending_rank != null);
  const lesserKnown = rows.filter((r) => budgetMap.get(r.destination_id)?.trending_rank == null);

  // Sort famous ones by trending_rank (lower rank = more popular), then by
  // climate score; sort lesser-known purely by climate score.
  famous.sort((a, b) => {
    const ra = budgetMap.get(a.destination_id)?.trending_rank ?? 99;
    const rb = budgetMap.get(b.destination_id)?.trending_rank ?? 99;
    if (ra !== rb) return ra - rb;
    return b.score - a.score;
  });
  lesserKnown.sort((a, b) => b.score - a.score);

  // Take up to 5 famous + 3 lesser-known for variety. If we have fewer than
  // 5 famous matches (e.g. tight budget excluded most), fill from lesser.
  rows = [...famous.slice(0, 5), ...lesserKnown.slice(0, 3)].slice(0, 8);

  if (rows.length === 0) {
    yield {
      type: "token",
      content: `No destinations under your ₹${budget?.toLocaleString("en-IN")} budget had good ${monthName} weather. Try bumping the budget by 30% or pick a different month.`,
    };
    return;
  }

  // Build candidates block — include budget + duration so the LLM can pick smartly
  const candidates = rows
    .map((r) => {
      const meta = budgetMap.get(r.destination_id);
      const bits = [
        `score ${r.score}/100`,
        `${r.avg_temp_c?.toFixed(0) ?? "?"}°C`,
        `${r.rain_mm?.toFixed(0) ?? "?"} mm rain`,
      ];
      if (meta?.budget_from) bits.push(`budget from ₹${meta.budget_from.toLocaleString("en-IN")}/pax`);
      if (meta?.recommended_duration) bits.push(`${meta.recommended_duration}`);
      return `  • ${r.name}, ${r.state} (${r.destination_type ?? "—"}) — ${bits.join(", ")}`;
    })
    .join("\n");

  // Build user prompt — explicitly surface every constraint
  const constraints: string[] = [`Travel month: ${monthName}`];
  if (budget) constraints.push(`Budget: ₹${budget.toLocaleString("en-IN")} per person`);
  if (days) constraints.push(`Duration: ${days} days`);
  if (group) constraints.push(`Group type: ${group}`);

  const user =
    `User asked for destination recommendations with these constraints:\n` +
    constraints.map((c) => `  - ${c}`).join("\n") +
    `\n\nClimate-suitable candidates (already filtered to fit ${monthName} comfort and roughly within budget):\n\n` +
    candidates +
    `\n\nPick the 3-4 most varied/compelling options. For each, mention:\n` +
    `  - Why this month works (climate score + temp/rain)\n` +
    (budget ? `  - Whether it fits the ₹${budget.toLocaleString("en-IN")} budget (compare 'budget from' to user's budget × days)\n` : "") +
    (days ? `  - Whether ${days} days is the right length (compare to recommended duration)\n` : "") +
    `End with a refinement question.`;

  try {
    for await (const token of streamText({
      system: SYSTEM,
      user,
      temperature: 0.5,
      maxTokens: 800,
    })) {
      yield { type: "token", content: token };
    }
  } catch (err) {
    yield { type: "error", message: (err as Error).message };
    return;
  }

  yield {
    type: "metadata",
    data: {
      month: monthName,
      budget,
      days,
      group,
      candidates: rows.slice(0, 5).map((r) => ({
        slug: r.slug,
        name: r.name,
        state: r.state,
        score: r.score,
        budget_from: budgetMap.get(r.destination_id)?.budget_from ?? null,
      })),
    },
  };
}
