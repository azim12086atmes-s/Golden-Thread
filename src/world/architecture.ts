import * as THREE from 'three';
import { detailLandmark } from './landmarkDetail';
import { fountainJet, waterBasin, waterChannel, waterfall, waterPool } from './flowWater';
import { crystalCluster, floatingIsland as craggyIsland } from './islands';
import type { Rng } from '../core/rng';
import {
  GeoBuilder, M, archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof, tent, tree,
} from './kit';
import { houseDecor } from './houseDecor';
import { FACADES, compose } from './facade';
import { buildTradition } from './traditions';
import { type Habit, HABITS, growTree } from './trees';

/** The Meadow's Great Tree: an ancient oak three times any other, forking again and again. */
const GREAT_TREE: Habit = { ...HABITS.oak!, h: 30, trunk: 0.26, r: 2.6, forks: 5, spread: 0.85, lift: 0.18, limb: 0.42, shrink: 0.66, depth: 3, blob: 0.1, squash: 0.72, gnarl: 0.3 };
import { LAND_LANTERN, lanternGeometry } from './lanterns';
import { regionCenter, type RegionId, type RegionSpec } from './regions';
import { PYRAMIDS } from './reserved';
import { terrainHeight } from './terrain';
import { MONUMENTS } from './monuments';
import { SURF } from './surfaces';
import { chimneyTop } from './chimneys';
import { PENTHOUSE_MIN_TOWER, penthouse } from './models/penthouse';

/**
 * Architecture per land. Every builder works in a local frame: origin at the building's base
 * centre, front facing +Z. The caller places it with GeoBuilder.frame(). `g` is lit geometry;
 * `glow` is windows, lanterns and lamps, which brighten at night.
 */
export interface Ctx {
  g: GeoBuilder;
  glow: GeoBuilder;
  rng: Rng;
  s: RegionSpec;
  /** Built water that flows (flowWater.ts); where it is missing, water falls back to `glow`. */
  water?: GeoBuilder;
}

export interface Footprint {
  /** Collision radius. */
  r: number;
  /** Height of the top, for flight clearance. */
  h: number;
  /** What its front door opens onto, when it is not a plain house (a tower with a penthouse). */
  kind?: string;
}

const DOOR = '#4a3426';
/** Tower windows: many of them, so each is muted — the city glows, it does not blaze. */
const NY_WINDOW = '#b8a47a';
const pick = <T>(c: Ctx, a: readonly T[]) => c.rng.pick(a);

/** A glowing window on the front face (z = +d/2) — or on any face via ry. */
function win(c: Ctx, x: number, y: number, z: number, w = 0.9, h = 1.1, ry = 0, arched = false): void {
  if (arched) archPanel(c.glow, w, h, c.s.glow, x, y, z, ry, 0.08);
  else box(c.glow, w, h, 0.1, c.s.glow, x, y, z, ry);
}

/** A square pyramid (base 2·half, height h) with flat faces, base centred on the origin. */
export function pyramidGeometry(half: number, h: number): THREE.BufferGeometry {
  const a = [-half, 0, -half], b = [half, 0, -half], cc = [half, 0, half], d = [-half, 0, half], t = [0, h, 0];
  const tri = [cc, b, t, b, a, t, a, d, t, d, cc, t, a, b, cc, a, cc, d].flat();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
  g.computeVertexNormals();
  return g;
}

function chhatri(c: Ctx, x: number, y: number, z: number, r: number, col: string, domeCol: string): void {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, r * 0.1, r * 0.1, r * 1.2, col, x + dx * r * 0.7, y, z + dz * r * 0.7, 5);
  box(c.g, r * 1.8, r * 0.18, r * 1.8, col, x, y + r * 1.2, z);
  onion(c.g, r * 0.75, domeCol, x, y + r * 1.38, z);
}

function lanternHanging(c: Ctx, x: number, y: number, z: number, col?: string): void {
  cyl(c.g, 0.02, 0.02, 0.5, '#3a2a22', x, y, z, 3);
  sphere(c.glow, 0.28, col ?? c.s.glow, x, y - 0.25, z, 6, 1.3);
}

// ───────────────────────── houses ─────────────────────────

type HouseFn = (c: Ctx) => Footprint;

/** The lands still built from their own builders (the others build from their tradition kit, traditions.ts). */
const houses: Partial<Record<RegionId, HouseFn>> = {
  meadow(c) {
    // Wanderers' Meadow: a storybook land. Five kinds of fantasy house.
    const k = c.rng.next();
    if (k < 0.18) return fairyKeep(c);
    if (k < 0.4) return fairyTower(c);
    if (k < 0.7) return storyCottage(c);
    if (k < 0.85) return toadstool(c);
    return wizardTower(c);
  },

  norway(c) {
    // Norwegian wood after Bryggen, red fishermen's rorbuer, white Sørlandet houses.
    const k = c.rng.next();
    return { ...compose(c, k < 0.25 ? FACADES.rorbu : k < 0.45 ? FACADES.sorlandet : FACADES.norway, '#3a2a22'), kind: k < 0.25 ? 'rorbu' : k < 0.45 ? 'sorlandet' : 'bryggen' };
  },

  switzerland(c) {
    // Swiss chalets, white Engadin houses, great-roofed Bernese farmhouses.
    const k = c.rng.next();
    return { ...compose(c, k < 0.25 ? FACADES.engadin : k < 0.4 ? FACADES.bernese : FACADES.switzerland, '#5a3a26'), kind: k < 0.25 ? 'engadin' : k < 0.4 ? 'bernese' : 'chalet' };
  },

  london(c) {
    // Georgian and Victorian terraces (docs/ARCHITECTURE_RESEARCH.md), mews cottages, corner shops.
    const k = c.rng.next();
    return { ...compose(c, k < 0.15 ? FACADES.londonShop : k < 0.35 ? FACADES.londonMews : FACADES.london, pick(c, ['#1f1f24', '#2f4a3a', '#7a1f24', '#1f2f5a'])), kind: k < 0.15 ? 'shop' : k < 0.35 ? 'mews' : 'georgian' };
  },

  newyork(c) {
    // New Yonder: New York grown solarpunk. Deco setbacks, glass towers, brownstones and lofts after
    // real types, and the city's new forms (owner): towers that twist, zig-zag, or open like a
    // desert rose, each lit in its own neon pattern rather than in bands.
    const k = c.rng.next();
    if (k < 0.22) return nyDecoTower(c);
    if (k < 0.3) return nyTwistTower(c);
    if (k < 0.5) return nyGlassTower(c);
    if (k < 0.57) return nyZigzagTower(c);
    if (k < 0.63) return nyRoseTower(c);
    if (k < 0.82) return nyBrownstone(c);
    return nyLoft(c);
  },

  renaissance(c) {
    // Italian palazzi, Tuscan townhouses, farmhouses with their dovecotes, botteghe.
    const k = c.rng.next();
    return { ...compose(c, k < 0.15 ? FACADES.bottega : k < 0.4 ? FACADES.tuscanTown : k < 0.55 ? FACADES.tuscanFarm : FACADES.renaissance, '#5a3a26'), kind: k < 0.15 ? 'shop' : k < 0.4 ? 'casa' : k < 0.55 ? 'colonica' : 'palazzo' };
  },

  vintage(c) {
    // Queen Anne "Painted Ladies", Craftsman bungalows, colonials, main-street shops.
    const k = c.rng.next(), door = pick(c, ['#5a8ab5', '#e07a5f', '#6ab58a', '#d9467a']);
    return { ...compose(c, k < 0.15 ? FACADES.mainStreet : k < 0.35 ? FACADES.bungalow : k < 0.5 ? FACADES.colonial : FACADES.vintage, door), kind: k < 0.15 ? 'shop' : k < 0.35 ? 'bungalow' : k < 0.5 ? 'colonial' : 'queenanne' };
  },
};


/* ------------------------------------------------------------------------------------------------
 * New Yonder: cyber-solarpunk New York. Limestone, brownstone, brick, steel and glass (their wall
 * colours carry those surfaces), dressed with the things a green city of the future would add:
 * solar skins and crowns, vertical gardens, sky gardens with real trees, wind turbines, neon.
 * --------------------------------------------------------------------------------------------- */
const NY = { limestone: '#b8b2a6', brownstone: '#8a7a6a', steel: '#c9c2b5', glass: '#6a7a8a', brick: '#a0522d' };
const NEON = ['#3ae8ff', '#ff3ad8', '#7aff9a', '#ffd23a', '#ff7a3a', '#a86bff', '#ff4a6a'];
const SOLAR = '#1d3566', SOLAR_FRAME = '#c9ccd6', IRON = '#1f1f24', LEAF = '#4f9a4a';

/** A field of tilted solar panels on a roof (w × d, at height y). */
function solarField(c: Ctx, w: number, d: number, y: number): void {
  for (let x = -w / 2 + 1; x < w / 2 - 0.8; x += 1.9) {
    for (let z = -d / 2 + 1; z < d / 2 - 0.8; z += 1.5) {
      c.g.add(new THREE.BoxGeometry(1.7, 0.06, 1.1).translate(0, 0.35, 0), SOLAR, M(x, y, z, 0, 1, 1, 1, -0.45));
      box(c.g, 0.06, 0.4, 0.06, SOLAR_FRAME, x, y, z + 0.35);
    }
  }
}

/** Green walls: climbers hanging down a face (+z face of a w-wide wall, from y0 up to y1). */
function greenWall(c: Ctx, w: number, zFace: number, y0: number, y1: number): void {
  for (let x = -w / 2 + 0.6; x < w / 2 - 0.4; x += 1.1 + c.rng.next() * 0.8) {
    const len = (y1 - y0) * (0.4 + c.rng.next() * 0.6);
    box(c.g, 0.5, len, 0.12, c.rng.chance(0.5) ? LEAF : '#5cae52', x, y1 - len, zFace + 0.07);
  }
  box(c.g, w, 0.4, 0.6, '#6b5a4a', 0, y1 - 0.4, zFace + 0.3); // the planter they grow from
}

/** A garden terrace: planters and small real trees along a roof edge. */
function skyGarden(c: Ctx, w: number, d: number, y: number): void {
  box(c.g, w, 0.5, 1.2, '#6b5a4a', 0, y, d / 2 - 0.6);
  for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 3.2) tree(c.g, c.rng.pick(['oak', 'maple', 'birch'] as const), x, y + 0.5, d / 2 - 0.6, 0.45 + c.rng.next() * 0.2, () => c.rng.next());
}

/** Neon trim round a setback's edge. */
function neonEdge(c: Ctx, w: number, d: number, y: number, col: string): void {
  box(c.glow, w + 0.12, 0.12, 0.12, col, 0, y, d / 2 + 0.06);
  box(c.glow, w + 0.12, 0.12, 0.12, col, 0, y, -d / 2 - 0.06);
  box(c.glow, 0.12, 0.12, d + 0.12, col, w / 2 + 0.06, y, 0);
  box(c.glow, 0.12, 0.12, d + 0.12, col, -w / 2 - 0.06, y, 0);
}

