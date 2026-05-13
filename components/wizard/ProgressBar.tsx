// components/wizard/ProgressBar.tsx
// Thin progress indicator shared between Generate and Surprise wizards.

interface Props {
  current: number; // 1-indexed
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: Props) {
  const pct = Math.min(100, Math.max(0, ((current - 1) / (total - 1)) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold tracking-widest text-gray-500 uppercase">
        <span>
          Step {current} of {total}
        </span>
        {label && <span className="text-green-700">{label}</span>}
      </div>
      <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
