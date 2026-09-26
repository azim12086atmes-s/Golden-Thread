import * as THREE from 'three';
import { CharacterModel, DIMS, HERO_SCALE } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import { Rng } from '../core/rng';
import { wardrobeFor } from '../npc/Townsfolk';
import { LAND_STYLE } from '../world/buildings';
import { GeoBuilder, M, archPanel, box, cone, cyl, sphere, tree } from '../world/kit';
import { LOCALES } from '../world/locale';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import type { Door } from '../world/RegionBuilder';

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

export const ROOM = { halfW: 4.5, back: -4, front: 4, height: 3.6 } as const;
/** Where the two sit: either side of the room, 3.4 m apart, facing in. */
export const ROOM_SEATS: Array<[number, number, number]> = [[-1.7, 0, 0.9], [1.7, 0, 0.9]];
/** The thing to gather sits here. */
export const GATHER_SPOT: [number, number, number] = [2.8, 0, -2.7];

export function roomTitle(door: Door): string {
  const land = door.land as RegionId, place = REGION_BY_ID[land].name;
  const kind = door.kind === 'shop' ? 'a shop' : door.kind === 'tower' ? 'a tower house' : door.kind === 'courtyard' ? 'a courtyard house' : ROOM_NAME[land];
  return `Inside ${kind} in ${place}`;
}

