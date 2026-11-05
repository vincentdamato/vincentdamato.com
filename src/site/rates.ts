import market from "./market-data.json";

export const MARKET = market;

const YEARS = [1 / 12, 1.5 / 12, 2 / 12, 0.25, 4 / 12, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];

/** Par yield at maturity t, in percent, by straight-line interpolation. */
export function parYield(rates: number[], t: number) {
  if (t <= YEARS[0]) return rates[0];
  for (let i = 1; i < YEARS.length; i++) {
    if (t <= YEARS[i]) {
      const w = (t - YEARS[i - 1]) / (YEARS[i] - YEARS[i - 1]);
      return rates[i - 1] + w * (rates[i] - rates[i - 1]);
    }
  }
  return rates[rates.length - 1];
}

/** Semiannual discount factors bootstrapped from par yields. dfs[i] matures at (i + 1) / 2 years. */
export function bootstrap(rates: number[], years: number, bump = 0) {
  const dfs: number[] = [];
  let annuity = 0;
  for (let i = 1; i <= years * 2; i++) {
    const c = (parYield(rates, i / 2) + bump) / 100;
    const d = (1 - (c / 2) * annuity) / (1 + c / 2);
    dfs.push(d);
    annuity += d;
  }
  return dfs;
}

export type SwapFlow = { year: number; forward: number; fixed: number; floating: number; net: number; df: number; pv: number };
export type SwapResult = { par: number; pv: number; dv01: number; annuity: number; flows: SwapFlow[] };

/** Vanilla fixed-for-floating swap, semiannual on both legs, single curve. payFixed sets the sign. */
export function priceSwap(rates: number[], notional: number, years: number, fixedPct: number, payFixed: boolean, shiftBp = 0): SwapResult {
  const value = (dfs: number[]) => {
    const annuity = dfs.reduce((sum, d) => sum + d / 2, 0);
    const floating = 1 - dfs[dfs.length - 1];
    const sign = payFixed ? 1 : -1;
    return { annuity, par: floating / annuity, pv: sign * notional * (floating - (fixedPct / 100) * annuity) };
  };
  const dfs = bootstrap(rates, years, shiftBp / 100);
  const base = value(dfs);
  const up = value(bootstrap(rates, years, (shiftBp + 1) / 100));
  const sign = payFixed ? 1 : -1;
  const flows = dfs.map((df, i) => {
    const prev = i ? dfs[i - 1] : 1;
    const forward = (prev / df - 1) * 2;
    const fixed = (notional * fixedPct) / 100 / 2;
    const floating = (notional * forward) / 2;
    const net = sign * (floating - fixed);
    return { year: (i + 1) / 2, forward: forward * 100, fixed, floating, net, df, pv: net * df };
  });
  return { par: base.par * 100, pv: base.pv, dv01: up.pv - base.pv, annuity: base.annuity, flows };
}

/** Standard normal CDF (Hart / West double-precision form). */
export function normCdf(x: number) {
  const z = Math.abs(x);
  let c: number;
  if (z > 37) c = 0;
  else {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      let b = 3.52624965998911e-2 * z + 0.700383064443688;
      b = b * z + 6.37396220353165;
      b = b * z + 33.912866078383;
      b = b * z + 112.079291497871;
      b = b * z + 221.213596169931;
      b = b * z + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-2 * z + 1.75566716318264;
      b = b * z + 16.064177579207;
      b = b * z + 86.7807322029461;
      b = b * z + 296.564248779674;
      b = b * z + 637.333633378831;
      b = b * z + 793.826512519948;
      b = b * z + 440.413735824752;
      c /= b;
    } else {
      let b = z + 0.65;
      b = z + 4 / b;
      b = z + 3 / b;
      b = z + 2 / b;
      b = z + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

export type OptionResult = { price: number; delta: number; gamma: number; vega: number; theta: number; rho: number; breakeven: number };

/** Black-Scholes on a non-dividend stock. r and vol are decimals, days are calendar days over 365. */
export function priceOption(call: boolean, spot: number, strike: number, days: number, vol: number, r: number): OptionResult {
  const t = Math.max(days, 0.01) / 365;
  const root = vol * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + (vol * vol) / 2) * t) / root;
  const d2 = d1 - root;
  const pdf = Math.exp((-d1 * d1) / 2) / Math.sqrt(2 * Math.PI);
  const disc = Math.exp(-r * t);
  const price = call ? spot * normCdf(d1) - strike * disc * normCdf(d2) : strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  const carry = call ? -r * strike * disc * normCdf(d2) : r * strike * disc * normCdf(-d2);
  return {
    price,
    delta: call ? normCdf(d1) : normCdf(d1) - 1,
    gamma: pdf / (spot * root),
    vega: (spot * pdf * Math.sqrt(t)) / 100,
    theta: ((-spot * pdf * vol) / (2 * Math.sqrt(t)) + carry) / 365,
    rho: ((call ? 1 : -1) * strike * t * disc * normCdf(call ? d2 : -d2)) / 100,
    breakeven: call ? strike + price : strike - price,
  };
}

