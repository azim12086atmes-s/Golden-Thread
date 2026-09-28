import * as THREE from 'three';
import { Rng, fbm, smoothstep } from '../core/rng';
import { INSTITUTE_SITES, SITE_SIZE } from '../institutions/sites';
import { FIELD_SITES, PLOTS, PLOT_SIZE } from './plots';
import { CITY_RADIUS, REGIONS, REGION_SIZE, regionCenter, type RegionId } from './regions';
import { reservedAt } from './reserved';
import { waterEdge } from './waters';

/**
 * Mountains, plateaus and cliffs, by each land's geography (owner's brief): they are part of the
 * ground itself, so you can walk up them, and caves are cut into their feet (caves.ts) so you can
 * roam inside. Out in the country, clear of the town, its roads, fields, homes and waters:
 *
 * - the deserts, Egypt, the Gulf and Gulabi Nagar: **mesas and buttes** — flat-topped, their sides
 *   stepped in ledges of muddy red, ochre and cream strata, like Wadi Rum and the Aravallis;
 * - Aurora: **arctic ranges** — jagged blue-white peaks with ice cliffs;
 * - the Alps and the fjords: **alpine peaks** — light-grey rock, snow-capped, ridged;
 * - Jade Terraces: **karst towers** — tall limestone pillars in clusters, green on their ledges;
 * - Hanok Village: **granite domes** — rounded pale-grey mountains with pines;
 * - Sakura Hollow and Nusa Rinjani: a **volcano** — a great cone, snow-capped in Japan, with a crater;
 * - the green lands: **rolling hills** with rock showing on their steep sides, and dens dug in.
 *
 * Pure data and height/colour functions (tests/landforms.test.ts).
 */
export type LandformKind = 'mesa' | 'butte' | 'peak' | 'arctic' | 'karst' | 'granite' | 'volcano' | 'hill';
export interface Landform { id: string; land: RegionId; kind: LandformKind; x: number; z: number; r: number; h: number; seed: number }

type Spec = { kind: LandformKind; n: number; r: [number, number]; h: [number, number] };
export const LANDFORM_LANDS: Partial<Record<RegionId, Spec[]>> = {
  desert: [{ kind: 'mesa', n: 3, r: [42, 60], h: [20, 30] }, { kind: 'butte', n: 5, r: [14, 22], h: [18, 28] }],
  egypt: [{ kind: 'mesa', n: 2, r: [36, 50], h: [12, 18] }, { kind: 'butte', n: 3, r: [12, 18], h: [12, 18] }],
  middleeast: [{ kind: 'mesa', n: 2, r: [38, 52], h: [16, 24] }, { kind: 'butte', n: 3, r: [14, 20], h: [14, 22] }],
  indianorth: [{ kind: 'mesa', n: 3, r: [34, 48], h: [14, 22] }, { kind: 'butte', n: 2, r: [12, 18], h: [12, 18] }],
  aurora: [{ kind: 'arctic', n: 4, r: [55, 80], h: [45, 70] }],
  switzerland: [{ kind: 'peak', n: 4, r: [60, 85], h: [60, 90] }],
  norway: [{ kind: 'peak', n: 4, r: [50, 72], h: [45, 70] }],
  china: [{ kind: 'karst', n: 12, r: [10, 16], h: [26, 46] }],
  korea: [{ kind: 'granite', n: 4, r: [30, 45], h: [26, 40] }],
  japan: [{ kind: 'volcano', n: 1, r: [85, 95], h: [58, 66] }, { kind: 'hill', n: 3, r: [34, 50], h: [10, 16] }],
  indonesia: [{ kind: 'volcano', n: 1, r: [85, 95], h: [60, 72] }, { kind: 'hill', n: 3, r: [34, 50], h: [12, 18] }],
  indiasouth: [{ kind: 'hill', n: 5, r: [38, 58], h: [14, 24] }],
  meadow: [{ kind: 'hill', n: 6, r: [34, 52], h: [10, 18] }],
  renaissance: [{ kind: 'hill', n: 5, r: [40, 60], h: [10, 16] }],
  vintage: [{ kind: 'hill', n: 4, r: [34, 50], h: [8, 14] }],
  islamic: [{ kind: 'mesa', n: 2, r: [34, 46], h: [12, 18] }, { kind: 'hill', n: 2, r: [30, 44], h: [8, 12] }],
  mughal: [{ kind: 'hill', n: 3, r: [34, 48], h: [8, 12] }],
};

