import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fxMatrix, fxPairs, hedgeTest, MARKET, parYield, priceOption, priceSwap, shortDate } from "./rates";

type View = "MKT" | "CRV" | "FX" | "SWAP" | "OPT" | "HEDG" | "HELP";

const FUNCTIONS: { code: View; label: string }[] = [
  { code: "MKT", label: "Markets" },
  { code: "CRV", label: "Yield curve" },
  { code: "FX", label: "Currencies" },
  { code: "SWAP", label: "Swap pricer" },
  { code: "OPT", label: "Option pricer" },
  { code: "HEDG", label: "Hedge test" },
  { code: "HELP", label: "Help" },
];

const COMMANDS: { code: string; text: string; usage?: string }[] = [
  { code: "MKT", text: "Treasuries, funding and currencies" },
  { code: "CRV", text: "Treasury curve against a month and a year ago" },
  { code: "FX", text: "Dollar pairs and a cross-rate matrix" },
  { code: "SWAP", text: "Price a fixed-for-floating swap", usage: "SWAP 10 PAY 4.75" },
  { code: "OPT", text: "Price an option with Greeks", usage: "OPT C 100 105 30 25" },
  { code: "HEDG", text: "Hedge effectiveness test on sample numbers" },
  { code: "HELP", text: "List every command" },
];

