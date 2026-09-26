import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { CITY_RADIUS, REGIONS, regionCenter } from '../src/world/regions';
import { CASTLE_SITE, WATER_Y, surfaceAt, terrainHeight } from '../src/world/terrain';
import { ROADS_END, WATERS, waterEdge } from '../src/world/waters';
import { LAND_WIND, windAt } from '../src/world/wind';
import { grassy } from '../src/world/Meadow';
import { shoreGeometry } from '../src/world/Water';

describe('lakes, ponds and rivers', () => {
  it('every land (but the Sky Isles) has a lake, ponds and a river, out in the countryside', () => {
    for (const r of REGIONS) {
      if (r.id === 'skyisles') continue;
      const mine = WATERS.filter((b) => b.land === r.id);
      expect(mine.filter((b) => b.kind === 'lake').length, r.id).toBe(1);
      expect(mine.filter((b) => b.kind === 'pond').length, r.id).toBeGreaterThanOrEqual(2);
      expect(mine.filter((b) => b.kind === 'river').length, r.id).toBe(1);
      const c = regionCenter(r);
      for (const b of mine) {
        const pts = b.kind === 'river' ? b.pts : [[b.x, b.z] as [number, number]];
        for (const [x, z] of pts) expect(Math.hypot(x - c.x, z - c.z), `${r.id} ${b.kind}`).toBeGreaterThan(CITY_RADIUS);
      }
    }
  });

  it('the water is really there: the ground dips below the water line in the middle of every lake and pond', () => {
    for (const b of WATERS) {
      if (b.kind === 'river') {
        const [x, z] = b.pts[Math.floor(b.pts.length / 2)];
        expect(terrainHeight(x, z), `${b.land} river`).toBeLessThan(WATER_Y);
      } else expect(terrainHeight(b.x, b.z), `${b.land} ${b.kind}`).toBeLessThan(WATER_Y);
    }
  });

  it('no water on the roads, on anyone’s land, or at the castle; you can always walk across (the surface holds)', () => {
    for (const b of WATERS) {
      const pts = b.kind === 'river' ? b.pts : [[b.x, b.z] as [number, number]];
      const rad = b.kind === 'river' ? b.w / 2 : b.r;
      for (const [x, z] of pts) {
        for (const p of PLOTS) expect(Math.max(Math.abs(x - p.x), Math.abs(z - p.z)), b.land).toBeGreaterThan(PLOT_SIZE / 2 + rad);
        expect(Math.hypot(x - CASTLE_SITE.x, z - CASTLE_SITE.z)).toBeGreaterThan(CASTLE_SITE.r + rad);
        const c = regionCenter(REGIONS.find((r) => r.id === b.land)!);
        const lx = x - c.x, lz = z - c.z;
        if (Math.hypot(lx, lz) - rad < ROADS_END) expect(Math.min(Math.abs(lx), Math.abs(lz)), `${b.land} ${b.kind} on an avenue`).toBeGreaterThan(9 + rad);
        expect(surfaceAt(x, z)).toBeGreaterThanOrEqual(WATER_Y);
      }
    }
  });

  it('town streets have no water at all (and the lookup is instant there)', () => {
    for (const r of REGIONS) {
      const c = regionCenter(r);
      expect(waterEdge(c.x + 30, c.z + 100).body).toBeNull();
    }
  });

  it('every shore has its foam', () => {
    for (const r of REGIONS) {
      if (r.id === 'skyisles') continue;
      const g = shoreGeometry(r.id, WATER_Y)!;
      expect(g.getAttribute('position').count, r.id).toBeGreaterThan(100);
    }
  });
});

describe('wind', () => {
  it('turns and gusts, with each land’s own strength', () => {
    const seen = new Set<number>();
    for (let t = 0; t < 3000; t += 50) {
      const w = windAt(t, 'meadow');
      expect(Math.hypot(w.x, w.z)).toBeCloseTo(1, 5);
      expect(w.strength).toBeGreaterThan(0);
      expect(w.strength).toBeLessThanOrEqual(LAND_WIND.meadow);
      seen.add(Math.round(Math.atan2(w.z, w.x) * 2));
    }
    expect(seen.size).toBeGreaterThan(3); // it changes direction
    expect(LAND_WIND.desert).toBeGreaterThan(LAND_WIND.islamic); // desert gusts, calm courtyards
  });
});

describe('meadows', () => {
  it('grass grows on green ground only — never on the roads, the plaza, sand or water', () => {
    const green = new THREE.Color('#6aab52'), sand = new THREE.Color('#e8d6a0');
    const c = regionCenter(REGIONS.find((r) => r.id === 'meadow')!);
    expect(grassy(c.x + 80, c.z + 60, 1, green)).toBe(true);
    expect(grassy(c.x + 80, c.z + 60, 1, sand)).toBe(false);
    expect(grassy(c.x + 3, c.z + 100, 1, green)).toBe(false); // avenue
    expect(grassy(c.x + 140, c.z + 0.5, 1, green)).toBe(false);
    expect(grassy(c.x + 10, c.z + 10, 1, green)).toBe(false); // plaza
    expect(grassy(c.x + 80, c.z + 60, WATER_Y, green)).toBe(false);
  });
});

describe('the meadow field', () => {
  it('grows thick round the travellers in the countryside and stays put as they walk', async () => {
    const { MeadowField, FIELD_CELLS } = await import('../src/world/Meadow');
    const f = new MeadowField();
    const c = regionCenter(REGIONS.find((r) => r.id === 'meadow')!);
    const p = new THREE.Vector3(c.x + 60, 0, c.z + 290);
    p.y = terrainHeight(p.x, p.z);
    f.update(p, p.y);
    const first = f.grown;
    expect(first.tufts).toBeGreaterThan(FIELD_CELLS * FIELD_CELLS * 0.4);
    expect(first.flowers).toBeGreaterThan(100);
    // Walk a little and come back: the same meadow.
    f.update(new THREE.Vector3(p.x + 30, p.y, p.z), p.y);
    f.update(p, p.y);
    expect(f.grown).toEqual(first);
    // Nothing on the sand of the desert dunes' town plaza.
    const d = regionCenter(REGIONS.find((r) => r.id === 'desert')!);
    const g = new MeadowField();
    g.update(new THREE.Vector3(d.x, 0, d.z), 0);
    expect(g.grown.tufts).toBeLessThan(FIELD_CELLS * FIELD_CELLS * 0.1);
  });
});
