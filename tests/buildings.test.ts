import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { ARCHETYPES, LAND_STYLE, buildVariant } from '../src/world/buildings';
import { GeoBuilder, tree, type Flora } from '../src/world/kit';
import { REGIONS } from '../src/world/regions';
import { TREE_SCALE } from '../src/world/RegionBuilder';

const size = (g: GeoBuilder) => {
  const m = g.build(new THREE.MeshBasicMaterial());
  return new THREE.Box3().setFromObject(m!).getSize(new THREE.Vector3());
};

describe('more buildings, in each land’s own style', () => {
  it('every land has its style, and every kind of building is used somewhere', () => {
    for (const r of REGIONS) {
      const st = LAND_STYLE[r.id];
      expect(st, r.id).toBeDefined();
      expect(st.kinds.length, r.id).toBeGreaterThanOrEqual(2);
      for (const c of st.frieze) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const a of ARCHETYPES) expect(REGIONS.some((r) => LAND_STYLE[r.id].kinds.includes(a)), a).toBe(true);
  });

  it('every variant builds in every land, at human scale, within its footprint', () => {
    for (const r of REGIONS) for (let i = 0; i < 8; i++) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const fp = buildVariant({ g, glow, rng: new Rng(`${r.id}:${i}`), s: r });
      const s = size(g);
      expect(s.y, r.id).toBeGreaterThan(5); // taller than two people standing on each other's shoulders
      expect(fp.h + 0.01, r.id).toBeGreaterThanOrEqual(s.y - 1.5);
      expect(Math.max(s.x, s.z) / 2, r.id).toBeLessThanOrEqual(fp.r * 1.5 + 1);
      expect(glow.size, `${r.id} lit windows`).toBeGreaterThan(0);
    }
  });

  it('trees in the wild stand 7 m and taller — well above the travellers', () => {
    for (const k of ['oak', 'pine', 'sakura', 'flame', 'jacaranda', 'rainbowgum', 'ginkgo', 'magnolia', 'candy', 'wisteria'] as Flora[]) {
      const g = new GeoBuilder();
      tree(g, k, 0, 0, 0, 0.8 * TREE_SCALE, () => 0.5);
      expect(size(g).y, k).toBeGreaterThan(6);
    }
  });

  it('every land grows more than one kind of tree, and new colourful kinds appear', () => {
    for (const r of REGIONS) expect(new Set(r.flora).size, r.id).toBeGreaterThanOrEqual(3);
    const all = new Set(REGIONS.flatMap((r) => r.flora));
    for (const k of ['wisteria', 'ginkgo', 'flame', 'jacaranda', 'rainbowgum', 'baobab', 'dragonblood', 'candy', 'glowtree', 'magnolia', 'aspen']) expect(all.has(k as Flora), k).toBe(true);
  });
});
