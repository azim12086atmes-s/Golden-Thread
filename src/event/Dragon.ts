import * as THREE from 'three';
import { DragonModel, fly, perch, type DragonSpec, type Flight } from '../creatures/dragonKit';

/**
 * The Night Dragon you ride — sleek and night-black, cat-like and playful, in the spirit of the
 * black night dragons she adores: a big, broad, rounded head with two large ear flaps swept back
 * and smaller ones below them, a short thick neck, a deep compact body on sturdy legs, huge bat
 * wings from the shoulders with a smaller pair over the hips, and a thick tail with a small pair
 * of fins partway along and twin fins at its tip (one of them a red leather-and-steel
 * prosthetic). Built from the dragon kit (creatures/dragonKit.ts, the 'cat' build) like every
 * dragon in the world: one continuous scaled body, jointed wings of finger bones and membrane,
 * low plates and a line of glowing scales down the spine, star-scales along its flanks. Like
 * everyone here it has no eyes and no mouth, and its head floats just clear of its neck. Over
 * the celebration it loops a figure-eight and breathes harmless glitter.
 */
/** Saddle positions along the body (unscaled): hers in front, his behind. */
export const DRAGON_SADDLES = [0.35, -0.5] as const;
export const DRAGON_SCALE = 1.6;

export const NIGHT_DRAGON: DragonSpec = {
  id: 'night-dragon', name: 'the Night Dragon', plan: 'wyrm', build: 'cat', length: 7.2, girth: 0.6, neck: 0.14,
  head: 'night', crestKind: 'plates', tail: 'twin', scales: 'shingle',
  back: '#17181f', side: '#1d1e27', belly: '#262833', rim: '#3a4060',
  crest: ['#111218', '#1a1b24'], mane: ['#111218'], claw: '#2a2b36', horn: '#17181f',
  wings: { span: 10.4, membrane: '#15161e', bone: '#1c1d26', hind: 0.4 },
  runes: '#7affe0', stars: ['#9ad8ff', '#ffd6f0', '#b99bff'],
};

/** Where the body sits under the saddles: the neck's height and how far forward it starts. */
const BODY_Y = 1.02, NECK_Z = 1.68;

const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide });

export class Dragon {
  readonly root = new THREE.Group();
  readonly model: DragonModel;
  /** Rider's seat height above the root (0 for a dragon that only flies). */
  readonly saddleY: number;
  private phase = 0;
  /** Glitter breath: particles blown from the head. */
  readonly breath: THREE.Points;
  private breathAge: Float32Array;
  private breathVel: Float32Array;

  /** `mount`: with two saddles, for riding. */
  constructor(scale = DRAGON_SCALE, mount = false) {
    this.model = new DragonModel(NIGHT_DRAGON);
    this.root.add(this.model.group);
    if (mount) {
      const tack = new THREE.Group();
      tack.scale.setScalar(scale);
      tack.position.y = 1.05;
      this.root.add(tack);
      const gold = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f5c451').multiplyScalar(1.4), toneMapped: false });
      const part = (m: THREE.Mesh) => { m.userData.part = 'accessory'; tack.add(m); return m; };
      // Two separate saddles — hers in front, his behind — each with its own back-rest.
      for (const z of DRAGON_SADDLES) {
        part(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.42), std('#f49ac1'))).position.set(0, 0.36, z);
        part(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.46), gold)).position.set(0, 0.32, z);
        part(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.05), std('#f49ac1'))).position.set(0, 0.48, z - 0.2);
        // A girth strap round the body under each saddle.
        const strap = part(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 5, 20, Math.PI), std('#6a3a4a')));
        strap.position.set(0, 0.1, z);
        strap.scale.set(1, 0.8, 1);
      }
      // A carved divider between the two saddles.
      part(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.05), gold)).position.set(0, 0.46, (DRAGON_SADDLES[0] + DRAGON_SADDLES[1]) / 2);
    }
    this.saddleY = mount ? 1.05 + 0.41 * scale : 0;
    // Glitter breath, every colour of the rainbow.
    const n = 160, col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { c.setHSL((i / n) * 0.9, 0.9, 0.7); col.set([c.r, c.g, c.b], i * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-9999), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.breath = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.breath.frustumCulled = false;
    this.breathAge = new Float32Array(n).fill(99);
    this.breathVel = new Float32Array(n * 3);
    this.update(0, 0, 0);
  }

  /** As a mount: wings beat with speed (held half-open at rest), the tail sways, the head bobs. */
  update(dt: number, speed: number, t: number): void {
    this.phase += dt * (speed > 8 ? 5.5 : speed > 0.2 ? 2.5 : 1.2);
    const amp = speed > 8 ? 0.65 : speed > 0.2 ? 0.3 : 0.1;
    perch(this.model, t, BODY_Y, NECK_Z, (speed > 8 ? 0.05 : 0.3) + Math.sin(this.phase) * amp, 0.45, 0.3);
    this.model.head.rotateX(Math.sin(t * 1.3) * 0.08);
  }

  /** Fly a lazy figure-eight round `centre`, `height` metres up (world), breathing glitter now and then. */
  fly(dt: number, t: number, centre: THREE.Vector3, height: number): void {
    const f: Flight = {
      scale: 36, speed: 10, ripple: 0.25,
      path: (phi, out) => out.set(centre.x + Math.sin(phi) * 34, centre.y + height + Math.sin(phi * 2) * 6, centre.z + Math.sin(phi * 2) * 16 - 6),
    };
    fly(this.model, f, t);
    // Every few seconds, a plume of glitter from just ahead of the head.
    const breathing = (t % 7) < 1.6;
    const pos = this.breath.geometry.getAttribute('position') as THREE.BufferAttribute;
    const hw = this.model.head.position, fwd = this.model.T[0];
    for (let i = 0; i < this.breathAge.length; i++) {
      this.breathAge[i] += dt;
      if (this.breathAge[i] > 1.6 && breathing && Math.random() < 0.25) {
        this.breathAge[i] = 0;
        pos.setXYZ(i, hw.x + fwd.x, hw.y + fwd.y, hw.z + fwd.z);
        this.breathVel.set([fwd.x * 9 + (Math.random() - 0.5) * 3, fwd.y * 9 + (Math.random() - 0.5) * 3, fwd.z * 9 + (Math.random() - 0.5) * 3], i * 3);
      }
      if (this.breathAge[i] > 1.6) { pos.setXYZ(i, 0, -9999, 0); continue; }
      pos.setXYZ(i, pos.getX(i) + this.breathVel[i * 3] * dt, pos.getY(i) + this.breathVel[i * 3 + 1] * dt - dt * 0.5, pos.getZ(i) + this.breathVel[i * 3 + 2] * dt);
    }
    pos.needsUpdate = true;
  }
}
