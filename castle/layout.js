// The shape of the world (art-references/world-layout.md v2): one wide land
// inside a mountain rim, with a long lake in front of a forested crag that
// carries the castle, and floating islands high overhead. This module answers
// the ground height and collision queries the player controller uses.
// Coordinates are metres; the castle crag is at the centre and north is -z.

export const ISLANDS = [
  { id: 'castle', name: 'Castle of Starlight', x: 0, z: 0, y: 0, r: 1250, main: true },
  { id: 'garden', name: 'Crystal Garden', x: 560, z: -330, y: 250, r: 38, hue: 0.52 },
  { id: 'aurora', name: 'Aurora Peak', x: -520, z: -640, y: 320, r: 32, hue: 0.42 },
  { id: 'lake', name: 'Lantern Lake', x: -430, z: 300, y: 230, r: 44, hue: 0.12 },
  { id: 'meadow', name: 'Unicorn Meadow', x: 520, z: 380, y: 270, r: 40, hue: 0.85 },
  { id: 'star', name: 'Starfall Isle', x: 90, z: -560, y: 380, r: 30, hue: 0.62 },
];
export const MAIN = ISLANDS[0];
const SKY = ISLANDS.filter((i) => !i.main);

// --- the main features --------------------------------------------------
export const CRAG = { x: 0, z: 5, rx: 250, rz: 215, y: 90 };
export const SPAWN = { x: 0, z: 930 };                           // the arrival dais at the south end of the Grand Approach
export const COVE = { x: -742, z: 884, r: 18, y: 5 };
// The castle v3 (world-layout.md section 5) begins at the foot of its grand
// stair on the crag top: three towering 30 m levels with ring walkways climb to
// the gate sill 90 m up, where the 100 m gate opens in a 200 m front wall.
export const CASTLE = { x: 0, z: 30, y: CRAG.y + 90, base: CRAG.y };   // z: gate plane, y: gate sill
export const TERRACES = [                                                // the three levels, bottom first
  { y: CRAG.y + 30, hw: 184, front: 164 },                               // widened Oct 11 for the 300 m front wall
  { y: CRAG.y + 60, hw: 178, front: 132 },
  { y: CRAG.y + 90, hw: 172, front: 100 },                               // a 70 m deep landing before the gate
];
export const TERRACE_REAR = -110;
export const TERRACE_R = 34;                                             // rounded front corners
// the grand stair: flights between landings level with each ring walkway
const LANDING = 6;
const STAIR_FOOT = TERRACES[0].front + LANDING + 28;
export const STAIR = {
  hw0: 34, hw1: 28, foot: STAIR_FOOT, top: TERRACES[2].front,
  profile: [[STAIR_FOOT, CRAG.y], ...TERRACES.flatMap((T) => [[T.front + LANDING, T.y], [T.front, T.y]])],
};
export function stairY(z) {
  const P = STAIR.profile;
  for (let i = 0; i < P.length - 1; i++) {
    const [z0, y0] = P[i], [z1, y1] = P[i + 1];
    if (z <= z0 && z >= z1) return y0 + (y1 - y0) * ((z0 - z) / (z0 - z1 || 1));
  }
  return z > P[0][0] ? P[0][1] : P[P.length - 1][1];
}
export function stairHW(z) { return STAIR.hw0 + (STAIR.hw1 - STAIR.hw0) * Math.min(1, Math.max(0, (STAIR.foot - z) / (STAIR.foot - STAIR.top))); }
export function inTerrace(T, x, z, m = 0) {
  const ax = Math.abs(x - CASTLE.x), R = TERRACE_R;
  if (ax > T.hw + m || z > T.front + m || z < TERRACE_REAR - m) return false;
  if (z > T.front - R && ax > T.hw - R) return Math.hypot(ax - (T.hw - R), z - (T.front - R)) <= R + m;
  return true;
}
// four tall courtyard towers rise from the crag top beside the levels, all different
export const COURT_TOWERS = [
  { x: -206, z: 58, r: 13, h: 190, cap: 'witch' }, { x: -199, z: 106, r: 11, h: 150, cap: 'onion' },
  { x: 204, z: 100, r: 14, h: 215, cap: 'gothic' }, { x: 220, z: 50, r: 11, h: 160, cap: 'witch' },
];
export const PLAZA = { x: 0, z: STAIR_FOOT + 16, y: CRAG.y, r: 16 };   // the round cascade pool at the stair foot
// the long lake, as a centre line with a varying half width
export const LAKE_PATH = [[-650, 790], [-520, 690], [-390, 600], [-250, 520], [-100, 430], [60, 360], [220, 355], [380, 410], [520, 500]];
// the long bridge, from the cove across the lake to the foot of the crag
export const BRIDGE = { pts: [[-728, 868], [-600, 768], [-450, 655], [-310, 560], [-200, 440], [-152, 284]], hw: 7, y: 14, ramp: 45 };
// the Giant-Tree Way: a winding road climbing the crag's gentle west slope [x, z, y]
export const TREE_WAY = { pts: [[-152, 284, 1.5], [-300, 282, 18], [-420, 250, 30], [-410, 190, 40], [-260, 200, 66], [-200, 175, 80], [-150, 172, 90], [-90, 196, 90], [-22, 212, CRAG.y]], hw: 6 };
// the Grand Approach: one straight line on the castle's axis. From the arrival dais
// a humpback bridge crosses the Lotus Pond, then a tree-arched avenue runs dead
// straight to the castle, rising on a viaduct over the lake to the stair-foot pool.
export const POND = { x: 0, z: 860, r: 32, y: 31.5 };
export const ARRIVAL = { x: 0, z: 942, r: 14, y: 34 };
export const AXIS = { pts: [[0, 935, 34], [0, 895, 34], [0, 880, 37], [0, 860, 39], [0, 840, 37], [0, 825, 34], [0, 230, 90]], hw: 9, ground: 790 };
export const LAGOON = { x: -700, z: 560, r: 90, y: 6 };           // Lagoon City (Atlantis white town) on the west shore
export const TEMPLE_HILL = { x: 140, z: -560, r: 150, top: 70, y: 110 };
export const ROSE_CRAG = { x: -560, z: -600, r: 90, top: 40, y: 70 };
export const PILLAR_REACH = { x: 760, z: 100 };
export const THOLOI = [{ x: 110, z: -580 }, { x: 180, z: -530 }];
export const WHEEL = { x: -772, z: 612 };
export const RUNES = { x: -1000, z: 260, r: 9 };
export const LAKE_POND = { x: ISLANDS[3].x, z: ISLANDS[3].z, r: 18 };

