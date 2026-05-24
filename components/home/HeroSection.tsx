"use client";

// components/home/HeroSection.tsx
// Section 1 of the homepage. Full-bleed forest-green hero with a cinematic
// background image, dual CTA cards, and the group-type selector row.

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CompassIcon,
  DiceIcon,
  StarIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import GroupTypeCard from "@/components/cards/GroupTypeCard";
import { MOCK_GROUP_TYPES, type GroupType } from "@/lib/mockData";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

const STORAGE_KEY = "sarthi_group_type";

export default function HeroSection() {
  const [group, setGroup] = useState<GroupType | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as GroupType | null;
    if (stored) setGroup(stored);
  }, []);

  function handleSelect(id: GroupType) {
    // Tap the already-selected card again to clear the choice. We also wipe
    // the localStorage entry so the next visit / a Generate-wizard mount
    // doesn't silently re-fill the option the user just removed.
    if (group === id) {
      setGroup(null);
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    setGroup(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <section className="relative bg-forest-950 text-white overflow-hidden">
      {/* Cinematic background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1920"
          alt="Aerial view of an Indian palace at sunset"
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/85 via-forest-950/65 to-forest-950/95" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
        {/* Tagline */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold tracking-widest uppercase border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 animate-pulse" />
            Built for India
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Plan Your Perfect
            <br />
            <span className="text-green-300">Indian Journey</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/80 leading-relaxed">
            AI-powered itineraries for every kind of traveller — tuned to
            weather, budgets, and the way India actually moves.
          </p>

          {/* Real, defensible stats — both numbers are verifiable against
              the database (count of destinations rows + knowledge_chunks
              rows after the overnight RAG scrape). */}
          <div className="mt-7 inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
            <span className="flex items-center gap-1.5 text-sm">
              <StarIcon size={16} className="text-saffron-400" />
              <strong className="text-white">300+</strong>
              <span className="text-white/85">destinations</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-sm text-white/85">
              <strong className="text-white">10,000+</strong> verified facts
            </span>
          </div>
        </div>

        {/* CTA cards */}
        <div className="mt-10 md:mt-12 grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Link
            href="/generate"
            className="group relative overflow-hidden rounded-3xl bg-green-600 hover:bg-green-700 p-6 md:p-7 transition-all hover:-translate-y-0.5 focus-ring"
          >
            <div className="flex items-start gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white/15">
                <CompassIcon size={26} strokeWidth={2} />
              </span>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
                  Option 1
                </p>
                <h3 className="mt-1 text-xl md:text-2xl font-bold tracking-tight">
                  Generate My Itinerary
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  I know where I want to go
                </p>
              </div>
              <ArrowRightIcon
                size={22}
                className="mt-2 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>

          <Link
            href="/surprise"
            className="group relative overflow-hidden rounded-3xl bg-saffron-500 hover:bg-saffron-600 p-6 md:p-7 transition-all hover:-translate-y-0.5 focus-ring"
          >
            <div className="flex items-start gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white/15">
                <DiceIcon size={26} strokeWidth={2} />
              </span>
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
                  Option 2
                </p>
                <h3 className="mt-1 text-xl md:text-2xl font-bold tracking-tight">
                  Surprise Me 🎲
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  Help me discover my next trip
                </p>
              </div>
              <ArrowRightIcon
                size={22}
                className="mt-2 group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </div>

        {/* Group-type selector */}
        <div className="mt-12 max-w-6xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-widest text-white/70 uppercase">
            Who&apos;s coming along?
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_GROUP_TYPES.map((g) => (
              <GroupTypeCard
                key={g.id}
                id={g.id}
                emoji={g.emoji}
                label={g.label}
                subtitle={g.subtitle}
                selected={group === g.id}
                onClick={handleSelect}
              />
            ))}
          </div>
          {group && (
            <p className="mt-3 text-center text-sm text-white/80 animate-fade-in">
              Got it — we&apos;ll tailor recommendations for{" "}
              <span className="font-semibold text-white">{group}s</span>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
