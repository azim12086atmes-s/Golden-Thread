// The shape of the world: the Starlight Coast (owner sketch sheet 04,
// art-references/owner-sketch-spec.md). A 7.5 km island coast in an open sea,
// with the Princess Palace (B01) raised at the origin, garden terraces stepping
// down to Lantern Lake, and one straight golden causeway from the Bridge
// Pavilions (B20, where everyone arrives) north across the lake to the gate.
// Metres; north is -z. This module answers the ground and collision queries.

// --- world scale -------------------------------------------------------------------
// The owner's rule (Oct 11 18:42): height is the parameter and everything scales with
// it. The sketches are drawn at x1; the palace takes its labelled heights, which are
// 2.75 times its drawn proportions, so every drawn size and position is multiplied by S.
// Human-scale things (paths, rails, lamps, benches, trees and plants) do not scale.
import { crescentH, crescentRGB } from './crescent.js';
export const S = 2.75;
export const H_SCALE = S;
const WS = S;

// --- the drawn (x1) plan: sheet 04 and build sheet B01 ----------------------------------
const PAL1 = { y: 290, hw: 400, hd: 340 };   // sky palace (Oct 17): 797.5 m world
const TERRACES1 = [
  { name: 'upper', y: 290, z0: 340, z1: 560, hw: 470 },
  { name: 'middle', y: 270, z0: 560, z1: 720, hw: 520 },
  { name: 'lower', y: 250, z0: 720, z1: 880, hw: 560 },
];
const STAIRS1 = [
  [560, 592, 290, 270, 30], [720, 752, 270, 250, 30],                     // centre, either side of the water stair
  ...[-1, 1].flatMap((s) => [[560, 592, 290, 270, 12, s * 330], [720, 752, 270, 250, 12, s * 380]]),
];
const LAKE1 = { x: -150, z: 1500, rx: 1650, rz: 620 };
const B20_1 = { x: 0, z: 2335, r: 72, y: 5 };
const SITES1 = {
  B02: { name: 'Moon Water Palace', x: -630, z: 1320, pad: { r: 150, y: 5, e: 30 } },
  B03: { name: 'Star Chapel', x: 750, z: 1410, pad: { r: 140, y: 5, e: 30 } },
  B04: { name: 'Rose Keep', x: -960, z: -540, pad: { r: 70, y: 95, e: 150 } },
  B05: { name: 'Misty Keep', x: 1020, z: -900, pad: { r: 70, y: 210, e: 260 } },
  B06: { name: 'Pagoda', x: 1050, z: -420, pad: { r: 70, y: 55, e: 160 } },
  B07: { name: 'Temple Rotundas', x: -30, z: -1260, pad: { r: 190, y: 75, e: 200 } },
  B08: { name: 'Colosseum', x: -1020, z: -1140, pad: { r: 170, y: 60, e: 180 } },
  B09: { name: 'Lagoon City', x: -2460, z: 1200, pad: { r: 120, y: 4, e: 25 } },
  B10: { name: 'Canyon Palace', x: 1560, z: 1560, pad: { r: 90, y: 10, e: 40 } },
  B11: { name: 'Crescent Arch', x: 2640, z: 1920, pad: { r: 120, y: 6, e: 150 } },
  B12: { name: 'Storybook Village', x: -2400, z: 780, pad: { r: 200, y: 7, e: 150 } },
  B13: { name: 'Windmill', x: -2190, z: 240, pad: { r: 60, y: 48, e: 160 } },
  B14: { name: 'Pillar Sky City', x: 2220, z: 240, pad: { r: 300, y: 20, e: 200 } },
  B15: { name: 'Jungle Temple', x: 1860, z: 2580, pad: { r: 140, y: 30, e: 160 } },
  B16: { name: 'Fjord Longhouse', x: -2200, z: -900, pad: { r: 90, y: 8, e: 120 } },
  B17: { name: 'Glowwood Ruin', x: -2040, z: -300, pad: { r: 110, y: 38, e: 160 } },
  B18: { name: 'Mother Tree', x: -1320, z: 1800, pad: { r: 150, y: 5, e: 60 } },
  B19: { name: 'Lantern Cove', x: -1650, z: 2180, pad: { r: 120, y: 4, e: 80 } },
  B20: { name: 'Bridge Pavilions', x: B20_1.x, z: B20_1.z, pad: { r: 110, y: B20_1.y, e: 120 } },
  B21: { name: 'Tidal Observatory', x: -2580, z: 2760, pad: { r: 100, y: 26, e: 140 } },
  B22: { name: 'Lighthouse', x: -1920, z: 3180, pad: { r: 70, y: 10, e: 50 } },
  B23: { name: 'Sea Pavilion', x: 1620, z: 3480, pad: { r: 110, y: 4, e: 100 } },
  B24: { name: 'Reef Shrine', x: 2940, z: 3120, pad: { r: 60, y: 2.5, e: 40 } },
  B25: { name: 'Crystal Conservatory', x: -420, z: -540, pad: { r: 80, y: 40, e: 8 } },
};
const EXTRA_PADS1 = [
  { x: -2650, z: 1050, r: 70, y: 4, e: 25 }, { x: -2330, z: 1380, r: 60, y: 4, e: 25 },   // Lagoon City islets
];

