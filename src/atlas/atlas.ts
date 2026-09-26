import { fbm, smoothstep } from '../core/rng';
import { CONTINENT } from './continent';
import {
  WATER_SIGHTINGS, km,
  type CityDef, type LakeDef, type LandId, type Pt, type RangeDef, type RiverDef, type SegmentDef, type SettlementDef, type SightingDef,
} from './schema';

/**
 * Atlas runtime (OPUS_002). Pure functions over CONTINENT, in world metres:
 * land/water tests, roads with height profiles and auto-detected bridges, placement of sightings
 * and settlements, route finding, and a proposed height field. No three.js, no DOM, no state.
 */

/** Matches `WATER_Y` in src/world/terrain.ts. */
export const SEA_LEVEL = -1.5;
/** Width of the shore rim that holds a raised lake's water (m). */
const RIM = 150;

export interface City extends Omit<CityDef, 'x' | 'z'> { x: number; z: number }
export interface Lake { def: LakeDef; pts: P[]; minX: number; maxX: number; minZ: number; maxZ: number }
export interface Range { def: RangeDef; pts: P[] }
export interface River { def: RiverDef; pts: P[] }
export interface P { x: number; z: number }

const toM = (p: Pt): P => ({ x: km(p[0]), z: km(p[1]) });

export const CITIES: City[] = CONTINENT.cities.map((c) => ({ ...c, x: km(c.x), z: km(c.z) }));
export const CITY: Record<LandId, City> = Object.fromEntries(CITIES.map((c) => [c.id, c])) as Record<LandId, City>;
const COAST: P[] = CONTINENT.coast.map(toM);
const ISLANDS: P[][] = CONTINENT.islands.map((i) => i.outline.map(toM));
export const LAKES: Lake[] = CONTINENT.lakes.map((def) => {
  const pts = def.outline.map(toM);
  return { def, pts, minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)), minZ: Math.min(...pts.map((p) => p.z)), maxZ: Math.max(...pts.map((p) => p.z)) };
});
export const RANGES: Range[] = CONTINENT.ranges.map((def) => ({ def, pts: def.crest.map(toM) }));
export const RIVERS: River[] = CONTINENT.rivers.map((def) => ({ def, pts: def.path.map(toM) }));

// ───────────────────────── geometry ─────────────────────────

export function pointInPoly(x: number, z: number, poly: P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { d: number; t: number } {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz;
  let t = L > 0 ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { d: Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t };
}

function polyEdgeDist(x: number, z: number, poly: P[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    d = Math.min(d, segDist(x, z, a.x, a.z, b.x, b.z).d);
  }
  return d;
}

// ───────────────────────── land & water ─────────────────────────

export function isLand(x: number, z: number): boolean {
  if (pointInPoly(x, z, COAST)) return true;
  return ISLANDS.some((i) => pointInPoly(x, z, i));
}

/** The lake a point lies in, if any. */
export function lakeAt(x: number, z: number): Lake | null {
  for (const l of LAKES) {
    if (x < l.minX || x > l.maxX || z < l.minZ || z > l.maxZ) continue;
    if (pointInPoly(x, z, l.pts)) return l;
  }
  return null;
}

/** Distance to the nearest river centreline, and that river. */
export function nearestRiver(x: number, z: number): { d: number; river: River | null } {
  let best = Infinity, river: River | null = null;
  for (const r of RIVERS) {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      if (Math.abs(x - a.x) > 3000 && Math.abs(x - b.x) > 3000) continue;
      const { d } = segDist(x, z, a.x, a.z, b.x, b.z);
      if (d < best) { best = d; river = r; }
    }
  }
  return { d: best, river };
}

export type Water = 'sea' | 'lake' | 'river' | null;

/** Open water at a point (salt flats and frozen lakes are ground, not water). */
export function waterAt(x: number, z: number): Water {
  const lake = lakeAt(x, z);
  if (lake) return lake.def.surface === 'water' ? (lake.def.level === 'sea' ? 'sea' : 'lake') : null;
  if (!isLand(x, z)) return 'sea';
  const r = nearestRiver(x, z);
  if (r.river && r.d < r.river.def.width / 2) return 'river';
  return null;
}

