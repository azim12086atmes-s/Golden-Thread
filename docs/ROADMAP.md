# Roadmap

## Built — v0.1 (2026-09-25)

Playable end to end and verified in the browser: meadow chapter from first conversation to lit
lantern; walking, cape flight, van, car, truck, plane, unicorns; buying land and building; animal
friendship → unicorns; messages from friends; every panel.

| Area | State |
|---|---|
| World: 20 lands, streaming terrain + towns, landmarks visible from afar | Built |
| Day/night, aurora, rainbows, ambient particles | Built |
| Travellers: follow, no-touch gap, golden thread, shared flight light | Built, tested |
| Vehicles with separated seats; two unicorns | Built, tested |
| Wardrobe: 42 modest outfits, `modestify` merging | Built, tested |
| Anatomy: no faces, floating heads (people and 21 species) | Built, tested |
| Economy: items, skills, recipes, markets | Built, tested |
| Quests: 20 chapters + 24 side quests; every chapter solvable locally | Built, tested |
| Friends & messages | Built, tested |
| Land, decor, farming, kept animals | Built, tested |
| Van interior decoration | Built |
| Save/load (localStorage, forward-compatible) | Built, tested |

## Next

1. **House interiors.** The van has an interior; houses on your land should too. Reuse
   `VanInterior`'s slot model with a room per house style.
2. **Building with people.** Community projects: a Keeper asks for a bridge / well / school; the
   travellers and residents contribute materials, and the structure appears in the town for good.
3. **Sound.** Per-land ambient beds, footsteps by surface, a soft chime when the thread brightens,
   a lantern-lighting motif. Keep it gentle; no music during dialogue.
4. **More life per land.** Residents with daily routines (market by day, home at night), more
   side quests per land (target 5), seasonal events (Ramadan lanterns, Eid in every land,
   harvest festivals, sakura season).
5. **Touch controls polish.** The left-half stick and right-half look exist; add on-screen
   buttons for E / F / Space and test on phones.
6. **Performance.** Instanced trees and houses per land; LOD for far towns; a quality setting
   that drops shadows and bloom on weak GPUs.
7. **Wardrobe growth.** More regional variety (Kazakh, Turkish, Moroccan, Ethiopian, Andean…),
   plus colourways per outfit. Every addition goes through `modestify` and the test suite.
8. **Photo mode** — the journey is the point; let players keep it.

## Not planned

Combat, enemies, fail states, multiplayer, real-money purchases.

## Local development copy — 2026-09-25

Independent source snapshot from Golden_Thread (the source folder had no Git history or remote).
Added touch action buttons (interact, fly, held ascent and descent), blocked touch motion in menus,
focus-loss input cleanup, keyboard Tab navigation, remembered low/high graphics controls, and
PNG photo capture without HUD via Help or P. Full free-camera photo mode remains future work.
Acceptance: touch holds persist until release/cancel; menus and blur clear movement; low graphics
disables shadows and bloom; a photo contains the rendered world without the DOM overlay.
Existing content invariants are unchanged. House interiors and community projects remain future work.
Validation: 222 tests pass; full TypeScript check and production bundle pass. Browser smoke test: title/start, world rendering, low/high graphics switching, PNG download inspected with no HUD, and no console errors. Touch input rules are unit-tested; physical-phone testing remains outstanding. Unused incomplete geo.ts is preserved in docs/prototypes/geo.ts.txt because its required geography-data.ts never existed in the source snapshot.


## Expanded living-world direction — 2026-09-25

Read REQUIREMENTS_EXPANSION.md and research/living-world/LIVING_SYSTEMS.md for requirements and staged build gates. Research atlas, Pinterest evidence log and Blender/web contract are in research/living-world/. Pinterest image selection remains blocked on sign-in; Blender MCP was not callable. No Blender-authored assets, persistent-vehicle replacement or new living-economy systems are claimed complete.

Implemented original procedural hero identity: glasses for both, angular beard and visible curled side quiff for the boy when not under headwear; character review at /?characters. Geometry tests cover the full wardrobe and idle head bobbing.


## Cloud session — 2026-09-26

See `docs/team/handoffs/CLAUDE_CLOUD_CURRENT_WORK.md` for the full table. Built and tested: 300-person talkable towns,
every land's air and sky at the celebration, 11 new sky ornaments per land, day/night switch, closeable objective panel,
the bigger Safar van (4 children + 4 pets), the flying carpet in every flight mode, pets you can meet and adopt, five new
building types and patterned paths, enterable houses with land-styled rooms, bigger colourful trees, lakes/ponds/rivers
with fairytale water and foam, dense meadows with wind, jointed anatomy for every animal, and a full farming loop with
seed markets and cooking. Next: instanced party guests, walk-around interiors, children going home, bridges.
