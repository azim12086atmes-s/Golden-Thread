import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createPartyServer, makeDefaultConfig, SKY_RINGS, BRIDGE_CHECKPOINTS, CAKE_SPOT } from './party.mjs';
import { BRIDGE_START } from '../shared/party-layout.js';

async function fixture({ observer = false, maxConnections, autoTick = true } = {}) {
  const config = makeDefaultConfig();
  if (observer) config.slots.push({ id: 'private-observer', role: 'observer', name: 'Observer', avatar: 'b-moon', token: 'observer-token-' + 'x'.repeat(32) });
  if (maxConnections) config.maxConnections = maxConnections;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-party-'));
  const distDir = path.join(tmp, 'dist'); await fs.mkdir(distDir);
  await fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><h1>party</h1>');
  await fs.writeFile(path.join(tmp, 'private.json'), '{"secret":true}');
  let time = Date.now(); const server = createPartyServer({ config, distDir, now: () => time, autoTick, ...(autoTick ? {} : { serverFactory: () => ({ on() {} }) }) });
  return { config, tmp, server, advance: ms => { time += ms; }, current: () => time, close: async () => { server.emit?.('close'); await fs.rm(tmp, { recursive: true, force: true }); } };
}
async function request(f, method, url, { body, ticket } = {}) {
  const req = new EventEmitter(); req.method = method; req.url = url; req.headers = ticket ? { authorization: `Bearer ${ticket}` } : {};
  const res = { headers: {}, headersSent: false, destroyed: false, writableEnded: false,
    setHeader(k, v) { this.headers[k] = v; },
    writeHead(status, headers = {}) { this.status = status; this.headersSent = true; Object.assign(this.headers, headers); },
    end(value = '') { this.body = Buffer.isBuffer(value) ? value : String(value); this.writableEnded = true; },
    destroy() { this.destroyed = true; },
  };
  const pending = f.server.partyInternals.handler(req, res);
  if (body !== undefined) { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end'); }
  await pending;
  return { status: res.status, headers: res.headers, body: res.body, text: () => Buffer.isBuffer(res.body) ? res.body.toString('utf8') : (res.body || ''), json: () => JSON.parse(Buffer.isBuffer(res.body) ? res.body.toString('utf8') : (res.body || '{}')) };
}
async function join(f, slot) { return request(f, 'POST', '/api/join', { body: { token: slot.token } }); }
async function joinNumber(f, guestNumber, name, role) { return request(f, 'POST', '/api/join', { body: { guestNumber, ...(name ? { name } : {}), ...(role ? { role } : {}) } }); }
async function post(f, route, ticket, body) { return request(f, 'POST', route, { ticket, body }); }
async function state(f, ticket) { return request(f, 'GET', `/api/state?ticket=${ticket}`); }

test('guest state filters companion presence, roles, and scores', async t => {
  const f = await fixture(); t.after(f.close);
  const birthday = f.config.slots[0], companion = f.config.slots[1], guest = f.config.slots[4];
  const b = (await join(f, birthday)).json(); const c = (await join(f, companion)).json(); await join(f, f.config.slots[2]); const g = (await join(f, guest)).json();
  const compState = (await state(f, c.ticket)).json();
  assert.equal(compState.players.length, 3);
  assert.ok(!compState.players.some(p => p.id === 'slot-3'));
  const guestState = (await state(f, g.ticket)).json();
  assert.deepEqual(guestState.players.map(p => p.id).sort(), [b.self.id, g.self.id].sort());
  assert.ok(guestState.players.every(p => p.role === undefined));
  f.server.partyInternals.scores.companion[c.self.id] = 7;
  f.server.partyInternals.scores.guest[g.self.id] = 2;
  const filtered = (await state(f, g.ticket)).json();
  assert.deepEqual(filtered.party.scores, { [g.self.id]: 2 });
  const host = (await state(f, b.ticket)).json();
  assert.ok(host.players.some(p => p.role === 'companion'));
});

test('invalid invite is rejected and reconnect replaces the prior session', async t => {
  const f = await fixture(); t.after(f.close);
  assert.equal((await post(f, '/api/join', null, { token: 'not-a-real-invitation' })).status, 401);
  const slot = f.config.slots[4]; const first = (await join(f, slot)).json(); const second = (await join(f, slot)).json();
  assert.equal((await state(f, first.ticket)).status, 401);
  assert.equal((await state(f, second.ticket)).status, 200);
  const tooMany = [...f.config.slots]; while (tooMany.length < 65) tooMany.push({ ...slot, id: `extra-${tooMany.length}`, token: `${tooMany.length}`.padEnd(32, 'x') });
  assert.throws(() => createPartyServer({ config: { slots: tooMany } }), /1 to 64/);
});

test('numbered guest links create, replace, and cap guest sessions without role escalation', async t => {
  const f = await fixture({ maxConnections: 14 }); t.after(f.close);
  const first = (await joinNumber(f, '00123', 'Moss Guest')).json();
  assert.equal(first.self.id, 'numbered-123'); assert.equal(first.self.role, 'guest'); assert.equal(first.self.name, 'Moss Guest');
  const escalated = (await joinNumber(f, '123', 'Moss Guest', 'observer')).json(); assert.equal(escalated.self.role, 'guest');
  const second = (await joinNumber(f, '123', 'Moss Guest')).json();
  assert.equal((await state(f, first.ticket)).status, 401); assert.equal((await state(f, second.ticket)).status, 200);
  for (let i = 0; i < 13; i++) assert.equal((await joinNumber(f, String(1000 + i))).status, 200);
  assert.equal((await joinNumber(f, '999')).status, 429);
  assert.equal((await joinNumber(f, '123')).status, 200, 'reconnect succeeds at capacity');
});

test('numbered guest links reject empty and malformed identifiers', async t => {
  const f = await fixture(); t.after(f.close);
  for (const guestNumber of ['', ' 2', '12345678901', 123]) assert.equal((await joinNumber(f, guestNumber)).status, 401);
});

test('observer is view-only, follows birthday, and stays private from public guests', async t => {
  const f = await fixture({ observer: true }); t.after(f.close);
  const [birthday, companion, guest, guest2] = [f.config.slots[0], f.config.slots[1], f.config.slots[4], f.config.slots[5]];
  const b = (await join(f, birthday)).json(), c = (await join(f, companion)).json(), g = (await join(f, guest)).json(), g2 = (await join(f, guest2)).json(), o = (await join(f, f.config.slots.at(-1))).json();
  let observer = (await state(f, o.ticket)).json();
  assert.equal(observer.self.observer, true); assert.equal(observer.self.followingId, b.self.id); assert.equal(observer.party.observer, true); assert.equal(observer.party.chase, null);
  assert.deepEqual(observer.players.map(p => p.id).sort(), [b.self.id, g.self.id, g2.self.id, o.self.id].sort());
  assert.deepEqual(observer.voicePeers.map(p => p.id), [b.self.id]);
  const guestView = (await state(f, g.ticket)).json(); const companionView = (await state(f, c.ticket)).json();
  for (const view of [guestView, companionView]) {
    assert.ok(!JSON.stringify(view).includes(o.self.id));
    assert.ok(!view.party.observer); assert.ok(!view.self.observer);
  }
  const birthdayView = (await state(f, b.ticket)).json();
  assert.ok(birthdayView.players.some(p => p.id === o.self.id && p.role === 'observer'));
  assert.equal(birthdayView.party.observerFollow.id, o.self.id);
  for (const route of ['/api/move', '/api/action', '/api/photo']) assert.equal((await post(f, route, o.ticket, {})).status, 403);
  assert.equal((await post(f, '/api/action', o.ticket, { type: 'start-game', game: 'tag' })).json().error, 'This invitation is view-only.');
  const signal = { kind: 'description', payload: { type: 'offer', sdp: 'opaque' } };
  assert.equal((await post(f, '/api/signal', g.ticket, { ...signal, to: o.self.id })).status, 403);
  assert.equal((await post(f, '/api/signal', c.ticket, { ...signal, to: o.self.id })).status, 403);
  assert.equal((await post(f, '/api/signal', o.ticket, { ...signal, to: g.self.id })).status, 403);
  assert.equal((await post(f, '/api/signal', b.ticket, { ...signal, to: o.self.id })).status, 200);
  assert.equal((await post(f, '/api/signal', o.ticket, { ...signal, to: b.self.id })).status, 200);
  f.server.partyInternals.positions.set(b.self.id, { x: 0, y: 4, z: 0, yaw: 0 });
  f.server.partyInternals.positions.set(o.self.id, { x: 100, y: 0, z: 100, yaw: 0 });
  f.server.partyInternals.tickRoom();
  let p = f.server.partyInternals.positions.get(o.self.id); assert.ok(Math.abs(Math.hypot(p.x, p.z) - 1.95) < .01); assert.equal(p.y, 4);
  f.advance(100); f.server.partyInternals.positions.set(b.self.id, { x: 1, y: 6, z: 0, yaw: Math.PI / 2 }); f.server.partyInternals.tickRoom();
  p = f.server.partyInternals.positions.get(o.self.id); assert.ok(Math.hypot(p.x - 1, p.y - 6, p.z) >= 1.5); assert.ok(p.y > 4 && p.y <= 6);
  for (const game of ['tag', 'hide-and-seek', 'laser-tag']) {
    assert.equal((await post(f, '/api/action', b.ticket, { type: 'start-game', game })).status, 200);
    const bView = (await state(f, b.ticket)).json(), oView = (await state(f, o.ticket)).json(), gView = (await state(f, g.ticket)).json();
    assert.ok(bView.players.some(p => p.id === o.self.id), 'private following remains visible during arena rounds');
    assert.equal(oView.party.chase, null); assert.ok(!bView.party.chase.publicStatus[o.self.id]);
    assert.ok(!JSON.stringify(gView).includes(o.self.id));
    assert.ok(!bView.party.scores[o.self.id]);
  }
  assert.ok((await state(f, o.ticket)).json().signals.some(s => s.from === b.self.id));
});

test('snapshots round-trip active chase, invitations, observer session, story, scores, and signals without invite tokens', async t => {
  const f = await fixture({ observer: true, autoTick: false }); t.after(f.close);
  const host = (await join(f, f.config.slots[0])).json(); const companion = (await join(f, f.config.slots[1])).json();
  const guest = (await joinNumber(f, '808')).json(); const observer = (await join(f, f.config.slots.at(-1))).json();
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'start-journey' })).status, 200);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'start-game', game: 'tag' })).status, 200);
  const signal = { to: observer.self.id, kind: 'description', payload: { type: 'offer', sdp: 'sdp-round-trip' } };
  assert.equal((await post(f, '/api/signal', host.ticket, signal)).status, 200);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'outfit', avatar: 'g-silver' })).status, 200);
  f.server.partyInternals.scores.guest[guest.self.id] = 9;
  const snapshot = f.server.partyInternals.exportSnapshot();
  for (const slot of f.config.slots) assert.ok(!JSON.stringify(snapshot).includes(slot.token));
  const restored = createPartyServer({ config: f.config, now: f.current, autoTick: false, serverFactory: () => ({ on() {} }), snapshot });
  t.after(() => restored.emit?.('close'));
  const b = (await state({ server: restored }, host.ticket)).json();
  assert.equal(b.party.game, 'tag'); assert.equal(b.party.journey.chapter, 0); assert.equal(b.party.scores[guest.self.id], 9);
  assert.equal(b.self.avatar, 'g-silver'); assert.ok(b.party.privatePractices.some(p => p.ownerId === companion.self.id));
  const o = (await state({ server: restored }, observer.ticket)).json();
  assert.equal(o.party.chase, null); assert.ok(o.signals.some(s => s.payload.sdp === 'sdp-round-trip'));
  assert.ok(o.players.some(p => p.id === host.self.id)); assert.ok(!o.players.some(p => p.id === companion.self.id));
  const roundTrip = restored.partyInternals.exportSnapshot();
  assert.ok(roundTrip); assert.equal(restored.partyInternals.getActive().chase.status instanceof Map, true);
});

