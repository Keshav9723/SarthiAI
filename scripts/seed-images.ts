// scripts/seed-images.ts
// Bulk-resolves hero + gallery images for every destination from Wikipedia /
// Wikimedia Commons. These are the same articles we scraped for RAG content,
// so the photos are guaranteed to be of the actual place (no more Japanese
// lanterns showing up for Indian temples).
//
// Each destination gets:
//   • destinations.image    ← hero (first relevant photo from the article)
//   • destinations.gallery  ← up to 5 more photos for the lightbox
//
// Wikimedia asks for polite scraping (≤200 req/s globally). We sleep 800 ms
// between calls — plenty of headroom, and the whole 312-destination batch
// finishes in ~5 minutes instead of the 7 hours Unsplash-polite mode needed.
//
// Usage:
//   npm run seed:images                # Wikipedia for all rows with no image
//   npm run seed:images -- --force     # Re-fetch everyone, overwriting cache
//   npm run seed:images -- --unsplash  # Use the old Unsplash path (legacy)

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchWikipediaImages } from "../lib/api/wikipedia-images";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const sb = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FORCE = process.argv.includes("--force");
const USE_UNSPLASH = process.argv.includes("--unsplash");
const DELAY_MS = USE_UNSPLASH ? 80_000 : 800; // Unsplash legacy = 45/h, Wikipedia ≈ 75/min
const ERROR_LOG = path.join(process.cwd(), "scripts", "seed-images-errors.log");

interface DestRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  destination_type: string | null;
  image: string | null;
  gallery: string[] | null;
}

async function clearErrorLog() {
  await fs.writeFile(
    ERROR_LOG,
    `# seed-images run started ${new Date().toISOString()}\n` +
      `# mode: ${USE_UNSPLASH ? "Unsplash (legacy)" : "Wikipedia/Commons"}\n` +
      `# force: ${FORCE}\n` +
      `# format: ISO timestamp \\t slug \\t reason\n\n`,
    "utf8"
  );
}

async function logError(slug: string, reason: string) {
  const line = `${new Date().toISOString()}\t${slug}\t${reason.replace(/\n/g, " ")}\n`;
  await fs.appendFile(ERROR_LOG, line, "utf8");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processWiki(row: DestRow): Promise<{ ok: boolean; reason?: string; count: number }> {
  const result = await fetchWikipediaImages({
    destinationName: row.name,
    state: row.state,
    slug: row.slug,
    maxImages: 6,
  });

  if (!result.hero || result.gallery.length === 0) {
    return { ok: false, reason: "no Wikipedia images found", count: 0 };
  }

  const { error } = await sb
    .from("destinations")
    .update({ image: result.hero, gallery: result.gallery })
    .eq("id", row.id);

  if (error) return { ok: false, reason: `DB write: ${error.message}`, count: 0 };
  return { ok: true, count: result.gallery.length };
}

async function main() {
  console.log(`[seed-images] Starting`);
  console.log(`  Mode:    ${USE_UNSPLASH ? "Unsplash (legacy)" : "Wikipedia / Wikimedia Commons"}`);
  console.log(`  Force:   ${FORCE ? "yes (overwrite existing)" : "no (skip already-cached)"}`);
  console.log(`  Delay:   ${DELAY_MS}ms between calls`);
  console.log(`  Log:     ${ERROR_LOG}`);

  if (USE_UNSPLASH) {
    console.error("\n[seed-images] --unsplash mode disabled in this build. Re-run without the flag for Wikipedia.");
    process.exit(1);
  }

  await clearErrorLog();

  // Pick the rows to process
  let query = sb
    .from("destinations")
    .select("id, slug, name, state, destination_type, image, gallery")
    .order("trending_rank", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (!FORCE) {
    // Only rows missing an image OR with an empty gallery
    query = query.or("image.is.null,image.eq.,gallery.is.null");
  }

  const { data, error } = await query;
  if (error) {
    console.error(`[seed-images] DB read failed: ${error.message}`);
    process.exit(1);
  }
  const todo = (data as DestRow[]) ?? [];
  if (todo.length === 0) {
    console.log(`[seed-images] Nothing to do — every destination already has hero + gallery.`);
    return;
  }

  console.log(`  Targets: ${todo.length} destinations`);
  const estMin = ((todo.length * DELAY_MS) / 60_000).toFixed(1);
  console.log(`  ETA:     ~${estMin} minutes\n`);

  let ok = 0, skipped = 0, failed = 0;
  let totalImages = 0;
  const start = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const row = todo[i];
    process.stdout.write(`[${(i + 1).toString().padStart(3)}/${todo.length}] ${row.slug.padEnd(36)} `);

    try {
      const result = await processWiki(row);
      if (result.ok) {
        ok++;
        totalImages += result.count;
        process.stdout.write(`✓ ${result.count} photos\n`);
      } else {
        skipped++;
        process.stdout.write(`⊘ ${result.reason}\n`);
        await logError(row.slug, result.reason ?? "no images");
      }
    } catch (err) {
      failed++;
      const e = err as Error;
      process.stdout.write(`✗ ${e.message.slice(0, 60)}\n`);
      await logError(row.slug, e.message);
    }

    if (i < todo.length - 1) await sleep(DELAY_MS);
  }

  const totalMin = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`\n[seed-images] Done in ${totalMin} min.`);
  console.log(`  ✓ Resolved:    ${ok}   (${totalImages} total photos cached)`);
  console.log(`  ⊘ No photos:   ${skipped}`);
  console.log(`  ✗ Failed:      ${failed}`);
  if (failed > 0 || skipped > 0) {
    console.log(`\n  See ${ERROR_LOG} for details.`);
  }
}

main().catch((err) => {
  console.error("[seed-images] FATAL:", err);
  process.exit(1);
});
