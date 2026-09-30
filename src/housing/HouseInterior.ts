import * as THREE from 'three';
import { buildInterior, type InteriorBuild, type InteriorSpec } from '../world/models/interiors';
import { CharacterModel, DIMS, HERO_SCALE } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import { Rng } from '../core/rng';
import { wardrobeFor } from '../npc/Townsfolk';
import { LAND_STYLE } from '../world/buildings';
import { GeoBuilder, M, archPanel, box, cone, cyl, sphere, tree } from '../world/kit';
import { LOCALES } from '../world/locale';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import type { Door } from '../world/RegionBuilder';
import type { VanSlot } from '../core/state';
import type { Person } from '../charity/charity';
import { VAN_OPTIONS } from './VanInterior';

/**
 * Inside a house. Every building in town can be entered by its front door; the room is built
 * for its land and its kind — a tatami room with a low table in Japan, a majlis of floor cushions
 * under brass lanterns in the Middle East, a swing and brass lamps in the south of India, a
 * hearth and a rosemaling bench in Norway, a parlour with armchairs and bookshelves in London —
 * and a shop has its counter, a courtyard house its fountain under the sky, a tower its stair.
 * Its walls carry the land's frieze. The two sit well apart, across the room from each other;
 * the host stands by the back wall. There is always something to gather, once a day.
 */

export type Family = 'east' | 'majlis' | 'south' | 'hearth' | 'parlour';
export const FAMILY: Record<RegionId, Family> = {
  japan: 'east', korea: 'east', china: 'east',
  islamic: 'majlis', middleeast: 'majlis', desert: 'majlis', egypt: 'majlis', mughal: 'majlis', indianorth: 'majlis',
  indiasouth: 'south', indonesia: 'south',
  norway: 'hearth', switzerland: 'hearth', aurora: 'hearth',
  meadow: 'parlour', london: 'parlour', newyork: 'parlour', vintage: 'parlour', renaissance: 'parlour', skyisles: 'parlour',
};

/** What each land's rooms are called (for the door and the panel). */
export const ROOM_NAME: Record<RegionId, string> = {
  japan: 'a machiya', korea: 'a hanok', china: 'a courtyard home', islamic: 'a riad', middleeast: 'a majlis house', desert: 'a Bedouin tent-house',
  egypt: 'a Nile-side house', mughal: 'a haveli', indianorth: 'a haveli', indiasouth: 'a Chettinad house', indonesia: 'a joglo', norway: 'a fjord cottage',
  switzerland: 'a chalet', aurora: 'a turf hut', meadow: 'a cottage', london: 'a terraced house', newyork: 'a brownstone', vintage: 'a seaside house',
  renaissance: 'a palazzo', skyisles: 'a cloud house',
};

/**
 * The room takes the shape of its building (owner: "interiors shaped like their buildings … house
 * structure and design variations while maintaining architecture"): a snow dome inside an igloo,
 * a glass dome under the stars in a glass igloo, a cone of hides round the smoke hole in a lavvu,
 * goahti or round tent, black goat-hair cloth on poles in a Bedouin tent, rafters under a pitched
 * roof in cabins, rorbuer, chalets and farmhouses, a saddle roof sweeping up in a tongkonan or bale,
 * a barrel vault in a Nubian house, and an open sky over the fountain court of a riad, haveli,
 * hanok, siheyuan or nalukettu. Other houses keep the flat-beamed room.
 */
export type RoomShape = 'box' | 'dome' | 'glassdome' | 'cone' | 'tent' | 'gable' | 'glassgable' | 'saddle' | 'vault' | 'courtyard';
export const HOUSE_SHAPE: Record<string, RoomShape> = {
  igloo: 'dome', glassigloo: 'glassdome', lavvu: 'cone', goahti: 'cone', roundtent: 'cone', bedouintent: 'tent',
  logcabin: 'gable', glasscabin: 'glassgable', rorbu: 'gable', bryggen: 'gable', chalet: 'gable', bernese: 'gable', sorlandet: 'gable',
  engadin: 'vault', minka: 'gable', choga: 'gable', bungalow: 'gable', colonica: 'gable', tongkonan: 'saddle', bale: 'saddle', nubian: 'vault',
  riad: 'courtyard', haveli: 'courtyard', siheyuan: 'courtyard', hanok: 'courtyard', nalukettu: 'courtyard', gulfhouse: 'courtyard', courtyard: 'courtyard',
  kasbah: 'courtyard', andalusian: 'courtyard', cairene: 'courtyard', chettinad: 'courtyard', huizhou: 'courtyard', coralhouse: 'box', barasti: 'gable',
  fellah: 'box', pinktownhouse: 'box', rajhut: 'cone', agraharam: 'gable', kashmiri: 'gable', baradari: 'vault', gassho: 'saddle', teahouse: 'gable',
  neowajip: 'gable', jeongja: 'box', diaojiaolou: 'gable', joglo: 'saddle', rumahgadang: 'saddle', oasishouse: 'box', majlistent: 'tent',
  cloudcottage: 'dome', moonhouse: 'vault',
};
/** What each kind of house is called at its door. */
export const HOUSE_NAME: Record<string, string> = {
  fairykeep: 'a fairy keep', fairytower: 'a fairy tower', storycottage: 'a storybook cottage', toadstool: 'a toadstool house', wizardtower: "a wizard's tower",
  decotower: 'an art-deco tower', glasstower: 'a glass tower', twisttower: 'a twisting tower', zigzagtower: 'a zig-zag tower', rosetower: 'a desert-rose tower', brownstone: 'a brownstone', loft: 'a cast-iron loft',
  penthouse: 'a penthouse', igloo: 'an igloo', glassigloo: 'a glass igloo', lavvu: 'a lavvu', goahti: 'a goahti', roundtent: 'a round tent', bedouintent: 'a Bedouin tent',
  logcabin: 'a log cabin', glasscabin: 'a glass cabin', rorbu: 'a rorbu', bryggen: 'a Bryggen house', sorlandet: 'a Sørlandet house',
  chalet: 'a chalet', engadin: 'an Engadin house', bernese: 'a Bernese farmhouse', mews: 'a mews cottage', georgian: 'a terraced house',
  casa: 'a Tuscan townhouse', colonica: 'a Tuscan farmhouse', palazzo: 'a palazzo', bungalow: 'a Craftsman bungalow', colonial: 'a colonial house',
  queenanne: 'a Painted Lady', machiya: 'a machiya', minka: 'a minka farmhouse', hanok: 'a hanok', choga: 'a choga cottage', siheyuan: 'a siheyuan',
  riad: 'a riad', gulfhouse: 'a majlis house', nubian: 'a Nubian house', haveli: 'a haveli', nalukettu: 'a nalukettu', pavilion: 'a garden pavilion',
  bale: 'a bale', tongkonan: 'a tongkonan', skyspire: 'a sky spire', skypavilion: 'a cloud pavilion',
  kasbah: 'a kasbah', andalusian: 'an Andalusian house', coralhouse: 'a Hijazi coral house', barasti: 'a barasti', cairene: 'a Cairene house', fellah: 'a fellah farmhouse',
  pinktownhouse: 'a Pink City townhouse', rajhut: 'a Rajasthani hut', chettinad: 'a Chettinad mansion', agraharam: 'an agraharam house', kashmiri: 'a Kashmiri house', baradari: 'a baradari',
  gassho: 'a gassho farmhouse', teahouse: 'a tea house', neowajip: 'a neowajip', jeongja: 'a jeongja pavilion', huizhou: 'a Huizhou house', diaojiaolou: 'a diaojiaolou',
  joglo: 'a joglo', rumahgadang: 'a rumah gadang', oasishouse: 'an oasis house', majlistent: 'a majlis tent', cloudcottage: 'a cloud cottage', moonhouse: 'a moon house',
};