test('ackSignals removes only acknowledged recipient events and persists the cleared queue', async t => {
  const f = await fixture({ observer: true, autoTick: false }); t.after(f.close);
  const host = (await join(f, f.config.slots[0])).json(), guest = (await join(f, f.config.slots[4])).json();
  const offer = { to: guest.self.id, kind: 'description', payload: { type: 'offer', sdp: 'queued-offer' } };
  assert.equal((await post(f, '/api/signal', host.ticket, offer)).status, 200);
  const before = (await state(f, guest.ticket)).json(); const queued = before.signals[0]; assert.ok(queued);
  assert.equal(f.server.partyInternals.ackSignals(host.self.id, [queued.id]), 0, 'sender queue remains untouched');
  assert.equal(f.server.partyInternals.ackSignals(guest.self.id, [queued.id, 'unknown']), 1);
  assert.equal((await state(f, guest.ticket)).json().signals.length, 0);
  assert.equal(f.server.partyInternals.ackSignals(guest.self.id, Array.from({ length: 257 }, () => queued.id)), 0);
  const snapshot = f.server.partyInternals.exportSnapshot();
  const restored = createPartyServer({ config: f.config, now: f.current, autoTick: false, serverFactory: () => ({ on() {} }), snapshot });
  t.after(() => restored.emit?.('close'));
  assert.equal((await state({ server: restored }, guest.ticket)).json().signals.length, 0);
});

