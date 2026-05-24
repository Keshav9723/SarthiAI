"use client";

// components/itinerary/EditableSlot.tsx
// Renders a Morning / Afternoon / Evening slot. Click → edit inline. Has
// "edited" pill when the user has overridden the AI text, with a one-tap
// reset to the original.

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  XIcon,
} from "@/components/ui/Icons";
import { toast } from "@/lib/toast";
import ActivityInfo from "./ActivityInfo";

interface Props {
  icon: React.ReactNode;
  label: string;
  /** Optional time hint shown beside the label, e.g. "9:00 AM". */
  timeHint?: string;
  /** AI-generated original text — used for reset. */
  original: string;
  /** Current value to render (may equal original or be user-edited). */
  value: string;
  /** True if the value differs from `original`. */
  isEdited: boolean;
  /** Optional accent color class for the icon bubble, e.g. "bg-amber-50". */
  bubbleBg?: string;
  /** Optional location context (e.g. "Jaipur") used to disambiguate the
      Wikipedia lookup in the "Learn more" dropdown. */
  locationHint?: string;
  onSave: (next: string) => void;
  onReset: () => void;
}

// Splits "Visit Amber Fort and City Palace. Built in 1592, this UNESCO..."
// into { title: "Visit Amber Fort and City Palace", description: "Built in..." }.
// If the text has no sentence boundary, the whole string is the title.
function splitTitleDescription(text: string): { title: string; description: string } {
  const t = text.trim();
  // Match first sentence end — period/!/? followed by space + capital letter,
  // OR period at end of a clause longer than ~10 chars (to avoid abbreviations).
  const m = t.match(/^(.{8,}?[.!?])\s+(.+)$/s);
  if (m) {
    return { title: m[1].replace(/[.!?]+$/, "").trim(), description: m[2].trim() };
  }
  return { title: t, description: "" };
}

export default function EditableSlot({
  icon,
  label,
  timeHint,
  original,
  value,
  isEdited,
  bubbleBg = "bg-saffron-50",
  locationHint,
  onSave,
  onReset,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Place caret at end.
      const v = textareaRef.current.value;
      textareaRef.current.setSelectionRange(v.length, v.length);
    }
  }, [editing]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Activity can't be empty.");
      return;
    }
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    if (trimmed === original) {
      onReset();
    } else {
      onSave(trimmed);
    }
    setEditing(false);
    toast.success("Day updated.");
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleReset() {
    onReset();
    setDraft(original);
    toast.info("Reverted to the original plan.");
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3">
        <span className={`grid place-items-center w-9 h-9 rounded-full ${bubbleBg} shrink-0 mt-0.5`}>
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            {label} · editing
          </p>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            rows={3}
            className="mt-1 w-full px-3 py-2 text-sm md:text-[15px] bg-white border border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-y leading-relaxed"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={commit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
            >
              <CheckIcon size={12} strokeWidth={3} />
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold"
            >
              <XIcon size={12} />
              Cancel
            </button>
            <span className="text-[10px] text-gray-400 ml-auto hidden sm:inline">
              ⌘ Enter to save · Esc to cancel
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { title, description } = splitTitleDescription(value);

  return (
    <div className="flex items-start gap-3 group">
      <span className={`grid place-items-center w-9 h-9 rounded-full ${bubbleBg} shrink-0 mt-0.5`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
            {label}
          </p>
          {timeHint && (
            <span className="text-[10px] font-medium text-gray-400">
              · {timeHint}
            </span>
          )}
          {isEdited && (
            <span className="text-[10px] font-semibold tracking-widest text-saffron-700 uppercase bg-saffron-50 border border-saffron-100 px-1.5 py-0.5 rounded-full">
              Edited
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={startEditing}
          className="mt-1 block text-left w-full hover:bg-cream rounded-lg px-1 -mx-1 transition-colors"
          title="Click to edit"
        >
          <p className="text-[15px] md:text-base font-semibold text-gray-900 leading-snug">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}
        </button>
        {/* "Learn more" disclosure — opens a Wikipedia blurb. Hidden in print
            because expanded cards add noise to the PDF. */}
        <div className="print:hidden">
          <ActivityInfo title={title} contextHint={locationHint} />
        </div>
        <div className="mt-1.5 flex items-center gap-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity print:hidden">
          <button
            type="button"
            onClick={startEditing}
            className="text-[11px] font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
          >
            Edit
          </button>
          {isEdited && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-gray-500 hover:text-rose-600 underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