/** A vertical-axis wind turbine on a roof. */
function turbine(c: Ctx, x: number, y: number, z: number, h: number): void {
  cyl(c.g, 0.08, 0.1, h, SOLAR_FRAME, x, y, z, 5);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    c.g.add(new THREE.BoxGeometry(0.08, h * 0.5, 0.5).translate(0, h * 0.25, 0), '#e8eaf0', M(x + Math.cos(a) * 0.55, y + h * 0.45, z + Math.sin(a) * 0.55, -a, 1, 1, 1, 0, 0.25));
  }
}

/** Glowing window bands on all four faces. */
function bands(c: Ctx, w: number, d: number, y0: number, y1: number, step = 3.4): void {
  for (let y = y0 + 3; y < y1 - 1.5; y += step) box(c.glow, w + 0.08, 0.6, d + 0.08, NY_WINDOW, 0, y, 0);
}

/** Art-deco setback tower (after the Chrysler and Empire State): limestone and glass tiers. */
function nyDecoTower(c: Ctx): Footprint {
  let w = c.rng.range(16, 22), d = w * c.rng.range(0.8, 1), y = 0;
  const tiers = c.rng.int(3, 5), neon = c.rng.pick(NEON);
  const base = w;
  for (let t = 0; t < tiers; t++) {
    const h = c.rng.range(14, 26) * (1 - t * 0.12);
    box(c.g, w, h, d, t % 2 ? NY.glass : NY.limestone, 0, y, 0);
    // Deco piers up the front.
    for (let x = -w / 2 + 1; x <= w / 2 - 1; x += w / 5) box(c.g, 0.5, h, 0.5, NY.limestone, x, y, d / 2 + 0.2);
    bands(c, w, d, y, y + h);
    y += h;
    box(c.g, w + 0.6, 0.5, d + 0.6, NY.steel, 0, y - 0.5, 0);
    neonEdge(c, w, d, y - 0.2, neon);
    const nw = w * 0.74, nd = d * 0.74;
    if (t < tiers - 1) {
      skyGarden(c, w, d, y);
      solarField(c, (w - nw) / 2 - 0.5, d * 0.7, y);
    }
    w = nw; d = nd;
  }
  // A crown of solar fins and a spire.
  for (let i = 0; i < 8; i++) c.g.frame(0, y, 0, (i / 8) * Math.PI * 2, 1, () => box(c.g, 0.25, 6, w * 0.5, SOLAR, 0, 0, w * 0.25));
  cone(c.g, 1.2, 16, '#e0e0ea', 0, y, 0, 8);
  box(c.glow, 0.3, 0.3, 0.3, '#ff3a3a', 0, y + 16, 0);
  box(c.glow, base * 0.5, 3, 0.1, '#fff6d8', 0, 0, base * 0.45 + 0.4);
  return { r: base * 0.62, h: y + 16 };
}

/** Glass tower with steel diagonal bracing, sky gardens, turbines and a holographic billboard. */
function nyGlassTower(c: Ctx): Footprint {
  const w = c.rng.range(14, 20), d = c.rng.range(14, 20), h = c.rng.range(60, 120);
  box(c.g, w, h, d, NY.glass);
  bands(c, w, d, 0, h, 6.8);
  // Diagonal bracing on the long faces.
  for (let y = 0; y < h - 12; y += 12) for (const s of [-1, 1]) {
    c.g.add(new THREE.BoxGeometry(0.35, Math.hypot(w, 12), 0.35).translate(0, Math.hypot(w, 12) / 2, 0), NY.steel, M(-s * w / 2, y, d / 2 + 0.2, 0, 1, 1, 1, 0, -s * Math.atan2(w, 12)));
  }
  // Sky gardens every ten floors: a recessed floor with trees.
  for (let y = 30; y < h - 10; y += 34) {
    box(c.g, w - 1.2, 3.4, d - 1.2, '#2a3a30', 0, y, 0);
    for (const [x, z] of [[-w / 3, d / 3], [w / 4, d / 3], [0, -d / 3]]) tree(c.g, 'oak', x, y, z, 0.5, () => c.rng.next());
  }
  box(c.g, w + 0.4, 0.6, d + 0.4, NY.steel, 0, h, 0);
  // The tallest carry a penthouse (models/penthouse.ts), reached by the lift from the lobby; the rest turbines.
  const top = h >= PENTHOUSE_MIN_TOWER;
  if (top) c.g.frame(0, h + 0.6, 0, 0, 1, () => c.glow.frame(0, h + 0.6, 0, 0, 1, () => { penthouse(c, w, d); }));
  else for (const [x, z] of [[-w / 3, -d / 3], [w / 3, -d / 3], [0, d / 4]]) turbine(c, x, h + 0.6, z, 5);
  greenWall(c, w * 0.8, d / 2, 0.5, 14);
  // A holographic billboard on the corner.
  box(c.glow, 0.1, 8, 6, c.rng.pick(NEON), w / 2 + 0.3, h * 0.35, d / 4);
  return { r: Math.max(w, d) * 0.62, h: h + 6, ...(top ? { kind: 'penthouse' } : {}) };
}

/**
 * A twisting tower: each floor plate turned a little further than the one below, so the glass
 * corkscrews into the sky. Its windows turn with it, and neon runs up its four corners in two
 * colours, spiralling as the tower turns.
 */
function nyTwistTower(c: Ctx): Footprint {
  const w = c.rng.range(13, 17), floors = c.rng.int(18, 28), fh = 3.6, turn = c.rng.range(0.035, 0.055) * (c.rng.chance(0.5) ? 1 : -1);
  const na = c.rng.pick(NEON), nb = c.rng.pick(NEON.filter((n) => n !== na));
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    c.g.frame(0, y, 0, f * turn, 1, () => c.glow.frame(0, y, 0, f * turn, 1, () => {
      box(c.g, w, fh - 0.5, w, NY.glass);
      box(c.g, w + 0.6, 0.5, w + 0.6, NY.steel, 0, fh - 0.5, 0);
      // Tall windows two to a bay, not a band: the mullions turn with the floor.
      for (let i = 0; i < 6; i++) for (const [sx, sz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]] as const) {
        const u = -w / 2 + (i + 0.5) * (w / 6);
        box(c.glow, w / 6 - 0.7, fh - 1.5, 0.08, NY_WINDOW, sz ? u : sx * (w / 2 + 0.03), 0.5, sx ? u : sz * (w / 2 + 0.03), ry);
      }
      for (let q = 0; q < 4; q++) {
        const cx = (q & 1 ? 1 : -1) * (w / 2 + 0.15), cz = (q & 2 ? 1 : -1) * (w / 2 + 0.15);
        box(c.glow, 0.22, fh, 0.22, (q + f) % 2 ? na : nb, cx, 0, cz);
      }
    }));
  }
  const top = floors * fh, ry = floors * turn;
  c.g.frame(0, top, 0, ry, 1, () => c.glow.frame(0, top, 0, ry, 1, () => {
    solarField(c, w - 2, w - 2, 0);
    neonEdge(c, w, w, 0.3, na);
    cyl(c.g, 0.5, 0.9, 14, NY.steel, 0, 0, 0, 8);
    box(c.glow, 0.35, 0.35, 0.35, '#ff3a3a', 0, 14, 0);
  }));
  return { r: w * 0.75, h: top + 14 };
}

/**
 * A zig-zag tower: blocks of four floors stepping out to one side and back, again and again, so
 * its outline zig-zags; each step's overhang carries a planted terrace, and neon chevrons point up
 * its front, one to each block, in colours that change as it climbs.
 */
function nyZigzagTower(c: Ctx): Footprint {
  const w = c.rng.range(13, 16), d = c.rng.range(12, 15), blocks = c.rng.int(6, 10), bh = 4 * 3.5, shift = c.rng.range(2.2, 3.4);
  const hue = c.rng.int(0, NEON.length - 1);
  for (let b = 0; b < blocks; b++) {
    const x = (b % 2 ? 1 : -1) * shift / 2, y = b * bh, col = NEON[(hue + b) % NEON.length];
    box(c.g, w, bh - 0.4, d, b % 3 === 2 ? NY.limestone : NY.glass, x, y, 0);
    box(c.g, w + 0.4, 0.4, d + 0.4, NY.steel, x, y + bh - 0.4, 0);
    // Windows in vertical strips on the sides, staggered from block to block.
    for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) box(c.glow, 0.08, bh - 2.4, 1.2, NY_WINDOW, x + sx * (w / 2 + 0.03), y + 1, -d / 2 + (i + (b % 2 ? 0.25 : 0.75)) * (d / 5));
    // The chevron: two strips meeting at the middle of the front, pointing up.
    const hx = w / 2 - 0.8, hy = (bh - 2) / 2, len = Math.hypot(hx, hy), ang = Math.atan2(hy, hx);
    for (const s of [-1, 1]) c.glow.add(new THREE.BoxGeometry(len, 0.35, 0.12), col, M(x + (s * hx) / 2, y + 1 + hy / 2, d / 2 + 0.08, 0, 1, 1, 1, 0, -s * ang));
    // Where the next block steps back, the ledge is a terrace of planters.
    if (b < blocks - 1) box(c.g, shift, 0.6, d - 1, '#6b5a4a', x + (b % 2 ? 1 : -1) * (w / 2 - shift / 2), y + bh, 0);
  }
  const top = blocks * bh, lx = (blocks % 2 ? -1 : 1) * shift / 2;
  box(c.g, w * 0.5, 4, d * 0.5, NY.steel, lx, top, 0);
  neonEdge(c, w * 0.5, d * 0.5, top + 4, NEON[(hue + blocks) % NEON.length]);
  return { r: Math.max(w + shift, d) * 0.62, h: top + 5 };
}

/**
 * A desert-rose tower: a round glass core with tiers of great curved petals opening from it like
 * the blades of a desert rose, each tier turned from the one below; every petal edged in neon,
 * the colours running from rose to gold up the tower.
 */
function nyRoseTower(c: Ctx): Footprint {
  const core = c.rng.range(4.5, 6), tiers = c.rng.int(6, 10), step = c.rng.range(7, 9), H = tiers * step + 6;
  cyl(c.g, core, core * 1.08, H, NY.glass, 0, 0, 0, 16);
  for (let y = 3; y < H - 1; y += 3.4) cyl(c.glow, core + 0.04, core + 0.04, 0.5, NY_WINDOW, 0, y, 0, 16);
  const petalGeo = () => new THREE.SphereGeometry(1, 12, 4);
  const ringGeo = () => new THREE.TorusGeometry(1, 0.035, 4, 28).rotateX(Math.PI / 2);
  const glow = ['#ff4a8a', '#ff7a6a', '#ffa05a', '#ffc84a', '#ffe07a'];
  for (let t = 0; t < tiers; t++) {
    const y = 4 + t * step, n = 5, L = core * (1.5 - t * 0.06), tilt = 0.35 + t * 0.03;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.63;
      c.g.frame(0, y, 0, a, 1, () => c.glow.frame(0, y, 0, a, 1, () => {
        const px = 0, py = Math.sin(tilt) * L * 0.5, pz = core * 0.8 + Math.cos(tilt) * L * 0.5;
        c.g.add(petalGeo(), t % 2 ? '#e8d8c8' : '#cfd8e2', M(px, py, pz, 0, L * 0.45, 0.22, L * 0.55, -tilt));
        c.glow.add(ringGeo(), glow[Math.min(glow.length - 1, Math.floor((t / tiers) * glow.length))], M(px, py + 0.12, pz, 0, L * 0.45, 1, L * 0.55, -tilt));
      }));
    }
  }
  cone(c.g, core * 0.9, 10, '#e8d8c8', 0, H, 0, 16);
  box(c.glow, 0.35, 0.35, 0.35, '#ff3a3a', 0, H + 10, 0);
  return { r: core + core * 1.5 * 0.9, h: H + 10 };
}

