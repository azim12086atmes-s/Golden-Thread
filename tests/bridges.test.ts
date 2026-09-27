import { describe, expect, it } from 'vitest';
import { bridgesOf } from '../src/world/bridges';
import { REGIONS } from '../src/world/regions';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

describe('bridges over the rivers', () => {
  it('span each river where it crosses the line of an avenue, from dry bank to dry bank', () => {
    let total = 0;
    for (const r of REGIONS) for (const b of bridgesOf(r.id)) {
      total++;
      const [dx, dz] = b.dir, end = (s: number) => terrainHeight(b.x + dx * s * b.length / 2, b.z + dz * s * b.length / 2);
      expect(end(-1), b.id).toBeGreaterThan(WATER_Y + 0.3);
      expect(end(1), b.id).toBeGreaterThan(WATER_Y + 0.3);
      expect(terrainHeight(b.x, b.z), b.id).toBeLessThan(WATER_Y);
      expect(b.length, b.id).toBeGreaterThan(8);
      expect(b.length, b.id).toBeLessThan(45);
      // Local +x runs along the crossing.
      expect(Math.cos(b.ry), b.id).toBeCloseTo(dx, 6);
      expect(-Math.sin(b.ry), b.id).toBeCloseTo(dz, 6);
    }
    expect(total).toBeGreaterThanOrEqual(8);
  });
});
