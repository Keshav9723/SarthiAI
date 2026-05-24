"use client";

// components/itinerary/SaveTemplateButton.tsx
// Visible only on template itineraries. POSTs to /api/itinerary/copy to
// duplicate the template into the user's own collection, then redirects to
// the new copy where they can freely edit, track, and add a budget.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeartIcon, CheckIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";

interface Props {
  templateId: string;
  templateTitle: string;
}

export default function SaveTemplateButton({ templateId, templateTitle }: Props) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!hydrated) return;
    if (!user) {
      toast.error("Sign in to save this trip.");
      router.push(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/itinerary/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      toast.success(
        data.alreadySaved
          ? `Already saved — opening your copy.`
          : `Saved "${templateTitle}" to your trips.`
      );
      router.push(`/itinerary/${data.id}`);
    } catch (err) {
      toast.error(`Couldn't save: ${(err as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      aria-label="Save this trip to your collection"
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-saffron-300 bg-saffron-50 hover:bg-saffron-100 text-saffron-700 font-semibold transition-colors focus-ring disabled:opacity-60"
    >
      {saving ? (
        <>
          <CheckIcon size={18} strokeWidth={3} />
          Saving…
        </>
      ) : (
        <>
          <HeartIcon size={18} />
          Save Trip
        </>
      )}
    </button>
  );
}
