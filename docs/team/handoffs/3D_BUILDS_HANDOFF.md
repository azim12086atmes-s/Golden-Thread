# 3D builds handoff — for the model doing the 3D work (written 2026-09-27)

You are taking over the **3D building work** of *The Golden Thread*: monuments, buildings, lights, vehicles, props and
characters' accessories. Another model may be working on game rules (charity, institutions, jobs) at the same time;
this file tells you exactly what to build, how the engine expects it, and the rules you must never break.

Read first: `CLAUDE.md` (content rules, code map), `docs/team/handoffs/NEXT_WORK_2026-09-27.md` (every open owner
request, verbatim), `docs/team/handoffs/CLAUDE_CLOUD_CURRENT_WORK.md` (what shipped; the owner's standing preferences),
`docs/ARCHITECTURE_RESEARCH.md` (sources for every land's architecture and vehicles).

Repository `azim12086atmes-s/Golden-Thread`, branch **`claudes-current-work`**. Live build:
https://azim12086atmes-s.github.io/Golden-Thread/ (earlier builds under `/versions/`), published with
`bash scripts/deploy-pages.sh`. Before every push: `npx vitest run` (412 tests) and `npx tsc --noEmit` must pass.

---

## 1. Absolute rules (enforced by tests — change the model, never the test)

1. **No eyes, nose or mouth** on any person or animal, ever (statues, carvings, figureheads and creature-shaped vehicles
   included — keep faces blank). Glasses on the two travellers and the boy's beard/hair are allowed (GT-CHAR-001).
2. **Heads float**, detached from the neck: people by `HEAD_GAP` (0.16 m), animals by `animalHeadGap(headR)`
   (`src/characters/anatomy.ts`). Applies to statues and animal-shaped carvings too.
3. Every character/animal mesh is tagged `userData.part` with one of `ALLOWED_PARTS`; nothing else may be built.
4. **The two travellers never touch** and never share a seat or mount; seats ≥ `SEAT_GAP` apart with a divider.
5. **Modest clothing** only, through `modestify()` in `src/characters/outfits.ts`.
6. Peaceful, family-friendly; Islamic principles from the owner's brief (no alcohol, gambling, idols presented for
   worship, romance-touch). Religious buildings of every culture already exist as landmarks; keep them respectful.

## 2. How 3D is built in this project (read before modelling)

- **Everything is procedural three.js (r186) code — there are no model files.** Buildings are assembled from
  primitives in `src/world/kit.ts` (`box`, `cyl`, `cone`, `sphere`, `dome`, `onion`, `gable`, `hip`, `sweptRoof`,
  `archPanel`, `tent`, `tree`) into a `GeoBuilder`, which merges a whole land into a few draw calls. Parts added to
  `c.g` are lit; parts added to `c.glow` (windows, lamps, lanterns) brighten at night. Keep glowing area small.
- **Local frame**: origin at the building's base centre, the street front facing **+z**. Kit boxes/cylinders/cones stand
  *on* their y; spheres are centred. A house builder returns a `Footprint` `{ r, h }` (collision radius, top height).
- **Surfaces**: brick, cut stone, plaster, tiles, thatch, marble, adobe, cloth, snow, steel, glass… are drawn by a shader
  (`src/world/surfaces.ts`, ids in `SURF`). Colours listed per land in `LAND_SURFACES` pick a surface automatically, or
  set `c.g.surface = SURF.x` around parts (see `surf()` in `traditions.ts`, `withSurface()` in `facade.ts`).
- **Facade kit** (`src/world/facade.ts`): windows with frames/sills/bars/heads/shutters, doors with fanlights and
  pilasters, balconies (iron, balustrade, carved wood), bay windows, cornices, roofs (parapet, mansard + dormers, gable,
  hip, chalet), quoins, pilasters, string courses, wings, turrets, porches, stoops. `compose(c, FACADES.x)` builds a
  European-style house; add new styles to `FACADES`.
- **Traditional kit** (`src/world/traditions.ts`): per-land builders for the 13 non-European lands (machiya, hanok,
  Chinese hall with dougong, riad with zellige and merlons, Gulf house with barjeel and mashrabiya, Nubian vaults,
  Bedouin tent, haveli with jharokhas and chhatris, Kerala home, Mughal pishtaq pavilion, bale, tongkonan, lavvu, igloos,
  cabins, sky spires). Reusable helpers inside: `lattice` (koshi / hanji grid / jali), `dougong`, `merlons`, `barjeel`,
  `jharokha`, `chhatriKiosk`, `doorLeaf`, `glass`.
- **Vehicles and creatures that move** (`src/traffic/`): `shaper.ts` is a centred-primitive modelling kit (`box`, `ball`,
  `cyl`, `rod`, `cone`, `wheel`, `lathe`, `shape` extrusions, `hull` for boats; `glow` option). `creatures.ts` builds
  quadrupeds, birds, whales, koi and the serpent dragon as a few animated pieces (legs swing, wings flap, rotors spin).
  `designs.ts` is the catalogue (~85 designs), `roster.ts` says which travel in each land. Forward is +z.
- **Landmarks** (monuments): `landmarks` in `src/world/architecture.ts`, one function per land, built at the land's
  centre by `World.buildLandmarks()`; they set `o.colliders`, `o.platforms` and `o.height`. The Meadow's fairy castle
  is separate (`src/event/Castle.ts`). Every landmark gets a door on its south side automatically (`landmarkDoor` in
  `World.ts`) — keep the south approach open.
- **Budgets**: a land is a few draw calls; aim for ≤ ~150 k triangles per landmark, ≤ ~3 k per traffic design, ≤ ~8 k per
  house type. Use low segment counts (6–16) — "low poly with smoothers" is the owner's taste: smooth shading, clean
  silhouettes, real structure (not blobs).
- **Verify visually**: `scripts/probe/` (Playwright + software GL; README inside). `scripts/probe/example.js` shows how to
  teleport to a land and take screenshots. Always screenshot what you build, in day and night.

## 2a. Master checklist — architecture detailing, land by land

Status: **Done** = real architecture, screenshot-checked; **Built** = real architecture, checked only by tests;
**Early** = an old primitive build that needs detailing; **None** = not built.

| # | Land (`id`) | Houses | Monument (landmark) | City lighting | Also needed here |
|---|---|---|---|---|---|
| 1 | Wanderers' Meadow (`meadow`) | Done (fairy keeps, towers, cottages, toadstools, wizard towers) | Great Tree — Done; fairy castle (`event/Castle.ts`) — Early | Fairy lights — partial | Hogwarts-style magic school, potion shop → guild hall ladder, balloons |
| 2 | Sakura Hollow (`japan`) | Done (machiya, minka) | Pagoda — Early | Lamp posts only | Torii, stone tōrō lanterns, red arched bridge, lotus pond, koinobori |
| 3 | Hanok Village (`korea`) | Built (hanok, choga) | Palace hall — Early | Lamp posts only | Palace gate and walls, lotus pond |
| 4 | Jade Terraces (`china`) | Built (halls, shophouses) | Temple of Heaven — Early | Lamp posts only | More sky lanterns, red lantern strings, moon bridge, lotus pond, TCM herb stall → academy |
| 5 | Fjordhavn (`norway`) | Built (Bryggen facade kit) | Stave church — Early | Lamp posts only | Candle lanterns, timber bridges, boathouses |
| 6 | Alpenrose (`switzerland`) | Built (chalet facade kit) | Zytglogge clock tower — Early | Lamp posts only | Watch boutique → workshop → manufacture → school, stone bridges |
| 7 | Old London (`london`) | Done (Georgian/Victorian facade kit) | Westminster + Big Ben — Early | **Gas-lamp street lighting — None** | Stone and iron bridges, repair shop → works ladder |
| 8 | New Yonder (`newyork`) | Done (deco/glass towers, brownstones, lofts) | Art-deco crown tower — Early | Neon — partial | **Large display screens, TV panels, cyber/solarpunk artifacts, penthouses — None**; garage → tech campus |
| 9 | Firenzia (`renaissance`) | Done (palazzo facade kit) | Florence cathedral dome — Early | Lamp posts only | Stone bridges (Ponte Vecchio), workshops (botteghe) |
| 10 | Maple Row (`vintage`) | Built (Painted Ladies facade kit) | Carousel + bandstand — Early | Lamp posts only | Pier pavilion or ferris wheel |
| 11 | Madinat an-Nur (`islamic`) | Done (riads) | Court of the Lions / great mosque — Early | **Hanging brass lanterns — None** | Bookseller → library → madrasa → university/observatory, fountains |
| 12 | Souq al-Qamar (`middleeast`) | Built (Gulf houses, barjeel) | Coral-stone fort and souq — Early | Lamp posts only | Lantern-lit covered souq |
| 13 | Nile Crossing (`egypt`) | Built (Nubian houses) | Pylon temple + pyramids — Early | Lamp posts only | Nilometer, papyrus workshops, reed-boat jetties |
| 14 | Tents of Rimal (`desert`) | Built (Bedouin and round tents) | Great majlis tent + oasis — Early | **Tent lamps — None** | Tent schools, oasis palms |
| 15 | Gulabi Nagar (`indianorth`) | Done (havelis with jharokhas) | Hawa Mahal — Early | **Diyas — None** | Ayurveda garden → college, Jantar Mantar instruments, lotus pond |
| 16 | Kaveri Coast (`indiasouth`) | Built (Kerala homes) | Gopuram + temple tank — Early | Lamp posts only | Oil lamps (nilavilakku), lotus ponds, spice trading houses |
| 17 | Bagh-e-Noor (`mughal`) | Built (pishtaq pavilions) | Taj Mahal + charbagh — Early | Lamp posts only | Lotus pools, marble bridges, garden hydraulics |
| 18 | Nusa Rinjani (`indonesia`) | Built (bale, tongkonan) | Borobudur / pura — Early | Lamp posts only | Candi bentar gates, penjor, lotus ponds, bamboo bridges |
| 19 | Aurora Huts (`aurora`) | Done (lavvu, igloos, turf huts, cabins) | Ice hall — Early | **Tent lamps — None** | Glowing ice sculptures |
| 20 | The Sky Isles (`skyisles`) | Built (spires, pavilions) | Temple of the Great Lantern — Early | Crystal lanterns — partial | **More and larger trees, ground texture, richer surfaces, floating islands with bridges and waterfalls** (see 3.2a) |

Everywhere: bridges over rivers (None), homes that grow storeys (None — rules exist), staged institution buildings
(None), soup kitchens/clinics/schools/madrasas/libraries (None), balloons (None).

## 3. What to build — in priority order

### 3.1 Monuments (landmarks) — NOT yet detailed. Highest priority.

Only the Meadow's Great Tree has been rebuilt in detail. The other 19 landmarks are early primitive builds of 8–36
lines each. Rebuild every one as a detailed, recognisable monument in its land's architecture, using the facade and
traditional kits and the research sources. Keep the south door area clear, keep colliders honest, add night lighting.

| Land (`id`) | Current landmark | Build it as (reference) |
|---|---|---|
| Wanderers' Meadow (`meadow`) | Great Tree — **done** | + the fairy castle in `event/Castle.ts` deserves the same care (Neuschwanstein: white limestone, red-brick accents, conical towers, battlements, banners) |
| Sakura Hollow (`japan`) | 8-line pagoda | Five-storey pagoda (Tō-ji/Hōryū-ji): stacked eaves with bracket sets, sōrin spire with rings, stone base, a torii and stone lanterns (tōrō) on the approach |
| Hanok Village (`korea`) | 10-line hall | Throne hall on a two-tier stone terrace (Gyeongbokgung Geunjeongjeon): double-eaved hip-and-gable roof, dancheong paint on beams, courtyard walls and gate |
| Jade Terraces (`china`) | 18 lines | Temple of Heaven (Qinian Dian): round triple-eaved blue roof with gold finial, three marble terraces with balustrades, red columns, dougong |
| Fjordhavn (`norway`) | 17 lines | Borgund stave church: tiered shingled roofs, dragon-head gable ends (no faces), open gallery, dark tarred timber |
| Alpenrose (`switzerland`) | 13 lines | Zytglogge clock tower: stone tower, painted astronomical clock face, spire, figures on the clock (faceless) |
| Old London (`london`) | 16 lines | Palace of Westminster + Elizabeth Tower (Big Ben): Gothic Revival pinnacles, clock faces lit at night, long river facade |
| New Yonder (`newyork`) | 18 lines | Art-deco crown tower (Chrysler/Empire State) turned solarpunk: setbacks, stainless crown with sunburst arches lit at night, sky gardens, solar skin, TV panels |
| Firenzia (`renaissance`) | 27 lines | Florence cathedral: Brunelleschi's ribbed octagonal dome with lantern, polychrome marble facade, Giotto's campanile |
| Maple Row (`vintage`) | carousel + bandstand | Keep the carousel (horses with floating heads, no faces) and bandstand; add a grand Victorian pier pavilion or ferris wheel |
| Madinat an-Nur (`islamic`) | arcades, pool, prayer hall | Alhambra-style Court of the Lions / great mosque: horseshoe arcades on slender columns, muqarnas, zellige dados, square minaret, reflecting pool, fountain |
| Souq al-Qamar (`middleeast`) | 29 lines | Al Fahidi–style fort and souq: coral-stone walls, round and square towers, barjeel wind towers, a covered souq with lantern-lit arcades |
| Tents of Rimal (`desert`) | 18 lines | A great Bedouin encampment: a majlis tent of woven black goat hair, carpets, cushions, fires, an oasis with date palms |
| Nile Crossing (`egypt`) | 19 lines | Temple with pylon gateway (Karnak/Luxor): tapered pylons with cavetto cornice, papyrus-column hypostyle hall, obelisks, avenue of (faceless) sphinxes, and pyramids beyond |
| Gulabi Nagar (`indianorth`) | 17 lines | Hawa Mahal: five-storey pink sandstone honeycomb of 953 small jharokha windows with jali, curved domes and chhatris |
| Kaveri Coast (`indiasouth`) | 24 lines, temple tank | Meenakshi-style gopuram: tall tiered gateway covered in painted figures (faceless, stylised), barrel-vaulted crown with finials, temple tank with steps, pillared mandapa |
| Bagh-e-Noor (`mughal`) | 36 lines, charbagh | Taj Mahal: white marble, great onion dome on a drum, four chhatris, pishtaq portals with calligraphy bands, four minarets, raised plinth, charbagh with water channels and cypresses |
| Nusa Rinjani (`indonesia`) | 30 lines | Borobudur-style stepped terraces with stupas and relief galleries, and a Balinese pura with a split gate (candi bentar) and meru towers |
| Aurora Huts (`aurora`) | 19 lines | Ice hall (ICEHOTEL): vaulted snow-and-ice halls with glowing ice sculptures and columns, lavvu around it |
| The Sky Isles (`skyisles`) | floating island spiral | Temple of the Great Lantern: floating islands linked by bridges and waterfalls, moonstone spires with arched glowing windows, the Great Lantern at the top |

### 3.2 Architecture detailing and polish (planned earlier — status)

- **Houses in all 20 lands are built from real architecture** (European facade kit for London, Firenzia, Maple Row,
  Fjordhavn, Alpenrose, New Yonder brownstones; New Yonder cyber-solarpunk towers; the Meadow's fairy-tale kinds; the
  13 traditional kits). Screenshot-checked in Sakura Hollow, Madinat an-Nur, Gulabi Nagar, Aurora, London, Firenzia,
  New Yonder, Meadow. **Still to do**: screenshot the other lands (Korea, China, Middle East, Egypt, desert, Kerala,
  Mughal, Indonesia, Sky Isles, Fjordhavn, Alpenrose, Maple Row) and fix proportions, scale, colours; add variety
  (more house types per land, corner shops, markets, mosques/temples/churches at neighbourhood scale, courtyard houses);
  delete the unused old per-land builders in `architecture.ts` (`houses.japan` … `houses.skyisles`).
- **New Yonder** (owner asked): **large display screens** (Times Square style: huge LED screens wrapping tower corners and
  facing the plaza, stacked billboards, a ticker ribbon round a tower, a screen on the landmark) and **TV panels** — big glowing screens on towers (animated shader: art, nature, news
  ticker; peaceful content); **more cyberpunk and solarpunk artifacts** — neon signs, holograms, vertical farms, solar
  trees, wind walls, monorail, drone docks, green sky-bridges; **penthouses** — luxury rooftop homes with terraces,
  pools, gardens (should become buyable/enterable homes; coordinate with whoever does housing rules).
- **Homes that grow floors** (rules already built in `src/charity/charity.ts`: `floorsOf`, `homeFloors`): the owned
  home's exterior (`buildDecor('house-<land>')` in `src/housing/HousingView.ts`) must gain a storey per floor built,
  and show scaffolding while a floor is under construction (`floorBuilding()`); the interior (`HouseInterior.ts`) should
  show more rooms/beds as floors grow.
- **Institution buildings built in stages** (owner, NEXT_WORK C2/C7): each land's science has a ladder of buildings, each
  a real building in the land's style — e.g. Swiss watchmaking: boutique → workshop/atelier → manufacture → school;
  Chinese medicine: herb stall → apothecary → clinic → academy; Ayurveda: herb garden → dispensary → clinic → college;
  Islamic sciences: bookseller → library → madrasa → university/observatory; London engineering: repair shop →
  workshop → works → institution; New Yonder tech: garage → studio → tower → campus; Meadow magic: potion shop → guild
  hall → a Hogwarts-style castle school. Also: soup kitchens, clinics → hospitals, schools, madrasas, **tent schools**,
  libraries, universities. Build each stage as a separate builder so the rules side can swap them as they grow.
- **Bridges** where roads/paths cross rivers (`src/world/waters.ts` rivers), each land's style: stone arch, timber,
  Chinese moon bridge, Japanese red arched bridge, rope/suspension, marble.
- **Water lotus ponds** in India, Mughal gardens, China, Japan, Indonesia (see `lotusSpots` in `Water.ts`), glowing softly at night.

### 3.2a The Sky Isles need care (owner: "very little trees and very little texturing")

- **Trees are too few and too small**: the land plants only 60 trees (`treeCount` in `src/world/RegionBuilder.ts`: `isSky ? 60 : …340`), never giants,
  and its flora (`regions.ts` skyisles: `cloud`, `crystal`, `candy`, `glowtree`) are mostly non-branching shapes. Raise the
  count to match other lands, make them larger (the isles' trees read tiny next to the houses), allow giants, and give the isles their own branching fantasy species in `src/world/trees.ts`
  `HABITS` (e.g. pastel blossom trees, silver-barked moon trees, trailing wisteria-like cloud willows, crystal-fruit trees)
  with leaf-image crowns like every other land; keep glowing fruit small.
- **Texturing**: the ground is near-white (`ground: '#f4f4ff'`, `groundAlt: '#e6e8ff'`) and reads flat. Add ground
  patterning in `src/world/Meadow.ts` `patternGround` (soft cloud-stone paving, star-dust veins, moss, flower meadows) and
  grass/flower rings like the other lands; give buildings more surfaces than marble and glazed tile (`LAND_SURFACES.skyisles`
  in `src/world/surfaces.ts`: moonstone ashlar, pearl tiles, silver filigree, cloud-plaster).
- **Structure**: floating islands with waterfalls pouring off their edges, bridges between isles, cloud banks below,
  moonstone spires and arched glowing windows (see the Sky Isles row of the monuments table).

### 3.3 City lighting (owner asked — NOT yet built beyond lamp posts)

Existing: each land has its own lantern design (`src/world/lanterns.ts`), used for sky lanterns and on street lamp posts
(`lampPost` in `architecture.ts`) along the avenues. Build, per land:
- **Old London**: Victorian gas-lamp street lighting along every street, the ring road and the river.
- **Tents** (desert, Aurora lavvu, tent schools): lamps hung at entrances and glowing inside.
- **Gulabi Nagar**: **diyas** — rows of small clay oil lamps on steps, parapets, window sills and jharokhas.
- **Madinat an-Nur**: **hanging lantern lamps** — pierced brass lanterns hung across streets, in arches and courtyards.
- **Jade Terraces**: many more **Chinese sky lanterns** rising (`SkyLanterns.ts`), red lanterns strung over streets.
- Every other land its own evening lighting (fairy lights in the Meadow, neon in New Yonder, candle lanterns in the
  north, oil lamps in Kerala, lamp-lit souqs). Light is glow geometry (`c.glow`) — cheap, keep area small.

### 3.4 Sky artifacts and nature

- More land-specific **sky artifacts** (static or hovering): Chinese lantern festivals, Japanese koinobori poles,
  Diwali lantern strings, Bali penjor arches, Mughal kites, **balloon clusters in the skies**.
- **Balloons**: as **house decor** (a decor item in build mode and in the home interior), and **children holding
  balloons** (string from the hand to a floating balloon — children are in `src/caravan/` and townsfolk).
- **Nature by terrain**: flora and fauna matched to terrain — desert shrubs on dunes, reeds and lotus at water edges,
  mangroves, alpine flowers above the treeline, snow-laden conifers in the north.

### 3.5 Vehicles

- **Traffic designs** (`src/traffic/designs.ts`) are built but most are verified only by tests: screenshot each land's
  roads, waters and skies and polish anything that reads badly (scale, colour, orientation, detail).
- The travellers' own vehicles (`src/vehicles/vehicles.ts`): rebuild with the traffic `shaper.ts` kit — Safar the van as a
  VW Type 2 split-screen bus (V-front, two-tone paint, loaf body), the little car, the old truck, the biplane. Keep the
  seat layout and `SEAT_GAP` exactly (tests check it).


#### How traffic spawns today (`src/traffic/Traffic.ts`)

- **When**: only for the land the travellers are in (`Traffic.setLand`, called every frame with `regionAt(player)`); on
  crossing into another land the old land's traffic is cleared and the new land's is placed at once. It runs day and
  night alike (no schedules); lights (`glow`) brighten after dusk. Paused while inside the van or a house.
- **Where — roads** (every land but the Sky Isles): each of the four avenues has two out-and-back loops, plaza edge
  (60 m) → 128 m and 152 m → town edge (274 m), turning back before the ring-road junction; the ring road (radius 140 m)
  has one lane each way. Lanes are 2.8 m off the centre line (left-hand in London, Japan, Indonesia and the three Indian
  lands). The roster's road vehicles are shuffled and shared round-robin over these ten routes, evenly spaced; they start
  still and accelerate, keep their distance and stop for the travellers.
- **Where — water** (every land but the Sky Isles): each lake has an outer loop (58 % of its radius) and an inner loop
  (30 %); each pond a loop; the river an out-and-back route along each bank. A boat only goes where there is room
  (`room > length × 0.45`), at a random point on the route.
- **Where — sky**: each craft or flock circles the town on its own circle (centre within ±40 m of the plaza, radius and
  height from the design's `radius` / `alt`, e.g. air taxis 70–260 m round at 28–60 m, airliners 900–1400 m at 320–420 m),
  clockwise or anticlockwise, starting anywhere on it.
- **How many**: `src/traffic/roster.ts` (e.g. London: 19 road vehicles, 8 boats and birds, 6 in the sky).

#### Traffic still to build

1. Visual check and polish of most designs (only a few are screenshot-verified).
2. **Entering and leaving**: vehicles loop forever; nothing drives in from the countryside or out of town, and nothing
   travels **between lands** (no highways, trade routes or flights from land to land). Traffic pops in when you cross a
   border because only one land is populated.
3. **Junctions and turning**: vehicles never turn onto other streets or cross the ring road; no traffic lights,
   roundabouts or give-way.
4. **Stops and purpose**: bus stops, taxi ranks, ferry piers, boat jetties, harbours, airports/airfields, helipads and
   drone docks; planes and air taxis taking off and landing; boats docking; carts stopping at markets.
5. **Riding**: the travellers taking a bus, taxi, tram, ferry, gondola or air taxi (paid with coins; seats apart as always).
6. **Couriers and supply**: hired delivery workers carrying goods on these vehicles (game-rules side, NEXT_WORK C3/C5).
7. **Time of day**: fewer vehicles late at night, lantern boats and festival craft in the evening, kites and balloons
   by day.
8. **Others**: townsfolk crossing streets (vehicles stop only for the travellers now), bridges where roads meet rivers,
   Sky Isles transit (cloud gondolas / cable cars between isles), distance culling and cheaper shadows if frame time suffers.

### 3.6 Characters' accessories (done — for reference)

The girl wears the grand arched gold crown (rose and ruby gems, pearls, leaves, arches, star; larger), the boy a fine pearl
tiara with a sapphire (`buildCrown` in `src/characters/CharacterModel.ts`). Both float above the head, face forward and
do not spin. Keep them clear of every headwear style.

## 4. Owner's taste (keep it)

Real architecture with real parts (balconies, cornices, shutters, lattices, brackets) — never blobs or plain boxes.
Low-poly with smooth shading. Rich, warm colour per land; the Meadow stays pink-hazed and fairy-tale; New Yonder is
cyber-solarpunk New York; lights glow warmly at night without washing out (bloom). Grass and leaves are images, not 3D
blades. Screenshots before claiming anything is done; report honestly what was verified by eye and what only by tests.
