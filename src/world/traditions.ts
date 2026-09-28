import * as THREE from 'three';
import type { Ctx, Footprint } from './architecture';
import { M, archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof } from './kit';
import { SURF } from './surfaces';

/**
 * Houses of the lands beyond Europe and America, each built from the real parts of its tradition
 * (docs/ARCHITECTURE_RESEARCH.md) rather than a box with glowing squares:
 *
 *  - Sakura Hollow: Kyoto machiya (koshi lattices, a hisashi pent roof, noren at the door) and
 *    thatched minka farmhouses.
 *  - Hanok Village: hanok on stone bases, timber grid over white plaster, hanji lattice windows,
 *    giwa roofs with up-curved eaves; and straw-roofed choga.
 *  - Jade Terraces: halls on white stone bases with red columns, dougong brackets under deep
 *    flying eaves, painted beams and lattice windows; two-storey shophouses with galleries.
 *  - Madinat an-Nur: Moroccan riads — plain walls, small grilled windows, a horseshoe door in a
 *    zellige surround under a green-tiled awning, a crenellated roof terrace, a square minaret.
 *  - Souq al-Qamar: Gulf coral-stone houses with barjeel wind towers, mashrabiya screens, recessed
 *    wall panels and studded doors.
 *  - Nile Crossing: Nubian houses of barrel vaults and domes behind parapets, painted in bright
 *    colours with patterns round the door, palm-log beams sticking out.
 *  - Tents of Rimal: long black goat-hair Bedouin tents on rows of poles with guy ropes, one side
 *    open under a decorated curtain; round white tents; rugs and a fire.
 *  - Gulabi Nagar: pink havelis with rows of projecting jharokhas under little domes, jali
 *    screens, chhatris on the roof and a painted gateway.
 *  - Kaveri Coast: Kerala homes with steep clay-tiled roofs, gable vents (mukhappu), verandahs
 *    on turned pillars and laterite bases.
 *  - Bagh-e-Noor: red sandstone outlined in white marble, a pishtaq portal, jali screens, a
 *    bangaldar roof or onion dome flanked by chhatris.
 *  - Nusa Rinjani: Balinese bale on carved stone bases under steep thatch, and Toraja tongkonan
 *    on piles under great boat-shaped saddle roofs.
 *  - Aurora Huts: lavvu (pole tents), turf goahti, log cabins and glass aurora cabins.
 *  - The Sky Isles: slender spires with arched moonstone windows, domed pavilions and
 *    floating crystals.
 *
 * Local frame as everywhere: origin at the base centre, the street front facing +z.
 */

const pick = <T>(c: Ctx, a: readonly T[]) => c.rng.pick(a);

function surf(c: Ctx, s: number, fn: () => void): void {
  const prev = c.g.surface;
  c.g.surface = s;
  try { fn(); } finally { c.g.surface = prev; }
}

/** Glass that glows at night, on the +z face at z (bottom centre x, y). */
function glass(c: Ctx, x: number, y: number, z: number, w: number, h: number, arched = false, pointed = false): void {
  if (arched) archPanel(c.glow, w, h, c.s.glow, x, y, z, 0, 0.04, pointed);
  else box(c.glow, w, h, 0.04, c.s.glow, x, y, z);
}

/** A lattice over an opening: vertical slats (koshi), a square grid (hanji) or a star jali. */
function lattice(c: Ctx, x: number, y: number, z: number, w: number, h: number, col: string, kind: 'koshi' | 'grid' | 'jali'): void {
  if (kind === 'koshi') {
    for (let i = 0; i <= Math.round(w / 0.1); i++) box(c.g, 0.035, h, 0.05, col, x - w / 2 + i * 0.1, y, z);
    box(c.g, w + 0.1, 0.05, 0.06, col, x, y + h * 0.3, z + 0.01);
  } else {
    const n = kind === 'grid' ? 5 : 7;
    for (let i = 0; i <= n; i++) {
      box(c.g, 0.03, h, 0.04, col, x - w / 2 + (w / n) * i, y, z);
      box(c.g, w, 0.03, 0.04, col, x, y + (h / n) * i, z);
    }
    if (kind === 'jali') for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2 === 0) box(c.g, w / n * 0.5, h / n * 0.5, 0.045, col, x - w / 2 + (w / n) * (i + 0.5), y + (h / n) * (j + 0.25), z, Math.PI / 4 * 0);
  }
  box(c.g, w + 0.14, 0.08, 0.1, col, x, y - 0.08, z);
  box(c.g, w + 0.14, 0.08, 0.1, col, x, y + h, z);
}

/** A panelled door on +z at z. */
function doorLeaf(c: Ctx, x: number, z: number, w: number, h: number, col: string, studs = false): void {
  box(c.g, w, h, 0.08, col, x, 0, z);
  for (const s of [-1, 1]) box(c.g, w * 0.36, h * 0.35, 0.04, col, x + s * w * 0.22, h * 0.12, z + 0.05);
  if (studs) for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) sphere(c.g, 0.035, '#d4af37', x - w * 0.36 + i * w * 0.24, 0.3 + j * h * 0.18, z + 0.07, 4);
}

// ───────────────────────── East Asia ─────────────────────────

/** Dougong: a cluster of interlocking brackets under the eaves (bottom at y). */
function dougong(c: Ctx, x: number, y: number, z: number, col: string, paint: string): void {
  box(c.g, 0.34, 0.16, 0.34, col, x, y, z);
  box(c.g, 0.8, 0.12, 0.2, paint, x, y + 0.16, z);
  box(c.g, 0.2, 0.12, 0.8, paint, x, y + 0.16, z + 0.2);
  box(c.g, 0.26, 0.12, 0.26, col, x, y + 0.28, z + 0.1);
  box(c.g, 1.1, 0.12, 0.22, col, x, y + 0.4, z + 0.1);
}

function machiya(c: Ctx): Footprint {
  const wood = '#4a3426', plaster = pick(c, ['#f4efe2', '#e9dfc8']), roof = '#3a3a4a';
  const w = c.rng.range(5.4, 6.8), d = c.rng.range(9, 11), fh = 3, two = c.rng.chance(0.75);
  surf(c, SURF.boards, () => box(c.g, w, fh, d, wood));
  surf(c, SURF.plaster, () => { if (two) box(c.g, w, 2.4, d, plaster, 0, fh, 0); });
  // Ground floor front: koshi lattices either side of the door, the noren curtain over it.
  const z = d / 2 + 0.02;
  for (const s of [-1, 1]) { glass(c, s * w * 0.28, 0.5, z, w * 0.34, 2.0); lattice(c, s * w * 0.28, 0.5, z + 0.05, w * 0.34, 2.0, '#2e2018', 'koshi'); }
  box(c.g, 1.2, 2.2, 0.06, '#1f1a18', 0, 0, z);
  for (let i = 0; i < 3; i++) box(c.g, 0.38, 0.8, 0.03, pick(c, ['#1f3a6a', '#6b1f2a', '#2f4a3a']), -0.4 + i * 0.4, 1.4, z + 0.06);
  // Hisashi: a small tiled pent roof between the floors.
  c.g.add(new THREE.BoxGeometry(w + 0.4, 0.12, 1.2).translate(0, 0, 0.6), roof, M(0, fh + 0.1, d / 2, 0, 1, 1, 1, 0.35));
  for (let i = 0; i < Math.round(w / 0.35); i++) cyl(c.g, 0.06, 0.06, 1.2, '#4a4a5a', -w / 2 - 0.1 + i * 0.35, fh + 0.2, d / 2 + 0.2, 4);
  if (two) {
    // Mushiko-mado: the upper floor's plastered slat windows.
    for (const s of [-1, 1]) { glass(c, s * w * 0.22, fh + 0.7, z, w * 0.26, 0.9); lattice(c, s * w * 0.22, fh + 0.7, z + 0.05, w * 0.26, 0.9, plaster, 'koshi'); }
  }
  const H = two ? fh + 2.4 : fh;
  gable(c.g, d + 0.8, w + 1.2, 1.9, roof, 0, H, 0, Math.PI / 2);
  box(c.g, 0.4, 0.3, d + 0.9, '#2a2a36', 0, H + 1.75, 0);
  // A little box of greenery and a red paper lantern at the door.
  box(c.g, 0.9, 0.5, 0.4, '#6b4a2a', w / 2 - 0.6, 0, d / 2 + 0.4);
  sphere(c.g, 0.35, '#4f9a44', w / 2 - 0.6, 0.8, d / 2 + 0.4, 6);
  sphere(c.glow, 0.25, '#ff6a3a', -w / 2 + 0.5, 2.3, d / 2 + 0.4, 8, 1.3);
  return { r: Math.max(w, d) / 2 + 0.4, h: H + 2.2 };
}

