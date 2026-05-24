// scripts/seed-templates.ts
// Generates ~25 pre-built itinerary templates via local Ollama, grounded in
// RAG chunks + climate data already in Supabase. Each template lands in the
// `itineraries` table as is_template=true so the homepage rails + Packages
// section pull from them automatically.
//
// Recommended setup:
//   OLLAMA_LLM_MODEL=qwen2.5:7b-instruct  (best 8 GB VRAM fit for tool-use/JSON)
//   OLLAMA_BASE_URL=http://localhost:11434
//
// Run:
//   npm run seed:templates
//
// Errors land in scripts/seed-templates-errors.log so you can review what
// failed without scrolling terminal output. The script is RESUMABLE — if a
// slug already exists in the DB, it's skipped. Re-running picks up where you
// left off (delete the row in itineraries if you want to regenerate).

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env + config
// ---------------------------------------------------------------------------

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_LLM_MODEL ?? "qwen2.5:7b-instruct";
const OLLAMA_EMBED = process.env.OLLAMA_EMBED_MODEL ?? "mxbai-embed-large";
const ERROR_LOG = path.join(process.cwd(), "scripts", "seed-templates-errors.log");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

// Service-role client — bypasses RLS so we can insert template rows.
const sb = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// 25 template specs — diverse across destinations / groups / durations
// ---------------------------------------------------------------------------

interface TemplateSpec {
  destinationSlug: string;
  group: "couple" | "family" | "friends" | "solo";
  groupSize: number;
  days: number;
  budgetPerPerson: number;   // INR
  fromCity: string;
  month: number;             // 1-12
  flavor?: string;           // optional twist
}

const TEMPLATES: TemplateSpec[] = [
  // ---------- Short (3-5 days) ----------
  { destinationSlug: "goa",          group: "couple",  groupSize: 2, days: 4, budgetPerPerson: 15000, fromCity: "Mumbai",    month: 11 },
  { destinationSlug: "goa",          group: "friends", groupSize: 4, days: 5, budgetPerPerson: 12000, fromCity: "Delhi",     month: 12, flavor: "nightlife + beach" },
  { destinationSlug: "rishikesh",    group: "friends", groupSize: 4, days: 4, budgetPerPerson: 10000, fromCity: "Delhi",     month: 10, flavor: "rafting adventure" },
  { destinationSlug: "varanasi",     group: "couple",  groupSize: 2, days: 4, budgetPerPerson: 12000, fromCity: "Delhi",     month: 11, flavor: "ghats + spirituality" },
  { destinationSlug: "jaipur",       group: "family",  groupSize: 4, days: 5, budgetPerPerson: 15000, fromCity: "Delhi",     month: 12, flavor: "pink city heritage" },
  { destinationSlug: "darjeeling",   group: "couple",  groupSize: 2, days: 4, budgetPerPerson: 15000, fromCity: "Kolkata",   month: 10, flavor: "tea + mountains" },
  { destinationSlug: "pondicherry",  group: "couple",  groupSize: 2, days: 4, budgetPerPerson: 15000, fromCity: "Chennai",   month: 12, flavor: "french quarter" },
  { destinationSlug: "hampi",        group: "couple",  groupSize: 2, days: 4, budgetPerPerson: 12000, fromCity: "Bangalore", month: 11, flavor: "ruins + boulders" },
  { destinationSlug: "munnar",       group: "couple",  groupSize: 2, days: 5, budgetPerPerson: 18000, fromCity: "Bangalore", month: 3,  flavor: "tea plantations" },

  // ---------- Mid (6-9 days) ----------
  { destinationSlug: "manali",       group: "couple",  groupSize: 2, days: 6, budgetPerPerson: 20000, fromCity: "Delhi",     month: 10, flavor: "snow + romance" },
  { destinationSlug: "manali",       group: "family",  groupSize: 4, days: 7, budgetPerPerson: 15000, fromCity: "Delhi",     month: 5,  flavor: "kids-friendly mountain" },
  { destinationSlug: "udaipur",      group: "couple",  groupSize: 2, days: 6, budgetPerPerson: 22000, fromCity: "Mumbai",    month: 11, flavor: "lake city romance" },
  { destinationSlug: "kerala",       group: "couple",  groupSize: 2, days: 7, budgetPerPerson: 35000, fromCity: "Bangalore", month: 12, flavor: "backwaters + houseboat" },
  { destinationSlug: "kerala",       group: "family",  groupSize: 4, days: 6, budgetPerPerson: 25000, fromCity: "Mumbai",    month: 12, flavor: "family Kerala circuit" },
  { destinationSlug: "andaman-islands", group: "couple", groupSize: 2, days: 7, budgetPerPerson: 45000, fromCity: "Chennai", month: 12, flavor: "honeymoon beach" },
  { destinationSlug: "coorg",        group: "family",  groupSize: 4, days: 6, budgetPerPerson: 20000, fromCity: "Bangalore", month: 10, flavor: "coffee estate stays" },
  { destinationSlug: "jaisalmer",    group: "couple",  groupSize: 2, days: 6, budgetPerPerson: 25000, fromCity: "Mumbai",    month: 11, flavor: "desert camping" },
  { destinationSlug: "rishikesh",    group: "solo",    groupSize: 1, days: 6, budgetPerPerson: 15000, fromCity: "Mumbai",    month: 10, flavor: "yoga retreat" },
  { destinationSlug: "jodhpur",      group: "couple",  groupSize: 2, days: 7, budgetPerPerson: 28000, fromCity: "Mumbai",    month: 11, flavor: "blue city palaces" },

  // ---------- Long (10+ days) ----------
  { destinationSlug: "leh",          group: "friends", groupSize: 4, days: 10, budgetPerPerson: 40000, fromCity: "Delhi",   month: 7,  flavor: "Ladakh circuit" },
  { destinationSlug: "rajasthan",    group: "family",  groupSize: 4, days: 10, budgetPerPerson: 35000, fromCity: "Delhi",   month: 11, flavor: "Golden Triangle++" },
  { destinationSlug: "spiti-valley", group: "friends", groupSize: 4, days: 12, budgetPerPerson: 35000, fromCity: "Delhi",   month: 6,  flavor: "high altitude road trip" },
  { destinationSlug: "kerala",       group: "couple",  groupSize: 2, days: 10, budgetPerPerson: 50000, fromCity: "Mumbai",  month: 12, flavor: "deep Kerala" },
  { destinationSlug: "andaman-islands", group: "couple", groupSize: 2, days: 10, budgetPerPerson: 70000, fromCity: "Chennai", month: 12, flavor: "luxury island hop" },
  { destinationSlug: "udaipur",      group: "couple",  groupSize: 2, days: 10, budgetPerPerson: 45000, fromCity: "Mumbai",  month: 11, flavor: "extended Rajasthan luxe" },
];

