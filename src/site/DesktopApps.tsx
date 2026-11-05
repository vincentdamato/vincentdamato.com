import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------- Notepad ---------- */
const README = `Welcome.

Everything on this desktop works. A few places to start:

Global Markets
  A working terminal with daily market data.
  Type HELP at the GO> prompt.
  Try SWAP 10 PAY 4.75 or OPT C 100 105 30 25.

Calculator
  Click the keys or use your keyboard.

Minesweeper
  Right-click to place a flag.

Start menu
  Log Off or Turn Off Computer takes you back to the room.
`;

export function Notepad() {
  const [text, setText] = useState(README);
  return (
    <div className="np">
      <nav aria-hidden="true">
        <span>File</span>
        <span>Edit</span>
        <span>Format</span>
        <span>View</span>
        <span>Help</span>
      </nav>
      <textarea aria-label="Notes" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}

/* ---------- Calculator ---------- */
const MAX_DIGITS = 14;
const format = (n: number) => {
  if (!Number.isFinite(n)) return "Cannot divide by zero";
  const s = String(Number(n.toPrecision(12)));
  return s.length > MAX_DIGITS + 2 ? n.toExponential(8) : s;
};

export function Calculator() {
  const [shown, setShown] = useState("0");
  const [held, setHeld] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const applyOp = (a: number, b: number, o: string) => (o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : a / b);
  const digit = (k: string) => {
    if (k === "." && !fresh && shown.includes(".")) return;
    const start = k === "." ? "0." : k;
    if (fresh || shown === "0") setShown(start);
    else if (shown.length < MAX_DIGITS) setShown(shown + k);
    setFresh(false);
  };
  const operate = (next: string) => {
    const now = Number(shown);
    if (op && held !== null && !fresh) {
      const v = applyOp(held, now, op);
      setShown(format(v));
      setHeld(v);
    } else setHeld(now);
    setOp(next);
    setFresh(true);
  };
  const equals = () => {
    if (op && held !== null) {
      setShown(format(applyOp(held, Number(shown), op)));
      setHeld(null);
      setOp(null);
    }
    setFresh(true);
  };
  const clear = () => {
    setShown("0");
    setHeld(null);
    setOp(null);
    setFresh(true);
  };
  const unary = (f: (n: number) => number) => {
    setShown(format(f(Number(shown))));
    setFresh(true);
  };
  const press = (k: string) => {
    if (/^[0-9.]$/.test(k)) digit(k);
    else if (["+", "-", "*", "/"].includes(k)) operate(k);
    else if (k === "=" || k === "Enter") equals();
    else if (k === "Escape" || k === "C") clear();
    else if (k === "CE") {
      setShown("0");
      setFresh(true);
    } else if (k === "Backspace") {
      if (!fresh) setShown(shown.length > 1 ? shown.slice(0, -1) : "0");
    } else if (k === "%") unary((n) => (held !== null ? (held * n) / 100 : n / 100));
    else if (k === "±") unary((n) => -n);
    else if (k === "√") unary(Math.sqrt);
  };
  const keys: [string, string][] = [
    ["CE", "CE"], ["C", "C"], ["Backspace", "⌫"], ["/", "÷"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["*", "×"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["-", "−"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"],
    ["±", "±"], ["0", "0"], [".", "."], ["=", "="],
    ["√", "√"], ["%", "%"],
  ];
  return (
    <div
      className="calc"
      tabIndex={0}
      onKeyDown={(e) => {
        if (/^[0-9.+\-*/=%]$/.test(e.key) || e.key === "Enter" || e.key === "Backspace") {
          e.preventDefault();
          press(e.key);
        }
      }}
    >
      <output aria-label="Display">{shown}</output>
      <div className="calc-keys">
        {keys.map(([k, label]) => (
          <button key={k} type="button" className={["/", "*", "-", "+", "="].includes(k) ? "op" : ""} aria-label={k === "Backspace" ? "Backspace" : undefined} onClick={() => press(k)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Minesweeper ---------- */
const SIZE = 9;
const MINES = 10;
type Tile = { mine: boolean; open: boolean; flag: boolean; near: number };

const blank = (): Tile[] => Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, flag: false, near: 0 }));
const around = (i: number) => {
  const out: number[] = [];
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx;
    const ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push(ny * SIZE + nx);
  }
  return out;
};

export function Mines() {
  const [tiles, setTiles] = useState<Tile[]>(blank);
  const [state, setState] = useState<"ready" | "play" | "won" | "lost">("ready");
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (state !== "play") return;
    const id = window.setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => window.clearInterval(id);
  }, [state]);
  const reset = () => {
    setTiles(blank());
    setState("ready");
    setTime(0);
  };
  const flag = useCallback(
    (i: number) => {
      if (state === "won" || state === "lost") return;
      setTiles((t) => t.map((c, k) => (k === i && !c.open ? { ...c, flag: !c.flag } : c)));
    },
    [state],
  );
  const open = (i: number) => {
    if (state === "won" || state === "lost") return;
    if (flagMode) return flag(i);
    let board = tiles.map((c) => ({ ...c }));
    if (state === "ready") {
      const keep = new Set([i, ...around(i)]);
      const spots = board.map((_, k) => k).filter((k) => !keep.has(k));
      for (let m = 0; m < MINES; m++) {
        const pick = Math.floor(Math.random() * spots.length);
        board[spots.splice(pick, 1)[0]].mine = true;
      }
      board = board.map((c, k) => ({ ...c, near: around(k).filter((n) => board[n].mine).length }));
      setState("play");
    }
    if (board[i].flag || board[i].open) return;
    if (board[i].mine) {
      setTiles(board.map((c) => (c.mine ? { ...c, open: true } : c)));
      setState("lost");
      return;
    }
    const queue = [i];
    while (queue.length) {
      const k = queue.pop() as number;
      if (board[k].open || board[k].flag) continue;
      board[k].open = true;
      if (board[k].near === 0) queue.push(...around(k));
    }
    setTiles(board);
    if (board.filter((c) => !c.mine && !c.open).length === 0) setState("won");
  };
  const left = useMemo(() => MINES - tiles.filter((t) => t.flag).length, [tiles]);
  return (
    <div className="ms">
      <header>
        <output aria-label="Mines left">{String(Math.max(left, 0)).padStart(3, "0")}</output>
        <button type="button" onClick={reset}>
          {state === "won" ? "You won. New game" : state === "lost" ? "Boom. New game" : "New game"}
        </button>
        <output aria-label="Seconds">{String(time).padStart(3, "0")}</output>
      </header>
      <div className="ms-board" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`${t.open ? "open" : ""} ${t.open && t.mine ? "hit" : ""} n${t.open ? t.near : ""}`}
            aria-label={`Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}`}
            onClick={() => open(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              flag(i);
            }}
          >
            {t.open ? (t.mine ? "●" : t.near || "") : t.flag ? "⚑" : ""}
          </button>
        ))}
      </div>
      <label className="ms-flag">
        <input type="checkbox" checked={flagMode} onChange={(e) => setFlagMode(e.target.checked)} />
        Place flags (or right-click)
      </label>
    </div>
  );
}

/* ---------- Power ---------- */
let bootedOnce = false;

export function PowerScreen({ mode, onDone }: { mode: "boot" | "off"; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, mode === "boot" ? 1900 : 1200);
    return () => window.clearTimeout(id);
  }, [mode, onDone]);
  return (
    <div className={`xp-power ${mode}`} role="status" onClick={onDone}>
      {mode === "boot" ? <span className="xp-spinner" aria-label="Loading" /> : <p>Saving your settings...</p>}
    </div>
  );
}

export const shouldBoot = () => {
  if (bootedOnce) return false;
  bootedOnce = true;
  if (window.location.hash.includes("still")) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
