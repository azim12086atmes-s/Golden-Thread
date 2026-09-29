import { featheredWing, piece, type Piece } from './creatures';
import type { Shaper, V3 } from './shaper';
import type { Design } from './designs';

/**
 * Ships for the sea lanes (CHATGPT_3D_MODELS.md §12.4; `SEA_TRAFFIC` in roster.ts sails each one
 * the moment its id exists). A kit of ship parts — a hull with a painted boot-top at the waterline,
 * superstructure tiers with lit windows, portholes, funnels, masts, cranes, hatch covers and
 * container stacks, lifeboats on davits, lateen, square and junk sails, navigation lights — and
 * the ships built from it, each after a real type.
 *
 * Frame: forward +z, up +y, the waterline at y = 0; port (left) is +x, starboard −x. Portholes and
 * windows go in the glow (dark by day, lit at night). No people on deck; no faces or eyes on any
 * bow or figurehead — flowers and waves instead. Nothing here carries a person.
 */

type C = string;
const P = (fn: (s: Shaper) => void, anim: Piece['anim'] = 'none', pivot: V3 = [0, 0, 0], amp = 0) => piece(fn, 'vehicle', anim, pivot, amp);
const WHITE = '#f4f4f0', BLACK = '#1f2024', WARM = '#ffd9a0', STEEL = '#8a9098', WOOD = '#8a5a36', TEAK = '#b08a5a', SAIL = '#f4efe6';

// ───── the hull ─────

interface HullSpec { len: number; beam: number; free: number; draft: number; hull: C; boot: C; deck: C; sheer?: number; bluff?: number }

/** The hull's half-width at z (at the deck line), as `Shaper.hull` draws it. */
function halfW(h: HullSpec, z: number): number {
  const t = z / h.len + 0.5, b = h.bluff ?? 0.75;
  if (t < 0 || t > 1) return 0;
  return (h.beam / 2) * (t < 0.4 ? b + (1 - b) * Math.sin((t / 0.4) * Math.PI / 2) : Math.pow(Math.max(0, Math.cos(((t - 0.4) / 0.6) * Math.PI / 2)), 0.75));
}
/** The deck line's height at z (it rises toward bow and stern with the sheer). */
function deckY(h: HullSpec, z: number): number {
  const t = z / h.len + 0.5;
  return h.free + (h.sheer ?? 0.4) * Math.pow(2 * t - 1, 2) * (t > 0.5 ? 1.4 : 1);
}
/** How far out the side is at z, `dy` below the deck line. */
function sideX(h: HullSpec, z: number, dy: number): number {
  const t = z / h.len + 0.5, D = (h.free + h.draft) * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.2 + 0.15) * Math.PI) ** 0.6);
  return halfW(h, z) * Math.sqrt(Math.max(0, 1 - (dy / D) ** 2));
}

/**
 * The hull: the boot-top colour below, the topsides over it (a second, slightly fuller shell that
 * meets the first 0.4 m above the waterline, so a band of the boot colour shows along it).
 */
function hull(s: Shaper, h: HullSpec): void {
  const D = h.free + h.draft, dy = Math.max(0.3, h.free - 0.4), k = 1.015;
  const Dt = dy / Math.sqrt(Math.max(1e-3, 1 - (1 - (dy / D) ** 2) / (k * k)));
  s.hull(h.len, h.beam, D, h.boot, [0, h.free, 0], { sheer: h.sheer ?? 0.4, bluff: h.bluff, deck: h.deck });
  s.hull(h.len, h.beam * k, Dt, h.hull, [0, h.free + 0.01, 0], { sheer: h.sheer ?? 0.4, bluff: h.bluff, deck: h.deck });
}

/** Rows of round portholes along both sides between z0 and z1, `dy` below the deck line. */
function portholes(s: Shaper, h: HullSpec, z0: number, z1: number, dy: number, step = 1.6, r = 0.22): void {
  for (let z = z0; z <= z1; z += step) {
    const x = sideX(h, z, dy);
    if (x < 0.5) continue;
    for (const sx of [-1, 1]) s.cyl(r, r, 0.08, WARM, [sx * (x * 1.015 + 0.02), deckY(h, z) - dy, z], { r: [0, 0, Math.PI / 2], glow: true, seg: 6 });
  }
}

/**
 * A painted band (or rail) along both sides from z0 to z1, `dy` below the deck line, `hgt` tall:
 * short lengths that follow the hull's curve and its sheer.
 */
function band(s: Shaper, h: HullSpec, z0: number, z1: number, dy: number, hgt: number, col: C, out = 0.03): void {
  const step = 1.5;
  for (let z = z0; z < z1; z += step) {
    const za = z, zb = Math.min(z1, z + step), zm = (za + zb) / 2;
    const xa = sideX(h, za, dy) * 1.015 + out, xb = sideX(h, zb, dy) * 1.015 + out;
    if (Math.min(xa, xb) < 0.3) continue;
    const ya = deckY(h, za) - dy, yb = deckY(h, zb) - dy, len = Math.hypot(xb - xa, zb - za);
    for (const sx of [-1, 1]) s.box(0.06, hgt, len + 0.05, col, [sx * (xa + xb) / 2, (ya + yb) / 2, zm], { r: [-Math.atan2(yb - ya, zb - za), sx * Math.atan2(xb - xa, zb - za), 0] });
  }
}

/** A superstructure tier: a box with a band of windows round it (lit at night) and a deck edge. */
function tier(s: Shaper, w: number, hgt: number, d: number, y: number, z: number, col: C = WHITE, win: C = '#2a3a4a'): void {
  s.box(w, hgt, d, col, [0, y + hgt / 2, z]);
  for (const sx of [-1, 1]) {
    s.box(0.04, hgt * 0.34, d * 0.9, win, [sx * (w / 2 + 0.01), y + hgt * 0.58, z]);
    s.box(0.03, hgt * 0.26, d * 0.86, WARM, [sx * (w / 2 + 0.03), y + hgt * 0.58, z], { glow: true });
  }
  s.box(w * 0.9, hgt * 0.34, 0.04, win, [0, y + hgt * 0.58, z + d / 2 + 0.01]);
  s.box(w + 0.3, 0.12, d + 0.3, col, [0, y + hgt, z]);
}

