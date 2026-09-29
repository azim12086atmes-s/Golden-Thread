import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AnimalModel } from '../animals/AnimalModel';
import { BODY_RADIUS } from '../characters/follow';
import { DRAGON_SCALE, Dragon } from '../event/Dragon';
import { BUNKS, CAB_SEATS, PET_BEDS, VAN } from './vanLayout';
import { COACH, COACH_FAMILY_SEATS, COACH_SEATS } from '../travel/bus';

/**
 * Ways to travel. In every vehicle the two sit in separate seats with a divider between them, and
 * on unicorns each rides their own — the no-touch rule holds in motion too (tests/van.test.ts, tests/world.test.ts).
 */

export type VehicleId = 'walk' | 'fly' | 'car' | 'van' | 'truck' | 'plane' | 'unicorn' | 'dragon';
export type VehicleKind = 'foot' | 'cape' | 'ground' | 'air' | 'mount';

export interface Seat { x: number; y: number; z: number }

export interface VehicleDef {
  id: VehicleId;
  name: string;
  icon: string;
  kind: VehicleKind;
  maxSpeed: number;
  accel: number;
  turn: number;
  /** [girl, boy]. Empty for foot/cape/mount (each travels on their own). */
  seats: [Seat, Seat] | [];
  price: number;
  requires?: { lanterns?: number; flag?: string };
  blurb: string;
}

/** Minimum centre-to-centre distance between the two seats. */
export const SEAT_GAP = 2 * BODY_RADIUS + 0.4;

export const VEHICLES: Record<VehicleId, VehicleDef> = {
  walk: { id: 'walk', name: 'On foot', icon: '🚶‍♀️', kind: 'foot', maxSpeed: 6.5, accel: 30, turn: 10, seats: [], price: 0, blurb: 'Slow, and you notice everything.' },
  fly: { id: 'fly', name: 'Cape of light', icon: '🪽', kind: 'cape', maxSpeed: 20, accel: 16, turn: 3, seats: [], price: 0, blurb: 'Fly side by side. Light recharges when you are close.' },
  car: { id: 'car', name: 'Little car', icon: '🚗', kind: 'ground', maxSpeed: 36, accel: 16, turn: 1.9, seats: [{ x: -0.55, y: 0.55, z: 0.1 }, { x: 0.55, y: 0.55, z: 0.1 }], price: 120, blurb: 'Quick between towns.' },
  van: { id: 'van', name: 'Safar the van', icon: '🚐', kind: 'ground', maxSpeed: 28, accel: 10, turn: 1.4, seats: [{ x: CAB_SEATS[0][0], y: 1.05, z: CAB_SEATS[0][2] }, { x: CAB_SEATS[1][0], y: 1.05, z: CAB_SEATS[1][2] }], price: 0, blurb: 'Home on wheels: bunks for four children, beds for four pets, a kitchen and two separate beds. Decorate the inside.' },
  truck: { id: 'truck', name: 'Old truck', icon: '🚚', kind: 'ground', maxSpeed: 24, accel: 8, turn: 1.2, seats: [{ x: -0.7, y: 1.35, z: 2.3 }, { x: 0.7, y: 1.35, z: 2.3 }], price: 260, blurb: 'Carries anything. Markets pay more for bulk deliveries.' },
  plane: { id: 'plane', name: 'Biplane', icon: '🛩️', kind: 'air', maxSpeed: 70, accel: 12, turn: 1.1, seats: [{ x: 0, y: 0.7, z: 0.6 }, { x: 0, y: 0.7, z: -0.9 }], price: 600, requires: { lanterns: 3 }, blurb: 'Tandem seats. The whole world is a short flight.' },
  dragon: { id: 'dragon', name: 'Night Dragon', icon: '🐉', kind: 'air', maxSpeed: 40, accel: 16, turn: 1.8, seats: [{ x: 0, y: 1.45, z: 0.35 * 1.6 }, { x: 0, y: 1.45, z: -0.5 * 1.6 }], price: 0, requires: { flag: 'celebration-done' }, blurb: 'Two separate saddles, hers in front and his behind. Hold W to fly, Space to climb, Shift to dive; it can hover.' },
  unicorn: { id: 'unicorn', name: 'Unicorns', icon: '🦄', kind: 'mount', maxSpeed: 22, accel: 14, turn: 3, seats: [], price: 0, requires: { flag: 'unicorns' }, blurb: 'Two unicorns, one each. They glide over water.' },
};

// ───────────────────────── models ─────────────────────────

