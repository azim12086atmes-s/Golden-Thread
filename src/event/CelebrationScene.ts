import * as THREE from 'three';
import type { Game } from '../Game';
import { surfaceAt } from '../world/terrain';
import { CAKE_SPOT, CASTLE, lines, type Lines } from './site';
import type { Celebration } from './Celebration';
import { Wardrobe } from './Wardrobe';

/**
 * The evening, as one continuous cinematic (skippable at any moment):
 *   0–14 s   the unicorn chariot flies them from wherever they are to the castle, at dusk;
 *   14–24 s  in the castle's wardrobe a gown is woven from light; she wears it;
 *   24–37 s  night: he leads her up the rose aisle through guests from every land, cheering.
 * Then the chocolate cake (the cake scene, reused) and the party goes on.
 *
 * Seats and positions keep them apart throughout: separate chariot seats 1.44 m apart, the room's
 * width in the wardrobe, and the walking gap on the aisle.
 */
export class CelebrationScene {
  private t = 0;
  private done = false;
  private overlay = document.createElement('div');
  private caption = document.createElement('p');
  private fade = document.createElement('i');
  private L: Lines;
  private beats: Array<{ at: number; text: string; big?: boolean }>;
  private beat = -1;
  private start = new THREE.Vector3();
  private land = new THREE.Vector3();
  private yaw = 0;
  private wardrobe: Wardrobe;
  private dressed = false;
  private arrived = false;
  view: { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null = null;
  onDone?: (skipped: boolean) => void;

  static readonly RIDE = 14;
  static readonly ROOM = 24;
  static readonly END = 37;

  constructor(private g: Game, private c: Celebration) {
    this.L = lines(g.st);
    const R = CelebrationScene.RIDE, W = CelebrationScene.ROOM;
    this.beats = [
      { at: 0.6, text: this.L.ride[0] },
      { at: 5.5, text: this.L.ride[1] },
      { at: R + 0.6, text: this.L.wardrobe[0] },
      { at: R + 3.6, text: this.L.wardrobe[1] },
      { at: R + 6.9, text: this.L.wardrobe[2] },
      { at: W + 0.8, text: this.L.venue[0] },
      { at: W + 6.5, text: this.L.venue[1], big: true },
    ];
    this.start.copy(c.chariotPos);
    this.land.set(CASTLE.landing.x, 0, CASTLE.landing.z);
    this.land.y = surfaceAt(this.land.x, this.land.z, 1e9);
    this.wardrobe = new Wardrobe({ girl: '#e3b58f', boy: '#c99a74' });

    this.overlay.className = 'cinema';
    this.caption.className = 'caption';
    this.fade.className = 'fade';
    const skip = document.createElement('button');
    skip.className = 'btn small ghost skip';
    skip.type = 'button';
    skip.textContent = 'Skip ›';
    skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(true); });
    const bar = (cls: string) => Object.assign(document.createElement('i'), { className: `bar ${cls}` });
    this.overlay.append(bar('top'), bar('bottom'), this.fade, this.caption, skip);
    document.getElementById('ui')?.append(this.overlay);
    requestAnimationFrame(() => this.overlay.classList.add('show'));
    document.body.classList.add('cinematic');
    g.trav.thread.group.visible = false;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Move the clock forward (never back) to this hour of the evening. */
  private evening(hour: number, k: number): void {
    const st = this.g.st;
    const day = Math.floor(st.minutes / 1440);
    const want = day * 1440 + hour * 60;
    if (st.minutes < want) st.minutes += (want - st.minutes) * Math.min(1, k);
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.done) return;
    this.t += dt;
    const t = this.t, g = this.g;
    if (g.input.hit('escape')) return this.finish(true);
    this.captions();
    const R = CelebrationScene.RIDE, W = CelebrationScene.ROOM;
    // Fades between the three places.
    const f = Math.max(
      THREE.MathUtils.smoothstep(t, R - 1, R) * (1 - THREE.MathUtils.smoothstep(t, R, R + 1)),
      THREE.MathUtils.smoothstep(t, W - 1, W) * (1 - THREE.MathUtils.smoothstep(t, W, W + 1)),
    );
    this.fade.style.opacity = String(f);

