import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { decorOf, resetDecor } from '../src/world/decorLedger';
import { desertRose, ROSE_LANDS } from '../src/world/desertRoses';
import { GeoBuilder } from '../src/world/kit';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGION_BY_ID } from '../src/world/regions';

describe('desert roses', () => {
  it('a great desert rose is a bouquet of rosettes taller than the travellers; a little one sits in the sand', () => {
    let seed = 3;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const [size, tall] of [[0.8, false], [4.5, true]] as const) {
      const g = new GeoBuilder();
      const reach = desertRose(g, 0, 0, 0, size, rng);
      const m = g.build(new THREE.MeshStandardMaterial())!;
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!;
      expect(b.max.y).toBeGreaterThan(tall ? 2.2 : 0.2);
      expect(b.min.y).toBeLessThan(0.05); // it rests in the sand, never floating
      expect(reach).toBeGreaterThan(0);
    }
  });

  it('they grow in the Rimal desert — little ones on the dunes and great ones out in the open sand', () => {
    expect(ROSE_LANDS.desert).toBe(1);
    resetDecor('desert');
    buildRegion(REGION_BY_ID.desert, new THREE.MeshStandardMaterial(), new THREE.MeshBasicMaterial());
    const d = decorOf('desert');
    expect(d['nature: desert roses'] ?? 0).toBeGreaterThan(15);
    expect(d['nature: great desert roses'] ?? 0).toBeGreaterThanOrEqual(4);
  }, 120_000);
});
