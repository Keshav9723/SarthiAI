// scripts/scrape/config.ts
// The master list of Indian destinations the scraper iterates over. Grouped by
// state for review. Override `wikivoyageTitle` / `wikipediaTitle` when the
// destination's article on that site uses a different name than ours.
//
// Add a destination by appending a `d(...)` line. The orchestrator iterates
// every entry in DESTINATIONS — no other files need to change.

import type { DestinationConfig } from "./types";

// User-Agent used on every outbound HTTP request. Wikimedia + most polite
// scrape targets require a *real* contact in here. Update if forking.
export const USER_AGENT =
  "Sarthi-Travel-RAG/0.1 (https://github.com/keshav/sarthi; college major project; sarthiai18@gmail.com)";

// Polite delay between requests to the SAME domain. Wikimedia explicitly asks
// for ≤200 req/s across all clients globally — 1.2s per request is overkill-safe.
export const POLITE_DELAY_MS = 1200;

// Retry config for transient network failures.
export const FETCH_MAX_RETRIES = 3;
export const FETCH_RETRY_BASE_MS = 1500;

// Ollama endpoint + model names.
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const EMBED_MODEL = "mxbai-embed-large";
export const CLASSIFIER_MODEL = "qwen2.5:1.5b";
export const EMBED_DIMS = 1024;

// Tier 2 classification thresholds (zero-shot embedding similarity).
export const CLASSIFY_T2_MIN_SCORE = 0.55;   // top category must clear this
export const CLASSIFY_T2_MIN_MARGIN = 0.05;  // ...and beat #2 by this margin

// Chunker config.
export const CHUNK_MIN_TOKENS = 50;
export const CHUNK_MAX_TOKENS = 700;
export const CHUNK_TARGET_TOKENS = 450;
export const CHUNK_OVERLAP_TOKENS = 100;

// ---------------------------------------------------------------------------
// Destination list
// ---------------------------------------------------------------------------

function d(
  slug: string,
  name: string,
  state: string,
  region: DestinationConfig["region"],
  destinationType: DestinationConfig["destinationType"],
  overrides: Partial<Pick<DestinationConfig, "wikivoyageTitle" | "wikipediaTitle" | "skipWikivoyage">> = {}
): DestinationConfig {
  return {
    slug,
    name,
    state,
    region,
    destinationType,
    wikivoyageTitle: overrides.wikivoyageTitle ?? name.replace(/ /g, "_"),
    wikipediaTitle: overrides.wikipediaTitle ?? name.replace(/ /g, "_"),
    skipWikivoyage: overrides.skipWikivoyage,
  };
}

