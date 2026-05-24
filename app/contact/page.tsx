// app/contact/page.tsx — contact form + alt channels.

import Link from "next/link";
import ContactForm from "@/components/contact/ContactForm";
import {
  MailIcon,
  TwitterIcon,
  InstagramIcon,
  CompassIcon,
} from "@/components/ui/Icons";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the Sarthi team.",
};

const CHANNELS = [
  {
    icon: MailIcon,
    label: "Email us",
    value: "sarthiai18@gmail.com",
    href: "mailto:sarthiai18@gmail.com",
  },
  {
    icon: TwitterIcon,
    label: "On Twitter",
    value: "@sarthi_travel",
    href: "https://twitter.com",
  },
  {
    icon: InstagramIcon,
    label: "On Instagram",
    value: "@sarthi.travel",
    href: "https://www.instagram.com/keshavtanwar20/",
  },
];

export default function ContactPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-forest-950 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm">
            <CompassIcon size={14} />
            Contact
          </span>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Tell us what you need.
          </h1>
          <p className="mt-3 text-white/80 text-lg max-w-2xl">
            Bug, idea, trip stuck somewhere — we read every message and
            usually reply within a business day.
          </p>
        </div>
      </section>

      {/* Form + channels */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Send us a message
          </h2>
          <p className="mt-2 text-gray-600">
            Fill in the form — Sarthi-the-bot pings the on-call human.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 self-start">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-card p-6">
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Other ways to reach us
            </p>
            <ul className="mt-4 space-y-3">
              {CHANNELS.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      c.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex items-center gap-3 group"
                  >
                    <span className="grid place-items-center w-10 h-10 rounded-full bg-green-50 text-green-700 shrink-0">
                      <c.icon size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        {c.label}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {c.value}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-saffron-500 to-saffron-600 text-white p-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/80">
              In a hurry?
            </p>
            <h3 className="mt-2 text-lg font-bold tracking-tight">
              Try Ask Sarthi
            </h3>
            <p className="mt-1 text-sm text-white/85">
              The floating widget bottom-right knows your trip and answers in
              under a second.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline underline-offset-2"
            >
              Back to home →
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
