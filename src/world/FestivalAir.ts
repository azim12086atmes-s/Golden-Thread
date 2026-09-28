import * as THREE from 'three';
import { GeoBuilder, M, box, cone, cyl, sphere } from './kit';
import { lanternGeometry } from './lanterns';
import { REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { reservedAt } from './reserved';
import { surfaceAt } from './terrain';

/**
 * What each land flies in its air on a festival day, over and above the strings across its streets
 * (streetGarlands.ts) and the sky lanterns (SkyLanterns.ts) — each after a real festival:
 *  - Sakura Hollow: koinobori, carp streamers flying from tall poles for Children's Day;
 *  - Hanok Village: the lotus-lantern canopy of Yeondeunghoe over the avenue;
 *  - Gulabi Nagar: a ceiling of akash kandils, Diwali's star lanterns;
 *  - Kaveri Coast: kudamattam, tiers of ornate festival parasols raised high on poles;
 *  - Bagh-e-Noor: patang kites of Basant on long strings, dipping and climbing;
 *  - Nusa Rinjani: a great bebean fish kite with its long tail, tethered over the fields;
 *  - Madinat an-Nur, Souq al-Qamar, the Nile: Ramadan's crescents and stars outlined in light;
 *  - the Meadow and Maple Row: clusters of balloons tied to posts round the plaza;
 *  - New Yonder: parade balloons — a star, a heart, a crescent, a ringed planet, a rocket;
 *  - Alpenrose: lampions, round paper lanterns, on strings for the summer festival;
 *  - Fjordhavn: long vimpel pennants streaming from white flagpoles;
 *  - Firenzia: gonfalons, the tall banners of the contrade;
 *  - Tents of Rimal: sadu-woven pennants on tent-poles;
 *  - the Sky Isles: ribbons of light winding up round the isles.
 * No faces or eyes on any of it (the carp and fish kites included). Built for the land you are in;
 * a few moving pieces are animated, the rest merged into two draws.
 */

type Mover = { obj: THREE.Object3D; kind: 'streamer' | 'bob' | 'kite' | 'drift' | 'spin'; base: THREE.Vector3; ph: number; line?: THREE.Line; anchor?: THREE.Vector3 };

export class FestivalAir {
  readonly group = new THREE.Group();
  private land: RegionId | null = null;
  private movers: Mover[] = [];

  constructor(private solid: THREE.Material, private glow: THREE.Material) {}

  update(dt: number, t: number, land: RegionId, night: number): void {
    void dt; void night;
    if (land !== this.land) this.build(land);
    for (const m of this.movers) {
      const o = m.obj, b = m.base, p = m.ph;
      switch (m.kind) {
        case 'streamer': // Flying out downwind, rippling and dipping.
          o.rotation.y = Math.sin(t * 0.35 + p) * 0.5;
          o.rotation.z = -0.15 + Math.sin(t * 1.9 + p) * 0.12;
          o.children.forEach((ch, i) => { ch.rotation.y = Math.sin(t * 3 - i * 0.9 + p) * 0.35; });
          break;
        case 'bob':
          o.position.set(b.x + Math.sin(t * 0.7 + p) * 0.25, b.y + Math.sin(t * 1.1 + p) * 0.2, b.z + Math.cos(t * 0.6 + p) * 0.25);
          o.rotation.y = Math.sin(t * 0.4 + p) * 0.3;
          break;
        case 'drift':
          o.position.set(b.x + Math.sin(t * 0.15 + p) * 1.5, b.y + Math.sin(t * 0.5 + p) * 0.6, b.z);
          o.rotation.set(Math.sin(t * 0.4 + p) * 0.06, Math.sin(t * 0.2 + p) * 0.2, Math.sin(t * 0.3 + p) * 0.08);
          break;
        case 'kite': {
          o.position.set(b.x + Math.sin(t * 0.3 + p) * 4, b.y + Math.sin(t * 0.7 + p) * 2.5, b.z + Math.cos(t * 0.23 + p) * 3);
          o.rotation.z = Math.sin(t * 1.3 + p) * 0.35;
          if (m.line && m.anchor) {
            const pos = m.line.geometry.getAttribute('position') as THREE.BufferAttribute, a = m.anchor, k = o.position;
            for (let i = 0; i <= 10; i++) { const u = i / 10; pos.setXYZ(i, a.x + (k.x - a.x) * u, a.y + (k.y - a.y) * u - Math.sin(u * Math.PI) * 3, a.z + (k.z - a.z) * u); }
            pos.needsUpdate = true;
          }
          break;
        }
        case 'spin': o.rotation.y = t * 0.03 + p; break;
      }
    }
  }

  private clear(): void {
    for (const ch of [...this.group.children]) {
      this.group.remove(ch);
      ch.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh || (o as THREE.Line).isLine) m.geometry.dispose(); });
    }
    this.movers = [];
  }

  /** Two merged draws for what stands still, plus the movers. */
  private build(land: RegionId): void {
    this.clear();
    this.land = land;
    const c = regionCenter(REGION_BY_ID[land]);
    const g = new GeoBuilder(), glow = new GeoBuilder();
    const H = (x: number, z: number) => surfaceAt(c.x + x, c.z + z, 1e9);
    const clear = (x: number, z: number) => !reservedAt(land, x, z, 4);
    const piece = (fn: (g: GeoBuilder, gl: GeoBuilder) => void) => {
      const pg = new GeoBuilder(), pl = new GeoBuilder();
      fn(pg, pl);
      const grp = new THREE.Group(), a = pg.build(this.solid), b = pl.build(this.glow);
      if (a) grp.add(a); if (b) grp.add(b);
      return grp;
    };
    const add = (obj: THREE.Object3D, kind: Mover['kind'], x: number, y: number, z: number, ph: number) => {
      obj.position.set(c.x + x, y, c.z + z);
      this.group.add(obj);
      this.movers.push({ obj, kind, base: obj.position.clone(), ph });
    };
    /** Lines across the north–south avenues, 10.5 m up, between the garlands: fn draws one item at (x, y, z). */
    const canopy = (step: number, item: (g: GeoBuilder, gl: GeoBuilder, x: number, y: number, z: number, k: number) => void) => {
      let k = 0;
      for (const s of [-1, 1]) for (let d = 76; d <= 112; d += 4) {
        const z = s * d;
        if (!clear(0, z) || Math.abs(d - 93) < 2) continue;
        const y = H(0, z) + 10.5;
        for (const sx of [-1, 1]) { cyl(g, 0.07, 0.09, 11, '#4a3a2e', c.x + sx * 11, y - 10.5, c.z + z, 6); }
        g.add(new THREE.CylinderGeometry(0.015, 0.015, 22, 3).rotateZ(Math.PI / 2), '#3a2a22', M(c.x, y, c.z + z));
        for (let x = -9.5; x <= 9.5; x += step) item(g, glow, c.x + x, y - 0.1 - Math.cos((x / 11) * Math.PI / 2) * 0.4, c.z + z, k++);
      }
    };
    /** Poles along the sides of the north–south avenues. */
    const poles = (fn: (x: number, y: number, z: number, k: number) => void) => {
      let k = 0;
      for (const s of [-1, 1]) for (const d of [72, 86, 100]) for (const sx of [-1, 1]) {
        const x = sx * 13, z = s * d;
        if (!clear(x, z)) continue;
        fn(x, H(x, z), z, k++);
      }
    };

    switch (land) {
      case 'japan': poles((x, y, z, k) => {
        // A tall pole with its spinning wheel, a streamer of cloud colours, then three carp — black, red, blue.
        cyl(g, 0.12, 0.16, 14, '#e8e0d0', c.x + x, y, c.z + z, 8);
        sphere(g, 0.35, '#d4af37', c.x + x, y + 14.2, c.z + z, 8);
        for (let i = 0; i < 6; i++) g.add(new THREE.BoxGeometry(0.06, 0.5, 0.06).translate(0, 0.35, 0), ['#ff5a5a', '#ffd24a', '#5ac8ff'][i % 3], M(c.x + x, y + 13.7, c.z + z, 0, 1, 1, 1, (i / 6) * Math.PI * 2, 0));
        const fish = [['#2a2a30', 3.6], ['#d8342a', 3], ['#2f6ab8', 2.4], ['#ff8fb8', 1.8]] as const;
        fish.forEach(([col, len], i) => {
          const s = piece((pg) => {
            // Three segments hinged one behind the other so the body ripples; scales as rings; a forked tail.
            let prev: THREE.Group | null = null;
            void prev;
            for (let q = 0; q < 3; q++) { const r0 = (len * 0.16) * (1 - q * 0.22), r1 = r0 * 0.78; pg.add(new THREE.CylinderGeometry(r1, r0, len / 3, 12, 1, true).rotateZ(-Math.PI / 2), q % 2 ? col : col, M(len / 6 + (q * len) / 3, 0, 0)); pg.add(new THREE.TorusGeometry(r0 * 0.95, 0.03, 4, 12).rotateY(Math.PI / 2), '#ffffff', M((q * len) / 3 + 0.05, 0, 0)); }
            pg.add(new THREE.ConeGeometry(len * 0.13, len * 0.3, 3).rotateZ(Math.PI / 2), col, M(len + len * 0.1, 0, 0, 0, 1, 1, 0.3));
          });
          const hold = new THREE.Group();
          hold.add(s);
          add(hold, 'streamer', x, y + 12.8 - i * 1.3, z, k * 1.7 + i);
        });
      }); break;
      case 'korea': canopy(1.1, (g, gl, x, y, z, k) => {
        // Lotus lanterns: a glowing bud of petals in pink, white, yellow, green, a tassel beneath.
        const col = ['#ff8fb8', '#ffffff', '#ffd24a', '#8fe0a0', '#ffb0d0'][k % 5];
        cyl(g, 0.01, 0.01, 0.3, '#3a2a22', x, y - 0.3, z, 3);
        gl.add(new THREE.SphereGeometry(0.28, 8, 6).scale(1, 0.8, 1), col, M(x, y - 0.55, z));
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(new THREE.ConeGeometry(0.1, 0.3, 4), col, M(x + Math.cos(a) * 0.24, y - 0.45, z + Math.sin(a) * 0.24, 0, 1, 1, 1, Math.sin(a) * 0.4, -Math.cos(a) * 0.4)); }
        cyl(g, 0.02, 0.02, 0.35, '#e8342a', x, y - 1.2, z, 3);
      }); break;
      case 'indianorth': canopy(1.6, (g, gl, x, y, z, k) => {
        // Akash kandils: star lanterns with tails of paper, orange, pink and gold.
        const col = ['#ff9a1f', '#ff4a8a', '#ffd24a'][k % 3];
        cyl(g, 0.01, 0.01, 0.4, '#3a2a22', x, y - 0.4, z, 3);
        gl.add(lanternGeometry('kandil').scale(0.9, 0.9, 0.9), col, M(x, y - 1.3, z));
        for (let i = 0; i < 3; i++) box(g, 0.04, 0.9, 0.02, col, x - 0.1 + i * 0.1, y - 2.3, z);
      }); break;
      case 'islamic': case 'middleeast': case 'egypt': canopy(3.2, (g, gl, x, y, z, k) => {
        // Ramadan zina: crescents and eight-pointed stars outlined in light, hung in turn.
        cyl(g, 0.01, 0.01, 0.5, '#3a2a22', x, y - 0.5, z, 3);
        if (k % 2) gl.add(new THREE.TorusGeometry(0.5, 0.05, 4, 16, Math.PI * 1.35), '#ffd27a', M(x, y - 1.1, z, 0, 1, 1, 1, 0, Math.PI * 0.82));
        else for (let q = 0; q < 2; q++) gl.add(new THREE.TorusGeometry(0.42, 0.04, 4, 4), '#fff0c0', M(x, y - 1.1, z, 0, 1, 1, 1, 0, q * Math.PI / 4));
      }); break;
      case 'switzerland': canopy(1.3, (g, gl, x, y, z, k) => {
        // Lampions: round ribbed paper lanterns, red, white and gold.
        const col = ['#e8342a', '#fff4e0', '#ffc24a'][k % 3];
        cyl(g, 0.01, 0.01, 0.25, '#3a2a22', x, y - 0.25, z, 3);
        gl.add(new THREE.SphereGeometry(0.3, 10, 8).scale(1, 0.9, 1), col, M(x, y - 0.55, z));
        for (let i = 0; i < 3; i++) g.add(new THREE.TorusGeometry(0.29 - Math.abs(i - 1) * 0.08, 0.012, 3, 14).rotateX(Math.PI / 2), '#8a6a4a', M(x, y - 0.55 + (i - 1) * 0.16, z));
      }); break;
      case 'indiasouth': poles((x, y, z, k) => {
        // Kudamattam: three tiers of gold-fringed parasols raised on a pole, sequins glinting.
        cyl(g, 0.08, 0.1, 9, '#c8a86a', c.x + x, y, c.z + z, 6);
        const col = ['#e8342a', '#2f8a5a', '#8a2ab8', '#ffb02a'][k % 4];
        for (let i = 0; i < 3; i++) {
          const yy = y + 9 - i * 1.1, r = 1.6 - i * 0.35;
          g.add(new THREE.SphereGeometry(r, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.4).scale(1, 0.45, 1), i === 1 ? '#ffd24a' : col, M(c.x + x, yy, c.z + z));
          for (let q = 0; q < 16; q++) { const a = (q / 16) * Math.PI * 2; box(g, 0.08, 0.35, 0.02, '#d4af37', c.x + x + Math.cos(a) * r * 0.97, yy - 0.2, c.z + z + Math.sin(a) * r * 0.97, -a); }
          for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2 + i; sphere(glow, 0.05, '#fff2c8', c.x + x + Math.cos(a) * r * 0.6, yy + 0.35, c.z + z + Math.sin(a) * r * 0.6, 4); }
        }
        cone(g, 0.1, 0.8, '#d4af37', c.x + x, y + 9.4, c.z + z, 6);
      }); break;
      case 'norway': poles((x, y, z, k) => {
        // A white flagpole with a long vimpel streaming from its top.
        cyl(g, 0.08, 0.12, 11, '#f4f4f4', c.x + x, y, c.z + z, 8);
        sphere(g, 0.18, '#d4af37', c.x + x, y + 11.1, c.z + z, 6);
        const v = piece((pg) => { for (let q = 0; q < 3; q++) pg.add(new THREE.BoxGeometry(2.2, 0.36 - q * 0.1, 0.02), q % 2 ? '#ffffff' : '#ba0c2f', M(1.1 + q * 2.2, 0, 0)); });
        const hold = new THREE.Group(); hold.add(v);
        add(hold, 'streamer', x, y + 10.6, z, k * 1.3);
      }); break;
      case 'renaissance': poles((x, y, z, k) => {
        // A gonfalon: a tall banner hung from a crossbar, its contrada's colours in bands, a fringed hem.
        cyl(g, 0.07, 0.09, 10, '#6a4a2a', c.x + x, y, c.z + z, 6);
        box(g, 0.05, 0.05, 2.2, '#d4af37', c.x + x, y + 9.6, c.z + z);
        const cols = [['#b5552e', '#e2b43a'], ['#2f4a8a', '#fbf3e0'], ['#2f7a5a', '#e2b43a']][k % 3];
        for (let q = 0; q < 4; q++) box(g, 0.03, 1.2, 2, cols[q % 2], c.x + x + 0.1, y + 8.2 - q * 1.2, c.z + z);
        for (let q = 0; q < 8; q++) box(g, 0.03, 0.3, 0.12, '#d4af37', c.x + x + 0.1, y + 3.6, c.z + z - 0.9 + q * 0.26);
      }); break;
      case 'desert': poles((x, y, z, k) => {
        // Crossed tent-poles flying a sadu-woven pennant.
        for (const s of [-1, 1]) g.add(new THREE.CylinderGeometry(0.05, 0.07, 8, 5), '#7a5a3a', M(c.x + x + s * 0.3, y + 4, c.z + z, 0, 1, 1, 1, 0, s * 0.06));
        const v = piece((pg) => { for (let q = 0; q < 6; q++) pg.add(new THREE.BoxGeometry(0.55, 0.9 - q * 0.1, 0.02), ['#c8483a', '#2a2a30', '#f2d6a0'][q % 3], M(0.3 + q * 0.55, 0, 0)); });
        const hold = new THREE.Group(); hold.add(v);
        add(hold, 'streamer', x, y + 7.3, z, k);
      }); break;
      case 'meadow': case 'vintage': {
        // Balloon clusters tied to posts round the plaza and along the avenues.
        const spots: Array<[number, number]> = [];
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; spots.push([Math.cos(a) * 50, Math.sin(a) * 50]); }
        for (const d of [72, 100]) for (const s of [-1, 1]) spots.push([13, s * d], [-13, s * d]);
        const cols = land === 'meadow' ? ['#ff8fb8', '#ffd24a', '#8fd0ff', '#b8ff9a', '#c9a0ff', '#ffffff'] : ['#ff5a5a', '#ffd24a', '#5ac8ff', '#ff8fb8', '#8aff8a'];
        spots.forEach(([x, z], k) => {
          if (!clear(x, z)) return;
          const y = H(x, z);
          cyl(g, 0.05, 0.06, 2.2, '#e8e0d0', c.x + x, y, c.z + z, 6);
          const bunch = piece((pg) => {
            for (let i = 0; i < 12; i++) {
              const a = i * 2.4, r = 0.35 + (i % 3) * 0.3, h = 2.6 + (i % 4) * 0.45;
              pg.add(new THREE.SphereGeometry(0.34, 10, 8).scale(1, 1.18, 1), cols[(i + k) % cols.length], M(Math.cos(a) * r, h, Math.sin(a) * r));
              pg.add(new THREE.CylinderGeometry(0.006, 0.006, h - 0.3, 3).translate(0, (h - 0.3) / 2, 0), '#f4f4f4', M(0, 0, 0, 0, 1, 1, 1, Math.sin(a) * r * 0.14, -Math.cos(a) * r * 0.14));
            }
          });
          add(bunch, 'bob', x, y + 2.2, z, k * 0.9);
        });
        break;
      }
      case 'newyork': {
        // Parade balloons over the avenue, each held by three ropes: a star, a heart, a crescent, a ringed planet, a rocket.
        const shapes: Array<(pg: GeoBuilder) => void> = [
          (pg) => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 1.6 : 3.6; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } pg.add(new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.4, bevelSegments: 2 }).translate(0, 0, -0.8), '#ffd24a'); },
          (pg) => { const s = new THREE.Shape(); s.moveTo(0, -3); s.bezierCurveTo(-4.5, 0.4, -2.4, 3.4, 0, 1.4); s.bezierCurveTo(2.4, 3.4, 4.5, 0.4, 0, -3); pg.add(new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.4, bevelSegments: 2 }).translate(0, 0, -0.8), '#ff4a8a'); },
          (pg) => { pg.add(new THREE.TorusGeometry(2.6, 1.0, 10, 24, Math.PI * 1.3), '#e8e8ff', M(0, 0, 0, 0, 1, 1, 1, 0, Math.PI * 0.85)); },
          (pg) => { pg.add(new THREE.SphereGeometry(2.4, 16, 12), '#ff9a4a'); pg.add(new THREE.TorusGeometry(3.6, 0.3, 4, 32).rotateX(Math.PI / 2 - 0.4), '#8fd0ff'); },
          (pg) => { pg.add(new THREE.CylinderGeometry(1.2, 1.2, 5, 16), '#f4f4f4'); pg.add(new THREE.ConeGeometry(1.2, 2.2, 16), '#e8342a', M(0, 3.6, 0)); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; pg.add(new THREE.BoxGeometry(0.2, 1.8, 1.4), '#e8342a', M(Math.cos(a) * 1.3, -2.2, Math.sin(a) * 1.3, -a)); } pg.add(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16).rotateX(Math.PI / 2), '#5ac8ff', M(0, 0.8, 1.2)); },
        ];
        let k = 0;
        for (const s of [-1, 1]) for (const d of [80, 104]) {
          const z = s * d, y = H(0, z) + 16;
          const b = piece(shapes[k % shapes.length]);
          add(b, 'drift', 0, y, z, k);
          for (const [dx, dz] of [[-6, -2], [6, -2], [0, 3]]) g.add(new THREE.CylinderGeometry(0.03, 0.03, 16, 3).translate(0, 8, 0), '#e8e0d0', M(c.x + dx * 0.5, H(0, z), c.z + z + dz * 0.5, 0, 1, 1, 1, dz * 0.02, -dx * 0.03));
          k++;
        }
        break;
      }
      case 'mughal': case 'indonesia': {
        // Kites on long strings: patang diamonds over the gardens, or Bali's great bebean fish kite with its tail.
        const n = land === 'mughal' ? 6 : 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.4, ax = Math.cos(a) * 70, az = Math.sin(a) * 70;
          if (!clear(ax, az)) continue;
          const ay = H(ax, az) + 1;
          const kite = piece((pg) => {
            if (land === 'mughal') {
              const col = ['#ff4a8a', '#ffd24a', '#5ac8ff', '#8aff8a', '#ff9a1f', '#b86bff'][i];
              pg.add(new THREE.CylinderGeometry(1, 1, 0.04, 4).rotateX(Math.PI / 2), col, M(0, 0, 0, 0, 1, 1.2, 1));
              pg.add(new THREE.BoxGeometry(0.04, 2.3, 0.05), '#6a4a2a'); pg.add(new THREE.TorusGeometry(0.9, 0.03, 3, 12, Math.PI), '#6a4a2a', M(0, 0.1, 0.03));
              pg.add(new THREE.ConeGeometry(0.35, 0.5, 3), col, M(0, -1.45, 0, 0, 1, 1, 0.1));
            } else {
              // Bebean: a fish-shaped kite (no eyes) with a long twin tail of cloth.
              const s = new THREE.Shape(); s.moveTo(-5, 0); s.quadraticCurveTo(-1, 3.2, 3, 1.2); s.lineTo(5, 2.4); s.lineTo(4.2, 0); s.lineTo(5, -2.4); s.lineTo(3, -1.2); s.quadraticCurveTo(-1, -3.2, -5, 0);
              pg.add(new THREE.ShapeGeometry(s), '#ff5a3a');
              for (let q = 0; q < 5; q++) pg.add(new THREE.BoxGeometry(0.6, 3.6 - q * 0.5, 0.02), ['#ffd24a', '#2a2a30', '#ffffff'][q % 3], M(-3 + q * 1.4, 0, 0.02));
              for (let q = 0; q < 8; q++) pg.add(new THREE.BoxGeometry(1.6, 0.25, 0.02), q % 2 ? '#ffd24a' : '#e8342a', M(5.4 + q * 1.5, Math.sin(q) * 0.6, 0));
            }
          });
          const line = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(33), 3)), new THREE.LineBasicMaterial({ color: '#f4f0e0' }));
          line.frustumCulled = false;
          this.group.add(line);
          kite.position.set(c.x + ax * 1.2, ay + (land === 'mughal' ? 32 : 45), c.z + az * 1.2);
          this.group.add(kite);
          this.movers.push({ obj: kite, kind: 'kite', base: kite.position.clone(), ph: i * 1.7, line, anchor: new THREE.Vector3(c.x + ax, ay, c.z + az) });
        }
        break;
      }
      case 'skyisles': {
        // Ribbons of light winding up round the isles, turning slowly.
        const rib = piece((pg, pl) => {
          for (let r = 0; r < 3; r++) {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= 80; i++) { const u = i / 80, a = u * Math.PI * 6 + r * 2.1; pts.push(new THREE.Vector3(Math.cos(a) * (60 - u * 25), 20 + u * 130, Math.sin(a) * (60 - u * 25))); }
            pl.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.12, 4), ['#fff0b0', '#ffd6f0', '#bfe8ff'][r]);
          }
          void pg;
        });
        add(rib, 'spin', 0, 0, 0, 0);
        break;
      }
    }
    const a = g.build(this.solid), b = glow.build(this.glow);
    if (a) this.group.add(a);
    if (b) this.group.add(b);
  }
}
