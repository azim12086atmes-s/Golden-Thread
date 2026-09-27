import type { Ctx } from '../architecture';
import { box } from '../kit';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §5): a bridge in the land `c.s`'s
 * style spanning `length` metres along x (from x = −length/2 to +length/2), `width` wide along z,
 * rising to its deck top at y = `deck` in the middle (the banks are at y = 0 at both ends; the
 * water is below). Walkable: return the deck height profile so the game lays a walkway along it —
 * keep it within ~0.3 m of the banks at the ends so people can step on.
 *
 * Wired: world/bridges.ts places one wherever a land's river crosses the line of an avenue
 * (22 bridges in 17 lands), and world/BridgesView.ts draws them for the lands that are loaded.
 *
 * PLACEHOLDER: a gently arched plank deck with rails.
 */
export function buildBridge(c: Ctx, length: number, width: number, deck = 1.2): { deckAt: (x: number) => number } {
  const deckAt = (x: number) => 0.15 + (deck - 0.15) * (1 - (2 * x / length) ** 2);
  const n = Math.max(4, Math.round(length / 1.5)), step = length / n;
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + (i + 0.5) * step, y = deckAt(x);
    box(c.g, step + 0.05, 0.3, width, '#8a6444', x, y - 0.3, 0);
    for (const s of [-1, 1]) box(c.g, step + 0.05, 0.9, 0.1, '#6b4a2a', x, y, s * width / 2);
  }
  return { deckAt };
}
