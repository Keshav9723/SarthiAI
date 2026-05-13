// app/blog/page.tsx — blog listing.

import BlogCard from "@/components/blog/BlogCard";
import { MOCK_POSTS } from "@/lib/mockBlog";
import { CompassIcon, SparklesIcon } from "@/components/ui/Icons";

export const metadata = {
  title: "Blog",
  description:
    "Practical India-travel writing from the Sarthi team — monsoon timing, altitude tips, route hacks.",
};

export default function BlogPage() {
  const [featured, ...rest] = [...MOCK_POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );

  return (
    <div>
      {/* Hero */}
      <section className="bg-forest-950 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm">
            <CompassIcon size={14} />
            The Sarthi blog
          </span>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Practical India-travel writing.
          </h1>
          <p className="mt-3 text-white/80 text-lg max-w-2xl">
            Monsoon windows, altitude protocols, route hacks, and the local
            wisdom most guidebooks miss. Written by the team that builds the
            planner.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-12">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Featured
          </p>
          <div className="mt-4">
            <BlogCard post={featured} featured />
          </div>
        </section>
      )}

      {/* Rest */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          More articles
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rest.map((p) => (
            <BlogCard key={p.slug} post={p} />
          ))}
        </div>

        {/* Empty-state guard, in case all posts are featured */}
        {rest.length === 0 && (
          <div className="mt-8 text-center max-w-md mx-auto p-8 rounded-2xl bg-cream border border-gray-100">
            <SparklesIcon size={28} className="mx-auto text-saffron-500" />
            <p className="mt-3 text-gray-600">
              More articles coming soon. Subscribe via the contact page to be
              notified.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
