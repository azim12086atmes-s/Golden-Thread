import type { Ctx } from '../architecture';
import { box } from '../kit';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §5): a bridge in the land `c.s`'s
 * style spanning `length` metres along x (from x = −length/2 to +length/2), `width` wide along z,
 * its deck top at y = `deck` (the banks are at y = 0 at both ends; the water is below). Walkable:
 * return the deck height profile so the game can let the travellers walk over it.
 *
 * PLACEHOLDER: a flat plank deck with rails.
 */
export function buildBridge(c: Ctx, length: number, width: number, deck = 1.2): { deckAt: (x: number) => number } {
  box(c.g, length, 0.3, width, '#8a6444', 0, deck - 0.3, 0);
  for (const s of [-1, 1]) box(c.g, length, 0.9, 0.1, '#6b4a2a', 0, deck, s * width / 2);
  return { deckAt: () => deck };
}
