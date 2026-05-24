
"use client";

// lib/useAuth.ts
// Supabase-backed auth hook. Replaces the localStorage mock with the real
// session pulled from supabase.auth + a live subscription so all components
// using this hook re-render on sign-in / sign-out / profile update.
//
// Returns the same { user, hydrated } shape as before, plus async
// updateProfile() and signOut() helpers. AuthForm now calls Supabase methods
// directly — auth state propagates here via the listener.

import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import type { User } from "./mockData";

const LEGACY_KEY = "sarthi_user"; // pre-Supabase localStorage entry — cleaned up below

/**
 * Translates a Supabase auth user into the frontend's `User` shape so every
 * other component sees the same fields whether we're mocked or real.
 */
function mapUser(u: SupabaseUser | null | undefined): User | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as {
    name?: string;
    avatar_url?: string;
  };
  return {
    name:
      (meta.name && meta.name.trim()) ||
      u.email?.split("@")[0] ||
      "Traveller",
    email: u.email ?? "",
    avatar: meta.avatar_url,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wipe the obsolete localStorage user — the Supabase session cookie is
    // now the source of truth. Idempotent.
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      // SSR / private browsing — ignore
    }

    const supabase = createClient();

    // Hydrate immediately from the current session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapUser(session?.user));
      setHydrated(true);
    });

    // Live re-renders on sign-in, sign-out, token refresh, profile update.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Update name / avatar (stored under `user_metadata`) or email.
   * Throws on Supabase error so callers can show a toast.
   */
  async function updateProfile(patch: {
    name?: string;
    email?: string;
    avatar?: string;
  }) {
    const supabase = createClient();

    type Updates = Parameters<typeof supabase.auth.updateUser>[0];
    const updates: Updates = {};

    if (patch.email) updates.email = patch.email;

    if (patch.name !== undefined || patch.avatar !== undefined) {
      const data: Record<string, unknown> = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.avatar !== undefined) data.avatar_url = patch.avatar;
      updates.data = data;
    }

    if (Object.keys(updates).length === 0) return;
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
  }

  // Sign out from EVERY device this account is logged in on (mobile, other
  // browsers, etc.) — Supabase's global scope kills all refresh tokens for
  // the user. Matches user expectation when they sign out after losing a
  // device or sharing their account.
  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
  }

  return { user, hydrated, updateProfile, signOut };
}
