import * as THREE from 'three';
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
import type { RegionId, RegionSpec } from './regions';

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
}

export interface Footprint {
  /** Collision radius. */
  r: number;
  /** Height of the top, for flight clearance. */
  h: number;
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

function door(c: Ctx, w: number, d: number, arched = false, col = DOOR): void {
  if (arched) archPanel(c.g, 1.3, 2.3, col, 0, 0, d / 2 + 0.01, 0, 0.1, true);
  else box(c.g, 1.2, 2.1, 0.12, col, 0, 0, d / 2);
  void w;
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

const houses: Record<RegionId, HouseFn> = {
  meadow(c) {
    // Wanderers' Meadow: a storybook land. Five kinds of fantasy house.
    const k = c.rng.next();
    if (k < 0.18) return fairyKeep(c);
    if (k < 0.4) return fairyTower(c);
    if (k < 0.7) return storyCottage(c);
    if (k < 0.85) return toadstool(c);
    return wizardTower(c);
  },

  japan(c) {
    const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), wood = '#4a3426';
    const two = c.rng.chance(0.4);
    box(c.g, 7.4, 0.5, 6.4, '#8a8078');
    box(c.g, 6.6, 3, 5.6, wall, 0, 0.5, 0);
    for (const x of [-3.3, 0, 3.3]) box(c.g, 0.25, 3, 0.25, wood, x, 0.5, 2.8);
    box(c.g, 6.8, 0.25, 0.25, wood, 0, 3.3, 2.8);
    for (let i = 0; i < 3; i++) box(c.glow, 1.4, 1.8, 0.08, c.s.glow, -2.2 + i * 2.2, 0.9, 2.84);
    sweptRoof(c.g, 8.8, 7.8, 2.4, roof, 0, 3.5, 0);
    if (two) {
      box(c.g, 4.6, 2.2, 4, wall, 0, 4.6, 0);
      box(c.glow, 1.6, 1.2, 0.08, c.s.glow, 0, 5.2, 2.02);
      sweptRoof(c.g, 6.6, 5.8, 2, roof, 0, 6.7, 0);
    }
    if (c.rng.chance(0.4)) lanternHanging(c, 2.6, 3.3, 3.4, '#ffb070');
    return { r: 4.2, h: two ? 8.7 : 6 };
  },

  korea(c) {
    const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), wood = '#7a4a2a';
    box(c.g, 8, 0.9, 6, '#a8a098');
    box(c.g, 7, 2.8, 5, wall, 0, 0.9, 0);
    for (const x of [-3.5, -1.2, 1.2, 3.5]) box(c.g, 0.3, 2.8, 0.3, wood, x, 0.9, 2.5);
    box(c.g, 7.2, 0.3, 0.3, wood, 0, 3.4, 2.5);
    for (const x of [-2.35, 0, 2.35]) box(c.glow, 1.3, 1.5, 0.08, c.s.glow, x, 1.4, 2.54);
    sweptRoof(c.g, 10, 8, 2.6, roof, 0, 3.7, 0, 0, 0.5);
    return { r: 4.6, h: 6.3 };
  },

  china(c) {
    const roof = pick(c, c.s.roofs), red = '#b3262a';
    box(c.g, 8, 0.6, 7, '#cfc8b8');
    box(c.g, 6.6, 3.2, 5.6, '#f2e6cc', 0, 0.6, 0);
    for (const x of [-3.3, -1.1, 1.1, 3.3]) cyl(c.g, 0.2, 0.2, 3.2, red, x, 0.6, 3, 8);
    box(c.g, 7.2, 0.4, 0.4, red, 0, 3.6, 3);
    box(c.glow, 1.6, 2, 0.08, c.s.glow, -1.9, 1, 2.84);
    box(c.glow, 1.6, 2, 0.08, c.s.glow, 1.9, 1, 2.84);
    sweptRoof(c.g, 9.4, 8.2, 2.4, roof, 0, 3.8, 0, 0, 0.45);
    lanternHanging(c, -2.2, 3.6, 3.4, '#ff4a2a');
    lanternHanging(c, 2.2, 3.6, 3.4, '#ff4a2a');
    return { r: 4.4, h: 6.2 };
  },

  norway(c) {
    // Norwegian wood, after Bryggen.
    return compose(c, FACADES.norway, '#3a2a22');
  },

  switzerland(c) {
    // A Swiss chalet.
    return compose(c, FACADES.switzerland, '#5a3a26');
  },

  london(c) {
    // Georgian and Victorian terraces (docs/ARCHITECTURE_RESEARCH.md).
    return compose(c, FACADES.london, pick(c, ['#1f1f24', '#2f4a3a', '#7a1f24', '#1f2f5a']));
  },

  newyork(c) {
    // New Yonder: New York grown solarpunk. Four kinds of building, each after a real type.
    const k = c.rng.next();
    if (k < 0.3) return nyDecoTower(c);
    if (k < 0.55) return nyGlassTower(c);
    if (k < 0.8) return nyBrownstone(c);
    return nyLoft(c);
  },

  renaissance(c) {
    // An Italian palazzo.
    return compose(c, FACADES.renaissance, '#5a3a26');
  },

  vintage(c) {
    // A Queen Anne "Painted Lady".
    return compose(c, FACADES.vintage, pick(c, ['#5a8ab5', '#e07a5f', '#6ab58a', '#d9467a']));
  },

