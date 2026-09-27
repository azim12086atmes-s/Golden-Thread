import type { Ctx, Footprint } from '../architecture';
import { archPanel, box, gable } from '../kit';
import type { InstituteKind } from '../../institutions/catalogue';
import { INSTITUTE_BY_KIND } from '../../institutions/catalogue';
import { CARE_KINDS, buildCareInstitute, type CareKind } from '../institutes3d';

/**
 * MODEL CONTRACT (3D side — see docs/team/handoffs/CHATGPT_3D_MODELS.md §2):
 * build one stage (0–3) of an institute in the land `c.s`'s own architecture. Local frame: origin
 * at the base centre, entrance facing +z; stay within the stage's `radius`
 * (INSTITUTE_BY_KIND[kind].stages[stage].radius) and keep the +z entrance clear. Lit parts in
 * `c.g`, windows and lamps in `c.glow`. Return the footprint (collision radius, top height).
 *
 * This is a PLACEHOLDER so the game rules can place institutes now: a plain hall sized to the
 * stage, with a door and a sign. Replace its body; keep the signature.
 */
export function buildInstitute(c: Ctx, kind: InstituteKind, stage: 0 | 1 | 2 | 3): Footprint {
  // The care-and-learning institutes are built for real by Claude (institutes3d.ts).
  if ((CARE_KINDS as string[]).includes(kind)) return buildCareInstitute(c, kind as CareKind, stage);
  const st = INSTITUTE_BY_KIND[kind].stages[stage], r = st.radius, w = r * 1.3, d = r * 1.1, h = 3 + stage * 2.4;
  const wall = c.rng.pick(c.s.walls), roof = c.rng.pick(c.s.roofs);
  box(c.g, w, h, d, wall);
  gable(c.g, w + 0.6, d + 0.6, Math.min(4, d * 0.35), roof, 0, h, 0);
  archPanel(c.g, 1.6, 2.6, '#4a3426', 0, 0, d / 2 + 0.02);
  box(c.g, Math.min(w * 0.6, 4), 0.7, 0.12, '#f2d14e', 0, 2.9, d / 2 + 0.06);
  for (let i = 0; i < 2 + stage; i++) box(c.glow, 1, 1.2, 0.05, c.s.glow, -w / 2 + (w / (3 + stage)) * (i + 1), 1.2, d / 2 + 0.03);
  return { r: Math.hypot(w, d) / 2 + 0.3, h: h + 4 };
}
