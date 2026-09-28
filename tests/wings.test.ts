import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { BODY_RADIUS, MIN_GAP, aheadOf, followStep, wingRoom } from '../src/characters/follow';
import { JET_REACH } from '../src/characters/jetpack';
import { OUTFITS } from '../src/characters/outfits';
import { HINGE_Z, MAX_BACK, MIN_BACK, WING_H, WING_REACH, WING_W } from '../src/characters/wings';

const parts = (c: CharacterModel) => { const out: string[] = []; c.root.traverse((m) => { if ((m as THREE.Mesh).isMesh || (m as THREE.Points).isPoints) out.push(m.userData.part); }); return out; };

describe('her stained-glass wings and his jetpack', () => {
  it('the wings are over three times her height and broad, spreading wide and sweeping back', () => {
    expect(WING_H).toBeCloseTo(3.3 * 1.78, 1);
    expect(WING_W).toBeGreaterThan(3.5);
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

describe('with her wings on, he stands in front of them; in flight, behind her', () => {
  const plane = HINGE_Z * HERO_SCALE.girl, own = JET_REACH * HERO_SCALE.boy + 0.2;
  it('on the ground he walks round to his place a step in front of her wings, whichever way she turns', () => {
    let b = { x: -3, y: 0, z: -3 };
    const g = { x: 0, y: 0, z: 0 };
    for (const heading of [0, 1.2, Math.PI, -2]) {
      for (let i = 0; i < 300; i++) {
        b = followStep({ boy: b, girl: g, heading, speed: 0, dt: 1 / 30, airborne: false, gap: MIN_GAP, stance: { forward: 0.75, side: 1.95 } }).pos;
        expect(Math.hypot(b.x - g.x, b.z - g.z)).toBeGreaterThanOrEqual(MIN_GAP - 1e-6);
        // Wherever he is on the way, her wings fit the room there is.
        const room = wingRoom(b, g, heading, own, plane);
        if (aheadOf(b, g, heading) - own < plane) expect(room).toBeLessThan(Math.hypot(b.x, b.z));
      }
      // Arrived: wholly in front of the wing plane, so they open fully.
      expect(aheadOf(b, g, heading)).toBeCloseTo(0.75, 1);
      expect(wingRoom(b, g, heading, own, plane)).toBe(Infinity);
    }
  });
  it('in flight he keeps behind her, beyond the wings\' reach', () => {
    const far = WING_REACH * HERO_SCALE.girl + own + 0.45;
    let b = { x: 2, y: 10, z: 2 };
    for (let i = 0; i < 400; i++) {
      const g = { x: 0, y: 10, z: i * 0.1 };
      b = followStep({ boy: b, girl: g, heading: 0, speed: 3, dt: 1 / 30, airborne: true, gap: MIN_GAP, stance: { forward: -far * 0.8, side: far * 0.6, up: -0.5 } }).pos;
      if (i > 200) { expect(aheadOf(b, g, 0)).toBeLessThan(0); expect(Math.hypot(b.x - g.x, b.z - g.z)).toBeGreaterThan(WING_REACH * HERO_SCALE.girl + own - 0.3); }
    }
  });
});
