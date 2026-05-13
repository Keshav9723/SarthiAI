// app/budget/[id]/not-found.tsx

import Link from "next/link";
import { WalletIcon, ArrowRightIcon } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-green-50 text-green-700">
        <WalletIcon size={28} />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        No budget found for that trip
      </h1>
      <p className="mt-3 text-gray-600">
        Open the overview to pick an existing one, or start a new budget from
        an itinerary you&apos;ve saved.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link
          href="/budget"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Open Budget Planner
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
