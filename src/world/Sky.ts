import * as THREE from 'three';
import { LOCALES } from './locale';
import type { RegionId } from './regions';
import { clamp, lerp, smoothstep } from '../core/rng';
import { REGION_BY_ID, regionCenter } from './regions';

/**
 * Day and night. A gradient sky dome, sun and moon, stars, and each land's special light:
 * aurora ribbons over the Aurora Huts, rainbows over Wanderers' Meadow. `night` (0..1) drives
 * every glowing thing in the world.
 */

interface Key { h: number; top: string; horizon: string; sun: number; amb: number; sunCol: string }
const KEYS: Key[] = [
  { h: 0, top: '#070b24', horizon: '#1c1a44', sun: 0.0, amb: 0.34, sunCol: '#8fa8ff' },
  { h: 4.5, top: '#0b1030', horizon: '#26224e', sun: 0.0, amb: 0.34, sunCol: '#8fa8ff' },
  { h: 6, top: '#4a5a9a', horizon: '#ffb38a', sun: 0.8, amb: 0.5, sunCol: '#ffc49a' },
  { h: 8, top: '#5fb0ff', horizon: '#cfeaff', sun: 1.8, amb: 0.75, sunCol: '#fff4e0' },
  { h: 16, top: '#4aa2f5', horizon: '#c4e6ff', sun: 1.8, amb: 0.75, sunCol: '#fff4e0' },
  { h: 18, top: '#5a4a9a', horizon: '#ff9a6a', sun: 0.9, amb: 0.52, sunCol: '#ffb070' },
  { h: 19.5, top: '#1c1a50', horizon: '#6a3a6a', sun: 0.1, amb: 0.38, sunCol: '#b08aff' },
  { h: 21, top: '#0a0e2a', horizon: '#221e48', sun: 0.0, amb: 0.34, sunCol: '#8fa8ff' },
  { h: 24, top: '#070b24', horizon: '#1c1a44', sun: 0.0, amb: 0.34, sunCol: '#8fa8ff' },
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();

function sample(h: number) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = clamp((h - a.h) / (b.h - a.h), 0, 1);
  return {
    top: new THREE.Color(a.top).lerp(tmpA.set(b.top), t),
    horizon: new THREE.Color(a.horizon).lerp(tmpB.set(b.horizon), t),
    sun: lerp(a.sun, b.sun, t),
    amb: lerp(a.amb, b.amb, t),
    sunCol: new THREE.Color(a.sunCol).lerp(new THREE.Color(b.sunCol), t),
  };
}

export class Sky {
  readonly group = new THREE.Group();
  readonly sunLight = new THREE.DirectionalLight('#fff4e0', 1.8);
  readonly hemi = new THREE.HemisphereLight('#bfe6ff', '#6a8a5a', 0.7);
  night = 0;
  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private moon: THREE.Mesh;
  private sunDisc: THREE.Mesh;
  /** The current land's sky colours, eased so crossing a border never snaps the sky. */
  private tint = { day: new THREE.Color('#bfe6ff'), dusk: new THREE.Color('#ffb38a'), night: new THREE.Color('#2a2a6e') };
  private auroras: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private rainbows: THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>[] = [];
  readonly fog = new THREE.Fog('#cfeaff', 120, 1400);
  private sunDir = new THREE.Vector3();

