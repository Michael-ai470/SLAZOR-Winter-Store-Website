// Procedural garments + hangers for the clothes rail.
// Every garment hangs from its hanger with its front facing +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SHOULDER_Y = -0.42; // where garments sit on the hanger (relative to the rail)

function shade(hex, amount) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return c;
}

// Scale a geometry's width from bottom to top (A-line / taper silhouettes).
function taperX(geo, top, bottom) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const h = max.y - min.y;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - min.y) / h;
    p.setX(i, p.getX(i) * (bottom + (top - bottom) * t));
  }
  p.needsUpdate = true;
  return geo;
}

// Knit stitch texture, drawn once on a canvas and shared.
let knitTex = null;
function knitTexture() {
  if (knitTex) return knitTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#a9a9a9';
  x.fillRect(0, 0, size, size);
  const cell = 8;
  for (let col = 0; col < size / cell; col++) {
    for (let row = 0; row < size / cell; row++) {
      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2;
      for (const side of [-1, 1]) {
        const g = x.createLinearGradient(cx + side * 4, cy - 4, cx, cy + 4);
        g.addColorStop(0, '#d8d8d8');
        g.addColorStop(1, '#ffffff');
        x.fillStyle = g;
        x.beginPath();
        x.ellipse(cx + side * 1.9, cy, 2.1, 4.4, -side * 0.5, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  knitTex = new THREE.CanvasTexture(c);
  knitTex.wrapS = knitTex.wrapT = THREE.RepeatWrapping;
  knitTex.repeat.set(3, 3);
  knitTex.colorSpace = THREE.SRGBColorSpace;
  knitTex.anisotropy = 4;
  return knitTex;
}

/* ---------------- Hanger ---------------- */

// The hook wraps around the rail; it does not turn with the garment.
export function makeHook(metal) {
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.011, 8, 32, Math.PI * 1.5), metal);
  hook.rotation.y = Math.PI / 2; // hook plane perpendicular to the rail
  hook.castShadow = true;
  return hook;
}

// Neck + wooden shoulder bar; turns together with the garment.
export function makeHangerBody(wood, metal) {
  const g = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 8), metal);
  neck.position.y = -0.14;
  g.add(neck);

  const v = (x, y) => new THREE.Vector3(x, y, 0);
  const curve = new THREE.CatmullRomCurve3([v(-0.42, -0.44), v(-0.26, -0.34), v(0, -0.22), v(0.26, -0.34), v(0.42, -0.44)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.022, 10, false), wood));
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), wood);
    cap.position.set(s * 0.42, -0.44, 0);
    g.add(cap);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------------- Garments ---------------- */

function puffer(color, { length = 'short', hood = false } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.5, sheen: 0.8, sheenRoughness: 0.4, sheenColor: shade(color, 0.25),
    clearcoat: 0.2, clearcoatRoughness: 0.6,
  });
  const long = length === 'long';
  const n = long ? 8 : 5;
  const segH = 0.19;
  const W = 0.8;
  const D = 0.36;

  // Quilted baffles, stacked from the shoulders down.
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = i === 0 ? W * 0.9 : W * (1 + 0.04 * Math.sin(t * Math.PI)) * (long ? 1 + 0.06 * t : 1);
    const geo = new RoundedBoxGeometry(w, segH * 1.12, D * (i === 0 ? 0.92 : 1), 3, segH * 0.5);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = SHOULDER_Y - segH * (i + 0.5);
    g.add(m);
  }

  // Quilted sleeves.
  const ball = new THREE.SphereGeometry(0.12, 20, 14);
  const sleeveSegs = long ? 5 : 4;
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Group();
    sleeve.position.set(s * 0.38, SHOULDER_Y - 0.08, 0);
    sleeve.rotation.z = s * 0.06;
    for (let j = 0; j < sleeveSegs; j++) {
      const m = new THREE.Mesh(ball, mat);
      m.position.y = -0.165 * j - 0.04;
      m.scale.set(1 - j * 0.03, 0.95, 1 - j * 0.03);
      sleeve.add(m);
    }
    g.add(sleeve);
  }

  // Collar (or hood).
  if (hood) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    h.scale.set(1, 0.85, 0.75);
    h.rotation.x = -0.5;
    h.position.set(0, SHOULDER_Y - 0.02, -0.1);
    g.add(h);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.065, 12, 28), mat);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.8, 1);
  collar.position.set(0, SHOULDER_Y - 0.02, 0.02);
  g.add(collar);

  // Zip.
  const zip = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, n * segH, 0.012),
    new THREE.MeshStandardMaterial({ color: shade(color, -0.35), roughness: 0.4, metalness: 0.3 })
  );
  zip.position.set(0, SHOULDER_Y - (n * segH) / 2, D / 2 + 0.004);
  g.add(zip);
  return g;
}