  islamic(c) {
    const wall = pick(c, c.s.walls), trim = pick(c, c.s.trims);
    const w = c.rng.range(7, 10), d = c.rng.range(7, 10), h = c.rng.range(4, 7);
    box(c.g, w, h, d, wall);
    box(c.g, w + 0.2, 0.5, d + 0.2, trim, 0, h, 0);
    archPanel(c.g, 1.6, 2.8, trim, 0, 0, d / 2 + 0.01, 0, 0.1, true);
    for (const x of [-w / 3, w / 3]) win(c, x, 1.4, d / 2 + 0.02, 0.9, 1.6, 0, true);
    box(c.g, 1.6, 1.2, 0.5, '#8a5a36', w / 3, h - 2.2, d / 2 + 0.2);
    if (c.rng.chance(0.4)) {
      cyl(c.g, 1.8, 1.8, 0.8, wall, 0, h + 0.5, 0, 12);
      dome(c.g, 1.8, pick(c, c.s.roofs), 0, h + 1.3, 0, 12);
    }
    if (c.rng.chance(0.5)) lanternHanging(c, -1.6, 2.8, d / 2 + 0.5);
    return { r: Math.max(w, d) / 2 + 0.5, h: h + 3 };
  },

  middleeast(c) {
    const wall = pick(c, c.s.walls);
    const w = c.rng.range(7, 10), d = c.rng.range(7, 10), h = c.rng.range(4.5, 7.5);
    box(c.g, w, h, d, wall);
    for (let i = 0; i < 5; i++) cyl(c.g, 0.1, 0.1, 0.8, '#6b4a2a', -w / 2 + 1 + i * (w - 2) / 4, h - 0.8, d / 2 + 0.3, 4);
    box(c.g, w + 0.2, 0.5, d + 0.2, wall, 0, h, 0);
    if (c.rng.chance(0.6)) {
      box(c.g, 2.2, 5, 2.2, wall, w / 2 - 1.4, h, -d / 2 + 1.4);
      for (let i = 0; i < 2; i++) box(c.g, 0.4, 2.6, 2.3, '#4a3426', w / 2 - 1.9 + i * 1, h + 1.8, -d / 2 + 1.4);
    }
    archPanel(c.g, 1.4, 2.5, '#6b4a2a', 0, 0, d / 2 + 0.01);
    win(c, -w / 3, 2.4, d / 2 + 0.02, 0.7, 1);
    win(c, w / 3, 2.4, d / 2 + 0.02, 0.7, 1);
    if (c.rng.chance(0.5)) {
      box(c.g, 4, 0.1, 2.4, pick(c, ['#c23b2a', '#2f6f9a', '#e2b43a']), 0, 2.9, d / 2 + 1.2);
      lanternHanging(c, 1.4, 2.9, d / 2 + 2.2);
    }
    return { r: Math.max(w, d) / 2 + 0.6, h: h + 5 };
  },

  desert(c) {
    const a = pick(c, c.s.roofs), b = pick(c, ['#f1d3a2', '#8c3b2a', '#d9a066']);
    if (c.rng.chance(0.5)) {
      box(c.g, 7, 0.02, 5, pick(c, ['#8c3b2a', '#2f6f9a', '#d9a066']), 0, 0.02, 3);
      gable(c.g, 7, 6, 3, a, 0, 0, 0);
      box(c.g, 7.2, 0.3, 0.3, b, 0, 1.2, 0);
    } else {
      tent(c.g, 3.4, 4.2, a, b);
    }
    // campfire
    cone(c.glow, 0.45, 0.9, '#ff8a2a', 3.8, 0.1, 3.8, 5);
    for (let i = 0; i < 6; i++) sphere(c.g, 0.2, '#6b6b6b', 3.8 + Math.cos(i) * 0.7, 0, 3.8 + Math.sin(i) * 0.7, 4);
    return { r: 3.8, h: 4.3 };
  },

  egypt(c) {
    const wall = pick(c, c.s.walls);
    const w = c.rng.range(6, 9), d = c.rng.range(6, 9), h = c.rng.range(3.5, 6.5);
    box(c.g, w, h, d, wall);
    box(c.g, w + 0.3, 0.4, d + 0.3, '#c9a86a', 0, h, 0);
    box(c.g, 1.2, 2.2, 0.12, pick(c, ['#2f6f9a', '#6b4a2a']), 0, 0, d / 2);
    win(c, -w / 3, 2, d / 2 + 0.02, 0.6, 0.8);
    win(c, w / 3, 2, d / 2 + 0.02, 0.6, 0.8);
    if (c.rng.chance(0.3)) {
      cone(c.g, 1.4, 4, '#e8d6b0', -w / 4, h, -d / 4, 10);
    }
    return { r: Math.max(w, d) / 2 + 0.5, h: h + 1 };
  },

