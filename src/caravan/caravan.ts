import type { SpeciesId } from '../animals/AnimalModel';
import type { LandId } from '../atlas/schema';

/**
 * The caravan (OPUS_002). Owner request: "use other characters of children and pets that follow
 * us in the game so we are not alone — dogs, cats, birds from different regions we befriend."
 *
 * Children join as apprentices or travellers-to-family, always with their guardians' blessing,
 * and go home again at a milestone. They come from many cultures and traditions, honoured in
 * their own names and customs (only the two travellers are Muslim). Pets are befriended with a
 * food they like. Everyone keeps a clear space around the two travellers and around each other.
 * Names and people are fictional. Pure data + pure movement; the renderer places the models.
 */

export type CompanionHelp = 'finds-resources' | 'carries-letters' | 'lifts-spirits' | 'herds-animals' | 'learns-craft';

interface Base {
  id: string;
  name: string;
  origin: LandId;
  help: CompanionHelp;
  blurb: string;
}

export interface PetDef extends Base {
  kind: 'pet';
  species: Extract<SpeciesId, 'dog' | 'cat' | 'dove'>;
  /** Body tint for the model (hex). */
  tint: string;
  /** Item from src/economy/items.ts that wins its trust. */
  likes: 'bread' | 'milk' | 'rice';
  scale: number;
  /** Travels with you from the first morning. */
  starts?: boolean;
}

export interface ChildDef extends Base {
  kind: 'child';
  who: 'girl' | 'boy';
  /** Their family's own tradition — shown on their card, and the festivals they keep. */
  tradition: string;
  /** Why they travel, and the guardian who gave their blessing. */
  journey: string;
  /** The land whose Keeper chapter must be complete before they join. */
  joinsAfter: LandId;
  /** Where the caravan brings them — they go home or stay there with family. */
  destination: LandId;
  /** Travels with you from the first morning. */
  starts?: boolean;
}

/**
 * Their brothers and sisters (owner's list), who travel with the two from the first morning and
 * stay with them all the way: never going home at a milestone, walking just behind them, riding their
 * own carpet when the two fly. Heights are set against the two travellers' (as at the party):
 * `rise` places each between her height (0) and his (1); below 0 is shorter than her.
 */
export interface SiblingDef extends Base {
  kind: 'sibling';
  who: 'girl' | 'boy';
  outfit: string;
  skin: string;
  rise: number;
}

export type CompanionDef = PetDef | ChildDef | SiblingDef;

