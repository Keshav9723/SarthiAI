// components/itinerary/FlightCard.tsx
// Server component — shows a real flight price card on the itinerary page
// when we know the user's origin city. Fetches once on render via the
// SearchAPI/Amadeus-backed flight wrapper. Renders nothing when fromCity is
// empty or the route has no airport (long-haul-only display, by design).

import { getFlightQuote } from "@/lib/api/flights";
import { formatINR } from "@/lib/mockData";
import { PlaneIcon } from "@/components/ui/Icons";

interface Props {
  fromCity: string;
  destination: string;
  passengers: number;
  /** Optional travel date — defaults to 60 days out for templates. */
  date?: string;
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}

function formatDuration(min: number | null): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default async function FlightCard({
  fromCity,
  destination,
  passengers,
  date,
}: Props) {
  if (!fromCity || !destination) return null;

  const quote = await getFlightQuote({
    originCity: fromCity,
    destinationCity: destination,
    date: date ?? defaultDate(),
    passengers: Math.max(1, passengers),
  });

  // No airport mapped → driving/train trip; don't render anything.
  if (!quote.available) return null;

  const stopsLabel =
    quote.stops === 0 ? "Direct" : quote.stops === 1 ? "1 stop" : `${quote.stops} stops`;

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-sky-50 to-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-sky-100 text-sky-700">
            <PlaneIcon size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Flight options
            </p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">
              {fromCity} <span className="text-gray-400">→</span> {destination}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          {quote.is_mock ? "Estimate" : quote.source === "searchapi" ? "Live · Google" : "Live · Amadeus"}
        </span>
      </header>

      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            From
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {quote.cheapest_inr ? formatINR(quote.cheapest_inr) : "—"}
          </p>
          <p className="text-[11px] text-gray-500">per person</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            Average
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {quote.average_inr ? formatINR(quote.average_inr) : "—"}
          </p>
          <p className="text-[11px] text-gray-500">per person</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            Duration
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatDuration(quote.duration_minutes)}
          </p>
          <p className="text-[11px] text-gray-500">{stopsLabel}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
            Airlines
          </p>
          <p className="mt-1 text-sm text-gray-800 leading-tight line-clamp-2">
            {quote.airlines.length > 0 ? quote.airlines.slice(0, 3).join(" · ") : "Multiple carriers"}
          </p>
        </div>
      </div>

      {quote.is_mock && (
        <p className="px-5 pb-4 text-[11px] text-gray-500">
          Showing estimated prices — connect SearchAPI for live Google Flights data.
        </p>
      )}
    </section>
  );
}
