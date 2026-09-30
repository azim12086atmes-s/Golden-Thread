import type { SkillId } from '../economy/items';

/** Everything that persists. Plain JSON — no class instances, no three.js objects. */
export interface QuestProgress {
  status: 'active' | 'done';
  step: number;
  /** Counter for the current step (e.g. items gathered since the step began). */
  count: number;
}

export interface FriendState {
  hearts: number; // 0..5
  befriended: boolean;
  lastMessageAt: number; // game-minutes
}

export interface Message {
  id: string;
  npcId: string;
  from: 'them' | 'us';
  text: string;
  at: number; // game-minutes
  /** A request the player can accept; completing it rewards friendship. */
  request?: { item: string; qty: number; reward: number; done?: boolean };
  read?: boolean;
}

export interface PlacedDecor {
  id: string;
  kind: string; // decor catalogue id
  x: number; // local to the plot
  z: number;
  rot: number;
  /** For farm beds: what is planted and when. */
  crop?: { seed: string; plantedAt: number; watered?: boolean };
  /** For a house: the design it was built from (housing/designs.ts) and how far it is improved (1–4). */
  design?: string;
  level?: number;
}

export interface AnimalState {
  species: string;
  name: string;
  befriended: boolean;
  plotId?: string;
  happiness: number; // 0..100
  lastFedAt: number;
}

export type VanSlot = 'rug' | 'curtains' | 'quilt' | 'lights' | 'plant' | 'art' | 'lamp' | 'cushions';

export interface GameState {
  version: 1;
  names: { girl: string; boy: string };
  /** Game clock in minutes since the journey began. 1440 per day. */
  minutes: number;
  coins: number;
  /** The thread's shared light, grown by kindness. Drives flight height and thread glow. */
  light: number;
  player: { x: number; y: number; z: number; heading: number };
  outfits: { girl: string; boy: string };
  inventory: Record<string, number>;
  skills: Record<SkillId, number>;
  quests: Record<string, QuestProgress>;
  friends: Record<string, FriendState>;
  messages: Message[];
  animals: Record<string, AnimalState>;
  plots: Record<string, { decor: PlacedDecor[] }>;
  van: Record<VanSlot, string>;
  /** How each home you own is furnished inside (by plot id), slot by slot like the van. */
  homes: Record<string, Record<VanSlot, string>>;
  /** People in need you have met in their towns (charity/charity.ts `meet`) — the people finder lists them. */
  met: string[];
  /** People you sponsor (charity/charity.ts): their paid days, wellbeing and the home they live in. */
  /** People you sponsor. `contactAt`: when you were last in touch (charity/upskill.ts). */
  sponsored: Array<{ id: string; since: number; paidUntil: number; wellbeing: number; home?: string; at: number; contactAt?: number }>;
  /** Floors added to homes you own (by plot id), and a floor under construction. */
  homeFloors: Record<string, { floors: number; buildingUntil?: number }>;
  /** Penthouses you own on New Yonder's towers, by the tower's door id (housing/penthouses.ts). */
  penthouses: string[];
  /** Institutes you founded (institutions/institutions.ts): site, kind, the stage reached, a stage being built, who runs it. */
  institutes: Array<{ site: string; kind: string & import('../institutions/catalogue').InstituteKind; stage: number; buildingUntil?: number; at: number;
    staff?: { who: 'you' } | { who: 'learner'; id: string } | { who: 'hire'; id: string } | { who: 'freelance'; id: string } }>;
  /** What the people you sponsor have learned (skill xp), by person. */
  learners: Record<string, Partial<Record<SkillId, number>>>;
  /** Experts you employ and until when their wages are paid. */
  hires: Array<{ id: string; since: number; paidUntil: number; home?: string }>;
  /** What you have stocked in your kitchens and clinics (site id → item → count). */
  pantry: Record<string, Record<string, number>>;
  /** Meals your kitchens have served and people your clinics have treated. */
  served: { meals: number; treated: number };
  /** Farmland you own (economy/fields.ts): the crop in the ground, the barn's store, and who tends it. */
  fields: Record<string, { crop?: { seed: string; plantedAt: number; watered?: boolean }; store: Record<string, number>; hand?: { who: 'learner'; id: string } | { who: 'hire'; id: string }; at: number }>;
  /** Standing deliveries (economy/supply.ts): a courier carries from a field's barn to a market or a pantry. */
  routes: Array<{ id: string; courier: string; from: string; to: string }>;
  /** Loads on the road and when they arrive. */
  shipments: Array<{ route: string; courier: string; from: string; to: string; items: Record<string, number>; left: number; arrive: number }>;
  /** How much of each good your couriers sold into each land lately (land → item → units, when) — markets fill up. */
  glut: Record<string, Record<string, { n: number; at: number }>>;
  /** Service work (economy/services.ts): the day of each job's last shift, shifts worked, freelance gigs done. */
  work: { shifts: Record<string, number>; worked: Record<string, number>; done: string[] };
  /** Who you taught today (person:skill → day), one lesson a day each. */
  taught: Record<string, number>;
  /** The thesis you are writing under a professor (institutions/research.ts). */
  thesis: { topic: string; site: string; progress: number; day: number } | null;
  /** Theses completed (topic ids) and the inventions they produced. */
  degrees: string[];
  inventions: string[];
  /** Products you have made from your inventions and not yet sold (invention → count; economy/manufacture.ts). */
  products: Record<string, number>;
  /** Businesses you run (economy/business.ts). */
  businesses: import('../economy/business').Business[];
  /** Inventions put to use (economy/inventions.ts): carried ('you'), or built at a home or field; `day` of their last daily good. */
  installed: Array<{ invention: string; at: string; day: number }>;
  /** Stores beyond the bag (economy/storage.ts): 'van', and each home you own by plot id. */
  stores: Record<string, Record<string, number>>;
  /** Townsfolk waiting for something you said you would bring (npc/folk.ts): where they wait, and until when. */
  errands: Array<{ key: string; land: string; name: string; item: string; qty: number; coins: number; done: string; x: number; z: number; until: number }>;
  vehicles: string[];
  discovered: string[];
  lanterns: string[];
  /** Resource node id → game-minute it was last gathered. */
  gathered: Record<string, number>;
  unlockedDecor: string[];
  flags: string[];
  /** Quest the guide follows; '' lets the guide choose (main story first). */
  tracked: string;
  /** Children and pets travelling with the caravan (ids from caravan.ts). */
  caravan: string[];
  /** What the brothers, sisters and children wear, chosen in the dressing room (caravan/dress.ts). */
  companionOutfits: Record<string, string>;
  /** Grandmother Sarvatara's guided tour: put away entirely, and letters put aside for later (guide/tour.ts). */
  tour: { off: boolean; later: string[] };
  /** The homes given to her parents and to his (plot ids of homes they own; housing/parents.ts), and when they last visited. */
  parents: { hers?: string; his?: string; visited?: Record<string, number> };
  /** Certificates from institute courses: `${who}:${skill}` → the certified level (institutions/certificates.ts). */
  certificates: Record<string, import('../institutions/certificates').Certificate>;
  /** Children brought home to their destinations: child id → where and on which day. */
  homecomings: Record<string, { land: string; day: number }>;
  /** Real seconds played, for the journal. */
  playSeconds: number;
  /** Today's conversations in town: who asked for a hand and whom you helped. */
  folk: { day: number; asked: string[]; helped: string[] };
}