export const PETS: PetDef[] = [
  { kind: 'pet', id: 'pet-saluki', name: 'Rih', species: 'dog', tint: '#e2c79a', likes: 'bread', scale: 1.1, origin: 'desert', help: 'finds-resources', blurb: 'A slender desert sighthound who spots things across the dunes long before you do.' },
  { kind: 'pet', id: 'pet-shiba', name: 'Kuri', species: 'dog', tint: '#d9894a', likes: 'rice', scale: 0.9, origin: 'japan', help: 'finds-resources', blurb: 'A foxy little dog who is certain every bush hides something good.' },
  { kind: 'pet', id: 'pet-jindo', name: 'Baekgu', species: 'dog', tint: '#f2eadb', likes: 'rice', scale: 1.0, origin: 'korea', help: 'herds-animals', blurb: 'A loyal cream-coloured dog who always finds the way back to the van.' },
  { kind: 'pet', id: 'pet-mountain-dog', name: 'Bruno', species: 'dog', tint: '#8a5a3a', likes: 'bread', scale: 1.35, origin: 'switzerland', help: 'lifts-spirits', blurb: 'A big, patient mountain dog who leans against the van door at night.' },
  { kind: 'pet', id: 'pet-sheepdog', name: 'Pip', species: 'dog', tint: '#2e2a28', likes: 'bread', scale: 0.95, origin: 'meadow', help: 'herds-animals', blurb: 'A quick black-and-white sheepdog from the Meadow who keeps the caravan together.', starts: true },
  { kind: 'pet', id: 'pet-clover', name: 'Clover', species: 'cat', tint: '#e8a86a', likes: 'milk', scale: 0.9, origin: 'meadow', help: 'lifts-spirits', blurb: 'A marmalade kitten from Lina\'s bakery who rides on the dashboard and naps in the sun.', starts: true },
  { kind: 'pet', id: 'pet-indie', name: 'Chai', species: 'dog', tint: '#c9955f', likes: 'rice', scale: 0.95, origin: 'indianorth', help: 'finds-resources', blurb: 'A clever street dog of the plains, fond of chai-stall company.' },
  { kind: 'pet', id: 'pet-forest-cat', name: 'Skog', species: 'cat', tint: '#7a6a5a', likes: 'milk', scale: 1.2, origin: 'norway', help: 'lifts-spirits', blurb: 'A long-haired forest cat who sleeps on the warmest cushion in the van.' },
  { kind: 'pet', id: 'pet-van-cat', name: 'Bulut', species: 'cat', tint: '#f4efe6', likes: 'milk', scale: 1.0, origin: 'islamic', help: 'lifts-spirits', blurb: 'A white cat with auburn ears who loves to sit by fountains.' },
  { kind: 'pet', id: 'pet-mau', name: 'Nefer', species: 'cat', tint: '#b8b8b0', likes: 'milk', scale: 0.95, origin: 'egypt', help: 'finds-resources', blurb: 'A spotted silver cat who hunts only for shiny things.' },
  { kind: 'pet', id: 'pet-myna', name: 'Mithu', species: 'dove', tint: '#2a2622', likes: 'rice', scale: 1.0, origin: 'indiasouth', help: 'carries-letters', blurb: 'A chatty myna who repeats your friends\' names and carries their letters.' },
  { kind: 'pet', id: 'pet-hoopoe', name: 'Hudhud', species: 'dove', tint: '#d9a066', likes: 'rice', scale: 1.0, origin: 'mughal', help: 'carries-letters', blurb: 'A crested hoopoe who brings news from far gardens.' },
  { kind: 'pet', id: 'pet-pigeon', name: 'Percy', species: 'dove', tint: '#9aa0aa', likes: 'rice', scale: 1.0, origin: 'london', help: 'carries-letters', blurb: 'A homing pigeon who always knows the way to your friends.' },
];

/**
 * Aasima taller than Fathima; Suvaibia shorter than Fathima; Maryam taller than Suvaibia; Abdur
 * Rahim as tall as Maryam and shorter than Azim.
 */
export const SIBLINGS: SiblingDef[] = [
  { kind: 'sibling', id: 'sib-aasima', name: 'Aasima', who: 'girl', origin: 'meadow', outfit: 'g-abaya', skin: '#e0b08a', rise: 0.25, help: 'lifts-spirits', blurb: 'Always the first to greet a new friend on the road, and the last to say goodbye.' },
  { kind: 'sibling', id: 'sib-suvaibia', name: 'Suvaibia', who: 'girl', origin: 'meadow', outfit: 'g-kurti-jeans', skin: '#e3b58f', rise: -0.3, help: 'finds-resources', blurb: 'Spots the ripest fruit on every stall and the kindest face in every crowd.' },
  { kind: 'sibling', id: 'sib-maryam', name: 'Maryam', who: 'girl', origin: 'meadow', outfit: 'g-angrakha', skin: '#dcaa82', rise: 0.45, help: 'carries-letters', blurb: 'Keeps the letters home to Grandmother Sarvatara, and writes the best ones.' },
  { kind: 'sibling', id: 'sib-abdurrahim', name: 'Abdur Rahim', who: 'boy', origin: 'meadow', outfit: 'b-pathani', skin: '#c99a74', rise: 0.45, help: 'learns-craft', blurb: 'Carries the heaviest bags without being asked, and fixes whatever breaks.' },
];

