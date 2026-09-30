import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AnimalModel } from '../animals/AnimalModel';
import { BODY_RADIUS } from '../characters/follow';
import { DRAGON_SCALE, Dragon } from '../event/Dragon';
import { BUNKS, CAB_SEATS, PET_BEDS, VAN } from './vanLayout';
import { COACH, COACH_FAMILY_SEATS, COACH_SEATS } from '../travel/bus';
import { FERRY, FERRY_FAMILY_SEATS, FERRY_SEATS } from '../travel/ferry';
import { AIR, AIR_FAMILY_SEATS, AIR_SEATS } from '../travel/air';
import { TRAM, TRAM_FAMILY_SEATS, TRAM_HANG, TRAM_SEATS } from '../travel/gondola';
import { STREET_TRAM, STREET_TRAM_FAMILY_SEATS, STREET_TRAM_SEATS, type TramStyle } from '../travel/streetTram';

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
  dragon: { id: 'dragon', name: 'Night Dragon', icon: '🐉', kind: 'air', maxSpeed: 40, accel: 16, turn: 1.8, seats: [{ x: 0, y: 1.45, z: -0.5 * 1.6 }, { x: 0, y: 1.45, z: 0.35 * 1.6 }], price: 0, requires: { flag: 'celebration-done' }, blurb: 'Two separate saddles: he drives from the front one, she rides behind with her wings open. Hold W to fly, Space to climb, Shift to dive; it can hover.' },
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
let envNight = -1, envCount = 0;
/**
 * The reflections are of a daytime sky, so after dark they fade: otherwise a cream roof or a
 * clear coat shines as if lit and blooms against the night (0 day … 1 night).
 */
