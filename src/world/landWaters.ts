import type { Ctx } from './architecture';
import { fountainJet, waterBasin, waterChannel, waterPool } from './flowWater';
import * as THREE from 'three';
import { M, box, cone, cyl, sphere, tree } from './kit';
import type { RegionId } from './regions';

/**
 * Every town's water (owner: "water can be found in Egypt and other places … Madinat an-Nur as
 * well, many fountains across the 20 places"). Each town has four small squares, one in each
 * quarter between the avenues, and each square has water in its land's own tradition — a koi pond
 * with a stone lantern in Sakura Hollow, the lotus-pond pavilion of a Korean palace, a Swiss column
 * fountain, Trafalgar's fountains in London, dancing jets in New Yonder, the star fountains of the
 * Alhambra, a falaj in Souq al-Qamar, a temple's sacred lake by the Nile, an oasis pool in the
 * desert, a stepwell in Gulabi Nagar, the spouted pools of a Balinese water temple, a steaming hot
 * spring in the Arctic… The Islamic lands also have sebils (wall drinking fountains) along their
 * streets. All of it built from the flowing water of flowWater.ts. Pure placement + building; the
 * town builder (RegionBuilder.ts) keeps the squares clear of houses.
 */

/** The four squares (local to the land's centre): on the diagonals between the avenues. */
export const SQUARE_R = 12;
export function squaresOf(land: RegionId): Array<{ x: number; z: number }> {
  // Nile Crossing's pyramids fill its inner quarters, so its squares lie just beyond the ring road.
  const d = land === 'skyisles' ? 62 : land === 'egypt' ? 172 : 100;
  return [0, 1, 2, 3].map((k) => { const a = Math.PI / 4 + (k * Math.PI) / 2; return { x: Math.cos(a) * d, z: Math.sin(a) * d }; });
}

/** Lands with sebils — public drinking fountains set into a wall — along their streets. */
export const SEBIL_LANDS: RegionId[] = ['islamic', 'middleeast', 'mughal'];
/** Where the sebils stand (local): on the pavements of the avenues, clear of the lamps and stalls. */
export function sebilsOf(land: RegionId): Array<{ x: number; z: number; ry: number }> {
  if (!SEBIL_LANDS.includes(land)) return [];
  const out: Array<{ x: number; z: number; ry: number }> = [];
  for (const d of [115, 181, 225]) for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    const side = (d / 22) % 2 < 1 ? 1 : -1, lat = 15.5 * side;
    // Facing the road: the wall's open face towards the avenue.
    out.push({ x: ax * d + az * lat, z: az * d - ax * lat, ry: Math.atan2(-az * side, ax * side) });
  }
  return out;
}

export interface Collide { x: number; z: number; r: number; h: number }

/** A pad of lotus leaves (and a few flowers that glow a little at night) on water at height y. */
function lotus(c: Ctx, x: number, y: number, z: number, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, d = r * (0.3 + ((i * 0.618) % 1) * 0.6);
    cyl(c.g, 0.32, 0.32, 0.02, '#3f8a3a', x + Math.cos(a) * d, y + 0.01, z + Math.sin(a) * d, 9);
    if (i % 3 === 0) sphere(c.glow, 0.12, i % 2 ? '#ffc4dc' : '#fff4f8', x + Math.cos(a) * d, y + 0.1, z + Math.sin(a) * d, 6, 0.7);
  }
}

/** A spout pouring from (x, y, z) outwards along (dx, dz) into water `drop` below. */
function spout(c: Ctx, x: number, y: number, z: number, dx: number, dz: number, drop: number): void {
  box(c.g, 0.16, 0.16, 0.5, '#8a847a', x + dx * 0.2, y, z + dz * 0.2, Math.atan2(dx, dz));
  cyl(c.glow, 0.05, 0.08, drop, '#dff6ff', x + dx * 0.55, y - drop, z + dz * 0.55, 5);
  const ring = 0.25;
  cyl(c.glow, ring, ring, 0.02, '#e6fbff', x + dx * 0.55, y - drop + 0.01, z + dz * 0.55, 10);
}

