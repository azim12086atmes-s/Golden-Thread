# Golden Thread source and import inventory

Pinned source: `azim12086atmes-s/Golden-Thread` at `a6c20a4f9ceabec4fbd544ca7c73658b005c2318`, copied to `/workspace/golden-thread-reference`. Static inventory only; no browser, DOM-dependent character model, or game startup was executed.

## Exact file and import counts

- Copy: 308 files total; `src/` 211; `tests/` 83; other files 14.
- `src/main.ts` statically reaches 203 paths: 202 TypeScript modules plus `ui/styles.css`. Adding its conditional dynamic imports reaches 205 paths: 204 TypeScript modules plus CSS.
- Dynamic paths are `assets/review.ts` for `?characters` and `dev.ts` in development. The character preview route is a separate review path; it does not instantiate `Game` in the selected branch.
- Six TypeScript modules are not reachable from `main.ts`, even with those dynamic imports: `src/atlas/atlas.ts`, `src/atlas/continent.ts`, `src/living/model.ts`, `src/living/rules.ts`, `src/living/trial.ts`, and `src/world/geography.ts`. They are in the source tree but are not part of this app entrypoint’s import graph. Do not characterize them as active runtime features without another caller.

The JSON companion contains the resolved main-entry import adjacency list and the full source file/directory counts. The source directory counts are: world 84, economy 13, characters 12, event 9, housing 9, core 8, traffic 8, travel 7, institutions 7, animals 5, npc 5, caravan 4, guide 4, charity 3, atlas 3, living 3, creatures 2, quests 2, root 3, assets 1, diary 1, fusion 1, player 1, social 2, ui 5, vehicles 2.

`main.ts` imports `Game` and the game imports the fusion wardrobe registration side effect. The ordinary app path therefore includes the core game graph; the `?characters` and DEV branches add review/developer routes. The standalone character preview is not evidence that every source module is active.

## Outfit counts (parsed from design records; no models instantiated)

Current `outfits.ts` plus `outfits-extended.ts` contain 147 static designs: 127 adult and 20 child. `characters/wardrobe.ts` calls `fusionOutfits(24)`, which produces 48 fusion entries (24 for each traveller), and registers them into `OUTFITS`. The current playable catalog is therefore 175 adult choices plus 20 child choices, 195 total. `tests/wardrobe.test.ts` asserts 48 fusions.

The old party’s 175 count is adult-only: its `party/main.js:9` imports `../src/characters/wardrobe` for the same 48-fusion side effect; the old static catalog has 127 adult designs and no child outfits. Current source retains those 175 adult options and adds 20 child outfits. This count is based on outfit identifiers and the registration code, not by constructing character/DOM models.

## Save and family-roster trap for multiplayer

`newGame()` seeds four sibling IDs and two pets in `src/core/state.ts:203`. More critically, `deserialize()` in `src/core/save.ts:50-55` re-adds every `SIBLINGS` entry to any saved caravan. Clearing `st.caravan` before serialization is not enough: the siblings return on load. Any role-specific multiplayer filter must run after deserialization and before rendering/saving, or use an adapter-specific load path; preserve the original single-player campaign rule.

This roster also feeds visible models and authored narrative. The base Game uses `CaravanView`, and `StoryScene`/`storyline`, `ThreadScene`, `CakeScene`, `guide/tour`, `housing/parents`, and `social/friends` use paired names and/or the family roster. Filtering remote player IDs alone does not remove those locally generated relationship cues. Gate or adapt their presentation by role while leaving underlying gameplay rules available in private state.
