# Both-game branch review

Snapshot reviewed: 2026-10-22. All 18 existing branch refs were enumerated from GitHub: seven in Golden Thread and eleven in Birthday Castle. Heads are pinned below. The subsequently created `birthday/reference-audit` branch contains only review tooling/documentation and is not another game variant.

## Decision

Use the complete Golden Thread source at **`a6c20a4f9ceabec4fbd544ca7c73658b005c2318`** as the foundation. Both `claudes-current-work` and `3d-builds` point there, and the existing `gh-pages` deployment identifies that source commit.

Use Birthday Castle **`claude/game-logic-4d13do @ 3fcc2b4728c51eca871c889fa545c9605d7ad8df`** as the coherent donor for the physically large palace, its authored layout, terrain, approach, mountains, meadow, nature, water and related material systems. It is a complete game tree. `play` has identical reviewed JavaScript/HTML/CSS source but fewer other files. `claude/world-slice-qsc3ua` is an exact duplicate commit.

The existing birthday integration used the older Golden Thread `acbaee3` and an incomplete palace prototype from `ua4w3i`. It does not contain the whole current Golden Thread game. The experimental replacement terrain/grass remains local and unapproved by visual inspection; it should not become the visual reference.

## Golden Thread: every original branch

Repository: [azim12086atmes-s/Golden-Thread](https://github.com/azim12086atmes-s/Golden-Thread).

| Branch | Pinned head | What it contributes |
| --- | --- | --- |
| `claudes-current-work` | `a6c20a4f9ceabec4fbd544ca7c73658b005c2318` | Current complete source; 211 source files and 83 tests. Correct foundation. |
| `3d-builds` | `a6c20a4f9ceabec4fbd544ca7c73658b005c2318` | Exact same commit as current work, not an extra asset collection to merge. |
| `latest-working-on-going` | `acbaee3595f312f57b66b147605465e53f017151` | Earlier 76-source-file game. All 126 tracked paths survive in current work, but 72 changed and 224 new files were added. Existing party base came from here. |
| `codex/3d-models` | `6eb8c5668d514a3f7140b580c3af547558daf72a` | Intermediate procedural architecture/model work; not the newest gameplay foundation. |
| `codex/3d-model-renders` | `4c838b50b61b6c715e2e96343dd1bddb1238810f` | Model review tools and 19 isolated monument PNGs. Shares most model-branch blobs; differs substantially from current work. |
| `gh-pages` | `dc6719cd180f88e0ed5c4d0c9203018b09475f16` | Generated deployment and retained version bundles. Head deploys `a6c20a4`; not an editable source alternative. |
| `birthday/14-player-celebration` | `9c8abef570e79ce87751242a442867292913d5fd` | Existing invite/privacy/voice/server/minigame adaptation of the earlier game, plus palace additions. Preserve its multiplayer contracts during migration. |

The current source tree has 350 tracked files, versus 126 in the older foundation. File counts measure scope, not feature acceptance.

## Birthday Castle: every branch

Repository: [azim12086atmes-s/birthday-castle](https://github.com/azim12086atmes-s/birthday-castle).

| Branch | Pinned head | Active source family / decision |
| --- | --- | --- |
| `main` | `8215bdcf278eb3b97d9def5800ac80ec03c52a18` | Integrated smaller castle: `castle`, `castleArch`, `castleDetail`, approach, meadow, nature and surrounding districts. |
| `claude/palace-meshy-kit-eh4g5c` | `c80f57d07b888dfe9a6be483b59f6f7946fa261e` | Same reviewed active castle/world module hashes as main; supporting cliff/sea-pillar work. |
| `claude/project-thread-0gs0gp` | `ae694c7ae6c18787d0cf4e68851b4cd4ae9df375` | Same reviewed integrated world modules; planning/handoff differences. |
| `claude/project-thread-iptprt` | `213ddd862712a316d652fda759f176c93d9ba548` | Same reviewed integrated world modules; route/fill changes in history. |
| `design/image-library-2026-10-13` | `01d221b1da0d2d7b4520cb021f7d28701bf0c869` | Same reviewed integrated world modules plus reference/model intake assets. Documentation explicitly distinguishes unbuilt/unverified attachments from runtime assets. |
| `claude/project-thread-ua4w3i` | `0ca8fb371203f5c3a1f7d2306add622fc6014b41` | Incomplete large-palace prototype; lacks the complete main entrypoint/world dependency closure. Do not treat its isolated palace slice as the complete game. |
| `claude/project-thread-hnjcxb` | `0d5707fa62e68a6e8736e48b0b75863db9d1f417` | Earlier playable beauty-slice line with ground/layout/trees; useful history, not selected foundation. |
| `claude/game-logic-4d13do` | `3fcc2b4728c51eca871c889fa545c9605d7ad8df` | Selected complete large-palace donor, including authored terrain/grass and active game systems. |
| `claude/world-slice-qsc3ua` | `3fcc2b4728c51eca871c889fa545c9605d7ad8df` | Exact duplicate commit of game-logic. |
| `play` | `433ea333a877270d172a49ea142ab5af47f83622` | Same reviewed JS/HTML/CSS as game-logic, including palace/layout/main/ground/meadow; smaller overall asset/docs tree. |
| `claude/joyful-minigames-pets-ung50s` | `9478ab92af58d0d09ce0a189eef8635717d71ada` | Same large palace geometry but changed layout/main/coast/ground/meadow/sky/trees and no brook. Keep as a distinct tuned variant; its name does not establish extra pet APIs absent from game-logic. |

The large playable palace is `palace.js` blob `70c3fa4f3ed24956c4d747402c85d6df91df2656`, 147,751 bytes, with authored 2.75× architectural scale. The incomplete prototype uses a different palace blob. The smaller current main castle is a different architectural family, not a drop-in upgrade for the requested biggest palace.

## What the actual source says about the appearance

Golden Thread already implements its own grass. The active entry is `index.html → src/main.ts → Game → World`. Current `World` constructs `MeadowField`, attaches its group, applies `patternGround` to the terrain material and updates the meadow around the traveller. This is not an unused art folder.

The meadow streams deterministic, instanced grass/flower rings; generated textured cards pick regional colors and use shared wind, sunlight, lamps, night and weather/season inputs. Grass excludes roads, paving, plots, water and landmark clearings. Terrain itself has modeled relief, carved waters/banks, vertex colors and animated shader detail. Water has foam and directional flow. Trees use crowns and leaf cards driven by the same wind system. Independent flat-color grass or painted terrain cannot reproduce those dependencies.

Golden Thread's placement is coordinated: 700 m regions use local authoring coordinates translated by `regionCenter`; terrain, roads, lots, reserved landmarks, paving and plot footprints determine clearances. `GeoBuilder.box/cyl/cone` use base elevations, whereas raw Three.js primitives normally use centre origins. Building position, ground query, collider, grass exclusion and walkable platform must agree.

Birthday Castle likewise has an authored spatial authority in `layout.js`: `terrainHeight`, `groundAt`, `builtHeight`, collision and building clearance. The large-palace family adds actual tessellated `ground.js`, near/mid grass, meadow grading/wind and nature. Its geometry, layout and ground must be imported as a matching set. Source architecture already includes scale `S=2.75`; do not multiply it again. A global downscale also shrinks source human-scale props such as rails, furniture and lamps, which needs explicit review.

The reference's rounded faceless characters, floating heads, modest clothing, painted fabric motifs, stained-glass wings, narrow golden thread, selective bloom, atmosphere and vehicle reflections form one visual language. Preserve authored materials and scale relationships. Add the palace and routes around the existing world; do not rebuild the cities.

The current catalog contains 175 adult outfits plus 20 child outfits, 195 entries including the fusion registration. The earlier party's 175 count covered adult choices; restoring current models, fabric treatments, child dressing and wardrobe behavior matters as well as the count. A complete static import inventory reaches 202 TypeScript modules plus CSS from the ordinary main path, and 204 plus CSS with conditional character-review/developer imports. Six source modules remain outside that graph; folder presence does not prove active gameplay.

## Gameplay that must survive the migration

The earlier party does retain original quests, gathering/crafting, earlier trade, NPCs/townsfolk/animals, properties/farming, original wardrobe, rides, messages, guide and local caravan. Those systems are wired through `PartyLife`, including world load/unload hooks; their absence from the main constructor alone does not mean they are missing.

Current Golden Thread additionally wires active systems for home interiors and home designs, commercial fields, supply and couriers, businesses/workers, service jobs, institutes/research/certificates, inventions/manufacturing, charity/training, public transport, caves, diary/profiles, weather, traffic, dragons, civic markers and festival air. The old party has not preserved those newer systems. Their rule modules, save migrations, target detection, UI actions, time ticks and view lifecycle need deliberate adaptation.

The complete large-palace donor also contains active imports for outfits, celebration, stardust/wish minigames, quest/progress, party games, pets/Mew, ships/travel, networking and voice. Imports establish source wiring, not verified online play.

Party-specific rounds, Twenty Lights objectives and festival stages are additions. They must not silently replace Golden Thread's original twenty chapters or change its costs, prerequisites and rewards. Shared party events and each player's personal game progress require separate clock/persistence ownership.

## Privacy is also local narration

The user requires birthday/private-companion views that never disclose those private players to other guests. Keep existing server projection, observer restrictions, voice routing and public/private polaroid behavior.

Server filtering alone is insufficient when adapting the full game: its title, story films, guide letters, parent visits, wardrobe targets, companion caravan and messages contain pair/family names and references. Current `deserialize` even re-adds default siblings to older saves. Private views can preserve the original pairing and default following; public guest presentation needs role-specific names, narrative, companion roster and replay controls without changing the underlying progression rules. Do not call the full private opening on public clients.

## Browser review and verification boundary

A separate [review branch](https://github.com/azim12086atmes-s/Golden-Thread/tree/birthday/reference-audit) runs full-game Chromium captures through [GitHub Actions](https://github.com/azim12086atmes-s/Golden-Thread/actions/runs/39872928246), using SwiftShader WebGL and a disposable synthetic Golden Thread save. It opens the pinned published current Golden game and serves the complete pinned Birthday Castle source. Screenshots and console diagnostics are stored in a short-lived artifact. This does not publish another copy of the original game or use party invitation tokens.

At this report's creation the run was still in progress. No completed browser screenshot or performance result is claimed here. The earlier 19 monument PNGs are isolated browser preview scenes, not full-game captures; the previously supplied birthday preview images are CPU model renders. Neither verifies the running current game.

Source audit method: enumerate all branch heads, inspect recursive trees and blob identities, group equivalent source families, trace representative unique entrypoints and constructor/update/interaction paths, and inspect their spatial/rendering/material/gameplay dependencies. This is not a line-by-line read of every duplicated file or an acceptance test of every feature. A local pinned reference now contains all 211 source files and 83 tests for reproducible analysis. Original full-suite/typecheck, real microphone calls, 14 graphical clients and target-device smoothness remain unverified.

Detailed evidence: `golden-all-branches-audit.md`, `birthday-all-branches-audit.md`, `golden-current-spatial-audit.md`, `golden-current-visual-audit.md`, `golden-current-gameplay-audit.md`.

