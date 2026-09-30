import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';
import type { Game } from '../Game';
import { wardrobeFor } from '../npc/Townsfolk';
import { REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { Carpet } from './Carpet';
import { Dragon, DRAGON_SCALE } from '../event/Dragon';
import { outfitOf } from './dress';
import { DIMS } from '../characters/CharacterModel';
import { BUNKS, PET_BEDS, RIDE_CHILD_SEATS, VAN } from '../vehicles/vanLayout';

/** Children are drawn at this scale of an adult. */
const CHILD_SCALE = 0.62;
import { arrivalsIn, bringHome, CARPET_L, CARPET_W, CHILDREN, COMPANION_BY_ID, MAX_CHILDREN, PET_CARPET_BACK, TRAVELLER_CLEARANCE, CARPET_SIDE, caravanStep, canJoin, balloonFor, carpetTarget, offerFood, strayHome, PETS, type CompanionDef, type Member, type PetDef } from './caravan';

/**
 * The caravan in the world: their brothers and sisters, the children and pets travelling with the
 * two, walking behind them
 * (children close, pets ranging wider), always keeping clear space around the travellers and
 * each other (caravan.ts proves it). When the travellers take a ground vehicle they ride along
 * and reappear beside them on foot. Whenever the two fly — on the cape, the dragon, the plane or
 * a winged unicorn — the children and pets ride a flying carpet beside them, the brothers and sisters
 * a second carpet just behind it, and they step off where it lands. On the Night Dragon the White
 * Dragon flies beside them instead, the children each in a saddle of their own on her back, and
 * the pets' carpet follows behind her.
 */
interface Body { def: CompanionDef; member: Member; child?: CharacterModel; pet?: AnimalModel; ph: number }
/** A land's pet waiting at the plaza to be met. */
interface Stray { def: PetDef; model: AnimalModel; x: number; z: number; ph: number }

type CarpetState = 'off' | 'flying' | 'landing';

export class CaravanView {
  private bodies: Body[] = [];
  private strays = new Map<string, Stray>();
  private carpet = new Carpet();
  /** The brothers' and sisters' own carpet, flying just behind the first. */
  private carpet2 = new Carpet();
  private carpetState: CarpetState = 'off';
  /** The Light Fury, carrying the children whenever the two ride the Night Dragon (built when first needed). */
  private light: Dragon | null = null;
  /** Whether she flies with them this time (they took off on the Night Dragon). */
  private lightOn = false;
  private carpetHeading = 0;
  private tmp = new THREE.Vector3();

  constructor(private g: Game) {
    this.carpet.root.visible = false;
    this.carpet2.root.visible = false;
    g.scene.add(this.carpet.root, this.carpet.trail, this.carpet2.root, this.carpet2.trail);
    for (const id of g.st.caravan) this.add(id);
    // Children go home when the caravan reaches their destination.
    g.bus.on('region:entered', ({ regionId }) => {
      for (const c of arrivalsIn(g.st.caravan, regionId)) {
        const line = bringHome(g.st, c.id, REGION_BY_ID[regionId as RegionId].name);
        if (line) { this.remove(c.id); g.toast(line, 'story'); }
      }
    });
    // Children from a land ask to join once its chapter is done (with their family's blessing).
    g.bus.on('quest:completed', ({ questId }) => {
      if (!questId.startsWith('main-')) return;
      const land = questId.slice(5);
      for (const c of CHILDREN) {
        if (c.joinsAfter !== land || g.st.caravan.includes(c.id)) continue;
        const current = g.st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
        const done = Object.keys(g.st.quests).filter((q) => q.startsWith('main-') && g.st.quests[q].status === 'done').map((q) => q.slice(5)) as CompanionDef['origin'][];
        const ok = canJoin(c, current, done, []);
        if (ok.ok) {
          g.st.caravan.push(c.id);
          this.add(c.id);
          g.toast(`🧒 ${c.name} joins the caravan — ${c.journey}`, 'story');
        } else if (current.filter((x) => x.kind === 'child').length >= MAX_CHILDREN) {
          g.toast(`${c.name} would love to travel with you once there is a free bunk in the van.`);
        }
      }
    });
  }

  /** Take a child's figure out of the caravan (they have gone home). */
  private remove(id: string): void {
    const i = this.bodies.findIndex((b) => b.def.id === id);
    if (i < 0) return;
    const b = this.bodies[i];
    if (b.child) this.g.scene.remove(b.child.root);
    if (b.pet) this.g.scene.remove(b.pet.root);
    this.bodies.splice(i, 1);
  }

  private add(id: string): void {
    const def = COMPANION_BY_ID[id];
    if (!def || this.bodies.some((b) => b.def.id === id)) return;
    const p = this.g.trav.gPos;
    const member: Member = { id, kind: def.kind, x: p.x - 3, z: p.z - 3, speed: 0 };
    const body: Body = { def, member, ph: Math.random() * 10 };
    if (def.kind === 'sibling') {
      // Full grown, at their own heights between hers and his (caravan.ts SIBLINGS).
      body.child = new CharacterModel(outfitOf(this.g.st, id) ?? OUTFITS[def.outfit], def.skin, HERO_SCALE.girl + (HERO_SCALE.boy - HERO_SCALE.girl) * def.rise);
      this.g.scene.add(body.child.root);
    } else if (def.kind === 'child') {
      const pool = wardrobeFor(def.origin, def.who, true);
      const outfit = outfitOf(this.g.st, id) ?? pool[(def.name.length * 7) % pool.length];
      body.child = new CharacterModel(outfit, ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a'][def.name.length % 4], CHILD_SCALE);
      this.g.scene.add(body.child.root);
    } else {
      body.pet = new AnimalModel(def.species, def.scale, def.tint);
      this.g.scene.add(body.pet.root);
    }
    this.bodies.push(body);
  }

  /** The figure of someone travelling with them (for the dressing room's camera). */
  figureOf(id: string): CharacterModel | null {
    return this.bodies.find((x) => x.def.id === id)?.child ?? null;
  }

  /** Put on what was chosen for them in the dressing room. */
  redress(id: string): void {
    const b = this.bodies.find((x) => x.def.id === id), o = outfitOf(this.g.st, id);
    if (b?.child && o) b.child.setOutfit(o);
  }

  /** Nearest companion within reach (for "Chat with Rosie" / "Pet Pip"). */
  nearest(p: THREE.Vector3, r: number): CompanionDef | null {
    let best: CompanionDef | null = null, bd = r;
    for (const b of this.bodies) {
      const d = Math.hypot(b.member.x - p.x, b.member.z - p.z);
      if (d < bd) { bd = d; best = b.def; }
    }
    return best;
  }

  /** The nearest pet waiting to be met. */
  nearestStray(p: THREE.Vector3, r: number): PetDef | null {
    let best: PetDef | null = null, bd = r;
    for (const s of this.strays.values()) {
      const d = Math.hypot(s.model.root.position.x - p.x, s.model.root.position.z - p.z);
      if (d < bd) { bd = d; best = s.def; }
    }
    return best;
  }

  /** Offer a waiting pet its favourite food; it joins if there is room. */
  adopt(def: PetDef): string {
    const r = offerFood(this.g.st, def);
    if (r.ok) {
      const s = this.strays.get(def.id);
      if (s) { this.g.scene.remove(s.model.root); this.strays.delete(def.id); }
      this.add(def.id);
      return `🐾 ${def.name} joins the caravan — ${def.blurb}`;
    }
    return r.reason;
  }

  /** Pets of the lands nearby wait round their plazas; those already travelling do not. */
  private updateStrays(dt: number, t: number): void {
    const loaded = new Set([...this.g.world.loadedRegions()].map((r) => r.spec.id));
    for (const def of PETS) {
      const here = loaded.has(def.origin) && !this.g.st.caravan.includes(def.id);
      const s = this.strays.get(def.id);
      if (here && !s) {
        const c = regionCenter(REGION_BY_ID[def.origin]), h = strayHome(def);
        const model = new AnimalModel(def.species, def.scale, def.tint);
        this.g.scene.add(model.root);
        this.strays.set(def.id, { def, model, x: c.x + h.x, z: c.z + h.z, ph: Math.random() * 10 });
      } else if (!here && s) {
        this.g.scene.remove(s.model.root);
        this.strays.delete(def.id);
      }
    }
    for (const s of this.strays.values()) {
      // Pottering about a little, then sitting to watch the square.
      const wander = Math.sin(t * 0.3 + s.ph);
      const x = s.x + Math.sin(t * 0.21 + s.ph) * 1.6, z = s.z + Math.cos(t * 0.17 + s.ph) * 1.6;
      const r = s.model.root;
      const dx = x - r.position.x, dz = z - r.position.z;
      r.position.set(x, surfaceAt(x, z, 1e9), z);
      if (Math.hypot(dx, dz) > 1e-4) r.rotation.y = Math.atan2(dx, dz);
      s.model.update(dt, Math.abs(wander) > 0.3 ? 0.8 : 0, t + s.ph);
    }
  }

  /** Where the children (or the pets) are, on average — for the story's camera. */
  centroid(kind: 'child' | 'pet' | 'sibling'): THREE.Vector3 | null {
    const b = this.bodies.filter((x) => x.def.kind === kind);
    if (!b.length) return null;
    const v = new THREE.Vector3();
    for (const x of b) v.add((x.child ?? x.pet)!.root.position);
    return v.multiplyScalar(1 / b.length);
  }

  list(): CompanionDef[] {
    return this.bodies.map((b) => b.def);
  }

  /** True while the carpet is out (flying, or coming in to land). */
  get onCarpet(): boolean {
    return this.carpetState !== 'off';
  }

  update(dt: number, t: number): void {
    const g = this.g, tr = g.trav;
    if (g.started) this.updateStrays(dt, t);
    // On the coach, the ferry or the air taxi they ride along in the seats behind the two.
    if (tr.carriage) return this.rideAlong(dt, t, tr.carriage.root, tr.carriage.family);
    const cutOk = !g.cutscene || !!g.cutscene.caravan;
    const below = surfaceAt(tr.gPos.x, tr.gPos.z, tr.gPos.y + 3);
    const aloft = g.started && !g.inVan && cutOk && tr.airborne && tr.gPos.y > below + 1.2;
    if (aloft && this.carpetState === 'off') {
      // Unroll the carpet under the caravan where they stand.
      const c = this.centroid('child') ?? this.centroid('pet') ?? this.centroid('sibling') ?? tr.gPos;
      this.carpet.root.position.set(c.x, surfaceAt(c.x, c.z, c.y + 3) + 0.3, c.z);
      this.carpetHeading = tr.heading;
      this.carpet.open = 0.05;
    }
    // The Light Fury flies with them only while they ride the Night Dragon — never with the cape,
    // the plane or the unicorns (checked every moment they are aloft, not just at take-off).
    if (aloft) {
      const want = tr.mode === 'dragon';
      if (want && !this.lightOn) {
        if (!this.light) { this.light = new Dragon(DRAGON_SCALE, true, true); g.scene.add(this.light.root); }
        // She sets off from beside the children, where they stand.
        this.light.root.position.copy(this.carpet.root.position);
      }
      this.lightOn = want;
      if (this.light && !want) this.light.root.visible = false;
    }
    if (aloft) this.carpetState = 'flying';
    else if (this.carpetState === 'flying') this.carpetState = 'landing';
    if (this.carpetState !== 'off') return this.updateCarpet(dt, t, aloft);

    const onFoot = tr.mode === 'walk' || tr.mode === 'fly';
    const show = g.started && onFoot && !g.inVan && cutOk;
    const girl = { x: tr.gPos.x, z: tr.gPos.z }, boy = { x: tr.bPos.x, z: tr.bPos.z };
    const vanRoot = g.started && !g.inVan && tr.mode === 'van' ? tr.vehicleRoot : null;
    if (vanRoot && cutOk) return this.rideInVan(dt, t, vanRoot);
    if (!show) {
      // Riding along: they catch up the moment the travellers are back on foot.
      for (const b of this.bodies) {
        (b.child ?? b.pet)!.root.visible = false;
        b.member.x = girl.x - 2; b.member.z = girl.z - 2; b.member.speed = 0;
      }
      return;
    }
    const next = caravanStep(this.bodies.map((b) => b.member), girl, boy, tr.heading, Math.min(8, tr.currentSpeed), dt);
    this.bodies.forEach((b, i) => {
      const m = next[i], prev = b.member;
      const dx = m.x - prev.x, dz = m.z - prev.z;
      b.member = m;
      const root = (b.child ?? b.pet)!.root;
      root.visible = true;
      root.position.set(m.x, surfaceAt(m.x, m.z, tr.gPos.y + 3), m.z);
      if (Math.hypot(dx, dz) > 0.002) root.rotation.y = Math.atan2(dx, dz);
      if (b.child) {
        if (b.def.kind === 'child') b.child.holdBalloon(balloonFor(b.def.id, this.g.region.id, Math.floor(this.g.st.minutes / 1440), this.g.celebration.festivities.level > 0.5));
        b.child.update(dt, { speed: m.speed, airborne: false, riding: false, t: t + b.ph });
      } else b.pet!.update(dt, m.speed, t + b.ph);
    });
  }

  /** Where the carpet is relative to her (eased, so it glides into place but never lags behind). */
  private carpetRel = new THREE.Vector3();
  /** How far the pets' carpet has dropped back behind the Light Fury (eases out after take-off). */
  private carpetBack = 0;
  private carpetLive = false;

  /** The carpet flies beside the two (on the side away from him), then lands and rolls up. */
  private updateCarpet(dt: number, t: number, aloft: boolean): void {
    const g = this.g, tr = g.trav, root = this.carpet.root;
    root.visible = true;
    const h = tr.heading;
    const mode = tr.mode === 'dragon' || tr.mode === 'plane' || tr.mode === 'unicorn' ? tr.mode : 'fly';
    const k = 1 - Math.exp(-dt * 2.5);
    if (aloft) {
      // Ease in her own frame (sideways, forward, up) and turn the carpet with her: on a sharp
      // turn it swings round her at its full distance and never cuts across the two.
      const want = carpetTarget(mode, tr.gPos, tr.bPos, this.carpetHeading);
      const ch = this.carpetHeading, rx = Math.cos(ch), rz = -Math.sin(ch), fx = Math.sin(ch), fz = Math.cos(ch);
      const dx = want.x - tr.gPos.x, dz = want.z - tr.gPos.z;
      const local = this.tmp.set(dx * rx + dz * rz, want.y - tr.gPos.y + Math.sin(t * 1.6) * 0.15, dx * fx + dz * fz);
      if (!this.carpetLive) {
        const px = root.position.x - tr.gPos.x, pz = root.position.z - tr.gPos.z;
        this.carpetRel.set(px * rx + pz * rz, root.position.y - tr.gPos.y, px * fx + pz * fz);
        // Never start inside the clear space round her.
        if (Math.abs(this.carpetRel.x) < Math.abs(local.x) * 0.6) this.carpetRel.x = local.x * 0.6;
        this.carpetLive = true;
      }
      this.carpetRel.x += (local.x - this.carpetRel.x) * k;
      this.carpetRel.z += (local.z - this.carpetRel.z) * k;
      this.carpetRel.y += (local.y - this.carpetRel.y) * (1 - Math.exp(-dt * 5));
      this.carpetHeading += Math.atan2(Math.sin(h - ch), Math.cos(h - ch)) * (1 - Math.exp(-dt * 3));
      const c2 = this.carpetHeading, r2x = Math.cos(c2), r2z = -Math.sin(c2), f2x = Math.sin(c2), f2z = Math.cos(c2);
      root.position.set(tr.gPos.x + r2x * this.carpetRel.x + f2x * this.carpetRel.z, tr.gPos.y + this.carpetRel.y, tr.gPos.z + r2z * this.carpetRel.x + f2z * this.carpetRel.z);
      // The rule, whatever the flying: no seat within reach of either of the two.
      const reach = Math.max(CARPET_W / 2 + CARPET_L / 2 * 0.6 + TRAVELLER_CLEARANCE + 0.3, CARPET_SIDE[mode] - 0.5);
      for (const p of [tr.gPos, tr.bPos]) {
        const ox = root.position.x - p.x, oz = root.position.z - p.z, d = Math.hypot(ox, oz);
        if (d < reach) { const u = d > 1e-3 ? 1 / d : 0; root.position.x = p.x + (d > 1e-3 ? ox * u : r2x) * reach; root.position.z = p.z + (d > 1e-3 ? oz * u : r2z) * reach; }
      }
      this.carpet.open = Math.min(1, this.carpet.open + dt * 1.5);
    } else {
      // Coming in to land where it is, then everyone steps off and it rolls up.
      this.carpetLive = false;
      const ground = surfaceAt(root.position.x, root.position.z, root.position.y + 3) + 0.3;
      root.position.y += (ground - root.position.y) * (1 - Math.exp(-dt * 2.2));
      if (root.position.y - ground < 0.12) this.carpet.open = Math.max(0, this.carpet.open - dt * 1.4);
    }
    // On the Night Dragon, the place beside them is the Light Fury's; the pets' carpet follows
    // a little way behind her, and shows only when there are pets to carry.
    const light = this.lightOn ? this.light : null;
    if (light) {
      const fx = Math.sin(this.carpetHeading), fz = Math.cos(this.carpetHeading);
      light.root.visible = true;
      light.root.position.set(root.position.x, root.position.y - 0.3, root.position.z);
      light.root.rotation.set(0, this.carpetHeading, Math.sin(t * 0.7) * 0.03 * (aloft ? 1 : 0));
      light.update(dt, aloft ? tr.currentSpeed : 0, t + 1.7);
      const back = this.carpetBack += ((aloft ? PET_CARPET_BACK : 0) - this.carpetBack) * (1 - Math.exp(-dt * 1.5));
      root.position.x -= fx * back;
      root.position.z -= fz * back;
      if (!aloft) root.position.y = Math.max(root.position.y, surfaceAt(root.position.x, root.position.z, root.position.y + 3) + 0.3);
    }
    // Who rides where. On the Night Dragon: the brothers and sisters first, then the children, each
    // in a saddle of their own on the Light Fury; anyone without a saddle and the pets on the
    // carpet behind her, and no second carpet. Otherwise the children and pets share the first
    // carpet and the brothers and sisters have their own.
    const onLight = new Set<Body>();
    if (light) for (const kind of ['sibling', 'child'] as const) for (const b of this.bodies) if (b.def.kind === kind && onLight.size < light.seatCount) onLight.add(b);
    if (light) root.visible = this.bodies.some((b) => !onLight.has(b));
    root.rotation.set(Math.sin(t * 1.3) * 0.03, this.carpetHeading, Math.sin(t * 0.9) * 0.04 * (aloft ? 1 : 0));
    this.carpet.update(dt, t, g.sky.night, aloft ? tr.currentSpeed : 0);
    root.updateMatrixWorld();
    // The second carpet flies a carpet's length behind the first, on the same side, farther still
    // from the two.
    const r2 = this.carpet2.root, hasSibs = !light && this.bodies.some((b) => b.def.kind === 'sibling');
    r2.visible = hasSibs && root.visible;
    if (hasSibs) {
      const fx = Math.sin(this.carpetHeading), fz = Math.cos(this.carpetHeading);
      r2.position.set(root.position.x - fx * (CARPET_L + 1.4), root.position.y + Math.sin(t * 1.1 + 1) * 0.08, root.position.z - fz * (CARPET_L + 1.4));
      r2.rotation.copy(root.rotation);
      this.carpet2.open = this.carpet.open;
      this.carpet2.update(dt, t, g.sky.night, aloft ? tr.currentSpeed : 0);
      r2.updateMatrixWorld();
    }

    let ci = 0, pi = 0, si = 0, li = 0;
    for (const b of this.bodies) {
      const kind = b.def.kind;
      const r = (b.child ?? b.pet)!.root;
      if (light && onLight.has(b)) {
        // In a saddle of their own on the Light Fury's back, sitting at their own height.
        const p = light.seatPoint(li++, new THREE.Vector3());
        const scale = b.def.kind === 'sibling' ? HERO_SCALE.girl + (HERO_SCALE.boy - HERO_SCALE.girl) * b.def.rise : CHILD_SCALE;
        r.visible = true;
        r.position.set(p.x, p.y - DIMS.hip * scale * 0.95, p.z);
        r.rotation.set(0, this.carpetHeading, 0);
        b.member.x = p.x; b.member.z = p.z; b.member.speed = 0;
        b.child!.update(dt, { speed: 0, airborne: false, riding: true, t: t + b.ph });
        continue;
      }
      // A brother or sister without a saddle rides the carpet in a child's seat.
      const seatKind = light && kind === 'sibling' ? 'child' : kind;
      const seatIdx = seatKind === 'child' ? ci++ : seatKind === 'sibling' ? si++ : pi++;
      const p = (seatKind === 'sibling' ? this.carpet2 : this.carpet).seat(seatKind, seatIdx, new THREE.Vector3());
      r.visible = this.carpet.open > 0.3 || aloft;
      r.position.copy(p);
      r.rotation.y = this.carpetHeading;
      b.member.x = p.x; b.member.z = p.z; b.member.speed = 0;
      if (b.child) b.child.update(dt, { speed: 0, airborne: false, riding: true, t: t + b.ph });
      else b.pet!.update(dt, 0, t + b.ph);
    }
    if (!aloft && this.carpet.open <= 0) {
      this.carpetState = 'off';
      root.visible = false;
      this.carpet2.root.visible = false;
      // The Light Fury settles where she landed and waits out of sight until they fly again.
      if (this.light) this.light.root.visible = false;
      this.lightOn = false;
      this.carpetBack = 0;
    }
  }

  /**
   * Driving: the two are up front in the cab; the brothers and sisters sit on the benches by the big
   * windows (the brother on his side), the children sit up on their bunks, the pets curl up in their
   * beds — everyone in a seat of their own.
   */
  private rideInVan(dt: number, t: number, van: THREE.Object3D): void {
    van.updateMatrixWorld();
    let pi = 0, ki = 0;
    // Bench seats: his side ([2], [3]) for a brother first, her side ([0], [1]) for the sisters.
    const hisSeats = [RIDE_CHILD_SEATS[2], RIDE_CHILD_SEATS[3]], herSeats = [RIDE_CHILD_SEATS[0], RIDE_CHILD_SEATS[1]];
    for (const b of this.bodies) {
      const r = (b.child ?? b.pet)!.root;
      if (b.def.kind === 'sibling' && b.child) {
        const s = b.def.who === 'boy' ? hisSeats.shift() ?? herSeats.shift() : herSeats.shift() ?? hisSeats.shift();
        if (!s) { r.visible = false; continue; }
        const scale = HERO_SCALE.girl + (HERO_SCALE.boy - HERO_SCALE.girl) * b.def.rise;
        r.position.set(s[0], VAN.floorY + 0.5 - DIMS.hip * scale, s[2]);
        r.rotation.set(0, s[0] < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        b.child.update(dt, { speed: 0, airborne: false, riding: true, t: t + b.ph });
      } else if (b.child) {
        // Sitting up on a bunk, upper ones first, legs over the edge towards the aisle.
        const [x, y, z] = BUNKS[[1, 3, 0, 2][ki++ % 4]];
        r.position.set(x * 0.72, VAN.floorY + y + 0.12 - DIMS.hip * CHILD_SCALE, z + (y < 1 ? -0.3 : 0.2));
        r.rotation.set(0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        b.child.update(dt, { speed: 0, airborne: false, riding: true, t: t + b.ph });
      } else {
        const [x, z] = PET_BEDS[pi++ % PET_BEDS.length];
        r.position.set(x, VAN.floorY + 0.1, z);
        r.rotation.set(0, Math.PI * 0.8, 0);
        b.pet!.update(dt, 0, t + b.ph);
      }
      r.applyMatrix4(van.matrixWorld);
      r.visible = true;
      b.member.x = r.position.x; b.member.z = r.position.z; b.member.speed = 0;
    }
  }

  /** Seated on a coach, ferry or air taxi: sisters on her side, a brother on his, then the children, the pets beside them. */
  private rideAlong(dt: number, t: number, coach: THREE.Object3D, seats: ReadonlyArray<readonly [number, number, number]>): void {
    coach.updateMatrixWorld();
    const her = seats.filter((s) => s[0] < 0), his = seats.filter((s) => s[0] > 0);
    const next = (boy: boolean) => (boy ? his.shift() ?? her.shift() : her.shift() ?? his.shift());
    for (const b of this.bodies) {
      const r = (b.child ?? b.pet)!.root;
      const s = next(b.def.kind === 'sibling' && b.def.who === 'boy');
      if (!s) { r.visible = false; continue; }
      if (b.child) {
        const scale = b.def.kind === 'sibling' ? HERO_SCALE.girl + (HERO_SCALE.boy - HERO_SCALE.girl) * b.def.rise : CHILD_SCALE;
        r.position.set(s[0], s[1] + 0.05 - DIMS.hip * scale, s[2]);
        b.child.update(dt, { speed: 0, airborne: false, riding: true, t: t + b.ph });
      } else {
        r.position.set(s[0], s[1] + 0.02, s[2]);
        b.pet!.update(dt, 0, t + b.ph);
      }
      r.rotation.set(0, 0, 0);
      r.applyMatrix4(coach.matrixWorld);
      r.visible = true;
      b.member.x = r.position.x; b.member.z = r.position.z; b.member.speed = 0;
    }
  }

  /** A short line when you stop to talk to one of them. */
  chat(def: CompanionDef): string {
    if (def.kind === 'pet') return `${def.name} (from ${REGION_BY_ID[def.origin].name}) — ${def.blurb}`;
    if (def.kind === 'sibling') return `${def.name}: ${def.blurb}`;
    return `${def.name}: ${def.blurb} (${def.tradition}.) Travelling to ${REGION_BY_ID[def.destination].name}: ${def.journey}`;
  }
}
