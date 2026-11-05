import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { type ItemId } from "./content";
import { fxPairs, MARKET, shortDate } from "./rates";
import degreeUrl from "./assets/degree.webp";
import driverHeadUrl from "./assets/driver-head.webp";
import golfBagUrl from "./assets/golf-bag.webp";
import paintingUrl from "./assets/american-gothic.webp";
import rudyUrl from "./assets/rudy.webp";
import starryUrl from "./assets/starry-night.webp";
import hybridHeadUrl from "./assets/hybrid-head.webp";
import mouseHeightUrl from "./assets/mouse-height.webp";
import mouseTopUrl from "./assets/mouse-top.webp";
import pennantUrl from "./assets/pennant.webp";
import iron1Url from "./assets/iron-1.webp";
import iron2Url from "./assets/iron-2.webp";
import iron3Url from "./assets/iron-3.webp";
import { buildBizJet } from "./bizjet";
import { COURSES } from "./courses";
import { buildF1Car } from "./f1car";
import { DESKTOP_ICONS, drawWallpaper, wallpaperReady } from "./wallpaper";
import { drawWorldMap, whenMapFontsReady } from "./worldmap";

export type LightMode = "day" | "dusk" | "night";

export type OfficeCallbacks = {
  onHover: (id: ItemId | null, x: number, y: number) => void;
  onPick: (id: ItemId) => void;
};

export type Office = {
  focus: (id: Exclude<ItemId, "lamp" | "cradle" | "mannequin"> | null) => void;
  cycleLight: () => LightMode;
  mode: () => LightMode;
  swing: () => void;
  nextPose: () => void;
  playRecord: (color: string | null) => void;
  ringPhone: () => void;
  screenPoint: (id: Exclude<ItemId, "lamp" | "cradle" | "mannequin">) => { x: number; y: number };
  setFound: (ids: ItemId[]) => void;
  dispose: () => void;
  snapshot: () => string;
};

const COLORS = {
  wall: 0x123a2d,
  wallLow: 0x0c2a21,
  walnut: 0x4a2c1a,
  walnutDark: 0x2e1b10,
  brass: 0xc9a14a,
  bezel: 0x101412,
  cream: 0xece4d2,
};

type Pos = [number, number, number];

