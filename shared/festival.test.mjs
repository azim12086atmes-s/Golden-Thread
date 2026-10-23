import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceFestival, createFestival, festivalView } from './festival.mjs';

const birthday = { id: 'host-secret-id', role: 'birthday' };
const guest = { id: 'guest-secret-id', role: 'guest' };
const companion = { id: 'hidden-companion-id', role: 'companion' };
const observer = { id: 'hidden-observer-id', role: 'observer' };
const apply = (state, type, actor, now, rest = {}) => advanceFestival(state, { type, ...rest }, actor, now);

test('birthday can start the finale at any time and the staged order is role-gated and idempotent', () => {
  let state = createFestival(100);
  const initial = JSON.stringify(state);
  assert.equal(apply(state, 'release-lantern', guest, 101), null);
  assert.equal(apply(state, 'enter-celebration', guest, 101), null);
  assert.equal(apply(state, 'enter-celebration', observer, 101), null);
  assert.equal(apply(state, 'blow-candles', birthday, 101), null);
  assert.equal(JSON.stringify(state), initial, 'invalid events leave input untouched');

  state = apply(state, 'enter-celebration', birthday, 102, { eventId: 'e-start' }).state;
  assert.equal(state.phase, 'celebration'); assert.equal(state.stage, 'lanterns');
  assert.equal(apply(state, 'enter-celebration', companion, 103).result.duplicate, true);
  assert.equal(apply(state, 'release-lantern', companion, 103), null);
  assert.equal(apply(state, 'release-lantern', observer, 103), null);
  assert.equal(apply(state, 'finish-finale', birthday, 103), null, 'cannot skip the birthday stages');

  state = apply(state, 'release-lantern', guest, 104, { eventId: 'e-lantern' }).state;
  assert.equal(apply(state, 'release-lantern', guest, 105).result.duplicate, true);
  state = apply(state, 'release-lantern', birthday, 106).state;
  assert.equal(festivalView(state).lanternsReleased, 2);
  assert.equal(apply(state, 'blow-candles', guest, 107), null);
  state = apply(state, 'blow-candles', birthday, 108, { eventId: 'e-candles' }).state;
  assert.equal(state.stage, 'cake'); assert.equal(state.candlesAt, 108);
  assert.equal(apply(state, 'blow-candles', birthday, 109).result.duplicate, true);
  assert.equal(apply(state, 'finish-finale', birthday, 109), null);
  state = apply(state, 'cut-cake', birthday, 110).state;
  assert.equal(state.stage, 'fireworks');
  assert.equal(apply(state, 'cut-cake', birthday, 111).result.duplicate, true);
  assert.equal(apply(state, 'finish-finale', guest, 112), null);
  state = apply(state, 'finish-finale', companion, 112, { eventId: 'e-end' }).state;
  assert.equal(state.stage, 'afterparty'); assert.equal(state.completedAt, 112);
  assert.equal(apply(state, 'finish-finale', birthday, 113).result.duplicate, true);
});

test('private roles never affect festival counts or appear in the public view', () => {
  let state = createFestival(0);
  state = apply(state, 'enter-celebration', birthday, 1).state;
  for (const actor of [companion, observer]) {
    assert.equal(apply(state, 'release-lantern', actor, 2), null);
    assert.equal(apply(state, 'round-completed', actor, 2, { game: 'tag', roundId: actor.id }), null);
    assert.equal(apply(state, 'beacon-lit', actor, 2, { region: 'meadow' }), null);
  }
  const view = festivalView(state);
  assert.equal(view.lanternsReleased, 0); assert.equal(view.keepsakes.length, 0); assert.equal(view.optionalStory.beaconsLit, 0);
  const serialized = JSON.stringify(view);
  for (const privateId of [companion.id, observer.id, birthday.id, guest.id]) assert.equal(serialized.includes(privateId), false);
});

test('optional game keepsakes and story lights are copy-only, deduplicated, and sanitized', () => {
  let state = createFestival(10);
  state = apply(state, 'enter-celebration', birthday, 11).state;
  state = apply(state, 'round-completed', guest, 12, { game: 'hide-and-seek', roundId: 'round-private-id' }).state;
  assert.equal(apply(state, 'round-completed', birthday, 13, { game: 'hide-and-seek', roundId: 'round-private-id' }).result.duplicate, true);
  state = apply(state, 'beacon-lit', guest, 14, { region: 'meadow' }).state;
  assert.equal(apply(state, 'beacon-lit', birthday, 15, { region: 'meadow' }).result.duplicate, true);
  const view = festivalView(state);
  assert.equal(view.keepsakes.length, 1); assert.equal(view.keepsakes[0].game, 'hide-and-seek');
  assert.equal('roundId' in view.keepsakes[0], false); assert.equal(view.optionalStory.beaconsLit, 1);
  assert.match(view.optionalStory.message, /optional/);
  assert.equal(JSON.stringify(view).includes('round-private-id'), false);
  assert.equal(apply(state, 'round-completed', guest, 16, { game: 'unlisted-game', roundId: 'bad' }), null);
  assert.equal(apply(state, 'beacon-lit', guest, 16, { region: 'invented-place' }), null);
});

test('event ids are replay-safe, bounded, and state survives JSON persistence without timer gates', () => {
  let state = createFestival(50);
  const started = apply(state, 'enter-celebration', birthday, 51, { eventId: 'same-event' });
  state = JSON.parse(JSON.stringify(started.state));
  const replay = apply(state, 'release-lantern', guest, 52, { eventId: 'same-event' });
  assert.equal(replay.result.duplicate, true); assert.equal(replay.state.stage, 'lanterns');
  state = apply(state, 'release-lantern', guest, 53, { eventId: 'lantern-one' }).state;
  assert.equal(festivalView(state).lanternsReleased, 1);
  state=apply(state, 'blow-candles', birthday, 54).state;assert.equal(state.stage, 'cake');
  state=apply(state, 'cut-cake', birthday, 55).state;assert.equal(state.stage, 'fireworks');
  state=apply(state, 'finish-finale', birthday, 56).state;assert.equal(state.stage, 'afterparty');
  assert.throws(() => createFestival(NaN), TypeError);
});

test('malformed state, actor, time, event, and duplicate event ids are rejected defensively', () => {
  const state = createFestival(1);
  assert.equal(festivalView(null), null);
  assert.equal(advanceFestival({ ...state, stage: 'fireworks' }, { type: 'enter-celebration' }, birthday, 2), null);
  assert.equal(advanceFestival(state, { type: 'enter-celebration' }, { id: '', role: 'birthday' }, 2), null);
  assert.equal(advanceFestival(state, { type: 'enter-celebration' }, birthday, Infinity), null);
  assert.equal(advanceFestival(state, { type: 'enter-celebration', eventId: 'x'.repeat(129) }, birthday, 2), null);
  assert.equal(advanceFestival(state, null, birthday, 2), null);
  assert.throws(() => createFestival(-1), TypeError);
});