export const CHILDREN: ChildDef[] = [
  { kind: 'child', id: 'child-kavya', name: 'Kavya', who: 'girl', origin: 'indiasouth', tradition: 'Hindu family; lights oil lamps for Karthigai Deepam', journey: 'Learning to cook from her aunt in Gulabi Nagar; her grandmother Lakshmi Amma asked the travellers to take her.', joinsAfter: 'indiasouth', destination: 'indianorth', help: 'learns-craft', blurb: 'Hums while she stirs; knows every spice by smell.' },
  { kind: 'child', id: 'child-tomas', name: 'Tomas', who: 'boy', origin: 'norway', tradition: 'Lutheran family; walks in the Santa Lucia candle procession', journey: 'A carpentry apprentice going to see the great clock of Alpenrose, with his mother Ingrid\'s blessing.', joinsAfter: 'norway', destination: 'switzerland', help: 'learns-craft', blurb: 'Carves small boats from anything and gives them away.' },
  { kind: 'child', id: 'child-hana', name: 'Hana', who: 'girl', origin: 'japan', tradition: 'Keeps Obon with her family and floats a lantern for her grandfather', journey: 'Visiting her grandmother in Maple Row; her parents run a tea house in Sakura Hollow.', joinsAfter: 'japan', destination: 'vintage', help: 'lifts-spirits', blurb: 'Folds paper cranes for everyone you meet.' },
  { kind: 'child', id: 'child-seoah', name: 'Seo-ah', who: 'girl', origin: 'korea', tradition: 'Her family keeps Chuseok ancestral rites and lotus lanterns in spring', journey: 'Calligraphy student of Seo-yeon, sent to deliver her teacher\'s letters in person.', joinsAfter: 'korea', destination: 'china', help: 'carries-letters', blurb: 'Writes every friend\'s name beautifully in her notebook.' },
  { kind: 'child', id: 'child-xiaoyu', name: 'Xiaoyu', who: 'girl', origin: 'china', tradition: 'Celebrates the Lantern Festival and Mid-Autumn with mooncakes', journey: 'A young silk weaver going to meet batik makers in Nusa Rinjani, with Master Lin\'s blessing.', joinsAfter: 'china', destination: 'indonesia', help: 'learns-craft', blurb: 'Carries a tiny loom and a bag of bright threads.' },
  { kind: 'child', id: 'child-mina', name: 'Mina', who: 'girl', origin: 'egypt', tradition: 'Coptic Christian family; celebrates Sham el-Nessim with a riverside picnic', journey: 'Learning the scribe\'s craft; her father Hassan asked the travellers to take her to the reading room in Madinat an-Nur.', joinsAfter: 'egypt', destination: 'islamic', help: 'learns-craft', blurb: 'Draws every bird she sees on the back of papyrus scraps.' },
  { kind: 'child', id: 'child-daniel', name: 'Daniel', who: 'boy', origin: 'newyork', tradition: 'Jewish family; lights the menorah at Hanukkah', journey: 'Marcus\'s nephew, apprenticed in mechanics, going to help mend the tower clock in Old London.', joinsAfter: 'newyork', destination: 'london', help: 'learns-craft', blurb: 'Can fix a bicycle chain with his eyes closed — or so he says.' },
  { kind: 'child', id: 'child-harpreet', name: 'Harpreet', who: 'girl', origin: 'indianorth', tradition: 'Sikh family; lights lamps for Bandi Chhor Divas', journey: 'Learning pottery from Rani Didi; travelling to see the marble workers of Firenzia with her parents\' blessing.', joinsAfter: 'indianorth', destination: 'renaissance', help: 'learns-craft', blurb: 'Brave on every rope bridge and kind to every shy animal.' },
  { kind: 'child', id: 'child-aino', name: 'Aino', who: 'girl', origin: 'aurora', tradition: 'Her family marks the return of the sun after the polar night', journey: 'A young stargazer going to the Sky Isles\' Star Library with Aila\'s blessing.', joinsAfter: 'aurora', destination: 'skyisles', help: 'lifts-spirits', blurb: 'Names constellations after the friends you make.' },
];

