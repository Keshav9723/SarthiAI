// app/budget/[id]/page.tsx — single budget detail.
// `id` can be a Supabase budget uuid, a Supabase itinerary uuid, OR one of the
// legacy mock ids (b-1, b-2…).
//
// Lookup order:
//   1. Supabase: budget by uuid OR by itinerary_id
//   2. Auto-create: if the id matches a real itinerary the user owns AND no
//      budget exists yet, seed a fresh one with default categories. The user
//      came here from the itinerary's "Total Budget" link so they obviously
//      want one — no point making them click "Create Budget".
//   3. Mock data fallback (string ids like "b-1") for demo browsing.

import { redirect, notFound } from "next/navigation";
import BudgetDetail from "@/components/budget/BudgetDetail";
import {
  getBudgetById as getMockBudget,
  getBudgetByItineraryId as getMockBudgetByItinerary,
  MOCK_BUDGETS,
} from "@/lib/mockData";
import { getBudget, createBudget } from "@/lib/queries/budget";
import { getItineraryById } from "@/lib/queries/itineraries";
import { createServerClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

// Only pre-render the mock ids — real user budgets render dynamically.
export function generateStaticParams() {
  return MOCK_BUDGETS.flatMap((b) =>
    b.itineraryId ? [{ id: b.id }, { id: b.itineraryId }] : [{ id: b.id }]
  );
}

export const dynamic = "force-dynamic";

export default async function BudgetDetailPage({ params }: Props) {
  // 1. Try Supabase first — covers both budget-uuid AND itinerary-uuid lookups.
  const dbBudget = await getBudget(params.id);
  if (dbBudget) {
    return <BudgetDetail budget={dbBudget} persistMode="api" />;
  }

  // 2. Auto-create: if the id looks like a uuid AND maps to an itinerary the
  //    signed-in user owns, seed a fresh budget for it. The Budget link on the
  //    itinerary page passes the itinerary's id directly, so this is the
  //    common "first click" path.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
  if (isUuid) {
    const sb = createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const itinerary = await getItineraryById(params.id);
      if (itinerary && itinerary.user_id === user.id) {
        try {
          await createBudget({
            userId: user.id,
            name: itinerary.title,
            itineraryId: itinerary.id,
            tripImage: itinerary.image,
          });
          // Re-fetch and render — same code path as a fresh "GET budget by
          // itinerary id" call would have served on a second visit.
          const fresh = await getBudget(itinerary.id);
          if (fresh) {
            return <BudgetDetail budget={fresh} persistMode="api" />;
          }
        } catch (err) {
          // Fall through to the not-found / mock-fallback path below if seed
          // fails (e.g. race condition where another tab just created it).
          console.warn(`[budget/[id]] auto-create failed for ${params.id}:`, err);
        }
      }
    }
  }

  // 3. Mock data fallback for demo browsing of unauth links.
  const mockBudget = getMockBudget(params.id) ?? getMockBudgetByItinerary(params.id);
  if (!mockBudget) notFound();
  return <BudgetDetail budget={mockBudget} persistMode="local" />;
}
