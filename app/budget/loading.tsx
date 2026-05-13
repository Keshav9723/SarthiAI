export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse" />
      <div className="mt-2 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
