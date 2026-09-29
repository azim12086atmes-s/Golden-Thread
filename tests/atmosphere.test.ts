import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ATMOS, atmosWeights } from '../src/world/atmosphere';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS, regionCenter, REGION_BY_ID, type RegionId } from '../src/world/regions';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

describe('the living air', () => {
  it('every land has its entry', () => {
    for (const r of REGIONS) expect(ATMOS[r.id], r.id).toBeDefined();
  });

  it('butterflies fly by day only; fireflies and spores come out after dusk', () => {
    expect(atmosWeights('meadow', 12).flyers).toBe(1);
    expect(atmosWeights('meadow', 23).flyers).toBe(0);
    expect(atmosWeights('japan', 21.5).fireflies).toBe(1);
    expect(atmosWeights('japan', 12).fireflies).toBe(0);
    expect(atmosWeights('meadow', 21.5).fireflies).toBe(0); // its ambience already has them
    expect(atmosWeights('skyisles', 23).spores).toBe(1);
    expect(atmosWeights('skyisles', 12).spores).toBe(0);
  });

  it('chimneys smoke all day in the cold lands, mornings and evenings in the rest', () => {
    expect(atmosWeights('aurora', 13).smoke).toBe(1);
    expect(atmosWeights('london', 13).smoke).toBe(0);
    expect(atmosWeights('london', 19.5).smoke).toBe(1);
    expect(atmosWeights('newyork', 19.5).smoke).toBe(0);
  });

  it('mist lies at dawn, beams slant at the golden hours, never at noon', () => {
    expect(atmosWeights('london', 6.5).mist).toBeGreaterThan(0.8);
    expect(atmosWeights('london', 13).mist).toBe(0);
    expect(atmosWeights('meadow', 7.5).beams).toBeGreaterThan(0.8);
    expect(atmosWeights('meadow', 13).beams).toBe(0);
  });

  it('glints drift through the bright hours; sparks fly from the fires after dark', () => {
    expect(atmosWeights('aurora', 12).glitter).toBe(1);
    expect(atmosWeights('aurora', 22).glitter).toBe(0);
    expect(atmosWeights('desert', 13).glitter).toBe(1);
    expect(atmosWeights('london', 13).glitter).toBe(0);
    expect(atmosWeights('desert', 21).embers).toBe(1);
    expect(atmosWeights('desert', 12).embers).toBe(0);
    expect(atmosWeights('london', 21).embers).toBe(0);
    // Sparks need fires: every land with embers has hearth or cold smoke too.
    for (const id of Object.keys(ATMOS) as RegionId[]) if (ATMOS[id].embers) expect(ATMOS[id].smoke, id).toBeDefined();
  });

  it('every land with hearth smoke builds chimneys, smoke-holes or fires to rise from', () => {
    for (const id of Object.keys(ATMOS) as RegionId[]) {
      if (!ATMOS[id].smoke) continue;
      const inst = buildRegion(REGION_BY_ID[id], solid, glow);
      const c = regionCenter(REGION_BY_ID[id]);
      expect(inst.smoke.length, id).toBeGreaterThan(8);
      for (const s of inst.smoke) {
        expect(Math.hypot(s.x - c.x, s.z - c.z), id).toBeLessThan(600);
        expect(s.y, id).toBeGreaterThan(-2);
      }
    }
  }, 300_000);
});
