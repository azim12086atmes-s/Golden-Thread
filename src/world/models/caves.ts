import type { Ctx, Footprint } from '../architecture';
import { archPanel, sphere } from '../kit';
import type { CaveStyle } from '../caves';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §13): a cave `r` metres in
 * radius — a mound of rock (sandstone, dark rock or blue ice) with its mouth facing +z at z ≈ r,
 * the ground at y = 0. The mouth must read as a dark opening a person could walk into (≈ 3 m high,
 * 3–4 m wide); ice caves glow faintly blue from inside, rock caves show a glint of crystal. Return
 * the footprint (the game keeps the mouth clear to stand in).
 *
 * PLACEHOLDER: a heap of boulders with a dark arch.
 */
const ROCK: Record<CaveStyle, [string, string]> = { sandstone: ['#c98a5a', '#b5764a'], rock: ['#7a7064', '#5e5750'], ice: ['#cfe8ff', '#a8d0f0'] };

export function buildCave(c: Ctx, style: CaveStyle, r: number): Footprint {
  const [a, b] = ROCK[style];
  sphere(c.g, r, a, 0, 0, 0, 14, 0.55);
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2;
    sphere(c.g, r * (0.35 + (i % 3) * 0.08), i % 2 ? a : b, Math.cos(t) * r * 0.75, r * 0.1, Math.sin(t) * r * 0.75 - r * 0.1, 8, 0.8);
  }
  archPanel(c.g, 3.4, 3.2, '#1a1512', 0, 0, r * 0.92, 0, 0.3);
  sphere(c.glow, 0.35, style === 'ice' ? '#9fd8ff' : '#e8c48a', 0.8, 0.8, r * 0.9, 6);
  return { r, h: r * 0.8 };
}
