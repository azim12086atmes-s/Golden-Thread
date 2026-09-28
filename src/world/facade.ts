import * as THREE from 'three';
import type { Ctx, Footprint } from './architecture';
import { M, archPanel, box, cone, cyl, gable, hip } from './kit';
import { SURF } from './surfaces';

/**
 * The facade kit: buildings put together from the real parts of real facades (see
 * docs/ARCHITECTURE_RESEARCH.md) instead of boxes with glowing squares. A style describes a
 * tradition — how many floors and bays, what the windows, doors, balconies, cornice and roof are
 * like — and `compose` builds a house from it, varying its massing (a wing, a bay, a turret, a
 * porch) so no two streets repeat.
 *
 * Local frame: origin at the base centre, the street front facing +z. Lit parts go into `c.g`,
 * window glass and lamps into `c.glow`.
 */

export interface FacadeStyle {
  floors: [number, number];
  floorH: number;
  bays: [number, number];
  bayW: number;
  depth: [number, number];
  /** The ground storey: plain, white stucco (London), rusticated stone (palazzo), a stone base (chalet), a stoop (brownstone). */
  base: 'plain' | 'stucco' | 'rusticated' | 'stone' | 'stoop' | 'shop';
  /** Glazing: sash (two sashes), casement (cross), arched, lattice (Japanese koshi), tall (French). */
  win: 'sash' | 'casement' | 'arched' | 'lattice' | 'tall';
  /** Over each window: a flat lintel, a keystone, a pediment, an arch or a hood. */
  head: 'flat' | 'keystone' | 'pediment' | 'arch' | 'hood' | 'none';
  /** Share of windows with shutters. */
  shutters: number;
  balcony: 'none' | 'iron' | 'balustrade' | 'wood';
  /** Which floors have balconies: the first upper floor (piano nobile), every upper floor, or none. */
  balconyAt: 'noble' | 'all' | 'none';
  cornice: 'dentil' | 'bracket' | 'parapet' | 'eaves' | 'none';
  pilasters: boolean;
  quoins: boolean;
  strings: boolean;
  roof: 'parapet' | 'mansard' | 'gable' | 'gablefront' | 'hip' | 'chalet';
  dormers: boolean;
  chimneys: number;
  /** Chances of a canted bay window, a wing behind, a corner turret, a porch. */
  bay: number;
  wing: number;
  turret: number;
  porch: number;
  /** Colours: frames and trim, shutters, the base storey, iron, roof (null: the land's own). */
  trim: string;
  shutter: string[];
  baseCol: string;
  iron: string;
  roofCol?: string;
  /** Walls of the style's own (a red rorbu, a white Engadin house) instead of the land's palette. */
  walls?: string[];
  /** A shopfront's fascia and awning colours (base 'shop'). */
  shop?: string[];
}

const pick = <T>(c: Ctx, a: readonly T[]) => c.rng.pick(a);

/** Run `fn` in a frame placed on a face of the building (both lit and glowing builders). */
function onFace(c: Ctx, x: number, z: number, ry: number, fn: () => void): void {
  c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, fn));
}

/** Parts drawn with a given surface regardless of colour (stone bases, stucco). */
function withSurface(c: Ctx, s: number, fn: () => void): void {
  const prev = c.g.surface;
  c.g.surface = s;
  try { fn(); } finally { c.g.surface = prev; }
}

/**
 * A window on a wall facing +z at z = 0: glass that glows at night, a frame, a sill, glazing bars,
 * the head the style asks for, and perhaps shutters. (x, y) is the bottom centre of the opening.
 */
