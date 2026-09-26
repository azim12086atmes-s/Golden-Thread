import * as THREE from 'three';
import { CharacterModel } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import { OUTFITS } from '../characters/outfits';
import { dressGroup, type DressGroup } from '../characters/wardrobe';
import { Rng } from '../core/rng';
import type { RegionInstance } from '../world/RegionBuilder';
import { REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { GeoBuilder, box } from '../world/kit';
import { Crowd } from './Crowd';
import { CITY_PEOPLE, folkOf } from './folk';

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
  | { kind: 'chat'; x: number; z: number; face: number }
  /** Stallholders at work (arms busy) and shoppers at the stalls. */
  | { kind: 'stall'; x: number; z: number; face: number; working: boolean };

export interface Walker { model: CharacterModel; land: RegionId; idx: number; path: Path; speed: number; ph: number; /** Turned to talk with the travellers until this time. */ faceUntil: number; faceAt: number }

/** Full figures per town — the people you can stop and talk to. The crowd (Crowd.ts) fills the rest of the city's 300. */
export const PER_TOWN = 60;
/** Groups of three chatting at the edges of the plaza and by the ring road. */
export const CHAT_GROUPS = 6;

/**
 * A market street in every town: stalls line both sides of the south avenue, just beyond the
 * central plaza. Local coordinates (relative to the town centre); `face` points at the street.
 */
export const STALLS: Array<{ x: number; z: number; face: number }> = [66, 78, 90].flatMap((z) => [
  { x: 12.5, z, face: -Math.PI / 2 },
  { x: -12.5, z, face: Math.PI / 2 },
]);
const AWNINGS = ['#e8576a', '#f2c14e', '#3a9ec8', '#7fb35a', '#c38fd9', '#ff9a1f'];

export class Townsfolk {
  readonly list: Walker[] = [];
  /** Centres of chatting groups (local to their town), for speech bubbles. */
  readonly talkers: Array<{ land: RegionId; x: number; z: number; ph: number }> = [];
  private stalls = new Map<string, THREE.Mesh>();

  /** The wider crowd: everyone else in town. */
  readonly crowd: Crowd;
  private t = 0;

  constructor(private scene: THREE.Scene) {
    this.crowd = new Crowd(scene, CITY_PEOPLE - PER_TOWN);
  }

  onRegionLoaded(inst: RegionInstance): void {
    const land = inst.spec.id;
    if (land === 'skyisles') return;
    this.crowd.onRegionLoaded(inst);
    const rng = new Rng(`townsfolk:${land}`);
    // The market's stalls: a table, four posts, a striped awning and goods laid out.
    const kit = new GeoBuilder();
    const c = regionCenter(inst.spec);
    STALLS.forEach((st, k) => {
      const out = st.face;
      kit.frame(c.x + st.x, surfaceAt(c.x + st.x, c.z + st.z, 1e9), c.z + st.z, out, 1, () => {
        box(kit, 3, 0.9, 1.2, '#a8703f', 0, 0, 0.4);
        for (const [px, pz] of [[-1.4, -0.3], [1.4, -0.3], [-1.4, 1.0], [1.4, 1.0]]) box(kit, 0.1, 2.4, 0.1, '#6b4a2a', px, 0, pz);
        box(kit, 3.3, 0.08, 1.9, AWNINGS[(k + land.length) % AWNINGS.length], 0, 2.4, 0.35);
        box(kit, 3.3, 0.3, 0.05, '#ffffff', 0, 2.2, 1.3);
        for (let j = 0; j < 6; j++) box(kit, 0.32, 0.22, 0.32, ['#ff6b6b', '#f2d14e', '#7fb35a', '#ffb347', '#c38fd9'][(j + k) % 5], -1.1 + j * 0.44, 0.9, 0.55);
      });
    });
    const stallMesh = kit.build(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
    if (stallMesh) {
      stallMesh.castShadow = true;
      this.scene.add(stallMesh);
      this.stalls.set(land, stallMesh);
    }
    for (let i = 0; i < PER_TOWN; i++) {
      const who = i % 2 ? 'boy' : 'girl';
      const pool = wardrobeFor(land, who);
      const model = new CharacterModel(pool[rng.int(0, pool.length - 1)], SKINS[rng.int(0, SKINS.length - 1)], who === 'girl' ? rng.range(0.9, 0.98) : rng.range(0.98, 1.06));
      let path: Path;
      if (i < 18) path = { kind: 'avenue', axis: i % 2 ? 'x' : 'z', lane: (i % 4 < 2 ? 1 : -1) * 3.2, s: rng.range(-220, 220), dir: rng.chance(0.5) ? 1 : -1 };
      else if (i < 26) path = { kind: 'ring', a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1 };
      else if (i < 32) {
        // A stallholder behind each stall, busy with their work.
        const st = STALLS[i - 26];
        path = { kind: 'stall', x: st.x + Math.sign(st.x) * 1.2, z: st.z, face: st.face, working: true };
      } else if (i < 36) {
        // Shoppers in front of the stalls, a step back from the counter.
        const st = STALLS[(i - 32) * 1 + 1];
        path = { kind: 'stall', x: st.x - Math.sign(st.x) * 1.9, z: st.z + (i % 2 ? 0.6 : -0.6), face: st.face + Math.PI, working: false };
      } else if (i < 42) {
        const s = inst.spots.length ? inst.spots[rng.int(0, inst.spots.length - 1)] : { x: 30, z: 30 };
        path = { kind: 'chat', x: s.x + (i % 2) * 1.6, z: s.z, face: i % 2 ? -Math.PI / 2 : Math.PI / 2 };
      } else {
        // A circle of three friends talking, a step apart, facing each other.
        const gi = Math.floor((i - 42) / 3), k = (i - 42) % 3;
        const ga = (gi / CHAT_GROUPS) * Math.PI * 2 + 0.4;
        // Just inside the ring road, where houses never stand (they keep 14 m from it).
        const gx = Math.cos(ga) * 131, gz = Math.sin(ga) * 131;
        const a = (k / 3) * Math.PI * 2;
        path = { kind: 'chat', x: gx + Math.cos(a) * 1.1, z: gz + Math.sin(a) * 1.1, face: Math.atan2(-Math.cos(a), -Math.sin(a)) };
        this.talkers.push({ land, x: gx, z: gz, ph: rng.range(0, 10) });
      }
      this.scene.add(model.root);
      this.list.push({ model, land, idx: i, path, speed: rng.range(1.0, 1.5), ph: rng.range(0, 10), faceUntil: 0, faceAt: 0 });
    }
  }

  onRegionUnloaded(inst: RegionInstance): void {
    this.crowd.onRegionUnloaded(inst);
    for (let i = this.talkers.length - 1; i >= 0; i--) if (this.talkers[i].land === inst.spec.id) this.talkers.splice(i, 1);
    const m = this.stalls.get(inst.spec.id);
    if (m) {
      this.scene.remove(m);
      m.geometry.dispose();
      this.stalls.delete(inst.spec.id);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].land !== inst.spec.id) continue;
      this.scene.remove(this.list[i].model.root);
      this.list.splice(i, 1);
    }
  }

  /** The nearest person you could talk to, within reach. */
  nearest(p: THREE.Vector3, r: number): Walker | null {
    let best: Walker | null = null, bd = r;
    for (const w of this.list) {
      if (!w.model.root.visible) continue;
      const d = Math.hypot(w.model.root.position.x - p.x, w.model.root.position.z - p.z);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  /** Their name, what they say today, and whether they need a hand. */
  who(w: Walker, day: number) {
    return folkOf(w.land, w.idx, day);
  }

  /** They stop and turn to the travellers for a while. */
  turnTo(w: Walker, p: THREE.Vector3): void {
    w.faceUntil = this.t + 8;
    w.faceAt = Math.atan2(p.x - w.model.root.position.x, p.z - w.model.root.position.z);
  }

  update(dt: number, t: number, player: THREE.Vector3): void {
    this.t = t;
    this.crowd.update(dt, t, player);
    const c = new THREE.Vector3();
    for (const w of this.list) {
      if (t < w.faceUntil) {
        // Talking with the travellers: stand still, face them, hands a little animated.
        w.model.root.rotation.y = w.faceAt;
        w.model.offer = Math.max(0, Math.sin(t * 0.9 + w.ph)) * 0.4;
        w.model.offerLift = Math.sin(t * 4 + w.ph) * 0.25;
        w.model.update(dt, { speed: 0, airborne: false, riding: false, t: t + w.ph });
        continue;
      }
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
      } else if (p.kind === 'stall') {
        x = p.x; z = p.z; heading = p.face; speed = 0;
        // Stallholders' hands are busy — weighing, wrapping, kneading.
        w.model.offer = p.working ? 0.7 : 0;
        w.model.offerLift = p.working ? Math.sin(t * 3 + w.ph) * 0.35 : 0;
      } else {
        x = p.x; z = p.z; heading = p.face; speed = 0;
        // People talking use their hands.
        const talk = Math.max(0, Math.sin(t * 0.7 + w.ph));
        w.model.offer = talk * 0.5;
        w.model.offerLift = Math.sin(t * 4 + w.ph) * 0.3;
      }
      c.set(centre.x + x, 0, centre.z + z);
      const far = Math.hypot(c.x - player.x, c.z - player.z) > 150;
      w.model.root.visible = !far;
      if (far) continue;
      c.y = surfaceAt(c.x, c.z, 1e9);
      w.model.root.position.copy(c);
      w.model.root.rotation.y = heading;
      w.model.update(dt, { speed, airborne: false, riding: false, t: t + w.ph });
    }
  }
}

