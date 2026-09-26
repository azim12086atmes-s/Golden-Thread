import * as THREE from 'three';
import { ANIMAL_HEAD_GAP } from '../characters/anatomy';

/**
 * A friendly night dragon — the game's own design: sleek and deep violet, freckled with glowing
 * stars, with broad bat-like wings and a tail fin. Like everyone in this world it has no eyes and
 * its head floats just clear of its neck. It loops over the party and, now and then, breathes a
 * harmless plume of glitter.
 */
const BODY = '#3a2a6b', BELLY = '#5b4a9a', WING = '#2a1f52', GLOW = '#b9a3ff';

const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true, side: THREE.DoubleSide });
const glowMat = (c: string) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false });

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
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), std(BODY));
    torso.scale.set(0.8, 0.7, 1.8);
    body.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6), std(BELLY));
    belly.scale.set(0.7, 0.55, 1.6);
    belly.position.y = -0.12;
    body.add(belly);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.8, 8), std(BODY));
    neck.rotation.x = Math.PI / 2.6;
    neck.position.set(0, 0.28, 1.05);
    body.add(neck);
    // The floating head: rounded, with swept-back horns and ear fins. No eyes, ever.
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), std(BODY));
    skull.scale.set(0.95, 0.8, 1.25);
    this.head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), std(BELLY));
    snout.scale.set(0.9, 0.6, 1.1);
    snout.position.set(0, -0.05, 0.3);
    this.head.add(snout);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), std(BELLY));
      horn.position.set(s * 0.14, 0.18, -0.2);
      horn.rotation.x = -1.1;
      this.head.add(horn);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), std(WING));
      fin.position.set(s * 0.28, 0.05, -0.1);
      fin.rotation.z = s * 1.2;
      this.head.add(fin);
    }
    this.head.position.set(0, 0.62 + ANIMAL_HEAD_GAP, 1.55);
    body.add(this.head);
    // Wings: a fan of three spars with a membrane, flapping from the shoulders.
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(s * 1.8, 0.35);
      shape.lineTo(s * 2.4, -0.1);
      shape.quadraticCurveTo(s * 1.8, -0.25, s * 1.55, -0.55);
      shape.quadraticCurveTo(s * 1.1, -0.4, s * 0.9, -0.85);
      shape.quadraticCurveTo(s * 0.5, -0.5, 0, -0.6);
      shape.lineTo(0, 0);
      const mem = new THREE.Mesh(new THREE.ShapeGeometry(shape), std(WING));
      mem.rotation.x = -Math.PI / 2;
      w.add(mem);
      w.position.set(s * 0.3, 0.25, 0.35);
      body.add(w);
      this.wings.push(w);
    }
    // Tail: a chain of shrinking segments ending in a fin.
    let parent: THREE.Object3D = body, z = -0.9;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, 0, i === 0 ? z : -0.34);
      const r = 0.2 * (1 - i / 7);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 0.38, 6), std(BODY));
      m.rotation.x = Math.PI / 2;
      m.position.z = -0.17;
      seg.add(m);
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
      z = 0;
    }
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 3), std(WING));
    tailFin.rotation.x = -Math.PI / 2;
    tailFin.scale.set(1.6, 1, 0.2);
    tailFin.position.z = -0.4;
    parent.add(tailFin);
    // Star freckles along the back.
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glowMat(GLOW));
      f.position.set(Math.sin(i * 2.4) * 0.3, 0.35 + Math.cos(i * 1.7) * 0.05, 0.9 - i * 0.13);
      body.add(f);
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