test('all fourteen configured slots can join without exposing companions to guests', async t => {
  const f = await fixture(); t.after(f.close);
  const joined = [];
  for (const slot of f.config.slots) joined.push((await join(f, slot)).json());
  assert.equal((await state(f, joined[0].ticket)).json().players.length, 14);
  const guestView = (await state(f, joined[4].ticket)).json();
  assert.equal(guestView.players.length, 11);
  assert.ok(guestView.players.every(player => !player.isBirthday || player.id === joined[0].self.id));
});

test('actions require auth; collection is proximity checked and awarded once', async t => {
  const f = await fixture(); t.after(f.close);
  const g = (await join(f, f.config.slots[4])).json(), h = (await join(f, f.config.slots[0])).json(), c = (await join(f, f.config.slots[1])).json();
  assert.equal((await post(f, '/api/action', null, { type: 'start-game', game: 'lantern-hunt' })).status, 401);
  assert.equal((await post(f, '/api/action', h.ticket, { type: 'start-game', game: 'lantern-hunt' })).status, 200);
  const initial = (await state(f, g.ticket)).json(); const item = initial.party.round.items[0];
  assert.equal((await post(f, '/api/move', g.ticket, { x: item.x, y: item.y, z: item.z, yaw: 0 })).status, 200);
  assert.equal((await post(f, '/api/action', g.ticket, { type: 'collect', itemId: item.id })).status, 200);
  assert.equal((await post(f, '/api/action', c.ticket, { type: 'collect', itemId: item.id })).status, 400);
  const result = (await state(f, g.ticket)).json();
  assert.deepEqual(result.party.scores, { [g.self.id]: 1 });
  f.advance(101);
  assert.equal((await post(f, '/api/move', g.ticket, { x: Infinity, y: 0, z: 0 })).status, 400);
});

