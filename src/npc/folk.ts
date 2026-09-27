import { ITEMS } from '../economy/items';
import type { RegionId } from '../world/regions';

/**
 * The people of every town you can stop and talk to: their names, what they say, and the small
 * favours they ask — carrying, mending, finding — which is how the travellers earn by helping.
 * Pure data; tests check every land has its own.
 */

/** Everyone in town: full figures up close (you can talk to them) and the wider crowd. */
export const CITY_PEOPLE = 300;

const N = (s: string) => s.split(' ');
export const FOLK_NAMES: Record<RegionId, string[]> = {
  meadow: N('Elsie Tom Maggie Owen Hazel Arthur Poppy Jack Ivy Fred Daisy Albert'),
  japan: N('Haruto Yui Sota Aoi Ren Hina Kaito Sakura Riku Mei Yuto Emi'),
  korea: N('Minjun Jiwoo Seojun Hayoon Doyun Jiho Yerin Siwoo Suah Eunwoo Chaewon Taeyang'),
  china: N('Wei Mei Jun Lan Hao Xiu Ming Ling Bo Fang Tao Yan'),
  norway: N('Ola Ingrid Lars Sigrid Nils Astrid Erik Solveig Magnus Frida Leif Ragna'),
  switzerland: N('Urs Heidi Beat Vreni Reto Anja Luca Seraina Jonas Nadine Fabian Lea'),
  london: N('Alfie Florence George Matilda Harry Beatrice Oliver Evie Charlie Rosie Henry Mabel'),
  newyork: N('Marcus Sofia Jamal Grace Diego Priya Sam Rachel Luis Keisha Noah Hannah'),
  renaissance: N('Lorenzo Giulia Matteo Chiara Paolo Lucia Marco Bianca Tommaso Elena Dario Serena'),
  vintage: N('Benny Dot Walter Peggy Clive June Stanley Vera Roy Hattie Percy Nell'),
  islamic: N('Yusuf Amina Idris Layla Tariq Salma Bilal Nadia Hamza Zainab Karim Huda'),
  middleeast: N('Omar Rania Khalid Dalia Faris Noor Samir Hala Rami Lina Ziad Maya'),
  desert: N('Rashid Sahar Hamad Mariam Saeed Fatima Majid Aisha Sultan Hind Nasser Shamsa'),
  egypt: N('Hassan Nour Karim Salma Mostafa Yasmin Amr Mona Tarek Dina Sherif Heba'),
  indianorth: N('Arjun Priya Rohan Anjali Vikram Kavita Aman Neha Raj Pooja Karan Simran'),
  indiasouth: N('Karthik Lakshmi Arun Meena Suresh Divya Vijay Anitha Ravi Kavya Hari Deepa'),
  mughal: N('Faisal Mehrunnisa Danish Rukhsar Imran Gulnaz Salim Shabnam Arif Farah Nadeem Zoya'),
  indonesia: N('Budi Sari Agus Dewi Made Putu Wayan Ketut Rina Adi Ayu Eko'),
  aurora: N('Aslak Inga Mikkel Siri Johan Elle Nils Risten Per Marit Ante Berit'),
  skyisles: N('Aurel Celeste Orin Lyra Soren Nova Wren Vega Caspian Stella Elio Iris'),
};

