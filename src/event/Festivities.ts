import * as THREE from 'three';
import { PartyAir } from '../world/PartyAir';
import { AnimalModel } from '../animals/AnimalModel';
import { CharacterModel } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';
import { auroraMaterial, rainbowGeometry, rainbowMaterial } from '../world/Sky';
import { CASTLE, guestSpot, guests } from './site';
import { Dragon } from './Dragon';
import { wardrobeFor } from '../npc/Townsfolk';
import { REGIONS } from '../world/regions';

/**
 * The party around the castle: petals and roses falling, fireflies of every colour, rainbow
 * magic dust, sky lanterns rising, aurora and rainbows overhead, unicorns in the flower meadow,
 * a friendly dragon looping above, and guests from every land cheering.
 *
 * `level` (0..1) fades all of it in and out; guests appear only once the party has begun.
 */

function dotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function petalTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff';
  x.beginPath();
  x.ellipse(16, 16, 13, 7, 0.6, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

interface Swarm {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  base: Float32Array;
  vel: Float32Array;
  phase: Float32Array;
}

function swarm(n: number, size: number, tex: THREE.Texture, colour: (i: number, c: THREE.Color) => void, additive: boolean): Swarm {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    colour(i, c);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, alphaTest: 0.02, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, base: new Float32Array(n * 3), vel: new Float32Array(n * 3), phase: new Float32Array(n) };
}

/** Party dancers in the ring (beyond the guests lining the aisle). */
export const DANCERS = 26;

export class Festivities {
  readonly group = new THREE.Group();
  level = 0;
  private y: number;
  readonly centre: THREE.Vector3;
  private petals: Swarm;
  private roses: THREE.InstancedMesh;
  private roseState: Float32Array;
  private flies: Swarm;
  private dust: Swarm;
  private lanterns: THREE.InstancedMesh;
  private lanternState: Float32Array;
  private auroras: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private rainbows: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  private unicorns: Array<{ m: AnimalModel; a: number; r: number; s: number }> = [];
  readonly dragon = new Dragon();
  /** The air of every land, each in its own slice round the courtyard. */
  readonly air = new PartyAir();
  private crowd: Array<{ model: CharacterModel; x: number; z: number; face: number; ph: number }> = [];
  private crowdOn = false;
  private dancers: Array<{ model: CharacterModel; a: number; r: number; ph: number }> = [];
  private tmp = new THREE.Matrix4();
  /** Warm light over the courtyard, and coloured wash lights among the flowers. */
  private lights: THREE.PointLight[] = [];
  /** A dome of multi-coloured glitter and stars over the whole sky. */
  private glitter: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private glitterBase: Float32Array;