export const COMPANIONS: CompanionDef[] = [...SIBLINGS, ...PETS, ...CHILDREN];
export const COMPANION_BY_ID = Object.fromEntries(COMPANIONS.map((c) => [c.id, c])) as Record<string, CompanionDef>;
/** Who travels with you on the first morning. */
export const STARTING_CARAVAN: string[] = [...SIBLINGS.map((s) => s.id), ...COMPANIONS.filter((c) => c.kind !== 'sibling' && c.starts).map((c) => c.id)];

/** How many can travel at once: the van has a back bench for two children, pets ride on rugs. */
export const MAX_CHILDREN = 4;
export const MAX_PETS = 4;

// ───────────────────────── movement ─────────────────────────

export interface P2 { x: number; z: number }
export interface Member { id: string; kind: 'pet' | 'child' | 'sibling'; x: number; z: number; speed: number }

/** Clear space kept around the two travellers, and between caravan members (centre to centre, m). */
export const TRAVELLER_CLEARANCE = 1.2;
export const MEMBER_CLEARANCE = 0.8;
const SNAP = 80;

/**
 * Slots behind the pair: their brothers and sisters walk just behind in a row, the children close
 * behind them, pets range a little further back and to the sides. `heading` is the girl's facing
 * (0 = +Z).
 */
export function caravanSlots(girl: P2, boy: P2, heading: number, members: Member[]): P2[] {
  const cx = (girl.x + boy.x) / 2, cz = (girl.z + boy.z) / 2;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const sibs = members.filter((m) => m.kind === 'sibling').length, lift = sibs ? 1.9 : 0;
  let sib = 0, child = 0, pet = 0;
  return members.map((m) => {
    if (m.kind === 'sibling') {
      const k = sib++, n = Math.min(4, sibs);
      const side = ((k % 4) - (n - 1) / 2) * 1.6, back = 2.5 + Math.floor(k / 4) * 1.8;
      return { x: cx - fx * back + rx * side, z: cz - fz * back + rz * side };
    }
    if (m.kind === 'child') {
      const side = child++ % 2 === 0 ? -0.9 : 0.9;
      const back = 2.6 + lift + Math.floor((child - 1) / 2) * 1.8;
      return { x: cx - fx * back + rx * side, z: cz - fz * back + rz * side };
    }
    const k = pet++;
    const side = [-2.2, 2.2, 0][k % 3], back = 4.4 + lift + Math.floor(k / 3) * 1.6;
    return { x: cx - fx * back + rx * side, z: cz - fz * back + rz * side };
  });
}

function pushOut(p: P2, from: P2, gap: number): void {
  const dx = p.x - from.x, dz = p.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d >= gap) return;
  if (d < 1e-6) { p.x = from.x + gap; return; }
  p.x = from.x + (dx / d) * gap;
  p.z = from.z + (dz / d) * gap;
}

/**
 * Move every member one step toward its slot, matching the travellers' pace, then clear space.
 * Members are separated from each other first and from the two travellers last, so the
 * travellers' clearance always holds. The travellers themselves are never moved.
 */
export function caravanStep(members: Member[], girl: P2, boy: P2, heading: number, travellerSpeed: number, dt: number): Member[] {
  const slots = caravanSlots(girl, boy, heading, members);
  const next = members.map((m, i) => {
    const s = slots[i];
    const dx = s.x - m.x, dz = s.z - m.z, d = Math.hypot(dx, dz);
    if (d > SNAP) return { ...m, x: s.x, z: s.z, speed: 0 };
    const want = Math.min(travellerSpeed + d * 2.2, Math.max(travellerSpeed * 1.6, 5));
    const step = Math.min(d, want * dt);
    const nx = d > 1e-6 ? m.x + (dx / d) * step : m.x, nz = d > 1e-6 ? m.z + (dz / d) * step : m.z;
    return { ...m, x: nx, z: nz, speed: dt > 0 ? step / dt : 0 };
  });
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < next.length; i++) for (let j = i + 1; j < next.length; j++) {
      const a = next[i], b = next[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d >= MEMBER_CLEARANCE) continue;
      const push = (MEMBER_CLEARANCE - d) / 2;
      const ux = d > 1e-6 ? dx / d : 1, uz = d > 1e-6 ? dz / d : 0;
      a.x -= ux * push; a.z -= uz * push;
      b.x += ux * push; b.z += uz * push;
    }
  }
  for (const m of next) clearOfTravellers(m, girl, boy);
  return next;
}