export function windowUnit(c: Ctx, st: FacadeStyle, x: number, y: number, w: number, h: number, shutter: boolean): void {
  const t = st.trim, f = 0.07, d = 0.09;
  if (st.win === 'arched') archPanel(c.glow, w, h, c.s.glow, x, y, 0.02, 0, 0.04);
  else box(c.glow, w, h, 0.04, c.s.glow, x, y, 0.02);
  // Frame.
  if (st.win !== 'arched') {
    box(c.g, w + f * 2, f, d, t, x, y - f, 0.03);
    box(c.g, w + f * 2, f, d, t, x, y + h, 0.03);
  }
  for (const s of [-1, 1]) box(c.g, f, st.win === 'arched' ? h - w / 2 : h, d, t, x + s * (w / 2 + f / 2), y, 0.03);
  // Glazing bars.
  if (st.win === 'sash' || st.win === 'tall') {
    box(c.g, w, 0.045, 0.05, t, x, y + h * (st.win === 'sash' ? 0.5 : 0.62), 0.05);
    box(c.g, 0.035, h, 0.05, t, x, y, 0.05);
    if (st.win === 'sash') for (const k of [0.25, 0.75]) box(c.g, w, 0.025, 0.045, t, x, y + h * k, 0.05);
  } else if (st.win === 'casement') {
    box(c.g, w, 0.045, 0.05, t, x, y + h * 0.66, 0.05);
    box(c.g, 0.04, h, 0.05, t, x, y, 0.05);
  } else if (st.win === 'lattice') {
    // Koshi: close vertical slats over the whole opening.
    for (let i = 0; i <= 9; i++) box(c.g, 0.035, h, 0.06, st.iron, x - w / 2 + (w / 9) * i, y, 0.07);
    box(c.g, w, 0.04, 0.06, st.iron, x, y + h * 0.5, 0.07);
  } else if (st.win === 'arched') {
    box(c.g, 0.035, h, 0.05, t, x, y, 0.05);
    archPanel(c.g, w + f * 2, h + f, t, x, y - f / 2, -0.02, 0, 0.06);
  }
  // Sill.
  box(c.g, w + 0.26, 0.08, 0.2, t, x, y - 0.1, 0.08);
  // Head.
  switch (st.head) {
    case 'flat': box(c.g, w + 0.28, 0.16, 0.1, t, x, y + h + f, 0.04); break;
    case 'keystone':
      box(c.g, w + 0.24, 0.14, 0.08, t, x, y + h + f, 0.04);
      c.g.add(new THREE.BoxGeometry(0.16, 0.26, 0.12).translate(0, 0.13, 0), t, M(x, y + h + f - 0.04, 0.06));
      break;
    case 'pediment':
      box(c.g, w + 0.36, 0.1, 0.16, t, x, y + h + f, 0.06);
      gable(c.g, 0.16, w + 0.5, 0.34, t, x, y + h + f + 0.1, 0.06, Math.PI / 2);
      break;
    case 'hood':
      box(c.g, w + 0.4, 0.1, 0.3, t, x, y + h + f + 0.02, 0.14);
      for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.08, 0.22, 0.24).translate(0, -0.11, 0.12), t, M(x + s * (w / 2 + 0.12), y + h + f + 0.02, 0.02));
      break;
    case 'arch': if (st.win !== 'arched') archPanel(c.g, w + 0.2, 0.5, t, x, y + h, 0.02, 0, 0.08); break;
    default: break;
  }
  // Shutters: two louvred leaves, opened back against the wall.
  if (shutter && st.win !== 'lattice') {
    const col = pick(c, st.shutter), sw = w * 0.52;
    for (const s of [-1, 1]) {
      const sx = x + s * (w / 2 + f + sw / 2);
      box(c.g, sw, h, 0.05, col, sx, y, 0.05);
      for (let k = 1; k < 7; k++) box(c.g, sw * 0.8, 0.02, 0.03, st.trim === col ? '#2a2a2a' : st.trim, sx, y + (h / 7) * k, 0.08);
    }
  }
}

/** A front door at the bottom centre (x, y): panelled leaf, frame, fanlight and the style's surround. */
export function doorUnit(c: Ctx, st: FacadeStyle, x: number, y: number, doorCol: string): void {
  const w = 1.15, h = 2.3, t = st.trim;
  box(c.g, w, h, 0.08, doorCol, x, y, 0.02);
  // Raised panels on the leaf.
  for (const py of [0.25, 1.2]) for (const s of [-1, 1]) box(c.g, w * 0.34, 0.75, 0.04, doorCol, x + s * w * 0.22, y + py, 0.07);
  box(c.g, 0.06, 0.06, 0.08, '#d4af37', x + w * 0.32, y + 1.05, 0.1);
  // Fanlight.
  archPanel(c.glow, w, w / 2 + 0.02, c.s.glow, x, y + h, 0.02, 0, 0.04);
  // Pilasters either side and a crowning pediment or cornice hood.
  for (const s of [-1, 1]) {
    box(c.g, 0.22, h + 0.6, 0.16, t, x + s * (w / 2 + 0.16), y, 0.06);
    box(c.g, 0.3, 0.12, 0.2, t, x + s * (w / 2 + 0.16), y + h + 0.6, 0.06);
  }
  if (st.head === 'pediment' || st.head === 'keystone') gable(c.g, 0.2, w + 1.0, 0.45, t, x, y + h + 0.72, 0.08, Math.PI / 2);
  else box(c.g, w + 0.9, 0.16, 0.34, t, x, y + h + 0.72, 0.12);
}

