export const CHASE_GAME_IDS = Object.freeze(['tag', 'hide-and-seek', 'laser-tag']);
export const ARENA = Object.freeze({ center: Object.freeze({ x: 0, z: 0 }), radius: 50 });

const box = (x, y, z, w, h, d, name, existing = false) => Object.freeze({ name, existing, min: Object.freeze({ x: x - w / 2, y, z: z - d / 2 }), max: Object.freeze({ x: x + w / 2, y: y + h, z: z + d / 2 }) });
export const COVER = Object.freeze([
  box(-14, 0, -20, 7, 5, 7, 'west-north'), box(14, 0, -20, 7, 5, 7, 'east-north'),
  box(-14, 0, 20, 7, 5, 7, 'west-south'), box(14, 0, 20, 7, 5, 7, 'east-south'),
  box(0, 0, 0, 5, 14, 5, 'meadow-tree', true), box(18, 0, 6, 4, 1.4, 4, 'well', true), box(-26, 0, -14, 7, 12, 7, 'windmill', true),
]);

const DURATIONS = Object.freeze({ tag: 90_000, 'hide-and-seek': 120_000, 'laser-tag': 120_000 });
const validPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const distance3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const inside = (id, round) => typeof id === 'string' && round.publicIds.includes(id);
const statusFor = round => round.status;
const blankAction = () => ({ awards: [], events: [] });
const makeStatus = () => ({ health: 3, restUntil: 0, shieldUntil: 0 });

export function createChaseGame(game, publicPlayers, now = Date.now()) {
  if (!Object.hasOwn(DURATIONS, game)) throw Object.assign(new Error(`Unknown chase game: ${game}`), { status: 400 });
  if (!Array.isArray(publicPlayers)) throw Object.assign(new Error('publicPlayers must be an array.'), { status: 400 });
  const publicIds = [...new Set(publicPlayers.map(p => typeof p === 'string' ? p : p?.id).filter(id => typeof id === 'string' && id.length > 0))];
  if (publicIds.length < 2) throw Object.assign(new Error('Chase games need at least two public players.'), { status: 400 });
  const round = {
    game, startedAt: now, endsAt: now + DURATIONS[game], publicIds,
    itId: game === 'tag' ? publicIds[Math.floor(Math.random() * publicIds.length)] : null,
    seekerId: game === 'hide-and-seek' ? publicIds[0] : null,
    hideUntil: game === 'hide-and-seek' ? now + 20_000 : null,
    foundIds: new Set(), status: new Map(publicIds.map(id => [id, makeStatus()])),
    tagCooldowns: new Map(), laserCooldowns: new Map(), graceUntil: game === 'tag' ? now + 1500 : 0,
    events: [], finished: false, endAwarded: false,
  };
  if (game === 'laser-tag') round.status.forEach((s, id) => { s.health = 3; round.status.set(id, s); });
  return round;
}

// Segment/AABB slab test. The segment includes both endpoints.
function segmentBoxDistance(origin, direction, maxDistance, obstacle) {
  let lo = 0; let hi = maxDistance;
  for (const axis of ['x', 'y', 'z']) {
    const v = direction[axis]; const min = obstacle.min[axis]; const max = obstacle.max[axis];
    if (Math.abs(v) < 1e-9) { if (origin[axis] < min || origin[axis] > max) return Infinity; continue; }
    let a = (min - origin[axis]) / v; let b = (max - origin[axis]) / v;
    if (a > b) [a, b] = [b, a]; lo = Math.max(lo, a); hi = Math.min(hi, b);
    if (lo > hi) return Infinity;
  }
  return lo;
}

export function lineOfSight(from, to, cover = COVER) {
  if (!validPoint(from) || !validPoint(to)) return false;
  const contained = p => cover.some(o => p.x >= o.min.x && p.x <= o.max.x && p.y >= o.min.y && p.y <= o.max.y && p.z >= o.min.z && p.z <= o.max.z);
  if (contained(from) || contained(to)) return false;
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const length = Math.hypot(delta.x, delta.y, delta.z); if (length < 1e-6) return true;
  const dir = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
  return !cover.some(obstacle => segmentBoxDistance(from, dir, length, obstacle) < length - 1e-4 && segmentBoxDistance(from, dir, length, obstacle) > 1e-4);
}

function addEvent(round, event, now) {
  round.events = round.events.filter(e => now - e.at <= 2000);
  const item = { id: `${now}-${Math.random().toString(36).slice(2, 9)}`, at: now, ...event };
  round.events.push(item); round.events = round.events.slice(-32); return item;
}

function addAward(awards, id, points) {
  if (points > 0) awards.push({ id, points });
}

