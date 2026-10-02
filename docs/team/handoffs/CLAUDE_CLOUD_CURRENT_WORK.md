# Claude Cloud handoff — current work

Branch: `claudes-current-work` in `azim12086atmes-s/Golden-Thread`.
Base: `acbaee3` (`latest-working-on-going`) is the clean fallback. Continue from this branch.

Read `AGENTS.md`, `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, `docs/REQUIREMENTS_EXPANSION.md` first. The core rules are
unchanged and tested: the two never touch or share a seat/mount; no eyes and floating heads on every person and
animal; modest clothing via `modestify()`.

## Update — 2026-10-02 (cloud)

Shipped on `claudes-current-work` (tests: `tests/roomWalk`, `diary`, `profiles`, `wings`, `interiorGlow`):

| Area | Where |
|---|---|
| Walk about inside every room (WASD); E by the seats sits them down, E in the doorway (or Esc) steps out; the boy keeps the 2.2 m indoor gap and steps aside round furniture | `housing/roomWalk.ts`, `HouseInterior.walk` |
| Furniture is mapped from each room's own geometry (`Blocks`), so nobody walks through sofas or tables | `roomWalk.ts` `Blocks`, `HouseInterior.furnitureOf` |
| Brothers, sisters and caravan children come indoors and gather round the two | `roomWalk.ts` `folkStep`, `CaravanView.indoorFolk` |
| Owned penthouses are furnished slot by slot like plot homes (`st.homes['penthouse:<door id>']`) | `HouseInterior` `furnishBuilt`, `Game.homeKey`, UI `decorSection` |
| Sign in by name (+ optional PIN); the first player takes the device's existing journey (copied, never erased); guests play as before; keepsake files carry a journey to another device. All local — there is no server | `core/profiles.ts`, `ui/AccountPanel.ts`, `Game.switchJourney` |
| My Diary (Q): a page per real day, a daily question, moods, seven lanterns + streak, kind replies, gifts at streak milestones | `diary/diary.ts`, `ui/DiaryPanel.ts`, `Game.writeDiary` |
| Her wings 5× her height and 0.95 as broad; a silky lagging, fluttering beat that never spreads past `MIN_BACK`; camera keeps back past the tips | `characters/wings.ts`, `Travellers.updateCamera` |

## Handoff — session 2026-09-27 (cloud). START HERE.

**Then read `docs/team/handoffs/NEXT_WORK_2026-09-27.md`** — the owner's newest requests verbatim (charity and
sponsorship, institutions, hiring, skills/courses/theses, supply chains, city lighting, bridges, New Yonder TV panels and
penthouses, balloons) with specifications and the order of work.

**Branch** `claudes-current-work` (push here; no PRs, no merges to other branches unless the owner asks).
**Live build** https://azim12086atmes-s.github.io/Golden-Thread/ — every earlier build under `/versions/`.
Publish with `bash scripts/deploy-pages.sh` (builds, tests, copies to gh-pages root and `versions/<sha>/`, never force-pushes).
**Checks** `npx vitest run` (409 tests) and `npx tsc --noEmit` must pass before every push. Verify visuals with
`scripts/probe/` (Playwright + software GL; see its README — slow, ~1 min per screenshot).
**Commits** end with the Co-Authored-By / Claude-Session lines used throughout the log; no model names in commits.

### Owner's standing preferences (learned the hard way — keep them)

- Skies: per-land hues matter. Day haze is white tinted blue over green lands, warm yellow-white over sand lands; the
  **Meadow keeps its pink** (`locale.ts` meadow haze `#ffe8f0`). Night grade is the original formula plus a 15 % land tint
  (`RegionFX.ts`) — do not strengthen it. Stars/Milky Way/nebula stay faintly visible by day (dim, not bright).
- Grass/flowers are **image tufts** (not painted strokes, not 3D blades), dense and touching, varied colours, to the horizon
  (`Meadow.ts` rings). Flowers are images that glow a little.
