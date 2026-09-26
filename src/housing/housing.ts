import type { EventBus } from '../core/events';
import { DAY_MINUTES, type GameState, type PlacedDecor } from '../core/state';
import { addItem, removeItems } from '../economy/economy';
import { SPECIES, type SpeciesId } from '../animals/AnimalModel';
import { REGIONS, type RegionId } from '../world/regions';

/** Plots of land for sale in every land, and what can be built on them. Pure rules. */

export { PLOTS, PLOT_BY_ID, PLOT_SIZE, type PlotSite } from '../world/plots';
import { PLOT_BY_ID, PLOTS, PLOT_SIZE, type PlotSite } from '../world/plots';

export interface DecorDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  /** Footprint radius, metres. */
  r: number;
  /** Land whose house style this is (for `house-<region>`). */
  style?: RegionId;
}

export const DECOR: DecorDef[] = [
  { id: 'fence', name: 'Fence', icon: '🪵', price: 4, r: 1.2 },
  { id: 'bench', name: 'Bench', icon: '🪑', price: 10, r: 1 },
  { id: 'flowerbed', name: 'Flower Bed', icon: '🌷', price: 8, r: 1.2 },
  { id: 'farmbed', name: 'Farm Bed', icon: '🟫', price: 12, r: 1.4 },
  { id: 'lamp-post', name: 'Lamp Post', icon: '💡', price: 14, r: 0.4 },
  { id: 'tree', name: 'Young Tree', icon: '🌳', price: 10, r: 1 },
  { id: 'tent', name: 'Tent', icon: '⛺', price: 40, r: 3 },
  { id: 'pen', name: 'Animal Pen', icon: '🐑', price: 30, r: 3.5 },
  { id: 'cottage', name: 'Cottage', icon: '🏡', price: 150, r: 4 },
  { id: 'torii', name: 'Torii Gate', icon: '⛩️', price: 60, r: 2 },
  { id: 'flowerarch', name: 'Flower Arch', icon: '💐', price: 40, r: 1.5 },
  { id: 'fountain', name: 'Fountain', icon: '⛲', price: 80, r: 2.6 },
  { id: 'rangoli', name: 'Rangoli', icon: '🔆', price: 20, r: 1.6 },
  { id: 'star-arch', name: 'Arch of Stars', icon: '🌠', price: 0, r: 2 },
  ...REGIONS.map((r) => ({ id: `house-${r.id}`, name: `${r.name} House`, icon: '🏠', price: 220, r: 5, style: r.id })),
];
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]));
/** A house in the land's style costs this on top of the land when bought together. */
export const HOME_PRICE = 160;

export const CROPS: Record<string, { out: string; qty: number; grow: number }> = {
  seed_flower: { out: 'wildflower', qty: 4, grow: DAY_MINUTES * 0.5 },
  seed_herb: { out: 'herbs', qty: 3, grow: DAY_MINUTES },
  seed_rice: { out: 'rice', qty: 4, grow: DAY_MINUTES },
};

export class Housing {
  constructor(private st: GameState, private bus: EventBus) {}

  owns(plotId: string): boolean {
    return !!this.st.plots[plotId];
  }

  buy(plotId: string): 'ok' | 'owned' | 'coins' | 'unknown' {
    const p = PLOT_BY_ID[plotId];
    if (!p) return 'unknown';
    if (this.owns(plotId)) return 'owned';
    if (this.st.coins < p.price) return 'coins';
    this.st.coins -= p.price;
    this.st.plots[plotId] = { decor: [] };
    this.bus.emit('plot:bought', { plotId });
    this.bus.emit('coins:changed', { coins: this.st.coins });
    return 'ok';
  }

  /** Price of a ready-made home here: the land plus a house in the land's own style. */
  homePrice(plotId: string): number {
    const p = PLOT_BY_ID[plotId];
    return p ? p.price + HOME_PRICE : Infinity;
  }

  /** Buy the land with a house already standing on it (the house style of that land). */
  buyHome(plotId: string): 'ok' | 'owned' | 'coins' | 'unknown' {
    const p = PLOT_BY_ID[plotId];
    if (!p) return 'unknown';
    if (this.owns(plotId)) return 'owned';
    const price = this.homePrice(plotId);
    if (this.st.coins < price) return 'coins';
    this.st.coins -= price;
    this.st.plots[plotId] = { decor: [{ id: `house-${p.region}-home`, kind: `house-${p.region}`, x: 0, z: -5, rot: 0 }] };
    this.bus.emit('plot:bought', { plotId });
    this.bus.emit('plot:changed', { plotId });
    this.bus.emit('coins:changed', { coins: this.st.coins });
    return 'ok';
  }

  /** The plot a world point is inside, if any. */
  plotAt(x: number, z: number): PlotSite | undefined {
    return PLOTS.find((p) => Math.abs(x - p.x) <= PLOT_SIZE / 2 && Math.abs(z - p.z) <= PLOT_SIZE / 2);
  }

  unlocked(): DecorDef[] {
    return DECOR.filter((d) => this.st.unlockedDecor.includes(d.id) || (d.style && this.st.lanterns.includes(d.style)));
  }

