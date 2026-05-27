"use client";

// components/ui/ConfirmDialog.tsx
// Globally-mounted styled confirmation modal. Listens for the `sarthi:confirm`
// custom event (dispatched by `lib/confirm.ts::confirmDialog`) and renders
// itself on top of everything. Resolves the caller's Promise on either button.

import { useEffect, useState } from "react";
import { CONFIRM_EVENT, type ConfirmEventDetail } from "@/lib/confirm";
import { XIcon } from "@/components/ui/Icons";

interface State extends ConfirmEventDetail {}

export default function ConfirmDialog() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    function onConfirm(e: Event) {
      const detail = (e as CustomEvent<ConfirmEventDetail>).detail;
      setState(detail);
    }
    window.addEventListener(CONFIRM_EVENT, onConfirm as EventListener);
    return () => window.removeEventListener(CONFIRM_EVENT, onConfirm as EventListener);
  }, []);

  // Lock body scroll while open.
  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  // Esc = cancel, Enter = confirm (only if focus isn't already on a button).
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function finish(ok: boolean) {
    if (!state) return;
    state.resolve(ok);
    setState(null);
  }

  if (!state) return null;

  const confirmLabel = state.confirmLabel ?? "Confirm";
  const cancelLabel = state.cancelLabel ?? "Cancel";
  const destructive = state.destructive ?? false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[100] grid place-items-center px-4 py-8 animate-fade-in"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => finish(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      {/* Dialog card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        <button
          type="button"
          aria-label="Close"
          onClick={() => finish(false)}
          className="absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-forest-800 transition-colors"
        >
          <XIcon size={18} />
        </button>

        <div className="p-6 md:p-7">
          {state.title && (
            <h2
              id="confirm-title"
              className="pr-8 text-lg md:text-xl font-bold tracking-tight text-gray-900"
            >
              {state.title}
            </h2>
          )}
          <p className={`${state.title ? "mt-2" : "pr-8"} text-sm md:text-[15px] text-gray-700 leading-relaxed`}>
            {state.message}
          </p>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => finish(false)}
              className="px-4 py-2.5 rounded-full border-2 border-gray-200 text-gray-700 hover:border-gray-300 text-sm font-semibold focus-ring"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              autoFocus
              className={`px-5 py-2.5 rounded-full text-white text-sm font-semibold focus-ring transition-colors ${
                destructive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
