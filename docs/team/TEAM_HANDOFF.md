# Golden Thread — shared handoff

Updated 2026-09-26. Read this before any assignment. This file describes actual state, not completion of the full vision.

## Source and preservation

- Original: `C:/Users/karee/OneDrive/Desktop/Golden_Thread`, no Git history or remote at discovery. Do not modify it.
- Integration repo: `C:/Users/karee/OneDrive/Desktop/Golden_Thread_Codex`, branch `codex/playable-game`.
- Commits: `11dd925` original snapshot; `8e942eb` touch actions, graphics and PNG photos; `71b0f7d` procedural hero identity and expanded design/research.
- Opus worktree: `C:/Users/karee/OneDrive/Desktop/Golden_Thread_Opus`, branch `codex/opus-living-slice`. Only assigned files. Integration remains Codex's responsibility.
- Dependencies are a local directory junction to the original installed node_modules. There is no hosted fork, deployment or remote configured.

## Earlier sessions

The existing Three.js/TypeScript prototype has 20 streamed lands on a 700-unit grid, modest procedural outfits, followers and glowing thread, no-touch rules, floating eyeless heads, animals, residents, quests, skills/crafting, homes/farming, messages, vehicles and local JSON saves. These are prototype systems; city-sized geography and detailed regional life are not finished.

The first Codex pass added touch interact/fly/held vertical controls, input reset on blur/menu, low/high graphics and PNG photos without HUD. An unused incomplete geo.ts lacked geography-data.ts; it was preserved in docs/prototypes/geo.ts.txt instead of inventing missing data. Validation: 222 tests, TypeScript and production build; browser startup, quality and photo checks.

The expanded owner brief is captured VERBATIM in docs/REQUIREMENTS_EXPANSION.md. It requests Blender art, iterative Pinterest references, cultures/terrain/economies, business outsourcing, physical libraries, inventions, shared memories, persistent owned vehicles, groceries/amenities/kirana, glasses for both heroes and beard/curled quiff for the male. Requirements carry IDs and acceptance checks. Content rules remain absolute: no eyes; detached heads; modest clothing; no touch; separate seats and mounts; peaceful gameplay. Glasses/beard/hair are expressly allowed owner amendments.

Research files in docs/research/living-world: WORLD_ATLAS.md (primary-source anchors plus clearly marked design proposals), LIVING_SYSTEMS.md (mechanics and vertical-slice spec), BLENDER_WEB_PIPELINE.md, PINTEREST_RESEARCH.md. Pinterest browser/Playwright searches and a Kerala seed pin were blocked by sign-in. No completed image-selection loop or approved moodboard is claimed. Continue from the signed-in browser when available. Do not equate search titles with visual inspection.

Implemented procedural hero glasses, angular beard, curled side quiff (covered by hats) in both world and van. /?characters is a wardrobe review, independent of save. 223 tests pass; typecheck and build pass. Browser checked Wanderer and Anarkali/Sherwani, no console errors. GT-CHAR-001 is Built pending exhaustive accessory/headwear visual QA. These are not Blender assets.

## Current equipment and collaboration

Owner's latest instruction: use downloaded Blender for 3D assets; collaborate with Opus 5.5 through managed handoffs and shared files; preserve progress. Blender 5.2.2 installed at C:/Program Files/Blender Foundation/Blender 5.2/blender.exe (valid Blender Foundation signature). Downloads/mcp-1.0.3.zip is Blender Lab's official-style extension manifest/version. No Blender MCP tools are exposed to this Codex session yet. Reproducible Blender Python background generation can produce actual .blend and GLB now; do not claim a live MCP connection without verification.

Claude Code 2.1.281 is available at C:/Users/karee/AppData/Roaming/Claude/claude-code/2.1.281/claude.exe. The .local/bin copy is older (2.1.235). Use exact model claude-opus-5-5; never silently substitute. Auth status reports logged in; model request must still succeed before claiming active collaboration. Do not inspect or copy credentials.

## Ownership and protocol

1. Read CLAUDE.md, this file, REQUIREMENTS_EXPANSION.md and your assignment.
2. Codex owns Blender assets, web rendering, src/Game.ts, src/ui/, src/core/ integration and final validation.
3. Opus owns src/living/ and tests/living.test.ts ONLY for first assignment. No dependencies, commits, pushes, main-loop/UI edits or Blender operations.
4. Write completion/review in docs/team/handoffs/OPUS_001_RESULT.md: files, API, tests actually run, known risks, unmet acceptance. Never overwrite the other agent's report.
5. Each integration is reviewed, tested and checkpointed by Codex. File output is a proposal until reviewed. No shared-file simultaneous edits.
6. Use docs/team/BOARD.md for owner/status/dependencies. Update handoff before stopping, with next concrete action and blockers. No automatic claim that the entire game is accomplished.

## Milestones and gates

M0 preserve baseline and establish collaboration. M1 actual Blender-authored neighbourhood kit with GLB loading in browser. M2 one physical kirana/library/workshop loop with local learning, paid problem-solving, single payout, groceries and shared memory; persist it. M3 persistent vehicles and v1 migration with all summon paths removed. M4 community projects and village route. M5 expand researched geography, wardrobe, stories and regional economies after visual and performance checks.

An asset or system is Built when integrated. Verified requires its own acceptance scenario, not a nearby test. Full city scale, all cultural dossiers, complete story, audio and mobile performance remain substantial work.

## Validation commands

From integration repo: `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/vitest/vitest.mjs run`; `node node_modules/vite/bin/vite.js build`. Dev preview http://127.0.0.1:5191. No npm executable in current shell; direct Node commands work. Browser tests use real UI/Playwright, not mutations via browser evaluate. Working copy and save data must not be destroyed for tests.

2026-09-26 owner correction: use their existing Claude session and provide a pasteable prompt. The CLI dispatch was stopped (HTTP 429 retries; no source files produced). Assignment 001 now waits for manual handoff using PASTE_IN_CLAUDE.md. Do not start another Claude process. Pinterest sign-in is open in Codex browser; await user completion before research.

## Opus update — 2026-09-26 (appended by Opus; Codex may fold this in)

- **Assignment 001:** delivered in `src/living/` and `tests/living.test.ts`. Report: `handoffs/OPUS_001_RESULT.md`. Not compiled or run; please run `tsc` and the tests first.
- **Owner-directed extras, new files only:**
  - `src/atlas/`: the continent map data and engine, from `map-design.md`.
  - `src/fusion/`: the permutation fusion wardrobe.
  - `src/caravan/`: children and pets who travel with the pair.
  - Their tests: `tests/atlas|fusion|caravan.test.ts`.
  - Report: `handoffs/OPUS_002_ATLAS.md`.
- **Hosted build:** per the owner, the committed game was built in the Opus scratchpad with the names Syeda Fathima / Mohammed Abdul Azim (edited in the copy only) and published as a private artifact: https://claude.ai/artifact/UqiHT2AmZbzZSBxB3uNfR3. Codex should mirror the name edits listed in `handoffs/OPUS_LOG.md` if the owner wants them as the defaults.
- **Every Opus action is logged** in `handoffs/OPUS_LOG.md`.
- **Original folder:** it still contains `src/world/geography.ts` and `src/world/geo.ts`, written by Opus before the team setup. `geo.ts` breaks the original's typecheck. Opus has not touched the original since; the owner or Codex decide whether to remove them.

