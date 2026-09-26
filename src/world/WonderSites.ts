import * as THREE from 'three';
import type { Game } from '../Game';
import { GeoBuilder, archPanel, box, cone, cyl, dome, flowers, rock, sphere, tree } from './kit';
import { surfaceAt } from './terrain';
import { FIND_RADIUS, WONDERS, foundWonder, wonderPos, type WonderDef } from './wonders';

/**
 * The hidden wonders in the world: a small scene for each, and a faint rising sparkle that
 * draws the curious in from a distance. Walking up to one finds it.
 */
export class WonderSites {
  private sites: Array<{ def: WonderDef; group: THREE.Group; sparkle: THREE.Points; x: number; z: number; y: number }> = [];
  private checkIn = 0;

  constructor(private g: Game) {
    const dot = new THREE.PointsMaterial({ size: 0.35, color: new THREE.Color('#fff2c8').multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    for (const def of WONDERS) {
      const { x, z } = wonderPos(def);
      const y = surfaceAt(x, z, 1e9);
      const solid = new GeoBuilder(), glow = new GeoBuilder();
      build(def, solid, glow);
      const group = new THREE.Group();
      const m = solid.build(g.world.solid), gm = glow.build(g.world.glow);
      if (m) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
      if (gm) group.add(gm);
      group.position.set(x, y, z);
      const n = 60, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 6, Math.random() * 14, (Math.random() - 0.5) * 6], i * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const sparkle = new THREE.Points(geo, dot);
      group.add(sparkle);
      g.scene.add(group);
      this.sites.push({ def, group, sparkle, x, z, y });
    }
  }

  update(dt: number, t: number): void {
    const p = this.g.trav.gPos;
    for (const s of this.sites) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      s.group.visible = d < 700;
      if (!s.group.visible) continue;
      // The sparkle rises slowly, and fades once the wonder has been found.
      const pos = s.sparkle.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.8;
        if (y > 14) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      s.sparkle.visible = !foundWonder(this.g.st, s.def.id) || Math.sin(t * 0.5) > 0.6;
    }
    this.checkIn -= dt;
    if (this.checkIn > 0 || !this.g.started || this.g.cutscene) return;
    this.checkIn = 0.5;
    for (const s of this.sites) {
      if (foundWonder(this.g.st, s.def.id)) continue;
      if (Math.hypot(s.x - p.x, s.z - p.z) > FIND_RADIUS || Math.abs(p.y - s.y) > 12) continue;
      this.find(s.def);
    }
  }

  private find(def: WonderDef): void {
    const st = this.g.st;
    st.flags.push(def.id);
    st.light += 0.5;
    st.coins += 25;
    this.g.bus.emit('coins:changed', { coins: st.coins });
    const found = WONDERS.filter((w) => foundWonder(st, w.id)).length;
    this.g.ui.lanternMomentText('✨', `Hidden wonder: ${def.name}`, def.story);
    this.g.toast(`✨ ${def.name} — ${found} of ${WONDERS.length} hidden wonders found · +25 coins · the thread shines brighter`, 'reward');
  }
}

function build(def: WonderDef, g: GeoBuilder, glow: GeoBuilder): void {
  const rnd = mulberry(def.id.length * 97 + def.land.length);
  switch (def.kind) {
    case 'glade':
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        sphere(glow, 0.22, i % 2 ? '#e8e0ff' : '#ffffff', Math.cos(a) * 3.2, 0.35, Math.sin(a) * 3.2, 6);
        cyl(g, 0.03, 0.03, 0.35, '#5a8a4a', Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, 4);
      }
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3;
        cyl(g, 0.08, 0.1, 0.3, '#f4efe6', Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4, 6);
        dome(g, 0.3, '#e0576a', Math.cos(a) * 1.4, 0.3, Math.sin(a) * 1.4, 8);
      }
      flowers(g, 0, 0, 0, ['#ffffff', '#d9c2ff', '#b3e6ff'], rnd, 14);
      break;
    case 'spring':
      cyl(g, 3.4, 3.6, 0.3, '#8a8a8a', 0, -0.1, 0, 18);
      cyl(glow, 3.0, 3.0, 0.32, '#8fd3ff', 0, -0.08, 0, 18);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        rock(g, Math.cos(a) * 3.8, 0, Math.sin(a) * 3.8, 0.6 + rnd() * 0.4, '#9a9488');
      }
      box(g, 1.6, 0.4, 0.5, '#b89a7a', 0, 0, 4.6);
      tree(g, 'palm', 4.5, 0, -3, 1, rnd);
      break;
    case 'overlook':
      cyl(g, 4, 4.3, 0.6, '#b8b0a4', 0, 0, 0, 12);
      box(g, 2, 0.45, 0.5, '#8a5a3a', 0, 0.6, -1.5);
      cyl(g, 0.05, 0.05, 1.3, '#6b4a2a', 1.8, 0.6, 1, 5);
      cyl(g, 0.12, 0.08, 0.9, '#d4af37', 1.8, 1.9, 1, 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        box(g, 0.2, 0.9, 0.2, '#b8b0a4', Math.cos(a) * 3.8, 0.6, Math.sin(a) * 3.8);
      }
      sphere(glow, 0.2, '#fff2c8', 0, 1.4, -1.5, 6);
      break;
    case 'grove':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        tree(g, def.land === 'china' ? 'bamboo' : 'oak', Math.cos(a) * 5, 0, Math.sin(a) * 5, 1.3, rnd);
        sphere(glow, 0.25, ['#ffb347', '#ff8fb8', '#fff27a'][i % 3], Math.cos(a) * 3.6, 2.6, Math.sin(a) * 3.6, 6, 1.3);
      }
      box(g, 1.8, 0.4, 0.5, '#8a5a3a', 0, 0, 0);
      break;
    case 'ruin':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        cyl(g, 0.45, 0.5, 1.5 + rnd() * 3, '#e8dcc6', Math.cos(a) * 4, 0, Math.sin(a) * 4, 8);
      }
      archPanel(g, 3, 4.5, '#e8dcc6', 0, 0, -4, 0, 0.5, false);
      archPanel(glow, 2, 3.2, '#8fd3ff', 0, 0.2, -3.8, 0, 0.05, false);
      flowers(g, 0, 0, 0, ['#ff6b6b', '#ffffff', '#f2d14e'], rnd, 10);
      break;
    case 'garden':
      for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) cyl(g, 0.15, 0.15, 3, '#fbf7ee', x, 0, z, 8);
      cyl(g, 2.6, 2.6, 0.2, '#fbf7ee', 0, 3, 0, 16);
      dome(g, 2.2, '#fbf7ee', 0, 3.2, 0, 16);
      cone(g, 0.15, 0.8, '#d4af37', 0, 5.3, 0, 6);
      for (let i = 0; i < 10; i++) flowers(g, Math.cos(i) * 4.5, 0, Math.sin(i) * 4.5, ['#ff8fb8', '#ffffff', '#d1495b', '#f2d14e'], rnd, 6);
      sphere(glow, 0.3, '#fff2c8', 0, 2.5, 0, 8);
      break;
  }
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
