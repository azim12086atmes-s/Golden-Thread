import { GRID_COLS, GRID_ROWS, HOME_COL, HOME_ROW, REGION_SIZE, type RegionId } from '../world/regions';
import { LANE_HALF, harbourOf, harbours, type Harbour } from '../world/harbours';

/**
 * The coastal ferry (pure rules; tests/ferry.test.ts). From the pier head of any harbour a ferry
 * sails to any other: it casts off from alongside the pier, runs out across the ship lanes to the
 * open sea, round the island the short way — always outside every land's shipping lane — and in
 * to tie up alongside the pier of the harbour they chose, where they step off onto the boards.
 *
 * On board the two sit on the open foredeck on separate benches, port and starboard, a planter
 * between them; the family on the benches behind.
 */

type P = [number, number];
const S = REGION_SIZE, STEP = 4;
/** The island's edges (world): the outside of the grid of lands. */
const X0 = -HOME_COL * S - S / 2, X1 = (GRID_COLS - 1 - HOME_COL) * S + S / 2;
const Z0 = -HOME_ROW * S - S / 2, Z1 = (GRID_ROWS - 1 - HOME_ROW) * S + S / 2;

/** Moored alongside the pier: this far to the side of it, and this far in from its head. */
export const MOOR_SIDE = 6, MOOR_BACK = 6;
/** Coins: a little to board, and so much per kilometre sailed. */
export const FERRY_BASE = 2, FERRY_PER_KM = 1.5;
/** Game minutes per kilometre. */
export const FERRY_MIN_PER_KM = 10;

/** How far out beyond the island's edge the ferry runs: clear outside every ship lane. */
export function ferryOffset(): number {
  return Math.max(...harbours().map((h) => h.lane - S / 2)) + LANE_HALF + 30;
}

let ring: P[] | null = null;
/** The ferry's round of the island (world, every ~4 m, clockwise from the north-west corner). */
export function ferryRing(): P[] {
  if (ring) return ring;
  const o = ferryOffset(), out: P[] = [];
  const side = (ax: number, az: number, bx: number, bz: number) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / STEP));
    for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  };
  const corner = (cx: number, cz: number, a0: number) => {
    const n = Math.round(((Math.PI / 2) * o) / STEP);
    for (let i = 0; i < n; i++) { const a = a0 + ((Math.PI / 2) * i) / n; out.push([cx + Math.cos(a) * o, cz + Math.sin(a) * o]); }
  };
  // North edge west→east, north-east corner, east edge north→south, … (a rectangle's offset curve).
  side(X0, Z0 - o, X1, Z0 - o); corner(X1, Z0, -Math.PI / 2);
  side(X1 + o, Z0, X1 + o, Z1); corner(X1, Z1, 0);
  side(X1, Z1 + o, X0, Z1 + o); corner(X0, Z1, Math.PI / 2);
  side(X0 - o, Z1, X0 - o, Z0); corner(X0, Z0, Math.PI);
  return (ring = out);
}

/** A point a distance `d` out from the land's centre along its sea side, and `s` to the side. */
const seaPoint = (h: Harbour, d: number, s = 0): P => {
  const [dx, dz] = h.dir, cx = h.x - dx * h.shore, cz = h.z - dz * h.shore;
  return [cx + dx * d + dz * s, cz + dz * d - dx * s];
};

/** Where the ferry lies alongside `h`'s pier, and where you step off onto it. */
export function mooring(h: Harbour): { x: number; z: number; pierX: number; pierZ: number } {
  const [x, z] = seaPoint(h, h.head - MOOR_BACK, MOOR_SIDE), [pierX, pierZ] = seaPoint(h, h.head - MOOR_BACK, 0);
  return { x, z, pierX, pierZ };
}

function line(out: P[], [ax, az]: P, [bx, bz]: P): void {
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / STEP));
  for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
}

const nearestOnRing = (p: P): number => {
  const r = ferryRing();
  let best = 0, bd = Infinity;
  for (let i = 0; i < r.length; i++) { const d = (r[i][0] - p[0]) ** 2 + (r[i][1] - p[1]) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
};

/** The ferry's course from `from`'s pier to `to`'s (world, every ~4 m), or null if either has no harbour. */
export function ferryRoute(from: RegionId, to: RegionId): P[] | null {
  const a = harbourOf(from), b = harbourOf(to);
  if (!a || !b || a === b) return null;
  const r = ferryRing(), o = ferryOffset(), far = (h: Harbour) => seaPoint(h, S / 2 + o, MOOR_SIDE);
  const ia = nearestOnRing(far(a)), ib = nearestOnRing(far(b)), n = r.length;
  const fwd = (ib - ia + n) % n, dir = fwd <= n / 2 ? 1 : -1, steps = dir > 0 ? fwd : n - fwd;
  const pts: P[] = [];
  const ma = mooring(a), mb = mooring(b);
  // Cast off: ahead past the pier head, then out across the ship lanes to the open sea.
  line(pts, [ma.x, ma.z], seaPoint(a, a.head + 24, MOOR_SIDE));
  line(pts, seaPoint(a, a.head + 24, MOOR_SIDE), r[ia]);
  // Round the island, the short way.
  for (let k = 0; k < steps; k++) pts.push(r[(ia + dir * k + n) % n]);
  // In to the harbour, and come alongside its pier (bow toward the shore).
  line(pts, r[ib], seaPoint(b, b.head + 24, MOOR_SIDE));
  line(pts, seaPoint(b, b.head + 24, MOOR_SIDE), [mb.x, mb.z]);
  pts.push([mb.x, mb.z]);
  return pts;
}

/** The length of a course (m). */
export const courseLength = (pts: P[]): number => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** What the crossing costs, and how long it takes (game minutes). */
export function ferryFare(from: RegionId, to: RegionId): { coins: number; minutes: number; km: number } | null {
  const pts = ferryRoute(from, to);
  if (!pts) return null;
  const km = courseLength(pts) / 1000;
  return { coins: Math.round(FERRY_BASE + km * FERRY_PER_KM), minutes: Math.round(km * FERRY_MIN_PER_KM), km };
}

// ───── the ferry ─────

/** The ferry's size (its own frame: +z forward): the foredeck's floor height. */
export const FERRY = { halfW: 3, len: 20, deckY: 1.5 };
/** Their benches on the foredeck, port and starboard, a planter between. */
export const FERRY_SEATS: { girl: [number, number, number]; boy: [number, number, number] } = {
  girl: [-1.3, FERRY.deckY + 0.45, 5.4],
  boy: [1.3, FERRY.deckY + 0.45, 5.4],
};
/** The family's places on the benches behind (hers side first, then his). */
export const FERRY_FAMILY_SEATS: Array<[number, number, number]> = [3.9, 2.4, 0.9].flatMap((z) => [
  [-1.3, FERRY.deckY + 0.45, z], [1.3, FERRY.deckY + 0.45, z],
] as Array<[number, number, number]>);
