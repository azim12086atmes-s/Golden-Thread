import * as THREE from 'three';
import type { RegionId } from './regions';
import { currentWind } from './wind';
import type { WeatherEvent } from './seasons';

/**
 * Weather you can see the wind in. Each land has its own: sheets of dust racing low over the
 * dunes by day, snow streaming across the ice, white mist drifting through the Sky Isles, fog
 * wisps in London's streets, warm humid haze over the rice terraces, golden pollen over the
 * Meadow, festival incense haze in China. Two draws: soft wisps (billboards that lean with the
 * wind) and fast streaks (grains of sand, flakes of snow) — both carried by the same wind as the
 * grass and trees, and both fading out as you cross into the next land.
 */

export type WeatherKind = 'dust' | 'snow' | 'mist' | 'pollen' | 'haze' | 'rain' | 'none';

export interface WeatherDef {
  kind: WeatherKind;
  color: string;
  /** 0..1: how much of it. */
  amount: number;
  /** How strongly it shows at night (0..1). */
  night: number;
}

const W = (kind: WeatherKind, color: string, amount: number, night = 0.4): WeatherDef => ({ kind, color, amount, night });

export const WEATHER: Record<RegionId, WeatherDef> = {
  meadow: W('pollen', '#fff2b8', 0.45, 0.2),
  japan: W('haze', '#ffe0ec', 0.3, 0.3),
  korea: W('haze', '#ffe6cc', 0.25),
  china: W('haze', '#ffc8b4', 0.4, 0.6),
  norway: W('mist', '#e6f2ff', 0.55, 0.5),
  switzerland: W('snow', '#ffffff', 0.35, 0.3),
  london: W('mist', '#d6dae8', 0.75, 0.7),
  newyork: W('haze', '#ffe0c8', 0.25, 0.3),
  renaissance: W('pollen', '#ffe8b0', 0.3, 0.2),
  vintage: W('pollen', '#fff0f4', 0.3, 0.2),
  islamic: W('haze', '#fff0d4', 0.25, 0.2),
  middleeast: W('dust', '#f4dcb4', 0.6, 0.3),
  desert: W('dust', '#f6dcae', 0.6, 0.35),
  egypt: W('dust', '#f0d6a4', 0.55, 0.3),
  indianorth: W('dust', '#f2c8a8', 0.35, 0.3),
  indiasouth: W('mist', '#e8ffe6', 0.45, 0.5),
  mughal: W('haze', '#ffe4ec', 0.3, 0.3),
  indonesia: W('mist', '#e0ffe8', 0.55, 0.6),
  aurora: W('snow', '#ffffff', 1, 0.6),
  skyisles: W('mist', '#f4eeff', 0.45, 0.8),
};

/**
 * A land's weather during an event of the day (seasons.ts): a shower of rain, a snow flurry, a
 * sandstorm twice as thick as the usual dust, or a white morning fog. The same object each time
 * for the same land and event, so the weather cross-fades only when it really changes.
 */
const eventCache = new Map<string, WeatherDef>();
export function weatherFor(land: RegionId, event: WeatherEvent): WeatherDef {
  const base = WEATHER[land];
  if (event === 'none') return base;
  const k = `${land}:${event}`;
  let d = eventCache.get(k);
  if (!d) {
    d = event === 'shower' ? W('rain', '#c8d6ea', 0.85, 0.7)
      : event === 'flurry' ? W('snow', '#ffffff', 0.8, 0.6)
        : event === 'sandstorm' ? W('dust', base.kind === 'dust' ? base.color : '#f2d6a8', Math.min(1, Math.max(0.6, base.amount) * 1.8), 0.4)
          : W('mist', '#eef2f6', 0.95, 0.8);
    eventCache.set(k, d);
  }
  return d;
}

const WISPS = 150, STREAKS = 700, GUSTS = 500, BOX = 120;

