import { GRID_COLS, GRID_ROWS, REGION_BY_ID, REGIONS, regionCenter, type RegionId } from './regions';
import { WATER_Y, terrainHeight } from './terrain';

/**
 * Harbours and sea lanes (owner's brief: ships as well as boats; NEXT_WORK C5 supply chain).
 * The world is an island: beyond the lands the ground slopes into the sea (terrain.ts). Every
 * land on the coast has a harbour where its avenue runs down to the shore — a quay on the beach, a
 * pier out to deep water — and a sea lane along its coast where ships sail out and back, stopping
 * at the pier head. Positions come from the terrain itself, so they sit on the real shore.
 * Pure data (tests/harbours.test.ts); drawn by economy/HarboursView.ts, sailed by traffic/Traffic.ts.
 */
export interface Harbour {
  id: string;
  land: RegionId;
  /** Unit direction out to sea from the land's centre. */
  dir: [number, number];
  /** The quay on the shore (world), and how far from the land's centre it is. */
  x: number;
  z: number;
  shore: number;
  /** The pier head, where ships tie up (world), its distance from the centre, and the pier's length. */
  headX: number;
  headZ: number;
  head: number;
  pier: number;
  /** The sea lane: out-and-back along the coast, centred this far out, lanes this far either side. */
  lane: number;
  laneHalfWidth: number;
  /** How far along the coast the lane runs either side of the harbour. */
  reach: number;
}

const DEEP = WATER_Y - 2;
export const LANE_REACH = 320, LANE_HALF = 12;

/** Which way a coastal land faces the sea: north for the top row, south for the bottom, else west or east. */
export function seaSide(land: RegionId): [number, number] | null {
  const r = REGION_BY_ID[land];
  if (r.id === 'skyisles') return null;
  if (r.row === 0) return [0, -1];
  if (r.row === GRID_ROWS - 1) return [0, 1];
  if (r.col === 0) return [-1, 0];
  if (r.col === GRID_COLS - 1) return [1, 0];
  return null;
}

function build(land: RegionId): Harbour | null {
  const dir = seaSide(land);
  if (!dir) return null;
  const c = regionCenter(REGION_BY_ID[land]), [dx, dz] = dir, [tx, tz] = [-dz, dx];
  const at = (d: number, s = 0) => terrainHeight(c.x + dx * d + tx * s, c.z + dz * d + tz * s);
  // The sea's shore beyond the edge of the land (rivers and lakes lie closer in).
  let shore = 352;
  while (shore < 900 && at(shore) >= WATER_Y) shore += 2;
  let deep = shore;
  while (deep < 1000 && at(deep) >= DEEP) deep += 2;
  // The lane: far enough out that the whole stretch, both lanes, is deep water.
  let lane = deep + LANE_HALF + 8;
  const clear = (m: number) => {
    for (let s = -LANE_REACH - 20; s <= LANE_REACH + 20; s += 10) for (const o of [-LANE_HALF - 6, 0, LANE_HALF + 6]) if (at(m + o, s) >= DEEP) return false;
    return true;
  };
  while (lane < 1200 && !clear(lane)) lane += 4;
  // The pier reaches out to the inner lane, where ships come alongside.
  const head = lane - LANE_HALF - 5;
  return {
    id: `${land}-harbour`, land, dir, x: c.x + dx * (shore - 6), z: c.z + dz * (shore - 6), shore: shore - 6,
    headX: c.x + dx * head, headZ: c.z + dz * head, head, pier: head - (shore - 6),
    lane, laneHalfWidth: LANE_HALF, reach: LANE_REACH,
  };
}

let cache: Harbour[] | null = null;
/** Every harbour (computed from the terrain on first use). */
export function harbours(): Harbour[] {
  return (cache ??= REGIONS.map((r) => build(r.id)).filter((h): h is Harbour => !!h));
}
export const harbourOf = (land: RegionId): Harbour | undefined => harbours().find((h) => h.land === land);
export const hasHarbour = (land: RegionId): boolean => seaSide(land) !== null;
