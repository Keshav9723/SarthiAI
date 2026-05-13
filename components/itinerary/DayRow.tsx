"use client";

// components/itinerary/DayRow.tsx
// PickYourTrail-style day row. Every text slot is inline-editable via the
// EditableSlot component — see lib/useItineraryEdits for persistence.

import {
  SunriseIcon,
  SunsetIcon,
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

export default function DayRow({ day, itineraryId }: Props) {
  const isFullDay =
    day.type === "FULL DAY" || day.type === "ARRIVAL" || day.type === "DEPARTURE";
  const labelByType: Record<ItineraryDay["type"], string> = {
    ARRIVAL: "ARRIVAL",
    "FULL DAY": "FULL DAY",
    DEPARTURE: "DEPARTURE",
    TRANSIT: "TRANSIT",
  };

  const { get, setEdit, clearEdit } = useItineraryEdits(itineraryId);
  const morning = get(day.dayNumber, "morning", day.morning);
  const afternoon = get(day.dayNumber, "afternoon", day.afternoon);
  const evening = get(day.dayNumber, "evening", day.evening);
  // For non-FULL-DAY rows we render "Noon → Evening" as a combined block, so
  // we treat the afternoon slot as the canonical edit target.
  const combined = `${afternoon} · ${evening}`;

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
          {labelByType[day.type]}
        </span>
      </div>

      {/* Activity column(s) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0">
        <EditableSlot
          icon={<SunriseIcon size={16} className="text-saffron-500" />}
          label="MORNING"
          original={day.morning}
          value={morning}
          isEdited={morning !== day.morning}
          onSave={(t) => setEdit(day.dayNumber, "morning", t)}
          onReset={() => clearEdit(day.dayNumber, "morning")}
        />
        <div className="hidden md:block w-px bg-gray-100 mx-6" />
        {isFullDay ? (
          <EditableSlot
            icon={<SunsetIcon size={16} className="text-saffron-600" />}
            label="NOON TO EVENING"
            original={`${day.afternoon} · ${day.evening}`}
            value={combined}
            isEdited={
              afternoon !== day.afternoon || evening !== day.evening
            }
            onSave={(t) => {
              // The user edits the combined block as a single string; we
              // persist it as the afternoon slot and blank-out the evening
              // override so we don't render the original evening suffix again.
              setEdit(day.dayNumber, "afternoon", t);
              setEdit(day.dayNumber, "evening", "");
            }}
            onReset={() => {
              clearEdit(day.dayNumber, "afternoon");
              clearEdit(day.dayNumber, "evening");
            }}
          />
        ) : (
          <button
            type="button"
            className="text-left flex items-start gap-3 text-green-700 hover:text-green-800 transition-colors"
          >
            <PlusIcon size={16} className="mt-1 shrink-0" />
            <span>
              <span className="text-[10px] font-semibold tracking-widest uppercase block text-gray-400">
                Noon to evening
              </span>
              <span className="font-semibold inline-flex items-center gap-1">
                At leisure. Add Activity
                <ArrowRightIcon size={14} />
              </span>
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