function minka(c: Ctx): Footprint {
  const w = 9, d = 7, wood = '#5a3a26';
  box(c.g, w + 0.6, 0.5, d + 0.6, '#8a8078');
  surf(c, SURF.plaster, () => box(c.g, w, 2.8, d, '#efe6d2', 0, 0.5, 0));
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) box(c.g, 0.24, 2.8, 0.24, wood, x, 0.5, d / 2);
  box(c.g, w + 0.2, 0.24, 0.26, wood, 0, 3.1, d / 2);
  for (const x of [-w / 3, 0, w / 3]) { glass(c, x, 0.9, d / 2 + 0.02, 2.2, 1.8); lattice(c, x, 0.9, d / 2 + 0.07, 2.2, 1.8, '#f4efe2', 'grid'); }
  // Irimoya: a great thatched hip roof with a small gable at the top.
  surf(c, SURF.thatch, () => hip(c.g, w + 2.6, d + 2.6, 4.2, '#b89a5a', 0, 3.3, 0));
  gable(c.g, w * 0.3, 1.8, 1.2, '#8a7040', 0, 6.6, 0);
  box(c.g, w * 0.5, 0.35, 0.5, '#4a3a2a', 0, 7.4, 0);
  return { r: Math.max(w, d) / 2 + 1.2, h: 8 };
}

function hanok(c: Ctx): Footprint {
  const wood = '#7a4a2a', roof = pick(c, c.s.roofs), w = c.rng.range(8, 10), d = 5.4;
  surf(c, SURF.ashlar, () => box(c.g, w + 1, 0.9, d + 1.2, '#a8a098'));
  for (let i = 0; i < 3; i++) box(c.g, 1.4, 0.18, 0.4, '#a8a098', 0, 0.9 - (i + 1) * 0.3, d / 2 + 0.6 + i * 0.4);
  surf(c, SURF.plaster, () => box(c.g, w, 2.7, d, '#f4efe4', 0, 0.9, 0));
  // Timber grid: posts on cornerstones, a sill rail and a head rail, the bays filled with hanji lattice.
  const bays = Math.round(w / 2.4);
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + (w / bays) * i;
    box(c.g, 0.4, 0.2, 0.4, '#8a8278', x, 0.9, d / 2 + 0.02);
    cyl(c.g, 0.15, 0.16, 2.7, wood, x, 1.1, d / 2 + 0.05, 8);
  }
  for (const y of [1.1, 3.35]) box(c.g, w + 0.2, 0.2, 0.2, wood, 0, y, d / 2 + 0.06);
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + (w / bays) * (i + 0.5);
    glass(c, x, 1.4, d / 2 + 0.03, w / bays - 0.5, 1.7);
    lattice(c, x, 1.4, d / 2 + 0.08, w / bays - 0.5, 1.7, '#8a5a36', 'grid');
  }
  // A narrow wooden verandah (maru) along the front.
  box(c.g, w, 0.12, 1.1, '#9a7450', 0, 0.95, d / 2 + 0.6);
  // Giwa roof: deep eaves that curve up at the corners, a heavy ridge with upturned ends.
  sweptRoof(c.g, w + 3.4, d + 3.6, 2.8, roof, 0, 3.55, 0, 0, 0.55);
  box(c.g, w * 0.7, 0.35, 0.45, '#2a2f38', 0, 6.1, 0);
  for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.5, 0.35, 0.45), '#2a2f38', M(s * w * 0.37, 6.2, 0, 0, 1, 1, 1, 0, s * 0.4));
  return { r: Math.max(w, d) / 2 + 0.9, h: 6.6 };
}

function choga(c: Ctx): Footprint {
  const w = 7, d = 5;
  surf(c, SURF.ashlar, () => box(c.g, w + 0.6, 0.6, d + 0.6, '#9a9288'));
  surf(c, SURF.adobe, () => box(c.g, w, 2.4, d, '#d9c8a8', 0, 0.6, 0));
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) cyl(c.g, 0.12, 0.13, 2.4, '#7a4a2a', x, 0.6, d / 2 + 0.05, 6);
  for (const x of [-w / 3, w / 3]) { glass(c, x, 1.1, d / 2 + 0.03, 1.4, 1.3); lattice(c, x, 1.1, d / 2 + 0.08, 1.4, 1.3, '#8a5a36', 'grid'); }
  box(c.g, 1.1, 1.9, 0.08, '#6b4a2a', 0, 0.6, d / 2 + 0.02);
  // The rounded straw roof, roped down in a net.
  surf(c, SURF.thatch, () => sphere(c.g, 1, '#c9a860', 0, 3.0, 0, 14, 1));
  c.g.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#c9a860', M(0, 3.0, 0, 0, w / 2 + 1, 1.6, d / 2 + 1));
  for (let i = 0; i < 7; i++) c.g.add(new THREE.TorusGeometry(1, 0.012, 3, 24, Math.PI), '#6b5a3a', M(0, 3.0, -d / 2 + i * (d / 6), 0, w / 2 + 1.02, 1.62, 1));
  return { r: w / 2 + 1.2, h: 4.8 };
}

function chineseHall(c: Ctx): Footprint {
  const red = '#b3262a', roof = pick(c, c.s.roofs), paint = pick(c, ['#2f7a5a', '#3f6c8f']), w = c.rng.range(8, 10), d = 6;
  surf(c, SURF.marble, () => { box(c.g, w + 1.4, 0.8, d + 1.4, '#e8e4da'); for (let i = 0; i < 3; i++) box(c.g, 2.2, 0.26, 0.5, '#e8e4da', 0, 0.8 - (i + 1) * 0.26, d / 2 + 0.7 + i * 0.5); });
  surf(c, SURF.plaster, () => box(c.g, w, 3.2, d, '#f2e6cc', 0, 0.8, 0));
  const cols = 5;
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + 0.3 + ((w - 0.6) / (cols - 1)) * i;
    cyl(c.g, 0.2, 0.22, 3.2, red, x, 0.8, d / 2 + 0.55, 10);
    dougong(c, x, 4.0, d / 2 + 0.4, red, paint);
  }
  // Painted beam: blue and green with gold.
  box(c.g, w + 0.4, 0.4, 0.3, paint, 0, 3.7, d / 2 + 0.55);
  for (let i = 0; i < 8; i++) box(c.g, 0.3, 0.12, 0.05, '#e2b43a', -w / 2 + 0.6 + i * (w - 1.2) / 7, 3.84, d / 2 + 0.72);
  // Lattice doors across the front.
  for (let i = 0; i < cols - 1; i++) {
    const x = -w / 2 + 0.3 + ((w - 0.6) / (cols - 1)) * (i + 0.5);
    glass(c, x, 1.0, d / 2 + 0.03, (w - 0.6) / (cols - 1) - 0.3, 2.4);
    lattice(c, x, 1.0, d / 2 + 0.08, (w - 0.6) / (cols - 1) - 0.3, 2.4, red, 'grid');
  }
  sweptRoof(c.g, w + 4, d + 4, 2.8, roof, 0, 4.4, 0, 0, 0.6);
  box(c.g, w * 0.66, 0.4, 0.4, roof, 0, 7.0, 0);
  for (const s of [-1, 1]) cone(c.g, 0.22, 0.8, '#e2b43a', s * w * 0.34, 7.2, 0, 5);
  for (const s of [-1, 1]) { cyl(c.g, 0.02, 0.02, 0.5, '#3a2a22', s * w * 0.3, 3.9, d / 2 + 1.4, 3); sphere(c.glow, 0.32, '#ff4a2a', s * w * 0.3, 3.55, d / 2 + 1.4, 8, 1.25); }
  return { r: Math.max(w, d) / 2 + 1.2, h: 7.6 };
}

