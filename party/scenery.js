import * as THREE from 'three';
import { createPalace } from '../great-palace/js/world/palace.js';
import { createApproach } from '../great-palace/js/world/approach.js';
import { groundAt as palaceGroundAt, COLLIDERS as PALACE_COLLIDERS, PALACE_TIERS, TERRACES, STAIRS, CAUSEWAY, B20, CASCADE, BRANCHES } from '../great-palace/js/world/layout.js';
import { MOOD } from '../great-palace/js/world/sky.js';
import { surfaceAt } from '../src/world/terrain';
import { AnimalModel } from '../src/animals/AnimalModel';
import { buildCake, CHOCOLATE } from '../src/event/CakeModel';
import { PALACE_TRANSFORM, BRIDGE_START, CAKE_SPOT, PALACE_DESTINATIONS } from '../shared/party-layout.js';

const SCALE = PALACE_TRANSFORM.scale;
const OFFSET = new THREE.Vector3(PALACE_TRANSFORM.offset.x, PALACE_TRANSFORM.offset.y, PALACE_TRANSFORM.offset.z);
const toSource = (x, y, z) => new THREE.Vector3((x - OFFSET.x) / SCALE, (y - OFFSET.y) / SCALE, (z - OFFSET.z) / SCALE);
const toWorld = (p) => new THREE.Vector3(p.x * SCALE + OFFSET.x, p.y * SCALE + OFFSET.y, p.z * SCALE + OFFSET.z);
const point = (p) => new THREE.Vector3(p.x, p.y, p.z);

function makeCake(group, { x, y, z }) {
  const cake = new THREE.Group(); cake.position.set(x, y, z);
  const { cake: tiers, slice } = buildCake(CHOCOLATE);
  tiers.scale.setScalar(12); tiers.position.y = 0.35;
  const gold = new THREE.MeshStandardMaterial({ color: '#f7d77d', emissive: '#9b6a20', emissiveIntensity: 0.25 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.25, 0.3, 48), gold); plate.position.y = 0.15;
  const candles = [], flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffd16b', toneMapped: false });
  cake.add(plate, tiers);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.15, 5), gold);
    candle.position.set(Math.cos(a) * 1.65, 4.64, Math.sin(a) * 1.65);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), flameMaterial);
    flame.position.set(candle.position.x, 5.34, candle.position.z); candles.push(flame); cake.add(candle, flame);
  }
  group.add(cake); return { cake, candles, slice };
}

function makeBanner(group, { x, y, z }) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 8), new THREE.MeshStandardMaterial({ color: '#d9ad5a', metalness: 0.4, roughness: 0.4 }));
  pole.position.y = 4;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true }));
  flag.position.set(4.1, 6.1, 0); g.add(pole, flag); group.add(g);
  const paint = (name = '') => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#8c4c90'); grad.addColorStop(0.5, '#d985a8'); grad.addColorStop(1, '#8c4c90');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(12, 10, 1000, 236, 34); ctx.fill();
    ctx.strokeStyle = '#f9d785'; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = '#fff5df'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 84px Georgia, serif';
    ctx.fillText(name ? `Happy Birthday, ${name}!` : 'Happy Birthday!', 512, 128, 930); texture.needsUpdate = true;
  };
  paint(); return { paint, group: g };
}

function sourceTerrainAllowed(x, z) {
  // Only the palace mass, its stair gardens, causeway and arrival plaza are queried.
  // In particular, don't let the source world's coast/islands affect Golden Thread.
  const palace = Math.abs(x) <= 1375 && z >= -980 && z <= CASCADE.z1 + 25;
  const terraces = z >= TERRACES[0].z0 - 20 && z <= TERRACES[2].z1 + 20 && Math.abs(x) <= TERRACES[2].hw + 24;
  const stairs = STAIRS.some(([za, zb, , , hw, cx = 0]) => z >= za - 5 && z <= zb + 5 && Math.abs(x - cx) <= hw + 8);
  const causeway = Math.abs(x) <= CAUSEWAY.hw + 7 && z >= CAUSEWAY.z0 - 10 && z <= CAUSEWAY.z1 + 10;
  const arrival = Math.hypot(x - B20.x, z - B20.z) <= B20.r + 14;
  return palace || terraces || stairs || causeway || arrival;
}

