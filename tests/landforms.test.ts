import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CAVES } from '../src/world/caves';
import { LANDFORMS, LANDFORM_LANDS, landformColor, landformHeight } from '../src/world/landforms';
import { FIELD_SITES, PLOTS, PLOT_SIZE } from '../src/world/plots';
import { CITY_RADIUS, REGION_BY_ID, regionCenter } from '../src/world/regions';
import { terrainHeight } from '../src/world/terrain';
import { waterEdge } from '../src/world/waters';

describe('mountains, plateaus and cliffs by geography', () => {
  it('every land with landforms has them, out in the country, clear of roads, homes, fields and water', () => {
    for (const [land, specs] of Object.entries(LANDFORM_LANDS)) {
      const mine = LANDFORMS.filter((l) => l.land === land), c = regionCenter(REGION_BY_ID[land as keyof typeof REGION_BY_ID]);
      expect(mine.length, land).toBeGreaterThanOrEqual(Math.min(2, specs!.reduce((a, s) => a + s.n, 0)));
      for (const lf of mine) {
        const lx = lf.x - c.x, lz = lf.z - c.z;
        expect(Math.hypot(lx, lz), lf.id).toBeGreaterThan(CITY_RADIUS + lf.r * 0.9);
        expect(Math.abs(lx) > lf.r + 20 && Math.abs(lz) > lf.r + 20, `${lf.id} clear of the avenues`).toBe(true);
        expect(waterEdge(lf.x, lf.z).d, lf.id).toBeGreaterThan(lf.r);
        for (const p of PLOTS) expect(Math.abs(p.x - lf.x) > PLOT_SIZE / 2 + lf.r || Math.abs(p.z - lf.z) > PLOT_SIZE / 2 + lf.r).toBe(true);
        for (const f of FIELD_SITES) expect(Math.abs(f.x - lf.x) > 24 + lf.r || Math.abs(f.z - lf.z) > 24 + lf.r).toBe(true);
      }
    }
  });

  it('they rise from the ground — mesas flat-topped and stepped, peaks sharp, volcanoes with craters', () => {
    const mesa = LANDFORMS.find((l) => l.kind === 'mesa')!;
    expect(landformHeight(mesa.x, mesa.z)).toBeGreaterThan(mesa.h * 0.9);
    expect(landformHeight(mesa.x + 3, mesa.z)).toBeCloseTo(landformHeight(mesa.x, mesa.z), 0);
    const peak = LANDFORMS.find((l) => l.kind === 'peak')!;
    expect(landformHeight(peak.x, peak.z)).toBeGreaterThan(peak.h * 0.7);
    expect(landformHeight(peak.x + peak.r * 0.5, peak.z)).toBeLessThan(landformHeight(peak.x, peak.z) * 0.6);
    const volcano = LANDFORMS.find((l) => l.kind === 'volcano')!;
    expect(landformHeight(volcano.x, volcano.z)).toBeLessThan(landformHeight(volcano.x + volcano.r * 0.14, volcano.z));
    expect(terrainHeight(peak.x, peak.z)).toBeGreaterThan(peak.h * 0.6);
  });

  it('desert mesas are banded in muddy strata; alpine peaks snow-capped; arctic ranges blue-white', () => {
    const col = new THREE.Color();
    const mesa = LANDFORMS.find((l) => l.kind === 'mesa' && l.land === 'desert')!;
    col.set('#e0b877'); landformColor(mesa.x + mesa.r * 0.8, mesa.z, 12, 0.6, col);
    expect(col.r).toBeGreaterThan(col.b * 1.4); // red-brown rock
    const peak = LANDFORMS.find((l) => l.kind === 'peak')!;
    col.set('#7fb35a'); landformColor(peak.x, peak.z, 80, 0.2, col);
    expect(col.b).toBeGreaterThan(0.85); // snow
    const arctic = LANDFORMS.find((l) => l.kind === 'arctic')!;
    col.set('#e9f0f7'); landformColor(arctic.x + arctic.r * 0.6, arctic.z, 10, 0.6, col);
    expect(col.b).toBeGreaterThan(col.r);
  });

  it('caves are cut into the feet of the mountains and hills, facing the town — dens in the green lands', () => {
    const dens = CAVES.filter((c) => c.style === 'den');
    expect(dens.length).toBeGreaterThanOrEqual(8);
    let atFoot = 0;
    for (const cv of CAVES) if (LANDFORMS.some((l) => l.land === cv.land && Math.hypot(l.x - cv.x, l.z - cv.z) < l.r * 1.3)) atFoot++;
    expect(atFoot).toBeGreaterThan(CAVES.length * 0.5);
  });
});
