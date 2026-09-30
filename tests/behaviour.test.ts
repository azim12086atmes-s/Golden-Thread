import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AnimalModel, SPECIES, type SpeciesId } from '../src/animals/AnimalModel';
import { GREET_STOP, awake, grazes, greetSpot, herds, nextActivity, nocturnal, wanderTarget } from '../src/animals/behaviour';

const ids = Object.keys(SPECIES) as SpeciesId[];

describe('how the animals live their day', () => {
  it('grazers crop the grass and birds peck; herds keep together; machines neither graze nor sleep', () => {
    for (const id of ['sheep', 'cow', 'deer', 'goat', 'horse', 'duck', 'muskox'] as SpeciesId[]) expect(grazes(id), id).toBe(true);
    for (const id of ['dog', 'cat', 'fox', 'eagle', 'mechahorse', 'brasshorse'] as SpeciesId[]) expect(grazes(id), id).toBe(false);
    for (const id of ['sheep', 'cow', 'reindeer', 'camel'] as SpeciesId[]) expect(herds(id), id).toBe(true);
    expect(herds('rabbit')).toBe(false);
    expect(awake('mechahorse', 3)).toBe(true);
  });

  it('day animals rest at night; night animals come out', () => {
    expect(nocturnal('fox')).toBe(true);
    expect(awake('sheep', 12)).toBe(true);
    expect(awake('sheep', 23)).toBe(false);
    expect(awake('fox', 23)).toBe(true);
    expect(awake('fox', 12)).toBe(false);
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) expect(nextActivity('sheep', 2, rnd).act).toBe('rest');
    const acts = new Set(Array.from({ length: 200 }, () => nextActivity('sheep', 10, rnd).act));
    expect([...acts].sort()).toEqual(['graze', 'rest', 'wander']);
    expect(new Set(Array.from({ length: 200 }, () => nextActivity('dog', 10, rnd).act)).has('graze')).toBe(false);
  });

  it('a herd animal wanders near its herd, and never out of its home ground', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const home = { x: 100, z: 50 }, herd = { x: 110, z: 52 };
    for (let i = 0; i < 100; i++) {
      const w = wanderTarget(home, 14, herd, rnd);
      expect(Math.hypot(w.x - herd.x, w.z - herd.z)).toBeLessThanOrEqual(7.01 + 1e-9);
      expect(Math.hypot(w.x - home.x, w.z - home.z)).toBeLessThanOrEqual(14 + 1e-9);
    }
  });

  it('a friend trots over to greet them and stops a polite step away', () => {
    const me = { x: 0, z: 0 };
    const g = greetSpot({ x: 9, z: 3 }, me)!;
    expect(Math.hypot(g.x, g.z)).toBeCloseTo(GREET_STOP);
    expect(greetSpot({ x: 40, z: 0 }, me)).toBeNull();
    expect(greetSpot({ x: 1.5, z: 1 }, me)).toBeNull();
  });

  it('grazing, every animal\'s head drops to the grass still floating clear of its body', () => {
    const verts = (root: THREE.Object3D, inHead: boolean, head: THREE.Object3D) => {
      const out: THREE.Vector3[] = [];
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        let under = false;
        for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === head) under = true;
        if (under !== inHead) return;
        const pos = m.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
      });
      return out;
    };
    for (const id of ids.filter(grazes)) {
      const a = new AnimalModel(id);
      const up = verts(a.root, true, a.head).reduce((m, v) => Math.min(m, v.y), Infinity);
      a.graze = 1;
      a.update(0.016, 0, 1);
      const head = verts(a.root, true, a.head), body = verts(a.root, false, a.head);
      let min = Infinity;
      for (const h of head) for (const b of body) min = Math.min(min, h.distanceTo(b));
      expect(min, `${id} head clearance while grazing`).toBeGreaterThanOrEqual(0.03);
      const low = head.reduce((m, v) => Math.min(m, v.y), Infinity);
      expect(low, `${id} head lowers`).toBeLessThan(up - 0.05);
      expect(low, `${id} head above the ground`).toBeGreaterThan(-0.05);
    }
  });
});