/** The lands where the lotus is grown in formal ponds (owner's list: India, the Mughal gardens, China, Japan, Indonesia). */
export const LOTUS_LANDS: RegionId[] = ['japan', 'china', 'indianorth', 'indiasouth', 'mughal', 'indonesia'];

/** Lotus flowers standing up out of the water on stems, pink and white, with a few buds. */
function lotusBlooms(c: Ctx, x: number, y: number, z: number, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + 0.7, d = r * (0.25 + ((i * 0.41) % 1) * 0.65), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = 0.35 + (i % 3) * 0.15;
    cyl(c.g, 0.012, 0.015, h, '#4f7a3a', px, y, pz, 3);
    if (i % 4 === 3) { c.g.add(new THREE.SphereGeometry(0.09, 6, 4).scale(1, 1.6, 1), '#ff9ac0', M(px, y + h + 0.1, pz)); continue; }
    for (let q = 0; q < 8; q++) { const b = (q / 8) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(0.09, 5, 4).scale(0.6, 1.4, 0.35), i % 2 ? '#ffc4dc' : '#fff4f8', M(px + Math.cos(b) * 0.1, y + h + 0.1, pz + Math.sin(b) * 0.1, Math.PI / 2 - b, 1, 1, 1, 0.45, 0)); }
    sphere(c.glow, 0.05, '#ffe27a', px, y + h + 0.1, pz, 5);
  }
}

/**
 * A formal lotus garden, in each land's own manner: a stone-edged stroll pond with a vermilion
 * arched bridge in Sakura Hollow; a zigzag bridge to a six-sided pavilion in Jade Terraces; a
 * stepped kund with chhatris at its corners in Gulabi Nagar; a temple tank with a mandapa standing
 * in the water on Kaveri Coast; a marble pool with a lotus fountain between cypresses in
 * Bagh-e-Noor; a bale kambang — a floating pavilion — in Nusa Rinjani.
 */