function makeVenuePlatform(group, center, color, radius = 35) {
  const stone = new THREE.MeshStandardMaterial({ color: '#554c78', roughness: 0.9, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.24, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.82, radius, 11, 12), stone);
  body.position.set(center.x, center.y - 6.5, center.z); body.castShadow = body.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.82, 1.1, 12), rimMat);
  rim.position.set(center.x, center.y - 0.55, center.z); rim.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.45, 16), new THREE.MeshStandardMaterial({ color: '#dfd0db', roughness: 0.7 }));
  floor.position.set(center.x, center.y + 0.2, center.z); floor.receiveShadow = true;
  group.add(body, rim, floor);
}

export class PartyScenery {
  constructor(scene, quality = 'low') {
    this.scene = scene;
    this.sourceCamera = new THREE.Object3D();
    this.group = new THREE.Group(); this.group.position.copy(OFFSET); this.group.scale.setScalar(SCALE);
    this.group.name = 'birthday-great-palace';
    const tier = typeof quality === 'string' ? quality : String(quality?.key ?? quality?.name ?? 'low').toLowerCase();
    const preset = { grass: tier === 'low' ? 2500 : 9000 };
    const colliderStart = PALACE_COLLIDERS.length;
    this.castle = createPalace(this.group, preset);
    // The source approach also draws branches to its own unrelated towns. Keep the
    // grand causeway and terraces, but omit those city branches from this party world.
    const branches = BRANCHES.splice(0, BRANCHES.length);
    try { this.approach = createApproach(this.group, preset); }
    finally { BRANCHES.push(...branches); }
    this.castleColliders = PALACE_COLLIDERS.slice(colliderStart);
    scene.add(this.group);

    this.decor = new THREE.Group(); this.decor.name = 'palace-party-decor'; scene.add(this.decor);
    this.makeConnectedVenues(); this.makeArrivalLift(); this.makeMountains();
    const cake = makeCake(this.decor, CAKE_SPOT); this.cake = cake.cake; this.candles = cake.candles; this.cakeSlice = cake.slice; this.cakeCut = 0;
    this.banner = makeBanner(this.decor, { x: CAKE_SPOT.x - 12, y: CAKE_SPOT.y, z: CAKE_SPOT.z - 14 });
    this.fireworks = this.makeFireworks(); this.fireworkColor = new THREE.Color();
    this.lanterns = []; this.time = 0; this.party = 0;
    this.destinations = PALACE_DESTINATIONS;
  }

