import * as THREE from 'three';
import type { Ambient } from './regions';
import { currentWind } from './wind';

/**
 * Air that belongs to a place: snow in the north, petals under the sakura, fireflies over the
 * meadow at night, drifting sand in the desert, sparkles in the Sky Isles.
 */

const N = 700, BOX = 70;

export interface Mode { color: string; size: number; fall: number; drift: number; glow: boolean; nightOnly?: boolean; count: number }
export const MODES: Record<Ambient, Mode> = {
  snow: { color: '#ffffff', size: 0.22, fall: 1.4, drift: 0.6, glow: false, count: 700 },
  petals: { color: '#ffc4dc', size: 0.2, fall: 0.8, drift: 1.4, glow: false, count: 350 },
  fireflies: { color: '#fff08a', size: 0.25, fall: 0, drift: 0.8, glow: true, nightOnly: true, count: 260 },
  sand: { color: '#f2d6a0', size: 0.1, fall: 0.1, drift: 5, glow: false, count: 500 },
  sparkles: { color: '#fff4c0', size: 0.2, fall: -0.3, drift: 0.4, glow: true, count: 400 },
  leaves: { color: '#e8a04a', size: 0.22, fall: 0.9, drift: 1.2, glow: false, count: 160 },
  none: { color: '#ffffff', size: 0.1, fall: 0, drift: 0, glow: false, count: 0 },
};

export class Ambience {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private pos = new Float32Array(N * 3);
  private seed = new Float32Array(N);
  private mode: Mode = MODES.none;
  private fade = 0;
  private target: Ambient = 'none';

  constructor() {
    for (let i = 0; i < N; i++) {
      this.pos.set([(Math.random() - 0.5) * BOX, Math.random() * 30, (Math.random() - 0.5) * BOX], i * 3);
      this.seed[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.2, transparent: true, depthWrite: false, opacity: 0, toneMapped: false, map: softDot(), alphaTest: 0.01 }));
    this.points.frustumCulled = false;
  }

  setMode(a: Ambient): void {
    this.target = a;
  }

  update(dt: number, focus: THREE.Vector3, t: number, night: number): void {
    // Cross-fade between modes: fade out, switch, fade in.
    if (MODES[this.target] !== this.mode) {
      this.fade = Math.max(0, this.fade - dt);
      if (this.fade === 0) {
        this.mode = MODES[this.target];
        const m = this.points.material;
        m.color.set(this.mode.color);
        if (this.mode.glow) m.color.multiplyScalar(2);
        m.size = this.mode.size;
        this.points.geometry.setDrawRange(0, this.mode.count);
      }
    } else {
      this.fade = Math.min(1, this.fade + dt * 0.5);
    }
    const md = this.mode;
    const vis = md.nightOnly ? night : 1;
    this.points.material.opacity = this.fade * vis * 0.9;
    if (md.count === 0 || vis < 0.01) return;

    const half = BOX / 2, w = currentWind(), wx = w.x * w.strength * 1.6, wz = w.z * w.strength * 1.6;
    for (let i = 0; i < md.count; i++) {
      const s = this.seed[i];
      let x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      x += (Math.sin(t * 0.7 + s) * md.drift + (md === MODES.sand ? md.drift : 0)) * dt;
      z += Math.cos(t * 0.5 + s * 1.3) * md.drift * dt;
      // Falling things ride the wind; fireflies and sparkles hardly notice it.
      const carried = md.fall > 0 ? 1 : 0.2;
      x += wx * carried * dt; z += wz * carried * dt;
      y -= md.fall * dt * (0.7 + (s % 1) * 0.6);
      if (md.fall === 0) y += Math.sin(t * 1.3 + s) * 0.3 * dt;
      // Wrap around the focus so the field is always around the camera.
      const fx = focus.x, fz = focus.z;
      if (x - fx > half) x -= BOX; else if (x - fx < -half) x += BOX;
      if (z - fz > half) z -= BOX; else if (z - fz < -half) z += BOX;
      const ground = focus.y - 4, ceil = focus.y + 26;
      if (y < ground) y = ceil;
      if (y > ceil) y = ground;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/** A soft round sprite so particles read as petals, flakes and motes rather than squares. */
function softDot(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const grad = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grad;
  x.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
