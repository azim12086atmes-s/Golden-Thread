import http from 'node:http';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { CHASE_GAME_IDS, ARENA, COVER, createChaseGame, actionChase, tickChase, chaseView, canMoveChase, canSeeChase, updateChasePlayers } from './chase-games.mjs';
import { newJourney, journeyView, advanceJourney, journeyCatalog, JOURNEY_TITLE, JOURNEY_PREMISE, JOURNEY_ACTS } from '../shared/story.js';
import { followStep, enforceGap } from '../shared/follow.js';
import { BRIDGE_START, BRIDGE_CHECKPOINTS as PALACE_BRIDGE_CHECKPOINTS, SKY_RINGS as PALACE_SKY_RINGS, INGREDIENTS as PALACE_INGREDIENTS, CAKE_SPOT as PALACE_CAKE_SPOT } from '../shared/party-layout.js';
import { createFestival, advanceFestival, festivalView } from '../shared/festival.mjs';
import { canWearPartyOutfit, partyAvatar } from '../shared/appearance.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MAX_BODY = 32 * 1024;
const SESSION_MS = 30 * 60 * 1000;
const WORLD = { x: [-2500, 2500], y: [-30, 1600], z: [-10500, 2500] };
const CHASE_GAMES = new Set(CHASE_GAME_IDS);
const GAMES = new Set(['lantern-hunt', 'bridge-dash', 'starlight-memory', 'sky-rings', 'cake-courier', 'starlight-statues', ...CHASE_GAME_IDS]);
export const PARTY_ARENA = ARENA;
export const ARENA_COVER = COVER;
export const JOURNEY_CATALOG = journeyCatalog();
export const JOURNEY_INFO = Object.freeze({ title: JOURNEY_TITLE, premise: JOURNEY_PREMISE, acts: JOURNEY_ACTS });
export const SPAWN = Object.freeze({ x: 0, y: 0, z: 70 });
export const LANTERN_PICKUPS = Object.freeze([
  [-70, 0, 75], [-35, 0, 75], [0, 0, 75], [35, 0, 75], [70, 0, 75],
  [-70, 0, 20], [-35, 0, 20], [0, 0, 20], [35, 0, 20], [70, 0, 20],
  [-45, 0, -35], [45, 0, -35],
].map(([x, y, z], i) => Object.freeze({ id: `lantern-${i + 1}`, x, y, z })));
export const BRIDGE_CHECKPOINTS = PALACE_BRIDGE_CHECKPOINTS;
export const SKY_RINGS = PALACE_SKY_RINGS;
export const INGREDIENTS = PALACE_INGREDIENTS;
export const CAKE_SPOT = PALACE_CAKE_SPOT;

const token = () => randomBytes(32).toString('base64url');
const cleanLabel = (s, max = 36) => typeof s === 'string' ? s.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, max) : '';

export function makeDefaultConfig() {
  const slots = [{ id: randomUUID(), role: 'birthday', name: 'Birthday', avatar: 'g-birthday', token: token() }];
  for (let i = 1; i <= 3; i++) slots.push({ id: randomUUID(), role: 'companion', name: `Companion ${i}`, avatar: 'g-traveler', token: token() });
  for (let i = 1; i <= 10; i++) slots.push({ id: randomUUID(), role: 'guest', name: `Guest ${i}`, avatar: 'g-traveler', token: token() });
  return { slots, maxConnections: 32 };
}