/** Small talk in each land's own flavour. */
export const FOLK_LINES: Record<RegionId, string[]> = {
  meadow: ['The bakery has cinnamon buns this morning.', 'Did you see the rainbow over the castle?', 'My sheep escaped again — they always come back for supper.', 'Welcome home, both of you.'],
  japan: ['The cherry blossom only lasts a week — look up while you can.', 'Try the mochi by the gate; still warm.', 'My grandmother folds a crane for every guest.', 'The festival lanterns go up tonight.'],
  korea: ['Have you eaten? Come, there is plenty.', 'The kimchi jars are full for winter.', 'My daughter is learning calligraphy — slowly!', 'Chuseok is coming; everyone goes home.'],
  china: ['Mooncakes! Lotus seed or red bean?', 'The tea house by the bridge is the best in town.', 'Hang a red lantern for luck.', 'My kite has a dragon on it this year.'],
  norway: ['The fjord is calm today — good for the boats.', 'Coffee? We always have coffee.', 'In summer the sun hardly sets at all.', 'My grandfather carved that door.'],
  switzerland: ['Listen — the cowbells on the high pasture.', 'The cheese needs another month in the cellar.', 'The clock tower is never late.', 'The geraniums were my mother\'s.'],
  london: ['Lovely weather for ducks, isn\'t it?', 'Tea? The kettle\'s just boiled.', 'The big clock chimes every quarter hour.', 'Mind the puddles, dear.'],
  newyork: ['Best bagels are two blocks down.', 'This city never sleeps — neither do I!', 'Street musicians in the park tonight.', 'Everyone here came from somewhere.'],
  renaissance: ['The fresco in the chapel took ten years.', 'Lemon trees love this sun.', 'My workshop makes the finest marble in the land.', 'Buongiorno! Beautiful day.'],
  vintage: ['The carousel still plays the old tunes.', 'Fresh lemonade, a penny a glass!', 'My bicycle is older than me.', 'The picture house has a new film.'],
  islamic: ['Peace be with you, travellers.', 'The fountain has run since my grandfather\'s day.', 'Mint tea? It is always ready.', 'The tile-makers are painting a new courtyard.'],
  middleeast: ['The souq smells of cardamom today.', 'Sit, sit — you are our guests.', 'The wind towers keep the houses cool.', 'My brother sells the best dates.'],
  desert: ['The stars out here are close enough to touch.', 'Coffee first, then talk.', 'The dunes move a little every night.', 'The camels know the way better than we do.'],
  egypt: ['The river gives us everything.', 'Karkadeh? Cold hibiscus tea.', 'My father taught me to read the old symbols.', 'The feluccas sail at sunset.'],
  indianorth: ['Chai? Just made, with cardamom.', 'The kite festival is next week!', 'This city is pink so it always feels like sunset.', 'Take some jalebi, they are fresh.'],
  indiasouth: ['I drew a new kolam this morning.', 'Filter coffee — strong and sweet.', 'The monsoon will come soon; smell the air.', 'The temple bells ring at dawn.'],
  mughal: ['The garden was laid out in four parts, like paradise.', 'Rose water for your hands?', 'The marble glows pink at dawn.', 'My family has made inlay for six generations.'],
  indonesia: ['The rice terraces are greenest after rain.', 'The gamelan practises every evening.', 'Try the mango, it is perfect today.', 'Our batik tells a story if you know how to read it.'],
  aurora: ['The lights were dancing all night.', 'Come in from the cold — soup is on.', 'The reindeer are restless; weather is changing.', 'We waited all winter for the sun to come back.'],
  skyisles: ['Watch your step — the clouds are soft but not that soft.', 'The star library opens at dusk.', 'Wind chimes tell you the weather up here.', 'Every island has its own little sky.'],
};

export interface Favour {
  ask: string;
  done: string;
  coins: number;
  /** Something they need from your bag (it is used up); without it, they tell you what would help. */
  needs?: { item: string; qty: number };
}

