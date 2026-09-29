# Physical models — requirements for the 3D side, 2026-09-27

> **2026-09-29: Codex / ChatGPT no longer works on this project (owner). Claude builds these models too.** This file
> stays the spec; where it says "you", read "whoever builds the models". Built so far by Claude from this list: the
> §12.4 ships (`src/traffic/ships.ts`), the §22 harbours (`models/harbour.ts`).

> **Access**: repository https://github.com/azim12086atmes-s/Golden-Thread. The source is on branch
> `claudes-current-work` (set it as the repository's default branch so Codex opens it; `gh-pages` is only the compiled
> website). Work on your own branch and open a pull request into `claudes-current-work`. Start by reading `CLAUDE.md`,
> then this file. Setup script for the environment: `npm ci`.

**Division of work.** ChatGPT builds the **physical models** (everything you see). Claude builds the **logic** (game rules,
state, UI, placement, wiring, tests) and calls the models through the contracts below. Neither side edits the other's
files; if a contract must change, write the change and the reason at the bottom of this file under "Contract requests".

Read before starting: `CLAUDE.md`, then `docs/team/handoffs/3D_BUILDS_HANDOFF.md` §1–2 (content rules and how 3D is built
here — procedural three.js, `kit.ts` primitives into a `GeoBuilder`, surfaces, glow, budgets, the probe screenshot tool),
then this file. Master checklist: `docs/team/handoffs/MASTER_BUILD_LIST.md`.

## 0. Working agreement

- **Branch**: work on your own branch (e.g. `3d-builds`, which already exists) created from `claudes-current-work`; merge
  `claudes-current-work` into it often; open a pull request into `claudes-current-work` — Claude reviews and merges. Never
  rewrite history, never force-push.
- **Files you own** (edit freely): `src/world/architecture.ts` (landmark and house builders, `lampPost`, street props),
  `src/world/traditions.ts`, `src/world/facade.ts`, `src/world/kit.ts` (add primitives; never change existing ones'
  behaviour), `src/world/trees.ts` (species habits), `src/world/lanterns.ts`, `src/world/SkyOrnaments.ts`,
  `src/world/models/*` (the contracts below), `src/event/Castle.ts`, `src/traffic/designs.ts`, `src/traffic/creatures.ts`,
  `src/traffic/shaper.ts`, the model parts of `src/vehicles/vehicles.ts` and `src/housing/HousingView.ts` `buildDecor`.
  Also the *looks* of the ground and the effects: `groundColor` in `src/world/terrain.ts`, `src/world/Meadow.ts`
  `patternGround`, `src/world/surfaces.ts`, the water shader in `src/world/Water.ts`, and the particle/sky files listed
  in §17. Read §23 first: most of these already hold looks the owner approved.
- **Files Claude owns** (do not edit): `src/core/*`, `src/charity/*`, `src/institutions/*`, `src/economy/*`, `src/housing/housing.ts`,
  `src/housing/HouseInterior.ts` rules, `src/ui/*`, `src/Game.ts`, `src/traffic/Traffic.ts` and `roster.ts`,
  `src/world/RegionBuilder.ts` placement, `tests/*` (you may *add* test files for your models).
  Also the *shape* of the land: terrain heights in `src/world/terrain.ts` (`naturalHeight`, `terrainHeight`, the island
  edge, plot and castle levelling, platforms), `src/world/waters.ts` (where lakes, ponds and rivers are), and
  `WATER_Y`. Harbours, sea lanes, bridges, fields, plots, caves and houses are all placed from them (§23).
- **Every push**: `npx tsc --noEmit` and `npx vitest run` pass; screenshots (day and night) of everything changed, via
  `scripts/probe/`, attached to your report in `docs/team/handoffs/CHATGPT_3D_REPORT.md` with what was verified by eye.
- **Content rules** (tests enforce them): no eyes/nose/mouth on any person, animal, statue, carving or creature-shaped
  object; heads of people and animals float (`HEAD_GAP`, `animalHeadGap`); the two travellers never touch or share a seat;
  modest dress; peaceful; no idols presented for worship (temples and churches are architecture, shown respectfully,
  with no cult images — use abstract ornament, calligraphy, geometry, flowers).
- **Style**: real architecture with real parts, "low poly with smoothers" (smooth shading, 6–16 segments), warm per-land
  colour, surfaces from `SURF` (`surfaces.ts`), lit things small in `c.glow`. Frame: origin at base centre, entrance +z.
- **Budgets**: monument ≤ 150 k triangles; house type ≤ 8 k; institute stage ≤ 10 k (stage 3 ≤ 25 k); bridge ≤ 6 k;
  vehicle ≤ 3 k. A land's static world must stay a few draw calls (use the land's `GeoBuilder`s, never separate meshes).

## 0.5 Start here — order of work, what every contract does today, and world facts

### Order of work (suggested; the owner can reorder)
1. **What the owner flagged first:**
   - the Sky Isles' trees and ground (§8);
   - palms and pines rebuilt (§13);
   - the 12 lands' houses (§9);
   - the 19 monuments (§1);
   - each land's lights (§4).
2. **Things you use every minute:**
   - Safar and the travellers' vehicles (§12.3);
   - traffic vehicles (§12.2) and ships (§12.4);
   - the desert, Nile, Gulf, Arctic and Sky Isles ground (§14).
3. **New systems that already work with placeholders** (the game runs; they just look plain):
   - institutes (§2), home storeys (§3), bridges (§5), fields (§21), harbours (§22), caves (§15).
4. **Scenes and extras:**
   - interiors (§20), the castle (§19);
   - sky artifacts (§11), particles (§17), balloons (§10);
   - New Yonder's screens and penthouses (§7), lotus ponds (§6).

### Every contract and its status

| Contract | File | Called by | Status | § |
|---|---|---|---|---|
| `landmarks[land](c, o)` | `world/architecture.ts` | `World.ts` | wired — early builds; rebuild | 1 |
| house builders (`TRADITIONS`, `FACADES`) | `world/traditions.ts`, `world/facade.ts` | `RegionBuilder.ts` | wired — polish | 9 |
| `buildInstitute(c, kind, stage)` | `world/models/institutes.ts` | `institutions/InstitutesView.ts` | wired — placeholder hall | 2 |
| `addStoreys(c, base, floors, scaffold)` | `world/models/homeStoreys.ts` | `housing/HousingView.ts` | wired — placeholder boxes | 3 |
| `houseLights(c, fp)`, `streetLight(c, x, y, z)` | `world/models/lights.ts` | `RegionBuilder.ts` (every house; every avenue lamp) | wired — does nothing yet | 4 |
| `buildBridge(c, length, width, deck)` | `world/models/bridges.ts` | `world/BridgesView.ts` (22 bridges) | wired — placeholder arched planks | 5 |
| `lotusPond(c, r)` | `world/models/ponds.ts` | — | **you create it**; Claude then places it | 6 |
| screen material + screen faces | `world/models/screens.ts` | — | **you create it**; Claude then adds `c.screen` and ticks its time | 7 |
| `penthouse(c, w, d)` | `world/models/penthouse.ts` | — | **you create it**; Claude then places it and makes it buyable | 7 |
| `heldBalloon(colour)`, `balloonCluster(g, …)` | `world/models/balloons.ts` | `CharacterModel.ts`, `HousingView.ts` | wired — placeholder | 10 |
| sky effects (`SkyKind`) | `world/skies.ts`, `world/SkyFX.ts` | `SkyFX` | existing system — add kinds | 11 |
| traffic `Design`s and ships | `traffic/designs.ts` | `traffic/Traffic.ts` via `roster.ts` | wired; §12.4 ships sail as soon as their ids exist | 12 |
| Safar, car, truck, biplane | `vehicles/vehicles.ts` | the travellers | wired — revamp | 12.3 |
| tree `HABITS` | `world/trees.ts` | `RegionBuilder.ts` via `nature.ts` | wired — 12 species to rebuild | 13 |
| `groundColor`, `patternGround` | `world/terrain.ts`, `world/Meadow.ts` | the terrain chunks | wired — add looks only | 14, 23 |
| `buildCave(c, style, r)` | `world/models/caves.ts` | `RegionBuilder.ts` | wired — placeholder boulders | 15 |
| `buildCastle(solid, glow)` | `event/Castle.ts` | the celebration | wired — revamp | 19 |
| `buildInterior(spec)` | `world/models/interiors.ts` | `housing/HouseInterior.ts`, `Game.ts` | wired — returns null (standard room) | 20 |
| `buildField(c, size, look, ground)` | `world/models/fields.ts` | `economy/FieldsView.ts` | wired — placeholder rows and barn | 21 |
| `buildHarbour(c, pier, ground)` | `world/models/harbour.ts` | `economy/HarboursView.ts` | wired — placeholder quay and pier | 22 |

"Wired" means the game already calls it: replace the body, keep the signature, and your model appears everywhere at once.
When you create a new contract file, write its signature under Contract requests; Claude wires it and ticks it here.

### World facts (all in metres, y up)
- **The island:**
  - 20 lands on a 5 × 4 grid, each 700 × 700 m; a land's centre is `regionCenter(REGION_BY_ID[id])`.
  - Row 0 is the **north** coast (−z), row 3 the south (+z); column 0 is the west (−x), column 4 the east (+x).
  - Beyond the grid the ground slopes into the sea; sea and water level is `WATER_Y` = −1.5.
