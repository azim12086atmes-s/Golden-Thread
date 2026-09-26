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
  /** Set by SkyFX while a crescent stands in for the full moon. */
  moonHidden = false;
  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private moon: THREE.Mesh;
  private sunDisc: THREE.Mesh;
  /** The current land's sky colours, eased so crossing a border never snaps the sky. */
  private tint = { day: new THREE.Color('#bfe6ff'), dusk: new THREE.Color('#ffb38a'), night: new THREE.Color('#2a2a6e') };
  private auroras: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private rainbows: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  readonly fog = new THREE.Fog('#cfeaff', 120, 1400);
  /** The land's air, eased as you travel (locale.ts `atmos`). */
  readonly air = { haze: new THREE.Color('#ffe8f0'), hazeNight: new THREE.Color('#3a3a7a'), sun: new THREE.Color('#fff0d0'), near: 140, far: 1500, light: 1.1 };
  private sunDir = new THREE.Vector3();

  /** Direction to the sun (unit vector). */
  get sunDirection(): THREE.Vector3 { return this.sunDir; }

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
          band: { value: new THREE.Color() },
          glowCol: { value: new THREE.Color() },
          veil: { value: new THREE.Color() },
          veilAmt: { value: 0 },
          time: { value: 0 },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol;
          uniform vec3 band; uniform vec3 glowCol; uniform vec3 veil; uniform float veilAmt; uniform float time;
          varying vec3 vDir;
          float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += vn(p) * a; p = p * 2.07 + 7.3; a *= 0.5; } return s; }
          void main(){
            vec3 d = normalize(vDir);
            float h = clamp(d.y, -0.2, 1.0);
            vec3 c = mix(horizon, top, pow(max(h, 0.0), 0.55));
            // The land's own hue: a coloured band of air low over the horizon.
            c = mix(c, band, exp(-max(h, 0.0) * 9.0) * 0.55);
            if (h < 0.0) c = mix(horizon, horizon * 0.7, -h * 5.0);
            float s = max(dot(d, normalize(sunDir)), 0.0);
            // Sunlight scattered through that air: a wide warm glow round the sun, tinted by the land.
            c += glowCol * (pow(s, 5.0) * 0.32 + pow(s, 40.0) * 0.25) * (0.6 + 0.4 * exp(-max(h, 0.0) * 3.0));
            c += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.25);
            // High veils of thin cloud, drifting, lit on the sun side: texture, not a flat wash.
            if (h > 0.0) {
              vec2 q = d.xz / (h + 0.12) * 1.6 + vec2(time * 0.012, time * 0.004);
              float v = fbm(q * vec2(1.0, 2.6)) ;
              float streak = smoothstep(0.52, 0.8, v) * smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.55, 0.9, h));
              c = mix(c, veil + glowCol * pow(s, 3.0) * 0.4, streak * veilAmt);
            }
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
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
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
      const m = new THREE.Mesh(rainbowGeometry(r, r * 0.14), mat);
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
      const a = L.atmos;
      this.air.haze.lerp(tmpA.set(a.haze), ease);
      this.air.hazeNight.lerp(tmpA.set(a.hazeNight), ease);
      this.air.sun.lerp(tmpA.set(a.sun), ease);
      this.air.near += (a.near - this.air.near) * ease;
      this.air.far += (a.far - this.air.far) * ease;
      this.air.light += (a.light - this.air.light) * ease;
    }
    const dusk = 1 - smoothstep(0, 0.35, Math.abs(this.sunDir.y));
    const day = (1 - this.night) * (1 - dusk);
    // Rich, not washed out: the zenith stays a deep sky, turned towards the land's own hue, and
    // the horizon carries the land's air at full colour — peach over the dunes, rose over the
    // sakura, ice-blue over the Aurora, lavender over the Sky Isles.
    richen(tmpC.copy(this.tint.day), 0.62, 0.6);
    u.top.value.lerp(tmpC, 0.3 * day);
    richen(tmpD.copy(this.air.haze), 0.62, 0.8);
    u.horizon.value.lerp(tmpD, 0.62 * day);
    u.band.value.copy(richen(tmpE.copy(this.air.haze), 0.75, 0.72)).multiplyScalar(day)
      .add(tmpF.copy(this.air.hazeNight).multiplyScalar(0.6 * this.night))
      .add(tmpG.copy(this.tint.dusk).multiplyScalar(dusk));
    u.top.value.lerp(this.tint.night, 0.5 * this.night);
    u.horizon.value.lerp(this.tint.dusk, 0.68 * dusk);
    u.horizon.value.lerp(this.tint.night, 0.36 * this.night);
    // By night, a faint touch of the land's own night air on the horizon (sand, ice-blue, pearl).
    u.horizon.value.lerp(this.air.hazeNight, 0.15 * this.night);
    if (regionId === 'skyisles') u.top.value.lerp(tmpA.set('#b8a4ff'), 0.25);
    if (regionId === 'desert' || regionId === 'egypt' || regionId === 'middleeast') u.horizon.value.lerp(tmpA.set('#ffc98a'), 0.2 * (1 - this.night));
    u.glowCol.value.copy(this.air.sun).lerp(tmpD, 0.4).multiplyScalar((1 - this.night) * 0.9);
    u.veil.value.copy(this.air.haze).lerp(tmpA.set('#ffffff'), 0.55).multiplyScalar(1 - this.night * 0.8).lerp(this.tint.night, this.night * 0.4);
    u.veilAmt.value = 0.55 - this.night * 0.35;
    u.time.value = t;
    RAINBOW_TIME.value = t;

    this.group.position.set(focus.x, 0, focus.z);
    // The haze: the land's own colour by day and by night, and its own depth.
    this.fog.color.copy(u.horizon.value).lerp(u.top.value, 0.2).lerp(tmpA.copy(this.air.haze).lerp(this.air.hazeNight, this.night), 0.08 + 0.47 * (1 - this.night));
    this.fog.near = this.air.near * (1 + this.night * 0.3);
    this.fog.far = this.air.far * (1 + this.night * 0.15);

    const lightDir = this.sunDir.y > -0.05 ? this.sunDir : tmpDir.copy(this.sunDir).negate();
    this.sunLight.position.copy(focus).addScaledVector(lightDir, 200);
    this.sunLight.target.position.copy(focus);
    this.sunLight.target.updateMatrixWorld();
    // Sunlight takes the land's colour (golden over the dunes, cool over the ice).
    this.sunLight.color.copy(k.sunCol).lerp(this.air.sun, 0.55 * (1 - this.night));
    this.sunLight.intensity = Math.max(k.sun * this.air.light, this.night * 0.45);
    this.hemi.intensity = k.amb * 1.6 * (0.94 + this.air.light * 0.08);
    this.hemi.color.copy(u.top.value).lerp(tmpA.set('#ffffff'), 0.4).lerp(this.air.haze, 0.2 * (1 - this.night));
    this.hemi.groundColor.set(this.night > 0.5 ? '#2a2a4a' : '#7a8a5a');

    this.sunDisc.position.copy(this.sunDir).multiplyScalar(3300);
    this.sunDisc.visible = this.sunDir.y > -0.05;
    this.moon.position.copy(this.sunDir).multiplyScalar(-3300);
    this.moon.visible = this.sunDir.y < 0.1 && !this.moonHidden;
    // A fairy-tale sky: the stars stay out by day too, bright points against the blue.
    this.stars.material.opacity = this.night + (1 - this.night) * 0.6;
    this.stars.material.color.setScalar(1 + (1 - this.night) * 0.9);
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
const tmpC = new THREE.Color(), tmpD = new THREE.Color(), tmpE = new THREE.Color(), tmpF = new THREE.Color(), tmpG = new THREE.Color();
const hsl = { h: 0, s: 0, l: 0 };