/** Favours anyone might ask; helping earns a little and makes a friend. */
export const FAVOURS: Favour[] = [
  { ask: 'Could you help me carry these baskets to my stall?', done: 'You carry the baskets together. The stall is ready in no time.', coins: 8 },
  { ask: 'My cart wheel is stuck — could you lend a hand?', done: 'One push together and the wheel rolls free.', coins: 10 },
  { ask: 'I dropped my keys somewhere near here…', done: 'You find them glinting by the fountain.', coins: 6 },
  { ask: 'Could you read this letter to me? My glasses are at home.', done: 'You read the letter aloud. It is good news from a grandchild.', coins: 5 },
  { ask: 'Would you help me hang these lanterns?', done: 'The lanterns go up, one by one, and the street looks lovely.', coins: 9 },
  { ask: 'My little one is lost — have you seen a child in a yellow scarf?', done: 'You find the child by the sweet stall and bring them back.', coins: 12 },
  { ask: 'Could you help me water the flower boxes along the street?', done: 'Every flower box gets a drink. Bees arrive almost at once.', coins: 7 },
  { ask: 'I need to fix this bench before the evening crowd.', done: 'A few nails and it is steady again.', coins: 9 },
  { ask: 'My grandmother is unwell — do you have any fresh herbs for her tea?', done: 'You hand over the herbs. The kettle goes on at once.', coins: 14, needs: { item: 'herbs', qty: 1 } },
  { ask: 'We are cooking for the whole street tonight and ran out of rice.', done: 'The pot is full again; you are invited to supper.', coins: 12, needs: { item: 'rice', qty: 2 } },
  { ask: 'The school kitchen needs tomatoes for tomorrow\'s soup — do you grow any?', done: 'A basket of tomatoes, and forty happy children at lunch.', coins: 16, needs: { item: 'tomato', qty: 2 } },
  { ask: 'Our festival needs a pumpkin for the lantern contest!', done: 'Carved and glowing — it wins, of course.', coins: 20, needs: { item: 'pumpkin', qty: 1 } },
  { ask: 'Some wheat for the baker? The mill ran short.', done: 'Flour by noon, bread by evening.', coins: 12, needs: { item: 'wheat', qty: 3 } },
  { ask: 'A bunch of flowers for my friend\'s new shop would be perfect.', done: 'The flowers go in a jar on the counter. The first customer smiles.', coins: 10, needs: { item: 'wildflower', qty: 2 } },
];

