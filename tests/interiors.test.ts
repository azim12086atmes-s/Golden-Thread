import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { INTERIOR_CLEAR, INTERIOR_SEAT_GAP, interiorSpecFor, safeInterior } from '../src/housing/HouseInterior';
import type { InteriorBuild } from '../src/world/models/interiors';
import type { Door } from '../src/world/RegionBuilder';

const door = (id: string, kind: string, land = 'london'): Door => ({ id, land, x: 0, z: 0, y: 0, facing: 0, kind, r: 1 });
const build = (seats: InteriorBuild['seats'], spots: Array<[number, number]>): InteriorBuild => ({
  group: new THREE.Group(), room: { halfW: 6, back: -6, front: 6, height: 5 }, seats, spots, camera: { pos: [0, 2, 6], look: [0, 1, 0] },
});

describe('built interiors', () => {
  it('monuments, institutes, caverns, the castle and penthouses ask the 3D side; ordinary houses keep their room', () => {
    expect(interiorSpecFor(door('lm', 'landmark'), 0)).toMatchObject({ kind: 'landmark', land: 'london', ref: 'london' });
    expect(interiorSpecFor(door('inst:london-s1:kitchen:2', 'institute'), 1)).toMatchObject({ kind: 'institute', ref: 'kitchen', stage: 2, night: 1 });
    expect(interiorSpecFor(door('cavern:ice:c1', 'cavern', 'aurora'), 0)).toMatchObject({ kind: 'cavern', ref: 'ice' });
    expect(interiorSpecFor(door('c', 'castle', 'meadow'), 0)).toMatchObject({ kind: 'castle' });
    expect(interiorSpecFor(door('p', 'penthouse', 'newyork'), 0)).toMatchObject({ kind: 'penthouse' });
    expect(interiorSpecFor(door('h1', 'house'), 0)).toBeNull();
    expect(interiorSpecFor(door('home:x', 'home'), 0)).toBeNull();
  });

  it('a scene that seats the two closer than 2.2 m is refused, and nobody else stands within 1.5 m of them', () => {
    expect(safeInterior(null)).toBeNull();
    expect(safeInterior(build([[0, 0.45, 0], [2, 0.45, 0]], []))).toBeNull();
    const ok = safeInterior(build([[-1.2, 0.45, 0], [1.2, 0.45, 0]], [[0, 0], [-1.2, 1.0], [0, -3], [3, 3]]))!;
    expect(ok).not.toBeNull();
    expect(ok.spots).toEqual([[0, -3], [3, 3]]);
    for (const [x, z] of ok.spots) for (const s of ok.seats) expect(Math.hypot(x - s[0], z - s[2])).toBeGreaterThanOrEqual(INTERIOR_CLEAR);
    expect(Math.hypot(ok.seats[0][0] - ok.seats[1][0], ok.seats[0][2] - ok.seats[1][2])).toBeGreaterThanOrEqual(INTERIOR_SEAT_GAP);
  });
});

describe('the built interiors (caverns, institutes, the castle, landmark halls)', () => {
  it('every one builds, and the two sit at least 2.2 m apart', async () => {
    const { buildInterior } = await import('../src/world/models/interiors');
    const { safeInterior } = await import('../src/housing/HouseInterior');
    const { REGIONS } = await import('../src/world/regions');
    const { INSTITUTES } = await import('../src/institutions/catalogue');
    const specs = [
      ...['sandstone', 'rock', 'ice', 'crystal'].map((ref) => ({ kind: 'cavern' as const, land: 'aurora' as const, ref, night: 0, seed: ref })),
      { kind: 'castle' as const, land: 'meadow' as const, ref: 'hall', night: 1, seed: 'c' },
      ...REGIONS.map((r) => ({ kind: 'landmark' as const, land: r.id, ref: r.id, night: 0.5, seed: r.id })),
      ...INSTITUTES.flatMap((d) => [0, 3].map((stage) => ({ kind: 'institute' as const, land: d.land ?? 'meadow', ref: d.kind, stage, night: 0, seed: d.kind }))),
    ];
    for (const s of specs) {
      const b = buildInterior(s);
      expect(b, `${s.kind} ${s.ref}`).not.toBeNull();
      expect(safeInterior(b), `${s.kind} ${s.ref} seats`).not.toBeNull();
      expect(b!.group.children.length).toBeGreaterThan(0);
    }
  });
});
