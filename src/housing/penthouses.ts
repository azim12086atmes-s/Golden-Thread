import type { GameState } from '../core/state';

/**
 * Penthouses (pure rules; tests/penthouses.test.ts): the luxury homes on the roofs of New Yonder's
 * tallest glass towers (world/models/penthouse.ts). Each is known by its tower's front door id
 * (`newyork:<n>`); the lift in the lobby takes you up. Anyone may look round; buying one makes it
 * yours — a home above the city to come back to.
 */

export const PENTHOUSE_PRICE = 1200;

export const ownsPenthouse = (st: GameState, id: string): boolean => st.penthouses.includes(id);

export function buyPenthouse(st: GameState, id: string): 'ok' | 'owned' | 'coins' {
  if (ownsPenthouse(st, id)) return 'owned';
  if (st.coins < PENTHOUSE_PRICE) return 'coins';
  st.coins -= PENTHOUSE_PRICE;
  st.penthouses.push(id);
  return 'ok';
}
