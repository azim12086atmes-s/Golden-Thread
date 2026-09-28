import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { MIN_GAP } from '../src/characters/follow';
import { OUTFITS } from '../src/characters/outfits';
import { FRIENDS, friendScale } from '../src/event/Friends';
import { HAND_CLEARANCE, tyingSpot } from '../src/story/ThreadScene';

const tip = (m: CharacterModel, w: 'thread' | 'free') => m.armOf(w).localToWorld(new THREE.Vector3(0, -0.72, 0));

describe('the thread-tying opening', () => {
  it('he kneels at least MIN_GAP from her, whichever way she faces', () => {
    for (let h = 0; h < Math.PI * 2; h += 0.37) {
      const s = tyingSpot({ x: 3, z: -4 }, h, 0.24 * HERO_SCALE.girl);
      expect(Math.hypot(s.x - 3, s.z + 4)).toBeGreaterThanOrEqual(MIN_GAP);
    }
  });

  it('their hands come close while tying, and never touch', () => {
    const girl = new CharacterModel(OUTFITS['g-meadow'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    const boy = new CharacterModel(OUTFITS['b-meadow'], '#c99a74', HERO_SCALE.boy, -1, 'boy');
    const s = tyingSpot({ x: 0, z: 0 }, 0, 0.24 * HERO_SCALE.girl);
    boy.root.position.set(s.x, 0, s.z);
    boy.root.rotation.y = s.heading;
    const pose = { speed: 0, airborne: false, riding: false, t: 0 };
    boy.kneel = 1;
    for (const phase of ['first', 'second'] as const) {
      girl.update(0, pose); boy.update(0, pose);
      const herWrist = girl.wrist('thread', new THREE.Vector3());
      const hisHands = boy.freeHand(new THREE.Vector3()).add(boy.wrist('thread', new THREE.Vector3())).multiplyScalar(0.5);
      const hisWrist = boy.wrist('thread', new THREE.Vector3());
      girl.reach = boy.reach = 1;
      boy.reachThread = boy.reachFree = phase === 'first' ? herWrist : girl.wrist('free', new THREE.Vector3()).add(herWrist).multiplyScalar(0.5);
      girl.reachThread = phase === 'first' ? hisHands : hisWrist;
      girl.reachFree = phase === 'first' ? null : hisWrist;
      for (let k = 0; k < 3; k++) { girl.update(0, pose); boy.update(0, pose); }
      let least = Infinity;
      for (const a of ['thread', 'free'] as const) for (const b of ['thread', 'free'] as const) least = Math.min(least, tip(girl, a).distanceTo(tip(boy, b)));
      // Close — within a short reach of each other — but a clear gap between the fingertips.
      expect(least).toBeGreaterThanOrEqual(HAND_CLEARANCE);
      expect(least).toBeLessThan(0.5);
    }
  });

  it('kneeling lowers him onto one knee without sinking below the ground', () => {
    const boy = new CharacterModel(OUTFITS['b-meadow'], '#c99a74', HERO_SCALE.boy, -1, 'boy');
    const headY = () => { boy.update(0, { speed: 0, airborne: false, riding: false, t: 0 }); boy.root.updateMatrixWorld(true); return boy.head.getWorldPosition(new THREE.Vector3()).y; };
    const standing = headY();
    boy.kneel = 1;
    const kneeling = headY();
    const box = new THREE.Box3().setFromObject(boy.root);
    expect(box.min.y).toBeGreaterThan(-0.08);
    expect(standing - kneeling).toBeGreaterThan(0.3);
  });
});

describe('her friends at the celebration', () => {
  const h = (name: string) => friendScale(FRIENDS.find((f) => f.name === name)!);
  const her = HERO_SCALE.girl, him = HERO_SCALE.boy;
  it('stand at the heights the owner gave', () => {
    expect(h('Musadiq')).toBeGreaterThan(him);
    expect(h('Farzan')).toBeCloseTo(him);
    expect(h('Zaid')).toBeGreaterThan(her);
    expect(h('Zaid')).toBeLessThan(him);
    expect(h('Zidane')).toBeGreaterThan(h('Zaid'));
    expect(h('Varna')).toBeGreaterThan(her);
    expect(h('Varna')).toBeLessThan(h('Zaid'));
    for (const n of ['Srushti', 'Shruti', 'Smruti', 'Shifa']) expect(h(n)).toBeCloseTo(her);
    // The family: Aasima taller than her, Suvaibia shorter, Maryam taller than Suvaibia,
    // Abdur Rahim as tall as Maryam and shorter than him.
    expect(h('Aasima')).toBeGreaterThan(her);
    expect(h('Suvaibia')).toBeLessThan(her);
    expect(h('Maryam')).toBeGreaterThan(h('Suvaibia'));
    expect(h('Abdur Rahim')).toBeCloseTo(h('Maryam'));
    expect(h('Abdur Rahim')).toBeLessThan(him);
  });
  it('wear real, modest outfits', () => {
    for (const f of FRIENDS) expect(OUTFITS[f.outfit], f.name).toBeTruthy();
  });
});
