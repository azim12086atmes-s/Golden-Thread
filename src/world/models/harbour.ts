import * as THREE from 'three';
import type { Ctx } from '../architecture';
import { M, box, cone, cyl, gable, hip, sphere } from '../kit';
import type { RegionId } from '../regions';

/** The harbour's deck height above the sea (the pier and quay are walked on at this level). */
export const DECK = 1.2;
/** The harbour office and warehouse on the shore (local frame), for collisions. */
export const WAREHOUSE = { x: -9, z: -16, w: 12, d: 8, h: 5 } as const;
/** The lighthouse at the quay's far end (local frame), for collisions. */
export const LIGHTHOUSE = { x: 12, z: -10, r: 1.7, h: 15 } as const;

/**
 * MODEL CONTRACT (docs/team/handoffs/CHATGPT_3D_MODELS.md §22): a harbour in the land `c.s`'s own
 * style. Local frame: origin on the quay at the shore, +z straight out to sea, the deck at y = 0
 * (= sea level + DECK). The pier runs from z = 0 to z = `pier` (4 m wide, walkable — its deck flat at
 * y = 0); ships come alongside its head. On the land side (z < 0) the quay and the warehouse at
 * `WAREHOUSE`. `ground(x, z)` is the terrain height at a local point relative to the deck.
 *
 * Built by Claude (owner: "detail the docks"): a stone quay with coping and iron ladders; a timber
 * pier on braced piles with plank seams, a rail, bollards with coiled rope and lamps; a jib crane
 * with its cable and hook; crates, barrels and sacks; a striped lighthouse with a glowing lantern
 * room — and each coast's own harbour: container stacks and a brick warehouse (London, New Yonder,
 * Maple Row), red fishing huts with stockfish racks and nets (Fjordhavn, Aurora), a dhow on its
 * slipway under palm shades (the Gulf, Rimal, the Nile), stilted thatched boathouses (Kaveri
 * Coast, Gulabi Nagar, Bagh-e-Noor), a tiled harbour gate hung with lanterns (Korea, China), and a
 * lake-steamer landing with flower boxes (Alpenrose).
 */
type Style = 'port' | 'terminal' | 'pavilion' | 'fishing' | 'dhow' | 'felucca' | 'stilts' | 'ghat' | 'gate' | 'lake';
const STYLE: Partial<Record<RegionId, Style>> = {
  london: 'port', newyork: 'terminal', vintage: 'pavilion',
  norway: 'fishing', aurora: 'fishing',
  middleeast: 'dhow', desert: 'dhow', egypt: 'felucca',
  indiasouth: 'stilts', indianorth: 'ghat', mughal: 'ghat',
  korea: 'gate', china: 'gate', switzerland: 'lake',
};

/** Steps from the quay's edge down into the water, `w` wide, centred on x. */
function steps(c: Ctx, x: number, w: number, col: string): void {
  for (let k = 0; k < 6; k++) box(c.g, w, 0.32, 0.8, col, x, -0.32 * (k + 1), 1.2 + k * 0.8);
  for (const sx of [-1, 1]) box(c.g, 0.4, 0.6, 5, col, x + sx * (w / 2 + 0.2), -1.8, 3.2);
}
/** A chhatri: a domed pavilion on four slender pillars, on a plinth. */
function chhatri(c: Ctx, x: number, y: number, z: number, s: number, stone: string, dome: string): void {
  box(c.g, 2.4 * s, 0.4 * s, 2.4 * s, stone, x, y, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.12 * s, 0.14 * s, 2.2 * s, stone, x + dx * 0.9 * s, y + 0.4 * s, z + dz * 0.9 * s, 8);
  box(c.g, 2.6 * s, 0.25 * s, 2.6 * s, stone, x, y + 2.6 * s, z);
  sphere(c.g, 1.05 * s, dome, x, y + 2.85 * s, z, 12, 0.9);
  cone(c.g, 0.12 * s, 0.6 * s, '#d4af37', x, y + 3.8 * s, z, 6);
}
/** A little felucca moored alongside: a slim hull and its tall lateen sail furled on the yard. */
function felucca(c: Ctx, x: number, z: number): void {
  c.g.add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.9, 0.7, 3.6), '#f4f1e8', M(x, -1, z));
  box(c.g, 1.4, 0.1, 6, '#8a6a4a', x, -1.05, z);
  cyl(c.g, 0.06, 0.08, 5, '#6b4a2a', x, -1, z + 1, 5);
  c.g.add(new THREE.CylinderGeometry(0.12, 0.12, 8, 5), '#e8e0d0', M(x, 3, z - 0.5, 0, 1, 1, 1, 0.9, 0));
}

