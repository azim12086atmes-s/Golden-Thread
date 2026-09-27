import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { BODY_RADIUS, MIN_GAP, followStep } from '../src/characters/follow';
import { JET_REACH } from '../src/characters/jetpack';
import { OUTFITS } from '../src/characters/outfits';
import { HINGE_Z, MAX_BACK, MIN_BACK, WING_H, WING_REACH, WING_W } from '../src/characters/wings';

const parts = (c: CharacterModel) => { const out: string[] = []; c.root.traverse((m) => { if ((m as THREE.Mesh).isMesh || (m as THREE.Points).isPoints) out.push(m.userData.part); }); return out; };

describe('her stained-glass wings and his jetpack', () => {
  it('the wings are three times her height, heart halves, spreading wide and sweeping back', () => {
    expect(WING_H).toBeCloseTo(3 * 1.78, 1);
    expect(WING_W).toBeGreaterThan(2);
    expect(MIN_BACK).toBeLessThan(0.5); // spread wide
    expect(MAX_BACK).toBeGreaterThan(1.2);
    expect(WING_REACH).toBeCloseTo(WING_W + Math.abs(HINGE_Z));
  });

  it('when she wears the wings he keeps far enough away that nothing ever reaches him', () => {
    const girl = new CharacterModel(OUTFITS['g-starlight-gown'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    const boy = new CharacterModel(OUTFITS['b-celebration'], '#c99a74', HERO_SCALE.boy, -1, 'boy');
    const gap = girl.backReach() + Math.max(boy.backReach(), BODY_RADIUS) + 0.2;
    expect(girl.backReach()).toBeCloseTo(WING_REACH * HERO_SCALE.girl);
    expect(boy.backReach()).toBeCloseTo(JET_REACH * HERO_SCALE.boy);
    expect(gap).toBeGreaterThan(MIN_GAP);
    // However he moves, the follow step keeps him beyond it.
    let b = { x: 0.5, y: 0, z: 0 };
    for (let i = 0; i < 400; i++) {
      const g = { x: Math.sin(i * 0.05) * 20, y: 0, z: i * 0.08 };
      b = followStep({ boy: b, girl: g, heading: i * 0.03, speed: 3, dt: 1 / 30, airborne: false, gap }).pos;
      expect(Math.hypot(b.x - g.x, b.z - g.z)).toBeGreaterThanOrEqual(gap - 1e-6);
    }
    // Close anyway (a scene placing them), her wings fold in to fit.
    girl.setBackRoom(0.5);
    let wings: THREE.Object3D | undefined;
    girl.root.traverse((o) => { if (o.userData.part === 'wing' && !wings) wings = o.parent!; });
    expect(wings!.scale.x * WING_REACH * HERO_SCALE.girl).toBeLessThanOrEqual(0.5 + 1e-6);
  });

  it('the starry dresses carry the wings, his celebration and sci-fi coats the jetpack; left off indoors', () => {
    for (const id of ['g-starlight-gown', 'g-star', 'g-petal', 'g-nova']) expect(OUTFITS[id].detail?.back, id).toBe('wings');
    for (const id of ['b-celebration', 'b-nova', 'b-moon']) expect(OUTFITS[id].detail?.back, id).toBe('jetpack');
    const girl = new CharacterModel(OUTFITS['g-starlight-gown'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    const boy = new CharacterModel(OUTFITS['b-celebration'], '#c99a74', HERO_SCALE.boy, -1, 'boy');
    for (let t = 0; t < 8; t += 0.5) {
      girl.update(1 / 60, { speed: 3, airborne: t > 4, riding: false, t });
      boy.update(1 / 60, { speed: 3, airborne: t > 4, riding: false, t });
    }
    expect(parts(girl).filter((p) => p === 'wing').length).toBeGreaterThanOrEqual(2);
    expect(parts(boy).filter((p) => p === 'accessory').length).toBeGreaterThan(10);
    for (const p of [...parts(girl), ...parts(boy)]) expect(isAllowedPart(p)).toBe(true);
    girl.hideBack(); boy.hideBack();
    expect(parts(girl)).not.toContain('wing');
    expect(girl.backReach()).toBe(0);
  });
});
