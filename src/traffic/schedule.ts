import { REGIONS, type RegionId, type RegionSpec } from '../world/regions';

/**
 * When and where traffic runs (pure rules; tests/traffic-schedule.test.ts):
 *
 * - **Time of day**: roads are busiest by day and quiet at night (a third still out); lantern boats
 *   come out only from dusk to late evening; birds of the day rest after dark, owls fly only then;
 *   aircraft fly less at night.
 * - **Junctions**: where each avenue crosses the ring road there are traffic lights. They cycle —
 *   the avenue's turn, amber, the ring road's turn, a moment all red — and vehicles stop at the line.
 * - **Highways**: each town's avenues run on past its fields to the border, where they meet the
 *   next land's avenue, so there is a road between every pair of neighbouring towns. Traffic on it
 *   is placed by the clock, not by which land you are in, so crossing the border never makes a
 *   vehicle pop in or out.
 */

// ───── time of day ─────

/** Traffic that comes out only after dusk. */
export const DUSK_ONLY = new Set(['lantern-boat']);
/** Birds that rest at night, and the ones that fly only then. */
const DAY_BIRDS = new Set(['pigeons', 'cranes', 'eagle', 'falcons', 'light-birds', 'ducks', 'swans']);
const NIGHT_BIRDS = new Set(['owls']);
const AIRCRAFT = /plane|airliner|jet|air-taxi|drone|seaplane|biplane/;

const dusk = (hour: number) => hour >= 18 && hour < 23.5;
const night = (hour: number) => hour >= 21 || hour < 5.5;
const twilight = (hour: number) => (hour >= 5.5 && hour < 7) || (hour >= 19 && hour < 21);

/** The share (0…1) of a kind of traffic that is out at this hour. */
export function activeShare(id: string, realm: 'road' | 'water' | 'sky', hour: number): number {
  if (DUSK_ONLY.has(id)) return dusk(hour) ? 1 : 0;
  if (NIGHT_BIRDS.has(id)) return night(hour) ? 1 : 0;
  if (DAY_BIRDS.has(id)) return night(hour) ? 0 : 1;
  if (realm === 'road') return night(hour) ? 0.35 : twilight(hour) ? 0.7 : 1;
  if (realm === 'sky' && AIRCRAFT.test(id)) return night(hour) ? 0.5 : 1;
  return 1;
}

/** Whether the i-th of a kind is out, given the share (the same ones every night). */
export const isOut = (i: number, share: number): boolean => share >= 1 || ((i * 0.618034) % 1) < share;

// ───── junction lights ─────

/** One cycle of the lights (s): avenue green, amber, ring green, amber, a moment all red between. */
export const LIGHT_CYCLE = 30;
export type Light = 'green' | 'amber' | 'red';

/** The lights facing the avenue and facing the ring road at time t (s). */
export function lights(t: number): { avenue: Light; ring: Light } {
  const p = ((t % LIGHT_CYCLE) + LIGHT_CYCLE) % LIGHT_CYCLE;
  if (p < 12) return { avenue: 'green', ring: 'red' };
  if (p < 14) return { avenue: 'amber', ring: 'red' };
  if (p < 15) return { avenue: 'red', ring: 'red' };
  if (p < 27) return { avenue: 'red', ring: 'green' };
  if (p < 29) return { avenue: 'red', ring: 'amber' };
  return { avenue: 'red', ring: 'red' };
}

/** The ring road's radius, and where vehicles wait before a crossing (m from its middle). */
export const RING_R = 140, STOP_BACK = 9.5;

// ───── highways between lands ─────

/** The lands next to this one on the map, and the direction to each (unit, along x or z). */
export function neighbours(land: RegionId): Array<{ land: RegionId; dir: [number, number] }> {
  const r = REGIONS.find((q) => q.id === land) as RegionSpec;
  const out: Array<{ land: RegionId; dir: [number, number] }> = [];
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = REGIONS.find((q) => q.col === r.col + dc && q.row === r.row + dr);
    // The Sky Isles float above the clouds: no road reaches them.
    if (n && n.id !== 'skyisles' && land !== 'skyisles') out.push({ land: n.id, dir: [dc, dr] });
  }
  return out;
}

/** The highways (each pair of neighbours once), named `a~b` with a before b in the map's order. */
export function highways(): Array<{ id: string; a: RegionId; b: RegionId; dir: [number, number] }> {
  const out: Array<{ id: string; a: RegionId; b: RegionId; dir: [number, number] }> = [];
  for (const r of REGIONS) for (const n of neighbours(r.id)) {
    if (n.dir[0] < 0 || n.dir[1] < 0) continue; // each pair once: from the west/north end
    out.push({ id: `${r.id}~${n.land}`, a: r.id, b: n.land, dir: n.dir });
  }
  return out;
}

/** What travels between towns on each highway, and how many (intercity buses, lorries, carts, couriers). */
export const HIGHWAY_TRAFFIC: Array<[string, number]> = [['post-bus', 1], ['city-bus', 1], ['pickup', 1], ['suv', 1], ['sedan', 1], ['painted-truck', 1]];

/** Where a highway vehicle is along its loop at time t: it keeps going, whichever land you are in. */
export const highwayU = (u0: number, speed: number, t: number, len: number): number => (((u0 + speed * t) % len) + len) % len;