export function setVehicleNight(night: number): void {
  if (Math.abs(night - envNight) < 0.02 && cache.size === envCount) return;
  envNight = night;
  envCount = cache.size;
  for (const mat of cache.values()) {
    const s = mat as THREE.MeshStandardMaterial;
    if (!s.isMeshStandardMaterial) continue;
    s.userData.env0 ??= s.envMapIntensity;
    s.envMapIntensity = s.userData.env0 * (1 - 0.9 * night);
  }
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
  /** The Night Dragon, when this is him. */
  dragon?: Dragon;
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
      buildBiplane(root, spinners);
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
    dragon,
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

// ───────────────────────── the coastal ferry ─────────────────────────

/**
 * The coastal ferry (travel/ferry.ts): a navy hull with a sharp bow, white topsides and a red
 * boot-top stripe, a teak foredeck with benches port and starboard either side of a planter, a
 * cabin aft with a wheelhouse over it and solar panels on the roof, rails, lifebuoys and the
 * red and green lamps. Its waterline is y = 0.
 */
export function buildFerryBoat(): THREE.Group {
  const root = new THREE.Group();
  const { halfW: W, len, deckY: DY } = FERRY;
  const F = len / 2, B = -len / 2, rail = '#d8dce4', wood = '#9a6a42', white = '#f4f1ea';
  // How wide the hull is at z (the bow draws in to a point).
  const half = (z: number) => { const t = Math.min(1, Math.max(0, (z - (F - 7)) / 7)); return W * (1 - 0.95 * Math.pow(t, 1.6)); };
  const hullPart = (y0: number, y1: number, c: string, grow = 0) => {
    const g = new THREE.BoxGeometry(2, y1 - y0, len, 6, 2, 48);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i), y = p.getY(i) + (y0 + y1) / 2, t = Math.min(1, Math.max(0, (z - (F - 7)) / 7));
      p.setX(i, p.getX(i) * (half(z) + grow));
      // The keel rises toward the bow; the stern rounds a little under the transom.
      p.setY(i, y < 0 ? y * (1 - 0.75 * t) : y);
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, m(c));
    mesh.castShadow = true;
    root.add(mesh);
  };
  hullPart(-0.9, 0.35, '#1f3a5a');
  hullPart(0.33, 0.47, '#c23b2a', 0.01);
  hullPart(0.45, DY, white);
  hullPart(DY - 0.02, DY + 0.05, wood, -0.12); // the deck
  // Rails round the foredeck, on posts.
  for (const s of [-1, 1]) {
    let prev: THREE.Vector3 | null = null;
    for (let z = -0.6; z <= F - 0.3; z += 0.9) {
      const x = s * (half(z) - 0.12), top = new THREE.Vector3(x, DY + 0.95, z);
      bx(root, 0.05, 0.95, 0.05, rail, x, DY + 0.48, z);
      if (prev) {
        const d = top.distanceTo(prev), mid = top.clone().add(prev).multiplyScalar(0.5);
        const r = bx(root, 0.05, 0.05, d, rail, mid.x, mid.y, mid.z);
        r.lookAt(root.localToWorld(top.clone()));
      }
      prev = top;
    }
  }
  // The cabin aft: windows all along, a lit band at night, solar panels on the roof.
  const panes: Array<[number, number]> = [];
  for (let z = B + 1.4; z + 1.2 < -1.2; z += 1.45) panes.push([z, z + 1.2]);
  const cB = B + 0.7, cF = -0.6, cTop = DY + 2.3;
  root.add(paintedShell({
    key: 'ferry-cabin', W: W - 0.35, y0: DY, y1: cTop, B: cB, F: cF, R: 0.3, belt: DY + 0.7, vTip: DY + 0.7,
    lower: '#f4f1ea', upper: '#f4f1ea', band: [DY + 0.62, 0.06, '#2f7fae'],
    side: panes.map(([a, b]) => ({ z: (a + b) / 2, hz: (b - a) / 2, y: DY + 1.35, hy: 0.5 })),
    front: [-1.5, 0, 1.5].map((x) => ({ x, hx: 0.6, y: DY + 1.35, hy: 0.5 })),
    back: [{ x: 0, hx: 0.55, y: DY + 0.95, hy: 0.95 }],
    arches: [],
  }));
  for (const s of [-1, 1]) for (const [a, b] of panes) glass(root, 0.03, 1.0, b - a, s * (W - 0.39), DY + 1.35, (a + b) / 2);
  for (const x of [-1.5, 0, 1.5]) glass(root, 1.2, 1.0, 0.03, x, DY + 1.35, cF - 0.04);
  bx(root, (W - 0.35) * 2 - 0.4, 0.06, cF - cB - 0.6, '#1d3566', 0, cTop + 0.05, (cB + cF) / 2 - 1.2); // solar panels
  // The wheelhouse on top, glazed all round.
  const wB = -4.4, wF = -1.4, wTop = cTop + 1.55;
  root.add(paintedShell({
    key: 'ferry-bridge', W: 1.5, y0: cTop, y1: wTop, B: wB, F: wF, R: 0.25, belt: cTop + 0.55, vTip: cTop + 0.55,
    lower: '#f4f1ea', upper: '#f4f1ea',
    side: [{ z: (wB + wF) / 2, hz: 1.2, y: cTop + 0.95, hy: 0.38 }],
    front: [{ x: 0, hx: 1.2, y: cTop + 0.95, hy: 0.38 }],
    back: [{ x: 0, hx: 0.9, y: cTop + 0.95, hy: 0.38 }],
    arches: [],
  }));
  glass(root, 2.5, 0.8, 0.03, 0, cTop + 0.95, wF - 0.04);
  for (const s of [-1, 1]) glass(root, 0.03, 0.8, 2.5, s * 1.46, cTop + 0.95, (wB + wF) / 2);
  bx(root, 3.3, 0.1, 3.4, '#2f7fae', 0, wTop + 0.05, (wB + wF) / 2); // its roof
  // Mast with the lamps and a flag.
  bx(root, 0.08, 2.2, 0.08, rail, 0, wTop + 1.1, wB + 0.6);
  bx(root, 0.02, 0.4, 0.7, '#2f7fae', 0, wTop + 1.95, wB + 0.2);
  bx(root, 0.14, 0.14, 0.14, '#fff6d8', 0, wTop + 2.25, wB + 0.6, true);
  bx(root, 0.1, 0.14, 0.2, '#e8303a', -1.52, cTop + 0.4, wF - 0.4, true); // port, red
  bx(root, 0.1, 0.14, 0.2, '#30e060', 1.52, cTop + 0.4, wF - 0.4, true); // starboard, green
  // Lifebuoys on the cabin front.
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 18), m('#ff6a2a'));
    ring.position.set(s * 2.35, DY + 1.35, cF + 0.02);
    root.add(ring);
  }
  // Their benches on the foredeck, each row its own; a planter down the middle between the two sides.
  const rows = [FERRY_SEATS.girl[2], ...new Set(FERRY_FAMILY_SEATS.map((q) => q[2]))];
  for (const z of rows) for (const sx of [-1, 1]) {
    bx(root, 1.1, 0.1, 0.5, wood, sx * 1.3, DY + 0.4, z);
    bx(root, 1.1, 0.5, 0.08, wood, sx * 1.3, DY + 0.72, z - 0.26);
    for (const lx of [-0.45, 0.45]) bx(root, 0.06, 0.4, 0.4, '#3a3a40', sx * 1.3 + lx, DY + 0.2, z);
  }
  const pz0 = Math.min(...rows) - 0.4, pz1 = Math.max(...rows) + 0.5;
  bx(root, 0.5, 0.55, pz1 - pz0, wood, 0, DY + 0.28, (pz0 + pz1) / 2);
  // Low clipped box hedge along it, lavender and marigolds in flower.
  const hedge = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.3, pz1 - pz0 - 0.1, 3, 0.12), m('#4f8a3e'));
  hedge.position.set(0, DY + 0.68, (pz0 + pz1) / 2);
  root.add(hedge);
  for (let z = pz0 + 0.25, k = 0; z < pz1 - 0.1; z += 0.32, k++) for (const x of [-0.12, 0.12]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), m(['#b79ae8', '#ffb43a', '#f4f1ea'][(k + (x > 0 ? 1 : 0)) % 3]));
    f.position.set(x, DY + 0.85, z + (x > 0 ? 0.14 : 0));
    root.add(f);
  }
  // Bollards and a coil of rope at the bow.
  for (const s of [-1, 1]) bx(root, 0.2, 0.3, 0.2, '#2a2a30', s * 0.9, DY + 0.15, F - 3.2);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 16), m('#c9a878'));
  rope.rotation.x = Math.PI / 2;
  rope.position.set(0, DY + 0.07, F - 4);
  root.add(rope);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

