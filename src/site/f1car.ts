import * as THREE from "three";

type Section = [x: number, y: number, width: number, height: number];

/** Skins a smooth body over cross-sections placed along the car's length. */
export function loft(sections: Section[], steps = 60, ring = 28, squareness = 2.7) {
  const shape = new THREE.CatmullRomCurve3(sections.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const size = new THREE.CatmullRomCurve3(sections.map(([x, , w, h]) => new THREE.Vector3(x, w, h)));
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const power = 2 / squareness;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const c = shape.getPoint(t);
    const s = size.getPoint(t);
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      positions.push(
        c.x,
        c.y + (Math.sign(sin) * Math.abs(sin) ** power * Math.max(s.z, 0.001)) / 2,
        (Math.sign(cos) * Math.abs(cos) ** power * Math.max(s.y, 0.001)) / 2,
      );
      uvs.push(t, j / ring);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j;
      const b = a + ring + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const el = document.createElement("canvas");
  el.width = w;
  el.height = h;
  draw(el.getContext("2d")!);
  const t = new THREE.CanvasTexture(el);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A display model in an original red, white and carbon livery. Built in metres; nose points to +x. */
export function buildF1Car(env: THREE.Texture | null) {
  const car = new THREE.Group();
  const gloss = (color: number, roughness = 0.2, metalness = 0.15, side: THREE.Side = THREE.DoubleSide) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, side });
    m.envMap = env;
    m.envMapIntensity = 0.75;
    return m;
  };
  const add = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = car) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...p);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const carbon = gloss(0x101114, 0.38, 0.3);
  const red = gloss(0xc1121c);
  const white = gloss(0xf2f2ee, 0.25, 0.05);
  const steel = gloss(0xb9bec4, 0.3, 0.9);

  const liveryTex = canvasTex(1024, 512, (c) => {
    c.fillStyle = "#c1121c";
    c.fillRect(0, 0, 1024, 512);
    c.fillStyle = "#101114";
    c.fillRect(0, 60, 1024, 130);
    c.fillStyle = "#f2f2ee";
    c.fillRect(0, 355, 1024, 42);
    c.fillStyle = "#f2f2ee";
    c.fillRect(640, 200, 384, 12);
  });
  const livery = gloss(0xffffff);
  livery.map = liveryTex;

  add(
    loft([
      [-2.42, 0.42, 0.03, 0.05],
      [-2.2, 0.42, 0.13, 0.14],
      [-1.6, 0.46, 0.3, 0.32],
      [-0.9, 0.56, 0.42, 0.58],
      [-0.25, 0.62, 0.52, 0.72],
      [0.2, 0.5, 0.56, 0.5],
      [0.85, 0.42, 0.5, 0.36],
      [1.55, 0.33, 0.3, 0.24],
      [2.25, 0.25, 0.19, 0.14],
      [2.6, 0.21, 0.13, 0.08],
      [2.72, 0.2, 0.02, 0.02],
    ]),
    livery,
  );

  for (const side of [-1, 1]) {
    const pod = add(
      loft(
        [
          [-1.45, 0.3, 0.02, 0.04],
          [-1.2, 0.3, 0.14, 0.16],
          [-0.65, 0.33, 0.46, 0.36],
          [-0.1, 0.36, 0.6, 0.44],
          [0.3, 0.37, 0.58, 0.42],
          [0.42, 0.37, 0.56, 0.4],
        ],
        40,
        24,
        3,
      ),
      red,
      [0, 0, side * 0.5],
    );
    pod.rotation.y = side * -0.06;
    const inlet = add(new THREE.BoxGeometry(0.02, 0.32, 0.46), carbon, [0.43, 0.37, side * 0.52]);
    inlet.rotation.y = side * -0.06;

    // Suspension arms
    for (const [x, tyreX, y] of [
      [1.25, 1.75, 0.46],
      [1.45, 1.75, 0.24],
      [-1.3, -1.72, 0.48],
      [-1.5, -1.72, 0.26],
    ]) {
      const from = new THREE.Vector3(x, y, side * 0.14);
      const to = new THREE.Vector3(tyreX, y - 0.02, side * 0.64);
      const len = from.distanceTo(to);
      const arm = add(new THREE.CylinderGeometry(0.012, 0.012, len, 8), carbon);
      arm.position.copy(from.clone().add(to).multiplyScalar(0.5));
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    }

    // Mirrors
    add(new THREE.BoxGeometry(0.09, 0.05, 0.14), carbon, [0.55, 0.68, side * 0.46]);
    add(new THREE.BoxGeometry(0.02, 0.02, 0.2), carbon, [0.56, 0.64, side * 0.33]);
  }

  // Floor, with the plank running the length of the car
  const floor = new THREE.Shape();
  floor.moveTo(1.3, 0.28);
  floor.lineTo(0.5, 0.8);
  floor.lineTo(-1.35, 0.72);
  floor.lineTo(-1.6, 0.5);
  floor.lineTo(-1.6, -0.5);
  floor.lineTo(-1.35, -0.72);
  floor.lineTo(0.5, -0.8);
  floor.lineTo(1.3, -0.28);
  floor.closePath();
  const floorMesh = add(new THREE.ExtrudeGeometry(floor, { depth: 0.035, bevelEnabled: false }), carbon, [0, 0.1, 0]);
  floorMesh.rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.75, 0.16, 1.1), carbon, [-1.95, 0.2, 0]);

  // Cockpit, driver and halo
  add(new THREE.BoxGeometry(0.72, 0.02, 0.36), gloss(0x050506, 0.6, 0), [0.42, 0.655, 0]);
  const helmet = add(new THREE.SphereGeometry(0.135, 28, 20), white, [0.28, 0.77, 0]);
  helmet.scale.set(1.1, 1, 0.92);
  const visor = add(new THREE.SphereGeometry(0.137, 28, 12, 0, Math.PI, 1.18, 0.5), gloss(0x0b0c10, 0.08, 0.5), [0.28, 0.77, 0]);
  visor.rotation.y = Math.PI / 2;
  visor.scale.set(0.92, 1, 1.1);
  add(new THREE.BoxGeometry(0.1, 0.34, 0.13), carbon, [-0.32, 0.92, 0]);
  const halo = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.68, 0.27),
    new THREE.Vector3(0.25, 0.9, 0.27),
    new THREE.Vector3(0.62, 0.95, 0.15),
    new THREE.Vector3(0.72, 0.95, 0),
    new THREE.Vector3(0.62, 0.95, -0.15),
    new THREE.Vector3(0.25, 0.9, -0.27),
    new THREE.Vector3(-0.15, 0.68, -0.27),
  ]);
  add(new THREE.TubeGeometry(halo, 60, 0.03, 10), carbon);
  const pylon = add(new THREE.CylinderGeometry(0.03, 0.05, 0.42, 10), carbon, [0.78, 0.74, 0]);
  pylon.rotation.z = -0.1;

  // Airbox and shark fin
  add(new THREE.BoxGeometry(0.06, 0.16, 0.2), gloss(0x050506, 0.5, 0), [-0.27, 0.92, 0]);
  const fin = new THREE.Shape();
  fin.moveTo(-0.45, 0);
  fin.lineTo(-2.1, 0);
  fin.lineTo(-2.1, 0.32);
  fin.quadraticCurveTo(-1.2, 0.22, -0.45, 0);
  add(new THREE.ExtrudeGeometry(fin, { depth: 0.012, bevelEnabled: false }), red, [0, 0.73, -0.006]);

  // Front wing
  const elementY = [
    [0.1, 0.34, 0.0],
    [0.15, 0.2, 0.16],
    [0.2, 0.14, 0.26],
  ];
  elementY.forEach(([y, chord, back], i) => {
    const m = i === 0 ? carbon : i === 1 ? white : red;
    const w = add(new THREE.BoxGeometry(chord, 0.016, 1.95), m, [2.42 - back, y, 0]);
    w.rotation.z = 0.08 + i * 0.1;
  });
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.62, 0.24, 0.016), white, [2.25, 0.17, side * 0.98]);
    add(new THREE.BoxGeometry(0.28, 0.2, 0.012), carbon, [2.45, 0.17, side * 0.1]);
  }

  // Rear wing
  const endPlateTex = canvasTex(256, 256, (c) => {
    c.fillStyle = "#c1121c";
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = "#101114";
    c.fillRect(0, 196, 256, 60);
    c.fillStyle = "#f2f2ee";
    c.textAlign = "center";
    c.font = "800 128px Barlow, Arial, sans-serif";
    c.fillText("68", 128, 150);
  });
  const endPlate = gloss(0xffffff, 0.25, 0.1, THREE.FrontSide);
  endPlate.map = endPlateTex;
  for (const side of [-1, 1]) {
    const plate = add(new THREE.BoxGeometry(0.72, 0.62, 0.018), [carbon, carbon, carbon, carbon, endPlate, endPlate], [-2.2, 0.76, side * 0.5]);
    plate.rotation.y = side > 0 ? 0 : Math.PI;
    add(new THREE.BoxGeometry(0.05, 0.42, 0.02), carbon, [-2.1, 0.55, side * 0.09]);
  }
  const main = add(new THREE.BoxGeometry(0.34, 0.03, 1.0), carbon, [-2.2, 0.92, 0]);
  main.rotation.z = 0.12;
  const flap = add(new THREE.BoxGeometry(0.17, 0.018, 1.0), white, [-2.38, 1.02, 0]);
  flap.rotation.z = 0.45;
  add(new THREE.BoxGeometry(0.12, 0.05, 1.0), carbon, [-2.22, 0.5, 0]);

  // Wheels
  const wheel = (x: number, z: number, width: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.36, z);
    g.rotation.x = Math.PI / 2;
    car.add(g);
    const tyre = new THREE.LatheGeometry(
      [
        [0.2, -width / 2],
        [0.3, -width / 2],
        [0.345, -width / 2 + 0.03],
        [0.36, -width / 2 + 0.09],
        [0.36, width / 2 - 0.09],
        [0.345, width / 2 - 0.03],
        [0.3, width / 2],
        [0.2, width / 2],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    );
    add(tyre, gloss(0x141416, 0.7, 0), [0, 0, 0], g);
    for (const face of [-1, 1]) {
      const stripe = add(new THREE.RingGeometry(0.27, 0.285, 48), gloss(0xe4c21f, 0.45, 0), [0, face * (width / 2 + 0.002), 0], g);
      stripe.rotation.x = (face * Math.PI) / 2;
      const rim = add(new THREE.CircleGeometry(0.2, 32), gloss(0x24262a, 0.3, 0.8), [0, face * (width / 2 - 0.02), 0], g);
      rim.rotation.x = (-face * Math.PI) / 2;
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * Math.PI * 2;
        const spoke = add(new THREE.BoxGeometry(0.17, 0.008, 0.028), steel, [Math.cos(a) * 0.1, face * (width / 2 - 0.012), Math.sin(a) * 0.1], g);
        spoke.rotation.y = -a;
      }
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14), steel, [0, face * (width / 2 - 0.006), 0], g);
    }
  };
  for (const side of [-1, 1]) {
    wheel(1.75, side * 0.8, 0.34);
    wheel(-1.72, side * 0.78, 0.44);
  }
  return car;
}
