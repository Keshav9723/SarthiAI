// lib/mockData.ts
// Sarthi — AI India Travel Planner
// Single source of truth for all hardcoded mock data. Imported by every page,
// the global ChatWidget, and all card/list components. Swap this out for real
// API + Supabase calls when the backend is wired up.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupType = "couple" | "family" | "friends" | "solo";

export type ActivityBlock =
  | "ARRIVAL"
  | "FULL DAY"
  | "DEPARTURE"
  | "TRANSIT";

export type TransferMode = "train" | "flight" | "car" | "bus";

export interface ItineraryDay {
  dayNumber: number;
  location: string;
  morning: string;
  afternoon: string;
  evening: string;
  type: ActivityBlock;
}

export interface RouteStop {
  city: string;
  nights: number;
  transferToNext?: {
    mode: TransferMode;
    label: string; // e.g. "Get transferred from Delhi to Agra by train"
    duration: string;
  };
}

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  state: string;
  duration: string;
  nights: number;
  totalDays: number;
  groupType: GroupType;
  groupSize: number;
  image: string;
  gallery: string[];
  totalBudget: number;
  pricePerPerson: number;
  highlights: string[];
  weather: string;
  weatherIcon: string;
  savedAt: string;
  status: "upcoming" | "past" | "draft";
  fromCity: string;
  postedAgo: string;
  route: RouteStop[];
  inclusions: string[];
  exclusions: string[];
  days: ItineraryDay[];
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  tagline: string;
  description: string;
  image: string;
  gallery: string[];
  tags: string[];
  bestFor: GroupType[];
  season: string;
  bestMonths: string[];
  budgetFrom: number;
  recommendedDuration: string;
  weather: string;
  temperature: string;
}

export interface DestinationMatch extends Destination {
  matchScore: number;
  matchReasons: string[];
  estimatedBudget: number;
  weatherSummary: string;
}

export interface DepartureCity {
  city: string;
  airportCode: string;
  state: string;
}

export interface BudgetExpense {
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface BudgetCategory {
  id: string;
  label: string;
  icon: string;
  planned: number;
  spent: number;
  expenses: BudgetExpense[];
}

export interface Budget {
  id: string;
  itineraryId: string | null;
  name: string;
  tripImage?: string;
  tripDates?: string;
  totalPlanned: number;
  totalSpent: number;
  categories: BudgetCategory[];
  createdAt: string;
}

export interface Package {
  id: string;
  title: string;
  destination: string;
  duration: string;
  durationBucket: "short" | "mid" | "long";
  pricePerPerson: number;
  image: string;
  highlights: string[];
  groupType: GroupType;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  quote: string;
  trip: string;
  avatar: string;
}

export interface VibeOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
  gradient: string;
}

export interface InterestChip {
  id: string;
  label: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

export interface User {
  name: string;
  email: string;
  avatar?: string;
}

export type PageContext =
  | "home"
  | "explore"
  | "generate"
  | "surprise"
  | "itinerary"
  | "budget"
  | "auth"
  | "my-itineraries"
  | "default";

// ---------------------------------------------------------------------------
// Default user (matches localStorage shape used by /auth)
// ---------------------------------------------------------------------------

export const DEFAULT_USER: User = {
  name: "Keshav",
  email: "keshav@sarthi.ai",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
};

// ---------------------------------------------------------------------------
// Departure cities (Generate wizard — Step 1)
// ---------------------------------------------------------------------------

export const MOCK_DEPARTURE_CITIES: DepartureCity[] = [
  { city: "Delhi", airportCode: "DEL", state: "Delhi NCR" },
  { city: "Mumbai", airportCode: "BOM", state: "Maharashtra" },
  { city: "Bangalore", airportCode: "BLR", state: "Karnataka" },
  { city: "Chennai", airportCode: "MAA", state: "Tamil Nadu" },
  { city: "Kolkata", airportCode: "CCU", state: "West Bengal" },
  { city: "Hyderabad", airportCode: "HYD", state: "Telangana" },
  { city: "Pune", airportCode: "PNQ", state: "Maharashtra" },
  { city: "Ahmedabad", airportCode: "AMD", state: "Gujarat" },
];

// ---------------------------------------------------------------------------
// Destinations (Homepage trending + Surprise Me results + Explore chips)
// ---------------------------------------------------------------------------

export const MOCK_DESTINATIONS: Destination[] = [
  {
    id: "1",
    name: "Goa",
    state: "Goa",
    tagline: "Sun, Sand & Spice",
    description:
      "Palm-lined beaches, Portuguese-era churches, riotous flea markets and the most relaxed nightlife in India.",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800",
      "https://images.unsplash.com/photo-1582550945154-d2c2c3e2bdb1?w=800",
      "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=800",
    ],
    tags: ["beach", "party", "relaxed"],
    bestFor: ["friends", "couple"],
    season: "Oct–Mar",
    bestMonths: ["October", "November", "December", "January", "February"],
    budgetFrom: 30000,
    recommendedDuration: "4–6 days",
    weather: "Hot & sunny",
    temperature: "28–33°C",
  },
  {
    id: "2",
    name: "Rajasthan",
    state: "Rajasthan",
    tagline: "Land of Maharajas",
    description:
      "Forts that look like sandstone wedding cakes, bazaars dripping with colour, and the bluest skies in winter.",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    ],
    tags: ["cultural", "heritage", "adventure"],
    bestFor: ["family", "couple"],
    season: "Nov–Feb",
    bestMonths: ["November", "December", "January", "February"],
    budgetFrom: 45000,
    recommendedDuration: "7–10 days",
    weather: "Pleasant winter",
    temperature: "18–24°C",
  },
  {
    id: "3",
    name: "Manali",
    state: "Himachal Pradesh",
    tagline: "Snow & Serenity",
    description:
      "Snow-dusted pines, the rumbling Beas, and adventure sports for every level — from paragliding to skiing.",
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800",
      "https://images.unsplash.com/photo-1626621261140-3491f1f00ce4?w=800",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
    ],
    tags: ["adventure", "nature", "snow"],
    bestFor: ["couple", "friends"],
    season: "Dec–Feb, May–Jun",
    bestMonths: ["May", "June", "December", "January", "February"],
    budgetFrom: 35000,
    recommendedDuration: "5–7 days",
    weather: "Cold mountain air",
    temperature: "2–12°C",
  },
  {
    id: "4",
    name: "Kerala",
    state: "Kerala",
    tagline: "God's Own Country",
    description:
      "Houseboat backwaters, tea-tinted hills, ayurvedic spas, and coconut everything. The slow lane of India.",
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
      "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800",
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800",
    ],
    tags: ["nature", "relaxed", "cultural"],
    bestFor: ["family", "couple"],
    season: "Sep–Mar",
    bestMonths: ["September", "October", "November", "December", "January", "February"],
    budgetFrom: 40000,
    recommendedDuration: "6–8 days",
    weather: "Warm & humid",
    temperature: "23–32°C",
  },
  {
    id: "5",
    name: "Varanasi",
    state: "Uttar Pradesh",
    tagline: "Spiritual Heart of India",
    description:
      "The oldest continuously inhabited city in the world. Ghats, aartis at dawn, and silk weavers in narrow alleys.",
    image:
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800",
      "https://images.unsplash.com/photo-1561361398-a8b9d50f47ee?w=800",
      "https://images.unsplash.com/photo-1561361398-c5b6f3a5e6b3?w=800",
    ],
    tags: ["spiritual", "cultural"],
    bestFor: ["solo", "family"],
    season: "Oct–Mar",
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    budgetFrom: 20000,
    recommendedDuration: "3–4 days",
    weather: "Cool & dry",
    temperature: "15–25°C",
  },
  {
    id: "6",
    name: "Andaman Islands",
    state: "Andaman & Nicobar",
    tagline: "India's Hidden Paradise",
    description:
      "Turquoise water that genuinely looks photoshopped, scuba diving on coral reefs, and zero crowds on Havelock.",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
      "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800",
    ],
    tags: ["beach", "adventure", "nature"],
    bestFor: ["couple", "friends"],
    season: "Nov–Apr",
    bestMonths: ["November", "December", "January", "February", "March", "April"],
    budgetFrom: 55000,
    recommendedDuration: "5–7 days",
    weather: "Tropical sunshine",
    temperature: "24–30°C",
  },
];

// ---------------------------------------------------------------------------
// Itineraries (Homepage feed + Itinerary view + My Itineraries page)
// ---------------------------------------------------------------------------