const mat = (color: number, roughness = 0.65, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, pos: Pos = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const box = (w: number, h: number, d: number, material: THREE.Material, pos: Pos = [0, 0, 0]) =>
  mesh(new THREE.BoxGeometry(w, h, d), material, pos);

const cyl = (rt: number, rb: number, h: number, material: THREE.Material, pos: Pos = [0, 0, 0], seg = 32) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, pos);

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  draw(el.getContext("2d")!);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function plankTexture() {
  const tex = canvasTexture(1024, 1024, (c) => {
    c.fillStyle = "#3a2214";
    c.fillRect(0, 0, 1024, 1024);
    for (let row = 0; row < 8; row++) {
      const y = row * 128;
      let x = -(row % 2) * 180;
      while (x < 1024) {
        const w = 300 + ((row * 97 + x) % 180);
        const shade = 48 + ((row * 31 + Math.abs(x) * 7) % 22);
        c.fillStyle = `rgb(${shade + 22},${shade - 4},${shade - 24})`;
        c.fillRect(x, y, w - 3, 125);
        x += w;
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 3);
  return tex;
}

/** An illustrated Milwaukee: downtown towers, the art museum wings, the arched bridge and Lake Michigan. */
function drawSkyline(c: CanvasRenderingContext2D, mode: LightMode) {
  const w = c.canvas.width;
  const h = c.canvas.height;
  const horizon = h * 0.7;
  const look = {
    day: { sky: ["#6fb3dc", "#bfe0ee", "#f3e9d2"], water: ["#4d94b8", "#2c6a8c"], far: "#8fa8bb", mid: "#6d8498", near: "#445566", lit: "rgba(225,240,250,0.32)", wing: "#f4f4f0", bridge: "#d9a93c" },
    dusk: { sky: ["#2a2358", "#a8466b", "#ff9a4d"], water: ["#c9673f", "#3a2a55"], far: "#6a4a78", mid: "#40305e", near: "#241c3e", lit: "#ffc56e", wing: "#ffc9a0", bridge: "#e9a53a" },
    night: { sky: ["#050817", "#0d1a3a", "#25305c"], water: ["#111d3a", "#060b1a"], far: "#1c2748", mid: "#121a34", near: "#0a1024", lit: "#f6cf7e", wing: "#9fb4e0", bridge: "#f0b64a" },
  }[mode];

  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, look.sky[0]);
  sky.addColorStop(0.62, look.sky[1]);
  sky.addColorStop(1, look.sky[2]);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  if (mode === "night") {
    for (let i = 0; i < 130; i++) {
      c.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`;
      c.fillRect(rand() * w, rand() * h * 0.5, 2, 2);
    }
    c.fillStyle = "#f3eeda";
    c.beginPath();
    c.arc(w * 0.76, h * 0.17, 40, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = look.sky[0];
    c.beginPath();
    c.arc(w * 0.74, h * 0.155, 36, 0, Math.PI * 2);
    c.fill();
  } else {
    const sunY = mode === "day" ? h * 0.14 : horizon - 34;
    const sun = c.createRadialGradient(w * 0.74, sunY, 6, w * 0.74, sunY, 240);
    sun.addColorStop(0, mode === "day" ? "rgba(255,250,225,0.95)" : "rgba(255,226,150,1)");
    sun.addColorStop(0.2, mode === "day" ? "rgba(255,250,225,0.4)" : "rgba(255,170,90,0.65)");
    sun.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = sun;
    c.fillRect(0, 0, w, h);
    c.fillStyle = mode === "day" ? "rgba(255,255,255,0.75)" : "rgba(255,150,120,0.5)";
    for (const [x, y, s] of [[0.2, 0.15, 1.2], [0.58, 0.24, 0.9], [0.88, 0.33, 0.8]]) {
      for (const [dx, dy, r] of [[-46, 8, 22], [-14, 0, 32], [24, 6, 26], [56, 12, 16]]) {
        c.beginPath();
        c.ellipse(w * x + dx * s, h * y + dy * s, r * 1.7 * s, r * 0.6 * s, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // Lake Michigan
  const water = c.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, look.water[0]);
  water.addColorStop(1, look.water[1]);
  c.fillStyle = water;
  c.fillRect(0, horizon, w, h - horizon);
  c.fillStyle = mode === "night" ? "rgba(246,207,126,0.35)" : "rgba(255,255,255,0.22)";
  for (let i = 0; i < 46; i++) {
    c.fillRect(w * 0.52 + rand() * w * 0.46, horizon + 6 + rand() * (h - horizon), 16 + rand() * 40, 2);
  }

  // Arched bridge across the harbor
  c.strokeStyle = look.bridge;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(w * 0.56, horizon - 14);
  c.quadraticCurveTo(w * 0.8, horizon - 118, w * 1.02, horizon - 14);
  c.stroke();
  c.fillStyle = look.far;
  c.fillRect(w * 0.5, horizon - 16, w * 0.5, 5);
  c.lineWidth = 1.5;
  for (let i = 1; i < 14; i++) {
    const x = w * 0.56 + (i / 14) * w * 0.46;
    const t = i / 14;
    const top = horizon - 14 - 2 * t * (1 - t) * 104;
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x, horizon - 14);
    c.stroke();
  }

  const tower = (x: number, width: number, height: number, fill: string, cap?: "peak" | "steps" | "flat") => {
    const top = horizon - height;
    c.fillStyle = fill;
    c.fillRect(x, top, width, height);
    if (cap === "peak") {
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x + width / 2, top - width * 0.62);
      c.lineTo(x + width, top);
      c.fill();
    }
    if (cap === "steps") {
      c.fillRect(x + width * 0.14, top - 12, width * 0.72, 12);
      c.fillRect(x + width * 0.32, top - 24, width * 0.36, 12);
    }
    for (let wy = top + 8; wy < horizon - 4; wy += 10) {
      for (let wx = x + 5; wx < x + width - 4; wx += 8) {
        if (rand() > (mode === "day" ? 0.5 : 0.68)) {
          c.fillStyle = look.lit;
          c.fillRect(wx, wy, 3.5, 5);
        }
      }
    }
  };

  // Back row
  [[6, 58, 150], [70, 46, 196], [122, 62, 168], [196, 44, 214], [292, 54, 178], [352, 40, 136]].forEach(([x, bw, bh]) =>
    tower(x, bw, bh, look.far),
  );
  // Landmark towers
  tower(150, 86, 330, look.mid, "flat");
  tower(246, 66, 268, look.mid, "peak");
  tower(38, 70, 244, look.mid, "steps");
  tower(322, 58, 214, look.mid, "flat");
  // Front row
  [[0, 64, 92], [72, 72, 124], [150, 58, 86], [214, 80, 112], [300, 66, 78], [370, 50, 58]].forEach(([x, bw, bh]) =>
    tower(x, bw, bh, look.near),
  );

  // Lakefront museum and its winged sunscreen
  const mx = w * 0.59;
  c.fillStyle = look.near;
  c.fillRect(mx - 88, horizon - 18, 186, 18);
  c.fillStyle = look.wing;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(mx, horizon - 30);
      const a = 0.3 + i * 0.1;
      c.lineTo(mx + side * Math.cos(a) * (92 - i * 3), horizon - 30 - Math.sin(a) * (92 - i * 3));
      c.lineTo(mx + side * Math.cos(a + 0.06) * (92 - i * 3), horizon - 30 - Math.sin(a + 0.06) * (92 - i * 3));
      c.fill();
    }
  }
  c.fillRect(mx - 2, horizon - 70, 4, 52);

  // Moody haze along the horizon
  const haze = c.createLinearGradient(0, horizon - 90, 0, horizon + 14);
  const glow = { day: "255,255,255", dusk: "255,150,90", night: "120,130,210" }[mode];
  haze.addColorStop(0, `rgba(${glow},0)`);
  haze.addColorStop(1, `rgba(${glow},0.24)`);
  c.fillStyle = haze;
  c.fillRect(0, horizon - 90, w, 104);
}

const PENNANT_ASPECT = 2.786;

// These show their name on hover but do not open anything.
export const HOVER_ONLY: ItemId[] = ["car", "plane", "chess", "keyboard", "pennant", "espresso", "balls", "golf", "ratings", "starry", "wine", "camera"];

/** Hand-knotted Turkish rug: tonal rust field, scrolling vines, faded rosettes, narrow border. */
function drawRug(c: CanvasRenderingContext2D) {
  const w = 2048;
  const h = 1280;
  const rnd = (() => {
    let s = 90210;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  c.fillStyle = "#7c2212";
  c.fillRect(0, 0, w, h);
  // Abrash: slow bands of colour across the width, as hand-dyed wool lots change
  for (let y = 0; y < h; y += 6) {
    const v = Math.sin(y / 97) + Math.sin(y / 41 + 2) * 0.6 + Math.sin(y / 13) * 0.25;
    c.fillStyle = v > 0 ? `rgba(196,74,34,${Math.min(0.26, v * 0.11)})` : `rgba(58,12,8,${Math.min(0.3, -v * 0.13)})`;
    c.fillRect(0, y, w, 6);
  }
  const rail = 92;
  const fx = rail;
  const fy = rail;
  // Scrolling vine lattice
  const cols = 11;
  const rows = 7;
  const cellW = (w - fx * 2) / cols;
  const cellH = (h - fy * 2) / rows;
  c.lineCap = "round";
  const vine = (col: string, width: number) => {
    c.strokeStyle = col;
    c.lineWidth = width;
    for (let r = 0; r <= rows; r++) {
      c.beginPath();
      for (let i = 0; i <= cols * 8; i++) {
        const x = fx + (i / (cols * 8)) * (w - fx * 2);
        const y = fy + r * cellH + Math.sin((i / 8) * Math.PI) * cellH * 0.34 * (r % 2 ? 1 : -1);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
    for (let k = 0; k <= cols; k++) {
      c.beginPath();
      for (let i = 0; i <= rows * 8; i++) {
        const y = fy + (i / (rows * 8)) * (h - fy * 2);
        const x = fx + k * cellW + Math.sin((i / 8) * Math.PI) * cellW * 0.3 * (k % 2 ? 1 : -1);
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.stroke();
    }
  };
  vine("#5c150c", 9);
  vine("#a84a28", 2.5);
  // Knotted dots build each rosette, so it reads as pile rather than paint
  const rosette = (x: number, y: number, rx: number, ry: number) => {
    const lobes = 8;
    for (let i = 0; i < 2600; i++) {
      const t = rnd() * Math.PI * 2;
      const q = Math.sqrt(rnd());
      const edge = 1 + 0.12 * Math.cos(t * lobes);
      const px = x + Math.cos(t) * rx * q * edge;
      const py = y + Math.sin(t) * ry * q * edge;
      const ring = Math.sin(q * 10 + Math.cos(t * lobes) * 0.9);
      c.fillStyle = q > 0.9 ? "#621709" : ring > 0.35 ? "#b06a44" : ring > -0.45 ? "#94452a" : "#6f2010";
      c.fillRect(px, py, 3.4, 3.4);
    }
    c.fillStyle = "#b87c58";
    c.beginPath();
    c.ellipse(x, y, rx * 0.16, ry * 0.16, 0, 0, Math.PI * 2);
    c.fill();
  };
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const big = (r + k) % 2 === 0;
      rosette(fx + (k + 0.5) * cellW, fy + (r + 0.5) * cellH, big ? cellW * 0.32 : cellW * 0.2, big ? cellH * 0.32 : cellH * 0.2);
    }
  }
  // Small leaves along the vines
  for (let i = 0; i < 420; i++) {
    const x = fx + rnd() * (w - fx * 2);
    const y = fy + rnd() * (h - fy * 2);
    c.save();
    c.translate(x, y);
    c.rotate(rnd() * Math.PI);
    c.fillStyle = rnd() > 0.5 ? "#a8522f" : "#5c150c";
    c.beginPath();
    c.ellipse(0, 0, 13, 4.5, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  // Narrow border, dark rail with a fine reciprocal line
  c.strokeStyle = "#531209";
  c.lineWidth = 58;
  c.strokeRect(40, 40, w - 80, h - 80);
  c.strokeStyle = "#c4623a";
  c.lineWidth = 3;
  c.strokeRect(70, 70, w - 140, h - 140);
  c.strokeRect(14, 14, w - 28, h - 28);
  c.fillStyle = "#a8481f";
  for (let x = 40; x < w - 30; x += 34) {
    for (const y of [40, h - 40]) c.fillRect(x, y - 5, 16, 10);
  }
  for (let y = 40; y < h - 30; y += 34) {
    for (const x of [40, w - 40]) c.fillRect(x - 5, y, 10, 16);
  }
  // Worn pile: vertical knot lines, flecks and a soft edge fade
  c.globalAlpha = 0.09;
  for (let i = 0; i < 26000; i++) {
    c.fillStyle = rnd() > 0.55 ? "#2a0805" : "#ffcfa8";
    c.fillRect(rnd() * w, rnd() * h, 2, 4 + rnd() * 7);
  }
  c.globalAlpha = 0.1;
  c.fillStyle = "#000";
  for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
  c.globalAlpha = 1;
  const fade = c.createRadialGradient(w / 2, h / 2, 380, w / 2, h / 2, 1250);
  fade.addColorStop(0, "rgba(255,190,130,0.05)");
  fade.addColorStop(1, "rgba(20,4,0,0.26)");
  c.fillStyle = fade;
  c.fillRect(0, 0, w, h);
}

/** The right monitor shows the same daily data as the terminal. Only the cursor and tape move. */
function drawRightMonitor(c: CanvasRenderingContext2D, t: number) {
  const w = 800;
  c.fillStyle = "#05090c";
  c.fillRect(0, 0, w, 470);
  const bar = c.createLinearGradient(0, 0, 0, 50);
  bar.addColorStop(0, "#a81620");
  bar.addColorStop(1, "#6f0c14");
  c.fillStyle = bar;
  c.fillRect(0, 0, w, 50);
  c.fillStyle = "#ffffff";
  c.font = "700 31px Arial, sans-serif";
  c.fillText("Global Markets", 16, 36);
  c.textAlign = "right";
  c.font = "400 23px Arial, sans-serif";
  c.fillText(`Close of ${shortDate(MARKET.curve.date)}`, w - 16, 35);
  c.textAlign = "left";

  const split = 430;
  ["2Y", "5Y", "10Y", "30Y"].forEach((tenor, i) => {
    const k = MARKET.tenors.indexOf(tenor);
    const last = MARKET.curve.rates[k];
    const move = Math.round((last - MARKET.prior.rates[k]) * 100);
    const y = 86 + i * 34;
    if (i % 2 === 0) {
      c.fillStyle = "#0e161c";
      c.fillRect(0, y - 25, split, 34);
    }
    c.font = "600 24px Arial, sans-serif";
    c.fillStyle = "#ffffff";
    c.fillText(`UST ${tenor}`, 16, y);
    c.textAlign = "right";
    c.fillStyle = "#f2a33a";
    c.fillText(`${last.toFixed(2)}%`, 290, y);
    c.fillStyle = move >= 0 ? "#35d04a" : "#ff5252";
    c.fillText(`${move >= 0 ? "+" : ""}${move} bp`, split - 14, y);
    c.textAlign = "left";
  });

  fxPairs()
    .slice(0, 4)
    .forEach((r, i) => {
      const y = 86 + i * 34;
      if (i % 2 === 0) {
        c.fillStyle = "#0e161c";
        c.fillRect(split + 10, y - 25, w - split - 10, 34);
      }
      c.font = "600 24px Arial, sans-serif";
      c.fillStyle = "#ffffff";
      c.fillText(r.pair, split + 22, y);
      c.textAlign = "right";
      c.fillStyle = "#f2a33a";
      c.fillText(r.last.toFixed(r.digits), 680, y);
      c.fillStyle = r.change >= 0 ? "#35d04a" : "#ff5252";
      c.fillText(`${r.change >= 0 ? "+" : ""}${r.change.toFixed(2)}%`, w - 14, y);
      c.textAlign = "left";
    });

  // Treasury curve, latest against a year ago
  const top = 232;
  const bottom = 400;
  c.fillStyle = "#c7d0d6";
  c.font = "600 22px Arial, sans-serif";
  // Real curves only: the line eases from a year ago to the latest close, while a marker walks the tenors.
  const phase = (t % 12) / 12;
  const ease = (x: number) => x * x * (3 - 2 * x);
  const blend = t === 0 ? 1 : phase < 0.3 ? ease(phase / 0.3) : phase < 0.8 ? 1 : 1 - ease((phase - 0.8) / 0.2);
  const live = MARKET.curve.rates.map((v, i) => MARKET.yearAgo.rates[i] + (v - MARKET.yearAgo.rates[i]) * blend);
  c.fillText(blend > 0.98 ? `Treasury curve, ${shortDate(MARKET.curve.date)}` : blend < 0.02 ? `Treasury curve, ${shortDate(MARKET.yearAgo.date)}` : "Treasury curve, year over year", 16, top - 6);
  const all = [...MARKET.curve.rates, ...MARKET.yearAgo.rates];
  const lo = Math.min(...all) - 0.1;
  const hi = Math.max(...all) + 0.1;
  const px = (i: number) => 24 + (i / (MARKET.tenors.length - 1)) * (w - 48);
  const py = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top - 8);
  const line = (rates: number[], color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    rates.forEach((v, i) => (i ? c.lineTo(px(i), py(v)) : c.moveTo(px(i), py(v))));
    c.stroke();
  };
  const fill = c.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, "rgba(46,140,190,0.7)");
  fill.addColorStop(1, "rgba(10,40,70,0.15)");
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(px(0), bottom);
  live.forEach((v, i) => c.lineTo(px(i), py(v)));
  c.lineTo(px(MARKET.tenors.length - 1), bottom);
  c.fill();
  line(MARKET.yearAgo.rates, "#7f8b94", 2);
  line(live, "#ffffff", 3);
  const at = Math.floor(t / 1.1) % MARKET.tenors.length;
  c.strokeStyle = "rgba(242,163,58,0.55)";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(px(at), top);
  c.lineTo(px(at), bottom);
  c.stroke();
  c.fillStyle = "#f2a33a";
  c.beginPath();
  c.arc(px(at), py(live[at]), 7, 0, Math.PI * 2);
  c.fill();
  c.textAlign = "right";
  c.font = "700 24px Arial, sans-serif";
  c.fillText(`${MARKET.tenors[at]}  ${live[at].toFixed(2)}%`, w - 16, top - 6);
  c.textAlign = "left";

  // Command line
  c.fillStyle = "#11181e";
  c.fillRect(0, 416, w, 54);
  c.font = "700 26px Arial, sans-serif";
  c.fillStyle = "#f2a33a";
  c.fillText("GO>", 16, 452);
  if (Math.floor(t * 1.4) % 2 === 0) {
    c.fillStyle = "#ffffff";
    c.fillRect(82, 430, 14, 26);
  }
  c.textAlign = "right";
  c.fillStyle = "#c7d0d6";
  c.font = "400 22px Arial, sans-serif";
  c.fillText("Click to open", w - 16, 451);
  c.textAlign = "left";
}

let wallpaperCache: HTMLCanvasElement | null = null;

function paintWallpaper(c: CanvasRenderingContext2D) {
  if (!wallpaperCache) {
    const cache = document.createElement("canvas");
    cache.width = 800;
    cache.height = 470;
    wallpaperCache = cache;
    drawWallpaper(cache.getContext("2d")!, 800, 470);
    void wallpaperReady.then(() => drawWallpaper(cache.getContext("2d")!, 800, 470));
  }
  c.drawImage(wallpaperCache, 0, 0);
}

// A Windows-style taskbar: Start button, the open window, and the clock in the tray.
function drawTaskbar(c: CanvasRenderingContext2D, windowName: string) {
  const y = 438;
  const h = 32;
  const bar = c.createLinearGradient(0, y, 0, y + h);
  bar.addColorStop(0, "#3f8cf3");
  bar.addColorStop(0.12, "#245edb");
  bar.addColorStop(0.9, "#1f4fc0");
  bar.addColorStop(1, "#163a99");
  c.fillStyle = bar;
  c.fillRect(0, y, 800, h);

  const start = c.createLinearGradient(0, y, 0, y + h);
  start.addColorStop(0, "#5eb35e");
  start.addColorStop(0.5, "#3c8f3c");
  start.addColorStop(1, "#2c6f2c");
  c.fillStyle = start;
  c.beginPath();
  c.roundRect(0, y, 98, h, [0, 12, 12, 0]);
  c.fill();
  [["#e8503a", 11, 8], ["#7fba00", 19, 8], ["#1e9cf0", 11, 16], ["#ffb900", 19, 16]].forEach(([color, x, top]) => {
    c.fillStyle = color as string;
    c.fillRect(x as number, y + (top as number), 7, 7);
  });
  c.fillStyle = "#fff";
  c.font = "italic 700 20px Arial, sans-serif";
  c.textBaseline = "middle";
  c.fillText("start", 34, y + h / 2);

  if (windowName) {
    c.fillStyle = "#1c47ad";
    c.beginPath();
    c.roundRect(110, y + 4, 180, h - 8, 3);
    c.fill();
    c.fillStyle = "#fff";
    c.font = "400 15px Arial, sans-serif";
    c.fillText(windowName, 122, y + h / 2);
  }

  c.fillStyle = "#1a8fd6";
  c.fillRect(698, y, 102, h);
  c.fillStyle = "#fff";
  c.textAlign = "center";
  c.fillText(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), 749, y + h / 2);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
}

function drawDesktopIcon(c: CanvasRenderingContext2D, label: string, color: string, glyph: string, y: number) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(34, y, 50, 50, 10);
  c.fill();
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.font = "600 26px Barlow, Arial, sans-serif";
  c.fillText(glyph, 59, y + 34);
  c.font = "600 15px Barlow, Arial, sans-serif";
  c.fillText(label, 59, y + 66);
  c.textAlign = "left";
}

function drawRightDesktop(c: CanvasRenderingContext2D, t: number) {
  paintWallpaper(c);
  c.save();
  c.translate(80, 24);
  c.scale(0.8, 0.8);
  c.beginPath();
  c.roundRect(0, 0, 800, 470, 10);
  c.clip();
  drawRightMonitor(c, t);
  c.restore();
  drawTaskbar(c, "Global Markets");
}

function drawDesktop(c: CanvasRenderingContext2D) {
  paintWallpaper(c);
  DESKTOP_ICONS.forEach((icon, i) => drawDesktopIcon(c, icon.label, icon.color, icon.glyph, 16 + i * 74));
  drawTaskbar(c, "");
  DESKTOP_ICONS.slice(0, 3).forEach((icon, i) => {
    c.fillStyle = icon.color;
    c.beginPath();
    c.roundRect(110 + i * 34, 444, 24, 24, 5);
    c.fill();
  });
}

const TALK_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M4 3h28a2 2 0 0 1 2 2v19a2 2 0 0 1-2 2H15l-8 8v-8H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' fill='%23141c2e' stroke='%23d9b45c' stroke-width='2'/%3E%3Ctext x='18' y='21' text-anchor='middle' font-family='Arial' font-weight='700' font-size='17' fill='%23ffffff'%3E%3F%3C/text%3E%3C/svg%3E") 7 34, pointer`;

const MODES: Record<LightMode, { hemi: number; sun: number; sunColor: number; lamp: number; fill: number; env: number; exposure: number }> = {
  day: { hemi: 1.5, sun: 2.8, sunColor: 0xfff0d8, lamp: 2, fill: 0, env: 0.5, exposure: 1.0 },
  dusk: { hemi: 0.72, sun: 2.2, sunColor: 0xff8a45, lamp: 6, fill: 2.4, env: 0.28, exposure: 1.05 },
  night: { hemi: 0.42, sun: 0.35, sunColor: 0x7f9dff, lamp: 11, fill: 5.5, env: 0.18, exposure: 1.2 },
};

export const MODE_LABEL: Record<LightMode, string> = {
  day: "Daytime in Milwaukee",
  dusk: "Sunset in Milwaukee",
  night: "Night in Milwaukee",
};

const FOCUS: Record<Exclude<ItemId, "lamp" | "cradle" | "mannequin">, { target: Pos; dist: number; lift?: number }> = {
  work: { target: [-0.3, 1.21, -0.82], dist: 1.45 },
  projects: { target: [0.72, 1.21, -0.82], dist: 1.45 },
  about: { target: [-0.42, 0.84, -0.77], dist: 0.95, lift: 0.3 },
  contact: { target: [1.56, 0.86, -0.82], dist: 1.0, lift: 0.3 },
  ratings: { target: [2.53, 1.36, -1.34], dist: 1.3 },
  golf: { target: [-2.1, 0.72, -0.85], dist: 2.75, lift: 0.15 },
  espresso: { target: [1.6, 0.84, -0.36], dist: 0.8, lift: 0.3 },
  records: { target: [2.95, 0.76, -1.38], dist: 1.1, lift: 0.5 },
  plane: { target: [0.1, 2.12, -1.43], dist: 1.25, lift: 0.1 },
  map: { target: [1.63, 1.91, -1.57], dist: 2.3 },
  keyboard: { target: [0.48, 0.8, -0.4], dist: 1.3, lift: 1.0 },
  stash: { target: [-2.75, 0, -0.16], dist: 0.72, lift: 1.5 },
  pennant: { target: [-1.23, 1.55, -1.588], dist: 1.1 },
  camera: { target: [2.42, 0.74, -1.37], dist: 0.9 },
  wine: { target: [2.74, 1.82, -1.38], dist: 0.9 },
  starry: { target: [3.23, 1.87, -1.36], dist: 0.9 },
  books: { target: [-0.38, 2.06, -1.46], dist: 1.0 },
  degree: { target: [-1.12, 2.02, -1.57], dist: 1.65 },
  car: { target: [3.22, 2.26, -1.38], dist: 0.85, lift: 0.22 },
  chess: { target: [2.89, 1.2, -1.39], dist: 1.0, lift: 0.75 },
  rolodex: { target: [1.2, 0.87, -0.66], dist: 0.75, lift: 0.3 },
  balls: { target: [1.79, 1.27, -1.59], dist: 1.25 },
  dog: { target: [-1.14, 0.7, 0.74], dist: 1.25, lift: 0.7 },
};

function startMode(): LightMode {
  const hour = Number(
    new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }),
  );
  if (hour >= 7 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

export function createOffice(canvas: HTMLCanvasElement, cb: OfficeCallbacks): Office {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07130f);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);

  // Room shell
  const wallTex = canvasTexture(1024, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#1b4a39");
    g.addColorStop(1, "#14402f");
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 9000; i++) {
      const v = Math.random();
      c.fillStyle = `rgba(${v > 0.5 ? "255,255,240" : "0,0,0"},0.011)`;
      c.fillRect(Math.random() * 1024, Math.random() * 512, 2 + Math.random() * 16, 2 + Math.random() * 6);
    }
  });
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
  const floorTex = plankTexture();
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 });
  const HATCH = { x0: -3.25, x1: -2.25, z0: -0.35, z1: 0.03 };
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-7, -4.5);
  floorShape.lineTo(7, -4.5);
  floorShape.lineTo(7, 4.5);
  floorShape.lineTo(-7, 4.5);
  floorShape.closePath();
  const hatchHole = new THREE.Path();
  hatchHole.moveTo(HATCH.x0, 2 - HATCH.z1);
  hatchHole.lineTo(HATCH.x1, 2 - HATCH.z1);
  hatchHole.lineTo(HATCH.x1, 2 - HATCH.z0);
  hatchHole.lineTo(HATCH.x0, 2 - HATCH.z0);
  hatchHole.closePath();
  floorShape.holes.push(hatchHole);
  const floorGeo = new THREE.ShapeGeometry(floorShape);
  const floorUv = floorGeo.attributes.uv;
  const floorPos = floorGeo.attributes.position;
  for (let i = 0; i < floorUv.count; i++) floorUv.setXY(i, (floorPos.getX(i) + 7) / 14, (floorPos.getY(i) + 4.5) / 9);
  const floor = mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 2);
  floor.castShadow = false;
  scene.add(floor);
  scene.add(box(14, 5, 0.1, wallMat, [0, 2.5, -1.65]));
  scene.add(box(14, 0.92, 0.04, mat(COLORS.wallLow, 0.7), [0, 0.46, -1.58]));
  scene.add(box(14, 0.03, 0.07, mat(COLORS.brass, 0.35, 0.8), [0, 0.93, -1.57]));
  scene.add(box(14, 0.12, 0.08, mat(COLORS.walnutDark), [0, 0.06, -1.56]));
  const ceiling = mesh(new THREE.PlaneGeometry(14, 9), mat(0x6f6a5e, 0.95));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.1, 2);
  ceiling.castShadow = false;
  scene.add(ceiling);
  scene.add(box(14, 0.14, 0.1, mat(COLORS.walnutDark), [0, 3.04, -1.58]));
  scene.add(box(14, 0.02, 0.12, mat(COLORS.brass, 0.35, 0.8), [0, 2.96, -1.57]));

  const rugTex = canvasTexture(2048, 1280, drawRug);
  rugTex.anisotropy = 8;
  const rug = box(3.7, 0.012, 2.25, new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95, color: 0xd0d0d0 }), [0.2, 0.006, -0.05]);
  const fringeTex = canvasTexture(32, 512, (c) => {
    c.clearRect(0, 0, 32, 512);
    for (let y = 2; y < 512; y += 6) {
      c.fillStyle = y % 12 ? "#d9cdb4" : "#bfb195";
      c.fillRect(0, y, 30, 3);
    }
  });
  for (const x of [0.2 - 1.885, 0.2 + 1.885]) {
    const fringe = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 2.25), new THREE.MeshStandardMaterial({ map: fringeTex, transparent: true, roughness: 0.9 }));
    fringe.rotation.x = -Math.PI / 2;
    fringe.position.set(x, 0.008, -0.05);
    scene.add(fringe);
  }
  rug.castShadow = false;
  scene.add(rug);

  // Wall art skips the room lighting, so daylight can't wash it out. Each mode just dims it evenly.
  const wallArtMats: THREE.MeshBasicMaterial[] = [];
  const wallArt = (map: THREE.Texture) => {
    const m = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    wallArtMats.push(m);
    return m;
  };

  // Window with the Milwaukee view
  const skyEl = document.createElement("canvas");
  skyEl.width = skyEl.height = 768;
  const skyCtx = skyEl.getContext("2d")!;
  const skyTex = new THREE.CanvasTexture(skyEl);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.75), new THREE.MeshBasicMaterial({ map: skyTex }));
  glass.position.set(-2.55, 1.72, -1.59);
  scene.add(glass);

  // A small fishing boat that cruises across the lake now and then
  const boatMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(256, 128, (c) => {
      c.strokeStyle = "rgba(255, 255, 255, 0.75)";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(6, 104);
      c.quadraticCurveTo(26, 98, 46, 100);
      c.moveTo(18, 112);
      c.quadraticCurveTo(44, 108, 66, 108);
      c.stroke();
      c.fillStyle = "#e9e4d6";
      c.beginPath();
      c.moveTo(48, 72);
      c.lineTo(226, 72);
      c.lineTo(200, 104);
      c.lineTo(64, 104);
      c.closePath();
      c.fill();
      c.fillStyle = "#a12a22";
      c.fillRect(56, 92, 150, 6);
      c.fillStyle = "#33404c";
      c.fillRect(110, 40, 58, 32);
      c.fillStyle = "#bcd7e6";
      c.fillRect(138, 46, 24, 14);
      c.fillStyle = "#26303a";
      c.fillRect(106, 36, 66, 6);
      c.fillStyle = "#c98a2c";
      c.beginPath();
      c.arc(86, 50, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#26303a";
      c.fillRect(79, 58, 14, 16);
      c.strokeStyle = "#26303a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(82, 62);
      c.lineTo(36, 26);
      c.lineTo(30, 84);
      c.stroke();
    }),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
  wallArtMats.push(boatMat);
  const boat = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), boatMat);
  boat.position.set(-2.55, 1.32, -1.5865);
  boat.visible = false;
  boat.raycast = () => undefined;
  scene.add(boat);

  // Shooting star across the window, set off by clicking the pennant
  const STAR_FROM = new THREE.Vector3(-3.25, 2.5, -1.586);
  const STAR_TO = new THREE.Vector3(-1.95, 1.62, -1.586);
  const starTex = canvasTexture(512, 32, (c) => {
        const tail = c.createLinearGradient(0, 0, 500, 0);
        tail.addColorStop(0, "rgba(255,255,255,0)");
        tail.addColorStop(0.7, "rgba(214,232,255,0.55)");
        tail.addColorStop(1, "rgba(255,255,255,1)");
        c.fillStyle = tail;
        c.beginPath();
        c.moveTo(0, 16);
        c.lineTo(500, 10);
        c.lineTo(500, 22);
        c.closePath();
        c.fill();
        const head = c.createRadialGradient(496, 16, 1, 496, 16, 16);
        head.addColorStop(0, "rgba(255,255,255,1)");
        head.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = head;
        c.fillRect(464, 0, 48, 32);
  });
  // A dim star would vanish against the daytime sky, so daylight gets a fireball instead.
  const fireTex = canvasTexture(768, 128, (c) => {
    const tail = c.createLinearGradient(0, 0, 690, 0);
    tail.addColorStop(0, "rgba(120,40,10,0)");
    tail.addColorStop(0.45, "rgba(214,70,16,0.7)");
    tail.addColorStop(0.8, "rgba(255,146,32,0.95)");
    tail.addColorStop(1, "rgba(255,220,110,1)");
    c.fillStyle = tail;
    c.beginPath();
    c.moveTo(0, 64);
    c.quadraticCurveTo(420, 42, 690, 22);
    c.lineTo(690, 106);
    c.quadraticCurveTo(420, 86, 0, 64);
    c.closePath();
    c.fill();
    const head = c.createRadialGradient(690, 64, 4, 690, 64, 62);
    head.addColorStop(0, "rgba(255,255,235,1)");
    head.addColorStop(0.4, "rgba(255,206,84,1)");
    head.addColorStop(0.75, "rgba(255,112,24,0.85)");
    head.addColorStop(1, "rgba(214,60,10,0)");
    c.fillStyle = head;
    c.fillRect(620, 0, 148, 128);
  });
  const star = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.03),
    new THREE.MeshBasicMaterial({ map: starTex, transparent: true, depthWrite: false, opacity: 0 }),
  );
  star.rotation.z = Math.atan2(STAR_TO.y - STAR_FROM.y, STAR_TO.x - STAR_FROM.x);
  star.visible = false;
  star.raycast = () => undefined;
  scene.add(star);
  const launchStar = () => {
    const fire = mode === "day";
    const material = star.material as THREE.MeshBasicMaterial;
    material.map = fire ? fireTex : starTex;
    material.needsUpdate = true;
    star.scale.set(fire ? 0.97 : 1, fire ? 3.4 : 1, 1);
    starAt = lastT;
  };
  const frame = mat(COLORS.walnut, 0.5);
  for (const [w, h, x, y] of [
    [1.86, 0.08, -2.55, 2.63],
    [1.86, 0.08, -2.55, 0.81],
    [0.08, 1.86, -3.44, 1.72],
    [0.08, 1.86, -1.66, 1.72],
    [0.035, 1.75, -2.55, 1.72],
    [1.7, 0.035, -2.55, 1.72],
  ] as const) {
    scene.add(box(w, h, 0.07, frame, [x, y, -1.56]));
  }

  // Desk
  const walnut = mat(COLORS.walnut, 0.42);
  const walnutDark = mat(COLORS.walnutDark, 0.55);
  scene.add(box(3.3, 0.065, 0.98, walnut, [0.2, 0.75, -0.72]));
  scene.add(box(0.62, 0.72, 0.86, walnutDark, [-1.08, 0.36, -0.72]));
  scene.add(box(0.62, 0.72, 0.86, walnutDark, [1.48, 0.36, -0.72]));
  for (const x of [-1.08, 1.48]) {
    for (const y of [0.2, 0.46]) {
      scene.add(box(0.5, 0.2, 0.012, walnut, [x, y, -0.285]));
      scene.add(box(0.1, 0.012, 0.02, mat(COLORS.brass, 0.3, 0.9), [x, y, -0.27]));
    }
  }

  const pickables = new Map<ItemId, THREE.Object3D>();
  const group = (id: ItemId, pos: Pos = [0, 0, 0]) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.userData.id = id;
    scene.add(g);
    pickables.set(id, g);
    return g;
  };

  // Dual monitors
  const monitor = (id: ItemId, x: number, rotY: number, draw: (c: CanvasRenderingContext2D, t: number) => void) => {
    const g = group(id, [x, 0.78, -0.82]);
    g.rotation.y = rotY;
    const bezel = mat(COLORS.bezel, 0.4, 0.3);
    g.add(box(1.0, 0.6, 0.04, bezel, [0, 0.43, 0]));
    g.add(box(0.14, 0.14, 0.012, bezel, [0, 0.43, -0.026]));
    const el = document.createElement("canvas");
    el.width = 800;
    el.height = 470;
    const ctx = el.getContext("2d")!;
    const tex = new THREE.CanvasTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.56), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(0, 0.43, 0.0215);
    g.add(screen);
    return { ctx, tex, draw };
  };
  const screens = [
    monitor("work", -0.3, 0.13, drawDesktop),
    monitor("projects", 0.72, -0.13, drawRightDesktop),
  ];

  // Dual monitor arm, clamped to the back edge of the desk
  const armMat = mat(0x1c1e21, 0.32, 0.65);
  const armX = 0.21;
  scene.add(box(0.13, 0.024, 0.13, armMat, [armX, 0.795, -1.12]));
  scene.add(cyl(0.022, 0.024, 0.46, armMat, [armX, 1.02, -1.12], 20));
  const armLink = (from: THREE.Vector3, to: THREE.Vector3, r: number) => {
    const len = from.distanceTo(to);
    const link = cyl(r, r, len, armMat, [0, 0, 0], 14);
    link.position.copy(from.clone().add(to).multiplyScalar(0.5));
    link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    scene.add(link);
  };
  for (const [mx, rot] of [[-0.3, 0.13], [0.72, -0.13]] as const) {
    const pole = new THREE.Vector3(armX, 1.21, -1.12);
    const elbow = new THREE.Vector3((armX + mx) / 2, 1.21, -1.2);
    const plate = new THREE.Vector3(mx, 1.21, -0.86);
    armLink(pole, elbow, 0.017);
    armLink(elbow, plate, 0.015);
    scene.add(mesh(new THREE.SphereGeometry(0.024, 14, 10), armMat, [elbow.x, elbow.y, elbow.z]));
    void rot;
  }

  // Low-profile backlit keyboard and sculpted mouse
  const keyboardG = group("keyboard", [0.2, 0.783, -0.4]);
  const kbW = 0.62;
  const kbD = 0.21;
  keyboardG.add(mesh(new RoundedBoxGeometry(kbW, 0.018, kbD, 4, 0.008), mat(0x17181b, 0.42, 0.45), [0, 0.01, 0]));
  const rows: [string, number][][] = [
    "esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12".split(" ").map((k) => [k, 1]),
    [..."`1234567890-="].map((k) => [k, 1] as [string, number]).concat([["delete", 2]]),
    [["tab", 1.5] as [string, number]].concat([..."QWERTYUIOP[]"].map((k) => [k, 1])).concat([["\\", 1.5]]),
    [["caps", 1.8] as [string, number]].concat([..."ASDFGHJKL;'"].map((k) => [k, 1])).concat([["enter", 2.2]]),
    [["shift", 2.3] as [string, number]].concat([..."ZXCVBNM,./"].map((k) => [k, 1])).concat([["shift", 2.7]]),
    [["ctrl", 1.3], ["opt", 1.3], ["cmd", 1.4], ["", 6], ["cmd", 1.4], ["fn", 1], ["ctrl", 1], ["<", 1], [">", 1]],
  ];
  const numpad = ["7 8 9", "4 5 6", "1 2 3", "0 . +"].map((r) => r.split(" "));
  const pitch = 0.0345;
  const keyPlaces: { x: number; z: number; w: number; label: string }[] = [];
  const left = -kbW / 2 + 0.014;
  rows.forEach((row, r) => {
    let x = left;
    row.forEach(([label, units]) => {
      const w = units * pitch;
      keyPlaces.push({ x: x + w / 2, z: -kbD / 2 + 0.02 + r * pitch, w: w - 0.0045, label });
      x += w;
    });
  });
  numpad.forEach((row, r) =>
    row.forEach((label, i) =>
      keyPlaces.push({ x: kbW / 2 - 0.016 - (2 - i + 0.5) * pitch + 0.0, z: -kbD / 2 + 0.02 + (r + 2) * pitch, w: pitch - 0.0045, label }),
    ),
  );
  const keyGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
  const keyMesh = new THREE.InstancedMesh(keyGeo, mat(0x26282c, 0.5, 0.1), keyPlaces.length);
  const keyMatrix = new THREE.Matrix4();
  keyPlaces.forEach((k, i) => {
    keyMatrix.makeScale(k.w, 0.006, pitch - 0.0045).setPosition(k.x, 0.021, k.z);
    keyMesh.setMatrixAt(i, keyMatrix);
  });
  keyMesh.castShadow = true;
  keyboardG.add(keyMesh);
  const legendTex = canvasTexture(1860, 630, (c) => {
    c.clearRect(0, 0, 1860, 630);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#ffffff";
    c.shadowColor = "#bcd8ff";
    c.shadowBlur = 8;
    keyPlaces.forEach((k) => {
      c.font = `600 ${k.label.length > 2 ? 20 : 30}px Barlow, Arial, sans-serif`;
      c.fillText(k.label, ((k.x + kbW / 2) / kbW) * 1860, ((k.z + kbD / 2) / kbD) * 630);
    });
  });
  const legendMat = new THREE.MeshBasicMaterial({ map: legendTex, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  const legends = new THREE.Mesh(new THREE.PlaneGeometry(kbW, kbD), legendMat);
  legends.rotation.x = -Math.PI / 2;
  legends.position.y = 0.0245;
  keyboardG.add(legends);

  // Mouse: a top-down image draped over a raised shape, so it has real height on the desk
  const loadTex = (url: string, color = true) => {
    const t = new THREE.TextureLoader().load(url, () => {
      t.needsUpdate = true;
    });
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const mouseTop = loadTex(mouseTopUrl);
  const mouseMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.185, 0.185, 110, 110),
    new THREE.MeshStandardMaterial({
      map: mouseTop,
      displacementMap: loadTex(mouseHeightUrl, false),
      displacementScale: 0.036,
      envMapIntensity: 0,
      color: 0x303030,
      alphaTest: 0.5,
      transparent: true,
      roughness: 1,
      emissive: 0xffffff,
      emissiveMap: mouseTop,
      emissiveIntensity: 0.62,
      side: THREE.DoubleSide,
    }),
  );
  mouseMesh.rotation.x = -Math.PI / 2;
  mouseMesh.position.set(0.455, 0.002, 0.0);
  keyboardG.add(mouseMesh);
  const mouseShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.085, 28),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  mouseShadow.rotation.x = -Math.PI / 2;
  mouseShadow.scale.set(0.82, 1.1, 1);
  mouseShadow.position.set(0.463, 0.0012, 0.008);
  keyboardG.add(mouseShadow);

  // Banker's lamp
  const brass = mat(COLORS.brass, 0.3, 0.95);
  const lampG = group("lamp", [-1.0, 0.783, -0.92]);
  lampG.add(cyl(0.11, 0.13, 0.03, brass, [0, 0.015, 0]));
  lampG.add(cyl(0.012, 0.012, 0.36, brass, [0, 0.19, 0]));
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x0f6b4a, roughness: 0.2, emissive: 0x0f6b4a, emissiveIntensity: 0.6 });
  const shade = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.46, 24, 1, false, 0, Math.PI), shadeMat, [0, 0.37, 0]);
  shade.rotation.set(0, Math.PI / 2, Math.PI / 2);
  lampG.add(shade);

  const lampLight = new THREE.SpotLight(0xffc98a, 8, 1.9, 0.85, 0.85, 1.5);
  lampLight.position.set(-1.0, 1.12, -0.86);
  lampLight.target.position.set(-0.6, 0.76, -0.55);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.bias = -0.0008;
  scene.add(lampLight, lampLight.target);

  // Newton's cradle. Click it to set the balls swinging.
  const cradleG = group("cradle", [-1.25, 0.783, -0.62]);
  cradleG.rotation.y = 0.28;
  cradleG.scale.setScalar(0.82);
  cradleG.add(mesh(new RoundedBoxGeometry(0.32, 0.018, 0.17, 3, 0.007), mat(COLORS.walnutDark, 0.4), [0, 0.009, 0]));
  const railMat = mat(0xc9ced4, 0.2, 0.95);
  const stringMat = new THREE.LineBasicMaterial({ color: 0x8f949a });
  const cradleH = 0.225;
  for (const z of [-0.065, 0.065]) {
    const rail = new THREE.CatmullRomCurve3(
      [
        [-0.145, 0.016], [-0.145, cradleH - 0.015], [-0.13, cradleH], [0.13, cradleH], [0.145, cradleH - 0.015], [0.145, 0.016],
      ].map(([x, y]) => new THREE.Vector3(x, y, z)),
      false,
      "catmullrom",
      0.12,
    );
    cradleG.add(mesh(new THREE.TubeGeometry(rail, 60, 0.0045, 10), railMat));
  }
  // Invisible click area covering the whole cradle, including the open frame
  const cradleHit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.25, 0.18), new THREE.MeshBasicMaterial());
  cradleHit.position.y = 0.125;
  cradleHit.visible = false;
  cradleG.add(cradleHit);
  const ballR = 0.026;
  const cradleBalls = [-2, -1, 0, 1, 2].map((n) => {
    const pivot = new THREE.Group();
    pivot.position.set(n * ballR * 2.02, cradleH, 0);
    const len = 0.14;
    pivot.add(mesh(new THREE.SphereGeometry(ballR, 28, 20), railMat, [0, -len, 0]));
    const strings = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        [-0.065, 0.065].flatMap((z) => [new THREE.Vector3(0, 0, z), new THREE.Vector3(0, -len, 0)]),
      ),
      stringMat,
    );
    // Thin strings stay out of click detection, which would otherwise catch clicks across the room.
    strings.raycast = () => undefined;
    pivot.add(strings);
    cradleG.add(pivot);
    return pivot;
  });

  // A pair of dice on the desk, showing snake eyes
  const diceG = new THREE.Group();
  diceG.position.set(-0.79, 0.783, -0.62);
  scene.add(diceG);
  const dieFace = (pips: [number, number][]) => {
    const tex = canvasTexture(128, 128, (c) => {
      c.fillStyle = "#a81f1c";
      c.fillRect(0, 0, 128, 128);
      c.fillStyle = "#f6f1e4";
      for (const [x, y] of pips) {
        c.beginPath();
        c.arc(x, y, 13, 0, Math.PI * 2);
        c.fill();
      }
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
  };
  const L = 34;
  const M = 64;
  const H = 94;
  const dieMats = [
    dieFace([[L, L], [M, M], [H, H]]),
    dieFace([[L, L], [H, L], [L, H], [H, H]]),
    dieFace([[L, L], [H, H]]),
    dieFace([[L, L], [H, L], [M, M], [L, H], [H, H]]),
    dieFace([[M, M]]),
    dieFace([[L, L], [H, L], [L, M], [H, M], [L, H], [H, H]]),
  ];
  [[-0.034, 0.012, 0.16], [0.036, -0.008, -0.14]].forEach(([x, z, turn]) => {
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.046, 0.046), dieMats);
    die.position.set(x, 0.023, z);
    die.rotation.y = turn;
    die.castShadow = true;
    diceG.add(die);
  });

  // Nameplate
  const plateG = group("about", [-0.42, 0.783, -0.77]);
  plateG.rotation.y = 0.1;
  plateG.scale.setScalar(0.82);
  const plateTex = canvasTexture(512, 110, (c) => {
    c.fillStyle = "#b08a3c";
    c.fillRect(0, 0, 512, 110);
    c.fillStyle = "#1b1408";
    c.font = "700 54px Georgia, serif";
    c.textAlign = "center";
    c.fillText("V. DAMATO", 256, 74);
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.02), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.32, metalness: 0.6 }));
  plate.position.set(0, 0.055, 0);
  plate.rotation.x = -0.25;
  plate.castShadow = true;
  plateG.add(plate);
  plateG.add(box(0.46, 0.012, 0.09, walnutDark, [0, 0.006, -0.01]));

  // Desk phone: gloss black with a brass dial, cradle and coiled cord
  const phoneG = group("contact", [1.56, 0.783, -0.82]);
  phoneG.rotation.y = -0.22;
  const black = mat(0x0d0c0c, 0.16, 0.25);
  const phoneBrass = mat(COLORS.brass, 0.24, 0.95);
  const smooth = (pts: [number, number][]) =>
    new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(40);
  const phoneBody = mesh(
    new THREE.LatheGeometry(smooth([[0, 0], [0.14, 0], [0.146, 0.012], [0.128, 0.05], [0.09, 0.09], [0.05, 0.118], [0.03, 0.14], [0, 0.147]]), 48),
    black,
  );
  phoneBody.scale.z = 1.08;
  phoneG.add(phoneBody);
  const baseTrim = mesh(new THREE.TorusGeometry(0.146, 0.004, 8, 56), phoneBrass, [0, 0.008, 0]);
  baseTrim.rotation.x = Math.PI / 2;
  phoneG.add(baseTrim);
  const dialG = new THREE.Group();
  dialG.position.set(0, 0.078, 0.112);
  dialG.rotation.x = 0.68;
  phoneG.add(dialG);
  dialG.add(cyl(0.056, 0.058, 0.008, phoneBrass, [0, 0, 0], 40));
  dialG.add(cyl(0.022, 0.022, 0.003, mat(COLORS.cream, 0.45), [0, 0.005, 0], 28));
  for (let i = 0; i < 10; i++) {
    const a = (i / 11.4) * Math.PI * 2 + 0.7;
    dialG.add(cyl(0.0078, 0.0078, 0.0035, mat(0x17140f, 0.5), [Math.cos(a) * 0.04, 0.0045, Math.sin(a) * 0.04], 14));
  }
  phoneG.add(cyl(0.012, 0.016, 0.03, phoneBrass, [0, 0.158, -0.01], 18));
  phoneG.add(box(0.14, 0.008, 0.024, phoneBrass, [0, 0.172, -0.01]));
  for (const x of [-0.066, 0.066]) phoneG.add(box(0.008, 0.024, 0.024, phoneBrass, [x, 0.184, -0.01]));
  const handsetPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.178, -0.01),
    new THREE.Vector3(-0.1, 0.194, -0.01),
    new THREE.Vector3(0, 0.2, -0.01),
    new THREE.Vector3(0.1, 0.194, -0.01),
    new THREE.Vector3(0.15, 0.178, -0.01),
  ]);
  // The handset sits on its own pivot so it can lift and rattle off the cradle when the phone rings.
  const handsetPivot = new THREE.Group();
  handsetPivot.position.set(0, 0.178, -0.01);
  phoneG.add(handsetPivot);
  const handset = new THREE.Group();
  handset.position.set(0, -0.178, 0.01);
  handsetPivot.add(handset);
  handset.add(mesh(new THREE.TubeGeometry(handsetPath, 40, 0.015, 12), black));
  for (const x of [-0.155, 0.155]) {
    const cup = mesh(
      new THREE.LatheGeometry(smooth([[0.016, 0.03], [0.03, 0.018], [0.036, 0.004], [0.034, 0], [0, 0]]), 28),
      black,
      [x, 0.142, -0.01],
    );
    handset.add(cup);
  }
  const cordPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, 0.03, -0.02),
    new THREE.Vector3(0.22, 0.012, 0.03),
    new THREE.Vector3(0.24, 0.012, -0.08),
    new THREE.Vector3(0.195, 0.09, -0.04),
    new THREE.Vector3(0.158, 0.14, -0.012),
  ]);
  const coil = cordPath.getPoints(500).map((p, i) => {
    const a = i * 0.72;
    return new THREE.Vector3(p.x + Math.cos(a) * 0.0055, p.y + Math.sin(a) * 0.0055, p.z + Math.sin(a) * 0.0035);
  });
  phoneG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 900, 0.0017, 5), black));

  // Espresso
  const coffeeG = group("espresso", [1.6, 0.783, -0.36]);
  const china = mat(0xf2ede1, 0.3);
  coffeeG.add(cyl(0.085, 0.06, 0.012, china, [0, 0.008, 0]));
  coffeeG.add(cyl(0.05, 0.036, 0.062, china, [0, 0.045, 0]));
  coffeeG.add(cyl(0.044, 0.044, 0.002, mat(0x2a150a, 0.3), [0, 0.0775, 0]));
  const handle = mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 16), china, [0.055, 0.047, 0]);
  coffeeG.add(handle);

  // Wall shelf and model airplane
  scene.add(box(1.75, 0.05, 0.28, walnut, [0.2, 1.92, -1.48]));
  const planeG = group("plane", [0.4, 1.945, -1.43]);
  planeG.add(cyl(0.055, 0.075, 0.014, brass, [0, 0.007, 0], 28));
  planeG.add(cyl(0.007, 0.009, 0.14, brass, [0, 0.08, 0], 12));
  const jet = buildBizJet(scene.environment);
  jet.scale.setScalar(0.0145);
  jet.position.set(0, 0.17, 0);
  jet.rotation.set(0.1, -0.42, 0.09, "YXZ");
  planeG.add(jet);
  const booksG = group("books", [0, 0, 0]);
  const shelfBook = (w: number, h: number, x: number, color: string, ink: string, title: string, author: string) => {
    const cover = mat(new THREE.Color(color).getHex(), 0.5);
    const drawSpine = (c: CanvasRenderingContext2D) => {
      const { width: cw, height: ch } = c.canvas;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = color;
      c.fillRect(0, 0, cw, ch);
      c.translate(cw / 2, 0);
      c.rotate(Math.PI / 2);
      c.fillStyle = ink;
      c.textBaseline = "middle";
      c.textAlign = "right";
      c.font = "400 15px Barlow, Arial, sans-serif";
      c.fillText(author, ch - 14, 0);
      const room = ch - c.measureText(author).width - 44;
      c.textAlign = "left";
      c.font = "600 25px Barlow, Arial, sans-serif";
      const size = Math.min(25, (25 * room) / c.measureText(title).width);
      c.font = `600 ${size}px Barlow, Arial, sans-serif`;
      c.fillText(title, 16, 0);
    };
    const spine = canvasTexture(Math.round(w * 1400), Math.round(h * 1400), drawSpine);
    whenMapFontsReady()
      .then(() => {
        drawSpine(spine.image.getContext("2d"));
        spine.needsUpdate = true;
      })
      .catch(() => undefined);
    const mesh3 = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.13),
      [cover, cover, cover, cover, new THREE.MeshStandardMaterial({ map: spine, roughness: 0.5 }), cover],
    );
    mesh3.position.set(x, 1.945 + h / 2, -1.46);
    mesh3.castShadow = true;
    booksG.add(mesh3);
  };
  shelfBook(0.05, 0.215, -0.635, "#1c3a2a", "#efe6cc", "Reminiscences of a Stock Operator", "LEFEVRE");
  shelfBook(0.046, 0.225, -0.584, "#1d1d20", "#d8b45a", "When Genius Failed", "LOWENSTEIN");
  shelfBook(0.056, 0.225, -0.53, "#14233f", "#f2f2ee", "The Greeks and Hedging Explained", "LEONI");
  shelfBook(0.05, 0.21, -0.474, "#e8e6df", "#14233f", "Going Infinite", "LEWIS");
  shelfBook(0.05, 0.218, -0.421, "#f2f0ea", "#1b1b1b", "The Hard Thing About Hard Things", "HOROWITZ");
  shelfBook(0.04, 0.205, -0.373, "#2a6fb0", "#ffffff", "Zero to One", "THIEL");
  shelfBook(0.052, 0.22, -0.324, "#9c1f24", "#f2f2ee", "How to Build a Car", "NEWEY");
  shelfBook(0.04, 0.2, -0.275, "#a81f22", "#e9c774", "Little Red Book", "PENICK");
  shelfBook(0.05, 0.215, -0.227, "#ece4d2", "#2b2418", "Stick and Rudder", "LANGEWIESCHE");
  shelfBook(0.05, 0.21, -0.174, "#2b3b52", "#f2f2ee", "Fate Is the Hunter", "GANN");
  shelfBook(0.046, 0.205, -0.123, "#f4efe2", "#2b2418", "Atomic Habits", "CLEAR");

  // Framed travel map
  const mapG = group("map", [1.63, 1.91, -1.57]);
  mapG.scale.setScalar(0.92);
  mapG.add(box(1.08, 0.72, 0.03, mat(COLORS.walnutDark, 0.5)));
  const mapTex = canvasTexture(2048, 1270, drawWorldMap);
  whenMapFontsReady()
    .then(() => {
      drawWorldMap(mapTex.image.getContext("2d"));
      mapTex.needsUpdate = true;
    })
    .catch(() => undefined);
  const mapPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.02, 0.66),
    wallArt(mapTex),
  );
  mapPlane.position.z = 0.017;
  mapPlane.receiveShadow = true;
  mapG.add(mapPlane);

  // Bookshelf
  const shelfX = 2.95;
  scene.add(box(1.5, 2.72, 0.03, walnutDark, [shelfX, 1.36, -1.56]));
  for (const x of [shelfX - 0.74, shelfX + 0.74]) scene.add(box(0.04, 2.72, 0.36, walnut, [x, 1.36, -1.4]));
  const shelfYs = [0.05, 0.62, 1.14, 1.66, 2.18, 2.7];
  for (const y of shelfYs) scene.add(box(1.5, 0.04, 0.36, walnut, [shelfX, y, -1.4]));
  const bookColors = [0x2d4e7a, 0x7a2f2a, 0xc9a14a, 0x2e5b46, 0xd6cdb8, 0x3c3a52, 0x8c5a2b];
  const books = (y: number, from: number, to: number, seed: number) => {
    let x = from;
    let i = seed;
    while (x < to) {
      const w = 0.04 + ((i * 37) % 5) * 0.012;
      const h = 0.27 + ((i * 53) % 7) * 0.022;
      scene.add(box(w, h, 0.24, mat(bookColors[i % bookColors.length], 0.6), [x + w / 2, y + 0.02 + h / 2, -1.4]));
      x += w + 0.004;
      i++;
    }
  };
  books(0.07, shelfX + 0.14, shelfX + 0.66, 3);
  // Vinyl records filed on the bottom shelf: thin square sleeves, standing spine out
  const sleeveMats = [0x23344f, 0x6e2a26, 0x26262b, 0x9a7a3a, 0x2f5a48, 0xc9c1ad, 0x4a3a5e, 0x3b6a7a].map((c) => mat(c, 0.7));
  const sleeveGeo = new THREE.BoxGeometry(0.0145, 0.33, 0.32);
  for (let i = 0; i < 46; i++) {
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMats[Math.floor(Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453)) % sleeveMats.length]);
    sleeve.position.set(shelfX - 0.69 + i * 0.0166, 0.07 + 0.165, -1.39);
    sleeve.castShadow = true;
    scene.add(sleeve);
  }
  books(1.68, shelfX - 0.68, shelfX - 0.42, 7);
  books(1.16, shelfX + 0.18, shelfX + 0.66, 2);
  books(2.2, shelfX - 0.36, shelfX + 0.06, 5);

  // American Gothic in a gold frame, leaning against the back of the shelf
  const paintingG = group("ratings", [shelfX - 0.42, 1.16, -1.34]);
  const paintingLean = new THREE.Group();
  paintingLean.rotation.x = -0.17;
  paintingG.add(paintingLean);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xb98d3f, roughness: 0.34, metalness: 0.7 });
  const frameW = 0.34;
  const frameH = 0.41;
  const rail = 0.03;
  paintingLean.add(box(frameW, frameH, 0.012, mat(0x1d140c, 0.8), [0, frameH / 2, 0]));
  for (const y of [rail / 2, frameH - rail / 2]) paintingLean.add(box(frameW, rail, 0.03, frameMat, [0, y, 0.01]));
  for (const x of [-frameW / 2 + rail / 2, frameW / 2 - rail / 2]) paintingLean.add(box(rail, frameH, 0.03, frameMat, [x, frameH / 2, 0.01]));
  paintingLean.add(box(frameW - rail * 2, frameH - rail * 2, 0.002, mat(0xe9e2d0, 0.8), [0, frameH / 2, 0.008]));
  const paintingTex = new THREE.TextureLoader().load(paintingUrl, () => {
    paintingTex.needsUpdate = true;
  });
  paintingTex.colorSpace = THREE.SRGBColorSpace;
  paintingTex.anisotropy = 8;
  const paintingFace = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.302), wallArt(paintingTex));
  paintingFace.position.set(0, frameH / 2, 0.0105);
  paintingLean.add(paintingFace);
  paintingLean.traverse((o) => {
    o.castShadow = true;
  });

  // Turntable: walnut plinth, spinning platter, and a tonearm that drops onto the record
  const recordG = group("records", [shelfX, 0.64, -1.38]);
  recordG.add(mesh(new RoundedBoxGeometry(0.66, 0.075, 0.3, 4, 0.012), mat(0x5a3820, 0.34), [0, 0.0375, 0]));
  recordG.add(box(0.655, 0.004, 0.295, mat(0x141416, 0.45), [0, 0.0765, 0]));
  for (const [x, z] of [[-0.29, -0.11], [0.29, -0.11], [-0.29, 0.11], [0.29, 0.11]]) {
    recordG.add(cyl(0.018, 0.022, 0.012, mat(0x141416, 0.5), [x, 0.0, z], 14));
  }
  const platter = new THREE.Group();
  platter.position.set(-0.08, 0.084, 0);
  recordG.add(platter);
  platter.add(cyl(0.128, 0.128, 0.012, mat(0xb9bec4, 0.3, 0.9), [0, 0, 0], 56));
  const grooves = canvasTexture(512, 512, (c) => {
    c.fillStyle = "#0b0b0c";
    c.fillRect(0, 0, 512, 512);
    for (let r = 100; r < 250; r += 3) {
      c.strokeStyle = r % 2 ? "#1b1b1e" : "#0e0e10";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(256, 256, r, 0, Math.PI * 2);
      c.stroke();
    }
    const sheen = c.createConicGradient(0.6, 256, 256);
    sheen.addColorStop(0, "rgba(255,255,255,0.16)");
    sheen.addColorStop(0.12, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.14)");
    sheen.addColorStop(0.62, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(255,255,255,0.16)");
    c.fillStyle = sheen;
    c.fillRect(0, 0, 512, 512);
  });
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.124, 64),
    new THREE.MeshStandardMaterial({ map: grooves, roughness: 0.35 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.0075;
  platter.add(disc);
  const recordLabel = cyl(0.042, 0.042, 0.002, mat(0x9c2c24, 0.5), [0, 0.0085, 0], 40);
  platter.add(recordLabel);
  platter.add(cyl(0.004, 0.004, 0.012, mat(0xd9dde1, 0.25, 0.95), [0, 0.012, 0], 12));
  const armPivot = new THREE.Group();
  armPivot.position.set(0.17, 0.098, -0.095);
  recordG.add(armPivot);
  recordG.add(cyl(0.024, 0.028, 0.022, mat(0xb9bec4, 0.3, 0.9), [0.17, 0.087, -0.095], 22));
  const armMetal = mat(0xd4d8dc, 0.24, 0.95);
  const armLen = 0.22;
  const armTube = cyl(0.0035, 0.0035, armLen, armMetal, [0, 0.006, armLen / 2], 10);
  armTube.rotation.x = Math.PI / 2;
  armPivot.add(armTube);
  armPivot.add(box(0.016, 0.006, 0.034, mat(0x141416, 0.4), [0, 0.002, armLen + 0.012]));
  const counter = cyl(0.012, 0.012, 0.024, mat(0x2a2c30, 0.3, 0.7), [0, 0.006, -0.024], 16);
  counter.rotation.x = Math.PI / 2;
  armPivot.add(counter);
  const powerLight = new THREE.Mesh(new THREE.CircleGeometry(0.006, 14), new THREE.MeshBasicMaterial({ color: 0x3a1512 }));
  powerLight.rotation.x = -Math.PI / 2;
  powerLight.position.set(0.28, 0.0795, 0.115);
  recordG.add(powerLight);
  recordG.add(cyl(0.017, 0.019, 0.016, mat(0xb9bec4, 0.3, 0.9), [0.24, 0.086, 0.11], 20));
  let armAngle = 0;

  // Golf: black cart bag with a set of chrome cavity-back irons
  let bagHitCtx: CanvasRenderingContext2D | null = null;
  const golfG = group("golf", [0.14, 0, 0]);
  const clubLean = -0.39;
  const clubsRoot = new THREE.Group();
  clubsRoot.position.set(-2.425, -0.02, -1.02);
  clubsRoot.rotation.z = clubLean;
  golfG.add(clubsRoot);
  const golfTurn = new THREE.Group();
  golfTurn.rotation.y = 0.18;
  golfTurn.scale.set(0.74, 1, 0.74);
  clubsRoot.add(golfTurn);

  // The bag itself is a cutout image standing in the room. The clubs behind it are 3D.
  const bagTex = new THREE.TextureLoader().load(golfBagUrl, () => {
    bagTex.colorSpace = THREE.SRGBColorSpace;
    bagTex.anisotropy = 8;
    bagTex.needsUpdate = true;
  });
  bagTex.colorSpace = THREE.SRGBColorSpace;
  const bagPhoto = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshStandardMaterial({
      map: bagTex,
      color: 0x8c8c8c,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.9,
      emissive: 0xffffff,
      emissiveMap: bagTex,
      emissiveIntensity: 0.32,
    }),
  );
  bagPhoto.position.set(-2.143, 0.498, -0.85);
  bagPhoto.rotation.y = 0.16;
  golfG.add(bagPhoto);
  // The photo is a big square, so only the bag itself counts for hover. That leaves out the
  // empty corners and the stand's far leg, which sits right against the trash can.
  bagPhoto.raycast = function (raycaster, hits) {
    const found: THREE.Intersection[] = [];
    THREE.Mesh.prototype.raycast.call(this, raycaster, found);
    const image = bagTex.image as HTMLImageElement | undefined;
    for (const hit of found) {
      if (!hit.uv || hit.uv.x > 0.7) continue;
      if (image?.width) {
        bagHitCtx ??= (() => {
          const el = document.createElement("canvas");
          el.width = 128;
          el.height = 128;
          const c = el.getContext("2d", { willReadFrequently: true })!;
          c.drawImage(image, 0, 0, 128, 128);
          return c;
        })();
        const px = bagHitCtx.getImageData(Math.floor(hit.uv.x * 127), Math.floor((1 - hit.uv.y) * 127), 1, 1).data;
        if (px[3] < 40) continue;
      }
      hits.push(hit);
    }
  };
  const bagShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 40),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: canvasTexture(256, 256, (c) => {
        const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
        g.addColorStop(0, "rgba(0,0,0,0.55)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, 256, 256);
      }),
    }),
  );
  bagShadow.rotation.x = -Math.PI / 2;
  bagShadow.scale.set(1.15, 0.45, 1);
  bagShadow.position.set(-2.23, 0.01, -0.86);
  scene.add(bagShadow);

  // Irons, hybrid and driver: cutout heads on 3D graphite shafts
  const graphite = mat(0x17181b, 0.34);
  const headPhoto = (url: string) => {
    const tex = new THREE.TextureLoader().load(url, () => {
      tex.needsUpdate = true;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.7,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 0.38,
      color: 0xa6a6a6,
    });
  };
  const ironHeads = [
    { url: iron1Url, aspect: 1.076, hosel: 0.931 },
    { url: iron2Url, aspect: 1.087, hosel: 0.941 },
    { url: iron3Url, aspect: 1.041, hosel: 0.946 },
  ].map((h) => ({ ...h, material: headPhoto(h.url) }));
  const iron = (kind: number, x: number, z: number, top: number) => {
    const photo = ironHeads[kind];
    const club = new THREE.Group();
    club.position.set(x, 0.95, z);
    club.rotation.z = -x * 0.3;
    const rise = top - 0.95;
    club.add(cyl(0.0052, 0.0052, rise + 0.1, graphite, [0, (rise - 0.1) / 2, 0], 12));
    const pivot = new THREE.Group();
    pivot.position.y = rise - 0.004;
    pivot.rotation.set(0, -0.12, 0.22);
    const height = 0.094;
    const width = height * photo.aspect;
    const head = new THREE.Mesh(new THREE.PlaneGeometry(width, height), photo.material);
    head.position.set((0.5 - photo.hosel) * width, height / 2, z * 0.02);
    pivot.add(head);
    club.add(pivot);
    golfTurn.add(club);
  };
  iron(0, -0.095, 0.03, 1.095);
  iron(1, -0.03, 0.03, 1.105);
  iron(2, 0.035, 0.03, 1.115);
  iron(0, 0.1, 0.03, 1.125);
  iron(1, -0.06, 0.09, 1.04);
  iron(2, 0.005, 0.09, 1.05);
  iron(1, 0.07, 0.09, 1.06);

  const longClub = (x: number, z: number, top: number, url: string, height: number, aspect: number, hosel: number) => {
    const club = new THREE.Group();
    club.position.set(x, 0.95, z);
    club.rotation.set(0, 0, -x * 0.5);
    const rise = top - 0.95;
    club.add(cyl(0.0062, 0.0062, rise + 0.1, graphite, [0, (rise - 0.1) / 2, 0], 12));
    const width = height * aspect;
    const head = new THREE.Mesh(new THREE.PlaneGeometry(width, height), headPhoto(url));
    head.position.set((0.5 - hosel) * width, rise + height / 2 - 0.005, 0.02);
    head.rotation.y = -0.2;
    club.add(head);
    golfTurn.add(club);
  };
  longClub(0.05, -0.08, 1.2, driverHeadUrl, 0.19, 0.785, 0.617);
  longClub(-0.085, -0.075, 1.17, hybridHeadUrl, 0.15, 0.54, 0.452);

  // Framed University of Iowa diploma on the wall
  const degreeG = group("degree", [-1.12, 2.02, -1.57]);
  degreeG.add(box(0.78, 0.62, 0.035, mat(0x121214, 0.35)));
  degreeG.add(box(0.735, 0.575, 0.01, mat(COLORS.brass, 0.3, 0.85), [0, 0, 0.016]));
  const degreeTex = new THREE.TextureLoader().load(degreeUrl, () => {
    degreeTex.needsUpdate = true;
  });
  degreeTex.colorSpace = THREE.SRGBColorSpace;
  degreeTex.anisotropy = 8;
  const degreeFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.71, 0.55),
    wallArt(degreeTex),
  );
  degreeFace.position.z = 0.0225;
  degreeG.add(degreeFace);

  // Collectible model car on a small display plinth
  const carG = group("car", [shelfX + 0.27, 2.2, -1.29]);
  carG.add(box(0.44, 0.016, 0.2, walnutDark, [0, 0.008, 0]));
  carG.add(box(0.1, 0.008, 0.002, brass, [0, 0.008, 0.1015]));
  const f1 = buildF1Car(scene.environment);
  f1.scale.setScalar(0.074);
  f1.position.set(0.012, 0.016, 0);
  f1.rotation.y = Math.PI + 0.42;
  carG.add(f1);
  carG.scale.setScalar(0.72);

  // Rudy, sitting on the rug. A cutout that faces the room's camera, with a soft shadow under him.
  const dogG = group("dog", [-1.14, 0.016, 0.74]);
  dogG.rotation.y = 0.2;
  const RUDY_H = 0.66;
  const RUDY_W = RUDY_H * 0.469;
  const dogShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(RUDY_W * 0.86, 0.34),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 128, (c) => {
        const g = c.createRadialGradient(128, 64, 8, 128, 64, 120);
        g.addColorStop(0, "rgba(0,0,0,0.55)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.setTransform(1, 0, 0, 0.5, 0, 32);
        c.fillStyle = g;
        c.fillRect(0, -64, 256, 256);
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  dogShadow.rotation.x = -Math.PI / 2;
  dogShadow.position.set(-RUDY_W * 0.04, 0.002, 0);
  dogShadow.raycast = () => undefined;
  dogG.add(dogShadow);
  // Pivots at his feet so he can give a small nod when the vacuum bumps him.
  const dogHeadPivot = new THREE.Group();
  dogG.add(dogHeadPivot);
  const rudyTex = new THREE.TextureLoader().load(rudyUrl, () => {
    rudyTex.needsUpdate = true;
  });
  rudyTex.colorSpace = THREE.SRGBColorSpace;
  rudyTex.anisotropy = 8;
  const rudyMat = wallArt(rudyTex);
  rudyMat.transparent = true;
  rudyMat.alphaTest = 0.35;
  const rudy = new THREE.Mesh(new THREE.PlaneGeometry(RUDY_W, RUDY_H), rudyMat);
  rudy.position.y = RUDY_H / 2;
  dogHeadPivot.add(rudy);

  // A robot vacuum that wanders in, bumps Rudy's nose, and turns back
  const roomba = new THREE.Group();
  const floorPath = (pts: [number, number][]) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const ROOMBA_IN = floorPath([[3.5, 0.9], [2.4, 0.6], [1.7, 1.0], [0.95, 0.62], [1.2, 0.42], [0.45, 0.42], [0.15, 0.95], [-0.15, 0.68], [0.1, 0.5], [-0.4, 0.47]]);
  const ROOMBA_OUT = floorPath([[-0.22, 0.47], [0.3, 0.82], [1.1, 0.5], [1.9, 0.92], [3.5, 0.7]]);
  const ROOMBA_END = 25;
  const roombaAt = new THREE.Vector3();
  const roombaDir = new THREE.Vector3();
  const place2 = (path: THREE.CatmullRomCurve3) => {
    const d = path.getTangentAt(0);
    return Math.atan2(-d.z, d.x);
  };
  roomba.position.set(3.5, 0.012, 0.9);
  roomba.visible = false;
  roomba.add(cyl(0.165, 0.17, 0.05, mat(0x1b1d20, 0.42, 0.25), [0, 0.03, 0], 48));
  roomba.add(cyl(0.128, 0.128, 0.004, mat(0x33373c, 0.3, 0.45), [0, 0.057, 0], 48));
  roomba.add(cyl(0.05, 0.05, 0.005, mat(0x8e959b, 0.3, 0.7), [0, 0.06, 0], 28));
  const roombaLed = cyl(0.011, 0.011, 0.004, new THREE.MeshBasicMaterial({ color: 0x57e38a }), [0.08, 0.06, 0], 14);
  roomba.add(roombaLed);
  const roombaBumper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.173, 0.173, 0.028, 40, 1, true, Math.PI / 2 - 1.1 + Math.PI / 2 - Math.PI / 2, 2.2),
    mat(0x4a4f55, 0.4, 0.3),
  );
  roombaBumper.position.y = 0.028;
  roomba.add(roombaBumper);
  roomba.traverse((o) => {
    o.castShadow = true;
    o.raycast = () => undefined;
  });
  scene.add(roomba);

  // Chess set lying flat on the bookshelf, mid-game
  const chessG = group("chess", [shelfX - 0.06, 1.16, -1.39]);
  const chessTilt = new THREE.Group();
  chessTilt.position.set(0, 0.018, 0);
  chessTilt.rotation.x = -Math.PI / 2;
  chessG.rotation.y = 0.22;
  chessG.add(chessTilt);
  const boardTex = canvasTexture(512, 512, (c) => {
    c.fillStyle = "#3a2214";
    c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        c.fillStyle = (x + y) % 2 ? "#6b3f22" : "#e4cfa6";
        c.fillRect(16 + x * 60, 16 + y * 60, 60, 60);
      }
    }
  });
  const bw = 0.32;
  chessTilt.add(mesh(new RoundedBoxGeometry(bw + 0.022, bw + 0.022, 0.034, 3, 0.006), mat(COLORS.walnutDark, 0.35)));
  const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(bw, bw), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.45 }));
  boardFace.position.z = 0.0175;
  chessTilt.add(boardFace);
  const ivory = mat(0xece4d2, 0.32);
  const ebony = mat(0x17140f, 0.26);
  const piece = (kind: "p" | "r" | "n" | "b" | "q" | "k", light: boolean, file: number, rank: number) => {
    const h = { p: 0.034, r: 0.04, n: 0.042, b: 0.046, q: 0.052, k: 0.056 }[kind];
    const m = light ? ivory : ebony;
    const g = new THREE.Group();
    const sq = (bw * (480 / 512)) / 8;
    g.position.set((file - 3.5) * sq, (rank - 3.5) * sq, 0.0175);
    g.rotation.x = Math.PI / 2;
    g.scale.setScalar(1.35);
    const prof = [[0.014, 0], [0.0135, 0.004], [0.008, 0.008], [0.0055, h * 0.72], [0.0085, h * 0.76], [0.0055, h * 0.8]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    );
    g.add(mesh(new THREE.LatheGeometry(prof, 18), m));
    if (kind === "r") g.add(cyl(0.008, 0.007, 0.008, m, [0, h * 0.88, 0], 14));
    else if (kind === "n") g.add(box(0.012, 0.012, 0.006, m, [0.002, h * 0.9, 0]));
    else g.add(mesh(new THREE.SphereGeometry(kind === "p" ? 0.0065 : 0.0058, 14, 10), m, [0, h * 0.88, 0]));
    if (kind === "k") {
      g.add(box(0.003, 0.012, 0.003, m, [0, h * 1.03, 0]));
      g.add(box(0.009, 0.003, 0.003, m, [0, h * 1.04, 0]));
    }
    chessTilt.add(g);
  };
  (
    [
      ["k", true, 6, 0], ["q", true, 3, 2], ["r", true, 0, 0], ["n", true, 5, 2], ["p", true, 4, 3], ["p", true, 3, 3], ["p", true, 6, 1], ["p", true, 7, 1],
      ["k", false, 2, 7], ["q", false, 3, 5], ["r", false, 7, 7], ["b", false, 2, 4], ["p", false, 4, 4], ["p", false, 1, 6], ["p", false, 2, 6],
    ] as ["p" | "r" | "n" | "b" | "q" | "k", boolean, number, number][]
  ).forEach(([kind, light, file, rank]) => piece(kind, light, file, rank));

  // Wall clock, set to the visitor's own time
  const clockG = new THREE.Group();
  clockG.position.set(0.2, 2.5, -1.59);
  clockG.scale.setScalar(1.14);
  scene.add(clockG);
  const clockRim = cyl(0.215, 0.215, 0.04, mat(COLORS.brass, 0.28, 0.9), [0, 0, 0.02], 64);
  clockRim.rotation.x = Math.PI / 2;
  clockG.add(clockRim);
  const clockDial = canvasTexture(1024, 1024, (c) => {
    c.fillStyle = "#efeadb";
    c.fillRect(0, 0, 1024, 1024);
    c.translate(512, 512);
    c.fillStyle = "#000000";
    for (let i = 0; i < 60; i++) {
      c.save();
      c.rotate((i / 60) * Math.PI * 2);
      if (i % 5 === 0) c.fillRect(-11, -496, 22, 58);
      else c.fillRect(-3, -496, 6, 22);
      c.restore();
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "800 158px Helvetica, Arial, sans-serif";
    for (const i of [3, 6, 9, 12]) {
      const a = (i / 12) * Math.PI * 2;
      c.fillText(String(i), Math.sin(a) * 332, -Math.cos(a) * 332 + 8);
    }
  });
  clockDial.anisotropy = 8;
  const clockFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.195, 64),
    new THREE.MeshBasicMaterial({ map: clockDial }),
  );
  clockFace.position.z = 0.041;
  clockG.add(clockFace);
  const clockHand = (len: number, width: number, color: number, z: number) => {
    const hand = new THREE.Group();
    hand.position.z = z;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.003), new THREE.MeshBasicMaterial({ color }));
    blade.position.y = len / 2 - 0.02;
    hand.add(blade);
    clockG.add(hand);
    return hand;
  };
  const hourHand = clockHand(0.115, 0.021, 0x0f0e0b, 0.045);
  const minuteHand = clockHand(0.17, 0.013, 0x0f0e0b, 0.049);
  const secondHand = clockHand(0.178, 0.004, 0xb3261e, 0.053);
  const clockPin = cyl(0.008, 0.008, 0.012, mat(COLORS.brass, 0.3, 0.9), [0, 0, 0.052], 16);
  clockPin.rotation.x = Math.PI / 2;
  clockG.add(clockPin);

  // Wooden artist's mannequin on the wall shelf. Click him to change his pose.
  const figureG = group("mannequin", [0.0, 1.945, -1.45]);
  figureG.rotation.y = 0.45;
  figureG.scale.setScalar(0.92);
  const wood = mat(0xdfb981, 0.5);
  const woodDark = mat(0xcfa469, 0.5);
  const part = (r: number, len: number, parent: THREE.Object3D, y: number, m = wood) => {
    const p = mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m, [0, y, 0]);
    parent.add(p);
    return p;
  };
  const joint = (r: number, parent: THREE.Object3D, pos: Pos) => {
    parent.add(mesh(new THREE.SphereGeometry(r, 14, 10), woodDark, pos));
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    return g;
  };
  figureG.add(cyl(0.045, 0.05, 0.012, wood, [0, 0.006, 0], 28));
  figureG.add(cyl(0.0018, 0.0018, 0.16, mat(0xc4c8cc, 0.3, 0.9), [0, 0.09, -0.016], 8));
  const body = new THREE.Group();
  body.position.set(0, 0.165, 0);
  figureG.add(body);
  const hips = mesh(new THREE.SphereGeometry(0.025, 16, 12), wood, [0, 0, 0]);
  hips.scale.set(1, 0.7, 0.7);
  body.add(hips);
  for (const side of [-1, 1]) {
    const hip = joint(0.0085, body, [side * 0.014, -0.014, 0]);
    part(0.0078, 0.052, hip, -0.036);
    const knee = joint(0.0075, hip, [0, -0.074, 0]);
    part(0.0065, 0.052, knee, -0.034);
    const foot = mesh(new THREE.SphereGeometry(0.012, 12, 8), wood, [0, -0.066, 0.008]);
    foot.scale.set(0.8, 0.5, 1.5);
    knee.add(foot);
  }
  body.add(mesh(new THREE.SphereGeometry(0.009, 12, 8), woodDark, [0, 0.026, 0]));
  const chest = mesh(new THREE.SphereGeometry(0.028, 18, 14), wood, [0, 0.07, 0]);
  chest.scale.set(1, 1.45, 0.62);
  body.add(chest);
  body.add(cyl(0.0042, 0.005, 0.02, woodDark, [0, 0.118, 0], 10));
  const head = mesh(new THREE.SphereGeometry(0.0195, 18, 14), wood, [0, 0.145, 0.002]);
  head.scale.set(0.85, 1.2, 0.95);
  body.add(head);
  const arms = [-1, 1].map((side) => {
    const shoulder = joint(0.0072, body, [side * 0.034, 0.098, 0]);
    part(0.0058, 0.042, shoulder, -0.028);
    const elbow = joint(0.0058, shoulder, [0, -0.058, 0]);
    part(0.0048, 0.04, elbow, -0.026);
    const hand = mesh(new THREE.SphereGeometry(0.0078, 12, 8), wood, [0, -0.055, 0]);
    hand.scale.set(0.7, 1.35, 0.4);
    elbow.add(hand);
    return { shoulder, elbow, side };
  });
  // Each pose: left shoulder, left elbow, right shoulder, right elbow, head turn
  const POSES = [
    [0.25, 0.3, 2.3, 0.7, 0.3],
    [3.0, 0.2, 3.0, -0.2, 0],
    [0.5, 1.9, 0.5, 1.9, -0.25],
    [2.2, 1.2, 0.2, 0.2, 0.4],
  ];
  let poseIndex = 0;
  const poseNow = [...POSES[0]];

  // Pale wooden ladder leaning on the wall past the bookshelf, with a rust throw over a rung
  const ladderG = new THREE.Group();
  ladderG.position.set(4.28, 0, -1.31);
  ladderG.rotation.x = -0.1;
  scene.add(ladderG);
  const ladderWood = mat(0xd9c49a, 0.72);
  for (const x of [-0.27, 0.27]) ladderG.add(cyl(0.03, 0.034, 2.5, ladderWood, [x, 1.25, 0], 12));
  for (let i = 0; i < 6; i++) {
    const rung = cyl(0.02, 0.02, 0.56, ladderWood, [0, 0.36 + i * 0.4, 0], 10);
    rung.rotation.z = Math.PI / 2;
    ladderG.add(rung);
  }
  const throwTex = canvasTexture(384, 1024, (c) => {
    c.clearRect(0, 0, 384, 1024);
    c.fillStyle = "#a33a1c";
    c.fillRect(0, 44, 384, 936);
    // Soft colour drift, then a fine woven texture, both running down the cloth
    for (let x = 0; x < 384; x += 3) {
      const v = Math.sin(x / 19) + Math.sin(x / 7 + 1) * 0.4;
      c.fillStyle = v > 0 ? `rgba(214,92,46,${v * 0.12})` : `rgba(62,14,6,${-v * 0.16})`;
      c.fillRect(x, 44, 3, 936);
    }
    for (let i = 0; i < 9000; i++) {
      c.fillStyle = i % 2 ? "rgba(255,190,140,0.09)" : "rgba(40,8,3,0.12)";
      c.fillRect(((i * 7919) % 3840) / 10, 44 + ((i * 104729) % 9360) / 10, 1.5, 7);
    }
    for (const y of [70, 954]) {
      c.fillStyle = "#6e1f0e";
      c.fillRect(0, y, 384, 7);
    }
    c.strokeStyle = "#b5481f";
    c.lineWidth = 4;
    for (let x = 4; x < 384; x += 10) {
      const sway = Math.sin(x) * 5;
      c.beginPath();
      c.moveTo(x, 46);
      c.lineTo(x + sway, 6 + (x % 7) * 2);
      c.moveTo(x, 978);
      c.lineTo(x + sway, 1018 - (x % 7) * 2);
      c.stroke();
    }
  });
  throwTex.anisotropy = 8;
  // A cloth folded over one rung: a short tail behind, the long side in front, gathered at the top
  const RUNG_Y = 1.96;
  const LAP = 0.036;
  const BACK = 0.62;
  const ARC = Math.PI * LAP;
  const FRONT = 1.02;
  const LENGTH = BACK + ARC + FRONT;
  const throwGeo = new THREE.PlaneGeometry(1, 1, 30, 150);
  const throwPos = throwGeo.attributes.position;
  const throwUv = throwGeo.attributes.uv;
  for (let i = 0; i < throwPos.count; i++) {
    const u = throwPos.getX(i) + 0.5;
    const along = (throwPos.getY(i) + 0.5) * LENGTH;
    let y: number;
    let z: number;
    if (along < BACK) {
      y = RUNG_Y - (BACK - along);
      z = -LAP;
    } else if (along < BACK + ARC) {
      const a = Math.PI * (1 - (along - BACK) / ARC);
      y = RUNG_Y + Math.sin(a) * LAP;
      z = Math.cos(a) * LAP;
    } else {
      y = RUNG_Y - (along - BACK - ARC);
      z = LAP;
    }
    const drop = Math.abs(y - RUNG_Y);
    const open = Math.min(1, drop / 0.34);
    const x = (u - 0.5) * 0.36 * (0.66 + 0.34 * open);
    const side = z >= 0 ? 1 : -1;
    const fold = Math.sin(u * 19) * 0.62 + Math.sin(u * 41 + 1.2) * 0.26 + Math.sin(u * 8 + drop * 2.4) * 0.34;
    throwPos.setXYZ(i, x, y, z + side * (0.006 + open * (0.016 + fold * 0.015)));
    throwUv.setXY(i, u, along / LENGTH);
  }
  throwGeo.computeVertexNormals();
  const drape = new THREE.Mesh(throwGeo, new THREE.MeshStandardMaterial({ map: throwTex, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }));
  drape.position.x = 0.04;
  drape.castShadow = true;
  ladderG.add(drape);

  // Bottle of pinot and two empty glasses on the bookshelf
  const wineG = group("wine", [shelfX - 0.21, 1.68, -1.38]);
  const lathePts = (pts: [number, number][]) =>
    new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(70);
  const bottleGlass = mat(0x10180f, 0.14, 0.2);
  wineG.add(
    mesh(
      new THREE.LatheGeometry(
        lathePts([[0, 0], [0.036, 0], [0.04, 0.008], [0.04, 0.19], [0.036, 0.215], [0.018, 0.25], [0.0135, 0.27], [0.0135, 0.335]]),
        40,
      ),
      bottleGlass,
    ),
  );
  wineG.add(cyl(0.0145, 0.0145, 0.07, mat(0x7a1f1c, 0.35, 0.3), [0, 0.312, 0], 24));
  wineG.add(cyl(0.0148, 0.0148, 0.004, mat(0x5e1412, 0.4), [0, 0.279, 0], 24));
  const wineLabelTex = canvasTexture(520, 340, (c) => {
    c.fillStyle = "#e8dfc4";
    c.fillRect(0, 0, 520, 340);
    c.strokeStyle = "#8a6a2a";
    c.lineWidth = 4;
    c.strokeRect(16, 16, 488, 308);
    c.fillStyle = "#2b2418";
    c.textAlign = "center";
    c.font = "700 66px Georgia, serif";
    c.fillText("Caliveda", 260, 150);
    c.font = "400 30px Georgia, serif";
    c.fillText("California Pinot Noir", 260, 214);
  });
  const wineLabel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0408, 0.0408, 0.1, 40, 1, true, -1.1, 2.2),
    new THREE.MeshStandardMaterial({ map: wineLabelTex, roughness: 0.75 }),
  );
  wineLabel.position.y = 0.1;
  wineG.add(wineLabel);
  const stemGlass = new THREE.MeshStandardMaterial({
    color: 0xdfeee9,
    roughness: 0.06,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wineGlass = new THREE.LatheGeometry(
    lathePts([[0.03, 0], [0.012, 0.004], [0.0035, 0.012], [0.003, 0.085], [0.016, 0.1], [0.033, 0.13], [0.036, 0.16], [0.03, 0.2]]),
    32,
  );
  for (const [x, z, turn] of [[0.105, 0.03, 0], [0.185, -0.015, 1.2]]) {
    const g = new THREE.Mesh(wineGlass, stemGlass);
    g.raycast = () => undefined;
    g.position.set(x, 0, z);
    g.rotation.y = turn;
    g.renderOrder = 2;
    wineG.add(g);
  }

  // Pencil cup on the bookshelf holding three small flags
  const flagCup = new THREE.Group();
  flagCup.position.set(0.9, 1.945, -1.43);
  scene.add(flagCup);
  flagCup.add(cyl(0.05, 0.044, 0.105, mat(0x1d1f22, 0.45, 0.35), [0, 0.0525, 0], 32));
  flagCup.add(cyl(0.05, 0.05, 0.004, mat(COLORS.brass, 0.3, 0.8), [0, 0.104, 0], 32));
  const flagArt: ((c: CanvasRenderingContext2D) => void)[] = [
    (c) => {
      ["#009246", "#ffffff", "#ce2b37"].forEach((color, i) => {
        c.fillStyle = color;
        c.fillRect((i * 220) / 3, 0, 220 / 3 + 1, 140);
      });
    },
    (c) => {
      for (let i = 0; i < 13; i++) {
        c.fillStyle = i % 2 ? "#ffffff" : "#b22234";
        c.fillRect(0, (i * 140) / 13, 220, 140 / 13 + 1);
      }
      c.fillStyle = "#3c3b6e";
      c.fillRect(0, 0, 92, 76);
      c.fillStyle = "#ffffff";
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) c.fillRect(7 + x * 14, 7 + y * 14, 5, 5);
    },
    (c) => {
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, 220, 70);
      c.fillStyle = "#dc143c";
      c.fillRect(0, 70, 220, 70);
    },
  ];
  // Each flag is a small cloth grid. It hangs from its pole, and the wave grows when the mouse brushes past.
  const flagCloths = flagArt.map((draw, i) => {
    const stick = new THREE.Group();
    stick.position.set((i - 1) * 0.018, 0.06, (i % 2) * 0.014);
    stick.rotation.z = -(i - 1) * 0.38;
    stick.add(cyl(0.0022, 0.0022, 0.25, mat(0xc9b48a, 0.5), [0, 0.125, 0], 8));
    const side = i === 0 ? -1 : 1;
    const geometry = new THREE.PlaneGeometry(0.09, 0.062, 12, 6);
    const rest = geometry.attributes.position.array.slice();
    const material = new THREE.MeshStandardMaterial({ map: canvasTexture(220, 140, draw), roughness: 0.75, side: THREE.DoubleSide });
    const cloth = new THREE.Mesh(geometry, material);
    cloth.position.set(0, 0.215, 0);
    cloth.scale.x = side;
    stick.add(cloth);
    flagCup.add(stick);
    return { geometry, rest, stick, cloth, phase: i * 1.9, lean: stick.rotation.z };
  });
  // Flags hang perfectly still until brushed. A brush kicks each one on a damped spring so it swings
  // around its pole, ripples, and settles again.
  let flagWind = 0;
  const flagSwing = flagCloths.map(() => ({ at: 0, speed: 0 }));
  const shapeFlags = (t: number) => {
    flagCloths.forEach((f, i) => {
      const pos = f.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const u = (f.rest[v * 3] + 0.045) / 0.09;
        const y = f.rest[v * 3 + 1];
        const droop = 0.05 * u ** 1.6 * (1 - flagWind * 0.75);
        const wave = flagWind > 0.002 ? Math.sin(u * 8 - t * 15 + f.phase) * u * 0.024 * flagWind : 0;
        pos.setXYZ(v, u * 0.086 * (1 - droop * 2), y - droop, wave);
      }
      pos.needsUpdate = true;
      f.geometry.computeVertexNormals();
      f.cloth.rotation.y = flagSwing[i].at * 1.5;
      f.stick.rotation.z = f.lean + flagSwing[i].at * 0.16;
    });
  };
  const brushFlags = (push: number) => {
    flagWind = Math.min(1, flagWind + Math.abs(push) * 0.05);
    flagSwing.forEach((f, i) => {
      f.speed += THREE.MathUtils.clamp(push, -24, 24) * (0.16 + i * 0.03);
    });
  };
  let flagsMoving = false;
  let flagLast = 0;
  const flagDt = (t: number) => {
    const dt = t - flagLast;
    flagLast = t;
    return dt;
  };
  const stepFlags = (t: number, dt: number) => {
    let moving = flagWind > 0.002;
    for (const f of flagSwing) {
      f.speed += (-46 * f.at - 3.2 * f.speed) * dt;
      f.at = THREE.MathUtils.clamp(f.at + f.speed * dt, -1, 1);
      if (Math.abs(f.at) > 0.002 || Math.abs(f.speed) > 0.01) moving = true;
    }
    flagWind *= Math.exp(-1.5 * dt);
    if (moving) shapeFlags(t);
    else if (flagsMoving) {
      flagWind = 0;
      flagSwing.forEach((f) => {
        f.at = 0;
        f.speed = 0;
      });
      shapeFlags(t);
    }
    flagsMoving = moving;
  };
  shapeFlags(0);

  // The Starry Night, in its own dark wood frame, leaning on the shelf beside the wine
  const starryG = group("starry", [shelfX + 0.28, 1.68, -1.36]);
  const starryLean = new THREE.Group();
  starryLean.rotation.x = -0.17;
  starryG.add(starryLean);
  const sW = 0.45;
  const sH = sW / 1.201;
  starryLean.add(box(sW, sH, 0.022, mat(0x2a1a10, 0.5), [0, sH / 2, 0]));
  const starryTex = new THREE.TextureLoader().load(starryUrl, () => {
    starryTex.needsUpdate = true;
  });
  starryTex.colorSpace = THREE.SRGBColorSpace;
  starryTex.anisotropy = 8;
  const starryFace = new THREE.Mesh(new THREE.PlaneGeometry(sW, sH), wallArt(starryTex));
  starryFace.position.set(0, sH / 2, 0.0115);
  starryLean.add(starryFace);
  starryLean.traverse((o) => {
    o.castShadow = true;
  });

  // Rolodex of socials, beside the phone
  const rolodexG = group("rolodex", [1.2, 0.783, -0.66]);
  rolodexG.rotation.y = -0.18;
  const rolodexMetal = mat(0x1c1e21, 0.32, 0.7);
  rolodexG.add(mesh(new RoundedBoxGeometry(0.2, 0.012, 0.13, 3, 0.005), rolodexMetal, [0, 0.006, 0]));
  for (const x of [-0.088, 0.088]) {
    rolodexG.add(box(0.006, 0.09, 0.03, rolodexMetal, [x, 0.052, 0]));
    const knob = cyl(0.016, 0.016, 0.012, mat(COLORS.brass, 0.28, 0.9), [x * 1.12, 0.09, 0], 18);
    knob.rotation.z = Math.PI / 2;
    rolodexG.add(knob);
  }
  const rolodexWheel = new THREE.Group();
  rolodexWheel.position.y = 0.09;
  rolodexG.add(rolodexWheel);
  const axle = cyl(0.005, 0.005, 0.176, mat(0xc4c8cc, 0.3, 0.9), [0, 0, 0], 10);
  axle.rotation.z = Math.PI / 2;
  rolodexWheel.add(axle);
  const cardMat = mat(0xf1ead8, 0.65);
  const tabMat = mat(0x9c2c24, 0.5);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const leaf = new THREE.Group();
    leaf.rotation.x = a;
    leaf.add(box(0.15, 0.002, 0.066, cardMat, [0, 0, 0.038]));
    if (i % 5 === 0) leaf.add(box(0.03, 0.003, 0.01, tabMat, [-0.04 + (i % 3) * 0.04, 0, 0.074]));
    rolodexWheel.add(leaf);
  }

  // A big fiddle-leaf fig, the signature house plant, in a tall ribbed ceramic planter
  const cornerTree = new THREE.Group();
  cornerTree.position.set(-3.95, 0, -1.2);
  scene.add(cornerTree);
  const planter = new THREE.SplineCurve(
    ([[0, 0], [0.17, 0], [0.19, 0.02], [0.205, 0.2], [0.235, 0.46], [0.255, 0.64], [0.262, 0.68], [0.245, 0.7]] as [number, number][]).map(([r, y]) => new THREE.Vector2(r, y)),
  ).getPoints(60);
  const planterTex = canvasTexture(512, 64, (c) => {
    c.fillStyle = "#e7e0d0";
    c.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 16) {
      c.fillStyle = "rgba(120, 104, 80, 0.3)";
      c.fillRect(x, 0, 3, 64);
    }
  });
  planterTex.wrapS = THREE.RepeatWrapping;
  planterTex.repeat.x = 3;
  cornerTree.add(mesh(new THREE.LatheGeometry(planter, 60), new THREE.MeshStandardMaterial({ map: planterTex, roughness: 0.35 })));
  cornerTree.add(cyl(0.2, 0.2, 0.024, mat(COLORS.brass, 0.3, 0.85), [0, 0.012, 0], 48));
  cornerTree.add(cyl(0.262, 0.262, 0.018, mat(COLORS.brass, 0.3, 0.85), [0, 0.692, 0], 48));
  cornerTree.add(cyl(0.242, 0.242, 0.01, mat(0x2a1d13, 1), [0, 0.695, 0], 40));
  const figTrunk = new THREE.CatmullRomCurve3([[0, 0.69, 0], [0.03, 1.1, 0.012], [-0.022, 1.55, -0.012], [0.028, 2.0, 0.01], [0.0, 2.46, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  cornerTree.add(mesh(new THREE.TubeGeometry(figTrunk, 44, 0.031, 10), mat(0x6e5a44, 0.9)));
  const figRand = (n: number) => {
    const v = Math.sin(n * 73.91 + 2.3) * 43758.5453;
    return v - Math.floor(v);
  };
  const FIG_LEAVES = 150;
  const figLeaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ roughness: 0.36 }), FIG_LEAVES);
  const figPose = new THREE.Object3D();
  const figColor = new THREE.Color();
  for (let i = 0; i < FIG_LEAVES; i++) {
    const v = i / (FIG_LEAVES - 1);
    const a = i * 2.399;
    const at = figTrunk.getPointAt(0.28 + v * 0.72);
    const reach = (0.17 + figRand(i) * 0.3) * (1.15 - v * 0.55);
    const size = (0.17 + figRand(i + 40) * 0.08) * (1.15 - v * 0.3);
    figPose.position.set(at.x + Math.cos(a) * reach, at.y - 0.03 + figRand(i + 7) * 0.08, at.z + Math.sin(a) * reach * 0.75);
    figPose.rotation.set(0, -a, 0.5 + figRand(i + 3) * 0.6 - v * 0.8, "YXZ");
    figPose.scale.set(size, 0.008, size * 0.64);
    figPose.updateMatrix();
    figLeaves.setMatrixAt(i, figPose.matrix);
    figLeaves.setColorAt(i, figColor.setHSL(0.31 + figRand(i + 11) * 0.04, 0.55, 0.12 + figRand(i + 21) * 0.1));
  }
  figLeaves.castShadow = true;
  cornerTree.add(figLeaves);
  cornerTree.traverse((o) => {
    o.raycast = () => undefined;
  });

  // Rudy's food and water, on a beige mat against the wall
  const bowlMatTex = canvasTexture(512, 240, (c) => {
    c.fillStyle = "#b39a78";
    c.fillRect(0, 0, 512, 240);
    c.strokeStyle = "#8a7355";
    c.lineWidth = 5;
    c.setLineDash([14, 9]);
    c.beginPath();
    c.roundRect(16, 16, 480, 208, 34);
    c.stroke();
  });
  const matW = 0.62;
  const matD = 0.29;
  const matR = 0.06;
  const matShape = new THREE.Shape();
  matShape.moveTo(-matW / 2 + matR, -matD / 2);
  matShape.lineTo(matW / 2 - matR, -matD / 2);
  matShape.absarc(matW / 2 - matR, -matD / 2 + matR, matR, -Math.PI / 2, 0, false);
  matShape.lineTo(matW / 2, matD / 2 - matR);
  matShape.absarc(matW / 2 - matR, matD / 2 - matR, matR, 0, Math.PI / 2, false);
  matShape.lineTo(-matW / 2 + matR, matD / 2);
  matShape.absarc(-matW / 2 + matR, matD / 2 - matR, matR, Math.PI / 2, Math.PI, false);
  matShape.lineTo(-matW / 2, -matD / 2 + matR);
  matShape.absarc(-matW / 2 + matR, -matD / 2 + matR, matR, Math.PI, Math.PI * 1.5, false);
  const matEdge = new THREE.Mesh(new THREE.ExtrudeGeometry(matShape, { depth: 0.008, bevelEnabled: false, curveSegments: 12 }), mat(0x8a7355, 0.95));
  matEdge.rotation.x = -Math.PI / 2;
  matEdge.position.set(-3.05, 0, -1.42);
  matEdge.raycast = () => undefined;
  scene.add(matEdge);
  const matTopGeo = new THREE.ShapeGeometry(matShape, 12);
  const matPos = matTopGeo.attributes.position;
  const matUv = matTopGeo.attributes.uv;
  for (let i = 0; i < matPos.count; i++) matUv.setXY(i, matPos.getX(i) / matW + 0.5, matPos.getY(i) / matD + 0.5);
  const bowlMatTop = new THREE.Mesh(matTopGeo, new THREE.MeshStandardMaterial({ map: bowlMatTex, roughness: 0.95 }));
  bowlMatTop.rotation.x = -Math.PI / 2;
  bowlMatTop.position.set(-3.05, 0.0085, -1.42);
  bowlMatTop.receiveShadow = true;
  bowlMatTop.raycast = () => undefined;
  scene.add(bowlMatTop);
  const bowlRim = mat(0xb9bfc4, 0.28, 0.75);
  const bowl = (bx: number, bz: number, fill: THREE.Material) => {
    const g = new THREE.Group();
    g.position.set(bx, 0.009, bz);
    g.add(cyl(0.085, 0.105, 0.05, bowlRim, [0, 0.025, 0], 40));
    g.add(cyl(0.074, 0.074, 0.003, fill, [0, 0.051, 0], 36));
    scene.add(g);
    return g;
  };
  bowl(-3.2, -1.42, new THREE.MeshStandardMaterial({ color: 0x6fb2d6, roughness: 0.12, metalness: 0.1 }));
  const foodBowl = bowl(-2.9, -1.42, mat(0x4f3320, 0.9));
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4;
    const r = 0.012 + (i / 26) * 0.058;
    const piece = cyl(0.009, 0.009, 0.006, mat(i % 3 ? 0x7a5230 : 0x96683c, 0.85), [Math.cos(a) * r, 0.056, Math.sin(a) * r], 8);
    foodBowl.add(piece);
  }

  // A hint etched into the wall, pointing at the lamp
  const hintTex = canvasTexture(440, 300, (c) => {
    const etch = (dx: number, dy: number, color: string) => {
      c.save();
      c.translate(dx, dy);
      c.fillStyle = color;
      c.strokeStyle = color;
      c.font = "italic 600 80px Georgia, serif";
      c.textAlign = "center";
      c.fillText("Change", 220, 76);
      c.fillText("the Lights", 220, 156);
      c.lineWidth = 7;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(232, 186);
      c.quadraticCurveTo(262, 234, 228, 284);
      c.moveTo(204, 258);
      c.lineTo(228, 284);
      c.lineTo(252, 262);
      c.stroke();
      c.restore();
    };
    etch(2, 3, "rgba(0, 0, 0, 0.55)");
    etch(0, 0, "#d8b45a");
  });
  hintTex.anisotropy = 8;
  const hint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.33, 0.225),
    new THREE.MeshStandardMaterial({ map: hintTex, transparent: true, roughness: 0.8, depthWrite: false }),
  );
  hint.position.set(-1.1, 1.385, -1.589);
  hint.scale.setScalar(0.76);
  hint.raycast = () => undefined;
  scene.add(hint);

  // Hawkeyes pennant on the wall behind the lamp
  const pennantTex = new THREE.TextureLoader().load(pennantUrl, () => {
    pennantTex.needsUpdate = true;
  });
  pennantTex.colorSpace = THREE.SRGBColorSpace;
  pennantTex.anisotropy = 8;
  const pennant = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.68 / PENNANT_ASPECT),
    new THREE.MeshStandardMaterial({ map: pennantTex, transparent: true, alphaTest: 0.3, roughness: 0.85 }),
  );
  pennant.position.set(-1.23, 1.55, -1.588);
  pennant.rotation.z = 0.17;
  pennant.castShadow = true;
  group("pennant").add(pennant);

  // Trailing plant on the top bookshelf
  const plantG = new THREE.Group();
  plantG.position.set(shelfX - 0.53, 2.2, -1.4);
  scene.add(plantG);
  plantG.add(
    mesh(
      new THREE.LatheGeometry(
        [[0, 0], [0.05, 0], [0.056, 0.01], [0.07, 0.1], [0.074, 0.112], [0.066, 0.112], [0, 0.1]].map(([r, y]) => new THREE.Vector2(r, y)),
        36,
      ),
      mat(0xb5613c, 0.75),
    ),
  );
  const stemMat = mat(0x3f7a35, 0.6);
  const vineSway = new THREE.Group();
  vineSway.position.y = 0.105;
  plantG.add(vineSway);
  let plantSeed = 23;
  const plantRand = () => (plantSeed = (plantSeed * 16807) % 2147483647) / 2147483647;
  const leafSpots: { p: THREE.Vector3; turn: number; tilt: number; size: number; light: boolean }[] = [];
  for (let v = 0; v < 15; v++) {
    // Trailing vines arch forward past the shelf edge before dropping; the rest stay on top of the shelf.
    const a = (v / 15) * Math.PI * 2 + plantRand() * 0.4;
    const trailing = v % 3 !== 2;
    const startX = Math.cos(a) * 0.02;
    const startZ = Math.sin(a) * 0.02;
    let pts: THREE.Vector3[];
    let drop = 0.1;
    if (trailing) {
      const x = -0.13 + ((v * 7) % 15) / 15 * 0.42;
      drop = 0.2 + plantRand() * 0.36;
      pts = [
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3(x * 0.55, 0.07, 0.09),
        new THREE.Vector3(x * 0.85, 0.0, 0.2),
        new THREE.Vector3(x, -0.13, 0.245),
        new THREE.Vector3(x, -drop, 0.25),
      ];
    } else {
      const x = Math.max(-0.12, Math.cos(a) * 0.14);
      const z = Math.max(-0.1, Math.sin(a) * 0.13);
      pts = [
        new THREE.Vector3(startX, 0, startZ),
        new THREE.Vector3(x * 0.6, 0.075, z * 0.6),
        new THREE.Vector3(x, 0.02, z),
      ];
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    vineSway.add(mesh(new THREE.TubeGeometry(curve, 28, 0.0024, 6), stemMat));
    const count = 5 + Math.floor((drop + 0.2) * 16);
    for (let i = 0; i < count; i++) {
      leafSpots.push({
        p: curve.getPoint(0.1 + (i / count) * 0.9),
        turn: plantRand() * Math.PI * 2,
        tilt: 0.5 + plantRand() * 0.8,
        size: 0.018 + plantRand() * 0.012,
        light: plantRand() > 0.72,
      });
    }
  }
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  leafGeo.scale(0.72, 1.15, 0.1);
  leafGeo.translate(0, -1.05, 0);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.42 }), leafSpots.length);
  const leafDummy = new THREE.Object3D();
  const leafDark = new THREE.Color(0x2f7a38);
  const leafLight = new THREE.Color(0x7dae4b);
  leafSpots.forEach((l, i) => {
    leafDummy.position.copy(l.p);
    leafDummy.rotation.set(l.tilt * 0.5, l.turn, (l.turn - Math.PI) * 0.22);
    leafDummy.scale.setScalar(l.size);
    leafDummy.updateMatrix();
    leaves.setMatrixAt(i, leafDummy.matrix);
    leaves.setColorAt(i, l.light ? leafLight : leafDark);
  });
  leaves.castShadow = true;
  vineSway.add(leaves);

  // Little desk-side trash can
  const trashG = new THREE.Group();
  trashG.position.set(-1.58, 0, -0.68);
  scene.add(trashG);
  const trashBody = mesh(
    new THREE.LatheGeometry(
      [[0, 0], [0.095, 0], [0.1, 0.008], [0.135, 0.33], [0.135, 0.34]].map(([r, y]) => new THREE.Vector2(r, y)),
      36,
    ),
    mat(0x24332c, 0.45, 0.35),
  );
  (trashBody.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  trashG.add(trashBody);
  const trashRim = mesh(new THREE.TorusGeometry(0.135, 0.008, 10, 44), mat(COLORS.brass, 0.3, 0.9), [0, 0.34, 0]);
  trashRim.rotation.x = Math.PI / 2;
  trashG.add(trashRim);
  trashG.add(cyl(0.128, 0.128, 0.004, mat(0x0d1110, 0.8), [0, 0.3, 0], 32));

  // Wall rack of ten logo golf balls
  const ballsG = group("balls", [1.79, 1.27, -1.59])
  ballsG.scale.setScalar(0.92);;
  ballsG.add(box(0.74, 0.32, 0.03, mat(COLORS.walnutDark, 0.42), [0, 0, 0.015]));
  ballsG.add(box(0.7, 0.28, 0.006, mat(0x123a2d, 0.8), [0, 0, 0.032]));
  const dimples = canvasTexture(256, 128, (c) => {
    c.fillStyle = "#f6f4ee";
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = "rgba(170,170,160,0.35)";
    for (let y = 4; y < 128; y += 8) {
      for (let x = (y % 16 ? 0 : 4); x < 256; x += 8) {
        c.beginPath();
        c.arc(x, y, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }
  });
  const ballMat = new THREE.MeshStandardMaterial({ map: dimples, roughness: 0.38 });
  const ballBrass = mat(COLORS.brass, 0.3, 0.9);
  for (let i = 0; i < 10; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = -0.272 + col * 0.136;
    const y = row ? -0.075 : 0.065;
    ballsG.add(box(0.075, 0.008, 0.05, ballBrass, [x, y - 0.042, 0.055]));
    ballsG.add(mesh(new THREE.SphereGeometry(0.04, 22, 16), ballMat, [x, y, 0.07]));
    // The logo wraps the front of the ball as a shallow cap
    const logoGeo = new THREE.SphereGeometry(0.0404, 28, 12, 0, Math.PI * 2, 0, 0.95);
    logoGeo.rotateX(Math.PI / 2);
    const logoPos = logoGeo.attributes.position;
    const logoUv = logoGeo.attributes.uv;
    const reach = 0.0404 * Math.sin(0.95);
    for (let v = 0; v < logoPos.count; v++) {
      logoUv.setXY(v, 0.5 + logoPos.getX(v) / (2 * reach), 0.5 + logoPos.getY(v) / (2 * reach));
    }
    const logoTex = new THREE.TextureLoader().load(COURSES[i].logo, () => {
      logoTex.needsUpdate = true;
    });
    logoTex.colorSpace = THREE.SRGBColorSpace;
    logoTex.anisotropy = 8;
    const logo = new THREE.Mesh(logoGeo, new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.38 }));
    logo.position.set(x, y, 0.07);
    ballsG.add(logo);
  }

  // Canon camera on the bookshelf
  const cameraG = group("camera", [shelfX - 0.53, 0.64, -1.37]);
  cameraG.rotation.y = 0.32;
  const camBlack = mat(0x141517, 0.5, 0.15);
  const camMetal = mat(0x2a2c30, 0.3, 0.6);
  cameraG.add(mesh(new RoundedBoxGeometry(0.25, 0.15, 0.085, 4, 0.016), camBlack, [0, 0.075, 0]));
  cameraG.add(mesh(new RoundedBoxGeometry(0.06, 0.15, 0.1, 4, 0.02), camBlack, [-0.1, 0.076, 0.01]));
  cameraG.add(mesh(new RoundedBoxGeometry(0.1, 0.04, 0.08, 3, 0.012), camBlack, [0.01, 0.164, 0]));
  cameraG.add(cyl(0.012, 0.012, 0.01, mat(0xc1121c, 0.4), [-0.1, 0.156, 0.01], 14));
  cameraG.add(cyl(0.016, 0.016, 0.012, camMetal, [0.09, 0.156, 0], 18));
  const lensRoot = new THREE.Group();
  lensRoot.position.set(0.02, 0.075, 0.042);
  lensRoot.rotation.x = Math.PI / 2;
  cameraG.add(lensRoot);
  lensRoot.add(cyl(0.056, 0.058, 0.03, camMetal, [0, 0.015, 0], 36));
  lensRoot.add(cyl(0.05, 0.054, 0.05, camBlack, [0, 0.055, 0], 36));
  lensRoot.add(cyl(0.0525, 0.0525, 0.003, mat(0xc1121c, 0.4), [0, 0.032, 0], 36));
  lensRoot.add(cyl(0.05, 0.05, 0.022, camMetal, [0, 0.09, 0], 36));
  lensRoot.add(cyl(0.04, 0.04, 0.002, mat(0x0a1422, 0.08, 0.6), [0, 0.101, 0], 32));
  const camBadge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.072, 0.024),
    new THREE.MeshBasicMaterial({
      transparent: true,
      map: canvasTexture(216, 72, (c) => {
        c.clearRect(0, 0, 216, 72);
        c.fillStyle = "#f2f2ee";
        c.textAlign = "center";
        c.font = 'italic 700 54px Georgia, "Times New Roman", serif';
        c.fillText("Canon", 108, 54);
      }),
    }),
  );
  camBadge.position.set(0.012, 0.128, 0.0432);
  cameraG.add(camBadge);

  // Hidden strongbox under a loose floor plank
  const stashG = group("stash", [0, 0, 0]);
  const hw = HATCH.x1 - HATCH.x0;
  const hd = HATCH.z1 - HATCH.z0;
  const hx = (HATCH.x0 + HATCH.x1) / 2;
  const hz = (HATCH.z0 + HATCH.z1) / 2;
  const pit = new THREE.Mesh(new THREE.BoxGeometry(hw, 0.34, hd), new THREE.MeshStandardMaterial({ color: 0x1a120b, side: THREE.BackSide, roughness: 1 }));
  pit.position.set(hx, -0.17, hz);
  scene.add(pit);
  // Banded cash, gold and a passport. Prop artwork only, not a copy of any real note.
  const billArt = (o: { paper: [string, string]; ink: string; line: string; denom: string; name: string; art: "bust" | "arch" | "tower" | "bridge" }) => {
    const tex = canvasTexture(712, 304, (c) => {
      const W = 712;
      const H = 304;
      const paper = c.createLinearGradient(0, 0, W, H);
      paper.addColorStop(0, o.paper[0]);
      paper.addColorStop(1, o.paper[1]);
      c.fillStyle = paper;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = o.line;
      c.lineWidth = 1;
      for (let y = 8; y < H; y += 5) {
        c.beginPath();
        for (let x = 0; x <= W; x += 12) c.lineTo(x, y + Math.sin(x / 34 + y / 19) * 2.4);
        c.stroke();
      }
      c.strokeStyle = o.ink;
      c.lineWidth = 5;
      c.strokeRect(16, 16, W - 32, H - 32);
      c.lineWidth = 1.5;
      c.strokeRect(25, 25, W - 50, H - 50);
      c.fillStyle = "rgba(255, 255, 255, 0.22)";
      c.beginPath();
      c.ellipse(W / 2, H / 2, 92, 112, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = o.line;
      c.lineWidth = 1.4;
      for (let r = 58; r < 112; r += 5) {
        c.beginPath();
        c.ellipse(W / 2, H / 2, r * 0.82, r, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = o.ink;
      c.strokeStyle = o.ink;
      c.lineWidth = 5;
      if (o.art === "bust") {
        c.beginPath();
        c.ellipse(W / 2, H / 2 - 22, 36, 44, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(W / 2 - 74, H / 2 + 92);
        c.quadraticCurveTo(W / 2 - 62, H / 2 + 30, W / 2, H / 2 + 22);
        c.quadraticCurveTo(W / 2 + 62, H / 2 + 30, W / 2 + 74, H / 2 + 92);
        c.fill();
      } else if (o.art === "arch") {
        for (const dx of [-52, 0, 52]) {
          c.beginPath();
          c.moveTo(W / 2 + dx - 22, H / 2 + 62);
          c.lineTo(W / 2 + dx - 22, H / 2 - 22);
          c.arc(W / 2 + dx, H / 2 - 22, 22, Math.PI, 0);
          c.lineTo(W / 2 + dx + 22, H / 2 + 62);
          c.stroke();
        }
      } else if (o.art === "tower") {
        c.fillRect(W / 2 - 18, H / 2 - 66, 36, 136);
        c.beginPath();
        c.moveTo(W / 2 - 28, H / 2 - 66);
        c.lineTo(W / 2, H / 2 - 104);
        c.lineTo(W / 2 + 28, H / 2 - 66);
        c.fill();
      } else {
        c.beginPath();
        c.arc(W / 2, H / 2 + 92, 86, Math.PI, 0);
        c.moveTo(W / 2 - 96, H / 2 + 52);
        c.lineTo(W / 2 + 96, H / 2 + 52);
        c.stroke();
      }
      c.fillStyle = o.ink;
      c.textAlign = "center";
      c.font = "700 50px Georgia, serif";
      c.fillText(o.denom, 104, 78);
      c.fillText(o.denom, W - 104, 78);
      c.fillText(o.denom, 104, H - 40);
      c.fillText(o.denom, W - 104, H - 40);
      c.font = "600 22px Georgia, serif";
      c.fillText(o.name, 150, H / 2 + 8);
    });
    tex.anisotropy = 8;
    return tex;
  };
  const billTextures = [
    billArt({ paper: ["#b4c2a6", "#b9c2a0"], ink: "#2f4a3c", line: "rgba(52, 84, 66, 0.2)", denom: "100", name: "DOLLARS", art: "bust" }),
    billArt({ paper: ["#dcae74", "#cf9457"], ink: "#6e3d12", line: "rgba(110, 61, 18, 0.2)", denom: "€50", name: "EURO", art: "arch" }),
    billArt({ paper: ["#b5906e", "#a37e5c"], ink: "#452713", line: "rgba(69, 39, 19, 0.22)", denom: "200", name: "FRANCS", art: "tower" }),
  ];
  const edgeTex = canvasTexture(64, 64, (c) => {
    for (let y = 0; y < 64; y += 2) {
      c.fillStyle = y % 4 ? "#e9ebdc" : "#a7b39b";
      c.fillRect(0, y, 64, 2);
    }
  });
  const billTops = billTextures.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.82 }));
  const billSide = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 });
  const bandMat = mat(0xc79a3a, 0.68);
  const billGeo = new THREE.BoxGeometry(0.17, 0.05, 0.075);
  const stashLoose = new THREE.Group();
  stashG.add(stashLoose);
  const stack = (x: number, y: number, z: number, turn: number, tilt = 0, loose = false, kind = 0) => {
    const b = new THREE.Mesh(billGeo, [billSide, billSide, billTops[kind], billSide, billSide, billSide]);
    b.position.set(x, y, z);
    b.rotation.set(tilt, turn, tilt * 0.6);
    b.castShadow = true;
    (loose ? stashLoose : stashG).add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.052, 0.077), bandMat);
    b.add(band);
  };
  // A fitted strongbox set into the floor, with felt-lined compartments
  const tray = -0.1;
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(hw, hd), mat(0x17382c, 0.95));
  felt.rotation.x = -Math.PI / 2;
  felt.position.set(hx, tray, hz);
  stashLoose.add(felt);
  const steel = mat(0x8d9299, 0.36, 0.75);
  const brassTrim = mat(COLORS.brass, 0.35, 0.8);
  for (const z of [HATCH.z0 + 0.006, HATCH.z1 - 0.006]) stashLoose.add(box(hw, 0.102, 0.012, steel, [hx, tray + 0.051, z]));
  for (const x of [HATCH.x0 + 0.006, HATCH.x1 - 0.006]) stashLoose.add(box(0.012, 0.102, hd, steel, [x, tray + 0.051, hz]));
  for (const z of [HATCH.z0 + 0.012, HATCH.z1 - 0.012]) stashLoose.add(box(hw, 0.004, 0.012, brassTrim, [hx, -0.003, z]));
  for (const x of [HATCH.x0 + 0.012, HATCH.x1 - 0.012]) stashLoose.add(box(0.012, 0.004, hd, brassTrim, [x, -0.003, hz]));
  for (const x of [0.215, 0.415, 0.615, 0.83]) stashLoose.add(box(0.01, 0.075, hd - 0.02, mat(0x4a2c18, 0.45), [HATCH.x0 + x, tray + 0.0375, hz]));
  stashLoose.add(box(0.16, 0.06, 0.008, mat(0x4a2c18, 0.45), [HATCH.x0 + 0.915, tray + 0.03, HATCH.z0 + 0.2]));
  // Dollars, euros and francs, one compartment each
  [0, 1, 2].forEach((kind, col) => {
    for (let row = 0; row < 4; row++) {
      for (let layer = 0; layer < 2; layer++) {
        stack(HATCH.x0 + 0.115 + col * 0.2, tray + 0.026 + layer * 0.051, HATCH.z0 + 0.055 + row * 0.09, 0, 0, true, kind);
      }
    }
  });

  const barGeo = new THREE.BoxGeometry(0.16, 0.042, 0.072);
  const barPos = barGeo.attributes.position;
  for (let i = 0; i < barPos.count; i++) {
    if (barPos.getY(i) > 0) {
      barPos.setX(i, barPos.getX(i) * 0.88);
      barPos.setZ(i, barPos.getZ(i) * 0.78);
    }
  }
  barGeo.computeVertexNormals();
  const barTex = canvasTexture(320, 148, (c) => {
    c.fillStyle = "#e0b541";
    c.fillRect(0, 0, 320, 148);
    c.strokeStyle = "#9c7520";
    c.lineWidth = 4;
    c.strokeRect(14, 14, 292, 120);
    c.fillStyle = "#8a6518";
    c.textAlign = "center";
    c.font = "700 30px Georgia, serif";
    c.fillText("FINE GOLD", 160, 62);
    c.font = "600 24px Georgia, serif";
    c.fillText("999.9", 160, 96);
    c.font = "600 17px Georgia, serif";
    c.fillText("1 KILO", 160, 122);
  });
  const goldSide = new THREE.MeshStandardMaterial({ color: 0xd9ad3c, roughness: 0.3, metalness: 0.55, emissive: 0x4a3208, emissiveIntensity: 0.5 });
  const goldTop = new THREE.MeshStandardMaterial({ map: barTex, roughness: 0.32, metalness: 0.45, emissive: 0x4a3208, emissiveIntensity: 0.5, emissiveMap: barTex });
  const goldBar = new THREE.Mesh(barGeo, [goldSide, goldSide, goldTop, goldSide, goldSide, goldSide]);
  goldBar.position.set(HATCH.x0 + 0.915, tray + 0.021, HATCH.z0 + 0.06);
  goldBar.castShadow = true;
  stashLoose.add(goldBar);

  const silverTex = canvasTexture(320, 148, (c) => {
    c.fillStyle = "#d9dde1";
    c.fillRect(0, 0, 320, 148);
    c.strokeStyle = "#868d94";
    c.lineWidth = 4;
    c.strokeRect(14, 14, 292, 120);
    c.fillStyle = "#5e656c";
    c.textAlign = "center";
    c.font = "700 30px Georgia, serif";
    c.fillText("FINE SILVER", 160, 62);
    c.font = "600 24px Georgia, serif";
    c.fillText("999", 160, 96);
    c.font = "600 17px Georgia, serif";
    c.fillText("1 KILO", 160, 122);
  });
  const silverSide = new THREE.MeshStandardMaterial({ color: 0xc8cdd2, roughness: 0.3, metalness: 0.5, emissive: 0x33373b, emissiveIntensity: 0.5 });
  const silverTop = new THREE.MeshStandardMaterial({ map: silverTex, roughness: 0.32, metalness: 0.4, emissive: 0x33373b, emissiveIntensity: 0.5, emissiveMap: silverTex });
  const silverBar = new THREE.Mesh(barGeo, [silverSide, silverSide, silverTop, silverSide, silverSide, silverSide]);
  silverBar.position.set(HATCH.x0 + 0.915, tray + 0.021, HATCH.z0 + 0.145);
  silverBar.castShadow = true;
  stashLoose.add(silverBar);

  // Four prop passports in a neat grid. Generic artwork, no names or real emblems.
  const passportBook = (cover: string, edge: number, title: string, word: string, x: number, z: number) => {
    const tex = canvasTexture(280, 400, (c) => {
      c.fillStyle = cover;
      c.fillRect(0, 0, 280, 400);
      c.fillStyle = "#d6b25a";
      c.strokeStyle = "#d6b25a";
      c.textAlign = "center";
      c.font = "600 21px Georgia, serif";
      title.split("|").forEach((line, i) => c.fillText(line, 140, 62 + i * 27));
      c.lineWidth = 4;
      c.beginPath();
      c.arc(140, 214, 54, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(140, 214, 24, 54, 0, 0, Math.PI * 2);
      c.moveTo(86, 214);
      c.lineTo(194, 214);
      c.stroke();
      c.font = "600 28px Georgia, serif";
      c.fillText(word, 140, 340);
    });
    tex.anisotropy = 8;
    const side = mat(edge, 0.7);
    const pages = mat(0xe9e4d2, 0.8);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.126), [pages, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 }), side, pages, pages]);
    book.position.set(HATCH.x0 + x, tray + 0.007, HATCH.z0 + z);
    book.castShadow = true;
    stashLoose.add(book);
  };
  passportBook("#16284f", 0x142346, "UNITED STATES|OF AMERICA", "PASSPORT", 0.668, 0.1);
  passportBook("#5c1420", 0x4a1018, "REPUBBLICA|ITALIANA", "PASSAPORTO", 0.778, 0.1);
  passportBook("#3f1216", 0x330e11, "BUNDESREPUBLIK|DEUTSCHLAND", "REISEPASS", 0.668, 0.28);
  passportBook("#123f33", 0x0e3329, "UNITED ARAB|EMIRATES", "PASSPORT", 0.778, 0.28);

  // Hardware crypto wallet: brushed steel stick with a small display
  const walletTex = canvasTexture(420, 128, (c) => {
    c.fillStyle = "#1a1c20";
    c.fillRect(0, 0, 420, 128);
    c.fillStyle = "#04060a";
    c.fillRect(120, 28, 190, 72);
    c.fillStyle = "#e8eef2";
    c.font = "600 34px Arial, sans-serif";
    c.textAlign = "center";
    c.fillText("BTC", 215, 66);
    c.font = "400 18px Arial, sans-serif";
    c.fillText("Locked", 215, 90);
    c.fillStyle = "#6b7078";
    c.beginPath();
    c.arc(362, 64, 22, 0, Math.PI * 2);
    c.fill();
  });
  const walletSide = mat(0x74797f, 0.3, 0.8);
  const wallet = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.016, 0.042), [walletSide, walletSide, new THREE.MeshStandardMaterial({ map: walletTex, roughness: 0.35 }), walletSide, walletSide, walletSide]);
  wallet.position.set(HATCH.x0 + 0.915, tray + 0.009, HATCH.z0 + 0.285);
  wallet.castShadow = true;
  stashLoose.add(wallet);

  const stashLight = new THREE.PointLight(0xffe6a6, 0, 1.6, 1.6);
  stashLight.position.set(hx, 0.3, hz + 0.1);
  scene.add(stashLight);
  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(hx, 0.001, HATCH.z0);
  stashG.add(hatchPivot);
  const lidTop = new THREE.PlaneGeometry(hw - 0.006, hd - 0.006);
  const lidUv = lidTop.attributes.uv;
  const lidPos = lidTop.attributes.position;
  for (let i = 0; i < lidUv.count; i++) {
    const wx = hx + lidPos.getX(i);
    const wz = hz - lidPos.getY(i);
    lidUv.setXY(i, (wx + 7) / 14, (2 - wz + 4.5) / 9);
  }
  const lid = new THREE.Mesh(lidTop, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }));
  lid.rotation.x = -Math.PI / 2;
  lid.position.z = hd / 2;
  lid.receiveShadow = true;
  hatchPivot.add(lid);
  const lidUnder = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.006, 0.02, hd - 0.006), mat(0x3a2214, 0.8));
  lidUnder.position.set(0, -0.0105, hd / 2);
  hatchPivot.add(lidUnder);
  let hatchAngle = 0;

  // Each object keeps its own materials so hover only lights that object.
  pickables.forEach((root) =>
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.material === shadeMat) return;
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    }),
  );

  // Lighting
  const hemi = new THREE.HemisphereLight(0xdfeee2, 0x2a1a10, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2);
  sun.position.set(-3.2, 4.2, 3.6);
  sun.target.position.set(0.5, 0.8, -1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 4, bottom: -3, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight(0xffd6a0, 0, 7, 1.4);
  fill.position.set(0.3, 2.3, 1.1);
  const screenGlow = new THREE.PointLight(0xcfe8ff, 0.7, 2.2, 1.6);
  screenGlow.position.set(0.2, 1.15, -0.5);
  // A soft key light so the golf set reads in every light setting.
  const golfKey = new THREE.PointLight(0xfff1dc, 1.1, 1.9, 1.5);
  golfKey.position.set(-1.25, 1.75, -0.35);
  scene.add(fill, screenGlow, golfKey);

  let mode = startMode();
  const applyWindow = () => {
    drawSkyline(skyCtx, mode);
    skyTex.needsUpdate = true;
    const level = mode === "day" ? 0.94 : mode === "dusk" ? 0.62 : 0.4;
    wallArtMats.forEach((m) => m.color.setScalar(level));
  };
  applyWindow();
  const live = { ...MODES[mode], color: new THREE.Color(MODES[mode].sunColor) };

  // Dust drifting through the window light
  const dustCount = 150;
  const dustSeed = Array.from({ length: dustCount }, (_, i) => ({
    x: -3.4 + ((i * 2.399) % 1) * 6.4,
    y: 0.2 + ((i * 1.618) % 1) * 2.7,
    z: -1.4 + ((i * 3.141) % 1) * 3.2,
    speed: 0.12 + ((i * 0.777) % 1) * 0.3,
  }));
  const dustPos = new Float32Array(dustCount * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.016,
    color: 0xffe6bd,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: canvasTexture(32, 32, (c) => {
      const g = c.createRadialGradient(16, 16, 1, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
    }),
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // A soft brass marker floats over everything not yet discovered.
  const ringTex = canvasTexture(128, 128, (c) => {
    c.strokeStyle = "rgba(240,205,120,0.95)";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(64, 64, 42, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(240,205,120,1)";
    c.beginPath();
    c.arc(64, 64, 15, 0, Math.PI * 2);
    c.fill();
  });
  const markers = new Map<ItemId, THREE.Sprite>();
  pickables.forEach((root, id) => {
    if (id === "stash" || id === "mannequin" || HOVER_ONLY.includes(id)) return;
    const box = new THREE.Box3().setFromObject(root);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthTest: false }));
    sprite.position.set((box.min.x + box.max.x) / 2, box.max.y + 0.07, box.max.z + 0.02);
    sprite.scale.setScalar(0.07);
    sprite.renderOrder = 5;
    scene.add(sprite);
    markers.set(id, sprite);
  });

  // Camera
  const home = { pos: new THREE.Vector3(0.1, 1.55, 5.1), target: new THREE.Vector3(0.1, 1.2, -0.8) };
  const goal = { pos: home.pos.clone(), target: home.target.clone() };
  const look = home.target.clone();
  const lens = { pos: home.pos.clone(), target: home.target.clone() };
  const leanPoint = new THREE.Vector3();
  const box3 = new THREE.Box3();
  const scratch = new THREE.Vector3();
  let baseFov = 36;
  camera.position.copy(home.pos);
  let focused: Exclude<ItemId, "lamp" | "cradle" | "mannequin"> | null = null;
  let aspect = 1;
  let panX = 0;
  const mouse = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  const still2 = new THREE.Vector2(0, 0);

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    baseFov = aspect < 1 ? 46 : 36;
    camera.fov = baseFov;
    home.pos.z = aspect < 1 ? 5.4 : aspect < 1.5 ? 6.0 : 5.1;
    camera.updateProjectionMatrix();
    if (!focused) goal.pos.copy(home.pos);
  };

  // Picking
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const roots = [...pickables.values()];
  const idAt = (x: number, y: number): ItemId | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(roots, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.id) o = o.parent;
    return (o?.userData.id as ItemId) ?? null;
  };

  let hovered: ItemId | null = null;
  const glow = (id: ItemId | null, on: boolean) => {
    if (!id) return;
    pickables.get(id)?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      const list = Array.isArray(m) ? m : m ? [m] : [];
      for (const each of list) {
        if (!("emissive" in each) || each === shadeMat) continue;
        each.userData.base ??= { color: each.emissive.getHex(), intensity: each.emissiveIntensity };
        const base = each.userData.base;
        if (each.emissiveMap) {
          each.emissiveIntensity = base.intensity * (on ? 1.45 : 1);
        } else {
          each.emissive.setHex(on ? 0x8a6a22 : base.color);
          each.emissiveIntensity = on ? 0.35 : base.intensity;
        }
      }
    });
  };

  let dragStart: { x: number; pan: number } | null = null;
  let moved = false;
  const reducedFlags = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flagPoint = new THREE.Vector3();
  const onMove = (e: PointerEvent) => {
    if (!reducedFlags) {
      const r = canvas.getBoundingClientRect();
      flagCup.getWorldPosition(flagPoint);
      flagPoint.y += 0.22;
      flagPoint.project(camera);
      const near = Math.hypot(((flagPoint.x + 1) / 2) * r.width + r.left - e.clientX, ((1 - flagPoint.y) / 2) * r.height + r.top - e.clientY);
      if (near < 90 && (e.movementX || e.movementY)) brushFlags(e.movementX + e.movementY * 0.4);
    }
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    if (dragStart) {
      const dx = e.clientX - dragStart.x;
      if (Math.abs(dx) > 6) moved = true;
      panX = THREE.MathUtils.clamp(dragStart.pan - dx * 0.008, -2.4, 2.6);
    }
    if (e.pointerType === "touch") return;
    const id = focused ? null : idAt(e.clientX, e.clientY);
    if (id !== hovered) {
      glow(hovered, false);
      glow(id, true);
      hovered = id;
    }
    canvas.style.cursor = hovered === "dog" ? TALK_CURSOR : id && (id === "pennant" || !HOVER_ONLY.includes(id)) ? "pointer" : "default";
    cb.onHover(id, e.clientX, e.clientY);
  };
  const onDown = (e: PointerEvent) => {
    moved = false;
    if (aspect < 1) dragStart = { x: e.clientX, pan: panX };
  };
  const onUp = (e: PointerEvent) => {
    dragStart = null;
    if (moved) return;
    const id = idAt(e.clientX, e.clientY);
    if (id === "pennant") launchStar();
    if (id && !HOVER_ONLY.includes(id)) cb.onPick(id);
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  window.addEventListener("resize", resize);
  resize();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let raf = 0;
  let last = 0;
  let spinning = false;
  let lastScreen = -1;
  let swingAt = -1;
  let starAt = -1;
  let ringAt = -1;
  let lastT = 0;
  const found = new Set<ItemId>();
  const still = window.location.hash === "#still";

  const instant2 = () => reduced || still;
  const step = (t: number) => {
    lastT = t;
    const target = MODES[mode];
    const k = still ? 1 : 0.06;
    live.hemi += (target.hemi - live.hemi) * k;
    live.sun += (target.sun - live.sun) * k;
    live.lamp += (target.lamp - live.lamp) * k;
    live.fill += (target.fill - live.fill) * k;
    live.env += (target.env - live.env) * k;
    live.exposure += (target.exposure - live.exposure) * k;
    live.color.lerp(new THREE.Color(target.sunColor), k);
    hemi.intensity = live.hemi;
    sun.intensity = live.sun;
    sun.color.copy(live.color);
    lampLight.intensity = live.lamp;
    fill.intensity = live.fill;
    scene.environmentIntensity = live.env;
    renderer.toneMappingExposure = live.exposure;

    if (t - lastScreen > 0.12 || lastScreen < 0) {
      lastScreen = t;
      screens.forEach((s) => {
        s.draw(s.ctx, reduced ? 0 : t);
        s.tex.needsUpdate = true;
      });
    }
    if (spinning && !reduced) platter.rotation.y -= 0.055;
    const armGoal = spinning ? 0.66 : -0.12;
    armAngle += (armGoal - armAngle) * (instant2() ? 1 : 0.05);
    armPivot.rotation.y = -armAngle - 0.1;

    if (!focused) {
      goal.pos.copy(home.pos);
      goal.target.copy(home.target);
      if (aspect < 1) {
        goal.pos.x += panX;
        goal.target.x += panX;
      }
    }
    const instant = reduced || still;

    // Slow push-in when the page opens
    const intro = instant ? 1 : THREE.MathUtils.smootherstep(t, 0, 3.2);
    // The lens eases toward the goal, and the camera eases toward the lens, so moves start and stop softly.
    lens.pos.lerp(goal.pos, instant ? 1 : 0.026);
    lens.target.lerp(goal.target, instant ? 1 : 0.026);

    if (!instant) parallax.lerp(focused ? still2 : mouse, 0.045);
    const breathe = instant ? 0 : focused ? 0.35 : 1;
    const shot = scratch.set(
      lens.pos.x + parallax.x * 0.42 + Math.sin(t * 0.23) * 0.04 * breathe,
      lens.pos.y - parallax.y * 0.2 + Math.sin(t * 0.31) * 0.02 * breathe - (1 - intro) * 0.42,
      lens.pos.z + (1 - intro) * 2.4,
    );
    if (hovered) {
      box3.setFromObject(pickables.get(hovered)!);
      box3.getCenter(leanPoint);
      shot.z -= 0.22;
    } else {
      leanPoint.copy(lens.target);
    }
    camera.position.lerp(shot, instant ? 1 : 0.04);
    look.lerp(
      leanPoint.lerp(lens.target, 0.84).add(scratch.set(parallax.x * 0.14, -parallax.y * 0.06, 0)),
      instant ? 1 : 0.04,
    );
    camera.lookAt(look);

    const fov = baseFov - (focused ? 5 : hovered && hovered !== "stash" ? 1.2 : 0);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * (instant ? 1 : 0.022);
      camera.updateProjectionMatrix();
    }

    if (!still) {
      const a = dustGeo.attributes.position;
      for (let i = 0; i < dustCount; i++) {
        const d = dustSeed[i];
        a.setXYZ(
          i,
          d.x + Math.sin(t * d.speed + i) * 0.16,
          d.y + ((t * d.speed * 0.09 + i * 0.13) % 1) * 0.5 - 0.25,
          d.z + Math.cos(t * d.speed * 0.8 + i) * 0.12,
        );
      }
      a.needsUpdate = true;
    }
    dustMat.opacity = reduced ? 0 : mode === "night" ? 0.2 : 0.42;

    // Keyboard backlight breathes up when you open it, and sits brighter in the dark.
    const keyBase = mode === "day" ? 0.5 : 0.85;
    const keyGoal = focused === "keyboard" ? 1 : keyBase;
    legendMat.opacity += (keyGoal - legendMat.opacity) * (still ? 1 : 0.06);

    // Newton's cradle
    if (swingAt >= 0 && !reduced) {
      const age = t - swingAt;
      const amp = 0.6 * Math.exp(-age * 0.13);
      const a = Math.sin(age * 5.4 + Math.PI / 2) * amp;
      cradleBalls[0].rotation.z = a < 0 ? a : 0;
      cradleBalls[4].rotation.z = a > 0 ? a : 0;
      if (amp < 0.012) {
        swingAt = -1;
        cradleBalls[0].rotation.z = 0;
        cradleBalls[4].rotation.z = 0;
      }
    }

    // The boat crosses the lake every so often, turning around on each pass
    if (!reduced && !still) {
      const crossing = 26;
      const every = 90;
      const a = t < 18 ? -1 : (t - 18) % every;
      boat.visible = a >= 0 && a < crossing;
      if (boat.visible) {
        const p = a / crossing;
        const east = Math.floor((t - 18) / every) % 2 === 0;
        boat.position.x = east ? THREE.MathUtils.lerp(-3.42, -1.86, p) : THREE.MathUtils.lerp(-1.86, -3.42, p);
        boat.scale.x = east ? 1 : -1;
        boat.position.y = 1.32 + Math.sin(t * 2.1) * 0.003;
        boat.rotation.z = Math.sin(t * 1.5) * 0.015;
        boatMat.opacity = Math.min(1, Math.min(p, 1 - p) * 14);
      }
    }

    // The shooting star crosses the window
    if (starAt >= 0) {
      const p = (t - starAt) / 1.05;
      star.visible = p < 1;
      if (p < 1) {
        star.position.lerpVectors(STAR_FROM, STAR_TO, p * (2 - p));
        (star.material as THREE.MeshBasicMaterial).opacity = Math.sin(p * Math.PI);
      } else starAt = -1;
    }

    // The handset lifts off the cradle and rattles while it rings
    if (ringAt >= 0 && !reduced) {
      const age = t - ringAt;
      const lift = age < 1.1 ? Math.sin((age / 1.1) * Math.PI) : 0;
      handsetPivot.position.y = 0.178 + lift * (0.026 + Math.abs(Math.sin(age * 58)) * 0.006);
      handsetPivot.rotation.z = Math.sin(age * 118) * 0.05 * lift;
      handsetPivot.rotation.x = Math.sin(age * 91) * 0.018 * lift;
      if (age >= 1.1) ringAt = -1;
    }

    // The clock reads the visitor's device time
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    secondHand.rotation.z = -(sec / 60) * Math.PI * 2;
    minuteHand.rotation.z = -(min / 60) * Math.PI * 2;
    hourHand.rotation.z = -(((now.getHours() % 12) + min / 60) / 12) * Math.PI * 2;

    // The mannequin eases into his next pose
    POSES[poseIndex].forEach((v, i) => {
      poseNow[i] += (v - poseNow[i]) * (instant ? 1 : 0.09);
    });
    const [ls, le, rs, re, turn] = poseNow;
    arms[0].shoulder.rotation.z = -ls;
    arms[0].elbow.rotation.z = -le;
    arms[1].shoulder.rotation.z = rs;
    arms[1].elbow.rotation.z = re;
    head.rotation.y = turn;

    if (focused === "rolodex" && !reduced) rolodexWheel.rotation.x += 0.02;

    if (!reduced) vineSway.rotation.z = Math.sin(t * 0.6) * 0.012;

    // Every two minutes the vacuum wanders in, nosing around the rug, until it bumps Rudy. It backs
    // off, turns and wanders out. Rudy just nods.
    if (!reduced && !still) {
      const FIRST = 40;
      const a = t < FIRST ? -1 : (t - FIRST) % 120;
      const smooth = (v: number) => v * v * (3 - 2 * v);
      const place = (path: THREE.CatmullRomCurve3, u: number) => {
        path.getPointAt(u, roombaAt);
        path.getTangentAt(u, roombaDir);
        roomba.position.set(roombaAt.x, 0.012, roombaAt.z);
        return Math.atan2(-roombaDir.z, roombaDir.x);
      };
      roomba.visible = a >= 0 && a < ROOMBA_END;
      let nod = 0;
      if (a >= 0 && a < 15) {
        const p = a / 15;
        roomba.rotation.y = place(ROOMBA_IN, Math.min(p + Math.sin(p * Math.PI * 6) * 0.03 * Math.sin(p * Math.PI), 1));
      } else if (a >= 15 && a < 15.9) {
        const yaw = place(ROOMBA_IN, 1);
        const back = 0.18 * smooth((a - 15) / 0.9);
        roomba.position.x -= roombaDir.x * back;
        roomba.position.z -= roombaDir.z * back;
        roomba.rotation.y = yaw;
      } else if (a >= 15.9 && a < 17.1) {
        const from = place(ROOMBA_IN, 1);
        roomba.position.x -= roombaDir.x * 0.18;
        roomba.position.z -= roombaDir.z * 0.18;
        const to = place2(ROOMBA_OUT);
        let turn = to - from;
        while (turn < 0) turn += Math.PI * 2;
        roomba.rotation.y = from + turn * smooth((a - 15.9) / 1.2);
      } else if (a >= 17.1 && a < ROOMBA_END) {
        roomba.rotation.y = place(ROOMBA_OUT, (a - 17.1) / (ROOMBA_END - 17.1));
      }
      if (a >= 15 && a < 16.3) nod = Math.sin(((a - 15) / 1.3) * Math.PI) * 0.17;
      dogHeadPivot.rotation.z = -nod * 0.25;
    }

    // Flags settle after the mouse brushes past
    if (!reduced && !still) stepFlags(t, Math.min(flagDt(t), 0.05));

    // Rudy breathes
    if (!reduced) dogG.scale.y = 1 + Math.sin(t * 2.4) * 0.006;

    // The hidden plank
    const hatchGoal = focused === "stash" ? 2.05 : 0;
    hatchAngle += (hatchGoal - hatchAngle) * (instant ? 1 : 0.035);
    hatchPivot.rotation.x = -hatchAngle;
    stashLight.intensity = (hatchAngle / 2.05) * 0.8;
    stashLoose.visible = hatchAngle > 0.25;

    const pulse = reduced ? 1 : 1 + Math.sin(t * 2.2) * 0.12;
    markers.forEach((m, id) => {
      const hide = !!focused || found.has(id);
      const target = hide ? 0 : hovered === id ? 0.095 : 0.062 * pulse;
      m.visible = m.scale.x > 0.004 || !hide;
      m.scale.setScalar(m.scale.x + (target - m.scale.x) * (still ? 1 : 0.14));
    });

    renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = false;
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (document.hidden || now - last < 30) return;
    last = now;
    step(clock.getElapsedTime());
  };
  if (still) {
    for (let i = 0; i < 3; i++) step(i);
  } else {
    raf = requestAnimationFrame(loop);
  }

  return {
    focus(id) {
      focused = id;
      glow(hovered, false);
      hovered = null;
      cb.onHover(null, 0, 0);
      if (id) {
        const f = FOCUS[id];
        const [x, y, z] = f.target;
        const side = aspect > 1.2 && id !== "stash" && id !== "work" && id !== "projects" ? 0.2 * f.dist : 0;
        goal.target.set(x + side, y, z);
        goal.pos.set(x + side, y + (f.lift ?? 0.08), z + f.dist);
      }
      if (still) step(0);
    },
    cycleLight() {
      mode = mode === "day" ? "dusk" : mode === "dusk" ? "night" : "day";
      applyWindow();
      if (still) step(0);
      return mode;
    },
    mode: () => mode,
    ringPhone() {
      ringAt = lastT;
    },
    screenPoint(id) {
      const r = canvas.getBoundingClientRect();
      const p = new THREE.Vector3(...FOCUS[id].target).project(camera);
      return { x: ((p.x + 1) / 2) * r.width + r.left, y: ((1 - p.y) / 2) * r.height + r.top };
    },
    playRecord(color) {
      spinning = !!color;
      if (color) (recordLabel.material as THREE.MeshStandardMaterial).color.set(color);
      (powerLight.material as THREE.MeshBasicMaterial).color.set(color ? 0xff4a36 : 0x3a1512);
      if (still) step(0);
    },
    nextPose() {
      poseIndex = (poseIndex + 1) % POSES.length;
    },
    swing() {
      swingAt = lastT;
    },
    setFound(ids) {
      found.clear();
      ids.forEach((id) => found.add(id));
    },
    snapshot() {
      step(0);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", resize);
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