export const ROOM = { halfW: 4.5, back: -4, front: 4, height: 3.6 } as const;
/** Where the two sit: either side of the room, 3.4 m apart, facing in. */
export const ROOM_SEATS: Array<[number, number, number]> = [[-1.7, 0, 0.9], [1.7, 0, 0.9]];
/** The thing to gather sits here. */
/** Where the people who live in your home stand: along the walls, well away from the two seats. */
export const RESIDENT_SPOTS: Array<[number, number]> = [[-3.4, -3.0], [-1.6, -3.1], [0.2, -3.1], [3.6, -0.4], [-3.6, -0.8], [3.6, 1.4], [-3.6, 1.4], [1.9, -3.1]];
export const GATHER_SPOT: [number, number, number] = [2.8, 0, -2.7];

/** Each land's landmark, by name, for its door. */
export const LANDMARK_NAME: Record<RegionId, string> = {
  meadow: 'the Great Tree', japan: 'the pagoda', korea: 'the palace hall', china: 'the temple of the terraces', norway: 'the stave church',
  switzerland: 'the clock tower', london: 'the hall of the great clock', newyork: 'the tower of a thousand windows', renaissance: 'the cathedral',
  vintage: 'the carousel pavilion', islamic: 'the house of light', middleeast: 'the wind-tower fort', desert: 'the great tent', egypt: 'the temple by the Nile',
  indianorth: 'the palace of winds', indiasouth: 'the temple tower', mughal: 'the marble garden tomb', indonesia: 'the temple terraces', aurora: 'the ice hall',
  skyisles: 'the temple of the Great Lantern',
};

/**
 * Which built interior (world/models/interiors.ts) a door opens onto: monuments, the castle, the
 * institutes (door id `inst:<site>:<kind>:<stage>`), caverns (`cavern:<style>:<id>`), penthouses.
 * Everything else is the land's standard room.
 */
export function interiorSpecFor(door: Door, night: number): InteriorSpec | null {
  const land = door.land as RegionId, seed = door.id;
  if (door.kind === 'landmark') return { kind: 'landmark', land, ref: land, night, seed };
  if (door.kind === 'institute') { const [, , ref, stage] = door.id.split(':'); return { kind: 'institute', land, ref, stage: Number(stage), night, seed }; }
  if (door.kind === 'cavern') return { kind: 'cavern', land, ref: door.id.split(':')[1], night, seed };
  if (door.kind === 'castle') return { kind: 'castle', land, ref: 'hall', night, seed };
  if (door.kind === 'penthouse') return { kind: 'penthouse', land, night, seed };
  return null;
}

/** Two people's seats must be this far apart (they never touch), and others this far from both. */
export const INTERIOR_SEAT_GAP = 2.2, INTERIOR_CLEAR = 1.5;

/**
 * A built interior, checked against the content rules before anyone steps in: if the two seats are
 * closer than 2.2 m it is refused (the standard room is used instead), and any spot for someone
 * else that comes within 1.5 m of either seat is dropped.
 */
export function safeInterior(b: InteriorBuild | null): InteriorBuild | null {
  if (!b) return null;
  const [a, c] = b.seats;
  if (Math.hypot(a[0] - c[0], a[2] - c[2]) < INTERIOR_SEAT_GAP) return null;
  const spots = b.spots.filter(([x, z]) => Math.hypot(x - a[0], z - a[2]) >= INTERIOR_CLEAR && Math.hypot(x - c[0], z - c[2]) >= INTERIOR_CLEAR);
  return { ...b, spots };
}

export function roomTitle(door: Door): string {
  const land = door.land as RegionId, place = REGION_BY_ID[land].name;
  if (door.name) return `Inside ${door.name}`;
  if (door.kind === 'landmark') return `Inside ${LANDMARK_NAME[land]} in ${place}`;
  if (door.kind === 'home') return `Your home in ${place}`;
  if (door.kind === 'penthouse') return `A penthouse above ${place}`;
  const kind = door.kind === 'shop' ? 'a shop' : door.kind === 'tower' ? 'a tower house' : door.kind === 'courtyard' ? 'a courtyard house' : HOUSE_NAME[door.kind] ?? ROOM_NAME[land];
  return `Inside ${kind} in ${place}`;
}

/** What the prompt at a door says. */
export function doorLabel(door: Door): string {
  if (door.kind === 'home') return 'Go home';
  if (door.kind === 'castle') return 'Step inside the castle';
  if (door.kind === 'penthouse') return 'Take the lift up to the penthouse';
  if (door.kind === 'landmark') return `Step inside ${LANDMARK_NAME[door.land as RegionId]}`;
  return `Step inside ${door.kind === 'shop' ? 'the shop' : HOUSE_NAME[door.kind] ?? ROOM_NAME[door.land as RegionId]}`;
}

