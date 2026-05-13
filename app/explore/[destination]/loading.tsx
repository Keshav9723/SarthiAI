export default function Loading() {
  return (
    <div>
      <div className="relative h-[55vh] min-h-[420px] bg-forest-950 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-4">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-64 bg-gray-100 rounded-3xl animate-pulse" />
      </div>
    </div>
  );
}
