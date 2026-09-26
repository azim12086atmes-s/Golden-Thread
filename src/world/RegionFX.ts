import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { LOCALES, type ParticleTheme } from './locale';
import type { RegionId } from './regions';

/**
 * Each land's own air and colour: a layer of particles only that land has (see locale.ts), and a
 * colour grade that makes the world more vibrant and gives each land its mood. Both cross-fade
 * when you move from one land to the next.
 */

const N = 520, BOX = 64;

function sprite(petal: boolean): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  if (petal) {
    x.fillStyle = '#fff';
    x.beginPath();
    x.ellipse(16, 16, 13, 7, 0.7, 0, Math.PI * 2);
    x.fill();
  } else {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TEX = { petal: sprite(true), dot: sprite(false) };

export class RegionFX {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  readonly grade: ShaderPass;
  private pos = new Float32Array(N * 3);
  private col = new Float32Array(N * 3);
  private seed = new Float32Array(N);
  private theme: ParticleTheme;
  private current: RegionId | null = null;
  private fade = 0;
  private want: RegionId = 'meadow';
  private g = { sat: 1, vib: 0, tint: new THREE.Color('#ffffff'), amt: 0 };

  constructor() {
    for (let i = 0; i < N; i++) {
      this.pos.set([(Math.random() - 0.5) * BOX, Math.random() * 26, (Math.random() - 0.5) * BOX], i * 3);
      this.seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, depthWrite: false, opacity: 0, toneMapped: false, alphaTest: 0.01, map: TEX.dot }));
    this.points.frustumCulled = false;
    this.theme = LOCALES.meadow.particles;

    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, sat: { value: 1 }, vib: { value: 0 }, tint: { value: new THREE.Color('#ffffff') }, amt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float vib; uniform vec3 tint; uniform float amt; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
          float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
          // Saturation, plus vibrance that lifts dull colours more than already-rich ones.
          vec3 col = mix(vec3(l), c.rgb, sat + vib * (1.0 - clamp(s * 2.0, 0.0, 1.0)));
          col *= mix(vec3(1.0), tint, amt);
          gl_FragColor = vec4(max(col, 0.0), c.a);
        }`,
    });
  }

  setRegion(id: RegionId): void {
    this.want = id;
  }

  private recolour(t: ParticleTheme): void {
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.set(t.colors[i % t.colors.length]);
      this.col.set([c.r, c.g, c.b], i * 3);
    }
    this.points.geometry.attributes.color.needsUpdate = true;
    const m = this.points.material;
    m.size = t.size;
    m.map = t.petal ? TEX.petal : TEX.dot;
    m.blending = t.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    m.needsUpdate = true;
    this.points.geometry.setDrawRange(0, Math.min(N, t.count));
  }

  update(dt: number, focus: THREE.Vector3, t: number, night: number): void {
    // Cross-fade the particle theme when the land changes.
    if (this.current !== this.want) {
      this.fade = Math.max(0, this.fade - dt * 1.5);
      if (this.fade === 0) {
        this.current = this.want;
        this.theme = LOCALES[this.current].particles;
        this.recolour(this.theme);
      }
    } else this.fade = Math.min(1, this.fade + dt * 0.8);

    // The grade eases towards the land's look.
    const L = LOCALES[this.want].grade, k = Math.min(1, dt * 1.2);
    this.g.sat += (L.sat - this.g.sat) * k;
    this.g.vib += (L.vib - this.g.vib) * k;
    this.g.amt += (L.amt - this.g.amt) * k;
    this.g.tint.lerp(new THREE.Color(L.tint), k);
    const u = this.grade.uniforms;
    u.sat.value = this.g.sat;
    u.vib.value = this.g.vib;
    u.amt.value = this.g.amt * (1 - night * 0.5);
    (u.tint.value as THREE.Color).copy(this.g.tint);

    const th = this.theme;
    const vis = th.night ? night : 1;
    this.points.material.opacity = this.fade * vis * (th.glow ? 0.9 : 0.85);
    if (vis < 0.01) return;
    const half = BOX / 2, n = Math.min(N, th.count), sp = th.speed;
    for (let i = 0; i < n; i++) {
      const s = this.seed[i];
      let x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      switch (th.motion) {
        case 'fall':
          y -= sp * dt * (0.7 + (s % 1) * 0.6);
          x += Math.sin(t * 0.8 + s) * 0.9 * dt;
          z += Math.cos(t * 0.6 + s * 1.3) * 0.9 * dt;
          break;
        case 'flutter':
          x += Math.sin(t * 2.2 + s) * 1.2 * dt + sp * 0.3 * dt;
          y += Math.sin(t * 3.1 + s * 2) * 0.8 * dt + 0.05 * dt;
          z += Math.cos(t * 1.7 + s) * 1.2 * dt;
          break;
        case 'rise':
          y += sp * dt * (0.6 + (s % 1) * 0.8);
          x += Math.sin(t * 0.9 + s) * 0.5 * dt;
          z += Math.cos(t * 0.7 + s) * 0.5 * dt;
          break;
        case 'drift':
          x += sp * dt;
          y += Math.sin(t * 0.8 + s) * 0.2 * dt;
          z += Math.cos(t * 0.5 + s) * 0.4 * dt;
          break;
        case 'rain':
          y -= sp * dt * (0.85 + (s % 1) * 0.3);
          x += 0.8 * dt;
          break;
        case 'swirl': {
          const a = t * 0.3 + s;
          x += Math.cos(a) * sp * dt;
          z += Math.sin(a * 1.3) * sp * 0.6 * dt;
          y += Math.sin(t + s) * 0.2 * dt;
          break;
        }
        case 'hover':
          x += Math.sin(t * 0.5 + s) * sp * dt;
          y += Math.sin(t * 1.1 + s * 2) * sp * 0.6 * dt;
          z += Math.cos(t * 0.45 + s) * sp * dt;
          break;
      }
      // Keep the field around the travellers.
      if (x - focus.x > half) x -= BOX; else if (x - focus.x < -half) x += BOX;
      if (z - focus.z > half) z -= BOX; else if (z - focus.z < -half) z += BOX;
      const ground = focus.y - 3, ceil = focus.y + 24;
      if (y < ground) y = ceil;
      if (y > ceil) y = ground;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
