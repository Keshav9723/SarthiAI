// components/blog/PostBody.tsx
// Renders our minimal block-node structure. Kept dependency-free — no
// markdown parser. Each block type maps to a styled element.

import Image from "next/image";
import type { BlockNode } from "@/lib/mockBlog";

export default function PostBody({ blocks }: { blocks: BlockNode[] }) {
  return (
    <div className="space-y-5 text-gray-800 leading-relaxed">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

function renderBlock(b: BlockNode, i: number) {
  switch (b.type) {
    case "h2":
      return (
        <h2
          key={i}
          className="mt-10 text-2xl md:text-3xl font-bold tracking-tight text-gray-900"
        >
          {b.text}
        </h2>
      );
    case "p":
      return (
        <p key={i} className="text-[17px] leading-[1.75]">
          {b.text}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="space-y-2 pl-1">
          {b.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[17px]">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote
          key={i}
          className="my-6 border-l-4 border-green-500 pl-5 italic text-gray-700"
        >
          <p className="text-lg">&ldquo;{b.text}&rdquo;</p>
          {b.cite && (
            <footer className="mt-2 text-sm text-gray-500 not-italic">
              — {b.cite}
            </footer>
          )}
        </blockquote>
      );
    case "image":
      return (
        <figure key={i} className="my-6">
          <div className="relative w-full rounded-2xl overflow-hidden aspect-[16/9]">
            <Image
              src={b.src}
              alt={b.alt}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          {b.caption && (
            <figcaption className="mt-2 text-sm text-gray-500 text-center">
              {b.caption}
            </figcaption>
          )}
        </figure>
      );
  }
}
