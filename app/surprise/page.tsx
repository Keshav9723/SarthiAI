// app/surprise/page.tsx — entry to the Surprise Me wizard.

import SurpriseWizard from "@/components/wizard/SurpriseWizard";

export const metadata = {
  title: "Surprise Me",
};

export default function SurprisePage() {
  return <SurpriseWizard />;
}
