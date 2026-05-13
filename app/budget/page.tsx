// app/budget/page.tsx — Budget overview.

import BudgetOverview from "@/components/budget/BudgetOverview";

export const metadata = {
  title: "Budget Planner",
};

export default function BudgetPage() {
  return <BudgetOverview />;
}
