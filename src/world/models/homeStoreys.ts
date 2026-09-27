import type { Ctx, Footprint } from '../architecture';
import { box, cyl } from '../kit';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §3): add `floors` storeys on top
 * of a home already built by `buildHouse` (whose footprint and top height are `base`), in the
 * land's style, with windows that glow at night and the roof raised to the new top. While a floor
 * is being built (`scaffold`), show scaffolding, ladders and stacked materials round the new
 * storey. Return the new footprint.
 *
 * PLACEHOLDER: plain storeys stacked on the old roof line, and poles for scaffolding.
 */
export function addStoreys(c: Ctx, base: Footprint, floors: number, scaffold: boolean): Footprint {
  const w = base.r * 1.2, fh = 3;
  const wall = c.rng.pick(c.s.walls);
  for (let f = 0; f < floors + (scaffold ? 1 : 0); f++) {
    const y = base.h - 1 + f * fh, building = scaffold && f === floors;
    box(c.g, w, building ? fh * 0.5 : fh, w * 0.9, building ? '#b8a88a' : wall, 0, y, 0);
    if (!building) for (let i = 0; i < 3; i++) box(c.glow, 0.9, 1.1, 0.05, c.s.glow, -w / 3 + i * (w / 3), y + 1, w * 0.45 + 0.03);
    if (building) for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.06, 0.06, fh + 1, '#8a6444', x * (w / 2 + 0.4), y, z * (w * 0.45 + 0.4), 4);
  }
  return { r: base.r, h: base.h + (floors + (scaffold ? 1 : 0)) * fh };
}
