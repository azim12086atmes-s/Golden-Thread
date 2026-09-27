import type { Ctx } from './architecture';
import { fountainJet, waterBasin, waterChannel, waterPool } from './flowWater';
import { box, cone, cyl, sphere, tree } from './kit';
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
  const d = land === 'skyisles' ? 62 : 100;
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

/** Paving for a square, a pair of benches, and the land's water feature. Returns what to collide with. */
export function buildSquare(c: Ctx, land: RegionId, k: number, x: number, z: number): Collide[] {
  const out: Collide[] = [];
  const pave = c.s.road;
  cyl(c.g, SQUARE_R, SQUARE_R + 0.4, 0.12, pave, x, -0.04, z, 28);
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
