import { SAVE_KEY, deserialize, serialize, type Store } from './save';
import type { GameState } from './state';

/**
 * Signing in (owner: "add a sign in option, let the sign in for older players not erase their
 * progress"). Each player on this device signs in by name (with a PIN if they like) and plays
 * their own journey. Nothing is ever erased by signing in:
 *
 * - Someone who has been playing without signing in keeps that journey: the first player to sign
 *   in on the device takes it with them (copied — the original stays where it was, as a backup).
 * - Players who never sign in carry on exactly as before, on the device's own journey ("guest").
 * - A journey can be taken to another device as a keepsake file, and brought in there.
 *
 * Everything stays on this device (there is no server); the PIN only keeps a brother or sister
 * from opening the wrong journey by mistake. Pure rules over a Store (tests/profiles.test.ts).
 */

export const PLAYERS_KEY = 'golden-thread/players/v1';

export interface Player { id: string; name: string; created: number; lastPlayed: number; pin?: string; /** The Google account it is linked to (its stable id), and its email. */ google?: string; email?: string }
export interface Players {
  players: Player[];
  /** Who is signed in ('' = playing as a guest, on the device's own journey). */
  current: string;
  /** Whether the device's guest journey has been taken by the first player to sign in. */
  adopted: boolean;
}

/** Where a player's journey is kept ('' = the guest's: the key every older save already uses). */
export const saveKeyOf = (id: string): string => (id ? `${SAVE_KEY}/${id}` : SAVE_KEY);

export function readPlayers(store: Store | null): Players {
  const none: Players = { players: [], current: '', adopted: false };
  if (!store) return none;
  try {
    const raw = JSON.parse(store.getItem(PLAYERS_KEY) ?? 'null') as Partial<Players> | null;
    if (!raw || !Array.isArray(raw.players)) return none;
    const players = raw.players.filter((p): p is Player => !!p && typeof p.id === 'string' && typeof p.name === 'string');
    const current = typeof raw.current === 'string' && players.some((p) => p.id === raw.current) ? raw.current : '';
    return { players, current, adopted: !!raw.adopted };
  } catch {
    return none;
  }
}

function writePlayers(store: Store, p: Players): boolean {
  try { store.setItem(PLAYERS_KEY, JSON.stringify(p)); return true; } catch { return false; }
}

/** The journey to load now: the signed-in player's, or the guest's. */
export function currentSaveKey(store: Store | null): string {
  return saveKeyOf(readPlayers(store).current);
}

export function currentPlayer(store: Store | null): Player | null {
  const p = readPlayers(store);
  return p.players.find((x) => x.id === p.current) ?? null;
}

