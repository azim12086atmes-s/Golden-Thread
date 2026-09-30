import { describe, expect, it } from 'vitest';
import { choicesFor, dress, dressable, isDressable, outfitOf } from '../src/caravan/dress';
import { CHILDREN, COMPANION_BY_ID, SIBLINGS } from '../src/caravan/caravan';
import { isModest } from '../src/characters/modesty';
import { isChildOutfit } from '../src/characters/outfits';
import { HERO_ONLY } from '../src/npc/Townsfolk';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';

describe('the family wardrobe', () => {
  it('brothers and sisters choose from grown-up shelves for their own gender, never the travellers\' own; children from the children\'s', () => {
    for (const s of SIBLINGS) {
      const list = choicesFor(s);
      expect(list.length, s.id).toBeGreaterThan(10);
      for (const o of list) {
        expect(o.who).toBe(s.who);
        expect(isChildOutfit(o)).toBe(false);
        expect(HERO_ONLY.has(o.id)).toBe(false);
        expect(isModest(o), o.id).toBe(true);
      }
    }
    for (const c of CHILDREN) {
      const list = choicesFor(c);
      expect(list.length, c.id).toBeGreaterThan(2);
      for (const o of list) { expect(o.who).toBe(c.who); expect(isChildOutfit(o)).toBe(true); expect(isModest(o)).toBe(true); }
    }
  });

  it('dresses only someone travelling with them, only from their shelf, and the choice is saved', () => {
    const st = newGame();
    expect(dressable(st).map((d) => d.id)).toEqual(SIBLINGS.map((s) => s.id));
    const s = SIBLINGS[0], pick = choicesFor(s).find((o) => o.id !== outfitOf(st, s.id)!.id)!;
    expect(dress(st, s.id, pick.id)).toBeNull();
    expect(outfitOf(st, s.id)!.id).toBe(pick.id);
    // A boy's outfit on a sister, a pet, or a child not travelling: refused.
    expect(dress(st, s.id, choicesFor(SIBLINGS.find((x) => x.who === 'boy')!)[0].id)).not.toBeNull();
    expect(dress(st, 'pet-sheepdog', pick.id)).not.toBeNull();
    expect(isDressable(COMPANION_BY_ID['pet-sheepdog'])).toBe(false);
    expect(dress(st, CHILDREN[0].id, choicesFor(CHILDREN[0])[0].id)).not.toBeNull();
    const back = deserialize(serialize(st))!;
    expect(outfitOf(back, s.id)!.id).toBe(pick.id);
    // Old saves without the field load with everyone in their own clothes.
    const raw = JSON.parse(serialize(st));
    delete raw.companionOutfits;
    expect(deserialize(JSON.stringify(raw))!.companionOutfits).toEqual({});
  });
});
