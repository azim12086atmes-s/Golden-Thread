import * as THREE from 'three';
import type { Ctx } from './architecture';
import { M, archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof } from './kit';
import { REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { CAVES } from './caves';
import { gateTowers } from './gulabi';
import { SQUARE_R, sebilsOf, squaresOf, type Collide } from './landWaters';
import { FIELD_SITES, FIELD_SIZE, PLOTS, PLOT_SIZE } from './plots';
import { reservedAt } from './reserved';
import { CASTLE_SITE, WATER_Y, terrainHeight } from './terrain';
import { waterEdge } from './waters';
import { INSTITUTE_SITES, SITE_SIZE } from '../institutions/sites';

/**
 * Each town's neighbourhood buildings (owner: "neighbourhood mosques / temples / churches, corner
 * shops, markets … let it not be generic"): a place of worship and a market, each in the land's own
 * tradition, standing beyond the ring road on the town's northern diagonals (clear of the plots,
 * squares and institute sites), their doors towards the town. Pure placement + building; the town
 * builder keeps the ground clear. No crosses (the owner's rule for the whole world): steeples carry a
 * weathervane or a golden ball.
 *
 * Local frame: centre at the origin, the entrance facing +z; everything within CIVIC_R.
 */
export const CIVIC_R = 12;

/** Is the ground at (x, z) (local to the land's centre) clear for a civic building? */
function civicClear(land: RegionId, x: number, z: number): boolean {
  const pad = CIVIC_R + 3, c = regionCenter(REGION_BY_ID[land]);
  if (Math.abs(x) < 9 + pad || Math.abs(z) < 9 + pad || Math.abs(Math.hypot(x, z) - 140) < 6 + pad) return false; // avenues, ring road
  if (reservedAt(land, x, z, pad)) return false;
  if (land === 'meadow' && Math.hypot(c.x + x - CASTLE_SITE.x, c.z + z - CASTLE_SITE.z) < CASTLE_SITE.r + 8 + pad) return false;
  if (land === 'indianorth' && gateTowers().some((q) => Math.hypot(x - q.x, z - q.z) < q.r + pad)) return false;
  if (squaresOf(land).some((q) => Math.hypot(x - q.x, z - q.z) < SQUARE_R + pad)) return false;
  if (sebilsOf(land).some((q) => Math.hypot(x - q.x, z - q.z) < 2 + pad)) return false;
  const inBox = (px: number, pz: number, half: number) => Math.abs(c.x + x - px) < half + pad && Math.abs(c.z + z - pz) < half + pad;
  if (FIELD_SITES.some((f) => f.land === land && inBox(f.x, f.z, FIELD_SIZE / 2))) return false;
  if (PLOTS.some((p) => p.region === land && inBox(p.x, p.z, PLOT_SIZE / 2))) return false;
  if (INSTITUTE_SITES.some((s) => s.land === land && inBox(s.x, s.z, SITE_SIZE / 2))) return false;
  if (CAVES.some((cv) => cv.land === land && Math.hypot(c.x + x - cv.x, c.z + z - cv.z) < cv.r + pad)) return false;
  // Dry, fairly level ground away from any river or lake.
  if (waterEdge(c.x + x, c.z + z).d < pad + 6) return false;
  let lo = Infinity, hi = -Infinity;
  for (let a = 0; a < 8; a++) for (const r of [0, CIVIC_R * 0.5, CIVIC_R]) {
    const h = terrainHeight(c.x + x + Math.cos(a * Math.PI / 4) * r, c.z + z + Math.sin(a * Math.PI / 4) * r);
    lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  return lo > WATER_Y + 0.6 && hi - lo < 3.5;
}

const civicCache = new Map<RegionId, Array<{ x: number; z: number; kind: 'worship' | 'market' }>>();

/**
 * Where the land's place of worship and market stand (local to its centre): searched outward from
 * the northern diagonals — beyond the ring road first, then just inside it — for dry, level ground
 * clear of the avenues, squares, plots, fields, institute sites, caves and landmark grounds.
 */
export function civicOf(land: RegionId): Array<{ x: number; z: number; kind: 'worship' | 'market' }> {
  const hit = civicCache.get(land);
  if (hit) return hit;
  const out: Array<{ x: number; z: number; kind: 'worship' | 'market' }> = [];
  if (land !== 'skyisles') {
    for (const [kind, a0] of [['worship', Math.PI / 4], ['market', Math.PI * 0.75]] as const) {
      search: for (const r of [165, 185, 205, 118, 225]) for (const da of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24]) {
        const x = Math.cos(a0 + da) * r, z = Math.sin(a0 + da) * r;
        if (!civicClear(land, x, z) || out.some((q) => Math.hypot(q.x - x, q.z - z) < CIVIC_R * 2 + 6)) continue;
        out.push({ x, z, kind });
        break search;
      }
    }
  }
  civicCache.set(land, out);
  return out;
}

const GOLD = '#d4af37', WHITE = '#fbf7ee', DARK = '#3a2a22';

/** A gold weathervane: a ball, an arrow and a little cockerel-less pennant on a rod. */
function weathervane(c: Ctx, x: number, y: number, z: number): void {
  cyl(c.g, 0.04, 0.04, 1.6, GOLD, x, y, z, 5);
  sphere(c.g, 0.2, GOLD, x, y + 0.5, z, 8);
  box(c.g, 1.2, 0.06, 0.06, GOLD, x, y + 1.2, z);
  c.g.add(new THREE.ConeGeometry(0.14, 0.3, 4).rotateZ(-Math.PI / 2), GOLD, M(x + 0.68, y + 1.23, z));
  box(c.g, 0.3, 0.24, 0.02, GOLD, x - 0.55, y + 1.23, z);
}
/** A crescent finial on its stack of gilt bulbs. */
function crescentFinial(c: Ctx, x: number, y: number, z: number, s = 1): void {
  cyl(c.g, 0.04 * s, 0.05 * s, 0.8 * s, GOLD, x, y, z, 5);
  for (let k = 0; k < 3; k++) sphere(c.g, (0.14 - k * 0.03) * s, GOLD, x, y + (0.2 + k * 0.22) * s, z, 8);
  c.g.add(new THREE.TorusGeometry(0.28 * s, 0.05 * s, 5, 14, Math.PI * 1.45), GOLD, M(x, y + 1.05 * s, z, 0, 1, 1, 1, 0, Math.PI * 0.275));
}
/** A lit arched window on a face (the plane z), in the glow builder. */
function lancet(c: Ctx, x: number, y: number, z: number, w: number, h: number, ry = 0, pointed = true): void {
  archPanel(c.glow, w, h, '#ffd9a0', x, y, z, ry, 0.05, pointed);
}

/** A neighbourhood mosque in the land's manner: its prayer hall, its minaret, a courtyard with an ablution fountain. */
function mosque(c: Ctx, style: 'maghreb' | 'gulf' | 'najdi' | 'mamluk' | 'mughal'): void {
  const g = c.g;
  const wall = style === 'najdi' ? '#c8a878' : style === 'mughal' ? '#b5552e' : style === 'mamluk' ? '#d8c8a8' : WHITE;
  // The courtyard (sahn) before the hall, walled, with a fountain for ablutions.
  box(g, 18, 0.2, 9, style === 'mughal' ? '#e8dcc6' : '#d8d0c0', 0, 0, 4.5);
  for (const s of [-1, 1]) box(g, 0.5, 2, 9, wall, s * 9, 0, 4.5);
  for (const s of [-1, 1]) box(g, 6.5, 2, 0.5, wall, s * 5.75, 0, 9);
  cyl(g, 1.3, 1.4, 0.6, WHITE, 0, 0.2, 4.5, 8); cyl(g, 1.2, 1.2, 0.05, '#4a9ab8', 0, 0.75, 4.5, 8); cyl(c.glow, 0.05, 0.08, 0.8, '#dff6ff', 0, 0.8, 4.5, 5);
  // The prayer hall: an arcade to the court, lit windows, its roof or domes.
  box(g, 16, 6, 8, wall, 0, 0, -4);
  if (style === 'mamluk') for (let k = 0; k < 8; k++) box(g, 16.05, 0.35, 8.05, k % 2 ? '#b5553e' : '#f2e8d8', 0, 0.4 + k * 0.7, -4); // ablaq stripes
  for (let i = 0; i < 5; i++) { const x = -6.4 + i * 3.2; archPanel(g, 2.2, 3.6, '#5a4a3a', x, 0.2, 0.02, 0, 0.06, style !== 'maghreb'); lancet(c, x, 4.2, 0.04, 0.9, 1.1, 0, style !== 'maghreb'); }
  if (style === 'maghreb') {
    hip(g, 16.6, 8.6, 2.2, '#2f8a5a', 0, 6, -4);
    for (let i = 0; i < 16; i++) box(g, 0.9, 0.3, 0.05, i % 2 ? '#2f8ab8' : '#f2d27a', -7.5 + i, 5.2, 0.02);
  } else if (style === 'najdi') {
    for (let i = 0; i < 16; i++) { box(g, 0.5, 0.5, 0.5, wall, -7.5 + i, 6, -0.2); g.add(new THREE.ConeGeometry(0.28, 0.5, 3), WHITE, M(-7.5 + i, 5.3, 0.03, 0, 1, 1, 0.2)); }
  } else if (style === 'mughal') {
    box(g, 16.4, 0.4, 8.4, WHITE, 0, 6, -4);
    for (const [x, r] of [[-5, 1.8], [0, 2.6], [5, 1.8]] as const) { cyl(g, r * 0.9, r * 0.9, 1, WHITE, x, 6.4, -4, 16); onion(g, r, WHITE, x, 7.4, -4); }
  } else {
    box(g, 16.4, 0.4, 8.4, style === 'gulf' ? '#e8e0d0' : '#c8b898', 0, 6, -4);
    cyl(g, 3.2, 3.2, 1.4, wall, 0, 6.4, -4, 16);
    dome(g, 3.1, style === 'gulf' ? '#e8e0d0' : '#c8b898', 0, 7.8, -4, 18);
    if (style === 'mamluk') for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.add(new THREE.TorusGeometry(3.1, 0.06, 3, 12, Math.PI / 2), '#a89878', M(0, 7.8, -4, a, 1, 1, 1, 0, 0)); }
    crescentFinial(c, 0, 10.9, -4, 1.2);
  }
  // The minaret at the court's front corner, in the land's form.
  const mx = 7.2, mz = 8.2;
  switch (style) {
    case 'maghreb': // A square tower faced with tile panels, a little lantern on top.
      box(g, 2.6, 13, 2.6, WHITE, mx, 0, mz);
      for (let k = 0; k < 3; k++) for (const [dx, dz, ry] of [[0, 1.32, 0], [1.32, 0, Math.PI / 2]] as const) { box(g, 1.6, 2.2, 0.04, '#2f8ab8', mx + dx, 3 + k * 3.2, mz + dz, ry); lancet(c, mx + dx * 1.01, 3.6 + k * 3.2, mz + dz * 1.01, 0.5, 0.9, ry, false); }
      for (let i = 0; i < 4; i++) box(g, 0.5, 0.5, 0.5, WHITE, mx - 1.05 + i * 0.7, 13, mz + 1.05);
      box(g, 1.2, 2.2, 1.2, WHITE, mx, 13, mz); hip(g, 1.5, 1.5, 0.8, '#2f8a5a', mx, 15.2, mz);
      crescentFinial(c, mx, 16, mz, 0.8); break;
    case 'gulf': // A round white shaft tapering, a balcony, a pointed cap.
      cyl(g, 0.9, 1.2, 13, WHITE, mx, 0, mz, 14);
      cyl(g, 1.7, 1.3, 0.5, WHITE, mx, 10, mz, 14); for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; box(g, 0.08, 0.7, 0.08, WHITE, mx + Math.cos(a) * 1.6, 10.5, mz + Math.sin(a) * 1.6); }
      cone(g, 1, 2.4, '#e8e0d0', mx, 13, mz, 14); crescentFinial(c, mx, 15.4, mz, 0.8); break;
    case 'najdi': // A tapering mud tower pierced with triangles.
      g.add(new THREE.CylinderGeometry(0.9, 1.6, 12, 4).rotateY(Math.PI / 4).translate(0, 6, 0), wall, M(mx, 0, mz));
      for (let k = 0; k < 4; k++) g.add(new THREE.ConeGeometry(0.2, 0.4, 3), DARK, M(mx, 4 + k * 2, mz + 1.2 - k * 0.12, 0, 1, 1, 0.2));
      box(g, 2, 0.5, 2, wall, mx, 12, mz); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cone(g, 0.3, 0.6, wall, mx + dx * 0.8, 12.5, mz + dz * 0.8, 4); break;
    case 'mamluk': // An octagonal shaft in stages, balconies on stalactite brackets, a bulb on top.
      cyl(g, 1.2, 1.3, 7, '#d8c8a8', mx, 0, mz, 8); for (let k = 0; k < 6; k++) cyl(g, 1.21, 1.21, 0.4, k % 2 ? '#b5553e' : '#f2e8d8', mx, 0.6 + k * 1.1, mz, 8);
      cyl(g, 1.7, 1.2, 0.5, '#d8c8a8', mx, 7, mz, 8); cyl(g, 0.9, 1, 4, '#d8c8a8', mx, 7.5, mz, 8);
      cyl(g, 1.3, 0.9, 0.4, '#d8c8a8', mx, 11.5, mz, 8); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(g, 0.06, 0.06, 1.2, '#d8c8a8', mx + Math.cos(a) * 0.7, 11.9, mz + Math.sin(a) * 0.7, 4); }
      box(g, 1.4, 0.2, 1.4, '#d8c8a8', mx, 13.1, mz); onion(g, 0.6, '#d8c8a8', mx, 13.3, mz); crescentFinial(c, mx, 14.6, mz, 0.6); break;
    case 'mughal': // Slender minarets with a chhatri at the top, one at each front corner.
      for (const s of [-1, 1]) { cyl(g, 0.7, 0.9, 12, '#b5552e', s * mx, 0, mz, 12); for (const y of [4, 8]) cyl(g, 1.1, 1.1, 0.3, WHITE, s * mx, y, mz, 12); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.06, 0.06, 1.3, WHITE, s * mx + dx * 0.5, 12, mz + dz * 0.5, 4); box(g, 1.4, 0.15, 1.4, WHITE, s * mx, 13.3, mz); onion(g, 0.55, WHITE, s * mx, 13.45, mz); } break;
  }
  box(c.glow, 0.3, 0.4, 0.3, '#ffcf7a', 0, 4.8, 9.3); // a lamp over the gate
}

