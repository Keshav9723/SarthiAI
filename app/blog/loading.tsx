export default function Loading() {
  return (
    <div>
      <div className="bg-forest-950 h-56" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