// ───────────────────────── the air taxi ─────────────────────────

/**
 * The air taxi (travel/air.ts): a rounded two-tone cabin with a wide windscreen, six ducted rotors
 * on swept booms, skids, and a thin cyan light along its belt. Rotor blades are tagged
 * `userData.rotor` so the ride spins them.
 */
export function buildAirTaxi(): THREE.Group {
  const root = new THREE.Group();
  const { halfW: W, len, floorY: FY } = AIR;
  const F = len / 2, B = -len / 2, top = FY + 1.75, body = '#f2f4f7', trim = '#2a3a55', neon = '#3ae8ff';
  root.add(paintedShell({
    key: 'air-cabin', W, y0: 0.3, y1: top, B, F, R: 0.65, belt: FY + 0.45, vTip: FY + 0.1, lower: trim, upper: body,
    side: [{ z: 1.2, hz: 0.75, y: FY + 1.0, hy: 0.45 }, { z: -0.6, hz: 0.75, y: FY + 1.0, hy: 0.45 }],
    front: [{ x: 0, hx: W - 0.4, y: FY + 0.95, hy: 0.55 }],
    back: [{ x: 0, hx: 0.6, y: FY + 1.1, hy: 0.3 }],
    arches: [],
  }));
  for (const s of [-1, 1]) for (const z of [1.2, -0.6]) glass(root, 0.03, 0.9, 1.5, s * (W - 0.03), FY + 1.0, z);
  glass(root, (W - 0.4) * 2, 1.1, 0.03, 0, FY + 0.95, F - 0.06);
  for (const s of [-1, 1]) bx(root, 0.03, 0.04, len - 1.4, neon, s * (W + 0.01), FY + 0.45, 0, true);
  bx(root, W * 2 - 0.2, 0.05, len - 0.6, '#5a5a62', 0, FY, 0); // the floor
  bx(root, W * 2 - 0.5, 0.3, 0.35, '#3a4a6a', 0, FY + 0.55, F - 0.55); // the dash
  // Seats in pairs, a console between the two front seats.
  const rows = [AIR_SEATS.girl[2], ...new Set(AIR_FAMILY_SEATS.map((q) => q[2]))];
  for (const z of rows) for (const sx of [-1, 1]) {
    bx(root, 0.8, 0.12, 0.55, '#3a5a8a', sx * 0.75, FY + 0.4, z);
    bx(root, 0.8, 0.7, 0.1, '#3a5a8a', sx * 0.75, FY + 0.8, z - 0.3);
  }
  bx(root, 0.3, 0.55, 0.9, '#2a2a30', 0, FY + 0.3, AIR_SEATS.girl[2] + 0.1);
  // Skids.
  for (const s of [-1, 1]) {
    bx(root, 0.08, 0.08, len - 1.2, '#c8ccd4', s * (W - 0.3), 0.04, 0);
    for (const z of [1.6, -1.6]) bx(root, 0.06, 0.34, 0.06, '#c8ccd4', s * (W - 0.3), 0.2, z);
  }
  // Six rotors on booms.
  for (const [x, z] of [[2.6, 2.1], [-2.6, 2.1], [3.0, 0], [-3.0, 0], [2.6, -2.1], [-2.6, -2.1]]) {
    const from = new THREE.Vector3(Math.sign(x) * (W - 0.2), top - 0.35, z * 0.5), to = new THREE.Vector3(x, top - 0.1, z);
    const d = from.distanceTo(to), mid = from.clone().add(to).multiplyScalar(0.5);
    const boom = bx(root, 0.12, 0.1, d, trim, mid.x, mid.y, mid.z);
    boom.lookAt(to);
    const duct = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 6, 24), m(body));
    duct.rotation.x = Math.PI / 2;
    duct.position.set(x, top - 0.1, z);
    root.add(duct);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 4, 24), m(neon, true));
    halo.rotation.x = Math.PI / 2;
    halo.position.set(x, top - 0.02, z);
    root.add(halo);
    const blades = new THREE.Group();
    blades.position.set(x, top - 0.1, z);
    blades.userData.rotor = true;
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.13), m('#2a2a30'));
      b.rotation.y = (k / 3) * Math.PI * 2;
      blades.add(b);
    }
    root.add(blades);
  }
  // Lamps: white ahead, red behind.
  for (const s of [-1, 1]) {
    bx(root, 0.3, 0.06, 0.04, '#fff6c0', s * (W - 0.45), FY + 0.2, F - 0.05, true);
    bx(root, 0.2, 0.06, 0.04, '#e8303a', s * (W - 0.4), FY + 0.6, B + 0.02, true);
  }
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

