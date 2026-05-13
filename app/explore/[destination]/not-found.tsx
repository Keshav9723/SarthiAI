import Link from "next/link";
import {
  CompassIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-saffron-50 text-saffron-600">
        <CompassIcon size={28} />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        We don&apos;t have that destination yet
      </h1>
      <p className="mt-3 text-gray-600">
        It might be coming soon. In the meantime, browse the ones we do know
        inside out.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          Back to Explore
          <ArrowRightIcon size={16} />
        </Link>
        <Link
          href="/surprise"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-saffron-500 text-saffron-600 hover:bg-saffron-500 hover:text-white font-semibold"
        >
          Surprise Me 🎲
        </Link>
      </div>
    </div>
  );
}
