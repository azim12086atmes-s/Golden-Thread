import { pavedAt, takeDirty } from './paved';
import * as THREE from 'three';
import { LOCALES } from './locale';
import { PLOTS, PLOT_SIZE } from './plots';
import { CITY_RADIUS, REGION_SIZE, regionAt, type RegionId } from './regions';
import { neighbours } from '../traffic/schedule';
import { WATER_Y, groundColor, terrainHeight } from './terrain';
import { WIND_GLSL, WIND_UNIFORMS } from './wind';
import { LAMP_GLSL, LAMP_UNIFORMS } from './lamplight';
import { rockGeometry } from './rocks';
import { CRYSTAL_PAL } from './islands';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Meadows instead of plain grass. Round the travellers a dense field of grass tufts grows (a
 * few blades each, in its land's greens, lighter at the tips) with meadow flowers in its
 * land's colours, all swaying together as gusts of wind run across the field. After dusk the
 * blade tips glimmer faintly and the flowers glow like lanterns. Under them, the ground itself
 * is patterned (see `patternGround`): mown bands, speckles of blossom and, at night, softly
 * glowing fairy rings.
 *
 * Grass grows only where the ground is green (never on sand, snow, roads or the plaza) and is
 * thinner inside towns.
 */


/**
 * Grass tufts as pictures: three upright quads crossed at 60°, each carrying the same detailed
 * image of a tuft (see `tuftTexture`). Six triangles a tuft instead of a modelled blade each, so
 * the field can be dense and still cheap. `tip` is 0 at the root and 1 at the top (the wind
 * bends by it).
 */
function tuftGeo(): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], tip: number[] = [], nor: number[] = [], idx: number[] = [];
  const W = 0.95, H = 0.9;
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI + 0.3, cx = (Math.cos(a) * W) / 2, cz = (Math.sin(a) * W) / 2, base = pos.length / 3;
    pos.push(-cx, 0, -cz, cx, 0, cz, cx, H, cz, -cx, H, -cz);
    uv.push(q % 2 ? 1 : 0, 0, q % 2 ? 0 : 1, 0, q % 2 ? 0 : 1, 1, q % 2 ? 1 : 0, 1);
    tip.push(0, 0, 1, 1);
    // Lit from above like a meadow, not like a wall.
    for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('tip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  return g;
}

/**
 * The picture of a grass tuft, in near-greys (each tuft's colour tints it). About 110 fine blades
 * rising from a clump: those at the back in shadow, those in front in light; each blade creased
 * along its midrib (one half lit, one half shaded), dark at the root and sunlit at the tip, a few
 * dry straws among them, and a couple of seed heads. Transparent between the blades.
 */
function tuftTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const S = 512, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d')!;
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 110;
  for (let i = 0; i < N; i++) {
    const depth = i / N; // 0 = back, 1 = front
    const root = S / 2 + (r() - 0.5) * S * 0.36, h = S * (0.42 + r() * 0.52) * (1 - depth * 0.15);
    const lean = (root - S / 2) * (0.9 + r()) + (r() - 0.5) * S * 0.25;
    const w = 3 + r() * 5, dry = r() < 0.07;
    const tipX = root + lean, tipY = S - h, midX = root + lean * 0.3, midY = S - h * 0.55;
    const light = 0.76 + depth * 0.24;
    const tone = (k: number, side: number) => {
      const v = Math.round(255 * Math.min(1, (0.62 + k * 0.42) * light * side));
      return dry ? `rgb(${v},${Math.round(v * 0.93)},${Math.round(v * 0.7)})` : `rgb(${Math.round(v * 0.96)},${v},${Math.round(v * 0.9)})`;
    };
    for (const side of [-1, 1]) {
      const g = x.createLinearGradient(0, S, 0, tipY);
      const sh = side < 0 ? 1 : 0.78;
      g.addColorStop(0, tone(0, sh)); g.addColorStop(0.5, tone(0.75, sh)); g.addColorStop(1, tone(1, sh));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(root, S);
      x.quadraticCurveTo(midX, midY, tipX, tipY);
      x.quadraticCurveTo(midX + side * w * 0.9, midY, root + side * w, S);
      x.closePath();
      x.fill();
    }
  }
  // Seed heads nodding over the blades.
  for (let i = 0; i < 3; i++) {
    const root = S / 2 + (r() - 0.5) * S * 0.2, h = S * (0.85 + r() * 0.12), lean = (r() - 0.5) * S * 0.3;
    x.strokeStyle = 'rgb(214,214,190)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(root, S); x.quadraticCurveTo(root + lean * 0.2, S - h * 0.6, root + lean, S - h); x.stroke();
    for (let k = 0; k < 7; k++) {
      x.fillStyle = 'rgb(236,228,196)';
      x.beginPath(); x.ellipse(root + lean + (k % 2 ? 4 : -4), S - h + k * 6, 3.2, 6, lean * 0.004 + (k % 2 ? 0.5 : -0.5), 0, Math.PI * 2); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A meadow flower: two crossed picture cards (one of eight flowers, chosen per place in the shader). */
function flowerGeo(): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], tip: number[] = [], nor: number[] = [], idx: number[] = [];
  const W = 0.62, H = 0.66;
  for (let q = 0; q < 2; q++) {
    const a = q * Math.PI / 2 + 0.4, cx = (Math.cos(a) * W) / 2, cz = (Math.sin(a) * W) / 2, base = pos.length / 3;
    pos.push(-cx, 0, -cz, cx, 0, cz, cx, H, cz, -cx, H, -cz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    tip.push(0, 0, 1, 1);
    for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('tip', new THREE.Float32BufferAttribute(tip, 1));
  g.setIndex(idx);
  return g;
}

/**
 * Eight wildflowers in one picture (4 × 2 cells): daisy, poppy, cornflower, buttercup, lavender,
 * clover, bellflower and a cluster of small five-petalled blooms. Stems and leaves are painted
 * green and hearts gold; petals are painted near-white so each flower takes its land's colours.
 */
function flowerTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const C = 256, c = document.createElement('canvas');
  c.width = C * 4; c.height = C * 2;
  const x = c.getContext('2d')!;
  let seed = 5;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const PETAL = 'rgb(250,248,244)', PETAL2 = 'rgb(228,224,222)', STEM = 'rgb(74,132,58)', LEAF = 'rgb(88,150,66)', HEART = 'rgb(246,196,52)';
  const stem = (x0: number, y0: number, x1: number, y1: number, w = 4) => {
    x.strokeStyle = STEM; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(x0 + (x1 - x0) * 0.2, (y0 + y1) / 2, x1, y1); x.stroke();
  };
  const leaf = (lx: number, ly: number, len: number, ang: number) => {
    x.save(); x.translate(lx, ly); x.rotate(ang); x.fillStyle = LEAF;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -len * 0.22, len, 0); x.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0); x.fill(); x.restore();
  };
  const petals = (cx: number, cy: number, n: number, len: number, wid: number, col = PETAL, rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = i % 2 ? col : PETAL2 === col ? PETAL : col;
      x.beginPath(); x.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, Math.PI * 2); x.fill(); x.restore();
    }
  };
  const heart = (cx: number, cy: number, rr: number, col = HEART) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill(); };
  const cell = (i: number, draw: (ox: number, oy: number) => void) => { x.save(); x.beginPath(); x.rect((i % 4) * C + 6, Math.floor(i / 4) * C + 6, C - 12, C - 12); x.clip(); draw((i % 4) * C, Math.floor(i / 4) * C); x.restore(); };
  const B = C - 8;
  // Daisy: many thin petals round a gold heart.
  cell(0, (ox, oy) => { for (const [dx, h] of [[-50, 150], [30, 190], [70, 120]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx * 0.8, oy + B - h, 3); leaf(ox + 128 + dx, oy + B - 30, 34, -2.4); petals(ox + 128 + dx * 0.8, oy + B - h, 16, 34, 9); heart(ox + 128 + dx * 0.8, oy + B - h, 10); } });
  // Poppy: four broad rounded petals and a dark heart.
  cell(1, (ox, oy) => { for (const [dx, h] of [[-40, 170], [45, 140]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 4); leaf(ox + 128 + dx, oy + B - 40, 40, -2.2); petals(ox + 128 + dx, oy + B - h, 4, 46, 44, PETAL, 0.3); heart(ox + 128 + dx, oy + B - h, 9, 'rgb(40,36,40)'); } });
  // Cornflower: ragged fringed ring of petals.
  cell(2, (ox, oy) => { for (const [dx, h] of [[-30, 180], [50, 130]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3); leaf(ox + 128 + dx, oy + B - 60, 44, -2.6); for (let k = 0; k < 12; k++) petals(ox + 128 + dx, oy + B - h, 1, 30 + (k % 3) * 5, 12, PETAL, (k / 12) * Math.PI * 2); heart(ox + 128 + dx, oy + B - h, 7, 'rgb(90,80,150)'); } });
  // Buttercup: five round, cupped petals.
  cell(3, (ox, oy) => { for (const [dx, h] of [[-55, 120], [0, 175], [55, 140]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3); petals(ox + 128 + dx, oy + B - h, 5, 24, 22, PETAL, 1.2); heart(ox + 128 + dx, oy + B - h, 6); } leaf(ox + 128, oy + B - 20, 50, -2.8); leaf(ox + 128, oy + B - 20, 50, -0.3); });
  // Lavender: spikes of little buds.
  cell(4, (ox, oy) => { for (const dx of [-50, -15, 20, 55]) { const h = 170 + r() * 50; stem(ox + 128 + dx * 0.4, oy + B, ox + 128 + dx, oy + B - h, 3); for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? PETAL : PETAL2; x.beginPath(); x.ellipse(ox + 128 + dx + (k % 2 ? 4 : -4), oy + B - h + k * 9, 6, 8, 0, 0, Math.PI * 2); x.fill(); } } });
  // Clover: round heads of tiny petals.
  cell(5, (ox, oy) => { for (const [dx, h] of [[-45, 110], [35, 150]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3); for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, d = r() * 20; x.fillStyle = k % 3 ? PETAL : PETAL2; x.beginPath(); x.ellipse(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 6, 3, a, 0, Math.PI * 2); x.fill(); } } for (let k = 0; k < 3; k++) leaf(ox + 110, oy + B - 30, 36, -Math.PI / 2 + (k - 1) * 0.9); });
  // Bellflower: nodding bells along an arching stem.
  cell(6, (ox, oy) => { stem(ox + 90, oy + B, ox + 170, oy + B - 190, 3); for (let k = 0; k < 4; k++) { const bx = ox + 105 + k * 20, by = oy + B - 90 - k * 30; x.fillStyle = PETAL; x.beginPath(); x.moveTo(bx - 14, by + 20); x.quadraticCurveTo(bx, by - 18, bx + 14, by + 20); x.lineTo(bx + 18, by + 26); x.lineTo(bx - 18, by + 26); x.closePath(); x.fill(); } leaf(ox + 95, oy + B - 30, 44, -2.3); });
  // A cluster of small five-petalled blooms (phlox, forget-me-not).
  cell(7, (ox, oy) => { for (const [dx, h] of [[-40, 140], [40, 160]]) { stem(ox + 128 + dx, oy + B, ox + 128 + dx, oy + B - h, 3); leaf(ox + 128 + dx, oy + B - 50, 34, -2.5); for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, d = k ? 22 : 0; petals(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 5, 13, 11); heart(ox + 128 + dx + Math.cos(a) * d, oy + B - h + Math.sin(a) * d, 3); } } });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A little cluster of crystal shards (the Sky Isles' crystal meadow): three leaning prisms, 1 m tall at most. */
function shardsGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [h, w, lean, a] of [[1, 0.22, 0.08, 0], [0.62, 0.16, 0.45, 2.1], [0.45, 0.13, 0.55, 4.2]] as const) {
    const prism = new THREE.CylinderGeometry(w, w, h, 5, 1, true).translate(0, h / 2, 0).toNonIndexed();
    const tip = new THREE.ConeGeometry(w, w * 2.4, 5, 1, true).translate(0, h + w * 1.2, 0).toNonIndexed();
    for (const g of [prism, tip]) {
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(a) * lean, 0, -Math.cos(a) * lean)));
      g.translate(Math.cos(a) * w * 0.8, 0, Math.sin(a) * w * 0.8);
      parts.push(g);
    }
  }
  const n = parts.reduce((k, g) => k + g.getAttribute('position').count, 0), pos = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.getAttribute('position').array as Float32Array, o); o += g.getAttribute('position').array.length; g.dispose(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
/** A little scatter of pebbles and grit: five stones of different sizes lying together. */
function pebblesGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [r, x, z, seed] of [[0.5, 0, 0, 3], [0.3, 0.7, 0.25, 7], [0.22, -0.55, 0.4, 11], [0.16, 0.2, -0.65, 13], [0.12, -0.35, -0.4, 17]] as const) {
    const g = rockGeometry(r, { style: 'pebble', seed, detail: 0 }).toNonIndexed();
    g.deleteAttribute('uv');
    parts.push(g.translate(x, -r * 0.12, z));
  }
  const geo = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  geo.computeVertexNormals();
  return geo;
}