/** Signed distance to the coastline in metres: positive inland, negative at sea. */
export function coastDistance(x: number, z: number): number {
  let d = polyEdgeDist(x, z, COAST);
  for (const i of ISLANDS) d = Math.min(d, polyEdgeDist(x, z, i));
  for (const l of LAKES) if (l.def.level === 'sea' && l.def.surface === 'water') d = Math.min(d, polyEdgeDist(x, z, l.pts));
  return waterAt(x, z) === 'sea' ? -d : d;
}

// ───────────────────────── lands ─────────────────────────

/** Normalised inverse-distance weights (sharpness 6): a land stays itself near its centre and blends over ~500 m. */
export function landWeights(x: number, z: number): Array<{ city: City; w: number }> {
  let sum = 0;
  const out = CITIES.map((city) => {
    const d = Math.max(60, Math.hypot(x - city.x, z - city.z) - city.radius * 0.5);
    const w = 1 / d ** 6;
    sum += w;
    return { city, w };
  });
  for (const o of out) o.w /= sum;
  return out;
}

/** The land a point belongs to. The Sky Isles only claim points that are airborne above Mirror Lake. */
export function landAt(x: number, z: number): LandId {
  let best: City = CITY.meadow, bw = -1;
  for (const { city, w } of landWeights(x, z)) if (city.id !== 'skyisles' && w > bw) { bw = w; best = city; }
  return best.id;
}

// ───────────────────────── roads ─────────────────────────

export const ROAD_WIDTH = { H: 11, S: 7, B: 5 } as const;
export const MAX_GRADE = { H: 0.1, S: 0.14, B: 0.16 } as const;
const STEP = 10;

export interface RoadSample { x: number; z: number; s: number; y: number; bridge: boolean }
export interface Road {
  seg: SegmentDef;
  cls: 'H' | 'S';
  samples: RoadSample[];
  length: number;
  /** Arc-length ranges (m) where the road crosses open water on a bridge or causeway. */
  bridges: Array<[number, number]>;
}

function catmull(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const t2 = t * t, t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

/** A smooth polyline through the given points, sampled about every `step` metres. */
export function smoothPath(ctrl: P[], step = STEP): Array<{ x: number; z: number; s: number }> {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: Array<{ x: number; z: number; s: number }> = [];
  let s = 0;
  for (let i = 1; i + 2 < pts.length; i++) {
    const span = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
    const n = Math.max(1, Math.ceil(span / step));
    for (let k = 0; k < n; k++) {
      const p = catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], k / n);
      if (out.length) s += Math.hypot(p.x - out[out.length - 1].x, p.z - out[out.length - 1].z);
      out.push({ x: p.x, z: p.z, s });
    }
  }
  const last = pts[pts.length - 2];
  s += Math.hypot(last.x - out[out.length - 1].x, last.z - out[out.length - 1].z);
  out.push({ x: last.x, z: last.z, s });
  return out;
}

/** Smooth a height profile and cap its grade. The backward pass leaves every step within the cap. */
export function gradeProfile(ys: number[], ss: number[], grade: number, pinned: boolean[]): number[] {
  const n = ys.length, out = ys.slice();
  const W = 8;
  const sm = out.map((_, i) => {
    if (pinned[i]) return out[i];
    let a = 0, c = 0;
    for (let k = Math.max(0, i - W); k <= Math.min(n - 1, i + W); k++) { a += out[k]; c++; }
    return a / c;
  });
  for (let i = 1; i < n; i++) {
    const g = grade * (ss[i] - ss[i - 1]);
    sm[i] = Math.min(sm[i - 1] + g, Math.max(sm[i - 1] - g, sm[i]));
  }
  for (let i = n - 2; i >= 0; i--) {
    const g = grade * (ss[i + 1] - ss[i]);
    sm[i] = Math.min(sm[i + 1] + g, Math.max(sm[i + 1] - g, sm[i]));
  }
  return sm;
}