function place(land: RegionId): Landform[] {
  const specs = LANDFORM_LANDS[land];
  if (!specs) return [];
  const reg = REGIONS.find((r) => r.id === land)!, c = regionCenter(reg), rng = new Rng(`landforms:${land}`), out: Landform[] = [];
  const half = REGION_SIZE / 2;
  for (const sp of specs) {
    let made = 0;
    for (let tries = 0; tries < 400 && made < sp.n; tries++) {
      const r = rng.range(sp.r[0], sp.r[1]), h = rng.range(sp.h[0], sp.h[1]);
      // Out in the country, and mostly in the wide corners between the roads.
      const lx = rng.range(-half + r * 0.55, half - r * 0.55), lz = rng.range(-half + r * 0.55, half - r * 0.55);
      if (Math.hypot(lx, lz) < CITY_RADIUS + r * 0.9 + 25) continue;
      // Clear of the avenues and highways (they run along the axes to the border).
      if (Math.abs(lx) < r + 22 || Math.abs(lz) < r + 22) continue;
      const x = c.x + lx, z = c.z + lz;
      if (waterEdge(x, z).d < r + 14) continue;
      if (reservedAt(land, lx, lz, r + 10)) continue;
      if (PLOTS.some((p) => Math.abs(p.x - x) < PLOT_SIZE / 2 + r + 10 && Math.abs(p.z - z) < PLOT_SIZE / 2 + r + 10)) continue;
      if (FIELD_SITES.some((f) => Math.abs(f.x - x) < 24 + r + 10 && Math.abs(f.z - z) < 24 + r + 10)) continue;
      if (INSTITUTE_SITES.some((s) => Math.abs(s.x - x) < SITE_SIZE / 2 + r + 10 && Math.abs(s.z - z) < SITE_SIZE / 2 + r + 10)) continue;
      // The celebration castle's grounds, north of the Meadow.
      if (land === 'meadow' && Math.hypot(x, z + 292) < 72 + r + 30) continue;
      if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (o.r + r) * (o.kind === 'karst' && sp.kind === 'karst' ? 0.9 : 1.05))) continue;
      out.push({ id: `lf-${land}-${out.length}`, land, kind: sp.kind, x, z, r, h, seed: rng.int(1, 9999) });
      made++;
    }
  }
  return out;
}

export const LANDFORMS: Landform[] = REGIONS.flatMap((r) => place(r.id));
/** A 100 m grid of which landforms reach each cell, for quick lookups (heights are asked for millions of times). */
const CELL = 100;
const GRID = new Map<string, Landform[]>();
for (const lf of LANDFORMS) {
  const R = lf.r * 1.25;
  for (let gx = Math.floor((lf.x - R) / CELL); gx <= Math.floor((lf.x + R) / CELL); gx++)
    for (let gz = Math.floor((lf.z - R) / CELL); gz <= Math.floor((lf.z + R) / CELL); gz++) {
      const k = `${gx},${gz}`;
      (GRID.get(k) ?? GRID.set(k, []).get(k)!).push(lf);
    }
}
const NONE: Landform[] = [];
/** Landforms that may reach a point (across land borders too). */
function near(x: number, z: number): Landform[] {
  return GRID.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? NONE;
}

/** A landform's ragged outline: its radius at an angle, never a perfect circle. */
function rim(lf: Landform, a: number): number {
  return lf.r * (0.84 + 0.3 * fbm(Math.cos(a) * 1.6 + lf.seed * 0.013, Math.sin(a) * 1.6 - lf.seed * 0.007, 3));
}

