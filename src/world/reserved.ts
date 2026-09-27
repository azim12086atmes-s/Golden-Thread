import type { RegionId } from './regions';

/**
 * Ground set aside in a land for its great features, kept clear of lakes, ponds, rivers, caves,
 * houses and trees (local coordinates, circles). The pyramids stand on their plateau west of
 * Nile Crossing, as at Giza; the Nile itself runs past the town's east edge (waters.ts).
 */
export const PYRAMIDS: Array<{ x: number; z: number; s: number }> = [
  { x: -292, z: -95, s: 60 },
  { x: -300, z: 62, s: 44 },
  { x: -262, z: 150, s: 34 },
];

/** The Nile's line through Nile Crossing (local x of its centre at local z) and its width. */
export const NILE_X = 300, NILE_W = 22;
export const nileX = (z: number): number => NILE_X + Math.sin(z * 0.012) * 7;

export const RESERVED: Partial<Record<RegionId, Array<{ x: number; z: number; r: number }>>> = {
  egypt: PYRAMIDS.map((p) => ({ x: p.x, z: p.z, r: p.s * 0.55 })),
};

/**
 * Landmark grounds that reach beyond the plaza (local rectangles): Bagh-e-Noor's charbagh runs
 * from the gate south of the plaza to the tomb's terrace and river front in the north.
 */
export const LANDMARK_GROUNDS: Partial<Record<RegionId, { x0: number; x1: number; z0: number; z1: number }>> = {
  mughal: { x0: -54, x1: 54, z0: -70, z1: 110 },
};

/** Is a local point within `pad` metres of ground reserved in this land? */
export function reservedAt(land: RegionId, x: number, z: number, pad = 0): boolean {
  const g = LANDMARK_GROUNDS[land];
  if (g && x > g.x0 - pad && x < g.x1 + pad && z > g.z0 - pad && z < g.z1 + pad) return true;
  return (RESERVED[land] ?? []).some((q) => Math.hypot(x - q.x, z - q.z) < q.r + pad);
}
