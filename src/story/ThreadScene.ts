import * as THREE from 'three';
import type { Game } from '../Game';
import { HERO_SCALE, type CharacterModel } from '../characters/CharacterModel';
import { MIN_GAP } from '../characters/follow';
import { surfaceAt } from '../world/terrain';

/**
 * The opening promise, under the Great Oak: he kneels and ties the golden thread of commitment
 * round her wrist; then, as he kneels with his hands held out, she ties it round his. Their hands
 * come close — a hand's breadth — but never touch: they stand MIN_GAP apart, each arm reaches only
 * its own length, and the thread winds itself round the wrist the last little way.
 *
 * Plays once (flag THREAD_FLAG) before the opening cake, replayable from Help, always skippable.
 * Afterwards both wear the knotted thread on the wrist of the hand that holds it.
 */
export const THREAD_FLAG = 'thread-tied';

/** Centre to centre while tying: the no-touch minimum and a little over. */
export const TIE_GAP = MIN_GAP + 0.02;
/** The least room ever left between their fingertips. */
export const HAND_CLEARANCE = 0.08;

const GOLD = '#f5c451';

/**
 * Where he kneels: facing her, TIE_GAP from her centre, shifted to her thread-hand side so her
 * wrist is straight before his hands. Pure, for the tests.
 */
export function tyingSpot(g: { x: number; z: number }, heading: number, shoulder: number): { x: number; z: number; heading: number } {
  const fwd = { x: Math.sin(heading), z: Math.cos(heading) }, side = { x: Math.cos(heading), z: -Math.sin(heading) };
  const lat = Math.min(shoulder, TIE_GAP * 0.5), along = Math.sqrt(TIE_GAP * TIE_GAP - lat * lat);
  return { x: g.x + fwd.x * along + side.x * lat, z: g.z + fwd.z * along + side.z * lat, heading: heading + Math.PI };
}

interface Beat { at: number; text?: string }

