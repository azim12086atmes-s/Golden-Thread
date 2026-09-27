import type { Ctx, Footprint } from '../architecture';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §4): each land's own house and street
 * lighting, added round a house (`houseLights`, called for every house after it is built — diyas on
 * the sills and steps in Gulabi Nagar, hanging brass lanterns at the door in Madinat an-Nur, lamps at
 * the tent entrance in the desert and the Aurora …) and along the streets (`streetLight`, a light
 * standard at (x, y, z) — gas lamps in London …). Glow geometry goes in `c.glow`; keep area small.
 *
 * Wired: `houseLights` runs inside each house's own frame (origin at its base, front door facing +z) right after
 * it is built; `streetLight` is asked for every avenue lamp (land frame) and the land's lamp post stands there
 * whenever it returns false.
 *
 * PLACEHOLDERS: nothing yet (the lamp posts of architecture.ts `lampPost` still line the avenues).
 */
export function houseLights(c: Ctx, fp: Footprint): void {
  void c; void fp;
}

export function streetLight(c: Ctx, x: number, y: number, z: number): boolean {
  void c; void x; void y; void z;
  return false; // false: the caller falls back to the land's lamp post
}
