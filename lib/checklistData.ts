// lib/checklistData.ts
// Default checklist template, plus per-destination add-ons. Built so we can
// surface India-specific items (Inner Line Permits for Ladakh, the Rohtang
// permit caveat for Manali) when the trip touches those states.

import type { Itinerary } from "./mockData";

export interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

// ---------------------------------------------------------------------------
// Generic sections — apply to every Indian domestic trip
// ---------------------------------------------------------------------------

const DOCUMENTS: ChecklistSection = {
  id: "documents",
  title: "Documents",
  icon: "🪪",
  items: [
    {
      id: "doc-id",
      label: "Government-issued ID (Aadhaar / DL / passport)",
      hint: "Carry one digital + one physical copy.",
    },
    {
      id: "doc-tickets",
      label: "Flight / train e-tickets",
      hint: "PNR saved offline in case of network drop.",
    },
    {
      id: "doc-hotel",
      label: "Hotel bookings confirmation",
    },
    {
      id: "doc-insurance",
      label: "Travel insurance policy",
      hint: "Recommended for trekking, scuba, or multi-state circuits.",
    },
    {
      id: "doc-emergency",
      label: "Emergency contacts saved offline",
    },
  ],
};

const CURRENCY: ChecklistSection = {
  id: "currency",
  title: "Money",
  icon: "💸",
  items: [
    {
      id: "money-cash",
      label: "Cash for remote spots",
      hint: "Card networks fail at toll booths and small dhabas.",
    },
    {
      id: "money-upi",
      label: "UPI working on your primary number",
      hint: "GPay / PhonePe / Paytm — keep at least one as backup.",
    },
    {
      id: "money-cards",
      label: "International card unlocked",
      hint: "If your bank disables online transactions by default.",
    },
    {
      id: "money-notify",
      label: "Notify bank of travel dates",
    },
  ],
};

const CONNECTIVITY: ChecklistSection = {
  id: "connectivity",
  title: "Connectivity",
  icon: "📶",
  items: [
    {
      id: "conn-roaming",
      label: "Check carrier roaming for destination state",
      hint: "Jio and Airtel cover most spots; BSNL for remote NE/Andaman.",
    },
    {
      id: "conn-esim",
      label: "Set up e-SIM if travelling international",
      hint: "Airalo, Jio International, or Holafly for short trips.",
    },
    {
      id: "conn-offline-maps",
      label: "Download offline Google Maps for each city",
    },
    {
      id: "conn-itinerary",
      label: "Save Sarthi itinerary as PDF",
      hint: "Tap Share & Export → Download PDF on your itinerary page.",
    },
  ],
};

const HEALTH: ChecklistSection = {
  id: "health",
  title: "Health & safety",
  icon: "🩹",
  items: [
    {
      id: "health-meds",
      label: "Prescription medication for entire trip + buffer days",
    },
    {
      id: "health-firstaid",
      label: "Basic first-aid kit",
      hint: "Bandaids, antiseptic, paracetamol, ORS, anti-diarrheal.",
    },
    {
      id: "health-sunscreen",
      label: "SPF 50+ sunscreen",
    },
    {
      id: "health-bug",
      label: "Mosquito repellent",
      hint: "Critical for Northeast, Kerala backwaters, Andaman.",
    },
  ],
};

const PACK: ChecklistSection = {
  id: "pack",
  title: "Pack list",
  icon: "🎒",
  items: [
    { id: "pack-clothes", label: "Clothes for the local climate" },
    { id: "pack-shoes", label: "Comfortable walking shoes" },
    { id: "pack-charger", label: "Phone charger + power bank" },
    { id: "pack-adapter", label: "Universal charger / multi-pin adapter" },
    { id: "pack-bottle", label: "Reusable water bottle" },
    { id: "pack-bag", label: "Day bag for sightseeing" },
  ],
};

// ---------------------------------------------------------------------------
// Destination-specific add-on sections
// ---------------------------------------------------------------------------

const LADAKH_ADDON: ChecklistSection = {
  id: "ladakh",
  title: "Ladakh-specific",
  icon: "🏔️",
  items: [
    {
      id: "ladakh-permit",
      label: "Inner Line Permit for Nubra, Pangong, Tso Moriri",
      hint: "Available online at lahdclehpermit.in or through your hotel.",
    },
    {
      id: "ladakh-diamox",
      label: "Discuss Diamox (acetazolamide) with your doctor",
      hint: "Start the morning of your flight in — helps 70% of travellers.",
    },
    {
      id: "ladakh-rest",
      label: "Block off Day 1 for rest at Leh — no excursions",
      hint: "Skipping this is the #1 cause of AMS on Ladakh trips.",
    },
    {
      id: "ladakh-warm",
      label: "Heavy thermals + windproof jacket",
      hint: "Even in summer, Khardung La drops below freezing.",
    },
  ],
};

