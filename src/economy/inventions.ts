import { DAY_MINUTES, type GameState } from '../core/state';
import { PLOT_BY_ID, FIELD_BY_ID } from '../world/plots';
import { REGION_BY_ID } from '../world/regions';
import { addItem } from './economy';

/**
 * What your inventions do (owner's brief: "the inventions must have a real effect — everything you
 * learn is a skill that can be applied to build and use"). An invention is first made (manufacture.ts)
 * and then put to use: a tool you carry works everywhere (a star compass speeds every courier), a
 * thing built at a home works for the people who live there (an everlight, a heat-keeping hut, a
 * solar skin that earns from the sun), and a thing built in a field works on its crop (a pump, a
 * water screw). Each is used up from what you made, and each kind of good stacks only so far.
 * Pure rules (tests/inventions.test.ts); the other systems ask `bonus()` for their effect.
 */
export type Effect = 'growth' | 'harvest' | 'travel' | 'comfort' | 'heal' | 'power' | 'clients' | 'craft' | 'build' | 'research' | 'catch' | 'fair';
export type Place = 'you' | 'home' | 'field';
export interface Use { effect: Effect; place: Place; amount: number; does: string }

const U = (effect: Effect, place: Place, amount: number, does: string): Use => ({ effect, place, amount, does });

export const USES: Record<string, Use> = {
  // Magic and light.
  'Moonbloom lantern': U('comfort', 'home', 4, 'Flowers open round your home at night; those who live there thrive'),
  'Cloud-thread bridge': U('travel', 'you', 0.15, 'Bridges of cloud shorten every road your couriers take'),
  'Keepsake lantern': U('comfort', 'home', 4, 'A lantern that remembers kindness; those who live there thrive'),
  'Starlight prism': U('research', 'you', 0.15, 'Starlight split for your studies: theses go faster'),
  Everlight: U('comfort', 'home', 5, 'A lamp that never needs oil keeps your home bright and warm'),
  // Crafts and trade.
  'Kigumi puzzle joint': U('build', 'you', 0.25, 'Joints without nails: the floors you build go up faster'),
  'Tea-steeping clock': U('clients', 'you', 0.1, 'Perfect tea on time: more clients come to your businesses'),
  'Jade glaze recipe': U('craft', 'you', 0.15, 'A glaze everyone wants: your products sell for more'),
  'Metal type press': U('clients', 'you', 0.15, 'Printed notices bring more clients to your businesses'),
  'Perspective grid': U('craft', 'you', 0.1, 'Truer drawings: your products sell for more'),
  'Stone pigments': U('craft', 'you', 0.15, 'Colours ground from stone: your products sell for more'),
  'Batik tjanting': U('craft', 'you', 0.15, 'Wax-resist patterns: your products sell for more'),
  'Self-winding watch': U('clients', 'you', 0.1, 'Never late: more clients come to your businesses'),
  'Pocket computer': U('clients', 'you', 0.2, 'Orders by message: more clients come to your businesses'),
  'Street telephone exchange': U('clients', 'you', 0.2, 'Clients can call you: more come to your businesses'),
  'Iron truss design': U('build', 'you', 0.25, 'Iron trusses: the floors you build go up faster'),
  // Healing.
  'Herbal cough syrup': U('heal', 'you', 0.25, 'Your clinics heal more people each day'),
  'Meridian chart': U('heal', 'you', 0.2, 'Your clinics heal more people each day'),
  'Ayurvedic herbal': U('heal', 'you', 0.2, 'Your clinics heal more people each day'),
  'Spice remedy': U('heal', 'you', 0.2, 'Your clinics heal more people each day'),
  // The way across land and sea.
  'Clinker hull design': U('travel', 'you', 0.15, 'Hulls that ride the waves: your ships sail faster'),
  'Cold-proof escapement': U('travel', 'you', 0.1, 'Clocks that keep time in the snow: your couriers keep to time'),
  'Long-wave radio': U('travel', 'you', 0.1, 'Couriers told the way ahead: deliveries come sooner'),
  'Traveller’s astrolabe': U('travel', 'you', 0.15, 'Your couriers find the way by the stars'),
  'Star compass': U('travel', 'you', 0.15, 'Your ships steer by the stars and arrive sooner'),
  'Caravan star chart': U('travel', 'you', 0.1, 'Your caravans cross the deserts sooner'),
  'Sustainable fishing net': U('catch', 'you', 2, 'A catch each day that leaves fish for tomorrow: stew for your stores'),
  // Home and field.
  'Solar skin panel': U('power', 'home', 8, 'Sunlight on your roof: your home earns coins every day'),
  'Solar still': U('comfort', 'home', 4, 'Sweet water from the sea for everyone who lives there'),
  'Gravity fountain': U('comfort', 'home', 4, 'A fountain in the courtyard, with no pump'),
  'Heat-keeping hut': U('comfort', 'home', 5, 'Warm through the longest night'),
  'Efficient pump': U('growth', 'field', 0.3, 'Water with less work: the crop grows faster'),
  'Water screw': U('growth', 'field', 0.3, 'Water lifted to every row: the crop grows faster'),
  'Subak water calendar': U('growth', 'field', 0.25, 'Water shared fairly down the rows: the crop grows faster'),
  'Flood gauge': U('harvest', 'field', 0.2, 'Planting timed to the flood: a bigger harvest'),
  'Water-finding rod': U('harvest', 'field', 0.25, 'Water found under the ground: a bigger harvest'),
  'Shade-grown pepper': U('harvest', 'field', 0.25, 'Pepper grown in the crop’s shade: a bigger harvest'),
  // Study and charity.
  'Flying-machine sketches': U('research', 'you', 0.2, 'Drawn from life: theses go faster'),
  'Camera obscura': U('research', 'you', 0.2, 'Light studied in a dark room: theses go faster'),
  'Sundial of Jaipur': U('research', 'you', 0.15, 'The sky measured: theses go faster'),
  'Aurora forecaster': U('research', 'you', 0.15, 'The aurora foretold: theses go faster'),
  'Fair-share tables': U('fair', 'you', 0.2, 'Fair shares: every coin you give buys more days of care'),
};

