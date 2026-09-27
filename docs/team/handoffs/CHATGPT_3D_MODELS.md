# Physical models — requirements for Codex / ChatGPT (3D side), 2026-09-27

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
- **Files Claude owns** (do not edit): `src/core/*`, `src/charity/*`, `src/institutions/*`, `src/economy/*`, `src/housing/housing.ts`,
  `src/housing/HouseInterior.ts` rules, `src/ui/*`, `src/Game.ts`, `src/traffic/Traffic.ts` and `roster.ts`,
  `src/world/RegionBuilder.ts` placement, `tests/*` (you may *add* test files for your models).
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

## 3. Homes that grow storeys (NEW)

Contract: `addStoreys(c: Ctx, base: Footprint, floors: number, scaffold: boolean): Footprint` in
`src/world/models/homeStoreys.ts`. Called by the home builder with the number of finished floors (0–3) and whether a
floor is under construction. Build each storey in the land's style matching the house below (same walls, windows, trim;
for tents: a second tent level or a larger tent; for igloos: a larger dome beside; for Sky Isles: another spire tier),
lift the roof to the new top, add an outside stair or balcony where the style has one. Under construction: scaffolding
poles and planks, ladders, stacked materials. Return the new footprint. (Rules and state: `src/charity/charity.ts`.)

## 4. City lighting per land (NEW)

Contracts in `src/world/models/lights.ts`: `houseLights(c, fp)` (around every house) and `streetLight(c, x, y, z)`
(return `true` if you placed a land-specific light standard, else the land's lamp post is used). Small glow only.

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
| Others | their lantern at the door | their lamp post (existing) |

## 5. Bridges (NEW)

Contract: `buildBridge(c, length, width, deck): { deckAt(x) }` in `src/world/models/bridges.ts`, spanning x from −L/2
to +L/2, banks at y = 0, deck top at `deck`, walkable (return the deck height profile). Styles by `c.s.id`: stone arch
(London, Firenzia — Ponte Vecchio-like with shops, Alpenrose), timber (Fjordhavn, Aurora), red arched (Sakura Hollow),
moon bridge (Jade Terraces), stone slab with dancheong railings (Hanok Village), marble (Bagh-e-Noor), bamboo/rope
(Nusa Rinjani, Kaveri Coast), iron truss (New Yonder, Maple Row), mud-brick causeway (desert, Nile), cloud-stone (Sky
Isles). Lengths 10–30 m. Claude places them where paths cross rivers.

## 6. Water lotus ponds (NEW)

A lotus pond model: a stone- or brick-edged pond (4–12 m) with steps, lotus leaves and flowers (pink/white) that glow a
little at night, in the land's style (stepwell edge in Gulabi Nagar, marble in Bagh-e-Noor, granite in Kaveri Coast, a
stone lantern beside it in Sakura Hollow). Contract to add: `lotusPond(c, r)` in `src/world/models/ponds.ts` (create it).

## 7. New Yonder: screens, cyber/solarpunk artifacts, penthouses (NEW)

- **Large display screens** (Times Square style): huge screens wrapping tower corners, stacked billboards, a ticker
  ribbon round a tower, screens facing the plaza. They need an animated shader material (uniform `uTime`): peaceful
  content — abstract art, nature scenes drawn procedurally, a news-ticker band of glyph blocks (no real text needed).
  Put them in their own mesh per land (one material) so they can animate; tell Claude the API in your report.
- **TV panels**: smaller screens on shopfronts and brownstones.
- **Artifacts**: neon signs, holographic billboards, vertical farms, solar trees, wind walls, a monorail on pylons along
  an avenue, drone docks on roofs, green sky-bridges between towers.
- **Penthouses**: luxury rooftop homes on the tallest towers — glass pavilions, terraces with planters and a pool,
  pergolas, glowing interiors. Contract to add: `penthouse(c, w, d)` in `src/world/models/penthouse.ts`, placed on a
  roof; Claude will make them buyable/enterable homes.

## 8. The Sky Isles (NEW)

