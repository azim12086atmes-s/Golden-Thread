import type { GameState } from '../core/state';
import { OUTFITS, isChildOutfit, outfitsFor } from '../characters/outfits';
import type { Outfit } from '../characters/modesty';
import { wardrobeFor, HERO_ONLY } from '../npc/Townsfolk';
import { COMPANION_BY_ID, type CompanionDef } from './caravan';

/**
 * The family's own wardrobe (owner, 2026-09-30): in the dressing room the travellers can dress
 * their brothers and sisters and the children travelling with them, not only themselves. The
 * brothers and sisters choose from the grown-ups' shelves for a girl or a boy (all but the two
 * travellers' own clothes); the children from the children's shelves of every land. Every outfit
 * in the game is already fully covering (characters/modesty.ts). Pure rules (tests/dress.test.ts).
 */

type Dressable = Extract<CompanionDef, { kind: 'sibling' | 'child' }>;

export const isDressable = (def: CompanionDef | undefined): def is Dressable => !!def && (def.kind === 'sibling' || def.kind === 'child');

/** What someone may wear. */
export function choicesFor(def: Dressable): Outfit[] {
  if (def.kind === 'sibling') return outfitsFor(def.who).filter((o) => !HERO_ONLY.has(o.id));
  return Object.values(OUTFITS).filter((o) => o.who === def.who && isChildOutfit(o));
}

/** What someone wears when nobody has chosen for them: a sibling their own outfit, a child one of their land's. */
export function defaultOutfit(def: Dressable): Outfit {
  if (def.kind === 'sibling') return OUTFITS[def.outfit];
  const pool = wardrobeFor(def.origin, def.who, true);
  return pool[(def.name.length * 7) % pool.length];
}

/** What they wear now. */
export function outfitOf(st: GameState, id: string): Outfit | null {
  const def = COMPANION_BY_ID[id];
  if (!isDressable(def)) return null;
  const chosen = OUTFITS[st.companionOutfits[id]];
  return chosen && choicesFor(def).includes(chosen) ? chosen : defaultOutfit(def);
}

/** Dress someone travelling with you. Returns an error, or null when done. */
export function dress(st: GameState, id: string, outfitId: string): string | null {
  const def = COMPANION_BY_ID[id];
  if (!isDressable(def)) return 'Only the brothers, sisters and children can be dressed here.';
  if (!st.caravan.includes(id)) return `${def.name} is not travelling with you.`;
  const o = OUTFITS[outfitId];
  if (!o || !choicesFor(def).includes(o)) return 'That is not on their shelf.';
  st.companionOutfits[id] = outfitId;
  return null;
}

/** Everyone in the caravan who can be dressed, brothers and sisters first. */
export function dressable(st: GameState): Dressable[] {
  const all = st.caravan.map((id) => COMPANION_BY_ID[id]).filter(isDressable);
  return [...all.filter((d) => d.kind === 'sibling'), ...all.filter((d) => d.kind === 'child')];
}