function shophouse(c: Ctx): Footprint {
  const red = '#b3262a', roof = pick(c, c.s.roofs), wall = pick(c, c.s.walls), w = 7, d = 7;
  surf(c, SURF.brick, () => box(c.g, w, 6.4, d, wall === '#f2e6cc' ? '#8a8a90' : '#7a7a82'));
  surf(c, SURF.plaster, () => box(c.g, w + 0.05, 3.2, d + 0.05, wall, 0, 0, 0));
  // Shopfront: folding boards open on a lit counter.
  glass(c, 0, 0.9, d / 2 + 0.03, w - 1.6, 1.9);
  box(c.g, w - 1.4, 0.9, 0.5, '#6b3a22', 0, 0, d / 2 + 0.3);
  box(c.g, w, 0.5, 0.12, '#1f1a18', 0, 2.8, d / 2 + 0.06);
  for (let i = 0; i < 3; i++) box(c.g, 0.6, 0.35, 0.03, '#e2b43a', -1.4 + i * 1.4, 2.88, d / 2 + 0.13);
  // A gallery with a red balustrade on the upper floor, lattice doors behind.
  box(c.g, w + 0.4, 0.14, 1.2, '#6b3a22', 0, 3.3, d / 2 + 0.6);
  for (let i = 0; i < 14; i++) box(c.g, 0.06, 0.8, 0.06, red, -w / 2 + i * (w / 13), 3.44, d / 2 + 1.15);
  box(c.g, w + 0.4, 0.08, 0.1, red, 0, 4.24, d / 2 + 1.15);
  for (const x of [-2, 0, 2]) { glass(c, x, 3.5, d / 2 + 0.03, 1.4, 2.2); lattice(c, x, 3.5, d / 2 + 0.08, 1.4, 2.2, red, 'grid'); }
  for (const s of [-1, 1]) cyl(c.g, 0.1, 0.1, 3.1, red, s * (w / 2 + 0.1), 3.4, d / 2 + 1.15, 6);
  sweptRoof(c.g, w + 2.4, d + 2.4, 2.2, roof, 0, 6.4, 0, 0, 0.5);
  for (let i = 0; i < 4; i++) sphere(c.glow, 0.26, '#ff4a2a', -w / 2 + 0.8 + i * (w - 1.6) / 3, 5.8, d / 2 + 1.2, 8, 1.25);
  return { r: Math.max(w, d) / 2 + 0.9, h: 8.8 };
}

// ───────────────────────── Islamic world, Middle East, Egypt, desert ─────────────────────────

/** Crenellations (merlons) along a wall top: stepped blocks along the four edges. */
function merlons(c: Ctx, w: number, d: number, y: number, col: string, stepped = true): void {
  for (const [len, x, z, ry] of [[w, 0, d / 2, 0], [w, 0, -d / 2, 0], [d, w / 2, 0, Math.PI / 2], [d, -w / 2, 0, Math.PI / 2]] as const) {
    const n = Math.max(2, Math.round(len / 0.9));
    for (let i = 0; i < n; i++) {
      const o = -len / 2 + (len / n) * (i + 0.5);
      const px = x + Math.cos(ry) * o, pz = z - Math.sin(ry) * o;
      box(c.g, 0.45, 0.5, 0.3, col, px, y, pz, ry);
      if (stepped) box(c.g, 0.25, 0.25, 0.3, col, px, y + 0.5, pz, ry);
    }
  }
}

function riad(c: Ctx): Footprint {
  const wall = pick(c, c.s.walls), tile = pick(c, ['#2f6f9a', '#3a9a7a', '#1f5a7a']), w = c.rng.range(8, 10), d = c.rng.range(8, 10), h = c.rng.range(5.5, 7.5);
  surf(c, SURF.plaster, () => box(c.g, w, h, d, wall));
  // A zellige dado along the base and a band of carved stucco under the parapet.
  surf(c, SURF.glazed, () => box(c.g, w + 0.04, 0.9, d + 0.04, tile));
  for (let i = 0; i < Math.round(w / 0.3); i++) box(c.g, 0.14, 0.14, 0.05, i % 2 ? '#e8b84a' : '#ffffff', -w / 2 + 0.15 + i * 0.3, 0.5, d / 2 + 0.03, Math.PI / 4 * 0);
  box(c.g, w + 0.1, 0.35, d + 0.1, '#f4eadc', 0, h - 0.6, 0);
  // The door: a horseshoe arch in a zellige frame, under a green-tiled cedar awning.
  surf(c, SURF.glazed, () => box(c.g, 2.4, 3.4, 0.1, tile, 0, 0, d / 2 + 0.02));
  archPanel(c.g, 1.9, 3.0, '#f4eadc', 0, 0, d / 2 + 0.08, 0, 0.06);
  archPanel(c.g, 1.5, 2.7, '#6b3a22', 0, 0, d / 2 + 0.12, 0, 0.06);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) sphere(c.g, 0.035, '#d4af37', -0.5 + i * 0.33, 0.35 + j * 0.42, d / 2 + 0.2, 4);
  c.g.add(new THREE.BoxGeometry(3.2, 0.12, 1.0).translate(0, 0, 0.5), '#2f7a4a', M(0, 3.7, d / 2, 0, 1, 1, 1, 0.3));
  for (let i = 0; i < 6; i++) box(c.g, 0.1, 0.25, 0.8, '#6b3a22', -1.4 + i * 0.56, 3.45, d / 2 + 0.45);
  // Few, small windows with iron grilles, and one carved wooden mashrabiya window upstairs.
  for (const x of [-w / 3, w / 3]) { glass(c, x, 2.2, d / 2 + 0.02, 0.6, 0.8, true); for (let k = 0; k < 4; k++) box(c.g, 0.03, 0.9, 0.04, '#1f1f24', x - 0.22 + k * 0.15, 2.2, d / 2 + 0.06); }
  box(c.g, 1.6, 1.4, 0.6, '#6b3a22', w / 4, h - 2.6, d / 2 + 0.3);
  lattice(c, w / 4, h - 2.5, d / 2 + 0.62, 1.4, 1.2, '#8a5a36', 'jali');
  glass(c, w / 4, h - 2.5, d / 2 + 0.58, 1.3, 1.1);
  // The roof terrace, crenellated; sometimes a square minaret-like tower with a tiled cap.
  merlons(c, w, d, h, wall);
  if (c.rng.chance(0.35)) {
    const tx = -w / 2 + 1.3, tz = -d / 2 + 1.3;
    surf(c, SURF.plaster, () => box(c.g, 2.2, 5, 2.2, wall, tx, h, tz));
    surf(c, SURF.glazed, () => box(c.g, 2.3, 0.8, 2.3, tile, tx, h + 3.6, tz));
    glass(c, tx, h + 2.2, tz + 1.12, 0.5, 1, true);
    hip(c.g, 2.6, 2.6, 1.1, '#2f7a4a', tx, h + 5, tz);
    sphere(c.g, 0.16, '#d4af37', tx, h + 6.3, tz, 6);
  }
  return { r: Math.max(w, d) / 2 + 0.5, h: h + 3 };
}

/** A barjeel: a square wind tower open on all four sides above the roof. */
function barjeel(c: Ctx, x: number, y: number, z: number, col: string, h = 4.4): void {
  surf(c, SURF.adobe, () => {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 0.35, h, 0.35, col, x + dx * 1.05, y, z + dz * 1.05);
    box(c.g, 2.5, h * 0.35, 2.5, col, x, y, z);
    box(c.g, 2.7, 0.3, 2.7, col, x, y + h, z);
  });
  // The louvred openings and the cross-vanes inside that catch the wind.
  for (const ry of [0, Math.PI / 2]) box(c.g, 2.3, h * 0.6, 0.08, '#6b4a2a', x, y + h * 0.35, z, ry);
  for (let i = 0; i < 4; i++) box(c.g, 0.22, 0.4, 0.22, col, x - 0.9 + i * 0.6, y + h + 0.3, z);
}

function gulfHouse(c: Ctx): Footprint {
  const wall = pick(c, c.s.walls), w = c.rng.range(8, 10), d = c.rng.range(8, 10), h = c.rng.range(5, 7);
  surf(c, SURF.adobe, () => box(c.g, w, h, d, wall));
  // Vertical recessed panels up the walls (a Gulf coral-stone signature), and palm-log beam ends.
  for (let i = 0; i < Math.round(w / 1.1); i++) box(c.g, 0.4, h - 1.6, 0.06, '#c9a473', -w / 2 + 0.55 + i * 1.1, 0.8, d / 2 + 0.01);
  for (let i = 0; i < Math.round(w / 0.8); i++) cyl(c.g, 0.07, 0.07, 0.5, '#6b4a2a', -w / 2 + 0.4 + i * 0.8, h - 0.5, d / 2 + 0.2, 4);
  // The studded door under a pointed arch, and mashrabiya screens projecting from the upper floor.
  archPanel(c.g, 1.8, 3.1, '#e8d2a8', 0, 0, d / 2 + 0.06, 0, 0.08, true);
  doorLeaf(c, 0, d / 2 + 0.14, 1.4, 2.4, '#6b3a22', true);
  for (const x of [-w / 3, w / 3]) {
    box(c.g, 1.8, 1.8, 0.7, '#6b4a2a', x, h - 2.8, d / 2 + 0.35);
    glass(c, x, h - 2.6, d / 2 + 0.72, 1.5, 1.3);
    lattice(c, x, h - 2.65, d / 2 + 0.76, 1.6, 1.4, '#8a5a36', 'jali');
    for (let k = 0; k < 3; k++) box(c.g, 0.2, 0.25, 0.7 - k * 0.2, '#6b4a2a', x - 0.7 + k * 0.7, h - 3.05, d / 2 + 0.35);
  }
  merlons(c, w, d, h, wall, false);
  if (c.rng.chance(0.7)) barjeel(c, w / 2 - 1.6, h, -d / 2 + 1.6, wall);
  if (c.rng.chance(0.4)) {
    box(c.g, 3.6, 0.1, 2, pick(c, ['#c23b2a', '#2f6f9a', '#e2b43a']), -w / 4, 3.0, d / 2 + 1);
    for (const s of [-1, 1]) cyl(c.g, 0.05, 0.05, 3, '#6b4a2a', -w / 4 + s * 1.7, 0, d / 2 + 1.9, 4);
  }
  return { r: Math.max(w, d) / 2 + 0.7, h: h + 5 };
}

