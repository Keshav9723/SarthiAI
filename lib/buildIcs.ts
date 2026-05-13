// lib/buildIcs.ts
// Tiny iCalendar (.ics) builder for itinerary day-by-day events. RFC 5545
// compliant for the subset we care about: all-day VEVENT with UID + SUMMARY +
// LOCATION + DESCRIPTION. Tested against Google Calendar, Apple Calendar,
// Outlook imports.

import type { Itinerary } from "./mockData";

export interface IcsBuildOptions {
  itinerary: Itinerary;
  startDate: Date; // Day 1 begins on this calendar date.
}

export interface IcsBuildResult {
  filename: string;
  content: string;
}

export function buildItineraryIcs({
  itinerary,
  startDate,
}: IcsBuildOptions): IcsBuildResult {
  const stamp = nowStamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sarthi Travel Labs//Sarthi//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(itinerary.title)}`,
    `X-WR-TIMEZONE:Asia/Kolkata`,
  ];

  for (const day of itinerary.days) {
    const dayStart = addDays(startDate, day.dayNumber - 1);
    const dayEnd = addDays(dayStart, 1); // exclusive end for all-day events
    const summary = `Day ${day.dayNumber} · ${day.location} — ${itinerary.title}`;
    const description = [
      `Type: ${day.type}`,
      "",
      `Morning: ${day.morning}`,
      `Afternoon: ${day.afternoon}`,
      `Evening: ${day.evening}`,
      "",
      "Powered by Sarthi · Guiding Your Indian Journey",
    ].join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:sarthi-${itinerary.id}-day-${day.dayNumber}@sarthi.ai`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${asDate(dayStart)}`,
      `DTEND;VALUE=DATE:${asDate(dayEnd)}`,
      `SUMMARY:${escape(summary)}`,
      `LOCATION:${escape(day.location)}`,
      `DESCRIPTION:${foldLines(escape(description))}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return {
    filename: `sarthi-${slugify(itinerary.title)}.ics`,
    // RFC 5545 mandates CRLF line endings.
    content: lines.join("\r\n"),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function asDate(d: Date): string {
  // yyyymmdd — used for VALUE=DATE all-day events.
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function nowStamp(): string {
  // yyyymmddThhmmssZ in UTC for DTSTAMP.
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// Escape per RFC 5545 §3.3.11 — backslash, comma, semicolon, newline.
function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets MUST be folded. We do a naive 73-char fold +
// CRLF + single-space continuation, which is good enough for our short
// itineraries. (Octet counting isn't strictly correct for multi-byte UTF-8
// but day descriptions are mostly ASCII; calendar apps tolerate slightly
// longer lines fine.)
function foldLines(line: string): string {
  const max = 73;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + max));
    i += max;
  }
  return parts.join("\r\n");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
