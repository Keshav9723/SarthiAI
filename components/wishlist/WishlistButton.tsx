"use client";

// components/wishlist/WishlistButton.tsx
// Heart button used on destination / itinerary cards. Tap toggles save.
// Visual states: outlined (not saved) vs rose-filled (saved).

import { useWishlist, type WishlistKind } from "@/lib/useWishlist";
import { HeartIcon } from "@/components/ui/Icons";
import { toast } from "@/lib/toast";

interface Props {
  kind: WishlistKind;
  id: string;
  label: string;
  variant?: "card-corner" | "inline";
}

export default function WishlistButton({
  kind,
  id,
  label,
  variant = "card-corner",
}: Props) {
  const { has, toggle, hydrated } = useWishlist();

  // Render a placeholder until hydration so SSR + client match.
  if (!hydrated) return null;

  const saved = has(kind, id);

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggle(kind, id, label);
    toast.success(
      nowSaved ? `Saved "${label}" to wishlist` : `Removed "${label}" from wishlist`
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handle}
        aria-pressed={saved}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
          saved
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        }`}
      >
        <HeartIcon size={14} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      className={`absolute top-3 right-3 z-10 grid place-items-center w-9 h-9 rounded-full backdrop-blur-sm transition-all focus-ring ${
        saved
          ? "bg-rose-500 text-white shadow-card-hover scale-[1.02]"
          : "bg-white/90 text-gray-700 hover:bg-white"
      }`}
    >
      <HeartIcon size={16} />
    </button>
  );
}
