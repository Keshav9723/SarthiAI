export default function Loading() {
  return (
    <div>
      <div className="relative h-[40vh] min-h-[280px] bg-forest-950 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="h-8 w-20 bg-gray-100 rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