function lotusGarden(c: Ctx, land: RegionId, x: number, z: number): Collide[] {
  const out: Collide[] = [];
  const g = c.g;
  switch (land) {
    case 'japan': {
      waterBasin(c, x, 0, z, 7, { stone: '#8a847a', kerb: 0.35, seg: 9, speed: 0.04 });
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.1; sphere(g, 0.45 + (i % 4) * 0.12, i % 2 ? '#8a847a' : '#9a948a', x + Math.cos(a) * 7.5, 0.1, z + Math.sin(a) * 7.5, 6, 0.6); }
      lotus(c, x - 2, 0.23, z + 1.5, 3, 16); lotusBlooms(c, x - 2, 0.23, z + 1.5, 3, 10);
      // The arched bridge across the pond, lacquered vermilion.
      for (let i = 0; i <= 12; i++) { const u = i / 12, px = x - 7.5 + u * 15; box(g, 1.1, 0.12, 2, '#6a4a2a', px, 0.3 + Math.sin(u * Math.PI) * 1.6, z - 3, 0); }
      for (const s of [-1, 1]) { for (let i = 0; i <= 8; i++) { const u = i / 8, px = x - 7.5 + u * 15; cyl(g, 0.05, 0.05, 0.9, '#d8342a', px, 0.3 + Math.sin(u * Math.PI) * 1.6, z - 3 + s * 0.95, 5); } }
      // A snow-viewing lantern (yukimi-dōrō) at the water's edge.
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; box(g, 0.1, 0.8, 0.1, '#8a847a', x + 5 + Math.cos(a) * 0.4, 0, z + 5 + Math.sin(a) * 0.4); }
      box(g, 0.5, 0.45, 0.5, '#8a847a', x + 5, 0.8, z + 5); box(c.glow, 0.3, 0.3, 0.52, '#ffcf7a', x + 5, 0.87, z + 5);
      c.g.add(new THREE.ConeGeometry(1.1, 0.4, 6), '#8a847a', M(x + 5, 1.45, z + 5));
      out.push({ x, z: z + 2, r: 5.5, h: 0.6 });
      break;
    }
    case 'china': {
      waterPool(c, x, 0, z, 16, 12, 0, { stone: '#b8b0a0', kerb: 0.4, speed: 0.04 });
      lotus(c, x - 4, 0.28, z - 2, 3.4, 18); lotusBlooms(c, x - 4, 0.28, z - 2, 3.4, 12); lotus(c, x + 4.5, 0.28, z + 3, 2.4, 10);
      // The zigzag bridge (spirits go only in straight lines) out to a six-sided pavilion.
      const zig: Array<[number, number, number]> = [[x - 7, z + 5, 0], [x - 4.5, z + 4, 0.7], [x - 2.5, z + 2.6, -0.7], [x - 0.5, z + 1.4, 0.7]];
      for (const [bx, bz, ry] of zig) { box(g, 2.8, 0.2, 1.3, '#d8d0c0', bx, 0.45, bz, ry); for (const s of [-1, 1]) box(g, 2.8, 0.5, 0.06, '#c8c0b0', bx - Math.sin(ry) * s * 0.62, 0.65, bz + Math.cos(ry) * 0.62 * s, ry); }
      const px = x + 2, pz = z;
      cyl(g, 2.2, 2.4, 0.5, '#b8b0a0', px, 0.2, pz, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl(g, 0.12, 0.13, 2.6, '#b0322a', px + Math.cos(a) * 1.7, 0.7, pz + Math.sin(a) * 1.7, 8); }
      cyl(g, 2.1, 2.1, 0.3, '#2f5a9a', px, 3.3, pz, 6);
      c.g.add(new THREE.ConeGeometry(2.9, 1.8, 6), '#2f6a5a', M(px, 4.5, pz, 0, 1, 1, 1));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cone(g, 0.12, 0.6, '#2f6a5a', px + Math.cos(a) * 2.7, 3.6, pz + Math.sin(a) * 2.7, 4); }
      sphere(g, 0.25, '#d4af37', px, 5.5, pz, 8);
      sphere(c.glow, 0.3, '#ff3a2a', px, 2.8, pz, 8, 1.3);
      out.push({ x: x - 3, z: z - 3, r: 4.5, h: 0.6 }, { x: x + 5, z: z - 2, r: 2.5, h: 0.6 });
      break;
    }
    case 'indianorth': {
      // A kund: terraces of steps climbing to the rim, the pool within, a chhatri at each corner.
      for (let i = 0; i < 4; i++) box(g, 18 - i * 1.6, 0.35 * (i + 1), 18 - i * 1.6, i % 2 ? '#d27466' : '#e8917a', x, 0, z);
      waterPool(c, x, 1.4, z, 11, 11, 0, { stone: '#e8917a', kerb: 0.3, speed: 0.03 });
      lotus(c, x, 1.58, z, 4, 20); lotusBlooms(c, x, 1.58, z, 4, 14);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = x + sx * 7.3, cz = z + sz * 7.3;
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.08, 0.09, 1.6, '#fbf7ee', cx + dx * 0.55, 1.4, cz + dz * 0.55, 6);
        box(g, 1.5, 0.15, 1.5, '#fbf7ee', cx, 3.0, cz);
        c.g.add(new THREE.SphereGeometry(0.62, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#e8917a', M(cx, 3.15, cz));
        cone(g, 0.05, 0.3, '#d4af37', cx, 3.75, cz, 5);
        for (let i = 0; i < 4; i++) sphere(c.glow, 0.05, '#ffb84a', cx - 0.3 + i * 0.2, 1.45, cz + sz * 0.8, 4); // diyas on the steps
      }
      for (let i = 0; i < 4; i++) out.push({ x: x + [-1, 1, 0, 0][i] * 6, z: z + [0, 0, -1, 1][i] * 6, r: 3.2, h: 1.1 });
      out.push({ x, z, r: 5.5, h: 1.9 });
      break;
    }
    case 'indiasouth': {
      // A temple tank: steps on every side down to the water, a little mandapa standing in its middle.
      for (let i = 0; i < 3; i++) box(g, 17 - i * 1.4, 0.3, 17 - i * 1.4, i % 2 ? '#9a948a' : '#8a847a', x, -0.02 + i * 0.001, z);
      waterPool(c, x, 0, z, 12, 12, 0, { stone: '#9a948a', kerb: 0.35, speed: 0.03 });
      lotus(c, x - 3, 0.23, z + 3, 2.8, 14); lotusBlooms(c, x - 3, 0.23, z + 3, 2.8, 10); lotus(c, x + 3, 0.23, z - 3, 2.4, 10);
      box(g, 3.2, 0.5, 3.2, '#8a847a', x, 0.1, z);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.14, 0.16, 2.2, '#9a948a', x + dx * 1.2, 0.6, z + dz * 1.2, 8);
      box(g, 3.4, 0.25, 3.4, '#9a948a', x, 2.8, z);
      c.g.add(new THREE.ConeGeometry(2.3, 1.6, 4).rotateY(Math.PI / 4), '#c8483a', M(x, 3.85, z));
      cone(g, 0.12, 0.6, '#d4af37', x, 4.65, z, 6);
      sphere(c.glow, 0.12, '#ffb84a', x, 1.2, z, 6);
      out.push({ x, z, r: 6.4, h: 0.5 });
      break;
    }
    case 'mughal': {
      // A marble pool between cypresses, a fountain like an opening lotus at its heart.
      waterPool(c, x, 0, z, 14, 7, 0, { stone: '#fbf7ee', kerb: 0.5, speed: 0.06 });
      lotus(c, x - 4, 0.38, z, 1.8, 8); lotus(c, x + 4, 0.38, z, 1.8, 8); lotusBlooms(c, x - 4, 0.38, z, 1.8, 6); lotusBlooms(c, x + 4, 0.38, z, 1.8, 6);
      for (let q = 0; q < 12; q++) { const b = (q / 12) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(0.5, 6, 4).scale(0.5, 1.2, 0.2), '#fbf7ee', M(x + Math.cos(b) * 0.65, 0.75, z + Math.sin(b) * 0.65, Math.PI / 2 - b, 1, 1, 1, 0.55, 0)); }
      fountainJet(c, x, 0.8, z, 1.6);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) tree(c.g, 'cypress', x + sx * 8.8, 0, z + sz * 5, 0.9, () => c.rng.next());
      out.push({ x, z, r: 5.2, h: 0.8 });
      break;
    }
    case 'indonesia': {
      // A bale kambang: a pavilion on a platform in the middle of a lotus pond, a causeway out to it.
      waterPool(c, x, 0, z, 17, 15, 0, { stone: '#6a6458', kerb: 0.45, speed: 0.03 });
      lotus(c, x - 5, 0.33, z - 4, 2.6, 12); lotus(c, x + 5, 0.33, z + 4, 2.6, 12); lotusBlooms(c, x - 5, 0.33, z - 4, 2.6, 8); lotusBlooms(c, x + 5, 0.33, z + 4, 2.6, 8);
      box(g, 2, 0.5, 5.5, '#8a8478', x, 0, z + 5.2);
      box(g, 6, 0.6, 6, '#8a8478', x, 0, z);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { box(g, 0.24, 2.6, 0.24, '#5a3a22', x + dx * 2.4, 0.6, z + dz * 2.4); box(g, 0.4, 0.15, 0.4, '#d4af37', x + dx * 2.4, 3.2, z + dz * 2.4); }
      c.g.add(new THREE.ConeGeometry(4.6, 1.2, 4).rotateY(Math.PI / 4), '#3a2e24', M(x, 3.8, z));
      c.g.add(new THREE.ConeGeometry(2.2, 1.6, 4).rotateY(Math.PI / 4), '#3a2e24', M(x, 5.2, z));
      box(g, 3.6, 0.4, 3.6, '#c8a86a', x, 0.6, z); // woven mat
      for (const s of [-1, 1]) sphere(c.glow, 0.2, '#ffb86a', x + s * 2.4, 2.6, z + 2.4, 6);
      out.push({ x: x - 5, z: z - 4, r: 3.4, h: 0.6 }, { x: x + 5, z: z + 4, r: 3.4, h: 0.6 }, { x, z, r: 3.1, h: 3.2 });
      break;
    }
  }
  return out;
}

