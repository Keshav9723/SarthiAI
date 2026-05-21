// lib/queries/budget.ts
// Server-side Supabase helpers for the budgets / categories / expenses tables.
// Every read/write here runs under the caller's auth session and inherits RLS.
//
// Shape we return matches the frontend `Budget` interface in lib/mockData.ts so
// BudgetDetail + BudgetOverview don't need a parallel type.

import { createServerClient } from "@/lib/supabase/server";
import type {
  Budget,
  BudgetCategory,
  BudgetExpense,
} from "@/lib/mockData";

// ---------------------------------------------------------------------------
// Default categories — seeded when a new budget is created
// ---------------------------------------------------------------------------

export const DEFAULT_CATEGORIES: Omit<BudgetCategory, "spent" | "expenses">[] = [
  { id: "flights",    label: "Flights",    icon: "✈️", planned: 0 },
  { id: "hotels",     label: "Hotels",     icon: "🏨", planned: 0 },
  { id: "food",       label: "Food",       icon: "🍽️", planned: 0 },
  { id: "transport",  label: "Transport",  icon: "🚗", planned: 0 },
  { id: "activities", label: "Activities", icon: "🎢", planned: 0 },
  { id: "misc",       label: "Misc",       icon: "🧾", planned: 0 },
];

// ---------------------------------------------------------------------------
// Row shapes — match the SQL columns exactly
// ---------------------------------------------------------------------------

interface BudgetRow {
  id: string;
  user_id: string;
  itinerary_id: string | null;
  name: string;
  trip_image: string | null;
  trip_dates: string | null;
  created_at: string;
}

interface CategoryRow {
  budget_id: string;
  id: string;
  label: string;
  icon: string | null;
  planned: number;
  spent: number;
  display_order: number;
}

interface ExpenseRow {
  id: string;
  budget_id: string;
  category_id: string;
  label: string;
  amount: number;
  date: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listUserBudgets(): Promise<Budget[]> {
  const sb = createServerClient();
  const { data: budgets, error: bErr } = await sb
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: false });
  if (bErr || !budgets) return [];
  if (budgets.length === 0) return [];

  const ids = budgets.map((b: BudgetRow) => b.id);
  const [{ data: cats }, { data: exps }] = await Promise.all([
    sb.from("budget_categories").select("*").in("budget_id", ids).order("display_order"),
    sb.from("budget_expenses").select("*").in("budget_id", ids).order("date"),
  ]);

  return (budgets as BudgetRow[]).map((b) =>
    assembleBudget(b, (cats ?? []) as CategoryRow[], (exps ?? []) as ExpenseRow[])
  );
}

export async function getBudget(id: string): Promise<Budget | null> {
  const sb = createServerClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  // Accept either a budget id (uuid) or an itinerary id (uuid) — same lookup,
  // different filter — so links from the itinerary view work transparently.
  const filter = isUuid ? sb.from("budgets").select("*").or(`id.eq.${id},itinerary_id.eq.${id}`) : null;
  if (!filter) return null;

  const { data: budgetRows, error: bErr } = await filter.limit(1);
  if (bErr || !budgetRows?.length) return null;
  const b = budgetRows[0] as BudgetRow;

  const [{ data: cats }, { data: exps }] = await Promise.all([
    sb.from("budget_categories").select("*").eq("budget_id", b.id).order("display_order"),
    sb.from("budget_expenses").select("*").eq("budget_id", b.id).order("date"),
  ]);

  return assembleBudget(b, (cats ?? []) as CategoryRow[], (exps ?? []) as ExpenseRow[]);
}

