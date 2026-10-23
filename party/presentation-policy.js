import { SIBLINGS } from '../src/caravan/caravan.ts';

const PRIVATE_ROLES = new Set(['guest', 'companion', 'observer']);
const cleanName = (value, fallback) => typeof value === 'string'
  ? value.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 36) || fallback
  : fallback;

/**
 * Party-specific presentation and persistence policy for the original Golden Thread game.
 * Call prepareState only after the original save deserializer has hydrated legacy defaults.
 */
export function partyPresentation(self = {}) {
  const role = self.role || 'guest';
  const birthday = role === 'birthday';
  const privateIds = new Set([
    ...(Array.isArray(self.knownPrivateIDs) ? self.knownPrivateIDs : []),
    ...(Array.isArray(self.knownPrivateIds) ? self.knownPrivateIds : []),
  ].filter(id => typeof id === 'string'));
  const siblingIds = new Set(SIBLINGS.map(sibling => sibling.id));
  const displayName = cleanName(self.name, birthday ? 'Birthday' : 'Traveller');
  const saveId = typeof self.id === 'string' && self.id.trim() ? self.id.trim() : 'anonymous';

  return Object.freeze({
    saveKey: `golden-thread/party/v2/${encodeURIComponent(saveId)}`,
    allowPersonalNarrative: birthday,
    readOnly: role === 'observer',
    prepareState(loadedState) {
      if (!loadedState || typeof loadedState !== 'object' || Array.isArray(loadedState)) {
        throw new TypeError('Expected a deserialized Golden Thread state object.');
      }
      const state = { ...loadedState };
      state.names = { ...(loadedState.names || {}), girl: displayName, boy: birthday ? 'AbdulAzim' : 'Traveller' };

      if (Array.isArray(loadedState.caravan)) {
        state.caravan = birthday
          ? loadedState.caravan.slice()
          : loadedState.caravan.filter(id => !siblingIds.has(id) && !privateIds.has(id));
      } else if (loadedState.caravan && typeof loadedState.caravan === 'object') {
        const caravan = { ...loadedState.caravan };
        for (const key of ['members', 'ids', 'companions']) {
          if (Array.isArray(caravan[key])) {
            caravan[key] = birthday
              ? caravan[key].slice()
              : caravan[key].filter(id => !siblingIds.has(id) && !privateIds.has(id));
          }
        }
        state.caravan = caravan;
      }
      return state;
    },
  });
}
