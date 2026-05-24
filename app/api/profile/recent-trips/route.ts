// app/api/profile/recent-trips/route.ts
// Returns the signed-in user's N most recent itineraries (default 3) in the
// shape the frontend's `Itinerary` UI type expects. Used by the Profile
// page's "Recent trips" section.
//
//   GET /api/profile/recent-trips?limit=3 → { itineraries: Itinerary[] }
//
// Returns an empty array (not an error) when signed out.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rowToUiItinerary } from "@/lib/queries/itineraries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sb = createServerClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ itineraries: [] });

    const url = new URL(req.url);
    const limit = Math.max(
      1,
      Math.min(20, Number(url.searchParams.get("limit") ?? 3))
    );

    const { data, error } = await sb
      .from("itineraries")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_template", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`[profile/recent-trips] DB error: ${error.message}`);
      return NextResponse.json({ itineraries: [] });
    }

    const rows = data ?? [];
    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itineraries: rows.map((r) => rowToUiItinerary(r as any)),
    });
  } catch (err) {
    console.warn(`[profile/recent-trips] unexpected: ${(err as Error).message}`);
    return NextResponse.json({ itineraries: [] });
  }
}
