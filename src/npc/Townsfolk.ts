import * as THREE from 'three';
import { CharacterModel } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import { OUTFITS } from '../characters/outfits';
import { dressGroup, type DressGroup } from '../characters/wardrobe';
import { Rng } from '../core/rng';
import type { RegionInstance } from '../world/RegionBuilder';
import { REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';

/**
 * Townsfolk: people going about their day so every town feels lived in. They stroll the avenues
 * and the ring road (so they never walk through houses) or stand chatting in pairs — a
 * respectful step apart. They wear their own land's clothes, never the travellers' own outfits.
 */

/** The wardrobe shelf each land's people dress from. */
export const LAND_SHELF: Record<RegionId, DressGroup> = {
  japan: 'east', korea: 'east', china: 'east',
  indianorth: 'south', indiasouth: 'south', mughal: 'south', indonesia: 'south',
  islamic: 'west-asia', middleeast: 'west-asia', desert: 'west-asia', egypt: 'west-asia',
  norway: 'europe', switzerland: 'europe', london: 'europe', newyork: 'europe', renaissance: 'europe',
  vintage: 'europe', aurora: 'europe', meadow: 'europe', skyisles: 'fantasy',
};

/** The travellers' own clothes: nobody else wears them. */
export const HERO_ONLY = new Set(['g-kurti-jeans', 'b-kurta-jeans', 'g-starlight-gown', 'b-celebration']);

const SKINS = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a', '#6b4630'];

/** Outfits a land's people may wear. */
export function wardrobeFor(land: RegionId, who: 'girl' | 'boy'): Outfit[] {
  const shelf = LAND_SHELF[land];
  const all = Object.values(OUTFITS).filter((o) => o.who === who && !HERO_ONLY.has(o.id) && !o.id.startsWith('fx-'));
  const own = all.filter((o) => dressGroup(o) === shelf);
  return own.length >= 3 ? own : all;
}

type Path =
  | { kind: 'avenue'; axis: 'x' | 'z'; lane: number; s: number; dir: number }
  | { kind: 'ring'; a: number; dir: number }
  | { kind: 'chat'; x: number; z: number; face: number };

interface Walker { model: CharacterModel; land: RegionId; path: Path; speed: number; ph: number }

export const PER_TOWN = 14;

export class Townsfolk {
  readonly list: Walker[] = [];

  constructor(private scene: THREE.Scene) {}

  onRegionLoaded(inst: RegionInstance): void {
    const land = inst.spec.id;
    if (land === 'skyisles') return;
    const rng = new Rng(`townsfolk:${land}`);
    for (let i = 0; i < PER_TOWN; i++) {
      const who = i % 2 ? 'boy' : 'girl';
      const pool = wardrobeFor(land, who);
      const model = new CharacterModel(pool[rng.int(0, pool.length - 1)], SKINS[rng.int(0, SKINS.length - 1)], who === 'girl' ? rng.range(0.9, 0.98) : rng.range(0.98, 1.06));
      let path: Path;
      if (i < 8) path = { kind: 'avenue', axis: i % 2 ? 'x' : 'z', lane: (i % 4 < 2 ? 1 : -1) * 3.2, s: rng.range(-220, 220), dir: rng.chance(0.5) ? 1 : -1 };
      else if (i < 12) path = { kind: 'ring', a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1 };
      else {
        const s = inst.spots.length ? inst.spots[rng.int(0, inst.spots.length - 1)] : { x: 30, z: 30 };
        path = { kind: 'chat', x: s.x + (i % 2) * 1.6, z: s.z, face: i % 2 ? -Math.PI / 2 : Math.PI / 2 };
      }
      this.scene.add(model.root);
      this.list.push({ model, land, path, speed: rng.range(1.0, 1.5), ph: rng.range(0, 10) });
    }
  }

  onRegionUnloaded(inst: RegionInstance): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].land !== inst.spec.id) continue;
      this.scene.remove(this.list[i].model.root);
      this.list.splice(i, 1);
    }
  }

  update(dt: number, t: number, player: THREE.Vector3): void {
    const c = new THREE.Vector3();
    for (const w of this.list) {
      const centre = regionCenter(REGION_BY_ID[w.land]);
      let x: number, z: number, heading: number, speed = w.speed;
      const p = w.path;
      if (p.kind === 'avenue') {
        p.s += p.dir * w.speed * dt;
        if (Math.abs(p.s) > 225) p.dir *= -1;
        // Step round the central plaza.
        const around = Math.abs(p.s) < 52 ? Math.sqrt(52 * 52 - p.s * p.s) * Math.sign(p.lane) : p.lane;
        if (p.axis === 'z') { x = around; z = p.s; heading = p.dir > 0 ? 0 : Math.PI; } else { x = p.s; z = around; heading = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      } else if (p.kind === 'ring') {
        p.a += (p.dir * w.speed * dt) / 140;
        x = Math.cos(p.a) * 140;
        z = Math.sin(p.a) * 140;
        heading = Math.atan2(-Math.sin(p.a) * p.dir, Math.cos(p.a) * p.dir);
      } else {
        x = p.x; z = p.z; heading = p.face; speed = 0;
      }
      c.set(centre.x + x, 0, centre.z + z);
      const far = Math.hypot(c.x - player.x, c.z - player.z) > 170;
      w.model.root.visible = !far;
      if (far) continue;
      c.y = surfaceAt(c.x, c.z, 1e9);
      w.model.root.position.copy(c);
      w.model.root.rotation.y = heading;
      w.model.update(dt, { speed, airborne: false, riding: false, t: t + w.ph });
    }
  }
}

