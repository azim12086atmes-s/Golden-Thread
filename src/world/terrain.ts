import * as THREE from 'three';
import { fbm, lerp, smoothstep } from '../core/rng';
import { PLOTS, PLOT_SIZE } from './plots';
import {
  CITY_RADIUS, GRID_COLS, GRID_ROWS, HOME_COL, HOME_ROW, REGION_SIZE, regionAtGrid, type RegionSpec,
} from './regions';

export const WATER_Y = -1.5;

/** A walkable surface that is not terrain: floating islands, platforms, temple terraces. */
export interface Platform { x: number; z: number; r: number; y: number }
const platforms: Platform[] = [];
export const addPlatform = (p: Platform) => platforms.push(p);
export const removePlatforms = (pred: (p: Platform) => boolean) => {
  for (let i = platforms.length - 1; i >= 0; i--) if (pred(platforms[i])) platforms.splice(i, 1);
};

/**
 * Blend weights for the up-to-four lands around a point. The fraction is pushed through a
 * smoothstep plateau so each land's own parameters hold unmixed across its city core.
 */
function blend(x: number, z: number): Array<{ r: RegionSpec; w: number }> {
  const gx = x / REGION_SIZE + HOME_COL, gz = z / REGION_SIZE + HOME_ROW;
  const cx = Math.max(0, Math.min(GRID_COLS - 1, gx)), cz = Math.max(0, Math.min(GRID_ROWS - 1, gz));
  const x0 = Math.min(GRID_COLS - 2, Math.floor(cx)), z0 = Math.min(GRID_ROWS - 2, Math.floor(cz));
  const tx = smoothstep(0.36, 0.64, cx - x0), tz = smoothstep(0.36, 0.64, cz - z0);
  const out: Array<{ r: RegionSpec; w: number }> = [];
  const push = (c: number, rr: number, w: number) => { if (w > 1e-4) out.push({ r: regionAtGrid(c, rr)!, w }); };
  push(x0, z0, (1 - tx) * (1 - tz));
  push(x0 + 1, z0, tx * (1 - tz));
  push(x0, z0 + 1, (1 - tx) * tz);
  push(x0 + 1, z0 + 1, tx * tz);
  return out;
}

/** How far outside the grid a point lies, in metres (0 inside). */
function outside(x: number, z: number): number {
  const half = REGION_SIZE / 2;
  const minX = -HOME_COL * REGION_SIZE - half, maxX = (GRID_COLS - 1 - HOME_COL) * REGION_SIZE + half;
  const minZ = -HOME_ROW * REGION_SIZE - half, maxZ = (GRID_ROWS - 1 - HOME_ROW) * REGION_SIZE + half;
  const dx = Math.max(minX - x, 0, x - maxX), dz = Math.max(minZ - z, 0, z - maxZ);
  return Math.hypot(dx, dz);
}

/** Distance to the nearest land centre, for flattening city cores. */
function distToCentre(x: number, z: number): number {
  const cx = Math.round(x / REGION_SIZE) * REGION_SIZE, cz = Math.round(z / REGION_SIZE) * REGION_SIZE;
  return Math.hypot(x - cx, z - cz);
}

/**
 * Terrain with every plot of land levelled, so homes and farms sit flat. The level is the natural
 * height at the plot's centre, eased out over a short margin.
 */
export function terrainHeight(x: number, z: number): number {
  const h = naturalHeight(x, z);
  for (const p of PLOTS) {
    const dx = Math.abs(x - p.x) - PLOT_SIZE / 2 - 2, dz = Math.abs(z - p.z) - PLOT_SIZE / 2 - 2;
    const d = Math.max(dx, dz);
    if (d > 14) continue;
    const base = plotBase(p.id, p.x, p.z);
    return lerp(base, h, smoothstep(0, 14, d));
  }
  return h;
}

const plotBases = new Map<string, number>();
function plotBase(id: string, x: number, z: number): number {
  let b = plotBases.get(id);
  if (b === undefined) plotBases.set(id, (b = Math.max(naturalHeight(x, z), WATER_Y + 0.6)));
  return b;
}

function naturalHeight(x: number, z: number): number {
  let relief = 0;
  for (const { r, w } of blend(x, z)) relief += r.relief * w;
  const n = fbm(x * 0.0035 + 13.1, z * 0.0035 - 7.7, 5);
  const ridge = 1 - Math.abs(fbm(x * 0.002, z * 0.002, 3) * 2 - 1);
  const wild = (n - 0.45) * 1.6 + ridge * ridge * 0.8;
  const f = smoothstep(CITY_RADIUS - 20, CITY_RADIUS + 160, distToCentre(x, z));
  // Gentle undulation even inside cities so ground is never billiard-table flat.
  const gentle = (fbm(x * 0.02, z * 0.02, 2) - 0.5) * 0.8;
  let h = gentle * (1 - f) + f * relief * wild;
  // The world is an island; beyond the grid it slopes into the sea.
  const o = outside(x, z);
  if (o > 0) h = h - o * 0.2 - 2;
  return h;
}

/** Walkable height at a point: the highest platform under `fromY`, else terrain, never below water. */
export function groundAt(x: number, z: number, fromY = Infinity): number {
  let h = terrainHeight(x, z);
  for (const p of platforms) {
    if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r && p.y <= fromY + 1.2 && p.y > h) h = p.y;
  }
  return h;
}

export const surfaceAt = (x: number, z: number, fromY = Infinity) => Math.max(groundAt(x, z, fromY), WATER_Y);

const c1 = new THREE.Color(), c2 = new THREE.Color(), acc = new THREE.Color();
const SNOW = new THREE.Color('#f5f8ff'), SAND = new THREE.Color('#e8d6a0'), ROCK = new THREE.Color('#8a8a8a');

export function groundColor(x: number, z: number, h: number, out: THREE.Color): THREE.Color {
  acc.setRGB(0, 0, 0);
  let snowline = 0;
  const v = fbm(x * 0.02, z * 0.02, 2);
  for (const { r, w } of blend(x, z)) {
    c1.set(r.ground);
    c2.set(r.groundAlt);
    c1.lerp(c2, v);
    acc.r += c1.r * w; acc.g += c1.g * w; acc.b += c1.b * w;
    snowline += Math.min(r.snowline, 999) * w;
  }
  out.copy(acc);
  if (h > snowline) out.lerp(SNOW, smoothstep(snowline, snowline + 8, h));
  else if (h > snowline - 14) out.lerp(ROCK, 0.35 * smoothstep(snowline - 14, snowline, h));
  if (h < WATER_Y + 1.2) out.lerp(SAND, smoothstep(WATER_Y + 1.2, WATER_Y - 0.2, h));
  return out;
}

export const CHUNK = 160;
const SEG = 32;

export function buildTerrainChunk(cx: number, cz: number, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx * CHUNK, z = pos.getZ(i) + cz * CHUNK;
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    groundColor(x, z, h, col);
    cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx * CHUNK, 0, cz * CHUNK);
  mesh.receiveShadow = true;
  return mesh;
}
