# OPUS_002 — continent atlas, fusion wardrobe, caravan (proposal for Codex)

Author: Opus 5.5, 2026-09-26. Status: **proposal, NOT compiled or run in this worktree.**

Origin: the owner asked mid-assignment to "use your map.ts and your ideas that we had gathered from the session and add them to the game if they add to the game function and operation and aesthetic of the game", and to "let Codex know everything you do". Everything is in **new files**. No Codex-owned file was edited. Wiring into `Game.ts`, `World`, UI and rendering is Codex's call. The full action log is in `OPUS_LOG.md`.

## Please run first

```
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/living.test.ts tests/atlas.test.ts tests/fusion.test.ts tests/caravan.test.ts
```

I desk-checked every assertion by hand, and fixes are recorded in the log. I still expect a few failures, most likely in atlas placement. `validateAtlas()` separates hard **errors** (a test fails) from **warnings** (placement notes; the test prints them).

## 1. Atlas — `src/atlas/`

| File | What |
|---|---|
| `schema.ts` | Self-contained schema (`LandId` mirrors `RegionId`), km units, `WORLD_SCALE`. Replaces the unused `src/world/geography.ts`, which I left untouched; Codex may delete it. |
| `continent.ts` | See the breakdown below. |
| `atlas.ts` | See the function list below. |
| `tests/atlas.test.ts` | 13 tests: roster counts; `validateAtlas` has no errors; every land reachable; a sensible route; city cores on land at `coreY`; sea below sea level; sample spacing; grade limits; bridges above water; road corridor graded into the terrain; placement geometry; the height field finite everywhere; mountains present. |

**`continent.ts`** is transcribed from `docs/research/map-design.md` and contains:
- 20 cities with coordinates, radius, `coreY`, relief, districts and landmark height.
- 27 highway segments with route `via` points.
- 107 sightings and 55 settlements, including Rainbow Hill: rainbow cottages in high grassland, the owner's example.
- The coast (54 points), 4 islands, 10 lakes (sea-level, raised, salt and ice), 12 ranges and 6 rivers.

**`atlas.ts`** holds pure functions:
- **Land and water:** `isLand`, `lakeAt`, `waterAt`, `coastDistance`, `landWeights` (sharpness-6 blending), `landAt`.
- **Roads:** `roads()` builds each road as a Catmull-Rom path sampled every ~10 m, with auto-detected bridges and a height profile pinned to city cores and capped at a 10% grade (14% on the pass road). `pointAt`, `placeSighting` and `placeSettlement` (a Y-junction branch road) place things along them.
- **Routes:** `routeBetween` (Dijkstra), which also drives thread-mote guidance.
- **Height:** `naturalHeight` and `continentHeight`, a proposed height field. It flattens city cores, carves lake basins with rims, cuts river channels, eases beaches into the sea floor, and grades road corridors into the ground.
- **Checks:** `validateAtlas`.

**Suggested integration, in order:**
1. Replace the 700 m grid in `world/terrain.ts` with `continentHeight`, and `regionAt` with `landAt`.
2. Build road ribbons from `roads()`: width `ROAD_WIDTH[cls]`, colour taken from the land at each sample. Add bridge decks and pillars where `sample.bridge` is true.
3. Stream sightings and settlements by distance. `SightingDef.kind` and `variant` name the builder, and `SettlementDef.style` names which land's house kit to use.
4. Draw raised lakes at their `level`; salt and ice lakes are walkable ground.
5. Replace the map panel with a real map: coast, roads, cities and discovered sites.

`continentHeight` scans all road samples, with a coarse skip. That is correct but slow for per-vertex terrain, so add a road spatial grid before shipping.

Known data judgements:
- **Egypt:** its centre straddles the Long River, as designed.
- **Revontuli Camp:** sits on the frozen lake.
- **Sky Isles:** they have no road; `routeBetween` returns `null` for them by design.

## 2. Fusion wardrobe — `src/fusion/fusion.ts`

Owner request: blend clothing "by permutations and combinations apart from traditional clothing style".

- **How it builds:** `fusionDesigns(who, n, seed)` takes the top, lower, outer layer, headwear and palette from different existing designs.
- **Rules it follows:**
  - A full-length robe hides the lower garment.
  - The girl draws only on head coverings.
  - At least three cultures must be visible in each outfit.
  - Colours are harmonised toward the palette donor.
- **Credit and modesty:** every source is credited in `note`, and the result goes through `modestify()`.
- **Output:** `fusionOutfits()` returns ready `Outfit`s with `fx-` ids for a "Fusion" wardrobe tab.
- **Tests:** `tests/fusion.test.ts`.

## 3. Caravan — `src/caravan/caravan.ts`

Owner request: "children and pets that follow us so we are not alone — dogs, cats, birds from different regions we befriend."

- **Pets:** 12, all dogs, cats or birds, using existing species with a tint, each from a different land and won over with bread, milk or rice.
- **Children:** 9 of them. Each has their own culture and faith named: Hindu, Lutheran, Shinto/Buddhist customs, Chuseok rites, Chinese festivals, Coptic Christian, Jewish, Sikh, and Arctic return-of-the-sun. Each joins with a guardian's blessing, on an apprenticeship or a family visit, and has a destination. Only the two travellers are Muslim, as the owner specified. People are fictional.
- **Movement:** `caravanStep` puts children in rows behind the pair and pets ranging wider. It keeps 1.2 m clear of both travellers (guaranteed even when the two stand close) and 0.8 m between members. It never moves the travellers.
- **Joining:** `canJoin` allows two children (the van's back bench) and three pets at a time.
- **Tests:** `tests/caravan.test.ts`.
- **Needs from Codex:** van seats for the children, a befriend interaction for pets, and use of the `help` field (for example, dogs widen resource pickup).

## 4. Hosted build (owner request)

The owner asked to host the current game online, with the names **Syeda Fathima** and **Mohammed Abdul Azim**. I built a scratchpad copy of this worktree's committed game (not including sections 1–3), with the names changed in the copy only, and published it as a private claude.ai artifact: https://claude.ai/artifact/UqiHT2AmZbzZSBxB3uNfR3. The details and the four edits Codex should mirror are in `OPUS_LOG.md`.

In the artifact the photo download is blocked. It needs the artifact `downloads` capability.

## 5. Ideas gathered but not yet built

- **Festivals and lantern releases:** a mass floating-lantern release when a land's lantern is relit, colours and motion per land. Festivals would come from each land's own tradition (Lantern Festival, lotus lanterns, floating lanterns, Diwali lamps, Karthigai Deepam, Santa Lucia, Hanukkah, Nowruz, Sham el-Nessim, Vesak and others), shown respectfully as the residents' celebrations. The research agent for this was stopped by a rate limit, so this still needs a sourced cultural pass before building.
- **Higgsfield 3D assets:** the CLI and skills are installed and signed in. The account has 0 credits, so nothing has been generated. Characters stay procedural to keep the no-face, floating-head and modesty tests meaningful.
- **Story and goals:** `docs/research/story-and-goals.md` has a full story bible and goal and logic spec. The owner decided the relationship stays "committed" but separate, with the journey in focus. They are not married in the story; sleeping spaces are separate.
