export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-4">
      <div className="h-44 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="h-72 bg-gray-100 rounded-3xl animate-pulse" />
      <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );
}
