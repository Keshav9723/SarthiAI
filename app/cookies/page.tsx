// app/cookies/page.tsx

import LegalDoc, { type LegalSection } from "@/components/legal/LegalDoc";

export const metadata = {
  title: "Cookie Policy",
};

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-store",
    title: "What we store on your device",
    body: (
      <>
        <p>
          Sarthi keeps things light. We rely on browser <strong>localStorage</strong>
          {" "}rather than cookies for most state. Here&apos;s the full list:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <code className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
              sarthi_user
            </code>{" "}
            — your account (name, email, avatar). Set on login.
          </li>
          <li>
            <code className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
              sarthi_prefs
            </code>{" "}
            — your travel preferences (preferred group, hotel tier, dietary,
            home city).
          </li>
          <li>
            <code className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
              sarthi_group_type
            </code>{" "}
            — quick selection from the homepage hero so the wizards pre-fill.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party cookies",
    body: (
      <p>
        We do not embed third-party analytics, advertising, or tracking
        cookies. We don&apos;t share data with Google Analytics, Facebook
        Pixel, or similar. If we ever introduce one, we&apos;ll ask for opt-in
        consent first.
      </p>
    ),
  },
  {
    id: "session",
    title: "Session cookies (when logged in)",
    body: (
      <p>
        Once we wire Supabase Auth (currently mocked), a secure HttpOnly
        session cookie will be set to authenticate API calls. This cookie is
        strictly necessary and is not subject to consent under most
        jurisdictions.
      </p>
    ),
  },
  {
    id: "manage",
    title: "Managing your storage",
    body: (
      <>
        <p>
          You can clear all Sarthi storage at any time:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            In-app: Profile → Account actions → <strong>Delete account</strong>.
          </li>
          <li>
            Browser: open DevTools → Application → Local Storage → right-click{" "}
            <code className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
              sarthi.ai
            </code>
            {" "}→ Clear.
          </li>
          <li>
            Mobile: clear site data from your browser settings.
          </li>
        </ul>
        <p>
          Clearing storage will sign you out and remove your preferences
          locally; if you&apos;re signed in, your trips and budgets remain on
          our servers until you delete the account.
        </p>
      </>
    ),
  },
  {
    id: "questions",
    title: "Questions",
    body: (
      <p>
        Reach the team at{" "}
        <a
          href="mailto:privacy@sarthi.ai"
          className="text-green-700 font-semibold underline underline-offset-2"
        >
          privacy@sarthi.ai
        </a>{" "}
        for any cookie or storage related question.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalDoc
      eyebrow="Legal · Cookies"
      title="Cookie Policy"
      lastUpdated="May 2026"
      intro={
        <p>
          We don&apos;t use tracking cookies. This page lists the small set of
          things Sarthi stores on your device, why, and how to clear them.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
