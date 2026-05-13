export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 pt-12">
      <div className="h-1.5 bg-gray-100 rounded-full" />
      <div className="mt-10 h-10 w-2/3 bg-gray-200 rounded animate-pulse" />
      <div className="mt-3 h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 bg-gray-100 rounded-3xl animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
