import { describe, expect, it } from 'vitest';
import {
  CONCEPTS, JOB_FEE, KIRANA_CAPACITY, KIRANA_CAPACITY_SOLVED, STAPLE_PRICE,
  actionsAt, applyLivingAction, livingProgress, livingSummary, newLivingState, normalizeLivingState, runStockTrial,
  type LivingAction, type LivingSite, type LivingState, type LivingWallet,
} from '../src/living/rules';

const at = (day: number, hh: number, mm = 0) => day * 1440 + hh * 60 + mm;
const SITE: Record<LivingAction, LivingSite> = {
  'buy-staples': 'kirana', 'accept-job': 'kirana', 'inspect-stock': 'kirana', 'deliver-job': 'kirana',
  'read-ledger': 'library', 'read-preservation': 'library',
  'choose-paper': 'workshop', 'choose-digital': 'workshop', 'build-prototype': 'workshop', 'run-trial': 'workshop',
  'community-meal': 'garden', 'share-meal': 'garden',
};

/** Perform an action standing at its proper site. */
function act(s: LivingState, w: LivingWallet, action: LivingAction, minutes: number) {
  return applyLivingAction(s, w, action, { site: SITE[action], nearby: true, minutes });
}

const snapshot = (s: LivingState, w: LivingWallet) => JSON.stringify({ s, w });

function solve(approach: 'paper' | 'digital') {
  const s = newLivingState();
  const w = { coins: 0 };
  const steps: Array<[LivingAction, number]> = [
    ['accept-job', at(0, 9)],
    ['inspect-stock', at(0, 9, 10)],
    ['read-ledger', at(0, 10)],
    ['read-preservation', at(0, 10, 30)],
    [approach === 'paper' ? 'choose-paper' : 'choose-digital', at(0, 11)],
    ['build-prototype', at(0, 11, 30)],
    ['run-trial', at(0, 12)],
    ['deliver-job', at(0, 13)],
  ];
  const results = steps.map(([a, m]) => ({ a, r: act(s, w, a, m) }));
  return { s, w, results };
}

describe('The Missing Shelf — complete flows', () => {
  for (const approach of ['paper', 'digital'] as const) {
    it(`completes with ${approach === 'paper' ? 'paper reorder cards' : 'a digital catalogue'}`, () => {
      const { s, w, results } = solve(approach);
      for (const { a, r } of results) expect(r.ok, `${a}: ${r.message}`).toBe(true);
      expect(s.job.stage).toBe('delivered');
      expect(s.job.approach).toBe(approach);
      expect(w.coins).toBe(JOB_FEE);
      expect(s.inventions.map((i) => i.id)).toEqual([approach === 'paper' ? 'reorder-card-board' : 'stock-catalogue']);
      expect(s.inventions[0].contributors.some((c) => c.includes('Lalitha Menon'))).toBe(true);
      expect(s.kirana.capacity).toBe(KIRANA_CAPACITY_SOLVED);
      expect(s.memories.map((m) => m.id)).toContain('job:missing-shelf');
      expect(s.job.evidence.length).toBeGreaterThan(0);
      expect(livingProgress(s).paid).toBe(true);
    });
  }

  it('the two approaches are distinct and both credible in the trial', () => {
    const paper = runStockTrial({ approach: 'paper', knowsPreservation: true }, 0);
    const digital = runStockTrial({ approach: 'digital', knowsPreservation: true }, 0);
    expect(paper.passed).toBe(true);
    expect(digital.passed).toBe(true);
    expect(paper.summary).not.toBe(digital.summary);
    const shortage = (t: typeof paper) => t.cases.find((c) => c.id === 'shortage')!.detail;
    expect(shortage(paper)).toMatch(/evening count/);
    expect(shortage(digital)).toMatch(/during order A/);
    // Real cases, not a rubber stamp.
    expect(paper.cases.map((c) => c.id)).toEqual(['delivery', 'shortage', 'cancellation', 'perishables', 'count']);
  });
});

