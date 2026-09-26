import {
  ACTION_CONCEPT, ACTION_LABELS, ACTION_SITE, APPROACH_INVENTION, COMFORT_GAIN, COMFORT_MAX, CONCEPTS, DAY,
  INVENTIONS, JOB_STAGES, KIRANA_CAPACITY_SOLVED, MEAL_COST, MEAL_WINDOWS, MEAL_WINDOW_CAP, MEMORY_CAP, PROPRIETOR,
  SITES, STAPLE_BUNDLE, STAPLE_PRICE, WORK_EFFORT,
  type Approach, type ConceptId, type JobStage, type LivingAction, type LivingSite, type LivingState, type SharedMemory,
  type StapleId, type TrialRecord,
} from './model';
import { runStockTrial } from './trial';

/**
 * Living quarter rules (assignment OPUS_001). Every action happens at a physical site the
 * travellers are standing at; the caller supplies the clock. Functions mutate the supplied state
 * and wallet deterministically, and only when the action is accepted — a rejected action leaves
 * both untouched.
 */

export * from './model';
export { runStockTrial } from './trial';

export interface LivingContext { site: LivingSite; nearby: boolean; minutes: number }
export interface LivingWallet { coins: number }
export interface LivingResult { ok: boolean; message: string }

const reject = (message: string): LivingResult => ({ ok: false, message });
const accept = (message: string): LivingResult => ({ ok: true, message });

