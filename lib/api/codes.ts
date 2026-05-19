// lib/api/codes.ts
// City ↔ IATA airport code + Indian Railways station code mappings.
// Used by lib/api/amadeus.ts (flights) and lib/api/trains.ts (trains) to
// resolve a user-facing city name ("Delhi") into the code the API expects.
//
// Covers the ~50 most-trafficked Indian cities. For anything not in the maps,
// the lookup returns null and the caller marks that mode as unavailable.

interface CityRecord {
  iata?: string;       // primary airport IATA code (e.g. "DEL" for Delhi)
  station?: string;    // primary railway station code (e.g. "NDLS" for New Delhi)
  lat: number;
  lng: number;
}

// Key is the slug (kebab-case of name) so it matches our destinations table.
// Also indexed by lowercase display name in the lookup helpers below.
const CITIES: Record<string, CityRecord> = {
  // ---- Major metros / state capitals ----
  delhi:           { iata: "DEL", station: "NDLS", lat: 28.6139, lng: 77.2090 },
  mumbai:          { iata: "BOM", station: "BCT",  lat: 19.0760, lng: 72.8777 },
  bangalore:       { iata: "BLR", station: "SBC",  lat: 12.9716, lng: 77.5946 },
  chennai:         { iata: "MAA", station: "MAS",  lat: 13.0827, lng: 80.2707 },
  kolkata:         { iata: "CCU", station: "HWH",  lat: 22.5726, lng: 88.3639 },
  hyderabad:       { iata: "HYD", station: "SC",   lat: 17.3850, lng: 78.4867 },
  ahmedabad:       { iata: "AMD", station: "ADI",  lat: 23.0225, lng: 72.5714 },
  pune:            { iata: "PNQ", station: "PUNE", lat: 18.5204, lng: 73.8567 },
  jaipur:          { iata: "JAI", station: "JP",   lat: 26.9124, lng: 75.7873 },
  lucknow:         { iata: "LKO", station: "LKO",  lat: 26.8467, lng: 80.9462 },
  bhopal:          { iata: "BHO", station: "BPL",  lat: 23.2599, lng: 77.4126 },
  chandigarh:      { iata: "IXC", station: "CDG",  lat: 30.7333, lng: 76.7794 },
  ranchi:          { iata: "IXR", station: "RNC",  lat: 23.3441, lng: 85.3096 },
  bhubaneswar:     { iata: "BBI", station: "BBS",  lat: 20.2961, lng: 85.8245 },
  patna:           { iata: "PAT", station: "PNBE", lat: 25.5941, lng: 85.1376 },
  guwahati:        { iata: "GAU", station: "GHY",  lat: 26.1445, lng: 91.7362 },
  imphal:          { iata: "IMF",                   lat: 24.8170, lng: 93.9368 },
  agartala:        { iata: "IXA",                   lat: 23.8315, lng: 91.2868 },
  aizawl:          { iata: "AJL",                   lat: 23.7271, lng: 92.7176 },
  kohima:          {                                 lat: 25.6747, lng: 94.1100 },
  raipur:          { iata: "RPR", station: "R",    lat: 21.2514, lng: 81.6296 },
  thiruvananthapuram: { iata: "TRV", station: "TVC", lat: 8.5241,  lng: 76.9366 },
  vijayawada:      { iata: "VGA", station: "BZA",  lat: 16.5062, lng: 80.6480 },

  // ---- Tourist heavyweights ----
  goa:             { iata: "GOI", station: "MAO",   lat: 15.2993, lng: 74.1240 },
  agra:            { iata: "AGR", station: "AGC",  lat: 27.1767, lng: 78.0081 },
  varanasi:        { iata: "VNS", station: "BSB",  lat: 25.3176, lng: 82.9739 },
  udaipur:         { iata: "UDR", station: "UDZ",  lat: 24.5854, lng: 73.7125 },
  jodhpur:         { iata: "JDH", station: "JU",   lat: 26.2389, lng: 73.0243 },
  jaisalmer:       { iata: "JSA", station: "JSM",  lat: 26.9157, lng: 70.9083 },
  amritsar:        { iata: "ATQ", station: "ASR",  lat: 31.6340, lng: 74.8723 },
  srinagar:        { iata: "SXR",                   lat: 34.0837, lng: 74.7973 },
  leh:             { iata: "IXL",                   lat: 34.1526, lng: 77.5770 },
  manali:          { iata: "KUU",                   lat: 32.2396, lng: 77.1887 },
  shimla:          { iata: "SLV",                   lat: 31.1048, lng: 77.1734 },
  dharamshala:     { iata: "DHM",                   lat: 32.2190, lng: 76.3234 },
  dehradun:        { iata: "DED", station: "DDN",  lat: 30.3165, lng: 78.0322 },
  rishikesh:       {                station: "RKSH", lat: 30.0869, lng: 78.2676 },
  haridwar:        {                station: "HW",   lat: 29.9457, lng: 78.1642 },
  nainital:        {                                 lat: 29.3919, lng: 79.4542 },
  darjeeling:      {                                 lat: 27.0410, lng: 88.2663 },
  gangtok:         {                                 lat: 27.3389, lng: 88.6065 },
  shillong:        {                                 lat: 25.5788, lng: 91.8933 },
  kochi:           { iata: "COK", station: "ERS",  lat: 9.9312,  lng: 76.2673 },
  alleppey:        {                station: "ALLP", lat: 9.4981,  lng: 76.3388 },
  munnar:          {                                 lat: 10.0889, lng: 77.0595 },
  mysore:          { iata: "MYQ", station: "MYS",  lat: 12.2958, lng: 76.6394 },
  pondicherry:     { iata: "PNY", station: "PDY",  lat: 11.9416, lng: 79.8083 },
  madurai:         { iata: "IXM", station: "MDU",  lat: 9.9252,  lng: 78.1198 },
  ooty:            {                station: "UAM",  lat: 11.4102, lng: 76.6950 },
  hampi:           {                station: "HPT",  lat: 15.3350, lng: 76.4600 },
  visakhapatnam:   { iata: "VTZ", station: "VSKP", lat: 17.6868, lng: 83.2185 },
  tirupati:        { iata: "TIR", station: "TPTY", lat: 13.6288, lng: 79.4192 },
  "port-blair":    { iata: "IXZ",                   lat: 11.6234, lng: 92.7265 },
  bagdogra:        { iata: "IXB",                   lat: 26.6812, lng: 88.3286 },
  jammu:           { iata: "IXJ", station: "JAT",  lat: 32.7266, lng: 74.8570 },
  dimapur:         { iata: "DMU",                   lat: 25.8967, lng: 93.7186 },
  aurangabad:      { iata: "IXU", station: "AWB",  lat: 19.8762, lng: 75.3433 },
  vadodara:        { iata: "BDQ", station: "BRC",  lat: 22.3072, lng: 73.1812 },
  surat:           { iata: "STV", station: "ST",   lat: 21.1702, lng: 72.8311 },
};

