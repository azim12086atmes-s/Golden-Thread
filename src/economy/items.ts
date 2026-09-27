export type SkillId =
  | 'weaving' | 'carpentry' | 'cooking' | 'pottery'
  | 'calligraphy' | 'gardening' | 'mechanics' | 'lampcraft'
  // Service skills (owner's brief — NEXT_WORK C4): grown by doing the work (economy/services.ts).
  | 'software' | 'hardware' | 'teaching' | 'medicine' | 'building' | 'logistics' | 'research';

export const SKILLS: Record<SkillId, { name: string; icon: string; blurb: string }> = {
  weaving:     { name: 'Weaving',     icon: '🧶', blurb: 'Scarves, rugs and shawls from wool and silk.' },
  carpentry:   { name: 'Carpentry',   icon: '🪚', blurb: 'Stools, toys and frames from wood.' },
  cooking:     { name: 'Cooking',     icon: '🍲', blurb: 'Food that turns strangers into friends.' },
  pottery:     { name: 'Pottery',     icon: '🏺', blurb: 'Pots, jugs and vases from clay.' },
  calligraphy: { name: 'Calligraphy', icon: '🖋️', blurb: 'Letters and verses written beautifully.' },
  gardening:   { name: 'Gardening',   icon: '🌱', blurb: 'Seeds, herbs and growing things.' },
  mechanics:   { name: 'Mechanics',   icon: '⚙️', blurb: 'Fixing engines, clocks and pumps.' },
  lampcraft:   { name: 'Lampcraft',   icon: '🏮', blurb: 'Lanterns and lamps that hold light.' },
  software:    { name: 'Software',    icon: '💻', blurb: 'Programs, apps and websites for people and shops.' },
  hardware:    { name: 'Hardware',    icon: '🔌', blurb: 'Building and repairing radios, lamps, pumps and machines.' },
  teaching:    { name: 'Teaching',    icon: '🧑‍🏫', blurb: 'Helping others learn what you know.' },
  medicine:    { name: 'Medicine',    icon: '🩺', blurb: 'Caring for the sick, with each land\'s own healing.' },
  building:    { name: 'Building',    icon: '🧱', blurb: 'Raising and mending homes, walls and roofs.' },
  logistics:   { name: 'Logistics',   icon: '📦', blurb: 'Getting goods where they are needed, on time.' },
  research:    { name: 'Research',    icon: '🔬', blurb: 'Asking good questions and finding out.' },
};

/** XP needed to reach each level. Level 0 is "never tried". */
export const LEVEL_XP = [0, 20, 60, 140, 280, 500, 800];
export function skillLevel(xp: number): number {
  let lvl = 0;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lvl = i;
  return lvl;
}

export type ItemKind = 'material' | 'good' | 'food' | 'seed' | 'crop' | 'decor';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  kind: ItemKind;
  /** Base market value in coins. */
  value: number;
  /** The land this comes from; goods sell for more far from home. */
  origin?: string;
}

