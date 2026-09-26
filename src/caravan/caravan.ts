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
}

export type CompanionDef = PetDef | ChildDef;

export const PETS: PetDef[] = [
  { kind: 'pet', id: 'pet-saluki', name: 'Rih', species: 'dog', tint: '#e2c79a', likes: 'bread', scale: 1.1, origin: 'desert', help: 'finds-resources', blurb: 'A slender desert sighthound who spots things across the dunes long before you do.' },
  { kind: 'pet', id: 'pet-shiba', name: 'Kuri', species: 'dog', tint: '#d9894a', likes: 'rice', scale: 0.9, origin: 'japan', help: 'finds-resources', blurb: 'A foxy little dog who is certain every bush hides something good.' },
  { kind: 'pet', id: 'pet-jindo', name: 'Baekgu', species: 'dog', tint: '#f2eadb', likes: 'rice', scale: 1.0, origin: 'korea', help: 'herds-animals', blurb: 'A loyal cream-coloured dog who always finds the way back to the van.' },
  { kind: 'pet', id: 'pet-mountain-dog', name: 'Bruno', species: 'dog', tint: '#8a5a3a', likes: 'bread', scale: 1.35, origin: 'switzerland', help: 'lifts-spirits', blurb: 'A big, patient mountain dog who leans against the van door at night.' },
  { kind: 'pet', id: 'pet-sheepdog', name: 'Pip', species: 'dog', tint: '#2e2a28', likes: 'bread', scale: 0.95, origin: 'meadow', help: 'herds-animals', blurb: 'A quick black-and-white sheepdog from the Meadow who keeps the caravan together.' },
  { kind: 'pet', id: 'pet-indie', name: 'Chai', species: 'dog', tint: '#c9955f', likes: 'rice', scale: 0.95, origin: 'indianorth', help: 'finds-resources', blurb: 'A clever street dog of the plains, fond of chai-stall company.' },
  { kind: 'pet', id: 'pet-forest-cat', name: 'Skog', species: 'cat', tint: '#7a6a5a', likes: 'milk', scale: 1.2, origin: 'norway', help: 'lifts-spirits', blurb: 'A long-haired forest cat who sleeps on the warmest cushion in the van.' },
  { kind: 'pet', id: 'pet-van-cat', name: 'Bulut', species: 'cat', tint: '#f4efe6', likes: 'milk', scale: 1.0, origin: 'islamic', help: 'lifts-spirits', blurb: 'A white cat with auburn ears who loves to sit by fountains.' },
  { kind: 'pet', id: 'pet-mau', name: 'Nefer', species: 'cat', tint: '#b8b8b0', likes: 'milk', scale: 0.95, origin: 'egypt', help: 'finds-resources', blurb: 'A spotted silver cat who hunts only for shiny things.' },
  { kind: 'pet', id: 'pet-myna', name: 'Mithu', species: 'dove', tint: '#2a2622', likes: 'rice', scale: 1.0, origin: 'indiasouth', help: 'carries-letters', blurb: 'A chatty myna who repeats your friends\' names and carries their letters.' },
  { kind: 'pet', id: 'pet-hoopoe', name: 'Hudhud', species: 'dove', tint: '#d9a066', likes: 'rice', scale: 1.0, origin: 'mughal', help: 'carries-letters', blurb: 'A crested hoopoe who brings news from far gardens.' },
  { kind: 'pet', id: 'pet-pigeon', name: 'Percy', species: 'dove', tint: '#9aa0aa', likes: 'rice', scale: 1.0, origin: 'london', help: 'carries-letters', blurb: 'A homing pigeon who always knows the way to your friends.' },
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

export const COMPANIONS: CompanionDef[] = [...PETS, ...CHILDREN];

/** How many can travel at once: the van has a back bench for two children, pets ride on rugs. */
export const MAX_CHILDREN = 2;
export const MAX_PETS = 3;

// ───────────────────────── movement ─────────────────────────

export interface P2 { x: number; z: number }
export interface Member { id: string; kind: 'pet' | 'child'; x: number; z: number; speed: number }

/** Clear space kept around the two travellers, and between caravan members (centre to centre, m). */
export const TRAVELLER_CLEARANCE = 1.2;
export const MEMBER_CLEARANCE = 0.8;
const SNAP = 80;

/**
 * Slots behind the pair: children walk close behind in a row, pets range a little further back
 * and to the sides. `heading` is the girl's facing (0 = +Z).
 */
export function caravanSlots(girl: P2, boy: P2, heading: number, members: Member[]): P2[] {
  const cx = (girl.x + boy.x) / 2, cz = (girl.z + boy.z) / 2;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  let child = 0, pet = 0;
  return members.map((m) => {
    if (m.kind === 'child') {
      const side = child++ % 2 === 0 ? -0.9 : 0.9;
      const back = 2.6 + Math.floor((child - 1) / 2) * 1.8;
      return { x: cx - fx * back + rx * side, z: cz - fz * back + rz * side };
    }
    const k = pet++;
    const side = [-2.2, 2.2, 0][k % 3], back = 4.4 + Math.floor(k / 3) * 1.6;
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
  if (def.kind === 'child') {
    if (!chaptersDone.includes(def.joinsAfter)) return { ok: false, reason: `${def.name}'s family would like to know you better first.` };
    if (current.filter((c) => c.kind === 'child').length >= MAX_CHILDREN) return { ok: false, reason: 'The back bench is full — bring someone home first.' };
    return { ok: true, reason: `${def.name} joins with their family's blessing.` };
  }
  if (!befriendedPets.includes(def.id)) return { ok: false, reason: `${def.name} does not know you yet. Try offering some ${def.likes}.` };
  if (current.filter((c) => c.kind === 'pet').length >= MAX_PETS) return { ok: false, reason: 'Three pets is plenty for one van.' };
  return { ok: true, reason: `${def.name} hops into the van.` };
}
