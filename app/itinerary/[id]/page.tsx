// app/itinerary/[id]/page.tsx — itinerary detail by id.

import { notFound } from "next/navigation";
import ItineraryView from "@/components/itinerary/ItineraryView";
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
    title: it?.title ?? "Itinerary",
    description: it
      ? `${it.duration} · ${it.destination}. ${it.highlights.join(" · ")}`
      : undefined,
  };
}

export default function ItineraryPage({ params }: Props) {
  const itinerary = getItineraryById(params.id);
  if (!itinerary) notFound();
  return <ItineraryView itinerary={itinerary} />;
}
