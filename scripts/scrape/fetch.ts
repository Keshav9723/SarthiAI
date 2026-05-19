// scripts/scrape/fetch.ts
// Polite HTTP client used by every source module. Adds:
//   • A real User-Agent (Wikimedia silently 403's generic UAs)
//   • Per-domain rate limiting (1.2s between requests to the same host)
//   • Disk caching of raw bodies under scripts/scrape/cache/ — re-runs of the
//     scraper hit the cache and complete in seconds instead of minutes
//   • Retry-with-backoff on transient failures (5xx, ECONNRESET, ETIMEDOUT)
//
// fetchHtml() — returns string, used by Wikivoyage/Wikipedia
// fetchJson() — returns parsed JSON, used by Wikidata/Open-Meteo

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  FETCH_MAX_RETRIES,
  FETCH_RETRY_BASE_MS,
  POLITE_DELAY_MS,
  USER_AGENT,
} from "./config";

const CACHE_DIR = path.join(process.cwd(), "scripts", "scrape", "cache");

// Per-host "last request" timestamp so we don't hammer a single domain.
const lastRequestAt = new Map<string, number>();

// Some hosts have stricter limits than POLITE_DELAY_MS. Open-Meteo's free
// archive API in particular starts 429-ing past ~30 req/min. Nominatim's
// published policy is strict: 1 request/sec, no bursts.
const HOST_DELAYS: Record<string, number> = {
  "archive-api.open-meteo.com": 2500,
  "nominatim.openstreetmap.org": 1500,
};

async function waitForDomain(url: string): Promise<void> {
  const host = new URL(url).host;
  const delay = HOST_DELAYS[host] ?? POLITE_DELAY_MS;
  const last = lastRequestAt.get(host) ?? 0;
  const elapsed = Date.now() - last;
  const wait = delay - elapsed;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

function cacheKey(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex");
}

async function readCache(url: string): Promise<string | null> {
  try {
    const file = path.join(CACHE_DIR, cacheKey(url));
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function writeCache(url: string, body: string): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, cacheKey(url));
  await fs.writeFile(file, body, "utf8");
}

interface FetchOptions {
  bypassCache?: boolean;
  accept?: string;
  headers?: Record<string, string>;
}

async function fetchRaw(url: string, opts: FetchOptions = {}): Promise<string> {
  if (!opts.bypassCache) {
    const cached = await readCache(url);
    if (cached !== null) return cached;
  }

  let lastErr: unknown = null;
  // 429-throttling needs a much longer cooldown than 5xx. Open-Meteo's
  // hint is ~30 sec; double that for headroom.
  const MAX_RETRIES = FETCH_MAX_RETRIES + 2;   // 5 total attempts for retryable errors
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await waitForDomain(url);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: opts.accept ?? "text/html,application/xhtml+xml",
          "Accept-Language": "en",
          ...opts.headers,
        },
      });

      // 4xx (other than 429) won't fix with retries — surface immediately.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      }
      if (res.status === 429) {
        // Throttled — extra-long cooldown.
        if (attempt < MAX_RETRIES) {
          const wait = 30_000 + attempt * 15_000;   // 45s, 60s, 75s, …
          await new Promise((r) => setTimeout(r, wait));
        }
        throw new Error(`HTTP 429 throttled — ${url}`);
      }
      if (res.status >= 500) {
        throw new Error(`HTTP ${res.status} (retryable) — ${url}`);
      }

      const body = await res.text();
      await writeCache(url, body);
      return body;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        const wait = FETCH_RETRY_BASE_MS * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`fetchRaw failed for ${url}`);
}

export async function fetchHtml(url: string, opts: FetchOptions = {}): Promise<string> {
  return fetchRaw(url, { ...opts, accept: "text/html,application/xhtml+xml" });
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const body = await fetchRaw(url, { ...opts, accept: "application/json" });
  return JSON.parse(body) as T;
}
