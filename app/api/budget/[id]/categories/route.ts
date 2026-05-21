// app/api/budget/[id]/categories/route.ts
// POST /api/budget/[id]/categories  — add a new category

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { addCategory } from "@/lib/queries/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AddCategorySchema = z.object({
  label: z.string().min(1).max(60),
  icon: z.string().max(8).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AddCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.format() }, { status: 400 });
  }
  try {
    const { id } = await addCategory({
      budgetId: params.id,
      label: parsed.data.label,
      icon: parsed.data.icon,
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