const cache = new Map<string, THREE.Material>();
/** Reflections for paint and metal (set once by the game; vehicles only, so the world's light is untouched). */
let vehicleEnv: THREE.Texture | null = null;
export function setVehicleEnvironment(tex: THREE.Texture): void {
  vehicleEnv = tex;
  for (const mat of cache.values()) if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) { (mat as THREE.MeshStandardMaterial).envMap = tex; mat.needsUpdate = true; }
}
const hsl = { h: 0, s: 0, l: 0 };
/**
 * What a vehicle part is made of, from its colour: bright colours are glossy car paint under a
 * clear coat (white and cream too), mid and light greys brushed aluminium and chrome, near-blacks rubber
 * and plastic, browns wood.
 */
function finish(c: string): THREE.Material {
  new THREE.Color(c).getHSL(hsl);
  let mat: THREE.MeshStandardMaterial;
  if (hsl.l < 0.2) mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 });
  else if (hsl.s < 0.12 && hsl.l > 0.55 && hsl.l < 0.84) mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.85, envMapIntensity: 0.75 });
  else if (hsl.h > 0.04 && hsl.h < 0.12 && hsl.s < 0.5 && hsl.l < 0.45) mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 });
  // Light paint gets a softer shine so it never glares.
  else if (hsl.l > 0.78) mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.22 });
  else mat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, metalness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.45 });
  mat.envMap = vehicleEnv;
  return mat;
}
function m(c: string, glow = false): THREE.Material {
  const k = c + glow;
  if (!cache.has(k)) cache.set(k, glow ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false }) : finish(c));
  return cache.get(k)!;
}
function bx(g: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number, glow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c, glow));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
const GLASS = new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false });
function glass(g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), GLASS);
  mesh.position.set(x, y, z);
  g.add(mesh);
}
function wheel(g: THREE.Object3D, r: number, x: number, y: number, z: number) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 12), m('#262628'));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, y, z);
  w.userData.wheel = true;
  g.add(w);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.32, 8), m('#d9d9e0'));
  hub.rotation.z = Math.PI / 2;
  hub.position.set(x, y, z);
  g.add(hub);
}

/** Anything that can be ridden by one traveller. */
export interface Mount {
  root: THREE.Object3D;
  saddleY: number;
  update(dt: number, speed: number, t: number): void;
}

export interface VehicleModel {
  root: THREE.Group;
  /** Called each frame with speed for wheel/propeller animation. */
  update(dt: number, speed: number, t: number): void;
  /** Rebuild decor that is visible from outside (van). */
  /** [girl's mount, boy's mount] — each rides their own. */
  unicorns?: [Mount, Mount];
}