function buildRoad(seg: SegmentDef): Road {
  const a = CITY[seg.from], b = CITY[seg.to];
  const path = smoothPath([{ x: a.x, z: a.z }, ...seg.via.map(toM), { x: b.x, z: b.z }]);
  const water = path.map((p) => waterAt(p.x, p.z) !== null);
  // Bridges: each wet stretch plus a short abutment on either side.
  const bridges: Array<[number, number]> = [];
  for (let i = 0; i < path.length; i++) {
    if (!water[i]) continue;
    let j = i;
    while (j + 1 < path.length && water[j + 1]) j++;
    bridges.push([Math.max(0, path[i].s - 15), Math.min(path[path.length - 1].s, path[j].s + 15)]);
    i = j;
  }
  const onBridge = (s: number) => bridges.some(([s0, s1]) => s >= s0 && s <= s1);
  // Height profile: natural ground, pinned to each city's core, lifted clear of water on bridges.
  const pinned = path.map((p) => [a, b].some((c) => Math.hypot(p.x - c.x, p.z - c.z) < c.radius * 0.8));
  const raw = path.map((p, i) => {
    for (const c of [a, b]) if (Math.hypot(p.x - c.x, p.z - c.z) < c.radius * 0.8) return c.coreY;
    const h = naturalHeight(p.x, p.z);
    if (water[i]) {
      const lake = lakeAt(p.x, p.z);
      const surface = lake && typeof lake.def.level === 'number' ? lake.def.level : SEA_LEVEL;
      return Math.max(h, surface + 4);
    }
    return h;
  });
  const ys = gradeProfile(raw, path.map((p) => p.s), MAX_GRADE[seg.cls], pinned);
  const samples = path.map((p, i) => ({ x: p.x, z: p.z, s: p.s, y: ys[i], bridge: onBridge(p.s) }));
  return { seg, cls: seg.cls, samples, length: path[path.length - 1].s, bridges };
}

let roadCache: Road[] | null = null;
export function roads(): Road[] {
  return (roadCache ??= CONTINENT.segments.map(buildRoad));
}
export const roadById = (id: number) => roads().find((r) => r.seg.id === id)!;

/** Point, heading and right-hand normal at fraction t along a road. */
export function pointAt(road: Road, t: number): { x: number; z: number; y: number; dx: number; dz: number; rx: number; rz: number } {
  const target = Math.max(0, Math.min(1, t)) * road.length;
  const ss = road.samples;
  let i = 0;
  while (i + 2 < ss.length && ss[i + 1].s < target) i++;
  const a = ss[i], b = ss[i + 1] ?? ss[i];
  const span = Math.max(1e-6, b.s - a.s);
  const f = Math.max(0, Math.min(1, (target - a.s) / span));
  const dx0 = b.x - a.x, dz0 = b.z - a.z, L = Math.hypot(dx0, dz0) || 1;
  const dx = dx0 / L, dz = dz0 / L;
  // x east, z south: facing (dx, dz), the right-hand side is (-dz, dx).
  return { x: a.x + dx0 * f, z: a.z + dz0 * f, y: a.y + (b.y - a.y) * f, dx, dz, rx: -dz, rz: dx };
}

export interface PlacedSighting { def: SightingDef; seg: SegmentDef; x: number; z: number; roadX: number; roadZ: number }
export interface PlacedSettlement { def: SettlementDef; seg: SegmentDef; x: number; z: number; junction: P; branch: P[] }

export function placeSighting(road: Road, s: SightingDef): PlacedSighting {
  const p = pointAt(road, s.t);
  return { def: s, seg: road.seg, x: p.x + p.rx * s.side * s.offset, z: p.z + p.rz * s.side * s.offset, roadX: p.x, roadZ: p.z };
}

export function placeSettlement(road: Road, v: SettlementDef): PlacedSettlement {
  const p = pointAt(road, v.t);
  const x = p.x + p.rx * v.side * v.distance, z = p.z + p.rz * v.side * v.distance;
  // The branch leaves at a slant (a Y-junction) and bends once before arriving.
  const mid = { x: p.x + p.rx * v.side * v.distance * 0.55 + p.dx * v.distance * 0.25, z: p.z + p.rz * v.side * v.distance * 0.55 + p.dz * v.distance * 0.25 };
  return { def: v, seg: road.seg, x, z, junction: { x: p.x, z: p.z }, branch: [{ x: p.x, z: p.z }, mid, { x, z }] };
}

export const sightings = (): PlacedSighting[] => roads().flatMap((r) => r.seg.sightings.map((s) => placeSighting(r, s)));
export const settlements = (): PlacedSettlement[] => roads().flatMap((r) => r.seg.settlements.map((v) => placeSettlement(r, v)));

// ───────────────────────── routes ─────────────────────────

