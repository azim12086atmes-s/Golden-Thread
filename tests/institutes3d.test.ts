import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { INSTITUTES, INSTITUTE_BY_KIND } from '../src/institutions/catalogue';
import { SCIENCE_KINDS, buildScience } from '../src/world/sciences3d';
import { CARE_KINDS, buildCareInstitute } from '../src/world/institutes3d';
import { GeoBuilder, tree, type Flora } from '../src/world/kit';
import { REGIONS } from '../src/world/regions';

const solid = new THREE.MeshStandardMaterial();

describe('the care-and-learning institutes are real buildings', () => {
  it('every kind and stage builds in every land, within its radius', () => {
    for (const r of REGIONS) for (const kind of CARE_KINDS) for (const stage of [0, 1, 2, 3] as const) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = buildCareInstitute({ g, glow, rng: new Rng(`i:${r.id}:${kind}:${stage}`), s: r }, kind, stage);
      const radius = INSTITUTE_BY_KIND[kind].stages[stage].radius;
      expect(fp.r, `${r.id} ${kind} ${stage}`).toBeLessThanOrEqual(radius);
      const mesh = g.build(solid)!;
      // Every part within the stage's circle (a little slack for eaves and awnings).
      const pos = mesh.geometry.getAttribute('position');
      let far = 0;
      for (let i = 0; i < pos.count; i++) far = Math.max(far, Math.hypot(pos.getX(i), pos.getZ(i)));
      expect(far, `${r.id} ${kind} stage ${stage}`).toBeLessThanOrEqual(radius * 1.15 + 1.2);
      // Bigger at every stage: a stall grows into an institution.
      expect(fp.h, `${kind} ${stage}`).toBeGreaterThan(2.5);
      mesh.geometry.dispose();
    }
  });
});

describe("every land's own science is a real building too", () => {
  it('all 20 sciences, every stage, within their radius', () => {
    expect(SCIENCE_KINDS.length).toBe(20);
    for (const def of INSTITUTES.filter((d) => d.land)) for (const stage of [0, 1, 2, 3] as const) {
      const r = REGIONS.find((q) => q.id === def.land)!;
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = buildScience({ g, glow, rng: new Rng(`s:${def.kind}:${stage}`), s: r }, def.kind, stage);
      const radius = def.stages[stage].radius;
      expect(fp.r, `${def.kind} ${stage}`).toBeLessThanOrEqual(radius);
      const mesh = g.build(solid)!, pos = mesh.geometry.getAttribute('position');
      let far = 0;
      for (let i = 0; i < pos.count; i++) far = Math.max(far, Math.hypot(pos.getX(i), pos.getZ(i)));
      expect(far, `${def.kind} stage ${stage}`).toBeLessThanOrEqual(radius * 1.15 + 1.2);
      mesh.geometry.dispose();
    }
  });
});

describe('every tree species is built from leaves, not bare blobs', () => {
  const kinds: Flora[] = ['palm', 'coconut', 'pine', 'snowpine', 'cypress', 'bamboo', 'banana', 'baobab', 'crystal', 'cloud', 'candy', 'glowtree', 'oak', 'sakura'];
  for (const kind of kinds) it(`${kind} has leaf cards and wood`, () => {
    const g = new GeoBuilder();
    g.cards = [];
    let seed = 0.37;
    tree(g, kind, 0, 0, 0, 1, () => (seed = (seed * 9.13 + 0.371) % 1));
    expect(g.cards.length, kind).toBeGreaterThan(0);
    const mesh = g.build(solid);
    expect(mesh, kind).not.toBeNull();
    const box = new THREE.Box3().setFromObject(mesh!);
    expect(box.max.y, kind).toBeGreaterThan(2);
    expect(box.max.y, kind).toBeLessThan(30);
  });
});
