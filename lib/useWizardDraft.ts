"use client";

// lib/useWizardDraft.ts
// Generic wizard auto-save. Persists form state + current step to
// localStorage on every call to `save()`, and reads any existing draft on
// mount. Drafts older than `maxAgeMs` are auto-cleared so we don't show the
// user a half-thought from a week ago.
//
// Usage:
//   const { draft, save, clear, hydrated } = useWizardDraft<FormState>("sarthi_generate_draft");
//   // call save(form, step) whenever the form changes
//   // call clear() on successful submit

import { useCallback, useEffect, useState } from "react";

export interface Draft<T> {
  state: T;
  step: number;
  savedAt: number; // epoch ms
}

const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function useWizardDraft<T extends object>(
  storageKey: string,
  maxAgeMs: number = DEFAULT_MAX_AGE
) {
  const [draft, setDraft] = useState<Draft<T> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let restored: Draft<T> | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft<T>;
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.savedAt === "number" &&
          typeof parsed.step === "number" &&
          parsed.state &&
          Date.now() - parsed.savedAt < maxAgeMs
        ) {
          restored = parsed;
        } else {
          // Stale or malformed — clean up so it never causes another bad
          // restore in future sessions.
          window.localStorage.removeItem(storageKey);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    setDraft(restored);
    setHydrated(true);
  }, [storageKey, maxAgeMs]);

  const save = useCallback(
    (state: T, step: number) => {
      try {
        const next: Draft<T> = { state, step, savedAt: Date.now() };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // localStorage full or disabled — silently ignore. Drafts are an
        // enhancement, not a contract.
      }
    },
    [storageKey]
  );

  const clear = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setDraft(null);
  }, [storageKey]);

  return { draft, save, clear, hydrated };
}
