// app/itinerary/[id]/page.tsx — itinerary detail by id.
// Lookup order:
//   1. Supabase `itineraries` row (by uuid OR by template slug). RLS handles
//      authorization: anon callers only see templates; signed-in users see
//      templates + their own trips.
//   2. Fall back to the in-memory MOCK_ITINERARIES list for any string id
//      that doesn't exist in Supabase yet — keeps demo URLs working.

import { notFound } from "next/navigation";
import ItineraryView from "@/components/itinerary/ItineraryView";
import TransportCard from "@/components/itinerary/TransportCard";
import { getSeasonalScore } from "@/lib/queries/destinations";
import {
  MOCK_ITINERARIES,
  type Itinerary as MockItinerary,
} from "@/lib/mockData";
import { loadItinerary } from "@/lib/queries/loadItinerary";

interface Props {
  params: { id: string };
}

// Static params from mock data only — DB-stored trips render dynamically.
export function generateStaticParams() {
  return MOCK_ITINERARIES.map((it) => ({ id: it.id }));
}

export const dynamic = "force-dynamic"; // user itineraries need fresh data + auth

export async function generateMetadata({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  const it = loaded?.itinerary;
  return {
    title: it?.title ?? "Itinerary",
    description: it
      ? `${it.duration} · ${it.destination}. ${(it.highlights ?? []).join(" · ")}`
      : undefined,
  };
}

export default async function ItineraryPage({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  if (!loaded) notFound();
  const { itinerary, isTemplate } = loaded;

  // Fetch real seasonal climate (avg temp + rain + score) for the trip's
  // travel month so the sidebar's weather card shows actual numbers instead
  // of the generic "Pleasant" placeholder.
  const targetMonth = ((new Date().getMonth() + 1) % 12) + 1; // next month default
  const weather = await getSeasonalScore({
    destinationName: itinerary.destination,
    month: targetMonth,
  });

  return (
    <ItineraryView
      itinerary={itinerary as MockItinerary}
      isTemplate={isTemplate}
      weather={weather}
      flightCard={
        itinerary.fromCity ? (
          <TransportCard
            fromCity={itinerary.fromCity}
            destination={itinerary.destination}
            passengers={itinerary.groupSize}
          />
        ) : null
      }
    />
  );
}
