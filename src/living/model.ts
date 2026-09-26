/**
 * Living quarter — state shape, catalogue and save normalisation (assignment OPUS_001).
 *
 * A small neighbourhood with four physical sites: a kirana (corner grocery), a physical library,
 * a workshop and a shared meal garden. Everything here is fictional: the shop, its proprietor,
 * the library's volumes and its teachers are invented for the game and make no claim about any
 * real person, business or place.
 *
 * Pure data. No time, storage, DOM, randomness or globals — callers pass the clock in.
 */

export type LivingSite = 'kirana' | 'library' | 'workshop' | 'garden';

export type LivingAction =
  | 'buy-staples' | 'community-meal' | 'read-ledger' | 'read-preservation' | 'accept-job'
  | 'inspect-stock' | 'choose-paper' | 'choose-digital' | 'build-prototype' | 'run-trial'
  | 'deliver-job' | 'share-meal';

export type ConceptId = 'stock-ledger' | 'food-preservation';
export type Approach = 'paper' | 'digital';
export type StapleId = 'rice' | 'dal' | 'oil';
export type InventionId = 'reorder-card-board' | 'stock-catalogue';

/** Job stages, in order. A job only ever moves forward (except approach re-choice while planned). */
export const JOB_STAGES = ['available', 'accepted', 'inspected', 'planned', 'built', 'trialled', 'delivered'] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export interface KnowledgeRecord {
  id: ConceptId;
  title: string;
  subject: string;
  /** The physical volume it came from. */
  source: string;
  /** The person who explained it. */
  teacher: string;
  /** Where it was learned — always a physical site, never the remote journal. */
  site: LivingSite;
  learnedAt: number;
}

export interface TrialCaseResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface TrialRecord {
  at: number;
  approach: Approach;
  passed: boolean;
  cases: TrialCaseResult[];
  summary: string;
}

export interface JobState {
  id: 'missing-shelf';
  stage: JobStage;
  approach: Approach | null;
  acceptedAt: number | null;
  /** When the prototype was built — a save cannot claim a build without it. */
  builtAt: number | null;
  /** Findings recorded while inspecting the shop (field evidence). */
  evidence: string[];
  /** Every trial run, newest last. Failed trials are kept as observations. */
  trials: TrialRecord[];
  /** Agreed fee, shown before accepting. */
  fee: number;
  /** Idempotency key of the single payment, once made. */
  paidEventId: string | null;
}

export interface InventionRecord {
  id: InventionId;
  name: string;
  approach: Approach;
  unlockedAt: number;
  contributors: string[];
  limitations: string;
  maintenance: string;
}

export interface SharedMemory {
  /** Unique key: the same moment in the same place cannot be remembered twice. */
  id: string;
  title: string;
  site: LivingSite;
  day: number;
  at: number;
  contributions: string[];
  keepsake?: string;
}

export interface KiranaState {
  /** Staple bundles on the shelf right now. */
  bundles: number;
  /** Bundles restocked each morning. Grows once the stock problem is solved. */
  capacity: number;
  /** Game day of the last restock. */
  restockedDay: number;
}

export interface LivingState {
  version: 1;
  /** Latest accepted action time (game minutes). Time may not run backwards. */
  clock: number;
  /** 0..100 — how rested and fed the travellers feel. Never drops while offline. */
  comfort: number;
  supplies: Record<StapleId, number>;
  kirana: KiranaState;
  knowledge: KnowledgeRecord[];
  job: JobState;
  inventions: InventionRecord[];
  memories: SharedMemory[];
  /** Keys of community-meal windows already used, e.g. "3:lunch". */
  mealsTaken: string[];
}

// ───────────────────────── catalogue ─────────────────────────

export const DAY = 1440;
export const COMFORT_MAX = 100;
export const MEMORY_CAP = 200;
export const MEAL_WINDOW_CAP = 30;

export const PROPRIETOR = 'Savitri Iyer, proprietor of Iyer Corner Stores (fictional)';

