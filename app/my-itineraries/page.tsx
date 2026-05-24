// app/my-itineraries/page.tsx
// Server component — fetches the current user's saved itineraries from
// Supabase. Anonymous viewers see featured templates so the page isn't empty.

import MyItinerariesView from "@/components/my-itineraries/MyItinerariesView";
import { createServerClient } from "@/lib/supabase/server";
import {
  listUserItineraries,
  listTemplateItineraries,
  rowToUiItinerary,
} from "@/lib/queries/itineraries";

export const metadata = {
  title: "My Itineraries",
};

export const dynamic = "force-dynamic";

export default async function MyItinerariesPage() {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();

  // Signed-in users see their own trips; signed-out users see templates as
  // "Featured trips" so the page demos well even before generation.
  const rows = user
    ? await listUserItineraries(user.id)
    : await listTemplateItineraries(9);

  const itineraries = rows.map(rowToUiItinerary);

  return (
    <MyItinerariesView
      itineraries={itineraries}
      isSignedIn={!!user}
      isEmpty={user ? itineraries.length === 0 : false}
    />
  );
}