// Some city names alias to slugs that have hyphens or different spellings.
// Map common user inputs → canonical slug used in CITIES.
const ALIASES: Record<string, string> = {
  "new delhi": "delhi",
  "bengaluru": "bangalore",
  "mysuru": "mysore",
  "kolkata": "kolkata",
  "calcutta": "kolkata",
  "bombay": "mumbai",
  "madras": "chennai",
  "trivandrum": "thiruvananthapuram",
  "kochi (cochin)": "kochi",
  "cochin": "kochi",
  "ernakulam": "kochi",
  "puducherry": "pondicherry",
  "alappuzha": "alleppey",
  "port blair": "port-blair",
  "vizag": "visakhapatnam",
};

function resolveSlug(input: string): string {
  const norm = input.toLowerCase().trim().replace(/\s+/g, " ");
  return ALIASES[norm] ?? norm.replace(/\s+/g, "-");
}

export function findAirport(city: string): string | null {
  const slug = resolveSlug(city);
  return CITIES[slug]?.iata ?? null;
}

export function findStation(city: string): string | null {
  const slug = resolveSlug(city);
  return CITIES[slug]?.station ?? null;
}

export function findCoords(city: string): { lat: number; lng: number } | null {
  const slug = resolveSlug(city);
  const c = CITIES[slug];
  return c ? { lat: c.lat, lng: c.lng } : null;
}

// Haversine distance between two cities (km). Returns null if either is unknown.
export function distanceBetween(cityA: string, cityB: string): number | null {
  const a = findCoords(cityA);
  const b = findCoords(cityB);
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
