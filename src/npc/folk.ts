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

/** Favours anyone might ask; helping earns a little and makes a friend. */
export const FAVOURS: Array<{ ask: string; done: string; coins: number }> = [
  { ask: 'Could you help me carry these baskets to my stall?', done: 'You carry the baskets together. The stall is ready in no time.', coins: 8 },
  { ask: 'My cart wheel is stuck — could you lend a hand?', done: 'One push together and the wheel rolls free.', coins: 10 },
  { ask: 'I dropped my keys somewhere near here…', done: 'You find them glinting by the fountain.', coins: 6 },
  { ask: 'Could you read this letter to me? My glasses are at home.', done: 'You read the letter aloud. It is good news from a grandchild.', coins: 5 },
  { ask: 'Would you help me hang these lanterns?', done: 'The lanterns go up, one by one, and the street looks lovely.', coins: 9 },
  { ask: 'My little one is lost — have you seen a child in a yellow scarf?', done: 'You find the child by the sweet stall and bring them back.', coins: 12 },
  { ask: 'Could you help me water the flower boxes along the street?', done: 'Every flower box gets a drink. Bees arrive almost at once.', coins: 7 },
  { ask: 'I need to fix this bench before the evening crowd.', done: 'A few nails and it is steady again.', coins: 9 },
];

/** A stable pick for a person: their name, a line, and whether they need help today. */
export function folkOf(land: RegionId, idx: number, day: number): { name: string; line: string; favour: (typeof FAVOURS)[number] | null } {
  const names = FOLK_NAMES[land], lines = FOLK_LINES[land];
  // Twelve names a land; after that a family initial keeps everyone distinct ("Elsie B.").
  const name = names[idx % names.length] + (idx >= names.length ? ` ${String.fromCharCode(65 + Math.floor(idx / names.length))}.` : '');
  const line = lines[(idx + day) % lines.length];
  const needs = (idx * 7 + day * 3) % 4 === 0;
  return { name, line, favour: needs ? FAVOURS[(idx + day) % FAVOURS.length] : null };
}