export function buildVehicle(id: VehicleId, van?: { lights: string; rug: string }): VehicleModel | null {
  const root = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  let unicorns: [Mount, Mount] | undefined;
  let dragon: Dragon | undefined;
  switch (id) {
    case 'car': {
      // A little rounded car in painted steel: coral below, cream above, a soft V on the nose;
      // windows cut through, chrome bumpers, round lamps, whitewall wheels; a console between the seats.
      root.add(paintedShell({
        key: 'car-shell', W: 1.0, y0: 0.28, y1: 1.9, B: -1.9, F: 1.9, R: 0.45, belt: 1.08, vTip: 0.9, lower: '#e8576a', upper: '#f7f3ea',
        side: [{ z: -0.1, hz: 0.95, y: 1.45, hy: 0.3 }], front: [{ x: 0, hx: 0.72, y: 1.45, hy: 0.3 }], back: [{ x: 0, hx: 0.66, y: 1.45, hy: 0.27 }],
        arches: [[1.2, 0.36, 0.46], [-1.2, 0.36, 0.46]],
      }));
      for (const x of [-0.97, 0.97]) glass(root, 0.03, 0.6, 1.9, x, 1.45, -0.1);
      glass(root, 1.44, 0.6, 0.03, 0, 1.45, 1.78);
      glass(root, 1.32, 0.54, 0.03, 0, 1.45, -1.78);
      bx(root, 0.16, 0.5, 1.2, '#8a6a4a', 0, 1.05, 0.1); // divider console between the seats
      for (const sx of [-1, 1]) for (const z of [0.2, -0.45]) bx(root, 0.62, 0.5, 0.12, '#c8483a', sx * 0.55, 1.05, z - 0.3);
      for (const z of [1.98, -1.98]) bx(root, 2.05, 0.16, 0.12, '#c8ccd4', 0, 0.5, z);
      for (const sx of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), m('#fff6c0', true));
        hl.position.set(sx * 0.62, 0.8, 1.9);
        root.add(hl);
        const tl = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), m('#e8303a', true));
        tl.position.set(sx * 0.62, 0.85, -1.9);
        tl.rotation.y = Math.PI;
        root.add(tl);
      }
      for (const [x, z] of [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]]) busWheel(root, 0.36, x, 0.36, z);
      break;
    }
    case 'van': {
      buildVan(root, van);
      break;
    }
    case 'truck': {
      // An old lorry: a rounded painted-steel cab (blue and cream), a timber-slatted cargo box behind.
      root.add(paintedShell({
        key: 'truck-shell', W: 1.25, y0: 0.7, y1: 3.0, B: 1.0, F: 3.45, R: 0.35, belt: 1.95, vTip: 1.75, lower: '#3a6ea5', upper: '#f4f1e8',
        side: [{ z: 2.3, hz: 0.7, y: 2.35, hy: 0.42 }], front: [{ x: 0, hx: 0.98, y: 2.35, hy: 0.45 }], back: [],
        arches: [[2.4, 0.55, 0.62]],
      }));
      for (const x of [-1.22, 1.22]) glass(root, 0.03, 0.84, 1.4, x, 2.35, 2.3);
      glass(root, 1.96, 0.9, 0.03, 0, 2.35, 3.35);
      bx(root, 0.16, 0.7, 1.0, '#8a6a4a', 0, 1.9, 2.3);
      bx(root, 2.6, 0.4, 7.4, '#3a3a40', 0, 0.8, -0.4);
      bx(root, 2.6, 1.9, 4.6, '#d9a066', 0, 2, -1.8);
      for (let i = 0; i < 4; i++) bx(root, 2.62, 0.1, 4.62, '#8a5a36', 0, 1.2 + i * 0.5, -1.8);
      bx(root, 2.7, 0.2, 0.2, '#c8ccd4', 0, 0.75, 3.5);
      for (const [x, z] of [[-1.15, 2.4], [1.15, 2.4], [-1.15, -1.2], [1.15, -1.2], [-1.15, -2.8], [1.15, -2.8]]) busWheel(root, 0.55, x * 1.05, 0.55, z);
      for (const sx of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), m('#fff6c0', true));
        hl.position.set(sx * 0.85, 1.25, 3.46);
        root.add(hl);
      }
      break;
    }
    case 'plane': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 5.4, 10), m('#f2c14e'));
      body.rotation.x = Math.PI / 2;
      body.position.y = 0.9;
      root.add(body);
      bx(root, 9, 0.12, 1.3, '#e8576a', 0, 0.7, 0.4);
      bx(root, 8, 0.12, 1.2, '#e8576a', 0, 2.1, 0.4);
      for (const x of [-3.2, 3.2]) for (const z of [0, 0.8]) bx(root, 0.06, 1.4, 0.06, '#6b4a2a', x, 1.4, z);
      bx(root, 3, 0.1, 0.9, '#e8576a', 0, 1, -2.5);
      bx(root, 0.1, 1.1, 0.9, '#e8576a', 0, 1.5, -2.5);
      const prop = new THREE.Group();
      prop.position.set(0, 0.9, 2.8);
      bx(prop, 0.18, 2.4, 0.06, '#6b4a2a', 0, 0, 0);
      root.add(prop);
      spinners.push(prop);
      bx(root, 0.1, 0.5, 0.1, '#6b4a2a', 0, 0.9, -0.15); // divider between tandem seats
      for (const x of [-0.9, 0.9]) wheel(root, 0.3, x, 0.3, 1.2);
      break;
    }
    case 'dragon': {
      dragon = new Dragon(DRAGON_SCALE, true);
      root.add(dragon.root);
      break;
    }
    case 'unicorn': {
      const a = new AnimalModel('unicorn');
      const b = new AnimalModel('unicorn');
      unicorns = [a, b];
      // Each unicorn is placed independently by the controller; root holds only the girl's.
      root.add(a.root);
      break;
    }
    default:
      return null;
  }
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return {
    root,
    unicorns,
    update(dt, speed, t) {
      for (const s of spinners) s.rotation.z += dt * (8 + speed * 2);
      root.traverse((o) => { if (o.userData.wheel) o.rotation.x += (speed * dt) / 0.4; });
      if (unicorns) unicorns[0].update(dt, speed, t);
      dragon?.update(dt, speed, t);
    },
  };
}

// ───────────────────────── Safar ─────────────────────────

/**
 * Safar's painted steel body: one rounded shell (a split-screen bus stretched long enough to live
 * in), two-tone paint — teal below, cream above, the cream sweeping down the nose in the old
 * split-screen V — under a clear coat. Its windows and wheel arches are true openings cut by the
 * shader, so the crew inside shows through the glass.
 */
interface Hole { x?: number; z?: number; y: number; hx?: number; hz?: number; hy: number }
/** A rounded, painted steel body (Safar, the intercity coach): its size, paint, openings and arches. */
export interface ShellSpec {
  /** One material per kind of body (every body of a kind shares its openings). */
  key: string;
  W: number; y0: number; y1: number; B: number; F: number; R: number;
  /** Lower paint below the beltline, upper above; on the nose the upper dips to `vTip` at the middle (a V). */
  belt: number; vTip: number; lower: string; upper: string;
  /** A painted band along the sides (y centre, half-height, colour). */
  band?: [number, number, string];
  side: Hole[]; front: Hole[]; back: Hole[];
  /** Wheel arches: [z, y, r]. */
  arches: Array<[number, number, number]>;
}

