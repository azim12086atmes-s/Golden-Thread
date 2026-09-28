import * as THREE from 'three';

/**
 * The flying carpet: whenever the two fly — on the cape of light, the dragon, the plane or a
 * winged unicorn — the children and pets ride beside them on it. Woven with a medallion and
 * borders whose golden threads glow after dark; the cloth ripples in the wind, tassels swing,
 * and a trail of sparkles follows it.
 */

import { CARPET_L, CARPET_SEATS, CARPET_W } from './caravan';
import { currentWind } from '../world/wind';

function weave(glow: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const x = c.getContext('2d')!;
  const W = 256, H = 320;
  x.fillStyle = glow ? '#000000' : '#8a1f3d';
  x.fillRect(0, 0, W, H);
  const line = (col: string, inset: number, w: number) => { x.strokeStyle = col; x.lineWidth = w; x.strokeRect(inset, inset, W - inset * 2, H - inset * 2); };
  if (!glow) {
    x.fillStyle = '#1f4f7a';
    x.fillRect(14, 14, W - 28, H - 28);
    x.fillStyle = '#8a1f3d';
    x.fillRect(34, 34, W - 68, H - 68);
  }
  line(glow ? '#ffd27a' : '#e8b84a', 10, 5);
  line(glow ? '#ffd27a' : '#e8b84a', 32, 3);
  // Border flowers.
  for (let i = 0; i < 14; i++) {
    for (const [px, py] of [[23, 20 + i * 20.5], [W - 23, 20 + i * 20.5]]) {
      x.fillStyle = glow ? '#7affe0' : ['#f2c14e', '#ffffff', '#ff8fb8'][i % 3];
      x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fill();
    }
  }
  // The medallion: a diamond with a star, and corner pieces.
  x.save();
  x.translate(W / 2, H / 2);
  x.strokeStyle = glow ? '#ffd27a' : '#e8b84a';
  x.lineWidth = 4;
  for (const r of [70, 50]) {
    x.beginPath(); x.moveTo(0, -r * 1.25); x.lineTo(r, 0); x.lineTo(0, r * 1.25); x.lineTo(-r, 0); x.closePath(); x.stroke();
  }
  x.fillStyle = glow ? '#ff9ae0' : '#f2c14e';
  x.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 12 : 30; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  x.closePath(); x.fill();
  x.restore();
  for (const [px, py] of [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]]) {
    x.fillStyle = glow ? '#9ad8ff' : '#2f8a8a';
    x.beginPath(); x.arc(px, py, 12, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SEGS_X = 12, SEGS_Z = 16, SPARKS = 70;

export class Carpet {
  readonly root = new THREE.Group();
  private cloth: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private base: Float32Array;
  private tassels: THREE.Mesh[] = [];
  private sparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private sparkAge = new Float32Array(SPARKS);
  private next = 0;
  /** 0..1 how unrolled it is (it unrolls as it appears). */
  open = 0;

  constructor() {
    const geo = new THREE.PlaneGeometry(CARPET_W, CARPET_L, SEGS_X, SEGS_Z);
    geo.rotateX(-Math.PI / 2);
    this.base = Float32Array.from(geo.attributes.position.array as Float32Array);
    this.cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: weave(false), emissiveMap: weave(true), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3,
      side: THREE.DoubleSide, roughness: 0.85,
    }));
    this.cloth.castShadow = true;
    this.root.add(this.cloth);
    for (const z of [-1, 1]) for (let i = 0; i < 7; i++) {
      const tg = new THREE.ConeGeometry(0.05, 0.22, 5);
      tg.translate(0, -0.11, 0);
      const t = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: ['#e8b84a', '#ffffff', '#ff8fb8'][i % 3], emissive: '#e8b84a', emissiveIntensity: 0.2 }));
      t.position.set(-CARPET_W / 2 + 0.2 + i * ((CARPET_W - 0.4) / 6), 0, z * (CARPET_L / 2 + 0.02));
      t.rotation.x = z * 1.2;
      t.userData.z = z;
      this.tassels.push(t);
      this.root.add(t);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.sparks.frustumCulled = false;
    this.sparkAge.fill(9);
  }

  /** The sparkle trail lives in the world, not on the carpet — add it to the scene. */
  get trail(): THREE.Points { return this.sparks; }

  /** Seat position in world space. */
  seat(kind: 'child' | 'pet' | 'sibling', i: number, out: THREE.Vector3): THREE.Vector3 {
    const s = CARPET_SEATS[kind][i % 4];
    return this.root.localToWorld(out.set(s[0], 0.06, s[1]));
  }

  update(dt: number, t: number, night: number, speed: number): void {
    const pos = this.cloth.geometry.attributes.position as THREE.BufferAttribute;
    const w = currentWind(), gust = w.strength * (0.6 + 0.4 * Math.sin(t * 1.7));
    const wave = 0.05 + Math.min(0.12, speed * 0.004) + gust * 0.04;
    for (let i = 0; i < pos.count; i++) {
      const x = this.base[i * 3], z = this.base[i * 3 + 2];
      const edge = Math.abs(x) / (CARPET_W / 2);
      const back = (CARPET_L / 2 - z) / CARPET_L;
      const y = Math.sin(z * 2.4 - t * 6) * wave * (0.4 + back) + Math.sin(x * 3 + t * 3.3) * (0.02 + gust * 0.03) + edge * edge * 0.06;
      pos.setXYZ(i, x * this.open, y * this.open, z);
    }
    pos.needsUpdate = true;
    this.cloth.geometry.computeVertexNormals();
    this.cloth.material.emissiveIntensity = 0.25 + night * 1.2;
    for (const tsl of this.tassels) tsl.rotation.x = tsl.userData.z * (1.1 + Math.sin(t * 7 + tsl.position.x * 3) * (0.25 + gust * 0.2));
    // Sparkles shed from the back edge drift and fade.
    const sp = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    const sc = this.sparks.geometry.attributes.color as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let k = 0; k < 2; k++) {
      const i = this.next = (this.next + 1) % SPARKS;
      this.root.localToWorld(v.set((Math.random() - 0.5) * CARPET_W, -0.05, -CARPET_L / 2));
      sp.setXYZ(i, v.x, v.y, v.z);
      this.sparkAge[i] = 0;
    }
    for (let i = 0; i < SPARKS; i++) {
      this.sparkAge[i] += dt;
      const a = this.sparkAge[i], f = Math.max(0, 1 - a / 1.4) * this.open;
      sp.setY(i, sp.getY(i) - dt * 0.4);
      const h = (i * 0.137 + t * 0.1) % 1;
      const col = new THREE.Color().setHSL(h, 0.9, 0.7);
      sc.setXYZ(i, col.r * f, col.g * f, col.b * f);
    }
    sp.needsUpdate = sc.needsUpdate = true;
  }
}