export type HedgePoint = { period: string; item: number; hedge: number };
export type HedgeResult = { points: HedgePoint[]; slope: number; r2: number; offset: number; passRegression: boolean; passOffset: boolean };

/** Sample hedge test: fair-value changes for a hedged item and its derivative over eight quarters. */
export function hedgeTest(noise: number, ratio: number): HedgeResult {
  const base = [420, -310, 180, 560, -470, 260, -150, 390];
  const wobble = [0.9, -0.7, 1, -0.4, 0.6, -1, 0.8, -0.5];
  const points = base.map((item, i) => ({
    period: `Q${(i % 4) + 1} Y${Math.floor(i / 4) + 1}`,
    item,
    hedge: -item * ratio + wobble[i] * noise,
  }));
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.item, 0) / n;
  const my = points.reduce((s, p) => s + p.hedge, 0) / n;
  const sxy = points.reduce((s, p) => s + (p.item - mx) * (p.hedge - my), 0);
  const sxx = points.reduce((s, p) => s + (p.item - mx) ** 2, 0);
  const syy = points.reduce((s, p) => s + (p.hedge - my) ** 2, 0);
  const slope = sxy / sxx;
  const r2 = (sxy * sxy) / (sxx * syy);
  const offset = Math.abs(points.reduce((s, p) => s + p.hedge, 0) / points.reduce((s, p) => s + p.item, 0));
  return { points, slope, r2, offset, passRegression: r2 >= 0.8 && slope <= -0.8 && slope >= -1.25, passOffset: offset >= 0.8 && offset <= 1.25 };
}

export function fxPairs() {
  const { rates, prior } = MARKET.fx;
  const usd = rates.USD;
  const usd0 = prior.USD;
  const key = rates as Record<string, number>;
  const old = prior as Record<string, number>;
  const row = (pair: string, now: number, then: number, digits: number) => ({ pair, last: now, change: ((now - then) / then) * 100, digits });
  return [
    row("EUR/USD", usd, usd0, 4),
    row("GBP/USD", usd / key.GBP, usd0 / old.GBP, 4),
    row("AUD/USD", usd / key.AUD, usd0 / old.AUD, 4),
    row("USD/JPY", key.JPY / usd, old.JPY / usd0, 2),
    row("USD/CHF", key.CHF / usd, old.CHF / usd0, 4),
    row("USD/CAD", key.CAD / usd, old.CAD / usd0, 4),
    row("USD/CNY", key.CNY / usd, old.CNY / usd0, 4),
    row("USD/MXN", key.MXN / usd, old.MXN / usd0, 4),
  ];
}

/** Cross rates from ECB euro fixings: cell(a, b) is units of b per one a. */
export function fxMatrix() {
  const rates = { EUR: 1, ...MARKET.fx.rates } as Record<string, number>;
  const codes = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"];
  return { codes, cell: (a: string, b: string) => rates[b] / rates[a] };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
