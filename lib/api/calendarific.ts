// lib/api/calendarific.ts
// Calendarific wrapper for public holidays + festivals.
// Used by chatbot intents (e.g. "what festivals are happening when I visit X")
// and by the orchestrator to enrich itineraries with seasonal events.
//
// To enable:
//   1. Get key at calendarific.com/signup (free 500 req/mo)
//   2. .env.local:  CALENDARIFIC_API_KEY=...

const HOLIDAYS_URL = "https://calendarific.com/api/v2/holidays";

// In-memory cache keyed by (country, year, month). Holidays don't change
// during a server lifetime, so caching saves quota.
const cache = new Map<string, Holiday[]>();

export interface Holiday {
  name: string;
  description: string;
  date: string;           // ISO yyyy-mm-dd
  type: string[];         // e.g. ["National holiday", "Religious"]
  locations?: string;     // e.g. "All", or comma-separated regions
  primary_type?: string;
}

interface CalendarificResponse {
  response?: {
    holidays?: Array<{
      name?: string;
      description?: string;
      date?: { iso?: string };
      type?: string[];
      locations?: string;
      primary_type?: string;
    }>;
  };
  meta?: { error_type?: string; error_detail?: string };
}

export async function getHolidays(opts: {
  country?: string;   // ISO-2 country code, default "in"
  year: number;
  month?: number;     // 1-12 optional filter
  location?: string;  // e.g. "Goa" — matches Calendarific's locations field
}): Promise<Holiday[]> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) return [];

  const country = opts.country ?? "in";
  const cacheKey = `${country}|${opts.year}|${opts.month ?? "all"}`;
  if (cache.has(cacheKey)) {
    return filterByLocation(cache.get(cacheKey)!, opts.location);
  }

  const url = new URL(HOLIDAYS_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("country", country);
  url.searchParams.set("year", String(opts.year));
  if (opts.month) url.searchParams.set("month", String(opts.month));

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[calendarific] HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as CalendarificResponse;
    if (data.meta?.error_type) {
      console.warn(`[calendarific] ${data.meta.error_type}: ${data.meta.error_detail}`);
      return [];
    }
    const raw = data.response?.holidays ?? [];
    const holidays: Holiday[] = raw
      .map((h) => ({
        name: h.name ?? "(unnamed)",
        description: h.description ?? "",
        date: h.date?.iso ?? "",
        type: h.type ?? [],
        locations: h.locations,
        primary_type: h.primary_type,
      }))
      .filter((h) => h.date);

    cache.set(cacheKey, holidays);
    return filterByLocation(holidays, opts.location);
  } catch (err) {
    console.warn(`[calendarific] fetch failed: ${(err as Error).message}`);
    return [];
  }
}

/** If location is provided, prefer holidays where `locations` mentions it or is "All". */
function filterByLocation(holidays: Holiday[], location?: string): Holiday[] {
  if (!location) return holidays;
  const needle = location.toLowerCase();
  return holidays.filter((h) => {
    const loc = (h.locations ?? "").toLowerCase();
    return loc === "all" || loc.includes(needle) || loc === "";
  });
}

/** Convenience: get holidays for a destination + the user's travel month. */
export async function getHolidaysForTrip(opts: {
  destination?: string;
  month: number;
  year: number;
}): Promise<Holiday[]> {
  return getHolidays({
    year: opts.year,
    month: opts.month,
    location: opts.destination,
  });
}