- Trees: anatomically branching (`trees.ts` habits), crowns are smooth slightly translucent blobs covered in leaf-image cards;
  giants as tall as buildings. Not geometric blobs alone, not cut-out 3D leaves.
- Buildings: real architecture, not blobs — balconies, cornices, shutters, varied massing, procedural surface textures.
- The thread is thin and golden. Heads float; no eyes/nose/mouth; the two never touch (tests enforce all of this).
- The owner sends many short requests mid-task; queue them, finish the current one, report plainly.

### Shipped this session (all pushed unless noted)

| Area | Where |
|---|---|
| Camera can tilt up to see the sky (stops at the ground and aims up) | `player/Travellers.ts` |
| Meadow Great Tree rebuilt: 30 m branching oak, roots, door, window, swing, fairy lanterns | `world/architecture.ts` (`landmarks.meadow`, `GREAT_TREE`) |
| Dimmer day stars; faint day Milky Way + nebula in every land; whiter day hazes (Meadow pink kept) | `Sky.ts`, `SkyFX.ts`, `locale.ts` |
| Van menu: compact, ▾ Hide / ▴ Show, ✕ leaves the van; closed panels no longer peek | `ui/UI.ts`, `ui/styles.css` |
| Every building enterable: tents, igloos, huts, cloud houses; every landmark (south door); your own home ("Go home") with an interior you furnish slot by slot (van options) | `RegionBuilder.ts`, `World.ts` (`landmarkDoor`), `Game.ts` (`homeDoors`, `setHomeSlot`), `housing/HouseInterior.ts` (`furnishHome`, `LANDMARK_NAME`), `state.homes` |
| Fuller towns: houses fill from the plaza outwards; counts raised (Fjordhavn 130, desert 100, Aurora 90…) | `RegionBuilder.ts`, `regions.ts` |
| **Living traffic** (task in progress, see below): ~85 designs — double-deckers, black cabs, solar trams/cabs, hover cars/bus, modern sedans/SUVs/hatchbacks/pickups, EVs, tuk-tuks, auto-rickshaws, bullock/buffalo/donkey carts, carriages, tonga, pumpkin coach, vardo, reindeer & dog sleds, elephant with howdah, camel caravans; gondolas, narrowboats, punts, ferries, yachts, longship, fishing boats, paddle steamer, junk, dragon boat, sampan, yakatabune, turtle ship, jukung, phinisi, dhow, abra, felucca, reed boat, kettuvallam, snake boat, shikara, rafts, tall ship, swans, ducks; airships, zeppelin, solar blimp, air taxis, drones, biplanes, light plane, airliners, sky-jet, ornithopter, seaplane, sky ships, crystal skiffs, flying carpets, sun-barque, Pushpaka vimana, festival dragon, janggan kite, pegasi, winged unicorns, little dragons, sky whales, sky koi, cranes, eagles, owls, falcons, roc, phoenix, garuda, pigeons, birds of light | `src/traffic/` — `shaper.ts` (modelling kit), `creatures.ts` (quadruped/bird/whale/koi/dragon builders; heads float), `designs.ts` (catalogue), `roster.ts` (what each land has), `Traffic.ts` (routes, instancing, yielding), `tests/traffic.test.ts` |
| Traditional houses for the 13 remaining lands (machiya, minka, hanok, choga, Chinese hall, shophouse, riad, Gulf house + barjeel, Nubian vaults, Bedouin tent, round tent, haveli + jharokhas, Kerala home, Mughal pishtaq pavilion, bale, tongkonan, lavvu, snow igloo, glass igloo, goahti, log cabin, glass cabin, sky spire, sky pavilion) | `world/traditions.ts`, wired in `architecture.ts` `buildHouse` |
| Floating designer crowns for both travellers (hers a pearl tiara with a rose gem, his a gold crown with sapphires and a star), slowly turning above the head, never touching it | `characters/CharacterModel.ts` `buildCrown` |
| Browser probe tooling in the repo | `scripts/probe/` |

