// lib/api/insights.ts
// LLM-judged price comparison. Given a category (flight/train/hotel/etc.), a
// route or destination, the travel month, and the actual price, asks the LLM
// whether the price is LOW / NORMAL / HIGH versus typical and writes a short
// recommendation.
//
// No external API needed — pure local LLM. Always works.

import { generateStructured } from "./llm";
import { z } from "zod";

const InsightSchema = z.object({
  verdict: z.enum(["low", "normal", "high"]),
  typical_min_inr: z.number().int().nonnegative(),
  typical_max_inr: z.number().int().nonnegative(),
  margin_pct: z.number(),
  reasoning: z.string(),
  recommendation: z.string(),
});

export interface PriceInsight {
  verdict: "low" | "normal" | "high";
  typical_min_inr: number;
  typical_max_inr: number;
  margin_pct: number;       // signed: -15 = 15% below typical avg
  reasoning: string;
  recommendation: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function comparePriceToTypical(opts: {
  category: "flight" | "train" | "bus" | "drive" | "hotel";
  routeOrDestination: string;     // "DEL→KUU" or "Manali"
  month: number;                  // 1-12
  priceInr: number;
  passengers?: number;             // for transport categories
}): Promise<PriceInsight> {
  const monthName = MONTH_NAMES[opts.month - 1];
  const passText = opts.passengers ? ` for ${opts.passengers} passenger${opts.passengers > 1 ? "s" : ""}` : "";
  const system =
    `You are a pricing analyst for Indian travel. Compare a given price ` +
    `against typical prices for that route/destination in that month. ` +
    `Return JSON only. Be specific and grounded in seasonal travel patterns.`;
  const user =
    `Category: ${opts.category}\n` +
    `Route or destination: ${opts.routeOrDestination}\n` +
    `Month: ${monthName}\n` +
    `Actual price${passText}: ₹${opts.priceInr.toLocaleString("en-IN")}\n\n` +
    `Output schema:\n` +
    `{\n` +
    `  "verdict": "low" | "normal" | "high",\n` +
    `  "typical_min_inr": <integer — bottom of typical range for this category/route/month>,\n` +
    `  "typical_max_inr": <integer — top of typical range>,\n` +
    `  "margin_pct": <signed integer — % difference from typical midpoint; negative = below typical>,\n` +
    `  "reasoning": "<one sentence: what season is this, why the typical range looks like it does>",\n` +
    `  "recommendation": "<one sentence: book now / wait if you can / try alternatives>"\n` +
    `}`;

  try {
    const r = await generateStructured({
      system, user, schema: InsightSchema, temperature: 0.3, maxRetries: 1,
    });
    return r;
  } catch (err) {
    // Last-resort: return a neutral verdict so the orchestrator doesn't crash
    return {
      verdict: "normal",
      typical_min_inr: Math.round(opts.priceInr * 0.85),
      typical_max_inr: Math.round(opts.priceInr * 1.15),
      margin_pct: 0,
      reasoning: "Insight unavailable — could not reach LLM judge.",
      recommendation: "Compare with at least one other source before booking.",
    };
  }
}
