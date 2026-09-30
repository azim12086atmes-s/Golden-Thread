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
/** Saddle positions along the body (unscaled): his in front (he drives), hers behind (owner, 2026-09-29). */
export const DRAGON_SADDLES = [0.35, -0.5] as const;
/** The Light Fury's four saddles in a row, one each for the brothers and sisters or the children (unscaled). */
export const CHILD_SADDLES = [0.3, -0.12, -0.54, -0.96] as const;
export const DRAGON_SCALE = 1.6;

export const NIGHT_DRAGON: DragonSpec = {
  id: 'night-dragon', name: 'the Night Dragon', plan: 'wyrm', build: 'cat', length: 7.2, girth: 0.6, neck: 0.14,
  head: 'night', crestKind: 'plates', tail: 'twin', scales: 'shingle',
  back: '#1a1b23', side: '#22232d', belly: '#2c2e3a', rim: '#2e3244',
  crest: ['#111218', '#1a1b24'], mane: ['#111218'], claw: '#7a7e8c', horn: '#17181f',
  wings: { span: 10.4, membrane: '#15161e', bone: '#1c1d26', hind: 0.4 },
  runes: '#7affe0', stars: ['#9ad8ff', '#ffd6f0', '#b99bff'], prosthetic: '#a3202a', aura: '#3f9cff',
};

/**
 * The Light Fury, the Night Dragon's betrothed, who flies beside him carrying the children (owner,
 * 2026-09-29): the same cat-like build, a little slimmer and longer in the neck; smooth pearl-white
 * skin with a lilac-and-blue sheen, no scales and no spines down her back; a smaller, rounder head
 * with short rounded ear nubs; broad white wings ribbed like fans; a long tail with a small pair of
 * fins partway along and a heart of two broad ribbed lobes at the tip. No eyes, no mouth; her head
 * floats clear like his.
 */