/** How far each good stacks. */
export const CAP: Record<Effect, number> = { growth: 0.8, harvest: 0.6, travel: 0.4, comfort: 12, heal: 0.8, power: 40, clients: 0.6, craft: 0.5, build: 0.5, research: 0.6, catch: 8, fair: 0.3 };

/** What catch brings in (a stew of the day's fish). */
export const CATCH_ITEM = 'curry';

export type Installed = GameState['installed'][number];

const ownsHome = (st: GameState, plotId: string) => !!st.plots[plotId]?.decor.some((d) => d.kind.startsWith('house-'));

/** Where an invention can be put to use: 'you', a home you own, or a field you own. */
export function placeName(at: string): string {
  if (at === 'you') return 'carried with you';
  const p = PLOT_BY_ID[at];
  if (p) return `your home in ${REGION_BY_ID[p.region].name}`;
  const f = FIELD_BY_ID[at];
  return f ? `your field in ${REGION_BY_ID[f.land].name}` : at;
}

/** Put one you have made to use. */
export function putToUse(st: GameState, invention: string, at: string): string | null {
  const u = USES[invention];
  if (!u) return 'That has no use yet.';
  if (!st.inventions.includes(invention)) return 'You have not invented that yet.';
  if (!(st.products[invention] > 0)) return `Make a ${invention} first.`;
  if (u.place === 'you' && at !== 'you') return 'You carry this one with you.';
  if (u.place === 'home' && !ownsHome(st, at)) return 'It is built at a home of yours.';
  if (u.place === 'field' && !st.fields[at]) return 'It is built in a field of yours.';
  if (st.installed.some((i) => i.invention === invention && i.at === at)) return u.place === 'you' ? 'You already carry one.' : 'There is one here already.';
  st.products[invention]--;
  st.installed.push({ invention, at, day: Math.floor(st.minutes / DAY_MINUTES) });
  return null;
}

/** The good an effect does: what you carry, plus what is built at `at` (a home or a field). */
export function bonus(st: GameState, effect: Effect, at?: string): number {
  let v = 0;
  for (const i of st.installed ?? []) {
    const u = USES[i.invention];
    if (u?.effect === effect && (i.at === 'you' || i.at === at)) v += u.amount;
  }
  return Math.min(CAP[effect], v);
}

/** Each new day: roofs earn from the sun, nets bring in a catch. */
export function tickInventions(st: GameState): Array<{ text: string }> {
  const out: Array<{ text: string }> = [], d = Math.floor(st.minutes / DAY_MINUTES);
  let coins = 0, caught = 0;
  for (const i of st.installed) {
    const u = USES[i.invention], days = Math.min(7, d - i.day);
    if (!u || days <= 0) continue;
    i.day = d;
    if (u.effect === 'power' && ownsHome(st, i.at)) coins += u.amount * days;
    if (u.effect === 'catch') caught += u.amount * days;
  }
  if (coins) { st.coins += coins; out.push({ text: `☀️ The solar skins on your roofs earned ${coins} coins.` }); }
  if (caught) { addItem(st, CATCH_ITEM, Math.min(CAP.catch, caught)); out.push({ text: `🎣 Your nets brought in a catch — ${Math.min(CAP.catch, caught)} pots of stew for your stores.` }); }
  return out;
}

/** Where to put an invention to use from here: carried, or at a home or field of yours (this town's first). */
export function placesFor(st: GameState, invention: string, land: string): string[] {
  const u = USES[invention];
  if (!u) return [];
  if (u.place === 'you') return ['you'];
  const ids = u.place === 'home'
    ? Object.keys(st.plots).filter((id) => ownsHome(st, id))
    : Object.keys(st.fields);
  const landOf = (id: string) => PLOT_BY_ID[id]?.region ?? FIELD_BY_ID[id]?.land;
  return ids.filter((id) => !st.installed.some((i) => i.invention === invention && i.at === id)).sort((a, b) => Number(landOf(b) === land) - Number(landOf(a) === land));
}