  indianorth(c) {
    const wall = pick(c, c.s.walls), trim = '#ffffff';
    const floors = c.rng.int(2, 3), fh = 3.2, w = 9, d = 8;
    box(c.g, w, floors * fh, d, wall);
    for (let f = 1; f <= floors; f++) box(c.g, w + 0.2, 0.25, d + 0.2, trim, 0, f * fh - 0.1, 0);
    for (let f = 0; f < floors; f++) for (let i = 0; i < 3; i++) win(c, -3 + i * 3, 0.8 + f * fh, d / 2 + 0.02, 0.9, 1.4, 0, true);
    // jharokha balcony
    box(c.g, 2.4, 1.6, 1.2, wall, 0, fh + 0.4, d / 2 + 0.6);
    onion(c.g, 0.9, trim, 0, fh + 2, d / 2 + 0.6);
    chhatri(c, w / 2 - 1.2, floors * fh, -d / 2 + 1.2, 1.1, wall, trim);
    archPanel(c.g, 1.5, 2.6, '#6b3a2a', 0, 0, d / 2 + 0.01, 0, 0.1, true);
    return { r: 6, h: floors * fh + 2.8 };
  },

  indiasouth(c) {
    const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
    box(c.g, 9, 0.6, 8, '#b5a58a');
    box(c.g, 7, 3, 6, wall, 0, 0.6, 0);
    for (const x of [-4, -1.3, 1.3, 4]) cyl(c.g, 0.18, 0.18, 2.6, '#6b4a2a', x, 0.6, 3.6, 6);
    hip(c.g, 11, 10, 3.6, roof, 0, 3.2, 0);
    hip(c.g, 5, 4, 1.8, roof, 0, 5.6, 0);
    door(c, 7, 6);
    win(c, -2.2, 1.6, 3.02);
    win(c, 2.2, 1.6, 3.02);
    for (let i = 0; i < 7; i++) sphere(c.g, 0.12, i % 2 ? '#ffffff' : '#f2a13a', -3 + i, 0.62, 4.3, 4);
    return { r: 5.4, h: 7.4 };
  },

  mughal(c) {
    const red = '#b5552e', white = '#fbf7ee';
    const w = 9, d = 8, h = c.rng.range(5, 7);
    box(c.g, w, h, d, red);
    box(c.g, w + 0.2, 0.3, d + 0.2, white, 0, h, 0);
    box(c.g, w + 0.2, 0.2, d + 0.2, white, 0, h * 0.5, 0);
    archPanel(c.g, 2.4, 3.6, white, 0, 0, d / 2 + 0.01, 0, 0.1, true);
    archPanel(c.g, 1.8, 3.1, '#5a2a1a', 0, 0, d / 2 + 0.06, 0, 0.1, true);
    for (const x of [-3, 3]) win(c, x, 1.4, d / 2 + 0.02, 1, 1.6, 0, true);
    chhatri(c, -w / 2 + 1.1, h, -d / 2 + 1.1, 1, white, white);
    chhatri(c, w / 2 - 1.1, h, -d / 2 + 1.1, 1, white, white);
    return { r: 6, h: h + 3 };
  },

  indonesia(c) {
    const wood = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
    for (const x of [-3.5, 0, 3.5]) for (const z of [-2.2, 2.2]) cyl(c.g, 0.2, 0.2, 1.6, '#5a3a26', x, 0, z, 6);
    box(c.g, 9, 3, 6, wood, 0, 1.6, 0);
    for (let i = 0; i < 6; i++) box(c.g, 1.2, 0.3, 0.08, pick(c, c.s.trims), -3.6 + i * 1.44, 3.6, 3.02);
    gable(c.g, 8, 8, 4, roof, 0, 4.6, 0);
    // The horned ridge: each end sweeps up and out.
    for (const s of [-1, 1]) {
      const g2 = c.g;
      g2.frame(s * 4.4, 7.4, 0, 0, 1, () => {
        cone(g2, 1.1, 5.2, roof, 0, 0, 0, 6);
      });
    }
    box(c.glow, 1, 1.2, 0.08, c.s.glow, -2, 2.4, 3.02);
    box(c.glow, 1, 1.2, 0.08, c.s.glow, 2, 2.4, 3.02);
    box(c.g, 1.2, 2, 0.1, DOOR, 0, 1.6, 3.02);
    box(c.g, 1.4, 0.2, 2, '#6b4a2a', 0, 0.8, 3.9);
    return { r: 5.4, h: 12 };
  },

  aurora(c) {
    if (c.rng.chance(0.45)) {
      // Glass igloo: a clear dome with a warm glow inside.
      box(c.g, 5.4, 0.3, 5.4, '#8a5a3c');
      dome(c.g, 2.7, '#cfe8ff', 0, 0.3, 0, 14);
      sphere(c.glow, 0.9, c.s.glow, 0, 0.8, 0, 8, 0.6);
      return { r: 3, h: 3 };
    }
    const wood = pick(c, c.s.walls);
    gable(c.g, 7, 7, 6.4, wood, 0, 0, 0, Math.PI / 2);
    gable(c.g, 7.4, 7.8, 6.9, '#f4f8ff', 0, 0.2, 0, Math.PI / 2);
    box(c.glow, 2.4, 3.4, 0.1, c.s.glow, 0, 0.4, 3.55);
    box(c.g, 0.6, 1.4, 0.6, '#6b6b6b', 1.8, 4, -1);
    return { r: 4, h: 7 };
  },

  skyisles(c) {
    const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cyl(c.g, 0.25, 0.25, 4, wall, Math.cos(a) * 3, 0, Math.sin(a) * 3, 6);
    }
    cyl(c.g, 3.6, 3.6, 0.4, wall, 0, 0, 0, 12);
    cyl(c.g, 3.6, 3.6, 0.4, wall, 0, 4, 0, 12);
    dome(c.g, 3.4, roof, 0, 4.4, 0, 12, 0.8);
    sphere(c.glow, 0.8, c.s.glow, 0, 2, 0, 8);
    return { r: 3.8, h: 7.2 };
  },
};