// --- the palace and its approach (world metres = drawn x S) -----------------------------
// B01 is measured off sheet 03 (south elevation and roof plan) in drawn metres, with the
// Rose Gate on x = 0 and the front boundary towers at z = +340. The palace is not
// symmetric about the gate: the great dome stands west, the spire cluster east, and the
// east wing runs 65 m further out than the west one, as drawn.
export const PAL = { x: 0, z: 0, y: PAL1.y * S, hw: 450 * S, hd: PAL1.hd * S, x0: -385 * S, x1: 450 * S, z0: -338 * S };
// The stepped garden tiers in drawn metres: [x0, x1, z0, z1, top]. Each roof is a walkable garden.
export const PALACE_TIERS = [
  [-385, 450, -338, 235, 52],                                // T1 the arcaded ground storey (and the gate landing)
  [-330, 400, -300, 191, 154],                               // T2 the great-lancet storey
  [-260, 330, -260, 110, 186],                               // T3 the dome terrace
  [-130, 260, -200, 40, 216],                                // T4 the crown garden
];
// Plans in drawn metres, as [x, z] outlines. The owner's notes on sheet 03 (11 Oct): no level is
// a plain box. The lancet storey (T2) and the dome terrace (T3) round in at their front corners
// as curved wings of uneven length, following the walls above; the ground storey's front steps
// in depth, from the stair-foot landings (furthest out) through slanted stair flanks, projecting
// pavilions and set-back two-storey arcades, to the corners (deepest).
function roundedFront(x0, x1, z0, z1, [lrx, lrz], [rrx, rrz], n = 12) {
  const pts = [[x0, z0], [x1, z0], [x1, z1 - rrz]];
  for (let i = 1; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([x1 - rrx + Math.cos(a) * rrx, z1 - rrz + Math.sin(a) * rrz]); }
  pts.push([x0 + lrx, z1]);
  for (let i = 1; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI / 2; pts.push([x0 + lrx + Math.cos(a) * lrx, z1 - lrz + Math.sin(a) * lrz]); }
  return pts;
}
export const PALACE_PLANS = [
  null,
  roundedFront(-330, 400, -300, 191, [130, 81], [130, 71]),
  roundedFront(-260, 330, -260, 110, [140, 80], [130, 60]),
  null,
];
// the stepped ground-storey front, each block running back to the podium face (z 235):
// { pts, top, kind } with kind landing | flank | pavilion | arcade | upper | return
const L1 = (sd, spec) => spec.map(([kind, top, front]) => ({ kind, top, pts: [...front.map(([x, z]) => [sd * x, z]), [sd * front[front.length - 1][0], 235], [sd * front[0][0], 235]] }));
export const PALACE_BLOCKS = [
  ...L1(-1, [['landing', 14, [[110, 350], [150, 350]]], ['flank', 24, [[150, 350], [196, 300]]], ['pavilion', 46, [[196, 312], [232, 312]]],
    ['arcade', 30, [[232, 296], [330, 296]]], ['upper', 44, [[232, 284], [330, 284]]], ['return', 36, [[330, 296], [385, 250]]]]),
  ...L1(1, [['landing', 12, [[110, 346], [158, 346]]], ['flank', 22, [[158, 346], [200, 306]]], ['pavilion', 48, [[200, 318], [238, 318]]],
    ['arcade', 32, [[238, 300], [400, 300]]], ['upper', 46, [[238, 288], [400, 288]]], ['return', 38, [[400, 300], [450, 258]]]]),
  // the arcaded hall wall rising behind the gate gable, under the spire cluster (sheet 03)
  { kind: 'hall', top: 186, pts: [[-64, 191], [64, 191], [64, 179], [-64, 179]] },
  // the stepped wings between the ground storey and the lancet storey (owner's hi-res elevation,
  // 11 Oct): each a lower storey of dark-blue arched windows under a balustrade, standing out from
  // the wall above in a different length, the outer ones curving round at the end
  { kind: 'wing', top: 97, pts: roundedFront(342, 404, 150, 232, [30, 30], [30, 30], 4) },
  { kind: 'wing', top: 117, pts: roundedFront(246, 346, 150, 222, [4, 4], [20, 18], 3) },
  { kind: 'wing', top: 107, pts: roundedFront(-358, -212, 150, 224, [34, 30], [4, 4], 4) },
];
export function inPlan(pts, x, z) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function tierContains(k, x, z) {
  const [x0, x1, z0, z1] = PALACE_TIERS[k];
  if (x < x0 || x > x1 || z < z0 || z > z1) return false;
  return !PALACE_PLANS[k] || inPlan(PALACE_PLANS[k], x, z);
}
// the roof height (drawn metres) at a drawn point, or 0 off the palace
export function palaceTop(x, z) {
  let top = 0;
  PALACE_TIERS.forEach((t, k) => { if (t[4] > top && tierContains(k, x, z)) top = t[4]; });
  for (const b of PALACE_BLOCKS) if (b.top > top && inPlan(b.pts, x, z)) top = b.top;
  return top;
}
export function palaceRoofY(x, z) {
  const t = palaceTop(x / S, z / S);
  return t ? PAL.y + t * S : null;
}
// The Rose Gate (A003): 54 x 93 m drawn, its sill on the podium roof, its face at z 205.
export const GATE = { w: 54 * S, h: 93 * S, sill: 52 * S, z: 205 * S };
export const CASTLE = { x: 0, z: GATE.z, y: PAL.y + GATE.sill, base: PAL.y };   // z: gate face, y: gate sill
const GATE_SPRING = (93 - 54 * 0.866) * S;
export const PALACE_ENTRANCE = Object.freeze({
  minX: -27 * S, maxX: 27 * S, minZ: 171 * S, maxZ: 205 * S,
  y0: CASTLE.y, y1: CASTLE.y + GATE_SPRING, colliderY0: CASTLE.y - 2,
  floorY: CASTLE.y, ceilingY: CASTLE.y + GATE_SPRING,
});
// The cascade court cuts the podium: a water stair between twin flights, from the gate landing down to the upper terrace.
export const CASCADE = { z0: 235 * S, z1: 340 * S, hw: 110 * S, water: 30 * S, flights: [[-72.5 * S, 42.5 * S], [72.5 * S, 42.5 * S]] };
// G04 terrace gardens from the palace down to the lake (sheet 15): upper, middle, lower
export const TERRACES = TERRACES1.map((t) => ({ ...t, y: t.y * S, z0: t.z0 * S, z1: t.z1 * S, hw: t.hw * S }));
// flights of the grand stair between the terraces: [z top, z bottom, y top, y bottom, half width, x]
export const STAIRS = STAIRS1.map(([za, zb, ya, yb, hw, cx = 0]) => [za * S, zb * S, ya * S, yb * S, hw * S, cx * S]);
export const CAUSEWAY = { x: 0, z0: 1060 * S, z1: 2262 * S, hw: 15, y: 6 };   // starts at the foot of the sky palace's south cliff
export const B20 = { x: B20_1.x * S, z: B20_1.z * S, r: B20_1.r * S, y: B20_1.y * S };   // Bridge Pavilions plaza: the spawn
export const SPAWN = { x: -710, z: 12020 };   // the cloud platform before the mountain gate (sky palace, Oct 17)
export const PLAZA = { x: 0, z: 362 * S, y: PAL.y, r: 14 * S };       // the cascade's lotus basin at the stair foot
export const LAKE = { x: LAKE1.x * S, z: LAKE1.z * S, rx: LAKE1.rx * S, rz: LAKE1.rz * S, y: 0 };
export const SEA_Y = 0;
// arched bridges from the causeway to the two lake islands
export const BRANCHES = [
  { to: 'B02', pts: [[-CAUSEWAY.hw, 1320 * S], [-480 * S, 1320 * S]], hw: 6, y: 6, hump: 14 },
  { to: 'B03', pts: [[CAUSEWAY.hw, 1410 * S], [628 * S, 1410 * S]], hw: 6, y: 6, hump: 14 },
];

