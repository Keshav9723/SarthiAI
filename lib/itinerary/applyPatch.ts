// lib/itinerary/applyPatch.ts
// Pure function that applies a validated ItineraryPatch to an Itinerary object.
// Returns the new itinerary (no mutation) — caller persists to DB separately.

import type { Itinerary, ItineraryDay } from "@/lib/schemas/itinerary";
import type { ItineraryPatch, ItineraryPatchOp } from "@/lib/schemas/itinerary-patch";

export function applyItineraryPatch(
  itinerary: Itinerary,
  patch: ItineraryPatch
): Itinerary {
  // Start from a deep clone so the caller's reference is unchanged
  let next: Itinerary = JSON.parse(JSON.stringify(itinerary));

  for (const op of patch.patches) {
    next = applyOne(next, op);
  }
  return next;
}

function applyOne(itin: Itinerary, op: ItineraryPatchOp): Itinerary {
  switch (op.op) {
    case "rename_title":
      return { ...itin, title: op.title };

    case "set_highlights":
      return { ...itin, highlights: op.highlights };

    case "replace_slot": {
      const days = itin.days.map((d) =>
        d.day_number === op.day_number ? { ...d, [op.slot]: op.text } : d
      );
      return { ...itin, days };
    }

    case "append_slot": {
      const days = itin.days.map((d) =>
        d.day_number === op.day_number
          ? { ...d, [op.slot]: appendNote(d[op.slot] ?? "", op.text) }
          : d
      );
      return { ...itin, days };
    }

    case "replace_day": {
      const days = itin.days.map((d): ItineraryDay =>
        d.day_number === op.day_number
          ? {
              day_number: op.day_number,
              location: op.location ?? d.location,
              morning: op.morning,
              afternoon: op.afternoon,
              evening: op.evening,
              type: op.type ?? d.type,
            }
          : d
      );
      return { ...itin, days };
    }
  }
}

function appendNote(existing: string, addition: string): string {
  const trimmed = existing.trim();
  if (!trimmed) return addition;
  return `${trimmed} (${addition})`;
}
