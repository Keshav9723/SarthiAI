// app/itinerary/[id]/today/page.tsx
// Live "Today" view — focused look at where the traveller should be today.
// Loads from Supabase first (real user trips + templates), falls back to mocks.

import { notFound } from "next/navigation";
import TodayView from "@/components/itinerary/TodayView";
import { loadItinerary } from "@/lib/queries/loadItinerary";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  return {
    title: loaded ? `Today · ${loaded.itinerary.title}` : "Today",
  };
}

export default async function TodayPage({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  if (!loaded) notFound();
  return <TodayView itinerary={loaded.itinerary} />;
}
