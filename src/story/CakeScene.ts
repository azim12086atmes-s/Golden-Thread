import * as THREE from 'three';
import type { Game } from '../Game';
import { surfaceAt } from '../world/terrain';

/**
 * The opening: under the Great Oak, a small celebration before the road. A blade of the golden
 * thread's light cuts the cake, and he offers her the first piece — it floats across the gap
 * between them on its own, so they never touch — and the thread shines brighter.
 *
 * Plays once on a new journey (flag `cake`), can be replayed from Help, and can always be skipped.
 */

const SPONGE = '#f3d49a', CREAM = '#fff8ef', ROSE = '#f7b8cc', GOLD = '#f5c451', CLOTH = '#fbf4e6';
const WEDGE = Math.PI / 4;

const mat = new Map<string, THREE.Material>();
function m(color: string, glow = false): THREE.Material {
  const k = color + glow;
  if (!mat.has(k)) mat.set(k, glow
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, side: THREE.DoubleSide }));
  return mat.get(k)!;
}
const mesh = (geo: THREE.BufferGeometry, color: string, glow = false) => {
  const x = new THREE.Mesh(geo, m(color, glow));
  x.castShadow = !glow;
  return x;
};

/** A cylinder sector with its two cut faces closed — sponge inside, a cream stripe through it. */
function sector(r: number, h: number, start: number, len: number, outside: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, false, start, len), outside));
  for (const a of [start, start + len]) {
    const face = new THREE.Group();
    const sponge = mesh(new THREE.PlaneGeometry(r, h), SPONGE);
    sponge.position.x = r / 2;
    const stripe = mesh(new THREE.PlaneGeometry(r * 0.98, h * 0.14), CREAM);
    stripe.position.set(r / 2, 0, 0.001);
    const stripe2 = stripe.clone();
    stripe2.position.z = -0.001;
    face.add(sponge, stripe, stripe2);
    // CylinderGeometry measures theta from +z towards +x; the face plane lies along local +x.
    face.rotation.y = a - Math.PI / 2;
    g.add(face);
  }
  return g;
}

function buildTable(): { table: THREE.Group; cakeTop: number } {
  const t = new THREE.Group();
  const top = 0.78;
  t.add(mesh(new THREE.CylinderGeometry(0.5, 0.53, 0.22, 36, 1, true).translate(0, top - 0.1, 0), CLOTH));
  t.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 36).translate(0, top, 0), CLOTH));
  t.add(mesh(new THREE.TorusGeometry(0.53, 0.012, 6, 48).rotateX(Math.PI / 2).translate(0, top - 0.21, 0), GOLD, true));
  t.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, top - 0.3, 10).translate(0, (top - 0.3) / 2, 0), '#8a5a3a'));
  t.add(mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.025, 36).translate(0, top + 0.032, 0), GOLD));
  return { table: t, cakeTop: top + 0.045 };
}

interface Beat { at: number; text?: string }

export class CakeScene {
  private group = new THREE.Group();
  private slice: THREE.Group;
  private blade: THREE.Mesh;
  private sparks: THREE.Mesh[] = [];
  private t = 0;
  private tablePos = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private mid = new THREE.Vector3();
  private slicePos = new THREE.Vector3();
  private sliceHome = new THREE.Vector3();
  private handPos = new THREE.Vector3();
  private headPos = new THREE.Vector3();
  private overlay = document.createElement('div');
  private caption = document.createElement('p');
  private beats: Beat[];
  private beat = -1;
  private done = false;
  private savedYaw = 0;
  onDone?: () => void;

  static readonly LENGTH = 17;

