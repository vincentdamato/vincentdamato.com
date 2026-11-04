import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BANK, BOOKS, reconcile, type Status } from "./recon";
import { EMAIL, GITHUB, ITEMS, LINKEDIN, NOTES, OFFERS, PROJECTS, RATINGS, type ItemId } from "./content";
import { createOffice, MODE_LABEL, type Office } from "./scene";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/bodoni-moda/500.css";
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

type PanelId = Exclude<ItemId, "lamp">;

const STORE_KEY = "vd-office-found";

function readFound(): ItemId[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

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

function PanelBody({ id }: { id: PanelId }) {
  switch (id) {
    case "work":
      return (
        <>
          <h2 id="panel-title">What I do</h2>
          <p>
            I automate month-end and reconciliation work for small finance teams. Every project has a fixed scope and
            price, and ends with a tie-out against your current numbers.
          </p>
          <ul className="rows">
            {OFFERS.map((o) => (
              <li key={o.name}>
                <h3>{o.name}</h3>
                <p>{o.detail}</p>
                <p className="note">{o.meta}</p>
              </li>
            ))}
          </ul>
          <h3 className="sub">See it work</h3>
          <p>A sample October bank reconciliation. Move the slider to change which items clear.</p>
          <ReconDemo />
        </>
      );
    case "projects":
      return (
        <>
          <h2 id="panel-title">Projects</h2>
          <ul className="rows">
            {PROJECTS.map((p) => (
              <li key={p.name}>
                <h3>{p.href ? <a href={p.href}>{p.name}</a> : p.name}</h3>
                <p>{p.detail}</p>
              </li>
            ))}
          </ul>
        </>
      );
    case "about":
      return (
        <>
          <h2 id="panel-title">About me</h2>
          <p>
            I'm Vincent, and I'm based in Milwaukee. I work in investment accounting and OTC derivatives at a large U.S.
            life insurer, and I build automation for the work around it.
          </p>
          <p>
            I studied finance at the University of Iowa, and I've guest lectured at UW-Milwaukee. I'm not a CPA, and I
            don't do audit, attest or tax opinion work.
          </p>
        </>
      );
    case "contact":
      return (
        <>
          <h2 id="panel-title">Say hello</h2>
          <p>Tell me about the process that eats your month-end, and I'll tell you what it would take to fix it.</p>
          <p className="big-link">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </p>
          <p className="links">
            <a href={LINKEDIN}>LinkedIn</a>
            <a href={GITHUB}>GitHub</a>
          </p>
        </>
      );
    case "ratings":
      return (
        <>
          <h2 id="panel-title">Bond Wizard Ratings Desk</h2>
          <p>The things I love, on the scale I use for Steam game reviews.</p>
          <div className="table-scroll">
            <table>
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
          <p className="note">Personal opinions, not credit ratings.</p>
        </>
      );
    default: {
      const note = NOTES[id];
      return (
        <>
          <h2 id="panel-title">{note.title}</h2>
          {note.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </>
      );
    }
  }
}

export default function Site() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const officeRef = useRef<Office | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<PanelId | null>(null);
  const [lightNote, setLightNote] = useState("");
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<{ id: ItemId; x: number; y: number } | null>(null);
  const [found, setFound] = useState<ItemId[]>(readFound);
  const [noWebgl, setNoWebgl] = useState(false);

  const openItem = useCallback((id: ItemId) => {
    setMenu(false);
    if (id === "lamp") {
      const mode = officeRef.current?.cycleLight();
      if (mode) setLightNote(MODE_LABEL[mode]);
    } else {
      setOpen(id);
      officeRef.current?.focus(id);
    }
    setFound((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* Progress simply isn't remembered in this browser. */
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    officeRef.current?.focus(null);
    document.getElementById("menu-toggle")?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const office = createOffice(canvasRef.current, {
        onHover: (id, x, y) => setHover(id ? { id, x, y } : null),
        onPick: openItem,
      });
      officeRef.current = office;
      if (window.location.hash === "#still") {
        (window as unknown as { __office: Office }).__office = office;
      }
      return () => office.dispose();
    } catch {
      setNoWebgl(true);
    }
  }, [openItem]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const label = hover ? ITEMS.find((i) => i.id === hover.id)?.label : null;

  return (
    <div className={`vd ${noWebgl ? "no-webgl" : ""}`}>
      <canvas ref={canvasRef} className="room" aria-hidden="true" />

      <header className="intro" hidden={!!open}>
        <h1>Vincent D'Amato</h1>
        <p>I automate month-end and reconciliation work for small finance teams.</p>
        {!noWebgl && (
          <>
            <p className="hint hint-mouse">Click around my office, or start with the left monitor.</p>
            <p className="hint hint-touch">Drag to look around, and tap anything in the room.</p>
          </>
        )}
      </header>

      <div className="topbar">
        <p className="count" aria-live="polite">
          {lightNote ? `${lightNote}. ` : ""}
          {found.length} of {ITEMS.length} found
        </p>
        <button id="menu-toggle" type="button" className="chip" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          {menu ? "Close menu" : "Menu"}
        </button>
      </div>

      {(menu || noWebgl) && (
        <nav className="menu" aria-label="Everything in the office">
          {ITEMS.filter((item) => !(noWebgl && item.id === "lamp")).map((item) => (
            <button key={item.id} id={`item-${item.id}`} type="button" onClick={() => openItem(item.id)}>
              {item.label}
              {found.includes(item.id) ? <span className="seen"> found</span> : null}
            </button>
          ))}
        </nav>
      )}

      {label && hover && !open && (
        <div className="tip" style={{ left: hover.x + 14, top: hover.y + 16 }}>
          {label}
        </div>
      )}

      {open && (
        <aside className="panel" role="dialog" aria-labelledby="panel-title">
          <button id="panel-close" ref={closeRef} type="button" className="chip dark" onClick={close}>
            Back to the office
          </button>
          <PanelBody id={open} />
        </aside>
      )}
    </div>
  );
}
