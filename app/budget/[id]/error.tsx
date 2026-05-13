"use client";

// app/budget/[id]/error.tsx — scoped to the budget detail editor.

import { useEffect } from "react";
import Link from "next/link";
import { WalletIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BudgetError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Sarthi/budget] error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
      <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-rose-50 text-rose-600">
        <WalletIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Couldn&apos;t load this budget
      </h1>
      <p className="mt-2 text-gray-600">
        Try reloading. If it persists, you can view all your budgets and pick
        a different one.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Try again
          <ArrowRightIcon size={14} />
        </button>
        <Link
          href="/budget"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold"
        >
          All budgets
        </Link>
      </div>
    </div>
  );
}
