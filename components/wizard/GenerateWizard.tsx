"use client";

// components/wizard/GenerateWizard.tsx
// Multi-step wizard for /generate. Six question steps + a "generating..."
// step that redirects to /itinerary/preview.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import WizardShell from "./WizardShell";
import GeneratingLoader from "./GeneratingLoader";
import GroupTypeCard from "@/components/cards/GroupTypeCard";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";
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
import { usePreferences } from "@/lib/usePreferences";
import ResumePrompt from "./ResumePrompt";

const TOTAL_STEPS = 5;
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
  const { user, hydrated: authHydrated } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { draft, save, clear, hydrated } = useWizardDraft<FormState>(DRAFT_KEY);
  const { prefs, hydrated: prefsHydrated } = usePreferences();
  const [resumeDismissed, setResumeDismissed] = useState(false);

  // Pre-fill from query params — used both by homepage cards (destination
  // only) and by the Surprise Me result CTAs (everything except fromCity).
  // Also pre-fill fromCity from saved user preferences (home city) so signed-
  // in users don't have to type their origin every time. Query param wins
  // over preference when both are present.
  useEffect(() => {
    const destination = search.get("destination");
    const group = search.get("group") as GroupType | null;
    const groupSize = Number(search.get("groupSize") || 0);
    const fromCityParam = search.get("fromCity") || "";
    const budget = Number(search.get("budget") || 0);
    const budgetTier = search.get("budgetTier") as FormState["budgetTier"];
    const startDate = search.get("startDate") || "";
    const endDate = search.get("endDate") || "";

    setForm((f) => {
      const next: FormState = { ...f };
      if (destination && !next.destinations.includes(destination)) {
        next.destinations = [destination];
      }
      if (group && ["couple", "family", "friends", "solo"].includes(group)) {
        next.group = group;
      }
      if (groupSize > 0) next.groupSize = groupSize;
      if (fromCityParam) next.fromCity = fromCityParam;
      if (budget >= 5000) next.budget = budget;
      if (budgetTier) next.budgetTier = budgetTier;
      if (startDate) next.startDate = startDate;
      if (endDate) next.endDate = endDate;
      return next;
    });
  }, [search]);

  // Pre-fill fromCity from saved home city preference (only if not already
  // set by query params and not already user-entered). The user can still
  // change it on the From step — we just give them a head-start.
  useEffect(() => {
    if (!prefsHydrated) return;
    if (!prefs.fromCity) return;
    setForm((f) => (f.fromCity ? f : { ...f, fromCity: prefs.fromCity ?? "" }));
  }, [prefsHydrated, prefs.fromCity]);

  // Pre-select the homepage group selection if there is one (only when not
  // already provided via search params).
  useEffect(() => {
    if (search.get("group")) return;
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("sarthi_group_type") as GroupType | null)
        : null;
    if (stored) setForm((f) => ({ ...f, group: stored }));
  }, [search]);

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
        return !!form.fromCity && form.destinations.length > 0;
      case 2:
        return !!form.group && form.groupSize > 0;
      case 3:
        return form.budget >= 5000;
      case 4:
        return true; // dates are optional
      case 5:
        return true; // preferences are optional
      default:
        return true;
    }
  }, [step, form]);

  // When the user lands here from Surprise Me (`?from=surprise`), they've
  // already picked everything in that wizard — group, budget, dates,
  // preferences — so we trust those values even when an individual sub-field
  // is empty (e.g. budgetTier might be null but budget is set).
  const fromSurprise = search.get("from") === "surprise";

  // A step is "already filled" when its collected fields are set. Skipped
  // steps disappear from the next() / back() navigation. In surprise-flow
  // mode we relax the checks so user only has to provide the origin city.
  const isStepFilled = useMemo(() => {
    return (s: number): boolean => {
      switch (s) {
        case 1: return !!form.fromCity && form.destinations.length > 0;
        case 2:
          // Group — surprise sets group + groupSize, skip whenever either holds.
          if (fromSurprise && (form.group || form.groupSize > 1)) return true;
          return !!form.group && form.groupSize > 0;
        case 3:
          // Budget — surprise sets budget but not always budgetTier.
          if (fromSurprise && form.budget >= 5000) return true;
          return form.budget >= 5000 && !!form.budgetTier;
        case 4:
          // Dates — surprise users may have submitted without dates; treat
          // missing dates as "skip" too when they came from surprise.
          if (fromSurprise) return true;
          return !!form.startDate && !!form.endDate;
        case 5: return false; // preferences always optional — never auto-skip
        default: return false;
      }
    };
  }, [form, fromSurprise]);

  function findNextStep(from: number): number {
    let s = from + 1;
    while (s < TOTAL_STEPS && isStepFilled(s)) s += 1;
    return Math.min(s, TOTAL_STEPS);
  }

  function findPrevStep(from: number): number {
    let s = from - 1;
    while (s > 1 && isStepFilled(s)) s -= 1;
    return Math.max(s, 1);
  }

  // Compute the "effective" progress bar values — i.e. how many steps the
  // user will actually see (skipped steps don't count). Each non-skipped step
  // gets an ordinal number starting from 1.
  const visibleSteps = useMemo(() => {
    const list: number[] = [];
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      if (s === step || !isStepFilled(s)) list.push(s);
    }
    return list;
  }, [step, isStepFilled]);
  const effectiveStep = Math.max(1, visibleSteps.indexOf(step) + 1);
  const effectiveTotal = visibleSteps.length;

  async function next() {
    if (step < TOTAL_STEPS) {
      setStep(findNextStep(step));
      return;
    }

    // ---- Final step: submit to /api/generate ----
    if (authHydrated && !user) {
      // Not signed in — stash a return URL and bounce to /auth.
      toast.error("Please sign in to generate your itinerary.");
      router.push(`/auth?next=${encodeURIComponent("/generate")}`);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCity: form.fromCity,
          destinations: form.destinations,
          group: form.group,
          groupSize: form.groupSize,
          budget: form.budget,
          startDate: form.skipDates ? undefined : form.startDate || undefined,
          endDate: form.skipDates ? undefined : form.endDate || undefined,
          skipDates: form.skipDates,
          interests: form.interests,
          pace: form.pace,
          hotelType: form.hotelType,
          notes: form.notes,
        }),
      });

      if (res.status === 401) {
        toast.error("Your session expired. Sign in again.");
        router.push(`/auth?next=${encodeURIComponent("/generate")}`);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error ?? "Generation failed. Please try again.");
      }

      // Draft was successful — clear it so a new wizard run starts fresh.
      clear();
      router.push(`/itinerary/${data.id}`);
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setSubmitError(msg);
      toast.error(msg);
    }
  }

  function back() {
    setStep((s) => findPrevStep(s));
  }

  if (submitting) {
    return (
      <GeneratingLoader
        indeterminate
        lines={[
          "Looking up transport options…",
          "Checking hotel prices for your dates…",
          "Reading destination knowledge from our travel database…",
          "Comparing prices to typical seasonal rates…",
          "Drafting your day-by-day plan…",
          "Almost there — finalising the itinerary…",
        ]}
      />
    );
  }

  return (
    <WizardShell
      step={effectiveStep}
      totalSteps={effectiveTotal}
      title={titleForWithContext(step, form)}
      subtitle={subtitleForWithContext(step, form)}
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
      {submitError && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}
      {step === 1 && <StepFromTo form={form} setForm={setForm} />}
      {step === 2 && <StepGroup form={form} setForm={setForm} />}
      {step === 3 && <StepBudget form={form} setForm={setForm} />}
      {step === 4 && <StepDates form={form} setForm={setForm} />}
      {step === 5 && <StepPreferences form={form} setForm={setForm} />}
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
    "Where to and where from?",
    "Who's coming along?",
    "What's your budget?",
    "When are you travelling?",
    "Any special preferences?",
  ][step - 1];
}

