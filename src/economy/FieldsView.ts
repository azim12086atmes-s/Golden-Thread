import * as THREE from 'three';
import type { GameState } from '../core/state';
import { Rng } from '../core/rng';
import { CROPS } from '../housing/housing';
import type { Ctx } from '../world/architecture';
import { GeoBuilder } from '../world/kit';
import { BARN, buildField } from '../world/models/fields';
import { REGION_BY_ID } from '../world/regions';
import { surfaceAt, terrainHeight } from '../world/terrain';
import type { World } from '../world/World';
import { FIELD_SITES, FIELD_SIZE, fieldGrowth } from './fields';

/**
 * Draws the farmland of the lands that are loaded: open fields for sale with a signpost, and the
 * fields you own tilled, with their crop at its growth (redrawn in five steps as it grows) and a
 * barn. The field itself comes from the 3D side's `buildField` (world/models/fields.ts).
 */
export class FieldsView {
  private groups = new Map<string, { grp: THREE.Group; sig: string }>();

  constructor(private scene: THREE.Scene, private st: GameState, private world: World) {}

  update(): void {
    for (const site of FIELD_SITES) {
      const loaded = this.world.isLoaded(site.land);
      const f = this.st.fields[site.id];
      const growth = f?.crop ? Math.floor(fieldGrowth(this.st, site.id) * 4) / 4 : 0;
      const sig = !loaded ? '' : f ? `own:${f.crop?.seed ?? ''}:${growth}` : 'open';
      const have = this.groups.get(site.id);
      if (have && have.sig === sig) continue;
      if (have) {
        this.scene.remove(have.grp);
        have.grp.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
        this.groups.delete(site.id);
        this.world.setColliders(`field:${site.id}`, []);
      }
      if (!sig) continue;
      const g = new GeoBuilder(), glow = new GeoBuilder(), y = surfaceAt(site.x, site.z);
      const c: Ctx = { g, glow, rng: new Rng(`field:${site.id}`), s: REGION_BY_ID[site.land] };
      const cd = f?.crop ? CROPS[f.crop.seed] : null;
      buildField(c, FIELD_SIZE, { crop: cd ? { leaf: cd.leaf, ripe: cd.ripe, shape: cd.shape } : null, growth: f?.crop ? fieldGrowth(this.st, site.id) : 0, owned: !!f },
        (x, z) => terrainHeight(site.x + x, site.z + z) - y);
      const grp = new THREE.Group();
      const m1 = g.build(this.world.solid), m2 = glow.build(this.world.glow);
      if (m1) { m1.castShadow = true; m1.receiveShadow = true; grp.add(m1); }
      if (m2) grp.add(m2);
      grp.position.set(site.x, y, site.z);
      this.scene.add(grp);
      this.groups.set(site.id, { grp, sig });
      if (f) this.world.setColliders(`field:${site.id}`, [{ x: site.x + BARN.x, z: site.z + BARN.z, r: BARN.w * 0.55, h: terrainHeight(site.x + BARN.x, site.z + BARN.z) + BARN.h + 1.6 }]);
    }
  }
}