const WOOD = '#8a6a4a', DARK = '#5a4432', IRON = '#3a3a40', STONE = '#9a948a';

function crate(c: Ctx, x: number, y: number, z: number, s: number, col = '#a8804a'): void {
  box(c.g, s, s, s, col, x, y, z);
  for (const sx of [-1, 1]) box(c.g, s * 1.02, 0.06, 0.06, DARK, x, y + (sx > 0 ? s - 0.05 : 0.02), z + s / 2);
  c.g.add(new THREE.BoxGeometry(0.06, s * 1.3, 0.06), DARK, M(x, y + s / 2, z + s / 2 + 0.01, 0, 1, 1, 1, 0, Math.PI / 4));
}
function barrel(c: Ctx, x: number, y: number, z: number): void {
  cyl(c.g, 0.32, 0.32, 0.9, '#7a5a3a', x, y, z, 10);
  for (const yy of [0.15, 0.7]) cyl(c.g, 0.34, 0.34, 0.06, IRON, x, y + yy, z, 10);
}
function bollard(c: Ctx, x: number, z: number): void {
  cyl(c.g, 0.2, 0.26, 0.55, IRON, x, 0, z, 8);
  cyl(c.g, 0.3, 0.3, 0.08, IRON, x, 0.55, z, 8);
  c.g.add(new THREE.TorusGeometry(0.34, 0.06, 4, 12), '#c9b27a', M(x, 0.08, z, 0, 1, 1, 1, Math.PI / 2, 0));
}

