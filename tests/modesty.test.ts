import { describe, expect, it } from 'vitest';
import { DESIGN_REFERENCES, OUTFITS, outfitsFor } from '../src/characters/outfits';
import { isModest, modestify, type Design } from '../src/characters/modesty';

describe('modesty (brief: no revealing clothing; merge non-covering designs)', () => {
  it('every outfit in the wardrobe is modest', () => {
    const bad = Object.values(OUTFITS).filter((o) => !isModest(o)).map((o) => o.id);
    expect(bad).toEqual([]);
  });

  it('has no duplicate outfit ids', () => {
    const ids = DESIGN_REFERENCES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a real wardrobe for both travellers', () => {
    expect(outfitsFor('girl').length).toBeGreaterThanOrEqual(20);
    expect(outfitsFor('boy').length).toBeGreaterThanOrEqual(18);
  });

  it('every girl outfit has a head covering', () => {
    for (const o of outfitsFor('girl')) expect(['hijab', 'hijab-wrap', 'hood', 'hijab-hat']).toContain(o.head.style);
  });

  it('merges sleeves, trousers, a headscarf and a higher neckline into a non-covering reference', () => {
    const dirndl: Design = {
      id: 't', name: 't', culture: 't', who: 'girl', top: 'bodice', topColor: '#000', trim: '#fff',
      sleeve: 'short', hem: 'knee', lower: 'skirt', lowerColor: '#f00', neckline: 'open', fit: 'fitted',
    };
    const o = modestify(dirndl);
    expect(isModest(o)).toBe(true);
    expect(o.merged).toEqual(expect.arrayContaining(['full sleeves', 'trousers', 'headscarf', 'high neckline', 'looser cut']));
    expect(o.length).toBe('knee'); // the reference's own length is kept for the outer layer…
    expect(o.hem).toBe('ankle'); // …while coverage reaches the ankle
    expect(o.underTrousers).toBeTruthy();
  });

  it('keeps a wide hat by putting a scarf under it', () => {
    const o = modestify({ id: 'h', name: 'h', culture: 'h', who: 'girl', top: 'gown', topColor: '#000', trim: '#fff', sleeve: 'full', hem: 'floor', lower: 'skirt', lowerColor: '#000', head: { style: 'wide-hat', color: '#abc' } });
    expect(o.head.style).toBe('hijab-hat');
  });

  it('does not claim to have merged what was already there', () => {
    const kurta = DESIGN_REFERENCES.find((d) => d.id === 'b-kurta')!;
    expect(modestify(kurta).merged).toEqual([]);
  });

  it('the wardrobe actually exercises merging (some references are not covering)', () => {
    const merged = Object.values(OUTFITS).filter((o) => o.merged.length > 0);
    expect(merged.length).toBeGreaterThanOrEqual(3);
  });
});