// --- the landmark areas round the edge (world-layout.md sections 2 and 2A) ------
// Rivers and gorges are [x, z, bed y] lines; plateaus rise to y over a top radius;
// pads are level building grounds blended into the land around them.
export const STORY_RIVER = { pts: [[-990, -560, 30], [-890, -470, 22], [-790, -400, 17], [-690, -330, 14], [-600, -270, 12], [-540, -235, 11]], hw: 13, pond: 34 };
export const LANTERN_RIVER = { pts: [[995, -690, 34], [890, -560, 26], [790, -470, 21], [670, -440, 18], [560, -460, 16]], hw: 13, pond: 34 };
export const CANYON = { pts: [[505, 520, -6], [575, 610, 1], [630, 700, 3], [680, 790, 5], [740, 900, 7]], hw: 44, wall: 112 };
export const FJORD = { pts: [[-745, -760, -2], [-820, -830, -2], [-900, -890, -2], [-1010, -990, -2]], hw: 58 };
export const MISTY_CRAG = { x: 760, z: -620, top: 58, y: 160 };
export const CHAPEL_CLIFF = { x: 330, z: 545, top: 62, y: 40 };
export const PADS_FLAT = {
  story: { x: -775, z: -250, r: 55, y: 24 },
  coloss: { x: -110, z: -560, r: 82, y: 32 },
  jungle: { x: 870, z: 470, r: 70, y: 24 },
  bazaar: { x: 612, z: 672, r: 40, y: 2 },
  palace: { x: 705, z: 840, r: 62, y: 6 },
  fjord: { x: -700, z: -695, r: 44, y: 5 },
  ruin: { x: -900, z: 160, r: 120, y: null },
};
export const STORY = { houses: [[-752, -238], [-788, -226], [-762, -272], [-800, -262]], mill: [-860, -205], bridge: [-760, -379] };
export const ROSE_KEEP = { x: ROSE_CRAG.x, z: ROSE_CRAG.z };
export const TEMPLE = { x: 150, z: -612 };
export const COLOSSEUM = { x: PADS_FLAT.coloss.x, z: PADS_FLAT.coloss.z };
export const MISTY_KEEP = { x: MISTY_CRAG.x + 8, z: MISTY_CRAG.z + 4, pagoda: [MISTY_CRAG.x - 30, MISTY_CRAG.z + 40] };
export const STAR_CHAPEL = { x: CHAPEL_CLIFF.x + 6, z: CHAPEL_CLIFF.z + 6 };
export const CANYON_ARCH = { x: 612, z: 672 };
export const CANYON_PALACE = { x: 705, z: 845 };
export const JUNGLE = { x: PADS_FLAT.jungle.x, z: PADS_FLAT.jungle.z };
export const LONGHOUSE = { x: -690, z: -682, monolith: [-724, -722] };
export const RUIN_SITES = { arches: [[-870, 40, 0.3], [-950, 190, 1.4], [-860, 330, -0.4]], stones: [-820, 150], gateway: [-990, 420], gothic: [-900, 470] };

