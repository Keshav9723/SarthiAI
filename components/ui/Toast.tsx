"use client";

// components/ui/Toast.tsx
// Renders the active toasts stacked bottom-left. Paired with `lib/toast.ts`
// which holds the singleton state. Mount once at the root layout.

import { useEffect, useState } from "react";
import { subscribeToasts, toast, type ToastEntry } from "@/lib/toast";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  XIcon,
} from "@/components/ui/Icons";

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 max-w-[calc(100vw-3rem)]"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} entry={t} />
      ))}
    </div>
  );
}

function ToastCard({ entry }: { entry: ToastEntry }) {
  const styles: Record<ToastEntry["type"], { ring: string; icon: JSX.Element }> = {
    success: {
      ring: "ring-green-200",
      icon: <CheckCircleIcon className="text-green-600" size={20} />,
    },
    error: {
      ring: "ring-rose-200",
      icon: <AlertCircleIcon className="text-rose-600" size={20} />,
    },
    info: {
      ring: "ring-sky-200",
      icon: <InfoIcon className="text-sky-600" size={20} />,
    },
  };
  const s = styles[entry.type];
  return (
    <div
      role="status"
      className={`flex items-start gap-3 bg-white rounded-2xl shadow-card-hover ring-1 ${s.ring} px-4 py-3 pr-2 animate-slide-up w-[320px] max-w-full`}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <p className="flex-1 text-sm text-gray-800 leading-snug">
        {entry.message}
      </p>
      <button
        onClick={() => toast.dismiss(entry.id)}
        aria-label="Dismiss notification"
        className="text-gray-400 hover:text-gray-700 transition rounded-full p-1 focus-ring"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
