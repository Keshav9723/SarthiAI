// app/api/itinerary/[id]/route.ts
// PATCH endpoint for itinerary mutations. Used by the modify_itinerary intent
// in the chatbot. Validates the patch shape, applies it to the existing
// itinerary, and persists the new days/route/title/highlights back to Supabase.
//
//   PATCH /api/itinerary/{uuid}
//   Body: { patches: [...], summary: "..." }   // see lib/schemas/itinerary-patch

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ItineraryPatchSchema } from "@/lib/schemas/itinerary-patch";
import { applyItineraryPatch } from "@/lib/itinerary/applyPatch";
import { getItineraryById } from "@/lib/queries/itineraries";
import { ItinerarySchema } from "@/lib/schemas/itinerary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to edit your itinerary." }, { status: 401 });
  }

  // Validate request body
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const patchResult = ItineraryPatchSchema.safeParse(body);
  if (!patchResult.success) {
    return NextResponse.json(
      { error: "Invalid patch", details: patchResult.error.format() },
      { status: 400 }
    );
  }

  // Load the existing row
  const existingRow = await getItineraryById(params.id);
  if (!existingRow) {
    return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
  }
  if (existingRow.is_template) {
    return NextResponse.json(
      { error: "Template itineraries can't be edited. Generate your own copy first." },
      { status: 403 }
    );
  }
  if (existingRow.user_id !== user.id) {
    return NextResponse.json({ error: "Not your itinerary" }, { status: 403 });
  }

  // Reconstruct an ItinerarySchema-shaped object so applyPatch + validation work
  const existing = ItinerarySchema.safeParse({
    title: existingRow.title,
    destination: existingRow.destination,
    state: existingRow.state,
    duration: existingRow.duration,
    nights: existingRow.nights,
    total_days: existingRow.total_days,
    group_type: existingRow.group_type,
    group_size: existingRow.group_size,
    highlights: existingRow.highlights ?? [],
    total_budget: existingRow.total_budget,
    price_per_person: existingRow.price_per_person,
    days: existingRow.days,
    route: existingRow.route,
    inclusions: existingRow.inclusions ?? [],
    exclusions: existingRow.exclusions ?? [],
  });
  if (!existing.success) {
    return NextResponse.json(
      { error: "Stored itinerary is in an unexpected shape; can't patch." },
      { status: 500 }
    );
  }

  // Apply the patch
  const updated = applyItineraryPatch(existing.data, patchResult.data);

  // Persist only the fields a patch can actually change
  const { error: updateErr } = await sb
    .from("itineraries")
    .update({
      title: updated.title,
      days: updated.days,
      highlights: updated.highlights,
    })
    .eq("id", existingRow.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Failed to save patch: ${updateErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: existingRow.id,
    summary: patchResult.data.summary,
    patches_applied: patchResult.data.patches.length,
  });
}