  constructor(private g: Game) {
    const { girl, boy } = g.st.names;
    this.beats = [
      { at: 0.4, text: 'The morning the journey begins, under the Great Oak.' },
      { at: 4.2, text: 'Before the road — a small celebration.' },
      { at: 8.2, text: `${boy} offers ${girl} the first piece…` },
      { at: 12.8, text: '…and the golden thread between them shines a little brighter.' },
      { at: 16.2 },
    ];

    // Where: in front of the two travellers, between them.
    const tr = g.trav;
    this.mid.copy(tr.gPos).add(tr.bPos).multiplyScalar(0.5);
    this.fwd.set(Math.sin(tr.heading), 0, Math.cos(tr.heading));
    this.tablePos.copy(this.mid).addScaledVector(this.fwd, 1.25);
    this.tablePos.y = surfaceAt(this.tablePos.x, this.tablePos.z, this.mid.y + 2);

    const { table, cakeTop } = buildTable();
    this.group.add(table);

    // The cake: a two-tier cream cake with rose piping and a gold ribbon, one wedge to be cut.
    const cake = new THREE.Group();
    cake.position.y = cakeTop;
    cake.scale.setScalar(1.5);
    const r1 = 0.27, h1 = 0.17, r2 = 0.18, h2 = 0.14;
    const rest = sector(r1, h1, WEDGE, Math.PI * 2 - WEDGE, CREAM);
    rest.position.y = h1 / 2;
    cake.add(rest);
    this.slice = sector(r1, h1, 0, WEDGE, CREAM);
    // A rose on the slice, so the piece that floats is recognisably the special one.
    const sliceRose = mesh(new THREE.SphereGeometry(0.03, 8, 6), ROSE);
    sliceRose.position.set(Math.sin(WEDGE / 2) * r1 * 0.7, h1 / 2 + 0.02, Math.cos(WEDGE / 2) * r1 * 0.7);
    this.slice.add(sliceRose);
    this.slice.position.y = h1 / 2;
    cake.add(this.slice);
    const upper = mesh(new THREE.CylinderGeometry(r2, r2, h2, 36), ROSE);
    upper.position.y = h1 + h2 / 2;
    cake.add(upper);
    cake.add(mesh(new THREE.TorusGeometry(r2 + 0.004, 0.012, 6, 40).rotateX(Math.PI / 2).translate(0, h1 + 0.03, 0), GOLD, true));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const bead = mesh(new THREE.SphereGeometry(0.018, 6, 5), CREAM);
      bead.position.set(Math.sin(a) * r2, h1 + h2, Math.cos(a) * r2);
      cake.add(bead);
      if (i % 2) continue;
      const rose = mesh(new THREE.SphereGeometry(0.026, 7, 5), i % 4 ? ROSE : '#ffffff');
      rose.position.set(Math.sin(a + 0.2) * (r1 - 0.02), h1 + 0.01, Math.cos(a + 0.2) * (r1 - 0.02));
      if (a > WEDGE) cake.add(rose);
    }
    // A tiny lantern-star on top: the thread's light, waiting.
    const star = mesh(new THREE.OctahedronGeometry(0.045), GOLD, true);
    star.position.y = h1 + h2 + 0.09;
    star.name = 'star';
    star.userData.y = star.position.y;
    cake.add(star);
    this.group.add(cake);

    // The blade is light, not steel: a thin sliver of the thread's gold.
    this.blade = mesh(new THREE.BoxGeometry(0.01, 0.5, 0.44), GOLD, true);
    this.blade.visible = false;
    this.group.add(this.blade);

    for (let i = 0; i < 26; i++) {
      const s = mesh(new THREE.SphereGeometry(0.02, 6, 4), i % 3 ? GOLD : ROSE, true);
      s.visible = false;
      this.sparks.push(s);
      g.scene.add(s);
    }

    this.group.position.copy(this.tablePos);
    // Turn the table so the wedge faces the boy.
    const toBoy = new THREE.Vector3().subVectors(tr.bPos, this.tablePos);
    this.group.rotation.y = Math.atan2(toBoy.x, toBoy.z) - WEDGE / 2;
    g.scene.add(this.group);
    this.group.updateMatrixWorld(true);
    this.slice.getWorldPosition(this.sliceHome);