/** A Nubian house: vaults and a dome behind a parapet, the facade painted round the door. */
function nubian(c: Ctx): Footprint {
  const wall = pick(c, ['#f4eadc', '#8ab8e0', '#f2d07a', '#f2b8c0', '#e0c48a']), trim = pick(c, ['#2f6f9a', '#c23b2a', '#e2b43a', '#2f7a5a']);
  const w = c.rng.range(8, 10), d = c.rng.range(7, 9), h = c.rng.range(3.4, 4.2);
  surf(c, SURF.adobe, () => {
    box(c.g, w, h, d, wall);
    // Barrel vaults running front to back, and a dome.
    c.g.add(new THREE.CylinderGeometry(w * 0.2, w * 0.2, d - 0.6, 12, 1, false, Math.PI / 2, Math.PI), wall, M(-w * 0.24, h, 0, 0, 1, 1, 1, Math.PI / 2, 0));
    dome(c.g, Math.min(w, d) * 0.22, wall, w * 0.22, h, -d * 0.1, 12);
  });
  box(c.g, w + 0.1, 0.8, 0.2, wall, 0, h, d / 2 - 0.1);
  // Painted patterns round the door: a band of triangles and a painted frame, with a plate or two.
  box(c.g, 2.4, 3.0, 0.05, trim, 0, 0, d / 2 + 0.01);
  archPanel(c.g, 1.3, 2.3, '#6b3a22', 0, 0, d / 2 + 0.04, 0, 0.06);
  for (let i = 0; i < Math.round(w / 0.5); i++) cone(c.g, 0.2, 0.34, i % 2 ? trim : '#ffffff', -w / 2 + 0.25 + i * 0.5, h - 0.7, d / 2 + 0.03, 3);
  for (const x of [-w / 3, w / 3]) {
    glass(c, x, 1.4, d / 2 + 0.02, 0.7, 0.9);
    for (let k = 0; k < 5; k++) box(c.g, 0.1, 0.1, 0.04, trim, x - 0.3 + k * 0.15, 2.45, d / 2 + 0.03);
    cyl(c.g, 0.22, 0.22, 0.03, '#ffffff', x, 2.9, d / 2 + 0.04, 10);
  }
  // Palm-log beam ends and a bench along the front.
  for (let i = 0; i < 6; i++) cyl(c.g, 0.08, 0.08, 0.4, '#6b4a2a', -w / 2 + 0.8 + i * (w - 1.6) / 5, h - 0.3, d / 2 + 0.2, 4);
  surf(c, SURF.adobe, () => box(c.g, w * 0.3, 0.45, 0.6, wall, -w / 3, 0, d / 2 + 0.3));
  return { r: Math.max(w, d) / 2 + 0.5, h: h + 2.4 };
}


/** A sadu band woven into a tent strip: black ground, white and red triangles, a chain of diamonds, lines either side — `len` along x. */
export function saduBand(c: Ctx, len: number, h: number, colA = '#f4efe6', colB = '#b8322a'): void {
  const n = Math.max(2, Math.round(len / (h * 0.9)));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n), w = len / n;
    // Teeth along the top and bottom edges, diamonds between them.
    c.g.add(new THREE.ConeGeometry(w * 0.5, h * 0.3, 3).rotateZ(Math.PI), i % 2 ? colB : colA, M(x, h * 0.85, 0, 0, 1, 1, 0.08));
    c.g.add(new THREE.ConeGeometry(w * 0.5, h * 0.3, 3), i % 2 ? colA : colB, M(x, h * 0.15, 0, 0, 1, 1, 0.08));
    c.g.add(new THREE.BoxGeometry(w * 0.34, w * 0.34, 0.02), i % 3 === 0 ? colB : colA, M(x, h * 0.5, 0.01, 0, 1, 1, 1, 0, Math.PI / 4));
    c.g.add(new THREE.BoxGeometry(w * 0.12, w * 0.12, 0.02), '#2a2220', M(x, h * 0.5, 0.025, 0, 1, 1, 1, 0, Math.PI / 4));
  }
  for (const y of [0, h]) box(c.g, len, 0.03, 0.025, colA, 0, y, 0);
}

function bedouinTent(c: Ctx): Footprint {
  const black = pick(c, ['#2a2220', '#3a2e28']), qata = pick(c, ['#8c3b2a', '#c23b2a', '#2f6f9a']), w = c.rng.range(10, 13), d = 5.5, h = 2.4;
  // Rows of poles under a long, low roof of woven strips.
  for (const z of [-d * 0.35, 0, d * 0.35]) for (let i = 0; i < 4; i++) cyl(c.g, 0.06, 0.07, z === 0 ? h : h * 0.72, '#8a6444', -w / 2 + 0.8 + i * (w - 1.6) / 3, 0, z, 5);
  surf(c, SURF.cloth, () => {
    for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(w, 0.05, d * 0.55), black, M(0, h - 0.35, s * d * 0.25, 0, 1, 1, 1, s * 0.28));
    // The back wall comes down to the sand; the front stays open to guests.
    box(c.g, w, h * 0.72, 0.05, black, 0, 0, -d / 2 + 0.1);
    for (const s of [-1, 1]) box(c.g, 0.05, h * 0.72, d * 0.8, black, s * w / 2, 0, -0.3);
  });
  for (let i = 0; i < Math.round(w / 0.9); i++) box(c.g, 0.06, 0.03, d * 0.55, '#8a7a6a', -w / 2 + 0.45 + i * 0.9, h - 0.3, 0, 0);
  // Sadu bands woven into the roof's front edge and across the back wall; tassels along the eaves.
  c.g.frame(0, h - 0.62, d * 0.52 + 0.02, 0, 1, () => saduBand(c, w, 0.34));
  c.g.frame(0, 0.55, -d / 2 + 0.14, Math.PI, 1, () => saduBand(c, w, 0.42, '#f4efe6', qata));
  for (const sx of [-1, 1]) c.g.frame(sx * (w / 2 + 0.04), 0.5, -0.3, sx * Math.PI / 2, 1, () => saduBand(c, d * 0.8, 0.36));
  for (let i = 0; i < Math.round(w / 0.5); i++) { const x = -w / 2 + 0.25 + i * 0.5; cyl(c.g, 0.01, 0.01, 0.3, '#c9b08a', x, h - 0.95, d * 0.52, 3); sphere(c.g, 0.05, i % 2 ? qata : '#f4efe6', x, h - 1.0, d * 0.52, 4); }
  // The qata: a decorated curtain dividing the inside, and rugs and cushions in the open side.
  surf(c, SURF.cloth, () => box(c.g, 0.06, h * 0.8, d * 0.7, qata, w * 0.12, 0, -0.2));
  for (let i = 0; i < 6; i++) box(c.g, 0.07, 0.1, d * 0.7, i % 2 ? '#f1d3a2' : '#2a2220', w * 0.12, 0.3 + i * 0.28, -0.2);
  surf(c, SURF.cloth, () => { box(c.g, w * 0.7, 0.03, d * 0.6, qata, -w * 0.1, 0, 0.3); box(c.g, w * 0.6, 0.035, d * 0.45, '#e8c48a', -w * 0.1, 0, 0.3); });
  for (let i = 0; i < 5; i++) box(c.g, 0.8, 0.35, 0.5, pick(c, ['#c23b2a', '#e2b43a', '#2f6f9a']), -w * 0.35 + i * 1.1, 0, -d / 2 + 0.5);
  // Guy ropes to stakes in the sand.
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 0.8 + i * (w - 1.6) / 3;
    c.g.add(new THREE.CylinderGeometry(0.012, 0.012, 3.2, 3).translate(0, 1.6, 0), '#c9b08a', M(x, 0, s * d * 0.42, 0, 1, 1, 1, s * 1.05));
  }
  // A coffee fire with a dallah by the front.
  cone(c.glow, 0.4, 0.8, '#ff8a2a', 0, 0.1, d / 2 + 2.2, 5);
  for (let i = 0; i < 6; i++) sphere(c.g, 0.18, '#6b6b6b', Math.cos(i) * 0.6, 0, d / 2 + 2.2 + Math.sin(i) * 0.6, 4);
  cyl(c.g, 0.12, 0.18, 0.35, '#d4af37', 0.8, 0, d / 2 + 2.2, 8);
  sphere(c.glow, 0.14, c.s.glow, -w / 2 + 1.2, h - 0.5, d / 2 - 0.4, 6, 1.3);
  return { r: w / 2 + 0.4, h: h + 0.6 };
}

