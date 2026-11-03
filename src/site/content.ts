// All editable site copy lives here. Change words in this file, not in the components.

export const EMAIL = "hello@vincentdamato.com";
export const GITHUB = "https://github.com/vincentdamato";
export const LINKEDIN = "https://linkedin.com/in/vincentdamato";

export type BoardRow = { what: string; status: string };
export type Board = { id: string; label: string; rows: BoardRow[] };

// Flap limits: "what" 18 characters, "status" 10 characters.
export const BOARDS: Board[] = [
  {
    id: "work",
    label: "Work",
    rows: [
      { what: "MONTH-END CLOSE", status: "AUTOMATING" },
      { what: "RECONCILIATIONS", status: "AUTOMATING" },
      { what: "AI FOR FINANCE", status: "TEACHING" },
      { what: "OTC DERIVATIVES", status: "DAY JOB" },
      { what: "GOLF ONE SOFTWARE", status: "BUILDING" },
    ],
  },
  {
    id: "loves",
    label: "Loves",
    rows: [
      { what: "ESPRESSO", status: "DAILY" },
      { what: "FRANK SINATRA", status: "ON REPEAT" },
      { what: "GOLF", status: "MONDAYS" },
      { what: "EUCHRE", status: "DEAL ME IN" },
      { what: "TIRAMISU", status: "ALWAYS" },
    ],
  },
  {
    id: "places",
    label: "Destinations",
    rows: [
      { what: "ZURICH", status: "FAVORITE" },
      { what: "SCOTTSDALE", status: "ON TIME" },
      { what: "COLORADO", status: "BOARDING" },
      { what: "MICHIGAN DUNES", status: "PLANNED" },
      { what: "PILOT LICENSE", status: "SOMEDAY" },
    ],
  },
];

export const OFFERS = [
  {
    name: "Close automation sprint",
    detail: "One recurring manual process rebuilt in Power Query, SQL or Python, with documentation your team can follow.",
    time: "2 to 3 weeks",
    price: "From $3,000",
  },
  {
    name: "Reconciliation build",
    detail: "Source-to-ledger matching with exception flags and a review queue.",
    time: "4 to 6 weeks",
    price: "From $8,000",
  },
  {
    name: "AI for finance teams",
    detail: "A hands-on workshop, plus the first use cases set up for your team.",
    time: "1 to 2 days",
    price: "From $1,500",
  },
];

export const PROJECTS = [
  {
    name: "Golf One Software",
    role: "Co-founder",
    detail: "Software for golf course operations, built with my co-founder.",
    href: "",
  },
  {
    name: "Options Arbitrage Scanner",
    role: "Personal project",
    detail: "A Python and Streamlit screener that looks for options mispricing, including put-call parity violations.",
    href: "https://github.com/vincentdamato/OptionArbitrage",
  },
  {
    name: "Options Strategy Backtester",
    role: "Personal project",
    detail: "A Streamlit backtesting tool for short puts, iron condors, long straddles and other strategies.",
    href: "https://github.com/vincentdamato/options-backtester",
  },
];

// Vincent's Bond Wizard Ratings Desk format. Edit freely.
export const RATINGS = [
  { name: "Espresso", rating: "AAA", outlook: "Stable", why: "No missed payments on record." },
  { name: "Frank Sinatra and the Rat Pack", rating: "AAA", outlook: "Stable", why: "Holds its value in every market." },
  { name: "Zurich", rating: "AAA", outlook: "Stable", why: "My favorite place I've traveled." },
  { name: "Golf", rating: "AA+", outlook: "Negative in winter", why: "Wisconsin season limits the cash flow." },
  { name: "Tiramisu", rating: "AA+", outlook: "Positive", why: "Strong coverage after espresso." },
  { name: "Scottsdale", rating: "AA", outlook: "Positive", why: "Sun, golf and restaurants, well diversified." },
  { name: "Euchre", rating: "AA", outlook: "Stable", why: "Taught by two uncles. Long track record." },
  { name: "Sauna", rating: "AA", outlook: "Stable", why: "Reliable returns, especially in January." },
  { name: "Facebook Marketplace deals", rating: "BBB", outlook: "Positive", why: "Volatile, with real upside for patient buyers." },
];