    // Letterbox, caption and a skip button (DOM, never text in WebGL).
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
    this.savedYaw = tr.camYaw;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Runs after the gameplay camera has updated, and takes the camera over. */
  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.done) return;
    this.t += dt;
    const t = this.t, g = this.g, tr = g.trav;
    if (g.input.hit('escape')) return this.finish();

    // Captions.
    while (this.beat + 1 < this.beats.length && t >= this.beats[this.beat + 1].at) {
      this.beat++;
      const text = this.beats[this.beat].text;
      this.caption.classList.remove('show');
      if (text) {
        this.caption.textContent = text;
        void this.caption.offsetWidth;
        this.caption.classList.add('show');
      }
    }

    // For the offering they turn towards each other — still a full step apart, never touching.
    const turn = THREE.MathUtils.smoothstep(t, 7.2, 8.4) * (1 - THREE.MathUtils.smoothstep(t, 13.6, 14.8)) * 0.7;
    if (turn > 0) {
      const toG = Math.atan2(tr.gPos.x - tr.bPos.x, tr.gPos.z - tr.bPos.z);
      const face = (m: THREE.Object3D, yaw: number) => { m.rotation.y += Math.atan2(Math.sin(yaw - m.rotation.y), Math.cos(yaw - m.rotation.y)) * turn; };
      face(tr.boy.root, toG);
      face(tr.girl.root, toG + Math.PI);
      tr.boy.root.updateMatrixWorld(true);
      tr.girl.root.updateMatrixWorld(true);
    }
    tr.boy.offer = THREE.MathUtils.smoothstep(t, 7.6, 8.6) * (1 - THREE.MathUtils.smoothstep(t, 13.2, 14.2));
    const star = this.group.getObjectByName('star');
    if (star) {
      star.rotation.y += dt * 1.5;
      star.position.y = star.userData.y + Math.sin(t * 2) * 0.015;
    }

    // 4.8 – 7.0 s: the blade of light descends and cuts; the slice eases out.
    const cut = THREE.MathUtils.clamp((t - 4.8) / 2.2, 0, 1);
    this.blade.visible = cut > 0 && cut < 1;
    if (this.blade.visible) {
      const a = this.group.rotation.y;
      // Along the wedge's first edge, sweeping down.
      const edge = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const e = cut < 0.5 ? cut * 2 : (cut - 0.5) * 2;
      const along = cut < 0.5 ? edge : new THREE.Vector3(Math.sin(a + WEDGE), 0, Math.cos(a + WEDGE));
      this.blade.position.copy(along).multiplyScalar(0.21).setY(0.82 + 0.5 - Math.sin(e * Math.PI) * 0.34);
      this.blade.rotation.y = Math.atan2(along.x, along.z) + Math.PI / 2;
      for (let i = 0; i < 6; i++) this.spark(i, this.blade.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.2, 0)), t);
    }

    // The slice's flight: out of the cake (7.0), up to float above his open hand (8.4–9.4),
    // across the gap to her (9.4–12.4), then it is tasted and becomes light (12.4–13.4).
    tr.boy.freeHand(this.handPos).y += 0.12;
    this.headPos.copy(tr.girl.head.getWorldPosition(new THREE.Vector3())).addScaledVector(new THREE.Vector3().subVectors(tr.bPos, tr.gPos).setY(0).normalize(), 0.3);
    this.headPos.y -= 0.08;
    let p = this.slicePos.copy(this.sliceHome);
    let scale = 1;
    if (t > 7.0) {
      const out = this.sliceHome.clone().add(new THREE.Vector3(0, 0.12, 0)).addScaledVector(new THREE.Vector3().subVectors(tr.bPos, this.tablePos).setY(0).normalize(), 0.1);
      const k1 = THREE.MathUtils.smoothstep(t, 7.0, 8.4), k2 = THREE.MathUtils.smoothstep(t, 8.4, 9.4), k3 = THREE.MathUtils.smoothstep(t, 9.6, 12.4);
      p = new THREE.Vector3().lerpVectors(this.sliceHome, out, k1).lerp(this.handPos, k2);
      if (k3 > 0) {
        p.lerpVectors(this.handPos, this.headPos, k3);
        p.y += Math.sin(k3 * Math.PI) * 0.45;
      }
      p.y += Math.sin(t * 3) * 0.02 * (t > 8.4 ? 1 : 0);
      scale = 1 - THREE.MathUtils.smoothstep(t, 12.4, 13.3);
      if (t > 8.4 && scale > 0) for (let i = 6; i < 16; i++) this.spark(i, p, t);
      if (t > 12.4) for (let i = 16; i < 26; i++) this.spark(i, this.headPos, t, 1 + (t - 12.4) * 1.6);
      this.slice.position.copy(this.slice.parent!.worldToLocal(p.clone()));
      this.slice.rotation.y = t > 8.4 ? (t - 8.4) * 0.8 : 0;
      this.slice.scale.setScalar(Math.max(0.001, scale));
      this.slice.visible = scale > 0.01;
    }
    if (t > 12.4 && !g.st.flags.includes('cake')) {
      g.st.flags.push('cake');
      g.st.light += 0.5;
    }
    if (t > 13.6) for (const s of this.sparks) s.visible = false;

    // Camera: a slow arc from the wide oak shot in to the table, a two-shot for the offering,
    // then back to the gameplay view behind them.
    const side = new THREE.Vector3(-this.fwd.z, 0, this.fwd.x);
    const look = this.mid.clone().setY(this.mid.y + 1.0).lerp(this.tablePos.clone().setY(this.tablePos.y + 0.9), 0.35);
    const k = THREE.MathUtils.smoothstep(t, 0, 4.5);
    const arc = (1 - k) * 1.1 + Math.sin(t * 0.25) * 0.08;
    const dist = THREE.MathUtils.lerp(11.5, 5.4, k) - THREE.MathUtils.smoothstep(t, 7.5, 9.5) * 0.9;
    const height = THREE.MathUtils.lerp(5.5, 1.9, k);
    const dir = this.fwd.clone().multiplyScalar(Math.cos(arc)).addScaledVector(side, Math.sin(arc));
    const shot = look.clone().addScaledVector(dir, dist).setY(look.y + height);
    const back = THREE.MathUtils.smoothstep(t, 14.2, 16.4);
    if (back > 0) {
      tr.camYaw = this.savedYaw;
      camera.position.lerpVectors(shot, camera.position, back);
    } else camera.position.copy(shot);
    camera.lookAt(look.lerp(this.mid.clone().setY(this.mid.y + 1.2), back));

    if (t >= CakeScene.LENGTH) this.finish();
  }

  private spark(i: number, at: THREE.Vector3, t: number, spread = 1): void {
    const s = this.sparks[i];
    const ph = (t * 1.7 + i * 0.37) % 1;
    s.visible = true;
    s.position.set(
      at.x + Math.sin(i * 12.9 + t * 2) * 0.12 * spread,
      at.y + ph * 0.35 * spread - 0.05,
      at.z + Math.cos(i * 7.3 + t * 2) * 0.12 * spread,
    );
    s.scale.setScalar((1 - ph) * 1.2);
  }

  finish(): void {
    if (this.done) return;
    this.done = true;
    const g = this.g;
    if (!g.st.flags.includes('cake')) {
      g.st.flags.push('cake');
      g.st.light += 0.5;
    }
    g.trav.boy.offer = 0;
    g.trav.camYaw = this.savedYaw;
    g.scene.remove(this.group);
    for (const s of this.sparks) g.scene.remove(s);
    this.overlay.classList.remove('show');
    document.body.classList.remove('cinematic');
    setTimeout(() => this.overlay.remove(), 700);
    this.onDone?.();
  }
}