/** The bridge on top: a wide wheelhouse with raked windows and wings out to the sides. */
function bridge(s: Shaper, w: number, y: number, z: number, col: C = WHITE): void {
  s.box(w, 2.2, 4, col, [0, y + 1.1, z]);
  s.box(w * 0.94, 0.9, 0.06, '#1c2836', [0, y + 1.5, z + 2.02], { r: [-0.2, 0, 0] });
  s.box(w * 0.9, 0.7, 0.04, WARM, [0, y + 1.5, z + 2.05], { glow: true, r: [-0.2, 0, 0] });
  s.box(w + 3, 0.2, 2, col, [0, y + 2.2, z + 0.6]);
  s.box(w + 1, 0.3, 4.4, col, [0, y + 2.35, z]);
}

/** A funnel: raked back, a coloured band and a black top. */
function funnel(s: Shaper, r: number, hgt: number, y: number, z: number, body: C, band?: C, rake = 0.12, x = 0): void {
  s.cyl(r * 0.92, r, hgt, body, [x, y + hgt / 2, z], { r: [-rake, 0, 0], s: [1, 1, 1.35], seg: 14 });
  if (band) s.cyl(r * 0.95, r * 0.96, hgt * 0.18, band, [x, y + hgt * 0.62, z - hgt * 0.62 * rake], { r: [-rake, 0, 0], s: [1.01, 1, 1.37], seg: 14 });
  s.cyl(r * 0.9, r * 0.92, hgt * 0.12, BLACK, [x, y + hgt * 0.95, z - hgt * 0.95 * rake], { r: [-rake, 0, 0], s: [1.02, 1, 1.38], seg: 14 });
}

/** A mast with a crosstree, a white masthead light, and stays fore and aft. */
function mast(s: Shaper, hgt: number, y: number, z: number, stayF: number, stayA: number, col: C = STEEL): void {
  s.cyl(0.14, 0.22, hgt, col, [0, y + hgt / 2, z], { seg: 8 });
  s.box(3, 0.12, 0.12, col, [0, y + hgt * 0.8, z]);
  s.ball(0.18, '#ffffff', [0, y + hgt + 0.2, z], { glow: true, seg: 6 });
  s.rod([0, y + hgt, z], [0, y, z + stayF], 0.03, '#3a3a40');
  s.rod([0, y + hgt, z], [0, y, z - stayA], 0.03, '#3a3a40');
}

/** Red to port, green to starboard, on the bridge wings; a white light at the stern. */
function navLights(s: Shaper, x: number, y: number, z: number, sternZ: number, sternY: number): void {
  s.box(0.25, 0.25, 0.25, '#ff3a3a', [x, y, z], { glow: true });
  s.box(0.25, 0.25, 0.25, '#3aff6a', [-x, y, z], { glow: true });
  s.box(0.25, 0.25, 0.25, '#ffffff', [0, sternY, sternZ], { glow: true });
}

/** A lifeboat hung on its davits over the side at z (both sides). */
function lifeboats(s: Shaper, x: number, y: number, zs: number[], col = '#e8742a'): void {
  for (const z of zs) for (const sx of [-1, 1]) {
    s.ball(1, col, [sx * x, y, z], { s: [0.9, 0.55, 3.2], seg: 10 });
    s.box(1.5, 0.2, 5, WHITE, [sx * x, y + 0.45, z]);
    for (const dz of [-2, 2]) s.rod([sx * (x - 1.2), y - 1, z + dz], [sx * x, y + 1.1, z + dz], 0.08, STEEL);
  }
}

/** A deck crane: a post, a cab, a jib raised forward, the cable down. */
function crane(s: Shaper, y: number, z: number, jib: number, col: C, yaw = 0): void {
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  s.cyl(0.5, 0.6, 5, col, [0, y + 2.5, z], { seg: 10 });
  s.box(1.6, 1.4, 1.8, col, [0, y + 5.4, z]);
  const tip: V3 = [sn * jib * 0.85, y + 5 + jib * 0.5, z + c * jib * 0.85];
  s.rod([0, y + 5, z], tip, 0.2, col);
  s.rod(tip, [tip[0], y + 3, tip[2]], 0.03, '#2a2a2a');
}

/** A triangular (lateen) sail on a long raked yard, in the fore-and-aft plane. */
function lateen(s: Shaper, y: number, z: number, hgt: number, len: number, col: C = SAIL): void {
  s.rod([0, y + hgt * 0.1, z + len * 0.55], [0, y + hgt, z - len * 0.45], 0.12, WOOD);
  s.shape([[-len * 0.55, hgt * 0.1], [len * 0.45, hgt], [len * 0.3, 0.2]], 0.04, col, [0, y, z], { r: [0, Math.PI / 2, 0] });
}

/** A square sail on its yard, across the ship, bellied a little forward. */
function squareSail(s: Shaper, y: number, z: number, w: number, hgt: number, col: C = SAIL): void {
  s.rod([-w / 2 - 0.4, y + hgt / 2, z], [w / 2 + 0.4, y + hgt / 2, z], 0.09, WOOD);
  s.box(w, hgt, 0.08, col, [0, y, z + 0.25], { s: [1, 1, 1] });
  s.box(w * 0.8, hgt * 0.8, 0.08, col, [0, y, z + 0.45]);
}

/** A battened junk sail: a panel with bamboo battens across it. */
function junkSail(s: Shaper, y: number, z: number, w: number, hgt: number, col: C): void {
  s.box(0.06, hgt, w, col, [0, y + hgt / 2, z - w * 0.15]);
  for (let k = 0; k <= 6; k++) s.box(0.14, 0.08, w * 1.04, '#c8a86a', [0, y + (k / 6) * hgt, z - w * 0.15]);
}

/** Stacks of containers across the deck from z0 to z1, `cols` across, up to `tiers` high. */
function containers(s: Shaper, y: number, z0: number, z1: number, beam: number, tiers: number, seed = 1): void {
  const cols = ['#c23b2a', '#2f6f9a', '#e2b43a', '#3f8a3a', '#e07a2a', '#7a3a8a', '#e8e8e8', '#2a8a8a'];
  const nx = Math.max(2, Math.floor((beam * 0.86) / 2.5));
  for (let z = z0; z + 6.2 <= z1; z += 6.6) for (let i = 0; i < nx; i++) {
    const h = 1 + ((i * 7 + Math.round(z) * 3 + seed) % tiers);
    for (let t = 0; t < h; t++) {
      const col = cols[(i * 5 + t * 3 + Math.round(z) + seed) % cols.length];
      const x = (i - (nx - 1) / 2) * 2.5, yy = y + t * 2.6 + 1.3;
      s.box(2.44, 2.59, 6.1, col, [x, yy, z + 3.05]);
      s.box(2.46, 0.08, 6.12, '#1f1f24', [x, yy + 1.2, z + 3.05]);
    }
  }
}