/** Brownstone row house (composed from the facade kit), grown solarpunk: iron fire escapes, a green wall, a rooftop greenhouse and solar panels. */
function nyBrownstone(c: Ctx): Footprint {
  const fp = compose(c, FACADES.brownstone, '#3a2418');
  const top = fp.top ?? fp.h - 3;
  // Fire escapes down one side of the front.
  const w = FACADES.brownstone.bayW * 3 + 0.6, d = 12.5;
  for (let y = 3.4; y < top - 1; y += 3.4) {
    box(c.g, 2.4, 0.08, 1.1, IRON, -w / 2 + 1.5, y, d / 2 + 0.55);
    box(c.g, 2.4, 0.9, 0.05, IRON, -w / 2 + 1.5, y + 0.1, d / 2 + 1.1);
  }
  greenWall(c, w * 0.5, d / 2, top * 0.45, top);
  box(c.g, 3.6, 2.2, 3.6, '#dfe8e0', 1.6, top + 0.6, -2);
  box(c.glow, 3.5, 2.0, 3.5, '#d8ffe8', 1.6, top + 0.7, -2);
  solarField(c, 3.5, 6, top + 0.6);
  return fp;
}

/** Cast-iron loft (SoHo): tall windows between iron columns, and a solar-skinned water tower. */
function nyLoft(c: Ctx): Footprint {
  const floors = c.rng.int(5, 8), fh = 4.2, w = 14, d = 14, H = floors * fh;
  box(c.g, w, H, d, c.rng.chance(0.5) ? NY.steel : NY.brick);
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 4; i++) win(c, -w / 2 + 1.75 + i * 3.5, 1 + f * fh, d / 2 + 0.03, 2.2, 2.8, 0, true);
    box(c.g, w + 0.3, 0.4, 0.4, IRON, 0, f * fh, d / 2 + 0.2);
  }
  for (let i = 0; i <= 4; i++) box(c.g, 0.4, H, 0.4, IRON, -w / 2 + i * 3.5, 0, d / 2 + 0.25);
  box(c.g, w + 1, 0.8, d + 1, IRON, 0, H, 0);
  // The water tower, wrapped in a solar skin.
  for (const [a, b] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) cyl(c.g, 0.12, 0.12, 2.4, IRON, a + 2, H + 0.8, b - 2, 4);
  cyl(c.g, 1.6, 1.6, 3.4, '#8a5a3a', 2, H + 3.2, -2, 12);
  for (let i = 0; i < 6; i++) c.g.frame(2, H + 3.6, -2, (i / 6) * Math.PI * 2, 1, () => box(c.g, 0.9, 2.4, 0.06, SOLAR, 0, 0, 1.62));
  cone(c.g, 1.7, 1.3, '#5a3a2a', 2, H + 6.6, -2, 12);
  solarField(c, 6, 6, H + 0.8);
  greenWall(c, w * 0.7, d / 2, 1, H * 0.5);
  box(c.glow, w * 0.4, 0.8, 0.1, c.rng.pick(NEON), 0, 3.4, d / 2 + 0.45);
  return { r: 10, h: H + 8 };
}


/* ------------------------------------------------------------------------------------------------
 * Wanderers' Meadow: fairy-tale architecture. Pale cut stone and plaster (their wall colours carry
 * those surfaces) under steep, bright shingle roofs; turrets and pennants, crooked chimneys,
 * round doors, toadstools and wizards' towers with floating crystals.
 * --------------------------------------------------------------------------------------------- */
const PENNANTS = ['#ff6fb8', '#5ac8ff', '#ffd24a', '#a67bff', '#5affa0'];

/** Draw with a given surface (stone courses, plaster, thatch, slate…) whatever the colour. */
function withSurf(c: Ctx, s: number, fn: () => void): void {
  const prev = c.g.surface;
  c.g.surface = s;
  try { fn(); } finally { c.g.surface = prev; }
}

/** A round turret: stone drum, a tall cone roof and a pennant on top. */
function turret(c: Ctx, x: number, z: number, r: number, h: number, y = 0): void {
  const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
  withSurf(c, SURF.ashlar, () => cyl(c.g, r, r * 1.04, h, wall, x, y, z, 12));
  box(c.g, r * 2.2, 0.25, r * 2.2, '#e8e0cc', x, y + h - 0.25, z); // a corbelled string course under the roof
  withSurf(c, SURF.slate, () => cone(c.g, r * 1.3, r * 2.6, roof, x, y + h, z, 12));
  cyl(c.g, 0.04, 0.04, 1.4, '#6b5a4a', x, y + h + r * 2.6 - 0.2, z, 4);
  box(c.g, 0.9, 0.35, 0.03, pick(c, PENNANTS), x + 0.45, y + h + r * 2.6 + 0.8, z);
  win(c, x, y + h * 0.55, z + r + 0.02, 0.5, 0.9, 0, true);
}

/** A crenellated parapet round a w × d top at height y. */
function battlements(c: Ctx, w: number, d: number, y: number, col: string): void {
  withSurf(c, SURF.ashlar, () => {
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.2) for (const z of [-d / 2, d / 2]) box(c.g, 0.6, 0.7, 0.5, col, x, y, z);
    for (let z = -d / 2 + 1.2; z < d / 2; z += 1.2) for (const x of [-w / 2, w / 2]) box(c.g, 0.5, 0.7, 0.6, col, x, y, z);
  });
}

/** A little castle keep: battlements, four corner turrets with banners, an arched gate. */
function fairyKeep(c: Ctx): Footprint {
  const w = 8, d = 8, h = 7, wall = pick(c, c.s.walls);
  withSurf(c, SURF.ashlar, () => box(c.g, w, h, d, wall));
  // A plinth of rougher stone, quoins up the corners, a moulded gate surround.
  withSurf(c, SURF.cobble, () => box(c.g, w + 0.3, 0.8, d + 0.3, '#9a9488'));
  for (const sx of [-1, 1]) for (let y = 0.8, k = 0; y < h - 0.3; y += 0.5, k++) box(c.g, k % 2 ? 0.4 : 0.7, 0.44, 0.12, '#e8e0cc', sx * (w / 2 - (k % 2 ? 0.2 : 0.35)), y, d / 2 + 0.02);
  archPanel(c.g, 2.7, 3.6, '#e8e0cc', 0, 0, d / 2 + 0.01, 0, 0.1, true);
  battlements(c, w, d, h, wall);
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) turret(c, x, z, 1.3, h + 2);
  archPanel(c.g, 2.2, 3.2, DOOR, 0, 0, d / 2 + 0.02, 0, 0.12, true);
  for (const x of [-2.3, 2.3]) win(c, x, 3.6, d / 2 + 0.02, 0.8, 1.4, 0, true);
  // Banners hanging either side of the gate.
  for (const x of [-1.8, 1.8]) box(c.g, 0.7, 2.2, 0.05, pick(c, PENNANTS), x, 3.8, d / 2 + 0.05);
  return { r: 6.4, h: h + 9 };
}

/** A round stone tower with a steep turret roof, a smaller side turret and climbing roses. */
function fairyTower(c: Ctx): Footprint {
  const r = 2.8, h = c.rng.range(8, 11), wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
  withSurf(c, SURF.ashlar, () => cyl(c.g, r, r * 1.06, h, wall, 0, 0, 0, 16));
  withSurf(c, SURF.cobble, () => cyl(c.g, r * 1.1, r * 1.14, 0.9, '#9a9488', 0, 0, 0, 16));
  for (let y = 3; y < h - 1; y += 3) cyl(c.g, r * 1.05, r * 1.05, 0.18, '#e8e0cc', 0, y, 0, 16); // string courses
  box(c.g, r * 2.3, 0.35, 0.35, '#e8e0cc', 0, h - 0.4, r - 0.1);
  withSurf(c, SURF.slate, () => cone(c.g, r * 1.3, r * 2.8, roof, 0, h, 0, 16));
  cyl(c.g, 0.05, 0.05, 1.8, '#6b5a4a', 0, h + r * 2.8 - 0.3, 0, 4);
  box(c.g, 1.2, 0.45, 0.03, pick(c, PENNANTS), 0.6, h + r * 2.8 + 1, 0);
  turret(c, r * 0.95, -r * 0.3, 1.1, h * 0.7);
  archPanel(c.g, 1.3, 2.3, DOOR, 0, 0, r + 0.03, 0, 0.1, true);
  for (let f = 1; f < h / 3; f++) win(c, 0, f * 3 + 0.4, r + 0.04, 0.7, 1.2, 0, true);
  // Climbing roses up one side.
  for (let i = 0; i < 18; i++) { const a = 0.9 + (i % 5) * 0.12, y = 0.3 + i * (h * 0.045); sphere(c.g, 0.22, i % 3 ? '#4f9a4a' : '#ff5a7a', Math.sin(a) * (r + 0.1), y, Math.cos(a) * (r + 0.1), 5); }
  return { r: r + 1.6, h: h + r * 2.8 + 2 };
}

