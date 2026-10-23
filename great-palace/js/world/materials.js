// Shared materials. Toon shading with three soft steps gives the painted,
// cel-like look of BotW / Genshin while being cheaper than PBR.
import * as THREE from 'three';
import { MOOD } from './sky.js';
const NIGHT = MOOD.night;

let ramp;
function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
}

// Every toon surface gets a soft moonlit rim, the glowing silhouette edge that
// gives Breath of the Wild and Ghibli backgrounds their painted look.
const RIM = /* glsl */`
  vec3 rimView = normalize(vViewPosition);
  float rim = pow(1.0 - clamp(abs(dot(normal, rimView)), 0.0, 1.0), 3.0);
  vec3 rimUp = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  rim *= 1.0 - smoothstep(0.4, 0.85, dot(normal, rimUp)); // keep flat ground unwashed
  outgoingLight += vec3(0.55, 0.62, 1.0) * rim * 0.45;
  #include <opaque_fragment>
`;

// Macro variation (look pass, Oct 17): a slow world-space wash of warmer and cooler tone plus
// faint rain streaks down the walls, layered over every tiled texture, so the palace's repeated
// panels stop reading as one stamp copied across a kilometre of wall.
const MACRO_VERTEX = /* glsl */`
  #include <project_vertex>
  vec4 macroW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    macroW = instanceMatrix * macroW;
  #endif
  vMacroW = (modelMatrix * macroW).xyz;
`;
const MACRO_PARS = /* glsl */`
  varying vec3 vMacroW;
  float mcH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float mcN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mcH(i), mcH(i + vec2(1., 0.)), f.x), mix(mcH(i + vec2(0., 1.)), mcH(i + vec2(1., 1.)), f.x), f.y); }
`;
const MACRO_FRAGMENT = /* glsl */`
  {
    vec3 w = vMacroW;
    float mac = mcN(w.xz * 0.018 + w.y * 0.011) * 0.6 + mcN(w.xz * 0.09 - w.y * 0.05 + 5.0) * 0.4;
    diffuseColor.rgb *= mix(vec3(0.88, 0.88, 0.93), vec3(1.05, 1.02, 0.97), mac);
    float streak = mcN(vec2((w.x + w.z) * 0.55, w.y * 0.035)) * mcN(vec2((w.x - w.z) * 0.13, w.y * 0.01 + 3.0));
    diffuseColor.rgb *= 1.0 - 0.1 * smoothstep(0.25, 0.6, streak);
  }
`;

export function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...opts });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMacroW;')
      .replace('#include <project_vertex>', MACRO_VERTEX);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + MACRO_PARS)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + MACRO_FRAGMENT)
      .replace('#include <opaque_fragment>', RIM);
  };
  m.customProgramCacheKey = () => 'toon-rim-macro';
  return m;
}

export function glowBasic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...opts });
}

export function additive(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, ...opts,
  });
}