export function actionChase(round, actorId, body, positions, now = Date.now()) {
  const result = blankAction();
  if (!round || round.finished || now >= round.endsAt || !inside(actorId, round) || !body || typeof body.type !== 'string' || !(positions instanceof Map)) return result;
  const actor = positions.get(actorId); if (!validPoint(actor)) return result;

  if (round.game === 'tag' && body.type === 'tag') {
    if (actorId !== round.itId || now < round.graceUntil || now < (round.tagCooldowns.get(actorId) || 0)) return result;
    const targetId = body.targetId; const target = inside(targetId, round) && targetId !== actorId ? positions.get(targetId) : null;
    if (!validPoint(target) || distance3(actor, target) > 3.2 || Math.abs(actor.y - target.y) > 3 || !lineOfSight(actor, target)) return result;
    round.itId = targetId; round.graceUntil = now + 1500; round.tagCooldowns.set(targetId, now + 1500);
    addAward(result.awards, actorId, 1); result.events.push(addEvent(round, { type: 'tag', from: actorId, to: targetId }, now)); return result;
  }

  if (round.game === 'hide-and-seek' && body.type === 'seek') {
    if (actorId !== round.seekerId || now < round.hideUntil) return result;
    const targetId = body.targetId; const target = inside(targetId, round) && targetId !== actorId && !round.foundIds.has(targetId) ? positions.get(targetId) : null;
    if (!validPoint(target) || distance3(actor, target) > 5 || !lineOfSight(actor, target)) return result;
    round.foundIds.add(targetId); addAward(result.awards, actorId, 1);
    result.events.push(addEvent(round, { type: 'found', from: actorId, to: targetId }, now)); return result;
  }

  if (round.game === 'laser-tag' && body.type === 'laser') {
    if (now < (round.laserCooldowns.get(actorId) || 0)) return result;
    const actorStatus = round.status.get(actorId);
    if (!actorStatus || actorStatus.health <= 0 || now < actorStatus.restUntil) return result;
    const d = body.direction;
    if (!validPoint(d)) return result;
    const length = Math.hypot(d.x, d.y, d.z); if (!Number.isFinite(length) || length < 1e-5) return result;
    const dir = { x: d.x / length, y: d.y / length, z: d.z / length };
    const origin = { x: actor.x, y: actor.y + 0.9, z: actor.z };
    round.laserCooldowns.set(actorId, now + 700);
    const blockAt = Math.min(...COVER.map(o => segmentBoxDistance(origin, dir, 60, o)));
    let closest = null; let closestAt = Math.min(60, blockAt);
    for (const targetId of round.publicIds) {
      if (targetId === actorId) continue;
      const s = statusFor(round).get(targetId); const pos = positions.get(targetId);
      if (!s || s.health <= 0 || now < s.restUntil || now < s.shieldUntil || !validPoint(pos)) continue;
      const hitAt = rayCapsule(origin, dir, pos);
      if (hitAt !== null && hitAt <= 60 && hitAt < blockAt - 1e-4 && hitAt < closestAt) { closestAt = hitAt; closest = { id: targetId, status: s }; }
    }
    if (closest) {
      closest.status.health -= 1;
      const eliminated = closest.status.health <= 0;
      if (eliminated) { closest.status.health = 0; closest.status.restUntil = now + 4000; }
      else closest.status.shieldUntil = now + 2000;
      addAward(result.awards, actorId, 1 + (eliminated ? 3 : 0));
      const end = { x: origin.x + dir.x * closestAt, y: origin.y + dir.y * closestAt, z: origin.z + dir.z * closestAt };
      result.events.push(addEvent(round, { type: 'laser', from: actorId, to: closest.id, origin, hit: true, end }, now));
    } else {
      const endAt = Math.max(0, Math.min(60, blockAt));
      const end = { x: origin.x + dir.x * endAt, y: origin.y + dir.y * endAt, z: origin.z + dir.z * endAt };
      result.events.push(addEvent(round, { type: 'laser', from: actorId, origin, hit: false, end }, now));
    }
    return result;
  }
  return result;
}

// Ray against a vertical capsule approximating a 0.9 wide, 1.7 high avatar body.
function rayCapsule(origin, dir, base) {
  let best = null;
  const a = dir.x * dir.x + dir.z * dir.z;
  if (a > 1e-9) {
    const ox = origin.x - base.x; const oz = origin.z - base.z;
    const b = 2 * (ox * dir.x + oz * dir.z); const c = ox * ox + oz * oz - 0.9 * 0.9;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)]) {
      const y = origin.y + dir.y * t;
      if (t >= 0 && y >= base.y + 0.45 && y <= base.y + 1.25 && (best === null || t < best)) best = t;
    }
  }
  for (const cy of [base.y + 0.45, base.y + 1.25]) {
    const mx = origin.x - base.x; const my = origin.y - cy; const mz = origin.z - base.z;
    const b = mx * dir.x + my * dir.y + mz * dir.z; const c = mx * mx + my * my + mz * mz - 0.45 * 0.45;
    const disc = b * b - c; if (disc < 0) continue;
    const t = -b - Math.sqrt(disc); if (t >= 0 && (best === null || t < best)) best = t;
  }
  return best;
}

