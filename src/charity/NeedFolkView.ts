import * as THREE from 'three';
import { CharacterModel } from '../characters/CharacterModel';
import type { GameState } from '../core/state';
import { wardrobeFor } from '../npc/Townsfolk';
import { surfaceAt } from '../world/terrain';
import type { World } from '../world/World';
import { PEOPLE_IN_NEED, hasMet, needSpot, type Person } from './charity';

const SKINS = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'];

/**
 * The people in need, standing in their towns (charity.ts `needSpot`) for the lands that are
 * loaded. Someone you have not met yet has a soft glow above them, so they can be found in the
 * crowd; once you have talked with them the glow goes and they are in your people finder.
 */
export class NeedFolkView {
  private bodies = new Map<string, { p: Person; model: CharacterModel; mote: THREE.Mesh; ph: number }>();
  private moteMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc4dc').multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.9 });
  private moteGeo = new THREE.OctahedronGeometry(0.16);

  constructor(private scene: THREE.Scene, private st: GameState, private world: World) {}

  update(dt: number, t: number): void {
    for (const p of PEOPLE_IN_NEED) {
      const loaded = this.world.isLoaded(p.land), have = this.bodies.get(p.id);
      if (loaded && !have) this.add(p);
      else if (!loaded && have) {
        this.scene.remove(have.model.root, have.mote);
        this.bodies.delete(p.id);
      }
    }
    for (const b of this.bodies.values()) {
      b.model.update(dt, { speed: 0, airborne: false, riding: false, t: t + b.ph });
      b.mote.visible = !hasMet(this.st, b.p.id);
      b.mote.position.y = b.model.root.position.y + (b.p.kind === 'orphan' ? 1.7 : 2.4) + Math.sin(t * 2 + b.ph) * 0.1;
      b.mote.rotation.y += dt * 1.5;
    }
  }

  private add(p: Person): void {
    const at = needSpot(p), who = p.id.length % 2 ? 'girl' : 'boy', pool = wardrobeFor(p.land, who);
    const scale = p.kind === 'orphan' ? 0.72 : p.kind === 'elder' ? 0.94 : 1;
    const model = new CharacterModel(pool[(p.name.length * 3) % pool.length], SKINS[p.name.length % SKINS.length], scale);
    const y = surfaceAt(at.x, at.z, 1e9);
    model.root.position.set(at.x, y, at.z);
    // Facing the avenue they stand beside.
    model.root.rotation.y = this.faceRoad(at.x, at.z);
    const mote = new THREE.Mesh(this.moteGeo, this.moteMat);
    mote.position.set(at.x, y + 2.4, at.z);
    this.scene.add(model.root, mote);
    this.bodies.set(p.id, { p, model, mote, ph: p.name.length });
  }

  /** Turn to face the nearest avenue (they stand on its pavement). */
  private faceRoad(x: number, z: number): number {
    const lx = x - Math.round(x / 700) * 700, lz = z - Math.round(z / 700) * 700;
    return Math.abs(lx) < Math.abs(lz) ? (lx > 0 ? -Math.PI / 2 : Math.PI / 2) : lz > 0 ? Math.PI : 0;
  }

  /** The person in need within reach of a point, if any. */
  nearest(x: number, z: number, r: number): Person | null {
    let best: Person | null = null, bd = r;
    for (const b of this.bodies.values()) {
      const d = Math.hypot(b.model.root.position.x - x, b.model.root.position.z - z);
      if (d < bd) { bd = d; best = b.p; }
    }
    return best;
  }
}
