"use client";

// components/wizard/GenerateWizard.tsx
// Multi-step wizard for /generate. Six question steps + a "generating..."
// step that redirects to /itinerary/preview.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import WizardShell from "./WizardShell";
import GeneratingLoader from "./GeneratingLoader";
import GroupTypeCard from "@/components/cards/GroupTypeCard";
import {
  MOCK_DEPARTURE_CITIES,
  MOCK_DESTINATIONS,
  MOCK_GROUP_TYPES,
  MOCK_INTERESTS,
  MOCK_PACES,
  MOCK_HOTEL_TYPES,
  formatINR,
  type GroupType,
} from "@/lib/mockData";
import {
  SearchIcon,
  MapPinIcon,
} from "@/components/ui/Icons";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { useWizardDraft } from "@/lib/useWizardDraft";
import ResumePrompt from "./ResumePrompt";

const TOTAL_STEPS = 6;
const DRAFT_KEY = "sarthi_generate_draft";

interface FormState {
  fromCity: string;
  destinations: string[];
  multiCity: boolean;
  group: GroupType | null;
  groupSize: number;
  budget: number;
  budgetTier: "budget" | "mid" | "luxury" | null;
  startDate: string;
  endDate: string;
  skipDates: boolean;
  interests: string[];
  pace: string | null;
  hotelType: string | null;
  notes: string;
}

const INITIAL: FormState = {
  fromCity: "",
  destinations: [],
  multiCity: false,
  group: null,
  groupSize: 2,
  budget: 60000,
  budgetTier: null,
  startDate: "",
  endDate: "",
  skipDates: false,
  interests: [],
  pace: null,
  hotelType: null,
  notes: "",
};

export default function GenerateWizard() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const { draft, save, clear, hydrated } = useWizardDraft<FormState>(DRAFT_KEY);
  const [resumeDismissed, setResumeDismissed] = useState(false);

  // Pre-fill destination if homepage / packages page handed one over.
  useEffect(() => {
    const destination = search.get("destination");
    if (destination) {
      setForm((f) => ({ ...f, destinations: [destination] }));
    }
  }, [search]);

  // Pre-select the homepage group selection if there is one.
  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("sarthi_group_type") as GroupType | null)
        : null;
    if (stored) setForm((f) => ({ ...f, group: stored }));
  }, []);

  // Auto-save the form on every change once we've hydrated. We don't save
  // before hydration finishes, because that would overwrite a real draft
  // with the INITIAL state on first render.
  useEffect(() => {
    if (!hydrated) return;
    save(form, step);
  }, [form, step, hydrated, save]);

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
    hydrated && draft && !resumeDismissed && draft.step > 1;

  const canGoNext = useMemo(() => {
    switch (step) {
      case 1:
        return !!form.fromCity;
      case 2:
        return form.destinations.length > 0;
      case 3:
        return !!form.group && form.groupSize > 0;
      case 4:
        return form.budget >= 5000;
      case 5:
        return true; // dates are optional
      case 6:
        return true; // preferences are optional
      default:
        return true;
    }
  }, [step, form]);

  function next() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    // Successful submit — the trip is about to be "saved" as an itinerary,
    // so the draft is no longer needed.
    clear();
    setSubmitting(true);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  if (submitting) {
    return (
      <GeneratingLoader
        lines={[
          "Finding the best routes…",
          "Checking real-time weather forecasts…",
          "Sourcing flight & hotel prices…",
          "Building your day-by-day plan…",
        ]}
        durationMs={2400}
        onDone={() => router.push("/itinerary/preview")}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      title={titleFor(step)}
      subtitle={subtitleFor(step)}
      canGoNext={canGoNext}
      nextLabel={step === TOTAL_STEPS ? "Generate Itinerary" : "Next"}
      onBack={back}
      onNext={next}
    >
      {showResume && draft && (
        <ResumePrompt
          summary={summarizeDraft(draft.state)}
          step={draft.step}
          totalSteps={TOTAL_STEPS}
          savedAt={draft.savedAt}
          onContinue={handleContinue}
          onDiscard={handleDiscard}
        />
      )}
      {step === 1 && <StepDeparture form={form} setForm={setForm} />}
      {step === 2 && <StepDestinations form={form} setForm={setForm} />}
      {step === 3 && <StepGroup form={form} setForm={setForm} />}
      {step === 4 && <StepBudget form={form} setForm={setForm} />}
      {step === 5 && <StepDates form={form} setForm={setForm} />}
      {step === 6 && <StepPreferences form={form} setForm={setForm} />}
    </WizardShell>
  );
}

