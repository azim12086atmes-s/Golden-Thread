import * as THREE from 'three';
import { LOCALES } from './locale';
import { PLOTS, PLOT_SIZE } from './plots';
import { CITY_RADIUS, REGION_SIZE, regionAt } from './regions';
import { WATER_Y, groundColor, terrainHeight } from './terrain';
import { WIND_GLSL, WIND_UNIFORMS } from './wind';

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
    const light = 0.55 + depth * 0.45;
    const tone = (k: number, side: number) => {
      const v = Math.round(255 * Math.min(1, (0.42 + k * 0.62) * light * side));
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

const GEO = { tuft: tuftGeo(), flower: flowerGeo() };
export const GRASS_UNIFORMS = { uNight: { value: 0 }, uFocus: { value: new THREE.Vector3() }, uFieldR: { value: 40 } };

/**
 * A Lambert material whose instances bend with the wind by how far up the blade they are, with
 * `tip` colouring (dark root → the instance colour → a light tip) and a night glimmer.
 */
function swayingMaterial(kind: 'grass' | 'flower'): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: kind === 'grass' ? tuftTexture() : flowerTexture(), alphaTest: 0.4 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, GRASS_UNIFORMS);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float tip;\nvarying float vTip;\n${WIND_GLSL}`)
      .replace('#include <common>\nattribute float tip;', '#include <common>\nattribute float tip;\nuniform vec3 uFocus; uniform float uFieldR;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        ${kind === 'flower' ? `{
          // Which of the eight flowers grows here: fixed by the place, so it never changes.
          vec3 rootF = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float ft = floor(fract(sin(dot(floor(rootF.xz * 2.0), vec2(12.9898, 78.233))) * 43758.5453) * 8.0);
          vMapUv = (clamp(vMapUv, 0.02, 0.98) + vec2(mod(ft, 4.0), floor(ft / 4.0))) / vec2(4.0, 2.0);
        }` : ''}`)
      .replace('#include <project_vertex>', `
        vTip = tip;
        // Fade out towards the edge of the field so it never shows a border.
        vec3 rootW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        transformed *= 1.0 - smoothstep(uFieldR * 0.7, uFieldR, length(rootW.xz - uFocus.xz));
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
          : 'totalEmissiveRadiance += min(diffuseColor.rgb, vec3(0.85)) * petal * (0.42 + uNight * 0.7);'}`);
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

const MATS = { grass: swayingMaterial('grass'), flower: swayingMaterial('flower') };

/** Where grass may grow: green ground, above the water, off the roads and out of the plaza. */
export function grassy(x: number, z: number, h: number, col: THREE.Color): boolean {
  if (h < WATER_Y + 0.35) return false;
  if (!(col.g > col.r * 1.05 && col.g > col.b * 1.1)) return false;
  const cx = Math.round(x / REGION_SIZE) * REGION_SIZE, cz = Math.round(z / REGION_SIZE) * REGION_SIZE;
  const lx = x - cx, lz = z - cz, d = Math.hypot(lx, lz);
  if (d < 54) return false; // the plaza and landmark
  if (d < CITY_RADIUS + 48 && (Math.abs(lx) < 12 || Math.abs(lz) < 12)) return false; // avenues
  if (Math.abs(d - 140) < 8.5) return false; // the ring road
  // Plots of land are for building and farming: the meadow stops at their fences.
  if (PLOTS.some((p) => Math.abs(x - p.x) < PLOT_SIZE / 2 + 1 && Math.abs(z - p.z) < PLOT_SIZE / 2 + 1)) return false;
  return true;
}

