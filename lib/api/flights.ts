// lib/api/flights.ts
// Flight price wrapper. Tries SearchAPI.io (Google Flights data — great India
// coverage) first, falls back to Amadeus (Self-Service) if Search isn't set,
// then to a mock estimate. Same interface as the old amadeus.ts wrapper so
// callers in the orchestrator don't need to change.
//
// To enable real flight data:
//   1. Get key at searchapi.io/dashboard (free trial includes ~100 calls)
//   2. .env.local:
//        SEARCHAPI_KEY=...
//   3. Restart dev server.

import { findAirport, distanceBetween } from "./codes";
import { getFlightQuote as getAmadeusFlightQuote } from "./amadeus";

const SEARCHAPI_HOST = "https://www.searchapi.io/api/v1/search";

export interface FlightQuote {
  available: boolean;
  cheapest_inr: number | null;
  average_inr: number | null;
  airlines: string[];
  duration_minutes: number | null;
  stops: number | null;
  is_mock: boolean;
  notes?: string;
  source?: "searchapi" | "amadeus" | "mock";
}

interface SearchAPIFlightLeg {
  departure_airport?: { id?: string; time?: string };
  arrival_airport?: { id?: string; time?: string };
  duration?: number;       // minutes
  airline?: string;
  airline_logo?: string;
  flight_number?: string;
  travel_class?: string;
}

interface SearchAPIFlightOffer {
  flights?: SearchAPIFlightLeg[];
  layovers?: Array<{ duration?: number; id?: string }>;
  total_duration?: number;  // minutes
  price?: number;           // already in requested currency
  type?: string;            // "Round trip" | "One way"
  airline_logo?: string;
}

interface SearchAPIResponse {
  best_flights?: SearchAPIFlightOffer[];
  other_flights?: SearchAPIFlightOffer[];
  error?: string;
  search_metadata?: { status?: string };
}

export async function getFlightQuote(opts: {
  originCity: string;
  destinationCity: string;
  date: string;          // YYYY-MM-DD
  passengers: number;
  returnDate?: string;   // optional — defaults to one-way
}): Promise<FlightQuote> {
  const originIata = findAirport(opts.originCity);
  const destIata = findAirport(opts.destinationCity);

  // No airport on at least one side → flight is not a viable option.
  if (!originIata || !destIata) {
    return {
      available: false,
      cheapest_inr: null, average_inr: null,
      airlines: [], duration_minutes: null, stops: null,
      is_mock: false,
      notes: !originIata
        ? `No airport mapped for ${opts.originCity}`
        : `No airport mapped for ${opts.destinationCity}`,
    };
  }

  // ---- Try SearchAPI first (preferred) ----
  const searchKey = process.env.SEARCHAPI_KEY;
  if (searchKey) {
    try {
      const quote = await trySearchAPI(searchKey, originIata, destIata, opts);
      if (quote) return quote;
    } catch (err) {
      console.warn(`[flights] SearchAPI failed: ${(err as Error).message} — falling through`);
    }
  }

  // ---- Fall back to Amadeus ----
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    try {
      const q = await getAmadeusFlightQuote({
        originCity: opts.originCity,
        destinationCity: opts.destinationCity,
        date: opts.date,
        passengers: opts.passengers,
      });
      return { ...q, source: q.is_mock ? "mock" : "amadeus" };
    } catch {
      // fall through to mock
    }
  }

  // ---- Last-resort mock ----
  return mockFlightQuote(opts.originCity, opts.destinationCity);
}

// ---------------------------------------------------------------------------
// SearchAPI implementation
// ---------------------------------------------------------------------------

async function trySearchAPI(
  apiKey: string,
  originIata: string,
  destIata: string,
  opts: {
    originCity: string;
    destinationCity: string;
    date: string;
    passengers: number;
    returnDate?: string;
  }
): Promise<FlightQuote | null> {
  const url = new URL(SEARCHAPI_HOST);
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", originIata);
  url.searchParams.set("arrival_id", destIata);
  url.searchParams.set("outbound_date", opts.date);
  if (opts.returnDate) url.searchParams.set("return_date", opts.returnDate);
  url.searchParams.set("currency", "INR");
  url.searchParams.set("hl", "en");
  url.searchParams.set("adults", String(opts.passengers));
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${t.slice(0, 200)}`);
  }

  const data = (await res.json()) as SearchAPIResponse;
  if (data.error) throw new Error(data.error);

  // Combine best + other flights so we get a fuller price distribution
  const offers: SearchAPIFlightOffer[] = [
    ...(data.best_flights ?? []),
    ...(data.other_flights ?? []),
  ];

  if (offers.length === 0) {
    return {
      available: false,
      cheapest_inr: null, average_inr: null,
      airlines: [], duration_minutes: null, stops: null,
      is_mock: false,
      source: "searchapi",
      notes: "Google Flights returned no offers for this route + date",
    };
  }

  // Per-pax price — SearchAPI returns TOTAL price for the search adults count
  const pricesPerPax = offers
    .map((o) => (typeof o.price === "number" ? o.price : 0))
    .filter((p) => p > 0)
    .map((total) => Math.round(total / Math.max(1, opts.passengers)));

  if (pricesPerPax.length === 0) {
    return mockFlightQuote(opts.originCity, opts.destinationCity);
  }

  const cheapest = Math.min(...pricesPerPax);
  const average = Math.round(pricesPerPax.reduce((a, b) => a + b, 0) / pricesPerPax.length);

  const first = offers[0];
  const firstFlights = first.flights ?? [];
  const stops = Math.max(0, firstFlights.length - 1);
  const durationMin = first.total_duration ?? firstFlights.reduce((s, f) => s + (f.duration ?? 0), 0);

  const airlines = Array.from(
    new Set(
      offers.flatMap((o) =>
        (o.flights ?? []).map((f) => f.airline ?? "").filter(Boolean)
      )
    )
  ).slice(0, 6);

  return {
    available: true,
    cheapest_inr: cheapest,
    average_inr: average,
    airlines,
    duration_minutes: durationMin || null,
    stops,
    is_mock: false,
    source: "searchapi",
  };
}

// ---------------------------------------------------------------------------
// Mock fallback (same heuristic as the original amadeus.ts mock)
// ---------------------------------------------------------------------------

function mockFlightQuote(originCity: string, destinationCity: string): FlightQuote {
  const distKm = distanceBetween(originCity, destinationCity);
  const base = distKm ? distKm * 5 + 800 : 4500;
  const cheapest = Math.round(base * 0.85);
  const average = Math.round(base * 1.1);
  const durationMin = distKm ? Math.round((distKm / 600) * 60 + 60) : 150;

  return {
    available: true,
    cheapest_inr: cheapest,
    average_inr: average,
    airlines: ["6E (IndiGo)", "AI (Air India)", "UK (Vistara)"],
    duration_minutes: durationMin,
    stops: 0,
    is_mock: true,
    source: "mock",
    notes: "Mock estimate — set SEARCHAPI_KEY for real Google Flights data",
  };
}
