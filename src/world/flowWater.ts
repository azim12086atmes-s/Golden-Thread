import * as THREE from 'three';
import type { Ctx } from './architecture';

/** What the water helpers draw with: the stone and glow builders, and the water builder when there is one. */
export type WaterCtx = Pick<Ctx, 'g' | 'glow' | 'water'>;
import { box, cyl, sphere, type GeoBuilder } from './kit';

/**
 * Built water — garden channels, reflecting pools, temple tanks and fountain basins — that flows.
 *
 * Every stretch of built water carries its flow in its vertex colour (red/blue: the direction
 * across the ground, green: how fast), so one material can make a Mughal channel run away from
 * its central tank, a courtyard basin turn slowly and a reflecting pool barely stir. By day it is
 * clear turquoise with ripples running downstream; after dusk it glows from within in the land's
 * lantern colour. Each piece is banked like a fountain: a raised stone kerb all round, a line of
 * foam where the water meets the stone (in the glow builder, so it glows at night), and — for the
 * grand channels — a row of fountain jets. World water (sea, lakes, rivers) is in Water.ts.
 */

const VERT = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vW; varying vec3 vFlow; varying vec3 vN;
  void main() {
    vFlow = color;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float t; uniform float night; uniform vec3 glow;
  varying vec3 vW; varying vec3 vFlow; varying vec3 vN;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main() {
    vec2 d = vFlow.xz * 2.0 - 1.0;
    float sp = vFlow.y, L = length(d);
    vec2 dir = L > 0.1 ? d / L : vec2(0.0, 1.0), perp = vec2(-dir.y, dir.x);
    vec2 p = vW.xz;
    // A waterfall (a sheet standing upright): streaks pour straight down it, fast and white.
    float fall = 1.0 - smoothstep(0.35, 0.6, abs(vN.y));
    if (fall > 0.5) {
      vec2 across = normalize(vec2(-vN.z, vN.x) + vec2(1e-4));
      p = vec2(dot(vW.xz, across), vW.y);
      dir = vec2(0.0, -1.0); perp = vec2(1.0, 0.0); sp = max(sp, 1.3);
    }
    float a = dot(p, dir), b = dot(p, perp);
    // Ripples running downstream: long streaks, faster where the water runs faster.
    float n1 = sn(vec2(a * 0.7 - t * sp * 3.2, b * 2.4));
    float n2 = sn(vec2(a * 1.8 - t * sp * 5.5, b * 4.5) + 7.0);
    float streak = smoothstep(0.58, 0.92, n1 * 0.6 + n2 * 0.5);
    // Still water: slow drifting light.
    float still = smoothstep(0.55, 0.95, sn(p * 1.3 + vec2(t * 0.16, -t * 0.11)) * 0.7 + sn(p * 3.1 - t * 0.2) * 0.4);
    float rip = mix(still, streak, clamp(sp * 1.6, 0.0, 1.0));
    float sparkle = step(0.992, h(floor(p * 6.0) + floor(t * 4.0))) * (1.0 - night);
    vec3 deep = vec3(0.09, 0.42, 0.6), shallow = vec3(0.33, 0.8, 0.86);
    vec3 col = mix(deep, shallow, 0.45 + 0.3 * sn(p * 0.4 + t * 0.05));
    col += vec3(1.0, 0.99, 0.94) * rip * 0.38 + sparkle;
    col = mix(col, col * 0.35 + glow * 0.3, night * 0.75);
    col += glow * rip * night * 0.75;
    col = mix(col, vec3(0.86, 0.95, 1.0) * (1.0 - night * 0.5) + glow * night * 0.3, fall * (0.3 + rip * 0.4));
    gl_FragColor = vec4(col, 0.9 - fall * 0.2 * (1.0 - rip));
    #include <fog_fragment>
  }`;

/** One material for all built water; the game sets `t`, `night` and `glow` every frame (World.setWaterLook). */
export function builtWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, night: { value: 0 }, glow: { value: new THREE.Color('#7affe0') } }]),
    vertexShader: VERT, fragmentShader: FRAG, vertexColors: true, transparent: true, fog: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
}

const _v = new THREE.Vector3(), _c = new THREE.Color();

/**
 * Add a water surface to the builder: `flow` is the local direction it runs (null: still), `speed`
 * 0 (a still pool) … 1 (a lively channel). The direction is turned into the world by the builder's
 * current frame and stored in the vertex colour for the material.
 */
export function addWater(b: GeoBuilder, geo: THREE.BufferGeometry, local: THREE.Matrix4, flow: [number, number] | null, speed: number): void {
  let fx = 0, fz = 0;
  if (flow) {
    _v.set(flow[0], 0, flow[1]).transformDirection(new THREE.Matrix4().multiplyMatrices(b.top, local));
    const L = Math.hypot(_v.x, _v.z) || 1;
    fx = _v.x / L; fz = _v.z / L;
  }
  b.add(geo, _c.setRGB(0.5 + 0.5 * fx, flow ? speed : 0, 0.5 + 0.5 * fz), local);
}

/** Where built water goes: the water builder when the context has one, else the glow (it still reads as water). */
const waterOf = (c: WaterCtx): GeoBuilder => c.water ?? c.glow;

/**
 * Draw in the stone builder's current frame in every builder at once. Callers often frame only
 * `c.g` and `c.glow` (street props, houses), never the water builder, so the glow and the water
 * take `c.g`'s frame here: foam, jets and water always sit exactly where the stone is.
 */
function inFrame(c: WaterCtx, x: number, y: number, z: number, ry: number, fn: () => void): void {
  const top = c.g.top;
  c.glow.withTop(top, () => {
    const w = waterOf(c);
    const go = () => c.g.frame(x, y, z, ry, 1, () => c.glow.frame(x, y, z, ry, 1, () => (w === c.glow ? fn() : w.frame(x, y, z, ry, 1, fn))));
    if (w === c.glow) go(); else w.withTop(top, go);
  });
}

const FOAM = '#e6fbff';

export interface WaterOpts {
  /** Kerb stone colour. */
  stone?: string;
  /** Height of the kerb above the ground (the water sits 0.12 below its top). */
  kerb?: number;
  /** Local flow direction (channels) and speed 0–1. */
  flow?: [number, number] | null;
  speed?: number;
  /** Fountain jets along the middle, this far apart (channels), or one in the centre (pools, basins). */
  jets?: number;
  jetHeight?: number;
}

/** A fountain jet at (x, y, z): a rising column of water, a crown of spray and a ring of foam where it falls. */
export function fountainJet(c: WaterCtx, x: number, y: number, z: number, h = 1.4): void {
  cyl(c.glow, 0.045, 0.07, h, '#dff6ff', x, y, z, 6);
  sphere(c.glow, 0.12, '#f4fdff', x, y + h, z, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    sphere(c.glow, 0.06, '#e6fbff', x + Math.cos(a) * 0.28, y + h * 0.72, z + Math.sin(a) * 0.28, 4);
  }
  const ring = new THREE.TorusGeometry(0.35, 0.05, 4, 14).rotateX(Math.PI / 2);
  c.glow.add(ring, FOAM, new THREE.Matrix4().makeTranslation(x, y + 0.02, z));
}

/**
 * A straight channel `len` long (along local z) and `w` wide, centred at (x, z) on ground y, turned
 * by `ry`: a stone kerb both sides and at the ends, water running along it, foam lines along the
 * kerbs and, if asked, fountain jets down its middle.
 */
export function waterChannel(c: WaterCtx, x: number, y: number, z: number, len: number, w: number, ry = 0, o: WaterOpts = {}): void {
  const stone = o.stone ?? '#d9d0c0', k = o.kerb ?? 0.45, wy = k - 0.12;
  const run = () => {
    box(c.g, w + 0.8, 0.12, len + 0.8, '#2f5a6a', 0, 0.02, 0); // the channel bed
    for (const s of [-1, 1]) {
      box(c.g, 0.4, k, len + 0.8, stone, s * (w / 2 + 0.2), 0, 0);
      box(c.g, w, k, 0.4, stone, 0, 0, s * (len / 2 + 0.2));
      box(c.glow, 0.1, 0.02, len, FOAM, s * (w / 2 - 0.05), wy + 0.01, 0);
    }
    addWater(waterOf(c), new THREE.PlaneGeometry(w, len).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(0, wy, 0), o.flow === undefined ? [0, 1] : o.flow, o.speed ?? 0.6);
    if (o.jets) for (let zz = -len / 2 + o.jets / 2; zz < len / 2; zz += o.jets) fountainJet(c, 0, wy, zz, o.jetHeight ?? 1.4);
  };
  inFrame(c, x, y, z, ry, run);
}

/** A rectangular pool `w` × `d` with a kerb all round, still or gently moving, with an optional central fountain. */
export function waterPool(c: WaterCtx, x: number, y: number, z: number, w: number, d: number, ry = 0, o: WaterOpts = {}): void {
  waterChannel(c, x, y, z, d, w, ry, { ...o, flow: o.flow ?? null, speed: o.speed ?? 0.1, jets: 0 });
  if (o.jets) inFrame(c, x, y, z, ry, () => fountainJet(c, 0, (o.kerb ?? 0.45) - 0.12, 0, o.jetHeight ?? 2));
}

/**
 * A round basin of radius `r` (a many-sided one for `seg` 6–8): a kerb wall with a rolled lip,
 * water turning slowly inside, a foam ring at the lip and a jet (or a tiered fountain) at its heart.
 */
export function waterBasin(c: WaterCtx, x: number, y: number, z: number, r: number, o: WaterOpts & { seg?: number; tiers?: boolean } = {}): void {
  const stone = o.stone ?? '#e8dcc6', k = o.kerb ?? 0.6, wy = k - 0.12, seg = o.seg ?? 20;
  inFrame(c, x, y, z, 0, () => {
    cyl(c.g, r * 0.98, r * 0.98, 0.1, '#2f5a6a', 0, 0.02, 0, seg);
    const wall = new THREE.CylinderGeometry(r + 0.25, r + 0.3, k, seg, 1, true).translate(0, k / 2, 0);
    c.g.add(wall, stone);
    const inner = new THREE.CylinderGeometry(r, r, k, seg, 1, true).translate(0, k / 2, 0);
    c.g.add(inner, stone);
    const lip = new THREE.TorusGeometry(r + 0.12, 0.16, 5, seg).rotateX(Math.PI / 2);
    c.g.add(lip, stone, new THREE.Matrix4().makeTranslation(0, k, 0));
    const foam = new THREE.TorusGeometry(r - 0.06, 0.05, 3, seg).rotateX(Math.PI / 2);
    c.glow.add(foam, FOAM, new THREE.Matrix4().makeTranslation(0, wy + 0.01, 0));
    // The water turns gently round the basin (its flow runs along the circle, in quarters).
    for (let q = 0; q < 4; q++) {
      const a0 = (q / 4) * Math.PI * 2, mid = a0 + Math.PI / 4;
      const disc = new THREE.CircleGeometry(r, Math.max(4, Math.round(seg / 4)), a0, Math.PI / 2).rotateX(-Math.PI / 2);
      // The circle lies in x/y and is laid flat (y → −z): the way round at angle `mid` is (−sin, −cos) on the ground.
      addWater(waterOf(c), disc, new THREE.Matrix4().makeTranslation(0, wy, 0), [-Math.sin(mid), -Math.cos(mid)], o.speed ?? 0.25);
    }
    if (o.tiers) {
      cyl(c.g, 0.25, 0.35, 1.5, stone, 0, 0, 0, 8);
      cyl(c.g, r * 0.35, r * 0.25, 0.25, stone, 0, 1.5, 0, 12);
      fountainJet(c, 0, 1.75, 0, o.jetHeight ?? 0.9);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        cyl(c.glow, 0.03, 0.03, 1.45, '#dff6ff', Math.cos(a) * r * 0.33, wy, Math.sin(a) * r * 0.33, 3);
      }
    } else if (o.jets !== 0) fountainJet(c, 0, wy, 0, o.jetHeight ?? 1.6);
  });
}

/**
 * A waterfall pouring over an edge at (x, y, z), falling towards local +z (turned by `ry`): the
 * water curls over the lip, drops `drop` metres as a sheet `w` wide, narrowing as it falls, and
 * ends in a cloud of spray. A pool or stream above can feed it; the drop may end in the air (off a
 * floating island) or in a pool below.
 */
export function waterfall(c: WaterCtx, x: number, y: number, z: number, ry: number, w: number, drop: number, o: { mist?: boolean; stone?: string } = {}): void {
  inFrame(c, x, y, z, ry, () => {
    const N = 14, pos: number[] = [], idx: number[] = [];
    for (let k = 0; k <= N; k++) {
      const f = k / N;
      // Over the lip (the first part curls out and down), then straight down, drifting a little outward.
      const out = 0.9 * Math.sqrt(f) + f * drop * 0.05, fy = k === 0 ? 0.04 : -drop * f * f * 0.35 - drop * f * 0.65;
      const half = (w / 2) * (1 - 0.3 * f);
      pos.push(-half, fy, out, half, fy, out);
    }
    for (let k = 0; k < N; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    addWater(waterOf(c), geo, new THREE.Matrix4(), [0, 1], 1);
    // Foam along the lip, and spray where it lands (or thins away into the sky).
    c.glow.add(new THREE.CylinderGeometry(0.07, 0.07, w, 4).rotateZ(Math.PI / 2), FOAM, new THREE.Matrix4().makeTranslation(0, 0.08, 0.15));
    if (o.mist !== false) {
      const bz = 0.9 + drop * 0.05;
      for (let i = 0; i < 5; i++) sphere(c.g, w * (0.22 + 0.06 * i), '#f4fbff', ((i % 3) - 1) * w * 0.25, -drop + i * 0.25, bz + (i % 2) * 0.4, 6);
    }
  });
}
