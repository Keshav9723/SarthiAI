// lib/schemas/itinerary-patch.ts
// Zod schema for the JSON patch the LLM emits when modifying an itinerary.
// Used by:
//   • The chatbot's modify_itinerary intent (LLM output validated here)
//   • PATCH /api/itinerary/[id] (request body validated here)
//
// Patch is a list of small operations applied in order to itineraries.days
// (and optionally to top-level itinerary fields). Each op describes a single
// concrete change in plain English so the LLM can reason about it and so the
// final mutation is auditable.

import { z } from "zod";

/** Replace one slot (morning/afternoon/evening) of a specific day. */
export const ReplaceSlotOpSchema = z.object({
  op: z.literal("replace_slot"),
  day_number: z.number().int().min(1),
  slot: z.enum(["morning", "afternoon", "evening"]),
  text: z.string().min(1).max(800),
  reason: z.string().optional(),
});

/** Append a small note onto a slot (doesn't replace existing content). */
export const AppendSlotOpSchema = z.object({
  op: z.literal("append_slot"),
  day_number: z.number().int().min(1),
  slot: z.enum(["morning", "afternoon", "evening"]),
  text: z.string().min(1).max(400),
  reason: z.string().optional(),
});

/** Replace the entire day (all three slots + optional location/type). */
export const ReplaceDayOpSchema = z.object({
  op: z.literal("replace_day"),
  day_number: z.number().int().min(1),
  location: z.string().optional(),
  morning: z.string().min(1).max(800),
  afternoon: z.string().min(1).max(800),
  evening: z.string().min(1).max(800),
  type: z.enum(["arrival", "explore", "relax", "adventure", "cultural", "food", "transfer", "departure"]).optional(),
  reason: z.string().optional(),
});

/** Rename the itinerary title (e.g. "make it sound more romantic"). */
export const RenameTitleOpSchema = z.object({
  op: z.literal("rename_title"),
  title: z.string().min(3).max(120),
  reason: z.string().optional(),
});

/** Add or replace a highlight bullet. */
export const SetHighlightsOpSchema = z.object({
  op: z.literal("set_highlights"),
  highlights: z.array(z.string()).min(1).max(12),
  reason: z.string().optional(),
});

export const ItineraryPatchOpSchema = z.discriminatedUnion("op", [
  ReplaceSlotOpSchema,
  AppendSlotOpSchema,
  ReplaceDayOpSchema,
  RenameTitleOpSchema,
  SetHighlightsOpSchema,
]);
export type ItineraryPatchOp = z.infer<typeof ItineraryPatchOpSchema>;

export const ItineraryPatchSchema = z.object({
  patches: z.array(ItineraryPatchOpSchema).min(1).max(10),
  summary: z.string().min(3).max(280),  // user-visible "what I changed" line
});
export type ItineraryPatch = z.infer<typeof ItineraryPatchSchema>;
