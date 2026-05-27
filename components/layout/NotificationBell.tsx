"use client";

// components/layout/NotificationBell.tsx
// Navbar widget showing recent travel signals (price drops, weather alerts,
// reminders). Click → dropdown panel. Mock data for now.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CompassIcon,
  CloudSunIcon,
  WalletIcon,
  SparklesIcon,
  CheckIcon,
} from "@/components/ui/Icons";

interface Notification {
  id: string;
  icon: "price" | "weather" | "deal" | "reminder";
  title: string;
  body: string;
  timeAgo: string;
  href?: string;
  unread?: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    icon: "price",
    title: "Goa flights dropped 12%",
    body: "IndiGo Bangalore → Goa now ₹3,499 — book before Friday.",
    timeAgo: "2h ago",
    href: "/itinerary/2",
    unread: true,
  },
  {
    id: "n-2",
    icon: "weather",
    title: "Manali snow forecast updated",
    body: "Heavy snowfall expected Dec 18–20. Add an extra buffer day.",
    timeAgo: "5h ago",
    href: "/itinerary/3",
    unread: true,
  },
  {
    id: "n-3",
    icon: "reminder",
    title: "Your Golden Triangle trip starts in 21 days",
    body: "Time to pack? We've prepared a checklist.",
    timeAgo: "1d ago",
    href: "/itinerary/1",
  },
  {
    id: "n-4",
    icon: "deal",
    title: "Kerala houseboats — 30% off",
    body: "Alleppey premium boats discounted through May 25.",
    timeAgo: "2d ago",
    href: "/explore/Kerala",
  },
];

const ICON_BY_TYPE = {
  price: WalletIcon,
  weather: CloudSunIcon,
  deal: SparklesIcon,
  reminder: CompassIcon,
} as const;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(
    () => new Set(MOCK_NOTIFICATIONS.filter((n) => n.unread).map((n) => n.id))
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function markAllRead() {
    setUnreadIds(new Set());
  }

  const unreadCount = unreadIds.size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid place-items-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-forest-800 transition-colors text-gray-700 dark:text-gray-200 focus-ring"
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-card-hover border border-gray-100 p-1.5 animate-slide-down z-50"
        >
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800"
              >
                <CheckIcon size={12} strokeWidth={3} />
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[60vh] overflow-y-auto thin-scrollbar">
            {MOCK_NOTIFICATIONS.map((n) => {
              const Icon = ICON_BY_TYPE[n.icon];
              const unread = unreadIds.has(n.id);
              return (
                <li key={n.id}>
                  <Link
                    href={n.href ?? "#"}
                    onClick={() => {
                      setUnreadIds((s) => {
                        const next = new Set(s);
                        next.delete(n.id);
                        return next;
                      });
                      setOpen(false);
                    }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-forest-800 transition-colors"
                  >
                    <span
                      className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${
                        n.icon === "price"
                          ? "bg-green-50 text-green-700"
                          : n.icon === "weather"
                            ? "bg-sky-50 text-sky-700"
                            : n.icon === "deal"
                              ? "bg-saffron-50 text-saffron-600"
                              : "bg-violet-50 text-violet-700"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p
                          className={`text-sm leading-snug ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}
                        >
                          {n.title}
                        </p>
                        {unread && (
                          <span
                            aria-hidden
                            className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-rose-500"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {n.timeAgo}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-gray-100 px-3 py-2 text-center">
            <Link
              href="/my-itineraries"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              See all activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline bell icon — small enough not to bother adding to Icons.tsx.
function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
