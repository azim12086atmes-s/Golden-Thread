import * as THREE from 'three';
import { Rng } from '../core/rng';
import { PLOTS, PLOT_SIZE } from './plots';
import { buildHouse, lampPost, streetProp, type Ctx } from './architecture';
import { GeoBuilder, box, cone, cyl, flowers, rock, sphere, tree } from './kit';
import { CITY_RADIUS, REGION_SIZE, regionCenter, type RegionSpec } from './regions';
import { CASTLE_SITE, WATER_Y, terrainHeight } from './terrain';

export interface Collider { x: number; z: number; r: number; h: number }

export interface ResourceNode {
  id: string;
  item: string;
  x: number;
  y: number;
  z: number;
  mesh: THREE.Object3D;
}

export interface RegionInstance {
  spec: RegionSpec;
  group: THREE.Group;
  colliders: Collider[];
  nodes: ResourceNode[];
  /** Deterministic spots for residents and animals. */
  spots: Array<{ x: number; z: number }>;
  wild: Array<{ x: number; z: number }>;
  dispose(): void;
}

const AVENUE = 9, RING = 140;
const onRoad = (x: number, z: number, pad = 0) =>
  Math.abs(x) < AVENUE + pad || Math.abs(z) < AVENUE + pad || Math.abs(Math.hypot(x, z) - RING) < 6 + pad;

const NODE_STYLE: Record<string, { kind: 'bush' | 'rock' | 'logs' | 'crystal' | 'crate'; color: string }> = {
  wood: { kind: 'logs', color: '#8a5a36' }, cedar: { kind: 'logs', color: '#a0522d' }, birch: { kind: 'logs', color: '#e8e4da' },
  bamboo: { kind: 'bush', color: '#7fb35a' }, rattan: { kind: 'bush', color: '#b89a5a' },
  marble: { kind: 'rock', color: '#f2eee4' }, clay: { kind: 'rock', color: '#b5654a' }, sand: { kind: 'rock', color: '#ecd6a0' },
  ice: { kind: 'crystal', color: '#bfe8ff' }, stardust: { kind: 'crystal', color: '#fff4c0' }, cloud: { kind: 'crystal', color: '#ffffff' },
  gear: { kind: 'crate', color: '#c9a44a' }, scrap: { kind: 'crate', color: '#8a8a94' }, paint: { kind: 'crate', color: '#e8576a' },
  spool: { kind: 'crate', color: '#d9467a' }, milk: { kind: 'crate', color: '#f7f3ea' }, hanji: { kind: 'bush', color: '#c8b88a' },
  papyrus: { kind: 'bush', color: '#8ab55a' }, incense: { kind: 'bush', color: '#c9a86a' }, wool: { kind: 'bush', color: '#f7f3ea' },
  fleece: { kind: 'bush', color: '#f7f3ea' }, camelwool: { kind: 'bush', color: '#d4a86a' },
};

const nodeMats = new Map<string, THREE.Material>();
const nm = (c: string, glow = false) => {
  const k = c + glow;
  if (!nodeMats.has(k)) nodeMats.set(k, glow
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false })
    : new THREE.MeshStandardMaterial({ color: c, flatShading: true }));
  return nodeMats.get(k)!;
};

function nodeMesh(item: string): THREE.Object3D {
  const st = NODE_STYLE[item] ?? { kind: 'bush', color: '#5aa04a' };
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, c: string, x = 0, y = 0, z = 0, glow = false) => {
    const m = new THREE.Mesh(geo, nm(c, glow));
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  switch (st.kind) {
    case 'logs':
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 7), st.color, (i - 1) * 0.42, 0.22 + (i === 1 ? 0.36 : 0), 0).rotation.x = Math.PI / 2;
      break;
    case 'rock':
      add(new THREE.DodecahedronGeometry(0.7, 0), st.color, 0, 0.45, 0);
      add(new THREE.DodecahedronGeometry(0.4, 0), st.color, 0.6, 0.25, 0.3);
      break;
    case 'crystal':
      for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(0.22, 1 + i * 0.3, 5), st.color, (i - 1) * 0.3, 0.5 + i * 0.15, (i % 2) * 0.2, true);
      break;
    case 'crate':
      add(new THREE.BoxGeometry(0.9, 0.7, 0.9), '#a8703f', 0, 0.35, 0);
      add(new THREE.BoxGeometry(0.5, 0.35, 0.5), st.color, 0, 0.88, 0);
      break;
    default:
      add(new THREE.SphereGeometry(0.75, 8, 6), '#4f9a44', 0, 0.55, 0).scale.set(1, 0.75, 1);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        add(new THREE.SphereGeometry(0.13, 5, 4), st.color === '#4f9a44' ? '#ffd86b' : st.color, Math.cos(a) * 0.55, 0.6 + (i % 3) * 0.15, Math.sin(a) * 0.55);
      }
  }
  // A soft floating mote marks everything that can be gathered.
  const mote = add(new THREE.OctahedronGeometry(0.16), '#fff3b0', 0, 1.9, 0, true);
  mote.userData.mote = true;
  g.userData.item = item;
  return g;
}

