import type { Ctx, Footprint } from './architecture';
import { archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof, tree } from './kit';
import type { RegionId } from './regions';

/**
 * More kinds of building in every town, beside each land's own houses: a tall townhouse with a
 * balcony, a corner shop with an awning and a sign, a tower, a terrace of three joined homes and
 * a courtyard house with a tree. Each is dressed in its land's way — the roof form, pointed or
 * round arches or square windows, its wall and trim colours, and a patterned frieze band — so a
 * street reads as one place with many buildings rather than one house repeated.
 *
 * Human scale: doors are 2.2 m, storeys 3.2 m, balcony rails 1 m.
 */

export type RoofForm = 'gable' | 'hip' | 'swept' | 'dome' | 'flat' | 'onion' | 'pyramid' | 'cone';
export type Archetype = 'townhouse' | 'shop' | 'tower' | 'terrace' | 'courtyard';
export const ARCHETYPES: Archetype[] = ['townhouse', 'shop', 'tower', 'terrace', 'courtyard'];

export interface LandStyle {
  roof: RoofForm;
  /** Window heads: square, round-arched or pointed. */
  arch: 'square' | 'round' | 'pointed';
  /** The frieze pattern's two colours and its motif. */
  frieze: [string, string];
  motif: 'checker' | 'diamond' | 'dots' | 'stripes' | 'stars' | 'waves';
  /** Which archetypes suit the land (desert tents and ice huts have their own). */
  kinds: Archetype[];
}

export const LAND_STYLE: Record<RegionId, LandStyle> = {
  meadow: { roof: 'gable', arch: 'round', frieze: ['#ff8fb8', '#fff4c0'], motif: 'dots', kinds: ['townhouse', 'shop', 'tower', 'terrace', 'courtyard'] },
  japan: { roof: 'swept', arch: 'square', frieze: ['#c8202a', '#f7f1e3'], motif: 'waves', kinds: ['shop', 'townhouse', 'tower', 'courtyard'] },
  korea: { roof: 'swept', arch: 'square', frieze: ['#2f8a5a', '#c8202a'], motif: 'stripes', kinds: ['shop', 'townhouse', 'courtyard'] },
  china: { roof: 'swept', arch: 'round', frieze: ['#c8202a', '#e8b84a'], motif: 'checker', kinds: ['shop', 'townhouse', 'tower', 'courtyard'] },
  norway: { roof: 'gable', arch: 'square', frieze: ['#ffffff', '#2f5a9a'], motif: 'diamond', kinds: ['townhouse', 'shop', 'terrace'] },
  switzerland: { roof: 'gable', arch: 'square', frieze: ['#c8202a', '#ffffff'], motif: 'diamond', kinds: ['townhouse', 'shop', 'tower'] },
  london: { roof: 'hip', arch: 'square', frieze: ['#f7f1e3', '#2a2a30'], motif: 'checker', kinds: ['terrace', 'shop', 'townhouse', 'tower'] },
  newyork: { roof: 'flat', arch: 'square', frieze: ['#d4af37', '#2a2a30'], motif: 'stripes', kinds: ['shop', 'townhouse', 'terrace'] },
  renaissance: { roof: 'hip', arch: 'round', frieze: ['#e8d6b0', '#b5654a'], motif: 'diamond', kinds: ['townhouse', 'tower', 'courtyard', 'shop'] },
  vintage: { roof: 'gable', arch: 'square', frieze: ['#ff8fb8', '#b3e6ff'], motif: 'stripes', kinds: ['shop', 'terrace', 'townhouse'] },
  islamic: { roof: 'dome', arch: 'pointed', frieze: ['#2f8ab8', '#f2d27a'], motif: 'stars', kinds: ['courtyard', 'tower', 'shop', 'townhouse'] },
  middleeast: { roof: 'flat', arch: 'pointed', frieze: ['#c8903a', '#3ac8b8'], motif: 'stars', kinds: ['courtyard', 'tower', 'shop'] },
  desert: { roof: 'flat', arch: 'round', frieze: ['#c8483a', '#f2d6a0'], motif: 'diamond', kinds: ['courtyard', 'shop'] },
  egypt: { roof: 'flat', arch: 'square', frieze: ['#2f6fb8', '#e8b84a'], motif: 'waves', kinds: ['courtyard', 'shop', 'tower'] },
  indianorth: { roof: 'onion', arch: 'pointed', frieze: ['#ff9a1f', '#d1284a'], motif: 'dots', kinds: ['townhouse', 'tower', 'shop', 'courtyard'] },
  indiasouth: { roof: 'pyramid', arch: 'round', frieze: ['#ffffff', '#c8483a'], motif: 'dots', kinds: ['courtyard', 'shop', 'townhouse'] },
  mughal: { roof: 'onion', arch: 'pointed', frieze: ['#f7f1e3', '#2f8a5a'], motif: 'stars', kinds: ['courtyard', 'tower', 'townhouse'] },
  indonesia: { roof: 'pyramid', arch: 'square', frieze: ['#8a5a36', '#e8b84a'], motif: 'waves', kinds: ['shop', 'courtyard', 'tower'] },
  aurora: { roof: 'cone', arch: 'round', frieze: ['#ffd27a', '#2f5a9a'], motif: 'diamond', kinds: ['tower', 'shop'] },
  skyisles: { roof: 'dome', arch: 'round', frieze: ['#fff0b0', '#b8a4ff'], motif: 'stars', kinds: ['tower', 'townhouse'] },
};

