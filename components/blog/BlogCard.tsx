// components/blog/BlogCard.tsx
// Single article card. Used in the listing grid.

import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@/components/ui/Icons";
import type { BlogPost } from "@/lib/mockBlog";

export default function BlogCard({
  post,
  featured = false,
}: {
  post: BlogPost;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden focus-ring ${
        featured ? "md:grid md:grid-cols-2" : ""
      }`}
    >
      <div className={`relative ${featured ? "h-64 md:h-full md:min-h-[280px]" : "h-44"} w-full overflow-hidden`}>
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/95 text-gray-800">
          {post.category}
        </span>
      </div>
      <div className="p-5 flex flex-col">
        <h3
          className={`font-bold tracking-tight text-gray-900 group-hover:text-green-700 transition-colors ${
            featured ? "text-2xl md:text-3xl" : "text-lg"
          }`}
        >
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-4 flex items-center gap-3 border-t border-gray-100">
          <span className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100">
            <Image
              src={post.author.avatar}
              alt={post.author.name}
              fill
              sizes="32px"
              className="object-cover"
            />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {post.author.name}
            </p>
            <p className="text-[11px] text-gray-500">
              {formatDate(post.publishedAt)} · {post.readMinutes} min read
            </p>
          </div>
          <ArrowRightIcon
            size={16}
            className="text-gray-400 group-hover:text-green-700 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </Link>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
