import test from 'node:test';
import assert from 'node:assert/strict';
import { PartyAudio } from './audio.js';

globalThis.addEventListener = () => {};
globalThis.document = { addEventListener() {} };
const peers = [
  { id: 'birthday', role: 'birthday', isBirthday: true },
  { id: 'guest', role: 'guest', isBirthday: false },
  { id: 'companion', role: 'companion', isBirthday: false },
  { id: 'observer', role: 'observer', isBirthday: false },
];

test('private microphones and birthday channel changes never send tracks to public guests', async () => {
  const audio = new PartyAudio(async () => {}), track = { enabled: false };
  audio.mic = { getAudioTracks: () => [track] };
  const sent = new Map();
  audio.peers = new Map(peers.map(player => [player.id, { player, sender: { async replaceTrack(value) { sent.set(player.id, value); } } }]));
  for (const role of ['observer', 'companion']) {
    audio.self = { role }; await audio.applyTracks();
    assert.equal(sent.get('birthday'), track);
    for (const id of ['guest', 'companion', 'observer']) assert.equal(sent.get(id), null);
  }
  audio.self = { role: 'birthday' }; audio.channel = 'guests'; await audio.applyTracks();
  assert.equal(sent.get('guest'), track); assert.equal(sent.get('observer'), null); assert.equal(sent.get('companion'), null);
  audio.channel = 'private'; await audio.applyTracks();
  assert.equal(sent.get('guest'), null); assert.equal(sent.get('observer'), track); assert.equal(sent.get('companion'), track);
});

test('observer creates no voice peer to a public guest even if passed an extra player', async () => {
  const audio = new PartyAudio(async () => {});
  globalThis.RTCPeerConnection = class {
    addTransceiver() { return { sender: { replaceTrack: async () => {} } }; }
  };
  globalThis.document.createElement = () => ({ remove() {}, play: async () => {} });
  globalThis.document.body = { append() {} };
  try {
    await audio.refresh(peers, { id: 'observer', role: 'observer' });
    assert.deepEqual([...audio.peers.keys()], ['birthday']);
  } finally { delete globalThis.RTCPeerConnection; }
});

test('push-to-talk stays muted while a channel change removes public tracks', async () => {
  const audio = new PartyAudio(async () => {}), track = { enabled: true };
  audio.self = { role: 'birthday' }; audio.channel = 'private'; audio.mic = { getAudioTracks: () => [track] };
  let finish;
  audio.peers.set('guest', { player: peers[1], sender: { replaceTrack(value) { assert.equal(value, null); return new Promise(resolve => { finish = resolve; }); } } });
  const switching = audio.applyTracks();
  assert.equal(track.enabled, false); audio.setTalking(true); assert.equal(track.enabled, false);
  finish(); await switching;
  audio.setTalking(true); assert.equal(track.enabled, true);
});
