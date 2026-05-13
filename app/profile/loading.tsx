export default function Loading() {
  return (
    <div>
      <div className="h-56 bg-gray-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-12 relative z-10">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
