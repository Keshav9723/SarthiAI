// app/privacy/page.tsx

import LegalDoc, { type LegalSection } from "@/components/legal/LegalDoc";

export const metadata = {
  title: "Privacy Policy",
};

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>
          We collect three buckets of data. Each is used only for the purpose
          listed below — never combined into ad profiles, and never sold.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account data</strong> — name, email, hashed password,
            optional avatar URL. Used to authenticate you and let you sign in
            across devices.
          </li>
          <li>
            <strong>Trip data</strong> — itineraries you generate, budgets
            you create, and expenses you log. Stored against your user id.
          </li>
          <li>
            <strong>Preferences</strong> — default group, hotel tier, dietary
            choice, home city. Saved locally first and synced to your account
            once signed in.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use it",
    body: (
      <>
        <p>
          Sarthi uses your data to plan your trip — nothing else. Specifically:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Generate AI itineraries grounded in your group, budget, and dates.
          </li>
          <li>
            Save and retrieve trips and budgets when you switch devices.
          </li>
          <li>
            Pre-fill wizards on subsequent visits so you skip repeat work.
          </li>
          <li>
            Improve product quality via anonymised, aggregate usage signals.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third parties we share with",
    body: (
      <>
        <p>
          We never sell or rent your data. We share minimum-necessary data
          with the following processors so the product can function:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Anthropic (Claude)</strong> — your prompts and selected
            preferences are sent to generate itinerary content and chat
            replies. Anthropic does not train on your data.
          </li>
          <li>
            <strong>Supabase</strong> — hosts the database, authentication,
            and storage. Located on AWS Mumbai/Frankfurt regions.
          </li>
          <li>
            <strong>Amadeus, OpenWeatherMap, Google Maps</strong> — live
            travel and weather data. We do not pass identifying information.
          </li>
          <li>
            <strong>Sentry</strong> — crash reporting. We scrub PII before
            sending.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    body: (
      <p>
        Itineraries and budgets are retained as long as your account is
        active. Deleting your account in Profile → Account actions removes
        all of it within 30 days. Anonymised analytics may persist longer in
        aggregate.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>You can, at any time:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Export your trip and budget data (JSON).</li>
          <li>Delete your account and all linked data.</li>
          <li>Withdraw consent to processing.</li>
          <li>
            Contact us for any data-protection question at{" "}
            <a
              href="mailto:privacy@sarthi.ai"
              className="text-green-700 font-semibold underline underline-offset-2"
            >
              privacy@sarthi.ai
            </a>
            .
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about this policy? Reach the team at{" "}
        <a
          href="mailto:privacy@sarthi.ai"
          className="text-green-700 font-semibold underline underline-offset-2"
        >
          privacy@sarthi.ai
        </a>
        . We respond within 5 business days.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      lastUpdated="May 2026"
      intro={
        <p>
          We built Sarthi for India and we take privacy seriously — especially
          for a planner that learns your travel patterns. This policy explains
          what data we collect, how we use it, and how to remove it. Plain
          language, no surprises.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
