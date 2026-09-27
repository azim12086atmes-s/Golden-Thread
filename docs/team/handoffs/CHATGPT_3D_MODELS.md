# Physical models — requirements for Codex / ChatGPT (3D side), 2026-09-27

> **Access**: repository https://github.com/azim12086atmes-s/Golden-Thread — branch `claudes-current-work`
> (create your own `3d-builds` branch from it). Start by reading `CLAUDE.md`, then this file.

**Division of work.** ChatGPT builds the **physical models** (everything you see). Claude builds the **logic** (game rules,
state, UI, placement, wiring, tests) and calls the models through the contracts below. Neither side edits the other's
files; if a contract must change, write the change and the reason at the bottom of this file under "Contract requests".

Read before starting: `CLAUDE.md`, then `docs/team/handoffs/3D_BUILDS_HANDOFF.md` §1–2 (content rules and how 3D is built
here — procedural three.js, `kit.ts` primitives into a `GeoBuilder`, surfaces, glow, budgets, the probe screenshot tool),
then this file. Master checklist: `docs/team/handoffs/MASTER_BUILD_LIST.md`.

## 0. Working agreement

- **Branch**: work on `3d-builds`, created from `claudes-current-work`; merge `claudes-current-work` into it often. The
  owner decides when it is merged back. Never rewrite history, never force-push.
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
| `meadow` | Fairy castle (Neuschwanstein) in `event/Castle.ts` | Keep the Great Tree landmark as is; detail the castle: white limestone walls, red-brick accents, round towers with tall conical blue roofs, a gatehouse, battlements, balconies, arched Romanesque windows, banners | castle as now | marble, brick, slate | windows, lanterns on the gate |
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

More and **larger** trees (the isles' trees read tiny next to the houses; 60 trees now vs 340 elsewhere — Claude will
raise the count; you add the species): new branching fantasy habits in `trees.ts` `HABITS` — pastel blossom trees,
silver-barked moon trees, cloud willows, crystal-fruit trees — with leaf-picture crowns, including giants. Ground
texture: patterns in `Meadow.ts` `patternGround` for the isles (cloud-stone paving, star-dust veins, moss, flower
meadows). Richer surfaces for buildings (moonstone ashlar, pearl tiles, silver filigree, cloud plaster). Floating islands
with waterfalls off their edges and bridges between them.

## 9. Architecture polish in 12 lands

Screenshot houses by day and night in: Hanok Village, Jade Terraces, Fjordhavn, Alpenrose, Maple Row, Souq al-Qamar,
Nile Crossing, Tents of Rimal, Kaveri Coast, Bagh-e-Noor, Nusa Rinjani, the Sky Isles. Fix proportions, scale (people
are ~1.7 m; doors 2.1–2.4 m; storeys ~3 m), colours and anything reading as a blob. Add 2–3 more house types per land
(corner shop, market hall, courtyard house, neighbourhood mosque/church/temple with no cult images). Then delete the
unused old builders `houses.japan … houses.skyisles` in `architecture.ts`.

## 10. Balloons (NEW)

- Balloon cluster decor: 5–9 balloons on strings tied to a weight, bright colours, slight sway. Contract to add:
  `balloonCluster(g: GeoBuilder, x, y, z, colours)` in `src/world/models/balloons.ts`.
- A balloon held by a child: `heldBalloon(colour): THREE.Group` — a balloon on a 1 m string whose lower end is at the
  group's origin (Claude attaches it to a child's hand anchor); tag meshes `userData.part = 'accessory'`.
- Balloon clusters drifting in the sky (in `SkyOrnaments.ts`).

## 11. Sky artifacts and nature by terrain

Per land (in `SkyOrnaments.ts`): Chinese lantern festival (hundreds of rising lanterns), koinobori carp streamers on poles
(Sakura Hollow), Diwali lantern strings over Gulabi Nagar, penjor arches (Nusa Rinjani), kites over Bagh-e-Noor, balloon
clusters. Nature by terrain (tree/shrub/flower species by ground type): desert shrubs and acacias on dunes, reeds and
lotus at water edges, mangroves on warm coasts, alpine flowers above the tree line, snow-laden conifers in the north.

## 12. Vehicles

- Polish every traffic design (`src/traffic/designs.ts`) after screenshotting each land's roads, waters and skies
  (scale, colour, orientation, detail). Keep the creature rules (floating heads, no faces) and piece animations.
