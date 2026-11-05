import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";
import topo from "world-atlas/countries-110m.json";
import baseUrl from "./assets/world-physical.webp";
import rawRegions from "./regions.json";

export const VISITED_COUNTRIES = ["United States of America", "Switzerland", "Germany", "Austria", "Slovenia", "Denmark"];

type LonLat = [number, number];
type Pin = { name?: string; at: LonLat; home?: boolean };
type Label = { text: string; at: LonLat; dx: number; dy: number; align: CanvasTextAlign };

// To add a place: add a pin here, a label in its inset, and its name to PLACE_GROUPS in content.ts.
const USA_PINS: Pin[] = [
  { name: "Milwaukee", at: [-87.91, 43.04], home: true },
  { name: "New York City", at: [-74.0, 40.71] },
  { name: "Boston", at: [-71.06, 42.36] },
  { name: "Salem", at: [-70.9, 42.52] },
  { name: "Maine", at: [-69.2, 45.0] },
  { name: "Miami", at: [-80.19, 25.76] },
  { name: "Fort Lauderdale", at: [-80.14, 26.12] },
  { name: "Fort Myers", at: [-81.87, 26.64] },
  { name: "Nashville", at: [-86.78, 36.16] },
  { name: "Iowa City", at: [-91.53, 41.66] },
  { name: "Dallas", at: [-96.8, 32.78] },
  { name: "Alpharetta", at: [-84.29, 34.08] },
  { name: "Marquette", at: [-87.4, 46.54] },
  { name: "Las Vegas", at: [-115.14, 36.17] },
  { name: "Scottsdale", at: [-111.93, 33.49] },
  { name: "Sedona", at: [-111.76, 34.87] },
  { name: "Denver", at: [-104.99, 39.74] },
  { name: "Aspen", at: [-106.82, 39.19] },
  { name: "Breckenridge", at: [-106.04, 39.48] },
  { name: "Vail", at: [-106.37, 39.64] },
];

// Labels show the obvious cities. Every other pin stays on the map and in the Places list.
const USA_LABELS: Label[] = [
  { text: "Milwaukee", at: [-87.91, 43.04], dx: 8, dy: -14, align: "right" },
  { text: "New York City", at: [-74.0, 40.71], dx: -14, dy: 24, align: "right" },
  { text: "Boston", at: [-71.06, 42.36], dx: -14, dy: 2, align: "right" },
  { text: "Maine", at: [-69.2, 45.0], dx: -14, dy: -4, align: "right" },
  { text: "Miami", at: [-80.19, 25.76], dx: -16, dy: 12, align: "right" },
  { text: "Nashville", at: [-86.78, 36.16], dx: -13, dy: 6, align: "right" },
  { text: "Dallas", at: [-96.8, 32.78], dx: 0, dy: 32, align: "center" },
  { text: "Las Vegas", at: [-115.14, 36.17], dx: -6, dy: -14, align: "center" },
  { text: "Scottsdale", at: [-111.93, 33.49], dx: 14, dy: 30, align: "center" },
  { text: "Denver", at: [-104.99, 39.74], dx: 14, dy: 8, align: "left" },
];

const CARIBBEAN_PINS: { at: LonLat; text: string; dy: number }[] = [
  { at: [-64.62, 18.43], text: "Tortola", dy: -6 },
  { at: [-62.72, 17.3], text: "St. Kitts and Nevis", dy: 26 },
];

const EUROPE_PINS: (Pin & { text: string; dx: number; dy: number; align: CanvasTextAlign })[] = [
  { at: [12.57, 55.68], text: "Copenhagen", dx: 14, dy: 8, align: "left" },
  { at: [11.58, 48.14], text: "Munich", dx: 14, dy: 0, align: "left" },
  { at: [8.54, 47.38], text: "Zurich", dx: -13, dy: 4, align: "right" },
  { at: [7.96, 46.54], text: "Jungfrau", dx: 2, dy: 32, align: "center" },
  { at: [11.4, 47.27], text: "Innsbruck", dx: 14, dy: 10, align: "left" },
  { at: [14.51, 46.06], text: "Ljubljana", dx: 14, dy: 2, align: "left" },
  { at: [14.09, 46.37], text: "Bled", dx: -12, dy: 2, align: "right" },
  { at: [13.57, 45.53], text: "Piran", dx: -12, dy: 18, align: "right" },
];