/** A Hindu temple of the north: a platform, a mandapa with a stepped roof, a curving shikhara, its amalaka and kalasha, a saffron flag. */
function nagaraTemple(c: Ctx): void {
  const g = c.g, stone = '#e8b88a';
  box(g, 14, 1.2, 18, '#d8a878', 0, 0, 0);
  for (let i = 0; i < 4; i++) box(g, 4 - i * 0.4, 0.3, 0.8, '#d8a878', 0, i * 0.3, 9.4 + (3 - i) * 0.4);
  // The mandapa: pillars, a pyramid of receding roof-slabs.
  for (const [x, z] of [[-3, 1], [3, 1], [-3, 6], [3, 6], [-3, 3.5], [3, 3.5]] as const) cyl(g, 0.3, 0.32, 3.4, stone, x, 1.2, z, 8);
  for (let i = 0; i < 5; i++) box(g, 8 - i * 1.2, 0.5, 7 - i * 1.1, i % 2 ? '#d8a070' : stone, 0, 4.6 + i * 0.5, 3.5);
  cone(g, 0.2, 0.8, GOLD, 0, 7.1, 3.5, 6);
  // The sanctum and its shikhara: a curved tower of ribbed courses.
  box(g, 6, 4.2, 6, stone, 0, 1.2, -4);
  archPanel(c.glow, 1.2, 2, '#ffcf7a', 0, 1.3, -0.97, 0, 0.04, true);
  const prof: Array<[number, number]> = [[3.2, 0], [3.1, 2], [2.8, 4], [2.3, 6], [1.6, 7.6], [0.9, 8.6], [0.001, 9]];
  c.g.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 4).rotateY(Math.PI / 4), stone, M(0, 5.4, -4));
  for (let k = 0; k < 8; k++) c.g.add(new THREE.CylinderGeometry(3.15 - k * 0.3, 3.2 - k * 0.3, 0.12, 4).rotateY(Math.PI / 4), '#c88a5a', M(0, 5.6 + k * 1.05, -4));
  c.g.add(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 16), stone, M(0, 14.4, -4)); // the amalaka
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; sphere(g, 0.18, '#c88a5a', Math.cos(a) * 1.05, 14.65, -4 + Math.sin(a) * 1.05, 5); }
  cone(g, 0.3, 1, GOLD, 0, 14.9, -4, 8); sphere(g, 0.25, GOLD, 0, 15.3, -4, 8);
  cyl(g, 0.03, 0.03, 3, GOLD, 0.4, 14.9, -4, 3); c.g.add(new THREE.ConeGeometry(0.5, 1.4, 3).rotateZ(-Math.PI / 2), '#ff9a1f', M(1.1, 17.3, -4, 0, 1, 1, 0.1));
  for (let i = 0; i < 12; i++) sphere(c.glow, 0.05, '#ffb84a', -3 + (i % 6) * 1.2, 1.25, 8.6 + Math.floor(i / 6) * 0.4, 4); // diyas along the steps
}