// Portals on the crag top, each to one floating island.
const PORTAL_SPOTS = { lake: [-210, -10], garden: [210, -10], aurora: [-190, -120], star: [190, -120], meadow: [196, 92] };
export const PORTALS = SKY.map((isl) => {
  const [x, z] = PORTAL_SPOTS[isl.id];
  return { to: isl.id, name: isl.name, x, z, y: CRAG.y, angle: Math.atan2(isl.z - z, isl.x - x) };
});
// Return portal on each floating island, on the side facing the castle.
export const RETURNS = SKY.map((isl) => {
  const a = Math.atan2(-isl.z, -isl.x);
  const d = isl.r - 8;
  return { from: isl.id, x: isl.x + Math.cos(a) * d, z: isl.z + Math.sin(a) * d, y: isl.y, angle: a };
});

// Solid things the player bumps into: circles { x, z, r } and boxes.
export const COLLIDERS = [];
export function addCollider(c) { COLLIDERS.push(c); }

// Which island a point is on. The main land lies under the floating islands, so
// pass the height you are at (y) to pick the island you are standing on.
export function islandAt(x, z, y = 0) {
  let best = null;
  for (const isl of SKY) {
    const dx = x - isl.x, dz = z - isl.z;
    if (dx * dx + dz * dz < isl.r * isl.r && y > isl.y - 6) best = isl;
  }
  if (best) return best;
  return x * x + z * z < MAIN.r * MAIN.r ? MAIN : null;
}

// --- noise -----------------------------------------------------------------
function h2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// --- polylines with a spatial index -------------------------------------------
// Each line is resampled every few metres; queries find the nearest sample.
function sampleLine(pts, step) {
  const out = [];
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, y: a[2] !== undefined ? a[2] + (b[2] - a[2]) * t : 0, s: len + d * t, i });
    }
    len += d;
  }
  const e = pts[pts.length - 1];
  out.push({ x: e[0], z: e[1], y: e[2] ?? 0, s: len, i: pts.length - 2 });
  return { samples: out, length: len };
}
// smooth the corners of a polyline (Chaikin) so curves read as curves
function chaikin(pts, rounds = 3) {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push(a.map((v, k) => v * 0.75 + b[k] * 0.25), a.map((v, k) => v * 0.25 + b[k] * 0.75));
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
const key = (i, j) => (i + 4096) * 8192 + (j + 4096);
function indexLine(line, cell) {
  const grid = new Map();
  for (let i = 0; i < line.samples.length; i++) {
    const s = line.samples[i], k = key(Math.floor(s.x / cell), Math.floor(s.z / cell));
    (grid.get(k) || grid.set(k, []).get(k)).push(i);
  }
  return { ...line, grid, cell };
}
// nearest sample within `reach` metres, or null
function nearest(L, x, z, reach) {
  const c = L.cell, cx = Math.floor(x / c), cz = Math.floor(z / c), n = Math.ceil(reach / c);
  let best = null, bd = reach;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const list = L.grid.get(key(cx + i, cz + j));
    if (!list) continue;
    for (const k of list) {
      const s = L.samples[k], d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) { bd = d; best = s; }
    }
  }
  return best ? { s: best, d: bd } : null;
}
export { nearest as nearestOnLine };
function nearestOnLineFar(L, x, z, reach) {
  let bd = reach;
  for (const s of L.samples) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) bd = d; }
  return bd;
}

export const LAKE_LINE = indexLine(sampleLine(chaikin(LAKE_PATH), 8), 40);
export const BRIDGE_LINE = indexLine(sampleLine(chaikin(BRIDGE.pts), 3), 24);
export const WAY_LINE = indexLine(sampleLine(chaikin(TREE_WAY.pts, 2), 2), 16);
export const STORY_LINE = indexLine(sampleLine(chaikin(STORY_RIVER.pts, 2), 4), 24);
export const LANTERN_LINE = indexLine(sampleLine(chaikin(LANTERN_RIVER.pts, 2), 4), 24);
export const CANYON_LINE = indexLine(sampleLine(chaikin(CANYON.pts, 2), 4), 40);
export const FJORD_LINE = indexLine(sampleLine(chaikin(FJORD.pts, 2), 4), 40);
export const AXIS_LINE = indexLine(sampleLine(AXIS.pts, 2), 16);

