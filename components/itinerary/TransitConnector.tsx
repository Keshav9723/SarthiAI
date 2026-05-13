// components/itinerary/TransitConnector.tsx
// The dotted vertical line + transfer-mode icon + label that connects two
// location groups in the day grid (e.g. "Get transferred from Delhi to Agra
// by train").

import {
  TrainIcon,
  PlaneIcon,
  CarIcon,
} from "@/components/ui/Icons";
import type { RouteStop } from "@/lib/mockData";

interface Props {
  transfer: NonNullable<RouteStop["transferToNext"]>;
}

export default function TransitConnector({ transfer }: Props) {
  const Icon =
    transfer.mode === "train"
      ? TrainIcon
      : transfer.mode === "flight"
        ? PlaneIcon
        : CarIcon;

  return (
    <div className="flex items-center gap-4 py-5 my-1">
      <div className="flex flex-col items-center w-[88px] shrink-0">
        <span
          aria-hidden
          className="w-px h-5 border-l-2 border-dotted border-gray-300"
        />
        <span className="grid place-items-center w-10 h-10 rounded-full bg-white border-2 border-gray-200 text-gray-700">
          <Icon size={18} />
        </span>
        <span
          aria-hidden
          className="w-px h-5 border-l-2 border-dotted border-gray-300"
        />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Transit · {transfer.duration}
        </p>
        <p className="mt-1 text-sm md:text-[15px] text-gray-800 leading-snug">
          {transfer.label}
        </p>
      </div>
    </div>
  );
}
