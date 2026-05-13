"use client";

// lib/useWishlist.ts
// Tiny localStorage-backed wishlist. Stores ids per "kind" (destination /
// itinerary). Used by Trending cards, Destination detail, ItineraryCard,
// and a new /wishlist page.

import { useCallback, useEffect, useState } from "react";

export type WishlistKind = "destination" | "itinerary";

export interface WishlistItem {
  id: string;
  kind: WishlistKind;
  /** Display label used in toasts and the wishlist page. */
  label: string;
  addedAt: string; // ISO
}

const KEY = "sarthi_wishlist";
const EVENT = "sarthi:wishlist";

function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is WishlistItem =>
        x &&
        typeof x === "object" &&
        typeof (x as WishlistItem).id === "string" &&
        typeof (x as WishlistItem).kind === "string"
    );
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readWishlist());
    setHydrated(true);
    const onChange = () => setItems(readWishlist());
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  const has = useCallback(
    (kind: WishlistKind, id: string) =>
      items.some((i) => i.kind === kind && i.id === id),
    [items]
  );

  const add = useCallback(
    (kind: WishlistKind, id: string, label: string) => {
      const list = readWishlist();
      if (list.some((i) => i.kind === kind && i.id === id)) return;
      const next: WishlistItem[] = [
        ...list,
        { kind, id, label, addedAt: new Date().toISOString() },
      ];
      writeWishlist(next);
    },
    []
  );

  const remove = useCallback((kind: WishlistKind, id: string) => {
    const list = readWishlist();
    writeWishlist(list.filter((i) => !(i.kind === kind && i.id === id)));
  }, []);

  const toggle = useCallback(
    (kind: WishlistKind, id: string, label: string) => {
      if (has(kind, id)) {
        remove(kind, id);
        return false; // now removed
      }
      add(kind, id, label);
      return true; // now added
    },
    [has, add, remove]
  );

  function clear() {
    writeWishlist([]);
  }

  return { items, has, add, remove, toggle, clear, hydrated };
}