/** The dense meadow round the travellers: grids of cells that move with them. */
export const FIELD_CELL = 0.34;
export const FIELD_CELLS = 190; // 65 m across, a tuft every 34 cm, each wide enough to overlap its neighbours
export const FLOWER_CELL = 0.7;
export const FLOWER_CELLS = 92; // 64 m across: a field carpeted with flowers

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

  update(fx: number, fz: number): void {
    const G = this.cells, fi = Math.floor(fx / this.cell) - G / 2, fj = Math.floor(fz / this.cell) - G / 2;
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
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private c = new THREE.Color();
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private up = new THREE.Vector3(0, 1, 0);
  enabled = true;

  constructor() {
    this.grass = new Field(GEO.tuft, MATS.grass, FIELD_CELL, FIELD_CELLS, (im, k, i, j) => {
      // Evenly spaced: one tuft near the middle of every cell, nudged only a little.
      const x = (i + 0.38 + cellHash(i, j, 1) * 0.24) * FIELD_CELL, z = (j + 0.38 + cellHash(i, j, 2) * 0.24) * FIELD_CELL;
      if (!this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 4) * Math.PI * 2);
      const sc = 0.6 + cellHash(i, j, 8) * 0.2;
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h - 0.02, z), this.q, this.s.set(sc * 1.35, sc * (0.66 + cellHash(i, j, 9) * 0.3), sc * 1.35)));
      // Vibrant: the ground's own green, richer, with a touch of blue-green or gold.
      // Every tuft its own green: patches drift between yellow-green, fresh green, blue-green and
      // olive, with lighter and darker tufts mixed through them.
      const patch = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * Math.sin(z * 0.09 - x * 0.03);
      this.c.offsetHSL(patch * 0.06 + (cellHash(i, j, 10) - 0.5) * 0.1, 0.22 + cellHash(i, j, 12) * 0.12, 0.03 + (cellHash(i, j, 11) - 0.5) * 0.16);
      im.setColorAt(k, this.c);
      return true;
    });
    this.flowers = new Field(GEO.flower, MATS.flower, FLOWER_CELL, FLOWER_CELLS, (im, k, i, j) => {
      const x = (i + 0.1 + cellHash(i, j, 21) * 0.8) * FLOWER_CELL, z = (j + 0.1 + cellHash(i, j, 22) * 0.8) * FLOWER_CELL;
      if (cellHash(i, j, 23) > 0.8 || !this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      const land = regionAt(x, z), bloom = land.flowers, lights = LOCALES[land.id].lights, v = cellHash(i, j, 26);
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 24) * Math.PI * 2);
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h, z), this.q, this.s.setScalar(1.05 + cellHash(i, j, 27) * 0.5)));
      im.setColorAt(k, this.c.set(v < 0.2 ? lights[Math.floor(v * 5 * lights.length) % lights.length] : bloom[Math.floor(v * 97) % bloom.length]));
      return true;
    });
    this.group.add(this.grass.mesh, this.flowers.mesh);
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

  update(focus: THREE.Vector3, ground: number): void {
    // High in the air the meadow is too far below to matter.
    this.group.visible = this.enabled && focus.y - ground < 22;
    if (!this.group.visible) return;
    GRASS_UNIFORMS.uFocus.value.copy(focus);
    GRASS_UNIFORMS.uFieldR.value = Math.min(FIELD_CELL * FIELD_CELLS, FLOWER_CELL * FLOWER_CELLS) / 2 - 1;
    this.grass.update(focus.x, focus.z);
    this.flowers.update(focus.x, focus.z);
  }
}

/**
 * The ground's own pattern (terrain material): gentle mown bands and blossom speckles on green
 * ground, and after dusk faint glowing fairy rings. Only green ground is patterned.
 */
export function patternGround(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, GRASS_UNIFORMS, { uWindDir: WIND_UNIFORMS.uWindDir });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vGW; uniform float uNight; uniform vec2 uWindDir;
        float gh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float greenish = smoothstep(0.02, 0.12, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.92);
        vec2 gp = vGW.xz;
        // Mown bands, a few metres wide, gently curving.
        float band = 0.5 + 0.5 * sin((gp.x + sin(gp.y * 0.05) * 6.0) * 0.28);
        diffuseColor.rgb *= mix(1.0, 0.9 + band * 0.18, greenish);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.95, 1.12, 0.9), greenish * 0.6);
        // Blossom speckles.
        vec2 cell = floor(gp * 1.3);
        float s = gh(cell);
        if (s > 0.93 && greenish > 0.5) {
          vec2 f = fract(gp * 1.3) - 0.5;
          float dot0 = 1.0 - smoothstep(0.08, 0.16, length(f));
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
          float sandy = smoothstep(0.08, 0.2, dc.r - dc.b) * smoothstep(0.55, 0.7, dc.r) * (1.0 - smoothstep(0.0, 0.08, dc.g - dc.r));
          vec2 wd = normalize(uWindDir + vec2(0.0001));
          vec2 wp = vec2(dot(vGW.xz, wd), dot(vGW.xz, vec2(-wd.y, wd.x)));
          float warp = sin(wp.y * 0.21) * 1.6 + sin(wp.y * 0.07 + wp.x * 0.03) * 3.0;
          // Ripples: crests across the wind, ~0.9 m apart, sharper on the lee side.
          float ph = (wp.x + warp) * 7.0;
          float rip = cos(ph) * 0.5 + 0.5 * cos(ph * 2.0 + 1.2) * 0.35;
          vec2 gR = wd * rip * 0.22 * sandy;
          // Sastrugi: long streaks along the wind, of uneven width.
          float st = sin(wp.y * 1.9 + sin(wp.x * 0.13) * 2.5) * sin(wp.y * 0.53 + 1.7);
          vec2 gS = vec2(-wd.y, wd.x) * st * 0.18 * snowy;
          vec3 bw = vec3(gR.x + gS.x, 0.0, gR.y + gS.y);
          normal = normalize(normal - (viewMatrix * vec4(bw, 0.0)).xyz);
          // Snow glitters where the sun catches single crystals.
          vec2 sc = floor(vGW.xz * 5.0);
          float glint = step(0.992, gh(sc + floor(dot(normalize(vViewPosition), vec3(7.0, 3.0, 5.0)) * 4.0))) * snowy;
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
        }`);
  };
  mat.customProgramCacheKey = () => 'patterned-ground';
}
