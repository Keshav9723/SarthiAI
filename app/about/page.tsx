// app/about/page.tsx — marketing / about page.

import Image from "next/image";
import Link from "next/link";
import {
  CompassIcon,
  SparklesIcon,
  ArrowRightIcon,
  CloudSunIcon,
  WalletIcon,
  StarIcon,
  HeartIcon,
} from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

export const metadata = {
  title: "About Sarthi",
  description:
    "Sarthi is an AI-powered Indian travel planner — built at NorthCap University as a major project. Here's the story behind the compass.",
};

const VALUES = [
  {
    icon: CompassIcon,
    title: "India-first, always",
    description:
      "Most travel planners treat India like a footnote. We start here — every monsoon window, IRCTC quirk, Amadeus sandbox tax, and rupee price is built into the engine.",
  },
  {
    icon: SparklesIcon,
    title: "AI that explains itself",
    description:
      "Sarthi tells you why a destination scored 94% match — weather, budget, vibe, duration. No black-box recommendations.",
  },
  {
    icon: CloudSunIcon,
    title: "Real-time, not stale",
    description:
      "Live weather, live flight prices, live train availability. The plan you see is the plan that's bookable today.",
  },
  {
    icon: WalletIcon,
    title: "Budget honesty",
    description:
      "INR pricing with a 10% buffer baked in. We never quote a number we can't deliver, and we never hide the optional add-ons.",
  },
];

const TEAM = [
  {
    name: "Keshav Tanwar",
    role: "Backend & AI Lead",
    bio: "Final-year B.Tech CSE at NorthCap. Owns Claude integrations, prompt engineering, and every API route. Builds in INR, thinks in ₹.",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
    initial: "K",
  },
  {
    name: "Frontend Team",
    role: "Design & UX",
    bio: "The Next.js + Tailwind shell, the multi-step wizards, the day-grid itinerary view, and the floating chat experience.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    initial: "F",
  },
  {
    name: "Faculty Guide",
    role: "Mentor · NorthCap",
    bio: "Reviews architecture decisions, RAG pipeline design, and ensures the project meets B.Tech major-project requirements.",
    avatar:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop",
    initial: "G",
  },
];

const STACK = [
  { label: "Frontend", value: "Next.js 14 · Tailwind CSS · TypeScript" },
  { label: "AI", value: "Claude Sonnet (planning) · Claude Haiku (intent)" },
  { label: "Search", value: "Supabase pgvector · Ollama embeddings (mxbai-embed-large)" },
  { label: "Travel APIs", value: "Amadeus · OpenWeatherMap · Google Places" },
  { label: "Auth & DB", value: "Supabase Auth · PostgreSQL (RLS)" },
  { label: "Hosting", value: "Vercel · Sentry · GitHub CI/CD" },
];

const STATS = [
  { value: "50+", label: "Indian destinations" },
  { value: "₹1,200", label: "Min/day budget honesty" },
  { value: "6", label: "Chatbot intents" },
  { value: "100%", label: "INR pricing" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-forest-950 text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1561361398-c5b6f3a5e6b3?w=1920"
            alt="Ghats of Varanasi at dawn"
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
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm">
              <CompassIcon size={14} />
              About Sarthi
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Guiding your <span className="text-green-300">Indian journey</span>,
              one prompt at a time.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl">
              Sarthi (सारथी) means &ldquo;guide&rdquo; or &ldquo;charioteer&rdquo;.
              That&apos;s exactly what we built — an AI that knows how India
              actually moves, and stitches together a plan you can book today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
              >
                Try the planner
                <ArrowRightIcon size={16} />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/30 hover:border-white text-white font-semibold transition-colors"
              >
                Browse destinations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold tracking-tight text-green-700">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-700">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          The Story
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
          Planning an Indian trip shouldn&apos;t feel like a research project.
        </h2>
        <div className="mt-6 space-y-4 text-gray-700 text-lg leading-relaxed">
          <p>
            Most travel sites either send you down a generic-template rabbit
            hole or punt you to a human travel agent at 10× the cost. Indian
            travellers — domestic and inbound — kept ending up with itineraries
            that ignored monsoon windows, missed key festivals, and quoted
            international prices for IRCTC tickets.
          </p>
          <p>
            Sarthi started as a B.Tech major project at NorthCap University.
            We had a thesis: pair Claude&apos;s reasoning with real-time
            airline/hotel/weather APIs, ground everything in INR, and ship an
            AI guide that knows the difference between &ldquo;Goa in
            November&rdquo; and &ldquo;Goa in July&rdquo;.
          </p>
          <p>
            What you&apos;re using is the result. Every destination, every day
            plan, every budget line is built around how India actually moves.
            Try it on a real trip you&apos;re planning — that&apos;s how we
            know it&apos;s working.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-cream border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              How we build
            </span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Four non-negotiables
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl bg-white border border-gray-100 p-6 shadow-card"
              >
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-green-50 text-green-700">
                  <v.icon size={22} />
                </span>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
                  {v.title}
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Who built this
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            A small team, big India
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {TEAM.map((person) => (
            <article
              key={person.name}
              className="rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-card"
            >
              <div className="relative inline-block">
                <span className="grid place-items-center w-24 h-24 rounded-full overflow-hidden bg-green-100 text-green-700 text-3xl font-bold">
                  {person.avatar ? (
                    <Image
                      src={person.avatar}
                      alt={person.name}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    person.initial
                  )}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {person.name}
              </h3>
              <p className="text-sm font-semibold tracking-wide text-green-700 uppercase">
                {person.role}
              </p>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {person.bio}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Under the hood
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            The stack
          </h2>
          <ul className="mt-8 divide-y divide-gray-100 border-y border-gray-100">
            {STACK.map((s) => (
              <li
                key={s.label}
                className="py-4 grid grid-cols-3 gap-4 items-baseline"
              >
                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                  {s.label}
                </p>
                <p className="col-span-2 text-gray-800">{s.value}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Project badge */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-50 text-saffron-700 text-xs font-semibold tracking-widest uppercase border border-saffron-100">
          <StarIcon size={12} />
          NorthCap University · Major Project
        </span>
        <h2 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
          Built as a final-year B.Tech project at NorthCap University, Gurugram.
        </h2>
        <p className="mt-3 text-gray-600">
          Roll no. 22CSU338 · Department of Computer Science & Engineering
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16 md:pb-20">
        <div className="rounded-3xl bg-forest-950 text-white p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-white/70">
              <HeartIcon size={14} />
              Made for India
            </p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              Ready to plan your next Indian journey?
            </h2>
            <p className="mt-2 text-white/80">
              Free forever — no credit card, no sign-up needed to start.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/surprise"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white font-semibold whitespace-nowrap"
            >
              Surprise Me 🎲
            </Link>
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold whitespace-nowrap"
            >
              Plan a trip
              <ArrowRightIcon size={16} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