export function newGame(): GameState {
  return {
    version: 1,
    names: { girl: 'Syeda Fathima', boy: 'Mohammed Abdul Azim' },
    minutes: 8 * 60, // morning of day one
    coins: 40,
    light: 1,
    player: { x: 6, y: 0, z: 34, heading: Math.PI }, // by the Great Oak, facing Sarvatara
    outfits: { girl: 'g-kurti-jeans', boy: 'b-kurta-jeans' },
    inventory: { wood: 2, wool: 1, tea: 2 },
    skills: {
      weaving: 0, carpentry: 0, cooking: 0, pottery: 0,
      calligraphy: 0, gardening: 0, mechanics: 0, lampcraft: 0,
      software: 0, hardware: 0, teaching: 0, medicine: 0, building: 0, logistics: 0, research: 0,
    },
    quests: {},
    friends: {},
    messages: [],
    animals: {},
    plots: {},
    van: { rug: 'plain', curtains: 'plain', quilt: 'plain', lights: 'none', plant: 'none', art: 'none', lamp: 'none', cushions: 'plain' },
    homes: {},
    met: [],
    sponsored: [],
    homeFloors: {},
    penthouses: [],
    institutes: [],
    learners: {},
    hires: [],
    pantry: {},
    served: { meals: 0, treated: 0 },
    fields: {},
    routes: [],
    shipments: [],
    glut: {},
    work: { shifts: {}, worked: {}, done: [] },
    taught: {},
    thesis: null,
    degrees: [],
    inventions: [],
    products: {},
    businesses: [],
    installed: [],
    stores: {},
    errands: [],
    vehicles: ['walk', 'fly', 'van'],
    discovered: ['meadow'],
    lanterns: [],
    gathered: {},
    unlockedDecor: ['fence', 'bench', 'flowerbed', 'farmbed', 'lamp-post', 'tree', 'tent', 'cottage', 'pen'],
    flags: [],
    tracked: '',
    caravan: ['sib-aasima', 'sib-suvaibia', 'sib-maryam', 'sib-abdurrahim', 'pet-sheepdog', 'pet-clover'],
    companionOutfits: {},
    tour: { off: false, later: [] },
    parents: {},
    homecomings: {},
    certificates: {},
    playSeconds: 0,
    folk: { day: 0, asked: [], helped: [] },
  };
}

export const DAY_MINUTES = 1440;
export const dayOf = (m: number) => Math.floor(m / DAY_MINUTES) + 1;
export const hourOf = (m: number) => (m % DAY_MINUTES) / 60;
