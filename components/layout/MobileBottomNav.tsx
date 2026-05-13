"use client";

// components/layout/MobileBottomNav.tsx
// Fixed 5-tab bar visible only on small screens (sm and below). Primary
// destinations: Home, Explore, Surprise (center, accented), Wishlist,
// Profile. Active route is highlighted.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CompassIcon,
  SearchIcon,
  DiceIcon,
  HeartIcon,
  UserIcon,
} from "@/components/ui/Icons";

const TABS = [
  { href: "/", label: "Home", Icon: CompassIcon },
  { href: "/explore", label: "Explore", Icon: SearchIcon },
  { href: "/surprise", label: "Surprise", Icon: DiceIcon, primary: true },
  { href: "/wishlist", label: "Saved", Icon: HeartIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar on mobile */}
      <div className="md:hidden h-16" aria-hidden />
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-100 pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            const primary = "primary" in t && t.primary;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className="flex flex-col items-center justify-center gap-0.5 py-2.5 focus-ring"
                >
                  <span
                    className={`grid place-items-center w-10 h-10 rounded-full transition-colors ${
                      primary
                        ? active
                          ? "bg-saffron-600 text-white"
                          : "bg-saffron-500 text-white"
                        : active
                          ? "bg-green-50 text-green-700"
                          : "text-gray-600"
                    }`}
                  >
                    <t.Icon size={primary ? 22 : 20} />
                  </span>
                  <span
                    className={`text-[10px] font-semibold tracking-wide ${
                      active ? "text-green-700" : "text-gray-600"
                    }`}
                  >
                    {t.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
