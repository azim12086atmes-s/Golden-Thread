import * as THREE from 'three';
import { ANIMAL_HEAD_GAP } from '../characters/anatomy';

/**
 * A friendly night dragon — sleek and night-black, cat-like and playful, with a big rounded head,
 * swept-back ear flaps, huge wings and twin tail fins. A loving nod to the black night dragons she
 * adores, drawn in this world's own way: like everyone here it has no eyes and no mouth, and its
 * head floats just clear of its neck. It loops over the party and breathes harmless glitter.
 */
const BODY = '#17181f', BELLY = '#22242e', WING = '#111218', PAW = '#1d1e26';

const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.15, flatShading: true, side: THREE.DoubleSide });

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

  constructor(scale = 1.6) {
    const body = new THREE.Group();
    body.scale.setScalar(scale);
    this.root.add(body);
    // A long, sleek body.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), std(BODY));
    torso.scale.set(0.72, 0.62, 1.9);
    body.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), std(BELLY));
    belly.scale.set(0.62, 0.5, 1.7);
    belly.position.y = -0.1;
    body.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 10), std(BODY));
    neck.rotation.x = Math.PI / 2.8;
    neck.position.set(0, 0.2, 1.02);
    body.add(neck);
    // Four legs tucked under in flight, with rounded paws.
    for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.55], [0.3, -0.55]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.42, 6), std(BODY));
      leg.position.set(x, -0.38, z);
      leg.rotation.x = 0.9;
      body.add(leg);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), std(PAW));
      paw.position.set(x, -0.5, z - 0.18);
      body.add(paw);
    }
    // Dorsal nubs along the spine.
    for (let i = 0; i < 9; i++) {
      const nub = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), std(WING));
      nub.position.set(0, 0.36 - Math.abs(i - 3) * 0.015, 0.8 - i * 0.2);
      nub.rotation.x = -0.4;
      body.add(nub);
    }
    // The floating head: big, round and cat-like, with a short rounded snout and swept-back ear
    // flaps. No eyes and no mouth, ever.
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), std(BODY));
    skull.scale.set(1.15, 0.85, 1.05);
    this.head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), std(BODY));
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
      const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape), std(WING));
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
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, 0.34, 7), std(BODY));
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
      const f = new THREE.Mesh(new THREE.ShapeGeometry(fin), std(WING));
      f.rotation.x = -Math.PI / 2;
      f.position.z = -0.2;
      parent.add(f);
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

  /** Fly a lazy figure-eight around `centre`, `height` metres up. */
  update(dt: number, t: number, centre: THREE.Vector3, height: number): void {
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
