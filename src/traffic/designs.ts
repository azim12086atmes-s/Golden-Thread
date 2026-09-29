import * as THREE from 'three';
import { animalHeadGap } from '../characters/anatomy';
import { type Piece, bird, dragonHead, dragonSegment, featheredWing, piece, quadruped, skyKoi, skyWhale } from './creatures';
import type { Shaper, V3 } from './shaper';
import { FANTASY_DESIGNS } from './fantasyDesigns';

/**
 * What travels each land's roads, waters and skies, modelled on the real thing (see
 * docs/ARCHITECTURE_RESEARCH.md, "Vehicles and sky traffic"): London's red double-decker and
 * black cab, New Yonder's solar trams, electric cabs and air taxis, Venetian gondolas, Chinese
 * junks and dragon boats, Egyptian feluccas and the golden sun-barque, Kerala's houseboats,
 * Bali's outriggers, airships with cruciform fins, Leonardo's flying machine, sky whales...
 *
 * Nothing carries a person: seats are empty, cabins are glass that glows at night. Creatures
 * pulling carts and flying overhead keep the rules every animal keeps (creatures.ts).
 */

export type Realm = 'road' | 'water' | 'sky';

export interface Design {
  id: string;
  name: string;
  realm: Realm;
  /** Length (m), for spacing on a route. */
  len: number;
  /** Cruising speed (m/s). */
  speed: number;
  pieces: Piece[];
  /** A long body that follows its head along the route (festival dragon, kite tails). */
  chain?: { n: number; spacing: number; piece: Piece; palette: string[] };
  /** Several that travel together (a flock, a caravan), this far apart. */
  group?: { n: number; spacing: number };
  /** Sky: height range above the town (m). */
  alt?: [number, number];
  /** Sky: how widely it circles the town (m). */
  radius?: [number, number];
  /** Bobbing up and down as it goes (sky and water). */
  bob?: number;
  /** Banking into its turns (0 none). */
  bank?: number;
}

type C = string;
const GLASS = '#1c2836', WARM = '#ffd9a0', HEAD = '#fff6d8', TAIL = '#ff4a3a', CHROME = '#d8dce4', BLACK = '#1b1b20';
const P = (fn: (s: Shaper) => void, anim: Piece['anim'] = 'none', pivot: V3 = [0, 0, 0], amp = 0) => piece(fn, 'vehicle', anim, pivot, amp);

/** Lit windows along a side: dark glass by day, warm light by night. */
function windows(s: Shaper, n: number, x: number, y: number, z0: number, z1: number, w: number, h: number): void {
  const step = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const z = z0 + step * (i + 0.5);
    for (const sx of [-1, 1]) {
      s.box(0.04, h, w, GLASS, [sx * x, y, z]);
      s.box(0.02, h * 0.9, w * 0.9, WARM, [sx * (x + 0.03), y, z], { glow: true });
    }
  }
}

function lamps(s: Shaper, halfW: number, y: number, front: number, back: number): void {
  for (const sx of [-1, 1]) {
    s.ball(0.12, HEAD, [sx * halfW, y, front], { seg: 8 });
    s.ball(0.1, HEAD, [sx * halfW, y, front + 0.04], { glow: true, seg: 6 });
    s.box(0.2, 0.12, 0.05, TAIL, [sx * halfW, y, back], { glow: true });
  }
}

// ───────────────────────── road ─────────────────────────

function bus(id: string, name: string, body: C, band: C, len: number, decks: 1 | 2, extra?: (s: Shaper) => void): Design {
  const h = decks === 2 ? 4.3 : 3.1, w = 2.5;
  return {
    id, name, realm: 'road', len, speed: 8,
    pieces: [P((s) => {
      s.box(w, h - 0.5, len, body, [0, (h - 0.5) / 2 + 0.45, 0]);
      s.box(w + 0.02, 0.18, len + 0.02, band, [0, 1.25, 0]);
      s.box(w - 0.1, 0.12, len - 0.2, body, [0, h + 0.02, 0]);
      windows(s, Math.round(len / 1.6), w / 2, 1.9, -len / 2 + 0.6, len / 2 - 1.2, 1.3, 0.9);
      if (decks === 2) windows(s, Math.round(len / 1.5), w / 2, 3.45, -len / 2 + 0.4, len / 2 - 0.3, 1.25, 0.85);
      s.box(w - 0.3, 1.2, 0.05, GLASS, [0, 1.95, len / 2]);
      s.box(w - 0.5, 0.3, 0.06, '#ffb000', [0, h - 0.35, len / 2 + 0.01], { glow: true });
      for (const z of [len / 2 - 1.4, -len / 2 + 1.8]) for (const sx of [-1, 1]) s.wheel(0.5, 0.35, [sx * (w / 2 - 0.1), 0.5, z]);
      lamps(s, w / 2 - 0.3, 0.8, len / 2 + 0.02, -len / 2 - 0.02);
      extra?.(s);
    })],
  };
}

function car(id: string, name: string, body: C, roof: C, opts: { len?: number; round?: boolean; taxi?: C; solar?: boolean; neon?: C; fins?: boolean; chrome?: boolean; h?: number } = {}): Design {
  const len = opts.len ?? 4.4, w = 1.8, h = opts.h ?? 1.45;
  return {
    id, name, realm: 'road', len, speed: 10,
    pieces: [P((s) => {
      if (opts.round) {
        s.ball(1, body, [0, 0.72, 0], { s: [w / 2, 0.42, len / 2], seg: 18 });
        s.ball(1, roof, [0, 1.05, -0.2], { s: [w / 2 - 0.1, 0.5, len * 0.28], seg: 16 });
        for (const sx of [-1, 1]) for (const z of [len * 0.3, -len * 0.3]) s.ball(0.42, body, [sx * (w / 2 - 0.05), 0.55, z], { s: [0.5, 0.9, 1.3] });
      } else {
        s.box(w, 0.7, len, body, [0, 0.72, 0]);
        s.box(w - 0.12, 0.58, len * 0.52, roof, [0, 1.36, -0.15]);
        s.box(w - 0.2, 0.5, 0.05, GLASS, [0, 1.36, len * 0.11]);
        s.box(w - 0.2, 0.46, 0.05, GLASS, [0, 1.36, -len * 0.41]);
        windows(s, 2, (w - 0.12) / 2, 1.38, -len * 0.38, len * 0.08, len * 0.2, 0.42);
      }
      if (opts.chrome) for (const z of [len / 2, -len / 2]) s.box(w + 0.05, 0.14, 0.12, CHROME, [0, 0.45, z]);
      if (opts.fins) for (const sx of [-1, 1]) s.shape([[0, 0], [0.9, 0], [0, 0.35]], 0.06, body, [sx * (w / 2 - 0.1), 1.05, -len / 2 + 0.05], { r: [0, -Math.PI / 2, 0] });
      if (opts.taxi) { s.box(0.55, 0.16, 0.25, opts.taxi, [0, h + 0.08, -0.1]); s.box(0.5, 0.12, 0.2, opts.taxi, [0, h + 0.08, -0.1], { glow: true }); }
      if (opts.solar) s.box(w - 0.3, 0.04, len * 0.45, '#1d3566', [0, h + 0.06, -0.15]);
      if (opts.neon) { s.box(0.03, 0.05, len * 0.8, opts.neon, [w / 2 + 0.02, 0.35, 0], { glow: true }); s.box(0.03, 0.05, len * 0.8, opts.neon, [-w / 2 - 0.02, 0.35, 0], { glow: true }); }
      for (const z of [len * 0.32, -len * 0.3]) for (const sx of [-1, 1]) s.wheel(0.34, 0.24, [sx * (w / 2 - 0.08), 0.34, z], BLACK, opts.chrome ? '#f4f4f4' : '#9aa0aa');
      lamps(s, w / 2 - 0.25, 0.75, len / 2 + 0.01, -len / 2 - 0.01);
    })],
  };
}

function tram(id: string, name: string, body: C, trim: C, len: number, solar = false): Design {
  const w = 2.4, h = 3.2;
  return {
    id, name, realm: 'road', len, speed: 7,
    pieces: [P((s) => {
      s.box(w, h - 0.4, len, body, [0, h / 2 + 0.2, 0]);
      s.box(w + 0.02, 0.3, len + 0.02, trim, [0, 0.6, 0]);
      for (const z of [len / 2, -len / 2]) s.ball(1, body, [0, h / 2 + 0.2, z], { s: [w / 2, (h - 0.4) / 2, 0.5] });
      windows(s, Math.round(len / 1.8), w / 2, 2.0, -len / 2 + 0.5, len / 2 - 0.5, 1.5, 1.1);
      s.box(w - 0.4, 1.1, 0.05, GLASS, [0, 2.0, len / 2 + 0.47]);
      if (solar) s.box(w - 0.2, 0.06, len - 1, '#1d3566', [0, h + 0.05, 0]);
      s.rod([0, h + 0.1, 0], [0, h + 1.1, 0.8], 0.04, BLACK);
      s.box(1.0, 0.05, 0.1, BLACK, [0, h + 1.1, 0.8]);
      if (solar) { s.box(0.04, 0.08, len * 0.9, '#3ae8ff', [w / 2 + 0.02, 0.9, 0], { glow: true }); s.box(0.04, 0.08, len * 0.9, '#3ae8ff', [-w / 2 - 0.02, 0.9, 0], { glow: true }); }
      lamps(s, w / 2 - 0.3, 0.9, len / 2 + 0.5, -len / 2 - 0.5);
    })],
  };
}

function cart(id: string, name: string, animal: Parameters<typeof quadruped>[0], pair: boolean, body: (s: Shaper) => void, speed = 3.5, len = 7): Design {
  const pieces: Piece[] = [];
  const front = len / 2 - animal.len / 2 - 0.2;
  for (const x of pair ? [-0.75, 0.75] : [0]) pieces.push(...quadruped(animal, [x, 0, front]));
  pieces.push(P((s) => {
    body(s);
    for (const x of pair ? [-0.75, 0.75] : [0]) s.rod([x * 0.6, animal.h * 0.6, front - animal.len * 0.4], [x * 0.3, 0.9, 0.2], 0.04, '#5a3a26');
  }));
  return { id, name, realm: 'road', len, speed, pieces };
}

const HORSE = (col: string, mane: string, extra: Partial<Parameters<typeof quadruped>[0]> = {}) => ({ len: 1.9, h: 1.55, girth: 0.36, col, col2: mane, neckLen: 0.7, neckUp: 0.95, headR: 0.2, snout: 1.2, mane: true, tail: 'hair' as const, ...extra });
const BULLOCK = (col: string) => ({ len: 2.0, h: 1.4, girth: 0.42, col, col2: '#f4efe6', neckLen: 0.35, neckUp: 0.4, headR: 0.24, hump: 1 as const, horns: 'ox' as const, tail: 'tuft' as const, ears: 'round' as const });
const CAMEL = { len: 2.2, h: 2.0, girth: 0.42, col: '#c9a06a', col2: '#b88a52', neckLen: 1.0, neckUp: 0.75, headR: 0.2, snout: 1.3, hump: 1 as const, tail: 'tuft' as const, ears: 'round' as const };

function carriage(s: Shaper, body: C, roof: C, trim: C, wheels: C): void {
  s.ball(1, body, [0, 1.55, -0.9], { s: [0.8, 0.75, 1.1], seg: 16 });
  s.box(1.5, 0.12, 2.0, trim, [0, 0.95, -0.9]);
  s.ball(1, roof, [0, 2.2, -0.9], { s: [0.78, 0.25, 1.05], seg: 14 });
  s.ball(0.12, trim, [0, 2.5, -0.9]);
  for (const sx of [-1, 1]) { s.box(0.04, 0.5, 0.7, GLASS, [sx * 0.8, 1.7, -0.9]); s.box(0.02, 0.45, 0.62, WARM, [sx * 0.83, 1.7, -0.9], { glow: true }); }
  for (const [z, r] of [[0.2, 0.5], [-1.9, 0.72]] as const) for (const sx of [-1, 1]) s.wheel(r, 0.1, [sx * 0.85, r, z], wheels, trim);
  s.ball(0.12, '#ffcf7a', [0.85, 2.0, 0.3], { glow: true, seg: 6 });
}

function autoRickshaw(id: string, body: C, hood: C): Design {
  return {
    id, name: 'auto-rickshaw', realm: 'road', len: 2.7, speed: 8,
    pieces: [P((s) => {
      s.box(1.3, 0.5, 2.4, body, [0, 0.55, -0.1]);
      s.ball(1, body, [0, 0.95, 0.95], { s: [0.5, 0.55, 0.35] });
      s.ball(1, hood, [0, 1.75, -0.3], { s: [0.7, 0.35, 1.25], seg: 14 });
      for (const sx of [-1, 1]) s.rod([sx * 0.6, 0.8, 0.8], [sx * 0.62, 1.75, 0.6], 0.03, BLACK);
      s.box(1.1, 0.5, 0.04, GLASS, [0, 1.35, 1.1]);
      s.box(1.1, 0.4, 0.5, '#e8dcc0', [0, 0.95, -0.9]);
      s.wheel(0.26, 0.15, [0, 0.26, 1.05]);
      for (const sx of [-1, 1]) s.wheel(0.26, 0.15, [sx * 0.6, 0.26, -0.9]);
      s.ball(0.1, HEAD, [0, 0.9, 1.3], { glow: true, seg: 6 });
    })],
  };
}

function caravan(id: string, name: string, animal: Parameters<typeof quadruped>[0], n: number, packs: C[]): Design {
  return {
    id, name, realm: 'road', len: animal.len + 1.2, speed: 1.8, group: { n, spacing: animal.len + 1.4 },
    pieces: quadruped({ ...animal, load: (s, top) => {
      s.box(0.95, 0.12, 1.1, packs[0], [0, top + 0.28, 0]);
      for (const sx of [-1, 1]) s.box(0.3, 0.55, 0.7, packs[1] ?? packs[0], [sx * 0.55, top - 0.1, -0.05]);
      s.box(0.9, 0.05, 1.12, packs[2] ?? packs[0], [0, top + 0.36, 0]);
    } }),
  };
}

// ───────────────────────── water ─────────────────────────

