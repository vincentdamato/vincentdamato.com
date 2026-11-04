// All site copy lives here. Change words in this file, not in the components.

export const EMAIL = "hello@vincentdamato.com";
export const GITHUB = "https://github.com/vincentdamato";
export const LINKEDIN = "https://linkedin.com/in/vincentdamato";

export type ItemId =
  | "work"
  | "projects"
  | "about"
  | "contact"
  | "ratings"
  | "golf"
  | "espresso"
  | "records"
  | "plane"
  | "map"
  | "cards"
  | "dog"
  | "lamp";

export const ITEMS: { id: ItemId; label: string; group: "Work" | "Me" }[] = [
  { id: "work", label: "What I do", group: "Work" },
  { id: "projects", label: "Projects", group: "Work" },
  { id: "about", label: "About me", group: "Work" },
  { id: "contact", label: "Say hello", group: "Work" },
  { id: "ratings", label: "Ratings binder", group: "Me" },
  { id: "golf", label: "Golf bag", group: "Me" },
  { id: "espresso", label: "Espresso", group: "Me" },
  { id: "records", label: "Record player", group: "Me" },
  { id: "plane", label: "Model airplane", group: "Me" },
  { id: "map", label: "Travel map", group: "Me" },
  { id: "cards", label: "Euchre hand", group: "Me" },
  { id: "dog", label: "The dog", group: "Me" },
  { id: "lamp", label: "Desk lamp", group: "Me" },
];

export const OFFERS = [
  {
    name: "Close automation sprint",
    detail: "One recurring manual process rebuilt in Power Query, SQL or Python, with documentation.",
    meta: "2 to 3 weeks, from $3,000",
  },
  {
    name: "Reconciliation build",
    detail: "Source-to-ledger matching with exception flags and a review queue.",
    meta: "4 to 6 weeks, from $8,000",
  },
  {
    name: "AI for finance teams",
    detail: "A hands-on workshop, plus the first use cases set up for your team.",
    meta: "1 to 2 days, from $1,500",
  },
];

export const PROJECTS = [
  { name: "Golf One Software", detail: "Co-founder. Software for golf course operations.", href: "" },
  {
    name: "Options Arbitrage Scanner",
    detail: "A Python and Streamlit screener for options mispricing.",
    href: "https://github.com/vincentdamato/OptionArbitrage",
  },
  {
    name: "Options Strategy Backtester",
    detail: "A Streamlit tool for backtesting options strategies.",
    href: "https://github.com/vincentdamato/options-backtester",
  },
];

// Vincent's Bond Wizard Ratings Desk format. Edit freely.
export const RATINGS = [
  { name: "Espresso", rating: "AAA", outlook: "Stable", why: "No missed payments on record." },
  { name: "Sinatra and the Rat Pack", rating: "AAA", outlook: "Stable", why: "Holds its value in every market." },
  { name: "Zurich", rating: "AAA", outlook: "Stable", why: "My favorite place I've traveled." },
  { name: "Golf", rating: "AA+", outlook: "Negative in winter", why: "Wisconsin season limits the cash flow." },
  { name: "Tiramisu", rating: "AA+", outlook: "Positive", why: "Strong coverage after espresso." },
  { name: "Scottsdale", rating: "AA", outlook: "Positive", why: "Sun, golf and restaurants, well diversified." },
  { name: "Euchre", rating: "AA", outlook: "Stable", why: "Long track record." },
  { name: "Facebook Marketplace deals", rating: "BBB", outlook: "Positive", why: "Volatile, with upside for patient buyers." },
];

export const NOTES: Record<"golf" | "espresso" | "records" | "plane" | "map" | "cards" | "dog", { title: string; body: string[] }> = {
  golf: {
    title: "Golf",
    body: [
      "Golf is how I spend Monday evenings in season. It's also why I co-founded Golf One Software.",
      "In the bag: Titleist T300 irons.",
    ],
  },
  espresso: {
    title: "Espresso",
    body: ["Coffee and espresso, every day. A good tiramisu counts as a second cup."],
  },
  records: {
    title: "On the turntable",
    body: [
      "Frank Sinatra and the Rat Pack come first.",
      "After that, almost anything: Brazilian house, phonk, yacht rock, Pink Floyd, 50 Cent and opera. Just not heavy metal.",
    ],
  },
  plane: {
    title: "Someday, a pilot's license",
    body: ["I've always been interested in aviation. Getting my pilot's license is a dream of mine."],
  },
  map: {
    title: "Places",
    body: [
      "Zurich is my favorite place I've traveled. I also love Scottsdale and Colorado.",
      "Most recent: Oktoberfest in Munich, then Innsbruck, Ljubljana and the coast at Piran. Next on the list: the Michigan sand dunes, for UTV riding and golf.",
    ],
  },
  dog: {
    title: "Head of office morale",
    body: ["My Havanese. Asleep on the job, as usual."],
  },
  cards: {
    title: "Euchre",
    body: ["I grew up on euchre in Wisconsin, taught by two uncles. I also play poker."],
  },
};
