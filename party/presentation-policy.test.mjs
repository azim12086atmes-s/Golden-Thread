import test from 'node:test';
import assert from 'node:assert/strict';
import { partyPresentation } from './presentation-policy.js';
import { SIBLINGS } from '../src/caravan/caravan.ts';

const sampleState = () => ({
  names: { girl: 'Old save', boy: 'Old name' },
  caravan: [...SIBLINGS.map(s => s.id), 'pet-sheepdog', 'private-slot-7'],
  coins: 41,
  quests: { chapter: 3, complete: ['meadow'] },
  flags: { story: true },
});

test('guest state is scrubbed after load without changing original progression', () => {
  const input = sampleState();
  const view = partyPresentation({ id: 'numbered-042', role: 'guest', name: ' Guest Four ' , knownPrivateIDs: ['private-slot-7'] });
  const prepared = view.prepareState(input);

  assert.equal(view.saveKey, 'golden-thread/party/v2/numbered-042');
  assert.equal(view.allowPersonalNarrative, false);
  assert.equal(view.readOnly, false);
  assert.deepEqual(prepared.caravan, ['pet-sheepdog']);
  assert.deepEqual(prepared.names, { girl: 'Guest Four', boy: 'Traveller' });
  assert.deepEqual({ coins: prepared.coins, quests: prepared.quests, flags: prepared.flags }, {
    coins: 41, quests: { chapter: 3, complete: ['meadow'] }, flags: { story: true },
  });
  assert.equal(input.caravan.length, SIBLINGS.length + 2, 'preparation does not mutate the loaded save');
});

test('companion and observer saves also omit sibling and private slot identities', () => {
  for (const role of ['companion', 'observer']) {
    const policy = partyPresentation({ id: `slot-${role}`, role, name: role, knownPrivateIDs: ['private-slot-7'] });
    const prepared = policy.prepareState(sampleState());
    assert.deepEqual(prepared.caravan, ['pet-sheepdog']);
    assert.equal(policy.allowPersonalNarrative, false);
    assert.equal(policy.readOnly, role === 'observer');
  }
});

test('birthday keeps original sibling caravan while applying the birthday names', () => {
  const policy = partyPresentation({ id: 'honoree', role: 'birthday', name: 'Fathima', knownPrivateIDs: ['private-slot-7'] });
  const prepared = policy.prepareState(sampleState());

  assert.equal(policy.allowPersonalNarrative, true);
  assert.equal(policy.readOnly, false);
  assert.deepEqual(prepared.caravan, sampleState().caravan);
  assert.deepEqual(prepared.names, { girl: 'Fathima', boy: 'AbdulAzim' });
});

test('save key is stable for the invite identity and names are safe labels', () => {
  const a = partyPresentation({ id: 'invite/one', role: 'guest', name: '<Guest>\nName' });
  const b = partyPresentation({ id: 'invite/one', role: 'guest', name: 'Other display name' });
  assert.equal(a.saveKey, b.saveKey);
  assert.equal(a.saveKey, 'golden-thread/party/v2/invite%2Fone');
  assert.deepEqual(a.prepareState({ names: {}, caravan: [] }).names, { girl: 'GuestName', boy: 'Traveller' });
});