test('minigame state and server checks cover bridge, sky rings, courier, memory, and statues', async t => {
  const f = await fixture(); t.after(f.close);
  const host = (await join(f, f.config.slots[0])).json();
  const start = async game => post(f, '/api/action', host.ticket, { type: 'start-game', game });
  const get = async () => (await state(f, host.ticket)).json();
  const move = async (x, y, z) => post(f, '/api/move', host.ticket, { x, y, z, yaw: 0 });

  await start('bridge-dash');
  assert.deepEqual((await get()).party.round.checkpoints, BRIDGE_CHECKPOINTS);
  const bridgeStart=f.server.partyInternals.positions.get(host.self.id);
  assert.ok(Math.hypot(bridgeStart.x-BRIDGE_START.x,bridgeStart.y-BRIDGE_START.y,bridgeStart.z-BRIDGE_START.z)<3);
  f.advance(101);assert.equal((await move(100, 0, -100)).status, 400);

  await start('sky-rings');
  assert.deepEqual((await get()).party.round.checkpoints, SKY_RINGS);
  await move(SKY_RINGS[0].x, SKY_RINGS[0].y, SKY_RINGS[0].z);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'checkpoint', index: 0 })).status, 200);

  await start('cake-courier');
  let round = (await get()).party.round;
  await move(round.ingredients[0].x, round.ingredients[0].y, round.ingredients[0].z);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'pick-ingredient', index: 0 })).status, 200);
  f.advance(101); await move(round.cake.x, round.cake.y, round.cake.z);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'deliver-ingredient' })).status, 200);
  assert.deepEqual((await get()).party.selfProgress.delivered, [0]);
  for(const index of [1,2]){
    f.advance(101);await move(round.ingredients[index].x,round.ingredients[index].y,round.ingredients[index].z);
    assert.equal((await post(f,'/api/action',host.ticket,{type:'pick-ingredient',index})).status,200);
    f.advance(101);await move(round.cake.x,round.cake.y,round.cake.z);
    assert.equal((await post(f,'/api/action',host.ticket,{type:'deliver-ingredient'})).status,200);
  }
  assert.deepEqual((await get()).party.selfProgress.delivered,[0,1,2]);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'pick-ingredient',index:0})).status,400);

  await start('starlight-memory');
  const sequence = (await get()).party.round.sequence; f.advance(4000);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'submit-sequence', sequence })).status, 200);
  assert.equal((await get()).party.selfProgress.sequenceDone, true);

  await start('starlight-statues');
  const priorScore = (await get()).party.scores[host.self.id];
  const p = f.server.partyInternals.positions.get(host.self.id); f.advance(101); await move(p.x + 4, p.y, p.z);
  f.advance(6100); assert.equal((await get()).party.selfProgress.statueStatus, 'red'); await move(p.x + 4, p.y, p.z);
  f.advance(4000); await move(p.x + 4, p.y, p.z);
  assert.equal((await get()).party.scores[host.self.id], priorScore + 1);
});

