// components/cards/DestinationCard.tsx
// Destination tile used by Homepage "Trending Destinations" rail. Dark overlay
// with name in bottom-left, matching the PickYourTrail design language.

import Link from "next/link";
import Image from "next/image";
import {
  destinationHref,
  findItineraryForDestination,
  formatINRCompact,
  type Destination,
} from "@/lib/mockData";
import { BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import WishlistButton from "@/components/wishlist/WishlistButton";

interface Props {
  destination: Destination;
  variant?: "tall" | "square";
}

export default function DestinationCard({
  destination,
  variant = "tall",
}: Props) {
  const sizeClass =
    variant === "tall"
      ? "w-[260px] md:w-[300px] h-[380px]"
      : "w-full aspect-[4/5]";

  // If we already have a pre-baked itinerary for this destination, skip the
  // wizard and link straight to the trip view.
  const existing = findItineraryForDestination(destination.name);

  return (
    <div className={`${sizeClass} shrink-0 relative rounded-2xl overflow-hidden group`}>
      <WishlistButton
        kind="destination"
        id={destination.id}
        label={destination.name}
      />
      <Link
        href={destinationHref(destination.name)}
        className="block w-full h-full focus-ring rounded-2xl"
      >
      <Image
        src={destination.image}
        alt={destination.name}
        fill
        sizes="(max-width: 768px) 260px, 300px"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

      {existing && (
        <span className="absolute top-3 left-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-green-600 text-white">
          Ready-made plan
        </span>
      )}
      <span className="absolute top-14 right-3 text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/90 text-gray-800 backdrop-blur-sm">
        {destination.season}
      </span>

      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <p className="text-[10px] font-semibold tracking-widest uppercase opacity-80">
          {destination.state}
        </p>
        <h3 className="mt-0.5 text-2xl font-bold tracking-tight">
          {destination.name}
        </h3>
        <p className="text-sm text-white/85 mt-0.5 line-clamp-1">
          {destination.tagline}
        </p>
        <p className="mt-3 text-xs text-white/80">
          From{" "}
          <span className="font-semibold text-white">
            {formatINRCompact(destination.budgetFrom)}
          </span>{" "}
          · {destination.recommendedDuration}
        </p>
      </div>
      </Link>
    </div>
  );
}