describe('proximity, site and time', () => {
  it('refuses the wrong site or standing too far away, and changes nothing', () => {
    const s = newLivingState(), w = { coins: 50 };
    const before = snapshot(s, w);
    expect(applyLivingAction(s, w, 'buy-staples', { site: 'library', nearby: true, minutes: at(0, 10) }).ok).toBe(false);
    expect(applyLivingAction(s, w, 'buy-staples', { site: 'kirana', nearby: false, minutes: at(0, 10) }).ok).toBe(false);
    expect(applyLivingAction(s, w, 'read-ledger', { site: 'kirana', nearby: true, minutes: at(0, 10) }).ok).toBe(false);
    expect(snapshot(s, w)).toBe(before);
  });

  it('refuses time running backwards and invalid clocks', () => {
    const s = newLivingState(), w = { coins: 50 };
    expect(act(s, w, 'accept-job', at(1, 10)).ok).toBe(true);
    const before = snapshot(s, w);
    expect(act(s, w, 'inspect-stock', at(1, 9)).ok).toBe(false);
    for (const bad of [NaN, Infinity, -5]) expect(act(s, w, 'inspect-stock', bad).ok).toBe(false);
    expect(snapshot(s, w)).toBe(before);
  });

  it('respects opening hours', () => {
    const s = newLivingState(), w = { coins: 50 };
    expect(act(s, w, 'read-ledger', at(0, 21)).ok).toBe(false); // reading room closes at 20:00
    expect(act(s, w, 'buy-staples', at(0, 6)).ok).toBe(false); // kirana opens at 07:00
    expect(act(s, w, 'buy-staples', at(0, 7)).ok).toBe(true);
  });
});

describe('knowledge and provenance', () => {
  it('records source and teacher from the physical library, once', () => {
    const s = newLivingState(), w = { coins: 0 };
    expect(act(s, w, 'read-ledger', at(0, 9)).ok).toBe(true);
    const k = s.knowledge[0];
    expect(k).toMatchObject({ id: 'stock-ledger', site: 'library', learnedAt: at(0, 9), teacher: CONCEPTS['stock-ledger'].teacher, source: CONCEPTS['stock-ledger'].source });
    expect(act(s, w, 'read-ledger', at(0, 10)).ok).toBe(true);
    expect(s.knowledge).toHaveLength(1);
    expect(act(s, w, 'read-preservation', at(0, 11)).ok).toBe(true);
    expect(s.knowledge.map((x) => x.teacher)).toEqual([CONCEPTS['stock-ledger'].teacher, CONCEPTS['food-preservation'].teacher]);
    expect(CONCEPTS['stock-ledger'].teacher).not.toBe(CONCEPTS['food-preservation'].teacher);
  });

  it('cannot be learned from anywhere but the library', () => {
    const s = newLivingState(), w = { coins: 0 };
    for (const site of ['kirana', 'workshop', 'garden'] as const) {
      expect(applyLivingAction(s, w, 'read-preservation', { site, nearby: true, minutes: at(0, 10) }).ok).toBe(false);
    }
    expect(s.knowledge).toHaveLength(0);
  });
});