export function tickChase(round, now = Date.now()) {
  const awards = [];
  if (!round) return { awards, finished: true };
  if (round.finished) return { awards, finished: true };
  if (round.game === 'laser-tag') for (const status of round.status.values()) {
    if (status.health <= 0 && status.restUntil > 0 && now >= status.restUntil) { status.health = 3; status.restUntil = 0; status.shieldUntil = now + 2000; }
  }
  round.events = round.events.filter(e => now - e.at <= 2000).slice(-32);
  if (round.game === 'hide-and-seek') {
    const hiders = round.publicIds.filter(id => id !== round.seekerId);
    if (hiders.length > 0 && hiders.every(id => round.foundIds.has(id))) { round.finished = true; round.endAwarded = true; }
    else if (now >= round.endsAt && !round.endAwarded) {
      for (const id of hiders) if (!round.foundIds.has(id)) addAward(awards, id, 2);
      round.endAwarded = true; round.finished = true;
    }
  } else if (round.game === 'tag' && now >= round.endsAt && !round.endAwarded) {
    for (const id of round.publicIds) if (id !== round.itId) addAward(awards, id, 2);
    round.endAwarded = true; round.finished = true;
  } else if (now >= round.endsAt) round.finished = true;
  return { awards, finished: round.finished };
}

export function canMoveChase(round, actorId, now = Date.now()) {
  if (!round || round.finished || !inside(actorId, round) || now >= round.endsAt) return false;
  if (round.game === 'hide-and-seek' && actorId === round.seekerId && now < round.hideUntil) return false;
  if (round.game === 'hide-and-seek' && round.foundIds.has(actorId)) return false;
  if (round.game === 'laser-tag') {
    const s = round.status.get(actorId); if (!s || s.health <= 0 || now < s.restUntil) return false;
  }
  return true;
}

export function canSeeChase(round, viewerId, targetId, positions, now = Date.now()) {
  if (!round || !inside(viewerId, round) || !inside(targetId, round)) return false;
  if (viewerId === targetId || round.game !== 'hide-and-seek' || viewerId !== round.seekerId || round.foundIds.has(targetId)) return true;
  if (now < round.hideUntil) return false;
  const viewer = positions.get(viewerId); const target = positions.get(targetId);
  return validPoint(viewer) && validPoint(target) && distance3(viewer, target) <= 18 && lineOfSight(viewer, target);
}

export function chaseView(round, viewerId, positions, now = Date.now()) {
  if (!round || !inside(viewerId, round)) return null;
  const publicStatus = {};
  for (const id of round.publicIds) {
    const s = round.status.get(id); if (s) publicStatus[id] = { health: s.health, restUntil: s.restUntil, shieldUntil: s.shieldUntil };
  }
  const selfStatus = publicStatus[viewerId] || { health: 3, restUntil: 0, shieldUntil: 0 };
  const events = round.events.filter(e => now - e.at <= 2000 && canSeeChase(round, viewerId, e.from, positions, now) && (!e.to || canSeeChase(round, viewerId, e.to, positions, now))).slice(-32);
  return {
    kind: round.game, startedAt: round.startedAt, endsAt: round.endsAt,
    ...(round.itId ? { itId: round.itId } : {}), ...(round.seekerId ? { seekerId: round.seekerId, hideUntil: round.hideUntil, foundIds: [...round.foundIds] } : {}),
    publicStatus, self: { ...selfStatus, canMove: canMoveChase(round, viewerId, now) }, events,
  };
}

export function updateChasePlayers(round, publicIDs, now = Date.now()) {
  if (!round || !Array.isArray(publicIDs)) return round;
  const ids = [...new Set(publicIDs.filter(id => typeof id === 'string' && id.length > 0))];
  const previous = round.publicIds; round.publicIds = ids;
  for (const id of ids) if (!round.status.has(id)) round.status.set(id, makeStatus());
  for (const id of previous) if (!ids.includes(id)) { round.status.delete(id); round.tagCooldowns.delete(id); round.laserCooldowns.delete(id); round.foundIds.delete(id); }
  if (round.game === 'tag' && !ids.includes(round.itId)) { round.itId = ids[0] || null; round.graceUntil = now + 1500; }
  if (round.game === 'hide-and-seek' && !ids.includes(round.seekerId)) { round.seekerId = ids[0] || null; round.hideUntil = now + 20_000; round.foundIds.delete(round.seekerId); }
  if (ids.length < 2) round.finished = true;
  return round;
}