export const LIGHT_DRAGON: DragonSpec = {
  id: 'light-fury', name: 'the Light Fury', plan: 'wyrm', build: 'cat', length: 7.2, girth: 0.58, neck: 0.16,
  head: 'light', crestKind: 'none', tail: 'heart', scales: 'smooth',
  back: '#eceff6', side: '#f3f4f9', belly: '#e6e8f1', rim: '#c9bfe6',
  crest: ['#eef0f7', '#e6eaf4'], mane: ['#eef0f7'], claw: '#b4b8c8', horn: '#eceff6',
  wings: { span: 11.4, membrane: '#f4f6fb', bone: '#e2e6f0', hind: 0.3, ribs: 3 }, aura: '#cfc2ff',
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
  /** How folded its wings are: folded at rest, opening as it takes off. */
  private fold = 1;
  /** How hard it is turning (+ left) and climbing, eased, from how its frame moves; and the last frame. */
  private steer = 0;
  private climb = 0;
  private lastYaw: number | null = null;
  /**
   * Where it looks while resting on the ground (radians, + to its left; the Light Fury turns to
   * him), besides looking gently about. Riding, the head only leads the turns.
   */
  gaze = 0;
  private gazeNow = 0;
  private lastY = 0;
  private euler = new THREE.Euler();
  /** Glitter breath: particles blown from the head. */
  readonly breath: THREE.Points;
  private breathAge: Float32Array;
  private breathVel: Float32Array;

  /** The saddles' frame: where each saddle sits (for seating riders on the Light Fury). */
  private tack: THREE.Group | null = null;
  private saddles: readonly number[] = [];

  /**
   * `mount`: with saddles, for riding — the Night Dragon's two (his and hers), or, for the white
   * Light Fury (`light`), four small ones for the children, each its own.
   */
  constructor(scale = DRAGON_SCALE, mount = false, light = false) {
    this.model = new DragonModel(light ? LIGHT_DRAGON : NIGHT_DRAGON);
    this.root.add(this.model.group);
    if (mount && light) {
      const tack = this.tack = new THREE.Group();
      tack.scale.setScalar(scale);
      tack.position.y = 1.05;
      this.root.add(tack);
      this.saddles = CHILD_SADDLES;
      const silver = new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe8f5').multiplyScalar(1.2), toneMapped: false });
      const part = (m: THREE.Mesh) => { m.userData.part = 'accessory'; tack.add(m); return m; };
      // Four small saddles in sky blue on silver, each with its own back-rest, a low divider between each.
      CHILD_SADDLES.forEach((z, i) => {
        part(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.34), std('#8cc4ec'))).position.set(0, 0.36, z);
        part(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.38), silver)).position.set(0, 0.32, z);
        part(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.04), std('#8cc4ec'))).position.set(0, 0.46, z - 0.17);
        const strap = part(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 5, 20, Math.PI), std('#5a7aa0')));
        strap.position.set(0, 0.1, z);
        strap.scale.set(1, 0.8, 1);
        if (i > 0) part(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.04), silver)).position.set(0, 0.42, (z + CHILD_SADDLES[i - 1]) / 2);
      });
    } else if (mount) {
      const tack = this.tack = new THREE.Group();
      tack.scale.setScalar(scale);
      tack.position.y = 1.05;
      this.root.add(tack);
      this.saddles = DRAGON_SADDLES;
      const gold = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f5c451').multiplyScalar(1.4), toneMapped: false });
      const part = (m: THREE.Mesh) => { m.userData.part = 'accessory'; tack.add(m); return m; };
      // Two separate saddles — his in front, hers behind — each with its own back-rest.
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

  /** How many saddles it carries. */
  get seatCount(): number { return this.saddles.length; }

  /** The top of saddle `i` (world), for seating a rider; call after the root is placed. */
  seatPoint(i: number, out: THREE.Vector3): THREE.Vector3 {
    if (!this.tack) return out.copy(this.root.position);
    this.root.updateMatrixWorld();
    return this.tack.localToWorld(out.set(0, 0.4, this.saddles[Math.min(i, this.saddles.length - 1)]));
  }

  /** As a mount: wings beat with speed (held half-open at rest), the tail sways, the head bobs. */
  update(dt: number, speed: number, t: number): void {
    this.phase += dt * (speed > 8 ? 5.5 : speed > 0.2 ? 2.5 : 1.2);
    const amp = speed > 8 ? 0.65 : speed > 0.2 ? 0.3 : 0.1;
    const want = speed > 8 ? 0 : speed > 0.2 ? 0.35 : 1;
    this.fold += (want - this.fold) * Math.min(1, dt * 2.5);
    // Read the turn and the climb from how the rider has moved it since the last frame.
    const yaw = this.euler.setFromQuaternion(this.root.quaternion, 'YXZ').y, y = this.root.position.y;
    if (this.lastYaw !== null && dt > 0) {
      const turn = Math.atan2(Math.sin(yaw - this.lastYaw), Math.cos(yaw - this.lastYaw)) / dt;
      const k = 1 - Math.exp(-dt * 4);
      this.steer += (THREE.MathUtils.clamp(turn / 1.6, -1, 1) - this.steer) * k;
      this.climb += (THREE.MathUtils.clamp((y - this.lastY) / dt / 10, -1, 1) - this.climb) * k;
    }
    this.lastYaw = yaw; this.lastY = y;
    // Resting (wings folded), it looks about now and then, and towards whatever it is watching.
    const rest = THREE.MathUtils.smoothstep(this.fold, 0.6, 1);
    const about = Math.sin(t * 0.31 + this.model.spec.length) * 0.45 + Math.sin(t * 0.83) * 0.15;
    this.gazeNow += (THREE.MathUtils.clamp(this.gaze + about * (this.gaze ? 0.4 : 1), -0.8, 0.8) * rest - this.gazeNow) * Math.min(1, dt * 1.5);
    perch(this.model, t, BODY_Y, NECK_Z, (speed > 8 ? 0.05 : 0.3) + Math.sin(this.phase) * amp, 0.45, 0.55 - 0.3 * (1 - this.fold), this.fold, this.steer, this.climb, this.gazeNow);
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
