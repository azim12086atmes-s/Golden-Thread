import type { EventBus } from '../core/events';
import type { GameState } from '../core/state';
import { addItem, count, removeItems } from '../economy/economy';
import { ITEMS } from '../economy/items';
import { PEOPLE_BY_ID } from '../npc/people';
import { VEHICLES } from '../vehicles/vehicles';
import { QUESTS, QUEST_BY_ID, type QuestDef, type Reward, type Step } from './quests';

/**
 * Quest progression over GameState. Gather/craft steps are satisfied by what is in the bag, so the
 * order in which the player does things never matters; talk/deliver/lantern steps are explicit.
 */
export class QuestSystem {
  constructor(private state: GameState, private bus: EventBus) {
    bus.on('item:gained', () => this.refresh());
    bus.on('item:crafted', () => this.refresh());
    bus.on('animal:befriended', ({ species }) => this.onBefriend(species));
    bus.on('region:entered', ({ regionId }) => this.onVisit(regionId));
  }

  status(id: string) {
    return this.state.quests[id]?.status;
  }

  isAvailable(q: QuestDef): boolean {
    if (this.state.quests[q.id]) return false;
    if (q.after?.some((a) => this.status(a) !== 'done')) return false;
    if (q.lanternsNeeded && this.state.lanterns.length < q.lanternsNeeded) return false;
    return true;
  }

  /** Quests this person could offer right now. */
  offeredBy(npcId: string): QuestDef[] {
    return QUESTS.filter((q) => q.giver === npcId && this.isAvailable(q));
  }

  active(): QuestDef[] {
    return QUESTS.filter((q) => this.state.quests[q.id]?.status === 'active');
  }

  done(): QuestDef[] {
    return QUESTS.filter((q) => this.state.quests[q.id]?.status === 'done');
  }

  step(id: string): Step | undefined {
    const p = this.state.quests[id];
    if (!p || p.status !== 'active') return undefined;
    return QUEST_BY_ID[id].steps[p.step];
  }

  stepText(id: string): string {
    const s = this.step(id);
    if (!s) return '';
    const itemName = 'item' in s ? ITEMS[s.item]?.name ?? s.item : '';
    const have = 'qty' in s && 'item' in s ? ` (${Math.min(count(this.state, s.item), s.qty)}/${s.qty})` : '';
    return s.text.replace('{item}', itemName) + have;
  }

  start(id: string): boolean {
    const q = QUEST_BY_ID[id];
    if (!q || !this.isAvailable(q)) return false;
    this.state.quests[id] = { status: 'active', step: 0, count: 0 };
    this.bus.emit('quest:started', { questId: id });
    this.bus.emit('toast', { text: `New journey: ${q.title}`, kind: 'story' });
    // A quest started by talking to its giver has already met them.
    this.talk(q.giver, true);
    this.refresh();
    return true;
  }

  /** The player spoke with someone. Advances any "talk" step aimed at them. */
  talk(npcId: string, silent = false): void {
    for (const q of this.active()) {
      const s = this.step(q.id);
      if (s?.kind === 'talk' && s.npc === npcId) {
        if (s.gives) for (const [item, n] of Object.entries(s.gives)) addItem(this.state, item, n);
        this.advance(q.id);
      }
    }
    if (!silent) this.bus.emit('npc:talked', { npcId });
  }

  /** Deliveries this person is waiting for that the player can make now. */
  deliverable(npcId: string): QuestDef[] {
    return this.active().filter((q) => {
      const s = this.step(q.id);
      return s?.kind === 'deliver' && s.npc === npcId && count(this.state, s.item) >= s.qty;
    });
  }

  deliver(id: string): boolean {
    const s = this.step(id);
    if (s?.kind !== 'deliver') return false;
    if (!removeItems(this.state, { [s.item]: s.qty })) return false;
    this.advance(id);
    return true;
  }

  /** The lantern step is waiting in this land. */
  lanternReady(region: string): QuestDef | undefined {
    return this.active().find((q) => {
      const s = this.step(q.id);
      return s?.kind === 'lantern' && s.region === region;
    });
  }

  lightLantern(region: string): boolean {
    const q = this.lanternReady(region);
    if (!q) return false;
    if (!this.state.lanterns.includes(region)) this.state.lanterns.push(region);
    this.bus.emit('lantern:lit', { regionId: region });
    this.advance(q.id);
    return true;
  }

  private onBefriend(species: string): void {
    for (const q of this.active()) {
      const s = this.step(q.id);
      if (s?.kind === 'befriend' && s.species === species) this.advance(q.id);
    }
  }

  private onVisit(region: string): void {
    for (const q of this.active()) {
      const s = this.step(q.id);
      if (s?.kind === 'visit' && s.region === region) this.advance(q.id);
    }
  }

  /** Re-check inventory-based steps. */
  refresh(): void {
    for (const q of this.active()) {
      const s = this.step(q.id);
      if ((s?.kind === 'gather' || s?.kind === 'craft') && count(this.state, s.item) >= s.qty) this.advance(q.id);
    }
  }

  private advance(id: string): void {
    const p = this.state.quests[id];
    const q = QUEST_BY_ID[id];
    p.step++;
    p.count = 0;
    if (p.step >= q.steps.length) {
      p.status = 'done';
      this.grant(q.reward);
      this.bus.emit('quest:completed', { questId: id });
      this.bus.emit('toast', { text: q.outro, kind: 'story' });
    } else {
      this.bus.emit('quest:progress', { questId: id });
      // The next step may already be satisfied (e.g. the bag already holds what is needed).
      const s = q.steps[p.step];
      if ((s.kind === 'gather' || s.kind === 'craft') && count(this.state, s.item) >= s.qty) this.advance(id);
    }
  }

  private grant(r: Reward): void {
    const st = this.state;
    if (r.coins) {
      st.coins += r.coins;
      this.bus.emit('coins:changed', { coins: st.coins });
    }
    if (r.light) st.light += r.light;
    if (r.items) for (const [i, n] of Object.entries(r.items)) addItem(st, i, n);
    if (r.hearts) for (const [npc, n] of Object.entries(r.hearts)) addHearts(st, this.bus, npc, n);
    if (r.flag && !st.flags.includes(r.flag)) st.flags.push(r.flag);
    if (r.decor) for (const d of r.decor) if (!st.unlockedDecor.includes(d)) st.unlockedDecor.push(d);
    if (r.vehicle && !st.vehicles.includes(r.vehicle)) {
      st.vehicles.push(r.vehicle);
      this.bus.emit('toast', { text: `${VEHICLES[r.vehicle].icon} ${VEHICLES[r.vehicle].name} is yours!`, kind: 'reward' });
    }
    const bits = [r.coins ? `+${r.coins} coins` : '', r.light ? `+${r.light} light` : ''].filter(Boolean);
    if (bits.length) this.bus.emit('toast', { text: bits.join(' · '), kind: 'reward' });
  }
}

/** Friendship: 2 hearts makes a friend, who then writes to you. Max 5. */
export const FRIEND_AT = 2;
export function addHearts(st: GameState, bus: EventBus, npcId: string, n: number): void {
  const f = (st.friends[npcId] ??= { hearts: 0, befriended: false, lastMessageAt: st.minutes });
  f.hearts = Math.min(5, f.hearts + n);
  if (!f.befriended && f.hearts >= FRIEND_AT) {
    f.befriended = true;
    f.lastMessageAt = st.minutes;
    bus.emit('npc:befriended', { npcId });
    const p = PEOPLE_BY_ID[npcId];
    if (p) bus.emit('toast', { text: `💛 ${p.name} is now your friend`, kind: 'reward' });
  }
}
