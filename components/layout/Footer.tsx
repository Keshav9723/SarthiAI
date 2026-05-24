// components/layout/Footer.tsx
// Dark-green footer matching the brand. Three columns on desktop:
// logo + tagline | quick links | social. Collapses to single column on mobile.

import Link from "next/link";
import {
  CompassIcon,
  InstagramIcon,
  XLogoIcon,
  FacebookIcon,
  YoutubeIcon,
  MailIcon,
} from "@/components/ui/Icons";

const PRODUCT_LINKS = [
  { href: "/explore", label: "Explore Destinations" },
  { href: "/generate", label: "Generate Itinerary" },
  { href: "/surprise", label: "Surprise Me" },
  { href: "/my-itineraries", label: "My Itineraries" },
  { href: "/budget", label: "Budget Planner" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About Sarthi" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const SOCIAL_LINKS = [
  { href: "https://x.com/ParthVashisht7", label: "X (Twitter)", Icon: XLogoIcon },
  { href: "https://www.instagram.com/keshavtanwar20/", label: "Instagram", Icon: InstagramIcon },
  { href: "https://facebook.com", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.youtube.com/@fragger9723", label: "YouTube", Icon: YoutubeIcon },
];

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-forest-100 print:hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand block */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 group focus-ring rounded-lg -mx-1 px-1 py-1"
            >
              <span className="grid place-items-center w-10 h-10 rounded-full bg-white/10 text-white group-hover:bg-green-600 transition-colors">
                <CompassIcon size={22} strokeWidth={2} />
              </span>
              <span className="text-2xl font-bold tracking-tight text-white">
                Sarthi
              </span>
            </Link>
            <p className="mt-4 text-forest-200 leading-relaxed max-w-sm">
              Guiding Your Indian Journey. AI-powered itineraries for every
              kind of traveller — built around weather, budgets and the way
              India actually moves.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-forest-300">
              <span className="w-2 h-2 rounded-full bg-saffron-500 animate-pulse" />
              Built for India, by India 🇮🇳
            </p>
          </div>

          {/* Product */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold tracking-widest text-forest-300 uppercase">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-forest-100 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold tracking-widest text-forest-300 uppercase">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-forest-100 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold tracking-widest text-forest-300 uppercase">
              Connect
            </h3>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid place-items-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 text-forest-100 hover:text-white transition-colors"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
            <a
              href="mailto:sarthiai18@gmail.com"
              className="mt-4 inline-flex items-center gap-2 text-sm text-forest-200 hover:text-white transition-colors"
            >
              <MailIcon size={16} />
              sarthiai18@gmail.co
            </a>
          </div>
        </div>

        {/* Bottom legal strip — hidden for now per design feedback.
            Uncomment when copyright + legal links are needed again.
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs text-forest-300">
            © {new Date().getFullYear()} Sarthi Travel Labs · A NorthCap
            University major project ·
          </p>
          <div className="flex items-center gap-5 text-xs text-forest-300">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>
        */}
      </div>
    </footer>
  );
}
