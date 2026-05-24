"use client";

// components/auth/ResetPasswordForm.tsx
// Step 2 of the forgot-password flow. The user landed here from the reset
// email — by this point Supabase has already exchanged the recovery token
// for a temporary session, so we can call updateUser({ password }) directly.
//
// If no session is present (link expired, etc.) we surface that and link
// them back to "Forgot password" to try again.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState<"loading" | "ok" | "missing">("loading");

  // Check we actually have a session — Supabase puts one on the URL hash
  // after the user clicks the email link. The SDK handles parsing it
  // automatically; we just wait one tick.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(data.session ? "ok" : "missing");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!password || !confirm) {
      toast.error("Enter your new password in both fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="inline-flex items-center gap-2 group focus-ring rounded-lg -mx-2 px-2 py-1"
      >
        <span className="grid place-items-center w-9 h-9 rounded-full bg-forest-950 text-white group-hover:bg-green-600 transition-colors">
          <CompassIcon size={20} strokeWidth={2} />
        </span>
        <span className="text-lg font-bold tracking-tight text-gray-900">
          Sarthi
        </span>
      </Link>

      <h1 className="mt-8 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        Set a new password
      </h1>

      {sessionReady === "loading" && (
        <p className="mt-3 text-sm text-gray-500">Validating reset link…</p>
      )}

      {sessionReady === "missing" && (
        <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-sm text-rose-800">
          <p className="font-semibold">This reset link has expired or is invalid.</p>
          <p className="mt-1">
            Head back to{" "}
            <Link href="/auth" className="underline underline-offset-2 font-semibold">
              sign-in
            </Link>{" "}
            and click <em>Forgot password?</em> to get a new link.
          </p>
        </div>
      )}

      {sessionReady === "ok" && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Field
            label="New password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter the same password"
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
            {!busy && <ArrowRightIcon size={16} />}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
        {label}
      </span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />
    </label>
  );
}