// half width of the lake along its length: wide in the middle, narrower at the ends
function lakeHalfWidth(s) {
  const t = s / LAKE_LINE.length;
  return 55 + 105 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 15 * Math.sin(s * 0.013 + 1.2);
}
// Big fields baked once into grids over the land, then sampled bilinearly.
const G0 = -1300, GSPAN = 2600;
function bakeGrid(step, fn) {
  const n = Math.round(GSPAN / step) + 1, data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) data[j * n + i] = fn(G0 + i * step, G0 + j * step);
  return { n, step, data };
}
function sampleGrid(g, x, z) {
  const fx = Math.min(g.n - 1.001, Math.max(0, (x - G0) / g.step)), fz = Math.min(g.n - 1.001, Math.max(0, (z - G0) / g.step));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, d = g.data, n = g.n;
  const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}
let lakeGrid = null;
function lakeRaw(x, z) {
  let bd = Infinity, bs = 0;
  for (const s of LAKE_LINE.samples) {
    const dx = s.x - x, dz = s.z - z, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; bs = s.s; }
  }
  let d = Math.sqrt(bd) - lakeHalfWidth(bs) - (vnoise(x * 0.02, z * 0.02) - 0.5) * 30;
  // the lake reaches up to the cove as a widening inlet under the first stretch of bridge,
  // so the view from the dais opens straight across the water
  for (const b of BRIDGE_LINE.samples) {
    if (b.s < 30 || b.s > 320) continue;
    const e = Math.hypot(b.x - x, b.z - z) - (22 + (b.s - 30) * 0.22);
    if (e < d) d = e;
  }
  return d;
}
// signed distance to the lake shore (negative on the water)
export function lakeDistance(x, z) {
  lakeGrid ||= bakeGrid(10, lakeRaw);
  return sampleGrid(lakeGrid, x, z);
}

// --- the designed terrain ------------------------------------------------------
export function cragDistance(x, z) {
  const dx = (x - CRAG.x) / CRAG.rx, dz = (z - CRAG.z) / CRAG.rz;
  const a = Math.atan2(dz, dx);
  const wobble = 1 + Math.sin(a * 5 + 1.3) * 0.05 + Math.sin(a * 11) * 0.025;
  return (Math.hypot(dx, dz) - wobble) * Math.min(CRAG.rx, CRAG.rz);
}
function plateau(x, z, P, edge) {
  const d = Math.hypot(x - P.x, z - P.z) - P.top * (1 + 0.08 * Math.sin(Math.atan2(z - P.z, x - P.x) * 6));
  return P.y * (1 - smooth(0, edge, d));
}
function bridgeEndY(e) { return e === BRIDGE.pts[0] ? COVE.y : 1.5; }