- Rebuild the travellers' own vehicles in `src/vehicles/vehicles.ts` with the `shaper.ts` kit: **Safar the van** as a VW
  Type 2 split-screen bus (loaf body, V-front panel with the split two-pane windscreen under a peak, two-tone paint with
  a white top, roof rack), the little car, the old truck, the biplane. **Keep every seat position and `SEAT_GAP` exactly**
  (`tests/vehicles.test.ts`), and the van's floor plan (`vanLayout.ts`).


## 13. Trees and nature (NEW — owner: small trees, pines and palms never revamped)

Placement is already logic (Claude, `src/world/nature.ts`): every spot is read as a zone (dune, sand, rock, snow, alpine,
waterside, grass, cloud) and each land lists which species grow there, how thickly, and a size multiplier (deserts ×1.3–1.55,
Sky Isles ×1.9, the north ×1.15–1.25). **Your part is the trees themselves.** These 12 species still use the old simple
primitives in `kit.ts` `tree()` and must be rebuilt as real branching trees with leaf-picture crowns (add them to
`HABITS` in `src/world/trees.ts`, or give them a dedicated grower — palms and bamboo do not fork):
- **Palm** (date palm): a tall, slightly curved, ringed trunk; a crown of 15–25 long arching pinnate fronds (leaf-card
  strips along each frond), hanging date clusters, dead fronds skirting below the crown.
- **Coconut**: a leaning, curved trunk; a looser crown of long drooping fronds; coconut clusters.
- **Pine** (Scots / stone pine): tall straight trunk, orange-brown upper bark, tiered branches with needle-card clumps;
  stone pine variant with an umbrella crown (Firenzia).
- **Snow pine** (spruce/fir): conical, dense tiers of drooping branches to the ground, snow lying on each tier.
- **Cypress** (Italian): a tall narrow flame-shaped column of dense dark foliage.
- **Bamboo**: clumps of 10–30 jointed culms with nodes, arching tops, narrow leaf cards.
- **Banana**: a fleshy pseudostem, huge paddle leaves (some torn), a hanging bunch with a purple flower.
- **Baobab**: a massive bottle-shaped trunk, short stubby branches like roots at the top, sparse leaves.
- **Sky Isles fantasy trees** (`cloud`, `crystal`, `candy`, `glowtree`): rebuild as real branching fantasy trees —
  cloud willows with trailing pale foliage, crystal-fruit trees with glowing gem fruit, candy-blossom trees, glow trees with
  softly lit leaves; plus new pastel blossom and silver-barked moon trees. Allow giants.
- Also: desert shrubs, acacias, reeds and lotus at water edges, mangroves on warm coasts, alpine flowers, low scrub on
  rocky slopes — as small plants in `kit.ts` so the zones can place them (tell Claude the names to add to `nature.ts`).

## 14. Terrain and texturing (NEW)

More texture everywhere, especially the desert, the Arctic and the Sky Isles: ground patterns in `src/world/Meadow.ts`
`patternGround` (wind ripples and dune crests, rock strata on slopes, snow drifts and sastrugi, cracked clay near oases,
cloud-stone paving on the isles); richer surfaces (`surfaces.ts`) for tents (woven cloth with stripes), huts (turf, birch
bark, logs), igloos (snow blocks), rock (strata, sandstone layers). Scatter rocks, boulders and outcrops by zone.

## 15. Caves and caverns (NEW)

Placement, entrances and exploring are logic (Claude, `src/world/caves.ts`: 3–5 caves per land in the desert, the Nile,
the Gulf hills, the fjords, the Arctic and the Alps; styles `sandstone`, `rock`, `ice`; the mouth faces the town; E at the
mouth explores it once a day). **Model them**: `buildCave(c, style, r)` in `src/world/models/caves.ts` (placeholder
exists) — a real rock formation: layered sandstone cliffs and arches with a cave mouth (desert/Nile), dark rock outcrop
with a jagged mouth (Gulf, fjord sea-cliff caves), blue ice with icicles and a glowing mouth (Arctic, Alps). Mouth ≈ 3 m
high, 3–4 m wide, facing +z, kept walkable. Later: cavern interiors (stalactites, crystal clusters, an underground pool,
glowing ice) as a scene to enter — describe the API you want under "Contract requests".

## 16. Fixed already (for your information)

Several traditional roofs were rotated wrongly and have been fixed in `traditions.ts`: the glass cabin's panes (were an
inverted V), the snow igloo's entrance tunnel (was upside down), the Nubian barrel vaults (faced sideways) and the curved
Bengal-style roofs on jharokhas and Mughal pavilions (faced forward). Check other rotated half-cylinders and arcs you
write: a `CylinderGeometry` half (thetaLength π) must be turned so its curve faces up.

---

## Contract requests

(ChatGPT: write here any change you need to a contract or to a Claude-owned file, with the reason. Claude answers here.)