export function buildRegion(spec: RegionSpec, solid: THREE.Material, glowMat: THREE.Material): RegionInstance {
  const c = regionCenter(spec);
  const rng = new Rng(`region:${spec.id}`);
  const g = new GeoBuilder(), glow = new GeoBuilder();
  const ctx: Ctx = { g, glow, rng, s: spec };
  const colliders: Collider[] = [];
  const spots: Array<{ x: number; z: number }> = [];
  const wild: Array<{ x: number; z: number }> = [];
  const H = (lx: number, lz: number) => terrainHeight(c.x + lx, c.z + lz);
  const plotsHere = PLOTS.filter((p) => p.region === spec.id).map((p) => ({ x: p.x - c.x, z: p.z - c.z }));
  const inCastle = (x: number, z: number, pad: number) =>
    spec.id === 'meadow' && Math.hypot(c.x + x - CASTLE_SITE.x, c.z + z - CASTLE_SITE.z) < CASTLE_SITE.r + 8 + pad;
  const nearPlot = (x: number, z: number, pad: number) => inCastle(x, z, pad) ||
    plotsHere.some((p) => Math.abs(x - p.x) < PLOT_SIZE / 2 + pad && Math.abs(z - p.z) < PLOT_SIZE / 2 + pad);
  const isSky = spec.id === 'skyisles';

  // Roads: two avenues and a ring, laid in short segments that follow the ground.
  if (!isSky) {
    for (let d = 56; d < CITY_RADIUS + 40; d += 12) {
      for (const [x, z, ry] of [[0, d, 0], [0, -d, 0], [d, 0, Math.PI / 2], [-d, 0, Math.PI / 2]] as const) {
        box(g, AVENUE * 1.6, 0.12, 12.4, spec.road, x, H(x, z) - 0.05, z, ry);
      }
    }
    for (let a = 0; a < Math.PI * 2; a += 0.09) {
      const x = Math.cos(a) * RING, z = Math.sin(a) * RING;
      box(g, 9, 0.12, 13, spec.road, x, H(x, z) - 0.04, z, -a);
    }
    cyl(g, 50, 50, 0.14, spec.road, 0, H(0, 0) - 0.06, 0, 36);
  }

  // Houses on a jittered grid inside the city.
  let placed = 0;
  const cells: Array<[number, number]> = [];
  const step = spec.id === 'newyork' ? 34 : spec.id === 'london' ? 26 : 21;
  for (let x = -CITY_RADIUS; x <= CITY_RADIUS; x += step) for (let z = -CITY_RADIUS; z <= CITY_RADIUS; z += step) cells.push([x, z]);
  cells.sort(() => rng.next() - 0.5);
  for (const [cx, cz] of cells) {
    if (placed >= spec.houses) break;
    const x = cx + rng.range(-3, 3), z = cz + rng.range(-3, 3);
    const d = Math.hypot(x, z);
    if (d < 62 || d > CITY_RADIUS - 6) continue;
    if (onRoad(x, z, spec.id === 'newyork' ? 14 : 8) || nearPlot(x, z, 8)) continue;
    const y = H(x, z);
    if (y < WATER_Y + 0.4) continue;
    // Face the nearest avenue.
    const ry = Math.abs(x) < Math.abs(z) ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : z > 0 ? Math.PI : 0;
    let fp = { r: 4, h: 6 };
    g.frame(x, y, z, ry, 1, () => glow.frame(x, y, z, ry, 1, () => { fp = buildHouse(ctx); }));
    colliders.push({ x: c.x + x, z: c.z + z, r: fp.r * 0.85, h: y + fp.h });
    placed++;
    if (rng.chance(0.25)) spots.push({ x: x + Math.sin(ry) * (fp.r + 3), z: z + Math.cos(ry) * (fp.r + 3) });
  }

  // Lamps and street props along the avenues.
  if (!isSky) {
    for (let d = 60; d < CITY_RADIUS; d += 22) {
      for (const [x, z] of [[AVENUE + 2, d], [-AVENUE - 2, -d], [d, AVENUE + 2], [-d, -AVENUE - 2]] as const) {
        lampPost(ctx, x, H(x, z), z);
        colliders.push({ x: c.x + x, z: c.z + z, r: 0.4, h: H(x, z) + 4 });
      }
      for (const [x, z] of [[-AVENUE - 3, d + 8], [AVENUE + 3, -d - 8], [d + 8, -AVENUE - 3], [-d - 8, AVENUE + 3]] as const) {
        if (rng.chance(0.55)) {
          const ry = Math.abs(x) < Math.abs(z) ? 0 : Math.PI / 2;
          streetProp(ctx, x + (Math.abs(x) < Math.abs(z) ? Math.sign(x) * 3 : 0), H(x, z), z + (Math.abs(x) < Math.abs(z) ? 0 : Math.sign(z) * 3), ry);
          colliders.push({ x: c.x + x, z: c.z + z, r: 1.2, h: H(x, z) + 3 });
        } else if (rng.chance(0.6)) {
          tree(g, rng.pick(spec.flora), x, H(x, z), z, rng.range(0.8, 1.2), () => rng.next());
        }
        spots.push({ x: x * 0.95, z: z * 0.95 });
      }
    }
  }

  // Nature beyond the city.
  const half = REGION_SIZE / 2;
  const treeCount = isSky ? 60 : spec.id === 'desert' ? 90 : 340;
  for (let i = 0; i < treeCount; i++) {
    const x = rng.range(-half, half), z = rng.range(-half, half);
    const d = Math.hypot(x, z);
    if (d < CITY_RADIUS + 10 && !isSky) {
      // Parks: a few trees inside the city between houses.
      if (rng.chance(0.85) || onRoad(x, z, 4) || d < 60) continue;
    }
    if (nearPlot(x, z, 2)) continue;
    const y = H(x, z);
    if (y < WATER_Y + 0.3) continue;
    const kind = rng.pick(spec.flora);
    const s = rng.range(0.8, 1.6);
    tree(g, kind, x, y, z, s, () => rng.next());
    if (kind !== 'bamboo' && kind !== 'crystal') colliders.push({ x: c.x + x, z: c.z + z, r: 0.5 * s, h: y + 4 * s });
  }
  for (let i = 0; i < 120; i++) {
    const x = rng.range(-half, half), z = rng.range(-half, half);
    if (Math.hypot(x, z) < 62 || onRoad(x, z, 2) || nearPlot(x, z, 1)) continue;
    const y = H(x, z);
    if (y < WATER_Y + 0.2) continue;
    if (rng.chance(0.3)) rock(g, x, y, z, rng.range(0.5, 1.6), spec.snowline < 50 ? '#9a9aa4' : '#a8a090');
    else flowers(g, x, y, z, spec.flowers, () => rng.next(), spec.id === 'meadow' ? 12 : 6);
    if (i % 3 === 0) wild.push({ x, z });
  }
  // Meadow: whole fields of flowers.
  if (spec.id === 'meadow') {
    for (let i = 0; i < 160; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(CITY_RADIUS + 20, half - 20);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      flowers(g, x, H(x, z), z, spec.flowers, () => rng.next(), 16);
    }
  }
  // Egypt: a reed bank along the river channel.
  if (spec.id === 'egypt') for (let i = 0; i < 60; i++) {
    const z = rng.range(-half, half);
    cone(g, 0.4, 2, '#6a9a4a', -140 + rng.pick([-13, 13]), H(-140, z), z, 4);
  }
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(CITY_RADIUS + 20, half - 30);
    wild.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }

  // Plot markers: a signpost at each plot's front.
  for (const p of plotsHere) {
    const y = H(p.x, p.z - PLOT_SIZE / 2 - 1);
    cyl(g, 0.1, 0.1, 2, '#6b4a2a', p.x, y, p.z - PLOT_SIZE / 2 - 1, 5);
    box(g, 1.6, 0.9, 0.12, '#d9b27a', p.x, y + 1.3, p.z - PLOT_SIZE / 2 - 1);
    sphere(glow, 0.14, '#ffe98a', p.x, y + 2.2, p.z - PLOT_SIZE / 2 - 1, 5);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = p.x + (sx * PLOT_SIZE) / 2, z = p.z + (sz * PLOT_SIZE) / 2;
      cyl(g, 0.12, 0.12, 1, '#e8dcc2', x, H(x, z), z, 5);
    }
  }

  const group = new THREE.Group();
  group.position.set(c.x, 0, c.z);
  const solidMesh = g.build(solid);
  const glowMesh = glow.build(glowMat);
  if (solidMesh) {
    solidMesh.castShadow = true;
    solidMesh.receiveShadow = true;
    group.add(solidMesh);
  }
  if (glowMesh) group.add(glowMesh);

  // Resource nodes: individual objects so they can be gathered and regrow.
  const nodes: ResourceNode[] = [];
  const mats = spec.materials;
  for (let i = 0; i < 24; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = i < 6 && !isSky ? rng.range(70, CITY_RADIUS - 30) : rng.range(CITY_RADIUS - 20, half - 40);
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (onRoad(x, z, 3)) x += 12;
    if (nearPlot(x, z, 2)) continue;
    let y = H(x, z);
    if (isSky) {
      // In the Sky Isles, resources sit on the spiral islands.
      const k = i % 15, ia = k * 0.9, ir = 70 - k * 3.2;
      x = Math.cos(ia) * ir + rng.range(-4, 4);
      z = Math.sin(ia) * ir + rng.range(-4, 4);
      y = 18 + k * 9 + 0.6;
    }
    if (y < WATER_Y + 0.3) continue;
    const item = mats[i % mats.length];
    const mesh = nodeMesh(item);
    mesh.position.set(x, y, z);
    group.add(mesh);
    nodes.push({ id: `${spec.id}:${i}`, item, x: c.x + x, y, z: c.z + z, mesh });
  }

  return {
    spec,
    group,
    colliders,
    nodes,
    spots,
    wild,
    dispose() {
      solidMesh?.geometry.dispose();
      glowMesh?.geometry.dispose();
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o !== solidMesh && o !== glowMesh) (o as THREE.Mesh).geometry.dispose();
      });
    },
  };
}