export function buildHarbour(c: Ctx, pier: number, ground: (x: number, z: number) => number): void {
  const style = STYLE[c.s.id] ?? 'port';
  // ── The quay: a stone apron down into the water, coping stones along its edge, iron ladders.
  box(c.g, 26, 5, 10, STONE, 0, -4.9, -4);
  box(c.g, 26.4, 0.3, 10.4, '#b8b0a2', 0, -0.1, -4);
  for (let x = -12.6; x <= 12.6; x += 1.4) box(c.g, 1.3, 0.35, 0.6, '#c4bcae', x, -0.05, 0.9);
  for (let x = -12.6; x <= 12.6; x += 1.4) for (let y = -4.2; y < -0.6; y += 0.8) box(c.g, 1.34, 0.04, 0.02, '#7a746a', x + (y % 1.6 ? 0.7 : 0), y, 1.02);
  for (const x of [-7, 7]) for (let k = 0; k < 6; k++) box(c.g, 0.5, 0.05, 0.05, IRON, x, -3.6 + k * 0.6, 1.05);
  for (const x of [-10, -4, 4, 10]) bollard(c, x, 0.4);
  // ── The pier: planks on braced piles, seams between the planks, a rail, lamps and bollards.
  box(c.g, 4, 0.25, pier, WOOD, 0, -0.2, pier / 2);
  for (let z = 0.4; z < pier; z += 0.9) box(c.g, 4.02, 0.02, 0.04, DARK, 0, 0.04, z);
  for (let z = 2; z <= pier; z += 4) {
    for (const x of [-1.8, 1.8]) cyl(c.g, 0.18, 0.2, 6, DARK, x, -6, z, 6);
    c.g.add(new THREE.BoxGeometry(0.12, 4.6, 0.12), DARK, M(0, -2.6, z, 0, 1, 1, 1, 0, 0.66));
    box(c.g, 3.8, 0.18, 0.18, DARK, 0, -0.7, z);
  }
  for (let z = 1; z <= pier; z += 2) cyl(c.g, 0.05, 0.05, 1, DARK, 1.95, 0, z, 4);
  box(c.g, 0.08, 0.08, pier, DARK, 1.95, 1, pier / 2);
  for (const x of [-1.6, 1.6]) bollard(c, x, pier - 0.6);
  for (let z = 6; z <= pier; z += 12) {
    cyl(c.g, 0.06, 0.06, 3, IRON, 1.9, 0, z, 5);
    box(c.g, 0.5, 0.06, 0.06, IRON, 1.7, 3, z);
    cyl(c.glow, 0.14, 0.12, 0.35, c.s.glow, 1.5, 2.6, z, 6);
    cone(c.g, 0.2, 0.18, IRON, 1.5, 2.95, z, 6);
  }
  // Coiled rope and a life ring by the pier head.
  c.g.add(new THREE.TorusGeometry(0.35, 0.08, 4, 14), '#c9b27a', M(-1.2, 0.05, pier - 2, 0, 1, 1, 1, Math.PI / 2, 0));
  c.g.add(new THREE.TorusGeometry(0.38, 0.1, 5, 14), '#e8342a', M(1.95, 0.7, pier - 3, Math.PI / 2));

  // ── A jib crane by the pier head: a lattice tower, the jib, a counterweight, a cable and hook.
  const cz = Math.max(4, pier - 8), tx = -3.4;
  for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(c.g, 0.14, 9, 0.14, '#d9a441', tx + dx, 0, cz + dz);
  for (let y = 1; y < 9; y += 1.2) for (const sz of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.06, 1.1, 0.06), '#d9a441', M(tx, y + 0.5, cz + sz * 0.35, 0, 1, 1, 1, 0, 0.8 * sz));
  box(c.g, 1.4, 1.1, 1.4, '#c98a2a', tx, 9, cz);
  box(c.g, 0.4, 0.4, 9, '#d9a441', tx, 9.6, cz + 3.4);
  box(c.g, 1.2, 1, 1.4, IRON, tx, 9.2, cz - 2.2);
  cyl(c.g, 0.02, 0.02, 4.5, '#2a2a2a', tx, 5.2, cz + 7.4, 3);
  c.g.add(new THREE.TorusGeometry(0.22, 0.05, 4, 10, Math.PI * 1.4), IRON, M(tx, 5, cz + 7.4, 0, 1, 1, 1, 0, Math.PI));

  // ── Goods on the quay: crates, barrels, sacks.
  for (let i = 0; i < 5; i++) crate(c, 5 + (i % 3) * 1.3, Math.floor(i / 3) * 1.1, -3 - (i % 2) * 1.2, 1.1);
  for (let i = 0; i < 6; i++) barrel(c, -4 - (i % 3) * 0.75, 0, -2.2 - Math.floor(i / 3) * 0.75);
  for (let i = 0; i < 4; i++) c.g.add(new THREE.SphereGeometry(0.4, 7, 5).scale(1, 0.7, 1.3), '#d8c8a0', M(2 + i * 0.7, 0.28, -6.5));

  // ── A lighthouse at the quay's far end: striped tower, gallery, glowing lantern room, cap.
  const lx = LIGHTHOUSE.x, lz = LIGHTHOUSE.z;
  const ly = ground(lx, lz);
  for (let k = 0; k < 6; k++) cyl(c.g, 1.5 - k * 0.12, 1.62 - k * 0.12, 2, k % 2 ? '#e8342a' : '#f4f1e8', lx, ly + k * 2, lz, 12);
  cyl(c.g, 1.4, 1.4, 0.2, IRON, lx, ly + 12, lz, 12);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cyl(c.g, 0.03, 0.03, 0.8, IRON, lx + Math.cos(a) * 1.35, ly + 12.2, lz + Math.sin(a) * 1.35, 3); }
  cyl(c.glow, 0.75, 0.75, 1.3, '#fff4c0', lx, ly + 12.2, lz, 10);
  cone(c.g, 1.05, 1.1, IRON, lx, ly + 13.5, lz, 12);
  sphere(c.g, 0.18, '#c9a24a', lx, ly + 14.7, lz, 6);

  // ── The warehouse / office.
  const wy = ground(WAREHOUSE.x, WAREHOUSE.z);
  const wx = WAREHOUSE.x, wz = WAREHOUSE.z, ww = WAREHOUSE.w, wd = WAREHOUSE.d, wh = WAREHOUSE.h;
  box(c.g, ww, wh, wd, style === 'port' ? '#9a4a3a' : c.rng.pick(c.s.walls), wx, wy - 0.5, wz);
  gable(c.g, ww + 0.6, wd + 0.6, 2, c.rng.pick(c.s.roofs), wx, wy + wh - 0.5, wz);
  box(c.g, 3, 3, 0.1, '#5a3a26', wx, wy - 0.5, wz + wd / 2 + 0.03);
  for (const sx of [-1, 1]) box(c.glow, 1.1, 1.3, 0.05, c.s.glow, wx + sx * 3.5, wy + 1.6, wz + wd / 2 + 0.04);
  box(c.g, 4, 0.5, 0.06, '#2a2a2a', wx, wy + wh - 1.4, wz + wd / 2 + 0.05); // the name board

  // ── Each coast's own harbour.
  switch (style) {
    case 'port': {
      const cols = ['#c23b2a', '#2f6f9a', '#e2b43a', '#3f8a3a', '#e07a2a'];
      for (let i = 0; i < 9; i++) {
        const x = 4 + (i % 3) * 2.7, y = ground(x, -14) + Math.floor(i / 3) * 2.6 - 0.5, col = cols[(i * 3) % cols.length];
        box(c.g, 2.5, 2.5, 6, col, x, y, -14);
        for (let k = 0; k < 10; k++) box(c.g, 0.06, 2.3, 0.04, '#1f1f24', x - 1.1 + k * 0.24, y + 0.1, -10.98);
      }
      break;
    }
    case 'fishing': {
      // Red fishing huts on the quay's edge, racks of drying stockfish, nets hung out.
      for (const x of [3, 8]) {
        const y = ground(x, -12);
        box(c.g, 4, 3, 4, '#b0322a', x, y - 0.4, -12);
        gable(c.g, 4.4, 4.4, 1.6, '#3b3b40', x, y + 2.6, -12);
        box(c.glow, 0.7, 0.8, 0.05, c.s.glow, x, y + 1, -9.97);
      }
      for (let k = 0; k < 2; k++) {
        const z = -16 - k * 2.2;
        for (const x of [-3, 3]) cyl(c.g, 0.07, 0.07, 3, '#6b4a2a', x, ground(x, z) - 0.4, z, 4);
        box(c.g, 6.2, 0.1, 0.1, '#6b4a2a', 0, ground(0, z) + 2.4, z);
        for (let i = 0; i < 16; i++) box(c.g, 0.12, 0.9, 0.05, '#c8b89a', -2.8 + i * 0.37, ground(0, z) + 1.5, z);
      }
      c.g.add(new THREE.PlaneGeometry(3, 1.6, 6, 3), '#3a4a3a', M(-6, 1.2, -1.2));
      break;
    }
    case 'dhow': {
      // A dhow on its slipway, ribs half-planked; palm-frond shades over the quay.
      const sx = 10, sz = -1;
      c.g.frame(sx, -1.6, sz, 0, 1, () => {
        box(c.g, 3, 0.2, 12, '#7a5a3a', 0, 0, 0);
        c.g.add(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.4, 1.4, 5.5), '#a8783f', M(0, 1.6, 0));
        for (let k = -4; k <= 4; k++) c.g.add(new THREE.TorusGeometry(1.4, 0.05, 4, 10, Math.PI), '#6b4a2a', M(0, 1.6, k * 1.1, 0, 1, 1, 1, Math.PI, 0));
        cyl(c.g, 0.1, 0.12, 7, '#6b4a2a', 0, 1.6, 1, 6);
      });
      for (const x of [-6, 0]) {
        for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) cyl(c.g, 0.08, 0.08, 2.8, '#6b4a2a', x + dx, 0, -5 + dz, 4);
        box(c.g, 3.6, 0.2, 3.6, '#c9a86a', x, 2.8, -5);
      }
      break;
    }
    case 'stilts': {
      // Stilted boathouses standing in the water beside the pier, thatched, a ladder down to the boats.
      for (const x of [-7, 7]) {
        const z = 5;
        for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) cyl(c.g, 0.12, 0.14, 6, DARK, x + dx, -5, z + dz, 5);
        box(c.g, 3.8, 0.2, 3.8, WOOD, x, 0.5, z);
        box(c.g, 3.2, 2, 3.2, '#c9a878', x, 0.7, z);
        hip(c.g, 4.6, 4.6, 1.8, '#9a7a4a', x, 2.7, z);
        box(c.glow, 0.6, 0.8, 0.05, c.s.glow, x, 1.3, z + 1.62);
      }
      for (let i = 0; i < 6; i++) sphere(c.g, 0.3, '#6a4a2a', -4 + (i % 3) * 0.6, 0.3 + Math.floor(i / 3) * 0.5, -6.5, 6);
      // On the Kaveri Coast, Chinese fishing nets: a cantilever of poles leaning out over the water,
      // the net hung square from its tip, stones on ropes to balance it.
      if (c.s.id === 'indiasouth') for (const x of [-11.5, 11.5]) {
        const tip: [number, number, number] = [x, 7, 9];
        for (const dx of [-0.8, 0.8]) c.g.add(new THREE.CylinderGeometry(0.1, 0.14, 11, 5).translate(0, 5.5, 0), '#6b4a2a', M(x + dx, -0.3, 1, 0, 1, 1, 1, 0.85, 0));
        c.g.add(new THREE.PlaneGeometry(6, 6, 6, 6), '#3a3a30', M(tip[0], tip[1] - 5, tip[2] + 1, 0, 1, 1, 1, -Math.PI / 2, 0));
        for (const [dx, dz] of [[-3, -2], [3, -2], [-3, 4], [3, 4]]) cyl(c.g, 0.02, 0.02, 5, '#2a2a22', tip[0] + dx, tip[1] - 5, tip[2] + dz, 3);
        for (let k = 0; k < 4; k++) sphere(c.g, 0.3, '#8a847a', x + (k - 1.5) * 0.3, 1.5 + k * 0.4, -1.5, 6);
      }
      break;
    }
    case 'gate': {
      // A harbour gate at the quay's head: red posts, a tiled roof, lanterns hung beneath it.
      for (const x of [-3.4, 3.4]) cyl(c.g, 0.3, 0.34, 5, '#c23b2a', x, 0, -9, 8);
      box(c.g, 8.4, 0.5, 1, '#c23b2a', 0, 4.8, -9);
      gable(c.g, 9.6, 2.4, 1.2, '#2f3a4a', 0, 5.3, -9);
      for (const x of [-2, 0, 2]) { cyl(c.g, 0.02, 0.02, 0.5, '#3a2a22', x, 4.3, -9, 3); sphere(c.glow, 0.3, '#e8242a', x, 3.95, -9, 8, 1.2); }
      for (let i = 0; i < 6; i++) box(c.g, 0.8, 0.4, 0.5, ['#7fb35a', '#e2b43a', '#b0322a'][i % 3], -9 + (i % 3) * 0.9, Math.floor(i / 3) * 0.4, -2.5);
      break;
    }
    case 'terminal': {
      // New Yonder's ferry terminal: glass under a green roof, solar canopy over the quay, a screen.
      const tx = 7, tz = -15, ty = ground(tx, tz);
      box(c.g, 10, 5, 7, '#9fc8e0', tx, ty - 0.5, tz);
      box(c.glow, 9.4, 3.6, 6.4, '#ffe2b0', tx, ty, tz);
      for (let x = -5; x <= 5; x += 1.25) box(c.g, 0.12, 5, 0.14, '#e8e8ec', tx + x, ty - 0.5, tz + 3.5);
      box(c.g, 10.8, 0.3, 7.8, '#e8e8ec', tx, ty + 4.5, tz);
      box(c.g, 10.2, 0.3, 7.2, '#5aa04a', tx, ty + 4.8, tz);
      for (let i = 0; i < 8; i++) sphere(c.g, 0.4, i % 2 ? '#3f8a3a' : '#6ab04a', tx - 4 + i * 1.15, ty + 5.3, tz + ((i % 3) - 1) * 2, 5, 0.7);
      box(c.glow, 4, 1.4, 0.08, '#3ae8ff', tx, ty + 3, tz + 3.6);
      for (const x of [-6, 0]) {
        for (const dz of [-1.6, 1.6]) cyl(c.g, 0.08, 0.08, 3.2, '#c8ccd4', x, 0, -5 + dz, 6);
        c.g.add(new THREE.BoxGeometry(4, 0.08, 4), '#1f2f5a', M(x, 3.3, -5, 0, 1, 1, 1, 0.12, 0));
      }
      break;
    }
    case 'pavilion': {
      // Maple Row: a painted octagonal pier pavilion with a striped roof, bunting along the pier rail.
      const px = -7, pz = -4.5;
      box(c.g, 5.4, 0.3, 5.4, '#f4f1e8', px, 0, pz);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.1, 0.12, 3, '#f4f1e8', px + Math.cos(a) * 2.3, 0.3, pz + Math.sin(a) * 2.3, 6); }
      for (let i = 0; i < 8; i++) c.g.add(new THREE.ConeGeometry(3.1, 2, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? '#c23b2a' : '#f4f1e8', M(px, 4.3, pz));
      cone(c.g, 0.12, 0.8, '#d4af37', px, 5.3, pz, 6);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; sphere(c.glow, 0.12, '#ffd89a', px + Math.cos(a) * 2.6, 3.2, pz + Math.sin(a) * 2.6, 5); }
      for (let z = 1; z < pier - 1; z += 1.2) box(c.g, 0.02, 0.35, 0.45, ['#c23b2a', '#2f6f9a', '#e2b43a', '#3f8a3a'][Math.round(z) % 4], 1.97, 1.05, z);
      box(c.g, 2, 2.2, 1.6, '#8ac8e8', 6, 0, -5.5);
      box(c.g, 2.4, 0.2, 2, '#f4f1e8', 6, 2.2, -5.5);
      break;
    }
    case 'felucca': {
      // A felucca landing: sandstone steps down to the Nile, feluccas moored alongside, palm shades.
      steps(c, 8, 6, '#d8b884');
      for (const z of [3, 9]) felucca(c, -5, z);
      for (const x of [-9, 1]) {
        for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) cyl(c.g, 0.08, 0.08, 2.8, '#6b4a2a', x + dx, 0, -5 + dz, 4);
        box(c.g, 3.6, 0.2, 3.6, '#c9a86a', x, 2.8, -5);
      }
      break;
    }
    case 'ghat': {
      // A ghat: broad stone steps into the water either side of the pier, chhatris at the top, diyas on the steps.
      const stone = c.s.id === 'indianorth' ? '#e8a6a0' : '#e8dcc8', dome = c.s.id === 'indianorth' ? '#f2d4c8' : '#f4f1e8';
      steps(c, 8, 7, stone);
      steps(c, -8, 7, stone);
      chhatri(c, -8, 0, -4, 1, stone, dome);
      chhatri(c, 8, ground(8, -4), -4, 1, stone, dome);
      for (let i = 0; i < 12; i++) sphere(c.glow, 0.08, '#ffb84a', (i % 2 ? 1 : -1) * (5.5 + (i % 6)), -0.32 * (1 + (i % 3)) + 0.05, 1.2 + (i % 3) * 0.8, 5);
      for (let i = 0; i < 10; i++) sphere(c.g, 0.12, i % 2 ? '#ff9a1a' : '#ffd21a', -9.4 + i * 0.3, 2.4, -3.1, 5);
      break;
    }
    case 'lake': {
      // A lake-steamer landing: a white ticket kiosk, flower boxes along the rail, a flag.
      box(c.g, 2.6, 2.4, 2.2, '#f4f1e8', -5, 0, -9.5);
      hip(c.g, 3.2, 2.8, 1, '#5a3a26', -5, 2.4, -9.5);
      box(c.glow, 1, 0.8, 0.05, c.s.glow, -5, 1, -8.38);
      for (let z = 3; z < pier; z += 5) { box(c.g, 0.4, 0.3, 1.2, '#8a5a36', 2.1, 0.7, z); for (let k = 0; k < 4; k++) sphere(c.g, 0.12, k % 2 ? '#e8342a' : '#3f8a3a', 2.1, 1.05, z - 0.45 + k * 0.3, 5); }
      cyl(c.g, 0.06, 0.06, 6, '#e8e8e8', 10, 0, -2, 5);
      box(c.g, 0.04, 1.2, 1.2, '#d52b1e', 10, 4.6, -1.4);
      break;
    }
  }
}
