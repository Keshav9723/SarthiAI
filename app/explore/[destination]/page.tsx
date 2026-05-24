// app/explore/[destination]/page.tsx — single destination detail.
// Tries Supabase first (covers all 312 scraped destinations + the 6 originals).
// Falls back to MOCK_DESTINATIONS for legacy URL-encoded name lookups.

import { notFound } from "next/navigation";
import DestinationDetailView from "@/components/explore/DestinationDetailView";
import {
  MOCK_DESTINATIONS,
  getDestinationExtras,
  type Destination,
} from "@/lib/mockData";
import { getDestinationBySlug } from "@/lib/queries/destinations";

interface Props {
  params: { destination: string };
}

export const dynamic = "force-dynamic";

async function resolveDestination(slug: string): Promise<Destination | null> {
  const decoded = decodeURIComponent(slug);
  // Supabase first — handles both kebab-slug ("munnar") and display name ("Munnar")
  const fromDb = await getDestinationBySlug(decoded.toLowerCase().replace(/\s+/g, "-"));
  if (fromDb) return fromDb;
  // Mock fallback — only the original 6 are in MOCK_DESTINATIONS
  return MOCK_DESTINATIONS.find((d) => d.name.toLowerCase() === decoded.toLowerCase()) ?? null;
}

// Only pre-render the 6 mock destinations. Everything else renders dynamically
// when first visited.
export function generateStaticParams() {
  return MOCK_DESTINATIONS.map((d) => ({
    destination: encodeURIComponent(d.name),
  }));
}

export async function generateMetadata({ params }: Props) {
  const d = await resolveDestination(params.destination);
  if (!d) return { title: "Destination" };
  return {
    title: `${d.name} — ${d.tagline}`,
    description: d.description || d.tagline,
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const destination = await resolveDestination(params.destination);
  if (!destination) notFound();
  // getDestinationExtras() is still mock-only — only returns extras for the
  // original 6 names. For auto-scraped destinations it returns undefined,
  // and DestinationDetailView gracefully handles that case.
  const extras = getDestinationExtras(destination.name);
  return <DestinationDetailView destination={destination} extras={extras} />;
}
