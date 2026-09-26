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
