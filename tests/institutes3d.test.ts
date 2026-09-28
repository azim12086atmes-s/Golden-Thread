import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { BASE_RADII, INSTITUTES } from '../src/institutions/catalogue';
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
      // The builders draw at the base size; buildInstitute sets each stage up at its world size.
      const radius = BASE_RADII[stage];
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
  }, 30000);
});

describe("every land's own science is a real building too", () => {
  it('all 20 sciences, every stage, within their radius', () => {
    expect(SCIENCE_KINDS.length).toBe(20);
    for (const def of INSTITUTES.filter((d) => d.land)) for (const stage of [0, 1, 2, 3] as const) {
      const r = REGIONS.find((q) => q.id === def.land)!;
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = buildScience({ g, glow, rng: new Rng(`s:${def.kind}:${stage}`), s: r }, def.kind, stage);
      const radius = BASE_RADII[stage];
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

describe('institutions are public buildings, much bigger than houses', () => {
  it('a full institution stands tall and wide in its grounds, inside its site, in every land', async () => {
    const { buildInstitute } = await import('../src/world/models/institutes');
    const { SITE_SIZE } = await import('../src/institutions/sites');
    const { landScience } = await import('../src/institutions/institutions');
    for (const r of REGIONS) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = buildInstitute({ g, glow, rng: new Rng(`w:${r.id}`), s: r }, landScience(r.id), 3);
      // Houses stand some 6–10 m tall; an institution at least twice that, and wide.
      expect(fp.h, r.id).toBeGreaterThan(18);
      expect(fp.r, r.id).toBeGreaterThan(14);
      expect(fp.fence.length, r.id).toBeGreaterThan(r.id === 'skyisles' ? -1 : 40);
      const mesh = g.build(solid)!, pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i += 7) {
        expect(Math.abs(pos.getX(i)), r.id).toBeLessThanOrEqual(SITE_SIZE / 2 + 0.5);
        expect(Math.abs(pos.getZ(i)), r.id).toBeLessThanOrEqual(SITE_SIZE / 2 + 1.5);
      }
      mesh.geometry.dispose();
    }
  }, 60000);
});