// Waving flag / banner: displaces vertices along a travelling sine.
export function flagMaterial(color, map = null) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 } },
    vertexShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vShade;
      void main(){
        vUv = uv;
        vec3 p = position;
        float k = uv.x;
        float w = sin(uv.x * 6. - uTime * 4. + uv.y * 1.5) * 0.35 * k + sin(uv.x * 11. - uTime * 6.) * 0.08 * k;
        p.z += w;
        vShade = 0.75 + 0.25 * cos(uv.x * 6. - uTime * 4.);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; varying vec2 vUv; varying float vShade;
      void main(){
        vec4 c = vec4(uColor, 1.);
        if (uHasMap > .5) { vec4 t = texture2D(uMap, vUv); c.rgb = mix(c.rgb, t.rgb, t.a); }
        // golden border
        float b = step(vUv.y, .08) + step(.92, vUv.y);
        c.rgb = mix(c.rgb, vec3(1., .82, .35), clamp(b, 0., 1.));
        gl_FragColor = vec4(c.rgb * vShade, 1.);
      }
    `,
  });
}

// Night grade for living surfaces (grass, hedges, canopies): as the aurora night
// falls, greens cool to moonlit teal-blue instead of staying daylight-bright.
export function nightGrade(m, key) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uNightG = NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNightG;')
      .replace('#include <opaque_fragment>', 'outgoingLight *= mix(vec3(1.0), vec3(0.36, 0.46, 0.92), uNightG);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => key + '-ng';
  return m;
}

// Painted meadows: on the green parts of the land, broad sunlit and cool patches,
// a wind sheen rolling across the grass, and drifts of tiny wildflowers that fade
// into a soft colour wash with distance.
export const MEADOW_TIME = { value: 0 };
export function meadowGrade(m) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uMTime = MEADOW_TIME;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMWorld; varying float vMUp;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vMUp = normalize(mat3(modelMatrix) * objectNormal).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uMTime; varying vec3 vMWorld; varying float vMUp;
        float mHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float mNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(mHash(i), mHash(i + vec2(1, 0)), f.x), mix(mHash(i + vec2(0, 1)), mHash(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 dc = diffuseColor.rgb;
          float grassy = smoothstep(0.01, 0.06, dc.g - max(dc.r, dc.b * 0.95)) * smoothstep(0.62, 0.85, vMUp);
          vec2 wp = vMWorld.xz;
          float n1 = mNoise(wp * 0.011) * 0.65 + mNoise(wp * 0.031 + 5.) * 0.35, n2 = mNoise(wp * 0.09 + 11.);
          vec3 tint = mix(vec3(0.74, 0.98, 0.92), vec3(1.2, 1.12, 0.7), smoothstep(0.3, 0.74, n1)) * (0.9 + 0.2 * n2);
          float camD = length(vMWorld - cameraPosition), nearF = 1. - smoothstep(30., 120., camD);
          // painterly clumps: short brush strokes of darker and lighter green, stretched along the wind
          vec2 sw = vec2(wp.x * 0.7 + wp.y * 0.7, -wp.x * 0.7 + wp.y * 0.7);
          float clump = mNoise(sw * vec2(0.35, 1.1)) * 0.6 + mNoise(sw * vec2(0.9, 2.6) + 3.) * 0.4;
          tint *= mix(1., 0.82 + 0.34 * clump, 0.4 + 0.6 * nearF);
          float wind = sin(dot(wp, vec2(0.045, 0.028)) - uMTime * 1.1 + n1 * 5.);
          vec3 g = diffuseColor.rgb * tint + vec3(0.1, 0.12, 0.03) * smoothstep(0.55, 1., wind);
          // wildflower drifts: clusters of blossoms, each cluster one colour
          float drift = smoothstep(0.45, 0.75, mNoise(wp * 0.016 + 3.));
          vec2 q = wp / 2.6, cell = floor(q), f = fract(q) - 0.5;
          float h = mHash(cell), h2 = mHash(cell + 17.3);
          vec3 fc = h2 < 0.3 ? vec3(1., 0.5, 0.76) : h2 < 0.52 ? vec3(1., 0.98, 0.94) : h2 < 0.72 ? vec3(1., 0.85, 0.3) : h2 < 0.88 ? vec3(0.76, 0.56, 1.) : vec3(0.5, 0.72, 1.);
          float bloom = 0.;
          for (int k = 0; k < 4; k++) {
            vec2 o = vec2(mHash(cell + float(k) * 3.1), mHash(cell + float(k) * 7.7 + 1.)) - 0.5;
            bloom = max(bloom, 1. - smoothstep(0.05, 0.085, length(f - o * 0.62)));
          }
          float show = step(h, 0.06 + 0.6 * drift) * bloom;
          g = mix(g, fc * 1.1, show * nearF);
          g = mix(g, vec3(1., 0.74, 0.86), drift * 0.22 * (1. - nearF));   // far off, the drifts read as a soft pink wash
          diffuseColor.rgb = mix(diffuseColor.rgb, g, grassy);
        }`);
  };
  const prevKey = m.customProgramCacheKey;
  m.customProgramCacheKey = () => (prevKey ? prevKey.call(m) : '') + '-meadow';
  return m;
}
