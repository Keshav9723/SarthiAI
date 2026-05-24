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
  const queries: string[] = [];

  // Split on common conjunctions / separators to grab the first phrase.
  // Most travel titles have the headline place name first.
  const splitRx = /\s*(?:,|\sand\s|\s&\s|\sor\s|\swith\s|\sfor\s|\sat\s)\s*/i;
  const parts = clean.split(splitRx).filter((p) => p.trim().length > 1);
  const first = parts[0]?.trim();

  // 1. First chunk + context  ("Hawa Mahal Jaipur")
  if (first && context) queries.push(`${first} ${context}`);
  // 2. First chunk alone        ("Hawa Mahal")
  if (first) queries.push(first);
  // 3. Whole cleaned title + context  ("Hawa Mahal, Johori Bazaar Jaipur")
  if (context) queries.push(`${clean} ${context}`);
  // 4. Whole cleaned title alone
  queries.push(clean);

  // Dedupe while preserving order.
  return Array.from(new Set(queries.map((q) => q.trim()))).filter(Boolean);
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
    // 5. Trailing parenthetical like "(Chandpole area)"
    .replace(/\s*\([^)]*\)\s*$/g, "")
    // 6. Trailing punctuation
    .replace(/[.!?,]+$/, "")
    .trim();
}
