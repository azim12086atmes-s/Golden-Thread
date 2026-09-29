# Master build list — everything still to build (2026-09-27)

One list of every open item. **Split:** physical models → ChatGPT (`CHATGPT_3D_MODELS.md`); logic → Claude. Details, owner's words and specifications are in `NEXT_WORK_2026-09-27.md` (game rules,
sections C1–C7) and `3D_BUILDS_HANDOFF.md` (3D work, sections 2a and 3.x). Tick items off here as they ship.

## A. Charity, sponsorship and homes (rules side; C1)
- [x] Rules: people in need in every land, sponsor in coins or in kind, wellbeing, take them home, floors (`src/charity/charity.ts`)
- [x] Charity panel in the UI (meet people in need, sponsor, give coins/food/goods, take them home, build floors)
- [x] Call `tickCharity` in the game loop and show its news (thriving / days run out) as toasts and letters
- [x] Residents shown inside your home (more rooms per floor still to model)
- [x] Homes grow a storey per floor, scaffolding while building (logic wired; placeholder model — 3D side to replace `addStoreys`)
- [x] Soup kitchens and clinics: stock the pantry, staff them; they serve meals (days of care for those you sponsor) and treat the sick (`tickInstitutes`)
- [x] Charity employment paid in coins, food or a place in your home (`employ(…, 'home')`)

