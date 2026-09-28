import { REGION_BY_ID, REGION_SIZE, regionCenter, type RegionId } from '../world/regions';
import { RING_R, neighbours } from '../traffic/schedule';

/**
 * Intercity buses (pure rules; tests/bus.test.ts). Every town on the ground has a bus stop on
 * each of its four avenues, a little out from the plaza. From any stop a coach runs to any other
 * town the roads reach: out along the avenue, round the ring road to the right avenue, along the
 * highway to the next town, round its ring road and on, and in along the last avenue to that
 * town's stop. The Sky Isles float above the clouds: no road reaches them.
 *
 * On the coach the two sit in separate window seats either side of the aisle, the family in the
 * rows behind; the fare is paid per town crossed.
 */

/** How far out along its avenue a stop stands (m from the centre), and how far to the side. */
export const STOP_D = 76, STOP_SIDE = 13.5;
/** The kerb where the coach pulls in and you board: a little in from the shelter. */
export const KERB_SIDE = 7.5;
/** Coins per town crossed. */
export const FARE_PER_LEG = 3;
/** Game minutes per town crossed. */
export const MINUTES_PER_LEG = 40;

export interface BusStop {
  id: string;
  land: RegionId;
  /** The avenue it stands on (unit direction out from the centre). */
  dir: [number, number];
  /** The shelter (world). */
  x: number;
  z: number;
  /** Where you wait and board (world). */
  kerbX: number;
  kerbZ: number;
  /** The way the shelter faces (toward the road). */
  facing: number;
}

const DIRS: Array<[number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/**
 * The side of the avenue the stop stands on: the side with the street lamps (RegionBuilder), so
 * the stalls, benches and trees on the other side keep their places.
 */
const lampSide = ([ax, az]: [number, number]): [number, number] => (az !== 0 ? [az, 0] : [0, ax]);

export function busStops(land: RegionId): BusStop[] {
  if (land === 'skyisles') return [];
  const c = regionCenter(REGION_BY_ID[land]);
  return DIRS.map((dir, i) => {
    const [sx, sz] = lampSide(dir);
    const x = dir[0] * STOP_D + sx * STOP_SIDE, z = dir[1] * STOP_D + sz * STOP_SIDE;
    return {
      id: `${land}:bus${i}`, land, dir,
      x: c.x + x, z: c.z + z,
      kerbX: c.x + dir[0] * STOP_D + sx * KERB_SIDE, kerbZ: c.z + dir[1] * STOP_D + sz * KERB_SIDE,
      facing: Math.atan2(-sx, -sz),
    };
  });
}

/** Region-local stop shelters (for building them): x, z and the way each faces. */
export function stopShelters(land: RegionId): Array<{ x: number; z: number; facing: number }> {
  const c = regionCenter(REGION_BY_ID[land]);
  return busStops(land).map((s) => ({ x: s.x - c.x, z: s.z - c.z, facing: s.facing }));
}

/** The towns a coach passes through from `from` to `to` (both included), or null if no road reaches. */
export function busLegs(from: RegionId, to: RegionId): RegionId[] | null {
  if (from === to) return [from];
  const prev = new Map<RegionId, RegionId>([[from, from]]);
  const queue: RegionId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbours(cur)) {
      if (prev.has(n.land)) continue;
      prev.set(n.land, cur);
      if (n.land === to) {
        const path: RegionId[] = [to];
        while (path[0] !== from) path.unshift(prev.get(path[0])!);
        return path;
      }
      queue.push(n.land);
    }
  }
  return null;
}

/** What the ride costs, and how long it takes (game minutes). */
export function busFare(from: RegionId, to: RegionId): { coins: number; minutes: number; towns: number } | null {
  const legs = busLegs(from, to);
  if (!legs || legs.length < 2) return null;
  const n = legs.length - 1;
  return { coins: n * FARE_PER_LEG, minutes: n * MINUTES_PER_LEG, towns: n };
}

type P = [number, number];
const STEP = 2;

/** Points every STEP metres from a to b (world), a included, b not. */
function line(out: P[], ax: number, az: number, bx: number, bz: number): void {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / STEP));
  for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
}

/** Round the ring road of the town at (cx, cz), from the avenue in direction `a` to the one in `b`, the short way. */
function arc(out: P[], cx: number, cz: number, a: P, b: P): void {
  const a0 = Math.atan2(a[1], a[0]);
  let d = Math.atan2(b[1], b[0]) - a0;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const n = Math.max(1, Math.round((Math.abs(d) * RING_R) / STEP));
  for (let i = 0; i < n; i++) {
    const t = a0 + (d * i) / n;
    out.push([cx + Math.cos(t) * RING_R, cz + Math.sin(t) * RING_R]);
  }
}