/** How often a house plot gets one of these instead of the land's own house. */
export const VARIANT_SHARE = 0.4;

const STOREY = 3.2, DOOR_H = 2.2;
const pick = <T>(c: Ctx, a: readonly T[]) => c.rng.pick(a);

/** A window in the land's shape, on the front face at z (or any face via ry). */
function win(c: Ctx, st: LandStyle, x: number, y: number, z: number, ry = 0, w = 0.95, h = 1.35): void {
  if (st.arch === 'square') {
    box(c.glow, w, h, 0.1, c.s.glow, x, y, z, ry);
    box(c.g, w + 0.24, 0.12, 0.2, '#f7f1e3', x, y + h, z, ry); // lintel
  } else archPanel(c.glow, w, h, c.s.glow, x, y, z, ry, 0.08, st.arch === 'pointed');
  box(c.g, w + 0.3, 0.1, 0.3, '#e8dcc6', x, y - 0.06, z, ry); // sill
}

/** Shutters either side of a window, in the trim colour. */
function shutters(c: Ctx, x: number, y: number, z: number, col: string): void {
  for (const s of [-1, 1]) box(c.g, 0.4, 1.35, 0.08, col, x + s * 0.72, y, z);
}

/** A patterned frieze band across a face (width w, at height y, on the plane z). */
function frieze(c: Ctx, st: LandStyle, w: number, y: number, z: number, ry = 0): void {
  const n = Math.max(4, Math.round(w / 0.6)), cw = w / n, [a, b] = st.frieze;
  box(c.g, w + 0.1, 0.5, 0.12, b, 0, y, z - 0.02, ry);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + cw * (i + 0.5);
    const odd = i % 2 === 1;
    const at = (dx: number, dz: number) => ry ? [dz, dx] : [dx, dz];
    switch (st.motif) {
      case 'checker': { const [px, pz] = at(x, z + 0.03); box(c.g, cw * 0.98, 0.24, 0.06, odd ? a : b, px, y + (odd ? 0 : 0.24), pz, ry); break; }
      case 'diamond': { const [px, pz] = at(x, z + 0.04); box(c.g, cw * 0.5, cw * 0.5, 0.06, a, px, y + 0.25 - cw * 0.25, pz, ry + 0); break; }
      case 'dots': { const [px, pz] = at(x, z + 0.06); sphere(c.g, 0.1, odd ? a : '#ffffff', px, y + 0.18, pz, 5); break; }
      case 'stripes': { const [px, pz] = at(x, z + 0.03); box(c.g, cw * 0.45, 0.46, 0.06, a, px, y + 0.02, pz, ry); break; }
      case 'stars': { const [px, pz] = at(x, z + 0.05); cone(c.glow, 0.16, 0.08, a, px, y + 0.21, pz, 8); break; }
      case 'waves': { const [px, pz] = at(x, z + 0.05); cyl(c.g, 0.2, 0.2, 0.06, a, px, y + 0.05 + (odd ? 0.18 : 0), pz, 8); break; }
    }
  }
}