export class HouseInterior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
  private room = new THREE.Group();
  /** Where the camera stands and looks (the standard room's, or a built interior's). */
  private camBase = new THREE.Vector3(0, 2.4, 5.2);
  private camLook = new THREE.Vector3(0, 0.9, -1.2);
  private girl: CharacterModel;
  private boy: CharacterModel;
  private host: CharacterModel | null = null;
  private residents: CharacterModel[] = [];
  private mote: THREE.Mesh;
  private t = 0;
  door: Door | null = null;

  constructor(girl: Outfit, boy: Outfit) {
    this.scene.background = new THREE.Color('#1f1a33');
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a6a', 1.1), this.room);
    this.girl = new CharacterModel(girl, '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    this.boy = new CharacterModel(boy, '#c99a74', HERO_SCALE.boy, -1, 'boy');
    // Wings and a jetpack are left at the door: rooms are too small for them.
    this.girl.hideBack(); this.boy.hideBack();
    this.scene.add(this.girl.root, this.boy.root);
    this.mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2a8').multiplyScalar(1.6), toneMapped: false }));
    this.scene.add(this.mote);
  }

  setOutfits(g: Outfit, b: Outfit): void {
    this.girl.setOutfit(g);
    this.boy.setOutfit(b);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Build the room behind this door. `night` sets what the windows show. */
  enter(door: Door, night: number, gathered: boolean, home?: Record<VanSlot, string>, residents: Person[] = []): void {
    this.door = door;
    const land = door.land as RegionId, spec = REGION_BY_ID[land], st = LAND_STYLE[land], fam = FAMILY[land];
    const rng = new Rng(`room:${door.id}`);
    for (const c of [...this.room.children]) {
      this.room.remove(c);
      c.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
    }
    this.camBase.set(0, 2.4, ROOM.front + 1.2);
    this.camLook.set(0, 0.9, -1.2);
    if (this.host) this.scene.remove(this.host.root);
    for (const r of this.residents) this.scene.remove(r.root);
    this.residents = [];
    for (const l of this.scene.children.filter((o) => (o as THREE.PointLight).isPointLight)) this.scene.remove(l);

    // A built interior from the 3D side, when there is one for this door.
    const ispec = interiorSpecFor(door, night);
    const built = ispec ? safeInterior(buildInterior(ispec)) : null;
    if (built) return this.enterBuilt(built, land, rng, gathered, !!home, residents);

    const g = new GeoBuilder(), glow = new GeoBuilder();
    const { halfW: W, back: B, front: F, height: H } = ROOM;
    const wall = '#' + new THREE.Color(spec.walls[rng.int(0, spec.walls.length - 1)]).lerp(new THREE.Color('#fff8ec'), 0.55).getHexString();
    const trim = spec.trims[rng.int(0, spec.trims.length - 1)];
    // No two homes alike: each takes its accent colours, its wainscot and its floor's tones from the
    // land's own palette, and keeps one treasured thing of its own (keepsake, below).
    const accents: Array<[string, string]> = [st.frieze, [spec.trims[0], st.frieze[1]], [st.frieze[0], spec.trims[spec.trims.length - 1]], [spec.roofs[0], st.frieze[0]], [st.frieze[1], st.frieze[0]]];
    const [fa, fb] = accents[rng.int(0, accents.length - 1)];
    const wains = rng.pick(['#a8703f', '#6b4a2a', '#8a5a36', '#c8a878', trim]);
    const [pa, pb] = rng.pick([['#9a7450', '#8a6444'], ['#b89468', '#a88458'], ['#6b4a30', '#5a3e28'], ['#c8b090', '#b8a080']] as Array<[string, string]>);
    const sky = night > 0.5 ? '#1f2a5a' : LOCALES[land].sky.day;

    // Floor, by family: tatami, patterned carpet over tiles, polished red floor, planks.
    if (fam === 'east' && land === 'japan') {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
        box(g, 1.46, 0.06, 1.96, j % 2 ? '#d8cf94' : '#cfc68a', -W + 0.75 + i * 1.5, 0, B + 1 + j * 2);
        box(g, 1.48, 0.065, 0.06, '#3a3a2a', -W + 0.75 + i * 1.5, 0, B + j * 2 + 0.02);
      }
    } else if (fam === 'majlis') {
      for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) box(g, 0.98, 0.05, 0.98, (i + j) % 2 ? '#e8dcc6' : fb, -W + 0.5 + i, 0, B + 0.5 + j);
    } else if (fam === 'south') {
      box(g, W * 2, 0.05, F - B, land === 'indiasouth' ? '#b8402e' : '#8a5a36', 0, 0, 0);
    } else {
      for (let i = 0; i < 12; i++) box(g, 0.74, 0.05, F - B, i % 2 ? pa : pb, -W + 0.37 + i * 0.75, 0, 0);
    }
    // A home you built takes the shape of the house it was built as (housing/designs.ts).
    const shape = (door.shape && HOUSE_SHAPE[door.shape]) || HOUSE_SHAPE[door.kind] || 'box';
    const round = shape === 'dome' || shape === 'glassdome' || shape === 'cone' || shape === 'tent';
    if (round) roundRoom(g, glow, shape, W, B, F, night, land, rng);
    // Walls: plaster over a wainscot, the land's frieze band, a cornice.
    if (!round) for (const [x, ry] of [[-W, Math.PI / 2], [W, -Math.PI / 2]] as const) {
      box(g, 0.1, H, F - B, wall, x, 0, 0);
      box(g, 0.12, 1.0, F - B, fam === 'majlis' ? fa : wains, x * 0.998, 0, 0);
      frieze(g, glow, st.motif, fa, fb, F - B, H - 0.7, x * 0.99, ry);
    }
    if (!round) {
      box(g, W * 2, H, 0.1, wall, 0, 0, B);
      box(g, W * 2, 1.0, 0.12, fam === 'majlis' ? fa : wains, 0, 0, B + 0.01);
      frieze(g, glow, st.motif, fa, fb, W * 2, H - 0.7, B + 0.07, 0);
    }
    // Overhead: flat beams, or the roof of the building seen from inside.
    const beam = fam === 'east' ? '#4a3426' : '#8a5a36';
    if (shape === 'box' || shape === 'courtyard') for (let i = 0; i < 5; i++) box(g, W * 2, 0.22, 0.25, beam, 0, H - 0.2, B + 0.8 + i * 1.7);
    else if (!round) roofInside(g, glow, shape, W, B, F, H, beam, wall, night);
    // Windows on the side walls: day sky or night stars behind them.
    const pointed = st.arch === 'pointed';
    if (!round) for (const x of [-W + 0.06, W - 0.06]) for (const z of [-1.2, 1.8]) {
      const ry = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (st.arch === 'square') box(glow, 0.04, 1.3, 1.3, sky, x, 1.3, z);
      else archPanel(glow, 1.2, 1.5, sky, x, 1.2, z, ry, 0.04, pointed);
      if (night > 0.5) for (let k = 0; k < 4; k++) sphere(glow, 0.025, '#fff4c0', x * 0.995, 1.5 + (k % 2) * 0.4, z - 0.4 + k * 0.25, 4);
      box(g, 0.14, 0.1, 1.6, trim, x * 0.99, 1.2, z);
    }

    // The family's furniture and artifacts.
    FURNISH[fam](g, glow, rng, land, fa, fb, trim);
    keepsake(g, glow, fam, land, rng, fa);
    // Kinds of building add their own heart.
    if (door.kind === 'shop' || door.kind === 'institute') {
      box(g, 4, 1.0, 0.8, '#8a5a36', 0, 0, -1.6);
      box(g, 4.1, 0.08, 0.9, '#d4a060', 0, 1.0, -1.6);
      for (let i = 0; i < 8; i++) box(g, 0.3, 0.3, 0.3, ['#ff6b3a', '#f2d14e', '#7fb35a', '#c83a5a', '#8ad8ff'][i % 5], -1.6 + i * 0.45, 1.05, -1.6);
      for (let r = 0; r < 3; r++) {
        box(g, W * 1.6, 0.06, 0.4, '#8a5a36', 0, 1.2 + r * 0.7, B + 0.3);
        for (let i = 0; i < 12; i++) box(g, 0.28, 0.4, 0.28, ['#e8b84a', '#c8483a', '#2f6f9a', '#4f9a44', '#ff8fb8'][(i + r) % 5], -W * 0.75 + i * 0.6, 1.27 + r * 0.7, B + 0.3);
      }
    } else if (door.kind === 'courtyard' || shape === 'courtyard') {
      cyl(g, 1.0, 1.1, 0.45, '#e8dcc6', 0, 0, -1.4, 14);
      cyl(glow, 0.88, 0.88, 0.05, '#8ad8ff', 0, 0.45, -1.4, 14);
      cyl(g, 0.1, 0.14, 0.9, '#e8dcc6', 0, 0.45, -1.4, 6);
      // The open sky over the court: painted sky by day, stars at night — lit only in small points.
      box(g, 2.6, 0.04, 2.6, night > 0.5 ? '#1f2a5a' : LOCALES[land].sky.day, 0, H + 0.4, -1.4);
      for (const sx of [-1, 1]) box(g, 0.2, 0.44, 2.8, '#e8dcc6', sx * 1.4, H, -1.4);
      for (const sz of [-1, 1]) box(g, 2.8, 0.44, 0.2, '#e8dcc6', 0, H, -1.4 + sz * 1.4);
      if (night > 0.5) for (let i = 0; i < 14; i++) sphere(glow, 0.025, '#fff4d0', -1.1 + (i * 0.37) % 2.2, H + 0.36, -2.5 + (i * 0.61) % 2.2, 3);
    } else if (door.kind === 'tower') {
      for (let i = 0; i < 12; i++) box(g, 1.1, 0.14, 0.4, '#a8703f', -W + 0.8, i * 0.3, B + 0.4 + i * 0.28);
    }
    // Your own home: furnished with what you have made, slot by slot.
    if (home) furnishHome(g, glow, home, B, W, H);
    // Something to gather: the land's own material, in a basket, marked with a glowing mote.
    const [gx, , gz] = GATHER_SPOT;
    cyl(g, 0.34, 0.26, 0.36, '#b08050', gx, 0, gz, 10);
    for (let i = 0; i < 5; i++) sphere(g, 0.1, ['#e8b84a', '#7fb35a', '#c8483a', '#fff0d0', '#8a5a36'][(i + land.length) % 5], gx - 0.14 + (i % 3) * 0.14, 0.4, gz - 0.07 + Math.floor(i / 3) * 0.14, 5);
    this.mote.position.set(gx, 1.2, gz);
    this.mote.visible = !gathered && !home;

    const solid = g.build(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
    const lit = glow.build(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    if (solid) this.room.add(solid);
    if (lit) this.room.add(lit);

    // Warm lamplight, and a cooler fill from the windows.
    for (const [c, i, x, y, z] of [['#ffd8a0', 18, 0, 3, -0.5], [LOCALES[land].lights[0], 7, -2.5, 2.2, -2.8], [LOCALES[land].lights[1] ?? '#ffe0b0', 7, 2.5, 2.2, -2.8], [night > 0.5 ? '#8aa0ff' : '#ffffff', 4, 0, 2.6, 3]] as const) {
      const l = new THREE.PointLight(c, i, 11);
      l.position.set(x, y, z);
      this.scene.add(l);
    }

    // The two, seated on either side of the room — across from each other, never touching.
    const hipY = (s: number) => 0.45 - DIMS.hip * s;
    this.girl.root.position.set(ROOM_SEATS[0][0], fam === 'parlour' || fam === 'hearth' ? hipY(HERO_SCALE.girl) : 0.25 - DIMS.hip * HERO_SCALE.girl, ROOM_SEATS[0][2]);
    this.girl.root.rotation.y = Math.PI / 2 - 0.35;
    this.boy.root.position.set(ROOM_SEATS[1][0], fam === 'parlour' || fam === 'hearth' ? hipY(HERO_SCALE.boy) : 0.25 - DIMS.hip * HERO_SCALE.boy, ROOM_SEATS[1][2]);
    this.boy.root.rotation.y = -Math.PI / 2 + 0.35;
    // The host, in their land's clothes, by the back wall.
    // A home of your own has no host; everywhere else someone welcomes you in.
    if (home) {
      this.host = null;
      // The people who live with you, each in their own place about the room.
      residents.slice(0, RESIDENT_SPOTS.length).forEach((p, i) => {
        const who = p.who ?? (p.id.length % 2 ? 'girl' : 'boy'), pool = wardrobeFor(p.land, who, p.kind === 'orphan');
        const m = new CharacterModel(pool[(i * 3 + p.name.length) % pool.length], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'][(i + p.name.length) % 5], p.kind === 'orphan' ? 0.72 : p.kind === 'elder' ? 0.94 : 1);
        const [x, z] = RESIDENT_SPOTS[i];
        m.root.position.set(x, 0, z);
        m.root.rotation.y = Math.atan2(-x, 1.5 - z);
        this.scene.add(m.root);
        this.residents.push(m);
      });
      this.camera.position.set(0, 2.4, F + 1.2); this.camera.lookAt(0, 0.9, -1.2);
      return;
    }
    const who = rng.chance(0.5) ? 'girl' : 'boy';
    const pool = wardrobeFor(land, who);
    this.host = new CharacterModel(pool[rng.int(0, pool.length - 1)], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'][rng.int(0, 4)], who === 'girl' ? 0.95 : 1.02);
    this.host.root.position.set(-1.2, 0, door.kind === 'shop' ? -2.4 : -2.6);
    this.scene.add(this.host.root);

    this.camera.position.set(0, 2.4, F + 1.2);
    this.camera.lookAt(0, 0.9, -1.2);
  }

  /** Step into a built interior: the two at its seats facing each other, others at its spots. */
  private enterBuilt(b: InteriorBuild, land: RegionId, rng: Rng, gathered: boolean, home: boolean, residents: Person[]): void {
    this.room.add(b.group);
    const l = new THREE.PointLight('#ffd8a0', 16, Math.max(12, b.room.halfW * 3));
    l.position.set(0, Math.min(b.room.height - 0.3, 3), (b.room.back + b.room.front) / 2);
    this.scene.add(l);
    const [sg, sb] = b.seats;
    // Seated: the seat's height is where the hips rest (a floor cushion at least 0.25 m).
    this.girl.root.position.set(sg[0], Math.max(sg[1], 0.25) - DIMS.hip * HERO_SCALE.girl, sg[2]);
    this.boy.root.position.set(sb[0], Math.max(sb[1], 0.25) - DIMS.hip * HERO_SCALE.boy, sb[2]);
    this.girl.root.rotation.y = Math.atan2(sb[0] - sg[0], sb[2] - sg[2]) - 0.35;
    this.boy.root.rotation.y = Math.atan2(sg[0] - sb[0], sg[2] - sb[2]) + 0.35;
    const person = (i: number, look: Outfit, skin: string, scale: number) => {
      const [x, z] = b.spots[i];
      const m = new CharacterModel(look, skin, scale);
      m.root.position.set(x, 0, z);
      m.root.rotation.y = Math.atan2((sg[0] + sb[0]) / 2 - x, (sg[2] + sb[2]) / 2 - z);
      this.scene.add(m.root);
      return m;
    };
    const skins = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'];
    if (!home && b.spots.length) {
      const who = rng.chance(0.5) ? 'girl' : 'boy', pool = wardrobeFor(land, who);
      this.host = person(0, pool[rng.int(0, pool.length - 1)], skins[rng.int(0, 4)], who === 'girl' ? 0.95 : 1.02);
    } else this.host = null;
    residents.slice(0, Math.max(0, b.spots.length - (home ? 0 : 1))).forEach((p, i) => {
      const pool = wardrobeFor(p.land, p.who ?? (p.id.length % 2 ? 'girl' : 'boy'), p.kind === 'orphan');
      this.residents.push(person(i + (home ? 0 : 1), pool[(i * 3 + p.name.length) % pool.length], skins[(i + p.name.length) % 5], p.kind === 'orphan' ? 0.72 : p.kind === 'elder' ? 0.94 : 1));
    });
    if (b.gather) this.mote.position.set(b.gather[0], b.gather[1] + 1.2, b.gather[2]);
    this.mote.visible = !!b.gather && !gathered && !home;
    this.camBase.set(...b.camera.pos);
    this.camLook.set(...b.camera.look);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camLook);
  }

  /** The item has been gathered today: the mote goes out. */
  setGathered(v: boolean): void {
    this.mote.visible = !v;
  }

  update(dt: number): void {
    this.t += dt;
    this.girl.update(dt, { speed: 0, airborne: false, riding: true, t: this.t });
    this.boy.update(dt, { speed: 0, airborne: false, riding: true, t: this.t + 1 });
    this.residents.forEach((r, i) => r.update(dt, { speed: 0, airborne: false, riding: false, t: this.t + 3 + i }));
    if (this.host) {
      this.host.offer = Math.max(0, Math.sin(this.t * 0.8)) * 0.5;
      this.host.offerLift = Math.sin(this.t * 3) * 0.25;
      this.host.update(dt, { speed: 0, airborne: false, riding: false, t: this.t + 2 });
    }
    this.mote.rotation.y += dt * 1.5;
    this.mote.position.y = 1.2 + Math.sin(this.t * 2) * 0.1;
    this.camera.position.set(this.camBase.x + Math.sin(this.t * 0.12) * 0.5, this.camBase.y, this.camBase.z);
    this.camera.lookAt(this.camLook);
  }
}

/** A patterned band along a wall (length L, centred, at height y, on the wall plane at x or z). */
function frieze(g: GeoBuilder, glow: GeoBuilder, motif: string, a: string, b: string, L: number, y: number, at: number, ry: number): void {
  const side = ry !== 0;
  const put = (along: number) => (side ? [at, along] : [along, at]) as [number, number];
  const [bx, bz] = put(0);
  box(g, side ? 0.05 : L, 0.5, side ? L : 0.05, b, bx, y, bz);
  const n = Math.round(L / 0.5);
  for (let i = 0; i < n; i++) {
    const along = -L / 2 + (i + 0.5) * (L / n), [x, z] = put(along), odd = i % 2 === 1;
    const dx = side ? Math.sign(-at) * 0.03 : 0, dz = side ? 0 : 0.03;
    if (motif === 'stars') cone(glow, 0.14, 0.06, a, x + dx, y + 0.22, z + dz, 8);
    else if (motif === 'dots') sphere(g, 0.09, odd ? a : '#ffffff', x + dx, y + 0.25, z + dz, 5);
    else if (motif === 'diamond') box(g, side ? 0.05 : 0.24, 0.24, side ? 0.24 : 0.05, a, x + dx, y + 0.13, z + dz, Math.PI / 4 * (side ? 0 : 0));
    else if (motif === 'waves') cyl(g, 0.16, 0.16, 0.05, a, x + dx, y + 0.1 + (odd ? 0.15 : 0), z + dz, 8);
    else box(g, side ? 0.05 : L / n * 0.5, 0.42, side ? L / n * 0.5 : 0.05, odd ? a : b, x + dx, y + 0.04, z + dz);
  }
}

type Furnish = (g: GeoBuilder, glow: GeoBuilder, rng: Rng, land: RegionId, a: string, b: string, trim: string) => void;

const FURNISH: Record<Family, Furnish> = {
  /** Low table, floor cushions, shoji screens, an alcove with a scroll and flowers, paper lanterns. */
  east(g, glow, rng, land, a, _b, trim) {
    box(g, 2.2, 0.35, 1.2, '#5a3a26', 0, 0, 0.9);
    box(g, 2.3, 0.06, 1.3, '#6b4a2a', 0, 0.35, 0.9);
    for (let i = 0; i < 3; i++) cyl(g, 0.07, 0.06, 0.1, '#e8e0d0', -0.5 + i * 0.5, 0.41, 0.9, 8);
    sphere(g, 0.14, land === 'china' ? '#2f6fb8' : '#6b5a4a', 0.8, 0.52, 0.9, 7);
    for (const x of [-1.7, 1.7]) box(g, 0.9, 0.14, 0.9, x < 0 ? a : '#2f5a9a', x, 0.06, 0.9);
    // Shoji / lattice screens along the back, glowing softly.
    for (let i = 0; i < 4; i++) {
      box(glow, 1.0, 2.2, 0.04, '#fff6e0', -3.3 + i * 1.1, 0.3, -3.9);
      for (let k = 0; k < 4; k++) box(g, 1.02, 0.03, 0.06, '#4a3426', -3.3 + i * 1.1, 0.5 + k * 0.55, -3.87);
      box(g, 0.04, 2.2, 0.06, '#4a3426', -3.3 + i * 1.1 + 0.5, 0.3, -3.87);
    }
    // Tokonoma alcove: a hanging scroll and a vase of blossoms.
    box(g, 1.6, 0.3, 0.8, '#6b4a2a', 2.8, 0, -3.5);
    box(g, 0.6, 1.4, 0.04, '#f7f1e3', 2.8, 1.2, -3.92);
    box(g, 0.06, 1.0, 0.05, '#2a2a30', 2.8, 1.4, -3.9);
    cyl(g, 0.12, 0.08, 0.35, '#2f6f9a', 2.4, 0.3, -3.5, 8);
    for (let i = 0; i < 6; i++) sphere(g, 0.07, land === 'china' ? '#ff4a3a' : '#ffc4dc', 2.4 + Math.cos(i) * 0.15, 0.8 + (i % 3) * 0.08, -3.5 + Math.sin(i) * 0.15, 4);
    for (const x of [-2.6, 2.6]) {
      cyl(g, 0.01, 0.01, 0.5, '#3a2a22', x, 2.9, 0.2, 3);
      sphere(glow, 0.3, land === 'china' ? '#ff4a2a' : '#fff0d0', x, 2.7, 0.2, 8, 1.3);
    }
    if (land === 'korea') for (let i = 0; i < 3; i++) { sphere(g, 0.35, '#5a3a2a', -3.6 + i * 0.8, 0.35, -2.6, 8, 1.1); cyl(g, 0.18, 0.22, 0.12, '#4a2a1a', -3.6 + i * 0.8, 0.72, -2.6, 8); }
    if (land === 'china') { g.add(new THREE.TorusGeometry(1.15, 0.14, 6, 28), '#b3262a', M(0, 1.5, -3.88)); glow.add(new THREE.CircleGeometry(1.05, 28), '#ffd8a0', M(0, 1.5, -3.9)); }
    void rng; void trim;
  },

  /** A majlis: cushions round the walls, a patterned carpet, a brass tray with a coffee pot, lanterns, niches. */
  majlis(g, glow, rng, land, a, b, trim) {
    box(g, 5.2, 0.03, 4.2, '#8c3b2a', 0, 0.06, -0.2);
    for (let i = 0; i < 6; i++) box(g, 4.8 - i * 0.7, 0.032, 3.8 - i * 0.6, [a, '#e2b43a', '#2f6f9a', '#e8dcc6', b, '#8c3b2a'][i % 6], 0, 0.065, -0.2);
    // Floor cushions and bolsters along three walls.
    for (let i = 0; i < 6; i++) {
      box(g, 1.3, 0.3, 0.8, i % 2 ? a : '#c8483a', -3.3 + i * 1.3, 0, -3.5);
      cyl(g, 0.18, 0.18, 0.9, i % 2 ? '#e2b43a' : b, -3.3 + i * 1.3, 0.45, -3.8, 8);
    }
    for (const x of [-3.9, 3.9]) for (let i = 0; i < 3; i++) box(g, 0.8, 0.3, 1.2, i % 2 ? a : '#c8483a', x, 0, -2.2 + i * 1.3);
    // The tray table with a dallah and tea glasses.
    cyl(g, 0.6, 0.6, 0.06, '#d4a84a', 0, 0.4, -0.3, 16);
    cyl(g, 0.08, 0.2, 0.4, '#8a6a3a', 0, 0, -0.3, 8);
    cone(g, 0.12, 0.35, '#d4a84a', 0.2, 0.46, -0.3, 8);
    for (let i = 0; i < 4; i++) cyl(g, 0.04, 0.035, 0.1, '#c83a3a', -0.25 + (i % 2) * 0.12, 0.46, -0.45 + Math.floor(i / 2) * 0.3, 6);
    // Arched niches in the back wall with lamps; hanging brass lanterns glowing through their piercings.
    for (const x of [-2.4, 0, 2.4]) {
      archPanel(g, 0.9, 1.3, '#3a2a4a', x, 1.4, -3.93, 0, 0.06, true);
      sphere(glow, 0.12, '#ffcf7a', x, 1.7, -3.85, 6);
    }
    for (const [x, z] of [[-2, 0.5], [2, 0.5], [0, -2]] as const) {
      cyl(g, 0.01, 0.01, 0.8, '#3a2a22', x, 2.8, z, 3);
      sphere(glow, 0.26, land === 'mughal' || land === 'indianorth' ? '#ffb070' : '#ffd27a', x, 2.55, z, 8, 1.4);
      for (let k = 0; k < 6; k++) cone(g, 0.04, 0.12, '#d4a84a', x + Math.cos(k) * 0.26, 2.35, z + Math.sin(k) * 0.26, 4);
    }
    // Jali screens in the back wall: marble pierced in a lattice, the light coming through the holes
    // (never a solid glowing sheet — and never at the front, between you and the room).
    if (land === 'mughal' || land === 'indianorth') for (const x of [-3.7, 3.7]) {
      box(g, 1.0, 1.5, 0.06, '#f2eee4', x, 1.2, -3.9);
      for (let k = 0; k < 15; k++) box(glow, 0.1, 0.1, 0.02, '#fff0d8', x - 0.3 + (k % 3) * 0.3, 1.4 + Math.floor(k / 3) * 0.26, -3.86);
    }
    if (land === 'islamic') { cyl(g, 0.7, 0.8, 0.4, '#2f8ab8', 2.8, 0, 1.5, 12); cyl(glow, 0.6, 0.6, 0.05, '#8ad8ff', 2.8, 0.4, 1.5, 12); }
    void rng; void trim;
  },

  /** A swing on chains, brass lamps, a kolam on the floor, carved pillars; or rattan and batik in Indonesia. */
  south(g, glow, rng, land, a, b, trim) {
    for (const x of [-3.2, 3.2]) for (const z of [-2.5, 1.5]) {
      cyl(g, 0.18, 0.22, 3.4, '#6b4a2a', x, 0, z, 8);
      for (let k = 0; k < 4; k++) cyl(g, 0.24, 0.24, 0.1, '#e2b43a', x, 0.4 + k * 0.8, z, 8);
    }
    if (land === 'indiasouth') {
      // The oonjal swing.
      box(g, 2.0, 0.1, 0.8, '#8a5a36', 0, 0.55, -1.6);
      for (const x of [-0.9, 0.9]) cyl(g, 0.015, 0.015, 2.9, '#d4a84a', x, 0.6, -1.6, 4);
      // A kolam in rice flour on the floor.
      for (let r = 1; r <= 3; r++) for (let i = 0; i < 8 * r; i++) { const t = (i / (8 * r)) * Math.PI * 2; sphere(glow, 0.03, '#ffffff', Math.cos(t) * r * 0.35, 0.06, 1.0 + Math.sin(t) * r * 0.35, 3); }
      // Brass kuthuvilakku lamps.
      for (const x of [-1.2, 1.2]) { cyl(g, 0.15, 0.2, 0.08, '#d4a84a', x, 0, -3.3, 8); cyl(g, 0.03, 0.03, 1.1, '#d4a84a', x, 0.08, -3.3, 6); cyl(g, 0.2, 0.12, 0.06, '#d4a84a', x, 1.18, -3.3, 8); for (let k = 0; k < 5; k++) sphere(glow, 0.04, '#ffb84a', x + Math.cos(k * 1.26) * 0.17, 1.28, -3.3 + Math.sin(k * 1.26) * 0.17, 4); }
    } else {
      // Rattan chairs round a low table, a batik hanging and a gamelan gong.
      box(g, 1.4, 0.4, 0.9, '#8a5a36', 0, 0, 0.9);
      box(g, 3.2, 1.9, 0.04, a, 0, 1.0, -3.93);
      for (let i = 0; i < 9; i++) sphere(g, 0.12, i % 2 ? b : '#fff0d0', -1.4 + i * 0.35, 1.3 + Math.sin(i) * 0.4, -3.9, 5);
      box(g, 1.6, 1.6, 0.1, '#6b4a2a', 3.0, 0, -3.3);
      g.add(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 14), '#d4a84a', M(3.0, 1.0, -3.2, 0, 1, 1, 1, Math.PI / 2));
    }
    for (const x of [-1.7, 1.7]) box(g, 0.9, 0.14, 0.9, x < 0 ? '#c8483a' : '#2f6f9a', x, 0.06, 0.9);
    for (let i = 0; i < 12; i++) sphere(g, 0.08, i % 2 ? '#ff9a1f' : '#fff08a', -2 + (i / 11) * 4, 3.1 - Math.sin((i / 11) * Math.PI) * 0.3, -3.8, 5); // marigold toran
    void rng; void trim;
  },

  /** A hearth: a stone fireplace with a real glow, benches with painted panels, fur rugs, a cuckoo clock. */
  hearth(g, glow, rng, land, a, b, trim) {
    box(g, 2.4, 1.6, 0.9, '#8a8078', 0, 0, -3.5);
    box(g, 1.4, 0.9, 0.2, '#2a2220', 0, 0.2, -3.05);
    box(g, 2.6, 0.2, 1.0, '#6b5a4a', 0, 1.6, -3.5);
    box(g, 1.2, 2.0, 0.7, '#8a8078', 0, 1.8, -3.6);
    for (let i = 0; i < 5; i++) cone(glow, 0.12, 0.4 + (i % 2) * 0.2, i % 2 ? '#ffb84a' : '#ff6a2a', -0.4 + i * 0.2, 0.25, -3.1, 5);
    // Painted benches (rosemaling on the backs).
    for (const x of [-1.7, 1.7]) {
      box(g, 0.8, 0.45, 1.8, '#6b4a2a', x, 0, 0.9);
      box(g, 0.12, 0.8, 1.8, a, x + Math.sign(x) * 0.36, 0.45, 0.9);
      for (let i = 0; i < 5; i++) sphere(g, 0.08, i % 2 ? '#ffffff' : '#f2c14e', x + Math.sign(x) * 0.3, 0.85, 0.2 + i * 0.35, 5);
    }
    box(g, 2.6, 0.03, 1.8, '#e8e0d0', 0, 0.06, 0.8);
    box(g, 2.2, 0.035, 1.4, '#c8b8a0', 0, 0.07, 0.8);
    // A cuckoo clock (Switzerland), antlers-free carvings, and a wood stack.
    if (land === 'switzerland') { box(g, 0.5, 0.6, 0.2, '#6b4a2a', 2.5, 2.0, -3.85); cone(g, 0.36, 0.3, '#4a3426', 2.5, 2.6, -3.8, 4); glow.add(new THREE.CircleGeometry(0.14, 12), '#fff6e0', M(2.5, 2.3, -3.74)); }
    for (let i = 0; i < 9; i++) cyl(g, 0.1, 0.1, 0.9, '#9a6a3a', -3.3 + (i % 3) * 0.22, 0.1 + Math.floor(i / 3) * 0.2, -3.4, 6);
    // Little aurora-green lamps along the back wall's beam (not hanging in front of your eyes).
    if (land === 'aurora') for (let i = 0; i < 3; i++) sphere(glow, 0.1, '#7affc0', -2 + i * 2, 2.9, -3.6, 6);
    void rng; void b; void trim;
  },

  /** A parlour: armchairs by a fireplace, bookshelves, a tea table, paintings and a plant. */
  parlour(g, glow, rng, land, a, b, trim) {
    box(g, 2.2, 1.4, 0.6, '#e8dcc6', 0, 0, -3.65);
    box(g, 1.2, 0.8, 0.2, '#2a2220', 0, 0.2, -3.35);
    box(g, 2.4, 0.12, 0.7, trim, 0, 1.4, -3.65);
    for (let i = 0; i < 4; i++) cone(glow, 0.1, 0.35, i % 2 ? '#ffb84a' : '#ff6a2a', -0.3 + i * 0.2, 0.25, -3.35, 5);
    for (const [x, c] of [[-1.7, a], [1.7, b]] as const) {
      box(g, 0.9, 0.45, 0.9, c, x, 0, 0.9);
      box(g, 0.9, 0.6, 0.2, c, x + Math.sign(x) * 0.35, 0.45, 0.9);
      for (const z of [0.5, 1.3]) box(g, 0.9, 0.3, 0.14, c, x, 0.45, z);
    }
    // Tea table with cups.
    cyl(g, 0.5, 0.5, 0.06, '#8a5a36', 0, 0.6, 0.9, 16);
    cyl(g, 0.06, 0.08, 0.6, '#6b4a2a', 0, 0, 0.9, 6);
    sphere(g, 0.12, '#ffffff', 0, 0.74, 0.9, 7);
    for (const x of [-0.25, 0.25]) cyl(g, 0.05, 0.04, 0.07, '#ffffff', x, 0.66, 0.8, 8);
    // Bookshelves either side of the fireplace.
    for (const x of [-2.9, 2.9]) {
      box(g, 1.3, 2.6, 0.4, '#6b4a2a', x, 0, -3.75);
      for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) box(g, 0.14, 0.36, 0.28, ['#c8483a', '#2f6f9a', '#e8b84a', '#4f9a44', '#8a5aa0'][(i + r + (x > 0 ? 2 : 0)) % 5], x - 0.5 + i * 0.2, 0.15 + r * 0.5, -3.72);
    }
    // Paintings; a fresco band for the Renaissance; a record player in New York.
    for (const x of [-1.8, 1.8]) { box(g, 1.0, 0.8, 0.05, '#d4af37', x, 1.9, -3.93); box(g, 0.86, 0.66, 0.06, rng.chance(0.5) ? '#8ac8ff' : '#f2c6a0', x, 1.97, -3.92); }
    if (land === 'renaissance') for (let i = 0; i < 9; i++) box(g, 1, 0.9, 0.04, ['#e8c89a', '#a8c8e0', '#e0a890'][i % 3], -4 + i, 2.5, -3.93);
    if (land === 'newyork') { box(g, 0.8, 0.6, 0.5, '#6b4a2a', 3.4, 0, 2.2); cyl(g, 0.3, 0.3, 0.03, '#1a1a1a', 3.4, 0.6, 2.2, 16); }
    tree(g, 'orange', 3.6, 0, 1.0, 0.35, () => 0.5);
    cyl(g, 0.3, 0.24, 0.45, '#b5654a', 3.6, 0, 1.0, 10);
  },
};