// ───── the ships ─────

function cargoShip(): Design {
  const h: HullSpec = { len: 78, beam: 12.5, free: 5, draft: 4, hull: '#2a3a4a', boot: '#8a2a22', deck: '#6a6258', bluff: 0.85, sheer: 0.8 };
  return {
    id: 'cargo-ship', name: 'cargo ship', realm: 'water', len: h.len, speed: 3.4, bob: 0.1,
    pieces: [P((s) => {
      hull(s, h);
      // A raised forecastle, the hatch covers and deck cranes between them, crates on the covers.
      s.box(halfW(h, 30) * 1.8, 1.6, 12, h.hull, [0, h.free + 0.8, 32]);
      for (const [k, z] of [-14, -2, 10, 22].entries()) {
        s.box(h.beam * 0.62, 1.1, 9, '#3a6a4a', [0, h.free + 0.55, z]);
        for (let r = 0; r < 4; r++) s.box(h.beam * 0.63, 0.06, 0.08, '#2a4a3a', [0, h.free + 1.12, z - 3.6 + r * 2.4]);
        if (k % 2 === 0) for (let i = 0; i < 4; i++) s.box(2, 1.6, 2.4, ['#a8804a', '#8a6a4a', '#c8a86a'][i % 3], [-2.6 + (i % 2) * 2.4, h.free + 1.9, z - 1.5 + Math.floor(i / 2) * 2.8]);
      }
      for (const z of [4, 16]) crane(s, h.free, z, 12, '#e2b43a', 0.3);
      crane(s, h.free, -8, 12, '#e2b43a', -0.3);
      // The accommodation aft: three tiers and the bridge, the funnel behind.
      const z = -h.len * 0.34;
      tier(s, h.beam * 0.8, 2.6, 9, h.free, z);
      tier(s, h.beam * 0.72, 2.6, 8, h.free + 2.7, z);
      tier(s, h.beam * 0.64, 2.6, 7, h.free + 5.4, z);
      bridge(s, h.beam * 0.66, h.free + 8.1, z + 1);
      funnel(s, 1.5, 6, h.free + 5.4, z - 5.5, '#2a3a4a', '#e2b43a');
      mast(s, 9, h.free + 1.6, 32, 5, 10);
      lifeboats(s, h.beam * 0.46, h.free + 3.4, [z - 2]);
      portholes(s, h, -30, -22, 1.6, 1.4);
      navLights(s, h.beam * 0.5 + 1.2, h.free + 10.4, z + 1.6, -h.len / 2 + 0.3, h.free + 1.5);
    }), P((s) => s.box(3, 0.12, 0.4, '#3a3a40', [0, 0, 0]), 'spinY', [0, h.free + 11.6, -h.len * 0.34 + 1], 0.3)],
  };
}

function containerShip(): Design {
  const h: HullSpec = { len: 108, beam: 17, free: 5.5, draft: 5, hull: '#1f3a6a', boot: '#8a2a22', deck: '#5a5a60', bluff: 0.9, sheer: 0.9 };
  const z = -h.len * 0.4;
  return {
    id: 'container-ship', name: 'container ship', realm: 'water', len: h.len, speed: 3.8, bob: 0.08,
    pieces: [P((s) => {
      hull(s, h);
      s.box(halfW(h, 44) * 1.8, 2, 10, h.hull, [0, h.free + 1, 46]);
      containers(s, h.free, -h.len * 0.33, h.len * 0.4, h.beam, 4, 3);
      // Lashing bridges between the bays: grey frames.
      for (let q = -h.len * 0.33; q < h.len * 0.4; q += 13.2) s.box(h.beam * 0.9, 0.4, 0.3, STEEL, [0, h.free + 6, q]);
      // The deckhouse aft, tall enough to see over the stacks, and the funnel.
      for (let t = 0; t < 5; t++) tier(s, h.beam * 0.74, 2.6, 8, h.free + t * 2.7, z);
      bridge(s, h.beam * 0.7, h.free + 13.5, z + 0.5);
      funnel(s, 1.6, 6, h.free + 8, z - 6, WHITE, '#1f3a6a');
      mast(s, 7, h.free + 16, z, 2, 2);
      lifeboats(s, h.beam * 0.46, h.free + 4, [z - 1]);
      navLights(s, h.beam * 0.5 + 1.2, h.free + 15.6, z + 1, -h.len / 2 + 0.3, h.free + 1.5);
    })],
  };
}

function oceanLiner(): Design {
  const h: HullSpec = { len: 112, beam: 14, free: 7, draft: 5, hull: '#141418', boot: '#a32a22', deck: '#b8a078', bluff: 0.55, sheer: 1.6 };
  return {
    id: 'ocean-liner', name: 'ocean liner', realm: 'water', len: h.len, speed: 3.6, bob: 0.06,
    pieces: [P((s) => {
      hull(s, h);
      // A white band at the deck line, two rows of portholes.
      band(s, h, -h.len * 0.46, h.len * 0.47, 0.3, 0.5, WHITE);
      for (const dy of [1.6, 3.2]) portholes(s, h, -h.len * 0.38, h.len * 0.34, dy, 1.5, 0.22);
      // White superstructure in tiers, stepped back fore and aft; lit promenade windows.
      tier(s, h.beam * 0.86, 2.8, h.len * 0.6, h.free, -6);
      tier(s, h.beam * 0.8, 2.6, h.len * 0.5, h.free + 2.9, -8);
      tier(s, h.beam * 0.7, 2.4, h.len * 0.36, h.free + 5.6, -8);
      bridge(s, h.beam * 0.72, h.free + 8.1, 12);
      // Three red funnels with black tops, raked.
      for (const zz of [4, -12, -28]) funnel(s, 2.2, 9, h.free + 8, zz, '#c8382a', undefined, 0.16);
      lifeboats(s, h.beam * 0.45, h.free + 8.8, [-2, -8, -18, -24, -34]);
      mast(s, 18, h.free + 1, h.len * 0.34, 12, 8, '#e8e8e0');
      mast(s, 14, h.free + 1, -h.len * 0.4, 6, 10, '#e8e8e0');
      navLights(s, h.beam * 0.5 + 1.5, h.free + 10.4, 12.6, -h.len / 2 + 0.3, h.free + 2);
    })],
  };
}

