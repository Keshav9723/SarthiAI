// lib/intents/handlers/weather.ts
// Live weather for "weather in <destination>" chatbot queries.
//
// Source order:
//   1. WeatherAPI.com — preferred (richer current conditions: feels-like, AQI,
//      UV, wind direction, etc.) if WEATHERAPI_KEY is set
//   2. Open-Meteo Forecast — free, no key needed; lat/lng based
//   3. (Falls back to a friendly error if neither works)
//
// Both return current + 7-day forecast. Output shape is normalized so the
// rendered chat reply looks the same regardless of which source served it.

import { createServerClient } from "@/lib/supabase/server";
import type { HandlerContext, HandlerEvent } from "../types";

const WEATHERAPI_URL = "https://api.weatherapi.com/v1/forecast.json";
const OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Sarthi-Travel/0.1 (chatbot weather)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  }
  return (await res.json()) as T;
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    apparent_temperature?: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "fog",
  48: "freezing fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  80: "light showers",
  81: "showers",
  82: "violent showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "severe thunderstorm",
};

export async function* handleWeather(
  ctx: HandlerContext
): AsyncGenerator<HandlerEvent> {
  const destinationName =
    ctx.classification.extracted?.destination ?? ctx.pageDestination;

  if (!destinationName) {
    yield {
      type: "token",
      content: "Which destination? Try \"weather in Goa today\" or \"is it raining in Mumbai?\"",
    };
    return;
  }

  const sb = createServerClient();
  const { data: dest } = await sb
    .from("destinations")
    .select("name, state, latitude, longitude")
    .ilike("name", destinationName)
    .limit(1)
    .maybeSingle();

  if (!dest) {
    yield {
      type: "token",
      content: `I don't have ${destinationName} in my database yet.`,
    };
    return;
  }

  // Try WeatherAPI.com first (richer data); fall back to Open-Meteo.
  let normalized: NormalizedForecast | null = null;
  let sourceLabel = "";

  const weatherApiKey = process.env.WEATHERAPI_KEY;
  if (weatherApiKey) {
    try {
      normalized = await viaWeatherApi(weatherApiKey, dest.name, dest.state);
      sourceLabel = "WeatherAPI.com (live)";
    } catch (err) {
      console.warn(`[weather] WeatherAPI failed: ${(err as Error).message} — falling back to Open-Meteo`);
    }
  }
  if (!normalized && dest.latitude != null && dest.longitude != null) {
    try {
      normalized = await viaOpenMeteo(Number(dest.latitude), Number(dest.longitude));
      sourceLabel = "Open-Meteo (live)";
    } catch (err) {
      console.warn(`[weather] Open-Meteo failed: ${(err as Error).message}`);
    }
  }
  if (!normalized) {
    yield {
      type: "token",
      content: `Couldn't reach a weather service right now. Try again in a moment.`,
    };
    return;
  }

  // Build a human reply rather than streaming tokens — this is structured,
  // not free-form prose. Yielding it in chunks still renders smoothly.
  const lines: string[] = [];
  lines.push(`**${dest.name}, ${dest.state} — right now:**`);
  if (normalized.current) {
    const c = normalized.current;
    lines.push(
      `🌡️  ${c.temp_c.toFixed(1)}°C · ${c.condition}` +
        (c.humidity_pct != null ? ` · ${c.humidity_pct}% humidity` : "") +
        (c.wind_kph != null ? ` · wind ${c.wind_kph.toFixed(0)} km/h${c.wind_dir ? ` ${c.wind_dir}` : ""}` : "") +
        (c.feels_like_c != null ? ` · feels like ${c.feels_like_c.toFixed(0)}°C` : "")
    );
  }

  if (normalized.daily.length) {
    lines.push("");
    lines.push("**Next 7 days:**");
    for (const d of normalized.daily.slice(0, 7)) {
      const day = new Date(d.date + "T00:00:00Z").toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short",
      });
      const rainNote = d.rain_mm > 1 ? `, ${d.rain_mm.toFixed(0)} mm rain` : "";
      lines.push(`  • ${day}: ${d.min_c.toFixed(0)}–${d.max_c.toFixed(0)}°C, ${d.condition}${rainNote}`);
    }
  }

  const reply = lines.join("\n");
  for (const chunk of chunkString(reply, 80)) {
    yield { type: "token", content: chunk };
    await new Promise((r) => setTimeout(r, 20));
  }

  yield {
    type: "metadata",
    data: {
      destination: dest.name,
      source: sourceLabel,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalised shape so the renderer doesn't care which API served the data
// ---------------------------------------------------------------------------

interface NormalizedForecast {
  current: {
    temp_c: number;
    condition: string;
    humidity_pct?: number;
    wind_kph?: number;
    wind_dir?: string;
    feels_like_c?: number;
  } | null;
  daily: Array<{
    date: string;       // YYYY-MM-DD
    min_c: number;
    max_c: number;
    rain_mm: number;
    condition: string;
  }>;
}

// --- WeatherAPI.com ---------------------------------------------------------

interface WeatherApiResponse {
  current?: {
    temp_c?: number;
    condition?: { text?: string };
    humidity?: number;
    wind_kph?: number;
    wind_dir?: string;
    feelslike_c?: number;
  };
  forecast?: {
    forecastday?: Array<{
      date?: string;
      day?: {
        mintemp_c?: number;
        maxtemp_c?: number;
        totalprecip_mm?: number;
        condition?: { text?: string };
      };
    }>;
  };
}

async function viaWeatherApi(
  apiKey: string,
  cityName: string,
  state: string
): Promise<NormalizedForecast> {
  const q = encodeURIComponent(`${cityName},${state},India`);
  const url = `${WEATHERAPI_URL}?key=${apiKey}&q=${q}&days=7&aqi=no&alerts=no`;
  const data = await fetchJson<WeatherApiResponse>(url);

  return {
    current: data.current?.temp_c != null
      ? {
          temp_c: data.current.temp_c,
          condition: data.current.condition?.text ?? "—",
          humidity_pct: data.current.humidity,
          wind_kph: data.current.wind_kph,
          wind_dir: data.current.wind_dir,
          feels_like_c: data.current.feelslike_c,
        }
      : null,
    daily: (data.forecast?.forecastday ?? [])
      .filter((d) => d.date && d.day)
      .map((d) => ({
        date: d.date!,
        min_c: d.day!.mintemp_c ?? 0,
        max_c: d.day!.maxtemp_c ?? 0,
        rain_mm: d.day!.totalprecip_mm ?? 0,
        condition: d.day!.condition?.text ?? "—",
      })),
  };
}

// --- Open-Meteo (no-key fallback) ------------------------------------------

async function viaOpenMeteo(lat: number, lng: number): Promise<NormalizedForecast> {
  const url =
    `${OPENMETEO_URL}?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&timezone=Asia%2FKolkata&forecast_days=7`;

  const data = await fetchJson<ForecastResponse>(url);

  const c = data.current;
  const d = data.daily;

  return {
    current: c?.temperature_2m != null
      ? {
          temp_c: c.temperature_2m,
          condition: c.weather_code != null
            ? WEATHER_CODES[c.weather_code] ?? "mixed conditions"
            : "—",
          humidity_pct: c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) : undefined,
          wind_kph: c.wind_speed_10m,
          feels_like_c: c.apparent_temperature,
        }
      : null,
    daily: (d?.time ?? []).map((date, i) => ({
      date,
      min_c: d.temperature_2m_min[i] ?? 0,
      max_c: d.temperature_2m_max[i] ?? 0,
      rain_mm: d.precipitation_sum[i] ?? 0,
      condition: d.weather_code[i] != null ? WEATHER_CODES[d.weather_code[i]] ?? "—" : "—",
    })),
  };
}

function chunkString(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}