/** How high one landform raises the ground at a point, and how much of it this point is (0..1). */
function shape(lf: Landform, x: number, z: number): { h: number; w: number } {
  const dx = x - lf.x, dz = z - lf.z, d = Math.hypot(dx, dz);
  if (d > lf.r * 1.25) return { h: 0, w: 0 };
  const a = Math.atan2(dz, dx), R = rim(lf, a), u = d / R;
  if (u >= 1) return { h: 0, w: 0 };
  const n = fbm(x * 0.03 + lf.seed, z * 0.03, 2);
  switch (lf.kind) {
    case 'mesa':
    case 'butte': {
      // Flat top, sides stepped in ledges (steep risers, flat benches), a skirt of scree at the foot.
      const t = smoothstep(1, lf.kind === 'mesa' ? 0.72 : 0.6, u);
      const steps = lf.kind === 'mesa' ? 3 : 2, s = t * steps, k = Math.floor(s);
      const stepped = (Math.min(k, steps) + smoothstep(0.55, 1, s - k)) / steps;
      const skirt = smoothstep(1, 0.8, u) * 0.08;
      return { h: lf.h * (Math.max(stepped, skirt) + (t > 0.99 ? (n - 0.5) * 0.04 : 0)), w: smoothstep(1, 0.85, u) };
    }
    case 'peak':
    case 'arctic': {
      // A ridged pyramidal peak: spurs radiating from the summit, gullies between.
      const ridge = 1 - Math.abs(Math.sin(a * (lf.kind === 'arctic' ? 4 : 3) + lf.seed + n * 1.5));
      const base = Math.pow(1 - u, 1.35) * (0.82 + 0.18 * ridge) + (n - 0.5) * 0.06 * (1 - u);
      return { h: lf.h * Math.max(0, base), w: smoothstep(1, 0.7, u) };
    }
    case 'karst': {
      // A limestone tower: sheer sides, a rounded, overgrown crown.
      const side = smoothstep(1, 0.72, u), crown = 1 - Math.pow(Math.min(1, u / 0.72), 3) * 0.12;
      return { h: lf.h * side * crown * (0.94 + 0.06 * n), w: smoothstep(1, 0.8, u) };
    }
    case 'granite': {
      // A granite dome: rounded, steepening to its foot.
      const base = Math.pow(Math.max(0, 1 - u * u), 0.75);
      return { h: lf.h * base * (0.92 + 0.08 * n), w: smoothstep(1, 0.6, u) };
    }
    case 'volcano': {
      // A great cone, concave sides, and a crater at the top.
      let base = Math.pow(1 - u, 1.6);
      if (u < 0.14) base = Math.pow(1 - 0.14, 1.6) - (0.14 - u) * 1.1;
      return { h: lf.h * base * (0.95 + 0.05 * n), w: smoothstep(1, 0.5, u) };
    }
    case 'hill':
    default: {
      const base = smoothstep(1, 0, u);
      return { h: lf.h * base * base * (3 - 2 * base) * (0.85 + 0.3 * n) * 0.8, w: smoothstep(1, 0.4, u) * 0.6 };
    }
  }
}

/** How much the landforms raise the ground here (they never lower it). */
export function landformHeight(x: number, z: number): number {
  let h = 0;
  for (const lf of near(x, z)) { const s = shape(lf, x, z); if (s.h > h) h = s.h; }
  return h;
}

/** The landform a point is on, if any, and how much. */
export function landformAt(x: number, z: number): { lf: Landform; w: number; rise: number } | null {
  let best: { lf: Landform; w: number; rise: number } | null = null;
  for (const lf of near(x, z)) {
    const s = shape(lf, x, z);
    if (s.w > 0 && (!best || s.h > best.rise)) best = { lf, w: s.w, rise: s.h };
  }
  return best;
}

