import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createPartyServer, makeDefaultConfig, SKY_RINGS, BRIDGE_CHECKPOINTS } from './party.mjs';

async function fixture() {
  const config = makeDefaultConfig();
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-party-'));
  const distDir = path.join(tmp, 'dist'); await fs.mkdir(distDir);
  await fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><h1>party</h1>');
  await fs.writeFile(path.join(tmp, 'private.json'), '{"secret":true}');
  let time = Date.now(); const server = createPartyServer({ config, distDir, now: () => time });
  return { config, tmp, server, advance: ms => { time += ms; }, close: async () => { await fs.rm(tmp, { recursive: true, force: true }); } };
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
  assert.throws(() => createPartyServer({ config: { slots: [...f.config.slots, { ...slot, id: 'extra', token: 'x'.repeat(32) }] } }), /1 to 14/);
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
  assert.equal((await move(100, 0, -100)).status, 400);

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
  f.advance(101); await move(round.ingredients[0].x, 0, round.ingredients[0].z);
  assert.equal((await post(f, '/api/action', host.ticket, { type: 'pick-ingredient', index: 0 })).status, 400);

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