const n2 = (v: number, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const usd = (v: number) => `${v <= -0.5 ? "-" : ""}$${n2(Math.abs(v), 0)}`;
const signed = (v: number, d = 1) => {
  const r = Number(v.toFixed(d));
  return r === 0 ? n2(0, d) : `${r > 0 ? "+" : ""}${n2(r, d)}`;
};
const tone = (v: number) => (v > 0.0049 ? "up" : v < -0.0049 ? "down" : "");
const tsyDate = shortDate(MARKET.curve.date);
const fxDate = shortDate(MARKET.fx.date);
const idx = (t: string) => MARKET.tenors.indexOf(t);
const bp = (a: number, b: number) => Math.round((a - b) * 100);

/** Tracks an element's size so charts redraw to fit rather than stretch. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 640, h: 300 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: Math.max(240, el.clientWidth), h: Math.max(140, el.clientHeight) });
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return [ref, size] as const;
}

function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`t-panel ${className}`}>
      <h3>
        {title}
        {note && <small>{note}</small>}
      </h3>
      {children}
    </section>
  );
}

function Field({ id, label, value, onChange, step = 1, min, max }: { id: string; label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label className="t-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Stat({ label, value, kind }: { label: string; value: string; kind?: string }) {
  return (
    <div className="t-stat">
      <dt>{label}</dt>
      <dd className={kind}>{value}</dd>
    </div>
  );
}

function CurveChart() {
  const [at, setAt] = useState<number | null>(null);
  const [box, { w: W, h: H }] = useSize<HTMLDivElement>();
  const pad = { l: 40, r: 14, t: 12, b: 24 };
  const series = [
    { name: `Latest, ${tsyDate}`, rates: MARKET.curve.rates, cls: "now" },
    { name: `Month ago, ${shortDate(MARKET.monthAgo.date)}`, rates: MARKET.monthAgo.rates, cls: "month" },
    { name: `Year ago, ${shortDate(MARKET.yearAgo.date)}`, rates: MARKET.yearAgo.rates, cls: "year" },
  ];
  const all = series.flatMap((s) => s.rates);
  const lo = Math.floor(Math.min(...all) * 2) / 2;
  const hi = Math.ceil(Math.max(...all) * 2) / 2;
  const x = (i: number) => pad.l + (i / (MARKET.tenors.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 0.001; v += 0.5) ticks.push(v);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAt(Math.max(0, Math.min(MARKET.tenors.length - 1, Math.round(((e.clientX - rect.left - pad.l) / (W - pad.l - pad.r)) * (MARKET.tenors.length - 1)))));
  };
  return (
    <figure className="t-chart">
      <div className="t-plot" ref={box}>
        <svg width={W} height={H} role="img" aria-label="U.S. Treasury par yield curve" onPointerMove={onMove} onPointerLeave={() => setAt(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="grid" />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end">
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          {MARKET.tenors.map((t, i) =>
            W > 620 || i % 2 === 0 ? (
              <text key={t} x={x(i)} y={H - 7} textAnchor="middle">
                {t}
              </text>
            ) : null,
          )}
          {series
            .slice()
            .reverse()
            .map((s) => (
              <polyline key={s.cls} className={`line ${s.cls}`} points={s.rates.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            ))}
          {at !== null && (
            <g>
              <line x1={x(at)} x2={x(at)} y1={pad.t} y2={H - pad.b} className="cross" />
              {series.map((s) => (
                <circle key={s.cls} className={`dot ${s.cls}`} cx={x(at)} cy={y(s.rates[at])} r={4} />
              ))}
            </g>
          )}
        </svg>
      </div>
      <figcaption>
        {series.map((s) => (
          <span key={s.cls} className={s.cls}>
            <i />
            {s.name}
            {at !== null ? `: ${MARKET.tenors[at]} ${s.rates[at].toFixed(2)}%` : ""}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function YieldRows({ tenors }: { tenors: string[] }) {
  return (
    <table className="t-table">
      <thead>
        <tr>
          <th scope="col">Tenor</th>
          <th scope="col">Yield %</th>
          <th scope="col">1D bp</th>
          <th scope="col">1M bp</th>
          <th scope="col">1Y bp</th>
        </tr>
      </thead>
      <tbody>
        {tenors.map((t) => {
          const i = idx(t);
          const last = MARKET.curve.rates[i];
          const moves = [MARKET.prior, MARKET.monthAgo, MARKET.yearAgo].map((s) => bp(last, s.rates[i]));
          return (
            <tr key={t}>
              <th scope="row">{t}</th>
              <td className="amber">{last.toFixed(2)}</td>
              {moves.map((m, k) => (
                <td key={k} className={tone(m)}>
                  {signed(m, 0)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function FxRows({ limit }: { limit?: number }) {
  const rows = useMemo(fxPairs, []);
  return (
    <table className="t-table">
      <thead>
        <tr>
          <th scope="col">Pair</th>
          <th scope="col">Last</th>
          <th scope="col">1D %</th>
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, limit).map((r) => (
          <tr key={r.pair}>
            <th scope="row">{r.pair}</th>
            <td className="amber">{n2(r.last, r.digits)}</td>
            <td className={tone(r.change)}>{signed(r.change, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarketsView() {
  const gap = (a: string, b: string, s: { rates: number[] }) => bp(s.rates[idx(b)], s.rates[idx(a)]);
  const spreads = [
    ["2s10s", "2Y", "10Y"],
    ["3m10y", "3M", "10Y"],
    ["5s30s", "5Y", "30Y"],
  ] as const;
  const sofr = MARKET.sofr[0];
  const sofrMove = bp(sofr.rate, MARKET.sofr[1].rate);
  return (
    <div className="t-mkt">
      <Panel title="U.S. Treasury par yields" note={`Close ${tsyDate}`}>
        <YieldRows tenors={["3M", "6M", "2Y", "5Y", "10Y", "30Y"]} />
      </Panel>
      <Panel title="Funding and spreads" note={`Close ${tsyDate}`}>
        <table className="t-table">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Level</th>
              <th scope="col">1D bp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">SOFR</th>
              <td className="amber">{sofr.rate.toFixed(2)}%</td>
              <td className={tone(sofrMove)}>{signed(sofrMove, 0)}</td>
            </tr>
            {spreads.map(([name, a, b]) => {
              const move = gap(a, b, MARKET.curve) - gap(a, b, MARKET.prior);
              return (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td className="amber">{signed(gap(a, b, MARKET.curve), 0)} bp</td>
                  <td className={tone(move)}>{signed(move, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title="Currencies" note={`ECB fixing ${fxDate}`}>
        <FxRows limit={6} />
      </Panel>
      <Panel title="Treasury curve" className="wide">
        <CurveChart />
      </Panel>
    </div>
  );
}

function CurveView() {
  return (
    <div className="t-side">
      <Panel title="U.S. Treasury par yield curve" note={`Close ${tsyDate}`}>
        <CurveChart />
      </Panel>
      <Panel title="All tenors" className="t-fill">
        <div className="t-scroll">
          <YieldRows tenors={MARKET.tenors} />
        </div>
      </Panel>
    </div>
  );
}

function FxView() {
  const { codes, cell } = useMemo(fxMatrix, []);
  return (
    <div className="t-side">
      <Panel title="Cross rates" note={`Units of the column currency per one of the row currency, ECB fixing ${fxDate}`}>
        <div className="t-scroll">
          <table className="t-table matrix">
            <thead>
              <tr>
                <th scope="col">Per 1</th>
                {codes.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row}>
                  <th scope="row">{row}</th>
                  {codes.map((col) => (
                    <td key={col} className={row === col ? "self" : ""}>
                      {row === col ? "" : n2(cell(row, col), cell(row, col) >= 100 ? 2 : cell(row, col) < 0.1 ? 6 : 4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Dollar pairs" className="t-fill">
        <div className="t-scroll">
          <FxRows />
        </div>
      </Panel>
    </div>
  );
}

function SwapView({ initial }: { initial: { years: number; pay: boolean; fixed: number | null } }) {
  const [notional, setNotional] = useState(10_000_000);
  const [years, setYears] = useState(initial.years);
  const [pay, setPay] = useState(initial.pay);
  const [fixed, setFixed] = useState(initial.fixed ?? 0);
  const [custom, setCustom] = useState(initial.fixed !== null);
  const [shift, setShift] = useState(0);
  const span = Math.max(1, Math.min(30, Math.round(years)));
  const par = priceSwap(MARKET.curve.rates, notional, span, 0, pay).par;
  const rate = custom ? fixed : Number(par.toFixed(3));
  const base = priceSwap(MARKET.curve.rates, notional, span, rate, pay);
  const moved = priceSwap(MARKET.curve.rates, notional, span, rate, pay, shift);
  return (
    <div className="t-tool">
      <form className="t-form" onSubmit={(e) => e.preventDefault()}>
        <div className="t-seg" role="group" aria-label="Direction">
          <button type="button" aria-pressed={pay} onClick={() => setPay(true)}>
            Pay fixed
          </button>
          <button type="button" aria-pressed={!pay} onClick={() => setPay(false)}>
            Receive fixed
          </button>
        </div>
        <Field id="swap-notional" label="Notional ($)" value={notional} onChange={setNotional} step={1000000} min={0} />
        <Field id="swap-years" label="Tenor (years)" value={years} onChange={setYears} min={1} max={30} />
        <Field
          id="swap-fixed"
          label="Fixed rate (%)"
          value={rate}
          step={0.05}
          onChange={(v) => {
            setCustom(true);
            setFixed(v);
          }}
        />
        <button type="button" className="t-plain" onClick={() => setCustom(false)} disabled={!custom}>
          Reset to par
        </button>
        <label className="t-field" htmlFor="swap-shift">
          <span>Parallel shift: {signed(shift, 0)} bp</span>
          <input id="swap-shift" type="range" min={-200} max={200} step={5} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
        </label>
      </form>
      <div>
        <dl className="t-stats">
          <Stat label="Par rate" value={`${base.par.toFixed(3)}%`} kind="amber" />
          <Stat label="PV" value={usd(base.pv)} kind={tone(base.pv)} />
          <Stat label={shift ? `PV after ${signed(shift, 0)} bp` : "PV after shift"} value={usd(moved.pv)} kind={tone(moved.pv)} />
          <Stat label="DV01" value={usd(base.dv01)} kind={tone(base.dv01)} />
          <Stat label="Annuity" value={base.annuity.toFixed(4)} />
        </dl>
        <div className="t-scroll">
          <table className="t-table flows">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Forward %</th>
                <th scope="col">Fixed</th>
                <th scope="col">Floating</th>
                <th scope="col">Net</th>
                <th scope="col">DF</th>
                <th scope="col">PV</th>
              </tr>
            </thead>
            <tbody>
              {base.flows.map((f) => (
                <tr key={f.year}>
                  <th scope="row">{f.year.toFixed(1)}</th>
                  <td>{f.forward.toFixed(3)}</td>
                  <td>{usd(f.fixed)}</td>
                  <td>{usd(f.floating)}</td>
                  <td className={tone(f.net)}>{usd(f.net)}</td>
                  <td>{f.df.toFixed(4)}</td>
                  <td className={tone(f.pv)}>{usd(f.pv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-note">Single-curve model, semiannual on both legs. The {tsyDate} Treasury par curve stands in for a SOFR swap curve, so the rate shown is not a dealer quote. Not investment advice.</p>
      </div>
    </div>
  );
}

function OptionView({ initial }: { initial: { call: boolean; spot: number; strike: number; days: number; vol: number } }) {
  const [call, setCall] = useState(initial.call);
  const [spot, setSpot] = useState(initial.spot);
  const [strike, setStrike] = useState(initial.strike);
  const [days, setDays] = useState(initial.days);
  const [vol, setVol] = useState(initial.vol);
  const r = parYield(MARKET.curve.rates, Math.max(days, 1) / 365) / 100;
  const safe = spot > 0 && strike > 0 && days > 0 && vol > 0;
  const s0 = safe ? spot : 100;
  const k0 = safe ? strike : 100;
  const d0 = safe ? days : 30;
  const v0 = safe ? vol / 100 : 0.25;
  const o = priceOption(call, s0, k0, d0, v0, r);
  const [box, { w: W, h: H }] = useSize<HTMLDivElement>();
  const lo = k0 * 0.7;
  const hi = k0 * 1.3;
  const payoff = (s: number) => Math.max(call ? s - k0 : k0 - s, 0) - o.price;
  const today = (s: number) => priceOption(call, s, k0, d0, v0, r).price - o.price;
  const samples = Array.from({ length: 61 }, (_, i) => lo + ((hi - lo) * i) / 60);
  const ys = samples.flatMap((s) => [payoff(s), today(s)]);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const px = (s: number) => 40 + ((s - lo) / (hi - lo)) * (W - 56);
  const py = (v: number) => H - 26 - ((v - yLo) / (yHi - yLo || 1)) * (H - 44);
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? n2(v, 0) : v.toFixed(v < 10 ? 2 : 1));
  return (
    <div className="t-tool">
      <form className="t-form" onSubmit={(e) => e.preventDefault()}>
        <div className="t-seg" role="group" aria-label="Option type">
          <button type="button" aria-pressed={call} onClick={() => setCall(true)}>
            Call
          </button>
          <button type="button" aria-pressed={!call} onClick={() => setCall(false)}>
            Put
          </button>
        </div>
        <Field id="opt-spot" label="Spot" value={spot} onChange={setSpot} min={0} />
        <Field id="opt-strike" label="Strike" value={strike} onChange={setStrike} min={0} />
        <Field id="opt-days" label="Days to expiry" value={days} onChange={setDays} min={1} />
        <Field id="opt-vol" label="Volatility (%)" value={vol} onChange={setVol} min={1} />
        <p className="t-note">Rate {(r * 100).toFixed(2)}% from the Treasury curve at this expiry.</p>
      </form>
      <div>
        <dl className="t-stats">
          <Stat label="Price" value={o.price.toFixed(4)} kind="amber" />
          <Stat label="Delta" value={o.delta.toFixed(4)} />
          <Stat label="Gamma" value={o.gamma.toFixed(4)} />
          <Stat label="Vega / vol pt" value={o.vega.toFixed(4)} />
          <Stat label="Theta / day" value={o.theta.toFixed(4)} />
          <Stat label="Rho / 1%" value={o.rho.toFixed(4)} />
          <Stat label="Breakeven" value={o.breakeven.toFixed(2)} />
        </dl>
        <figure className="t-chart">
          <div className="t-plot" ref={box}>
          <svg width={W} height={H} role="img" aria-label="Option profit and loss by spot price">
            <line x1={40} x2={W - 16} y1={py(0)} y2={py(0)} className="grid" />
            <line x1={px(s0)} x2={px(s0)} y1={14} y2={H - 26} className="cross" />
            <polyline className="line month" points={samples.map((s) => `${px(s)},${py(today(s))}`).join(" ")} />
            <polyline className="line now" points={samples.map((s) => `${px(s)},${py(payoff(s))}`).join(" ")} />
            {[lo, k0, hi].map((s) => (
              <text key={s} x={px(s)} y={H - 8} textAnchor="middle">
                {fmt(s)}
              </text>
            ))}
            <text x={34} y={py(0) + 4} textAnchor="end">
              0
            </text>
          </svg>
          </div>
          <figcaption>
            <span className="now">
              <i />
              P&amp;L at expiry
            </span>
            <span className="month">
              <i />
              P&amp;L today
            </span>
          </figcaption>
        </figure>
        <p className="t-note">Black-Scholes, European exercise, no dividends. Not investment advice.</p>
      </div>
    </div>
  );
}

function HedgeView() {
  const [noise, setNoise] = useState(40);
  const [ratio, setRatio] = useState(100);
  const h = hedgeTest(noise, ratio / 100);
  const W = 340;
  const P = 30;
  const max = Math.max(700, ...h.points.flatMap((p) => [Math.abs(p.item), Math.abs(p.hedge)]));
  const sx = (v: number) => W / 2 + (v / max) * (W / 2 - P);
  const sy = (v: number) => W / 2 - (v / max) * (W / 2 - P);
  return (
    <div className="t-tool">
      <form className="t-form" onSubmit={(e) => e.preventDefault()}>
        <label className="t-field" htmlFor="hedge-ratio">
          <span>Hedge ratio: {ratio}%</span>
          <input id="hedge-ratio" type="range" min={50} max={150} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
        </label>
        <label className="t-field" htmlFor="hedge-noise">
          <span>Basis noise: ${noise}k</span>
          <input id="hedge-noise" type="range" min={0} max={300} step={5} value={noise} onChange={(e) => setNoise(Number(e.target.value))} />
        </label>
        <p className={`t-verdict ${h.passRegression && h.passOffset ? "pass" : "fail"}`}>{h.passRegression && h.passOffset ? "Highly effective on both tests" : h.passRegression || h.passOffset ? "Tests disagree: review needed" : "Not highly effective"}</p>
      </form>
      <div>
        <dl className="t-stats">
          <Stat label="Regression slope" value={h.slope.toFixed(3)} kind={h.slope <= -0.8 && h.slope >= -1.25 ? "up" : "down"} />
          <Stat label="R-squared" value={h.r2.toFixed(3)} kind={h.r2 >= 0.8 ? "up" : "down"} />
          <Stat label="Dollar offset" value={`${n2(h.offset * 100, 1)}%`} kind={h.passOffset ? "up" : "down"} />
        </dl>
        <div className="t-pair">
          <figure className="t-chart">
            <svg viewBox={`0 0 ${W} ${W}`} role="img" aria-label="Change in hedged item against change in derivative">
              <line x1={P} x2={W - P} y1={W / 2} y2={W / 2} className="grid" />
              <line x1={W / 2} x2={W / 2} y1={P} y2={W - P} className="grid" />
              <line x1={sx(-max)} y1={sy(-max * h.slope)} x2={sx(max)} y2={sy(max * h.slope)} className="line month" />
              {h.points.map((p) => (
                <circle key={p.period} className="dot now" cx={sx(p.item)} cy={sy(p.hedge)} r={5} />
              ))}
              <text x={W - P} y={W / 2 - 6} textAnchor="end">
                Hedged item
              </text>
              <text x={W / 2 + 6} y={P - 8}>
                Derivative
              </text>
            </svg>
          </figure>
          <div className="t-scroll">
            <table className="t-table">
              <thead>
                <tr>
                  <th scope="col">Quarter</th>
                  <th scope="col">Item $k</th>
                  <th scope="col">Hedge $k</th>
                </tr>
              </thead>
              <tbody>
                {h.points.map((p) => (
                  <tr key={p.period}>
                    <th scope="row">{p.period}</th>
                    <td>{n2(p.item, 0)}</td>
                    <td>{n2(p.hedge, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="t-note">Sample numbers. The 80 to 125% range and an R-squared of 0.80 are common practice; ASC 815 does not set a numeric threshold for &quot;highly effective.&quot;</p>
      </div>
    </div>
  );
}

function HelpView({ onRun }: { onRun: (code: string) => void }) {
  return (
    <div className="t-help">
      <table className="t-table">
        <thead>
          <tr>
            <th scope="col">Command</th>
            <th scope="col" className="left">What it does</th>
            <th scope="col" className="left">Example</th>
          </tr>
        </thead>
        <tbody>
          {COMMANDS.map((c) => (
            <tr key={c.code}>
              <th scope="row">
                <button type="button" className="t-link" onClick={() => onRun(c.usage ?? c.code)}>
                  {c.code}
                </button>
              </th>
              <td className="left">{c.text}</td>
              <td className="amber left">{c.usage ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="t-note">Press Tab to complete a command, and the up arrow to bring back the last one.</p>
    </div>
  );
}

function Tape() {
  const items = useMemo(() => {
    const y = ["2Y", "5Y", "10Y", "30Y"].map((t) => {
      const i = idx(t);
      return { name: `UST ${t}`, last: MARKET.curve.rates[i].toFixed(2), move: bp(MARKET.curve.rates[i], MARKET.prior.rates[i]), unit: "bp" };
    });
    const fx = fxPairs().map((r) => ({ name: r.pair, last: n2(r.last, r.digits), move: r.change, unit: "%" }));
    return [...y, { name: "SOFR", last: MARKET.sofr[0].rate.toFixed(2), move: bp(MARKET.sofr[0].rate, MARKET.sofr[1].rate), unit: "bp" }, ...fx];
  }, []);
  const strip = items.map((t) => (
    <span key={t.name}>
      <b>{t.name}</b> {t.last} <em className={tone(t.move)}>{signed(t.move, t.unit === "bp" ? 0 : 2)}{t.unit === "bp" ? " bp" : "%"}</em>
    </span>
  ));
  return (
    <div className="t-tape" aria-hidden="true">
      <div>
        {strip}
        {strip}
      </div>
    </div>
  );
}

export default function Terminal() {
  const [view, setView] = useState<View>("MKT");
  const [command, setCommand] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [swap, setSwap] = useState({ key: 0, years: 10, pay: true, fixed: null as number | null });
  const [opt, setOpt] = useState({ key: 0, call: true, spot: 100, strike: 105, days: 30, vol: 25 });
  const input = useRef<HTMLInputElement>(null);
  const word = command.trim().toUpperCase();
  const hints = word && !word.includes(" ") ? COMMANDS.filter((c) => c.code.startsWith(word) && c.code !== word).slice(0, 5) : [];

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, [view]);

  const run = (raw: string) => {
    const parts = raw.trim().toUpperCase().split(/\s+/).filter(Boolean);
    const code = parts[0];
    if (!code) return;
    setHistory((h) => [raw.trim(), ...h].slice(0, 20));
    setCommand("");
    setNote("");
    const rest = parts.slice(1);
    if (code === "SWAP") {
      const years = Number(rest[0]);
      const fixed = Number(rest[2]);
      setSwap((s) => ({ key: s.key + 1, years: years >= 1 && years <= 30 ? Math.round(years) : 10, pay: !rest.includes("REC"), fixed: rest[2] && Number.isFinite(fixed) ? fixed : null }));
      setView("SWAP");
    } else if (code === "OPT") {
      const nums = rest.filter((p) => !Number.isNaN(Number(p))).map(Number);
      const [spot = 100, strike = 105, days = 30, vol = 25] = nums;
      if ([spot, strike, days, vol].every((v) => v > 0)) {
        setOpt((o) => ({ key: o.key + 1, call: !rest.includes("P"), spot, strike, days, vol }));
        setView("OPT");
      } else setNote("Inputs must be above zero. Try OPT C 100 105 30 25");
    } else if (FUNCTIONS.some((f) => f.code === code)) {
      setView(code as View);
    } else {
      setNote(`No function named ${code}. Type HELP for the list.`);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && hints[0]) {
      e.preventDefault();
      setCommand(hints[0].code);
    } else if (e.key === "ArrowUp" && history[0]) {
      e.preventDefault();
      setCommand(history[0]);
    }
  };

  return (
    <article className="term2">
      <form
        className="t-bar"
        onSubmit={(e) => {
          e.preventDefault();
          run(command);
        }}
      >
        <h2 id="panel-title">Global Markets</h2>
        <div className="t-prompt">
          <label htmlFor="term-input">GO&gt;</label>
          <input id="term-input" ref={input} autoComplete="off" spellCheck={false} placeholder="Type a command, or HELP" value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={onKey} />
          {hints.length > 0 && (
            <ul className="t-hints">
              {hints.map((h) => (
                <li key={h.code}>
                  <button type="button" onClick={() => run(h.code)}>
                    <b>{h.code}</b> {h.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="t-status" role="status">
          {note}
        </p>
      </form>
      <nav className="t-keys" aria-label="Terminal functions">
        {FUNCTIONS.map((f) => (
          <button key={f.code} id={`fn-${f.code}`} type="button" aria-pressed={view === f.code} onClick={() => run(f.code)}>
            <b>{f.code}</b>
            <span>{f.label}</span>
          </button>
        ))}
      </nav>
      <main className="t-pane">
        {view === "MKT" && <MarketsView />}
        {view === "CRV" && <CurveView />}
        {view === "FX" && <FxView />}
        {view === "SWAP" && <SwapView key={swap.key} initial={swap} />}
        {view === "OPT" && <OptionView key={opt.key} initial={opt} />}
        {view === "HEDG" && <HedgeView />}
        {view === "HELP" && <HelpView onRun={run} />}
      </main>
      <Tape />
      <footer className="t-source">
        Daily data, not live. Treasury par yields from the{" "}
        <a href="https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve" target="_blank" rel="noreferrer">
          U.S. Treasury
        </a>
        , SOFR from the{" "}
        <a href="https://www.newyorkfed.org/markets/reference-rates/sofr" target="_blank" rel="noreferrer">
          New York Fed
        </a>
        , and currencies derived from{" "}
        <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noreferrer">
          ECB
        </a>{" "}
        euro reference rates. SOFR is subject to the New York Fed&apos;s Terms of Use at newyorkfed.org. The New York Fed is not responsible for this republication, does not sanction or endorse it, and has no liability for its use. SOFR is calculated under a license from DTCC Solutions LLC, which has no liability for this content.
      </footer>
    </article>
  );
}
