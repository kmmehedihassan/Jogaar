import pottery from "../assets/images/pottery.jpg";
import jewellery from "../assets/images/jewellery.jpg";
import cafe from "../assets/images/cafe.jpg";
import boutique from "../assets/images/boutique.jpg";
import poultry from "../assets/images/poultry.jpg";
import handloom from "../assets/images/handloom.jpg";
import storyJafor from "../assets/images/story-jafor.jpg";
import storyFrise from "../assets/images/story-frise.jpg";
import storyAbdullah from "../assets/images/story-abdullah.jpg";
import storyNadia from "../assets/images/story-nadia.jpg";

export const CATEGORIES = [
  "Food & Drink",
  "Crafts",
  "Fashion",
  "Agriculture",
  "Retail",
  "Services",
];

/** Built-in cover images, referenced by key so stored data stays small. */
export const IMAGES = {
  pottery,
  jewellery,
  cafe,
  boutique,
  poultry,
  handloom,
};

/** Fallback cover per category for campaigns created without an upload. */
export const CATEGORY_IMAGES = {
  "Food & Drink": "cafe",
  Crafts: "pottery",
  Fashion: "boutique",
  Agriculture: "poultry",
  Retail: "jewellery",
  Services: "handloom",
};

const DAY = 24 * 60 * 60 * 1000;

/** Campaigns that exist on first run. Dates are relative to first load. */
export function seedCampaigns(now = Date.now()) {
  return [
    {
      id: "mishu-pottery",
      title: "Mishu's Pottery Studio",
      ownerName: "Mishu Akter",
      category: "Crafts",
      location: "Dhamrai, Dhaka",
      image: "pottery",
      summary:
        "Expanding a family pottery business with a second kiln and a small showroom.",
      story: [
        "We have run a small pottery business for three generations, making hand-painted cups, vases and planters from local clay. Demand has outgrown our single wood-fired kiln.",
        "Your support will pay for a modern, energy-efficient kiln and a small showroom by the highway so travellers can buy directly from us instead of through middlemen.",
        "Every backer gets our heartfelt thanks, and contributions above ৳2,000 receive a hand-painted cup from the first firing.",
      ],
      goal: 300000,
      raised: 279000,
      backers: 214,
      createdAt: now - 40 * DAY,
      endsAt: now + 6 * DAY,
    },
    {
      id: "karim-poultry",
      title: "Karim's Poultry Farm Expansion",
      ownerName: "Abdul Karim",
      category: "Agriculture",
      location: "Trishal, Mymensingh",
      image: "poultry",
      summary:
        "Doubling egg production with new cages, ventilation and a backup generator.",
      story: [
        "I started with 200 hens in a tin shed. Today we supply eggs to six local shops and a school canteen.",
        "Heat waves and power cuts cost us birds every summer. This campaign funds better ventilation, a backup generator and 800 more laying hens.",
        "With the expansion we will hire three more people from our village.",
      ],
      goal: 500000,
      raised: 315000,
      backers: 187,
      createdAt: now - 25 * DAY,
      endsAt: now + 20 * DAY,
    },
    {
      id: "tangail-handloom",
      title: "Tangail Handloom Collective",
      ownerName: "Rina Begum",
      category: "Crafts",
      location: "Tangail",
      image: "handloom",
      summary:
        "Helping twelve weaving families sell their sarees online at fair prices.",
      story: [
        "Our collective of twelve weaving families makes traditional Tangail sarees on hand looms.",
        "We want to build a simple online shop, buy better yarn in bulk and pay for product photography so our work reaches buyers across the country.",
        "Funds are shared transparently between all member families.",
      ],
      goal: 350000,
      raised: 189000,
      backers: 142,
      createdAt: now - 18 * DAY,
      endsAt: now + 27 * DAY,
    },
    {
      id: "retro-cafe",
      title: "Retro Cafe",
      ownerName: "Tanvir Hasan",
      category: "Food & Drink",
      location: "Zindabazar, Sylhet",
      image: "cafe",
      summary:
        "A cosy burger and coffee spot for students, with live music on weekends.",
      story: [
        "Retro Cafe started as a food cart outside the university gate. Our burgers sold out every evening.",
        "We have found a small space nearby and need help with the kitchen fit-out, furniture and the first three months of rent.",
        "Backers get a free meal on opening week and their names on our wall of founders.",
      ],
      goal: 400000,
      raised: 100000,
      backers: 76,
      createdAt: now - 10 * DAY,
      endsAt: now + 35 * DAY,
    },
    {
      id: "mayer-dowa-jewellery",
      title: "Mayer Dowa Jewellery",
      ownerName: "Shirin & Lucky",
      category: "Retail",
      location: "New Market, Chattogram",
      image: "jewellery",
      summary:
        "Two sisters turning their market stall into a proper handmade jewellery shop.",
      story: [
        "We make and sell handmade bangles, earrings and necklaces from a small stall in New Market.",
        "This campaign will fund display cases, tools and stock for a permanent shop front so we can serve customers all year round.",
      ],
      goal: 250000,
      raised: 25000,
      backers: 19,
      createdAt: now - 5 * DAY,
      endsAt: now + 40 * DAY,
    },
    {
      id: "untitled-boutique",
      title: "Untitled Boutique House",
      ownerName: "Farzana Rahman",
      category: "Fashion",
      location: "Shaheb Bazar, Rajshahi",
      image: "boutique",
      summary:
        "Affordable, locally tailored everyday wear designed in Rajshahi.",
      story: [
        "I design simple, comfortable everyday clothes and work with four local tailors.",
        "Funding will buy two industrial sewing machines and fabric for our first full collection.",
      ],
      goal: 200000,
      raised: 10000,
      backers: 8,
      createdAt: now - 2 * DAY,
      endsAt: now + 43 * DAY,
    },
  ];
}

