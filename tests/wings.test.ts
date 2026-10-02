import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { CharacterModel, DIMS, EYE_LINE, HERO_SCALE, SHOULDER_TOP } from '../src/characters/CharacterModel';
import { BODY_RADIUS, MIN_GAP, aheadOf, besideWings, followStep, wingRoom } from '../src/characters/follow';
import { JET_REACH } from '../src/characters/jetpack';
import { OUTFITS } from '../src/characters/outfits';
import { HINGE_Z, MAX_BACK, MIN_BACK, WING_FLOOR, WING_H, WING_REACH, WING_W, bendPoint, wingAngle, type Beat } from '../src/characters/wings';

const parts = (c: CharacterModel) => { const out: string[] = []; c.root.traverse((m) => { if ((m as THREE.Mesh).isMesh || (m as THREE.Points).isPoints) out.push(m.userData.part); }); return out; };

describe('her stained-glass wings and his jetpack', () => {
  it('the wings are seven and a half times her height and tall rather than stretched, spreading wide and sweeping back', () => {
    expect(WING_H).toBeCloseTo(7.5 * 1.78, 1);
    expect(WING_W).toBeGreaterThan(8.5);
    expect(WING_W / WING_H).toBeLessThan(0.7);
    expect(MIN_BACK).toBeLessThan(0.5); // spread wide
    expect(MAX_BACK).toBeGreaterThan(1.0);
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
  it('on the ground he walks round to his place beside her, clear of her swept-back wings, whichever way she turns', () => {
    let b = { x: -3, y: 0, z: -3 };
    const g = { x: 0, y: 0, z: 0 };
    for (const heading of [0, 1.2, Math.PI, -2]) {
      for (let i = 0; i < 300; i++) {
        b = followStep({ boy: b, girl: g, heading, speed: 0, dt: 1 / 30, airborne: false, gap: MIN_GAP, stance: { forward: 0.35, side: 2.1 } }).pos;
        expect(Math.hypot(b.x - g.x, b.z - g.z)).toBeGreaterThanOrEqual(MIN_GAP - 1e-6);
        // Wherever he is on the way, her wings fit the room there is.
        const room = wingRoom(b, g, heading, own, plane, MIN_BACK);
        if (room !== Infinity) expect(room).toBeLessThan(Math.hypot(b.x, b.z));
      }
      // Arrived: beside her (hardly ahead), yet wholly clear of the glass, so they open fully.
      expect(aheadOf(b, g, heading)).toBeCloseTo(0.35, 1);
      expect(wingRoom(b, g, heading, own, plane, MIN_BACK)).toBe(Infinity);
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

describe('the wings flutter softly, like silk', () => {
  const beat = (phase: number, time: number, flutter = 0.22): Beat => ({ phase, mid: (MIN_BACK + MAX_BACK) / 2, amp: (MAX_BACK - MIN_BACK) / 2 * 0.95, flutter, curl: Math.max(0, Math.cos(phase) * 0.5 + 0.15), lift: 0.45, time });
  it('the stroke travels out to the tips (they lag the root), and never spreads further forward than MIN_BACK', () => {
    let lagged = 0;
    for (let i = 0; i < 400; i++) {
      const b = beat(i * 0.07, i * 0.05);
      for (let s = 0; s <= 1.0001; s += 0.1) for (const y of [-2, 0, 3, 6]) expect(wingAngle(s, y, b).th).toBeGreaterThanOrEqual(MIN_BACK);
      if (Math.abs(wingAngle(0.05, 0, b).th - wingAngle(1, 0, b).th) > 0.15) lagged++;
      // Nothing of the wing is ever further out than its reach.
      for (const [x, y] of [[WING_W, 0], [WING_W * 0.6, 4], [WING_W * 0.9, -1]]) {
        const [px, , pz] = bendPoint(x, y, 1, b);
        expect(Math.hypot(px, pz)).toBeLessThanOrEqual(WING_REACH + 1e-6);
        expect(pz).toBeLessThanOrEqual(1e-9); // always behind her back's plane
      }
    }
    expect(lagged).toBeGreaterThan(100);
  });
});

describe('the two wings never collide, and in flight he flies close below them', () => {
  it('however they beat, each wing stays on its own side of her, and none reaches below the wing floor', () => {
    for (let i = 0; i < 500; i++) {
      const b: Beat = { phase: i * 0.09, mid: (MIN_BACK + MAX_BACK) / 2, amp: (MAX_BACK - MIN_BACK) / 2, flutter: 0.22, curl: Math.max(0, Math.cos(i * 0.09) * 0.5 + 0.15), lift: 0.45, time: i * 0.04 };
      for (let x = 0.2; x <= WING_W; x += WING_W / 8) for (const y of [-1.2, 0, 4, 9]) {
        // Well apart even swept fully back: never merging into one another.
        expect(bendPoint(x, y, 1, b)[0]).toBeGreaterThan(x * 0.4);
        expect(bendPoint(x, y, -1, b)[0]).toBeLessThan(-x * 0.4);
      }
      // The tails' tips (at her feet) never dip further than WING_FLOOR.
      expect(bendPoint(WING_W, -1.26, 1, b)[1] - -1.26).toBeGreaterThan(-WING_FLOOR);
    }
  });
  it('in flight he settles close beside her, his head just below her shoulder, a step ahead of the wings, never nearer than MIN_GAP', () => {
    const shoulder = SHOULDER_TOP * HERO_SCALE.girl, head = (EYE_LINE + DIMS.headR) * HERO_SCALE.boy;
    const st = besideWings(shoulder - head - 0.05);
    let b = { x: 6, y: 30, z: -4 };
    for (let i = 0; i < 600; i++) {
      const g = { x: 0, y: 30 + Math.sin(i * 0.02), z: i * 0.1 };
      b = followStep({ boy: b, girl: g, heading: 0, speed: 3, dt: 1 / 30, airborne: true, gap: MIN_GAP, stance: st }).pos;
      // As the game does (Travellers.updateBoy): never rising above his place as she dips.
      b = { ...b, y: Math.min(b.y, g.y + (st.up ?? 0)) };
      expect(Math.hypot(b.x - g.x, b.y - g.y, b.z - g.z)).toBeGreaterThanOrEqual(MIN_GAP - 1e-6);
      if (i > 300) {
        // His head just under her shoulder: below it, and within a hand's breadth or so.
        const top = b.y + head, sh = g.y + shoulder;
        expect(top).toBeLessThanOrEqual(sh + 1e-6);
        expect(top).toBeGreaterThan(sh - 0.35);
        expect(Math.hypot(b.x - g.x, b.z - g.z)).toBeLessThan(2.0);
        // ...ahead of her back, where her (upright) wings never reach, so they open fully.
        expect(wingRoom(b, g, 0, JET_REACH * HERO_SCALE.boy + 0.2, HINGE_Z * HERO_SCALE.girl, MIN_BACK)).toBe(Infinity);
      }
    }
  });
});
