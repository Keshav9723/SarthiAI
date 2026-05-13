export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <div className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