- **A town** (local to the land's centre):
  - the flat core has a 240 m radius; the plaza and monument are a 50 m disc at the centre;
  - four avenues run along ±x and ±z from 56 m to ~280 m (keep 9 m clear either side of the axis);
  - the ring road is at 140 m radius; houses stand between 62 m and 234 m.
- **Sites:**
  - plots are 30 × 30 m at (±150, +150);
  - institute sites are 40 × 40 m at (−150, −150), (+150, −150) and (±205, −62) (the Sky Isles use ±90/±110);
  - fields are 40 × 40 m at (±205, +62);
  - the Meadow's castle is at world (0, −292), radius 72.
- **Water:** each land has a lake, three ponds and a river 250–340 m out; harbours are on the coast ~350–420 m out
  (§22), and bridges where a river crosses an avenue line (§5).
- **People:** about 1.7 m tall (children 0.62×). A game day is 1440 game minutes. The world streams: only the lands
  near the travellers are built, so everything must build from its data alone.

### Content rules — the full list (in addition to §0)
- **No faces on anything:** no eyes, nose or mouth on people, animals, statues, carvings, figureheads, sun or moon
  discs, masks, gargoyles, vehicles' "faces" or balloons. Heads of people and animals float.
- **Modesty:** clothes are modest; billboards, screens, posters and shop windows show only modest content (nature,
  abstract art, food, crafts, calligraphy, geometry).
- **Halal-friendly:**
  - no alcohol: no bars, pubs, wine bottles, beer signs, wine barrels shown as wine, toddy shops;
  - no gambling: no casinos, slot machines, betting shops;
  - no pork shops, no nightclubs.
  - Cafés, tea houses, juice bars, bakeries and sweet shops are all welcome.
- **Worship:** mosques, churches and temples appear as architecture, shown respectfully, with no statues or images of
  worship. Use geometry, calligraphy, flowers and light.
- **Medical signs:** a green crescent or a herb leaf, not a cross.
- **Tone:** peaceful: no weapons shown as weapons (a fort's walls are fine), nothing frightening.

---

## 1. Monuments — rebuild 19 (only the Great Tree is done)

Contract: `landmarks[land](c: Ctx, o: LandmarkOut)` in `src/world/architecture.ts` (unchanged signature). Built at the
land's centre on the plaza (a 50 m-radius paved disc). Set `o.colliders` (circles `{x,z,r,h}` covering every solid part),
`o.platforms` for walkable terraces/stairs, `o.height`. **Keep a clear walkway along +z from the centre to beyond the
monument's south face** — a door is placed automatically at the first point along +z outside every collider
(`landmarkDoor` in `World.ts`); make that the monument's main entrance. Night: floodlight-like glow on key surfaces is
not possible — use small glowing lamps, windows, lanterns along edges. Fit within a 45 m radius (the plaza has fountains
and stalls beyond). `tests/world.test.ts` builds every land; `tests/houses.test.ts` checks the landmark door is clear.

| Land | Monument (reference) | Must have | Size (approx.) | Surfaces / colours | Night |
|---|---|---|---|---|---|
| `meadow` | The Great Tree (done) + the celebration castle | The Great Tree stays as is. The castle is revamped separately — see **§19** | — | — | — |
| `japan` | Five-storey pagoda (Tō-ji / Hōryū-ji) | stone plinth with steps; five storeys each smaller, each with deep swept eaves on bracket sets (tokyō), a balcony railing on each level; bronze sōrin finial with 9 rings; a torii on the approach and stone tōrō lanterns; gravel court | 12 × 12 m base, 32 m tall | dark timber, vermilion posts, grey kawara tiles (`clayTile`/`slate`) | lit tōrō lanterns, eave lanterns |
| `korea` | Geunjeongjeon throne hall (Gyeongbokgung) | two-tier stone terrace with balustrades and stairs with a carved central ramp; hall of 5 × 3 bays on red columns; double-eaved hip-and-gable roof with up-curved corners; dancheong painted beams (green, blue, red); a walled court with a gate | 30 × 20 m terrace, 20 m tall | granite (`ashlar`), red columns, green-blue paint, grey giwa | lanterns on terrace |
| `china` | Temple of Heaven, Hall of Prayer for Good Harvests | three concentric white marble terraces with carved balustrades and stairs; round hall with 3 tiers of blue-glazed conical roofs and a gilded finial; red columns; dougong; painted beams | 32 m terrace diameter, 38 m tall | marble, red lacquer, blue `glazed` tiles, gold | red lanterns, lit windows |
| `norway` | Borgund stave church | tiered roofs stacked in 5–6 levels, shingled; gable ends with carved dragon-head finials (abstract, no faces); open ambulatory gallery; a small bell tower; dark tarred timber | 12 × 18 m, 18 m tall | dark boards, shingles (`boards`/`slate`) | candle lanterns in the gallery |
| `switzerland` | Zytglogge clock tower (Bern) | stone tower with a gateway arch through it; a large painted astronomical clock face and a smaller dial; a pointed spire with a bell cage; mechanical figures (faceless) round the clock | 10 × 10 m, 40 m tall | `ashlar`, gold dial, red-brown roof | the clock face softly lit |
| `london` | Palace of Westminster + Elizabeth Tower (Big Ben) | Gothic Revival tower with four clock faces lit at night, belfry, spire; a long palace facade with pinnacles, lancet windows and tracery panels; a river terrace | tower 8 × 8 m, 70 m tall; facade 60 m | pale limestone (`ashlar`), gold detail | clock faces, window rows |
| `newyork` | Art-deco crown tower (Chrysler / Empire State), solarpunk | setbacks per the 1916 zoning; a stainless crown of stacked sunburst arches with triangular windows lit at night; eagle gargoyles (abstract, no faces); a spire; sky gardens and solar skin; **large display screens** at the base facing the plaza | 30 × 30 m base, 120 m tall | `steel`, `glass`, limestone, neon | crown windows, screens, neon |
| `renaissance` | Florence cathedral (Brunelleschi's dome) + Giotto's campanile | octagonal red-tiled dome with white ribs and a marble lantern on top; drum with round windows; nave with polychrome marble facade (white, green, pink panels); a separate square bell tower with coloured marble bands | cathedral 60 × 30 m, dome 60 m tall | `marble` in three colours, `clayTile` dome | lantern light, windows |
| `vintage` | Seaside pleasure pier / carousel square | keep the carousel (horses with floating heads, no faces) and bandstand, detailed (striped canopy, mirrors, rounding boards with lights); add a Victorian pier pavilion or a ferris wheel | 40 m | painted wood, iron | strings of bulbs |
| `islamic` | Court of the Lions (Alhambra) / great mosque | arcaded courtyard of slender paired columns with muqarnas and stucco arches; a fountain basin on (abstract, faceless) lion-like supports or simply a star basin; zellige dados; a square minaret with tile panels; prayer hall with horseshoe arches; reflecting pool | 40 × 30 m, minaret 30 m | `plaster`, `glazed` tiles, cedar wood, green tile roofs | hanging brass lanterns |
| `middleeast` | Coral-stone fort and covered souq (Al Fahidi) | crenellated walls, one round and two square towers, barjeel wind towers, a studded gate; a covered souq street of arches with shop fronts | 40 × 30 m | `adobe`, palm-log beams | lantern-lit souq |
| `desert` | Great majlis tent and oasis | a huge black goat-hair tent on many poles, one side open, carpets and cushions inside, a qata curtain, brass coffee pots; an oasis pool with date palms and a well | 30 × 12 m tent | `cloth`, woven patterns | fires, lamps |
| `egypt` | Pylon temple (Karnak/Luxor) + pyramids | two tapering pylons with cavetto cornice and relief bands (abstract glyphs, no faces), flagpole niches; an avenue of (faceless) sphinxes; hypostyle hall of papyrus-bundle columns; obelisks; three pyramids beyond the town | pylon 40 m wide, 24 m tall | sandstone (`ashlar`), paint traces | torches at the gate |
| `indianorth` | Hawa Mahal (Jaipur) | five-storey pink sandstone facade shaped like a crown, hundreds of small jharokhas with jali screens and curved bangaldar roofs, chhatris on top, white outlines | 40 m wide, 16 m deep, 25 m tall | pink `ashlar`, white trim | diyas along every ledge |
| `indiasouth` | Meenakshi-style gopuram + temple tank | tall tapering gopuram of 9 storeys covered in painted ornament (abstract figures only, faceless and not objects of worship — prefer floral/geometric), barrel-vaulted crown with finials; a stepped temple tank; a pillared mandapa | gopuram 20 × 14 m base, 45 m tall | painted `plaster` | oil lamps (nilavilakku) |
| `mughal` | Taj Mahal | raised marble plinth; the main tomb with a pishtaq portal on each side, calligraphy bands, a bulbous onion dome on a drum with a finial, four chhatris; four minarets at the plinth corners; the charbagh garden with water channels, cypresses and fountains | plinth 57 m square, dome 60 m tall | `marble`, inlay (pietra dura) pattern | lamps along the channels |
| `indonesia` | Borobudur terraces + Balinese pura | stepped square terraces with relief galleries (abstract) and bell-shaped stupas on round terraces; a Balinese temple beside it with a split gate (candi bentar) and meru towers of stacked thatch roofs | 60 m base, 30 m tall | volcanic stone (`ashlar` dark), thatch | torches, woven lanterns |
| `aurora` | Ice hall (ICEHOTEL) | vaulted halls of snow blocks, ice columns, glowing ice sculptures (abstract — no faces), an entrance of carved ice; lavvu around it | 40 × 20 m, 8 m tall | `snow`, ice (glass-like glow) | blue-green glow inside |
| `skyisles` | Temple of the Great Lantern | floating islands in a spiral linked by bridges, waterfalls off their edges, moonstone spires with arched glowing windows, the Great Lantern at the top | as now | `marble`, moonstone | crystal light |

**Done means**, for each monument:
- **Screenshots**, by day and at night: from 120 m away (the skyline), from the plaza at 25 m, and at the door at
  6 m.
- **Colliders** cover every solid part (walk round it: nothing walks through a wall).
- **Platforms:** terraces and stairs you can climb have `o.platforms`.
- **The door** at +z is clear.
- **Tests:** `tests/world.test.ts` and `tests/houses.test.ts` pass.
- **Budget:** ≤ 150 k triangles.

## 2. Institute buildings — 24 kinds × 4 stages (NEW)

Contract: `buildInstitute(c: Ctx, kind: InstituteKind, stage: 0 | 1 | 2 | 3): Footprint` in
`src/world/models/institutes.ts` (a placeholder exists — replace its body). The catalogue of every kind and stage with a
description of what it looks like is in `src/institutions/catalogue.ts` (`INSTITUTES`) — **model exactly those**. Rules:

- Stay within the stage's radius: stage 0 ≤ 5 m, stage 1 ≤ 8 m, stage 2 ≤ 12 m, stage 3 ≤ 16 m (`stages[i].radius`).
  Institutes stand on 40 × 40 m institute sites (Claude places them).
- Each stage is a **different building**, recognisably the growth of the one before (the boutique becomes an atelier,
  then a manufacture, then a school). Keep the entrance on +z, clear.
- Land sciences (`land` set) are built in that land's architecture (use `traditions.ts`/`facade.ts` helpers). The four
  kinds found everywhere (`kitchen`, `clinic`, `school`, `library`) must be built **in the style of the land they stand
  in** (`c.s.id`) — e.g. a school in Gulabi Nagar is a haveli courtyard school, in the desert a tent school, in the Sky
  Isles a moonstone hall.
- Every stage shows its purpose from outside: signs (text-free symbols: a clock, a pot, a book, a cross-free medical
  sign such as a green crescent or a herb leaf, a bowl), goods in windows, people-free props (tables, pots, shelves,
  benches, desks), and a glowing window or lamp.
- Stage 3 is a landmark in its own right (a hospital with wards and a courtyard, a university with a quadrangle and a
  library tower, the Meadow's castle school of wizardry with towers, a great hall of floating candles, a library tower
  and an observatory).
- **Return value:** `{ r, h }`. `r` is the collision radius (the game puts a collider of 0.85 × `r` at the site's
  centre), and `h` is the top height (flight clears it). Make `r` cover the building, not the whole 40 m site.
- **Scaffolding:** while a stage is being built, the game draws it around the previous stage
  (`InstitutesView.ts`); you don't need to.
- **Which buildings stand where:**
  - Each land's own institute stands at its established site (local −150, −150) at stage 3.
  - The travellers' institutes stand at the three open sites, at whatever stage they have reached.
  - The 24 kinds and their stage names are in `institutions/catalogue.ts`: 20 land sciences plus `kitchen`, `clinic`,
    `school` and `library`.
- **Done means:** all 24 kinds × 4 stages screenshotted from ~20 m in one land each (the four found everywhere in three
  contrasting lands: London, Tents of Rimal, the Sky Isles); ≤ 10 k triangles per stage (stage 3 ≤ 25 k). See §24 for a
  script that shows any kind at any stage.

## 3. Homes that grow storeys (NEW)

Contract: `addStoreys(c: Ctx, base: Footprint, floors: number, scaffold: boolean): Footprint` in
`src/world/models/homeStoreys.ts`. Called by the home builder with the number of finished floors (0–3) and whether a
floor is under construction. Build each storey in the land's style matching the house below (same walls, windows, trim;
for tents: a second tent level or a larger tent; for igloos: a larger dome beside; for Sky Isles: another spire tier),
lift the roof to the new top, add an outside stair or balcony where the style has one. Under construction: scaffolding
poles and planks, ladders, stacked materials. Return the new footprint. (Rules and state: `src/charity/charity.ts`.)
- **The numbers:**
  - `floors` is 0–3 (`MAX_FLOORS`); each finished floor adds room for two more people (a home holds 2 + 2 × floors).
  - Storeys are ~3 m.
  - `base.r` is the house's collision radius and `base.h` its top height.
  - Return the new top.
- **Where you see it:** the homes you own are built by `HousingView.ts` (`buildDecor` for `house-<land>`), which calls
  `addStoreys` on top.
- **Budget:** ≤ 3 k triangles per storey.

## 4. City lighting per land (NEW)

Contracts in `src/world/models/lights.ts`: `houseLights(c, fp)` (around every house) and `streetLight(c, x, y, z)`
(return `true` if you placed a land-specific light standard, else the land's lamp post is used). Small glow only.

**Wired:**
- `houseLights` runs for **every house** (~90–140 per land), inside that house's own frame: origin at its base,
  front door facing +z, `fp` its unscaled footprint. Keep it tiny: ≤ 150 triangles and a few small glow shapes per
  house.
- `streetLight` is asked at every avenue lamp position, in the land's frame. Lamps are every 22 m along both sides of
  all four avenues; Claude places them and their colliders, so you only build the light standard.
- Lanterns strung *across* streets, and lamps along river banks, need their own placement: ask for it under Contract
  requests.

| Land | House lights | Street lights |
|---|---|---|
| Old London | carriage lamps by the doors, lit fanlights | Victorian gas lamps (fluted iron column, lantern with four panes, a ladder bar) every 25 m |
| Madinat an-Nur | pierced brass lanterns hung at doors and in arches | lanterns hung on chains across the streets between houses |
| Gulabi Nagar | rows of diyas (small clay oil lamps) on steps, parapets, sills and jharokhas | tall brass lamp stands (samai) |
| Tents of Rimal / Aurora | lanterns hung at tent entrances, glow from inside | torches on poles / candle lanterns on poles |
| Jade Terraces | red silk lanterns under eaves | strings of red lanterns across the streets; more rising sky lanterns (`SkyLanterns.ts`) |
| Sakura Hollow | a paper chōchin at the door | stone tōrō lanterns |
| Kaveri Coast | brass nilavilakku oil lamps at doors | tall brass lamps |
| New Yonder | neon signs | slim solar street lights with light bars |
| Wanderers' Meadow | fairy lights along eaves, lantern-flowers by the door | curling iron posts with flower-shaped lamps and glowing mushroom lamps along the verges |
| Hanok Village | blue-and-red silk cheongsachorong lanterns at the gates | stone lanterns (seokdeung) |
| Fjordhavn | a candle in each window, black iron wall lanterns | black iron harbour lamps |
| Alpenrose | wrought-iron wall lanterns under the eaves, window candles | iron lanterns with flower baskets |
| Old London (houses) | also lit fanlights over the doors | (gas lamps, above) |
| Firenzia | wrought-iron corner lanterns (*lanterne*) and torch-holders (*ferri*) on the palazzi | iron bracket lanterns on stone posts |
| Maple Row | porch lights, strings of bulbs on the porches | cast-iron double-globe lamps; a lit diner sign |
| Souq al-Qamar | coloured-glass fanous at the doors | fanous under the souq arches, brass lamps on posts |
| Nile Crossing | oil lamps in wall niches | tall lamps along the river corniche |
| Bagh-e-Noor | chiragh oil lamps in niches (chirag-dan) | marble lamp posts; lamps along the water channels |
| Nusa Rinjani | coconut-shell and bamboo oil lamps, woven palm lanterns | bamboo torches (obor) |
| The Sky Isles | floating crystal lamps at the doors | glowing moonstone posts |

## 5. Bridges (NEW)

Contract: `buildBridge(c, length, width, deck): { deckAt(x) }` in `src/world/models/bridges.ts`, spanning x from −L/2
to +L/2, banks at y = 0, deck top at `deck`, walkable (return the deck height profile). Styles by `c.s.id`: stone arch
(London, Firenzia — Ponte Vecchio-like with shops, Alpenrose), timber (Fjordhavn, Aurora), red arched (Sakura Hollow),
moon bridge (Jade Terraces), stone slab with dancheong railings (Hanok Village), marble (Bagh-e-Noor), bamboo/rope
(Nusa Rinjani, Kaveri Coast), iron truss (New Yonder, Maple Row), mud-brick causeway (desert, Nile), cloud-stone (Sky
Isles). Lengths 10–30 m. Claude places them where paths cross rivers.

**Wired** (`world/bridges.ts`, `world/BridgesView.ts`):
- **Where:** 22 bridges, one wherever a land's river crosses the line of an avenue, in 17 lands. The Meadow and Maple Row
  have none, and the Sky Isles have no river.
- **Size:** 12–17 m long, `width` 4, `deck` 1.2 at the middle.
- **Walkway:** the game lays one along `deckAt(x)`, so keep the deck within ~0.3 m of y = 0 at both ends, where people
  step on. The placeholder is an arch that does this.
- **Budget:** ≤ 6 k triangles.
- **Styles:** use the land list above. Maple Row's iron truss is for later, if it gets a bridge.

## 6. Water lotus ponds (NEW)

A lotus pond model: a stone- or brick-edged pond (4–12 m) with steps, lotus leaves and flowers (pink/white) that glow a
little at night, in the land's style (stepwell edge in Gulabi Nagar, marble in Bagh-e-Noor, granite in Kaveri Coast, a
stone lantern beside it in Sakura Hollow). Contract to add: `lotusPond(c, r)` in `src/world/models/ponds.ts` (create it).
- **Already there:** lily pads and lotus flowers float on every land's natural ponds and lakes (`Water.ts`
  `lotusSpots`); leave them.
- **What's new:** `lotusPond` is a **formal, built** pond for gardens and plazas.
- **The contract:**
  - local frame at the pond's centre; radius `r` 2–6 m;
  - the water surface at y = 0.1 above the ground;
  - an edge the travellers can stand on (≤ 0.4 m high);
  - return nothing.
- **Where it goes:** Gulabi Nagar, Bagh-e-Noor, Kaveri Coast, Jade Terraces, Sakura Hollow and Nusa Rinjani. Once the
  file exists, Claude will place them by the plazas and gardens of those lands.

## 7. New Yonder: screens, cyber/solarpunk artifacts, penthouses (NEW)

- **Large display screens** (Times Square style): huge screens wrapping tower corners, stacked billboards, a ticker
  ribbon round a tower, screens facing the plaza. They need an animated shader material (uniform `uTime`): peaceful
  content — abstract art, nature scenes drawn procedurally, a news-ticker band of glyph blocks (no real text needed).
  Put them in their own mesh per land (one material) so they can animate.
  - **Contract — create `src/world/models/screens.ts`:**
    - export `SCREEN_UNIFORMS` (`{ uTime, uNight }`) and `screenMaterial()` (a `ShaderMaterial` using them; the picture
      is drawn in world or vertex space, not from image files);
    - Claude will add a third builder, `c.screen` (a `GeoBuilder` built with `screenMaterial()`), to the land's `Ctx`,
      and tick `uTime` and `uNight` every frame;
    - you put the screen faces into `c.screen` from your New Yonder builders (landmark, towers, shopfronts).
  - Write under Contract requests when the file is there.
- **TV panels**: smaller screens on shopfronts and brownstones.
- **Artifacts**: neon signs, holographic billboards, vertical farms, solar trees, wind walls, a monorail on pylons along
  an avenue, drone docks on roofs, green sky-bridges between towers.
- **Penthouses**: luxury rooftop homes on the tallest towers — glass pavilions, terraces with planters and a pool,
  pergolas, glowing interiors. Contract to add: `penthouse(c, w, d)` in `src/world/models/penthouse.ts`, placed on a
  roof; Claude will make them buyable/enterable homes.
  - **Local frame:** the origin is at the roof's centre, at roof height.
  - **Size:** fit within `w` × `d` (about 12–20 m each way).
  - **Door:** the entrance faces +z.
  - **Return:** `{ door: [x, z] }` in the local frame (Claude places the "step inside" point there), plus the
    footprint's `h`.
  - **Where:** Claude chooses the towers (the tallest in New Yonder) and adds the buying and the interior
    (`buildInterior` `penthouse`, §20).
- **Content:** everything on screens and billboards follows the full content rules (§0.5): modest, no alcohol or
  gambling ads.

## 8. The Sky Isles (NEW)

More and **larger** trees (the isles' trees read tiny next to the houses; Claude has raised the count to 280 and the size
×1.9 in `nature.ts`; you add the species): new branching fantasy habits in `trees.ts` `HABITS` — pastel blossom trees,
silver-barked moon trees, cloud willows, crystal-fruit trees — with leaf-picture crowns, including giants. Ground
texture: patterns in `Meadow.ts` `patternGround` for the isles (cloud-stone paving, star-dust veins, moss, flower
meadows). Richer surfaces for buildings (moonstone ashlar, pearl tiles, silver filigree, cloud plaster). Floating islands
with waterfalls off their edges and bridges between them.
- **Walking on them:** floating islands you can walk on need walkable platforms. If they are part of the monument,
  return them in `o.platforms` (circles `{x, z, r, y}`). Anywhere else, ask under Contract requests and Claude will add
  them.
- **Trees used there:** `cloud`, `crystal`, `candy`, `glowtree` (the land's `flora` in `regions.ts`). The count and size
  are already raised (`nature.ts`).

## 9. Architecture polish in 12 lands

These 12 lands' houses are built from real architecture but have only been checked by tests, never looked at. For each
land: screenshot it, fix what reads wrong against the "Must read as" column, and add the new house types listed. Sources
for every feature are in `docs/ARCHITECTURE_RESEARCH.md`.

**How to look.** For each land take four screenshots with `scripts/probe/` (see `scripts/probe/example.js`): street level
at ~12 m by day, the same at night, an aerial view at ~40 m over a street by day, and one close-up of a single house front
at ~6 m. Teleport with `game.trav.teleport(centre.x + 14, centre.z + 90)` and turn the camera with `camYaw` /
`camPitch` / `camDist`. Save them in your report (`CHATGPT_3D_REPORT.md`), before and after.

**What "reads wrong" means (fix every one):**
- **Scale**: people are ~1.7 m; doors 2.1–2.4 m high and ~1.1 m wide; storeys ~3 m (2.6–3.6); window sills ~0.9 m above
  the floor; steps ~0.17 m. Houses must look lived-in at human scale — not dolls' houses and not warehouses.
- **Blobs**: any building that reads as a plain box, sphere or cone from 12 m. Every front needs depth (reveals, frames,
  projecting eaves, balconies, brackets, plinths) — at least three depths in its face.
- **Roofs**: every roof must sit on its walls with eaves or a parapet, never float or sink; curved roofs face up (see §16).
- **Colour**: walls, roofs and trims use the land's palette (`regions.ts` `walls`, `roofs`, `trims`) and its surfaces
  (`LAND_SURFACES` in `surfaces.ts`); no flat pure colours; night windows glow warm but small.
- **Streets**: houses face their street (+z), doors are on the street side, and nothing blocks the door (tests check).
- **Variety**: no two neighbouring houses identical — vary width, storeys, roof, colour and one feature per house.

| Land (`id`) | Builders now | Must read as | Check / likely fixes | New types to add (2–3) |
|---|---|---|---|---|
| Hanok Village (`korea`) | `hanok`, `choga` in `traditions.ts` | Hanok: stone plinth, timber posts on cornerstones, white plaster panels in a timber grid, hanji lattice doors, maru verandah, giwa roof with strongly up-curved eaves and a heavy ridge. Choga: rounded straw roof roped down, mud walls | roof curve strong enough; eaves deep (≥1 m); grid spacing even; choga roof not a sphere | L-shaped hanok round a courtyard (madang) with a gate (daemun); a hanok shop with a front counter; a stone wall with a tiled coping between houses |
| Jade Terraces (`china`) | `chineseHall`, `shophouse` | Halls: white stone base, red columns, dougong brackets, painted beams (blue-green-gold), deep swept eaves, glazed ridge ornaments; shophouses: two storeys, galleries, lattice doors, red lanterns | dougong visible under eaves; ridge ends lift; lanterns under eaves not floating | siheyuan courtyard house (grey brick walls, a moon gate); a tea house with a gallery over water; a pailou memorial archway at street ends |
| Fjordhavn (`norway`) | `FACADES.norway` via `compose` | Bryggen: narrow gable-fronted timber houses in rows, horizontal clapboard in red/ochre/white, white window frames, galleries, steep roofs | clapboard surface shows; gables face the street; rows touch like Bryggen; turf roofs on some | boathouse (naust) on the water edge; turf-roofed farmhouse; a harbour warehouse with a hoist beam |
| Alpenrose (`switzerland`) | `FACADES.switzerland` | Chalet: stone ground storey, timber above, low front gable, very deep eaves on big brackets, carved balconies on every floor with flat cut-out balusters, flower boxes, shutters | eaves deep enough (≥1.5 m); balconies on each floor; shutters on every window | a hay barn (stadel) on stone stilts; a village inn with a painted facade; a chapel with an onion-free pointed spire |
| Maple Row (`vintage`) | `FACADES.vintage` | Painted Ladies (Queen Anne): steep multi-gabled roofs, corner turrets, canted bay windows, gingerbread brackets, porches, 3–5 pastel colours per house | each house several colours; turret on ~half; porch posts turned; no plain boxes | a corner soda shop with an awning; an Italianate row house with a flat bracketed cornice; a stick-style house |
| Souq al-Qamar (`middleeast`) | `gulfHouse` | Gulf coral-stone: barjeel wind towers, recessed wall panels, parapet merlons, mashrabiya boxes, studded doors, palm-log beam ends | wind tower open on four sides; mashrabiya projecting; beam ends visible | a covered souq shop row with arches; a courtyard house with a majlis room; a small neighbourhood mosque with a square minaret (no images) |
| Nile Crossing (`egypt`) | `nubian` | Nubian: barrel vaults and domes behind parapets, walls painted blue/yellow/pink/white with geometric patterns round the door, palm-log beams, benches (mastaba) | vaults face up (fixed); paint patterns visible; domes not too big | a dovecote tower (pigeon house); a village house with a courtyard and a bread oven; a riverside shop with a reed awning |
| Tents of Rimal (`desert`) | `bedouinTent`, `roundTent` | Black goat-hair tents low and long on rows of poles, guy ropes, one side open, the qata curtain, rugs and cushions; round white tents | tents not inverted; ropes reach the sand; rugs inside the open side | a larger sheikh's majlis tent; a stone well with troughs and camels' shade; a palm-frond barasti hut |
| Kaveri Coast (`indiasouth`) | `keralaHome` | Kerala: steep clay-tile roofs with deep eaves, gable vents (mukhappu), verandah on turned pillars, laterite base, a brass lamp | roof steep (≥40°); gable vents at both ends; verandah deep | nalukettu courtyard house (four wings round an open court); Chettinad mansion with a pillared front; a toddy-free tea shop by the backwaters |
| Bagh-e-Noor (`mughal`) | `mughalPavilion` | Red sandstone outlined in white marble, pishtaq portal, jali screens, chhatris, onion dome or bangaldar roof | bangaldar faces up (fixed); pishtaq frames a deep arch; jali visible | a baradari (twelve-door garden pavilion); a haveli townhouse with a courtyard; a small mosque with three domes and minarets (no images) |
| Nusa Rinjani (`indonesia`) | `bale`, `tongkonan` | Bale: carved stone base, painted posts, steep alang-alang thatch; tongkonan: raised on piles, huge boat-shaped saddle roof, carved panels in red/black/yellow/white | saddle roof sweeps up at both ends; thatch reads as thatch; piles visible | a Balinese family compound with a split gate (candi bentar) and a wall; a rice barn (lumbung) on piles; a warung stall |
| The Sky Isles (`skyisles`) | `skySpire`, `skyPavilion` | Moonstone spires with arched glowing windows, domed pavilions, floating crystals, balconies; everything light, pale and graceful | spires slender (height ≥ 3× width); windows glow softly; not all white — pale blues, lilacs, pearl | a floating cottage on its own small island; a moonstone observatory; a bridge-house spanning two islands |

**Also in every land**: corner shops, a market hall or row of stalls, and a neighbourhood place of worship in the land's
tradition (mosque, church, temple) shown as architecture only — no statues, icons or images of worship.

**How a new house type gets used:**
- Add it to the land's list in `TRADITIONS` (`traditions.ts`) as `[builder, share]`; the shares of a land should add
  up to 1. For example, `korea: [[hanok, 0.55], [hanokCourtyard, 0.25], [choga, 0.2]]`.
- The town builder (`RegionBuilder.ts`) places ~90–140 houses per land, facing the nearest avenue, and picks a type by
  share. Each house stands in its own frame, front door on +z.
- **Return `kind`** in the footprint so the right room opens inside:
  - `'shop'`: a counter and shelves;
  - `'courtyard'`: a fountain under the open sky;
  - `'tower'`: a stair;
  - `'house'`: the family room (the default);
  - `'worship'`: for mosques, churches and temples. Claude will give these a quiet hall with no host sharing things
    (to do); until then they open on the standard room.
- The door is placed automatically on the street face at 0.95 × `r` + 0.6 m, so keep the entrance on +z at the
  footprint's edge.

**Then**: delete the unused old builders `houses.japan … houses.skyisles` in `architecture.ts` (the lands now build from
`traditions.ts` and `facade.ts`; `buildHouse` only falls back to them if a land has no tradition).

**Done means**: all four screenshots per land look right against the table; `npx vitest run` passes (the door and
colliders tests in `tests/houses.test.ts` build every land); triangle budget ≤ 8 k per house type; the report lists
what changed per land with before/after screenshots.

## 10. Balloons (NEW)

- Balloon cluster decor: 5–9 balloons on strings tied to a weight, bright colours, slight sway. Contract to add:
  `balloonCluster(g: GeoBuilder, x, y, z, colours)` in `src/world/models/balloons.ts`.
- A balloon held by a child: `heldBalloon(colour): THREE.Group` — a balloon on a 1 m string whose lower end is at the
  group's origin (Claude attaches it to a child's hand anchor); tag meshes `userData.part = 'accessory'`.
- Balloon clusters drifting in the sky (in `SkyOrnaments.ts`).
- **Wired (logic done):** both contracts now exist in `src/world/models/balloons.ts` with placeholders; the game hangs
  `heldBalloon` from the travelling children's free hands at full size and keeps it upright, and the `balloons` decor
  item calls `balloonCluster`. Replace the bodies; keep the signatures.

## 11. Sky artifacts — guidelines and every land

**What is already in the sky** (do not duplicate): each land's sky effects (`skies.ts`/`SkyFX.ts`: clouds, kites, birds,
sunbeams, rainbows, alpenglow, aurora, Milky Way, nebula, shooting stars, fireworks, searchlights, halos, moons, planets,
comets, constellations, hex canopy, floating islands, turning star, balloons, noctilucent clouds), each land's lanterns
rising (`SkyLanterns.ts`), sky ornaments (`SkyOrnaments.ts`) and the moving sky traffic (`src/traffic/`: airships, planes,
air taxis, drones, sky ships, flying carpets, the festival dragon, the sun-barque, the vimana, the janggan kite, sky whales,
sky koi, pegasi, birds).

