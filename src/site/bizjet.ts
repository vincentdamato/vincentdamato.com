import * as THREE from "three";
import { loft } from "./f1car";

type Span = (s: number, chord: number, thick: number) => [number, number, number];

/** A tapered lifting surface. The callback places each point along its span. */
function surface(root: number, tip: number, thickness: number, place: Span) {
  const g = new THREE.BoxGeometry(1, 1, 1, 18, 2, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const s = p.getX(i) + 0.5;
    const c = p.getZ(i);
    const edge = 1 - (2 * Math.abs(c)) ** 2;
    const chord = root + (tip - root) * s;
    const thick = p.getY(i) * thickness * (1 - 0.55 * s) * Math.max(edge, 0.08);
    const [x, y, z] = place(s, c * chord, thick);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Long-range business jet display model, built in metres at real proportions. Nose points to +x. */
export function buildBizJet(env: THREE.Texture | null) {
  const jet = new THREE.Group();
  const paint = (color: number, roughness = 0.22, metalness = 0.1) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
    m.envMap = env;
    m.envMapIntensity = 0.8;
    return m;
  };
  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number] = [0, 0, 0]) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(...p);
    o.castShadow = true;
    jet.add(o);
    return o;
  };
  const white = paint(0xf3f3ef);
  const navy = paint(0x14233f);
  const metal = paint(0xb7bcc2, 0.3, 0.85);

  const el = document.createElement("canvas");
  el.width = 2048;
  el.height = 512;
  const c = el.getContext("2d")!;
  c.fillStyle = "#f3f3ef";
  c.fillRect(0, 0, 2048, 512);
  // u runs tail to nose. v runs around the body, so each side gets its own pass.
  for (const base of [0, 0.5]) {
    const flip = base === 0 ? 1 : -1;
    const lineV = base === 0 ? 0.0 : 0.5;
    const cy = (1 - ((lineV + 1) % 1)) * 512;
    c.fillStyle = "#14233f";
    c.fillRect(0, (cy % 512) - 14, 2048, 28);
    if (base === 0) c.fillRect(0, 498, 2048, 14);
    c.fillStyle = "#b08a3c";
    c.fillRect(0, ((cy % 512) + 16) % 512, 2048, 5);
    const winV = base === 0 ? 0.045 : 0.455;
    const wy = (1 - winV) * 512;
    c.fillStyle = "#10151d";
    for (let i = 0; i < 16; i++) {
      const x = 800 + i * 52;
      c.beginPath();
      c.ellipse(x, wy, 15, 10, 0, 0, Math.PI * 2);
      c.fill();
    }
    void flip;
  }
  c.fillStyle = "#0d1117";
  for (const v of [0.09, 0.41]) c.fillRect(1800, (1 - v) * 512 - 24, 66, 34);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapT = THREE.RepeatWrapping;
  const skin = paint(0xffffff);
  skin.map = tex;

  add(
    loft(
      [
        [-17.2, 1.15, 0.2, 0.3],
        [-14.5, 0.95, 1.1, 1.3],
        [-11, 0.55, 2.2, 2.45],
        [-7, 0.25, 2.8, 2.95],
        [0, 0.2, 3.0, 3.1],
        [8, 0.2, 3.0, 3.1],
        [12, 0.15, 2.75, 2.8],
        [14.5, 0.0, 2.05, 2.05],
        [16.1, -0.2, 1.05, 1.05],
        [16.9, -0.28, 0.1, 0.1],
      ],
      90,
      32,
      2,
    ),
    skin,
  );

  // Swept wings with raked winglets
  for (const side of [-1, 1]) {
    const span = 15.8;
    add(
      surface(6.8, 1.5, 0.75, (s, ch, th) => [1.6 - s * 8.6 + ch, -0.95 + s * 1.2 + th, side * (1 + s * span)]),
      white,
    );
    add(
      surface(1.5, 0.45, 0.14, (s, ch, th) => [-7.0 - s * 1.9 + ch, 0.25 + s * 2.2, side * (16.8 + s * 0.5) + th]),
      navy,
    );

    // Rear engines
    add(
      loft(
        [
          [-12.6, 0, 0.25, 0.25],
          [-11.8, 0, 1.3, 1.3],
          [-9.4, 0, 1.8, 1.8],
          [-7.4, 0, 1.75, 1.75],
          [-7.1, 0, 1.45, 1.45],
        ],
        30,
        24,
        2,
      ),
      navy,
      [0, 1.1, side * 2.85],
    );
    add(new THREE.CylinderGeometry(0.72, 0.72, 0.1, 24), metal, [-7.08, 1.1, side * 2.85]).rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(2.4, 0.22, 1.5), white, [-10, 1.0, side * 1.75]);
  }

  // T-tail
  add(surface(5.6, 3.0, 0.38, (s, ch, th) => [-12.2 - s * 4.2 + ch, 1.7 + s * 5.2, th]), navy);
  for (const side of [-1, 1]) {
    add(surface(2.7, 1.2, 0.2, (s, ch, th) => [-16.4 - s * 2.0 + ch, 6.85 + th, side * s * 5.1]), white);
  }
  return jet;
}
