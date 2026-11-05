// All site copy lives here. Change words in this file, not in the components.

export const EMAIL = "vincent-damato@outlook.com";
export const GITHUB = "https://github.com/vincentdamato";
export const LINKEDIN = "https://www.linkedin.com/in/vincent-damato-/";

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
  | "cradle"
  | "keyboard"
  | "balls"
  | "rolodex"
  | "mannequin"
  | "chess"
  | "stash"
  | "degree"
  | "books"
  | "car"
  | "dog"
  | "pennant"
  | "starry"
  | "wine"
  | "camera"
  | "lamp";

export const ITEMS: { id: ItemId; label: string; group: "Work" | "Me" }[] = [
  { id: "work", label: "Desktop", group: "Work" },
  { id: "projects", label: "Projects", group: "Work" },
  { id: "about", label: "About me", group: "Work" },
  { id: "contact", label: "Contact", group: "Work" },
  { id: "ratings", label: "American Gothic", group: "Me" },
  { id: "golf", label: "Golf bag", group: "Me" },
  { id: "espresso", label: "Espresso", group: "Me" },
  { id: "records", label: "Music", group: "Me" },
  { id: "plane", label: "Bombardier", group: "Me" },
  { id: "map", label: "Travel map", group: "Me" },
  { id: "chess", label: "Chess board", group: "Me" },
  { id: "rolodex", label: "Rolodex", group: "Me" },
  { id: "balls", label: "Favorite courses", group: "Me" },
  { id: "keyboard", label: "MX Master Keys", group: "Me" },
  { id: "cradle", label: "Newton's cradle", group: "Me" },
  { id: "books", label: "Bookshelf", group: "Me" },
  { id: "degree", label: "Degree", group: "Me" },
  { id: "car", label: "F1 model", group: "Me" },
  { id: "dog", label: "Rudy", group: "Me" },
  { id: "pennant", label: "Go Hawks!", group: "Me" },
  { id: "starry", label: "The Starry Night", group: "Me" },
  { id: "wine", label: "Pinot Noir", group: "Me" },
  { id: "camera", label: "D7000", group: "Me" },
  { id: "lamp", label: "Desk lamp", group: "Me" },
];

export const MAIN_MENU: { id: "work" | "resume" | "projects" | "contact"; label: string; note: string }[] = [
  { id: "work", label: "Desktop", note: "Open the computer" },
  { id: "resume", label: "Résumé", note: "My background at a glance" },
  { id: "projects", label: "Projects", note: "What I've built" },
  { id: "contact", label: "Contact", note: "Email and socials" },
];

// The taste profile. Weight runs 0 to 10 and sets the radar and the bars.
// "search" is what the Spotify link looks up; "picks" is the line under the genre.
// Radar order runs clockwise from the top; the list below it sorts itself by weight.
export const MUSIC = [
  { title: "Hip-hop", search: "Mac Miller", color: "#b8912f", weight: 10, picks: "Mac Miller" },
  { title: "Electronic", search: "Franky Rizardo", color: "#2f8fa8", weight: 8, picks: "Franky Rizardo" },
  { title: "R&B", search: "Sade", color: "#6a3fa0", weight: 6, picks: "Sade" },
  { title: "Rock", search: "Pink Floyd", color: "#2a2a30", weight: 7, picks: "Pink Floyd" },
  { title: "Classical", search: "Opera", color: "#7c1e1c", weight: 4, picks: "Opera" },
  { title: "Latin", search: "Brazilian house", color: "#3f8f45", weight: 5, picks: "Brazilian house" },
  { title: "Pop", search: "ABBA", color: "#c0567a", weight: 6, picks: "ABBA" },
  { title: "Jazz", search: "Frank Sinatra", color: "#1f3f73", weight: 7, picks: "Frank Sinatra" },
];

// Your current rating. It shows when someone hovers over the board.
export const CHESS_ELO = 900;

export const SOCIALS = [
  { name: "Email", href: `mailto:${EMAIL}` },
  { name: "LinkedIn", href: LINKEDIN },
  { name: "GitHub", href: GITHUB },
];

export const DEGREE = {
  intro:
    "I earned my BBA in Finance at the University of Iowa in 2023. Alongside my studies, I led a couple of student organizations, covered equity research as an analyst for the Krause Fund, enjoyed a mix of extracurriculars and never missed a chance to watch Hawkeye football and basketball.",
  facts: [
    ["Degree", "Bachelor of Business Administration"],
    ["Major", "Finance"],
    ["College", "Henry B. Tippie College of Business"],
    ["Class of", "2023"],
  ],
  courses: [
    "Applied Equity Valuation",
    "Investment Management",
    "Corporate Finance",
    "Principles of Risk Management and Insurance",
    "Wealth Management",
    "Commercial Banking",
    "Financial Accounting and Reporting",
  ],
  roles: [
    { title: "President", org: "Financial Management Association" },
    { title: "Treasurer", org: "Tippie Consulting Club" },
    { title: "Treasurer", org: "Phi Gamma Nu" },
    { title: "Equity Analyst", org: "Krause Fund" },
    { title: "Student organization", org: "HawkTrade" },
  ],
};

