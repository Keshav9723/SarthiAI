// app/api/itinerary/copy/route.ts
// Copies a template itinerary into the signed-in user's own collection so the
// user can edit / customize / track it as their own trip. Used by the "Save
// Trip" button shown only on template-itinerary pages — user-generated trips
// are already in /my-itineraries so they don't need this.
//
//   POST /api/itinerary/copy   body { templateId }
//
// Response: { id }   — the new (user-owned) itinerary id.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getItineraryById } from "@/lib/queries/itineraries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  templateId: z.string().min(1).max(120),
});

export async function POST(req: NextRequest) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save trips." }, { status: 401 });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Load source — must be a template (is_template=true). We never copy
  // someone else's user-owned trip.
  const src = await getItineraryById(parsed.data.templateId);
  if (!src) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  if (!src.is_template) {
    return NextResponse.json(
      { error: "Only templates can be saved as new trips." },
      { status: 403 }
    );
  }

  // Idempotency: if the user already has a copy of this template, return
  // that one instead of creating a duplicate. We match on title+destination
  // for stability since we don't store the source template id on copies.
  const { data: existing } = await sb
    .from("itineraries")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_template", false)
    .eq("title", src.title)
    .eq("destination", src.destination)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ id: (existing as { id: string }).id, alreadySaved: true });
  }

  // Copy everything except identity / template-ness / timestamps. The new
  // row is owned by the current user and editable.
  const row = {
    user_id: user.id,
    is_template: false,
    slug: null as string | null,

    title: src.title,
    destination: src.destination,
    state: src.state,
    duration: src.duration,
    nights: src.nights,
    total_days: src.total_days,
    group_type: src.group_type,
    group_size: src.group_size,

    image: src.image,
    gallery: src.gallery ?? [],

    total_budget: src.total_budget,
    price_per_person: src.price_per_person,

    highlights: src.highlights ?? [],
    weather: src.weather,
    weather_icon: src.weather_icon,
    status: "upcoming" as const,

    from_city: src.from_city,
    posted_ago: null as string | null,

    days: src.days,
    route: src.route,
    inclusions: src.inclusions ?? [],
    exclusions: src.exclusions ?? [],
  };

  const { data, error } = await sb
    .from("itineraries")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { error: `Failed to save: ${error.message}` },
      { status: 500 }
    );
  }
  return NextResponse.json({ id: (data as { id: string }).id });
}