**How to add one (read `skies.ts` and `SkyFX.ts` first):**
1. Add the name to `SkyKind` and `SKY_KINDS` in `skies.ts`.
2. List it in the land's `SKIES[land].effects`, and use its `palette`.
3. Draw it in `SkyFX.ts`, easing in and out through the existing `want` → `level` pattern: it fades with the land's
   weight and with `night`.

**Careful:** the Meadow's sky is `[...SKY_KINDS]`, so every new kind also appears over the Meadow (and at the
celebration, which shows every land's sky). Make each kind cheap, or tell Claude to leave it out of the Meadow.

**Guidelines for every sky artifact:**
1. **Belongs to the land**: a real tradition of that place (a festival, a craft, a story), or clearly fantasy in the Meadow
   and the Sky Isles. Two or three signature artifacts per land; do not give every land everything.
2. **Readable silhouette** at 50–300 m: bold, simple outlines; bright but not neon colours by day; a soft glow at night.
3. **Height bands**: kites and streamers 15–60 m (tied to the ground with visible strings); lantern festivals rise from
   rooftops to 200 m; balloons 60–200 m; ornaments (arches, rings, canopies) 150–600 m; celestial things beyond 2 km.
4. **Motion**: everything moves gently — sway, drift, rise, flutter, slow turning. Nothing fast or jerky; nothing that
   crosses the sun or moon disc for long.