function cruiseShip(): Design {
  const h: HullSpec = { len: 115, beam: 18, free: 6, draft: 4.5, hull: WHITE, boot: '#1f3a6a', deck: '#9ab8a0', bluff: 0.8, sheer: 0.8 };
  return {
    id: 'cruise-ship', name: 'solarpunk cruise ship', realm: 'water', len: h.len, speed: 3.4, bob: 0.06,
    pieces: [P((s) => {
      hull(s, h);
      band(s, h, -h.len * 0.46, h.len * 0.46, h.free - 1.4, 0.6, '#3aae6a');
      portholes(s, h, -h.len * 0.4, h.len * 0.3, 2.6, 1.4, 0.2);
      // Six stepped decks of balcony cabins: glass, a white divider between each, lit at night.
      for (let t = 0; t < 6; t++) {
        const w = h.beam * (0.86 - t * 0.04), d = h.len * (0.58 - t * 0.05), y = h.free + t * 2.9, zc = -18 - t * 1.2;
        s.box(w, 2.8, d, WHITE, [0, y + 1.4, zc]);
        for (const sx of [-1, 1]) {
          s.box(0.05, 1.6, d * 0.96, '#2a4a5a', [sx * (w / 2 + 0.02), y + 1.5, zc]);
          s.box(0.04, 1.2, d * 0.94, WARM, [sx * (w / 2 + 0.04), y + 1.5, zc], { glow: true });
          for (let q = zc - d / 2 + 1; q < zc + d / 2; q += 3) s.box(0.3, 2.6, 0.12, WHITE, [sx * (w / 2 + 0.1), y + 1.4, q]);
          s.box(0.3, 0.1, d, '#c8e8f0', [sx * (w / 2 + 0.2), y + 0.9, zc]); // the balcony rail
        }
      }
      // Forward decks narrowing with the bow: lounges looking ahead, a sun deck on top.
      tier(s, 2 * halfW(h, 34) * 0.92, 2.8, 16, h.free, 27);
      tier(s, 2 * halfW(h, 30) * 0.9, 2.6, 10, h.free + 2.9, 24);
      bridge(s, h.beam * 0.74, h.free + 11.6, 1);
      // The garden deck on top: lawns, trees, a pool; and three rigid solar sails.
      const top = h.free + 17.4;
      s.box(h.beam * 0.6, 0.3, h.len * 0.26, '#5aa04a', [0, top + 0.15, -24]);
      for (let i = 0; i < 10; i++) { const x = ((i % 2) - 0.5) * h.beam * 0.4, zz = -36 + Math.floor(i / 2) * 5.5; s.cyl(0.15, 0.2, 2, '#6a4a2a', [x, top + 1.2, zz], { seg: 5 }); s.ball(1.4, i % 3 ? '#3f8a3a' : '#5ab04a', [x, top + 3, zz], { seg: 7 }); }
      s.box(4, 0.2, 8, '#4ac8e8', [0, top + 0.35, -22]);
      for (const zz of [-4, -18, -32]) {
        s.cyl(0.35, 0.45, 26, WHITE, [0, top + 13, zz], { seg: 10 });
        s.box(0.4, 22, 9, '#1f2f5a', [0, top + 14, zz - 3]);
        for (let k = 0; k < 6; k++) s.box(0.45, 0.08, 9, '#8aa0c8', [0, top + 4 + k * 3.6, zz - 3]);
        s.box(0.46, 22, 0.14, '#8aa0c8', [0, top + 14, zz - 3]);
      }
      funnel(s, 1.8, 5, top, -42, WHITE, '#3aae6a', 0.1);
      lifeboats(s, h.beam * 0.47, h.free + 4.2, [0, -10, -20, -30, -40]);
      navLights(s, h.beam * 0.5 + 1.6, h.free + 13.7, 1.6, -h.len / 2 + 0.3, h.free + 2);
    })],
  };
}

function ferryLarge(): Design {
  // A ro-ro ferry stands high out of the water: the car deck is inside the hull.
  const h: HullSpec = { len: 62, beam: 14, free: 8.5, draft: 3.5, hull: '#1f4a8a', boot: '#8a2a22', deck: '#8a8a90', bluff: 0.95, sheer: 0.6 };
  return {
    id: 'ferry-large', name: 'car ferry', realm: 'water', len: h.len, speed: 3.8, bob: 0.08,
    pieces: [P((s) => {
      hull(s, h);
      // The stern door and the bow visor's seams; a white band along the car deck.
      s.box(h.beam * 0.6, 4.2, 0.1, '#15305a', [0, h.free - 3, -h.len / 2 - 0.02]);
      band(s, h, -h.len * 0.46, h.len * 0.44, 1.2, 0.6, WHITE);
      for (const sx of [-1, 1]) s.rod([sx * 3.5, h.free - 0.5, 23], [0, h.free - 4, 29], 0.08, '#15305a');
      portholes(s, h, -20, 16, 2.4, 2.2, 0.28);
      // Passenger decks in white with windows, open decks with rails, two funnels side by side.
      tier(s, h.beam * 0.9, 2.8, h.len * 0.6, h.free, -1);
      tier(s, h.beam * 0.84, 2.6, h.len * 0.42, h.free + 2.9, 1);
      bridge(s, h.beam * 0.78, h.free + 5.6, 10);
      for (const sx of [-1, 1]) {
        for (let q = -21; q < 19; q += 1.2) s.rod([sx * h.beam * 0.44, h.free + 2.9, q], [sx * h.beam * 0.44, h.free + 3.9, q], 0.03, WHITE);
        s.box(0.06, 0.06, 40, WHITE, [sx * h.beam * 0.44, h.free + 3.9, -1]);
        funnel(s, 1.2, 5, h.free + 5.6, -12, WHITE, '#1f4a8a', 0.08, sx * 2.6);
      }
      lifeboats(s, h.beam * 0.49, h.free + 3.4, [-6, -14]);
      mast(s, 6, h.free + 8, 10, 1, 1);
      navLights(s, h.beam * 0.5 + 1.2, h.free + 7.8, 10.6, -h.len / 2 + 0.3, h.free + 1);
    })],
  };
}