/**
 * The things you have made, set about your own room: a rug in the middle, curtains at the
 * windows, a quilt on the chest by the back wall, fairy lights along the cornice, pots of plants
 * in the front corners, a picture on the back wall, a lamp and cushions by each seat.
 */
function furnishHome(g: GeoBuilder, glow: GeoBuilder, home: Record<VanSlot, string>, B: number, W: number, H: number): void {
  const opt = (s: VanSlot) => VAN_OPTIONS[s].find((o) => o.id === home[s]) ?? VAN_OPTIONS[s][0];
  const rug = opt('rug').colors;
  box(g, 3.4, 0.02, 2.4, rug[0], 0, 0.05, 0.4);
  if (rug.length > 1) { box(g, 3.0, 0.025, 2.0, rug[1], 0, 0.05, 0.4); box(g, 1.2, 0.03, 0.8, rug[2] ?? rug[0], 0, 0.05, 0.4); }
  const cur = opt('curtains').colors[0];
  for (const x of [-W + 0.14, W - 0.14]) for (const z of [-1.2, 1.8]) for (const dz of [-0.8, 0.8]) box(g, 0.06, 1.8, 0.3, cur, x, 0.9, z + dz);
  const quilt = opt('quilt').colors;
  box(g, 1.6, 0.6, 0.7, '#8a5a36', -2.6, 0, B + 0.5);
  quilt.forEach((c, i) => box(g, 1.64 / quilt.length, 0.08, 0.74, c, -2.6 - 0.8 + (i + 0.5) * (1.64 / quilt.length), 0.6, B + 0.5));
  const lights = opt('lights').colors;
  if (lights.length) for (let i = 0; i < 24; i++) sphere(glow, 0.05, lights[i % lights.length], -W + 0.3 + (i / 23) * (W * 2 - 0.6), H - 0.55 - Math.sin((i / 23) * Math.PI * 4) ** 2 * 0.15, B + 0.15, 5);
  const plant = opt('plant').colors;
  if (plant.length) for (const x of [-W + 0.6, W - 0.6]) {
    cyl(g, 0.26, 0.2, 0.45, '#b5552e', x, 0, 3.2, 8);
    for (let k = 0; k < 5; k++) sphere(g, 0.2, k % 2 ? plant[0] : '#4f9a44', x + Math.cos(k * 1.3) * 0.12, 0.6 + (k % 3) * 0.12, 3.2 + Math.sin(k * 1.3) * 0.12, 5);
  }
  const art = opt('art').colors;
  if (art.length) { box(g, 1.6, 1.1, 0.06, art[0], 1.2, 1.7, B + 0.1); box(g, 1.3, 0.8, 0.07, art[1] ?? '#fff4e0', 1.2, 1.85, B + 0.12); }
  const lamp = opt('lamp').colors;
  if (lamp.length) { cyl(g, 0.05, 0.12, 1.2, '#3a2a22', 3.4, 0, 0.9, 6); sphere(glow, 0.2, lamp[0], 3.4, 1.35, 0.9, 8); }
  const cush = opt('cushions').colors;
  for (const [x, i] of [[-1.7, 0], [1.7, 1]] as const) box(g, 0.6, 0.18, 0.6, cush[i % cush.length], x, 0.47, 1.35);
}