/* ------------------------------------------------------------------------------------------------
 * New Yonder: cyber-solarpunk New York. Limestone, brownstone, brick, steel and glass (their wall
 * colours carry those surfaces), dressed with the things a green city of the future would add:
 * solar skins and crowns, vertical gardens, sky gardens with real trees, wind turbines, neon.
 * --------------------------------------------------------------------------------------------- */
const NY = { limestone: '#b8b2a6', brownstone: '#8a7a6a', steel: '#c9c2b5', glass: '#6a7a8a', brick: '#a0522d' };
const NEON = ['#3ae8ff', '#ff3ad8', '#7aff9a', '#ffd23a'];
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
  for (const [x, z] of [[-w / 3, -d / 3], [w / 3, -d / 3], [0, d / 4]]) turbine(c, x, h + 0.6, z, 5);
  greenWall(c, w * 0.8, d / 2, 0.5, 14);
  // A holographic billboard on the corner.
  box(c.glow, 0.1, 8, 6, c.rng.pick(NEON), w / 2 + 0.3, h * 0.35, d / 4);
  return { r: Math.max(w, d) * 0.62, h: h + 6 };
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

/** A round turret: stone drum, a tall cone roof and a pennant on top. */
function turret(c: Ctx, x: number, z: number, r: number, h: number, y = 0): void {
  const wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs);
  cyl(c.g, r, r * 1.04, h, wall, x, y, z, 12);
  cone(c.g, r * 1.3, r * 2.6, roof, x, y + h, z, 12);
  cyl(c.g, 0.04, 0.04, 1.4, '#6b5a4a', x, y + h + r * 2.6 - 0.2, z, 4);
  box(c.g, 0.9, 0.35, 0.03, pick(c, PENNANTS), x + 0.45, y + h + r * 2.6 + 0.8, z);
  win(c, x, y + h * 0.55, z + r + 0.02, 0.5, 0.9, 0, true);
}

/** A crenellated parapet round a w × d top at height y. */
function battlements(c: Ctx, w: number, d: number, y: number, col: string): void {
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.2) for (const z of [-d / 2, d / 2]) box(c.g, 0.6, 0.7, 0.5, col, x, y, z);
  for (let z = -d / 2 + 1.2; z < d / 2; z += 1.2) for (const x of [-w / 2, w / 2]) box(c.g, 0.5, 0.7, 0.6, col, x, y, z);
}

/** A little castle keep: battlements, four corner turrets with banners, an arched gate. */
function fairyKeep(c: Ctx): Footprint {
  const w = 8, d = 8, h = 7, wall = pick(c, c.s.walls);
  box(c.g, w, h, d, wall);
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
  cyl(c.g, r, r * 1.06, h, wall, 0, 0, 0, 16);
  box(c.g, r * 2.3, 0.35, 0.35, '#e8e0cc', 0, h - 0.4, r - 0.1);
  cone(c.g, r * 1.3, r * 2.8, roof, 0, h, 0, 16);
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
  const w = 7, d = 6, h = 3.4, wall = pick(c, c.s.walls), roof = pick(c, c.s.roofs), timber = '#5a4030';
  box(c.g, w, h, d, wall);
  // Half-timbering on the front.
  for (const x of [-w / 2 + 0.1, -1.2, 1.2, w / 2 - 0.1]) box(c.g, 0.2, h, 0.08, timber, x, 0, d / 2 + 0.03);
  box(c.g, w, 0.2, 0.08, timber, 0, h * 0.55, d / 2 + 0.03);
  for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.16, 2.2, 0.08).translate(0, 1.1, 0), timber, M(s * 2.4, h * 0.55, d / 2 + 0.04, 0, 1, 1, 1, 0, s * 0.6));
  gable(c.g, w + 1.2, d + 1.2, 3.8, roof, 0, h, 0);
  // A dormer with its own little roof.
  box(c.g, 1.6, 1.3, 1.4, wall, 1.4, h + 0.9, d / 2 - 0.4);
  gable(c.g, 2, 1.8, 0.9, roof, 1.4, h + 2.2, d / 2 - 0.4, Math.PI / 2);
  win(c, 1.4, h + 1.1, d / 2 + 0.32, 0.7, 0.7);
  // A crooked chimney.
  for (let i = 0; i < 4; i++) box(c.g, 0.8, 0.9, 0.8, '#b5654a', -1.8 + i * 0.12, h + 1.4 + i * 0.9, -0.8);
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
  cyl(c.g, r, r * 1.15, h, '#f4ecd8', 0, 0, 0, 14);
  dome(c.g, r * 2, cap, 0, h - 0.3, 0, 16, 0.75);
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
  cyl(c.g, r * 0.9, r * 1.2, h, wall, 0, 0, 0, 14);
  for (let y = 2.5; y < h; y += 3) box(c.g, r * 2.2, 0.25, 0.25, '#e8e0cc', 0, y, r * 0.95);
  // A pointed hat, a little bent.
  cone(c.g, r * 1.6, 3, '#4a3a8a', 0, h, 0, 14);
  c.g.add(new THREE.ConeGeometry(r * 0.7, 3, 12).translate(0, 1.5, 0), '#4a3a8a', M(0.2, h + 2.8, 0, 0, 1, 1, 1, 0, -0.35));
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
  const fp = buildTradition(c) ?? houses[c.s.id](c);
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
        cyl(c.g, 2.4, 2.6, 0.7, stone, 0, 0, 0, id === 'islamic' ? 8 : 14);
        cyl(c.g, 2.1, 2.1, 0.1, '#5ab4e0', 0, 0.62, 0, 14);
        cyl(c.g, 0.3, 0.4, 1.6, stone, 0, 0, 0, 8);
        cyl(c.g, 0.9, 0.5, 0.3, stone, 0, 1.6, 0, 10);
        sphere(c.glow, 0.2, '#bfe8ff', 0, 2, 0, 5);
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
        box(c.g, 1.6, 0.9, 1.6, '#a8703f');
        cyl(c.g, 0.7, 0.7, 0.1, '#5ab4e0', 0, 0.9, 0, 10);
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
  colliders: Array<{ x: number; z: number; r: number; h: number }>;
  platforms: Array<{ x: number; z: number; r: number; y: number }>;
  /** Height of the landmark, for the map and far-view. */
  height: number;
}

