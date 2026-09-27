import * as THREE from 'three';
import { ANIMAL_HEAD_GAP } from '../characters/anatomy';
import { skinMaterial } from '../animals/skins';

/**
 * A friendly night dragon — sleek and night-black, cat-like and playful, with a big rounded head,
 * swept-back ear flaps, huge wings and twin tail fins. A loving nod to the black night dragons she
 * adores, drawn in this world's own way: like everyone here it has no eyes and no mouth, and its
 * head floats just clear of its neck. It loops over the party and breathes harmless glitter.
 */
/** Saddle positions along the body (unscaled): hers in front, his behind. */
export const DRAGON_SADDLES = [0.35, -0.5] as const;
export const DRAGON_SCALE = 1.6;

const BODY = '#17181f', BELLY = '#22242e', WING = '#111218', PAW = '#1d1e26';

const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide });
/** The hide: overlapping black scales with a faint blue-violet sheen (skins.ts). */
const hide = (c: string) => skinMaterial(c, 'scale', { side: THREE.DoubleSide });
/** The wing membranes: thin, satiny, veined by the shader's scale rows seen edge-on. */
const membrane = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });

export class Dragon {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  private wings: THREE.Group[] = [];
  private tail: THREE.Group[] = [];
  /** Glitter breath: particles emitted from the head. */
  readonly breath: THREE.Points;
  private breathAge: Float32Array;
  private breathVel: Float32Array;
  private breathing = 0;
  /** Rider's seat height above the root (0 for the dragon that only flies over the party). */
  readonly saddleY: number;
  private phase = 0;