const I = (id: string, name: string, icon: string, kind: ItemKind, value: number, origin?: string): ItemDef =>
  ({ id, name, icon, kind, value, origin });

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  [
    // Materials — gathered in the lands
    I('wood', 'Wood', '🪵', 'material', 2),
    I('wildflower', 'Wildflowers', '🌼', 'material', 2, 'meadow'),
    I('wool', 'Wool', '🐑', 'material', 3, 'meadow'),
    I('cedar', 'Cedar Wood', '🌲', 'material', 4, 'japan'),
    I('tea', 'Tea Leaves', '🍃', 'material', 3, 'japan'),
    I('hanji', 'Mulberry Paper', '📜', 'material', 4, 'korea'),
    I('ginseng', 'Ginseng', '🌿', 'material', 6, 'korea'),
    I('silk', 'Silk Cocoon', '🐛', 'material', 6, 'china'),
    I('bamboo', 'Bamboo', '🎋', 'material', 3, 'china'),
    I('birch', 'Birch Bark', '🌳', 'material', 3, 'norway'),
    I('fleece', 'Fjord Fleece', '🧶', 'material', 5, 'norway'),
    I('edelweiss', 'Edelweiss', '🤍', 'material', 6, 'switzerland'),
    I('milk', 'Alpine Milk', '🥛', 'material', 3, 'switzerland'),
    I('gear', 'Brass Gear', '⚙️', 'material', 5, 'london'),
    I('scrap', 'Scrap Metal', '🔩', 'material', 3, 'newyork'),
    I('paint', 'Paint', '🎨', 'material', 4, 'newyork'),
    I('marble', 'Marble Chips', '🪨', 'material', 5, 'renaissance'),
    I('olive', 'Olives', '🫒', 'material', 3, 'renaissance'),
    I('spool', 'Thread Spool', '🧵', 'material', 4, 'vintage'),
    I('clay', 'Clay', '🟤', 'material', 2, 'islamic'),
    I('blossom', 'Orange Blossom', '🌸', 'material', 4, 'islamic'),
    I('dates', 'Dates', '🌴', 'material', 3, 'middleeast'),
    I('incense', 'Frankincense', '🪔', 'material', 7, 'middleeast'),
    I('sand', 'Glass Sand', '⏳', 'material', 2, 'desert'),
    I('camelwool', 'Camel Wool', '🐪', 'material', 5, 'desert'),
    I('papyrus', 'Papyrus', '📃', 'material', 4, 'egypt'),
    I('cotton', 'Cotton', '☁️', 'material', 3, 'egypt'),
    I('marigold', 'Marigold', '🏵️', 'material', 3, 'indianorth'),
    I('spice', 'Spices', '🌶️', 'material', 5, 'indianorth'),
    I('coconut', 'Coconut', '🥥', 'material', 3, 'indiasouth'),
    I('jasmine', 'Jasmine', '💮', 'material', 4, 'indiasouth'),
    I('rose', 'Rose Petals', '🌹', 'material', 5, 'mughal'),
    I('saffron', 'Saffron', '🧡', 'material', 9, 'mughal'),
    I('rice', 'Rice', '🌾', 'material', 2, 'indonesia'),
    I('rattan', 'Rattan', '🧺', 'material', 3, 'indonesia'),
    I('ice', 'Ice Crystal', '❄️', 'material', 6, 'aurora'),
    I('pinecone', 'Pine Cone', '🌰', 'material', 2, 'aurora'),
    I('cloud', 'Cloud Wisp', '🌫️', 'material', 10, 'skyisles'),
    I('stardust', 'Star Dust', '✨', 'material', 12, 'skyisles'),
    I('cavecrystal', 'Cave Crystal', '💎', 'material', 9),
    // Goods — crafted
    I('scarf', 'Woven Scarf', '🧣', 'good', 14),
    I('rug', 'Little Rug', '🟥', 'good', 24),
    I('shawl', 'Silk Shawl', '🎀', 'good', 40),
    I('stool', 'Wooden Stool', '🪑', 'good', 12),
    I('toyboat', 'Toy Boat', '⛵', 'good', 16),
    I('birdhouse', 'Birdhouse', '🏠', 'good', 18),
    I('pot', 'Clay Pot', '🏺', 'good', 10),
    I('vase', 'Painted Vase', '⚱️', 'good', 26),
    I('letter', 'Written Letter', '✉️', 'good', 8),
    I('verse', 'Framed Verse', '🖼️', 'good', 30),
    I('balm', 'Herbal Balm', '🧴', 'good', 16),
    I('gearkit', 'Repair Kit', '🧰', 'good', 20),
    I('clockwork', 'Clockwork Bird', '🐦', 'good', 45),
    I('lantern', 'Glass Lantern', '🏮', 'good', 22),
    I('starlamp', 'Star Lamp', '🌟', 'good', 70),
    I('fan', 'Silk Fan', '🪭', 'good', 16),
    I('sign', 'Painted Sign', '🪧', 'good', 14),
    I('mosaic', 'Marble Mosaic', '🔷', 'good', 20),
    I('ribbon', 'Ribbon Bow', '🎀', 'good', 9),
    I('caltile', 'Calligraphy Tile', '🟦', 'good', 14),
    I('blanket', 'Camel-Wool Blanket', '🟫', 'good', 22),
    I('scroll', 'Papyrus Scroll', '📜', 'good', 12),
    I('attar', 'Rose Attar', '🧪', 'good', 24),
    I('icelantern', 'Ice Lantern', '🧊', 'good', 20),
    I('garland', 'Marigold Garland', '🏵️', 'good', 10),
    I('incenseburner', 'Incense Burner', '🕯️', 'good', 34),
    // Food
    I('minttea', 'Warm Tea', '🍵', 'food', 6),
    I('datecake', 'Date Cake', '🍰', 'food', 12),
    I('ricepudding', 'Rice Pudding', '🍮', 'food', 10),
    I('curry', 'Spiced Stew', '🍛', 'food', 16),
    I('coconutsweet', 'Coconut Sweets', '🍬', 'food', 10),
    I('cheese', 'Alpine Cheese', '🧀', 'food', 12),
    I('bread', 'Olive Bread', '🍞', 'food', 9),
    I('saffronrice', 'Saffron Rice', '🍚', 'food', 28),
    // Seeds & crops (farming)
    I('seed_flower', 'Flower Seeds', '🌱', 'seed', 3),
    I('seed_herb', 'Herb Seeds', '🌱', 'seed', 4),
    I('seed_rice', 'Rice Seedlings', '🌱', 'seed', 3),
    I('herbs', 'Fresh Herbs', '🌿', 'crop', 5),
    I('feed', 'Animal Feed', '🌾', 'food', 2),
    I('seed_wheat', 'Wheat Seed', '🌱', 'seed', 3),
    I('seed_tomato', 'Tomato Seedlings', '🌱', 'seed', 4),
    I('seed_carrot', 'Carrot Seed', '🌱', 'seed', 3),
    I('seed_pumpkin', 'Pumpkin Seed', '🌱', 'seed', 5),
    I('seed_strawberry', 'Strawberry Runners', '🌱', 'seed', 6),
    I('seed_chilli', 'Chilli Seed', '🌱', 'seed', 4),
    I('seed_sunflower', 'Sunflower Seed', '🌱', 'seed', 3),
    I('seed_cotton', 'Cotton Seed', '🌱', 'seed', 4),
    I('seed_tea', 'Tea Cuttings', '🌱', 'seed', 6),
    I('wheat', 'Wheat', '🌾', 'crop', 3),
    I('tomato', 'Tomatoes', '🍅', 'crop', 4),
    I('carrot', 'Carrots', '🥕', 'crop', 3),
    I('pumpkin', 'Pumpkin', '🎃', 'crop', 9),
    I('strawberry', 'Strawberries', '🍓', 'crop', 6),
    I('chilli', 'Chillies', '🌶️', 'crop', 5),
    I('sunflower', 'Sunflowers', '🌻', 'crop', 4),
    // Dishes from the farm.
    I('roti', 'Fresh Roti', '🫓', 'food', 10),
    I('tomatosoup', 'Tomato Soup', '🥣', 'food', 14),
    I('pumpkinpie', 'Pumpkin Pie', '🥧', 'food', 26),
    I('jam', 'Strawberry Jam', '🍯', 'food', 18),
    I('pickle', 'Chilli Pickle', '🫙', 'food', 16),
    I('halwa', 'Carrot Halwa', '🍮', 'food', 20),
    I('bouquet', 'Sunflower Bouquet', '💐', 'good', 14),
  ].map((d) => [d.id, d]),
);