// ---------------------------------------------------------------------------
// Itinerary schema (mirrors lib/schemas/itinerary.ts so we don't import Next
// runtime code into a Node script)
// ---------------------------------------------------------------------------

// Permissive schema — anything required is allowed empty + filled in by
// normalize() below. We do strict validation AFTER normalization.
const ItineraryDay = z.object({
  day_number: z.number().int().positive(),
  location: z.string(),
  morning: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  type: z.string().optional(),
});

const Transfer = z.object({
  mode: z.string(),
  label: z.string(),
  duration: z.string(),
});

const RouteStop = z.object({
  city: z.string(),
  nights: z.number().int().nonnegative(),
  transfer_to_next: Transfer.nullable().optional(),
});

const ItinerarySchema = z.object({
  title: z.string(),
  destination: z.string(),
  state: z.string(),
  duration: z.string(),
  nights: z.number().int().nonnegative(),
  total_days: z.number().int().positive(),
  group_type: z.string(),
  group_size: z.number().int().positive(),
  highlights: z.array(z.string()),
  total_budget: z.number().int().nonnegative(),
  price_per_person: z.number().int().nonnegative(),
  days: z.array(ItineraryDay).min(1),
  route: z.array(RouteStop),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
});
type Itinerary = z.infer<typeof ItinerarySchema>;

// ---------------------------------------------------------------------------
// Normalization — fix the most common drift patterns from small LLMs before
// validation runs. Runs on the raw parsed JSON (any), returns a best-effort
// shape that matches ItinerarySchema.
// ---------------------------------------------------------------------------

