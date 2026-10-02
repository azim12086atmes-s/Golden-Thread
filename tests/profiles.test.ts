import { describe, expect, it } from 'vitest';
import { SAVE_KEY, loadGame, saveGame, type Store } from '../src/core/save';
import { currentPlayer, currentSaveKey, fromKeepsake, keepsake, readPlayers, saveKeyOf, signIn, signOut, signUp } from '../src/core/profiles';
import { newGame } from '../src/core/state';

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

describe('signing in', () => {
  it('an older player who signs in keeps their whole journey, and the original stays as it was', () => {
    const store = memory();
    const old = newGame();
    old.coins = 4321; old.flags.push('long-journey');
    saveGame(old, store);
    const before = store.getItem(SAVE_KEY);
    expect(currentSaveKey(store)).toBe(SAVE_KEY); // never signed in: plays as before
    const r = signUp(store, 'Fathima', '', 100);
    expect(r.ok && r.tookJourney).toBe(true);
    expect(currentSaveKey(store)).not.toBe(SAVE_KEY);
    expect(loadGame(store, currentSaveKey(store))?.coins).toBe(4321);
    expect(store.getItem(SAVE_KEY)).toBe(before); // nothing erased
  });

  it('later players begin their own journeys; each signs in to their own, with a PIN if they set one', () => {
    const store = memory();
    saveGame({ ...newGame(), coins: 900 }, store);
    const a = signUp(store, 'Azim', '', 1);
    const b = signUp(store, 'Maryam', '2468', 2);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.tookJourney).toBe(false);
    expect(loadGame(store, saveKeyOf(b.player.id))).toBeNull(); // a new journey
    expect(signUp(store, 'maryam', '', 3).ok).toBe(false); // names are unique
    expect(signUp(store, 'X', '12', 3).ok).toBe(false); // PINs are 4–8 digits
    expect(signIn(store, b.player.id, '0000', 4).ok).toBe(false);
    expect(signIn(store, b.player.id, '2468', 4).ok).toBe(true);
    expect(currentPlayer(store)?.name).toBe('Maryam');
    expect(signIn(store, a.player.id, '', 5).ok).toBe(true);
    expect(loadGame(store, currentSaveKey(store))?.coins).toBe(900);
    signOut(store);
    expect(currentSaveKey(store)).toBe(SAVE_KEY);
    expect(readPlayers(store).players).toHaveLength(2);
    // No PIN is ever kept as written.
    expect(JSON.stringify(readPlayers(store))).not.toContain('2468');
  });

  it('a journey travels to another device as a keepsake file', () => {
    const st = newGame();
    st.coins = 77;
    st.diary.push({ date: '2026-10-02', text: 'Hello', mood: 'joyful', at: 1 });
    const back = fromKeepsake(keepsake(st, 'Fathima', 10));
    expect(back.ok && back.st.coins === 77 && back.st.diary.length === 1 && back.name === 'Fathima').toBe(true);
    expect(fromKeepsake('not json').ok).toBe(false);
    expect(fromKeepsake('{"kind":"something-else"}').ok).toBe(false);
  });

  it('a broken players list never stops the game', () => {
    const store = memory();
    store.setItem('golden-thread/players/v1', '{oops');
    expect(currentSaveKey(store)).toBe(SAVE_KEY);
    expect(currentSaveKey(null)).toBe(SAVE_KEY);
  });
});
