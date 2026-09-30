import type { RegionId } from '../world/regions';

export interface NpcDef {
  id: string;
  name: string;
  region: RegionId;
  role: string;
  who: 'girl' | 'boy';
  /** Wardrobe outfit id — residents wear the same modest wardrobe as the travellers. */
  outfit: string;
  skin: string;
  keeper?: boolean;
  /** Offset from the land's centre. Omitted → placed along an avenue. */
  at?: [number, number];
  lines: string[];
  /** What they write once befriended. {g} = girl's name, {b} = boy's name. */
  letters: string[];
}

const S = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a', '#6b4630'];

const P = (
  id: string, name: string, region: RegionId, role: string, who: 'girl' | 'boy', outfit: string, skin: number,
  lines: string[], letters: string[], extra: Partial<NpcDef> = {},
): NpcDef => ({ id, name, region, role, who, outfit, skin: S[skin], lines, letters, ...extra });

// Top island of the Sky Isles spiral (matches architecture.ts skyisles landmark, i = 15).
const TOP = [Math.cos(15 * 0.9) * (70 - 15 * 3.2) + 6, Math.sin(15 * 0.9) * (70 - 15 * 3.2)] as [number, number];

export const PEOPLE: NpcDef[] = [
  // Wanderers' Meadow
  // Grandmother Syeda Sarvatara (owner, 2026-09-30), who calls Fathima by her pet name, Shumaela.
  P('noor', 'Grandmother Sarvatara', 'meadow', 'Syeda Sarvatara · Keeper of the Meadow Lantern', 'girl', 'g-nomad', 1, [
    'There you both are, Shumaela. The thread between you is bright this morning.',
    'A thread is strong because it is shared. Remember that on the road.',
    'The lanterns of the world have dimmed, little ones. People forget each other.',
  ], ['Did you eat today, Shumaela? Both of you? Good.', 'The oak dropped its first acorns. I saved you one.', 'Come home when the road is tired of you. The kettle is always warm.'], { keeper: true, at: [10, 18] }),
  P('yusuf', 'Yusuf', 'meadow', 'Shepherd', 'boy', 'b-meadow', 3, [
    'The sheep wander further every day. Like you two.',
    'If you are kind to the flock, they will follow you home.',
  ], ['One of the lambs keeps looking down the road. I think she misses you.', 'Rain tonight. The sheep are all tucked in.']),
  P('lina', 'Lina', 'meadow', 'Baker', 'girl', 'g-meadow', 0, [
    'Bread is better when you share it — even the burnt bits.',
    'If you ever see olives on your travels, I would trade you anything.',
  ], ['I tried a new recipe. Too much salt. Next time!', 'The children ask about the travellers with the golden thread.']),

  // Japan
  P('haruka', 'Haruka', 'japan', 'Keeper · Tea House', 'girl', 'g-kimono', 0, [
    'Welcome. Please, sit. Tea first, then troubles.',
    'Our lantern went cold the winter my teacher left. Perhaps warm hands can relight it.',
  ], ['The first petals fell today. I thought of you.', 'A guest asked for "the tea the travellers made". I was very proud.'], { keeper: true, at: [14, 34] }),
  P('kenji', 'Kenji', 'japan', 'Lantern Maker', 'boy', 'b-kimono', 1, [
    'Paper, bamboo, and patience. That is all a lantern is.',
    'Light that is carried from far away burns longest.',
  ], ['I made a lantern shaped like a van. It is terrible. I love it.', 'Come see the river lanterns on the next new moon.']),
  P('aiko', 'Aiko', 'japan', 'Gardener', 'girl', 'g-petal', 0, [
    'Every tree here was planted by someone who never saw it bloom.',
  ], ['My little pine grew a new branch!', 'Do you have gardens where you are now?']),

  // Korea
  P('seoyeon', 'Seo-yeon', 'korea', 'Keeper · Scholar', 'girl', 'g-hanbok', 0, [
    'A letter is a thread you can hold in your hand.',
    'So many here have stopped writing to each other. Will you help me remind them?',
  ], ['I am teaching the children to write their names beautifully.', 'Your letters are pinned above my desk.'], { keeper: true, at: [0, 30] }),
  P('minjun', 'Min-jun', 'korea', 'Potter', 'boy', 'b-hanbok', 1, [
    'Clay remembers every touch. Be gentle with it.',
  ], ['A pot I made cracked in the kiln. It still holds water, just a little less.']),
  P('jiwoo', 'Ji-woo', 'korea', 'Herbalist', 'girl', 'g-parka', 1, [
    'Ginseng grows slowly and quietly. Good things often do.',
  ], ['The mountain is covered in mist today. Very beautiful. Very cold.']),

  // China
  P('lin', 'Master Lin', 'china', 'Keeper · Silk Weaver', 'boy', 'b-hanfu', 1, [
    'One silk thread is nothing. Ten thousand make a river of cloth.',
    'Bring me the work of your own hands and we will wake the lantern together.',
  ], ['My loom sang all night. I think it missed you.', 'The bamboo grew a whole hand taller this week.'], { keeper: true, at: [0, 30] }),
  P('mei', 'Mei', 'china', 'Tea Merchant', 'girl', 'g-hanfu', 0, [
    'Travellers bring the best stories and the worst haggling.',
  ], ['A new tea arrived from the mountains. I set some aside for you.']),
  P('wei', 'Wei', 'china', 'Panda Keeper', 'boy', 'b-kurta', 1, [
    'The pandas only trust people who move slowly. You two are very calm.',
  ], ['The youngest panda rolled down the hill again. On purpose, I think.']),

  // Norway
  P('ingrid', 'Ingrid', 'norway', 'Keeper · Boatwright', 'girl', 'g-bunad', 0, [
    'The fjord is deep and the winters are long. We need our lantern.',
    'Build something with your hands, and I will show you where the light sleeps.',
  ], ['Northern lights tonight! Faint, but there.', 'I finished the little boat. It floats. Mostly.'], { keeper: true, at: [0, 22] }),
  P('olav', 'Olav', 'norway', 'Fisherman', 'boy', 'b-bunad', 0, [
    'I do not fish anymore. I just sit by the water and say hello to it.',
  ], ['The water was glass-still today. Wish you were here to see it.']),
  P('sigrid', 'Sigrid', 'norway', 'Knitter', 'girl', 'g-parka', 0, [
    'A warm scarf is a hug you can give from far away.',
  ], ['I knitted a scarf in gold. It reminded me of your thread.']),

  // Switzerland
  P('anneli', 'Anneli', 'switzerland', 'Keeper · Cheesemaker', 'girl', 'g-dirndl', 0, [
    'Up here, we share what the cows give. Help me and share it further.',
  ], ['The cows found the high meadow again. They are very pleased with themselves.', 'Fresh snow on the peaks this morning.'], { keeper: true, at: [0, 20] }),
  P('matthias', 'Matthias', 'switzerland', 'Clock Mender', 'boy', 'b-alpine', 0, [
    'Every clock is right twice a day. People are better than that.',
  ], ['I fixed the tower clock! It is now only four minutes wrong.']),
  P('clara', 'Clara', 'switzerland', 'Mountain Guide', 'girl', 'g-trench', 1, [
    'The mountains are patient. They wait for you to be ready.',
  ], ['I climbed to the ridge at dawn. The whole valley was pink.']),

  // London
  P('hartley', 'Mr. Hartley', 'london', 'Keeper · Clockmaker', 'boy', 'b-coat', 0, [
    'The great clock keeps time for everyone, and yet nobody stops to look at it.',
    'Mend something for someone, and time will be kinder to you.',
  ], ['The clock chimed perfectly at noon. I applauded. Alone. Worth it.', 'Tea at four, if you are ever passing.'], { keeper: true, at: [-14, 30] }),
  P('eleanor', 'Eleanor', 'london', 'Librarian', 'girl', 'g-trench', 0, [
    'Books are just letters to strangers. I love strangers.',
  ], ['Someone returned a book forty years late. With a note saying sorry.']),
  P('arthur', 'Arthur', 'london', 'Bus Driver', 'boy', 'b-vintage', 4, [
    'Route 9, every day, thirty years. I still wave to everyone.',
  ], ['A little girl waved back today. Made my whole week.']),

  // New York
  P('rosa', 'Rosa', 'newyork', 'Keeper · Diner Owner', 'girl', 'g-street', 2, [
    'A thousand windows and nobody knows their neighbour. We can fix that.',
    'Paint me a sign that says come in, and mean it.',
  ], ['The diner was full today. Strangers sharing tables. Your sign did that.', 'Pie on the counter. Your names on the slice.'], { keeper: true, at: [0, 34] }),
  P('marcus', 'Marcus', 'newyork', 'Mechanic', 'boy', 'b-street', 5, [
    'Everything can be fixed. Engines, bikes, days.',
  ], ['Fixed a kid\'s bike today. He did a lap of honour.']),
  P('jamal', 'Jamal', 'newyork', 'Rooftop Gardener', 'boy', 'b-nova', 4, [
    'Tomatoes on the roof, sky in every direction.',
  ], ['First strawberry of the season. Tiny. Perfect.']),

  // Renaissance
  P('lorenzo', 'Maestro Lorenzo', 'renaissance', 'Keeper · Mosaic Master', 'boy', 'b-renaissance', 1, [
    'A mosaic is ten thousand small kindnesses that make one picture.',
  ], ['The dome caught the sunset. I stood there an hour.', 'An apprentice set her first tile. Crooked. Beautiful.'], { keeper: true, at: [-22, 50] }),
  P('giulia', 'Giulia', 'renaissance', 'Olive Grower', 'girl', 'g-renaissance', 1, [
    'Olive trees live a thousand years. They have seen many travellers.',
  ], ['The harvest is in! My hands smell of olives for a week.']),
  P('matteo', 'Matteo', 'renaissance', 'Bell Ringer', 'boy', 'b-kurta', 1, [
    'I ring the bell so people remember to look up.',
  ], ['I rang the bell for you today. You probably did not hear it. It was for you anyway.']),

  // Vintage
  P('mabel', 'Mabel', 'vintage', 'Keeper · Seamstress', 'girl', 'g-teadress', 0, [
    'Old clothes, old songs, old friends — the best things get better with mending.',
  ], ['The carousel is turning again. The children shrieked with joy.', 'I found a ribbon the exact gold of your thread.'], { keeper: true, at: [-16, 20] }),
  P('otis', 'Otis', 'vintage', 'Record Shop', 'boy', 'b-vintage', 5, [
    'Every song is somebody\'s letter home.',
  ], ['Played an old record today and the whole street hummed along.']),
  P('june', 'June', 'vintage', 'Florist', 'girl', 'g-street', 0, [
    'Flowers are the only gift that says "I thought of you" in every language.',
  ], ['The sunflowers are taller than me this year.']),

  // Islamic
  P('maryam', 'Ustadha Maryam', 'islamic', 'Keeper · Calligrapher', 'girl', 'g-abaya', 2, [
    'Peace be upon you both. Every letter is a door, if written with care.',
    'Write something beautiful for the courtyard and we shall light the lantern together.',
  ], ['The orange trees are in blossom. The whole courtyard smells of it.', 'I wrote your names in gold ink for the lantern.'], { keeper: true, at: [0, 50] }),
  P('idris', 'Idris', 'islamic', 'Tile Maker', 'boy', 'b-thobe', 3, [
    'Geometry is how patience looks when it is drawn.',
  ], ['I finished a star pattern with twelve points. It took all week.']),
  P('zainab', 'Zainab', 'islamic', 'Gardener', 'girl', 'g-galabeya', 3, [
    'Water, shade, and quiet. That is all a garden asks for.',
  ], ['The fountain sings louder after rain.']),

  // Middle East
  P('abusalim', 'Abu Salim', 'middleeast', 'Keeper · Lamp Seller', 'boy', 'b-thobe', 3, [
    'Welcome, welcome! Sit, have dates, have coffee — the lantern can wait five minutes.',
    'The souq is dark at night now. Help me fill it with lamps again.',
  ], ['A caravan arrived with news of you two. Everyone says you are kind.', 'I saved the best lamp for your van.'], { keeper: true, at: [0, 36] }),
  P('layla', 'Layla', 'middleeast', 'Perfumer', 'girl', 'g-abaya', 2, [
    'Frankincense smells like memory, my grandmother said.',
  ], ['I made a new scent. I call it "the road".']),
  P('faris', 'Faris', 'middleeast', 'Camel Trainer', 'boy', 'b-nomad', 3, [
    'The camels know the way home. I just keep them company.',
  ], ['Old Qamar the camel sat down in the market and refused to move. Again.']),

  // Desert
  P('rashid', 'Amm Rashid', 'desert', 'Keeper · Tent Elder', 'boy', 'b-nomad', 3, [
    'In the desert, a stranger at the fire is a guest for three days. Welcome.',
    'The nights are cold. Weave warmth for the families and the fire will answer.',
  ], ['The stars were so thick last night you could not see the dark between them.', 'The tent you helped raise still stands proud.'], { keeper: true, at: [14, 18] }),
  P('nadia', 'Nadia', 'desert', 'Weaver', 'girl', 'g-nomad', 3, [
    'Every stripe on a tent tells the story of the family inside.',
  ], ['I wove a stripe of gold into the new tent. For you.']),
  P('sami', 'Sami', 'desert', 'Young Stargazer', 'boy', 'b-nomad', 3, [
    'Do you know the names of the stars? I know twelve. I am learning thirteen.',
  ], ['I learned the thirteenth star!', 'I saw a shooting star and wished you a safe road.']),

  // Egypt
  P('amira', 'Amira', 'egypt', 'Keeper · Scribe', 'girl', 'g-galabeya', 3, [
    'The river writes on the land every year. We write on papyrus. Both are remembering.',
  ], ['The river rose gently this year. The fields are green to the horizon.', 'I found an old scroll with a drawing of two travellers.'], { keeper: true, at: [0, 18] }),
  P('hassan', 'Hassan', 'egypt', 'Felucca Sailor', 'boy', 'b-galabeya', 4, [
    'The wind goes north, the river goes south. Choose your direction.',
  ], ['Sailed at sunset. The pyramids turned gold.']),
  P('karim', 'Karim', 'egypt', 'Cotton Farmer', 'boy', 'b-kurta', 4, [
    'This cotton will be a shirt in Cairo, a sail on the Nile, a bandage somewhere.',
  ], ['The cotton burst open all at once. Like snow in summer.']),

  // North India
  P('ranididi', 'Rani Didi', 'indianorth', 'Keeper · Potter', 'girl', 'g-anarkali', 2, [
    'Arre, come in, come in! You look tired. Chai first.',
    'Our lamps are cracked and the festival is near. Make me new pots and we will light them all.',
  ], ['The whole street lit diyas tonight. It looked like your thread everywhere.', 'I kept a plate of sweets for you. Arjun ate half. Sorry.'], { keeper: true, at: [0, 20] }),
  P('arjun', 'Arjun', 'indianorth', 'Spice Seller', 'boy', 'b-sherwani', 2, [
    'Cardamom for joy, turmeric for healing, chili for courage!',
  ], ['New saffron came from the north. The whole shop glows orange.']),
  P('priya', 'Priya', 'indianorth', 'Garland Maker', 'girl', 'g-angrakha', 2, [
    'Marigolds for welcome. I make a hundred garlands a day.',
  ], ['A wedding ordered a thousand garlands! My fingers are orange forever.']),

  // South India
  P('lakshmi', 'Lakshmi Amma', 'indiasouth', 'Keeper · Cook', 'girl', 'g-pavadai', 4, [
    'Sit, sit — eat first. Food made with love is the first medicine.',
    'Make sweets for the temple children, and the lamps will remember how to shine.',
  ], ['Monsoon came! Everything smells green.', 'The children are asking for the travellers\' coconut sweets.'], { keeper: true, at: [0, 22] }),
  P('karthik', 'Karthik', 'indiasouth', 'Boatman', 'boy', 'b-veshti', 4, [
    'The backwaters are slow. It is good to be slow sometimes.',
  ], ['A kingfisher sat on my boat for an hour today.']),
  P('meena', 'Meena', 'indiasouth', 'Dancer', 'girl', 'g-pavadai', 3, [
    'Every step tells a story. Mine are about the monsoon.',
  ], ['Performed at the temple festival. My anklets sang!']),

  // Mughal
  P('mirza', 'Mirza Sahib', 'mughal', 'Keeper · Royal Gardener', 'boy', 'b-jama', 2, [
    'A garden is paradise rehearsing. Every channel of water is a verse.',
    'Distil the roses with me, and the marble will glow again.',
  ], ['The roses are open. The whole charbagh is breathing.', 'Moonlight on the marble last night. I wished you both could see it.'], { keeper: true, at: [14, 20] }),
  P('mehrunissa', 'Mehrunissa', 'mughal', 'Miniature Painter', 'girl', 'g-angrakha', 1, [
    'I paint gardens smaller than a leaf. The world is big enough already.',
  ], ['I painted you two in a tiny van. With a tiny golden thread.']),
  P('farhan', 'Farhan', 'mughal', 'Fountain Keeper', 'boy', 'b-sherwani', 2, [
    'If the water stops, the garden forgets to sing.',
  ], ['All forty fountains are running. I counted twice.']),

  // Indonesia
  P('sari', 'Ibu Sari', 'indonesia', 'Keeper · Rice Farmer', 'girl', 'g-kurung', 3, [
    'The terraces were built by grandparents for grandchildren. We keep planting.',
    'Help me with seedlings, and we will climb the temple to light the lantern.',
  ], ['The rice is ankle-high now. The whole valley is bright green.', 'The children flew kites shaped like golden threads.'], { keeper: true, at: [0, 44] }),
  P('budi', 'Budi', 'indonesia', 'Rattan Weaver', 'boy', 'b-melayu', 3, [
    'Rattan bends but does not break. Good lesson.',
  ], ['Finished a chair so light a child can carry it.']),
  P('dewi', 'Dewi', 'indonesia', 'Batik Maker', 'girl', 'g-kebaya', 3, [
    'Wax, dye, patience, repeat. Batik teaches you to wait.',
  ], ['New batik: waves and stars. I will save you a piece.']),

  // Aurora
  P('aila', 'Aila', 'aurora', 'Keeper · Aurora Watcher', 'girl', 'g-parka', 0, [
    'The sky dances here, but people stay inside, alone. Light our lantern and they will come out.',
  ], ['Green and violet tonight. The whole sky was singing.', 'The reindeer came right up to the observatory door.'], { keeper: true, at: [0, 16] }),
  P('nils', 'Nils', 'aurora', 'Sled Builder', 'boy', 'b-parka', 0, [
    'Snow is quiet. That is why I like it.',
  ], ['New sled finished. The dogs approve.']),
  P('taavi', 'Taavi', 'aurora', 'Ice Fisher', 'boy', 'b-parka', 0, [
    'Under the ice, the lake is still moving. So are we, even when resting.',
  ], ['Minus thirty today. My tea froze on the way to my mouth.']),

  // Sky Isles
  P('lamplighter', 'The Lamplighter', 'skyisles', 'Keeper of the Great Lantern', 'girl', 'g-star', 1, [
    'You came. Of course you came — the thread was bright enough to see from here.',
    'The Great Lantern waits for light gathered from every land. Bring me a star lamp.',
  ], ['Every lantern you lit shines up here. I can see them all.', 'The Great Lantern hums your names.'], { keeper: true, at: TOP }),
];

export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<string, NpcDef>;
export const keeperOf = (region: RegionId) => PEOPLE.find((p) => p.region === region && p.keeper)!;
