export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="h-10 w-1/3 bg-gray-200 rounded animate-pulse" />
      <div className="mt-2 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-7 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-72 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
