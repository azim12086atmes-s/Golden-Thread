import type { Continent, SettlementDef, SightingDef } from './schema';

/**
 * The continent of Safar. Transcribed from docs/research/map-design.md §2–3 (Opus, OPUS_002).
 * Coordinates are km (x east, z south). Named places are fictional game places inspired by real
 * landscapes; blurbs are original.
 */

const S = (id: string, name: string, kind: SightingDef['kind'], t: number, side: SightingDef['side'], offset: number, blurb: string, variant?: string): SightingDef =>
  ({ id, name, kind, t, side, offset, blurb, ...(variant ? { variant } : {}) });
const V = (id: string, name: string, kind: SettlementDef['kind'], style: SettlementDef['style'], t: number, side: SettlementDef['side'], distance: number, beacon: SettlementDef['beacon'], blurb: string): SettlementDef =>
  ({ id, name, kind, style, t, side, distance, beacon, blurb });

export const CONTINENT: Continent = {
  // Clockwise from the north-west. The Middle Sea and the Lantern Strait are sea-level lakes.
  coast: [
    [-6.3, -3.2], [-6.0, -4.0], [-5.4, -4.25], [-4.6, -4.2], [-4.0, -4.3], [-3.4, -4.1], [-3.15, -4.35],
    [-2.65, -4.35], [-2.2, -4.1], [-1.4, -4.0], [-0.6, -4.15], [0.3, -4.0], [1.2, -4.2], [1.9, -4.0],
    [2.5, -3.95], [2.75, -3.6], [3.0, -3.9], [3.8, -4.0], [4.6, -3.9], [5.6, -3.85], [6.2, -3.4],
    [6.4, -2.6], [6.1, -1.9], [6.3, -1.2], [6.2, -0.4], [6.3, 0.3], [6.4, 1.6], [6.2, 2.6], [6.4, 3.6],
    [6.2, 4.6], [5.8, 5.3], [4.8, 5.4], [3.8, 5.2], [2.8, 5.35], [1.8, 5.1], [1.0, 5.0], [0.0, 4.9],
    [-1.0, 4.8], [-1.8, 4.9], [-2.6, 4.8], [-3.4, 4.75], [-4.2, 4.6], [-4.6, 4.2], [-4.7, 3.5],
    [-4.9, 3.3], [-5.9, 3.0], [-6.1, 2.2], [-6.0, 1.3], [-6.3, 0.4], [-6.0, -0.4], [-6.4, -0.8],
    [-6.3, -1.4], [-5.9, -1.6], [-6.1, -2.3],
  ],
  islands: [
    { name: 'Nusa Besar', outline: [[-6.3, 3.8], [-5.8, 3.72], [-5.2, 3.75], [-4.9, 4.2], [-5.0, 4.9], [-5.7, 5.15], [-6.3, 4.7]] },
    { name: 'Nusa Kecil', outline: [[-6.2, 5.35], [-5.9, 5.3], [-5.85, 5.55], [-6.15, 5.6]] },
    { name: 'Harbour Isle', outline: [[6.55, -3.1], [6.8, -3.05], [6.85, -2.8], [6.6, -2.75]] },
    { name: 'Karst Islets', outline: [[-6.55, 1.55], [-6.35, 1.5], [-6.3, 1.75], [-6.5, 1.8]] },
  ],
  lakes: [
    { id: 'middle-sea', name: 'The Middle Sea', surface: 'water', level: 'sea', outline: [[3.0, 0.0], [3.6, -0.15], [4.4, -0.1], [5.2, 0.1], [5.25, 0.7], [5.2, 1.3], [5.2, 1.9], [4.6, 2.2], [3.8, 2.25], [3.2, 2.05], [2.95, 1.3], [3.0, 0.5]] },
    { id: 'lantern-strait', name: 'The Lantern Strait', surface: 'water', level: 'sea', outline: [[5.1, 0.6], [6.7, 0.55], [6.7, 1.35], [5.1, 1.3]] },
    { id: 'fjord', name: 'Fjordhavn Fjord', surface: 'water', level: 'sea', outline: [[-3.05, -4.5], [-2.75, -4.5], [-2.8, -3.85], [-2.9, -3.78], [-3.0, -3.85]] },
    { id: 'mirror-lake', name: 'Mirror Lake', surface: 'water', level: 58, outline: [[0.2, 1.25], [0.52, 1.38], [0.65, 1.7], [0.52, 2.02], [0.2, 2.15], [-0.12, 2.02], [-0.25, 1.7], [-0.12, 1.38]] },
    { id: 'lotus-lake', name: 'Lotus Lake', surface: 'water', level: 47, outline: [[1.05, 3.7], [1.4, 3.65], [1.6, 3.9], [1.45, 4.2], [1.1, 4.2], [0.98, 3.95]] },
    { id: 'palace-lake', name: 'Lake of the Palace', surface: 'water', level: 27, outline: [[-2.4, 2.9], [-2.05, 2.88], [-1.95, 3.1], [-2.1, 3.32], [-2.4, 3.3], [-2.5, 3.1]] },
    { id: 'salt-flat', name: 'The White Flat', surface: 'salt', level: 1, outline: [[-1.8, 4.2], [-0.6, 4.2], [-0.6, 4.65], [-1.8, 4.7]] },
    { id: 'frozen-lake', name: 'Stilljord Ice', surface: 'ice', level: 6, outline: [[-4.85, -3.55], [-4.35, -3.6], [-4.3, -3.25], [-4.8, -3.2]] },
    { id: 'oasis-lake', name: 'Salt-lake Oasis', surface: 'water', level: 10, outline: [[4.2, 4.8], [4.6, 4.78], [4.65, 5.02], [4.25, 5.05]] },
    { id: 'alpine-lake', name: 'Lago Lungo', surface: 'water', level: 18, outline: [[1.75, -2.2], [1.95, -2.25], [2.0, -1.5], [1.8, -1.45], [1.7, -1.8]] },
  ],
  ranges: [
    { id: 'crown', name: 'Crown Range', character: 'alpine', width: 900, height: 300, crest: [[-2.4, -2.9], [-1.4, -3.35], [-0.4, -3.55], [0.6, -3.3], [1.5, -2.8]] },
    { id: 'fells', name: 'Arctic Fells', character: 'fells', width: 700, height: 100, crest: [[-5.9, -3.0], [-5.0, -2.9], [-4.3, -3.1]] },
    { id: 'crags', name: 'Crag Belt', character: 'crags', width: 700, height: 140, crest: [[-5.7, -0.3], [-5.3, 0.5], [-5.5, 1.2]] },
    { id: 'karst', name: 'Jade Karst', character: 'karst', width: 500, height: 110, crest: [[-4.5, 1.2], [-4.2, 2.1], [-4.6, 2.8]] },
    { id: 'nusa', name: 'Nusa Volcanoes', character: 'volcano', width: 700, height: 220, crest: [[-6.05, 4.75], [-5.8, 4.95]] },
    { id: 'roof', name: 'Roof Range', character: 'needles', width: 1000, height: 330, crest: [[-2.2, 1.9], [-1.3, 1.7], [-0.6, 1.95], [0.3, 2.35], [1.4, 1.9]] },
    { id: 'sierra', name: 'The Sierra', character: 'ridge', width: 600, height: 180, crest: [[1.9, 2.7], [2.9, 2.8]] },
    { id: 'atlas', name: 'Atlas Ridge', character: 'ridge', width: 600, height: 170, crest: [[2.3, 3.2], [2.8, 3.6]] },
    { id: 'hajar', name: 'Hajar Ridge', character: 'sandstone', width: 600, height: 170, crest: [[4.4, 3.1], [5.9, 3.3]] },
    { id: 'blue', name: 'Blue Ridges', character: 'hills', width: 600, height: 90, crest: [[5.0, -1.9], [6.0, -1.4]] },
    { id: 'moon', name: 'Moon Hills', character: 'sandstone', width: 500, height: 80, crest: [[2.6, 5.0], [3.8, 5.1]] },
    { id: 'dunes', name: 'The Dune Sea', character: 'dunes', width: 900, height: 70, crest: [[4.6, 5.0], [6.0, 4.2]] },
  ],
  rivers: [
    { id: 'glacier', name: 'Glacier River', width: 30, path: [[-0.9, -3.5], [-0.05, -2.6], [0.2, -1.2], [0.3, 0.4], [0.25, 1.25]] },
    { id: 'kaveri', name: 'Kaveri', width: 40, path: [[-0.25, 1.75], [-1.0, 2.6], [-2.0, 3.0], [-2.6, 3.6], [-2.9, 4.2], [-3.1, 4.8]] },
    { id: 'tamesis', name: 'Tamesis', width: 45, path: [[1.5, -2.6], [2.1, -3.1], [2.75, -3.75]] },
    { id: 'jade', name: 'Jade River', width: 40, path: [[-3.8, 2.0], [-4.4, 2.3], [-5.2, 2.35], [-6.05, 2.3]] },
    { id: 'long', name: 'Long River', width: 60, path: [[3.3, 5.15], [3.05, 4.5], [3.25, 3.6], [3.5, 2.9], [3.65, 2.25]] },
    { id: 'palisade', name: 'Palisade River', width: 50, path: [[5.4, -1.5], [5.55, -2.3], [5.6, -3.0], [5.7, -3.8]] },
  ],
  cities: [
    { id: 'aurora', name: 'Aurora Huts', x: -5.4, z: -3.6, radius: 350, coreY: 8, relief: 30, landmarkHeight: 40, terrain: 'snowfield tundra on a frozen bay, arctic fells behind', districts: ['Observatory Knoll', 'Glass-Dome Row', 'Sled Yard', 'Ice Harbour', 'Sauna Lane'] },
    { id: 'norway', name: 'Fjordhavn', x: -2.9, z: -3.5, radius: 450, coreY: 4, relief: 70, landmarkHeight: 38, terrain: 'deep fjord with cliff walls, ribbon waterfalls and pine', districts: ['Painted Wharf', 'Stave Church Hill', 'Ferry Quay', 'Upper Shelf Farms', "Boatbuilders' Slip"] },
    { id: 'switzerland', name: 'Alpenrose', x: -0.4, z: -2.9, radius: 400, coreY: 110, relief: 80, landmarkHeight: 45, terrain: 'high U-valley, horn peaks, glacier tongue and wildflower pastures', districts: ['Clock Square', 'Chalet Terraces', 'Dairy Quarter', 'Lakeside Promenade', 'Cable-car Station'] },
    { id: 'london', name: 'Old London', x: 2.3, z: -3.3, radius: 600, coreY: 3, relief: 12, landmarkHeight: 90, terrain: 'estuary, chalk downs, plane-tree parks and marsh', districts: ['Clock Tower Embankment', 'Brick Terraces', 'Covent Market', 'Docklands', 'Royal Park', 'Railway Arches'] },
    { id: 'newyork', name: 'New Yonder', x: 5.2, z: -2.9, radius: 650, coreY: 2, relief: 8, landmarkHeight: 120, terrain: 'harbour banks, Palisade cliffs across the river, parkland', districts: ['Spire District', 'Harbour Piers', 'Central Park', 'Brownstone Blocks', 'Market Hall', 'The Bridge'] },
    { id: 'korea', name: 'Hanok Village', x: -5.3, z: -1.0, radius: 420, coreY: 20, relief: 45, landmarkHeight: 30, terrain: 'pine-hill peninsula with granite crags and tea terraces', districts: ['Palace Gate Court', 'Hanok Lanes', "Paper Makers' Quarter", 'Pine Shore Market', 'Tea Terrace Slope'] },
    { id: 'japan', name: 'Sakura Hollow', x: -2.8, z: -0.5, radius: 450, coreY: 40, relief: 40, landmarkHeight: 42, terrain: 'cedar valley opening onto a lake basin and cherry hills', districts: ['Pagoda Hill', 'Post-town Street', 'Lantern Canal', 'Cedar Market', 'Lakeside Tea Houses'] },
    { id: 'china', name: 'Jade Terraces', x: -5.0, z: 1.8, radius: 500, coreY: 30, relief: 50, landmarkHeight: 36, terrain: 'karst towers along the Jade River, bamboo and rice terraces', districts: ['Hall of the Blue Roof', 'Red Pillar Courtyards', 'Silk Street', 'River Quay', 'Willow Gardens'] },
    { id: 'indonesia', name: 'Nusa Rinjani', x: -5.6, z: 4.4, radius: 400, coreY: 12, relief: 45, landmarkHeight: 35, terrain: 'volcanic island, rice-terraced flanks, black-sand beaches', districts: ['Stupa Terrace', 'Horn-roof Longhouses', 'Terrace Rim', 'Outrigger Beach', 'Rattan Market'] },
    { id: 'meadow', name: "Wanderers' Meadow", x: 0, z: 0, radius: 380, coreY: 25, relief: 22, landmarkHeight: 30, terrain: 'high rolling grassland, flower drifts, oak copses, windmill ridge', districts: ['Great Oak Green', 'Round Cottage Circles', 'Windmill Ridge', "Noor's Garage", 'Brookside Market'] },
    { id: 'skyisles', name: 'The Sky Isles', x: 0.2, z: 1.7, radius: 300, coreY: 60, relief: 10, landmarkHeight: 420, terrain: 'floating cloud-meadow islands above Mirror Lake', districts: ['Temple of the Great Lantern', 'Isle of Beginnings', 'Bridge of Light', 'Cloud Orchard', 'Star Library'] },
    { id: 'renaissance', name: 'Firenzia', x: 2.7, z: -0.6, radius: 550, coreY: 30, relief: 30, landmarkHeight: 80, terrain: 'rolling wheat and cypress hills above the Middle Sea', districts: ['Duomo Hill', 'Bridge of Shops', 'Loggia Square', "Potters' Quarter", 'Hillside Gardens', 'Old Harbour'] },
    { id: 'vintage', name: 'Maple Row', x: 5.4, z: -0.2, radius: 450, coreY: 10, relief: 18, landmarkHeight: 30, terrain: 'autumn maple forest, rocky coves and covered-bridge creeks', districts: ['Carousel Pier', 'Awning Main Street', 'Diner Row', 'Cider Orchard Edge', 'Strait Bridgehead'] },
    { id: 'islamic', name: 'Madinat an-Nur', x: 2.6, z: 2.0, radius: 550, coreY: 20, relief: 20, landmarkHeight: 50, terrain: 'terraced orange groves, snowmelt channels, white hill villages', districts: ['Great Masjid & Reflecting Pool', 'Palace Gardens', "Tile Makers' Souq", 'Orange Court Quarter', "Calligraphers' Library", 'Sea Gate'] },
    { id: 'middleeast', name: 'Souq al-Qamar', x: 5.3, z: 2.4, radius: 500, coreY: 8, relief: 15, landmarkHeight: 35, terrain: 'sand-coloured coastal plain, date palms, wadis', districts: ['Fort-Souq', 'Covered Souq', 'Wind-Tower Quarter', 'Dhow Harbour', 'Date Gardens', 'Lantern Alley'] },
    { id: 'indiasouth', name: 'Kaveri Coast', x: -3.4, z: 4.3, radius: 450, coreY: 2, relief: 20, landmarkHeight: 45, terrain: 'coconut coast, backwater canals and paddy, monsoon hills', districts: ['Gopuram Gate', 'Canal Quarter', 'Spice Market', 'Jasmine Lanes', 'Elephant Grove'] },
    { id: 'indianorth', name: 'Gulabi Nagar', x: -1.5, z: 3.4, radius: 550, coreY: 30, relief: 12, landmarkHeight: 32, terrain: 'dry plain, small dunes, a palace lake and stepwells', districts: ['Palace of Winds', 'Bazaar Walls', 'Lake Palace Ghats', 'Stepwell Square', "Potters' Gate"] },
    { id: 'mughal', name: 'Bagh-e-Noor', x: 0.6, z: 4.0, radius: 450, coreY: 50, relief: 25, landmarkHeight: 55, terrain: 'lotus-lake vale, chinar trees, terraced water gardens, rose fields', districts: ['White Tomb Charbagh', 'Terrace Water Garden', 'Lotus Lake Ghats', 'Red Gate Bazaar', 'Saffron Fields'] },
    { id: 'egypt', name: 'Nile Crossing', x: 3.1, z: 4.3, radius: 450, coreY: 4, relief: 8, landmarkHeight: 80, terrain: 'green river ribbon between limestone cliffs and open desert', districts: ['Pyramid Plateau', 'Obelisk Quay', 'Felucca Harbour', 'Papyrus Workshops', 'Dovecote Village'] },
    { id: 'desert', name: 'Tents of Rimal', x: 5.6, z: 4.6, radius: 400, coreY: 15, relief: 35, landmarkHeight: 25, terrain: 'golden erg with star dunes around a great oasis', districts: ['Oasis Pool', 'Great Majlis Tent', "Weavers' Tents", 'Camel Yard', 'Star Dune'] },
  ],
  segments: [
    { id: 1, name: 'The Arctic Shore', from: 'aurora', to: 'norway', cls: 'H', via: [[-4.6, -3.85], [-3.7, -3.8]], terrain: 'tundra → arctic coast → fjord cliffs',
      sightings: [
        S('s1-1', 'Stilljord Ice', 'frozen-lake', 0.22, 1, 200, 'A frozen lake of pressure ridges and ice-fishing holes.'),
        S('s1-2', 'The Reindeer Crossing', 'herd', 0.42, -1, 60, 'A herd drifts across the road at its own pace.', 'reindeer'),
        S('s1-3', 'The Stacks', 'sea-stacks', 0.62, -1, 260, 'Sea stacks and an arch, the aurora behind them at night.'),
        S('s1-4', 'Cliff Spout', 'waterfall', 0.82, -1, 180, 'A waterfall dropping straight off the cliff into the bay.', 'sea-cliff'),
      ],
      settlements: [
        V('v1-1', 'Revontuli Camp', 'hut-camp', 'aurora', 0.32, 1, 380, 'aurora-dome', 'Glass-dome huts, a sauna, reindeer pens and a ring of sky-watching benches.'),
        V('v1-2', 'Rorbu Point', 'fishing', 'norway', 0.72, -1, 300, 'lanterns', 'Red stilt cabins over the water, drying racks and an arched bridge to an islet.'),
      ] },
    { id: 2, name: 'The Troll Ladder', from: 'norway', to: 'switzerland', cls: 'H', via: [[-2.2, -3.3], [-1.3, -3.0]], terrain: 'fjord → hairpin ladder → plateau lakes → alpine valley',
      sightings: [
        S('s2-1', 'Seven Sisters', 'waterfall', 0.18, -1, 240, 'Triple falls seen across the fjord from the shore road.', 'triple'),
        S('s2-2', 'The Ladder', 'cliffs', 0.38, 0, 0, 'Eleven hairpins up a sheer wall, a waterfall under the bridge at bend six.', 'hairpins'),
        S('s2-3', 'Eagle Deck', 'viewpoint', 0.55, 1, 60, 'A thread rest jutting out high above the fjord.'),
        S('s2-4', 'Plateau Tongue', 'glacier', 0.8, -1, 500, 'Snowmelt lakes and cairns, then a glacier tongue and its lake.'),
      ],
      settlements: [
        V('v2-1', 'Grasstak', 'turf-hamlet', 'norway', 0.28, 1, 260, 'smoke', 'Black timber cottages with grass roofs, sheep and a weaver.'),
        V('v2-2', 'High Seter', 'farm-village', 'switzerland', 0.68, 1, 340, 'bells', 'A summer dairy on a flower shelf: goat huts, a cheese kitchen, cowbells.'),
      ] },
    { id: 3, name: 'The Three Passes', from: 'switzerland', to: 'london', cls: 'H', via: [[0.5, -3.0], [1.4, -3.2]], terrain: 'pass summit → waterfall valley → honey-stone downs → chalk coast',
      sightings: [
        S('s3-1', 'Grimsel Tarn', 'lake', 0.2, 1, 180, 'A dammed turquoise lake among ice-polished slabs.', 'turquoise'),
        S('s3-2', 'Valley of Falls', 'falls-valley', 0.42, -1, 350, 'A sheer valley with a dozen ribbon falls, one turning to mist.'),
        S('s3-3', 'Packhorse Bridge', 'bridge', 0.64, 1, 80, 'An old stone bridge over the young Tamesis.', 'packhorse'),
        S('s3-4', 'The White Cliffs', 'cliffs', 0.84, -1, 400, 'Chalk cliffs in a wave-cut row where the road touches the sea.', 'chalk'),
      ],
      settlements: [
        V('v3-1', 'Wengi', 'mountain-village', 'switzerland', 0.34, -1, 420, 'bells', 'A car-free cliff village above the falls, with a chalet inn and a telescope.'),
        V('v3-2', 'Stonerow', 'weavers', 'london', 0.72, 1, 300, 'smoke', 'Honey-stone cottages on a stream, a mill wheel and a wool market.'),
      ] },
    { id: 4, name: 'The Sound', from: 'london', to: 'newyork', cls: 'H', via: [[3.3, -3.4], [4.3, -3.3]], terrain: 'estuary marsh → heath headland → Sound bridge',
      sightings: [
        S('s4-1', 'Red-Sail Flats', 'marsh', 0.2, -1, 220, 'Tidal mudflats with red-sailed barges waiting for the tide.', 'estuary'),
        S('s4-2', 'Heath Light', 'lighthouse', 0.42, -1, 300, 'A striped lighthouse on a stack off the heath.'),
        S('s4-3', 'Russet Covered Bridge', 'bridge', 0.62, 1, 90, 'A covered bridge over a creek in autumn colour.', 'covered'),
        S('s4-4', 'The Sound Reveal', 'viewpoint', 0.85, -1, 50, 'The New Yonder skyline across the harbour, best at dusk.'),
      ],
      settlements: [
        V('v4-1', 'Gull Harbour', 'fishing', 'vintage', 0.3, -1, 320, 'lanterns', 'Clapboard huts, stacked lobster pots and a chowder stall.'),
        V('v4-2', "Keeper's Light", 'lighthouse', 'london', 0.52, -1, 380, 'lighthouse', 'One keeper, a tiny garden, and a letter that needs delivering.'),
      ] },
    { id: 5, name: 'The Fire-and-Ice Coast', from: 'aurora', to: 'korea', cls: 'H', via: [[-5.9, -2.7], [-5.6, -1.9]], terrain: 'black-sand coast → geothermal field → taiga → pine coast',
      sightings: [
        // Heading south-west down the coast: the sea is on the right (+1), the land on the left.
        S('s5-1', 'Diamond Beach', 'iceberg-lagoon', 0.2, 1, 240, 'A glacier lagoon whose icebergs wash up on black sand.'),
        S('s5-2', 'Basalt Cave', 'pillars', 0.4, 1, 200, 'Hexagonal basalt columns around a sea cave.', 'basalt'),
        S('s5-3', 'Steaming Field', 'geyser', 0.6, -1, 160, 'Hot pools and a geyser that keeps its own time.'),
        S('s5-4', 'Taiga Mirror', 'aurora-sky', 0.8, -1, 150, 'Still taiga lakes that hold the aurora at night.'),
      ],
      settlements: [
        V('v5-1', 'Steamvale', 'hot-spring', 'norway', 0.5, -1, 300, 'smoke', 'Turf bathhouses, separate for men and women, and boardwalks over warm ground.'),
        V('v5-2', 'Taiga Lodge', 'hut-camp', 'aurora', 0.72, -1, 360, 'fire', 'Log cabins round a fire, a sled track and a resident owl.'),
      ] },
    { id: 6, name: 'Tea and Blossom', from: 'korea', to: 'japan', cls: 'H', via: [[-4.3, -0.6], [-3.5, -0.4]], terrain: 'tea terraces → volcanic cone coast → cherry river',
      sightings: [
        S('s6-1', 'Combed Tea Hills', 'terraces', 0.2, 1, 200, 'Green tea rows combed round a hill, a platform at the top.', 'tea'),
        S('s6-2', 'Sunrise Cone', 'crater', 0.4, -1, 450, 'A tuff cone rising straight from the sea.'),
        S('s6-3', 'Petal Stream', 'blossom-grove', 0.62, 1, 90, 'A cherry tunnel over a stream, with a red arched bridge.', 'cherry'),
        S('s6-4', 'Ember Gorge', 'autumn-gorge', 0.82, -1, 180, 'Granite crags and maples that burn red in autumn.', 'maple'),
      ],
      settlements: [
        V('v6-1', 'Dawon', 'farm-village', 'korea', 0.3, 1, 280, 'smoke', "Tea pickers' village with drying sheds and a tea house."),
        V('v6-2', 'Squid-Light Cove', 'fishing', 'korea', 0.5, -1, 340, 'lanterns', 'Drying racks and lamp-boats that glow on the water at night.'),
      ] },
    { id: 7, name: 'Above the Clouds', from: 'korea', to: 'china', cls: 'H', via: [[-5.0, 0.0], [-4.9, 0.9]], terrain: 'granite crags & cloud sea → crane marsh → first karst',
      sightings: [
        S('s7-1', 'Cloud Sea Peaks', 'pillars', 0.25, -1, 350, 'Granite peaks and cliff pines above a morning sea of cloud.', 'granite-clouds'),
        S('s7-2', 'Crane Reeds', 'marsh', 0.5, 1, 200, 'A reed marsh where cranes step slowly.', 'cranes'),
        S('s7-3', 'First Karst', 'karst', 0.78, 1, 400, 'The first limestone towers appear as the road crests.'),
      ],
      settlements: [
        V('v7-1', 'Cloud Gate Retreat', 'monastery', 'china', 0.35, -1, 450, 'bells', 'Three hundred stone steps to a hilltop library-retreat and bell pavilion. Architecture only.'),
        V('v7-2', 'Crane Marsh', 'stilt-village', 'china', 0.6, 1, 300, 'lanterns', 'Stilt huts, boardwalks and a boat-builder.'),
      ] },
    { id: 8, name: 'The Inner Mountain Road', from: 'japan', to: 'china', cls: 'H', via: [[-3.2, 0.6], [-4.0, 1.5]], terrain: 'cedar post road → bamboo → karst river',
      sightings: [
        S('s8-1', 'Old Road Cedars', 'forest', 0.2, 1, 70, 'Tall cedars shading an old stone-paved road beside the highway.', 'cedar'),
        S('s8-2', 'Husband and Wife Falls', 'waterfall', 0.4, -1, 220, 'Two falls side by side, one tall, one short.', 'twin'),
        S('s8-3', 'Bamboo Tunnel', 'bamboo-forest', 0.6, 0, 0, 'The road passes through a green tunnel of bamboo.'),
        S('s8-4', 'Reflected Towers', 'karst', 0.84, 1, 260, 'Karst towers doubled in the Jade River, bamboo rafts drifting by.', 'river'),
      ],
      settlements: [
        V('v8-1', 'Kiso-juku', 'mountain-village', 'japan', 0.3, 1, 260, 'lanterns', 'A post town of timber inns, a water wheel and an old signboard.'),
        V('v8-2', 'Yuzawa', 'hot-spring', 'japan', 0.52, -1, 380, 'smoke', 'Steaming pools among snow-dusted cedars.'),
      ] },
    { id: 9, name: "Dragon's Backbone", from: 'china', to: 'indonesia', cls: 'H', via: [[-5.3, 2.8], [-5.3, 3.6]], terrain: "dragon's-backbone terraces → sandstone pillars → mangrove estuary → causeway",
      sightings: [
        S('s9-1', "Dragon's Backbone", 'terraces', 0.18, 1, 260, 'Rice terraces wrapping a ridge from river to summit.', 'rice'),
        S('s9-2', 'Pillar Forest', 'pillars', 0.36, -1, 320, 'Sandstone pillars standing in mist.', 'sandstone'),
        S('s9-3', 'Mangrove Mouth', 'mangrove', 0.5, 1, 180, 'A mangrove estuary of arching roots.'),
        S('s9-4', 'Three-Arch Causeway', 'bridge', 0.64, 0, 0, 'A causeway to the islands, the volcano across the strait.', 'causeway'),
      ],
      settlements: [
        V('v9-1', 'Longji Stilts', 'stilt-village', 'china', 0.26, 1, 300, 'bells', 'Wooden stilt houses, a drum tower and water buffalo.'),
        V('v9-2', 'Mangrove Stilts', 'fishing', 'indonesia', 0.47, -1, 220, 'lanterns', 'Houses on piles, a plank walk and fish traps.'),
      ] },
    { id: 10, name: 'Fire Mountains', from: 'indonesia', to: 'indiasouth', cls: 'H', via: [[-4.75, 4.35], [-4.1, 4.35]], terrain: 'caldera rim → black beach → strait → palm coast',
      sightings: [
        S('s10-1', 'Sand-Sea Caldera', 'volcano', 0.15, -1, 450, 'A smoking cone in a caldera of grey sand, best at sunrise.', 'caldera'),
        S('s10-2', 'Blue-Flame Crater', 'crater', 0.32, 1, 380, 'A turquoise crater lake that glows with blue flame at night.', 'blue-fire'),
        S('s10-3', 'Outrigger Sands', 'palm-coast', 0.6, 1, 150, 'Black sand, palms and outrigger canoes.', 'black-sand'),
        S('s10-4', 'Water Gates', 'terraces', 0.82, -1, 220, 'Terraces fed by shared channels and water gates.', 'channels'),
      ],
      settlements: [
        V('v10-1', 'Rim Village', 'mountain-village', 'indonesia', 0.22, -1, 320, 'fire', 'A caldera-rim hamlet with a sunrise viewpoint and pony stable.'),
        V('v10-2', 'Outrigger Bay', 'fishing', 'indonesia', 0.7, 1, 260, 'lanterns', 'Canoes on the sand and a net-mending shade.'),
      ] },
    { id: 11, name: 'Backwaters to the Plain', from: 'indiasouth', to: 'indianorth', cls: 'H', via: [[-2.6, 3.9]], terrain: 'backwaters → monsoon hills & tea → dry plain',
      sightings: [
        S('s11-1', 'Houseboat Canals', 'backwaters', 0.2, 1, 180, 'Canals of houseboats between paddy and coconut palms.'),
        S('s11-2', 'Monsoon Curtain', 'waterfall', 0.42, -1, 300, 'A broad curtain of water spilling over a hill edge.', 'curtain'),
        S('s11-3', 'Misty Tea Hills', 'terraces', 0.62, -1, 250, 'Rounded tea bushes clipped in rows over misty hills.', 'tea-hills'),
        S('s11-4', 'The Deep Stepwell', 'stepwell', 0.84, 1, 120, 'A geometric stepwell descending to cool water.'),
      ],
      settlements: [
        V('v11-1', 'Kuttanad Jetty', 'river-village', 'indiasouth', 0.26, 1, 240, 'lanterns', 'Moored houseboats you can board and rent.'),
        V('v11-2', 'Tea Estate', 'farm-village', 'indiasouth', 0.55, 1, 340, 'smoke', "A bungalow, a small factory and pickers' paths."),
      ] },
    { id: 12, name: 'White Desert, Lotus Vale', from: 'indianorth', to: 'mughal', cls: 'H', via: [[-0.8, 4.35], [0.0, 4.3]], terrain: 'dunes & salt flat → canal fields → garden vale',
      sightings: [
        S('s12-1', 'Camel Dunes', 'dunes', 0.18, 1, 260, 'A dune field with a camel caravan on the crest.', 'caravan'),
        S('s12-2', 'The White Flat', 'salt-flat', 0.36, 0, 0, 'A dead-straight causeway across a hexagon-crusted salt flat.'),
        S('s12-3', 'Lake Palace', 'lake', 0.6, -1, 300, 'A small palace floating on a still lake.', 'palace'),
        S('s12-4', 'Mustard Fields', 'flower-field', 0.82, 1, 120, 'Canal-watered fields of mustard and wheat.', 'mustard'),
      ],
      settlements: [
        V('v12-1', 'Sam Dunes Camp', 'tent-camp', 'indianorth', 0.24, 1, 400, 'fire', 'Canvas tents, a fire circle, musicians and sand-sledding.'),
        V('v12-2', 'Bhunga Salt Village', 'weavers', 'indianorth', 0.46, -1, 300, 'lanterns', 'Round mud huts with mirror-work walls, salt heaps and embroidery.'),
      ] },
    { id: 13, name: 'Gardens to the River', from: 'mughal', to: 'egypt', cls: 'H', via: [[1.6, 4.3], [2.4, 4.4]], terrain: 'lotus vale → dry hills → Long River greenbelt',
      sightings: [
        S('s13-1', 'Twelve-Step Garden', 'terraces', 0.18, -1, 200, 'A terraced water garden climbing a slope in twelve steps.', 'water-garden'),
        S('s13-2', 'Floating Gardens', 'lotus-lake', 0.3, -1, 280, 'Lotus and floating gardens with canopied boats.'),
        S('s13-3', 'Lone Acacia Hills', 'pillars', 0.56, 1, 250, 'Dry sandstone hills and a single acacia.', 'sandstone-hills'),
        S('s13-4', 'The Greenbelt', 'viewpoint', 0.82, 1, 60, 'Green fields on one side, cliffs and sand on the other, sails on the river.'),
      ],
      settlements: [
        V('v13-1', 'Khan al-Wasat', 'caravanserai', 'middleeast', 0.45, -1, 280, 'fire', 'A courtyard inn with a well, arcades, camels and merchants.'),
        V('v13-2', 'Reedhaven', 'river-village', 'egypt', 0.72, -1, 260, 'lanterns', 'Reed boats and paper-makers on the riverbank.'),
      ] },
    { id: 14, name: 'Black, White, Gold', from: 'egypt', to: 'desert', cls: 'H', via: [[4.0, 4.5], [4.8, 4.6]], terrain: 'greenbelt → black & white deserts → salt-lake oasis → erg',
      sightings: [
        S('s14-1', 'Black Desert', 'pillars', 0.2, -1, 280, 'Basalt-capped hills on dark ground.', 'basalt-hills'),
        S('s14-2', 'White Desert', 'pillars', 0.38, 1, 260, 'Chalk mushrooms and wind-carved towers on pale sand.', 'chalk'),
        S('s14-3', 'Mirror Pools Oasis', 'oasis', 0.56, 1, 280, 'A salt-lake oasis of palm islands and mirror pools.'),
        S('s14-4', 'The Mega-Dune', 'dunes', 0.82, -1, 350, 'A ninety-metre dune with a clean slipface beside the road.', 'mega'),
      ],
      settlements: [
        V('v14-1', 'Siwa Oasis', 'oasis-camp', 'egypt', 0.7, 1, 420, 'lanterns', 'A mud-brick hill town, salt pools to float in, date palms.'),
        V('v14-2', "Bayt ash-Sha'r", 'tent-camp', 'desert', 0.74, -1, 380, 'fire', 'Black goat-hair tents, coffee over the fire, and stars.'),
      ] },
    { id: 15, name: 'The Blue Ridge Parkway', from: 'newyork', to: 'vintage', cls: 'H', via: [[5.9, -2.0], [5.8, -1.0]], terrain: 'Palisade river → blue ridges → foliage valleys',
      sightings: [
        S('s15-1', 'The Palisades', 'cliffs', 0.18, -1, 200, 'Tall cliffs along the river.', 'palisade'),
        S('s15-2', 'Layered Blue', 'viewpoint', 0.4, -1, 50, 'Overlooks onto ridge after ridge turning blue with distance.', 'blue-ridges'),
        S('s15-3', 'Gold Creek Covered Bridge', 'bridge', 0.6, 1, 70, 'A covered bridge in red and gold foliage.', 'covered'),
        S('s15-4', 'Tiered Falls', 'waterfall', 0.8, -1, 200, 'A stepped waterfall in a forest gorge.', 'tiered'),
      ],
      settlements: [
        V('v15-1', 'Cider Mill Farm', 'orchard', 'vintage', 0.5, 1, 300, 'smoke', 'An orchard, a press, a pumpkin field and a farm stand.'),
        V('v15-2', 'Loon Lake', 'river-village', 'vintage', 0.7, -1, 380, 'lanterns', 'Canoes, a dock and loons calling at dusk.'),
      ] },
    { id: 16, name: 'The Strait', from: 'vintage', to: 'middleeast', cls: 'H', via: [[5.6, 0.4], [5.6, 1.5]], terrain: 'coves → Strait Bridge → coastal sabkha → date palms',
      sightings: [
        S('s16-1', 'Arch Cove', 'sea-arch', 0.15, 1, 260, 'Rocky coves and a sea arch.'),
        S('s16-2', 'The Strait Bridge', 'bridge', 0.4, 0, 0, 'The longest bridge in the world, ships passing beneath.', 'strait'),
        S('s16-3', 'Flamingo Sabkha', 'salt-flat', 0.68, 1, 240, 'A coastal salt flat pink with flamingos.', 'flamingo'),
        S('s16-4', 'Turquoise Wadi', 'oasis', 0.86, 1, 300, 'A palm gorge of turquoise pools along a footpath.', 'wadi'),
      ],
      settlements: [
        V('v16-1', 'Dhow Yard', 'fishing', 'middleeast', 0.72, 1, 300, 'fire', 'Dhows being built on the beach, nets and a fish grill.'),
        V('v16-2', 'Wadi Village', 'farm-village', 'middleeast', 0.88, -1, 280, 'smoke', 'Irrigation channels running between walled gardens.'),
      ] },
    { id: 17, name: 'Rose Mountain to Red Sand', from: 'middleeast', to: 'desert', cls: 'H', via: [[5.8, 3.3], [5.9, 4.0]], terrain: 'Hajar ridge & wadis → red sandstone → dune sea',
      sightings: [
        S('s17-1', 'Rose Mountain', 'terraces', 0.25, -1, 300, 'Stepped orchards and rose beds on a steep face.', 'rose'),
        S('s17-2', 'Red Arches', 'rock-arch', 0.5, 1, 260, 'A red sandstone massif with natural arches and rock bridges.'),
        S('s17-3', 'The Gold Reveal', 'dunes', 0.78, 1, 400, 'The golden dune sea, revealed from a col.'),
      ],
      settlements: [
        V('v17-1', 'Rose Terraces', 'mountain-village', 'middleeast', 0.32, -1, 380, 'smoke', 'A rose-water still, pomegranate trees and a steep stair.'),
        V('v17-2', 'Najm Camp', 'tent-camp', 'desert', 0.62, 1, 420, 'fire', 'Tents tucked against red cliffs: rugs, a telescope and almost no light.'),
      ] },
    { id: 18, name: 'The North Shore', from: 'renaissance', to: 'vintage', cls: 'H', via: [[3.6, -0.55], [4.6, -0.5]], terrain: 'cypress hills → travertine terraces → sea cliffs → autumn woods',
      sightings: [
        S('s18-1', 'Cypress S-Road', 'cypress-hills', 0.18, -1, 200, 'A cypress-lined S-road up a wheat hill to a walled tower.'),
        S('s18-2', 'White Terraces', 'hot-springs', 0.4, -1, 260, 'White travertine terraces of warm blue pools.', 'travertine'),
        S('s18-3', 'Umbrella Pine Cliffs', 'cliffs', 0.62, 1, 160, 'Sea cliffs with a lone umbrella pine.', 'pine'),
        S('s18-4', 'First Maples', 'forest', 0.84, -1, 120, 'Where the land cools, the first maples turn.', 'maple'),
      ],
      settlements: [
        V('v18-1', 'Monticello', 'mountain-village', 'renaissance', 0.26, -1, 400, 'bells', 'A small walled hill town with one tower and a bakery.'),
        V('v18-2', 'Frantoio', 'orchard', 'renaissance', 0.5, -1, 300, 'smoke', 'An olive-press farm: stone press, groves and oil jars.'),
      ] },
    { id: 19, name: 'The West Shore', from: 'renaissance', to: 'islamic', cls: 'H', via: [[2.4, 0.4], [2.45, 1.3]], terrain: 'olive terraces → marble ridge → Sierra white villages → orange groves',
      sightings: [
        S('s19-1', 'Marble Ridge', 'quarry', 0.2, -1, 300, 'White quarry cuts and stepped benches.'),
        S('s19-2', 'Glittering Sea', 'viewpoint', 0.42, 1, 40, 'The Middle Sea glittering from a high bend.'),
        S('s19-3', 'White Villages', 'terraces', 0.64, -1, 350, 'White villages clinging to a slope, fed by snowmelt channels.', 'white-villages'),
        S('s19-4', 'Orange Falls', 'waterfall', 0.84, -1, 180, 'Irrigation water tumbling through orange terraces.', 'orange-terraces'),
      ],
      settlements: [
        V('v19-1', 'Quarry Camp', 'mountain-village', 'renaissance', 0.26, -1, 260, 'smoke', 'Marble blocks, a crane, and a carver who teaches.'),
        V('v19-2', 'Qaryat al-Bayda', 'mountain-village', 'islamic', 0.7, -1, 320, 'lanterns', 'Flat roofs, covered alleys, water channels and a carpet loom.'),
      ] },
    { id: 20, name: 'Kasbah Road', from: 'islamic', to: 'egypt', cls: 'H', via: [[2.5, 2.9], [2.8, 3.7]], terrain: 'Atlas hairpins → kasbah valley → gorge → river',
      sightings: [
        S('s20-1', 'Atlas Hairpins', 'cliffs', 0.2, 0, 0, 'Hairpins over a high pass.', 'hairpins'),
        S('s20-2', 'Earthen Ksar', 'viewpoint', 0.42, 1, 60, 'A fortified earthen village stacked on a hill above a river.', 'ksar'),
        S('s20-3', 'The Narrow Gorge', 'canyon', 0.62, 0, 0, 'Walls a hundred and fifty metres high, just wider than the road.', 'narrow'),
        S('s20-4', 'Ribbon Oasis', 'oasis', 0.84, 1, 160, 'Palms following a dry river.', 'ribbon'),
      ],
      settlements: [
        V('v20-1', 'Ksar Tamdakht', 'kasbah', 'middleeast', 0.45, 1, 300, 'smoke', 'Mud towers, a well and a date market.'),
        V('v20-2', 'Caravanserai of the Pass', 'caravanserai', 'islamic', 0.25, -1, 220, 'fire', 'A mule yard and a mint-tea fire.'),
      ] },
    { id: 21, name: 'The Delta', from: 'middleeast', to: 'egypt', cls: 'H', via: [[4.6, 2.6], [3.9, 2.7]], terrain: 'south shore sabkha → delta lagoons → papyrus',
      sightings: [
        S('s21-1', 'Mirror Sabkha', 'salt-flat', 0.2, 1, 200, 'A salt flat that mirrors the sky after rain.', 'mirror'),
        S('s21-2', 'Pharos Light', 'lighthouse', 0.36, -1, 400, 'A tall lighthouse at the end of the sea mole.', 'pharos'),
        S('s21-3', 'Papyrus Lagoons', 'marsh', 0.58, -1, 220, 'Delta lagoons of papyrus and herons.', 'papyrus'),
        S('s21-4', 'Dovecote Fields', 'windmills', 0.8, 1, 150, 'Tall dovecote towers standing in the fields.', 'dovecotes'),
      ],
      settlements: [
        V('v21-1', 'Lagoon Hamlet', 'fishing', 'egypt', 0.5, -1, 300, 'lanterns', 'Reed huts and flat-bottomed boats.'),
        V('v21-2', 'Burg al-Hamam', 'river-village', 'egypt', 0.74, 1, 260, 'smoke', 'Dovecotes, mud-brick houses and a water wheel.'),
      ] },
    { id: 22, name: 'The Grand Tour', from: 'london', to: 'renaissance', cls: 'H', via: [[2.1, -2.4], [2.3, -1.4]], terrain: 'highland glen → tarns → alpine lake → Tuscan hills',
      sightings: [
        S('s22-1', 'Three Sisters Glen', 'meadow', 0.18, 1, 260, 'A highland glen of heather under three stepped peaks.', 'heather'),
        S('s22-2', 'Stone-Wall Tarns', 'lake', 0.36, 1, 200, 'Small tarns between dry-stone walls.', 'tarn'),
        S('s22-3', 'Lago Lungo', 'lake', 0.56, 1, 280, 'A long alpine lake with villa gardens and a steamer.', 'alpine'),
        S('s22-4', 'Gorge Viaduct', 'bridge', 0.8, 0, 0, 'A stone viaduct over a wooded gorge.', 'viaduct'),
      ],
      settlements: [
        V('v22-1', 'Croft of Glen', 'turf-hamlet', 'london', 0.25, 1, 320, 'smoke', 'Stone cottages, shaggy cattle and peat smoke.'),
        V('v22-2', 'Boathouse Bay', 'fishing', 'renaissance', 0.6, -1, 280, 'lanterns', 'Wooden boathouses and a steamer pier on the lake.'),
      ] },
    { id: 23, name: 'Up the Glacier River', from: 'meadow', to: 'switzerland', cls: 'H', via: [[-0.25, -1.0], [-0.55, -2.0]], terrain: 'high grassland → Glacier River gorge → alpine pastures',
      sightings: [
        S('s23-1', 'Rainbow Falls', 'waterfall', 0.22, 1, 260, 'A gorge waterfall whose spray makes a rainbow every sunny afternoon.', 'rainbow'),
        S('s23-2', 'Bell Pastures', 'flower-field', 0.44, -1, 150, 'Alpine flower slopes and the sound of cowbells.', 'alpine'),
        S('s23-3', 'The Horn', 'viewpoint', 0.64, -1, 50, 'A horn peak revealed around a bend.', 'horn'),
        S('s23-4', 'Milk Glacier', 'glacier', 0.86, 1, 500, 'The glacier and its milky river.'),
      ],
      settlements: [
        V('v23-1', 'Rainbow Hill', 'cottages', 'meadow', 0.34, -1, 380, 'rainbow', 'Round cottages with painted roofs on a windy upland: rainbows by day, a sky thick with stars by night, a stargazing hill and a bee meadow.'),
        V('v23-2', 'Jailoo Camp', 'tent-camp', 'aurora', 0.56, -1, 420, 'smoke', 'White felt tents by a high lake, horses and a yoghurt stall.'),
      ] },
    { id: 24, name: 'Blossom Road', from: 'meadow', to: 'japan', cls: 'H', via: [[-1.0, -0.1], [-1.9, -0.3]], terrain: 'flower downs → birch and oak → cherry hills & snow cone',
      sightings: [
        S('s24-1', 'Windmill Ridge', 'windmills', 0.18, 1, 200, 'A row of windmills over a sea of flowers.'),
        S('s24-2', 'Wisteria Tunnel', 'blossom-grove', 0.38, 0, 0, 'The road runs under hanging wisteria.', 'wisteria'),
        S('s24-3', 'Drifting Petals', 'blossom-grove', 0.6, -1, 90, 'A hillside cherry grove whose petals cross the road.', 'cherry'),
        S('s24-4', 'Snow Cone Mirror', 'lake', 0.82, 1, 260, 'A still lake holding a snow-capped cone.', 'snow-cone'),
      ],
      settlements: [
        V('v24-1', 'Hanabatake', 'farm-village', 'japan', 0.28, 1, 300, 'windmill', 'Striped flower fields and a seed shop.'),
        V('v24-2', 'Firefly Hollow', 'cottages', 'japan', 0.7, -1, 280, 'lanterns', 'Cottages by a slow stream and a lantern bridge that wakes at dusk.'),
      ] },
    { id: 25, name: 'Wheat and Poppies', from: 'meadow', to: 'renaissance', cls: 'H', via: [[1.0, -0.5], [1.9, -0.7]], terrain: 'windmill ridge → poppy & wheat → cypress, first sea view',
      sightings: [
        S('s25-1', 'The Lone Tree', 'meadow', 0.2, 1, 220, 'A single great tree on a hill that hides the valley beyond.', 'lone-tree'),
        S('s25-2', 'Poppy Bands', 'flower-field', 0.4, -1, 120, 'Bands of red poppies through gold wheat.', 'poppy'),
        S('s25-3', 'The Aqueduct', 'bridge', 0.6, 1, 180, 'A stone aqueduct striding across a valley.', 'aqueduct'),
        S('s25-4', 'First Sight of the Sea', 'viewpoint', 0.84, 1, 40, 'The Middle Sea, seen for the first time from a crest.'),
      ],
      settlements: [
        V('v25-1', 'Mulino', 'farm-village', 'renaissance', 0.3, -1, 260, 'windmill', 'A flour mill and a bakery.'),
        V('v25-2', 'Apiary Hamlet', 'orchard', 'renaissance', 0.66, -1, 300, 'smoke', 'Hives in lavender and a honey stall.'),
      ] },
    { id: 26, name: 'Under the Sky Isles', from: 'meadow', to: 'islamic', cls: 'H', via: [[0.6, 0.9], [1.4, 1.35]], terrain: 'grassland → Mirror Lake shore → lavender & rose → orange groves',
      sightings: [
        S('s26-1', 'Mirror of the Isles', 'viewpoint', 0.25, 1, 60, 'Mirror Lake holding the Sky Isles upside down.'),
        S('s26-2', 'Cloud Falls', 'waterfall', 0.36, 1, 420, 'Water falling from the isles into the lake, gold at night.', 'cloud-falls'),
        S('s26-3', 'Lavender and Rose', 'flower-field', 0.58, -1, 140, 'Fields of lavender and damask roses.', 'lavender'),
        S('s26-4', 'Orange Terraces', 'terraces', 0.82, -1, 200, 'Terraced orange groves in scented rows.', 'orange'),
      ],
      settlements: [
        V('v26-1', 'Lanternside', 'river-village', 'meadow', 0.3, 1, 260, 'lanterns', "A lakeside hamlet where every house hangs a lamp: the lantern-makers' home and the foot of the Lantern Stair."),
        V('v26-2', 'Khan an-Nahr', 'caravanserai', 'islamic', 0.52, 1, 280, 'fire', 'A courtyard inn beside the lake outlet.'),
      ] },
    { id: 27, name: 'The Roof Pass', from: 'meadow', to: 'mughal', cls: 'S', via: [[-0.5, 1.1], [-0.35, 2.2], [0.15, 3.1]], terrain: 'grassland → granite needles → turquoise lake → snow pass → chinar vale',
      sightings: [
        S('s27-1', 'Cathedral Needles', 'pillars', 0.2, -1, 450, 'A row of granite needle peaks.', 'needles'),
        S('s27-2', 'Turquoise Lake Footbridge', 'lake', 0.36, 1, 240, 'A turquoise lake crossed by a swaying footbridge.', 'turquoise-bridge'),
        S('s27-3', 'Pennant Summit', 'viewpoint', 0.52, 0, 0, 'A snow-walled summit hung with coloured cloth pennants.', 'pass-summit'),
        S('s27-4', 'Cliff Retreat View', 'viewpoint', 0.66, -1, 60, 'A retreat stacked up a crag across the valley.', 'cliff-retreat'),
        S('s27-5', 'Chinar Vale', 'forest', 0.86, 1, 120, 'The descent into chinar trees and lotus water.', 'chinar'),
      ],
      settlements: [
        V('v27-1', 'Glacier Hut', 'hut-camp', 'switzerland', 0.44, 1, 300, 'fire', "The world's highest bed, beside the ice."),
        V('v27-2', 'Ridge Retreat', 'monastery', 'indianorth', 0.62, -1, 420, 'bells', 'A white-and-ochre retreat on a crag with a library. Architecture only.'),
        V('v27-3', 'Apricot Terraces', 'orchard', 'mughal', 0.78, -1, 300, 'smoke', 'Orchards and flat roofs drying fruit, near a glacier snout.'),
      ] },
  ],
};