function sailBoat(id: string, name: string, hull: C, sail: C, len: number, kind: 'lateen' | 'square' | 'batten' | 'bermuda' | 'crab', opts: { masts?: number; sheer?: number; cabin?: C; stripes?: C; oars?: boolean; shields?: C[] } = {}): Design {
  const beam = len * 0.28, mh = len * (kind === 'lateen' ? 0.95 : 0.8);
  return {
    id, name, realm: 'water', len, speed: 3.2, bob: 0.12,
    pieces: [P((s) => {
      s.hull(len, beam, len * 0.12, hull, [0, 0.35, 0], { sheer: opts.sheer ?? len * 0.02, deck: '#b08a5a' });
      if (opts.cabin) { s.box(beam * 0.55, 1.1, len * 0.22, opts.cabin, [0, 0.9, -len * 0.22]); windows(s, 2, beam * 0.28, 1.0, -len * 0.32, -len * 0.12, 0.4, 0.35); }
      if (opts.shields) for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) s.cyl(0.32, 0.32, 0.05, opts.shields[(i + (sx > 0 ? 1 : 0)) % opts.shields.length], [sx * beam * 0.46, 0.55, -len * 0.3 + i * len * 0.08], { r: [0, 0, Math.PI / 2], seg: 10 });
      if (opts.oars) for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) s.rod([sx * beam * 0.4, 0.5, -len * 0.25 + i * len * 0.1], [sx * beam * 1.3, -0.1, -len * 0.28 + i * len * 0.1], 0.03, '#8a6444');
      const masts = opts.masts ?? 1;
      for (let m = 0; m < masts; m++) {
        const z = masts === 1 ? len * 0.1 : len * (0.25 - m * 0.35);
        const hh = mh * (m ? 0.8 : 1);
        s.cyl(0.06, 0.09, hh, '#6b4a2a', [0, 0.4 + hh / 2, z], { seg: 6 });
        if (kind === 'lateen') s.shape([[0, 0], [len * 0.55, hh * 0.95], [-len * 0.2, hh * 0.1]], 0.03, sail, [0, 0.9, z - len * 0.05], { r: [0, -Math.PI / 2 + 0.1, 0] });
        else if (kind === 'crab') s.shape([[0, 0], [len * 0.35, hh], [-len * 0.3, hh * 0.9]], 0.03, sail, [0, 0.8, z], { r: [0, -Math.PI / 2 + 0.15, 0] });
        else if (kind === 'bermuda') s.shape([[0, 0], [len * 0.45, 0], [0, hh * 0.92]], 0.03, sail, [0, 0.9, z], { r: [0, Math.PI / 2, 0] });
        else if (kind === 'square') {
          s.box(len * 0.55, hh * 0.55, 0.04, sail, [0, 0.5 + hh * 0.55, z]);
          if (opts.stripes) for (let k = 0; k < 3; k++) s.box(len * 0.09, hh * 0.55, 0.05, opts.stripes, [-len * 0.18 + k * len * 0.18, 0.5 + hh * 0.55, z]);
          s.rod([-len * 0.29, 0.5 + hh * 0.83, z], [len * 0.29, 0.5 + hh * 0.83, z], 0.05, '#6b4a2a');
        } else {
          // Junk: a battened lug sail, ribbed with bamboo.
          s.shape([[-len * 0.12, 0], [len * 0.28, 0], [len * 0.3, hh * 0.85], [-len * 0.2, hh * 0.95]], 0.03, sail, [0, 0.9, z], { r: [0, Math.PI / 2, 0] });
          for (let k = 0; k < 6; k++) s.box(0.05, 0.05, len * 0.46, '#4a3426', [0.03, 0.9 + (k + 0.5) * hh * 0.15, z + len * 0.04]);
        }
      }
      s.ball(0.1, WARM, [0, mh + 0.5, len * 0.1], { glow: true, seg: 6 });
    })],
  };
}

function rowBoat(id: string, name: string, hull: C, len: number, opts: { sheer?: number; canopy?: C; canopyTrim?: C; roof?: 'barrel' | 'flat' | 'thatch'; prow?: (s: Shaper) => void; cushions?: C; beam?: number; lanterns?: C } = {}): Design {
  const beam = opts.beam ?? len * 0.2;
  return {
    id, name, realm: 'water', len, speed: 2.4, bob: 0.08,
    pieces: [P((s) => {
      s.hull(len, beam, Math.max(0.35, len * 0.07), hull, [0, 0.3, 0], { sheer: opts.sheer ?? 0.2, deck: '#9a7450' });
      if (opts.cushions) s.box(beam * 0.6, 0.2, len * 0.25, opts.cushions, [0, 0.45, 0]);
      if (opts.canopy) {
        const cl = len * 0.45, ch = 1.6;
        for (const z of [-cl / 2, cl / 2]) for (const sx of [-1, 1]) s.rod([sx * beam * 0.38, 0.4, z], [sx * beam * 0.38, 0.4 + ch, z], 0.04, opts.canopyTrim ?? '#6b4a2a');
        if (opts.roof === 'barrel' || opts.roof === 'thatch') s.cyl(beam * 0.45, beam * 0.45, cl + 0.3, opts.canopy, [0, 0.4 + ch, 0], { r: [Math.PI / 2, 0, 0], seg: 12, s: [1, 1, 0.7] });
        else s.box(beam * 0.9, 0.12, cl + 0.3, opts.canopy, [0, 0.46 + ch, 0]);
        if (opts.canopyTrim) s.box(beam * 0.92, 0.18, cl + 0.32, opts.canopyTrim, [0, 0.36 + ch, 0]);
        if (opts.lanterns) for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) s.ball(0.14, opts.lanterns, [sx * beam * 0.45, 0.2 + ch, -cl / 2 + i * cl / 4], { glow: true, s: [1, 1.2, 1], seg: 8 });
      }
      opts.prow?.(s);
    })],
  };
}

function ferry(id: string, name: string, hull: C, deck: C, len: number, solar: boolean): Design {
  const beam = len * 0.3;
  return {
    id, name, realm: 'water', len, speed: 4, bob: 0.06,
    pieces: [P((s) => {
      s.hull(len, beam, 1.4, hull, [0, 0.6, 0], { bluff: 0.95, sheer: 0.3, deck: '#8a8a94' });
      s.box(beam * 0.8, 2.2, len * 0.6, deck, [0, 1.8, -len * 0.05]);
      s.box(beam * 0.7, 1.8, len * 0.45, deck, [0, 3.8, -len * 0.08]);
      windows(s, 8, beam * 0.4, 1.9, -len * 0.33, len * 0.23, 1.0, 0.8);
      windows(s, 6, beam * 0.35, 3.8, -len * 0.28, len * 0.14, 1.0, 0.8);
      if (solar) s.box(beam * 0.9, 0.08, len * 0.55, '#1d3566', [0, 4.8, -len * 0.08]);
      else s.cyl(0.6, 0.7, 2.2, '#c23b2a', [0, 5.6, -len * 0.15]);
      s.box(beam * 0.5, 0.9, 1.2, deck, [0, 5.1, len * 0.08]);
      s.box(beam * 0.45, 0.5, 0.05, GLASS, [0, 5.2, len * 0.08 + 0.61]);
    })],
  };
}

function paddleSteamer(): Design {
  const len = 22, beam = 5;
  return {
    id: 'paddle-steamer', name: 'paddle steamer', realm: 'water', len, speed: 3.6, bob: 0.05,
    pieces: [
      P((s) => {
        s.hull(len, beam, 1.2, '#fbf7ee', [0, 0.6, 0], { bluff: 0.9, deck: '#9a7450' });
        s.box(beam * 0.75, 1.8, len * 0.62, '#fbf7ee', [0, 1.6, -1]);
        s.box(beam * 0.9, 0.12, len * 0.66, '#c23b2a', [0, 2.55, -1]);
        windows(s, 9, beam * 0.375, 1.6, -len * 0.35, len * 0.25, 0.9, 0.8);
        for (const z of [1.5, -3]) { s.cyl(0.45, 0.5, 3, '#f2c14e', [0, 3.8, z]); s.cyl(0.5, 0.5, 0.35, BLACK, [0, 5.4, z]); }
        for (const sx of [-1, 1]) s.cyl(2.1, 2.1, 1, '#c23b2a', [sx * (beam / 2 + 0.3), 1.2, -1], { r: [0, 0, Math.PI / 2], s: [1, 1, 1], seg: 14 });
        s.rod([0, 2.6, len / 2 - 1], [0, 5.5, -1], 0.03, '#f4f4f4');
      }),
      ...[1, -1].map((sx) => P((s) => {
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; s.box(0.9, 0.12, 1.6, '#8a5a36', [sx * (beam / 2 + 0.3), 1.2 + Math.sin(a) * 1.5, -1 + Math.cos(a) * 1.5], { r: [a, 0, 0] }); }
      }, 'spinX', [sx * (beam / 2 + 0.3), 1.2, -1], 0.25)),
    ],
  };
}

function swanBoat(): Design {
  const len = 3.2;
  return {
    id: 'swan-boat', name: 'swan boat', realm: 'water', len, speed: 1.6, bob: 0.06,
    pieces: [
      P((s) => {
        s.hull(len, 1.6, 0.5, '#ffffff', [0, 0.3, 0], { sheer: 0.25, deck: '#ffe0ec' });
        s.box(1.1, 0.35, 0.9, '#ff8fb8', [0, 0.55, -0.3]);
        for (const sx of [1, -1]) s.ball(0.9, '#ffffff', [sx * 0.7, 0.75, -0.4], { s: [0.2, 0.55, 1.1], r: [0, 0, -sx * 0.4] });
        s.rod([0, 0.5, 1.2], [0, 1.8, 1.45], 0.13, '#ffffff');
      }),
      piece((s) => {
        const r = 0.24, y = 1.8 + animalHeadGap(r) + r;
        s.ball(r, '#ffffff', [0, y, 1.5], { s: [0.8, 0.9, 1.1] });
        s.cone(r * 0.4, r * 1.3, '#ff9a3a', [0, y - 0.05, 1.5 + r * 1.2], { r: [Math.PI / 2 - 0.2, 0, 0], seg: 6 });
      }, 'head'),
    ],
  };
}

// ───────────────────────── sky ─────────────────────────

function airship(id: string, name: string, env: C, fin: C, gondola: C, len: number, solar = false): Design {
  const R = len * 0.16;
  const prop = (x: number, z: number) => P((s) => {
    for (let k = 0; k < 3; k++) s.box(0.12, 1.3, 0.05, '#3a3a44', [x, -R - 0.2, z], { r: [0, 0, (k / 3) * Math.PI * 2] });
  }, 'spinZ', [x, -R - 0.2, z], 3);
  return {
    id, name, realm: 'sky', len, speed: 11, alt: [60, 110], radius: [180, 380], bob: 1.5, bank: 0.05,
    pieces: [
      P((s) => {
        s.lathe([[0.02, -len / 2], [R * 0.45, -len * 0.42], [R * 0.85, -len * 0.25], [R, 0], [R * 0.95, len * 0.2], [R * 0.7, len * 0.38], [0.02, len / 2]], env, [0, 0, 0], { seg: 20 });
        if (solar) for (let i = 0; i < 6; i++) s.box(R * 0.9, 0.06, len * 0.08, '#1d3566', [0, R * 0.97, -len * 0.25 + i * len * 0.1]);
        else for (let i = 0; i < 5; i++) s.cyl(R * 1.005, R * 1.005, 0.12, fin, [0, 0, -len * 0.3 + i * len * 0.15], { r: [Math.PI / 2, 0, 0], seg: 20, s: [1, 1, 1] });
        for (let k = 0; k < 4; k++) s.shape([[0, 0], [R * 1.4, -len * 0.02], [R * 0.9, -len * 0.16], [0, -len * 0.18]], 0.08, fin, [0, 0, -len * 0.3], { r: [0, 0, (k / 4) * Math.PI * 2 + Math.PI / 4] });
        s.box(R * 0.55, R * 0.45, len * 0.28, gondola, [0, -R - 0.35, len * 0.05]);
        windows(s, 5, R * 0.28, -R - 0.3, -len * 0.08, len * 0.18, 0.6, 0.35);
        for (const z of [-len * 0.06, len * 0.16]) for (const sx of [-1, 1]) s.rod([sx * R * 0.25, -R * 0.2, z], [sx * R * 0.25, -R - 0.15, z], 0.03, '#3a3a44');
        for (const sx of [-1, 1]) { s.rod([0, -R - 0.2, -len * 0.05], [sx * R * 0.9, -R - 0.2, -len * 0.05], 0.06, '#3a3a44'); s.cyl(0.35, 0.3, 1.2, '#8a8a94', [sx * R * 0.9, -R - 0.2, -len * 0.05], { r: [Math.PI / 2, 0, 0] }); }
        s.ball(0.2, '#ff3a3a', [R * 0.95, 0, 0], { glow: true, seg: 6 });
        s.ball(0.2, '#3aff6a', [-R * 0.95, 0, 0], { glow: true, seg: 6 });
      }),
      prop(R * 0.9, -len * 0.05 - 0.65), prop(-R * 0.9, -len * 0.05 - 0.65),
    ],
  };
}

function airTaxi(id: string, body: C, neon: C): Design {
  const rotor = (x: number, z: number) => P((s) => {
    for (let k = 0; k < 2; k++) s.box(1.5, 0.03, 0.14, '#2a2a30', [x, 1.35, z], { r: [0, (k / 2) * Math.PI, 0] });
  }, 'spinY', [x, 1.35, z], 6);
  return {
    id, name: 'air taxi', realm: 'sky', len: 5, speed: 18, alt: [28, 60], radius: [70, 260], bob: 0.6, bank: 0.25,
    pieces: [
      P((s) => {
        s.ball(1, body, [0, 0.9, 0], { s: [0.95, 0.75, 1.9], seg: 18 });
        s.ball(1, GLASS, [0, 1.2, 0.5], { s: [0.8, 0.5, 1.1], seg: 14 });
        s.ball(1, WARM, [0, 1.2, 0.5], { s: [0.75, 0.45, 1.0], glow: true, seg: 10 });
        for (const [x, z] of [[2, 1.5], [-2, 1.5], [2, -1.5], [-2, -1.5]]) { s.rod([0, 1.0, z * 0.4], [x, 1.25, z], 0.06, body); s.cyl(0.8, 0.8, 0.12, body, [x, 1.28, z], { seg: 16 }); s.add(new THREE.TorusGeometry(0.8, 0.04, 4, 20), neon, [x, 1.28, z], { r: [Math.PI / 2, 0, 0], glow: true }); }
        s.box(0.05, 0.05, 2.8, neon, [0.9, 0.9, 0], { glow: true });
        s.box(0.05, 0.05, 2.8, neon, [-0.9, 0.9, 0], { glow: true });
        for (const sx of [-1, 1]) s.rod([sx * 0.5, 0.45, 0.8], [sx * 0.6, 0, 0.8], 0.04, CHROME);
      }),
      rotor(2, 1.5), rotor(-2, 1.5), rotor(2, -1.5), rotor(-2, -1.5),
    ],
  };
}

