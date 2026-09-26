import type { EventBus } from '../core/events';
import { DAY_MINUTES, type GameState, type PlacedDecor } from '../core/state';
import { addItem, removeItems } from '../economy/economy';
import { SPECIES, type SpeciesId } from '../animals/AnimalModel';
import { REGIONS, type RegionId } from '../world/regions';
import { ITEMS } from '../economy/items';

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

/**
 * What grows: the harvest, how many, how long it takes (game minutes), and how it looks — its
 * leaves, what it bears when ripe, and its habit (tall stalks, a bush, a trailing vine, a flower).
 */
export interface CropDef { out: string; qty: number; grow: number; leaf: string; ripe: string; shape: 'stalk' | 'bush' | 'vine' | 'flower' }
export const CROPS: Record<string, CropDef> = {
  seed_flower: { out: 'wildflower', qty: 4, grow: DAY_MINUTES * 0.5, leaf: '#6aab52', ripe: '#ff8fb8', shape: 'flower' },
  seed_herb: { out: 'herbs', qty: 3, grow: DAY_MINUTES, leaf: '#4f9a44', ripe: '#7ac85a', shape: 'bush' },
  seed_rice: { out: 'rice', qty: 4, grow: DAY_MINUTES, leaf: '#9ac85a', ripe: '#e8d27a', shape: 'stalk' },
  seed_wheat: { out: 'wheat', qty: 5, grow: DAY_MINUTES * 0.8, leaf: '#9ab84a', ripe: '#e8c35a', shape: 'stalk' },
  seed_tomato: { out: 'tomato', qty: 4, grow: DAY_MINUTES * 1.2, leaf: '#4f8f3a', ripe: '#e8402a', shape: 'bush' },
  seed_carrot: { out: 'carrot', qty: 4, grow: DAY_MINUTES * 0.7, leaf: '#6ab84a', ripe: '#ff8a2a', shape: 'bush' },
  seed_pumpkin: { out: 'pumpkin', qty: 2, grow: DAY_MINUTES * 1.6, leaf: '#4f8f3a', ripe: '#ff8a1f', shape: 'vine' },
  seed_strawberry: { out: 'strawberry', qty: 5, grow: DAY_MINUTES * 1.0, leaf: '#3f8a3a', ripe: '#e8284a', shape: 'vine' },
  seed_chilli: { out: 'chilli', qty: 5, grow: DAY_MINUTES * 1.1, leaf: '#3f8a3a', ripe: '#d81f1f', shape: 'bush' },
  seed_sunflower: { out: 'sunflower', qty: 3, grow: DAY_MINUTES * 0.9, leaf: '#5a9a3a', ripe: '#ffd21f', shape: 'flower' },
  seed_cotton: { out: 'cotton', qty: 3, grow: DAY_MINUTES * 1.3, leaf: '#5a8a3a', ripe: '#fbf6ee', shape: 'bush' },
  seed_tea: { out: 'tea', qty: 4, grow: DAY_MINUTES * 1.4, leaf: '#2f7a3a', ripe: '#6ac85a', shape: 'bush' },
};

/** Watering a bed once brings its harvest this much closer (a share of its growing time). */
export const WATER_BOOST = 0.3;

/** The seeds each land's market stalls sell (their own farming), and at what price. */
export const SEED_SHOP: Record<RegionId, string[]> = {
  meadow: ['seed_flower', 'seed_carrot', 'seed_pumpkin', 'seed_strawberry', 'seed_wheat'],
  japan: ['seed_rice', 'seed_tea', 'seed_strawberry'], korea: ['seed_rice', 'seed_chilli', 'seed_carrot'],
  china: ['seed_rice', 'seed_tea', 'seed_chilli'], norway: ['seed_carrot', 'seed_wheat', 'seed_strawberry'],
  switzerland: ['seed_wheat', 'seed_carrot', 'seed_flower'], london: ['seed_herb', 'seed_tomato', 'seed_strawberry'],
  newyork: ['seed_tomato', 'seed_pumpkin', 'seed_sunflower'], renaissance: ['seed_tomato', 'seed_herb', 'seed_wheat'],
  vintage: ['seed_sunflower', 'seed_pumpkin', 'seed_flower'], islamic: ['seed_herb', 'seed_tomato', 'seed_chilli'],
  middleeast: ['seed_wheat', 'seed_chilli', 'seed_herb'], desert: ['seed_wheat', 'seed_herb'],
  egypt: ['seed_cotton', 'seed_wheat', 'seed_tomato'], indianorth: ['seed_wheat', 'seed_chilli', 'seed_cotton', 'seed_carrot'],
  indiasouth: ['seed_rice', 'seed_chilli', 'seed_tea'], mughal: ['seed_flower', 'seed_wheat', 'seed_carrot'],
  indonesia: ['seed_rice', 'seed_tea', 'seed_chilli'], aurora: ['seed_carrot', 'seed_herb'], skyisles: ['seed_flower', 'seed_sunflower'],
};
export const seedPrice = (seed: string) => Math.ceil((ITEMS[seed]?.value ?? 4) * 1.6);

/** Buy seeds at a market stall. Pure rule: coins down, seeds in the bag. */
export function buySeed(st: GameState, land: RegionId, seed: string): 'ok' | 'coins' | 'unknown' {
  if (!SEED_SHOP[land].includes(seed) || !CROPS[seed]) return 'unknown';
  const price = seedPrice(seed);
  if (st.coins < price) return 'coins';
  st.coins -= price;
  addItem(st, seed, 1);
  return 'ok';
}

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

  /** Water a bed: once per planting, it brings the harvest closer. */
  water(plotId: string, decorId: string): boolean {
    const bed = this.st.plots[plotId]?.decor.find((d) => d.id === decorId);
    if (!bed?.crop || bed.crop.watered || this.growth(bed) >= 1) return false;
    bed.crop.plantedAt -= CROPS[bed.crop.seed].grow * WATER_BOOST;
    bed.crop.watered = true;
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
