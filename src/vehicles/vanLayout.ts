/**
 * Safar's floor plan, shared by the van you drive (vehicles.ts) and the room you step into
 * (VanInterior.ts), so the outside and the inside are the same van. Metres, in the van's own
 * frame: x across (+x is his side), z along (+z is the front), y up from the cabin floor.
 *
 *   front ── cab: two separate seats with a console between them
 *            door, kitchen, bookshelf, four pet beds
 *            two facing benches with a table between (where the two sit, across the aisle)
 *            two bunk towers — four children's bunks, curtains and lanterns
 *   back  ── two separate beds with a curtain between them; storage above and below
 */

export const VAN = {
  /** Half the width of the body, and its ends. */
  halfW: 1.5,
  back: -4.3,
  front: 4.3,
  /** Where the living cabin ends and the cab begins. */
  cab: 2.9,
  /** Height of the cabin floor above the road, and of the walls. */
  floorY: 0.75,
  wall: 2.35,
} as const;

/** The two cab seats (driving): hers on the left, his on the right, a console between. */
export const CAB_SEATS: Array<[number, number, number]> = [[-0.72, 0.48, 3.35], [0.72, 0.48, 3.35]];

/** Facing benches either side of the aisle, with a table between (their seats inside). */
export const BENCH = { x: 1.0, z: 0.55, len: 1.9, depth: 0.62 };
/**
 * Where each of the two sits on the benches when inside: across the table from each other and
 * a little diagonal, so even with their legs stretched out under the table they never meet.
 */
export const BENCH_SEATS: Array<[number, number, number]> = [[-BENCH.x, 0.05, BENCH.z - 0.5], [BENCH.x, 0.05, BENCH.z + 0.5]];

/** Four children's bunks: two towers of two, along the walls. [x, y (mattress), z] */
export const BUNKS: Array<[number, number, number]> = [[-1.05, 0.5, -1.55], [-1.05, 1.42, -1.55], [1.05, 0.5, -1.55], [1.05, 1.42, -1.55]];
export const BUNK = { w: 0.86, len: 1.5 };

/** Four pet beds by the door, two by two (the kitchen is across the aisle). [x, z] */
export const PET_BEDS: Array<[number, number]> = [[-1.12, 1.86], [-0.44, 1.86], [-1.12, 2.54], [-0.44, 2.54]];
export const PET_BED_R = 0.32;

/** The two separate beds at the back, a curtain between them. [x, z] */
export const BEDS: Array<[number, number]> = [[-0.75, -3.35], [0.75, -3.35]];
export const BED = { w: 1.2, len: 1.85 };

/** While driving, the children ride on the benches (two a side) — seatbelts on. */
export const RIDE_CHILD_SEATS: Array<[number, number, number]> = [
  [-BENCH.x, 0.05, BENCH.z - 0.5], [-BENCH.x, 0.05, BENCH.z + 0.45], [BENCH.x, 0.05, BENCH.z - 0.5], [BENCH.x, 0.05, BENCH.z + 0.45],
];

/** Capacity the van is built for: it must match caravan.ts's limits (tests check). */
export const VAN_CAPACITY = { children: BUNKS.length, pets: PET_BEDS.length };