function roundTent(c: Ctx): Footprint {
  const white = pick(c, ['#f1e6d0', '#f4efe6']), band = pick(c, ['#8c3b2a', '#2f6f9a', '#e2b43a']), r = 3.2;
  surf(c, SURF.cloth, () => {
    cyl(c.g, r, r, 1.8, white, 0, 0, 0, 12);
    cone(c.g, r * 1.12, 2.4, white, 0, 1.8, 0, 12);
  });
  cyl(c.g, r * 1.01, r * 1.01, 0.3, band, 0, 1.3, 0, 12);
  for (let i = 0; i < 12; i++) cone(c.g, 0.2, 0.35, band, Math.cos((i / 12) * Math.PI * 2) * r * 1.02, 0.95, Math.sin((i / 12) * Math.PI * 2) * r * 1.02, 3);
  // A woven band of diamonds round the wall and a zigzag round the roof's rim.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, x = Math.cos(a) * r * 1.02, z = Math.sin(a) * r * 1.02;
    c.g.add(new THREE.BoxGeometry(0.34, 0.34, 0.03), i % 2 ? '#2a2220' : band, M(x, 0.62, z, Math.PI / 2 - a, 1, 1, 1, 0, Math.PI / 4));
    c.g.add(new THREE.ConeGeometry(0.28, 0.3, 3).rotateZ(Math.PI), i % 2 ? band : '#2a2220', M(Math.cos(a) * r * 1.1, 1.72, Math.sin(a) * r * 1.1, Math.PI / 2 - a, 1, 1, 0.1));
  }
  for (const y of [0.4, 0.84]) cyl(c.g, r * 1.015, r * 1.015, 0.04, '#2a2220', 0, y, 0, 24);
  box(c.g, 1.3, 1.7, 0.08, band, 0, 0, r - 0.02);
  cyl(c.g, 0.05, 0.05, 1.2, '#8a6444', 0, 4.1, 0, 4);
  sphere(c.g, 0.12, '#d4af37', 0, 5.35, 0, 6);
  sphere(c.glow, 0.13, c.s.glow, 0.9, 1.9, r + 0.1, 6);
  return { r: r + 0.6, h: 5.5 };
}

// ───────────────────────── South Asia ─────────────────────────

/** A jharokha: a projecting balcony window on stepped corbels, with a jali and a curved roof or dome. */
function jharokha(c: Ctx, x: number, y: number, z: number, w: number, col: string, roof: string, kind: 'dome' | 'bangla'): void {
  for (let k = 0; k < 3; k++) box(c.g, w - k * 0.3, 0.18, 0.9 - k * 0.25, col, x, y - 0.2 - k * 0.2, z + (0.9 - k * 0.25) / 2);
  box(c.g, w, 0.12, 0.95, col, x, y, z + 0.47);
  for (const s of [-1, 1]) cyl(c.g, 0.06, 0.07, 1.3, col, x + s * (w / 2 - 0.1), y + 0.1, z + 0.85, 6);
  glass(c, x, y + 0.2, z + 0.02, w - 0.4, 1.1, true);
  lattice(c, x, y + 0.12, z + 0.9, w - 0.25, 0.5, col, 'jali');
  box(c.g, w + 0.2, 0.12, 1.05, col, x, y + 1.4, z + 0.47);
  if (kind === 'dome') onion(c.g, w * 0.36, roof, x, y + 1.52, z + 0.47, '#e2b43a');
  else c.g.add(new THREE.CylinderGeometry(0.55, 0.55, w + 0.2, 10, 1, false, 0, Math.PI), roof, M(x, y + 1.52, z + 0.47, 0, 0.55, 1, 1, 0, Math.PI / 2));
}

function chhatriKiosk(c: Ctx, x: number, y: number, z: number, r: number, col: string, domeCol: string): void {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, r * 0.1, r * 0.1, r * 1.2, col, x + dx * r * 0.7, y, z + dz * r * 0.7, 5);
  box(c.g, r * 1.9, r * 0.16, r * 1.9, col, x, y + r * 1.2, z);
  onion(c.g, r * 0.75, domeCol, x, y + r * 1.36, z);
}

function haveli(c: Ctx): Footprint {
  const pink = pick(c, c.s.walls), white = '#fbf3e8', w = c.rng.range(9, 11), d = 8, floors = c.rng.int(3, 4), fh = 3.1, H = floors * fh;
  surf(c, SURF.ashlar, () => box(c.g, w, H, d, pink));
  // Carved string courses at every floor, painted white.
  for (let f = 1; f <= floors; f++) box(c.g, w + 0.24, 0.22, d + 0.24, white, 0, f * fh - 0.12, 0);
  // The painted gateway: a tall arch with elephants painted either side.
  archPanel(c.g, 2.6, 3.8, white, 0, 0, d / 2 + 0.02, 0, 0.08);
  archPanel(c.g, 2.0, 3.3, '#6b3a2a', 0, 0, d / 2 + 0.08, 0, 0.06);
  for (const s of [-1, 1]) { sphere(c.g, 0.45, '#8a8a94', s * 2.0, 1.4, d / 2 + 0.05, 8, 0.7); box(c.g, 0.7, 0.35, 0.04, '#c23b2a', s * 2.0, 1.55, d / 2 + 0.1); }
  // Rows of jharokhas on every upper floor, arched windows between.
  const n = Math.max(2, Math.round(w / 3.2));
  for (let f = 1; f < floors; f++) for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * (i + 0.5);
    if ((i + f) % 2 === 0) jharokha(c, x, f * fh + 0.5, d / 2, 1.6, white, white, f === floors - 1 ? 'dome' : 'bangla');
    else { glass(c, x, f * fh + 0.7, d / 2 + 0.02, 0.9, 1.4, true, true); archPanel(c.g, 1.1, 1.6, white, x, f * fh + 0.6, d / 2 + 0.01, 0, 0.05, true); }
  }
  // Parapet with little merlons, and chhatris on the roof.
  for (let i = 0; i < Math.round(w / 0.6); i++) box(c.g, 0.3, 0.45, 0.2, white, -w / 2 + 0.3 + i * 0.6, H, d / 2 - 0.1);
  chhatriKiosk(c, w / 2 - 1.3, H, -d / 2 + 1.3, 1.1, white, white);
  if (c.rng.chance(0.6)) chhatriKiosk(c, -w / 2 + 1.3, H, -d / 2 + 1.3, 0.9, white, pink);
  return { r: Math.max(w, d) / 2 + 1.1, h: H + 3 };
}

