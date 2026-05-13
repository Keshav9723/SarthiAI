// app/blog/[slug]/page.tsx — article detail.

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PostBody from "@/components/blog/PostBody";
import BlogCard from "@/components/blog/BlogCard";
import { MOCK_POSTS, getPostBySlug } from "@/lib/mockBlog";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return MOCK_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Article" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.cover],
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const related = MOCK_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <article>
      {/* Hero */}
      <section className="relative bg-forest-950 text-white">
        <div className="absolute inset-0 opacity-30">
          <Image
            src={post.cover}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/60 to-forest-950" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 md:px-8 pt-16 pb-12 md:pt-20 md:pb-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white font-semibold"
          >
            ← Back to blog
          </Link>
          <span className="mt-5 inline-block text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-saffron-500 text-white">
            {post.category}
          </span>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-white/85 leading-relaxed">
            {post.excerpt}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10">
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <div>
              <p className="text-sm font-semibold">{post.author.name}</p>
              <p className="text-xs text-white/70 inline-flex items-center gap-1.5">
                <CalendarIcon size={12} />
                {formatDate(post.publishedAt)} · {post.readMinutes} min read
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cover image */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-card-hover">
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
        </div>
      </section>

      {/* Body */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <PostBody blocks={post.body} />

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Tagged
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <li
                key={t}
                className="text-xs text-gray-700 bg-gray-100 border border-gray-100 px-2.5 py-1 rounded-full"
              >
                #{t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-cream border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                Keep reading
              </h2>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                All articles
                <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