    if (t < R) return this.ride(dt, t / R, camera);
    if (t < W) {
      this.view = { scene: this.wardrobe.scene, camera: this.wardrobe.camera };
      this.wardrobe.resize(innerWidth, innerHeight);
      this.wardrobe.update(dt, t - R);
      if (t - R > 6.3 && !this.dressed) {
        this.dressed = true;
        g.wear('girl', 'g-starlight-gown');
        g.wear('boy', 'b-celebration');
      }
      return;
    }
    this.view = null;
    this.venue(dt, t - W, camera);
  }

  private captions(): void {
    while (this.beat + 1 < this.beats.length && this.t >= this.beats[this.beat + 1].at) {
      const b = this.beats[++this.beat];
      this.caption.classList.remove('show', 'big');
      this.caption.textContent = b.text;
      void this.caption.offsetWidth;
      this.caption.classList.add('show');
      if (b.big) this.caption.classList.add('big');
    }
  }

  /** The chariot's flight: a gentle trot, lift-off, a high arc, and a soft landing. */
  private ride(dt: number, u: number, camera: THREE.PerspectiveCamera): void {
    const g = this.g, tr = g.trav, ch = this.c.chariot;
    const e = u * u * (3 - 2 * u);
    const pos = new THREE.Vector3().lerpVectors(this.start, this.land, e);
    const span = this.start.distanceTo(this.land);
    const ground = surfaceAt(pos.x, pos.z, 1e9);
    const lift = THREE.MathUtils.smoothstep(u, 0.04, 0.2) * (1 - THREE.MathUtils.smoothstep(u, 0.82, 0.98));
    pos.y = Math.max(ground, THREE.MathUtils.lerp(this.start.y, this.land.y, e)) + lift * Math.max(22, Math.min(80, span * 0.12)) * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.5 + 0.2);
    const to = new THREE.Vector3().subVectors(this.land, this.start);
    if (to.lengthSq() > 1) this.yaw = Math.atan2(to.x, to.z);
    ch.root.position.copy(pos);
    ch.root.rotation.set(-lift * 0.08, this.yaw, 0);
    ch.root.updateMatrixWorld(true);
    ch.update(dt, 4, this.t, lift > 0.1);
    this.evening(19.5, dt * 0.25);
    // Seated in their own seats.
    for (const who of ['girl', 'boy'] as const) {
      const m = who === 'girl' ? tr.girl : tr.boy;
      ch.seat(who, m.root.position);
      m.root.position.y -= 0.05;
      m.root.rotation.set(0, this.yaw, 0);
      m.update(dt, { speed: 0, airborne: false, riding: true, t: this.t });
    }
    // Keep the travellers' logical positions with the chariot so the world streams in ahead.
    tr.gPos.copy(pos);
    tr.bPos.copy(pos).add(new THREE.Vector3(Math.cos(this.yaw) * 1.44, 0, -Math.sin(this.yaw) * 1.44));
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    camera.position.copy(pos).addScaledVector(fwd, -8.5).addScaledVector(side, 4 * Math.sin(this.t * 0.2)).add(new THREE.Vector3(0, 3.6, 0));
    camera.lookAt(pos.clone().addScaledVector(fwd, 5).add(new THREE.Vector3(0, 1.2, 0)));
  }

  /** Night at the castle: they walk up the aisle between cheering guests. */
  private venue(dt: number, k: number, camera: THREE.PerspectiveCamera): void {
    const g = this.g, tr = g.trav, ch = this.c.chariot, fest = this.c.festivities;
    if (!this.arrived) {
      this.arrived = true;
      this.evening(21, 1);
      fest.showCrowd();
      fest.level = 1;
      const x = CASTLE.aisle.x - 0.9, z = CAKE_SPOT.z + 20;
      tr.teleport(x, z);
      tr.heading = Math.PI;
      tr.camYaw = Math.PI;
      ch.root.position.set(CASTLE.landing.x + 5, this.land.y, CASTLE.landing.z + 3);
      ch.root.rotation.set(0, -Math.PI / 2, 0);
      tr.thread.group.visible = true;
    }
    // Walk up the aisle towards the cake at a gentle pace.
    const stopZ = CAKE_SPOT.z + 0.5;
    const walking = tr.gPos.z > stopZ;
    if (walking) {
      tr.gPos.z = Math.max(stopZ, tr.gPos.z - 1.6 * dt);
      tr.gPos.y = surfaceAt(tr.gPos.x, tr.gPos.z, tr.gPos.y + 2);
      tr.heading = Math.PI;
      tr.girl.update(dt, { speed: 1.6, airborne: false, riding: false, t: this.t });
    }
    ch.update(dt, 0, this.t, false);
    fest.cheerAt(tr.gPos);
    // Camera: in front of them, low, drifting back as they come.
    const look = tr.gPos.clone().add(new THREE.Vector3(0.9, 1.2, 0));
    camera.position.set(look.x + Math.sin(k * 0.15) * 3, look.y + 1.6, look.z - 8.5);
    camera.lookAt(look);
    if (k > CelebrationScene.END - CelebrationScene.ROOM && !walking) this.finish(false);
  }

  /** End the evening's cinematic. Skipping lands straight in the party, dressed, at night. */
  finish(skipped: boolean): void {
    if (this.done) return;
    this.done = true;
    const g = this.g, tr = g.trav;
    this.view = null;
    if (!this.dressed) {
      g.wear('girl', 'g-starlight-gown');
      g.wear('boy', 'b-celebration');
    }
    if (skipped || !this.arrived) {
      this.evening(21, 1);
      this.c.festivities.showCrowd();
      this.c.festivities.level = 1;
      tr.teleport(CASTLE.aisle.x - 0.9, CAKE_SPOT.z + 0.5);
      tr.heading = Math.PI;
      this.c.chariot.root.position.set(CASTLE.landing.x + 5, this.land.y, CASTLE.landing.z + 3);
      this.c.chariot.root.rotation.set(0, -Math.PI / 2, 0);
    }
    tr.camYaw = tr.heading;
    tr.thread.group.visible = true;
    this.overlay.classList.remove('show');
    document.body.classList.remove('cinematic');
    setTimeout(() => this.overlay.remove(), 700);
    this.onDone?.(skipped);
  }
}
