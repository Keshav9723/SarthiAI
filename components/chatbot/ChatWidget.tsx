"use client";

// components/chatbot/ChatWidget.tsx
// Global floating "Ask Sarthi" widget. Pathname-aware so it greets the user
// with copy tuned to the current page (homepage, itinerary, budget, ...).
//
// - Floating pill button bottom-right, opens a right-side slide-in panel
// - Hardcoded bot brain in lib/mockData.ts (getBotResponse, getOpener)
// - Typing dots for ~1s before the bot reply renders
// - Suggested-reply chips render below the input and refresh after each reply

import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CompassIcon,
  XIcon,
  SendIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import {
  getOpener,
  getSuggestedChips,
  type ChatMessage,
  type PageContext,
} from "@/lib/mockData";
import { useChatStream } from "@/lib/useChatStream";
import MarkdownLite from "./MarkdownLite";

function pathToContext(path: string | null): PageContext {
  if (!path) return "default";
  if (path === "/") return "home";
  if (path.startsWith("/explore")) return "explore";
  if (path.startsWith("/generate")) return "generate";
  if (path.startsWith("/surprise")) return "surprise";
  if (path.startsWith("/itinerary")) return "itinerary";
  if (path.startsWith("/budget")) return "budget";
  if (path.startsWith("/my-itineraries")) return "my-itineraries";
  if (path.startsWith("/auth")) return "auth";
  return "default";
}

