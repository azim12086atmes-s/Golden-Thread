import type { RegionId } from './regions';

/**
 * A ledger of each land's decorations, by kind (owner: "keep track of what place has what, and how
 * many"). The region builder records what it places as it builds a land; the sky's decorations
 * come from the traffic roster and the sky list. `npx vite-node scripts/decor-inventory.ts` writes
 * the table to docs/team/handoffs/DECOR_INVENTORY.md.
 */
const LEDGER = new Map<string, Map<string, number>>();

export function recordDecor(land: RegionId, kind: string, n = 1): void {
  const m = LEDGER.get(land) ?? LEDGER.set(land, new Map()).get(land)!;
  m.set(kind, (m.get(kind) ?? 0) + n);
}

/** What has been recorded for a land (a fresh count each time the land is built). */
export const decorOf = (land: RegionId): Record<string, number> => Object.fromEntries(LEDGER.get(land) ?? []);
export const resetDecor = (land: RegionId): void => { LEDGER.delete(land); };
