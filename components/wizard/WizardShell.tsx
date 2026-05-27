"use client";

// components/wizard/WizardShell.tsx
// Full-screen wizard frame: progress bar at top, transitioned step content
// below, and Back/Next bar at the bottom. The actual step content is rendered
// as children — parent owns state and validation.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ArrowRightIcon } from "@/components/ui/Icons";

interface Props {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  canGoNext?: boolean;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
  hideNav?: boolean;
}

export default function WizardShell({
  step,
  totalSteps,
  title,
  subtitle,
  canGoNext = true,
  nextLabel,
  onBack,
  onNext,
  children,
  hideNav = false,
}: Props) {
  const router = useRouter();

  // Scroll to top whenever the user advances or goes back — without this the
  // viewport stays on the previous question, which is jarring on mobile.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Back button behavior: step > 1 → previous step in the wizard. step === 1
  // → leave the wizard entirely (router.back() falls through to home if
  // there's no history). Either way the button stays clickable so users
  // never feel trapped inside the flow.
  function handleBack() {
    if (step > 1) {
      onBack();
    } else {
      try {
        router.back();
      } catch {
        router.push("/");
      }
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col bg-cream">
      {/* Header */}
      <div className="max-w-3xl mx-auto w-full px-4 md:px-8 pt-8 md:pt-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="grid place-items-center w-10 h-10 rounded-full border border-gray-200 dark:border-forest-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-forest-800 transition-colors"
            aria-label={step === 1 ? "Leave wizard" : "Previous step"}
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div className="flex-1">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (step / totalSteps) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Step {step} of {totalSteps}
            </p>
          </div>
        </div>
      </div>

      {/* Step body */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-10 md:py-14 animate-slide-up">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-base md:text-lg text-gray-500 max-w-2xl">
            {subtitle}
          </p>
        )}
        <div className="mt-8 md:mt-10">{children}</div>
      </div>

      {/* Footer / nav */}
      {!hideNav && (
        <div className="sticky bottom-0 border-t border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-8 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              {step === 1 ? "Exit" : "Back"}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-semibold transition-colors focus-ring"
            >
              {nextLabel ?? (step === totalSteps ? "Submit" : "Next")}
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