function fishingTrawler(): Design {
  const h: HullSpec = { len: 26, beam: 7.5, free: 2.4, draft: 2.6, hull: '#1f4a7a', boot: '#8a2a22', deck: '#6a6258', bluff: 0.9, sheer: 1.6 };
  return {
    id: 'fishing-trawler', name: 'trawler', realm: 'water', len: h.len, speed: 3, bob: 0.18,
    pieces: [P((s) => {
      hull(s, h);
      s.box(5, 2.6, 5, WHITE, [0, h.free + 1.3, 3]);
      s.box(4.6, 0.9, 0.06, '#1c2836', [0, h.free + 2, 5.52]);
      s.box(4.4, 0.7, 0.05, WARM, [0, h.free + 2, 5.56], { glow: true });
      s.box(5.4, 0.2, 5.4, '#c23b2a', [0, h.free + 2.7, 3]);
      mast(s, 7, h.free + 2.8, 3, 5, 6);
      // The stern gantry, the net drum, orange floats on the net.
      for (const sx of [-1, 1]) s.rod([sx * 3, h.free, -11.5], [sx * 2, h.free + 6, -11], 0.25, '#e2b43a');
      s.rod([-2.2, h.free + 6, -11], [2.2, h.free + 6, -11], 0.25, '#e2b43a');
      s.cyl(1, 1, 4, '#3a4a3a', [0, h.free + 1.2, -7], { r: [0, 0, Math.PI / 2], seg: 12 });
      for (let i = 0; i < 9; i++) s.ball(0.28, '#ff7a1a', [-2 + (i % 5), h.free + 2.3, -7 + Math.floor(i / 5) * 0.6 - 0.3], { seg: 6 });
      s.box(4, 0.4, 3, '#2f4a3a', [0, h.free + 0.2, -3]);
      navLights(s, 2.7, h.free + 2.4, 3, -h.len / 2 + 0.3, h.free + 1.2);
    })],
  };
}

function hurtigruten(): Design {
  const h: HullSpec = { len: 64, beam: 12, free: 5, draft: 3.8, hull: '#141418', boot: '#a32a22', deck: '#b8a078', bluff: 0.7, sheer: 1.2 };
  return {
    id: 'hurtigruten', name: 'coastal steamer', realm: 'water', len: h.len, speed: 3.4, bob: 0.1,
    pieces: [P((s) => {
      hull(s, h);
      for (const dy of [1.5, 2.8]) portholes(s, h, -20, 18, dy, 1.6, 0.2);
      tier(s, h.beam * 0.8, 2.6, 30, h.free, -2);
      tier(s, h.beam * 0.7, 2.4, 20, h.free + 2.7, 0);
      bridge(s, h.beam * 0.66, h.free + 5.2, 7);
      funnel(s, 1.7, 7, h.free + 5.2, -6, BLACK, '#c8382a', 0.12);
      mast(s, 13, h.free + 1, 20, 9, 6, '#e8e8e0');
      crane(s, h.free, 16, 8, WHITE, 0.2);
      lifeboats(s, h.beam * 0.44, h.free + 5.6, [-2, -10]);
      navLights(s, h.beam * 0.5 + 1.1, h.free + 7.5, 7.6, -h.len / 2 + 0.3, h.free + 2);
    })],
  };
}

function dhowLarge(): Design {
  const h: HullSpec = { len: 34, beam: 8.5, free: 2.6, draft: 2.4, hull: '#a8783f', boot: '#6a4a2a', deck: TEAK, bluff: 0.7, sheer: 2.8 };
  return {
    id: 'dhow-large', name: 'ocean dhow', realm: 'water', len: h.len, speed: 3, bob: 0.15,
    pieces: [P((s) => {
      hull(s, h);
      // The high carved stern: a square poop, a carved transom of stars and vines, a rail.
      s.box(h.beam * 0.7, 2.2, 6, '#8a5a36', [0, h.free + 2.6, -13]);
      s.box(h.beam * 0.66, 2, 0.12, '#c8a06a', [0, h.free + 2.6, -16.05]);
      for (let i = 0; i < 5; i++) s.ball(0.25, '#e2b43a', [-2.4 + i * 1.2, h.free + 3, -16.12], { s: [1, 1, 0.3], seg: 6 });
      s.box(h.beam * 0.72, 0.15, 6.2, '#6a4a2a', [0, h.free + 3.7, -13]);
      for (const sx of [-1, 1]) s.box(0.06, 0.6, 6, '#6a4a2a', [sx * h.beam * 0.35, h.free + 4, -13]);
      // Two raked masts with lateen sails, the long stem-head forward.
      s.rod([0, h.free, 6], [0, h.free + 20, 3.5], 0.3, WOOD);
      lateen(s, h.free + 1, 4.5, 20, 22);
      s.rod([0, h.free, -6], [0, h.free + 14, -7.6], 0.24, WOOD);
      lateen(s, h.free + 1, -7, 14, 15);
      s.rod([0, h.free + 1, 15], [0, h.free + 3.5, 19], 0.2, WOOD);
      for (let i = 0; i < 6; i++) s.box(1.1, 0.8, 1.1, ['#c8a06a', '#8a6a4a', '#d8c8a0'][i % 3], [-1.5 + (i % 3) * 1.4, h.free + 0.4, 0 + Math.floor(i / 3) * 1.5]);
      for (const sx of [-1, 1]) s.ball(0.22, '#ffcf7a', [sx * 2.4, h.free + 4.4, -15.8], { glow: true, seg: 6 });
    })],
  };
}

