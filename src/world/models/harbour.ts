import type { Ctx } from '../architecture';
import { box, cyl, gable, sphere } from '../kit';

/** The harbour's deck height above the sea (the pier and quay are walked on at this level). */
export const DECK = 1.2;
/** The harbour office and warehouse on the shore (local frame), for collisions. */
export const WAREHOUSE = { x: -9, z: -16, w: 12, d: 8, h: 5 } as const;

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §22): a harbour in the land
 * `c.s`'s own style. Local frame: origin on the quay at the shore, +z straight out to sea, the
 * deck at y = 0 (= sea level + DECK). The pier runs from z = 0 to z = `pier` (4 m wide, walkable —
 * keep its deck flat at y = 0 and its width); ships come alongside its head. On the land side
 * (z < 0) a quay, the harbour office / warehouse at `WAREHOUSE`, and whatever the land's
 * harbours have: cranes and bollards (London, New Yonder), fishing sheds and drying racks
 * (Fjordhavn, Aurora), a lighthouse, dhow slipways (Souq al-Qamar, the desert), stilted
 * boathouses (Kaveri Coast), coloured warehouses (Maple Row). `ground(x, z)` is the terrain height
 * at a local point relative to the deck. Lamps along the pier in `c.glow`.
 *
 * PLACEHOLDER: a stone quay, a plank pier on piles, lamps, a crane and a plain warehouse.
 */
export function buildHarbour(c: Ctx, pier: number, ground: (x: number, z: number) => number): void {
  // Quay: a stone apron from the shore down into the water.
  box(c.g, 26, 5, 10, '#9a948a', 0, -4.9, -4);
  box(c.g, 26.4, 0.3, 10.4, '#b8b0a2', 0, -0.1, -4);
  // Pier: planks on piles, bollards at the head, lamps along it.
  box(c.g, 4, 0.25, pier, '#8a6a4a', 0, -0.2, pier / 2);
  for (let z = 2; z <= pier; z += 4) for (const x of [-1.8, 1.8]) cyl(c.g, 0.18, 0.2, 6, '#5a4432', x, -6, z, 6);
  for (const x of [-1.6, 1.6]) cyl(c.g, 0.2, 0.25, 0.6, '#3a3a40', x, 0, pier - 0.6, 8);
  for (let z = 6; z <= pier; z += 12) {
    cyl(c.g, 0.06, 0.06, 3, '#3a3a40', 1.9, 0, z, 5);
    sphere(c.glow, 0.2, c.s.glow, 1.9, 3.1, z, 6);
  }
  // A crane by the pier head.
  const cz = Math.max(4, pier - 8);
  box(c.g, 0.6, 9, 0.6, '#d9a441', -3.2, 0, cz);
  box(c.g, 0.4, 0.4, 8, '#d9a441', -3.2, 8.6, cz + 3.2);
  // Warehouse and office.
  const wy = ground(WAREHOUSE.x, WAREHOUSE.z);
  box(c.g, WAREHOUSE.w, WAREHOUSE.h, WAREHOUSE.d, c.rng.pick(c.s.walls), WAREHOUSE.x, wy - 0.5, WAREHOUSE.z);
  gable(c.g, WAREHOUSE.w + 0.6, WAREHOUSE.d + 0.6, 2, c.rng.pick(c.s.roofs), WAREHOUSE.x, wy + WAREHOUSE.h - 0.5, WAREHOUSE.z);
  box(c.g, 3, 3, 0.1, '#5a3a26', WAREHOUSE.x, wy - 0.5, WAREHOUSE.z + WAREHOUSE.d / 2 + 0.03);
  box(c.glow, 1, 1, 0.05, c.s.glow, WAREHOUSE.x + 3.5, wy + 2, WAREHOUSE.z + WAREHOUSE.d / 2 + 0.04);
}