/** Paving for a square, a pair of benches, and the land's water feature. Returns what to collide with. */
export function buildSquare(c: Ctx, land: RegionId, k: number, x: number, z: number): Collide[] {
  const out: Collide[] = [];
  const pave = c.s.road;
  cyl(c.g, SQUARE_R, SQUARE_R + 0.4, 0.12, pave, x, -0.04, z, 28);
  // In the lotus lands one square in four is a formal lotus garden in the land's own manner.
  if (k === 2 && LOTUS_LANDS.includes(land)) return lotusGarden(c, land, x, z);
  for (const s of [-1, 1]) box(c.g, 2.2, 0.45, 0.6, '#8a5a36', x + s * (SQUARE_R - 2.2), 0, z, Math.PI / 2);
  const coll = (r: number, h = 1) => out.push({ x, z, r, h });
  switch (land) {
    case 'meadow':
      waterBasin(c, x, 0, z, 3, { stone: '#f6d7e8', tiers: true, jetHeight: 1.2 });
      coll(3.3);
      break;
    case 'japan': {
      // A koi pond with a stone lantern and a tsukubai basin fed by a bamboo spout.
      waterBasin(c, x, 0, z, 3.6, { stone: '#8a8478', kerb: 0.3, seg: 9, jets: 0, speed: 0.12 });
      cyl(c.g, 0.25, 0.3, 1.3, '#9a948a', x + 4.6, 0, z, 6);
      box(c.g, 0.8, 0.5, 0.8, '#9a948a', x + 4.6, 1.3, z);
      box(c.glow, 0.5, 0.35, 0.52, '#ffc27a', x + 4.6, 1.38, z);
      cone(c.g, 0.7, 0.5, '#8a8478', x + 4.6, 1.8, z, 6);
      waterBasin(c, x - 4.4, 0, z + 1.6, 0.45, { stone: '#7a7468', kerb: 0.5, seg: 10, jets: 0 });
      cyl(c.g, 0.06, 0.06, 1.3, '#9ab84a', x - 4.4, 0.7, z + 2.6, 6);
      spout(c, x - 4.4, 0.95, z + 2.2, 0, -1, 0.5);
      coll(3.9);
      break;
    }
    case 'korea': {
      // A square lotus pond with a round island and a little hexagonal pavilion (Hyangwonjeong).
      waterPool(c, x, 0, z, 8, 8, 0, { stone: '#b8b0a2', kerb: 0.4, speed: 0.05 });
      cyl(c.g, 1.6, 1.7, 0.6, '#8a8478', x, 0, z, 16);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl(c.g, 0.08, 0.08, 2, '#8a3a2a', x + Math.cos(a) * 1.1, 0.6, z + Math.sin(a) * 1.1, 6); }
      cone(c.g, 1.8, 1.1, '#3a3f4a', x, 2.6, z, 6);
      lotus(c, x + 2.2, 0.28, z - 2.2, 1.2, 7);
      coll(4.6);
      break;
    }
    case 'china':
      waterBasin(c, x, 0, z, 3.8, { stone: '#e8e0d0', kerb: 0.45, jets: 0, speed: 0.1 });
      lotus(c, x, 0.33, z, 3, 12);
      coll(4.1);
      break;
    case 'norway':
      // A timber trough filled from a spout.
      waterPool(c, x, 0, z, 1.4, 3.4, 0, { stone: '#6b4a33', kerb: 0.8, speed: 0.2 });
      cyl(c.g, 0.18, 0.2, 1.8, '#5a3a26', x, 0, z - 2.1, 6);
      spout(c, x, 1.5, z - 1.95, 0, 1, 0.8);
      coll(1.9);
      break;
    case 'switzerland': {
      // A Bernese column fountain: an octagonal trough, a painted column, spouts on two sides.
      waterBasin(c, x, 0, z, 2.2, { stone: '#b8b0a2', kerb: 0.85, seg: 8, jets: 0, speed: 0.2 });
      cyl(c.g, 0.25, 0.3, 3.6, '#c23b3b', x, 0, z, 8);
      box(c.g, 0.7, 0.4, 0.7, '#d4af37', x, 3.6, z);
      sphere(c.g, 0.3, '#d4af37', x, 4.2, z, 8);
      for (const s of [-1, 1]) spout(c, x, 1.9, z, s, 0, 1.2);
      coll(2.5, 4.5);
      break;
    }
    case 'london':
      waterBasin(c, x, 0, z, 3.6, { stone: '#d8d0c0', kerb: 0.55, tiers: true, jetHeight: 1.8, speed: 0.2 });
      coll(3.9, 3);
      break;
    case 'newyork':
      // A long plaza pool of dancing jets.
      waterChannel(c, x, 0, z, 10, 3, k * Math.PI / 2 + Math.PI / 4, { stone: '#9a9aa2', kerb: 0.35, flow: null, speed: 0.1, jets: 1.6, jetHeight: 1.6 });
      coll(5.2);
      break;
    case 'renaissance':
      waterBasin(c, x, 0, z, 3.4, { stone: '#e8dcc0', kerb: 0.7, tiers: true, jetHeight: 1.5, seg: 16 });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; spout(c, x + Math.cos(a) * 0.5, 1.2, z + Math.sin(a) * 0.5, Math.cos(a), Math.sin(a), 0.6); }
      coll(3.7, 3);
      break;
    case 'vintage':
      waterBasin(c, x, 0, z, 3, { stone: '#e8e0d0', kerb: 0.5, jetHeight: 2.2 });
      cyl(c.g, 0.2, 0.28, 1.1, '#3a5a4a', x + 4, 0, z, 8);
      spout(c, x + 4, 1.05, z, -1, 0, 0.3);
      coll(3.3, 2);
      break;
    case 'islamic':
      // A star fountain with four little channels running to it, as in the Court of the Lions.
      waterBasin(c, x, 0, z, 2, { stone: '#e8dcc6', kerb: 0.55, seg: 8, jetHeight: 1.4 });
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; waterChannel(c, x + Math.sin(a) * 5.4, 0, z + Math.cos(a) * 5.4, 5.6, 0.7, a, { stone: '#e8dcc6', kerb: 0.25, flow: [0, -1], speed: 0.5 }); }
      coll(2.3, 2);
      break;
    case 'middleeast':
      // A falaj: a narrow channel running across the square to a small basin.
      waterChannel(c, x, 0, z, 16, 0.8, k * Math.PI / 2 + Math.PI / 4, { stone: '#c9a473', kerb: 0.3, speed: 0.7 });
      waterBasin(c, x, 0, z, 1.4, { stone: '#c9a473', kerb: 0.45, seg: 8, jetHeight: 0.8 });
      coll(1.7);
      break;
    case 'egypt':
      if (k === 0) {
        // The temple's sacred lake: a large stepped pool, papyrus at its corners.
        for (let s = 0; s < 2; s++) box(c.g, 16.6 - s * 1.2, 0.25 * (s + 1), 11.6 - s * 1.2, '#d4b886', x, 0, z);
        waterPool(c, x, 0, z, 13, 8, 0, { stone: '#c9a877', kerb: 0.7, speed: 0.06 });
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = 0; i < 5; i++) cyl(c.g, 0.03, 0.03, 1.4 + (i % 3) * 0.3, '#5a8a3a', x + sx * (6.2 - i * 0.2), 0.6, z + sz * (3.6 - (i % 2) * 0.3), 3);
        coll(7.5);
      } else {
        waterBasin(c, x, 0, z, 2.2, { stone: '#d4b886', kerb: 0.6, seg: 12, jetHeight: 1.1 });
        coll(2.5);
      }
      break;
    case 'desert': {
      // An oasis pool with date palms.
      waterBasin(c, x, 0, z, 4.2, { stone: '#d9bf8a', kerb: 0.2, seg: 11, jets: 0, speed: 0.08 });
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + k; tree(c.g, 'palm', x + Math.cos(a) * 6, 0, z + Math.sin(a) * 6, 1.1, () => c.rng.next()); }
      coll(4.4);
      break;
    }
    case 'indianorth': {
      // A small stepwell (baori): stepped sides down to the water.
      for (let s = 0; s < 3; s++) {
        const o = 5.4 - s * 0.7, hgt = 0.25 * (s + 1);
        for (const sg of [-1, 1]) { box(c.g, o * 2, hgt, 0.7, '#e8917a', x, 0, z + sg * (o - 0.35)); box(c.g, 0.7, hgt, o * 2, '#e8917a', x + sg * (o - 0.35), 0, z); }
      }
      waterPool(c, x, 0, z, 6, 6, 0, { stone: '#d97a6a', kerb: 0.9, speed: 0.06 });
      coll(5.6);
      break;
    }
    case 'indiasouth':
      waterPool(c, x, 0, z, 7, 7, 0, { stone: '#9a948a', kerb: 0.45, speed: 0.05 });
      lotus(c, x, 0.33, z, 3, 12);
      coll(4.2);
      break;
    case 'mughal':
      waterPool(c, x, 0, z, 6, 6, 0, { stone: '#fbf7ee', kerb: 0.5, speed: 0.1, jets: 1, jetHeight: 1.6 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) fountainJet(c, x + sx * 1.8, 0.38, z + sz * 1.8, 0.9);
      coll(3.6);
      break;
    case 'indonesia': {
      // A water-temple pool: a carved wall pouring from a row of spouts.
      waterPool(c, x, 0, z, 8, 4, 0, { stone: '#6a6458', kerb: 0.5, speed: 0.25 });
      box(c.g, 8.4, 1.8, 0.6, '#5a5448', x, 0, z - 2.5);
      for (let i = 0; i < 6; i++) spout(c, x - 3 + i * 1.2, 1.3, z - 2.15, 0, 1, 0.92);
      coll(4.4, 2);
      break;
    }
    case 'aurora':
      // A hot spring, steaming in the cold.
      waterBasin(c, x, 0, z, 2.8, { stone: '#4a4a52', kerb: 0.35, seg: 12, jets: 0, speed: 0.15 });
      for (let i = 0; i < 7; i++) sphere(c.glow, 0.45 + (i % 3) * 0.15, '#e6eef8', x + Math.cos(i * 1.7) * 1.4, 0.8 + i * 0.35, z + Math.sin(i * 1.7) * 1.4, 7);
      coll(3.1);
      break;
    case 'skyisles':
      waterBasin(c, x, 0, z, 2.4, { stone: '#e6e8ff', kerb: 0.6, tiers: true, jetHeight: 1.4 });
      coll(2.7, 3);
      break;
  }
  return out;
}

/** A sebil: a small wall with an arched niche and a basin, water pouring into it. Local frame: open face +z. */
export function buildSebil(c: Ctx, x: number, z: number, ry: number): Collide {
  c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => {
    box(c.g, 1.8, 2.4, 0.5, '#e8dcc6', 0, 0, 0);
    box(c.g, 1.1, 1.3, 0.1, '#2f6f9a', 0, 0.7, 0.26);
    cone(c.g, 0.6, 0.5, '#2f6f9a', 0, 2.4, 0, 4, Math.PI / 4);
  }));
  // The basin and spout in front of the niche (placed in the same frame).
  c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => {
    waterPool(c, 0, 0, 0.75, 1.2, 0.6, 0, { stone: '#d9d0c0', kerb: 0.6, speed: 0.3 });
    spout(c, 0, 1.2, 0.3, 0, 1, 0.72);
  }));
  return { x, z, r: 1.1, h: 2.6 };
}
