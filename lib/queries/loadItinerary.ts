// lib/queries/loadItinerary.ts
// Shared loader used by every `/itinerary/[id]/...` and `/checklist/[id]`
// page. Tries Supabase first (real templates + user trips), falls back to the
// in-memory MOCK_ITINERARIES list so legacy demo URLs still resolve.

import {
  getItineraryById as getMockItineraryById,
  type Itinerary as MockItinerary,
} from "@/lib/mockData";
import {
  getItineraryById as getDbItineraryById,
  rowToUiItinerary,
} from "@/lib/queries/itineraries";

export interface LoadedItinerary {
  itinerary: MockItinerary;
  /** True when the row is a hand-curated/templated trip (is_template=true).
      Templates aren't owned by the viewer — they get a "Save Trip" CTA. */
  isTemplate: boolean;
}

export async function loadItinerary(idOrSlug: string): Promise<LoadedItinerary | null> {
  const row = await getDbItineraryById(idOrSlug);
  if (row) return { itinerary: rowToUiItinerary(row), isTemplate: !!row.is_template };
  const mock = getMockItineraryById(idOrSlug);
  if (!mock) return null;
  // Mock data is always treated as a template — it's not owned by anyone.
  return { itinerary: mock, isTemplate: true };
}