// ───────────────────────── the Sky Isles cable car ─────────────────────────

/**
 * A cable-car cabin (travel/gondola.ts): a rounded moonstone-and-lilac body glazed all round, a
 * hanger arm up to the grip that runs on the cable, a lamp under the roof. Its floor is at y = 0;
 * the cable runs TRAM_HANG above. The front bench has a divider between its two seats.
 */
export function buildTramCabin(): THREE.Group {
  const root = new THREE.Group();
  const { halfW: W, len } = TRAM, F = len / 2, B = -len / 2, top = 2.25, moon = '#f4f0ff', lilac = '#9a84e8', gold = '#d4af37';
  root.add(paintedShell({
    key: 'tram-cabin', W, y0: -0.25, y1: top, B, F, R: 0.4, belt: 0.75, vTip: 0.55, lower: lilac, upper: moon,
    band: [0.72, 0.04, gold],
    side: [{ z: 0, hz: F - 0.45, y: 1.45, hy: 0.55 }],
    front: [{ x: 0, hx: W - 0.35, y: 1.4, hy: 0.62 }],
    back: [{ x: 0, hx: W - 0.35, y: 1.45, hy: 0.55 }],
    arches: [],
  }));
  for (const s of [-1, 1]) glass(root, 0.03, 1.1, len - 0.9, s * (W - 0.03), 1.45, 0);
  glass(root, (W - 0.35) * 2, 1.24, 0.03, 0, 1.4, F - 0.05);
  glass(root, (W - 0.35) * 2, 1.1, 0.03, 0, 1.45, B + 0.05);
  bx(root, W * 2 - 0.15, 0.05, len - 0.2, '#6a6a78', 0, 0.02, 0); // the floor
  // Benches: theirs in front with a divider, the family's behind.
  for (const z of [TRAM_SEATS.girl[2], TRAM_FAMILY_SEATS[0][2]]) for (const sx of [-1, 1]) {
    bx(root, 0.9, 0.1, 0.5, '#5a4a9a', sx * 0.58, 0.45, z);
    bx(root, 0.9, 0.6, 0.08, '#5a4a9a', sx * 0.58, 0.78, z - 0.27);
  }
  bx(root, 0.12, 0.6, 0.55, gold, 0, 0.35, TRAM_SEATS.girl[2]);
  // Roof: a gilded crown rail, the hanger arm and the grip with its two sheaves on the cable.
  bx(root, W * 2 - 0.3, 0.08, len - 0.3, gold, 0, top + 0.02, 0);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, TRAM_HANG - top - 0.2, 8), m('#c8ccd4'));
  arm.position.set(0, (TRAM_HANG + top) / 2 - 0.1, 0);
  root.add(arm);
  bx(root, 0.3, 0.25, 1.3, '#3a3a44', 0, TRAM_HANG - 0.15, 0);
  for (const z of [-0.45, 0.45]) {
    const sheave = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14), m('#c8ccd4'));
    sheave.rotation.z = Math.PI / 2;
    sheave.position.set(0, TRAM_HANG, z);
    root.add(sheave);
  }
  // A lamp under the roof, and running lights at the corners.
  bx(root, 0.5, 0.05, 0.5, '#fff0c8', 0, top - 0.05, 0, true);
  for (const sx of [-1, 1]) for (const z of [F - 0.1, B + 0.1]) bx(root, 0.08, 0.08, 0.04, z > 0 ? '#bfe8ff' : '#ffc8f0', sx * (W - 0.2), top - 0.2, z, true);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

