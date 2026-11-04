import { useMemo, useState } from "react";
import { BANK, BOOKS, reconcile, type Status } from "./recon";
import { EMAIL, GITHUB, LINKEDIN, OFFERS, OUTSIDE_WORK, PROJECTS } from "./content";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "./site.css";

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
  const [showMatched, setShowMatched] = useState(false);
  const result = useMemo(() => reconcile(BANK, BOOKS, tolerance), [tolerance]);
  const rows = showMatched ? result.rows : result.rows.filter((r) => r.status !== "Matched");
  const tied = result.difference === result.explained;

  return (
    <div className="demo">
      <p className="demo-summary">
        {result.matched} matched, {result.review} to review. {money(result.difference)} difference,{" "}
        {tied ? "fully explained" : "not fully explained"}.
      </p>

      <div className="demo-controls">
        <label htmlFor="tolerance">
          Match dates within {tolerance} {tolerance === 1 ? "day" : "days"}
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
        <label htmlFor="show-matched" className="demo-check">
          <input
            id="show-matched"
            type="checkbox"
            checked={showMatched}
            onChange={(e) => setShowMatched(e.target.checked)}
          />
          Show matched items
        </label>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Oct</th>
              <th scope="col">Item</th>
              <th scope="col">Result</th>
              <th scope="col" className="num">
                Bank
              </th>
              <th scope="col" className="num">
                Books
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.bank?.day ?? r.book?.day}</td>
                <td>{r.book?.text ?? r.bank?.text}</td>
                <td>
                  <span className={`pill ${STATUS_CLASS[r.status]}`}>{r.status}</span>
                </td>
                <td className="num">{r.bank ? money(r.bank.amount) : ""}</td>
                <td className="num">{r.book ? money(r.book.amount) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Made-up data for a made-up company.</p>
    </div>
  );
}

export default function Site() {
  return (
    <div className="vd">
      <div className="page">
        <header>
          <h1>Vincent D'Amato</h1>
          <p className="intro">I automate month-end and reconciliation work for small finance teams.</p>
          <p className="links">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <a href={LINKEDIN}>LinkedIn</a>
            <a href={GITHUB}>GitHub</a>
          </p>
        </header>

        <section aria-labelledby="work">
          <h2 id="work">Work with me</h2>
          <p>
            Every project has a fixed scope and price, and ends with a tie-out against your current numbers. I work in
            investment accounting and OTC derivatives at a large U.S. life insurer. I'm not a CPA, and I don't do audit,
            attest or tax opinion work.
          </p>
          <ul className="rows">
            {OFFERS.map((o) => (
              <li key={o.name}>
                <h3>{o.name}</h3>
                <p>{o.detail}</p>
                <p className="meta">
                  {o.time}, {o.price.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="demo">
          <h2 id="demo">See it work</h2>
          <p>A sample October bank reconciliation. Move the slider to change which items clear.</p>
          <ReconDemo />
        </section>

        <section aria-labelledby="projects">
          <h2 id="projects">Projects</h2>
          <ul className="rows">
            {PROJECTS.map((p) => (
              <li key={p.name}>
                <h3>{p.href ? <a href={p.href}>{p.name}</a> : p.name}</h3>
                <p>{p.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="outside">
          <h2 id="outside">Outside of work</h2>
          <p>{OUTSIDE_WORK}</p>
        </section>

        <footer>Milwaukee, Wisconsin</footer>
      </div>
    </div>
  );
}
