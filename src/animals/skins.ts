import * as THREE from 'three';

/**
 * Skins drawn procedurally on animals (no image files): fur, feathers and scales. The pattern is
 * computed from each part's own (object-space) position, so it moves with the animal instead of
 * swimming across it.
 *
 *  - Fur: fine streaks running along the body, a little clumping, and a soft fuzzy rim of light
 *    where the surface turns away (fur catches the light at its edges).
 *  - Feathers: a pale shaft down the middle and barbs angled off it, darker towards the edges.
 *  - Scales: overlapping rounded scales, each with its own sheen, with a faint blue-violet
 *    iridescence at grazing angles (a night dragon's hide).
 */
export type Skin = 'fur' | 'feather' | 'scale';

const VERT_DECL = 'varying vec3 vObj; varying vec3 vViewN;';
const FRAG_COMMON = /* glsl */ `
  varying vec3 vObj; varying vec3 vViewN;
  float kh(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float kn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(kh(i), kh(i + vec3(1, 0, 0)), f.x), mix(kh(i + vec3(0, 1, 0)), kh(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(kh(i + vec3(0, 0, 1)), kh(i + vec3(1, 0, 1)), f.x), mix(kh(i + vec3(0, 1, 1)), kh(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;

const PATTERN: Record<Skin, string> = {
  fur: /* glsl */ `{
    // Streaks along the body (object z), clumped, fuzzy at the rim.
    vec3 q = vObj * vec3(70.0, 70.0, 11.0);
    float strands = kn(q) * 0.6 + kn(q * 2.3 + 5.1) * 0.4;
    float clumps = kn(vObj * 9.0);
    diffuseColor.rgb *= 0.8 + strands * 0.26 + (clumps - 0.5) * 0.1;
    float rim = 1.0 - abs(normalize(vViewN).z);
    diffuseColor.rgb += diffuseColor.rgb * pow(rim, 2.5) * 0.35;
  }`,
  feather: /* glsl */ `{
    // A feather lies along object z with its width along y: a pale shaft and angled barbs.
    float across = vObj.y;
    float shaft = 1.0 - smoothstep(0.004, 0.012, abs(across));
    float barbs = 0.5 + 0.5 * sin((vObj.z * 120.0) + abs(across) * 260.0);
    diffuseColor.rgb *= 0.86 + barbs * 0.14 - smoothstep(0.03, 0.09, abs(across)) * 0.12;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.94), shaft * 0.6);
  }`,
  scale: /* glsl */ `{
    // Overlapping rounded scales in rows along the body.
    vec2 st = vec2(atan(vObj.x, vObj.y) * 3.2, vObj.z * 11.0);
    float row = floor(st.y);
    vec2 cell = vec2(st.x + mod(row, 2.0) * 0.5, st.y);
    vec2 f = fract(cell) - vec2(0.5, 0.15);
    float d = length(f * vec2(1.0, 1.25));
    float edge = smoothstep(0.42, 0.5, d);
    float own = kh(vec3(floor(cell), 1.0));
    diffuseColor.rgb *= 0.78 + (1.0 - d) * 0.35 + own * 0.12 - edge * 0.25;
    // A faint blue-violet sheen where the hide turns away.
    float rim = 1.0 - abs(normalize(vViewN).z);
    diffuseColor.rgb += vec3(0.18, 0.2, 0.42) * pow(rim, 3.0) * 0.8 * (0.6 + own * 0.4);
  }`,
};

const cache = new Map<string, THREE.Material>();

/** A lit material for an animal part in `skin`, cached by colour. */
export function skinMaterial(color: string, skin: Skin, opts: { roughness?: number; metalness?: number; side?: THREE.Side } = {}): THREE.MeshStandardMaterial {
  const key = `${color}:${skin}:${opts.roughness ?? ''}:${opts.side ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? (skin === 'scale' ? 0.42 : skin === 'feather' ? 0.75 : 0.95),
    metalness: opts.metalness ?? (skin === 'scale' ? 0.18 : 0),
    side: opts.side ?? THREE.FrontSide,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvViewN = normalize(transformedNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${PATTERN[skin]}`);
  };
  m.customProgramCacheKey = () => 'skin-' + skin;
  cache.set(key, m);
  return m;
}

/**
 * A feather: a long, tapered vane with a rounded shoulder and a pointed tip, lying in the y–z plane
 * with its quill at the origin and its tip at z = −len (so feathers fan the same way the old box
 * feathers did). Width across y.
 */
export function featherGeometry(len: number, width: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(len * 0.25, width * 0.55, len * 0.7, width * 0.5);
  s.quadraticCurveTo(len * 0.95, width * 0.3, len, 0);
  s.quadraticCurveTo(len * 0.95, -width * 0.3, len * 0.7, -width * 0.45);
  s.quadraticCurveTo(len * 0.25, -width * 0.5, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  // Shape x (length) → −z; shape y (width) stays y.
  g.rotateY(Math.PI / 2);
  return g;
}