/** A balcony on the +z face at height y, w wide: slab on corbels and the style's railing. */
export function balconyUnit(c: Ctx, st: FacadeStyle, x: number, y: number, w: number): void {
  const d = 0.75, t = st.trim;
  box(c.g, w, 0.14, d, t, x, y, d / 2);
  for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.16, 0.3, d * 0.8).translate(0, -0.3, d * 0.4), t, M(x + s * (w / 2 - 0.2), y + 0.14, 0));
  if (st.balcony === 'balustrade') {
    const n = Math.max(3, Math.round(w / 0.24));
    for (let i = 0; i < n; i++) cyl(c.g, 0.045, 0.06, 0.62, t, x - w / 2 + 0.12 + ((w - 0.24) / (n - 1)) * i, y + 0.14, d - 0.07, 6);
    box(c.g, w, 0.1, 0.16, t, x, y + 0.76, d - 0.07);
  } else if (st.balcony === 'iron') {
    for (let i = 0; i <= Math.round(w / 0.14); i++) box(c.g, 0.022, 0.8, 0.022, st.iron, x - w / 2 + i * 0.14, y + 0.14, d - 0.04);
    box(c.g, w, 0.05, 0.06, st.iron, x, y + 0.92, d - 0.04);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(c.g, 0.022, 0.8, 0.022, st.iron, x + s * w / 2, y + 0.14, 0.1 + i * 0.18);
  } else if (st.balcony === 'wood') {
    // Chalet balusters: flat boards with a cut-out, and a flower box along the rail.
    for (let i = 0; i < Math.round(w / 0.2); i++) box(c.g, 0.14, 0.7, 0.03, '#8a5a36', x - w / 2 + 0.1 + i * 0.2, y + 0.14, d - 0.05);
    box(c.g, w, 0.1, 0.12, '#6b4a2e', x, y + 0.84, d - 0.05);
    box(c.g, w * 0.9, 0.18, 0.2, '#6b4a2e', x, y + 0.94, d - 0.02);
    for (let i = 0; i < Math.round(w / 0.3); i++) box(c.g, 0.16, 0.14, 0.14, pick(c, ['#e0473a', '#ff8fb8', '#f2c14e']), x - w / 2 + 0.25 + i * 0.3, y + 1.08, d - 0.02);
  }
}

/**
 * A shopfront across the ground floor (the wall facing +z at z = 0): a painted fascia with gilt
 * lettering, pilasters, glazed display windows on stall-risers with goods behind the glass, and a
 * striped awning let down over the pavement. The door (at doorX) is left clear.
 */
function shopfront(c: Ctx, st: FacadeStyle, w: number, fh: number, doorX: number): void {
  const col = pick(c, st.shop ?? ['#2f4a3a', '#7a1f24', '#1f2f5a']), t = st.trim;
  // The shopfront stands forward of the wall: its windows are shallow display cases.
  const G = 0.4; // the glass line
  box(c.g, w, 0.7, 0.16, col, 0, fh - 0.85, G + 0.06); // the fascia
  for (let i = 0; i < Math.floor((w - 2) / 0.5); i++) box(c.g, 0.26, 0.3, 0.02, '#d4af37', -w / 2 + 1 + i * 0.5, fh - 0.7, G + 0.15); // gilt letters
  box(c.g, w + 0.3, 0.14, 0.3, t, 0, fh - 0.15, G); // the cornice over the fascia
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) box(c.g, 0.24, fh - 0.15, G + 0.2, t, x, 0, (G + 0.2) / 2); // pilasters
  // Display windows either side of the recessed door: a stall-riser, goods on a shelf, the glass.
  for (const [x0, x1] of [[-w / 2 + 0.3, doorX - 0.9], [doorX + 0.9, w / 2 - 0.3]]) {
    const ww = x1 - x0;
    if (ww < 0.8) continue;
    const cx = (x0 + x1) / 2;
    box(c.g, ww, 0.6, G, col, cx, 0, G / 2);
    box(c.g, ww, fh - 1.75, 0.04, '#a8c0c8', cx, 0.6, G);
    box(c.g, ww, 0.05, G, col, cx, fh - 1.15, G / 2); // the case's head, a strip of light under it
    box(c.glow, ww * 0.9, 0.05, 0.05, c.s.glow, cx, fh - 1.2, G - 0.1);
    for (let k = 0; k < Math.floor(ww / 0.45); k++) box(c.g, 0.26, 0.3 + (k % 3) * 0.12, 0.22, ['#e8b84a', '#c8483a', '#6aa84f', '#f2efe6'][k % 4], x0 + 0.25 + k * 0.45, 0.6, G / 2);
    for (const x of [x0, x1]) box(c.g, 0.06, fh - 1.75, 0.08, t, x, 0.6, G);
  }
  // The awning, striped, let down over the pavement, its valance hanging at the front.
  const stripes = Math.round(w / 0.5);
  for (let i = 0; i < stripes; i++) c.g.add(new THREE.BoxGeometry(w / stripes, 0.04, 1.3).translate(0, 0, 0.65), i % 2 ? col : '#f4f0e6', M(-w / 2 + (i + 0.5) * (w / stripes), fh - 1.05, G + 0.1, 0, 1, 1, 1, 0.38));
  for (let i = 0; i < stripes; i++) box(c.g, w / stripes, 0.22, 0.03, i % 2 ? col : '#f4f0e6', -w / 2 + (i + 0.5) * (w / stripes), fh - 1.75, G + 1.3);
}

