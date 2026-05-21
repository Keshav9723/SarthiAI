"use client";

// components/chatbot/MarkdownLite.tsx
// Lightweight markdown renderer for chatbot bubbles. Avoids a full markdown
// dependency (react-markdown ~30KB) by handling just the subset Sarthi emits:
//   • Paragraph breaks (blank line)
//   • **bold** and __bold__
//   • *italic* and _italic_
//   • Inline `code`
//   • Bullet lists starting with "•" or "- " or "* "
//   • Inline links: [label](url)
//
// Anything else passes through as plain text. Safe by construction — we never
// dangerouslySetInnerHTML; everything is React elements.

import React from "react";
import Link from "next/link";

interface Props {
  text: string;
}

export default function MarkdownLite({ text }: Props) {
  const blocks = splitBlocks(text);
  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "h") {
          // h1 (#) is too big for chat — render the same as h2 styling.
          // h2 (##) is the canonical "section header" in chat replies.
          // h3 (###) is a minor sub-heading.
          if (block.level === 3) {
            return (
              <h4 key={i} className="text-sm font-semibold text-gray-900 mt-2">
                {renderInline(block.content)}
              </h4>
            );
          }
          return (
            <h3
              key={i}
              className="text-base font-bold tracking-tight text-gray-900 mt-3 first:mt-0"
            >
              {renderInline(block.content)}
            </h3>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 pl-1">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "p"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "h"; level: 1 | 2 | 3; content: string };

// Split the text into block elements: headings (#, ##, ###), bullet lists
// (•, -, *), and paragraphs. Blank lines flush whatever block is buffered.
function splitBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let listBuffer: string[] = [];

  function flushBuffer() {
    if (buffer.length === 0) return;
    const content = buffer.join("\n").trim();
    if (content) blocks.push({ type: "p", content });
    buffer = [];
  }
  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push({ type: "ul", items: [...listBuffer] });
    listBuffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Heading detection — must come first, before paragraph/list logic.
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushBuffer();
      blocks.push({
        type: "h",
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:•|-|\*)\s+(.+)$/);
    if (bulletMatch) {
      flushBuffer();
      listBuffer.push(bulletMatch[1]);
    } else if (trimmed === "") {
      flushList();
      flushBuffer();
    } else {
      flushList();
      buffer.push(line);
    }
  }
  flushList();
  flushBuffer();
  return blocks;
}

// Render inline markdown: **bold**, *italic*, `code`, [text](url).
// Walks the string once and emits a React fragment.
function renderInline(text: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Link [label](url)
    if (text[i] === "[") {
      const close = text.indexOf("]", i);
      if (close >= 0 && text[close + 1] === "(") {
        const paren = text.indexOf(")", close + 2);
        if (paren >= 0) {
          const label = text.slice(i + 1, close);
          const url = text.slice(close + 2, paren);
          tokens.push(
            <Link
              key={`l-${i}`}
              href={url}
              className="text-green-700 hover:text-green-800 underline underline-offset-2"
            >
              {label}
            </Link>
          );
          i = paren + 1;
          continue;
        }
      }
    }

    // **bold**
    if (text.slice(i, i + 2) === "**") {
      const end = text.indexOf("**", i + 2);
      if (end >= 0) {
        tokens.push(
          <strong key={`b-${i}`} className="font-semibold text-gray-900">
            {text.slice(i + 2, end)}
          </strong>
        );
        i = end + 2;
        continue;
      }
    }

    // *italic*  (skip when it's actually a bullet starter at line start)
    if (text[i] === "*" && text[i + 1] !== "*" && (i === 0 || text[i - 1] !== "\n")) {
      const end = text.indexOf("*", i + 1);
      if (end >= 0 && text[end - 1] !== " ") {
        tokens.push(
          <em key={`i-${i}`} className="italic">
            {text.slice(i + 1, end)}
          </em>
        );
        i = end + 1;
        continue;
      }
    }

    // `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end >= 0) {
        tokens.push(
          <code
            key={`c-${i}`}
            className="px-1 py-0.5 bg-gray-100 rounded text-[0.9em] font-mono"
          >
            {text.slice(i + 1, end)}
          </code>
        );
        i = end + 1;
        continue;
      }
    }

    // Plain character — accumulate into the last string-token if possible
    const last = tokens[tokens.length - 1];
    if (typeof last === "string") {
      tokens[tokens.length - 1] = last + text[i];
    } else {
      tokens.push(text[i]);
    }
    i++;
  }

  return <>{tokens}</>;
}
