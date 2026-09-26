import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';
import { BODY_RADIUS } from '../characters/follow';
import { DRAGON_SCALE, Dragon } from '../event/Dragon';
import { BUNKS, CAB_SEATS, PET_BEDS, VAN } from './vanLayout';

/**
 * Ways to travel. In every vehicle the two sit in separate seats with a divider between them, and
 * on unicorns each rides their own — the no-touch rule holds in motion too (tests/vehicles.test.ts).
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
function m(c: string, glow = false): THREE.Material {
  const k = c + glow;
  if (!cache.has(k)) cache.set(k, glow
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false })
    : new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.6, metalness: 0.1 }));
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
      bx(root, 2.0, 0.6, 3.8, '#e8576a', 0, 0.55, 0);
      bx(root, 1.8, 0.1, 2.0, '#f7f3ea', 0, 2.1, -0.1);
      for (const [x, z] of [[-0.86, 0.85], [0.86, 0.85], [-0.86, -1.05], [0.86, -1.05]]) bx(root, 0.1, 1.25, 0.1, '#f7f3ea', x, 1.47, z);
      glass(root, 1.72, 1.2, 0.04, 0, 1.47, 0.87);
      glass(root, 1.72, 1.2, 0.04, 0, 1.47, -1.07);
      for (const x of [-0.88, 0.88]) glass(root, 0.04, 1.2, 1.9, x, 1.47, -0.1);
      bx(root, 0.16, 0.5, 1.2, '#8a6a4a', 0, 1.05, 0.1); // divider console between the seats
      for (const [x, z] of [[-0.95, 1.2], [0.95, 1.2], [-0.95, -1.2], [0.95, -1.2]]) wheel(root, 0.36, x, 0.36, z);
      bx(root, 0.4, 0.2, 0.05, '#fff6c0', -0.6, 0.6, 1.92, true);
      bx(root, 0.4, 0.2, 0.05, '#fff6c0', 0.6, 0.6, 1.92, true);
      break;
    }
    case 'van': {
      buildVan(root, van);
      break;
    }
    case 'truck': {
      bx(root, 2.5, 0.9, 2.4, '#3a6ea5', 0, 1.25, 2.2);
      bx(root, 2.5, 0.15, 2.4, '#3a6ea5', 0, 2.9, 2.2);
      for (const [x, z] of [[-1.2, 3.35], [1.2, 3.35], [-1.2, 1.05], [1.2, 1.05]]) bx(root, 0.12, 1.2, 0.12, '#3a6ea5', x, 2.25, z);
      glass(root, 2.3, 1.1, 0.04, 0, 2.25, 3.38);
      for (const x of [-1.22, 1.22]) glass(root, 0.04, 1.1, 2.2, x, 2.25, 2.2);
      bx(root, 0.16, 0.7, 1.0, '#8a6a4a', 0, 1.9, 2.3);
      bx(root, 2.6, 0.4, 7.4, '#3a3a40', 0, 0.8, -0.4);
      bx(root, 2.6, 1.9, 4.6, '#d9a066', 0, 2, -1.8);
      for (let i = 0; i < 4; i++) bx(root, 2.62, 0.1, 4.62, '#8a5a36', 0, 1.2 + i * 0.5, -1.8);
      for (const [x, z] of [[-1.15, 2.4], [1.15, 2.4], [-1.15, -1.2], [1.15, -1.2], [-1.15, -2.8], [1.15, -2.8]]) wheel(root, 0.55, x, 0.55, z);
      bx(root, 0.5, 0.3, 0.05, '#fff6c0', -0.8, 1.1, 3.42, true);
      bx(root, 0.5, 0.3, 0.05, '#fff6c0', 0.8, 1.1, 3.42, true);
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
 * Safar, the travellers' home on wheels: long and tall enough for the room inside (vanLayout.ts)
 * — two separate beds at the back, four children's bunks (the round windows), two facing
 * benches by the big windows, pet beds and a kitchen by the door, and the cab in front with two
 * separate seats and a console between. Teal and cream, with a painted band of golden-thread
 * vines, a striped awning, a roof rack with a rolled carpet and bags, and a ladder at the back.
 */
