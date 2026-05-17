// scripts/scrape/sources/openmeteo.ts
// Fetches 10-year monthly climate normals for a (lat, lng) from Open-Meteo's
// FREE archive API, then collapses them into:
//   • 12 seasonal_scores rows (one per month) with a 0-100 comfort score
//   • One "climate" knowledge_chunk per destination summarising the year in prose
//
// Open-Meteo requires no API key and has generous rate limits.

import { fetchJson } from "../fetch";
import { embed } from "../embed";
import { estimateTokens } from "../chunk";
import type {
  DestinationConfig,
  DestinationType,
  PreparedChunk,
  SeasonalScore,
} from "../types";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    relative_humidity_2m_mean: (number | null)[];
  };
}

interface MonthlyAggregate {
  month: number;
  avgTemp: number;
  rainTotal: number;
  humidity: number;
}

// Pull 10 years of daily data, then aggregate by month.
async function fetchMonthlyAverages(lat: number, lng: number): Promise<MonthlyAggregate[]> {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 9;
  const url =
    `${ARCHIVE_URL}?latitude=${lat}&longitude=${lng}` +
    `&start_date=${startYear}-01-01&end_date=${endYear}-12-31` +
    `&daily=temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean` +
    `&timezone=Asia%2FKolkata`;

  const data = await fetchJson<ArchiveResponse>(url);

  const buckets: Record<number, { tempSum: number; tempN: number; rain: number; humSum: number; humN: number }> = {};
  for (let i = 0; i < data.daily.time.length; i++) {
    const month = parseInt(data.daily.time[i].slice(5, 7), 10);
    const temp = data.daily.temperature_2m_mean[i];
    const rain = data.daily.precipitation_sum[i];
    const hum  = data.daily.relative_humidity_2m_mean[i];
    if (!buckets[month]) buckets[month] = { tempSum: 0, tempN: 0, rain: 0, humSum: 0, humN: 0 };
    if (temp != null) { buckets[month].tempSum += temp; buckets[month].tempN += 1; }
    if (rain != null) buckets[month].rain += rain;
    if (hum  != null) { buckets[month].humSum += hum; buckets[month].humN += 1; }
  }

  const out: MonthlyAggregate[] = [];
  for (let m = 1; m <= 12; m++) {
    const b = buckets[m] ?? { tempSum: 0, tempN: 1, rain: 0, humSum: 0, humN: 1 };
    // rainTotal is the sum over 10 years of that month — divide to get monthly avg.
    out.push({
      month: m,
      avgTemp: b.tempN > 0 ? b.tempSum / b.tempN : 0,
      rainTotal: b.rain / 10,
      humidity: b.humN > 0 ? b.humSum / b.humN : 0,
    });
  }
  return out;
}

// Comfort scoring formula. See README for tuning notes. Hill / snow destinations
// have a lower ideal temperature because the visitor is likely going there
// specifically because they want cold weather.
function computeScore(
  avgTemp: number,
  rainMm: number,
  humidity: number,
  destType: DestinationType
): number {
  const isColdTarget = destType === "snow" || destType === "hill_station";
  const idealTemp = isColdTarget ? 12 : 22;
  const tempPenalty = Math.abs(avgTemp - idealTemp) * 2;

  const rainPenalty =
    rainMm < 100 ? 0 :
    rainMm < 200 ? (rainMm - 100) * 0.2 :
                   20 + (rainMm - 200) * 0.15;

  const humidityPenalty = humidity > 80 ? (humidity - 80) * 1.5 : 0;

  let extremePenalty = 0;
  if (avgTemp > 40) extremePenalty += 30;
  if (avgTemp < -5) extremePenalty += 30;
  if (rainMm  > 400) extremePenalty += 25;

  const raw = 100 - tempPenalty - rainPenalty - humidityPenalty - extremePenalty;
  return Math.max(0, Math.min(100, raw));
}

export interface OpenMeteoResult {
  scores: SeasonalScore[];
  chunk: PreparedChunk | null;       // a single "climate" knowledge chunk for RAG
  skipped?: string;
}

export async function scrapeOpenMeteo(
  dest: DestinationConfig,
  lat: number | null | undefined,
  lng: number | null | undefined
): Promise<OpenMeteoResult> {
  if (lat == null || lng == null) {
    return { scores: [], chunk: null, skipped: "no lat/lng available (Wikidata returned no coords)" };
  }

  let monthly: MonthlyAggregate[];
  try {
    monthly = await fetchMonthlyAverages(lat, lng);
  } catch (err) {
    return { scores: [], chunk: null, skipped: `Open-Meteo failed: ${(err as Error).message}` };
  }

  const scores: SeasonalScore[] = monthly.map((m) => ({
    destinationSlug: dest.slug,
    month: m.month,
    score: computeScore(m.avgTemp, m.rainTotal, m.humidity, dest.destinationType),
    avgTempC: m.avgTemp,
    rainMm: m.rainTotal,
    humidityPct: m.humidity,
  }));

  // Build a single descriptive climate chunk so the chatbot can talk about
  // the weather in natural language. Picks the 3 best + 2 worst months.
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const best   = ranked.slice(0, 3).map((s) => MONTHS[s.month - 1]);
  const worst  = ranked.slice(-2).map((s) => MONTHS[s.month - 1]);

  const summaryLines = monthly.map((m) =>
    `${MONTHS[m.month - 1]}: avg ${m.avgTemp.toFixed(1)}°C, ${m.rainTotal.toFixed(0)} mm rain, ${m.humidity.toFixed(0)}% humidity.`
  );

  const summaryText =
    `Climate at ${dest.name}, ${dest.state} — averages over the last 10 years (source: Open-Meteo).\n\n` +
    summaryLines.join(" ") +
    `\n\nBest months to visit (highest tourist comfort scores): ${best.join(", ")}.` +
    ` Least comfortable months: ${worst.join(", ")}.`;

  const url = `https://open-meteo.com/?latitude=${lat}&longitude=${lng}`;

  // Embed in-place so the orchestrator can store it without re-running the
  // embedder pipeline for this chunk.
  let embedding: number[];
  try {
    embedding = await embed(summaryText);
  } catch (err) {
    return {
      scores,
      chunk: null,
      skipped: `scores ok, but climate chunk embed failed: ${(err as Error).message}`,
    };
  }

  const chunk: PreparedChunk = {
    destinationSlug: dest.slug,
    sourceUrl: url,
    sourceName: "openmeteo",
    heading: "Climate",
    headingPath: [dest.name, "Climate"],
    text: summaryText,
    position: 0,
    contentType: "climate",
    tokenCount: estimateTokens(summaryText),
    embedding,
  };

  return { scores, chunk };
}
