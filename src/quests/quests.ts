import type { SpeciesId } from '../animals/AnimalModel';
import type { VehicleId } from '../vehicles/vehicles';
import { REGIONS, type RegionId } from '../world/regions';
import { keeperOf } from '../npc/people';

export type Step =
  | { kind: 'talk'; npc: string; text: string; gives?: Record<string, number> }
  | { kind: 'gather'; item: string; qty: number; text: string }
  | { kind: 'craft'; item: string; qty: number; text: string }
  | { kind: 'deliver'; item: string; qty: number; npc: string; text: string }
  | { kind: 'visit'; region: RegionId; text: string }
  | { kind: 'befriend'; species: SpeciesId; text: string }
  | { kind: 'lantern'; region: RegionId; text: string };

export interface Reward {
  coins?: number;
  light?: number;
  items?: Record<string, number>;
  hearts?: Record<string, number>;
  flag?: string;
  decor?: string[];
  vehicle?: VehicleId;
}

export interface QuestDef {
  id: string;
  title: string;
  region: RegionId;
  giver: string;
  main?: boolean;
  intro: string;
  outro: string;
  steps: Step[];
  reward: Reward;
  /** Quest ids that must be done first. */
  after?: string[];
  /** Lanterns that must be lit first. */
  lanternsNeeded?: number;
}

/**
 * Main story: one chapter per land. Meet the Keeper → make what they need with the skill they
 * teach and the land's own materials → light the lantern. `tests/quests.test.ts` proves every
 * chapter is completable from what that land provides.
 */
const CHAPTERS: Array<[RegionId, string, string, number, string, string]> = [
  // region, title, item, qty, ask, outro
  ['meadow', 'Two Wanderers', 'scarf', 1, 'Gather wool and weave a scarf — the first thing you make should be for someone else.', 'Grandmother Sarvatara wraps the scarf around her shoulders and smiles. "Now go, Shumaela, my dear. The Great Oak remembers the light."'],
  ['japan', 'Tea for the Lantern', 'minttea', 2, 'Pick tea leaves on the hillsides and brew two warm cups for the tea house.', 'Haruka pours the tea for two strangers who sit together and begin to talk.'],
  ['korea', 'Letters Home', 'letter', 2, 'Make paper from mulberry and write two letters for villagers who have stopped writing.', 'Two neighbours read their letters and laugh at the same memory.'],
  ['china', 'The Silk Fan', 'fan', 1, 'Gather silk and bamboo and make a fan, as Master Lin\'s mother once did.', 'Master Lin opens the fan and is quiet for a long time. Then he laughs.'],
  ['norway', 'A Home for Birds', 'birdhouse', 1, 'Gather birch bark and build a birdhouse for the old harbour.', 'Before you have even left, a little bird moves in.'],
  ['switzerland', 'Cheese for the Valley', 'cheese', 1, 'Collect alpine milk and make a wheel of cheese to share with the valley.', 'Anneli cuts the cheese into forty pieces. Everyone gets one.'],
  ['london', 'Mending Time', 'gearkit', 1, 'Collect brass gears and make a repair kit for the great clock.', 'The great clock chimes — on time, for the first time in years. People look up.'],
  ['newyork', 'Come In, We\'re Open', 'sign', 1, 'Gather paint and wood and make the diner a sign that means it.', 'Strangers start sharing tables. Rosa has to add more chairs.'],
  ['renaissance', 'The Missing Tiles', 'mosaic', 1, 'Gather marble chips and set a mosaic for the cathedral floor.', 'Lorenzo sets your mosaic in the very centre, where the light falls.'],
  ['vintage', 'Ribbons for the Carousel', 'ribbon', 2, 'Find thread spools and tie ribbon bows for the carousel horses.', 'The carousel turns, ribbons fluttering, and the music box finds its tune.'],
  ['islamic', 'Words of Light', 'caltile', 2, 'Gather clay and write two calligraphy tiles for the courtyard fountain.', 'Ustadha Maryam sets the tiles where the water will read them all day.'],
  ['middleeast', 'Lamps of the Souq', 'lantern', 1, 'Gather glass sand and make a lantern for the dark market lanes.', 'Abu Salim hangs your lantern at the souq gate. The lanes fill with people again.'],
  ['desert', 'Warmth for the Night', 'blanket', 1, 'Gather camel wool and weave a blanket for a family whose tent is cold.', 'That night a family sleeps warm, and the fire burns a little brighter.'],
  ['egypt', 'The River\'s Memory', 'scroll', 2, 'Gather papyrus and write two scrolls of the river\'s stories.', 'Amira reads the scrolls aloud at the water\'s edge. Children gather to listen.'],
  ['indianorth', 'Lamps for the Festival', 'pot', 1, 'Gather clay and shape a pot for the festival lamps.', 'Rani Didi fills your pot with oil and wick. The first lamp of the festival is yours.'],
  ['indiasouth', 'Sweets for the Temple Children', 'coconutsweet', 2, 'Gather coconuts and make sweets for the temple children.', 'Lakshmi Amma hands them out. Not one child leaves without two.'],
  ['mughal', 'Essence of the Garden', 'attar', 1, 'Gather rose petals and distil a rose attar for the garden\'s keeper.', 'Mirza Sahib touches a drop to the marble. The whole garden smells of roses.'],
  ['indonesia', 'Seedlings for the Terraces', 'seed_rice', 2, 'Gather rice and raise seedlings for the high terraces.', 'Ibu Sari plants your seedlings on the highest terrace, closest to the sky.'],
  ['aurora', 'A Lantern Made of Ice', 'icelantern', 1, 'Gather ice crystals and pine cones and make an ice lantern.', 'People come out of their huts to see it. Then they stay, and talk, under the aurora.'],
];

