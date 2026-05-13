// app/auth/page.tsx — split-screen login/signup. AppChrome hides the navbar /
// footer / chat widget on this route so the layout is full-bleed.

import Image from "next/image";
import AuthForm from "@/components/auth/AuthForm";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";

export const metadata = {
  title: "Sign in",
};

export default function AuthPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      {/* Left — hero image with quote */}
      <div className="relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1400"
          alt="Hawa Mahal in Jaipur at golden hour"
          fill
          priority
          sizes="50vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-10 text-white">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/80">
            Sarthi — Guiding Your Indian Journey
          </p>
          <blockquote className="max-w-md">
            <p className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              &ldquo;A trip is not what you see — it&apos;s what you remember.
              We help you plan for both.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-white/80">
              — Built for every kind of Indian traveller
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center px-5 py-12 md:py-16">
        <AuthForm />
      </div>
    </main>
  );
}
