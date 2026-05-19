// lib/orchestrator/tools.ts
// The tool registry. Defines every tool the orchestrator can dispatch to,
// pairs each name with its Zod schema + JSON schema + handler. Handlers wrap
// the underlying lib/api/* modules so the LLM doesn't have to know about
// pricing details or Supabase RPCs.

import { z } from "zod";
import { retrieveContext } from "@/lib/api/rag";
import { createServerClient } from "@/lib/supabase/server";
import { getFlightQuote } from "@/lib/api/amadeus";
import { getTrainQuote } from "@/lib/api/trains";
import { getDrivingRoute } from "@/lib/api/maps";
import { getHotelQuote } from "@/lib/api/hotels";
import { comparePriceToTypical } from "@/lib/api/insights";
import { distanceBetween } from "@/lib/api/codes";
import {
  GetDestinationFactsArgs, GetDestinationFactsResult,
  GetClimateArgs, GetClimateResult,
  GetTransportQuotesArgs, GetTransportQuotesResult,
  GetHotelPricesArgs, GetHotelPricesResult,
  GetLocalTransportArgs, GetLocalTransportResult,
  CompareToTypicalArgs, CompareToTypicalResult,
  type TransportModeQuote,
} from "@/lib/schemas/tools";
import type { ToolSpec } from "./types";

// Helper: turn a Zod schema into a JSON-Schema-shaped object for the LLM.
// We pass it directly through Zod's built-in JSON-schema generator if
// available, else we hand-write small JSON schemas. To stay independent of
// optional zod-to-json-schema packages, each tool below provides its own
// jsonSchema object manually.

// ===========================================================================
// 1. get_destination_facts — RAG retrieval
// ===========================================================================

export const getDestinationFactsTool: ToolSpec<
  z.infer<typeof GetDestinationFactsArgs>,
  z.infer<typeof GetDestinationFactsResult>
> = {
  name: "get_destination_facts",
  description:
    "Retrieve relevant verified facts about a destination from the knowledge base. " +
    "Use this to learn about specific attractions, food, culture, safety, etc. " +
    "Optionally filter by content_types (e.g. ['food','activities']). " +
    "Returns ranked chunks with source attribution.",
  argsSchema: GetDestinationFactsArgs,
  resultSchema: GetDestinationFactsResult,
  jsonSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What you want to learn about" },
      destination_id: {
        type: "string",
        description: "UUID of the destination from destinations.id. Required unless searching across all destinations.",
      },
      content_types: {
        type: "array",
        items: { type: "string" },
        description: "Optional filter — narrow to specific categories (e.g. ['food','attractions']).",
      },
      k: { type: "integer", default: 8, description: "Number of facts to retrieve, 1-20." },
    },
    required: ["query"],
  },
  handler: async (args) => {
    const chunks = await retrieveContext({
      query: args.query,
      destinationId: args.destination_id,
      contentTypes: args.content_types as any,
      k: args.k,
    });
    return {
      chunks: chunks.map((c) => ({
        content_type: c.contentType,
        source: c.sourceName,
        heading: c.heading,
        text: c.text,
        similarity: Number(c.similarity.toFixed(3)),
      })),
    };
  },
};

// ===========================================================================
// 2. get_climate — seasonal_scores lookup
// ===========================================================================

export const getClimateTool: ToolSpec<
  z.infer<typeof GetClimateArgs>,
  z.infer<typeof GetClimateResult>
> = {
  name: "get_climate",
  description:
    "Get climate / seasonal tourist-comfort scores for a destination. " +
    "Returns monthly avg temperature, rainfall, humidity, and a 0-100 comfort score. " +
    "Use this to judge whether a given month is good to visit.",
  argsSchema: GetClimateArgs,
  resultSchema: GetClimateResult,
  jsonSchema: {
    type: "object",
    properties: {
      destination_id: { type: "string", description: "UUID from destinations.id" },
      month: { type: "integer", minimum: 1, maximum: 12, description: "Optional — restrict to one month" },
    },
    required: ["destination_id"],
  },
  handler: async (args) => {
    const sb = createServerClient();
    const [{ data: dest }, { data: scores }] = await Promise.all([
      sb.from("destinations").select("name").eq("id", args.destination_id).maybeSingle(),
      sb.from("seasonal_scores")
        .select("month, score, avg_temp_c, rain_mm, humidity_pct")
        .eq("destination_id", args.destination_id)
        .order("month"),
    ]);
    const monthly = (scores ?? []).filter(
      (s) => args.month == null || s.month === args.month
    );
    const ranked = [...(scores ?? [])].sort((a, b) => b.score - a.score);
    return {
      destination: dest?.name ?? "(unknown)",
      scores: monthly.map((s) => ({
        month: s.month,
        score: s.score,
        avg_temp_c: s.avg_temp_c == null ? null : Number(s.avg_temp_c),
        rain_mm: s.rain_mm == null ? null : Number(s.rain_mm),
        humidity_pct: s.humidity_pct == null ? null : s.humidity_pct,
      })),
      best_months: ranked.slice(0, 3).map((s) => s.month),
    };
  },
};

