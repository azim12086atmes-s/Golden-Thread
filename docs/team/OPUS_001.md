# Opus 5.5 assignment 001 — living quarter rules

Read TEAM_HANDOFF.md, CLAUDE.md, docs/REQUIREMENTS_EXPANSION.md and docs/research/living-world/LIVING_SYSTEMS.md. Work only in the Opus worktree. Implement a bounded, complete pure TypeScript gameplay slice in src/living/ and tests/living.test.ts; write docs/team/handoffs/OPUS_001_RESULT.md. No external services, shell execution, dependencies, Git operations, rendering/UI or edits outside those paths. Codex will run tests and integrate. Use Read/Glob/Grep/Write/Edit only.

We are creating an original Blender neighbourhood kit (kirana at local x=-7,z=0; physical library x=7,z=0; workshop x=0,z=-9; shared meal garden x=0,z=7). Codex renders it and invokes your rules only through real nearby interactions. Positions here are provisional integration coordinates, not real geography claims.

Required exports from src/living/rules.ts (may re-export model/data):

```
type LivingSite = 'kirana' | 'library' | 'workshop' | 'garden';
type LivingAction = 'buy-staples' | 'community-meal' | 'read-ledger' | 'read-preservation' | 'accept-job' | 'inspect-stock' | 'choose-paper' | 'choose-digital' | 'build-prototype' | 'run-trial' | 'deliver-job' | 'share-meal';
interface LivingContext { site: LivingSite; nearby: boolean; minutes: number; }
interface LivingWallet { coins: number; }
interface LivingResult { ok: boolean; message: string; }
newLivingState(): LivingState;
normalizeLivingState(raw: unknown): LivingState;
applyLivingAction(state: LivingState, wallet: LivingWallet, action: LivingAction, context: LivingContext): LivingResult;
livingSummary(state: LivingState): string[];
```

LivingState is serializable and owns knowledge (with provenance), job stages/evidence, approach, staple supplies, bounded comfort, inventions and unique memories. Codex adds GameState.living and uses normalization for older saves. Functions may mutate supplied state/wallet deterministically, matching existing project conventions, but no time/storage/DOM/random/global side effects.

Mission: A fictional kirana proprietor loses track of stock deliveries. Accept and inspect locally; learn stock-ledger and food-preservation concepts at the physical library, with two named source/teacher records; select paper reorder cards OR a simple digital catalogue workflow. At workshop, build a prototype only with prerequisites, run a meaningful deterministic trial against sample orders including shortages/cancelled order (define the cases and solution behaviour; do not simply make the test button always succeed); return to the proprietor for payment once. Unlock a stock-planning invention only after trial. Distinct solution text/trial results should make both approaches credible. Free community meal supports zero-money players; buy staples has finite stock, opening hours and atomic coin/supply changes; share meal uses supplies and adds one shared memory, not infinite bond farming. No offline hunger or affection loss. Do not implement arbitrary script execution for tech work.

Enforce local proximity/site and sensible timestamps, legal transitions, affordability, no negative/NaN/infinite counts, no repeated payouts, corrupted save normalization. Export typed state fields useful for a UI progress display. Include concise user-facing feedback and optional catalog constants for site descriptions/actions.

Tests must prove complete paper and digital flows, wrong site/far denied, learning provenance, prerequisite/trial gates, repeat reward rejected, grocery atomicity/closed shop/empty stock, free zero-money access, no duplicate memory, round-trip/legacy normalization and invalid-state resilience. Keep scope small and integrated-quality. Document limitations rather than implementing more systems.

Return report via file. Do not claim tests passed if unable to run them. Do not edit integration code; Codex will wire it while you work.
