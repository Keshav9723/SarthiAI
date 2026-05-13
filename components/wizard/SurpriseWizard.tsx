"use client";

// components/wizard/SurpriseWizard.tsx
// Multi-step Surprise Me wizard. 5 questions → loading → 5 result cards.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WizardShell from "./WizardShell";
import GeneratingLoader from "./GeneratingLoader";
import GroupTypeCard from "@/components/cards/GroupTypeCard";
import ResumePrompt from "./ResumePrompt";
import { useWizardDraft } from "@/lib/useWizardDraft";
import {
  MOCK_AVOID_OPTIONS,
  MOCK_GROUP_TYPES,
  MOCK_SURPRISE_RESULTS,
  MOCK_VIBES,
  destinationHref,
  findItineraryForDestination,
  formatINR,
  type DestinationMatch,
  type GroupType,
} from "@/lib/mockData";
import {
  ArrowRightIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import DateRangePicker from "@/components/ui/DateRangePicker";

const TOTAL = 5;
const DRAFT_KEY = "sarthi_surprise_draft";

interface FormState {
  group: GroupType | null;
  groupSize: number;
  vibes: string[];
  customVibe: string;
  budget: number;
  budgetTier: "budget" | "mid" | "luxury" | null;
  startDate: string;
  endDate: string;
  duration: "weekend" | "short" | "long" | "extended" | null;
  avoid: string[];
  vegetarian: boolean;
  familySafe: boolean;
  coupleFriendly: boolean;
}

const INITIAL: FormState = {
  group: null,
  groupSize: 2,
  vibes: [],
  customVibe: "",
  budget: 50000,
  budgetTier: null,
  startDate: "",
  endDate: "",
  duration: null,
  avoid: [],
  vegetarian: false,
  familySafe: false,
  coupleFriendly: false,
};

export default function SurpriseWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [phase, setPhase] = useState<"input" | "loading" | "results">("input");

  const { draft, save, clear, hydrated } = useWizardDraft<FormState>(DRAFT_KEY);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  useEffect(() => {
    if (!hydrated || phase !== "input") return;
    save(form, step);
  }, [form, step, hydrated, phase, save]);

  function handleContinue() {
    if (!draft) return;
    setForm(draft.state);
    setStep(draft.step);
    setResumeDismissed(true);
  }

  function handleDiscard() {
    clear();
    setResumeDismissed(true);
  }

  const showResume =
    hydrated && draft && !resumeDismissed && draft.step > 1 && phase === "input";

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return !!form.group;
      case 2:
        // Pre-baked vibe card OR a free-form description both count.
        return form.vibes.length > 0 || form.customVibe.trim().length > 0;
      case 3:
        return form.budget >= 5000;
      case 4:
        return !!form.duration;
      case 5:
        return true;
      default:
        return true;
    }
  }, [step, form]);

  function next() {
    if (step < TOTAL) {
      setStep((s) => s + 1);
    } else {
      // User has submitted — the surprise loader will run next. Clear the
      // draft so refreshing on the results page doesn't re-prompt.
      clear();
      setPhase("loading");
    }
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  if (phase === "loading") {
    return (
      <GeneratingLoader
        lines={[
          "Analysing weather patterns…",
          "Scoring 50 Indian destinations…",
          "Matching to your travel style…",
          "Shortlisting the 5 best matches…",
        ]}
        durationMs={2200}
        onDone={() => setPhase("results")}
      />
    );
  }

  if (phase === "results") {
    return <Results results={MOCK_SURPRISE_RESULTS} />;
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL}
      title={titleFor(step)}
      subtitle={subtitleFor(step)}
      canGoNext={canGoNext}
      nextLabel={step === TOTAL ? "Surprise Me 🎲" : "Next"}
      onBack={back}
      onNext={next}
    >
      {showResume && draft && (
        <ResumePrompt
          summary={summarizeDraft(draft.state)}
          step={draft.step}
          totalSteps={TOTAL}
          savedAt={draft.savedAt}
          onContinue={handleContinue}
          onDiscard={handleDiscard}
        />
      )}
      {step === 1 && <StepGroup form={form} setForm={setForm} />}
      {step === 2 && <StepVibes form={form} setForm={setForm} />}
      {step === 3 && <StepBudget form={form} setForm={setForm} />}
      {step === 4 && <StepDuration form={form} setForm={setForm} />}
      {step === 5 && <StepAvoid form={form} setForm={setForm} />}
    </WizardShell>
  );
}

function summarizeDraft(state: FormState): string {
  const bits: string[] = [];
  if (state.group) bits.push(state.group.charAt(0).toUpperCase() + state.group.slice(1));
  if (state.vibes.length > 0) bits.push(state.vibes.join(" + "));
  else if (state.customVibe) bits.push(`"${state.customVibe.slice(0, 30)}…"`);
  if (state.budget) bits.push(formatINR(state.budget));
  return bits.join(" · ");
}