export const STORIES = [
  {
    id: "jafor",
    name: "Jafor",
    title: "Jafor's Story",
    business: "Corner grocery, Mirpur",
    image: storyJafor,
    excerpt:
      "How Jogaar helped ex-rickshaw puller Jafor recover from a devastating road accident when all hope seemed lost.",
    body: [
      "For eleven years Jafor pulled a rickshaw through the streets of Mirpur. A road accident in 2021 left him unable to work, and his family's savings disappeared into hospital bills.",
      "A neighbour helped him start a Jogaar campaign to open a small grocery shop he could run seated. 312 people contributed — many of them former passengers.",
      "Today his shop supports his family of five, and he has hired his nephew to help with deliveries.",
    ],
    raised: 180000,
  },
  {
    id: "frise",
    name: "Faiaz",
    title: "The Story of Frise",
    business: "Fast food chain, Dhaka",
    image: storyFrise,
    excerpt:
      "Faiaz, a university student, dreamed of a small fast food chain to support his family — but had no funds to start.",
    body: [
      "Making his family solvent was a tough task for Faiaz, a university student. He planned a small fries-and-snacks brand but had no money for equipment.",
      "His Jogaar campaign promised backers free meals at launch. He reached his goal in nineteen days.",
      "Frise now has three outlets across Dhaka and employs fourteen people, most of them students.",
    ],
    raised: 420000,
  },
  {
    id: "abdullah",
    name: "Abdullah",
    title: "Abdullah's Story",
    business: "Poultry supplier, Old Dhaka",
    image: storyAbdullah,
    excerpt:
      "Scouting Dhaka's streets trying to convince uninterested buyers just wasn't making ends meet for Abdullah.",
    body: [
      "Abdullah carried live chickens through Old Dhaka every morning, walking for hours to sell a single basket.",
      "With the money raised on Jogaar he bought a small refrigerated van and signed supply deals with five restaurants.",
      "He now earns three times what he did before — and no longer walks twenty kilometres a day.",
    ],
    raised: 260000,
  },
  {
    id: "nadia",
    name: "Nadia",
    title: "Nadia's Bakery",
    business: "Bakery, Uttara",
    image: storyNadia,
    excerpt:
      "Nadia used to bake for family and friends. Now she owns one of the best-loved bakeries in Uttara.",
    body: [
      "Baking came naturally to Nadia, but she had no way to turn her talent into an income from her home kitchen.",
      "Her Jogaar campaign funded a commercial oven and a small shop front. Backers received her signature cakes as rewards.",
      "Nadia's Bakery now takes wedding orders from across Dhaka and employs six women from her neighbourhood.",
    ],
    raised: 350000,
  },
];

export const FAQS = [
  {
    q: "Who are we?",
    a: "Jogaar is a crowdfunding platform for small businesses and aspiring entrepreneurs in Bangladesh. We connect people with an idea to people who want to help it happen.",
  },
  {
    q: "How does it work?",
    a: "A business owner creates a campaign with a funding goal and deadline. Supporters back the campaign with any amount. When the campaign ends, the owner receives the funds to build their business.",
  },
  {
    q: "How can I contribute?",
    a: "Create a free account, choose a campaign you believe in, and back it with any amount from ৳100. You can track everything you have backed from your dashboard.",
  },
  {
    q: "Does it cost anything to start a campaign?",
    a: "Starting a campaign is free. A small platform fee is taken only from campaigns that receive funds.",
  },
  {
    q: "Which payment methods are supported?",
    a: "bKash, Nagad and debit/credit cards. This demo build does not charge any real money.",
  },
];
