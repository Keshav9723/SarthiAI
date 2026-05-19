// lib/schemas/itinerary.ts
// Zod schemas for itinerary-related shapes. Used in three places:
//   1. LLM output validation — generateStructured(prompt, ItinerarySchema)
//   2. API route body validation — /api/generate, /api/itinerary/[id]
//   3. TypeScript types — z.infer<typeof ItinerarySchema>
//
// Field names match the snake_case columns in the `itineraries` Postgres table
// so the same JSON can be passed straight into a Supabase insert.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const GroupTypeSchema = z.enum([
  "couple",
  "family",
  "friends",
  "solo",
]);
export type GroupType = z.infer<typeof GroupTypeSchema>;

export const DayTypeSchema = z.enum([
  "arrival",
  "explore",
  "relax",
  "adventure",
  "cultural",
  "food",
  "transfer",
  "departure",
]);
export type DayType = z.infer<typeof DayTypeSchema>;

export const ItineraryDaySchema = z.object({
  day_number: z.number().int().positive(),
  location: z.string().min(1),
  morning: z.string().min(1),
  afternoon: z.string().min(1),
  evening: z.string().min(1),
  type: DayTypeSchema.optional(),
});
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const TransferSchema = z.object({
  mode: z.enum(["flight", "train", "bus", "drive", "taxi"]),
  label: z.string(),
  duration: z.string(),
});
export type Transfer = z.infer<typeof TransferSchema>;

export const RouteStopSchema = z.object({
  city: z.string().min(1),
  nights: z.number().int().nonnegative(),
  transfer_to_next: TransferSchema.nullable().optional(),
});
export type RouteStop = z.infer<typeof RouteStopSchema>;

// ---------------------------------------------------------------------------
// Main itinerary schema — what the LLM must emit and what we store
// ---------------------------------------------------------------------------

export const ItinerarySchema = z.object({
  title: z.string().min(3).max(120),
  destination: z.string().min(1),
  state: z.string().min(1),

  duration: z.string(),                        // e.g. "4 nights / 5 days"
  nights: z.number().int().nonnegative(),
  total_days: z.number().int().positive(),

  group_type: GroupTypeSchema,
  group_size: z.number().int().positive(),

  highlights: z.array(z.string()).min(1).max(12),

  total_budget: z.number().int().nonnegative(),
  price_per_person: z.number().int().nonnegative(),

  days: z.array(ItineraryDaySchema).min(1),
  route: z.array(RouteStopSchema).min(1),

  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
});
export type Itinerary = z.infer<typeof ItinerarySchema>;

// ---------------------------------------------------------------------------
// Wizard input — what /api/generate receives from the frontend
// ---------------------------------------------------------------------------

export const WizardInputSchema = z.object({
  destination: z.string().min(1),              // destination slug
  days: z.number().int().positive().max(60),
  group: GroupTypeSchema,
  group_size: z.number().int().positive().max(20),
  budget_per_person: z.number().int().nonnegative(),
  from_city: z.string().min(1),
  month: z.number().int().min(1).max(12),
  start_date: z.string().optional(),           // ISO date if user picked one
  preferences: z.array(z.string()).optional(), // e.g. ["food", "adventure"]
});
export type WizardInput = z.infer<typeof WizardInputSchema>;