const GEO = { tuft: tuftGeo(), flower: flowerGeo(), shards: shardsGeo(), pebbles: pebblesGeo() };
/** Pebbles: dull stone, each scatter tinted from the sand it lies on. */
const PEBBLE_MAT = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
/** Pebble cells: a scatter every 1.4 m or so where the ground is sand, out to about 39 m. */
export const PEBBLE_CELL = 1.4, PEBBLE_CELLS = 56;
/** The crystal meadow's material: pastel, a little shiny, glowing softly from within after dusk. */
const CRYSTAL_MAT = new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.05, emissive: new THREE.Color('#6a5aa0'), emissiveIntensity: 0.25, transparent: true, opacity: 0.88 });
const PEBBLE_TINTS = { red: new THREE.Color('#9a5a3a'), grey: new THREE.Color('#8a8680') };

/** Crystal meadow cells: a cluster every 1.7 m or so, out to about 60 m round the travellers. */
export const CRYSTAL_CELL = 1.7, CRYSTAL_CELLS = 72;
export const GRASS_UNIFORMS = { uNight: { value: 0 }, uFocus: { value: new THREE.Vector3() }, uFieldR: { value: 40 } };

/**
 * A Lambert material whose instances bend with the wind by how far up the blade they are, with
 * `tip` colouring (dark root → the instance colour → a light tip) and a night glimmer.
 */
const TEX: { grass?: THREE.Texture | null; flower?: THREE.Texture | null } = {};
/** The ring of the meadow a material draws: tufts fade in at `inner` and out at `outer` (metres). */
interface Ring { inner: { value: number }; outer: { value: number } }
function swayingMaterial(kind: 'grass' | 'flower', ring: Ring): THREE.MeshLambertMaterial {
  const map = kind === 'grass' ? (TEX.grass ??= tuftTexture()) : (TEX.flower ??= flowerTexture());
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map, alphaTest: 0.4 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, GRASS_UNIFORMS, { uInner: ring.inner, uOuter: ring.outer });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float tip;\nvarying float vTip;\n${WIND_GLSL}`)
      .replace('#include <common>\nattribute float tip;', '#include <common>\nattribute float tip;\nuniform vec3 uFocus; uniform float uFieldR; uniform float uInner; uniform float uOuter;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        ${kind === 'flower' ? `{
          // Which of the eight flowers grows here: fixed by the place, so it never changes.
          vec3 rootF = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float ft = floor(fract(sin(dot(floor(rootF.xz * 2.0), vec2(12.9898, 78.233))) * 43758.5453) * 8.0);
          vMapUv = (clamp(vMapUv, 0.02, 0.98) + vec2(mod(ft, 4.0), floor(ft / 4.0))) / vec2(4.0, 2.0);
        }` : ''}`)
      .replace('#include <project_vertex>', `
        vTip = tip;
        // Each ring of the meadow grows in where the ring inside it thins out, and thins out
        // towards its own edge, so the field never shows a border.
        vec3 rootW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float rd = length(rootW.xz - uFocus.xz);
        transformed *= smoothstep(uInner * 0.65, uInner, rd) * (1.0 - smoothstep(uOuter * 0.55, uOuter, rd));
        vec4 wpG = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        float bend = ${kind === 'grass' ? 'tip * tip * 0.55' : 'min(tip, 1.0) * 0.35'};
        wpG.xz += windOffset(wpG.xyz, bend);
        wpG.y -= dot(windOffset(wpG.xyz, bend), windOffset(wpG.xyz, bend)) * 0.4;
        vec4 mvPosition = viewMatrix * wpG;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vTip;\nuniform float uNight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${kind === 'grass'
          ? 'diffuseColor.rgb *= mix(0.85, 1.15, clamp(vTip, 0.0, 1.0));'
          : 'float petal = 0.0;'}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${kind === 'grass'
          ? 'totalEmissiveRadiance += diffuseColor.rgb * smoothstep(0.7, 1.0, vTip) * uNight * 0.55;'
          : 'totalEmissiveRadiance += min(diffuseColor.rgb, vec3(0.7)) * petal * (0.22 + uNight * 0.75);'}`);
    if (kind === 'flower') {
      // Only the petals take the flower's colour (and glow); stems, leaves and hearts keep their paint.
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
        vec3 tx = diffuseColor.rgb;
        float petalW = smoothstep(0.55, 0.8, min(tx.r, min(tx.g, tx.b)));
        #ifdef USE_COLOR
          diffuseColor.rgb = mix(tx, tx * vColor.rgb, petalW);
        #endif`).replace('float petal = 0.0;', 'float petal = petalW;');
    }
  };
  m.customProgramCacheKey = () => 'meadow-' + kind;
  return m;
}

