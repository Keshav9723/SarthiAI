"use client";

// components/layout/Navbar.tsx
// Sticky top navbar with the Sarthi compass logo, center nav links, and
// either a Login button or the authed user's avatar dropdown. Mobile gets a
// slide-down drawer triggered by a hamburger.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CompassIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  LogOutIcon,
  UserIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";
import SearchTrigger from "@/components/search/SearchTrigger";
import ThemeToggle, { ThemeIconToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/generate", label: "Generate" },
  { href: "/surprise", label: "Surprise Me" },
  { href: "/my-itineraries", label: "My Itineraries" },
  { href: "/budget", label: "Budget" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, hydrated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Close the account dropdown on outside click
  useEffect(() => {
    if (!accountOpen) return;
    function onClick(e: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [accountOpen]);

  async function handleLogout() {
    try {
      await signOut();
      toast.success("Signed out. See you soon!");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't sign out.");
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-forest-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-forest-800 print:hidden">
      <nav
        aria-label="Primary"
        className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus-ring rounded-lg -mx-2 px-2 py-1"
        >
          <span className="grid place-items-center w-9 h-9 rounded-full bg-forest-950 dark:bg-green-600 text-white group-hover:bg-green-600 transition-colors">
            <CompassIcon size={20} strokeWidth={2} />
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            Sarthi
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname || "/", link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors focus-ring ${
                    active
                      ? "text-green-700 dark:text-green-400"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full bg-green-600"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right side: search + notifications + login or user */}
        <div className="flex items-center gap-1">
          <div className="hidden md:block">
            <SearchTrigger />
          </div>
          {/* Auth area — render a stable skeleton until hydrated to avoid SSR flash */}
          <div className="hidden md:block">
            {hydrated && user ? (
              <div ref={accountRef} className="relative">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-200 dark:border-forest-700 hover:border-gray-300 dark:hover:border-forest-600 transition-colors focus-ring"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-600 text-green-700 dark:text-white grid place-items-center font-semibold text-sm">
                    {(user.name || user.email || "S").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {user.name || user.email}
                  </span>
                  <ChevronDownIcon size={16} className="text-gray-500 dark:text-gray-400" />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-forest-900 rounded-2xl shadow-card-hover border border-gray-100 dark:border-forest-800 p-1.5 animate-slide-down"
                  >
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-forest-800 mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-forest-800 transition-colors"
                      role="menuitem"
                    >
                      <UserIcon size={16} className="text-gray-500" />
                      Profile
                    </Link>
                    <Link
                      href="/my-itineraries"
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-forest-800 transition-colors"
                      role="menuitem"
                    >
                      <CompassIcon size={16} className="text-gray-500" />
                      My Itineraries
                    </Link>
                    <div className="my-1 h-px bg-gray-100 dark:bg-forest-800" />
                    <ThemeToggle />
                    <div className="my-1 h-px bg-gray-100 dark:bg-forest-800" />
                    <Link
                      href="/budget"
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-forest-800 transition-colors"
                      role="menuitem"
                    >
                      <WalletIcon size={16} className="text-gray-500" />
                      My Budgets
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      role="menuitem"
                    >
                      <LogOutIcon size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeIconToggle />
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-green-700 border-2 border-green-600 hover:bg-green-600 hover:text-white rounded-full transition-colors focus-ring"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-forest-800 transition-colors focus-ring"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 dark:border-forest-800 bg-white dark:bg-forest-900 animate-slide-down">
          <ul className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname || "/", link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                      active
                        ? "bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300"
                        : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-forest-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2 mt-2 border-t border-gray-100 dark:border-forest-800">
              {hydrated && user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-600 text-green-700 dark:text-white grid place-items-center font-semibold">
                      {(user.name || user.email || "S").charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOutIcon size={18} />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="block text-center px-5 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                >
                  Login / Sign up
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