let terrainGrid = null;
function mainTerrain(x, z) {
  terrainGrid ||= bakeGrid(5, terrainRaw);
  return sampleGrid(terrainGrid, x, z);
}
// Rivers run downhill: each sample's water level is the lowest natural ground
// upstream of it, less a little, so the water never stands above its banks.
let riversLevelled = false;
function levelRivers() {
  riversLevelled = true;
  for (const L of [STORY_LINE, LANTERN_LINE]) {
    let y = Infinity;
    for (const s of L.samples) {
      let g = Infinity;
      for (const o of [-1, 0, 1]) for (const p of [-1, 0, 1]) g = Math.min(g, terrainRaw(s.x + o * 16, s.z + p * 16, true, true));
      y = Math.min(y, s.y, g - 1.2);
      s.y = y;
    }
  }
}
export function terrainRaw(x, z, natural = false, base = false) {
  if (!riversLevelled && !base) levelRivers();
  const r = Math.hypot(x, z);
  // rolling Glowwood hills, fading down to the lake and the cove
  const n = vnoise(x * 0.006 + 3, z * 0.006) * 0.7 + vnoise(x * 0.02, z * 0.02) * 0.3;
  const ld = lakeDistance(x, z);
  let h = 8 + n * 48;
  h *= smooth(-10, 220, ld) * 0.85 + 0.15;
  // the castle crag: a sheer cliff on the lake side, a long forested slope elsewhere
  const cd = cragDistance(x, z);
  const lakeSide = smooth(-120, 40, x) * smooth(40, 160, z);
  const fall = 26 + 210 * (1 - lakeSide);
  if (cd < 0) h = CRAG.y;
  else h = Math.max(h, CRAG.y * (1 - smooth(0, fall, cd)) + h * smooth(0, fall, cd) * 0.6);
  // other high ground
  h = Math.max(h, plateau(x, z, TEMPLE_HILL, 90), plateau(x, z, ROSE_CRAG, 45));
  // cliffs behind the cove
  const cv = Math.hypot(x - COVE.x + 60, z - COVE.z - 70);
  h += 55 * smooth(150, 40, cv) * smooth(40, 90, Math.hypot(x - COVE.x, z - COVE.z));
  // the mountain rim
  if (r > 1020) h += Math.pow(Math.min(1.25, (r - 1020) / 230), 1.6) * (320 + vnoise(x * 0.01, z * 0.01) * 260);
  // the landmark areas: two more plateaus, river valleys, the red canyon and the fjord
  h = Math.max(h, plateau(x, z, MISTY_CRAG, 42), plateau(x, z, CHAPEL_CLIFF, 24));
  if (base) return h;
  for (const [L, R] of [[STORY_LINE, STORY_RIVER], [LANTERN_LINE, LANTERN_RIVER]]) {
    let q = nearest(L, x, z, R.hw + 50);
    // each river ends in a round pond
    const e = L.samples[L.samples.length - 1], de = Math.hypot(x - e.x, z - e.z) - (R.pond - R.hw);
    if (de < R.hw + 50 && (!q || de < q.d)) q = { s: e, d: Math.max(0, de) };
    if (q) {
      const bed = q.s.y - 2.2 * (1 - smooth(0, R.hw + 4, q.d));
      h = Math.min(h, bed + (Math.max(h, bed) - bed) * smooth(R.hw + 4, R.hw + 50, q.d));
    }
  }
  const cq = nearest(CANYON_LINE, x, z, 300);
  if (cq) {
    const d = cq.d, hw = CANYON.hw;
    const n = vnoise(x * 0.011 + 20, z * 0.011);
    const mask = Math.max(1 - smooth(hw + 60, hw + 100, d), smooth(0.5, 0.56, n) * (1 - smooth(200, 290, d))) * smooth(30, 70, ld);
    const H = CANYON.wall * (0.78 + 0.3 * vnoise(x * 0.025, z * 0.025)) * mask;
    h = Math.max(h, H * smooth(hw + 2, hw + 16, d));
    h = h + (cq.s.y - h) * (1 - smooth(hw * 0.8, hw + 4, d));
  }
  const fq = nearest(FJORD_LINE, x, z, FJORD.hw + 90);
  if (fq) h = h + (fq.s.y - h) * (1 - smooth(FJORD.hw * 0.75, FJORD.hw + 90, fq.d));
  for (const P of Object.values(PADS_FLAT)) {
    if (P.y === null) continue;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < P.r + 50) h = h + (P.y - h) * (1 - smooth(P.r * 0.85, P.r + 50, d));
  }
  // Lagoon City sits on a level shore terrace
  const dl = Math.hypot(x - LAGOON.x, z - LAGOON.z);
  if (dl < LAGOON.r + 70) h = LAGOON.y + (h - LAGOON.y) * smooth(LAGOON.r, LAGOON.r + 70, dl);
  // the lake basin
  if (ld < 0) h = Math.min(h, -9 * smooth(0, 70, -ld));
  else if (ld < 30) h = Math.min(h, h * smooth(0, 30, ld) + 1.2 * (1 - smooth(0, 30, ld)));
  // the cove dais and its beach
  const dc = Math.hypot(x - COVE.x, z - COVE.z);
  if (dc < 60) h = h + (COVE.y - h) * (1 - smooth(COVE.r, 60, dc));
  // the Lotus Pond and the arrival dais on the Grand Approach
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < POND.r + 30) h = h + (POND.y - 2.5 - h) * (1 - smooth(POND.r - 4, POND.r + 30, dp));
  const da = Math.hypot(x - ARRIVAL.x, z - ARRIVAL.z);
  if (da < ARRIVAL.r + 40) h = h + (ARRIVAL.y - 0.3 - h) * (1 - smooth(ARRIVAL.r, ARRIVAL.r + 40, da));
  if (natural) return h;
  // the ground stretch of the Grand Approach is cut and filled level with its deck
  if (z > AXIS.ground - 30 && dp > POND.r) {
    const q = nearest(AXIS_LINE, x, z, AXIS.hw + 24);
    if (q) h = h + (q.s.y - 0.4 - h) * (1 - smooth(AXIS.hw, AXIS.hw + 24, q.d)) * smooth(AXIS.ground - 30, AXIS.ground + 10, z);
  }
  // the Giant-Tree Way is cut and filled into the slope
  const w = nearest(WAY_LINE, x, z, TREE_WAY.hw + 26);
  if (w) h = h + (w.s.y - 0.4 - h) * (1 - smooth(TREE_WAY.hw, TREE_WAY.hw + 26, w.d));
  // bridge landings
  for (const e of [BRIDGE.pts[0], BRIDGE.pts[BRIDGE.pts.length - 1]]) {
    const de = Math.hypot(x - e[0], z - e[1]);
    if (de < 40) h = h + (bridgeEndY(e) - 0.3 - h) * (1 - smooth(14, 40, de));
  }
  return h;
}