// --- the districts (sheet 04 table), with the ground each one stands on -----------------
// the ten Grand Path towns (study thread, data/world/towns.json): flat only out to the town edge, hills beyond
const TOWN_PADS = { B12: { r: 195.2, e: 60 }, B20: { r: 215.8, e: 60 }, B21: { r: 135.7, e: 60 }, B02: { r: 187.5, e: 60 }, B06: { r: 155.6, e: 60 }, B18: { r: 200.8, e: 60 }, B04: { r: 186.3, e: 60 }, B07: { r: 219.4, e: 60 }, B08: { r: 224.5, e: 60 }, B26: { r: 177.6, e: 60 } };
// pad: flattened ground { r, y, e (blend width) }
export const SITES = Object.fromEntries(Object.entries(SITES1).map(([k, s]) => [k, {
  // each district's flat ground sits at the crescent's own height there
  name: s.name, x: s.x * S, z: s.z * S, pad: { r: TOWN_PADS[k]?.r ?? s.pad.r * S, y: k === 'B20' ? s.pad.y * S : Math.max(crescentH(s.x * S, s.z * S), 3), e: TOWN_PADS[k]?.e ?? s.pad.e * S },
}]));
const EXTRA_PADS = EXTRA_PADS1.map((p) => ({ x: p.x * S, z: p.z * S, r: p.r * S, y: Math.max(crescentH(p.x * S, p.z * S), 3), e: p.e * S }));

// --- floating islands, reached by sky portals ------------------------------------------
export const ISLANDS = [
  { id: 'castle', name: 'Starlight Coast', x: 0, z: 0, y: 0, r: 5200 * S, main: true },
  { id: 'garden', name: 'Crystal Garden', x: 1560 * S, z: -1680 * S, y: 520 * S, r: 76, hue: 0.52 },
  { id: 'aurora', name: 'Aurora Isle', x: -3240 * S, z: -1500 * S, y: 600 * S, r: 64, hue: 0.42 },
  { id: 'lake', name: 'Lantern Isle', x: -1100 * S, z: 3000 * S, y: 450 * S, r: 88, hue: 0.12 },
  { id: 'meadow', name: 'Unicorn Meadow', x: 2760 * S, z: 4320 * S, y: 420 * S, r: 80, hue: 0.85 },
  { id: 'star', name: 'Starfall Isle', x: -180 * S, z: -2280 * S, y: 680 * S, r: 60, hue: 0.62 },
];
export const MAIN = ISLANDS[0];
const SKY = ISLANDS.filter((i) => !i.main);
export const LAKE_POND = { x: ISLANDS[3].x, z: ISLANDS[3].z, r: 22 };

// Sky portals stand in a row on the upper terrace before the palace.
const PORTAL_X = { lake: -420 * S, aurora: -330 * S, garden: 330 * S, star: 420 * S, meadow: 240 * S };
export const PORTALS = SKY.map((isl) => {
  const x = PORTAL_X[isl.id], z = 520 * S;
  return { to: isl.id, name: isl.name, x, z, y: PAL.y, angle: Math.atan2(isl.z - z, isl.x - x) };
});
export const RETURNS = SKY.map((isl) => {
  const a = Math.atan2(-isl.z, -isl.x), d = isl.r - 10;
  return { from: isl.id, x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, y: isl.y, angle: a };
});

// Solid things the player bumps into: circles { x, z, r } and boxes, with an optional y0..y1 band.
export const COLLIDERS = [];
export function addCollider(c) { COLLIDERS.push(c); }

export function islandAt(x, z, y = 0) {
  for (const isl of SKY) {
    const dx = x - isl.x, dz = z - isl.z;
    if (dx * dx + dz * dz < isl.r * isl.r && y > isl.y - 6) return isl;
  }
  return MAIN;
}

// --- noise ------------------------------------------------------------------------
function h2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ridge = (x, z) => 1 - Math.abs(2 * vnoise(x, z) - 1);

