import * as THREE from 'three';
import { CharacterModel, DIMS, HERO_SCALE } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import type { GameState, VanSlot } from '../core/state';
import { AnimalModel } from '../animals/AnimalModel';
import { COMPANION_BY_ID } from '../caravan/caravan';
import { wardrobeFor } from '../npc/Townsfolk';
import { BED, BEDS, BENCH, BENCH_SEATS, BUNK, BUNKS, PET_BEDS, VAN } from '../vehicles/vanLayout';

/**
 * Inside Safar the van: a cosy room the player decorates slot by slot with things they have
 * made, built to the same floor plan as the van you drive (vanLayout.ts). The two sit on facing
 * benches across a table — together, never touching — and sleep in separate beds with a curtain
 * between. Four children have bunks with lanterns and curtains, four pets their own beds by the
 * door; there is a kitchen, a bookshelf, cupboards overhead and drawers under every bench and
 * bed, all under a painted starry roof with a skylight.
 */

export interface VanOption { id: string; name: string; cost: Record<string, number>; colors: string[] }

export const VAN_OPTIONS: Record<VanSlot, VanOption[]> = {
  rug: [
    { id: 'plain', name: 'Plain mat', cost: {}, colors: ['#b8a88a'] },
    { id: 'woven', name: 'Woven rug', cost: { rug: 1 }, colors: ['#c23b2a', '#e2b43a', '#2f6f9a'] },
    { id: 'silk', name: 'Silk runner', cost: { shawl: 1 }, colors: ['#c9a7e8', '#f2c6d0', '#fff4e0'] },
    { id: 'camel', name: 'Camel-wool rug', cost: { blanket: 1 }, colors: ['#8c3b2a', '#d9a066', '#2a2220'] },
  ],
  curtains: [
    { id: 'plain', name: 'Plain curtains', cost: {}, colors: ['#e8dcc2'] },
    { id: 'scarf', name: 'Scarf curtains', cost: { scarf: 1 }, colors: ['#e0865a'] },
    { id: 'ribbon', name: 'Ribbon curtains', cost: { ribbon: 2 }, colors: ['#ff8fb8'] },
  ],
  quilt: [
    { id: 'plain', name: 'Plain quilt', cost: {}, colors: ['#dcefff'] },
    { id: 'blanket', name: 'Desert blanket', cost: { blanket: 1 }, colors: ['#8c3b2a', '#f1d3a2'] },
    { id: 'patchwork', name: 'Patchwork', cost: { scarf: 2 }, colors: ['#e0865a', '#8fb58a', '#f2c14e', '#8fb3d9'] },
  ],
  lights: [
    { id: 'none', name: 'No lights', cost: {}, colors: [] },
    { id: 'warm', name: 'Warm fairy lights', cost: { lantern: 1 }, colors: ['#fff0b0'] },
    { id: 'rainbow', name: 'Rainbow lights', cost: { icelantern: 1 }, colors: ['#ff8a8a', '#fff08a', '#8ac8ff', '#c8a4ff'] },
  ],
  plant: [
    { id: 'none', name: 'No plant', cost: {}, colors: [] },
    { id: 'flowers', name: 'Flower pot', cost: { seed_flower: 1, pot: 1 }, colors: ['#ff8fb8'] },
    { id: 'herbs', name: 'Herb pot', cost: { herbs: 2, pot: 1 }, colors: ['#4f9a44'] },
  ],
  art: [
    { id: 'none', name: 'Bare wall', cost: {}, colors: [] },
    { id: 'verse', name: 'Framed verse', cost: { verse: 1 }, colors: ['#d4af37', '#2f6f9a'] },
    { id: 'scroll', name: 'Papyrus scroll', cost: { scroll: 1 }, colors: ['#e8d6a0', '#6b4a2a'] },
    { id: 'tile', name: 'Calligraphy tile', cost: { caltile: 1 }, colors: ['#2f6f9a', '#ffffff'] },
  ],
  lamp: [
    { id: 'none', name: 'No lamp', cost: {}, colors: [] },
    { id: 'lantern', name: 'Glass lantern', cost: { lantern: 1 }, colors: ['#ffcf7a'] },
    { id: 'incense', name: 'Incense burner', cost: { incenseburner: 1 }, colors: ['#ffb070'] },
    { id: 'star', name: 'Star lamp', cost: { starlamp: 1 }, colors: ['#fff4c0'] },
  ],
  cushions: [
    { id: 'plain', name: 'Plain cushions', cost: {}, colors: ['#d9c9a8'] },
    { id: 'fan', name: 'Silk cushions', cost: { fan: 1 }, colors: ['#bfe3e0', '#f2c6d0'] },
    { id: 'ribbon', name: 'Ribbon cushions', cost: { ribbon: 2 }, colors: ['#ff8fb8', '#fff0b3'] },
  ],
};

