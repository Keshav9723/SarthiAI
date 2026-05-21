// app/api/budget/[id]/route.ts
//   GET    /api/budget/[id]   — fetch one budget (categories + expenses)
//   PATCH  /api/budget/[id]   — rename
//   DELETE /api/budget/[id]   — remove

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import {
  getBudget, renameBudget, deleteBudget,
} from "@/lib/queries/budget";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const budget = await getBudget(params.id);
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ budget });
}

const PatchSchema = z.object({ name: z.string().min(1).max(120) });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.format() }, { status: 400 });
  }
  try {
    await renameBudget(params.id, parsed.data.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  try {
    await deleteBudget(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
