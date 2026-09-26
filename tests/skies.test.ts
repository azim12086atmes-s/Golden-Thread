import { describe, expect, it } from 'vitest';
import { REGIONS } from '../src/world/regions';
import { SKIES, SKY_KINDS, fireworkRate } from '../src/world/skies';

const HEX = /^#[0-9a-f]{6}$/i;

describe('every land has its own sky', () => {
  it('each land has at least five sky effects of its own, a palette and a cloud colour', () => {
    for (const r of REGIONS) {
      const s = SKIES[r.id];
      expect(s, r.id).toBeDefined();
      expect(s.effects.length, r.id).toBeGreaterThanOrEqual(5);
      expect(new Set(s.effects).size, r.id).toBe(s.effects.length);
      for (const k of s.effects) expect(SKY_KINDS, r.id).toContain(k);
      expect(s.palette.length, r.id).toBeGreaterThanOrEqual(3);
      for (const c of [...s.palette, s.cloud]) expect(c, r.id).toMatch(HEX);
      expect(s.what.length, r.id).toBeGreaterThan(20);
    }
  });

  it('no two lands share the same sky', () => {
    const keys = REGIONS.map((r) => [...SKIES[r.id].effects].sort().join('+') + '|' + SKIES[r.id].palette.join(','));
    expect(new Set(keys).size).toBe(REGIONS.length);
  });

  it('every effect appears in the world, and the meadow (the castle and the celebration) has all of them', () => {
    for (const k of SKY_KINDS) expect(REGIONS.filter((r) => r.id !== 'meadow').some((r) => SKIES[r.id].effects.includes(k)), k).toBe(true);
    expect([...SKIES.meadow.effects].sort()).toEqual([...SKY_KINDS].sort());
  });

  it('the celebration turns the fireworks into a proper display', () => {
    expect(fireworkRate(0, 1)).toBe(0);
    expect(fireworkRate(1, 1)).toBeGreaterThanOrEqual(fireworkRate(1, 0) * 3);
  });

  it('signature skies: Diwali fireworks and Sankranti kites, New York searchlights, desert Milky Way, Middle East crescent', () => {
    expect(SKIES.indianorth.effects).toEqual(expect.arrayContaining(['fireworks', 'kites']));
    expect(SKIES.newyork.effects).toContain('searchlights');
    expect(SKIES.desert.effects).toContain('milkyway');
    expect(SKIES.middleeast.effects).toContain('crescent');
    expect(SKIES.switzerland.effects).toContain('alpenglow');
    expect(SKIES.skyisles.effects).toContain('nebula');
  });
});
