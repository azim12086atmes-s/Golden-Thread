import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { HOUSE_SHAPE, HouseInterior } from '../src/housing/HouseInterior';
import { VAN_OPTIONS } from '../src/housing/VanInterior';
import type { VanSlot } from '../src/core/state';
import { REGIONS } from '../src/world/regions';

/**
 * No glowing sheet in front of the view (owner: "some interiors have a glowing sheet covering the
 * view"): nothing lit may stand within 3 m of the camera inside the part of the picture you look at,
 * and no single lit surface may be large (bloom turns a big lit panel into a white sheet).
 */
function glowNearCamera(room: HouseInterior): { near: number; biggest: number } {
  const cam = room.camera;
  cam.aspect = 16 / 9; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  let near = Infinity, biggest = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  room.scene.updateMatrixWorld(true);
  room.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !(mesh.material instanceof THREE.MeshBasicMaterial) || mesh.material.toneMapped !== false) return;
    const p = mesh.geometry.getAttribute('position');
    for (let i = 0; i + 2 < p.count; i += 3) {
      a.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); b.fromBufferAttribute(p, i + 1).applyMatrix4(mesh.matrixWorld); c.fromBufferAttribute(p, i + 2).applyMatrix4(mesh.matrixWorld);
      m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
      if (frustum.containsPoint(m)) near = Math.min(near, m.distanceTo(cam.position));
      biggest = Math.max(biggest, new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() / 2);
    }
  });
  return { near, biggest };
}

describe('no glowing sheet across the view', () => {
  it('in every house of every land and kind', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const bad: string[] = [];
    const kinds = ['house', 'shop', 'courtyard', 'tower', ...Object.keys(HOUSE_SHAPE)];
    for (const r of REGIONS) for (const kind of kinds) for (const night of [0, 1]) {
      room.enter({ id: `${r.id}:5`, land: r.id, x: 0, z: 0, y: 0, facing: 0, kind, r: 5 }, night, false);
      const { near, biggest } = glowNearCamera(room);
      if (near <= 3 || biggest >= 3) bad.push(`${r.id} ${kind} ${night}: near ${near.toFixed(2)} big ${biggest.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  }, 120_000);

  it('in every institute, monument hall, cavern and the castle', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const bad: string[] = [];
    for (const r of REGIONS) for (const [kind, id] of [['institute', 'inst:x:school:2'], ['institute', 'inst:x:clinic:3'], ['institute', 'inst:x:tech:3'], ['landmark', `${r.id}:lm`], ['cavern', 'cavern:ice:x'], ['castle', 'castle']] as const) {
      room.enter({ id, land: r.id, x: 0, z: 0, y: 0, facing: 0, kind, r: 5 }, 1, false);
      const { near, biggest } = glowNearCamera(room);
      if (near <= 3 || biggest >= 3) bad.push(`${r.id} ${id}: near ${near.toFixed(2)} big ${biggest.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  }, 120_000);

  it('in a penthouse of your own, furnished with everything lit', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const decor = Object.fromEntries(Object.entries(VAN_OPTIONS).map(([k, opts]) => [k, opts[opts.length - 1].id])) as Record<VanSlot, string>;
    for (const night of [0, 1]) {
      room.enter({ id: 'newyork:2', land: 'newyork', x: 0, z: 0, y: 0, facing: 0, kind: 'penthouse', r: 5 }, night, false, decor);
      // (The penthouse's own lit ceiling and city lie beyond; nothing you add may glow near the lens.)
      expect(glowNearCamera(room).near).toBeGreaterThan(3);
    }
  });
});
