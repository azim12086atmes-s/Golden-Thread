import { describe, expect, it } from 'vitest';
import { isModest } from '../src/characters/modesty';
import { OUTFITS, outfitsFor } from '../src/characters/outfits';
import { DRESS_GROUPS, FUSION, dressGroup } from '../src/characters/wardrobe';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';

describe('dressing room', () => {
  it('registers the fusion outfits so a saved fusion choice resolves', () => {
    expect(Object.keys(FUSION).length).toBe(48);
    const st = newGame();
    st.outfits.girl = 'fx-g-3';
    const back = deserialize(serialize(st))!;
    expect(OUTFITS[back.outfits.girl]?.who).toBe('girl');
  });

  it('every outfit on every shelf is modest and belongs to a shelf', () => {
    const shelves = new Set(DRESS_GROUPS.map(([id]) => id));
    for (const who of ['girl', 'boy'] as const) for (const o of outfitsFor(who)) {
      expect(isModest(o), o.id).toBe(true);
      expect(shelves.has(dressGroup(o)), o.id).toBe(true);
    }
  });

  it('each regional shelf has something for both travellers', () => {
    for (const [id] of DRESS_GROUPS) {
      if (id === 'all') continue;
      for (const who of ['girl', 'boy'] as const) {
        expect(outfitsFor(who).some((o) => dressGroup(o) === id), `${who} on ${id}`).toBe(true);
      }
    }
  });
});

describe('the van interior', () => {
  it('seats the travellers on opposite benches with their hands well apart', async () => {
    const THREE = await import('three');
    const { VanInterior } = await import('../src/housing/VanInterior');
    const st = newGame();
    const van = new VanInterior(st, OUTFITS['g-meadow'], OUTFITS['b-meadow']);
    van.update(0.016);
    const v = van as unknown as { girl: { root: import('three').Object3D; freeHand(o: import('three').Vector3): import('three').Vector3 }; boy: typeof v.girl };
    v.girl.root.updateMatrixWorld(true);
    v.boy.root.updateMatrixWorld(true);
    expect(v.girl.root.position.distanceTo(v.boy.root.position)).toBeGreaterThanOrEqual(2.2);
    const gh = v.girl.freeHand(new THREE.Vector3()), bh = v.boy.freeHand(new THREE.Vector3());
    expect(gh.distanceTo(bh)).toBeGreaterThan(0.8);
  });
});

describe('everyday default clothes', () => {
  it('a new journey starts in the pink kurti with jeans and the blue kurta with pink jeans', () => {
    const st = newGame();
    const g = OUTFITS[st.outfits.girl], b = OUTFITS[st.outfits.boy];
    expect(g.name).toBe('Pink Kurti & Jeans');
    expect(b.name).toBe('Blue Kurta & Pink Jeans');
    expect(isModest(g) && isModest(b)).toBe(true);
    expect(g.head.style).toBe('hijab');
    expect(dressGroup(g)).toBe('south');
  });
});

describe('walking together', () => {
  it('he faces the way they are both walking, not towards her', async () => {
    const { companionHeading } = await import('../src/player/Travellers');
    const her = 0.4;
    // Walking alongside, drifting slightly towards her: he still faces straight ahead, as she does.
    expect(companionHeading(Math.sin(her + 0.3) * 0.05, Math.cos(her + 0.3) * 0.05, 1 / 60, her, 0)).toBe(her);
    // Standing still: he turns to her heading.
    expect(companionHeading(0, 0, 1 / 60, her, 2)).toBe(her);
    // Catching up from far off to one side: he faces where he walks.
    expect(companionHeading(0.05, 0, 1 / 60, her, 0)).toBeCloseTo(Math.PI / 2);
  });
});

describe('the travellers\' proportions', () => {
  it('her eye line (the floating head\'s centre) meets his mid-chest', async () => {
    const THREE = await import('three');
    const { CharacterModel, CHEST_MID, HERO_SCALE } = await import('../src/characters/CharacterModel');
    const girl = new CharacterModel(OUTFITS['g-kurti-jeans'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    girl.root.updateMatrixWorld(true);
    const eye = girl.head.getWorldPosition(new THREE.Vector3()).y;
    const chest = HERO_SCALE.boy * CHEST_MID;
    expect(Math.abs(eye - chest)).toBeLessThan(0.02);
  });

  it('both everyday kurtas end at half-thigh, over light jeans', () => {
    for (const id of ['g-kurti-jeans', 'b-kurta-jeans']) {
      expect(OUTFITS[id].length).toBe('thigh');
      expect(OUTFITS[id].lower).toBe('trousers');
    }
  });
});
