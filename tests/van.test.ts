import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MAX_CHILDREN, MAX_PETS, MEMBER_CLEARANCE } from '../src/caravan/caravan';
import { SEAT_GAP, VEHICLES, buildVehicle } from '../src/vehicles/vehicles';
import { BED, BEDS, BENCH, BENCH_SEATS, BUNK, BUNKS, CAB_SEATS, PET_BEDS, PET_BED_R, RIDE_CHILD_SEATS, VAN, VAN_CAPACITY } from '../src/vehicles/vanLayout';

type Rect = { name: string; x0: number; x1: number; z0: number; z1: number };
const rect = (name: string, x: number, z: number, w: number, d: number): Rect => ({ name, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.z0 < b.z1 - 1e-6 && b.z0 < a.z1 - 1e-6;

describe('Safar, the bigger van', () => {
  it('has room for exactly as many children and pets as may travel', () => {
    expect(VAN_CAPACITY).toEqual({ children: MAX_CHILDREN, pets: MAX_PETS });
    expect(MAX_CHILDREN).toBe(4);
    expect(MAX_PETS).toBe(4);
    expect(RIDE_CHILD_SEATS.length).toBe(MAX_CHILDREN);
  });

  it('the two never share a seat: separate cab seats with a console, facing benches with a table between', () => {
    const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
    expect(d(CAB_SEATS[0], CAB_SEATS[1])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(d(BENCH_SEATS[0], BENCH_SEATS[1])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(Math.sign(BENCH_SEATS[0][0])).toBe(-Math.sign(BENCH_SEATS[1][0])); // the table (x = 0) is between them
    const [g, b] = VEHICLES.van.seats as Array<{ x: number; z: number }>;
    expect(Math.hypot(g.x - b.x, g.z - b.z)).toBeGreaterThanOrEqual(SEAT_GAP);
    // Two separate beds with a curtain (x = 0) between.
    expect(BEDS[0][0] + BED.w / 2).toBeLessThan(0);
    expect(BEDS[1][0] - BED.w / 2).toBeGreaterThan(0);
  });

  it('beds, bunks, benches and pet beds fit inside the cabin without overlapping', () => {
    const items: Rect[] = [
      ...BEDS.map(([x, z], i) => rect(`bed${i}`, x, z, BED.w, BED.len)),
      ...BUNKS.filter((_, i) => i % 2 === 0).map(([x, , z], i) => rect(`bunks${i}`, x, z, BUNK.w, BUNK.len)),
      ...[-1, 1].map((s) => rect(`bench${s}`, s * BENCH.x, BENCH.z, BENCH.depth, BENCH.len)),
      rect('table', 0, BENCH.z, 0.62, 1.0),
      rect('kitchen', VAN.halfW - 0.32, 2.15, 0.6, 1.0),
      ...PET_BEDS.map(([x, z], i) => rect(`pet${i}`, x, z, PET_BED_R * 2, PET_BED_R * 2)),
    ];
    for (const r of items) {
      expect(r.x0, r.name).toBeGreaterThanOrEqual(-VAN.halfW);
      expect(r.x1, r.name).toBeLessThanOrEqual(VAN.halfW);
      expect(r.z0, r.name).toBeGreaterThanOrEqual(VAN.back);
      expect(r.z1, r.name).toBeLessThanOrEqual(VAN.cab);
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) expect(overlap(items[i], items[j]), `${items[i].name} × ${items[j].name}`).toBe(false);
    // Children riding along sit apart from each other.
    for (let i = 0; i < RIDE_CHILD_SEATS.length; i++) for (let j = i + 1; j < RIDE_CHILD_SEATS.length; j++) {
      const [a, b] = [RIDE_CHILD_SEATS[i], RIDE_CHILD_SEATS[j]];
      expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThanOrEqual(MEMBER_CLEARANCE);
    }
  });

  it('the van you drive is the size of the room inside', () => {
    const v = buildVehicle('van', { lights: 'warm', rug: 'plain' })!;
    const box = new THREE.Box3().setFromObject(v.root);
    const size = box.getSize(new THREE.Vector3());
    expect(size.z).toBeGreaterThan(VAN.front - VAN.back - 0.2);
    expect(size.x).toBeGreaterThanOrEqual(VAN.halfW * 2);
    expect(size.y).toBeGreaterThan(VAN.floorY + VAN.wall);
    // Bigger than the old 2.3 × 5 m van.
    expect(size.z).toBeGreaterThan(8);
  });
});