function validateConfig(config) {
  if (!config || !Array.isArray(config.slots) || config.slots.length < 1 || config.slots.length > 64) throw new Error('Config must contain 1 to 64 private invitation slots.');
  const ids = new Set(); const tokens = new Set(); let birthdayCount = 0; let observerCount = 0;
  const slots = config.slots.map((s, i) => {
    if (!s || !['birthday', 'companion', 'guest', 'observer'].includes(s.role)) throw new Error(`Invalid role in slot ${i + 1}.`);
    if (s.role === 'birthday') birthdayCount++;
    if (s.role === 'observer') observerCount++;
    if (typeof s.token !== 'string' || s.token.length < 32 || tokens.has(s.token)) throw new Error(`Invalid or duplicate invite token in slot ${i + 1}.`);
    tokens.add(s.token);
    const id = typeof s.id === 'string' && s.id.length <= 48 ? s.id : randomUUID();
    if (ids.has(id) || /^numbered-\d+$/.test(id)) throw new Error('Duplicate or reserved slot id.'); ids.add(id);
    const name = cleanLabel(s.name); const avatar = cleanLabel(s.avatar, 48);
    if (!name || !avatar) throw new Error(`Slot ${i + 1} needs a public name and avatar id.`);
    return { id, role: s.role, name, avatar: partyAvatar(s.role, avatar), token: s.token };
  });
  if (birthdayCount !== 1) throw new Error('Config must have exactly one birthday slot.');
  if (observerCount > 1) throw new Error('Config may have at most one observer slot.');
  const maxConnections = config.maxConnections === undefined ? 32 : config.maxConnections;
  if (!Number.isInteger(maxConnections) || maxConnections < 14 || maxConnections > 128) throw new Error('maxConnections must be an integer from 14 to 128.');
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
  return { slots, celebrationStart, iceServers, maxConnections };
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

export function createPartyServer({ config, distDir = path.join(ROOT, 'dist'), now = Date.now, sessionMs = SESSION_MS, autoTick = true, serverFactory = http.createServer, snapshot = null } = {}) {
  const validated = validateConfig(config); const slots = validated.slots; const maxConnections = validated.maxConnections;
  const birthdayId = slots.find(s => s.role === 'birthday').id;
  const inviteByToken = new Map(slots.map(s => [s.token, s]));
  const sessionsBySlot = new Map(); const sessionsByTicket = new Map(); const streams = new Map();
  const positions = new Map(); const moveTimes = new Map(); const scores = { birthday: {}, guest: {}, companion: {} };
  const signalQueues = new Map(); const signalTimes = new Map(); const photos = [];
  let party = { phase: 'lobby', game: null, endsAt: null, celebrationAt: null };
  let active = null; let wishes = []; let rallyAt = null; let dirty = false; let scheduledCelebration = validated.celebrationStart;
  let journey = newJourney(), journeyStarted = false, journeyTravel = null, teleportVersion = 0;
  let festival = createFestival(now());
  const recordFestival = (event, actor = { id: birthdayId, role: 'birthday' }) => {
    const result = advanceFestival(festival, event, actor, now());
    if (result) festival = result.state;
    return result;
  };
  const enterFestival = () => {
    if (festival.stage === 'afterparty') festival = { ...createFestival(now()), storyBeacons: festival.storyBeacons, keepsakes: festival.keepsakes };
    recordFestival({ type: 'enter-celebration' });
  };
  const privateJourneys = new Map();
  const observerUpdated = new Map();
  let birthdaySample = null, birthdaySpeed = 0;
  const coord = () => ({ ...SPAWN, yaw: 0 });
  const publicRoster = () => [...sessionsBySlot.values()].filter(s => !['companion', 'observer'].includes(s.slot.role) && s.expiresAt > now()).map(s => s.slot);
  const award = (result, privateOwner = null) => {
    for (const { id, points } of result.awards || []) {
      const slot = sessionsBySlot.get(id)?.slot;
      if (!slot || slot.role === 'observer' || (privateOwner ? id !== privateOwner : slot.role === 'companion')) continue;
      scores[slot.role][id] = (scores[slot.role][id] || 0) + points;
    }
  };
  const ownJourney = slot => {
    if (slot.role !== 'companion') return journey;
    let progress = privateJourneys.get(slot.id);
    if (!progress || progress.chapter < journey.chapter) { progress = { ...journey, completed: [...journey.completed] }; privateJourneys.set(slot.id, progress); }
    return progress;
  };
  const practiceFor = slot => {
    if (!active?.chase) return null;
    let practice = active.practices.get(slot.id);
    if (!practice) {
      const bots = Array.from({ length: 3 }, (_, i) => ({ id: `wisp-${randomUUID()}`, name: `Lantern wisp ${i + 1}` }));
      const round = createChaseGame(active.game, [slot, ...bots], active.chase.startedAt);
      if (active.game === 'tag') round.itId = slot.id;
      const points = new Map(bots.map((bot, i) => [bot.id, [{ x: -14, y: .2, z: -27 }, { x: 14, y: .2, z: 27 }, { x: 30, y: .2, z: -12 }][i]]));
      practice = { round, bots, positions: points, lastTick: now(), lastShot: 0 };
      active.practices.set(slot.id, practice);
    }
    practice.positions.set(slot.id, positions.get(slot.id) || coord());
    return practice;
  };
  const practiceView = slot => {
    const p = practiceFor(slot); if (!p) return null;
    const view = chaseView(p.round, slot.id, p.positions, now());
    return { ...view, practice: true, wisps: p.bots.filter(b => canSeeChase(p.round, slot.id, b.id, p.positions, now())).map(b => ({ ...b, ...p.positions.get(b.id) })) };
  };
  const tickMatches = t => {
    if (!active?.chase) return;
    const roster = publicRoster();
    updateChasePlayers(active.chase, roster.map(s => s.id), t);
    award(tickChase(active.chase, t));
    for (const session of sessionsBySlot.values()) if (session.slot.role === 'companion') {
      const owner = session.slot.id, practice = practiceFor(session.slot), dt = Math.min(.2, Math.max(0, (t - practice.lastTick) / 1000));
      practice.lastTick = t;
      const actor = practice.positions.get(owner);
      if (active.game !== 'hide-and-seek') for (const [i, bot] of practice.bots.entries()) {
        const p = practice.positions.get(bot.id);
        const a = (t - practice.round.startedAt) / 1000 * (.22 + i * .04) + i * 2.1;
        const target = active.game === 'tag' && practice.round.itId === bot.id ? actor : { x: Math.cos(a) * 31, y: .2, z: Math.sin(a) * 31 };
        const d = Math.hypot(target.x - p.x, target.z - p.z), amount = Math.min(1, (active.game === 'tag' ? 5 : 3) * dt / Math.max(.01, d));
        const candidate = { x: p.x + (target.x - p.x) * amount, y: .2, z: p.z + (target.z - p.z) * amount };
        const blocked = COVER.some(c => candidate.x > c.min.x - .5 && candidate.x < c.max.x + .5 && candidate.z > c.min.z - .5 && candidate.z < c.max.z + .5);
        if (!blocked) practice.positions.set(bot.id, candidate);
        if (active.game === 'tag' && practice.round.itId === bot.id) actionChase(practice.round, bot.id, { type: 'tag', targetId: owner }, practice.positions, t);
        if (active.game === 'laser-tag' && t - practice.lastShot > 2500 + i * 300) {
          actionChase(practice.round, bot.id, { type: 'laser', direction: { x: actor.x - p.x, y: actor.y - p.y, z: actor.z - p.z } }, practice.positions, t);
          if (i === practice.bots.length - 1) practice.lastShot = t;
        }
      }
      award(tickChase(practice.round, t), owner);
    }
    if (active.chase.finished) active.endsAt = Math.min(active.endsAt, t);
  };
  const initialPosition = slot => {
    if (slot.role === 'birthday') return { ...SPAWN, yaw: 0 };
    if (slot.role === 'companion') {
      const n = [...sessionsBySlot.values()].filter(s => s.slot.role === 'companion').length;
      return { x: -10 + ((n - 1) % 3) * 3, y: 0, z: 68 - Math.floor((n - 1) / 3) * 3, yaw: 0 };
    }
    const n = [...sessionsBySlot.values()].filter(s => s.slot.role === 'guest').length;
    return { x: (n % 5) * 3 - 6, y: 0, z: 64 - Math.floor(n / 5) * 3, yaw: 0 };
  };
  const updateObservers = t => {
    const birthday = sessionsBySlot.get(birthdayId);
    if (!birthday || birthday.expiresAt <= t) return false;
    const bp = positions.get(birthdayId) || coord(); let changed = false;
    const yaw = Number.isFinite(bp.yaw) ? bp.yaw : 0;
    if (birthdaySample && t > birthdaySample.t) {
      const dt = Math.min(1, (t - birthdaySample.t) / 1000);
      birthdaySpeed = Math.hypot(bp.x - birthdaySample.x, bp.y - birthdaySample.y, bp.z - birthdaySample.z) / dt;
    }
    const teleported = birthdaySample && birthdaySample.teleportVersion !== teleportVersion;
    birthdaySample = { x: bp.x, y: bp.y, z: bp.z, t, teleportVersion };
    for (const s of sessionsBySlot.values()) if (s.slot.role === 'observer' && s.expiresAt > t) {
      const old = positions.get(s.slot.id) || coord();
      const last = observerUpdated.get(s.slot.id) ?? (t - 100);
      const dt = Math.min(.5, Math.max(0, (t - last) / 1000)); observerUpdated.set(s.slot.id, t);
      const previous = teleported || !positions.has(s.slot.id) ? { x: bp.x + 100, y: bp.y, z: bp.z, yaw: old.yaw || 0 } : old;
      const step = followStep({ boy: previous, girl: bp, dt, heading: yaw, speed: birthdaySpeed, airborne: true });
      const safe = enforceGap(step.pos, bp);
      const p = { ...safe, yaw: Math.atan2(bp.x - safe.x, bp.z - safe.z) };
      if (!positions.has(s.slot.id) || Math.hypot(p.x - old.x, p.y - old.y, p.z - old.z) > .005) changed = true;
      positions.set(s.slot.id, p);
    }
    return changed;
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
  const maySee = (viewer, target) => viewer.id === target.id || viewer.role === 'birthday' || (viewer.role === 'observer' && (target.role === 'birthday' || target.role === 'guest')) || (viewer.role === 'companion' && (target.role === 'birthday' || target.role === 'guest') || viewer.role === 'guest' && (target.role === 'guest' || target.role === 'birthday'));
  const mayVoice = (viewer, target) => viewer.role === 'observer' || target.role === 'observer' ? ((viewer.role === 'birthday' && target.role === 'observer') || (viewer.role === 'observer' && target.role === 'birthday')) : maySee(viewer, target);
  const publicScores = viewer => {
    const visible = viewer.role === 'birthday' ? ['birthday', 'guest', 'companion'] : ['guest'];
    const out = {};
    for (const role of visible) for (const [id, score] of Object.entries(scores[role])) out[id] = score;
    if (viewer.role === 'companion' && scores.companion[viewer.id] !== undefined) out[viewer.id] = scores.companion[viewer.id];
    return out;
  };
  const stateFor = session => {
    const viewer = session.slot;
    const admitted = [...sessionsBySlot.values()].filter(s => s.expiresAt > now() && maySee(viewer, s.slot));
    const voicePeers = admitted.filter(s => mayVoice(viewer, s.slot)).map(s => ({ id: s.slot.id, name: s.slot.name, isBirthday: s.slot.role === 'birthday', ...(viewer.role === 'birthday' ? { role: s.slot.role } : {}) }));
    const players = admitted.filter(s => !active?.chase || viewer.role === 'companion' || viewer.role === 'observer' || ['companion', 'observer'].includes(s.slot.role) || canSeeChase(active.chase, viewer.id, s.slot.id, positions, now())).map(s => ({ id: s.slot.id, name: s.slot.name, isBirthday: s.slot.role === 'birthday', role: viewer.role === 'birthday' ? s.slot.role : undefined, avatar: s.slot.avatar, ...(positions.get(s.slot.id) || coord()) }));
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
    const chase = active?.chase ? (viewer.role === 'companion' ? practiceView(viewer) : viewer.role === 'observer' ? null : chaseView(active.chase, viewer.id, positions, now())) : null;
    const trail = journeyStarted ? { ...journeyView(ownJourney(viewer)), active: true, waiting: viewer.role === 'companion' && ownJourney(viewer).chapter > journey.chapter } : null;
    const privatePractices = active?.chase && viewer.role === 'birthday' ? [...sessionsBySlot.values()].filter(s => s.slot.role === 'companion').map(s => ({ ownerId: s.slot.id, ...practiceView(s.slot) })) : undefined;
    const observer = [...sessionsBySlot.values()].find(s => s.slot.role === 'observer' && s.expiresAt > now());
    return { type: 'state', self: { id: viewer.id, name: viewer.name, role: viewer.role, avatar: viewer.avatar, ...(viewer.role === 'observer' ? { observer: true, followingId: birthdayId } : {}) }, players, voicePeers, party: { ...party, festival: festivalView(festival), rallyAt, round, scores: publicScores(viewer), selfProgress, presenceCount: admitted.length, chase, privatePractices, journey: trail, ...(viewer.role === 'companion' ? { partyJourney: journeyStarted ? journeyView(journey) : null } : {}), ...(viewer.role === 'observer' ? { observer: true } : {}), ...(viewer.role === 'birthday' && observer ? { observerFollow: { id: observer.slot.id } } : {}), travelAt: journeyTravel?.at ?? null, teleportVersion }, signals, wishes: visibleWishes };
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
    res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('x-frame-options', 'DENY'); res.setHeader('referrer-policy', 'no-referrer'); res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'");
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/healthz') return writeJSON(res, 200, { ok: true });
      if (req.method === 'POST' && url.pathname === '/api/join') {
        const body = await readJSON(req);
        let slot;
        if (Object.hasOwn(body, 'guestNumber')) {
          if (typeof body.guestNumber !== 'string' || !/^\d{1,10}$/.test(body.guestNumber)) return fail(res, 401, 'Enter a valid numbered guest link.');
          const guestNumber = body.guestNumber.replace(/^0+(?=\d)/, '');
          const name = body.name === undefined ? `Guest ${guestNumber}` : cleanLabel(body.name, 36);
          if (!name) return fail(res, 401, 'Enter a valid numbered guest link.');
          slot = { id: `numbered-${guestNumber}`, role: 'guest', name, avatar: 'g-meadow', token: null };
        } else slot = inviteByToken.get(String(body.token || ''));
        if (!slot) return fail(res, 401, 'Invalid invitation.');
        const existing = sessionsBySlot.get(slot.id);
        const activeCount = [...sessionsBySlot.values()].filter(s => s.expiresAt > now()).length;
        if (!existing && activeCount >= maxConnections) return fail(res, 429, 'The party is at its current connection limit.');
        if (existing) { const old = streams.get(existing.ticket); if (old) { old.end(); streams.delete(existing.ticket); } sessionsByTicket.delete(existing.ticket); }
        const ticket = token(); const session = { slot, ticket, expiresAt: now() + sessionMs, lastSeen: now() };
        sessionsBySlot.set(slot.id, session); sessionsByTicket.set(ticket, session); if (!positions.has(slot.id)) positions.set(slot.id, initialPosition(slot));
        if (active?.chase && slot.role !== 'observer') {
          updateChasePlayers(active.chase, publicRoster().map(s => s.id), now());
          if (slot.role === 'companion') practiceFor(slot);
          const n = publicRoster().findIndex(p => p.id === slot.id), a = Math.max(0, n) * 2.399963;
          positions.set(slot.id, { x: Math.cos(a) * 38, y: 0, z: Math.sin(a) * 38, yaw: 0 });
          if (slot.role === 'birthday') teleportVersion++;
        }
        updateObservers(now());
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
        if (slot.role === 'observer' && url.pathname !== '/api/signal') return fail(res, 403, 'This invitation is view-only.');
        if (url.pathname === '/api/photo') {
          if (slot.role === 'companion') return fail(res, 403, 'This invitation can save private photos locally.');
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
          const vehicle = body.vehicle;
          if (vehicle !== undefined && !['walk','fly','car','van','truck','plane','unicorn','dragon','chariot'].includes(vehicle)) return fail(res, 400, 'Invalid ride.');
          if ((active?.chase || party.game === 'bridge-dash') && vehicle !== undefined && vehicle !== 'walk') return fail(res, 400, 'Stay on foot during this round.');
          if (active?.chase) {
            const match = slot.role === 'companion' ? practiceFor(slot).round : active.chase;
            const previous = positions.get(slot.id) || coord();
            const moved = Math.hypot(x - previous.x, z - previous.z);
            if (!canMoveChase(match, slot.id, t) && moved > .05) return fail(res, 400, 'Hold your place until the countdown or recharge finishes.');
            const dt = Math.max(.1, Math.min(2, (t - (moveTimes.get(slot.id) ?? t - 100)) / 1000));
            if (moved > 12 * dt + 1 || Math.hypot(x, z) > ARENA.radius || y < -2 || y > 5) return fail(res, 400, 'Stay on foot inside the starlight arena.');
            if (COVER.some(c => x > c.min.x - .35 && x < c.max.x + .35 && z > c.min.z - .35 && z < c.max.z + .35 && y + .8 >= c.min.y && y + .8 <= c.max.y)) return fail(res, 400, 'That path is blocked by cover.');
          }
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
          positions.set(slot.id, { x, y, z, yaw, ...(vehicle !== undefined ? { vehicle } : {}) }); moveTimes.set(slot.id, t); broadcast(); return writeJSON(res, 200, { ok: true });
        }
        if (url.pathname === '/api/signal') {
          const peer = sessionsBySlot.get(String(body.to || '')); if (!peer || !mayVoice(slot, peer.slot) || !mayVoice(peer.slot, slot)) return fail(res, 403, 'Peer is not available on this voice channel.');
          const kind = body.kind === 'candidate' ? 'candidate' : body.kind === 'description' ? 'description' : '';
          const payload = body.payload;
          const valid = kind === 'description' ? payload && ['offer', 'answer'].includes(payload.type) && typeof payload.sdp === 'string' && payload.sdp.length <= 12_000 : payload && typeof payload.candidate === 'string' && payload.candidate.length <= 2_000 && (payload.sdpMid === null || typeof payload.sdpMid === 'string' || payload.sdpMid === undefined);
          if (!kind || !valid) return fail(res, 400, 'Invalid signal.');
          const t = now(); const times = (signalTimes.get(slot.id) || []).filter(x => t - x < 60_000); if (times.length >= 512) return fail(res, 429, 'Signaling rate limit exceeded.'); times.push(t); signalTimes.set(slot.id, times);
          const queue = signalQueues.get(peer.slot.id) || []; queue.push({ id: randomUUID(), from: slot.id, kind, payload }); signalQueues.set(peer.slot.id, queue.slice(-256)); broadcast(); return writeJSON(res, 200, { ok: true });
        }
        if (url.pathname === '/api/action') {
          const type = body.type; const canHost = slot.role === 'birthday' || slot.role === 'companion';
          if (type === 'festival') {
            if (party.phase !== 'celebration' || !['release-lantern','blow-candles','cut-cake','finish-finale'].includes(body.event)) return fail(res, 400, 'The birthday activity is not ready.');
            if (['blow-candles','cut-cake'].includes(body.event)) {
              const p = positions.get(slot.id) || coord();
              if (Math.hypot(p.x-CAKE_SPOT.x,p.y-CAKE_SPOT.y,p.z-CAKE_SPOT.z)>12) return fail(res, 400, 'Come closer to the birthday cake.');
            }
            const result = recordFestival({ type: body.event }, slot);
            if (!result) return fail(res, 403, 'That birthday activity is not available to this player yet.');
            broadcast(); return writeJSON(res, 200, { ok: true, ...result.result });
          }
          if (['start-journey', 'journey-travel', 'journey-finale'].includes(type)) {
            if (!canHost || party.phase === 'playing') return fail(res, 403, 'Finish the current round before guiding the journey.');
            if (type === 'journey-finale') {
              if (!journeyView(journey).complete) return fail(res, 400, 'The twenty lights are still being gathered.');
              active = null; journeyTravel = null; party = { phase: 'rally', game: null, endsAt: null, celebrationAt: null }; rallyAt = now() + 5000;
            } else {
              journeyStarted = true;
              if (type === 'journey-travel') {
                const chapter = journeyView(journey).current;
                if (!chapter) return fail(res, 400, 'The crown is complete. Return to the palace for the finale.');
                journeyTravel = { at: now() + 5000, destination: chapter.collect };
                active = null; rallyAt = null; party = { phase: 'journey-travel', game: null, endsAt: null, celebrationAt: null };
              }
            }
            broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'journey-collect' || type === 'journey-light') {
            if (!journeyStarted || party.phase === 'playing' || journeyTravel) return fail(res, 400, 'The trail is paused during a round or a skyboat journey.');
            const current = ownJourney(slot);
            if (slot.role === 'companion' && current.chapter > journey.chapter) return fail(res, 400, 'Your light is ready. Wait for the party’s next beacon.');
            if (body.chapterId !== journeyView(current).current?.id) return fail(res, 409, 'The party has reached a new chapter.');
            const next = advanceJourney(current, body, positions.get(slot.id) || coord());
            if (slot.role === 'companion') privateJourneys.set(slot.id, next); else journey = next;
            if (type === 'journey-light') { scores[slot.role][slot.id] = (scores[slot.role][slot.id] || 0) + 2; recordFestival({ type: 'beacon-lit', region: body.chapterId }, slot); }
            broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (['tag', 'seek', 'laser'].includes(type)) {
            if (!active?.chase || party.phase !== 'playing') return fail(res, 400, 'That game is not running.');
            const practice = slot.role === 'companion' ? practiceFor(slot) : null;
            const match = practice?.round ?? active.chase, map = practice?.positions ?? positions;
            const result = actionChase(match, slot.id, body, map, now());
            if (!result.events.length) return fail(res, 400, 'No valid target yet. Check your range, cover, and cooldown.');
            award(result, practice ? slot.id : null); broadcast(); return writeJSON(res, 200, { ok: true, hit: result.events.some(e => e.hit), events: result.events });
          }
          if (type === 'start-game') {
            if (!canHost || !GAMES.has(body.game)) return fail(res, 403, 'Game cannot be started by this player.');
            const chase = CHASE_GAMES.has(body.game) ? createChaseGame(body.game, publicRoster(), now()) : null;
            active = chase ? { phase: 'playing', game: body.game, endsAt: chase.endsAt, chase, practices: new Map() } : gameSpec(body.game, now()); active.roundId = randomUUID(); active.progress = new Map(); active.completed = new Set(); active.privateFound = new Map(); active.carrying = new Map(); active.delivered = new Map(); active.collected = new Map(); active.statues = new Map(); rallyAt = null; journeyTravel = null;
            let seat = 0;
            [...sessionsBySlot.values()].forEach(s => {
              if (s.slot.role === 'observer') return;
              const i = seat++;
              const place = body.game === 'bridge-dash' ? { x: BRIDGE_START.x + (i % 2 ? 1.1 : -1.1), y: BRIDGE_START.y, z: BRIDGE_START.z + Math.floor(i / 2) * 2.5, yaw: Math.PI } : body.game === 'cake-courier' ? { x: CAKE_SPOT.x + (i % 5 - 2) * 3, y: CAKE_SPOT.y, z: CAKE_SPOT.z + 10 + Math.floor(i / 5) * 3, yaw: Math.PI } : { x: (i % 7) * 2 - 6, y: 0, z: 70 - Math.floor(i / 7) * 3, yaw: 0 };
              if (chase) { const a = i * 2.399963; Object.assign(place, { x: Math.cos(a) * 38, z: Math.sin(a) * 38 }); }
              positions.set(s.slot.id, place); moveTimes.set(s.slot.id, now() - 100);
              if (chase && s.slot.role === 'companion') practiceFor(s.slot);
            });
            teleportVersion++;
            party = { phase: active.phase, game: body.game, endsAt: active.endsAt, celebrationAt: null }; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'outfit') {
            if (typeof body.avatar !== 'string' || !/^(?:[gb]-[a-z0-9-]{1,42}|fx-[gb]-[0-9]{1,3})$/.test(body.avatar)) return fail(res, 400, 'Invalid outfit id.');
            if (body.targetId !== undefined && typeof body.targetId !== 'string') return fail(res, 400, 'Invalid outfit target.');
            let target = slot;
            if (body.targetId && body.targetId !== slot.id) {
              const session = sessionsBySlot.get(body.targetId);
              if (slot.role !== 'birthday' || !session || session.expiresAt <= now() || !['observer', 'companion'].includes(session.slot.role)) return fail(res, 403, 'That wardrobe is not available.');
              target = session.slot;
            }
            if (!canWearPartyOutfit(target.role, body.avatar)) return fail(res, 403, 'Please choose another outfit.');
            target.avatar = body.avatar; broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'celebrate') {
            if (!canHost) return fail(res, 403, 'Only a host can start the celebration.');
            active = null; journeyTravel = null; party = { phase: 'celebration', game: null, endsAt: null, celebrationAt: now() }; enterFestival(); broadcast(); return writeJSON(res, 200, { ok: true });
          }
          if (type === 'rally') {
            if (!canHost) return fail(res, 403, 'Only a host can call the rally.');
            active = null; journeyTravel = null; party = { phase: 'rally', game: null, endsAt: null, celebrationAt: null }; rallyAt = now() + 5000; broadcast(); return writeJSON(res, 200, { ok: true, rallyAt });
          }
          if (type === 'wish') {
            const text = cleanLabel(body.text, 140); if (!text) return fail(res, 400, 'Wish text is required.');
            if (party.phase === 'celebration') recordFestival({ type: 'release-lantern' }, slot);
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
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
      if (path.basename(resolvedFile) === 'index.html') {
        const html = await fs.promises.readFile(resolvedFile); const match = /<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/i.exec(html.toString('utf8'));
        const hash = match ? `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'` : '';
        res.setHeader('content-security-policy', `default-src 'self'; script-src 'self' ${hash}; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length, 'cache-control': 'no-cache' }); return req.method === 'HEAD' ? res.end() : res.end(html);
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'content-length': stat.size, 'cache-control': 'public, max-age=3600' });
      if (req.method === 'HEAD') return res.end(); fs.createReadStream(resolvedFile).pipe(res);
    } catch (e) { if (!res.headersSent) fail(res, e.status || 500, e.status ? e.message : 'Server error.'); else res.destroy(); }
  };
  const server = serverFactory(handler);
  const tickRoom = () => {
    const t = now();
    for (const [id, s] of sessionsBySlot) if (s.expiresAt <= t) { sessionsBySlot.delete(id); sessionsByTicket.delete(s.ticket); const stream = streams.get(s.ticket); if (stream) stream.end(); streams.delete(s.ticket); }
    tickMatches(t);
    if (active && active.endsAt <= t) { recordFestival({ type: 'round-completed', game: active.game, roundId: active.roundId || `${active.game}-${active.endsAt}` }); party = { phase: 'lobby', game: null, endsAt: null, celebrationAt: null }; active = null; }
    if (journeyTravel && journeyTravel.at <= t) {
      [...sessionsBySlot.values()].filter(s => s.slot.role !== 'observer').forEach((s, i) => { positions.set(s.slot.id, { x: journeyTravel.destination.x + (i % 5 - 2) * 2.2, y: journeyTravel.destination.y, z: journeyTravel.destination.z + Math.floor(i / 5) * 2.2, yaw: 0 }); moveTimes.set(s.slot.id, t - 100); });
      journeyTravel = null; teleportVersion++; party = { phase: 'lobby', game: null, endsAt: null, celebrationAt: null };
    }
    if (rallyAt && rallyAt <= t) {
      [...sessionsBySlot.values()].filter(s => s.slot.role !== 'observer').forEach((s, i) => { positions.set(s.slot.id, { x: CAKE_SPOT.x + (i % 5) * 4 - 8, y: CAKE_SPOT.y, z: CAKE_SPOT.z + 10 + Math.floor(i / 5) * 4, yaw: Math.PI }); moveTimes.set(s.slot.id, t); });
      rallyAt = null; teleportVersion++; party = { phase: 'celebration', game: null, endsAt: null, celebrationAt: t }; active = null; enterFestival();
    }
    if (scheduledCelebration && scheduledCelebration <= t && !rallyAt) { scheduledCelebration = null; active = null; journeyTravel = null; party = { phase: 'rally', game: null, endsAt: null, celebrationAt: null }; rallyAt = t + 5000; }
    if (party.phase === 'celebration' && festival.phase === 'lobby') enterFestival();
    if (updateObservers(t)) broadcast();
    broadcast();
  };
  let timer = null, pushTimer = null;
  if (autoTick) {
    timer = setInterval(tickRoom, 1000); timer.unref();
    pushTimer = setInterval(() => { const t = now(); tickMatches(t); if (updateObservers(t)) broadcast(); flushBroadcast(); }, 100); pushTimer.unref();
  }
  server.on?.('close', () => { if (timer) clearInterval(timer); if (pushTimer) clearInterval(pushTimer); });
  const exportSnapshot = () => encodeSnapshot({
    slotStates: slots.map(s => ({ id: s.id, name: s.name, avatar: s.avatar })),
    sessions: [...sessionsBySlot.values()].filter(s => s.expiresAt > now()).map(s => ({ slot: { id: s.slot.id, role: s.slot.role, name: s.slot.name, avatar: s.slot.avatar }, ticket: s.ticket, expiresAt: s.expiresAt, lastSeen: s.lastSeen })),
    positions, moveTimes, scores, signalQueues, signalTimes, party, active, wishes, rallyAt, dirty, festival,
    scheduledCelebration, journey, journeyStarted, journeyTravel, teleportVersion, privateJourneys,
    observerUpdated, birthdaySample, birthdaySpeed,
  });
  const restoreSnapshot = raw => {
    if (!raw || typeof raw !== 'object') return;
    const data = decodeSnapshot(raw);
    const slotStates = new Map((data.slotStates || []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const slot of slots) { const saved = slotStates.get(slot.id); if (saved && typeof saved.avatar === 'string') slot.avatar = partyAvatar(slot.role, cleanLabel(saved.avatar, 48) || slot.avatar); }
    for (const m of [sessionsBySlot, sessionsByTicket, positions, moveTimes, signalQueues, signalTimes, privateJourneys, observerUpdated]) m.clear();
    for (const saved of data.sessions || []) {
      if (!saved || typeof saved.ticket !== 'string' || typeof saved.slot?.id !== 'string' || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= now()) continue;
      const configured = slots.find(x => x.id === saved.slot.id);
      const slot = configured || (/^numbered-\d{1,10}$/.test(saved.slot.id) && saved.slot.role === 'guest' ? { id: saved.slot.id, role: 'guest', name: cleanLabel(saved.slot.name) || `Guest ${saved.slot.id.slice(9)}`, avatar: cleanLabel(saved.slot.avatar, 48) || 'g-petal', token: null } : null);
      if (!slot) continue;
      slot.avatar = partyAvatar(slot.role, slot.avatar);
      const session = { slot, ticket: saved.ticket, expiresAt: saved.expiresAt, lastSeen: Number.isFinite(saved.lastSeen) ? saved.lastSeen : now() };
      sessionsBySlot.set(slot.id, session); sessionsByTicket.set(session.ticket, session);
    }
    const assignMap = (dest, source) => { if (source instanceof Map) for (const [k, v] of source) dest.set(k, v); };
    assignMap(positions, data.positions); assignMap(moveTimes, data.moveTimes); assignMap(signalQueues, data.signalQueues); assignMap(signalTimes, data.signalTimes); assignMap(privateJourneys, data.privateJourneys); assignMap(observerUpdated, data.observerUpdated);
    if (data.scores && typeof data.scores === 'object') for (const role of ['birthday', 'guest', 'companion']) scores[role] = data.scores[role] || {};
    if (data.festival && festivalView(data.festival)) festival = data.festival;
    if (data.party) party = data.party; active = data.active ?? null; wishes = Array.isArray(data.wishes) ? data.wishes : [];
    rallyAt = data.rallyAt ?? null; dirty = !!data.dirty; scheduledCelebration = data.scheduledCelebration ?? null;
    if (data.journey) journey = data.journey; journeyStarted = !!data.journeyStarted; journeyTravel = data.journeyTravel ?? null;
    teleportVersion = Number.isInteger(data.teleportVersion) ? data.teleportVersion : 0;
    birthdaySample = data.birthdaySample ?? null; birthdaySpeed = Number.isFinite(data.birthdaySpeed) ? data.birthdaySpeed : 0;
    for (const session of sessionsBySlot.values()) if (!positions.has(session.slot.id)) positions.set(session.slot.id, initialPosition(session.slot));
    updateObservers(now());
  };
  const listPhotos = () => photos.map(p => ({ id: p.id, caption: p.caption, createdAt: p.createdAt }));
  const takePhoto = id => { const i = photos.findIndex(p => p.id === id); return i < 0 ? null : photos.splice(i, 1)[0]; };
  const addPhoto = photo => { if (photo && typeof photo.id === 'string' && Buffer.isBuffer(photo.publicImage)) photos.push(photo); while (photos.length > 28) photos.shift(); };
  const ackSignals = (slotId, ids) => {
    if (!sessionsBySlot.has(slotId) || !Array.isArray(ids) || ids.length > 256) return 0;
    const wanted = new Set(ids.filter(id => typeof id === 'string' && id.length <= 64));
    const queue = signalQueues.get(slotId) || []; const filtered = queue.filter(signal => !wanted.has(signal.id));
    signalQueues.set(slotId, filtered); return queue.length - filtered.length;
  };
  server.partyInternals = { handler, stateFor, sessionsBySlot, scores, getActive: () => active, positions, tickRoom, getJourney: () => journey, exportSnapshot, restoreSnapshot, listPhotos, takePhoto, addPhoto, ackSignals };
  if (snapshot) restoreSnapshot(snapshot);
  return server;
}

export function encodeSnapshot(value) {
  if (value instanceof Map) return { $type: 'Map', entries: [...value].map(([k, v]) => [encodeSnapshot(k), encodeSnapshot(v)]) };
  if (value instanceof Set) return { $type: 'Set', values: [...value].map(encodeSnapshot) };
  if (Array.isArray(value)) return value.map(encodeSnapshot);
  if (value && typeof value === 'object') { const out = {}; for (const [k, v] of Object.entries(value)) out[k] = encodeSnapshot(v); return out; }
  return value;
}
export function decodeSnapshot(value) {
  if (Array.isArray(value)) return value.map(decodeSnapshot);
  if (value && typeof value === 'object') {
    if (value.$type === 'Map' && Array.isArray(value.entries)) return new Map(value.entries.map(([k, v]) => [decodeSnapshot(k), decodeSnapshot(v)]));
    if (value.$type === 'Set' && Array.isArray(value.values)) return new Set(value.values.map(decodeSnapshot));
    const out = {}; for (const [k, v] of Object.entries(value)) out[k] = decodeSnapshot(v); return out;
  }
  return value;
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
if (typeof process !== 'undefined' && process.argv?.[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