  makeArrivalLift() {
    const arrival = PALACE_DESTINATIONS[0];
    const baseY = surfaceAt(arrival.x, arrival.z), height = Math.max(1, arrival.y - baseY);
    this.liftBaseY = baseY;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(11, 16, 5, 12), new THREE.MeshStandardMaterial({ color: '#615776', roughness: 0.9 }));
    foot.position.set(arrival.x, baseY + 2.5, arrival.z); foot.castShadow = foot.receiveShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 4.5, height - 5, 10), new THREE.MeshStandardMaterial({ color: '#a4c9dc', emissive: '#4899be', emissiveIntensity: 0.65, transparent: true, opacity: 0.68 }));
    shaft.position.set(arrival.x, baseY + height / 2, arrival.z);
    const landing = new THREE.Mesh(new THREE.CylinderGeometry(13, 11, 1.2, 16), new THREE.MeshStandardMaterial({ color: '#ead9c7', metalness: 0.2, roughness: 0.55 }));
    landing.position.set(arrival.x, arrival.y - 0.6, arrival.z); landing.receiveShadow = true;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(2.6, 0), new THREE.MeshBasicMaterial({ color: '#ffe18a', toneMapped: false }));
    beacon.position.set(arrival.x, arrival.y + 3.5, arrival.z);
    const light = new THREE.PointLight('#ffd675', 3, 30); light.position.copy(beacon.position);
    this.decor.add(foot, shaft, landing, beacon, light); this.liftBeacon = beacon;
    const meadow = { x: arrival.x, y: baseY, z: arrival.z, name: 'Meadow lift base' };
    const avenue = { ...arrival, name: 'Bridge Pavilions' };
    // E at the foot or the elevated landing rides the beacon lift to its other end.
    this.lifts = [
      { x: arrival.x, y: baseY, z: arrival.z, r: 13, name: 'Meadow lift', to: avenue },
      { x: arrival.x, y: arrival.y, z: arrival.z, r: 13, name: 'Meadow lift', to: meadow },
    ];
    this.makeBridge({ x: 0, y: baseY, z: 65 }, { x: 0, y: baseY, z: arrival.z - 12 }, 9, { groundPath: true });
  }

  makeBridge(a, b, width = 10, { groundPath = false } = {}) {
    const A = point(a), B = point(b), delta = B.clone().sub(A), length = delta.length();
    const mid = A.clone().add(B).multiplyScalar(0.5), yaw = Math.atan2(delta.x, delta.z);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.72, length), new THREE.MeshStandardMaterial({ color: '#e9dedc', roughness: 0.65 }));
    deck.position.copy(mid); deck.position.y -= 0.25; deck.rotation.y = yaw; deck.receiveShadow = true; this.decor.add(deck);
    const railMat = new THREE.MeshStandardMaterial({ color: '#d9b25a', metalness: 0.35, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.25, length), railMat);
      rail.position.copy(mid); rail.position.y += 0.65;
      rail.position.x += Math.cos(yaw) * side * (width * 0.5 - 0.12);
      rail.position.z -= Math.sin(yaw) * side * (width * 0.5 - 0.12);
      rail.rotation.y = yaw; this.decor.add(rail);
      const sideOffset = Math.sign(side) * (width / 2 - 0.12), nx = Math.cos(yaw), nz = -Math.sin(yaw);
      this.extraColliders.push({
        a: { x: a.x + nx * sideOffset, z: a.z + nz * sideOffset },
        b: { x: b.x + nx * sideOffset, z: b.z + nz * sideOffset },
        y0: Math.min(a.y, b.y) - 0.5, y1: Math.max(a.y, b.y) + 1.8, r: 0.22,
      });
    }
    this.bridges.push({ a, b, width, groundPath });
  }

  makeConnectedVenues() {
    this.extraColliders = []; this.bridges = [];
    const court = CAKE_SPOT;
    const venues = [
      { id: 'garden', at: PALACE_DESTINATIONS[5], color: '#d99acd', radius: 36 },
      { id: 'aurora', at: PALACE_DESTINATIONS[6], color: '#88d7eb', radius: 36 },
      { id: 'meadow', at: PALACE_DESTINATIONS[7], color: '#a9d77d', radius: 34 },
      { id: 'star', at: PALACE_DESTINATIONS[8], color: '#aaa1f2', radius: 34 },
    ];
    // Leave the court through its new west/east balustrade doors, then branch
    // beyond the palace's roof gardens. This keeps each bridge clear of towers.
    const eastDoor = { x: court.x + 27.4, y: court.y, z: court.z };
    const westDoor = { x: court.x - 27.4, y: court.y, z: court.z - 6.75 };
    const eastBypass = { x: court.x + 38, y: court.y, z: court.z - 72 };
    const eastHub = { x: court.x + 130, y: court.y, z: court.z - 72 };
    const westHub = { x: court.x - 130, y: court.y, z: court.z - 6.75 };
    // The east connector skirts the roof's central fountain channel before it forks.
    this.makeBridge(eastDoor, eastBypass, 8.5);
    this.makeBridge(eastBypass, eastHub, 8.5);
    this.makeBridge(westDoor, westHub, 8.5);
    for (let i = 0; i < venues.length; i++) {
      const v = venues[i], side = i % 2 === 0 ? 1 : -1;
      const hub = side > 0 ? eastHub : westHub;
      const end = { x: v.at.x - side * v.radius, y: v.at.y, z: v.at.z };
      makeVenuePlatform(this.decor, v.at, v.color, v.radius);
      this.makeBridge(hub, end, 10);
      v.end = end;
    }
    // Garden flowers and crystals use instancing to keep the small side venues light.
    const dummy = new THREE.Object3D(), garden = venues[0].at;
    const blossoms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.72, 6, 5), new THREE.MeshStandardMaterial({ color: '#f59abd', emissive: '#8e345b', emissiveIntensity: 0.12 }), 48);
    for (let i = 0; i < 48; i++) {
      const a = i * 2.399963, r = 5 + Math.sqrt(i / 48) * 25;
      dummy.position.set(garden.x + Math.cos(a) * r, garden.y + 1.1, garden.z + Math.sin(a) * r); dummy.scale.set(1, 0.65, 1); dummy.updateMatrix(); blossoms.setMatrixAt(i, dummy.matrix);
    }
    this.decor.add(blossoms);
    const aurora = venues[1].at, crystalMat = new THREE.MeshStandardMaterial({ color: '#b8b2ff', emissive: '#6157ff', emissiveIntensity: 0.65, roughness: 0.25 });
    const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), crystalMat, 7);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7, r = 9 + (i % 2) * 5;
      dummy.position.set(aurora.x + Math.cos(a) * r, aurora.y + 2 + (i % 3), aurora.z + Math.sin(a) * r);
      dummy.scale.set(0.8, 2 + (i % 3) * 0.5, 0.8); dummy.rotation.set(0.15, a, 0); dummy.updateMatrix(); crystals.setMatrixAt(i, dummy.matrix);
    }
    this.decor.add(crystals);
    const meadow = venues[2].at, unicorn = new AnimalModel('unicorn', 1.05); unicorn.root.position.set(meadow.x, meadow.y + 1, meadow.z); unicorn.root.rotation.y = -0.7;
    this.decor.add(unicorn.root); this.creatures = [{ model: unicorn, x: meadow.x, y: meadow.y + 1, z: meadow.z, phase: 0 }];
    for (let i = 0; i < 2; i++) {
      const bird = new AnimalModel('lightbird', 1.2), x = garden.x + (i ? 1 : -1) * 5, z = garden.z + (i ? 4 : -4), y = garden.y + 5 + i;
      bird.root.position.set(x, y, z); this.decor.add(bird.root); this.creatures.push({ model: bird, x, y, z, phase: i * Math.PI });
    }
  }

  makeMountains() {
    const stone = new THREE.MeshStandardMaterial({ color: '#414668', roughness: 1, flatShading: true });
    const snow = new THREE.MeshStandardMaterial({ color: '#d8d9e6', roughness: 0.92, flatShading: true });
    const ridge = new THREE.Group(); ridge.name = 'distant-palace-mountain-ridge';
    const peaks = [
      [-1450, 195, 270], [-1170, 150, 230], [-900, 245, 330], [-580, 170, 250],
      [-280, 290, 370], [80, 210, 300], [420, 310, 410], [760, 205, 290],
      [1080, 280, 360], [1390, 195, 290], [1660, 130, 220],
    ];
    for (const [x, r, h] of peaks) {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), stone);
      peak.position.set(x, h / 2 - 8, -4050 + (Math.abs(x) % 3) * 45); peak.rotation.y = (x % 9) * 0.03; ridge.add(peak);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.28, 7, 1), snow);
      cap.position.set(peak.position.x, h * 0.79, peak.position.z); cap.rotation.y = peak.rotation.y; ridge.add(cap);
    }
    this.decor.add(ridge);
  }

  makeFireworks() {
    const count = 100, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 1.25, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const points = new THREE.Points(geometry, material); points.frustumCulled = false; this.decor.add(points);
    return { points, positions, colors, clock: 0, burst: 0 };
  }

  ground(x, z, fromY = Infinity) {
    // Side-venue floors and their bridges are the only custom walkable surfaces here.
    const y = fromY === Infinity ? Infinity : fromY;
    for (const d of this.destinations.slice(5)) {
      const radius = d.id === 'meadow' || d.id === 'star' ? 34 : 36;
      if (Math.hypot(x - d.x, z - d.z) <= radius * 0.92 && y >= d.y - 3) return d.y;
    }
    for (const b of this.bridges) {
      if (b.groundPath && (fromY === Infinity || fromY >= 80)) continue;
      const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, len2 = dx * dx + dz * dz;
      const u = len2 ? Math.max(0, Math.min(1, ((x - b.a.x) * dx + (z - b.a.z) * dz) / len2)) : 0;
      const px = b.a.x + u * dx, pz = b.a.z + u * dz;
      if (Math.hypot(x - px, z - pz) <= b.width / 2 && y >= Math.min(b.a.y, b.b.y) - 3) return b.a.y + u * (b.b.y - b.a.y);
    }
    const q = toSource(x, y === Infinity ? 1e6 : y, z);
    const arrival = PALACE_DESTINATIONS[0];
    const atLift = Math.hypot(x - arrival.x, z - arrival.z) < 11;
    if (atLift) {
      // The B20 deck is raised over the meadow. Its centre lift must still have
      // walkable ground below it, while walkers already at deck height use the deck.
      if (fromY !== Infinity && fromY < 80) return this.liftBaseY;
      return arrival.y;
    }
    const underRaisedPlaza = q.z > CAUSEWAY.z1 + 10 && Math.hypot(q.x - B20.x, q.z - B20.z) <= B20.r + 14;
    if (underRaisedPlaza && fromY !== Infinity && fromY < 80) return surfaceAt(x, z, fromY);
    const underRaisedCauseway = Math.abs(q.x) <= CAUSEWAY.hw + 7 && q.z >= CAUSEWAY.z0 - 10 && q.z <= CAUSEWAY.z1 + 10;
    if (underRaisedCauseway && fromY !== Infinity && fromY < 80) return surfaceAt(x, z, fromY);
    if (sourceTerrainAllowed(q.x, q.z)) {
      const h = palaceGroundAt(q.x, q.z, q.y);
      if (h !== null && h !== undefined) return h * SCALE + OFFSET.y;
    }
    return surfaceAt(x, z, fromY);
  }

  resolve(position, radius = 0.5) {
    const q = toSource(position.x, position.y, position.z), p = q.clone();
    for (const c of this.castleColliders) {
      if (c.y0 !== undefined && (p.y < c.y0 - 1 || p.y > c.y1)) continue;
      if (c.r !== undefined) {
        const dx = p.x - c.x, dz = p.z - c.z, min = c.r + radius / SCALE, d = Math.hypot(dx, dz);
        if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
      } else if (p.x > c.minX - radius / SCALE && p.x < c.maxX + radius / SCALE && p.z > c.minZ - radius / SCALE && p.z < c.maxZ + radius / SCALE) {
        const pad = radius / SCALE;
        const choices = [[c.minX - pad - p.x, 0], [c.maxX + pad - p.x, 0], [0, c.minZ - pad - p.z], [0, c.maxZ + pad - p.z]];
        choices.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); p.x += choices[0][0]; p.z += choices[0][1];
      }
    }
    const w = toWorld(p); position.x = w.x; position.z = w.z;
    for (const c of this.extraColliders) {
      if (position.y < c.y0 || position.y > c.y1) continue;
      const dx = c.b.x - c.a.x, dz = c.b.z - c.a.z, len2 = dx * dx + dz * dz;
      const u = len2 ? Math.max(0, Math.min(1, ((position.x - c.a.x) * dx + (position.z - c.a.z) * dz) / len2)) : 0;
      const px = c.a.x + dx * u, pz = c.a.z + dz * u, rx = position.x - px, rz = position.z - pz, d = Math.hypot(rx, rz), min = c.r + radius;
      if (d < min && d > 1e-4) { position.x = px + rx / d * min; position.z = pz + rz / d * min; }
    }
    return position;
  }

  setCelebrationName(name) {
    const next = String(name || '').slice(0, 36);
    if (next === this.bannerName) return;
    this.bannerName = next; this.banner.paint(next);
  }

  updateFestival(festival, dt, t) {
    this.candles.forEach(flame => { flame.visible = !festival?.candlesBlown; });
    this.cakeCut += ((festival?.cakeCut ? 1 : 0) - this.cakeCut) * Math.min(1, dt * 2.2);
    const k = this.cakeCut;
    this.cakeSlice.position.set(Math.sin(Math.PI / 8) * 0.12 * k, 0.085 + Math.sin(k * Math.PI) * 0.075, Math.cos(Math.PI / 8) * 0.12 * k);
    const star = this.cake.getObjectByName('star');
    if (star) { star.rotation.y = t * 0.7; star.position.y = star.userData.y + Math.sin(t * 1.8) * 0.012; }
    this.fireworks.points.visible = Boolean(festival?.fireworksReady);
  }

  releaseLantern(x = CAKE_SPOT.x, z = CAKE_SPOT.z, text = '') {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.34, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false })); shell.position.y = 0.45;
    const light = new THREE.PointLight('#ffbd67', 1.2, 8); light.position.y = 0.5; g.add(shell, light);
    g.position.set(x, this.ground(x, z) + 0.4, z); g.userData.text = String(text).slice(0, 60); this.decor.add(g);
    this.lanterns.push({ group: g, age: 0, startY: g.position.y }); return g;
  }

  update(t, dt, celebrating = false, camera = null, night = 0.65) {
    this.time = t; const target = celebrating ? 1 : 0; this.party += (target - this.party) * Math.min(1, dt * 1.5);
    if (MOOD?.night) MOOD.night.value = Math.max(0, Math.min(1, night));
    let sourceCamera = null;
    if (camera?.position) {
      this.sourceCamera.position.set(
      (camera.position.x - OFFSET.x) / SCALE,
      (camera.position.y - OFFSET.y) / SCALE,
      (camera.position.z - OFFSET.z) / SCALE,
      );
      sourceCamera = this.sourceCamera;
    }
    this.castle.update(t, dt, sourceCamera); this.approach.update(t, dt, sourceCamera);
    this.castle.setGate(this.party > 0.35);
    this.liftBeacon.rotation.y = t * 0.7; this.liftBeacon.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    this.candles.forEach((flame, i) => { flame.visible = true; flame.scale.y = this.party > 0.2 ? 0.85 + Math.sin(t * 8 + i) * 0.15 : 0.01; });
    this.banner.group.visible = true;
    const currentNight = MOOD?.night?.value ?? 0.65;
    this.fireworks.points.material.opacity = this.party * (0.55 + currentNight * 0.35); this.updateFireworks(dt);
    for (const c of this.creatures) { c.model.update(dt, 0, t); c.model.root.position.y = c.y + Math.sin(t * 1.7 + c.phase) * 0.12; }
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i]; l.age += dt; l.group.position.y = l.startY + l.age * 1.7; l.group.position.x += Math.sin(t * 0.7 + i) * dt * 0.16;
      if (l.age > 42) { this.decor.remove(l.group); this.lanterns.splice(i, 1); }
    }
  }

  updateFireworks(dt) {
    const f = this.fireworks; f.clock += dt;
    if (this.party > 0.3 && f.clock > 2.4) { f.clock = 0; f.burst = 1; }
    f.burst = Math.max(0, f.burst - dt * 0.55);
    for (let i = 0; i < f.positions.length / 3; i++) {
      const a = i * 2.399963, radius = (i % 11) * 0.55 + (1 - f.burst) * 14;
      f.positions[i * 3] = CAKE_SPOT.x + Math.cos(a) * radius;
      f.positions[i * 3 + 1] = CAKE_SPOT.y + 55 + Math.sin(a * 2.1) * radius + (1 - f.burst) * 7;
      f.positions[i * 3 + 2] = CAKE_SPOT.z + Math.sin(a) * radius;
      this.fireworkColor.setHSL((i / 100 + this.time * 0.025) % 1, 0.9, 0.68);
      f.colors[i * 3] = this.fireworkColor.r; f.colors[i * 3 + 1] = this.fireworkColor.g; f.colors[i * 3 + 2] = this.fireworkColor.b;
    }
    f.points.geometry.attributes.position.needsUpdate = true; f.points.geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.group, this.decor);
    for (const root of [this.group, this.decor]) root.traverse((o) => {
      o.geometry?.dispose?.();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.()); else o.material?.dispose?.();
    });
  }
}