/** A canted bay window: three angled faces of glass projecting from the +z wall, floors high. */
function bayWindow(c: Ctx, st: FacadeStyle, wall: string, x: number, y0: number, h: number, w: number): void {
  const geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 6, 1, false, -Math.PI / 2, Math.PI);
  geo.translate(0, h / 2, 0);
  c.g.add(geo, wall, M(x, y0, 0, 0, 1, 1, 0.6));
  for (let f = 0; f < Math.round(h / st.floorH); f++) {
    const yy = y0 + f * st.floorH + 0.9;
    for (let k = -1; k <= 1; k++) {
      const a = (k * Math.PI) / 3;
      c.glow.add(new THREE.BoxGeometry(w * 0.32, st.floorH * 0.5, 0.04), c.s.glow, M(x + Math.sin(a) * w * 0.44, yy + st.floorH * 0.25, Math.cos(a) * w * 0.27, a));
    }
  }
  box(c.g, w + 0.2, 0.18, w * 0.4, st.trim, x, y0 + h, w * 0.1);
}

/** The cornice along the top of a w × d block at height y. */
function corniceUnit(c: Ctx, st: FacadeStyle, w: number, d: number, y: number): void {
  const t = st.trim;
  if (st.cornice === 'none') return;
  if (st.cornice === 'parapet') {
    box(c.g, w + 0.3, 0.3, d + 0.3, t, 0, y, 0);
    box(c.g, w, 0.9, 0.24, c.g.surface === null ? t : t, 0, y + 0.3, d / 2 - 0.12);
    box(c.g, w + 0.1, 0.1, 0.34, t, 0, y + 1.2, d / 2 - 0.12);
    return;
  }
  if (st.cornice === 'eaves') return; // the roof's own deep eaves do the work
  box(c.g, w + 0.2, 0.26, d + 0.2, t, 0, y, 0);
  box(c.g, w + 0.7, 0.2, d + 0.7, t, 0, y + 0.42, 0);
  if (st.cornice === 'dentil') {
    for (let x = -w / 2 - 0.1; x <= w / 2 + 0.1; x += 0.22) box(c.g, 0.1, 0.14, 0.12, t, x, y + 0.27, d / 2 + 0.16);
  } else {
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.9) c.g.add(new THREE.BoxGeometry(0.16, 0.34, 0.36).translate(0, 0.17, 0.18), t, M(x, y + 0.1, d / 2 + 0.1));
  }
}

/** The roof over a w × d block whose walls stop at y. Returns its height. */
function roofUnit(c: Ctx, st: FacadeStyle, w: number, d: number, y: number, roofCol: string): number {
  const extra = st.cornice === 'none' || st.cornice === 'eaves' ? 0 : 0.62;
  switch (st.roof) {
    case 'parapet': box(c.g, w - 0.2, 0.1, d - 0.2, '#6a6a70', 0, y + extra, 0); return extra + 1.2;
    case 'mansard': {
      // A steep lower slope with dormers, then a low top.
      const h = 2.6, geo = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.78, Math.SQRT1_2, 1, 4, 1);
      geo.rotateY(Math.PI / 4); geo.translate(0, 0.5, 0);
      c.g.add(geo, roofCol, M(0, y + extra, 0, 0, w, h, d));
      hip(c.g, w * 0.78, d * 0.78, 0.8, roofCol, 0, y + extra + h, 0);
      if (st.dormers) for (let x = -w / 2 + st.bayW / 2 + 0.4; x < w / 2 - 0.4; x += st.bayW) {
        box(c.g, 1.1, 1.3, 1, st.trim, x, y + extra + 0.5, d / 2 - 0.55);
        box(c.glow, 0.7, 0.8, 0.05, c.s.glow, x, y + extra + 0.7, d / 2 - 0.03);
        gable(c.g, 1.1, 1.4, 0.5, roofCol, x, y + extra + 1.8, d / 2 - 0.55, Math.PI / 2);
      }
      return extra + h + 0.8;
    }
    case 'gable': gable(c.g, w + 0.6, d + 0.8, d * 0.45, roofCol, 0, y + extra, 0); return extra + d * 0.45;
    case 'gablefront': {
      gable(c.g, d + 0.8, w + 0.6, w * 0.55, roofCol, 0, y + extra, 0, Math.PI / 2);
      // Bargeboards along the gable's edges.
      return extra + w * 0.55;
    }
    case 'hip': hip(c.g, w + 1, d + 1, Math.min(w, d) * 0.35, roofCol, 0, y + extra, 0); return extra + Math.min(w, d) * 0.35;
    case 'chalet': {
      // A low front gable with very deep eaves on big brackets, and carved bargeboards.
      const h = w * 0.32;
      gable(c.g, d + 3, w + 3, h, roofCol, 0, y, 0.3, Math.PI / 2);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) c.g.add(new THREE.BoxGeometry(0.18, 0.18, 1.3).translate(0, 0, 0.65), '#6b4a2e', M(s * (w / 2 - 0.3 - k * 1.2), y - 0.1, d / 2 - 0.2, 0, 1, 1, 1, 0.5));
        c.g.add(new THREE.BoxGeometry(0.12, 0.35, Math.hypot(w / 2 + 1.5, h) + 0.1).translate(0, 0, Math.hypot(w / 2 + 1.5, h) / 2), '#5a3a26', M(s * 0.02, y + h, d / 2 + 1.8, s * Math.PI / 2, 1, 1, 1, -Math.atan2(h, w / 2 + 1.5)));
      }
      return h;
    }
  }
}

