import * as THREE from 'three';
import { markerSprite, tendMarker } from '../world/markers';
import { CharacterModel } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import { OUTFITS, isChildOutfit } from '../characters/outfits';
import { dressGroup, type DressGroup } from '../characters/wardrobe';
import { Rng } from '../core/rng';
import type { RegionInstance } from '../world/RegionBuilder';
import { regionCenter, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { GeoBuilder, box } from '../world/kit';
import { CrowdMeshes, crowdColours } from './Crowd';
import { CITY_PEOPLE, folkOf } from './folk';

/**
 * Townsfolk: people going about their day so every town feels lived in — up to 300 in a city.
 * They stroll the avenues, the ring road and round the plaza (so they never walk through
 * houses), keep the market stalls, or stand chatting in pairs and circles — a respectful step
 * apart. They wear their own land's clothes, never the travellers' own outfits.
 *
 * Everyone can be stopped and talked to, and many need a hand (folk.ts). To keep 300 cheap,
 * the whole town is drawn as a few instanced meshes (Crowd.ts); only the dozen or so people
 * nearest the travellers are swapped for full, animated figures.
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
export function wardrobeFor(land: RegionId, who: 'girl' | 'boy', child = false): Outfit[] {
  const shelf = LAND_SHELF[land];
  const all = Object.values(OUTFITS).filter((o) => o.who === who && !HERO_ONLY.has(o.id) && !o.id.startsWith('fx-') && isChildOutfit(o) === child);
  if (child) { const own = all.filter((o) => dressGroup(o) === shelf); return own.length ? own : all; }
  const own = all.filter((o) => dressGroup(o) === shelf);
  return own.length >= 3 ? own : all;
}

type Path =
  | { kind: 'avenue'; axis: 'x' | 'z'; lane: number; s: number; dir: number }
  | { kind: 'ring'; a: number; dir: number; lane: number }
  | { kind: 'chat'; x: number; z: number; face: number }
  /** Stallholders at work (arms busy) and shoppers at the stalls. */
  | { kind: 'stall'; x: number; z: number; face: number; working: boolean }

  /** Strolling round the central plaza. */
  | { kind: 'plaza'; r: number; a: number; dir: number };

/** One person in town. `model` is set only while they are near enough to be a full figure. */
export interface Walker {
  land: RegionId;
  idx: number;
  who: 'girl' | 'boy';
  outfit: Outfit;
  skin: string;
  scale: number;
  path: Path;
  speed: number;
  ph: number;
  /** Stopped to talk with the travellers until this time, facing `faceAt`. */
  faceUntil: number;
  faceAt: number;
  /** World position and facing, updated every frame. */
  x: number; y: number; z: number; heading: number; moving: boolean;
  model: CharacterModel | null;
}

/** Everyone in a town — all of them can be talked to. */
export const PER_TOWN = CITY_PEOPLE;
/** Groups of three chatting at the edges of the plaza and by the ring road. */
export const CHAT_GROUPS = 12;
/** How many people are drawn as full figures at once (the nearest), and from how far. */
export const FULL_FIGURES = 14;
export const FULL_RANGE = 34;
/** Towns further than this from the travellers are not drawn or animated at all. */
export const TOWN_VIEW = 430;

/** How a town's people are spread over its streets (counts; the rest stroll the avenues). */
export const ROLES = { stall: 6, shopper: 4, pair: 12, circle: CHAT_GROUPS * 3, ring: 60, plaza: 60 } as const;

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
  private towns = new Map<RegionId, { people: Walker[]; crowd: CrowdMeshes; cx: number; cz: number }>();
  /** Full figures built for people, kept a while so walking back and forth does not rebuild them. */
  private models = new Map<string, CharacterModel>();
  private t = 0;
  private lodClock = 0;

  constructor(private scene: THREE.Scene) {}

  onRegionLoaded(inst: RegionInstance): void {
    const land = inst.spec.id;
    if (land === 'skyisles' || this.towns.has(land)) return;
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
    const crowd = new CrowdMeshes(this.scene, PER_TOWN, new THREE.Vector3(c.x, 0, c.z), 260);
    const people = townPeople(land, inst.spots, rng);
    people.forEach((w, i) => crowd.paint(i, crowdColours(w.outfit, w.skin, HAIR[(i * 5 + land.length) % HAIR.length])));
    crowd.finishPaint();
    for (const w of people) {
      if (w.path.kind === 'chat' && w.idx >= ROLES.stall + ROLES.shopper + ROLES.pair && (w.idx - ROLES.stall - ROLES.shopper - ROLES.pair) % 3 === 0) {
        this.talkers.push({ land, x: (w.path as { x: number }).x, z: (w.path as { z: number }).z, ph: w.ph });
      }
    }
    this.list.push(...people);
    this.towns.set(land, { people, crowd, cx: c.x, cz: c.z });
  }

  onRegionUnloaded(inst: RegionInstance): void {
    const land = inst.spec.id;
    for (let i = this.talkers.length - 1; i >= 0; i--) if (this.talkers[i].land === land) this.talkers.splice(i, 1);
    const m = this.stalls.get(land);
    if (m) {
      this.scene.remove(m);
      m.geometry.dispose();
      this.stalls.delete(land);
    }
    const town = this.towns.get(land);
    if (town) {
      town.crowd.dispose();
      this.towns.delete(land);
    }
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].land === land) this.list.splice(i, 1);
    for (const [k, model] of this.models) if (k.startsWith(land + ':')) { this.scene.remove(model.root); this.models.delete(k); }
  }

  /** How many people live in a loaded town. */
  count(land: RegionId): number {
    return this.towns.get(land)?.people.length ?? 0;
  }

  /** How many are full figures right now (the rest are drawn instanced). */
  get fullFigures(): number {
    return this.list.filter((w) => w.model).length;
  }

  /** The nearest person you could talk to, within reach — anyone in town. */
  nearest(p: THREE.Vector3, r: number): Walker | null {
    let best: Walker | null = null, bd = r;
    for (const town of this.towns.values()) {
      if (Math.hypot(town.cx - p.x, town.cz - p.z) > 300) continue;
      for (const w of town.people) {
        const d = Math.hypot(w.x - p.x, w.z - p.z);
        if (d < bd && Math.abs(w.y - p.y) < 3) { bd = d; best = w; }
      }
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
    w.faceAt = Math.atan2(p.x - w.x, p.z - w.z);
  }

  /** People waiting for you to bring something (npc/folk.ts errands): they stand still, marked ❗. */
  private errandMarks = new Map<string, THREE.Sprite>();

  update(dt: number, t: number, player: THREE.Vector3, errands: ReadonlyArray<{ key: string; x: number; z: number }> = []): void {
    this.t = t;
    const waiting = new Map(errands.map((e) => [e.key, e]));
    for (const [k, s] of this.errandMarks) if (!waiting.has(k)) { this.scene.remove(s); this.errandMarks.delete(k); }
    for (const e of errands) {
      let s = this.errandMarks.get(e.key);
      if (!s) { s = markerSprite('❗', '#ff9a1f'); this.scene.add(s); this.errandMarks.set(e.key, s); }
      s.position.set(e.x, surfaceAt(e.x, e.z, 1e9) + 2.7, e.z);
      tendMarker(s, player, t, true, 4, 600);
    }
    this.lodClock -= dt;
    const relod = this.lodClock <= 0;
    if (relod) this.lodClock = 0.25;
    const want = new Set<Walker>();
    for (const town of this.towns.values()) {
      const near = Math.hypot(town.cx - player.x, town.cz - player.z) < TOWN_VIEW;
      town.crowd.visible = near;
      if (!near) continue;
      for (const w of town.people) {
        const e = waiting.get(`${w.land}:${w.idx}`);
        if (e && t >= w.faceUntil) {
          // Waiting where they asked, looking out for you.
          w.x = e.x; w.z = e.z; w.y = surfaceAt(e.x, e.z, 1e9); w.moving = false;
          w.heading = Math.atan2(player.x - e.x, player.z - e.z);
        } else step(w, dt, t, town.cx, town.cz);
      }
      if (relod) {
        const close = town.people
          .map((w) => [w, Math.hypot(w.x - player.x, w.z - player.z)] as const)
          .filter(([w, d]) => d < (w.model ? FULL_RANGE + 4 : FULL_RANGE))
          .sort((a, b) => a[1] - b[1]);
        for (const [w] of close) if (want.size < FULL_FIGURES) want.add(w);
      }
    }
    if (relod) this.assignFigures(want);
    for (const town of this.towns.values()) {
      if (!town.crowd.meshes[0].visible) continue;
      town.people.forEach((w, i) => {
        if (w.model) {
          town.crowd.hide(i);
          const m = w.model;
          m.root.position.set(w.x, w.y, w.z);
          m.root.rotation.y = w.heading;
          animate(w, t);
          m.update(dt, { speed: w.moving ? w.speed : 0, airborne: false, riding: false, t: t + w.ph });
        } else {
          const bob = w.moving ? Math.abs(Math.sin(t * w.speed * 5 + w.ph)) * 0.04 : 0;
          const sway = w.moving ? Math.sin(t * w.speed * 5 + w.ph) * 0.04 : Math.sin(t * 0.7 + w.ph) * 0.03;
          town.crowd.place(i, w.x, w.y + bob, w.z, w.heading, sway, w.scale);
        }
      });
      town.crowd.commit();
    }
  }

  /** Swap full figures in for the nearest people, and back out for those who walked away. */
  private assignFigures(want: Set<Walker>): void {
    for (const w of this.list) {
      if (w.model && !want.has(w)) {
        w.model.root.visible = false;
        w.model = null;
      }
    }
    for (const w of want) {
      if (w.model) continue;
      const key = `${w.land}:${w.idx}`;
      let m = this.models.get(key);
      if (!m) {
        // Keep the cache small: drop models nobody is using.
        if (this.models.size >= FULL_FIGURES * 3) {
          for (const [k, old] of this.models) {
            if (old.root.visible) continue;
            this.scene.remove(old.root);
            this.models.delete(k);
            if (this.models.size < FULL_FIGURES * 2) break;
          }
        }
        m = new CharacterModel(w.outfit, w.skin, w.scale);
        this.scene.add(m.root);
        this.models.set(key, m);
      }
      m.root.visible = true;
      w.model = m;
    }
  }
}

