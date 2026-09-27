import { describe, expect, it } from 'vitest';
import { CAVES, CAVE_LANDS, caveMouth } from '../src/world/caves';
import { NATURE, ZONES, growthFor, pickTree, zoneAt } from '../src/world/nature';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { CITY_RADIUS, REGIONS, REGION_BY_ID, regionCenter } from '../src/world/regions';
import { waterEdge } from '../src/world/waters';
import { ITEMS } from '../src/economy/items';
import { HABITS } from '../src/world/trees';

describe('nature by terrain', () => {
  it('every land says what grows in its zones, from real species', () => {
    for (const r of REGIONS) {
      const n = NATURE[r.id];
      expect(n.size, r.id).toBeGreaterThanOrEqual(1);
      for (const z of ZONES) for (const f of growthFor(r, z).flora) expect(typeof f).toBe('string');
    }
  });

  it('the desert keeps its dunes nearly bare and its palms by the water; the north grows snow pines on the heights', () => {
    const desert = REGION_BY_ID.desert, aurora = REGION_BY_ID.aurora, sky = REGION_BY_ID.skyisles;
    expect(zoneAt(desert, 10, 0.2, 100, 1, 0.8)).toBe('dune');
    expect(zoneAt(desert, 2, 0.1, 5, 1, 0.8)).toBe('waterside');
    expect(growthFor(desert, 'dune').p).toBeLessThan(0.1);
    expect(growthFor(desert, 'waterside').flora).toContain('palm');
    expect(zoneAt(aurora, aurora.snowline + 5, 0.2, 100, 0, 0)).toBe('snow');
    expect(growthFor(aurora, 'snow').flora).toEqual(['snowpine']);
    expect(zoneAt(sky, 0, 0, 100, 0, 0)).toBe('cloud');
    let n = 0; const rnd = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
    let got = 0; for (let i = 0; i < 400; i++) if (pickTree(desert, 'dune', rnd)) got++;
    expect(got).toBeLessThan(60);
  });

  it('deserts and the Sky Isles grow larger trees than before', () => {
    expect(NATURE.desert.size).toBeGreaterThan(1.3);
    expect(NATURE.skyisles.size).toBeGreaterThan(1.5);
    expect(NATURE.skyisles.count).toBeGreaterThan(200);
    expect(Object.keys(HABITS).length).toBeGreaterThan(10);
  });
});

describe('caves', () => {
  it('stand in the wild lands, clear of town, water, plots and each other, mouths towards town', () => {
    for (const [land, cfg] of Object.entries(CAVE_LANDS)) {
      const cs = CAVES.filter((c) => c.land === land), c0 = regionCenter(REGION_BY_ID[land as keyof typeof REGION_BY_ID]);
      expect(cs.length, land).toBeGreaterThanOrEqual(Math.min(3, cfg!.count));
      for (const cv of cs) {
        expect(Math.hypot(cv.x - c0.x, cv.z - c0.z), cv.id).toBeGreaterThan(CITY_RADIUS + 50);
        expect(waterEdge(cv.x, cv.z).d, cv.id).toBeGreaterThan(cv.r);
        for (const p of PLOTS) expect(Math.abs(p.x - cv.x) > PLOT_SIZE / 2 + cv.r || Math.abs(p.z - cv.z) > PLOT_SIZE / 2 + cv.r).toBe(true);
        const m = caveMouth(cv);
        expect(Math.hypot(m.x - c0.x, m.z - c0.z)).toBeLessThan(Math.hypot(cv.x - c0.x, cv.z - c0.z));
        for (const o of cs) if (o !== cv) expect(Math.hypot(o.x - cv.x, o.z - cv.z)).toBeGreaterThan(o.r + cv.r + 20);
      }
      for (const f of cfg!.finds) expect(ITEMS[f], f).toBeDefined();
    }
  });
});
