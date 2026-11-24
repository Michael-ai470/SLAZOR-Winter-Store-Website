import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildGarment, makeHook, makeHangerBody } from './garments.js';

/* =========================================================
   PRODUCTS: edit names, prices, garment types and colours here.
   type: 'puffer' | 'knit' | 'coat'
   ========================================================= */
const PRODUCTS = [
  { name: 'Summit Puffer',      price: '$240', type: 'puffer', color: '#ff6a3d', options: { hood: true } },
  { name: 'Fjord Rib Knit',     price: '$120', type: 'knit',   color: '#f1e6d2' },
  { name: 'Harbour Wool Coat',  price: '$310', type: 'coat',   color: '#2b3a55', options: { length: 1.55 } },
  { name: 'Glacier Puffer',     price: '$260', type: 'puffer', color: '#1f7a7a' },
  { name: 'Moss Turtleneck',    price: '$110', type: 'knit',   color: '#7f9a7a', options: { turtle: true } },
  { name: 'Camel Belted Coat',  price: '$340', type: 'coat',   color: '#c49a6c', options: { belt: true, length: 1.45 } },
  { name: 'Snowline Long Down', price: '$380', type: 'puffer', color: '#f4f6f8', options: { length: 'long', hood: true } },
  { name: 'Butter Crew Knit',   price: '$115', type: 'knit',   color: '#f2cf6b' },
  { name: 'Charcoal Overcoat',  price: '$295', type: 'coat',   color: '#3d3f45', options: { length: 1.6 } },
  { name: 'Rosehip Puffer',     price: '$230', type: 'puffer', color: '#e98a9b' },
  { name: 'Ice Blue Knit',      price: '$125', type: 'knit',   color: '#b9d4ec', options: { turtle: true } },
  { name: 'Pine Long Down',     price: '$360', type: 'puffer', color: '#24493d', options: { length: 'long' } },
];

const SPACING = 1.22;   // distance between hangers along the rail
const RAIL_Y = 2.6;
const FLOOR_Y = -1.15;
const WALL_Z = -1.3;    // wall sits just behind the rack
const REST_ANGLE = 1.2; // how far garments are turned sideways at rest (radians)
const GARMENT_SCALE = 1.1;   // overall size of hanger + garment
const GARMENT_STRETCH = 1.15; // extra length on the garments

/* ROOM: wall + wordmark colours (wordmark text comes from the page's <h1>) */
const WALL_COLOR = '#d3dce5';
const SKIRTING_COLOR = '#f7f9fb';

const canvas = document.getElementById('rack');
const hero = document.querySelector('.hero');
const tooltip = document.getElementById('tooltip');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Renderer, scene, camera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

/* ---------- Lights ---------- */
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfdcea, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(3, 7, 9);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 40 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdbe8ff, 0.6);
fill.position.set(-6, 3, 4);
scene.add(fill);

/* ---------- Room: wall, skirting, wood floor ---------- */
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 30),
  new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 1 })
);
wall.position.set(0, FLOOR_Y + 15, WALL_Z);
wall.receiveShadow = true;
scene.add(wall);

const skirting = new THREE.Mesh(
  new THREE.BoxGeometry(80, 0.2, 0.05),
  new THREE.MeshStandardMaterial({ color: SKIRTING_COLOR, roughness: 0.6 })
);
skirting.position.set(0, FLOOR_Y + 0.1, WALL_Z + 0.025);
skirting.receiveShadow = true;
scene.add(skirting);

function woodTexture() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const cols = 8;
  const colW = size / cols;
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < cols; i++) {
    let y = -rand() * 400;
    while (y < size) {
      const len = 280 + rand() * 420;
      const l = 63 + rand() * 9; // lightness of this board
      x.fillStyle = `hsl(${32 + rand() * 6}, ${42 + rand() * 12}%, ${l}%)`;
      x.fillRect(i * colW, y, colW, len);
      // grain
      for (let g = 0; g < 14; g++) {
        const gx = i * colW + rand() * colW;
        x.strokeStyle = `hsla(28, 40%, ${l - 14}%, ${0.08 + rand() * 0.12})`;
        x.lineWidth = 0.6 + rand() * 1.4;
        x.beginPath();
        x.moveTo(gx, y);
        x.bezierCurveTo(gx + rand() * 8 - 4, y + len * 0.33, gx + rand() * 8 - 4, y + len * 0.66, gx + rand() * 6 - 3, y + len);
        x.stroke();
      }
      // board end joint
      x.fillStyle = 'rgba(90, 60, 35, 0.45)';
      x.fillRect(i * colW, y, colW, 2);
      y += len;
    }
    // gap between plank rows
    x.fillStyle = 'rgba(90, 60, 35, 0.5)';
    x.fillRect(i * colW, 0, 2, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
const floorTex = woodTexture();
floorTex.repeat.set(20, 5); // planks run toward the viewer
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 20),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, FLOOR_Y, WALL_Z + 10);
floor.receiveShadow = true;
scene.add(floor);