export const SITES: Record<LivingSite, { name: string; description: string; opens: number; closes: number; actions: LivingAction[] }> = {
  kirana: {
    name: 'Iyer Corner Stores',
    description: 'A narrow kirana: sacks of rice and dal, tins of oil, a counter ledger and a proprietor who knows every family by name.',
    opens: 7 * 60, closes: 21 * 60,
    actions: ['buy-staples', 'accept-job', 'inspect-stock', 'deliver-job'],
  },
  library: {
    name: 'Lamp Street Reading Room',
    description: 'A physical library with open shelves, a reading table by the window and a steward who helps visitors find the right volume.',
    opens: 8 * 60, closes: 20 * 60,
    actions: ['read-ledger', 'read-preservation'],
  },
  workshop: {
    name: 'Neighbourhood Workshop',
    description: 'A shared bench with card stock, pencils, a borrowed terminal and room to test ideas against sample orders.',
    opens: 6 * 60, closes: 22 * 60,
    actions: ['choose-paper', 'choose-digital', 'build-prototype', 'run-trial'],
  },
  garden: {
    name: 'Shared Meal Garden',
    description: 'Long tables under a vine trellis. Neighbours cook together at mealtimes; anyone may sit and eat.',
    opens: 0, closes: DAY,
    actions: ['community-meal', 'share-meal'],
  },
};

export const ACTION_SITE: Record<LivingAction, LivingSite> = {
  'buy-staples': 'kirana', 'accept-job': 'kirana', 'inspect-stock': 'kirana', 'deliver-job': 'kirana',
  'read-ledger': 'library', 'read-preservation': 'library',
  'choose-paper': 'workshop', 'choose-digital': 'workshop', 'build-prototype': 'workshop', 'run-trial': 'workshop',
  'community-meal': 'garden', 'share-meal': 'garden',
};

export const ACTION_LABELS: Record<LivingAction, string> = {
  'buy-staples': 'Buy a staples bundle',
  'community-meal': 'Join the community meal',
  'read-ledger': 'Read about stock ledgers',
  'read-preservation': 'Read about keeping food fresh',
  'accept-job': 'Offer to help with the missing stock',
  'inspect-stock': 'Inspect shelves and receipts',
  'choose-paper': 'Plan paper reorder cards',
  'choose-digital': 'Plan a simple digital catalogue',
  'build-prototype': 'Build the prototype',
  'run-trial': 'Run the trial with sample orders',
  'deliver-job': 'Hand over the system',
  'share-meal': 'Cook and share a meal',
};

export const CONCEPTS: Record<ConceptId, Omit<KnowledgeRecord, 'learnedAt' | 'site'>> = {
  'stock-ledger': {
    id: 'stock-ledger',
    title: 'Counting What Comes In',
    subject: 'Stock ledgers: record every delivery, sale and cancellation; count the shelf and compare; set a reorder point.',
    source: 'Shelf 3 — "Counting What Comes In", a stock-keeping primer compiled by the Lamp Street Merchants\' Circle (fictional)',
    teacher: 'Lalitha Menon, reading-room steward (fictional)',
  },
  'food-preservation': {
    id: 'food-preservation',
    title: 'Dry, Cool, Covered',
    subject: 'Food keeping: first-expiry-first-out rotation, cool shaded storage and sealed containers for perishables.',
    source: 'Shelf 7 — "Dry, Cool, Covered", household storage notes gathered from neighbourhood cooks (fictional)',
    teacher: 'Joseph D\'Souza, retired grocer who volunteers on Thursdays (fictional)',
  },
};

export const ACTION_CONCEPT: Partial<Record<LivingAction, ConceptId>> = {
  'read-ledger': 'stock-ledger',
  'read-preservation': 'food-preservation',
};

export const JOB_FEE = 60;
export const STAPLE_PRICE = 12;
/** One bundle is exactly two shared meals. */
export const STAPLE_BUNDLE: Record<StapleId, number> = { rice: 2, dal: 2, oil: 2 };
export const MEAL_COST: Record<StapleId, number> = { rice: 1, dal: 1, oil: 1 };
export const KIRANA_CAPACITY = 6;
export const KIRANA_CAPACITY_SOLVED = 9;
export const COMFORT_GAIN = { communityMeal: 20, sharedMeal: 30 } as const;
export const WORK_EFFORT = { build: 8, trial: 5 } as const;

export const MEAL_WINDOWS = [
  { id: 'breakfast', from: 7 * 60, to: 9 * 60 },
  { id: 'lunch', from: 12 * 60, to: 14 * 60 + 30 },
  { id: 'dinner', from: 18 * 60, to: 21 * 60 },
] as const;