  /** Local coordinates are relative to the plot centre. */
  canPlace(plotId: string, kind: string, x: number, z: number): 'ok' | 'bounds' | 'overlap' | 'coins' | 'locked' | 'plot' {
    const d = DECOR_BY_ID[kind];
    const plot = this.st.plots[plotId];
    if (!plot) return 'plot';
    if (!d || !this.unlocked().some((u) => u.id === kind)) return 'locked';
    const half = PLOT_SIZE / 2 - d.r;
    if (Math.abs(x) > half || Math.abs(z) > half) return 'bounds';
    for (const o of plot.decor) {
      const od = DECOR_BY_ID[o.kind];
      if (Math.hypot(o.x - x, o.z - z) < (od?.r ?? 1) + d.r - 0.2) return 'overlap';
    }
    if (this.st.coins < d.price) return 'coins';
    return 'ok';
  }

  place(plotId: string, kind: string, x: number, z: number, rot: number): PlacedDecor | null {
    if (this.canPlace(plotId, kind, x, z) !== 'ok') return null;
    const d = DECOR_BY_ID[kind];
    this.st.coins -= d.price;
    const item: PlacedDecor = { id: `${kind}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`, kind, x, z, rot };
    this.st.plots[plotId].decor.push(item);
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.bus.emit('plot:changed', { plotId });
    return item;
  }

  /** Removing refunds half — nothing is ever silently lost. */
  remove(plotId: string, decorId: string): boolean {
    const plot = this.st.plots[plotId];
    const i = plot?.decor.findIndex((d) => d.id === decorId) ?? -1;
    if (i < 0) return false;
    const [d] = plot.decor.splice(i, 1);
    this.st.coins += Math.floor((DECOR_BY_ID[d.kind]?.price ?? 0) / 2);
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.bus.emit('plot:changed', { plotId });
    return true;
  }

  plant(plotId: string, decorId: string, seed: string): boolean {
    const bed = this.st.plots[plotId]?.decor.find((d) => d.id === decorId);
    if (!bed || bed.kind !== 'farmbed' || bed.crop || !CROPS[seed]) return false;
    if (!removeItems(this.st, { [seed]: 1 })) return false;
    bed.crop = { seed, plantedAt: this.st.minutes };
    this.bus.emit('plot:changed', { plotId });
    return true;
  }

  /** 0..1 growth of a bed's crop. */
  growth(d: PlacedDecor): number {
    if (!d.crop) return 0;
    return Math.min(1, (this.st.minutes - d.crop.plantedAt) / CROPS[d.crop.seed].grow);
  }

  harvest(plotId: string, decorId: string): string | null {
    const bed = this.st.plots[plotId]?.decor.find((d) => d.id === decorId);
    if (!bed?.crop || this.growth(bed) < 1) return null;
    const c = CROPS[bed.crop.seed];
    addItem(this.st, c.out, c.qty);
    this.bus.emit('item:gained', { id: c.out, qty: c.qty });
    bed.crop = undefined;
    this.bus.emit('plot:changed', { plotId });
    return c.out;
  }

  // ───── animals ─────

  befriendAnimal(animalId: string, species: SpeciesId, name: string): 'ok' | 'food' | 'already' {
    const a = this.st.animals[animalId];
    if (a?.befriended) return 'already';
    const diet = SPECIES[species].diet;
    if (!removeItems(this.st, { [diet]: 1 })) return 'food';
    this.st.animals[animalId] = { species, name, befriended: true, happiness: 70, lastFedAt: this.st.minutes };
    this.bus.emit('animal:befriended', { animalId, species });
    return 'ok';
  }

  adopt(animalId: string, plotId: string): boolean {
    const a = this.st.animals[animalId];
    if (!a?.befriended || !this.owns(plotId)) return false;
    a.plotId = plotId;
    this.bus.emit('plot:changed', { plotId });
    return true;
  }

  happiness(animalId: string): number {
    const a = this.st.animals[animalId];
    if (!a) return 0;
    const days = (this.st.minutes - a.lastFedAt) / DAY_MINUTES;
    return Math.max(0, Math.min(100, a.happiness - days * 20));
  }

  feed(animalId: string): boolean {
    const a = this.st.animals[animalId];
    if (!a) return false;
    if (!removeItems(this.st, { [SPECIES[a.species as SpeciesId].diet]: 1 })) return false;
    a.happiness = Math.min(100, this.happiness(animalId) + 30);
    a.lastFedAt = this.st.minutes;
    return true;
  }

  /** Happy kept animals share something once a day (wool, milk…). */
  collect(animalId: string): string | null {
    const a = this.st.animals[animalId];
    const produce = a && SPECIES[a.species as SpeciesId].produce;
    if (!a?.plotId || !produce || this.happiness(animalId) < 50) return null;
    const key = `animal:${animalId}`;
    if (this.st.minutes - (this.st.gathered[key] ?? -Infinity) < DAY_MINUTES) return null;
    this.st.gathered[key] = this.st.minutes;
    addItem(this.st, produce, 2);
    this.bus.emit('item:gained', { id: produce, qty: 2 });
    return produce;
  }
}
