import type { Approach, TrialCaseResult, TrialRecord } from './model';

/**
 * The field trial for "The Missing Shelf": a deterministic day of sample orders run through the
 * travellers' prototype. It is a real simulation — a physical shelf and the prototype's ledger
 * are tracked separately — so a plan missing a concept genuinely fails a case.
 *
 * Sample day (fictional):
 *   1. A delivery of 5 sacks of rice arrives (the old problem: deliveries went unrecorded).
 *   2. Order A: 3 kg dal — fillable.
 *   3. Order B: 3 kg dal — only 1 kg left: a SHORTAGE. Fill what exists, backorder the rest, reorder.
 *   4. Order C: 4 sacks of rice reserved for collection.
 *   5. Order C is CANCELLED — the reserved rice must return to sale.
 *   6. A fresh crate of 6 vegetables arrives beside 6 from yesterday.
 *   7. 5 vegetables are sold.
 *   8. Two days pass before the next count: perishables older than their shelf life spoil.
 */

type Item = 'rice' | 'dal' | 'veg';
interface Batch { qty: number; age: number }

export interface TrialInput {
  approach: Approach;
  /** The prototype applies first-expiry-first-out and cool storage only if this was learned. */
  knowsPreservation: boolean;
}

const START = { rice: 10, dal: 4 };
const REORDER_POINT: Record<'rice' | 'dal', number> = { rice: 6, dal: 3 };
const SHELF_LIFE = { plain: 3, cool: 4 };

export function runStockTrial({ approach, knowsPreservation }: TrialInput, at: number): TrialRecord {
  // Physical reality.
  const shelf = { rice: START.rice, dal: START.dal };
  let veg: Batch[] = [{ qty: 6, age: 1 }];
  // What the prototype believes.
  const ledger = { rice: START.rice, dal: START.dal };
  const reserved = { rice: 0, dal: 0 };
  const reorders: Array<{ item: Item; when: string }> = [];
  let filled = 0, backordered = 0;
  let released = 0;

  const available = (i: 'rice' | 'dal') => ledger[i] - reserved[i];
  // The digital catalogue checks the reorder point on every entry; paper cards are reviewed at
  // the evening count. Both are correct — they differ in when the shortage is noticed.
  const checkReorder = (i: 'rice' | 'dal', when: string) => {
    if (available(i) <= REORDER_POINT[i] && !reorders.some((r) => r.item === i)) reorders.push({ item: i, when });
  };
  const afterEntry = (i: 'rice' | 'dal', step: string) => { if (approach === 'digital') checkReorder(i, step); };

  // 1. Delivery — recorded (the stock-ledger concept is a build prerequisite).
  shelf.rice += 5;
  ledger.rice += 5;
  afterEntry('rice', 'delivery');

  // 2–3. Dal orders, the second one short.
  for (const [name, want] of [['order A', 3], ['order B', 3]] as const) {
    const give = Math.min(want, available('dal'));
    shelf.dal -= give;
    ledger.dal -= give;
    filled += give;
    backordered += want - give;
    afterEntry('dal', name);
  }

  // 4–5. Reservation and cancellation.
  reserved.rice += 4;
  afterEntry('rice', 'order C reserved');
  reserved.rice -= 4;
  released += 4;
  afterEntry('rice', 'order C cancelled');

  // 6–7. Perishables. Without the preservation concept the shop keeps its habit of putting the
  // new crate in front, so sales take the freshest vegetables and the old crate ages at the back.
  veg.push({ qty: 6, age: 0 });
  let toSell = 5;
  const order = knowsPreservation ? [...veg].sort((a, b) => b.age - a.age) : [...veg].sort((a, b) => a.age - b.age);
  for (const b of order) {
    const take = Math.min(b.qty, toSell);
    b.qty -= take;
    toSell -= take;
  }
  veg = veg.filter((b) => b.qty > 0);

  // Evening count — paper cards are turned here.
  if (approach === 'paper') { checkReorder('dal', 'evening count'); checkReorder('rice', 'evening count'); }

  // 8. Two days pass.
  const life = knowsPreservation ? SHELF_LIFE.cool : SHELF_LIFE.plain;
  let spoiled = 0;
  for (const b of veg) {
    b.age += 2;
    if (b.age >= life) spoiled += b.qty;
  }

  const dalReorder = reorders.find((r) => r.item === 'dal');
  const cases: TrialCaseResult[] = [
    {
      id: 'delivery',
      label: 'Unrecorded delivery',
      passed: ledger.rice === shelf.rice,
      detail: `Rice on the shelf ${shelf.rice}, in the ${approach === 'paper' ? 'card board' : 'catalogue'} ${ledger.rice}.`,
    },
    {
      id: 'shortage',
      label: 'Dal shortage',
      passed: backordered === 2 && filled === 4 && !!dalReorder,
      detail: dalReorder
        ? `Filled ${filled} kg, backordered ${backordered} kg; reorder raised ${approach === 'paper' ? 'at the evening count, when the dal card was turned' : `during ${dalReorder.when}, the moment the shelf ran low`}.`
        : `Filled ${filled} kg, backordered ${backordered} kg, but no reorder was raised.`,
    },
    {
      id: 'cancellation',
      label: 'Cancelled reservation',
      passed: released === 4 && reserved.rice === 0 && available('rice') === shelf.rice,
      detail: `${released} sacks returned to sale; ${available('rice')} available of ${shelf.rice} on the shelf.`,
    },
    {
      id: 'perishables',
      label: 'Vegetables kept fresh',
      passed: spoiled === 0,
      detail: spoiled === 0
        ? 'Oldest crate sold first and the rest kept cool: nothing spoiled.'
        : `${spoiled} vegetables spoiled at the back of the shelf. The plan needs a rule for rotating and storing perishables.`,
    },
    {
      id: 'count',
      label: 'Evening count matches',
      passed: ledger.rice === shelf.rice && ledger.dal === shelf.dal,
      detail: `Counted rice ${shelf.rice}/${ledger.rice}, dal ${shelf.dal}/${ledger.dal}.`,
    },
  ];
  const passed = cases.every((c) => c.passed);
  const summary = passed
    ? approach === 'paper'
      ? 'The card board held up: every delivery, sale and cancellation went on a card, and the evening count caught the dal shortage for tomorrow\'s order. Cheap, visible and easy to teach.'
      : 'The catalogue held up: each entry updated the running stock, and the dal shortage was flagged the moment it happened. Fast, though it relies on every sale being entered.'
    : `The trial found a gap: ${cases.filter((c) => !c.passed).map((c) => c.label.toLowerCase()).join(', ')}. What was learned is kept; fix the gap and run it again.`;
  return { at, approach, passed, cases, summary };
}