const VERT = /* glsl */ `
  attribute vec4 wisp; // x, y, z (world), size
  attribute float alpha;
  varying vec2 vUv; varying float vA;
  uniform vec2 uWind;
  void main() {
    vUv = uv;
    vA = alpha;
    // Face the camera around the vertical axis, and lean along the wind: long low sheets.
    vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
    vec3 up = vec3(0.0, 1.0, 0.0);
    float w = wisp.w * 3.2, h = wisp.w;
    vec3 p = wisp.xyz + right * position.x * w + up * position.y * h;
    p.xz += uWind * position.y * h * 0.8;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D map; uniform vec3 color; uniform float strength;
  varying vec2 vUv; varying float vA;
  void main() {
    float a = texture2D(map, vUv).a * vA * strength;
    if (a < 0.003) discard;
    gl_FragColor = vec4(color, a);
  }`;

function wispTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d')!;
  // Several soft blobs in a row, like a torn veil of dust or mist.
  for (let i = 0; i < 9; i++) {
    const cx = 18 + i * 12 + Math.sin(i * 2.1) * 6, cy = 32 + Math.sin(i * 1.3) * 8, r = 14 + (i % 3) * 5;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 64);
  }
  return new THREE.CanvasTexture(c);
}

const WHITE = new THREE.Color('#ffffff');

export class Weather {
  readonly group = new THREE.Group();
  private wisps: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private wispData: Float32Array;
  private wispAlpha: Float32Array;
  private streaks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private streakPos: Float32Array;
  /** Wind lines: grains of sand and snow racing along the ground, drawn as short streaks. */
  private gusts: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private gustPos: Float32Array;
  private gustHead: Float32Array;
  private seed = new Float32Array(Math.max(WISPS, STREAKS));
  private level = 0;
  private cur: WeatherDef = WEATHER.meadow;
  private color = new THREE.Color('#ffffff');
  private started = false;