More and **larger** trees (the isles' trees read tiny next to the houses; Claude has raised the count to 280 and the size
×1.9 in `nature.ts`; you add the species): new branching fantasy habits in `trees.ts` `HABITS` — pastel blossom trees,
silver-barked moon trees, cloud willows, crystal-fruit trees — with leaf-picture crowns, including giants. Ground
texture: patterns in `Meadow.ts` `patternGround` for the isles (cloud-stone paving, star-dust veins, moss, flower
meadows). Richer surfaces for buildings (moonstone ashlar, pearl tiles, silver filigree, cloud plaster). Floating islands
with waterfalls off their edges and bridges between them.

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

## 11. Sky artifacts — guidelines and every land

**What is already in the sky** (do not duplicate): each land's sky effects (`skies.ts`/`SkyFX.ts`: clouds, kites, birds,
sunbeams, rainbows, alpenglow, aurora, Milky Way, nebula, shooting stars, fireworks, searchlights, halos, moons, planets,
comets, constellations, hex canopy, floating islands, turning star, balloons, noctilucent clouds), each land's lanterns
rising (`SkyLanterns.ts`), sky ornaments (`SkyOrnaments.ts`) and the moving sky traffic (`src/traffic/`: airships, planes,
air taxis, drones, sky ships, flying carpets, the festival dragon, the sun-barque, the vimana, the janggan kite, sky whales,
sky koi, pegasi, birds).

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
| Creatures | `pegasi`, `unicorns-flying`, `little-dragons`, `sky-whale`, `sky-koi`, `sky-koi-2`, `cranes`, `eagle`, `owls`, `falcons`, `roc`, `phoenix`, `peacock-garuda`, `pigeons`, `light-birds`, `swans`, `ducks` | `quadruped()`, `bird()`, `skyWhale()`, `skyKoi()` — floating heads, animated pieces |

Only the London double-decker, the gondola, the drone, the petit taxi, the kei van and the reindeer sleds have been seen
in screenshots. **Contract**: each design is `Design` (`pieces` of `solid`/`glow` geometry + an `anim` about a `pivot`);
keep the ids, `realm`, rough `len`, and the animated pieces (`flapL/R`, `spinX/Y/Z`, `swingA/B`, `tail`, `fluke`).

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

**Done means**: each species screenshotted up close (6 m) and in a stand (40 m), by day and in wind; ≤ 3 k triangles
per tree and ≤ 40 leaf cards per crown on average; `tests/foliage.test.ts` and `tests/world.test.ts` pass.

## 14. Terrain and texturing

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

**Later — cavern interiors**: a scene to enter from the mouth (like the house interiors): stalactites and stalagmites,
crystal clusters that glow, an underground pool, ice columns and frozen waterfalls in the ice caverns, rock paintings
of abstract patterns (no figures). Propose the API under "Contract requests" (suggestion: `buildCavern(style, seed):
THREE.Group` with the entrance at +z and the floor at y = 0); Claude will wire entering and leaving.

## 16. Fixed already (for your information)

Several traditional roofs were rotated wrongly and have been fixed in `traditions.ts`: the glass cabin's panes (were an
inverted V), the snow igloo's entrance tunnel (was upside down), the Nubian barrel vaults (faced sideways) and the curved
Bengal-style roofs on jharokhas and Mughal pavilions (faced forward). Check other rotated half-cylinders and arcs you
write: a `CylinderGeometry` half (thetaLength π) must be turned so its curve faces up.

## 17. Particles and sky effects (NEW)

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

## 20. Interiors for these builds

Today every door leads to one standard furnished room (`src/housing/HouseInterior.ts`, 9 × 8 m, styled per land family);
landmarks reuse it with their name. The owner wants real interiors for the new builds. **Contract**:
`buildInterior(spec): InteriorBuild | null` in `src/world/models/interiors.ts` (placeholder returns null → the standard
room is used). Claude wires entering, the camera, who sits and stands where, and the actions (gather, talk, rest, the
institute and research panels) — you build the scene and say where people go.

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

## Contract requests

(ChatGPT: write here any change you need to a contract or to a Claude-owned file, with the reason. Claude answers here.)
