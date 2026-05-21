// app/api/budget/route.ts
// List + create endpoints for budgets.
//   GET  /api/budget        — list current user's budgets
//   POST /api/budget        — create a new budget (with seeded default categories)

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { listUserBudgets, createBudget } from "@/lib/queries/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ budgets: [] });
  }
  const budgets = await listUserBudgets();
  return NextResponse.json({ budgets });
}

const CreateBudgetSchema = z.object({
  name: z.string().min(1).max(120),
  itineraryId: z.string().uuid().nullish(),
  tripDates: z.string().nullish(),
  tripImage: z.string().nullish(),
});

export async function POST(req: NextRequest) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to create a budget." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateBudgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const { id } = await createBudget({
      userId: user.id,
      name: parsed.data.name,
      itineraryId: parsed.data.itineraryId ?? null,
      tripDates: parsed.data.tripDates ?? null,
      tripImage: parsed.data.tripImage ?? null,
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
