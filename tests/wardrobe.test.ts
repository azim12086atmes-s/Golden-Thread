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