/** A room with no straight walls: a snow or glass dome, a cone of hides, a black tent on poles. Open at the front for the eye. */
function roundRoom(g: GeoBuilder, glow: GeoBuilder, shape: RoomShape, W: number, B: number, F: number, night: number, land: RegionId, rng: Rng): void {
  const cz = (B + F) / 2 - 0.4, R = W + 0.9, open = 1.1;
  if (shape === 'dome' || shape === 'glassdome') {
    const glass = shape === 'glassdome';
    const dome = inward(new THREE.SphereGeometry(R, 24, 10, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI / 2).scale(1, 0.82, 1));
    g.add(dome, glass ? (night > 0.5 ? '#1a2250' : '#bfe0f4') : '#eef6fb', M(0, 0, cz));
    if (glass) {
      // The glass: its frame of ribs, stars and the aurora over it.
      for (let k = 0; k < 10; k++) g.add(new THREE.TorusGeometry(R * 0.99, 0.04, 3, 20, Math.PI / 2), '#8a8a90', M(0, 0, cz, (k / 10) * Math.PI * 2, 1, 0.82, 1, 0, 0).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)));
      // Stars and the aurora in the back half of the glass (the front is where you look from).
      for (let i = 0; i < 50; i++) { const a = rng.range(Math.PI * 1.1, Math.PI * 1.9), e = rng.range(0.3, 1.2); sphere(glow, 0.03, '#fff4d0', Math.cos(a) * Math.cos(e) * R * 0.97, Math.sin(e) * R * 0.8, cz + Math.sin(a) * Math.cos(e) * R * 0.97, 3); }
      for (let i = 0; i < 12; i++) box(glow, 0.12, 0.02, 0.9, i % 2 ? '#7affc0' : '#6ad8ff', -2.4 + i * 0.45, R * 0.7, cz - 2.6 + Math.sin(i) * 0.4);
    } else {
      // Snow blocks spiralling up, a clear ice window, fur on the sleeping bench.
      // The courses of snow blocks, drawn as faint seams on the dome's inside.
      for (let k = 1; k < 6; k++) g.add(inward(new THREE.SphereGeometry(R * 0.995, 24, 1, Math.PI / 2 + open, Math.PI * 2 - open * 2, Math.PI / 2 - k * 0.26, 0.012).scale(1, 0.82, 1)), '#c8dce8', M(0, 0, cz));
      glow.add(new THREE.CircleGeometry(0.5, 12), night > 0.5 ? '#6a8ad8' : '#e8f6ff', M(-R * 0.62, 1.6, cz - R * 0.62, Math.PI / 4));
    }
    box(g, 3.4, 0.5, 1.4, '#e8f0f6', 0, 0, cz - R + 1.2); box(g, 3.2, 0.12, 1.2, '#c8a882', 0, 0.5, cz - R + 1.2);
  } else if (shape === 'cone') {
    // Hides or cloth on long poles meeting at the smoke hole, a hearth ring in the middle.
    const Hc = 6.2;
    g.add(inward(new THREE.ConeGeometry(R, Hc, 20, 1, true, open, Math.PI * 2 - open * 2)), land === 'desert' ? '#e8dcc6' : '#b8946a', M(0, Hc / 2, cz));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < open) continue; g.add(new THREE.CylinderGeometry(0.04, 0.05, Math.hypot(R, Hc) + 0.6, 4), '#6b4a2a', M(Math.sin(a) * R / 2, Hc / 2 + 0.2, cz + Math.cos(a) * R / 2, 0, 1, 1, 1, Math.cos(a) * Math.atan2(R, Hc), -Math.sin(a) * Math.atan2(R, Hc))); }
    glow.add(new THREE.CircleGeometry(0.35, 10).rotateX(Math.PI / 2), night > 0.5 ? '#3a4a8a' : '#fff6e0', M(0, Hc - 0.5, cz));
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; sphere(g, 0.14, '#8a8078', Math.cos(a) * 0.55, 0.05, cz + 0.8 + Math.sin(a) * 0.55, 5, 0.6); }
    for (let i = 0; i < 4; i++) cone(glow, 0.12, 0.45, i % 2 ? '#ffb84a' : '#ff6a2a', -0.2 + i * 0.13, 0.05, cz + 0.8, 5);
    for (let k = 0; k < 6; k++) box(g, 1.2, 0.08, 0.9, ['#e8e0d0', '#8a6a4a', '#c8b8a0'][k % 3], Math.cos(k + 2) * (R - 1.4), 0.03, cz + Math.sin(k + 2) * (R - 1.4) - 0.8, k); // reindeer skins round the fire
  } else {
    // The Bedouin tent: black goat-hair cloth in bands, drawn over a ridge on tall poles, a woven divider at the back.
    const ridge = 3.6, eave = 1.7;
    for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) g.add(new THREE.BoxGeometry(Math.hypot(W + 0.6, ridge - eave), 0.05, (F - B) / 8), i % 2 ? '#2a2622' : '#3a322a', M(sx * (W + 0.6) / 2, (ridge + eave) / 2, B + (i + 0.5) * ((F - B) / 8), 0, 1, 1, 1, 0, sx * -Math.atan2(ridge - eave, W + 0.6)));
    for (const sx of [-1, 1]) box(g, 0.05, eave, F - B, '#2a2622', sx * (W + 0.6), 0, (B + F) / 2);
    for (const z of [B + 1, (B + F) / 2 - 1]) cyl(g, 0.07, 0.08, ridge, '#6b4a2a', 0, 0, z, 6); // the tent poles, back and middle, clear of the door
    box(g, (W + 0.6) * 2, ridge, 0.06, '#c23b2a', 0, 0, B);
    for (let i = 0; i < 12; i++) box(g, 0.5, 0.18, 0.07, ['#e2b43a', '#ffffff', '#2f5a9a'][i % 3], -W + 0.4 + i * 0.75, 1.2 + (i % 2) * 0.3, B + 0.02);
  }
}

