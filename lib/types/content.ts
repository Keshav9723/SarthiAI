// lib/types/content.ts
// Single source of truth for the content_type enum. Mirrors the Postgres
// content_type_enum defined in supabase/migrations/002_rag.sql.
//
// If you add or remove a category, update BOTH:
//   1. The Postgres enum (write a new migration with ALTER TYPE … ADD VALUE)
//   2. The ContentType union below + ALL_CONTENT_TYPES array

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

export function isContentType(v: unknown): v is ContentType {
  return typeof v === "string" && (ALL_CONTENT_TYPES as string[]).includes(v);
}