/** Build a house in the given style. Returns its footprint. */
export function compose(c: Ctx, st: FacadeStyle, doorCol = '#4a3426'): Footprint & { top: number } {
  const floors = c.rng.int(st.floors[0], st.floors[1]), bays = c.rng.int(st.bays[0], st.bays[1]);
  const fh = st.floorH, w = bays * st.bayW + 0.6, d = c.rng.range(st.depth[0], st.depth[1]), H = floors * fh;
  const wall = pick(c, st.walls ?? c.s.walls), roofCol = st.roofCol ?? pick(c, c.s.roofs);
  const baseH = st.base === 'stone' ? fh : st.base === 'stucco' || st.base === 'rusticated' || st.base === 'shop' ? fh : st.base === 'stoop' ? 1.6 : 0;

  // The body, and its base storey in stone, stucco or rusticated blocks.
  box(c.g, w, H, d, wall);
  if (baseH > 0) withSurface(c, st.base === 'stucco' ? SURF.plaster : SURF.ashlar, () => {
    box(c.g, w + 0.08, baseH, d + 0.08, st.baseCol, 0, 0, 0);
    if (st.base === 'rusticated') for (let yy = 0.5; yy < baseH; yy += 0.5) box(c.g, w + 0.14, 0.05, 0.05, '#8a8274', 0, yy, d / 2 + 0.05);
  });
  // Corners, pilasters and string courses.
  if (st.quoins) for (const sx of [-1, 1]) for (let yy = baseH, k = 0; yy < H - 0.3; yy += 0.42, k++) {
    box(c.g, k % 2 ? 0.36 : 0.56, 0.36, 0.1, st.trim, sx * (w / 2 - (k % 2 ? 0.18 : 0.28)), yy, d / 2 + 0.02);
  }
  if (st.pilasters) for (let i = 1; i < bays; i++) {
    const x = -w / 2 + 0.3 + i * st.bayW;
    box(c.g, 0.26, H - baseH, 0.12, st.trim, x, baseH, d / 2 + 0.04);
    box(c.g, 0.36, 0.18, 0.18, st.trim, x, H - 0.2, d / 2 + 0.06);
  }
  if (st.strings) for (let f = 1; f < floors; f++) box(c.g, w + 0.12, 0.14, d + 0.12, st.trim, 0, f * fh - 0.05, 0);

  // The street front: a door in the middle bay, windows in every other opening.
  const doorBay = Math.floor(bays / 2);
  const bayAt = c.rng.chance(st.bay) ? (doorBay === 0 ? 1 : 0) : -1;
  c.g.frame(0, 0, d / 2, 0, 1, () => c.glow.frame(0, 0, d / 2, 0, 1, () => {
    for (let f = 0; f < floors; f++) {
      const noble = f === 1;
      const wh = fh * (noble ? 0.6 : 0.52) * (st.win === 'tall' ? 1.2 : 1), wy = f * fh + (f === 0 && st.base === 'stoop' ? 1.9 : fh * 0.24);
      for (let i = 0; i < bays; i++) {
        const x = -w / 2 + 0.3 + (i + 0.5) * st.bayW;
        if (f === 0 && i === doorBay) { doorUnit(c, st, x, st.base === 'stoop' ? 1.6 : 0, doorCol); continue; }
        if (f === 0 && st.base === 'shop') continue; // the shopfront fills the ground floor
        if (i === bayAt && f < 2) continue;
        windowUnit(c, st, x, wy, st.bayW * 0.46, wh, c.rng.chance(st.shutters));
        if (f > 0 && (st.balconyAt === 'all' || (st.balconyAt === 'noble' && noble)) && st.balcony !== 'none') balconyUnit(c, st, x, f * fh + 0.02, st.bayW * 0.8);
      }
    }
    if (st.base === 'shop') shopfront(c, st, w, fh, -w / 2 + 0.3 + (doorBay + 0.5) * st.bayW);
    if (bayAt >= 0) bayWindow(c, st, wall, -w / 2 + 0.3 + (bayAt + 0.5) * st.bayW, st.base === 'stoop' ? 1.6 : 0, Math.min(2, floors) * fh - 0.2, st.bayW * 0.9);
    if (st.base === 'stoop') {
      // A high stoop to the parlour floor, with iron railings.
      const x = -w / 2 + 0.3 + (doorBay + 0.5) * st.bayW;
      for (let s = 0; s < 6; s++) box(c.g, 1.8, 0.27 * (s + 1), 0.42, st.baseCol, x, 0, 3 - s * 0.42 - 0.2);
      for (const sx of [-1, 1]) {
        c.g.add(new THREE.BoxGeometry(0.05, 0.05, 2.9).translate(0, 0, 1.45), st.iron, M(x + sx * 0.92, 2.5, 0.1, 0, 1, 1, 1, 0.5));
        for (let k = 0; k < 6; k++) box(c.g, 0.03, 0.9, 0.03, st.iron, x + sx * 0.92, 0.27 * (6 - k), 0.3 + k * 0.45);
      }
    } else if (c.rng.chance(st.porch)) {
      // A porch on turned posts.
      const x = -w / 2 + 0.3 + (doorBay + 0.5) * st.bayW;
      box(c.g, 2.6, 0.2, 1.6, st.trim, x, 0, 0.8);
      for (const sx of [-1, 1]) cyl(c.g, 0.08, 0.1, 2.8, st.trim, x + sx * 1.15, 0.2, 1.45, 8);
      box(c.g, 2.8, 0.18, 1.8, st.trim, x, 3, 0.8);
      gable(c.g, 1.8, 2.9, 0.6, roofCol, x, 3.18, 0.8, Math.PI / 2);
    }
  }));
  // Windows down the sides.
  for (const side of [-1, 1]) onFace(c, side * w / 2, 0, side * Math.PI / 2, () => {
    for (let f = 0; f < floors; f++) for (let k = 0; k < Math.max(1, Math.floor(d / 3.2)); k++) {
      windowUnit(c, st, -d / 2 + 1.4 + k * 3.2, f * fh + fh * 0.26 + (f === 0 && st.base === 'stoop' ? 1.2 : 0), 0.9, fh * 0.5, false);
    }
  });

  corniceUnit(c, st, w, d, H);
  const rh = roofUnit(c, st, w, d, H, roofCol);
  // Chimneys with pots.
  for (let i = 0; i < st.chimneys; i++) {
    const cx = (i === 0 ? -1 : 1) * (w / 2 - 0.9), cz = -d * 0.15;
    box(c.g, 0.9, rh + 1.3, 0.6, st.baseCol, cx, H, cz);
    box(c.g, 1.0, 0.14, 0.7, st.trim, cx, H + rh + 1.3, cz);
    for (const px of [-0.2, 0.2]) cyl(c.g, 0.08, 0.1, 0.36, '#b5654a', cx + px, H + rh + 1.44, cz, 6);
  }

  // Varied massing: a lower wing behind, or a corner turret.
  // The footprint is the main body; a wing tucks in behind it and a turret stands on its corner.
  const reach = Math.max(w, d) / 2 + 0.3;
  if (c.rng.chance(st.wing)) {
    const ww = w * 0.5, wd = Math.min(3, d * 0.35), wf = Math.max(1, floors - 1);
    c.g.frame(-w / 2 + ww / 2, 0, -d / 2 - wd / 2 + 0.2, 0, 1, () => c.glow.frame(-w / 2 + ww / 2, 0, -d / 2 - wd / 2 + 0.2, 0, 1, () => {
      box(c.g, ww, wf * fh, wd, wall);
      for (const side of [-1, 1]) onFace(c, side * ww / 2, 0, side * Math.PI / 2, () => {
        for (let f = 0; f < wf; f++) windowUnit(c, st, 0, f * fh + fh * 0.26, 0.9, fh * 0.5, false);
      });
      hip(c.g, ww + 0.8, wd + 0.8, 1.6, roofCol, 0, wf * fh, 0);
    }));
  }
  if (c.rng.chance(st.turret)) {
    const r = 1.5, tx = w / 2 - 0.2, tz = d / 2 - 0.2;
    cyl(c.g, r, r, H + 1.2, wall, tx, 0, tz, 12);
    for (let f = 0; f < floors; f++) c.glow.add(new THREE.BoxGeometry(0.7, fh * 0.5, 0.05), c.s.glow, M(tx + Math.SQRT1_2 * r * 1.01, f * fh + fh * 0.3, tz + Math.SQRT1_2 * r * 1.01, Math.PI / 4));
    box(c.g, r * 2.1, 0.2, r * 2.1, st.trim, tx, H + 1.2, tz);
    cone(c.g, r * 1.25, r * 2.4, roofCol, tx, H + 1.4, tz, 12);
  }
  return { r: reach + 0.6, h: H + rh + 2, top: H };
}

