import { describe, expect, it } from 'vitest';
import { LOCALES } from '../src/world/locale';
import { REGIONS } from '../src/world/regions';

describe('each land has its own look and air', () => {
  it('every land has a vibrant grade and its own particles', () => {
    for (const r of REGIONS) {
      const l = LOCALES[r.id];
      expect(l, r.id).toBeTruthy();
      expect(l.grade.sat, r.id).toBeGreaterThanOrEqual(1.05);
      expect(l.grade.amt).toBeLessThanOrEqual(0.25);
      expect(l.particles.colors.length, r.id).toBeGreaterThan(0);
      for (const c of l.particles.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(l.particles.count).toBeLessThanOrEqual(520);
    }
    // No two lands share the same particles.
    expect(new Set(REGIONS.map((r) => LOCALES[r.id].particles.what)).size).toBe(REGIONS.length);
  });
});

describe('each town dressed in its own glamour', () => {
  it('every land has its own sky, lantern colours and artifacts', () => {
    for (const r of REGIONS) {
      const l = LOCALES[r.id];
      for (const c of [l.sky.day, l.sky.dusk, l.sky.night, ...l.lights]) expect(c, r.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(l.lights.length, r.id).toBeGreaterThanOrEqual(2);
      expect(l.artifacts.length, r.id).toBeGreaterThanOrEqual(4);
    }
    // No two lands share the same set of artifacts.
    expect(new Set(REGIONS.map((r) => [...new Set(LOCALES[r.id].artifacts)].sort().join())).size).toBeGreaterThan(15);
  });

  it('artifacts stand beyond the plaza, off the avenues, clear of the market, before the houses', async () => {
    const { artifactSpots, STRING_AT } = await import('../src/world/TownDressing');
    const { STALLS } = await import('../src/npc/Townsfolk');
    for (const s of artifactSpots(5)) {
      const d = Math.hypot(s.x, s.z);
      expect(d).toBeGreaterThan(50); // the plaza and its landmark
      expect(d).toBeLessThan(61); // houses start at 62
      expect(Math.min(Math.abs(s.x), Math.abs(s.z))).toBeGreaterThan(12); // off the avenues
      for (const m of STALLS) expect(Math.hypot(s.x - m.x, s.z - m.z)).toBeGreaterThan(6);
    }
    for (const z of STRING_AT) expect(z).toBeGreaterThan(Math.max(...STALLS.map((m) => m.z)) + 10);
  });
});
