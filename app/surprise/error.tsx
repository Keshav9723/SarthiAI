"use client";

// app/surprise/error.tsx — scoped to the Surprise Me wizard.

import { useEffect } from "react";
import Link from "next/link";
import { SparklesIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SurpriseError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Sarthi/surprise] error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
      <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-saffron-50 text-saffron-600">
        <SparklesIcon size={26} />
      </span>
      <h1 className="mt-5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
        The dice didn&apos;t roll
      </h1>
      <p className="mt-2 text-gray-600">
        We couldn&apos;t pick a destination just now. Reset and try again.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-saffron-500 hover:bg-saffron-600 text-white font-semibold"
        >
          Roll again
          <ArrowRightIcon size={14} />
        </button>
        <Link
          href="/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold"
        >
          Plan manually
        </Link>
      </div>
    </div>
  );
}
