import * as THREE from 'three';
import type { GameState } from '../core/state';
import { damp } from '../core/rng';
import { PLOT_BY_ID, PLOT_SIZE } from '../housing/housing';
import { wrap } from '../npc/Npcs';
import type { RegionInstance } from '../world/RegionBuilder';
import { regionCenter } from '../world/regions';
import { WATER_Y, surfaceAt } from '../world/terrain';
import { AnimalModel, SPECIES, type SpeciesId } from './AnimalModel';

export interface Animal {
  id: string;
  species: SpeciesId;
  model: AnimalModel;
  pos: THREE.Vector3;
  home: THREE.Vector3;
  range: number;
  target: THREE.Vector3;
  heading: number;
  speed: number;
  wait: number;
  region: string;
  /** Kept on the travellers' land. */
  plotId?: string;
}

const NAMES = ['Cloud', 'Pip', 'Saffron', 'Biscuit', 'Nimbus', 'Hazel', 'Moss', 'Dune', 'Pearl', 'Maple', 'Sparrow', 'Tamar', 'Juniper', 'Kiwi', 'Luna'];

/** Wild animals of each loaded land, and the friends who live on the travellers' plots. */
export class Animals {
  readonly list: Animal[] = [];

  constructor(private scene: THREE.Scene, private st: GameState) {}

  static nameFor(id: string): string {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return NAMES[h % NAMES.length];
  }

  onRegionLoaded(inst: RegionInstance): void {
    const c = regionCenter(inst.spec);
    const fauna = inst.spec.fauna as SpeciesId[];
    const n = Math.min(12, inst.wild.length);
    for (let i = 0; i < n; i++) {
      const id = `${inst.spec.id}:${i}`;
      if (this.st.animals[id]?.plotId) continue; // lives on a plot now
      const species = fauna[i % fauna.length];
      const w = inst.wild[(i * 5) % inst.wild.length];
      const x = c.x + w.x, z = c.z + w.z;
      if (surfaceAt(x, z) <= WATER_Y + 0.05 && species !== 'unicorn') continue;
      this.spawn(id, species, x, z, 14, inst.spec.id);
    }
    // Friends kept on plots in this land.
    for (const [id, a] of Object.entries(this.st.animals)) {
      if (!a.plotId) continue;
      const plot = PLOT_BY_ID[a.plotId];
      if (plot?.region !== inst.spec.id || this.list.some((x) => x.id === id)) continue;
      this.spawn(id, a.species as SpeciesId, plot.x, plot.z, PLOT_SIZE / 2 - 2, inst.spec.id, a.plotId);
    }
  }

  spawn(id: string, species: SpeciesId, x: number, z: number, range: number, region: string, plotId?: string): Animal {
    const model = new AnimalModel(species, species === 'elephant' ? 0.9 : 1);
    const home = new THREE.Vector3(x, surfaceAt(x, z, 1e9), z);
    model.root.position.copy(home);
    this.scene.add(model.root);
    const a: Animal = { id, species, model, pos: home.clone(), home, range, target: home.clone(), heading: Math.random() * 6.28, speed: 0, wait: Math.random() * 3, region, plotId };
    this.list.push(a);
    return a;
  }

  /** Move a befriended animal to a plot. */
  relocate(id: string, plotId: string): void {
    const i = this.list.findIndex((a) => a.id === id);
    if (i >= 0) {
      this.scene.remove(this.list[i].model.root);
      this.list.splice(i, 1);
    }
    const plot = PLOT_BY_ID[plotId];
    const a = this.st.animals[id];
    if (plot && a) this.spawn(id, a.species as SpeciesId, plot.x, plot.z, PLOT_SIZE / 2 - 2, plot.region, plotId);
  }

  onRegionUnloaded(inst: RegionInstance): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].region === inst.spec.id) {
        this.scene.remove(this.list[i].model.root);
        this.list.splice(i, 1);
      }
    }
  }

  update(dt: number, t: number, player: THREE.Vector3): void {
    for (const a of this.list) {
      if (a.pos.distanceTo(player) > 160) continue;
      const friend = this.st.animals[a.id]?.befriended;
      const near = a.pos.distanceTo(player);
      a.wait -= dt;
      // Wild animals keep a shy distance until befriended; friends come a little closer.
      if (!friend && near < 3.5 && !a.plotId) {
        const away = a.pos.clone().sub(player).setY(0).normalize();
        a.target.copy(a.pos).addScaledVector(away, 4);
        a.wait = 1;
      }
      const to = a.target.clone().sub(a.pos).setY(0);
      if (a.wait <= 0 && to.length() < 0.5) {
        const ang = Math.random() * 6.28, r = Math.random() * a.range;
        const half = PLOT_SIZE / 2 - 2;
        let tx = a.home.x + Math.cos(ang) * r, tz = a.home.z + Math.sin(ang) * r;
        if (a.plotId) { tx = clampTo(tx, a.home.x, half); tz = clampTo(tz, a.home.z, half); }
        a.target.set(tx, 0, tz);
        a.wait = 2 + Math.random() * 7;
      }
      const s = SPECIES[a.species];
      const pace = s.kind === 'bird' ? 1 : Math.min(2.5, 0.8 + s.body[0]);
      if (to.length() > 0.5) {
        a.speed = damp(a.speed, pace, 3, dt);
        a.heading += wrap(Math.atan2(to.x, to.z) - a.heading) * Math.min(1, dt * 3);
        a.pos.x += Math.sin(a.heading) * a.speed * dt;
        a.pos.z += Math.cos(a.heading) * a.speed * dt;
      } else a.speed = damp(a.speed, 0, 4, dt);
      a.pos.y = surfaceAt(a.pos.x, a.pos.z, a.home.y + 2);
      if (a.species === 'lightbird') a.pos.y += 1.5 + Math.sin(t + a.home.x) * 0.5;
      a.model.root.position.copy(a.pos);
      a.model.root.rotation.y = a.heading;
      a.model.update(dt, a.speed, t);
    }
  }

  nearest(p: THREE.Vector3, r: number): Animal | undefined {
    let best: Animal | undefined, bd = r;
    for (const a of this.list) {
      const d = a.pos.distanceTo(p);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
}

function clampTo(v: number, c: number, h: number): number {
  return Math.max(c - h, Math.min(c + h, v));
}
