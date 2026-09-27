import * as THREE from 'three';
import type { GameState } from '../core/state';
import { Rng } from '../core/rng';
import type { Ctx } from '../world/architecture';
import { GeoBuilder, box, cyl } from '../world/kit';
import { buildInstitute } from '../world/models/institutes';
import { REGION_BY_ID } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import type { World } from '../world/World';
import { SKILLS } from '../economy/items';
import { markerSprite, tendMarker } from '../world/markers';
import { INSTITUTE_BY_KIND } from './catalogue';
import { INSTITUTE_SITES, instituteAt, isBuilding, landScience, standingStage } from './institutions';

/**
 * Draws the institute sites of the lands that are loaded: each town's established institute (its
 * science at its fullest stage), the institutes the travellers have founded at the stage they
 * have reached (with scaffolding round a stage being built), and a signpost on each open site.
 * The buildings themselves come from the 3D side's `buildInstitute` (world/models/institutes.ts).
 */
export class InstitutesView {
  private groups = new Map<string, { grp: THREE.Group; sig: string; marker?: THREE.Sprite }>();

  constructor(private scene: THREE.Scene, private st: GameState, private world: World) {}

  /** Rebuild any site whose look has changed (cheap to call often). */
  update(from?: THREE.Vector3, t = 0): void {
    // Markers high above each institute, so they can be found from across the town.
    if (from) for (const g of this.groups.values()) if (g.marker) tendMarker(g.marker, from, t, false, 30, 900);
    for (const site of INSTITUTE_SITES) {
      const loaded = this.world.isLoaded(site.land);
      const inst = instituteAt(this.st, site.id);
      const sig = !loaded ? '' : site.established ? 'est' : inst ? `${inst.kind}:${standingStage(this.st, inst)}:${isBuilding(this.st, inst)}` : 'open';
      const have = this.groups.get(site.id);
      if (have && have.sig === sig) continue;
      if (have) {
        this.scene.remove(have.grp);
        if (have.marker) this.scene.remove(have.marker);
        have.grp.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
        this.groups.delete(site.id);
        this.world.setColliders(`inst:${site.id}`, []);
      }
      if (!sig) continue;
      const g = new GeoBuilder(), glow = new GeoBuilder(), y = surfaceAt(site.x, site.z);
      const c: Ctx = { g, glow, rng: new Rng(`inst:${site.id}`), s: REGION_BY_ID[site.land] };
      let r = 0, h = 0;
      if (site.established) {
        const fp = buildInstitute(c, landScience(site.land), 3);
        r = fp.r; h = fp.h;
      } else if (inst) {
        const stage = standingStage(this.st, inst);
        if (stage >= 0) { const fp = buildInstitute(c, inst.kind, stage as 0 | 1 | 2 | 3); r = fp.r; h = fp.h; }
        if (isBuilding(this.st, inst)) {
          // Scaffolding and stacked timber round the stage going up.
          const R = INSTITUTE_BY_KIND[inst.kind].stages[inst.stage].radius;
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(g, 0.08, 0.08, 6 + inst.stage * 2, '#8a6444', Math.cos(a) * R, 0, Math.sin(a) * R, 4); }
          for (let i = 0; i < 5; i++) box(g, 3, 0.25, 0.3, '#a8703f', R * 0.7, i * 0.26, R * 0.9);
          r = Math.max(r, 2);
        }
      } else {
        // An open site: corner stakes and a signpost at the front.
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.1, 0.1, 1, '#8a6444', sx * 19, 0, sz * 19, 4);
        cyl(g, 0.08, 0.08, 2, '#6b4a2a', 0, 0, 17, 5);
        box(g, 1.6, 0.8, 0.1, '#e8c48a', 0, 1.6, 17);
      }
      const grp = new THREE.Group();
      const m1 = g.build(this.world.solid), m2 = glow.build(this.world.glow);
      if (m1) { m1.castShadow = true; m1.receiveShadow = true; grp.add(m1); }
      if (m2) grp.add(m2);
      grp.position.set(site.x, y, site.z);
      this.scene.add(grp);
      // A marker over every standing institute: the icon of its science, gold for the town's own, blue for yours.
      let marker: THREE.Sprite | undefined;
      const kind = site.established ? landScience(site.land) : inst?.kind;
      if (kind && h > 0) {
        marker = markerSprite(SKILLS[INSTITUTE_BY_KIND[kind].skill].icon, site.established ? '#e0b43c' : '#4f8fe8');
        marker.position.set(site.x, y + h + 8, site.z);
        this.scene.add(marker);
      }
      this.groups.set(site.id, { grp, sig, marker });
      if (r > 0) this.world.setColliders(`inst:${site.id}`, [{ x: site.x, z: site.z, r: r * 0.85, h: y + h }]);
    }
  }
}
