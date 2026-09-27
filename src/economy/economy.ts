import type { GameState } from '../core/state';
import { ITEMS, LEVEL_XP, RECIPES, skillLevel, type Recipe, type SkillId } from './items';

/** Pure rules over GameState. The UI and quest system call these; nothing else mutates inventory. */

export function count(state: GameState, id: string): number {
  return state.inventory[id] ?? 0;
}

export function addItem(state: GameState, id: string, qty = 1): void {
  if (!ITEMS[id]) throw new Error(`Unknown item: ${id}`);
  state.inventory[id] = count(state, id) + qty;
}

export function hasItems(state: GameState, needs: Record<string, number>): boolean {
  return Object.entries(needs).every(([id, n]) => count(state, id) >= n);
}

export function removeItems(state: GameState, needs: Record<string, number>): boolean {
  if (!hasItems(state, needs)) return false;
  for (const [id, n] of Object.entries(needs)) {
    const left = count(state, id) - n;
    if (left > 0) state.inventory[id] = left;
    else delete state.inventory[id];
  }
  return true;
}

export function level(state: GameState, skill: SkillId): number {
  return skillLevel(state.skills[skill]);
}

/** Add experience in a skill (capped at the top level). */
export function addXpTo(state: GameState, skill: SkillId, xp: number): void {
  state.skills[skill] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], state.skills[skill] + xp);
}

/** A Keeper's lesson: raises a skill to at least level 1. Returns true if it was new. */
export function teach(state: GameState, skill: SkillId): boolean {
  if (state.skills[skill] >= LEVEL_XP[1]) return false;
  state.skills[skill] = LEVEL_XP[1];
  return true;
}

export type CraftResult =
  | { ok: true; recipe: Recipe; levelUp: boolean }
  | { ok: false; reason: 'unknown' | 'skill' | 'materials' };

export function canCraft(state: GameState, recipe: Recipe): CraftResult {
  if (level(state, recipe.skill) < recipe.level) return { ok: false, reason: 'skill' };
  if (!hasItems(state, recipe.needs)) return { ok: false, reason: 'materials' };
  return { ok: true, recipe, levelUp: false };
}

export function craft(state: GameState, recipeId: string): CraftResult {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, reason: 'unknown' };
  const check = canCraft(state, recipe);
  if (!check.ok) return check;
  removeItems(state, recipe.needs);
  addItem(state, recipe.out, recipe.qty);
  const before = level(state, recipe.skill);
  state.skills[recipe.skill] += recipe.xp;
  return { ok: true, recipe, levelUp: level(state, recipe.skill) > before };
}

/**
 * What a land's market pays. Goods from far away are worth more — that is how nomads make a
 * living: carry value from where it is plentiful to where it is needed.
 */
export function sellPrice(itemId: string, regionId: string, wanted: readonly string[] = []): number {
  const def = ITEMS[itemId];
  if (!def) return 0;
  let mult = def.origin === regionId ? 0.6 : def.origin ? 1.3 : 1;
  if (wanted.includes(itemId)) mult *= 2;
  return Math.max(1, Math.round(def.value * mult));
}

export function sell(state: GameState, itemId: string, regionId: string, wanted: readonly string[] = []): number {
  if (!removeItems(state, { [itemId]: 1 })) return 0;
  const price = sellPrice(itemId, regionId, wanted);
  state.coins += price;
  return price;
}