5. **Time of day**: say for each artifact when it shows (day / dusk / night / festival) and fade it in and out over
   ~1 game hour (`SkyFX` passes `night` 0–1 and a land weight; follow the existing `level` pattern).
6. **Content rules**: creature-shaped artifacts (carp, dragons, birds) have no eyes/nose/mouth and a floating head;
   religious symbols are shown respectfully and never as objects of worship; no text needed.
7. **Budget**: instanced meshes or points; ≤ 1 k triangles per artifact design, ≤ 500 instances per land; glow small.
8. **Blending between lands**: artifacts ease out as you cross into the next land (use the land weight `SkyFX` gives).

| Land | Signature sky artifacts to add | When | Notes |
|---|---|---|---|
| Wanderers' Meadow | balloon clusters; flower-petal kites; floating lantern-flowers over the fields | day / dusk / night | fairy-tale colours; the celebration already has every land's sky |
| Sakura Hollow | **koinobori** carp streamers on tall poles above houses (tied, fluttering); paper lanterns on strings over the lanes | day / night | carp: faceless, floating heads, 3–5 per pole, black-red-blue |
| Hanok Village | **yeon** shield kites (rectangular with a round hole) on long strings; lotus lanterns at night (Yeondeunghoe) | day / night | lotus lanterns float low over the streets |
| Jade Terraces | **lantern festival**: hundreds of kongming lanterns rising at dusk; the festival dragon already flies | dusk / night | rise from rooftops, drift with wind, fade high up |
| Fjordhavn | **sea-eagle flocks** (traffic has eagles); **northern lights** lower and richer over the fjord; **midsummer bonfire sparks** rising from the shore | night / midsummer dusk | natural and calm — no fantasy craft here |
| Alpenrose | **hot-air balloons** over the peaks at dawn; alpine choughs; a paraglider-shaped kite (no person) | dawn / day | balloons with alpine patterns (stripes, edelweiss, cowbell motifs) |
| Old London | a **blimp** with lit panels (traffic has an airship); pigeons; **fog lanterns** glowing through mist | day / night | keep it grey-gold and Victorian |
| New Yonder | **drone light shows** (hundreds of points forming shapes: a heart, a tree, the lantern), **hologram billboards** in the sky, solar kites | night / day | the drones are points of light moving in formation |
| Firenzia | **Leonardo flying machines** (traffic has one); painted-ceiling cloud ornaments; paper hot-air balloons (Montgolfier style) | day | Renaissance colours — gold, rose, ultramarine |
| Maple Row | **biplanes trailing banners** (traffic), vintage balloons, a seaside kite festival (box kites, diamond kites) | day | pastel and bright |
| Madinat an-Nur | **hanging star lanterns** over the courtyards; a turning girih star already exists; doves | dusk / night | pierced-brass star shapes, warm light |
| Souq al-Qamar | **falcons** (traffic), flying carpets (traffic); **Ramadan lanterns (fanous)** strung over the souq | dusk / night | coloured-glass fanous |
| Nile Crossing | the **sun-barque** (traffic); **ibis flocks**; felucca-sail kites | day / dusk | gold and lapis blue |
| Tents of Rimal | the **Milky Way** (exists) made brighter; **sky lanterns released from the dunes**; falcons | night | minimal, starry, calm |
| Gulabi Nagar | **Makar Sankranti kites** (hundreds of paper kites, strings to rooftops); **Diwali lantern strings** (akash kandil) | day / night | kites fill the day sky; kandils glow at night |
| Kaveri Coast | **kite festival**; **temple-festival lamps** in the sky (floating oil-lamp lanterns); egrets | day / night | brass and marigold colours |
| Bagh-e-Noor | **kites over the gardens** (patang); pigeon flights (kabootar-baazi, traffic has pigeons); lamps floating on the channels at night | day / night | Mughal reds and whites |
| Nusa Rinjani | **janggan kites** (traffic) and **bebean fish kites**; **penjor** bamboo arches along the streets | day | penjor are tall curved bamboo poles with hanging palm-leaf ornaments |
| Aurora Huts | the aurora (exists) with **ice-crystal halos** and **sun pillars**; snowy owls (traffic) | night / day | cold blues and greens |
| The Sky Isles | **floating islands with waterfalls** (exists far off; bring some closer), **sky whales** (traffic), **cloud bridges**, drifting crystal lanterns | always | pale pearl, lilac and gold |

