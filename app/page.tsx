// app/page.tsx — Sarthi homepage.
//
// Order is tuned for a narrative arc with alternating light/dark backgrounds:
//   1. Hero          — action (dark, cinematic)
//   2. How it works  — orient ("what is this?")          [light cream]
//   3. Trending      — visual seduction                  [white]
//   4. Why Sarthi    — quick credibility stats           [light cream]
//   5. Ask Sarthi    — AI demo, dramatic spotlight       [DARK forest]
//   6. Packages      — concrete curated trips            [light cream]
//   7. Quick answers — objection handling                [white]
//
// Server component shell; interactive children opt in with "use client".

import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TrendingDestinationsSection from "@/components/home/TrendingDestinationsSection";
import WhySarthiSection from "@/components/home/WhySarthiSection";
import AskSarthiSection from "@/components/home/AskSarthiSection";
import PackagesSection from "@/components/home/PackagesSection";
import HomeFAQSection from "@/components/home/HomeFAQSection";
import OnboardingTour from "@/components/onboarding/OnboardingTour";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <TrendingDestinationsSection />
      <WhySarthiSection />
      <AskSarthiSection />
      <PackagesSection />
      <HomeFAQSection />
      <OnboardingTour />
    </>
  );
}
