import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Ctx } from './architecture';
import { bridgesOf, type Bridge } from './bridges';
import { GeoBuilder } from './kit';
import { buildBridge } from './models/bridges';
import { REGIONS, REGION_BY_ID } from './regions';
import { addPlatform, removePlatforms } from './terrain';
import type { World } from './World';

/**
 * Draws the bridges of the lands that are loaded (the 3D side's `buildBridge`), and lays a
 * walkway along each deck while they are there.
 */
export class BridgesView {
  private groups = new Map<string, THREE.Group>();

  constructor(private scene: THREE.Scene, private world: World) {}

  update(): void {
    for (const r of REGIONS) {
      const loaded = this.world.isLoaded(r.id);
      for (const b of bridgesOf(r.id)) {
        const have = this.groups.get(b.id);
        if (loaded === !!have) continue;
        if (have) {
          this.scene.remove(have);
          have.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
          this.groups.delete(b.id);
          removePlatforms((p) => p.tag === b.id);
        } else this.add(b);
      }
    }
  }

  private add(b: Bridge): void {
    const g = new GeoBuilder(), glow = new GeoBuilder();
    const c: Ctx = { g, glow, rng: new Rng(`bridge:${b.id}`), s: REGION_BY_ID[b.land] };
    const { deckAt } = buildBridge(c, b.length, b.width);
    const grp = new THREE.Group();
    const m1 = g.build(this.world.solid), m2 = glow.build(this.world.glow);
    if (m1) { m1.castShadow = true; m1.receiveShadow = true; grp.add(m1); }
    if (m2) grp.add(m2);
    grp.position.set(b.x, b.y, b.z);
    grp.rotation.y = b.ry;
    this.scene.add(grp);
    this.groups.set(b.id, grp);
    const [dx, dz] = b.dir;
    for (let s = -b.length / 2 + 0.5; s <= b.length / 2 - 0.5; s += 1.5) addPlatform({ x: b.x + dx * s, z: b.z + dz * s, r: b.width / 2, y: b.y + deckAt(s), tag: b.id });
  }
}