function assembleBudget(
  b: BudgetRow,
  allCats: CategoryRow[],
  allExps: ExpenseRow[]
): Budget {
  const cats = allCats.filter((c) => c.budget_id === b.id);
  const exps = allExps.filter((e) => e.budget_id === b.id);

  const categories: BudgetCategory[] = cats.map((c) => {
    const ownExpenses: BudgetExpense[] = exps
      .filter((e) => e.category_id === c.id)
      .map((e) => ({ id: e.id, label: e.label, amount: e.amount, date: e.date }));
    return {
      id: c.id,
      label: c.label,
      icon: c.icon ?? "🧾",
      planned: c.planned,
      spent: c.spent,
      expenses: ownExpenses,
    };
  });

  const totalPlanned = categories.reduce((s, c) => s + c.planned, 0);
  const totalSpent   = categories.reduce((s, c) => s + c.spent, 0);

  return {
    id: b.id,
    itineraryId: b.itinerary_id,
    name: b.name,
    tripImage: b.trip_image ?? undefined,
    tripDates: b.trip_dates ?? undefined,
    totalPlanned,
    totalSpent,
    categories,
    createdAt: b.created_at,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createBudget(opts: {
  userId: string;
  name: string;
  itineraryId?: string | null;
  tripDates?: string | null;
  tripImage?: string | null;
}): Promise<{ id: string }> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("budgets")
    .insert({
      user_id: opts.userId,
      name: opts.name,
      itinerary_id: opts.itineraryId ?? null,
      trip_dates: opts.tripDates ?? null,
      trip_image: opts.tripImage ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Create budget failed: ${error.message}`);

  // Seed default categories so the user has somewhere to put expenses
  const catRows = DEFAULT_CATEGORIES.map((c, i) => ({
    budget_id: data.id,
    id: c.id,
    label: c.label,
    icon: c.icon,
    planned: 0,
    spent: 0,
    display_order: i,
  }));
  const { error: catErr } = await sb.from("budget_categories").insert(catRows);
  if (catErr) throw new Error(`Seed categories failed: ${catErr.message}`);

  return { id: data.id };
}

export async function deleteBudget(id: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb.from("budgets").delete().eq("id", id);
  if (error) throw new Error(`Delete budget failed: ${error.message}`);
}

export async function renameBudget(id: string, name: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb.from("budgets").update({ name }).eq("id", id);
  if (error) throw new Error(`Rename budget failed: ${error.message}`);
}

export async function updateCategoryPlanned(
  budgetId: string,
  categoryId: string,
  planned: number
): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb
    .from("budget_categories")
    .update({ planned: Math.max(0, Math.round(planned)) })
    .eq("budget_id", budgetId)
    .eq("id", categoryId);
  if (error) throw new Error(`Update planned failed: ${error.message}`);
}

export async function addCategory(opts: {
  budgetId: string;
  label: string;
  icon?: string;
}): Promise<{ id: string }> {
  const sb = createServerClient();
  const id =
    opts.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
  const { data: existing } = await sb
    .from("budget_categories")
    .select("display_order")
    .eq("budget_id", opts.budgetId)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const { error } = await sb.from("budget_categories").insert({
    budget_id: opts.budgetId,
    id,
    label: opts.label,
    icon: opts.icon ?? "🧾",
    planned: 0,
    spent: 0,
    display_order: nextOrder,
  });
  if (error) throw new Error(`Add category failed: ${error.message}`);
  return { id };
}

export async function addExpense(opts: {
  budgetId: string;
  categoryId: string;
  label: string;
  amount: number;
  date: string;
}): Promise<{ id: string }> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("budget_expenses")
    .insert({
      budget_id: opts.budgetId,
      category_id: opts.categoryId,
      label: opts.label,
      amount: Math.max(0, Math.round(opts.amount)),
      date: opts.date,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Add expense failed: ${error.message}`);

  // Update the category's spent total in a separate query (no trigger yet).
  await bumpCategorySpent(opts.budgetId, opts.categoryId, opts.amount);
  return { id: data.id };
}

export async function removeExpense(opts: {
  budgetId: string;
  expenseId: string;
}): Promise<void> {
  const sb = createServerClient();
  // Read amount + category first so we can decrement spent
  const { data: exp, error: readErr } = await sb
    .from("budget_expenses")
    .select("amount, category_id")
    .eq("id", opts.expenseId)
    .eq("budget_id", opts.budgetId)
    .maybeSingle();
  if (readErr || !exp) throw new Error("Expense not found");

  const { error } = await sb
    .from("budget_expenses")
    .delete()
    .eq("id", opts.expenseId);
  if (error) throw new Error(`Delete expense failed: ${error.message}`);

  await bumpCategorySpent(opts.budgetId, exp.category_id as string, -(exp.amount as number));
}

async function bumpCategorySpent(
  budgetId: string,
  categoryId: string,
  delta: number
): Promise<void> {
  const sb = createServerClient();
  const { data: cat } = await sb
    .from("budget_categories")
    .select("spent")
    .eq("budget_id", budgetId)
    .eq("id", categoryId)
    .maybeSingle();
  const current = (cat?.spent as number | undefined) ?? 0;
  const next = Math.max(0, current + delta);
  await sb
    .from("budget_categories")
    .update({ spent: next })
    .eq("budget_id", budgetId)
    .eq("id", categoryId);
}
