import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GeoBuilder } from '../src/world/kit';
import { buildBridge } from '../src/world/models/bridges';
import { REGIONS } from '../src/world/regions';

describe("every land's bridge", () => {
  it('builds in its own style, steps on at the banks and is lit at night', () => {
    for (const r of REGIONS) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const { deckAt } = buildBridge({ g, glow, rng: new Rng(`b:${r.id}`), s: r }, 24, 4);
      expect(Math.abs(deckAt(-12)), r.id).toBeLessThanOrEqual(0.3);
      expect(Math.abs(deckAt(12)), r.id).toBeLessThanOrEqual(0.3);
      expect(deckAt(0), r.id).toBeGreaterThan(0.8);
      expect(g.build(new THREE.MeshStandardMaterial()), r.id).not.toBeNull();
      expect(glow.build(new THREE.MeshBasicMaterial()), `${r.id} has lamps`).not.toBeNull();
    }
  });
});
