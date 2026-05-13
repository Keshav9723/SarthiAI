export default function Loading() {
  return (
    <div>
      <div className="bg-forest-950 h-64 animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        <div className="aspect-[16/9] bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-100 rounded animate-pulse"
            style={{ width: `${80 + (i % 3) * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
}