export const SLOT_NAMES: Record<VanSlot, string> = {
  rug: 'Floor', curtains: 'Curtains', quilt: 'Bed', lights: 'Fairy lights', plant: 'Plant', art: 'Wall art', lamp: 'Lamp', cushions: 'Cushions',
};

/** The view aims a little low so the cabin sits above the decorating shelf at the bottom. */
const VIEW_Y = 0.35;
/** From the cab, under the roof, looking back down the whole cabin. */
const CAM_Y = 2.3, CAM_Z = VAN.cab + 1.0;
/** The cabin, from the shared floor plan: 3 m wide, 7.2 m from the back wall to the cab. */
const HALF_W = VAN.halfW, BACK = VAN.back, FRONT = VAN.cab, WALL = VAN.wall;
/** Two bunk towers along the walls (two children each), and four pet beds by the door. */
export const VAN_BUNKS = BUNKS;
export const VAN_PET_BEDS = PET_BEDS;

export class VanInterior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
  private room = new THREE.Group();
  private crew = new THREE.Group();
  private kids: Array<{ m: CharacterModel; ph: number }> = [];
  private pets: Array<{ m: AnimalModel; ph: number }> = [];
  private girl: CharacterModel;
  private boy: CharacterModel;
  private glowers: THREE.Mesh[] = [];
  private t = 0;

  constructor(private st: GameState, girl: Outfit, boy: Outfit) {
    this.scene.background = new THREE.Color('#1f1a33');
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a6a', 1.25));
    for (const [c, i, x, y, z] of [['#ffd8a0', 16, 0, 2.5, 0.6], ['#ffb0d8', 7, -1.6, 2.1, -1.8], ['#a8d8ff', 7, 1.6, 2.1, -1.8], ['#ffd8a0', 6, 0, 2.2, 2.6]] as const) {
      const l = new THREE.PointLight(c, i, 9);
      l.position.set(x, y, z);
      this.scene.add(l);
    }
    this.scene.add(this.room, this.crew);
    this.girl = new CharacterModel(girl, '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    this.boy = new CharacterModel(boy, '#c99a74', HERO_SCALE.boy, -1, 'boy');
    // Facing benches across the table: 2 m apart — together, never touching.
    this.girl.root.position.set(BENCH_SEATS[0][0], 0.5 - DIMS.hip * HERO_SCALE.girl, BENCH_SEATS[0][2]);
    this.girl.root.rotation.y = Math.PI / 2;
    this.boy.root.position.set(BENCH_SEATS[1][0], 0.5 - DIMS.hip * HERO_SCALE.boy, BENCH_SEATS[1][2]);
    this.boy.root.rotation.y = -Math.PI / 2;
    this.scene.add(this.girl.root, this.boy.root);
    this.camera.position.set(0, CAM_Y, CAM_Z);
    this.camera.lookAt(0, VIEW_Y, -1);
    this.rebuild();
  }

  setOutfits(g: Outfit, b: Outfit): void {
    this.girl.setOutfit(g);
    this.boy.setOutfit(b);
  }

  /** The children on their bunks and the pets in their beds. */
  private seatCrew(): void {
    this.crew.clear();
    this.kids = [];
    this.pets = [];
    const pals = this.st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
    pals.filter((c) => c.kind === 'child').slice(0, VAN_BUNKS.length).forEach((c, i) => {
      if (c.kind !== 'child') return;
      const pool = wardrobeFor(c.origin, c.who);
      const m = new CharacterModel(pool[(c.name.length * 7) % pool.length], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a'][c.name.length % 4], 0.62);
      const [x, y, z] = VAN_BUNKS[i];
      // Sitting up on their bunk, legs over the edge towards the aisle.
      m.root.position.set(x * 0.72, y + 0.12 - DIMS.hip * 0.62, z + 0.2);
      m.root.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.crew.add(m.root);
      this.kids.push({ m, ph: i * 1.7 });
    });
    pals.filter((c) => c.kind === 'pet').slice(0, VAN_PET_BEDS.length).forEach((c, i) => {
      if (c.kind !== 'pet') return;
      const m = new AnimalModel(c.species, c.scale * 0.95, c.tint);
      const [x, z] = VAN_PET_BEDS[i];
      m.root.position.set(x, 0.1, z);
      m.root.rotation.y = Math.PI * 0.8 + i;
      this.crew.add(m.root);
      this.pets.push({ m, ph: i * 2.3 });
    });
  }

  rebuild(): void {
    this.room.clear();
    this.glowers = [];
    const v = this.st.van;
    const opt = (s: VanSlot) => VAN_OPTIONS[s].find((o) => o.id === v[s]) ?? VAN_OPTIONS[s][0];
    const mat = (c: string, glow = false) => glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
    const add = <T extends THREE.Mesh>(m: T, x: number, y: number, z: number): T => {
      m.position.set(x, y, z);
      this.room.add(m);
      return m;
    };
    const bx = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, glow = false) => {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, glow)), x, y, z);
      if (glow) this.glowers.push(m);
      return m;
    };
    const ball = (r: number, c: string, x: number, y: number, z: number, glow = false) => {
      const m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(c, glow)), x, y, z);
      if (glow) this.glowers.push(m);
      return m;
    };
    const len = FRONT - BACK, mid = (FRONT + BACK) / 2;

    // Floor: warm planks.
    for (let i = 0; i < 8; i++) bx(0.375, 0.05, len, i % 2 ? '#9a7450' : '#8a6444', -HALF_W + 0.19 + i * 0.375, 0, mid);
    // Walls: cream above a wooden wainscot, with a painted flower border.
    for (const x of [-HALF_W, HALF_W]) {
      bx(0.05, WALL, len, '#f7ecda', x, WALL / 2, mid);
      bx(0.06, 0.95, len, '#b07a4a', x * 0.998, 0.48, mid);
      bx(0.07, 0.05, len, '#e8c07a', x * 0.996, 0.97, mid);
      for (let i = 0; i < 28; i++) ball(0.04, ['#ff8fb8', '#8ac8ff', '#f2c14e', '#9ae8a0'][i % 4], x * 0.99, 1.95, BACK + 0.2 + i * (len - 0.4) / 27);
    }
    bx(HALF_W * 2, WALL, 0.05, '#f7ecda', 0, WALL / 2, BACK);
    bx(HALF_W * 2, 0.95, 0.06, '#b07a4a', 0, 0.48, BACK + 0.01);
    // Barrel roof painted with stars, and a skylight.
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(HALF_W + 0.02, HALF_W + 0.02, len, 20, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#2e2a5a', side: THREE.BackSide, flatShading: true }));
    roof.rotation.x = -Math.PI / 2;
    roof.scale.set(1, 1, 0.34);
    add(roof, 0, WALL, mid);
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI - Math.PI / 2;
      ball(0.018 + Math.random() * 0.02, i % 7 ? '#fff4c0' : '#ffb0e0', Math.sin(a) * (HALF_W - 0.05), WALL + Math.cos(a) * 0.48, BACK + Math.random() * len, true);
    }
    bx(0.9, 0.03, 1.3, '#6ab8ff', 0, WALL + 0.5, 0.4, true);
    // Big windows over the benches, and the bunk windows, looking out on a starry night.
    const cur = opt('curtains').colors[0];
    for (const x of [-HALF_W + 0.03, HALF_W - 0.03]) for (const [z, w] of [[0.55, 2.0], [-1.55, 1.6]] as const) {
      bx(0.04, 0.85, w, '#1f3a7a', x, 1.18 + (z < 0 ? 0.35 : 0), z, true);
      for (let i = 0; i < 6; i++) ball(0.02, '#fff4c0', x * 0.995, 1.0 + (z < 0 ? 0.35 : 0) + (i % 3) * 0.22, z - w * 0.4 + i * w * 0.16, true);
      bx(0.07, 1.0, 0.28, cur, x * 0.99, 1.2 + (z < 0 ? 0.35 : 0), z - w / 2 - 0.1);
      bx(0.07, 1.0, 0.28, cur, x * 0.99, 1.2 + (z < 0 ? 0.35 : 0), z + w / 2 + 0.1);
      bx(0.05, 0.05, w + 0.6, '#d4af37', x * 0.99, 1.72 + (z < 0 ? 0.35 : 0), z);
    }
    // Storage: cupboards along both walls up under the roof, with brass knobs.
    for (const x of [-HALF_W + 0.22, HALF_W - 0.22]) {
      bx(0.4, 0.42, 2.0, '#a8703f', x, 2.12, BENCH.z);
      for (let i = 0; i < 3; i++) {
        bx(0.02, 0.36, 0.6, '#c89060', x - Math.sign(x) * 0.21, 2.12, BENCH.z - 0.65 + i * 0.65);
        ball(0.025, '#d4af37', x - Math.sign(x) * 0.23, 2.05, BENCH.z - 0.45 + i * 0.65);
      }
    }
    // Rug down the aisle.
    const rug = opt('rug').colors;
    bx(1.1, 0.02, 5.2, rug[0], 0, 0.035, -0.3);
    if (rug[1]) for (let i = 0; i < 11; i++) bx(1.0, 0.021, 0.12, rug[1 + (i % (rug.length - 1))], 0, 0.04, -2.7 + i * 0.47);
    bx(1.2, 0.022, 0.08, '#e8c07a', 0, 0.04, -2.9);
    bx(1.2, 0.022, 0.08, '#e8c07a', 0, 0.04, 2.3);
    // Their benches, facing each other across the table (the table stands between them).
    const cc = opt('cushions').colors;
    for (const x of [-BENCH.x, BENCH.x]) {
      bx(BENCH.depth, 0.44, BENCH.len, '#a8703f', x, 0.22, BENCH.z);
      for (let i = 0; i < 3; i++) bx(0.02, 0.28, 0.55, '#c89060', x - Math.sign(x) * (BENCH.depth / 2 + 0.01), 0.22, BENCH.z - 0.62 + i * 0.62); // drawers
      bx(BENCH.depth + 0.02, 0.05, BENCH.len + 0.02, '#d4a060', x, 0.46, BENCH.z);
      for (let i = 0; i < 3; i++) bx(0.46, 0.13, 0.55, cc[i % cc.length], x, 0.54, BENCH.z - 0.64 + i * 0.64);
      bx(0.12, 0.55, BENCH.len - 0.1, cc[0], x + Math.sign(x) * 0.26, 0.82, BENCH.z);
    }
    bx(0.62, 0.05, 1.0, '#d4a060', 0, 0.74, BENCH.z);
    bx(0.08, 0.72, 0.08, '#6b4a2a', 0, 0.36, BENCH.z);
    ball(0.07, '#fff4e0', 0.1, 0.83, BENCH.z + 0.2); // a teapot
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8), mat('#2f6f9a')), -0.12, 0.8, BENCH.z - 0.2);
    // Two separate beds at the back, with a curtain between them, and drawers beneath.
    const q = opt('quilt').colors;
    for (const [x, z] of BEDS) {
      bx(BED.w, 0.45, BED.len, '#8a5a36', x, 0.22, z);
      for (let i = 0; i < 2; i++) bx(0.02, 0.26, 0.7, '#c89060', x + Math.sign(x) * -(BED.w / 2 + 0.01), 0.22, z - 0.4 + i * 0.8);
      for (let i = 0; i < 3; i++) bx(BED.w - 0.08, 0.1, 0.56, q[i % q.length], x, 0.5, z + 0.05 - 0.58 + i * 0.58);
      bx(0.5, 0.14, 0.32, '#ffffff', x, 0.6, z - BED.len / 2 + 0.25);
    }
    bx(0.06, 1.85, BED.len + 0.1, cur, 0, 0.98, BEDS[0][1]);
    bx(0.04, 0.04, BED.len + 0.2, '#d4af37', 0, 1.92, BEDS[0][1]);
    // The children's bunks: two towers of two, each with a lantern, a curtain and a little ladder.
    for (const x of [-BUNKS[2][0], BUNKS[2][0]]) {
      for (const y of [BUNKS[0][1], BUNKS[1][1]]) {
        const z = BUNKS[0][2];
        bx(BUNK.w, 0.12, BUNK.len, '#8a5a36', x, y - 0.1, z);
        for (let i = 0; i < 2; i++) bx(BUNK.w - 0.08, 0.08, 0.7, q[(i + (y > 1 ? 1 : 0)) % q.length], x, y, z - 0.36 + i * 0.72);
        bx(0.3, 0.1, 0.25, '#ffffff', x + Math.sign(x) * 0.18, y + 0.07, z - 0.6);
        ball(0.06, '#ffcf7a', x + Math.sign(x) * 0.34, y + 0.45, z + 0.62, true);
        bx(0.05, 0.4, 0.26, cur, x - Math.sign(x) * (BUNK.w / 2), y + 0.3, z - 0.6);
      }
      for (const z of [BUNKS[0][2] - BUNK.len / 2, BUNKS[0][2] + BUNK.len / 2]) bx(0.07, 1.95, 0.07, '#6b4a2a', x - Math.sign(x) * (BUNK.w / 2 - 0.04), 0.97, z);
      for (let r = 0; r < 5; r++) bx(0.04, 0.04, 0.35, '#d4a060', x - Math.sign(x) * (BUNK.w / 2 + 0.02), 0.25 + r * 0.3, BUNKS[0][2] + 0.45);
      bx(BUNK.w, 0.1, 0.06, '#e8c07a', x, BUNKS[1][1] + 0.15, BUNKS[0][2] + BUNK.len / 2);
    }
    // Pet beds by the door, and a cat shelf above them.
    VAN_PET_BEDS.forEach(([x, z], i) => {
      const bed = add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.08, 8, 16), mat(['#ff8fb8', '#8ac8ff', '#f2c14e', '#9ae8a0'][i])), x, 0.1, z);
      bed.rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 16), mat('#fff4e8')), x, 0.06, z);
      if (i < 2) bx(0.14, 0.05, 0.1, '#d9d0c0', x + 0.2, 0.04, z - 0.36);
    });
    bx(0.9, 0.06, 0.35, '#b07a4a', -HALF_W + 0.2, 1.3, 2.3);
    // A little kitchen (stove, basin, spice jars) and a bookshelf by the door.
    bx(0.6, 0.9, 1.0, '#b07a4a', HALF_W - 0.32, 0.45, 2.15);
    bx(0.64, 0.05, 1.04, '#e8dcc6', HALF_W - 0.32, 0.92, 2.15);
    ball(0.12, '#c8483a', HALF_W - 0.32, 1.05, 1.9);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.06, 12), mat('#9aa0aa')), HALF_W - 0.32, 0.96, 2.4);
    for (let i = 0; i < 5; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 6), mat(['#e8a04a', '#c8483a', '#f2c14e', '#4f9a44', '#8a5a36'][i])), HALF_W - 0.12, 1.35, 1.8 + i * 0.16);
    bx(0.12, 0.05, 0.9, '#8a5a36', HALF_W - 0.1, 1.28, 2.1);
    bx(0.3, 1.0, 0.7, '#8a5a36', -HALF_W + 0.18, 1.85, 1.85);
    for (let i = 0; i < 8; i++) bx(0.22, 0.24, 0.07, ['#c8483a', '#2f6f9a', '#e8b84a', '#4f9a44'][i % 4], -HALF_W + 0.2, 1.58 + Math.floor(i / 4) * 0.45, 1.6 + (i % 4) * 0.16);
    // Bunting from end to end.
    for (let i = 0; i < 18; i++) {
      const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 3), mat(['#ff8fb8', '#8ac8ff', '#f2c14e', '#9ae8a0', '#c8a4ff'][i % 5])), 0, WALL + 0.25 - Math.sin((i / 17) * Math.PI) * 0.18, BACK + 0.3 + i * (len - 0.6) / 17);
      f.rotation.x = Math.PI;
    }
    // Fairy lights along both sides of the ceiling (warm ones even before you make your own).
    const lc = opt('lights').colors.length ? opt('lights').colors : ['#ffe8b0'];
    for (let i = 0; i < 44; i++) {
      const k = i % 22, x = i < 22 ? -HALF_W + 0.45 : HALF_W - 0.45;
      ball(0.035, lc[i % lc.length], x, WALL + 0.2 - Math.sin((k / 21) * Math.PI * 3) * 0.08, BACK + 0.2 + k * (len - 0.4) / 21, true);
    }
    // Plant on the kitchen counter.
    const pl = opt('plant');
    if (pl.colors.length) {
      bx(0.24, 0.24, 0.24, '#b5654a', HALF_W - 0.32, 1.07, 2.55);
      ball(0.2, pl.id === 'herbs' ? '#4f9a44' : '#5aa04a', HALF_W - 0.32, 1.33, 2.55);
      if (pl.id === 'flowers') for (let i = 0; i < 6; i++) ball(0.05, '#ff8fb8', HALF_W - 0.32 + Math.cos(i) * 0.14, 1.48, 2.55 + Math.sin(i) * 0.14);
    }
    // Hanging plants either side of the skylight.
    for (const x of [-0.7, 0.7]) {
      bx(0.01, 0.4, 0.01, '#6b4a2a', x, WALL + 0.2, 0.4);
      ball(0.15, '#5aa04a', x, WALL - 0.05, 0.4);
      for (let i = 0; i < 4; i++) ball(0.07, '#6ab85a', x + Math.cos(i * 1.6) * 0.12, WALL - 0.2 - i * 0.08, 0.4 + Math.sin(i * 1.6) * 0.12);
    }
    // Wall art on the back wall, above the curtain.
    const art = opt('art');
    if (art.colors.length) {
      bx(0.9, 0.5, 0.04, '#6b4a2a', 0, 2.05, BACK + 0.04);
      bx(0.8, 0.4, 0.05, art.colors[0], 0, 2.05, BACK + 0.05);
      if (art.colors[1]) bx(0.55, 0.06, 0.06, art.colors[1], 0, 2.05, BACK + 0.06);
    }
    // Lamp on the table between the benches.
    const lamp = opt('lamp');
    if (lamp.colors.length) {
      bx(0.14, 0.3, 0.14, '#3a2a22', 0, 0.92, BENCH.z + 0.35);
      ball(0.1, lamp.colors[0], 0, 1.12, BENCH.z + 0.35, true);
    }
    this.seatCrew();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.t += dt;
    this.girl.update(dt, { speed: 0, airborne: false, riding: true, t: this.t });
    this.boy.update(dt, { speed: 0, airborne: false, riding: true, t: this.t + 1 });
    for (const k of this.kids) k.m.update(dt, { speed: 0, airborne: false, riding: true, t: this.t + k.ph });
    for (const p of this.pets) p.m.update(dt, 0, this.t + p.ph);
    // Stars and lanterns twinkle.
    this.glowers.forEach((m, i) => { if (i % 3 === 0) m.scale.setScalar(0.85 + Math.sin(this.t * 2.5 + i) * 0.15); });
    this.camera.position.x = Math.sin(this.t * 0.15) * 0.25;
    this.camera.lookAt(0, VIEW_Y, -1);
  }
}