function stringifyItem(x: unknown): string {
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (x && typeof x === "object") {
    const obj = x as Record<string, unknown>;
    // Common shapes: {label: "..."} or {text: "..."} or {name: "..."} etc.
    for (const key of ["label", "text", "name", "title", "description", "value"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    // Last resort — flatten the object to "key: value, key: value"
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(", ");
  }
  return "";
}

function toStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.map(stringifyItem).filter((s) => s.trim().length > 0);
}

function normalize(raw: unknown, spec: TemplateSpec, dest: DestinationRow): Record<string, unknown> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const totalBudget = spec.budgetPerPerson * spec.groupSize;
  const fallbackTitle = `${spec.days}-day ${dest.name} trip`;

  // Days
  let days: Array<Record<string, unknown>> = Array.isArray(o.days) ? (o.days as Array<Record<string, unknown>>) : [];
  // Trim/extend to exactly spec.days entries
  if (days.length > spec.days) days = days.slice(0, spec.days);
  while (days.length < spec.days) days.push({});
  days = days.map((d, i): Record<string, unknown> => {
    const dn = typeof d.day_number === "number" ? d.day_number : i + 1;
    return {
      day_number: dn,
      location: typeof d.location === "string" && d.location.trim() ? d.location : dest.name,
      morning: typeof d.morning === "string" && d.morning.trim() ? d.morning : "Free morning — explore at your own pace.",
      afternoon: typeof d.afternoon === "string" && d.afternoon.trim() ? d.afternoon : "Relax and enjoy local culture.",
      evening: typeof d.evening === "string" && d.evening.trim() ? d.evening : "Dinner at a local restaurant.",
      type: typeof d.type === "string" ? d.type : (i === 0 ? "arrival" : i === spec.days - 1 ? "departure" : "explore"),
    };
  });

  // Highlights — at least 3
  let highlights = toStringArray(o.highlights);
  if (highlights.length < 3) {
    highlights = [
      ...highlights,
      `Explore ${dest.name}`,
      `Local cuisine of ${dest.state}`,
      `Cultural sites in ${dest.name}`,
    ].slice(0, Math.max(highlights.length, 3));
  }
  highlights = highlights.slice(0, 12);

  // Route — if missing/empty, derive from days
  let route: Array<Record<string, unknown>> = Array.isArray(o.route) ? (o.route as Array<Record<string, unknown>>) : [];
  if (route.length === 0) {
    route = [{ city: dest.name, nights: spec.days - 1, transfer_to_next: null }];
  } else {
    route = route.map((r) => ({
      city: typeof r.city === "string" && r.city.trim() ? r.city : dest.name,
      nights: typeof r.nights === "number" ? Math.max(0, Math.floor(r.nights)) : 0,
      transfer_to_next: r.transfer_to_next && typeof r.transfer_to_next === "object" ? r.transfer_to_next : null,
    }));
  }

  return {
    title: typeof o.title === "string" && o.title.trim() ? o.title.slice(0, 120) : fallbackTitle,
    destination: dest.name,
    state: dest.state,
    duration: typeof o.duration === "string" && o.duration.trim() ? o.duration : `${spec.days - 1} nights / ${spec.days} days`,
    nights: spec.days - 1,
    total_days: spec.days,
    group_type: spec.group,
    group_size: spec.groupSize,
    highlights,
    total_budget: typeof o.total_budget === "number" ? Math.floor(o.total_budget) : totalBudget,
    price_per_person: typeof o.price_per_person === "number" ? Math.floor(o.price_per_person) : spec.budgetPerPerson,
    days,
    route,
    inclusions: toStringArray(o.inclusions).length > 0 ? toStringArray(o.inclusions) : [
      "Accommodation in selected hotel",
      "Daily breakfast",
      "Sightseeing transfers",
      "Local guide fees",
      "Hotel taxes and service charges",
    ],
    exclusions: toStringArray(o.exclusions).length > 0 ? toStringArray(o.exclusions) : [
      "Flights or train tickets unless specified",
      "Lunch and dinner unless specified",
      "Personal expenses and tips",
      "Travel insurance",
    ],
  };
}

// ---------------------------------------------------------------------------
// Tiny Ollama helpers (kept self-contained — no Next-runtime deps)
// ---------------------------------------------------------------------------

async function ollamaEmbed(text: string): Promise<number[]> {
  const safe = text.length > 1880 ? text.slice(0, 1880) : text;
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_EMBED, prompt: safe }),
  });
  if (!res.ok) throw new Error(`Ollama embed HTTP ${res.status}`);
  const json = (await res.json()) as { embedding?: number[] };
  if (!Array.isArray(json.embedding)) throw new Error("Ollama embed: bad shape");
  return json.embedding;
}

