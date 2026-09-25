import * as THREE from 'three';
import { CharacterModel } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';
import { Rng } from '../core/rng';
import { damp } from '../core/rng';
import type { RegionInstance } from '../world/RegionBuilder';
import { regionCenter } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { PEOPLE, type NpcDef } from './people';

export interface Npc {
  def: NpcDef;
  model: CharacterModel;
  pos: THREE.Vector3;
  home: THREE.Vector3;
  target: THREE.Vector3;
  heading: number;
  speed: number;
  wait: number;
}

/** Residents of the loaded lands: they potter about near home and turn to greet you. */
export class Npcs {
  readonly list: Npc[] = [];

  constructor(private scene: THREE.Scene) {}

  onRegionLoaded(inst: RegionInstance): void {
    const c = regionCenter(inst.spec);
    const rng = new Rng(`npcs:${inst.spec.id}`);
    let k = 0;
    for (const def of PEOPLE.filter((p) => p.region === inst.spec.id)) {
      let lx: number, lz: number;
      if (def.at) [lx, lz] = def.at;
      else {
        const s = inst.spots.length ? inst.spots[(k++ * 7 + rng.int(0, 5)) % inst.spots.length] : { x: 20 + k * 6, z: 20 };
        lx = s.x; lz = s.z;
      }
      const x = c.x + lx, z = c.z + lz;
      const home = new THREE.Vector3(x, surfaceAt(x, z, 1e9), z);
      const model = new CharacterModel(OUTFITS[def.outfit], def.skin, def.who === 'girl' ? 0.95 : 1.02);
      model.root.position.copy(home);
      this.scene.add(model.root);
      this.list.push({ def, model, pos: home.clone(), home, target: home.clone(), heading: rng.range(0, 6.28), speed: 0, wait: rng.range(0, 4) });
    }
  }

  onRegionUnloaded(inst: RegionInstance): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].def.region === inst.spec.id) {
        this.scene.remove(this.list[i].model.root);
        this.list.splice(i, 1);
      }
    }
  }

  update(dt: number, t: number, player: THREE.Vector3): void {
    for (const n of this.list) {
      const dp = n.pos.distanceTo(player);
      if (dp > 140) continue;
      if (dp < 7) {
        // Stop and turn to greet the travellers.
        n.speed = damp(n.speed, 0, 8, dt);
        const want = Math.atan2(player.x - n.pos.x, player.z - n.pos.z);
        n.heading += wrap(want - n.heading) * Math.min(1, dt * 4);
      } else {
        n.wait -= dt;
        const to = n.target.clone().sub(n.pos).setY(0);
        if (n.wait <= 0 && to.length() < 0.4) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * (n.def.keeper ? 3 : 6);
          n.target.set(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r);
          n.wait = 3 + Math.random() * 6;
        }
        if (to.length() > 0.4) {
          n.speed = damp(n.speed, 1.3, 4, dt);
          n.heading += wrap(Math.atan2(to.x, to.z) - n.heading) * Math.min(1, dt * 5);
          n.pos.x += Math.sin(n.heading) * n.speed * dt;
          n.pos.z += Math.cos(n.heading) * n.speed * dt;
        } else n.speed = damp(n.speed, 0, 6, dt);
      }
      n.pos.y = surfaceAt(n.pos.x, n.pos.z, n.home.y + 2);
      n.model.root.position.copy(n.pos);
      n.model.root.rotation.y = n.heading;
      n.model.update(dt, { speed: n.speed, airborne: false, riding: false, t: t + n.home.x });
    }
  }

  nearest(p: THREE.Vector3, r: number): Npc | undefined {
    let best: Npc | undefined, bd = r;
    for (const n of this.list) {
      const d = n.pos.distanceTo(p);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
}

export function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
