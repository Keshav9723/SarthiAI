// components/explore/ExploreCard.tsx
// Destination card used on the /explore grid. Always links to the destination
// detail page (unlike the homepage Trending card which smart-routes to an
// existing itinerary or the Generate wizard). Browsing > planning here.

import Link from "next/link";
import Image from "@/components/ui/SafeImage";
import {
  findItineraryForDestination,
  formatINRCompact,
  type Destination,
} from "@/lib/mockData";
import { ArrowRightIcon, MapPinIcon } from "@/components/ui/Icons";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import WishlistButton from "@/components/wishlist/WishlistButton";

export default function ExploreCard({
  destination,
}: {
  destination: Destination;
}) {
  const hasItinerary = !!findItineraryForDestination(destination.name);
  return (
    <div className="relative">
      <WishlistButton
        kind="destination"
        id={destination.id}
        label={destination.name}
      />
      <Link
        href={`/explore/${encodeURIComponent(destination.name)}`}
        className="group block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all overflow-hidden focus-ring"
      >
      <div className="relative h-48 w-full">
        <Image
          src={destination.image}
          alt={destination.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/95 text-gray-800">
          {destination.season}
        </span>
        {hasItinerary && (
          <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-green-600 text-white">
            Ready-made plan
          </span>
        )}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <p className="text-[10px] font-semibold tracking-widest uppercase opacity-80 flex items-center gap-1">
            <MapPinIcon size={10} />
            {destination.state}
          </p>
          <h3 className="text-xl font-bold tracking-tight">{destination.name}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600 line-clamp-2">
          {destination.description}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {destination.tags.slice(0, 3).map((t) => (
            <li
              key={t}
              className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full capitalize"
            >
              {t}
            </li>
          ))}
        </ul>
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
              From
            </p>
            <p className="text-base font-bold text-gray-900 leading-none mt-1">
              {formatINRCompact(destination.budgetFrom)}
              <span className="text-xs font-medium text-gray-500"> /person</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {destination.recommendedDuration}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 group-hover:text-green-800">
            Explore
            <ArrowRightIcon
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </span>
        </div>
      </div>
      </Link>
    </div>
  );
}