/** A storybook cottage: steep roof, crooked chimney, half-timbering, a round door and a dormer. */
function storyCottage(c: Ctx): Footprint {
  const w = 7, d = 6, h = 3.4, wall = pick(c, c.s.walls), roof = pick(c, ['#c8a060', '#b8904a', c.s.roofs[0]]), timber = '#5a4030';
  withSurf(c, SURF.plaster, () => box(c.g, w, h, d, wall));
  withSurf(c, SURF.cobble, () => box(c.g, w + 0.2, 0.6, d + 0.2, '#9a9488'));
  // Half-timbering on the front.
  withSurf(c, SURF.boards, () => { for (const x of [-w / 2 + 0.1, -1.2, 1.2, w / 2 - 0.1]) box(c.g, 0.2, h, 0.08, timber, x, 0, d / 2 + 0.03); });
  box(c.g, w, 0.2, 0.08, timber, 0, h * 0.55, d / 2 + 0.03);
  for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.16, 2.2, 0.08).translate(0, 1.1, 0), timber, M(s * 2.4, h * 0.55, d / 2 + 0.04, 0, 1, 1, 1, 0, s * 0.6));
  // A deep thatch (or slate) roof, its ridge bound in a darker band.
  const thatched = roof !== c.s.roofs[0];
  withSurf(c, thatched ? SURF.thatch : SURF.slate, () => gable(c.g, w + 1.2, d + 1.2, 3.8, roof, 0, h, 0));
  if (thatched) box(c.g, w + 1.3, 0.3, 0.6, '#7a5a30', 0, h + 3.6, 0);
  // A dormer with its own little roof.
  withSurf(c, SURF.plaster, () => box(c.g, 1.6, 1.3, 1.4, wall, 1.4, h + 0.9, d / 2 - 0.4));
  withSurf(c, thatched ? SURF.thatch : SURF.slate, () => gable(c.g, 2, 1.8, 0.9, roof, 1.4, h + 2.2, d / 2 - 0.4, Math.PI / 2));
  win(c, 1.4, h + 1.1, d / 2 + 0.32, 0.7, 0.7);
  // A crooked chimney.
  withSurf(c, SURF.brick, () => { for (let i = 0; i < 4; i++) box(c.g, 0.8, 0.9, 0.8, '#b5654a', -1.8 + i * 0.12, h + 1.4 + i * 0.9, -0.8); });
  chimneyTop(c.g, -1.44, h + 5.1, -0.8);
  // A round-topped door and round windows.
  archPanel(c.g, 1.2, 2.1, '#7a4a2a', 0, 0, d / 2 + 0.05, 0, 0.1, true);
  sphere(c.glow, 0.45, c.s.glow, -2.3, 1.7, d / 2 + 0.02, 10, 1);
  sphere(c.glow, 0.45, c.s.glow, 2.3, 1.7, d / 2 + 0.02, 10, 1);
  for (let i = 0; i < 6; i++) sphere(c.g, 0.25, pick(c, c.s.flowers), -2.8 + i * 1.1, 0.2, d / 2 + 0.5, 5);
  return { r: 4.6, h: h + 5 };
}

/** A toadstool house: a stout stem with a door and round windows under a spotted cap. */
function toadstool(c: Ctx): Footprint {
  const r = c.rng.range(2, 2.6), h = c.rng.range(3, 4), cap = c.rng.pick(['#e0473a', '#e07a5f', '#c38fd9', '#f2c14e']);
  withSurf(c, SURF.plaster, () => cyl(c.g, r, r * 1.15, h, '#f4ecd8', 0, 0, 0, 14));
  withSurf(c, SURF.glazed, () => dome(c.g, r * 2, cap, 0, h - 0.3, 0, 16, 0.75));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; box(c.g, 0.05, 0.5, r * 0.9, '#efe2c8', Math.cos(a) * r * 1.5, h - 0.8, Math.sin(a) * r * 1.5, -a); } // gills under the cap
  cyl(c.g, r * 2.02, r * 1.9, 0.3, '#fff4e0', 0, h - 0.5, 0, 16);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, e = 0.3 + (i % 3) * 0.3;
    sphere(c.g, 0.35 + (i % 2) * 0.12, '#fffaf0', Math.cos(a) * r * 2 * Math.cos(e) * 0.95, h - 0.3 + Math.sin(e) * r * 1.5 * 0.95, Math.sin(a) * r * 2 * Math.cos(e) * 0.95, 6, 0.5);
  }
  archPanel(c.g, 1, 1.8, '#7a4a2a', 0, 0, r * 1.1 + 0.02, 0, 0.1, true);
  for (const a of [0.9, -0.9]) sphere(c.glow, 0.32, c.s.glow, Math.sin(a) * r * 1.08, h * 0.55, Math.cos(a) * r * 1.08, 8, 1);
  return { r: r * 2 + 0.4, h: h + r * 1.5 };
}

/** A wizard's tower: slender and tall, floating glowing crystals round a pointed hat of a roof. */
function wizardTower(c: Ctx): Footprint {
  const r = 1.8, h = c.rng.range(11, 15), wall = pick(c, c.s.walls);
  withSurf(c, SURF.ashlar, () => cyl(c.g, r * 0.9, r * 1.2, h, wall, 0, 0, 0, 14));
  for (let y = 2.5; y < h; y += 3) box(c.g, r * 2.2, 0.25, 0.25, '#e8e0cc', 0, y, r * 0.95);
  // A pointed hat, a little bent.
  withSurf(c, SURF.cloth, () => {
    cone(c.g, r * 1.6, 3, '#4a3a8a', 0, h, 0, 14);
    c.g.add(new THREE.ConeGeometry(r * 0.7, 3, 12).translate(0, 1.5, 0), '#4a3a8a', M(0.2, h + 2.8, 0, 0, 1, 1, 1, 0, -0.35));
  });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; box(c.g, 0.16, 0.16, 0.02, '#ffd24a', Math.cos(a) * r * 1.2, h + 1.2, Math.sin(a) * r * 1.2, -a); } // stars on the hat
  // Glowing runes spiralling up, and crystals floating round the top.
  for (let i = 0; i < 12; i++) { const a = i * 0.8, y = 1 + i * (h / 13); box(c.glow, 0.25, 0.4, 0.05, '#9ad8ff', Math.sin(a) * (r * 1.05), y, Math.cos(a) * (r * 1.05), a); }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.glow.add(new THREE.OctahedronGeometry(0.4, 0).scale(1, 1.8, 1), i % 2 ? '#b8a4ff' : '#7affd0', M(Math.cos(a) * 3.2, h - 1 + (i % 2) * 1.2, Math.sin(a) * 3.2));
  }
  archPanel(c.g, 1.1, 2, '#3a2a5a', 0, 0, r * 1.18 + 0.02, 0, 0.1, true);
  win(c, 0, h - 2.5, r * 0.92, 0.7, 1.2, 0, true);
  return { r: r + 2.2, h: h + 6 };
}

export function buildHouse(c: Ctx): Footprint {
  // Lands with a traditional kit build from it (traditions.ts); the rest from their own builders.
  const fp = buildTradition(c) ?? houses[c.s.id]!(c);
  if (c.s.id !== 'desert' && c.s.id !== 'skyisles' && c.s.id !== 'aurora') houseDetails(c, fp);
  houseDecor(c, fp);
  return fp;
}

/**
 * The lived-in touches every house gets on its street side (+z): a door step, potted plants by
 * the door, a lantern, a flower box under a window, and fairy lights along the front.
 */
function houseDetails(c: Ctx, fp: Footprint): void {
  const z = fp.r * 0.86, r = () => c.rng.next();
  box(c.g, 1.6, 0.18, 0.7, '#b8b0a4', 0, 0, z + 0.3);
  for (const x of [-1.1, 1.1]) {
    cyl(c.g, 0.22, 0.16, 0.4, '#b5654a', x, 0, z + 0.35, 6);
    sphere(c.g, 0.3, r() < 0.5 ? '#4f9a44' : '#6aa84f', x, 0.62, z + 0.35, 6);
    if (r() < 0.6) sphere(c.g, 0.08, c.s.flowers[Math.floor(r() * c.s.flowers.length)], x + 0.1, 0.85, z + 0.45, 4);
  }
  sphere(c.glow, 0.13, c.s.glow, 1.0, 2.1, z + 0.12, 6);
  const wx = (r() < 0.5 ? -1 : 1) * fp.r * 0.45;
  box(c.g, 1.2, 0.22, 0.3, '#8a5a36', wx, 1.0, z + 0.05);
  for (let i = 0; i < 4; i++) sphere(c.g, 0.1, c.s.flowers[i % c.s.flowers.length], wx - 0.45 + i * 0.3, 1.28, z + 0.08, 4);
  const ly = Math.min(fp.h * 0.62, 3.2);
  for (let i = 0; i <= 8; i++) {
    const x = -fp.r * 0.7 + (i / 8) * fp.r * 1.4;
    sphere(c.glow, 0.05, ['#ffd98a', '#ffb3d9', '#b3e6ff', '#fff2c8'][i % 4], x, ly - Math.sin((i / 8) * Math.PI) * 0.2, z + 0.1, 4);
  }
}

// ───────────────────────── street props ─────────────────────────

export function lampPost(c: Ctx, x: number, y: number, z: number): void {
  const id = c.s.id;
  if (id === 'japan') {
    box(c.g, 0.5, 0.9, 0.5, '#9a948a', x, y, z);
    box(c.g, 0.8, 0.1, 0.8, '#9a948a', x, y + 0.9, z);
    box(c.glow, 0.5, 0.5, 0.5, c.s.glow, x, y + 1, z);
    hip(c.g, 1.1, 1.1, 0.5, '#8a847a', x, y + 1.5, z);
    return;
  }
  if (id === 'china' || id === 'korea') {
    cyl(c.g, 0.07, 0.07, 3, '#b3262a', x, y, z, 5);
    box(c.g, 1.2, 0.1, 0.1, '#b3262a', x + 0.5, y + 3, z);
    lanternHanging(c, x + 1, y + 3, z, id === 'china' ? '#ff4a2a' : '#ffd08a');
    return;
  }
  // Every other land lights its streets with its own lantern (lanterns.ts) on a post of its own.
  const design = LAND_LANTERN[id];
  const lantern = (lx: number, ly: number, lz: number, k = 1.1) => c.glow.add(lanternGeometry(design).scale(k, k, k), c.s.glow, M(lx, ly, lz));
  switch (design) {
    case 'victorian': {
      const iron = '#1f1f24';
      cyl(c.g, 0.07, 0.12, 3.4, iron, x, y, z, 8);
      cyl(c.g, 0.16, 0.2, 0.5, iron, x, y, z, 8);
      box(c.g, 0.7, 0.06, 0.06, iron, x + 0.3, y + 3.3, z);
      lantern(x + 0.62, y + 2.6, z, 1);
      break;
    }
    case 'nordic':
      cyl(c.g, 0.09, 0.11, 2.6, '#5a4030', x, y, z, 6);
      box(c.g, 0.5, 0.08, 0.08, '#2a2a2e', x + 0.2, y + 2.55, z);
      lantern(x + 0.42, y + 1.75, z, 0.95);
      break;
    case 'moroccan':
      cyl(c.g, 0.06, 0.08, 2.9, '#8a6a3a', x, y, z, 6);
      box(c.g, 0.6, 0.05, 0.05, '#8a6a3a', x + 0.25, y + 2.85, z);
      lantern(x + 0.52, y + 1.85, z, 0.95);
      break;
    case 'kandil':
      cyl(c.g, 0.05, 0.06, 3, '#b89a5a', x, y, z, 5);
      box(c.g, 0.7, 0.05, 0.05, '#b89a5a', x + 0.3, y + 2.95, z);
      lantern(x + 0.62, y + 2.1, z, 1);
      break;
    case 'crystal':
      cyl(c.g, 0.25, 0.35, 0.5, '#f4f0ff', x, y, z, 8);
      lantern(x, y + 1.0, z, 1.1);
      break;
    case 'fairy':
      // A stem that curls over like a flower on its stalk, with the lantern as its bloom.
      cyl(c.g, 0.05, 0.08, 2.6, '#4f8a4a', x, y, z, 6);
      c.g.add(new THREE.TorusGeometry(0.35, 0.05, 6, 12, Math.PI), '#4f8a4a', M(x + 0.35, y + 2.6, z));
      lantern(x + 0.7, y + 1.95, z, 1);
      break;
    case 'woven':
      cyl(c.g, 0.06, 0.07, 3.2, '#b89a5a', x, y, z, 5);
      c.g.add(new THREE.TorusGeometry(0.5, 0.03, 4, 12, Math.PI * 0.6), '#b89a5a', M(x + 0.45, y + 3.0, z, 0, 1, 1, 1, 0, -0.2));
      lantern(x + 0.8, y + 2.2, z, 1);
      break;
    default: {
      const dark = '#4a3a2a';
      cyl(c.g, 0.08, 0.12, 3.6, dark, x, y, z, 6);
      box(c.glow, 0.45, 0.6, 0.45, c.s.glow, x, y + 3.6, z);
      cone(c.g, 0.4, 0.4, dark, x, y + 4.2, z, 4);
    }
  }
}

