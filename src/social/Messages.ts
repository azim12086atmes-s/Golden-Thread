import type { EventBus } from '../core/events';
import type { GameState, Message } from '../core/state';
import { count, removeItems } from '../economy/economy';
import { ITEMS } from '../economy/items';
import { keepInTouch } from '../charity/upskill';
import { friendDef, lettersOf } from './friends';
import { addHearts } from '../quests/QuestSystem';
import { REGION_BY_ID } from '../world/regions';

/**
 * Friends write in. Befriended residents send letters, questions and small requests on their own
 * schedule; the side panel shows them like notifications and the player can reply, ask how they
 * are, send a gift, or fulfil a request.
 */

const GAP_MIN = 6 * 60, GAP_MAX = 16 * 60; // game-minutes between a friend's messages

const ASK = ['How are you both? Where has the road taken you?', 'Are you eating well out there?', 'Did you see anything beautiful today?'];
const THANKS = ['Thank you! This made my whole day.', 'You remembered! I am so touched.', 'Oh! I will treasure this.'];
const REPLIES: Record<string, string[]> = {
  well: ['That makes me so happy to hear.', 'Good. Stay well, both of you.', 'Alhamdulillah. Write again soon.'],
  ask: ['I am well! A little tired, but happy.', 'Busy, busy — but your message was a nice pause.', 'Better now that you asked.'],
  coming: ['I will put the kettle on!', 'Wonderful — I will wait by the road.', 'See you soon, then!'],
};

export const REPLY_OPTIONS = [
  { key: 'well', label: 'We are well, thank you 🌿', text: 'We are well, thank you! The road has been kind.' },
  { key: 'ask', label: 'How are you? 💛', text: 'How are you doing? We think of you often.' },
  { key: 'coming', label: 'We will visit soon 🚐', text: 'We will come and visit soon!' },
] as const;

function hash(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export class Messages {
  private seq = 0;

  constructor(private st: GameState, private bus: EventBus) {
    this.seq = st.messages.length;
  }

  private push(m: Omit<Message, 'id'>): Message {
    const msg: Message = { ...m, id: `m${Date.now().toString(36)}${this.seq++}` };
    this.st.messages.push(msg);
    if (this.st.messages.length > 300) this.st.messages.splice(0, this.st.messages.length - 300);
    if (m.from === 'them') this.bus.emit('message:received', { npcId: m.npcId, text: m.text });
    return msg;
  }

  friends(): string[] {
    return Object.entries(this.st.friends).filter(([, f]) => f.befriended).map(([id]) => id);
  }

  thread(npcId: string): Message[] {
    return this.st.messages.filter((m) => m.npcId === npcId);
  }

  unread(): number {
    return this.st.messages.filter((m) => m.from === 'them' && !m.read).length;
  }

  markRead(npcId: string): void {
    for (const m of this.st.messages) if (m.npcId === npcId) m.read = true;
  }

  /** Called every game tick. Deterministic from state so tests can drive it. */
  tick(): void {
    const now = this.st.minutes;
    for (const id of this.friends()) {
      const f = this.st.friends[id];
      const r = hash(Math.floor(f.lastMessageAt) ^ id.length * 7919);
      if (now - f.lastMessageAt < GAP_MIN + r * (GAP_MAX - GAP_MIN)) continue;
      f.lastMessageAt = now;
      this.compose(id, r);
    }
  }

  private compose(npcId: string, r: number): void {
    const p = friendDef(npcId);
    if (!p) return;
    const n = this.st.names;
    const fill = (s: string) => s.replace('{g}', n.girl).replace('{b}', n.boy);
    const openRequest = this.thread(npcId).some((m) => m.request && !m.request.done);
    if (r < 0.28 && !openRequest && !p.inNeed) {
      const wanted = REGION_BY_ID[p.region].wanted;
      const item = wanted[Math.floor(r * 100) % wanted.length];
      const qty = 1 + (Math.floor(r * 1000) % 2);
      const reward = Math.round((ITEMS[item]?.value ?? 10) * qty * 1.6);
      this.push({ npcId, from: 'them', at: this.st.minutes, text: `Could I ask a favour? I need ${qty} × ${ITEMS[item].icon} ${ITEMS[item].name}. I would pay ${reward} coins, and my thanks forever.`, request: { item, qty, reward } });
    } else if (r < 0.45) {
      this.push({ npcId, from: 'them', at: this.st.minutes, text: fill(ASK[Math.floor(r * 97) % ASK.length]) });
    } else {
      const letters = lettersOf(this.st, npcId);
      this.push({ npcId, from: 'them', at: this.st.minutes, text: fill(letters[Math.floor(r * 131) % letters.length]) });
    }
  }

  reply(npcId: string, key: (typeof REPLY_OPTIONS)[number]['key']): void {
    const opt = REPLY_OPTIONS.find((o) => o.key === key)!;
    // Writing back to someone you sponsor keeps you in touch.
    keepInTouch(this.st, npcId);
    this.push({ npcId, from: 'us', at: this.st.minutes, text: opt.text, read: true });
    const pool = REPLIES[key];
    const back = pool[Math.floor(hash(this.st.minutes + npcId.length) * pool.length)];
    // Replies come back a little later; they appear in the thread straight away but notify once.
    this.push({ npcId, from: 'them', at: this.st.minutes + 30, text: back });
    const f = this.st.friends[npcId];
    if (f && key === 'ask' && f.hearts < 5 && hash(this.st.minutes) < 0.35) addHearts(this.st, this.bus, npcId, 1);
  }

  gift(npcId: string, item: string): boolean {
    if (!removeItems(this.st, { [item]: 1 })) return false;
    this.push({ npcId, from: 'us', at: this.st.minutes, text: `Sent a gift: ${ITEMS[item].icon} ${ITEMS[item].name}`, read: true });
    const p = friendDef(npcId);
    const loved = p && REGION_BY_ID[p.region].wanted.includes(item);
    this.push({ npcId, from: 'them', at: this.st.minutes + 20, text: THANKS[Math.floor(hash(this.st.minutes) * THANKS.length)] + (loved ? ' It is exactly what I needed!' : '') });
    addHearts(this.st, this.bus, npcId, loved ? 2 : 1);
    return true;
  }

  canFulfil(m: Message): boolean {
    return !!m.request && !m.request.done && count(this.st, m.request.item) >= m.request.qty;
  }

  fulfil(messageId: string): boolean {
    const m = this.st.messages.find((x) => x.id === messageId);
    if (!m?.request || m.request.done) return false;
    if (!removeItems(this.st, { [m.request.item]: m.request.qty })) return false;
    m.request.done = true;
    this.st.coins += m.request.reward;
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.push({ npcId: m.npcId, from: 'us', at: this.st.minutes, text: `Sent ${m.request.qty} × ${ITEMS[m.request.item].name}. 📦`, read: true });
    this.push({ npcId: m.npcId, from: 'them', at: this.st.minutes + 20, text: `It arrived! Thank you both. (+${m.request.reward} coins)` });
    addHearts(this.st, this.bus, m.npcId, 1);
    return true;
  }
}
