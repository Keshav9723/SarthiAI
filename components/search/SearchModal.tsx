"use client";

// components/search/SearchModal.tsx
// Global search — opens via the navbar icon button OR ⌘ K / Ctrl K.
// Indexes destinations, itineraries, packages, and blog posts client-side.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SearchIcon,
  XIcon,
  ArrowRightIcon,
  MapPinIcon,
  CompassIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import {
  MOCK_DESTINATIONS,
  MOCK_ITINERARIES,
  MOCK_PACKAGES,
} from "@/lib/mockData";
import { MOCK_POSTS } from "@/lib/mockBlog";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  key: string;
  href: string;
  title: string;
  subtitle: string;
}

const TRENDING_QUERIES = ["Goa", "Couple", "Snow", "Under 30k", "Kerala"];

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the modal opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Build a flat result list with category headers so arrow keys can navigate.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [] as { label: string; items: SearchResult[] }[];
    }

    const destinations: SearchResult[] = MOCK_DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.tagline.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.some((t) => t.includes(q)) ||
        d.state.toLowerCase().includes(q)
    )
      .slice(0, 5)
      .map((d) => ({
        key: `d-${d.id}`,
        href: `/explore/${encodeURIComponent(d.name)}`,
        title: d.name,
        subtitle: `${d.tagline} · ${d.state}`,
      }));

    const itineraries: SearchResult[] = MOCK_ITINERARIES.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.destination.toLowerCase().includes(q) ||
        it.state.toLowerCase().includes(q) ||
        it.highlights.some((h) => h.toLowerCase().includes(q)) ||
        it.groupType.includes(q)
    )
      .slice(0, 5)
      .map((it) => ({
        key: `it-${it.id}`,
        href: `/itinerary/${it.id}`,
        title: it.title,
        subtitle: `${it.duration} · ${it.groupType} · ${it.state}`,
      }));

    const packages: SearchResult[] = MOCK_PACKAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.destination.toLowerCase().includes(q)
    )
      .slice(0, 4)
      .map((p) => ({
        key: `pkg-${p.id}`,
        href: `/`,
        title: p.title,
        subtitle: `${p.duration} · ${p.destination}`,
      }));

    const posts: SearchResult[] = MOCK_POSTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
    )
      .slice(0, 4)
      .map((p) => ({
        key: `post-${p.slug}`,
        href: `/blog/${p.slug}`,
        title: p.title,
        subtitle: `${p.category} · ${p.readMinutes} min read`,
      }));

    return [
      { label: "Destinations", items: destinations },
      { label: "Itineraries", items: itineraries },
      { label: "Packages", items: packages },
      { label: "Articles", items: posts },
    ].filter((g) => g.items.length > 0);
  }, [query]);

  const flatResults = useMemo(
    () => groups.flatMap((g) => g.items),
    [groups]
  );

  // Reset active row whenever the result list changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [groups.length, flatResults.length]);

  // Keyboard nav inside the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) =>
          flatResults.length === 0 ? 0 : (i + 1) % flatResults.length
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          flatResults.length === 0
            ? 0
            : (i - 1 + flatResults.length) % flatResults.length
        );
      } else if (e.key === "Enter") {
        const target = flatResults[activeIndex];
        if (target) {
          e.preventDefault();
          onClose();
          window.location.href = target.href;
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatResults, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-2xl mx-auto mt-[8vh] mx-4 md:mx-auto bg-white rounded-2xl shadow-card-hover overflow-hidden animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <SearchIcon size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search destinations, trips, articles…"
            aria-label="Search query"
            className="flex-1 text-base md:text-lg outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-forest-800 text-gray-500 dark:text-gray-300"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto thin-scrollbar">
          {!query && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase">
                Try searching for
              </p>
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {TRENDING_QUERIES.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => setQuery(q)}
                      className="px-3 py-1.5 rounded-full bg-cream border border-gray-200 hover:border-green-500 text-sm text-gray-700"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {query && flatResults.length === 0 && (
            <div className="px-5 py-12 text-center">
              <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-cream text-gray-400">
                <SearchIcon size={22} />
              </span>
              <p className="mt-3 text-base font-semibold text-gray-900">
                No matches for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try a different keyword or open Surprise Me.
              </p>
            </div>
          )}

          {groups.map((g) => {
            // Compute the flat-index offset so we can highlight the active row.
            const before = groups
              .slice(0, groups.indexOf(g))
              .reduce((s, x) => s + x.items.length, 0);
            return (
              <section key={g.label} className="py-2">
                <p className="px-5 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                  {g.label}
                </p>
                <ul>
                  {g.items.map((r, j) => {
                    const flatIndex = before + j;
                    const active = flatIndex === activeIndex;
                    return (
                      <li key={r.key}>
                        <Link
                          href={r.href}
                          onClick={onClose}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${
                            active ? "bg-green-50 dark:bg-forest-800" : "hover:bg-gray-50 dark:hover:bg-forest-800"
                          }`}
                        >
                          <ResultIcon group={g.label} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {r.subtitle}
                            </p>
                          </div>
                          <ArrowRightIcon
                            size={14}
                            className={`shrink-0 transition-opacity ${
                              active ? "opacity-100 text-green-700" : "opacity-0"
                            }`}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Footer keyboard hints */}
        <div className="border-t border-gray-100 px-5 py-2.5 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-2">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            to navigate
            <Kbd>Enter</Kbd>
            to open
          </span>
          <span className="flex items-center gap-2">
            <Kbd>Esc</Kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block min-w-[20px] px-1.5 py-0.5 rounded border border-gray-300 bg-cream text-gray-700 font-semibold text-[10px] leading-none align-middle">
      {children}
    </kbd>
  );
}

function ResultIcon({ group }: { group: string }) {
  let Icon = SearchIcon;
  let bg = "bg-gray-100 text-gray-500";
  if (group === "Destinations") {
    Icon = MapPinIcon;
    bg = "bg-saffron-50 text-saffron-600";
  } else if (group === "Itineraries") {
    Icon = CompassIcon;
    bg = "bg-green-50 text-green-700";
  } else if (group === "Articles") {
    Icon = SparklesIcon;
    bg = "bg-violet-50 text-violet-700";
  }
  return (
    <span
      className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${bg}`}
    >
      <Icon size={16} />
    </span>
  );
}
