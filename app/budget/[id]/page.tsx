// app/budget/[id]/page.tsx — single budget detail.
// `id` can be a Supabase budget uuid, a Supabase itinerary uuid, OR one of the
// legacy mock ids (b-1, b-2…). DB lookup first, fall back to mocks so demo
// links keep working without auth.

import { notFound } from "next/navigation";
import BudgetDetail from "@/components/budget/BudgetDetail";
import {
  getBudgetById as getMockBudget,
  getBudgetByItineraryId as getMockBudgetByItinerary,
  MOCK_BUDGETS,
} from "@/lib/mockData";
import { getBudget } from "@/lib/queries/budget";

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
  // Try Supabase first (works for both budget uuid + itinerary uuid lookups).
  const dbBudget = await getBudget(params.id);
  if (dbBudget) {
    return <BudgetDetail budget={dbBudget} persistMode="api" />;
  }
  // Fall back to mock data (string ids like "b-1", "1") for demo browsing.
  const mockBudget = getMockBudget(params.id) ?? getMockBudgetByItinerary(params.id);
  if (!mockBudget) notFound();
  return <BudgetDetail budget={mockBudget} persistMode="local" />;
}