export class HouseInterior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80);
  private room = new THREE.Group();
  private girl: CharacterModel;
  private boy: CharacterModel;
  private host: CharacterModel | null = null;
  private mote: THREE.Mesh;
  private t = 0;
  door: Door | null = null;

  constructor(girl: Outfit, boy: Outfit) {
    this.scene.background = new THREE.Color('#1f1a33');
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a6a', 1.1), this.room);
    this.girl = new CharacterModel(girl, '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    this.boy = new CharacterModel(boy, '#c99a74', HERO_SCALE.boy, -1, 'boy');
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
  enter(door: Door, night: number, gathered: boolean): void {
    this.door = door;
    const land = door.land as RegionId, spec = REGION_BY_ID[land], st = LAND_STYLE[land], fam = FAMILY[land];
    const rng = new Rng(`room:${door.id}`);
    for (const c of [...this.room.children]) {
      this.room.remove(c);
      if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
    }
    if (this.host) this.scene.remove(this.host.root);
    for (const l of this.scene.children.filter((o) => (o as THREE.PointLight).isPointLight)) this.scene.remove(l);

    const g = new GeoBuilder(), glow = new GeoBuilder();
    const { halfW: W, back: B, front: F, height: H } = ROOM;
    const wall = '#' + new THREE.Color(spec.walls[rng.int(0, spec.walls.length - 1)]).lerp(new THREE.Color('#fff8ec'), 0.55).getHexString();
    const trim = spec.trims[rng.int(0, spec.trims.length - 1)];
    const [fa, fb] = st.frieze;
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
      for (let i = 0; i < 12; i++) box(g, 0.74, 0.05, F - B, i % 2 ? '#9a7450' : '#8a6444', -W + 0.37 + i * 0.75, 0, 0);
    }
    // Walls: plaster over a wainscot, the land's frieze band, a cornice.
    for (const [x, ry] of [[-W, Math.PI / 2], [W, -Math.PI / 2]] as const) {
      box(g, 0.1, H, F - B, wall, x, 0, 0);
      box(g, 0.12, 1.0, F - B, fam === 'majlis' ? fa : '#a8703f', x * 0.998, 0, 0);
      frieze(g, glow, st.motif, fa, fb, F - B, H - 0.7, x * 0.99, ry);
    }
    box(g, W * 2, H, 0.1, wall, 0, 0, B);
    box(g, W * 2, 1.0, 0.12, fam === 'majlis' ? fa : '#a8703f', 0, 0, B + 0.01);
    frieze(g, glow, st.motif, fa, fb, W * 2, H - 0.7, B + 0.07, 0);
    // Ceiling beams.
    for (let i = 0; i < 5; i++) box(g, W * 2, 0.22, 0.25, fam === 'east' ? '#4a3426' : '#8a5a36', 0, H - 0.2, B + 0.8 + i * 1.7);
    // Windows on the side walls: day sky or night stars behind them.
    const pointed = st.arch === 'pointed';
    for (const x of [-W + 0.06, W - 0.06]) for (const z of [-1.2, 1.8]) {
      const ry = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (st.arch === 'square') box(glow, 0.04, 1.3, 1.3, sky, x, 1.3, z);
      else archPanel(glow, 1.2, 1.5, sky, x, 1.2, z, ry, 0.04, pointed);
      if (night > 0.5) for (let k = 0; k < 4; k++) sphere(glow, 0.025, '#fff4c0', x * 0.995, 1.5 + (k % 2) * 0.4, z - 0.4 + k * 0.25, 4);
      box(g, 0.14, 0.1, 1.6, trim, x * 0.99, 1.2, z);
    }

    // The family's furniture and artifacts.
    FURNISH[fam](g, glow, rng, land, fa, fb, trim);
    // Kinds of building add their own heart.
    if (door.kind === 'shop') {
      box(g, 4, 1.0, 0.8, '#8a5a36', 0, 0, -1.6);
      box(g, 4.1, 0.08, 0.9, '#d4a060', 0, 1.0, -1.6);
      for (let i = 0; i < 8; i++) box(g, 0.3, 0.3, 0.3, ['#ff6b3a', '#f2d14e', '#7fb35a', '#c83a5a', '#8ad8ff'][i % 5], -1.6 + i * 0.45, 1.05, -1.6);
      for (let r = 0; r < 3; r++) {
        box(g, W * 1.6, 0.06, 0.4, '#8a5a36', 0, 1.2 + r * 0.7, B + 0.3);
        for (let i = 0; i < 12; i++) box(g, 0.28, 0.4, 0.28, ['#e8b84a', '#c8483a', '#2f6f9a', '#4f9a44', '#ff8fb8'][(i + r) % 5], -W * 0.75 + i * 0.6, 1.27 + r * 0.7, B + 0.3);
      }
    } else if (door.kind === 'courtyard') {
      cyl(g, 1.0, 1.1, 0.45, '#e8dcc6', 0, 0, -1.4, 14);
      cyl(glow, 0.88, 0.88, 0.05, '#8ad8ff', 0, 0.45, -1.4, 14);
      cyl(g, 0.1, 0.14, 0.9, '#e8dcc6', 0, 0.45, -1.4, 6);
      box(glow, 2.6, 0.04, 2.6, night > 0.5 ? '#3a4a8a' : LOCALES[land].sky.day, 0, H - 0.02, -1.4);
    } else if (door.kind === 'tower') {
      for (let i = 0; i < 12; i++) box(g, 1.1, 0.14, 0.4, '#a8703f', -W + 0.8, i * 0.3, B + 0.4 + i * 0.28);
    }
    // Something to gather: the land's own material, in a basket, marked with a glowing mote.
    const [gx, , gz] = GATHER_SPOT;
    cyl(g, 0.34, 0.26, 0.36, '#b08050', gx, 0, gz, 10);
    for (let i = 0; i < 5; i++) sphere(g, 0.1, ['#e8b84a', '#7fb35a', '#c8483a', '#fff0d0', '#8a5a36'][(i + land.length) % 5], gx - 0.14 + (i % 3) * 0.14, 0.4, gz - 0.07 + Math.floor(i / 3) * 0.14, 5);
    this.mote.position.set(gx, 1.2, gz);
    this.mote.visible = !gathered;

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
    const who = rng.chance(0.5) ? 'girl' : 'boy';
    const pool = wardrobeFor(land, who);
    this.host = new CharacterModel(pool[rng.int(0, pool.length - 1)], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'][rng.int(0, 4)], who === 'girl' ? 0.95 : 1.02);
    this.host.root.position.set(-1.2, 0, door.kind === 'shop' ? -2.4 : -2.6);
    this.scene.add(this.host.root);

    this.camera.position.set(0, 2.4, F + 1.2);
    this.camera.lookAt(0, 0.9, -1.2);
  }

  /** The item has been gathered today: the mote goes out. */
  setGathered(v: boolean): void {
    this.mote.visible = !v;
  }

  update(dt: number): void {
    this.t += dt;
    this.girl.update(dt, { speed: 0, airborne: false, riding: true, t: this.t });
    this.boy.update(dt, { speed: 0, airborne: false, riding: true, t: this.t + 1 });
    if (this.host) {
      this.host.offer = Math.max(0, Math.sin(this.t * 0.8)) * 0.5;
      this.host.offerLift = Math.sin(this.t * 3) * 0.25;
      this.host.update(dt, { speed: 0, airborne: false, riding: false, t: this.t + 2 });
    }
    this.mote.rotation.y += dt * 1.5;
    this.mote.position.y = 1.2 + Math.sin(this.t * 2) * 0.1;
    this.camera.position.x = Math.sin(this.t * 0.12) * 0.5;
    this.camera.lookAt(0, 0.9, -1.2);
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
    if (land === 'mughal' || land === 'indianorth') for (let i = 0; i < 3; i++) box(glow, 0.9, 1.4, 0.04, '#fff0d8', -3 + i * 3, 1.2, 3.9);
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
    if (land === 'aurora') for (let i = 0; i < 3; i++) sphere(glow, 0.15, '#7affc0', -2 + i * 2, 2.7, 3.2, 6);
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