test('signaling between hidden guest and companion is denied', async t => {
  const f = await fixture(); t.after(f.close);
  const guest = (await join(f, f.config.slots[4])).json(); const companion = (await join(f, f.config.slots[1])).json();
  const res = await post(f, '/api/signal', guest.ticket, { to: companion.self.id, kind: 'description', payload: { type: 'offer', sdp: 'opaque' } });
  assert.equal(res.status, 403);
});

test('voice configuration requires a session and returns only validated ICE entries', async t => {
  const f = await fixture(); t.after(f.close);
  assert.equal((await request(f, 'GET', '/api/voice-config?ticket=bad')).status, 401);
  const birthday = (await join(f, f.config.slots[0])).json();
  assert.deepEqual((await request(f, 'GET', `/api/voice-config?ticket=${birthday.ticket}`)).json(), { iceServers: [] });
  assert.throws(() => createPartyServer({ config: { ...makeDefaultConfig(), voice: { iceServers: [{ urls: 'https://example.invalid' }] } } }), /ICE server URL/);
});

test('birthday photo variants stay private and listings omit image data', async t => {
  const f = await fixture(); t.after(f.close);
  const birthday = (await join(f, f.config.slots[0])).json(); const guest = (await join(f, f.config.slots[4])).json();
  const image = b64 => `data:image/jpeg;base64,${b64}`;
  const pub = image(Buffer.from([0xff, 0xd8, 1, 0xff, 0xd9]).toString('base64'));
  const priv = image(Buffer.from([0xff, 0xd8, 2, 0xff, 0xd9]).toString('base64'));
  const upload = await post(f, '/api/photo', birthday.ticket, { publicImage: pub, privateImage: priv, caption: 'A wish' });
  assert.equal(upload.status, 201); const id = upload.json().id;
  const listing = await request(f, 'GET', `/api/photos?ticket=${guest.ticket}`);
  assert.deepEqual(Object.keys(listing.json().photos[0]).sort(), ['caption', 'createdAt', 'id']);
  const guestImage = await request(f, 'GET', `/api/photo/${id}?ticket=${guest.ticket}`);
  const birthdayImage = await request(f, 'GET', `/api/photo/${id}?ticket=${birthday.ticket}`);
  assert.deepEqual([...guestImage.body], [0xff, 0xd8, 1, 0xff, 0xd9]);
  assert.deepEqual([...birthdayImage.body], [0xff, 0xd8, 2, 0xff, 0xd9]);
});

test('static server serves dist and blocks traversal to sibling files', async t => {
  const f = await fixture(); t.after(f.close);
  await fs.symlink(path.join(f.tmp, 'private.json'), path.join(f.tmp, 'dist', 'link.json'));
  assert.match((await request(f, 'GET', '/')).text(), /party/);
  const traversal = await request(f, 'GET', '/%2e%2e%2fprivate.json');
  assert.equal(traversal.status, 404);
  assert.doesNotMatch(traversal.text(), /secret/);
  assert.equal((await request(f, 'GET', '/link.json')).status, 404);
});