/**
 * The coach's road from the stop `start` to the town `to`: the centre line of avenues, ring roads
 * and highways (world, every ~2 m), ending at the kerb of `to`'s stop on the avenue it arrives by.
 * Returns the arrival stop too.
 */
export function busPath(start: BusStop, to: RegionId): { pts: P[]; stop: BusStop } | null {
  const legs = busLegs(start.land, to);
  if (!legs || legs.length < 2) return null;
  const pts: P[] = [[start.kerbX, start.kerbZ]];
  let entry: P = start.dir; // the avenue we are on, as a direction out from the town's centre
  let fromInside = true; // at the start we are inside the ring, heading out
  for (let i = 0; i < legs.length; i++) {
    const land = legs[i], c = regionCenter(REGION_BY_ID[land]);
    const last = i === legs.length - 1;
    if (last) {
      // In along the avenue we arrived by, to this town's stop on it.
      const stop = busStops(land).find((s) => s.dir[0] === entry[0] && s.dir[1] === entry[1])!;
      line(pts, c.x + entry[0] * (REGION_SIZE / 2), c.z + entry[1] * (REGION_SIZE / 2), c.x + entry[0] * RING_R, c.z + entry[1] * RING_R);
      line(pts, c.x + entry[0] * RING_R, c.z + entry[1] * RING_R, c.x + entry[0] * STOP_D, c.z + entry[1] * STOP_D);
      pts.push([stop.kerbX, stop.kerbZ]);
      return { pts, stop };
    }
    const next = legs[i + 1];
    const exit = neighbours(land).find((n) => n.land === next)!.dir as P;
    // Out to the ring (from the stop) or in from the border to the ring.
    if (fromInside) line(pts, c.x + entry[0] * STOP_D, c.z + entry[1] * STOP_D, c.x + entry[0] * RING_R, c.z + entry[1] * RING_R);
    else line(pts, c.x + entry[0] * (REGION_SIZE / 2), c.z + entry[1] * (REGION_SIZE / 2), c.x + entry[0] * RING_R, c.z + entry[1] * RING_R);
    // Round the ring to the avenue that leads on, then out to the border.
    if (entry[0] !== exit[0] || entry[1] !== exit[1]) arc(pts, c.x, c.z, entry, exit);
    line(pts, c.x + exit[0] * RING_R, c.z + exit[1] * RING_R, c.x + exit[0] * (REGION_SIZE / 2), c.z + exit[1] * (REGION_SIZE / 2));
    // Into the next town by its avenue facing back this way.
    entry = [-exit[0], -exit[1]];
    fromInside = false;
  }
  return null;
}

/**
 * Keep to one side of the road: each point moved `off` metres to the right of the way of travel
 * (negative: the left), except the first and last (the kerbs).
 */
export function keepSide(pts: P[], off: number): P[] {
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], len = Math.hypot(tx, tz) || 1;
    // Right of the way of travel: heading h = atan2(dx, dz), right = (-cos h, sin h) (Travellers).
    return [p[0] - (tz / len) * off, p[1] + (tx / len) * off] as P;
  });
}

// ───── the coach ─────

/** The coach's seats (its own frame: +z forward): hers and his either side of the aisle. */
export const COACH = { halfW: 1.3, len: 11, floorY: 1.05 };
export const COACH_SEATS: { girl: [number, number, number]; boy: [number, number, number] } = {
  girl: [-0.8, COACH.floorY + 0.45, 3.1],
  boy: [0.8, COACH.floorY + 0.45, 3.1],
};
/** Seats for the family in the rows behind (hers side first, then his), each two apart. */
export const COACH_FAMILY_SEATS: Array<[number, number, number]> = [
  [-0.8, COACH.floorY + 0.45, 1.9], [0.8, COACH.floorY + 0.45, 1.9],
  [-0.8, COACH.floorY + 0.45, 0.7], [0.8, COACH.floorY + 0.45, 0.7],
  [-0.8, COACH.floorY + 0.45, -0.5], [0.8, COACH.floorY + 0.45, -0.5],
  [-0.8, COACH.floorY + 0.45, -1.7], [0.8, COACH.floorY + 0.45, -1.7],
  [-0.8, COACH.floorY + 0.45, -2.9], [0.8, COACH.floorY + 0.45, -2.9],
];