/** A Dravidian shrine: a stepped vimana with its kalasha, a pillared mandapa, a small gopuram at the gate, a lamp pillar. */
function dravidaShrine(c: Ctx): void {
  const g = c.g, stone = '#c8b898';
  box(g, 14, 0.6, 20, '#a89878', 0, 0, 0);
  box(g, 6, 4, 6, stone, 0, 0.6, -5);
  for (let i = 0; i < 4; i++) { const w = 6.4 - i * 1.3; box(g, w, 1.1, w, i % 2 ? '#d8c8a8' : stone, 0, 4.6 + i * 1.1, -5); for (let k = 0; k < 4; k++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) sphere(g, 0.18, '#e8b84a', dx * (w / 2 - 0.3) + dz * (k - 1.5) * w * 0.2, 5.6 + i * 1.1, -5 + dz * (w / 2 - 0.3) + dx * (k - 1.5) * w * 0.2, 5); }
  dome(g, 1.4, '#e8b84a', 0, 9, -5, 8); cone(g, 0.25, 1, GOLD, 0, 10.3, -5, 6);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) cyl(g, 0.3, 0.3, 3.2, stone, s * 2.6, 0.6, -0.5 + i * 2.2, 8);
  box(g, 6.4, 0.5, 7, stone, 0, 3.8, 1.7);
  // The gopuram over the gate: storeys of painted niches narrowing to a barrel roof.
  box(g, 6, 3.2, 3, stone, 0, 0.6, 8.5); archPanel(g, 2, 2.6, DARK, 0, 0.6, 10.02, 0, 0.1);
  for (let i = 0; i < 3; i++) box(g, 5.6 - i * 1.1, 1.1, 2.6 - i * 0.3, ['#e8b84a', '#c8483a', '#3a8ab8'][i], 0, 3.8 + i * 1.1, 8.5);
  c.g.add(new THREE.CylinderGeometry(0.7, 0.7, 2.6, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), '#c8483a', M(0, 7.1, 8.5));
  for (let k = 0; k < 3; k++) cone(g, 0.12, 0.5, GOLD, -0.8 + k * 0.8, 7.7, 8.5, 6);
  cyl(g, 0.3, 0.35, 4.5, stone, 3.5, 0.6, 6, 8); cyl(g, 0.5, 0.3, 0.2, GOLD, 3.5, 5.1, 6, 8); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cone(c.glow, 0.04, 0.14, '#ffb84a', 3.5 + Math.cos(a) * 0.4, 5.3, 6 + Math.sin(a) * 0.4, 4); }
}

/** A Balinese pura: a split gate, a walled court, three meru towers of thatched tiers, a bale pavilion. */
function pura(c: Ctx): void {
  const g = c.g, brick = '#a8584a', stone = '#8a8478';
  for (const s of [-1, 1]) { box(g, 0.6, 1.8, 18, brick, s * 9, 0, 0); box(g, 7, 1.8, 0.6, brick, s * 5.5, 0, 9); box(g, 18.6, 1.8, 0.6, brick, 0, 0, -9); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) box(g, 2.2 - i * 0.3, 1, 1.8 - i * 0.2, i % 2 ? brick : stone, s * (1.8 + 1.1 - i * 0.15), i, 9);
  for (const [x, tiers] of [[-5, 11], [0, 9], [5, 7]] as const) {
    box(g, 2.6, 1.4, 2.6, stone, x, 0, -5); box(g, 1.6, 1.4, 1.6, brick, x, 1.4, -5);
    for (let i = 0; i < tiers; i++) { const w = 3 - i * (2 / tiers); hip(g, w, w, 0.55, '#3a2e24', x, 2.8 + i * 0.85, -5); }
    cyl(g, 0.04, 0.08, 0.6, GOLD, x, 2.8 + tiers * 0.85 + 0.3, -5, 5);
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.24, 2.4, 0.24, '#5a3a22', 4 + dx * 1.8, 0.4, 3 + dz * 1.8);
  box(g, 4.4, 0.4, 4.4, stone, 4, 0, 3); cone(g, 3.4, 1.4, '#3a2e24', 4, 2.8, 3, 4, Math.PI / 4);
  for (let i = 0; i < 4; i++) box(g, 0.5, 0.8, 0.05, i % 2 ? '#ffffff' : '#2a2a2a', -5 + i * 0.6, 0.5, 8.66); // a poleng-cloth checkered wrap on the gate
  sphere(c.glow, 0.2, '#ffb86a', 4, 2.5, 3, 6);
}

/** A Shinto shrine: a torii, a stone path, a purification basin, a haiden with a sweeping nagare roof, a rope and paper streamers. */
function shrine(c: Ctx): void {
  const g = c.g, red = '#d8342a';
  for (const s of [-1, 1]) cyl(g, 0.25, 0.28, 5, red, s * 2.2, 0, 10.5, 10);
  g.add(new THREE.BoxGeometry(6.6, 0.4, 0.5), '#2a2a2a', M(0, 5.1, 10.5, 0, 1, 1, 1, 0, 0));
  box(g, 5.4, 0.3, 0.3, red, 0, 4.2, 10.5);
  for (let i = 0; i < 8; i++) box(g, 1, 0.08, 0.9, '#9a948a', 0, 0.02, 8.5 - i * 1.3);
  box(g, 1.4, 0.8, 0.8, '#8a847a', -3, 0, 5); box(g, 1.2, 0.05, 0.6, '#4a9ab8', -3, 0.8, 5); cyl(g, 0.04, 0.04, 1.2, '#c8a86a', -3.6, 0.8, 5, 4);
  // The haiden, raised on posts, its long front eave sweeping down (nagare-zukuri).
  box(g, 8, 0.6, 6, '#6b4a2a', 0, 0.6, -2);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) for (const z of [-4.8, 0.8]) cyl(g, 0.15, 0.15, 3.2, red, x, 1.2, z, 8);
  box(g, 7.6, 2.4, 5, '#f4efe4', 0, 1.2, -2.6);
  c.g.add(new THREE.BoxGeometry(9.6, 0.25, 4.6), '#3a3a44', M(0, 4.9, -0.1, 0, 1, 1, 1, 0.42, 0));
  c.g.add(new THREE.BoxGeometry(9.6, 0.25, 3.6), '#3a3a44', M(0, 4.9, -4.2, 0, 1, 1, 1, -0.55, 0));
  box(g, 9.8, 0.3, 0.3, '#3a3a44', 0, 5.6, -2.3);
  for (let i = 0; i < 4; i++) box(g, 0.25, 0.25, 0.9, GOLD, -3 + i * 2, 5.9, -2.3); // katsuogi logs on the ridge
  const rope: THREE.Vector3[] = []; for (let i = 0; i <= 10; i++) { const u = i / 10; rope.push(new THREE.Vector3(-3.4 + u * 6.8, 3.6 - Math.sin(u * Math.PI) * 0.4, 1)); }
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rope), 16, 0.12, 5), '#e8d8a0');
  for (let i = 0; i < 5; i++) box(g, 0.2, 0.6, 0.02, '#ffffff', -2.6 + i * 1.3, 2.9, 1.05);
  for (const s of [-1, 1]) { box(g, 0.5, 1, 0.5, '#9a948a', s * 3, 0, 6.5); box(c.glow, 0.4, 0.4, 0.4, '#ffcf7a', s * 3, 1, 6.5); hip(g, 0.9, 0.9, 0.4, '#8a847a', s * 3, 1.4, 6.5); }
}

/** A Korean temple hall with painted eaves, a small stone pagoda before it, a bell pavilion. */
function koreanTemple(c: Ctx): void {
  const g = c.g;
  box(g, 12, 1, 8, '#a8a498', 0, 0, -3);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-6, 0]) cyl(g, 0.22, 0.24, 3.4, '#9a2f2a', x, 1, z, 10);
  box(g, 10, 3, 5.4, '#e8dcc0', 0, 1, -3);
  for (const [y, col] of [[4.1, '#2f8a5a'], [4.35, '#3a6aa8'], [4.6, '#c23b2a']] as const) box(g, 10.6, 0.25, 6.6, col, 0, y, -3);
  sweptRoof(g, 13.4, 9.4, 2.4, '#4a4a52', 0, 4.85, -3, 0, 0.55);
  archPanel(c.glow, 1.4, 1.8, '#ffcf7a', 0, 1.3, 0.02, 0, 0.04, false);
  // A three-storey stone pagoda before the hall.
  box(g, 2.2, 0.8, 2.2, '#a8a498', 0, 0, 5); for (let i = 0; i < 3; i++) { box(g, 1.4 - i * 0.2, 0.9, 1.4 - i * 0.2, '#b8b4a8', 0, 0.8 + i * 1.2, 5); box(g, 2 - i * 0.3, 0.25, 2 - i * 0.3, '#a8a498', 0, 1.7 + i * 1.2, 5); }
  cone(g, 0.2, 0.8, '#a8a498', 0, 4.4, 5, 6);
  // The bell pavilion.
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.15, 0.15, 3, '#9a2f2a', -7 + dx * 1.3, 0, 5 + dz * 1.3, 8);
  sweptRoof(g, 4, 4, 1.4, '#4a4a52', -7, 3, 5, 0, 0.55);
  c.g.add(new THREE.LatheGeometry([[0.001, 0], [0.8, 0], [0.7, 0.5], [0.6, 1.3], [0.4, 1.6], [0.001, 1.7]].map(([a, b]) => new THREE.Vector2(a, b)), 14), '#6a5a3a', M(-7, 1, 5));
}