test('fourteen event streams carry movement while guest frames omit private players', async t => {
  const f = await fixture(); t.after(f.close);
  const clients = [];
  for (const slot of f.config.slots) clients.push({ slot, ...(await join(f, slot)).json() });
  const streams = [];
  for (const client of clients) {
    const req = new EventEmitter(); req.method = 'GET'; req.url = `/api/events?ticket=${client.ticket}`; req.headers = {};
    const res = new EventEmitter(); res.frames = []; res.headersSent = false; res.destroyed = false; res.writableEnded = false;
    res.setHeader = () => {}; res.writeHead = () => { res.headersSent = true; };
    res.write = frame => { res.frames.push(frame); return true; };
    res.end = () => { res.writableEnded = true; res.emit('close'); };
    await f.server.partyInternals.handler(req, res); streams.push(res);
  }
  t.after(() => { streams.forEach(s => s.end()); f.server.emit('close'); });
  for (let frame = 0; frame < 5; frame++) {
    f.advance(150);
    await Promise.all(clients.map((client,index) => post(f, '/api/move', client.ticket, { x: index * 3, y: 0, z: 60 - frame, yaw: 0 }).then(r => assert.equal(r.status, 200))));
    await new Promise(resolve => setTimeout(resolve, 115));
  }
  const hidden = clients.filter(c => c.slot.role === 'companion').map(c => c.self.id);
  for (let i = 0; i < streams.length; i++) {
    assert.ok(streams[i].frames.length >= 5, 'Every connected slot receives coalesced state updates.');
    const last = JSON.parse(streams[i].frames.at(-1).match(/data: (.+)\n/)[1]);
    assert.equal(last.players.length, clients[i].slot.role === 'birthday' ? 14 : clients[i].slot.role === 'companion' ? 12 : 11);
    if (clients[i].slot.role === 'guest') {
      for (const id of hidden) assert.ok(!JSON.stringify(last).includes(id), 'A guest stream must contain no hidden identity.');
    }
  }
});

test('tag keeps companion practice targets, activity, and scores out of the public match', async t => {
  const f = await fixture(); t.after(() => { f.server.emit('close'); return f.close(); });
  const joined = [];
  for (const slot of f.config.slots) joined.push((await join(f, slot)).json());
  const host=joined[0], companion=joined[1], guest=joined[4], other=joined[5];
  assert.equal((await post(f,'/api/action',host.ticket,{type:'start-game',game:'tag'})).status,200);
  const active=f.server.partyInternals.getActive();active.chase.itId=guest.self.id;f.advance(1600);
  const positions=f.server.partyInternals.positions;positions.set(guest.self.id,{x:0,y:0,z:-30});positions.set(other.self.id,{x:2,y:0,z:-30});positions.set(companion.self.id,{x:1,y:0,z:-30});
  assert.equal((await post(f,'/api/action',guest.ticket,{type:'tag',targetId:companion.self.id})).status,400);
  assert.equal((await post(f,'/api/action',guest.ticket,{type:'tag',targetId:other.self.id})).status,200);
  const practice=active.practices.get(companion.self.id),wisp=practice.bots[0];practice.positions.set(wisp.id,{x:2.8,y:0,z:-30});
  assert.equal((await post(f,'/api/action',companion.ticket,{type:'tag',targetId:wisp.id})).status,200);
  assert.equal(active.chase.itId,other.self.id);
  const publicState=(await state(f,guest.ticket)).json();
  for(const privateSlot of joined.slice(1,4))assert.ok(!JSON.stringify(publicState).includes(privateSlot.self.id));
  assert.ok(!JSON.stringify(publicState).includes(wisp.id));assert.equal(publicState.party.scores[guest.self.id],1);
  assert.equal((await state(f,companion.ticket)).json().party.scores[companion.self.id],1);
  const birthdayState=(await state(f,host.ticket)).json();assert.ok(birthdayState.party.privatePractices.some(p=>p.ownerId===companion.self.id));
});

test('hide-and-seek conceals hider positions, keeps voice peers, and enforces the countdown', async t => {
  const f=await fixture();t.after(()=>{f.server.emit('close');return f.close();});
  const host=(await join(f,f.config.slots[0])).json(),guest=(await join(f,f.config.slots[4])).json();
  await post(f,'/api/action',host.ticket,{type:'start-game',game:'hide-and-seek'});
  const positions=f.server.partyInternals.positions;positions.set(host.self.id,{x:0,y:0,z:-30});positions.set(guest.self.id,{x:40,y:0,z:0});
  let view=(await state(f,host.ticket)).json();assert.ok(!view.players.some(p=>p.id===guest.self.id));
  const peer=view.voicePeers.find(p=>p.id===guest.self.id);assert.ok(peer);assert.equal('x'in peer,false);assert.equal('z'in peer,false);
  f.advance(101);assert.equal((await post(f,'/api/move',host.ticket,{x:1,y:0,z:-30})).status,400);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'seek',targetId:guest.self.id})).status,400);
  f.advance(20000);positions.set(guest.self.id,{x:2,y:0,z:-30});view=(await state(f,host.ticket)).json();assert.ok(view.players.some(p=>p.id===guest.self.id));
  assert.equal((await post(f,'/api/action',host.ticket,{type:'seek',targetId:guest.self.id})).status,200);
  f.server.partyInternals.tickRoom();assert.equal((await state(f,host.ticket)).json().party.phase,'lobby');
});