### Traffic — how it works

- Road routes: each avenue is two out-and-back loops (plaza→ring road, ring road→town edge) that turn before the junction so
  nothing meets; the ring road has a lane each way. Left-hand traffic in London, Japan, Indonesia and India (`LEFT`).
  Vehicles keep their distance and brake for the travellers (look-ahead includes braking distance).
- Water routes: circles on lakes/ponds, out-and-back along rivers; big boats only where there is room.
- Sky: circles round the town at each design's altitude/radius; bank into turns; wings flap, rotors spin, legs trot.
- Only the land you are in is populated (`Traffic.setLand`); each design is a few `InstancedMesh`es (one per piece, plus glow).
- Screenshot-verified: London double-decker (close up), Firenzia gondola, New Yonder drone. **Not yet verified by eye:** most
  other designs (tests prove they build, keep the anatomy rules, and move).

### Next, in order (owner's queue)

1. **Verify & polish traffic visually** in several lands (probe each realm; fix any design that reads badly — scale, colours,
   orientation). Consider road-vehicle shadows cost and a distance cull if frame time suffers on phones.
2. **Traditional houses** (`traditions.ts`) — screenshot every land, fix proportions; the old per-land builders in
   `architecture.ts` (`houses.japan` … `houses.skyisles`) are now fallbacks only and can be deleted once happy.
3. **Sky artifacts per land** (task 15): partly covered by traffic (festival dragon, sky koi, sun-barque, vimana, janggan).
   Remaining: nature matched to terrain.
4. **Economy of services** (health care, tech, logistics, supply, agriculture, research, manufacturing, inventions) and
   **service jobs** (employee, freelance software, hardware) — design in `docs/REQUIREMENTS_EXPANSION.md`; nothing built yet.
5. Vehicles the travellers own (`vehicles/vehicles.ts`) could be rebuilt with the `traffic/shaper.ts` kit (VW Type-2 style van
   with split windscreen, V-front, two-tone paint — see `docs/ARCHITECTURE_RESEARCH.md`).
6. Redeploy after each milestone (`scripts/deploy-pages.sh`).

### Known limits

- Software-GL screenshots only; no real-GPU frame rate measured. Traffic adds roughly 60–90 draw calls in the current land.
- Interiors are dioramas (not walk-around). Landmark interiors reuse the house room with the landmark's name.
- A crescent-with-ring the owner remembered is Bagh-e-Noor's moon halo (`skies.ts` mughal `moonHalo`); crescents are in
  Madinat an-Nur and Souq al-Qamar. Unchanged.

## Session 2026-09-26 (cloud) — what shipped (all on this branch, 380 tests, typecheck + build pass)

