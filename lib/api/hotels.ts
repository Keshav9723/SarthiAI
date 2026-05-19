// lib/api/hotels.ts
// Hotel pricing. Amadeus Hotel Search has weak India coverage so we use it
// where possible and fall back to LLM-judged price bands per destination_type
// + tier. The fallback is good enough for budget estimates — when the
// orchestrator needs precise prices we ask the user to confirm via booking.
//
// To enable Amadeus hotel calls:
//   1. Already covered if AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET are set
//      (we reuse the same OAuth token cache from lib/api/amadeus.ts)
//   2. No additional config

import { findAirport } from "./codes";
import { generateStructured } from "./llm";
import { z } from "zod";

// We share the Amadeus OAuth helper with the flight wrapper — copy the relevant
// bits inline to avoid creating a tight coupling import.
const AMADEUS_HOST = "https://test.api.amadeus.com";
const USD_TO_INR = 83;

interface AmadeusTokenCache {
  access_token: string;
  expires_at: number;
}
let _tokenCache: AmadeusTokenCache | null = null;

async function getAmadeusToken(): Promise<string | null> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (_tokenCache && Date.now() < _tokenCache.expires_at - 5 * 60 * 1000) {
    return _tokenCache.access_token;
  }
  const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id, client_secret: secret,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = {
    access_token: json.access_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export interface HotelQuote {
  tier: "budget" | "mid" | "luxury";
  min_inr_per_night: number;
  avg_inr_per_night: number;
  max_inr_per_night: number;
  total_for_stay_inr: number;
  notes: string;
  is_mock: boolean;
}

interface AmadeusHotelOfferResponse {
  data?: Array<{
    offers?: Array<{
      price?: { total?: string; currency?: string };
    }>;
  }>;
}

export async function getHotelQuote(opts: {
  destination: string;
  checkIn: string;
  nights: number;
  tier: "budget" | "mid" | "luxury";
}): Promise<HotelQuote> {
  const iata = findAirport(opts.destination);
  const token = iata ? await getAmadeusToken() : null;

  if (token && iata) {
    const real = await tryAmadeusHotels(token, iata, opts);
    if (real) return real;
  }

  // Fall back to LLM-judged band
  return await llmEstimateHotel(opts);
}

async function tryAmadeusHotels(
  token: string,
  iata: string,
  opts: { destination: string; checkIn: string; nights: number; tier: "budget" | "mid" | "luxury" }
): Promise<HotelQuote | null> {
  try {
    const checkOut = addDays(opts.checkIn, opts.nights);
    const ratings = { budget: "1,2", mid: "3,4", luxury: "4,5" }[opts.tier];
    const url =
      `${AMADEUS_HOST}/v3/shopping/hotel-offers` +
      `?cityCode=${iata}&checkInDate=${opts.checkIn}&checkOutDate=${checkOut}` +
      `&ratings=${ratings}&currency=INR&bestRateOnly=true`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AmadeusHotelOfferResponse;
    const totals: number[] = (data.data ?? [])
      .map((h) => {
        const off = h.offers?.[0];
        if (!off?.price?.total) return 0;
        const v = parseFloat(off.price.total);
        const cur = (off.price.currency ?? "INR").toUpperCase();
        return Math.round(v * (cur === "USD" ? USD_TO_INR : 1));
      })
      .filter((n) => n > 0);
    if (totals.length === 0) return null;

    const perNights = totals.map((t) => Math.round(t / opts.nights));
    const min = Math.min(...perNights);
    const max = Math.max(...perNights);
    const avg = Math.round(perNights.reduce((a, b) => a + b, 0) / perNights.length);

    return {
      tier: opts.tier,
      min_inr_per_night: min,
      avg_inr_per_night: avg,
      max_inr_per_night: max,
      total_for_stay_inr: avg * opts.nights,
      notes: `Amadeus returned ${totals.length} live offers`,
      is_mock: false,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// LLM fallback: ask qwen3.5 for typical price bands by (destination, tier)
// ---------------------------------------------------------------------------

const HotelEstimateSchema = z.object({
  min_inr_per_night: z.number().int().nonnegative(),
  avg_inr_per_night: z.number().int().nonnegative(),
  max_inr_per_night: z.number().int().nonnegative(),
  reasoning: z.string(),
});

async function llmEstimateHotel(opts: {
  destination: string;
  checkIn: string;
  nights: number;
  tier: "budget" | "mid" | "luxury";
}): Promise<HotelQuote> {
  const month = parseInt(opts.checkIn.slice(5, 7), 10);
  const system =
    `You are a pricing analyst for Indian travel. Estimate typical hotel ` +
    `prices per night based on destination + month + tier. Return JSON only.`;
  const user =
    `Destination: ${opts.destination}\n` +
    `Tier: ${opts.tier} (budget = ₹800-2500 zone, mid = ₹2500-6000 zone, luxury = ₹6000+)\n` +
    `Check-in month: ${month}\n` +
    `Nights: ${opts.nights}\n\n` +
    `Output schema:\n` +
    `{\n` +
    `  "min_inr_per_night": <integer>,\n` +
    `  "avg_inr_per_night": <integer>,\n` +
    `  "max_inr_per_night": <integer>,\n` +
    `  "reasoning": "<one sentence — peak/shoulder/off season factors>"\n` +
    `}`;

  try {
    const r = await generateStructured({
      system, user, schema: HotelEstimateSchema, temperature: 0.2, maxRetries: 1,
    });
    return {
      tier: opts.tier,
      min_inr_per_night: r.min_inr_per_night,
      avg_inr_per_night: r.avg_inr_per_night,
      max_inr_per_night: r.max_inr_per_night,
      total_for_stay_inr: r.avg_inr_per_night * opts.nights,
      notes: r.reasoning,
      is_mock: true,
    };
  } catch {
    // Last-resort static fallback (only if LLM also fails)
    const fallback = {
      budget: { min: 1000, avg: 1500, max: 2400 },
      mid:    { min: 2800, avg: 4000, max: 5800 },
      luxury: { min: 6500, avg: 9500, max: 16000 },
    }[opts.tier];
    return {
      tier: opts.tier,
      min_inr_per_night: fallback.min,
      avg_inr_per_night: fallback.avg,
      max_inr_per_night: fallback.max,
      total_for_stay_inr: fallback.avg * opts.nights,
      notes: "Static fallback band — LLM estimator unreachable",
      is_mock: true,
    };
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
