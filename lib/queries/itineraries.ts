// lib/queries/itineraries.ts
// Server-side query helpers for the itineraries table. All callers must run
// inside a route handler / server component so we can read the auth session
// and respect RLS.
//
// Functions:
//   • insertGeneratedItinerary — save a freshly-generated trip + return its id
//   • getItineraryById          — fetch a single itinerary the caller is allowed to see
//   • listUserItineraries       — every trip owned by the current user

import { createServerClient } from "@/lib/supabase/server";
import type { Itinerary } from "@/lib/schemas/itinerary";
import type { Itinerary as UiItinerary } from "@/lib/mockData";

// Shape mirrors the columns on the `itineraries` table 1:1 so we can pass it
// straight into a Supabase insert without translation.
export interface ItineraryRow {
  id: string;
  user_id: string | null;
  is_template: boolean;
  slug: string | null;
  title: string;
  destination: string;
  state: string;
  duration: string;
  nights: number;
  total_days: number;
  group_type: string;
  group_size: number;
  image: string | null;
  gallery: string[];
  total_budget: number;
  price_per_person: number;
  highlights: string[];
  weather: string | null;
  weather_icon: string | null;
  status: string;
  from_city: string | null;
  posted_ago: string | null;
  days: unknown;
  route: unknown;
  inclusions: string[];
  exclusions: string[];
  saved_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Insert a generated itinerary into the DB, attaching the current user as
 * owner. The caller MUST have verified the session; this just trusts what
 * createServerClient().auth.getUser() returns.
 *
 * Also pulls hero image + gallery from the destinations table when available
 * so user-generated trips show the same Wikipedia photos as templates do —
 * otherwise the itinerary detail page would render a random Unsplash fallback.
 */
export async function insertGeneratedItinerary(opts: {
  userId: string;
  itinerary: Itinerary;
  fromCity?: string;
}): Promise<{ id: string }> {
  const sb = createServerClient();

  // Look up the destination's hero + gallery — populated by `npm run seed:images`.
  // Match on either the slug-form of the destination name or the name itself.
  const slug = opts.itinerary.destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const { data: dest } = await sb
    .from("destinations")
    .select("image, gallery")
    .or(`slug.eq.${slug},name.ilike.${opts.itinerary.destination}`)
    .limit(1)
    .maybeSingle();

  const row = {
    user_id: opts.userId,
    is_template: false,
    slug: null as string | null,

    title: opts.itinerary.title,
    destination: opts.itinerary.destination,
    state: opts.itinerary.state,
    duration: opts.itinerary.duration,
    nights: opts.itinerary.nights,
    total_days: opts.itinerary.total_days,
    group_type: opts.itinerary.group_type,
    group_size: opts.itinerary.group_size,

    image: (dest?.image as string | null) ?? null,
    gallery: (dest?.gallery as string[] | null) ?? [],

    total_budget: opts.itinerary.total_budget,
    price_per_person: opts.itinerary.price_per_person,

    highlights: opts.itinerary.highlights,
    weather: null as string | null,
    weather_icon: null as string | null,
    status: "upcoming" as const,

    from_city: opts.fromCity ?? null,
    posted_ago: null as string | null,

    days: opts.itinerary.days,
    route: opts.itinerary.route,
    inclusions: opts.itinerary.inclusions,
    exclusions: opts.itinerary.exclusions,
  };

  const { data, error } = await sb
    .from("itineraries")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to save itinerary: ${error.message}`);
  }
  return { id: data.id };
}

/**
 * Fetch an itinerary by its uuid id OR template slug. Respects RLS automatically
 * — anon callers can only see templates; signed-in users see templates + their
 * own trips. Returns null if not found or not allowed.
 */
export async function getItineraryById(idOrSlug: string): Promise<ItineraryRow | null> {
  const sb = createServerClient();

  // Looks like a uuid (8-4-4-4-12 hex) → query by id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const query = isUuid
    ? sb.from("itineraries").select("*").eq("id", idOrSlug)
    : sb.from("itineraries").select("*").eq("slug", idOrSlug);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn(`[itineraries] lookup failed for ${idOrSlug}:`, error.message);
    return null;
  }
  return (data as ItineraryRow) ?? null;
}

/**
 * List every itinerary owned by the current user, newest first.
 * Used by the My Itineraries page.
 */
export async function listUserItineraries(userId: string): Promise<ItineraryRow[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("itineraries")
    .select("*")
    .eq("user_id", userId)
    .eq("is_template", false)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn(`[itineraries] list failed:`, error.message);
    return [];
  }
  return (data as ItineraryRow[]) ?? [];
}

/**
 * Convert a snake_case DB row into the camelCase shape the UI components
 * (ItineraryCard, ItineraryView, etc.) expect. Mirrors the type in mockData.ts.
 */
export function rowToUiItinerary(r: ItineraryRow): UiItinerary {
  const days = Array.isArray(r.days) ? (r.days as Array<Record<string, unknown>>) : [];
  const route = Array.isArray(r.route) ? (r.route as Array<Record<string, unknown>>) : [];
  return {
    id: r.id,
    title: r.title,
    destination: r.destination,
    state: r.state,
    duration: r.duration,
    nights: r.nights,
    totalDays: r.total_days,
    groupType: r.group_type as UiItinerary["groupType"],
    groupSize: r.group_size,
    image: r.image ?? "",
    gallery: r.gallery ?? [],
    totalBudget: r.total_budget,
    pricePerPerson: r.price_per_person,
    highlights: r.highlights ?? [],
    weather: r.weather ?? "",
    weatherIcon: r.weather_icon ?? "",
    status: r.status as UiItinerary["status"],
    fromCity: r.from_city ?? "",
    postedAgo: r.posted_ago ?? "",
    days: days.map((d) => ({
      dayNumber: Number(d.day_number ?? 0),
      location: String(d.location ?? ""),
      morning: String(d.morning ?? ""),
      afternoon: String(d.afternoon ?? ""),
      evening: String(d.evening ?? ""),
      type: (d.type as UiItinerary["days"][number]["type"]) ?? "explore",
    })),
    route: route.map((r2) => ({
      city: String(r2.city ?? ""),
      nights: Number(r2.nights ?? 0),
      transferToNext: r2.transfer_to_next
        ? {
            mode: String((r2.transfer_to_next as Record<string, unknown>).mode ?? "drive"),
            label: String((r2.transfer_to_next as Record<string, unknown>).label ?? ""),
            duration: String((r2.transfer_to_next as Record<string, unknown>).duration ?? ""),
          }
        : null,
    })) as UiItinerary["route"],
    inclusions: r.inclusions ?? [],
    exclusions: r.exclusions ?? [],
    savedAt: r.saved_at,
  };
}

/**
 * Template itineraries (curated, ready-to-view trips) for the homepage.
 * Used by both the Recently Generated rail and the Packages section.
 */
export async function listTemplateItineraries(limit = 12): Promise<ItineraryRow[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("itineraries")
    .select("*")
    .eq("is_template", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[itineraries] templates list failed:`, error.message);
    return [];
  }
  return (data as ItineraryRow[]) ?? [];
}
