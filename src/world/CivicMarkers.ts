import * as THREE from 'three';
import { markerSprite, tendMarker } from './markers';
import { CIVIC_LABEL, civicOf } from './neighbourhood';
import { REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { surfaceAt } from './terrain';

/**
 * Pointers over each town's place of worship and market (owner: "give these pointers"): a badge
 * high over each, seen from anywhere in the town — green for a place of worship, amber for a
 * market — hidden close up. Built for the land you are in.
 */
export class CivicMarkers {
  readonly group = new THREE.Group();
  private land: RegionId | null = null;

  update(t: number, land: RegionId, from: THREE.Vector3): void {
    if (land !== this.land) {
      this.land = land;
      this.group.clear();
      const c = regionCenter(REGION_BY_ID[land]);
      for (const q of civicOf(land)) {
        const [icon] = CIVIC_LABEL[land][q.kind];
        const s = markerSprite(icon, q.kind === 'worship' ? '#2f9a6a' : '#e8943a');
        const x = c.x + q.x, z = c.z + q.z;
        s.position.set(x, surfaceAt(x, z, 1e9) + (q.kind === 'worship' ? 24 : 14), z);
        this.group.add(s);
      }
    }
    for (const s of this.group.children) tendMarker(s as THREE.Sprite, from, t, false, 16, 420);
  }
}
