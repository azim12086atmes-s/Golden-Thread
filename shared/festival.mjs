const PUBLIC_ROLES = new Set(['birthday', 'guest']);
const HOST_ROLES = new Set(['birthday', 'companion']);
const STORY_LANDS = new Set([
  'meadow', 'japan', 'korea', 'china', 'norway', 'switzerland', 'london', 'newyork',
  'renaissance', 'vintage', 'islamic', 'middleeast', 'desert', 'egypt', 'indianorth',
  'indiasouth', 'mughal', 'indonesia', 'aurora', 'skyisles',
]);
const GAMES = new Set([
  'lantern-hunt', 'bridge-dash', 'starlight-memory', 'sky-rings', 'cake-courier',
  'starlight-statues', 'tag', 'hide-and-seek', 'laser-tag',
]);
const MAX_EVENT_IDS = 128;
const MAX_ROUNDS = 90;
const MAX_LANTERNS = 10_000;

const validNow = n => Number.isFinite(n) && n >= 0;
const validId = s => typeof s === 'string' && s.length > 0 && s.length <= 128;
const clone = value => JSON.parse(JSON.stringify(value));

/** Create the optional birthday finale. No story chapters or minigames are prerequisites. */
export function createFestival(now = Date.now()) {
  if (!validNow(now)) throw new TypeError('Festival time must be a finite non-negative number.');
  return {
    version: 1,
    phase: 'lobby',
    stage: 'waiting',
    createdAt: now,
    startedAt: null,
    lanternActors: [],
    candlesAt: null,
    cakeCutAt: null,
    completedAt: null,
    storyBeacons: [],
    keepsakes: [],
    eventIds: [],
  };
}

/**
 * Apply one server-authorized festival event without mutating the supplied state.
 * Actor ids are retained only in private engine state; festivalView never returns them.
 */
export function advanceFestival(state, event, actor, now = Date.now()) {
  if (!isFestival(state) || !event || typeof event !== 'object' || !actor || !validId(actor.id) || !validNow(now)) return null;
  if (!['birthday', 'companion', 'guest', 'observer'].includes(actor.role)) return null;
  if (actor.role === 'observer') return null;

  const next = clone(state);
  const eventId = event.eventId;
  if (eventId !== undefined && !validId(eventId)) return null;
  if (eventId && next.eventIds.includes(eventId)) return { state: next, result: { duplicate: true } };

  const done = (result = {}) => {
    if (eventId) next.eventIds = [...next.eventIds, eventId].slice(-MAX_EVENT_IDS);
    return { state: next, result: { duplicate: false, ...result } };
  };
  const duplicate = (result = {}) => ({ state: next, result: { duplicate: true, ...result } });

  switch (event.type) {
    case 'enter-celebration': {
      if (!HOST_ROLES.has(actor.role)) return null;
      if (next.phase !== 'lobby') return duplicate({ stage: next.stage });
      next.phase = 'celebration'; next.stage = 'lanterns'; next.startedAt = now;
      return done({ stage: next.stage });
    }
    case 'release-lantern': {
      if (!PUBLIC_ROLES.has(actor.role) || next.phase !== 'celebration' || next.stage !== 'lanterns') return null;
      if (next.lanternActors.includes(actor.id)) return duplicate({ lanternsReleased: next.lanternActors.length });
      if (next.lanternActors.length >= MAX_LANTERNS) return null;
      next.lanternActors.push(actor.id);
      return done({ lanternsReleased: next.lanternActors.length });
    }
    case 'blow-candles': {
      if (actor.role !== 'birthday' || next.phase !== 'celebration') return null;
      if (next.stage !== 'lanterns') return next.candlesAt !== null ? duplicate({ stage: next.stage }) : null;
      next.candlesAt = now; next.stage = 'cake';
      return done({ stage: next.stage });
    }
    case 'cut-cake': {
      if (actor.role !== 'birthday' || next.phase !== 'celebration') return null;
      if (next.stage !== 'cake') return next.cakeCutAt !== null ? duplicate({ stage: next.stage }) : null;
      next.cakeCutAt = now; next.stage = 'fireworks';
      return done({ stage: next.stage });
    }
    case 'finish-finale': {
      if (!HOST_ROLES.has(actor.role) || next.phase !== 'celebration') return null;
      if (next.stage === 'afterparty') return duplicate({ stage: next.stage });
      if (next.stage !== 'fireworks') return null;
      next.stage = 'afterparty'; next.completedAt = now;
      return done({ stage: next.stage });
    }
    case 'round-completed': {
      if (!PUBLIC_ROLES.has(actor.role) || !GAMES.has(event.game) || !validId(event.roundId)) return null;
      if (next.keepsakes.some(item => item.roundId === event.roundId)) return duplicate({ keepsakeCount: next.keepsakes.length });
      next.keepsakes.push({ game: event.game, roundId: event.roundId, completedAt: now });
      next.keepsakes = next.keepsakes.slice(-MAX_ROUNDS);
      return done({ keepsakeCount: next.keepsakes.length });
    }
    case 'beacon-lit': {
      if (!PUBLIC_ROLES.has(actor.role) || !STORY_LANDS.has(event.region)) return null;
      if (next.storyBeacons.includes(event.region)) return duplicate({ beaconsLit: next.storyBeacons.length });
      next.storyBeacons.push(event.region);
      return done({ beaconsLit: next.storyBeacons.length });
    }
    default:
      return null;
  }
}

