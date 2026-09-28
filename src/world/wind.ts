import * as THREE from 'three';
import type { RegionId } from './regions';
import { SURFACE_GLSL } from './surfaces';
import { LAMP_GLSL, LAMP_UNIFORMS } from './lamplight';

/**
 * The wind. One breeze for the whole world: it turns slowly, gusts come and go, and each land
 * has its own strength (a gentle meadow breeze, a sea wind on the fjords, desert gusts, calm
 * courtyards). Grass, tree crowns, flowers and drifting petals all move with it — they read
 * the same uniforms, so a gust runs across a field as a visible wave.
 */

export const LAND_WIND: Record<RegionId, number> = {
  meadow: 0.7, japan: 0.5, korea: 0.55, china: 0.5, norway: 0.95, switzerland: 0.8, london: 0.75, newyork: 0.6,
  renaissance: 0.45, vintage: 0.6, islamic: 0.35, middleeast: 0.55, desert: 1.0, egypt: 0.6, indianorth: 0.55,
  indiasouth: 0.65, mughal: 0.4, indonesia: 0.6, aurora: 0.9, skyisles: 0.8,
};

/** Wind at time t (seconds) for a land: a unit direction and a strength (0..~1.3). Pure. */
export function windAt(t: number, land: RegionId): { x: number; z: number; strength: number } {
  const a = 0.6 + Math.sin(t * 0.013) * 1.1 + Math.sin(t * 0.0041) * 0.8;
  const gust = 0.75 + 0.25 * Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1.3);
  return { x: Math.cos(a), z: Math.sin(a), strength: LAND_WIND[land] * gust };
}

/** Shared by every material that sways. */
export const WIND_UNIFORMS = {
  uWindTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(1, 0) },
  uWindStrength: { value: 0.6 },
};

let land: RegionId = 'meadow', strength = 0.6;
/** Called once a frame. The strength eases between lands. */
export function updateWind(t: number, region: RegionId, dt: number): void {
  land = region;
  const w = windAt(t, land);
  strength += (w.strength - strength) * Math.min(1, dt * 0.5);
  WIND_UNIFORMS.uWindTime.value = t;
  WIND_UNIFORMS.uWindDir.value.set(w.x, w.z);
  WIND_UNIFORMS.uWindStrength.value = strength;
}

/** The wind right now, for things moved on the CPU (particles, the carpet, cloth). */
export function currentWind(): { x: number; z: number; strength: number } {
  const d = WIND_UNIFORMS.uWindDir.value;
  return { x: d.x, z: d.y, strength };
}

/** GLSL: how far a point at world position wp moves, scaled by how free it is to move (0..1). */
export const WIND_GLSL = /* glsl */ `
  uniform float uWindTime; uniform vec2 uWindDir; uniform float uWindStrength;
  float wNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  vec2 windOffset(vec3 wp, float weight) {
    vec2 across = vec2(-uWindDir.y, uWindDir.x);
    float along = dot(wp.xz, uWindDir), side = dot(wp.xz, across);
    // Gusts: patches of stronger wind, each its own shape, drifting downwind at an easy pace, with
    // lulls between them — not one wave sweeping the whole field.
    float g = wNoise(vec2(along * 0.03 - uWindTime * 0.16, side * 0.045)) * 0.65 + wNoise(vec2(along * 0.08 - uWindTime * 0.27, side * 0.11 + 3.7)) * 0.35;
    float gust = 0.25 + 0.95 * smoothstep(0.3, 0.8, g);
    // Sway: slow, every plant a little out of step with its neighbours.
    float ph = wNoise(wp.xz * 0.6) * 6.2832;
    float wave = sin(uWindTime * 1.1 - along * 0.15 + ph) * 0.55 + sin(uWindTime * 1.9 + ph * 1.7) * 0.15;
    return uWindDir * (0.55 + wave * 0.5) * gust * uWindStrength * weight;
  }`;

/** Sun and night for leaves (set once a frame by the game). */
export const FOLIAGE_UNIFORMS = {
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uLeafNight: { value: 0 },
};

/**
 * Leaves. Crown parts (GeoBuilder `leaf` = 1) are the smooth blobs inside a crown: shaded a
 * little darker and dappled, as the mass of leaves behind the leaf cards (foliage.ts), and lit
 * through by the sun when it is behind them.
 */
