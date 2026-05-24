// app/checklist/[id]/page.tsx — per-trip checklist.
// Loads from Supabase first (real user trips + templates), falls back to mocks.

import { notFound } from "next/navigation";
import ChecklistView from "@/components/checklist/ChecklistView";
import { loadItinerary } from "@/lib/queries/loadItinerary";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  return {
    title: loaded ? `Checklist · ${loaded.itinerary.title}` : "Checklist",
  };
}

export default async function ChecklistPage({ params }: Props) {
  const loaded = await loadItinerary(params.id);
  if (!loaded) notFound();
  return <ChecklistView itinerary={loaded.itinerary} />;
}