function biplane(id: string, body: C, wing: C, banner?: C): Design {
  return {
    id, name: 'biplane', realm: 'sky', len: 7, speed: 22, alt: [45, 90], radius: [200, 420], bob: 1, bank: 0.35,
    pieces: [
      P((s) => {
        s.lathe([[0.1, -3.4], [0.35, -2.2], [0.6, 0], [0.62, 1.8], [0.55, 2.4]], body, [0, 1.2, 0], { seg: 12 });
        for (const y of [0.7, 2.3]) s.box(9, 0.12, 1.4, wing, [0, y, 0.6]);
        for (const x of [-3.5, -1.2, 1.2, 3.5]) s.rod([x, 0.75, 0.6], [x, 2.25, 0.6], 0.04, '#6b4a2a');
        s.box(3, 0.08, 0.9, wing, [0, 1.3, -3.1]);
        s.shape([[0, 0], [0.9, 0], [0, 1.1]], 0.06, wing, [0, 1.35, -3.3], { r: [0, -Math.PI / 2, 0] });
        s.cyl(0.6, 0.6, 0.3, '#5a5a64', [0, 1.2, 2.45], { r: [Math.PI / 2, 0, 0], seg: 12 });
        for (const sx of [-1, 1]) { s.rod([sx * 0.4, 0.8, 1.0], [sx * 0.8, 0.1, 1.1], 0.04, '#3a3a44'); s.wheel(0.3, 0.12, [sx * 0.8, 0.3, 1.1]); }
        if (banner) {
          s.rod([0, 1.2, -3.5], [0, 1.2, -8], 0.015, '#dddddd');
          s.box(0.04, 1.2, 7, banner, [0, 1.2, -11.6]);
          for (let i = 0; i < 6; i++) s.box(0.05, 0.4, 0.4, '#ffffff', [0, 1.2, -9 - i * 1.1]);
        }
      }),
      P((s) => { for (let k = 0; k < 2; k++) s.box(0.18, 2.2, 0.06, '#4a3426', [0, 1.2, 2.65], { r: [0, 0, (k / 2) * Math.PI + 0.3] }); }, 'spinZ', [0, 1.2, 2.65], 8),
    ],
  };
}

function ornithopter(): Design {
  const frame = '#8a6444', cloth = '#e8d6a0';
  return {
    id: 'ornithopter', name: 'Leonardo’s flying machine', realm: 'sky', len: 6, speed: 9, alt: [35, 70], radius: [120, 260], bob: 2, bank: 0.2,
    pieces: [
      P((s) => {
        s.box(0.3, 0.3, 5, frame, [0, 0, 0]);
        s.box(1.2, 0.08, 1.4, frame, [0, -0.3, 0.3]);
        s.shape([[0, 0], [1.6, 0.4], [1.4, -0.6], [-1.4, -0.6], [-1.6, 0.4]], 0.04, cloth, [0, 0.1, -2.7], { r: [Math.PI / 2, 0, 0] });
        for (let i = 0; i < 4; i++) s.rod([0, 0.1, -2 + i * 0.8], [0, 1.2, -1 + i * 0.3], 0.03, frame);
      }),
      ...[1, -1].map((sx) => P((s) => {
        for (let i = 0; i < 5; i++) s.rod([sx * 0.2, 0.1, 0.8 - i * 0.05], [sx * (1 + i * 1.1), 0.25 - i * 0.05, 0.9 - i * 0.55], 0.04, frame);
        s.shape([[0, 0], [5.5, 0.2], [5.2, -1.3], [3.5, -2.4], [1.5, -2.0], [0, -1.2]].map(([x, y]) => [x * sx, y]), 0.03, cloth, [sx * 0.2, 0.15, 0.9], { r: [Math.PI / 2, 0, 0] });
      }, sx > 0 ? 'flapL' : 'flapR', [sx * 0.2, 0.1, 0.5], 0.5)),
    ],
  };
}

/** A paraglider: a bright curved wing of cells, its lines, and the pilot's pod hanging beneath. */
function paraglider(): Design {
  const wing = P((s) => {
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 0.7, x = Math.sin(a) * 4.2, y = Math.cos(a) * 1.2 - 1.2;
      s.box(0.95, 0.18, 1.4, ['#ff4a4a', '#ffd24a', '#4ac8ff', '#ffffff'][(i + 4) % 4], [x, y + 5, 0], { r: [0, 0, -a] });
      s.rod([x * 0.95, y + 4.9, 0.3], [0, 0.4, 0], 0.01, '#e8e8e8');
    }
    s.box(0.5, 0.5, 0.8, '#2a3a5a', [0, 0, 0]); // the harness pod
  });
  return { id: 'paraglider', name: 'a paraglider', realm: 'sky', len: 2, speed: 7, alt: [60, 130], radius: [120, 300], bob: 3, bank: 0.35, pieces: [wing] };
}

function seaplane(): Design {
  return {
    id: 'seaplane', name: 'seaplane', realm: 'sky', len: 9, speed: 20, alt: [40, 80], radius: [220, 420], bob: 0.8, bank: 0.3,
    pieces: [
      P((s) => {
        s.lathe([[0.15, -4.4], [0.5, -3], [0.8, 0], [0.8, 2], [0.5, 3]], '#e03a2a', [0, 1.6, 0], { seg: 12 });
        s.box(12, 0.14, 1.6, '#f4f1e8', [0, 2.6, 0.6]);
        s.box(0.6, 0.35, 0.05, GLASS, [0, 2.3, 1.6]);
        s.box(3.2, 0.1, 1, '#f4f1e8', [0, 1.9, -3.9]);
        s.shape([[0, 0], [1.2, 0], [0, 1.4]], 0.06, '#e03a2a', [0, 1.95, -4.2], { r: [0, -Math.PI / 2, 0] });
        for (const sx of [-1, 1]) { s.hull(4.5, 0.6, 0.3, '#f4f1e8', [sx * 1.3, 0.3, 0.4]); s.rod([sx * 0.4, 1.1, 1], [sx * 1.3, 0.4, 1], 0.05, '#3a3a44'); s.rod([sx * 2.5, 2.55, 0.6], [sx * 0.7, 1.4, 0.6], 0.04, '#3a3a44'); }
      }),
      P((s) => { for (let k = 0; k < 2; k++) s.box(0.18, 2.4, 0.06, '#3a3a44', [0, 1.6, 3.1], { r: [0, 0, (k / 2) * Math.PI] }); }, 'spinZ', [0, 1.6, 3.1], 9),
    ],
  };
}

function skyShip(id: string, name: string, hull: C, sail: C, wing: C, len: number): Design {
  const beam = len * 0.25;
  return {
    id, name, realm: 'sky', len, speed: 8, alt: [50, 100], radius: [160, 360], bob: 2.5, bank: 0.1,
    pieces: [
      P((s) => {
        s.hull(len, beam, len * 0.14, hull, [0, 0, 0], { sheer: len * 0.04, deck: '#b08a5a' });
        s.box(beam * 0.6, 1.4, len * 0.2, hull, [0, 0.7, -len * 0.3]);
        windows(s, 3, beam * 0.3, 0.8, -len * 0.4, -len * 0.2, 0.5, 0.4);
        for (const [z, hh] of [[len * 0.18, len * 0.7], [-len * 0.12, len * 0.6]]) {
          s.cyl(0.1, 0.14, hh, '#6b4a2a', [0, hh / 2, z], { seg: 6 });
          for (let k = 0; k < 2; k++) s.box(len * 0.42 * (1 - k * 0.25), hh * 0.3, 0.05, sail, [0, hh * (0.35 + k * 0.33), z], { s: [1, 1, 1] });
        }
        s.shape([[0, 0], [len * 0.35, len * 0.3], [-len * 0.05, len * 0.1]], 0.03, sail, [0, 0.4, len * 0.42], { r: [0, -Math.PI / 2, 0] });
        for (let i = 0; i < 8; i++) s.ball(0.12, WARM, [(i % 2 ? 1 : -1) * beam * 0.5, 0.25, -len * 0.35 + i * len * 0.1], { glow: true, seg: 6 });
        for (let i = 0; i < 6; i++) s.ball(0.3, '#ffe9a8', [0, -len * 0.14 - 0.2, -len * 0.3 + i * len * 0.12], { glow: true, seg: 6 });
      }),
      ...[1, -1].map((sx) => featheredWing(wing, sx, [sx * beam * 0.45, 0.3, len * 0.05], len * 0.7, len * 0.3, '#ffffff')).map((p) => ({ ...p, part: 'vehicle' as const, amp: 0.3 })),
    ],
  };
}

function flyingCarpet(id: string, cols: C[]): Design {
  return {
    id, name: 'flying carpet', realm: 'sky', len: 3, speed: 9, alt: [22, 55], radius: [60, 220], bob: 1.2, bank: 0.35,
    pieces: [P((s) => {
      s.box(1.8, 0.06, 2.8, cols[0], [0, 0, 0]);
      s.box(1.5, 0.07, 2.5, cols[1], [0, 0, 0]);
      s.box(0.9, 0.08, 1.6, cols[2] ?? cols[0], [0, 0, 0]);
      for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) s.box(0.06, 0.02, 0.2, cols[1], [-0.75 + i * 0.3, 0, sz * 1.5]);
      for (let i = 0; i < 4; i++) s.ball(0.05, '#ffe9a8', [(i % 2 ? 0.5 : -0.5), 0.05, (i < 2 ? 0.8 : -0.8)], { glow: true, seg: 5 });
      s.box(0.9, 0.25, 0.4, cols[2] ?? cols[1], [0, 0.15, -0.9]);
    })],
  };
}

function solarBarque(): Design {
  const len = 16, gold = '#e2b43a';
  return {
    id: 'sun-barque', name: 'the golden sun-barque', realm: 'sky', len, speed: 6, alt: [70, 110], radius: [200, 320], bob: 1.5,
    pieces: [P((s) => {
      s.hull(len, 3, 1.2, gold, [0, 0, 0], { sheer: 2.2, deck: '#c9a060' });
      s.box(2.2, 1.6, 3, '#2f6f9a', [0, 0.9, -1]);
      s.box(2.3, 0.2, 3.1, gold, [0, 1.75, -1]);
      s.cyl(0.08, 0.1, 4, gold, [0, 2.2, 3]);
      s.cyl(1.4, 1.4, 0.15, '#ffcf5a', [0, 4.8, 3], { r: [Math.PI / 2, 0, 0], seg: 24 });
      s.cyl(1.2, 1.2, 0.2, '#fff0b0', [0, 4.8, 3], { r: [Math.PI / 2, 0, 0], glow: true, seg: 24 });
      for (const sz of [-1, 1]) s.ball(0.5, '#2f6f9a', [0, 2.6, sz * len * 0.47], { s: [0.5, 1, 0.5] });
      for (const sx of [-1, 1]) s.rod([sx * 1.2, 0.3, -len * 0.4], [sx * 2.2, -1.5, -len * 0.48], 0.07, gold);
    })],
  };
}

function vimana(): Design {
  const gold = '#e2b43a', pink = '#e8917a';
  return {
    id: 'pushpaka', name: 'the Pushpaka vimana', realm: 'sky', len: 12, speed: 6, alt: [70, 110], radius: [180, 320], bob: 2,
    pieces: [P((s) => {
      s.cyl(5, 4, 1.2, pink, [0, 0, 0], { seg: 16 });
      s.cyl(4.6, 4.6, 0.3, gold, [0, 0.7, 0], { seg: 16 });
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s.cyl(0.14, 0.14, 2.4, '#ffffff', [Math.cos(a) * 4, 2, Math.sin(a) * 4], { seg: 6 }); }
      s.cyl(4.4, 4.4, 0.4, pink, [0, 3.3, 0], { seg: 16 });
      for (let k = 0; k < 4; k++) s.cyl(3 - k * 0.65, 3.2 - k * 0.65, 1.2, k % 2 ? gold : pink, [0, 4.1 + k * 1.2, 0], { seg: 8 });
      s.ball(0.6, gold, [0, 9.2, 0]);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; s.ball(1, '#ffffff', [Math.cos(a) * 3.6, 4, Math.sin(a) * 3.6], { s: [0.9, 0.8, 0.9] }); s.cone(0.12, 0.8, gold, [Math.cos(a) * 3.6, 5.1, Math.sin(a) * 3.6], { seg: 5 }); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s.ball(0.16, '#ffcf7a', [Math.cos(a) * 4.9, -0.3, Math.sin(a) * 4.9], { glow: true, seg: 6 }); }
      s.ball(1.2, '#fff0b0', [0, 2, 0], { glow: true, seg: 10 });
    })],
  };
}

function drone(): Design {
  const rotor = (x: number, z: number) => P((s) => s.box(0.7, 0.02, 0.08, '#2a2a30', [x, 0.35, z]), 'spinY', [x, 0.35, z], 8);
  return {
    id: 'drone', name: 'delivery drone', realm: 'sky', len: 1.2, speed: 13, alt: [18, 40], radius: [50, 220], bob: 0.3, bank: 0.2, group: { n: 2, spacing: 30 },
    pieces: [
      P((s) => {
        s.box(0.5, 0.2, 0.5, '#e8e8f0', [0, 0.25, 0]);
        for (const [x, z] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) { s.rod([0, 0.28, 0], [x, 0.3, z], 0.03, '#3a3a44'); s.cyl(0.05, 0.05, 0.08, '#3a3a44', [x, 0.32, z]); }
        s.box(0.45, 0.4, 0.45, '#c9a06a', [0, -0.05, 0]);
        s.ball(0.05, '#3aff9a', [0, 0.36, 0.25], { glow: true, seg: 5 });
      }),
      rotor(0.5, 0.5), rotor(-0.5, 0.5), rotor(0.5, -0.5), rotor(-0.5, -0.5),
    ],
  };
}

function festivalDragon(): Design {
  const headR = 1.4, segR = 1.1, gap = animalHeadGap(headR);
  return {
    id: 'festival-dragon', name: 'the festival dragon', realm: 'sky', len: 4, speed: 9, alt: [55, 85], radius: [150, 260], bob: 5, bank: 0.2,
    pieces: [dragonHead('#e8342a', '#ffd23a', headR)],
    chain: { n: 22, spacing: headR * 1.2 + segR * 1.3 + gap, piece: dragonSegment(segR), palette: ['#e8342a', '#ffd23a', '#e8342a', '#2fae6a'] },
  };
}