const ring = (inner: number, outer: number): Ring => ({ inner: { value: inner }, outer: { value: outer } });
/** The meadow in rings: dense near the travellers, larger clumps further out, big clumps to the far distance. */
const RINGS = { near: ring(0, 32), mid: ring(26, 100), far: ring(88, 240) };
const MATS = {
  grass: swayingMaterial('grass', RINGS.near), flower: swayingMaterial('flower', RINGS.near),
  midGrass: swayingMaterial('grass', RINGS.mid), midFlower: swayingMaterial('flower', RINGS.mid),
  farGrass: swayingMaterial('grass', RINGS.far),
};

/** Where grass may grow: green ground, above the water, off the roads and out of the plaza. */
export function grassy(x: number, z: number, h: number, col: THREE.Color): boolean {
  if (!(col.g > col.r * 1.05 && col.g > col.b * 1.1)) return false;
  return openGround(x, z, h);
}

/** Sandy, stony ground (the deserts, the Nile's edge, the pink city's hills): pebbles lie on it. */
export function sandy(col: THREE.Color): boolean {
  return col.r > col.b + 0.1 && col.g < col.r * 1.02 && !(col.g > col.r * 1.05 && col.g > col.b * 1.1);
}

/** Open ground: above the water, off the roads, out of the plaza and off anything built or planted. */
export function openGround(x: number, z: number, h: number): boolean {
  if (h < WATER_Y + 0.35) return false;
  const cx = Math.round(x / REGION_SIZE) * REGION_SIZE, cz = Math.round(z / REGION_SIZE) * REGION_SIZE;
  const lx = x - cx, lz = z - cz, d = Math.hypot(lx, lz);
  if (d < 54) return false; // the plaza and landmark
  if (d < CITY_RADIUS + 48 && (Math.abs(lx) < 13.5 || Math.abs(lz) < 13.5)) return false; // avenues and their pavements
  if (Math.abs(d - 140) < 10) return false; // the ring road and its tiled borders
  // The highways on to the neighbouring towns (traffic/schedule.ts).
  if (d >= CITY_RADIUS + 48) {
    const hw = highwayDirs(regionAt(x, z).id);
    if ((Math.abs(lx) < 11 && hw.has(`0,${Math.sign(lz)}`)) || (Math.abs(lz) < 11 && hw.has(`${Math.sign(lx)},0`))) return false;
  }
  if (pavedAt(x, z)) return false; // houses, squares, fields, sites, quays (paved.ts)
  // Plots of land are for building and farming: the meadow stops at their fences.
  if (PLOTS.some((p) => Math.abs(x - p.x) < PLOT_SIZE / 2 + 1 && Math.abs(z - p.z) < PLOT_SIZE / 2 + 1)) return false;
  return true;
}

const hwCache = new Map<string, Set<string>>();
/** The directions in which a land's highways leave it ("dx,dz"). */
function highwayDirs(land: RegionId): Set<string> {
  let s = hwCache.get(land);
  if (!s) hwCache.set(land, (s = new Set(neighbours(land).map((n) => `${n.dir[0]},${n.dir[1]}`))));
  return s;
}

/** The dense meadow round the travellers: grids of cells that move with them. */
export const FIELD_CELL = 0.34;
export const FIELD_CELLS = 190; // 65 m across, a tuft every 34 cm, each wide enough to overlap its neighbours
export const FLOWER_CELL = 0.7;
export const FLOWER_CELLS = 92; // 64 m across: a field carpeted with flowers
/** Further out: clumps every metre to 100 m, then big clumps every 2.6 m to 240 m. */
export const MID_CELL = 1.0, MID_CELLS = 200, FAR_CELL = 2.6, FAR_CELLS = 186;
export const MID_FLOWER_CELL = 1.8, MID_FLOWER_CELLS = 112;