function paintedShell(sp: ShellSpec): THREE.Mesh {
  const geo = new RoundedBoxGeometry(sp.W * 2, sp.y1 - sp.y0, sp.F - sp.B, 5, sp.R);
  geo.translate(0, (sp.y0 + sp.y1) / 2, (sp.B + sp.F) / 2);
  const mesh = new THREE.Mesh(geo, (cache.get(sp.key) as THREE.MeshPhysicalMaterial | undefined) ?? shellMaterial(sp));
  mesh.castShadow = true;
  return mesh;
}

const glslColor = (c: string) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(3)}, ${k.g.toFixed(3)}, ${k.b.toFixed(3)})`; };

/** The shell's paint under a clear coat, with its openings cut by the shader. */
function shellMaterial(sp: ShellSpec): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.48, metalness: 0.12, clearcoat: 0.45, clearcoatRoughness: 0.3, envMapIntensity: 0.25, side: THREE.DoubleSide });
  mat.envMap = vehicleEnv;
  cache.set(sp.key, mat); // so the environment reaches it too
  const v4 = (h: Hole, a: 'x' | 'z') => `vec4(${(h[a] ?? 0).toFixed(3)}, ${h.y.toFixed(3)}, ${((a === 'x' ? h.hx : h.hz) ?? 0).toFixed(3)}, ${h.hy.toFixed(3)})`;
  const holes = (list: Hole[], a: 'x' | 'z', coord: string) => list.map((h) => `if (sdRR(vec2(${coord} - ${v4(h, a)}.x, vP.y - ${v4(h, a)}.y), ${v4(h, a)}.zw, 0.1) < 0.0) discard;`).join('\n');
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vP; varying vec3 vN0;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position; vN0 = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vP; varying vec3 vN0;
        float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 n = normalize(vN0);
          // Windows through the sides, the windscreen, the back window; the wheel arches.
          if (abs(n.x) > 0.6) {
            ${holes(sp.side, 'z', 'vP.z')}
            ${sp.arches.map(([z, y, r]) => `if (length(vec2(vP.z - ${z.toFixed(3)}, vP.y - ${y.toFixed(3)})) < ${r.toFixed(3)}) discard;`).join('\n')}
          }
          if (n.z > 0.6) { ${holes(sp.front, 'x', 'vP.x')} }
          if (n.z < -0.6) { ${holes(sp.back, 'x', 'vP.x')} }
          // Two-tone at the beltline; on the nose the upper colour dips to a V.
          float edge = ${sp.belt.toFixed(3)};
          if (n.z > 0.3) edge = mix(${sp.vTip.toFixed(3)}, ${sp.belt.toFixed(3)}, clamp(abs(vP.x) / ${(sp.W - 0.3).toFixed(3)}, 0.0, 1.0));
          diffuseColor.rgb = vP.y > edge ? ${glslColor(sp.upper)} : ${glslColor(sp.lower)};
          ${sp.band ? `if (abs(n.x) > 0.3 && abs(vP.y - ${sp.band[0].toFixed(3)}) < ${sp.band[1].toFixed(3)}) diffuseColor.rgb = ${glslColor(sp.band[2])};` : ''}
          // Inside the shell, plain cream lining.
          if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.86, 0.8, 0.7);
        }`);
  };
  mat.customProgramCacheKey = () => sp.key;
  return mat;
}

/** A whitewall wheel with a chrome hubcap, turning about its axle. */
export function busWheel(g: THREE.Object3D, r: number, x: number, y: number, z: number) {
  const w = new THREE.Group();
  w.position.set(x, y, z);
  w.userData.wheel = true;
  const s = Math.sign(x);
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 20), m('#1f1f22'));
  tyre.rotation.z = Math.PI / 2;
  w.add(tyre);
  const wall = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, r * 0.1, 6, 20), m('#f4f1ea'));
  wall.rotation.y = Math.PI / 2;
  wall.position.x = s * 0.155;
  w.add(wall);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.46, 14, 8), m('#c8ccd4'));
  cap.scale.set(0.35, 1, 1);
  cap.position.x = s * 0.15;
  w.add(cap);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), m('#9a9ea8'));
    nut.position.set(s * 0.2, Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28);
    w.add(nut);
  }
  g.add(w);
}

/**
 * Safar, the travellers' home on wheels: long and tall enough for the room inside (vanLayout.ts)
 * — two separate beds at the back, four children's bunks, two facing benches by the big windows,
 * pet beds and a kitchen by the door, and the cab in front with two separate seats and a console
 * between. A split-screen bus in painted steel: a rounded shell, teal and cream with the cream V on
 * its nose and the golden-thread knot for a badge; a two-pane windscreen propped open a crack,
 * round headlamps, chrome bumpers and beltline, engine louvres, whitewall tyres; a painted band of
 * golden-thread vines, a striped awning, a roof rack with a rolled carpet and bags, a ladder.
 */