/** Each land's own needs — its crafts, foods and customs. */
export const LAND_FAVOURS: Record<RegionId, Favour[]> = {
  meadow: [{ ask: 'The sheep got through the hedge again. Help me call them home?', done: 'Pip rounds them up while you mend the gap.', coins: 9 }, { ask: 'Some wool for the knitting circle?', done: 'The circle cheers — scarves for winter!', coins: 12, needs: { item: 'wool', qty: 1 } }],
  japan: [{ ask: 'Help me sweep the petals from the shrine steps?', done: 'The steps shine; a bell rings somewhere above.', coins: 8 }, { ask: 'Tea leaves for the ceremony this afternoon?', done: 'The host bows deeply and pours you the first bowl.', coins: 14, needs: { item: 'tea', qty: 1 } }],
  korea: [{ ask: 'Could you help me carry kimchi jars to the terrace?', done: 'The onggi stand in a neat row, ready for winter.', coins: 10 }, { ask: 'Mulberry paper for my calligraphy class?', done: 'The children write their names in careful strokes.', coins: 12, needs: { item: 'hanji', qty: 1 } }],
  china: [{ ask: 'Help me hang the red lanterns over the gate?', done: 'Twenty lanterns sway in a line of warm light.', coins: 9 }, { ask: 'A little bamboo to mend my steamer baskets?', done: 'Dumplings will steam properly again tonight.', coins: 12, needs: { item: 'bamboo', qty: 1 } }],
  norway: [{ ask: 'Help me pull the boat up the slipway before the tide?', done: 'Heave — and she is safe above the waterline.', coins: 11 }, { ask: 'Birch bark to start the sauna stove?', done: 'Smoke curls up; the whole street will be warm tonight.', coins: 10, needs: { item: 'birch', qty: 1 } }],
  switzerland: [{ ask: 'The cows need leading to the high pasture — walk with me?', done: 'Their bells ring all the way up the hill.', coins: 10 }, { ask: 'Some alpine milk for the cheese cellar?', done: 'A new wheel of cheese begins its long rest.', coins: 12, needs: { item: 'milk', qty: 1 } }],
  london: [{ ask: 'My umbrella blew into the square — could you fetch it?', done: 'You rescue it from a lamppost. Only slightly bent!', coins: 7 }, { ask: 'A brass gear for the old shop clock?', done: 'It ticks again, a quarter-hour late but proud.', coins: 14, needs: { item: 'gear', qty: 1 } }],
  newyork: [{ ask: 'Help me set up chairs for the jazz night on the roof?', done: 'Forty chairs, two lamps, one very happy saxophonist.', coins: 10 }, { ask: 'Some paint to finish the mural on my block?', done: 'The mural gets its sky, bright as the neon.', coins: 13, needs: { item: 'paint', qty: 1 } }],
  renaissance: [{ ask: 'Hold this ladder while I restore the fresco?', done: 'An angel\'s wing gleams gold again.', coins: 11 }, { ask: 'Olives for the market lunch?', done: 'The bread and oil taste of sunshine.', coins: 10, needs: { item: 'olive', qty: 1 } }],
  vintage: [{ ask: 'The carousel horse is loose — help me bolt it?', done: 'Round it goes, music and all.', coins: 9 }, { ask: 'A spool of thread for the dance-hall bunting?', done: 'The bunting stretches right across the square.', coins: 11, needs: { item: 'spool', qty: 1 } }],
  islamic: [{ ask: 'Could you help me clear leaves from the courtyard fountain?', done: 'The water sings in its basin again.', coins: 9 }, { ask: 'Clay for the tile-makers\' new courtyard?', done: 'A star pattern starts to spread across the wall.', coins: 12, needs: { item: 'clay', qty: 1 } }],
  middleeast: [{ ask: 'Help me roll up the carpets before the evening wind?', done: 'Rolled, tied and stacked like fat sleepy cats.', coins: 9 }, { ask: 'Frankincense for the guest room?', done: 'Sweet smoke drifts through the house.', coins: 13, needs: { item: 'incense', qty: 1 } }],
  desert: [{ ask: 'The tent ropes worked loose in the wind — pull with me?', done: 'Taut and tidy; the tent will stand through the night.', coins: 10 }, { ask: 'Some dates for the travellers\' welcome?', done: 'Dates and coffee, the oldest welcome there is.', coins: 11, needs: { item: 'dates', qty: 1 } }],
  egypt: [{ ask: 'Help me push the felucca off the sandbank?', done: 'The sail fills and the boat glides free.', coins: 11 }, { ask: 'Papyrus for my son\'s first lesson in writing?', done: 'He copies an ibis very carefully, tongue out.', coins: 12, needs: { item: 'papyrus', qty: 1 } }],
  indianorth: [{ ask: 'Help me string marigolds for the wedding gate?', done: 'Orange and gold from top to bottom.', coins: 10 }, { ask: 'Spices for the kirana shelf — we ran out of jeera!', done: 'The jars are full; the shopkeeper insists you take chai.', coins: 13, needs: { item: 'spice', qty: 1 } }],
  indiasouth: [{ ask: 'Could you help me draw the kolam before sunrise?', done: 'Rice-flour loops bloom across the threshold.', coins: 8 }, { ask: 'A coconut for the temple offering?', done: 'Cracked neatly in two, as it should be.', coins: 11, needs: { item: 'coconut', qty: 1 } }],
  mughal: [{ ask: 'Help me clear the garden channels so the water runs?', done: 'Water flows in all four channels, like paradise.', coins: 10 }, { ask: 'Rose petals for the attar still?', done: 'The whole lane smells of roses by evening.', coins: 13, needs: { item: 'rose', qty: 1 } }],
  indonesia: [{ ask: 'Help me carry offerings up the terrace steps?', done: 'Little baskets of flowers on every step.', coins: 9 }, { ask: 'Rattan to mend the gamelan frame?', done: 'The gongs hang straight; practice starts tonight.', coins: 12, needs: { item: 'rattan', qty: 1 } }],
  aurora: [{ ask: 'Help me dig the path to the reindeer shed?', done: 'A clean path through the snow, glittering green under the lights.', coins: 11 }, { ask: 'Pine cones for the long-night fire?', done: 'It crackles and pops; everyone gathers close.', coins: 10, needs: { item: 'pinecone', qty: 1 } }],
  skyisles: [{ ask: 'A wind chime blew loose — catch it for me?', done: 'You pluck it from a passing cloud.', coins: 10 }, { ask: 'Star dust for the library lamps?', done: 'The reading room glows softly again.', coins: 14, needs: { item: 'stardust', qty: 1 } }],
};

/** A stable pick for a person: their name, a line, and whether they need help today. */
export function folkOf(land: RegionId, idx: number, day: number): { name: string; line: string; favour: Favour | null } {
  const names = FOLK_NAMES[land], lines = FOLK_LINES[land];
  // Twelve names a land; after that a family initial keeps everyone distinct ("Elsie B.").
  const name = names[idx % names.length] + (idx >= names.length ? ` ${String.fromCharCode(65 + (Math.floor(idx / names.length) % 26))}.` : '');
  const line = lines[(idx + day) % lines.length];
  const needs = (idx * 7 + day * 3) % 4 === 0;
  const pool = [...LAND_FAVOURS[land], ...FAVOURS];
  return { name, line, favour: needs ? pool[(idx * 3 + day) % pool.length] : null };
}