// Terrain height (without built things).
export function terrainHeight(isl, x, z) {
  if (isl.main) return mainTerrain(x, z);
  if (!FLAT.length) initFlat();
  const n = vnoise(x * 0.028 + isl.x, z * 0.028 + isl.z) * 0.75 + vnoise(x * 0.09, z * 0.09) * 0.25;
  const rim = smooth(isl.r, isl.r - 12, Math.hypot(x - isl.x, z - isl.z));
  let d = Infinity;
  for (const f of FLAT) d = Math.min(d, Math.hypot(x - f.x, z - f.z) - f.r);
  return Math.max(0, n - 0.25) * 6 * 1.35 * rim * smooth(0, 14, d);
}
// level spots on the floating islands (portals, pond, landmarks)
const FLAT = [];
function initFlat() {
  FLAT.push({ x: LAKE_POND.x, z: LAKE_POND.z, r: LAKE_POND.r + 4 });
  for (const p of RETURNS) FLAT.push({ x: p.x, z: p.z, r: 9 });
  const by = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));
  FLAT.push({ x: by.aurora.x, z: by.aurora.z, r: 10 }, { x: by.lake.x + 26, z: by.lake.z - 10, r: 8 }, { x: by.star.x, z: by.star.z - 6, r: 9 });
}

// Ground colour as HSL: sunny and cool greens, rock on steep ground and the rim.
const ISLE_HUE = { castle: 0.31, garden: 0.34, aurora: 0.38, lake: 0.29, meadow: 0.27, star: 0.35 };
export function groundHSL(isl, x, z, h) {
  const big = vnoise(x * 0.035 + 50, z * 0.035 + 9);
  const small = vnoise(x * 0.16, z * 0.16);
  const hue = (ISLE_HUE[isl.id] ?? 0.28) - big * 0.055 + (small - 0.5) * 0.025 - (isl.main ? 0 : h * 0.002);
  const sat = 0.64 + big * 0.14;
  const light = 0.31 + big * 0.13 + (isl.main ? 0 : Math.min(h, 12) * 0.008) + (small - 0.5) * 0.05;
  if (isl.main) {
    // steep slopes and the high rim go to lilac rock; lake shores to pale sand
    const e = 3, s = Math.hypot(mainTerrain(x + e, z) - mainTerrain(x - e, z), mainTerrain(x, z + e) - mainTerrain(x, z - e)) / (2 * e);
    const rock = Math.max(smooth(0.9, 1.6, s), smooth(150, 260, h));
    const sand = smooth(5, 1, h) * smooth(-2, 0, h);
    const mix = (a, b, t) => a + (b - a) * t;
    let H = mix(mix(hue, 0.08, sand), 0.74, rock), S = mix(mix(sat, 0.45, sand), 0.18, rock), Lt = mix(mix(light, 0.62, sand), 0.42 + small * 0.08, rock);
    // the landmark areas keep their own ground: red canyon rock, fjord snow, golden meadow grass
    const cq = nearestOnLineFar(CANYON_LINE, x, z, 320);
    if (cq < 320) {
      // red rock on the mesas and canyon walls, warm sand on the canyon floor
      const t = smooth(290, 200, cq) * Math.max(smooth(20, 45, h), smooth(0.6, 1.2, s)) * smooth(40, 90, lakeDistance(x, z));
      H = mix(H, 0.025 + big * 0.02, t); S = mix(S, 0.5 + small * 0.1, t); Lt = mix(Lt, 0.38 + big * 0.12 + Math.sin(h * 0.25) * 0.04, t);
      const f = smooth(CANYON.hw + 24, CANYON.hw, cq) * smooth(-1, 2, h);
      H = mix(H, 0.07, f); S = mix(S, 0.5, f); Lt = mix(Lt, 0.55 + small * 0.06, f);
    }
    const fq = nearestOnLineFar(FJORD_LINE, x, z, 340);
    if (fq < 340) { const t = smooth(340, 200, fq); H = mix(H, 0.62, t); S = mix(S, 0.18, t); Lt = mix(Lt, 0.8 + small * 0.08, t); }
    const m = smooth(-760, -880, x) * smooth(-120, 0, z) * smooth(620, 520, z);
    if (m > 0) { H = mix(H, 0.13 - big * 0.02, m * (1 - rock)); S = mix(S, 0.62, m * (1 - rock)); Lt = mix(Lt, 0.45 + big * 0.1, m * (1 - rock)); }
    return [H, S, Lt];
  }
  return [hue, sat, light];
}

