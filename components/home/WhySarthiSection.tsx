// components/home/WhySarthiSection.tsx
// Compact trust-signal strip. Each stat gets a tinted icon + a big number,
// rendered against a cream background so it visually sits between the white
// Trending rail above and the dark Ask-Sarthi spotlight below.

import {
  SparklesIcon,
  WalletIcon,
  MapPinIcon,
  HeartIcon,
} from "@/components/ui/Icons";

interface Stat {
  label: string;
  value: string;
  note: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}

const STATS: Stat[] = [
  {
    label: "AI-Powered",
    value: "100%",
    note: "AI-tuned plans",
    Icon: SparklesIcon,
    accent: "bg-green-50 text-green-700",
  },
  {
    label: "Real-Time Prices",
    value: "Live",
    note: "Flights & hotels in INR",
    Icon: WalletIcon,
    accent: "bg-saffron-50 text-saffron-600",
  },
  {
    label: "Destinations",
    value: "50+",
    note: "Across every Indian state",
    Icon: MapPinIcon,
    accent: "bg-violet-50 text-violet-700",
  },
  {
    label: "Forever",
    value: "Free",
    note: "No hidden fees, no commissions",
    Icon: HeartIcon,
    accent: "bg-rose-50 text-rose-600",
  },
];

export default function WhySarthiSection() {
  return (
    <section className="py-16 px-4 md:px-8 bg-cream">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Why Sarthi
          </p>
          <h2 className="mt-1 text-2xl md:text-4xl font-bold tracking-tight text-gray-900">
            India&apos;s smartest way to plan a trip
          </h2>
          <p className="mt-2 text-gray-500">
            Built around the way India actually moves — weather, IRCTC,
            permits, prices.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="group rounded-2xl bg-white border border-gray-100 p-6 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <span
                className={`grid place-items-center w-11 h-11 rounded-2xl ${s.accent} group-hover:scale-105 transition-transform`}
              >
                <s.Icon size={20} />
              </span>
              <p className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {s.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
