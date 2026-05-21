// app/api/budget/[id]/expenses/route.ts
// POST — add an expense to a category

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { addExpense } from "@/lib/queries/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AddExpenseSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().min(1).max(120),
  amount: z.number().int().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AddExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.format() }, { status: 400 });
  }
  try {
    const { id } = await addExpense({
      budgetId: params.id,
      categoryId: parsed.data.categoryId,
      label: parsed.data.label,
      amount: parsed.data.amount,
      date: parsed.data.date,
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
