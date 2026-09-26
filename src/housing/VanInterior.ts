import * as THREE from 'three';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';
import type { GameState, VanSlot } from '../core/state';

/**
 * Inside Safar the van: a cosy room the player decorates slot by slot with things they have
 * made. The two sit on opposite benches across the aisle — together, never touching.
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
const VIEW_Y = 0.62;
/** Bench centres from the aisle: the travellers sit 2.4 m apart. */
const BENCH_X = 1.2;

export class VanInterior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(56, 1, 0.05, 50);
  private room = new THREE.Group();
  private girl: CharacterModel;
  private boy: CharacterModel;
  private t = 0;

  constructor(private st: GameState, girl: Outfit, boy: Outfit) {
    this.scene.background = new THREE.Color('#2a2238');
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a6a', 1.3));
    const key = new THREE.PointLight('#ffd8a0', 18, 12);
    key.position.set(0, 2.2, 0);
    this.scene.add(key);
    this.scene.add(this.room);
    this.girl = new CharacterModel(girl, '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    this.boy = new CharacterModel(boy, '#c99a74', HERO_SCALE.boy, -1, 'boy');
    // Opposite benches across the aisle: 2.4 m apart.
    this.girl.root.position.set(-BENCH_X, 0.05, 0.4);
    this.girl.root.rotation.y = Math.PI / 2;
    this.boy.root.position.set(BENCH_X, 0.05, 0.4);
    this.boy.root.rotation.y = -Math.PI / 2;
    this.scene.add(this.girl.root, this.boy.root);
    this.camera.position.set(0, 1.85, 3.4);
    this.camera.lookAt(0, VIEW_Y, -0.6);
    this.rebuild();
  }

  setOutfits(g: Outfit, b: Outfit): void {
    this.girl.setOutfit(g);
    this.boy.setOutfit(b);
  }

  rebuild(): void {
    this.room.clear();
    const v = this.st.van;
    const opt = (s: VanSlot) => VAN_OPTIONS[s].find((o) => o.id === v[s]) ?? VAN_OPTIONS[s][0];
    const mat = (c: string, glow = false) => glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
    const bx = (w: number, h: number, d: number, c: string, x: number, y: number, z: number, glow = false) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, glow));
      m.position.set(x, y, z);
      this.room.add(m);
      return m;
    };
    // Shell: floor, walls, curved roof.
    bx(3.2, 0.05, 4.4, '#8a6a4a', 0, 0, -0.4);
    bx(0.05, 2.4, 4.4, '#f4ead8', -1.6, 1.2, -0.4);
    bx(0.05, 2.4, 4.4, '#f4ead8', 1.6, 1.2, -0.4);
    bx(3.2, 2.4, 0.05, '#f4ead8', 0, 1.2, -2.6);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 4.4, 16, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#e8dcc6', side: THREE.BackSide, flatShading: true }));
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, 2.35, -0.4);
    roof.scale.set(1, 1, 0.35);
    this.room.add(roof);
    // Windows with curtains.
    for (const x of [-1.57, 1.57]) {
      bx(0.04, 0.7, 1.3, '#9fd3ff', x, 1.55, 0.2, true);
      const c = opt('curtains').colors[0];
      bx(0.06, 0.9, 0.3, c, x * 0.99, 1.55, -0.55);
      bx(0.06, 0.9, 0.3, c, x * 0.99, 1.55, 0.95);
    }
    // Rug.
    const rug = opt('rug').colors;
    bx(1.5, 0.02, 2.4, rug[0], 0, 0.035, 0.2);
    if (rug[1]) for (let i = 0; i < 5; i++) bx(1.4, 0.021, 0.12, rug[1 + (i % (rug.length - 1))], 0, 0.04, -0.6 + i * 0.4);
    // Benches with cushions.
    for (const x of [-BENCH_X, BENCH_X]) {
      bx(0.6, 0.45, 1.8, '#a8703f', x, 0.22, 0.4);
      const cc = opt('cushions').colors;
      for (let i = 0; i < 2; i++) bx(0.45, 0.14, 0.55, cc[i % cc.length], x, 0.52, -0.05 + i * 0.9);
    }
    // Bed at the back.
    bx(3.1, 0.45, 1.2, '#8a5a36', 0, 0.22, -1.95);
    const q = opt('quilt').colors;
    for (let i = 0; i < 4; i++) bx(0.74, 0.1, 1.1, q[i % q.length], -1.11 + i * 0.74, 0.5, -1.95);
    bx(0.6, 0.15, 0.3, '#ffffff', -0.6, 0.6, -2.4);
    bx(0.6, 0.15, 0.3, '#ffffff', 0.6, 0.6, -2.4);
    // Fairy lights along the ceiling.
    const lc = opt('lights').colors;
    if (lc.length) for (let i = 0; i < 24; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), mat(lc[i % lc.length], true));
      const z = -2.4 + (i % 12) * 0.36, x = i < 12 ? -1.3 : 1.3;
      s.position.set(x, 2.25 - Math.sin(((i % 12) / 11) * Math.PI) * 0.12, z);
      this.room.add(s);
    }
    // Plant.
    const pl = opt('plant');
    if (pl.colors.length) {
      bx(0.25, 0.25, 0.25, '#b5654a', 1.3, 0.6, -1.2);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), mat(pl.id === 'herbs' ? '#4f9a44' : '#5aa04a'));
      leaf.position.set(1.3, 0.9, -1.2);
      this.room.add(leaf);
      if (pl.id === 'flowers') for (let i = 0; i < 5; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), mat('#ff8fb8'));
        f.position.set(1.3 + Math.cos(i) * 0.15, 1.02, -1.2 + Math.sin(i) * 0.15);
        this.room.add(f);
      }
    }
    // Wall art above the bed.
    const art = opt('art');
    if (art.colors.length) {
      bx(0.8, 0.5, 0.04, '#6b4a2a', 0, 1.35, -2.56);
      bx(0.7, 0.4, 0.05, art.colors[0], 0, 1.35, -2.55);
      if (art.colors[1]) bx(0.5, 0.06, 0.06, art.colors[1], 0, 1.35, -2.54);
    }
    // Lamp.
    const lamp = opt('lamp');
    if (lamp.colors.length) {
      bx(0.2, 0.3, 0.2, '#3a2a22', -1.3, 0.6, -1.2);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(lamp.colors[0], true));
      l.position.set(-1.3, 0.85, -1.2);
      this.room.add(l);
    }
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.t += dt;
    this.girl.update(dt, { speed: 0, airborne: false, riding: true, t: this.t });
    this.boy.update(dt, { speed: 0, airborne: false, riding: true, t: this.t + 1 });
    this.camera.position.x = Math.sin(this.t * 0.15) * 0.25;
    this.camera.lookAt(0, VIEW_Y, -0.6);
  }
}
