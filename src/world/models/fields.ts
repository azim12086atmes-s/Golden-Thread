import type { Ctx } from '../architecture';
import { box, cone, cyl, gable, sphere } from '../kit';

/** How a field looks now: its crop (colours and habit from housing.ts `CROPS`), how grown, whose. */
export interface FieldLook {
  crop: { leaf: string; ripe: string; shape: 'stalk' | 'bush' | 'vine' | 'flower' } | null;
  /** 0..1; ripe at 1. */
  growth: number;
  /** Owned fields are tilled; open ones are grass with stakes and a sign. */
  owned: boolean;
}

/** Where the barn stands in the field's local frame (the side facing the avenue), and its size. */
export const BARN = { x: -13, z: -16, w: 7, d: 4.5, h: 3.4 } as const;

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §21): a field of `size` × `size`
 * metres centred on the origin, in the land `c.s`'s own farming style (paddy terraces and bunds in
 * Nusa Rinjani and Kaveri Coast, hedged strips in Old London, stone walls in Alpenrose, irrigation
 * channels and palms in the desert lands, …). Eight rows of the crop along x, drawn by habit and
 * growth; the barn or store at `BARN` in that land's style (a rice barn, a hay barn, a mud-brick
 * store, a tent store). `ground(x, z)` is the terrain height at a local point relative to the
 * origin — sit everything on it. Lit parts in `c.glow` (a lamp by the barn door).
 *
 * PLACEHOLDER: tilled soil strips, simple plants, a plain barn and corner posts.
 */
export function buildField(c: Ctx, size: number, look: FieldLook, ground: (x: number, z: number) => number): void {
  const half = size / 2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.1, 0.12, 1.2, '#8a6444', sx * (half - 0.5), ground(sx * (half - 0.5), sz * (half - 0.5)), sz * (half - 0.5), 5);
  if (!look.owned) {
    // Open land for sale: a signpost by the barn's corner.
    const y = ground(BARN.x, BARN.z + 3);
    cyl(c.g, 0.08, 0.08, 2, '#6b4a2a', BARN.x, y, BARN.z + 3, 5);
    box(c.g, 1.8, 0.8, 0.1, '#e8c48a', BARN.x, y + 1.6, BARN.z + 3);
    return;
  }
  // Barn: walls, a gable roof, a wide door and a lamp.
  const by = ground(BARN.x, BARN.z);
  box(c.g, BARN.w, BARN.h, BARN.d, c.rng.pick(c.s.walls), BARN.x, by, BARN.z);
  gable(c.g, BARN.w + 0.6, BARN.d + 0.6, 1.6, c.rng.pick(c.s.roofs), BARN.x, by + BARN.h, BARN.z);
  box(c.g, 2.4, 2.4, 0.1, '#5a3a26', BARN.x, by, BARN.z + BARN.d / 2 + 0.03);
  sphere(c.glow, 0.18, c.s.glow, BARN.x + 1.7, by + 2.7, BARN.z + BARN.d / 2 + 0.2, 6);
  // Eight tilled rows along x, each a ridge of soil with plants along it.
  const rows = 8, rowGap = (size - 12) / rows, x0 = -half + 3, x1 = half - 3;
  for (let i = 0; i < rows; i++) {
    const z = -half + 9 + (i + 0.5) * rowGap;
    for (let x = x0; x < x1; x += 4) box(c.g, 4, 0.18, 1.1, '#6b4a33', x + 2, ground(x + 2, z) - 0.04, z);
    const cr = look.crop;
    if (!cr) continue;
    const g = Math.max(0.08, Math.min(1, look.growth)), ripe = look.growth >= 1;
    for (let x = x0 + 1; x < x1; x += 1.6) {
      const y = ground(x, z) + 0.14, j = ((i * 7 + Math.round(x * 3)) % 5) * 0.06;
      switch (cr.shape) {
        case 'stalk':
          cyl(c.g, 0.03, 0.05, 0.3 + g * 1.0 + j, ripe ? cr.ripe : cr.leaf, x, y, z, 4);
          if (g > 0.6) cone(c.g, 0.09, 0.3, ripe ? cr.ripe : cr.leaf, x, y + 0.3 + g * 1.0 + j, z, 4);
          break;
        case 'bush':
          sphere(c.g, 0.14 + g * 0.3, cr.leaf, x, y + 0.1 + g * 0.2, z, 6, 0.8);
          if (ripe) sphere(c.g, 0.08, cr.ripe, x + 0.15, y + 0.3 + g * 0.25, z + 0.12, 5);
          break;
        case 'vine':
          sphere(c.g, 0.2 + g * 0.35, cr.leaf, x, y, z, 6, 0.35);
          if (g > 0.7) sphere(c.g, 0.1 + (ripe ? 0.12 : 0), ripe ? cr.ripe : '#9ac85a', x + 0.2, y + 0.08, z, 6, 0.8);
          break;
        case 'flower':
          cyl(c.g, 0.025, 0.03, 0.25 + g * 0.8, cr.leaf, x, y, z, 4);
          if (g > 0.5) sphere(c.g, 0.1 + g * 0.08, ripe ? cr.ripe : cr.leaf, x, y + 0.3 + g * 0.8, z, 6, 0.5);
          break;
      }
    }
  }
}
