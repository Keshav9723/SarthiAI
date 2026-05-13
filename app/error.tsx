"use client";

// app/error.tsx — global error boundary. Catches any runtime crash in any
// route segment that doesn't have its own error.tsx.

import { useEffect } from "react";
import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // In production this would forward to Sentry. For now, log to console so
    // it appears in the dev terminal too.
    console.error("[Sarthi] runtime error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-20 md:py-24 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-rose-50 text-rose-600">
        <CompassIcon size={28} />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        Sarthi hit an unexpected detour
      </h1>
      <p className="mt-3 text-gray-600">
        Something on this page crashed. The team has been notified — try
        reloading, or head back to the homepage.
      </p>

      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-6 px-4 py-3 text-left text-xs bg-gray-50 border border-gray-200 rounded-2xl text-gray-700 overflow-auto">
          {error.message}
          {error.digest && (
            <span className="block mt-2 text-gray-500">
              digest: {error.digest}
            </span>
          )}
        </pre>
      )}

      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
        >
          Try again
          <ArrowRightIcon size={16} />
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-800 font-semibold transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
