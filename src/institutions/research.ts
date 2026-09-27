import { DAY_MINUTES, type GameState } from '../core/state';
import { level, removeItems } from '../economy/economy';
import { ITEMS, LEVEL_XP, SKILLS } from '../economy/items';
import { folkOf } from '../npc/folk';
import { REGION_BY_ID, REGIONS, type RegionId } from '../world/regions';
import { INSTITUTE_BY_KIND, type InstituteKind } from './catalogue';
import { SITE_BY_ID } from './sites';

/**
 * Research under a professor (owner's brief — NEXT_WORK C4: "researching, thesis from professors,
 * working under them … magic thesis, scientific thesis"). Every land's own institute has a
 * professor. The travellers can work as the professor's research assistant (paid, and learning),
 * and — once they know enough — take on a thesis: a scientific thesis in the land's science, or a
 * magic thesis at the Meadow's school of wizardry and the Sky Isles' college of light. A thesis is
 * worked on day by day at the institute, faster the more skilled they are, using the land's own
 * materials; finishing it earns a degree, an invention of their own and a purse from the institute.
 *
 * Pure rules over GameState (tests/research.test.ts).
 */

export interface Topic { id: string; science: InstituteKind; title: string; magic: boolean; invention: string }

const T = (science: InstituteKind, magic: boolean, list: Array<[string, string]>): Topic[] =>
  list.map(([title, invention], i) => ({ id: `${science}-${i}`, science, title, magic, invention }));

export const TOPICS: Topic[] = [
  ...T('magic', true, [['Light that makes flowers open at night', 'Moonbloom lantern'], ['Bridges woven from cloud', 'Cloud-thread bridge'], ['Lanterns that remember a kindness', 'Keepsake lantern']]),
  ...T('lightcraft', true, [['Splitting starlight into rainbows', 'Starlight prism'], ['A lamp that never needs oil', 'Everlight']]),
  ...T('tea', false, [['Joints that hold without a single nail', 'Kigumi puzzle joint'], ['The chemistry of a perfect cup of tea', 'Tea-steeping clock']]),
  ...T('celadon', false, [['The jade glaze of Goryeo celadon', 'Jade glaze recipe'], ['Movable metal type for faster printing', 'Metal type press']]),
  ...T('tcm', false, [['Herbs that ease a winter cough', 'Herbal cough syrup'], ['A map of the body’s meridians', 'Meridian chart']]),
  ...T('shipwright', false, [['Clinker hulls that ride the waves', 'Clinker hull design'], ['Fishing that leaves fish for tomorrow', 'Sustainable fishing net']]),
  ...T('watchmaking', false, [['An escapement that keeps time in the cold', 'Cold-proof escapement'], ['A self-winding movement', 'Self-winding watch']]),
  ...T('engineering', false, [['A pump that lifts water with less work', 'Efficient pump'], ['Bridges of iron that stand for centuries', 'Iron truss design']]),
  ...T('tech', false, [['Solar skins for every tower', 'Solar skin panel'], ['A computer that fits in a pocket', 'Pocket computer']]),
  ...T('anatomy', false, [['Perspective and how the eye sees', 'Perspective grid'], ['The flight of birds, drawn from life', 'Flying-machine sketches']]),
  ...T('radio', false, [['Valves that carry a voice across the sea', 'Long-wave radio'], ['A telephone for every street', 'Street telephone exchange']]),
  ...T('islamicsciences', false, [['The optics of light (after Ibn al-Haytham)', 'Camera obscura'], ['An astrolabe for every traveller', 'Traveller’s astrolabe'], ['Algebra for fair shares of an inheritance', 'Fair-share tables']]),
  ...T('navigation', false, [['Finding the way by the stars at sea', 'Star compass'], ['Sweet water from the sea', 'Solar still']]),
  ...T('irrigation', false, [['Measuring the Nile’s flood', 'Flood gauge'], ['Lifting water with the shaduf and the screw', 'Water screw']]),
  ...T('starlore', false, [['Finding water under the sand', 'Water-finding rod'], ['Stars that guide the caravans', 'Caravan star chart']]),
  ...T('ayurveda', false, [['Herbs of the three doshas', 'Ayurvedic herbal'], ['Giant instruments that measure the sky', 'Sundial of Jaipur']]),
  ...T('siddha', false, [['Spices that heal', 'Spice remedy'], ['Growing pepper in the shade of coconut palms', 'Shade-grown pepper']]),
  ...T('gardens', false, [['Fountains that run without pumps', 'Gravity fountain'], ['Colours ground from stones for miniature painting', 'Stone pigments']]),
  ...T('subak', false, [['Sharing water fairly down the terraces', 'Subak water calendar'], ['Wax-resist dyeing of batik', 'Batik tjanting']]),
  ...T('polar', false, [['Why the aurora dances', 'Aurora forecaster'], ['Keeping warm in the long night', 'Heat-keeping hut']]),
];
export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

