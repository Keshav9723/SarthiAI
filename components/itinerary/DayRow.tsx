"use client";

// components/itinerary/DayRow.tsx
// PickYourTrail-style day row. Renders THREE separate slots (morning,
// afternoon, evening), each inline-editable via EditableSlot. Travel-related
// text gets a transport icon instead of the time-of-day icon so transit days
// stand out.

import {
  SunriseIcon,
  SunIcon,
  MoonIcon,
  PlaneIcon,
  TrainIcon,
  CarIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import EditableSlot from "./EditableSlot";
import { useItineraryEdits } from "@/lib/useItineraryEdits";
import type { ItineraryDay } from "@/lib/mockData";

interface Props {
  day: ItineraryDay;
  itineraryId: string;
}

// Map lowercase LLM-output types and legacy uppercase types to display labels.
function dayLabel(type: string | undefined | null): string {
  if (!type) return "DAY";
  const t = String(type).toUpperCase();
  if (t === "ARRIVAL") return "ARRIVAL";
  if (t === "DEPARTURE") return "DEPARTURE";
  if (t === "TRANSIT" || t === "TRANSFER") return "TRANSIT";
  if (t === "FULL DAY" || t === "EXPLORE" || t === "RELAX" || t === "ADVENTURE"
      || t === "CULTURAL" || t === "FOOD") return "FULL DAY";
  return "DAY";
}

// Detect travel-mode words in a slot's text and return the right transport
// icon. Returns null if the slot is not about travel.
type Mode = "flight" | "train" | "car" | null;
function detectTravelMode(text: string): Mode {
  const t = text.toLowerCase();
  if (/(fly to|flight|airport|airline|board the plane|fly back)/.test(t)) return "flight";
  if (/(train|railway|station|board the train|by rail|sleeper class|ac class)/.test(t)) return "train";
  if (/(drive|road trip|cab|taxi|by bus|by car|hire a (cab|car|taxi)|road to|by road)/.test(t)) return "car";
  if (/(depart from|arrive in|arrival in|transfer to|head to|leave for|reach )/.test(t)) return "car";
  return null;
}

function TransportIcon({ mode, className }: { mode: Mode; className?: string }) {
  if (mode === "flight") return <PlaneIcon size={16} className={className} />;
  if (mode === "train") return <TrainIcon size={16} className={className} />;
  return <CarIcon size={16} className={className} />;
}

// Slot definitions — labels + colors + suggested time + default time-of-day
// icon. Travel icons override the default when the content describes movement.
const SLOTS = [
  {
    key: "morning" as const,
    label: "MORNING",
    timeHint: "9:00 AM",
    Icon: SunriseIcon,
    color: "text-amber-500",
    bubbleBg: "bg-amber-50",
  },
  {
    key: "afternoon" as const,
    label: "AFTERNOON",
    timeHint: "2:00 PM",
    Icon: SunIcon,
    color: "text-sky-500",
    bubbleBg: "bg-sky-50",
  },
  {
    key: "evening" as const,
    label: "EVENING",
    timeHint: "6:00 PM",
    Icon: MoonIcon,
    color: "text-indigo-500",
    bubbleBg: "bg-indigo-50",
  },
];

export default function DayRow({ day, itineraryId }: Props) {
  const { get, setEdit, clearEdit } = useItineraryEdits(itineraryId);
  const values = {
    morning: get(day.dayNumber, "morning", day.morning),
    afternoon: get(day.dayNumber, "afternoon", day.afternoon),
    evening: get(day.dayNumber, "evening", day.evening),
  };
  const originals = {
    morning: day.morning,
    afternoon: day.afternoon,
    evening: day.evening,
  };

  return (
    <article className="grid grid-cols-1 md:grid-cols-[88px_1fr] gap-4 md:gap-6 py-6 border-b border-gray-100 last:border-b-0">
      {/* Day label column */}
      <div className="flex md:flex-col md:items-start items-center gap-2">
        <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
          Day
        </span>
        <span className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-none">
          {String(day.dayNumber).padStart(2, "0")}
        </span>
        <span className="hidden md:inline-block mt-2 text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
          {dayLabel(day.type)}
        </span>
      </div>

      {/* Activity column: three stacked slots */}
      <div className="flex flex-col gap-5">
        {SLOTS.map(({ key, label, timeHint, Icon, color, bubbleBg }) => {
          const value = values[key];
          const original = originals[key];
          const hasContent = value && value.trim().length > 0;
          const travelMode = hasContent ? detectTravelMode(value) : null;
          const slotBubble = travelMode ? "bg-rose-50" : bubbleBg;

          return (
            <div key={key}>
              {hasContent ? (
                <EditableSlot
                  icon={
                    travelMode ? (
                      <TransportIcon mode={travelMode} className="text-rose-500" />
                    ) : (
                      <Icon size={18} className={color} />
                    )
                  }
                  label={label}
                  timeHint={timeHint}
                  bubbleBg={slotBubble}
                  locationHint={day.location}
                  original={original}
                  value={value}
                  isEdited={value !== original}
                  onSave={(t) => setEdit(day.dayNumber, key, t)}
                  onReset={() => clearEdit(day.dayNumber, key)}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <span className={`grid place-items-center w-9 h-9 rounded-full ${bubbleBg} shrink-0`}>
                    <Icon size={18} className={`${color} opacity-40`} />
                  </span>
                  <button
                    type="button"
                    className="text-left flex-1 text-gray-500 hover:text-green-700 transition-colors"
                  >
                    <span className="text-[10px] font-semibold tracking-widest uppercase block text-gray-400">
                      {label} · {timeHint}
                    </span>
                    <span className="mt-0.5 font-semibold inline-flex items-center gap-1 text-sm">
                      <PlusIcon size={14} />
                      At leisure. Add an activity
                      <ArrowRightIcon size={14} />
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
