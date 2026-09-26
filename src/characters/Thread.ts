import * as THREE from 'three';
import { IDEAL_GAP } from './follow';

/**
 * The golden thread: a glowing ribbon between her hand and his, sagging when they are close and
 * drawing taut as he falls behind, with motes of light running along it. Its brightness grows with
 * the shared light they have earned by helping people.
 */
export class Thread {
  readonly group = new THREE.Group();
  private core: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  private halo: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  private motes: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  private moteT = new Float32Array(18);

  constructor() {
    this.core = new THREE.Mesh(new THREE.TubeGeometry(this.curve, 8, 0.02, 4), new THREE.MeshBasicMaterial({ color: '#ffd76a', toneMapped: false }));
    this.halo = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 8, 0.07, 6),
      new THREE.MeshBasicMaterial({ color: '#ffae2a', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    for (let i = 0; i < this.moteT.length; i++) this.moteT[i] = i / this.moteT.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.moteT.length * 3), 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color('#ffc23a').multiplyScalar(1.6), size: 0.06, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    for (const o of [this.core, this.halo, this.motes]) o.frustumCulled = false;
    this.group.add(this.halo, this.core, this.motes);
  }

  update(a: THREE.Vector3, b: THREE.Vector3, tension: number, light: number, t: number, dt: number): void {
    const d = a.distanceTo(b);
    const slack = Math.max(0, IDEAL_GAP * 1.35 - d) + 0.25 * (1 - tension);
    const sag = Math.min(0.45, slack * 0.3);
    const wave = Math.sin(t * 2.3) * 0.06 * (1 - tension);
    const pts = this.curve.points;
    pts[0].copy(a);
    pts[3].copy(b);
    pts[1].lerpVectors(a, b, 0.33);
    pts[2].lerpVectors(a, b, 0.66);
    pts[1].y -= sag * 0.9 - wave;
    pts[2].y -= sag * 0.9 + wave;
    pts[1].x += wave; pts[2].z -= wave;
    // Curves cache arc lengths; TubeGeometry samples by arc length, so the cache must be
    // invalidated after moving the points or the tube collapses to where the curve first was.
    this.curve.updateArcLengths();

    const segs = Math.max(8, Math.min(40, Math.round(d * 3)));
    this.core.geometry.dispose();
    this.halo.geometry.dispose();
    // A fine thread: a bright gold core inside a narrow warm glow.
    this.core.geometry = new THREE.TubeGeometry(this.curve, segs, 0.011 + Math.min(0.006, light * 0.0006), 5);
    this.halo.geometry = new THREE.TubeGeometry(this.curve, segs, 0.032 + Math.min(0.02, light * 0.002), 6);

    // Brighter with shared light, pulsing softly like a heartbeat.
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.6) + 0.1 * Math.max(0, Math.sin(t * 5.2));
    // Rich gold, not white-hot: bright enough to glow, never so bright it washes out to yellow-white.
    const glow = (1.15 + Math.min(0.9, light * 0.08)) * pulse;
    this.core.material.color.setRGB(1.0 * glow, 0.74 * glow, 0.26 * glow);
    this.halo.material.opacity = 0.32 + Math.min(0.25, light * 0.025);

    const pos = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (let i = 0; i < this.moteT.length; i++) {
      this.moteT[i] = (this.moteT[i] + dt * (0.25 + (i % 3) * 0.08)) % 1;
      this.curve.getPoint(this.moteT[i], p);
      pos.setXYZ(i, p.x, p.y + Math.sin(t * 4 + i) * 0.02, p.z);
    }
    pos.needsUpdate = true;
  }
}
