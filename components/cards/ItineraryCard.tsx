// components/cards/ItineraryCard.tsx
// Card used by Homepage "Recently Generated" rail and My Itineraries grid.

import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import { formatINR, type Itinerary } from "@/lib/mockData";
import { MapPinIcon, ArrowRightIcon } from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import WishlistButton from "@/components/wishlist/WishlistButton";

const GROUP_BADGE: Record<Itinerary["groupType"], string> = {
  family: "bg-saffron-50 text-saffron-600 border-saffron-100",
  friends: "bg-sky-50 text-sky-700 border-sky-100",
  couple: "bg-rose-50 text-rose-700 border-rose-100",
  solo: "bg-violet-50 text-violet-700 border-violet-100",
};

interface Props {
  itinerary: Itinerary;
  variant?: "rail" | "grid";
  showFromBadge?: boolean;
}

export default function ItineraryCard({
  itinerary,
  variant = "rail",
  showFromBadge = true,
}: Props) {
  // Rail variant lives in a horizontally-scrolling flex row where flex-stretch
  // is unreliable (the `overflow-x-auto` parent + nested flex chain can break
  // the chain). An explicit min-h guarantees every card in the rail starts at
  // the same height regardless of how many highlight pills wrap.
  const widthClass =
    variant === "rail"
      ? "w-[320px] md:w-[360px] shrink-0 min-h-[420px]"
      : "w-full";

  return (
    // `h-full flex flex-col` makes the card fill its grid/flex parent so
    // multiple cards on one row line up; `mt-auto` on the price block sticks
    // it to the bottom regardless of content length.
    <article
      className={`${widthClass} h-full flex flex-col relative bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden`}
    >
      <WishlistButton
        kind="itinerary"
        id={itinerary.id}
        label={itinerary.title}
      />
      <Link
        href={`/itinerary/${itinerary.id}`}
        className="flex-1 flex flex-col group"
      >
        <div className="relative h-44 w-full overflow-hidden shrink-0">
          <Image
            src={itinerary.image}
            alt={itinerary.title}
            fill
            sizes="(max-width: 768px) 320px, 360px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span
            className={`absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full border ${GROUP_BADGE[itinerary.groupType]}`}
          >
            {itinerary.groupType}
          </span>
          {showFromBadge && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-xs text-white/95 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <MapPinIcon size={12} />
              From {itinerary.fromCity} · {itinerary.postedAgo}
            </span>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-base text-gray-900 line-clamp-1 group-hover:text-green-700 transition-colors">
              {itinerary.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1">
              {itinerary.duration} · {itinerary.weather}
            </p>
          </div>

          <ul className="flex flex-wrap gap-1.5">
            {itinerary.highlights.slice(0, 2).map((h) => (
              <li
                key={h}
                className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full"
              >
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                From
              </p>
              <p className="text-base font-bold text-gray-900">
                {formatINR(itinerary.pricePerPerson)}
                <span className="text-xs font-medium text-gray-500"> /person</span>
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 group-hover:text-green-800">
              View Details
              <ArrowRightIcon
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
