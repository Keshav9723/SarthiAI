// app/explore/[destination]/page.tsx — single destination detail.

import { notFound } from "next/navigation";
import DestinationDetailView from "@/components/explore/DestinationDetailView";
import {
  MOCK_DESTINATIONS,
  getDestinationExtras,
  type Destination,
} from "@/lib/mockData";

interface Props {
  params: { destination: string };
}

function resolveDestination(slug: string): Destination | undefined {
  const decoded = decodeURIComponent(slug).toLowerCase();
  return MOCK_DESTINATIONS.find((d) => d.name.toLowerCase() === decoded);
}

export function generateStaticParams() {
  return MOCK_DESTINATIONS.map((d) => ({
    destination: encodeURIComponent(d.name),
  }));
}

export function generateMetadata({ params }: Props) {
  const d = resolveDestination(params.destination);
  if (!d) return { title: "Destination" };
  return {
    title: `${d.name} — ${d.tagline}`,
    description: d.description,
  };
}

export default function DestinationDetailPage({ params }: Props) {
  const destination = resolveDestination(params.destination);
  if (!destination) notFound();
  const extras = getDestinationExtras(destination.name);
  return <DestinationDetailView destination={destination} extras={extras} />;
}