type LandmarkFn = (c: Ctx, out: LandmarkOut) => void;

function pagoda(c: Ctx, tiers: number, base: number, roofCol: string, bodyCol: string): number {
  const stone = '#a9a39a', timber = '#4a2923', vermilion = '#ad3027', bronze = '#bd9a50';
  box(c.g, base + 4, 0.9, base + 4, stone);
  // Broad stone steps keep the south (+z) entrance readable.
  for (let i = 0; i < 3; i++) box(c.g, 3.4 + i * 0.5, 0.3 * (3 - i), 1.1, stone, 0, 0, base / 2 + 1 + i * 0.95);
  let y = 0.9;
  for (let i = 0; i < tiers; i++) {
    const s = base * (1 - i * 0.11), floorH = 4.6;
    box(c.g, s, floorH, s, bodyCol, 0, y, 0);
    // Visible posts, lintels and bracket blocks support each deep swept roof.
    for (const side of [-1, 1]) for (const x of [-s * 0.38, 0, s * 0.38]) {
      box(c.g, 0.22, floorH - 0.25, 0.25, vermilion, x, y, side * s / 2);
      box(c.g, 0.85, 0.24, 0.7, timber, x, y + floorH - 0.65, side * (s / 2 + 0.3));
      box(c.g, 0.55, 0.24, 1.05, bronze, x, y + floorH - 0.36, side * (s / 2 + 0.48));
    }
    for (const side of [-1, 1]) for (const z of [-s * 0.38, s * 0.38]) {
      box(c.g, 0.25, floorH - 0.25, 0.22, vermilion, side * s / 2, y, z);
      box(c.g, 0.7, 0.24, 0.85, timber, side * (s / 2 + 0.3), y + floorH - 0.65, z);
    }
    for (const side of [-1, 1]) {
      box(c.g, s + 0.7, 0.16, 0.16, timber, 0, y + 3.03, side * (s / 2 + 0.35));
      for (let k = -2; k <= 2; k++) box(c.g, 0.1, 0.65, 0.1, timber, k * s * 0.18, y + 3.03, side * (s / 2 + 0.35));
      box(c.glow, s * 0.32, 0.85, 0.07, c.s.glow, 0, y + 1.55, side * (s / 2 + 0.04));
    }
    sweptRoof(c.g, s + 4.2, s + 4.2, 1.65, roofCol, 0, y + floorH - 0.2, 0, 0, 0.52);
    box(c.g, s + 3.6, 0.14, s + 3.6, '#26242b', 0, y + floorH - 0.16, 0);
    y += floorH + 0.72;
  }
  // Bronze sorin with the traditional nine rings above the fifth roof.
  cyl(c.g, 0.13, 0.17, 5.8, bronze, 0, y - 0.2, 0, 8);
  for (let i = 0; i < 9; i++) cyl(c.g, 0.45 - i * 0.025, 0.45 - i * 0.025, 0.12, bronze, 0, y + 0.35 + i * 0.47, 0, 10);
  sphere(c.g, 0.28, bronze, 0, y + 5.65, 0, 8);
  return y + 5.95;
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
    c.g.frame(-26, 0, -14, 0.4, 1, () => {
      cyl(c.g, 2.4, 3.4, 12, '#fff4e0', 0, 0, 0, 8);
      cone(c.g, 3, 3, '#e07a5f', 0, 12, 0, 8);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.BoxGeometry(1.1, 8, 0.15);
        blade.translate(0, 4.2, 0);
        c.g.add(blade, '#f4ead8', M(0, 11, 3.5, 0, 1, 1, 1, 0, (i * Math.PI) / 2 + 0.4));
      }
      box(c.glow, 1, 1.4, 0.1, c.s.glow, 0, 5, 3.25);
    });
    o.colliders.push({ x: 0, z: 0, r: 3.6, h: 32 }, { x: 18, z: 6, r: 2, h: 3 }, { x: -26, z: -14, r: 3.4, h: 15 });
    o.height = 32;
  },

  japan(c, o) {
    o.height = pagoda(c, 5, 8, '#363a44', '#855036');
    // Entrance frame and timber door sit beneath the first roof.
    box(c.g, 2.5, 3.2, 0.16, '#3d2623', 0, 0.9, 4.08);
    box(c.g, 0.13, 3.3, 0.2, '#bd9a50', -1.3, 0.9, 4.16);
    box(c.g, 0.13, 3.3, 0.2, '#bd9a50', 1.3, 0.9, 4.16);
    box(c.g, 2.8, 0.2, 0.2, '#bd9a50', 0, 4.1, 4.16);
    // Torii on the approach: its open centre preserves the path to the door.
    for (const x of [-4.2, 4.2]) {
      cyl(c.g, 0.33, 0.42, 7.4, '#b53228', x, 0, 25, 10);
      cyl(c.g, 0.5, 0.5, 0.35, '#77716c', x, 0, 25, 10);
      o.colliders.push({ x, z: 25, r: 0.5, h: 7.4 });
    }
    box(c.g, 10.4, 0.44, 0.55, '#b53228', 0, 5.8, 25);
    box(c.g, 12, 0.5, 0.7, '#282932', 0, 7.1, 25);
    for (const x of [-3.2, 3.2]) box(c.g, 0.17, 0.95, 0.2, '#b53228', x, 6.1, 25);
    // Stone toro lanterns flank the approach with small night light panels.
    for (const z of [10, 18, 30]) for (const x of [-7.5, 7.5]) {
      cyl(c.g, 0.55, 0.75, 0.45, '#99948b', x, 0, z, 8);
      cyl(c.g, 0.2, 0.25, 1.55, '#aaa49a', x, 0.45, z, 8);
      box(c.g, 1.2, 0.22, 1.2, '#99948b', x, 2, z);
      box(c.g, 0.9, 0.76, 0.9, '#77736d', x, 2.2, z);
      for (const face of [-1, 1]) box(c.glow, 0.48, 0.42, 0.05, '#f5cb7a', x, 2.36, z + face * 0.47);
      hip(c.g, 1.65, 1.65, 0.55, '#68666b', x, 3, z);
      o.colliders.push({ x, z, r: 0.8, h: 3.6 });
    }
    o.colliders.push({ x: 0, z: 0, r: 8.6, h: o.height });
    o.platforms.push({ x: 0, z: 7.4, r: 1.5, y: 0.3 });
  },

  korea(c, o) {
    const granite = '#aba9a3', red = '#ae342c', green = '#315d50', blue = '#326376', gold = '#d5b26c';
    // Geunjeongjeon rises on a two-level granite terrace, with an open central stair.
    box(c.g, 36, 1.15, 25, granite, 0, 0, 0);
    box(c.g, 32, 1.15, 22, '#c3bfb5', 0, 1.15, 0);
    for (let i = 0; i < 6; i++) box(c.g, 5.6, 0.36, 2.1, granite, 0, i * 0.36, 13.7 + i * 1.3);
    box(c.g, 1.15, 2.25, 7.4, '#c6c0b2', 0, 0, 16.6);
    for (const z of [-11, 11]) for (let x = -15; x <= 15; x += 3) {
      if (z > 0 && Math.abs(x) < 4) continue;
      box(c.g, 0.45, 1.1, 0.45, granite, x, 2.3, z);
      box(c.g, 3.1, 0.17, 0.23, granite, x + 1.5, 3.05, z);
    }
    // Five bays across the front and three down each side, with painted beams.
    box(c.g, 29, 0.6, 18, '#715344', 0, 2.3, -0.5);
    for (const z of [-8, 0, 7]) for (const x of [-13, -6.5, 0, 6.5, 13]) {
      cyl(c.g, 0.38, 0.42, 8, red, x, 2.9, z, 10);
      cyl(c.g, 0.52, 0.52, 0.22, granite, x, 2.9, z, 10);
      box(c.g, 1.4, 0.32, 1.1, green, x, 10.3, z);
      box(c.g, 1.1, 0.2, 1.5, blue, x, 10.55, z);
      box(c.g, 0.9, 0.15, 1.8, gold, x, 10.75, z);
    }
    box(c.g, 28, 0.46, 17, green, 0, 10.9, -0.5);
    for (const z of [-7.9, 7.1]) for (let x = -12; x <= 12; x += 3) {
      box(c.g, 0.23, 5.8, 0.25, red, x, 4.6, z);
      if (Math.abs(x) > 2 || z < 0) box(c.glow, 1.5, 2.5, 0.06, c.s.glow, x + 1.3, 6.1, z + (z > 0 ? 0.11 : -0.11));
    }
    sweptRoof(c.g, 39, 27, 3.4, '#333c42', 0, 11.4, -0.5, 0, 0.55);
    box(c.g, 19, 4.2, 11, red, 0, 14.8, -0.5);
    for (const x of [-8, 0, 8]) {
      box(c.g, 0.3, 3.6, 0.4, green, x, 15, 5.1);
      box(c.g, 2.2, 0.25, 1, blue, x, 17.9, 5.3);
    }
    sweptRoof(c.g, 27, 18, 3.4, '#313b43', 0, 19, -0.5, 0, 0.58);
    // Court wall and gate are split so the +z approach remains open.
    for (const x of [-24, 24]) box(c.g, 0.9, 4.2, 45, granite, x, 0, 12);
    for (const x of [-14, 14]) box(c.g, 20, 4.2, 0.9, granite, x, 0, 34);
    for (const x of [-4.5, 4.5]) cyl(c.g, 0.35, 0.4, 5.6, red, x, 0, 34, 8);
    sweptRoof(c.g, 13, 6, 2, '#313b43', 0, 5.6, 34, 0, 0.55);
    for (const x of [-16, 16]) for (const z of [8, 21]) {
      cyl(c.g, 0.35, 0.44, 1.6, granite, x, 2.3, z, 8);
      box(c.glow, 0.48, 0.65, 0.48, '#f0d79b', x, 3.95, z);
      hip(c.g, 1.1, 1.1, 0.6, '#45494b', x, 4.6, z);
      o.colliders.push({ x, z, r: 0.7, h: 5.2 });
    }
    o.colliders.push({ x: -10, z: -1, r: 8.8, h: 24 }, { x: 10, z: -1, r: 8.8, h: 24 });
    o.platforms.push({ x: 0, z: 0, r: 11, y: 2.3 });
    o.height = 24;
  },

  china(c, o) {
    const marble = '#eee9dc', red = '#ac292b', blue = '#28529b', gold = '#d7b044';
    let y = 0;
    for (const r of [20, 17, 14]) {
      cyl(c.g, r, r + 0.25, 1.25, marble, 0, y, 0, 24);
      y += 1.25;
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12, px = Math.cos(a) * (r - 0.25), pz = Math.sin(a) * (r - 0.25);
        if (pz > r * 0.76 && Math.abs(px) < 3.2) continue;
        cyl(c.g, 0.18, 0.2, 0.9, marble, px, y, pz, 6);
        sphere(c.g, 0.23, marble, px, y + 0.95, pz, 6);
      }
    }
    for (let i = 0; i < 6; i++) box(c.g, 5, 0.25, 1.7, marble, 0, i * 0.25, 21 + i * 1.15);
    o.platforms.push({ x: 0, z: 0, r: 13, y });
    // Circular prayer hall: red lacquer columns, dougong and three blue tile roofs.
    cyl(c.g, 9.8, 10.3, 10.5, '#b93630', 0, y, 0, 20);
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, x = Math.cos(a) * 9.4, z = Math.sin(a) * 9.4;
      cyl(c.g, 0.34, 0.37, 10.2, red, x, y, z, 8);
      box(c.g, 1.5, 0.3, 1.5, '#2c726f', x, y + 9.2, z, a);
      box(c.g, 1.2, 0.26, 2, gold, x, y + 9.55, z, a);
      if (i % 2 === 0) sphere(c.glow, 0.3, '#e9bd64', x * 1.08, y + 8.1, z * 1.08, 6);
    }
    for (const h of [y + 2.2, y + 5.4]) cyl(c.g, 10.1, 10.1, 0.2, gold, 0, h, 0, 20);
    y += 10.5;
    for (let i = 0; i < 3; i++) {
      const r = 12 - i * 2.2;
      cone(c.g, r, 5.2, blue, 0, y - 0.8, 0, 20);
      cyl(c.g, r, r, 0.25, gold, 0, y - 0.3, 0, 20);
      y += 6;
      if (i < 2) {
        cyl(c.g, r - 2.2, r - 2.2, 2.3, red, 0, y - 1, 0, 20);
        for (let k = 0; k < 12; k++) {
          const a = k * Math.PI / 6;
          box(c.glow, 1.15, 1.3, 0.08, c.s.glow, Math.cos(a) * (r - 2), y - 0.25, Math.sin(a) * (r - 2), a);
        }
      }
    }
    cyl(c.g, 0.22, 0.28, 3.2, gold, 0, y - 0.7, 0, 8);
    sphere(c.g, 0.55, gold, 0, y + 2.1, 0, 8);
    o.colliders.push({ x: 0, z: 0, r: 10.8, h: y + 3 });
    o.height = y + 3;
  },

  norway(c, o) {
    const wood = '#342a25', tar = '#211d1b', trim = '#7b6248';
    // Borgund's open ambulatory wraps a timber nave below nested shingle roofs.
    box(c.g, 18, 0.65, 22, '#807a70');
    box(c.g, 11, 7.5, 15, wood, 0, 0.65, -1);
    for (const x of [-8, 8]) for (const z of [-10, -5, 0, 5, 10]) {
      cyl(c.g, 0.28, 0.35, 4.1, trim, x, 0.65, z, 7);
      box(c.g, 0.8, 0.34, 0.9, wood, x, 4.45, z);
    }
    for (const z of [-10, 10]) for (const x of [-8, -4, 0, 4, 8]) {
      if (z > 0 && Math.abs(x) < 3) continue;
      cyl(c.g, 0.28, 0.35, 4.1, trim, x, 0.65, z, 7);
      box(c.glow, 0.4, 0.8, 0.08, '#eac77f', x, 2.2, z + (z > 0 ? 0.4 : -0.4));
    }
    archPanel(c.g, 2.6, 3.5, '#181513', 0, 0.65, 6.55, 0, 0.15, true);
    let y = 4.8;
    for (let i = 0; i < 5; i++) {
      const w = 21 - i * 3.3, d = 25 - i * 3.9;
      gable(c.g, w, d, 3.6 - i * 0.35, tar, 0, y, -1);
      box(c.g, w * 0.52, 1.7, d * 0.53, wood, 0, y + 1.4, -1);
      for (const x of [-w * 0.45, w * 0.45]) {
        cone(c.g, 0.55, 1.5, tar, x, y + 1.2, 0, 5);
        box(c.g, 0.12, 1.3, 0.12, trim, x, y + 2.1, 0);
      }
      y += 2.75;
    }
    // Small bell cage and pointed cap at the ridge.
    for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) cyl(c.g, 0.17, 0.2, 2.1, wood, x, y, z, 6);
    sphere(c.g, 0.65, '#b79755', 0, y + 0.7, 0, 8);
    cone(c.g, 2.4, 3.5, tar, 0, y + 2.1, 0, 8);
    o.colliders.push({ x: 0, z: -1, r: 10.5, h: y + 5.6 });
    o.height = y + 5.6;
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
      sphere(c.g, 0.7, i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffc4dc' : '#bfe3d9', Math.cos(a) * 7, 3, Math.sin(a) * 7, 6, 0.7);
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
    // Reflecting pool.
    box(c.g, 12, 0.5, 30, '#3a9a9a', 0, 0, 16);
    box(c.g, 11, 0.1, 29, '#7fd0e8', 0, 0.5, 16);
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
    for (const [x, z, s] of [[0, -60, 60], [70, -30, 44], [-60, -50, 34]] as const) {
      const g = c.g;
      g.frame(x, 0, z, Math.PI / 4, 1, () => cone(g, s * 0.72, s * 0.64, stone, 0, 0, 0, 4));
      o.colliders.push({ x, z, r: s * 0.46, h: s * 0.64 });
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
    box(c.g, 24, 0.12, 700, '#3a9ac0', -140, 0.1, 0);
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
    // Temple tank.
    c.g.frame(0, 0, 40, 0, 1, () => {
      box(c.g, 24, 0.6, 24, '#c9bfa8');
      box(c.g, 20, 0.2, 20, '#3a9ac0', 0, 0.5, 0);
    });
    o.colliders.push({ x: 0, z: 0, r: 12, h: y + 4 });
    o.height = y + 6;
  },

  mughal(c, o) {
    const white = '#fbf7ee', red = '#b5552e';
    box(c.g, 70, 4, 70, '#f2eee4', 0, 0, -30);
    o.platforms.push({ x: 0, z: -30, r: 34, y: 4 });
    c.g.frame(0, 4, -30, 0, 1, () => {
      cyl(c.g, 17, 17, 22, white, 0, 0, 0, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        archPanel(c.g, 8, 16, '#e8e2d4', Math.sin(a) * 15.8, 1, Math.cos(a) * 15.8, a, 0.2, true);
        archPanel(c.glow, 3.4, 6, c.s.glow, Math.sin(a) * 16, 3, Math.cos(a) * 16, a, 0.1, true);
      }
      cyl(c.g, 9, 9, 6, white, 0, 22, 0, 16);
      onion(c.g, 11, white, 0, 26, 0, '#d4af37');
      for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]] as const) chhatri(c, x, 22, z, 2.6, white, white);
      for (const [x, z] of [[-31, -31], [31, -31], [-31, 31], [31, 31]] as const) {
        cyl(c.g, 1.4, 1.8, 30, white, x, 0, z, 8);
        for (const y of [10, 20]) cyl(c.g, 2.4, 2.2, 0.8, white, x, y, z, 8);
        chhatri(c, x, 30, z, 1.6, white, white);
        o.colliders.push({ x, z: z - 30, r: 2.2, h: 40 });
      }
    });
    // Charbagh — four-fold garden with water channels and cypress avenues.
    box(c.g, 4, 0.3, 90, '#7fc8e0', 0, 0, 44);
    box(c.g, 90, 0.3, 4, '#7fc8e0', 0, 0, 44);
    for (let i = 0; i < 12; i++) {
      for (const x of [-5, 5]) tree(c.g, 'cypress', x, 0, 4 + i * 7, 1.2, () => c.rng.next());
    }
    for (let i = 0; i < 5; i++) sphere(c.glow, 0.3, '#fff0c0', 0, 0.6, 12 + i * 14, 5);
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
      c.g.frame(Math.cos(a) * 28, 0, Math.sin(a) * 28, 0, 1, () => {
        dome(c.g, 3, '#cfe8ff', 0, 0, 0, 14);
        sphere(c.glow, 1, c.s.glow, 0, 0.6, 0, 8, 0.6);
      });
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

function floatingIsland(c: Ctx, x: number, y: number, z: number, size: number): void {
  c.g.frame(x, y, z, 0, 1, () => {
    const under = cone0(size);
    c.g.add(under, '#e0d6f6');
    cyl(c.g, size, size * 0.96, 0.6, '#c8f0c0', 0, 0, 0, 14);
    for (let i = 0; i < 3; i++) {
      const a = c.rng.range(0, Math.PI * 2), r = c.rng.range(0, size * 0.6);
      tree(c.g, c.rng.chance(0.5) ? 'cloud' : 'crystal', Math.cos(a) * r, 0.6, Math.sin(a) * r, 1, () => c.rng.next());
    }
  });
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
function cone0(size: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(size * 0.96, size * 1.4, 9);
  g.rotateX(Math.PI);
  g.translate(0, -size * 0.7, 0);
  return g;
}

export function buildLandmark(c: Ctx): LandmarkOut {
  const out: LandmarkOut = { colliders: [], platforms: [], height: 20 };
  landmarks[c.s.id](c, out);
  return out;
}
