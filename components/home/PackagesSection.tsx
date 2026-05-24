// components/home/PackagesSection.tsx
// Server-fetched template itineraries, bucketed by total_days. The actual
// tab UI is in PackagesSectionClient (client component) since tabs need state.

import PackagesSectionClient from "./PackagesSectionClient";
import { listTemplateItineraries, rowToUiItinerary } from "@/lib/queries/itineraries";
import type { Itinerary } from "@/lib/mockData";

function bucketFor(days: number): "short" | "mid" | "long" {
  if (days <= 5) return "short";
  if (days <= 9) return "mid";
  return "long";
}

export interface BucketedPackage extends Itinerary {
  durationBucket: "short" | "mid" | "long";
}

export default async function PackagesSection() {
  const rows = await listTemplateItineraries(20);
  const packages: BucketedPackage[] = rows.map((r) => {
    const it = rowToUiItinerary(r);
    return { ...it, durationBucket: bucketFor(it.totalDays) };
  });
  if (packages.length === 0) return null;
  return <PackagesSectionClient packages={packages} />;
}
