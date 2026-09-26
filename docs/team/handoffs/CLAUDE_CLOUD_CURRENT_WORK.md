# Claude Cloud handoff — current work

Branch: `claudes-current-work` in `azim12086atmes-s/Golden-Thread`.
Base: `acbaee3` (`latest-working-on-going`), the clean playable prototype. This branch adds the local work Claude left unfinished. Continue from this branch; do not reset to the clean branch.

Read `AGENTS.md`, `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, and `docs/REQUIREMENTS_EXPANSION.md` before editing. Preserve the core rules: the two protagonists never touch or share a seat/mount, all people and animals have no eyes and detached floating heads, clothing remains modest, and new visual features must keep the game playable on web.

Current uncompleted work on this branch includes a closeable objective tracker, a larger furnished van and four-child/four-pet capacity, a flying carpet for children and pets, more anatomically detailed cat/dog/unicorn models, location-specific house decorations, a 300-person instanced city crowd, and additional townsfolk conversations/favours. Typecheck and the existing 326 tests passed at handoff, but these new features have not all had visual browser verification; tests may not cover their new behavior. Inspect wiring and finish what is incomplete rather than treating file presence as completion. The clean branch remains a fallback.

Owner's immediate questions and requests, in priority order:

1. Verify whether **all regional sky effects and particles** also appear in the **Meadow celebration event**. Identify which effects actually show in the event and add missing ones in an intentional, attractive way. Check day/night transitions and performance.
2. Verify that the **objective UI panel has a close button and a way to reopen it**. Make both keyboard/mouse/touch accessible and ensure the choice persists appropriately.
3. Make the dedicated **van larger and more aesthetically pleasing**, with credible sleeping/seating/storage space for both protagonists, up to **four children and four pets**. Keep the protagonists' separate-seat rule. Verify the interior and exterior match and the companions fit while travelling.
4. Report exactly **which pets are currently in the game**, their species, which are available at the start, and **how many children and pets can travel at once**. Distinguish defined companions from active capacity and verify the actual UI/gameplay limit.
5. Dress **all houses and buildings** with location-specific architectural patterns and artifacts, including interiors where accessible. Extend pattern work to pathways and outfits; use cultural references thoughtfully, not generic tokens. Keep draw calls and memory under control.
6. Replace plain grass with **vibrant meadow grass patterns**, including restrained night glow and layered flowers/ground cover. Add more **lakes, rivers and ponds**, with animated glowing patterns and foam. Water should feel fairytale-like while still readable and traversable.
7. Refine the **cat, dog, unicorn and dragon** silhouettes and proportions; add tasteful patterns to the unicorn and dragon. Preserve no-eyes/floating-head constraints and the two-rider separation rule.
8. When the protagonists fly by themselves or on a flying animal, have accompanying **children and pets travel alongside on a flying carpet**. Verify all flight modes, transitions, capacity, collision/spacing, and return to the ground.
9. Support **up to 300 people in a city** without a severe frame-rate drop, and make more of them interactive with varied location-appropriate conversations and useful help/favour loops. Do not claim 300 interactive residents if only a small subset can be spoken to; tell the owner the actual result.
10. Expand land ownership into **buying, planting, growing, harvesting and using/selling crops**. The crop cycle should persist through save/load and connect to food or economy systems.
11. Add **wind flowing through the environment**: grass, foliage, loose cloth and relevant objects sway with varied strength and direction. Add animated glowing foam to water, patterns on trees and trunks, and coherent pattern language across terrain, houses/buildings, paths, animals and clothing.

Work structurally, preserve the playable build, and prioritize a completed coherent slice over disconnected visual sketches. Add focused tests for new game rules and browser/visual checks for appearance and performance. At the end, answer every owner question with observed behavior, list what shipped versus remains incomplete, run typecheck/tests/build, and push commits to this same branch. Do not deploy or merge unless asked. Keep `latest-working-on-going` as the clean baseline.