function janggan(): Design {
  // Bali's great janggan kite: a bird-shaped frame with a tail ribbon a hundred metres long.
  const body = P((s) => {
    s.shape([[0, 1.2], [3.2, 0.2], [1.2, -0.4], [0, -1.6], [-1.2, -0.4], [-3.2, 0.2]], 0.05, '#ffffff', [0, 0, 0], { r: [Math.PI / 2, 0, 0] });
    s.shape([[0, 1.0], [2.6, 0.2], [1.0, -0.3], [0, -1.3], [-1.0, -0.3], [-2.6, 0.2]], 0.06, '#c23b2a', [0, 0.02, 0], { r: [Math.PI / 2, 0, 0] });
    s.shape([[0, 0.6], [1.2, 0], [0, -0.8], [-1.2, 0]], 0.07, '#e2b43a', [0, 0.04, 0], { r: [Math.PI / 2, 0, 0] });
    s.rod([-3.2, 0.1, 0.2], [3.2, 0.1, 0.2], 0.04, '#6b4a2a');
  });
  const ribbon = P((s) => s.box(1.4, 0.03, 2.8, '#ffffff', [0, 0, 0]));
  return {
    id: 'janggan', name: 'janggan kite', realm: 'sky', len: 3, speed: 5, alt: [45, 70], radius: [90, 160], bob: 4, bank: 0.3,
    pieces: [body], chain: { n: 26, spacing: 2.6, piece: ribbon, palette: ['#c23b2a', '#e2b43a', '#ffffff', '#2f7a5a', '#1f1f24'] },
  };
}


// ───────────────────────── modern, futuristic and more ─────────────────────────

/** A modern car: sedan, hatchback, SUV or pickup, with a raked glasshouse and alloy wheels. */
function modern(id: string, name: string, body: C, kind: 'sedan' | 'hatch' | 'suv' | 'pickup'): Design {
  const len = kind === 'hatch' ? 4.0 : kind === 'sedan' ? 4.7 : 4.9, w = 1.85, h = kind === 'suv' || kind === 'pickup' ? 1.75 : 1.45;
  const cabinLen = kind === 'pickup' ? len * 0.38 : kind === 'sedan' ? len * 0.5 : len * 0.62, cabZ = kind === 'pickup' ? len * 0.12 : kind === 'sedan' ? -0.05 : -len * 0.1;
  return {
    id, name, realm: 'road', len, speed: 11,
    pieces: [P((s) => {
      s.ball(1, body, [0, h * 0.42, 0], { s: [w / 2, h * 0.24, len / 2], seg: 18 });
      s.box(w, h * 0.3, len * 0.94, body, [0, h * 0.4, 0]);
      // The glasshouse: a tapered cabin of tinted glass under a painted roof.
      s.lathe([[w * 0.46, -cabinLen / 2], [w * 0.47, -cabinLen * 0.3], [w * 0.47, cabinLen * 0.3], [w * 0.38, cabinLen / 2]], GLASS, [0, h * 0.72, cabZ], { s: [1, 0.55, 1], seg: 4, r: [0, Math.PI / 4, 0] });
      s.box(w * 0.8, 0.06, cabinLen * 0.72, body, [0, h * 0.98, cabZ]);
      s.box(w * 0.7, h * 0.18, cabinLen * 0.6, WARM, [0, h * 0.78, cabZ], { glow: true });
      if (kind === 'pickup') { for (const sx of [-1, 1]) s.box(0.06, 0.4, len * 0.42, body, [sx * (w / 2 - 0.04), h * 0.62, -len * 0.26]); s.box(w - 0.1, 0.4, 0.06, body, [0, h * 0.62, -len * 0.47]); }
      if (kind === 'suv') s.box(w * 0.7, 0.05, cabinLen * 0.6, '#2a2a30', [0, h * 1.01, cabZ]);
      s.box(w * 0.9, 0.05, 0.05, '#fff6d8', [0, h * 0.5, len / 2 - 0.02], { glow: true });
      s.box(w * 0.9, 0.05, 0.05, TAIL, [0, h * 0.5, -len / 2 + 0.02], { glow: true });
      for (const z of [len * 0.31, -len * 0.31]) for (const sx of [-1, 1]) s.wheel(0.36, 0.26, [sx * (w / 2 - 0.1), 0.36, z], BLACK, '#b8bec8');
    })],
  };
}

/** A futuristic car: a smooth teardrop on a cushion of light (hover) or a sleek wedge with a light bar. */
function future(id: string, name: string, body: C, light: C, hover: boolean): Design {
  const len = 4.6, w = 1.9;
  return {
    id, name, realm: 'road', len, speed: 13, bob: hover ? 0.08 : 0,
    pieces: [P((s) => {
      const y = hover ? 0.75 : 0.5;
      s.lathe([[0.1, -len / 2], [0.55, -len * 0.4], [0.72, -len * 0.1], [0.62, len * 0.25], [0.2, len / 2]], body, [0, y, 0], { s: [w / 1.44, 0.72, 1], seg: 18 });
      s.ball(1, GLASS, [0, y + 0.35, len * 0.02], { s: [0.72, 0.32, 1.25], seg: 14 });
      s.ball(1, WARM, [0, y + 0.33, len * 0.02], { s: [0.66, 0.26, 1.1], glow: true, seg: 10 });
      s.box(w * 0.85, 0.04, 0.04, light, [0, y + 0.12, len / 2 - 0.1], { glow: true });
      s.box(w * 0.85, 0.04, 0.04, light, [0, y + 0.12, -len / 2 + 0.1], { glow: true });
      if (hover) {
        for (const [x, z] of [[0.6, 1.3], [-0.6, 1.3], [0.6, -1.3], [-0.6, -1.3]]) { s.cyl(0.35, 0.4, 0.14, '#3a3a44', [x, y - 0.42, z], { seg: 12 }); s.cyl(0.3, 0.3, 0.05, light, [x, y - 0.5, z], { glow: true, seg: 12 }); }
      } else {
        for (const z of [len * 0.3, -len * 0.3]) for (const sx of [-1, 1]) s.wheel(0.38, 0.28, [sx * (w / 2 - 0.12), 0.38, z], BLACK, light);
        s.box(0.03, 0.04, len * 0.8, light, [w / 2 - 0.02, 0.45, 0], { glow: true });
        s.box(0.03, 0.04, len * 0.8, light, [-w / 2 + 0.02, 0.45, 0], { glow: true });
      }
    })],
  };
}

function hoverBus(): Design {
  const len = 13, w = 2.6;
  return {
    id: 'hover-bus', name: 'hover bus', realm: 'road', len, speed: 9, bob: 0.06,
    pieces: [P((s) => {
      s.lathe([[0.2, -len / 2], [1.1, -len * 0.45], [1.3, 0], [1.2, len * 0.42], [0.3, len / 2]], '#f4f6f8', [0, 1.9, 0], { s: [w / 2.6, 1, 1], seg: 18 });
      s.box(0.05, 0.9, len * 0.8, GLASS, [w / 2 - 0.02, 2.2, 0]);
      s.box(0.05, 0.9, len * 0.8, GLASS, [-w / 2 + 0.02, 2.2, 0]);
      windows(s, 7, w / 2 - 0.02, 2.2, -len * 0.4, len * 0.4, 1.4, 0.8);
      s.box(w * 0.9, 0.05, len * 0.7, '#1d3566', [0, 3.2, 0]);
      for (const z of [-len * 0.3, 0, len * 0.3]) for (const sx of [-1, 1]) s.cyl(0.4, 0.4, 0.06, '#7affc8', [sx * 0.8, 0.55, z], { glow: true, seg: 12 });
      s.box(0.04, 0.06, len * 0.9, '#7affc8', [w / 2 + 0.01, 1.2, 0], { glow: true });
      s.box(0.04, 0.06, len * 0.9, '#7affc8', [-w / 2 - 0.01, 1.2, 0], { glow: true });
    })],
  };
}

/** Thailand's tuk-tuk: a three-wheeled cab with a bench behind under a bright canopy. */
function tukTuk(id: string, body: C, roof: C): Design {
  return {
    id, name: 'tuk-tuk', realm: 'road', len: 3, speed: 8,
    pieces: [P((s) => {
      s.box(0.8, 0.5, 1.0, body, [0, 0.65, 0.95]);
      s.box(1.4, 0.45, 1.6, body, [0, 0.6, -0.5]);
      s.box(1.2, 0.35, 0.5, '#e8dcc0', [0, 1.0, -0.8]);
      s.box(1.2, 0.5, 0.1, '#e8dcc0', [0, 1.25, -1.1]);
      s.box(1.5, 0.08, 2.6, roof, [0, 2.0, -0.1]);
      for (let i = 0; i < 10; i++) s.box(0.14, 0.12, 0.05, i % 2 ? body : '#ffffff', [-0.65 + i * 0.145, 1.9, 1.2]);
      for (const [x, z] of [[0.7, 1.1], [-0.7, 1.1], [0.7, -1.2], [-0.7, -1.2]]) s.rod([x, 0.8, z], [x, 1.98, z], 0.03, CHROME);
      s.box(0.9, 0.5, 0.04, GLASS, [0, 1.45, 1.2]);
      s.wheel(0.3, 0.16, [0, 0.3, 1.2]);
      for (const sx of [-1, 1]) s.wheel(0.3, 0.16, [sx * 0.7, 0.3, -0.7]);
      s.ball(0.1, HEAD, [0, 1.0, 1.46], { glow: true, seg: 6 });
      for (let i = 0; i < 4; i++) s.ball(0.05, ['#ff3ad8', '#3ae8ff', '#ffd23a', '#7aff9a'][i], [-0.5 + i * 0.33, 1.95, 1.3], { glow: true, seg: 5 });
    })],
  };
}

/** A bamboo raft with a little thatched shelter and a steering pole. */
function raft(id: string, logs: C, roof: C): Design {
  return {
    id, name: 'bamboo raft', realm: 'water', len: 6, speed: 1.4, bob: 0.1,
    pieces: [P((s) => {
      for (let i = 0; i < 9; i++) s.cyl(0.14, 0.14, 6, i % 2 ? logs : '#c9b06a', [-1.1 + i * 0.275, 0.12, 0], { r: [Math.PI / 2, 0, 0], seg: 8 });
      for (const z of [-2.4, 0, 2.4]) s.box(2.6, 0.06, 0.12, '#6b4a2a', [0, 0.28, z]);
      for (const [x, z] of [[-0.9, -1.8], [0.9, -1.8], [-0.9, -0.2], [0.9, -0.2]]) s.rod([x, 0.3, z], [x, 1.8, z], 0.05, '#8a6444');
      s.add(new THREE.ConeGeometry(1.6, 0.9, 4), roof, [0, 2.15, -1], { r: [0, Math.PI / 4, 0], s: [1, 1, 1.1] });
      s.box(1.6, 0.25, 1.4, '#c23b2a', [0, 0.4, -1]);
      s.rod([0.3, 0.3, 2.6], [1.5, 3.2, 3.4], 0.04, '#8a6444');
      s.ball(0.14, WARM, [0, 1.7, -0.2], { glow: true, seg: 6 });
    })],
  };
}

/** A three-masted tall ship with square sails, a figurehead of gold and lanterns at the stern. */
function tallShip(): Design {
  const len = 24, beam = 6;
  return {
    id: 'tall-ship', name: 'tall ship', realm: 'water', len, speed: 3, bob: 0.1,
    pieces: [P((s) => {
      s.hull(len, beam, 2.4, '#3a2a22', [0, 0.9, 0], { sheer: 1.2, deck: '#b08a5a' });
      s.box(beam * 1.01, 0.3, len * 0.8, '#f2d14e', [0, 0.5, -0.5]);
      for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) s.box(0.05, 0.3, 0.4, '#1b1b20', [sx * beam * 0.49, 0.2, -8 + i * 2]);
      s.box(beam * 0.8, 2, 4, '#3a2a22', [0, 2, -len * 0.38]);
      windows(s, 3, beam * 0.4, 2.1, -len * 0.45, -len * 0.3, 0.8, 0.6);
      for (const [z, hh] of [[6, 16], [-1, 19], [-7, 14]]) {
        s.cyl(0.18, 0.25, hh, '#5a3a26', [0, 1 + hh / 2, z], { seg: 8 });
        for (let k = 0; k < 3; k++) {
          const y = 1 + hh * (0.35 + k * 0.22), sw = beam * (1.6 - k * 0.35);
          s.rod([-sw / 2, y + hh * 0.1, z], [sw / 2, y + hh * 0.1, z], 0.07, '#5a3a26');
          s.box(sw * 0.95, hh * 0.19, 0.08, '#f4efe6', [0, y, z + 0.15], { s: [1, 1, 1] });
        }
      }
      s.rod([0, 2, len * 0.45], [0, 6, len * 0.62], 0.12, '#5a3a26');
      s.shape([[0, 0], [0, 5], [5, 0]], 0.05, '#f4efe6', [0, 2.2, len * 0.45], { r: [0, -Math.PI / 2, 0] });
      s.ball(0.5, '#e2b43a', [0, 1.8, len * 0.5 + 0.2], { s: [0.8, 1.2, 1] });
      for (const sx of [-1, 1]) s.ball(0.25, '#ffcf7a', [sx * 1.6, 3.4, -len * 0.47], { glow: true, seg: 8 });
    })],
  };
}

/** A passenger jet high overhead: swept wings, two engines, a tail fin, lights at the wingtips. */
function airliner(id: string, livery: C): Design {
  const len = 36;
  return {
    id, name: 'passenger jet', realm: 'sky', len, speed: 55, alt: [320, 420], radius: [900, 1400], bob: 0, bank: 0.08,
    pieces: [P((s) => {
      s.lathe([[0.3, -len / 2], [1.2, -len * 0.38], [2, -len * 0.2], [2, len * 0.35], [1.4, len * 0.46], [0.2, len / 2]], '#f4f6f8', [0, 0, 0], { seg: 16 });
      s.box(0.05, 0.4, len * 0.7, livery, [2.0, 0.2, 0]);
      s.box(0.05, 0.4, len * 0.7, livery, [-2.0, 0.2, 0]);
      for (const sx of [-1, 1]) {
        s.shape([[0, 0], [17, -7], [17, -9], [0, -6]].map(([x, y]) => [x * sx, y]), 0.3, '#e0e4ea', [0, -0.8, 4], { r: [Math.PI / 2, 0, 0] });
        s.cyl(0.9, 0.8, 4, '#c8ccd6', [sx * 6, -1.8, 2], { r: [Math.PI / 2, 0, 0], seg: 12 });
        s.shape([[0, 0], [6, -3], [6, -4], [0, -3.5]].map(([x, y]) => [x * sx, y]), 0.2, '#e0e4ea', [0, 0.5, -len * 0.38], { r: [Math.PI / 2, 0, 0] });
        s.ball(0.3, sx > 0 ? '#ff3a3a' : '#3aff6a', [sx * 17, -0.8, -3.5], { glow: true, seg: 6 });
      }
      s.shape([[0, 0], [-6, 0], [-8, 8], [-4, 8]], 0.3, livery, [0, 1.5, -len * 0.3], { r: [0, Math.PI / 2, 0] });
      s.ball(0.3, '#ffffff', [0, 9, -len * 0.45], { glow: true, seg: 6 });
    })],
  };
}