## B. Institutions (C2, C7)
- [x] Own institutes by building them on your land, in stages, each stage a real building (e.g. watch boutique → workshop → manufacture → school)
- [x] Join and grow inside established institutes in each town (course, intern, teach, enrol a sponsored learner)
- [x] Every stage needs a skilled person: you, someone you pay, or someone you sponsor and teach / sponsor to learn
- [x] Clinics that grow into hospitals; libraries; tent school → madrasa/college → university; the Meadow's castle school of wizardry (logic and stages in `institutions/catalogue.ts`; buildings are 3D §2)
- [x] Each land's own science and four-stage ladder (Chinese medicine, Ayurveda, Swiss watchmaking, Islamic sciences, London engineering, New Yonder tech, Meadow magic, and the rest)
- [ ] Cite real-world sources for each land's science in `docs/research/` (owner: "search what every place has")
- [x] Build time; payment in coins or in kind (wood, the land's goods, food)

## C. Work, skills and learning (C3, C4)
- [x] Employ experts (daily wage in coins or food) or pay them freelance for one build; teach someone you sponsor; courses, interning, teaching; skills grow by doing
- [x] Hire people as employees or freelancers: farmhands, couriers, shipping lines, builders (tent-layers in the tent lands) who speed up building, weavers who weave your fibre; experts in every land's sciences plus cooking, medicine, teaching and research (`economy/workers.ts`, `economy/crews.ts`; Work panel lists who you can employ)
- [x] Pay in coins, food, or a room in your home (training as pay still to come)
- [x] Skills grow only by doing them; services need a skill level and pay more at higher levels; new skills: teaching, medicine, research, building, software, hardware, logistics (`economy/items.ts`, `economy/services.ts`)
- [x] Teaching as a service; interning; doing a course (fee in coins or goods, certificate) (`institutions/certificates.ts`, `institutions/opportunities.ts`)
- [x] Research under professors (assist for pay; scientific and magic theses → degree, invention, purse)
- [x] Service jobs: two employers in every land (a shift a day; Apprentice → Master, pay rising with skill) and a daily freelance board — remote software, hardware builds with parts, and every land's trades (Work panel, U)
- [x] Institutes and experts use the new skills: clinics, Chinese medicine, Ayurveda, Siddha → medicine; schools → teaching; libraries, the Islamic sciences, star lore, polar science → research; New Yonder tech → software; radio → hardware; irrigation → building

## D. Economy of services, agriculture and supply (C5)
- [x] Services economy: health care, tech, logistics, supply, agriculture, research, manufacturing, inventions (`economy/manufacture.ts`, `economy/business.ts`)
- [x] Agriculture land: two 40 m fields per land, eight rows of the land's own crops, barn, farmhands who water, harvest and re-sow (`economy/fields.ts`, panel on the field)
- [x] Supply chain: couriers carry from your barns to any land's market (prices fall as a market fills, recover a fifth a day) or to your soup kitchens and clinics (`economy/supply.ts`)
- [x] Hired couriers ride their land's traffic vehicle on the avenue while a load is on the road (`Traffic` `couriers`)
- [x] 3D: fields and barns in each land's farming style (`CHATGPT_3D_MODELS.md` §21; contract `world/models/fields.ts`)

## E. Monuments (3D; section 3.1 — 19 of 20 still early builds)
- [x] Meadow — Great Tree
- [x] Meadow — celebration castle revamp (keep its ivory, rose and gold palette; `CHATGPT_3D_MODELS.md` §19)
- [x] Sakura Hollow — five-storey pagoda
- [x] Hanok Village — palace throne hall
- [x] Jade Terraces — Temple of Heaven
- [x] Fjordhavn — stave church
- [x] Alpenrose — Zytglogge clock tower
- [x] Old London — Westminster and Big Ben
- [x] New Yonder — art-deco crown tower (solarpunk, with screens)
- [x] Firenzia — cathedral dome and campanile
- [x] Maple Row — carousel, bandstand, pier pavilion or ferris wheel
- [x] Madinat an-Nur — Court of the Lions / great mosque
- [x] Souq al-Qamar — coral-stone fort and souq
- [x] Nile Crossing — pylon temple and pyramids
- [x] Tents of Rimal — great majlis tent and oasis
- [x] Gulabi Nagar — Hawa Mahal
- [x] Kaveri Coast — gopuram and temple tank
- [x] Bagh-e-Noor — Taj Mahal and charbagh
- [x] Nusa Rinjani — Borobudur and a Balinese pura
- [x] Aurora Huts — ice hall
- [x] The Sky Isles — Temple of the Great Lantern

## F. Architecture polish (3D; sections 2a, 3.2, 3.2a)
- [ ] Screenshot and fix houses in Hanok Village, Jade Terraces, Fjordhavn, Alpenrose, Maple Row, Souq al-Qamar, Nile Crossing, Tents of Rimal, Kaveri Coast, Bagh-e-Noor, Nusa Rinjani, the Sky Isles
- [x] More house types per land; courtyard houses (3–4 traditional kinds per land: `traditions.ts`, `traditionsMore.ts`, `facade.ts`); organic town layouts along winding lanes (`townLayout.ts`). Also done: a neighbourhood place of worship and a market in every town on the ground, each in its land's tradition (`world/neighbourhood.ts`)
- [x] Delete the unused old per-land house builders in `architecture.ts`
- [ ] Sky Isles: more and larger trees (own branching species, giants), ground texture, richer surfaces, floating islands with bridges and waterfalls
- [ ] New Yonder: penthouses. Done: screen towers, avenue panels and a pylon screen with moving programmes (`world/CityScreens.ts`)
- [x] Bridges placed and walkable: 22 bridges wherever a river crosses the line of an avenue (`world/bridges.ts`, `world/BridgesView.ts`)
- [x] 3D: bridges in each land's style (`buildBridge`, `CHATGPT_3D_MODELS.md` §5)
- [x] Lotus ponds (India, Mughal, China, Japan, Indonesia)

## G. City lighting (3D; section 3.3)
- [x] Logic: `houseLights` is called for every house and `streetLight` for every avenue lamp (`world/models/lights.ts`); each land's lights now only need their models
- [x] Each land's lantern design on street posts and as sky lanterns
- [x] Old London gas-lamp street lighting
- [x] Madinat an-Nur hanging brass lanterns
- [x] Gulabi Nagar diyas
- [x] Tent lamps (desert, Aurora, tent schools)
- [x] Jade Terraces: many more sky lanterns, lantern strings
- [x] Every other land its own evening lighting (tōrō, candle lanterns, nilavilakku, lamp-lit souq, …)

## H. Sky, nature and decor (3D; section 3.4)
- [x] More land-specific sky artifacts (lantern festivals, koinobori, Diwali lantern strings, penjor, kites, balloon clusters)
- [x] Balloons (logic): children hold one at festivities, in the Meadow and Maple Row, and on market days (`caravan.ts` `balloonFor`, `CharacterModel.holdBalloon`); a Balloons decor item for everyone
- [x] 3D: `heldBalloon` and `balloonCluster` models (`world/models/balloons.ts`, `CHATGPT_3D_MODELS.md` §10); balloon clusters in the skies
- [x] Nature by terrain — logic (zones, species per zone, sizes; `world/nature.ts`)
- [ ] Nature by terrain — pines, palms and 10 more species rebuilt (3D). Done: the understory by land and ground — reeds, papyrus, mangroves, heather, juniper, cotton-grass, alpenrose, edelweiss and gentians, saltbush, tussock, ferns, tea, lavender, flowering shrubs, crystal blooms (`world/understory.ts`); lotus ponds
- [x] Caves — logic (placement, explore once a day; `world/caves.ts`)
- [ ] Caves and caverns — models (3D)

## I. Traffic (section 3.5)
- [x] ~85 designs moving on every land's roads, waters and skies
- [x] Real lamplight (`lamplight.ts`); the living air: butterflies, dragonflies, fireflies, spores, chimney smoke, dawn mist, sunbeams (`atmosphere.ts`, `Atmos.ts`); bark by species; per-crystal hues; desert pebbles; Aurora snow tracks; a rough open sea
- [ ] Screenshot and polish most designs
- [ ] Vehicles entering and leaving; travel between lands; no pop-in at borders
- [ ] Junctions, turning, traffic lights, roundabouts
- [ ] Stops: bus stops, taxi ranks, ferry piers, jetties, harbours, airports, drone docks; take-off, landing, docking. Done: bus stops in every town; ferries dock at every harbour pier; air taxis land beside every stop and on the Sky Isles stage
- [ ] Riding buses, taxis, trams, ferries, gondolas, air taxis (separate seats). Done: intercity coach, coastal ferry, air taxi, Sky Isles cable car (`travel/Ride.ts`); left: trams
- [ ] Time of day (quieter nights, evening lantern boats, daytime kites and balloons)
- [ ] Townsfolk crossing streets; Sky Isles cable gondolas; distance culling. Done: zebra crossings on the lights; far traffic culled; Sky Isles cable car (`travel/gondola.ts`, `SkyTram.ts`)
- [x] Rebuild the travellers' own vehicles (car, truck, biplane) — keep seats and `SEAT_GAP`: Safar as a split-screen bus in painted steel (`vehicles.ts` `buildVan`); the car and truck in painted steel; the biplane as a 1930s trainer (`buildBiplane`)

## I2. Ships and the sea (NEW)
- [ ] 3D: ships — cargo, container, ocean liner, cruise, large ferry, trawler, coastal steamer, ocean dhow, large junk, phinisi, rice barge, full-rigged tall ship, hospital ship, research vessel, sky galleon (`CHATGPT_3D_MODELS.md` §12.4)
- [x] Logic: a harbour in each of the 14 coastal lands at the real shore (walkable quay and pier), a sea lane along each coast, ships docking at the pier head, chartered shipping lines carrying 90 loads harbour to harbour (`world/harbours.ts`, `Traffic` sea routes, `supply.ts`)
- [ ] 3D: harbours in each land's style (`CHATGPT_3D_MODELS.md` §22; contract `world/models/harbour.ts`)

## J. Carried over from earlier sessions
- [ ] Walk-around interiors (rooms are dioramas now)
- [x] Children going home at their destination (caravan limit) (`caravan.bringHome`)
- [x] Robes and headscarves swaying in the wind
- [ ] Instanced party guests at the celebration (performance)
- [ ] Real-GPU frame-rate measurement

## K. Interiors (NEW)
- [ ] 3D: interiors for penthouses (still the standard room). Done: monuments, the castle, every institute stage and caverns (`CHATGPT_3D_MODELS.md` §20; contract `src/world/models/interiors.ts`)
- [x] Institute rooms and monument halls dressed as their land's own interiors — floor, walls, ceiling, lamps (`world/interiorDress.ts`)
- [x] House rooms shaped like their buildings (igloo and glass-igloo domes, lavvu/goahti/round-tent cones, the Bedouin tent, pitched and saddle roofs, vaults, open courts), named by their kind at the door, with per-home colour variations and a keepsake (`housing/HouseInterior.ts` `HOUSE_SHAPE`, `keepsake`)
- [x] Logic: doors ask `buildInterior` first (monuments, institutes via “Step inside”, caverns after exploring, castle, penthouses) and use its seats, spots, gather point and camera; scenes seating the two closer than 2.2 m are refused (`HouseInterior.safeInterior`); the institute panel opens from inside
- [ ] Logic: penthouses to buy (after their models). The castle door is done (`event/site.ts` `CASTLE_DOOR`)

## L. Claude's logic queue — still to do (in order)

Everything here is logic (rules, state, placement, wiring, UI, tests); 3D models stay with Codex.

1. **Travel between lands**
   - Vehicles drive out of one land and into the next, with no popping in at the borders.
   - Couriers and ships run their whole journey.
   - Buses and ferries run between towns.
2. **Stops and riding**
   - Stops: bus stops, taxi ranks, ferry piers (the harbour piers exist), jetties, airfields, drone docks.
   - Take-off, landing and docking at them.
   - The travellers ride buses, taxis, trams, ferries, gondolas and air taxis, in separate seats at least `SEAT_GAP`
     apart.
3. **Junctions**
   - Turning at the ring road, traffic lights or roundabouts.
   - Townsfolk crossing the streets.
   - Distance culling of far traffic.
4. **Time of day for traffic**
   - Quieter nights.
   - Lantern boats at dusk.
   - Kites and balloons by day.
   - Sky Isles cable gondolas.
5. **The celebration castle's door** — Done: the great doors open onto its great hall of floating
   candles, with a library alcove and the tower stair (`world/interiors3d.ts`).
6. **Penthouses in New Yonder**
   - Buy one, furnish it, and live there or house people you sponsor.
   - After the 3D side builds the penthouse and its interior.
7. **Pay in opportunities** — Done: pay a sponsored person or a hired expert with a course at an
   institute (`institutions/opportunities.ts`); courses award certificates, which lift your rank
   ceiling at employers and open the demanding gigs (`institutions/certificates.ts`).
8. **Markets fill up for your own sales too** — Done (`supply.sellHere`).
9. **Manufacturing and inventions** — Done: make your theses' inventions at an institute of their
   science and sell them where they are wanted (`economy/manufacture.ts`). Every invention has a
   real use once made: carried (a star compass speeds every courier), built at a home (everlight,
   solar skin that earns daily) or in a field (pump, water screw) (`economy/inventions.ts`).
   Businesses grow organically, one town each (owner's amendment): take orders yourself → teach the
   trade to someone you sponsor who wants it or someone looking for work, or hire someone who knows
   it → hand the orders out → appoint a manager who runs the day. Pay is care, a monthly wage, or
   keep (a room in your home there and food from your fields) (`economy/business.ts`).
10. **Children going home** — Done: they go home when the caravan reaches their destination (`caravan.bringHome`).
11. **Performance**
    - Instanced party guests at the celebration.
    - A real-GPU frame-rate check.
12. **Research notes**: cite the real sources for each land's science and institutes (B).
13. **Bugs seen in the 2026-09-27 screenshots**
    - Safar parks on the sea when the travellers are teleported onto a pier: park it on the nearest dry ground.
    - Grass and flowers grow over the tilled rows of owned fields, and on harbour quays: keep them off both.
14. **Contracts Codex creates, for Claude to wire when they appear** (see `CHATGPT_3D_MODELS.md` §0.5)
    - `lotusPond`: place formal lotus ponds by the plazas and gardens of the six lotus lands.
    - `screens.ts`: add `c.screen` to the land's `Ctx` and tick `uTime`/`uNight`.
    - `penthouse`: choose the towers, make them buyable, and use its door.
    - `sky-galleon`: add it to the Sky Isles' sky traffic.
    - Houses returning `kind: 'worship'`: give them a quiet hall interior, with no host sharing things.
15. **Wiring for Codex's work as it lands**
    - Add new ship ids to `SEA_TRAFFIC`.
    - Place penthouses, screens and sky artifacts once their models exist.
    - Answer Codex's contract requests.

Keep this list, the handoffs and `CHATGPT_3D_MODELS.md` up to date after each piece.
