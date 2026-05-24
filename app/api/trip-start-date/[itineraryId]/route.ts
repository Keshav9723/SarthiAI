// app/api/trip-start-date/[itineraryId]/route.ts
//   GET    → { startDate: "yyyy-mm-dd" | null }
//   PUT    → { startDate: "yyyy-mm-dd" }     — sets / overwrites
//   DELETE → clears

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PutSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "yyyy-mm-dd"),
});

interface Ctx { params: { itineraryId: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ startDate: null });

  const { data, error } = await sb
    .from("trip_start_dates")
    .select("start_date")
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    startDate: data ? (data as { start_date: string }).start_date : null,
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
    return NextResponse.json({ error: "Invalid date", details: parsed.error.format() }, { status: 400 });
  }

  const { error } = await sb
    .from("trip_start_dates")
    .upsert(
      {
        user_id: user.id,
        itinerary_id: params.itineraryId,
        start_date: parsed.data.startDate,
      },
      { onConflict: "user_id,itinerary_id" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const { error } = await sb
    .from("trip_start_dates")
    .delete()
    .eq("user_id", user.id)
    .eq("itinerary_id", params.itineraryId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