function lightPlane(): Design {
  return {
    id: 'light-plane', name: 'light plane', realm: 'sky', len: 8, speed: 26, alt: [70, 130], radius: [300, 520], bob: 1, bank: 0.3,
    pieces: [
      P((s) => {
        s.lathe([[0.15, -4.2], [0.45, -2.5], [0.75, -0.4], [0.75, 1.2], [0.5, 2.6]], '#f4f6f8', [0, 1.3, 0], { seg: 12 });
        s.box(0.05, 0.2, 7, '#2f6fb0', [0.72, 1.3, -0.5]);
        s.box(0.05, 0.2, 7, '#2f6fb0', [-0.72, 1.3, -0.5]);
        s.box(11, 0.12, 1.5, '#f4f6f8', [0, 2.1, 0.3]);
        s.box(1.2, 0.5, 1.4, GLASS, [0, 1.85, 0.6]);
        s.box(3, 0.08, 0.9, '#f4f6f8', [0, 1.4, -3.9]);
        s.shape([[0, 0], [1.2, 0], [0, 1.5]], 0.06, '#2f6fb0', [0, 1.45, -4.2], { r: [0, -Math.PI / 2, 0] });
        for (const sx of [-1, 1]) { s.rod([sx * 0.5, 1.0, 0.3], [sx * 1.0, 0.3, 0.3], 0.04, '#3a3a44'); s.wheel(0.25, 0.12, [sx * 1.0, 0.25, 0.3]); }
        s.wheel(0.2, 0.1, [0, 0.2, 2.0]);
      }),
      P((s) => { for (let k = 0; k < 2; k++) s.box(0.16, 2, 0.05, '#2a2a30', [0, 1.3, 2.7], { r: [0, 0, (k / 2) * Math.PI] }); }, 'spinZ', [0, 1.3, 2.7], 10),
    ],
  };
}

/** A futuristic jet: a blended flying wing with light along every edge. */
function skyJet(): Design {
  return {
    id: 'sky-jet', name: 'solar sky-jet', realm: 'sky', len: 14, speed: 30, alt: [110, 180], radius: [400, 700], bob: 0.5, bank: 0.2,
    pieces: [P((s) => {
      s.shape([[0, 7], [9, -4], [6, -5], [0, -3], [-6, -5], [-9, -4]], 0.6, '#e8eef4', [0, 0, 0], { r: [Math.PI / 2, 0, 0] });
      s.ball(1, GLASS, [0, 0.4, 2], { s: [1, 0.45, 2.2], seg: 12 });
      s.shape([[0, 6], [8, -3.5], [5.5, -4.3], [0, -2.5], [-5.5, -4.3], [-8, -3.5]], 0.62, '#1d3566', [0, 0.02, 0], { r: [Math.PI / 2, 0, 0], s: [0.8, 0.8, 1] });
      for (const sx of [-1, 1]) { s.rod([0, 0.05, 7], [sx * 9, 0.05, -4], 0.06, '#3ae8ff', { glow: true }); s.cyl(0.5, 0.5, 0.2, '#ff8a3a', [sx * 2, 0, -3.3], { r: [Math.PI / 2, 0, 0], glow: true, seg: 10 }); }
    })],
  };
}

// ───────────────────────── the kit, extended (VEHICLES_ANIMALS_PLAN.md) ─────────────────────────

/** A scooter or motorbike (a Vespa, a Royal Enfield, an e-moped): two wheels, a seat, a lamp, maybe a box. */
function scooter(id: string, name: string, body: C, opts: { moto?: boolean; box?: C } = {}): Design {
  return {
    id, name, realm: 'road', len: 2, speed: 9,
    pieces: [P((s) => {
      if (opts.moto) {
        s.ball(1, body, [0, 0.85, 0.1], { s: [0.2, 0.18, 0.45], seg: 12 }); // the tank
        s.box(0.3, 0.1, 0.7, '#1b1b20', [0, 0.95, -0.4]);
        s.cyl(0.05, 0.06, 0.6, CHROME, [0.18, 0.45, -0.5], { r: [Math.PI / 2 - 0.2, 0, 0], seg: 6 });
        s.box(0.3, 0.35, 0.4, '#3a3a44', [0, 0.55, 0.05]);
      } else {
        s.ball(1, body, [0, 0.6, -0.35], { s: [0.32, 0.32, 0.55], seg: 14 }); // the curved rear shell
        s.box(0.3, 0.1, 0.55, '#6b4a30', [0, 0.95, -0.35]);
        s.box(0.34, 0.9, 0.12, body, [0, 0.55, 0.55], { r: [-0.25, 0, 0] });
        s.box(0.4, 0.06, 0.6, body, [0, 0.35, 0.15]);
      }
      s.rod([0, 0.6, 0.6], [0, 1.15, 0.5], 0.03, CHROME);
      s.rod([-0.35, 1.15, 0.5], [0.35, 1.15, 0.5], 0.025, CHROME);
      s.ball(0.09, HEAD, [0, 1.0, 0.68], { glow: true, seg: 6 });
      for (const z of [0.65, -0.62]) s.wheel(0.28, 0.1, [0, 0.28, z]);
      if (opts.box) s.box(0.45, 0.4, 0.4, opts.box, [0, 1.2, -0.75]);
    })],
  };
}

/** A lorry on a truck chassis: a cab in front, then a box, a tank, a flatbed, or an ice-cream parlour. */
function truck(id: string, name: string, cab: C, back: C, opts: { len?: number; tank?: boolean; flat?: boolean; icecream?: boolean; stripes?: C } = {}): Design {
  const len = opts.len ?? 7, w = 2.3, cabL = 1.9;
  return {
    id, name, realm: 'road', len, speed: 8,
    pieces: [P((s) => {
      s.box(w - 0.1, 0.3, len - 0.3, '#2a2a30', [0, 0.6, 0]);
      s.box(w, 1.7, cabL, cab, [0, 1.55, len / 2 - cabL / 2]);
      s.box(w - 0.3, 0.8, 0.05, GLASS, [0, 1.9, len / 2 + 0.01]);
      for (const sx of [-1, 1]) s.box(0.04, 0.6, cabL * 0.55, GLASS, [sx * w / 2, 1.95, len / 2 - cabL * 0.45]);
      const bl = len - cabL - 0.3, bz = -len / 2 + bl / 2;
      if (opts.tank) s.cyl(1.0, 1.0, bl, back, [0, 1.8, bz], { r: [Math.PI / 2, 0, 0], seg: 16 });
      else if (opts.flat) { s.box(w, 0.2, bl, back, [0, 0.95, bz]); for (let i = 0; i < 3; i++) s.box(1.2, 0.6, 1.1, ['#8a6444', '#c9a06a', '#6b8a4a'][i], [0, 1.35, bz - bl / 3 + i * bl / 3]); }
      else s.box(w, 2.3, bl, back, [0, 2.0, bz]);
      if (opts.stripes) for (const y of [1.3, 2.7]) s.box(w + 0.02, 0.14, bl, opts.stripes, [0, y, bz]);
      if (opts.icecream) {
        for (const sx of [-1, 1]) { s.box(0.05, 0.9, bl * 0.5, WARM, [sx * (w / 2 + 0.01), 2.1, bz], { glow: true }); s.box(0.9, 0.06, bl * 0.55, '#f2a0b0', [sx * (w / 2 + 0.3), 2.75, bz], { r: [0, 0, sx * 0.3] }); }
        s.cyl(0.25, 0.02, 0.6, '#f2d0a0', [0, 3.5, bz], { seg: 8 });
        s.ball(0.32, '#ffd6e8', [0, 3.85, bz], { seg: 10 });
      }
      for (const z of [len / 2 - 1.2, -len / 2 + 1.4, -len / 2 + 2.6]) for (const sx of [-1, 1]) s.wheel(0.48, 0.3, [sx * (w / 2 - 0.12), 0.48, z]);
      lamps(s, w / 2 - 0.3, 0.9, len / 2 + 0.02, -len / 2 - 0.02);
    })],
  };
}

/** A three-wheeled pickup (a Piaggio Ape, a cargo trike, a kei truck): a tiny cab and a little bed behind. */
function trike(id: string, name: string, body: C, bed: C): Design {
  return {
    id, name, realm: 'road', len: 2.9, speed: 7,
    pieces: [P((s) => {
      s.box(1.2, 1.3, 1.0, body, [0, 1.05, 0.85]);
      s.ball(1, body, [0, 1.7, 0.85], { s: [0.6, 0.12, 0.5], seg: 12 });
      s.box(1.0, 0.55, 0.04, GLASS, [0, 1.3, 1.36]);
      s.box(1.3, 0.1, 1.5, bed, [0, 0.62, -0.5]);
      for (const sx of [-1, 1]) s.box(0.05, 0.4, 1.5, bed, [sx * 0.65, 0.85, -0.5]);
      s.box(1.3, 0.4, 0.05, bed, [0, 0.85, -1.25]);
      s.box(0.6, 0.4, 0.5, '#c9a06a', [0.2, 0.9, -0.5]);
      s.wheel(0.26, 0.14, [0, 0.26, 1.1]);
      for (const sx of [-1, 1]) s.wheel(0.26, 0.14, [sx * 0.62, 0.26, -0.6]);
      s.ball(0.09, HEAD, [0, 1.0, 1.37], { glow: true, seg: 6 });
    })],
  };
}

/** A tracked snowcat: a warm-lit cabin on two long tracks with road wheels, a blade in front. */
function snowcat(): Design {
  const len = 5.2;
  return {
    id: 'snowcat', name: 'snowcat', realm: 'road', len, speed: 5,
    pieces: [P((s) => {
      for (const sx of [-1, 1]) {
        s.ball(1, '#2a2a30', [sx * 1.05, 0.45, 0], { s: [0.32, 0.45, len / 2], seg: 12 });
        for (let i = 0; i < 5; i++) s.cyl(0.28, 0.28, 0.2, '#6a6a72', [sx * 1.25, 0.4, -len * 0.36 + i * len * 0.18], { r: [0, 0, Math.PI / 2], seg: 10 });
      }
      s.box(2.1, 0.5, len * 0.9, '#e8342a', [0, 1.05, 0]);
      s.box(1.9, 1.3, len * 0.55, '#e8342a', [0, 1.9, 0.3]);
      s.box(1.7, 0.6, 0.05, GLASS, [0, 2.1, 0.3 + len * 0.275]);
      windows(s, 2, 0.95, 2.1, -0.4, 1.4, 0.7, 0.55);
      s.box(2.6, 0.9, 0.2, '#c8ccd4', [0, 0.7, len / 2 + 0.3], { r: [-0.3, 0, 0] });
      s.ball(0.12, '#ffb000', [0, 2.65, 0.3], { glow: true, seg: 6 });
      lamps(s, 0.7, 1.4, len / 2 - 0.1, -len / 2 + 0.2);
    })],
  };
}

/** New Yonder's delivery robot: a rounded cooler on six small wheels, a flag on a whip, lights. */
function deliveryBot(): Design {
  return {
    id: 'delivery-bot', name: 'delivery robot', realm: 'road', len: 1, speed: 1.6,
    pieces: [P((s) => {
      s.ball(1, '#f4f4f4', [0, 0.45, 0], { s: [0.32, 0.3, 0.4], seg: 14 });
      s.box(0.6, 0.02, 0.4, '#3ae8ff', [0, 0.6, 0.05], { glow: true });
      for (const z of [-0.28, 0, 0.28]) for (const sx of [-1, 1]) s.wheel(0.1, 0.06, [sx * 0.3, 0.1, z]);
      s.rod([0.2, 0.7, -0.3], [0.2, 1.6, -0.35], 0.01, '#8a8a94');
      s.box(0.2, 0.12, 0.02, '#ff8a2a', [0.3, 1.55, -0.35], { glow: true });
      s.box(0.3, 0.04, 0.02, '#fff6d8', [0, 0.45, 0.4], { glow: true });
    })],
  };
}

/** A pedicab: a bicycle in front, a hooded seat behind (empty — nothing here carries anyone). */
function pedicab(id: string, body: C, hood: C): Design {
  return {
    id, name: 'pedicab', realm: 'road', len: 2.6, speed: 3.5,
    pieces: [P((s) => {
      s.wheel(0.34, 0.06, [0, 0.34, 0.95]);
      s.rod([0, 0.34, 0.95], [0, 0.95, 0.4], 0.03, body);
      s.rod([0, 0.95, 0.4], [0, 0.6, -0.3], 0.03, body);
      s.box(0.25, 0.06, 0.3, '#1b1b20', [0, 1.0, 0.35]);
      s.rod([-0.25, 1.15, 0.8], [0.25, 1.15, 0.8], 0.02, CHROME);
      s.box(1.2, 0.5, 0.7, body, [0, 0.7, -0.6]);
      s.box(1.1, 0.15, 0.6, '#c23b2a', [0, 0.98, -0.6]);
      s.ball(1, hood, [0, 1.5, -0.7], { s: [0.62, 0.55, 0.45], seg: 12 });
      for (const sx of [-1, 1]) s.wheel(0.3, 0.06, [sx * 0.6, 0.3, -0.6]);
      s.ball(0.07, HEAD, [0, 0.9, 1.05], { glow: true, seg: 6 });
    })],
  };
}

/** A speedboat, rib or water taxi: a pointed hull, a console with a screen, an outboard at the stern. */
function speedboat(id: string, name: string, hull: C, deck: C, len = 6): Design {
  const beam = len * 0.36;
  return {
    id, name, realm: 'water', len, speed: 6, bob: 0.08,
    pieces: [P((s) => {
      s.hull(len, beam, 0.6, hull, [0, 0.3, 0], { sheer: 0.25, deck });
      for (const sx of [-1, 1]) s.cyl(0.25, 0.25, len * 0.85, '#3a3a44', [sx * beam * 0.46, 0.45, -0.1], { r: [Math.PI / 2, 0, 0], seg: 10 });
      s.box(0.8, 0.8, 0.6, '#f4f4f4', [0, 0.9, 0.2]);
      s.box(0.7, 0.4, 0.04, GLASS, [0, 1.3, 0.52], { r: [-0.4, 0, 0] });
      s.box(0.4, 0.9, 0.4, '#2a2a30', [0, 0.6, -len / 2 - 0.1]);
      s.ball(0.08, '#ff3a3a', [0.3, 1.4, 0.2], { glow: true, seg: 6 });
    })],
  };
}