function subtitleFor(step: number) {
  return [
    "Your departure city helps us find flights and trains. Pick one destination — or toggle multi-city to chain a few.",
    "We'll tune pacing and recommendations to your group.",
    "Per traveller, all-in — flights, hotels, food, activities.",
    "Dates help us check real weather and flight prices — optional but recommended.",
    "Anything that should shape the plan? All optional.",
  ][step - 1];
}

// When the user lands from Surprise Me with destination already set, soften
// the wording so the only ask is the origin city.
export function titleForWithContext(step: number, form: FormState): string {
  if (step === 1 && form.destinations.length > 0 && !form.fromCity) {
    return `Where are you starting from?`;
  }
  return titleFor(step);
}

export function subtitleForWithContext(step: number, form: FormState): string {
  if (step === 1 && form.destinations.length > 0 && !form.fromCity) {
    return `We've got ${form.destinations[0]} locked in — just need your origin city for flight / train pricing.`;
  }
  return subtitleFor(step);
}

// ---------------------------------------------------------------------------
// Step 1 — From + To (combined on a single page)
// Two collapsible sections — when a value is picked, its panel collapses to a
// summary chip so the other section gets more screen. Both still show together
// when first opened, so the user understands they need to set both.
// ---------------------------------------------------------------------------

interface DestinationSearchResult {
  name: string;
  state: string;
  tagline: string | null;
  season: string | null;
  destination_type: string | null;
}