/** Smooth value noise 0…1 (for where grass grows thick or thin). */
function smoothNoise(x: number, z: number): number {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = cellHash(i, j, 41), b = cellHash(i + 1, j, 41), c = cellHash(i, j + 1, 41), d = cellHash(i + 1, j + 1, 41);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const cellHash = (i: number, j: number, k: number) => {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * A recycling grid of instances round a moving point: each slot holds whichever world cell
 * currently falls in the window, so as the travellers walk the cells at the back reappear at the
 * front. What grows in a world cell depends on that cell alone, so the meadow is the same every
 * time you pass.
 */
class Field {
  readonly mesh: THREE.InstancedMesh;
  private slot: Int32Array;
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, private cell: number, private cells: number,
    private plant: (mesh: THREE.InstancedMesh, k: number, i: number, j: number) => boolean) {
    const n = cells * cells;
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color('#6aab52');
    for (let i = 0; i < n; i++) { this.mesh.setMatrixAt(i, zero); this.mesh.setColorAt(i, c); }
    this.slot = new Int32Array(n * 2).fill(2 ** 30);
    this.alive = new Uint8Array(n);
  }

  private alive: Uint8Array;

  /** Slots holding something right now. */
  grown = 0;

  private lastI = NaN;
  private lastJ = NaN;

  /** Replant the cells inside a world box (its paving changed) next update. */
  invalidate(x0: number, z0: number, x1: number, z1: number): void {
    const n = this.cells * this.cells;
    for (let k = 0; k < n; k++) {
      const x = this.slot[k * 2] * this.cell, z = this.slot[k * 2 + 1] * this.cell;
      if (x >= x0 - this.cell && x <= x1 && z >= z0 - this.cell && z <= z1) this.slot[k * 2] = 2 ** 30;
    }
    this.lastI = NaN;
  }

  update(fx: number, fz: number): void {
    const G = this.cells, fi = Math.floor(fx / this.cell) - G / 2, fj = Math.floor(fz / this.cell) - G / 2;
    // Nothing to replant until the travellers cross into a new cell.
    if (fi === this.lastI && fj === this.lastJ) return;
    this.lastI = fi; this.lastJ = fj;
    let changed = false;
    for (let a = 0; a < G; a++) {
      const wi = fi + ((((a - fi) % G) + G) % G);
      for (let b = 0; b < G; b++) {
        const wj = fj + ((((b - fj) % G) + G) % G), k = a * G + b;
        if (this.slot[k * 2] === wi && this.slot[k * 2 + 1] === wj) continue;
        this.slot[k * 2] = wi;
        this.slot[k * 2 + 1] = wj;
        const grew = this.plant(this.mesh, k, wi, wj) ? 1 : 0;
        this.grown += grew - this.alive[k];
        this.alive[k] = grew;
        changed = true;
      }
    }
    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
}

export class MeadowField {
  readonly group = new THREE.Group();
  private grass: Field;
  private flowers: Field;
  private midGrass: Field;
  private farGrass: Field;
  private midFlowers: Field;
  private crystals: Field;
  private pebbles: Field;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private c = new THREE.Color();
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private up = new THREE.Vector3(0, 1, 0);
  enabled = true;

  constructor() {
    this.grass = new Field(GEO.tuft, MATS.grass, FIELD_CELL, FIELD_CELLS, this.plantGrass(FIELD_CELL, 1));
    this.flowers = new Field(GEO.flower, MATS.flower, FLOWER_CELL, FLOWER_CELLS, this.plantFlower(FLOWER_CELL, 1, 0.8));
    // The rings further out: fewer, larger clumps, so green ground reads as grass as far as you can see.
    this.midGrass = new Field(GEO.tuft, MATS.midGrass, MID_CELL, MID_CELLS, this.plantGrass(MID_CELL, 1.9));
    this.farGrass = new Field(GEO.tuft, MATS.farGrass, FAR_CELL, FAR_CELLS, this.plantGrass(FAR_CELL, 3.6));
    this.midFlowers = new Field(GEO.flower, MATS.midFlower, MID_FLOWER_CELL, MID_FLOWER_CELLS, this.plantFlower(MID_FLOWER_CELL, 1.5, 0.6));
    this.crystals = new Field(GEO.shards, CRYSTAL_MAT, CRYSTAL_CELL, CRYSTAL_CELLS, this.plantCrystal());
    this.pebbles = new Field(GEO.pebbles, PEBBLE_MAT, PEBBLE_CELL, PEBBLE_CELLS, this.plantPebbles());
    for (const f of [this.midGrass, this.farGrass, this.midFlowers]) f.mesh.receiveShadow = false;
    this.group.add(this.grass.mesh, this.flowers.mesh, this.midGrass.mesh, this.farGrass.mesh, this.midFlowers.mesh, this.crystals.mesh, this.pebbles.mesh);
  }

  /** Plant grass tufts in a grid of `cell` metres, `size` times the near field's tufts. */
  private plantGrass(cell: number, size: number) {
    return (im: THREE.InstancedMesh, k: number, i: number, j: number): boolean => {
      // Anywhere in its cell; thick in some patches, thin in others, with the odd bare clearing.
      const x = (i + cellHash(i, j, 1)) * cell, z = (j + cellHash(i, j, 2)) * cell;
      const thick = smoothNoise(x * 0.05, z * 0.05) * 0.65 + smoothNoise(x * 0.19 + 7, z * 0.19 + 3) * 0.35;
      if (cellHash(i, j, 5) > 0.35 + thick * 0.9 || !this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 4) * Math.PI * 2);
      // Taller where it grows thick, short and tufty where it is thin.
      const sc = (0.5 + cellHash(i, j, 8) * 0.3 + thick * 0.15) * size;
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h - 0.02, z), this.q, this.s.set(sc * 1.35, sc * (0.5 + thick * 0.45 + cellHash(i, j, 9) * 0.3) / Math.sqrt(size), sc * 1.35)));
      // Every tuft its own green: patches drift between yellow-green, fresh green, blue-green and
      // olive, with lighter and darker tufts mixed through them.
      const patch = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.sin(z * 0.09 - x * 0.03);
      this.c.offsetHSL(patch * 0.06 + (cellHash(i, j, 10) - 0.5) * 0.1, 0.18 + cellHash(i, j, 12) * 0.12, 0.1 + (cellHash(i, j, 11) - 0.5) * 0.14);
      im.setColorAt(k, this.c);
      return true;
    };
  }

  /**
   * The Sky Isles' crystal meadow: clusters of pastel crystals all over the open ground — thick in
   * drifts, thinner between, never on the roads, the plaza or anything built — in every size
   * from a finger-high sprinkle to knee-high clumps.
   */
  private plantCrystal() {
    const e = new THREE.Euler();
    return (im: THREE.InstancedMesh, k: number, i: number, j: number): boolean => {
      const x = (i + 0.15 + cellHash(i, j, 31) * 0.7) * CRYSTAL_CELL, z = (j + 0.15 + cellHash(i, j, 32) * 0.7) * CRYSTAL_CELL;
      const drift = 0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(z * 0.033) * 2) * Math.sin(z * 0.041 - x * 0.013);
      const lx = x - Math.round(x / REGION_SIZE) * REGION_SIZE, lz = z - Math.round(z / REGION_SIZE) * REGION_SIZE, d = Math.hypot(lx, lz);
      const ok = cellHash(i, j, 33) < 0.25 + drift * 0.6 && regionAt(x, z).id === 'skyisles' && d > 52 &&
        !(d < CITY_RADIUS + 48 && (Math.abs(lx) < 11 || Math.abs(lz) < 11)) && Math.abs(d - 140) > 8 && !pavedAt(x, z);
      const h = ok ? terrainHeight(x, z) : 0;
      if (!ok || h < WATER_Y + 0.3) { im.setMatrixAt(k, this.zero); return false; }
      const s = (0.18 + Math.pow(cellHash(i, j, 34), 2.2) * 0.75) * (0.7 + drift * 0.5);
      this.q.setFromEuler(e.set((cellHash(i, j, 35) - 0.5) * 0.3, cellHash(i, j, 36) * Math.PI * 2, (cellHash(i, j, 37) - 0.5) * 0.3));
      im.setMatrixAt(k, this.m.compose(this.p.set(x, h - 0.04, z), this.q, this.s.set(s, s * (0.8 + cellHash(i, j, 38) * 0.5), s)));
      // Each cluster its own hue, turned a little from the palette's.
      im.setColorAt(k, this.c.set(CRYSTAL_PAL[Math.floor(cellHash(i, j, 39) * CRYSTAL_PAL.length)]).offsetHSL((cellHash(i, j, 40) - 0.5) * 0.12, 0, 0));
      return true;
    };
  }

  /**
   * Pebbles and small stones on the sand, scattered the way the grass is on green ground: thick
   * on stony patches, thin on the dunes, the odd fist-sized stone among the grit — each scatter
   * the sand's own colour, a little darker or lighter, some reddish, some grey.
   */
  private plantPebbles() {
    const e = new THREE.Euler();
    return (im: THREE.InstancedMesh, k: number, i: number, j: number): boolean => {
      const x = (i + cellHash(i, j, 51)) * PEBBLE_CELL, z = (j + cellHash(i, j, 52)) * PEBBLE_CELL;
      const stony = smoothNoise(x * 0.04 + 3, z * 0.04 - 5) * 0.7 + smoothNoise(x * 0.17, z * 0.17) * 0.3;
      if (cellHash(i, j, 53) > stony * 0.9 - 0.1) { im.setMatrixAt(k, this.zero); return false; }
      const h = terrainHeight(x, z);
      groundColor(x, z, h, this.c);
      if (!sandy(this.c) || !openGround(x, z, h)) { im.setMatrixAt(k, this.zero); return false; }
      const big = cellHash(i, j, 54) > 0.93;
      const sc = big ? 0.5 + cellHash(i, j, 55) * 0.4 : 0.12 + Math.pow(cellHash(i, j, 55), 1.8) * 0.3;
      this.q.setFromEuler(e.set(0, cellHash(i, j, 56) * Math.PI * 2, 0));
      im.setMatrixAt(k, this.m.compose(this.p.set(x, h - 0.01, z), this.q, this.s.set(sc, sc * (0.7 + cellHash(i, j, 57) * 0.4), sc)));
      const v = cellHash(i, j, 58);
      if (v < 0.15) this.c.lerp(PEBBLE_TINTS.red, 0.5);
      else if (v < 0.3) this.c.lerp(PEBBLE_TINTS.grey, 0.6);
      this.c.offsetHSL(0, -0.08, (cellHash(i, j, 59) - 0.6) * 0.22);
      im.setColorAt(k, this.c);
      return true;
    };
  }

  /** Plant wildflowers in a grid of `cell` metres (`share` of cells bloom), `size` times the near ones. */
  private plantFlower(cell: number, size: number, share: number) {
    return (im: THREE.InstancedMesh, k: number, i: number, j: number): boolean => {
      const x = (i + 0.1 + cellHash(i, j, 21) * 0.8) * cell, z = (j + 0.1 + cellHash(i, j, 22) * 0.8) * cell;
      if (cellHash(i, j, 23) > share || !this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      const land = regionAt(x, z), bloom = land.flowers, lights = LOCALES[land.id].lights, v = cellHash(i, j, 26);
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 24) * Math.PI * 2);
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h, z), this.q, this.s.setScalar((1.05 + cellHash(i, j, 27) * 0.5) * size)));
      im.setColorAt(k, this.c.set(v < 0.2 ? lights[Math.floor(v * 5 * lights.length) % lights.length] : bloom[Math.floor(v * 97) % bloom.length]));
      return true;
    };
  }

  private h = 0;
  /** Grass grows here (and sets this.h and this.c to the ground's height and colour). */
  private grows(x: number, z: number, i: number, j: number): boolean {
    this.h = terrainHeight(x, z);
    groundColor(x, z, this.h, this.c);
    const town = Math.hypot(x - Math.round(x / REGION_SIZE) * REGION_SIZE, z - Math.round(z / REGION_SIZE) * REGION_SIZE) < CITY_RADIUS;
    return grassy(x, z, this.h, this.c) && !(town && cellHash(i, j, 3) < 0.45);
  }

  /** Tufts and flowers growing round the travellers right now. */
  get grown(): { tufts: number; flowers: number } {
    return { tufts: this.grass.grown, flowers: this.flowers.grown };
  }

  /** Pebble scatters lying round the travellers right now. */
  get pebbled(): number {
    return this.pebbles.grown;
  }

  update(focus: THREE.Vector3, ground: number): void {
    // High in the air the meadow is too far below to matter.
    this.group.visible = this.enabled && focus.y - ground < 60;
    if (!this.group.visible) return;
    for (const b of takeDirty()) for (const f of [this.grass, this.flowers, this.midGrass, this.farGrass, this.midFlowers, this.crystals, this.pebbles]) f.invalidate(b.x0, b.z0, b.x1, b.z1);
    GRASS_UNIFORMS.uFocus.value.copy(focus);
    GRASS_UNIFORMS.uFieldR.value = Math.min(FIELD_CELL * FIELD_CELLS, FLOWER_CELL * FLOWER_CELLS) / 2 - 1;
    this.grass.update(focus.x, focus.z);
    this.flowers.update(focus.x, focus.z);
    this.midGrass.update(focus.x, focus.z);
    this.farGrass.update(focus.x, focus.z);
    this.midFlowers.update(focus.x, focus.z);
    this.crystals.update(focus.x, focus.z);
    this.pebbles.update(focus.x, focus.z);
    // Only drawn where there is sand to lie on.
    this.pebbles.mesh.visible = this.pebbles.grown > 0;
    CRYSTAL_MAT.emissiveIntensity = 0.2 + GRASS_UNIFORMS.uNight.value * 0.9;
  }
}

