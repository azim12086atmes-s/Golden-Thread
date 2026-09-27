import * as THREE from 'three';
import { BANK, WATERS, type WaterBody } from './waters';
import type { RegionId } from './regions';

/**
 * Fairytale water. The sea, the lakes, the ponds and the rivers share one surface: clear
 * turquoise by day with drifting light-nets (caustics), slow rings and bright glints; after dusk
 * it glows from within in the land's own lantern colour, with a lattice of light that breathes.
 * Round every shore a band of foam laps in and out, glowing — softly by day, brightly at night. The
 * sea and lakes drift on a slow current, and every river visibly runs downstream (riverFlowGeometry).
 */

const WATER_VERT = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const WATER_FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float t; uniform float night; uniform vec3 glow; uniform vec3 deep; uniform vec3 shallow; uniform vec3 sunDir;
  varying vec3 vW;
  vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
  // Distance to the nearest cell edge in a moving cell pattern: bright lines = caustics.
  float cells(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = h2(i + g); o = 0.5 + 0.45 * sin(t * 0.6 + 6.2831 * o);
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return d2 - d1;
  }
  void main() {
    // Everything drifts on a slow current, so even the sea and the lakes are seen to move.
    vec2 p = vW.xz - vec2(0.55, 0.32) * t;
    float c1 = cells(p * 0.16), c2 = cells(p * 0.37 + 11.0);
    float caustic = pow(1.0 - smoothstep(0.0, 0.14, c1), 2.0) * 0.6 + pow(1.0 - smoothstep(0.0, 0.1, c2), 2.0) * 0.35;
    // Slow rings spreading from points on a lattice, as if something just touched the water.
    vec2 cell = floor(p / 23.0), cp = (cell + h2(cell)) * 23.0;
    float r = length(p - cp), ph = fract(t * 0.12 + h2(cell + 3.0).x);
    float ring = exp(-pow((r - ph * 16.0) * 1.3, 2.0)) * (1.0 - ph);
    // A breathing star lattice of light (the night pattern).
    vec2 q = p * 0.09;
    float lattice = abs(sin(q.x + q.y + t * 0.2)) * abs(sin(q.x - q.y - t * 0.17));
    float stars = pow(1.0 - smoothstep(0.0, 0.08, lattice), 2.0);
    // Sun glints: tiny sparkles that flicker.
    vec2 gc = floor(p * 1.7);
    float glint = step(0.985, h2(gc + floor(t * 3.0)).x) * (1.0 - night);
    float fres = 0.5 + 0.5 * sin(p.x * 0.05 + t * 0.3) * sin(p.y * 0.043 - t * 0.21);
    vec3 col = mix(deep, shallow, 0.35 + fres * 0.3);
    col += vec3(1.0, 0.98, 0.9) * caustic * (0.35 - night * 0.2);
    col += vec3(1.0) * ring * 0.25;
    col = mix(col, col * 0.35 + glow * 0.18, night * 0.75);
    col += glow * (caustic * 0.5 + stars * 0.7 + ring * 0.4) * (0.1 + night * 0.9);
    col += vec3(1.0) * glint * 1.5;
    gl_FragColor = vec4(col, 0.86);
    #include <fog_fragment>
  }`;

export function waterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      t: { value: 0 }, night: { value: 0 }, glow: { value: new THREE.Color('#7affe0') },
      deep: { value: new THREE.Color('#1f7fae') }, shallow: { value: new THREE.Color('#5ad8d0') }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
    }]),
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, fog: true, depthWrite: false,
  });
}

const FOAM_FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float t; uniform float night; uniform vec3 glow;
  varying vec2 vUv; varying vec3 vW;
  float n(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
  float sn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(n(i), n(i + vec2(1, 0)), f.x), mix(n(i + vec2(0, 1)), n(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    // vUv.y: 0 on the water side, 1 on the shore. Bands of foam run in towards the shore and fade.
    float wave = fract(vUv.y * 2.2 - t * 0.35 + sn(vW.xz * 0.35) * 0.6);
    float band = smoothstep(0.0, 0.12, wave) * (1.0 - smoothstep(0.18, 0.5, wave));
    float lace = smoothstep(0.45, 0.8, sn(vW.xz * 1.8 + vec2(t * 0.3, -t * 0.2)));
    float edge = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
    float a = clamp(band * 0.8 + lace * 0.35 * band + 0.15 * smoothstep(0.55, 0.95, vUv.y), 0.0, 1.0) * edge;
    // The foam glows: bright white by day, lit from within in the land's lantern colour at night,
    // brightest along its lacy crests — just over the bloom threshold (1.0), so it glows softly
    // rather than flaring.
    float crest = band * (0.6 + lace * 0.8);
    vec3 col = mix(vec3(0.98, 1.0, 1.02), glow * 1.1 + 0.2, night * 0.8) * (1.0 + crest * (0.06 + night * 0.28));
    gl_FragColor = vec4(col, clamp(a * (0.85 + night * 0.1), 0.0, 1.0));
    #include <fog_fragment>
  }`;

const FOAM_VERT = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv; varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

export function foamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, night: { value: 0 }, glow: { value: new THREE.Color('#7affe0') } }]),
    vertexShader: FOAM_VERT, fragmentShader: FOAM_FRAG, transparent: true, fog: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
}