async function ollamaGenerateJson(system: string, user: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      system,
      prompt: user,
      format: "json",
      stream: false,
      options: { temperature: 0.4, num_ctx: 8192, num_predict: 4096 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama generate HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { response?: string };
  if (typeof json.response !== "string") throw new Error("Ollama generate: bad shape");
  return json.response;
}

// ---------------------------------------------------------------------------
// Supabase data fetchers
// ---------------------------------------------------------------------------

interface DestinationRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  destination_type: string | null;
  image: string | null;
  gallery: string[] | null;
}

interface SeasonalRow {
  month: number;
  score: number;
  avg_temp_c: number | null;
  rain_mm: number | null;
}

interface ChunkRow {
  content_type: string;
  source_name: string;
  heading: string | null;
  text: string;
  similarity: number;
}

async function fetchDestination(slug: string): Promise<DestinationRow | null> {
  const { data, error } = await sb
    .from("destinations")
    .select("id, slug, name, state, destination_type, image, gallery")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`destinations lookup: ${error.message}`);
  return (data as DestinationRow) ?? null;
}

async function fetchClimate(destinationId: string, month: number): Promise<SeasonalRow | null> {
  const { data, error } = await sb
    .from("seasonal_scores")
    .select("month, score, avg_temp_c, rain_mm")
    .eq("destination_id", destinationId)
    .eq("month", month)
    .maybeSingle();
  if (error) throw new Error(`seasonal_scores: ${error.message}`);
  return (data as SeasonalRow) ?? null;
}

async function fetchRagChunks(destinationId: string, query: string, k = 8): Promise<ChunkRow[]> {
  const embedding = await ollamaEmbed(query);
  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: k,
    filter_destination: destinationId,
    filter_content_types: null,
  });
  if (error) throw new Error(`match_chunks RPC: ${error.message}`);
  return (data ?? []) as ChunkRow[];
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildSystem(): string {
  return `You are Sarthi, an AI travel itinerary planner for India. Generate a detailed, realistic, day-by-day itinerary as a single JSON object. Use ONLY information from the provided context; you may use general knowledge for filler (lunch suggestions, transit modes) but don't invent specific named attractions or restaurants that aren't supported by the context.

Output STRICT JSON — no markdown, no commentary, no \`\`\` blocks. Just the JSON object.`;
}

