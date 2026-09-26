# OPUS_001 result — living quarter rules

Author: Opus 5.5 (claude-opus-5-5), 2026-09-26. Status: **proposal for Codex review. Not run.**

## Files (all new; nothing else was edited for this assignment)

| File | Purpose |
|---|---|
| `src/living/model.ts` | State shape, fictional catalogue (sites, concepts, inventions, prices, meal windows), `newLivingState`, `normalizeLivingState` |
| `src/living/trial.ts` | `runStockTrial` — deterministic sample-order simulation (physical shelf vs prototype ledger) |
| `src/living/rules.ts` | Agreed API: `applyLivingAction`, `livingSummary`, plus `livingProgress`, `actionsAt`, `kiranaBundlesAt`; re-exports model/trial |
| `tests/living.test.ts` | 26 tests (25 `it` blocks, one looped over both approaches) covering every acceptance item below |

## Validation — honest status

**I did not run `tsc` or `vitest`.** The assignment limited me to Read/Glob/Grep/Write/Edit. Instead I desk-checked every test against the code line by line. That found and fixed three real defects before handoff:
1. The morning restock ran before purchase checks, so a refused purchase could still mutate state. The restock is now applied only inside a successful purchase (`kiranaBundlesAt`).
2. A save could forge the `built` stage. `JobState.builtAt` is now required by normalisation.
3. `keepsake: undefined` broke exact JSON round-trips. It is now omitted instead.

Please run `tsc --noEmit` and `vitest run tests/living.test.ts` first. Strict-mode issues I could not rule out without a compiler: none known, but treat as unverified.

## API (as agreed, plus additive helpers)

```ts
type LivingSite = 'kirana' | 'library' | 'workshop' | 'garden';
type LivingAction = 'buy-staples' | 'community-meal' | 'read-ledger' | 'read-preservation' | 'accept-job' | 'inspect-stock' | 'choose-paper' | 'choose-digital' | 'build-prototype' | 'run-trial' | 'deliver-job' | 'share-meal';
interface LivingContext { site: LivingSite; nearby: boolean; minutes: number }
interface LivingWallet { coins: number }
interface LivingResult { ok: boolean; message: string }
newLivingState(): LivingState
normalizeLivingState(raw: unknown): LivingState
applyLivingAction(state, wallet, action, context): LivingResult   // mutates state/wallet only when ok
livingSummary(state): string[]
// additive
livingProgress(state): LivingProgress      // typed fields for a progress UI
actionsAt(site): { action, label }[]        // for a context menu
kiranaBundlesAt(state, day): number        // shelf stock after that morning's restock
runStockTrial({ approach, knowsPreservation }, at): TrialRecord
SITES, ACTION_SITE, ACTION_LABELS, CONCEPTS, INVENTIONS, constants
```

`ok: true` means the action was accepted and state changed. A **failed trial** is `ok: true` (the trial ran and is recorded as an observation) with a "found a gap" message; the stage does not advance.

## Rules implemented

- **Sites:**
  - Kirana (07:00–21:00): buy, accept, inspect, deliver.
  - Library (08:00–20:00): the two readings.
  - Workshop (06:00–22:00): choose, build, trial.
  - Garden (always open): community meal and shared meal.
- **Every action requires:** the matching `site`, `nearby === true`, the site open at that hour, finite minutes ≥ 0, a clock at or after `state.clock` (time cannot run backwards), and a wallet whose coins are a non-negative integer. A rejection leaves state and wallet byte-identical; the tests assert this.
- **The job:** `available → accepted → inspected → planned → built → trialled → delivered`.
  - Inspecting records four evidence notes.
  - Choosing an approach needs the stock-ledger concept. You may switch paper ↔ digital until you build.
  - Building needs a plan plus the ledger concept.
  - Delivering needs a passed trial, pays `JOB_FEE` (60) exactly once via `paidEventId`, raises kirana capacity 6 → 9, and records one memory.
- **Trial (real, not a rubber stamp):** a day of sample orders run through the prototype. The physical shelf and the prototype's ledger are tracked separately. The cases are:
  - an unrecorded delivery;
  - a dal shortage (fill 4, backorder 2, reorder raised);
  - a cancelled reservation released;
  - perishables;
  - an evening count that matches.

  The perishables case fails unless the food-preservation concept was learned: without it the shop's habit of selling the newest vegetables spoils 6. A failure keeps the learning, awards nothing, and can be rerun after reading. The two approaches both pass, with different behaviour: paper cards raise the reorder at the evening count; the digital catalogue flags it during order A. Each has its own summary text, limitations and maintenance note.
- **Knowledge:** learned only at the library. Provenance comes from the catalogue: two volumes with two different named fictional teachers. Re-reading adds no duplicate. Normalisation discards forged teacher/source text.
- **Groceries:** a 12-coin bundle holds rice, dal and oil for exactly two shared meals. There are 6 bundles per day, restocked each morning. The purchase is atomic.
- **Zero money:** the community meal is free at breakfast, lunch and dinner, once per sitting, +20 comfort.
- **Comfort:** clamped 0–100. It only changes through actions (meals up, building and trialling slightly down) and never drains while away.
- **Shared meal:** uses one of each staple, +30 comfort, and records at most one memory per day (`meal:garden:<day>`). Repeating it that day still feeds you but adds nothing.
- **Normalisation:**
  - Numbers are clamped and floored, and NaN or Infinity is removed.
  - Unknown ids are dropped, and duplicates of knowledge, inventions and memories are removed.
  - A stage whose prerequisites are missing is lowered step by step, so a save cannot claim built, trialled or delivered without evidence.
  - An invention needs a passed trial of its own approach.
  - The clock is raised to the latest recorded event.

## Content notes

- **Fictional names:** "Iyer Corner Stores", proprietor Savitri Iyer, steward Lalitha Menon, retired grocer Joseph D'Souza. They are fictional and labelled so in the catalogue.
- **No names in the rules:** the protagonists' names never appear in rule text, so renamed saves read correctly. The only mention is "the two travellers" in the invention contributors.
- **No touching:** meal and memory text keeps separate places. Objects are set down, never handed hand to hand.

## Known limits (deliberately not built)

- One job, one kirana and one library. There's no amenity shop, vehicle depot or village project yet.
- No stock ticks for offscreen regions and no price dynamics; the staple price is fixed.
- `livingProgress().kiranaBundles` is the stored value. For display use `kiranaBundlesAt(state, currentDay)`, which accounts for the morning restock.
- Integration is needed: add `GameState.living` (normalise on load), map world interactions to `LivingContext`, and pass `st.coins` through a wallet object then write it back.

## Owner instruction received during this session

The owner asked me to add the continent map and the session's research ideas to the game where they improve function, operation and aesthetics. I am doing that next in **new files only**, and will document it in `docs/team/handoffs/OPUS_002_ATLAS.md` for Codex review. Codex keeps ownership of wiring, rendering and UI; I'm not touching Codex-owned files.