function buildVan(root: THREE.Group, van?: { lights: string; rug: string }): void {
  const { halfW: W, back: B, cab: C, front: F, floorY: FY, wall } = VAN;
  const top = FY + wall, len = C - B;
  const wood = '#6b4a2a', gold = '#e2b43a', chrome = '#c8ccd4', seam = '#1f2226', cream = '#f7f1e3';
  const y0 = FY - 0.35, belt = FY + 0.62;
  const winLo = FY + 0.72, winHi = FY + 1.6;
  const wheelZ = [C + 0.2, B + 1.4], wheelR = 0.55;
  // Windows: the benches', the bunks', the cab doors'; the split windscreen; the back window.
  const openings: Array<[number, number]> = [[-0.45, 1.55], [-2.35, -0.75], [C + 0.12, F - 0.5]];
  const sideHoles = openings.map(([a, b]) => ({ z: (a + b) / 2, hz: (b - a) / 2, y: (winLo + winHi) / 2, hy: (winHi - winLo) / 2 }));
  const wsLo = FY + 1.02, wsHi = top - 0.42;
  const frontHoles = [-1, 1].map((s) => ({ x: s * 0.6, hx: 0.5, y: (wsLo + wsHi) / 2, hy: (wsHi - wsLo) / 2 }));
  const backHoles = [{ x: 0.35, hx: 0.6, y: FY + 1.5, hy: 0.3 }];
  root.add(paintedShell({
    key: 'safar-shell', W, y0, y1: top, B, F, R: 0.34, belt, vTip: FY + 0.12, lower: '#6fb8ae', upper: '#f4eedc',
    side: sideHoles, front: frontHoles, back: backHoles, arches: wheelZ.map((z) => [z, wheelR, wheelR + 0.1] as [number, number, number]),
  }));

  // Chassis, and dark wheel wells behind the arches so no one sees into the body.
  bx(root, W * 2 - 0.3, 0.3, F - B - 0.6, '#2a2a30', 0, 0.45, (F + B) / 2);
  for (const z of wheelZ) for (const s of [-1, 1]) {
    const well = new THREE.Mesh(new THREE.CylinderGeometry(wheelR + 0.1, wheelR + 0.1, 0.4, 16, 1, true, 0, Math.PI), m('#141416'));
    well.rotation.set(0, 0, Math.PI / 2);
    well.position.set(s * (W - 0.22), wheelR, z);
    root.add(well);
  }
  // Glass in every opening: side windows framed in chrome; the windscreen panes propped open.
  for (const sx of [-1, 1]) {
    const x = sx * (W - 0.05);
    for (const [a, b] of openings) {
      glass(root, 0.03, winHi - winLo, Math.abs(b - a), x, (winLo + winHi) / 2, (a + b) / 2);
      for (const y of [winHi + 0.02, winLo - 0.02]) bx(root, 0.04, 0.035, Math.abs(b - a) - 0.1, chrome, sx * (W + 0.005), y, (a + b) / 2);
    }
    // The beltline: a chrome strip the length of the body; a rain gutter under the roof's curve.
    bx(root, 0.03, 0.04, F - B - 0.9, chrome, sx * (W + 0.01), belt, (F + B) / 2);
    bx(root, 0.05, 0.035, F - B - 0.8, chrome, sx * (W + 0.005), top - 0.36, (F + B) / 2);
    // Door seams: the cab door on each side, the double cargo doors on hers.
    const seamBox = (w: number, h: number, d: number, y: number, z: number) => bx(root, w, h, d, seam, sx * (W + 0.004), y, z);
    for (const z of [C + 0.05, F - 0.42]) seamBox(0.012, top - 0.45 - (FY - 0.2), 0.014, (top - 0.45 + FY - 0.2) / 2, z);
    if (sx < 0) {
      for (const z of [-0.5, 1.6]) seamBox(0.012, top - 0.45 - (FY - 0.2), 0.014, (top - 0.45 + FY - 0.2) / 2, z);
      seamBox(0.012, winLo - 0.05 - (FY - 0.2), 0.014, (winLo - 0.05 + FY - 0.2) / 2, 0.55);
    }
    // Handles and hinges.
    bx(root, 0.04, 0.05, 0.22, chrome, sx * (W + 0.02), belt - 0.12, F - 0.62);
    if (sx < 0) for (const z of [0.4, 0.7]) bx(root, 0.04, 0.05, 0.18, chrome, sx * (W + 0.02), belt - 0.12, z);
    // Engine louvres behind the last window.
    for (let i = 0; i < 7; i++) bx(root, 0.02, 0.025, 0.55, seam, sx * (W + 0.004), winLo + 0.1 + i * 0.1, B + 0.95);
    // A side mirror on a chrome arm.
    const arm = bx(root, 0.04, 0.04, 0.34, chrome, sx * (W + 0.14), winLo + 0.1, F - 0.55);
    arm.rotation.y = sx * 0.6;
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 14), m(chrome));
    mirror.rotation.x = Math.PI / 2;
    mirror.position.set(sx * (W + 0.26), winLo + 0.16, F - 0.46);
    root.add(mirror);
    // The golden-thread band: a wavy line of vines and flowers along the lower body, clear of the arches.
    bx(root, 0.03, 0.05, F - B - 1.2, gold, sx * (W + 0.012), belt - 0.26, (F + B) / 2 - 0.2);
    for (let i = 0; i < 26; i++) {
      const z = B + 0.5 + i * (F - B - 1.3) / 25, y = belt - 0.26 + Math.sin(i * 1.1) * 0.1;
      if (wheelZ.some((wz) => Math.abs(z - wz) < wheelR + 0.25) && y < wheelR * 2 + 0.2) continue;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 4), m(i % 3 ? '#4f9a6a' : '#ff8fb8'));
      leaf.position.set(sx * (W + 0.02), y, z);
      root.add(leaf);
    }
  }
  // The split windscreen: two panes hinged at the top, propped open a hand's width; the pillar between.
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * 0.6, wsHi, F - 0.02);
    hinge.rotation.x = -0.1;
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.0, wsHi - wsLo, 0.03), GLASS);
    pane.position.y = -(wsHi - wsLo) / 2;
    hinge.add(pane);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.035, 0.04), m(chrome));
    frame.position.y = -(wsHi - wsLo);
    hinge.add(frame);
    root.add(hinge);
  }
  // The nose: the golden-thread knot as its badge in a cream ring, chrome edging the V.
  const badgeY = FY + 0.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 28), m(chrome));
  ring.position.set(0, badgeY, F + 0.03);
  root.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.23, 28), m(cream));
  disc.position.set(0, badgeY, F + 0.025);
  root.add(disc);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.11, 0.028, 48, 6, 2, 3), m(gold));
  knot.position.set(0, badgeY, F + 0.06);
  knot.scale.z = 0.4;
  root.add(knot);
  // Round headlamps in chrome bezels, indicators above them, a chrome bumper with over-riders.
  for (const s of [-1, 1]) {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 20), m(chrome));
    bezel.position.set(s * (W - 0.5), FY + 0.12, F + 0.03);
    root.add(bezel);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), m('#fff6c0', true));
    hl.position.set(s * (W - 0.5), FY + 0.12, F + 0.04);
    root.add(hl);
    const ind = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), m('#ffb03a', true));
    ind.scale.z = 0.5;
    ind.position.set(s * (W - 0.5), FY + 0.44, F + 0.03);
    root.add(ind);
    for (const z of [F + 0.14, B - 0.14]) bx(root, 0.1, 0.34, 0.1, chrome, s * 0.7, 0.62, z);
    // Round tail lamps.
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), m('#e8303a', true));
    tl.scale.z = 0.5;
    tl.position.set(s * (W - 0.45), FY + 0.35, B - 0.03);
    root.add(tl);
  }
  for (const z of [F + 0.12, B - 0.12]) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, W * 2 - 0.1, 4, 10), m(chrome));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.6, z);
    root.add(bar);
  }
  // Back: the engine lid's outline and the ladder to the roof.
  bx(root, 1.3, 0.012, 0.01, seam, 0.35, FY + 0.95, B - 0.004);
  for (const x of [-0.3, 1.0]) bx(root, 0.012, 0.9, 0.01, seam, x, FY + 0.05, B - 0.004);
  for (const x of [-1.05, -0.65]) bx(root, 0.05, wall + 0.4, 0.05, wood, x, FY + wall / 2 + 0.2, B - 0.1);
  for (let r = 0; r < 7; r++) bx(root, 0.45, 0.04, 0.05, wood, -0.85, FY + 0.25 + r * 0.33, B - 0.1);
  glass(root, 1.2, 0.6, 0.03, 0.35, FY + 1.5, B + 0.05);
  // A skylight, and the roof rack: rails, a rolled carpet and travel bags.
  bx(root, 1.0, 0.1, 1.4, '#9fd8ff', 0, top - 0.02, 0.4);
  for (const x of [-0.95, 0.95]) {
    bx(root, 0.05, 0.05, 3.4, wood, x, top + 0.2, -1.6);
    for (const z of [-3.2, 0]) bx(root, 0.04, 0.3, 0.04, chrome, x, top + 0.05, z);
  }
  for (let i = 0; i < 5; i++) bx(root, 1.95, 0.04, 0.05, wood, 0, top + 0.18, -3.2 + i * 0.8);
  const carpet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 10), m(van?.rug === 'plain' || !van ? '#c23b2a' : '#e2b43a'));
  carpet.rotation.z = Math.PI / 2;
  carpet.position.set(0, top + 0.42, -2.6);
  root.add(carpet);
  for (const [x, z, c] of [[-0.5, -1.2, '#8a5a36'], [0.45, -1.4, '#2f6f9a'], [0, -0.6, '#b5654a']] as const) bx(root, 0.6, 0.35, 0.5, c, x, top + 0.22, z);
  // The cab inside: a painted dashboard, the steering wheel on her side, the console between the seats.
  bx(root, W * 2 - 0.2, 0.36, 0.4, '#3f8f86', 0, FY + 0.72, F - 0.34);
  bx(root, W * 2 - 0.25, 0.05, 0.42, cream, 0, FY + 0.92, F - 0.34);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 20), m('#f4f1ea'));
  sw.position.set(CAB_SEATS[0][0], FY + 0.98, F - 0.62);
  sw.rotation.x = -0.9;
  root.add(sw);
  bx(root, 0.2, 0.6, 1.0, '#8a6a4a', 0, FY + 0.25, CAB_SEATS[0][2]); // the console between their seats
  for (const [x, , z] of CAB_SEATS) {
    bx(root, 0.62, 0.14, 0.6, '#c8483a', x, FY + 0.35, z);
    bx(root, 0.62, 0.7, 0.12, '#c8483a', x, FY + 0.7, z - 0.32);
  }
  bx(root, W * 2 - 0.1, 0.05, F - B - 0.3, '#9a7450', 0, FY, (F + B) / 2 - 0.1); // the floor
  // A striped awning rolled out over the bench windows on her side.
  for (let i = 0; i < 8; i++) {
    const a = bx(root, 0.9, 0.04, 0.26, i % 2 ? '#ffffff' : '#e8576a', -(W + 0.42), top - 0.5, -0.4 + i * 0.26);
    a.rotation.z = 0.25;
  }
  bx(root, 0.06, 0.06, 2.2, wood, -(W + 0.84), top - 0.62, 0.5);
  // The inside you can see through the windows: bunk frames with lanterns, benches, pet beds.
  for (const [x, y, z] of BUNKS) {
    bx(root, 0.8, 0.1, 1.4, '#8a5a36', x * 0.93, FY + y - 0.05, z);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), m('#ffcf7a', true));
    l.position.set(x * 0.93, FY + y + 0.35, z + 0.6);
    root.add(l);
  }
  for (const x of [-1, 1]) bx(root, 0.6, 0.46, 1.9, '#a8703f', x * 1.0, FY + 0.23, 0.55);
  bx(root, 0.6, 0.06, 0.9, '#d4a060', 0, FY + 0.72, 0.55); // the table between the benches
  bx(root, 0.6, 0.66, 0.08, '#6b4a2a', 0, FY + 0.36, 0.55);
  for (const [x, z] of PET_BEDS) {
    const bed = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 6, 12), m('#ff8fb8'));
    bed.rotation.x = Math.PI / 2;
    bed.position.set(x, FY + 0.08, z);
    root.add(bed);
  }
  // Wheels.
  for (const z of wheelZ) for (const s of [-1, 1]) busWheel(root, wheelR, s * (W - 0.13), wheelR, z);
  // Fairy lights along the gutter.
  if (van && van.lights !== 'none') {
    const cols = van.lights === 'rainbow' ? ['#ff8a8a', '#fff08a', '#8ac8ff', '#c8a4ff'] : ['#fff0b0'];
    for (let i = 0; i < 20; i++) {
      const z = B + 0.4 + i * (len - 0.6) / 19;
      for (const x of [-W - 0.05, W + 0.05]) {
        const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), m(cols[i % cols.length], true));
        s2.position.set(x, top - 0.45 - Math.sin((i / 19) * Math.PI * 3) * 0.1, z);
        root.add(s2);
      }
    }
  }
}

