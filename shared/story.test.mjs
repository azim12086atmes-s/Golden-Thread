import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JOURNEY_ACTS, JOURNEY_CHAPTERS, JOURNEY_PREMISE, JOURNEY_TITLE, advanceJourney, journeyCatalog, journeyView, newJourney } from './story.js';

const expectedRoute = [
  'meadow', 'japan', 'korea', 'aurora', 'norway', 'switzerland', 'london', 'newyork',
  'vintage', 'renaissance', 'islamic', 'middleeast', 'desert', 'egypt', 'mughal',
  'indianorth', 'indiasouth', 'china', 'indonesia', 'skyisles',
];

test('the public journey visits all twenty Golden Thread regions once at plausible stations', () => {
  const source = readFileSync(new URL('../src/world/regions.ts', import.meta.url), 'utf8');
  const regions = new Map([...source.matchAll(/R\(\{ id: '([^']+)', name: ("[^"]*"|'[^']*'), .*?col: (\d+), row: (\d+)/g)]
    .map((m) => [m[1], { name: m[2].slice(1, -1), col: Number(m[3]), row: Number(m[4]) }]));
  assert.equal(regions.size, 20);
  assert.equal(JOURNEY_TITLE, 'The Twenty Lights');
  assert.match(JOURNEY_PREMISE, /palace observatory.*birthday crown.*twenty empty constellation points/i);
  assert.deepEqual(JOURNEY_ACTS.map(({ start, end }) => [start, end]), [[0, 4], [5, 9], [10, 14], [15, 19]]);
  assert.equal(JOURNEY_CHAPTERS.length, 20);
  assert.deepEqual(JOURNEY_CHAPTERS.map((c) => c.id), expectedRoute);
  assert.equal(new Set(JOURNEY_CHAPTERS.map((c) => c.id)).size, 20);
  for (const [i, chapter] of JOURNEY_CHAPTERS.entries()) {
    const region = regions.get(chapter.region);
    assert.ok(region, `unknown region ${chapter.region}`);
    assert.equal(chapter.name, region.name);
    const cx = (region.col - 2) * 700, cz = (region.row - 1) * 700;
    if (chapter.id === 'skyisles') {
      const sx = Math.cos(15 * 0.9) * (70 - 15 * 3.2) + 6;
      const sz = Math.sin(15 * 0.9) * (70 - 15 * 3.2);
      assert.deepEqual(chapter.collect, { x: cx + sx + 5, y: 153.6, z: cz + sz + 4 });
      assert.deepEqual(chapter.beacon, { x: cx + sx - 5, y: 153.6, z: cz + sz + 8 });
    } else {
      assert.deepEqual(chapter.collect, { x: cx + 5, y: 0, z: cz + 72 });
      assert.deepEqual(chapter.beacon, { x: cx - 5, y: 0, z: cz + 104 });
    }
    assert.equal(chapter.act, Math.floor(i / 5));
    assert.equal(chapter.puzzle.options.length, 3);
    assert.ok(chapter.collect && chapter.beacon);
    assert.ok(Math.hypot(chapter.collect.x - chapter.beacon.x, chapter.collect.z - chapter.beacon.z) <= 48);
    assert.equal('answer' in chapter.puzzle, false);
  }
  assert.equal(new Set(JOURNEY_CHAPTERS.map((c) => c.intro)).size, 20);
  assert.match(JOURNEY_CHAPTERS[9].puzzle.prompt, /paints blend into green/);
  const sky = JOURNEY_CHAPTERS.at(-1);
  assert.ok(sky.collect.y > 150 && sky.beacon.y > 150);
  assert.ok(Math.hypot(sky.collect.x - 13, sky.collect.z - 718) < 12);
  for (const chapter of journeyCatalog()) assert.equal('answer' in chapter.puzzle, false);
});

test('all chapters advance through collect and correct beacon answer to the finale', () => {
  let progress = newJourney();
  for (const chapter of JOURNEY_CHAPTERS) {
    assert.equal(progress.stage, 'collect');
    const view = journeyView(progress);
    assert.equal(view.current.id, chapter.id);
    assert.equal('answer' in view.current.puzzle, false);

    progress = advanceJourney(progress, { type: 'journey-collect' }, chapter.collect);
    assert.equal(progress.stage, 'beacon');
    progress = advanceJourney(progress, { type: 'journey-light', answer: chapterIndex(chapter.id) }, chapter.beacon);
  }
  assert.deepEqual(progress, {
    chapter: 20, stage: 'complete', completed: expectedRoute, stars: 20, version: 40,
  });
  assert.equal(journeyView(progress).complete, true);
  assert.equal('current' in journeyView(progress), false);
  assert.throws(() => advanceJourney(progress, { type: 'journey-collect' }, { x: 0, y: 0, z: 0 }), { status: 400 });
});

test('wrong phase, distant stations, wrong answer, and malformed position cannot advance progress', () => {
  const start = newJourney();
  assert.throws(() => advanceJourney(start, { type: 'journey-light', answer: 0 }, JOURNEY_CHAPTERS[0].beacon), { status: 400 });
  assert.throws(() => advanceJourney(start, { type: 'journey-collect' }, { x: 100, y: 0, z: 100 }), { status: 400 });
  assert.throws(() => advanceJourney(start, { type: 'journey-collect' }, { x: NaN, y: 0, z: 72 }), { status: 400 });
  const carrying = advanceJourney(start, { type: 'journey-collect' }, JOURNEY_CHAPTERS[0].collect);
  assert.throws(() => advanceJourney(carrying, { type: 'journey-light', answer: 1 }, JOURNEY_CHAPTERS[0].beacon), { status: 400 });
  assert.deepEqual(start, newJourney());
  assert.deepEqual(carrying, { chapter: 0, stage: 'beacon', completed: [], stars: 0, version: 1 });
});

test('story copy stays generic and contains no personal names or relationship claims', () => {
  const copy = JSON.stringify(journeyCatalog()).toLowerCase();
  for (const term of ['yusuf', 'aino', 'haruka', 'husband', 'wife', 'girlfriend', 'boyfriend', 'soulmate', 'lover']) {
    assert.equal(copy.includes(term), false, `unexpected personal or relationship term: ${term}`);
  }
});

function chapterIndex(id) {
  return JOURNEY_CHAPTERS.findIndex((chapter) => chapter.id === id) < 0 ? -1 :
    // The correct answers are intentionally not public; this test records the
    // answer choice from the authored puzzle sequence below.
    [0, 1, 2, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1][JOURNEY_CHAPTERS.findIndex((chapter) => chapter.id === id)];
}
