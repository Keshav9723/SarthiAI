// app/loading.tsx — global route-level skeleton.

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="h-10 w-2/3 bg-gray-200 rounded-lg animate-pulse" />
      <div className="mt-3 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-64 bg-gray-100 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