export default function ChatWidget() {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const context = useMemo(() => pathToContext(pathname), [pathname]);

  // Per-page sessionStorage key. We persist the entire conversation under
  // this key so a hard reload on the same path keeps the message thread
  // intact. Navigating to a different page starts a fresh thread.
  const storageKey = useMemo(
    () => `sarthi:chat:${pathname ?? "/"}`,
    [pathname]
  );
  const metadataStorageKey = useMemo(
    () => `sarthi:chat:meta:${pathname ?? "/"}`,
    [pathname]
  );

  // For /itinerary/[id], pass the URL id straight through so the modify-itinerary
  // handler can DB-load it. (Earlier this looked up the destination name in
  // mockData — which only contains template itineraries — so user-generated
  // trips silently sent `undefined` and the handler bailed out.)
  const destination = useMemo(() => {
    if (context !== "itinerary" || !params?.id) return undefined;
    return params.id;
  }, [context, params]);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // wider panel when true
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [unread, setUnread] = useState(true);
  // The id of the in-flight bot message we're streaming text into. When null,
  // no streaming is happening.
  const [streamingBotId, setStreamingBotId] = useState<string | null>(null);
  // Per-message metadata (sources, deep links, etc.) sent by handler `metadata`
  // events. Keyed by message id so source pills render below the right bubble.
  const [messageMetadata, setMessageMetadata] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wire the SSE stream from /api/chat. The callbacks append tokens to the
  // currently-streaming bot message, then finalise it on `done`.
  const streamingBotIdRef = useRef<string | null>(null);
  streamingBotIdRef.current = streamingBotId;

  const { send: sendToApi } = useChatStream({
    onIntent: (intent, confidence) => {
      // For debugging — uncomment to see intents land in console
      // console.log("[chat] intent:", intent, "confidence:", confidence);
    },
    onToken: (content) => {
      const id = streamingBotIdRef.current;
      if (!id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text: m.text + content } : m))
      );
    },
    onMetadata: (data) => {
      const id = streamingBotIdRef.current;
      if (!id) return;
      setMessageMetadata((prev) => ({ ...prev, [id]: data }));
      // The modify-itinerary handler emits { itinerary_id, patches } when it
      // has just written changes back to the DB. Trigger a server re-fetch
      // so the day-slot grid and budget panel update live — no manual page
      // reload required.
      if (
        data &&
        typeof data === "object" &&
        "itinerary_id" in data &&
        "patches" in data
      ) {
        router.refresh();
      }
    },
    onError: (msg) => {
      const id = streamingBotIdRef.current;
      if (!id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, text: m.text + (m.text ? "\n\n" : "") + `⚠ ${msg}` }
            : m
        )
      );
    },
    onDone: () => {
      setStreamingBotId(null);
      streamingBotIdRef.current = null;
      setIsTyping(false);
      setShowChips(true);
    },
  });

  // Hydrate the conversation from sessionStorage on mount / path change.
  // If there's saved history for this page, restore it; otherwise seed with
  // the context-tuned opener. Persistence is per-tab and per-path, so a
  // hard reload on /itinerary/[id] keeps the thread, while navigating to a
  // different page starts a fresh one.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedMessages = window.sessionStorage.getItem(storageKey);
      const savedMetadata = window.sessionStorage.getItem(metadataStorageKey);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          if (savedMetadata) {
            try {
              setMessageMetadata(JSON.parse(savedMetadata));
            } catch {
              setMessageMetadata({});
            }
          }
          setShowChips(false);
          return;
        }
      }
    } catch {
      // Corrupt JSON or quota error — fall through to opener seed.
    }
    setMessages([
      {
        id: `opener-${context}-${destination ?? "x"}`,
        sender: "bot",
        text: getOpener(context, destination),
        timestamp: new Date().toISOString(),
      },
    ]);
    setMessageMetadata({});
    setShowChips(true);
  }, [context, destination, storageKey, metadataStorageKey]);

  // Persist the conversation back to sessionStorage whenever it changes.
  // Skip writes while a message is mid-stream so we don't save partial text;
  // the final write happens when streamingBotId clears on `done`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (streamingBotId) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
      window.sessionStorage.setItem(
        metadataStorageKey,
        JSON.stringify(messageMetadata)
      );
    } catch {
      // Storage quota exceeded — silently ignore; the thread will still
      // work in-memory for the rest of the session.
    }
  }, [messages, messageMetadata, streamingBotId, storageKey, metadataStorageKey]);

  // Auto-scroll the messages list when a new message or typing indicator appears.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus the input when the panel opens, and remember what was focused so we
  // can restore it on close (standard a11y pattern for dialog UX).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
      setUnread(false);
      const t = setTimeout(() => inputRef.current?.focus(), 240);
      return () => clearTimeout(t);
    } else {
      // Restore focus when panel closes — keyboard users land back on the
      // launcher / triggering button rather than on <body>.
      previouslyFocusedRef.current?.focus?.();
    }
  }, [isOpen]);

  // Close on Escape + trap Tab inside the panel while it's open.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = document.querySelector<HTMLElement>(
        '[role="dialog"][aria-label="Sarthi AI assistant"]'
      );
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Other parts of the app (e.g. the "Edit Itinerary with Sarthi" button or
  // the homepage Ask-Sarthi demo) can open the widget by dispatching
  // `sarthi:open-chat`. Optionally pass `{ detail: { prompt: "..." } }` to
  // auto-send a question after the panel slides in.
  //
  // We hop through a ref to call the latest `send` from inside this once-
  // registered listener — putting `send` in the deps array would re-bind the
  // listener on every state change.
  const sendRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    function onOpen(e: Event) {
      setIsOpen(true);
      const detail = (e as CustomEvent<{ prompt?: string } | undefined>).detail;
      const prompt = detail?.prompt;
      if (prompt) {
        // Delay so the slide-in animation completes and the user sees the
        // prompt land in the conversation, not before.
        window.setTimeout(() => sendRef.current(prompt), 380);
      }
    }
    window.addEventListener("sarthi:open-chat", onOpen);
    return () => window.removeEventListener("sarthi:open-chat", onOpen);
  }, []);

  const chips = useMemo(() => getSuggestedChips(context), [context]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping || streamingBotId) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    // Pre-create an empty bot message we'll stream tokens into.
    const botId = `b-${Date.now()}`;
    const botMsg: ChatMessage = {
      id: botId,
      sender: "bot",
      text: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setShowChips(false);
    setIsTyping(true);
    setStreamingBotId(botId);
    streamingBotIdRef.current = botId;

    // Build conversation history for the API (last 6 turns, excluding the
    // empty bot message we just pushed)
    const history = messages
      .slice(-6)
      .filter((m) => m.text.trim().length > 0)
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }))
      .concat([{ role: "user", content: trimmed }]);

    sendToApi({
      message: trimmed,
      history,
      pageContext: context,
      pageDestination: destination,
    });
  }

  // Keep the ref pointed at the latest `send` so external triggers always
  // get the current closure (with up-to-date state + context).
  sendRef.current = send;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {/* Floating launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Sarthi AI assistant"
          className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-40 group flex items-center gap-2.5 pl-3 pr-5 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-chat transition-all hover:scale-[1.02] active:scale-[0.98] focus-ring"
        >
          <span className="relative grid place-items-center w-9 h-9 rounded-full bg-white/15">
            <CompassIcon size={20} strokeWidth={2} />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-2 ring-white/60 animate-pulse-ring"
            />
          </span>
          <span className="font-semibold text-sm tracking-tight">
            Ask Sarthi
          </span>
          {unread && (
            <span
              aria-hidden
              className="ml-1 -mt-3 w-2 h-2 rounded-full bg-saffron-500 ring-2 ring-white"
            />
          )}
        </button>
      )}

      {/* Slide-in panel */}
      {isOpen && (
        <>
          {/* Mobile-only backdrop so the panel doesn't feel detached on small screens */}
          <button
            type="button"
            aria-label="Close Sarthi AI"
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] animate-fade-in"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Sarthi AI assistant"
            className={`fixed top-0 right-0 z-50 h-[100dvh] w-full bg-white shadow-chat flex flex-col animate-slide-in-right border-l border-gray-100 transition-[width] duration-300 ease-out ${
              isExpanded ? "md:w-[min(720px,55vw)]" : "md:w-[400px]"
            }`}
          >
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-gray-100 bg-gradient-to-br from-forest-950 to-green-700 text-white flex items-center gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-full bg-white/15">
                <CompassIcon size={22} strokeWidth={2} />
              </span>
              <div className="flex-1">
                <p className="font-semibold tracking-tight flex items-center gap-1.5">
                  Sarthi AI
                  <SparklesIcon size={14} className="text-saffron-400" />
                </p>
                <p className="text-xs text-white/70">
                  Always available · usually replies instantly
                </p>
              </div>
              {/* Expand / collapse — only useful on md+ where the panel can grow */}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? "Collapse Sarthi AI" : "Expand Sarthi AI"}
                title={isExpanded ? "Collapse" : "Expand"}
                className="hidden md:grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-ring"
              >
                {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Sarthi AI"
                className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-ring"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto thin-scrollbar px-4 py-5 space-y-3 bg-cream"
            >
              {messages.map((m) => {
                // Skip the empty streaming bot bubble — we render a separate
                // TypingBubble for it below. Without this, the avatar would
                // appear twice (the empty bubble + the typing indicator).
                if (
                  m.id === streamingBotId &&
                  m.sender === "bot" &&
                  (!m.text || m.text.length === 0)
                ) {
                  return null;
                }
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    metadata={messageMetadata[m.id]}
                  />
                );
              })}
              {/* Show typing dots only while we're waiting for the FIRST token
                  on a streaming reply — once tokens start arriving, the bot
                  bubble itself shows progress. */}
              {isTyping && streamingBotId &&
                messages.find((m) => m.id === streamingBotId)?.text.length === 0 && (
                <TypingBubble />
              )}
            </div>

            {/* Suggested chips */}
            {showChips && !isTyping && (
              <div className="px-4 pb-2 pt-1 bg-white border-t border-gray-100">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 mb-1.5">
                  SUGGESTED
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => send(chip)}
                      className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="shrink-0 p-3 bg-white border-t border-gray-100 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your trip…"
                aria-label="Message Sarthi AI"
                className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full placeholder:text-gray-400 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="grid place-items-center w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white transition-colors focus-ring"
              >
                <SendIcon size={18} />
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}

