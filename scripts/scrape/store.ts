// scripts/scrape/store.ts
// Supabase persistence layer. Uses the service-role key (SUPABASE_SECRET_KEY)
// because we need to insert into knowledge_chunks + seasonal_scores + maybe
// destinations, all of which have RLS that blocks anon writes.
//
// Operations:
//   getOrCreateDestination — upsert a destination row, return its id
//   upsertChunks           — bulk insert/update knowledge_chunks
//   upsertSeasonalScores   — bulk insert/update seasonal_scores
//   updateDestinationMetadata — enrich an existing destination with Wikidata

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  DestinationConfig,
  PreparedChunk,
  SeasonalScore,
  WikidataMetadata,
} from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  throw new Error(
    "[store] Missing env. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local."
  );
}

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(url!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// destinations
// ---------------------------------------------------------------------------

// In-memory cache: slug → destination uuid. The scraper hits this dozens of
// times per destination, so one DB lookup per slug is plenty.
const idCache = new Map<string, string>();

export async function getOrCreateDestination(
  config: DestinationConfig,
  metadata?: WikidataMetadata
): Promise<string> {
  const cached = idCache.get(config.slug);
  if (cached) return cached;

  // Try existing row first.
  const { data: existing, error: selErr } = await sb()
    .from("destinations")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    idCache.set(config.slug, existing.id);
    // If we have new Wikidata metadata, fold it in.
    if (metadata) await updateDestinationMetadata(existing.id, config, metadata);
    return existing.id;
  }

  // Insert minimal row. Metadata-rich destinations (the original 6) won't go
  // through this path because their slug already exists.
  const payload: Record<string, unknown> = {
    slug: config.slug,
    name: config.name,
    state: config.state,
    region: config.region,
    destination_type: config.destinationType,
    wikipedia_title: config.wikipediaTitle ?? null,
    wikivoyage_title: config.skipWikivoyage ? null : (config.wikivoyageTitle ?? null),
    is_minimal: true,
  };
  if (metadata) {
    if (metadata.latitude != null)  payload.latitude  = metadata.latitude;
    if (metadata.longitude != null) payload.longitude = metadata.longitude;
    if (metadata.elevationM != null) payload.elevation_m = metadata.elevationM;
    if (metadata.population != null) payload.population = metadata.population;
    if (metadata.wikidataId)        payload.wikidata_id = metadata.wikidataId;
  }

  const { data: inserted, error: insErr } = await sb()
    .from("destinations")
    .insert(payload)
    .select("id")
    .single();
  if (insErr) throw insErr;

  idCache.set(config.slug, inserted.id);
  return inserted.id;
}

export async function updateDestinationMetadata(
  id: string,
  config: DestinationConfig,
  metadata: WikidataMetadata
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (metadata.latitude  != null) patch.latitude  = metadata.latitude;
  if (metadata.longitude != null) patch.longitude = metadata.longitude;
  if (metadata.elevationM != null) patch.elevation_m = metadata.elevationM;
  if (metadata.population != null) patch.population = metadata.population;
  if (metadata.wikidataId)        patch.wikidata_id = metadata.wikidataId;
  // Don't overwrite curated region/type values that already exist.
  if (!Object.keys(patch).length) return;

  const { error } = await sb().from("destinations").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// knowledge_chunks
// ---------------------------------------------------------------------------

export async function upsertChunks(
  destinationId: string,
  chunks: PreparedChunk[]
): Promise<{ inserted: number }> {
  if (chunks.length === 0) return { inserted: 0 };

  const rows = chunks.map((c) => ({
    destination_id: destinationId,
    content_type: c.contentType,
    source_url: c.sourceUrl,
    source_name: c.sourceName,
    heading: c.heading,
    heading_path: c.headingPath,
    text: c.text,
    token_count: c.tokenCount,
    embedding: c.embedding,
    position: c.position,
  }));

  // Supabase has a 1000-row limit per insert. Batch in 500s to stay well under.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb()
      .from("knowledge_chunks")
      .upsert(slice, { onConflict: "source_url,position" });
    if (error) throw error;
    inserted += slice.length;
  }
  return { inserted };
}

// ---------------------------------------------------------------------------
// seasonal_scores
// ---------------------------------------------------------------------------

export async function upsertSeasonalScores(
  destinationId: string,
  scores: SeasonalScore[]
): Promise<void> {
  if (scores.length === 0) return;
  const rows = scores.map((s) => ({
    destination_id: destinationId,
    month: s.month,
    score: Math.round(s.score),
    avg_temp_c: Number(s.avgTempC.toFixed(2)),
    rain_mm: Number(s.rainMm.toFixed(2)),
    humidity_pct: Math.round(s.humidityPct),
  }));
  const { error } = await sb()
    .from("seasonal_scores")
    .upsert(rows, { onConflict: "destination_id,month" });
  if (error) throw error;
}