function keralaHome(c: Ctx): Footprint {
  const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), w = c.rng.range(9, 11), d = 7.5, wood = '#5a3a26';
  surf(c, SURF.brick, () => box(c.g, w + 1.2, 0.7, d + 2.4, '#a85a3a'));
  surf(c, SURF.plaster, () => box(c.g, w, 3.0, d, wall, 0, 0.7, -0.4));
  // The verandah: turned wooden pillars on stone bases, a low wall seat between them.
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.3 + i * (w - 0.6) / 4;
    box(c.g, 0.4, 0.3, 0.4, '#8a8278', x, 0.7, d / 2 + 0.6);
    cyl(c.g, 0.13, 0.15, 2.5, wood, x, 1.0, d / 2 + 0.6, 8);
    sphere(c.g, 0.17, wood, x, 1.9, d / 2 + 0.6, 6);
  }
  box(c.g, w, 0.45, 0.4, '#a85a3a', 0, 0.7, d / 2 + 0.6);
  doorLeaf(c, 0, d / 2 - 0.38, 1.3, 2.3, wood);
  for (const x of [-w / 3, w / 3]) { glass(c, x, 1.6, d / 2 - 0.37, 1.2, 1.2); lattice(c, x, 1.6, d / 2 - 0.32, 1.2, 1.2, wood, 'grid'); }
  // The steep clay-tile roof, deep eaves over the verandah, and the gable vents at each end.
  surf(c, SURF.clayTile, () => hip(c.g, w + 2.6, d + 3.4, 3.8, roof, 0, 3.7, 0.2));
  for (const s of [-1, 1]) {
    gable(c.g, 0.2, 2.6, 1.6, '#6b4a2a', s * (w / 2 - 0.2), 5.6, 0.2, Math.PI / 2 * 0 + Math.PI / 2);
    for (let k = 0; k < 4; k++) box(c.g, 0.05, 0.9 - k * 0.2, 0.22, '#3a2a1a', s * (w / 2 - 0.2), 5.7, 0.2 - 0.6 + k * 0.4);
  }
  surf(c, SURF.clayTile, () => { gable(c.g, w * 0.8, 2.8, 1.4, roof, 0, 6.2, 0.2); });
  for (const s of [-1, 1]) cone(c.g, 0.1, 0.9, '#e2b43a', s * w * 0.4, 7.4, 0.2, 5);
  // A brass lamp by the door.
  cyl(c.g, 0.04, 0.2, 1.2, '#d4af37', 1.2, 0.7, d / 2 + 0.3, 8);
  sphere(c.glow, 0.12, '#ffb84a', 1.2, 2.0, d / 2 + 0.3, 6);
  return { r: Math.max(w, d) / 2 + 1.8, h: 8 };
}

/** Mughal: red sandstone framed in white marble, a pishtaq portal, jalis, a bangaldar roof or domes. */
function mughalPavilion(c: Ctx): Footprint {
  const red = '#b5552e', white = '#fbf7ee', w = c.rng.range(10, 12), d = 8, h = c.rng.range(6, 7.5);
  surf(c, SURF.ashlar, () => box(c.g, w, h, d, red));
  surf(c, SURF.marble, () => {
    box(c.g, w + 0.3, 0.5, d + 0.3, white);
    box(c.g, w + 0.24, 0.3, d + 0.24, white, 0, h - 0.3, 0);
  });
  // White marble outlines: panels on the facade, each with a small pointed niche.
  for (const s of [-1, 1]) for (const y of [0.9, 3.6]) {
    const x = s * (w / 2 - 1.4);
    box(c.g, 1.8, 2.2, 0.05, white, x, y, d / 2 + 0.01);
    box(c.g, 1.5, 1.9, 0.06, red, x, y + 0.15, d / 2 + 0.02);
    archPanel(c.glow, 0.8, 1.3, c.s.glow, x, y + 0.35, d / 2 + 0.04, 0, 0.03, true);
    lattice(c, x, y + 0.35, d / 2 + 0.08, 0.8, 0.9, white, 'jali');
  }
  // The pishtaq: a tall rectangular frame projecting from the facade round a deep pointed arch (iwan).
  surf(c, SURF.marble, () => box(c.g, 4.2, h + 1.2, 0.8, white, 0, 0, d / 2 + 0.2));
  box(c.g, 3.6, h + 0.6, 0.82, red, 0, 0.3, d / 2 + 0.22);
  archPanel(c.g, 2.8, h - 1.2, '#7a2e1a', 0, 0.3, d / 2 + 0.55, 0, 0.1, true);
  archPanel(c.g, 1.5, 2.6, '#5a2a1a', 0, 0.3, d / 2 + 0.66, 0, 0.06, true);
  archPanel(c.glow, 1.4, 1.2, c.s.glow, 0, 3.2, d / 2 + 0.68, 0, 0.03, true);
  for (let i = 0; i < 9; i++) box(c.g, 0.14, 0.14, 0.05, pick(c, ['#2f7a5a', '#d4af37', '#1f3a6a']), -1.6 + i * 0.4, h + 0.3, d / 2 + 0.62);
  for (const s of [-1, 1]) { cyl(c.g, 0.2, 0.22, h + 1.8, white, s * 2.1, 0, d / 2 + 0.6, 8); onion(c.g, 0.32, white, s * 2.1, h + 1.8, d / 2 + 0.6, '#d4af37'); }
  if (c.rng.chance(0.5)) {
    // A bangaldar roof: the curved Bengal hut roof, in marble.
    c.g.add(new THREE.CylinderGeometry(1, 1, w * 0.5, 14, 1, false, 0, Math.PI), white, M(0, h, -d * 0.1, 0, 1.5, 1.0, d * 0.28, 0, Math.PI / 2));
    for (const s of [-1, 1]) sphere(c.g, 0.2, '#d4af37', s * w * 0.18, h + 1.0, -d * 0.1, 6);
  } else {
    cyl(c.g, 1.8, 1.8, 1, white, 0, h, -d * 0.1, 14);
    onion(c.g, 1.9, white, 0, h + 1, -d * 0.1);
  }
  chhatriKiosk(c, -w / 2 + 1.1, h, -d / 2 + 1.1, 0.9, white, white);
  chhatriKiosk(c, w / 2 - 1.1, h, -d / 2 + 1.1, 0.9, white, white);
  return { r: Math.max(w, d) / 2 + 1.0, h: h + 5 };
}

// ───────────────────────── Indonesia, the north, the sky ─────────────────────────

function bale(c: Ctx): Footprint {
  const stone = '#8a8478', roof = '#8a6a3a', wood = '#6b4a2a', w = 7, d = 6;
  // A carved stone base of steps and bands.
  surf(c, SURF.ashlar, () => { box(c.g, w + 1, 1.0, d + 1, stone); box(c.g, w + 1.2, 0.2, d + 1.2, '#a8a090', 0, 0.8, 0); });
  for (let i = 0; i < 3; i++) box(c.g, 1.6, 0.33, 0.45, stone, 0, 1.0 - (i + 1) * 0.33, d / 2 + 0.7 + i * 0.45);
  for (let i = 0; i < 12; i++) box(c.g, 0.35, 0.35, 0.06, '#a8a090', -w / 2 + 0.3 + i * (w - 0.6) / 11, 0.25, d / 2 + 0.52);
  // Carved and painted posts: an open pavilion with a raised floor.
  for (const x of [-w / 2 + 0.4, -w / 6, w / 6, w / 2 - 0.4]) for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) {
    box(c.g, 0.3, 2.8, 0.3, wood, x, 1.0, z);
    box(c.g, 0.4, 0.2, 0.4, '#c23b2a', x, 3.6, z);
    box(c.g, 0.34, 0.12, 0.34, '#e2b43a', x, 1.4, z);
  }
  box(c.g, w - 0.4, 0.2, d - 0.4, '#8a5a36', 0, 1.3, 0);
  box(c.g, w - 1, 0.15, d - 1.4, pick(c, ['#c23b2a', '#e2b43a', '#2f7a5a']), 0, 1.5, -0.2);
  // A back wall of carved panels, lit, and a steep alang-alang thatch roof with a crowning ridge.
  surf(c, SURF.boards, () => box(c.g, w - 0.6, 2.4, 0.15, '#8a5a36', 0, 1.5, -d / 2 + 0.45));
  glass(c, 0, 2.0, -d / 2 + 0.55, 1.4, 1.2);
  surf(c, SURF.thatch, () => hip(c.g, w + 2.4, d + 2.4, 4.6, roof, 0, 3.8, 0));
  box(c.g, w * 0.3, 0.3, 0.3, '#5a4a2a', 0, 8.3, 0);
  for (const s of [-1, 1]) cone(c.g, 0.12, 0.8, '#e2b43a', s * w * 0.15, 8.5, 0, 5);
  // Penjor: a tall bamboo pole arching over the entrance, hung with palm-leaf ornaments.
  if (c.rng.chance(0.6)) {
    for (let i = 0; i < 8; i++) sphere(c.g, 0.12, '#c9b06a', w / 2 + 0.6 + Math.sin(i * 0.25) * i * 0.3, 1 + i * 0.9, d / 2 + 1.2 + i * 0.12, 5);
    sphere(c.g, 0.5, '#e8d6a0', w / 2 + 2.6, 7.6, d / 2 + 2.2, 6, 1.4);
  }
  return { r: Math.max(w, d) / 2 + 1.3, h: 8.8 };
}