function MessageBubble({
  message,
  metadata,
}: {
  message: ChatMessage;
  metadata?: Record<string, unknown>;
}) {
  const isUser = message.sender === "user";
  const sources = Array.isArray(metadata?.sources) ? (metadata!.sources as string[]) : [];

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}>
      {!isUser && (
        <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-forest-950 text-white">
          <CompassIcon size={14} strokeWidth={2} />
        </span>
      )}
      <div className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-green-600 text-white rounded-br-sm"
              : "bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm"
          }`}
        >
          {isUser ? (
            // User messages are plain text — no markdown interpretation
            <p className="whitespace-pre-wrap">{message.text}</p>
          ) : (
            // Bot messages get lightweight markdown rendering
            <MarkdownLite text={message.text} />
          )}
        </div>
        {!isUser && sources.length > 0 && (
          <SourcePills sources={sources} />
        )}
      </div>
    </div>
  );
}

/** Small grey pills under bot messages showing where the info came from. */
function SourcePills({ sources }: { sources: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 px-1">
      <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mr-1 self-center">
        Sources
      </span>
      {sources.slice(0, 4).map((url, i) => {
        const label = labelForSource(url);
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[11px] font-medium text-gray-700 transition-colors"
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}

/** Turn a long URL into a short human-readable label. */
function labelForSource(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("wikivoyage")) return "Wikivoyage";
    if (u.hostname.includes("wikipedia")) return "Wikipedia";
    if (u.hostname.includes("open-meteo")) return "Open-Meteo";
    if (u.hostname.includes("openstreetmap")) return "OpenStreetMap";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

// Inline SVG icons for the expand/collapse toggle. Kept here (not in Icons.tsx)
// because they're only used in this one place.
function ExpandIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}
function CollapseIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M10 14l-7 7" />
    </svg>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2 justify-start animate-slide-up">
      <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-forest-950 text-white">
        <CompassIcon size={14} strokeWidth={2} />
      </span>
      <div
        className="bg-white text-gray-600 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-1"
        aria-label="Sarthi is typing"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "160ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce-dot" style={{ animationDelay: "320ms" }} />
      </div>
    </div>
  );
}

