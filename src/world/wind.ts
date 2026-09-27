import * as THREE from 'three';
import type { RegionId } from './regions';
import { SURFACE_GLSL } from './surfaces';

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
  vec2 windOffset(vec3 wp, float weight) {
    float along = dot(wp.xz, uWindDir);
    float gust = 0.55 + 0.45 * sin(uWindTime * 0.9 - along * 0.045);
    float wave = sin(uWindTime * 2.3 - along * 0.32) * 0.6 + sin(uWindTime * 4.1 + wp.x * 0.61 + wp.z * 0.37) * 0.25;
    return uWindDir * (0.35 + wave * 0.5 + 0.35) * gust * uWindStrength * weight;
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
    vec3 q = vLW * 1.7;
    float dapple = fract(sin(dot(floor(q), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    diffuseColor.rgb *= 0.78 + dapple * 0.16;
    vLeafGlow = 1.0;
  }`;

/**
 * Make a GeoBuilder material sway: vertices carry a `sway` weight (0 for walls and trunks,
 * up to 1 for leaves and flowers), and move with the wind in world space. With `leaves`, parts
 * marked as foliage are drawn as leaves (see LEAF_FRAG).
 */
export function swayMaterial<T extends THREE.Material>(mat: T, amount = 0.45, leaves = false, surfaces = false): T {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, leaves ? FOLIAGE_UNIFORMS : {});
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float sway;\n${WIND_GLSL}${leaves ? '\nattribute float leaf; varying float vLeaf; varying vec3 vLW; varying vec3 vLN;' : ''}${surfaces ? '\nattribute float surf; varying float vSurf;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nif (sway > 0.0) { vec3 wpS = (modelMatrix * vec4(transformed, 1.0)).xyz; transformed.xz += windOffset(wpS, sway) * ${amount.toFixed(3)}; }`);
    if (!leaves) return;
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vLeaf = leaf; vLW = (modelMatrix * vec4(transformed, 1.0)).xyz; vLN = normalize(mat3(modelMatrix) * objectNormal);${surfaces ? ' vSurf = surf;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vLeaf; varying vec3 vLW; varying vec3 vLN; uniform vec3 uSunDir; uniform float uLeafNight;${surfaces ? `\nvarying float vSurf;\n${SURFACE_GLSL}` : ''}`)
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
        }`);
  };
  mat.customProgramCacheKey = () => 'sway' + amount + (leaves ? '-leaves' : '') + (surfaces ? '-surfaces' : '');
  return mat;
}
