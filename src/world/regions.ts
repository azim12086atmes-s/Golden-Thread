import type { SkillId } from '../economy/items';
import type { Flora } from './kit';

export type RegionId =
  | 'meadow' | 'japan' | 'korea' | 'china' | 'norway' | 'switzerland' | 'london' | 'newyork'
  | 'renaissance' | 'vintage' | 'islamic' | 'middleeast' | 'desert' | 'egypt' | 'indianorth'
  | 'indiasouth' | 'mughal' | 'indonesia' | 'aurora' | 'skyisles';

export type Ambient = 'petals' | 'snow' | 'fireflies' | 'sand' | 'sparkles' | 'leaves' | 'none';

export interface RegionSpec {
  id: RegionId;
  name: string;
  subtitle: string;
  col: number;
  row: number;
  ground: string;
  groundAlt: string;
  road: string;
  /** Hill amplitude outside the city core, metres. */
  relief: number;
  /** Snow caps above this height (metres); Infinity = never. */
  snowline: number;
  walls: string[];
  roofs: string[];
  trims: string[];
  glow: string;
  flora: Flora[];
  flowers: string[];
  houses: number;
  ambient: Ambient;
  special?: 'aurora' | 'rainbow';
  fauna: string[];
  materials: string[];
  wanted: string[];
  skill: SkillId;
}

/** Each land is a square this many metres across. */
export const REGION_SIZE = 700;
/** Radius of the flat city core around each land's centre. */
export const CITY_RADIUS = 240;
export const GRID_COLS = 5;
export const GRID_ROWS = 4;
export const HOME_COL = 2;
export const HOME_ROW = 1;

const R = (r: RegionSpec) => r;

