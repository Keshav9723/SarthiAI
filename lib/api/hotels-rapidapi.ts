// lib/api/hotels-rapidapi.ts
// Hotels.com wrapper (via RapidAPI). Two-step protocol:
//   1. /v2/regions?query=<city>     → returns regions array, take first matching gaia_id
//   2. /v2/hotels/search?region_id=… → returns hotels with prices
//
// We cache region_id per destination in memory so we don't burn API quota on
// repeated lookups for the same city within a server lifetime.
//
// To enable:
//   1. Subscribe to hotels-com6 on rapidapi.com (free tier exists)
//   2. .env.local:  RAPIDAPI_KEY=...  (same key works for IRCTC + Hotels.com)

const RAPIDAPI_HOST = "hotels-com-provider.p.rapidapi.com";
const BASE = `https://${RAPIDAPI_HOST}`;

interface RegionsResponse {
  data?: Array<{
    gaiaId?: string;
    coordinates?: { lat?: number; long?: number };
    regionNames?: { primaryDisplayName?: string };
    hierarchyInfo?: { country?: { name?: string } };
  }>;
}

interface HotelSearchResponse {
  properties?: Array<{
    id?: string;
    name?: string;
    star?: number;
    reviews?: { score?: number; total?: number };
    price?: {
      lead?: { amount?: number; currencyInfo?: { code?: string } };
      displayMessages?: Array<{ lineItems?: Array<{ value?: string }> }>;
    };
  }>;
}

export interface HotelsRapidQuote {
  available: boolean;
  cheapest_inr: number | null;
  avg_inr: number | null;
  max_inr: number | null;
  count: number;
  sample_hotels: Array<{ name: string; star?: number; price_inr: number }>;
  notes?: string;
}

// ---------------------------------------------------------------------------
// In-memory region cache
// ---------------------------------------------------------------------------

const regionCache = new Map<string, string | null>();

function headers(): Record<string, string> | null {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return null;
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    "Content-Type": "application/json",
  };
}

async function getRegionId(destination: string): Promise<string | null> {
  const cacheKey = destination.toLowerCase().trim();
  if (regionCache.has(cacheKey)) return regionCache.get(cacheKey)!;

  const h = headers();
  if (!h) return null;

  const url =
    `${BASE}/v2/regions?query=${encodeURIComponent(destination)}` +
    `&locale=en_IN&domain=IN`;
  try {
    const res = await fetch(url, { headers: h, cache: "no-store" });
    if (!res.ok) {
      regionCache.set(cacheKey, null);
      return null;
    }
    const data = (await res.json()) as RegionsResponse;
    // Prefer a region whose country is India
    const match = (data.data ?? []).find(
      (r) => r.hierarchyInfo?.country?.name?.toLowerCase().includes("india")
    );
    const gaiaId = match?.gaiaId ?? data.data?.[0]?.gaiaId ?? null;
    regionCache.set(cacheKey, gaiaId);
    return gaiaId;
  } catch {
    regionCache.set(cacheKey, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main wrapper
// ---------------------------------------------------------------------------

export async function getHotelQuoteRapid(opts: {
  destination: string;
  checkIn: string;          // YYYY-MM-DD
  nights: number;
  tier: "budget" | "mid" | "luxury";
}): Promise<HotelsRapidQuote | null> {
  const h = headers();
  if (!h) return null;

  const regionId = await getRegionId(opts.destination);
  if (!regionId) return null;

  const checkout = addDays(opts.checkIn, opts.nights);

  const url =
    `${BASE}/v2/hotels/search` +
    `?region_id=${regionId}` +
    `&locale=en_IN&domain=IN` +
    `&checkin_date=${opts.checkIn}` +
    `&checkout_date=${checkout}` +
    `&adults_number=2` +
    `&sort_order=PRICE_LOW_TO_HIGH`;

  let data: HotelSearchResponse;
  try {
    const res = await fetch(url, { headers: h, cache: "no-store" });
    if (!res.ok) {
      console.warn(`[hotels-rapidapi] HTTP ${res.status} for ${opts.destination}`);
      return null;
    }
    data = (await res.json()) as HotelSearchResponse;
  } catch (err) {
    console.warn(`[hotels-rapidapi] fetch failed: ${(err as Error).message}`);
    return null;
  }

  // Filter by star tier
  const tierStars =
    opts.tier === "budget" ? [1, 2, 3] :
    opts.tier === "mid"    ? [3, 4]    :
                             [4, 5];

  const matching = (data.properties ?? [])
    .filter((p) => !p.star || tierStars.includes(Math.floor(p.star)))
    .map((p) => {
      const amount = p.price?.lead?.amount;
      const cur = p.price?.lead?.currencyInfo?.code ?? "INR";
      const perNight = typeof amount === "number"
        ? Math.round(amount * (cur === "USD" ? 83 : 1) / opts.nights)
        : 0;
      return {
        name: p.name ?? "(unnamed)",
        star: p.star,
        price_inr: perNight,
      };
    })
    .filter((h) => h.price_inr > 0);

  if (matching.length === 0) {
    return {
      available: false,
      cheapest_inr: null, avg_inr: null, max_inr: null,
      count: 0, sample_hotels: [],
      notes: `Hotels.com returned 0 ${opts.tier}-tier properties in ${opts.destination}`,
    };
  }

  const prices = matching.map((h) => h.price_inr).sort((a, b) => a - b);
  const cheapest = prices[0];
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const max = prices[prices.length - 1];

  return {
    available: true,
    cheapest_inr: cheapest,
    avg_inr: avg,
    max_inr: max,
    count: matching.length,
    sample_hotels: matching.slice(0, 3),
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
