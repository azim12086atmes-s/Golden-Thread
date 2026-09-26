import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';
import { CharacterModel } from '../characters/CharacterModel';
import type { Game } from '../Game';
import { wardrobeFor } from '../npc/Townsfolk';
import { REGION_BY_ID } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { CHILDREN, COMPANION_BY_ID, MAX_CHILDREN, caravanStep, canJoin, type CompanionDef, type Member } from './caravan';

/**
 * The caravan in the world: the children and pets travelling with the two, walking behind them
 * (children close, pets ranging wider), always keeping clear space around the travellers and
 * each other (caravan.ts proves it). When the travellers take a vehicle they ride along — they
 * reappear beside them on foot.
 */
interface Body { def: CompanionDef; member: Member; child?: CharacterModel; pet?: AnimalModel; ph: number; air: number; glow: THREE.Sprite }

/** A soft golden halo carried by each companion while they fly. */
const GLOW = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,160,0.9)');
  gr.addColorStop(1, 'rgba(255,230,160,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
})();

export class CaravanView {
  private bodies: Body[] = [];

  constructor(private g: Game) {
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
          g.toast(`${c.name} would love to travel with you once there is room on the back bench.`);
        }
      }
    });
  }

  private add(id: string): void {
    const def = COMPANION_BY_ID[id];
    if (!def || this.bodies.some((b) => b.def.id === id)) return;
    const p = this.g.trav.gPos;
    const member: Member = { id, kind: def.kind, x: p.x - 3, z: p.z - 3, speed: 0 };
    const glow = new THREE.Sprite(GLOW);
    glow.scale.setScalar(1.6);
    glow.visible = false;
    this.g.scene.add(glow);
    const body: Body = { def, member, ph: Math.random() * 10, air: p.y, glow };
    if (def.kind === 'child') {
      const pool = wardrobeFor(def.origin, def.who);
      const outfit = pool[(def.name.length * 7) % pool.length];
      body.child = new CharacterModel(outfit, ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a'][def.name.length % 4], 0.62);
      this.g.scene.add(body.child.root);
    } else {
      body.pet = new AnimalModel(def.species, def.scale);
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

  update(dt: number, t: number): void {
    const g = this.g, tr = g.trav;
    const onFoot = tr.mode === 'walk' || tr.mode === 'fly';
    const show = g.started && onFoot && !g.inVan && (!g.cutscene || !!g.cutscene.caravan);
    const girl = { x: tr.gPos.x, z: tr.gPos.z }, boy = { x: tr.bPos.x, z: tr.bPos.z };
    if (!show) {
      // Riding along: they catch up the moment the travellers are back on foot.
      for (const b of this.bodies) {
        (b.child ?? b.pet)!.root.visible = false;
        b.glow.visible = false;
        b.air = tr.gPos.y;
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
      // When the two fly, the children and animals rise and fly with them — a little below and
      // behind, bobbing on the air; back on the ground they land softly.
      const ground = surfaceAt(m.x, m.z, tr.gPos.y + 3);
      const flying = tr.mode === 'fly' && tr.gPos.y > surfaceAt(tr.gPos.x, tr.gPos.z, tr.gPos.y + 3) + 1.2;
      const want = flying ? tr.gPos.y - 0.8 - (i % 3) * 0.5 + Math.sin(t * 2 + b.ph) * 0.25 : ground;
      b.air += (want - b.air) * Math.min(1, dt * (flying ? 3 : 5));
      if (!Number.isFinite(b.air) || (!flying && Math.abs(b.air - ground) > 40)) b.air = want;
      root.position.set(m.x, Math.max(ground, b.air), m.z);
      if (Math.hypot(dx, dz) > 0.002) root.rotation.y = Math.atan2(dx, dz);
      const aloft = root.position.y > ground + 0.5;
      if (b.child) b.child.update(dt, { speed: m.speed, airborne: aloft, riding: false, t: t + b.ph });
      else b.pet!.update(dt, aloft ? 6 : m.speed, t + b.ph);
      b.glow.visible = aloft;
      b.glow.position.copy(root.position).add(new THREE.Vector3(0, 0.4, 0));
    });
  }

  /** A short line when you stop to talk to one of them. */
  chat(def: CompanionDef): string {
    if (def.kind === 'pet') return `${def.name} (from ${REGION_BY_ID[def.origin].name}) — ${def.blurb}`;
    return `${def.name}: ${def.blurb} (${def.tradition}.) Travelling to ${REGION_BY_ID[def.destination].name}: ${def.journey}`;
  }
}
