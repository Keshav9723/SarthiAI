// app/my-itineraries/page.tsx — auth-gated saved trips view.

import MyItinerariesView from "@/components/my-itineraries/MyItinerariesView";

export const metadata = {
  title: "My Itineraries",
};

export default function MyItinerariesPage() {
  return <MyItinerariesView />;
}