function tongkonan(c: Ctx): Footprint {
  const wood = '#6b3a22', red = '#b3262a', roof = pick(c, ['#3a3a30', '#4a4a3a']), w = 7.5, d = 4.5, lift = 2;
  // On piles, a raised house with walls carved in red, black, white and yellow patterns.
  for (const x of [-w / 2 + 0.4, 0, w / 2 - 0.4]) for (const z of [-d / 2 + 0.4, d / 2 - 0.4]) cyl(c.g, 0.2, 0.22, lift, '#4a3426', x, 0, z, 6);
  surf(c, SURF.boards, () => box(c.g, w, 2.4, d, wood, 0, lift, 0));
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) box(c.g, 0.6, 0.5, 0.05, [red, '#1f1f24', '#e2b43a', '#f4efe6'][(i + j) % 4], -w / 2 + 0.5 + i * 0.93, lift + 0.2 + j * 0.75, d / 2 + 0.02);
  glass(c, 0, lift + 0.6, d / 2 + 0.06, 1.0, 1.2);
  box(c.g, 1.2, 0.12, 2.2, '#5a3a26', 0, lift - 0.1, d / 2 + 1.0);
  for (let i = 0; i < 5; i++) box(c.g, 1.0, 0.1, 0.3, '#5a3a26', 0, (lift / 5) * i, d / 2 + 2.0 - i * 0.2);
  // The saddle roof: a huge boat-shaped curve sweeping up and out at both ends.
  const s = new THREE.Shape();
  const L = w + 7;
  s.moveTo(-L / 2, 3.6); s.quadraticCurveTo(0, -0.5, L / 2, 3.6); s.lineTo(L / 2 - 0.4, 4.2); s.quadraticCurveTo(0, 0.6, -L / 2 + 0.4, 4.2); s.closePath();
  for (const side of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(s, { depth: d * 0.72, bevelEnabled: false, curveSegments: 12 });
    c.g.add(geo, roof, M(0, lift + 2.4, 0, 0, 1, 1, 1, side * 0.55 + (side > 0 ? 0 : Math.PI)));
  }
  // A carved buffalo-head emblem and the post of horns on the front.
  cyl(c.g, 0.14, 0.16, 3.2, '#4a3426', 0, lift + 2.4, d / 2 + 1.4, 6);
  for (let i = 0; i < 5; i++) for (const sd of [-1, 1]) c.g.add(new THREE.TorusGeometry(0.35, 0.05, 4, 8, Math.PI * 0.8), '#e8dcc0', M(sd * 0.25, lift + 2.6 + i * 0.5, d / 2 + 1.45, 0, 1, 1, 1, 0, sd * 0.6));
  return { r: Math.max(w, d) / 2 + 1.6, h: lift + 7.5 };
}

function lavvu(c: Ctx): Footprint {
  const cloth = pick(c, ['#e8e0cc', '#d9d0bc', '#8a7a6a']), r = 3;
  surf(c, SURF.cloth, () => cone(c.g, r, 4.6, cloth, 0, 0, 0, 12));
  // The poles stand out through the smoke hole at the top.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    c.g.add(new THREE.CylinderGeometry(0.04, 0.06, 6.2, 4).translate(0, 3.1, 0), '#6b4a2a', M(Math.cos(a) * r * 0.95, 0, Math.sin(a) * r * 0.95, 0, 1, 1, 1, Math.sin(a) * -0.55, Math.cos(a) * 0.55));
  }
  cyl(c.g, r * 1.01, r * 1.01, 0.3, '#b3262a', 0, 0.5, 0, 12);
  for (let i = 0; i < 12; i++) box(c.g, 0.2, 0.2, 0.04, i % 2 ? '#2f5a8a' : '#f2d14e', Math.sin((i / 12) * Math.PI * 2) * r * 0.9, 0.55, Math.cos((i / 12) * Math.PI * 2) * r * 0.9, (i / 12) * Math.PI * 2);
  box(c.g, 1.1, 1.6, 0.06, '#6b4a2a', 0, 0, r * 0.66);
  sphere(c.glow, 0.5, c.s.glow, 0, 4.6, 0, 6, 0.6);
  // Reindeer skins by the door and a sled.
  box(c.g, 1.2, 0.05, 0.8, '#b8a88a', 1.4, 0, r + 0.5);
  box(c.g, 0.7, 0.3, 1.8, '#8a5a36', -1.8, 0, r + 0.6);
  return { r: r + 0.4, h: 6.2 };
}

function goahti(c: Ctx): Footprint {
  const turf = '#6a8a5a', w = 6, d = 5.4;
  // A low hut of birch arches under bark and turf, a door of boards, grass on the roof.
  c.g.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#8a7a5a', M(0, 0, 0, 0, w / 2, 2.8, d / 2));
  surf(c, SURF.snow, () => c.g.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), '#f4f8ff', M(0, 0.25, 0, 0, w / 2 - 0.1, 2.7, d / 2 - 0.1)));
  for (let i = 0; i < 18; i++) cone(c.g, 0.12, 0.4, turf, Math.cos(i) * w * 0.35, 1.2 + (i % 3) * 0.4, Math.sin(i) * d * 0.3 - 0.2, 3);
  box(c.g, 1.6, 2.0, 1.2, '#6b4a2a', 0, 0, d / 2 - 0.5);
  box(c.g, 1.0, 1.6, 0.08, '#4a3426', 0, 0, d / 2 + 0.12);
  gable(c.g, 1.4, 1.9, 0.6, '#8a7a5a', 0, 2.0, d / 2 - 0.5, Math.PI / 2);
  box(c.g, 0.4, 0.8, 0.4, '#5a5a5a', 1, 2.3, -0.5);
  sphere(c.glow, 0.25, c.s.glow, 0.8, 1.2, d / 2 - 0.1, 6);
  return { r: w / 2 + 0.6, h: 3.5 };
}

function logCabin(c: Ctx): Footprint {
  const log = pick(c, c.s.walls), w = 7, d = 6, h = 3;
  for (let i = 0; i < 10; i++) {
    for (const s of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.16, 0.16, w + 0.6, 8), log, M(0, 0.16 + i * 0.3, s * d / 2, 0, 1, 1, 1, 0, Math.PI / 2));
    for (const s of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.16, 0.16, d + 0.6, 8), log, M(s * w / 2, 0.31 + i * 0.3, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  }
  glass(c, -1.8, 1.0, d / 2 + 0.18, 1.1, 1.0);
  glass(c, 1.8, 1.0, d / 2 + 0.18, 1.1, 1.0);
  for (const x of [-1.8, 1.8]) { box(c.g, 1.3, 0.08, 0.1, '#ffffff', x, 2.0, d / 2 + 0.2); box(c.g, 0.06, 1.1, 0.1, '#ffffff', x, 0.95, d / 2 + 0.2); }
  box(c.g, 1.0, 2.0, 0.1, '#6b3a22', 0, 0, d / 2 + 0.18);
  surf(c, SURF.snow, () => gable(c.g, w + 1.2, d + 1.4, 2.6, '#f4f8ff', 0, h, 0));
  box(c.g, 0.6, 1.8, 0.6, '#6b6b6b', 1.8, h + 0.6, -1);
  // Firewood stacked by the wall.
  for (let i = 0; i < 12; i++) cyl(c.g, 0.1, 0.1, 0.6, '#8a6444', w / 2 + 0.5, (i % 4) * 0.2, -1 + Math.floor(i / 4) * 0.22, 5);
  return { r: Math.max(w, d) / 2 + 0.8, h: h + 3 };
}

function glassCabin(c: Ctx): Footprint {
  const w = 5, d = 6;
  box(c.g, w + 0.4, 0.4, d + 0.4, '#8a5a3c');
  // A glass A-frame, its roof open to the sky for watching the aurora.
  for (const s of [-1, 1]) c.glow.add(new THREE.BoxGeometry(0.04, 4.4, d), '#9fc8ff', M(s * w * 0.25, 0.4 + 1.9, 0, 0, 1, 1, 1, 0, s * 0.5));
  for (const z of [-d / 2, 0, d / 2]) for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.12, 4.5, 0.12), '#3a2a22', M(s * w * 0.25, 0.4 + 1.9, z, 0, 1, 1, 1, 0, s * 0.5));
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 4)]);
  c.g.add(new THREE.ExtrudeGeometry(tri, { depth: 0.2, bevelEnabled: false }), '#6b4a2a', M(0, 0.4, -d / 2 - 0.1));
  sphere(c.glow, 0.7, c.s.glow, 0, 1.2, 0, 8, 0.6);
  box(c.g, 1.6, 0.4, 2, '#e8e0cc', 0, 0.4, -0.8);
  return { r: Math.max(w, d) / 2 + 0.6, h: 4.8 };
}