// Height of built things: bridge deck, the tree way, terraces and grand stairs.
// Returns null where the natural ground applies.
// Level walkable platforms added by builders (palace podium, spur bridges):
// oriented rectangles { x, z, hw, hd, a, y }.
export const PADS = [];
export function addPad(p) { PADS.push({ ...p, c: Math.cos(p.a || 0), s: Math.sin(p.a || 0) }); }
export function builtHeight(x, z) {
  for (const p of PADS) {
    const dx = x - p.x, dz = z - p.z, u = dx * p.c - dz * p.s, v = dx * p.s + dz * p.c;
    if (Math.abs(u) <= p.hw && Math.abs(v) <= p.hd) return p.y;
  }
  const b = nearest(BRIDGE_LINE, x, z, BRIDGE.hw + 0.5);
  if (b && b.d <= BRIDGE.hw) {
    const L = BRIDGE_LINE.length, s = b.s.s;
    const y0 = bridgeEndY(BRIDGE.pts[0]), y1 = bridgeEndY(BRIDGE.pts[BRIDGE.pts.length - 1]);
    if (s < BRIDGE.ramp) return y0 + (BRIDGE.y - y0) * (s / BRIDGE.ramp);
    if (s > L - BRIDGE.ramp) return y1 + (BRIDGE.y - y1) * ((L - s) / BRIDGE.ramp);
    return BRIDGE.y;
  }
  const w = nearest(WAY_LINE, x, z, TREE_WAY.hw + 0.5);
  if (w && w.d <= TREE_WAY.hw) return w.s.y;
  if (Math.abs(x - AXIS.pts[0][0]) <= AXIS.hw && z <= AXIS.pts[0][1] && z >= AXIS.pts[AXIS.pts.length - 1][1]) {
    const q = nearest(AXIS_LINE, x, z, AXIS.hw + 2);
    if (q) return q.s.y;
  }
  if (Math.hypot(x - ARRIVAL.x, z - ARRIVAL.z) <= ARRIVAL.r) return ARRIVAL.y;
  if (z <= STAIR.foot && z >= STAIR.top && Math.abs(x - CASTLE.x) <= stairHW(z)) return stairY(z);
  // the frozen fjord is solid ice to walk on
  if (x < -600 && z < -600) { const f = nearest(FJORD_LINE, x, z, FJORD.hw); if (f && f.d < FJORD.hw * 0.8) return 0.35; }
  for (let k = TERRACES.length - 1; k >= 0; k--) if (inTerrace(TERRACES[k], x, z)) return TERRACES[k].y;
  // the pool forecourt is a bastion that juts out over the crag's lake edge
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) <= PLAZA.r + 3) return PLAZA.y;
  return null;
}

export function groundAt(x, z, y = 0) {
  const isl = islandAt(x, z, y);
  if (!isl) return null;
  if (isl.id === 'lake') {
    const dx = x - LAKE_POND.x, dz = z - LAKE_POND.z;
    if (dx * dx + dz * dz < LAKE_POND.r * LAKE_POND.r) return isl.y - 0.3;
  }
  if (isl.main) {
    const b = builtHeight(x, z);
    if (b !== null) return b;
    return Math.max(mainTerrain(x, z), -1.1);        // wade through the shallows of the lake
  }
  return isl.y + terrainHeight(isl, x, z);
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
    } else {
      // axis-aligned box {minX,maxX,minZ,maxZ}
      if (pos.x > c.minX - pr && pos.x < c.maxX + pr && pos.z > c.minZ - pr && pos.z < c.maxZ + pr) {
        const pushes = [
          [c.minX - pr - pos.x, 0], [c.maxX + pr - pos.x, 0],
          [0, c.minZ - pr - pos.z], [0, c.maxZ + pr - pos.z],
        ];
        pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        pos.x += pushes[0][0]; pos.z += pushes[0][1];
      }
    }
  }
}