export class ThreadScene {
  private t = 0;
  private done = false;
  private overlay = document.createElement('div');
  private caption = document.createElement('p');
  private beats: Beat[];
  private beat = -1;
  private gPos = new THREE.Vector3();
  private bPos = new THREE.Vector3();
  private heading = 0;
  private savedYaw = 0;
  /** The coil of light he holds, the strand from hands to wrist, and the knot winding round each wrist. */
  private coil: THREE.Mesh;
  private strand: THREE.Mesh;
  private knots: Array<{ mesh: THREE.Mesh | null; on: CharacterModel; turns: number }>;
  private sparks: THREE.Mesh[] = [];
  private mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(1.8), toneMapped: false });
  onDone?: () => void;

  static readonly LENGTH = 23;

  constructor(private g: Game) {
    const { girl, boy } = g.st.names;
    this.beats = [
      { at: 0.4, text: 'Before the road, under the Great Oak — a promise.' },
      { at: 4.4, text: `${boy} kneels, holding the golden thread of commitment.` },
      { at: 7.6, text: `He ties it round ${girl}'s wrist. Their hands come close, and never touch — the thread winds itself round.` },
      { at: 12.4, text: `Then, as he kneels with his hands held out, ${girl} ties the other end round his.` },
      { at: 17.2, text: 'Two knots, one thread. Wherever the road goes, it will hold.' },
      { at: 21.4 },
    ];
    const tr = g.trav;
    this.heading = tr.heading;
    this.gPos.copy(tr.gPos);
    const spot = tyingSpot(this.gPos, this.heading, 0.24 * HERO_SCALE.girl);
    this.bPos.set(spot.x, surfaceAt(spot.x, spot.z, this.gPos.y + 2), spot.z);
    this.savedYaw = tr.camYaw;
    tr.thread.group.visible = false;
    tr.girl.setBand(false);
    tr.boy.setBand(false);

    this.coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 5, 20), this.mat);
    this.coil.visible = false;
    this.strand = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5, 1, true).translate(0, 0.5, 0), this.mat);
    this.strand.visible = false;
    g.scene.add(this.coil, this.strand);
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), this.mat);
      s.visible = false;
      this.sparks.push(s);
      g.scene.add(s);
    }
    this.knots = [{ mesh: null, on: tr.girl, turns: 0 }, { mesh: null, on: tr.boy, turns: 0 }];

    this.overlay.className = 'cinema';
    const skip = document.createElement('button');
    skip.className = 'btn small ghost skip';
    skip.type = 'button';
    skip.textContent = 'Skip ›';
    skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    this.caption.className = 'caption';
    this.overlay.append(Object.assign(document.createElement('i'), { className: 'bar top' }), Object.assign(document.createElement('i'), { className: 'bar bottom' }), this.caption, skip);
    document.getElementById('ui')?.append(this.overlay);
    requestAnimationFrame(() => this.overlay.classList.add('show'));
    document.body.classList.add('cinematic');
  }

  get finished(): boolean {
    return this.done;
  }

  /** Wind `turns` (0..3) of thread round the wrist of one of them. */
  private wind(i: number, turns: number): void {
    const k = this.knots[i];
    if (Math.abs(turns - k.turns) < 0.01 && k.mesh) return;
    k.turns = turns;
    if (k.mesh) { k.mesh.parent?.remove(k.mesh); k.mesh.geometry.dispose(); }
    k.mesh = null;
    if (turns <= 0) return;
    // A helix round the forearm just above the hand, in the arm's own frame (the arm runs along -y).
    const pts: THREE.Vector3[] = [];
    const n = Math.max(2, Math.ceil(turns * 16));
    for (let q = 0; q <= n; q++) {
      const a = (q / n) * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(a) * 0.074, -0.51 - (q / n) * turns * 0.017, Math.cos(a) * 0.074));
    }
    k.mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.009, 4), this.mat);
    k.on.armOf('thread').add(k.mesh);
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.done) return;
    this.t += dt;
    const t = this.t, g = this.g, tr = g.trav, girl = tr.girl, boy = tr.boy;
    if (g.input.hit('escape')) return this.finish();
    while (this.beat + 1 < this.beats.length && t >= this.beats[this.beat + 1].at) {
      const text = this.beats[++this.beat].text;
      this.caption.classList.remove('show');
      if (text) {
        this.caption.textContent = text;
        void this.caption.offsetWidth;
        this.caption.classList.add('show');
      }
    }
    const S = THREE.MathUtils.smoothstep;

    // Stand them where the promise is made, facing each other, him TIE_GAP away.
    tr.gPos.copy(this.gPos);
    tr.bPos.copy(this.bPos);
    girl.root.position.copy(this.gPos);
    boy.root.position.copy(this.bPos);
    girl.root.rotation.set(0, this.heading, 0);
    boy.root.rotation.set(0, this.heading + Math.PI, 0);

    // He kneels (4.4–5.9) and stays down until the knots are tied, then rises (18.4–19.6).
    boy.kneel = S(t, 4.4, 5.9) * (1 - S(t, 18.4, 19.6));
    // First knot, round her wrist: he raises both hands towards it, she holds out her wrist.
    const first = S(t, 5.6, 7.2) * (1 - S(t, 11.8, 12.6));
    // Second knot, round his wrist: he holds out his hands, she reaches with both of hers.
    const second = S(t, 12.4, 13.8) * (1 - S(t, 17.4, 18.4));
    girl.update(0, { speed: 0, airborne: false, riding: false, t });
    boy.update(0, { speed: 0, airborne: false, riding: false, t });
    const herWrist = girl.wrist('thread', new THREE.Vector3()), hisWrist = boy.wrist('thread', new THREE.Vector3());
    const hisHands = boy.freeHand(new THREE.Vector3()).add(boy.wrist('thread', new THREE.Vector3())).multiplyScalar(0.5);
    const herHands = girl.freeHand(new THREE.Vector3()).add(girl.wrist('free', new THREE.Vector3())).add(herWrist).multiplyScalar(1 / 3);
    boy.reach = Math.max(first, second);
    boy.reachThread = boy.reachFree = first >= second ? herWrist.clone() : herHands.clone();
    girl.reach = Math.max(first, second);
    girl.reachThread = first >= second ? hisHands.clone() : hisWrist.clone();
    girl.reachFree = first >= second ? null : hisWrist.clone();
    girl.update(0, { speed: 0, airborne: false, riding: false, t });
    boy.update(0, { speed: 0, airborne: false, riding: false, t });
    this.keepApart();

    // The coil of light rests over his hands, then the strand runs to the wrist and winds round it.
    boy.freeHand(this.coil.position).lerp(boy.wrist('thread', new THREE.Vector3()), 0.5);
    this.coil.position.y += 0.06;
    this.coil.rotation.set(Math.PI / 2 + Math.sin(t * 2) * 0.2, t * 1.5, 0);
    this.coil.visible = t > 4.8 && t < 16.4;
    this.coil.scale.setScalar(t < 12 ? 1 : Math.max(0.2, 1 - (t - 12) / 4.4));
    const w1 = S(t, 8.2, 11.4) * 3, w2 = S(t, 13.8, 16.6) * 3;
    this.wind(0, w1);
    this.wind(1, w2);
    const tying = (t > 7.4 && t < 11.6) || (t > 13.2 && t < 16.8);
    this.strand.visible = tying;
    if (tying) {
      const from = this.coil.position, to = t < 12 ? girl.wrist('thread', new THREE.Vector3()) : boy.wrist('thread', new THREE.Vector3());
      const d = to.clone().sub(from);
      this.strand.position.copy(from);
      this.strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      this.strand.scale.set(1, Math.max(0.001, d.length()), 1);
      for (let i = 0; i < 10; i++) this.spark(i, to, t, 0.6);
    }
    // When both knots are tied, the thread between them lights up, sparks rising round them.
    if (t > 16.8 && !girl.hasBand) { this.wind(0, 0); this.wind(1, 0); girl.setBand(true); boy.setBand(true); tr.thread.group.visible = true; }
    if (t > 16.8 && t < 20.5) {
      const mid = this.gPos.clone().lerp(this.bPos, 0.5).setY(this.gPos.y + 1.0);
      for (let i = 10; i < 24; i++) this.spark(i, mid, t, 3 + (t - 16.8) * 1.5);
    } else if (!tying) for (const s of this.sparks) s.visible = false;
    if (t > 16.8 && !g.st.flags.includes(THREAD_FLAG)) { g.st.flags.push(THREAD_FLAG); g.st.light += 0.5; }

    this.shoot(t, camera, herWrist, hisWrist);
    if (t >= ThreadScene.LENGTH) this.finish();
  }

  /** Their fingertips never meet: if a reach would close the last hand's breadth, he eases back. */
  private keepApart(): void {
    const tr = this.g.trav, girl = tr.girl, boy = tr.boy;
    for (let pass = 0; pass < 3; pass++) {
      let least = Infinity;
      const tips: THREE.Vector3[][] = [girl, boy].map((m) => (['thread', 'free'] as const).map((w) => m.armOf(w).localToWorld(new THREE.Vector3(0, -0.72, 0))));
      for (const a of tips[0]) for (const b of tips[1]) least = Math.min(least, a.distanceTo(b));
      if (least >= HAND_CLEARANCE) return;
      const away = this.bPos.clone().sub(this.gPos).setY(0).normalize();
      this.bPos.addScaledVector(away, HAND_CLEARANCE - least + 0.01);
      boy.root.position.copy(this.bPos);
      tr.bPos.copy(this.bPos);
      boy.update(0, { speed: 0, airborne: false, riding: false, t: this.t });
    }
  }

  /** Camera: a wide shot drifting in, a low two-shot as he kneels, close on each knot, then back. */
  private shoot(t: number, camera: THREE.PerspectiveCamera, herWrist: THREE.Vector3, hisWrist: THREE.Vector3): void {
    const S = THREE.MathUtils.smoothstep;
    const mid = this.gPos.clone().lerp(this.bPos, 0.5);
    const along = this.bPos.clone().sub(this.gPos).setY(0).normalize();
    const side = new THREE.Vector3(-along.z, 0, along.x);
    const wide = mid.clone().addScaledVector(side, 8 - t * 0.6).addScaledVector(along, -3).setY(mid.y + 4 - t * 0.4);
    const two = mid.clone().addScaledVector(side, 3.4).setY(mid.y + 1.3);
    const knot1 = herWrist.clone().addScaledVector(side, 1.3).addScaledVector(along, -0.5).setY(herWrist.y + 0.35);
    const knot2 = hisWrist.clone().addScaledVector(side, -1.3).addScaledVector(along, 0.5).setY(hisWrist.y + 0.4);
    const rise = mid.clone().addScaledVector(side.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (t - 17) * 0.25), 4.5).setY(mid.y + 2.2 + (t - 17) * 0.3);
    let pos: THREE.Vector3, look: THREE.Vector3;
    if (t < 4.4) { pos = wide; look = mid.clone().setY(mid.y + 1.1); }
    else if (t < 8) { pos = wide.lerp(two, S(t, 4.4, 5.8)); look = mid.clone().setY(mid.y + 0.95); }
    else if (t < 12.4) { pos = two.clone().lerp(knot1, S(t, 8, 9.2)); look = mid.clone().setY(mid.y + 0.95).lerp(herWrist, S(t, 8, 9.2)); }
    else if (t < 17) { pos = knot1.clone().lerp(knot2, S(t, 12.4, 13.6)); look = herWrist.clone().lerp(hisWrist, S(t, 12.4, 13.6)); }
    else { pos = knot2.clone().lerp(rise, S(t, 17, 18.4)); look = hisWrist.clone().lerp(mid.clone().setY(mid.y + 1.1), S(t, 17, 18.4)); }
    const back = S(t, 21, 23);
    if (back > 0) {
      this.g.trav.camYaw = this.savedYaw;
      camera.position.lerpVectors(pos, camera.position, back);
    } else camera.position.copy(pos);
    camera.lookAt(look);
  }

  private spark(i: number, at: THREE.Vector3, t: number, spread: number): void {
    const s = this.sparks[i];
    const ph = (t * 1.3 + i * 0.41) % 1;
    s.visible = true;
    s.position.set(at.x + Math.sin(i * 12.9 + t * 2) * 0.1 * spread, at.y + ph * 0.3 * spread - 0.05, at.z + Math.cos(i * 7.3 + t * 2) * 0.1 * spread);
    s.scale.setScalar((1 - ph) * 1.3);
  }

  finish(): void {
    if (this.done) return;
    this.done = true;
    const g = this.g, tr = g.trav;
    if (!g.st.flags.includes(THREAD_FLAG)) { g.st.flags.push(THREAD_FLAG); g.st.light += 0.5; }
    this.wind(0, 0);
    this.wind(1, 0);
    for (const m of [tr.girl, tr.boy]) {
      m.setBand(true);
      m.kneel = 0;
      m.reach = 0;
      m.reachThread = m.reachFree = null;
    }
    tr.thread.group.visible = true;
    tr.camYaw = this.savedYaw;
    g.scene.remove(this.coil, this.strand, ...this.sparks);
    this.overlay.classList.remove('show');
    document.body.classList.remove('cinematic');
    setTimeout(() => this.overlay.remove(), 700);
    this.onDone?.();
  }
}