| Area | Where | State |
|---|---|---|
| City crowds: 300 people per town, all talkable | `npc/Townsfolk.ts`, `npc/Crowd.ts`, `npc/folk.ts` | Built, tested, browser-checked. Everyone is instanced (5 draw calls/town); the nearest 14 become full figures. Any of the 300 can be talked to; land-specific favours, some needing goods; one reward per person per day (saved in `st.folk`). |
| Meadow celebration: every sky + every land's particles | `world/PartyAir.ts`, `SkyFX.ts`, `SkyLanterns.ts` | Built, tested, browser-checked. All 25 sky effects; each land's particle theme and every weather in its own slice round the courtyard; fireworks/kites/lanterns in every land's colours. |
| Sky ornaments in every land | `world/SkyOrnaments.ts`, `skies.ts` | Moons, ringed planets, extra rainbows/moonbows, golden hex canopy, constellations, comet, sun halo + sundogs, floating islands with waterfalls, turning girih star, balloons, noctilucent clouds. 3–7 per land; the Meadow has all. |
| Day/night control | `core/time.ts`, UI | T or tap the clock → next of dawn/day/dusk/night (forward only). Help: four buttons + "pause the sky". |
| Objective panel | `ui/UI.ts` | ✕ close, 🎯 pill to reopen, O key; focus follows; remembered per device. Browser-verified. |
| Safar van | `vehicles/vanLayout.ts`, `vehicles.ts`, `housing/VanInterior.ts` | 3 × 8.6 m; shared floor plan inside/out: 2 separate beds, 4 bunks, 4 pet beds, benches with table (seats 2.2 m+ apart), kitchen, storage. Children and pets ride visibly inside while driving. |
| Pets and children | `caravan/*` | 13 pets (6 dogs, 4 cats, 3 birds), 9 children, and the family: Aasima, Suvaibia, Maryam and Abdur Rahim (`SIBLINGS`, owner's heights) travel with the two always — walking just behind, on their own carpet when flying, in the party ring. Start: the family, Pip, Clover (Rosie and Teo removed at the owner's request; old saves migrate). Max 4 children + 4 pets. Pets now wait at their home land's plaza and join when offered their food. |
| Flying carpet | `caravan/Carpet.ts`, `CaravanView.ts`, `caravan.ts` | All flight modes (cape, unicorn, biplane, dragon), eased in her frame (no lag, never cuts across on turns), hard clearance guard; tested + browser-checked. |
| Houses and buildings | `world/buildings.ts`, `houseDecor.ts`, `RegionBuilder.ts` | 5 new archetypes per land style; houses 15% larger; path mosaics in land colours. |
| Enterable houses | `housing/HouseInterior.ts` | Every town building's front door → a land-styled room (5 families + shop/courtyard/tower variants); share an item once a day, talk, rest. Items never spawn inside walls. |
| Trees | `world/kit.ts`, `regions.ts` | 1.9× taller; 11 new colourful species; bark bands; crowns sway. |
| Water | `world/waters.ts`, `Water.ts` | Each land: a lake, 2–3 ponds, a river in the countryside, carved into terrain; fairytale shader (caustics, rings, glints, night lattice glow), foam, lily pads and lotus. |
| Meadows & wind | `world/Meadow.ts`, `wind.ts` | Dense recycling grass/flower field round the travellers, patterned ground and glowing fairy rings; one gusting wind sways grass, flowers, tree crowns, carpet and falling particles. Low graphics turns grass off. |
| Animals | `animals/detailed.ts`, `AnimalModel.ts`, `event/Dragon.ts` | All 16 quadrupeds jointed and shaped per species; birds with folded wings and jointed legs; star patterns on unicorns and the dragon. |
| Farming | `housing/housing.ts`, `HousingView.ts`, UI | 12 crops, seeds bought at market stalls (per land), choose/water/harvest panel, new dishes, crop favours; full season tested incl. save/reload. |

## Still open / honest limits

- No real-GPU frame rate was measured (the cloud browser is software-rendered). Counts: Meadow by day ~1.8–2.3k draw calls,
  1.0–1.8M triangles (grass ~0.3M); the celebration evening ~4.7k calls because the guests and dancers are full figures
  (pre-existing). If phones struggle: instance the party guests, and lower `FIELD_CELLS` in `Meadow.ts`.
- House interiors are a furnished diorama with actions, not a walk-around space.
- A full caravan cannot yet say goodbye (children going home at their destination is described but not built), so a fifth
  child/pet waits.
- The family ride along out of sight while you drive the van (its benches are sized for children).
- Rivers have bridges wherever they cross the line of an avenue (22, walkable); elsewhere the water is a walkable surface, as before.
- Crowd figures far away are simple instanced shapes; up close they swap to full outfits.
- Sky ornaments were screenshot-checked in the Meadow, Islamic, Egypt, Norway and Sky Isles; others are covered by tests only.

**Claude's remaining logic work** is listed, in order, in `MASTER_BUILD_LIST.md` section L.