test('laser hits ignore invisible companions and resting players cannot fire or move', async t => {
  const f=await fixture();t.after(()=>{f.server.emit('close');return f.close();});
  const host=(await join(f,f.config.slots[0])).json(),companion=(await join(f,f.config.slots[1])).json(),guest=(await join(f,f.config.slots[4])).json();
  await post(f,'/api/action',host.ticket,{type:'start-game',game:'laser-tag'});
  const positions=f.server.partyInternals.positions;positions.set(host.self.id,{x:0,y:0,z:-30});positions.set(companion.self.id,{x:0,y:0,z:-25});positions.set(guest.self.id,{x:0,y:0,z:-20});
  const result=await post(f,'/api/action',host.ticket,{type:'laser',direction:{x:0,y:0,z:1}});assert.equal(result.status,200);assert.equal(result.json().events[0].to,guest.self.id);
  const active=f.server.partyInternals.getActive();assert.equal(active.chase.status.get(guest.self.id).health,2);assert.equal(active.chase.status.has(companion.self.id),false);
  const rest=active.chase.status.get(host.self.id);rest.health=0;rest.restUntil=Date.now()+60000;
  f.advance(701);assert.equal((await post(f,'/api/action',host.ticket,{type:'laser',direction:{x:0,y:0,z:1}})).status,400);
  assert.equal((await post(f,'/api/move',host.ticket,{x:1,y:0,z:-30})).status,400);
  const image=`data:image/jpeg;base64,${Buffer.from([0xff,0xd8,1,0xff,0xd9]).toString('base64')}`;
  assert.equal((await post(f,'/api/photo',companion.ticket,{publicImage:image})).status,403);
});

test('twenty-land story is cooperative, rejects stale actions, and isolates companion progress', async t => {
  const f=await fixture();t.after(()=>{f.server.emit('close');return f.close();});
  const host=(await join(f,f.config.slots[0])).json(),companion=(await join(f,f.config.slots[1])).json(),guest=(await join(f,f.config.slots[4])).json();
  assert.equal((await post(f,'/api/action',guest.ticket,{type:'start-journey'})).status,403);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'start-journey'})).status,200);
  const positions=f.server.partyInternals.positions;
  async function light(client,chapter){positions.set(client.self.id,chapter.beacon);for(let answer=0;answer<3;answer++){const r=await post(f,'/api/action',client.ticket,{type:'journey-light',chapterId:chapter.id,answer});if(r.status===200)return;assert.equal(r.status,400);}assert.fail('A chapter must have one correct choice.');}
  let chapter=(await state(f,host.ticket)).json().party.journey.current;
  positions.set(companion.self.id,chapter.collect);await post(f,'/api/action',companion.ticket,{type:'journey-collect',chapterId:chapter.id});await light(companion,chapter);
  assert.equal((await state(f,companion.ticket)).json().party.journey.waiting,true);assert.equal((await state(f,guest.ticket)).json().party.journey.stars,0);
  for(let i=0;i<20;i++){
    const trail=(await state(f,host.ticket)).json().party.journey;chapter=trail.current;assert.equal(trail.chapter,i);assert.equal('answer'in chapter.puzzle,false);
    assert.equal((await post(f,'/api/action',host.ticket,{type:'journey-collect',chapterId:'stale-id'})).status,409);
    positions.set(host.self.id,chapter.collect);assert.equal((await post(f,'/api/action',host.ticket,{type:'journey-collect',chapterId:chapter.id})).status,200);
    assert.equal((await state(f,guest.ticket)).json().party.journey.stage,'beacon');await light(guest,chapter);
  }
  const complete=(await state(f,host.ticket)).json().party.journey;assert.equal(complete.complete,true);assert.equal(complete.stars,20);assert.equal(new Set(complete.completed).size,20);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'journey-finale'})).status,200);f.advance(5001);f.server.partyInternals.tickRoom();
  assert.equal((await state(f,guest.ticket)).json().party.phase,'celebration');
  for(const player of [host,companion,guest]){
    const cakeArrival=positions.get(player.self.id);
    assert.equal(cakeArrival.y,CAKE_SPOT.y);assert.ok(Math.hypot(cakeArrival.x-CAKE_SPOT.x,cakeArrival.z-CAKE_SPOT.z)<20);
  }
});