/** A coracle: a round woven bowl of a boat, paddled with one oar. */
function coracle(): Design {
  return {
    id: 'coracle', name: 'coracle', realm: 'water', len: 2, speed: 1, bob: 0.12,
    pieces: [P((s) => {
      s.lathe([[0.2, 0], [0.8, 0.05], [1.0, 0.3], [1.02, 0.55]], '#8a6a3a', [0, 0.05, 0], { seg: 16 });
      for (let i = 0; i < 8; i++) s.rod([Math.cos(i) * 1.0, 0.55, Math.sin(i) * 1.0], [Math.cos(i + Math.PI) * 1.0, 0.55, Math.sin(i + Math.PI) * 1.0], 0.02, '#c9a06a');
      s.rod([0.6, 0.6, 0.2], [1.4, -0.1, 0.9], 0.03, '#6b4a2a');
    })],
  };
}

/** The Meadow's leaf boat: a great curled leaf with a flower for a sail. */
function leafBoat(): Design {
  return {
    id: 'leaf-boat', name: 'leaf boat', realm: 'water', len: 3.2, speed: 1.4, bob: 0.12,
    pieces: [P((s) => {
      s.hull(3.2, 1.2, 0.3, '#5aa84a', [0, 0.2, 0], { sheer: 0.35, deck: '#7ac85a' });
      s.rod([0, 0.3, -1.4], [0, 0.3, 1.5], 0.03, '#3a7a3a');
      s.rod([0, 0.3, 0.2], [0, 2.2, 0.1], 0.03, '#4f9a44');
      for (let i = 0; i < 6; i++) s.ball(0.3, '#ff8fb8', [Math.cos(i) * 0.35, 2.3 + Math.sin(i) * 0.35, 0.1], { s: [1, 1, 0.3], seg: 8 });
      s.ball(0.15, '#f2d14e', [0, 2.3, 0.15], { seg: 8 });
    })],
  };
}

/** A helicopter: a rounded glass cabin, a tail boom, the rotor spinning above. */
function helicopter(id: string, body: C, stripe: C): Design {
  return {
    id, name: 'helicopter', realm: 'sky', len: 10, speed: 14, alt: [50, 100], radius: [150, 350], bob: 1, bank: 0.2,
    pieces: [
      P((s) => {
        s.ball(1, body, [0, 0, 0], { s: [1.1, 1.1, 1.9], seg: 16 });
        s.ball(1, GLASS, [0, 0.3, 1.2], { s: [0.95, 0.75, 0.9], seg: 12 });
        s.cyl(0.25, 0.12, 5, body, [0, 0.4, -3.8], { r: [Math.PI / 2, 0, 0], seg: 8 });
        s.box(0.1, 1.2, 0.8, stripe, [0, 0.9, -6.2]);
        s.box(2.2, 0.12, 0.3, stripe, [0, -0.2, 0]);
        for (const sx of [-1, 1]) s.rod([sx * 0.8, -1.1, 1.2], [sx * 0.8, -1.1, -1.2], 0.06, '#3a3a44');
        s.ball(0.12, '#ff3a3a', [0, -1, 0], { glow: true, seg: 6 });
      }),
      P((s) => { s.box(11, 0.05, 0.35, '#2a2a30', [0, 1.3, 0]); s.box(0.35, 0.05, 11, '#2a2a30', [0, 1.3, 0]); }, 'spinY', [0, 1.3, 0], 3),
    ],
  };
}

/** A hang glider: a great triangle of sailcloth on a frame. */
function hangGlider(col: C): Design {
  return {
    id: 'hang-glider', name: 'hang glider', realm: 'sky', len: 4, speed: 7, alt: [40, 90], radius: [100, 280], bob: 2, bank: 0.4,
    pieces: [P((s) => {
      s.shape([[0, 2.2], [5, -1.4], [-5, -1.4]], 0.04, col, [0, 0, 0], { r: [Math.PI / 2, 0, 0] });
      s.rod([0, 0, 2.2], [0, 0, -1.4], 0.04, '#6a6a72');
      s.rod([-1, -1.3, 0.3], [1, -1.3, 0.3], 0.03, '#6a6a72');
      for (const sx of [-1, 1]) s.rod([sx, -1.3, 0.3], [0, 0, 0.3], 0.03, '#6a6a72');
    })],
  };
}

