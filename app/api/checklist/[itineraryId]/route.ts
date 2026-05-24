// app/api/checklist/[itineraryId]/route.ts
// Per-itinerary checklist sync. The frontend keeps state in localStorage for
// instant updates; this endpoint mirrors it to the `checklist_state` table
// so it follows the user across devices.
//
//   GET  /api/checklist/{itineraryId}  → { checked: string[] }
//   PUT  /api/checklist/{itineraryId}  → body { checked: string[] }, full replace

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PutSchema = z.object({
  checked: z.array(z.string().min(1).max(120)).max(500),
});

interface Ctx { params: { itineraryId: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ checked: [] });

  const { data, error } = await sb
    .from("checklist_state")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId)
    .eq("checked", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    checked: (data ?? []).map((r) => (r as { item_id: string }).item_id),
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
  }

  // Full replace: delete any rows for this trip then insert the current set.
  // Simpler than diffing and handles the "all unchecked" case naturally.
  const { error: delErr } = await sb
    .from("checklist_state")
    .delete()
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (parsed.data.checked.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const rows = parsed.data.checked.map((item_id) => ({
    user_id: user.id,
    itinerary_id: params.itineraryId,
    item_id,
    checked: true,
  }));
  const { error: insErr } = await sb.from("checklist_state").insert(rows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
