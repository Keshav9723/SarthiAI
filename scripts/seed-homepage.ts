// scripts/seed-homepage.ts
// Marks the top destinations as "trending" + ensures rich content surfaces
// nicely on the homepage. Run after the main seed.ts + scraper.
//
// Usage:
//   npx tsx scripts/seed-homepage.ts

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const sb = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Slugs of the destinations we want to feature on the homepage Trending row.
// Order = display order (lower number = higher on the page).
const TRENDING: { slug: string; rank: number }[] = [
  { slug: "goa",          rank: 1 },
  { slug: "manali",       rank: 2 },
  { slug: "kerala",       rank: 3 },
  { slug: "rajasthan",    rank: 4 },
  { slug: "jaipur",       rank: 5 },
  { slug: "udaipur",      rank: 6 },
  { slug: "leh",          rank: 7 },
  { slug: "darjeeling",   rank: 8 },
  { slug: "rishikesh",    rank: 9 },
  { slug: "andaman-islands", rank: 10 },
  { slug: "varanasi",     rank: 11 },
  { slug: "munnar",       rank: 12 },
];

async function main() {
  console.log(`[seed-homepage] Marking ${TRENDING.length} destinations as trending…`);

  // First, clear any existing trending ranks so re-runs are clean
  const { error: clearErr } = await sb
    .from("destinations")
    .update({ trending_rank: null })
    .not("trending_rank", "is", null);
  if (clearErr) {
    console.warn(`[seed-homepage] couldn't clear existing ranks: ${clearErr.message}`);
  }

  // Apply new ranks
  let applied = 0;
  let missing = 0;
  for (const t of TRENDING) {
    const { data, error } = await sb
      .from("destinations")
      .update({ trending_rank: t.rank })
      .eq("slug", t.slug)
      .select("slug");
    if (error) {
      console.warn(`[seed-homepage] ${t.slug}: ${error.message}`);
      continue;
    }
    if (!data || data.length === 0) {
      console.warn(`[seed-homepage] ${t.slug}: not found in destinations table`);
      missing++;
    } else {
      applied++;
    }
  }

  console.log(`[seed-homepage] ✓ ${applied} marked trending, ${missing} missing`);

  // Sanity check: how many destinations now have tagline + image populated?
  const { count: withTagline } = await sb
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .not("tagline", "is", null);
  const { count: withImage } = await sb
    .from("destinations")
    .select("*", { count: "exact", head: true })
    .not("image", "is", null);
  const { count: total } = await sb
    .from("destinations")
    .select("*", { count: "exact", head: true });

  console.log(`[seed-homepage] DB state:`);
  console.log(`  Total destinations:           ${total ?? "?"}`);
  console.log(`  With tagline (rich content):  ${withTagline ?? "?"}`);
  console.log(`  With image (cached):          ${withImage ?? "?"}`);
  console.log(`[seed-homepage] Done.`);
}

main().catch((err) => {
  console.error("[seed-homepage] FAILED:", err);
  process.exit(1);
});
