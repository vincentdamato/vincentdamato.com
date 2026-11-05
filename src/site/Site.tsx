import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ABOUT, BOOK_SHELF, CHESS_ELO, MUSIC, DEGREE, EMAIL, GITHUB, ITEMS, LINKEDIN, MAIN_MENU, NOTES, PLACE_GROUPS, PROJECTS, RATINGS, SOCIALS, type ItemId } from "./content";
import { isMuted, ringPhone, setMuted, unlockSound } from "./ring";
import { DESKTOP_ICONS, drawWallpaper, wallpaperReady } from "./wallpaper";
import degreeUrl from "./assets/degree.webp";
import coneUrl from "./assets/cone.webp";
import rudyFace from "./assets/rudy-face.webp";
import Terminal from "./Terminal";
import { Calculator, Mines, Notepad, PowerScreen, shouldBoot } from "./DesktopApps";
import { createOffice, HOVER_ONLY, MODE_LABEL, type Office } from "./scene";
import { drawWorldMap, whenMapFontsReady } from "./worldmap";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/bodoni-moda/500.css";
import "./site.css";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

type RoomId = Exclude<ItemId, "lamp" | "cradle" | "mannequin">;
type PanelId = RoomId | "resume";

const TOUR = ITEMS.map((i) => i.id).filter((id): id is RoomId => id !== "lamp" && id !== "cradle" && id !== "mannequin" && id !== "contact" && !HOVER_ONLY.includes(id));

const STORE_KEY = "vd-office-found";

function readFound(): ItemId[] {
  try {
    const saved: ItemId[] = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    return saved.filter((id) => ITEMS.some((i) => i.id === id));
  } catch {
    return [];
  }
}

function TaskbarClock() {
  const read = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const [time, setTime] = useState(read);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(read()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="tray">{time}</span>;
}

function Wallpaper() {
  const wall = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wall.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    drawWallpaper(ctx, el.width, el.height);
    void wallpaperReady.then(() => drawWallpaper(ctx, el.width, el.height));
  }, []);
  return <canvas ref={wall} className="wallpaper" width={1600} height={900} aria-hidden="true" />;
}

type WinApp = "resume" | "projects" | "markets" | "contact" | "calc" | "notepad" | "mines" | "bin";
type Win = { app: WinApp; x: number; y: number; z: number; min: boolean; max: boolean };

const WIN_APPS: { id: WinApp; label: string; color: string; glyph: string }[] = [
  { id: "resume", label: "Résumé", color: "#3d6fb4", glyph: "R" },
  { id: "projects", label: "Projects", color: "#7a4fb0", glyph: "{ }" },
  { id: "notepad", label: "Notes", color: "#7d8a99", glyph: "≡" },
  { id: "markets", label: "Global Markets", color: "#a81620", glyph: "▲" },
  { id: "calc", label: "Calculator", color: "#4a5a6a", glyph: "=" },
  { id: "mines", label: "Minesweeper", color: "#555f6a", glyph: "●" },
  { id: "contact", label: "Contact", color: "#c1453a", glyph: "@" },
  { id: "bin", label: "Recycle Bin", color: "#6c7f8f", glyph: "♻" },
];

function WinIcon({ app }: { app: (typeof WIN_APPS)[number] }) {
  return <span style={{ background: app.color }}>{app.glyph}</span>;
}

