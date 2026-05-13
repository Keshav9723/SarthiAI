"use client";

// components/my-itineraries/MyItinerariesView.tsx
// Auth-gated grid of saved itineraries with filter tabs and per-card actions.

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";
import {
  MOCK_ITINERARIES,
  formatINR,
  type Itinerary,
} from "@/lib/mockData";
import {
  CompassIcon,
  TrashIcon,
  WalletIcon,
  ArrowRightIcon,
  HeartIcon,
} from "@/components/ui/Icons";

type Filter = "all" | "upcoming" | "past" | "draft";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "draft", label: "Drafts" },
];

export default function MyItinerariesView() {
  const { user, hydrated } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="h-10 w-1/3 bg-gray-100 rounded animate-pulse" />
        <div className="mt-8 grid md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-72 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInPrompt />;
  }

  const items = MOCK_ITINERARIES.filter((it) => !deletedIds.includes(it.id))
    .filter((it) => filter === "all" || it.status === filter);

  function handleDelete(it: Itinerary) {
    setDeletedIds((d) => [...d, it.id]);
    toast.success(`Removed "${it.title}" from your saved trips.`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
          Your Journeys, {user.name || "Traveller"} 🧭
        </h1>
        <p className="mt-2 text-gray-500">
          Every itinerary you&apos;ve saved or AI-generated, in one place.
        </p>
      </header>

      <div
        role="tablist"
        className="mt-6 inline-flex p-1 rounded-full bg-gray-100 border border-gray-100"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              filter === f.id
                ? "bg-white text-green-700 shadow-card"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-7 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <SavedCard
              key={it.id}
              itinerary={it}
              onDelete={() => handleDelete(it)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedCard({
  itinerary,
  onDelete,
}: {
  itinerary: Itinerary;
  onDelete: () => void;
}) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden flex flex-col">
      <Link
        href={`/itinerary/${itinerary.id}`}
        className="relative h-44 w-full block group"
      >
        <Image
          src={itinerary.image}
          alt={itinerary.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/95 text-gray-800">
          {itinerary.groupType} · {itinerary.duration}
        </span>
        <span
          className={`absolute top-3 right-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full ${
            itinerary.status === "upcoming"
              ? "bg-green-600 text-white"
              : itinerary.status === "past"
                ? "bg-gray-700 text-white"
                : "bg-saffron-500 text-white"
          }`}
        >
          {itinerary.status}
        </span>
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-base text-gray-900 line-clamp-1">
          {itinerary.title}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatINR(itinerary.pricePerPerson)} / person ·{" "}
          {itinerary.groupSize} traveller
          {itinerary.groupSize !== 1 ? "s" : ""}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/itinerary/${itinerary.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
          >
            View
            <ArrowRightIcon size={12} />
          </Link>
          <button
            type="button"
            onClick={() =>
              toast.info("Open Ask Sarthi (bottom-right) to edit this trip.")
            }
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-50 text-xs font-semibold"
          >
            <CompassIcon size={12} strokeWidth={2.4} />
            Edit
          </button>
          <Link
            href={`/budget/${itinerary.id}`}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border-2 border-gray-200 text-gray-700 hover:border-gray-300 text-xs font-semibold"
          >
            <WalletIcon size={12} />
            Budget
          </Link>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete itinerary"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border-2 border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold"
          >
            <TrashIcon size={12} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 text-center max-w-md mx-auto">
      <span className="inline-grid place-items-center w-20 h-20 rounded-full bg-green-50 text-green-700">
        <CompassIcon size={40} className="animate-compass-spin" />
      </span>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
        No saved itineraries yet
      </h2>
      <p className="mt-2 text-gray-500">
        Generate one in minutes or let Sarthi surprise you with a destination.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
        >
          Generate
          <ArrowRightIcon size={14} />
        </Link>
        <Link
          href="/surprise"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-saffron-500 text-saffron-600 hover:bg-saffron-500 hover:text-white text-sm font-semibold"
        >
          Surprise Me 🎲
        </Link>
      </div>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="max-w-md mx-auto px-4 md:px-8 py-20 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-rose-50 text-rose-600">
        <HeartIcon size={28} />
      </span>
      <h1 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Sign in to see your itineraries
      </h1>
      <p className="mt-2 text-gray-500">
        We&apos;ll save every trip you generate so you can come back to it
        later.
      </p>
      <Link
        href="/auth"
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
      >
        Sign in / Sign up
        <ArrowRightIcon size={16} />
      </Link>
    </div>
  );
}
