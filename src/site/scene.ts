import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ItemId } from "./content";
import { BANK, BOOKS, reconcile } from "./recon";
import { drawWorldMap, whenMapFontsReady } from "./worldmap";

export type LightMode = "day" | "dusk" | "night";

export type OfficeCallbacks = {
  onHover: (id: ItemId | null, x: number, y: number) => void;
  onPick: (id: ItemId) => void;
};

export type Office = {
  focus: (id: Exclude<ItemId, "lamp"> | null) => void;
  cycleLight: () => LightMode;
  mode: () => LightMode;
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

function drawSkyline(c: CanvasRenderingContext2D, mode: LightMode) {
  const w = c.canvas.width;
  const h = c.canvas.height;
  const sky = c.createLinearGradient(0, 0, 0, h * 0.72);
  const stops: Record<LightMode, [string, string]> = {
    day: ["#8fc0e0", "#dcecf2"],
    dusk: ["#2b3f73", "#f0a35e"],
    night: ["#060b1c", "#16233f"],
  };
  sky.addColorStop(0, stops[mode][0]);
  sky.addColorStop(1, stops[mode][1]);
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  // Lake Michigan along the right side of the view.
  c.fillStyle = { day: "#3f7fa6", dusk: "#b0784f", night: "#0a1428" }[mode];
  c.fillRect(0, h * 0.68, w, h * 0.32);

  let x = 0;
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (x < w * 0.72) {
    const bw = 26 + rand() * 46;
    const bh = h * (0.14 + rand() * 0.36);
    const top = h * 0.72 - bh;
    c.fillStyle = { day: "#5c6b78", dusk: "#27304a", night: "#0c1324" }[mode];
    c.fillRect(x, top, bw, bh + h * 0.28);
    for (let wy = top + 6; wy < h * 0.72; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
        if (rand() > (mode === "day" ? 0.45 : 0.72)) {
          c.fillStyle = { day: "rgba(225,235,240,0.3)", dusk: "#ffb765", night: "#f3c777" }[mode];
          c.fillRect(wx, wy, 3, 4);
        }
      }
    }
    x += bw + 2;
  }
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const REC = reconcile(BANK, BOOKS, 3);

function drawLeftMonitor(c: CanvasRenderingContext2D, t: number) {
  const { width: w, height: h } = c.canvas;
  c.fillStyle = "#f4f6f1";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#123a2d";
  c.fillRect(0, 0, w, 62);
  c.fillStyle = "#f4f6f1";
  c.font = "600 30px Barlow, Arial, sans-serif";
  c.fillText("October bank rec (sample data)", 24, 42);

  const r = REC;
  const active = Math.floor(t / 0.8) % r.rows.length;
  r.rows.slice(0, 9).forEach((row, i) => {
    const y = 76 + i * 37;
    if (i === active) {
      c.fillStyle = "#e2d8b8";
      c.fillRect(12, y, w - 24, 35);
    }
    c.fillStyle = "#16241e";
    c.font = "400 23px Barlow, Arial, sans-serif";
    c.fillText((row.book?.text ?? row.bank?.text ?? "").slice(0, 24), 24, y + 25);
    c.textAlign = "right";
    c.fillText(money((row.bank ?? row.book)?.amount ?? 0), 500, y + 25);
    c.fillStyle = row.status === "Matched" ? "#1a5a43" : "#8a4b0f";
    c.font = "600 21px Barlow, Arial, sans-serif";
    c.fillText(row.status, w - 24, y + 25);
    c.textAlign = "left";
  });
}

function drawRightMonitor(c: CanvasRenderingContext2D, t: number) {
  const { width: w, height: h } = c.canvas;
  c.fillStyle = "#0d1a16";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#c9a14a";
  c.font = "600 30px Barlow, Arial, sans-serif";
  c.fillText("Projects", 24, 44);

  c.strokeStyle = "#20362e";
  c.lineWidth = 1;
  for (let y = 80; y < 300; y += 44) {
    c.beginPath();
    c.moveTo(24, y);
    c.lineTo(w - 24, y);
    c.stroke();
  }
  c.strokeStyle = "#6fd0a6";
  c.lineWidth = 3;
  c.beginPath();
  for (let x = 0; x <= w - 48; x += 6) {
    const v = x * 0.016 + t * 0.7;
    const y = 200 - x * 0.1 + Math.sin(v) * 34 + Math.sin(v * 2.3) * 16 + Math.sin(v * 5.1) * 7;
    if (x === 0) c.moveTo(24, y);
    else c.lineTo(24 + x, y);
  }
  c.stroke();

  c.fillStyle = "#e8efe9";
  c.font = "400 25px Barlow, Arial, sans-serif";
  ["Golf One Software", "Options Arbitrage Scanner", "Options Strategy Backtester"].forEach((s, i) =>
    c.fillText(s, 24, 346 + i * 40),
  );
}

const MODES: Record<LightMode, { hemi: number; sun: number; sunColor: number; lamp: number; fill: number; env: number; exposure: number }> = {
  day: { hemi: 1.5, sun: 2.8, sunColor: 0xfff0d8, lamp: 2, fill: 0, env: 0.5, exposure: 1.0 },
  dusk: { hemi: 0.95, sun: 1.9, sunColor: 0xffa35c, lamp: 5, fill: 3, env: 0.36, exposure: 1.05 },
  night: { hemi: 0.62, sun: 0, sunColor: 0x88aaff, lamp: 7, fill: 9, env: 0.26, exposure: 1.2 },
};

export const MODE_LABEL: Record<LightMode, string> = {
  day: "Daytime in Milwaukee",
  dusk: "Sunset in Milwaukee",
  night: "Night in Milwaukee",
};

const FOCUS: Record<Exclude<ItemId, "lamp">, { target: Pos; dist: number; lift?: number }> = {
  work: { target: [-0.3, 1.2, -0.82], dist: 2.1 },
  projects: { target: [0.72, 1.2, -0.82], dist: 2.1 },
  about: { target: [0.95, 0.84, -0.4], dist: 0.95, lift: 0.3 },
  contact: { target: [1.56, 0.86, -0.82], dist: 1.0, lift: 0.3 },
  ratings: { target: [2.53, 1.36, -1.34], dist: 1.3 },
  golf: { target: [-1.72, 0.74, -1.02], dist: 2.5, lift: 0.3 },
  espresso: { target: [1.6, 0.84, -0.36], dist: 0.8, lift: 0.3 },
  records: { target: [2.95, 0.74, -1.38], dist: 1.25, lift: 0.2 },
  plane: { target: [0.15, 2.16, -1.46], dist: 1.35, lift: -0.25 },
  map: { target: [1.63, 1.72, -1.57], dist: 1.85 },
  cards: { target: [-0.62, 0.8, -0.42], dist: 0.85, lift: 0.4 },
  dog: { target: [1.45, 0.14, 0.26], dist: 1.25, lift: 0.7 },
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
  const floor = mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.5 }));
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

  const rugTex = canvasTexture(1024, 640, (c) => {
    c.fillStyle = "#4c1a1c";
    c.fillRect(0, 0, 1024, 640);
    c.strokeStyle = "#b08a3c";
    c.lineWidth = 8;
    c.strokeRect(28, 28, 968, 584);
    c.lineWidth = 3;
    c.strokeRect(52, 52, 920, 536);
    c.fillStyle = "rgba(176,138,60,0.55)";
    for (let x = 96; x < 960; x += 72) {
      for (let y = 96; y < 570; y += 72) {
        c.save();
        c.translate(x, y);
        c.rotate(Math.PI / 4);
        c.fillRect(-9, -9, 18, 18);
        c.restore();
      }
    }
  });
  const rug = box(3.7, 0.012, 2.25, new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }), [0.2, 0.006, -0.05]);
  rug.castShadow = false;
  scene.add(rug);

  // Window with the Milwaukee view
  const skyEl = document.createElement("canvas");
  skyEl.width = skyEl.height = 768;
  const skyCtx = skyEl.getContext("2d")!;
  const skyTex = new THREE.CanvasTexture(skyEl);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.75), new THREE.MeshBasicMaterial({ map: skyTex }));
  glass.position.set(-2.55, 1.72, -1.59);
  scene.add(glass);
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
    g.add(cyl(0.022, 0.03, 0.17, bezel, [0, 0.085, -0.04]));
    g.add(box(0.3, 0.015, 0.2, bezel, [0, 0.008, -0.04]));
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
    monitor("work", -0.3, 0.13, drawLeftMonitor),
    monitor("projects", 0.72, -0.13, drawRightMonitor),
  ];

  // Keyboard and mouse
  scene.add(box(0.46, 0.016, 0.15, mat(0x1b211e, 0.5), [0.2, 0.79, -0.38]));
  const mouseGeo = new THREE.SphereGeometry(0.045, 20, 14);
  mouseGeo.scale(0.75, 0.4, 1.1);
  scene.add(mesh(mouseGeo, mat(0x1b211e, 0.4), [0.56, 0.795, -0.38]));

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

  // Euchre hand
  const cardsG = group("cards", [-0.62, 0.785, -0.42]);
  const cardTex = (label: string, red: boolean) =>
    canvasTexture(128, 180, (c) => {
      c.fillStyle = "#f6f1e4";
      c.fillRect(0, 0, 128, 180);
      c.fillStyle = red ? "#a32a22" : "#17201c";
      c.font = "700 58px Georgia, serif";
      c.fillText(label, 16, 66);
    });
  ["J", "J", "A", "K", "Q"].forEach((label, i) => {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.003, 0.17),
      [0, 1, 2, 3, 4, 5].map((f) =>
        f === 2 ? new THREE.MeshStandardMaterial({ map: cardTex(label, i < 2), roughness: 0.6 }) : mat(0xf6f1e4),
      ),
    );
    card.position.set(-0.11 + i * 0.055, 0.002 + i * 0.003, Math.abs(i - 2) * 0.012);
    card.rotation.y = (2 - i) * 0.2;
    card.castShadow = true;
    cardsG.add(card);
  });

  // Nameplate
  const plateG = group("about", [0.95, 0.783, -0.4]);
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

  // Desk phone
  const phoneG = group("contact", [1.56, 0.783, -0.82]);
  phoneG.scale.setScalar(1.25);
  phoneG.rotation.y = -0.2;
  const black = mat(0x15110e, 0.28, 0.2);
  const phoneBody = cyl(0.14, 0.2, 0.075, black, [0, 0.0375, 0], 4);
  phoneBody.rotation.y = Math.PI / 4;
  phoneG.add(phoneBody);
  const handset = cyl(0.024, 0.024, 0.3, black, [0, 0.09, -0.06], 16);
  handset.rotation.z = Math.PI / 2;
  phoneG.add(handset);
  phoneG.add(cyl(0.04, 0.04, 0.03, black, [-0.13, 0.09, -0.06], 16));
  phoneG.add(cyl(0.04, 0.04, 0.03, black, [0.13, 0.09, -0.06], 16));
  const dial = cyl(0.062, 0.066, 0.008, mat(COLORS.cream, 0.5), [0, 0.066, 0.075]);
  dial.rotation.x = 0.42;
  phoneG.add(dial);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const hole = cyl(0.008, 0.008, 0.003, black, [Math.cos(a) * 0.046, 0.0725 - Math.sin(a) * 0.019, 0.078 + Math.sin(a) * 0.042], 10);
    hole.rotation.x = 0.42;
    phoneG.add(hole);
  }

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
  const planeG = group("plane", [0.15, 1.945, -1.46]);
  const white = mat(0xe8ebe6, 0.35);
  const red = mat(0x9c2c24, 0.4);
  planeG.add(cyl(0.05, 0.07, 0.012, brass, [0, 0.006, 0], 24));
  planeG.add(cyl(0.008, 0.008, 0.16, brass, [0, 0.09, 0], 10));
  const craft = new THREE.Group();
  craft.position.set(0, 0.2, 0);
  craft.rotation.set(0.62, 0.3, 0.12, "YXZ");
  const body = cyl(0.046, 0.016, 0.56, white, [-0.03, 0, 0], 20);
  body.rotation.z = -Math.PI / 2;
  craft.add(body);
  const nose = mesh(new THREE.SphereGeometry(0.046, 18, 12), red, [0.25, 0, 0]);
  nose.scale.set(1.2, 1, 1);
  craft.add(nose);
  const prop = box(0.006, 0.2, 0.018, mat(0x201a14, 0.5), [0.31, 0, 0]);
  craft.add(prop);
  craft.add(box(0.13, 0.008, 0.82, white, [0.08, 0.03, 0]));
  craft.add(box(0.13, 0.009, 0.1, red, [0.08, 0.03, 0.36]));
  craft.add(box(0.13, 0.009, 0.1, red, [0.08, 0.03, -0.36]));
  craft.add(box(0.07, 0.006, 0.26, white, [-0.28, 0.01, 0]));
  craft.add(box(0.08, 0.1, 0.007, red, [-0.29, 0.06, 0]));
  planeG.add(craft);
  scene.add(box(0.12, 0.2, 0.1, mat(0x2d4e7a, 0.55), [-0.46, 2.04, -1.46]));
  scene.add(box(0.11, 0.24, 0.1, mat(0x7a2f2a, 0.55), [-0.57, 2.06, -1.46]));
  scene.add(box(0.1, 0.18, 0.1, mat(COLORS.cream, 0.55), [-0.67, 2.03, -1.46]));

  // Framed travel map
  const mapG = group("map", [1.63, 1.72, -1.57]);
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
    new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.75 }),
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
  books(0.07, shelfX - 0.68, shelfX + 0.66, 3);
  books(1.68, shelfX - 0.68, shelfX + 0.25, 11);
  books(1.16, shelfX + 0.02, shelfX + 0.66, 2);
  books(2.2, shelfX - 0.28, shelfX + 0.66, 5);

  // Ratings binder, standing out on its own shelf
  const binderG = group("ratings", [shelfX - 0.42, 1.16, -1.34]);
  const binderTex = canvasTexture(200, 280, (c) => {
    c.fillStyle = "#7c1e1c";
    c.fillRect(0, 0, 200, 280);
    c.strokeStyle = "#d8b45a";
    c.lineWidth = 5;
    c.strokeRect(14, 14, 172, 252);
    c.fillStyle = "#d8b45a";
    c.textAlign = "center";
    c.font = "700 60px Georgia, serif";
    c.fillText("AAA", 100, 120);
    c.font = "600 19px Barlow, Arial, sans-serif";
    c.fillText("BOND WIZARD", 100, 164);
    c.fillText("RATINGS DESK", 100, 190);
  });
  const binder = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.4, 0.06),
    [0, 1, 2, 3, 4, 5].map((f) => (f === 4 ? new THREE.MeshStandardMaterial({ map: binderTex, roughness: 0.5 }) : mat(0x7c1e1c, 0.5))),
  );
  binder.position.set(0, 0.2, 0);
  binder.rotation.x = -0.12;
  binder.castShadow = true;
  binderG.add(binder);

  // Record player
  const recordG = group("records", [shelfX, 0.64, -1.38]);
  recordG.add(box(0.62, 0.1, 0.28, mat(0x6a4326, 0.45), [0, 0.05, 0]));
  const platter = new THREE.Group();
  platter.position.set(-0.08, 0.108, 0);
  const vinyl = cyl(0.13, 0.13, 0.006, mat(0x0c0c0c, 0.25), [0, 0, 0], 40);
  platter.add(vinyl);
  platter.add(cyl(0.042, 0.042, 0.007, mat(0xa32a22, 0.5), [0, 0.001, 0], 24));
  recordG.add(platter);
  const arm = box(0.2, 0.008, 0.012, brass, [0.15, 0.13, -0.02]);
  arm.rotation.y = 0.4;
  recordG.add(arm);

  // Golf bag
  // Golf: black cart bag with a set of chrome cavity-back irons
  const golfG = group("golf", [-1.8, 0, -1.02]);
  golfG.rotation.z = -0.13;
  const golfTurn = new THREE.Group();
  golfTurn.rotation.y = 0.32;
  golfG.add(golfTurn);
  const bagBlack = mat(0x0d0e10, 0.4);
  const bagMatte = mat(0x17181b, 0.75);
  const bagWhite = mat(0xeeeeea, 0.45);
  bagMatte.side = THREE.DoubleSide;
  const lathe = (pts: [number, number][], m: THREE.Material) =>
    mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), m);
  golfTurn.add(lathe([[0, 0], [0.15, 0], [0.168, 0.018], [0.172, 0.13]], bagMatte));
  golfTurn.add(lathe([[0.172, 0.13], [0.178, 0.45], [0.19, 0.76], [0.2, 0.86]], bagBlack));
  golfTurn.add(lathe([[0.2, 0.86], [0.212, 0.9], [0.212, 0.965], [0.2, 0.98], [0.17, 0.975], [0, 0.94]], bagMatte));
  const trim = (y: number, r: number, m: THREE.Material = bagWhite, t = 0.0055) => {
    const ring = mesh(new THREE.TorusGeometry(r, t, 10, 56), m, [0, y, 0]);
    ring.rotation.x = Math.PI / 2;
    golfTurn.add(ring);
  };
  trim(0.131, 0.174);
  trim(0.862, 0.202);
  trim(0.978, 0.204);

  // Club dividers across the top
  const well = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), mat(0x08090a, 0.9));
  well.rotation.x = -Math.PI / 2;
  well.position.y = 0.965;
  golfTurn.add(well);
  const divider = mat(0x2b2d31, 0.6);
  for (const z of [-0.055, 0.045]) golfTurn.add(box(0.37, 0.018, 0.01, divider, [0, 0.975, z]));
  golfTurn.add(box(0.01, 0.018, 0.34, divider, [0.05, 0.975, 0]));
  golfTurn.add(box(0.01, 0.018, 0.34, divider, [-0.07, 0.975, 0]));

  // Pockets, zips and the printed name
  const panel = mesh(new RoundedBoxGeometry(0.25, 0.5, 0.075, 5, 0.03), bagBlack, [0, 0.46, 0.165]);
  golfTurn.add(panel);
  golfTurn.add(box(0.008, 0.46, 0.006, bagWhite, [-0.105, 0.46, 0.203]));
  const namePrint = new THREE.Mesh(
    new THREE.PlaneGeometry(0.17, 0.42),
    new THREE.MeshStandardMaterial({
      transparent: true,
      roughness: 0.5,
      map: canvasTexture(256, 640, (c) => {
        c.clearRect(0, 0, 256, 640);
        c.translate(128, 320);
        c.rotate(-Math.PI / 2);
        c.fillStyle = "#f4f4f0";
        c.textAlign = "center";
        c.font = 'italic 700 118px Georgia, "Times New Roman", serif';
        c.fillText("Titleist", 0, 38);
      }),
    }),
  );
  namePrint.position.set(0.012, 0.46, 0.2035);
  namePrint.castShadow = false;
  golfTurn.add(namePrint);
  const collarPocket = mesh(new RoundedBoxGeometry(0.26, 0.11, 0.06, 4, 0.025), bagMatte, [0, 0.78, 0.178]);
  collarPocket.rotation.x = -0.05;
  golfTurn.add(collarPocket);
  golfTurn.add(box(0.2, 0.006, 0.006, bagWhite, [0, 0.8, 0.21]));
  const sidePocket = mesh(new RoundedBoxGeometry(0.075, 0.42, 0.17, 4, 0.03), bagBlack, [0.19, 0.42, 0]);
  golfTurn.add(sidePocket);
  golfTurn.add(box(0.006, 0.36, 0.006, bagWhite, [0.229, 0.42, 0.06]));
  const carry = mesh(new THREE.TorusGeometry(0.06, 0.012, 10, 24, Math.PI), bagMatte, [-0.21, 0.9, 0]);
  carry.rotation.set(0, Math.PI / 2, Math.PI / 2);
  golfTurn.add(carry);

  // Irons, stored head-up the way they sit in a bag
  // Chrome reads its own reflections so the set still shines in the night scene.
  const chrome = mat(0xe4e7ea, 0.2, 1);
  const shaftSteel = mat(0xd2d5d9, 0.28, 1);
  for (const m of [chrome, shaftSteel]) {
    m.envMap = scene.environment;
    m.envMapIntensity = 0.85;
  }
  const ironShape = new THREE.Shape();
  ironShape.moveTo(0, 0);
  ironShape.lineTo(0.074, -0.005);
  ironShape.quadraticCurveTo(0.092, -0.004, 0.093, 0.016);
  ironShape.quadraticCurveTo(0.094, 0.05, 0.076, 0.056);
  ironShape.lineTo(0.008, 0.03);
  ironShape.quadraticCurveTo(-0.002, 0.022, 0, 0);
  const ironGeo = new THREE.ExtrudeGeometry(ironShape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 10,
  });
  const badgeTex = canvasTexture(256, 96, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "#3a3f45");
    g.addColorStop(1, "#6c737b");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 96);
    c.fillStyle = "#f2f3f4";
    c.font = '700 62px Barlow, Arial, sans-serif';
    c.textAlign = "center";
    c.fillText("T300", 128, 70);
  });
  const badgeMat = new THREE.MeshStandardMaterial({ map: badgeTex, roughness: 0.35, metalness: 0.5 });
  const iron = (x: number, z: number, top: number, yaw: number) => {
    const club = new THREE.Group();
    club.position.set(x, 0, z);
    club.rotation.y = yaw;
    club.add(cyl(0.0048, 0.0048, top - 0.8, shaftSteel, [0, 0.8 + (top - 0.8) / 2, 0], 10));
    club.add(cyl(0.0078, 0.0068, 0.05, chrome, [0, top + 0.012, 0], 12));
    const holder = new THREE.Group();
    holder.position.set(0.002, top + 0.03, 0);
    holder.rotation.z = 0.46;
    const head = new THREE.Group();
    head.rotation.x = Math.PI;
    head.scale.setScalar(1.12);
    head.add(mesh(ironGeo, chrome));
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.021), badgeMat);
    badge.position.set(0.05, 0.022, -0.0031);
    badge.rotation.set(0, Math.PI, Math.PI);
    head.add(badge);
    holder.add(head);
    club.add(holder);
    golfTurn.add(club);
  };
  [
    [-0.11, 0.1, 1.09, -0.3],
    [-0.035, 0.115, 1.1, -0.12],
    [0.04, 0.115, 1.11, 0.08],
    [0.11, 0.095, 1.12, 0.26],
    [-0.1, 0.0, 1.18, -0.24],
    [-0.015, 0.012, 1.19, -0.04],
    [0.07, 0.008, 1.2, 0.16],
    [0.14, -0.015, 1.21, 0.34],
  ].forEach(([x, z, top, yaw]) => iron(x, z, top, yaw));

  // Woods in the back row, under black headcovers
  const coverGeo = new THREE.LatheGeometry(
    [[0.012, 0], [0.024, 0.08], [0.03, 0.14], [0.058, 0.2], [0.074, 0.25], [0.066, 0.3], [0.04, 0.33], [0, 0.34]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    ),
    28,
  );
  const coverBlack = mat(0x121316, 0.7);
  const woods: [number, number, number, number][] = [
    [-0.11, -0.11, 1.02, -0.1],
    [0.0, -0.13, 1.06, 0.02],
    [0.11, -0.11, 1.02, 0.12],
  ];
  woods.forEach(([x, z, y, tilt], i) => {
    const wood = new THREE.Group();
    wood.position.set(x, y, z);
    wood.rotation.z = -tilt;
    const cover = mesh(coverGeo, coverBlack);
    cover.scale.set(0.95, 0.92, 1.1);
    wood.add(cover);
    const band = mesh(new THREE.TorusGeometry(0.0335, 0.0045, 8, 26), bagWhite, [0, 0.135, 0]);
    band.rotation.x = Math.PI / 2;
    band.scale.set(0.95, 1.1, 1);
    band.position.y = 0.124;
    wood.add(band);
    if (i === 1) {
      const stripe = mesh(new THREE.TorusGeometry(0.075, 0.004, 8, 30), mat(0x9c2c24, 0.5), [0, 0.25, 0]);
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(0.95, 1.1, 1);
      stripe.position.y = 0.23;
      wood.add(stripe);
    }
    golfTurn.add(wood);
  });

  // The Havanese, asleep on the rug
  const dogG = group("dog", [1.45, 0.012, 0.26]);
  dogG.rotation.y = -0.3;
  dogG.scale.setScalar(0.8);
  const coat = new THREE.MeshStandardMaterial({ color: 0xece3d0, roughness: 1 });
  const tan = new THREE.MeshStandardMaterial({ color: 0xb08f68, roughness: 1 });
  const blob = (r: number, m: THREE.Material, p: Pos, sc: Pos = [1, 1, 1]) => {
    const b = mesh(new THREE.SphereGeometry(r, 28, 20), m, p);
    b.scale.set(...sc);
    dogG.add(b);
    return b;
  };
  blob(0.2, coat, [-0.04, 0.125, 0], [1.6, 0.68, 0.92]);
  blob(0.13, coat, [-0.27, 0.11, 0], [1, 0.82, 1.05]);
  blob(0.07, tan, [-0.37, 0.19, 0.0], [0.8, 0.95, 0.72]);
  blob(0.055, coat, [0.2, 0.05, 0.13], [1.9, 0.72, 0.8]);
  blob(0.055, coat, [0.22, 0.05, 0.02], [1.9, 0.72, 0.8]);
  blob(0.125, coat, [0.25, 0.145, 0.1], [1.05, 0.92, 1.05]);
  blob(0.062, coat, [0.355, 0.115, 0.14], [1.1, 0.8, 0.95]);
  const earA = blob(0.085, tan, [0.2, 0.15, 0.215], [0.62, 1.2, 0.34]);
  earA.rotation.x = 0.25;
  const earB = blob(0.085, tan, [0.2, 0.17, -0.02], [0.62, 1.2, 0.34]);
  earB.rotation.x = -0.25;
  const noseDot = mesh(new THREE.SphereGeometry(0.019, 12, 10), mat(0x15110e, 0.3), [0.417, 0.122, 0.15]);
  dogG.add(noseDot);
  for (const z of [0.05, 0.16]) {
    const eye = mesh(new THREE.CapsuleGeometry(0.005, 0.03, 4, 8), mat(0x15110e, 0.5), [0.355, 0.178, z + 0.015]);
    eye.rotation.x = Math.PI / 2;
    dogG.add(eye);
  }

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
  scene.add(fill, screenGlow);

  let mode = startMode();
  const applyWindow = () => {
    drawSkyline(skyCtx, mode);
    skyTex.needsUpdate = true;
  };
  applyWindow();
  const live = { ...MODES[mode], color: new THREE.Color(MODES[mode].sunColor) };

  // Camera
  const home = { pos: new THREE.Vector3(0.1, 1.55, 5.1), target: new THREE.Vector3(0.1, 1.2, -0.8) };
  const goal = { pos: home.pos.clone(), target: home.target.clone() };
  const look = home.target.clone();
  camera.position.copy(home.pos);
  let focused: Exclude<ItemId, "lamp"> | null = null;
  let aspect = 1;
  let panX = 0;
  const mouse = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 46 : 36;
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
        if ("emissive" in each && each !== shadeMat) {
          each.emissive.setHex(on ? 0x8a6a22 : 0x000000);
          each.emissiveIntensity = on ? 0.35 : 1;
        }
      }
    });
  };

  let dragStart: { x: number; pan: number } | null = null;
  let moved = false;
  const onMove = (e: PointerEvent) => {
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
    canvas.style.cursor = id ? "pointer" : "default";
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
    if (id) cb.onPick(id);
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
  const still = window.location.hash === "#still";

  const step = (t: number) => {
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
    if (spinning && !reduced) platter.rotation.y -= 0.09;

    if (!focused) {
      goal.pos.copy(home.pos);
      goal.target.copy(home.target);
      if (aspect < 1) {
        goal.pos.x += panX;
        goal.target.x += panX;
      }
    }
    if (!reduced && !focused) parallax.lerp(mouse, 0.05);
    camera.position.lerp(
      new THREE.Vector3(goal.pos.x + parallax.x * 0.16, goal.pos.y - parallax.y * 0.08, goal.pos.z),
      reduced || still ? 1 : 0.06,
    );
    look.lerp(goal.target, reduced || still ? 1 : 0.07);
    camera.lookAt(look);
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
      if (id === "records") spinning = true;
      glow(hovered, false);
      hovered = null;
      cb.onHover(null, 0, 0);
      if (id) {
        const f = FOCUS[id];
        const [x, y, z] = f.target;
        const side = aspect > 1.2 ? 0.2 * f.dist : 0;
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
