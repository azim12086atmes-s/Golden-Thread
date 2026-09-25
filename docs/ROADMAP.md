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