  constructor(groundY: number) {
    this.y = groundY;
    this.centre = new THREE.Vector3(CASTLE.venue.x, groundY, CASTLE.venue.z);
    const dot = dotTexture();

    // Petals: pink, white and rose, drifting down over the courtyard.
    this.petals = swarm(700, 0.32, petalTexture(), (i, c) => c.set(['#ffb3d1', '#ffffff', '#ff8fb8', '#ffd1e3'][i % 4]), false);
    this.seed(this.petals, 40, 2, 30);
    // Fireflies of every colour, low over the flowers.
    this.flies = swarm(420, 0.34, dot, (i, c) => c.setHSL((i * 0.137) % 1, 0.95, 0.62), true);
    this.seed(this.flies, 62, 0.4, 3.5);
    // Magic dust: a slow rainbow swirl around the courtyard.
    this.dust = swarm(900, 0.16, dot, (i, c) => c.setHSL((i / 900) % 1, 0.9, 0.72), true);
    this.seed(this.dust, 26, 0.5, 9);
    this.group.add(this.petals.points, this.flies.points, this.dust.points, this.air.group);

    // Roses: real little blossoms tumbling down.
    const rose = new THREE.DodecahedronGeometry(0.11, 0);
    rose.scale(1, 0.75, 1);
    this.roses = new THREE.InstancedMesh(rose, new THREE.MeshStandardMaterial({ color: '#e0284f', roughness: 0.5, flatShading: true }), 90);
    this.roseState = new Float32Array(90 * 4);
    for (let i = 0; i < 90; i++) this.roseState.set([this.rand(-30, 30), this.rand(0, 28), this.rand(-30, 30), Math.random() * 6], i * 4);
    this.roses.frustumCulled = false;
    this.group.add(this.roses);

    // Sky lanterns rising from the courtyard (the owner's favourite).
    const lan = new THREE.CylinderGeometry(0.28, 0.2, 0.55, 8);
    this.lanterns = new THREE.InstancedMesh(lan, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb24a').multiplyScalar(1.6), toneMapped: false }), 60);
    this.lanternState = new Float32Array(60 * 4);
    for (let i = 0; i < 60; i++) this.lanternState.set([this.rand(-24, 24), this.rand(2, 90), this.rand(-24, 24), Math.random() * 6], i * 4);
    this.lanterns.frustumCulled = false;
    this.group.add(this.lanterns);

    // The aurora covers the sky: curtains all round the horizon and ribbons sweeping overhead.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(620, 200, 60, 1), auroraMaterial(i * 1.3 + 0.5));
      m.position.set(this.centre.x + Math.cos(a) * 300, groundY + 120 + (i % 3) * 30, this.centre.z + Math.sin(a) * 300);
      m.rotation.y = -a + Math.PI / 2;
      m.frustumCulled = false;
      this.auroras.push(m);
      this.group.add(m);
    }
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(700, 160, 60, 1), auroraMaterial(i * 2.1 + 0.3));
      m.rotation.set(-Math.PI / 2 + 0.25, i * 0.8, 0);
      m.position.set(this.centre.x + (i - 1.5) * 60, groundY + 230 + i * 12, this.centre.z - 40 + (i % 2) * 80);
      m.frustumCulled = false;
      this.auroras.push(m);
      this.group.add(m);
    }
    for (const [dx, dz, r, ry] of [[-60, -40, 120, 0.5], [70, -90, 95, -0.4], [0, -180, 160, 0], [-150, 60, 110, 1.3], [140, 40, 130, -1.2], [20, 170, 150, 3.0]] as const) {
      const m = new THREE.Mesh(rainbowGeometry(r, r * 0.12), rainbowMaterial());
      m.position.set(this.centre.x + dx, groundY - 4, this.centre.z + dz);
      m.rotation.y = ry;
      m.frustumCulled = false;
      this.rainbows.push(m);
      this.group.add(m);
    }

    // Glitter and stars across the whole sky, in every colour, twinkling.
    {
      const n = 1600;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      this.glitterBase = new Float32Array(n * 3);
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const u = Math.random() * Math.PI * 2, v = Math.acos(1 - Math.random() * 0.95), r = 260 + Math.random() * 120;
        pos.set([this.centre.x + Math.cos(u) * Math.sin(v) * r, groundY + Math.cos(v) * r, this.centre.z + Math.sin(u) * Math.sin(v) * r], i * 3);
        c.setHSL(Math.random(), 0.85, 0.72);
        this.glitterBase.set([c.r, c.g, c.b], i * 3);
        col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.glitter = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      this.glitter.frustumCulled = false;
      this.group.add(this.glitter);
    }
    // Warm light over the courtyard and cake; coloured washes out in the flowers.
    for (const [dx, dy, dz, col, dist] of [[0, 9, 0, '#ffd9a8', 42], [0, 5, -8, '#ffe8c8', 20], [-22, 4, 10, '#ff9ad0', 26], [22, 4, 10, '#a8c8ff', 26], [0, 4, 30, '#d9b3ff', 26]] as const) {
      const l = new THREE.PointLight(col, 0, dist, 1.6);
      l.position.set(this.centre.x + dx, groundY + dy, this.centre.z + dz);
      this.lights.push(l);
      this.group.add(l);
    }
    // Unicorns wandering the flower meadow.
    for (let i = 0; i < 4; i++) {
      const m = new AnimalModel('unicorn', 1);
      this.unicorns.push({ m, a: i * 1.6, r: 38 + i * 6, s: (i % 2 ? 1 : -1) * (0.05 + i * 0.01) });
      this.group.add(m.root);
    }
    this.group.add(this.dragon.root, this.dragon.breath);
    this.group.visible = false;
  }

  private rand(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  private seed(s: Swarm, radius: number, y0: number, y1: number): void {
    const n = s.phase.length;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
      s.base.set([this.centre.x + Math.cos(a) * r, this.y + this.rand(y0, y1), this.centre.z + Math.sin(a) * r], i * 3);
      s.vel.set([this.rand(-0.3, 0.3), this.rand(-0.3, 0.3), this.rand(-0.3, 0.3)], i * 3);
      s.phase[i] = Math.random() * 10;
    }
  }

  /** Guests from every land arrive (built once, the first time the party begins). */
  showCrowd(): void {
    if (this.crowdOn) return;
    this.crowdOn = true;
    const list = guests();
    list.forEach((p, i) => {
      const s = guestSpot(i, list.length);
      const model = new CharacterModel(OUTFITS[p.outfit], p.skin, p.who === 'girl' ? 0.95 : 1.02);
      model.root.position.set(s.x, this.y, s.z);
      model.root.rotation.y = s.face;
      this.group.add(model.root);
      this.crowd.push({ model, x: s.x, z: s.z, face: s.face, ph: i * 0.7 });
    });
    // More people from every land, dancing in a slow ring round the courtyard.
    const lands = REGIONS.filter((r) => r.id !== 'skyisles');
    for (let i = 0; i < DANCERS; i++) {
      const who = i % 2 ? 'boy' : 'girl';
      const land = lands[(i * 7) % lands.length].id;
      const pool = wardrobeFor(land, who);
      const model = new CharacterModel(pool[(i * 5) % pool.length], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a', '#6b4630'][i % 6], who === 'girl' ? 0.94 : 1.02);
      this.group.add(model.root);
      this.dancers.push({ model, a: (i / DANCERS) * Math.PI * 2, r: CASTLE.venue.r - 7 + (i % 2) * 1.6, ph: i * 0.9 });
    }
  }

  /** Face the crowd towards a point (the couple). */
  cheerAt(p: THREE.Vector3 | null): void {
    for (const c of this.crowd) if (p) c.face = Math.atan2(p.x - c.x, p.z - c.z);
  }

  update(dt: number, t: number, night: number, focus: THREE.Vector3): void {
    this.group.visible = this.level > 0.01;
    if (!this.group.visible) return;
    const L = this.level;
    for (const m of [this.petals, this.flies, this.dust]) m.points.material.opacity = L;
    this.air.level = L;
    // The group sits at the origin; the air is placed at the courtyard in world space.
    this.air.update(dt, t, this.centre, night, typeof innerHeight === 'number' ? innerHeight / 2 : 360);

    // Petals fall, sway and are recycled above.
    {
      const s = this.petals, pos = s.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < s.phase.length; i++) {
        let y = s.base[i * 3 + 1] - dt * (0.9 + (i % 5) * 0.12);
        if (y < this.y) y = this.y + 30;
        s.base[i * 3 + 1] = y;
        pos.setXYZ(i, s.base[i * 3] + Math.sin(t * 0.9 + s.phase[i]) * 1.2, y, s.base[i * 3 + 2] + Math.cos(t * 0.7 + s.phase[i]) * 1.2);
      }
      pos.needsUpdate = true;
    }
    // Fireflies wander and blink.
    {
      const s = this.flies, pos = s.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < s.phase.length; i++) {
        const ph = s.phase[i];
        pos.setXYZ(i, s.base[i * 3] + Math.sin(t * 0.5 + ph) * 2, s.base[i * 3 + 1] + Math.sin(t * 1.3 + ph * 2) * 0.6, s.base[i * 3 + 2] + Math.cos(t * 0.45 + ph) * 2);
      }
      pos.needsUpdate = true;
      s.points.material.size = 0.3 + Math.sin(t * 4) * 0.05;
      s.points.material.opacity = L * (0.55 + night * 0.45);
    }
    // Magic dust spirals slowly round the courtyard.
    {
      const s = this.dust, pos = s.points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < s.phase.length; i++) {
        const bx = s.base[i * 3] - this.centre.x, bz = s.base[i * 3 + 2] - this.centre.z;
        const a = Math.atan2(bz, bx) + t * 0.12 * (1 + (i % 3) * 0.3), r = Math.hypot(bx, bz);
        pos.setXYZ(i, this.centre.x + Math.cos(a) * r, s.base[i * 3 + 1] + Math.sin(t * 0.8 + s.phase[i]) * 0.8, this.centre.z + Math.sin(a) * r);
      }
      pos.needsUpdate = true;
    }
    // Roses tumble down.
    for (let i = 0; i < 90; i++) {
      const st = this.roseState;
      st[i * 4 + 1] -= dt * 1.6;
      if (st[i * 4 + 1] < 0) st[i * 4 + 1] = 28;
      st[i * 4 + 3] += dt * 2;
      this.tmp.makeRotationFromEuler(new THREE.Euler(st[i * 4 + 3], st[i * 4 + 3] * 0.7, 0)).setPosition(this.centre.x + st[i * 4], this.y + st[i * 4 + 1], this.centre.z + st[i * 4 + 2]);
      this.roses.setMatrixAt(i, this.tmp);
    }
    this.roses.instanceMatrix.needsUpdate = true;
    // Sky lanterns rise and drift, then begin again.
    for (let i = 0; i < 60; i++) {
      const st = this.lanternState;
      st[i * 4 + 1] += dt * (0.8 + (i % 4) * 0.15);
      if (st[i * 4 + 1] > 110) st[i * 4 + 1] = 2;
      const y = st[i * 4 + 1];
      this.tmp.makeTranslation(this.centre.x + st[i * 4] + Math.sin(t * 0.2 + i) * y * 0.08, this.y + y, this.centre.z + st[i * 4 + 2] - y * 0.3);
      this.lanterns.setMatrixAt(i, this.tmp);
    }
    this.lanterns.instanceMatrix.needsUpdate = true;
    // Aurora and rainbows (glowing even at night, for tonight).
    for (const a of this.auroras) {
      a.material.uniforms.t.value = t;
      a.material.uniforms.strength.value = L * Math.max(0.35, night);
    }
    for (const r of this.rainbows) r.material.uniforms.strength.value = L * 0.85;
    {
      const col = this.glitter.geometry.attributes.color as THREE.BufferAttribute, b = this.glitterBase;
      for (let i = 0; i < col.count; i++) {
        const tw = 0.45 + 0.55 * Math.max(0, Math.sin(t * (1.5 + (i % 7) * 0.4) + i));
        col.setXYZ(i, b[i * 3] * tw, b[i * 3 + 1] * tw, b[i * 3 + 2] * tw);
      }
      col.needsUpdate = true;
      this.glitter.material.opacity = L * Math.max(0.3, night);
    }
    this.lights.forEach((l, i) => { l.intensity = L * (0.4 + night * 1.6) * (i === 0 ? 60 : 30); });
    // Unicorns stroll in wide circles through the flowers.
    for (const u of this.unicorns) {
      u.a += u.s * dt;
      const x = this.centre.x + Math.cos(u.a) * u.r, z = this.centre.z + Math.sin(u.a) * u.r;
      u.m.root.position.set(x, this.y, z);
      u.m.root.rotation.y = Math.atan2(-Math.sin(u.a) * Math.sign(u.s), Math.cos(u.a) * Math.sign(u.s));
      u.m.update(dt, 1.2, t);
    }
    this.dragon.fly(dt, t, this.centre, 26);
    // Guests cheer: little hops, arms up now and then.
    for (const c of this.crowd) {
      const hop = Math.max(0, Math.sin(t * 5 + c.ph));
      c.model.root.position.y = this.y + hop * 0.18;
      c.model.root.rotation.y += Math.atan2(Math.sin(c.face - c.model.root.rotation.y), Math.cos(c.face - c.model.root.rotation.y)) * Math.min(1, dt * 3);
      c.model.update(dt, { speed: 0, airborne: Math.sin(t * 1.7 + c.ph) > 0.2, riding: false, t: t + c.ph });
    }
    // Dancers turn slowly round the courtyard, swaying, always a step apart from each other.
    for (const d of this.dancers) {
      d.a += dt * 0.12;
      const x = this.centre.x + Math.cos(d.a) * d.r, z = this.centre.z + Math.sin(d.a) * d.r;
      const aisle = Math.abs(x - CASTLE.aisle.x) < 6.8 && z > this.centre.z; // the aisle and the guests lining it
      d.model.root.visible = !aisle;
      d.model.root.position.set(x, this.y + Math.max(0, Math.sin(t * 4 + d.ph)) * 0.12, z);
      d.model.root.rotation.y = -d.a + Math.sin(t * 2 + d.ph) * 0.6;
      d.model.update(dt, { speed: 0.9, airborne: Math.sin(t * 1.3 + d.ph) > 0.6, riding: false, t: t + d.ph });
    }
    void focus;
  }
}
