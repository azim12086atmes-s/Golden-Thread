import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';
import { CharacterModel } from '../characters/CharacterModel';
import type { Game } from '../Game';
import { wardrobeFor } from '../npc/Townsfolk';
import { REGION_BY_ID } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { Carpet } from './Carpet';
import { CHILDREN, COMPANION_BY_ID, MAX_CHILDREN, caravanStep, canJoin, type CompanionDef, type Member } from './caravan';

/**
 * The caravan in the world: the children and pets travelling with the two, walking behind them
 * (children close, pets ranging wider), always keeping clear space around the travellers and
 * each other (caravan.ts proves it). When the travellers take a ground vehicle they ride along
 * and reappear beside them on foot. Whenever the two fly — on the cape, the dragon, the plane or
 * a winged unicorn — the children and pets ride a flying carpet beside them, and step off where
 * it lands.
 */
interface Body { def: CompanionDef; member: Member; child?: CharacterModel; pet?: AnimalModel; ph: number }

type CarpetState = 'off' | 'flying' | 'landing';

export class CaravanView {
  private bodies: Body[] = [];
  private carpet = new Carpet();
  private carpetState: CarpetState = 'off';
  private carpetHeading = 0;
  private tmp = new THREE.Vector3();

  constructor(private g: Game) {
    this.carpet.root.visible = false;
    g.scene.add(this.carpet.root, this.carpet.trail);
    for (const id of g.st.caravan) this.add(id);
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

  private add(id: string): void {
    const def = COMPANION_BY_ID[id];
    if (!def || this.bodies.some((b) => b.def.id === id)) return;
    const p = this.g.trav.gPos;
    const member: Member = { id, kind: def.kind, x: p.x - 3, z: p.z - 3, speed: 0 };
    const body: Body = { def, member, ph: Math.random() * 10 };
    if (def.kind === 'child') {
      const pool = wardrobeFor(def.origin, def.who);
      const outfit = pool[(def.name.length * 7) % pool.length];
      body.child = new CharacterModel(outfit, ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a'][def.name.length % 4], 0.62);
      this.g.scene.add(body.child.root);
    } else {
      body.pet = new AnimalModel(def.species, def.scale, def.tint);
      this.g.scene.add(body.pet.root);
    }
    this.bodies.push(body);
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

  /** Where the children (or the pets) are, on average — for the story's camera. */
  centroid(kind: 'child' | 'pet'): THREE.Vector3 | null {
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
    const cutOk = !g.cutscene || !!g.cutscene.caravan;
    const below = surfaceAt(tr.gPos.x, tr.gPos.z, tr.gPos.y + 3);
    const aloft = g.started && !g.inVan && cutOk && tr.airborne && tr.gPos.y > below + 1.2;
    if (aloft && this.carpetState === 'off') {
      // Unroll the carpet under the caravan where they stand.
      const c = this.centroid('child') ?? this.centroid('pet') ?? tr.gPos;
      this.carpet.root.position.set(c.x, surfaceAt(c.x, c.z, c.y + 3) + 0.3, c.z);
      this.carpetHeading = tr.heading;
      this.carpet.open = 0.05;
    }
    if (aloft) this.carpetState = 'flying';
    else if (this.carpetState === 'flying') this.carpetState = 'landing';
    if (this.carpetState !== 'off') return this.updateCarpet(dt, t, aloft);

    const onFoot = tr.mode === 'walk' || tr.mode === 'fly';
    const show = g.started && onFoot && !g.inVan && cutOk;
    const girl = { x: tr.gPos.x, z: tr.gPos.z }, boy = { x: tr.bPos.x, z: tr.bPos.z };
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
      if (b.child) b.child.update(dt, { speed: m.speed, airborne: false, riding: false, t: t + b.ph });
      else b.pet!.update(dt, m.speed, t + b.ph);
    });
  }

  /** The carpet flies beside the two (on the side away from him), then lands and rolls up. */
  private updateCarpet(dt: number, t: number, aloft: boolean): void {
    const g = this.g, tr = g.trav, root = this.carpet.root;
    root.visible = true;
    const h = tr.heading, fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
    const side = (tr.bPos.x - tr.gPos.x) * rx + (tr.bPos.z - tr.gPos.z) * rz > 0 ? -1 : 1;
    const big = tr.mode === 'dragon' || tr.mode === 'plane' || tr.mode === 'unicorn';
    const off = big ? 7 : 4.2;
    const want = this.tmp;
    let k = 1 - Math.exp(-dt * 3);
    if (aloft) {
      want.set(tr.gPos.x + rx * side * off - fx * 1.2, tr.gPos.y - 0.45 + Math.sin(t * 1.6) * 0.15, tr.gPos.z + rz * side * off - fz * 1.2);
      this.carpetHeading += Math.atan2(Math.sin(h - this.carpetHeading), Math.cos(h - this.carpetHeading)) * k;
      this.carpet.open = Math.min(1, this.carpet.open + dt * 1.5);
    } else {
      // Coming in to land where it is, then everyone steps off and it rolls up.
      want.set(root.position.x, surfaceAt(root.position.x, root.position.z, root.position.y + 3) + 0.3, root.position.z);
      k = 1 - Math.exp(-dt * 2.2);
      if (root.position.y - want.y < 0.12) this.carpet.open = Math.max(0, this.carpet.open - dt * 1.4);
    }
    root.position.lerp(want, k);
    root.rotation.set(Math.sin(t * 1.3) * 0.03, this.carpetHeading, Math.sin(t * 0.9) * 0.04 * (aloft ? 1 : 0));
    this.carpet.update(dt, t, g.sky.night, aloft ? tr.currentSpeed : 0);
    root.updateMatrixWorld();

    let ci = 0, pi = 0;
    for (const b of this.bodies) {
      const kind = b.def.kind;
      const seatIdx = kind === 'child' ? ci++ : pi++;
      const p = this.carpet.seat(kind, seatIdx, new THREE.Vector3());
      const r = (b.child ?? b.pet)!.root;
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
    }
  }

  /** A short line when you stop to talk to one of them. */
  chat(def: CompanionDef): string {
    if (def.kind === 'pet') return `${def.name} (from ${REGION_BY_ID[def.origin].name}) — ${def.blurb}`;
    return `${def.name}: ${def.blurb} (${def.tradition}.) Travelling to ${REGION_BY_ID[def.destination].name}: ${def.journey}`;
  }
}
