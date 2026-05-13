import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center">
      <span className="inline-grid place-items-center w-16 h-16 rounded-full bg-saffron-50 text-saffron-600">
        <CompassIcon size={28} />
      </span>
      <h1 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        That article doesn&apos;t exist
      </h1>
      <p className="mt-3 text-gray-600">
        It may have moved or been retired. Try the latest writing instead.
      </p>
      <Link
        href="/blog"
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold"
      >
        Back to the blog
        <ArrowRightIcon size={16} />
      </Link>
    </div>
  );
}