export const DESTINATIONS: DestinationConfig[] = [
  // ---------- Delhi (UT) ----------
  d("delhi", "Delhi", "Delhi", "north", "metro"),

  // ---------- Uttar Pradesh ----------
  d("agra", "Agra", "Uttar Pradesh", "north", "heritage"),
  d("varanasi", "Varanasi", "Uttar Pradesh", "north", "pilgrimage"),
  d("mathura", "Mathura", "Uttar Pradesh", "north", "pilgrimage"),
  d("vrindavan", "Vrindavan", "Uttar Pradesh", "north", "pilgrimage"),
  d("lucknow", "Lucknow", "Uttar Pradesh", "north", "city"),
  d("ayodhya", "Ayodhya", "Uttar Pradesh", "north", "pilgrimage"),
  d("prayagraj", "Prayagraj", "Uttar Pradesh", "north", "pilgrimage", { wikipediaTitle: "Prayagraj", wikivoyageTitle: "Allahabad" }),
  d("fatehpur-sikri", "Fatehpur Sikri", "Uttar Pradesh", "north", "heritage"),
  d("sarnath", "Sarnath", "Uttar Pradesh", "north", "pilgrimage"),
  d("jhansi", "Jhansi", "Uttar Pradesh", "north", "heritage"),
  d("kushinagar", "Kushinagar", "Uttar Pradesh", "north", "pilgrimage"),
  d("chitrakoot", "Chitrakoot", "Uttar Pradesh", "north", "pilgrimage"),

  // ---------- Rajasthan ----------
  d("jaipur", "Jaipur", "Rajasthan", "north", "heritage"),
  d("udaipur", "Udaipur", "Rajasthan", "north", "heritage"),
  d("jodhpur", "Jodhpur", "Rajasthan", "north", "heritage"),
  d("jaisalmer", "Jaisalmer", "Rajasthan", "north", "desert"),
  d("pushkar", "Pushkar", "Rajasthan", "north", "pilgrimage"),
  d("bikaner", "Bikaner", "Rajasthan", "north", "desert"),
  d("mount-abu", "Mount Abu", "Rajasthan", "north", "hill_station"),
  d("ranthambore", "Ranthambore", "Rajasthan", "north", "wildlife", { wikivoyageTitle: "Ranthambore_National_Park", wikipediaTitle: "Ranthambore_National_Park" }),
  d("chittorgarh", "Chittorgarh", "Rajasthan", "north", "heritage"),
  d("bundi", "Bundi", "Rajasthan", "north", "heritage"),
  d("ajmer", "Ajmer", "Rajasthan", "north", "pilgrimage"),
  d("alwar", "Alwar", "Rajasthan", "north", "heritage"),
  d("sariska", "Sariska", "Rajasthan", "north", "wildlife", { wikivoyageTitle: "Sariska_National_Park", wikipediaTitle: "Sariska_Tiger_Reserve" }),
  d("shekhawati", "Shekhawati", "Rajasthan", "north", "heritage"),
  d("kumbhalgarh", "Kumbhalgarh", "Rajasthan", "north", "heritage"),
  d("neemrana", "Neemrana", "Rajasthan", "north", "heritage", { skipWikivoyage: true }),

  // ---------- Uttarakhand ----------
  d("rishikesh", "Rishikesh", "Uttarakhand", "himalayan", "pilgrimage"),
  d("haridwar", "Haridwar", "Uttarakhand", "himalayan", "pilgrimage"),
  d("nainital", "Nainital", "Uttarakhand", "himalayan", "hill_station"),
  d("mussoorie", "Mussoorie", "Uttarakhand", "himalayan", "hill_station"),
  d("dehradun", "Dehradun", "Uttarakhand", "himalayan", "city"),
  d("auli", "Auli", "Uttarakhand", "himalayan", "snow"),
  d("jim-corbett", "Jim Corbett", "Uttarakhand", "himalayan", "wildlife", { wikivoyageTitle: "Jim_Corbett_National_Park", wikipediaTitle: "Jim_Corbett_National_Park" }),
  d("valley-of-flowers", "Valley of Flowers", "Uttarakhand", "himalayan", "snow", { wikivoyageTitle: "Valley_of_Flowers_National_Park", wikipediaTitle: "Valley_of_Flowers_National_Park" }),
  d("kedarnath", "Kedarnath", "Uttarakhand", "himalayan", "pilgrimage"),
  d("badrinath", "Badrinath", "Uttarakhand", "himalayan", "pilgrimage"),
  d("gangotri", "Gangotri", "Uttarakhand", "himalayan", "pilgrimage"),
  d("yamunotri", "Yamunotri", "Uttarakhand", "himalayan", "pilgrimage"),
  d("chopta", "Chopta", "Uttarakhand", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("tungnath", "Tungnath", "Uttarakhand", "himalayan", "pilgrimage", { skipWikivoyage: true }),
  d("binsar", "Binsar", "Uttarakhand", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("mukteshwar", "Mukteshwar", "Uttarakhand", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("ranikhet", "Ranikhet", "Uttarakhand", "himalayan", "hill_station"),
  d("kausani", "Kausani", "Uttarakhand", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("lansdowne", "Lansdowne", "Uttarakhand", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("pangot", "Pangot", "Uttarakhand", "himalayan", "offbeat", { skipWikivoyage: true }),

  // ---------- Himachal Pradesh ----------
  d("shimla", "Shimla", "Himachal Pradesh", "himalayan", "hill_station"),
  d("manali", "Manali", "Himachal Pradesh", "himalayan", "hill_station"),
  d("dharamshala", "Dharamshala", "Himachal Pradesh", "himalayan", "hill_station"),
  d("mcleodganj", "McLeodganj", "Himachal Pradesh", "himalayan", "hill_station", { wikivoyageTitle: "McLeod_Ganj", wikipediaTitle: "McLeod_Ganj" }),
  d("kasol", "Kasol", "Himachal Pradesh", "himalayan", "offbeat"),
  d("spiti-valley", "Spiti Valley", "Himachal Pradesh", "himalayan", "snow", { wikivoyageTitle: "Spiti_Valley", wikipediaTitle: "Spiti_Valley" }),
  d("kaza", "Kaza", "Himachal Pradesh", "himalayan", "snow", { wikipediaTitle: "Kaza,_Himachal_Pradesh" }),
  d("kinnaur", "Kinnaur", "Himachal Pradesh", "himalayan", "snow", { wikipediaTitle: "Kinnaur_district" }),
  d("kufri", "Kufri", "Himachal Pradesh", "himalayan", "hill_station"),
  d("dalhousie", "Dalhousie", "Himachal Pradesh", "himalayan", "hill_station", { wikipediaTitle: "Dalhousie,_India" }),
  d("khajjiar", "Khajjiar", "Himachal Pradesh", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("bir-billing", "Bir Billing", "Himachal Pradesh", "himalayan", "offbeat", { wikipediaTitle: "Bir,_Himachal_Pradesh", skipWikivoyage: true }),
  d("tirthan-valley", "Tirthan Valley", "Himachal Pradesh", "himalayan", "offbeat", { skipWikivoyage: true }),
  d("kullu", "Kullu", "Himachal Pradesh", "himalayan", "hill_station"),
  d("solang-valley", "Solang Valley", "Himachal Pradesh", "himalayan", "snow", { skipWikivoyage: true }),
  d("chitkul", "Chitkul", "Himachal Pradesh", "himalayan", "offbeat", { skipWikivoyage: true }),
  d("tabo", "Tabo", "Himachal Pradesh", "himalayan", "snow"),
  d("kalpa", "Kalpa", "Himachal Pradesh", "himalayan", "snow", { skipWikivoyage: true }),

  // ---------- Jammu & Kashmir ----------
  d("srinagar", "Srinagar", "Jammu and Kashmir", "himalayan", "hill_station"),
  d("gulmarg", "Gulmarg", "Jammu and Kashmir", "himalayan", "snow"),
  d("pahalgam", "Pahalgam", "Jammu and Kashmir", "himalayan", "snow"),
  d("sonamarg", "Sonamarg", "Jammu and Kashmir", "himalayan", "snow"),
  d("yusmarg", "Yusmarg", "Jammu and Kashmir", "himalayan", "offbeat", { skipWikivoyage: true }),
  d("patnitop", "Patnitop", "Jammu and Kashmir", "himalayan", "hill_station", { skipWikivoyage: true }),
  d("katra", "Katra (Vaishno Devi)", "Jammu and Kashmir", "himalayan", "pilgrimage", { wikipediaTitle: "Katra,_Jammu_and_Kashmir", wikivoyageTitle: "Katra" }),
  d("doodhpathri", "Doodhpathri", "Jammu and Kashmir", "himalayan", "offbeat", { skipWikivoyage: true }),

  // ---------- Ladakh (UT) ----------
  d("leh", "Leh", "Ladakh", "himalayan", "snow"),
  d("nubra-valley", "Nubra Valley", "Ladakh", "himalayan", "snow", { wikivoyageTitle: "Nubra_Valley", wikipediaTitle: "Nubra" }),
  d("pangong-lake", "Pangong Lake", "Ladakh", "himalayan", "snow", { wikipediaTitle: "Pangong_Tso", skipWikivoyage: true }),
  d("tso-moriri", "Tso Moriri", "Ladakh", "himalayan", "snow", { skipWikivoyage: true }),
  d("zanskar", "Zanskar", "Ladakh", "himalayan", "snow"),
  d("kargil", "Kargil", "Ladakh", "himalayan", "snow"),
  d("alchi", "Alchi", "Ladakh", "himalayan", "heritage", { wikipediaTitle: "Alchi_Monastery", skipWikivoyage: true }),
  d("lamayuru", "Lamayuru", "Ladakh", "himalayan", "heritage", { wikipediaTitle: "Lamayuru_Monastery", skipWikivoyage: true }),
  d("hemis", "Hemis", "Ladakh", "himalayan", "heritage", { wikipediaTitle: "Hemis_Monastery", skipWikivoyage: true }),
  d("hanle", "Hanle", "Ladakh", "himalayan", "offbeat", { skipWikivoyage: true }),
  d("turtuk", "Turtuk", "Ladakh", "himalayan", "offbeat", { skipWikivoyage: true }),

  // ---------- Punjab ----------
  d("amritsar", "Amritsar", "Punjab", "north", "pilgrimage"),
  d("chandigarh", "Chandigarh", "Chandigarh", "north", "city"),
  d("anandpur-sahib", "Anandpur Sahib", "Punjab", "north", "pilgrimage", { skipWikivoyage: true }),
  d("patiala", "Patiala", "Punjab", "north", "heritage"),

  // ---------- Haryana ----------
  d("kurukshetra", "Kurukshetra", "Haryana", "north", "pilgrimage"),
  d("sultanpur-haryana", "Sultanpur National Park", "Haryana", "north", "wildlife", { wikipediaTitle: "Sultanpur_National_Park", skipWikivoyage: true }),
  d("morni-hills", "Morni Hills", "Haryana", "north", "hill_station", { wikipediaTitle: "Morni", skipWikivoyage: true }),
  d("damdama", "Damdama", "Haryana", "north", "offbeat", { wikipediaTitle: "Damdama_Lake", skipWikivoyage: true }),
  d("sohna", "Sohna", "Haryana", "north", "offbeat", { wikipediaTitle: "Sohna,_Haryana", skipWikivoyage: true }),

  // ---------- Gujarat ----------
  d("ahmedabad", "Ahmedabad", "Gujarat", "west", "city"),
  d("rann-of-kutch", "Rann of Kutch", "Gujarat", "west", "desert", { wikipediaTitle: "Rann_of_Kutch" }),
  d("bhuj", "Bhuj", "Gujarat", "west", "desert"),
  d("dwarka", "Dwarka", "Gujarat", "west", "pilgrimage"),
  d("somnath", "Somnath", "Gujarat", "west", "pilgrimage"),
  d("gir", "Gir National Park", "Gujarat", "west", "wildlife", { wikipediaTitle: "Gir_National_Park", wikivoyageTitle: "Gir_National_Park" }),
  d("statue-of-unity", "Statue of Unity (Kevadia)", "Gujarat", "west", "heritage", { wikipediaTitle: "Statue_of_Unity", wikivoyageTitle: "Kevadia" }),
  d("junagadh", "Junagadh", "Gujarat", "west", "heritage"),
  d("diu", "Diu", "Gujarat", "west", "beach"),
  d("saputara", "Saputara", "Gujarat", "west", "hill_station", { skipWikivoyage: true }),
  d("champaner", "Champaner-Pavagadh", "Gujarat", "west", "heritage", { wikipediaTitle: "Champaner-Pavagadh_Archaeological_Park", skipWikivoyage: true }),
  d("modhera", "Modhera", "Gujarat", "west", "heritage", { wikipediaTitle: "Modhera_Sun_Temple", skipWikivoyage: true }),
  d("palitana", "Palitana", "Gujarat", "west", "pilgrimage"),
  d("porbandar", "Porbandar", "Gujarat", "west", "beach"),

  // ---------- Maharashtra ----------
  d("mumbai", "Mumbai", "Maharashtra", "west", "metro"),
  d("pune", "Pune", "Maharashtra", "west", "city"),
  d("aurangabad", "Aurangabad", "Maharashtra", "west", "heritage", { wikipediaTitle: "Aurangabad,_Maharashtra" }),
  d("ajanta-ellora", "Ajanta and Ellora", "Maharashtra", "west", "heritage", { wikipediaTitle: "Ajanta_Caves", wikivoyageTitle: "Ajanta_and_Ellora_Caves" }),
  d("lonavala", "Lonavala", "Maharashtra", "west", "hill_station"),
  d("khandala", "Khandala", "Maharashtra", "west", "hill_station", { skipWikivoyage: true }),
  d("mahabaleshwar", "Mahabaleshwar", "Maharashtra", "west", "hill_station"),
  d("panchgani", "Panchgani", "Maharashtra", "west", "hill_station"),
  d("matheran", "Matheran", "Maharashtra", "west", "hill_station"),
  d("igatpuri", "Igatpuri", "Maharashtra", "west", "hill_station", { skipWikivoyage: true }),
  d("kolhapur", "Kolhapur", "Maharashtra", "west", "city"),
  d("nashik", "Nashik", "Maharashtra", "west", "pilgrimage"),
  d("shirdi", "Shirdi", "Maharashtra", "west", "pilgrimage"),
  d("tadoba", "Tadoba", "Maharashtra", "west", "wildlife", { wikipediaTitle: "Tadoba_Andhari_Tiger_Reserve", wikivoyageTitle: "Tadoba_National_Park" }),
  d("alibaug", "Alibaug", "Maharashtra", "west", "beach"),
  d("murud-janjira", "Murud-Janjira", "Maharashtra", "west", "heritage", { wikipediaTitle: "Murud-Janjira", skipWikivoyage: true }),
  d("ratnagiri", "Ratnagiri", "Maharashtra", "west", "beach"),
  d("sindhudurg", "Sindhudurg", "Maharashtra", "west", "beach", { wikipediaTitle: "Sindhudurg_district", skipWikivoyage: true }),
  d("tarkarli", "Tarkarli", "Maharashtra", "west", "beach", { skipWikivoyage: true }),
  d("bhandardara", "Bhandardara", "Maharashtra", "west", "offbeat", { skipWikivoyage: true }),

  // ---------- Goa ----------
  d("goa", "Goa", "Goa", "west", "beach"),
  d("dudhsagar-falls", "Dudhsagar Falls", "Goa", "west", "nature", { wikipediaTitle: "Dudhsagar_Falls", skipWikivoyage: true }),

  // ---------- Karnataka ----------
  d("bangalore", "Bengaluru", "Karnataka", "south", "metro", { wikivoyageTitle: "Bangalore", wikipediaTitle: "Bangalore" }),
  d("mysore", "Mysuru", "Karnataka", "south", "heritage", { wikivoyageTitle: "Mysore", wikipediaTitle: "Mysore" }),
  d("hampi", "Hampi", "Karnataka", "south", "heritage"),
  d("coorg", "Coorg", "Karnataka", "south", "hill_station", { wikipediaTitle: "Kodagu_district" }),
  d("chikmagalur", "Chikmagalur", "Karnataka", "south", "hill_station"),
  d("gokarna", "Gokarna", "Karnataka", "south", "beach", { wikipediaTitle: "Gokarna,_Karnataka" }),
  d("murudeshwar", "Murudeshwar", "Karnataka", "south", "beach"),
  d("udupi", "Udupi", "Karnataka", "south", "pilgrimage"),
  d("mangalore", "Mangaluru", "Karnataka", "south", "city", { wikivoyageTitle: "Mangalore", wikipediaTitle: "Mangalore" }),
  d("badami", "Badami", "Karnataka", "south", "heritage"),
  d("pattadakal", "Pattadakal", "Karnataka", "south", "heritage", { skipWikivoyage: true }),
  d("aihole", "Aihole", "Karnataka", "south", "heritage", { skipWikivoyage: true }),
  d("bijapur", "Bijapur", "Karnataka", "south", "heritage", { wikipediaTitle: "Vijayapura" }),
  d("hassan", "Hassan", "Karnataka", "south", "heritage", { wikipediaTitle: "Hassan,_Karnataka" }),
  d("belur", "Belur", "Karnataka", "south", "heritage", { wikipediaTitle: "Belur,_Karnataka", skipWikivoyage: true }),
  d("halebidu", "Halebidu", "Karnataka", "south", "heritage", { skipWikivoyage: true }),
  d("sravanabelagola", "Sravanabelagola", "Karnataka", "south", "pilgrimage", { skipWikivoyage: true }),
  d("bandipur", "Bandipur", "Karnataka", "south", "wildlife", { wikipediaTitle: "Bandipur_National_Park", wikivoyageTitle: "Bandipur_National_Park" }),
  d("nagarhole", "Nagarhole", "Karnataka", "south", "wildlife", { wikipediaTitle: "Nagarhole_National_Park", skipWikivoyage: true }),
  d("jog-falls", "Jog Falls", "Karnataka", "south", "nature", { skipWikivoyage: true }),
  d("kabini", "Kabini", "Karnataka", "south", "wildlife", { wikipediaTitle: "Kabini", skipWikivoyage: true }),
  d("sakleshpur", "Sakleshpur", "Karnataka", "south", "hill_station", { skipWikivoyage: true }),

  // ---------- Kerala ----------
  d("kochi", "Kochi", "Kerala", "south", "heritage"),
  d("alleppey", "Alleppey", "Kerala", "south", "beach", { wikipediaTitle: "Alappuzha" }),
  d("munnar", "Munnar", "Kerala", "south", "hill_station"),
  d("thekkady", "Thekkady", "Kerala", "south", "wildlife", { wikipediaTitle: "Periyar_National_Park" }),
  d("kumarakom", "Kumarakom", "Kerala", "south", "beach"),
  d("wayanad", "Wayanad", "Kerala", "south", "hill_station"),
  d("varkala", "Varkala", "Kerala", "south", "beach"),
  d("kovalam", "Kovalam", "Kerala", "south", "beach"),
  d("thiruvananthapuram", "Thiruvananthapuram", "Kerala", "south", "city"),
  d("kannur", "Kannur", "Kerala", "south", "beach"),
  d("bekal", "Bekal", "Kerala", "south", "beach", { wikipediaTitle: "Bekal_Fort", skipWikivoyage: true }),
  d("athirappilly", "Athirappilly", "Kerala", "south", "nature", { wikipediaTitle: "Athirappilly_Falls", skipWikivoyage: true }),
  d("vagamon", "Vagamon", "Kerala", "south", "hill_station", { skipWikivoyage: true }),
  d("idukki", "Idukki", "Kerala", "south", "hill_station"),
  d("poovar", "Poovar", "Kerala", "south", "beach", { skipWikivoyage: true }),

  // ---------- Tamil Nadu ----------
  d("chennai", "Chennai", "Tamil Nadu", "south", "metro"),
  d("madurai", "Madurai", "Tamil Nadu", "south", "pilgrimage"),
  d("mahabalipuram", "Mahabalipuram", "Tamil Nadu", "south", "heritage"),
  d("kanchipuram", "Kanchipuram", "Tamil Nadu", "south", "pilgrimage"),
  d("pondicherry", "Pondicherry", "Puducherry", "south", "beach"),
  d("ooty", "Ooty", "Tamil Nadu", "south", "hill_station"),
  d("kodaikanal", "Kodaikanal", "Tamil Nadu", "south", "hill_station"),
  d("coonoor", "Coonoor", "Tamil Nadu", "south", "hill_station"),
  d("thanjavur", "Thanjavur", "Tamil Nadu", "south", "heritage"),
  d("tiruchirappalli", "Tiruchirappalli", "Tamil Nadu", "south", "heritage"),
  d("rameswaram", "Rameswaram", "Tamil Nadu", "south", "pilgrimage"),
  d("kanyakumari", "Kanyakumari", "Tamil Nadu", "south", "pilgrimage"),
  d("yercaud", "Yercaud", "Tamil Nadu", "south", "hill_station", { skipWikivoyage: true }),
  d("tranquebar", "Tranquebar", "Tamil Nadu", "south", "heritage", { wikipediaTitle: "Tharangambadi", skipWikivoyage: true }),
  d("karaikudi", "Karaikudi", "Tamil Nadu", "south", "heritage"),
  d("hogenakkal", "Hogenakkal", "Tamil Nadu", "south", "nature", { wikipediaTitle: "Hogenakkal_Falls", skipWikivoyage: true }),
  d("valparai", "Valparai", "Tamil Nadu", "south", "hill_station", { skipWikivoyage: true }),
  d("yelagiri", "Yelagiri", "Tamil Nadu", "south", "hill_station", { skipWikivoyage: true }),

  // ---------- Andhra Pradesh ----------
  d("tirupati", "Tirupati", "Andhra Pradesh", "south", "pilgrimage"),
  d("visakhapatnam", "Visakhapatnam", "Andhra Pradesh", "south", "city"),
  d("araku-valley", "Araku Valley", "Andhra Pradesh", "south", "hill_station", { skipWikivoyage: true }),
  d("vijayawada", "Vijayawada", "Andhra Pradesh", "south", "city"),
  d("amaravati", "Amaravati", "Andhra Pradesh", "south", "heritage", { wikipediaTitle: "Amaravati" }),
  d("lepakshi", "Lepakshi", "Andhra Pradesh", "south", "heritage", { skipWikivoyage: true }),
  d("gandikota", "Gandikota", "Andhra Pradesh", "south", "nature", { skipWikivoyage: true }),
  d("horsley-hills", "Horsley Hills", "Andhra Pradesh", "south", "hill_station", { skipWikivoyage: true }),
  d("srisailam", "Srisailam", "Andhra Pradesh", "south", "pilgrimage"),

  // ---------- Telangana ----------
  d("hyderabad", "Hyderabad", "Telangana", "south", "metro"),
  d("warangal", "Warangal", "Telangana", "south", "heritage"),
  d("ramoji-film-city", "Ramoji Film City", "Telangana", "south", "offbeat", { skipWikivoyage: true }),
  d("bhadrachalam", "Bhadrachalam", "Telangana", "south", "pilgrimage", { skipWikivoyage: true }),
  d("pochampally", "Pochampally", "Telangana", "south", "heritage", { wikipediaTitle: "Bhoodan_Pochampally", skipWikivoyage: true }),

  // ---------- Odisha ----------
  d("puri", "Puri", "Odisha", "east", "beach"),
  d("bhubaneswar", "Bhubaneswar", "Odisha", "east", "heritage"),
  d("konark", "Konark", "Odisha", "east", "heritage"),
  d("chilika-lake", "Chilika Lake", "Odisha", "east", "nature", { wikipediaTitle: "Chilika_Lake", skipWikivoyage: true }),
  d("gopalpur", "Gopalpur", "Odisha", "east", "beach", { wikipediaTitle: "Gopalpur,_Odisha", skipWikivoyage: true }),
  d("daringbadi", "Daringbadi", "Odisha", "east", "hill_station", { skipWikivoyage: true }),
  d("hirakud", "Hirakud", "Odisha", "east", "nature", { wikipediaTitle: "Hirakud_Dam", skipWikivoyage: true }),
  d("similipal", "Similipal", "Odisha", "east", "wildlife", { wikipediaTitle: "Similipal_National_Park", skipWikivoyage: true }),

  // ---------- West Bengal ----------
  d("kolkata", "Kolkata", "West Bengal", "east", "metro"),
  d("darjeeling", "Darjeeling", "West Bengal", "east", "hill_station"),
  d("kalimpong", "Kalimpong", "West Bengal", "east", "hill_station"),
  d("kurseong", "Kurseong", "West Bengal", "east", "hill_station", { skipWikivoyage: true }),
  d("mirik", "Mirik", "West Bengal", "east", "hill_station", { skipWikivoyage: true }),
  d("sundarbans", "Sundarbans", "West Bengal", "east", "wildlife", { wikipediaTitle: "Sundarbans" }),
  d("digha", "Digha", "West Bengal", "east", "beach", { wikipediaTitle: "Digha,_West_Bengal", skipWikivoyage: true }),
  d("mandarmani", "Mandarmani", "West Bengal", "east", "beach", { skipWikivoyage: true }),
  d("murshidabad", "Murshidabad", "West Bengal", "east", "heritage"),
  d("shantiniketan", "Shantiniketan", "West Bengal", "east", "heritage"),
  d("dooars", "Dooars", "West Bengal", "east", "wildlife", { skipWikivoyage: true }),
  d("gorumara", "Gorumara", "West Bengal", "east", "wildlife", { wikipediaTitle: "Gorumara_National_Park", skipWikivoyage: true }),

  // ---------- Sikkim ----------
  d("gangtok", "Gangtok", "Sikkim", "northeast", "hill_station"),
  d("pelling", "Pelling", "Sikkim", "northeast", "hill_station"),
  d("lachung", "Lachung", "Sikkim", "northeast", "snow", { skipWikivoyage: true }),
  d("lachen", "Lachen", "Sikkim", "northeast", "snow", { skipWikivoyage: true }),
  d("yumthang", "Yumthang", "Sikkim", "northeast", "snow", { wikipediaTitle: "Yumthang_Valley", skipWikivoyage: true }),
  d("tsomgo-lake", "Tsomgo Lake", "Sikkim", "northeast", "snow", { wikipediaTitle: "Tsomgo_Lake", skipWikivoyage: true }),
  d("nathu-la", "Nathu La", "Sikkim", "northeast", "snow", { skipWikivoyage: true }),
  d("yuksom", "Yuksom", "Sikkim", "northeast", "offbeat", { skipWikivoyage: true }),
  d("ravangla", "Ravangla", "Sikkim", "northeast", "hill_station", { skipWikivoyage: true }),
  d("gurudongmar-lake", "Gurudongmar Lake", "Sikkim", "northeast", "snow", { wikipediaTitle: "Gurudongmar_Lake", skipWikivoyage: true }),

  // ---------- Assam ----------
  d("guwahati", "Guwahati", "Assam", "northeast", "city"),
  d("kaziranga", "Kaziranga", "Assam", "northeast", "wildlife", { wikipediaTitle: "Kaziranga_National_Park", wikivoyageTitle: "Kaziranga_National_Park" }),
  d("majuli", "Majuli", "Assam", "northeast", "offbeat"),
  d("manas", "Manas", "Assam", "northeast", "wildlife", { wikipediaTitle: "Manas_National_Park", wikivoyageTitle: "Manas_National_Park" }),
  d("sivasagar", "Sivasagar", "Assam", "northeast", "heritage", { skipWikivoyage: true }),
  d("tezpur", "Tezpur", "Assam", "northeast", "city"),
  d("haflong", "Haflong", "Assam", "northeast", "hill_station", { skipWikivoyage: true }),

  // ---------- Meghalaya ----------
  d("shillong", "Shillong", "Meghalaya", "northeast", "hill_station"),
  d("cherrapunji", "Cherrapunji", "Meghalaya", "northeast", "nature", { wikipediaTitle: "Sohra" }),
  d("mawlynnong", "Mawlynnong", "Meghalaya", "northeast", "offbeat", { skipWikivoyage: true }),
  d("dawki", "Dawki", "Meghalaya", "northeast", "nature", { skipWikivoyage: true }),
  d("mawsynram", "Mawsynram", "Meghalaya", "northeast", "nature", { skipWikivoyage: true }),
  d("nongriat", "Nongriat", "Meghalaya", "northeast", "offbeat", { skipWikivoyage: true }),
  d("jowai", "Jowai", "Meghalaya", "northeast", "offbeat", { skipWikivoyage: true }),

  // ---------- Arunachal Pradesh ----------
  d("tawang", "Tawang", "Arunachal Pradesh", "northeast", "snow"),
  d("bomdila", "Bomdila", "Arunachal Pradesh", "northeast", "hill_station", { skipWikivoyage: true }),
  d("ziro", "Ziro", "Arunachal Pradesh", "northeast", "offbeat", { wikipediaTitle: "Ziro_Valley", skipWikivoyage: true }),
  d("pasighat", "Pasighat", "Arunachal Pradesh", "northeast", "offbeat", { skipWikivoyage: true }),
  d("roing", "Roing", "Arunachal Pradesh", "northeast", "offbeat", { skipWikivoyage: true }),
  d("mechuka", "Mechuka", "Arunachal Pradesh", "northeast", "offbeat", { skipWikivoyage: true }),
  d("dirang", "Dirang", "Arunachal Pradesh", "northeast", "hill_station", { skipWikivoyage: true }),

  // ---------- Nagaland ----------
  d("kohima", "Kohima", "Nagaland", "northeast", "city"),
  d("dzukou-valley", "Dzukou Valley", "Nagaland", "northeast", "offbeat", { wikipediaTitle: "Dzukou_Valley", skipWikivoyage: true }),
  d("mokokchung", "Mokokchung", "Nagaland", "northeast", "offbeat", { skipWikivoyage: true }),
  d("mon-nagaland", "Mon", "Nagaland", "northeast", "offbeat", { wikipediaTitle: "Mon,_Nagaland", skipWikivoyage: true }),
  d("khonoma", "Khonoma", "Nagaland", "northeast", "offbeat", { skipWikivoyage: true }),

  // ---------- Manipur ----------
  d("imphal", "Imphal", "Manipur", "northeast", "city"),
  d("loktak-lake", "Loktak Lake", "Manipur", "northeast", "nature", { wikipediaTitle: "Loktak_Lake", skipWikivoyage: true }),
  d("ukhrul", "Ukhrul", "Manipur", "northeast", "offbeat", { skipWikivoyage: true }),
  d("moreh", "Moreh", "Manipur", "northeast", "offbeat", { skipWikivoyage: true }),

  // ---------- Mizoram ----------
  d("aizawl", "Aizawl", "Mizoram", "northeast", "city"),
  d("champhai", "Champhai", "Mizoram", "northeast", "offbeat", { skipWikivoyage: true }),
  d("reiek", "Reiek", "Mizoram", "northeast", "offbeat", { skipWikivoyage: true }),

  // ---------- Tripura ----------
  d("agartala", "Agartala", "Tripura", "northeast", "city"),
  d("unakoti", "Unakoti", "Tripura", "northeast", "heritage", { skipWikivoyage: true }),
  d("neermahal", "Neermahal", "Tripura", "northeast", "heritage", { skipWikivoyage: true }),

  // ---------- Bihar ----------
  d("patna", "Patna", "Bihar", "east", "city"),
  d("bodh-gaya", "Bodh Gaya", "Bihar", "east", "pilgrimage", { wikipediaTitle: "Bodh_Gaya", wikivoyageTitle: "Bodh_Gaya" }),
  d("rajgir", "Rajgir", "Bihar", "east", "pilgrimage"),
  d("nalanda", "Nalanda", "Bihar", "east", "heritage"),
  d("vaishali", "Vaishali", "Bihar", "east", "pilgrimage", { wikipediaTitle: "Vaishali_(ancient_city)" }),

  // ---------- Jharkhand ----------
  d("ranchi", "Ranchi", "Jharkhand", "east", "city"),
  d("deoghar", "Deoghar", "Jharkhand", "east", "pilgrimage"),
  d("netarhat", "Netarhat", "Jharkhand", "east", "hill_station", { skipWikivoyage: true }),
  d("betla", "Betla", "Jharkhand", "east", "wildlife", { wikipediaTitle: "Betla_National_Park", skipWikivoyage: true }),
  d("hazaribagh", "Hazaribagh", "Jharkhand", "east", "wildlife"),

  // ---------- Madhya Pradesh ----------
  d("khajuraho", "Khajuraho", "Madhya Pradesh", "central", "heritage"),
  d("bhopal", "Bhopal", "Madhya Pradesh", "central", "city"),
  d("sanchi", "Sanchi", "Madhya Pradesh", "central", "heritage"),
  d("ujjain", "Ujjain", "Madhya Pradesh", "central", "pilgrimage"),
  d("indore", "Indore", "Madhya Pradesh", "central", "city"),
  d("mandu", "Mandu", "Madhya Pradesh", "central", "heritage", { wikipediaTitle: "Mandu,_Madhya_Pradesh" }),
  d("gwalior", "Gwalior", "Madhya Pradesh", "central", "heritage"),
  d("orchha", "Orchha", "Madhya Pradesh", "central", "heritage"),
  d("pachmarhi", "Pachmarhi", "Madhya Pradesh", "central", "hill_station"),
  d("bandhavgarh", "Bandhavgarh", "Madhya Pradesh", "central", "wildlife", { wikipediaTitle: "Bandhavgarh_National_Park", wikivoyageTitle: "Bandhavgarh_National_Park" }),
  d("kanha", "Kanha", "Madhya Pradesh", "central", "wildlife", { wikipediaTitle: "Kanha_National_Park", wikivoyageTitle: "Kanha_National_Park" }),
  d("pench", "Pench", "Madhya Pradesh", "central", "wildlife", { wikipediaTitle: "Pench_National_Park", wikivoyageTitle: "Pench_National_Park" }),
  d("satpura", "Satpura", "Madhya Pradesh", "central", "wildlife", { wikipediaTitle: "Satpura_National_Park", skipWikivoyage: true }),
  d("maheshwar", "Maheshwar", "Madhya Pradesh", "central", "heritage", { skipWikivoyage: true }),
  d("omkareshwar", "Omkareshwar", "Madhya Pradesh", "central", "pilgrimage", { skipWikivoyage: true }),

  // ---------- Chhattisgarh ----------
  d("raipur", "Raipur", "Chhattisgarh", "central", "city"),
  d("bastar", "Bastar", "Chhattisgarh", "central", "offbeat"),
  d("chitrakote-falls", "Chitrakote Falls", "Chhattisgarh", "central", "nature", { wikipediaTitle: "Chitrakote_Falls", skipWikivoyage: true }),
  d("barnawapara", "Barnawapara", "Chhattisgarh", "central", "wildlife", { wikipediaTitle: "Barnawapara_Wildlife_Sanctuary", skipWikivoyage: true }),

  // ---------- Andaman & Nicobar (UT) ----------
  d("port-blair", "Port Blair", "Andaman and Nicobar Islands", "islands", "island"),
  d("havelock", "Havelock", "Andaman and Nicobar Islands", "islands", "beach", { wikipediaTitle: "Swaraj_Dweep" }),
  d("neil-island", "Neil Island", "Andaman and Nicobar Islands", "islands", "beach", { wikipediaTitle: "Shaheed_Dweep", wikivoyageTitle: "Neil_Island" }),
  d("ross-island", "Ross Island", "Andaman and Nicobar Islands", "islands", "heritage", { wikipediaTitle: "Netaji_Subhas_Chandra_Bose_Island", skipWikivoyage: true }),
  d("baratang", "Baratang", "Andaman and Nicobar Islands", "islands", "offbeat", { wikipediaTitle: "Baratang_Island", skipWikivoyage: true }),
  d("diglipur", "Diglipur", "Andaman and Nicobar Islands", "islands", "offbeat", { skipWikivoyage: true }),

  // ---------- Lakshadweep (UT) ----------
  d("agatti", "Agatti", "Lakshadweep", "islands", "island", { wikipediaTitle: "Agatti_Island", skipWikivoyage: true }),
  d("bangaram", "Bangaram", "Lakshadweep", "islands", "beach", { wikipediaTitle: "Bangaram_atoll", skipWikivoyage: true }),
  d("kavaratti", "Kavaratti", "Lakshadweep", "islands", "island", { skipWikivoyage: true }),
  d("kadmat", "Kadmat", "Lakshadweep", "islands", "island", { wikipediaTitle: "Kadmat_Island", skipWikivoyage: true }),
  d("minicoy", "Minicoy", "Lakshadweep", "islands", "island"),

  // ---------- Puducherry (UT) ----------
  d("auroville", "Auroville", "Puducherry", "south", "offbeat"),
  d("yanam", "Yanam", "Puducherry", "south", "offbeat", { skipWikivoyage: true }),
  d("karaikal", "Karaikal", "Puducherry", "south", "beach", { skipWikivoyage: true }),
  d("mahe", "Mahe", "Puducherry", "south", "offbeat", { wikipediaTitle: "Mahe,_India", skipWikivoyage: true }),

  // ---------- Daman & Diu / Dadra & Nagar Haveli (UT) ----------
  d("daman", "Daman", "Daman and Diu", "west", "beach"),
  d("silvassa", "Silvassa", "Dadra and Nagar Haveli", "west", "city"),
];

// Quick lookup helpers used by source modules and the orchestrator.
export const DESTINATIONS_BY_SLUG = new Map(
  DESTINATIONS.map((d) => [d.slug, d])
);

export const TOTAL_DESTINATIONS = DESTINATIONS.length;
