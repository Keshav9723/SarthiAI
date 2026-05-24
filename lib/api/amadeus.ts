// lib/api/amadeus.ts
// Amadeus Self-Service API wrapper for flight pricing.
// Falls back to mock data when AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET are
// not set, so the orchestrator can be tested without API keys. When keys are
// added to .env.local, real calls go out automatically.
//
// To enable real calls:
//   1. Sign up at developers.amadeus.com → self-service tier (free dev)
//   2. AMADEUS_CLIENT_ID=...
//      AMADEUS_CLIENT_SECRET=...
// Restart dev server. Done.

import { findAirport, distanceBetween } from "./codes";

const AMADEUS_HOST = "https://test.api.amadeus.com";

interface AmadeusToken {
  access_token: string;
  expires_at: number; // epoch ms
}

let _tokenCache: AmadeusToken | null = null;

async function getAccessToken(): Promise<string | null> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;

  // Use cached token if still valid (5-min safety buffer)
  if (_tokenCache && Date.now() < _tokenCache.expires_at - 5 * 60 * 1000) {
    return _tokenCache.access_token;
  }

  const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) {
    console.warn(`[amadeus] OAuth failed: ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = {
    access_token: json.access_token,
    expires_at: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export interface FlightQuote {
  available: boolean;
  cheapest_inr: number | null;
  average_inr: number | null;
  airlines: string[];
  duration_minutes: number | null;
  stops: number | null;
  is_mock: boolean;
  notes?: string;
}

// USD → INR rough rate. Production should fetch live rate (exchangerate.host).
const USD_TO_INR = 83;

interface AmadeusFlightOffersResponse {
  data?: Array<{
    price?: { total?: string; currency?: string };
    itineraries?: Array<{
      segments?: Array<{ carrierCode?: string; duration?: string }>;
      duration?: string;
    }>;
  }>;
}

export async function getFlightQuote(opts: {
  originCity: string;
  destinationCity: string;
  date: string;          // YYYY-MM-DD
  passengers: number;
}): Promise<FlightQuote> {
  const originIata = findAirport(opts.originCity);
  const destIata = findAirport(opts.destinationCity);

  // No airport on at least one side → flight is not a viable option.
  if (!originIata || !destIata) {
    return {
      available: false,
      cheapest_inr: null,
      average_inr: null,
      airlines: [],
      duration_minutes: null,
      stops: null,
      is_mock: false,
      notes: !originIata
        ? `No airport mapped for ${opts.originCity}`
        : `No airport mapped for ${opts.destinationCity}`,
    };
  }

  const token = await getAccessToken();

  // ---- Mock fallback ----
  if (!token) {
    return mockFlightQuote(opts.originCity, opts.destinationCity, opts.passengers);
  }

  // ---- Real Amadeus call ----
  try {
    const url =
      `${AMADEUS_HOST}/v2/shopping/flight-offers` +
      `?originLocationCode=${originIata}` +
      `&destinationLocationCode=${destIata}` +
      `&departureDate=${opts.date}` +
      `&adults=${opts.passengers}` +
      `&currencyCode=INR&max=10&nonStop=false`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[amadeus] flight-offers HTTP ${res.status} — falling back to mock`);
      return mockFlightQuote(opts.originCity, opts.destinationCity, opts.passengers);
    }
    const data = (await res.json()) as AmadeusFlightOffersResponse;
    const offers = data.data ?? [];
    if (offers.length === 0) {
      return {
        available: false,
        cheapest_inr: null, average_inr: null,
        airlines: [], duration_minutes: null, stops: null,
        is_mock: false,
        notes: "Amadeus returned no flights for this route + date",
      };
    }
    // Compute prices in INR, respecting each offer's quoted currency.
    const inrPrices: number[] = offers.map((o) => {
      const v = parseFloat(o.price?.total ?? "0");
      const cur = (o.price?.currency ?? "INR").toUpperCase();
      return Math.round(v * (cur === "USD" ? USD_TO_INR : 1));
    }).filter((n) => n > 0);

    if (inrPrices.length === 0) {
      return mockFlightQuote(opts.originCity, opts.destinationCity, opts.passengers);
    }

    const airlines = Array.from(new Set(
      offers.flatMap((o) =>
        (o.itineraries?.[0]?.segments ?? []).map((s) => s.carrierCode ?? "").filter(Boolean)
      )
    )).slice(0, 5);

    const first = offers[0];
    const stops = (first.itineraries?.[0]?.segments?.length ?? 1) - 1;
    const durationIso = first.itineraries?.[0]?.duration; // e.g. PT3H40M
    const durationMin = durationIso ? parseIsoDuration(durationIso) : null;

    return {
      available: true,
      cheapest_inr: Math.min(...inrPrices),
      average_inr: Math.round(inrPrices.reduce((a, b) => a + b, 0) / inrPrices.length),
      airlines,
      duration_minutes: durationMin,
      stops,
      is_mock: false,
    };
  } catch (err) {
    console.warn(`[amadeus] error: ${(err as Error).message} — using mock`);
    return mockFlightQuote(opts.originCity, opts.destinationCity, opts.passengers);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — used when API keys missing OR Amadeus call fails
// ---------------------------------------------------------------------------

function mockFlightQuote(
  originCity: string,
  destinationCity: string,
  passengers: number
): FlightQuote {
  const distKm = distanceBetween(originCity, destinationCity);
  // Roughly: ₹5 per km base + ₹500-1500 fixed booking surcharge
  const base = distKm ? distKm * 5 + 800 : 4500;
  // Add ±25% variance to bracket cheapest/average
  const cheapest = Math.round(base * 0.85);
  const average = Math.round(base * 1.1);
  // Estimate flight time at 600 km/h cruise + 60 min ground
  const durationMin = distKm ? Math.round((distKm / 600) * 60 + 60) : 150;

  return {
    available: true,
    cheapest_inr: cheapest,
    average_inr: average,
    airlines: ["6E (IndiGo)", "AI (Air India)", "UK (Vistara)"],
    duration_minutes: durationMin,
    stops: 0,
    is_mock: true,
    notes: "Mock estimate — set AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET for real prices",
  };
}

// "PT3H40M" → 220
function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!m) return null;
  return (parseInt(m[1] ?? "0", 10) * 60) + parseInt(m[2] ?? "0", 10);
}