  constructor() {
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(4000, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
          sunDir: { value: new THREE.Vector3(0, 1, 0) },
          sunCol: { value: new THREE.Color() },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
            if (h < 0.0) c = mix(horizon, horizon * 0.7, -h * 5.0);
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.25);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // Stars.
    const n = 2500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const y = Math.abs(u) * 0.95 + 0.05;
      pos.set([Math.cos(a) * r * 3600, y * 3600, Math.sin(a) * r * 3600], i * 3);
      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.5, 0.75 + Math.random() * 0.25);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    this.moon = new THREE.Mesh(new THREE.SphereGeometry(60, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f4f0ff').multiplyScalar(1.4), fog: false, toneMapped: false }));
    this.group.add(this.moon);
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(70, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c0').multiplyScalar(2), fog: false, toneMapped: false }));
    this.group.add(this.sunDisc);

    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left = sc.bottom = -60;
    sc.right = sc.top = 60;
    sc.near = 1;
    sc.far = 400;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.normalBias = 0.4;

    this.buildAurora();
    this.buildRainbows();
  }

  private buildAurora(): void {
    const c = regionCenter(REGION_BY_ID.aurora);
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(1400, 260, 80, 1);
      const mat = auroraMaterial(i * 1.7);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(c.x + (i - 1.5) * 260, 150 + i * 28, c.z - 560 + i * 70);
      m.rotation.y = 0.2 * (i - 1.5);
      m.frustumCulled = false;
      this.auroras.push(m);
      this.group.add(m);
    }
  }

  private buildRainbows(): void {
    const c = regionCenter(REGION_BY_ID.meadow);
    for (const [dx, dz, r, ry] of [[40, -260, 260, 0.2], [-280, 120, 180, 1.4], [220, 180, 150, -0.9]] as const) {
      const mat = rainbowMaterial();
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.06, 8, 64, Math.PI), mat);
      m.position.set(c.x + dx, -6, c.z + dz);
      m.rotation.y = ry;
      m.frustumCulled = false;
      this.rainbows.push(m);
      this.group.add(m);
    }
  }

  /** `hour` 0..24. `focus` is the player; everything sky-shaped follows them. */
  update(hour: number, focus: THREE.Vector3, t: number, regionId: string): void {
    const k = sample(hour);
    const angle = ((hour - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(angle) * 0.8, Math.sin(angle), 0.35).normalize();
    this.night = 1 - smoothstep(-0.12, 0.18, this.sunDir.y);

    const u = this.dome.material.uniforms;
    u.top.value.copy(k.top);
    u.horizon.value.copy(k.horizon);
    u.sunDir.value.copy(this.sunDir);
    u.sunCol.value.copy(k.sunCol).multiplyScalar(1 - this.night);
    // Each land's own sky: its day colour, its dusk glow at the horizon, its night.
    const L = LOCALES[regionId as RegionId];
    if (L) {
      const ease = 0.02;
      this.tint.day.lerp(tmpA.set(L.sky.day), ease);
      this.tint.dusk.lerp(tmpA.set(L.sky.dusk), ease);
      this.tint.night.lerp(tmpA.set(L.sky.night), ease);
    }
    const dusk = 1 - smoothstep(0, 0.35, Math.abs(this.sunDir.y));
    u.top.value.lerp(this.tint.day, 0.2 * (1 - this.night) * (1 - dusk));
    u.top.value.lerp(this.tint.night, 0.4 * this.night);
    u.horizon.value.lerp(this.tint.dusk, 0.5 * dusk);
    u.horizon.value.lerp(this.tint.night, 0.25 * this.night);
    if (regionId === 'skyisles') u.top.value.lerp(tmpA.set('#b8a4ff'), 0.25);
    if (regionId === 'desert' || regionId === 'egypt' || regionId === 'middleeast') u.horizon.value.lerp(tmpA.set('#ffd6a0'), 0.25 * (1 - this.night));

    this.group.position.set(focus.x, 0, focus.z);
    this.fog.color.copy(u.horizon.value).lerp(u.top.value, 0.25);

    const lightDir = this.sunDir.y > -0.05 ? this.sunDir : tmpDir.copy(this.sunDir).negate();
    this.sunLight.position.copy(focus).addScaledVector(lightDir, 200);
    this.sunLight.target.position.copy(focus);
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.color.copy(k.sunCol);
    this.sunLight.intensity = Math.max(k.sun, this.night * 0.45);
    this.hemi.intensity = k.amb * 1.6;
    this.hemi.color.copy(u.top.value).lerp(tmpA.set('#ffffff'), 0.5);
    this.hemi.groundColor.set(this.night > 0.5 ? '#2a2a4a' : '#7a8a5a');

    this.sunDisc.position.copy(this.sunDir).multiplyScalar(3300);
    this.sunDisc.visible = this.sunDir.y > -0.05;
    this.moon.position.copy(this.sunDir).multiplyScalar(-3300);
    this.moon.visible = this.sunDir.y < 0.1;
    this.stars.material.opacity = this.night;
    this.stars.rotation.y = t * 0.002;

    // Aurora: at night, strongest over its own land. The group follows the player, so auroras
    // (placed in world coordinates) are counter-offset.
    const ac = regionCenter(REGION_BY_ID.aurora);
    const aNear = 1 - smoothstep(500, 1800, Math.hypot(focus.x - ac.x, focus.z - ac.z));
    for (const a of this.auroras) {
      a.material.uniforms.t.value = t;
      a.material.uniforms.strength.value = this.night * aNear;
      a.visible = this.night * aNear > 0.01;
      a.position.x = a.userData.wx ?? (a.userData.wx = a.position.x);
      a.position.z = a.userData.wz ?? (a.userData.wz = a.position.z);
      a.position.x -= focus.x;
      a.position.z -= focus.z;
    }
    const mc = regionCenter(REGION_BY_ID.meadow);
    const mNear = 1 - smoothstep(400, 1100, Math.hypot(focus.x - mc.x, focus.z - mc.z));
    for (const r of this.rainbows) {
      r.material.uniforms.strength.value = (1 - this.night) * mNear;
      r.visible = mNear > 0.01 && this.night < 0.9;
      r.position.x = r.userData.wx ?? (r.userData.wx = r.position.x);
      r.position.z = r.userData.wz ?? (r.userData.wz = r.position.z);
      r.position.x -= focus.x;
      r.position.z -= focus.z;
    }
  }
}

const tmpDir = new THREE.Vector3();

/** Aurora ribbon material: uniforms t (time) and strength (0..1). */
export function auroraMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: { t: { value: 0 }, strength: { value: 0 }, seed: { value: seed } },
        vertexShader: `uniform float t; uniform float seed; varying vec2 vUv;
          void main(){ vUv = uv; vec3 p = position;
            p.z += sin(p.x * 0.006 + t * 0.3 + seed) * 120.0 + sin(p.x * 0.017 - t * 0.5 + seed) * 40.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `uniform float t; uniform float strength; uniform float seed; varying vec2 vUv;
          void main(){
            float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - vUv.y) * smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
            float bands = 0.55 + 0.45 * sin(vUv.x * 60.0 + t * 1.3 + seed * 3.0);
            vec3 green = vec3(0.2, 1.0, 0.55); vec3 violet = vec3(0.6, 0.3, 1.0);
            vec3 c = mix(green, violet, vUv.y * 0.9 + 0.1 * sin(t + vUv.x * 8.0));
            gl_FragColor = vec4(c * 0.75, fade * bands * strength * 0.5);
          }`,
      });
}

/** Rainbow arc material for a half torus: uniform strength (0..1). */
export function rainbowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: { strength: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float strength; varying vec2 vUv;
          vec3 band(float v){ return clamp(abs(mod(v * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
          void main(){
            float v = vUv.y;
            float a = smoothstep(0.0, 0.15, v) * smoothstep(1.0, 0.85, v) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.5, 0.42, vUv.x);
            gl_FragColor = vec4(band(v * 0.8) * 1.15, a * strength * 0.55);
          }`,
      });
}
