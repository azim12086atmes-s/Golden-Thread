import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Ctx } from '../world/architecture';
import { harbours, type Harbour } from '../world/harbours';
import { GeoBuilder } from '../world/kit';
import { DECK, LIGHTHOUSE, WAREHOUSE, buildHarbour } from '../world/models/harbour';
import { REGION_BY_ID } from '../world/regions';
import { WATER_Y, addPlatform, removePlatforms, terrainHeight } from '../world/terrain';
import type { World } from '../world/World';

/** Deck height of every harbour, in the world. */
export const HARBOUR_DECK = WATER_Y + DECK;

/** A local point of a harbour (x across, z out to sea) in world coordinates — the same turn as the group's rotation. */
export function harbourPoint(h: Harbour, x: number, z: number): { x: number; z: number } {
  const [dx, dz] = h.dir;
  return { x: h.x + dx * z + dz * x, z: h.z + dz * z - dx * x };
}

/**
 * Draws the harbours of the lands that are loaded (the 3D side's `buildHarbour`), turned to face
 * the sea, and makes their quay and pier walkable while they are there.
 */
export class HarboursView {
  private groups = new Map<string, THREE.Group>();

  constructor(private scene: THREE.Scene, private world: World) {}

  update(): void {
    for (const h of harbours()) {
      const loaded = this.world.isLoaded(h.land), have = this.groups.get(h.id);
      if (loaded === !!have) continue;
      if (have) {
        this.scene.remove(have);
        have.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
        this.groups.delete(h.id);
        removePlatforms((p) => p.tag === h.id);
        this.world.setColliders(`harbour:${h.id}`, []);
        continue;
      }
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const c: Ctx = { g, glow, rng: new Rng(`harbour:${h.id}`), s: REGION_BY_ID[h.land] };
      buildHarbour(c, h.pier, (x, z) => { const p = harbourPoint(h, x, z); return terrainHeight(p.x, p.z) - HARBOUR_DECK; });
      const grp = new THREE.Group();
      const m1 = g.build(this.world.solid), m2 = glow.build(this.world.glow);
      if (m1) { m1.castShadow = true; m1.receiveShadow = true; grp.add(m1); }
      if (m2) grp.add(m2);
      grp.position.set(h.x, HARBOUR_DECK, h.z);
      // Local +z points out to sea.
      grp.rotation.y = Math.atan2(h.dir[0], h.dir[1]);
      this.scene.add(grp);
      this.groups.set(h.id, grp);
      // Walk the quay and the pier.
      const plat = (x: number, z: number, r: number) => { const p = harbourPoint(h, x, z); addPlatform({ x: p.x, z: p.z, r, y: HARBOUR_DECK, tag: h.id }); };
      for (const x of [-9, 0, 9]) plat(x, -4, 5.2);
      for (let z = 1.5; z <= h.pier; z += 2.5) plat(0, z, 2);
      const w = harbourPoint(h, WAREHOUSE.x, WAREHOUSE.z);
      const lh = harbourPoint(h, LIGHTHOUSE.x, LIGHTHOUSE.z);
      this.world.setColliders(`harbour:${h.id}`, [{ x: w.x, z: w.z, r: WAREHOUSE.w * 0.55, h: terrainHeight(w.x, w.z) + WAREHOUSE.h + 2 }, { x: lh.x, z: lh.z, r: LIGHTHOUSE.r, h: terrainHeight(lh.x, lh.z) + LIGHTHOUSE.h }]);
    }
  }
}