  constructor() {
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.setAttribute('uv', quad.getAttribute('uv'));
    this.wispData = new Float32Array(WISPS * 4);
    this.wispAlpha = new Float32Array(WISPS);
    geo.setAttribute('wisp', new THREE.InstancedBufferAttribute(this.wispData, 4));
    geo.setAttribute('alpha', new THREE.InstancedBufferAttribute(this.wispAlpha, 1));
    geo.instanceCount = WISPS;
    this.wisps = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { map: { value: wispTexture() }, color: { value: this.color }, strength: { value: 0 }, uWind: { value: new THREE.Vector2() } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    this.wisps.frustumCulled = false;
    this.wisps.renderOrder = 2;
    const sg = new THREE.BufferGeometry();
    this.streakPos = new Float32Array(STREAKS * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.streakPos, 3));
    this.streaks = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.09, transparent: true, depthWrite: false, opacity: 0, color: '#ffffff' }));
    this.streaks.frustumCulled = false;
    const gg = new THREE.BufferGeometry();
    this.gustPos = new Float32Array(GUSTS * 6);
    this.gustHead = new Float32Array(GUSTS * 3);
    gg.setAttribute('position', new THREE.BufferAttribute(this.gustPos, 3));
    this.gusts = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, color: '#ffffff' }));
    this.gusts.frustumCulled = false;
    for (let i = 0; i < this.seed.length; i++) this.seed[i] = Math.random();
    this.group.add(this.wisps, this.streaks, this.gusts);
  }

  /** Which land's weather, how bright the day is, and where the travellers are. */
  update(dt: number, t: number, land: RegionId, focus: THREE.Vector3, night: number, groundY: number, event: WeatherEvent = 'none'): void {
    const def = weatherFor(land, event);
    // Cross-fade: fade the old weather out, switch, fade the new one in.
    if (def !== this.cur) {
      this.level = Math.max(0, this.level - dt * 0.6);
      if (this.level === 0) this.cur = def;
    } else this.level = Math.min(1, this.level + dt * 0.4);
    const d = this.cur, strength = this.level * d.amount * (1 - night * (1 - d.night));
    this.group.visible = strength > 0.01 && d.kind !== 'none';
    if (!this.group.visible) return;
    this.color.set(d.color);
    if (night > 0.5) this.color.multiplyScalar(0.55 + (d.kind === 'mist' ? 0.25 : 0));
    const wind = currentWind();
    // Dust and snow race; mist and haze drift; pollen floats; rain slants with the wind.
    const pace = d.kind === 'dust' ? 9 : d.kind === 'snow' ? 7 : d.kind === 'pollen' ? 1.2 : d.kind === 'rain' ? 3 : 2;
    const vx = wind.x * (0.6 + wind.strength) * pace, vz = wind.z * (0.6 + wind.strength) * pace;
    const half = BOX / 2;
    if (!this.started) {
      for (let i = 0; i < WISPS; i++) this.wispData.set([focus.x + (this.seed[i] - 0.5) * BOX, 0, focus.z + (((i * 0.618) % 1) - 0.5) * BOX, 0], i * 4);
      for (let i = 0; i < GUSTS; i++) this.gustHead.set([focus.x + (this.seed[(i * 3) % STREAKS] - 0.5) * BOX, groundY + this.seed[(i * 11) % STREAKS] * 3, focus.z + (((i * 0.7548) % 1) - 0.5) * BOX], i * 3);
      for (let i = 0; i < STREAKS; i++) this.streakPos.set([focus.x + (this.seed[i] - 0.5) * BOX, groundY + this.seed[(i * 7) % STREAKS] * 6, focus.z + (((i * 0.382) % 1) - 0.5) * BOX], i * 3);
      this.started = true;
    }
    const low = d.kind === 'mist' ? 14 : d.kind === 'haze' ? 10 : 5;
    for (let i = 0; i < WISPS; i++) {
      const s = this.seed[i];
      let x = this.wispData[i * 4] + vx * dt * (0.7 + s * 0.6), z = this.wispData[i * 4 + 2] + vz * dt * (0.7 + s * 0.6);
      if (x - focus.x > half) x -= BOX; else if (x - focus.x < -half) x += BOX;
      if (z - focus.z > half) z -= BOX; else if (z - focus.z < -half) z += BOX;
      const y = groundY - 0.5 + s * low + Math.sin(t * 0.3 + s * 20) * 0.6;
      const size = (d.kind === 'mist' ? 9 : d.kind === 'dust' ? 5.5 : d.kind === 'snow' ? 4 : 5) * (0.6 + s * 0.9);
      this.wispData[i * 4] = x; this.wispData[i * 4 + 1] = y; this.wispData[i * 4 + 2] = z; this.wispData[i * 4 + 3] = size;
      // Fade at the edges of the box and right in front of the camera.
      const dist = Math.hypot(x - focus.x, z - focus.z);
      this.wispAlpha[i] = Math.min(1, (half - dist) / 12) * Math.min(1, Math.max(0, dist - 8) / 14) * (0.55 + 0.45 * Math.sin(t * 0.5 + s * 30));
    }
    (this.wisps.geometry.getAttribute('wisp') as THREE.BufferAttribute).needsUpdate = true;
    (this.wisps.geometry.getAttribute('alpha') as THREE.BufferAttribute).needsUpdate = true;
    const u = this.wisps.material.uniforms;
    u.strength.value = strength * (d.kind === 'mist' ? 1.1 : d.kind === 'dust' ? 1.6 : d.kind === 'snow' ? 1.3 : d.kind === 'rain' ? 0.35 : 0.8);

    // Rain: drops falling fast, slanting with the wind, all round them.
    if (d.kind === 'rain') {
      const m = this.gusts.material;
      m.color.copy(this.color);
      m.opacity = strength * 0.5;
      for (let i = 0; i < GUSTS; i++) {
        const s = this.seed[(i * 5) % STREAKS];
        let x = this.gustHead[i * 3] + vx * dt, z = this.gustHead[i * 3 + 2] + vz * dt;
        let y = this.gustHead[i * 3 + 1] - dt * (11 + s * 4);
        if (x - focus.x > half) x -= BOX; else if (x - focus.x < -half) x += BOX;
        if (z - focus.z > half) z -= BOX; else if (z - focus.z < -half) z += BOX;
        if (y < groundY) y = groundY + 10 + s * 6;
        this.gustHead[i * 3] = x; this.gustHead[i * 3 + 1] = y; this.gustHead[i * 3 + 2] = z;
        this.gustPos.set([x, y, z, x - vx * 0.05, y + 0.55, z - vz * 0.05], i * 6);
      }
      this.gusts.geometry.attributes.position.needsUpdate = true;
    }
    // Gusts: dust and blown snow race low over the ground as streaks, so you can see the wind.
    const gusty = d.kind === 'dust' || d.kind === 'snow';
    this.gusts.visible = gusty || d.kind === 'rain';
    if (gusty) {
      const m = this.gusts.material;
      m.color.copy(this.color).lerp(WHITE, 0.35);
      m.opacity = strength * 0.55;
      const len = 0.12;
      for (let i = 0; i < GUSTS; i++) {
        const s = this.seed[(i * 5) % STREAKS], v = 1.6 * (0.7 + s * 0.8);
        let x = this.gustHead[i * 3] + vx * dt * v, z = this.gustHead[i * 3 + 2] + vz * dt * v;
        let y = this.gustHead[i * 3 + 1] + Math.sin(t * 2 + s * 30) * dt * 0.6;
        if (x - focus.x > half) x -= BOX; else if (x - focus.x < -half) x += BOX;
        if (z - focus.z > half) z -= BOX; else if (z - focus.z < -half) z += BOX;
        if (y < groundY + 0.05 || y > groundY + 3.5) y = groundY + 0.1 + s * 2.5;
        this.gustHead[i * 3] = x; this.gustHead[i * 3 + 1] = y; this.gustHead[i * 3 + 2] = z;
        const k = len * v;
        this.gustPos.set([x, y, z, x - vx * k, y - 0.02, z - vz * k], i * 6);
      }
      this.gusts.geometry.attributes.position.needsUpdate = true;
    }
    (u.uWind.value as THREE.Vector2).set(wind.x * wind.strength * 0.3, wind.z * wind.strength * 0.3);

    // Streaks: grains and flakes (dust and snow), or floating pollen motes.
    const streaky = d.kind === 'dust' || d.kind === 'snow' || d.kind === 'pollen';
    this.streaks.visible = streaky;
    if (streaky) {
      const m = this.streaks.material;
      m.color.copy(this.color);
      m.opacity = strength * (d.kind === 'pollen' ? 0.8 : 0.65);
      m.size = d.kind === 'snow' ? 0.12 : d.kind === 'pollen' ? 0.1 : 0.07;
      const fast = d.kind === 'pollen' ? 0.6 : 1.8;
      for (let i = 0; i < STREAKS; i++) {
        const s = this.seed[i];
        let x = this.streakPos[i * 3] + vx * dt * fast * (0.8 + s * 0.5), z = this.streakPos[i * 3 + 2] + vz * dt * fast * (0.8 + s * 0.5);
        let y = this.streakPos[i * 3 + 1] + (d.kind === 'snow' ? -0.6 : d.kind === 'pollen' ? Math.sin(t + s * 40) * 0.3 : Math.sin(t * 3 + s * 40) * 0.8) * dt;
        if (x - focus.x > half) x -= BOX; else if (x - focus.x < -half) x += BOX;
        if (z - focus.z > half) z -= BOX; else if (z - focus.z < -half) z += BOX;
        if (y < groundY) y = groundY + 6; else if (y > groundY + 8) y = groundY + 0.2;
        this.streakPos[i * 3] = x; this.streakPos[i * 3 + 1] = y; this.streakPos[i * 3 + 2] = z;
      }
      this.streaks.geometry.attributes.position.needsUpdate = true;
    }
  }
}