/** A Chinese temple: a red hall on a terrace, a bronze incense burner smoking before it, a small pagoda beside. */
function chineseTemple(c: Ctx): void {
  const g = c.g;
  box(g, 13, 1.2, 9, '#b8b0a0', 0, 0, -3);
  for (const x of [-4.8, -1.6, 1.6, 4.8]) cyl(g, 0.24, 0.26, 3.6, '#b0322a', x, 1.2, 0.8, 10);
  box(g, 11, 3.6, 6, '#b0322a', 0, 1.2, -3.5);
  box(g, 12, 0.5, 8, '#2f5a9a', 0, 4.8, -3);
  sweptRoof(g, 14.6, 10.4, 1.8, '#e8b84a', 0, 5.3, -3, 0, 0.6);
  sweptRoof(g, 10, 7, 1.6, '#e8b84a', 0, 6.9, -3, 0, 0.6);
  box(g, 3, 0.9, 0.1, '#2f4a8a', 0, 3.9, 0.95); for (let i = 0; i < 4; i++) box(g, 0.25, 0.5, 0.03, GOLD, -1 + i * 0.66, 4.1, 1.02);
  for (const s of [-1, 1]) sphere(c.glow, 0.35, '#ff3a2a', s * 3.2, 3.2, 1.2, 8, 1.2);
  // The incense burner: a three-legged bronze ding, smoke curling up.
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; cyl(g, 0.08, 0.1, 0.6, '#6a5a3a', Math.cos(a) * 0.5, 0, 5 + Math.sin(a) * 0.5, 5); }
  cyl(g, 0.8, 0.6, 0.8, '#6a5a3a', 0, 0.6, 5, 12); cyl(c.glow, 0.5, 0.5, 0.05, '#ff9a4a', 0, 1.4, 5, 10);
  for (let i = 0; i < 5; i++) sphere(g, 0.25 + i * 0.08, '#e8e8ea', Math.sin(i) * 0.3, 1.8 + i * 0.5, 5, 6);
  // A small pagoda.
  for (let i = 0; i < 5; i++) { box(g, 2 - i * 0.28, 1.4, 2 - i * 0.28, '#e8dcc6', 7, i * 1.9, 3); sweptRoof(g, 3.2 - i * 0.4, 3.2 - i * 0.4, 0.5, '#e8b84a', 7, 1.4 + i * 1.9, 3, 0, 0.5); }
  cone(g, 0.15, 1, GOLD, 7, 9.5, 3, 6);
}

/** A chapel with a steeple, each in its land's manner (a weathervane or a golden ball at the top, no cross). */
function chapel(c: Ctx, style: 'gothic' | 'stave' | 'alpine' | 'romanesque' | 'meeting' | 'arctic'): void {
  const g = c.g;
  const wall = { gothic: '#b8ad98', stave: '#f4f4f0', alpine: '#fbf7ee', romanesque: '#e8d8b8', meeting: '#fbfbf8', arctic: '#8a6444' }[style];
  const roof = { gothic: '#4a4a52', stave: '#3a2418', alpine: '#8a5a3a', romanesque: '#b5654a', meeting: '#4a4a52', arctic: '#6a4a30' }[style];
  if (style === 'arctic') {
    // An A-frame of timber on a log sill, its front gable glazed, a little bell-cot, snow on the ridge.
    box(g, 8.6, 1, 12.4, '#6a4a30', 0, 0, -1);
    for (let y = 0.2; y < 1; y += 0.25) box(g, 8.8, 0.18, 12.6, '#8a6444', 0, y, -1); // the logs of the sill
    gable(g, 12, 8.6, 8, roof, 0, 1, -1, Math.PI / 2);
    for (let z = -6.5; z <= 4.5; z += 1.1) for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(0.12, 8.6, 0.14), '#4a3222', M(s * 2.2, 5, z, 0, 1, 1, 1, 0, s * 0.49)); // the rafters proud of the roof
    // The glazed gable: pale ice-blue glass in timber mullions, one lit arch at the door.
    const tri = new THREE.Shape([new THREE.Vector2(-4.2, 0), new THREE.Vector2(4.2, 0), new THREE.Vector2(0, 7.8)]);
    g.add(new THREE.ShapeGeometry(tri), '#a8c8d8', M(0, 1, 5.02));
    for (const x of [-2.1, 0, 2.1]) box(g, 0.14, 7.8 * (1 - Math.abs(x) / 4.2), 0.1, '#4a3222', x, 1, 5.06);
    for (const y of [2.6, 4.6]) box(g, 8.4 * (1 - (y - 1) / 7.8), 0.14, 0.1, '#4a3222', 0, y, 5.06);
    archPanel(c.glow, 1.6, 2.4, '#ffd9a0', 0, 1, 5.1, 0, 0.05, true);
    box(g, 0.5, 0.3, 12.2, '#f4f8ff', 0, 8.8, -1); // snow along the ridge
    box(g, 1.2, 1.4, 1.2, roof, 0, 8.6, -5.6); cone(g, 0.9, 1, '#f4f8ff', 0, 10, -5.6, 4, Math.PI / 4); sphere(g, 0.2, GOLD, 0, 11.1, -5.6, 8);
    sphere(g, 0.3, '#b08a3a', 0, 9, -5.6, 8); // the bell
    return;
  }
  // The nave: walls, lit windows down each side, a steep roof.
  box(g, 7, 6, 13, wall, 0, 0, -1.5);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) lancet(c, s * 3.52, 2, -6 + i * 3, 0.9, style === 'gothic' ? 2.6 : 1.8, s * Math.PI / 2, style === 'gothic');
  gable(g, 13.6, 7.8, style === 'alpine' || style === 'romanesque' ? 2.4 : 3.6, roof, 0, 6, -1.5, Math.PI / 2);
  if (style === 'gothic') for (let i = 0; i < 5; i++) for (const s of [-1, 1]) box(g, 0.6, 5, 0.9, '#a89a84', s * 3.8, 0, -7 + i * 3);
  if (style === 'romanesque') { c.g.add(new THREE.CylinderGeometry(3.4, 3.4, 5, 16, 1, false, Math.PI / 2, Math.PI), wall, M(0, 2.5, -8)); dome(g, 3.4, roof, 0, 5, -8, 12, 0.6); }
  if (style === 'stave') for (let x = -3.4; x <= 3.4; x += 0.5) box(g, 0.06, 6, 0.04, '#e0e0da', x, 0, 5.02);
  // The front: a door, a round or pointed window above.
  archPanel(g, 1.8, 3, DARK, 0, 0, 5.02, 0, 0.1, style === 'gothic' || style === 'stave');
  if (style === 'romanesque') { c.glow.add(new THREE.CircleGeometry(1, 16), '#ffc4dc', M(0, 4.6, 5.05)); c.g.add(new THREE.TorusGeometry(1.05, 0.1, 4, 16), '#c8b898', M(0, 4.6, 5.08)); }
  // The steeple.
  switch (style) {
    case 'gothic': box(g, 3.4, 11, 3.4, wall, 0, 0, 6.2); lancet(c, 0, 7, 7.92, 1, 2.4); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cone(g, 0.35, 2, wall, dx * 1.6, 11, 6.2 + dz * 1.6, 4); cone(g, 2.2, 8, roof, 0, 11, 6.2, 8); weathervane(c, 0, 19, 6.2); break;
    case 'stave': box(g, 2.6, 3.4, 2.6, wall, 0, 6, 3.2); cone(g, 2, 6, roof, 0, 9.4, 3.2, 8); weathervane(c, 0, 15.4, 3.2); break;
    case 'alpine': box(g, 3, 10, 3, wall, 0, 0, 6); c.glow.add(new THREE.CircleGeometry(0.7, 16), '#fff4d0', M(0, 8, 7.52)); c.g.add(new THREE.TorusGeometry(0.72, 0.08, 4, 16), GOLD, M(0, 8, 7.54)); onion(g, 1.6, '#3a4a3a', 0, 10, 6, GOLD); weathervane(c, 0, 13.7, 6); break;
    case 'romanesque': box(g, 3.2, 14, 3.2, wall, 5.2, 0, 3); for (const y of [8, 11]) for (const [dx, dz, ry] of [[0, 1.62, 0], [1.62, 0, Math.PI / 2]] as const) { archPanel(g, 0.8, 1.6, DARK, 5.2 + dx, y, 3 + dz, ry, 0.05); } cone(g, 2.4, 1.6, roof, 5.2, 14, 3, 4, Math.PI / 4); sphere(g, 0.25, GOLD, 5.2, 15.8, 3, 8); break;
    case 'meeting':
      for (const x of [-2.4, -0.8, 0.8, 2.4]) cyl(g, 0.22, 0.24, 5.6, WHITE, x, 0, 6.8, 10);
      gable(g, 2.6, 7.2, 1.6, WHITE, 0, 5.6, 6, Math.PI / 2);
      for (let i = 0; i < 3; i++) box(g, 2.6 - i * 0.6, 2.2, 2.6 - i * 0.6, WHITE, 0, 6 + i * 2.2, 3.5);
      cone(g, 0.8, 5, WHITE, 0, 12.6, 3.5, 8); weathervane(c, 0, 17.6, 3.5); break;
  }
}

