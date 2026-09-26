# Claude Cloud handoff — current work

Branch: `claudes-current-work` in `azim12086atmes-s/Golden-Thread`.
Base: `acbaee3` (`latest-working-on-going`) is the clean fallback. Continue from this branch.

Read `AGENTS.md`, `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, `docs/REQUIREMENTS_EXPANSION.md` first. The core rules are
unchanged and tested: the two never touch or share a seat/mount; no eyes and floating heads on every person and
animal; modest clothing via `modestify()`.

## Session 2026-09-26 (cloud) — what shipped (all on this branch, 380 tests, typecheck + build pass)

| Area | Where | State |
|---|---|---|
| City crowds: 300 people per town, all talkable | `npc/Townsfolk.ts`, `npc/Crowd.ts`, `npc/folk.ts` | Built, tested, browser-checked. Everyone is instanced (5 draw calls/town); the nearest 14 become full figures. Any of the 300 can be talked to; land-specific favours, some needing goods; one reward per person per day (saved in `st.folk`). |
| Meadow celebration: every sky + every land's particles | `world/PartyAir.ts`, `SkyFX.ts`, `SkyLanterns.ts` | Built, tested, browser-checked. All 25 sky effects; each land's particle theme and every weather in its own slice round the courtyard; fireworks/kites/lanterns in every land's colours. |
| Sky ornaments in every land | `world/SkyOrnaments.ts`, `skies.ts` | Moons, ringed planets, extra rainbows/moonbows, golden hex canopy, constellations, comet, sun halo + sundogs, floating islands with waterfalls, turning girih star, balloons, noctilucent clouds. 3–7 per land; the Meadow has all. |
| Day/night control | `core/time.ts`, UI | T or tap the clock → next of dawn/day/dusk/night (forward only). Help: four buttons + "pause the sky". |
| Objective panel | `ui/UI.ts` | ✕ close, 🎯 pill to reopen, O key; focus follows; remembered per device. Browser-verified. |
| Safar van | `vehicles/vanLayout.ts`, `vehicles.ts`, `housing/VanInterior.ts` | 3 × 8.6 m; shared floor plan inside/out: 2 separate beds, 4 bunks, 4 pet beds, benches with table (seats 2.2 m+ apart), kitchen, storage. Children and pets ride visibly inside while driving. |
| Pets and children | `caravan/*` | 13 pets (6 dogs, 4 cats, 3 birds), 11 children. Start: Rosie, Teo, Pip, Clover. Max 4 children + 4 pets. Pets now wait at their home land's plaza and join when offered their food. |
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
- Wind moves grass, foliage, flowers, the carpet and particles; robes and headscarves do not sway (capes already ripple).
- Rivers have no bridges (water is a walkable surface, as before).
- Crowd figures far away are simple instanced shapes; up close they swap to full outfits.
- Sky ornaments were screenshot-checked in the Meadow, Islamic, Egypt, Norway and Sky Isles; others are covered by tests only.
