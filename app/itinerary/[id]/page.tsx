// app/itinerary/[id]/page.tsx — itinerary detail by id.
// Lookup order:
//   1. Supabase `itineraries` row (by uuid OR by template slug). RLS handles
//      authorization: anon callers only see templates; signed-in users see
//      templates + their own trips.
//   2. Fall back to the in-memory MOCK_ITINERARIES list for any string id
//      that doesn't exist in Supabase yet — keeps demo URLs working.

import { notFound } from "next/navigation";
import ItineraryView from "@/components/itinerary/ItineraryView";
import {
  getItineraryById as getMockItineraryById,
  MOCK_ITINERARIES,
  type Itinerary as MockItinerary,
} from "@/lib/mockData";
import { getItineraryById as getDbItineraryById, type ItineraryRow } from "@/lib/queries/itineraries";

interface Props {
  params: { id: string };
}

// Static params from mock data only — DB-stored trips render dynamically.
export function generateStaticParams() {
  return MOCK_ITINERARIES.map((it) => ({ id: it.id }));
}

export const dynamic = "force-dynamic"; // user itineraries need fresh data + auth

export async function generateMetadata({ params }: Props) {
  const it = await loadItinerary(params.id);
  return {
    title: it?.title ?? "Itinerary",
    description: it
      ? `${it.duration} · ${it.destination}. ${(it.highlights ?? []).join(" · ")}`
      : undefined,
  };
}

export default async function ItineraryPage({ params }: Props) {
  const itinerary = await loadItinerary(params.id);
  if (!itinerary) notFound();
  return <ItineraryView itinerary={itinerary as MockItinerary} />;
}

/**
 * Pull an itinerary either from Supabase (preferred) or the mock list (fallback).
 * Maps Postgres snake_case columns onto the camelCase shape ItineraryView expects.
 */
async function loadItinerary(idOrSlug: string): Promise<MockItinerary | null> {
  const row = await getDbItineraryById(idOrSlug);
  if (row) return rowToView(row);
  return getMockItineraryById(idOrSlug) ?? null;
}

function rowToView(r: ItineraryRow): MockItinerary {
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
    groupType: r.group_type as MockItinerary["groupType"],
    groupSize: r.group_size,
    image: r.image ?? "",
    gallery: r.gallery ?? [],
    totalBudget: r.total_budget,
    pricePerPerson: r.price_per_person,
    highlights: r.highlights ?? [],
    weather: r.weather ?? "",
    weatherIcon: r.weather_icon ?? "",
    status: r.status as MockItinerary["status"],
    fromCity: r.from_city ?? "",
    postedAgo: r.posted_ago ?? "",
    days: days.map((d) => ({
      dayNumber: Number(d.day_number ?? 0),
      location: String(d.location ?? ""),
      morning: String(d.morning ?? ""),
      afternoon: String(d.afternoon ?? ""),
      evening: String(d.evening ?? ""),
      type: (d.type as MockItinerary["days"][number]["type"]) ?? "explore",
    })),
    route: route.map((r2) => ({
      city: String(r2.city ?? ""),
      nights: Number(r2.nights ?? 0),
      transferToNext: r2.transfer_to_next
        ? {
            mode: String((r2.transfer_to_next as Record<string, unknown>).mode ?? "drive") as MockItinerary["route"][number]["transferToNext"] extends infer T ? T extends { mode: infer M } ? M : never : never,
            label: String((r2.transfer_to_next as Record<string, unknown>).label ?? ""),
            duration: String((r2.transfer_to_next as Record<string, unknown>).duration ?? ""),
          }
        : null,
    })) as MockItinerary["route"],
    inclusions: r.inclusions ?? [],
    exclusions: r.exclusions ?? [],
    savedAt: r.saved_at,
  };
}
