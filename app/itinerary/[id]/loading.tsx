// app/itinerary/[id]/loading.tsx

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-3 h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
      <div className="mt-6 grid grid-cols-12 gap-3 h-[320px] md:h-[380px]">
        <div className="col-span-6 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="col-span-3 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="col-span-3 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <div className="mt-8 grid grid-cols-[1fr_360px] gap-8">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
