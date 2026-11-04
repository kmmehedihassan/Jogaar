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
import CAMPAIGN_SEED from "./campaigns.json";
import { buildSeed } from "./buildSeed";

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


/** Campaigns that exist on first run. Dates are relative to first load. */
export function seedCampaigns(now = Date.now()) {
  return buildSeed(CAMPAIGN_SEED, now);
}

export const STORIES = [
  {
    id: "jafor",
    bn: {"title": "জাফরের গল্প", "business": "মুদি দোকান, মিরপুর", "excerpt": "কীভাবে জোগাড় সাবেক রিকশাচালক জাফরকে একটি ভয়াবহ সড়ক দুর্ঘটনার পর ঘুরে দাঁড়াতে সাহায্য করেছে, যখন সব আশা শেষ মনে হচ্ছিল।", "body": ["এগারো বছর ধরে জাফর মিরপুরের রাস্তায় রিকশা চালিয়েছেন। ২০২১ সালের এক সড়ক দুর্ঘটনায় তিনি কাজ করার সামর্থ্য হারান, আর হাসপাতালের বিলে পরিবারের সব সঞ্চয় শেষ হয়ে যায়।", "এক প্রতিবেশী তাঁকে জোগাড়ে একটি ক্যাম্পেইন খুলতে সাহায্য করেন, যাতে তিনি বসে বসে চালাতে পারেন এমন একটি ছোট মুদি দোকান দিতে পারেন। ৩১২ জন মানুষ অবদান রাখেন — তাঁদের অনেকেই ছিলেন তাঁর পুরোনো যাত্রী।", "আজ তাঁর দোকান পাঁচ সদস্যের পরিবারটিকে চালাচ্ছে, আর ডেলিভারির কাজে তিনি তাঁর ভাতিজাকেও নিয়োগ দিয়েছেন।"]},
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
    bn: {"title": "ফ্রাইসের গল্প", "business": "ফাস্ট ফুড চেইন, ঢাকা", "excerpt": "বিশ্ববিদ্যালয়ের ছাত্র ফাইয়াজ পরিবারকে সাহায্য করতে একটি ছোট ফাস্ট ফুড চেইনের স্বপ্ন দেখতেন — কিন্তু শুরু করার মতো টাকা ছিল না।", "body": ["পরিবারকে স্বাবলম্বী করা বিশ্ববিদ্যালয়ের ছাত্র ফাইয়াজের জন্য সহজ ছিল না। তিনি ফ্রাই ও স্ন্যাকসের একটি ছোট ব্র্যান্ডের পরিকল্পনা করেন, কিন্তু সরঞ্জাম কেনার টাকা ছিল না।", "তাঁর জোগাড় ক্যাম্পেইনে সমর্থকদের উদ্বোধনের সময় বিনামূল্যে খাবারের প্রতিশ্রুতি দেওয়া হয়। উনিশ দিনেই তিনি লক্ষ্যে পৌঁছে যান।", "ফ্রাইসের এখন ঢাকায় তিনটি আউটলেট, যেখানে চৌদ্দজন কাজ করেন — তাঁদের বেশিরভাগই শিক্ষার্থী।"]},
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
    bn: {"title": "আবদুল্লাহর গল্প", "business": "মুরগি সরবরাহকারী, পুরান ঢাকা", "excerpt": "অনাগ্রহী ক্রেতাদের রাজি করাতে ঢাকার রাস্তায় ঘুরে ঘুরে আবদুল্লাহর সংসার চলছিল না।", "body": ["প্রতিদিন সকালে আবদুল্লাহ জ্যান্ত মুরগি মাথায় নিয়ে পুরান ঢাকায় ঘুরতেন, একটি ঝুড়ি বিক্রি করতে ঘণ্টার পর ঘণ্টা হাঁটতেন।", "জোগাড়ে সংগৃহীত অর্থ দিয়ে তিনি একটি ছোট রেফ্রিজারেটেড ভ্যান কেনেন এবং পাঁচটি রেস্তোরাঁর সঙ্গে সরবরাহ চুক্তি করেন।", "এখন তিনি আগের চেয়ে তিনগুণ আয় করেন — আর দিনে বিশ কিলোমিটার হাঁটতে হয় না।"]},
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
    bn: {"title": "নাদিয়ার বেকারি", "business": "বেকারি, উত্তরা", "excerpt": "নাদিয়া একসময় পরিবার আর বন্ধুদের জন্য কেক বানাতেন। এখন উত্তরার অন্যতম জনপ্রিয় বেকারির মালিক তিনি।", "body": ["বেকিং নাদিয়ার কাছে সহজাত ছিল, কিন্তু ঘরের রান্নাঘর থেকে সেই প্রতিভাকে আয়ে পরিণত করার উপায় তাঁর ছিল না।", "তাঁর জোগাড় ক্যাম্পেইনের টাকায় একটি বাণিজ্যিক ওভেন ও ছোট একটি দোকান হয়। সমর্থকরা পুরস্কার হিসেবে পান তাঁর বিশেষ কেক।", "নাদিয়ার বেকারি এখন সারা ঢাকা থেকে বিয়ের অর্ডার নেয় এবং পাড়ার ছয়জন নারী সেখানে কাজ করেন।"]},
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
