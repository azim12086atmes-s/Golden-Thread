import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GeoBuilder } from '../src/world/kit';
import { addStoreys } from '../src/world/models/homeStoreys';
import { REGIONS } from '../src/world/regions';

describe('a home grows a storey at a time, in its land style', () => {
  it('adds storeys with windows and a balcony, then scaffolding while the next goes up', () => {
    for (const r of REGIONS) {
      const base = { r: 5, h: 7 };
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const two = addStoreys({ g, glow, rng: new Rng(`h:${r.id}`), s: r }, base, 2, false);
      expect(two.h, r.id).toBeGreaterThan(base.h + 5);
      expect(glow.build(new THREE.MeshBasicMaterial()), `${r.id} windows`).not.toBeNull();
      const g2 = new GeoBuilder(), gl2 = new GeoBuilder();
      const building = addStoreys({ g: g2, glow: gl2, rng: new Rng(`h2:${r.id}`), s: r }, base, 1, true);
      expect(building.h, r.id).toBeGreaterThan(base.h + 3);
    }
  });
});