// --- the coastline ------------------------------------------------------------------
// Traced from sheet 04, clockwise from the north-west (drawn metres).
const COAST = [
  [-2700, -1800], [-1800, -2350], [-700, -2500], [500, -2450], [1500, -2250], [2350, -1850], [2900, -1150],
  [3150, -350], [3050, 450], [2850, 1150], [3050, 1850], [2950, 2550], [2500, 3050], [2050, 3550], [1500, 3750],
  [1050, 3350], [850, 2850], [450, 2700], [0, 2640], [-600, 2700], [-1250, 2640], [-1700, 2580], [-2000, 2720],
  [-2300, 3000], [-2800, 2980], [-3000, 2450], [-3050, 1800], [-3250, 1200], [-3150, 600], [-3350, 0],
  [-3250, -700], [-3050, -1300],
];
function coastRaw(x, z) {
  let inside = false, best = Infinity;
  for (let i = 0, j = COAST.length - 1; i < COAST.length; j = i++) {
    const [ax, az] = COAST[j], [bx, bz] = COAST[i];
    if ((az > z) !== (bz > z) && x < ax + ((z - az) * (bx - ax)) / (bz - az)) inside = !inside;
    const ex = bx - ax, ez = bz - az, t = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
    best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return inside ? best : -best;
}

// carved water: lagoon, coves and the fjord, as line segments with a half width
const CARVES = [
  { a: [-2550, 1250], b: [-2550, 1250], r: 380 },                  // B09 lagoon
  { a: [-2850, 1250], b: [-3500, 1250], r: 90 },                   // its mouth to the sea
  { a: [-1650, 2420], b: [-1650, 2900], r: 230 },                  // B19 Lantern Cove harbour
  { a: [-3600, -1300], b: [-2330, -1020], r: 110 },                // B16 fjord
  { a: [2500, 1850], b: [3300, 1850], r: 70 },                     // the inlet under the Crescent Arch
];
function segDist(x, z, a, b) {
  const ex = b[0] - a[0], ez = b[1] - a[1], L = ex * ex + ez * ez;
  const t = L ? Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / L)) : 0;
  return Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
}

// the B10 red canyon: a mesa cut by a winding gorge
const CANYON1 = { x: 1600, z: 1600, r: 430, top: 95, gorge: [[1230, 1330], [1480, 1500], [1640, 1620], [1960, 1900]], hw: 55 };

// offshore sea stacks, scattered along the coast
const STACKS = [];
{
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 46; k++) {
    const i = Math.floor(rnd() * COAST.length), [ax, az] = COAST[i], [bx, bz] = COAST[(i + 1) % COAST.length];
    const t = rnd(), ex = bx - ax, ez = bz - az, L = Math.hypot(ex, ez);
    const off = 160 + rnd() * 420;                                  // outward normal of a clockwise ring is (-ez, ex)
    STACKS.push({ x: ax + ex * t - (ez / L) * off, z: az + ez * t + (ex / L) * off, r: 18 + rnd() * 40, h: 25 + rnd() * 70 });
  }
}

const CANYON = { x: CANYON1.x * S, z: CANYON1.z * S, r: CANYON1.r * S };
const PAD_LIST = [...Object.values(SITES).map((s) => ({ x: s.x, z: s.z, ...s.pad })), ...EXTRA_PADS];

// signed distance to the lake shore (negative on the water), drawn metres
function lake1(x, z) {
  const dx = (x - LAKE1.x) / LAKE1.rx, dz = (z - LAKE1.z) / LAKE1.rz;
  return (Math.hypot(dx, dz) - 1) * LAKE1.rz + (vnoise(x * 0.004, z * 0.004) - 0.5) * 140 + (vnoise(x * 0.015, z * 0.015) - 0.5) * 30;
}
export function lakeDistance(x, z) { return lake1(x / S, z / S) * S; }

// the palace plateau and the terraces, drawn metres: [ground y or null, blend 0..1]
function palaceGround(x, z) {
  const ax = Math.abs(x);
  // the plateau the palace stands on, with B25 beside it
  // (6 drawn m inside the cliff lip, so the blend ends at the lip and the cliff walls stay clear)
  const dx = Math.max(0, x - 464, -419 - x), dz = Math.max(0, -414 - z, z - PAL1.hd);
  const d = Math.hypot(dx, dz);
  // (the heightmap holds the plateau and terraces as a sheer mesa in its moat, so the blend is only a lip)
  if (z <= PAL1.hd + 2 && d < 6) return [PAL1.y - 0.4, 1 - smooth(0, 6, d)];
  for (const T of TERRACES1) {
    if (z > T.z0 - 2 && z <= T.z1 + 2) {
      const e = Math.max(0, ax - (T.hw - 6));
      if (e < 6) return [T.y - 0.4, 1 - smooth(0, 6, e)];
    }
  }
  return [null, 0];
}

// the natural land in drawn metres: coast, mountains, sea stacks, the lake and the canyon
function natural1(x, z) {
  let d = coastRaw(x, z) + (vnoise(x * 0.0022, z * 0.0022) - 0.5) * 260 + (vnoise(x * 0.009, z * 0.009) - 0.5) * 70;
  for (const c of CARVES) d = Math.min(d, segDist(x, z, c.a, c.b) - c.r - (vnoise(x * 0.01, z * 0.01) - 0.5) * 60);
  let h;
  if (d < 0) h = -16 * smooth(0, -300, d) - 30 * smooth(-300, -1500, d) - 0.8 * smooth(0, -30, d);
  else {
    const inland = smooth(60, 600, d);
    const hills = vnoise(x * 0.0018 + 7, z * 0.0018) * 0.6 + vnoise(x * 0.006, z * 0.006) * 0.3 + vnoise(x * 0.02, z * 0.02) * 0.1;
    h = 2.2 * smooth(-20, 110, d) + inland * (6 + hills * 60);
    // the mountain spine in the north and north-west, high ground in the north-east
    const M = Math.max(smooth(-1300, -2000, z), smooth(-1800, -2700, x) * smooth(700, -300, z) * 0.9, smooth(2200, 2900, x) * smooth(700, -800, z) * 0.6);
    if (M > 0) {
      const r1 = ridge(x * 0.0011, z * 0.0011), r2 = ridge(x * 0.003 + 3, z * 0.003);
      h += M * inland * (110 + 380 * r1 * r1 + 90 * r2);
    }
  }
  for (const s of STACKS) {
    const q = Math.hypot(x - s.x, z - s.z);
    if (q < s.r * 2) h = Math.max(h, s.h * (1 - smooth(s.r * 0.6, s.r * 2, q)) - 8);
  }
  // Lantern Lake
  const ld = lake1(x, z);
  if (ld < 170) h = lerp(-0.8 - 11 * smooth(0, -280, ld), Math.max(h, 1.4), smooth(-10, 170, ld));
  // the red canyon mesa and its gorge
  const C = CANYON1, cd = Math.hypot(x - C.x, z - C.z);
  if (cd < C.r + 200) {
    const n = vnoise(x * 0.012, z * 0.012);
    h = lerp(h, C.top + n * 30 + Math.floor(n * 4) * 8, 1 - smooth(C.r - 60, C.r + 120 + n * 60, cd));
    let g = Infinity;
    for (let i = 0; i < C.gorge.length - 1; i++) g = Math.min(g, segDist(x, z, C.gorge[i], C.gorge[i + 1]));
    h = lerp(10, h, smooth(C.hw, C.hw + 30, g));
  }
  return h;
}

