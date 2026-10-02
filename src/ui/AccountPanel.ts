import type { Game } from '../Game';
import { SAVE_KEY, storage } from '../core/save';
import { fromKeepsake, googleAccountOf, googleSignIn, keepsake, readPlayers, saveKeyOf, signIn, signOut, signUp } from '../core/profiles';
import { GOOGLE_CLIENT_ID, googleButton } from '../core/google';
import { serialize } from '../core/save';
import { btn, h } from './dom';

/**
 * Signing in (core/profiles.ts): who is playing on this device, a new player (taking the journey
 * played so far with them, the first time), and keepsake files to carry a journey to another device.
 */
export class AccountPanel {
  private note = '';
  private pinFor = '';

  constructor(private g: Game, private rerender: () => void) {}

  render(body: HTMLElement): void {
    const g = this.g, store = storage(), all = readPlayers(store);
    const guestHas = (() => { try { return !!store?.getItem(SAVE_KEY); } catch { return false; } })();
    const say = (t: string) => { this.note = t; this.rerender(); };

    body.append(h('p', { class: 'story' }, g.player
      ? `Signed in as ${g.player}. Your journey and your diary are kept under your name on this device.`
      : 'Playing as a guest. Sign in to keep your journey under your own name — everything you have done so far comes with you.'));
    if (this.note) body.append(h('p', { class: 'diary-note' }, this.note));

    // Sign in with Google: links this journey to the Google account (or opens the one linked to it).
    const here = all.players.find((p) => p.id === all.current);
    if (GOOGLE_CLIENT_ID && !here?.google) {
      const slot = h('div', { class: 'google-slot' });
      body.append(h('h3', {}, 'Sign in with Google'),
        h('p', { class: 'dim' }, here ? `Links ${here.name}'s journey to your Google account — nothing changes in it.` : 'Your journey so far comes with you the first time; after that, Google opens your own journey on this device.'),
        slot);
      googleButton(slot, (credential) => {
        const acc = googleAccountOf(credential);
        if (!acc) return say('Google did not say who you are. Please try again.');
        g.switchJourney(() => { const r = googleSignIn(store, acc, Date.now()); if (!r.ok) say(r.reason); return r.ok; });
      }).then((shown) => { if (!shown) slot.replaceChildren(h('p', { class: 'dim' }, 'Google could not be reached just now (are you offline?). Signing in by name below works anywhere.')); });
    } else if (here?.google) {
      body.append(h('p', { class: 'dim' }, `🔗 Linked to Google${here.email ? ` (${here.email})` : ''}.`));
    }

    // Who has signed in on this device.
    if (all.players.length) {
      body.append(h('h3', {}, 'Players on this device'));
      const list = h('div', { class: 'players' });
      for (const p of all.players) {
        const here = p.id === all.current;
        const row = h('div', { class: `player${here ? ' on' : ''}` },
          h('span', { class: 'av' }, p.name[0]?.toUpperCase() ?? '?'),
          h('div', {}, h('b', {}, `${p.name}${p.google ? ' · Google' : ''}`), h('small', {}, here ? 'Playing now' : `Last played ${new Date(p.lastPlayed).toLocaleDateString()}`)),
          here ? null : btn(p.pin ? '🔒 Sign in' : 'Sign in', () => {
            if (p.pin) { this.pinFor = p.id; this.rerender(); return; }
            g.switchJourney(() => { const r = signIn(store, p.id, '', Date.now()); if (!r.ok) say(r.reason); return r.ok; });
          }, 'small primary'));
        list.append(row);
        if (this.pinFor === p.id && !here) {
          const pin = h('input', { type: 'password', inputmode: 'numeric', placeholder: 'PIN', 'aria-label': `${p.name}'s PIN`, maxlength: '8' }) as HTMLInputElement;
          const go = () => g.switchJourney(() => { const r = signIn(store, p.id, pin.value, Date.now()); if (!r.ok) say(r.reason); return r.ok; });
          pin.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          list.append(h('div', { class: 'acts' }, pin, btn('Open', go, 'small primary'), btn('Cancel', () => { this.pinFor = ''; this.rerender(); }, 'small ghost')));
          setTimeout(() => pin.focus(), 0);
        }
      }
      body.append(list);
      if (g.player) body.append(h('div', { class: 'acts' }, btn(guestHas ? 'Sign out (play the guest journey)' : 'Sign out', () => g.switchJourney(() => { signOut(store); return true; }), 'small ghost')));
    }

    // A new player.
    body.append(h('h3', {}, all.players.length ? 'Someone new' : 'Sign in'));
    const takes = !all.adopted && guestHas;
    body.append(h('p', { class: 'dim' }, takes
      ? 'Your journey so far comes with you — every land, home, friend and diary page. Nothing is lost.'
      : 'A new player begins their own journey. Every journey on this device is kept.'));
    const name = h('input', { type: 'text', placeholder: 'Your name', 'aria-label': 'Your name', maxlength: '24', autocomplete: 'nickname' }) as HTMLInputElement;
    const pin = h('input', { type: 'password', inputmode: 'numeric', placeholder: 'PIN (optional, 4–8 digits)', 'aria-label': 'PIN (optional)', maxlength: '8' }) as HTMLInputElement;
    const go = () => g.switchJourney(() => { const r = signUp(store, name.value, pin.value, Date.now()); if (!r.ok) say(r.reason); return r.ok; });
    for (const el of [name, pin]) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.append(h('div', { class: 'signin' }, name, pin, btn(takes ? '✨ Sign in and keep my journey' : '✨ Sign in', go, 'primary')));

    // Keepsakes: to another device and back.
    body.append(h('h3', {}, 'Take your journey to another device'),
      h('p', { class: 'dim' }, 'Save your journey to a keepsake file, then bring it in on the other device (sign in there first, so it is kept under your name).'));
    const file = h('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Choose a keepsake file' }) as HTMLInputElement;
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      const r = fromKeepsake(await f.text());
      if (!r.ok) return say(r.reason);
      if (!confirm(`Bring in ${r.name ? `${r.name}'s journey` : 'this journey'}? It takes the place of the journey you are playing now${g.player ? ` as ${g.player}` : ''}.`)) return;
      g.switchJourney(() => { try { store?.setItem(saveKeyOf(all.current), serialize(r.st)); return true; } catch { say('Could not keep it on this device.'); return false; } });
    });
    body.append(h('div', { class: 'acts' },
      btn('💾 Save my journey to a file', () => {
        g.save();
        const blob = new Blob([keepsake(g.st, g.player, Date.now())], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `golden-thread-${(g.player || 'journey').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json` }) as HTMLAnchorElement;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        say('Saved. Keep the file somewhere safe — it holds your journey and your diary.');
      }, 'small'),
      h('label', { class: 'btn small ghost file' }, '📂 Bring a journey from a file', file)));
    body.append(h('p', { class: 'dim fine' }, 'Journeys are kept in this browser on this device. A PIN keeps others here from opening yours by mistake.'));
  }
}