function junkLarge(): Design {
  const h: HullSpec = { len: 52, beam: 12, free: 3.5, draft: 3, hull: '#6a3a22', boot: '#3a2a1a', deck: TEAK, bluff: 0.95, sheer: 3.2 };
  return {
    id: 'junk-large', name: 'treasure junk', realm: 'water', len: h.len, speed: 3, bob: 0.12,
    pieces: [P((s) => {
      hull(s, h);
      // Painted waves and flowers along the bow (never eyes), a red and gold rail.
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) { const zz = 17 - i * 1.6; s.cyl(0.6, 0.6, 0.06, i % 2 ? '#e2b43a' : '#e8e0d0', [sx * (sideX(h, zz, 1) * 1.015 + 0.05), deckY(h, zz) - 1, zz], { r: [0, 0, Math.PI / 2], seg: 10 }); }
      }
      band(s, h, -h.len * 0.45, h.len * 0.44, 0.2, 0.3, '#c23b2a');
      // The high stern castle, tiered, with lanterns at its corners.
      tier(s, h.beam * 0.8, 3, 10, h.free + 1.5, -20, '#8a3a22', '#3a2a1a');
      tier(s, h.beam * 0.66, 2.6, 7, h.free + 4.6, -21, '#8a3a22', '#3a2a1a');
      s.box(h.beam * 0.76, 0.3, 8, '#2f3a4a', [0, h.free + 7.4, -21]);
      for (const sx of [-1, 1]) for (const zz of [-17.5, -24.5]) s.ball(0.4, '#e8242a', [sx * h.beam * 0.36, h.free + 6.8, zz], { glow: true, seg: 8 });
      // Five masts of battened sails in red-brown.
      for (const [zz, hh, w] of [[18, 16, 9], [8, 24, 14], [-3, 26, 15], [-12, 20, 11], [-19, 13, 7]] as const) {
        s.cyl(0.25, 0.35, hh + 2, WOOD, [0, h.free + (hh + 2) / 2, zz], { seg: 8 });
        junkSail(s, h.free + 3, zz, w, hh - 2, '#a8472a');
      }
    })],
  };
}

function phinisiLarge(): Design {
  const h: HullSpec = { len: 40, beam: 9, free: 3, draft: 2.8, hull: '#f4ead8', boot: '#6a4a2a', deck: TEAK, bluff: 0.6, sheer: 2.2 };
  return {
    id: 'phinisi-large', name: 'phinisi schooner', realm: 'water', len: h.len, speed: 3.2, bob: 0.14,
    pieces: [P((s) => {
      hull(s, h);
      band(s, h, -h.len * 0.45, h.len * 0.45, 0.3, 0.4, '#8a5a36');
      s.box(h.beam * 0.66, 2.2, 8, '#8a5a36', [0, h.free + 1.1, -12]);
      s.box(h.beam * 0.6, 0.8, 0.06, WARM, [0, h.free + 1.3, -7.95], { glow: true });
      // Two masts; on each a gaff mainsail and a topsail, three jibs to the long bowsprit: seven.
      s.rod([0, h.free + 1, 19], [0, h.free + 4, 30], 0.22, WOOD);
      for (const [zz, hh] of [[7, 26], [-5, 24]] as const) {
        s.cyl(0.25, 0.35, hh, WOOD, [0, h.free + hh / 2, zz], { seg: 8 });
        s.shape([[0, 1], [0, hh * 0.62], [8, hh * 0.5], [8, 1]], 0.05, SAIL, [0, h.free, zz - 0.2], { r: [0, Math.PI / 2, 0] });
        s.shape([[0, hh * 0.64], [0, hh * 0.95], [5, hh * 0.64]], 0.05, SAIL, [0, h.free, zz - 0.2], { r: [0, Math.PI / 2, 0] });
      }
      for (let k = 0; k < 3; k++) s.shape([[0, 1.5], [0, 22 - k * 4], [-(9 + k * 3.5), 1.5 + k]], 0.04, SAIL, [0, h.free + 0.5, 7.5 + k * 0.5], { r: [0, Math.PI / 2, 0] });
    })],
  };
}

function kettuvallamLarge(): Design {
  const h: HullSpec = { len: 28, beam: 6, free: 1.2, draft: 1.2, hull: '#5a3a22', boot: '#3a2a1a', deck: TEAK, bluff: 0.6, sheer: 1.4 };
  return {
    id: 'kettuvallam-large', name: 'rice barge houseboat', realm: 'water', len: h.len, speed: 2, bob: 0.08,
    pieces: [P((s) => {
      hull(s, h);
      // Thatched barrel roofs in three runs on posts, open sides with rolled screens, a verandah deck at the bow.
      for (const [zz, d] of [[3, 8], [-5, 7], [-11, 4]] as const) {
        const r = 2.3, y = h.free + 1.4;
        s.cyl(r, r, d, '#c8a064', [0, y, zz], { r: [Math.PI / 2, 0, 0], s: [1, 0.62, 1], seg: 14 });
        for (let k = 0; k <= d; k += 1.6) s.cyl(r * 1.02, r * 1.02, 0.1, '#8a6a3a', [0, y, zz - d / 2 + k], { r: [Math.PI / 2, 0, 0], s: [1, 0.63, 1], seg: 14 });
        for (const sx of [-1, 1]) {
          for (let k = 0; k <= d; k += d / 2) s.cyl(0.08, 0.08, 1.4, '#6a4a2a', [sx * r * 0.92, h.free + 0.7, zz - d / 2 + k], { seg: 5 });
          s.box(0.06, 0.3, d * 0.9, '#a8804a', [sx * r * 0.95, h.free + 1.3, zz]);
        }
        s.box(0.6, 0.12, d * 0.6, WARM, [0, h.free + 2.2, zz], { glow: true });
      }
      s.box(h.beam * 0.8, 0.12, 5, TEAK, [0, h.free + 0.06, 10]);
      for (const sx of [-1, 1]) for (let q = 8; q <= 12; q += 1) s.rod([sx * 2.2, h.free, q], [sx * 2.2, h.free + 0.9, q], 0.05, '#6a4a2a');
      for (const sx of [-1, 1]) s.box(0.06, 0.06, 5, '#6a4a2a', [sx * 2.2, h.free + 0.9, 10]);
      s.box(1.6, 0.5, 0.6, '#c23b2a', [0, h.free + 0.4, 10]);
      s.ball(0.25, '#ffcf7a', [0, h.free + 3.6, 3], { glow: true, seg: 8 });
    })],
  };
}

