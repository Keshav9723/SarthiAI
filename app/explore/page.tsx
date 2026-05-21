// app/explore/page.tsx — server component that fetches all 312 destinations
// from Supabase (with Unsplash images resolved on render), then hands the
// list to the client-side ExploreView for filtering.

import ExploreView from "@/components/explore/ExploreView";
import { listDestinations } from "@/lib/queries/destinations";

export const metadata = {
  title: "Explore Destinations",
  description:
    "Browse every Indian destination on Sarthi — search by name, vibe, or who's coming along.",
};

// Force dynamic so we always get fresh DB data + image resolutions
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const destinations = await listDestinations({ resolveImages: true });
  return <ExploreView destinations={destinations} />;
}
