// lib/mockBlog.ts
// Mock blog posts. Kept separate from mockData.ts so the planner data stays
// focused. Body uses simple paragraph + heading + image blocks so we can
// render without needing a markdown parser.

export type BlockNode =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "image"; src: string; alt: string; caption?: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  readMinutes: number;
  author: { name: string; avatar: string };
  publishedAt: string;
  tags: string[];
  body: BlockNode[];
}

export const MOCK_POSTS: BlogPost[] = [
  {
    slug: "monsoon-india-where-to-go",
    title: "Where to go in India during the monsoon (and where to avoid)",
    excerpt:
      "Some destinations sing in the rain. Others shut down completely. A practical guide to monsoon-season travel in India.",
    cover:
      "https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=1200",
    category: "Travel guides",
    readMinutes: 6,
    author: {
      name: "Keshav Tanwar",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    },
    publishedAt: "2026-05-08",
    tags: ["monsoon", "kerala", "western ghats", "season"],
    body: [
      {
        type: "p",
        text: "Monsoon is the most divisive season in Indian travel. Half the country becomes lush and theatrical; the other half becomes unreachable. Knowing which half you're aiming for is the whole game.",
      },
      { type: "h2", text: "Where the rain is the point" },
      {
        type: "p",
        text: "Kerala, the Western Ghats, and pockets of the Northeast become impossibly green between June and September. Tea estates glow, waterfalls run thick, and Ayurvedic centres consider the rainy season therapeutically ideal — humidity is said to open the pores.",
      },
      {
        type: "ul",
        items: [
          "Munnar — tea plantations at their greenest; mist on the slopes.",
          "Coorg — coffee estates, waterfalls, and homestays for couples.",
          "Athirappilly falls — Kerala's Niagara, only fully alive July–Sep.",
          "Cherrapunji — the wettest place on earth; double-decker root bridge treks.",
        ],
      },
      { type: "h2", text: "Where to avoid" },
      {
        type: "p",
        text: "Goa shuts most beach shacks. Ladakh's high passes are inaccessible. Andaman ferries get cancelled. Rajasthan deserts churn into mud and the festival circuit pauses. If your trip hinges on beaches, scuba, or mountain motorbikes, save those for October onwards.",
      },
      { type: "quote", text: "If you can hear the rain on the roof, you're in Kerala. If you can't see the road, you're in Cherrapunji.", cite: "An old guesthouse manager in Vagamon" },
      { type: "h2", text: "Pack-for-monsoon checklist" },
      {
        type: "ul",
        items: [
          "Lightweight rain jacket (Decathlon ones do fine; ponchos blow away)",
          "Quick-dry sandals — leather will rot",
          "Waterproof phone pouch + extra zip-locks",
          "Anti-fungal foot powder (genuinely useful)",
          "A book — power cuts are common in the hills",
        ],
      },
      {
        type: "p",
        text: "Plan around it, don't fight it. Monsoon India done right is the most romantic version of the country.",
      },
    ],
  },
  {
    slug: "ladakh-acclimatization-guide",
    title: "Ladakh acclimatisation — the 24 hours that make or break your trip",
    excerpt:
      "Skip the rest day in Leh and you'll spend the next four days nauseous. Here's the protocol.",
    cover:
      "https://images.unsplash.com/photo-1591018653488-65fe7d6bf75d?w=1200",
    category: "Practical",
    readMinutes: 4,
    author: {
      name: "Keshav Tanwar",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    },
    publishedAt: "2026-04-29",
    tags: ["ladakh", "altitude", "AMS", "tips"],
    body: [
      {
        type: "p",
        text: "Leh sits at 3,500m. The day you fly in, your oxygen saturation drops 15-20% within an hour of landing. Most travellers feel fine for the first 4-6 hours, then crash. The crash is the AMS-prevention window — what you do in those hours matters more than anything you do for the next 9 days.",
      },
      { type: "h2", text: "The 24-hour protocol" },
      {
        type: "ul",
        items: [
          "Don't shower for the first 6 hours — heat exchange slows acclimatisation.",
          "Drink 3-4 litres of water; avoid coffee and alcohol for the first 24h.",
          "No sleep before 9pm and no afternoon naps — your sleep cycle will be off and brief naps drop SpO₂.",
          "Stay below 3,800m on Day 1. No Khardung La trips. Skip the Shanti Stupa climb if you can.",
          "Eat carb-heavy meals. Avoid heavy protein the first day.",
        ],
      },
      { type: "h2", text: "Watch for these signs" },
      {
        type: "p",
        text: "Headache, nausea, dizziness, sleep disruption — common, usually clears by Day 2. Persistent vomiting, confusion, or wet-cough is severe AMS — descend immediately. SOS Hospital in Leh is open 24/7.",
      },
      {
        type: "p",
        text: "Diamox (acetazolamide) helps about 70% of people. Take it from the morning of your flight in. Talk to a doctor first if you have any kidney issues.",
      },
      { type: "h2", text: "Day 2 onwards" },
      {
        type: "p",
        text: "You can do Sham Valley (lower elevation) safely on Day 2. Save Khardung La, Nubra, and Pangong for Day 3+. Tso Moriri is the highest commonly-visited lake — only attempt after you've been at altitude 4+ days.",
      },
      {
        type: "p",
        text: "Ladakh punishes shortcuts. Trust the rest day. It's the difference between a magical trip and 10 days of headaches.",
      },
    ],
  },
  {
    slug: "rajasthan-circuit-route-order",
    title: "The Rajasthan circuit, in the order that actually makes sense",
    excerpt:
      "Most itineraries do Delhi → Jaipur → Agra. Reverse them and the trip gets 30% better.",
    cover:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
    category: "Travel guides",
    readMinutes: 5,
    author: {
      name: "Keshav Tanwar",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    },
    publishedAt: "2026-04-15",
    tags: ["rajasthan", "route", "golden triangle"],
    body: [
      {
        type: "p",
        text: "Look at any travel-agency itinerary for Rajasthan and it'll be ordered the same way: arrive Delhi → drive Agra → drive Jaipur → fly home. It's the laziest order possible. Reverse it and you fix three real problems.",
      },
      { type: "h2", text: "Problem 1: peak-time Taj" },
      {
        type: "p",
        text: "The standard order puts you at the Taj on Day 3 around 10am — peak crowd. Reversed, you arrive Agra at sunrise on a less-busy day. You'll have the lawns to yourself for 90 minutes.",
      },
      { type: "h2", text: "Problem 2: post-Jaipur fatigue" },
      {
        type: "p",
        text: "Jaipur is sensory overload — bazaars, forts, colour, noise. Doing it last means you arrive frazzled and miss what's special. Doing it first, fresh from a flight, means you appreciate the wedding-cake architecture properly.",
      },
      { type: "h2", text: "Problem 3: the train" },
      {
        type: "p",
        text: "The Gatimaan Express runs Delhi → Agra → Jhansi. The Agra-end of the trip means you can train down to Delhi in 1h 40m instead of fighting NH-2 traffic at end-of-trip exhaustion levels.",
      },
      {
        type: "p",
        text: "The reordered circuit: Delhi (2N) → Jaipur (3N, fresh) → Agra (1N, sunrise Taj) → Delhi airport. We've built it into the default Golden Triangle itinerary on Sarthi.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return MOCK_POSTS.find((p) => p.slug === slug);
}