/** Small scene-setting props scattered through a land's streets. */
export function streetProp(c: Ctx, x: number, y: number, z: number, ry: number): void {
  const id = c.s.id;
  c.g.frame(x, y, z, ry, 1, () => c.glow.frame(x, y, z, ry, 1, () => {
    const r = c.rng.next();
    switch (id) {
      case 'london':
        if (r < 0.5) {
          box(c.g, 1, 2.6, 1, '#c8202a');
          box(c.glow, 0.8, 1.4, 1.02, '#fff0c0', 0, 0.9, 0);
          box(c.g, 1.1, 0.3, 1.1, '#c8202a', 0, 2.6, 0);
        } else {
          box(c.g, 2.6, 4.4, 9, '#c8202a', 0, 0.5, 0);
          box(c.glow, 2.64, 0.9, 8, '#fff0c0', 0, 1.9, 0);
          box(c.glow, 2.64, 0.9, 8, '#fff0c0', 0, 3.6, 0);
          for (const zz of [-3, 3]) for (const xx of [-1.2, 1.2]) cyl(c.g, 0.5, 0.5, 0.3, '#1f1f24', xx, 0.2, zz, 8);
        }
        break;
      case 'newyork':
        box(c.g, 1.9, 1, 4.4, '#f2c230', 0, 0.4, 0);
        box(c.g, 1.7, 0.7, 2.2, '#f2c230', 0, 1.4, -0.2);
        box(c.glow, 1.72, 0.45, 2.1, '#cfe8ff', 0, 1.5, -0.2);
        break;
      case 'japan':
        if (r < 0.5) {
          for (const xx of [-2, 2]) cyl(c.g, 0.2, 0.24, 4.4, '#c8202a', xx, 0, 0, 8);
          box(c.g, 5.8, 0.4, 0.5, '#c8202a', 0, 3.6, 0);
          box(c.g, 6.6, 0.4, 0.6, '#2a2a2a', 0, 4.4, 0);
        } else {
          tree(c.g, 'sakura', 0, 0, 0, 1.2, () => c.rng.next());
        }
        break;
      case 'renaissance':
      case 'islamic':
      case 'mughal': {
        const stone = id === 'mughal' ? '#fbf7ee' : id === 'islamic' ? '#3a9a9a' : '#d9d0c0';
        waterBasin(c, 0, 0, 0, 2.1, { stone, kerb: 0.7, seg: id === 'islamic' ? 8 : 18, tiers: true });
        break;
      }
      case 'middleeast':
      case 'indianorth': {
        const cloth = c.rng.pick(['#c23b2a', '#e2b43a', '#2f6f9a', '#d9467a', '#2f7a5a']);
        for (const [xx, zz] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]) cyl(c.g, 0.06, 0.06, 2.4, '#6b4a2a', xx, 0, zz, 4);
        box(c.g, 3.2, 0.1, 2.4, cloth, 0, 2.4, 0);
        box(c.g, 2.8, 0.9, 1.6, '#8a5a36', 0, 0, 0);
        for (let i = 0; i < 5; i++) sphere(c.g, 0.25, c.rng.pick(['#e8364a', '#f2a13a', '#7ab55a', '#f2d14e']), -1.1 + i * 0.55, 1, 0, 5);
        lanternHanging(c, 0, 2.4, 1);
        break;
      }
      case 'vintage':
        box(c.g, 1.9, 0.9, 4.2, c.rng.pick(['#8fd3c7', '#f2a0a0', '#f2d06a']), 0, 0.4, 0);
        box(c.g, 1.7, 0.8, 2, '#f4f1de', 0, 1.3, -0.3);
        for (const zz of [-1.4, 1.4]) for (const xx of [-0.95, 0.95]) cyl(c.g, 0.4, 0.4, 0.25, '#1f1f24', xx, 0.2, zz, 8);
        break;
      case 'meadow':
        waterBasin(c, 0, 0, 0, 0.62, { stone: '#a8703f', kerb: 0.95, seg: 12, jets: 0, speed: 0.15 });
        for (const xx of [-0.7, 0.7]) box(c.g, 0.12, 2.2, 0.12, '#6b4a2a', xx, 0, 0);
        gable(c.g, 1.9, 1.6, 0.8, '#e07a5f', 0, 2.2, 0);
        break;
      case 'aurora':
        box(c.g, 1.6, 0.6, 0.9, '#8a5a3c', 0, 0.2, 0);
        box(c.g, 0.1, 0.1, 2.4, '#6b4a2a', -0.6, 0, 0);
        box(c.g, 0.1, 0.1, 2.4, '#6b4a2a', 0.6, 0, 0);
        break;
      case 'indiasouth':
      case 'indonesia':
        box(c.g, 1.8, 0.8, 5, '#6b4a2a', 0, 0, 0);
        gable(c.g, 1.4, 2, 1.2, '#c9a86a', 0, 0.8, 0, Math.PI / 2);
        break;
      default:
        box(c.g, 2, 0.45, 0.6, '#8a5a36', 0, 0.45, 0);
        for (const xx of [-0.8, 0.8]) box(c.g, 0.1, 0.45, 0.5, '#4a3a2a', xx, 0, 0);
    }
  }));
}

// ───────────────────────── landmarks ─────────────────────────

export interface LandmarkOut {
  colliders: Array<{ x: number; z: number; r: number; h: number; y0?: number }>;
  platforms: Array<{ x: number; z: number; r: number; y: number }>;
  /** Height of the landmark, for the map and far-view. */
  height: number;
}

type LandmarkFn = (c: Ctx, out: LandmarkOut) => void;

function pagoda(c: Ctx, tiers: number, base: number, roofCol: string, bodyCol: string): number {
  let y = 0;
  box(c.g, base + 3, 1, base + 3, '#9a948a');
  y = 1;
  for (let i = 0; i < tiers; i++) {
    const s = base * (1 - i * 0.12);
    box(c.g, s, 3.4, s, bodyCol, 0, y, 0);
    box(c.glow, s * 0.4, 1.6, s + 0.1, c.s.glow, 0, y + 0.8, 0);
    sweptRoof(c.g, s * 1.7, s * 1.7, 1.8, roofCol, 0, y + 3.2, 0, 0, 0.4);
    y += 4.4;
  }
  cyl(c.g, 0.2, 0.25, 7, '#c9a86a', 0, y - 0.6, 0, 6);
  for (let i = 0; i < 5; i++) cyl(c.g, 0.55, 0.55, 0.15, '#c9a86a', 0, y + i * 1.1, 0, 8);
  return y + 6;
}