/** The foam strips round every shore in a land (world coordinates), at the water line. */
export function shoreGeometry(land: RegionId, waterY: number): THREE.BufferGeometry | null {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const strip = (inner: Array<[number, number]>, outer: Array<[number, number]>, closed: boolean) => {
    const base = pos.length / 3, n = inner.length;
    for (let i = 0; i < n; i++) {
      pos.push(inner[i][0], waterY + 0.04, inner[i][1], outer[i][0], waterY + 0.04, outer[i][1]);
      uv.push(i / n, 0, i / n, 1);
    }
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2, b = base + ((i + 1) % n) * 2;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  };
  // The water's edge sits a little outside the carved edge (the bank dips below the water line).
  const shore = BANK * 0.2;
  for (const b of WATERS) {
    if (b.land !== land) continue;
    if (b.kind === 'river') {
      for (const side of [-1, 1]) {
        const inner: Array<[number, number]> = [], outer: Array<[number, number]> = [];
        b.pts.forEach((p, i) => {
          const q = b.pts[Math.min(b.pts.length - 1, i + 1)], o = b.pts[Math.max(0, i - 1)];
          const dx = q[0] - o[0], dz = q[1] - o[1], L = Math.hypot(dx, dz) || 1;
          const nx = (-dz / L) * side, nz = (dx / L) * side;
          const e = b.w / 2 + shore;
          inner.push([p[0] + nx * (e - 2.4), p[1] + nz * (e - 2.4)]);
          outer.push([p[0] + nx * (e + 0.6), p[1] + nz * (e + 0.6)]);
        });
        strip(inner, outer, false);
      }
    } else {
      const inner: Array<[number, number]> = [], outer: Array<[number, number]> = [];
      const n = Math.max(24, Math.round(b.r * 2.2));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, e = b.r + shore;
        inner.push([b.x + Math.cos(a) * (e - 2.8), b.z + Math.sin(a) * (e - 2.8)]);
        outer.push([b.x + Math.cos(a) * (e + 0.6), b.z + Math.sin(a) * (e + 0.6)]);
      }
      strip(inner, outer, true);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Lily pads and lotus flowers floating on a land's ponds and lakes (the flowers glow at night). */
export function lotusSpots(land: RegionId): Array<{ x: number; z: number; flower: boolean; body: WaterBody }> {
  const out: Array<{ x: number; z: number; flower: boolean; body: WaterBody }> = [];
  for (const b of WATERS) {
    if (b.land !== land || b.kind === 'river') continue;
    const n = b.kind === 'lake' ? 16 : 7;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 + b.r, r = b.r * (0.35 + ((i * 0.618) % 1) * 0.5);
      out.push({ x: b.x + Math.cos(a) * r, z: b.z + Math.sin(a) * r, flower: i % 3 === 0, body: b });
    }
  }
  return out;
}


const FLOW_FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float t; uniform float night; uniform vec3 glow;
  varying vec2 vUv; varying vec3 vW;
  float n(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
  float sn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(n(i), n(i + vec2(1, 0)), f.x), mix(n(i + vec2(0, 1)), n(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    // vUv.x: metres downstream; vUv.y: 0..1 across. Streaks of light run downstream, faster mid-stream.
    float mid = 1.0 - abs(vUv.y * 2.0 - 1.0);
    float speed = 1.2 + mid * 1.6;
    float s1 = sn(vec2(vUv.x * 0.35 - t * speed, vUv.y * 9.0));
    float s2 = sn(vec2(vUv.x * 0.9 - t * speed * 1.7, vUv.y * 16.0) + 5.0);
    float streak = smoothstep(0.62, 0.95, s1 * 0.6 + s2 * 0.5);
    float edge = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
    vec3 col = mix(vec3(1.0), glow * 1.15 + 0.2, night * 0.8);
    gl_FragColor = vec4(col, streak * edge * (0.34 + night * 0.12));
    #include <fog_fragment>
  }`;

/** The streaks of a river's current (drawn over the water, along each land's river). */
export function riverFlowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, night: { value: 0 }, glow: { value: new THREE.Color('#7affe0') } }]),
    vertexShader: FOAM_VERT, fragmentShader: FLOW_FRAG, transparent: true, fog: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -3,
  });
}

/** A ribbon down the middle of each river in a land (uv.x: metres downstream, uv.y: across), just above the water. */
export function riverFlowGeometry(land: RegionId, waterY: number): THREE.BufferGeometry | null {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const b of WATERS) {
    if (b.land !== land || b.kind !== 'river') continue;
    const base = pos.length / 3, half = b.w * 0.42;
    let run = 0;
    b.pts.forEach((p, i) => {
      const q = b.pts[Math.min(b.pts.length - 1, i + 1)], o = b.pts[Math.max(0, i - 1)];
      const dx = q[0] - o[0], dz = q[1] - o[1], L = Math.hypot(dx, dz) || 1;
      const nx = -dz / L, nz = dx / L;
      if (i > 0) run += Math.hypot(p[0] - b.pts[i - 1][0], p[1] - b.pts[i - 1][1]);
      pos.push(p[0] - nx * half, waterY + 0.05, p[1] - nz * half, p[0] + nx * half, waterY + 0.05, p[1] + nz * half);
      uv.push(run, 0, run, 1);
    });
    for (let i = 0; i < b.pts.length - 1; i++) {
      const a = base + i * 2, c = base + (i + 1) * 2;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
