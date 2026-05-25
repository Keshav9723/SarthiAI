"use client";

// components/itinerary/ActivityInfo.tsx
// Tiny expandable "Learn more" dropdown attached to each activity slot.
// On expand, calls Wikipedia's opensearch + summary REST endpoints to fetch
// a 1-2 sentence blurb about the named place — no backend needed, no API
// key required, CORS-friendly with `origin=*`.

import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Icons";

interface Props {
  /** Activity title — fed straight into Wikipedia search. */
  title: string;
  /** Destination state, used to scope ambiguous matches ("Amber Fort" + "Jaipur"). */
  contextHint?: string;
}

interface InfoResult {
  title: string;
  extract: string;
  url: string;
}

// Module-level cache so the same activity across re-renders only fetches once.
const cache = new Map<string, InfoResult | "notfound">();

export default function ActivityInfo({ title, contextHint }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<InfoResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const cacheKey = `${title}|${contextHint ?? ""}`;

  useEffect(() => {
    if (!open) return;
    const hit = cache.get(cacheKey);
    if (hit === "notfound") {
      setNotFound(true);
      return;
    }
    if (hit) {
      setInfo(hit);
      return;
    }
    setLoading(true);
    fetchActivityInfo(title, contextHint)
      .then((res) => {
        if (res) {
          cache.set(cacheKey, res);
          setInfo(res);
        } else {
          cache.set(cacheKey, "notfound");
          setNotFound(true);
        }
      })
      .catch(() => {
        cache.set(cacheKey, "notfound");
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [open, cacheKey, title, contextHint]);

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:text-green-800 transition-colors"
      >
        {open ? (
          <ChevronDownIcon size={12} />
        ) : (
          <ChevronRightIcon size={12} />
        )}
        {open ? "Hide details" : "Learn more"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-cream border border-gray-100 px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
          {loading && (
            <p className="text-xs text-gray-500 italic">Looking it up…</p>
          )}
          {!loading && info && (
            <>
              <p className="font-semibold text-gray-900 text-[13px] mb-1">
                {info.title}
              </p>
              <p className="text-xs leading-relaxed">{info.extract}</p>
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[11px] font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
              >
                Full article on Wikipedia →
              </a>
            </>
          )}
          {!loading && notFound && (
            <p className="text-xs text-gray-500 italic">
              No Wikipedia entry found for this activity. Try the chatbot for
              context — &quot;tell me about {title}&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wikipedia lookup — opensearch → summary, both CORS-friendly via origin=*
// ---------------------------------------------------------------------------

async function fetchActivityInfo(
  rawTitle: string,
  context?: string
): Promise<InfoResult | null> {
  // Itinerary titles are full sentences ("Visit Hawa Mahal, Johori Bazaar
  // for shopping"). Wikipedia's search doesn't fuzzy-match across that much
  // prose, so we extract the headline noun phrase and try several queries
  // in priority order — most-specific first, falling back to broader ones.
  const candidates = buildQueryCandidates(rawTitle, context);

  for (const query of candidates) {
    const pageTitle = await openSearch(query);
    if (!pageTitle) continue;
    const result = await fetchSummary(pageTitle);
    if (result) return result;
  }
  return null;
}

async function openSearch(query: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?` +
    `action=opensearch&format=json&origin=*&limit=1&search=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as [string, string[], string[], string[]];
    return data?.[1]?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchSummary(pageTitle: string): Promise<InfoResult | null> {
  const url =
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      pageTitle.replace(/\s+/g, "_")
    )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const summary = (await res.json()) as {
      title?: string;
      extract?: string;
      type?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (!summary.extract) return null;
    // Disambiguation pages are usually unhelpful — skip them, the next
    // candidate query might land on a real article.
    if (summary.type === "disambiguation") return null;
    let extract = summary.extract.trim();
    if (extract.length > 320) {
      extract = extract.slice(0, 320).replace(/\s+\S*$/, "") + "…";
    }
    return {
      title: summary.title ?? pageTitle,
      extract,
      url:
        summary.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
    };
  } catch {
    return null;
  }
}

// Produce an ordered list of search queries to try, narrowest-but-most-likely
// first. The big payoff is the SPLIT step that extracts the first proper-noun
// phrase from titles like "Hawa Mahal, Johori Bazaar for shopping" → "Hawa
// Mahal", which actually has a Wikipedia article.
function buildQueryCandidates(rawTitle: string, context?: string): string[] {
  const clean = cleanTitle(rawTitle);
  const cleanContext = cleanLocationHint(context);
  const queries: string[] = [];

  // Split on common conjunctions / separators / transit words to grab the
  // first phrase. Old itineraries emit short transit lines like "Arrive
  // Manali after overnight Volvo from Delhi" — splitting on "after" / "from"
  // recovers "Manali" as the first chunk.
  const splitRx =
    /\s*(?:,|\sand\s|\s&\s|\sor\s|\swith\s|\sfor\s|\sat\s|\sfrom\s|\safter\s|\sbefore\s|\svia\s|\sthen\s|\son\sthe\s|\sby\s)\s*/i;
  const parts = clean.split(splitRx).filter((p) => p.trim().length > 1);
  const first = parts[0]?.trim();

  // Also try the first capitalised proper-noun run from the raw title. For
  // "Arrive Manali after overnight Volvo from Delhi" this grabs "Manali",
  // which the verb/preposition cleaner alone won't recover cleanly.
  const properNoun = firstProperNoun(rawTitle);

  // 1. Proper noun + context     ("Manali Himachal")
  if (properNoun && cleanContext) queries.push(`${properNoun} ${cleanContext}`);
  // 2. Proper noun alone         ("Manali")
  if (properNoun) queries.push(properNoun);
  // 3. First chunk + context     ("Hawa Mahal Jaipur")
  if (first && cleanContext) queries.push(`${first} ${cleanContext}`);
  // 4. First chunk alone         ("Hawa Mahal")
  if (first) queries.push(first);
  // 5. Whole cleaned title + context
  if (cleanContext) queries.push(`${clean} ${cleanContext}`);
  // 6. Whole cleaned title alone
  queries.push(clean);
  // 7. Context alone — last resort so the dropdown shows the destination
  //    article even when the activity itself is unsearchable.
  if (cleanContext) queries.push(cleanContext);

  // Dedupe while preserving order.
  return Array.from(new Set(queries.map((q) => q.trim()))).filter(Boolean);
}

/** Extract the first capitalised proper-noun run from raw text. Skips a
 *  leading verb (which is also capitalised at the start of a sentence) by
 *  ignoring the first word if it matches a common verb. */
function firstProperNoun(s: string): string | null {
  const verbStarters = /^(Arrive|Depart|Visit|Explore|See|Tour|Hike|Walk|Drive|Board|Fly|Return|Head|Leave|Dine|Eat|Enjoy|Relax|Shop|Stroll|Wander|Discover|Catch|Attend|Experience|Check)\b/i;
  const stripped = s.replace(verbStarters, "").trim();
  const m = stripped.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}/);
  return m ? m[0] : null;
}

/** Itinerary day.location is often a transit string like "Delhi to Goa" or
 *  "Delhi → Manali". For Wikipedia disambiguation we want the destination
 *  side of that arrow. Also strips area suffixes like "Goa - Baga &
 *  Calangute" → "Goa". */
function cleanLocationHint(s?: string): string | undefined {
  if (!s) return undefined;
  let t = s.trim();
  // "Delhi to Goa" / "Delhi → Goa" / "Delhi - Goa" → take the right side.
  const arrowRx = /\s+(?:to|→|->|–|-)\s+/i;
  if (arrowRx.test(t)) t = t.split(arrowRx).pop()!.trim();
  // "Goa - Baga & Calangute" / "Goa: Baga" → keep the first segment.
  t = t.split(/\s*[-:]\s*/)[0].trim();
  return t || undefined;
}

function cleanTitle(s: string): string {
  // Multi-pass cleanup to strip the prose around the proper-noun place name.
  // Each pass handles one layer; some titles need all of them.
  return s
    .trim()
    // 1. Time-of-day prefix ("Evening walk in ..." → "walk in ...")
    .replace(/^(morning|afternoon|evening|early|late|optional|short)\s+/i, "")
    // 2. Verb prefix ("walk in the Old City" → "in the Old City")
    .replace(
      /^(visit|explore|see|tour|hike|walk|drive|board|fly|return|head|leave|dine|eat|enjoy|relax|shop|stroll|wander|discover|catch|attend|experience|check[\s-]?in|check[\s-]?out|arrive|depart|day trip(?:\sto)?|spend the (morning|afternoon|evening)( at)?)\s+/i,
      ""
    )
    // 3. Leading preposition ("in the Old City" → "the Old City")
    .replace(/^(in|at|on|from|to|around|near|by|across|along|inside|through|via)\s+/i, "")
    // 4. Leading "the " ("the Old City" → "Old City")
    .replace(/^the\s+/i, "")
    // 5. Trailing parenthetical like "(Chandpole area)" or "(evening)"
    .replace(/\s*\([^)]*\)\s*$/g, "")
    // 6. Trailing transit / timing tail — "Manali after overnight Volvo
    //    from Delhi" → "Manali". Cuts at the first transit connector.
    .replace(/\s+(after|before|via|from|by|then|on the)\s+.+$/i, "")
    // 7. Trailing punctuation
    .replace(/[.!?,]+$/, "")
    .trim();
}
