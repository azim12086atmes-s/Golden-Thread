/** Typed event bus. Systems talk through events so quests, messages and UI stay decoupled. */
export interface GameEvents {
  'item:gained': { id: string; qty: number };
  'item:crafted': { id: string; qty: number };
  'npc:talked': { npcId: string };
  'npc:befriended': { npcId: string };
  'animal:befriended': { animalId: string; species: string };
  'region:entered': { regionId: string; first: boolean };
  'quest:started': { questId: string };
  'quest:progress': { questId: string };
  'quest:completed': { questId: string };
  'lantern:lit': { regionId: string };
  'plot:bought': { plotId: string };
  'plot:changed': { plotId: string };
  'vehicle:changed': { vehicleId: string | null };
  'message:received': { npcId: string; text: string };
  'toast': { text: string; kind?: 'info' | 'reward' | 'story' };
  'diary:nudge': { text: string };
  'world:ready': Record<string, never>;
  'coins:changed': { coins: number };
  'outfit:changed': { who: 'girl' | 'boy' };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<GameEvents[K]>)(payload);
  }
}