/** A PIN is kept only as a hash, salted by the player (not real security: it is a family lock). */
export function pinHash(id: string, pin: string): string {
  let h = 0x811c9dc5;
  for (const c of `${id}:${pin}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

export const cleanName = (name: string): string => name.replace(/\s+/g, ' ').trim().slice(0, 24);

/**
 * Make a new player and sign them in. The first player on a device that has a journey already
 * takes it with them (nothing is lost); later players begin a new journey.
 */
export function signUp(store: Store | null, name: string, pin: string, now: number): { ok: true; player: Player; tookJourney: boolean } | { ok: false; reason: string } {
  if (!store) return { ok: false, reason: 'This browser is not keeping anything (a private window?) — sign-in needs it to keep your journey.' };
  const n = cleanName(name);
  if (!n) return { ok: false, reason: 'Write a name to sign in with.' };
  if (pin && !/^\d{4,8}$/.test(pin)) return { ok: false, reason: 'A PIN is 4 to 8 digits (or leave it empty).' };
  const all = readPlayers(store);
  if (all.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return { ok: false, reason: `${n} has signed in on this device already — choose them in the list.` };
  const id = `${n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player'}-${now.toString(36)}`;
  const player: Player = { id, name: n, created: now, lastPlayed: now, ...(pin ? { pin: pinHash(id, pin) } : {}) };
  let tookJourney = false;
  if (!all.adopted) {
    // The journey played so far on this device goes with the first player to sign in.
    try {
      const old = store.getItem(SAVE_KEY);
      if (old && deserialize(old)) { store.setItem(saveKeyOf(id), old); tookJourney = true; }
    } catch { /* nothing to take */ }
  }
  if (!writePlayers(store, { players: [...all.players, player], current: id, adopted: all.adopted || tookJourney })) return { ok: false, reason: 'Could not keep the sign-in on this device.' };
  return { ok: true, player, tookJourney };
}

/** What a Google sign-in tells us about the account (from its ID token). */
export interface GoogleAccount { sub: string; name: string; email?: string }

/** Read the account out of a Google ID token (its middle part). Null if it is not one. */
export function googleAccountOf(credential: string): GoogleAccount | null {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part + '='.repeat((4 - (part.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: string; name?: string; given_name?: string; email?: string; iss?: string };
    if (!p.sub || !String(p.iss ?? '').includes('accounts.google.com')) return null;
    return { sub: p.sub, name: p.given_name || p.name || (p.email ?? '').split('@')[0] || 'Traveller', email: p.email };
  } catch {
    return null;
  }
}

/**
 * Sign in with Google (owner: "use google sign in"). The Google account is a player on this
 * device: the one it is already linked to; else the player signed in now, linked to it (their
 * journey goes on unchanged); else a new player, who takes the device's journey with them the
 * first time, exactly as signing in by name does. Nothing is erased.
 */
export function googleSignIn(store: Store | null, acc: GoogleAccount, now: number): { ok: true; player: Player; linked: boolean; tookJourney: boolean } | { ok: false; reason: string } {
  if (!store) return { ok: false, reason: 'This browser is not keeping anything (a private window?) — sign-in needs it to keep your journey.' };
  const all = readPlayers(store);
  const known = all.players.find((p) => p.google === acc.sub);
  if (known) {
    known.lastPlayed = now;
    writePlayers(store, { ...all, current: known.id });
    return { ok: true, player: known, linked: false, tookJourney: false };
  }
  const here = all.players.find((p) => p.id === all.current);
  if (here && !here.google) {
    here.google = acc.sub; here.email = acc.email; here.lastPlayed = now;
    writePlayers(store, all);
    return { ok: true, player: here, linked: true, tookJourney: false };
  }
  // A new player under the Google name (made unique on this device if the name is taken).
  let name = cleanName(acc.name) || 'Traveller';
  for (let k = 2; all.players.some((p) => p.name.toLowerCase() === name.toLowerCase()); k++) name = `${cleanName(acc.name)} ${k}`;
  const r = signUp(store, name, '', now);
  if (!r.ok) return r;
  const after = readPlayers(store), me = after.players.find((p) => p.id === r.player.id)!;
  me.google = acc.sub; me.email = acc.email;
  writePlayers(store, after);
  return { ok: true, player: me, linked: false, tookJourney: r.tookJourney };
}

export function signIn(store: Store | null, id: string, pin: string, now: number): { ok: true; player: Player } | { ok: false; reason: string } {
  if (!store) return { ok: false, reason: 'This browser is not keeping anything.' };
  const all = readPlayers(store), player = all.players.find((p) => p.id === id);
  if (!player) return { ok: false, reason: 'No such player on this device.' };
  if (player.pin && player.pin !== pinHash(id, pin)) return { ok: false, reason: 'That PIN is not right.' };
  player.lastPlayed = now;
  writePlayers(store, { ...all, current: id });
  return { ok: true, player };
}

/** Sign out: back to the device's guest journey (the signed-out player's journey is kept). */
export function signOut(store: Store | null): void {
  if (!store) return;
  writePlayers(store, { ...readPlayers(store), current: '' });
}

// ───── keepsake files: a journey to take to another device ─────

const KEEPSAKE = 'golden-thread-journey';

export function keepsake(st: GameState, name: string, now: number): string {
  return JSON.stringify({ kind: KEEPSAKE, name, saved: now, state: JSON.parse(serialize(st)) });
}

/** Read a keepsake file (or a bare save) back into a journey, or say why not. */
export function fromKeepsake(text: string): { ok: true; st: GameState; name: string } | { ok: false; reason: string } {
  try {
    const raw = JSON.parse(text) as { kind?: string; name?: string; state?: unknown; version?: number };
    const body = raw?.kind === KEEPSAKE ? raw.state : raw;
    const st = deserialize(JSON.stringify(body));
    return st ? { ok: true, st, name: typeof raw?.name === 'string' ? raw.name : '' } : { ok: false, reason: 'That file is not a Golden Thread journey.' };
  } catch {
    return { ok: false, reason: 'That file could not be read.' };
  }
}
