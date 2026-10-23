import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHASE_GAME_IDS, ARENA, COVER, createChaseGame, actionChase, tickChase,
  chaseView, canMoveChase, canSeeChase, updateChasePlayers, lineOfSight,
} from './chase-games.mjs';

test('exports a bounded arena and creates rounds only from supplied public IDs', () => {
  assert.deepEqual(CHASE_GAME_IDS, ['tag', 'hide-and-seek', 'laser-tag']);
  assert.equal(ARENA.radius, 50); assert.ok(COVER.length >= 7);
  const round = createChaseGame('hide-and-seek', [{ id: 'birthday' }, { id: 'guest-1' }], 100);
  assert.equal(round.startedAt, 100); assert.equal(round.endsAt, 120100);
  assert.equal(round.seekerId, 'birthday'); assert.equal(round.hideUntil, 20100);
  assert.deepEqual(round.publicIds, ['birthday', 'guest-1']);
  assert.throws(() => createChaseGame('tag', [{ id: 'one' }], 0), error => error.status === 400 && /two public players/.test(error.message));
});

test('tag requires the current it, proximity, and transfer grace', () => {
  const round = createChaseGame('tag', ['a', 'b', 'c'], 0);
  const it = round.itId; const other = round.publicIds.find(id => id !== it);
  const positions = new Map([[it, { x: -5, y: 0, z: 0 }], [other, { x: -3, y: 0, z: 0 }]]);
  assert.deepEqual(actionChase(round, it, { type: 'tag', targetId: other }, positions, 1499).awards, []);
  const tagged = actionChase(round, it, { type: 'tag', targetId: other }, positions, 1500);
  assert.deepEqual(tagged.awards, [{ id: it, points: 1 }]); assert.equal(round.itId, other);
  assert.equal(tagged.events[0].type, 'tag');
  assert.deepEqual(actionChase(round, other, { type: 'tag', targetId: it }, positions, 2000).awards, []);
  assert.deepEqual(actionChase(round, other, { type: 'tag', targetId: it }, positions, 2999).awards, []);
  assert.deepEqual(actionChase(round, other, { type: 'tag', targetId: it }, positions, 3000).awards, [{ id: other, points: 1 }]);
  positions.set(it, { x: 30, y: 0, z: 30 });
  assert.deepEqual(actionChase(round, other, { type: 'tag', targetId: it }, positions, 5000).awards, []);
});

test('hide and seek immobilizes seeker, checks cover, range, and only awards a find once', () => {
  const round = createChaseGame('hide-and-seek', ['seeker', 'hider'], 1000);
  const positions = new Map([['seeker', { x: -10, y: 0, z: -10 }], ['hider', { x: -8, y: 0, z: -10 }]]);
  assert.equal(canMoveChase(round, 'seeker', 20999), false);
  assert.equal(canMoveChase(round, 'seeker', 21000), true);
  assert.deepEqual(actionChase(round, 'seeker', { type: 'seek', targetId: 'hider' }, positions, 20099).awards, []);
  const found = actionChase(round, 'seeker', { type: 'seek', targetId: 'hider' }, positions, 21000);
  assert.deepEqual(found.awards, [{ id: 'seeker', points: 1 }]);
  assert.deepEqual([...round.foundIds], ['hider']);
  assert.equal(canMoveChase(round, 'hider', 21000), false);
  assert.deepEqual(actionChase(round, 'seeker', { type: 'seek', targetId: 'hider' }, positions, 22000).awards, []);
  assert.equal(lineOfSight({ x: -10, y: 1, z: 0 }, { x: 10, y: 1, z: 0 }), false);
  assert.equal(canSeeChase(round, 'seeker', 'hider', positions, 22000), true);
});

test('hide seeker cannot see unfound hiders during hide phase or through cover', () => {
  const round = createChaseGame('hide-and-seek', ['seeker', 'hider'], 0);
  const positions = new Map([['seeker', { x: -10, y: 0, z: 0 }], ['hider', { x: 10, y: 0, z: 0 }]]);
  assert.equal(canSeeChase(round, 'seeker', 'hider', positions, 10000), false);
  assert.equal(canSeeChase(round, 'seeker', 'hider', positions, 20000), false);
  assert.deepEqual(chaseView(round, 'seeker', positions, 10000).foundIds, []);
  assert.equal(chaseView(round, 'unknown', positions, 10000), null);
});

test('laser tag chooses the first public body, enforces cooldown and shields, then restores health', () => {
  const round = createChaseGame('laser-tag', ['shooter', 'near', 'far'], 0);
  const positions = new Map([
    ['shooter', { x: 0, y: 0, z: -30 }], ['near', { x: 0, y: 0, z: -20 }], ['far', { x: 0, y: 0, z: -10 }],
  ]);
  const shot = { type: 'laser', direction: { x: 0, y: 0, z: 4 } };
  const first = actionChase(round, 'shooter', shot, positions, 1000);
  assert.deepEqual(first.awards, [{ id: 'shooter', points: 1 }]);
  assert.equal(round.status.get('near').health, 2); assert.equal(round.status.get('far').health, 3);
  assert.deepEqual(actionChase(round, 'shooter', shot, positions, 1699).events, []);
  actionChase(round, 'shooter', shot, positions, 3001);
  actionChase(round, 'shooter', shot, positions, 5002);
  assert.equal(round.status.get('near').health, 0);
  assert.equal(canMoveChase(round, 'near', 6000), false);
  tickChase(round, 9002);
  assert.equal(round.status.get('near').health, 3); assert.equal(round.status.get('near').shieldUntil, 11002);
  assert.equal(canMoveChase(round, 'near', 9002), true);
});