function buildUserPrompt(opts: {
  spec: TemplateSpec;
  dest: DestinationRow;
  climate: SeasonalRow | null;
  chunks: ChunkRow[];
}): string {
  const { spec, dest, climate, chunks } = opts;
  const monthName = MONTHS[spec.month - 1];
  const totalBudget = spec.budgetPerPerson * spec.groupSize;

  const chunksBlock = chunks.length === 0
    ? "(no scraped facts available — use general knowledge but keep it realistic)"
    : chunks
        .map(
          (c, i) =>
            `[fact ${i + 1} | ${c.content_type} | ${c.source_name}${c.heading ? ` — ${c.heading}` : ""}]\n${c.text}`
        )
        .join("\n\n");

  const climateBlock = climate
    ? `${monthName} averages: ${climate.avg_temp_c?.toFixed(0) ?? "—"}°C, ${climate.rain_mm?.toFixed(0) ?? "—"} mm rain. Comfort score ${climate.score}/100.`
    : `${monthName} — typical Indian weather for this region.`;

  return `Trip:
  Destination: ${dest.name}, ${dest.state}
  Travel month: ${monthName}
  Group: ${spec.groupSize} ${spec.group}
  Days: ${spec.days} (${spec.days - 1} nights)
  Budget per person: ₹${spec.budgetPerPerson.toLocaleString("en-IN")}
  Total budget: ₹${totalBudget.toLocaleString("en-IN")}
  Starting from: ${spec.fromCity}
  ${spec.flavor ? `Flavor: ${spec.flavor}` : ""}

Climate (${monthName}):
  ${climateBlock}

Verified facts from our travel database:

${chunksBlock}

Output JSON matching this schema (every field required unless noted):
{
  "title": "<3-8 word evocative title>",
  "destination": "${dest.name}",
  "state": "${dest.state}",
  "duration": "${spec.days - 1} nights / ${spec.days} days",
  "nights": ${spec.days - 1},
  "total_days": ${spec.days},
  "group_type": "${spec.group}",
  "group_size": ${spec.groupSize},
  "highlights": [4-8 short evocative bullets like "Sunset at Anjuna cliff" — concrete places/activities, NOT generic phrases],
  "total_budget": ${totalBudget},
  "price_per_person": ${spec.budgetPerPerson},
  "days": [
    // EXACTLY ${spec.days} day objects, day_number 1..${spec.days}
    {
      "day_number": 1,
      "location": "${dest.name}",
      "morning":   "<First sentence = short activity title (5-9 words). Then 1-2 more sentences with practical detail: why it's worth doing, what to expect, a small tip, or what to order.>",
      "afternoon": "<Same shape — title sentence first, then 1-2 sentences of context.>",
      "evening":   "<Same shape — title sentence first, then 1-2 sentences of context.>",
      "type": "arrival" | "explore" | "relax" | "adventure" | "cultural" | "food" | "transfer" | "departure"
    }
    // ...continuing through day ${spec.days}
  ],
  "route": [
    // At minimum: arrival city + ${dest.name}, with nights summing to ${spec.days - 1}
    { "city": "${dest.name}", "nights": ${spec.days - 1}, "transfer_to_next": null }
  ],
  "inclusions": [5-8 bullets — flights/train, hotel, transport, meals, activities],
  "exclusions": [3-5 bullets — what's NOT included]
}

Rules:
  - Day 1 MUST start AT ${dest.name} — open with "Arrive in ${dest.name}", check-in, light unwinding. Do NOT include "Depart from ${spec.fromCity}" or origin-city departure logistics; the route timeline already handles that.
  - Last day should be departure-ish — finish with breakfast, hotel checkout, and travel home.
  - Use concrete attraction names from the facts above. Don't invent.
  - Each slot is 2-3 sentences: a short activity title sentence first, then 1-2 sentences of context (why visit, what to expect, what to order, a tip).
  - Highlights are sound-bites for the front-page card — make them irresistible.
  - Prices must be integer rupees. No decimals.

Emit ONLY the JSON object.`;
}

// ---------------------------------------------------------------------------
// Save to DB
// ---------------------------------------------------------------------------

function makeSlug(spec: TemplateSpec): string {
  return `${spec.destinationSlug}-${spec.group}-${spec.days}d`;
}

