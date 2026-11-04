import { geoEqualEarth, geoGraticule10, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection } from "topojson-specification";
import topo from "world-atlas/countries-110m.json";
import alps from "./alps.json";

// Add a place here and it appears on the wall map and in the Places panel.
export const VISITED_COUNTRIES = ["United States of America", "Switzerland", "Germany", "Austria", "Slovenia"];

type Place = { name: string; at: [number, number]; next?: boolean };

const AMERICA: (Place & { dx: number; dy: number; align: CanvasTextAlign })[] = [
  { name: "Milwaukee", at: [-87.91, 43.04], dx: 18, dy: 30, align: "left" },
  { name: "Michigan dunes", at: [-86.07, 44.88], dx: 18, dy: -14, align: "left", next: true },
  { name: "Colorado", at: [-105.5, 39.0], dx: -16, dy: -6, align: "right" },
  { name: "Scottsdale", at: [-111.93, 33.49], dx: -16, dy: 26, align: "right" },
];

const EUROPE: (Place & { dx: number; dy: number; align: CanvasTextAlign })[] = [
  { name: "Munich", at: [11.58, 48.14], dx: 14, dy: -8, align: "left" },
  { name: "Zurich", at: [8.54, 47.38], dx: 12, dy: -10, align: "left" },
  { name: "Innsbruck", at: [11.4, 47.27], dx: 14, dy: 12, align: "left" },
  { name: "Ljubljana", at: [14.51, 46.06], dx: 14, dy: 0, align: "left" },
  { name: "Piran", at: [13.57, 45.53], dx: -12, dy: 22, align: "right" },
];

const INK = "#2b2418";
const PAPER = "#efe6d0";
const LAND = "#9d8b5e";
const VISITED = "#a8701a";
const PIN = "#8c2f25";

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
  c.strokeStyle = "rgba(239,230,208,0.92)";
  c.strokeText(text, x, y);
  c.fillStyle = INK;
  c.fillText(text, x, y);
  c.textAlign = "left";
}

/** Draws the whole map, scaled to whatever canvas it is given. Aspect ratio is about 1.6. */
export function drawWorldMap(c: CanvasRenderingContext2D) {
  const { width: w, height: h } = c.canvas;
  const u = w / 2048;
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);

  const footer = 150 * u;
  const pad = 40 * u;
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

  // United States pins
  AMERICA.forEach((p) => {
    const [x, y] = world(p.at)!;
    pin(c, x, y, 9 * u, p.next);
  });
  AMERICA.forEach((p) => {
    const [x, y] = world(p.at)!;
    label(c, p.name, x + p.dx * u, y + p.dy * u, p.align, 31 * u);
  });

  // Central Europe is too tight at world scale, so it gets its own inset.
  const box = { x: w * 0.6, y: h * 0.56, w: w * 0.235, h: h * 0.3 };
  const [ex, ey] = world([11, 47])!;
  c.setLineDash([9 * u, 7 * u]);
  c.strokeStyle = PIN;
  c.lineWidth = 2.5 * u;
  c.beginPath();
  c.moveTo(ex, ey);
  c.lineTo(box.x + box.w * 0.35, box.y);
  c.stroke();
  c.setLineDash([]);
  pin(c, ex, ey, 8 * u);

  c.save();
  c.beginPath();
  c.rect(box.x, box.y, box.w, box.h);
  c.clip();
  c.fillStyle = "#e4e2d2";
  c.fillRect(box.x, box.y, box.w, box.h);
  const zoom = geoMercator().fitExtent(
    [
      [box.x - 10 * u, box.y - 10 * u],
      [box.x + box.w + 10 * u, box.y + box.h + 10 * u],
    ],
    { type: "MultiPoint", coordinates: [[6.6, 44.4], [18.2, 49.4]] },
  );
  const zoomPath = geoPath(zoom, c);
  (alps as FeatureCollection).features.forEach((f) => {
    c.beginPath();
    zoomPath(f);
    c.fillStyle = isVisited(f) ? VISITED : LAND;
    c.fill();
    c.strokeStyle = "rgba(90,75,45,0.45)";
    c.lineWidth = 1.6 * u;
    c.stroke();
  });
  EUROPE.forEach((p) => {
    const [x, y] = zoom(p.at)!;
    pin(c, x, y, 8 * u);
  });
  EUROPE.forEach((p) => {
    const [x, y] = zoom(p.at)!;
    label(c, p.name, x + p.dx * u, y + p.dy * u, p.align, 27 * u);
  });
  c.restore();
  c.strokeStyle = INK;
  c.lineWidth = 3 * u;
  c.strokeRect(box.x, box.y, box.w, box.h);

  // Footer
  const fy = h - footer + 62 * u;
  c.fillStyle = INK;
  c.font = font(58 * u, 500, '"Bodoni Moda", Georgia, serif');
  c.fillText("Where I've been", pad + 12 * u, fy + 12 * u);
  pin(c, w * 0.62, fy - 4 * u, 10 * u);
  c.font = font(33 * u, 400);
  c.fillStyle = INK;
  c.fillText("Been there", w * 0.62 + 24 * u, fy + 8 * u);
  pin(c, w * 0.78, fy - 4 * u, 10 * u, true);
  c.fillStyle = INK;
  c.font = font(33 * u, 400);
  c.fillText("Next on the list", w * 0.78 + 24 * u, fy + 8 * u);
}

export async function whenMapFontsReady() {
  await Promise.all([document.fonts.load('600 30px Barlow'), document.fonts.load('400 30px Barlow'), document.fonts.load('500 50px "Bodoni Moda"')]);
}