// ===========================================================================
// 3. get_transport_quotes — flights + trains + drive in parallel
// ===========================================================================

export const getTransportQuotesTool: ToolSpec<
  z.infer<typeof GetTransportQuotesArgs>,
  z.infer<typeof GetTransportQuotesResult>
> = {
  name: "get_transport_quotes",
  description:
    "Get prices for all available transport modes between two Indian cities on a specific date. " +
    "Returns flight (Amadeus), train (IRCTC), bus (estimate), and self-drive options. " +
    "Each option flags whether it's available, the price per passenger, and duration.",
  argsSchema: GetTransportQuotesArgs,
  resultSchema: GetTransportQuotesResult,
  jsonSchema: {
    type: "object",
    properties: {
      origin_city: { type: "string" },
      destination_city: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD departure date" },
      passengers: { type: "integer", minimum: 1, maximum: 20 },
    },
    required: ["origin_city", "destination_city", "date", "passengers"],
  },
  handler: async (args) => {
    const [flight, train, drive] = await Promise.all([
      getFlightQuote({
        originCity: args.origin_city, destinationCity: args.destination_city,
        date: args.date, passengers: args.passengers,
      }),
      getTrainQuote({
        originCity: args.origin_city, destinationCity: args.destination_city,
        date: args.date, passengers: args.passengers,
      }),
      getDrivingRoute({
        originCity: args.origin_city, destinationCity: args.destination_city,
      }),
    ]);

    const distKm = distanceBetween(args.origin_city, args.destination_city);

    const quotes: TransportModeQuote[] = [
      {
        mode: "flight",
        available: flight.available,
        cheapest_inr: flight.cheapest_inr,
        average_inr: flight.average_inr,
        duration_minutes: flight.duration_minutes,
        notes: flight.notes,
        is_mock: flight.is_mock,
      },
      {
        mode: "train",
        available: !!train.available,
        cheapest_inr: train.cheapest_inr,
        average_inr: train.average_inr,
        duration_minutes: train.duration_minutes,
        notes: train.notes,
        is_mock: train.is_mock,
      },
    ];

    // Bus: estimate only if distance < 1200 km (longer is impractical)
    if (distKm != null && distKm < 1200) {
      const estPerPax = Math.round(distKm * 1.8 + 400); // ₹1.8/km + booking surcharge
      quotes.push({
        mode: "bus",
        available: true,
        cheapest_inr: estPerPax,
        average_inr: Math.round(estPerPax * 1.15),
        duration_minutes: Math.round((distKm / 45) * 60), // 45 km/h avg
        notes: "Estimated — Volvo/AC sleeper class",
        is_mock: true,
      });
    } else {
      quotes.push({
        mode: "bus",
        available: false,
        cheapest_inr: null, average_inr: null, duration_minutes: null,
        notes: distKm == null ? "Unknown route" : "Too far for bus (>1200 km)",
        is_mock: false,
      });
    }

    if (drive) {
      // Drive cost scales with group_size only via fuel split — not per pax
      const totalDrive = drive.estimated_fuel_inr + drive.toll_estimate_inr;
      const perPax = Math.round(totalDrive / Math.max(1, args.passengers));
      quotes.push({
        mode: "drive",
        available: true,
        cheapest_inr: perPax,
        average_inr: perPax,
        duration_minutes: drive.duration_minutes,
        notes: `${drive.distance_km} km — fuel ₹${drive.estimated_fuel_inr} + tolls ₹${drive.toll_estimate_inr}, split across ${args.passengers}`,
        is_mock: drive.is_mock,
      });
    } else {
      quotes.push({
        mode: "drive",
        available: false,
        cheapest_inr: null, average_inr: null, duration_minutes: null,
        notes: "No drivable route data",
        is_mock: false,
      });
    }

    // Recommend cheapest available
    const viable = quotes.filter((q) => q.available && q.cheapest_inr != null);
    viable.sort((a, b) => (a.cheapest_inr! - b.cheapest_inr!));
    const recommended = viable[0]?.mode ?? null;

    return {
      quotes,
      total_distance_km: distKm,
      recommended_mode: recommended,
    };
  },
};

// ===========================================================================
// 4. get_hotel_prices
// ===========================================================================

export const getHotelPricesTool: ToolSpec<
  z.infer<typeof GetHotelPricesArgs>,
  z.infer<typeof GetHotelPricesResult>
> = {
  name: "get_hotel_prices",
  description:
    "Estimate hotel prices for a destination across a date range and tier. " +
    "Returns min/avg/max per-night prices and total for the stay. Uses Amadeus " +
    "where available, falls back to LLM-judged bands for destinations Amadeus doesn't cover.",
  argsSchema: GetHotelPricesArgs,
  resultSchema: GetHotelPricesResult,
  jsonSchema: {
    type: "object",
    properties: {
      destination: { type: "string" },
      check_in: { type: "string", description: "YYYY-MM-DD" },
      nights: { type: "integer", minimum: 1, maximum: 60 },
      tier: { type: "string", enum: ["budget", "mid", "luxury"] },
    },
    required: ["destination", "check_in", "nights", "tier"],
  },
  handler: async (args) => {
    const q = await getHotelQuote({
      destination: args.destination,
      checkIn: args.check_in,
      nights: args.nights,
      tier: args.tier,
    });
    return q;
  },
};

