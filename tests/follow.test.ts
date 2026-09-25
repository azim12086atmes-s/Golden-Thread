import { describe, expect, it } from 'vitest';
import { BODY_RADIUS, IDEAL_GAP, MIN_GAP, SNAP, enforceGap, followStep, type V3 } from '../src/characters/follow';
import { Rng } from '../src/core/rng';

const d = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const ground = (x: number, z: number) => Math.sin(x * 0.1) * 2 + Math.cos(z * 0.07) * 3;

describe('the companion follows and never touches (brief; Islamic principles)', () => {
  it('bodies cannot meet at MIN_GAP', () => {
    expect(MIN_GAP - 2 * BODY_RADIUS).toBeGreaterThan(0.5);
  });

  it('keeps MIN_GAP through 20,000 steps of random walking, sprinting, stopping, flying and teleporting', () => {
    const rng = new Rng(42);
    let girl: V3 = { x: 0, y: 0, z: 0 };
    let boy: V3 = { x: 3, y: 0, z: 0 };
    let heading = 0, speed = 0, airborne = false;
    for (let i = 0; i < 20000; i++) {
      const dt = rng.range(0.004, 0.05);
      if (rng.chance(0.02)) heading += rng.range(-Math.PI, Math.PI);
      if (rng.chance(0.01)) speed = rng.pick([0, 0, 6.5, 12, 20, 36]);
      if (rng.chance(0.004)) airborne = !airborne;
      // Girl walks straight at the boy sometimes — the worst case.
      if (rng.chance(0.05)) heading = Math.atan2(boy.x - girl.x, boy.z - girl.z);
      girl = { x: girl.x + Math.sin(heading) * speed * dt, y: airborne ? girl.y + rng.range(-1, 1) : ground(girl.x, girl.z), z: girl.z + Math.cos(heading) * speed * dt };
      if (rng.chance(0.001)) girl = { x: girl.x + 500, y: girl.y, z: girl.z }; // fast travel
      const out = followStep({ boy, girl, heading, speed, dt, airborne, groundAt: ground });
      boy = out.pos;
      expect(d(boy, girl)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
    }
  });

  it('settles near the ideal distance when she stands still', () => {
    let boy: V3 = { x: 20, y: 0, z: 5 };
    const girl: V3 = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 600; i++) boy = followStep({ boy, girl, heading: 0, speed: 0, dt: 1 / 60, airborne: false }).pos;
    expect(Math.abs(d(boy, girl) - IDEAL_GAP)).toBeLessThan(0.05);
  });

  for (const v of [6.5, 11, 20, 24]) {
    it(`keeps pace beside her at ${v} m/s instead of trailing`, () => {
      let boy: V3 = { x: 2, y: 0, z: 0 };
      let girl: V3 = { x: 0, y: 0, z: 0 };
      const dt = 1 / 60;
      for (let i = 0; i < 600; i++) {
        girl = { x: girl.x, y: 0, z: girl.z + v * dt };
        boy = followStep({ boy, girl, heading: 0, speed: v, dt, airborne: true }).pos;
      }
      expect(d(boy, girl)).toBeLessThan(IDEAL_GAP + 1);
      expect(d(boy, girl)).toBeGreaterThanOrEqual(MIN_GAP);
    });
  }

  it('stays on the ground when she is on the ground', () => {
    let boy: V3 = { x: 5, y: 0, z: 5 };
    const girl: V3 = { x: 0, y: ground(0, 0), z: 0 };
    for (let i = 0; i < 100; i++) {
      boy = followStep({ boy, girl, heading: 1, speed: 3, dt: 1 / 30, airborne: false, groundAt: ground }).pos;
      expect(boy.y).toBeCloseTo(ground(boy.x, boy.z), 9);
    }
  });

  it('snaps beside her after fast travel, still apart', () => {
    const girl: V3 = { x: 1000, y: 0, z: 0 };
    const out = followStep({ boy: { x: 0, y: 0, z: 0 }, girl, heading: 0, speed: 0, dt: 0.016, airborne: false });
    expect(d(out.pos, girl)).toBeLessThan(SNAP);
    expect(d(out.pos, girl)).toBeGreaterThanOrEqual(MIN_GAP);
  });

  it('enforceGap handles exact overlap', () => {
    const p = enforceGap({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 });
    expect(d(p, { x: 1, y: 1, z: 1 })).toBeGreaterThanOrEqual(MIN_GAP);
  });
});