/** The professor at each land's own institute. */
export const PROFESSORS: Record<RegionId, string> = Object.fromEntries(REGIONS.map((r, i) => [r.id, `Professor ${folkOf(r.id, 900 + i * 5, 0).name}`])) as Record<RegionId, string>;

/** Skill level needed to take on a thesis, and to assist a professor. */
export const THESIS_LEVEL = 2, ASSIST_LEVEL = 1;
export const THESIS_HOURS = 5, ASSIST_HOURS = 4;

function scienceAt(siteId: string): InstituteKind | null {
  const s = SITE_BY_ID[siteId];
  if (!s?.established) return null;
  const def = Object.values(INSTITUTE_BY_KIND).find((d) => d.land === s.land);
  return def?.kind ?? null;
}

export const topicsAt = (siteId: string): Topic[] => { const k = scienceAt(siteId); return k ? TOPICS.filter((t) => t.science === k) : []; };

function addXp(st: GameState, skill: keyof GameState['skills'], xp: number): void {
  st.skills[skill] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], st.skills[skill] + xp);
}

/** Work as the professor's research assistant for a few hours: paid, and you learn. */
export function assist(st: GameState, siteId: string): string | null {
  const k = scienceAt(siteId);
  if (!k) return 'Research happens at the town’s institute.';
  const skill = INSTITUTE_BY_KIND[k].skill;
  if (level(st, skill) < ASSIST_LEVEL) return `The professor needs an assistant with ${SKILLS[skill].name} level ${ASSIST_LEVEL} — take a course first.`;
  st.coins += 12 + level(st, skill) * 3;
  addXp(st, skill, 14);
  st.minutes += ASSIST_HOURS * 60;
  return null;
}

/** Take on a thesis under the professor (one at a time). */
export function startThesis(st: GameState, siteId: string, topicId: string): string | null {
  const t = TOPIC_BY_ID[topicId], k = scienceAt(siteId);
  if (!t || !k || t.science !== k) return 'The professor does not supervise that topic here.';
  if (st.thesis) return `You are already writing “${TOPIC_BY_ID[st.thesis.topic]?.title}”.`;
  if (st.degrees.includes(topicId)) return 'You have already written this thesis.';
  const skill = INSTITUTE_BY_KIND[k].skill;
  if (level(st, skill) < THESIS_LEVEL) return `A thesis needs ${SKILLS[skill].name} level ${THESIS_LEVEL}. Assist the professor or take courses first.`;
  st.thesis = { topic: topicId, site: siteId, progress: 0, day: -1 };
  return null;
}

/** How much a day's work moves the thesis on, by skill level. */
export const dayProgress = (lvl: number): number => 12 + lvl * 6;

/**
 * A day's work on the thesis at its institute (once a day; uses one of the land's own materials).
 * Returns the finished topic when it is done, or an error.
 */
export function workOnThesis(st: GameState, siteId: string): { error: string } | { progress: number; done: Topic | null } {
  const th = st.thesis;
  if (!th) return { error: 'You have no thesis yet.' };
  if (th.site !== siteId) return { error: 'Your thesis is supervised at another institute.' };
  const today = Math.floor(st.minutes / DAY_MINUTES);
  if (th.day === today) return { error: 'You have worked on it today — rest your mind until tomorrow.' };
  const t = TOPIC_BY_ID[th.topic], site = SITE_BY_ID[siteId], skill = INSTITUTE_BY_KIND[t.science].skill;
  const mat = REGION_BY_ID[site.land].materials[0];
  if (!removeItems(st, { [mat]: 1 })) return { error: `Today's work needs 1× ${ITEMS[mat].name} for your experiments.` };
  th.day = today;
  th.progress = Math.min(100, th.progress + dayProgress(level(st, skill)));
  addXp(st, skill, 20);
  st.minutes += THESIS_HOURS * 60;
  if (th.progress < 100) return { progress: th.progress, done: null };
  st.degrees.push(t.id);
  st.inventions.push(t.invention);
  st.coins += 150;
  st.thesis = null;
  return { progress: 100, done: t };
}
