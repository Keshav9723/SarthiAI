// scripts/scrape/classify.ts
// 3-tier content_type classifier.
//
//   Tier 1 — deterministic heading rules. Catches Wikivoyage's canonical
//            ==See==, ==Do==, ==Eat== etc. and Wikipedia's "History",
//            "Climate" etc. ~60% of chunks land here. Free, instant.
//
//   Tier 2 — zero-shot embedding similarity. Each of the 14 categories has
//            a one-line description. We embed those once at startup, then
//            cosine-compare the chunk's embedding to all 14 and pick the
//            highest scorer if it clears CLASSIFY_T2_MIN_SCORE and beats #2
//            by CLASSIFY_T2_MIN_MARGIN. ~30% land here. Free, ~30ms/chunk.
//
//   Tier 3 — LLM fallback (qwen2.5:1.5b in JSON mode). Used when Tier 1+2
//            both abstain. ~10% of chunks. ~500ms/chunk on the laptop GPU.

import {
  CLASSIFIER_MODEL,
  CLASSIFY_T2_MIN_MARGIN,
  CLASSIFY_T2_MIN_SCORE,
  OLLAMA_BASE_URL,
} from "./config";
import { cosine, embed } from "./embed";
import { ALL_CONTENT_TYPES, type ContentType } from "./types";

// ---------------------------------------------------------------------------
// Tier 1 — heading rules
// ---------------------------------------------------------------------------

// Canonical mapping of heading text → content_type. Lookups normalise to
// lowercase + strip punctuation. Keep entries focused on travel-specific
// vocabulary; for generic words (e.g. "Geography") fall through to Tier 2.
const HEADING_MAP: Record<string, ContentType> = {
  // Wikivoyage canonical headings
  "see": "attractions",
  "sights": "attractions",
  "do": "activities",
  "activities": "activities",
  "eat": "food",
  "cuisine": "food",
  "food": "food",
  "drink": "nightlife",
  "nightlife": "nightlife",
  "buy": "shopping",
  "shopping": "shopping",
  "sleep": "accommodation",
  "accommodation": "accommodation",
  "hotels": "accommodation",
  "stay safe": "safety",
  "stay healthy": "safety",
  "health": "safety",
  "get in": "logistics",
  "get around": "logistics",
  "go next": "logistics",
  "transport": "logistics",
  "transportation": "logistics",
  "by car": "logistics",
  "by train": "logistics",
  "by plane": "logistics",
  "by bus": "logistics",
  "talk": "culture",
  "language": "culture",
  "respect": "culture",
  "understand": "overview",
  // Wikipedia common headings
  "history": "culture",
  "etymology": "culture",
  "climate": "climate",
  "weather": "climate",
  "best time to visit": "climate",
  "demographics": "overview",
  "geography": "nature",
  "flora and fauna": "nature",
  "wildlife": "nature",
  "culture": "culture",
  "festivals": "festivals",
  "fairs and festivals": "festivals",
  "events": "festivals",
  "tourism": "overview",
  "places of interest": "attractions",
  "tourist attractions": "attractions",
  "main sights": "attractions",
  "religion": "culture",
  "architecture": "culture",
  "economy": "overview",
  "education": "overview",
  // Other useful matches
  "cope": "practical",
  "connect": "practical",
  "money": "practical",
};

function normaliseHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function classifyByHeading(heading: string): ContentType | null {
  const key = normaliseHeading(heading);
  if (HEADING_MAP[key]) return HEADING_MAP[key];
  // Allow loose match for compound headings like "See and do" or "Eat & drink".
  for (const [pattern, type] of Object.entries(HEADING_MAP)) {
    if (key === pattern || key.startsWith(pattern + " ") || key.endsWith(" " + pattern)) {
      return type;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tier 2 — zero-shot embedding similarity
// ---------------------------------------------------------------------------

// One-line descriptions per category. The embedder turns each into a 1024-dim
// "anchor" — chunks are then compared to all 14 anchors. Pick the wording
// carefully: the more concrete it is, the better the zero-shot accuracy.
const CATEGORY_DESCRIPTIONS: Record<ContentType, string> = {
  overview:      "General introduction, summary, description, and basic facts about a travel destination.",
  attractions:   "Sights, monuments, landmarks, temples, forts, palaces, museums, and places to see.",
  activities:    "Things to do: trekking, rafting, scuba diving, paragliding, safaris, sports, adventure, and tours.",
  food:          "Local cuisine, signature dishes, restaurants, street food, regional ingredients, and culinary culture.",
  accommodation: "Hotels, hostels, homestays, guesthouses, resorts, and where to stay.",
  logistics:     "Getting there and getting around: airports, railway stations, buses, taxis, distances, and transport options.",
  climate:       "Weather, seasons, temperature, rainfall, humidity, and best time to visit.",
  safety:        "Health, safety, scams, water quality, medical care, vaccines, and travel advisories.",
  shopping:      "Markets, bazaars, handicrafts, souvenirs, and what to buy.",
  culture:       "History, language, religion, customs, etiquette, traditions, and cultural heritage.",
  festivals:     "Festivals, fairs, religious events, cultural celebrations, and annual gatherings.",
  nature:        "National parks, wildlife, mountains, beaches, lakes, forests, rivers, and natural geography.",
  nightlife:     "Bars, pubs, clubs, beach shacks, evening entertainment, and after-dark scene.",
  practical:     "Visas, money, SIM cards, electricity, ATMs, languages, internet, and practical traveler tips.",
};

let categoryEmbeddingsCache: { type: ContentType; vec: number[] }[] | null = null;

async function getCategoryEmbeddings() {
  if (categoryEmbeddingsCache) return categoryEmbeddingsCache;
  const entries: { type: ContentType; vec: number[] }[] = [];
  for (const type of ALL_CONTENT_TYPES) {
    const vec = await embed(CATEGORY_DESCRIPTIONS[type]);
    entries.push({ type, vec });
  }
  categoryEmbeddingsCache = entries;
  return entries;
}

async function classifyByEmbedding(
  chunkEmbedding: number[]
): Promise<{ type: ContentType; confidence: number; margin: number } | null> {
  const anchors = await getCategoryEmbeddings();
  const scored = anchors
    .map(({ type, vec }) => ({ type, score: cosine(chunkEmbedding, vec) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const margin = top.score - scored[1].score;

  if (top.score >= CLASSIFY_T2_MIN_SCORE && margin >= CLASSIFY_T2_MIN_MARGIN) {
    return { type: top.type, confidence: top.score, margin };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tier 3 — LLM fallback
// ---------------------------------------------------------------------------

interface OllamaGenerateResponse {
  response: string;
}

async function classifyByLlm(text: string): Promise<ContentType> {
  const prompt =
    `Classify this short travel text into exactly ONE category from this list:\n` +
    ALL_CONTENT_TYPES.join(", ") +
    `\n\nText: "${text.slice(0, 1200)}"\n\n` +
    `Respond with ONLY a JSON object of the form {"category": "<one of the above>"}. ` +
    `Use exactly one of the listed words, lowercase, no extra text.`;

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLASSIFIER_MODEL,
      prompt,
      format: "json",
      stream: false,
      options: { temperature: 0, num_predict: 32 },
    }),
  });

  if (!res.ok) throw new Error(`Ollama classifier failed: HTTP ${res.status}`);
  const json = (await res.json()) as OllamaGenerateResponse;
  try {
    const parsed = JSON.parse(json.response) as { category?: string };
    const cat = parsed.category?.toLowerCase().trim();
    if (cat && (ALL_CONTENT_TYPES as string[]).includes(cat)) {
      return cat as ContentType;
    }
  } catch {
    // fall through to default
  }
  return "overview"; // last-resort default — RAG will still surface via vector similarity
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export interface ClassifyInput {
  heading: string;
  text: string;
  embedding: number[];
}

export interface ClassifyResult {
  contentType: ContentType;
  tier: 1 | 2 | 3;
}

export async function classify(input: ClassifyInput): Promise<ClassifyResult> {
  const t1 = classifyByHeading(input.heading);
  if (t1) return { contentType: t1, tier: 1 };

  const t2 = await classifyByEmbedding(input.embedding);
  if (t2) return { contentType: t2.type, tier: 2 };

  const t3 = await classifyByLlm(input.text);
  return { contentType: t3, tier: 3 };
}

// Used by index.ts to pre-warm the category embeddings before the main loop.
export async function warmupClassifier(): Promise<void> {
  await getCategoryEmbeddings();
}