// ===========================================================================
// 5. get_local_transport_estimate — taxis/autos within the destination
// ===========================================================================

export const getLocalTransportEstimateTool: ToolSpec<
  z.infer<typeof GetLocalTransportArgs>,
  z.infer<typeof GetLocalTransportResult>
> = {
  name: "get_local_transport_estimate",
  description:
    "Estimate per-day local transport cost inside a destination — taxis, autos, " +
    "rented bikes, or rental cars depending on the destination type. Use after " +
    "knowing how many days the user is staying.",
  argsSchema: GetLocalTransportArgs,
  resultSchema: GetLocalTransportResult,
  jsonSchema: {
    type: "object",
    properties: {
      destination: { type: "string" },
      days: { type: "integer", minimum: 1, maximum: 60 },
    },
    required: ["destination", "days"],
  },
  handler: async (args) => {
    // Simple heuristic by destination type — looked up via Supabase
    const sb = createServerClient();
    const { data: dest } = await sb
      .from("destinations").select("destination_type")
      .ilike("name", args.destination).maybeSingle();
    const type = dest?.destination_type ?? "city";

    const dailyMap: Record<string, { daily: number; mode: string; notes: string }> = {
      metro:         { daily: 800,  mode: "metro + taxi mix",    notes: "Metro covers most attractions; supplement with Uber/Ola" },
      city:          { daily: 700,  mode: "auto + taxi",         notes: "Auto-rickshaw ₹15-25/km, Ola/Uber for longer hops" },
      beach:         { daily: 900,  mode: "rented scooter",      notes: "Rent a scooter ₹400-500/day + fuel" },
      hill_station:  { daily: 1100, mode: "shared taxi / hired car", notes: "Hill roads make autos rare; budget for a shared cab" },
      snow:          { daily: 1500, mode: "hired SUV",           notes: "Roads here need SUVs; expect ₹4-5k/day shared with others" },
      desert:        { daily: 1300, mode: "hired jeep",          notes: "Desert + dune routes need a jeep + driver" },
      heritage:      { daily: 600,  mode: "walking + auto",      notes: "Most sights cluster in one area" },
      pilgrimage:    { daily: 500,  mode: "walking + auto",      notes: "Religious circuits are usually compact" },
      wildlife:      { daily: 1800, mode: "park jeep safari",    notes: "Safari fees ₹2-3k/jeep + driver tip" },
      offbeat:       { daily: 800,  mode: "varies",              notes: "Remote — often need a hired vehicle" },
      island:        { daily: 1000, mode: "ferry + scooter",     notes: "Inter-island ferries + scooter on each island" },
    };
    const e = dailyMap[type] ?? dailyMap.city;

    return {
      daily_estimate_inr: e.daily,
      total_estimate_inr: e.daily * args.days,
      primary_mode: e.mode,
      notes: e.notes,
    };
  },
};

// ===========================================================================
// 6. compare_to_typical — LLM-judged price verdict
// ===========================================================================

export const compareToTypicalTool: ToolSpec<
  z.infer<typeof CompareToTypicalArgs>,
  z.infer<typeof CompareToTypicalResult>
> = {
  name: "compare_to_typical",
  description:
    "Judge whether a given price is LOW, NORMAL, or HIGH versus typical prices " +
    "for that category, route/destination, and month. Returns a verdict plus a " +
    "short recommendation (book now / wait / try alternatives).",
  argsSchema: CompareToTypicalArgs,
  resultSchema: CompareToTypicalResult,
  jsonSchema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["flight", "train", "bus", "drive", "hotel"] },
      route_or_destination: { type: "string", description: "e.g. 'DEL→Manali' for transport, 'Goa' for hotels" },
      month: { type: "integer", minimum: 1, maximum: 12 },
      price_inr: { type: "number" },
      passengers: { type: "integer", default: 1 },
    },
    required: ["category", "route_or_destination", "month", "price_inr"],
  },
  handler: async (args) => {
    return await comparePriceToTypical({
      category: args.category,
      routeOrDestination: args.route_or_destination,
      month: args.month,
      priceInr: args.price_inr,
      passengers: args.passengers,
    });
  },
};

// ===========================================================================
// The registry
// ===========================================================================

export const ALL_TOOLS: ToolSpec[] = [
  getDestinationFactsTool,
  getClimateTool,
  getTransportQuotesTool,
  getHotelPricesTool,
  getLocalTransportEstimateTool,
  compareToTypicalTool,
];

/** Convert tool registry into the JSON-shape Ollama's /api/chat expects. */
export function toolsForLLM(tools: ToolSpec[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.jsonSchema,
    },
  }));
}