// ───────────────────────── city trams ─────────────────────────

/**
 * A city tram you ride (travel/streetTram.ts), one per town's style, all on a low floor with
 * windows down both sides and seats in pairs across the aisle — theirs in front, a rail between:
 *  - Sakura Hollow's streetcar: green below and cream above, a red band, a pantograph on the roof;
 *  - New Yonder's solar tram: white with a green stripe, solar panels over the roof, a strip of
 *    light along each side;
 *  - Maple Row's cable car: red below and cream above, open ends with brass grab-poles, varnished
 *    wooden benches, a brass bell and lanterns on the roof.
 */
export function buildStreetTram(style: TramStyle): THREE.Group {
  const root = new THREE.Group();
  const { halfW: W, len, floorY: FY } = STREET_TRAM, F = len / 2, B = -len / 2, top = FY + 2.45;
  const pal = style === 'streetcar' ? { lower: '#2f7a4a', upper: '#f2ead0', band: '#c23b2a', seat: '#3a6a4a', roof: '#6a6e78' }
    : style === 'solar' ? { lower: '#f4f6f8', upper: '#f4f6f8', band: '#3aae6a', seat: '#2a3a4a', roof: '#dfe3e8' }
    : { lower: '#b3262a', upper: '#f2ead0', band: '#d4af37', seat: '#8a5a36', roof: '#5a2a1a' };
  const winLo = FY + 0.85, winHi = FY + 1.95;
  const panes: Array<[number, number]> = [];
  const open = style === 'cable' ? 1.1 : 0; // the cable car's open ends
  for (let z = B + 0.6 + open; z + 1.0 < F - 0.9 - open; z += 1.2) panes.push([z, z + 1.0]);
  root.add(paintedShell({
    key: `street-tram-${style}`, W, y0: FY - 0.35, y1: top, B, F, R: style === 'solar' ? 0.55 : 0.25,
    belt: FY + 0.75, vTip: style === 'solar' ? FY + 0.5 : FY + 0.75, lower: pal.lower, upper: pal.upper,
    band: [FY + 0.7, style === 'solar' ? 0.06 : 0.05, pal.band],
    side: [...panes.map(([a, b]) => ({ z: (a + b) / 2, hz: (b - a) / 2, y: (winLo + winHi) / 2, hy: (winHi - winLo) / 2 })),
      ...(open ? [F - open / 2 - 0.1, B + open / 2 + 0.1].map((z) => ({ z, hz: open / 2, y: FY + 1.1, hy: 1.05 })) : [])],
    front: [{ x: 0, hx: W - 0.3, y: FY + 1.4, hy: 0.62 }],
    back: [{ x: 0, hx: W - 0.3, y: FY + 1.4, hy: 0.62 }],
    arches: [],
  }));
  for (const sx of [-1, 1]) for (const [a, b] of panes) glass(root, 0.03, winHi - winLo, b - a, sx * (W - 0.04), (winLo + winHi) / 2, (a + b) / 2);
  glass(root, (W - 0.3) * 2, 1.24, 0.03, 0, FY + 1.4, F - 0.05);
  glass(root, (W - 0.3) * 2, 1.24, 0.03, 0, FY + 1.4, B + 0.05);
  // The floor, the skirt over the bogies, and the bogies' wheels peeping below.
  bx(root, W * 2 - 0.1, 0.05, len - 0.3, style === 'cable' ? '#8a6a4a' : '#5a5a62', 0, FY, 0);
  bx(root, W * 2 - 0.2, 0.3, len - 1.2, '#2a2a30', 0, FY - 0.45, 0);
  for (const z of [F - 2, B + 2]) for (const sx of [-1, 1]) for (const dz of [-0.55, 0.55]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14), m('#3a3a40'));
    w.rotation.z = Math.PI / 2;
    w.position.set(sx * 0.72, 0.3, z + dz);
    w.userData.wheel = true;
    root.add(w);
  }
  // Seats in pairs across the aisle, a low partition behind each row; a rail between theirs.
  const rows = [STREET_TRAM_SEATS.girl[2], ...new Set(STREET_TRAM_FAMILY_SEATS.map((q) => q[2]))];
  for (const z of rows) for (const sx of [-1, 1]) {
    bx(root, 0.85, 0.1, 0.5, pal.seat, sx * 0.8, FY + 0.4, z);
    bx(root, 0.85, 0.6, 0.08, pal.seat, sx * 0.8, FY + 0.75, z - 0.28);
    if (style === 'cable') for (const k of [0.15, 0.3]) bx(root, 0.85, 0.03, 0.06, '#c89a5a', sx * 0.8, FY + 0.6 + k, z - 0.23);
  }
  bx(root, 0.05, 0.9, 0.5, '#8a8a92', 0, FY + 0.45, STREET_TRAM_SEATS.girl[2]);
  // Grab rails along the ceiling, lamps in the ceiling, the driver's desk at the front.
  for (const sx of [-1, 1]) bx(root, 0.04, 0.04, len - 1.2, '#c8ccd4', sx * 0.45, top - 0.35, 0);
  for (let z = B + 1.5; z < F - 1; z += 2.5) bx(root, 0.5, 0.04, 0.5, '#fff0c8', 0, top - 0.1, z, true);
  bx(root, W * 2 - 0.3, 0.45, 0.4, '#3a4a5a', 0, FY + 0.55, F - 0.35);
  // Head and tail lamps, and the route board.
  for (const sx of [-1, 1]) {
    bx(root, 0.26, 0.14, 0.04, '#fff6c0', sx * (W - 0.4), FY + 0.25, F + 0.01, true);
    bx(root, 0.2, 0.12, 0.04, '#e8303a', sx * (W - 0.4), FY + 0.25, B - 0.01, true);
  }
  bx(root, W * 2 - 0.9, 0.24, 0.04, '#ffd27a', 0, top - 0.3, F + 0.01, true);
  // The roof, each in its own way.
  bx(root, W * 2 - 0.4, 0.08, len - 0.6, pal.roof, 0, top + 0.03, 0);
  if (style === 'streetcar') {
    // A pantograph: a diamond of rods rising to a collector bar.
    const px = 0, pz = 0.8, base = top + 0.1, h = 1.1;
    bx(root, 0.9, 0.12, 0.9, '#3a3a44', px, base, pz);
    for (const [a, b] of [[[-0.4, base, pz - 0.4], [0, base + h * 0.55, pz]], [[0.4, base, pz + 0.4], [0, base + h * 0.55, pz]], [[0, base + h * 0.55, pz], [0, base + h, pz - 0.3]]] as Array<[number[], number[]]>) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 6), m('#c8ccd4'));
      rod.position.copy(A).addScaledVector(d, 0.5);
      rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      root.add(rod);
    }
    bx(root, 1.2, 0.04, 0.08, '#c8ccd4', px, base + h, pz - 0.3);
  } else if (style === 'solar') {
    // Solar panels tilted either side of the ridge, and a lit strip along each flank.
    for (const sx of [-1, 1]) for (let z = B + 0.8; z < F - 0.8; z += 1.4) {
      const p = bx(root, W - 0.2, 0.04, 1.25, '#1a2a4a', sx * (W / 2 - 0.05), top + 0.12, z);
      p.rotation.z = -sx * 0.12;
      bx(root, 0.02, 0.05, 1.25, '#8aa0c8', sx * (W / 2 - 0.05), top + 0.15, z);
    }
    for (const sx of [-1, 1]) bx(root, 0.02, 0.05, len - 1.4, '#3affb0', sx * (W + 0.01), FY + 0.72, 0, true);
  } else {
    // Brass grab-poles at the open ends, a brass bell up front, a lantern at each corner.
    for (const z of [F - open / 2 - 0.1, B + open / 2 + 0.1]) for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), m('#d4af37'));
      pole.position.set(sx * (W - 0.1), FY + 1.1, z);
      root.add(pole);
    }
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m('#d4af37'));
    bell.position.set(0, top + 0.12, F - 0.6);
    root.add(bell);
    for (const sx of [-1, 1]) for (const z of [F - 0.3, B + 0.3]) {
      bx(root, 0.16, 0.22, 0.16, '#2a2a2a', sx * (W - 0.25), top + 0.2, z);
      bx(root, 0.12, 0.16, 0.12, '#ffd89a', sx * (W - 0.25), top + 0.2, z, true);
    }
  }
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return root;
}

