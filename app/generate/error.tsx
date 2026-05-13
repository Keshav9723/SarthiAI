"use client";

// app/generate/error.tsx — scoped to the Generate wizard.

import { useEffect } from "react";
import Link from "next/link";
import { SparklesIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GenerateError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Sarthi/generate] error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
      <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-saffron-50 text-saffron-600">
        <SparklesIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        Sarthi got stuck mid-plan
      </h1>
      <p className="mt-2 text-gray-600">
        Your inputs are safe. Restart the wizard or let Sarthi surprise you.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Restart
          <ArrowRightIcon size={14} />
        </button>
        <Link
          href="/surprise"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-saffron-500 text-saffron-600 hover:bg-saffron-500 hover:text-white font-semibold"
        >
          Surprise me 🎲
        </Link>
      </div>
    </div>
  );
}