test('laser rays stop at cover, ignore malformed vectors, and end at 60 units', () => {
  const round = createChaseGame('laser-tag', ['a', 'b'], 0);
  const positions = new Map([['a', { x: -30, y: 0, z: 0 }], ['b', { x: 30, y: 0, z: 0 }]]);
  assert.deepEqual(actionChase(round, 'a', { type: 'laser', direction: { x: NaN, y: 0, z: 0 } }, positions, 1000).events, []);
  const blocked = actionChase(round, 'a', { type: 'laser', direction: { x: 1, y: 0, z: 0 } }, positions, 1000);
  assert.equal(blocked.events[0].hit, false); assert.ok(blocked.events[0].end.x < 30);
  const farRound = createChaseGame('laser-tag', ['a', 'b'], 0);
  const farPositions = new Map([['a', { x: -30, y: 0, z: -40 }], ['b', { x: 40, y: 0, z: -40 }]]);
  const miss = actionChase(farRound, 'a', { type: 'laser', direction: { x: 1, y: 0, z: 0 } }, farPositions, 1000);
  assert.equal(miss.events[0].hit, false); assert.equal(Math.round(miss.events[0].end.x), 30);
});

test('tag contacts through existing tree/well/windmill covers are rejected', () => {
  assert.deepEqual(COVER.slice(-3).map(c => c.existing), [true, true, true]);
  const round = createChaseGame('tag', ['it', 'runner'], 0); round.itId = 'it'; round.graceUntil = 0;
  const positions = new Map([['it', { x: 0, y: 0, z: 0 }], ['runner', { x: 3, y: 0, z: 0 }]]);
  assert.deepEqual(actionChase(round, 'it', { type: 'tag', targetId: 'runner' }, positions, 10).awards, []);
});

test('laser shooter cannot fire while resting, ignores outsider bodies, and awards the first public hit', () => {
  const round = createChaseGame('laser-tag', ['shooter', 'public-target'], 0);
  const positions = new Map([
    ['shooter', { x: 0, y: 0, z: -30 }], ['private-outsider', { x: 0, y: 0, z: -25 }], ['public-target', { x: 0, y: 0, z: -20 }],
  ]);
  const shot = { type: 'laser', direction: { x: 0, y: 0, z: 1 } };
  round.status.get('shooter').health = 0; round.status.get('shooter').restUntil = 4000;
  assert.deepEqual(actionChase(round, 'shooter', shot, positions, 1000).events, []);
  tickChase(round, 4000);
  const result = actionChase(round, 'shooter', shot, positions, 4000);
  assert.equal(result.events[0].to, 'public-target');
  assert.deepEqual(result.awards, [{ id: 'shooter', points: 1 }]);
});

test('tag and hide rounds award end stars once, while a clean hide sweep ends without survivor points', () => {
  const tag = createChaseGame('tag', ['a', 'b', 'c'], 0); const current = tag.itId;
  const finishTag = tickChase(tag, tag.endsAt);
  assert.equal(finishTag.awards.length, 2); assert.ok(finishTag.awards.every(a => a.points === 2 && a.id !== current));
  assert.deepEqual(tickChase(tag, tag.endsAt + 1).awards, []);

  const hide = createChaseGame('hide-and-seek', ['seeker', 'hider-a', 'hider-b'], 0);
  const finishHide = tickChase(hide, hide.endsAt);
  assert.deepEqual(finishHide.awards, [{ id: 'hider-a', points: 2 }, { id: 'hider-b', points: 2 }]);
  assert.deepEqual(tickChase(hide, hide.endsAt + 1).awards, []);

  const sweep = createChaseGame('hide-and-seek', ['seeker', 'hider'], 0); sweep.foundIds.add('hider');
  assert.deepEqual(tickChase(sweep, 1), { awards: [], finished: true });
});

test('disconnects remove state and safely replace a leaving seeker', () => {
  const round = createChaseGame('hide-and-seek', ['a', 'b', 'c'], 0);
  round.foundIds.add('c');
  updateChasePlayers(round, ['b', 'c'], 500);
  assert.equal(round.seekerId, 'b'); assert.equal(round.status.has('a'), false);
  assert.equal(round.foundIds.has('c'), true);
  updateChasePlayers(round, ['c'], 1000);
  assert.equal(round.finished, true);
  assert.deepEqual(tickChase(round, 2000), { awards: [], finished: true });
});
