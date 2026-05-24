// scripts/cleanup-bad-templates.ts
// Removes the 9 templates that were carried over from MOCK_ITINERARIES in the
// initial seed run. They have numeric slugs ("1", "2", … "9") and titles
// hand-written before the project had real RAG content. Now superseded by the
// 25 AI-generated templates with semantic slugs (goa-couple-4d, etc.).
//
// Usage:
//   npm run cleanup:bad-templates
//
// Safe to re-run — only deletes is_template=true rows whose slug is a pure
// digit sequence. Doesn't touch user-generated trips.

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

async function main() {
  console.log(`[cleanup-bad-templates] Looking for templates with numeric slugs…`);

  const { data: candidates, error: readErr } = await sb
    .from("itineraries")
    .select("id, slug, title")
    .eq("is_template", true);

  if (readErr) {
    console.error(`DB read failed: ${readErr.message}`);
    process.exit(1);
  }

  // Numeric-only slug = mock-imported (e.g. "1", "2", … "9").
  const targets = (candidates ?? []).filter((r) => /^\d+$/.test(r.slug ?? ""));
  if (targets.length === 0) {
    console.log(`[cleanup-bad-templates] None found. Nothing to do.`);
    return;
  }

  console.log(`[cleanup-bad-templates] Deleting ${targets.length}:`);
  for (const t of targets) console.log(`  · ${t.slug} — ${t.title}`);

  const ids = targets.map((t) => t.id);
  const { error: delErr } = await sb.from("itineraries").delete().in("id", ids);
  if (delErr) {
    console.error(`Delete failed: ${delErr.message}`);
    process.exit(1);
  }

  console.log(`\n[cleanup-bad-templates] ✓ Done. ${targets.length} rows removed.`);
}

main().catch((err) => {
  console.error("[cleanup-bad-templates] FATAL:", err);
  process.exit(1);
});
