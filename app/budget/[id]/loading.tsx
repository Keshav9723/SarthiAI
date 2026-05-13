export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
      <div className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