export const REGIONS: RegionSpec[] = [
  // Row 0 — the north
  R({ id: 'aurora', name: 'Aurora Huts', subtitle: 'Where the sky dances green', col: 0, row: 0, ground: '#e9f0f7', groundAlt: '#d6e4f0', road: '#b9c8d6', relief: 34, snowline: -99, walls: ['#8a5a3c', '#a86b45', '#6b4a33'], roofs: ['#f4f8ff', '#e0e8f2'], trims: ['#ffd27a'], glow: '#ffcf7a', flora: ['snowpine', 'snowpine', 'birch', 'glowtree', 'aspen'], flowers: ['#bfe3ff', '#ffffff'], houses: 90, ambient: 'snow', special: 'aurora', fauna: ['reindeer', 'husky', 'arcticfox', 'snowhare', 'muskox', 'fox', 'aurorafox'], materials: ['ice', 'pinecone', 'wood'], wanted: ['scarf', 'minttea', 'lantern'], skill: 'lampcraft' }),
  R({ id: 'norway', name: 'Fjordhavn', subtitle: 'Painted houses by deep water', col: 1, row: 0, ground: '#6f9a5a', groundAlt: '#557f4a', road: '#8c8c84', relief: 60, snowline: 34, walls: ['#b0322a', '#e2b04a', '#f4f1e8', '#3f6b8a'], roofs: ['#3b3b40', '#5a4a3c', '#2f4a3a'], trims: ['#ffffff'], glow: '#ffd89a', flora: ['pine', 'birch', 'pine', 'aspen', 'maple'], flowers: ['#ffffff', '#f2d14e', '#b58ad9'], houses: 130, ambient: 'leaves', fauna: ['sheep', 'goat', 'elk', 'lynx', 'puffin', 'fox'], materials: ['birch', 'fleece', 'wood'], wanted: ['minttea', 'balm', 'lantern'], skill: 'carpentry' }),
  R({ id: 'switzerland', name: 'Alpenrose', subtitle: 'Chalets under the peaks', col: 2, row: 0, ground: '#7fb35a', groundAlt: '#94c46a', road: '#a39a88', relief: 75, snowline: 30, walls: ['#8a5a36', '#f3ead8', '#a8703f'], roofs: ['#5a3a26', '#6e4a30'], trims: ['#c23b3b', '#ffffff'], glow: '#ffd89a', flora: ['pine', 'pine', 'oak', 'aspen', 'maple'], flowers: ['#ffffff', '#ff6b8b', '#f2d14e'], houses: 110, ambient: 'none', fauna: ['cow', 'goat', 'ibex', 'stbernard', 'marmot', 'sheep', 'pegasus', 'eagle'], materials: ['edelweiss', 'milk', 'wood'], wanted: ['gearkit', 'datecake', 'scarf'], skill: 'cooking' }),
  R({ id: 'london', name: 'Old London', subtitle: 'Brick, rain and a great clock', col: 3, row: 0, ground: '#6e9a5c', groundAlt: '#5f8a50', road: '#5c5c66', relief: 8, snowline: Infinity, walls: ['#9a4a3a', '#b5654a', '#e8e0d0', '#7a3a30'], roofs: ['#3a3a44', '#4a4a55'], trims: ['#f2efe6', '#1f1f24'], glow: '#ffe0a0', flora: ['plane', 'oak', 'magnolia', 'willow', 'sakura'], flowers: ['#d1495b', '#f2f2f2'], houses: 140, ambient: 'leaves', fauna: ['dog', 'corgi', 'cat', 'squirrel', 'raven', 'duck', 'clockraven'], materials: ['gear', 'tea', 'wood'], wanted: ['vase', 'shawl', 'curry'], skill: 'mechanics' }),
  R({ id: 'newyork', name: 'New Yonder', subtitle: 'Towers of a thousand windows', col: 4, row: 0, ground: '#6ca25a', groundAlt: '#5e9150', road: '#4a4a52', relief: 6, snowline: Infinity, walls: ['#b8b2a6', '#8a7a6a', '#c9c2b5', '#6a7a8a', '#a0522d'], roofs: ['#3a3a44'], trims: ['#e8e4da'], glow: '#fff2c0', flora: ['plane', 'oak', 'magnolia', 'maple', 'ginkgo'], flowers: ['#f2d14e', '#e4572e'], houses: 90, ambient: 'none', fauna: ['streetcat', 'cybercat', 'cyberdog', 'streetcat', 'dog', 'duck', 'robopigeon', 'hoverhound'], materials: ['scrap', 'paint', 'wood'], wanted: ['coconutsweet', 'rug', 'verse'], skill: 'carpentry' }),
  // Row 1
  R({ id: 'korea', name: 'Hanok Village', subtitle: 'Curved roofs and quiet courtyards', col: 0, row: 1, ground: '#88b06a', groundAlt: '#779f5c', road: '#b5a58a', relief: 40, snowline: Infinity, walls: ['#f4efe4', '#e8dcc6'], roofs: ['#3a3f4a', '#2f343e'], trims: ['#8a4a2a', '#3f6c8f'], glow: '#ffd08a', flora: ['pine', 'maple', 'pine', 'ginkgo', 'wisteria'], flowers: ['#ff8fb8', '#ffffff'], houses: 110, ambient: 'leaves', fauna: ['cat', 'jindo', 'magpie', 'deer', 'crane', 'tiger', 'haetae'], materials: ['hanji', 'ginseng', 'wood'], wanted: ['datecake', 'pot', 'shawl'], skill: 'calligraphy' }),
  R({ id: 'japan', name: 'Sakura Hollow', subtitle: 'Lanterns, pagodas and petals', col: 1, row: 1, ground: '#8cbf6a', groundAlt: '#a3cf7a', road: '#c4b394', relief: 32, snowline: Infinity, walls: ['#f4efe2', '#8a5a3a', '#e9dfc8'], roofs: ['#3a3a4a', '#2c3140', '#6b3a3a'], trims: ['#b3263a', '#3a2a22'], glow: '#ffc27a', flora: ['sakura', 'sakura', 'pine', 'bamboo', 'wisteria', 'maple'], flowers: ['#ffc4dc', '#ffffff', '#b3263a'], houses: 120, ambient: 'petals', fauna: ['cat', 'shiba', 'tanuki', 'crane', 'deer', 'kitsune'], materials: ['cedar', 'tea', 'wood'], wanted: ['curry', 'lantern', 'vase'], skill: 'cooking' }),
  R({ id: 'meadow', name: "Wanderers' Meadow", subtitle: 'Where every journey begins', col: 2, row: 1, ground: '#96cf6c', groundAlt: '#b3dd7a', road: '#d9c28f', relief: 22, snowline: Infinity, walls: ['#fff4e0', '#ffe3c2', '#f6d7e8', '#dcefff'], roofs: ['#e07a5f', '#8fb3d9', '#c38fd9', '#f2c14e'], trims: ['#ffffff'], glow: '#ffdd8a', flora: ['oak', 'oak', 'birch', 'sakura', 'candy', 'jacaranda', 'magnolia'], flowers: ['#ff8fb8', '#f2d14e', '#b58ad9', '#ffffff', '#ff6b6b'], houses: 56, ambient: 'fireflies', special: 'rainbow', fauna: ['sheep', 'rabbit', 'unicorn', 'duck', 'hedgehog', 'fawn', 'fairyfox', 'moonrabbit', 'fairydeer'], materials: ['wildflower', 'wool', 'wood'], wanted: ['minttea', 'stool', 'lantern'], skill: 'weaving' }),
  R({ id: 'renaissance', name: 'Firenzia', subtitle: 'Domes of terracotta and gold', col: 3, row: 1, ground: '#9fb86a', groundAlt: '#b3c47a', road: '#c9a877', relief: 28, snowline: Infinity, walls: ['#e8c48a', '#d9a86a', '#f0dcb4', '#c98a5a'], roofs: ['#b5552e', '#c4643a'], trims: ['#fbf3e0'], glow: '#ffd08a', flora: ['cypress', 'olive', 'cypress', 'orange', 'jacaranda'], flowers: ['#d1495b', '#ffffff', '#b58ad9'], houses: 130, ambient: 'none', fauna: ['greyhound', 'dog', 'cat', 'horse', 'dove', 'lion', 'griffin', 'clockbird'], materials: ['marble', 'olive', 'wood'], wanted: ['tea', 'shawl', 'clockwork'], skill: 'pottery' }),
  R({ id: 'vintage', name: 'Maple Row', subtitle: 'Carousels, awnings and old songs', col: 4, row: 1, ground: '#8fc06a', groundAlt: '#7fae5c', road: '#6a6a70', relief: 12, snowline: Infinity, walls: ['#f7c5c5', '#bfe3d9', '#fff0b3', '#c9d7f2', '#f2d0a4'], roofs: ['#e07a5f', '#5a8ab5', '#6ab58a'], trims: ['#ffffff'], glow: '#ffb3d9', flora: ['maple', 'oak', 'maple', 'magnolia', 'candy'], flowers: ['#ff8fb8', '#f2d14e'], houses: 110, ambient: 'leaves', fauna: ['dog', 'raccoon', 'squirrel', 'cat', 'duck', 'cardinal', 'thunderbird'], materials: ['spool', 'paint', 'wood'], wanted: ['cheese', 'birdhouse', 'balm'], skill: 'weaving' }),
  // Row 2
  R({ id: 'china', name: 'Jade Terraces', subtitle: 'Red pillars and bamboo shade', col: 0, row: 2, ground: '#86b86a', groundAlt: '#6fa65a', road: '#b8a07a', relief: 48, snowline: Infinity, walls: ['#b3262a', '#f2e6cc', '#c23b2a'], roofs: ['#2f7a5a', '#e2b43a', '#3a3a44'], trims: ['#e2b43a', '#b3262a'], glow: '#ff5a3a', flora: ['bamboo', 'willow', 'pine', 'bamboo', 'ginkgo', 'wisteria'], flowers: ['#ff8fb8', '#ffffff', '#f2d14e'], houses: 120, ambient: 'petals', fauna: ['panda', 'redpanda', 'crane', 'cormorant', 'cat', 'goldenmonkey', 'qilin'], materials: ['silk', 'bamboo', 'wood'], wanted: ['cheese', 'toyboat', 'verse'], skill: 'weaving' }),
  R({ id: 'indonesia', name: 'Nusa Rinjani', subtitle: 'Horned roofs over rice terraces', col: 1, row: 2, ground: '#6fbf5a', groundAlt: '#8fd46a', road: '#b89a6a', relief: 44, snowline: Infinity, walls: ['#8a5a36', '#a86b45', '#e8d0a8'], roofs: ['#4a3a2a', '#6b4a2a', '#8a6a3a'], trims: ['#c23b2a', '#e2b43a'], glow: '#ffb86a', flora: ['palm', 'coconut', 'banana', 'palm', 'rainbowgum', 'flame'], flowers: ['#ff6b8b', '#f2d14e', '#ffffff'], houses: 110, ambient: 'fireflies', fauna: ['buffalo', 'hornbill', 'crane', 'cat', 'macaque', 'orangutan', 'komodo'], materials: ['rice', 'rattan', 'coconut'], wanted: ['scarf', 'cheese', 'gearkit'], skill: 'gardening' }),
  R({ id: 'skyisles', name: 'The Sky Isles', subtitle: 'Above the clouds, the Great Lantern', col: 2, row: 2, ground: '#f4f4ff', groundAlt: '#e6e8ff', road: '#dcd8ff', relief: 10, snowline: Infinity, walls: ['#f4f0ff', '#e0f0ff', '#fff4e0'], roofs: ['#b8a4ff', '#8fd3ff', '#ffd6f0'], trims: ['#ffe9a8'], glow: '#fff0b0', flora: ['cloud', 'crystal', 'cloud', 'candy', 'glowtree'], flowers: ['#ffffff', '#ffe9a8', '#b8a4ff'], houses: 34, ambient: 'sparkles', fauna: ['lightbird', 'unicorn', 'starcat', 'cloudsheep', 'crystalstag'], materials: ['cloud', 'stardust'], wanted: ['starlamp', 'verse', 'saffronrice'], skill: 'lampcraft' }),
  R({ id: 'islamic', name: 'Madinat an-Nur', subtitle: 'Courtyards of tile and water', col: 3, row: 2, ground: '#a9c07a', groundAlt: '#c2c98a', road: '#e2d2b0', relief: 18, snowline: Infinity, walls: ['#fbf7ee', '#f2e6cc', '#e8dcc0'], roofs: ['#2f6f9a', '#3a8aa5', '#1f5a7a'], trims: ['#2f6f9a', '#d4af37', '#3a9a7a'], glow: '#ffd27a', flora: ['palm', 'orange', 'cypress', 'orange', 'jacaranda'], flowers: ['#ffffff', '#ff9a1f', '#d1495b'], houses: 120, ambient: 'none', fauna: ['cat', 'dove', 'horse', 'parakeet', 'simurgh'], materials: ['clay', 'blossom', 'wood'], wanted: ['shawl', 'toyboat', 'clockwork'], skill: 'calligraphy' }),
  R({ id: 'middleeast', name: 'Souq al-Qamar', subtitle: 'Wind towers and lantern-lit lanes', col: 4, row: 2, ground: '#d9bf8a', groundAlt: '#e6cf9a', road: '#c9ae7a', relief: 16, snowline: Infinity, walls: ['#d9b98a', '#c9a473', '#e8d2a8'], roofs: ['#b89468', '#a8845a'], trims: ['#6b4a2a', '#2f6f9a'], glow: '#ffb84a', flora: ['palm', 'palm', 'olive', 'dragonblood'], flowers: ['#ff6b6b', '#ffffff'], houses: 120, ambient: 'sand', fauna: ['camel', 'saluki', 'fennec', 'oryx', 'cat', 'horse'], materials: ['dates', 'incense', 'sand'], wanted: ['cheese', 'rug', 'lantern'], skill: 'lampcraft' }),
  // Row 3 — the south
  R({ id: 'indiasouth', name: 'Kaveri Coast', subtitle: 'Temple towers and backwaters', col: 0, row: 3, ground: '#5fae4a', groundAlt: '#72c05a', road: '#c08a5a', relief: 30, snowline: Infinity, walls: ['#f2e6cc', '#e8a86a', '#d9d0b8'], roofs: ['#b5552e', '#8a3a2a'], trims: ['#e2b43a', '#2f7a5a', '#c23b2a'], glow: '#ffb84a', flora: ['coconut', 'banana', 'coconut', 'palm', 'flame', 'jacaranda'], flowers: ['#ffffff', '#f2a13a', '#ff6b8b'], houses: 110, ambient: 'fireflies', fauna: ['elephant', 'peacock', 'cow', 'parakeet', 'langur', 'lotusswan'], materials: ['coconut', 'jasmine', 'rice'], wanted: ['cheese', 'scarf', 'clockwork'], skill: 'cooking' }),
  R({ id: 'indianorth', name: 'Gulabi Nagar', subtitle: 'The pink city of windows', col: 1, row: 3, ground: '#c9b07a', groundAlt: '#d4a888', road: '#d9a07a', relief: 34, snowline: Infinity, walls: ['#e8917a', '#f2b08a', '#e8c48a', '#d97a6a'], roofs: ['#e8c48a', '#f2e6cc'], trims: ['#ffffff', '#e2b43a'], glow: '#ffb84a', flora: ['oak', 'palm', 'olive', 'flame', 'flame'], flowers: ['#f2a13a', '#ff6b3a', '#f2d14e'], houses: 130, ambient: 'none', fauna: ['elephant', 'peacock', 'camel', 'parakeet', 'macaque', 'kankrej'], materials: ['marigold', 'spice', 'clay'], wanted: ['cheese', 'toyboat', 'minttea'], skill: 'pottery' }),
  R({ id: 'mughal', name: 'Bagh-e-Noor', subtitle: 'Marble domes in a four-fold garden', col: 2, row: 3, ground: '#8fbf6a', groundAlt: '#7aae5a', road: '#c9a07a', relief: 14, snowline: Infinity, walls: ['#b5552e', '#fbf7ee', '#a84a2a'], roofs: ['#fbf7ee', '#f2eee4'], trims: ['#fbf7ee', '#2f7a5a', '#d4af37'], glow: '#ffe0a0', flora: ['cypress', 'cypress', 'orange', 'jacaranda', 'flame'], flowers: ['#d1495b', '#ff8fb8', '#ffffff'], houses: 110, ambient: 'petals', fauna: ['peacock', 'horse', 'dove', 'nilgai', 'parakeet', 'simurgh'], materials: ['rose', 'saffron', 'marble'], wanted: ['gearkit', 'cheese', 'scarf'], skill: 'gardening' }),
  R({ id: 'egypt', name: 'Nile Crossing', subtitle: 'Pyramids at the edge of the green', col: 3, row: 3, ground: '#e0c890', groundAlt: '#d4b77a', road: '#c9ae7a', relief: 14, snowline: Infinity, walls: ['#e0c48a', '#d4b070', '#eed8aa'], roofs: ['#d4b070'], trims: ['#2f6f9a', '#c23b2a'], glow: '#ffc06a', flora: ['palm', 'palm', 'banana', 'baobab'], flowers: ['#2f6f9a', '#ffffff'], houses: 110, ambient: 'sand', fauna: ['camel', 'mau', 'ibis', 'donkey', 'cat'], materials: ['papyrus', 'cotton', 'sand'], wanted: ['cheese', 'ricepudding', 'birdhouse'], skill: 'calligraphy' }),
  R({ id: 'desert', name: 'Tents of Rimal', subtitle: 'Dunes, fires and deep stars', col: 4, row: 3, ground: '#ecc98a', groundAlt: '#e0b877', road: '#d9b27a', relief: 30, snowline: Infinity, walls: ['#3a2a22', '#8c3b2a', '#e0c48a'], roofs: ['#2a2220', '#8c3b2a', '#f1d3a2'], trims: ['#d9a066', '#2f6f9a'], glow: '#ff9a3a', flora: ['palm', 'baobab', 'dragonblood'], flowers: ['#ff6b3a'], houses: 100, ambient: 'sand', fauna: ['camel', 'fennec', 'saluki', 'oryx', 'horse', 'deserthare'], materials: ['sand', 'camelwool', 'dates'], wanted: ['minttea', 'balm', 'pot'], skill: 'weaving' }),
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, RegionSpec>;

export function regionCenter(r: Pick<RegionSpec, 'col' | 'row'>): { x: number; z: number } {
  return { x: (r.col - HOME_COL) * REGION_SIZE, z: (r.row - HOME_ROW) * REGION_SIZE };
}

export function regionAtGrid(col: number, row: number): RegionSpec | undefined {
  return REGIONS.find((r) => r.col === col && r.row === row);
}

/** The land that contains a world point (clamped to the grid). */
export function regionAt(x: number, z: number): RegionSpec {
  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.round(x / REGION_SIZE) + HOME_COL));
  const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(z / REGION_SIZE) + HOME_ROW));
  return regionAtGrid(col, row)!;
}