// Builds a one-liner like "Couple · Goa · ₹50k" from whatever the user has
// filled in so far. Each field is optional, so we just join the present ones.
function summarizeDraft(state: FormState): string {
  const bits: string[] = [];
  if (state.group) bits.push(capitalize(state.group));
  if (state.destinations.length > 0) bits.push(state.destinations.join(" · "));
  else if (state.fromCity) bits.push(`from ${state.fromCity}`);
  if (state.budget) bits.push(formatINR(state.budget));
  return bits.join(" · ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleFor(step: number) {
  return [
    "Where are you starting from?",
    "Where do you want to go?",
    "Who's coming along?",
    "What's your budget?",
    "When are you travelling?",
    "Any special preferences?",
  ][step - 1];
}

function subtitleFor(step: number) {
  return [
    "We'll use this to find the best flights for you.",
    "Pick one — or toggle multi-city to chain a few.",
    "We'll tune pacing and recommendations to your group.",
    "Per traveller, all-in — flights, hotels, food, activities.",
    "Dates help us check real weather and flight prices — optional but recommended.",
    "Anything that should shape the plan? All optional.",
  ][step - 1];
}

// ---------------------------------------------------------------------------
// Step 1 — Departure
// ---------------------------------------------------------------------------

function StepDeparture({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [query, setQuery] = useState("");
  const filtered = MOCK_DEPARTURE_CITIES.filter((c) =>
    c.city.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div className="relative">
        <SearchIcon
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your city…"
          className="w-full pl-11 pr-4 py-3.5 text-base bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
        />
      </div>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((c) => {
          const selected = form.fromCity === c.city;
          return (
            <button
              key={c.airportCode}
              type="button"
              onClick={() => setForm((f) => ({ ...f, fromCity: c.city }))}
              aria-pressed={selected}
              className={`p-4 rounded-2xl border-2 text-left transition-all focus-ring ${
                selected
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                {c.airportCode}
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {c.city}
              </p>
              <p className="text-xs text-gray-500">{c.state}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Destinations
// ---------------------------------------------------------------------------

function StepDestinations({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [query, setQuery] = useState("");
  const filtered = MOCK_DESTINATIONS.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(name: string) {
    setForm((f) => {
      const exists = f.destinations.includes(name);
      if (exists)
        return { ...f, destinations: f.destinations.filter((d) => d !== name) };
      if (!f.multiCity) return { ...f, destinations: [name] };
      return { ...f, destinations: [...f.destinations, name] };
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a destination…"
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
          <input
            type="checkbox"
            checked={form.multiCity}
            onChange={(e) =>
              setForm((f) => ({ ...f, multiCity: e.target.checked }))
            }
            className="rounded text-green-600 focus:ring-green-500"
          />
          Multi-city
        </label>
      </div>

      {form.destinations.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {form.destinations.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold"
            >
              <MapPinIcon size={14} />
              {d}
              <button
                type="button"
                onClick={() => toggle(d)}
                className="ml-1 text-green-700 hover:text-green-900"
                aria-label={`Remove ${d}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((d) => {
          const selected = form.destinations.includes(d.name);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.name)}
              aria-pressed={selected}
              className={`p-4 rounded-2xl border-2 text-left transition-all focus-ring ${
                selected
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-base font-semibold text-gray-900">{d.name}</p>
              <p className="text-xs text-gray-500">{d.tagline}</p>
              <p className="mt-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                Best · {d.season}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Group
// ---------------------------------------------------------------------------

function StepGroup({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  // Couple and Solo trips have a fixed party size — locking the slider keeps
  // the UI honest and matches how AI prompts should be constrained downstream.
  const isLocked = form.group === "couple" || form.group === "solo";
  const lockedSize = form.group === "couple" ? 2 : 1;

  function setGroupType(id: GroupType) {
    setForm((f) => {
      let groupSize = f.groupSize;
      if (id === "couple") groupSize = 2;
      else if (id === "solo") groupSize = 1;
      else if (f.groupSize < 2) groupSize = 4; // sensible default when leaving locked mode
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
                : "Solo means just you — we'll plan with safety and social options in mind."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Travellers
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
                {form.groupSize}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    groupSize: Math.max(2, f.groupSize - 1),
                  }))
                }
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700"
                aria-label="Decrease travellers"
              >
                –
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    groupSize: Math.min(15, f.groupSize + 1),
                  }))
                }
                className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700"
                aria-label="Increase travellers"
              >
                +
              </button>
            </div>
          </div>
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
            className="mt-5 w-full accent-green-600"
          />
        </div>
      )}

      {form.group && (
        <p className="text-sm text-green-700 animate-fade-in">
          {vibeMessage(form.group)}
        </p>
      )}
    </div>
  );
}

function vibeMessage(g: GroupType) {
  return {
    family:
      "Family trip detected — we'll recommend family-friendly activities and rest days 🏡",
    couple:
      "Couple's getaway — we'll lean into romantic stays and slow mornings 💑",
    friends:
      "Friends trip — we'll prioritise nightlife, group activities and a packed itinerary 🎉",
    solo:
      "Solo journey — we'll add safe, social and reflective experiences 🎒",
  }[g];
}

// ---------------------------------------------------------------------------
// Step 4 — Budget
// ---------------------------------------------------------------------------

function StepBudget({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const tiers: { id: FormState["budgetTier"]; label: string; emoji: string; range: string }[] = [
    { id: "budget", label: "Budget", emoji: "🎒", range: "Under ₹30k" },
    { id: "mid", label: "Mid-range", emoji: "✈️", range: "₹30k – ₹1L" },
    { id: "luxury", label: "Luxury", emoji: "👑", range: "₹1L+" },
  ];

  function pickTier(id: FormState["budgetTier"]) {
    const target =
      id === "budget" ? 25000 : id === "mid" ? 60000 : 150000;
    setForm((f) => ({ ...f, budgetTier: id, budget: target }));
  }

  return (
    <div className="space-y-6">
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
            setForm((f) => ({
              ...f,
              budget: Number(e.target.value),
              budgetTier: tierFor(Number(e.target.value)),
            }))
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tiers.map((t) => {
          const selected = form.budgetTier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTier(t.id)}
              aria-pressed={selected}
              className={`p-5 rounded-2xl border-2 text-left transition-all focus-ring ${
                selected
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="text-3xl">{t.emoji}</span>
              <p className="mt-2 font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500">{t.range}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function tierFor(amount: number): FormState["budgetTier"] {
  if (amount < 30000) return "budget";
  if (amount < 100000) return "mid";
  return "luxury";
}

// ---------------------------------------------------------------------------
// Step 5 — Dates
// ---------------------------------------------------------------------------

function StepDates({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="space-y-5">
      {!form.skipDates && (
        <DateRangePicker
          startDate={form.startDate}
          endDate={form.endDate}
          onChange={(startDate, endDate) =>
            setForm((f) => ({ ...f, startDate, endDate }))
          }
        />
      )}

      <div className="rounded-2xl bg-saffron-50 border border-saffron-100 p-4 flex items-start gap-3">
        <span className="text-xl">📅</span>
        <p className="text-sm text-gray-700">
          Dates help us check real weather forecasts and flight prices.
          Optional but recommended.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={form.skipDates}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              skipDates: e.target.checked,
              startDate: e.target.checked ? "" : f.startDate,
              endDate: e.target.checked ? "" : f.endDate,
            }))
          }
          className="rounded text-green-600 focus:ring-green-500"
        />
        I&apos;ll skip this for now
      </label>

      {form.startDate && form.endDate && form.destinations[0] && (
        <p className="text-sm text-green-700">
          Looks like a great window for {form.destinations[0]} — your dates
          align with the recommended season.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Preferences
// ---------------------------------------------------------------------------

function StepPreferences({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function toggleInterest(id: string) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter((x) => x !== id)
        : [...f.interests, id],
    }));
  }

  return (
    <div className="space-y-7">
      <Group title="Interests">
        <div className="flex flex-wrap gap-2">
          {MOCK_INTERESTS.map((c) => {
            const selected = form.interests.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleInterest(c.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Pace">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MOCK_PACES.map((p) => {
            const selected = form.pace === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, pace: p.id }))}
                className={`px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-1.5">{p.icon}</span>
                {p.label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Hotel type">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MOCK_HOTEL_TYPES.map((h) => {
            const selected = form.hotelType === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, hotelType: h.id }))}
                className={`px-3 py-3 rounded-2xl border-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-1.5">{h.icon}</span>
                {h.label}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Anything else?">
        <textarea
          value={form.notes}
          onChange={(e) =>
            setForm((f) => ({ ...f, notes: e.target.value }))
          }
          rows={3}
          placeholder="e.g. vegetarian only, wheelchair access, honeymoon trip…"
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none"
        />
      </Group>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}
