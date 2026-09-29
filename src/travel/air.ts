import { REGIONS, REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { WATER_Y, terrainHeight } from '../world/terrain';
import { STOP_D, busStops, type BusStop } from './bus';

/**
 * The air taxi (pure rules; tests/ferry.test.ts). At any bus stop you can call one instead of the
 * coach: it settles on the avenue beside the kerb, lifts straight up, climbs, flies straight over
 * the lands at a height clear of every roof and tower, and comes down the same way beside the stop
 * of the town they chose. It is the one way up to the Sky Isles other than wings: there it lands
 * on a pad on the top island, by the Temple of the Great Lantern, and it takes off from there too.
 *
 * On board the two sit in separate seats either side of a console, the family behind.
 */

type P3 = [number, number, number];

/** Where it settles on the avenue: this far to the kerb's side of the centre line. */
export const AIR_SIDE = 3.5;
/** Coins: a little to board, and so much per kilometre flown. Game minutes per kilometre. */
export const AIR_BASE = 6, AIR_PER_KM = 4, AIR_MIN_PER_KM = 3;
/** Height above the highest ground under the course, and the straight lift-off before it climbs. */
export const AIR_CLEAR = 110, AIR_LIFT = 14;

/** The landing stage floating beside the Sky Isles' top island (region-local), outward of it. */
export const PAD_R = 6, PAD_OUT = 36;
export function skyPad(): { x: number; y: number; z: number; facing: number; ux: number; uz: number; isle: [number, number] } {
  // The spiral's top island (architecture.ts skyisles, i = 15).
  const a = 15 * 0.9, r = 70 - 15 * 3.2, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
  const d = Math.hypot(cx, cz) || 1, ux = cx / d, uz = cz / d;
  return { x: cx + ux * PAD_OUT, y: 18 + 15 * 9 + 0.6, z: cz + uz * PAD_OUT, facing: Math.atan2(-ux, -uz), ux, uz, isle: [cx, cz] };
}

/** Where the taxi stands on the ground in `land` (world), and the kerb or pad you step down onto. */
export interface AirPoint { land: RegionId; x: number; y: number; z: number; stepX: number; stepZ: number; facing: number }

export function airPointAtStop(s: BusStop): AirPoint {
  const c = regionCenter(REGION_BY_ID[s.land]);
  const kx = s.kerbX - (c.x + s.dir[0] * STOP_D), kz = s.kerbZ - (c.z + s.dir[1] * STOP_D), k = Math.hypot(kx, kz) || 1;
  const x = c.x + s.dir[0] * STOP_D + (kx / k) * AIR_SIDE, z = c.z + s.dir[1] * STOP_D + (kz / k) * AIR_SIDE;
  return { land: s.land, x, y: Math.max(terrainHeight(x, z), WATER_Y), z, stepX: s.kerbX, stepZ: s.kerbZ, facing: s.facing + Math.PI };
}

export function skyPadPoint(): AirPoint {
  const c = regionCenter(REGION_BY_ID.skyisles), p = skyPad();
  // Step off on the stage, toward the bridge to the temple.
  return { land: 'skyisles', x: c.x + p.x, y: p.y, z: c.z + p.z, stepX: c.x + p.x - p.ux * (PAD_R - 2), stepZ: c.z + p.z - p.uz * (PAD_R - 2), facing: p.facing };
}

/** Where a taxi to `to` lands, arriving from (fx, fz): the stop nearest the way it comes in, or the pad. */
export function airArrival(to: RegionId, fx: number, fz: number): AirPoint {
  if (to === 'skyisles') return skyPadPoint();
  const stops = busStops(to).map(airPointAtStop);
  return stops.reduce((a, b) => (Math.hypot(b.x - fx, b.z - fz) < Math.hypot(a.x - fx, a.z - fz) ? b : a));
}

/** The height it cruises at between two points: clear of the ground, the towers and the Sky Isles. */
export function cruiseHeight(a: AirPoint, b: AirPoint): number {
  let top = Math.max(a.y, b.y);
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.ceil(d / 40));
  const sky = regionCenter(REGION_BY_ID.skyisles);
  for (let i = 0; i <= n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n, z = a.z + ((b.z - a.z) * i) / n;
    top = Math.max(top, terrainHeight(x, z));
    // Over the floating islands, above the temple's lantern.
    if (Math.hypot(x - sky.x, z - sky.z) < 140) top = Math.max(top, skyPad().y + 40);
  }
  return top + AIR_CLEAR;
}

/** The course (world x, y, z every few metres): lift off, climb, cruise, descend, settle. */
export function airCourse(a: AirPoint, b: AirPoint): P3[] {
  const h = cruiseHeight(a, b), d = Math.hypot(b.x - a.x, b.z - a.z) || 1, ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
  // The climb and the descent each take a slope of about 1 in 2.5, no more than a third of the way.
  const run = (dy: number) => Math.min(d / 3, Math.max(40, dy * 2.5));
  const ra = run(h - a.y - AIR_LIFT), rb = run(h - b.y - AIR_LIFT);
  const keys: P3[] = [
    [a.x, a.y, a.z], [a.x, a.y + AIR_LIFT, a.z],
    [a.x + ux * ra, h, a.z + uz * ra], [b.x - ux * rb, h, b.z - uz * rb],
    [b.x, b.y + AIR_LIFT, b.z], [b.x, b.y, b.z],
  ];
  const out: P3[] = [];
  for (let k = 1; k < keys.length; k++) {
    const [px, py, pz] = keys[k - 1], [qx, qy, qz] = keys[k];
    const n = Math.max(1, Math.round(Math.hypot(qx - px, qy - py, qz - pz) / 3));
    for (let i = 0; i < n; i++) out.push([px + ((qx - px) * i) / n, py + ((qy - py) * i) / n, pz + ((qz - pz) * i) / n]);
  }
  out.push(keys[keys.length - 1]);
  return out;
}

/** Every land a taxi from `from` flies to (every other land, the Sky Isles included). */
export const airDestinations = (from: RegionId): RegionId[] => REGIONS.map((r) => r.id).filter((id) => id !== from);

/** What the flight costs, and how long it takes (game minutes). */
export function airFare(a: AirPoint, to: RegionId): { coins: number; minutes: number; km: number } {
  const b = airArrival(to, a.x, a.z), km = Math.hypot(b.x - a.x, b.z - a.z) / 1000;
  return { coins: Math.round(AIR_BASE + km * AIR_PER_KM), minutes: Math.max(5, Math.round(km * AIR_MIN_PER_KM)), km };
}

// ───── the taxi ─────

/** The air taxi's cabin (its own frame: +z forward). */
export const AIR = { halfW: 1.45, len: 6.6, floorY: 0.85 };
export const AIR_SEATS: { girl: P3; boy: P3 } = {
  girl: [-0.75, AIR.floorY + 0.45, 1.3],
  boy: [0.75, AIR.floorY + 0.45, 1.3],
};
export const AIR_FAMILY_SEATS: P3[] = [0.1, -1.1].flatMap((z) => [[-0.75, AIR.floorY + 0.45, z], [0.75, AIR.floorY + 0.45, z]] as P3[]);