/**
 * Guarantee clearance from both travellers. Single pushes can fight when the travellers stand
 * close together (their clear zones overlap), so if a point is still inside either zone it walks
 * outward from the pair's midpoint until it is clear of both — this always terminates.
 */
function clearOfTravellers(m: P2, girl: P2, boy: P2): void {
  const C = TRAVELLER_CLEARANCE;
  const clear = () => Math.hypot(m.x - girl.x, m.z - girl.z) >= C && Math.hypot(m.x - boy.x, m.z - boy.z) >= C;
  pushOut(m, girl, C);
  pushOut(m, boy, C);
  if (clear()) return;
  const mx = (girl.x + boy.x) / 2, mz = (girl.z + boy.z) / 2;
  let ux = m.x - mx, uz = m.z - mz;
  let L = Math.hypot(ux, uz);
  if (L < 1e-6) { ux = -(boy.z - girl.z); uz = boy.x - girl.x; L = Math.hypot(ux, uz) || 1; if (L === 1 && ux === 0 && uz === 0) ux = 1; }
  ux /= L; uz /= L;
  const reach = Math.hypot(boy.x - girl.x, boy.z - girl.z) / 2 + C;
  for (let r = Math.max(L, 0); r <= reach + 1e-9; r += 0.05) {
    m.x = mx + ux * r;
    m.z = mz + uz * r;
    if (clear()) return;
  }
  m.x = mx + ux * (reach + 0.01);
  m.z = mz + uz * (reach + 0.01);
}

/** Who may join now: children after their land's chapter, pets once befriended; within limits. */
export function canJoin(def: CompanionDef, current: CompanionDef[], chaptersDone: LandId[], befriendedPets: string[]): { ok: boolean; reason: string } {
  if (current.some((c) => c.id === def.id)) return { ok: false, reason: `${def.name} is already travelling with you.` };
  if (def.kind === 'sibling') return { ok: true, reason: `${def.name} travels with you, as family always does.` };
  if (def.kind === 'child') {
    if (!chaptersDone.includes(def.joinsAfter)) return { ok: false, reason: `${def.name}'s family would like to know you better first.` };
    if (current.filter((c) => c.kind === 'child').length >= MAX_CHILDREN) return { ok: false, reason: 'The bunks are full — bring someone home first.' };
    return { ok: true, reason: `${def.name} joins with their family's blessing.` };
  }
  if (!befriendedPets.includes(def.id)) return { ok: false, reason: `${def.name} does not know you yet. Try offering some ${def.likes}.` };
  if (current.filter((c) => c.kind === 'pet').length >= MAX_PETS) return { ok: false, reason: 'Four pets is plenty for one van.' };
  return { ok: true, reason: `${def.name} hops into the van.` };
}

// ───────────────────────── the flying carpet ─────────────────────────

/**
 * Seats on the carpet (local metres; +z is forward): children in front, pets behind. The brothers
 * and sisters ride a carpet of their own, two by two with room between.
 */
export const CARPET_SEATS = {
  child: [[-0.95, 0.75], [-0.32, 0.75], [0.32, 0.75], [0.95, 0.75]] as const,
  pet: [[-0.95, -0.75], [-0.32, -0.75], [0.32, -0.75], [0.95, -0.75]] as const,
  sibling: [[-0.7, 0.85], [0.7, 0.85], [-0.7, -0.85], [0.7, -0.85]] as const,
};
export const CARPET_W = 2.9, CARPET_L = 3.6;

