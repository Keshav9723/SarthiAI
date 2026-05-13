// components/itinerary/LocationGroupHeader.tsx
// Mint-green bar header that groups consecutive days in the same city.

import { MapPinIcon } from "@/components/ui/Icons";

interface Props {
  city: string;
  nights: number;
}

export default function LocationGroupHeader({ city, nights }: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-50 border border-green-100 text-green-900">
      <MapPinIcon size={18} className="text-green-700 shrink-0" />
      <h3 className="font-semibold tracking-tight text-base md:text-lg">
        {city}{" "}
        <span className="font-normal text-green-700">
          — {nights} Night{nights !== 1 ? "s" : ""}
        </span>
      </h3>
    </div>
  );
}