// ───────────────────────── the intercity coach ─────────────────────────

/**
 * The Golden Thread Lines coach that runs between the towns (travel/bus.ts): a long rounded body
 * in painted steel — deep blue below, cream above, a gold band — with a row of big windows each
 * side, a wide windscreen with a lit destination board over it, a door by the driver, and pairs
 * of seats either side of the aisle (theirs at the front, the family's behind).
 */
export function buildCoach(dest: string): THREE.Group {
  const root = new THREE.Group();
  const { halfW: W, len, floorY: FY } = COACH;
  const B = -len / 2, F = len / 2, top = FY + 2.3, y0 = 0.55, belt = FY + 0.55;
  const chrome = '#c8ccd4', seam = '#1f2226', seat = '#8a2a3a';
  const winLo = FY + 0.65, winHi = FY + 1.75, wheelZ = [F - 2.2, B + 2.4], wheelR = 0.55;
  const panes: Array<[number, number]> = [];
  for (let z = B + 0.8; z + 1.1 < F - 1.6; z += 1.3) panes.push([z, z + 1.1]);
  root.add(paintedShell({
    key: 'coach-shell', W, y0, y1: top, B, F, R: 0.3, belt, vTip: belt, lower: '#2f5a9a', upper: '#f4eedc',
    band: [belt - 0.14, 0.05, '#e2b43a'],
    side: panes.map(([a, b]) => ({ z: (a + b) / 2, hz: (b - a) / 2, y: (winLo + winHi) / 2, hy: (winHi - winLo) / 2 })),
    front: [{ x: 0, hx: W - 0.35, y: FY + 1.3, hy: 0.62 }],
    back: [{ x: 0, hx: W - 0.5, y: FY + 1.45, hy: 0.4 }],
    arches: wheelZ.map((z) => [z, wheelR, wheelR + 0.1] as [number, number, number]),
  }));
  bx(root, W * 2 - 0.3, 0.3, len - 1, '#2a2a30', 0, 0.45, 0);
  for (const sx of [-1, 1]) {
    const x = sx * (W - 0.04);
    for (const [a, b] of panes) glass(root, 0.03, winHi - winLo, b - a, x, (winLo + winHi) / 2, (a + b) / 2);
    bx(root, 0.03, 0.04, len - 0.9, chrome, sx * (W + 0.01), winLo - 0.04, 0);
    bx(root, 0.03, 0.04, len - 0.9, chrome, sx * (W + 0.01), winHi + 0.04, 0);
  }
  // The door on the kerb side (his side, +x), by the driver.
  for (const z of [F - 1.5, F - 0.55]) bx(root, 0.012, top - 0.5 - (FY - 0.35), 0.014, seam, W + 0.004, (top - 0.5 + FY - 0.35) / 2, z);
  // Windscreen, and the destination board lit above it.
  glass(root, W * 2 - 0.7, 1.24, 0.03, 0, FY + 1.3, F - 0.05);
  bx(root, W * 2 - 0.9, 0.26, 0.04, '#ffd27a', 0, top - 0.32, F + 0.01, true);
  const label = typeof document !== 'undefined' ? destSprite(dest) : null;
  if (label) { label.position.set(0, top - 0.32, F + 0.04); root.add(label); }
  bx(root, W * 2 - 0.2, 0.36, 0.4, '#3a4a6a', 0, FY + 0.6, F - 0.4); // dashboard
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), m('#fff6c0', true));
    hl.position.set(s * (W - 0.4), FY - 0.05, F + 0.02);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), m('#e8303a', true));
    tl.position.set(s * (W - 0.4), FY + 0.1, B - 0.02);
    tl.rotation.y = Math.PI;
    root.add(tl);
  }
  for (const z of [F + 0.1, B - 0.1]) bx(root, W * 2 + 0.05, 0.22, 0.14, chrome, 0, 0.62, z);
  // Seats in pairs either side of the aisle, a low partition between each row.
  const rows = [COACH_SEATS.girl[2], ...new Set(COACH_FAMILY_SEATS.map((q) => q[2]))];
  for (const z of rows) for (const sx of [-1, 1]) {
    bx(root, 0.9, 0.12, 0.55, seat, sx * 0.8, FY + 0.4, z);
    bx(root, 0.9, 0.7, 0.1, seat, sx * 0.8, FY + 0.8, z - 0.3);
  }
  bx(root, 0.05, 0.9, 0.5, '#6a6a70', 0, FY + 0.45, COACH_SEATS.girl[2]); // a rail up the aisle between their seats
  bx(root, W * 2 - 0.1, 0.05, len - 0.4, '#5a5a62', 0, FY, 0); // the floor
  for (const z of wheelZ) for (const s of [-1, 1]) {
    const well = new THREE.Mesh(new THREE.CylinderGeometry(wheelR + 0.1, wheelR + 0.1, 0.4, 16, 1, true, 0, Math.PI), m('#141416'));
    well.rotation.set(0, 0, Math.PI / 2);
    well.position.set(s * (W - 0.22), wheelR, z);
    root.add(well);
    busWheel(root, wheelR, s * (W - 0.13), wheelR, z);
  }
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

/** The destination, painted in light on the board above the windscreen. */
function destSprite(text: string): THREE.Mesh | null {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  if (!x) return null;
  x.fillStyle = '#1a1206'; x.fillRect(0, 0, 512, 64);
  x.fillStyle = '#ffd27a'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 256, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(COACH.halfW * 2 - 0.95, 0.22), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}