/** Public-safe view: no player identities, wishes, private-role data, or round ids. */
export function festivalView(state) {
  if (!isFestival(state)) return null;
  const allBeacons = state.storyBeacons.length >= STORY_LANDS.size;
  return {
    phase: state.phase,
    stage: state.stage,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    lanternsReleased: state.lanternActors.length,
    candlesBlown: state.candlesAt !== null,
    cakeCut: state.cakeCutAt !== null,
    fireworksReady: state.stage === 'fireworks' || state.stage === 'afterparty',
    afterparty: state.stage === 'afterparty',
    keepsakes: state.keepsakes.map(item => ({ game: item.game, completedAt: item.completedAt })),
    optionalStory: {
      beaconsLit: state.storyBeacons.length,
      totalBeacons: STORY_LANDS.size,
      message: allBeacons
        ? 'The twenty-land lantern journey is shining. This birthday celebration is its own happy ending.'
        : 'The twenty-land lantern journey is an optional part of the evening. The birthday celebration can begin whenever you are ready.',
    },
  };
}

function isFestival(s) {
  const timestamp = value => value === null || validNow(value);
  return !!s && s.version === 1 && ['lobby', 'celebration'].includes(s.phase) &&
    ['waiting', 'lanterns', 'cake', 'fireworks', 'afterparty'].includes(s.stage) &&
    validNow(s.createdAt) && timestamp(s.startedAt) && timestamp(s.candlesAt) &&
    timestamp(s.cakeCutAt) && timestamp(s.completedAt) &&
    Array.isArray(s.lanternActors) && Array.isArray(s.storyBeacons) &&
    Array.isArray(s.keepsakes) && Array.isArray(s.eventIds) &&
    s.lanternActors.length <= MAX_LANTERNS && s.lanternActors.every(validId) && new Set(s.lanternActors).size === s.lanternActors.length &&
    s.storyBeacons.length <= STORY_LANDS.size && s.storyBeacons.every(id => STORY_LANDS.has(id)) && new Set(s.storyBeacons).size === s.storyBeacons.length &&
    s.keepsakes.length <= MAX_ROUNDS && s.keepsakes.every(item => item && GAMES.has(item.game) && validId(item.roundId) && validNow(item.completedAt)) &&
    s.eventIds.length <= MAX_EVENT_IDS && s.eventIds.every(validId) && new Set(s.eventIds).size === s.eventIds.length &&
    (s.phase === 'lobby'
      ? s.stage === 'waiting' && s.startedAt === null
      : s.stage !== 'waiting' && validNow(s.startedAt)) &&
    (s.stage === 'waiting' ? s.candlesAt === null && s.cakeCutAt === null && s.completedAt === null : true) &&
    (s.cakeCutAt === null || s.candlesAt !== null) &&
    (s.completedAt === null || s.cakeCutAt !== null);
}
