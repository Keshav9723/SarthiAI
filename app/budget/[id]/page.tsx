// app/budget/[id]/page.tsx — single budget detail.
// `id` can be a budget id (b-1, b-2…) OR an itinerary id (1, 2, 3) so links
// from the Itinerary view and My Itineraries cards Just Work.

import { notFound } from "next/navigation";
import BudgetDetail from "@/components/budget/BudgetDetail";
import {
  getBudgetById,
  getBudgetByItineraryId,
  MOCK_BUDGETS,
} from "@/lib/mockData";

interface Props {
  params: { id: string };
}

export function generateStaticParams() {
  return MOCK_BUDGETS.flatMap((b) =>
    b.itineraryId
      ? [{ id: b.id }, { id: b.itineraryId }]
      : [{ id: b.id }]
  );
}

export default function BudgetDetailPage({ params }: Props) {
  const budget =
    getBudgetById(params.id) ?? getBudgetByItineraryId(params.id);
  if (!budget) notFound();
  return <BudgetDetail budget={budget} />;
}
