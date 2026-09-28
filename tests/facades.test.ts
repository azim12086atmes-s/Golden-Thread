import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { FACADES, compose } from '../src/world/facade';
import { GeoBuilder } from '../src/world/kit';
import { REGION_BY_ID, type RegionId } from '../src/world/regions';
import { buildHouse } from '../src/world/architecture';

const LAND: Record<keyof typeof FACADES, RegionId> = {
  london: 'london', londonMews: 'london', londonShop: 'london', renaissance: 'renaissance', tuscanTown: 'renaissance', tuscanFarm: 'renaissance', bottega: 'renaissance',
  vintage: 'vintage', bungalow: 'vintage', colonial: 'vintage', mainStreet: 'vintage', norway: 'norway', rorbu: 'norway', sorlandet: 'norway',
  switzerland: 'switzerland', engadin: 'switzerland', bernese: 'switzerland', brownstone: 'newyork',
};

describe('the facade kit', () => {
  it('builds every style as a house of human scale with its footprint', () => {
    for (const [name, st] of Object.entries(FACADES) as Array<[keyof typeof FACADES, (typeof FACADES)[keyof typeof FACADES]]>) {
      for (let i = 0; i < 4; i++) {
        const g = new GeoBuilder(), glow = new GeoBuilder();
        const fp = compose({ g, glow, rng: new Rng(`${name}:${i}`), s: REGION_BY_ID[LAND[name]] }, st);
        const m = g.build(new THREE.MeshStandardMaterial())!;
        const box = new THREE.Box3().setFromObject(m);
        expect(box.max.y, name).toBeGreaterThan(3);
        expect(box.max.y, name).toBeLessThan(fp.h + 3);
        expect(fp.r, name).toBeGreaterThan(3);
        expect(fp.r, name).toBeLessThan(14);
      }
    }
  });

  it('gives the shops a shopfront that keeps the door clear', () => {
    for (const name of ['londonShop', 'bottega', 'mainStreet'] as const) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = compose({ g, glow, rng: new Rng(name), s: REGION_BY_ID[LAND[name]] }, FACADES[name]);
      const m = g.build(new THREE.MeshStandardMaterial())!;
      // The awning reaches out over the pavement in front of the house.
      expect(new THREE.Box3().setFromObject(m).max.z, name).toBeGreaterThan(fp.r - 3);
    }
  });

  it('mixes several house types in each of the facade lands', () => {
    for (const land of ['london', 'norway', 'switzerland', 'renaissance', 'vintage'] as const) {
      const sizes = new Set<string>();
      for (let i = 0; i < 24; i++) {
        const g = new GeoBuilder(), glow = new GeoBuilder();
        const fp = buildHouse({ g, glow, rng: new Rng(`${land}:${i}`), s: REGION_BY_ID[land] });
        sizes.add(`${fp.r.toFixed(1)}:${fp.h.toFixed(1)}`);
      }
      expect(sizes.size, land).toBeGreaterThan(6);
    }
  });
});