function WinDesktop({ active, onBack }: { active: "work" | "projects" | "room-left" | "room-right"; onBack: () => void }) {
  const [wins, setWins] = useState<Win[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [power, setPower] = useState<"boot" | "off" | null>(() => (shouldBoot() ? "boot" : null));
  const top = useRef(10);
  const drag = useRef<{ app: WinApp; dx: number; dy: number } | null>(null);

  const launch = useCallback((app: WinApp) => {
    setStartOpen(false);
    top.current += 1;
    const z = top.current;
    setWins((list) => {
      if (list.some((w) => w.app === app)) return list.map((w) => (w.app === app ? { ...w, z, min: false } : w));
      const n = list.length;
      return [...list, { app, x: 210 + n * 28, y: 18 + n * 26, z, min: false, max: window.innerWidth < 760 || (app === "markets" && window.innerHeight < 760) }];
    });
  }, []);
  const change = (app: WinApp, patch: Partial<Win>) => setWins((list) => list.map((w) => (w.app === app ? { ...w, ...patch } : w)));
  const close = (app: WinApp) => setWins((list) => list.filter((w) => w.app !== app));
  const front = wins.filter((w) => !w.min).reduce<Win | null>((best, w) => (!best || w.z > best.z ? w : best), null);

  useEffect(() => {
    // Either monitor opens the same desktop. The right one starts on the terminal.
    if (active === "room-right") {
      launch("markets");
      setWins((list) => list.map((w) => (w.app === "markets" ? { ...w, max: true } : w)));
    } else if (active === "projects") launch("projects");
  }, [active, launch]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      setWins((list) =>
        list.map((w) => (w.app === d.app ? { ...w, x: Math.max(-200, e.clientX - d.dx), y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - d.dy)) } : w)),
      );
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const info = (app: WinApp) => WIN_APPS.find((a) => a.id === app)!;
  const pressTask = (w: Win) => {
    if (w.min) launch(w.app);
    else if (front?.app === w.app) change(w.app, { min: true });
    else launch(w.app);
  };

  return (
    <section className="desktop xp" role="dialog" aria-label="Desktop" onPointerDown={() => setStartOpen(false)}>
      <Wallpaper />
      <div className="xp-icons">
        {WIN_APPS.map((a) => (
          <button key={a.id} id={`app-${a.id}`} type="button" onClick={() => launch(a.id)}>
            <WinIcon app={a} />
            {a.label}
          </button>
        ))}
      </div>

      {wins.map((w) => (
        <article
          key={w.app}
          className={`xp-window ${front?.app === w.app ? "on" : ""} ${w.max ? "max" : ""} ${w.app === "markets" ? "wide" : ""} app-${w.app}`}
          hidden={w.min}
          style={{ left: w.x, top: w.y, zIndex: w.z }}
          onPointerDown={() => launch(w.app)}
        >
          <header
            onPointerDown={(e) => {
              if (w.max || (e.target as HTMLElement).closest("button")) return;
              drag.current = { app: w.app, dx: e.clientX - w.x, dy: e.clientY - w.y };
            }}
            onDoubleClick={() => change(w.app, { max: !w.max })}
          >
            <i style={{ background: info(w.app).color }} />
            <span>{info(w.app).label}</span>
            <button type="button" aria-label="Minimize" onClick={() => change(w.app, { min: true })}>
              _
            </button>
            <button type="button" aria-label="Maximize" onClick={() => change(w.app, { max: !w.max })}>
              ▢
            </button>
            <button type="button" className="x" aria-label="Close" onClick={() => close(w.app)}>
              ×
            </button>
          </header>
          <div className={`xp-body window-body ${["markets", "calc", "notepad", "mines"].includes(w.app) ? "flush" : ""}`}>
            {w.app === "markets" ? (
              <Terminal />
            ) : w.app === "calc" ? (
              <Calculator />
            ) : w.app === "notepad" ? (
              <Notepad />
            ) : w.app === "mines" ? (
              <Mines />
            ) : w.app === "bin" ? (
              <p className="xp-empty">Recycle Bin is empty.</p>
            ) : (
              <PanelBody id={w.app} />
            )}
          </div>
        </article>
      ))}

      {startOpen && (
        <aside className="xp-start" onPointerDown={(e) => e.stopPropagation()}>
          <header>
            <b>V</b>
            Vincent Damato
          </header>
          <div className="xp-start-body">
            <ul>
              {WIN_APPS.filter((a) => a.id !== "bin").map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => launch(a.id)}>
                    <WinIcon app={a} />
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
            <ul className="side">
              <li>
                <button type="button" onClick={() => launch("projects")}>
                  My Projects
                </button>
              </li>
              <li>
                <button type="button" onClick={() => launch("markets")}>
                  My Markets
                </button>
              </li>
              <li>
                <button type="button" onClick={() => launch("notepad")}>
                  Help and Support
                </button>
              </li>
            </ul>
          </div>
          <footer>
            <button type="button" onClick={onBack}>
              Log Off
            </button>
            <button type="button" className="off" onClick={() => setPower("off")}>
              Turn Off Computer
            </button>
          </footer>
        </aside>
      )}

      <footer className="taskbar" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="start"
          aria-expanded={startOpen}
          onClick={() => setStartOpen((o) => !o)}
        >
          <i />
          start
        </button>
        <nav className="pins" aria-label="Pinned">
          {WIN_APPS.slice(0, 3).map((a) => (
            <button key={a.id} id={`pin-${a.id}`} type="button" aria-label={a.label} title={a.label} onClick={() => launch(a.id)}>
              <WinIcon app={a} />
            </button>
          ))}
        </nav>
        <nav className="screens" aria-label="Open windows">
          {wins.map((w) => (
            <button key={w.app} type="button" aria-pressed={front?.app === w.app} onClick={() => pressTask(w)}>
              {info(w.app).label}
            </button>
          ))}
        </nav>
        <TaskbarClock />
      </footer>
      {power && <PowerScreen mode={power} onDone={power === "off" ? onBack : () => setPower(null)} />}
    </section>
  );
}

