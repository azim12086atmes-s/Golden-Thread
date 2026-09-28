import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GeoBuilder } from '../src/world/kit';
import { ZONES } from '../src/world/nature';
import { REGIONS } from '../src/world/regions';
import { UNDERSTORY, plant, understoryFor, type Plant } from '../src/world/understory';

describe('the understory', () => {
  it('gives every land plants for its own ground, and the right plants to the right ground', () => {
    for (const r of REGIONS) {
      const all = new Set(ZONES.flatMap((z) => understoryFor(r.id, z)));
      expect(all.size, r.id).toBeGreaterThan(1);
    }
    expect(understoryFor('egypt', 'waterside')).toContain('papyrus');
    expect(understoryFor('middleeast', 'waterside')).toContain('mangrove');
    expect(understoryFor('switzerland', 'alpine')).toContain('alpenrose');
    expect(understoryFor('switzerland', 'alpine')).toContain('edelweiss');
    expect(understoryFor('norway', 'alpine')).toContain('heather');
    expect(understoryFor('desert', 'sand')).toContain('saltbush');
    expect(understoryFor('skyisles', 'cloud')).toContain('crystalBloom');
    expect(understoryFor('desert', 'snow')).toEqual([]);
  });

  it('builds every plant low, small and swaying', () => {
    const kinds = new Set<Plant>(Object.values(UNDERSTORY).flatMap((u) => Object.values(u.zones).flat()));
    for (const k of kinds) {
      const g = new GeoBuilder();
      const h = plant(g, k, 0, 0, 0, 1, Math.random, ['#ff0000']);
      const m = g.build(new THREE.MeshStandardMaterial())!;
      const box = new THREE.Box3().setFromObject(m);
      expect(box.max.y, k).toBeLessThanOrEqual(3.5);
      expect(box.max.y, k).toBeGreaterThan(0.15);
      expect(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z), k).toBeLessThan(1.8);
      expect(h, k).toBeGreaterThan(0);
      expect((m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3, k).toBeLessThan(1400);
    }
  });
});