describe('gates: prerequisites and the trial', () => {
  it('enforces legal order', () => {
    const s = newLivingState(), w = { coins: 0 };
    expect(act(s, w, 'inspect-stock', at(0, 9)).ok).toBe(false); // not accepted
    expect(act(s, w, 'deliver-job', at(0, 9)).ok).toBe(false);
    act(s, w, 'accept-job', at(0, 9));
    expect(act(s, w, 'accept-job', at(0, 9, 1)).ok).toBe(false);
    expect(act(s, w, 'choose-paper', at(0, 9, 2)).ok).toBe(false); // not inspected
    act(s, w, 'inspect-stock', at(0, 9, 3));
    expect(act(s, w, 'choose-paper', at(0, 9, 4)).ok).toBe(false); // ledger not learned
    expect(act(s, w, 'build-prototype', at(0, 9, 5)).ok).toBe(false); // no plan
    expect(act(s, w, 'run-trial', at(0, 9, 6)).ok).toBe(false); // nothing built
    act(s, w, 'read-ledger', at(0, 10));
    expect(act(s, w, 'choose-paper', at(0, 11)).ok).toBe(true);
    expect(act(s, w, 'choose-digital', at(0, 11, 5)).ok).toBe(true); // may change plan before building
    expect(s.job.approach).toBe('digital');
    expect(act(s, w, 'deliver-job', at(0, 11, 10)).ok).toBe(false); // not trialled
    expect(act(s, w, 'build-prototype', at(0, 11, 20)).ok).toBe(true);
    expect(act(s, w, 'choose-paper', at(0, 11, 25)).ok).toBe(false); // too late to switch
  });

  it('a trial without the preservation concept fails, keeps learning, and awards nothing', () => {
    const s = newLivingState(), w = { coins: 0 };
    act(s, w, 'accept-job', at(0, 9));
    act(s, w, 'inspect-stock', at(0, 9, 10));
    act(s, w, 'read-ledger', at(0, 10));
    act(s, w, 'choose-paper', at(0, 11));
    act(s, w, 'build-prototype', at(0, 11, 30));
    const r = act(s, w, 'run-trial', at(0, 12));
    expect(r.ok).toBe(true); // the trial ran and was recorded
    expect(r.message).toMatch(/gap/);
    expect(s.job.stage).toBe('built');
    expect(s.job.trials).toHaveLength(1);
    expect(s.job.trials[0].cases.find((c) => c.id === 'perishables')!.passed).toBe(false);
    expect(s.inventions).toEqual([]);
    expect(act(s, w, 'deliver-job', at(0, 12, 30)).ok).toBe(false);
    expect(w.coins).toBe(0);
    expect(s.knowledge.map((k) => k.id)).toEqual(['stock-ledger']);
    // Learn the missing concept and try again.
    act(s, w, 'read-preservation', at(0, 13));
    expect(act(s, w, 'run-trial', at(0, 14)).ok).toBe(true);
    expect(s.job.stage).toBe('trialled');
    expect(s.inventions).toHaveLength(1);
    expect(act(s, w, 'run-trial', at(0, 14, 30)).ok).toBe(false); // already passed
  });

  it('pays exactly once', () => {
    const { s, w } = solve('digital');
    expect(w.coins).toBe(JOB_FEE);
    expect(act(s, w, 'deliver-job', at(0, 14)).ok).toBe(false);
    expect(act(s, w, 'deliver-job', at(1, 9)).ok).toBe(false);
    expect(w.coins).toBe(JOB_FEE);
    // A reloaded save cannot be paid again either.
    const reloaded = normalizeLivingState(JSON.parse(JSON.stringify(s)));
    expect(act(reloaded, w, 'deliver-job', at(1, 10)).ok).toBe(false);
    expect(w.coins).toBe(JOB_FEE);
  });
});