function StepFromTo({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  // Each panel is collapsed when its value is already set, expanded otherwise.
  // We use a "user toggled it open" flag rather than mirroring form state with
  // useState — otherwise the panel stays open if the form value arrives
  // asynchronously (e.g. after Surprise Me hands off via URL params, which
  // run AFTER this component mounts).
  const [forceFromOpen, setForceFromOpen] = useState(false);
  const [forceToOpen, setForceToOpen] = useState(false);
  const fromOpen = !form.fromCity || forceFromOpen;
  const toOpen = form.destinations.length === 0 || forceToOpen;

  const fromCities = MOCK_DEPARTURE_CITIES.filter((c) =>
    c.city.toLowerCase().includes(fromQuery.toLowerCase())
  );

  // Default tab below the search bar shows just the 6 featured destinations
  // (the curated MOCK_DESTINATIONS set). Once the user types anything, we
  // switch to live Supabase search so the full catalogue becomes reachable.
  const featuredDestinations: DestinationSearchResult[] = MOCK_DESTINATIONS.map(
    (d) => ({
      name: d.name,
      state: d.state,
      tagline: d.tagline,
      season: d.season,
      destination_type: null,
    })
  );
  const [searchResults, setSearchResults] = useState<DestinationSearchResult[]>([]);
  const [toLoading, setToLoading] = useState(false);

  const trimmedQuery = toQuery.trim();
  const isSearching = trimmedQuery.length > 0;
  const toDestinations = isSearching ? searchResults : featuredDestinations;

  useEffect(() => {
    if (!toOpen) return;
    if (!isSearching) {
      // Empty query — show featured only, no network call.
      setSearchResults([]);
      setToLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setToLoading(true);
      try {
        const res = await fetch(
          `/api/destinations/search?q=${encodeURIComponent(trimmedQuery)}&limit=24`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { results?: DestinationSearchResult[] };
        setSearchResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // Fall back to mock filter on network failure so the form is still usable.
        const q = trimmedQuery.toLowerCase();
        setSearchResults(
          MOCK_DESTINATIONS.filter((d) => d.name.toLowerCase().includes(q)).map(
            (d) => ({
              name: d.name,
              state: d.state,
              tagline: d.tagline,
              season: d.season,
              destination_type: null,
            })
          )
        );
      } finally {
        setToLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery, isSearching, toOpen]);

  function pickFrom(city: string) {
    setForm((f) => ({ ...f, fromCity: city }));
    setForceFromOpen(false); // collapse FROM after picking
  }

  function toggleTo(name: string) {
    setForm((f) => {
      const exists = f.destinations.includes(name);
      if (exists)
        return { ...f, destinations: f.destinations.filter((d) => d !== name) };
      if (!f.multiCity) return { ...f, destinations: [name] };
      return { ...f, destinations: [...f.destinations, name] };
    });
  }

  return (
    <div className="space-y-5">
      {/* ---------------- FROM ---------------- */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-saffron-100 text-saffron-700 text-xs font-bold">
              A
            </span>
            <p className="text-xs font-semibold tracking-widest text-gray-600 uppercase">
              From
            </p>
            {form.fromCity && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                <MapPinIcon size={12} />
                {form.fromCity}
              </span>
            )}
          </div>
          {form.fromCity && (
            <button
              type="button"
              onClick={() => setForceFromOpen((s) => !s)}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              {fromOpen ? "Done" : "Change"}
            </button>
          )}
        </header>
        {fromOpen && (
          <div className="p-5">
            <div className="relative">
              <SearchIcon
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
                placeholder="Search your city…"
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {fromCities.slice(0, 12).map((c) => {
                const selected = form.fromCity === c.city;
                return (
                  <button
                    key={c.airportCode}
                    type="button"
                    onClick={() => pickFrom(c.city)}
                    aria-pressed={selected}
                    className={`p-3 rounded-xl border-2 text-left transition-all focus-ring ${
                      selected
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                      {c.airportCode}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">
                      {c.city}
                    </p>
                    <p className="text-[11px] text-gray-500">{c.state}</p>
                  </button>
                );
              })}
            </div>
            {fromCities.length > 12 && (
              <p className="mt-3 text-xs text-gray-500">
                Type to filter — {fromCities.length} cities available.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---------------- TO ---------------- */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="grid place-items-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold">
              B
            </span>
            <p className="text-xs font-semibold tracking-widest text-gray-600 uppercase">
              To
            </p>
            {form.destinations.length === 0 ? null : form.destinations.length === 1 ? (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                <MapPinIcon size={12} />
                {form.destinations[0]}
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                {form.destinations.length} cities
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-700">
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
            {form.destinations.length > 0 && (
              <button
                type="button"
                onClick={() => setForceToOpen((s) => !s)}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                {toOpen ? "Done" : "Change"}
              </button>
            )}
          </div>
        </header>
        {toOpen && (
          <div className="p-5">
            <label className="sm:hidden mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.multiCity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, multiCity: e.target.checked }))
                }
                className="rounded text-green-600 focus:ring-green-500"
              />
              Multi-city trip
            </label>

            {form.destinations.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.destinations.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold"
                  >
                    <MapPinIcon size={12} />
                    {d}
                    <button
                      type="button"
                      onClick={() => toggleTo(d)}
                      className="ml-1 text-green-700 hover:text-green-900"
                      aria-label={`Remove ${d}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <SearchIcon
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
                placeholder="Search a destination…"
                className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {toDestinations.slice(0, 12).map((d) => {
                const selected = form.destinations.includes(d.name);
                return (
                  <button
                    key={`${d.name}-${d.state}`}
                    type="button"
                    onClick={() => toggleTo(d.name)}
                    aria-pressed={selected}
                    className={`p-3 rounded-xl border-2 text-left transition-all focus-ring ${
                      selected
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-1">
                      {d.tagline ?? d.state}
                    </p>
                    {d.season && (
                      <p className="mt-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                        Best · {d.season}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {toLoading && (
              <p className="mt-3 text-xs text-gray-500">Searching…</p>
            )}
            {!toLoading && isSearching && toDestinations.length === 0 && (
              <p className="mt-3 text-xs text-gray-500">
                No destinations match &ldquo;{trimmedQuery}&rdquo;. Try a different name.
              </p>
            )}
            {!toLoading && isSearching && toDestinations.length > 12 && (
              <p className="mt-3 text-xs text-gray-500">
                Showing top 12 of {toDestinations.length} — keep typing to narrow down.
              </p>
            )}
            {!toLoading && !isSearching && (
              <p className="mt-3 text-xs text-gray-500">
                Showing featured destinations. Type to search the full catalogue.
              </p>
            )}
          </div>
        )}
      </section>
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
                className="w-10 h-10 rounded-full border border-gray-200 dark:border-forest-700 hover:bg-gray-50 dark:hover:bg-forest-800 text-gray-700 dark:text-gray-200"
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
                className="w-10 h-10 rounded-full border border-gray-200 dark:border-forest-700 hover:bg-gray-50 dark:hover:bg-forest-800 text-gray-700 dark:text-gray-200"
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

      {form.startDate && form.endDate && form.destinations[0] && (() => {
        const month = new Date(form.startDate).getMonth() + 1;
        const verdict = getSeasonalVerdict(form.destinations[0], month);
        if (verdict.status === "great") {
          return (
            <p className="text-sm text-green-700">
              Looks like a great window for {form.destinations[0]} — your dates
              align with the recommended season.
            </p>
          );
        }
        if (verdict.status === "ok") {
          return (
            <p className="text-sm text-saffron-700">
              {form.destinations[0]} in {monthName(month)} is a shoulder window —
              {" "}doable but not peak conditions ({verdict.reason}).
            </p>
          );
        }
        return (
          <p className="text-sm text-rose-700">
            Heads up — {form.destinations[0]} in {monthName(month)} is typically{" "}
            {verdict.reason}. Consider a different month if your dates are
            flexible.
          </p>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seasonal-comfort heuristic for Indian destinations. Categorises the
// destination by region (hill / desert / coastal / south / northeast /
// island), then maps each month to "great" / "ok" / "tough" with a short
// human-readable reason. Used by the date-picker hint above.
// ---------------------------------------------------------------------------
function getSeasonalVerdict(
  destination: string,
  month: number
): { status: "great" | "ok" | "tough"; reason: string } {
  const d = destination.toLowerCase();

  // Hill stations / Himalayas — cold in winter, monsoon-prone in Jul-Aug.
  if (
    /manali|shimla|kasol|leh|ladakh|kashmir|spiti|gulmarg|sikkim|darjeeling|gangtok|mussoorie|dharamshala|mcleodganj|nainital|auli|kufri|tirthan|lansdowne|yercaud/.test(d)
  ) {
    if ([5, 6, 9, 10].includes(month)) return { status: "great", reason: "pleasant" };
    if ([4, 7, 8, 11].includes(month))
      return { status: "ok", reason: "shoulder season" };
    return { status: "tough", reason: "extreme cold and limited access" };
  }

  // Rajasthan / desert / plains — comfortable Oct–Feb; brutal heat Apr–Jun;
  // monsoon Jul–Sep.
  if (
    /rajasthan|jaipur|jodhpur|udaipur|jaisalmer|pushkar|bikaner|delhi|agra|varanasi|amritsar|gujarat|ahmedabad|kutch|bhopal|gwalior|khajuraho|orchha|madhya pradesh/.test(d)
  ) {
    if ([11, 12, 1, 2].includes(month)) return { status: "great", reason: "cool and dry" };
    if ([3, 10].includes(month)) return { status: "ok", reason: "warming up" };
    if ([4, 5].includes(month))
      return { status: "tough", reason: "extreme heat (40 °C+)" };
    return { status: "tough", reason: "monsoon" };
  }

  // Coastal — Goa, Kerala beaches. Best Nov–Feb; heavy monsoon Jun–Sep.
  if (
    /goa|kerala|kochi|alleppey|munnar|wayanad|varkala|kovalam|gokarna|kanyakumari/.test(d)
  ) {
    if ([11, 12, 1, 2].includes(month)) return { status: "great", reason: "sunny and dry" };
    if ([3, 10].includes(month)) return { status: "ok", reason: "warm but viable" };
    return { status: "tough", reason: "heavy monsoon rain" };
  }

  // South India interior.
  if (
    /bangalore|bengaluru|mysore|coorg|chikmagalur|ooty|chennai|pondicherry|hampi|hyderabad|tamil nadu|karnataka/.test(d)
  ) {
    if ([10, 11, 12, 1, 2].includes(month))
      return { status: "great", reason: "mild and dry" };
    if ([3, 9].includes(month)) return { status: "ok", reason: "shoulder season" };
    return { status: "tough", reason: "hot or wet" };
  }

  // Northeast — Oct-Apr good; monsoon May-Sep is the wettest in the country.
  if (
    /assam|meghalaya|shillong|cherrapunji|arunachal|nagaland|manipur|mizoram|tripura/.test(d)
  ) {
    if ([10, 11, 12, 1, 2, 3, 4].includes(month))
      return { status: "great", reason: "dry and clear" };
    return { status: "tough", reason: "heavy monsoon" };
  }

  // Andaman / island.
  if (/andaman|lakshadweep|port blair|havelock|neil island/.test(d)) {
    if ([11, 12, 1, 2, 3].includes(month))
      return { status: "great", reason: "calm seas, sunny" };
    if ([4, 10].includes(month)) return { status: "ok", reason: "warm but viable" };
    return { status: "tough", reason: "monsoon and cyclone risk" };
  }

  // Generic India fallback.
  if ([11, 12, 1, 2].includes(month))
    return { status: "great", reason: "cool and dry" };
  if ([3, 10].includes(month)) return { status: "ok", reason: "shoulder season" };
  return { status: "tough", reason: "hot or monsoon-affected" };
}

function monthName(m: number): string {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][m - 1] ?? "";
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
