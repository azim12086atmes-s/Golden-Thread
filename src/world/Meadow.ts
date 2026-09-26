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
 * Painted cards: three upright quads crossed at 60°, carrying a painting of grass (or flowers)
 * with a cut-out edge, so from any side a tuft reads as dozens of fine blades rather than a few
 * flat shapes. `tip` is 0 at the root and 1 at the top (the wind bends by it).
 */
function cardGeo(w: number, h: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], tip: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI, cx = Math.cos(a) * w / 2, cz = Math.sin(a) * w / 2, base = pos.length / 3;
    pos.push(-cx, 0, -cz, cx, 0, cz, cx, h, cz, -cx, h, -cz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
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

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

/** A tapering, curving blade from (x, bottom) up to height h, leaning by `lean`. */
function blade(x: CanvasRenderingContext2D, bx: number, by: number, h: number, lean: number, w: number): void {
  const tx = bx + lean, ty = by - h, mx = bx + lean * 0.25, my = by - h * 0.55;
  x.beginPath();
  x.moveTo(bx - w, by);
  x.quadraticCurveTo(mx - w * 0.6, my, tx, ty);
  x.quadraticCurveTo(mx + w * 0.6, my, bx + w, by);
  x.closePath();
  x.fill();
}

/** Grass painted in soft greys (the instance colour gives it its land's green). */
function grassTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  // Blades rise from a loose clump at the middle and fan outwards, so the card reads as one tuft
  // with light between the blades rather than a solid block.
  for (let i = 0; i < 30; i++) {
    const bx = 128 + (rnd() - 0.5) * 70, h = 110 + rnd() * 140, lean = (bx - 128) * 1.4 + (rnd() - 0.5) * 60;
    const g = x.createLinearGradient(0, 256, 0, 256 - h);
    const v = 205 + Math.floor(rnd() * 40);
    g.addColorStop(0, `rgb(${v * 0.78},${v * 0.82},${v * 0.72})`);
    g.addColorStop(0.5, `rgb(${v},${v},${v * 0.94})`);
    g.addColorStop(1, `rgb(${Math.min(255, v + 40)},${Math.min(255, v + 45)},${v})`);
    x.fillStyle = g;
    blade(x, bx, 256, h, lean, 1.6 + rnd() * 1.8);
  }
  // A few seed heads nodding above the blades.
  for (let i = 0; i < 5; i++) {
    const bx = 40 + rnd() * 176, h = 200 + rnd() * 50, lean = (rnd() - 0.5) * 50;
    x.strokeStyle = 'rgb(200,200,180)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(bx, 256); x.quadraticCurveTo(bx + lean * 0.3, 256 - h * 0.6, bx + lean, 256 - h); x.stroke();
    x.fillStyle = 'rgb(236,228,196)';
    x.beginPath(); x.ellipse(bx + lean, 256 - h, 3, 9, lean * 0.01, 0, Math.PI * 2); x.fill();
  }
  return finish(c);
}

/** Wildflowers painted with green stalks and leaves and white petals (tinted per instance). */
function flowerTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  const heads: Array<[number, number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const bx = 40 + i * 44 + (rnd() - 0.5) * 20, h = 110 + rnd() * 120, lean = (rnd() - 0.5) * 50;
    x.strokeStyle = 'rgb(70,130,60)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(bx, 256); x.quadraticCurveTo(bx + lean * 0.2, 256 - h * 0.5, bx + lean, 256 - h); x.stroke();
    x.fillStyle = 'rgb(80,145,64)';
    blade(x, bx, 256, h * 0.45, -lean * 0.8 - 18, 5);
    heads.push([bx + lean, 256 - h, 13 + rnd() * 9]);
  }
  for (const [hx, hy, r] of heads) {
    x.fillStyle = 'rgb(255,255,255)';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      x.beginPath(); x.ellipse(hx + Math.cos(a) * r * 0.6, hy + Math.sin(a) * r * 0.6, r * 0.55, r * 0.32, a, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = 'rgb(255,200,60)';
    x.beginPath(); x.arc(hx, hy, r * 0.3, 0, Math.PI * 2); x.fill();
  }
  return finish(c);
}