function buildVan(root: THREE.Group, van?: { lights: string; rug: string }): void {
  const { halfW: W, back: B, cab: C, front: F, floorY: FY, wall } = VAN;
  const top = FY + wall, len = C - B, mid = (C + B) / 2;
  const teal = '#6fb8ae', cream = '#f7f1e3', wood = '#6b4a2a', gold = '#e2b43a', dark = '#2a3a44';
  // Chassis and skirts.
  bx(root, W * 2 - 0.1, 0.4, F - B - 0.3, '#3a3a40', 0, 0.55, (F + B) / 2);
  // Living cabin walls: solid panels round real window openings (so the crew inside shows).
  const winLo = FY + 0.72, winHi = FY + 1.6;
  const openings: Array<[number, number]> = [[-0.45, 1.55], [-2.35, -0.75]]; // bench windows, bunk windows
  for (const sx of [-1, 1]) {
    const x = sx * (W - 0.03);
    bx(root, 0.06, winLo - FY, len, teal, x, (FY + winLo) / 2, mid); // below the windows
    bx(root, 0.06, top - winHi, len, cream, x, (winHi + top) / 2, mid); // above
    // Between and around the openings.
    const cuts = [B, ...openings.flatMap(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((a, b) => a - b), C];
    for (let i = 0; i < cuts.length; i += 2) if (cuts[i + 1] - cuts[i] > 0.01) bx(root, 0.06, winHi - winLo, cuts[i + 1] - cuts[i], i === 0 || i === cuts.length - 2 ? teal : cream, x, (winLo + winHi) / 2, (cuts[i] + cuts[i + 1]) / 2);
    // Glass in the openings, framed in gold; the bunk windows are round portholes' squared cousins.
    for (const [a, b] of openings) {
      glass(root, 0.03, winHi - winLo, Math.abs(b - a), x, (winLo + winHi) / 2, (a + b) / 2);
      bx(root, 0.08, 0.05, Math.abs(b - a) + 0.1, gold, x, winHi + 0.02, (a + b) / 2);
      bx(root, 0.08, 0.05, Math.abs(b - a) + 0.1, gold, x, winLo - 0.02, (a + b) / 2);
      bx(root, 0.07, winHi - winLo, 0.06, cream, x, (winLo + winHi) / 2, (a + b) / 2);
    }
    // The golden-thread band: a wavy line of vines and flowers along the whole body.
    bx(root, 0.07, 0.06, len, gold, x * 1.005, winLo - 0.2, mid);
    for (let i = 0; i < 22; i++) {
      const z = B + 0.2 + i * (len - 0.4) / 21, y = winLo - 0.2 + Math.sin(i * 1.1) * 0.12;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), m(i % 3 ? '#4f9a6a' : '#ff8fb8'));
      leaf.position.set(x * 1.01, y, z);
      root.add(leaf);
    }
    // Wheel arches.
    for (const z of [B + 1.4, C - 0.6]) bx(root, 0.1, 0.25, 1.5, dark, x * 1.01, FY + 0.05, z);
  }
  // Back wall with a window, and the ladder to the roof.
  bx(root, W * 2, wall, 0.08, teal, 0, FY + wall / 2, B);
  glass(root, 1.2, 0.6, 0.03, 0, FY + 1.5, B - 0.05);
  for (const x of [-0.95, -0.55]) bx(root, 0.05, wall + 0.4, 0.05, wood, x, FY + wall / 2 + 0.2, B - 0.08);
  for (let r = 0; r < 7; r++) bx(root, 0.45, 0.04, 0.05, wood, -0.75, FY + 0.25 + r * 0.33, B - 0.08);
  // A barrel roof, cream, with a skylight.
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(W + 0.05, W + 0.05, len + 0.1, 18, 1, false, -Math.PI / 2, Math.PI), m(cream));
  roof.rotation.x = -Math.PI / 2;
  roof.scale.set(1, 1, 0.34);
  roof.position.set(0, top, mid);
  root.add(roof);
  bx(root, 1.0, 0.12, 1.4, '#9fd8ff', 0, top + 0.5, 0.4);
  // Roof rack: rails, a rolled carpet and travel bags.
  for (const x of [-0.95, 0.95]) bx(root, 0.05, 0.05, 3.4, wood, x, top + 0.62, -1.6);
  for (let i = 0; i < 5; i++) bx(root, 1.95, 0.04, 0.05, wood, 0, top + 0.6, -3.2 + i * 0.8);
  const carpet = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 10), m(van?.rug === 'plain' || !van ? '#c23b2a' : '#e2b43a'));
  carpet.rotation.z = Math.PI / 2;
  carpet.position.set(0, top + 0.82, -2.6);
  root.add(carpet);
  for (const [x, z, c] of [[-0.5, -1.2, '#8a5a36'], [0.45, -1.4, '#2f6f9a'], [0, -0.6, '#b5654a']] as const) bx(root, 0.6, 0.35, 0.5, c, x, top + 0.82, z);
  // The cab: lower, with a sloped windscreen and a console between the two seats.
  bx(root, W * 2, 1.15, F - C, teal, 0, FY + 0.15, (C + F) / 2);
  bx(root, W * 2, 0.8, 0.5, cream, 0, FY + 0.4, F - 0.2);
  for (const x of [-(W - 0.05), W - 0.05]) bx(root, 0.1, 1.0, 0.1, cream, x, FY + 1.2, F - 0.55);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(W * 2 - 0.2, 1.0, 0.04), GLASS);
  shield.position.set(0, FY + 1.2, F - 0.6);
  shield.rotation.x = -0.3;
  root.add(shield);
  for (const x of [-W + 0.02, W - 0.02]) glass(root, 0.03, 0.9, F - C - 0.6, x, FY + 1.2, (C + F) / 2 - 0.25);
  bx(root, W * 2, 0.1, F - C - 0.3, cream, 0, FY + 1.72, (C + F) / 2 - 0.35);
  bx(root, 0.2, 0.6, 1.0, '#8a6a4a', 0, FY + 0.25, CAB_SEATS[0][2]); // the console between their seats
  for (const [x, , z] of CAB_SEATS) {
    bx(root, 0.62, 0.14, 0.6, '#c8483a', x, FY + 0.35, z);
    bx(root, 0.62, 0.7, 0.12, '#c8483a', x, FY + 0.7, z - 0.32);
  }
  // Bumper, headlights and the name plate.
  bx(root, W * 2 + 0.1, 0.2, 0.2, '#d9d9e0', 0, 0.6, F + 0.05);
  for (const x of [-0.95, 0.95]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), m('#fff6c0', true));
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, 1.0, F + 0.02);
    root.add(hl);
  }
  bx(root, 0.9, 0.2, 0.04, gold, 0, 1.25, F + 0.03);
  // A striped awning rolled out over the bench windows on her side.
  for (let i = 0; i < 8; i++) {
    const a = bx(root, 0.9, 0.04, 0.26, i % 2 ? '#ffffff' : '#e8576a', -(W + 0.4), top - 0.05 - 0.02, -0.4 + i * 0.26);
    a.rotation.z = 0.25;
  }
  bx(root, 0.06, 0.06, 2.2, wood, -(W + 0.82), top - 0.17, 0.5);
  // The inside you can see through the windows: bunk frames with lanterns, benches, curtains.
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
  bx(root, W * 2 - 0.1, 0.05, len, '#9a7450', 0, FY, mid); // the cabin floor
  // Wheels.
  for (const [x, z] of [[-W + 0.1, C + 0.2], [W - 0.1, C + 0.2], [-W + 0.1, B + 1.4], [W - 0.1, B + 1.4]]) wheel(root, 0.55, x, 0.55, z);
  // Fairy lights under the eaves.
  if (van && van.lights !== 'none') {
    const cols = van.lights === 'rainbow' ? ['#ff8a8a', '#fff08a', '#8ac8ff', '#c8a4ff'] : ['#fff0b0'];
    for (let i = 0; i < 20; i++) {
      const z = B + 0.2 + i * (len - 0.4) / 19;
      for (const x of [-W - 0.05, W + 0.05]) {
        const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), m(cols[i % cols.length], true));
        s2.position.set(x, top - 0.1 - Math.sin((i / 19) * Math.PI * 3) * 0.12, z);
        root.add(s2);
      }
    }
  }
}