const landmarks: Record<RegionId, LandmarkFn> = {
  meadow(c, o) {
    // The Great Tree: an ancient giant grown branch by branch (trees.ts) — buttress roots over the
    // grass, a gnarled trunk forking into great limbs, a crown of leaves, lanterns on ropes, a
    // swing, and a little door into the trunk.
    const bark = '#6b4a30';
    c.g.leafy = true;
    try { growTree(c.g, GREAT_TREE, 0, 0, 0, 1, () => c.rng.next()); } finally { c.g.leafy = false; }
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + c.rng.range(-0.2, 0.2), len = c.rng.range(5, 8);
      // A root: from the trunk's foot, arching out and down into the ground.
      c.g.add(new THREE.CylinderGeometry(0.25, 1.1, len, 7).translate(0, len / 2, 0), bark, M(Math.cos(a) * 1.6, 1.4, Math.sin(a) * 1.6, -a + Math.PI / 2, 1, 1, 1, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(-1.3)));
    }
    // The door into the trunk, with a lit round window above it.
    archPanel(c.g, 1.3, 2.2, '#4a2e1a', 0, 0, 2.95, 0, 0.12, true);
    box(c.glow, 0.12, 0.12, 0.05, '#ffd27a', 0.35, 1.1, 3.08);
    sphere(c.glow, 0.32, c.s.glow, 0, 3.4, 2.9, 10);
    // A rope swing on a low limb, and lanterns hanging on ropes all round the crown.
    for (const x of [-0.5, 0.5]) box(c.g, 0.04, 6.5, 0.04, '#d8c8a0', 5.6 + x, 1.2, 1.2);
    box(c.g, 1.3, 0.1, 0.45, '#8a5a36', 5.6, 1.1, 1.2);
    for (let i = 0; i < 26; i++) {
      const a = c.rng.range(0, Math.PI * 2), rr = c.rng.range(5, 14), y = c.rng.range(9, 17), drop = c.rng.range(1, 2.5);
      box(c.g, 0.03, drop, 0.03, '#d8c8a0', Math.cos(a) * rr, y, Math.sin(a) * rr);
      c.glow.add(lanternGeometry('fairy').scale(0.9, 0.9, 0.9), c.rng.pick(['#ffe98a', '#ffd6f0', '#c8f0ff', '#fff4c0']), M(Math.cos(a) * rr, y - 0.9, Math.sin(a) * rr));
    }
    for (let i = 0; i < 40; i++) {
      const a = c.rng.range(0, Math.PI * 2), rr = c.rng.range(3, 12);
      sphere(c.glow, 0.25, c.rng.pick(['#ffe98a', '#ffd6f0', '#c8f0ff']), Math.cos(a) * rr, c.rng.range(10, 24), Math.sin(a) * rr, 5);
    }
    c.g.frame(18, 0, 6, 0, 1, () => {
      cyl(c.g, 1.8, 1.9, 1.2, '#a8a098', 0, 0, 0, 10);
      cyl(c.g, 1.5, 1.5, 0.1, '#5ab4e0', 0, 1.1, 0, 10);
      for (const x of [-1.5, 1.5]) box(c.g, 0.2, 2.8, 0.2, '#6b4a2a', x, 0, 0);
      gable(c.g, 3.6, 3, 1.2, '#e07a5f', 0, 2.8, 0);
    });
    c.g.frame(-26, 0, -14, 0.4, 1, () => c.glow.frame(-26, 0, -14, 0.4, 1, () => {
      cyl(c.g, 2.4, 3.4, 12, '#fff4e0', 0, 0, 0, 8);
      cone(c.g, 3, 3, '#e07a5f', 0, 12, 0, 8);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.BoxGeometry(1.1, 8, 0.15);
        blade.translate(0, 4.2, 0);
        c.g.add(blade, '#f4ead8', M(0, 11, 3.5, 0, 1, 1, 1, 0, (i * Math.PI) / 2 + 0.4));
      }
      box(c.glow, 1, 1.4, 0.1, c.s.glow, 0, 5, 3.25);
    }));
    o.colliders.push({ x: 0, z: 0, r: 3.6, h: 32 }, { x: 18, z: 6, r: 2, h: 3 }, { x: -26, z: -14, r: 3.4, h: 15 });
    o.height = 32;
  },

  japan(c, o) {
    o.height = pagoda(c, 5, 8, '#3a3a4a', '#8a3a2a');
    c.g.frame(0, 0, 26, 0, 1, () => {
      for (const x of [-4, 4]) cyl(c.g, 0.45, 0.55, 8, '#d42a2a', x, 0, 0, 10);
      box(c.g, 11, 0.7, 0.8, '#d42a2a', 0, 6.4, 0);
      box(c.g, 13, 0.7, 1.1, '#2a2a2a', 0, 7.8, 0);
    });
    o.colliders.push({ x: 0, z: 0, r: 7, h: o.height }, { x: -4, z: 26, r: 0.8, h: 8 }, { x: 4, z: 26, r: 0.8, h: 8 });
  },

  korea(c, o) {
    box(c.g, 34, 7, 12, '#b8b0a4');
    for (const x of [-10, 0, 10]) archPanel(c.g, 4.6, 5.4, '#3a2a22', x, 0, 6.01);
    box(c.g, 30, 5, 9, '#c23b2a', 0, 7, 0);
    for (let i = 0; i < 9; i++) box(c.glow, 2, 2.6, 0.1, c.s.glow, -13 + i * 3.25, 8, 4.52);
    sweptRoof(c.g, 44, 16, 4, '#3a3f4a', 0, 12, 0, 0, 0.5);
    box(c.g, 18, 3, 6, '#c23b2a', 0, 15.5, 0);
    sweptRoof(c.g, 28, 11, 3.6, '#3a3f4a', 0, 18.5, 0, 0, 0.5);
    o.colliders.push({ x: -12, z: 0, r: 6, h: 22 }, { x: 12, z: 0, r: 6, h: 22 });
    o.height = 22;
  },

  china(c, o) {
    let y = 0;
    for (let i = 0; i < 3; i++) {
      cyl(c.g, 22 - i * 4, 23 - i * 4, 1.4, '#f4f0e6', 0, y, 0, 24);
      y += 1.4;
    }
    o.platforms.push({ x: 0, z: 0, r: 14, y });
    for (let i = 0; i < 3; i++) {
      const r = 7 - i * 1.8;
      cyl(c.g, r, r, 4, '#b3262a', 0, y, 0, 16);
      box(c.glow, r * 2.02, 1.6, r * 0.8, c.s.glow, 0, y + 1.2, 0);
      y += 4;
      cone(c.g, r + 2.2, 3.4, '#2a4a9a', 0, y, 0, 16);
      y += 2.2;
    }
    sphere(c.g, 1, '#e2b43a', 0, y + 1.4, 0, 8);
    o.colliders.push({ x: 0, z: 0, r: 7.2, h: y + 3 });
    o.height = y + 3;
  },

  norway(c, o) {
    const wood = '#3a2a22';
    box(c.g, 14, 6, 10, wood);
    let y = 6;
    for (let i = 0; i < 4; i++) {
      const s = 1 - i * 0.2;
      gable(c.g, 16 * s, 12 * s, 5 * s, '#2a1f1a', 0, y, 0);
      if (i < 3) box(c.g, 10 * s, 2.2, 8 * s, wood, 0, y + 3.5 * s, 0);
      y += 4.2 * s;
      for (const s2 of [-1, 1]) {
        c.g.frame(s2 * 8 * s, y - 1.2, 0, 0, 1, () => cone(c.g, 0.4, 2.4, '#2a1f1a', 0, 0, 0, 5));
      }
    }
    cone(c.g, 1.6, 8, '#2a1f1a', 0, y, 0, 6);
    box(c.glow, 2, 3, 0.1, c.s.glow, 0, 0, 5.05);
    o.colliders.push({ x: 0, z: 0, r: 8, h: y + 8 });
    o.height = y + 8;
  },

  switzerland(c, o) {
    box(c.g, 9, 26, 9, '#e8dcc0');
    archPanel(c.g, 5, 7, '#3a2a22', 0, 0, 4.51);
    box(c.g, 9.4, 1, 9.4, '#c23b3b', 0, 12, 0);
    for (let i = 0; i < 4; i++) {
      c.glow.frame(0, 20, 0, (i * Math.PI) / 2, 1, () => {
        c.glow.add(cylinderDisc(2.6, 4.5), '#fff4d0');
      });
    }
    hip(c.g, 10.5, 10.5, 9, '#5a3a26', 0, 26, 0);
    cyl(c.g, 0.2, 0.2, 3, '#e2b43a', 0, 35, 0, 5);
    o.colliders.push({ x: 0, z: 0, r: 6.4, h: 38 });
    o.height = 38;
  },

  london(c, o) {
    box(c.g, 60, 14, 14, '#d9c9a0', 0, 0, 14);
    for (let i = 0; i < 18; i++) win(c, -28 + i * 3.3, 3, 21.02, 1.2, 6, 0, true);
    for (let i = 0; i < 12; i++) cone(c.g, 0.6, 3, '#d9c9a0', -27 + i * 5, 14, 21, 4);
    box(c.g, 11, 60, 11, '#d9c9a0');
    for (let y = 4; y < 54; y += 6) for (let i = 0; i < 4; i++) {
      c.glow.frame(0, y, 0, (i * Math.PI) / 2, 1, () => box(c.glow, 1.4, 3.4, 0.1, c.s.glow, 0, 0, 5.52));
    }
    box(c.g, 12.5, 12, 12.5, '#c9b88a', 0, 58, 0);
    for (let i = 0; i < 4; i++) {
      c.glow.frame(0, 64, 0, (i * Math.PI) / 2, 1, () => c.glow.add(cylinderDisc(4.4, 6.25), '#fff8e0'));
    }
    hip(c.g, 12, 12, 16, '#3a3a44', 0, 70, 0);
    cyl(c.g, 0.3, 0.3, 6, '#e2b43a', 0, 86, 0, 5);
    o.colliders.push({ x: 0, z: 0, r: 8, h: 92 }, { x: -18, z: 14, r: 12, h: 14 }, { x: 18, z: 14, r: 12, h: 14 }, { x: 0, z: 14, r: 8, h: 14 });
    o.height = 92;
  },

  newyork(c, o) {
    const stone = '#c9c2b5';
    let y = 0, w = 40;
    for (let i = 0; i < 5; i++) {
      const h = 50 - i * 8;
      box(c.g, w, h, w, stone, 0, y, 0);
      for (let yy = y + 3; yy < y + h - 1; yy += 3.4) box(c.glow, w + 0.1, 0.7, w + 0.1, NY_WINDOW, 0, yy, 0);
      y += h;
      w *= 0.74;
    }
    for (let i = 0; i < 5; i++) {
      const r = w * 0.9 - i * 1.2;
      cyl(c.glow, r * 0.95, r, 3, '#fff0b0', 0, y + i * 3.2, 0, 8);
      cyl(c.g, r, r * 0.95, 0.4, '#d9d9e0', 0, y + i * 3.2 + 3, 0, 8);
    }
    cone(c.g, 2.4, 40, '#e0e0ea', 0, y + 16, 0, 8);
    o.colliders.push({ x: 0, z: 0, r: 25, h: y + 56 });
    o.height = y + 56;
  },

  renaissance(c, o) {
    const wall = '#f0dcb4', red = '#b5552e';
    box(c.g, 20, 22, 60, wall, 0, 0, 18);
    for (let i = 0; i < 8; i++) win(c, 10.02, 8, i * 7 - 4, 2, 5, Math.PI / 2, true);
    gable(c.g, 60, 22, 7, red, 0, 22, 18, Math.PI / 2);
    cyl(c.g, 14, 14, 16, wall, 0, 0, -16, 8);
    cyl(c.g, 12, 12, 10, wall, 0, 16, -16, 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      win(c, Math.sin(a) * 12.1, 18, -16 + Math.cos(a) * 12.1, 1.6, 4, a, true);
    }
    dome(c.g, 12, red, 0, 26, -16, 8, 1.3);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      c.g.frame(Math.sin(a) * 6, 26, -16 + Math.cos(a) * 6, a, 1, () => box(c.g, 0.6, 14, 0.6, '#fbf3e0', 0, 0, 5.4));
    }
    cyl(c.g, 2.2, 2.4, 5, '#fbf3e0', 0, 41, -16, 8);
    cone(c.g, 2.4, 3, red, 0, 46, -16, 8);
    sphere(c.g, 0.7, '#e2b43a', 0, 49.5, -16, 6);
    c.g.frame(26, 0, 30, 0, 1, () => {
      box(c.g, 8, 70, 8, wall);
      for (let y = 10; y < 66; y += 12) box(c.g, 8.4, 0.8, 8.4, '#fbf3e0', 0, y, 0);
      for (let i = 0; i < 4; i++) c.glow.frame(26, 60, 30, (i * Math.PI) / 2, 1, () => archPanel(c.glow, 2, 5, c.s.glow, 0, 0, 4.05));
      hip(c.g, 8.4, 8.4, 5, red, 0, 70, 0);
    });
    o.colliders.push({ x: 0, z: 18, r: 14, h: 29 }, { x: 0, z: 40, r: 11, h: 29 }, { x: 0, z: -16, r: 14.5, h: 50 }, { x: 26, z: 30, r: 5.6, h: 75 });
    o.height = 75;
  },

  vintage(c, o) {
    // Carousel.
    cyl(c.g, 10, 10.4, 1, '#f4f1de', 0, 0, 0, 20);
    cyl(c.g, 1.2, 1.2, 8, '#e2b43a', 0, 1, 0, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      cyl(c.g, 0.1, 0.1, 6, '#e2b43a', Math.cos(a) * 7, 1, Math.sin(a) * 7, 5);
    }
    cyl(c.g, 10.6, 10.6, 1, '#e07a5f', 0, 7, 0, 20);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      sphere(c.glow, 0.2, '#fff0b3', Math.cos(a) * 10.7, 7.5, Math.sin(a) * 10.7, 4);
    }
    cone(c.g, 11, 5, '#e07a5f', 0, 8, 0, 20);
    cone(c.g, 11.05, 1.6, '#ffffff', 0, 8, 0, 20);
    sphere(c.g, 0.8, '#e2b43a', 0, 13.3, 0, 8);
    // Bandstand.
    c.g.frame(30, 0, -18, 0, 1, () => {
      cyl(c.g, 6, 6.2, 1.2, '#ffffff', 0, 0, 0, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        cyl(c.g, 0.18, 0.18, 4, '#ffffff', Math.cos(a) * 5.4, 1.2, Math.sin(a) * 5.4, 6);
      }
      cone(c.g, 6.8, 3, '#5a8ab5', 0, 5.2, 0, 8);
    });
    o.colliders.push({ x: 0, z: 0, r: 10.5, h: 14 }, { x: 30, z: -18, r: 6.2, h: 8 });
    o.height = 14;
  },

  islamic(c, o) {
    const white = '#fbf7ee', blue = '#2f6f9a', gold = '#d4af37';
    // Courtyard walls with arcades.
    for (const [x, z, w, d] of [[0, 34, 70, 2], [-34, 12, 2, 46], [34, 12, 2, 46]] as const) {
      box(c.g, w, 7, d, white, x, 0, z);
    }
    for (let i = 0; i < 12; i++) archPanel(c.g, 3.4, 5.4, blue, -30 + i * 5.4, 0, 35.02, 0, 0.1, true);
    // Reflecting pool (as in the Court of the Myrtles): still water between marble kerbs, a
    // low fountain bubbling at each end.
    waterPool(c, 0, 0, 16, 11, 29, 0, { stone: '#e8dcc6', kerb: 0.5, speed: 0.06 });
    for (const z of [3, 29]) fountainJet(c, 0, 0.38, z, 0.7);
    // Prayer hall.
    box(c.g, 48, 14, 26, white, 0, 0, -12);
    for (let i = 0; i < 9; i++) archPanel(c.glow, 3, 7, c.s.glow, -20 + i * 5, 1, 1.02, 0, 0.08, true);
    box(c.g, 48.4, 1, 26.4, blue, 0, 14, -12);
    cyl(c.g, 11, 11, 5, white, 0, 15, -12, 16);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      win(c, Math.sin(a) * 11.05, 16, -12 + Math.cos(a) * 11.05, 1.2, 2.4, a, true);
    }
    onion(c.g, 11, blue, 0, 20, -12, gold);
    // Four minarets.
    for (const [x, z] of [[-30, -28], [30, -28], [-30, 32], [30, 32]] as const) {
      cyl(c.g, 1.6, 2, 40, white, x, 0, z, 8);
      cyl(c.g, 2.8, 2.4, 1.2, blue, x, 28, z, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        sphere(c.glow, 0.25, c.s.glow, x + Math.cos(a) * 2.7, 29.6, z + Math.sin(a) * 2.7, 4);
      }
      cyl(c.g, 1.3, 1.5, 6, white, x, 40, z, 8);
      cone(c.g, 1.6, 5, blue, x, 46, z, 8);
      cyl(c.g, 0.1, 0.1, 2, gold, x, 51, z, 4);
      o.colliders.push({ x, z, r: 2.4, h: 53 });
    }
    o.colliders.push({ x: -14, z: -12, r: 13, h: 15 }, { x: 14, z: -12, r: 13, h: 15 }, { x: 0, z: -12, r: 12, h: 42 });
    o.height = 53;
  },

  middleeast(c, o) {
    const mud = '#d9b98a';
    const walls: Array<[number, number, number, number]> = [[0, -26, 56, 3], [-26, 0, 3, 52], [26, 0, 3, 52], [-17, 26, 22, 3], [17, 26, 22, 3]];
    for (const [x, z, w, d] of walls) {
      box(c.g, w, 9, d, mud, x, 0, z);
      o.colliders.push({ x, z, r: Math.max(w, d) / 2 > 12 ? 3 : Math.max(w, d) / 2, h: 9 });
      const n = Math.floor(Math.max(w, d) / 2.4);
      for (let i = 0; i < n; i++) {
        const t = -Math.max(w, d) / 2 + 1.2 + i * 2.4;
        box(c.g, 1.2, 1, 1.2, mud, w > d ? x + t : x, 9, w > d ? z : z + t);
      }
    }
    // Long walls get a row of colliders.
    for (let t = -24; t <= 24; t += 6) o.colliders.push({ x: t, z: -26, r: 3.2, h: 9 }, { x: -26, z: t, r: 3.2, h: 9 }, { x: 26, z: t, r: 3.2, h: 9 });
    for (const [x, z] of [[-26, -26], [26, -26], [-26, 26], [26, 26]] as const) {
      cyl(c.g, 4.4, 5, 13, mud, x, 0, z, 12);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        box(c.g, 1, 1.2, 1, mud, x + Math.cos(a) * 4, 13, z + Math.sin(a) * 4);
      }
      o.colliders.push({ x, z, r: 5, h: 14 });
    }
    for (const [x, z] of [[-8, -8], [8, -12], [0, 10]] as const) {
      box(c.g, 4, 22, 4, mud, x, 0, z);
      for (let i = 0; i < 3; i++) box(c.g, 0.6, 5, 4.1, '#4a3426', x - 1.2 + i * 1.2, 15, z);
      o.colliders.push({ x, z, r: 2.8, h: 22 });
    }
    for (let i = 0; i < 16; i++) lanternHanging(c, -20 + (i % 8) * 5.6, 8 - Math.floor(i / 8) * 2, i < 8 ? 22 : -22);
    o.height = 22;
  },

  desert(c, o) {
    cyl(c.g, 22, 23, 0.4, '#d9c28f', 0, -0.2, 0, 20);
    cyl(c.g, 18, 18, 0.3, '#3aa0c0', 0, 0, 0, 20);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      tree(c.g, 'palm', Math.cos(a) * 22, 0, Math.sin(a) * 22, 1.2 + (i % 3) * 0.2, () => c.rng.next());
    }
    c.g.frame(0, 0, -40, 0, 1, () => {
      tent(c.g, 10, 9, '#2a2220', '#8c3b2a');
      box(c.g, 16, 0.05, 10, '#8c3b2a', 0, 0.05, 12);
      for (let i = 0; i < 8; i++) lanternHanging(c, -8 + i * 2.3, 5, 10);
    });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      cone(c.glow, 0.6, 1.3, '#ff8a2a', Math.cos(a) * 32, 0, Math.sin(a) * 32, 5);
    }
    o.colliders.push({ x: 0, z: -40, r: 9, h: 9 });
    o.height = 10;
  },

  egypt(c, o) {
    const stone = '#e0c48a';
    // The pyramids in the heart of the town (reserved.ts), in the quarters between the avenues:
    // true square pyramids with flat faces (so their stone courses run level), each set on the
    // lowest ground under it, a gilded capstone on top.
    const cc = regionCenter(c.s);
    for (const pyr of PYRAMIDS) {
      const half = pyr.s * 0.5, h = pyr.s * 0.64;
      let y = Infinity;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) y = Math.min(y, terrainHeight(cc.x + pyr.x + sx * half, cc.z + pyr.z + sz * half));
      c.g.add(pyramidGeometry(half, h), stone, M(pyr.x, y - 0.6, pyr.z));
      c.g.add(pyramidGeometry(half * 0.07, h * 0.07), '#d4af37', M(pyr.x, y - 0.6 + h * 0.93, pyr.z));
      o.colliders.push({ x: pyr.x, z: pyr.z, r: half * 0.95, h: y + h });
    }
    cone(c.g, 1.6, 26, '#d9b070', 0, 1, 26, 4);
    box(c.g, 3, 1, 3, '#c9a060', 0, 0, 26);
    for (let i = 0; i < 10; i++) {
      for (const x of [-8, 8]) {
        cyl(c.g, 1, 1.1, 10, '#d9b878', x, 0, 44 + i * 5, 10);
        cyl(c.g, 1.6, 1.1, 1.2, '#2f6f9a', x, 10, 44 + i * 5, 10);
        o.colliders.push({ x, z: 44 + i * 5, r: 1.3, h: 11 });
      }
    }
    o.colliders.push({ x: 0, z: 26, r: 2, h: 27 });
    o.height = 40;
  },

  indianorth(c, o) {
    const pink = '#e8917a', white = '#ffffff';
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const w = 60 - r * 5.2, y = r * 4.2;
      box(c.g, w, 4.2, 10 - r * 0.6, pink, 0, y, 0);
      const n = Math.floor(w / 3.4);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 1.7 + i * 3.4;
        box(c.g, 2.4, 3, 1.4, pink, x, y + 0.6, 5 - r * 0.3 + 0.6);
        box(c.glow, 1.2, 1.6, 0.1, c.s.glow, x, y + 1.2, 5 - r * 0.3 + 1.32);
        dome(c.g, 0.9, white, x, y + 3.6, 5 - r * 0.3 + 0.6, 6);
      }
    }
    chhatri(c, 0, rows * 4.2, 0, 2, pink, white);
    o.colliders.push({ x: -18, z: 0, r: 8, h: 20 }, { x: 0, z: 0, r: 8, h: 40 }, { x: 18, z: 0, r: 8, h: 20 }, { x: -26, z: 0, r: 5, h: 10 }, { x: 26, z: 0, r: 5, h: 10 });
    o.height = 44;
  },

  indiasouth(c, o) {
    const tiers = ['#e8a86a', '#2f7a5a', '#c23b2a', '#e2b43a', '#5a8ab5', '#e8a86a', '#c23b2a', '#2f7a5a', '#e2b43a'];
    box(c.g, 26, 8, 18, '#d9d0b8');
    archPanel(c.g, 5, 7, '#3a2a22', 0, 0, 9.01);
    let y = 8, w = 24, d = 16;
    for (const col of tiers) {
      box(c.g, w, 3.2, d, col, 0, y, 0);
      for (let i = 0; i < 5; i++) box(c.g, 1.4, 1.8, 0.6, i % 2 ? '#ffffff' : '#e2b43a', -w / 2 + w * (i + 0.5) / 5, y + 0.6, d / 2 + 0.3);
      y += 3.2;
      w *= 0.87;
      d *= 0.86;
    }
    c.g.frame(0, y, 0, 0, 1, () => {
      const barrel = cylinderBarrel(d * 0.6, w);
      c.g.add(barrel, '#e2b43a');
    });
    for (let i = 0; i < 5; i++) cone(c.g, 0.4, 2.2, '#e2b43a', -w / 2 + w * (i + 0.5) / 5, y + d * 0.55, 0, 6);
    // Temple tank: stone steps rising on all four sides to a kerbed pool of slowly turning water.
    c.g.frame(0, 0, 40, 0, 1, () => {
      for (let k = 0; k < 3; k++) {
        const outer = 13.6 - k * 0.8, inner = 10.4, hgt = 0.2 * (k + 1), wd = outer - inner;
        for (const sgn of [-1, 1]) {
          box(c.g, outer * 2, hgt, wd, '#c9bfa8', 0, 0, sgn * (inner + wd / 2));
          box(c.g, wd, hgt, inner * 2, '#c9bfa8', sgn * (inner + wd / 2), 0, 0);
        }
      }
    });
    waterPool(c, 0, 0, 40, 20, 20, 0, { stone: '#bdb39c', kerb: 0.75, speed: 0.1 });
    o.colliders.push({ x: 0, z: 0, r: 12, h: y + 4 });
    o.height = y + 6;
  },

  mughal(c, o) {
    const white = '#fbf7ee', red = '#b5552e';
    box(c.g, 70, 4, 70, '#f2eee4', 0, 0, -30);
    o.platforms.push({ x: 0, z: -30, r: 34, y: 4 });
    c.g.frame(0, 4, -30, 0, 1, () => c.glow.frame(0, 4, -30, 0, 1, () => {
      // The octagonal tomb, turned so a great arched face (the pishtaq) looks straight down the garden's
      // axis to the gate, as at the real Taj; each window sits in its arch.
      c.g.frame(0, 0, 0, Math.PI / 8, 1, () => c.glow.frame(0, 0, 0, Math.PI / 8, 1, () => {
        cyl(c.g, 17, 17, 22, white, 0, 0, 0, 8);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          archPanel(c.g, 8, 16, '#e8e2d4', Math.sin(a) * 15.8, 1, Math.cos(a) * 15.8, a, 0.2, true);
          archPanel(c.glow, 3.4, 6, c.s.glow, Math.sin(a) * 16, 3, Math.cos(a) * 16, a, 0.1, true);
        }
      }));
      cyl(c.g, 9, 9, 6, white, 0, 22, 0, 16);
      onion(c.g, 11, white, 0, 26, 0, '#d4af37');
      for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]] as const) chhatri(c, x, 22, z, 2.6, white, white);
      for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]] as const) {
        cyl(c.g, 1.4, 1.8, 30, white, x, 0, z, 8);
        for (const y of [10, 20]) cyl(c.g, 2.4, 2.2, 0.8, white, x, y, z, 8);
        chhatri(c, x, 30, z, 1.6, white, white);
        o.colliders.push({ x, z: z - 30, r: 2.2, h: 40 });
      }
    }));
    // Charbagh — the four-fold garden: a raised marble tank (al-Kawthar) where the axes cross, and
    // four channels flowing out from it between marble kerbs, the long one down to the gate lined
    // with fountain jets, as at the Taj.
    waterPool(c, 0, 0, 44, 11, 11, 0, { stone: white, kerb: 0.9, speed: 0.12, jets: 1, jetHeight: 2.4 });
    for (const [x, z, len, ry, jets] of [[0, 20.5, 36, 0, 3], [0, 68.5, 38, Math.PI, 3], [27, 44, 43, -Math.PI / 2, 0], [-27, 44, 43, Math.PI / 2, 0]] as const) {
      waterChannel(c, x, 0, z, len, 3.2, ry, { stone: white, flow: [0, -1], speed: 0.55, jets, jetHeight: 1.2 });
    }
    for (let i = 0; i < 12; i++) {
      const z = 4 + i * 7;
      if (Math.abs(z - 44) < 8) continue; // the central tank
      for (const x of [-5, 5]) tree(c.g, 'cypress', x, 0, z, 1.2, () => c.rng.next());
    }
    // Lamps floating on the long channel.
    for (const z of [12, 26, 58, 72]) sphere(c.glow, 0.3, '#fff0c0', 0, 0.55, z, 5);
    c.g.frame(0, 0, 96, 0, 1, () => {
      box(c.g, 34, 20, 10, red);
      archPanel(c.g, 10, 15, white, 0, 0, 5.02, 0, 0.15, true);
      archPanel(c.g, 8, 13, '#3a2a22', 0, 0, 5.1, 0, 0.1, true);
      for (const x of [-15, 15]) chhatri(c, x, 20, 0, 2, red, white);
    });
    o.colliders.push({ x: 0, z: -30, r: 18, h: 60 }, { x: -11, z: 96, r: 6, h: 20 }, { x: 11, z: 96, r: 6, h: 20 });
    o.height = 64;
  },

  indonesia(c, o) {
    const stone = '#8a8478';
    let y = 0, s = 64;
    for (let i = 0; i < 5; i++) {
      box(c.g, s, 3.4, s, stone, 0, y, 0);
      box(c.g, s + 0.6, 0.6, s + 0.6, '#9a948a', 0, y + 3.4, 0);
      y += 4;
      o.platforms.push({ x: 0, z: 0, r: s / 2 - 1, y });
      s -= 9;
    }
    for (let i = 0; i < 3; i++) {
      const r = s / 2 - i * 3.2;
      cyl(c.g, r, r + 0.4, 2.6, stone, 0, y, 0, 20);
      y += 2.6;
      o.platforms.push({ x: 0, z: 0, r: r - 0.5, y });
      const n = 8 + i * 4;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        dome(c.g, 1.1, '#9a948a', Math.cos(a) * (r - 1.4), y, Math.sin(a) * (r - 1.4), 8, 1.3);
        cone(c.g, 0.25, 1, '#9a948a', Math.cos(a) * (r - 1.4), y + 1.3, Math.sin(a) * (r - 1.4), 5);
      }
    }
    dome(c.g, 4.6, '#9a948a', 0, y, 0, 12, 1.2);
    cone(c.g, 0.8, 6, '#9a948a', 0, y + 5, 0, 6);
    // Stairs on each side as ramps of platforms.
    for (let i = 0; i < 8; i++) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const dist = 36 - i * 2.6;
      o.platforms.push({ x: dx * dist, z: dz * dist, r: 2.6, y: i * 2.5 });
    }
    o.height = y + 11;
  },

  aurora(c, o) {
    cyl(c.g, 9, 10, 10, '#e8eef5', 0, 0, 0, 16);
    dome(c.g, 9, '#c8d4e0', 0, 10, 0, 16);
    box(c.g, 2.4, 9, 9.4, '#3a4a5a', 0, 11, 0, 0);
    c.g.frame(0, 14, 0, 0, 1, () => c.g.add(cylinderBarrel(1.4, 12), '#6a7a8a', undefined));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      box(c.glow, 1.2, 2, 0.1, c.s.glow, Math.sin(a) * 9.6, 3, Math.cos(a) * 9.6, a);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      c.g.frame(Math.cos(a) * 28, 0, Math.sin(a) * 28, 0, 1, () => c.glow.frame(Math.cos(a) * 28, 0, Math.sin(a) * 28, 0, 1, () => {
        dome(c.g, 3, '#cfe8ff', 0, 0, 0, 14);
        sphere(c.glow, 1, c.s.glow, 0, 0.6, 0, 8, 0.6);
      }));
      o.colliders.push({ x: Math.cos(a) * 28, z: Math.sin(a) * 28, r: 3, h: 3 });
    }
    o.colliders.push({ x: 0, z: 0, r: 10, h: 19 });
    o.height = 19;
  },

  skyisles(c, o) {
    // Floating islands rising in a spiral to the Temple of the Great Lantern.
    for (let i = 0; i < 16; i++) {
      const a = i * 0.9, r = 70 - i * 3.2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 18 + i * 9;
      const size = i === 15 ? 26 : c.rng.range(9, 15);
      floatingIsland(c, x, y, z, size);
      o.platforms.push({ x, z, r: size - 0.8, y: y + 0.6 });
      if (i === 15) {
        c.g.frame(x, y + 0.6, z, 0, 1, () => c.glow.frame(x, y + 0.6, z, 0, 1, () => {
          for (let k = 0; k < 10; k++) {
            const b = (k / 10) * Math.PI * 2;
            cyl(c.g, 0.6, 0.7, 14, '#f4f0ff', Math.cos(b) * 12, 0, Math.sin(b) * 12, 8);
          }
          cyl(c.g, 13.5, 13.5, 1.2, '#fff4e0', 0, 14, 0, 20);
          dome(c.g, 12, '#b8a4ff', 0, 15, 0, 20, 0.7);
          sphere(c.glow, 3.4, '#fff0b0', 0, 6, 0, 12, 1.3);
          cyl(c.glow, 0.3, 0.3, 30, '#fff0b0', 0, 23, 0, 6);
        }));
        o.height = y + 60;
      }
    }
  },
};

