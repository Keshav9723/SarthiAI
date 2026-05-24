// lib/confirm.ts
// Tiny imperative API for the global ConfirmDialog. Drop-in replacement for
// the native `window.confirm(...)`, but as a styled in-app modal.
//
// Usage:
//   const ok = await confirmDialog({
//     title: "Delete trip?",
//     message: "This will permanently delete the trip and its budget.",
//     confirmLabel: "Delete",
//     destructive: true,
//   });
//   if (!ok) return;
//
// The dispatch goes through a CustomEvent so callers can be any component
// (server boundary, hook, plain function) without prop-drilling a context.

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If true, the confirm button renders in destructive (red) style. */
  destructive?: boolean;
}

export interface ConfirmEventDetail extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export const CONFIRM_EVENT = "sarthi:confirm";

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  // SSR / non-browser safety — resolve false rather than throwing.
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const detail: ConfirmEventDetail = { ...opts, resolve };
    window.dispatchEvent(new CustomEvent<ConfirmEventDetail>(CONFIRM_EVENT, { detail }));
  });
}
