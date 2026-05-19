// lib/api/maps.ts
// Mapbox Directions wrapper for driving distance + duration.
// Falls back to haversine distance + an average-speed estimate when
// MAPBOX_TOKEN is not configured.
//
// To enable real calls:
//   1. Sign up at account.mapbox.com → "Default Public Token"
//   2. MAPBOX_TOKEN=pk.xxx     (server-side use — not NEXT_PUBLIC_)
// Restart dev server. Done.

import { findCoords, distanceBetween } from "./codes";

const MAPBOX_HOST = "https://api.mapbox.com";

export interface DrivingRoute {
  distance_km: number;
  duration_minutes: number;
  estimated_fuel_inr: number;
  toll_estimate_inr: number;
  is_mock: boolean;
  notes?: string;
}

// Average passenger car mileage 14 km/L, petrol ₹105/L (May 2026 approx)
const KM_PER_LITRE = 14;
const PETROL_INR_PER_LITRE = 105;

interface MapboxDirectionsResponse {
  routes?: Array<{
    distance?: number;   // metres
    duration?: number;   // seconds
  }>;
}

export async function getDrivingRoute(opts: {
  originCity: string;
  destinationCity: string;
}): Promise<DrivingRoute | null> {
  const a = findCoords(opts.originCity);
  const b = findCoords(opts.destinationCity);
  if (!a || !b) {
    // No coordinates for at least one city → can't even mock-estimate.
    return null;
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return mockDrivingRoute(opts.originCity, opts.destinationCity);
  }

  try {
    const url =
      `${MAPBOX_HOST}/directions/v5/mapbox/driving/` +
      `${a.lng},${a.lat};${b.lng},${b.lat}` +
      `?access_token=${token}&geometries=geojson&overview=simplified`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[mapbox] HTTP ${res.status} — falling back to mock`);
      return mockDrivingRoute(opts.originCity, opts.destinationCity);
    }
    const data = (await res.json()) as MapboxDirectionsResponse;
    const route = data.routes?.[0];
    if (!route?.distance || !route?.duration) {
      return mockDrivingRoute(opts.originCity, opts.destinationCity);
    }

    const distanceKm = Math.round(route.distance / 1000);
    const durationMin = Math.round(route.duration / 60);
    const fuel = Math.round((distanceKm / KM_PER_LITRE) * PETROL_INR_PER_LITRE);
    const toll = Math.round(distanceKm * 1.5); // rough: ₹1.50/km on national highways

    return {
      distance_km: distanceKm,
      duration_minutes: durationMin,
      estimated_fuel_inr: fuel,
      toll_estimate_inr: toll,
      is_mock: false,
    };
  } catch (err) {
    console.warn(`[mapbox] error: ${(err as Error).message} — using mock`);
    return mockDrivingRoute(opts.originCity, opts.destinationCity);
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — haversine distance, ~50 km/h average speed
// ---------------------------------------------------------------------------

function mockDrivingRoute(originCity: string, destinationCity: string): DrivingRoute {
  const straightLineKm = distanceBetween(originCity, destinationCity) ?? 500;
  // Indian roads add ~20-30% to straight-line distance
  const drivingKm = Math.round(straightLineKm * 1.25);
  const drivingMinutes = Math.round((drivingKm / 50) * 60);
  const fuel = Math.round((drivingKm / KM_PER_LITRE) * PETROL_INR_PER_LITRE);
  const toll = Math.round(drivingKm * 1.5);

  return {
    distance_km: drivingKm,
    duration_minutes: drivingMinutes,
    estimated_fuel_inr: fuel,
    toll_estimate_inr: toll,
    is_mock: true,
    notes: "Mock estimate — set MAPBOX_TOKEN for real routing",
  };
}