// world ground: the drawn land scaled by S, then the district pads, the spawn shore and the palace plateau
export function terrainRaw(x, z) {
  // the crescent world's ground, with Lantern Lake carved for the causeway
  let h = crescentH(x, z);
  const ld = lake1(x / S, z / S);
  if (ld < 170 && h < 60) h = lerp(   // (the sky palace's rings and walls stand in the heightmap: no carving there)
    (-0.8 - 11 * smooth(0, -280, ld)) * S, Math.max(h, 1.4 * S), smooth(-10, 170, ld));
  // flat ground under each district
  for (const p of PAD_LIST) {
    const q = Math.hypot(x - p.x, z - p.z);
    if (q < p.r + p.e) h = lerp(p.y - 0.3, h, smooth(p.r, p.r + p.e, q));
  }
  // B20 shore: the causeway's south end lands on a broad flat shore
  if (Math.abs(x) < 200 * S && z > 2150 * S && z < 2480 * S) h = lerp(h, B20.y - 0.3, 1 - smooth(120 * S, 200 * S, Math.abs(x)));
  const [py, pb] = palaceGround(x / S, z / S);
  if (py !== null) h = lerp(h, py * S, pb);
  return h;
}

// --- the baked height grid ---------------------------------------------------------------
const GX0 = -4800 * S, GZ0 = -3400 * S, GSPAN = 9600 * S, GSTEP = 30, GN = GSPAN / GSTEP + 1;
let grid = null, mgrid = null, hm = null;
function bake() {
  grid = new Float32Array(GN * GN); mgrid = new Float32Array(GN * GN); hm = new Float32Array(GN * GN * 2);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const x = GX0 + i * GSTEP, z = GZ0 + j * GSTEP, h = terrainRaw(x, z), k = j * GN + i;
    const m = reliefMask(x, z, h, 120);
    grid[k] = h + relief(x, z, m);
    mgrid[k] = reliefMask(x, z, h, 40);
    hm[k * 2] = grid[k]; hm[k * 2 + 1] = mgrid[k];
  }
}

