// scripts/scrape/index.ts
// CLI orchestrator. Runs the full scrape pipeline:
//
//   1. Bulk-fetch Wikidata metadata for all destinations (one SPARQL query)
//   2. Pre-warm the classifier (embed the 14 category anchor strings)
//   3. For each destination:
//        a. getOrCreateDestination(...)  (uses Wikidata metadata)
//        b. Wikivoyage scrape  → chunks
//        c. Wikipedia scrape   → chunks
//        d. Embed each chunk → classify → upsert
//        e. Open-Meteo climate fetch → seasonal_scores + 1 climate chunk
//   4. Print summary
//
// Usage:
//   npx tsx scripts/scrape/index.ts --all                       # everything
//   npx tsx scripts/scrape/index.ts --destination goa           # single dest
//   npx tsx scripts/scrape/index.ts --destination goa --source wikivoyage
//   npx tsx scripts/scrape/index.ts --all --limit 10            # first 10 dests
//   npx tsx scripts/scrape/index.ts --all --dry-run             # no DB writes

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { DESTINATIONS, DESTINATIONS_BY_SLUG } from "./config";
import { embed } from "./embed";
import { estimateTokens } from "./chunk";
import { classify, warmupClassifier } from "./classify";
import {
  getOrCreateDestination,
  upsertChunks,
  upsertSeasonalScores,
} from "./store";
import { fetchWikidataMetadata } from "./sources/wikidata";
import { geocodeWithNominatim } from "./sources/nominatim";
import { scrapeWikivoyage } from "./sources/wikivoyage";
import { scrapeWikipedia } from "./sources/wikipedia";
import { scrapeOpenMeteo } from "./sources/openmeteo";
import type {
  DestinationConfig,
  PreparedChunk,
  RawChunk,
  SourceName,
  WikidataMetadata,
} from "./types";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  all: boolean;
  destinationSlug: string | null;
  sources: Set<SourceName>;
  dryRun: boolean;
  limit: number | null;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const args: Args = {
    all: false,
    destinationSlug: null,
    sources: new Set<SourceName>(["wikidata", "wikivoyage", "wikipedia", "openmeteo"]),
    dryRun: false,
    limit: null,
  };
  for (let i = 0; i < a.length; i++) {
    const flag = a[i];
    if (flag === "--all") args.all = true;
    else if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--destination") args.destinationSlug = a[++i] ?? null;
    else if (flag === "--limit") args.limit = parseInt(a[++i], 10);
    else if (flag === "--source") {
      const sources = (a[++i] ?? "").split(",").map((s) => s.trim()) as SourceName[];
      args.sources = new Set(sources);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Per-destination pipeline
// ---------------------------------------------------------------------------

interface DestStats {
  slug: string;
  wikivoyageChunks: number;
  wikipediaChunks: number;
  climateChunks: number;
  seasonalScores: number;
  tier1: number;
  tier2: number;
  tier3: number;
  errors: string[];
}

async function prepareChunks(raw: RawChunk[]): Promise<{ prepared: PreparedChunk[]; tiers: { t1: number; t2: number; t3: number } }> {
  const prepared: PreparedChunk[] = [];
  const tiers = { t1: 0, t2: 0, t3: 0 };

  for (const r of raw) {
    let embedding: number[];
    try {
      embedding = await embed(r.text);
    } catch (err) {
      console.warn(`  ⚠ embed failed for "${r.heading}": ${(err as Error).message}`);
      continue;
    }
    const cls = await classify({ heading: r.heading, text: r.text, embedding });
    if (cls.tier === 1) tiers.t1++;
    else if (cls.tier === 2) tiers.t2++;
    else tiers.t3++;

    prepared.push({
      ...r,
      contentType: cls.contentType,
      tokenCount: estimateTokens(r.text),
      embedding,
    });
  }

  return { prepared, tiers };
}

async function runDestination(
  dest: DestinationConfig,
  metadata: WikidataMetadata | undefined,
  args: Args
): Promise<DestStats> {
  const stats: DestStats = {
    slug: dest.slug,
    wikivoyageChunks: 0,
    wikipediaChunks: 0,
    climateChunks: 0,
    seasonalScores: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    errors: [],
  };

  console.log(`\n▸ ${dest.name} (${dest.state})`);

  let destinationId: string | null = null;
  if (!args.dryRun) {
    try {
      destinationId = await getOrCreateDestination(dest, metadata);
    } catch (err) {
      stats.errors.push(`destination row: ${(err as Error).message}`);
      return stats;
    }
  }

  // Wikivoyage + Wikipedia in parallel (different domains, no rate-limit conflict).
  const [wv, wp] = await Promise.all([
    args.sources.has("wikivoyage") ? scrapeWikivoyage(dest) : Promise.resolve(null),
    args.sources.has("wikipedia")  ? scrapeWikipedia(dest)  : Promise.resolve(null),
  ]);

  if (wv?.skipped) console.log(`  · wikivoyage skipped: ${wv.skipped}`);
  if (wp?.skipped) console.log(`  · wikipedia skipped: ${wp.skipped}`);

  const allRaw: RawChunk[] = [
    ...(wv?.chunks ?? []),
    ...(wp?.chunks ?? []),
  ];

  if (allRaw.length === 0) {
    console.log(`  · no chunks from text sources`);
  } else {
    console.log(`  · ${allRaw.length} raw chunks (wv=${wv?.chunks.length ?? 0}, wp=${wp?.chunks.length ?? 0}) — embedding + classifying…`);
    const { prepared, tiers } = await prepareChunks(allRaw);
    stats.wikivoyageChunks = wv?.chunks.length ?? 0;
    stats.wikipediaChunks = wp?.chunks.length ?? 0;
    stats.tier1 += tiers.t1; stats.tier2 += tiers.t2; stats.tier3 += tiers.t3;

    if (!args.dryRun && destinationId && prepared.length) {
      try {
        await upsertChunks(destinationId, prepared);
      } catch (err) {
        stats.errors.push(`upsert chunks: ${(err as Error).message}`);
      }
    }
  }

  // Open-Meteo (needs lat/lng — falls back gracefully if Wikidata gave us nothing).
  if (args.sources.has("openmeteo")) {
    const om = await scrapeOpenMeteo(dest, metadata?.latitude, metadata?.longitude);
    if (om.skipped) {
      console.log(`  · openmeteo skipped: ${om.skipped}`);
    } else {
      stats.seasonalScores = om.scores.length;
      stats.climateChunks = om.chunk ? 1 : 0;
      console.log(`  · ${om.scores.length} seasonal scores + ${om.chunk ? 1 : 0} climate chunk`);

      if (!args.dryRun && destinationId) {
        try {
          await upsertSeasonalScores(destinationId, om.scores);
        } catch (err) {
          stats.errors.push(`seasonal_scores: ${(err as Error).message}`);
        }
        if (om.chunk) {
          try {
            await upsertChunks(destinationId, [om.chunk]);
          } catch (err) {
            stats.errors.push(`climate chunk: ${(err as Error).message}`);
          }
        }
      }
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  if (!args.all && !args.destinationSlug) {
    console.error("Usage: tsx scripts/scrape/index.ts --all   or   --destination <slug>");
    process.exit(1);
  }

  let toScrape: DestinationConfig[];
  if (args.destinationSlug) {
    const d = DESTINATIONS_BY_SLUG.get(args.destinationSlug);
    if (!d) {
      console.error(`Unknown destination slug: ${args.destinationSlug}`);
      console.error(`Available slugs (first 20): ${DESTINATIONS.slice(0, 20).map(x => x.slug).join(", ")}…`);
      process.exit(1);
    }
    toScrape = [d];
  } else {
    toScrape = args.limit ? DESTINATIONS.slice(0, args.limit) : DESTINATIONS;
  }

  const startTs = Date.now();
  console.log(`Sarthi scraper — ${toScrape.length} destination${toScrape.length === 1 ? "" : "s"}, sources=[${[...args.sources].join(",")}]${args.dryRun ? " (DRY RUN)" : ""}`);

  // 1. Wikidata bulk metadata fetch
  let wikidataMap = new Map<string, WikidataMetadata>();
  if (args.sources.has("wikidata")) {
    console.log(`\nFetching Wikidata metadata for ${toScrape.length} destinations…`);
    const titles = toScrape.map((d) => d.wikipediaTitle ?? d.name.replace(/ /g, "_"));
    try {
      wikidataMap = await fetchWikidataMetadata(titles);
      console.log(`  ✓ got metadata for ${wikidataMap.size} / ${titles.length}`);
    } catch (err) {
      console.warn(`  ⚠ Wikidata bulk fetch failed: ${(err as Error).message} — continuing without lat/lng (Open-Meteo will be skipped)`);
    }

    // 1b. Nominatim fallback for any destination without lat/lng. We need
    // coordinates so Open-Meteo can run for the climate scores; without
    // them those destinations get text-only data.
    const needsCoords = toScrape.filter((d) => {
      const key = d.wikipediaTitle ?? d.name.replace(/ /g, "_");
      const meta = wikidataMap.get(key);
      return meta?.latitude == null || meta?.longitude == null;
    });

    if (needsCoords.length > 0) {
      console.log(`\nNominatim fallback for ${needsCoords.length} destinations missing coords…`);
      let resolved = 0;
      for (let i = 0; i < needsCoords.length; i++) {
        const d = needsCoords[i];
        const coords = await geocodeWithNominatim(d.name, d.state);
        if (coords) {
          const key = d.wikipediaTitle ?? d.name.replace(/ /g, "_");
          const existing = wikidataMap.get(key) ?? {};
          wikidataMap.set(key, {
            ...existing,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          resolved++;
        }
        // Light progress indicator every 25 lookups
        if ((i + 1) % 25 === 0) {
          process.stdout.write(`  · ${i + 1}/${needsCoords.length} (${resolved} resolved)\n`);
        }
      }
      console.log(`  ✓ Nominatim resolved ${resolved}/${needsCoords.length}`);
    }
  }

  // 2. Pre-warm the classifier (embeds 14 category anchors)
  console.log(`\nWarming up classifier (embedding 14 category anchors)…`);
  await warmupClassifier();
  console.log(`  ✓ ready`);

  // 3. Per-destination pipeline
  const allStats: DestStats[] = [];
  for (let i = 0; i < toScrape.length; i++) {
    const dest = toScrape[i];
    const key = dest.wikipediaTitle ?? dest.name.replace(/ /g, "_");
    const metadata = wikidataMap.get(key);

    process.stdout.write(`\n[${i + 1}/${toScrape.length}]`);
    try {
      const s = await runDestination(dest, metadata, args);
      allStats.push(s);
    } catch (err) {
      console.error(`  ✗ ${dest.slug} fatal: ${(err as Error).message}`);
      allStats.push({
        slug: dest.slug,
        wikivoyageChunks: 0, wikipediaChunks: 0, climateChunks: 0,
        seasonalScores: 0, tier1: 0, tier2: 0, tier3: 0,
        errors: [(err as Error).message],
      });
    }
  }

  // 4. Summary
  const elapsedMin = ((Date.now() - startTs) / 60000).toFixed(1);
  const totals = allStats.reduce(
    (a, s) => ({
      wv: a.wv + s.wikivoyageChunks,
      wp: a.wp + s.wikipediaChunks,
      clim: a.clim + s.climateChunks,
      scores: a.scores + s.seasonalScores,
      t1: a.t1 + s.tier1, t2: a.t2 + s.tier2, t3: a.t3 + s.tier3,
      errors: a.errors + s.errors.length,
    }),
    { wv: 0, wp: 0, clim: 0, scores: 0, t1: 0, t2: 0, t3: 0, errors: 0 }
  );

  console.log(`\n─────────────────────────────────────────────────`);
  console.log(`Done in ${elapsedMin} min.`);
  console.log(`  Destinations processed:  ${allStats.length}`);
  console.log(`  Wikivoyage chunks:       ${totals.wv}`);
  console.log(`  Wikipedia chunks:        ${totals.wp}`);
  console.log(`  Climate chunks:          ${totals.clim}`);
  console.log(`  Seasonal-score rows:     ${totals.scores}`);
  console.log(`  Classifier tier usage:   T1=${totals.t1}  T2=${totals.t2}  T3=${totals.t3}`);
  console.log(`  Destinations w/ errors:  ${allStats.filter(s => s.errors.length).length}`);
  if (totals.errors > 0) {
    console.log(`\nErrors:`);
    for (const s of allStats) {
      for (const e of s.errors) console.log(`  · ${s.slug}: ${e}`);
    }
  }
}

main().catch((err) => {
  console.error("[scrape] FATAL:", err);
  process.exit(1);
});
