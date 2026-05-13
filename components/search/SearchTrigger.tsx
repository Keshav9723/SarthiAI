"use client";

// components/search/SearchTrigger.tsx
// Compact search button mounted in the navbar. Owns the modal state and the
// global ⌘ K / Ctrl K keyboard shortcut listener.

import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";
import SearchModal from "./SearchModal";

export default function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl + K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      // Forward slash as a power-user shortcut (when not typing in an input)
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search Sarthi"
        title="Search ( ⌘ K )"
        className="grid place-items-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-forest-800 transition-colors text-gray-700 dark:text-gray-200 focus-ring"
      >
        <SearchIcon size={18} />
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
