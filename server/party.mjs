import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MAX_BODY = 32 * 1024;
const SESSION_MS = 30 * 60 * 1000;
const WORLD = { x: [-1800, 1800], y: [-30, 800], z: [-1100, 1800] };
const GAMES = new Set(['lantern-hunt', 'bridge-dash', 'starlight-memory', 'sky-rings', 'cake-courier', 'starlight-statues']);
export const SPAWN = Object.freeze({ x: 0, y: 0, z: 70 });
export const LANTERN_PICKUPS = Object.freeze([
  [-70, 0, 75], [-35, 0, 75], [0, 0, 75], [35, 0, 75], [70, 0, 75],
  [-70, 0, 20], [-35, 0, 20], [0, 0, 20], [35, 0, 20], [70, 0, 20],
  [-45, 0, -35], [45, 0, -35],
].map(([x, y, z], i) => Object.freeze({ id: `lantern-${i + 1}`, x, y, z })));
export const BRIDGE_CHECKPOINTS = Object.freeze([
  [-210], [-270], [-340], [-405], [-448],
].map(([z]) => Object.freeze({ x: 0, y: 0, z })));
export const SKY_RINGS = Object.freeze([[-80, 18, 40], [-40, 28, -40], [40, 38, -110], [65, 48, -240], [0, 54, -430]].map(([x, y, z]) => Object.freeze({ x, y, z })));
export const INGREDIENTS = Object.freeze([[-65, 0, 25], [65, 0, 25], [0, 0, -100]].map(([x, y, z]) => Object.freeze({ x, y, z })));
export const CAKE_SPOT = Object.freeze({ x: 0, y: 46.72, z: -448 });

const token = () => randomBytes(32).toString('base64url');
const cleanLabel = (s, max = 36) => typeof s === 'string' ? s.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, max) : '';

export function makeDefaultConfig() {
  const slots = [{ id: randomUUID(), role: 'birthday', name: 'Birthday', avatar: 'g-birthday', token: token() }];
  for (let i = 1; i <= 3; i++) slots.push({ id: randomUUID(), role: 'companion', name: `Companion ${i}`, avatar: 'g-traveler', token: token() });
  for (let i = 1; i <= 10; i++) slots.push({ id: randomUUID(), role: 'guest', name: `Guest ${i}`, avatar: 'g-traveler', token: token() });
  return { slots };
}

function validateConfig(config) {
  if (!config || !Array.isArray(config.slots) || config.slots.length < 1 || config.slots.length > 14) throw new Error('Config must contain 1 to 14 invitation slots.');
  const ids = new Set(); const tokens = new Set(); let birthdayCount = 0;
  const slots = config.slots.map((s, i) => {
    if (!s || !['birthday', 'companion', 'guest'].includes(s.role)) throw new Error(`Invalid role in slot ${i + 1}.`);
    if (s.role === 'birthday') birthdayCount++;
    if (typeof s.token !== 'string' || s.token.length < 32 || tokens.has(s.token)) throw new Error(`Invalid or duplicate invite token in slot ${i + 1}.`);
    tokens.add(s.token);
    const id = typeof s.id === 'string' && s.id.length <= 48 ? s.id : randomUUID();
    if (ids.has(id)) throw new Error('Duplicate slot id.'); ids.add(id);
    const name = cleanLabel(s.name); const avatar = cleanLabel(s.avatar, 48);
    if (!name || !avatar) throw new Error(`Slot ${i + 1} needs a public name and avatar id.`);
    return { id, role: s.role, name, avatar, token: s.token };
  });
  if (birthdayCount !== 1) throw new Error('Config must have exactly one birthday slot.');
  let celebrationStart = null;
  if (config.celebrationStart !== undefined && config.celebrationStart !== null) {
    if (typeof config.celebrationStart !== 'string' || !config.celebrationStart.endsWith('Z') || !Number.isFinite(Date.parse(config.celebrationStart))) throw new Error('celebrationStart must be an ISO UTC timestamp ending in Z.');
    celebrationStart = Date.parse(config.celebrationStart);
  }
  const voiceServers = config.voice?.iceServers ?? [];
  if (!Array.isArray(voiceServers) || voiceServers.length > 8) throw new Error('voice.iceServers must be an array of at most 8 entries.');
  const iceServers = voiceServers.map(server => {
    const urls = server?.urls;
    const list = Array.isArray(urls) ? urls : [urls];
    if (!list.length || list.length > 8 || list.some(u => typeof u !== 'string' || u.length > 256 || !/^(stun|stuns|turn|turns):/i.test(u))) throw new Error('Invalid ICE server URL.');
    if (server.username !== undefined && (typeof server.username !== 'string' || server.username.length > 256)) throw new Error('Invalid ICE server username.');
    const credential = server.credential;
    if (credential !== undefined && (typeof credential !== 'string' || credential.length > 512)) throw new Error('Invalid ICE server credential.');
    return { urls: Array.isArray(urls) ? urls.slice() : urls, ...(server.username ? { username: server.username } : {}), ...(credential ? { credential } : {}) };
  });
  return { slots, celebrationStart, iceServers };
}

