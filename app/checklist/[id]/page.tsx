// app/checklist/[id]/page.tsx — per-trip checklist.

import { notFound } from "next/navigation";
import ChecklistView from "@/components/checklist/ChecklistView";
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
    title: it ? `Checklist · ${it.title}` : "Checklist",
  };
}

export default function ChecklistPage({ params }: Props) {
  const itinerary = getItineraryById(params.id);
  if (!itinerary) notFound();
  return <ChecklistView itinerary={itinerary} />;
}
