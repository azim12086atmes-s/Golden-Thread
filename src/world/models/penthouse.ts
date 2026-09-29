import type { Ctx } from '../architecture';
import { box, cyl, sphere } from '../kit';

/** A New Yonder glass tower at least this tall (m) carries a penthouse on its roof instead of turbines. */
export const PENTHOUSE_MIN_TOWER = 106;

/**
 * MODEL CONTRACT (CHATGPT_3D_MODELS.md §7): a luxury rooftop home on one of New Yonder's tallest
 * towers, fitted within `w` × `d`. Local frame: origin at the roof's centre at roof height, the
 * entrance facing +z. Returns the door (local) and the height it rises above the roof.
 *
 * A glass pavilion under a thin overhanging roof with a gilded fascia and a planted top, warm light
 * inside; before it a timber terrace with an infinity pool, a pergola grown with vines over the
 * lounge, planters with small trees along the edges, a glass balustrade all round, and the lift
 * house at the back where the lift arrives from the lobby.
 */
export function penthouse(c: Ctx, w: number, d: number): { door: [number, number]; h: number } {
  const TEAK = '#b08a5a', WHITE = '#f4f4f0', GOLD = '#d4af37', GLASS = '#9fc8e0', LEAF = '#3f8a3a';
  const W = w - 1.2, D = d - 1.2;
  // The deck, and the glass balustrade round the edge on slim posts.
  box(c.g, W, 0.2, D, TEAK, 0, 0, 0);
  for (let x = -W / 2; x <= W / 2; x += 1.2) box(c.g, 0.03, 0.02, D, '#8a6a4a', x, 0.2, 0);
  for (const sz of [-1, 1]) box(c.g, W, 1.1, 0.06, GLASS, 0, 0.2, sz * D / 2);
  for (const sx of [-1, 1]) box(c.g, 0.06, 1.1, D, GLASS, sx * W / 2, 0.2, 0);
  for (const sz of [-1, 1]) box(c.g, W + 0.1, 0.06, 0.1, WHITE, 0, 1.3, sz * D / 2);
  for (const sx of [-1, 1]) box(c.g, 0.1, 0.06, D + 0.1, WHITE, sx * W / 2, 1.3, 0);

  // The glass pavilion at the back: slab, glass walls between white mullions, warm light inside,
  // an overhanging roof with a gilded edge, grasses and shrubs on top.
  const pw = W * 0.64, pd = D * 0.42, ph = 3.4, pz = -D / 2 + pd / 2 + 0.8, px = -W * 0.08;
  box(c.g, pw, 0.2, pd, '#e8e4dc', px, 0.2, pz);
  box(c.g, pw, ph, pd, GLASS, px, 0.4, pz);
  box(c.glow, pw - 0.6, ph - 0.8, pd - 0.6, '#ffe2b0', px, 0.7, pz);
  for (let x = -pw / 2; x <= pw / 2 + 0.01; x += pw / 6) box(c.g, 0.12, ph, 0.14, WHITE, px + x, 0.4, pz + pd / 2);
  for (let z = -pd / 2; z <= pd / 2 + 0.01; z += pd / 3) for (const sx of [-1, 1]) box(c.g, 0.14, ph, 0.12, WHITE, px + sx * pw / 2, 0.4, pz + z);
  box(c.g, pw + 2, 0.3, pd + 1.6, WHITE, px, ph + 0.4, pz + 0.3);
  box(c.g, pw + 2.05, 0.12, pd + 1.65, GOLD, px, ph + 0.4, pz + 0.3);
  box(c.g, pw + 1.4, 0.25, pd + 1, '#5a9a4a', px, ph + 0.7, pz + 0.3);
  for (let i = 0; i < 7; i++) sphere(c.g, 0.45, i % 2 ? LEAF : '#6ab04a', px - pw / 2 + 0.6 + i * (pw - 1) / 6, ph + 1.1, pz + ((i % 3) - 1) * pd * 0.3, 6, 0.7);
  // A sliding door in the front glass, and a warm lamp over it.
  box(c.g, 1.8, 2.4, 0.08, '#2a3a4a', px, 0.4, pz + pd / 2 + 0.05);
  box(c.glow, 0.6, 0.12, 0.3, '#fff0c8', px, ph + 0.2, pz + pd / 2 + 0.6);

  // The lift house at the back corner, where the lift arrives from the lobby.
  const lx = W / 2 - 1.8, lz = -D / 2 + 1.8;
  box(c.g, 2.8, 3.6, 2.8, '#dfe3e8', lx, 0.2, lz);
  box(c.g, 3.0, 0.2, 3.0, GOLD, lx, 3.8, lz);
  box(c.g, 1.2, 2.2, 0.06, '#8a9098', lx, 0.2, lz + 1.42);

  // The infinity pool on the terrace, its coping, and loungers beside it.
  const qz = D / 2 - D * 0.2, qw = W * 0.46, qd = D * 0.24, qx = -W * 0.18;
  box(c.g, qw + 0.6, 0.35, qd + 0.6, '#e8e4dc', qx, 0.2, qz);
  box(c.g, qw, 0.38, qd, '#3ab8d8', qx, 0.2, qz);
  box(c.glow, qw * 0.8, 0.02, qd * 0.7, '#8ae8ff', qx, 0.55, qz);
  for (let i = 0; i < 3; i++) {
    const x = qx + qw / 2 + 1.4, z = qz - qd / 2 + 0.6 + i * 1.3;
    box(c.g, 0.8, 0.3, 1.9, WHITE, x, 0.2, z);
    box(c.g, 0.8, 0.5, 0.3, WHITE, x, 0.5, z - 0.8);
  }

  // A pergola over the lounge: four posts, beams, slats and vines; a low table and seats under it.
  const gx = W / 2 - W * 0.2, gz = D * 0.06, gw = W * 0.3, gd = D * 0.3;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 0.18, 2.8, 0.18, WHITE, gx + dx * gw / 2, 0.2, gz + dz * gd / 2);
  for (const dz of [-1, 1]) box(c.g, gw + 0.4, 0.2, 0.18, WHITE, gx, 3, gz + dz * gd / 2);
  for (let k = 0; k <= 6; k++) box(c.g, 0.12, 0.12, gd + 0.4, WHITE, gx - gw / 2 + (k * gw) / 6, 3.2, gz);
  for (let k = 0; k < 8; k++) sphere(c.g, 0.35, k % 3 ? LEAF : '#d86a9a', gx - gw / 2 + (k % 4) * gw / 3, 3.35, gz - gd / 2 + Math.floor(k / 4) * gd, 5, 0.6);
  box(c.g, 1.2, 0.4, 0.8, '#8a6a4a', gx, 0.2, gz);
  for (const dz of [-1, 1]) box(c.g, 1.6, 0.4, 0.6, '#c8b89a', gx, 0.2, gz + dz * 1.1);

  // Planters with small trees and shrubs along the edges; lamps along the balustrade.
  for (const [x, z] of [[-W / 2 + 0.8, D / 2 - 0.8], [W / 2 - 0.8, D / 2 - 0.8], [-W / 2 + 0.8, 0], [-W / 2 + 0.8, -D / 2 + 0.8]]) {
    box(c.g, 1.2, 0.7, 1.2, '#5a5a62', x, 0.2, z);
    cyl(c.g, 0.08, 0.1, 1.4, '#6a4a2a', x, 0.9, z, 5);
    sphere(c.g, 0.8, LEAF, x, 2.5, z, 7, 0.9);
  }
  for (const [x, z] of [[-W / 2 + 0.3, D / 4], [W / 2 - 0.3, D / 4], [0, D / 2 - 0.3]]) box(c.glow, 0.15, 0.3, 0.15, '#fff0c8', x, 1.35, z);
  return { door: [px, pz + pd / 2 + 0.6], h: ph + 1.6 };
}
