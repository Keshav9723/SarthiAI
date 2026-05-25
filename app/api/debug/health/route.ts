// app/api/debug/health/route.ts
// Pings every configured external API and reports OK/FAIL + a sample response.
// Use to quickly verify that env keys are wired and the upstream services
// reply. Dev-only — disabled in production to avoid leaking key status.
//
//   curl http://localhost:3000/api/debug/health
//
// Returns a flat JSON with one entry per API.

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthResult {
  name: string;
  status: "ok" | "fail" | "skipped";
  latency_ms?: number;
  detail?: string;
  used_for?: string;
}

export async function GET(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Debug routes disabled in production." }, { status: 403 });
  }

  const checks: Array<Promise<HealthResult>> = [
    checkSupabase(),
    checkOllama(),
    checkGemini(),
    checkOpenRouter(),
    checkOpenAI(),
    checkAnthropic(),
    checkDeepSeek(),
    checkSearchAPI(),
    checkRapidApiIRCTC(),
    checkRapidApiHotels(),
    checkCalendarific(),
    checkUnsplash(),
    checkGoogleMaps(),
    checkOpenMeteo(),
    checkWeatherAPI(),
  ];

  const results = await Promise.all(checks);
  const summary = {
    ok: results.filter((r) => r.status === "ok").length,
    fail: results.filter((r) => r.status === "fail").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };

  return NextResponse.json({
    summary,
    results: results.sort((a, b) => a.name.localeCompare(b.name)),
  });
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

async function checkSupabase(): Promise<HealthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { name: "Supabase", status: "skipped", detail: "NEXT_PUBLIC_SUPABASE_URL not set", used_for: "DB + Auth" };
  try {
    const { value: res, ms } = await timed(() => fetch(`${url}/auth/v1/health`));
    return {
      name: "Supabase",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "DB + Auth (always)",
    };
  } catch (err) {
    return { name: "Supabase", status: "fail", detail: (err as Error).message, used_for: "DB + Auth" };
  }
}

async function checkOllama(): Promise<HealthResult> {
  const base = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  try {
    const { value: res, ms } = await timed(() => fetch(`${base}/api/tags`));
    if (!res.ok) return { name: "Ollama", status: "fail", detail: `HTTP ${res.status}`, used_for: "Embeddings always; LLM when LLM_PROVIDER=ollama" };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name).join(", ");
    return { name: "Ollama", status: "ok", latency_ms: ms, detail: `Models: ${models.slice(0, 200) || "(none)"}`, used_for: "Embeddings always; LLM when LLM_PROVIDER=ollama" };
  } catch (err) {
    return { name: "Ollama", status: "fail", detail: `Daemon not reachable: ${(err as Error).message}`, used_for: "Embeddings + LLM fallback" };
  }
}

async function checkGemini(): Promise<HealthResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { name: "Gemini", status: "skipped", detail: "GEMINI_API_KEY not set", used_for: "LLM when LLM_PROVIDER=gemini" };
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  try {
    const { value: res, ms } = await timed(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 8, thinkingConfig: { thinkingBudget: 0 } },
        }),
      })
    );
    return {
      name: "Gemini",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status} on model ${model}`,
      used_for: "LLM when LLM_PROVIDER=gemini",
    };
  } catch (err) {
    return { name: "Gemini", status: "fail", detail: (err as Error).message, used_for: "LLM" };
  }
}

async function checkOpenRouter(): Promise<HealthResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { name: "OpenRouter", status: "skipped", detail: "OPENROUTER_API_KEY not set", used_for: "LLM backup when LLM_PROVIDER=openrouter" };
  try {
    // /key endpoint just returns the key's metadata — cheapest verify
    const { value: res, ms } = await timed(() =>
      fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      })
    );
    return {
      name: "OpenRouter",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "LLM when LLM_PROVIDER=openrouter",
    };
  } catch (err) {
    return { name: "OpenRouter", status: "fail", detail: (err as Error).message, used_for: "LLM backup" };
  }
}

async function checkOpenAI(): Promise<HealthResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "OpenAI", status: "skipped", detail: "OPENAI_API_KEY not set", used_for: "LLM when LLM_PROVIDER=openai" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      })
    );
    return {
      name: "OpenAI",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "LLM when LLM_PROVIDER=openai",
    };
  } catch (err) {
    return { name: "OpenAI", status: "fail", detail: (err as Error).message, used_for: "LLM" };
  }
}

async function checkAnthropic(): Promise<HealthResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { name: "Anthropic", status: "skipped", detail: "ANTHROPIC_API_KEY not set", used_for: "LLM when LLM_PROVIDER=anthropic" };
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8,
          messages: [{ role: "user", content: "ping" }],
        }),
      })
    );
    return {
      name: "Anthropic",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status} on model ${model}`,
      used_for: "LLM when LLM_PROVIDER=anthropic",
    };
  } catch (err) {
    return { name: "Anthropic", status: "fail", detail: (err as Error).message, used_for: "LLM" };
  }
}

async function checkDeepSeek(): Promise<HealthResult> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { name: "DeepSeek", status: "skipped", detail: "DEEPSEEK_API_KEY not set", used_for: "LLM when LLM_PROVIDER=deepseek" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      })
    );
    return {
      name: "DeepSeek",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "LLM when LLM_PROVIDER=deepseek",
    };
  } catch (err) {
    return { name: "DeepSeek", status: "fail", detail: (err as Error).message, used_for: "LLM" };
  }
}

