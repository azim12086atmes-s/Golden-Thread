import * as THREE from 'three';

/**
 * Real light from the lamps (owner: "real lighting: lamps and lanterns that light the ground round
 * them"). Every street lamp, riverside lamp, door lamp and lantern is recorded where it is built
 * (RegionBuilder `lamps`); each frame the nearest LAMP_MAX are handed to the ground's shader and the
 * world's (buildings, trees, props), which add each lamp's own colour of light falling off softly
 * over its reach and facing it, so paving, walls and grass glow warm in pools round every lamp after
 * dusk. Cheap: a few dozen distance tests per pixel, no shadow maps, no scene lights.
 */
export const LAMP_MAX = 24;

export interface Lamp { x: number; y: number; z: number; r: number; color: string }

export const LAMP_UNIFORMS = {
  uLamps: { value: Array.from({ length: LAMP_MAX }, () => new THREE.Vector4(0, -1e4, 0, 0.001)) },
  uLampCol: { value: Array.from({ length: LAMP_MAX }, () => new THREE.Color(0, 0, 0)) },
  /** 0 by day … 1 at night: how strongly the lamps show. */
  uLampOn: { value: 0 },
};

/** GLSL: the light the lamps throw on a surface at world position wp with world normal n. */
export const LAMP_GLSL = /* glsl */ `
  uniform vec4 uLamps[${LAMP_MAX}];
  uniform vec3 uLampCol[${LAMP_MAX}];
  uniform float uLampOn;
  vec3 lampLight(vec3 wp, vec3 n) {
    vec3 sum = vec3(0.0);
    if (uLampOn < 0.01) return sum;
    for (int i = 0; i < ${LAMP_MAX}; i++) {
      vec3 d = uLamps[i].xyz - wp;
      float r = uLamps[i].w, dist = length(d);
      if (dist > r) continue;
      float k = 1.0 - dist / r;
      float face = 0.35 + 0.65 * max(dot(n, d / max(dist, 0.001)), 0.0);
      sum += uLampCol[i] * k * k * face;
    }
    return sum * uLampOn;
  }`;

/**
 * Hand the shaders the lamps nearest to `p`, and how dark it is. The farthest of those chosen fade to
 * nothing, so a lamp joining or leaving the set as you walk brightens in or dims out rather than
 * popping. Unused slots are parked far below the world.
 */
export function setLamps(lamps: readonly Lamp[], p: THREE.Vector3, night: number): void {
  const U = LAMP_UNIFORMS;
  U.uLampOn.value = THREE.MathUtils.smoothstep(night, 0.25, 0.75);
  near.length = 0;
  for (const l of lamps) {
    const d = (l.x - p.x) ** 2 + (l.z - p.z) ** 2;
    if (d < REACH * REACH) near.push({ d: Math.sqrt(d), l });
  }
  near.sort((a, b) => a.d - b.d);
  // The reach of the set: the (LAMP_MAX+1)-th lamp's distance, or REACH if fewer.
  const edge = near.length > LAMP_MAX ? near[LAMP_MAX].d : REACH;
  for (let i = 0; i < LAMP_MAX; i++) {
    const n = near[i];
    if (!n) { U.uLamps.value[i].set(0, -1e4, 0, 0.001); U.uLampCol.value[i].setRGB(0, 0, 0); continue; }
    const fade = 1 - THREE.MathUtils.smoothstep(n.d, edge * 0.7, edge);
    U.uLamps.value[i].set(n.l.x, n.l.y, n.l.z, n.l.r);
    U.uLampCol.value[i].set(n.l.color).multiplyScalar(1.15 * fade);
  }
}

const REACH = 90;
const near: Array<{ d: number; l: Lamp }> = [];
