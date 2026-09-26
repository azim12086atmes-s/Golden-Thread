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

describe('sky ornaments in every land', () => {
  const ORNAMENTS = ['moons', 'planets', 'rainbowArcs', 'hexCanopy', 'constellations', 'comet', 'sunHalo', 'islands', 'mandala', 'balloons', 'noctilucent'] as const;
  it('every land has at least three of the new ornaments, and the meadow has them all', () => {
    for (const k of ORNAMENTS) expect(SKY_KINDS).toContain(k);
    for (const r of REGIONS) {
      const n = SKIES[r.id].effects.filter((k) => (ORNAMENTS as readonly string[]).includes(k)).length;
      expect(n, r.id).toBeGreaterThanOrEqual(3);
    }
    for (const k of ORNAMENTS) expect(SKIES.meadow.effects).toContain(k);
  });

  it('fitting skies: a girih star over the Islamic courtyards, balloons over the Nile, islands above the Sky Isles', () => {
    expect(SKIES.islamic.effects).toEqual(expect.arrayContaining(['mandala', 'hexCanopy']));
    expect(SKIES.egypt.effects).toContain('balloons');
    expect(SKIES.skyisles.effects).toContain('islands');
    expect(SKIES.norway.effects).toContain('noctilucent');
  });
});

describe('choosing the time of day', () => {
  it('moves the clock forward to dawn, day, dusk or night — never back', async () => {
    const { jumpTo, nextTime, timeOfDay, TIMES } = await import('../src/core/time');
    const start = 1440 * 3 + 14 * 60; // day 4, 2 pm
    expect(timeOfDay(start)).toBe('day');
    for (const w of TIMES) {
      const m = jumpTo(start, w);
      expect(m).toBeGreaterThan(start);
      expect(m - start).toBeLessThanOrEqual(1440);
      expect(timeOfDay(m)).toBe(w);
    }
    expect(jumpTo(start, 'dusk')).toBe(1440 * 3 + 18.5 * 60); // later today
    expect(jumpTo(start, 'dawn')).toBe(1440 * 4 + 6 * 60); // tomorrow morning
    // T cycles round the day.
    let m = start;
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) { m = jumpTo(m, nextTime(m)); seen.push(timeOfDay(m)); }
    expect(seen).toEqual(['dusk', 'night', 'dawn', 'day']);
  });
});
