// app/terms/page.tsx

import LegalDoc, { type LegalSection } from "@/components/legal/LegalDoc";

export const metadata = {
  title: "Terms of Service",
};

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    body: (
      <p>
        By using Sarthi (the website, mobile views, and the floating chat
        assistant), you agree to these Terms. If you don&apos;t agree, please
        don&apos;t use the service. We may update these Terms periodically —
        material changes will be flagged in the app.
      </p>
    ),
  },
  {
    id: "the-service",
    title: "The service",
    body: (
      <>
        <p>
          Sarthi is an AI-powered Indian-travel itinerary planner. It
          generates day-by-day plans, tracks budgets, and answers travel
          questions using Claude and a set of real-time travel data sources.
        </p>
        <p>
          We do not currently book flights, hotels, or trains directly. Links
          out to partner booking sites are clearly labelled and we are not
          responsible for those bookings.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts",
    body: (
      <>
        <p>
          You can use most of Sarthi without an account. To save trips and
          sync across devices, you create an account with email/password or
          via Google / Apple OAuth.
        </p>
        <p>
          You&apos;re responsible for keeping your credentials secure. Don&apos;t
          share your account, and notify us immediately if you suspect
          unauthorised access.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <p>
        Itineraries you generate, expenses you log, and chat messages you
        send remain yours. You grant Sarthi a license to store, display,
        process and aggregate this data only for the purpose of running the
        service.
      </p>
    ),
  },
  {
    id: "ai-disclaimer",
    title: "AI disclaimer",
    body: (
      <>
        <p>
          Itineraries are AI-generated and may contain errors. Please verify
          critical details yourself:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Visa and permit requirements (Rohtang, Inner Line, etc.)</li>
          <li>Live ticket availability and prices</li>
          <li>Real-time weather and road closures</li>
          <li>Health, safety, and emergency contact info</li>
        </ul>
        <p>
          Sarthi is a planning tool, not a guarantee. Final responsibility for
          travel decisions rests with you.
        </p>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited use",
    body: (
      <>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Scrape, crawl, or reverse-engineer the service.</li>
          <li>Abuse the AI for content unrelated to travel planning.</li>
          <li>Resell itineraries as your own commercial product.</li>
          <li>Attempt to circumvent rate limits or security measures.</li>
        </ul>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        Sarthi is provided &ldquo;as is&rdquo; without warranties. To the
        maximum extent permitted by law, we&apos;re not liable for indirect or
        consequential losses arising from the use of the service. Specific
        rights you have as a consumer under Indian law are not affected.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <p>
        You may delete your account at any time from Profile → Account
        actions. We may suspend or terminate accounts that violate these
        Terms, with reasonable notice where possible.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: (
      <p>
        These Terms are governed by the laws of India. Disputes shall be
        subject to the courts of Gurugram, Haryana.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal · Terms"
      title="Terms of Service"
      lastUpdated="May 2026"
      intro={
        <p>
          Sarthi is a free AI travel-planning service built for India. By
          using it, you agree to these Terms. Read them — they&apos;re short,
          plain-language, and explain what to expect from the service and
          what we expect from you.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