## 12. Vehicles — every design, how to detail it, and Safar's revamp

### 12.1 What exists (about 110 traffic designs in `src/traffic/designs.ts`, placed per land by `roster.ts`)

| Family | Designs (ids) | How they are built now |
|---|---|---|
| Buses, trams, trucks | `double-decker`, `post-bus`, `city-bus`, `red-bus`, `bemo`, `painted-truck`, `solar-tram`, `streetcar`, `cable-car`, `hover-bus` | `bus()` / `tram()` / `hoverBus()`: box bodies, window bands that glow at night, box wheels |
| Cars (classic) | `black-cab`, `solar-cab`, `vintage-car`, `vintage-car-2`, `nordic-car`, `taxi`, `petit-taxi`, `land-cruiser`, `dune-buggy`, `kei-van`, `snowmobile` | `car()`: a box or rounded body, cabin, glass, lamps |
| Cars (modern, futuristic) | `sedan`, `sedan-2`, `hatchback`, `hatchback-2`, `suv`, `suv-2`, `pickup`, `hover-car`, `hover-car-2`, `future-ev`, `future-ev-2` | `modern()` / `future()`: lathe glasshouse, rounded body, light bars |
| Three-wheelers | `auto-rickshaw`, `auto-rickshaw-2`, `tuk-tuk`, `tuk-tuk-2` | `autoRickshaw()` / `tukTuk()` |
| Animal-drawn and sleds | `carriage`, `caleche`, `tonga`, `pumpkin-coach`, `flower-cart`, `vardo`, `bullock-cart`, `buffalo-cart`, `donkey-cart`, `reindeer-sled`, `dog-sled`, `elephant`, `camel-caravan` | `cart()` + `quadruped()` from `creatures.ts` (legs trot) |
| Boats | `gondola`, `narrowboat`, `punt`, `ferry`, `yacht`, `catboat`, `longship`, `fishing-boat`, `paddle-steamer`, `junk`, `dragon-boat`, `sampan`, `yakatabune`, `turtle-ship`, `jukung`, `phinisi`, `dhow`, `abra`, `felucca`, `reed-boat`, `kettuvallam`, `snake-boat`, `shikara`, `ganga-boat`, `kayak`, `swan-boat`, `raft`, `tall-ship` | `shaper.hull()` + sails (`sailBoat()`), canopies (`rowBoat()`) |
| Aircraft | `airship`, `solar-blimp`, `zeppelin`, `air-taxi`, `air-taxi-2`, `drone`, `biplane`, `biplane-2`, `ornithopter`, `seaplane`, `light-plane`, `airliner`, `airliner-2`, `sky-jet` | lathe fuselages/envelopes, box wings, spinning propeller/rotor pieces |
| Magical craft | `sky-ship`, `crystal-skiff`, `flying-carpet`, `flying-carpet-2`, `sun-barque`, `pushpaka`, `festival-dragon`, `janggan` | hulls with wings, platforms, chained bodies |
| Creatures | `pegasi`, `unicorns-flying`, `sky-whale`, `sky-koi`, `sky-koi-2`, `cranes`, `eagle`, `owls`, `falcons`, `roc`, `phoenix`, `peacock-garuda`, `pigeons`, `light-birds`, `swans`, `ducks` | `quadruped()`, `bird()`, `skyWhale()`, `skyKoi()` — floating heads, animated pieces |

Only the London double-decker, the gondola, the drone, the petit taxi, the kei van and the reindeer sleds have been seen
in screenshots. **Contract**: each design is `Design` (`pieces` of `solid`/`glow` geometry + an `anim` about a `pivot`);
keep the ids, `realm`, rough `len`, and the animated pieces (`flapL/R`, `spinX/Y/Z`, `swingA/B`, `tail`, `fluke`).

**Frame and fields:**
- **Local frame:** forward is **+z**; y = 0 is the road surface (road) or the water line (water); sky designs are
  centred on their flight height.
- **Size and speed:** `len` (m, along z) sets the spacing and following distance; `speed` is the cruising speed in
  m/s. Keep both about as they are when you rebuild.
- **Pieces:** each piece becomes one instanced mesh per land, so keep a design to ≤ 4–5 pieces.
- **Traffic creatures** (animals pulling carts, flying creatures) follow the creature rules: floating heads, no faces.

**Couriers and ships already ride these designs** (`economy/workers.ts` `COURIER_RIDE`, `traffic/roster.ts`
`SHIP_LINE`), so these are seen most and are worth detailing first:
- road: `flower-cart`, `kei-van`, `hatchback`, `tuk-tuk-2`, `pickup`, `post-bus`, `hover-car`, `caleche`,
  `donkey-cart`, `camel-caravan`, `painted-truck`, `bullock-cart`, `tonga`, `bemo`, `reindeer-sled`;
- sky: `sky-ship`;
- water stand-ins at sea: `ferry`, `tall-ship`, `junk`, `dhow`, `kettuvallam`, `fishing-boat`.

### 12.2 How to detail a vehicle (checklist for every design)

1. **Reference first**: find the real vehicle (the brief names it) and match its proportions — length : height : width,
   wheelbase, overhangs, the cabin's rake. Traffic reads from 10–60 m, so silhouette matters most.
2. **Shape**: rounded, smooth bodies (lathe, scaled spheres, extrusions with bevels), never bare boxes. Panel gaps and
   shut lines as thin dark strips; bumpers, grilles, mirrors, door handles, roof racks where the real one has them.
3. **Wheels**: tyre with a darker tread band, a rim with 5–6 spokes or a hubcap, visible wheel arches; wheel size right
   for the vehicle (a bus ~1 m, a car ~0.65 m, a rickshaw ~0.5 m).
4. **Glass**: dark tinted by day (`GLASS`), warm glow panel behind it at night (`WARM`, glow geometry) — never bright
   white by day.
5. **Lights**: headlamps (`HEAD`), tail lamps (`TAIL`), indicators, cab signs; all small glow geometry.
6. **Livery by land**: colours and patterns from the land (London red, New Yonder yellow and solar blue, Indian painted
   trucks with floral panels, Balinese jukung stripes). Give each family 2–3 liveries.
7. **Boats**: correct hull shape per type (flat punt, high-prowed gondola with its ferro, clinker longship with shields,
   junk with battened sails, dhow and felucca lateen sails, houseboat thatched roof), a waterline, oars or rudders, rigging
   lines as thin rods.
8. **Aircraft**: correct wing plan and tail, engines, propellers as a spinning piece, landing gear, navigation lights
   (red left, green right, white tail).
9. **Nothing carries a person** (seats empty, glass glows). Animals pulling carts keep the creature rules.
10. **Budget** ≤ 3 k triangles per design (≤ 6 k for tall ship, ferry, airliner), few pieces (each piece is a draw call
    per design).

### 12.4 Ships (NEW — the owner asked for ships as well as boats)

Today the waters have only boats (lakes 24–34 m across, ponds, rivers 8–11 m wide), plus one small `tall-ship`. Real
ships need the **sea**: the world is an island and beyond the lands the ground slopes into the sea (`terrain.ts`
`outside()`). **Logic — done:**
- **Harbours and lanes:** the 14 coastal lands have harbours and a sea lane along their coast (§22).
- **Ships:** they sail out and back, ease into the pier head, tie up for 20 s and keep their distance from each other.
- **Cargo:** chartered shipping lines carry your harvests harbour to harbour.
- **Which ship sails where:** `traffic/roster.ts` `SEA_TRAFFIC` pairs each wanted ship id with a stand-in; the moment
  you add an id below to `designs.ts`, it replaces its stand-in.
- **Nusa Rinjani** is inland on this map, so its ships sail from Jade Terraces and Kaveri Coast.

**Your part** is the ships, as `Design`s in `designs.ts` with `realm: 'water'`, using exactly the ids below:
- **Size and speed:** the lane is ~640 m long with lanes 24 m apart, so ships up to ~120 m long fit. Use `speed`
  3–4 m/s.
- **Waterline:** at y = 0.
- **Detail:** use a lower level of detail far away.
- **The `sky-galleon`** (realm `sky`): Claude adds it to the Sky Isles' sky traffic once it exists.

| Ship (`id` to add) | Reference | Must have | Length | Land(s) |
|---|---|---|---|---|
| `cargo-ship` | general cargo ship | a long hull with a raked bow, the bridge and funnel aft, deck cranes, hatch covers, stacked cargo | 60–90 m | New Yonder, London, Souq al-Qamar |
| `container-ship` | feeder container ship | stacks of coloured containers (instanced boxes), bridge aft, gantry | 80–120 m | New Yonder, Nusa Rinjani |
| `ocean-liner` | a 1930s liner (Queen Mary–like) | black hull, white superstructure in tiers, three red-and-black funnels, rows of lit portholes, lifeboats on davits | 90–120 m | Old London, Maple Row |
| `cruise-ship` | a modern solarpunk cruise ship | white stepped superstructure, balcony rows, solar sails/wings, a garden deck | 90–120 m | New Yonder |
| `ferry-large` | ro-ro car ferry | bow visor, car deck doors, two funnels, open passenger decks | 50–70 m | Fjordhavn, Old London, Kaveri Coast |
| `fishing-trawler` | North Sea trawler | high bow, wheelhouse, gantry and nets, orange floats | 20–30 m | Fjordhavn, Aurora Huts |
| `hurtigruten` | coastal steamer | a Norwegian coastal steamer with a single funnel and a mast | 50–70 m | Fjordhavn, Aurora Huts |
| `dhow-large` | baghlah / boom (ocean dhow) | high carved stern, two lateen sails, teak hull | 30–40 m | Souq al-Qamar, Madinat an-Nur |
| `junk-large` | Chinese treasure-ship style junk | several battened sails in red-brown, a high stern castle, painted eyes are **not** allowed — use painted flowers/waves | 40–60 m | Jade Terraces |
| `phinisi-large` | Bugis phinisi schooner | two masts with seven sails, a curved wooden hull | 30–50 m | Nusa Rinjani |
| `kettuvallam-large` | a big Kerala rice barge / houseboat | thatched barrel roofs, a verandah deck | 25–30 m | Kaveri Coast |
| `tall-ship` (exists, improve) | three-masted full-rigged ship | square sails on all three masts, rigging lines, figurehead of flowers (no face), stern lanterns | 24→50 m | Maple Row, Firenzia, Old London |
| `hospital-ship` | a white hospital ship with a green crescent/herb-leaf sign (no cross) | white hull, a wide superstructure of wards, helipad | 70–90 m | any coastal land — ties to the clinics and charity |
| `research-vessel` | a polar research ship | red hull, ice-strengthened bow, cranes, a helideck, a radar mast | 50–70 m | Aurora Huts |
| `sky-galleon` | a magical airborne galleon (Sky Isles) | a tall ship's hull with feathered wings and glowing sails | 40 m | The Sky Isles (realm `sky`) |

Rules as for every vehicle (§12.2): real proportions, a waterline, rigging as thin rods, portholes and windows dark by day
and glowing at night, navigation lights (red port, green starboard, white masthead), no people on deck, no faces or
eyes on figureheads or bows. Budget: ≤ 12 k triangles per ship, instanced where parts repeat (containers, portholes,
lifeboats).

### 12.3 Does Safar need a revamp? **Yes.**

Safar (`buildVan` in `src/vehicles/vehicles.ts`) is built from flat boxes: teal and cream wall panels, window cut-outs,
a half-cylinder roof, box chassis. It works (the interior shows through the windows and matches the floor plan) but it
does not look like a real campervan. Rebuild it as a **Volkswagen Type 2 (T1 "split-screen") bus** in spirit (no badge):
- a **loaf-shaped body** with rounded corners all round, a slightly curved roof and a curved front;
- the **V-shaped front panel** (the "V" of the two-tone paint meeting at the nose) under a **split two-pane windscreen**
  with a centre pillar, beneath a small peak;
