// app/itinerary/preview/page.tsx
// "Just-generated" preview screen. Uses the same ItineraryView with the
// preview banner. The first mock itinerary (Golden Triangle) is the default
// — Step 5's Generate wizard redirects here after the loading animation.

import ItineraryView from "@/components/itinerary/ItineraryView";
import { MOCK_ITINERARIES } from "@/lib/mockData";

export const metadata = {
  title: "Your AI-generated itinerary",
};

export default function PreviewPage() {
  const itinerary = MOCK_ITINERARIES[0];
  return <ItineraryView itinerary={itinerary} previewBanner />;
}