/**
 * The ground's own pattern (terrain material): gentle mown bands and blossom speckles on green
 * ground, and after dusk faint glowing fairy rings. Only green ground is patterned.
 */
export function patternGround(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, GRASS_UNIFORMS, { uWindDir: WIND_UNIFORMS.uWindDir }, LAMP_UNIFORMS);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGW; uniform float uNight; uniform vec2 uWindDir;
        ${LAMP_GLSL}
        float gh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gh(i), gh(i + vec2(1.0, 0.0)), f.x), mix(gh(i + vec2(0.0, 1.0)), gh(i + vec2(1.0, 1.0)), f.x), f.y); }
        // Rotated octaves, so no pattern lines up with the world's axes or with itself.
        const mat2 R1 = mat2(0.80, 0.60, -0.60, 0.80), R2 = mat2(0.28, -0.96, 0.96, 0.28), R3 = mat2(-0.53, 0.85, -0.85, -0.53);
        float fbm(vec2 p) { return vn(R1 * p) * 0.5 + vn(R2 * p * 2.07 + 3.1) * 0.3 + vn(R3 * p * 4.3 + 7.7) * 0.2; }
        vec2 gh2(vec2 p) { return vec2(gh(p), gh(p + 19.19)); }
        // Scattered round spots (grit, pebbles, glints): one per cell at a random place, a random
        // size, many cells left empty — in a rotated, warped frame, so they never read as a grid.
        float spots(vec2 p, float share, float size) {
          vec2 c = floor(p), f = fract(p), o = gh2(c);
          float keep = step(1.0 - share, gh(c + 5.3));
          float r = size * (0.4 + 0.6 * gh(c + 9.1));
          return keep * (1.0 - smoothstep(r * 0.55, r, length(f - (0.2 + 0.6 * o))));
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float greenish = smoothstep(0.02, 0.12, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.92);
        vec2 gp = vGW.xz;
        // Patches of light and shade on the grass, of every size — where it lies flatter, grows
        // thicker, or has been walked — and here and there a sun-dried, golden stretch.
        float pn = fbm(gp * 0.04) * 0.6 + fbm(gp * 0.21 + 5.0) * 0.4;
        diffuseColor.rgb *= mix(1.0, 0.84 + pn * 0.3, greenish);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.95, 1.12, 0.9), greenish * 0.6);
        float dry = smoothstep(0.6, 0.85, fbm(gp * 0.017 + 11.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.14, 1.03, 0.78), greenish * dry * 0.55);
        // Sand is grainy up close: fine grains of lighter and darker sand, bits of grit and the odd
        // pebble, and broad drifts of pinker and more ochre sand across the land.
        {
          vec3 dc0 = vColor.rgb;
          float sandish = smoothstep(0.05, 0.18, dc0.r - dc0.b) * (1.0 - greenish) * (1.0 - smoothstep(0.0, 0.08, dc0.g - dc0.r));
          float near = 1.0 - smoothstep(16.0, 70.0, length(vViewPosition));
          // Coarse and fine sand lie in patches; the grains themselves are soft specks of every size.
          vec2 wq = gp + (vec2(vn(gp * 0.7), vn(gp * 0.7 + 4.0)) - 0.5) * 0.6;
          float coarse = 0.5 + 0.8 * vn(R2 * gp * 0.08 + 13.0);
          float grain = (vn(R1 * wq * 34.0) - 0.5) * 0.2 + (vn(R3 * wq * 14.0 + 2.0) - 0.5) * 0.14 + (fbm(gp * 1.3) - 0.5) * 0.1;
          diffuseColor.rgb *= 1.0 + grain * coarse * sandish * near;
          float grit = spots(R2 * wq * 9.0, 0.35, 0.22) * 0.25 + spots(R1 * wq * 2.3 + 5.0, 0.06 * coarse, 0.3) * 0.4;
          diffuseColor.rgb *= 1.0 - grit * sandish * near;
          float tint = vn(gp * 0.03 + 21.0);
          diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(1.05, 0.95, 0.93), vec3(0.97, 1.0, 1.03), tint), sandish);
        }
        // Snow is not one white: wind-packed crust (a little greyer, with fine cracks) and fresh
        // powder (brighter, softly pitted) lie in drifts; hollows hold a cold blue; and here and
        // there a line of prints wanders across it — a fox's, a reindeer's — each print a soft
        // blue-shadowed dent.
        {
          vec3 sc0 = vColor.rgb;
          float snowy0 = smoothstep(0.78, 0.9, min(sc0.r, min(sc0.g, sc0.b)));
          if (snowy0 > 0.01) {
            float near2 = 1.0 - smoothstep(20.0, 90.0, length(vViewPosition));
            float crust = smoothstep(0.45, 0.62, fbm(gp * 0.035 + 31.0));
            float crack = (1.0 - smoothstep(0.0, 0.025, abs(vn(R1 * gp * 1.7) - 0.5))) * crust * near2;
            float pits = (vn(R3 * gp * 9.0) - 0.5) * 0.06 * (1.0 - crust) * near2;
            vec3 snowC = diffuseColor.rgb * mix(vec3(1.03, 1.03, 1.04), vec3(0.93, 0.95, 0.99), crust) * (1.0 + pits) * (1.0 - crack * 0.1);
            float hollow = smoothstep(0.55, 0.8, fbm(gp * 0.02 + 51.0));
            snowC = mix(snowC, snowC * vec3(0.84, 0.9, 1.04), hollow * 0.5);
            float trail = 1.0 - smoothstep(0.0, 0.035, abs(fbm(gp * 0.018 + 77.0) - 0.5));
            float prints = spots(R2 * gp * 2.6, 0.7, 0.34) * trail * near2;
            snowC = mix(snowC, snowC * vec3(0.72, 0.8, 0.95), prints * 0.7);
            diffuseColor.rgb = mix(diffuseColor.rgb, snowC, snowy0);
          }
        }
        // Blossom speckles.
        vec2 bq = R2 * gp * 1.3;
        float s = gh(floor(bq) + 2.2);
        if (greenish > 0.5) {
          float dot0 = spots(bq, 0.07 * smoothstep(0.3, 0.7, fbm(gp * 0.05 + 2.0)) * 2.0, 0.2);
          vec3 petal = s > 0.975 ? vec3(1.0, 0.75, 0.85) : s > 0.955 ? vec3(1.0, 0.95, 0.6) : vec3(0.95, 0.95, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, petal, dot0 * 0.85);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Sand and snow carry the wind's patterns, lit by the sun: ripples across the dunes,
          // long carved streaks (sastrugi) across the snow. The bumps tilt the normal, so the
          // light itself draws them.
          vec3 dc = vColor.rgb;
          float snowy = smoothstep(0.78, 0.9, min(dc.r, min(dc.g, dc.b)));
          float sandy = smoothstep(0.06, 0.18, dc.r - dc.b) * smoothstep(0.3, 0.5, dc.r) * (1.0 - smoothstep(0.0, 0.08, dc.g - dc.r));
          vec2 wd = normalize(uWindDir + vec2(0.0001));
          vec2 wp = vec2(dot(vGW.xz, wd), dot(vGW.xz, vec2(-wd.y, wd.x)));
          // The crests wander: bent by broad eddies, never quite parallel.
          float warp = (fbm(wp * vec2(0.018, 0.05)) - 0.5) * 18.0 + (vn(wp * vec2(0.06, 0.02) + 9.0) - 0.5) * 5.0;
          // Ripples: crests across the wind, 1.2–2 m apart (tighter in some hollows, wider on the
          // crests), strong in some patches and faint in others, breaking off and forking here and there.
          float patchS = smoothstep(0.2, 0.75, vn(vGW.xz * 0.012));
          float lam = mix(5.2, 3.1, vn(vGW.xz * 0.021 + 3.0));
          // Along each crest its line shifts a little, so crests end and fork (Y-junctions); and a
          // second set of ripples at a slight angle takes over in places.
          float ph = (wp.x + warp) * lam + (vn(vec2(wp.x * 0.15, wp.y * 0.35)) - 0.5) * 7.0;
          float rip = pow(0.5 + 0.5 * cos(ph), 1.7) - 0.4 + 0.2 * cos(ph * 2.0 + 1.2);
          vec2 wp2 = mat2(0.978, 0.208, -0.208, 0.978) * wp;
          float ph2 = (wp2.x + warp * 0.8) * lam * 0.83 + (vn(vec2(wp2.x * 0.2, wp2.y * 0.3) + 3.0) - 0.5) * 6.0;
          float rip2 = pow(0.5 + 0.5 * cos(ph2), 1.5) - 0.4;
          rip = mix(rip, rip2, smoothstep(0.35, 0.7, fbm(vGW.xz * 0.02 + 17.0)));
          rip *= 0.25 + 0.75 * smoothstep(0.25, 0.65, fbm(vec2(wp.x * 0.22, wp.y * 0.3)));
          // Megaripples, 8–12 m apart, low and broad.
          float mega = sin((wp.x + warp * 2.0) * 0.62 + vn(wp * 0.03) * 4.0);
          vec2 gR = wd * (rip * 0.22 * (0.3 + 0.7 * patchS) + mega * 0.05) * sandy;
          // Snow: in some places carved into sastrugi (long streaks along the wind, of uneven width
          // and spacing), elsewhere drifted smooth into soft, low swells.
          float patchW = smoothstep(0.3, 0.7, vn(vGW.xz * 0.014 + 8.0));
          float stF = mix(1.1, 2.6, vn(wp * vec2(0.02, 0.06) + 2.0));
          // Sastrugi: ridges along the wind that start, swell and taper off, each its own width.
          float st = sin(wp.y * stF + (fbm(wp * vec2(0.04, 0.16)) - 0.5) * 9.0) * smoothstep(0.2, 0.7, fbm(vec2(wp.x * 0.06, wp.y * 0.45) + 4.0));
          st = sign(st) * pow(abs(st), 1.6);
          float drift = fbm(wp * vec2(0.035, 0.09) + 6.0) - 0.5;
          vec2 gS = (vec2(-wd.y, wd.x) * st * 0.17 * patchW + wd * drift * 0.12) * snowy;
          vec3 bw = vec3(gR.x + gS.x, 0.0, gR.y + gS.y);
          normal = normalize(normal - (viewMatrix * vec4(bw, 0.0)).xyz);
          // Snow glitters where the sun catches single crystals: in drifting clusters that shift as
          // you move, some bright, most faint — never an even sprinkle.
          float look = floor(dot(normalize(vViewPosition), vec3(7.0, 3.0, 5.0)) * 3.0);
          float cluster = smoothstep(0.45, 0.85, fbm(vGW.xz * 0.07 + look * 0.37));
          vec2 gq = vGW.xz + (vec2(vn(vGW.xz * 0.9), vn(vGW.xz * 0.9 + 6.0)) - 0.5) * 0.5;
          float glint = (spots(R1 * gq * 5.0 + look, 0.05 * cluster, 0.16) * (0.3 + 0.7 * gh(floor(R1 * gq * 5.0) + 3.1))
            + spots(R3 * gq * 11.0 + look * 1.7, 0.03 * cluster, 0.2) * 0.5) * snowy;
          totalEmissiveRadiance += vec3(1.0, 0.98, 0.92) * glint * 0.9 * (1.0 - uNight * 0.6);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec2 rc = floor(vGW.xz / 31.0);
          vec2 ctr = (rc + 0.25 + 0.5 * vec2(gh(rc), gh(rc + 7.0))) * 31.0;
          float rr = 3.5 + gh(rc + 3.0) * 4.0;
          float ring = exp(-pow((length(vGW.xz - ctr) - rr) * 2.2, 2.0)) * step(0.55, gh(rc + 11.0));
          float greenish2 = smoothstep(0.02, 0.12, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.92);
          totalEmissiveRadiance += vec3(0.55, 1.0, 0.75) * ring * uNight * 0.3 * greenish2;
        }
        // Pools of lamplight on the paving and grass round every lamp after dusk (lamplight.ts).
        totalEmissiveRadiance += diffuseColor.rgb * lampLight(vGW, vec3(0.0, 1.0, 0.0));`);
  };
  mat.customProgramCacheKey = () => 'patterned-ground';
}