// ───────────────────────── the biplane ─────────────────────────

/**
 * The travellers' biplane, after the 1930s trainers (Tiger Moth, Stearman): a round cream fuselage
 * in painted steel with a red cheat line, an aluminium cowling over a five-cylinder radial and a
 * red spinner, a wooden two-blade propeller, doped red fabric wings (upper and lower, a little
 * dihedral, rib tapes showing) on N-struts and flying wires, a red tail, spoked wheels on a
 * V undercarriage. Two open cockpits in tandem — hers in front, his behind — a bulkhead between.
 */
function buildBiplane(root: THREE.Group, spinners: THREE.Object3D[]): void {
  const cream = '#e4d6b4', red = '#d8433a', alu = '#8a9098', wood = '#8a5a36', leather = '#5a3a26', wire = '#b8bcc4';
  const Y = 0.9;
  // The fuselage: a lathe along z, fullest behind the engine, tapering to the tail.
  const prof: Array<[number, number]> = [[0.05, -3.5], [0.14, -3.3], [0.3, -2.4], [0.46, -1.2], [0.56, 0], [0.6, 1.1], [0.58, 1.9], [0.52, 2.35]];
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 20), m(cream));
  fus.rotation.x = Math.PI / 2;
  fus.position.y = Y;
  root.add(fus);
  // The red cheat line along each side, and a red flash up the fin.
  for (const sx of [-1, 1]) {
    const pts = prof.slice(1, -1).map(([r, z]) => new THREE.Vector3(sx * (r + 0.005), Y + 0.08, z));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.045, 4), m(red));
    root.add(tube);
  }
  // Cowling and radial engine, spinner, propeller.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.53, 0.55, 20, 1, true), m(alu));
  cowl.rotation.x = Math.PI / 2;
  cowl.position.set(0, Y, 2.6);
  root.add(cowl);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8), m('#6a6e78'));
    cyl.position.set(Math.cos(a) * 0.36, Y + Math.sin(a) * 0.36, 2.7);
    cyl.rotation.z = a - Math.PI / 2;
    root.add(cyl);
  }
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 14), m(red));
  spinner.rotation.x = Math.PI / 2;
  spinner.position.set(0, Y, 3.05);
  root.add(spinner);
  const prop = new THREE.Group();
  prop.position.set(0, Y, 2.95);
  for (const s of [-1, 1]) {
    const blade = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.25, 0.05, 2, 0.02), m(wood));
    blade.position.y = s * 0.65;
    blade.rotation.y = s * 0.25; // the twist of the blade
    prop.add(blade);
  }
  root.add(prop);
  spinners.push(prop);
  // Wings: doped fabric over ribs, rounded tips; the lower pair with a little dihedral.
  const wing = (span: number, chord: number, x: number, y: number, z: number, rz: number) => {
    const w = new THREE.Mesh(new RoundedBoxGeometry(span, 0.12, chord, 3, 0.05), m(red));
    w.position.set(x, y, z);
    w.rotation.z = rz;
    root.add(w);
    for (let i = 0; i < Math.floor(span / 0.55); i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.125, chord - 0.1), m('#e8645a'));
      rib.position.set(-span / 2 + 0.3 + i * 0.55, 0, 0);
      w.add(rib);
    }
  };
  wing(9.2, 1.35, 0, 2.2, 0.55, 0);
  for (const s of [-1, 1]) wing(4.0, 1.3, s * 2.35, 0.55 + 0.1, 0.35, s * 0.05);
  // Cabane struts to the upper wing, N-struts between the wings, flying wires.
  const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, c: string) => {
    const d = a.distanceTo(b), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, 6), m(c));
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    root.add(mesh);
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    for (const z of [0.95, 0.15]) strut(V(s * 0.35, Y + 0.45, z + 0.1), V(s * 0.55, 2.15, z), 0.035, alu);
    strut(V(s * 3.4, 0.75, 0.85), V(s * 3.4, 2.15, 0.9), 0.04, wood);
    strut(V(s * 3.4, 0.75, 0.0), V(s * 3.4, 2.15, 0.05), 0.04, wood);
    strut(V(s * 3.4, 0.75, 0.0), V(s * 3.4, 2.15, 0.9), 0.03, wood);
    strut(V(s * 0.4, 0.65, 0.4), V(s * 3.3, 2.15, 0.45), 0.012, wire);
    strut(V(s * 0.6, 2.15, 0.45), V(s * 3.3, 0.8, 0.45), 0.012, wire);
  }
  // Tailplane, fin and rudder, tail skid.
  const tail = new THREE.Mesh(new RoundedBoxGeometry(2.8, 0.08, 0.85, 2, 0.03), m(red));
  tail.position.set(0, Y + 0.05, -3.05);
  root.add(tail);
  const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.05, 0), new THREE.Vector2(0.55, 1.1), new THREE.Vector2(0.1, 1.2), new THREE.Vector2(-0.05, 0.9)]);
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false }), m(red));
  fin.rotation.y = -Math.PI / 2;
  fin.position.set(-0.03, Y + 0.1, -3.55);
  root.add(fin);
  strut(V(0, Y - 0.15, -3.2), V(0, 0.08, -3.45), 0.025, '#3a3a40');
  // Two open cockpits in tandem, a padded coaming round each, little windscreens; a bulkhead between.
  for (const z of [0.6, -0.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 6, 20), m(leather));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, Y + 0.52, z);
    root.add(ring);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.02), GLASS);
    ws.position.set(0, Y + 0.68, z + 0.45);
    ws.rotation.x = -0.35;
    root.add(ws);
  }
  bx(root, 0.1, 0.5, 0.1, '#6b4a2a', 0, 0.9, -0.15); // the bulkhead between the tandem seats
  // Undercarriage: V struts to the axle, spoked wheels.
  for (const s of [-1, 1]) {
    strut(V(s * 0.3, Y - 0.35, 1.3), V(s * 0.95, 0.32, 1.15), 0.035, '#3a3a40');
    strut(V(s * 0.3, Y - 0.35, 0.55), V(s * 0.95, 0.32, 1.15), 0.035, '#3a3a40');
    busWheel(root, 0.32, s * 1.05, 0.32, 1.15);
  }
  // A lamp at each upper wingtip: red to port, green to starboard.
  bx(root, 0.08, 0.08, 0.14, '#e8303a', -4.62, 2.2, 0.6, true);
  bx(root, 0.08, 0.08, 0.14, '#30e060', 4.62, 2.2, 0.6, true);
}
