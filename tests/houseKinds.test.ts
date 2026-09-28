import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { HOUSE_NAME, HOUSE_SHAPE } from '../src/housing/HouseInterior';
import { buildHouse } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { REGIONS } from '../src/world/regions';

describe('every land builds several kinds of house', () => {
  it('no land repeats one house: each has at least three kinds, each named at its door', () => {
    for (const r of REGIONS) {
      const kinds = new Set<string>();
      for (let i = 0; i < 80; i++) {
        const g = new GeoBuilder(), glow = new GeoBuilder();
        const fp = buildHouse({ g, glow, rng: new Rng(`${r.id}:k${i}`), s: r }) as { kind?: string; r: number; h: number };
        kinds.add(fp.kind ?? `${fp.r.toFixed(1)}`);
        // A house of human scale that fits its plot and is really there.
        expect(fp.r, `${r.id} ${fp.kind}`).toBeGreaterThan(2.5);
        expect(fp.r, `${r.id} ${fp.kind}`).toBeLessThan(14);
        const m = g.build(new THREE.MeshStandardMaterial());
        expect(m, `${r.id} ${fp.kind}`).not.toBeNull();
        const box = new THREE.Box3().setFromObject(m!);
        expect(box.max.y, `${r.id} ${fp.kind}`).toBeGreaterThan(2.4);
        expect(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z), `${r.id} ${fp.kind}`).toBeLessThan(fp.r + 3);
        if (fp.kind && fp.kind !== 'shop') expect(HOUSE_NAME[fp.kind] ?? HOUSE_SHAPE[fp.kind], `${r.id} ${fp.kind}`).toBeTruthy();
      }
      expect(kinds.size, r.id).toBeGreaterThanOrEqual(3);
    }
  }, 120_000);
});
