import { REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { RING_R } from '../traffic/schedule';

/**
 * City trams (pure rules; tests/streetTram.test.ts). The towns whose streets carry trams — Sakura
 * Hollow's green-and-cream streetcars, New Yonder's solar trams, Maple Row's red cable cars — have
 * a tram stop on each of their four avenues, further out than the bus stop (between two street
 * lamps, short of where people in need wait). From any stop the tram
 * runs out along its avenue, round the ring road and in along another avenue to that stop.
 *
 * On the tram the two sit in separate seats either side of the aisle in the front row, a rail
 * between them; the family in the rows behind. The fare is a flat two coins.
 */

export type TramStyle = 'streetcar' | 'solar' | 'cable';
export const TRAM_TOWNS: Partial<Record<RegionId, TramStyle>> = { japan: 'streetcar', newyork: 'solar', vintage: 'cable' };
export const TRAM_NAME: Record<TramStyle, string> = { streetcar: 'streetcar', solar: 'solar tram', cable: 'cable car' };

/** How far out along its avenue a tram stop stands (m), how far to the side, and its kerb. */
export const TRAM_STOP_D = 93, TRAM_STOP_SIDE = 13.5, TRAM_KERB_SIDE = 7.5;
export const TRAM_FARE = 2;
/** Game minutes for a ride across town. */
export const TRAM_MINUTES = 12;

export interface TramStop {
  id: string;
  land: RegionId;
  /** Which avenue: its name and its unit direction out from the centre. */
  name: string;
  dir: [number, number];
  /** The shelter and the kerb where you board (world); the way the shelter faces. */
  x: number;
  z: number;
  kerbX: number;
  kerbZ: number;
  facing: number;
}

const DIRS: Array<[number, number]> = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const NAMES = ['South Avenue', 'East Avenue', 'North Avenue', 'West Avenue'];
/** The lamp side of the avenue, as the bus stops (travel/bus.ts). */
const lampSide = ([ax, az]: [number, number]): [number, number] => (az !== 0 ? [az, 0] : [0, ax]);

export function tramStops(land: RegionId): TramStop[] {
  if (!TRAM_TOWNS[land]) return [];
  const c = regionCenter(REGION_BY_ID[land]);
  return DIRS.map((dir, i) => {
    const [sx, sz] = lampSide(dir);
    return {
      id: `${land}:tram${i}`, land, name: NAMES[i], dir,
      x: c.x + dir[0] * TRAM_STOP_D + sx * TRAM_STOP_SIDE, z: c.z + dir[1] * TRAM_STOP_D + sz * TRAM_STOP_SIDE,
      kerbX: c.x + dir[0] * TRAM_STOP_D + sx * TRAM_KERB_SIDE, kerbZ: c.z + dir[1] * TRAM_STOP_D + sz * TRAM_KERB_SIDE,
      facing: Math.atan2(-sx, -sz),
    };
  });
}

/** Region-local tram shelters (for building them). */
export function tramShelters(land: RegionId): Array<{ x: number; z: number; facing: number }> {
  const c = regionCenter(REGION_BY_ID[land]);
  return tramStops(land).map((s) => ({ x: s.x - c.x, z: s.z - c.z, facing: s.facing }));
}

type P = [number, number];
const STEP = 2;
function line(out: P[], ax: number, az: number, bx: number, bz: number): void {
  const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / STEP));
  for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
}

/**
 * The tram's way from stop `a` to stop `b` in the same town (world, every ~2 m, the road's centre
 * line): out along a's avenue to the ring road, round the ring the short way (all the way round
 * when both are on one avenue — never), in along b's avenue to b's kerb.
 */
export function tramPath(a: TramStop, b: TramStop): P[] {
  if (a.land !== b.land || a.id === b.id) return [];
  const c = regionCenter(REGION_BY_ID[a.land]);
  const pts: P[] = [[a.kerbX, a.kerbZ]];
  line(pts, c.x + a.dir[0] * TRAM_STOP_D, c.z + a.dir[1] * TRAM_STOP_D, c.x + a.dir[0] * RING_R, c.z + a.dir[1] * RING_R);
  const a0 = Math.atan2(a.dir[1], a.dir[0]);
  let d = Math.atan2(b.dir[1], b.dir[0]) - a0;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const n = Math.max(1, Math.round((Math.abs(d) * RING_R) / STEP));
  for (let i = 0; i < n; i++) { const t = a0 + (d * i) / n; pts.push([c.x + Math.cos(t) * RING_R, c.z + Math.sin(t) * RING_R]); }
  line(pts, c.x + b.dir[0] * RING_R, c.z + b.dir[1] * RING_R, c.x + b.dir[0] * TRAM_STOP_D, c.z + b.dir[1] * TRAM_STOP_D);
  pts.push([b.kerbX, b.kerbZ]);
  return pts;
}

// ───── the tram ─────

/** The tram's body (its own frame, +z forward): a low floor, seats in pairs across the aisle. */
export const STREET_TRAM = { halfW: 1.3, len: 10, floorY: 0.5 };
const SY = STREET_TRAM.floorY + 0.45;
export const STREET_TRAM_SEATS: { girl: [number, number, number]; boy: [number, number, number] } = {
  girl: [-0.8, SY, 2.9],
  boy: [0.8, SY, 2.9],
};
export const STREET_TRAM_FAMILY_SEATS: Array<[number, number, number]> = [
  [-0.8, SY, 1.7], [0.8, SY, 1.7],
  [-0.8, SY, 0.5], [0.8, SY, 0.5],
  [-0.8, SY, -0.7], [0.8, SY, -0.7],
  [-0.8, SY, -1.9], [0.8, SY, -1.9],
  [-0.8, SY, -3.1], [0.8, SY, -3.1],
];