export const INVENTIONS: Record<InventionId, Omit<InventionRecord, 'unlockedAt' | 'contributors'> & { approach: Approach }> = {
  'reorder-card-board': {
    id: 'reorder-card-board',
    name: 'Reorder Card Board',
    approach: 'paper',
    limitations: 'Reorders are raised at the evening count, so a mid-day shortage waits until closing.',
    maintenance: 'Replace worn cards monthly; recount the shelf every evening before turning cards.',
  },
  'stock-catalogue': {
    id: 'stock-catalogue',
    name: 'Offline Stock Catalogue',
    approach: 'digital',
    limitations: 'Needs power and someone to enter every sale; a missed entry drifts until the weekly shelf count.',
    maintenance: 'Weekly shelf count against the catalogue; keep a paper backup page for outages.',
  },
};

export const APPROACH_INVENTION: Record<Approach, InventionId> = { paper: 'reorder-card-board', digital: 'stock-catalogue' };

// ───────────────────────── construction & normalisation ─────────────────────────

export function newLivingState(): LivingState {
  return {
    version: 1,
    clock: 0,
    comfort: 60,
    supplies: { rice: 0, dal: 0, oil: 0 },
    kirana: { bundles: KIRANA_CAPACITY, capacity: KIRANA_CAPACITY, restockedDay: 0 },
    knowledge: [],
    job: { id: 'missing-shelf', stage: 'available', approach: null, acceptedAt: null, builtAt: null, evidence: [], trials: [], fee: JOB_FEE, paidEventId: null },
    inventions: [],
    memories: [],
    mealsTaken: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 400): string | null => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);
/** A finite, non-negative whole number, or the fallback. */
export const count = (v: unknown, fallback = 0, max = 1e9): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.floor(v)) : fallback;
const time = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T | null => (options.includes(v as T) ? (v as T) : null);

const stageIndex = (s: JobStage) => JOB_STAGES.indexOf(s);

/**
 * Turn any stored value — an older save, a corrupted field, hand-edited JSON — into a valid
 * LivingState. Unknown entries are dropped, numbers are clamped, duplicates removed, and a job
 * stage that its own prerequisites cannot support is lowered to the last consistent stage.
 */
