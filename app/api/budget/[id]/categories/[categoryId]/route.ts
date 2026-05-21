// app/api/budget/[id]/categories/[categoryId]/route.ts
// PATCH — update a category's planned amount

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { updateCategoryPlanned } from "@/lib/queries/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  planned: z.number().int().nonnegative().max(100_000_000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; categoryId: string } }
) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.format() }, { status: 400 });
  }
  try {
    await updateCategoryPlanned(params.id, params.categoryId, parsed.data.planned);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
