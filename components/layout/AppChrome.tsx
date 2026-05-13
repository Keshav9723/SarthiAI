"use client";

// components/layout/AppChrome.tsx
// Decides whether to render the global chrome (Navbar, Footer, ChatWidget) or
// pass children through bare. /auth uses a custom split-screen layout, so we
// strip the chrome there. Everything else gets the full shell.

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import ChatWidget from "@/components/chatbot/ChatWidget";

const NO_CHROME_PREFIXES = ["/auth"];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const bare = NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Keyboard users hit Tab once to expose this; activating it focuses
          the main region directly without traversing the whole nav. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-[calc(100dvh-4rem)] focus:outline-none"
      >
        {/* Keying on pathname re-mounts this wrapper on every route change,
            which retriggers the fade-in animation for a smooth transition.
            Respects `prefers-reduced-motion` via the global CSS rule. */}
        <div key={pathname} className="animate-fade-in motion-reduce:animate-none">
          {children}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <ChatWidget />
    </>
  );
}