/** A snow igloo: a dome of snow blocks in rings, a tunnel entrance, a warm glow through the ice. */
function igloo(c: Ctx): Footprint {
  const r = 2.8;
  surf(c, SURF.snow, () => dome(c.g, r, '#f4f8ff', 0, 0, 0, 16, 0.85));
  for (let k = 1; k < 5; k++) {
    const a = (k / 5) * Math.PI / 2;
    c.g.add(new THREE.TorusGeometry(Math.cos(a) * r * 1.005, 0.03, 3, 28).rotateX(Math.PI / 2), '#d6e4f0', M(0, Math.sin(a) * r * 0.85, 0));
  }
  // The tunnel entrance, half a barrel of snow, and a lamp inside.
  surf(c, SURF.snow, () => c.g.add(new THREE.CylinderGeometry(0.9, 0.9, 2, 12, 1, true, Math.PI / 2, Math.PI), '#f4f8ff', M(0, 0, r - 0.2, 0, 1, 1, 1, Math.PI / 2, 0)));
  box(c.g, 1.0, 1.3, 0.1, '#3a2a22', 0, 0, r + 0.75);
  c.glow.add(new THREE.BoxGeometry(0.5, 0.35, 0.05), '#ffcf7a', M(r * 0.7, 1.4, r * 0.55, Math.PI / 4));
  sphere(c.glow, 0.5, c.s.glow, 0, 0.9, 0, 8, 0.6);
  return { r: r + 1.1, h: 3 };
}

/** A glass igloo: a clear dome on a timber deck, a bed inside under the aurora. */
function glassIgloo(c: Ctx): Footprint {
  const r = 2.7;
  box(c.g, r * 2 + 0.6, 0.3, r * 2 + 0.6, '#8a5a3c');
  c.glow.add(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#9fc8ff', M(0, 0.3, 0, 0, 1, 0.9, 1));
  for (let i = 0; i < 8; i++) c.g.add(new THREE.TorusGeometry(r, 0.04, 3, 18, Math.PI), '#3a2a22', M(0, 0.3, 0, (i / 8) * Math.PI, 1, 0.9, 1));
  surf(c, SURF.snow, () => c.g.add(new THREE.SphereGeometry(r * 1.01, 16, 4, 0, Math.PI * 2, Math.PI / 2 - 0.35, 0.35), '#f4f8ff', M(0, 0.3, 0, 0, 1, 0.9, 1)));
  box(c.g, 2.2, 0.4, 1.6, '#e8e0cc', 0, 0.3, -0.6);
  box(c.g, 1.0, 1.9, 0.12, '#6b4a2a', 0, 0.3, r - 0.05);
  sphere(c.glow, 0.5, c.s.glow, 0, 1.0, 0, 8, 0.6);
  return { r: r + 0.8, h: 3 };
}

function skySpire(c: Ctx): Footprint {
  const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), trim = pick(c, c.s.trims), r = c.rng.range(2.2, 2.8), h = c.rng.range(8, 12);
  // A slender tower of moonstone with arched windows all the way up and a needle spire.
  surf(c, SURF.marble, () => { cyl(c.g, r * 1.3, r * 1.4, 0.6, wall, 0, 0, 0, 16); cyl(c.g, r, r * 1.1, h, wall, 0, 0.6, 0, 16); });
  for (let f = 0; f < Math.floor(h / 2.6); f++) {
    cyl(c.g, r * 1.06, r * 1.06, 0.18, trim, 0, 0.6 + (f + 1) * 2.6 - 0.2, 0, 16);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + f * 0.4;
      archPanel(c.glow, 0.6, 1.3, c.s.glow, Math.sin(a) * r * 1.02, 1.3 + f * 2.6, Math.cos(a) * r * 1.02, a, 0.04);
    }
  }
  box(c.g, 1.2, 0.1, 1.2, trim, 0, 0.6, r + 0.4);
  archPanel(c.g, 1.1, 2.1, '#3a2a5a', 0, 0.6, r * 1.05, 0, 0.1, true);
  // A balcony ring near the top, then the spire and a floating crystal.
  cyl(c.g, r * 1.5, r * 1.3, 0.25, trim, 0, h - 1, 0, 16);
  for (let i = 0; i < 16; i++) cyl(c.g, 0.04, 0.04, 0.7, trim, Math.cos((i / 16) * Math.PI * 2) * r * 1.45, h - 0.75, Math.sin((i / 16) * Math.PI * 2) * r * 1.45, 4);
  cone(c.g, r * 1.2, r * 3.4, roof, 0, h + 0.6, 0, 16);
  c.glow.add(new THREE.OctahedronGeometry(0.5, 0).scale(1, 1.8, 1), '#b8a4ff', M(0, h + r * 3.4 + 2, 0));
  return { r: r * 1.5 + 0.6, h: h + r * 3.4 + 3 };
}

function skyPavilion(c: Ctx): Footprint {
  const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), trim = pick(c, c.s.trims), r = 3.6;
  surf(c, SURF.marble, () => { cyl(c.g, r + 0.6, r + 0.8, 0.5, wall, 0, 0, 0, 16); cyl(c.g, r + 0.3, r + 0.3, 0.3, trim, 0, 4.4, 0, 16); });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cyl(c.g, 0.2, 0.25, 3.9, wall, Math.cos(a) * r, 0.5, Math.sin(a) * r, 8);
    box(c.g, 0.5, 0.3, 0.5, trim, Math.cos(a) * r, 4.1, Math.sin(a) * r);
  }
  surf(c, SURF.marble, () => cyl(c.g, r * 0.7, r * 0.7, 3.9, wall, 0, 0.5, 0, 16));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; archPanel(c.glow, 0.8, 1.8, c.s.glow, Math.sin(a) * r * 0.71, 1.2, Math.cos(a) * r * 0.71, a, 0.04); }
  dome(c.g, r + 0.3, roof, 0, 4.7, 0, 16, 0.8);
  cone(c.g, 0.2, 1.6, trim, 0, 4.7 + (r + 0.3) * 0.8, 0, 6);
  sphere(c.glow, 0.3, '#fff0b0', 0, 4.7 + (r + 0.3) * 0.8 + 1.8, 0, 8);
  return { r: r + 1.2, h: 10 };
}

// ───────────────────────── the lands ─────────────────────────

type Fn = (c: Ctx) => Footprint;
/** Each land's houses and how often each kind appears. */
export const TRADITIONS: Partial<Record<string, Array<[Fn, number]>>> = {
  japan: [[machiya, 0.75], [minka, 0.25]],
  korea: [[hanok, 0.75], [choga, 0.25]],
  china: [[chineseHall, 0.55], [shophouse, 0.45]],
  islamic: [[riad, 1]],
  middleeast: [[gulfHouse, 1]],
  egypt: [[nubian, 1]],
  desert: [[bedouinTent, 0.6], [roundTent, 0.4]],
  indianorth: [[haveli, 1]],
  indiasouth: [[keralaHome, 1]],
  mughal: [[mughalPavilion, 1]],
  indonesia: [[bale, 0.55], [tongkonan, 0.45]],
  aurora: [[lavvu, 0.22], [igloo, 0.2], [glassIgloo, 0.14], [goahti, 0.14], [logCabin, 0.18], [glassCabin, 0.12]],
  skyisles: [[skySpire, 0.6], [skyPavilion, 0.4]],
};

/** What each house is called (its door carries it, so the room inside can be shaped like it). */
const HOUSE_KIND = new Map<Fn, string>([
  [machiya, 'machiya'], [minka, 'minka'], [hanok, 'hanok'], [choga, 'choga'], [chineseHall, 'siheyuan'], [shophouse, 'shop'],
  [riad, 'riad'], [gulfHouse, 'gulfhouse'], [nubian, 'nubian'], [bedouinTent, 'bedouintent'], [roundTent, 'roundtent'],
  [haveli, 'haveli'], [keralaHome, 'nalukettu'], [mughalPavilion, 'pavilion'], [bale, 'bale'], [tongkonan, 'tongkonan'],
  [lavvu, 'lavvu'], [igloo, 'igloo'], [glassIgloo, 'glassigloo'], [goahti, 'goahti'], [logCabin, 'logcabin'], [glassCabin, 'glasscabin'],
  [skySpire, 'skyspire'], [skyPavilion, 'skypavilion'],
]);

/** Build one of the land's traditional houses (null if the land has none here), named by its kind. */
export function buildTradition(c: Ctx): (Footprint & { kind?: string }) | null {
  const list = TRADITIONS[c.s.id];
  if (!list) return null;
  let k = c.rng.next();
  let fn = list[list.length - 1][0];
  for (const [f, share] of list) { if (k < share) { fn = f; break; } k -= share; }
  return { ...fn(c), kind: HOUSE_KIND.get(fn) };
}
