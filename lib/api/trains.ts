// lib/api/trains.ts
// Indian Railways train pricing via RapidAPI's IRCTC1 endpoint.
// Falls back to mock estimates when RAPIDAPI_KEY is not configured.
//
// To enable real calls:
//   1. Sign up at rapidapi.com → subscribe to IRCTC1 (free 100/day tier)
//   2. RAPIDAPI_KEY=...
// Restart dev server. Done.

import { findStation, distanceBetween } from "./codes";

const RAPIDAPI_HOST = "irctc1.p.rapidapi.com";

// Circuit breaker — RapidAPI IRCTC's free tier is 100 calls/day. Once we
// get a 429, stop calling for the next 60 minutes so we don't spam the
// terminal with warnings on every transport-card render.
let rapidApiCircuitOpen = false;
let rapidApiCircuitOpenedAt = 0;
const RAPID_CIRCUIT_COOLDOWN_MS = 60 * 60 * 1000;

export interface TrainQuote {
  available: boolean;
  cheapest_inr: number | null;
  average_inr: number | null;
  classes: string[];
  duration_minutes: number | null;
  is_mock: boolean;
  notes?: string;
}

interface RapidApiTrainSearchResponse {
  status?: boolean;
  data?: Array<{
    train_name?: string;
    train_number?: string;
    travel_time?: string;
    class_type?: string[];
    fare?: Record<string, string>;
  }>;
}

export async function getTrainQuote(opts: {
  originCity: string;
  destinationCity: string;
  date: string;
  passengers: number;
}): Promise<TrainQuote> {
  const fromStation = findStation(opts.originCity);
  const toStation = findStation(opts.destinationCity);

  if (!fromStation || !toStation) {
    return {
      available: false,
      cheapest_inr: null, average_inr: null,
      classes: [], duration_minutes: null,
      is_mock: false,
      notes: !fromStation
        ? `No station mapped for ${opts.originCity}`
        : `No station mapped for ${opts.destinationCity}`,
    };
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return mockTrainQuote(opts.originCity, opts.destinationCity, opts.passengers);
  }

  // Circuit-breaker check — if we hit a 429 recently, don't even try.
  if (rapidApiCircuitOpen) {
    if (Date.now() - rapidApiCircuitOpenedAt > RAPID_CIRCUIT_COOLDOWN_MS) {
      rapidApiCircuitOpen = false; // cooldown elapsed, re-try below
    } else {
      return mockTrainQuote(opts.originCity, opts.destinationCity, opts.passengers);
    }
  }

  try {
    const url =
      `https://${RAPIDAPI_HOST}/api/v3/trainBetweenStations` +
      `?fromStationCode=${fromStation}&toStationCode=${toStation}&dateOfJourney=${opts.date}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      // 429 / 403 = quota burned. Open the circuit so we don't spam the
      // terminal on every render for the next hour.
      if (res.status === 429 || res.status === 403) {
        rapidApiCircuitOpen = true;
        rapidApiCircuitOpenedAt = Date.now();
        console.warn(
          `[trains] RapidAPI HTTP ${res.status} — quota burned. Pausing live train lookups for 1 hour; using mock estimates.`
        );
      } else {
        console.warn(`[trains] RapidAPI HTTP ${res.status} — falling back to mock`);
      }
      return mockTrainQuote(opts.originCity, opts.destinationCity, opts.passengers);
    }
    const data = (await res.json()) as RapidApiTrainSearchResponse;
    const trains = data.data ?? [];
    if (trains.length === 0) {
      return {
        available: false,
        cheapest_inr: null, average_inr: null,
        classes: [], duration_minutes: null,
        is_mock: false,
        notes: "No direct trains found between these stations",
      };
    }

    // Extract all fares across trains/classes
    const allFares: number[] = [];
    const allClasses = new Set<string>();
    for (const t of trains) {
      for (const c of t.class_type ?? []) allClasses.add(c);
      for (const fareStr of Object.values(t.fare ?? {})) {
        const v = parseFloat(fareStr ?? "");
        if (v > 0) allFares.push(v);
      }
    }
    if (allFares.length === 0) {
      return mockTrainQuote(opts.originCity, opts.destinationCity, opts.passengers);
    }

    // Pick a reasonable mid-class average (3AC if available)
    const cheapestPerPax = Math.min(...allFares);
    const averagePerPax = Math.round(allFares.reduce((a, b) => a + b, 0) / allFares.length);
    const durationMin = parseTravelTime(trains[0].travel_time);

    return {
      available: true,
      cheapest_inr: cheapestPerPax,
      average_inr: averagePerPax,
      classes: Array.from(allClasses),
      duration_minutes: durationMin,
      is_mock: false,
    };
  } catch (err) {
    console.warn(`[trains] error: ${(err as Error).message} — using mock`);
    return mockTrainQuote(opts.originCity, opts.destinationCity, opts.passengers);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function mockTrainQuote(
  originCity: string,
  destinationCity: string,
  passengers: number
): TrainQuote {
  const distKm = distanceBetween(originCity, destinationCity);
  if (!distKm) {
    return {
      available: false,
      cheapest_inr: null, average_inr: null,
      classes: [], duration_minutes: null,
      is_mock: true,
      notes: "Unknown route — set RAPIDAPI_KEY for real train data",
    };
  }
  // Sleeper ≈ ₹0.7/km, 3AC ≈ ₹1.6/km, 2AC ≈ ₹2.3/km
  const sleeperFare = Math.round(distKm * 0.7 + 60);
  const ac3Fare = Math.round(distKm * 1.6 + 110);
  // Indian Railways averages ~55 km/h on long-haul trains
  const durationMin = Math.round((distKm / 55) * 60);

  return {
    available: true,
    cheapest_inr: sleeperFare,
    average_inr: ac3Fare,
    classes: ["SL", "3AC", "2AC"],
    duration_minutes: durationMin,
    is_mock: true,
    notes: "Mock estimate — set RAPIDAPI_KEY for real train fares",
  };
}

// "08h 25m" → 505
function parseTravelTime(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)h\s*(\d+)m/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