const HIMACHAL_ADDON: ChecklistSection = {
  id: "himachal",
  title: "Himachal-specific",
  icon: "❄️",
  items: [
    {
      id: "hp-rohtang",
      label: "Rohtang Pass permit if applicable",
      hint: "Limited daily quota — book on rohtangpermits.nic.in.",
    },
    {
      id: "hp-snowwear",
      label: "Snow gear (boots, gloves, jacket)",
      hint: "Solang has rentals from ₹400/day if you'd rather not pack it.",
    },
    {
      id: "hp-roads",
      label: "Check NH-3 / Atal Tunnel road status",
      hint: "Closures common Dec–Mar after heavy snowfall.",
    },
  ],
};

const ANDAMAN_ADDON: ChecklistSection = {
  id: "andaman",
  title: "Andaman-specific",
  icon: "🌊",
  items: [
    {
      id: "and-ferry",
      label: "Book Makruzz / Green Ocean ferries in advance",
      hint: "Same-day ferry tickets often sell out in peak season.",
    },
    {
      id: "and-scuba",
      label: "Confirm dive school PADI credentials",
      hint: "Recommended: Barefoot Scuba or DIVEIndia at Havelock.",
    },
    {
      id: "and-bsnl",
      label: "Activate BSNL/Airtel — Jio is patchy",
    },
    {
      id: "and-cash",
      label: "Extra cash — Neil Island ATMs are unreliable",
    },
  ],
};

const KERALA_ADDON: ChecklistSection = {
  id: "kerala",
  title: "Kerala-specific",
  icon: "🛶",
  items: [
    {
      id: "kerala-houseboat",
      label: "Confirm houseboat check-in time",
      hint: "Most boats board at noon and disembark by 9am next day.",
    },
    {
      id: "kerala-cash",
      label: "Cash for spice plantation + small restaurants",
    },
    {
      id: "kerala-rain",
      label: "Light rain jacket even outside monsoon",
      hint: "Munnar and Wayanad get unpredictable showers year-round.",
    },
  ],
};

const NORTHEAST_ADDON: ChecklistSection = {
  id: "northeast",
  title: "Northeast-specific",
  icon: "🌿",
  items: [
    {
      id: "ne-ilp",
      label: "ILP for Arunachal / Nagaland / Mizoram",
      hint: "Required for non-resident Indians + foreigners. Apply 7 days ahead.",
    },
    {
      id: "ne-leech",
      label: "Leech socks for forest treks",
      hint: "Living root bridge hike in monsoon especially.",
    },
    {
      id: "ne-mosquito",
      label: "Strong DEET-based mosquito repellent",
    },
  ],
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const BASE: ChecklistSection[] = [
  DOCUMENTS,
  CURRENCY,
  CONNECTIVITY,
  HEALTH,
  PACK,
];

/**
 * Returns the full checklist for an itinerary, layering on destination
 * add-ons based on the trip's state/location strings.
 */
export function buildChecklist(itinerary: Itinerary): ChecklistSection[] {
  const haystack =
    `${itinerary.state} ${itinerary.destination} ${itinerary.title}`.toLowerCase();

  const extras: ChecklistSection[] = [];
  if (haystack.includes("ladakh") || haystack.includes("leh")) {
    extras.push(LADAKH_ADDON);
  }
  if (
    haystack.includes("manali") ||
    haystack.includes("himachal") ||
    haystack.includes("kasol") ||
    haystack.includes("shimla")
  ) {
    extras.push(HIMACHAL_ADDON);
  }
  if (haystack.includes("andaman") || haystack.includes("havelock")) {
    extras.push(ANDAMAN_ADDON);
  }
  if (
    haystack.includes("kerala") ||
    haystack.includes("alleppey") ||
    haystack.includes("munnar")
  ) {
    extras.push(KERALA_ADDON);
  }
  if (
    haystack.includes("assam") ||
    haystack.includes("meghalaya") ||
    haystack.includes("kaziranga") ||
    haystack.includes("shillong") ||
    haystack.includes("cherrapunji")
  ) {
    extras.push(NORTHEAST_ADDON);
  }

  // Destination add-ons appear before generic Pack list to keep them visible.
  return [...BASE.slice(0, 4), ...extras, PACK];
}
