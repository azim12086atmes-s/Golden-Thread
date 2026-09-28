import * as THREE from 'three';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';

/**
 * Her friends at the celebration (owner's list), who circle round her while the cake is cut, as
 * though she were the bride. Heights are set against the two travellers':
 *   Musadiq taller than Azim; Farzan as tall as Azim; Zaid taller than Fathima, shorter than Azim;
 *   Zidane taller than Zaid; Varna taller than Fathima, shorter than Zaid; Srushti, Shifa and the
 *   twins Shruti and Smruti as tall as Fathima.
 * `rise` places each between her height (0) and his (1); above 1 is taller than him.
 */
export interface Friend { name: string; who: 'girl' | 'boy'; outfit: string; skin: string; rise: number }

export const FRIENDS: Friend[] = [
  { name: 'Musadiq', who: 'boy', outfit: 'b-sherwani', skin: '#c99a74', rise: 1.35 },
  { name: 'Farzan', who: 'boy', outfit: 'b-bandhgala', skin: '#d8a87e', rise: 1 },
  { name: 'Zaid', who: 'boy', outfit: 'b-kurta', skin: '#b98760', rise: 0.5 },
  { name: 'Zidane', who: 'boy', outfit: 'b-nehru', skin: '#c48f68', rise: 0.75 },
  { name: 'Varna', who: 'girl', outfit: 'g-anarkali', skin: '#d9a47c', rise: 0.25 },
  { name: 'Srushti', who: 'girl', outfit: 'g-ghagra', skin: '#e0ac85', rise: 0 },
  { name: 'Shruti', who: 'girl', outfit: 'g-phulkari', skin: '#dba27a', rise: 0 },
  { name: 'Smruti', who: 'girl', outfit: 'g-phulkari', skin: '#dba27a', rise: 0 },
  { name: 'Shifa', who: 'girl', outfit: 'g-farshi', skin: '#e3b58f', rise: 0 },
];

/** A friend's model scale: between hers and his by `rise`. */
export const friendScale = (f: Friend): number => HERO_SCALE.girl + (HERO_SCALE.boy - HERO_SCALE.girl) * f.rise;

/** How far from her they walk: clear of him (1.95 m), the table and her wings' folded reach. */
export const RING_R = 3.6;

/** The ring of friends walking round her, cheering. */
export class FriendsRing {
  readonly group = new THREE.Group();
  private models: CharacterModel[];

  constructor() {
    this.models = FRIENDS.map((f) => {
      const m = new CharacterModel(OUTFITS[f.outfit], f.skin, friendScale(f));
      this.group.add(m.root);
      return m;
    });
  }

  /** Walk round `centre` (her), `k` 0..1 how fully they are walking (they ease in and out). */
  update(dt: number, t: number, centre: THREE.Vector3, ground: (x: number, z: number) => number, k: number): void {
    const n = this.models.length, speed = 1.1 * k;
    this.models.forEach((m, i) => {
      const a = (i / n) * Math.PI * 2 + (t * speed) / RING_R;
      const x = centre.x + Math.cos(a) * RING_R, z = centre.z + Math.sin(a) * RING_R;
      m.root.position.set(x, ground(x, z), z);
      // Facing along the ring, turning in towards her as they slow.
      const along = Math.atan2(-Math.sin(a), Math.cos(a)), inward = Math.atan2(centre.x - x, centre.z - z);
      m.root.rotation.y = inward + Math.atan2(Math.sin(along - inward), Math.cos(along - inward)) * k;
      m.twirl = 0.25 + 0.2 * Math.sin(t * 3 + i);
      m.update(dt, { speed, airborne: false, riding: false, t: t + i });
    });
  }

  /** The nearest any of them comes to a point (for folding her wings). */
  nearest(p: THREE.Vector3): number {
    let d = Infinity;
    for (const m of this.models) d = Math.min(d, Math.hypot(m.root.position.x - p.x, m.root.position.z - p.z));
    return d;
  }
}