const ALL_ACTIONS = Object.keys(ACTION_SITE) as LivingAction[];
const ALL_SITES = Object.keys(SITES) as LivingSite[];
const knows = (s: LivingState, c: ConceptId) => s.knowledge.some((k) => k.id === c);
const stageAt = (s: LivingState, st: JobStage) => JOB_STAGES.indexOf(s.job.stage) >= JOB_STAGES.indexOf(st);
const clock = (m: number) => `${String(Math.floor((m % DAY) / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const addComfort = (s: LivingState, n: number) => { s.comfort = Math.max(0, Math.min(COMFORT_MAX, s.comfort + n)); };

function remember(s: LivingState, m: SharedMemory): boolean {
  if (s.memories.some((x) => x.id === m.id)) return false;
  s.memories.push(m);
  if (s.memories.length > MEMORY_CAP) s.memories.splice(0, s.memories.length - MEMORY_CAP);
  return true;
}

export function applyLivingAction(state: LivingState, wallet: LivingWallet, action: LivingAction, context: LivingContext): LivingResult {
  // ── Validate inputs before touching anything ──
  if (!ALL_ACTIONS.includes(action)) return reject('That is not something you can do here.');
  if (!context || !ALL_SITES.includes(context.site)) return reject('You are not at a place where that can be done.');
  if (typeof context.minutes !== 'number' || !Number.isFinite(context.minutes) || context.minutes < 0) return reject('The clock looks wrong; try again in a moment.');
  if (!wallet || typeof wallet.coins !== 'number' || !Number.isInteger(wallet.coins) || wallet.coins < 0) return reject('Your purse needs checking before any trade.');
  if (context.minutes < state.clock) return reject('That moment has already passed.');

  const site = ACTION_SITE[action];
  const place = SITES[site];
  if (context.site !== site) return reject(`That can only be done at ${place.name}.`);
  if (context.nearby !== true) return reject(`Walk closer to ${place.name} first.`);

  const now = context.minutes;
  const minuteOfDay = now % DAY;
  const day = Math.floor(now / DAY);
  if (minuteOfDay < place.opens || minuteOfDay >= place.closes) {
    return reject(`${place.name} is closed now. It opens ${clock(place.opens)}–${clock(place.closes)}.`);
  }

  const result = handle(state, wallet, action, now, day, minuteOfDay);
  if (result.ok) state.clock = now;
  return result;
}

function handle(s: LivingState, wallet: LivingWallet, action: LivingAction, now: number, day: number, minuteOfDay: number): LivingResult {
  switch (action) {
    // ─────────────── groceries & meals ───────────────
    case 'buy-staples': {
      // The morning restock is applied as part of a successful purchase, so a refused purchase
      // leaves the state exactly as it was.
      const onShelf = kiranaBundlesAt(s, day);
      if (onShelf <= 0) return reject('The staples shelf is empty today. Mrs. Iyer restocks each morning — and the community meal in the garden is always free.');
      if (wallet.coins < STAPLE_PRICE) return reject(`A staples bundle costs ${STAPLE_PRICE} coins. The community meal in the garden is free while you save up.`);
      // Atomic: every check has passed, so all changes happen together.
      wallet.coins -= STAPLE_PRICE;
      s.kirana.bundles = onShelf - 1;
      s.kirana.restockedDay = Math.max(s.kirana.restockedDay, day);
      for (const k of Object.keys(STAPLE_BUNDLE) as StapleId[]) s.supplies[k] = Math.min(999, s.supplies[k] + STAPLE_BUNDLE[k]);
      return accept(`Bought rice, dal and oil for two shared meals (−${STAPLE_PRICE} coins). ${s.kirana.bundles} bundle${s.kirana.bundles === 1 ? '' : 's'} left on the shelf.`);
    }
    case 'community-meal': {
      const w = MEAL_WINDOWS.find((x) => minuteOfDay >= x.from && minuteOfDay < x.to);
      if (!w) return reject('The community table is laid at breakfast (07:00–09:00), lunch (12:00–14:30) and dinner (18:00–21:00).');
      const key = `${day}:${w.id}`;
      if (s.mealsTaken.includes(key)) return reject(`You have already eaten at this ${w.id}. The table will be laid again at the next meal.`);
      s.mealsTaken.push(key);
      if (s.mealsTaken.length > MEAL_WINDOW_CAP) s.mealsTaken.splice(0, s.mealsTaken.length - MEAL_WINDOW_CAP);
      addComfort(s, COMFORT_GAIN.communityMeal);
      return accept(`You sit at separate places along the long table and share ${w.id} with the neighbours. No one asks for payment.`);
    }
    case 'share-meal': {
      const missing = (Object.keys(MEAL_COST) as StapleId[]).filter((k) => s.supplies[k] < MEAL_COST[k]);
      if (missing.length) return reject(`You need ${missing.join(', ')} to cook. Buy a staples bundle at the kirana, or join the free community meal.`);
      for (const k of Object.keys(MEAL_COST) as StapleId[]) s.supplies[k] -= MEAL_COST[k];
      addComfort(s, COMFORT_GAIN.sharedMeal);
      const moments = [
        ['She read the recipe aloud', 'He kept the stove and set the two plates at their places'],
        ['He measured the dal', 'She laid the table under the vine and poured the tea'],
        ['She chose the spices', 'He set the pot down between their seats and served'],
      ];
      const kept = remember(s, {
        id: `meal:garden:${day}`,
        title: 'A meal cooked together in the garden',
        site: 'garden', day, at: now,
        contributions: moments[day % moments.length],
        ...(day % 2 === 0 ? { keepsake: 'a sprig of curry leaves' } : {}),
      });
      return accept(kept
        ? 'You cook together and eat at your own places under the trellis. The golden thread glows steady and warm. (A new shared memory.)'
        : 'Another quiet meal together. Today\'s memory is already kept — some days are simply good.');
    }

    // ─────────────── the library ───────────────
    case 'read-ledger':
    case 'read-preservation': {
      const id = ACTION_CONCEPT[action]!;
      const c = CONCEPTS[id];
      if (knows(s, id)) return accept(`You revisit "${c.title}". It is already in your notes, credited to ${c.teacher}.`);
      s.knowledge.push({ ...c, site: 'library', learnedAt: now });
      return accept(`${c.teacher} brings down "${c.title}" from ${c.source.split(' — ')[0]}. You take notes: ${c.subject}`);
    }

    // ─────────────── the Missing Shelf job ───────────────
    case 'accept-job': {
      if (s.job.stage !== 'available') return reject('You have already agreed to help Mrs. Iyer.');
      s.job.stage = 'accepted';
      s.job.acceptedAt = now;
      return accept(`Mrs. Iyer explains: deliveries go missing from her book, dal runs out while rice piles up, and cancelled orders stay set aside. She offers ${s.job.fee} coins for a system that works. Agreed.`);
    }
    case 'inspect-stock': {
      if (s.job.stage === 'available') return reject('Offer to help first — it is her shop.');
      if (stageAt(s, 'inspected')) return reject('You have already counted the shelves; your notes are in the journal.');
      s.job.stage = 'inspected';
      s.job.evidence = [
        'Rice: five sacks from Tuesday\'s delivery are on the shelf but not in the book.',
        'Dal: the shelf ran empty twice this week while the book still showed stock.',
        'A cancelled order\'s rice is still set aside behind the counter.',
        'Vegetables: last week\'s crate spoiled at the back, behind newer ones.',
      ];
      return accept('You count the shelves while she reads out the book. Four problems, written down.');
    }
    case 'choose-paper':
    case 'choose-digital': {
      const approach: Approach = action === 'choose-paper' ? 'paper' : 'digital';
      if (!stageAt(s, 'inspected')) return reject('Inspect the shop first so the plan fits the real problem.');
      if (stageAt(s, 'built')) return reject(`The ${s.job.approach === 'paper' ? 'reorder card board' : 'stock catalogue'} is already built.`);
      if (!knows(s, 'stock-ledger')) return reject('You need to understand stock ledgers first. The Lamp Street Reading Room has a primer.');
      if (s.job.stage === 'planned' && s.job.approach === approach) return accept('That is already the plan.');
      s.job.approach = approach;
      s.job.stage = 'planned';
      return accept(approach === 'paper'
        ? 'Plan: one card per item on a board by the counter — every delivery, sale and cancellation written on its card, and an evening count that turns a card red at its reorder point. No power needed; anyone can learn it in an afternoon.'
        : 'Plan: a simple offline catalogue on the workshop\'s borrowed terminal — each delivery, sale and cancellation entered once, running stock shown at a glance, and low stock flagged immediately.');
    }
    case 'build-prototype': {
      if (!stageAt(s, 'planned') || !s.job.approach) return reject('Choose paper cards or a digital catalogue first.');
      if (stageAt(s, 'built')) return reject('The prototype is already built. Run the trial next.');
      if (!knows(s, 'stock-ledger')) return reject('You need to understand stock ledgers first.');
      s.job.stage = 'built';
      s.job.builtAt = now;
      addComfort(s, -WORK_EFFORT.build);
      return accept(s.job.approach === 'paper'
        ? 'You rule the cards, mark each reorder point and hang the board at eye height. He sets each finished card down on the bench for you to pin.'
        : 'You set up item records, a delivery form and a sale form, then a low-stock list. He reads the sample receipts aloud while you enter them.');
    }
    case 'run-trial': {
      if (!stageAt(s, 'built') || !s.job.approach) return reject('Build the prototype before trialling it.');
      if (stageAt(s, 'trialled')) return reject('The trial has already passed. Take it to Mrs. Iyer.');
      const trial: TrialRecord = runStockTrial({ approach: s.job.approach, knowsPreservation: knows(s, 'food-preservation') }, now);
      s.job.trials.push(trial);
      if (s.job.trials.length > 20) s.job.trials.splice(0, s.job.trials.length - 20);
      addComfort(s, -WORK_EFFORT.trial);
      if (!trial.passed) return accept(trial.summary);
      s.job.stage = 'trialled';
      const inv = APPROACH_INVENTION[s.job.approach];
      if (!s.inventions.some((x) => x.id === inv)) {
        s.inventions.push({
          ...INVENTIONS[inv],
          unlockedAt: now,
          contributors: [PROPRIETOR, ...s.knowledge.map((k) => k.teacher), 'the two travellers'],
        });
      }
      return accept(`${trial.summary} New invention: ${INVENTIONS[inv].name}.`);
    }
    case 'deliver-job': {
      if (s.job.stage === 'delivered' || s.job.paidEventId) return reject('Mrs. Iyer has already paid you. She waves from the counter.');
      if (!stageAt(s, 'trialled')) return reject('Bring her a system that has passed its trial.');
      s.job.paidEventId = 'missing-shelf:paid';
      s.job.stage = 'delivered';
      wallet.coins += s.job.fee;
      s.kirana.capacity = KIRANA_CAPACITY_SOLVED;
      remember(s, {
        id: 'job:missing-shelf',
        title: 'The Missing Shelf, solved together',
        site: 'kirana', day, at: now,
        contributions: ['She taught Mrs. Iyer\'s apprentice the new routine', 'He left a copy of the notes for the reading room'],
        keepsake: s.job.approach === 'paper' ? 'a spare reorder card' : 'a printed low-stock list',
      });
      return accept(`You teach Mrs. Iyer and her apprentice the ${s.job.approach === 'paper' ? 'card board' : 'catalogue'}. She pays the agreed ${s.job.fee} coins. From tomorrow her shelves hold more staples, and a copy of your notes goes back to the reading room.`);
    }
    default:
      return reject('That is not something you can do here.');
  }
}

// ───────────────────────── read-only views for the UI ─────────────────────────

/** Staple bundles on the kirana shelf on a given game day (after that morning's restock). */
export function kiranaBundlesAt(s: LivingState, day: number): number {
  return day > s.kirana.restockedDay ? s.kirana.capacity : s.kirana.bundles;
}

export interface LivingProgress {
  stage: JobStage;
  stageIndex: number;
  stageCount: number;
  approach: Approach | null;
  concepts: ConceptId[];
  evidence: string[];
  trialsRun: number;
  lastTrial: TrialRecord | null;
  paid: boolean;
  inventions: string[];
  supplies: Record<StapleId, number>;
  mealsAvailable: number;
  comfort: number;
  kiranaBundles: number;
  memories: number;
}

export function livingProgress(s: LivingState): LivingProgress {
  const meals = Math.min(...(Object.keys(MEAL_COST) as StapleId[]).map((k) => Math.floor(s.supplies[k] / MEAL_COST[k])));
  return {
    stage: s.job.stage,
    stageIndex: JOB_STAGES.indexOf(s.job.stage),
    stageCount: JOB_STAGES.length,
    approach: s.job.approach,
    concepts: s.knowledge.map((k) => k.id),
    evidence: [...s.job.evidence],
    trialsRun: s.job.trials.length,
    lastTrial: s.job.trials[s.job.trials.length - 1] ?? null,
    paid: !!s.job.paidEventId,
    inventions: s.inventions.map((i) => i.name),
    supplies: { ...s.supplies },
    mealsAvailable: meals,
    comfort: s.comfort,
    kiranaBundles: s.kirana.bundles,
    memories: s.memories.length,
  };
}

const STAGE_TEXT: Record<JobStage, string> = {
  available: 'Mrs. Iyer at the kirana looks worried about her stock.',
  accepted: 'Inspect the kirana\'s shelves and receipts.',
  inspected: 'Learn about stock ledgers at the reading room, then choose paper cards or a digital catalogue at the workshop.',
  planned: 'Build the prototype at the workshop.',
  built: 'Run the trial with sample orders at the workshop.',
  trialled: 'Take the working system to Mrs. Iyer.',
  delivered: 'Solved. Her shelves are fuller now.',
};

export function livingSummary(s: LivingState): string[] {
  const p = livingProgress(s);
  const lines = [
    `The Missing Shelf — ${STAGE_TEXT[p.stage]}${p.approach ? ` (${p.approach === 'paper' ? 'paper reorder cards' : 'digital catalogue'})` : ''}`,
    `Comfort ${p.comfort}/${COMFORT_MAX} · supplies for ${p.mealsAvailable} shared meal${p.mealsAvailable === 1 ? '' : 's'} (rice ${p.supplies.rice}, dal ${p.supplies.dal}, oil ${p.supplies.oil})`,
  ];
  if (s.knowledge.length) lines.push(`Learned: ${s.knowledge.map((k) => `"${k.title}" with ${k.teacher}`).join('; ')}`);
  if (p.lastTrial) lines.push(`Last trial: ${p.lastTrial.passed ? 'passed' : 'found a gap'} — ${p.lastTrial.cases.filter((c) => c.passed).length}/${p.lastTrial.cases.length} cases`);
  if (p.inventions.length) lines.push(`Inventions: ${p.inventions.join(', ')}`);
  lines.push(`Shared memories: ${p.memories}`);
  return lines;
}

/** Actions offered at a site, with labels — for a context menu. */
export function actionsAt(site: LivingSite): Array<{ action: LivingAction; label: string }> {
  return SITES[site].actions.map((action) => ({ action, label: ACTION_LABELS[action] }));
}
