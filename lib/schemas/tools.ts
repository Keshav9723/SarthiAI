// lib/schemas/tools.ts
// Zod schemas for all orchestrator tool inputs and outputs. These doubly serve
// as the source of truth for the tool definitions sent to the LLM, AND for
// runtime validation of LLM-emitted tool calls + handler return values.

import { z } from "zod";
import { ALL_CONTENT_TYPES } from "@/lib/types/content";

// ===========================================================================
// get_destination_facts — RAG retrieval
// ===========================================================================

export const GetDestinationFactsArgs = z.object({
  query: z.string().min(1),
  destination_id: z.string().uuid().optional(),
  content_types: z.array(z.enum(ALL_CONTENT_TYPES as [string, ...string[]])).optional(),
  k: z.number().int().min(1).max(20).default(8),
});
export type GetDestinationFactsArgs = z.infer<typeof GetDestinationFactsArgs>;

export const GetDestinationFactsResult = z.object({
  chunks: z.array(
    z.object({
      content_type: z.string(),
      source: z.string(),
      heading: z.string().nullable(),
      text: z.string(),
      similarity: z.number(),
    })
  ),
});
export type GetDestinationFactsResult = z.infer<typeof GetDestinationFactsResult>;

// ===========================================================================
// get_climate — seasonal_scores lookup
// ===========================================================================

export const GetClimateArgs = z.object({
  destination_id: z.string().uuid(),
  month: z.number().int().min(1).max(12).optional(),
});
export type GetClimateArgs = z.infer<typeof GetClimateArgs>;

export const GetClimateResult = z.object({
  destination: z.string(),
  scores: z.array(
    z.object({
      month: z.number(),
      score: z.number(),
      avg_temp_c: z.number().nullable(),
      rain_mm: z.number().nullable(),
      humidity_pct: z.number().nullable(),
    })
  ),
  best_months: z.array(z.number()),
});
export type GetClimateResult = z.infer<typeof GetClimateResult>;

// ===========================================================================
// get_transport_quotes — flights + trains + driving in parallel
// ===========================================================================

export const GetTransportQuotesArgs = z.object({
  origin_city: z.string().min(1),
  destination_city: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  passengers: z.number().int().min(1).max(20),
});
export type GetTransportQuotesArgs = z.infer<typeof GetTransportQuotesArgs>;

export const TransportModeQuote = z.object({
  mode: z.enum(["flight", "train", "bus", "drive"]),
  available: z.boolean(),
  cheapest_inr: z.number().nullable(),
  average_inr: z.number().nullable(),
  duration_minutes: z.number().nullable(),
  notes: z.string().optional(),
  is_mock: z.boolean(),
});
export type TransportModeQuote = z.infer<typeof TransportModeQuote>;

export const GetTransportQuotesResult = z.object({
  quotes: z.array(TransportModeQuote),
  total_distance_km: z.number().nullable(),
  recommended_mode: z.enum(["flight", "train", "bus", "drive"]).nullable(),
});
export type GetTransportQuotesResult = z.infer<typeof GetTransportQuotesResult>;

// ===========================================================================
// get_hotel_prices — Amadeus or LLM-estimated bands
// ===========================================================================

export const GetHotelPricesArgs = z.object({
  destination: z.string().min(1),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nights: z.number().int().min(1).max(60),
  tier: z.enum(["budget", "mid", "luxury"]),
});
export type GetHotelPricesArgs = z.infer<typeof GetHotelPricesArgs>;

export const GetHotelPricesResult = z.object({
  tier: z.enum(["budget", "mid", "luxury"]),
  min_inr_per_night: z.number(),
  avg_inr_per_night: z.number(),
  max_inr_per_night: z.number(),
  total_for_stay_inr: z.number(),
  notes: z.string().optional(),
  is_mock: z.boolean(),
});
export type GetHotelPricesResult = z.infer<typeof GetHotelPricesResult>;

// ===========================================================================
// get_local_transport_estimate — taxi/cab/auto inside the destination
// ===========================================================================

export const GetLocalTransportArgs = z.object({
  destination: z.string().min(1),
  days: z.number().int().min(1).max(60),
});
export type GetLocalTransportArgs = z.infer<typeof GetLocalTransportArgs>;

export const GetLocalTransportResult = z.object({
  daily_estimate_inr: z.number(),
  total_estimate_inr: z.number(),
  primary_mode: z.string(),  // "rental car", "taxi", "auto", "metro+walk"
  notes: z.string(),
});
export type GetLocalTransportResult = z.infer<typeof GetLocalTransportResult>;

// ===========================================================================
// compare_to_typical — LLM-judged "low/normal/high"
// ===========================================================================

export const CompareToTypicalArgs = z.object({
  category: z.enum(["flight", "train", "bus", "drive", "hotel"]),
  route_or_destination: z.string().min(1),
  month: z.number().int().min(1).max(12),
  price_inr: z.number().nonnegative(),
  passengers: z.number().int().min(1).default(1),
});
export type CompareToTypicalArgs = z.infer<typeof CompareToTypicalArgs>;

export const CompareToTypicalResult = z.object({
  verdict: z.enum(["low", "normal", "high"]),
  typical_min_inr: z.number(),
  typical_max_inr: z.number(),
  margin_pct: z.number(),  // signed: -15 = 15% below typical
  reasoning: z.string(),
  recommendation: z.string(),
});
export type CompareToTypicalResult = z.infer<typeof CompareToTypicalResult>;

// ===========================================================================
// get_festivals — Calendarific holidays + cultural events
// ===========================================================================

export const GetFestivalsArgs = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2024).max(2030),
  destination: z.string().optional(),  // narrows by location if set
});
export type GetFestivalsArgs = z.infer<typeof GetFestivalsArgs>;

export const GetFestivalsResult = z.object({
  festivals: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      type: z.array(z.string()),
      description: z.string(),
      locations: z.string().nullable(),
    })
  ),
});
export type GetFestivalsResult = z.infer<typeof GetFestivalsResult>;
