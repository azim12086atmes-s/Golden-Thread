import { Rng, lerp, smoothstep } from '../core/rng';
import { PLOTS, PLOT_SIZE } from './plots';
import { CITY_RADIUS, REGIONS, REGION_SIZE, regionCenter, type RegionId } from './regions';

/**
 * Lakes, ponds and rivers in every land's countryside — beyond the town, where the roads end.
 * Each land has a lake, three ponds and a river that winds part of the way round the town.
 * They are carved into the terrain (terrain.ts) and drawn with the fairytale water and its
 * foam. Pure data: tests check they stay clear of roads, plots and the castle.
 */

export type WaterBody =
  | { kind: 'lake' | 'pond'; land: RegionId; x: number; z: number; r: number }
  | { kind: 'river'; land: RegionId; pts: Array<[number, number]>; w: number };

/** The sea level (terrain.ts). Kept here too so this module has no cycle with terrain. */
const SEA = -1.5;
/** Roads end here (RegionBuilder lays avenues out to CITY_RADIUS + 40 plus a segment). */
export const ROADS_END = CITY_RADIUS + 48;
export const CASTLE_AT = { x: 0, z: -292, r: 72 };

function clearOfAxes(a: number, margin: number): number {
  // Keep away from the four avenues' directions.
  const q = Math.PI / 2, m = ((a % q) + q) % q;
  if (m < margin) return a + (margin - m);
  if (q - m < margin) return a - (margin - (q - m));
  return a;
}

function build(): WaterBody[] {
  const out: WaterBody[] = [];
  for (const r of REGIONS) {
    if (r.id === 'skyisles') continue;
    const c = regionCenter(r), rng = new Rng(`waters:${r.id}`);
    const bad = (x: number, z: number, rad: number) =>
      PLOTS.some((p) => Math.abs(x - p.x) < PLOT_SIZE / 2 + rad + 16 && Math.abs(z - p.z) < PLOT_SIZE / 2 + rad + 16) ||
      Math.hypot(x - CASTLE_AT.x, z - CASTLE_AT.z) < CASTLE_AT.r + rad + 34;
    // The lake.
    for (let tries = 0; tries < 20; tries++) {
      const a = clearOfAxes(rng.range(0, Math.PI * 2), 0.42), rad = rng.range(24, 34), d = rng.range(ROADS_END + rad + 8, ROADS_END + rad + 40);
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (d - rad < ROADS_END + 4 || bad(x, z, rad)) continue;
      out.push({ kind: 'lake', land: r.id, x, z, r: rad });
      break;
    }
    // Ponds.
    let ponds = 0;
    for (let tries = 0; tries < 40 && ponds < 3; tries++) {
      const a = clearOfAxes(rng.range(0, Math.PI * 2), 0.3), d = rng.range(CITY_RADIUS + 14, 330), rad = rng.range(7, 13);
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (bad(x, z, rad) || out.some((b) => b.kind !== 'river' && Math.hypot(b.x - x, b.z - z) < b.r + rad + 12)) continue;
      out.push({ kind: 'pond', land: r.id, x, z, r: rad });
      ponds++;
    }
    // The river: a winding arc round part of the town, beyond the ends of the roads.
    const a0 = rng.range(0, Math.PI * 2), span = rng.range(1.6, 2.4), w = rng.range(8, 11);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 28; i++) {
      const a = a0 + (span * i) / 28, d = 312 + Math.sin(i * 0.55 + a0 * 3) * 8;
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (bad(x, z, w)) { if (pts.length > 4) break; pts.length = 0; continue; }
      pts.push([x, z]);
    }
    if (pts.length >= 6) out.push({ kind: 'river', land: r.id, pts, w });
  }
  return out;
}

export const WATERS: WaterBody[] = build();

/** Bodies by land grid cell, so the height lookup only checks its own land's few. */
const BY_CELL = new Map<string, WaterBody[]>();
for (const b of WATERS) {
  const [x, z] = b.kind === 'river' ? b.pts[Math.floor(b.pts.length / 2)] : [b.x, b.z];
  for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
    const key = `${Math.round(x / REGION_SIZE) + dx},${Math.round(z / REGION_SIZE) + dz}`;
    const list = BY_CELL.get(key) ?? [];
    if (!list.includes(b)) list.push(b);
    BY_CELL.set(key, list);
  }
}

function segDist(px: number, pz: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L)) : 0;
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}

/** Signed distance to the nearest water's edge (negative inside), and that body. */
export function waterEdge(x: number, z: number): { d: number; body: WaterBody | null } {
  const cx = Math.round(x / REGION_SIZE), cz = Math.round(z / REGION_SIZE);
  // Town cores never have water: a quick exit for the many lookups made in streets.
  if (Math.hypot(x - cx * REGION_SIZE, z - cz * REGION_SIZE) < CITY_RADIUS - 5) return { d: Infinity, body: null };
  let best = Infinity, body: WaterBody | null = null;
  for (const b of BY_CELL.get(`${cx},${cz}`) ?? []) {
    let d: number;
    if (b.kind === 'river') {
      d = Infinity;
      for (let i = 0; i < b.pts.length - 1; i++) d = Math.min(d, segDist(x, z, b.pts[i], b.pts[i + 1]));
      d -= b.w / 2;
    } else d = Math.hypot(x - b.x, z - b.z) - b.r;
    if (d < best) { best = d; body = b; }
  }
  return { d: best, body };
}

/** Banks slope down over this many metres to the water's edge. */
export const BANK = 7;

/** Terrain height with the water carved in: a bed below the water, a gentle bank round it. */
export function carveWater(x: number, z: number, h: number): number {
  const { d, body } = waterEdge(x, z);
  if (!body || d > BANK) return h;
  const depth = body.kind === 'lake' ? 2.6 : body.kind === 'river' ? 1.6 : 1.1;
  if (d <= 0) {
    const size = body.kind === 'river' ? body.w / 2 : body.r;
    return Math.min(h, SEA - 0.3 - depth * smoothstep(0, size * 0.6, -d));
  }
  return Math.min(h, lerp(SEA - 0.3, Math.max(h, SEA + 0.35), smoothstep(0, BANK, d)));
}