function finish(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const GEO = { tuft: cardGeo(1.1, 0.95), flower: cardGeo(0.9, 0.85) };
export const GRASS_UNIFORMS = { uNight: { value: 0 }, uFocus: { value: new THREE.Vector3() }, uFieldR: { value: 40 } };

/**
 * A Lambert material whose instances bend with the wind by how far up the blade they are, with
 * `tip` colouring (dark root → the instance colour → a light tip) and a night glimmer.
 */
function swayingMaterial(kind: 'grass' | 'flower'): THREE.MeshLambertMaterial {
  const map = kind === 'grass' ? grassTexture() : flowerTexture();
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map, alphaTest: 0.5 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, GRASS_UNIFORMS);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float tip;\nvarying float vTip;\n${WIND_GLSL}`)
      .replace('#include <common>\nattribute float tip;', '#include <common>\nattribute float tip;\nuniform vec3 uFocus; uniform float uFieldR;')
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
          ? 'diffuseColor.rgb *= mix(0.85, 1.2, clamp(vTip, 0.0, 1.0));'
          : 'float petal = 0.0;'}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${kind === 'grass'
          ? 'totalEmissiveRadiance += diffuseColor.rgb * smoothstep(0.7, 1.0, vTip) * uNight * 0.55;'
          : 'totalEmissiveRadiance += diffuseColor.rgb * petal * uNight * 1.1;'}`);
    if (kind === 'flower') {
      // Only the petals take the flower's colour; stalks, leaves and hearts keep their paint.
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
        vec3 tx = diffuseColor.rgb;
        float petalW = smoothstep(0.6, 0.85, min(tx.r, min(tx.g, tx.b)));
        #ifdef USE_COLOR
          diffuseColor.rgb = mix(tx, tx * vColor, petalW);
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
export const FIELD_CELL = 0.8;
export const FIELD_CELLS = 104; // 83 m across
export const FLOWER_CELL = 2.4;
export const FLOWER_CELLS = 36; // 86 m across

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
      const x = (i + 0.15 + cellHash(i, j, 1) * 0.7) * FIELD_CELL, z = (j + 0.15 + cellHash(i, j, 2) * 0.7) * FIELD_CELL;
      if (!this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 4) * Math.PI * 2);
      const sc = 0.32 + cellHash(i, j, 8) * 0.26;
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h - 0.02, z), this.q, this.s.set(sc * 1.3, sc * (0.8 + cellHash(i, j, 9) * 0.6), sc * 1.3)));
      // Vibrant: the ground's own green, richer, with a touch of blue-green or gold.
      this.c.offsetHSL((cellHash(i, j, 10) - 0.5) * 0.07, 0.28, 0.05 + (cellHash(i, j, 11) - 0.5) * 0.08);
      im.setColorAt(k, this.c);
      return true;
    });
    this.flowers = new Field(GEO.flower, MATS.flower, FLOWER_CELL, FLOWER_CELLS, (im, k, i, j) => {
      const x = (i + 0.1 + cellHash(i, j, 21) * 0.8) * FLOWER_CELL, z = (j + 0.1 + cellHash(i, j, 22) * 0.8) * FLOWER_CELL;
      if (cellHash(i, j, 23) > 0.55 || !this.grows(x, z, i, j)) { im.setMatrixAt(k, this.zero); return false; }
      const land = regionAt(x, z), bloom = land.flowers, lights = LOCALES[land.id].lights, v = cellHash(i, j, 26);
      this.q.setFromAxisAngle(this.up, cellHash(i, j, 24) * Math.PI * 2);
      im.setMatrixAt(k, this.m.compose(this.p.set(x, this.h, z), this.q, this.s.setScalar(0.75 + cellHash(i, j, 27) * 0.5)));
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