/** A full-rigged ship for the open sea: three masts of square sails, rigging, a flower figurehead. */
function fullRigger(id: string, len: number, name: string): Design {
  const h: HullSpec = { len, beam: len * 0.22, free: len * 0.06, draft: len * 0.08, hull: '#2a2420', boot: '#6a3a22', deck: TEAK, bluff: 0.55, sheer: len * 0.05 };
  const k = len / 24;
  return {
    id, name, realm: 'water', len, speed: 3, bob: 0.1,
    pieces: [P((s) => {
      hull(s, h);
      // A yellow band with the gun-ports, the stern cabin, lanterns at the stern.
      band(s, h, -len * 0.42, len * 0.4, 0.5 * k, 0.6 * k, '#e2b43a');
      for (const sx of [-1, 1]) {
        for (let q = -len * 0.3; q < len * 0.3; q += 2 * k) s.box(0.08, 0.35 * k, 0.45 * k, BLACK, [sx * (sideX(h, q, 0.5 * k) * 1.015 + 0.08), deckY(h, q) - 0.5 * k, q]);
      }
      s.box(h.beam * 0.8, 2 * k, len * 0.16, '#3a2a22', [0, h.free + 1 * k, -len * 0.38]);
      s.box(h.beam * 0.7, 0.8 * k, 0.06, WARM, [0, h.free + 1.2 * k, -len * 0.46 - 0.02], { glow: true });
      for (const sx of [-1, 1]) s.ball(0.3 * k, '#ffcf7a', [sx * h.beam * 0.3, h.free + 2.6 * k, -len * 0.46], { glow: true, seg: 8 });
      // Three masts of square sails, three to a mast; stays and shrouds.
      for (const [zz, hh] of [[len * 0.25, 16 * k], [-len * 0.04, 19 * k], [-len * 0.28, 14 * k]] as const) {
        s.cyl(0.18 * k, 0.28 * k, hh, '#5a3a26', [0, h.free + hh / 2, zz], { seg: 8 });
        for (let q = 0; q < 3; q++) squareSail(s, h.free + hh * (0.34 + q * 0.23), zz, h.beam * (1.5 - q * 0.33), hh * 0.2);
        for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) s.rod([sx * h.beam * 0.46, h.free, zz - 1 * k + r * 0.8 * k], [0, h.free + hh * 0.85, zz], 0.025 * k, '#3a2a22');
        s.rod([0, h.free + hh, zz], [0, h.free, zz + 6 * k], 0.03 * k, '#3a2a22');
      }
      // The bowsprit and jibs; a figurehead of carved flowers (no face).
      s.rod([0, h.free + 0.5 * k, len * 0.45], [0, h.free + 3.5 * k, len * 0.62], 0.14 * k, '#5a3a26');
      s.shape([[0, 0], [0, 7 * k], [-6 * k, 0]], 0.05, SAIL, [0, h.free + 2 * k, len * 0.44], { r: [0, Math.PI / 2, 0] });
      for (let i = 0; i < 5; i++) s.ball(0.28 * k, i % 2 ? '#e8742a' : '#e2b43a', [0, h.free - 0.2 * k + i * 0.3 * k, len * 0.5 + 0.1 * k], { s: [1, 1, 0.6], seg: 7 });
      navLights(s, h.beam * 0.5, h.free + 1 * k, len * 0.1, -len / 2 + 0.2, h.free + 2.4 * k);
    })],
  };
}