const LEAF_FRAG = /* glsl */ `
  if (vLeaf > 0.5) {
    // The crown painted as a mass of overlapping leaves (projected from the side it faces): in
    // each small cell a leaf at its own angle and shade, the top-most one showing, dark gaps
    // between them. On colourful trees every leaf takes its own hue.
    vec3 an = abs(normalize(vLN));
    vec2 uvL = (an.y > max(an.x, an.z) ? vLW.xz : (an.x > an.z ? vLW.zy : vLW.xy)) * 3.4;
    vec2 ci = floor(uvL);
    float best = 0.0, shade = 0.5, hue = 0.5;
    for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
      vec2 cc = ci + vec2(float(xx), float(yy));
      float hA = fract(sin(dot(cc, vec2(12.9898, 78.233))) * 43758.5453);
      float hB = fract(sin(dot(cc, vec2(39.3468, 11.135))) * 43758.5453);
      vec2 d = uvL - (cc + 0.5 + (vec2(hA, hB) - 0.5) * 0.8);
      float a = hA * 6.2832;
      d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
      float leafv = 1.0 - smoothstep(0.42, 0.6, length(d * vec2(1.0, 2.1)));
      float z = leafv * (0.4 + hB);
      if (z > best) { best = z; shade = hB * 0.6 + 0.4 + d.x * 0.35; hue = hA; }
    }
    float onLeaf = smoothstep(0.02, 0.12, best);
    vec3 base = diffuseColor.rgb;
    float sat = max(base.r, max(base.g, base.b)) - min(base.r, min(base.g, base.b));
    float colourful = smoothstep(0.05, 0.25, sat) * (1.0 - smoothstep(0.0, 0.08, base.g - max(base.r, base.b)));
    vec3 tint = hue < 0.5 ? vec3(1.14, 0.94, 0.9) : vec3(0.92, 0.98, 1.14);
    vec3 leafCol = base * mix(vec3(1.0), tint, colourful * abs(hue - 0.5) * 1.6) * (0.8 + shade * 0.35);
    diffuseColor.rgb = mix(base * 0.5, leafCol, onLeaf);
    // At the crown's edge the gaps between the leaves are open sky: a leafy outline, not a ball.
    float rim = 1.0 - abs(dot(normalize(vLN), normalize(cameraPosition - vLW)));
    if (rim > 0.5 && onLeaf < 0.5) discard;
    vLeafGlow = 1.0;
  }`;

/**
 * Make a GeoBuilder material sway: vertices carry a `sway` weight (0 for walls and trunks,
 * up to 1 for leaves and flowers), and move with the wind in world space. With `leaves`, parts
 * marked as foliage are drawn as leaves (see LEAF_FRAG).
 */
export function swayMaterial<T extends THREE.Material>(mat: T, amount = 0.45, leaves = false, surfaces = false): T {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, leaves ? FOLIAGE_UNIFORMS : {}, leaves ? LAMP_UNIFORMS : {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float sway;\n${WIND_GLSL}${leaves ? '\nattribute float leaf; varying float vLeaf; varying vec3 vLW; varying vec3 vLN;' : ''}${surfaces ? '\nattribute float surf; varying float vSurf;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nif (sway > 0.0) { vec3 wpS = (modelMatrix * vec4(transformed, 1.0)).xyz; transformed.xz += windOffset(wpS, sway) * ${amount.toFixed(3)}; }`);
    if (!leaves) return;
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vLeaf = leaf; vLW = (modelMatrix * vec4(transformed, 1.0)).xyz; vLN = normalize(mat3(modelMatrix) * objectNormal);${surfaces ? ' vSurf = surf;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vLeaf; varying vec3 vLW; varying vec3 vLN; uniform vec3 uSunDir; uniform float uLeafNight;
        ${LAMP_GLSL}${surfaces ? `\nvarying float vSurf;\n${SURFACE_GLSL}` : ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float vLeafGlow = 0.0;
        ${LEAF_FRAG}
        ${surfaces ? `if (vSurf > 0.5) {
          // What the wall, roof or road is made of (surfaces.ts), fading to plain colour far away.
          vec2 sg = surface(vSurf, vLW, normalize(vLN));
          float sfade = 1.0 - smoothstep(45.0, 140.0, length(vLW - cameraPosition));
          diffuseColor.rgb *= mix(1.0, sg.x * (1.0 - sg.y * 0.45), sfade);
        }` : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vLeafGlow > 0.5) {
          // Sunlight through the leaves, and a soft inner light so crowns never go dead-dark.
          float back = pow(max(dot(normalize(vLW - cameraPosition), normalize(uSunDir)), 0.0), 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * (back * 0.6 + 0.07) * (1.0 - uLeafNight);
        }
        // Lamplight on the walls, trees and props near each lamp after dusk (lamplight.ts).
        totalEmissiveRadiance += diffuseColor.rgb * lampLight(vLW, normalize(vLN)) * 0.85;`);
  };
  mat.customProgramCacheKey = () => 'sway' + amount + (leaves ? '-leaves' : '') + (surfaces ? '-surfaces' : '') + (leaves ? '-lamps' : '');
  return mat;
}