export interface Recipe {
  id: string;
  out: string;
  qty: number;
  skill: SkillId;
  level: number;
  needs: Record<string, number>;
  xp: number;
}

const R = (out: string, skill: SkillId, level: number, needs: Record<string, number>, xp: number, qty = 1): Recipe =>
  ({ id: out, out, qty, skill, level, needs, xp });

export const RECIPES: Recipe[] = [
  R('scarf', 'weaving', 0, { wool: 2 }, 10),
  R('rug', 'weaving', 1, { wool: 3, wildflower: 1 }, 16),
  R('shawl', 'weaving', 2, { silk: 3, spool: 1 }, 28),
  R('stool', 'carpentry', 0, { wood: 3 }, 10),
  R('toyboat', 'carpentry', 1, { cedar: 2, paint: 1 }, 16),
  R('birdhouse', 'carpentry', 1, { wood: 2, birch: 1 }, 14),
  R('pot', 'pottery', 0, { clay: 3 }, 10),
  R('vase', 'pottery', 2, { clay: 3, paint: 1 }, 22),
  R('letter', 'calligraphy', 0, { hanji: 1 }, 8),
  R('verse', 'calligraphy', 2, { papyrus: 2, wood: 1 }, 24),
  R('seed_flower', 'gardening', 0, { wildflower: 2 }, 6, 2),
  R('seed_herb', 'gardening', 1, { ginseng: 1 }, 10, 3),
  R('seed_rice', 'gardening', 0, { rice: 2 }, 6, 2),
  R('feed', 'gardening', 0, { rice: 1 }, 4, 3),
  R('balm', 'gardening', 1, { herbs: 2, olive: 1 }, 14),
  R('gearkit', 'mechanics', 0, { gear: 2, wood: 1 }, 12),
  R('clockwork', 'mechanics', 3, { gear: 3, scrap: 1, paint: 1 }, 36),
  R('lantern', 'lampcraft', 0, { sand: 3 }, 12),
  R('incenseburner', 'lampcraft', 1, { clay: 2, incense: 1 }, 20),
  R('starlamp', 'lampcraft', 3, { lantern: 1, stardust: 2 }, 50),
  R('icelantern', 'lampcraft', 0, { ice: 2, pinecone: 1 }, 12),
  R('fan', 'weaving', 0, { silk: 1, bamboo: 1 }, 10),
  R('ribbon', 'weaving', 0, { spool: 2 }, 8),
  R('blanket', 'weaving', 0, { camelwool: 2 }, 12),
  R('sign', 'carpentry', 0, { wood: 1, paint: 2 }, 10),
  R('mosaic', 'pottery', 0, { marble: 3 }, 12),
  R('caltile', 'calligraphy', 0, { clay: 2 }, 10),
  R('scroll', 'calligraphy', 0, { papyrus: 1 }, 8),
  R('attar', 'gardening', 0, { rose: 2 }, 12),
  R('garland', 'gardening', 0, { marigold: 3 }, 8),
  R('minttea', 'cooking', 0, { tea: 2 }, 6),
  R('datecake', 'cooking', 0, { dates: 2, milk: 1 }, 10),
  R('ricepudding', 'cooking', 1, { rice: 2, milk: 1 }, 12),
  R('curry', 'cooking', 1, { spice: 1, coconut: 1, rice: 1 }, 16),
  R('coconutsweet', 'cooking', 0, { coconut: 2 }, 8),
  R('cheese', 'cooking', 1, { milk: 3 }, 12),
  R('bread', 'cooking', 0, { olive: 2, wood: 1 }, 8),
  R('saffronrice', 'cooking', 3, { saffron: 1, rice: 2, rose: 1 }, 30),
  // From the farm to the table (and the market).
  R('roti', 'cooking', 0, { wheat: 2 }, 8, 2),
  R('tomatosoup', 'cooking', 0, { tomato: 2, herbs: 1 }, 10),
  R('pumpkinpie', 'cooking', 2, { pumpkin: 1, wheat: 2, milk: 1 }, 22),
  R('jam', 'cooking', 1, { strawberry: 3 }, 14),
  R('pickle', 'cooking', 1, { chilli: 3, spice: 1 }, 14),
  R('halwa', 'cooking', 1, { carrot: 3, milk: 1 }, 16),
  R('bouquet', 'gardening', 0, { sunflower: 3 }, 8),
  R('seed_wheat', 'gardening', 0, { wheat: 2 }, 4, 3),
];
