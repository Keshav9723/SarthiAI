// scripts/seed.ts
// Idempotent seed: loads destinations + destination_extras + the 9 mock
// itineraries (as is_template = true rows) into Supabase. Run after all 3
// migrations have been applied.
//
// Usage:
//   1. Make sure .env.local has SUPABASE_SECRET_KEY set
//   2. npx tsx scripts/seed.ts
//
// Re-runnable any time — uses upserts.

import dotenv from "dotenv";
// Explicitly load .env.local (Next.js's convention). `import "dotenv/config"`
// only picks up .env, which we don't use.
dotenv.config({ path: ".env.local" });
dotenv.config(); // .env, no-op if missing — keeps deploy-style envs working

import { createClient } from "@supabase/supabase-js";
import {
  MOCK_DESTINATIONS,
  MOCK_ITINERARIES,
  DESTINATION_EXTRAS,
} from "../lib/mockData";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error(
    "[seed] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local."
  );
  process.exit(1);
}

// Service-role client — bypasses RLS, lets us bulk-insert public reference data.
const sb = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Seed destinations + extras
// ---------------------------------------------------------------------------

async function seedDestinations() {
  console.log(`[seed] Upserting ${MOCK_DESTINATIONS.length} destinations…`);

  const rows = MOCK_DESTINATIONS.map((d) => ({
    slug: slugify(d.name),
    name: d.name,
    state: d.state,
    tagline: d.tagline,
    description: d.description,
    image: d.image,
    gallery: d.gallery,
    tags: d.tags,
    best_for: d.bestFor,
    season: d.season,
    best_months: d.bestMonths,
    budget_from: d.budgetFrom,
    recommended_duration: d.recommendedDuration,
    weather: d.weather,
    temperature: d.temperature,
  }));

  const { error } = await sb
    .from("destinations")
    .upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  console.log(`[seed] ✓ destinations`);

  // Pull back IDs to wire up extras
  const { data: persisted, error: fetchErr } = await sb
    .from("destinations")
    .select("id, slug, name");
  if (fetchErr) throw fetchErr;

  const idBySlug = new Map(persisted!.map((d) => [d.slug, d.id]));

  // ----- experiences -----
  const expRows: {
    destination_id: string;
    emoji: string;
    title: string;
    description: string;
    display_order: number;
  }[] = [];

  for (const dest of MOCK_DESTINATIONS) {
    const extras = DESTINATION_EXTRAS[dest.name];
    if (!extras) continue;
    const destId = idBySlug.get(slugify(dest.name));
    if (!destId) continue;
    extras.topExperiences.forEach((e, i) => {
      expRows.push({
        destination_id: destId,
        emoji: e.emoji,
        title: e.title,
        description: e.description,
        display_order: i,
      });
    });
  }

  if (expRows.length > 0) {
    // Wipe + reinsert so we don't accumulate stale rows on re-run.
    const destIds = Array.from(new Set(expRows.map((r) => r.destination_id)));
    await sb
      .from("destination_experiences")
      .delete()
      .in("destination_id", destIds);
    const { error: e } = await sb.from("destination_experiences").insert(expRows);
    if (e) throw e;
    console.log(`[seed] ✓ ${expRows.length} destination_experiences`);
  }

  // ----- faqs -----
  const faqRows: {
    destination_id: string;
    question: string;
    answer: string;
    display_order: number;
  }[] = [];

  for (const dest of MOCK_DESTINATIONS) {
    const extras = DESTINATION_EXTRAS[dest.name];
    if (!extras) continue;
    const destId = idBySlug.get(slugify(dest.name));
    if (!destId) continue;
    extras.faqs.forEach((f, i) => {
      faqRows.push({
        destination_id: destId,
        question: f.question,
        answer: f.answer,
        display_order: i,
      });
    });
  }

  if (faqRows.length > 0) {
    const destIds = Array.from(new Set(faqRows.map((r) => r.destination_id)));
    await sb.from("destination_faqs").delete().in("destination_id", destIds);
    const { error: e } = await sb.from("destination_faqs").insert(faqRows);
    if (e) throw e;
    console.log(`[seed] ✓ ${faqRows.length} destination_faqs`);
  }
}

// ---------------------------------------------------------------------------
// Seed itinerary templates (the 9 pre-saved trips from MOCK_ITINERARIES)
// ---------------------------------------------------------------------------

async function seedItineraries() {
  console.log(`[seed] Upserting ${MOCK_ITINERARIES.length} itinerary templates…`);

  const rows = MOCK_ITINERARIES.map((it) => ({
    // Use the existing string id as the slug so /itinerary/[id] URLs from the
    // frontend continue to resolve (the real id is a uuid generated by the DB).
    slug: it.id,
    is_template: true,
    user_id: null as string | null,

    title: it.title,
    destination: it.destination,
    state: it.state,
    duration: it.duration,
    nights: it.nights,
    total_days: it.totalDays,
    group_type: it.groupType,
    group_size: it.groupSize,
    image: it.image,
    gallery: it.gallery,
    total_budget: it.totalBudget,
    price_per_person: it.pricePerPerson,
    highlights: it.highlights,
    weather: it.weather,
    weather_icon: it.weatherIcon,
    status: it.status,
    from_city: it.fromCity,
    posted_ago: it.postedAgo,
    // Map FE field shapes → DB column shapes (snake_case keys in jsonb)
    days: it.days.map((d) => ({
      day_number: d.dayNumber,
      location: d.location,
      morning: d.morning,
      afternoon: d.afternoon,
      evening: d.evening,
      type: d.type,
    })),
    route: it.route.map((stop) => ({
      city: stop.city,
      nights: stop.nights,
      transfer_to_next: stop.transferToNext
        ? {
            mode: stop.transferToNext.mode,
            label: stop.transferToNext.label,
            duration: stop.transferToNext.duration,
          }
        : null,
    })),
    inclusions: it.inclusions,
    exclusions: it.exclusions,
    saved_at: it.savedAt,
  }));

  const { error } = await sb
    .from("itineraries")
    .upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  console.log(`[seed] ✓ ${rows.length} itinerary templates`);
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  try {
    await seedDestinations();
    await seedItineraries();
    console.log("[seed] Done.");
  } catch (err) {
    console.error("[seed] FAILED:", err);
    process.exit(1);
  }
}

main();
