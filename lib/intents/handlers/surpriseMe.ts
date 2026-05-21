// lib/intents/handlers/surpriseMe.ts
// "Where should I go in <month>" — uses seasonal_scores' best_destinations_for_month
// RPC to return ranked destinations, then asks the LLM to write a short
// human-friendly recommendation.

import { streamText } from "@/lib/api/llm/stream";
import { createServerClient } from "@/lib/supabase/server";
import type { HandlerContext, HandlerEvent } from "../types";

const SYSTEM = `You are Sarthi, an Indian travel assistant. Briefly recommend
2-4 destinations from the ranked list provided. For each, mention the climate
score and what makes that month a good fit. Conversational tone. End with a
prompt suggesting the user can refine ("would you prefer hills or beaches?").`;

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

export async function* handleSurpriseMe(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  // Determine month. If the user didn't say one, use next month.
  const now = new Date();
  const monthFromExtraction = ctx.classification.extracted?.month ?? null;
  const month = monthFromExtraction ?? (((now.getUTCMonth() + 1) % 12) + 1);
  const monthName = MONTH_NAMES[month - 1];

  // Pull top 8 candidates from the DB
  const sb = createServerClient();
  const { data, error } = await sb.rpc("best_destinations_for_month", {
    target_month: month,
    min_score: 70,
    result_limit: 8,
  });
  if (error) {
    yield {
      type: "token",
      content: `Couldn't fetch destination scores: ${error.message}`,
    };
    return;
  }

  const rows = (data ?? []) as RpcRow[];
  if (rows.length === 0) {
    yield {
      type: "token",
      content: `No high-comfort destinations matched ${monthName} above the threshold. Try a different month?`,
    };
    return;
  }

  const candidates = rows
    .map(
      (r) =>
        `  • ${r.name}, ${r.state} (${r.destination_type ?? "—"}) — score ${r.score}/100, avg ${r.avg_temp_c?.toFixed(0) ?? "?"}°C, ${r.rain_mm?.toFixed(0) ?? "?"} mm rain`
    )
    .join("\n");

  const user =
    `User asked where to go in ${monthName}. Here are the top-scored candidates from our climate database:\n\n` +
    candidates +
    `\n\nPick the 3-4 most varied/compelling options and write a friendly recommendation. Mention each one's score briefly.`;

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
      candidates: rows.slice(0, 5).map((r) => ({
        slug: r.slug, name: r.name, state: r.state, score: r.score,
      })),
    },
  };
}