/** Shortest road route between two lands (Dijkstra over segment lengths). Null if unreachable. */
export function routeBetween(from: LandId, to: LandId): { lands: LandId[]; segments: number[]; length: number } | null {
  const dist = new Map<LandId, number>([[from, 0]]);
  const prev = new Map<LandId, { land: LandId; seg: number }>();
  const open = new Set<LandId>([from]);
  while (open.size) {
    let u: LandId | null = null;
    for (const n of open) if (u === null || dist.get(n)! < dist.get(u)!) u = n;
    open.delete(u!);
    if (u === to) break;
    for (const r of roads()) {
      const v = r.seg.from === u ? r.seg.to : r.seg.to === u ? r.seg.from : null;
      if (!v) continue;
      const nd = dist.get(u!)! + r.length;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, { land: u!, seg: r.seg.id }); open.add(v); }
    }
  }
  if (!dist.has(to)) return null;
  const lands: LandId[] = [to], segs: number[] = [];
  for (let cur = to; cur !== from;) {
    const p = prev.get(cur)!;
    segs.unshift(p.seg);
    lands.unshift(p.land);
    cur = p.land;
  }
  return { lands, segments: segs, length: dist.get(to)! };
}

// ───────────────────────── height field (proposal) ─────────────────────────

/** Terrain without road corridors: base elevations, hills, ranges, coast, lakes, rivers, city cores. */
export function naturalHeight(x: number, z: number): number {
  const ws = landWeights(x, z);
  let base = 0, relief = 0;
  for (const { city, w } of ws) { base += city.coreY * w; relief += city.relief * w; }
  const hills = (fbm(x * 0.0022 + 7.3, z * 0.0022 - 3.1, 5) - 0.45) * 1.5 * relief;

  // Ranges: the highest influence wins (ranges do not stack).
  let range = 0;
  for (const r of RANGES) {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const { d } = segDist(x, z, a.x, a.z, b.x, b.z);
      if (d >= r.def.width) continue;
      const f = (1 - d / r.def.width) ** 2;
      const ridged = 1 - Math.abs(fbm(x * 0.004 + i, z * 0.004 - i, 3) * 2 - 1);
      const shape = r.def.character === 'dunes' ? 0.5 + 0.5 * Math.sin(x * 0.012 + z * 0.006) : r.def.character === 'fells' || r.def.character === 'hills' ? 0.9 : 0.55 + 0.6 * ridged;
      range = Math.max(range, r.def.height * f * shape);
    }
  }
  let h = base + hills + range;

  // City cores: flat at their core height, easing out over 250 m.
  for (const { city, w } of ws) {
    if (w < 0.02 || city.id === 'skyisles') continue;
    const d = Math.hypot(x - city.x, z - city.z);
    if (d > city.radius + 250) continue;
    h = h + (city.coreY - h) * (1 - smoothstep(city.radius * 0.85, city.radius + 250, d));
  }

  // Coast: beaches ease into the sea; offshore falls away.
  const cd = coastDistance(x, z);
  if (cd < 0) return Math.min(h, SEA_LEVEL - 2 + cd * 0.02);
  if (cd < 220) h = SEA_LEVEL + 0.6 + (h - SEA_LEVEL - 0.6) * smoothstep(0, 220, cd);

  // Lakes: water basins below their surface; salt and ice are flat walkable ground.
  const lake = lakeAt(x, z);
  if (lake) {
    const level = lake.def.level === 'sea' ? SEA_LEVEL : lake.def.level;
    return lake.def.surface === 'water' ? level - 3 : level;
  }
  // Raised lakes get a rim so the water never shows as a floating sheet at the shore.
  for (const l of LAKES) {
    if (typeof l.def.level !== 'number' || l.def.surface !== 'water') continue;
    if (x < l.minX - RIM || x > l.maxX + RIM || z < l.minZ - RIM || z > l.maxZ + RIM) continue;
    const d = polyEdgeDist(x, z, l.pts);
    if (d < RIM && h < l.def.level + 1) h = l.def.level + 1 + (h - l.def.level - 1) * (d / RIM);
  }

  // Rivers: a channel 2.5 m below the banks.
  const r = nearestRiver(x, z);
  if (r.river) {
    const half = r.river.def.width / 2;
    if (r.d < half + 25) h -= 2.5 * (1 - smoothstep(half, half + 25, r.d));
  }
  return h;
}

