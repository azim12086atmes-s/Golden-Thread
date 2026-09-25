import { newGame, type GameState } from './state';

export const SAVE_KEY = 'golden-thread/save/v1';

/** Minimal storage surface so tests can pass an in-memory store. */
export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // private mode / blocked storage
  }
}

export function serialize(st: GameState): string {
  return JSON.stringify(st);
}

/**
 * Parse a save, filling any field a newer build added with its new-game default. Unknown fields
 * are kept. A corrupt save returns null rather than throwing — the player gets a new game, not a
 * crash.
 */
export function deserialize(json: string): GameState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return null;
  const base = newGame() as unknown as Record<string, unknown>;
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const b = base[k], v = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v)) {
      base[k] = { ...(b as object), ...(v as object) };
    } else if (typeof v === typeof b || (Array.isArray(b) && Array.isArray(v))) {
      base[k] = v;
    }
  }
  return base as unknown as GameState;
}

export function saveGame(st: GameState, store: Store | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, serialize(st));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(store: Store | null = storage()): GameState | null {
  if (!store) return null;
  try {
    const s = store.getItem(SAVE_KEY);
    return s ? deserialize(s) : null;
  } catch {
    return null;
  }
}

export function clearSave(store: Store | null = storage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* nothing to clear */
  }
}