const gameSpec = (name, now) => {
  if (name === 'lantern-hunt') return { phase: 'playing', game: name, endsAt: now + 90_000, items: LANTERN_PICKUPS.map(x => ({ ...x, found: false })) };
  if (name === 'bridge-dash') return { phase: 'playing', game: name, endsAt: now + 75_000, checkpoints: BRIDGE_CHECKPOINTS };
  if (name === 'starlight-memory') return { phase: 'playing', game: name, endsAt: now + 60_000, sequence: Array.from({ length: 5 }, () => randomBytes(1)[0] % 6), startedAt: now };
  if (name === 'sky-rings') return { phase: 'playing', game: name, endsAt: now + 120_000, checkpoints: SKY_RINGS };
  if (name === 'cake-courier') return { phase: 'playing', game: name, endsAt: now + 150_000, ingredients: INGREDIENTS, cake: CAKE_SPOT };
  if (name === 'starlight-statues') return { phase: 'playing', game: name, endsAt: now + 60_000, startedAt: now };
  return null;
};

export function createPartyServer({ config, distDir = path.join(ROOT, 'dist'), now = Date.now, sessionMs = SESSION_MS } = {}) {
  const validated = validateConfig(config); const slots = validated.slots;
  const inviteByToken = new Map(slots.map(s => [s.token, s]));
  const sessionsBySlot = new Map(); const sessionsByTicket = new Map(); const streams = new Map();
  const positions = new Map(); const moveTimes = new Map(); const scores = { birthday: {}, guest: {}, companion: {} };
  const signalQueues = new Map(); const signalTimes = new Map(); const photos = [];
  let party = { phase: 'lobby', game: null, endsAt: null, celebrationAt: null };
  let active = null; let wishes = []; let rallyAt = null; let dirty = false; let scheduledCelebration = validated.celebrationStart;
  const coord = () => ({ ...SPAWN, yaw: 0 });
  const initialPosition = slot => {
    if (slot.role === 'birthday') return { ...SPAWN, yaw: 0 };
    if (slot.role === 'companion') {
      const n = [...sessionsBySlot.values()].filter(s => s.slot.role === 'companion').length;
      return { x: -10 + ((n - 1) % 3) * 3, y: 0, z: 68 - Math.floor((n - 1) / 3) * 3, yaw: 0 };
    }
    const n = [...sessionsBySlot.values()].filter(s => s.slot.role === 'guest').length;
    return { x: (n % 5) * 3 - 6, y: 0, z: 64 - Math.floor(n / 5) * 3, yaw: 0 };
  };
  const validSession = req => {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    const s = m && sessionsByTicket.get(m[1]);
    if (!s || s.expiresAt <= now() || sessionsBySlot.get(s.slot.id) !== s) return null;
    s.lastSeen = now(); s.expiresAt = now() + sessionMs; return s;
  };
  const sessionFromTicket = t => {
    const s = sessionsByTicket.get(t);
    if (!s || s.expiresAt <= now() || sessionsBySlot.get(s.slot.id) !== s) return null;
    s.lastSeen = now(); s.expiresAt = now() + sessionMs; return s;
  };
  const maySee = (viewer, target) => viewer.id === target.id || viewer.role === 'birthday' || (viewer.role === 'companion' && (target.role === 'birthday' || target.role === 'guest') || viewer.role === 'guest' && (target.role === 'guest' || target.role === 'birthday'));
  const publicScores = viewer => {
    const visible = viewer.role === 'birthday' ? ['birthday', 'guest', 'companion'] : ['guest'];
    const out = {};
    for (const role of visible) for (const [id, score] of Object.entries(scores[role])) out[id] = score;
    if (viewer.role === 'companion' && scores.companion[viewer.id] !== undefined) out[viewer.id] = scores.companion[viewer.id];
    return out;
  };
  const stateFor = session => {
    const viewer = session.slot;
    const players = [...sessionsBySlot.values()].filter(s => maySee(viewer, s.slot)).map(s => ({ id: s.slot.id, name: s.slot.name, isBirthday: s.slot.role === 'birthday', role: viewer.role === 'birthday' ? s.slot.role : undefined, avatar: s.slot.avatar, ...(positions.get(s.slot.id) || coord()) }));
    const signals = (signalQueues.get(viewer.id) || []).slice(-256);
    const visibleWishes = wishes.filter(x => viewer.role === 'birthday' || x.from === viewer.id).map(x => viewer.role === 'birthday' ? ({ fromRole: x.role, text: x.text }) : ({ text: x.text }));
    let round = null;
    if (active) {
      if (active.game === 'lantern-hunt') round = { items: active.items.map(it => ({ ...it, found: it.found || (active.privateFound?.get(viewer.id) || []).includes(it.id) })) };
      else if (active.game === 'bridge-dash' || active.game === 'sky-rings') round = { checkpoints: active.checkpoints };
      else if (active.game === 'starlight-memory') round = { sequence: active.sequence, startedAt: active.startedAt };
      else if (active.game === 'cake-courier') round = { ingredients: active.ingredients, cake: active.cake };
      else if (active.game === 'starlight-statues') round = { startedAt: active.startedAt };
    }
    const stat = active?.statues?.get(viewer.id) || {};
    const statueStatus = active?.game === 'starlight-statues' ? ((now() - active.startedAt) % 10_000 < 6000 ? 'green' : 'red') : (stat.status || 'green');
    const selfProgress = { checkpoint: active?.progress?.get(viewer.id) || 0, carrying: active?.carrying?.get(viewer.id) ?? null, delivered: active?.delivered?.get(viewer.id) || [], sequenceDone: !!active?.completed?.has(viewer.id), statueRound: stat.round || 0, statueStatus };
    return { type: 'state', self: { id: viewer.id, name: viewer.name, role: viewer.role, avatar: viewer.avatar }, players, party: { ...party, rallyAt, round, scores: publicScores(viewer), selfProgress }, signals, wishes: visibleWishes };
  };
  const writeJSON = (res, status, obj) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const broadcast = () => { dirty = true; };
  const flushBroadcast = () => {
    if (!dirty) return; dirty = false;
    for (const [ticket, res] of streams) {
      const s = sessionFromTicket(ticket);
      if (!s || res.destroyed || res.writableEnded) { streams.delete(ticket); continue; }
      res.write(`event: state\ndata: ${JSON.stringify(stateFor(s))}\n\n`);
    }
  };
  const readJSON = (req, limit = MAX_BODY) => new Promise((resolve, reject) => {
    let data = ''; req.on('data', c => { data += c; if (Buffer.byteLength(data) > limit) { reject(Object.assign(new Error('Request body too large.'), { status: 413 })); req.destroy?.(); } });
    req.on('end', () => { try { const value = data ? JSON.parse(data) : {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); resolve(value); } catch { reject(Object.assign(new Error('Expected a JSON object.'), { status: 400 })); } });
    req.on('error', reject);
  });
  const fail = (res, status, message) => writeJSON(res, status, { error: message });
  const handler = async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('x-frame-options', 'DENY'); res.setHeader('referrer-policy', 'no-referrer'); res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'");
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') return writeJSON(res, 200, { ok: true });
      if (req.method === 'POST' && url.pathname === '/api/join') {
        const body = await readJSON(req); const slot = inviteByToken.get(String(body.token || ''));
        if (!slot) return fail(res, 401, 'Invalid invitation.');
        const existing = sessionsBySlot.get(slot.id);
        if (existing) { const old = streams.get(existing.ticket); if (old) { old.end(); streams.delete(existing.ticket); } sessionsByTicket.delete(existing.ticket); }
        const ticket = token(); const session = { slot, ticket, expiresAt: now() + sessionMs, lastSeen: now() };
        sessionsBySlot.set(slot.id, session); sessionsByTicket.set(ticket, session); if (!positions.has(slot.id)) positions.set(slot.id, initialPosition(slot));
        broadcast(); return writeJSON(res, 200, { ticket, expiresAt: session.expiresAt, self: { id: slot.id, name: slot.name, role: slot.role, avatar: slot.avatar } });
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const s = sessionFromTicket(url.searchParams.get('ticket')); if (!s) return fail(res, 401, 'Session expired.');
        s.lastSeen = now(); s.expiresAt = now() + sessionMs; return writeJSON(res, 200, stateFor(s));
      }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        const s = sessionFromTicket(url.searchParams.get('ticket')); if (!s) return fail(res, 401, 'Session expired.');
        const old = streams.get(s.ticket); if (old) old.end();
        s.lastSeen = now(); s.expiresAt = now() + sessionMs; res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        streams.set(s.ticket, res); res.write(`event: state\ndata: ${JSON.stringify(stateFor(s))}\n\n`); res.on('close', () => { if (streams.get(s.ticket) === res) streams.delete(s.ticket); }); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/photos') {
        const session = sessionFromTicket(url.searchParams.get('ticket')); if (!session) return fail(res, 401, 'Session expired.');
        return writeJSON(res, 200, { photos: photos.map(p => ({ id: p.id, caption: p.caption, createdAt: p.createdAt })) });
      }
      if (req.method === 'GET' && url.pathname === '/api/voice-config') {
        const session = sessionFromTicket(url.searchParams.get('ticket')); if (!session) return fail(res, 401, 'Session expired.');
        return writeJSON(res, 200, { iceServers: validated.iceServers });
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/photo/')) {
        const session = sessionFromTicket(url.searchParams.get('ticket')); if (!session) return fail(res, 401, 'Session expired.');
        const photo = photos.find(p => p.id === url.pathname.slice('/api/photo/'.length)); if (!photo) return fail(res, 404, 'Photo not found.');
        const bytes = session.slot.role === 'birthday' && photo.privateImage ? photo.privateImage : photo.publicImage;
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': bytes.length, 'cache-control': 'private, no-store' }); return res.end(bytes);
      }
      if (['/api/move', '/api/action', '/api/signal', '/api/photo'].includes(url.pathname) && req.method === 'POST') {
        const session = validSession(req); if (!session) return fail(res, 401, 'Session expired.'); const body = await readJSON(req, url.pathname === '/api/photo' ? 1024 * 1024 : MAX_BODY); const slot = session.slot;
        if (url.pathname === '/api/photo') {
          const decodeJPEG = value => {
            if (typeof value !== 'string' || !value.startsWith('data:image/jpeg;base64,') || value.length > 700_000) return null;
            const encoded = value.slice('data:image/jpeg;base64,'.length); if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null;
            const b = Buffer.from(encoded, 'base64'); return b.length <= 512 * 1024 && b[0] === 0xff && b[1] === 0xd8 ? b : null;
          };
          const publicImage = decodeJPEG(body.publicImage); const privateImage = slot.role === 'birthday' ? decodeJPEG(body.privateImage) : null;
          if (!publicImage || (body.privateImage !== undefined && slot.role === 'birthday' && !privateImage)) return fail(res, 400, 'Invalid JPEG image.');
          if (photos.length >= 28) photos.shift();
          const photo = { id: randomUUID(), caption: cleanLabel(body.caption, 100), createdAt: now(), publicImage, privateImage };
          photos.push(photo); broadcast(); return writeJSON(res, 201, { id: photo.id });
        }
        if (url.pathname === '/api/move') {
          const t = now(); if (t - (moveTimes.get(slot.id) || -Infinity) < 100) return fail(res, 429, 'Movement is limited to 10 updates per second.');
          const { x, y, z, yaw = 0 } = body; if (![x, y, z, yaw].every(Number.isFinite) || x < WORLD.x[0] || x > WORLD.x[1] || y < WORLD.y[0] || y > WORLD.y[1] || z < WORLD.z[0] || z > WORLD.z[1] || Math.abs(yaw) > Math.PI * 20) return fail(res, 400, 'Invalid position.');
          if (party.game === 'bridge-dash') {
            const previous = positions.get(slot.id) || coord(); const dt = Math.max(0.1, Math.min(1, (t - (moveTimes.get(slot.id) || t - 1000)) / 1000));
            if (Math.hypot(x - previous.x, z - previous.z) > 16 * dt + 4) return fail(res, 400, 'Movement exceeds the race speed limit.');
          }
          if (party.game === 'starlight-statues' && active) {
            const before = positions.get(slot.id) || coord(); const stats = active.statues.get(slot.id) || { round: 0, status: 'green', greenDistance: 0, redDistance: 0, scored: 0 };
            const cycle = Math.floor((t - active.startedAt) / 10_000); const elapsed = (t - active.startedAt) % 10_000; const dist = Math.hypot(x - before.x, z - before.z);
            if (cycle > stats.round) { if (stats.greenDistance > 3 && stats.redDistance <= 0.6 && stats.scored < cycle) { scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 1; stats.scored = cycle; } stats.round = cycle; stats.greenDistance = 0; stats.redDistance = 0; }
            if (elapsed < 6000) stats.greenDistance += dist; else stats.redDistance += dist;
            stats.status = elapsed < 6000 ? 'green' : 'red'; active.statues.set(slot.id, stats);
          }
          positions.set(slot.id, { x, y, z, yaw }); moveTimes.set(slot.id, t); broadcast(); return writeJSON(res, 200, { ok: true });
        }
        if (url.pathname === '/api/signal') {
          const peer = sessionsBySlot.get(String(body.to || '')); if (!peer || !maySee(slot, peer.slot) || !maySee(peer.slot, slot)) return fail(res, 403, 'Peer is not visible to both participants.');
          const kind = body.kind === 'candidate' ? 'candidate' : body.kind === 'description' ? 'description' : '';
          const payload = body.payload;
          const valid = kind === 'description' ? payload && ['offer', 'answer'].includes(payload.type) && typeof payload.sdp === 'string' && payload.sdp.length <= 12_000 : payload && typeof payload.candidate === 'string' && payload.candidate.length <= 2_000 && (payload.sdpMid === null || typeof payload.sdpMid === 'string' || payload.sdpMid === undefined);
          if (!kind || !valid) return fail(res, 400, 'Invalid signal.');
          const t = now(); const times = (signalTimes.get(slot.id) || []).filter(x => t - x < 60_000); if (times.length >= 512) return fail(res, 429, 'Signaling rate limit exceeded.'); times.push(t); signalTimes.set(slot.id, times);
          const queue = signalQueues.get(peer.slot.id) || []; queue.push({ id: randomUUID(), from: slot.id, kind, payload }); signalQueues.set(peer.slot.id, queue.slice(-256)); broadcast(); return writeJSON(res, 200, { ok: true });
        }
        if (url.pathname === '/api/action') {
          const type = body.type; const canHost = slot.role === 'birthday' || slot.role === 'companion';
          if (type === 'start-game') {
            if (!canHost || !GAMES.has(body.game)) return fail(res, 403, 'Game cannot be started by this player.');
            active = gameSpec(body.game, now()); active.progress = new Map(); active.completed = new Set(); active.privateFound = new Map(); active.carrying = new Map(); active.delivered = new Map(); active.collected = new Map(); active.statues = new Map(); rallyAt = null;
            [...sessionsBySlot.values()].forEach((s, i) => {
              const place = body.game === 'bridge-dash' ? { x: i % 2 ? 1.1 : -1.1, y: 0, z: -178 + Math.floor(i / 2) * 2.5, yaw: 0 } : { x: (i % 7) * 2 - 6, y: 0, z: 70 - Math.floor(i / 7) * 3, yaw: 0 };
              positions.set(s.slot.id, place); moveTimes.set(s.slot.id, now() - 100);
            });
            party = { phase: active.phase, game: body.game, endsAt: active.endsAt, celebrationAt: null }; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'outfit') {
            if (typeof body.avatar !== 'string' || !/^[gb]-[a-z0-9-]{1,42}$/.test(body.avatar)) return fail(res, 400, 'Invalid outfit id.');
            slot.avatar = body.avatar; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'celebrate') {
            if (!canHost) return fail(res, 403, 'Only a host can start the celebration.');
            active = null; party = { phase: 'celebration', game: null, endsAt: null, celebrationAt: now() }; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'rally') {
            if (!canHost) return fail(res, 403, 'Only a host can call the rally.');
            active = null; party = { phase: 'rally', game: null, endsAt: null, celebrationAt: null }; rallyAt = now() + 5000; broadcast(); return writeJSON(res, 200, { ok: true, rallyAt });
          }
          if (type === 'wish') {
            const text = cleanLabel(body.text, 140); if (!text) return fail(res, 400, 'Wish text is required.');
            wishes.push({ from: slot.id, role: slot.role, text }); wishes = wishes.slice(-40); broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'collect' && party.game === 'lantern-hunt' && active) {
            const item = active.items.find(x => x.id === body.itemId); const p = positions.get(slot.id) || coord();
            if (!item || (slot.role === 'companion' ? (active.privateFound.get(slot.id) || []).includes(item.id) : item.found) || Math.hypot(p.x - item.x, p.z - item.z) > 8) return fail(res, 400, 'Lantern is unavailable or too far away.');
            if (slot.role === 'companion') active.privateFound.set(slot.id, [...(active.privateFound.get(slot.id) || []), item.id]); else item.found = true;
            scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 1; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'checkpoint' && ['bridge-dash', 'sky-rings'].includes(party.game) && active) {
            const index = Number(body.index); const target = active.checkpoints[index]; const p = positions.get(slot.id) || coord();
            const distance = party.game === 'sky-rings' ? Math.hypot(p.x - target?.x, p.y - target?.y, p.z - target?.z) : Math.hypot(p.x - target?.x, p.z - target?.z);
            if (!target || index !== (active.progress.get(slot.id) || 0) || distance > 8) return fail(res, 400, 'Checkpoint unavailable or too far away.');
            active.progress.set(slot.id, index + 1); scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 1; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'pick-ingredient' && party.game === 'cake-courier' && active) {
            const index = Number(body.index); const item = active.ingredients[index]; const p = positions.get(slot.id) || coord(); const taken = active.collected.get(slot.id) || [];
            if (!item || active.carrying.has(slot.id) || taken.includes(index) || Math.hypot(p.x - item.x, p.z - item.z) > 8) return fail(res, 400, 'Ingredient unavailable, already collected, or too far away.');
            active.carrying.set(slot.id, index); active.collected.set(slot.id, [...taken, index]); broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'deliver-ingredient' && party.game === 'cake-courier' && active) {
            const p = positions.get(slot.id) || coord(); const carried = active.carrying.get(slot.id); const cake = active.cake;
            if (carried === undefined || Math.hypot(p.x - cake.x, p.z - cake.z) > 10) return fail(res, 400, 'No ingredient carried or too far from the cake.');
            active.carrying.delete(slot.id); const delivered = [...(active.delivered.get(slot.id) || []), carried]; active.delivered.set(slot.id, delivered);
            scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 2; broadcast(); return writeJSON(res, 200, { ok: true, delivered: delivered.length });
          }
          if (type === 'submit-sequence' && party.game === 'starlight-memory' && active) {
            const elapsed = now() - active.startedAt; if (active.completed.has(slot.id) || elapsed < 4000 || !Array.isArray(body.sequence) || body.sequence.length !== 5 || body.sequence.some((n, i) => n !== active.sequence[i])) return fail(res, 400, 'Sequence is incorrect, already submitted, or was submitted too quickly.');
            active.completed.add(slot.id);
            scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 1; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          return fail(res, 400, 'Unknown or unavailable action.');
        }
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/')) return fail(res, 404, 'Unknown API route.');
      if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed.');
      const root = path.resolve(distDir); const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.resolve(root, `.${rel}`); if (file !== root && !file.startsWith(root + path.sep)) return fail(res, 404, 'Not found.');
      let resolvedRoot, resolvedFile, stat;
      try { resolvedRoot = await fs.promises.realpath(root); resolvedFile = await fs.promises.realpath(file); stat = await fs.promises.stat(resolvedFile); } catch { return fail(res, 404, 'Not found.'); }
      if (resolvedFile !== resolvedRoot && !resolvedFile.startsWith(resolvedRoot + path.sep)) return fail(res, 404, 'Not found.');
      if (/\.(?:map|ts|tsx|jsx)$/i.test(resolvedFile)) return fail(res, 404, 'Not found.');
      if (!stat.isFile()) return fail(res, 404, 'Not found.');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
      if (path.basename(resolvedFile) === 'index.html') {
        const html = await fs.promises.readFile(resolvedFile); const match = /<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/i.exec(html.toString('utf8'));
        const hash = match ? `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'` : '';
        res.setHeader('content-security-policy', `default-src 'self'; script-src 'self' ${hash}; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length, 'cache-control': 'no-cache' }); return req.method === 'HEAD' ? res.end() : res.end(html);
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'content-length': stat.size, 'cache-control': 'public, max-age=3600' });
      if (req.method === 'HEAD') return res.end(); fs.createReadStream(resolvedFile).pipe(res);
    } catch (e) { if (!res.headersSent) fail(res, e.status || 500, e.status ? e.message : 'Server error.'); else res.destroy(); }
  };
  const server = http.createServer(handler);
  const timer = setInterval(() => {
    const t = now();
    for (const [id, s] of sessionsBySlot) if (s.expiresAt <= t) { sessionsBySlot.delete(id); sessionsByTicket.delete(s.ticket); const stream = streams.get(s.ticket); if (stream) stream.end(); streams.delete(s.ticket); }
    if (party.endsAt && party.endsAt <= t) { party = { phase: 'lobby', game: null, endsAt: null, celebrationAt: null }; active = null; }
    if (rallyAt && rallyAt <= t) {
      [...sessionsBySlot.values()].forEach((s, i) => { positions.set(s.slot.id, { x: (i % 5) * 4 - 8, y: 46.72, z: -448 + Math.floor(i / 5) * 4, yaw: 0 }); moveTimes.set(s.slot.id, t); });
      rallyAt = null; party = { phase: 'celebration', game: null, endsAt: null, celebrationAt: t }; active = null;
    }
    if (scheduledCelebration && scheduledCelebration <= t && !rallyAt) { scheduledCelebration = null; active = null; party = { phase: 'rally', game: null, endsAt: null, celebrationAt: null }; rallyAt = t + 5000; }
    broadcast();
  }, 1000); timer.unref();
  const pushTimer = setInterval(flushBroadcast, 100); pushTimer.unref();
  server.on('close', () => { clearInterval(timer); clearInterval(pushTimer); });
  server.partyInternals = { handler, stateFor, sessionsBySlot, scores, getActive: () => active, positions };
  return server;
}

function outsideRepo(file) { return !path.resolve(file).startsWith(ROOT + path.sep) && path.resolve(file) !== ROOT; }
async function cli(args) {
  if (args[0] === '--init') {
    const dest = args[1]; if (!dest || !outsideRepo(dest)) throw new Error('Choose a private config path outside the repository.');
    const config = makeDefaultConfig(); await fs.promises.mkdir(path.dirname(path.resolve(dest)), { recursive: true });
    await fs.promises.writeFile(dest, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    try { await fs.promises.chmod(dest, 0o600); } catch {}
    console.log(`Created private invitations at ${path.resolve(dest)}${args[2] ? ` (public URL: ${args[2]})` : ''}`);
    for (const s of config.slots) console.log(`${s.role}\t${s.name}\t${s.token}`);
    return;
  }
  const configFile = args[0];
  const config = process.env.PARTY_CONFIG_JSON ? JSON.parse(process.env.PARTY_CONFIG_JSON) : configFile && outsideRepo(configFile) ? JSON.parse(await fs.promises.readFile(configFile, 'utf8')) : null;
  if (!config) throw new Error('Usage: node server/party.mjs <private-config.json> (outside repository), or set PARTY_CONFIG_JSON.');
  const server = createPartyServer({ config }); const port = Number(process.env.PORT || 3000); server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Party server listening on ${server.address().address}:${server.address().port}`));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
