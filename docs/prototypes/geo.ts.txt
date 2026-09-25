import { GEOGRAPHY } from './geography-data';
import { km, type CityDef, type LakeDef, type Pt, type RangeDef, type RiverDef } from './geography';
import type { RegionId } from './regions';

/**
 * Runtime geography: the continent from geography-data.ts converted to metres, with a spatial
 * grid so a terrain vertex only looks at the coast edges, ranges, rivers and lakes near it.
 */

export interface P { x: number; z: number }
const toM = (p: Pt): P => ({ x: km(p[0]), z: km(p[1]) });

export interface City extends Omit<CityDef, 'x' | 'z'> { x: number; z: number }
export const CITIES: City[] = GEOGRAPHY.cities.map((c) => ({ ...c, x: km(c.x), z: km(c.z) }));
export const CITY_BY_ID = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<RegionId, City>;

export interface Lake { def: LakeDef; pts: P[]; minX: number; maxX: number; minZ: number; maxZ: number; cx: number; cz: number }
export interface Range { def: RangeDef; pts: P[] }
export interface River { def: RiverDef; pts: P[] }

const COAST: P[] = GEOGRAPHY.coast.map(toM);
const ISLANDS: P[][] = GEOGRAPHY.islands.map((o) => o.map(toM));
export const LAKES: Lake[] = GEOGRAPHY.lakes.map((def) => {
  const pts = def.outline.map(toM);
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
  return {
    def, pts,
    minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs),
    cx: xs.reduce((a, b) => a + b, 0) / xs.length, cz: zs.reduce((a, b) => a + b, 0) / zs.length,
  };
});
export const RANGES: Range[] = GEOGRAPHY.ranges.map((def) => ({ def, pts: def.crest.map(toM) }));
export const RIVERS: River[] = GEOGRAPHY.rivers.map((def) => ({ def, pts: def.path.map(toM) }));

// ───────────────────────── geometry helpers ─────────────────────────

export function pointInPoly(x: number, z: number, poly: P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Distance from p to segment ab, and the parameter of the closest point. */
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { d: number; t: number } {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz;
  let t = L > 0 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t, z = az + dz * t;
  return { d: Math.hypot(px - x, pz - z), t };
}

// ───────────────────────── spatial grid ─────────────────────────

const CELL = 250;
interface Edge { ax: number; az: number; bx: number; bz: number; owner: number; kind: 'coast' | 'range' | 'river' | 'lake'; s0: number }
const grid = new Map<number, Edge[]>();
const key = (cx: number, cz: number) => (cx + 4096) * 8192 + (cz + 4096);

function addEdge(e: Edge, reach: number): void {
  const x0 = Math.floor((Math.min(e.ax, e.bx) - reach) / CELL), x1 = Math.floor((Math.max(e.ax, e.bx) + reach) / CELL);
  const z0 = Math.floor((Math.min(e.az, e.bz) - reach) / CELL), z1 = Math.floor((Math.max(e.az, e.bz) + reach) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
    const k = key(cx, cz);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(e);
  }
}

/** How far inland the coast shapes the terrain (beaches, cliffs, sea floor). */
export const COAST_REACH = 450;

function polyEdges(poly: P[], kind: Edge['kind'], owner: number, reach: number): void {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    addEdge({ ax: a.x, az: a.z, bx: b.x, bz: b.z, owner, kind, s0: 0 }, reach);
  }
}
function lineEdges(line: P[], kind: Edge['kind'], owner: number, reach: number): void {
  let s = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1];
    addEdge({ ax: a.x, az: a.z, bx: b.x, bz: b.z, owner, kind, s0: s }, reach);
    s += Math.hypot(b.x - a.x, b.z - a.z);
  }
}

polyEdges(COAST, 'coast', -1, COAST_REACH);
ISLANDS.forEach((isl, i) => polyEdges(isl, 'coast', i, COAST_REACH));
LAKES.forEach((l, i) => polyEdges(l.pts, 'lake', i, 160));
RANGES.forEach((r, i) => lineEdges(r.pts, 'range', i, r.def.width));
RIVERS.forEach((r, i) => lineEdges(r.pts, 'river', i, r.def.width + 90));

export function edgesNear(x: number, z: number): Edge[] {
  return grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? EMPTY;
}
const EMPTY: Edge[] = [];

// ───────────────────────── queries ─────────────────────────

export function onLand(x: number, z: number): boolean {
  if (pointInPoly(x, z, COAST)) return true;
  for (const isl of ISLANDS) if (pointInPoly(x, z, isl)) return true;
  return false;
}

/** Signed distance to the nearest coastline: + inland, − at sea. Clamped to ±COAST_REACH. */
export function coastDistance(x: number, z: number): number {
  let best = COAST_REACH;
  for (const e of edgesNear(x, z)) {
    if (e.kind !== 'coast') continue;
    const { d } = segDist(x, z, e.ax, e.az, e.bx, e.bz);
    if (d < best) best = d;
  }
  return onLand(x, z) ? best : -best;
}

export function lakeAt(x: number, z: number): { lake: Lake; edge: number } | null {
  for (const l of LAKES) {
    if (x < l.minX - 160 || x > l.maxX + 160 || z < l.minZ - 160 || z > l.maxZ + 160) continue;
    const inside = pointInPoly(x, z, l.pts);
    let d = 160;
    for (let i = 0; i < l.pts.length; i++) {
      const a = l.pts[i], b = l.pts[(i + 1) % l.pts.length];
      d = Math.min(d, segDist(x, z, a.x, a.z, b.x, b.z).d);
    }
    if (inside) return { lake: l, edge: d };
    if (d < 160) return { lake: l, edge: -d };
  }
  return null;
}

/** Normalised inverse-distance weights over cities: smooth, wide biome blends (400–600 m bands). */
export function cityWeights(x: number, z: number, out: Array<{ c: City; w: number }> = []): Array<{ c: City; w: number }> {
  out.length = 0;
  let sum = 0;
  for (const c of CITIES) {
    const d = Math.max(40, Math.hypot(x - c.x, z - c.z) - c.radius * 0.6);
    const w = 1 / (d * d * d);
    out.push({ c, w });
    sum += w;
  }
  for (const o of out) o.w /= sum;
  return out;
}

/** The land a point belongs to (for the HUD, ambience, and which town streams in). */
export function nearestCity(x: number, z: number): City {
  let best = CITIES[0], bd = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(x - c.x, z - c.z) - c.radius * 0.5;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export const WORLD_BOUNDS = (() => {
  const all = [...COAST, ...ISLANDS.flat()];
  return {
    minX: Math.min(...all.map((p) => p.x)) - 600, maxX: Math.max(...all.map((p) => p.x)) + 600,
    minZ: Math.min(...all.map((p) => p.z)) - 600, maxZ: Math.max(...all.map((p) => p.z)) + 600,
  };
})();

export const COASTLINE = COAST;
export const ISLAND_OUTLINES = ISLANDS;