const HAIR = ['#2a1f1a', '#4a3226', '#6b4a2a', '#1f1a1a', '#8a6a4a', '#3a2a1f'];

/** Everyone in a town and where they spend their day. Deterministic per land. */
export function townPeople(land: RegionId, spots: Array<{ x: number; z: number }>, rng = new Rng(`townsfolk:${land}`)): Walker[] {
  const out: Walker[] = [];
  const R = ROLES;
  let i = 0;
  const add = (path: Path) => {
    const who = i % 2 ? 'boy' : 'girl';
    const pool = wardrobeFor(land, who);
    out.push({
      land, idx: i, who, outfit: pool[rng.int(0, pool.length - 1)], skin: SKINS[rng.int(0, SKINS.length - 1)],
      scale: who === 'girl' ? rng.range(0.9, 0.98) : rng.range(0.98, 1.06),
      path, speed: rng.range(0.9, 1.5), ph: rng.range(0, 10), faceUntil: 0, faceAt: 0,
      x: 0, y: 0, z: 0, heading: 0, moving: false, model: null,
    });
    i++;
  };
  // Stallholders behind each stall, busy with their work; shoppers a step back from the counter.
  for (const st of STALLS) add({ kind: 'stall', x: st.x + Math.sign(st.x) * 1.2, z: st.z, face: st.face, working: true });
  for (let k = 0; k < R.shopper; k++) {
    const st = STALLS[k + 1];
    add({ kind: 'stall', x: st.x - Math.sign(st.x) * 1.9, z: st.z + (k % 2 ? 0.6 : -0.6), face: st.face + Math.PI, working: false });
  }
  // Pairs chatting on the doorsteps and by the lamps, a respectful step apart.
  for (let k = 0; k < R.pair; k++) {
    const s = spots.length ? spots[Math.floor(k / 2) * 7 % spots.length] : { x: 30 + k * 4, z: 30 };
    add({ kind: 'chat', x: s.x + (k % 2) * 1.6, z: s.z, face: k % 2 ? -Math.PI / 2 : Math.PI / 2 });
  }
  // Circles of three friends: half just inside the ring road, half just off the plaza.
  for (let gi = 0; gi < CHAT_GROUPS; gi++) {
    const inner = gi % 2 === 1;
    let ga = (gi / CHAT_GROUPS) * Math.PI * 2 + 0.4;
    // Never on an avenue: keep well away from the two axes.
    if (Math.min(Math.abs(Math.cos(ga)), Math.abs(Math.sin(ga))) < 0.3) ga += 0.4;
    const gr = inner ? 57 : 131;
    const gx = Math.cos(ga) * gr, gz = Math.sin(ga) * gr;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      add({ kind: 'chat', x: gx + Math.cos(a) * 1.1, z: gz + Math.sin(a) * 1.1, face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
    }
  }
  for (let k = 0; k < R.ring; k++) add({ kind: 'ring', a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1, lane: rng.range(-4.5, 4.5) });
  for (let k = 0; k < R.plaza; k++) add({ kind: 'plaza', r: rng.range(30, 47), a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1 });
  // Everyone else walks the avenues on their own lanes, on both sides.
  while (i < PER_TOWN) {
    const lane = (rng.chance(0.5) ? 1 : -1) * rng.range(1.4, 6);
    add({ kind: 'avenue', axis: i % 2 ? 'x' : 'z', lane, s: rng.range(-225, 225), dir: rng.chance(0.5) ? 1 : -1 });
  }
  for (const w of out) step(w, 0, 0, 0, 0, false);
  return out;
}

/** Walk one person along their path (local to the town centre cx, cz). */
function step(w: Walker, dt: number, t: number, cx: number, cz: number, ground = true): void {
  const p = w.path;
  let x: number, z: number, heading: number, moving = true;
  if (t < w.faceUntil) {
    // Talking with the travellers: stand still and face them.
    w.heading = w.faceAt;
    w.moving = false;
    return;
  }
  if (p.kind === 'avenue') {
    p.s += p.dir * w.speed * dt;
    if (Math.abs(p.s) > 228) p.dir *= -1;
    // Step round the central plaza.
    const around = Math.abs(p.s) < 53 ? Math.sqrt(53 * 53 - p.s * p.s) * Math.sign(p.lane) + p.lane * 0.3 : p.lane;
    if (p.axis === 'z') { x = around; z = p.s; heading = p.dir > 0 ? 0 : Math.PI; } else { x = p.s; z = around; heading = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  } else if (p.kind === 'ring') {
    const rad = 140 + p.lane;
    p.a += (p.dir * w.speed * dt) / rad;
    x = Math.cos(p.a) * rad;
    z = Math.sin(p.a) * rad;
    heading = Math.atan2(-Math.sin(p.a) * p.dir, Math.cos(p.a) * p.dir);
  } else if (p.kind === 'plaza') {
    p.a += (p.dir * w.speed * 0.8 * dt) / p.r;
    x = Math.cos(p.a) * p.r;
    z = Math.sin(p.a) * p.r;
    heading = Math.atan2(-Math.sin(p.a) * p.dir, Math.cos(p.a) * p.dir);
  } else {
    x = p.x; z = p.z; heading = p.face; moving = false;
  }
  w.x = cx + x;
  w.z = cz + z;
  // Standing people never move: their ground height is found once.
  if (ground && (moving || w.y === 0)) w.y = surfaceAt(w.x, w.z, 1e9);
  w.heading = heading;
  w.moving = moving;
}

/** Hands: stallholders work, friends talk with their hands, and so does anyone talking to you. */
function animate(w: Walker, t: number): void {
  const m = w.model!, p = w.path;
  if (t < w.faceUntil) {
    m.offer = Math.max(0, Math.sin(t * 0.9 + w.ph)) * 0.4;
    m.offerLift = Math.sin(t * 4 + w.ph) * 0.25;
  } else if (p.kind === 'stall') {
    m.offer = p.working ? 0.7 : 0;
    m.offerLift = p.working ? Math.sin(t * 3 + w.ph) * 0.35 : 0;
  } else if (p.kind === 'chat') {
    m.offer = Math.max(0, Math.sin(t * 0.7 + w.ph)) * 0.5;
    m.offerLift = Math.sin(t * 4 + w.ph) * 0.3;
  } else {
    m.offer = 0;
  }
}