/** Full proposed height field: natural terrain with every road corridor graded into it. */
export function continentHeight(x: number, z: number): number {
  const h = naturalHeight(x, z);
  let best: { d: number; y: number; w: number } | null = null;
  for (const road of roads()) {
    const half = ROAD_WIDTH[road.cls] / 2;
    const ss = road.samples;
    // Coarse skip: bounding check every 20 samples.
    for (let i = 0; i + 1 < ss.length; i++) {
      if (i % 20 === 0) {
        const k = Math.min(ss.length - 1, i + 20);
        const pad = half + 40 + 20 * STEP;
        if (Math.abs(x - ss[i].x) > pad && Math.abs(x - ss[k].x) > pad) { i += 19; continue; }
        if (Math.abs(z - ss[i].z) > pad && Math.abs(z - ss[k].z) > pad) { i += 19; continue; }
      }
      const a = ss[i], b = ss[i + 1];
      if (a.bridge && b.bridge) continue; // keep the water under bridges
      const { d, t } = segDist(x, z, a.x, a.z, b.x, b.z);
      if (d < half + 22 && (!best || d < best.d)) best = { d, y: a.y + (b.y - a.y) * t, w: half };
    }
  }
  if (!best) return h;
  return best.y + (h - best.y) * smoothstep(best.w, best.w + 22, best.d);
}

// ───────────────────────── validation ─────────────────────────

const EDGE_KINDS: readonly SettlementDef['kind'][] = ['fishing', 'lighthouse', 'stilt-village', 'river-village'];

/** Hard errors must be empty. Warnings are placement notes for a designer to review in-game. */
export function validateAtlas(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  const dup = (label: string, ids: Array<string | number>) => {
    const seen = new Set<string | number>();
    for (const id of ids) { if (seen.has(id)) errors.push(`duplicate ${label} id ${id}`); seen.add(id); }
  };
  dup('city', CONTINENT.cities.map((c) => c.id));
  dup('segment', CONTINENT.segments.map((s) => s.id));
  dup('sighting', CONTINENT.segments.flatMap((s) => s.sightings.map((x) => x.id)));
  dup('settlement', CONTINENT.segments.flatMap((s) => s.settlements.map((x) => x.id)));
  dup('lake', CONTINENT.lakes.map((l) => l.id));

  for (const c of CITIES) {
    if (c.id === 'skyisles') continue;
    if (!isLand(c.x, c.z)) errors.push(`city ${c.id} centre is at sea`);
    const lake = lakeAt(c.x, c.z);
    if (lake && lake.def.surface === 'water') errors.push(`city ${c.id} centre is in ${lake.def.id}`);
  }
  for (const s of CONTINENT.segments) {
    if (!CITY[s.from] || !CITY[s.to] || s.from === s.to) errors.push(`segment ${s.id} has bad endpoints`);
    for (const x of [...s.sightings, ...s.settlements]) if (!(x.t >= 0 && x.t <= 1)) errors.push(`${x.id} t out of range`);
  }
  for (const r of roads()) {
    for (const p of r.samples) if (![p.x, p.z, p.y].every(Number.isFinite)) { errors.push(`road ${r.seg.id} has a non-finite sample`); break; }
  }
  for (const v of settlements()) {
    const wet = waterAt(v.x, v.z);
    if (wet && !EDGE_KINDS.includes(v.def.kind)) errors.push(`settlement ${v.def.id} (${v.def.name}) is in ${wet}`);
    else if (wet) warnings.push(`settlement ${v.def.id} (${v.def.name}) sits on the water's edge (${wet}) — fine for its kind, check visually`);
    for (const c of CITIES) if (Math.hypot(v.x - c.x, v.z - c.z) < c.radius) warnings.push(`settlement ${v.def.id} lies inside ${c.id}'s city radius`);
  }
  for (const s of sightings()) {
    const wet = waterAt(s.x, s.z);
    if (wet && !WATER_SIGHTINGS.includes(s.def.kind)) warnings.push(`sighting ${s.def.id} (${s.def.name}, ${s.def.kind}) falls in ${wet}`);
  }
  for (const c of CITIES) {
    if (c.id === 'skyisles' || c.id === 'meadow') continue;
    if (!routeBetween('meadow', c.id)) errors.push(`${c.id} is not reachable by road from the Meadow`);
  }
  return { errors, warnings };
}
