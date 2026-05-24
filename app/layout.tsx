import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppChrome from "@/components/layout/AppChrome";
import Toaster from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sarthi — Guiding Your Indian Journey",
    template: "%s · Sarthi",
  },
  description:
    "AI-powered travel itineraries for every kind of Indian journey. Plan, surprise, and budget — all in one place.",
  keywords: [
    "India travel",
    "AI itinerary",
    "trip planner",
    "Sarthi",
    "Goa",
    "Rajasthan",
    "Manali",
    "Kerala",
  ],
  authors: [{ name: "Keshav Tanwar" }],
  openGraph: {
    title: "Sarthi — Guiding Your Indian Journey",
    description:
      "AI-powered travel itineraries for every kind of Indian journey.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D2B1D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Inline theme bootstrap — runs synchronously before paint so the
            dark class is set when CSS first applies. Prevents a light → dark
            flash on hard reloads when the user previously chose dark mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('sarthi_theme') || 'system';
                  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-cream text-gray-900 antialiased">
        <AppChrome>{children}</AppChrome>
        <Toaster />
        <ConfirmDialog />
      </body>
    </html>
  );
}