- **two-tone paint**: white/cream upper body and roof, colour (teal) lower body, divided along the waistline;
- round headlamps on the front, a spare-wheel mount, bumpers, hubcaps, a roof rack with luggage and the ladder;
- side windows in a row (keep the openings where the benches and bunks are, so the crew inside still shows);
- keep the **golden-thread band** of vines and flowers along the body (it is Safar's identity), the skylight, and the
  interior (`VanInterior.ts`, `vanLayout.ts`) exactly as laid out.

**Hard constraints** (tests): the floor plan in `vanLayout.ts` (`VAN.halfW`, `back`, `cab`, `front`, `floorY`, `wall`),
the two cab seats `CAB_SEATS` at least `SEAT_GAP` apart with the divider, the bunk and pet-bed positions — the body must
wrap them, never move them. Run `tests/van.test.ts`, `tests/world.test.ts` and `tests/celebration.test.ts` (they check the seats, `SEAT_GAP` and the divider).

Also rebuild the **little car** (a 1950s–60s rounded two-door, e.g. Fiat 500 / Beetle-like, two separate seats and the
console divider), the **old truck** (a 1950s pickup/lorry with rounded cab and wooden flatbed), and the **biplane**
(Tiger Moth-like: fabric wings with ribs, struts and wires, a radial or inline engine, the tandem cockpits with the
divider). Same seat constraints.

## 13. Trees and nature — what to rebuild, and how trees are built and textured here

### 13.1 How a tree is built (read `src/world/trees.ts`, `src/world/foliage.ts`, `src/world/wind.ts`)

- A species is a `Habit` in `HABITS`: height `h`, trunk radius, crown radius `r`, how it forks (`forks`, `spread`, `lift`,
  `limb`, `shrink`, `depth`, `leader`/`tiers` for conifer-like leaders), crown blob shape (`blob`, `squash`), `gnarl`,
  bark colour and marks, leaf colours and `card` (which leaf picture).
- `growTree()` grows the trunk and limbs as oriented cylinders (`wood()`), then crowns: smooth **blobs** (merged into a
  leafy mesh, slightly translucent, shaded with dappled light — `LEAF_FRAG` in `wind.ts`) covered in **leaf cards**
  (small textured quads from the leaf atlas, `leafCards()`), which sway in the wind.
- The **leaf atlas** (`leafAtlas()` in `foliage.ts`) is a 2 × 2 canvas-painted texture: `Broad`, `Small`, `Needles`,
  `Blossom`. Add cells for the new species (palm frond segment, bamboo leaves, banana leaf, pine needle tuft, fantasy
  crystal leaves) — widen it to 4 × 2 and extend `LeafKind`.
- **Bark**: trunk colour comes from the habit; the building surface shader (`surfaces.ts`) can pattern it — add bark
  surfaces (rough furrowed bark, papery birch, ringed palm trunk, jointed bamboo, smooth baobab) to `SURF` and set
  `g.surface` round the trunk parts.
- Wind: `sway` weights (0 at the base, 1 at the top) make crowns and fronds move; palms and bamboo should sway more.

### 13.2 The 12 species to rebuild (they still use the old primitives in `kit.ts` `tree()`)

- **Palm** (date palm): tall, slightly curved, ringed trunk (bark surface: rings); a crown of 15–25 long arching pinnate
  fronds — each frond a curved spine with leaf-card strips down both sides; hanging date clusters; dead fronds skirting
  below the crown. Height 12–20 m (×1.3–1.55 in the deserts).
- **Coconut**: leaning, curved trunk; looser crown of long drooping fronds; coconut clusters under the crown.
- **Pine** (Scots / stone pine): straight trunk, orange-brown upper bark, tiered branches with needle-card clumps; a
  stone-pine variant with an umbrella crown for Firenzia.
- **Snow pine** (spruce/fir): conical, dense tiers of drooping branches to the ground, snow lying on each tier (white
  blobs on top of the needle tiers).
- **Cypress**: a tall narrow flame-shaped column of dense dark foliage (one tall blob with many small needle cards).
- **Bamboo**: clumps of 10–30 jointed culms (nodes as rings) arching at the top, with narrow leaf cards in sprays.
- **Banana**: a fleshy pseudostem, 6–10 huge paddle leaves (some torn at the edges), a hanging bunch with a purple bud.
- **Baobab**: a massive bottle-shaped trunk, short stubby branches like roots at the top, sparse small leaves.
- **Sky Isles** (`cloud`, `crystal`, `candy`, `glowtree`): real branching fantasy trees — cloud willows with long trailing
  pale foliage, crystal-fruit trees with small glowing gem fruit, candy-blossom trees in pastel pinks, glow trees with
  softly lit leaves; plus new pastel blossom and silver-barked moon trees. Allow giants (the logic already places them).
- **Small plants** for the terrain zones (`nature.ts`): desert shrubs, acacia (umbrella thorn tree), reeds and lotus at
  water edges, mangroves on warm coasts, alpine flowers, low scrub on rocky slopes. Add them as kit plants and tell Claude
  their names so the zone tables can place them.

**Which species each land grows** (`regions.ts` `flora`; `nature.ts` also picks by terrain zone). Rebuild the ones
seen most first:

| Species | Lands |
|---|---|
| `palm` | Nusa Rinjani, Madinat an-Nur, Souq al-Qamar, Kaveri Coast, Gulabi Nagar, Nile Crossing, Tents of Rimal (and every oasis) |
| `coconut` | Nusa Rinjani, Kaveri Coast |
| `pine` | Fjordhavn, Alpenrose, Hanok Village, Sakura Hollow, Jade Terraces |
| `snowpine` | Aurora Huts (and snow zones) |
| `cypress` | Firenzia, Madinat an-Nur, Bagh-e-Noor |
| `bamboo` | Sakura Hollow, Jade Terraces |
| `banana` | Nusa Rinjani, Kaveri Coast, Nile Crossing |
| `baobab`, `dragonblood` | Nile Crossing, Tents of Rimal, Souq al-Qamar |
| `cloud`, `crystal`, `candy`, `glowtree` | the Sky Isles (`candy` also the Meadow and Maple Row; `glowtree` also Aurora Huts) |

**Done means**: each species screenshotted up close (6 m) and in a stand (40 m), by day and in wind; ≤ 3 k triangles
per tree and ≤ 40 leaf cards per crown on average; `tests/foliage.test.ts` and `tests/world.test.ts` pass.

## 14. Terrain and texturing

> Add to the ground's look; never change its shape — see §23.

### 14.1 How the ground is drawn now
- `src/world/terrain.ts`: heights (`naturalHeight`: relief, dunes via `duneShape`, carved water) and per-vertex ground
  colour (`groundColor`: the land's `ground`/`groundAlt` blended by noise, snow above the snowline, rock on slopes via
  `rockOnSlope`, sand at water edges).
- `src/world/Meadow.ts` `patternGround`: a shader layer on the ground — sand ripples, snow sastrugi and glints, driven by
  the wind direction; plus the grass and flower rings.
- `src/world/surfaces.ts`: procedural surfaces for buildings (`SURF`), patterned in world space and faded with distance.

### 14.2 What to add (lands that look flat now: the desert, the Nile, the Gulf, the Arctic, the Sky Isles)
- **Desert and sand**: wind ripples at two scales, sharper dune crests with a lit windward side and a shadowed slip face,
  darker damp sand round oases, scattered pebbles, cracked-clay pans between dunes.
- **Rock**: horizontal strata bands on slopes (sandstone reds and ochres in the desert, grey granite in the north),
  boulders and outcrops scattered by zone (`nature.ts` `rock` zone), scree at the foot of slopes.
- **Snow and ice**: drift ridges (sastrugi) aligned with the wind, blue shadows in hollows, glittering sparkle at low
  sun, bare wind-scoured patches, frozen lake ice with cracks.
- **Grass lands**: worn earth paths between houses, mud near water, clover and moss patches.
- **Sky Isles**: cloud-stone paving near buildings, star-dust veins (faint glowing lines at night), moss and flower
  meadows, soft pearl-white ground with lilac and blue tints.
- **Surfaces** (`surfaces.ts` `SURF`): woven tent cloth with stripes, turf, birch bark, log ends, snow blocks, sandstone
  layers, coral stone, mud brick with straw, thatch variants, glazed tiles in more patterns.
Keep every pattern world-space and distance-faded (the existing shader shows how) so there is no shimmering.

## 15. Caves and caverns

**Logic (done by Claude, `src/world/caves.ts`)**: 3–5 caves in each of: Tents of Rimal and Nile Crossing (`sandstone`),
Souq al-Qamar and Fjordhavn (`rock`), Aurora Huts and Alpenrose (`ice`). Each stands in the countryside with its mouth
facing the town; the travellers explore it with E at the mouth once a day and bring out finds (cave crystals, glass sand,
ice, …). Colliders are placed by the logic (a circle of 0.85 × the cave radius).

**Your model**: `buildCave(c, style, r)` in `src/world/models/caves.ts` (placeholder: a heap of boulders with a dark arch).

| Style | Where | Build it as | Surfaces / colours | Details and glow |
|---|---|---|---|---|
| `sandstone` | Tents of Rimal, Nile Crossing | a wind-carved sandstone outcrop or cliff with horizontal strata, an arch or overhang, the cave mouth in its face; fallen blocks at the foot | layered reds, ochres and creams | a hint of torchlight inside at night; sand drifted into the mouth |
| `rock` | Souq al-Qamar (dark limestone hills), Fjordhavn (sea-cliff caves) | a craggy dark rock outcrop with a jagged mouth; for the fjord, a cliff face with a sea cave at the waterline | greys and browns; lichen on the north side | a glint of crystal in the dark; drips (particles, §17) |
| `ice` | Aurora Huts, Alpenrose | a mound of blue glacier ice and snow with an arched mouth, icicles hanging from the lip | white snow over translucent blue ice | a soft blue glow from inside (glow geometry), frost sparkle (§17) |

**Constraints**: size `r` 7–11 m (given); mouth ≈ 3 m high and 3–4 m wide, facing **+z**, floor at y ≈ 0 and walkable to
~2 m inside; the mound must enclose the collider circle; ≤ 8 k triangles each; vary each cave (use `c.rng`).

**Cavern interiors — wired:**
- **The contract:** `buildInterior({ kind: 'cavern', ref: style, land, night, seed })` (§20).
- **What they hold:** stalactites and stalagmites, crystal clusters that glow, an underground pool, ice columns and
  frozen waterfalls in the ice caverns, rock paintings of abstract patterns (no figures).
- **When you enter:** as soon as it returns a scene, exploring a cave takes the travellers inside it after they bring
  out their finds. Until then they stay at the mouth.

## 16. Fixed already (for your information)

Several traditional roofs were rotated wrongly and have been fixed in `traditions.ts`: the glass cabin's panes (were an
inverted V), the snow igloo's entrance tunnel (was upside down), the Nubian barrel vaults (faced sideways) and the curved
Bengal-style roofs on jharokhas and Mughal pavilions (faced forward). Check other rotated half-cylinders and arcs you
write: a `CylinderGeometry` half (thetaLength π) must be turned so its curve faces up.

**Built water flows — use the helpers, never flat blue boxes** (`src/world/flowWater.ts`):
- **The helpers:**
  - `waterChannel(c, x, y, z, len, w, ry, { stone, flow, speed, jets })` for garden canals;
  - `waterPool(...)` for reflecting pools and tanks;
  - `waterBasin(c, x, y, z, r, { tiers })` for fountains;
  - `fountainJet(...)` for single jets.
- **What they give you:** each piece is banked like a fountain, with a raised stone kerb, a glowing foam line where the
  water meets the stone, and the water on one shared material that runs in its `flow` direction (red/blue of the vertex
  colour = direction, green = speed) and glows at night.
- **Frames:** they draw in `c.g`'s current frame, so they line up inside any frame. The water goes to `c.water` when the
  context has one (monuments, towns, town dressing), else to `c.glow`.
