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

test('unlock does not wait for an incoming stream before allowing microphone capture', {timeout:500}, async () => {
  const audio=new PartyAudio(async()=>{});
  audio.peers.set('pending',{audio:{play:()=>new Promise(()=>{})}});
  audio.context={resume:async()=>{}};
  await audio.unlock();
});

test('only one peer creates an audio offer and a rejoined peer replaces the old connection', async () => {
  const audio=new PartyAudio(async()=>{});let transceivers=0,closed=0;
  globalThis.RTCPeerConnection=class{
    addTransceiver(){transceivers++;return{sender:{replaceTrack:async()=>{}}};}
    close(){closed++;}
  };
  globalThis.document.createElement=()=>({remove(){},play:async()=>{}});globalThis.document.body={append(){}};
  try{
    await audio.refresh([{id:'b',connectionId:'one'}],{id:'a',role:'guest'});
    assert.equal(transceivers,1);
    await audio.refresh([{id:'b',connectionId:'one'}],{id:'a',role:'guest'});assert.equal(transceivers,1);
    await audio.refresh([{id:'b',connectionId:'two'}],{id:'a',role:'guest'});assert.equal(closed,1);assert.equal(transceivers,2);
    const answerer=new PartyAudio(async()=>{});await answerer.refresh([{id:'a'}],{id:'b',role:'guest'});
    assert.equal(transceivers,2);assert.equal(answerer.peers.get('a').sender,null);
  }finally{delete globalThis.RTCPeerConnection;}
});

test('signals for one connection are serialized and duplicate snapshots are ignored before queueing', async () => {
  const audio=new PartyAudio(async()=>{});const applied=[];let finish;
  const pc={signalingState:'stable',remoteDescription:null,
    async setRemoteDescription(d){applied.push(d.type);await new Promise(resolve=>{finish=resolve;});this.remoteDescription=d;},
    getTransceivers:()=>[{receiver:{track:{kind:'audio'}},sender:{replaceTrack:async()=>{}}}],
    async setLocalDescription(){this.localDescription={toJSON:()=>({type:'answer',sdp:'answer'})};},
    async addIceCandidate(){applied.push('candidate');},
  };
  audio.peers.set('a',{pc,player:{id:'a'},initiator:false,candidates:[]});
  const offer={id:'offer',from:'a',kind:'description',payload:{type:'offer',sdp:'offer'}};
  const pending=audio.signal(offer);await Promise.resolve();
  const candidate=audio.signal({id:'ice',from:'a',kind:'candidate',payload:{candidate:'candidate'}});
  await audio.signal(offer);assert.deepEqual(applied,['offer']);
  finish();await pending;await candidate;assert.deepEqual(applied,['offer','candidate']);
});

test('tap-to-talk is blocked while routes change and disabling the mic stops capture', async () => {
  const audio=new PartyAudio(async()=>{});let stopped=false;
  const track={enabled:false,stop(){stopped=true;}};audio.mic={getAudioTracks:()=>[track],getTracks:()=>[track]};
  audio.setHandsFree(true);assert.equal(track.enabled,true);
  audio.routing=1;audio.setHandsFree(true);assert.equal(track.enabled,false);assert.equal(audio.handsFree,false);
  audio.routing=0;audio.setHandsFree(true);audio.disableMic();assert.equal(track.enabled,false);assert.equal(stopped,true);
});