/** A hospital ship: white, a green band, green herb-leaf crescents (no cross), wards and a helipad. */
function hospitalShip(): Design {
  const h: HullSpec = { len: 84, beam: 15, free: 6, draft: 4.5, hull: WHITE, boot: '#2a7a4a', deck: '#9a9a9a', bluff: 0.8, sheer: 0.9 };
  return {
    id: 'hospital-ship', name: 'hospital ship', realm: 'water', len: h.len, speed: 3.2, bob: 0.08,
    pieces: [P((s) => {
      hull(s, h);
      for (const sx of [-1, 1]) {
        // The sign: a green crescent holding a herb leaf, on each side of the wards.
        const x = sx * (h.beam * 0.45 + 0.1);
        s.cyl(2.4, 2.4, 0.1, '#2a9a5a', [x, h.free + 5, 4], { r: [0, 0, Math.PI / 2], seg: 20 });
        s.cyl(2.0, 2.0, 0.12, WHITE, [x * 1.004, h.free + 5.4, 4.9], { r: [0, 0, Math.PI / 2], seg: 20 });
        s.ball(1.1, '#2a9a5a', [x * 1.008, h.free + 5, 3.4], { s: [0.1, 1.4, 0.6], r: [0.6, 0, 0], seg: 8 });
      }
      band(s, h, -h.len * 0.46, h.len * 0.45, 2, 1, '#2a9a5a');
      portholes(s, h, -30, 28, 3.2, 1.6, 0.22);
      // Wide wards in three tiers with long lit windows, the bridge forward, the helipad aft.
      tier(s, h.beam * 0.9, 3, h.len * 0.56, h.free, 4);
      tier(s, h.beam * 0.86, 3, h.len * 0.5, h.free + 3.1, 5);
      tier(s, h.beam * 0.76, 2.6, h.len * 0.34, h.free + 6.2, 8);
      bridge(s, h.beam * 0.74, h.free + 8.9, 18);
      s.cyl(6, 6, 0.3, '#3a4a4a', [0, h.free + 0.3, -32], { seg: 24 });
      s.cyl(4.8, 5, 0.32, '#e8e8e0', [0, h.free + 0.32, -32], { seg: 24 });
      s.cyl(4.4, 4.4, 0.34, '#3a4a4a', [0, h.free + 0.34, -32], { seg: 24 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.ball(0.15, '#8affc8', [Math.cos(a) * 5.6, h.free + 0.5, -32 + Math.sin(a) * 5.6], { glow: true, seg: 5 }); }
      funnel(s, 1.4, 4, h.free + 8.9, -6, WHITE, '#2a9a5a', 0.08);
      lifeboats(s, h.beam * 0.49, h.free + 5.4, [20, 10, -4, -14]);
      mast(s, 8, h.free + 11.1, 18, 2, 2);
      navLights(s, h.beam * 0.5 + 1.2, h.free + 11, 18.6, -h.len / 2 + 0.3, h.free + 2);
    })],
  };
}

/** A polar research ship: a red ice-strengthened hull, the bridge forward, cranes aft, a helideck, radar. */
function researchVessel(): Design {
  const h: HullSpec = { len: 62, beam: 14, free: 5, draft: 4.5, hull: '#c8302a', boot: '#2a2a30', deck: '#8a8a90', bluff: 0.85, sheer: 1.2 };
  return {
    id: 'research-vessel', name: 'polar research ship', realm: 'water', len: h.len, speed: 3, bob: 0.1,
    pieces: [P((s) => {
      hull(s, h);
      // The ice belt at the bow: a darker band, and the name board.
      band(s, h, 6, h.len * 0.38, 3, 1.2, '#2a2a30');
      tier(s, h.beam * 0.84, 2.8, 18, h.free, 10);
      tier(s, h.beam * 0.76, 2.6, 14, h.free + 2.9, 11);
      tier(s, h.beam * 0.66, 2.6, 10, h.free + 5.6, 12);
      bridge(s, h.beam * 0.7, h.free + 8.3, 14);
      s.cyl(0.4, 0.5, 8, WHITE, [0, h.free + 14, 12], { seg: 8 });
      s.box(3.4, 0.14, 0.14, WHITE, [0, h.free + 16, 12]);
      s.ball(0.2, '#ffffff', [0, h.free + 18.2, 12], { glow: true, seg: 6 });
      // The helideck over the hangar, the A-frame and cranes on the working deck aft.
      s.box(h.beam * 0.8, 4, 8, WHITE, [0, h.free + 2, -2]);
      s.box(h.beam * 0.9, 0.3, 12, '#3a4a4a', [0, h.free + 4.15, -2]);
      s.cyl(3.6, 3.6, 0.32, '#e2b43a', [0, h.free + 4.2, -2], { seg: 20 });
      s.cyl(3.2, 3.2, 0.34, '#3a4a4a', [0, h.free + 4.22, -2], { seg: 20 });
      crane(s, h.free, -14, 11, '#e2b43a', 0.6);
      crane(s, h.free, -22, 9, '#e2b43a', -0.5);
      for (const sx of [-1, 1]) s.rod([sx * 4.5, h.free, -29], [sx * 3, h.free + 7, -30], 0.3, '#e2b43a');
      s.rod([-3, h.free + 7, -30], [3, h.free + 7, -30], 0.3, '#e2b43a');
      lifeboats(s, h.beam * 0.46, h.free + 3.4, [6], '#e8742a');
      funnel(s, 1.4, 4, h.free + 8.3, 5, '#c8302a', WHITE, 0.08);
      navLights(s, h.beam * 0.5 + 1.2, h.free + 10.4, 14.6, -h.len / 2 + 0.3, h.free + 2);
    }), P((s) => s.box(3.4, 0.15, 0.5, '#3a3a40', [0, 0, 0]), 'spinY', [0, h.free + 17, 12], 0.4)],
  };
}

/** The sky galleon of the Sky Isles: a tall ship's hull on feathered wings, sails that glow. */
function skyGalleon(): Design {
  const len = 40, h: HullSpec = { len, beam: 9, free: 2.5, draft: 3.5, hull: '#6a4a8a', boot: '#d4af37', deck: '#c8a878', bluff: 0.55, sheer: 2.6 };
  return {
    id: 'sky-galleon', name: 'sky galleon', realm: 'sky', len, speed: 7, alt: [95, 150], radius: [200, 380], bob: 3, bank: 0.08,
    pieces: [P((s) => {
      hull(s, h);
      for (const sx of [-1, 1]) for (let q = -14; q < 14; q += 2.2) s.ball(0.3, '#fff4c0', [sx * (sideX(h, q, 1.2) * 1.015 + 0.05), deckY(h, q) - 1.2, q], { glow: true, seg: 6 });
      s.box(h.beam * 0.8, 2.6, 7, '#5a3a7a', [0, h.free + 1.3, -15]);
      s.box(h.beam * 0.7, 0.9, 0.06, WARM, [0, h.free + 1.5, -18.55], { glow: true });
      // Three masts of sails that glow faintly, pennants, a keel of light below.
      for (const [zz, hh] of [[10, 22], [-1, 26], [-11, 19]] as const) {
        s.cyl(0.22, 0.32, hh, '#4a3a5a', [0, h.free + hh / 2, zz], { seg: 8 });
        for (let q = 0; q < 3; q++) {
          const y = h.free + hh * (0.34 + q * 0.23), w = h.beam * (1.4 - q * 0.3);
          s.rod([-w / 2, y + hh * 0.1, zz], [w / 2, y + hh * 0.1, zz], 0.08, '#d4af37');
          s.box(w * 0.94, hh * 0.19, 0.08, '#fff4ff', [0, y, zz + 0.2]);
          s.box(w * 0.7, hh * 0.12, 0.06, '#d8c8ff', [0, y, zz + 0.3], { glow: true });
        }
        s.shape([[0, 0], [2.4, -0.3], [0, -0.7]], 0.02, '#ff8fb8', [0, h.free + hh + 0.3, zz], { r: [0, Math.PI / 2, 0] });
      }
      for (let i = 0; i < 5; i++) s.ball(0.4, '#e2b43a', [0, h.free + i * 0.35 - 0.6, len * 0.5 + 0.2], { s: [1, 1, 0.6], seg: 7 });
    }),
    ...[1, -1].map((sx) => ({ ...featheredWing('#f4f0ff', sx, [sx * h.beam * 0.45, h.free + 0.6, 2], len * 0.6, len * 0.26, '#d8c8ff'), part: 'vehicle' as const, amp: 0.25 }))],
  };
}

export const SHIP_DESIGNS: Record<string, () => Design> = {
  'cargo-ship': cargoShip,
  'container-ship': containerShip,
  'ocean-liner': oceanLiner,
  'cruise-ship': cruiseShip,
  'ferry-large': ferryLarge,
  'fishing-trawler': fishingTrawler,
  'hurtigruten': hurtigruten,
  'dhow-large': dhowLarge,
  'junk-large': junkLarge,
  'phinisi-large': phinisiLarge,
  'kettuvallam-large': kettuvallamLarge,
  'full-rigger': () => fullRigger('full-rigger', 50, 'full-rigged ship'),
  'hospital-ship': hospitalShip,
  'research-vessel': researchVessel,
  'sky-galleon': skyGalleon,
};