const regions = rawRegions as unknown as { europe: Feature[]; usa: Feature[] };

const INK = "#2b2418";
const OUTLINE = "#7a1f18";
const PIN = "#8c2f25";
const LEAD = "rgba(140,47,37,0.8)";

const countries = feature(topo, topo.objects.countries as GeometryCollection) as FeatureCollection;
const land = {
  type: "FeatureCollection",
  features: countries.features.filter((f) => f.properties?.name !== "Antarctica"),
} as FeatureCollection;
const isVisited = (f: Feature) => VISITED_COUNTRIES.includes(f.properties?.name);

const font = (px: number, weight = 600, family = "Barlow, Arial, sans-serif") => `${weight} ${px}px ${family}`;

function pin(c: CanvasRenderingContext2D, x: number, y: number, r: number, hollow = false) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = hollow ? "#ffffff" : PIN;
  c.fill();
  c.lineWidth = r * 0.5;
  c.strokeStyle = hollow ? PIN : "#ffffff";
  c.stroke();
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign, px: number) {
  c.font = font(px);
  c.textAlign = align;
  c.lineJoin = "round";
  c.lineWidth = px * 0.26;
  c.strokeStyle = "rgba(255,255,255,0.92)";
  c.strokeText(text, x, y);
  c.fillStyle = INK;
  c.fillText(text, x, y);
  c.textAlign = "left";
}

type Box = { x: number; y: number; w: number; h: number };

function leader(c: CanvasRenderingContext2D, from: number[], to: number[], u: number) {
  c.setLineDash([9 * u, 7 * u]);
  c.strokeStyle = LEAD;
  c.lineWidth = 2.5 * u;
  c.beginPath();
  c.moveTo(from[0], from[1]);
  c.lineTo(to[0], to[1]);
  c.stroke();
  c.setLineDash([]);
}

function ring(c: CanvasRenderingContext2D, x: number, y: number, text: string, u: number, align: CanvasTextAlign = "left", dy = -18) {
  c.beginPath();
  c.arc(x, y, 17 * u, 0, Math.PI * 2);
  c.strokeStyle = PIN;
  c.lineWidth = 5 * u;
  c.stroke();
  if (text) label(c, text, x + (align === "left" ? 24 : -24) * u, y + dy * u, align, 28 * u);
}

// Base map: Mapswire physical world map, CC BY. Mercator, 2000px wide, cropped to 1242px tall.
const BASE_W = 2000;
const BASE_H = 1242;
const BASE_EQUATOR = 823;
const base = new Image();
const baseReady = new Promise<void>((resolve) => {
  base.onload = () => resolve();
  base.onerror = () => resolve();
});
base.src = baseUrl;

const baseProjection = () =>
  geoMercator()
    .scale(BASE_W / (2 * Math.PI))
    .translate([BASE_W / 2, BASE_EQUATOR]);

function inset(c: CanvasRenderingContext2D, box: Box, u: number, west: number, east: number, north: number, shapes: Feature[], body: (p: GeoProjection) => void) {
  const src = baseProjection();
  const [x0, y0] = src([west, north])!;
  const x1 = src([east, north])![0];
  const zoom = box.w / (x1 - x0);
  const projection = geoMercator()
    .scale((BASE_W / (2 * Math.PI)) * zoom)
    .translate([box.x + (BASE_W / 2 - x0) * zoom, box.y + (BASE_EQUATOR - y0) * zoom]);
  c.save();
  c.beginPath();
  c.rect(box.x, box.y, box.w, box.h);
  c.clip();
  if (base.complete && base.naturalWidth) c.drawImage(base, x0, y0, x1 - x0, box.h / zoom, box.x, box.y, box.w, box.h);
  const path = geoPath(projection, c);
  shapes.forEach((f) => {
    c.beginPath();
    path(f);
    c.strokeStyle = isVisited(f) ? OUTLINE : "rgba(70,70,60,0.28)";
    c.lineWidth = (isVisited(f) ? 2 : 1) * u;
    c.stroke();
  });
  body(projection);
  c.restore();
  c.strokeStyle = "#ffffff";
  c.lineWidth = 7 * u;
  c.strokeRect(box.x, box.y, box.w, box.h);
  c.strokeStyle = "rgba(40,50,60,0.55)";
  c.lineWidth = 1.5 * u;
  c.strokeRect(box.x, box.y, box.w, box.h);
}

