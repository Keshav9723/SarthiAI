// app/itinerary/[id]/today/page.tsx
// Live "Today" view — focused look at where the traveller should be today.

import { notFound } from "next/navigation";
import TodayView from "@/components/itinerary/TodayView";
import { getItineraryById, MOCK_ITINERARIES } from "@/lib/mockData";

interface Props {
  params: { id: string };
}

export function generateStaticParams() {
  return MOCK_ITINERARIES.map((it) => ({ id: it.id }));
}

export function generateMetadata({ params }: Props) {
  const it = getItineraryById(params.id);
  return {
    title: it ? `Today · ${it.title}` : "Today",
  };
}

export default function TodayPage({ params }: Props) {
  const itinerary = getItineraryById(params.id);
  if (!itinerary) notFound();
  return <TodayView itinerary={itinerary} />;
}