/** The meadow's gathering pavilion: an open ring of posts twined with flowers under a dome of blossom. */
function meadowPavilion(c: Ctx): void {
  const g = c.g;
  cyl(g, 6, 6.3, 0.5, '#f6e9ef', 0, 0, 0, 24);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; cyl(g, 0.18, 0.2, 4.2, '#fbf1f4', Math.cos(a) * 5.2, 0.5, Math.sin(a) * 5.2, 8); for (let q = 0; q < 6; q++) sphere(g, 0.18, ['#ff8fb8', '#ffd24a', '#b8ff9a'][q % 3], Math.cos(a + q * 0.3) * 5.35, 1 + q * 0.6, Math.sin(a + q * 0.3) * 5.35, 5); }
  cyl(g, 5.8, 5.8, 0.4, '#f49ac1', 0, 4.7, 0, 24);
  dome(g, 5.4, '#ffc4dc', 0, 5.1, 0, 20, 0.7);
  for (let k = 0; k < 40; k++) { const a = k * 2.4, t = (k % 7) / 7; sphere(g, 0.3, ['#ff8fb8', '#ffffff', '#ffd24a', '#c9a0ff'][k % 4], Math.cos(a) * 5.2 * Math.cos(t), 5.2 + Math.sin(t) * 3.6, Math.sin(a) * 5.2 * Math.cos(t), 6); }
  sphere(g, 0.4, GOLD, 0, 9.1, 0, 8);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; sphere(c.glow, 0.1, '#fff4c0', Math.cos(a) * 4.8, 4.4, Math.sin(a) * 4.8, 5); }
}

/** New Yonder's community hall: a glass pavilion under a green roof of solar panels and plants. */
function communityHall(c: Ctx): void {
  const g = c.g;
  box(g, 16, 0.3, 12, '#c8d0d8', 0, 0, -1);
  for (let x = -7.5; x <= 7.5; x += 2.5) for (const z of [-6.5, 4.5]) box(g, 0.2, 5, 0.2, '#6a7a88', x, 0.3, z);
  for (const z of [-6.5, 4.5]) { box(g, 15, 4.4, 0.05, '#9ec4d6', 0, 0.5, z); box(c.glow, 15, 0.08, 0.06, '#cfe8f4', 0, 4.8, z); } // glass walls, a line of light under the eave
  box(g, 17, 0.5, 13, '#5a8a4a', 0, 5.3, -1);
  for (let i = 0; i < 12; i++) g.add(new THREE.BoxGeometry(2, 0.08, 1.4), '#2a3a6a', M(-6 + (i % 6) * 2.4, 6, -4 + Math.floor(i / 6) * 5, 0, 1, 1, 1, 0.3, 0));
  for (let i = 0; i < 10; i++) sphere(g, 0.5, '#4f9a4a', -7 + i * 1.6, 5.9, 1.5, 6);
}

const WORSHIP: Record<RegionId, (c: Ctx) => void> = {
  islamic: (c) => mosque(c, 'maghreb'), middleeast: (c) => mosque(c, 'gulf'), desert: (c) => mosque(c, 'najdi'), egypt: (c) => mosque(c, 'mamluk'), mughal: (c) => mosque(c, 'mughal'),
  indianorth: nagaraTemple, indiasouth: dravidaShrine, indonesia: pura, japan: shrine, korea: koreanTemple, china: chineseTemple,
  london: (c) => chapel(c, 'gothic'), norway: (c) => chapel(c, 'stave'), switzerland: (c) => chapel(c, 'alpine'), renaissance: (c) => chapel(c, 'romanesque'), vintage: (c) => chapel(c, 'meeting'), aurora: (c) => chapel(c, 'arctic'),
  meadow: meadowPavilion, newyork: communityHall, skyisles: () => undefined,
};

/** Build the land's place of worship (or gathering hall) at the origin, entrance +z. */
export function buildWorship(c: Ctx): void {
  WORSHIP[c.s.id](c);
}

// ─────────────────────────── the markets ───────────────────────────

/** A market stall: a counter of goods under the land's own kind of cover. */
function stall(c: Ctx, x: number, z: number, ry: number, cover: 'awning' | 'tarp' | 'lantern' | 'canopy' | 'hut' | 'tent', cols: string[], k: number): void {
  const g = c.g, col = cols[k % cols.length];
  c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => {
    box(g, 2.6, 0.9, 1.1, '#8a5a36', 0, 0, 0);
    for (let i = 0; i < 6; i++) sphere(g, 0.16, cols[(k + i + 1) % cols.length], -1 + i * 0.4, 1.02, (i % 2) * 0.3 - 0.15, 6);
    switch (cover) {
      case 'awning': for (const s of [-1, 1]) cyl(g, 0.04, 0.04, 2.4, '#3a3a3a', s * 1.25, 0, -0.5, 4); for (let i = 0; i < 6; i++) g.add(new THREE.BoxGeometry(0.46, 0.05, 1.8), i % 2 ? col : '#ffffff', M(-1.15 + i * 0.46, 2.3, 0.2, 0, 1, 1, 1, 0.3, 0)); break;
      case 'tarp': for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.04, 0.04, 2.2, '#6a6a6a', a * 1.3, 0, b * 0.8, 4); box(g, 3, 0.06, 2.1, col, 0, 2.2, 0); break;
      case 'lantern': for (const s of [-1, 1]) cyl(g, 0.05, 0.05, 2.4, '#b0322a', s * 1.3, 0, -0.5, 5); box(g, 2.9, 0.1, 0.1, '#b0322a', 0, 2.4, -0.5); for (let i = 0; i < 3; i++) sphere(c.glow, 0.2, '#ff3a2a', -0.9 + i * 0.9, 2.05, -0.5, 8, 1.2); sweptRoof(g, 3.2, 1.6, 0.5, '#4a4a52', 0, 2.5, -0.3, 0, 0.5); break;
      case 'canopy': for (const s of [-1, 1]) cyl(g, 0.04, 0.05, 2.4, '#8a6a3a', s * 1.3, 0, 0, 4); c.g.add(new THREE.ConeGeometry(1.9, 0.7, 4).rotateY(Math.PI / 4), col, M(0, 2.6, 0, 0, 1, 1, 0.6)); for (let i = 0; i < 8; i++) sphere(g, 0.05, cols[(i + k) % cols.length], -1.2 + i * 0.34, 2.2, 0.75, 4); break;
      case 'hut': box(g, 2.8, 2.2, 1.6, '#8a6444', 0, 0, -0.6); gable(g, 3.2, 2.2, 1, '#6a4a30', 0, 2.2, -0.4); box(g, 2.9, 0.12, 0.5, '#f4f8ff', 0, 3.1, -0.4); for (let i = 0; i < 6; i++) sphere(c.glow, 0.06, ['#ffe98a', '#ff8a8a', '#8ac8ff'][i % 3], -1.3 + i * 0.52, 2.1, 0.3, 4); break;
      case 'tent': c.g.add(new THREE.ConeGeometry(2.1, 1.6, 4).rotateY(Math.PI / 4), '#2a2622', M(0, 1.8, -0.2, 0, 1, 1, 0.7)); for (const s of [-1, 1]) cyl(g, 0.04, 0.04, 1.9, '#7a5a3a', s * 1.3, 0, 0.5, 4); box(g, 2, 0.02, 1.4, col, 0, 0.01, 1.3); break;
    }
  }));
}

/** Two rows of stalls facing each other down an aisle along z, n a side. */
function stallRows(c: Ctx, n: number, gap: number, cover: Parameters<typeof stall>[4], cols: string[]): void {
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) stall(c, s * gap, -6 + i * 3.2, s > 0 ? -Math.PI / 2 : Math.PI / 2, cover, cols, i * 2 + (s > 0 ? 1 : 0));
}