describe('groceries', () => {
  it('buys atomically: coins, shelf stock and supplies change together', () => {
    const s = newLivingState(), w = { coins: STAPLE_PRICE * 2 };
    expect(act(s, w, 'buy-staples', at(0, 8)).ok).toBe(true);
    expect(w.coins).toBe(STAPLE_PRICE);
    expect(s.kirana.bundles).toBe(KIRANA_CAPACITY - 1);
    expect(s.supplies).toEqual({ rice: 2, dal: 2, oil: 2 });
  });

  it('refuses when short of coins, changing nothing', () => {
    const s = newLivingState(), w = { coins: STAPLE_PRICE - 1 };
    const before = snapshot(s, w);
    expect(act(s, w, 'buy-staples', at(0, 8)).ok).toBe(false);
    expect(snapshot(s, w)).toBe(before);
  });

  it('runs out, then restocks the next morning', () => {
    const s = newLivingState(), w = { coins: 1000 };
    for (let i = 0; i < KIRANA_CAPACITY; i++) expect(act(s, w, 'buy-staples', at(0, 8, i)).ok).toBe(true);
    const coins = w.coins;
    expect(act(s, w, 'buy-staples', at(0, 9)).ok).toBe(false);
    expect(w.coins).toBe(coins);
    expect(act(s, w, 'buy-staples', at(0, 22)).ok).toBe(false); // closed
    expect(act(s, w, 'buy-staples', at(1, 8)).ok).toBe(true);
    expect(s.kirana.bundles).toBe(KIRANA_CAPACITY - 1);
  });

  it('refuses a broken purse without touching it', () => {
    const s = newLivingState();
    for (const coins of [NaN, -1, 2.5, Infinity]) {
      const w = { coins };
      expect(act(s, w, 'buy-staples', at(0, 8)).ok).toBe(false);
      expect(Object.is(w.coins, coins)).toBe(true);
    }
    expect(s.kirana.bundles).toBe(KIRANA_CAPACITY);
  });
});

describe('meals, comfort and memories', () => {
  it('a player with no money can always eat at the community table', () => {
    const s = newLivingState(), w = { coins: 0 };
    s.comfort = 10;
    expect(act(s, w, 'community-meal', at(0, 8)).ok).toBe(true);
    expect(s.comfort).toBe(30);
    expect(w.coins).toBe(0);
    expect(act(s, w, 'community-meal', at(0, 8, 30)).ok).toBe(false); // same sitting
    expect(act(s, w, 'community-meal', at(0, 10)).ok).toBe(false); // between meals
    expect(act(s, w, 'community-meal', at(0, 12, 30)).ok).toBe(true); // lunch
    expect(act(s, w, 'community-meal', at(1, 8)).ok).toBe(true); // next day
  });

  it('comfort stays within bounds', () => {
    const s = newLivingState(), w = { coins: 0 };
    for (let d = 0; d < 10; d++) act(s, w, 'community-meal', at(d, 8));
    expect(s.comfort).toBe(100);
  });

  it('a shared meal uses supplies and keeps one memory per day, never farmed', () => {
    const s = newLivingState(), w = { coins: 100 };
    expect(act(s, w, 'share-meal', at(0, 8)).ok).toBe(false); // nothing to cook
    act(s, w, 'buy-staples', at(0, 9));
    expect(act(s, w, 'share-meal', at(0, 13)).ok).toBe(true);
    expect(act(s, w, 'share-meal', at(0, 19)).ok).toBe(true); // second meal, same day
    expect(s.memories.filter((m) => m.site === 'garden')).toHaveLength(1);
    expect(s.supplies).toEqual({ rice: 0, dal: 0, oil: 0 });
    expect(act(s, w, 'share-meal', at(0, 20)).ok).toBe(false); // supplies used up
    act(s, w, 'buy-staples', at(1, 9));
    act(s, w, 'share-meal', at(1, 13));
    const ids = s.memories.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.memories.filter((m) => m.site === 'garden')).toHaveLength(2);
  });

  it('nothing drains while away', () => {
    const s = newLivingState(), w = { coins: 0 };
    act(s, w, 'community-meal', at(0, 8));
    const comfort = s.comfort;
    // A month later the travellers return: comfort only changes by what they then do.
    expect(act(s, w, 'read-ledger', at(30, 10)).ok).toBe(true);
    expect(s.comfort).toBe(comfort);
  });
});

