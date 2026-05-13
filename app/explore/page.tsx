// app/explore/page.tsx — destination browse.

import ExploreView from "@/components/explore/ExploreView";

export const metadata = {
  title: "Explore Destinations",
  description:
    "Browse every Indian destination on Sarthi — search by name, vibe, or who's coming along.",
};

export default function ExplorePage() {
  return <ExploreView />;
}
