// app/api/preferences/route.ts
// Read + write the signed-in user's travel preferences (home city, hotel tier,
// dietary, etc.) — the same shape `usePreferences` keeps in localStorage. RLS
// in user_preferences guarantees the auth.uid() check.
//
//   GET  /api/preferences   → { preferences: {...} | null }
//   PUT  /api/preferences   → upsert with the body. Returns the new row.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PrefsSchema = z.object({
  preferredGroup: z.enum(["couple", "family", "friends", "solo"]).optional(),
  hotelTier: z.enum(["budget", "comfort", "premium", "luxury"]).optional(),
  dietary: z.enum(["none", "vegetarian", "vegan", "jain", "halal"]).optional(),
  fromCity: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

interface PrefRow {
  user_id: string;
  preferred_group: string | null;
  hotel_tier: string | null;
  dietary: string | null;
  from_city: string | null;
  notes: string | null;
  updated_at: string;
}

function rowToUi(r: PrefRow | null) {
  if (!r) return null;
  return {
    preferredGroup: r.preferred_group ?? undefined,
    hotelTier: r.hotel_tier ?? undefined,
    dietary: r.dietary ?? undefined,
    fromCity: r.from_city ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export async function GET() {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ preferences: null });

  const { data, error } = await sb
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: `Read failed: ${error.message}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ preferences: rowToUi(data as PrefRow | null) });
}

export async function PUT(req: NextRequest) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to save preferences." },
      { status: 401 }
    );
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preferences", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const p = parsed.data;
  const row = {
    user_id: user.id,
    preferred_group: p.preferredGroup ?? null,
    hotel_tier: p.hotelTier ?? null,
    dietary: p.dietary ?? null,
    from_city: p.fromCity ?? null,
    notes: p.notes ?? null,
  };

  const { data, error } = await sb
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json(
      { error: `Write failed: ${error.message}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ preferences: rowToUi(data as PrefRow) });
}
