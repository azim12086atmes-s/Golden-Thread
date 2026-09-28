import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { ChinaDragon } from '../src/world/ChinaDragon';
import { REGION_BY_ID, regionCenter } from '../src/world/regions';

describe('the great dragon of the Jade Terraces', () => {
  it('circles the temple well clear of it, its head floating ahead of its neck, built only of allowed parts', () => {
    const scene = new THREE.Scene(), d = new ChinaDragon(scene), c = regionCenter(REGION_BY_ID.china);
    for (let t = 0; t < 60; t += 3) {
      d.update(t, true);
      d.group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(d.group);
      expect(box.max.y - box.min.y).toBeGreaterThan(8);
      // Its body stays out beyond the temple's platform, and in the sky.
      const body = d.group.children[0] as THREE.Mesh, pos = body.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i += 37) {
        const r = Math.hypot(pos.getX(i) - c.x, pos.getZ(i) - c.z);
        expect(r > 23 || pos.getY(i) > 30).toBe(true);
      }
    }
    d.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) expect(isAllowedPart(o.userData.part), o.userData.part).toBe(true); });
    // Long: the body spans tens of metres.
    const body = d.group.children[0] as THREE.Mesh;
    body.geometry.computeBoundingBox();
    const s = new THREE.Vector3(); body.geometry.boundingBox!.getSize(s);
    expect(Math.max(s.x, s.z)).toBeGreaterThan(30);
  });
});
