// lib/toast.ts
// Imperative, dependency-free toast API. Call `toast.success("Saved!")` from
// anywhere in the app — the Toaster component subscribes and renders.
//
// Lives on a module-level singleton so it survives across re-renders and
// works from both event handlers and async callbacks.

export type ToastType = "success" | "error" | "info";

export interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (toasts: ToastEntry[]) => void;

let entries: ToastEntry[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l([...entries]);
}

const DEFAULT_TTL_MS = 3500;

function show(message: string, type: ToastType = "info", ttl = DEFAULT_TTL_MS) {
  // Use crypto.randomUUID where available; fall back to a cheap random id.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  entries = [...entries, { id, type, message }];
  emit();
  setTimeout(() => {
    dismiss(id);
  }, ttl);
  return id;
}

function dismiss(id: string) {
  entries = entries.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  show,
  success: (m: string, ttl?: number) => show(m, "success", ttl),
  error: (m: string, ttl?: number) => show(m, "error", ttl),
  info: (m: string, ttl?: number) => show(m, "info", ttl),
  dismiss,
};

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  // Push current state immediately so the subscriber renders correctly on mount.
  listener([...entries]);
  return () => {
    listeners.delete(listener);
  };
}
