import { geoAlbers, geoEqualEarth, geoGraticule10, geoMercator, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";
import topo from "world-atlas/countries-110m.json";
import rawRegions from "./regions.json";

export const VISITED_COUNTRIES = ["United States of America", "Switzerland", "Germany", "Austria", "Slovenia", "Denmark"];

type LonLat = [number, number];
type Pin = { at: LonLat; home?: boolean };
type Label = { text: string; at: LonLat; dx: number; dy: number; align: CanvasTextAlign };

// To add a place: add a pin here, a label in its inset, and its name to PLACE_GROUPS in content.ts.
const USA_PINS: Pin[] = [
  { at: [-87.91, 43.04], home: true },
  { at: [-74.0, 40.71] },
  { at: [-71.06, 42.36] },
  { at: [-70.9, 42.52] },
  { at: [-69.2, 45.0] },
  { at: [-80.19, 25.76] },
  { at: [-80.14, 26.12] },
  { at: [-81.87, 26.64] },
  { at: [-86.78, 36.16] },
  { at: [-91.53, 41.66] },
  { at: [-115.14, 36.17] },
  { at: [-111.93, 33.49] },
  { at: [-111.76, 34.87] },
  { at: [-106.82, 39.19] },
  { at: [-106.04, 39.48] },
  { at: [-106.37, 39.64] },
];

const USA_LABELS: Label[] = [
  { text: "Milwaukee", at: [-87.91, 43.04], dx: 8, dy: -14, align: "right" },
  { text: "New York City", at: [-74.0, 40.71], dx: -14, dy: 24, align: "right" },
  { text: "Boston, Salem", at: [-71.06, 42.36], dx: -14, dy: 2, align: "right" },
  { text: "Maine", at: [-69.2, 45.0], dx: -14, dy: -4, align: "right" },
  { text: "Miami, Fort Lauderdale", at: [-80.19, 25.76], dx: -16, dy: 26, align: "right" },
  { text: "Fort Myers", at: [-81.87, 26.64], dx: -14, dy: -2, align: "right" },
  { text: "Nashville", at: [-86.78, 36.16], dx: 0, dy: 32, align: "center" },
  { text: "Iowa City", at: [-91.53, 41.66], dx: -8, dy: 28, align: "center" },
  { text: "Las Vegas", at: [-115.14, 36.17], dx: -6, dy: -14, align: "center" },
  { text: "Scottsdale, Sedona", at: [-111.93, 33.49], dx: 14, dy: 30, align: "center" },
  { text: "Aspen, Vail, Breckenridge", at: [-106.37, 39.64], dx: -24, dy: -18, align: "center" },
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
const PAPER = "#efe6d0";
const LAND = "#9d8b5e";
const VISITED = "#a8701a";
const PIN = "#8c2f25";
const LEAD = "rgba(140,47,37,0.75)";

const countries = feature(topo, topo.objects.countries as GeometryCollection) as FeatureCollection;
const land = {
  type: "FeatureCollection",
  features: countries.features.filter((f) => f.properties?.name !== "Antarctica"),
} as FeatureCollection;
const borders = mesh(topo, topo.objects.countries as GeometryCollection, (a, b) => a !== b);
const isVisited = (f: Feature) => VISITED_COUNTRIES.includes(f.properties?.name);

const font = (px: number, weight = 600, family = "Barlow, Arial, sans-serif") => `${weight} ${px}px ${family}`;

function pin(c: CanvasRenderingContext2D, x: number, y: number, r: number, hollow = false) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = hollow ? PAPER : PIN;
  c.fill();
  c.lineWidth = r * 0.5;
  c.strokeStyle = hollow ? PIN : PAPER;
  c.stroke();
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign, px: number) {
  c.font = font(px);
  c.textAlign = align;
  c.lineJoin = "round";
  c.lineWidth = px * 0.26;
  c.strokeStyle = "rgba(239,230,208,0.94)";
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

function inset(c: CanvasRenderingContext2D, box: Box, u: number, projection: GeoProjection, shapes: Feature[], body: () => void) {
  c.save();
  c.beginPath();
  c.rect(box.x, box.y, box.w, box.h);
  c.clip();
  c.fillStyle = "#e4e2d2";
  c.fillRect(box.x, box.y, box.w, box.h);
  const path = geoPath(projection, c);
  shapes.forEach((f) => {
    c.beginPath();
    path(f);
    c.fillStyle = isVisited(f) ? VISITED : LAND;
    c.fill();
    c.strokeStyle = "rgba(90,75,45,0.45)";
    c.lineWidth = 1.6 * u;
    c.stroke();
  });
  body();
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 3 * u;
  c.strokeRect(box.x, box.y, box.w, box.h);
}

/** Draws the whole map, scaled to whatever canvas it is given. Aspect ratio is about 1.6. */
export function drawWorldMap(c: CanvasRenderingContext2D) {
  const { width: w, height: h } = c.canvas;
  const u = w / 2048;
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);

  const footer = 130 * u;
  const pad = 34 * u;
  const world = geoEqualEarth().fitExtent(
    [
      [pad, pad],
      [w - pad, h - footer],
    ],
    land,
  );
  const path = geoPath(world, c);

  c.beginPath();
  path(geoGraticule10());
  c.strokeStyle = "rgba(90,75,45,0.13)";
  c.lineWidth = 1.5 * u;
  c.stroke();

  c.beginPath();
  land.features.forEach((f) => path(f));
  c.fillStyle = LAND;
  c.fill();

  c.beginPath();
  land.features.filter(isVisited).forEach((f) => path(f));
  c.fillStyle = VISITED;
  c.fill();

  c.beginPath();
  path(borders);
  c.strokeStyle = "rgba(90,75,45,0.4)";
  c.lineWidth = 1.2 * u;
  c.stroke();

  const usaBox: Box = { x: w * 0.012, y: h * 0.53, w: w * 0.3, h: h * 0.36 };
  const euroBox: Box = { x: w * 0.6, y: h * 0.5, w: w * 0.215, h: h * 0.39 };

  leader(c, world([-97, 36])!, [usaBox.x + usaBox.w * 0.5, usaBox.y], u);
  leader(c, world([11, 50])!, [euroBox.x + euroBox.w * 0.3, euroBox.y], u);

  [...USA_PINS, ...EUROPE_PINS].forEach((p) => {
    const [x, y] = world(p.at)!;
    pin(c, x, y, 5.5 * u);
  });
  CARIBBEAN_PINS.forEach((p) => {
    const [x, y] = world(p.at)!;
    pin(c, x, y, 7 * u);
    label(c, p.text, x + 16 * u, y + p.dy * u, "left", 27 * u);
  });

  const usa = geoAlbers().fitExtent(
    [
      [usaBox.x + 14 * u, usaBox.y + 34 * u],
      [usaBox.x + usaBox.w - 14 * u, usaBox.y + usaBox.h - 26 * u],
    ],
    { type: "MultiPoint", coordinates: [[-124.7, 48.4], [-67, 47], [-97.4, 25], [-120, 34], [-81, 25]] },
  );
  const neighbors = countries.features.filter((f) => ["Canada", "Mexico"].includes(f.properties?.name));
  inset(c, usaBox, u, usa, [...neighbors, ...regions.usa], () => {
    USA_PINS.forEach((p) => {
      const [x, y] = usa(p.at)!;
      pin(c, x, y, 7 * u, p.home);
    });
    USA_LABELS.forEach((l) => {
      const [x, y] = usa(l.at)!;
      label(c, l.text, x + l.dx * u, y + l.dy * u, l.align, 23 * u);
    });
  });

  const euro = geoMercator().fitExtent(
    [
      [euroBox.x + 8 * u, euroBox.y + 20 * u],
      [euroBox.x + euroBox.w - 8 * u, euroBox.y + euroBox.h - 28 * u],
    ],
    { type: "MultiPoint", coordinates: [[6.2, 44.9], [19.2, 56.4]] },
  );
  inset(c, euroBox, u, euro, regions.europe, () => {
    EUROPE_PINS.forEach((p) => {
      const [x, y] = euro(p.at)!;
      pin(c, x, y, 7 * u);
    });
    EUROPE_PINS.forEach((p) => {
      const [x, y] = euro(p.at)!;
      label(c, p.text, x + p.dx * u, y + p.dy * u, p.align, 24 * u);
    });
  });

  // Footer
  const fy = h - footer + 66 * u;
  c.fillStyle = INK;
  c.font = font(58 * u, 500, '"Bodoni Moda", Georgia, serif');
  c.fillText("Where I've been", pad + 12 * u, fy + 12 * u);
  c.font = font(33 * u, 400);
  pin(c, w * 0.68, fy - 4 * u, 10 * u, true);
  c.fillStyle = INK;
  c.fillText("Home", w * 0.68 + 24 * u, fy + 8 * u);
  pin(c, w * 0.8, fy - 4 * u, 10 * u);
  c.fillStyle = INK;
  c.font = font(33 * u, 400);
  c.fillText("Been there", w * 0.8 + 24 * u, fy + 8 * u);
}

export async function whenMapFontsReady() {
  await Promise.all([document.fonts.load("600 30px Barlow"), document.fonts.load("400 30px Barlow"), document.fonts.load('500 50px "Bodoni Moda"')]);
}
