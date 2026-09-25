import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { ITEMS } from '../src/economy/items';
import { PEOPLE } from '../src/npc/people';
import { buildHouse, buildLandmark } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { GRID_COLS, GRID_ROWS, REGIONS, regionAt, regionCenter } from '../src/world/regions';
import { WATER_Y, terrainHeight } from '../src/world/terrain';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { BODY_RADIUS } from '../src/characters/follow';
import { SEAT_GAP, VEHICLES } from '../src/vehicles/vehicles';
import { OUTFITS } from '../src/characters/outfits';

describe('the world', () => {
  it('has twenty lands, one per grid cell', () => {
    expect(REGIONS).toHaveLength(GRID_COLS * GRID_ROWS);
    const cells = new Set(REGIONS.map((r) => `${r.col},${r.row}`));
    expect(cells.size).toBe(REGIONS.length);
  });

  it('includes every place in the brief', () => {
    const ids = REGIONS.map((r) => r.id);
    for (const id of ['japan', 'norway', 'switzerland', 'indonesia', 'korea', 'china', 'indianorth', 'indiasouth', 'egypt', 'middleeast', 'london', 'newyork', 'mughal', 'islamic', 'vintage', 'renaissance', 'meadow', 'desert', 'aurora']) {
      expect(ids).toContain(id);
    }
  });

  it('locates each land at its own centre', () => {
    for (const r of REGIONS) {
      const c = regionCenter(r);
      expect(regionAt(c.x, c.z).id).toBe(r.id);
    }
  });

  it('keeps city cores near-flat so buildings sit on the ground', () => {
    for (const r of REGIONS) {
      const c = regionCenter(r);
      for (const [dx, dz] of [[0, 0], [100, 50], [-150, 120], [200, -60]]) {
        expect(Math.abs(terrainHeight(c.x + dx, c.z + dz))).toBeLessThan(1);
      }
    }
  });

  it('levels every plot of land so homes sit flat, above water', () => {
    for (const p of PLOTS) {
      const hs: number[] = [];
      for (let i = -1; i <= 1; i += 0.25) for (let j = -1; j <= 1; j += 0.25) hs.push(terrainHeight(p.x + (i * PLOT_SIZE) / 2, p.z + (j * PLOT_SIZE) / 2));
      expect(Math.max(...hs) - Math.min(...hs), p.id).toBeLessThan(0.01);
      expect(hs[0], p.id).toBeGreaterThan(WATER_Y);
    }
  });

  for (const r of REGIONS) {
    it(`builds ${r.name}: houses and a landmark`, () => {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const ctx = { g, glow, rng: new Rng(r.id), s: r };
      for (let i = 0; i < 6; i++) {
        const fp = buildHouse(ctx);
        expect(fp.r).toBeGreaterThan(0);
        expect(fp.h).toBeGreaterThan(0);
      }
      const lm = buildLandmark(ctx);
      expect(lm.height).toBeGreaterThan(5);
      expect(g.size).toBeGreaterThan(10);
    });
  }

  it('every land has valid materials, market wants, and exactly one keeper', () => {
    for (const r of REGIONS) {
      for (const m of [...r.materials, ...r.wanted]) expect(ITEMS[m], `${r.id}: ${m}`).toBeTruthy();
      expect(PEOPLE.filter((p) => p.region === r.id && p.keeper), r.id).toHaveLength(1);
    }
  });

  it('every resident wears a real wardrobe outfit of their own kind', () => {
    for (const p of PEOPLE) {
      expect(OUTFITS[p.outfit], p.id).toBeTruthy();
      expect(OUTFITS[p.outfit].who, p.id).toBe(p.who);
    }
  });
});

describe('vehicles keep the two apart', () => {
  it('seat gap leaves clear space between bodies', () => {
    expect(SEAT_GAP - 2 * BODY_RADIUS).toBeGreaterThanOrEqual(0.3);
  });
  for (const v of Object.values(VEHICLES)) {
    it(`${v.id}: separate seats, or each travels on their own`, () => {
      if (v.seats.length === 0) {
        expect(['foot', 'cape', 'mount']).toContain(v.kind);
        return;
      }
      const [a, b] = v.seats;
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThanOrEqual(SEAT_GAP);
    });
  }
});
