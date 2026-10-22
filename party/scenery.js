import * as THREE from 'three';
import { createCastle } from '../castle/castle.js';
import { createApproach } from '../castle/approach.js';
import { createHorizon } from '../castle/horizon.js';
import { groundAt as castleGroundAt, COLLIDERS as CASTLE_COLLIDERS } from '../castle/layout.js';
import { MOOD } from '../castle/sky.js';
import { surfaceAt } from '../src/world/terrain';
import { AnimalModel } from '../src/animals/AnimalModel';

// The source castle is authored in a large, separate coordinate system. Keeping
// it in one transformed parent lets its static meshes stay merged and cheap.
const SCALE = 0.32;
const OFFSET = new THREE.Vector3(0, -10.88, -480);
const inSourceBounds = (x, z) => Math.abs(x) <= 260 && z >= -120 && z <= 950;
const toSource = (x, y, z) => new THREE.Vector3((x - OFFSET.x) / SCALE, (y - OFFSET.y) / SCALE, (z - OFFSET.z) / SCALE);
const toWorld = (p) => new THREE.Vector3(p.x * SCALE + OFFSET.x, p.y * SCALE + OFFSET.y, p.z * SCALE + OFFSET.z);

function makeCake(group, x, y, z) {
  const cake = new THREE.Group();
  cake.position.set(x, y, z);
  const icing = new THREE.MeshStandardMaterial({ color: '#fff1e8', roughness: 0.72 });
  const pink = new THREE.MeshStandardMaterial({ color: '#eaa0bd', roughness: 0.58 });
  const gold = new THREE.MeshStandardMaterial({ color: '#f7d77d', emissive: '#9b6a20', emissiveIntensity: 0.25 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5, 1.3, 32), pink);
  base.position.y = 0.7;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.7, 1.05, 32), icing);
  top.position.y = 1.8;
  const icingBand = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.22, 6, 32), icing);
  icingBand.rotation.x = Math.PI / 2;
  icingBand.position.y = 1.22;
  cake.add(base, top, icingBand);
  const candles = [];
  const flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffd16b', toneMapped: false });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.15, 6), gold);
    candle.position.set(Math.cos(a) * 1.95, 2.85, Math.sin(a) * 1.95);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), flameMaterial);
    flame.position.set(candle.position.x, 3.55, candle.position.z);
    candles.push(flame);
    cake.add(candle, flame);
  }
  group.add(cake);
  return { cake, candles };
}

function makeBanner(group, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#d9ad5a', metalness: 0.4, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 8), poleMat);
  pole.position.y = 4;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true }));
  flag.position.set(4.1, 6.1, 0);
  g.add(pole, flag);
  group.add(g);
  const paint = (name = '') => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#8c4c90'); grad.addColorStop(0.5, '#d985a8'); grad.addColorStop(1, '#8c4c90');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(12, 10, 1000, 236, 34); ctx.fill();
    ctx.strokeStyle = '#f9d785'; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = '#fff5df'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText(name ? `Happy Birthday, ${name}!` : 'Happy Birthday!', 512, 128, 930);
    texture.needsUpdate = true;
  };
  paint();
  return { paint, group: g };
}

/** Birthday venue scenery in Golden Thread's world. `ground` and `resolve` are
 * intended to be called by the party entry point alongside its normal terrain. */
export class PartyScenery {
  constructor(scene, quality = 'low') {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(OFFSET);
    this.group.scale.setScalar(SCALE);
    this.group.name = 'birthday-castle-world';
    const tier = typeof quality === 'string' ? quality : String(quality?.key ?? quality?.name ?? 'low').toLowerCase();
    const preset = { grass: tier === 'low' ? 2500 : 9000 };
    const colliderStart = CASTLE_COLLIDERS.length;
    this.castle = createCastle(this.group, preset);
    this.approach = createApproach(this.group, preset);
    // A distant painted mountain ring gives the arrival a clear visual horizon.
    this.horizon = createHorizon(this.group);
    this.castleColliders = CASTLE_COLLIDERS.slice(colliderStart);
    this.scene.add(this.group);

    this.decor = new THREE.Group();
    this.scene.add(this.decor);
    this.makePedestal();
    this.makeVenues();
    const cake = makeCake(this.decor, 0, 46.72, -448);
    this.cake = cake.cake;
    this.candles = cake.candles;
    this.banner = makeBanner(this.decor, -12, 46.72, -438);
    this.fireworks = this.makeFireworks();
    this.fireworkColor = new THREE.Color();
    this.lanterns = [];
    this.time = 0;
    this.party = 0;
    this.destinations = [
      { id: 'arrival', name: 'Arrival Garden', x: 0, y: 0, z: -178.56 },
      { id: 'palace', name: 'Birthday Palace', x: 0, y: 46.72, z: -448 },
      { id: 'garden', name: 'Floating Garden', x: 150, y: 48, z: -448 },
      { id: 'aurora', name: 'Aurora Lookout', x: -150, y: 48, z: -448 },
      { id: 'meadow', name: 'Wanderers’ Meadow', x: 110, y: 20, z: -300 },
      { id: 'star', name: 'Starlight Lookout', x: 0, y: 64, z: -560 },
    ];
  }