/** The Sky Isles' cloud jellies: a glowing bell trailing ribbons of light. */
function cloudJelly(col: C): Design {
  return {
    id: 'cloud-jelly', name: 'cloud jellies', realm: 'sky', len: 3, speed: 1.5, alt: [25, 80], radius: [40, 220], bob: 3, bank: 0, group: { n: 3, spacing: 7 },
    pieces: [P((s) => {
      s.ball(1.4, col, [0, 0, 0], { s: [1, 0.7, 1], seg: 14, glow: true });
      s.ball(1.1, '#ffffff', [0, 0.1, 0], { s: [1, 0.5, 1], seg: 12 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.rod([Math.cos(a) * 0.9, -0.3, Math.sin(a) * 0.9], [Math.cos(a) * 1.1, -3 - (i % 3) * 0.6, Math.sin(a) * 1.1], 0.05, col, { glow: true }); }
    })],
  };
}

/** Star mantas: wide dark wings dusted with stars, beating slowly as they glide. */
function starManta(): Design {
  const wing = (sx: number) => P((s) => {
    s.shape([[0, 1.2], [3.6 * sx, -0.4], [0.6 * sx, -1.4]], 0.08, '#2a2a5a', [0, 0, 0], { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 6; i++) s.ball(0.06, '#fff4c0', [sx * (0.6 + i * 0.45), 0.06, -0.1 + (i % 2) * 0.3], { glow: true, seg: 5 });
  }, sx > 0 ? 'flapL' : 'flapR', [0, 0, 0], 0.5);
  return {
    id: 'star-manta', name: 'star mantas', realm: 'sky', len: 6, speed: 5, alt: [40, 110], radius: [120, 380], bob: 2, bank: 0.2, group: { n: 2, spacing: 12 },
    pieces: [P((s) => { s.ball(1, '#2a2a5a', [0, 0, 0], { s: [0.8, 0.25, 1.4], seg: 12 }); s.rod([0, 0, -1.3], [0, 0, -4.5], 0.04, '#b8a4ff', { glow: true }); }), wing(1), wing(-1)],
  };
}

const withGroup = (d: Design, n: number, spacing: number): Design => ({ ...d, group: { n, spacing } });

// ───────────────────────── the catalogue ─────────────────────────

export const DESIGNS: Record<string, () => Design> = {
  ...FANTASY_DESIGNS,
  // Road
  'double-decker': () => bus('double-decker', 'red double-decker bus', '#c8102e', '#1b1b20', 10.2, 2),
  'black-cab': () => car('black-cab', 'black cab', '#1b1b20', '#1b1b20', { round: true, taxi: '#ffb000', chrome: true, len: 4.6 }),
  'solar-cab': () => car('solar-cab', 'electric solar cab', '#ffcc1a', '#ffcc1a', { taxi: '#3ae8ff', solar: true, neon: '#3ae8ff' }),
  'solar-tram': () => tram('solar-tram', 'solar tram', '#f4f6f8', '#3aae6a', 18, true),
  'streetcar': () => tram('streetcar', 'streetcar', '#3a7a4a', '#f2ead0', 12),
  'cable-car': () => tram('cable-car', 'cable car', '#b3262a', '#f2ead0', 8.5),
  'post-bus': () => bus('post-bus', 'yellow post bus', '#ffcc00', '#c8102e', 11.5, 1),
  'city-bus': () => bus('city-bus', 'city bus', '#2f6fb0', '#f4f4f4', 11, 1),
  'red-bus': () => bus('red-bus', 'city bus', '#c8342a', '#f2d14e', 11, 1),
  'painted-truck': () => bus('painted-truck', 'painted truck', '#e8a33a', '#2f7a5a', 8, 1, (s) => { for (let i = 0; i < 10; i++) s.ball(0.2, ['#c23b2a', '#2f6fb0', '#f2d14e', '#2f7a5a'][i % 4], [(i % 2 ? 1 : -1) * 1.26, 2.6, -3.5 + i * 0.75], { s: [0.3, 1, 1] }); }),
  'vintage-car': () => car('vintage-car', 'vintage car', '#8fd3d9', '#f4f1e8', { round: true, chrome: true, fins: true, len: 4.9 }),
  'vintage-car-2': () => car('vintage-car-2', 'vintage car', '#f2a0b0', '#f4f1e8', { round: true, chrome: true, fins: true, len: 4.9 }),
  'nordic-car': () => car('nordic-car', 'old estate car', '#b3262a', '#b3262a', { chrome: true, len: 4.6 }),
  'taxi': () => car('taxi', 'taxi', '#f28a1a', '#f28a1a', { taxi: '#ffffff' }),
  'petit-taxi': () => car('petit-taxi', 'petit taxi', '#c8342a', '#c8342a', { len: 3.9, taxi: '#ffe9a8' }),
  'land-cruiser': () => car('land-cruiser', '4×4', '#f4f1e8', '#f4f1e8', { len: 4.9, h: 1.7 }),
  'dune-buggy': () => car('dune-buggy', 'dune buggy', '#e8a33a', '#3a3a44', { len: 3.6 }),
  'bemo': () => bus('bemo', 'bemo minibus', '#3a9ad9', '#f4f4f4', 5, 1),
  'kei-van': () => car('kei-van', 'little van', '#f4f4f4', '#f4f4f4', { len: 3.4, h: 1.8 }),
  'snowmobile': () => car('snowmobile', 'snowmobile', '#2f6fb0', '#1b1b20', { len: 3, h: 1.1 }),
  'auto-rickshaw': () => autoRickshaw('auto-rickshaw', '#2f7a3a', '#f2d14e'),
  'auto-rickshaw-2': () => autoRickshaw('auto-rickshaw-2', '#1b1b20', '#f2d14e'),
  'carriage': () => cart('carriage', 'horse-drawn carriage', HORSE('#6b4a30', '#2a1f18'), true, (s) => carriage(s, '#1b1b20', '#1b1b20', '#d4af37', '#6b1a1a'), 4, 7.5),
  'caleche': () => cart('caleche', 'calèche', HORSE('#e8dcc0', '#d4c4a0'), false, (s) => carriage(s, '#2f6f9a', '#e2b43a', '#e2b43a', '#e2b43a'), 3.5, 6),
  'tonga': () => cart('tonga', 'tonga', HORSE('#8a5a36', '#2a1f18'), false, (s) => carriage(s, '#b5552e', '#fbf7ee', '#e2b43a', '#6b4a2a'), 3.5, 6),
  'pumpkin-coach': () => cart('pumpkin-coach', 'pumpkin coach', HORSE('#ffffff', '#ffd6f0', { horns: 'unicorn' }), true, (s) => {
    s.ball(1.3, '#ff9a3a', [0, 1.9, -1], { s: [1, 0.9, 1.05], seg: 18 });
    for (let i = 0; i < 8; i++) s.ball(1.3, '#ff8a2a', [0, 1.9, -1], { s: [0.18, 0.9, 1.05], r: [0, (i / 8) * Math.PI, 0] });
    s.cyl(0.08, 0.12, 0.5, '#4f9a44', [0, 3.2, -1]);
    for (const sx of [-1, 1]) { s.box(0.05, 0.6, 0.6, WARM, [sx * 1.3, 2.0, -1], { glow: true }); for (const z of [0.1, -2.1]) s.wheel(0.6, 0.12, [sx * 1.1, 0.6, z], '#e2b43a', '#ffe9a8'); }
  }, 3.5, 8),
  'flower-cart': () => cart('flower-cart', 'flower cart', HORSE('#b08a6a', '#f4efe6'), false, (s) => {
    s.box(1.6, 0.5, 2.4, '#a8703f', [0, 1.0, -1.2]);
    for (let i = 0; i < 18; i++) s.ball(0.2, ['#ff8fb8', '#f2d14e', '#b58ad9', '#ffffff', '#ff6b6b'][i % 5], [-0.6 + (i % 4) * 0.4, 1.35 + (i % 3) * 0.1, -2.1 + Math.floor(i / 4) * 0.45]);
    for (const sx of [-1, 1]) s.wheel(0.6, 0.1, [sx * 0.9, 0.6, -1.2], '#6b4a2a', '#a8703f');
  }, 3, 6),
  'vardo': () => cart('vardo', 'painted caravan wagon', HORSE('#3a2a22', '#f4efe6'), false, (s) => {
    s.box(2, 2, 3.2, '#2f7a5a', [0, 2.0, -1.8]);
    s.cyl(1.05, 1.05, 3.3, '#b3262a', [0, 3.0, -1.8], { r: [Math.PI / 2, 0, 0], seg: 14 });
    for (const sx of [-1, 1]) { s.box(0.05, 0.7, 0.8, WARM, [sx * 1.02, 2.2, -1.8], { glow: true }); for (const z of [-0.6, -3]) s.wheel(0.7, 0.12, [sx * 1.1, 0.7, z], '#e2b43a', '#b3262a'); }
    s.cyl(0.1, 0.1, 0.8, BLACK, [0.6, 4.1, -2.5]);
  }, 3, 8),
  'bullock-cart': () => cart('bullock-cart', 'bullock cart', BULLOCK('#e8e2d4'), true, (s) => {
    s.box(1.6, 0.25, 2.6, '#8a5a36', [0, 1.0, -1.3]);
    s.cyl(0.9, 0.9, 2.6, '#c9a06a', [0, 1.35, -1.4], { r: [Math.PI / 2, 0, 0], seg: 12, s: [1, 1, 0.8] });
    for (const sx of [-1, 1]) s.wheel(0.8, 0.1, [sx * 0.95, 0.8, -1.3], '#6b4a2a', '#8a5a36');
  }, 2.2, 7),
  'buffalo-cart': () => cart('buffalo-cart', 'buffalo cart', { ...BULLOCK('#3a3a3f'), hump: undefined, horns: 'ram' }, false, (s) => {
    s.box(1.5, 0.25, 2.4, '#8a5a36', [0, 1.0, -1.2]);
    for (let i = 0; i < 6; i++) s.ball(0.3, '#e8d6a0', [-0.4 + (i % 3) * 0.4, 1.4, -1.8 + Math.floor(i / 3) * 0.8]);
    for (const sx of [-1, 1]) s.wheel(0.75, 0.1, [sx * 0.9, 0.75, -1.2], '#6b4a2a', '#8a5a36');
  }, 2, 6.5),
  'donkey-cart': () => cart('donkey-cart', 'donkey cart', { ...HORSE('#9a8a7a', '#3a3230'), len: 1.3, h: 1.1, girth: 0.28, headR: 0.17, ears: 'big' }, false, (s) => {
    s.box(1.3, 0.25, 1.8, '#a8703f', [0, 0.8, -1]);
    for (let i = 0; i < 5; i++) s.ball(0.22, ['#ff9a3a', '#4f9a44', '#f2d14e'][i % 3], [-0.35 + (i % 3) * 0.35, 1.15, -1.3 + Math.floor(i / 3) * 0.5]);
    for (const sx of [-1, 1]) s.wheel(0.55, 0.08, [sx * 0.75, 0.55, -1], '#6b4a2a', '#8a5a36');
  }, 2, 4.5),
  'reindeer-sled': () => cart('reindeer-sled', 'reindeer sled', { ...HORSE('#8a6a4a', '#f4efe6'), neckUp: 0.8, horns: 'antlers', mane: false, tail: 'tuft' }, true, (s) => {
    s.box(1.2, 0.5, 2.2, '#b3262a', [0, 0.6, -1.3]);
    s.box(1.2, 0.8, 0.2, '#b3262a', [0, 1.0, -2.4]);
    s.box(1.0, 0.2, 1.8, '#f4efe6', [0, 0.95, -1.3]);
    for (const sx of [-1, 1]) s.box(0.08, 0.08, 2.8, '#e2b43a', [sx * 0.6, 0.1, -1.1]);
  }, 3.2, 6.5),
  'dog-sled': () => cart('dog-sled', 'dog sled', { len: 0.9, h: 0.7, girth: 0.2, col: '#c8ccd6', col2: '#f4f4f4', neckLen: 0.2, neckUp: 0.8, headR: 0.14, ears: 'pointed', tail: 'thin' }, true, (s) => {
    s.box(0.9, 0.3, 2, '#8a5a36', [0, 0.4, -1.3]);
    s.box(0.8, 0.6, 0.1, '#8a5a36', [0, 0.7, -2.3]);
    for (const sx of [-1, 1]) s.box(0.05, 0.05, 2.4, '#6b6b74', [sx * 0.45, 0.05, -1.2]);
  }, 4, 4.5),
  'elephant': () => ({
    id: 'elephant', name: 'elephant with a howdah', realm: 'road', len: 4, speed: 1.6,
    pieces: quadruped({ len: 3.0, h: 2.9, girth: 0.95, col: '#8a8a94', col2: '#9a9aa4', neckLen: 0.3, neckUp: 0.2, headR: 0.6, snout: 0.6, trunk: true, ears: 'big', tail: 'tuft', load: (s, top) => {
      s.box(2.2, 0.15, 2.4, '#c23b2a', [0, top - 0.05, 0]);
      for (const sx of [-1, 1]) s.box(0.1, 1.2, 2.3, '#c23b2a', [sx * 1.1, top - 0.6, 0]);
      s.box(1.5, 0.8, 1.6, '#e2b43a', [0, top + 0.5, 0]);
      for (const [x, z] of [[-0.7, -0.75], [0.7, -0.75], [-0.7, 0.75], [0.7, 0.75]]) s.cyl(0.05, 0.05, 1.1, '#e2b43a', [x, top + 1.4, z]);
      s.ball(1.1, '#e2b43a', [0, top + 1.95, 0], { s: [0.9, 0.5, 1], seg: 12 });
    } }),
  }),
  'camel-caravan': () => caravan('camel-caravan', 'camel caravan', CAMEL, 5, ['#8c3b2a', '#d9a066', '#2f6f9a']),

  // Water
  'gondola': () => rowBoat('gondola', 'gondola', '#141418', 11, { sheer: 1.2, beam: 1.4, cushions: '#b3262a', prow: (s) => {
    for (let i = 0; i < 6; i++) s.box(0.05, 0.08, 0.35, '#e8e8f0', [0, 1.4 + i * 0.1, 5.4]);
    s.box(0.05, 0.8, 0.12, '#e8e8f0', [0, 1.6, 5.55]);
  } }),
  'narrowboat': () => rowBoat('narrowboat', 'narrowboat', '#2f5a3a', 17, { beam: 2.1, sheer: 0.15, canopy: '#b3262a', canopyTrim: '#f2d14e', roof: 'flat', lanterns: WARM }),
  'punt': () => rowBoat('punt', 'punt', '#8a6444', 7, { beam: 1.1, sheer: 0.05, cushions: '#2f5a8a' }),
  'ferry': () => ferry('ferry', 'solar ferry', '#f4f6f8', '#e8eef4', 26, true),
  'yacht': () => sailBoat('yacht', 'sailing yacht', '#f4f6f8', '#ffffff', 10, 'bermuda', { cabin: '#f4f6f8' }),
  'catboat': () => sailBoat('catboat', 'catboat', '#2f6fb0', '#f4efe6', 6, 'bermuda'),
  'longship': () => sailBoat('longship', 'longship', '#6b4a30', '#f4efe6', 18, 'square', { sheer: 1.4, stripes: '#b3262a', oars: true, shields: ['#b3262a', '#f2d14e', '#2f5a8a'] }),
  'fishing-boat': () => sailBoat('fishing-boat', 'fishing boat', '#b3262a', '#f4efe6', 8, 'bermuda', { cabin: '#f4f1e8' }),
  'paddle-steamer': () => paddleSteamer(),
  'junk': () => sailBoat('junk', 'junk', '#6b3a22', '#c8483a', 14, 'batten', { masts: 2, sheer: 0.8, cabin: '#8a4a2a' }),
  'dragon-boat': () => rowBoat('dragon-boat', 'dragon boat', '#2f7a5a', 13, { beam: 1.3, sheer: 0.4, prow: (s) => {
    for (let i = 0; i < 14; i++) s.ball(0.2, i % 2 ? '#e8342a' : '#ffd23a', [0, 0.45, -5.6 + i * 0.85], { s: [3, 0.4, 2] });
    s.rod([0, 0.4, 5.8], [0, 1.4, 6.3], 0.18, '#e8342a');
    s.ball(0.42, '#e8342a', [0, 1.4 + animalHeadGap(0.42) + 0.42, 6.5], { s: [0.9, 0.8, 1.2] });
    s.rod([0, 0.4, -5.8], [0, 1.4, -6.6], 0.14, '#ffd23a');
  } }),
  'sampan': () => rowBoat('sampan', 'sampan', '#8a6444', 7, { beam: 1.6, sheer: 0.3, canopy: '#c9a060', roof: 'barrel' }),
  'yakatabune': () => rowBoat('yakatabune', 'yakatabune', '#4a3426', 12, { beam: 2.6, sheer: 0.2, canopy: '#3a3a4a', canopyTrim: '#b3262a', roof: 'flat', lanterns: '#ff6a4a' }),
  'turtle-ship': () => rowBoat('turtle-ship', 'turtle ship', '#6b4a30', 16, { beam: 3.6, sheer: 0.4, prow: (s) => {
    s.ball(1, '#3a4a3a', [0, 0.9, 0], { s: [1.6, 0.9, 6.5], seg: 16 });
    for (let i = 0; i < 40; i++) s.cone(0.07, 0.35, '#c9ccd6', [((i % 5) - 2) * 0.55, 1.6 + (i % 5 === 2 ? 0.15 : 0), -5 + Math.floor(i / 5) * 1.3], { seg: 4 });
    s.rod([0, 0.9, 6.3], [0, 1.4, 7.2], 0.3, '#b3262a');
    s.ball(0.55, '#b3262a', [0, 1.5 + animalHeadGap(0.55), 7.5 + 0.55], { s: [1, 0.8, 1.2] });
  } }),
  'jukung': () => ({ ...rowBoat('jukung', 'jukung outrigger', '#f4f4f4', 7, { beam: 0.9, sheer: 0.5, prow: (s) => {
    for (const sx of [-1, 1]) { s.cyl(0.12, 0.12, 6, '#d9c28f', [sx * 2.2, 0.15, 0], { r: [Math.PI / 2, 0, 0] }); for (const z of [-1.6, 1.6]) s.rod([0, 0.6, z], [sx * 2.2, 0.25, z], 0.05, '#8a6444'); }
    s.cyl(0.05, 0.06, 4, '#8a6444', [0, 2.3, 0.5]);
    s.shape([[0, 0], [2.6, 3.6], [-1.4, 1.8]], 0.03, '#e8342a', [0, 0.6, 0.4], { r: [0, -Math.PI / 2 + 0.2, 0] });
    for (let i = 0; i < 4; i++) s.box(0.06, 0.06, 0.5, ['#e8342a', '#f2d14e', '#2f6fb0', '#2f7a5a'][i], [0, 0.55, -2.5 + i * 1.5]);
  } }), speed: 3.5 }),
  'phinisi': () => sailBoat('phinisi', 'phinisi schooner', '#8a5a36', '#f4efe6', 20, 'bermuda', { masts: 2, sheer: 1.2, cabin: '#a8703f' }),
  'dhow': () => sailBoat('dhow', 'dhow', '#a8703f', '#f4efe6', 13, 'lateen', { sheer: 0.9 }),
  'abra': () => rowBoat('abra', 'abra water-taxi', '#a8703f', 9, { beam: 2.2, sheer: 0.3, canopy: '#8a5a36', roof: 'flat', cushions: '#c23b2a' }),
  'felucca': () => sailBoat('felucca', 'felucca', '#f4f1e8', '#ffffff', 9, 'lateen', { sheer: 0.5 }),
  'reed-boat': () => rowBoat('reed-boat', 'papyrus reed boat', '#c9b06a', 6, { beam: 1.2, sheer: 0.9 }),
  'kettuvallam': () => rowBoat('kettuvallam', 'kettuvallam houseboat', '#5a3a26', 18, { beam: 3.2, sheer: 0.5, canopy: '#c9a060', canopyTrim: '#6b4a2a', roof: 'thatch', lanterns: WARM }),
  'snake-boat': () => rowBoat('snake-boat', 'chundan vallam snake boat', '#2a1f18', 22, { beam: 1.3, sheer: 2.2, prow: (s) => { s.ball(0.3, '#e2b43a', [0, 3.0, -11.4]); } }),
  'shikara': () => rowBoat('shikara', 'shikara', '#8a4a2a', 9, { beam: 1.8, sheer: 0.4, canopy: '#c23b2a', canopyTrim: '#e2b43a', roof: 'flat', cushions: '#e2b43a', lanterns: WARM }),
  // A small boat hung with lanterns, out on the water only from dusk (traffic/schedule.ts).
  'lantern-boat': () => rowBoat('lantern-boat', 'lantern boat', '#5a3422', 6, { beam: 1.5, sheer: 0.35, canopy: '#8a2a2a', canopyTrim: '#f2c14e', roof: 'barrel', lanterns: '#ffb84a' }),
  'ganga-boat': () => rowBoat('ganga-boat', 'wooden river boat', '#6b4a2a', 8, { beam: 2, sheer: 0.3, canopy: '#f2a13a', roof: 'barrel' }),
  'kayak': () => rowBoat('kayak', 'kayak', '#e8342a', 4.5, { beam: 0.7, sheer: 0.1 }),
  'swan-boat': () => swanBoat(),
  'swans': () => ({ id: 'swans', name: 'swans', realm: 'water', len: 1.6, speed: 0.9, bob: 0.04, group: { n: 3, spacing: 2.4 }, pieces: bird({ len: 1.2, col: '#ffffff', col2: '#f4f4f4', beak: '#ff8a2a', span: 2.2, neckLen: 0.55, neckUp: 1.35, headR: 0.1, swims: true }) }),
  'ducks': () => ({ id: 'ducks', name: 'ducks', realm: 'water', len: 0.8, speed: 0.8, bob: 0.03, group: { n: 5, spacing: 1.1 }, pieces: bird({ len: 0.5, col: '#8a6a4a', col2: '#c9a06a', beak: '#f2a13a', span: 0.8, neckLen: 0.12, neckUp: 1.2, headR: 0.08, swims: true }) }),

  // Sky
  'airship': () => airship('airship', 'airship', '#c9ccd6', '#b3262a', '#6b4a2a', 42),
  'solar-blimp': () => airship('solar-blimp', 'solar blimp', '#f4f6f8', '#3aae6a', '#e8eef4', 34, true),
  'zeppelin': () => airship('zeppelin', 'zeppelin', '#e8dcc0', '#c8102e', '#8a8a94', 48),
  'air-taxi': () => airTaxi('air-taxi', '#f4f6f8', '#3ae8ff'),
  'air-taxi-2': () => airTaxi('air-taxi-2', '#ffcc1a', '#ff3ad8'),
  'drone': () => drone(),
  'biplane': () => biplane('biplane', '#b3262a', '#f2ead0', '#ffd6e8'),
  'biplane-2': () => biplane('biplane-2', '#2f6fb0', '#f4f1e8'),
  'ornithopter': () => ornithopter(),
  'seaplane': () => seaplane(),
  'sky-ship': () => skyShip('sky-ship', 'sky ship', '#8a5a36', '#f4efe6', '#ffffff', 22),
  'crystal-skiff': () => skyShip('crystal-skiff', 'crystal skiff', '#e0f0ff', '#e6dcff', '#fff0ff', 12),
  'flying-carpet': () => flyingCarpet('flying-carpet', ['#b3262a', '#e2b43a', '#2f6f9a']),
  'flying-carpet-2': () => flyingCarpet('flying-carpet-2', ['#2f6f9a', '#f4efe6', '#e2b43a']),
  'sun-barque': () => solarBarque(),
  'pushpaka': () => vimana(),
  'festival-dragon': () => festivalDragon(),
  'janggan': () => janggan(),
  'pegasi': () => ({ id: 'pegasi', name: 'winged horses', realm: 'sky', len: 3, speed: 12, alt: [30, 70], radius: [90, 260], bob: 2, bank: 0.25, group: { n: 2, spacing: 9 }, pieces: quadruped({ ...HORSE('#ffffff', '#ffd6f0'), wings: '#ffffff' }) }),
  'unicorns-flying': () => ({ id: 'unicorns-flying', name: 'winged unicorns', realm: 'sky', len: 3, speed: 12, alt: [30, 70], radius: [90, 260], bob: 2, bank: 0.25, pieces: quadruped({ ...HORSE('#fff4fa', '#b8a4ff', { horns: 'unicorn' }), wings: '#f4ecff' }) }),
  'little-dragons': () => ({ id: 'little-dragons', name: 'little dragons', realm: 'sky', len: 3, speed: 14, alt: [40, 90], radius: [120, 300], bob: 3, bank: 0.35, group: { n: 3, spacing: 7 }, pieces: quadruped({ len: 2, h: 1, girth: 0.35, col: '#5ac8a0', col2: '#ffd23a', neckLen: 0.8, neckUp: 0.5, headR: 0.24, snout: 1.4, horns: 'antlers', tail: 'thin', wings: '#8affc8' }) }),
  'sky-whale': () => ({ id: 'sky-whale', name: 'sky whale', realm: 'sky', len: 30, speed: 5, alt: [80, 140], radius: [200, 420], bob: 4, bank: 0.05, pieces: skyWhale('#5a7ab8', '#dfe8ff', 30, '#bfe8ff') }),
  'sky-koi': () => ({ id: 'sky-koi', name: 'sky koi', realm: 'sky', len: 5, speed: 6, alt: [35, 70], radius: [80, 200], bob: 3, bank: 0.3, group: { n: 3, spacing: 9 }, pieces: skyKoi('#ff5a3a', '#ffffff', 5) }),
  'sky-koi-2': () => ({ id: 'sky-koi-2', name: 'sky koi', realm: 'sky', len: 5, speed: 6, alt: [35, 70], radius: [80, 200], bob: 3, bank: 0.3, group: { n: 2, spacing: 9 }, pieces: skyKoi('#1b1b24', '#ffd23a', 5) }),
  'cranes': () => withGroup({ id: 'cranes', name: 'cranes', realm: 'sky', len: 1.4, speed: 9, alt: [30, 60], radius: [100, 300], bob: 1, bank: 0.3, pieces: bird({ len: 1.2, col: '#f4f4f4', col2: '#1b1b20', beak: '#c9b06a', span: 2.2, neckLen: 0.5, neckUp: 0.05, headR: 0.08, tail: 'short', crest: '#e8342a', tip: '#1b1b20' }) }, 5, 3),
  'eagle': () => ({ id: 'eagle', name: 'sea eagle', realm: 'sky', len: 1.2, speed: 11, alt: [50, 110], radius: [150, 320], bob: 2, bank: 0.4, pieces: bird({ len: 1.0, col: '#6b4a30', col2: '#e8dcc0', beak: '#f2c14e', span: 2.4, neckLen: 0.12, neckUp: 0.1, headR: 0.1, tail: 'fan', tip: '#3a2a22' }) }),
  'owls': () => withGroup({ id: 'owls', name: 'snowy owls', realm: 'sky', len: 0.9, speed: 8, alt: [20, 45], radius: [80, 200], bob: 1, bank: 0.3, pieces: bird({ len: 0.7, col: '#f4f6f8', col2: '#e0e4ea', beak: '#2a2a30', span: 1.5, neckLen: 0.05, neckUp: 0.2, headR: 0.13, tail: 'short', tip: '#c8ccd6' }) }, 2, 5),
  'falcons': () => withGroup({ id: 'falcons', name: 'falcons', realm: 'sky', len: 0.7, speed: 13, alt: [40, 80], radius: [90, 260], bob: 1, bank: 0.45, pieces: bird({ len: 0.5, col: '#8a6a4a', col2: '#e8dcc0', beak: '#f2c14e', span: 1.1, neckLen: 0.05, neckUp: 0.1, headR: 0.07, tail: 'short', tip: '#3a2a22' }) }, 2, 6),
  'roc': () => ({ id: 'roc', name: 'the great roc', realm: 'sky', len: 8, speed: 12, alt: [90, 150], radius: [250, 450], bob: 3, bank: 0.3, pieces: bird({ len: 7, col: '#8a5a36', col2: '#e8c48a', beak: '#e2b43a', span: 22, neckLen: 1.2, neckUp: 0.1, headR: 0.9, tail: 'fan', tip: '#3a2a22' }) }),
  'phoenix': () => ({ id: 'phoenix', name: 'phoenix', realm: 'sky', len: 3, speed: 11, alt: [60, 110], radius: [150, 320], bob: 3, bank: 0.35, pieces: bird({ len: 2.4, col: '#ff6a2a', col2: '#ffd23a', beak: '#ffe9a8', span: 7, neckLen: 0.5, neckUp: 0.3, headR: 0.25, tail: 'long', crest: '#ffd23a', tip: '#ffe9a8' }) }),
  'peacock-garuda': () => ({ id: 'peacock-garuda', name: 'garuda', realm: 'sky', len: 4, speed: 10, alt: [70, 120], radius: [180, 340], bob: 3, bank: 0.3, pieces: bird({ len: 3.5, col: '#e2b43a', col2: '#c23b2a', beak: '#ffe9a8', span: 11, neckLen: 0.6, neckUp: 0.3, headR: 0.35, tail: 'fan', crest: '#2f7a5a', tip: '#2f7a5a' }) }),
  'pigeons': () => withGroup({ id: 'pigeons', name: 'pigeon flight', realm: 'sky', len: 0.4, speed: 10, alt: [25, 50], radius: [60, 160], bob: 1, bank: 0.4, pieces: bird({ len: 0.35, col: '#f4f4f4', col2: '#c8ccd6', beak: '#e8a0a0', span: 0.65, neckLen: 0.05, neckUp: 0.4, headR: 0.05, tail: 'fan' }) }, 9, 1.4),
  // Air decorations (docs/team/handoffs/AIR_AND_SKY.md): gulls over the harbours, paragliders over
  // the Alps, sky lanterns rising at dusk, butterflies over the Meadow.
  'seagulls': () => withGroup({ id: 'seagulls', name: 'seagulls', realm: 'sky', len: 0.5, speed: 9, alt: [14, 40], radius: [80, 260], bob: 2, bank: 0.5, pieces: bird({ len: 0.45, col: '#f7f7f7', col2: '#b8bec8', beak: '#f2c14e', span: 1.2, neckLen: 0.06, neckUp: 0.2, headR: 0.06, tail: 'fan', tip: '#1b1b20' }) }, 6, 2.2),
  'paraglider': () => paraglider(),
  'sky-lanterns': () => withGroup({ id: 'sky-lanterns', name: 'sky lanterns', realm: 'sky', len: 0.6, speed: 1.6, alt: [40, 120], radius: [30, 180], bob: 3, bank: 0, pieces: [P((s) => {
    // A kongming lantern: a tall rice-paper bell, glowing from the flame inside.
    s.cyl(0.32, 0.26, 0.8, '#ffb84a', [0, 0.4, 0], { glow: true, seg: 8 });
    s.cyl(0.27, 0.27, 0.04, '#6b4a2a', [0, 0.02, 0], { seg: 8 });
  })] }, 12, 5),
  'butterflies': () => withGroup({ id: 'butterflies', name: 'butterflies', realm: 'sky', len: 0.2, speed: 2.2, alt: [4, 10], radius: [40, 140], bob: 1, bank: 0.3, pieces: [
    P((s) => s.box(0.03, 0.03, 0.18, '#2a2a2a', [0, 0, 0])),
    ...[1, -1].map((sx) => P((s) => {
      s.shape([[0, 0], [0.16, 0.12], [0.2, -0.02], [0.1, -0.14]].map(([x, y]) => [x * sx, y]), 0.005, sx > 0 ? '#ff8fb8' : '#ffb84a', [0, 0, 0.02], { r: [Math.PI / 2, 0, 0] });
    }, sx > 0 ? 'flapL' : 'flapR', [0, 0, 0], 0.9)),
  ] }, 7, 1.5),
  'light-birds': () => withGroup({ id: 'light-birds', name: 'birds of light', realm: 'sky', len: 0.8, speed: 9, alt: [25, 60], radius: [60, 200], bob: 1, bank: 0.35, pieces: bird({ len: 0.7, col: '#fff4c0', col2: '#e6dcff', beak: '#ffe9a8', span: 1.4, neckLen: 0.1, neckUp: 0.3, headR: 0.08, tail: 'long', tip: '#ffd6f0' }) }, 4, 2.5),

  // Modern and futuristic, tuk-tuks, rafts, ships and planes.
  'sedan': () => modern('sedan', 'sedan', '#c8ccd6', 'sedan'),
  'sedan-2': () => modern('sedan-2', 'sedan', '#2a3a5a', 'sedan'),
  'hatchback': () => modern('hatchback', 'hatchback', '#e8342a', 'hatch'),
  'hatchback-2': () => modern('hatchback-2', 'hatchback', '#f4f4f4', 'hatch'),
  'suv': () => modern('suv', 'SUV', '#1b1b20', 'suv'),
  'suv-2': () => modern('suv-2', 'SUV', '#4a6a4a', 'suv'),
  'pickup': () => modern('pickup', 'pickup truck', '#b3262a', 'pickup'),
  'hover-car': () => future('hover-car', 'hover car', '#f4f6f8', '#3ae8ff', true),
  'hover-car-2': () => future('hover-car-2', 'hover car', '#ff9ad8', '#ff3ad8', true),
  'future-ev': () => future('future-ev', 'electric car', '#2a2a30', '#7affc8', false),
  'future-ev-2': () => future('future-ev-2', 'electric car', '#e8eef4', '#ffd23a', false),
  'hover-bus': () => hoverBus(),
  'tuk-tuk': () => tukTuk('tuk-tuk', '#2f6fb0', '#ff3ad8'),
  'tuk-tuk-2': () => tukTuk('tuk-tuk-2', '#e8342a', '#f2d14e'),
  'raft': () => raft('raft', '#d9c28f', '#c9a060'),
  'tall-ship': () => tallShip(),
  'airliner': () => airliner('airliner', '#2f6fb0'),
  'airliner-2': () => airliner('airliner-2', '#c8102e'),
  'light-plane': () => lightPlane(),
  'sky-jet': () => skyJet(),

  // Each land's own (VEHICLES_ANIMALS_PLAN.md) — road
  'snowcat': () => snowcat(),
  'volvo-estate': () => car('volvo-estate', 'old estate car', '#2f5a8a', '#2f5a8a', { len: 4.9, h: 1.6, chrome: true }),
  'fish-lorry': () => truck('fish-lorry', 'fish lorry', '#f4f4f4', '#2f6fb0', { len: 7, stripes: '#f4f4f4' }),
  'vespa': () => scooter('vespa', 'scooter', '#9fd8c8'),
  'vespa-2': () => scooter('vespa-2', 'scooter', '#e8342a'),
  'fiat-500': () => car('fiat-500', 'little Fiat', '#f2d0a0', '#f4f1e8', { round: true, len: 3.2, chrome: true }),
  'ape': () => trike('ape', 'three-wheeled Ape', '#3a8ad9', '#6b8a9a'),
  'milk-float': () => truck('milk-float', 'milk float', '#f4f4f4', '#2f7a3a', { len: 4.6, flat: true }),
  'pedicab': () => pedicab('pedicab', '#1b1b20', '#c8102e'),
  'pedicab-2': () => pedicab('pedicab-2', '#f4f4f4', '#3ae8ff'),
  'delivery-bot': () => deliveryBot(),
  'e-moped': () => scooter('e-moped', 'e-moped', '#3aae6a', { box: '#f2d14e' }),
  'pony-car': () => modern('pony-car', 'Pony hatchback', '#c8a060', 'hatch'),
  'cargo-trike': () => trike('cargo-trike', 'cargo trike', '#2f6fb0', '#8a8a94'),
  'kei-truck': () => trike('kei-truck', 'kei truck', '#f4f4f4', '#c8ccd4'),
  'model-t': () => car('model-t', 'Model T', '#1b1b20', '#1b1b20', { len: 3.8, h: 2.0, chrome: true }),
  'icecream-truck': () => truck('icecream-truck', 'ice-cream truck', '#f4f4f4', '#ffd6e8', { len: 6, icecream: true }),
  'school-bus': () => bus('school-bus', 'yellow school bus', '#ffb000', '#1b1b20', 10.5, 1),
  'ambassador': () => car('ambassador', 'Ambassador', '#f4f1e8', '#f4f1e8', { round: true, len: 4.5, chrome: true, taxi: '#f2d14e' }),
  'royal-enfield': () => scooter('royal-enfield', 'motorbike', '#1b1b20', { moto: true }),
  'microbus': () => bus('microbus', 'microbus', '#f4f4f4', '#2f6fb0', 6, 1),
  'hedgehog-wagon': () => cart('hedgehog-wagon', 'hedgehog wagon', HORSE('#e8dcc0', '#f4efe6'), false, (s) => {
    s.ball(1.2, '#8a6444', [0, 1.6, -1], { s: [1, 0.8, 1.2], seg: 14 });
    for (let i = 0; i < 24; i++) s.cone(0.1, 0.5, '#6b4a30', [Math.cos(i * 1.3) * 0.9, 2.0 + Math.sin(i * 0.7) * 0.4, -1 + Math.sin(i * 1.3) * 1.0], { r: [Math.sin(i) * 0.6, 0, Math.cos(i) * 0.6] });
    for (const sx of [-1, 1]) { s.box(0.05, 0.4, 0.5, WARM, [sx * 1.15, 1.6, -1], { glow: true }); for (const z of [0, -2]) s.wheel(0.5, 0.1, [sx * 1.0, 0.5, z], '#e2b43a', '#ff8fb8'); }
  }, 3, 7),
  // water
  'rib': () => speedboat('rib', 'rib', '#e8342a', '#3a3a44'),
  'water-taxi': () => speedboat('water-taxi', 'water taxi', '#ffcc1a', '#f4f4f4', 8),
  'faering': () => rowBoat('faering', 'færing rowboat', '#b3262a', 5, { beam: 1.4, sheer: 0.45 }),
  'pedalo': () => rowBoat('pedalo', 'pedalo', '#f4f4f4', 3, { beam: 1.6, sheer: 0.1, canopy: '#e8342a', roof: 'flat' }),
  'thames-clipper': () => ferry('thames-clipper', 'river clipper', '#1b1b20', '#f4f4f4', 24, false),
  'vaporetto': () => ferry('vaporetto', 'vaporetto', '#f4f1e8', '#2f6f9a', 18, false),
  'rowing-eight': () => rowBoat('rowing-eight', 'rowing eight', '#f4f4f4', 14, { beam: 0.6, sheer: 0.05 }),
  'coracle': () => coracle(),
  'leaf-boat': () => leafBoat(),
  // sky
  'helicopter': () => helicopter('helicopter', '#1b3a6a', '#f2d14e'),
  'helicopter-2': () => helicopter('helicopter-2', '#e8342a', '#f4f4f4'),
  'hang-glider': () => hangGlider('#ff8a2a'),
  'crop-duster': () => biplane('crop-duster', '#f2d14e', '#1b1b20'),
  'cloud-jelly': () => cloudJelly('#bfe8ff'),
  'star-manta': () => starManta(),
};

/** Whether a design exists (ships the 3D side adds later are used as soon as they do). */
export const hasDesign = (id: string): boolean => id in DESIGNS;

export function makeDesign(id: string): Design {
  const f = DESIGNS[id];
  if (!f) throw new Error(`No design ${id}`);
  return f();
}