export function normalizeLivingState(raw: unknown): LivingState {
  const s = newLivingState();
  if (!isObj(raw)) return s;

  s.clock = time(raw.clock) ?? 0;
  s.comfort = Math.min(COMFORT_MAX, count(raw.comfort, s.comfort));

  if (isObj(raw.supplies)) for (const k of Object.keys(s.supplies) as StapleId[]) s.supplies[k] = count(raw.supplies[k], 0, 999);

  if (isObj(raw.kirana)) {
    s.kirana.capacity = Math.max(1, Math.min(KIRANA_CAPACITY_SOLVED, count(raw.kirana.capacity, KIRANA_CAPACITY)));
    s.kirana.bundles = Math.min(s.kirana.capacity, count(raw.kirana.bundles, s.kirana.capacity));
    s.kirana.restockedDay = count(raw.kirana.restockedDay, 0);
  }

  if (Array.isArray(raw.knowledge)) {
    for (const k of raw.knowledge) {
      if (!isObj(k)) continue;
      const id = oneOf(k.id, Object.keys(CONCEPTS) as ConceptId[]);
      if (!id || s.knowledge.some((x) => x.id === id)) continue;
      // Provenance always comes from the catalogue, so a save cannot forge a source or teacher.
      s.knowledge.push({ ...CONCEPTS[id], site: 'library', learnedAt: time(k.learnedAt) ?? 0 });
    }
  }

  if (isObj(raw.job)) {
    const j = raw.job;
    s.job.stage = oneOf(j.stage, JOB_STAGES) ?? 'available';
    s.job.approach = oneOf(j.approach, ['paper', 'digital'] as const);
    s.job.acceptedAt = time(j.acceptedAt);
    s.job.builtAt = time(j.builtAt);
    s.job.evidence = Array.isArray(j.evidence) ? j.evidence.map((e) => str(e, 200)).filter((e): e is string => !!e).slice(0, 20) : [];
    s.job.trials = Array.isArray(j.trials) ? j.trials.map(normTrial).filter((t): t is TrialRecord => !!t).slice(-20) : [];
    s.job.paidEventId = str(j.paidEventId, 80);
  }

  // Lower the stage until its prerequisites hold.
  const knows = (c: ConceptId) => s.knowledge.some((k) => k.id === c);
  const passed = s.job.trials.some((t) => t.passed && t.approach === s.job.approach);
  const ok = (st: JobStage): boolean => {
    const i = stageIndex(st);
    if (i >= stageIndex('accepted') && s.job.acceptedAt === null) return false;
    if (i >= stageIndex('inspected') && s.job.evidence.length === 0) return false;
    if (i >= stageIndex('planned') && (!s.job.approach || !knows('stock-ledger'))) return false;
    if (i >= stageIndex('built') && s.job.builtAt === null) return false;
    if (i >= stageIndex('trialled') && !passed) return false;
    if (i >= stageIndex('delivered') && !s.job.paidEventId) return false;
    return true;
  };
  while (!ok(s.job.stage)) s.job.stage = JOB_STAGES[stageIndex(s.job.stage) - 1];
  if (stageIndex(s.job.stage) < stageIndex('planned')) s.job.approach = null;
  if (stageIndex(s.job.stage) < stageIndex('accepted')) s.job.acceptedAt = null;
  if (stageIndex(s.job.stage) < stageIndex('inspected')) s.job.evidence = [];
  if (stageIndex(s.job.stage) < stageIndex('built')) s.job.builtAt = null;
  if (s.job.stage !== 'delivered') s.job.paidEventId = null;

  // Inventions only exist for a passed trial of the matching approach.
  if (Array.isArray(raw.inventions)) {
    for (const inv of raw.inventions) {
      if (!isObj(inv)) continue;
      const id = oneOf(inv.id, Object.keys(INVENTIONS) as InventionId[]);
      if (!id || s.inventions.some((x) => x.id === id)) continue;
      const def = INVENTIONS[id];
      if (!s.job.trials.some((t) => t.passed && t.approach === def.approach)) continue;
      s.inventions.push({
        ...def,
        unlockedAt: time(inv.unlockedAt) ?? 0,
        contributors: Array.isArray(inv.contributors) ? inv.contributors.map((c) => str(c, 120)).filter((c): c is string => !!c).slice(0, 8) : [],
      });
    }
  }
  if (s.job.stage === 'delivered') s.kirana.capacity = KIRANA_CAPACITY_SOLVED;

  if (Array.isArray(raw.memories)) {
    const seen = new Set<string>();
    for (const m of raw.memories) {
      if (!isObj(m)) continue;
      const id = str(m.id, 80), title = str(m.title, 160), site = oneOf(m.site, Object.keys(SITES) as LivingSite[]);
      if (!id || !title || !site || seen.has(id)) continue;
      seen.add(id);
      s.memories.push({
        id, title, site,
        day: count(m.day, 0),
        at: time(m.at) ?? 0,
        contributions: Array.isArray(m.contributions) ? m.contributions.map((c) => str(c, 200)).filter((c): c is string => !!c).slice(0, 6) : [],
        ...(str(m.keepsake, 120) ? { keepsake: str(m.keepsake, 120)! } : {}),
      });
      if (s.memories.length >= MEMORY_CAP) break;
    }
  }

  if (Array.isArray(raw.mealsTaken)) {
    s.mealsTaken = [...new Set(raw.mealsTaken.map((m) => str(m, 40)).filter((m): m is string => !!m))].slice(-MEAL_WINDOW_CAP);
  }

  // The clock must be at least as late as anything recorded.
  s.clock = Math.max(s.clock, ...s.knowledge.map((k) => k.learnedAt), ...s.memories.map((m) => m.at), ...s.job.trials.map((t) => t.at), s.job.acceptedAt ?? 0, s.job.builtAt ?? 0);
  return s;
}

function normTrial(t: unknown): TrialRecord | null {
  if (!isObj(t)) return null;
  const approach = oneOf(t.approach, ['paper', 'digital'] as const);
  const at = time(t.at);
  if (!approach || at === null || typeof t.passed !== 'boolean') return null;
  const cases = Array.isArray(t.cases)
    ? t.cases.filter(isObj).map((c) => ({ id: str(c.id, 40) ?? 'case', label: str(c.label, 120) ?? '', passed: c.passed === true, detail: str(c.detail, 300) ?? '' })).slice(0, 12)
    : [];
  // A trial only counts as passed if every recorded case passed.
  const passed = t.passed && cases.length > 0 && cases.every((c) => c.passed);
  return { at, approach, passed, cases, summary: str(t.summary, 400) ?? '' };
}
