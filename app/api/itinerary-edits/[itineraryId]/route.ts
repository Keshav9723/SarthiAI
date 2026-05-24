// app/api/itinerary-edits/[itineraryId]/route.ts
// Inline-edit sync — when the user tweaks a slot on an itinerary, the edit
// gets mirrored here so it follows them across devices. The shape is a flat
// `{ "1:morning": "...", "2:evening": "..." }` map.
//
//   GET   → { edits: { "1:morning": "...", ... } }
//   PUT   → body { edits: {...} } — full replace
//   DELETE → resets every edit for this trip

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLOT_KEY_RX = /^(\d+):(morning|afternoon|evening)$/;

const PutSchema = z.object({
  edits: z.record(z.string().regex(SLOT_KEY_RX), z.string().max(2000)),
});

interface Ctx { params: { itineraryId: string } }

interface EditRow {
  day_number: number;
  slot: string;
  edited_text: string;
}

function rowsToMap(rows: EditRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[`${r.day_number}:${r.slot}`] = r.edited_text;
  }
  return map;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ edits: {} });

  const { data, error } = await sb
    .from("itinerary_edits")
    .select("day_number, slot, edited_text")
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ edits: rowsToMap((data ?? []) as EditRow[]) });
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

  // Full replace — delete then insert.
  const { error: delErr } = await sb
    .from("itinerary_edits")
    .delete()
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const rows: Array<{
    user_id: string;
    itinerary_id: string;
    day_number: number;
    slot: string;
    edited_text: string;
  }> = [];
  for (const [k, v] of Object.entries(parsed.data.edits)) {
    const m = k.match(SLOT_KEY_RX);
    if (!m) continue;
    rows.push({
      user_id: user.id,
      itinerary_id: params.itineraryId,
      day_number: parseInt(m[1], 10),
      slot: m[2],
      edited_text: v,
    });
  }
  if (rows.length === 0) return NextResponse.json({ ok: true });

  const { error: insErr } = await sb.from("itinerary_edits").insert(rows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const { error } = await sb
    .from("itinerary_edits")
    .delete()
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