  makePedestal() {
    const rock = new THREE.MeshStandardMaterial({ color: '#625b78', roughness: 0.95, flatShading: true });
    const rim = new THREE.MeshStandardMaterial({ color: '#c8a8cb', roughness: 0.7 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(30, 42, 14, 12, 1), rock);
    base.position.set(0, 10.9, -480);
    base.rotation.y = Math.PI / 12;
    base.castShadow = base.receiveShadow = true;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(42, 52, 4, 16), rim);
    crown.position.set(0, 18, -480);
    this.decor.add(base, crown);
    // Four small venue platforms are waypoints for the portal/boat system.
    for (const [x, y, z, r] of [[150, 48, -448, 18], [-150, 48, -448, 18], [110, 20, -300, 24], [0, 64, -560, 18]]) {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r, 3, 12), rock);
      island.position.set(x, y - 2, z);
      island.castShadow = island.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.78, 0.65, 12), rim);
      cap.position.set(x, y - 0.15, z);
      this.decor.add(island, cap);
    }
    const deckMat = new THREE.MeshStandardMaterial({ color: '#d8c2cd', roughness: 0.72 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#e8c678', metalness: 0.35, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(150, 0.65, 4), deckMat);
      deck.position.set(side * 75, 48.05, -448);
      deck.receiveShadow = true;
      const railA = new THREE.Mesh(new THREE.BoxGeometry(150, 0.8, 0.18), railMat);
      const railB = railA.clone();
      railA.position.set(side * 75, 48.75, -450.05);
      railB.position.set(side * 75, 48.75, -445.95);
      this.decor.add(deck, railA, railB);
    }
  }

  makeVenues() {
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#f59abd', emissive: '#8e345b', emissiveIntensity: 0.12, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#6aaf83', roughness: 0.9 });
    const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.38, 6, 5), flowerMat, 96);
    const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(0.23, 1.4, 5), leafMat, 96);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 96; i++) {
      const a = i * 2.399963, r = 2 + Math.sqrt(i / 96) * 13;
      const x = 150 + Math.cos(a) * r, z = -448 + Math.sin(a) * r;
      dummy.position.set(x, 48.6, z); dummy.scale.set(1, 0.72, 1); dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 47.7, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    }
    const crystalMat = new THREE.MeshStandardMaterial({ color: '#b8b2ff', emissive: '#6157ff', emissiveIntensity: 0.65, roughness: 0.25, metalness: 0.25 });
    const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), crystalMat, 7);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7, r = 9 + (i % 2) * 4;
      dummy.position.set(Math.cos(a) * r, 64 + 1.3 + (i % 3) * 0.7, -560 + Math.sin(a) * r);
      dummy.scale.set(0.6, 1.6 + (i % 3) * 0.45, 0.6); dummy.rotation.set(0.15, a, 0); dummy.updateMatrix(); crystals.setMatrixAt(i, dummy.matrix);
    }
    this.decor.add(flowers, leaves, crystals);
    this.flowerBeds = [flowers, leaves];
    this.creatures = [];
    const unicorn = new AnimalModel('unicorn', 1.05);
    unicorn.root.position.set(110, 20, -300);
    unicorn.root.rotation.y = -0.7;
    this.decor.add(unicorn.root);
    this.creatures.push({ model: unicorn, x: 110, y: 20, z: -300, phase: 0 });
    for (let i = 0; i < 2; i++) {
      const bird = new AnimalModel('lightbird', 1.2);
      bird.root.position.set(150 + (i ? 1 : -1) * 5, 51 + i, -448 + (i ? 4 : -4));
      this.decor.add(bird.root);
      this.creatures.push({ model: bird, x: 150 + (i ? 1 : -1) * 5, y: 51 + i, z: -448 + (i ? 4 : -4), phase: i * Math.PI });
    }
  }

  makeFireworks() {
    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 1.25, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.decor.add(points);
    return { points, positions, colors, clock: 0, burst: 0 };
  }

  ground(x, z, fromY = Infinity) {
    if (fromY + 1.2 >= 48 && ((x > 127 && x < 173) || (x > -173 && x < -127)) && z > -471 && z < -425) return 48;
    if (fromY + 1.2 >= 20 && Math.hypot(x - 110, z + 300) < 23) return 20;
    if (fromY + 1.2 >= 64 && Math.abs(x) < 20 && z > -582 && z < -538) return 64;
    if (fromY + 1.2 >= 48 && Math.abs(z + 448) < 3.2 && Math.abs(x) < 151) return 48;
    const q = toSource(x, fromY === Infinity ? 1e6 : fromY, z);
    if (inSourceBounds(q.x, q.z)) {
      const h = castleGroundAt(q.x, q.z, q.y);
      if (h !== null && h !== undefined) return h * SCALE + OFFSET.y;
    }
    return surfaceAt(x, z, fromY);
  }

  resolve(position, radius = 0.5) {
    const q = toSource(position.x, position.y, position.z);
    const p = q.clone();
    for (const c of this.castleColliders) {
      if (c.y0 !== undefined && (p.y < c.y0 - 1 || p.y > c.y1)) continue;
      if (c.r !== undefined) {
        const dx = p.x - c.x, dz = p.z - c.z;
        const min = c.r + radius / SCALE, d = Math.hypot(dx, dz);
        if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
      } else if (p.x > c.minX - radius / SCALE && p.x < c.maxX + radius / SCALE && p.z > c.minZ - radius / SCALE && p.z < c.maxZ + radius / SCALE) {
        const pad = radius / SCALE;
        const choices = [[c.minX - pad - p.x, 0], [c.maxX + pad - p.x, 0], [0, c.minZ - pad - p.z], [0, c.maxZ + pad - p.z]];
        choices.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        p.x += choices[0][0]; p.z += choices[0][1];
      }
    }
    const w = toWorld(p);
    position.x = w.x; position.z = w.z;
    return position;
  }

  setCelebrationName(name) {
    const next = String(name || '').slice(0, 36);
    if (next === this.bannerName) return;
    this.bannerName = next;
    this.banner.paint(next);
  }

  releaseLantern(x = 0, z = -448, text = '') {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.34, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false }));
    shell.position.y = 0.45;
    const light = new THREE.PointLight('#ffbd67', 1.2, 8);
    light.position.y = 0.5;
    g.add(shell, light);
    g.position.set(x, this.ground(x, z) + 0.4, z);
    g.userData.text = String(text).slice(0, 60);
    this.decor.add(g);
    this.lanterns.push({ group: g, age: 0, startY: g.position.y });
    return g;
  }

  update(t, dt, celebrating = false) {
    this.time = t;
    this.party += ((celebrating ? 1 : 0) - this.party) * Math.min(1, dt * 0.8);
    this.castle.update(t, dt);
    this.approach.update(t);
    const night = MOOD?.night?.value ?? 0.65;
    this.castle.setGate(this.party > 0.35);
    this.candles.forEach((flame, i) => { flame.visible = this.party > 0.2; flame.scale.y = 0.85 + Math.sin(t * 8 + i) * 0.15; });
    this.banner.group.visible = this.party > 0.02;
    this.fireworks.points.material.opacity = this.party * (0.55 + night * 0.35);
    this.updateFireworks(dt);
    for (const c of this.creatures) {
      c.model.update(dt, 0, t);
      c.model.root.position.y = c.y + Math.sin(t * 1.7 + c.phase) * 0.12;
    }
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      l.age += dt;
      l.group.position.y = l.startY + l.age * 1.7;
      l.group.position.x += Math.sin(t * 0.7 + i) * dt * 0.16;
      if (l.age > 42) { this.decor.remove(l.group); this.lanterns.splice(i, 1); }
    }
  }

  updateFireworks(dt) {
    const f = this.fireworks;
    f.clock += dt;
    if (this.party > 0.3 && f.clock > 2.4) { f.clock = 0; f.burst = 1; }
    f.burst = Math.max(0, f.burst - dt * 0.55);
    for (let i = 0; i < f.positions.length / 3; i++) {
      const a = i * 2.399963, radius = (i % 11) * 0.55 + (1 - f.burst) * 14;
      f.positions[i * 3] = Math.cos(a) * radius;
      f.positions[i * 3 + 1] = 55 + Math.sin(a * 2.1) * radius + (1 - f.burst) * 7;
      f.positions[i * 3 + 2] = -450 + Math.sin(a) * radius;
      this.fireworkColor.setHSL((i / 100 + this.time * 0.025) % 1, 0.9, 0.68);
      f.colors[i * 3] = this.fireworkColor.r; f.colors[i * 3 + 1] = this.fireworkColor.g; f.colors[i * 3 + 2] = this.fireworkColor.b;
    }
    f.points.geometry.attributes.position.needsUpdate = true;
    f.points.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.group, this.decor);
    this.group.traverse((o) => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.()); else o.material?.dispose?.(); });
    this.decor.traverse((o) => { o.geometry?.dispose?.(); if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.()); else o.material?.dispose?.(); });
  }
}
