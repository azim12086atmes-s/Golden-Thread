# Working on The Golden Thread

Read [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) first, then [docs/ROADMAP.md](docs/ROADMAP.md), and [docs/REQUIREMENTS_EXPANSION.md](docs/REQUIREMENTS_EXPANSION.md) for the latest owner amendments.
The current handoff and the owner's open requests are in `docs/team/handoffs/NEXT_WORK_2026-09-27.md` and
`docs/team/handoffs/CLAUDE_CLOUD_CURRENT_WORK.md`.

## Non-negotiable content rules

These come from the owner's brief (Islamic principles) and are enforced by tests. Never weaken a
test to make a feature fit; change the feature.

- **The girl and boy never touch.** `MIN_GAP` in `src/characters/follow.ts` is applied after every
  movement step, including collision resolution. Vehicles seat them in separate seats at least
  `SEAT_GAP` apart with a divider; on unicorns each rides their own. Nothing may ever place them
  hand-in-hand, embracing, or sharing a seat or mount.
- **No eyes on any person or animal.** Owner amendment GT-CHAR-001 permits glasses on both protagonists and beard/hair on the boy; no nose, mouth or eye geometry. Model builders tag meshes with
  `userData.part`; only `ALLOWED_PARTS` may be built.
- **Heads float**, detached by `HEAD_GAP` (people) / `ANIMAL_HEAD_GAP` (animals).
- **No revealing clothing.** Author outfits as `Design` references in `outfits.ts` and let
  `modestify()` merge in sleeves, trousers and a headscarf. Never hand-write an `Outfit`.

## Code map

- `src/core` — state (the save shape), events, input, RNG/noise, save/load.
- `src/world` — regions (data), terrain, kit (primitives + `GeoBuilder` merging), architecture
  (houses + landmarks per land), region builder, streaming `World`, sky, ambience, plots.
- `src/characters` — anatomy/modesty rules, outfits, character model, follow logic, thread.
- `src/animals`, `src/npc`, `src/vehicles`, `src/player` — as named.
- `src/quests`, `src/social`, `src/economy`, `src/housing` — pure rules over `GameState`, then views.
- `src/ui/UI.ts` — DOM overlay. `src/Game.ts` — wires everything and runs the loop.

## Conventions

- Game rules are pure functions/classes over `GameState` and are unit-tested; rendering reads
  state. New persistent fields go in `newGame()` — `deserialize` fills them into old saves.
- A land is one `RegionSpec` row + a house builder + a landmark builder + people + a chapter.
  `tests/world.test.ts` builds every land; `tests/systems.test.ts` proves every chapter can be
  finished from that land's own materials.
- Build lands from `kit.ts` primitives into a `GeoBuilder` so each land stays a few draw calls.
  Lit things go in `glow` (brightens at night); keep glowing area small or bloom washes out.
- `npm test` and `npm run typecheck` must pass. Verify visual changes in the browser with the
  `window.dev` harness (see README).