/** The roof seen from inside above straight walls: rafters under a pitched roof, a saddle roof, a vault, a glass gable. */
function roofInside(g: GeoBuilder, glow: GeoBuilder, shape: RoomShape, W: number, B: number, F: number, H: number, beam: string, wall: string, night: number): void {
  const L = F - B, cz = (B + F) / 2;
  if (shape === 'vault') {
    g.add(inward(new THREE.CylinderGeometry(W, W, L, 18, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2)), wall, M(0, H, cz, 0, 1, 0.45, 1));
    for (let z = B + 1; z < F; z += 2) g.add(new THREE.TorusGeometry(W, 0.08, 4, 18, Math.PI), beam, M(0, H, z, 0, 1, 0.45, 1));
    box(g, W * 2, W * 0.45 + 0.1, 0.1, wall, 0, H, B);
    return;
  }
  const rise = shape === 'saddle' ? 3.2 : 2.1, glass = shape === 'glassgable';
  const slope = Math.hypot(W, rise), tilt = Math.atan2(rise, W);
  for (const sx of [-1, 1]) {
    g.add(new THREE.BoxGeometry(slope, 0.06, L), glass ? (night > 0.5 ? '#1a2250' : '#bfe0f4') : wall, M(sx * W / 2, H + rise / 2, cz, 0, 1, 1, 1, 0, sx * -tilt));
    for (let z = B + 0.5; z < F; z += 1) g.add(new THREE.BoxGeometry(slope, 0.16, 0.12), beam, M(sx * W / 2, H + rise / 2 - 0.1, z, 0, 1, 1, 1, 0, sx * -tilt));
  }
  box(g, 0.24, 0.24, L, beam, 0, H + rise - 0.2, cz); // the ridge beam
  for (let z = B + 1.2; z < F; z += 2.4) box(g, W * 2, 0.2, 0.2, beam, 0, H - 0.05, z); // tie beams
  // The gable end over the back wall.
  const tri = new THREE.Shape([new THREE.Vector2(-W, 0), new THREE.Vector2(W, 0), new THREE.Vector2(0, rise)]);
  g.add(new THREE.ShapeGeometry(tri), wall, M(0, H, B + 0.06));
  if (shape === 'saddle') for (const sx of [-1, 1]) box(g, 0.3, 0.3, 0.3, '#c23b2a', sx * 0.4, H + rise - 0.6, B + 0.2); // carved buffalo-horn boss
  if (glass) for (let i = 0; i < 30; i++) sphere(glow, 0.03, '#fff4d0', (i % 2 ? -1 : 1) * (0.5 + (i * 0.37) % (W - 0.6)), H + rise * (1 - ((i * 0.37) % (W - 0.6) + 0.5) / W) + 0.05, B + ((i * 1.3) % L), 3);
}