function titleFor(step: number) {
  return [
    "How many people are travelling?",
    "What's the vibe?",
    "What's your budget?",
    "When can you travel?",
    "Anything off-limits?",
  ][step - 1];
}

function subtitleFor(step: number) {
  return [
    "Tell us who's coming — we'll match the pacing.",
    "Pick the moods you're in. Mix is encouraged — or describe your own.",
    "Per traveller, all-in — flights, hotels, food, activities.",
    "Pick a duration. Exact dates are optional.",
    "Help us avoid anything that would ruin the trip.",
  ][step - 1];
}

// ---------------------------------------------------------------------------
// Step 1 — Group
// ---------------------------------------------------------------------------

function StepGroup({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const isLocked = form.group === "couple" || form.group === "solo";
  const lockedSize = form.group === "couple" ? 2 : 1;

  function setGroupType(id: GroupType) {
    setForm((f) => {
      let groupSize = f.groupSize;
      if (id === "couple") groupSize = 2;
      else if (id === "solo") groupSize = 1;
      else if (f.groupSize < 2) groupSize = 4;
      return { ...f, group: id, groupSize };
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MOCK_GROUP_TYPES.map((g) => (
          <GroupTypeCard
            key={g.id}
            id={g.id}
            emoji={g.emoji}
            label={g.label}
            subtitle={g.subtitle}
            variant="tile"
            selected={form.group === g.id}
            onClick={setGroupType}
          />
        ))}
      </div>

      {isLocked ? (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-5 flex items-center gap-4 animate-fade-in">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-white text-green-700 text-2xl shrink-0">
            🔒
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest text-green-700 uppercase">
              Locked
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
              {lockedSize} traveller{lockedSize !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {form.group === "couple"
                ? "Couple trips are designed for two."
                : "Solo means just you — we'll focus on safe, social, reflective experiences."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Travellers
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-3xl font-bold tracking-tight text-gray-900">
              {form.groupSize}
            </p>
            <input
              type="range"
              min={2}
              max={15}
              value={form.groupSize}
              onChange={(e) =>
                setForm((f) => ({ ...f, groupSize: Number(e.target.value) }))
              }
              aria-label="Number of travellers"
              aria-valuemin={2}
              aria-valuemax={15}
              aria-valuenow={form.groupSize}
              className="flex-1 accent-green-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Vibes
// ---------------------------------------------------------------------------

function StepVibes({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function toggle(id: string) {
    setForm((f) => ({
      ...f,
      vibes: f.vibes.includes(id)
        ? f.vibes.filter((v) => v !== id)
        : [...f.vibes, id],
    }));
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {MOCK_VIBES.map((v) => {
          const selected = form.vibes.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggle(v.id)}
              aria-pressed={selected}
              className={`relative h-40 rounded-3xl overflow-hidden text-left text-white p-5 transition-all focus-ring ${
                selected
                  ? "ring-4 ring-green-500 scale-[1.02]"
                  : "hover:scale-[1.01]"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${v.gradient}`}
              />
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex flex-col h-full">
                <span className="text-4xl">{v.emoji}</span>
                <div className="mt-auto">
                  <p className="font-bold text-lg tracking-tight">{v.label}</p>
                  <p className="text-sm text-white/85">{v.description}</p>
                </div>
              </div>
              {selected && (
                <span className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-full bg-white text-green-600 text-sm font-bold">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      {(form.vibes.length > 0 || form.customVibe.trim().length > 0) && (
        <p className="mt-5 text-sm text-green-700 animate-fade-in">
          <SparklesIcon size={14} className="inline -mt-0.5" /> We&apos;ll find
          places that match your energy.
        </p>
      )}

      {/* Free-form vibe so users can describe a mood we don't have a card for */}
      <div className="mt-7">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Or describe your own vibe
          </p>
          <span className="text-[10px] text-gray-400">Optional</span>
        </div>
        <textarea
          value={form.customVibe}
          onChange={(e) =>
            setForm((f) => ({ ...f, customVibe: e.target.value }))
          }
          placeholder="e.g. quiet hill town with great cafés, slow mornings, and one offbeat experience per day"
          rows={3}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Budget
// ---------------------------------------------------------------------------

function StepBudget({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-forest-950 to-green-700 text-white p-7">
      <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
        Budget per person
      </p>
      <p className="mt-2 text-5xl font-bold tracking-tight">
        {formatINR(form.budget)}
      </p>
      <p className="mt-1 text-white/70 text-sm">
        × {form.groupSize} traveller{form.groupSize !== 1 ? "s" : ""} ={" "}
        <span className="font-semibold text-white">
          {formatINR(form.budget * form.groupSize)}
        </span>{" "}
        total
      </p>
      <input
        type="range"
        min={10000}
        max={500000}
        step={5000}
        value={form.budget}
        onChange={(e) =>
          setForm((f) => ({ ...f, budget: Number(e.target.value) }))
        }
        aria-label="Budget per person in rupees"
        aria-valuemin={10000}
        aria-valuemax={500000}
        aria-valuenow={form.budget}
        className="mt-6 w-full accent-saffron-500"
      />
      <div className="mt-2 flex justify-between text-xs text-white/60">
        <span>{formatINR(10000)}</span>
        <span>{formatINR(500000)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Duration / dates
// ---------------------------------------------------------------------------

function StepDuration({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const options: { id: FormState["duration"]; label: string; sub: string }[] = [
    { id: "weekend", label: "Weekend", sub: "2–3 days" },
    { id: "short", label: "Short trip", sub: "4–6 days" },
    { id: "long", label: "Long trip", sub: "7–10 days" },
    { id: "extended", label: "Extended", sub: "10+ days" },
  ];

  return (
    <div className="space-y-5">
      <DateRangePicker
        startDate={form.startDate}
        endDate={form.endDate}
        onChange={(startDate, endDate) =>
          setForm((f) => ({ ...f, startDate, endDate }))
        }
      />
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
          Duration preference
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {options.map((o) => {
            const selected = form.duration === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, duration: o.id }))
                }
                aria-pressed={selected}
                className={`px-4 py-4 rounded-2xl border-2 text-left transition-colors ${
                  selected
                    ? "border-green-600 bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-gray-900">{o.label}</p>
                <p className="text-xs text-gray-500">{o.sub}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Avoid + extras
// ---------------------------------------------------------------------------

function StepAvoid({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function toggleAvoid(id: string) {
    setForm((f) => ({
      ...f,
      avoid: f.avoid.includes(id)
        ? f.avoid.filter((a) => a !== id)
        : [...f.avoid, id],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
          Avoid these
        </p>
        <div className="flex flex-wrap gap-2">
          {MOCK_AVOID_OPTIONS.map((c) => {
            const selected = form.avoid.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleAvoid(c.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
          Preferences
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: "vegetarian", label: "Vegetarian food available" },
            { id: "familySafe", label: "Family-safe" },
            { id: "coupleFriendly", label: "Couple-friendly" },
          ].map((p) => {
            const k = p.id as "vegetarian" | "familySafe" | "coupleFriendly";
            const selected = form[k];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, [k]: !f[k] }) as FormState)
                }
                className={`px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-colors text-left ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {selected ? "✓ " : ""}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function Results({ results }: { results: DestinationMatch[] }) {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16 animate-slide-up">
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-50 text-saffron-700 text-xs font-semibold tracking-widest uppercase border border-saffron-100">
          <SparklesIcon size={14} />
          Surprise unlocked
        </span>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight text-gray-900">
          We found 5 perfect destinations for you 🎯
        </h1>
        <p className="mt-3 text-gray-500">
          Hand-picked by our scoring engine using your vibes, budget, and dates.
        </p>
      </div>

      <ul className="mt-10 space-y-4">
        {results.map((r) => (
          <ResultCard key={r.id} match={r} />
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ match }: { match: DestinationMatch }) {
  // If we already have a pre-baked itinerary for this destination, skip the
  // wizard and take the user straight to it.
  const existing = findItineraryForDestination(match.name);
  const ctaHref = existing
    ? `/itinerary/${existing.id}`
    : destinationHref(match.name);
  const ctaLabel = existing ? "View Trip" : "Plan This Trip";

  return (
    <li className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0">
      <div className="relative h-56 md:h-full md:min-h-[200px]">
        <Image
          src={match.image}
          alt={match.name}
          fill
          sizes="(max-width: 768px) 100vw, 280px"
          className="object-cover"
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-green-600 text-white text-xs font-bold">
          {match.matchScore}% match
        </span>
        {existing && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-saffron-500 text-white text-[10px] font-bold tracking-widest uppercase">
            Ready-made
          </span>
        )}
      </div>
      <div className="p-5 md:p-6 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            {match.state}
          </p>
          <h3 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">
            {match.name}
          </h3>
          <p className="text-sm text-gray-600">{match.tagline}</p>
        </div>

        <ul className="space-y-1">
          {match.matchReasons.map((r) => (
            <li
              key={r}
              className="text-sm text-gray-700 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {r}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5">
          {match.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Estimated budget</p>
            <p className="text-lg font-bold text-gray-900">
              {formatINR(match.estimatedBudget)}{" "}
              <span className="text-xs text-gray-500 font-medium">
                / person
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Weather · {match.weatherSummary}
            </p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
          >
            {ctaLabel}
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </li>
  );
}