// Walking-scale relief (beauty slice, Oct 18). The 30 m height grid can only hold hills; what you
// feel underfoot in a real meadow is the 3-60 m stuff: swales, knolls, hummocks. It lives in one
// small tiling height texture (2 m texels, 512 m tile) shared by the CPU (collision, placement,
// the terrain mesh) and the graphics card (the grass), sampled the same way on both, so the grass
// sits exactly on the ground. Its strength is a mask baked beside the height grid: off the place
// pads, roads' towns, the palace grounds, the lake and the high rock.
const FR_N = 256, FR_T = 2;
let fine = null;
function bakeFine() {
  fine = new Float32Array(FR_N * FR_N);
  const hsh = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // periodic value noise: P lattice cells across the tile, quintic fade so slopes stay smooth
  const pn = (u, v, P, s) => {
    const x = u * P, y = v * P, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const q = (t) => t * t * t * (t * (t * 6 - 15) + 10), a = q(fx), b = q(fy), w = (n) => ((n % P) + P) % P;
    const h00 = hsh(w(i), w(j), s), h10 = hsh(w(i + 1), w(j), s), h01 = hsh(w(i), w(j + 1), s), h11 = hsh(w(i + 1), w(j + 1), s);
    return (h00 + (h10 - h00) * a) * (1 - b) + (h01 + (h11 - h01) * a) * b - 0.5;
  };
  for (let j = 0; j < FR_N; j++) for (let i = 0; i < FR_N; i++) {
    const u = i / FR_N, v = j / FR_N;
    // swales (~64 m), knolls (~21 m, ridged so they read as rounded mounds), hummocks (~8 m)
    const sw = pn(u, v, 8, 1) * 1.9;
    const kn = (0.5 - Math.abs(pn(u, v, 24, 2))) * 2 - 0.5;
    const hu = pn(u, v, 64, 3);
    fine[j * FR_N + i] = sw + kn * 0.75 + hu * 0.32;
  }
}
export const FINE_RELIEF = { n: FR_N, texel: FR_T, get data() { if (!fine) bakeFine(); return fine; } };
function fineAt(x, z) {
  if (!fine) bakeFine();
  const fx = x / FR_T, fz = z / FR_T, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, M = FR_N - 1;
  const i0 = i & M, j0 = j & M, i1 = (i + 1) & M, j1 = (j + 1) & M;
  const a = fine[j0 * FR_N + i0], b = fine[j0 * FR_N + i1], c = fine[j1 * FR_N + i0], e = fine[j1 * FR_N + i1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}

// rolling ground (world pass 2, after Arkenfall): the open land between places rises and falls in
// knolls and swales instead of lying as one smooth sheet. Kept off the place pads, the palace
// grounds, the lake and shore, and the high mountains (which have their own shape).
function reliefMask(x, z, h, padGap) {
  let m = smooth(3, 18, h) * smooth(800, 500, h);
  if (m <= 0) return 0;
  for (const p of PAD_LIST) {
    const q = Math.hypot(x - p.x, z - p.z);
    if (q < p.r + p.e + padGap) m *= smooth(p.r + p.e, p.r + p.e + padGap, q);
  }
  // palace grounds and the spawn shore stay as drawn
  const px = Math.max(0, -760 * S - x, x - 820 * S), pz = Math.max(0, -760 * S - z, z - 1010 * S);
  m *= smooth(0, 160, Math.hypot(px, pz));
  const sx = Math.max(0, Math.abs(x) - 260 * S), sz = Math.max(0, 2100 * S - z, z - 2550 * S);
  m *= smooth(0, 160, Math.hypot(sx, sz));
  m *= smooth(170, 320, lake1(x / S, z / S) * S);
  return m;
}
function relief(x, z, m) {
  if (m <= 0) return 0;
  const a = vnoise(x / 260 + 31, z / 260 - 17), b = vnoise(x / 85 - 5, z / 85 + 13);
  return ((a - 0.5) * 10 + (b - 0.5) * 4) * m;
}
// data: heights; hm: interleaved height and walking-relief strength (an RG texture for the grass)
export const TERRAIN_GRID = { x0: GX0, z0: GZ0, span: GSPAN, step: GSTEP, n: GN, get data() { if (!grid) bake(); return grid; }, get hm() { if (!grid) bake(); return hm; } };
// The tarn and its brook in the beauty slice (Oct 18): a small lake in the valley below the
// crescent wall, fed by a brook running down the valley floor. Carved into the ground here (and
// identically in the grass shader, meadow.js), drawn by brook.js.
export const TARN = { x: -6040, z: 2828, r: 40, level: 171.6, depth: 3.2 };
// it rises at a spring in the hollow below the saddle (z ≈ 2480) and falls all the way to the tarn
export const BROOK = [[-5966, 2482], [-5950, 2540], [-5932, 2640], [-5945, 2730], [-5990, 2790], [-6020, 2812]];
export const BROOK_BOX = [-6140, 2440, -5890, 2930];   // holds the brook and the tarn with its whole bank
// the tarn's shore wanders: its radius in direction a
export const tarnR = (a) => TARN.r * (1 + 0.16 * Math.sin(3 * a + 1.3) + 0.08 * Math.sin(5 * a + 0.4));
function brookDist(x, z) {
  let best = 1e9;
  for (let k = 0; k < BROOK.length - 1; k++) {
    const [ax, az] = BROOK[k], [bx, bz] = BROOK[k + 1], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// h: the height grid's height, fr: the walking-scale relief on top of it
function carveWater(x, z, h, fr) {
  if (x < BROOK_BOX[0] || x > BROOK_BOX[2] || z < BROOK_BOX[1] || z > BROOK_BOX[3]) return h + fr;
  // the brook: a channel a metre deep with soft banks; its bed keeps to the smooth valley floor (no
  // hummocks in it), so the water always runs downhill
  const bd = brookDist(x, z);
  h += fr * smooth(4, 14, bd);
  if (bd < 7) h -= 1.0 * (1 - smooth(1.2, 7, bd));
  const dx = x - TARN.x, dz = z - TARN.z, d = Math.hypot(dx, dz), R = tarnR(Math.atan2(dz, dx)), t = d / R;
  if (t < 1) return TARN.level - 0.25 - TARN.depth * smooth(1, 0.2, t);
  if (t < 1 + 34 / R) return TARN.level + 0.2 + (h - TARN.level - 0.2) * smooth(1, 1 + 34 / R, t);
  return h;
}
// open water of the slice here? (no grass, no trees)
export function sliceWaterAt(x, z, pad = 0) {
  if (x < BROOK_BOX[0] || x > BROOK_BOX[2] || z < BROOK_BOX[1] || z > BROOK_BOX[3]) return false;
  const dx = x - TARN.x, dz = z - TARN.z;
  return Math.hypot(dx, dz) < tarnR(Math.atan2(dz, dx)) + 1 + pad || brookDist(x, z) < 1.6 + pad;
}

function mainTerrain(x, z) {
  if (!grid) bake();
  const fx = Math.min(GN - 1.001, Math.max(0, (x - GX0) / GSTEP)), fz = Math.min(GN - 1.001, Math.max(0, (z - GZ0) / GSTEP));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, n = GN;
  const a = grid[j * n + i], b = grid[j * n + i + 1], c = grid[(j + 1) * n + i], e = grid[(j + 1) * n + i + 1];
  const h = a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
  const ma = mgrid[j * n + i], mb = mgrid[j * n + i + 1], mc = mgrid[(j + 1) * n + i], me = mgrid[(j + 1) * n + i + 1];
  const m = ma + (mb - ma) * u + (mc - ma) * v + (ma - mb - mc + me) * u * v;
  return carveWater(x, z, h, m > 0 ? m * fineAt(x, z) : 0);
}

export function terrainHeight(isl, x, z) {
  if (isl.main) return mainTerrain(x, z);
  const n = vnoise(x * 0.028 + isl.x, z * 0.028 + isl.z) * 0.75 + vnoise(x * 0.09, z * 0.09) * 0.25;
  const rim = smooth(isl.r, isl.r - 14, Math.hypot(x - isl.x, z - isl.z));
  let d = Math.hypot(x - LAKE_POND.x, z - LAKE_POND.z) - LAKE_POND.r - 4;
  for (const p of RETURNS) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - 10);
  d = Math.min(d, Math.hypot(x - isl.x, z - isl.z) - 12);
  return Math.max(0, n - 0.25) * 8 * rim * smooth(0, 14, d);
}

// forest cover 0..1: woods everywhere inland, thinning on high rock and round the districts
export function forestAt(x, z, h = mainTerrain(x, z)) {
  const hd = h / S;
  if (sliceWaterAt(x, z, 5)) return 0;
  if (hd < 3 || hd > 330) return 0;
  let f = smooth(0.38, 0.58, vnoise(x * 0.0035 / S + 11, z * 0.0035 / S - 4) * 0.7 + vnoise(x * 0.015 / S, z * 0.015 / S) * 0.3);
  f *= smooth(330, 240, hd);
  if (x > -700 * S && x < 760 * S && z > -700 * S && z < 950 * S) f = 0;   // palace grounds
  if (Math.abs(x) < 260 * S && z > 2100 * S && z < 2550 * S) f = 0;       // spawn shore
  if (Math.hypot(x - CANYON.x, z - CANYON.z) < CANYON.r + 80 * S) f *= 0.15;
  for (const p of PAD_LIST) if (Math.hypot(x - p.x, z - p.z) < p.r + 30 * S) return 0;
  return f;
}

// Ground colour as HSL: meadow and forest greens, sand on beaches, lilac rock, snow, red canyon.
const ISLE_HUE = { castle: 0.3, garden: 0.34, aurora: 0.38, lake: 0.29, meadow: 0.27, star: 0.35 };
export function groundHSL(isl, x, z, h) {
  const big = vnoise(x * 0.012 + 50, z * 0.012 + 9), small = vnoise(x * 0.08, z * 0.08);
  let H = (ISLE_HUE[isl.id] ?? 0.28) - big * 0.05 + (small - 0.5) * 0.025;
  let Sat = 0.6 + big * 0.14, L = 0.33 + big * 0.12 + (small - 0.5) * 0.05;
  if (!isl.main) return [H, Sat, L];
  const rgb = crescentRGB(x, z);
  if (rgb) {
    // the painted crescent colour, a little brighter and more saturated for the storybook look
    const [r, g, b] = rgb, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let hh = 0;
    if (d > 1e-5) hh = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : mx === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
    const ss = d < 1e-5 ? 0 : d / (1 - Math.abs(2 * l - 1));
    const sand = smooth(1.5 * S, 0.5 * S, h);
    return [lerp(hh + (small - 0.5) * 0.02, 0.11, sand * 0.5), Math.min(1, ss * 1.2 + 0.05), Math.min(0.92, l * 1.08 + (big - 0.5) * 0.06 + (small - 0.5) * 0.04)];
  }
  const e = 6, s = Math.hypot(mainTerrain(x + e, z) - mainTerrain(x - e, z), mainTerrain(x, z + e) - mainTerrain(x, z - e)) / (2 * e);
  const f = forestAt(x, z, h);
  H = lerp(H, 0.33, f * 0.6); L = lerp(L, 0.2 + big * 0.06, f * 0.8); Sat = lerp(Sat, 0.55, f * 0.5);
  const hd = h / WS;
  const sand = smooth(4.5, 2, hd) * (hd > -6 ? 1 : 0.6);
  H = lerp(H, 0.11, sand); Sat = lerp(Sat, 0.42, sand); L = lerp(L, 0.72 + small * 0.06, sand);
  const rock = Math.max(smooth(0.75, 1.3, s), smooth(220, 340, hd));
  H = lerp(H, 0.74, rock); Sat = lerp(Sat, 0.16, rock); L = lerp(L, 0.46 + small * 0.08, rock);
  const snow = smooth(470, 560, hd + small * 40);
  H = lerp(H, 0.66, snow); Sat = lerp(Sat, 0.12, snow); L = lerp(L, 0.92, snow);
  const cd = Math.hypot(x - CANYON.x, z - CANYON.z);
  if (cd < CANYON.r + 160 * S) {
    const t = smooth(CANYON.r + 160 * S, CANYON.r, cd) * smooth(12, 25, hd);
    H = lerp(H, 0.025 + big * 0.02, t); Sat = lerp(Sat, 0.55, t); L = lerp(L, 0.42 + Math.sin(hd * 0.3) * 0.05, t);
  }
  return [H, Sat, L];
}

// --- built ground: terraces, stairs, causeway, bridges, plazas ---------------------------------
// Level walkable platforms added by builders: oriented rectangles { x, z, hw, hd, a, y, y0? }.
// y0 limits a pad to walkers standing above it (roof gardens over the palace).
export const PADS = [];
export function addPad(p) { PADS.push({ ...p, c: Math.cos(p.a || 0), s: Math.sin(p.a || 0) }); }
export function causewayY(z) {
  if (z > CAUSEWAY.z1 - 30 * S) return lerp(CAUSEWAY.y, B20.y, (z - CAUSEWAY.z1 + 30 * S) / (30 * S));
  return CAUSEWAY.y;
}
export function branchY(B, t) { return B.y + B.hump * Math.sin(Math.PI * t); }
export function builtHeight(x, z, y = 0) {
  for (const p of PADS) {
    if (p.y0 !== undefined && y < p.y0) continue;
    const dx = x - p.x, dz = z - p.z, u = dx * p.c - dz * p.s, v = dx * p.s + dz * p.c;
    if (Math.abs(u) <= p.hw && Math.abs(v) <= p.hd) return p.y;
  }
  // The cut-through arch has a level walkable vestibule floor. Check this before the tier
  // roof query, which otherwise returns the upper storey or leaves the lower level unsupported.
  if (x >= PALACE_ENTRANCE.minX && x <= PALACE_ENTRANCE.maxX
    && z >= PALACE_ENTRANCE.minZ && z <= PALACE_ENTRANCE.maxZ
    && y >= PALACE_ENTRANCE.floorY - 1 && y <= PALACE_ENTRANCE.ceilingY + 1) return PALACE_ENTRANCE.floorY;
  const ax = Math.abs(x);
  // up on the palace: the gate landing and the garden roof of whichever tier you stand on
  const roof = palaceRoofY(x, z);
  if (roof !== null && y > roof - 30) return roof;
  // the cascade court: twin flights from the gate landing down to the upper terrace
  if (z > CASCADE.z0 && z <= CASCADE.z1) for (const [cx, hw] of CASCADE.flights) if (Math.abs(x - cx) <= hw) return lerp(CASTLE.y, PAL.y, (z - CASCADE.z0) / (CASCADE.z1 - CASCADE.z0));
  if (ax <= CAUSEWAY.hw && z >= CAUSEWAY.z0 && z <= CAUSEWAY.z1) return causewayY(z);
  for (const B of BRANCHES) {
    const [[x0, z0], [x1, z1]] = B.pts;
    if (Math.abs(z - z0) <= B.hw && (x - x0) * (x - x1) <= 0) return branchY(B, (x - x0) / (x1 - x0));
  }
  if (Math.hypot(x - B20.x, z - B20.z) <= B20.r) return B20.y;
  for (const [za, zb, ya, yb, hw, cx = 0] of STAIRS) if (z >= za && z <= zb && Math.abs(x - cx) <= hw) return lerp(ya, yb, (z - za) / (zb - za));
  for (const T of TERRACES) if (z >= T.z0 && z <= T.z1 && ax <= T.hw) return T.y;
  return null;
}

export function groundAt(x, z, y = 0) {
  const isl = islandAt(x, z, y);
  if (!isl.main) {
    if (isl.id === 'lake' && Math.hypot(x - LAKE_POND.x, z - LAKE_POND.z) < LAKE_POND.r) return isl.y - 0.3;
    return isl.y + terrainHeight(isl, x, z);
  }
  const b = builtHeight(x, z, y);
  if (b !== null) return b;
  return Math.max(mainTerrain(x, z), -1.1);                    // wade through the shallows
}

// Push a point of radius `pr` out of every collider. Mutates pos.
export function resolveCollisions(pos, pr = 0.5) {
  for (const c of COLLIDERS) {
    if (c.y0 !== undefined && (pos.y < c.y0 - 1 || pos.y > c.y1)) continue;
    if (c.r !== undefined) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      if (Math.abs(dx) > c.r + pr || Math.abs(dz) > c.r + pr) continue;
      const d = Math.hypot(dx, dz), min = c.r + pr;
      if (d < min && d > 1e-4) { pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; }
    } else if (pos.x > c.minX - pr && pos.x < c.maxX + pr && pos.z > c.minZ - pr && pos.z < c.maxZ + pr) {
      const pushes = [[c.minX - pr - pos.x, 0], [c.maxX + pr - pos.x, 0], [0, c.minZ - pr - pos.z], [0, c.maxZ + pr - pos.z]];
      pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
      pos.x += pushes[0][0]; pos.z += pushes[0][1];
    }
  }
}

// Places where trees and decorations must not be put.
export function isClearOfBuildings(x, z, margin = 0, y = 0) {
  for (const p of RETURNS) if (Math.hypot(x - p.x, z - p.z) < 10 + margin) return false;
  const isl = islandAt(x, z, y);
  if (!isl.main) return Math.hypot(x - LAKE_POND.x, z - LAKE_POND.z) >= LAKE_POND.r + 4 + margin && Math.hypot(x - isl.x, z - isl.z) > 14 + margin;
  if (mainTerrain(x, z) < 1.5 + margin * 0.1) return false;
  const ax = Math.abs(x);
  if (x > PAL.x0 - 40 - margin && x < PAL.x1 + 40 + margin && z > PAL.z0 - 40 - margin && z < PAL.hd + 20 + margin) return false;
  if (ax < CAUSEWAY.hw + 10 + margin && z > PAL.hd && z < CAUSEWAY.z1 + 10) return false;
  if (ax < 70 * S + margin && z > PAL.hd && z < 900 * S) return false;           // water channel and grand stair
  for (const [za, zb, , , hw, cx = 0] of STAIRS) if (z > za - 6 - margin && z < zb + 6 + margin && Math.abs(x - cx) < hw + 6 + margin) return false;
  for (const p of PORTALS) if (Math.hypot(x - p.x, z - p.z) < 14 + margin) return false;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 40 + margin) return false;
  if (Math.hypot(x - B20.x, z - B20.z) < B20.r + 30 + margin) return false;
  for (const s of Object.values(SITES)) if (s !== SITES.B20 && Math.hypot(x - s.x, z - s.z) < s.pad.r * 0.8 + margin) return false;
  for (const p of PADS) if (Math.hypot(x - p.x, z - p.z) < Math.max(p.hw, p.hd) + margin) return false;
  return true;
}