// ───── colour ─────

const MESA_STRATA: Partial<Record<RegionId, string[]>> = {
  desert: ['#b8603a', '#c9804a', '#e0b07a', '#a8502e', '#d99a5a', '#f0d0a0'],
  egypt: ['#d4b07a', '#c49a62', '#e8cc98', '#b88a56'],
  middleeast: ['#b8905a', '#a07a4a', '#d0b07a', '#8a6a44'],
  indianorth: ['#c46a4a', '#d98a62', '#b85a3e', '#e8a882'],
  islamic: ['#b89a72', '#a08462', '#ccb28a'],
};
const tmp = new THREE.Color(), tmp2 = new THREE.Color();

/**
 * Colour the ground of a landform: strata bands on mesas, snow and ice on the peaks, pale granite,
 * grey limestone greened on its ledges, dark volcanic ash. `slope` is 0 (flat) … 1 (vertical).
 */
export function landformColor(x: number, z: number, h: number, slope: number, out: THREE.Color): void {
  const at = landformAt(x, z);
  if (!at) return;
  const { lf, w, rise } = at, top = rise / lf.h;
  const n = fbm(x * 0.08, z * 0.08, 2);
  switch (lf.kind) {
    case 'mesa':
    case 'butte': {
      // Horizontal bands by height, wavering a little; the flat top keeps the land's own ground.
      const pal = MESA_STRATA[lf.land] ?? MESA_STRATA.desert!;
      const band = Math.floor((h + fbm(x * 0.02, z * 0.02, 2) * 3) / 2.2);
      tmp.set(pal[((band % pal.length) + pal.length) % pal.length]).multiplyScalar(0.9 + n * 0.2);
      out.lerp(tmp, w * smoothstep(0.08, 0.3, slope));
      break;
    }
    case 'peak':
    case 'arctic': {
      const arctic = lf.kind === 'arctic';
      tmp.set(arctic ? '#a8c8e6' : '#9a9690').multiplyScalar(0.88 + n * 0.24);
      // Ice cliffs: sheer faces blue.
      if (arctic && slope > 0.45) tmp.lerp(tmp2.set('#7fb8e8'), 0.6);
      out.lerp(tmp, w * (arctic ? 0.8 : smoothstep(0.12, 0.3, slope)));
      // Snow caps: above a wavering line, and on the gentler faces.
      const cap = smoothstep(arctic ? 0.25 : 0.55, arctic ? 0.4 : 0.7, top + (n - 0.5) * 0.12) * (1 - smoothstep(0.55, 0.8, slope));
      out.lerp(tmp2.set(arctic ? '#eef6ff' : '#f7f9fc'), cap * w);
      break;
    }
    case 'karst': {
      tmp.set('#a6a49a').multiplyScalar(0.85 + n * 0.3);
      out.lerp(tmp, w * smoothstep(0.2, 0.45, slope));
      // Greenery clings to the ledges and the crown.
      if (slope < 0.35) out.lerp(tmp2.set('#4f8a4a').multiplyScalar(0.8 + n * 0.3), w * 0.85);
      break;
    }
    case 'granite': {
      tmp.set('#c4c0b8').multiplyScalar(0.88 + n * 0.22);
      out.lerp(tmp, w * smoothstep(0.15, 0.4, slope));
      break;
    }
    case 'volcano': {
      tmp.set(lf.land === 'japan' ? '#6a6460' : '#5a5048').multiplyScalar(0.85 + n * 0.3);
      out.lerp(tmp, w * smoothstep(0.35, 0.6, top));
      if (lf.land === 'japan') out.lerp(tmp2.set('#f5f8fc'), smoothstep(0.68, 0.78, top + (n - 0.5) * 0.08) * w);
      break;
    }
    default: {
      // Hills: rock only where the slope turns steep (the terrain already does this); a little shade.
      out.multiplyScalar(1 - w * 0.06 * (1 - n));
    }
  }
}
