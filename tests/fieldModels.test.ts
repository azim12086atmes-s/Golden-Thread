import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GeoBuilder } from '../src/world/kit';
import { buildField } from '../src/world/models/fields';
import { REGIONS } from '../src/world/regions';

describe("each land's farm", () => {
  it('builds a field and its barn in the land style, owned and for sale', () => {
    for (const r of REGIONS) for (const owned of [true, false]) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      buildField({ g, glow, rng: new Rng(`f:${r.id}`), s: r }, 40, { crop: owned ? { leaf: '#4f8a3a', ripe: '#e8c84a', shape: 'stalk' } : null, growth: 0.8, owned }, () => 0);
      const m = g.build(new THREE.MeshStandardMaterial());
      expect(m, r.id).not.toBeNull();
      const box = new THREE.Box3().setFromObject(m!);
      expect(box.max.x - box.min.x, r.id).toBeLessThanOrEqual(41);
    }
  });
});
