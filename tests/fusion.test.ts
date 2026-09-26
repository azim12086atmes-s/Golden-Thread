import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { isModest, modestify } from '../src/characters/modesty';
import { fusionDesigns, fusionOutfits, harmonise } from '../src/fusion/fusion';

describe('fusion wardrobe', () => {
  for (const who of ['girl', 'boy'] as const) {
    it(`generates modest, many-culture fusions for the ${who}`, () => {
      const ds = fusionDesigns(who, 24);
      expect(ds.length).toBe(24);
      for (const d of ds) {
        const o = modestify(d);
        expect(isModest(o), d.id).toBe(true);
        expect(d.culture.startsWith('Fusion · ')).toBe(true);
        expect(d.culture.split(' × ').length, d.id).toBeGreaterThanOrEqual(3);
        expect(d.note, d.id).toMatch(/^Fusion of /); // every source is credited
        if (who === 'girl') expect(['hijab', 'hijab-wrap', 'hood', 'hijab-hat']).toContain(o.head.style);
      }
    });
  }

  it('is deterministic, with unique ids that do not collide with the wardrobe', () => {
    const a = fusionDesigns('girl', 12), b = fusionDesigns('girl', 12);
    expect(a).toEqual(b);
    const all = Object.keys(fusionOutfits(12));
    expect(new Set(all).size).toBe(all.length);
    for (const id of all) expect(OUTFITS[id]).toBeUndefined();
  });

  it('a different seed gives a different collection', () => {
    expect(fusionDesigns('boy', 8, 'one')).not.toEqual(fusionDesigns('boy', 8, 'two'));
  });

  it('harmonises colours toward the palette key', () => {
    expect(harmonise('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(harmonise('not-a-colour', '#808080', 0)).toBe('#808080');
  });
});