describe('saves', () => {
  it('round-trips through JSON unchanged', () => {
    const { s } = solve('paper');
    const w = { coins: 100 };
    act(s, w, 'buy-staples', at(1, 8));
    act(s, w, 'share-meal', at(1, 12));
    expect(normalizeLivingState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('builds a valid state from nothing, garbage, or a legacy save', () => {
    const fresh = newLivingState();
    for (const raw of [undefined, null, 42, 'save', [], {}, { version: 0 }]) expect(normalizeLivingState(raw)).toEqual(fresh);
  });

  it('repairs corrupted fields', () => {
    const s = normalizeLivingState({
      clock: NaN,
      comfort: 1e9,
      supplies: { rice: -4, dal: 2.7, oil: 'lots' },
      kirana: { bundles: 999, capacity: -1, restockedDay: Infinity },
      knowledge: [
        { id: 'stock-ledger', teacher: 'Someone forged', source: 'nowhere', learnedAt: 50 },
        { id: 'stock-ledger', learnedAt: 60 },
        { id: 'magic', learnedAt: 1 },
      ],
      memories: [{ id: 'a', title: 'x', site: 'garden' }, { id: 'a', title: 'dup', site: 'garden' }, { id: 'b', title: 'y', site: 'moon' }],
      mealsTaken: ['0:lunch', '0:lunch', 7],
    });
    expect(s.comfort).toBe(100);
    expect(s.supplies).toEqual({ rice: 0, dal: 2, oil: 0 });
    expect(s.kirana.capacity).toBeGreaterThanOrEqual(1);
    expect(s.kirana.bundles).toBeLessThanOrEqual(s.kirana.capacity);
    expect(Number.isFinite(s.kirana.restockedDay)).toBe(true);
    expect(s.knowledge).toHaveLength(1);
    expect(s.knowledge[0].teacher).toBe(CONCEPTS['stock-ledger'].teacher);
    expect(s.memories.map((m) => m.id)).toEqual(['a']);
    expect(s.mealsTaken).toEqual(['0:lunch']);
    expect(s.clock).toBe(50);
    for (const v of [s.clock, s.comfort, ...Object.values(s.supplies), s.kirana.bundles]) {
      expect(Number.isFinite(v) && v >= 0).toBe(true);
    }
  });

  it('cannot forge progress: a stage or invention without its evidence is lowered', () => {
    const forged = normalizeLivingState({
      job: { stage: 'delivered', approach: 'paper', acceptedAt: 10, evidence: ['x'], trials: [], paidEventId: null },
      knowledge: [{ id: 'stock-ledger', learnedAt: 20 }],
      inventions: [{ id: 'reorder-card-board', unlockedAt: 30 }],
    });
    expect(forged.job.stage).toBe('planned');
    expect(forged.inventions).toEqual([]);
    expect(forged.job.paidEventId).toBeNull();

    const fakeTrial = normalizeLivingState({
      job: { stage: 'trialled', approach: 'paper', acceptedAt: 10, builtAt: 35, evidence: ['x'], trials: [{ at: 40, approach: 'paper', passed: true, cases: [{ id: 'a', passed: false }] }] },
      knowledge: [{ id: 'stock-ledger', learnedAt: 20 }],
    });
    expect(fakeTrial.job.stage).toBe('built');
  });

  it('stays usable after being handed a corrupted save', () => {
    const s = normalizeLivingState({ job: { stage: 'weird' }, supplies: null, knowledge: 'no' });
    const w = { coins: 20 };
    expect(act(s, w, 'accept-job', at(2, 9)).ok).toBe(true);
    expect(act(s, w, 'buy-staples', at(2, 9, 5)).ok).toBe(true);
  });
});

describe('views', () => {
  it('summarises progress for the UI', () => {
    const { s } = solve('paper');
    const lines = livingSummary(s);
    expect(lines[0]).toMatch(/Missing Shelf/);
    expect(lines.join('\n')).toMatch(/Reorder Card Board/);
    const p = livingProgress(s);
    expect(p.stageIndex).toBe(p.stageCount - 1);
    expect(p.concepts).toEqual(['stock-ledger', 'food-preservation']);
  });

  it('lists each site\'s actions', () => {
    expect(actionsAt('kirana').map((a) => a.action)).toEqual(['buy-staples', 'accept-job', 'inspect-stock', 'deliver-job']);
    expect(actionsAt('garden').every((a) => a.label.length > 0)).toBe(true);
  });
});