function MusicMap() {
  const spotify = (m: (typeof MUSIC)[number]) => ({
    href: `https://open.spotify.com/search/${encodeURIComponent(m.search)}`,
    target: "_blank",
    rel: "noreferrer",
    onClick: () => window.dispatchEvent(new CustomEvent("vd-record", { detail: m.color })),
  });
  const point = (i: number, r: number) => {
    const a = (i / MUSIC.length) * Math.PI * 2 - Math.PI / 2;
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
  };
  const REACH = 32;
  const ring = (r: number) => MUSIC.map((_, i) => point(i, r).join(",")).join(" ");
  const shape = MUSIC.map((m, i) => point(i, m.weight * (REACH / 10)).join(",")).join(" ");
  return (
    <>
      <div className="music-map">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {[0.2, 0.4, 0.6, 0.8, 1].map((k) => (
            <polygon key={k} className="web" points={ring(REACH * k)} />
          ))}
          {MUSIC.map((m, i) => {
            const [x, y] = point(i, REACH);
            return <line key={m.title} className="web" x1="50" y1="50" x2={x} y2={y} />;
          })}
          <polygon className="taste" points={shape} />
          {MUSIC.map((m, i) => {
            const [x, y] = point(i, m.weight * (REACH / 10));
            return <circle key={m.title} className="node" cx={x} cy={y} r="0.9" />;
          })}
        </svg>
        {MUSIC.map((m, i) => {
          const [x, y] = point(i, 41);
          return (
            <a key={m.title} {...spotify(m)} style={{ left: `${x}%`, top: `${y}%` }}>
              {m.title}
            </a>
          );
        })}
      </div>
      <ol className="taste-list">
        {[...MUSIC]
          .sort((a, b) => b.weight - a.weight)
          .map((m) => (
            <li key={m.title}>
              <a {...spotify(m)}>
                <strong>{m.title}</strong>
                <span className="picks">{m.picks}</span>
              </a>
            </li>
          ))}
      </ol>
    </>
  );
}