type MarketFn = (c: Ctx) => void;
const MARKET: Record<RegionId, MarketFn> = {
  // A covered market of iron and glass (Covent Garden): arched roofs on slender columns, stalls within.
  london(c) {
    const g = c.g;
    for (let x = -6; x <= 6; x += 3) for (const z of [-8, 8]) cyl(g, 0.12, 0.14, 5, '#2a3a2e', x, 0, z, 8);
    for (let z = -8; z <= 8; z += 2) c.g.add(new THREE.TorusGeometry(6, 0.08, 4, 20, Math.PI), '#2a3a2e', M(0, 5, z));
    c.g.add(new THREE.CylinderGeometry(6, 6, 16, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), '#cfe0e8', M(0, 5, 0));
    stallRows(c, 5, 3, 'awning', ['#c8202a', '#2f5a9a', '#3a7a4a', '#e8b84a']);
  },
  // A market loggia: an open hall of arches on columns under a tiled roof.
  renaissance(c) {
    const g = c.g;
    box(g, 16, 0.3, 12, '#b8a888', 0, 0, 0);
    for (const x of [-6, -2, 2, 6]) for (const z of [-5, 5]) { cyl(g, 0.3, 0.34, 5, '#c8b898', x, 0.3, z, 12); }
    for (const z of [-5, 5]) for (let i = 0; i < 3; i++) c.g.add(new THREE.TorusGeometry(2, 0.3, 5, 14, Math.PI), '#c8b898', M(-4 + i * 4, 5.3, z));
    box(g, 16.4, 1.4, 11.4, '#c8b898', 0, 7.2, 0); c.g.add(new THREE.ConeGeometry(11, 2.6, 4).rotateY(Math.PI / 4), '#b5654a', M(0, 9.9, 0, 0, 1, 1, 0.72));
    stallRows(c, 4, 2.6, 'tarp', ['#b5552e', '#e2b43a', '#2f4a8a', '#2f7a5a']);
  },
  // An alpine farmers' market: timber stalls with red-and-white awnings round a column fountain.
  switzerland(c) { stallRows(c, 4, 4, 'awning', ['#c8202a']); cyl(c.g, 1.6, 1.7, 0.8, '#a8a498', 0, 0, 0, 8); cyl(c.g, 0.25, 0.3, 3.4, '#a8a498', 0, 0.8, 0, 8); sphere(c.g, 0.4, '#c8202a', 0, 4.4, 0, 8); },
  // A fish market on a wharf: a long red board shed, crates of fish, nets drying.
  norway(c) {
    const g = c.g;
    box(g, 14, 4, 6, '#a8322a', 0, 0, -4); gable(g, 14.6, 7, 2, '#3a3a3a', 0, 4, -4);
    for (let i = 0; i < 10; i++) box(g, 0.8, 0.4, 0.6, '#8a6a4a', -5 + (i % 5) * 1.3, Math.floor(i / 5) * 0.4, 1); for (let i = 0; i < 5; i++) sphere(g, 0.18, '#c8d0d8', -5 + i * 1.3, 0.9, 1, 5);
    for (const x of [-3, 3]) { cyl(g, 0.05, 0.05, 2.6, '#6b4a2a', x, 0, 4, 4); } box(g, 6, 1.6, 0.02, '#4a6a5a', 0, 0.9, 4);
    sphere(c.glow, 0.2, '#ffcf7a', 0, 3.4, -0.9, 6);
  },
  // A corner diner and general store, chrome and neon.
  vintage(c) {
    const g = c.g;
    box(g, 10, 3.4, 6, '#c8d0d8', -2, 0, -3); c.g.add(new THREE.CylinderGeometry(3, 3, 10, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), '#c8d0d8', M(-2, 3.4, -3, 0, 1, 0.5, 1));
    box(c.glow, 8, 1.2, 0.05, '#fff0d0', -2, 1.3, 0.02); box(g, 10.2, 0.4, 0.2, '#ff5a8a', -2, 2.8, 0.1);
    box(c.glow, 4, 0.8, 0.1, '#ff5a8a', -2, 4.8, -3); box(g, 4.4, 1.2, 0.2, '#2a2a30', -2, 4.6, -3.1);
    box(g, 5, 4, 5, '#b83a2a', 6, 0, -4); gable(g, 5.4, 5.4, 1.4, '#4a3a3a', 6, 4, -4); box(c.glow, 3, 1.4, 0.05, '#ffe2a0', 6, 1, -1.47); stall(c, 6, 1, 0, 'awning', ['#ff8fb8', '#b3e6ff'], 0);
  },
  // A food-truck plaza under strings of lights.
  newyork(c) {
    const g = c.g, cols = ['#ff4ad0', '#4ad8ff', '#b8ff4a', '#ffe04a'];
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4, x = Math.cos(a) * 6.5, z = Math.sin(a) * 6.5; c.g.frame(x, 0, z, -a + Math.PI / 2, 1, () => c.glow.frame(x, 0, z, -a + Math.PI / 2, 1, () => { box(g, 5, 2.4, 2.2, cols[i], 0, 0.5, 0); box(g, 1.6, 1.8, 2.1, '#e8e8ea', 2.4, 0.5, 0); box(c.glow, 2.6, 0.9, 0.05, '#fff4d0', -0.6, 1.5, 1.12); box(g, 3, 0.1, 0.8, '#e8e8ea', -0.6, 2.2, 1.5); for (const x2 of [-1.6, 1.6]) cyl(g, 0.4, 0.4, 0.3, '#2a2a2e', x2, 0.3, 1.1, 10); })); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; sphere(c.glow, 0.09, cols[i % 4], Math.cos(a) * 4, 4.5 - Math.sin(i) * 0.3, Math.sin(a) * 4, 5); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; cyl(g, 0.08, 0.08, 4.6, '#3a3a44', Math.cos(a) * 4, 0, Math.sin(a) * 4, 5); }
    for (let i = 0; i < 4; i++) { box(g, 1.6, 0.8, 0.8, '#e8e8ea', -1.6 + (i % 2) * 3.2, 0, -1 + Math.floor(i / 2) * 2); }
  },
  // A flower market of toadstool stalls, buckets of blooms everywhere.
  meadow(c) {
    const g = c.g, cols = ['#ff8fb8', '#ffd24a', '#8fd0ff', '#c9a0ff', '#ffffff'];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, x = Math.cos(a) * 7, z = Math.sin(a) * 7; cyl(g, 0.3, 0.4, 2.2, '#f4efe4', x, 0, z, 10); c.g.add(new THREE.SphereGeometry(1.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), i % 2 ? '#ff5a7a' : '#ff8fb8', M(x, 2.2, z)); for (let k = 0; k < 5; k++) sphere(g, 0.14, '#ffffff', x + Math.cos(k * 1.3) * 1.1, 2.9, z + Math.sin(k * 1.3) * 1.1, 5); for (let k = 0; k < 4; k++) { cyl(g, 0.22, 0.18, 0.4, '#8ab8d8', x + Math.cos(a + k) * 1.2, 0, z + Math.sin(a + k) * 1.2, 8); for (let f = 0; f < 5; f++) sphere(g, 0.1, cols[(i + k + f) % 5], x + Math.cos(a + k) * 1.2 + Math.cos(f) * 0.12, 0.55, z + Math.sin(a + k) * 1.2 + Math.sin(f) * 0.12, 4); } }
  },
  // A winter market: little timber huts glowing, snow on their roofs, a tree of lights in the middle.
  aurora(c) { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; stall(c, Math.cos(a) * 7, Math.sin(a) * 7, -a - Math.PI / 2, 'hut', ['#8a6444'], i); } cone(c.g, 1.6, 5, '#2f5a3a', 0, 0, 0, 10); for (let i = 0; i < 14; i++) sphere(c.glow, 0.08, ['#ffe98a', '#ff8a8a', '#8ac8ff'][i % 3], Math.cos(i * 2.4) * (1.4 - i * 0.08), 0.5 + i * 0.32, Math.sin(i * 2.4) * (1.4 - i * 0.08), 5); },
  // A shōtengai: a covered shopping street, shop fronts with noren, lanterns under the roof.
  japan(c) {
    const g = c.g;
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const z = -8 + i * 4; box(g, 3, 3.4, 3.8, i % 2 ? '#e8dcc0' : '#d8ccb0', s * 5.5, 0, z); box(c.glow, 0.05, 1.4, 2.6, '#fff0d0', s * 3.98, 0.6, z); for (let k = 0; k < 3; k++) box(g, 0.03, 0.9, 0.8, ['#2a3a6a', '#8a2a2a', '#3a5a3a'][(i + k) % 3], s * 3.95, 1.9, z - 0.85 + k * 0.85); }
    for (let z = -9; z <= 9; z += 2) { c.g.add(new THREE.TorusGeometry(4.5, 0.06, 3, 16, Math.PI), '#6a6a72', M(0, 3.8, z)); }
    c.g.add(new THREE.CylinderGeometry(4.5, 4.5, 19, 16, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), '#e8f0f4', M(0, 3.8, 0));
    for (let z = -8; z <= 8; z += 4) sphere(c.glow, 0.25, '#ffcf8a', 0, 3.4, z, 8, 1.3);
  },
  korea(c) { stallRows(c, 5, 2.6, 'tarp', ['#2f6ab8', '#2f8a5a', '#e8b84a', '#c8483a']); for (let i = 0; i < 6; i++) cyl(c.g, 0.4, 0.35, 0.7, '#6a4a3a', 5, 0, -6 + i * 2.2, 10);
    // The market gate over the aisle: two posts and a long signboard, a string of lamps beneath.
    for (const s of [-1, 1]) cyl(c.g, 0.2, 0.22, 5.2, '#3a5a8a', s * 4.2, 0, 9.5, 10);
    box(c.g, 9.4, 1.2, 0.3, '#2f4a8a', 0, 4.4, 9.5); for (let i = 0; i < 5; i++) box(c.g, 0.7, 0.7, 0.05, '#fbf7ee', -3 + i * 1.5, 4.65, 9.67);
    for (let i = 0; i < 7; i++) sphere(c.glow, 0.12, '#ffe0a0', -3.6 + i * 1.2, 4.1, 9.5, 5); }, // stalls under blue tarps, onggi jars, the market gate
  // A night market under a paifang gate of red posts and green tiles, lanterns hung from it.
  china(c) { stallRows(c, 5, 2.8, 'lantern', ['#e8242a', '#ffd24a', '#e8e8ea', '#6aa84f']); for (let i = 0; i < 4; i++) { cyl(c.g, 0.45, 0.45, 0.3, '#c8a868', 0, 0.9 + i * 0.3, 0, 12); } sphere(c.g, 0.3, '#f2f2f2', 0, 2.5, 0, 6); for (const x of [-3.8, 3.8]) cyl(c.g, 0.22, 0.26, 4.8, '#b0322a', x, 0, 9.5, 10); box(c.g, 8.8, 0.5, 0.5, '#b0322a', 0, 4.2, 9.5); box(c.g, 2.4, 0.8, 0.1, '#2f4a8a', 0, 3.4, 9.78); sweptRoof(c.g, 9.6, 1.6, 0.8, '#2f7a5a', 0, 4.7, 9.5, 0, 0.5); for (const x of [-2.6, 2.6]) sphere(c.glow, 0.3, '#ff3a2a', x, 3.4, 9.5, 8, 1.2); }, // a night market, a stack of steaming baskets
  // A covered souk street: a barrel-vaulted roof, shopfronts in arches, brass lanterns hanging.
  islamic(c) {
    const g = c.g;
    for (const s of [-1, 1]) { box(g, 1.2, 4.4, 18, WHITE, s * 5, 0, 0); for (let i = 0; i < 5; i++) { archPanel(g, 2.2, 3, '#6a4a2a', s * 4.38, 0, -7 + i * 3.5, s * -Math.PI / 2, 0.05, false); stall(c, s * 3.2, -7 + i * 3.5, s > 0 ? -Math.PI / 2 : Math.PI / 2, 'tarp', ['#2f8ab8', '#f2d27a', '#c23b2a', '#2f8a5a'], i); } }
    c.g.add(new THREE.CylinderGeometry(5.6, 5.6, 18, 16, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), '#e8e0d0', M(0, 4.4, 0));
    for (let z = -6; z <= 6; z += 4) for (let k = 0; k < 3; k++) sphere(c.glow, 0.12, '#ffcf7a', 0, 8 - k * 0.1, z, 6); // light through the vault's star-holes
    for (let z = -7; z <= 7; z += 3.5) { cyl(g, 0.01, 0.01, 2.2, '#8a6a3a', 0, 5.8, z, 3); c.glow.add(new THREE.OctahedronGeometry(0.2).scale(1, 1.4, 1), '#ffcf7a', M(0, 5.4, z)); }
  },
  // A Gulf souq: arcaded shops round a court, a wind tower over the corner.
  middleeast(c) {
    const g = c.g;
    for (const s of [-1, 1]) { box(g, 3, 4, 16, '#e2d6bc', s * 6.5, 0, 0); for (let i = 0; i < 4; i++) archPanel(g, 2.2, 3.2, '#8a6a4a', s * 4.98, 0, -6 + i * 4, s * -Math.PI / 2, 0.05, true); }
    stallRows(c, 4, 2.4, 'tarp', ['#c8903a', '#3ac8b8', '#c23b2a']);
    box(g, 3, 9, 3, '#e2d6bc', 6.5, 0, -8); for (const [dx, dz, ry] of [[0, 1.52, 0], [1.52, 0, Math.PI / 2], [0, -1.52, Math.PI], [-1.52, 0, -Math.PI / 2]] as const) box(g, 1.4, 2.4, 0.06, '#6a4a2a', 6.5 + dx, 6, -8 + dz, ry);
  },
  // A tent market: black goat-hair tents, carpets spread before them, coffee pots on the fire, a pennant and lamp over it.
  desert(c) { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; stall(c, Math.cos(a) * 7, Math.sin(a) * 7, -a - Math.PI / 2, 'tent', ['#c8483a', '#2f5a9a', '#e8b84a'], i); } cyl(c.glow, 0.5, 0.6, 0.3, '#ff8a3a', 0, 0, 0, 8); cyl(c.g, 0.08, 0.1, 5, '#6a4a30', 0, 0, -2.2, 6); c.g.add(new THREE.BoxGeometry(1.6, 0.9, 0.02), '#2f7a4a', M(0.85, 4.4, -2.2)); sphere(c.glow, 0.16, '#ffcf7a', 0, 5.1, -2.2, 6); for (const x of [-0.8, 0.8]) { cyl(c.g, 0.15, 0.2, 0.4, GOLD, x, 0.3, 0.3, 8); cone(c.g, 0.05, 0.2, GOLD, x, 0.7, 0.3, 5); } },
  // A khan bazaar: a courtyard of arcades, cones of spice on the counters.
  egypt(c) {
    const g = c.g;
    box(g, 16, 5, 1.5, '#d8c08a', 0, 0, -8);
    for (const s of [-1, 1]) { box(g, 1.5, 5, 16, '#d8c08a', s * 8, 0, 0); box(g, 5.8, 5, 1.5, '#d8c08a', s * 5.1, 0, 8); }
    for (let i = 0; i < 5; i++) if (i !== 2) archPanel(g, 2.2, 3.4, '#6a4a2a', -6 + i * 3, 0, 7.24, Math.PI, 0.05, true);
    for (let i = 0; i < 5; i++) archPanel(g, 2.2, 3.4, '#6a4a2a', -6 + i * 3, 0, -7.24, 0, 0.05, true);
    for (let i = 0; i < 8; i++) { box(g, 1, 0.8, 0.8, '#8a5a36', -5 + (i % 4) * 3.2, 0, -3 + Math.floor(i / 4) * 5); cone(g, 0.35, 0.6, ['#c8483a', '#e8b84a', '#8a5a2a', '#e87a2a'][i % 4], -5 + (i % 4) * 3.2, 0.8, -3 + Math.floor(i / 4) * 5, 8); }
    // The gate: the front wall parted for a tall portal under a raised, banded frontispiece.
    for (const s of [-1, 1]) box(g, 1, 7, 2, '#c8b07a', s * 2, 0, 8.2);
    box(g, 5, 2.6, 2, '#c8b07a', 0, 4.4, 8.2); for (const y of [5.4, 6]) box(g, 5.1, 0.25, 2.05, '#8a5a36', 0, y, 8.2);
    c.g.add(new THREE.TorusGeometry(1.5, 0.14, 4, 14, Math.PI), '#e8dcc0', M(0, 2.9, 9.22)); // the arch of the open gateway
    for (const x of [-1.9, 1.9]) cyl(g, 0.18, 0.2, 4.4, '#e8dcc0', x, 0, 9.3, 8);
    for (let i = 0; i < 6; i++) box(g, 0.5, 0.5, 0.3, '#c8b07a', -2 + i * 0.8, 7, 8.2); // the cresting
  },
  // A haat: a field of canopy stalls in bright cloth, bangles on poles, a banyan in the middle.
  indianorth(c) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stall(c, Math.cos(a) * 7.5, Math.sin(a) * 7.5, -a - Math.PI / 2, 'canopy', ['#ff9a1f', '#e8347a', '#ffd23a', '#2a7ad8', '#9a4ad8'], i); } cyl(c.g, 0.7, 1, 4, '#6a4a30', 0, 0, 0, 10); sphere(c.g, 3.4, '#3f7a3a', 0, 5.2, 0, 10, 0.7); for (let i = 0; i < 8; i++) cyl(c.g, 0.05, 0.05, 3.5, '#6a4a30', Math.cos(i) * 2, 1.4, Math.sin(i) * 2, 4); },
  // A chowk: arcaded shops round a little square, a marble fountain in its heart.
  mughal(c) {
    const g = c.g;
    for (let side = 0; side < 3; side++) c.g.frame(0, 0, 0, side * Math.PI / 2 - Math.PI / 2, 1, () => c.glow.frame(0, 0, 0, side * Math.PI / 2 - Math.PI / 2, 1, () => { box(g, 16, 4.6, 3, '#b5552e', 0, 0, -8); for (let i = 0; i < 5; i++) { archPanel(g, 2.2, 3.2, '#fbf7ee', -6 + i * 3, 0, -6.48, 0, 0.04, true); archPanel(c.glow, 1.8, 2.6, '#ffd9a0', -6 + i * 3, 0.1, -6.46, 0, 0.03, true); } box(g, 16.4, 0.3, 3.4, WHITE, 0, 4.6, -8); }));
    cyl(g, 1.8, 1.9, 0.6, WHITE, 0, 0, 0, 8); cyl(g, 1.6, 1.6, 0.05, '#4a9ab8', 0, 0.55, 0, 8); cyl(c.glow, 0.05, 0.08, 1.1, '#dff6ff', 0, 0.6, 0, 5);
  },
  // A spice and fish market under tiled roofs on posts, bunches of bananas hanging.
  indiasouth(c) {
    const g = c.g;
    for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) cyl(g, 0.15, 0.15, 3.2, '#5a3422', s * 5, 0, -6 + i * 4, 8); c.g.add(new THREE.BoxGeometry(5, 0.2, 15), '#a8503a', M(s * 5, 3.6, 0, 0, 1, 1, 1, 0, s * -0.35)); }
    stallRows(c, 5, 4.4, 'tarp', ['#e8a030', '#c8401a', '#6a4a2a', '#4f8c42']);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) sphere(g, 0.12, '#e8d84a', -5.5 + (k % 2) * 0.2, 2.4 - k * 0.15, -6 + i * 4, 5);
  },
  // A pasar under a great pendopo roof, baskets of fruit and offerings of flowers.
  indonesia(c) {
    const g = c.g;
    for (const x of [-6, -2, 2, 6]) for (const z of [-5, 5]) box(g, 0.3, 4, 0.3, '#5a3a22', x, 0, z);
    cone(g, 11, 2.4, '#3a2e24', 0, 4, 0, 4, Math.PI / 4); cone(g, 5, 2.4, '#3a2e24', 0, 6.2, 0, 4, Math.PI / 4);
    for (let i = 0; i < 12; i++) { const x = -5 + (i % 4) * 3.3, z = -3 + Math.floor(i / 4) * 3; cyl(g, 0.5, 0.35, 0.4, '#c8a86a', x, 0, z, 10); for (let f = 0; f < 6; f++) sphere(g, 0.14, ['#ff6b3a', '#ffd24a', '#6aa84f', '#e8347a'][(i + f) % 4], x + Math.cos(f) * 0.25, 0.5, z + Math.sin(f) * 0.25, 5); }
  },
  skyisles: () => undefined,
};

