// components/legal/LegalDoc.tsx
// Shared shell for /privacy, /terms, /cookies. Renders a hero header + a
// scrollable table-of-contents sidebar + the document body with anchor links.

import Link from "next/link";
import { CompassIcon } from "@/components/ui/Icons";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface Props {
  title: string;
  eyebrow: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

export default function LegalDoc({
  title,
  eyebrow,
  lastUpdated,
  intro,
  sections,
}: Props) {
  return (
    <div>
      <section className="bg-forest-950 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/70 hover:text-white"
          >
            <CompassIcon size={14} />
            {eyebrow}
          </Link>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-white/70 text-sm">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        {/* TOC */}
        <aside className="lg:sticky lg:top-20 self-start">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Contents
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-green-700 transition-colors"
                >
                  <span className="font-semibold text-gray-400 mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Body */}
        <article className="prose-doc">
          <div className="text-gray-700 leading-relaxed text-[15px]">
            {intro}
          </div>
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="mt-10 scroll-mt-20"
            >
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {s.title}
              </h2>
              <div className="mt-3 text-gray-700 leading-relaxed text-[15px] space-y-3">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </section>
    </div>
  );
}
