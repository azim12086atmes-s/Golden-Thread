import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BALLOON_COLOURS, balloonFor } from '../src/caravan/caravan';
import { ALLOWED_PARTS } from '../src/characters/anatomy';
import { CharacterModel } from '../src/characters/CharacterModel';
import { OUTFITS } from '../src/characters/outfits';
import { EventBus } from '../src/core/events';
import { newGame } from '../src/core/state';
import { Housing } from '../src/housing/housing';

describe('balloons', () => {
  it('children hold one at a festivity and in the funfair lands, on market days elsewhere, a colour a day', () => {
    for (let d = 0; d < 9; d++) {
      expect(balloonFor('child-rosie', 'london', d, true)).not.toBeNull();
      expect(balloonFor('child-rosie', 'meadow', d, false)).not.toBeNull();
    }
    const days = Array.from({ length: 30 }, (_, d) => balloonFor('child-teo', 'london', d, false));
    const held = days.filter(Boolean).length;
    expect(held).toBeGreaterThan(5);
    expect(held).toBeLessThan(15);
    for (const c of days) if (c) expect(BALLOON_COLOURS).toContain(c);
    expect(balloonFor('child-teo', 'london', 3, true)).toBe(balloonFor('child-teo', 'london', 3, true));
  });

  it('a held balloon hangs from the free hand, is tagged an accessory, and can be let go', () => {
    const m = new CharacterModel(Object.values(OUTFITS)[0], '#e0ac85', 0.62);
    const count = () => { let n = 0; m.root.traverse((o) => { if (o.userData.part === 'accessory') n++; }); return n; };
    const before = count();
    m.holdBalloon('#e8364a');
    expect(count()).toBeGreaterThan(before);
    m.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) expect(ALLOWED_PARTS as readonly string[]).toContain(o.userData.part); });
    m.update(1 / 60, { speed: 1, airborne: false, riding: false, t: 1 });
    m.holdBalloon(null);
    expect(count()).toBe(before);
  });

  it('balloon clusters are decor anyone can place, old saves included', () => {
    const st = newGame();
    st.unlockedDecor = ['fence'];
    expect(new Housing(st, new EventBus()).unlocked().map((d) => d.id)).toContain('balloons');
  });
});