test('fusion and registered outfits persist while public rides stay private to each recipient projection', async t => {
  const f=await fixture({autoTick:false});t.after(f.close);
  const host=(await join(f,f.config.slots[0])).json(),companion=(await join(f,f.config.slots[1])).json(),guest=(await join(f,f.config.slots[4])).json();
  assert.equal((await post(f,'/api/action',host.ticket,{type:'outfit',avatar:'g-star'})).status,200);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'outfit',avatar:'fx-g-0'})).status,200);
  for(const avatar of ['fx-x-0','fx-g-1000','fx-g-','fx--0'])assert.equal((await post(f,'/api/action',host.ticket,{type:'outfit',avatar})).status,400,avatar);
  assert.equal((await state(f,host.ticket)).json().self.avatar,'fx-g-0');

  const positions=f.server.partyInternals.positions;
  let p=positions.get(host.self.id);assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'van'})).status,200);
  f.advance(101);p=positions.get(companion.self.id);assert.equal((await post(f,'/api/move',companion.ticket,{...p,vehicle:'dragon'})).status,200);
  const publicState=(await state(f,guest.ticket)).json();
  assert.equal(publicState.party.presenceCount,2);
  const visibleHost=publicState.players.find(player=>player.id===host.self.id);
  assert.equal(visibleHost.avatar,'fx-g-0');assert.equal(visibleHost.vehicle,'van');
  assert.ok(!JSON.stringify(publicState).includes(companion.self.id));
  const privateState=(await state(f,companion.ticket)).json();
  assert.equal(privateState.players.find(player=>player.id===companion.self.id).vehicle,'dragon');
});

test('invalid rides are rejected; bridge and chase rounds require walking; snapshot keeps ride and fusion look', async t => {
  const f=await fixture({autoTick:false});t.after(f.close);
  const host=(await join(f,f.config.slots[0])).json(),guest=(await join(f,f.config.slots[4])).json();
  const positions=f.server.partyInternals.positions;
  let p=positions.get(host.self.id);
  assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'hoverboard'})).status,400);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'outfit',avatar:'fx-b-1'})).status,200);
  assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'plane'})).status,200);
  assert.equal((await post(f,'/api/action',host.ticket,{type:'start-game',game:'bridge-dash'})).status,200);
  p=positions.get(host.self.id);
  assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'car'})).status,400);
  assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'walk'})).status,200);
  const snapshot=f.server.partyInternals.exportSnapshot();
  const restored=createPartyServer({config:f.config,now:f.current,autoTick:false,serverFactory:()=>({on(){}}),snapshot});
  t.after(()=>restored.emit?.('close'));
  const restoredHost=(await state({server:restored},host.ticket)).json();
  assert.equal(restoredHost.self.avatar,'fx-b-1');
  assert.equal(restoredHost.players.find(player=>player.id===host.self.id).vehicle,'walk');
  const restoredGuest=(await state({server:restored},guest.ticket)).json();
  assert.equal(restoredGuest.players.find(player=>player.id===host.self.id).avatar,'fx-b-1');

  assert.equal((await post(f,'/api/action',host.ticket,{type:'start-game',game:'tag'})).status,200);
  p=positions.get(host.self.id);f.advance(101);
  assert.equal((await post(f,'/api/move',host.ticket,{...p,vehicle:'unicorn'})).status,400);
});

test('observers cannot change appearance or ride position, and observer vehicles are rejected by projection', async t => {
  const f=await fixture({observer:true,autoTick:false});t.after(f.close);
  const host=(await join(f,f.config.slots[0])).json(),guest=(await join(f,f.config.slots[4])).json(),observer=(await join(f,f.config.slots.at(-1))).json();
  const position=f.server.partyInternals.positions.get(observer.self.id);
  assert.equal((await post(f,'/api/action',observer.ticket,{type:'outfit',avatar:'fx-g-0'})).status,403);
  assert.equal((await post(f,'/api/move',observer.ticket,{...position,vehicle:'van'})).status,403);
  assert.equal((await state(f,guest.ticket)).json().party.presenceCount,2);
  const publicState=(await state(f,guest.ticket)).json();assert.ok(!JSON.stringify(publicState).includes(observer.self.id));
  assert.equal((await state(f,host.ticket)).json().players.some(player=>player.id===observer.self.id),true);
});
