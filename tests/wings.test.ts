import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { MIN_GAP } from '../src/characters/follow';
import { JET_REACH } from '../src/characters/jetpack';
import { OUTFITS } from '../src/characters/outfits';
import { MAX_BACK, MIN_BACK, WING_H, WING_REACH, WING_SPAN, WING_W } from '../src/characters/wings';

const parts = (c: CharacterModel) => { const out: string[] = []; c.root.traverse((m) => { if ((m as THREE.Mesh).isMesh) out.push(m.userData.part); }); return out; };

describe('her stained-glass wings and his jetpack', () => {
  it('the wings are twice her height across, heart-shaped halves, and sweep back', () => {
    expect(WING_SPAN).toBeCloseTo(2 * 1.8, 1);
    expect(WING_H / WING_W).toBeCloseTo(29 / 16);
    expect(MIN_BACK).toBeGreaterThan(0.9);
    expect(MAX_BACK).toBeGreaterThan(MIN_BACK);
  });

  it('even fully open, her wings and his jetpack never reach each other at the closest the two may come', () => {
    expect(WING_REACH * HERO_SCALE.girl + JET_REACH * HERO_SCALE.boy).toBeLessThan(MIN_GAP);
  });

  it('the starry dresses carry the wings, his celebration and sci-fi coats the jetpack; all parts allowed', () => {
    for (const id of ['g-starlight-gown', 'g-star', 'g-petal', 'g-nova']) expect(OUTFITS[id].detail?.back, id).toBe('wings');
    for (const id of ['b-celebration', 'b-nova', 'b-moon']) expect(OUTFITS[id].detail?.back, id).toBe('jetpack');
    const girl = new CharacterModel(OUTFITS['g-starlight-gown'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    const boy = new CharacterModel(OUTFITS['b-celebration'], '#c99a74', HERO_SCALE.boy, -1, 'boy');
    for (let t = 0; t < 8; t += 0.5) {
      girl.update(1 / 60, { speed: 3, airborne: t > 4, riding: false, t });
      boy.update(1 / 60, { speed: 3, airborne: t > 4, riding: false, t });
    }
    expect(parts(girl).filter((p) => p === 'wing')).toHaveLength(2);
    expect(parts(boy).filter((p) => p === 'accessory').length).toBeGreaterThan(10);
    for (const p of [...parts(girl), ...parts(boy)]) expect(isAllowedPart(p)).toBe(true);
  });
});