/**
 * How far to the side the carpet flies (centre to centre), by how the two are flying: beside
 * them on the cape, clear of the unicorn's wings, well clear of the biplane's. On the Night Dragon
 * that place beside them is the Light Fury's, far enough out that the two dragons' wingtips
 * never meet; the pets' carpet follows behind her (`dragonEscort`).
 */
export const CARPET_SIDE: Record<'fly' | 'unicorn' | 'plane' | 'dragon', number> = { fly: 4.2, unicorn: 5.5, plane: 8, dragon: 13 };
/** Half-wingspans, spread (m): the Night Dragon's and the Light Fury's (event/Dragon.ts). */
export const NIGHT_HALF_SPAN = 5.2, LIGHT_HALF_SPAN = 5.7;
/** How far behind the Light Fury (centre to centre) the pets' carpet flies: clear of her tail fins and wings. */
export const PET_CARPET_BACK = 10;

/**
 * Riding the Night Dragon (owner, 2026-09-29): the Light Fury flies beside them with the
 * children in her saddles, and the pets' carpet flies behind her, on the same side.
 */
export function dragonEscort(girl: { x: number; y: number; z: number }, boy: P2, heading: number): { light: { x: number; y: number; z: number }; carpet: { x: number; y: number; z: number }; side: number } {
  const light = carpetTarget('dragon', girl, boy, heading);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  return { light, carpet: { x: light.x - fx * PET_CARPET_BACK, y: light.y, z: light.z - fz * PET_CARPET_BACK }, side: light.side };
}

/** Where the Light Fury rests after landing: this far to the side of the Night Dragon (m, centre to centre; their folded wings well apart). */
export const LIGHT_REST_SIDE = 9;

/** How far out she drifts at most as she plays beside them (m), always away from him. */
export const LIGHT_PLAY = 2.2;

/**
 * The Light Fury at play as they fly (owner, 2026-09-30: "the two dragons playing"): she drifts
 * out from him and back, rises and dips, and leans into each swing. `side` is the side she flies
 * on (+1 her right, from dragonEscort); the drift is only ever outward, so her wings never come
 * nearer his than her place beside them.
 */
export function lightPlay(t: number, heading: number, side: number): { x: number; y: number; z: number; roll: number } {
  const rx = Math.cos(heading), rz = -Math.sin(heading), out = (1 - Math.cos(t * 0.33)) * (LIGHT_PLAY / 2);
  return { x: rx * side * out, y: Math.sin(t * 0.47) * 0.9, z: rz * side * out, roll: -side * Math.sin(t * 0.33) * 0.12 };
}

/**
 * Where the carpet should be: beside her on the side away from him, a little behind, a little
 * below. `heading` is her facing (0 = +Z). Returns world x/z/y and its facing.
 */
export function carpetTarget(mode: keyof typeof CARPET_SIDE, girl: { x: number; y: number; z: number }, boy: P2, heading: number): { x: number; y: number; z: number; side: number } {
  const fx = Math.sin(heading), fz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading);
  const side = (boy.x - girl.x) * rx + (boy.z - girl.z) * rz > 0 ? -1 : 1;
  const off = CARPET_SIDE[mode];
  const drop = mode === 'fly' ? 0.45 : mode === 'unicorn' ? 0.2 : -0.6;
  return { x: girl.x + rx * side * off - fx * 1.2, y: girl.y - drop, z: girl.z + rz * side * off - fz * 1.2, side };
}

/** World positions of every carpet seat for a carpet at (x, z) facing `heading`. */
export function carpetSeats(x: number, z: number, heading: number): P2[] {
  const out: P2[] = [];
  const c = Math.cos(heading), sn = Math.sin(heading);
  for (const [sx, sz] of [...CARPET_SEATS.child, ...CARPET_SEATS.pet]) out.push({ x: x + sx * c + sz * sn, z: z - sx * sn + sz * c });
  return out;
}