function DegreePanel() {
  const [tab, setTab] = useState<"overview" | "campus" | "courses">("overview");
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <h2 id="panel-title">University of Iowa</h2>
      <div className="plate-tabs" role="group" aria-label="Degree details">
        <button id="degree-overview" type="button" aria-pressed={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button id="degree-campus" type="button" aria-pressed={tab === "campus"} onClick={() => setTab("campus")}>
          Extracurriculars
        </button>
        <button id="degree-courses" type="button" aria-pressed={tab === "courses"} onClick={() => setTab("courses")}>
          Key courses
        </button>
      </div>
      {tab === "overview" ? (
        <>
          <p className="lede">{DEGREE.intro}</p>
          <dl className="facts">
            {DEGREE.facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <button id="diploma-open" type="button" className="diploma-thumb" onClick={() => setZoom(true)}>
            <img src={degreeUrl} alt="" />
            <span>View diploma</span>
          </button>
        </>
      ) : tab === "courses" ? (
        <ul className="course-list">
          {DEGREE.courses.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        <ul className="role-list">
          {DEGREE.roles.map((r) => (
            <li key={r.org}>
              <strong>{r.org}</strong>
              <span>{r.title}</span>
            </li>
          ))}
        </ul>
      )}
      {zoom && (
        <button id="diploma-close" type="button" className="lightbox" aria-label="Close diploma" onClick={() => setZoom(false)}>
          <img src={degreeUrl} alt="University of Iowa diploma" />
        </button>
      )}
    </>
  );
}

function Places() {
  const [selected, setSelected] = useState<string>();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    drawWorldMap(ctx, selected);
    whenMapFontsReady()
      .then(() => drawWorldMap(ctx, selected))
      .catch(() => undefined);
  }, [selected]);
  const all = PLACE_GROUPS.flatMap((g) => g.places);
  return (
    <>
      <canvas
        ref={ref}
        className="travel-map"
        width={1536}
        height={952}
        role="img"
        aria-label={`World map with pins on ${all.join(", ")}.`}
      />
      <p className="note">Tap a place to find it on the map.</p>
      {PLACE_GROUPS.map((g) => (
        <section key={g.region} className="place-group">
          <h3>{g.region}</h3>
          <div className="place-chips">
            {g.places.map((p) => {
              const name = p.split(" (")[0];
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={selected === name}
                  onClick={() => setSelected(selected === name ? undefined : name)}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Bubble({
  at,
  onClose,
  label,
  width: wide,
  children,
}: {
  at: { x: number; y: number } | null;
  onClose: () => void;
  label: string;
  width: number;
  children: React.ReactNode;
}) {
  const width = Math.min(wide, window.innerWidth - 32);
  const left = at ? Math.max(16, Math.min(at.x - width + 60, window.innerWidth - width - 16)) : 16;
  const tail = at ? Math.max(24, Math.min(at.x - left - 10, width - 44)) : 40;
  return (
    <aside className="about-bubble" role="dialog" aria-label={label} style={{ left, width, bottom: at ? Math.max(16, window.innerHeight - at.y + 22) : 16 }}>
      <button type="button" className="about-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      {children}
      <span className="about-tail" style={{ left: tail }} aria-hidden="true" />
    </aside>
  );
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  LinkedIn: (
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  ),
  GitHub: (
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  ),
  Email: <path d="M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm10 9.2L22 6.9V6L12 11.4 2 6v.9l10 6.3z" />,
};

function Maintenance() {
  return (
    <div className="maintenance">
      <img src={coneUrl} alt="" />
      <p>Under maintenance</p>
    </div>
  );
}

type RudyLine = { text: string; links?: { label: string; href: string }[] };

const RUDY_HELLO: RudyLine = { text: "Woof! I'm Rudy, and I run the front desk around here. What do you want to know about Vincent?" };
const RUDY_ANSWERS: Record<string, RudyLine> = {
  who: { text: "Vincent is an investment accountant in Milwaukee. He earned his BBA in Finance from the University of Iowa, and he likes building things." },
  now: { text: "He specializes in OTC derivatives at a large U.S. life insurer. His work sits where finance, data and technology meet." },
  projects: {
    text: "He builds options tools in Python, and the Global Markets terminal on his right monitor runs on daily market data.",
    links: PROJECTS.filter((p) => p.href).map((p) => ({ label: p.name, href: p.href as string })),
  },
  fun: { text: "Away from the desk he enjoys travel, skiing, hiking, swimming, poker, good food and times." },
  contact: { text: "Email or LinkedIn is the best way to reach him.", links: SOCIALS.map((s) => ({ label: s.name, href: s.href })) },
};
const RUDY_CHOICES: { key: string; label: string }[] = [
  { key: "who", label: "Who is Vincent?" },
  { key: "now", label: "What does he do?" },
  { key: "projects", label: "Show me a project" },
  { key: "fun", label: "What does he enjoy?" },
  { key: "contact", label: "How do I reach him?" },
  { key: "bye", label: "Goodbye" },
];

function RudyChat({ at, onClose }: { at: { x: number; y: number } | null; onClose: () => void }) {
  const [line, setLine] = useState<RudyLine>(RUDY_HELLO);
  const [shown, setShown] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const done = shown >= line.text.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.location.hash.includes("still")) {
      setShown(line.text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => setShown((n) => (n >= line.text.length ? n : n + 1)), 22);
    return () => window.clearInterval(id);
  }, [line]);

  const choose = useCallback(
    (key: string) => {
      if (key === "bye") return onClose();
      setLine(RUDY_ANSWERS[key]);
      setSeen((s) => (s.includes(key) ? s : [...s, key]));
    },
    [onClose],
  );

  useEffect(() => {
    list.current?.querySelectorAll<HTMLButtonElement>("button")[cursor]?.focus({ preventScroll: true });
  }, [cursor]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const by = e.key === "ArrowDown" ? 1 : -1;
      setCursor((c) => (c + by + RUDY_CHOICES.length) % RUDY_CHOICES.length);
    }
  };

  return (
    <section
      className="rudy-box"
      role="dialog"
      aria-label="Talk to Rudy"
      onKeyDown={onKey}
      style={at ? ({ "--rudy-x": `${at.x}px`, "--rudy-y": `${at.y}px` } as React.CSSProperties) : undefined}
    >
      <button type="button" className="rudy-x" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="rudy-portrait">
        <img src={rudyFace} alt="" />
        <b>Rudy</b>
      </div>
      <div className="rudy-say" onClick={() => setShown(line.text.length)}>
        <p aria-live="polite">
          {line.text.slice(0, shown)}
          {!done && <i className="rudy-caret" />}
        </p>
        {done && line.links && (
          <span className="rudy-links">
            {line.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </span>
        )}
      </div>
      <div className="rudy-menu" ref={list} role="menu">
        {RUDY_CHOICES.map((c, i) => (
          <button key={c.key} type="button" role="menuitem" className={`${i === cursor ? "on" : ""} ${seen.includes(c.key) ? "seen" : ""}`} onMouseEnter={() => setCursor(i)} onFocus={() => setCursor(i)} onClick={() => choose(c.key)}>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Socials() {
  return (
    <div className="rolo">
      {SOCIALS.map((c) => (
        <a key={c.name} href={c.href} aria-label={c.name} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {SOCIAL_ICONS[c.name]}
          </svg>
          <strong>{c.name}</strong>
        </a>
      ))}
    </div>
  );
}

function PanelBody({ id }: { id: PanelId }) {
  switch (id) {
    case "degree":
      return <DegreePanel />;
    case "contact":
    case "rolodex":
      return (
        <>
          <h2 id="panel-title">Find me</h2>
          <Socials />
        </>
      );
    case "resume":
      return (
        <>
          <h2 id="panel-title">Résumé</h2>
          <Maintenance />
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
    case "books":
      return (
        <>
          <h2 id="panel-title">On the shelf</h2>
          {BOOK_SHELF.map((g) => (
            <section key={g.group} className="place-group">
              <h3>{g.group}</h3>
              <ul className="book-list">
                {g.books.map(([title, author]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <span>{author}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
    case "golf":
    case "about":
    case "stash":
    case "chess":
    case "balls":
    case "keyboard":
    case "espresso":
    case "dog":
    case "pennant":
    case "starry":
    case "wine":
    case "camera":
      return null;
    default: {
      const note = NOTES[id];
      return (
        <>
          <h2 id="panel-title">{note.title}</h2>
          {note.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {id === "map" && <Places />}
          {id === "records" && <MusicMap />}
        </>
      );
    }
  }
}

export default function Site() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const officeRef = useRef<Office | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<PanelId | null>(null);
  const hoverRef = useRef<ItemId | null>(null);
  const quickRef = useRef(false);
  const [soundOff, setSoundOff] = useState(isMuted);

  const ringOnce = useCallback(() => {
    ringPhone();
    officeRef.current?.ringPhone();
  }, []);
  const [open, setOpen] = useState<PanelId | null>(null);
  const [lightNote, setLightNote] = useState("");
  openRef.current = open;
  const [menu, setMenu] = useState(false);
  const [bubbleAt, setBubbleAt] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ id: ItemId; x: number; y: number } | null>(null);
  const [found, setFound] = useState<ItemId[]>(readFound);
  const [noWebgl, setNoWebgl] = useState(false);

  const openItem = useCallback((id: ItemId | "resume") => {
    unlockSound();
    if (id === "mannequin") {
      officeRef.current?.nextPose();
      return;
    }
    if (id === "contact") window.setTimeout(ringOnce, 60);
    setMenu(false);
    if (id === "lamp") {
      const mode = officeRef.current?.cycleLight();
      if (mode) setLightNote(MODE_LABEL[mode]);
    } else if (id === "cradle") {
      // The cradle plays where it sits. Resetting the camera here would drop the hover and jolt the view.
      officeRef.current?.swing();
      if (openRef.current) {
        setOpen(null);
        officeRef.current?.focus(null);
      }
    } else {
      const panel = id === "contact" ? "rolodex" : id;
      setOpen(panel);
      // About is a speech bubble over the room, so the camera stays where it is.
      if (panel === "about" || panel === "rolodex" || panel === "dog") {
        officeRef.current?.focus(null);
        setBubbleAt(officeRef.current?.screenPoint(panel) ?? null);
      } else officeRef.current?.focus(panel === "resume" ? "about" : panel);
    }
    if (id === "resume" || id === "stash") return;
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

  const step = useCallback(
    (by: number) => {
      const here = TOUR.indexOf((openRef.current ?? TOUR[TOUR.length - 1]) as RoomId);
      const next = openRef.current ? here + by : by > 0 ? 0 : TOUR.length - 1;
      openItem(TOUR[(next + TOUR.length) % TOUR.length]);
    },
    [openItem],
  );

  const fromRoomRef = useRef(false);
  const close = useCallback(() => {
    fromRoomRef.current = false;
    quickRef.current = false;
    setOpen(null);
    officeRef.current?.focus(null);
    document.getElementById("menu-toggle")?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const office = createOffice(canvasRef.current, {
        onHover: (id, x, y) => {
          setHover(id ? { id, x, y } : null);
          if (id === "contact" && hoverRef.current !== "contact") ringOnce();
          hoverRef.current = id;
        },
        onPick: (id) => {
          fromRoomRef.current = id === "work" || id === "projects";
          openItem(id);
        },
      });
      officeRef.current = office;
      office.setFound(found);
      if (window.location.hash === "#still") {
        (window as unknown as { __office: Office }).__office = office;
      }
      return () => office.dispose();
    } catch {
      setNoWebgl(true);
    }
  }, [openItem, ringOnce]);

  useEffect(() => {
    officeRef.current?.setFound(found);
  }, [found]);

  useEffect(() => {
    const onRecord = (e: Event) => officeRef.current?.playRecord((e as CustomEvent<string | null>).detail);
    window.addEventListener("vd-record", onRecord);
    return () => window.removeEventListener("vd-record", onRecord);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        close();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        if (openRef.current === "work" || openRef.current === "projects" || openRef.current === "dog") return;
        step(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);

  useEffect(() => {
    if (open && open !== "projects") closeRef.current?.focus();
  }, [open]);

  const label =
    hover?.id === "contact" || hover?.id === "cradle" || hover?.id === "pennant"
      ? null
      : hover?.id === "chess"
      ? `Chess\n${CHESS_ELO} Elo`
      : hover
        ? hover.id === "projects" ? "Global Markets" : hover.id === "work" ? "Desktop" : ITEMS.find((i) => i.id === hover.id)?.label
        : null;

  return (
    <div className={`vd ${noWebgl ? "no-webgl" : ""}`} onPointerDown={unlockSound}>
      <canvas ref={canvasRef} className="room" aria-hidden="true" />

      <header className="intro" hidden={!!open}>
        <h1>Vincent Damato</h1>
        {!noWebgl && (
          <>
            <p className="hint hint-mouse">Click around to explore</p>
            <p className="hint hint-touch">Tap around to explore</p>
          </>
        )}
      </header>

      <div className="topbar" hidden={!!open}>
        <button
          type="button"
          className="sound"
          aria-label={soundOff ? "Turn sound on" : "Turn sound off"}
          title={soundOff ? "Sound off" : "Sound on"}
          aria-pressed={soundOff}
          onClick={() => {
            setMuted(!soundOff);
            setSoundOff(!soundOff);
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M3 9.5v5h4l5 4.5v-14L7 9.5z" />
            {soundOff ? (
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 9.5l5 5m0-5l-5 5" />
            ) : (
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"
              />
            )}
          </svg>
        </button>
        <button id="menu-toggle" type="button" className="menu-button" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          {menu ? "Close" : "Menu"}
        </button>
      </div>

      {(menu || noWebgl) && (
        <nav className="menu" aria-label="Site menu">
          <h2>Menu</h2>
          <div className="menu-main">
            {MAIN_MENU.map((m) => (
              <button key={m.id} id={`item-${m.id}`} type="button" onClick={() => openItem(m.id)}>
                <span>{m.label}</span>
                <small>{m.note}</small>
              </button>
            ))}
          </div>
        </nav>
      )}

      {label && hover && !open && (
        <div className="tip" style={{ left: hover.x + 14, top: hover.y + 16 }}>
          {label}
        </div>
      )}

      {(open === "work" || open === "projects") && <WinDesktop active={fromRoomRef.current ? (open === "work" ? "room-left" : "room-right") : open === "projects" ? "projects" : "work"} onBack={close} />}
      {open === "about" && (
        <Bubble at={bubbleAt} onClose={close} label="About me" width={440}>
          {ABOUT.map((p) => (
            <p key={p}>{p.split("*").join("")}</p>
          ))}
        </Bubble>
      )}
      {open === "dog" && <RudyChat at={bubbleAt} onClose={close} />}
      {open === "rolodex" && (
        <Bubble at={bubbleAt} onClose={close} label="Contact" width={270}>
          <Socials />
        </Bubble>
      )}
      {open && open !== "work" && open !== "projects" && open !== "stash" && open !== "balls" && open !== "about" && open !== "rolodex" && open !== "dog" && (
        <aside className="panel" role="dialog" aria-labelledby="panel-title">
          <PanelBody id={open} />
        </aside>
      )}
      {open && (
        <button id="panel-close" ref={closeRef} type="button" className="chip return-button" onClick={close}>
          Return
        </button>
      )}
    </div>
  );
}
