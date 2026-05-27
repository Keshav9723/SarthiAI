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

// Splits multi-sentence activity text into a title (the most informative
// sentence) and a description (everything else, in original order).
//
// We can't just take the first sentence: the LLM frequently leads with a
// generic action like "Lunch at a local café" and then mentions the actual
// landmark ("Visit Manu Temple") in the second sentence. Picking the first
// sentence as the heading hides the interesting content. Instead we score
// every sentence and use the highest-scoring one as the title.
function splitTitleDescription(text: string): { title: string; description: string } {
  const t = text.trim();
  // Split on sentence boundaries (period/!/?, followed by whitespace + capital).
  const sentences = splitSentences(t);
  if (sentences.length <= 1) {
    return { title: t.replace(/[.!?]+$/, "").trim(), description: "" };
  }

  // Score each sentence, then pick the top one as the title. Ties resolve in
  // favour of the earlier sentence so the original ordering is preserved
  // when nothing stands out.
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < sentences.length; i++) {
    const score = scoreSentence(sentences[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const title = sentences[bestIdx].replace(/[.!?]+$/, "").trim();
  const description = sentences
    .filter((_, i) => i !== bestIdx)
    .join(" ")
    .trim();
  return { title, description };
}

/** Split prose on sentence boundaries. Lightweight — not as precise as a
 *  full NLP segmenter, but enough for itinerary copy. */
function splitSentences(t: string): string[] {
  // Capture each "...sentence."-like run. Lookbehind isn't reliable across
  // older Safari, so we do it with a positive split.
  const parts = t.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [t];
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Score a single sentence on how good a heading it would make. Higher is
 *  better. The weights are tuned to favour sentences naming a specific
 *  place over generic action sentences like "Lunch at a local café". */
function scoreSentence(sentence: string): number {
  const s = sentence.trim();
  let score = 0;

  // +3 for an action verb that names a place ("Visit Manu Temple", "Explore Old City").
  if (/^(Visit|Explore|See|Tour|Hike|Walk|Drive|Trek|Discover|Wander)\s+/i.test(s)) {
    score += 3;
  }

  // +3 for a multi-word proper-noun phrase in the middle of the sentence —
  // strong signal that the sentence references a real landmark.
  // Skip the first word so the sentence-initial capital doesn't count.
  const afterFirst = s.replace(/^\S+\s+/, "");
  const properNounMatches = afterFirst.match(/[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+/g);
  if (properNounMatches && properNounMatches.length > 0) {
    score += 3;
  } else if (afterFirst.match(/[A-Z][a-zA-Z]+/)) {
    // +1 for at least one capitalised word mid-sentence (single-word place name).
    score += 1;
  }

  // -3 for generic food / rest / arrival sentences that don't name anything.
  if (
    /^(Have\s+)?(Lunch|Dinner|Breakfast|Brunch|Snacks?|Eat|Dine)\s+at\s+(a|the|some)?\s*(local|nearby|quaint|cozy)?/i.test(s) ||
    /^(Relax|Rest|Unwind|Chill|Take it easy|Free time)/i.test(s) ||
    /^(Check[-\s]?in|Check[-\s]?out|Arrive|Depart)\s+(at|to|in)?\s*(your|the|a)?\s*(hotel|stay|accommodation)?$/i.test(s)
  ) {
    score -= 3;
  }

  // Slight tiebreaker by length — longer sentences usually carry more detail.
  if (s.length > 30) score += 0.5;

  return score;
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
          className="mt-1 block text-left w-full hover:bg-cream dark:hover:bg-forest-800 rounded-lg px-1 -mx-1 transition-colors"
          title="Click to edit"
        >
          <p className="text-[15px] md:text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