export const MOCK_ITINERARIES: Itinerary[] = [
  {
    id: "1",
    title: "Golden Triangle — Delhi, Agra, Jaipur",
    destination: "Rajasthan Circuit",
    state: "Delhi · Uttar Pradesh · Rajasthan",
    duration: "7 nights / 8 days",
    nights: 7,
    totalDays: 8,
    groupType: "family",
    groupSize: 4,
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    ],
    totalBudget: 85000,
    pricePerPerson: 21250,
    highlights: [
      "Taj Mahal sunrise",
      "Amber Fort elephant ride",
      "Jaipur bazaars",
      "Chokhi Dhani village dinner",
    ],
    weather: "Pleasant — 18–24°C",
    weatherIcon: "☀️",
    savedAt: "2026-01-15",
    status: "upcoming",
    fromCity: "Delhi",
    postedAgo: "2 min ago",
    route: [
      {
        city: "Delhi",
        nights: 2,
        transferToNext: {
          mode: "train",
          label: "Get transferred from Delhi to Agra by Gatimaan Express",
          duration: "1h 40m",
        },
      },
      {
        city: "Agra",
        nights: 1,
        transferToNext: {
          mode: "car",
          label: "Drive from Agra to Jaipur via Fatehpur Sikri",
          duration: "4h 30m",
        },
      },
      {
        city: "Jaipur",
        nights: 4,
      },
    ],
    inclusions: [
      "3-star/4-star hotels with breakfast",
      "AC sedan with driver for inter-city transfers",
      "All monument entry tickets",
      "Gatimaan Express train Delhi → Agra",
      "English-speaking local guide on Day 3 & Day 5",
      "Chokhi Dhani dinner experience",
    ],
    exclusions: [
      "Flights to/from Delhi",
      "Travel insurance",
      "Lunches and dinners (unless mentioned)",
      "Camera fees at monuments",
      "Personal shopping & tips",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Delhi",
        morning:
          "Arrive at IGI Airport. Check in to hotel in Connaught Place. Freshen up.",
        afternoon:
          "India Gate walk, Rajpath, Rashtrapati Bhavan photo stop.",
        evening:
          "Dinner at Bukhara, ITC Maurya — legendary dal makhani.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Delhi",
        morning:
          "Qutub Minar UNESCO site — arrive by 8am to beat crowds.",
        afternoon:
          "Humayun's Tomb, Lotus Temple. Drive through Lodi Garden.",
        evening:
          "Khan Market for shopping and dinner at Sodabottleopenerwala.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Agra",
        morning:
          "Board Gatimaan Express to Agra (1h 40m). Check in near Taj.",
        afternoon:
          "Taj Mahal — enter through East Gate, professional guide included.",
        evening:
          "Rooftop dinner at Esphahan with Taj Mahal sunset view. Overnight in Agra.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Jaipur",
        morning:
          "Agra Fort visit. Drive to Jaipur via Fatehpur Sikri (4.5 hrs).",
        afternoon:
          "Arrive Jaipur, check in to heritage haveli hotel. Rest.",
        evening:
          "Chokhi Dhani village — Rajasthani thali, folk dance, camel ride.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Jaipur",
        morning:
          "Amber Fort — jeep ride up, Sheesh Mahal mirror room.",
        afternoon:
          "City Palace and Jantar Mantar UNESCO observatory.",
        evening:
          "Hawa Mahal photo stop. Johari Bazaar for gems and textiles.",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Jaipur",
        morning:
          "Nahargarh Fort sunrise viewpoint. Breakfast at Padao café.",
        afternoon:
          "Block-printing workshop at Sanganer village.",
        evening:
          "Masala Chowk street food tour — pyaaz kachori, ghewar, lassi.",
        type: "FULL DAY",
      },
      {
        dayNumber: 7,
        location: "Jaipur",
        morning:
          "Day trip to Pushkar — sacred lake and Brahma temple (3 hrs each way).",
        afternoon:
          "Camel ride into the Thar dunes at golden hour.",
        evening:
          "Return to Jaipur. Farewell dinner at Suvarna Mahal, Rambagh Palace.",
        type: "FULL DAY",
      },
      {
        dayNumber: 8,
        location: "Jaipur",
        morning:
          "Leisure breakfast. Last-minute shopping at Anokhi store.",
        afternoon:
          "Transfer to Jaipur airport. Fly home.",
        evening:
          "Trip concludes. Safe travels! 🧭",
        type: "DEPARTURE",
      },
    ],
  },
  {
    id: "2",
    title: "Goa Beach Escape",
    destination: "Goa",
    state: "Goa",
    duration: "4 nights / 5 days",
    nights: 4,
    totalDays: 5,
    groupType: "friends",
    groupSize: 6,
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200",
      "https://images.unsplash.com/photo-1582550945154-d2c2c3e2bdb1?w=800",
      "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=800",
      "https://images.unsplash.com/photo-1571432248690-7fd6980a1ae2?w=800",
    ],
    totalBudget: 45000,
    pricePerPerson: 11250,
    highlights: [
      "Baga Beach shacks",
      "Old Goa churches",
      "Dudhsagar Falls jeep safari",
      "Saturday night market",
    ],
    weather: "Hot & sunny — 28–33°C",
    weatherIcon: "☀️",
    savedAt: "2026-02-01",
    status: "upcoming",
    fromCity: "Bangalore",
    postedAgo: "8 min ago",
    route: [
      {
        city: "North Goa",
        nights: 3,
        transferToNext: {
          mode: "car",
          label: "Drive from North Goa to South Goa",
          duration: "1h 30m",
        },
      },
      { city: "South Goa", nights: 1 },
    ],
    inclusions: [
      "3-star beach resort with pool & breakfast",
      "Self-drive scooter rentals for 3 days",
      "Dudhsagar jeep safari",
      "Casino entry on Day 4",
      "Airport transfers",
    ],
    exclusions: [
      "Flights to/from Goa",
      "Lunches and dinners",
      "Water sports at Baga",
      "Alcohol",
    ],
    days: [
      {
        dayNumber: 1,
        location: "North Goa",
        morning:
          "Arrive at Goa Dabolim Airport. Check in near Baga Beach.",
        afternoon:
          "Baga Beach — swim, shack lunch at Britto's, sunbathe.",
        evening:
          "Tito's Lane nightlife — start at Cape Town Café, end at Club Cubana.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "North Goa",
        morning:
          "Anjuna Beach and Wednesday flea market.",
        afternoon:
          "Chapora Fort — Dil Chahta Hai viewpoint.",
        evening:
          "Vagator cliffside sunset with local cashew feni at Thalassa.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "North Goa",
        morning:
          "Old Goa churches — Basilica of Bom Jesus and Sé Cathedral.",
        afternoon:
          "Spice plantation tour with traditional Goan lunch.",
        evening:
          "Saturday Night Market at Arpora — live music, hippie stalls, sea-food.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "South Goa",
        morning:
          "Dudhsagar Falls jeep safari — full-day excursion.",
        afternoon:
          "Drive down to South Goa. Check in at Palolem Beach resort.",
        evening:
          "Silent disco on Palolem Beach — headphones rented at the shacks.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "South Goa",
        morning:
          "Palolem kayaking and breakfast on the sand.",
        afternoon:
          "Drive back to Dabolim Airport (1.5 hrs).",
        evening:
          "Fly home. Trip concludes. 🌴",
        type: "DEPARTURE",
      },
    ],
  },
  {
    id: "3",
    title: "Manali Snow Adventure",
    destination: "Himachal Pradesh",
    state: "Himachal Pradesh",
    duration: "5 nights / 6 days",
    nights: 5,
    totalDays: 6,
    groupType: "couple",
    groupSize: 2,
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200",
      "https://images.unsplash.com/photo-1626621261140-3491f1f00ce4?w=800",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
    ],
    totalBudget: 55000,
    pricePerPerson: 27500,
    highlights: [
      "Solang Valley snow & paragliding",
      "Hadimba Temple in cedar forest",
      "Kasol day trip with Parvati Valley views",
      "Old Manali café-hopping",
    ],
    weather: "Cold — 2–12°C. Carry heavy woolens.",
    weatherIcon: "❄️",
    savedAt: "2026-03-10",
    status: "past",
    fromCity: "Delhi",
    postedAgo: "1 hr ago",
    route: [
      {
        city: "Manali",
        nights: 4,
        transferToNext: {
          mode: "car",
          label: "Drive from Manali to Kasol & back",
          duration: "2h 30m each way",
        },
      },
      { city: "Kasol", nights: 1 },
    ],
    inclusions: [
      "Cozy riverside resort, 4 nights in Manali + 1 night Kasol",
      "Volvo bus Delhi ↔ Manali (overnight, semi-sleeper AC)",
      "Solang Valley snow gear & paragliding voucher",
      "Private cab for all Manali sightseeing",
      "Daily breakfast",
    ],
    exclusions: [
      "Rohtang Pass entry permit (subject to weather)",
      "Lunches and dinners",
      "Ski lessons at Solang",
      "Personal shopping at Mall Road",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Manali",
        morning:
          "Arrive Manali after overnight Volvo from Delhi. Check in to riverside resort.",
        afternoon:
          "Hadimba Devi Temple and cedar forests of Dhungri.",
        evening:
          "Mall Road — Tibetan market, momos at Johnson Café, hot chocolate.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Manali",
        morning:
          "Solang Valley — ropeway up for snow views and tubing.",
        afternoon:
          "Paragliding flight (weather permitting) over Solang.",
        evening:
          "Café-hop in Old Manali — Drifters' Inn, Café 1947 live music.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Manali",
        morning:
          "Rohtang Pass excursion (permit-dependent, alt: Atal Tunnel + Sissu).",
        afternoon:
          "Lunch in Sissu with Chandra River views.",
        evening:
          "Return to Manali. Bonfire dinner at the resort.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Manali",
        morning:
          "Naggar Castle and Roerich Art Gallery — heritage village.",
        afternoon:
          "Jana waterfalls and traditional Himachali siddu lunch.",
        evening:
          "Manikaran Sahib evening visit on the way back.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Kasol",
        morning:
          "Drive to Kasol via Parvati Valley (2.5 hrs).",
        afternoon:
          "River walk along the Parvati. Israeli food at Evergreen Café.",
        evening:
          "Bonfire under the stars at a riverside guesthouse.",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Manali",
        morning:
          "Drive back to Manali. Last-minute Tibetan-market shopping.",
        afternoon:
          "Board overnight Volvo to Delhi (departure 5pm).",
        evening:
          "Travel back. Trip concludes. ❄️",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 4 — Varanasi Spiritual Reset (matches pkg-2)
  // -------------------------------------------------------------------------
  {
    id: "4",
    title: "Varanasi Spiritual Reset",
    destination: "Varanasi",
    state: "Uttar Pradesh",
    duration: "2 nights / 3 days",
    nights: 2,
    totalDays: 3,
    groupType: "solo",
    groupSize: 1,
    image:
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1200",
      "https://images.unsplash.com/photo-1561361398-a8b9d50f47ee?w=800",
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800",
      "https://images.unsplash.com/photo-1561361398-c5b6f3a5e6b3?w=800",
    ],
    totalBudget: 9999,
    pricePerPerson: 9999,
    highlights: [
      "Ganga aarti at Dashashwamedh",
      "Pre-dawn boat ride",
      "Sarnath day trip",
      "Silk weavers' lane",
    ],
    weather: "Cool & dry — 15–25°C",
    weatherIcon: "🌤️",
    savedAt: "2026-04-08",
    status: "upcoming",
    fromCity: "Delhi",
    postedAgo: "21 min ago",
    route: [{ city: "Varanasi", nights: 2 }],
    inclusions: [
      "Heritage stay near Assi Ghat (2 nights, breakfast included)",
      "Private boat ride on the Ganges",
      "Sarnath day trip with English-speaking guide",
      "Aarti front-row boat seating on Day 1",
      "Airport pickup & drop",
    ],
    exclusions: [
      "Flights to/from Varanasi",
      "Lunches & dinners",
      "Camera fees at monuments",
      "Personal donations at temples",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Varanasi",
        morning:
          "Arrive Lal Bahadur Shastri Airport. Transfer to heritage stay near Assi Ghat.",
        afternoon:
          "Slow walk down the ghats — from Assi to Harishchandra. Chai at Pappu Tea Stall.",
        evening:
          "Front-row boat for Ganga aarti at Dashashwamedh — book your seat by 5pm.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Varanasi",
        morning:
          "Pre-dawn boat ride from Assi Ghat (5am). Watch the city wake up along the river.",
        afternoon:
          "Get lost in Bengali Tola and Vishwanath Gali. Lunch at Aadha Adhura café.",
        evening:
          "Silk weavers' workshop visit, then sunset chai at the Brown Bread Bakery rooftop.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Varanasi",
        morning:
          "Drive to Sarnath (40 min). Dhamek stupa, ASI museum, deer park.",
        afternoon:
          "Return to Varanasi for a last walk through the lanes and final blue lassi.",
        evening:
          "Transfer to airport. Fly home. 🪔",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 5 — Udaipur Lake Romance (matches pkg-3)
  // -------------------------------------------------------------------------
  {
    id: "5",
    title: "Udaipur Lake Romance",
    destination: "Udaipur",
    state: "Rajasthan",
    duration: "3 nights / 4 days",
    nights: 3,
    totalDays: 4,
    groupType: "couple",
    groupSize: 2,
    image:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800",
    ],
    totalBudget: 37998,
    pricePerPerson: 18999,
    highlights: [
      "Lake Pichola sunset cruise",
      "City Palace tour",
      "Heritage haveli stay",
      "Ambrai rooftop dinner",
    ],
    weather: "Pleasant — 16–26°C",
    weatherIcon: "☀️",
    savedAt: "2026-04-12",
    status: "upcoming",
    fromCity: "Mumbai",
    postedAgo: "34 min ago",
    route: [{ city: "Udaipur", nights: 3 }],
    inclusions: [
      "Heritage haveli stay on Lake Pichola (3 nights, breakfast)",
      "City Palace + Crystal Gallery tickets",
      "Private sunset cruise on Lake Pichola",
      "Folk show at Bagore-ki-Haveli",
      "AC sedan with driver for sightseeing",
    ],
    exclusions: [
      "Flights to/from Udaipur",
      "Lunches & dinners",
      "Boat ride to Jagmandir island",
      "Personal shopping",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Udaipur",
        morning:
          "Arrive Maharana Pratap Airport. Check in to heritage haveli on Lake Pichola.",
        afternoon:
          "City Palace tour — Crystal Gallery, Sheesh Mahal, Mor Chowk peacock courtyard.",
        evening:
          "Sunset cruise on Lake Pichola past Jagmandir. Rooftop dinner at Ambrai.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Udaipur",
        morning:
          "Saheliyon ki Bari gardens and the Vintage & Classic Car Collection.",
        afternoon:
          "Jagdish Temple and stroll through Hathi Pol bazaar for miniature paintings.",
        evening:
          "Bagore-ki-Haveli traditional Mewari folk dance show (7pm).",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Udaipur",
        morning:
          "Day trip to Eklingji and Nagda temples (45 min drive).",
        afternoon:
          "Lunch at Trident, then optional spa hour before the lake views.",
        evening:
          "Quiet dinner at Upre by 1559 AD — lake-view, candlelit terrace.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Udaipur",
        morning:
          "Leisure breakfast on the haveli rooftop. Final lake-side photos.",
        afternoon:
          "Transfer to airport. Fly home.",
        evening:
          "Trip concludes. 💑",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 6 — Kerala Backwaters & Hills (matches pkg-5)
  // -------------------------------------------------------------------------
  {
    id: "6",
    title: "Kerala Backwaters — Munnar, Alleppey, Kochi",
    destination: "Munnar · Alleppey · Kochi",
    state: "Kerala",
    duration: "6 nights / 7 days",
    nights: 6,
    totalDays: 7,
    groupType: "couple",
    groupSize: 2,
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200",
      "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800",
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800",
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800",
    ],
    totalBudget: 55998,
    pricePerPerson: 27999,
    highlights: [
      "Munnar tea estate walk",
      "Alleppey houseboat overnight",
      "Fort Kochi heritage walk",
      "Kathakali performance",
    ],
    weather: "Warm & humid — 22–30°C",
    weatherIcon: "🌤️",
    savedAt: "2026-04-15",
    status: "upcoming",
    fromCity: "Bangalore",
    postedAgo: "1 hr ago",
    route: [
      {
        city: "Munnar",
        nights: 2,
        transferToNext: {
          mode: "car",
          label: "Drive from Munnar to Alleppey via Periyar",
          duration: "4h 30m",
        },
      },
      {
        city: "Alleppey",
        nights: 2,
        transferToNext: {
          mode: "car",
          label: "Drive from Alleppey to Fort Kochi",
          duration: "1h 30m",
        },
      },
      { city: "Kochi", nights: 2 },
    ],
    inclusions: [
      "3-star tea-estate resort in Munnar (2 nights)",
      "Premium houseboat in Alleppey (1 night, all meals)",
      "Heritage hotel in Fort Kochi (2 nights, breakfast)",
      "AC sedan with driver for all inter-city transfers",
      "Eravikulam National Park entry tickets",
      "Kathakali performance tickets (Kerala Kathakali Centre)",
    ],
    exclusions: [
      "Flights to Kochi",
      "Lunches & dinners (except on houseboat)",
      "Spa treatments",
      "Tipping the houseboat crew",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Munnar",
        morning:
          "Arrive Kochi airport. Drive up to Munnar (4 hrs) through spice plantations.",
        afternoon:
          "Check in to tea-estate resort. Brief estate orientation.",
        evening:
          "Sunset tea at Top Station view point. Dinner at resort.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Munnar",
        morning:
          "Eravikulam NP — Nilgiri Tahr safari and view of Anamudi peak.",
        afternoon:
          "Tea Museum walk — leaf-to-cup tour at Lockhart Estate.",
        evening:
          "Mattupetty Dam boat ride. Quiet dinner back at the resort.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Alleppey",
        morning:
          "Drive to Alleppey via Periyar (4.5 hrs). Brief stop at Periyar Lake.",
        afternoon:
          "Board your private kettuvallam houseboat at 12pm. Lunch on board.",
        evening:
          "Slow cruise through Kuttanad backwaters. Chef-cooked Kerala fish curry dinner.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Alleppey",
        morning:
          "Sunrise on the houseboat. Disembark by 9am. Check in to hotel near Mararikulam Beach.",
        afternoon:
          "Beach lounging at Mararikulam — quieter than Kovalam.",
        evening:
          "Coastal seafood dinner at Marari Beach Resort.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Kochi",
        morning:
          "Drive to Fort Kochi (1.5 hrs). Check in to heritage hotel.",
        afternoon:
          "Walk Fort Kochi — Chinese fishing nets, St. Francis Church, Dutch Palace.",
        evening:
          "Kathakali performance at Kerala Kathakali Centre (arrive 5pm for make-up demo).",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Kochi",
        morning:
          "Mattancherry spice markets and the Paradesi Synagogue.",
        afternoon:
          "Lunch at Kashi Art Café. Optional Ayurvedic massage.",
        evening:
          "Sunset cruise on Kochi backwaters. Dinner at History Café.",
        type: "FULL DAY",
      },
      {
        dayNumber: 7,
        location: "Kochi",
        morning:
          "Leisure breakfast. Last-minute spice and coffee shopping.",
        afternoon:
          "Transfer to Kochi airport. Fly home.",
        evening:
          "Trip concludes. 🌴",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 7 — Ladakh Grand Tour (matches pkg-7)
  // -------------------------------------------------------------------------
  {
    id: "7",
    title: "Ladakh Grand Tour — Leh, Nubra, Pangong",
    destination: "Leh · Nubra · Pangong",
    state: "Ladakh",
    duration: "9 nights / 10 days",
    nights: 9,
    totalDays: 10,
    groupType: "friends",
    groupSize: 4,
    image:
      "https://images.unsplash.com/photo-1591018653488-65fe7d6bf75d?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1591018653488-65fe7d6bf75d?w=1200",
      "https://images.unsplash.com/photo-1626621261140-3491f1f00ce4?w=800",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800",
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800",
    ],
    totalBudget: 171996,
    pricePerPerson: 42999,
    highlights: [
      "Khardung La — world's highest motorable pass",
      "Pangong Lake camp",
      "Nubra dunes & Bactrian camels",
      "Hemis monastery",
    ],
    weather: "Cold & dry — 0–18°C. High UV.",
    weatherIcon: "❄️",
    savedAt: "2026-04-20",
    status: "upcoming",
    fromCity: "Delhi",
    postedAgo: "2 hr ago",
    route: [
      {
        city: "Leh",
        nights: 3,
        transferToNext: {
          mode: "car",
          label: "Drive from Leh to Nubra via Khardung La",
          duration: "5h 30m",
        },
      },
      {
        city: "Nubra",
        nights: 1,
        transferToNext: {
          mode: "car",
          label: "Drive from Nubra to Pangong via Shyok",
          duration: "6h",
        },
      },
      {
        city: "Pangong",
        nights: 1,
        transferToNext: {
          mode: "car",
          label: "Drive from Pangong back to Leh via Chang La",
          duration: "5h",
        },
      },
      { city: "Leh", nights: 4 },
    ],
    inclusions: [
      "Boutique guesthouse in Leh (7 nights total)",
      "Nubra desert camp (1 night)",
      "Pangong lakeside camp (1 night)",
      "Innova/Xylo with experienced Ladakhi driver",
      "Inner Line Permits for Nubra & Pangong",
      "Daily breakfast + dinner",
    ],
    exclusions: [
      "Flights to Leh",
      "Lunches",
      "Oxygen cans (recommended ₹500 each)",
      "ATV rides at Hunder dunes",
      "Personal travel insurance",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Leh",
        morning:
          "Fly into Leh (Kushok Bakula Rimpochee). Check in. Mandatory rest for AMS prevention.",
        afternoon:
          "Hydrate, light walk near hotel, slow lunch. No exertion.",
        evening:
          "Early dinner. Sleep by 9pm — altitude takes 24h to settle in.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Leh",
        morning:
          "Shanti Stupa for sunrise views over Leh valley.",
        afternoon:
          "Leh Palace and old town walk. Lunch at Bon Appétit.",
        evening:
          "Main Bazaar stroll. Tibetan refugee market. Easy dinner.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Leh",
        morning:
          "Sham Valley day trip — Magnetic Hill, Gurudwara Pathar Sahib, Indus–Zanskar confluence.",
        afternoon:
          "Alchi monastery — 11th-century murals.",
        evening:
          "Return to Leh. Stargazing from the hotel rooftop.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Nubra",
        morning:
          "Drive to Nubra via Khardung La (18,380 ft). Brief photo stop at the top — don't linger.",
        afternoon:
          "Descend to Diskit. Visit Diskit Monastery and the 32m Maitreya Buddha.",
        evening:
          "Hunder sand dunes. Bactrian camel ride at sunset. Camp dinner.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Pangong",
        morning:
          "Drive Nubra → Pangong via Shyok route (longer but stunning).",
        afternoon:
          "Arrive Pangong Lake. Check in to lakeside camp. Walk along the shore.",
        evening:
          "Pangong sunset over the lake. Bonfire dinner. Sleep early — altitude.",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Leh",
        morning:
          "Pangong sunrise (don't miss the colour change). Pack and depart.",
        afternoon:
          "Drive back to Leh via Chang La (5h). Late lunch en route.",
        evening:
          "Return to Leh guesthouse. Hot shower, hot dinner, sleep.",
        type: "FULL DAY",
      },
      {
        dayNumber: 7,
        location: "Leh",
        morning:
          "Hemis Monastery — biggest gompa in Ladakh.",
        afternoon:
          "Thiksey Monastery — sunset prayer ceremony.",
        evening:
          "Shey Palace photo stop. Dinner back in Leh.",
        type: "FULL DAY",
      },
      {
        dayNumber: 8,
        location: "Leh",
        morning:
          "Tso Moriri / Tsomoriri day trip (long drive) OR rest day at hotel.",
        afternoon:
          "Continued exploration / lazy lunch in Leh.",
        evening:
          "Final group dinner at Tibetan Kitchen.",
        type: "FULL DAY",
      },
      {
        dayNumber: 9,
        location: "Leh",
        morning:
          "Shopping for pashmina, prayer flags, and apricot products.",
        afternoon:
          "Stok Palace and Hall of Fame museum.",
        evening:
          "Pack. Early dinner — pre-dawn flight tomorrow.",
        type: "FULL DAY",
      },
      {
        dayNumber: 10,
        location: "Leh",
        morning:
          "Pre-dawn transfer to airport. Fly out — flights leave before 9am due to wind.",
        afternoon:
          "Land in Delhi. Trip continues home.",
        evening:
          "Trip concludes. 🏔️",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 8 — Northeast Explorer (matches pkg-8)
  // -------------------------------------------------------------------------
  {
    id: "8",
    title: "Northeast Explorer — Guwahati, Shillong, Kaziranga",
    destination: "Guwahati · Shillong · Kaziranga",
    state: "Assam · Meghalaya",
    duration: "10 nights / 11 days",
    nights: 10,
    totalDays: 11,
    groupType: "family",
    groupSize: 4,
    image:
      "https://images.unsplash.com/photo-1609151346744-58ddd4e3fc44?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1609151346744-58ddd4e3fc44?w=1200",
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800",
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
      "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800",
    ],
    totalBudget: 199996,
    pricePerPerson: 49999,
    highlights: [
      "Living root bridges in Cherrapunji",
      "Kaziranga one-horned rhino safari",
      "Kamakhya temple",
      "Mawlynnong — Asia's cleanest village",
    ],
    weather: "Mild & wet — 18–28°C",
    weatherIcon: "🌧️",
    savedAt: "2026-04-22",
    status: "upcoming",
    fromCity: "Kolkata",
    postedAgo: "3 hr ago",
    route: [
      {
        city: "Guwahati",
        nights: 1,
        transferToNext: {
          mode: "car",
          label: "Drive Guwahati → Shillong via Umiam Lake",
          duration: "3h",
        },
      },
      {
        city: "Shillong",
        nights: 3,
        transferToNext: {
          mode: "car",
          label: "Drive Shillong → Cherrapunji",
          duration: "1h 30m",
        },
      },
      {
        city: "Cherrapunji",
        nights: 2,
        transferToNext: {
          mode: "car",
          label: "Drive Cherrapunji → Kaziranga via Guwahati",
          duration: "7h",
        },
      },
      {
        city: "Kaziranga",
        nights: 3,
        transferToNext: {
          mode: "car",
          label: "Drive Kaziranga → Guwahati airport",
          duration: "5h",
        },
      },
      { city: "Guwahati", nights: 1 },
    ],
    inclusions: [
      "All accommodations (10 nights, breakfast)",
      "Innova/Tempo Traveller with experienced driver",
      "Kaziranga jeep + elephant safari permits",
      "Living root bridge trek guide (Day 6)",
      "All inter-city transfers",
    ],
    exclusions: [
      "Flights to/from Guwahati",
      "Lunches & dinners",
      "Camera fees in Kaziranga",
      "Personal shopping (Meghalaya bamboo crafts)",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Guwahati",
        morning:
          "Arrive LGBI Airport. Check in to riverside hotel near Brahmaputra.",
        afternoon:
          "Kamakhya temple visit. Tea at a local Assamese tea house.",
        evening:
          "Brahmaputra sunset river cruise.",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Shillong",
        morning:
          "Drive to Shillong via Umiam Lake (3 hrs). Photo stop and boat ride.",
        afternoon:
          "Check in. Don Bosco Centre for Indigenous Cultures museum.",
        evening:
          "Police Bazaar walk and Khasi street food.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Shillong",
        morning:
          "Drive to Mawlynnong — Asia's cleanest village.",
        afternoon:
          "Visit a Khasi-tribe living root bridge nearby.",
        evening:
          "Return to Shillong. Café Shillong live music dinner.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Shillong",
        morning:
          "Elephant Falls and Shillong Peak views.",
        afternoon:
          "Ward's Lake stroll. Lunch at City Hut Dhaba.",
        evening:
          "Pottery workshop at Smit village.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Cherrapunji",
        morning:
          "Drive to Cherrapunji (1.5 hrs). Check in to view-point resort.",
        afternoon:
          "Nohkalikai Falls — India's tallest plunge waterfall.",
        evening:
          "Mawsmai limestone caves and Eco Park sunset.",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Cherrapunji",
        morning:
          "Hike to the Double-Decker Living Root Bridge — 3,500 steps each way.",
        afternoon:
          "Lunch at Nongriat village before climbing back up.",
        evening:
          "Slow recovery at resort with hot Khasi rice beer.",
        type: "FULL DAY",
      },
      {
        dayNumber: 7,
        location: "Kaziranga",
        morning:
          "Long drive Cherrapunji → Kaziranga via Guwahati (7 hrs).",
        afternoon:
          "Pit stops at Bhalukpong tea plantations.",
        evening:
          "Arrive Kaziranga forest lodge. Welcome dinner with traditional Assamese thali.",
        type: "TRANSIT",
      },
      {
        dayNumber: 8,
        location: "Kaziranga",
        morning:
          "Pre-dawn elephant safari (Central Range) — best chance for rhino sightings.",
        afternoon:
          "Rest at lodge. Brunch and a swim.",
        evening:
          "Sunset jeep safari (Western Range).",
        type: "FULL DAY",
      },
      {
        dayNumber: 9,
        location: "Kaziranga",
        morning:
          "Eastern Range jeep safari — quieter, better for birding.",
        afternoon:
          "Tea estate visit at Behora.",
        evening:
          "Bonfire dinner at lodge with cultural Bihu dance performance.",
        type: "FULL DAY",
      },
      {
        dayNumber: 10,
        location: "Guwahati",
        morning:
          "Drive back to Guwahati (5 hrs). Stop at handloom shopping village.",
        afternoon:
          "Check in to airport hotel.",
        evening:
          "Final family dinner at Paradise Restaurant — Assamese specials.",
        type: "FULL DAY",
      },
      {
        dayNumber: 11,
        location: "Guwahati",
        morning:
          "Leisure breakfast. Last-minute Muga silk shopping.",
        afternoon:
          "Transfer to airport. Fly home.",
        evening:
          "Trip concludes. 🦏",
        type: "DEPARTURE",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Itinerary 9 — Andaman Deep Dive (matches pkg-9)
  // -------------------------------------------------------------------------
  {
    id: "9",
    title: "Andaman Deep Dive — Port Blair, Havelock, Neil",
    destination: "Port Blair · Havelock · Neil",
    state: "Andaman & Nicobar",
    duration: "10 nights / 11 days",
    nights: 10,
    totalDays: 11,
    groupType: "couple",
    groupSize: 2,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200",
    gallery: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200",
      "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800",
      "https://images.unsplash.com/photo-1571432248690-7fd6980a1ae2?w=800",
    ],
    totalBudget: 117998,
    pricePerPerson: 58999,
    highlights: [
      "PADI Open Water certification at Havelock",
      "Radhanagar Beach sunset",
      "Bioluminescent night kayak",
      "Cellular Jail light & sound",
    ],
    weather: "Tropical sunshine — 25–30°C",
    weatherIcon: "☀️",
    savedAt: "2026-04-25",
    status: "upcoming",
    fromCity: "Chennai",
    postedAgo: "4 hr ago",
    route: [
      {
        city: "Port Blair",
        nights: 2,
        transferToNext: {
          mode: "bus",
          label: "Makruzz ferry Port Blair → Havelock",
          duration: "1h 30m",
        },
      },
      {
        city: "Havelock",
        nights: 5,
        transferToNext: {
          mode: "bus",
          label: "Makruzz ferry Havelock → Neil",
          duration: "1h",
        },
      },
      {
        city: "Neil",
        nights: 2,
        transferToNext: {
          mode: "bus",
          label: "Makruzz ferry Neil → Port Blair",
          duration: "1h 30m",
        },
      },
      { city: "Port Blair", nights: 1 },
    ],
    inclusions: [
      "Beach resort stays (10 nights, breakfast)",
      "Makruzz premium ferry tickets (all transfers)",
      "PADI Open Water 4-day certification course",
      "Cellular Jail light & sound show tickets",
      "Bioluminescent kayak tour at Havelock",
      "Airport pickup & drop",
    ],
    exclusions: [
      "Flights to Port Blair",
      "Lunches & dinners",
      "Snorkel/scuba gear rental for free dives",
      "Mobile data (network is patchy)",
    ],
    days: [
      {
        dayNumber: 1,
        location: "Port Blair",
        morning:
          "Arrive Veer Savarkar Airport. Transfer to hotel near Corbyn's Cove.",
        afternoon:
          "Light beach walk and seafood lunch.",
        evening:
          "Cellular Jail light & sound show (book 6:00pm slot — English).",
        type: "ARRIVAL",
      },
      {
        dayNumber: 2,
        location: "Port Blair",
        morning:
          "Anthropological Museum and Samudrika Naval Marine Museum.",
        afternoon:
          "Corbyn's Cove swim. Pack for ferry.",
        evening:
          "Aberdeen Bazaar shopping. Early dinner — early ferry tomorrow.",
        type: "FULL DAY",
      },
      {
        dayNumber: 3,
        location: "Havelock",
        morning:
          "Morning Makruzz ferry to Havelock (1.5 hrs). Check in to beach resort.",
        afternoon:
          "Discover Scuba session at Elephant Beach (no certification, just a try).",
        evening:
          "Radhanagar Beach sunset — Asia's best beach.",
        type: "FULL DAY",
      },
      {
        dayNumber: 4,
        location: "Havelock",
        morning:
          "PADI Open Water — Day 1 theory + pool/shallow water skills.",
        afternoon:
          "Continued instruction at Lighthouse beach.",
        evening:
          "Rest. Early dinner. Hydrate.",
        type: "FULL DAY",
      },
      {
        dayNumber: 5,
        location: "Havelock",
        morning:
          "PADI Open Water — Day 2 confined water + first open-water dive.",
        afternoon:
          "Second open-water dive at Aquarium dive site.",
        evening:
          "Surface interval — dinner on the beach.",
        type: "FULL DAY",
      },
      {
        dayNumber: 6,
        location: "Havelock",
        morning:
          "PADI Open Water — Day 3, final two dives. Certification!",
        afternoon:
          "Celebrate at Full Moon Café.",
        evening:
          "Bonfire on Radhanagar.",
        type: "FULL DAY",
      },
      {
        dayNumber: 7,
        location: "Havelock",
        morning:
          "Rest day. Optional surface snorkel at Elephant Beach.",
        afternoon:
          "Spa appointment or beach reading.",
        evening:
          "Bioluminescent night kayak tour (moonless if possible).",
        type: "FULL DAY",
      },
      {
        dayNumber: 8,
        location: "Neil",
        morning:
          "Ferry Havelock → Neil Island (1 hr). Check in.",
        afternoon:
          "Natural Bridge at low tide. Laxmanpur Beach 1 swim.",
        evening:
          "Sunset Point near Laxmanpur 2.",
        type: "FULL DAY",
      },
      {
        dayNumber: 9,
        location: "Neil",
        morning:
          "Bharatpur Beach snorkel with glass-bottom boat option.",
        afternoon:
          "Lunch at Garden View Café.",
        evening:
          "Stargazing — almost zero light pollution.",
        type: "FULL DAY",
      },
      {
        dayNumber: 10,
        location: "Port Blair",
        morning:
          "Ferry Neil → Port Blair (1.5 hrs).",
        afternoon:
          "Check in to airport-side hotel. Last-minute shopping at Sagarika Emporium.",
        evening:
          "Farewell seafood dinner at Lighthouse Restaurant.",
        type: "FULL DAY",
      },
      {
        dayNumber: 11,
        location: "Port Blair",
        morning:
          "Leisure breakfast. Pack.",
        afternoon:
          "Transfer to airport. Fly home.",
        evening:
          "Trip concludes. 🐠",
        type: "DEPARTURE",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Recently generated feed (Homepage Section 2 — "Live — 143+ trips this week")
// ---------------------------------------------------------------------------

export interface RecentGeneration {
  id: string;
  itineraryId: string;
  fromCity: string;
  postedAgo: string;
}

export const MOCK_RECENT_GENERATIONS: RecentGeneration[] = [
  { id: "rg-1", itineraryId: "1", fromCity: "Delhi", postedAgo: "2 min ago" },
  { id: "rg-2", itineraryId: "2", fromCity: "Bangalore", postedAgo: "8 min ago" },
  { id: "rg-3", itineraryId: "3", fromCity: "Mumbai", postedAgo: "14 min ago" },
  { id: "rg-4", itineraryId: "1", fromCity: "Hyderabad", postedAgo: "27 min ago" },
  { id: "rg-5", itineraryId: "2", fromCity: "Pune", postedAgo: "42 min ago" },
  { id: "rg-6", itineraryId: "3", fromCity: "Chennai", postedAgo: "1 hr ago" },
];

// ---------------------------------------------------------------------------
// Packages by duration (Homepage Section 5)
// ---------------------------------------------------------------------------

export const MOCK_PACKAGES: Package[] = [
  // Short — 3–5 Days
  {
    id: "pkg-1",
    title: "Goa Long Weekend",
    destination: "North Goa",
    duration: "3 nights / 4 days",
    durationBucket: "short",
    pricePerPerson: 14999,
    image:
      "https://images.unsplash.com/photo-1582550945154-d2c2c3e2bdb1?w=800",
    highlights: ["Baga Beach stay", "Saturday night market", "Cruise dinner"],
    groupType: "friends",
  },
  {
    id: "pkg-2",
    title: "Varanasi Spiritual Reset",
    destination: "Varanasi",
    duration: "2 nights / 3 days",
    durationBucket: "short",
    pricePerPerson: 9999,
    image:
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800",
    highlights: ["Ganga aarti boat ride", "Sarnath day trip", "Silk weavers' lane"],
    groupType: "solo",
  },
  {
    id: "pkg-3",
    title: "Udaipur Romance",
    destination: "Udaipur",
    duration: "3 nights / 4 days",
    durationBucket: "short",
    pricePerPerson: 18999,
    image:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
    highlights: ["Lake Pichola sunset cruise", "City Palace tour", "Heritage haveli stay"],
    groupType: "couple",
  },

  // Mid — 6–9 Days
  {
    id: "pkg-4",
    title: "Golden Triangle Classic",
    destination: "Delhi · Agra · Jaipur",
    duration: "7 nights / 8 days",
    durationBucket: "mid",
    pricePerPerson: 24999,
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
    highlights: ["Taj Mahal sunrise", "Amber Fort", "Pushkar day trip"],
    groupType: "family",
  },
  {
    id: "pkg-5",
    title: "Kerala Backwaters & Hills",
    destination: "Munnar · Alleppey · Kochi",
    duration: "6 nights / 7 days",
    durationBucket: "mid",
    pricePerPerson: 27999,
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    highlights: ["Tea-estate stay", "Houseboat overnight", "Fort Kochi walk"],
    groupType: "couple",
  },
  {
    id: "pkg-6",
    title: "Himachal Circuit",
    destination: "Shimla · Manali · Kasol",
    duration: "7 nights / 8 days",
    durationBucket: "mid",
    pricePerPerson: 22999,
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800",
    highlights: ["Solang Valley snow", "Toy train ride", "Parvati Valley"],
    groupType: "friends",
  },

  // Long — 10+ Days
  {
    id: "pkg-7",
    title: "Ladakh Grand Tour",
    destination: "Leh · Nubra · Pangong",
    duration: "9 nights / 10 days",
    durationBucket: "long",
    pricePerPerson: 42999,
    image:
      "https://images.unsplash.com/photo-1591018653488-65fe7d6bf75d?w=800",
    highlights: ["Khardung La pass", "Pangong Lake camp", "Hemis monastery"],
    groupType: "friends",
  },
  {
    id: "pkg-8",
    title: "Northeast Explorer",
    destination: "Guwahati · Shillong · Kaziranga",
    duration: "10 nights / 11 days",
    durationBucket: "long",
    pricePerPerson: 49999,
    image:
      "https://images.unsplash.com/photo-1609151346744-58ddd4e3fc44?w=800",
    highlights: ["Living root bridges", "One-horned rhino safari", "Cherrapunji falls"],
    groupType: "family",
  },
  {
    id: "pkg-9",
    title: "Andaman Deep Dive",
    destination: "Port Blair · Havelock · Neil",
    duration: "10 nights / 11 days",
    durationBucket: "long",
    pricePerPerson: 58999,
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    highlights: ["PADI scuba certification", "Radhanagar Beach", "Bioluminescent kayaking"],
    groupType: "couple",
  },
];

// ---------------------------------------------------------------------------
// Reviews (Homepage Section 4)
// ---------------------------------------------------------------------------

export const MOCK_REVIEWS: Review[] = [
  {
    id: "rv-1",
    name: "Anjali Sharma",
    rating: 5,
    quote:
      "Sarthi planned our entire Kerala honeymoon in 3 minutes. The AI even suggested a private houseboat slot we wouldn't have found otherwise.",
    trip: "Kerala Backwaters & Hills",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "rv-2",
    name: "Rohan Mehta",
    rating: 5,
    quote:
      "I told it 'surprise me, budget 40k, beach vibes' and it landed on Gokarna with a perfectly paced 5-day plan. Felt like talking to a friend who knows India.",
    trip: "Gokarna Beach Escape",
    avatar:
      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop&crop=face",
  },
  {
    id: "rv-3",
    name: "Priya & Family",
    rating: 5,
    quote:
      "Took our parents on the Golden Triangle. Sarthi added rest afternoons and senior-friendly walks I would never have thought to ask for.",
    trip: "Golden Triangle Classic",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  },
];

// ---------------------------------------------------------------------------
// Surprise Me vibes + Generate interests
// ---------------------------------------------------------------------------

export const MOCK_VIBES: VibeOption[] = [
  {
    id: "beach",
    emoji: "🏖️",
    label: "Beach & Chill",
    description: "Sand, waves, and zero alarms.",
    gradient: "from-amber-300 to-orange-500",
  },
  {
    id: "mountain",
    emoji: "🏔️",
    label: "Mountain Escape",
    description: "Pine air and snow peaks.",
    gradient: "from-sky-300 to-indigo-500",
  },
  {
    id: "culture",
    emoji: "🕌",
    label: "Culture Dive",
    description: "Forts, bazaars, and street food.",
    gradient: "from-rose-300 to-pink-600",
  },
  {
    id: "nature",
    emoji: "🌿",
    label: "Nature Retreat",
    description: "Forests, lakes, slow mornings.",
    gradient: "from-emerald-300 to-green-600",
  },
  {
    id: "party",
    emoji: "🎉",
    label: "Party Mode",
    description: "Clubs, beach raves, late nights.",
    gradient: "from-fuchsia-400 to-purple-600",
  },
  {
    id: "wellness",
    emoji: "🧘",
    label: "Wellness Reset",
    description: "Ayurveda, yoga, silent stays.",
    gradient: "from-teal-300 to-cyan-600",
  },
];

export const MOCK_INTERESTS: InterestChip[] = [
  { id: "adventure", label: "Adventure", icon: "🧗" },
  { id: "beach", label: "Beach", icon: "🏖️" },
  { id: "heritage", label: "Heritage", icon: "🏛️" },
  { id: "food", label: "Food & Culture", icon: "🍛" },
  { id: "nature", label: "Nature", icon: "🌳" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "nightlife", label: "Nightlife", icon: "🪩" },
];

export const MOCK_PACES = [
  { id: "slow", label: "Slow & relaxed", icon: "🐢" },
  { id: "balanced", label: "Balanced", icon: "⚖️" },
  { id: "packed", label: "Action-packed", icon: "⚡" },
];

export const MOCK_HOTEL_TYPES = [
  { id: "budget", label: "Budget stay", icon: "🎒" },
  { id: "comfort", label: "Comfortable 3-star", icon: "🛏️" },
  { id: "premium", label: "Premium", icon: "✨" },
  { id: "luxury", label: "Luxury resort", icon: "👑" },
];

export const MOCK_AVOID_OPTIONS = [
  { id: "too-cold", label: "Too cold", icon: "🥶" },
  { id: "too-hot", label: "Too hot", icon: "🥵" },
  { id: "crowded", label: "Crowded places", icon: "👥" },
  { id: "long-travel", label: "Long travel", icon: "🛣️" },
  { id: "international", label: "International", icon: "🌍" },
  { id: "remote", label: "Remote areas", icon: "🏝️" },
];

export const MOCK_GROUP_TYPES: { id: GroupType; emoji: string; label: string; subtitle: string }[] = [
  { id: "couple", emoji: "💑", label: "Couple", subtitle: "Romantic getaways" },
  { id: "family", emoji: "👨‍👩‍👧‍👦", label: "Family", subtitle: "All-age friendly" },
  { id: "friends", emoji: "👫", label: "Friends", subtitle: "High-energy trips" },
  { id: "solo", emoji: "🎒", label: "Solo", subtitle: "Your pace, your call" },
];

// ---------------------------------------------------------------------------
// Surprise Me — pre-baked match results
// ---------------------------------------------------------------------------

export const MOCK_SURPRISE_RESULTS: DestinationMatch[] = [
  {
    ...MOCK_DESTINATIONS[3], // Kerala
    matchScore: 96,
    matchReasons: [
      "Perfect for couples",
      "Ideal weather in your dates",
      "Well within your budget",
    ],
    estimatedBudget: 42000,
    weatherSummary: "☀️ 26°C, sunny",
  },
  {
    ...MOCK_DESTINATIONS[0], // Goa
    matchScore: 91,
    matchReasons: [
      "Matches your beach vibe",
      "Top-rated for friends groups",
      "Excellent flight connectivity",
    ],
    estimatedBudget: 31000,
    weatherSummary: "☀️ 30°C, light breeze",
  },
  {
    ...MOCK_DESTINATIONS[5], // Andaman
    matchScore: 88,
    matchReasons: [
      "Crystal-clear water as you wanted",
      "Off-the-beaten-path",
      "World-class scuba diving",
    ],
    estimatedBudget: 57000,
    weatherSummary: "🌤️ 28°C, low rain",
  },
  {
    ...MOCK_DESTINATIONS[2], // Manali
    matchScore: 84,
    matchReasons: [
      "Adventure-packed itinerary",
      "Cool weather change from your home city",
      "Great for couples on a budget",
    ],
    estimatedBudget: 36000,
    weatherSummary: "❄️ 6°C, snowfall likely",
  },
  {
    ...MOCK_DESTINATIONS[1], // Rajasthan
    matchScore: 81,
    matchReasons: [
      "Heritage and culture deep-dive",
      "Iconic palaces & desert experiences",
      "Pleasant winter weather",
    ],
    estimatedBudget: 47000,
    weatherSummary: "🌤️ 20°C, dry & clear",
  },
];

// ---------------------------------------------------------------------------
// Budgets (Budget overview + detail)
// ---------------------------------------------------------------------------

const goldenTriangleCategories: BudgetCategory[] = [
  {
    id: "flights",
    label: "Flights",
    icon: "✈️",
    planned: 18000,
    spent: 4500,
    expenses: [
      {
        id: "exp-1",
        label: "Booked IndiGo Delhi → Jaipur",
        amount: 4500,
        date: "2026-04-02",
      },
    ],
  },
  {
    id: "hotels",
    label: "Hotels",
    icon: "🏨",
    planned: 24000,
    spent: 8000,
    expenses: [
      {
        id: "exp-2",
        label: "Hotel Diggi Palace — 2 nights",
        amount: 8000,
        date: "2026-04-05",
      },
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "🍽️",
    planned: 12000,
    spent: 0,
    expenses: [],
  },
  {
    id: "local",
    label: "Local travel",
    icon: "🚌",
    planned: 6000,
    spent: 0,
    expenses: [],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "🎭",
    planned: 8000,
    spent: 1500,
    expenses: [
      {
        id: "exp-3",
        label: "Amber Fort elephant ride",
        amount: 1500,
        date: "2026-04-06",
      },
    ],
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "🛍️",
    planned: 10000,
    spent: 0,
    expenses: [],
  },
  {
    id: "misc",
    label: "Miscellaneous",
    icon: "🔧",
    planned: 7000,
    spent: 0,
    expenses: [],
  },
];

const goaCategories: BudgetCategory[] = [
  { id: "flights", label: "Flights", icon: "✈️", planned: 10000, spent: 0, expenses: [] },
  { id: "hotels", label: "Hotels", icon: "🏨", planned: 14000, spent: 0, expenses: [] },
  { id: "food", label: "Food", icon: "🍽️", planned: 8000, spent: 0, expenses: [] },
  { id: "local", label: "Local travel", icon: "🚌", planned: 3000, spent: 0, expenses: [] },
  { id: "activities", label: "Activities", icon: "🎭", planned: 5000, spent: 0, expenses: [] },
  { id: "shopping", label: "Shopping", icon: "🛍️", planned: 2000, spent: 0, expenses: [] },
  { id: "misc", label: "Miscellaneous", icon: "🔧", planned: 3000, spent: 0, expenses: [] },
];

const manaliCategories: BudgetCategory[] = [
  { id: "flights", label: "Bus / Train", icon: "🚌", planned: 6000, spent: 6000, expenses: [
    { id: "exp-m1", label: "Volvo Delhi → Manali return", amount: 6000, date: "2026-03-01" },
  ]},
  { id: "hotels", label: "Hotels", icon: "🏨", planned: 18000, spent: 18000, expenses: [
    { id: "exp-m2", label: "Riverside Resort 4 nights", amount: 18000, date: "2026-03-05" },
  ]},
  { id: "food", label: "Food", icon: "🍽️", planned: 8000, spent: 7200, expenses: [
    { id: "exp-m3", label: "Café 1947 dinners", amount: 4200, date: "2026-03-06" },
    { id: "exp-m4", label: "Roadside food", amount: 3000, date: "2026-03-07" },
  ]},
  { id: "local", label: "Local travel", icon: "🚖", planned: 5000, spent: 4500, expenses: [
    { id: "exp-m5", label: "Manali sightseeing cab", amount: 4500, date: "2026-03-08" },
  ]},
  { id: "activities", label: "Activities", icon: "🎭", planned: 12000, spent: 11000, expenses: [
    { id: "exp-m6", label: "Paragliding Solang", amount: 6000, date: "2026-03-07" },
    { id: "exp-m7", label: "Snow gear rental", amount: 2000, date: "2026-03-07" },
    { id: "exp-m8", label: "Atal Tunnel taxi", amount: 3000, date: "2026-03-08" },
  ]},
  { id: "shopping", label: "Shopping", icon: "🛍️", planned: 3000, spent: 2400, expenses: [
    { id: "exp-m9", label: "Tibetan market shawls", amount: 2400, date: "2026-03-09" },
  ]},
  { id: "misc", label: "Miscellaneous", icon: "🔧", planned: 3000, spent: 1500, expenses: [
    { id: "exp-m10", label: "Permits & tips", amount: 1500, date: "2026-03-08" },
  ]},
];

function sumBudget(cats: BudgetCategory[], key: "planned" | "spent") {
  return cats.reduce((acc, c) => acc + c[key], 0);
}

// Synthesises a default budget for an itinerary that doesn't have an explicit
// one yet. Distributes totalBudget across the standard 7 categories using
// rough industry proportions. Used both for the new mock budgets below and as
// a runtime fallback in /budget/[id].
function buildDefaultBudget(it: Itinerary, tripDates?: string): Budget {
  const split: Record<string, number> = {
    flights: 0.2,
    hotels: 0.3,
    food: 0.15,
    local: 0.08,
    activities: 0.12,
    shopping: 0.1,
    misc: 0.05,
  };
  const round = (pct: number) => Math.round((it.totalBudget * pct) / 100) * 100;
  const categories: BudgetCategory[] = [
    { id: "flights", label: "Flights", icon: "✈️", planned: round(split.flights * 100), spent: 0, expenses: [] },
    { id: "hotels", label: "Hotels", icon: "🏨", planned: round(split.hotels * 100), spent: 0, expenses: [] },
    { id: "food", label: "Food", icon: "🍽️", planned: round(split.food * 100), spent: 0, expenses: [] },
    { id: "local", label: "Local travel", icon: "🚌", planned: round(split.local * 100), spent: 0, expenses: [] },
    { id: "activities", label: "Activities", icon: "🎭", planned: round(split.activities * 100), spent: 0, expenses: [] },
    { id: "shopping", label: "Shopping", icon: "🛍️", planned: round(split.shopping * 100), spent: 0, expenses: [] },
    { id: "misc", label: "Miscellaneous", icon: "🔧", planned: round(split.misc * 100), spent: 0, expenses: [] },
  ];
  const totalPlanned = categories.reduce((s, c) => s + c.planned, 0);
  return {
    id: `b-${it.id}`,
    itineraryId: it.id,
    name: it.title,
    tripImage: it.image,
    tripDates,
    totalPlanned,
    totalSpent: 0,
    categories,
    createdAt: it.savedAt,
  };
}

export const MOCK_BUDGETS: Budget[] = [
  {
    id: "b-1",
    itineraryId: "1",
    name: "Golden Triangle — Delhi, Agra, Jaipur",
    tripImage:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
    tripDates: "Apr 04 – Apr 11, 2026",
    totalPlanned: sumBudget(goldenTriangleCategories, "planned"),
    totalSpent: sumBudget(goldenTriangleCategories, "spent"),
    categories: goldenTriangleCategories,
    createdAt: "2026-01-15",
  },
  {
    id: "b-2",
    itineraryId: "2",
    name: "Goa Beach Escape",
    tripImage:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200",
    tripDates: "May 16 – May 20, 2026",
    totalPlanned: sumBudget(goaCategories, "planned"),
    totalSpent: sumBudget(goaCategories, "spent"),
    categories: goaCategories,
    createdAt: "2026-02-01",
  },
  {
    id: "b-3",
    itineraryId: "3",
    name: "Manali Snow Adventure",
    tripImage:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200",
    tripDates: "Mar 05 – Mar 10, 2026",
    totalPlanned: sumBudget(manaliCategories, "planned"),
    totalSpent: sumBudget(manaliCategories, "spent"),
    categories: manaliCategories,
    createdAt: "2026-03-10",
  },
  // Synthesised default budgets for the longer-tail itineraries (4-9) so
  // every "Open budget tracker" link from the new itineraries has a real
  // destination instead of 404. Spend is 0 on these — they haven't started.
  buildDefaultBudget(MOCK_ITINERARIES[3], "Jun 02 – Jun 04, 2026"),
  buildDefaultBudget(MOCK_ITINERARIES[4], "Jun 12 – Jun 15, 2026"),
  buildDefaultBudget(MOCK_ITINERARIES[5], "Jul 04 – Jul 10, 2026"),
  buildDefaultBudget(MOCK_ITINERARIES[6], "Jun 20 – Jun 29, 2026"),
  buildDefaultBudget(MOCK_ITINERARIES[7], "Oct 08 – Oct 18, 2026"),
  buildDefaultBudget(MOCK_ITINERARIES[8], "Dec 01 – Dec 11, 2026"),
];

// Default categories used when the user creates a brand-new budget.
export const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: "flights", label: "Flights", icon: "✈️", planned: 0, spent: 0, expenses: [] },
  { id: "hotels", label: "Hotels", icon: "🏨", planned: 0, spent: 0, expenses: [] },
  { id: "food", label: "Food", icon: "🍽️", planned: 0, spent: 0, expenses: [] },
  { id: "local", label: "Local travel", icon: "🚌", planned: 0, spent: 0, expenses: [] },
  { id: "activities", label: "Activities", icon: "🎭", planned: 0, spent: 0, expenses: [] },
  { id: "shopping", label: "Shopping", icon: "🛍️", planned: 0, spent: 0, expenses: [] },
  { id: "misc", label: "Miscellaneous", icon: "🔧", planned: 0, spent: 0, expenses: [] },
];

// ---------------------------------------------------------------------------
// ChatWidget — context messages, suggested chips, hardcoded bot brain
// ---------------------------------------------------------------------------

export const CONTEXT_OPENERS: Record<PageContext, string> = {
  home: "Hi! I'm Sarthi, your AI travel guide. Tell me what kind of trip you're dreaming of and I'll help you plan it!",
  explore:
    "Looking for the right destination? Tell me your vibe, budget, or season and I'll narrow it down to a shortlist.",
  generate: "Tell me what kind of trip you're dreaming of — I can help you fill this in faster.",
  surprise: "Tell me what you're in the mood for and I'll surprise you with the perfect destination.",
  itinerary:
    "I can see your itinerary. What would you like to change? You can say things like 'Add a heritage walk on Day 2' or 'Replace the evening activity on Day 3'.",
  budget: "I can help you track and adjust your travel budget. Want me to suggest where to save?",
  auth: "Welcome to Sarthi! Once you log in I can save your itineraries and budgets across devices.",
  "my-itineraries":
    "Pick any itinerary and I'll help you tweak it — swap a day, change a hotel, or replan from scratch.",
  default:
    "I'm Sarthi, your AI travel guide. Ask me anything about your trip or let me help modify your itinerary!",
};

export const CONTEXT_SUGGESTED_CHIPS: Record<PageContext, string[]> = {
  home: ["Plan a beach trip", "I have ₹40k for 5 days", "Best places in March", "Surprise me!"],
  explore: ["Show me beaches", "Best for couples", "Under ₹40k", "Cool weather please"],
  generate: ["Couple, 5 days, ₹50k", "Family-friendly Rajasthan", "Adventure in the mountains", "Vegetarian only"],
  surprise: ["Beach vibe, low budget", "Cold weather please", "Adventure for friends", "Near Delhi"],
  itinerary: ["Modify dates", "Add an activity", "Change a restaurant", "Swap a day", "Adjust budget"],
  budget: ["Add a flight expense", "Where can I save?", "Rebalance food category", "Show daily breakdown"],
  auth: ["Why should I sign up?", "Is my data safe?", "Can I plan as a guest?"],
  "my-itineraries": ["Edit my Goa trip", "Duplicate Golden Triangle", "Plan something new"],
  default: ["Plan a trip", "Surprise me", "Help with budget"],
};

interface BotResponse {
  keywords: string[];
  reply: string;
}

const BOT_RULES: BotResponse[] = [
  {
    keywords: [
      "modify date",
      "modify for date",
      "change date",
      "different date",
      "shift date",
      "new date",
      "reschedule",
    ],
    reply:
      "Sure — what are the new dates? I'll re-anchor every day in the plan, check fresh weather forecasts, and update flight + hotel prices for the new window.",
  },
  {
    keywords: ["add activity", "add an activity", "add a heritage", "add walk", "add tour"],
    reply:
      "Sure! Tell me which day and what kind of activity — I'll add it to your plan and adjust the timing of other stops.",
  },
  {
    keywords: ["change hotel", "swap hotel", "different hotel", "hotel"],
    reply:
      "Got it. What's your preference — budget, mid-range, or luxury? I'll pull alternatives near the same area and keep your check-in dates intact.",
  },
  {
    keywords: ["budget", "money", "spend", "expense", "cost"],
    reply:
      "Your current spend is ₹14,000 of ₹85,000 planned. The biggest spare room is in 'Shopping'. Want me to suggest where to save?",
  },
  {
    keywords: ["restaurant", "food", "eat", "vegetarian", "non-veg", "dinner"],
    reply:
      "I'll swap the restaurant. Any cuisine preference — local thali, multi-cuisine fine dining, or street food?",
  },
  {
    keywords: ["swap day", "swap a day", "change day", "move day"],
    reply:
      "Easy. Which two days should I swap? I'll re-route transit between cities so the order stays sensible.",
  },
  {
    keywords: ["beach"],
    reply:
      "Nice — beach trips. Goa, Gokarna, Andaman, or Kerala? Tell me your budget and dates and I'll shortlist 3 options.",
  },
  {
    keywords: ["mountain", "snow", "trek"],
    reply:
      "Mountain mode. Manali, Spiti, Kashmir, or Sikkim? Pro tip: snow window is mid-December to February.",
  },
  {
    keywords: ["surprise"],
    reply:
      "Love that. Pick a budget range and travel month and I'll spin up 5 perfect destinations.",
  },
  {
    keywords: ["weather", "rain", "monsoon"],
    reply:
      "I'll check real weather forecasts when you set dates. In general — avoid Goa Jul–Sep (monsoon), avoid Ladakh Nov–Apr (closed).",
  },
];

const DEFAULT_BOT_REPLY =
  "I'm Sarthi, your AI travel guide. Ask me anything about your trip or let me help modify your itinerary!";

// ---------------------------------------------------------------------------
// Lookup + formatter helpers (used by pages & components)
// ---------------------------------------------------------------------------

export function getItineraryById(id: string): Itinerary | undefined {
  return MOCK_ITINERARIES.find((it) => it.id === id);
}

export function getDestinationById(id: string): Destination | undefined {
  return MOCK_DESTINATIONS.find((d) => d.id === id);
}

export function getDestinationByName(name: string): Destination | undefined {
  return MOCK_DESTINATIONS.find(
    (d) => d.name.toLowerCase() === name.toLowerCase()
  );
}

export function getBudgetById(id: string): Budget | undefined {
  return MOCK_BUDGETS.find((b) => b.id === id);
}

export function getBudgetByItineraryId(itineraryId: string): Budget | undefined {
  return MOCK_BUDGETS.find((b) => b.itineraryId === itineraryId);
}

// ---------------------------------------------------------------------------
// Destination extras (Explore detail pages)
// ---------------------------------------------------------------------------

export interface DestinationExperience {
  emoji: string;
  title: string;
  description: string;
}

export interface DestinationFAQ {
  question: string;
  answer: string;
}

export interface DestinationExtras {
  topExperiences: DestinationExperience[];
  faqs: DestinationFAQ[];
  knownFor: string[];
  travelTime: string; // typical inbound travel time from a metro
}

export const DESTINATION_EXTRAS: Record<string, DestinationExtras> = {
  Goa: {
    knownFor: ["Beach shacks", "Sunsets", "Seafood", "Portuguese architecture"],
    travelTime: "~2.5h flight from Delhi · 1h from Mumbai",
    topExperiences: [
      {
        emoji: "🏖️",
        title: "Beach hop North to South",
        description:
          "Baga's a party, Anjuna's bohemian, Palolem's silent — pick your day.",
      },
      {
        emoji: "🛶",
        title: "Dudhsagar Falls jeep safari",
        description:
          "Tear through Bhagwan Mahavir sanctuary to one of India's tallest waterfalls.",
      },
      {
        emoji: "⛪",
        title: "Old Goa cathedrals",
        description:
          "UNESCO-protected Portuguese-era churches, including the Basilica of Bom Jesus.",
      },
      {
        emoji: "🌊",
        title: "Saturday Night Market",
        description:
          "Arpora's open-air bazaar — live music, hippie stalls, fresh seafood.",
      },
    ],
    faqs: [
      {
        question: "When is the best time to visit?",
        answer:
          "October to March. Monsoon (Jun–Sep) shuts most beach shacks and water sports, though the green hills are spectacular if you don't mind rain.",
      },
      {
        question: "North Goa or South Goa?",
        answer:
          "North for nightlife, flea markets, and busy beaches (Baga, Anjuna). South for quiet, palm-fringed coves and luxury resorts (Palolem, Agonda).",
      },
      {
        question: "Do I need a vehicle to get around?",
        answer:
          "Yes — rent a scooter for ₹400–600/day if you're confident, or take Goa Mile cabs. Distances between beaches are 30+ minutes by road.",
      },
      {
        question: "Is the nightlife open year-round?",
        answer:
          "Peak clubbing is Nov–Feb. Many venues close or scale back in monsoon. Tito's Lane and Cape Town Café are mainstays.",
      },
    ],
  },

  Rajasthan: {
    knownFor: ["Forts & palaces", "Desert", "Heritage hotels", "Bazaars"],
    travelTime: "~1h flight Delhi to Jaipur",
    topExperiences: [
      {
        emoji: "🏰",
        title: "Amber Fort jeep ride",
        description:
          "Ride up to one of India's most photographed forts and tour the Sheesh Mahal mirror room.",
      },
      {
        emoji: "🐪",
        title: "Pushkar camel safari",
        description:
          "Sunset rides through the Thar dunes followed by folk music around a bonfire.",
      },
      {
        emoji: "🍛",
        title: "Royal Rajasthani thali",
        description:
          "Daal baati churma, gatte ki sabzi, and ghewar at Chokhi Dhani's village experience.",
      },
      {
        emoji: "💎",
        title: "Johari Bazaar",
        description:
          "Jaipur's old jewellery district — gems sold by the gram in lanes 300+ years old.",
      },
    ],
    faqs: [
      {
        question: "When is the best time to visit?",
        answer:
          "November to February. Days are pleasant (18–24°C), evenings cool. Avoid May–June — peak summer in the desert pushes 45°C.",
      },
      {
        question: "How do I move between cities?",
        answer:
          "AC sedan with driver is the most flexible (Delhi → Agra → Jaipur is a classic triangle). For longer hauls, the Gatimaan Express and overnight trains are reliable.",
      },
      {
        question: "Is it safe for solo women travellers?",
        answer:
          "Yes — tourist-heavy zones (Jaipur, Jaisalmer, Udaipur) are well-trafficked. Stick to reputed hotels, avoid late-night solo walks in old-city alleys.",
      },
      {
        question: "What should I pack?",
        answer:
          "Modest, breathable cottons for daytime, a light shawl for evenings (Nov–Feb gets surprisingly cold in the desert), comfortable walking shoes for forts.",
      },
    ],
  },

  Manali: {
    knownFor: ["Snow", "Paragliding", "Cafés", "Hippie trail"],
    travelTime: "~14h Volvo from Delhi · 50min flight to Bhuntar",
    topExperiences: [
      {
        emoji: "🏔️",
        title: "Solang Valley adventure",
        description:
          "Paragliding, snow tubing, zorbing — India's busiest mountain-sports hub.",
      },
      {
        emoji: "🌲",
        title: "Hadimba Temple",
        description:
          "A 16th-century wooden pagoda hidden in the cedar forests of Dhungri.",
      },
      {
        emoji: "☕",
        title: "Old Manali cafés",
        description:
          "Live music, banana pancakes, and Beas River views at Drifters' Inn and Café 1947.",
      },
      {
        emoji: "🚙",
        title: "Atal Tunnel + Sissu",
        description:
          "Day excursion to the Lahaul side — frozen waterfalls and the Chandra River.",
      },
    ],
    faqs: [
      {
        question: "When is the best time for snow?",
        answer:
          "Mid-December to February at Solang Valley itself. Rohtang Pass opens May–June with the best high-altitude snow.",
      },
      {
        question: "Is Rohtang Pass always open?",
        answer:
          "No — the BRO opens it around mid-May and closes it with the first heavy snow (typically late October). Permit required, capped daily.",
      },
      {
        question: "How do I reach Manali?",
        answer:
          "Easiest: overnight Volvo from Delhi (~14h, ₹1500–2500). Or fly to Bhuntar Airport (Kullu) and drive 1.5h. Trains stop at Chandigarh, 8h away.",
      },
      {
        question: "Is it safe for solo travellers in winter?",
        answer:
          "Yes, but check weather before heading to Rohtang/Atal Tunnel — roads close on short notice. Old Manali has a strong solo-traveller café scene.",
      },
    ],
  },

  Kerala: {
    knownFor: ["Backwaters", "Tea estates", "Ayurveda", "Spice trade"],
    travelTime: "~3h flight from Delhi · 1.5h from Bengaluru",
    topExperiences: [
      {
        emoji: "🛶",
        title: "Alleppey houseboat",
        description:
          "Cruise the backwaters in a private kettuvallam with a chef cooking fresh fish curry on board.",
      },
      {
        emoji: "🍃",
        title: "Munnar tea estates",
        description:
          "Endless emerald slopes of Tata's tea gardens; visit a working factory for the full leaf-to-cup tour.",
      },
      {
        emoji: "🐘",
        title: "Periyar wildlife",
        description:
          "Bamboo rafting and elephant safaris in Thekkady's protected sanctuary.",
      },
      {
        emoji: "🧘",
        title: "Ayurvedic spa stay",
        description:
          "Traditional treatments at Kovalam or Varkala — the real thing, not the resort version.",
      },
    ],
    faqs: [
      {
        question: "When is the best time to visit?",
        answer:
          "September to March. Avoid monsoon (Jun–Aug) for beach trips, though Ayurvedic centres consider the rainy season therapeutically ideal.",
      },
      {
        question: "Are houseboats worth it?",
        answer:
          "Absolutely for one night — book early in peak season. Two nights starts feeling repetitive; better to split between Alleppey and Kumarakom.",
      },
      {
        question: "Is it good for families?",
        answer:
          "Excellent — slow pacing, kid-friendly food, safe to walk around, and houseboats are a hit with all ages.",
      },
      {
        question: "Vegetarian food availability?",
        answer:
          "Very wide. Sadya thali (banana-leaf vegetarian feast) is the regional specialty. Coastal towns lean fish-forward, but veg always available.",
      },
    ],
  },

  Varanasi: {
    knownFor: ["Ghats", "Aarti", "Silk weaving", "Spirituality"],
    travelTime: "~1.5h flight from Delhi · 1h from Lucknow",
    topExperiences: [
      {
        emoji: "🪔",
        title: "Ganga aarti",
        description:
          "The hour-long sunset prayer ceremony at Dashashwamedh Ghat is unlike anything else in India.",
      },
      {
        emoji: "🚣",
        title: "Pre-dawn boat ride",
        description:
          "Float past the cremation ghats as the city wakes up. Begin at 5am for the most ethereal light.",
      },
      {
        emoji: "🕉️",
        title: "Sarnath day trip",
        description:
          "Where the Buddha gave his first sermon — a quiet contrast to Varanasi's intensity.",
      },
      {
        emoji: "🧶",
        title: "Silk weavers' lane",
        description:
          "Watch Banarasi saris being woven on handlooms in family workshops in the old city.",
      },
    ],
    faqs: [
      {
        question: "When is the best time to visit?",
        answer:
          "October to March. Dev Diwali (Nov) is the single most spectacular night of the year — book months ahead.",
      },
      {
        question: "Is it safe for tourists?",
        answer:
          "Yes, tourist-friendly. Stay in established hotels near the ghats, be patient with the chaos, and politely decline aggressive 'guides' near temples.",
      },
      {
        question: "Where to stay near the ghats?",
        answer:
          "Assi Ghat is calmer and budget-friendly; Dashashwamedh is right at the action but noisier. Both have heritage stays from ₹2,000/night.",
      },
      {
        question: "How long do I need?",
        answer:
          "3 days is the sweet spot — one full day for the ghats, one for Sarnath, one to wander the lanes and let the city sink in.",
      },
    ],
  },

  "Andaman Islands": {
    knownFor: ["Coral reefs", "Beaches", "Scuba diving", "Quiet"],
    travelTime: "~2.5h flight to Port Blair from Chennai/Kolkata",
    topExperiences: [
      {
        emoji: "🤿",
        title: "PADI scuba certification",
        description:
          "Havelock's reefs are among India's clearest — 25m visibility is normal in season.",
      },
      {
        emoji: "🏝️",
        title: "Radhanagar Beach",
        description:
          "Voted Asia's best beach more than once — soft white sand and a perfect sunset.",
      },
      {
        emoji: "🌌",
        title: "Bioluminescent kayaking",
        description:
          "Plankton light up the water on moonless nights at Havelock — a once-in-a-lifetime paddle.",
      },
      {
        emoji: "🌴",
        title: "Neil Island",
        description:
          "Sleepy beaches, natural rock formations, and a fraction of the crowd of Havelock.",
      },
    ],
    faqs: [
      {
        question: "How do I reach the Andamans?",
        answer:
          "Fly to Port Blair (Veer Savarkar International) from Chennai/Kolkata/Bengaluru. From there, government and private ferries to Havelock & Neil (1.5–2.5h).",
      },
      {
        question: "Best time for diving?",
        answer:
          "December to mid-April. Avoid May–September monsoon — most operators close and visibility drops to ~5m.",
      },
      {
        question: "Are foreign citizens allowed everywhere?",
        answer:
          "Most tourist islands yes, but tribal-reserve areas (North Sentinel, parts of Strait Island) are strictly off-limits. Permit issued on arrival for foreigners.",
      },
      {
        question: "Mobile network availability?",
        answer:
          "BSNL and Airtel work in Port Blair / Havelock / Neil. Data is patchy on boats and at remote beaches — plan for offline maps.",
      },
    ],
  },
};

export function getDestinationExtras(name: string): DestinationExtras | undefined {
  return DESTINATION_EXTRAS[name];
}

// Token-based fuzzy match used by destination/package cards so clicks on
// "already pre-generated" trips skip the wizard and land directly on the
// itinerary view. Falls back to undefined when nothing useful matches.
export function findItineraryForDestination(
  name: string
): Itinerary | undefined {
  if (!name) return undefined;
  const tokens = name
    .toLowerCase()
    .split(/[·,\s/]+/)
    .filter((t) => t.length > 2);
  if (tokens.length === 0) return undefined;
  return MOCK_ITINERARIES.find((it) =>
    tokens.some(
      (t) =>
        it.destination.toLowerCase().includes(t) ||
        it.state.toLowerCase().includes(t) ||
        it.title.toLowerCase().includes(t)
    )
  );
}

// Pick the destination href for a card. Returns the itinerary view when we
// have a matching pre-baked trip, otherwise routes to the Generate wizard
// with the destination pre-filled so the user can customise from scratch.
export function destinationHref(name: string): string {
  const match = findItineraryForDestination(name);
  if (match) return `/itinerary/${match.id}`;
  return `/generate?destination=${encodeURIComponent(name)}`;
}

export function getPackagesByBucket(
  bucket: Package["durationBucket"]
): Package[] {
  return MOCK_PACKAGES.filter((p) => p.durationBucket === bucket);
}

export function getBotResponse(message: string, context: PageContext): string {
  const lower = message.toLowerCase();
  for (const rule of BOT_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.reply;
    }
  }
  // Light context flavour for the default fallback.
  if (context === "budget") {
    return "I can see your budget. Try asking 'add an expense', 'where can I save?', or 'rebalance categories'.";
  }
  if (context === "itinerary") {
    return "Tell me which day to change, or ask 'add an activity', 'swap a day', or 'change a restaurant'.";
  }
  return DEFAULT_BOT_REPLY;
}

export function getOpener(context: PageContext, destination?: string): string {
  if (context === "itinerary" && destination) {
    return `I can see your itinerary for ${destination}. What would you like to change? You can say things like "Add a heritage walk on Day 2" or "Replace the evening activity on Day 3".`;
  }
  return CONTEXT_OPENERS[context] ?? CONTEXT_OPENERS.default;
}

export function getSuggestedChips(context: PageContext): string[] {
  return CONTEXT_SUGGESTED_CHIPS[context] ?? CONTEXT_SUGGESTED_CHIPS.default;
}

export function formatINR(amount: number): string {
  // Indian numbering system: 1,00,000 not 100,000.
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}k`;
  return `₹${amount}`;
}

export function calcBudgetTotals(b: Budget) {
  const planned = b.categories.reduce((s, c) => s + c.planned, 0);
  const spent = b.categories.reduce((s, c) => s + c.spent, 0);
  const remaining = planned - spent;
  const percentUsed = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  return { planned, spent, remaining, percentUsed };
}