/** The land's roof over a w × d block standing at height y. */
function roof(c: Ctx, st: LandStyle, w: number, d: number, y: number, col: string): number {
  switch (st.roof) {
    case 'gable': gable(c.g, w + 0.8, d + 0.8, Math.min(w, d) * 0.45, col, 0, y, 0); return Math.min(w, d) * 0.45;
    case 'hip': hip(c.g, w + 0.6, d + 0.6, Math.min(w, d) * 0.35, col, 0, y, 0); return Math.min(w, d) * 0.35;
    case 'swept': sweptRoof(c.g, w + 2, d + 1.6, 2.2, col, 0, y, 0, 0, 0.45); return 2.2;
    case 'pyramid': cone(c.g, Math.max(w, d) * 0.78, Math.max(w, d) * 0.6, col, 0, y, 0, 4, Math.PI / 4); return Math.max(w, d) * 0.6;
    case 'cone': cone(c.g, Math.max(w, d) * 0.7, Math.max(w, d) * 0.8, col, 0, y, 0, 10); return Math.max(w, d) * 0.8;
    case 'dome': box(c.g, w + 0.4, 0.4, d + 0.4, '#f7f1e3', 0, y, 0); dome(c.g, Math.min(w, d) * 0.4, col, 0, y + 0.4, 0, 14); return Math.min(w, d) * 0.4 + 0.4;
    case 'onion': box(c.g, w + 0.4, 0.4, d + 0.4, '#f7f1e3', 0, y, 0); onion(c.g, Math.min(w, d) * 0.3, col, 0, y + 0.4, 0); return Math.min(w, d) * 0.75 + 0.4;
    case 'flat':
    default:
      box(c.g, w + 0.3, 0.45, d + 0.3, '#e8dcc6', 0, y, 0);
      for (let i = 0; i < Math.floor(w / 0.8); i++) box(c.g, 0.4, 0.4, 0.3, '#e8dcc6', -w / 2 + 0.4 + i * 0.8, y + 0.45, d / 2); // parapet teeth
      return 0.85;
  }
}

function doorway(c: Ctx, st: LandStyle, x: number, z: number, col: string): void {
  if (st.arch === 'square') {
    box(c.g, 1.3, DOOR_H, 0.14, '#4a3426', x, 0, z);
    box(c.g, 1.7, 0.2, 0.25, col, x, DOOR_H, z);
  } else {
    archPanel(c.g, 1.4, DOOR_H + 0.3, '#4a3426', x, 0, z, 0, 0.14, st.arch === 'pointed');
    archPanel(c.g, 1.9, DOOR_H + 0.6, col, x, 0, z - 0.04, 0, 0.1, st.arch === 'pointed');
  }
  box(c.g, 2, 0.18, 0.9, '#cfc8b8', x, 0, z + 0.45); // a step
}

type Builder = (c: Ctx, st: LandStyle) => Footprint;