/** Today's record of who asked and whom you helped (persisted, so a reload never repeats a reward). */
export interface FolkDay { day: number; asked: string[]; helped: string[] }

export type HelpResult =
  | { kind: 'line'; text: string }
  | { kind: 'ask'; text: string }
  | { kind: 'need'; text: string }
  | { kind: 'helped'; text: string; coins: number };

/**
 * Talking with someone in town. The first time they need a hand they ask; talk again to help.
 * Favours that need something take it from the bag. Each person can be helped once a day.
 */
/** How long someone waits for what you said you would bring (days). */
export const ERRAND_DAYS = 2;
type Errand = { key: string; land: string; name: string; item: string; qty: number; coins: number; done: string; x: number; z: number; until: number };

/**
 * Talk to someone in town. A favour that needs something from your bag becomes an errand: they
 * wait where they are (`at`), marked from far off, until you bring it — or for ERRAND_DAYS.
 */
export function talkToFolk(st: { minutes: number; coins: number; light: number; inventory: Record<string, number>; folk: FolkDay; errands?: Errand[] }, land: RegionId, idx: number, at?: { x: number; z: number }): HelpResult {
  const day = Math.floor(st.minutes / 1440);
  if (st.folk.day !== day) st.folk = { day, asked: [], helped: [] };
  const f = folkOf(land, idx, day), key = `${land}:${idx}`;
  // Someone waiting for you: hand it over, or be reminded.
  const e = st.errands?.find((x) => x.key === key);
  if (e) {
    const name = ITEMS[e.item]?.name ?? e.item, icon = ITEMS[e.item]?.icon ?? '';
    if ((st.inventory[e.item] ?? 0) < e.qty) return { kind: 'need', text: `${e.name} is still waiting for ${e.qty}× ${icon} ${name}.` };
    st.inventory[e.item] -= e.qty;
    if (st.inventory[e.item] <= 0) delete st.inventory[e.item];
    st.errands = st.errands!.filter((x) => x !== e);
    st.folk.helped.push(key);
    st.coins += e.coins;
    st.light += 0.05;
    return { kind: 'helped', text: `${e.done} ${e.name} thanks you both. +${e.coins} 🪙`, coins: e.coins };
  }
  if (!f.favour || st.folk.helped.includes(key)) return { kind: 'line', text: `${f.name}: "${f.line}"` };
  if (!st.folk.asked.includes(key)) {
    st.folk.asked.push(key);
    return { kind: 'ask', text: `${f.name}: "${f.favour.ask}" (press E again to help)` };
  }
  const n = f.favour.needs;
  if (n) {
    if ((st.inventory[n.item] ?? 0) < n.qty) {
      // They will wait here for you.
      if (st.errands && at) st.errands.push({ key, land, name: f.name, item: n.item, qty: n.qty, coins: f.favour.coins, done: f.favour.done, x: at.x, z: at.z, until: st.minutes + ERRAND_DAYS * 1440 });
      return { kind: 'need', text: `${f.name} needs ${n.qty}× ${ITEMS[n.item]?.icon ?? ''} ${ITEMS[n.item]?.name ?? n.item} — they will wait here for you (${ERRAND_DAYS} days). Look for the ❗.` };
    }
    st.inventory[n.item] -= n.qty;
    if (st.inventory[n.item] <= 0) delete st.inventory[n.item];
  }
  st.folk.helped.push(key);
  st.coins += f.favour.coins;
  st.light += 0.05;
  return { kind: 'helped', text: `${f.favour.done} ${f.name} thanks you both. +${f.favour.coins} 🪙`, coins: f.favour.coins };
}

/** Errands past their time: they gave up waiting. Returns their names. */
export function expireErrands(st: { minutes: number; errands: Errand[] }): string[] {
  const gone = st.errands.filter((e) => st.minutes > e.until);
  st.errands = st.errands.filter((e) => st.minutes <= e.until);
  return gone.map((e) => e.name);
}