  /** `mount`: stands on the ground with a saddle, for riding. */
  constructor(scale = 1.6, mount = false) {
    const body = new THREE.Group();
    body.scale.setScalar(scale);
    this.root.add(body);
    if (mount) {
      body.position.y = 1.05;
      const gold = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f5c451').multiplyScalar(1.4), toneMapped: false });
      // Two separate saddles — hers in front, his behind — each with its own back-rest.
      for (const z of DRAGON_SADDLES) {
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.42), std('#f49ac1'));
        saddle.position.set(0, 0.36, z);
        body.add(saddle);
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.46), gold);
        rim.position.set(0, 0.32, z);
        body.add(rim);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.05), std('#f49ac1'));
        back.position.set(0, 0.48, z - 0.2);
        body.add(back);
      }
      // A carved divider between the two saddles.
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.05), gold);
      divider.position.set(0, 0.46, (DRAGON_SADDLES[0] + DRAGON_SADDLES[1]) / 2);
      body.add(divider);
    }
    this.saddleY = mount ? 1.05 + 0.41 * scale : 0;
    // A long, sleek body.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 16), hide(BODY));
    torso.scale.set(0.72, 0.62, 1.9);
    body.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), hide(BELLY));
    belly.scale.set(0.62, 0.5, 1.7);
    belly.position.y = -0.1;
    body.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 16), hide(BODY));
    neck.rotation.x = Math.PI / 2.8;
    neck.position.set(0, 0.2, 1.02);
    body.add(neck);
    // Four legs tucked under in flight, with rounded paws.
    for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.55], [0.3, -0.55]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.42, 10), hide(BODY));
      leg.position.set(x, -0.38, z);
      leg.rotation.x = 0.9;
      body.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), std(PAW));
      paw.position.set(x, -0.5, z - 0.18);
      body.add(paw);
    }
    // Dorsal nubs along the spine.
    // A row of dorsal plates down the spine, largest over the shoulders (like the night dragon she loves).
    for (let i = 0; i < 11; i++) {
      const k = 1 - Math.abs(i - 3) / 9;
      const nub = new THREE.Mesh(new THREE.ConeGeometry(0.05 * k + 0.02, 0.14 * k + 0.05, 5), std(WING));
      nub.scale.set(0.45, 1, 1.4);
      nub.position.set(0, 0.36 - Math.abs(i - 3) * 0.015, 0.85 - i * 0.18);
      nub.rotation.x = -0.5;
      body.add(nub);
    }
    // Its pattern: a line of softly glowing scales down the spine, and constellations of little
    // star-scales along each flank, teal and violet like the night sky it flies in.
    const starMat = (c: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.3), toneMapped: false });
    for (let i = 0; i < 10; i++) {
      const sc = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), starMat(i % 2 ? '#7affe0' : '#b99bff'));
      sc.scale.set(1, 0.5, 1.4);
      sc.position.set(0, 0.35 - Math.abs(i - 4) * 0.012, 0.9 - i * 0.2);
      body.add(sc);
    }
    for (const x of [-1, 1]) for (let i = 0; i < 9; i++) {
      const a = i * 0.7;
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.022 + (i % 3) * 0.008), starMat(i % 3 ? '#9ad8ff' : '#ffd6f0'));
      st.position.set(x * (0.36 + Math.sin(a) * 0.03), 0.02 + Math.sin(a * 1.3) * 0.12, 0.7 - i * 0.17);
      body.add(st);
    }
    // The floating head: big, round and cat-like, with a short rounded snout and swept-back ear
    // flaps. No eyes and no mouth, ever.
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 16), hide(BODY));
    skull.scale.set(1.15, 0.85, 1.05);
    this.head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12), hide(BODY));
    snout.scale.set(1.05, 0.62, 0.9);
    snout.position.set(0, -0.08, 0.26);
    this.head.add(snout);
    for (const s of [-1, 1]) {
      const big = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 4), std(BODY));
      big.scale.set(1, 1, 0.3);
      big.position.set(s * 0.22, 0.2, -0.26);
      big.rotation.set(-1.25, 0, s * 0.35);
      this.head.add(big);
      const small = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 4), std(BODY));
      small.scale.set(1, 1, 0.3);
      small.position.set(s * 0.33, 0.02, -0.18);
      small.rotation.set(-1.3, 0, s * 0.9);
      this.head.add(small);
    }
    this.head.position.set(0, 0.55 + ANIMAL_HEAD_GAP, 1.45);
    body.add(this.head);
    // Huge wings: four spars and a scalloped membrane, flapping from the shoulders.
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.1);
      shape.lineTo(s * 1.4, 0.45);
      shape.lineTo(s * 2.9, 0.1);
      shape.quadraticCurveTo(s * 2.4, -0.2, s * 2.1, -0.45);
      shape.quadraticCurveTo(s * 1.75, -0.35, s * 1.5, -0.8);
      shape.quadraticCurveTo(s * 1.1, -0.6, s * 0.85, -1.05);
      shape.quadraticCurveTo(s * 0.45, -0.7, 0, -0.75);
      shape.lineTo(0, 0.1);
      const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), membrane(WING));
      mem.rotation.x = -Math.PI / 2;
      w.add(mem);
      for (const [x, z] of [[1.4, -0.45], [2.9, -0.1], [1.5, 0.8], [0.85, 1.05]]) {
        const len = Math.hypot(x, z);
        const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, len, 5), std(BODY));
        // Point the spar from the shoulder to its tip (w is still unparented, so local = world).
        spar.position.set((s * x) / 2, 0.01, z / 2);
        spar.lookAt(s * x, 0.01, z);
        spar.rotateX(Math.PI / 2);
        w.add(spar);
      }
      w.position.set(s * 0.28, 0.22, 0.3);
      body.add(w);
      this.wings.push(w);
    }
    // A long tail ending in a pair of fins, both black.
    let parent: THREE.Object3D = body, z = -0.95;
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, i === 0 ? z : -0.3);
      const r = 0.2 * (1 - i / 9);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, 0.34, 12), hide(BODY));
      m.rotation.x = Math.PI / 2;
      m.position.z = -0.15;
      seg.add(m);
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
      z = 0;
    }
    for (const s of [-1, 1]) {
      const fin = new THREE.Shape();
      fin.moveTo(0, 0);
      fin.lineTo(s * 0.42, 0.12);
      fin.quadraticCurveTo(s * 0.4, -0.18, s * 0.08, -0.3);
      fin.lineTo(0, 0);
      // One fin is its own; the other a red leather-and-steel prosthetic, as on the dragon she loves.
      const f = new THREE.Mesh(new THREE.ShapeGeometry(fin, 8), s < 0 ? std('#a3202a') : membrane(WING));
      f.rotation.x = -Math.PI / 2;
      f.position.z = -0.2;
      parent.add(f);
      if (s < 0) for (const k of [0.3, 0.6]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.26), std('#8a8a96'));
        rib.position.set(-0.42 * k, 0, -0.2 - 0.04 + 0.12 * k * 0);
        rib.rotation.y = -0.6 + k;
        parent.add(rib);
      }
    }

    // Glitter breath.
    const n = 160;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    this.breathAge = new Float32Array(n).fill(99);
    this.breathVel = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.setHSL((i / n) * 0.9, 0.9, 0.7);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.breath = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.breath.frustumCulled = false;
  }

  /** As a mount: wings beat with speed (folded-ish at rest), tail and head sway. */
  update(dt: number, speed: number, t: number): void {
    this.phase += dt * (speed > 8 ? 5.5 : speed > 0.2 ? 2.5 : 1.2);
    const amp = speed > 8 ? 0.65 : speed > 0.2 ? 0.25 : 0.08;
    const flap = Math.sin(this.phase);
    this.wings[0].rotation.z = (speed > 8 ? 0 : -0.35) + flap * amp;
    this.wings[1].rotation.z = (speed > 8 ? 0 : 0.35) - flap * amp;
    this.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 2 - i * 0.6) * 0.15; });
    this.head.rotation.x = Math.sin(t * 1.3) * 0.08;
  }

  /** Fly a lazy figure-eight around `centre`, `height` metres up. */
  fly(dt: number, t: number, centre: THREE.Vector3, height: number): void {
    const a = t * 0.28;
    const p = new THREE.Vector3(centre.x + Math.sin(a) * 34, centre.y + height + Math.sin(a * 2) * 6, centre.z + Math.sin(a * 2) * 16 - 6);
    const ahead = new THREE.Vector3(centre.x + Math.sin(a + 0.05) * 34, centre.y + height + Math.sin((a + 0.05) * 2) * 6, centre.z + Math.sin((a + 0.05) * 2) * 16 - 6);
    this.root.position.copy(p);
    this.root.lookAt(ahead);
    this.root.rotateZ(Math.cos(a) * 0.35);
    const flap = Math.sin(t * 5.5);
    this.wings[0].rotation.z = flap * 0.6;
    this.wings[1].rotation.z = -flap * 0.6;
    this.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 2.4 - i * 0.6) * 0.18; });
    this.head.rotation.x = Math.sin(t * 1.3) * 0.1;

    // Every few seconds, a plume of glitter.
    this.breathing = (t % 7) < 1.6 ? 1 : 0;
    const pos = this.breath.geometry.attributes.position as THREE.BufferAttribute;
    const hw = this.head.getWorldPosition(new THREE.Vector3());
    const fwd = ahead.sub(p).normalize();
    for (let i = 0; i < this.breathAge.length; i++) {
      this.breathAge[i] += dt;
      if (this.breathAge[i] > 1.6 && this.breathing && Math.random() < 0.25) {
        this.breathAge[i] = 0;
        pos.setXYZ(i, hw.x, hw.y, hw.z);
        this.breathVel.set([fwd.x * 9 + (Math.random() - 0.5) * 3, fwd.y * 9 + (Math.random() - 0.5) * 3, fwd.z * 9 + (Math.random() - 0.5) * 3], i * 3);
      }
      if (this.breathAge[i] > 1.6) { pos.setXYZ(i, 0, -9999, 0); continue; }
      pos.setXYZ(i, pos.getX(i) + this.breathVel[i * 3] * dt, pos.getY(i) + this.breathVel[i * 3 + 1] * dt - dt * 0.5, pos.getZ(i) + this.breathVel[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
  }
}