/** The same hue with at least `sat` saturation, at lightness `light` — a pastel made vivid. */
function richen(c: THREE.Color, sat: number, light: number): THREE.Color {
  c.getHSL(hsl);
  return c.setHSL(hsl.h, Math.max(hsl.s * 0.7, sat) * Math.min(1, hsl.s * 4 + 0.2), light);
}

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

/** Shared clock for every rainbow's shimmer (advanced by Sky.update). */
const RAINBOW_TIME = { value: 0 };

/**
 * A rainbow as a ribbon of light (like the aurora), not a tube: a flat half-ring standing upright
 * with `uv.x` running along the arc (0 at one foot, 1 at the other) and `uv.y` across it (0 inner,
 * 1 outer). The ribbon is wider than the colours so its edges melt into the sky.
 */
export function rainbowGeometry(r: number, width: number): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(r - width / 2, r + width / 2, 128, 4, 0, Math.PI);
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv.setXY(i, Math.atan2(y, x) / Math.PI, (Math.hypot(x, y) - (r - width / 2)) / width);
  }
  return g;
}

/**
 * Rainbow light: soft spectral bands (red outside, violet inside; `flip` reverses them for a
 * second bow), faint supernumerary bands just inside the violet, slow rays of brighter and
 * dimmer light drifting along the arc as in an aurora, and feet that fade into the air. `pale`
 * turns it into a silvery moonbow. Uniforms: strength (0..1), k, flip, pale.
 */
export function rainbowMaterial(opts: { k?: number; flip?: number } = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { strength: { value: 0 }, k: { value: opts.k ?? 1 }, flip: { value: opts.flip ?? 0 }, pale: { value: 0 }, t: RAINBOW_TIME },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float strength; uniform float k; uniform float flip; uniform float pale; uniform float t; varying vec2 vUv;
      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      float n1(float x){ return fract(sin(x * 12.9898) * 43758.5453); }
      float vn(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(n1(i), n1(i + 1.0), f); }
      void main(){
        float v = vUv.y, x = vUv.x;
        // The colours fill the middle of the ribbon; its edges are soft light.
        float c01 = clamp((v - 0.2) / 0.6, 0.0, 1.0);
        float o = mix(c01, 1.0 - c01, flip);
        vec3 c = hue((1.0 - o) * 0.78);
        float body = exp(-pow((v - 0.5) * 2.5, 4.0));
        // Faint extra bands just inside the violet.
        float sup = exp(-pow((v - mix(0.14, 0.86, flip)) * 9.0, 2.0)) * (0.5 + 0.5 * sin(v * 90.0)) * 0.35;
        // Aurora-like rays and a slow travelling shimmer along the arc.
        float rays = 0.62 + 0.38 * vn(x * 110.0 + t * 0.5) * (0.6 + 0.4 * vn(x * 27.0 - t * 0.2 + 5.0));
        float drift = 0.72 + 0.28 * sin(x * 14.0 - t * 0.3);
        float ends = smoothstep(0.0, 0.2, x) * smoothstep(1.0, 0.8, x);
        c = mix(c, vec3(0.82, 0.88, 1.0), pale * 0.8);
        float a = (body * rays * drift + sup * c01) * ends * strength * k;
        gl_FragColor = vec4(c * 1.35 + vec3(0.06), min(1.0, a * 0.95));
      }`,
  });
}
