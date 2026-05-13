"use client";

// components/auth/AuthForm.tsx
// Mock login/signup. Writes a minimal { name, email } object to localStorage
// under "sarthi_user" so the Navbar reflects the auth state immediately.

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  CompassIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/lib/toast";

type Mode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields.");
      return;
    }
    setBusy(true);
    // Simulate latency so the UI feels real.
    window.setTimeout(() => {
      login({
        name: mode === "signup" ? name : email.split("@")[0] ?? "Traveller",
        email,
      });
      toast.success(
        mode === "signup"
          ? "Account created. Welcome aboard!"
          : "Welcome back!"
      );
      router.push("/");
    }, 600);
  }

  function handleOAuth(provider: "Google" | "Apple") {
    setBusy(true);
    window.setTimeout(() => {
      login({
        name: "Keshav",
        email: `keshav@${provider.toLowerCase()}.com`,
      });
      toast.success(`Signed in with ${provider}.`);
      router.push("/");
    }, 600);
  }

  return (
    <div className="w-full max-w-md mx-auto">
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
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-gray-500">
        {mode === "login"
          ? "Sign in to access your saved itineraries and budgets."
          : "Save itineraries across devices and unlock the budget tracker."}
      </p>

      {/* OAuth */}
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={() => handleOAuth("Google")}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <GoogleLogo />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("Apple")}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <AppleLogo />
          Continue with Apple
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">
          or
        </span>
        <span className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Email/password */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field
            label="Full name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Keshav Tanwar"
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full mt-3 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-60"
        >
          {mode === "login" ? "Sign in" : "Create account"}
          <ArrowRightIcon size={16} />
        </button>
      </form>

      <p className="mt-5 text-sm text-gray-600 text-center">
        {mode === "login" ? "New to Sarthi? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
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
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
      />
    </label>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.46 2.27-1.22 3.09-.81.88-2.13 1.55-3.21 1.47-.13-1.1.43-2.27 1.18-3.04.81-.84 2.18-1.46 3.25-1.52zM20.74 17.5c-.6 1.34-.89 1.94-1.67 3.13-1.08 1.66-2.6 3.73-4.49 3.75-1.68.02-2.11-1.09-4.39-1.08-2.28.01-2.76 1.1-4.44 1.08-1.89-.02-3.34-1.88-4.42-3.54-3-4.65-3.32-10.11-1.47-13.02 1.32-2.07 3.41-3.28 5.37-3.28 2 0 3.26 1.1 4.92 1.1 1.6 0 2.58-1.1 4.9-1.1 1.75 0 3.6.95 4.92 2.6-4.34 2.38-3.64 8.61.78 11.36z" />
    </svg>
  );
}