/** Draws the whole map, scaled to whatever canvas it is given. Aspect ratio is about 1.61. */
export function drawWorldMap(c: CanvasRenderingContext2D, selected?: string) {
  const { width: w, height: h } = c.canvas;
  const u = w / 2048;
  c.fillStyle = "#c4e4f6";
  c.fillRect(0, 0, w, h);
  if (base.complete && base.naturalWidth) c.drawImage(base, 0, 0, w, h);

  const k = w / BASE_W;
  const world = geoMercator()
    .scale((BASE_W / (2 * Math.PI)) * k)
    .translate([(BASE_W / 2) * k, BASE_EQUATOR * k]);
  const path = geoPath(world, c);

  c.beginPath();
  land.features.filter(isVisited).forEach((f) => path(f));
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2 * u;
  c.stroke();

  const usaBox: Box = { x: w * 0.015, y: h * 0.6, w: w * 0.25, h: h * 0.37 };
  const euroBox: Box = { x: w * 0.66, y: h * 0.62, w: w * 0.16, h: h * 0.35 };

  leader(c, world([-97, 36])!, [usaBox.x + usaBox.w * 0.5, usaBox.y], u);
  leader(c, world([11, 44])!, [euroBox.x + euroBox.w * 0.3, euroBox.y], u);

  [...USA_PINS, ...EUROPE_PINS].forEach((p) => {
    const [x, y] = world(p.at)!;
    pin(c, x, y, 5.5 * u);
  });
  CARIBBEAN_PINS.forEach((p) => {
    const [x, y] = world(p.at)!;
    pin(c, x, y, 7 * u);
    label(c, p.text, x + 16 * u, y + p.dy * u, "left", 27 * u);
    if (selected === p.text) ring(c, x, y, "", u);
  });

  const neighbors = countries.features.filter((f) => ["Canada", "Mexico"].includes(f.properties?.name));
  inset(c, usaBox, u, -126, -65, 49.5, [...neighbors, ...regions.usa], (usa) => {
    USA_PINS.forEach((p) => {
      const [x, y] = usa(p.at)!;
      pin(c, x, y, 7 * u, p.home);
    });
    USA_LABELS.forEach((l) => {
      const [x, y] = usa(l.at)!;
      label(c, l.text, x + l.dx * u, y + l.dy * u, l.align, 23 * u);
    });
    const hit = USA_PINS.find((p) => p.name === selected);
    if (hit) {
      const [x, y] = usa(hit.at)!;
      ring(c, x, y, hit.name!, u, x > usaBox.x + usaBox.w * 0.55 ? "right" : "left", y < usaBox.y + 44 * u ? -6 : -18);
    }
  });

  inset(c, euroBox, u, 3.2, 18.8, 56.8, regions.europe, (euro) => {
    EUROPE_PINS.forEach((p) => {
      const [x, y] = euro(p.at)!;
      pin(c, x, y, 7 * u);
    });
    EUROPE_PINS.forEach((p) => {
      const [x, y] = euro(p.at)!;
      label(c, p.text, x + p.dx * u, y + p.dy * u, p.align, 22 * u);
    });
    const hit = EUROPE_PINS.find((p) => p.text === selected);
    if (hit) {
      const [x, y] = euro(hit.at)!;
      ring(c, x, y, "", u);
    }
  });

  // Base map credit, required by the CC BY license
  c.fillStyle = "#17324f";
  c.font = font(19 * u, 400);
  c.textAlign = "right";
  c.fillText("Base map: Mapswire, CC BY", w - 18 * u, h - 14 * u);
  c.textAlign = "left";
}

export async function whenMapFontsReady() {
  await Promise.all([document.fonts.load("600 30px Barlow"), document.fonts.load("400 30px Barlow"), document.fonts.load('500 50px "Bodoni Moda"'), baseReady]);
}