// Where small life (shrubs, flowers, collectables) goes on the main land: round the places people walk.
export const MAIN_ZONES = [
  { x: 0, z: 2330 * S, r: 230 * S },                 // the spawn shore
  { x: -420 * S, z: 640 * S, r: 160 * S }, { x: 420 * S, z: 640 * S, r: 160 * S },   // the terrace gardens
  { x: -760 * S, z: 820 * S, r: 160 * S }, { x: 760 * S, z: 820 * S, r: 160 * S },   // lake shores beside the terraces
  { x: SITES.B02.x, z: SITES.B02.z, r: 120 * S }, { x: SITES.B03.x, z: SITES.B03.z, r: 110 * S },
  { x: SITES.B18.x, z: SITES.B18.z, r: 140 * S },
  { x: -300 * S, z: 2350 * S, r: 160 * S }, { x: 300 * S, z: 2350 * S, r: 160 * S },
];
export function randomOnIsland(isl, r, minEdge = 4) {
  if (!isl.main) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (isl.r - minEdge);
    return [isl.x + Math.cos(a) * d, isl.z + Math.sin(a) * d];
  }
  const Z = MAIN_ZONES[Math.floor(r() * MAIN_ZONES.length)];
  const a = r() * Math.PI * 2, d = Math.sqrt(r()) * Z.r;
  return [Z.x + Math.cos(a) * d, Z.z + Math.sin(a) * d];
}
export const MAIN_SHARE_R = 260 * S;