function knit(color, { turtle = false } = {}) {
  const g = new THREE.Group();
  const tex = knitTexture();
  const mat = new THREE.MeshStandardMaterial({ color: shade(color, 0.1), map: tex, bumpMap: tex, bumpScale: 2, roughness: 0.95 });
  const bodyH = 0.82;

  const body = new THREE.Mesh(taperX(new RoundedBoxGeometry(0.78, bodyH, 0.2, 3, 0.07), 1.06, 0.94), mat);
  body.position.y = SHOULDER_Y - bodyH / 2;
  g.add(body);

  const hem = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.09, 0.21, 2, 0.03), mat);
  hem.position.y = SHOULDER_Y - bodyH - 0.02;
  g.add(hem);

  const sleeveGeo = new THREE.CapsuleGeometry(0.09, 0.62, 6, 16);
  const cuffGeo = new THREE.CylinderGeometry(0.084, 0.084, 0.08, 18);
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Group();
    sleeve.position.set(s * 0.39, SHOULDER_Y - 0.06, 0);
    sleeve.rotation.z = s * 0.07;
    const arm = new THREE.Mesh(sleeveGeo, mat);
    arm.position.y = -0.36;
    const cuff = new THREE.Mesh(cuffGeo, mat);
    cuff.position.y = -0.76;
    sleeve.add(arm, cuff);
    g.add(sleeve);
  }

  if (turtle) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 24), mat);
    neck.position.y = SHOULDER_Y + 0.02;
    neck.scale.z = 0.8;
    g.add(neck);
  } else {
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 28), mat);
    neck.rotation.x = Math.PI / 2;
    neck.scale.set(1, 0.75, 1);
    neck.position.y = SHOULDER_Y - 0.01;
    g.add(neck);
  }
  return g;
}

function coat(color, { length = 1.5, belt = false } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 0.5, sheenRoughness: 0.8, sheenColor: shade(color, 0.2) });
  const trim = new THREE.MeshStandardMaterial({ color: shade(color, -0.1), roughness: 0.8 });
  const L = length;
  const front = 0.12;

  const body = new THREE.Mesh(taperX(new RoundedBoxGeometry(0.8, L, 0.24, 3, 0.06), 0.96, 1.14), mat);
  body.position.y = SHOULDER_Y - L / 2;
  g.add(body);

  // Lapels forming a V.
  for (const s of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.02), trim);
    lapel.position.set(s * 0.1, SHOULDER_Y - 0.2, front + 0.008);
    lapel.rotation.z = -s * 0.3;
    g.add(lapel);
  }

  // Double-breasted buttons.
  const btnGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.35 });
  for (let r = 0; r < 3; r++) {
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(btnGeo, btnMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(s * 0.08, SHOULDER_Y - 0.5 - r * 0.17, front + 0.01);
      g.add(b);
    }
  }

  // Pocket flaps.
  for (const s of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.015), trim);
    flap.position.set(s * 0.24, SHOULDER_Y - 1.0, front + 0.012);
    g.add(flap);
  }

  if (belt) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.07, 0.27, 2, 0.02), trim);
    b.position.y = SHOULDER_Y - 0.62;
    g.add(b);
  }

  const sleeveGeo = new THREE.CapsuleGeometry(0.095, 0.7, 6, 16);
  for (const s of [-1, 1]) {
    const sleeve = new THREE.Group();
    sleeve.position.set(s * 0.41, SHOULDER_Y - 0.06, 0);
    sleeve.rotation.z = s * 0.05;
    const arm = new THREE.Mesh(sleeveGeo, mat);
    arm.position.y = -0.42;
    sleeve.add(arm);
    g.add(sleeve);
  }
  return g;
}

export function buildGarment(product) {
  const opts = product.options || {};
  let g;
  if (product.type === 'puffer') g = puffer(product.color, opts);
  else if (product.type === 'knit') g = knit(product.color, opts);
  else g = coat(product.color, opts);
  g.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return g;
}