/** Build the land's market at the origin, entrance +z. */
export function buildMarket(c: Ctx): void {
  MARKET[c.s.id](c);
}

// ─────────────────────────── what you cannot walk through ───────────────────────────

/** A wall from (x0, z0) to (x1, z1) as a row of overlapping circles, h high. */
function wall(x0: number, z0: number, x1: number, z1: number, h: number, r = 0.9): Collide[] {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (r * 1.4)));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n, r, h }));
}
/** A hall filling the rectangle centred (x, z), half-sizes hw × hd, h high, with circles no wider than 2 m (big circles are for houses). */
function hall(x: number, z: number, hw: number, hd: number, h: number): Collide[] {
  const out: Collide[] = [], r = 1.9, step = 2.4;
  const nx = Math.max(1, Math.ceil((hw * 2 - r) / step) + 1), nz = Math.max(1, Math.ceil((hd * 2 - r) / step) + 1);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push({ x: nx === 1 ? x : x - hw + r / 2 + ((hw * 2 - r) * i) / (nx - 1), z: nz === 1 ? z : z - hd + r / 2 + ((hd * 2 - r) * k) / (nz - 1), r: Math.min(r, hw, hd), h });
  return out;
}
const post = (x: number, z: number, r: number, h: number): Collide => ({ x, z, r, h });

