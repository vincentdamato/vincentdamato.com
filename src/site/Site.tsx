import { useEffect, useMemo, useRef, useState } from "react";
import { BANK, BOOKS, reconcile, type Status } from "./recon";
import { BOARDS, EMAIL, GITHUB, LINKEDIN, OFFERS, PROJECTS, RATINGS, type Board } from "./content";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./site.css";

const WHAT_LEN = 18;
const STATUS_LEN = 10;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";

const pad = (s: string, n: number) => s.padEnd(n, " ").slice(0, n);
const lineOf = (board: Board) => board.rows.flatMap((r) => [pad(r.what, WHAT_LEN), pad(r.status, STATUS_LEN)]);

/** Flips every cell through random letters, then settles left to right. */
function useFlaps(target: string[]) {
  const [shown, setShown] = useState(target);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const STEP_MS = 60;
    let last = -1;
    const tick = (now: number) => {
      const elapsed = now - start;
      const frame = Math.floor(elapsed / STEP_MS);
      if (frame !== last) {
        last = frame;
        let done = true;
        const next = target.map((line, row) =>
          [...line]
            .map((ch, col) => {
              const settle = 240 + row * 70 + col * 26;
              if (elapsed >= settle || ch === " ") return ch;
              done = false;
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            })
            .join(""),
        );
        setShown(next);
        if (done) return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return shown;
}

function Flaps({ text, label }: { text: string; label: string }) {
  return (
    <span className="flaps" role="text" aria-label={label}>
      {[...text].map((ch, i) => (
        <span className="flap" key={i} aria-hidden="true">
          <span key={ch} className="flap-ch">
            {ch === " " ? " " : ch}
          </span>
        </span>
      ))}
    </span>
  );
}

function useMilwaukeeTime() {
  const format = () =>
    new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 20000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

function DepartureBoard() {
  const [active, setActive] = useState(0);
  const time = useMilwaukeeTime();
  const board = BOARDS[active];
  const target = useMemo(() => lineOf(board), [board]);
  const shown = useFlaps(target);

  return (
    <div className="board">
      <div className="board-head">
        <p className="board-place">
          Milwaukee <span>{time}</span>
        </p>
        <div className="board-tabs" role="tablist" aria-label="Choose a board">
        {BOARDS.map((b, i) => (
          <button
            key={b.id}
            id={`board-${b.id}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            className="board-tab"
            onClick={() => setActive(i)}
          >
            {b.label}
          </button>
        ))}
        </div>
      </div>
      <div className="board-rows">
        {board.rows.map((row, r) => (
          <div className="board-row" key={`${board.id}-${r}`}>
            <Flaps text={shown[r * 2] ?? pad(row.what, WHAT_LEN)} label={row.what} />
            <Flaps text={shown[r * 2 + 1] ?? pad(row.status, STATUS_LEN)} label={row.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const STATUS_CLASS: Record<Status, string> = {
  Matched: "ok",
  "Amount differs": "warn",
  "Possible duplicate": "warn",
  "Not in books": "warn",
  "Not cleared": "neutral",
};

function ReconDemo() {
  const [tolerance, setTolerance] = useState(3);
  const [view, setView] = useState<"after" | "before">("after");
  const result = useMemo(() => reconcile(BANK, BOOKS, tolerance), [tolerance]);
  const tied = result.difference === result.explained;

  return (
    <div className="demo">
      <div className="demo-controls">
        <div className="demo-switch" role="group" aria-label="Choose a view">
          <button id="view-before" type="button" aria-pressed={view === "before"} onClick={() => setView("before")}>
            Before
          </button>
          <button id="view-after" type="button" aria-pressed={view === "after"} onClick={() => setView("after")}>
            After
          </button>
        </div>
        <label className="demo-range" htmlFor="tolerance">
          <span>
            Match dates within {tolerance} {tolerance === 1 ? "day" : "days"}
          </span>
          <input
            id="tolerance"
            type="range"
            min={0}
            max={5}
            step={1}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
        </label>
      </div>

      {view === "after" ? (
        <>
          <dl className="demo-stats">
            <div>
              <dt>Matched</dt>
              <dd>{result.matched}</dd>
            </div>
            <div>
              <dt>Need review</dt>
              <dd>{result.review}</dd>
            </div>
            <div>
              <dt>Bank minus books</dt>
              <dd>{money(result.difference)}</dd>
            </div>
            <div>
              <dt>Explained by review items</dt>
              <dd>
                {money(result.explained)}
                <span>{tied ? "Ties out" : "Does not tie"}</span>
              </dd>
            </div>
          </dl>
          <div className="table-scroll">
            <table className="demo-table">
              <thead>
                <tr>
                  <th scope="col">Oct</th>
                  <th scope="col">Bank</th>
                  <th scope="col">Books</th>
                  <th scope="col" className="num">
                    Bank amount
                  </th>
                  <th scope="col" className="num">
                    Book amount
                  </th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.bank?.day ?? r.book?.day}</td>
                    <td>{r.bank?.text ?? "None"}</td>
                    <td>{r.book?.text ?? "None"}</td>
                    <td className="num">{r.bank ? money(r.bank.amount) : ""}</td>
                    <td className="num">{r.book ? money(r.book.amount) : ""}</td>
                    <td>
                      <span className={`pill ${STATUS_CLASS[r.status]}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="before-grid">
          {[
            { title: "Bank statement", rows: BANK },
            { title: "General ledger", rows: BOOKS },
          ].map((side) => (
            <div className="table-scroll" key={side.title}>
              <table className="demo-table">
                <caption>{side.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Oct</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {side.rows.map((t) => (
                    <tr key={t.id}>
                      <td>{t.day}</td>
                      <td>{t.text}</td>
                      <td className="num">{money(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      <p className="demo-note">Made-up data for a made-up company.</p>
    </div>
  );
}

function CopyEmail() {
  const [state, setState] = useState("Copy email");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setState("Copied");
    } catch {
      setState("Select the address to copy");
    }
  };
  return (
    <button id="copy-email" type="button" className="btn btn-light" onClick={copy}>
      {state}
    </button>
  );
}

export default function Site() {
  return (
    <div className="vd">
      <header className="hero">
        <div className="wrap">
          <nav className="nav" aria-label="Main">
            <a href="#services">Services</a>
            <a href="#demo">Demo</a>
            <a href="#projects">Projects</a>
            <a href="#ratings">Ratings</a>
            <a href="#contact">Contact</a>
          </nav>
          <h1>Vincent D'Amato</h1>
          <p className="hero-line">I automate the month-end work your finance team still does by hand.</p>
          <DepartureBoard />
          <div className="hero-actions">
            <a className="btn btn-brass" href="#demo">
              Try the demo
            </a>
            <a className="btn btn-outline" href="#contact">
              Tell me about a process
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="services" className="sec">
          <div className="wrap">
            <h2>Fixed scope, fixed price</h2>
            <p className="lead">
              Every project ends with a tie-out against your current numbers. I work in investment accounting and OTC
              derivatives at a large U.S. life insurer, and I take on a few outside projects for small finance teams.
            </p>
            <ul className="offers">
              {OFFERS.map((o) => (
                <li key={o.name}>
                  <h3>{o.name}</h3>
                  <p>{o.detail}</p>
                  <p className="offer-meta">
                    <span>{o.time}</span>
                    <strong>{o.price}</strong>
                  </p>
                </li>
              ))}
            </ul>
            <p className="fine">
              Best for small asset managers, family offices, RIAs, CPA firms and growing companies. I'm not a CPA, and I
              don't do audit, attest or tax opinion work.
            </p>
          </div>
        </section>

        <section id="demo" className="sec sec-tint">
          <div className="wrap">
            <h2>Watch a reconciliation clear itself</h2>
            <p className="lead">
              This is working matching logic on a fake October bank rec. Move the slider and see which items clear, then
              check that what's left explains the whole difference.
            </p>
            <ReconDemo />
          </div>
        </section>

        <section id="projects" className="sec">
          <div className="wrap">
            <h2>Things I've built</h2>
            <ul className="projects">
              {PROJECTS.map((p) => (
                <li key={p.name}>
                  <div>
                    <h3>{p.href ? <a href={p.href}>{p.name}</a> : p.name}</h3>
                    <p className="role">{p.role}</p>
                  </div>
                  <p>{p.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="ratings" className="sec sec-tint">
          <div className="wrap">
            <h2>Things I love, rated</h2>
            <p className="lead">The rest of my life, under the same scale I use for Steam game reviews.</p>
            <div className="table-scroll">
              <table className="ratings">
                <thead>
                  <tr>
                    <th scope="col">Issuer</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Outlook</th>
                    <th scope="col">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {RATINGS.map((r) => (
                    <tr key={r.name}>
                      <th scope="row">{r.name}</th>
                      <td className="grade">{r.rating}</td>
                      <td>{r.outlook}</td>
                      <td>{r.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">Bond Wizard Ratings Desk. Personal opinions, and not credit ratings.</p>
          </div>
        </section>
      </main>

      <footer id="contact" className="contact">
        <div className="wrap">
          <h2>Send me the process that eats your month-end</h2>
          <p className="lead">Tell me what it is and how long it takes. I'll tell you what it would take to fix it.</p>
          <p className="contact-mail">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
          <div className="contact-actions">
            <CopyEmail />
            <a className="btn btn-outline" href={LINKEDIN}>
              LinkedIn
            </a>
            <a className="btn btn-outline" href={GITHUB}>
              GitHub
            </a>
          </div>
          <p className="fine">Milwaukee, Wisconsin. © {new Date().getFullYear()} Vincent D'Amato.</p>
        </div>
      </footer>
    </div>
  );
}