export function floatingIsland(c: Ctx, x: number, y: number, z: number, size: number): void {
  c.g.frame(x, y, z, 0, 1, () => c.glow.frame(x, y, z, 0, 1, () => {
    const edgeAt = craggyIsland(c.g, c.glow, size, () => c.rng.next());
    // A crystal meadow on the lawn: clusters round the rim, clear of the middle where you land.
    const nc = size > 20 ? 14 : 8;
    for (let i = 0; i < nc; i++) {
      const a = (i / nc) * Math.PI * 2 + c.rng.range(-0.3, 0.3), r = edgeAt(a) * c.rng.range(0.7, 0.9);
      crystalCluster(c.g, c.glow, Math.cos(a) * r, 0.05, Math.sin(a) * r, c.rng.range(0.4, 1.3), () => c.rng.next());
    }
    // Trees well apart on the lawn.
    const n = size > 20 ? 0 : 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + c.rng.range(-0.4, 0.4), r = edgeAt(a) * c.rng.range(0.55, 0.7);
      tree(c.g, c.rng.chance(0.5) ? 'cloud' : 'crystal', Math.cos(a) * r, 0.1, Math.sin(a) * r, 0.9, () => c.rng.next());
    }
  }));
  // Most islands have a spring that spills over the edge in a long waterfall into the clouds.
  if (size < 20 && c.rng.chance(0.65)) {
    const a = c.rng.range(0, Math.PI * 2), r = size * 0.95;
    c.g.frame(x, y, z, 0, 1, () => {
      const edge = r * 0.92, ry = Math.atan2(Math.cos(a), Math.sin(a));
      waterPool(c, Math.cos(a) * edge * 0.55, 0, Math.sin(a) * edge * 0.55, 2.4, 2.4, ry, { kerb: 0.3, stone: '#e8e0ff' });
      waterfall(c, Math.cos(a) * edge, 0.02, Math.sin(a) * edge, ry, 1.8, size * 2.2, { mist: false });
    });
  }
}

// Tiny geometry helpers that need raw three.js.
/** A clock face: a disc facing +Z, pushed out to sit on a wall `out` metres from the centre. */
function cylinderDisc(r: number, out: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, 0.2, 16);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, out + 0.05);
  return g;
}
function cylinderBarrel(r: number, len: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, 10, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildLandmark(c: Ctx): LandmarkOut {
  const out: LandmarkOut = { colliders: [], platforms: [], height: 20 };
  // A monument rebuilt in full (monuments.ts) stands in place of its first draft and that draft's detail.
  const rebuilt = MONUMENTS[c.s.id];
  if (rebuilt) { rebuilt(c, out); return out; }
  landmarks[c.s.id](c, out);
  // The carved, painted and inlaid detail of each monument (landmarkDetail.ts).
  detailLandmark(c, c.s.id, out);
  return out;
}
