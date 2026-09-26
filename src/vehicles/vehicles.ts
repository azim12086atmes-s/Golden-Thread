import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';
import { BODY_RADIUS } from '../characters/follow';
import { DRAGON_SCALE, Dragon } from '../event/Dragon';

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
  van: { id: 'van', name: 'Safar the van', icon: '🚐', kind: 'ground', maxSpeed: 28, accel: 11, turn: 1.6, seats: [{ x: -0.62, y: 0.95, z: 1.3 }, { x: 0.62, y: 0.95, z: 1.3 }], price: 0, blurb: 'Home on wheels. Decorate the inside.' },
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
      bx(root, 2.3, 1.15, 5, '#8fc8c0', 0, 0.975, 0);
      bx(root, 2.32, 0.25, 5.02, '#f7f3ea', 0, 2.2, 0);
      bx(root, 2.3, 0.55, 2.9, '#f7f3ea', 0, 1.8, -1.05);
      for (const [x, z] of [[-1.1, 2.45], [1.1, 2.45], [-1.1, 0.35], [1.1, 0.35]]) bx(root, 0.12, 0.55, 0.12, '#f7f3ea', x, 1.8, z);
      glass(root, 2.2, 0.55, 0.04, 0, 1.8, 2.47);
      for (const x of [-1.14, 1.14]) glass(root, 0.04, 0.55, 2.0, x, 1.8, 1.4);
      for (const x of [-1.16, 1.16]) bx(root, 0.03, 0.4, 1.4, '#bfe3ff', x, 1.8, -1.2);
      bx(root, 0.16, 0.6, 1.0, '#8a6a4a', 0, 1.25, 1.4); // divider between the front seats
      bx(root, 2.4, 0.2, 5.1, '#6b4a2a', 0, 2.45, -0.2);
      bx(root, 2, 0.35, 1.8, van?.rug === 'plain' ? '#c23b2a' : '#e2b43a', 0, 2.72, -1.2);
      for (const [x, z] of [[-1.05, 1.6], [1.05, 1.6], [-1.05, -1.7], [1.05, -1.7]]) wheel(root, 0.45, x, 0.45, z);
      bx(root, 0.5, 0.3, 0.05, '#fff6c0', -0.75, 0.9, 2.52, true);
      bx(root, 0.5, 0.3, 0.05, '#fff6c0', 0.75, 0.9, 2.52, true);
      if (van && van.lights !== 'none') {
        const cols = van.lights === 'rainbow' ? ['#ff8a8a', '#fff08a', '#8ac8ff', '#c8a4ff'] : ['#fff0b0'];
        for (let i = 0; i < 14; i++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), m(cols[i % cols.length], true));
          s.position.set(1.18, 2.35 - Math.sin((i / 13) * Math.PI) * 0.18, -2.4 + i * 0.37);
          root.add(s);
          const s2 = s.clone();
          s2.position.x = -1.18;
          root.add(s2);
        }
      }
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
