"use client";

// components/budget/BudgetDetail.tsx
// Detail view for a single budget. All state lives in React useState — no
// backend persistence — so adding/removing expenses updates totals live.

import Image from "@/components/ui/SafeImage";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  formatINR,
  type Budget,
  type BudgetCategory,
  type BudgetExpense,
} from "@/lib/mockData";
import { toast } from "@/lib/toast";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowRightIcon,
  WalletIcon,
} from "@/components/ui/Icons";

interface Props {
  budget: Budget;
  /** "api" → persist mutations via /api/budget/*. "local" → state-only, for mock budgets. */
  persistMode?: "api" | "local";
}

export default function BudgetDetail({ budget: initial, persistMode = "local" }: Props) {
  const [categories, setCategories] = useState<BudgetCategory[]>(
    initial.categories
  );
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const budgetId = initial.id;
  const isApi = persistMode === "api";

  const totals = useMemo(() => {
    const planned = categories.reduce((s, c) => s + c.planned, 0);
    const spent = categories.reduce((s, c) => s + c.spent, 0);
    const remaining = planned - spent;
    const percentUsed = planned > 0 ? Math.round((spent / planned) * 100) : 0;
    return { planned, spent, remaining, percentUsed };
  }, [categories]);

  // ----- Mutations -----
  // Each one updates local state OPTIMISTICALLY for snappy UI, then fires the
  // API call. On API error we revert the optimistic change and toast the error.

  async function addExpense(catId: string, expense: Omit<BudgetExpense, "id">) {
    // Optimistic: temporary id so the UI renders immediately
    const tempId = `temp-${Date.now()}`;
    setCategories((cs) =>
      cs.map((c) =>
        c.id === catId
          ? {
              ...c,
              spent: c.spent + expense.amount,
              expenses: [...c.expenses, { ...expense, id: tempId }],
            }
          : c
      )
    );

    if (!isApi) {
      toast.success(`Added ${formatINR(expense.amount)} to your budget.`);
      return;
    }

    try {
      const res = await fetch(`/api/budget/${budgetId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: catId,
          label: expense.label,
          amount: expense.amount,
          date: expense.date,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Couldn't save expense");
      // Swap temp id for the real uuid the server assigned
      setCategories((cs) =>
        cs.map((c) =>
          c.id === catId
            ? { ...c, expenses: c.expenses.map((e) => (e.id === tempId ? { ...e, id: data.id } : e)) }
            : c
        )
      );
      toast.success(`Added ${formatINR(expense.amount)} to your budget.`);
    } catch (err) {
      // Revert
      setCategories((cs) =>
        cs.map((c) =>
          c.id === catId
            ? {
                ...c,
                spent: Math.max(0, c.spent - expense.amount),
                expenses: c.expenses.filter((e) => e.id !== tempId),
              }
            : c
        )
      );
      toast.error(err instanceof Error ? err.message : "Couldn't save expense");
    }
  }

  async function removeExpense(catId: string, expId: string) {
    const cat = categories.find((c) => c.id === catId);
    const exp = cat?.expenses.find((e) => e.id === expId);
    if (!exp) return;

    // Optimistic: drop it from state
    setCategories((cs) =>
      cs.map((c) =>
        c.id === catId
          ? {
              ...c,
              spent: Math.max(0, c.spent - exp.amount),
              expenses: c.expenses.filter((e) => e.id !== expId),
            }
          : c
      )
    );

    if (!isApi || expId.startsWith("temp-")) {
      toast.info("Expense removed.");
      return;
    }

    try {
      const res = await fetch(`/api/budget/${budgetId}/expenses/${expId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Couldn't remove expense");
      toast.info("Expense removed.");
    } catch (err) {
      // Revert
      setCategories((cs) =>
        cs.map((c) =>
          c.id === catId
            ? {
                ...c,
                spent: c.spent + exp.amount,
                expenses: [...c.expenses, exp],
              }
            : c
        )
      );
      toast.error(err instanceof Error ? err.message : "Couldn't remove expense");
    }
  }

  // Updating planned amount fires on EVERY keystroke when the user is typing —
  // debounce the API call so we don't spam the server. Local state still
  // updates instantly for snappy UI.
  const plannedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function updatePlanned(catId: string, value: number) {
    const safe = Math.max(0, Math.round(value));
    setCategories((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, planned: safe } : c))
    );
    if (!isApi) return;
    if (plannedTimers.current[catId]) clearTimeout(plannedTimers.current[catId]);
    plannedTimers.current[catId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/budget/${budgetId}/categories/${catId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planned: safe }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "Couldn't update planned amount");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    }, 500);
  }

  async function addCategory(label: string) {
    if (!label.trim()) return;
    const tempId = "temp-" + label.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const optimisticCat: BudgetCategory = {
      id: tempId,
      label,
      icon: "🧾",
      planned: 0,
      spent: 0,
      expenses: [],
    };
    setCategories((cs) => [...cs, optimisticCat]);

    if (!isApi) {
      toast.success("Category added.");
      return;
    }
    try {
      const res = await fetch(`/api/budget/${budgetId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Couldn't add category");
      setCategories((cs) =>
        cs.map((c) => (c.id === tempId ? { ...c, id: data.id } : c))
      );
      toast.success("Category added.");
    } catch (err) {
      setCategories((cs) => cs.filter((c) => c.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Couldn't add category");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-12">
      {/* Header — linked itinerary */}
      <div className="rounded-3xl bg-white border border-gray-100 shadow-card overflow-hidden grid grid-cols-1 md:grid-cols-[260px_1fr]">
        {initial.tripImage && (
          <div className="relative h-44 md:h-full md:min-h-[160px]">
            <Image
              src={initial.tripImage}
              alt={initial.name}
              fill
              sizes="260px"
              className="object-cover"
            />
          </div>
        )}
        <div className="p-5 md:p-7 flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Trip Budget
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {initial.name}
          </h1>
          {initial.tripDates && (
            <p className="text-sm text-gray-500">{initial.tripDates}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {initial.itineraryId && (
              <Link
                href={`/itinerary/${initial.itineraryId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold"
              >
                Open itinerary
                <ArrowRightIcon size={14} />
              </Link>
            )}
            <Link
              href="/budget"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-gray-200 text-gray-700 hover:border-gray-300 text-sm font-semibold"
            >
              All budgets
            </Link>
          </div>
        </div>
      </div>

      {/* Live totals */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Planned" value={formatINR(totals.planned)} icon />
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

      {/* Breakdown */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Breakdown
          </h2>
          <AddCategoryButton onAdd={addCategory} />
        </div>

        <ul className="space-y-3">
          {categories.map((c) => {
            const remaining = c.planned - c.spent;
            const isOpen = openCategoryId === c.id;
            return (
              <li
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden"
              >
                <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-[1fr_repeat(3,_100px)_auto] gap-3 md:gap-5 items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{c.label}</p>
                      <p className="text-xs text-gray-500">
                        {c.expenses.length} expense
                        {c.expenses.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <Field
                    label="Planned"
                    value={c.planned}
                    onChange={(v) => updatePlanned(c.id, v)}
                  />
                  <Readonly label="Spent" value={formatINR(c.spent)} />
                  <Readonly
                    label="Remaining"
                    value={formatINR(remaining)}
                    accent={remaining < 0 ? "rose" : "neutral"}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setOpenCategoryId(isOpen ? null : c.id)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"
                  >
                    <PlusIcon size={14} />
                    {isOpen ? "Close" : "Add Expense"}
                    <ChevronDownIcon
                      size={12}
                      className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {isOpen && (
                  <ExpenseForm
                    onAdd={(exp) => {
                      addExpense(c.id, exp);
                      setOpenCategoryId(null);
                    }}
                  />
                )}

                {c.expenses.length > 0 && (
                  <ul className="border-t border-gray-100 divide-y divide-gray-100">
                    {c.expenses.map((e) => (
                      <li
                        key={e.id}
                        className="px-5 py-3 flex items-center justify-between gap-3 bg-cream"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {e.label}
                          </p>
                          <p className="text-xs text-gray-500">{e.date}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatINR(e.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeExpense(c.id, e.id)}
                            className="grid place-items-center w-8 h-8 rounded-full text-rose-600 hover:bg-rose-50"
                            aria-label="Remove expense"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  accent = "neutral",
  progress,
  icon,
}: {
  label: string;
  value: string;
  accent?: "neutral" | "green" | "rose";
  progress?: number;
  icon?: boolean;
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
        {icon && <WalletIcon size={12} className="text-gray-400" />}
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

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-0.5 w-full px-2 py-1.5 text-sm bg-cream border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />
    </label>
  );
}

function Readonly({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "neutral" | "rose";
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold ${accent === "rose" ? "text-rose-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ExpenseForm({
  onAdd,
}: {
  onAdd: (expense: Omit<BudgetExpense, "id">) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!label.trim() || !n || n <= 0) return;
    onAdd({ label: label.trim(), amount: n, date });
    setLabel("");
    setAmount("");
  }

  return (
    <form
      onSubmit={submit}
      className="px-5 py-4 grid grid-cols-1 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto] gap-3 items-end border-t border-gray-100 bg-cream animate-slide-down"
    >
      <label className="block">
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Label
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Booked IndiGo Delhi → Jaipur"
          className="mt-1 w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Amount (₹)
        </span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="4500"
          className="mt-1 w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Date
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
        />
      </label>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
      >
        <CheckIcon size={14} strokeWidth={3} />
        Save
      </button>
    </form>
  );
}

function AddCategoryButton({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  function commit() {
    if (!label.trim()) return;
    onAdd(label.trim());
    setLabel("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-dashed border-green-200 hover:border-green-400 text-green-700 text-sm font-semibold"
      >
        <PlusIcon size={14} />
        Add Category
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Visa fees"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setOpen(false);
        }}
        className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />
      <button
        type="button"
        onClick={commit}
        className="px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        Cancel
      </button>
    </div>
  );
}