/** Turn a surface to be seen from inside (a dome, a cone, a vault overhead). */
function inward(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.getIndex();
  if (idx) for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  geo.computeVertexNormals();
  return geo;
}

/**
 * One treasured thing that makes a home its own, in the front corner by the door: an oud or a
 * brass-bound chest in a majlis, a koto or a bonsai in the east, a veena or a brass uruli of flowers
 * in the south, a spinning wheel or a carved chest by the hearth, a piano or a grandfather clock in
 * a parlour — chosen by the house, from what its land would have.
 */
function keepsake(g: GeoBuilder, glow: GeoBuilder, fam: Family, land: RegionId, rng: Rng, accent: string): void {
  const x = -3.6, z = 3.0, wood = '#6b4a2a', brass = '#d4a84a';
  const pick = rng.int(0, 1);
  switch (fam) {
    case 'majlis':
      if (pick) { // an oud on its stand
        g.add(new THREE.SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.3).rotateX(-Math.PI / 2), '#8a5a2a', M(x, 0.7, z));
        box(g, 0.08, 0.05, 0.6, '#3a2a1a', x, 0.72, z - 0.55); cyl(g, 0.03, 0.05, 0.55, wood, x, 0, z + 0.1, 4);
      } else { box(g, 0.9, 0.55, 0.55, '#8a4a2a', x, 0, z); for (const dy of [0.1, 0.45]) box(g, 0.94, 0.05, 0.59, brass, x, dy, z); sphere(g, 0.05, brass, x, 0.3, z + 0.29, 5); }
      break;
    case 'east':
      if (pick) { box(g, 1.6, 0.1, 0.35, '#8a6a3a', x + 0.4, 0.3, z); for (let i = 0; i < 12; i++) box(g, 0.01, 0.04, 0.3, '#f4efe0', x - 0.3 + i * 0.12, 0.4, z); for (const dx of [-0.35, 0.35]) box(g, 0.1, 0.3, 0.3, wood, x + 0.4 + dx, 0, z); } // a koto on its low stand
      else { cyl(g, 0.3, 0.25, 0.2, land === 'china' ? '#2f6fb8' : '#6a5a4a', x, 0.5, z, 10); box(g, 0.6, 0.5, 0.6, wood, x, 0, z); g.add(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 4), '#5a3e28', M(x, 0.95, z, 0, 1, 1, 1, 0.4, 0)); sphere(g, 0.22, '#3f7a3a', x + 0.1, 1.2, z - 0.1, 6, 0.6); } // a bonsai
      break;
    case 'south':
      if (pick) { g.add(new THREE.SphereGeometry(0.28, 10, 8), '#8a4a2a', M(x, 0.3, z + 0.3)); box(g, 0.08, 0.06, 1.1, '#6b3a1a', x, 0.3, z - 0.3); sphere(g, 0.18, '#8a4a2a', x, 0.3, z - 0.85, 8); } // a veena laid on its cloth
      else { cyl(g, 0.45, 0.3, 0.25, brass, x, 0, z, 14); cyl(glow, 0.4, 0.4, 0.02, '#6ac8ff', x, 0.2, z, 14); for (let i = 0; i < 8; i++) sphere(g, 0.07, ['#ff9a1f', '#ffd23a', '#e8347a'][i % 3], x + Math.cos(i) * 0.25, 0.24, z + Math.sin(i) * 0.25, 4); } // an uruli of floating flowers
      break;
    case 'hearth':
      if (pick) { g.add(new THREE.TorusGeometry(0.4, 0.04, 4, 16), wood, M(x, 0.75, z, Math.PI / 2)); box(g, 0.9, 0.3, 0.3, wood, x, 0.3, z); cyl(g, 0.04, 0.04, 0.6, wood, x + 0.3, 0.3, z, 4); } // a spinning wheel
      else { box(g, 1, 0.55, 0.55, accent, x, 0, z); for (let i = 0; i < 5; i++) sphere(g, 0.05, i % 2 ? '#ffffff' : '#f2c14e', x - 0.36 + i * 0.18, 0.3, z + 0.28, 4); } // a painted chest
      break;
    case 'parlour':
      if (pick) { box(g, 1.3, 1.0, 0.6, '#1f1a1a', x + 0.2, 0, z); box(g, 1.2, 0.04, 0.2, '#f4efe6', x + 0.2, 0.75, z + 0.25); for (let i = 0; i < 8; i++) box(g, 0.05, 0.02, 0.12, '#1f1a1a', x - 0.3 + i * 0.14, 0.78, z + 0.28); } // an upright piano
      else { box(g, 0.5, 2.0, 0.35, wood, x, 0, z); glow.add(new THREE.CircleGeometry(0.17, 14), '#fff4d8', M(x, 1.6, z + 0.18)); cyl(g, 0.01, 0.01, 0.6, brass, x, 0.7, z + 0.18, 3); sphere(g, 0.08, brass, x, 0.7, z + 0.18, 6); } // a grandfather clock
      break;
  }
}