// Courses played. Not shown on the site right now; kept here to bring the list back later.
export const GOLF_COURSES = [
  {
    state: "Arizona",
    courses: [
      "Aguila 9 Golf Course",
      "Arizona Grand Golf Course",
      "Cottonwood Country Club",
      "Desert Canyon Golf Club",
      "Desert Hills Golf Club",
      "Desert Mountain: Cochise",
      "Eagle Mountain Golf Club",
      "FireRock Country Club",
      "Gold Canyon Golf Resort",
      "Grayhawk Golf Club",
      "Lookout Mountain Golf Club",
      "McDowell Mountain Golf Club",
      "Oakwood Golf Club",
      "Ocotillo Golf Resort",
      "Palo Verde Country Club",
      "Papago Golf Course",
      "Paradise Valley Golf Course",
      "Raven Golf Club",
      "Sun Lakes Country Club",
      "SunRidge Canyon",
      "The 500 Club",
      "Tonto Verde",
      "TPC Scottsdale",
      "Troon North Golf Club",
      "Verde River Golf & Social Club",
      "We-Ko-Pa: Cholla",
      "We-Ko-Pa: Saguaro",
    ],
  },
  {
    state: "Florida",
    courses: [
      "Trump National Doral",
    ],
  },
  {
    state: "Wisconsin",
    courses: [
      "Chenequa Country Club",
      "Deertrak Golf Club",
      "Erin Hills",
      "Hartford Golf Club",
      "Ironwood Golf Course",
      "Kettle Hills Golf Course",
      "Lac La Belle",
      "Lake Arrowhead: Lakes",
      "Lake Arrowhead: Woods",
      "Lawsonia: Woods",
      "Oconomowoc Golf Club",
      "Sand Valley: Mammoth Dunes",
      "Sand Valley: Original",
      "Scenic View Golf Club",
      "SentryWorld",
      "Trappers Turn",
      "Washington County Golf Club",
      "Whistling Straits: Irish",
      "Wild Rock Golf Club",
    ],
  },
];

export const ABOUT = [
  "I'm an investment accountant based in Milwaukee, specializing in *OTC derivatives* at a large U.S. life insurer. My work sits where *finance, data and technology* meet, and I enjoy turning complex processes into simple, reliable ones.",
  "I earned my BBA in Finance from the *University of Iowa*. Beyond the numbers, I like building things, from *automation tools* to *this site*, which I designed as a place to explore rather than a page to scroll.",
  "Away from the desk, I enjoy travel, skiing, hiking, swimming, poker, good food and times.",
];

export const BOOK_SHELF = [
  {
    group: "Markets",
    books: [
      ["Reminiscences of a Stock Operator", "Edwin Lefèvre"],
      ["When Genius Failed", "Roger Lowenstein"],
      ["The Greeks and Hedging Explained", "Peter Leoni"],
      ["Going Infinite", "Michael Lewis"],
    ],
  },
  {
    group: "Building",
    books: [
      ["The Hard Thing About Hard Things", "Ben Horowitz"],
      ["Zero to One", "Peter Thiel"],
      ["How to Build a Car", "Adrian Newey"],
    ],
  },
  {
    group: "Golf and flying",
    books: [
      ["Harvey Penick's Little Red Book", "Harvey Penick"],
      ["Stick and Rudder", "Wolfgang Langewiesche"],
      ["Fate Is the Hunter", "Ernest K. Gann"],
    ],
  },
  { group: "Habits", books: [["Atomic Habits", "James Clear"]] },
];

export const PROJECTS = [
  {
    ticker: "OARB",
    name: "Options Arbitrage Scanner",
    status: "On GitHub",
    stack: "Python, Streamlit",
    detail: "A Python and Streamlit screener for options mispricing.",
    href: "https://github.com/vincentdamato/OptionArbitrage",
  },
  {
    ticker: "BKTS",
    name: "Options Strategy Backtester",
    status: "On GitHub",
    stack: "Python, Streamlit",
    detail: "A Streamlit tool for backtesting options strategies.",
    href: "https://github.com/vincentdamato/options-backtester",
  },
];

// Every place shown in the Places panel. Pins live in worldmap.ts.
export const PLACE_GROUPS = [
  {
    region: "United States",
    places: [
      "Milwaukee (home)",
      "Alpharetta",
      "Aspen",
      "Boston",
      "Breckenridge",
      "Dallas",
      "Denver",
      "Fort Lauderdale",
      "Fort Myers",
      "Iowa City",
      "Las Vegas",
      "Maine",
      "Marquette (UP)",
      "Miami",
      "Nashville",
      "New York City",
      "Salem",
      "Scottsdale",
      "Sedona",
      "Vail",
    ],
  },
  { region: "Caribbean", places: ["St. Kitts and Nevis", "Tortola (BVI)"] },
  { region: "Europe", places: ["Bled", "Copenhagen", "Innsbruck", "Jungfrau", "Ljubljana", "Munich", "Piran", "Zurich"] },
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

export const NOTES: Record<"records" | "plane" | "map" | "degree" | "car", { title: string; body: string[] }> = {
  records: {
    title: "Music Profile",
    body: [],
  },
  plane: {
    title: "The Global 8000",
    body: [
      "Getting my private pilot's license is a dream of mine, and this model keeps it in front of me. I'll start in something a lot smaller, but it's good to know what I'm aiming at.",
      "I like this jet because it's built to go far. It's rated for up to 8,000 nautical miles, which on paper is enough to fly Milwaukee to Zurich, my favorite place, and come back without refueling.",
      "Fun fact: the cabin is 6 feet 2 inches tall. I'm 6'8\", so even on a $78 million jet, I'd be ducking.",
    ],
  },
  map: {
    title: "Places",
    body: [],
  },
  degree: {
    title: "University of Iowa",
    body: ["I earned my BBA in Finance from the Henry B. Tippie College of Business at the University of Iowa in 2023."],
  },
  car: {
    title: "Number 68",
    body: [
      "Cars are a passion of mine, and I love how much engineering goes into going fast. It sits next to the jet because I like machines that are built to do one thing as well as it can be done.",
      "One day I want to rent a Porsche and take it out to the hills and desert. For now, this one stays on the shelf.",
      "Fun fact: it wears 68 for my height. At 6'8\", I doubt I'd fit in a real one, so this is as close to the cockpit as I'm getting.",
    ],
  },
};
