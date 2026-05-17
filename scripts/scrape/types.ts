// scripts/scrape/types.ts
// Shared types for the scrape pipeline. ContentType mirrors the Postgres
// `content_type_enum` from supabase/migrations/002_rag.sql — if you add a new
// category, add it in BOTH places.

export type ContentType =
  | "overview"
  | "attractions"
  | "activities"
  | "food"
  | "accommodation"
  | "logistics"
  | "climate"
  | "safety"
  | "shopping"
  | "culture"
  | "festivals"
  | "nature"
  | "nightlife"
  | "practical";

export const ALL_CONTENT_TYPES: ContentType[] = [
  "overview",
  "attractions",
  "activities",
  "food",
  "accommodation",
  "logistics",
  "climate",
  "safety",
  "shopping",
  "culture",
  "festivals",
  "nature",
  "nightlife",
  "practical",
];

export type SourceName = "wikidata" | "wikivoyage" | "wikipedia" | "openmeteo";

export type Region =
  | "north"
  | "south"
  | "east"
  | "west"
  | "northeast"
  | "central"
  | "himalayan"
  | "islands";

export type DestinationType =
  | "metro"
  | "city"
  | "hill_station"
  | "snow"
  | "beach"
  | "desert"
  | "heritage"
  | "pilgrimage"
  | "wildlife"
  | "offbeat"
  | "island";

/** Per-destination static config entry — see scripts/scrape/config.ts */
export interface DestinationConfig {
  slug: string;
  name: string;
  state: string;
  region: Region;
  destinationType: DestinationType;
  wikivoyageTitle?: string;   // defaults to name.replace(/ /g, "_")
  wikipediaTitle?: string;    // defaults to name.replace(/ /g, "_")
  skipWikivoyage?: boolean;   // for destinations we know have no Wikivoyage page
}

/** Enriched destination metadata returned by the Wikidata SPARQL query. */
export interface WikidataMetadata {
  wikidataId?: string;
  latitude?: number;
  longitude?: number;
  elevationM?: number;
  population?: number;
  wikipediaTitle?: string;
  wikivoyageTitle?: string;
}

/** A raw section as scraped from a source page — pre-classification. */
export interface RawChunk {
  destinationSlug: string;
  sourceUrl: string;
  sourceName: SourceName;
  heading: string;
  headingPath: string[];
  text: string;
  position: number;
}

/** A chunk that's been classified + embedded and is ready for Supabase. */
export interface PreparedChunk extends RawChunk {
  contentType: ContentType;
  tokenCount: number;
  embedding: number[];
}

/** Per-month climate row computed from Open-Meteo. */
export interface SeasonalScore {
  destinationSlug: string;
  month: number;          // 1-12
  score: number;          // 0-100
  avgTempC: number;
  rainMm: number;
  humidityPct: number;
}
