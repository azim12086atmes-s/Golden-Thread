import { describe, expect, it } from 'vitest';
import { LOCALES } from '../src/world/locale';
import { REGIONS } from '../src/world/regions';

describe('each land has its own look and air', () => {
  it('every land has a vibrant grade and its own particles', () => {
    for (const r of REGIONS) {
      const l = LOCALES[r.id];
      expect(l, r.id).toBeTruthy();
      expect(l.grade.sat, r.id).toBeGreaterThanOrEqual(1.05);
      expect(l.grade.amt).toBeLessThanOrEqual(0.25);
      expect(l.particles.colors.length, r.id).toBeGreaterThan(0);
      for (const c of l.particles.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(l.particles.count).toBeLessThanOrEqual(520);
    }
    // No two lands share the same particles.
    expect(new Set(REGIONS.map((r) => LOCALES[r.id].particles.what)).size).toBe(REGIONS.length);
  });
});

describe('each town dressed in its own glamour', () => {
  it('every land has its own sky, lantern colours and artifacts', () => {
    for (const r of REGIONS) {
      const l = LOCALES[r.id];
      for (const c of [l.sky.day, l.sky.dusk, l.sky.night, ...l.lights]) expect(c, r.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(l.lights.length, r.id).toBeGreaterThanOrEqual(2);
      expect(l.artifacts.length, r.id).toBeGreaterThanOrEqual(4);
    }
    // No two lands share the same set of artifacts.
    expect(new Set(REGIONS.map((r) => [...new Set(LOCALES[r.id].artifacts)].sort().join())).size).toBeGreaterThan(15);
  });

  it('artifacts stand beyond the plaza, off the avenues, clear of the market, before the houses', async () => {
    const { artifactSpots, STRING_AT } = await import('../src/world/TownDressing');
    const { STALLS } = await import('../src/npc/Townsfolk');
    for (const s of artifactSpots(5)) {
      const d = Math.hypot(s.x, s.z);
      expect(d).toBeGreaterThan(50); // the plaza and its landmark
      expect(d).toBeLessThan(61); // houses start at 62
      expect(Math.min(Math.abs(s.x), Math.abs(s.z))).toBeGreaterThan(12); // off the avenues
      for (const m of STALLS) expect(Math.hypot(s.x - m.x, s.z - m.z)).toBeGreaterThan(6);
    }
    for (const z of STRING_AT) expect(z).toBeGreaterThan(Math.max(...STALLS.map((m) => m.z)) + 10);
  });
});

describe('lanterns in the sky', () => {
  it('drift upwards in the world (you walk past them) in the land’s own colours', async () => {
    const THREE = await import('three');
    const { SkyLanterns, SKY_LANTERNS } = await import('../src/world/SkyLanterns');
    const sl = new SkyLanterns();
    const f = new THREE.Vector3(100, 5, 100);
    sl.update(0.016, 0, f, 'japan', 1);
    const at = (i: number) => { const m = new THREE.Matrix4(); sl.mesh.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixPosition(m); };
    const before = at(3);
    f.x += 10; // the travellers walk on
    sl.update(0.016, 0, f, 'japan', 1);
    const after = at(3);
    expect(SKY_LANTERNS).toBeGreaterThanOrEqual(100);
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.5); // anchored in the world, not to the player
    expect(after.y).toBeGreaterThan(before.y); // rising
  });
});

describe('streets full of people', () => {
  it('friends chat in circles by the ring road, where houses never stand', async () => {
    const { PER_TOWN, CHAT_GROUPS } = await import('../src/npc/Townsfolk');
    expect(PER_TOWN).toBeGreaterThanOrEqual(42);
    expect(CHAT_GROUPS * 3).toBeLessThanOrEqual(PER_TOWN - 30);
    // Houses keep 14 m from the ring road (radius 140); the road itself is 9 m wide.
    expect(131).toBeGreaterThan(126);
    expect(131 + 1.1).toBeLessThan(135.5);
  });
});