async function saveTemplate(
  itin: Itinerary,
  spec: TemplateSpec,
  dest: DestinationRow
): Promise<void> {
  const row = {
    user_id: null,
    is_template: true,
    slug: makeSlug(spec),

    title: itin.title,
    destination: itin.destination,
    state: itin.state,
    duration: itin.duration,
    nights: itin.nights,
    total_days: itin.total_days,
    group_type: itin.group_type,
    group_size: itin.group_size,

    image: dest.image,
    gallery: dest.gallery ?? [],

    total_budget: itin.total_budget,
    price_per_person: itin.price_per_person,

    highlights: itin.highlights,
    weather: null,
    weather_icon: null,
    status: "upcoming" as const,

    from_city: spec.fromCity,
    posted_ago: null,

    days: itin.days,
    route: itin.route,
    inclusions: itin.inclusions,
    exclusions: itin.exclusions,
  };

  const { error } = await sb
    .from("itineraries")
    .upsert(row, { onConflict: "slug" });
  if (error) throw new Error(`insert itineraries: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Per-spec runner
// ---------------------------------------------------------------------------

async function generateOne(spec: TemplateSpec): Promise<{ skipped: boolean; ms: number }> {
  const slug = makeSlug(spec);
  const start = Date.now();

  // Skip if already exists
  const { data: existing } = await sb
    .from("itineraries")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return { skipped: true, ms: 0 };

  // 1. Resolve destination
  const dest = await fetchDestination(spec.destinationSlug);
  if (!dest) throw new Error(`destination "${spec.destinationSlug}" not in DB`);

  // 2. Pull climate + RAG context
  const [climate, chunks] = await Promise.all([
    fetchClimate(dest.id, spec.month),
    fetchRagChunks(
      dest.id,
      `${dest.name} ${spec.flavor ?? ""} attractions activities food itinerary`,
      8
    ),
  ]);

  // 3. Build prompts + call LLM
  const raw = await ollamaGenerateJson(
    buildSystem(),
    buildUserPrompt({ spec, dest, climate, chunks })
  );

  // 4. Parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Sometimes the model wraps JSON in prose — try extracting the first {...} block
    const m = raw.match(/\{[\s\S]+\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); }
      catch {
        await saveDebugRaw(slug, raw);
        throw new Error(`unparseable JSON (raw saved to debug dir)`);
      }
    } else {
      await saveDebugRaw(slug, raw);
      throw new Error(`no JSON in response (raw saved to debug dir)`);
    }
  }

  // 5. Normalize — coerces common LLM drift (object-arrays → string-arrays,
  // missing/empty slots → defaults, missing route → derived) so the schema
  // check below almost always passes.
  const normalized = normalize(parsed, spec, dest);

  // 6. Validate
  const validated = ItinerarySchema.safeParse(normalized);
  if (!validated.success) {
    await saveDebugRaw(slug, raw, normalized, validated.error.message);
    throw new Error(`schema fail after normalize: ${validated.error.message.slice(0, 300)}`);
  }

  // 7. Persist
  await saveTemplate(validated.data, spec, dest);

  return { skipped: false, ms: Date.now() - start };
}

async function saveDebugRaw(
  slug: string,
  raw: string,
  normalized?: unknown,
  zodError?: string
) {
  const dir = path.join(process.cwd(), "scripts", "seed-templates-debug");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${slug}.json`);
  const dump = {
    slug,
    timestamp: new Date().toISOString(),
    raw_llm_response: raw,
    normalized: normalized ?? null,
    zod_error: zodError ?? null,
  };
  await fs.writeFile(file, JSON.stringify(dump, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Error log
// ---------------------------------------------------------------------------

async function clearErrorLog() {
  await fs.writeFile(
    ERROR_LOG,
    `# seed-templates run started ${new Date().toISOString()}\n` +
      `# model: ${OLLAMA_MODEL}\n` +
      `# format: ISO timestamp \\t slug \\t error\n\n`,
    "utf8"
  );
}

async function logError(spec: TemplateSpec, err: Error) {
  const line = `${new Date().toISOString()}\t${makeSlug(spec)}\t${err.message.replace(/\n/g, " ")}\n`;
  await fs.appendFile(ERROR_LOG, line, "utf8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n[seed-templates] Starting`);
  console.log(`  Model:       ${OLLAMA_MODEL}`);
  console.log(`  Ollama base: ${OLLAMA_BASE}`);
  console.log(`  Templates:   ${TEMPLATES.length}`);
  console.log(`  Error log:   ${ERROR_LOG}`);

  await clearErrorLog();

  let ok = 0, skipped = 0, failed = 0;
  const failedSlugs: string[] = [];
  const runStart = Date.now();

  for (let i = 0; i < TEMPLATES.length; i++) {
    const spec = TEMPLATES[i];
    const slug = makeSlug(spec);
    process.stdout.write(`\n[${i + 1}/${TEMPLATES.length}] ${slug.padEnd(35)} `);

    try {
      const { skipped: wasSkipped, ms } = await generateOne(spec);
      if (wasSkipped) {
        process.stdout.write(`⊘ exists, skipped`);
        skipped++;
      } else {
        process.stdout.write(`✓ ${Math.round(ms / 1000)}s`);
        ok++;
      }
    } catch (err) {
      const e = err as Error;
      process.stdout.write(`✗ ${e.message.slice(0, 80)}`);
      await logError(spec, e);
      failed++;
      failedSlugs.push(slug);
    }

    // Polite pause so we don't hammer Ollama / Supabase
    await new Promise((r) => setTimeout(r, 1500));
  }

  const totalMin = ((Date.now() - runStart) / 60000).toFixed(1);
  console.log(`\n\n[seed-templates] Done in ${totalMin} min.`);
  console.log(`  ✓ Generated: ${ok}`);
  console.log(`  ⊘ Skipped:   ${skipped} (already in DB)`);
  console.log(`  ✗ Failed:    ${failed}`);
  if (failed > 0) {
    console.log(`\n  Failed slugs:`);
    for (const s of failedSlugs) console.log(`    · ${s}`);
    console.log(`\n  See ${ERROR_LOG} for full error details.`);
    console.log(`  Re-run \`npm run seed:templates\` to retry just the failed ones.`);
  }
}

main().catch((err) => {
  console.error("[seed-templates] FATAL:", err);
  process.exit(1);
});
