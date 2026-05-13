"use client";

// components/contact/ContactForm.tsx
// Mock contact form. No backend yet — submission shows a success toast and
// resets. The Profile / Auth flows persist user data, but feedback is
// fire-and-forget for now.

import { useState } from "react";
import { toast } from "@/lib/toast";
import { SendIcon, SparklesIcon } from "@/components/ui/Icons";

const TOPICS = [
  "Trip planning help",
  "Bug report",
  "Feature request",
  "Press / partnership",
  "Something else",
] as const;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setBusy(true);
    // Simulate latency so the button state feels real.
    window.setTimeout(() => {
      toast.success("Message sent. We'll reply within 1 business day.");
      setName("");
      setEmail("");
      setMessage("");
      setTopic(TOPICS[0]);
      setBusy(false);
    }, 700);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Name"
          required
          value={name}
          onChange={setName}
          placeholder="Keshav Tanwar"
          autoComplete="name"
        />
        <Field
          label="Email"
          required
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <label className="block">
        <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          What&apos;s this about?
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const selected = topic === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                  selected
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </label>

      <label className="block">
        <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Message <span className="text-rose-500">*</span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Tell us what you need — the more context, the better the answer."
          className="mt-1.5 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none placeholder:text-gray-400"
        />
      </label>

      <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
        <SparklesIcon size={14} className="text-saffron-500" />
        We read every message. Bug reports get priority.
      </p>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {busy ? "Sending…" : "Send message"}
        <SendIcon size={16} />
      </button>
    </form>
  );
}

function Field({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  required?: boolean;
  type?: "text" | "email";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none placeholder:text-gray-400"
      />
    </label>
  );
}