async function checkSearchAPI(): Promise<HealthResult> {
  const key = process.env.SEARCHAPI_KEY;
  if (!key) return { name: "SearchAPI (Google Flights)", status: "skipped", detail: "SEARCHAPI_KEY not set", used_for: "Real flight prices in Generate Itinerary" };
  try {
    // Cheap probe — DEL→BOM 7 days out, just one offer
    const tomorrow = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const url = `https://www.searchapi.io/api/v1/search?engine=google_flights&departure_id=DEL&arrival_id=BOM&outbound_date=${tomorrow}&currency=INR&api_key=${key}`;
    const { value: res, ms } = await timed(() => fetch(url));
    return {
      name: "SearchAPI (Google Flights)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "get_transport_quotes → flight prices",
    };
  } catch (err) {
    return { name: "SearchAPI (Google Flights)", status: "fail", detail: (err as Error).message, used_for: "Flight prices" };
  }
}

async function checkRapidApiIRCTC(): Promise<HealthResult> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return { name: "RapidAPI / IRCTC (trains)", status: "skipped", detail: "RAPIDAPI_KEY not set", used_for: "Real train fares in Generate Itinerary" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations?fromStationCode=NDLS&toStationCode=BCT&dateOfJourney=" + new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10), {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "irctc1.p.rapidapi.com" },
      })
    );
    return {
      name: "RapidAPI / IRCTC (trains)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "get_transport_quotes → train fares",
    };
  } catch (err) {
    return { name: "RapidAPI / IRCTC (trains)", status: "fail", detail: (err as Error).message, used_for: "Train fares" };
  }
}

async function checkRapidApiHotels(): Promise<HealthResult> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return { name: "RapidAPI / Hotels.com", status: "skipped", detail: "RAPIDAPI_KEY not set", used_for: "Real hotel prices in Generate Itinerary" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://hotels-com-provider.p.rapidapi.com/v2/regions?query=Delhi&locale=en_IN&domain=IN", {
        headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "hotels-com-provider.p.rapidapi.com" },
      })
    );
    return {
      name: "RapidAPI / Hotels.com",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "get_hotel_prices → real hotel prices",
    };
  } catch (err) {
    return { name: "RapidAPI / Hotels.com", status: "fail", detail: (err as Error).message, used_for: "Hotel prices" };
  }
}

async function checkCalendarific(): Promise<HealthResult> {
  const key = process.env.CALENDARIFIC_API_KEY;
  if (!key) return { name: "Calendarific (festivals)", status: "skipped", detail: "CALENDARIFIC_API_KEY not set", used_for: "get_festivals → cultural events in itineraries" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch(`https://calendarific.com/api/v2/holidays?api_key=${key}&country=in&year=2026`)
    );
    return {
      name: "Calendarific (festivals)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "get_festivals tool",
    };
  } catch (err) {
    return { name: "Calendarific (festivals)", status: "fail", detail: (err as Error).message, used_for: "Festivals" };
  }
}

async function checkUnsplash(): Promise<HealthResult> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return { name: "Unsplash (hero images)", status: "skipped", detail: "UNSPLASH_ACCESS_KEY not set", used_for: "Destination hero images (after Option B wiring)" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://api.unsplash.com/search/photos?query=goa&per_page=1", {
        headers: { Authorization: `Client-ID ${key}` },
      })
    );
    return {
      name: "Unsplash (hero images)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "Destination hero images",
    };
  } catch (err) {
    return { name: "Unsplash (hero images)", status: "fail", detail: (err as Error).message, used_for: "Hero images" };
  }
}

async function checkGoogleMaps(): Promise<HealthResult> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { name: "Google Maps", status: "skipped", detail: "GOOGLE_MAPS_API_KEY not set", used_for: "(not yet wired into UI — saved for itinerary minimap)" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Delhi&key=${key}`)
    );
    const data = (await res.json()) as { status?: string; error_message?: string };
    if (data.status === "OK") {
      return {
        name: "Google Maps",
        status: "ok",
        latency_ms: ms,
        detail: "geocode probe OK",
        used_for: "(env present but no UI consumer yet — itinerary minimap planned)",
      };
    }
    return {
      name: "Google Maps",
      status: "fail",
      latency_ms: ms,
      detail: `Google says: ${data.status} — ${data.error_message ?? ""}`.slice(0, 200),
      used_for: "Itinerary minimap",
    };
  } catch (err) {
    return { name: "Google Maps", status: "fail", detail: (err as Error).message, used_for: "Minimap" };
  }
}

async function checkOpenMeteo(): Promise<HealthResult> {
  try {
    const { value: res, ms } = await timed(() =>
      fetch("https://api.open-meteo.com/v1/forecast?latitude=15.3&longitude=74.1&current=temperature_2m")
    );
    return {
      name: "Open-Meteo (weather)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: "no key required",
      used_for: "Live weather + historical climate (always)",
    };
  } catch (err) {
    return { name: "Open-Meteo (weather)", status: "fail", detail: (err as Error).message, used_for: "Weather" };
  }
}

async function checkWeatherAPI(): Promise<HealthResult> {
  const key = process.env.WEATHERAPI_KEY;
  if (!key) return { name: "WeatherAPI.com (backup)", status: "skipped", detail: "WEATHERAPI_KEY not set", used_for: "(not used — Open-Meteo is primary)" };
  try {
    const { value: res, ms } = await timed(() =>
      fetch(`https://api.weatherapi.com/v1/current.json?key=${key}&q=Delhi`)
    );
    return {
      name: "WeatherAPI.com (backup)",
      status: res.ok ? "ok" : "fail",
      latency_ms: ms,
      detail: `HTTP ${res.status}`,
      used_for: "(backup, currently not wired into code)",
    };
  } catch (err) {
    return { name: "WeatherAPI.com (backup)", status: "fail", detail: (err as Error).message, used_for: "Backup weather" };
  }
}