const BUILD: Record<Archetype, Builder> = {
  /** A tall, narrow home of two or three storeys with a balcony and flower boxes. */
  townhouse(c, st) {
    const wall = pick(c, c.s.walls), trim = pick(c, c.s.trims), floors = c.rng.chance(0.5) ? 3 : 2;
    const w = 6, d = 6.5, h = floors * STOREY;
    box(c.g, w, h, d, wall);
    box(c.g, w + 0.2, 0.25, d + 0.2, trim, 0, STOREY - 0.1, 0);
    doorway(c, st, -1.4, d / 2 + 0.02, trim);
    win(c, st, 1.4, 1.0, d / 2 + 0.03);
    for (let f = 1; f < floors; f++) for (const x of [-1.5, 1.5]) {
      win(c, st, x, f * STOREY + 0.9, d / 2 + 0.03);
      if (st.arch === 'square') shutters(c, x, f * STOREY + 0.9, d / 2 + 0.05, trim);
      box(c.g, 1.5, 0.28, 0.35, '#8a5a36', x, f * STOREY + 0.55, d / 2 + 0.2);
      for (let k = 0; k < 4; k++) sphere(c.g, 0.13, pick(c, c.s.flowers), x - 0.5 + k * 0.33, f * STOREY + 0.9, d / 2 + 0.25, 4);
    }
    // A balcony on the first floor: a slab and a rail at 1 m.
    box(c.g, 3.2, 0.18, 1.1, trim, 0, STOREY, d / 2 + 0.55);
    box(c.g, 3.2, 0.08, 0.08, trim, 0, STOREY + 1.0, d / 2 + 1.05);
    for (let i = 0; i < 9; i++) box(c.g, 0.05, 1.0, 0.05, trim, -1.5 + i * 0.375, STOREY + 0.1, d / 2 + 1.05);
    frieze(c, st, w, h - 0.7, d / 2 + 0.02);
    const rh = roof(c, st, w, d, h, pick(c, c.s.roofs));
    if (st.roof === 'gable' || st.roof === 'hip') box(c.g, 0.7, 1.8, 0.7, '#b5654a', 1.6, h + rh * 0.3, -1.2); // chimney
    return { r: 4.6, h: h + rh };
  },

  /** A corner shop: a wide glowing shop window, a striped awning, a hanging sign and goods outside. */
  shop(c, st) {
    const wall = pick(c, c.s.walls), trim = pick(c, c.s.trims), w = 7, d = 6;
    const h = STOREY * 2;
    box(c.g, w, h, d, wall);
    box(c.glow, 4.2, 1.8, 0.1, c.s.glow, 1.0, 0.7, d / 2 + 0.03);
    for (let i = 0; i < 4; i++) box(c.g, 0.08, 1.8, 0.14, trim, -1.1 + i * 1.4, 0.7, d / 2 + 0.05);
    box(c.g, 4.4, 0.16, 0.2, trim, 1.0, 2.5, d / 2 + 0.05);
    doorway(c, st, -2.5, d / 2 + 0.02, trim);
    // The awning: alternating stripes in the frieze colours, tilted out over the street.
    for (let i = 0; i < 9; i++) {
      box(c.g, 0.6, 0.06, 1.6, i % 2 ? st.frieze[0] : '#ffffff', -w / 2 + 0.4 + i * 0.77, 2.95, d / 2 + 0.8);
    }
    for (let i = 0; i < 9; i++) cone(c.g, 0.3, 0.3, i % 2 ? st.frieze[0] : '#ffffff', -w / 2 + 0.4 + i * 0.77, 2.6, d / 2 + 1.55, 3);
    // The sign, hanging from a bracket.
    box(c.g, 0.08, 0.08, 1.2, '#2a2a30', w / 2 - 0.3, 3.8, d / 2 + 0.6);
    box(c.g, 0.1, 0.8, 1.0, st.frieze[1], w / 2 - 0.3, 3.0, d / 2 + 0.9);
    sphere(c.glow, 0.18, st.frieze[0], w / 2 - 0.3, 3.4, d / 2 + 0.9, 5);
    // Goods outside: crates of fruit, sacks, pots.
    for (let i = 0; i < 4; i++) {
      box(c.g, 0.7, 0.5, 0.6, '#a8703f', 0 + i * 0.8, 0, d / 2 + 1.3);
      for (let k = 0; k < 3; k++) sphere(c.g, 0.14, ['#ff6b3a', '#f2d14e', '#7fb35a', '#c83a5a'][(i + k) % 4], i * 0.8 - 0.2 + k * 0.2, 0.6, d / 2 + 1.3, 4);
    }
    for (const x of [-1.5, 1.5]) win(c, st, x, STOREY + 0.9, d / 2 + 0.03);
    frieze(c, st, w, h - 0.7, d / 2 + 0.02);
    const rh = roof(c, st, w, d, h, pick(c, c.s.roofs));
    return { r: 4.8, h: h + rh };
  },

  /** A tower: a round or square shaft with a balcony ring and the land's crown. */
  tower(c, st) {
    const wall = pick(c, c.s.walls), trim = pick(c, c.s.trims), round = st.roof !== 'flat' && st.roof !== 'hip';
    const floors = 3 + (c.rng.chance(0.5) ? 1 : 0), h = floors * STOREY, r = 2.8;
    if (round) cyl(c.g, r, r + 0.2, h, wall, 0, 0, 0, 12);
    else box(c.g, r * 2, h, r * 2, wall);
    box(c.g, 0.25, h, 0.25, trim, 0, 0, r + 0.1);
    doorway(c, st, 0, r + 0.12, trim);
    for (let f = 1; f < floors; f++) for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      win(c, st, Math.sin(a) * (r + 0.05), f * STOREY + 0.8, Math.cos(a) * (r + 0.05), a, 0.8, 1.2);
    }
    // A balcony ring near the top, with posts.
    cyl(c.g, r + 0.9, r + 0.9, 0.2, trim, 0, h - STOREY + 0.2, 0, 14);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; box(c.g, 0.06, 0.9, 0.06, trim, Math.cos(a) * (r + 0.85), h - STOREY + 0.4, Math.sin(a) * (r + 0.85)); }
    const rh = roof(c, st, r * 2, r * 2, h, pick(c, c.s.roofs));
    sphere(c.glow, 0.3, c.s.glow, 0, h + rh + 0.3, 0, 6);
    return { r: r + 1.2, h: h + rh + 0.6 };
  },

  /** A terrace: three narrow homes joined in a row, each its own colour, one roof line. */
  terrace(c, st) {
    const trim = pick(c, c.s.trims), w = 4, d = 6.5, h = STOREY * 2;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * w;
      box(c.g, w - 0.05, h, d, c.s.walls[(i + c.rng.int(0, 5)) % c.s.walls.length], x, 0, 0);
      c.g.frame(x, 0, 0, 0, 1, () => {
        doorway(c, st, -0.9, d / 2 + 0.02, trim);
        win(c, st, 0.9, 1.0, d / 2 + 0.03, 0, 0.8, 1.3);
        for (const wx of [-0.9, 0.9]) win(c, st, wx, STOREY + 0.9, d / 2 + 0.03, 0, 0.8, 1.3);
        box(c.g, 0.12, h, 0.12, trim, w / 2 - 0.06, 0, d / 2 + 0.05);
      });
      box(c.g, 0.5, 1.2, 0.5, '#b5654a', x + 1.2, h + 0.6, -1.5);
    }
    // Railings along the front.
    box(c.g, w * 3, 0.06, 0.06, '#2a2a30', 0, 0.9, d / 2 + 1.2);
    for (let i = 0; i < 24; i++) box(c.g, 0.04, 0.9, 0.04, '#2a2a30', -w * 1.5 + i * 0.52, 0, d / 2 + 1.2);
    frieze(c, st, w * 3, h - 0.7, d / 2 + 0.02);
    const rh = roof(c, st, w * 3, d, h, pick(c, c.s.roofs));
    return { r: 6.4, h: h + rh };
  },

  /** A courtyard house: walls round a small court with a tree and a fountain, arches along the front. */
  courtyard(c, st) {
    const wall = pick(c, c.s.walls), trim = pick(c, c.s.trims), s = 10, h = STOREY + 0.6;
    // Back range (two storeys) and two side wings.
    box(c.g, s, h * 2 - 1, 3.2, wall, 0, 0, -s / 2 + 1.6);
    for (const x of [-1, 1]) box(c.g, 2.6, h, s - 3.2, wall, x * (s / 2 - 1.3), 0, 1.6);
    for (let i = 0; i < 3; i++) win(c, st, -3 + i * 3, h + 0.6, -s / 2 + 3.25);
    // Front wall with an arcade of three arches and a gate.
    for (const x of [-3.5, 3.5]) box(c.g, 3, h - 0.6, 0.5, wall, x, 0, s / 2 - 0.25);
    doorway(c, st, 0, s / 2 - 0.05, trim);
    for (const x of [-3.6, 3.6]) archPanel(c.g, 1.6, 2.2, trim, x, 0.3, s / 2 + 0.02, 0, 0.1, st.arch === 'pointed');
    // In the court: a tree and a little fountain with glowing water.
    tree(c.g, pick(c, c.s.flora), 1.8, 0, 0.5, 0.9, () => c.rng.next());
    cyl(c.g, 1.1, 1.2, 0.5, '#e8dcc6', -1.6, 0, 1.2, 12);
    cyl(c.glow, 0.95, 0.95, 0.06, '#8ad8ff', -1.6, 0.5, 1.2, 12);
    cyl(c.g, 0.12, 0.15, 0.9, '#e8dcc6', -1.6, 0.5, 1.2, 6);
    frieze(c, st, s, h * 2 - 1.6, -s / 2 + 3.22);
    frieze(c, st, 9.4, h - 1.1, s / 2 + 0.01);
    let rh = 0;
    c.g.frame(0, 0, -s / 2 + 1.6, 0, 1, () => { rh = roof(c, st, s, 3.2, h * 2 - 1, pick(c, c.s.roofs)); });
    return { r: 6.8, h: h * 2 - 1 + rh };
  },
};

/** Build one of the land's building variants (the caller has placed the frame). */
export function buildVariant(c: Ctx): Footprint {
  const st = LAND_STYLE[c.s.id];
  return BUILD[pick(c, st.kinds)](c, st);
}
