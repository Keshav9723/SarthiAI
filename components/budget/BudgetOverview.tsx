"use client";

// components/budget/BudgetOverview.tsx
// Overview page: top stats + list of the user's budgets. When signed in we
// fetch their real budgets from /api/budget; when signed out we fall back to
// MOCK_BUDGETS so the page still demos.

import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MOCK_BUDGETS,
  calcBudgetTotals,
  formatINR,
  type Budget,
} from "@/lib/mockData";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";
import {
  WalletIcon,
  ArrowRightIcon,
  PlusIcon,
} from "@/components/ui/Icons";

export default function BudgetOverview() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>(MOCK_BUDGETS);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // When auth state resolves, fetch the user's real budgets (if signed in).
  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setBudgets(MOCK_BUDGETS);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/budget")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const real: Budget[] = Array.isArray(data?.budgets) ? data.budgets : [];
        // Signed-in users see ONLY their own budgets — if they have none,
        // the list is empty and the empty-state CTA appears. We no longer
        // fall through to MOCK_BUDGETS because that produced ghost entries
        // for itineraries the user had already deleted.
        setBudgets(real);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user, hydrated]);

  const totals = useMemo(() => {
    const planned = budgets.reduce((s, b) => s + b.totalPlanned, 0);
    const spent = budgets.reduce((s, b) => s + b.totalSpent, 0);
    const remaining = planned - spent;
    const percentUsed = planned > 0 ? Math.round((spent / planned) * 100) : 0;
    return { planned, spent, remaining, percentUsed };
  }, [budgets]);

  async function handleCreateBudget() {
    if (!user) {
      toast.error("Sign in to create a budget.");
      router.push("/auth?next=/budget");
      return;
    }
    const name = window.prompt("Name this budget (e.g. 'Goa December trip')");
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Couldn't create budget");
      router.push(`/budget/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setCreating(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Budget Planner 💰
          </h1>
          <p className="mt-2 text-gray-500">
            Track planned vs actual across every itinerary.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateBudget}
          disabled={creating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold transition-colors"
        >
          <PlusIcon size={16} />
          {creating ? "Creating…" : "Create New Budget"}
        </button>
      </header>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Planned" value={formatINR(totals.planned)} />
        <Stat label="Total Spent" value={formatINR(totals.spent)} />
        <Stat
          label="Remaining"
          value={formatINR(totals.remaining)}
          accent={totals.remaining < 0 ? "rose" : "green"}
        />
        <Stat
          label="% Used"
          value={`${totals.percentUsed}%`}
          progress={totals.percentUsed}
        />
      </div>

      {/* List */}
      {loading && (
        <p className="mt-8 text-sm text-gray-500">Loading your budgets…</p>
      )}
      <ul className="mt-8 space-y-3">
        {budgets.map((b) => {
          const t = calcBudgetTotals(b);
          return (
            <li
              key={b.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 md:p-5 grid grid-cols-1 md:grid-cols-[110px_1fr_auto] gap-4 items-center"
            >
              {b.tripImage && (
                <div className="relative h-20 w-full md:w-[110px] rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={b.tripImage}
                    alt={b.name}
                    fill
                    sizes="110px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 line-clamp-1">
                  {b.name}
                </p>
                <p className="text-xs text-gray-500">{b.tripDates}</p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">
                      {formatINR(t.spent)}
                    </span>{" "}
                    <span className="text-gray-500">
                      / {formatINR(t.planned)}
                    </span>
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {t.percentUsed}% used
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      t.percentUsed > 100
                        ? "bg-rose-500"
                        : t.percentUsed > 80
                          ? "bg-saffron-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, t.percentUsed)}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/budget/${b.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-forest-950 hover:bg-forest-900 text-white text-sm font-semibold whitespace-nowrap"
              >
                View Details
                <ArrowRightIcon size={14} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "neutral",
  progress,
}: {
  label: string;
  value: string;
  accent?: "neutral" | "green" | "rose";
  progress?: number;
}) {
  const color =
    accent === "green"
      ? "text-green-700"
      : accent === "rose"
        ? "text-rose-600"
        : "text-gray-900";
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <div className="flex items-center gap-1.5">
        <WalletIcon size={12} className="text-gray-400" />
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-2xl md:text-3xl font-bold tracking-tight ${color}`}>
        {value}
      </p>
      {typeof progress === "number" && (
        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              progress > 100
                ? "bg-rose-500"
                : progress > 80
                  ? "bg-saffron-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
