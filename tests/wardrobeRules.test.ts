import { describe, expect, it } from 'vitest';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { OUTFITS, isChildOutfit, outfitsFor } from '../src/characters/outfits';
import { wardrobeFor } from '../src/npc/Townsfolk';
import { REGIONS } from '../src/world/regions';

describe('the wings are Fathima\'s alone', () => {
  it('nobody else grows them, whatever they wear; the jetpack is his alone', () => {
    const winged = Object.values(OUTFITS).filter((o) => o.detail?.back === 'wings');
    expect(winged.length).toBeGreaterThan(0);
    for (const o of winged) {
      expect(new CharacterModel(o, '#e0ac85', 1).hasWings, o.id).toBe(false); // a lamplighter in the same clothes
      expect(new CharacterModel(o, '#e3b58f', HERO_SCALE.girl, 1, 'girl').hasWings, o.id).toBe(true);
    }
    for (const o of Object.values(OUTFITS).filter((x) => x.detail?.back === 'jetpack')) {
      expect(new CharacterModel(o, '#c99a74', 1).backReach(), o.id).toBe(0);
      expect(new CharacterModel(o, '#c99a74', HERO_SCALE.boy, -1, 'boy').backReach(), o.id).toBeGreaterThan(0);
    }
  });
});

describe("the children's wardrobe", () => {
  it('children wear children\'s clothes from their own part of the world; grown-ups never do', () => {
    for (const r of REGIONS) for (const who of ['girl', 'boy'] as const) {
      const kids = wardrobeFor(r.id, who, true), grown = wardrobeFor(r.id, who);
      expect(kids.length, r.id).toBeGreaterThan(0);
      expect(kids.every(isChildOutfit), r.id).toBe(true);
      expect(grown.some(isChildOutfit), r.id).toBe(false);
    }
    // Nor are they offered in the travellers' dressing room.
    for (const who of ['girl', 'boy'] as const) expect(outfitsFor(who).some(isChildOutfit)).toBe(false);
  });
});