const MOSQUE: Collide[] = [...hall(0, -4, 8, 4, 7), post(7.2, 8.2, 1.5, 13)];
const CHAPEL_NAVE: Collide[] = hall(0, -1.5, 3.5, 6.5, 7);
const WORSHIP_COLLIDE: Record<RegionId, Collide[]> = {
  islamic: MOSQUE, middleeast: MOSQUE, desert: MOSQUE, egypt: MOSQUE, mughal: [...MOSQUE, post(-7.2, 8.2, 1.2, 12)],
  indianorth: hall(0, -4, 3, 3, 15),
  indiasouth: [...hall(0, -5, 3, 3, 10), post(-2.4, 8.5, 1.2, 8), post(2.4, 8.5, 1.2, 8), post(3.5, 6, 0.45, 5)],
  indonesia: [post(-5, -5, 1.4, 10), post(0, -5, 1.4, 10), post(5, -5, 1.4, 10), post(4, 3, 2, 4), ...wall(-9, -9, 9, -9, 1.8), ...wall(-9, -9, -9, 9, 1.8), ...wall(9, -9, 9, 9, 1.8), ...wall(-9, 9, -2.6, 9, 1.8), ...wall(2.6, 9, 9, 9, 1.8)],
  japan: [...hall(0, -2.6, 3.8, 2.5, 5), post(-2.2, 10.5, 0.35, 5), post(2.2, 10.5, 0.35, 5), post(-3, 5, 0.8, 1)],
  korea: [...hall(0, -3, 5, 2.7, 7), post(0, 5, 1.1, 5)],
  china: [...hall(0, -3.5, 5.5, 3, 9), post(7, 3, 1.1, 10), post(0, 5, 0.9, 2)],
  london: [...CHAPEL_NAVE, post(0, 6.2, 1.8, 20)],
  norway: CHAPEL_NAVE,
  switzerland: [...CHAPEL_NAVE, post(0, 6, 1.6, 14)],
  renaissance: [...CHAPEL_NAVE, ...hall(0, -8, 3.2, 1.6, 7), post(5.2, 3, 1.7, 16)],
  vintage: [...CHAPEL_NAVE, post(0, 3.5, 1.3, 13)],
  aurora: hall(0, -1, 4.3, 6.2, 7),
  meadow: Array.from({ length: 10 }, (_, k) => post(Math.cos((k / 10) * Math.PI * 2) * 5.2, Math.sin((k / 10) * Math.PI * 2) * 5.2, 0.3, 5)).filter((q) => q.z < 4),
  newyork: [...wall(-7.5, -6.5, 7.5, -6.5, 5.5, 0.6), ...wall(-7.5, 4.5, -1.5, 4.5, 5.5, 0.6), ...wall(1.5, 4.5, 7.5, 4.5, 5.5, 0.6)],
  skyisles: [],
};
const MARKET_COLLIDE: Partial<Record<RegionId, Collide[]>> = {
  islamic: [...wall(-5, -9, -5, 9, 4.6), ...wall(5, -9, 5, 9, 4.6)],
  middleeast: [...wall(-6.5, -8, -6.5, 8, 4, 1.4), ...wall(6.5, -8, 6.5, 8, 4, 1.4), post(6.5, -8, 1.9, 9)],
  egypt: [...wall(-8, -8, 8, -8, 5), ...wall(-8, -8, -8, 8, 5), ...wall(8, -8, 8, 8, 5), ...wall(-8, 8, -2, 8, 5), ...wall(2, 8, 8, 8, 5)],
  mughal: [...wall(-8, -8, 8, -8, 4.6, 1.4), ...wall(-8, -8, -8, 8, 4.6, 1.4), ...wall(8, -8, 8, 8, 4.6, 1.4), post(0, 0, 1.9, 0.6)],
  japan: [...wall(-5.5, -9.9, -5.5, 9.9, 3.4, 1.4), ...wall(5.5, -9.9, 5.5, 9.9, 3.4, 1.4)],
  norway: hall(0, -4, 7, 3, 6),
  switzerland: [post(0, 0, 1.7, 4)],
  indianorth: [post(0, 0, 1, 6)],
  aurora: [post(0, 0, 1.6, 5)],
};

/** What stops the traveller walking through the land's place of worship or market (local, h above its ground). */
export function civicColliders(land: RegionId, kind: 'worship' | 'market'): Collide[] {
  return kind === 'worship' ? WORSHIP_COLLIDE[land] : MARKET_COLLIDE[land] ?? [];
}