/** Where a land's pets wait to be met: round the edge of its plaza (local to the town centre). */
export function strayHome(def: PetDef): P2 {
  const k = PETS.filter((p) => p.origin === def.origin).indexOf(def);
  // Along a diagonal of the square, well away from the avenues' lines.
  const a = Math.PI / 4 + (def.origin.length % 4) * (Math.PI / 2) + (k - 1) * 0.3;
  return { x: Math.cos(a) * 44, z: Math.sin(a) * 44 };
}

/**
 * Offering a pet the food it likes: it trusts you and, if there is room, joins the caravan.
 * Pure rule over the save: the food is used up only when it joins.
 */
export function offerFood(st: { inventory: Record<string, number>; caravan: string[] }, def: PetDef): { ok: boolean; reason: string } {
  if ((st.inventory[def.likes] ?? 0) < 1) return { ok: false, reason: `${def.name} would love some ${def.likes} — you have none.` };
  const current = st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
  const r = canJoin(def, current, [], [def.id]);
  if (!r.ok) return r;
  st.inventory[def.likes] -= 1;
  if (st.inventory[def.likes] <= 0) delete st.inventory[def.likes];
  st.caravan.push(def.id);
  return r;
}

/** Balloon colours: bright and cheerful. */
export const BALLOON_COLOURS = ['#e8364a', '#f2a13a', '#f2d14e', '#4fb86a', '#3a8ad8', '#b86ad8', '#ff8fb8', '#ffffff'];
/** Lands with a funfair air, where children always have a balloon. */
export const BALLOON_LANDS = ['meadow', 'vintage'];

/**
 * Whether a travelling child holds a balloon today, and its colour (owner's brief: "balloons …
 * held by children"). Always at a festivity and in the funfair lands; elsewhere on market days
 * (one day in three, a different day for each child); a new colour each day.
 */
export function balloonFor(childId: string, land: string, day: number, festive: boolean): string | null {
  let h = day * 31;
  for (const ch of childId) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  if (!festive && !BALLOON_LANDS.includes(land) && (day + childId.length) % 3 !== 0) return null;
  return BALLOON_COLOURS[h % BALLOON_COLOURS.length];
}

/** The children in the caravan who have reached their destination (they go home there). */
export function arrivalsIn(caravan: readonly string[], land: string): ChildDef[] {
  return caravan.map((id) => COMPANION_BY_ID[id]).filter((c): c is ChildDef => !!c && c.kind === 'child' && c.destination === land);
}

/**
 * A child reaches their destination and goes home to their family there (or stays with the
 * relatives or teacher they came to learn from): they leave the caravan, freeing their bunk, and
 * the homecoming is remembered. Returns the words for it, or null if they were not travelling.
 */
export function bringHome(st: { caravan: string[]; homecomings: Record<string, { land: string; day: number }>; minutes: number }, childId: string, landName: string): string | null {
  const def = COMPANION_BY_ID[childId];
  const i = st.caravan.indexOf(childId);
  if (!def || def.kind !== 'child' || i < 0) return null;
  st.caravan.splice(i, 1);
  st.homecomings[childId] = { land: def.destination, day: Math.floor(st.minutes / 1440) + 1 };
  const why = HOMECOMING[def.help] ?? 'hugs everyone goodbye';
  return `🏡 ${def.name} has reached ${landName} and ${why}. A bunk in the van is free again.`;
}

const HOMECOMING: Record<string, string> = {
  'learns-craft': 'runs to the workshop where the lessons begin, waving until you are out of sight',
  'herds-animals': 'is swept up by family at the gate, already telling them about every animal on the road',
  'lifts-spirits': 'is home at last — and leaves a paper crane on the dashboard for you both',
  'carries-letters': 'delivers every letter by hand, then writes your names in the notebook, beautifully',
};
