// scripts/cleanup-templates.ts
// One-off post-processor for templates already in the itineraries table:
//   1. Replaces any Day 1 morning text that starts with "Depart from..." with
//      "Arrive in {destination}, settle in to your hotel and unwind."
//   2. Optionally enriches every slot with a 1-2 sentence description via
//      Ollama (qwen2.5:7b-instruct), so the day cards show real context
//      instead of just a 4-word title.
//
// Usage:
//   npm run cleanup:templates          # fix Day 1 only (~30s, no LLM calls)
//   npm run cleanup:templates -- --enrich   # also enrich all slots (~25 min)
//
// Resumable — slots already enriched (>= 80 chars) are skipped.

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

const ENRICH = process.argv.includes("--enrich");
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_LLM_MODEL ?? "qwen2.5:7b-instruct";

interface Day {
  day_number: number;
  location: string;
  morning: string;
  afternoon: string;
  evening: string;
  type?: string;
}

interface ItineraryRow {
  id: string;
  slug: string;
  title: string;
  destination: string;
  state: string;
  days: Day[];
}

// Match anything that opens with depart/leave/fly/drive/board the train + place
const DEPART_RX = /^(depart from |leave for |leave from |fly from |fly out of |drive out of |board the train from )/i;

// With --enrich we now reprocess EVERY non-empty slot so the whole DB lands
// on the consistent "Short title. One-sentence description." format the UI
// expects. (Empty slots are still skipped to avoid creating fake content
// where the LLM had nothing to begin with.)
function isShort(s: string): boolean {
  return !s || s.trim().length === 0;
}

async function ollamaEnrich(opts: {
  title: string;
  destination: string;
  state: string;
  slot: "morning" | "afternoon" | "evening";
  dayNumber: number;
  totalDays: number;
}): Promise<string> {
  const slotTime = opts.slot === "morning" ? "9-11 AM"
    : opts.slot === "afternoon" ? "1-4 PM" : "6-9 PM";
  const prompt = `Rewrite this travel activity in the EXACT format below:

<3-6 word title>. <one short sentence of 8-15 words describing what to expect, why it matters, or a small tip>

Examples (study the structure):
"Visit Amber Fort. Built in 1592, plan 2-3 hours for the courtyard walks and elephant ride up."
"Explore local markets. Bapu Bazaar is best for traditional Rajasthani jewellery and block-printed textiles."
"Dinner at Spice Court. Try the laal maas and ker sangri — North Indian thali with live folk music."
"Return to Manali. Bonfire dinner at the resort to close out the trip."

Trip context:
  Destination: ${opts.destination}, ${opts.state}
  Day: ${opts.dayNumber} of ${opts.totalDays}
  Slot: ${opts.slot} (${slotTime})
  Original activity: "${opts.title}"

Output ONLY the rewritten line in the "Title. Description." format. No labels, no markdown, no quotes around the whole thing. The title MUST end with a period so it can be parsed as a separate sentence.`;

  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.55, num_ctx: 4096, num_predict: 100 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const json = (await res.json()) as { response?: string };
  let out = (json.response ?? "").trim();
  // Strip leading/trailing quotes + stray markdown
  out = out.replace(/^["'`*]+|["'`*]+$/g, "").trim();
  // Drop accidental label prefixes like "Activity:" or "Morning:"
  out = out.replace(/^(activity|morning|afternoon|evening|day \d+)\s*[:\-—]\s*/i, "");
  // Cap at ~200 chars so the card stays compact
  if (out.length > 220) out = out.slice(0, 220).replace(/\s+\S*$/, "") + "…";
  return out || opts.title;
}

async function processOne(row: ItineraryRow): Promise<{ changed: boolean; enriched: number }> {
  let changed = false;
  let enriched = 0;
  const updatedDays: Day[] = [];

  for (const d of row.days) {
    const next: Day = { ...d };

    // ---- Fix Day 1 "Depart from..." ----
    if (d.day_number === 1 && d.morning && DEPART_RX.test(d.morning.trim())) {
      next.morning = `Arrive in ${row.destination}. Settle into your hotel, freshen up, and ease into the trip with a short walk nearby.`;
      changed = true;
    }

    // ---- Enrich every non-empty slot ----
    if (ENRICH) {
      const slots: Array<"morning" | "afternoon" | "evening"> = ["morning", "afternoon", "evening"];
      for (const s of slots) {
        const current = next[s];
        if (isShort(current)) continue; // skip truly empty slots — nothing to enrich
        try {
          const fuller = await ollamaEnrich({
            title: current,
            destination: row.destination,
            state: row.state,
            slot: s,
            dayNumber: d.day_number,
            totalDays: row.days.length,
          });
          // Accept the new output as long as it has the expected "Title. Body."
          // shape (sentence + at least 6 chars of description).
          const looksGood = /^.{4,}?[.!?]\s+.{6,}$/s.test(fuller ?? "");
          if (fuller && looksGood && fuller !== current) {
            next[s] = fuller;
            changed = true;
            enriched++;
          }
          await sleep(300);
        } catch (err) {
          console.warn(`    [enrich] ${row.slug} day ${d.day_number} ${s} failed: ${(err as Error).message}`);
        }
      }
    }

    updatedDays.push(next);
  }

  if (changed) {
    const { error } = await sb
      .from("itineraries")
      .update({ days: updatedDays })
      .eq("id", row.id);
    if (error) throw new Error(`update failed: ${error.message}`);
  }

  return { changed, enriched };
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log(`[cleanup-templates] Starting`);
  console.log(`  Mode:    ${ENRICH ? "FIX DAY 1 + ENRICH ALL SLOTS (LLM, slow)" : "FIX DAY 1 ONLY (fast)"}`);
  if (ENRICH) console.log(`  Model:   ${OLLAMA_MODEL}`);

  const { data, error } = await sb
    .from("itineraries")
    .select("id, slug, title, destination, state, days")
    .eq("is_template", true);

  if (error) {
    console.error(`DB read failed: ${error.message}`);
    process.exit(1);
  }
  const rows = (data ?? []) as ItineraryRow[];
  console.log(`  Targets: ${rows.length} templates\n`);

  let processed = 0, changed = 0, totalEnriched = 0;
  for (const row of rows) {
    process.stdout.write(`[${(processed + 1).toString().padStart(2)}/${rows.length}] ${row.slug.padEnd(38)} `);
    try {
      const { changed: did, enriched } = await processOne(row);
      processed++;
      if (did) {
        changed++;
        totalEnriched += enriched;
        process.stdout.write(`✓ ${enriched > 0 ? `${enriched} slot(s) enriched` : "Day 1 fixed"}\n`);
      } else {
        process.stdout.write(`⊘ nothing to do\n`);
      }
    } catch (err) {
      processed++;
      process.stdout.write(`✗ ${(err as Error).message.slice(0, 80)}\n`);
    }
  }

  console.log(`\n[cleanup-templates] Done.`);
  console.log(`  Updated:        ${changed} / ${rows.length}`);
  if (ENRICH) console.log(`  Slots enriched: ${totalEnriched}`);
}

main().catch((err) => {
  console.error("[cleanup-templates] FATAL:", err);
  process.exit(1);
});
