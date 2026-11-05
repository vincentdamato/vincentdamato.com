// Refreshes src/site/market-data.json from public sources at build time.
// Any failure leaves the committed snapshot in place, so a source outage never breaks a deploy.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/site/market-data.json", import.meta.url);
const COLUMNS = ["1 Mo", "1.5 Mo", "2 Mo", "3 Mo", "4 Mo", "6 Mo", "1 Yr", "2 Yr", "3 Yr", "5 Yr", "7 Yr", "10 Yr", "20 Yr", "30 Yr"];
const clean = (s) => s.replace(/"/g, "").replace("Month", "Mo").trim();

export function parseTreasury(csv) {
  const [head, ...lines] = csv.trim().split(/\r?\n/);
  const names = head.split(",").map(clean);
  const index = COLUMNS.map((c) => names.indexOf(c));
  if (index.some((i) => i < 0)) throw new Error("Treasury columns changed");
  return lines
    .map((line) => {
      const cells = line.split(",").map(clean);
      const [m, d, y] = cells[0].split("/");
      return { date: `${y}-${m}-${d}`, rates: index.map((i) => Number(cells[i])) };
    })
    .filter((r) => r.rates.every(Number.isFinite))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function parseEcb(xml) {
  const days = [...xml.matchAll(/<Cube time="([\d-]+)">([\s\S]*?)<\/Cube>\s*(?=<Cube time|<\/Cube>)/g)];
  return days.map(([, date, body]) => ({
    date,
    rates: Object.fromEntries([...body.matchAll(/currency="(\w+)" rate="([\d.]+)"/g)].map(([, c, r]) => [c, Number(r)])),
  }));
}

const text = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
};

const treasuryUrl = (year) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;

async function main() {
  const data = JSON.parse(readFileSync(FILE, "utf8"));
  const year = new Date().getUTCFullYear();
  const days = [...parseTreasury(await text(treasuryUrl(year))), ...parseTreasury(await text(treasuryUrl(year - 1)))].sort((a, b) => b.date.localeCompare(a.date));
  const shift = (date, months) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - months);
    return d.toISOString().slice(0, 10);
  };
  const onOrBefore = (date) => days.find((d) => d.date <= date);
  data.curve = days[0];
  data.prior = days[1];
  data.monthAgo = onOrBefore(shift(days[0].date, 1));
  data.yearAgo = onOrBefore(shift(days[0].date, 12));

  const sofr = JSON.parse(await text("https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json"));
  data.sofr = sofr.refRates.map((r) => ({ date: r.effectiveDate, rate: r.percentRate }));

  const fx = parseEcb(await text("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml"));
  const pick = (rates) => Object.fromEntries(Object.keys(data.fx.rates).map((k) => [k, rates[k]]));
  data.fx = { date: fx[0].date, priorDate: fx[1].date, rates: pick(fx[0].rates), prior: pick(fx[1].rates) };

  writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Market data refreshed through ${data.curve.date}`);
}

if (process.argv[1]?.endsWith("refresh-market-data.mjs")) {
  main().catch((e) => {
    console.warn(`Keeping the committed market data: ${e.message}`);
  });
}