function chapter([region, title, item, qty, ask, outro]: (typeof CHAPTERS)[number]): QuestDef {
  const keeper = keeperOf(region);
  const r = REGIONS.find((x) => x.id === region)!;
  return {
    id: `main-${region}`,
    title,
    region,
    giver: keeper.id,
    main: true,
    intro: `${keeper.name}: "${keeper.lines[keeper.lines.length > 1 ? 1 : 0]}" — ${ask}`,
    outro,
    steps: [
      { kind: 'talk', npc: keeper.id, text: `Meet ${keeper.name}` },
      { kind: 'deliver', item, qty, npc: keeper.id, text: `Bring ${keeper.name} ${qty > 1 ? qty + '× ' : ''}{item}` },
      { kind: 'lantern', region, text: `Light the lantern at the heart of ${r.name}` },
    ],
    reward: { coins: 40, light: 1, hearts: { [keeper.id]: 2 } },
    after: region === 'meadow' ? [] : ['main-meadow'],
  };
}

export const QUESTS: QuestDef[] = [
  ...CHAPTERS.map(chapter),
  {
    id: 'main-skyisles', title: 'The Great Lantern', region: 'skyisles', giver: 'lamplighter', main: true,
    intro: 'The Lamplighter: "Bring me a star lamp, made from the light of every land."',
    outro: 'The Great Lantern wakes. Its light runs down every road you travelled, into every lantern you lit, and all at once the whole world is shining.',
    steps: [
      { kind: 'talk', npc: 'lamplighter', text: 'Climb the Sky Isles and meet the Lamplighter' },
      { kind: 'craft', item: 'starlamp', qty: 1, text: 'Craft a Star Lamp (lampcraft 3)' },
      { kind: 'deliver', item: 'starlamp', qty: 1, npc: 'lamplighter', text: 'Give the Star Lamp to the Lamplighter' },
      { kind: 'lantern', region: 'skyisles', text: 'Light the Great Lantern' },
    ],
    reward: { coins: 500, light: 3, flag: 'finale', decor: ['star-arch'] },
    lanternsNeeded: 8,
  },

  // ───────── Side quests: small kindnesses, and reasons to travel between lands ─────────
  { id: 'side-lamb', title: 'The Wandering Lamb', region: 'meadow', giver: 'yusuf', intro: 'Yusuf: "Could you make friends with one of my sheep? They trust travellers more than me."', outro: 'Yusuf laughs as the sheep follows you back to him.', steps: [{ kind: 'befriend', species: 'sheep', text: 'Befriend a sheep with wildflowers' }, { kind: 'talk', npc: 'yusuf', text: 'Tell Yusuf' }], reward: { coins: 15, hearts: { yusuf: 1 }, items: { feed: 3 } } },
  { id: 'side-olives', title: 'Olives for Lina', region: 'meadow', giver: 'lina', intro: 'Lina: "In the south-east, past the domes of Firenzia, olives grow. Bring me some?"', outro: 'Lina bakes olive bread and gives you the first loaf.', steps: [{ kind: 'deliver', item: 'olive', qty: 3, npc: 'lina', text: 'Bring Lina 3 olives from Firenzia' }], reward: { coins: 30, items: { bread: 2 }, hearts: { lina: 2 } } },
  { id: 'side-unicorns', title: 'Rainbow Friends', region: 'meadow', giver: 'noor', intro: 'Grandmother Sarvatara: "Two unicorns graze past the flower fields. They are shy. Bring wildflowers."', outro: 'The unicorns nuzzle the air beside you and will carry you both — one each.', steps: [{ kind: 'gather', item: 'wildflower', qty: 4, text: 'Gather 4 wildflowers' }, { kind: 'befriend', species: 'unicorn', text: 'Befriend a unicorn with wildflowers' }], reward: { flag: 'unicorns', vehicle: 'unicorn', light: 1 }, after: ['main-meadow'] },
  { id: 'side-kenji-letter', title: 'A Letter to Seoul', region: 'japan', giver: 'kenji', intro: 'Kenji: "My old teacher Seo-yeon lives in the Hanok Village. Would you carry my letter?"', outro: 'Seo-yeon reads it twice, then writes a reply right away.', steps: [{ kind: 'talk', npc: 'kenji', text: 'Take Kenji\'s letter', gives: { letter: 1 } }, { kind: 'deliver', item: 'letter', qty: 1, npc: 'seoyeon', text: 'Deliver it to Seo-yeon in the Hanok Village' }], reward: { coins: 25, hearts: { kenji: 2, seoyeon: 1 } } },
  { id: 'side-aiko', title: 'A Birdhouse for Aiko', region: 'japan', giver: 'aiko', intro: 'Aiko: "The cranes nest here, but the small birds have nowhere to go."', outro: 'Aiko hangs it in her pine. It fits perfectly.', steps: [{ kind: 'deliver', item: 'birdhouse', qty: 1, npc: 'aiko', text: 'Bring Aiko a birdhouse (carpentry)' }], reward: { coins: 30, hearts: { aiko: 2 }, decor: ['torii'] } },
  { id: 'side-minjun', title: 'Clay from the West', region: 'korea', giver: 'minjun', intro: 'Min-jun: "I have heard the clay of Madinat an-Nur is smooth as silk."', outro: 'Min-jun\'s next bowl is the finest he has made.', steps: [{ kind: 'deliver', item: 'clay', qty: 4, npc: 'minjun', text: 'Bring Min-jun 4 clay' }], reward: { coins: 30, hearts: { minjun: 2 } } },
  { id: 'side-mei', title: 'Tea Trade', region: 'china', giver: 'mei', intro: 'Mei: "Japanese tea leaves! I would trade silk for them."', outro: 'Mei trades generously.', steps: [{ kind: 'deliver', item: 'tea', qty: 3, npc: 'mei', text: 'Bring Mei 3 tea leaves' }], reward: { items: { silk: 3 }, hearts: { mei: 2 } } },
  { id: 'side-panda', title: 'The Shy Panda', region: 'china', giver: 'wei', intro: 'Wei: "One panda will not eat. Maybe fresh bamboo from a friend?"', outro: 'The panda eats and rolls down the hill in delight.', steps: [{ kind: 'befriend', species: 'panda', text: 'Befriend a panda with bamboo' }], reward: { coins: 20, hearts: { wei: 2 }, light: 1 } },
  { id: 'side-sigrid', title: 'Warm Hands', region: 'norway', giver: 'sigrid', intro: 'Sigrid: "The fishermen\'s hands are always cold. A scarf would help."', outro: 'Olav wears it every single day.', steps: [{ kind: 'deliver', item: 'scarf', qty: 2, npc: 'sigrid', text: 'Bring Sigrid 2 scarves' }], reward: { coins: 35, hearts: { sigrid: 1, olav: 1 } } },
  { id: 'side-matthias', title: 'Gears for the Mountain Clock', region: 'switzerland', giver: 'matthias', intro: 'Matthias: "London brass is the best brass. I need two gears."', outro: 'The tower clock is now only one minute wrong.', steps: [{ kind: 'deliver', item: 'gear', qty: 2, npc: 'matthias', text: 'Bring Matthias 2 brass gears from London' }], reward: { coins: 30, hearts: { matthias: 2 } } },
  { id: 'side-eleanor', title: 'Scrolls for the Library', region: 'london', giver: 'eleanor', intro: 'Eleanor: "Egyptian scrolls! Real ones! Oh, I would treasure them."', outro: 'Eleanor gives them a whole shelf.', steps: [{ kind: 'deliver', item: 'scroll', qty: 2, npc: 'eleanor', text: 'Bring Eleanor 2 papyrus scrolls' }], reward: { coins: 45, hearts: { eleanor: 2 } } },
  { id: 'side-marcus', title: 'The Old Truck', region: 'newyork', giver: 'marcus', intro: 'Marcus: "There\'s an old truck in my garage. Bring me a repair kit and she\'s yours."', outro: 'Marcus tunes the engine. "She\'s all yours."', steps: [{ kind: 'deliver', item: 'gearkit', qty: 1, npc: 'marcus', text: 'Bring Marcus a repair kit' }], reward: { vehicle: 'truck', hearts: { marcus: 2 } } },
  { id: 'side-giulia', title: 'Olive Harvest', region: 'renaissance', giver: 'giulia', intro: 'Giulia: "Help me pick olives? You can keep a basket."', outro: 'Giulia sends you off with oil-stained hands and a full basket.', steps: [{ kind: 'gather', item: 'olive', qty: 5, text: 'Pick 5 olives' }], reward: { items: { olive: 3, bread: 1 }, hearts: { giulia: 2 } } },
  { id: 'side-june', title: 'Flowers from Far Away', region: 'vintage', giver: 'june', intro: 'June: "I dream of jasmine. They say it grows on the Kaveri Coast."', outro: 'June\'s whole shop smells of jasmine.', steps: [{ kind: 'deliver', item: 'jasmine', qty: 3, npc: 'june', text: 'Bring June 3 jasmine' }], reward: { coins: 35, hearts: { june: 2 }, decor: ['flowerarch'] } },
  { id: 'side-zainab', title: 'Seeds for the Courtyard', region: 'islamic', giver: 'zainab', intro: 'Zainab: "Flower seeds for the new courtyard beds — do you know how to make them?"', outro: 'Next spring the courtyard is full of flowers.', steps: [{ kind: 'deliver', item: 'seed_flower', qty: 4, npc: 'zainab', text: 'Bring Zainab 4 flower seeds (gardening)' }], reward: { coins: 25, hearts: { zainab: 2 } } },
  { id: 'side-layla', title: 'Roses for Layla', region: 'middleeast', giver: 'layla', intro: 'Layla: "Rose petals from Bagh-e-Noor would make my finest attar."', outro: 'Layla names the new scent after your van.', steps: [{ kind: 'deliver', item: 'rose', qty: 3, npc: 'layla', text: 'Bring Layla 3 rose petals' }], reward: { coins: 40, hearts: { layla: 2 } } },
  { id: 'side-sami', title: 'Thirteen Stars', region: 'desert', giver: 'sami', intro: 'Sami: "They say star dust falls on the Sky Isles. Could you bring me some? Just one!"', outro: 'Sami keeps it in a jar and names it Thirteen.', steps: [{ kind: 'deliver', item: 'stardust', qty: 1, npc: 'sami', text: 'Bring Sami 1 star dust' }], reward: { coins: 20, hearts: { sami: 3 }, light: 1 } },
  { id: 'side-nadia', title: 'Camel Friends', region: 'desert', giver: 'nadia', intro: 'Nadia: "Our youngest camel is lonely. Be her friend?"', outro: 'The camel follows you around the camp all evening.', steps: [{ kind: 'befriend', species: 'camel', text: 'Befriend a camel with dates' }], reward: { items: { camelwool: 3 }, hearts: { nadia: 2 } } },
  { id: 'side-hassan', title: 'Sails for the Felucca', region: 'egypt', giver: 'hassan', intro: 'Hassan: "My sail is torn. Cotton, please — four bundles."', outro: 'The felucca catches the north wind at sunset.', steps: [{ kind: 'gather', item: 'cotton', qty: 4, text: 'Gather 4 cotton' }, { kind: 'deliver', item: 'cotton', qty: 4, npc: 'hassan', text: 'Bring Hassan the cotton' }], reward: { coins: 30, hearts: { hassan: 2 } } },
  { id: 'side-priya', title: 'Garlands of Welcome', region: 'indianorth', giver: 'priya', intro: 'Priya: "A wedding! I need three garlands by tonight."', outro: 'The garlands are the brightest thing at the wedding.', steps: [{ kind: 'deliver', item: 'garland', qty: 3, npc: 'priya', text: 'Bring Priya 3 marigold garlands' }], reward: { coins: 35, hearts: { priya: 2 }, decor: ['rangoli'] } },
  { id: 'side-karthik', title: 'Stew for the Boatmen', region: 'indiasouth', giver: 'karthik', intro: 'Karthik: "The boatmen have rowed since dawn. Something warm?"', outro: 'Karthik gives you a free ride on the backwaters.', steps: [{ kind: 'deliver', item: 'curry', qty: 2, npc: 'karthik', text: 'Bring Karthik 2 spiced stews' }], reward: { coins: 40, hearts: { karthik: 2 } } },
  { id: 'side-farhan', title: 'Forty Fountains', region: 'mughal', giver: 'farhan', intro: 'Farhan: "A fountain pump is jammed. Do you have a repair kit?"', outro: 'All forty fountains sing at once.', steps: [{ kind: 'deliver', item: 'gearkit', qty: 1, npc: 'farhan', text: 'Bring Farhan a repair kit' }], reward: { coins: 45, hearts: { farhan: 2 }, decor: ['fountain'] } },
  { id: 'side-dewi', title: 'Silk for Batik', region: 'indonesia', giver: 'dewi', intro: 'Dewi: "Batik on silk… I have always wanted to try."', outro: 'Dewi\'s silk batik has waves and a tiny golden thread.', steps: [{ kind: 'deliver', item: 'silk', qty: 3, npc: 'dewi', text: 'Bring Dewi 3 silk cocoons' }], reward: { coins: 40, hearts: { dewi: 2 } } },
  { id: 'side-reindeer', title: 'The Reindeer Herd', region: 'aurora', giver: 'nils', intro: 'Nils: "The reindeer scattered in the storm. Make friends with one and the rest will follow."', outro: 'The whole herd comes home by nightfall.', steps: [{ kind: 'befriend', species: 'reindeer', text: 'Befriend a reindeer with pine cones' }], reward: { coins: 25, hearts: { nils: 2 }, light: 1 } },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<string, QuestDef>;
