// components/itinerary/TransportCard.tsx
// Server component — shows the cheapest practical way to get from `fromCity`
// to `destination`. Fetches flight and train quotes in parallel; renders both
// as side-by-side cards when available, falls back to a drive estimate when
// neither has airport/station coverage.

import { getFlightQuote } from "@/lib/api/flights";
import { getTrainQuote } from "@/lib/api/trains";
import { distanceBetween } from "@/lib/api/codes";
import { formatINR } from "@/lib/mockData";
import { PlaneIcon, TrainIcon, CarIcon } from "@/components/ui/Icons";

interface Props {
  fromCity: string;
  destination: string;
  passengers: number;
  /** Optional travel date. Defaults to 60 days out. */
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

export default async function TransportCard({
  fromCity,
  destination,
  passengers,
  date,
}: Props) {
  if (!fromCity || !destination) return null;
  const travelDate = date ?? defaultDate();

  // Fire both lookups in parallel — neither blocks the other.
  const [flight, train] = await Promise.all([
    getFlightQuote({
      originCity: fromCity, destinationCity: destination,
      date: travelDate, passengers: Math.max(1, passengers),
    }),
    getTrainQuote({
      originCity: fromCity, destinationCity: destination,
      date: travelDate, passengers: Math.max(1, passengers),
    }),
  ]);

  const hasFlight = flight.available && (flight.cheapest_inr ?? 0) > 0;
  const hasTrain = train.available && (train.cheapest_inr ?? 0) > 0;

  // Neither flight nor train available — try a drive estimate.
  if (!hasFlight && !hasTrain) {
    const distKm = distanceBetween(fromCity, destination);
    if (!distKm) return null;
    const hours = Math.round(distKm / 60); // ~60 km/h on Indian highways
    const fuelCost = Math.round(distKm * 8); // ₹8/km rough cab/fuel
    return (
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <header className="px-5 py-4 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100 flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-amber-100 text-amber-700">
            <CarIcon size={20} />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
              Travel by road
            </p>
            <p className="text-base font-semibold text-gray-900">
              {fromCity} <span className="text-gray-400">→</span> {destination}
            </p>
          </div>
        </header>
        <div className="p-5 grid grid-cols-3 gap-5 text-sm">
          <Stat label="Distance" value={`${distKm} km`} />
          <Stat label="Duration" value={`${hours} h`} sub="approx. drive" />
          <Stat
            label="Estimated cost"
            value={formatINR(fuelCost)}
            sub="cab + tolls"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          Getting there
        </p>
        <p className="text-xs text-gray-500">
          {fromCity} <span className="text-gray-400">→</span> {destination}
        </p>
      </div>

      <div className={`grid gap-4 ${hasFlight && hasTrain ? "md:grid-cols-2" : ""}`}>
        {hasFlight && (
          <article className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-sky-100 text-sky-700">
                <PlaneIcon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Flight</p>
                <p className="text-[11px] text-gray-500">
                  {flight.is_mock ? "Estimate"
                    : flight.source === "searchapi" ? "Live · Google Flights"
                    : "Live · Amadeus"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="From" value={flight.cheapest_inr ? formatINR(flight.cheapest_inr) : "—"} sub="per person" />
              <Stat label="Duration" value={formatDuration(flight.duration_minutes)} sub={(flight.stops ?? 0) === 0 ? "Direct" : `${flight.stops} stop${flight.stops === 1 ? "" : "s"}`} />
              <Stat label="Airlines" value={flight.airlines.length > 0 ? `${flight.airlines.length}+` : "—"} sub={flight.airlines.slice(0, 2).join(" · ") || "Multiple carriers"} />
            </div>
          </article>
        )}

        {hasTrain && (
          <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-700">
                <TrainIcon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Train</p>
                <p className="text-[11px] text-gray-500">
                  {train.is_mock ? "Estimate · IRCTC" : "Live · IRCTC"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="From" value={train.cheapest_inr ? formatINR(train.cheapest_inr) : "—"} sub="per person" />
              <Stat label="Duration" value={formatDuration(train.duration_minutes)} />
              <Stat label="Classes" value={train.classes.length > 0 ? `${train.classes.length}` : "—"} sub={train.classes.slice(0, 3).join(" · ") || "Multiple"} />
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