// Wordmark painted on the wall, so garments cast shadows over it.
// Paints straight away (fallback font if needed) and repaints once Anton loads.
let wordmark = null;
async function paintWordmark() {
  const fontReady = () => document.fonts.check('400 200px Anton');
  await Promise.race([document.fonts.load('400 200px Anton').catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
  drawWordmark();
  if (!fontReady()) {
    await document.fonts.load('400 200px Anton').catch(() => {});
    if (fontReady()) drawWordmark();
  }
}

function drawWordmark() {
  const text = (document.querySelector('.brand-word')?.textContent || 'SLAZOR').trim().toUpperCase();
  const color = getComputedStyle(document.documentElement).getPropertyValue('--wordmark').trim() || '#4f74e8';
  const font = (px) => `400 ${px}px Anton, Impact, 'Arial Narrow', sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font(400);
  const m = probe.measureText(text);
  const pad = 20;
  const textW = m.width;
  const asc = m.actualBoundingBoxAscent;
  const desc = m.actualBoundingBoxDescent;
  const scale = Math.min(1, (2048 - pad * 2) / textW);
  const c = document.createElement('canvas');
  c.width = Math.ceil(textW * scale + pad * 2);
  c.height = Math.ceil((asc + desc) * scale + pad * 2);
  const x = c.getContext('2d');
  x.font = font(400 * scale);
  x.fillStyle = color;
  x.textBaseline = 'alphabetic';
  x.fillText(text, pad, pad + asc * scale);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const width = Math.min(railLen * 0.72, 11);
  const height = width * (c.height / c.width);
  if (wordmark) { // repaint: swap in the new texture and size
    wordmark.material.map.dispose();
    wordmark.material.map = tex;
    wordmark.material.needsUpdate = true;
    wordmark.geometry.dispose();
    wordmark.geometry = new THREE.PlaneGeometry(width, height);
    return;
  }
  wordmark = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  wordmark.position.set(0, RAIL_Y - 0.55, WALL_Z + 0.01);
  wordmark.receiveShadow = true;
  scene.add(wordmark);
}

/* ---------- Pipe rack ---------- */
const metal = new THREE.MeshStandardMaterial({ color: 0xd5dde5, metalness: 1, roughness: 0.28 });
const wood = new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.55 });
const railLen = (PRODUCTS.length - 1) * SPACING + 1.6;

const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, railLen, 24), metal);
rail.rotation.z = Math.PI / 2;
rail.position.y = RAIL_Y;
rail.castShadow = true;
scene.add(rail);

for (const s of [-1, 1]) {
  const x = (s * railLen) / 2;
  const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, RAIL_Y - FLOOR_Y, 20), metal);
  upright.position.set(x, (RAIL_Y + FLOOR_Y) / 2, 0);
  upright.castShadow = true;
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), metal);
  elbow.position.set(x, RAIL_Y, 0);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 16), metal);
  foot.rotation.x = Math.PI / 2;
  foot.position.set(x, FLOOR_Y + 0.04, 0);
  foot.castShadow = true;
  scene.add(upright, elbow, foot);
}

/* ---------- Garments on hangers ---------- */
const items = [];
const hitTargets = [];

PRODUCTS.forEach((product, i) => {
  const pivot = new THREE.Group(); // swings around the rail
  pivot.position.set((i - (PRODUCTS.length - 1) / 2) * SPACING, RAIL_Y, 0);
  pivot.add(makeHook(metal));

  const body = new THREE.Group(); // turns to face the viewer
  body.add(makeHangerBody(wood, metal));
  const garment = buildGarment(product);
  // Stretch the garment downward from the shoulders so it stays on the hanger.
  const stretch = new THREE.Group();
  stretch.position.y = -0.42;
  garment.position.y = 0.42;
  stretch.scale.set(1, GARMENT_STRETCH, 1);
  stretch.add(garment);
  body.add(stretch);
  body.scale.setScalar(GARMENT_SCALE);
  pivot.add(body);
  scene.add(pivot);

  garment.traverse((o) => {
    if (o.isMesh) { o.userData.index = i; hitTargets.push(o); }
  });

  const restY = REST_ANGLE + (Math.random() - 0.5) * 0.12;
  body.rotation.y = restY;
  items.push({
    product, pivot, body, restY,
    rotY: restY, lift: 0,
    swing: 0, swingV: reduceMotion ? 0 : (Math.random() - 0.5) * 0.5,
    tilt: 0, tiltV: 0,
    phase: Math.random() * 10,
  });
});

paintWordmark().catch((e) => console.error("wordmark:", e));

/* ---------- Sizing ---------- */
let baseDist = 12;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  baseDist = THREE.MathUtils.clamp((railLen / 2 + 0.6) / (halfFov * camera.aspect), 9, 18);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Pointer + hover ---------- */
const pointer = new THREE.Vector2(0, 0);
const pointerClient = { x: 0, y: 0 };
let pointerInside = false;
let hovered = -1;
const raycaster = new THREE.Raycaster();

function updatePointer(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointerClient.x = e.clientX;
  pointerClient.y = e.clientY;
}
window.addEventListener('pointermove', (e) => {
  updatePointer(e);
  pointerInside = e.target === canvas;
});
canvas.addEventListener('pointerdown', (e) => { updatePointer(e); pointerInside = true; });
document.addEventListener('pointerleave', () => { pointerInside = false; });

function setHovered(index) {
  if (index === hovered) return;
  hovered = index;
  canvas.style.cursor = index >= 0 ? 'pointer' : '';
  if (index >= 0) {
    // Turning a garment nudges its neighbours on the rail.
    if (!reduceMotion) {
      if (items[index - 1]) items[index - 1].swingV -= 0.45;
      if (items[index + 1]) items[index + 1].swingV += 0.45;
      items[index].tiltV += 0.25;
    }
    const p = items[index].product;
    tooltip.innerHTML = `<strong>${p.name}</strong><span>${p.price}</span>`;
    tooltip.classList.add('show');
  } else {
    tooltip.classList.remove('show');
  }
}

/* ---------- Scroll zoom ---------- */
let scrollTarget = 0;
let scrollSmooth = 0;
function readScroll() {
  const rect = hero.getBoundingClientRect();
  const range = hero.offsetHeight - window.innerHeight;
  scrollTarget = range > 0 ? THREE.MathUtils.clamp(-rect.top / range, 0, 1) : 0;
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

/* ---------- Loop ---------- */
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const ease = (t) => t * t * (3 - 2 * t);
const camTarget = new THREE.Vector3();
const clock = new THREE.Clock();
let camX = 0;
let first = true;

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const t = clock.elapsedTime;

  // Camera: dolly in along the rack as the page scrolls; pointer pans.
  scrollSmooth = reduceMotion ? scrollTarget : damp(scrollSmooth, scrollTarget, 6, dt);
  const z = ease(scrollSmooth);
  document.documentElement.style.setProperty('--zoom', z.toFixed(3));
  const dist = baseDist * THREE.MathUtils.lerp(1, 0.42, z);
  const panRange = THREE.MathUtils.lerp(0.4, railLen * 0.32, z);
  camX = damp(camX, pointer.x * panRange, 3, dt);
  camTarget.set(camX * 0.9, THREE.MathUtils.lerp(0.9, 1.75, z), 0);
  camera.position.set(camX, camTarget.y + THREE.MathUtils.lerp(0.9, 0.2, z) + pointer.y * 0.15, dist);
  camera.lookAt(camTarget);

  // Hover detection.
  if (pointerInside) {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitTargets, false)[0];
    setHovered(hit ? hit.object.userData.index : -1);
  } else {
    setHovered(-1);
  }
  if (hovered >= 0) {
    tooltip.style.left = `${pointerClient.x}px`;
    tooltip.style.top = `${pointerClient.y}px`;
  }

  // Per-garment motion: spring swing on the rail, turn + lift on hover.
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const wind = reduceMotion ? 0 : 0.014 * Math.sin(t * 0.7 + it.phase) + 0.006 * Math.sin(t * 1.9 + it.phase * 2);
    it.swingV += (-12 * (it.swing - wind) - 1.6 * it.swingV) * dt;
    it.swing += it.swingV * dt;
    it.tiltV += (-14 * it.tilt - 2.2 * it.tiltV) * dt;
    it.tilt += it.tiltV * dt;
    it.pivot.rotation.z = it.swing;
    it.pivot.rotation.x = it.tilt;

    const active = i === hovered;
    it.rotY = damp(it.rotY, active ? 0 : it.restY, 7, dt);
    it.lift = damp(it.lift, active ? 1 : 0, 8, dt);
    it.body.rotation.y = it.rotY;
    it.body.scale.setScalar(GARMENT_SCALE * (1 + 0.05 * it.lift));
  }

  renderer.render(scene, camera);
  if (first) { canvas.classList.add('ready'); first = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