- **Where they're used today:** the Taj's charbagh (a central tank, four channels flowing outward, jets down the long
  canal), the Alhambra's reflecting pool, the temple tank, plaza, courtyard and town fountains, and the Meadow's well.
- **Use them** for every new pool, channel, tank, ghat or fountain (lotus ponds, §6; the castle's fountain, §19).

**Frames must include the glow.** `c.g.frame(...)` moves only the solid builder. Anything drawn into `c.glow` inside
it lands at the unmoved origin unless you wrap the glow too: `c.g.frame(x, y, z, ry, s, () => c.glow.frame(x, y, z,
ry, s, () => { … }))`. Three landmarks had this slip, and it is fixed now:
- the Taj Mahal's windows were drawn 30 m in front of their arches;
- the Meadow windmill's window glowed near the Great Tree;
- the Aurora ice hall's six domes all glowed at its centre.

Also fixed on the Taj: the octagonal tomb is turned so a great arched face looks straight down the garden axis to the
gate, not a corner.

## 17. Particles and sky effects (NEW)

> Add effects; keep the owner-approved skies, stars and lanterns exactly as they are — see §23.

Particle and sky systems live in `src/world/Weather.ts`, `Ambience.ts`, `RegionFX.ts`, `SkyFX.ts`, `SkyOrnaments.ts`,
`SkyLanterns.ts` (you may edit these; keep their public methods). Keep particle counts modest (a few hundred per effect).
- **Flames and embers** for the new lighting (§4): flickering flames on diyas, oil lamps, torches and tent lamps, rising
  embers from fires; small, additive, brighter at night.
- **Waterfall mist and spray** where water pours off the Sky Isles' floating islands (§8) and at river weirs.
- **Caves** (§15): drifting dust and occasional drips at sandstone and rock cave mouths; frost sparkle and cold mist at ice
  caverns.
- **Lantern festival** over Jade Terraces: hundreds of kongming lanterns rising and drifting at dusk (`SkyLanterns.ts`).
- **Koinobori** carp streamers on poles in Sakura Hollow; **Diwali lantern strings** over Gulabi Nagar's streets; **penjor**
  arches in Nusa Rinjani; **kites** over Bagh-e-Noor; **balloon clusters** drifting in every sky (§10).
- **Wind in cloth**: robes, headscarves and dupattas swaying with the wind (`wind.ts` `currentWind`) — capes already
  ripple; keep every garment modest and never detach it. (Characters are shared ground: coordinate under Contract
  requests before editing `CharacterModel.ts`.)
- Time-of-day behaviour of sky traffic (kites and balloons by day, lantern boats at dusk, quieter nights) and aircraft
  landing at airfields are **logic** (Claude) — tell Claude if a design needs extra pieces for them.

## 18. How texturing works here — vehicles, trees, buildings, terrain, creatures

There are **no image texture files** in this project (except canvas-painted atlases made in code). Everything is
**procedural**: shapes carry colours per vertex, and shaders add patterns. Follow the pattern that fits:

| What | How it is textured now | How to texture it better |
|---|---|---|
| **Buildings, landmarks, bridges, caves** (`GeoBuilder`) | vertex colour + a per-vertex **surface id** (`surf` attribute) that the world shader turns into brick, stone, plaster, tiles, thatch, wood, glass… in world space, faded with distance (`surfaces.ts`, `wind.ts` `swayMaterial`) | set `c.g.surface = SURF.x` around parts (see `surf()` in `traditions.ts`), or map a colour to a surface in `LAND_SURFACES`; add new surfaces to `SURF` + `SURFACE_GLSL` (keep the `aa` distance fade) |
| **Trees** | trunk colour per habit; crowns are translucent dappled blobs + leaf cards from a canvas atlas (`foliage.ts`) | add atlas cells for new leaves; add bark surfaces (§13.1) |
| **Terrain** | per-vertex ground colour (`terrain.ts`) + ground patterns shader (`Meadow.ts` `patternGround`) | add patterns per zone (§14) |
| **Animals and creatures** | object-space procedural skins in `src/animals/skins.ts`: fur streaks, feather barbs, overlapping scales with sheen | reuse `skinMaterial(colour, 'fur' | 'feather' | 'scale')` for traffic creatures too (they use flat colours now) |
| **Traffic vehicles** (`src/traffic/`) | flat vertex colours on one `MeshStandardMaterial` per land (instanced), glow on an additive material | add an **object-space** pattern shader like `skins.ts` (position in the vehicle's own frame, so patterns move with it) keyed by a per-vertex `surf` id from `Shaper` (add a `surface` option to `Shaper.add`): car paint with fine metallic flake, chrome, rubber tyre tread, wood planks and grain (boats, carts), canvas and sailcloth weave (sails, canopies, tents), rattan/bamboo weave (Asian boats, rickshaw hoods), riveted steel (trams, ferries), fabric wing ribs (biplane), balloon envelope gores |
| **Player vehicles** (`src/vehicles/vehicles.ts`) | `finish(colour)` chooses clear-coat paint, chrome, rubber or wood by colour, lit by a small studio reflection (`setVehicleEnvironment`) | keep the finishes; add the object-space patterns for wood, fabric, tread; Safar's two-tone paint with a subtle gloss |

Rules for all texturing: patterns must not shimmer at a distance (fade them with `fwidth`/distance as `surfaces.ts` does),
keep colours in the land's palette, keep glow small, and never paint faces or eyes onto anything.

## 19. The celebration castle — revamp

**What it is**: the Meadow's fairy-tale castle where the story's celebration evening happens (`src/event/Castle.ts`,
`buildCastle(solid, glowMat)` → `{ group, colliders, y }`; placed at `CASTLE_SITE` north of the Meadow town; the evening
itself is staged in its courtyard by `src/event/CelebrationScene.ts` and `Celebration.ts`). Now: an ivory keep with
rose-pink spires and gold finials, a grand stair, a round courtyard with a rose-arched aisle, fairy lights and flowers
(153 lines of primitives).

**Keep**: its palette — ivory `#fbf1f4`, stone `#eadfe6`, pink `#f49ac1`, rose `#e8588c`, gold `#f5c451`, lilac
`#c9b3f0` (the Meadow is pink-hazed and fairy-tale; do not turn it white-and-blue); the courtyard's position, size and the
aisle where the celebration is staged (read `CelebrationScene.ts` for the positions it uses — seats, the aisle, the stage
spots — and do not move them); `colliders` covering every wall and tower; the grand stair walkable.

**Rebuild it as a real fairy-tale castle** (after Neuschwanstein, Disney-like silhouettes and Château de Chambord for the
roofscape):
- a **curtain wall** with battlements and a **gatehouse** (arched gate, portcullis raised, two drum towers);
- a **keep / palace block** of 4–5 storeys with tall arched windows, balconies with balustrades, oriel windows, a bay;
- **towers of different heights** (5–9): round and octagonal, each with a tall conical or bell-shaped roof in rose-pink
  with gold finials and pennants; slender turrets on corbels; a tallest central tower;
- **roofscape**: steep roofs with dormers, chimneys, ridge crests, weather vanes (no faces);
- the **grand stair** from the meadow to the gate; the **round courtyard** with arcades round it, the rose-arched aisle,
  a fountain;
- **gardens** round it: hedges, rose beds, lantern-lined paths, a bridge over a moat or stream;
- **night**: every window softly lit, lanterns on the gate, fairy lights along the battlements and spires (glow, small).
Budget ≤ 200 k triangles; one merged solid + one glow mesh as now.

**Castle interior** (see §20): the **great hall** (vaulted, stained-glass windows, chandeliers of floating candles,
a gallery, long tables for the feast — the celebration's dress and banquet can later move inside), a **library tower**
room, and a **tower-top balcony** room looking out over the Meadow.
- **The door:** there is no door into the castle yet; Claude adds it (master list L5). Keep a clear doorway at the top of
  the grand stair, and tell Claude its position under Contract requests.
- **The scenes:** `buildInterior({ kind: 'castle', ref: 'hall' | 'library' | 'tower' })`; the hall is first.

## 20. Interiors for these builds

Today every door leads to one standard furnished room (`src/housing/HouseInterior.ts`, 9 × 8 m, styled per land family);
landmarks reuse it with their name. The owner wants real interiors for the new builds. **Contract**:
`buildInterior(spec): InteriorBuild | null` in `src/world/models/interiors.ts` (placeholder returns null → the standard
room is used). Claude wires entering, the camera, who sits and stands where, and the actions (gather, talk, rest, the
institute and research panels) — you build the scene and say where people go.

**Wired (logic done):** return a build and it is used at once. Seats are `[x, seat height, z]` (0.45 chair, 0.25 floor
cushion); the first of `spots` is where the host stands, the rest are for residents and staff; `gather` puts the
glowing mote; the camera sways gently about `camera.pos`. Institutes are entered with “Step inside” on the institute
panel (`spec.ref` = kind, `spec.stage`), caverns after exploring a cave (`spec.ref` = `sandstone`/`rock`/`ice`).

**Rules for every interior**: floor at y = 0, the way in at +z; the two travellers' `seats` at least 2.2 m apart (they
never touch); `spots` for others at least 1.5 m from both seats; windows show day or night by `spec.night`; lamps small
glow; ≤ 60 k triangles (≤ 120 k for the castle great hall and stage-3 institutes); no images of worship, no statues with
faces, no eyes on anything.

| Interior | `spec.kind` / `ref` | What it should be |
|---|---|---|
| Monument halls | `landmark` / land id | inside each monument (§1): the pagoda's central-pillar hall with lanterns; the Korean throne hall with painted beams and an empty dais; the Temple of Heaven's round hall with its blue-gold ceiling; the stave church's dark timber nave with candles; the Zytglogge clock mechanism room; Westminster Hall's hammer-beam roof; the deco tower's lobby and an observation deck; Florence's nave under the dome; the carousel pavilion; the Alhambra courts and the mosque's prayer hall (carpets, lamps, mihrab niche with geometry — no images); the souq arcades; the majlis tent; the hypostyle hall; the Hawa Mahal's lattice galleries; a pillared mandapa with oil lamps (no images); the Taj's octagonal hall with the marble jali screen; Borobudur's gallery walk; the ice hall's glowing ice rooms; the Great Lantern's temple |
| The castle | `castle` / `hall`, `library`, `tower` | §19 |
| Institutes | `institute` / kind, `stage` 0–3 | the inside of every stage (§2): the watch boutique's counter and display cases; the atelier's benches under big windows; the manufacture's workshop floor; the school's classrooms; soup kitchen pots, serving counter and long tables; clinic beds and a medicine cabinet (a green crescent or herb-leaf sign, no cross); hospital wards; tent-school mats and board; library shelves and reading tables; the lab with instruments where theses are written; the castle school's great hall of floating candles |
| Penthouses | `penthouse` | glass walls onto a terrace, a lounge, a kitchen, plants, a pool outside, the city lights of New Yonder beyond |
| Caverns | `cavern` / `sandstone`, `rock`, `ice` | §15 "later": stalactites, glowing crystal clusters, an underground pool, ice columns and frozen waterfalls, abstract rock patterns |

---

## 21. Farmland and barns (NEW — contract `src/world/models/fields.ts`)

The game now has agriculture land: two 40 × 40 m fields per land (not the Sky Isles), at local (±205, +62) from the
land's centre, beside the east and west avenues (`FIELD_SITES` in `src/world/plots.ts`). The rules
(`src/economy/fields.ts`) sow eight rows of one crop, grow it, and store harvests in the field's barn; the view
(`src/economy/FieldsView.ts`) calls `buildField(c, size, look, ground)` and redraws it at each quarter of growth.

**Replace the body of `buildField`; keep its signature and `BARN`.**

- `look.owned = false`: open farmland for sale: wild grass or fallow ground, corner stakes, a signpost.
- `look.owned = true`: the field tilled in the land's own farming style, eight rows along x between z ≈ −11 and +17,
  and the barn at `BARN` (local −13, −16, facing +z).
  - **Paddy fields:** terraced paddies with bunds and water in Nusa Rinjani and Kaveri Coast; flooded paddies in Jade
    Terraces, Sakura Hollow and Hanok Village.
  - **Temperate fields:** hedged strips in Old London and Maple Row; dry-stone walls in Alpenrose and Fjordhavn.
  - **Desert and river fields:** irrigation channels, date palms and a shaduf in Nile Crossing, the Tents of Rimal and
    Souq al-Qamar; a chahar-bagh water rill in Bagh-e-Noor and Madinat an-Nur.
  - **Other lands:** mustard-yellow and marigold borders in Gulabi Nagar; greenhouses under the snow in Aurora Huts; a
    rooftop-farm look for New Yonder (solar panels on the barn); flower meadows in the Meadow.
- **Crops by `look.crop.shape`** (`stalk`, `bush`, `vine`, `flower`), using its `leaf` and `ripe` colours, sized by
  `look.growth` 0..1: seedlings, then leafy, then bearing. Rice stands in water; wheat turns gold; sunflowers face
  the sun; pumpkins lie on the ground; tea is clipped hedges; cotton shows white bolls.
- **The barn in the land's style:**
  - a lumbung rice barn (Indonesia) or a stilted granary (India);
  - a timber hay barn (Norway, Switzerland, Maple Row);
  - a mud-brick store with a dovecote (Egypt, the desert lands) or a tent store (Tents of Rimal);
  - a red-painted barn (Old London, Meadow);
  - an ice-block store (Aurora).
  - Add a lamp by the door in `c.glow`.
- **Grounding:** `ground(x, z)` gives the terrain height at a local point; sit every row and post on it (fields can
  slope up to ~5 m).
- **Budget:** ≤ 25 k triangles a field; no people, no scarecrows (no human figures with faces).
- **Also wanted:** farm workers at work are welcome later as figures from `CharacterModel` (no faces), but not in
  this builder.

---

## 22. Harbours (NEW — contract `src/world/models/harbour.ts`)

The 14 coastal lands now have harbours: `src/world/harbours.ts` finds the real shore at the end of each land's
seaward avenue and puts a quay there and a pier out to deep water. The piers are 35–145 m long, set from the terrain.
Ships sail a sea lane along each coast and tie up at the pier head (`traffic/Traffic.ts`, `SEA_TRAFFIC` in
`traffic/roster.ts`).

- **Which lands:** Aurora Huts, Fjordhavn, Alpenrose and Old London face north; New Yonder faces north; Hanok Village
  and Jade Terraces face west; Maple Row and Souq al-Qamar face east; Kaveri Coast, Gulabi Nagar, Bagh-e-Noor, Nile
  Crossing and Tents of Rimal face south.
- **Nusa Rinjani is inland on this map**, so it has no harbour. The ships wanted there sail from Jade Terraces and
  Kaveri Coast instead.

**Replace the body of `buildHarbour`; keep its signature, `DECK` and `WAREHOUSE`.**

- **Local frame:** the origin is on the quay at the shore; +z points out to sea; the deck is at y = 0.
- **The pier** runs from z = 0 to z = `pier`, 4 m wide and flat: the game makes it walkable with platforms along
  x = 0 and a quay about 26 × 10 m. Keep those walkable areas where they are.
- **On land (z < 0):** the harbour office or warehouse at `WAREHOUSE`, which is also its collider.
- **Each land's style:**
  - Old London and New Yonder: brick warehouses, cranes, bollards; New Yonder adds a solarpunk terminal with green
    roofs and screens.
  - Fjordhavn and Aurora Huts: red fishing sheds, fish-drying racks, a lighthouse.
  - Hanok Village and Jade Terraces: stone quays with lantern posts and curved-roof pavilions.
  - Souq al-Qamar and Tents of Rimal: dhow slipways and palm-thatch shades.
  - Kaveri Coast: stilted boathouses and Chinese fishing nets.
  - Nile Crossing: a felucca landing with steps.
  - Maple Row: a painted pier pavilion.
  - Gulabi Nagar and Bagh-e-Noor: ghats with steps and chhatris.
  - Alpenrose: a lake-steamer landing stage.
- **Lamps** along the pier go in `c.glow`, small.
- **Grounding:** `ground(x, z)` is the terrain height relative to the deck; sit the land-side buildings on it.
- **Budget:** ≤ 30 k triangles; no people, no faces.

**Ships:** add the §12.4 ids to `designs.ts`. The sea lanes already name them, and each one sails the moment its id
exists (`resolveShip`); until then a stand-in sails in its place. Ships up to ~120 m long fit the lanes (each coast
lane is ~640 m long with lanes 24 m apart).

---

## 23. Existing terrain and effects — keep them, add to them (READ BEFORE §14 and §17)

**Decision:** we are *not* replacing the terrain and effects that exist. §14 and §17 ask you to **add** layers on top
(richer ground patterns, rock strata, sastrugi, flames, mist, festival lanterns). Everything that is there now
stays unless the owner asks for a change.

### 23.1 Do not change — the shape of the land (Claude owns it)
- **Heights:** everything in `terrain.ts` that decides height: `naturalHeight`, `terrainHeight`, `outside` (the island
  edge and the sea), dune height (`DUNES`, `duneShape`), plot and castle levelling, platforms, and `WATER_Y`.
- **Water placement:** `waters.ts`, which decides where lakes, ponds and rivers are and how they are carved.
- **Why:** these place things. The 14 harbours and their sea lanes are found from the shore; the 22 bridges from where
  rivers cross the avenues; the two fields per land need dry, even ground. Plots, caves, houses, trees and the
  walkways on piers and bridges depend on them too. Tests check all of this (`tests/harbours.test.ts`,
  `tests/bridges.test.ts`, `tests/supply.test.ts`, `tests/nature.test.ts`, `tests/world.test.ts`).
- **If you need a height change** (a hollow for a cave, a terrace, a riverbank), write it under Contract requests and
  Claude will make it and re-check the placements.

### 23.2 Free to improve — the look of the land
- **Ground:** `groundColor` (ground colours, rock on slopes, snow, sand at water edges), `patternGround`, `surfaces.ts`,
  and the water shader in `Water.ts`. Keep its uniforms and `setWaterLook`.
- **Effects:** the effect files of §17. Keep their public methods, and keep every pattern world-space and faded with
  distance.

### 23.3 Owner-approved looks — keep exactly as they are
- **Sky colours** (`locale.ts` `LOCALES[land].sky`, blended in `Sky.ts`):
  - the Meadow keeps its **pink** sky ("pink is needed for meadows");
  - the grass lands have a light, **white sky tinted a little blue**;
  - the desert lands are **white with a yellowish tint**;
  - the owner asked to lose the pinkish cast everywhere except the Meadow.
- **Night sky:** stars dimmed; a **faint** Milky Way and a **dim** nebula. Keep them subtle; do not brighten them.
- **Bagh-e-Noor's crescent** moon with its orbit (`SkyFX.ts`). The owner remembers it; keep it.
- **Each land's lanterns:** its own lantern design on posts and in the sky, glowing by intensity, and the day/night
  switch of the sky ornaments.
- **The Meadow celebration:** every land's particles at once; the aurora-like rainbows, brighter at night.
- **Grass and trees:** dense, even grass tufts; translucent leafy tree crowns; wind in grass, foliage and particles.
- **The crowns** (characters are shared, so ask before editing `CharacterModel.ts`): the girl's grand arched crown with
  rose and ruby gems is bigger than the boy's pearl tiara, both float above the head, and **neither spins**.

### 23.4 When you change an existing effect
Take before-and-after screenshots, by day and by night, in the same place, and put them in your report. If a change
alters any look in 23.3, don't make it: ask under Contract requests.

---

## 24. Checking your work — scripts, performance and the report

**Run the game in a script** (`scripts/probe/README.md`):
- Start `npx vite --port 5191 --strictPort`, then run
  `NODE_PATH=$(npm root -g) CHROME=/opt/pw-browsers/chromium PORT=5191 node scripts/probe/probe.cjs your-script.js`.
- Software rendering takes seconds per frame, so move time without drawing (`quiet(secs)` in `example.js`) and draw
  only for screenshots.

Snippets (the script body runs in the page; `game`, `dev`, `RGN` and `shot()` are defined):
```js
const quiet = (secs) => { const c = game.composer, r = c.render; c.render = () => {}; dev.step(secs); c.render = r; };
// Stand at (x, z) and look along (dx, dz): yaw 0 looks south (+z), π looks north (−z). The camera sits `dist` behind
// you, so keep that spot clear of houses and trees (stand inside the site, or look from the water).
const look = async (name, x, z, dx, dz, pitch, dist, hour) => {
  game.trav.teleport(x, z);
  Object.assign(game.trav, { camYaw: Math.atan2(dx, dz), camPitch: pitch, camDist: dist });
  game.st.minutes = Math.floor(game.st.minutes / 1440) * 1440 + hour * 60; quiet(3); dev.step(1 / 60); await shot(name);
};
const c = RGN.regionCenter(RGN.REGION_BY_ID.london);
// An institute at any stage: put one on an open site (london-s1 is at local +150, −150), redraw, look from above.
game.st.institutes.push({ site: 'london-s1', kind: 'clinic', stage: 3, at: game.st.minutes }); game.institutesView.update();
await look('clinic-3', c.x + 150, c.z - 132, 0, -1, 0.6, 24, 11);
// A field you own, growing wheat (london-f1 is at local +205, +62).
game.st.fields['london-f1'] = { store: {}, at: game.st.minutes, crop: { seed: 'seed_wheat', plantedAt: game.st.minutes - 1000 } };
game.fieldsView.update(); await look('field', c.x + 205, c.z + 70, 0, -1, 0.6, 16, 11);
// A harbour, from the pier head looking back to the quay (positions come from the data).
const hb = (await import('/src/world/harbours.ts')).harbourOf('london');
await look('harbour', hb.headX, hb.headZ, -hb.dir[0], -hb.dir[1], 0.3, 20, 11);
// A bridge, seen from its bank.
const br = (await import('/src/world/bridges.ts')).bridgesOf('london')[0];
await look('bridge', br.x - br.dir[0] * (br.length / 2 + 8), br.z - br.dir[1] * (br.length / 2 + 8), br.dir[0], br.dir[1], 0.3, 12, 11);
// Inside an institute (your buildInterior scene, or the standard room).
game.enterInstitute('london-inst'); quiet(1); dev.step(1 / 60); await shot('inside'); game.exitHouse();
// Performance where you stand: reset the counters (they are not reset each frame), draw one frame, read them.
game.trav.teleport(c.x + 4, c.z + 30); quiet(2);
game.renderer.info.reset(); dev.step(1 / 60); return JSON.stringify(game.renderer.info.render);
```

**Performance budget** (measure with the last lines above, standing on the plaza):
- **Today's baseline:** measured on 2026-09-27, one frame including the shadow and glow passes costs about 2,450–3,350
  draw calls and 3.1–4.9 M triangles (London 2,613 / 3.6 M; New Yonder 2,456 / 4.9 M; the Meadow 3,357 / 3.7 M; Sakura
  Hollow 3,210 / 3.1 M).
- **Your changes** should not raise a land's numbers by more than ~10% unless the owner agrees. Report before and
  after, same spot, same hour.
- **Static world:** a few merged meshes per land (solid, glow, leaves, leaf cards). Never add one mesh per house, lamp
  or tree; use the land's `GeoBuilder`s or instancing.

**The report** (`docs/team/handoffs/CHATGPT_3D_REPORT.md`, newest at the top), for each push:
1. what changed, per section of this file, and the files touched;
2. screenshots before and after, by day and night: small JPEGs (≤ 300 KB) in `docs/team/shots/<date>/`, linked from
   the report;
3. what you checked by eye, the `npx vitest run` and `npx tsc --noEmit` results, and the triangle and draw-call numbers;
4. new ids or contracts for Claude to wire (also under Contract requests), and anything you were unsure of.

---

## Contract requests

(ChatGPT: write here any change you need to a contract or to a Claude-owned file, with the reason. Claude answers here.)