/* ------------------------------------------------------------------------------------------------
 * Styles from the research (docs/ARCHITECTURE_RESEARCH.md).
 * --------------------------------------------------------------------------------------------- */
const S = (o: Partial<FacadeStyle>): FacadeStyle => ({
  floors: [2, 3], floorH: 3.3, bays: [3, 4], bayW: 2.2, depth: [8, 10], base: 'plain', win: 'sash', head: 'flat', shutters: 0,
  balcony: 'none', balconyAt: 'none', cornice: 'dentil', pilasters: false, quoins: false, strings: false, roof: 'gable', dormers: false,
  chimneys: 0, bay: 0, wing: 0, turret: 0, porch: 0, trim: '#f2efe6', shutter: ['#2f4a3a'], baseCol: '#e8e4da', iron: '#1f1f24', ...o,
});

export const FACADES = {
  /** Georgian and Victorian London: brick over a white stucco ground floor, sash windows, iron balconies, parapets, chimneys. */
  london: S({ floors: [3, 4], bays: [3, 4], bayW: 2.0, depth: [8, 9], base: 'stucco', win: 'sash', head: 'keystone', balcony: 'iron', balconyAt: 'noble', cornice: 'parapet', strings: true, roof: 'parapet', chimneys: 2, bay: 0.4, wing: 0.3, baseCol: '#f2efe6' }),
  /** Italian palazzo: rusticated base, piano nobile with pediments and balustraded balconies, quoins, bracketed cornice. */
  renaissance: S({ floors: [3, 3], floorH: 3.6, bays: [3, 4], bayW: 2.3, depth: [9, 10], base: 'rusticated', win: 'arched', head: 'pediment', balcony: 'balustrade', balconyAt: 'noble', cornice: 'bracket', quoins: true, strings: true, roof: 'hip', wing: 0.35, trim: '#fbf3e0', baseCol: '#d9c8a4' }),
  /** Queen Anne "Painted Ladies": bays, turrets, porches, steep front gables, shutters in contrasting colours. */
  vintage: S({ floors: [2, 3], bays: [2, 3], bayW: 2.3, win: 'tall', head: 'hood', shutters: 0.5, cornice: 'bracket', roof: 'gablefront', bay: 0.8, turret: 0.45, porch: 0.7, chimneys: 1, trim: '#ffffff', shutter: ['#5a8ab5', '#e07a5f', '#6ab58a', '#d9467a'] }),
  /** Norwegian wood (Bryggen): narrow gable fronts, clapboard, white frames, galleries. */
  norway: S({ floors: [2, 3], bays: [2, 3], bayW: 2, depth: [8, 11], win: 'casement', head: 'flat', balcony: 'wood', balconyAt: 'noble', cornice: 'none', roof: 'gablefront', chimneys: 1, wing: 0.2, trim: '#ffffff', baseCol: '#8a8a84' }),
  /** Swiss chalet: stone base, deep-eaved low gable, a carved wooden balcony on every floor, flower boxes, shutters. */
  switzerland: S({ floors: [2, 3], bays: [3, 3], bayW: 2.1, depth: [8, 9], base: 'stone', win: 'casement', head: 'none', shutters: 0.9, balcony: 'wood', balconyAt: 'all', cornice: 'eaves', roof: 'chalet', trim: '#f3ead8', shutter: ['#c23b3b', '#2f6b3a'], baseCol: '#a8a090' }),
  /** New York brownstone: a high stoop, carved lintels, a bay, a bracketed cornice. */
  /** A London mews cottage: two low storeys in pastel paint, casements, a parapet. */
  londonMews: S({ floors: [2, 2], floorH: 3, bays: [2, 3], bayW: 2.1, depth: [7, 8], win: 'casement', head: 'flat', cornice: 'parapet', roof: 'parapet', chimneys: 1, walls: ['#f2d8d8', '#d8e8f2', '#f2ecc8', '#d8f0dc', '#f4f0e6'], trim: '#ffffff' }),
  /** A London corner shop: a Victorian shopfront with fascia and awning, flats above. */
  londonShop: S({ floors: [3, 3], bays: [3, 4], bayW: 2.0, depth: [8, 9], base: 'shop', win: 'sash', head: 'keystone', cornice: 'parapet', strings: true, roof: 'parapet', chimneys: 2, baseCol: '#f2efe6', shop: ['#1f3a2a', '#5a1a24', '#1a2a4a', '#2a2a2a'] }),
  /** A rorbu: a fisherman's cabin in ox-blood red with white trim, one or two storeys under a dark gable. */
  rorbu: S({ floors: [1, 2], floorH: 3, bays: [2, 2], bayW: 2, depth: [6, 7], win: 'casement', head: 'flat', cornice: 'none', roof: 'gablefront', chimneys: 1, walls: ['#8a2a22', '#9a3226'], roofCol: '#3a3a36', trim: '#ffffff' }),
  /** A Sørlandet house: white clapboard, two storeys, a porch, a steep gable. */
  sorlandet: S({ floors: [2, 2], bays: [3, 4], bayW: 2.1, depth: [7, 8], win: 'casement', head: 'hood', cornice: 'none', roof: 'gable', chimneys: 1, porch: 0.8, walls: ['#fbfbf6', '#f4f4ee'], roofCol: '#3a2a26', trim: '#ffffff' }),
  /** An Engadin house: thick white stucco walls, small deep windows under grey sgraffito arches, a broad low gable. */
  engadin: S({ floors: [2, 3], floorH: 3.1, bays: [3, 3], bayW: 2.2, depth: [9, 10], base: 'stucco', win: 'casement', head: 'arch', shutters: 0.3, cornice: 'none', roof: 'gable', walls: ['#f4f0e6', '#ece6d8'], trim: '#7a7a7a', baseCol: '#e8e2d4', shutter: ['#6a4a2a'] }),
  /** A Bernese farmhouse: a vast hipped roof over timber walls, galleries on every floor. */
  bernese: S({ floors: [2, 2], bays: [4, 5], bayW: 2.1, depth: [10, 12], base: 'stone', win: 'casement', head: 'none', shutters: 0.6, balcony: 'wood', balconyAt: 'all', cornice: 'none', roof: 'hip', walls: ['#a8743a', '#9a6a36'], trim: '#f3ead8', shutter: ['#c23b3b'], baseCol: '#b8b0a0' }),
  /** A Tuscan townhouse (casa a schiera): tall and narrow, green shutters, iron balconies. */
  tuscanTown: S({ floors: [3, 4], floorH: 3.3, bays: [2, 3], bayW: 2, depth: [8, 10], win: 'tall', head: 'flat', shutters: 0.9, balcony: 'iron', balconyAt: 'noble', cornice: 'bracket', strings: true, roof: 'hip', shutter: ['#3a5a3a', '#4a6a4a'], trim: '#f4ead8' }),
  /** A Tuscan farmhouse (casa colonica): stone walls, a hipped roof, a dovecote tower at the corner. */
  tuscanFarm: S({ floors: [2, 2], bays: [3, 4], bayW: 2.3, depth: [9, 10], base: 'stone', win: 'arched', head: 'none', shutters: 0.6, cornice: 'none', roof: 'hip', turret: 0.6, walls: ['#c8a878', '#b89868', '#d8b888'], shutter: ['#6a4a2a'], baseCol: '#a89878', trim: '#e8dcc0' }),
  /** A Florentine bottega: a palazzo with quoins and a shop on the ground floor. */
  bottega: S({ floors: [3, 3], floorH: 3.5, bays: [3, 4], bayW: 2.3, depth: [9, 10], base: 'shop', win: 'arched', head: 'pediment', cornice: 'bracket', quoins: true, strings: true, roof: 'hip', trim: '#fbf3e0', shop: ['#5a3a1a', '#2f4a6a', '#6a2a2a'] }),
  /** A Craftsman bungalow: one and a half storeys, a deep porch, a low wide gable. */
  bungalow: S({ floors: [1, 2], floorH: 3.1, bays: [3, 3], bayW: 2.3, depth: [9, 10], win: 'casement', head: 'flat', cornice: 'bracket', roof: 'gablefront', porch: 1, chimneys: 1, trim: '#f4efe0', shutters: 0.2, shutter: ['#4a6a4a'] }),
  /** A New England colonial: symmetrical, clapboard, black shutters, twin chimneys. */
  colonial: S({ floors: [2, 2], bays: [5, 5], bayW: 2, depth: [8, 9], win: 'sash', head: 'pediment', shutters: 1, cornice: 'dentil', roof: 'gable', chimneys: 2, porch: 0.5, walls: ['#fbfbf6', '#e8d8b8', '#c8483a', '#d8e0e8'], shutter: ['#1f1f24', '#2f4a3a'], trim: '#ffffff' }),
  /** A Maple Row main-street shop: a painted front over a shopfront with an awning. */
  mainStreet: S({ floors: [2, 2], bays: [3, 4], bayW: 2.2, depth: [9, 10], base: 'shop', win: 'tall', head: 'hood', cornice: 'bracket', roof: 'parapet', trim: '#ffffff', shop: ['#c8483a', '#2f5a9a', '#3a7a4a', '#e8b84a'] }),
  brownstone: S({ floors: [4, 5], floorH: 3.4, bays: [3, 3], bayW: 2.2, depth: [12, 13], base: 'stoop', win: 'tall', head: 'hood', cornice: 'bracket', roof: 'parapet', bay: 0.35, trim: '#d8cfbf', baseCol: '#8a7a6a' }),
};
