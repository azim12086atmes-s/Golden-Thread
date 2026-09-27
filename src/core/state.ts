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
    player: { x: 6, y: 0, z: 34, heading: Math.PI }, // by the Great Oak, facing Noor
    outfits: { girl: 'g-kurti-jeans', boy: 'b-kurta-jeans' },
    inventory: { wood: 2, wool: 1, tea: 2 },
    skills: {
      weaving: 0, carpentry: 0, cooking: 0, pottery: 0,
      calligraphy: 0, gardening: 0, mechanics: 0, lampcraft: 0,
    },
    quests: {},
    friends: {},
    messages: [],
    animals: {},
    plots: {},
    van: { rug: 'plain', curtains: 'plain', quilt: 'plain', lights: 'none', plant: 'none', art: 'none', lamp: 'none', cushions: 'plain' },
    homes: {},
    vehicles: ['walk', 'fly', 'van'],
    discovered: ['meadow'],
    lanterns: [],
    gathered: {},
    unlockedDecor: ['fence', 'bench', 'flowerbed', 'farmbed', 'lamp-post', 'tree', 'tent', 'cottage', 'pen'],
    flags: [],
    tracked: '',
    caravan: ['child-rosie', 'child-teo', 'pet-sheepdog', 'pet-clover'],
    playSeconds: 0,
    folk: { day: 0, asked: [], helped: [] },
  };
}

export const DAY_MINUTES = 1440;
export const dayOf = (m: number) => Math.floor(m / DAY_MINUTES) + 1;
export const hourOf = (m: number) => (m % DAY_MINUTES) / 60;