// Places where trees and decorations must not be put (main land and islands).
export function isClearOfBuildings(x, z, margin = 0, y = 0) {
  for (const p of RETURNS) if (Math.hypot(x - p.x, z - p.z) < 8 + margin) return false;
  if (islandAt(x, z, y) !== MAIN) {
    return Math.hypot(x - LAKE_POND.x, z - LAKE_POND.z) >= LAKE_POND.r + 4 + margin;
  }
  if (x * x + z * z > 1030 * 1030) return false;
  if (lakeDistance(x, z) < 3 + margin) return false;
  if (nearest(BRIDGE_LINE, x, z, BRIDGE.hw + 6 + margin)) return false;
  if (nearest(WAY_LINE, x, z, TREE_WAY.hw + 2 + margin)) return false;
  if (cragDistance(x, z) < 6 + margin) {
    if (inTerrace(TERRACES[0], x, z, 6 + margin)) return false;
    if (Math.abs(x - CASTLE.x) < STAIR.hw0 + 6 + margin && z < STAIR.foot + 6 + margin && z > STAIR.top) return false;
    for (const t of COURT_TOWERS) if (Math.hypot(x - t.x, z - t.z) < t.r + 6 + margin) return false;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 6 + margin) return false;
  }
  for (const p of PORTALS) if (Math.hypot(x - p.x, z - p.z) < 10 + margin) return false;
  if (Math.hypot(x - COVE.x, z - COVE.z) < COVE.r + 8 + margin) return false;
  if (Math.abs(x) < AXIS.hw + 3 + margin && z > AXIS.pts[AXIS.pts.length - 1][1] && z < AXIS.pts[0][1] + 2) return false;
  if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 2 + margin || Math.hypot(x - ARRIVAL.x, z - ARRIVAL.z) < ARRIVAL.r + 4 + margin) return false;
  if (Math.hypot(x - LAGOON.x, z - LAGOON.z) < LAGOON.r + margin) return false;
  for (const p of PADS) if (Math.hypot(x - p.x, z - p.z) < Math.max(p.hw, p.hd) + margin) return false;
  for (const t of THOLOI) if (Math.hypot(x - t.x, z - t.z) < 10 + margin) return false;
  if (Math.hypot(x - WHEEL.x, z - WHEEL.z) < 14 + margin) return false;
  if (Math.hypot(x - RUNES.x, z - RUNES.z) < RUNES.r + 3 + margin) return false;
  for (const P of Object.values(PADS_FLAT)) if (Math.hypot(x - P.x, z - P.z) < P.r + margin) return false;
  for (const P of [MISTY_CRAG, CHAPEL_CLIFF, ROSE_CRAG]) if (Math.hypot(x - P.x, z - P.z) < P.top + 4 + margin) return false;
  if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 34 + margin) return false;
  for (const [L, R] of [[STORY_LINE, STORY_RIVER], [LANTERN_LINE, LANTERN_RIVER]]) { const e = L.samples[L.samples.length - 1]; if (Math.hypot(x - e.x, z - e.z) < R.pond + 3 + margin) return false; }
  if (nearest(STORY_LINE, x, z, STORY_RIVER.hw + 3 + margin) || nearest(LANTERN_LINE, x, z, LANTERN_RIVER.hw + 3 + margin)) return false;
  if (nearest(CANYON_LINE, x, z, CANYON.hw + 2 + margin) || nearest(FJORD_LINE, x, z, FJORD.hw + 6 + margin)) return false;
  return true;
}

// Where small life (trees, shrubs, flowers, collectables) goes on the main land:
// around the places people walk, since the land is far too big to fill evenly.
export const MAIN_ZONES = [
  { x: ARRIVAL.x, z: ARRIVAL.z - 60, r: 110 },
  { x: COVE.x, z: COVE.z, r: 90 },
  { x: -120, z: 60, r: 170 },          // crag top round the castle
  { x: -200, z: 200, r: 110 },         // along the Giant-Tree Way
  { x: -600, z: 640, r: 90 }, { x: -320, z: 420, r: 80 }, { x: -880, z: 760, r: 80 },  // lake shores
  { x: LAGOON.x - 60, z: LAGOON.z - 130, r: 90 },
  { x: TEMPLE_HILL.x, z: TEMPLE_HILL.z, r: 110 },
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
// the main land counts as an island of this radius when sharing out small life
export const MAIN_SHARE_R = 150;

