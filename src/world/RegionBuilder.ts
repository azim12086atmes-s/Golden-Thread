import * as THREE from 'three';
import { Rng } from '../core/rng';
import { FIELD_SITES, FIELD_SIZE, PLOTS, PLOT_SIZE } from './plots';
import { LAND_STYLE, VARIANT_SHARE, buildVariant } from './buildings';
import { houseDecor } from './houseDecor';
import { lotusSpots } from './Water';
import { TRADITIONS } from './traditions';
import { NATURE, pickTree, zoneAt } from './nature';
import { UNDERSTORY, plant, understoryFor } from './understory';
import { CAVES, type Cave } from './caves';
import { buildCave } from './models/caves';
import { buildBanks } from './banks';
import { neighbours } from '../traffic/schedule';
import { bridgesOf } from './bridges';
import { OUTCROPS, outcrop } from './outcrops';
import { LANDFORMS } from './landforms';
import { drapeDisc, drapeStrip } from './roads';
import { GARLANDS, garland } from './streetGarlands';
import { recordDecor, resetDecor } from './decorLedger';
import { crystalCluster } from './islands';
import { dressGulabi, gateTowers } from './gulabi';
import { harbours } from './harbours';
import { clearPaved, setPaved, type Paved } from './paved';
import { LANDMARK_GROUNDS, NILE_W, RESERVED, nileX, reservedAt } from './reserved';
import { waterEdge } from './waters';
import { INSTITUTE_SITES, SITE_SIZE } from '../institutions/sites';
import { buildHouse, lampPost, streetProp, type Ctx } from './architecture';
import { houseLights, streetLight } from './models/lights';
import { CIVIC_R, buildMarket, buildWorship, civicColliders, civicOf } from './neighbourhood';
import { SQUARE_R, buildSebil, buildSquare, sebilsOf, squaresOf, type Collide } from './landWaters';
import { GeoBuilder, box, cone, cyl, flowers, rock, sphere, tree } from './kit';
import { CITY_RADIUS, REGION_SIZE, regionCenter, type RegionSpec } from './regions';
import { CASTLE_SITE, DUNES, WATER_Y, duneShape, terrainHeight } from './terrain';
import { HABITS, speciesHeight } from './trees';
import { blobMaterial, leafCardMesh } from './foliage';
import { surfacesByColour } from './surfaces';

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
  /** Front doors of the town's buildings (world coordinates): step inside with E. */
  doors: Door[];
  /** Caves of this land (world coordinates): explore them with E. */
  caves: Cave[];
  wild: Array<{ x: number; z: number }>;
  dispose(): void;
}

/** A building's front door. `kind` is the building type ('house' for the land's own homes). */
export interface Door { id: string; land: string; x: number; z: number; y: number; facing: number; kind: string; r: number; /** For doors made on the spot (institutes, caverns): what is inside, for the title. */ name?: string }

const AVENUE = 9, RING = 140;
/** People are ~1.8 m tall: trees reach 8–16 m and houses stand a little larger than they were drawn. */
export const TREE_SCALE = 1.9;
export const HOUSE_SCALE: Partial<Record<string, number>> = { newyork: 1, london: 1.05 };
const houseScale = (id: string) => HOUSE_SCALE[id] ?? 1.15;
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

/** The trees planted so far, in a coarse grid, so crowns can be kept from crowding each other. */
class Grove {
  private cells = new Map<string, Array<[number, number, number]>>();
  private key = (x: number, z: number) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
  /** Would a crown of radius `r` at (x, z) overlap one already planted by more than a little? */
  near(x: number, z: number, r: number): boolean {
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      for (const [tx, tz, tr] of this.cells.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(x - tx, z - tz) < (r + tr) * 0.75) return true;
    }
    return false;
  }
  add(x: number, z: number, r: number): void {
    const k = this.key(x, z);
    (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push([x, z, r]);
  }
}

export function buildRegion(spec: RegionSpec, solid: THREE.Material, glowMat: THREE.Material, waterMat?: THREE.Material): RegionInstance {
  const c = regionCenter(spec);
  resetDecor(spec.id);
  const rng = new Rng(`region:${spec.id}`);
  const g = new GeoBuilder(), glow = new GeoBuilder(), water = waterMat ? new GeoBuilder() : undefined;
  // Collect leaf cards for the tree crowns (one instanced draw for the land).
  g.cards = [];
  // What this land's walls, roofs and roads are made of (drawn by the shader).
  g.surfaces = surfacesByColour(spec);
  const ctx: Ctx = { g, glow, rng, s: spec, water };
  const colliders: Collider[] = [];
  const spots: Array<{ x: number; z: number }> = [];
  const doors: Door[] = [];
  /** Buildings' full footprints (local), so nothing gatherable ends up inside a wall. */
  const buildings: Array<{ x: number; z: number; r: number }> = [];
  const wild: Array<{ x: number; z: number }> = [];
  const H = (lx: number, lz: number) => terrainHeight(c.x + lx, c.z + lz);
  const plotsHere = PLOTS.filter((p) => p.region === spec.id).map((p) => ({ x: p.x - c.x, z: p.z - c.z }));
  const inCastle = (x: number, z: number, pad: number) =>
    spec.id === 'meadow' && Math.hypot(c.x + x - CASTLE_SITE.x, c.z + z - CASTLE_SITE.z) < CASTLE_SITE.r + 8 + pad;
  // Institute sites (institutions/sites.ts) are kept clear like plots.
  const sitesHere = INSTITUTE_SITES.filter((s) => s.land === spec.id).map((s) => ({ x: s.x - c.x, z: s.z - c.z }));
  // Farmland (world/plots.ts FIELD_SITES) too.
  const fieldsHere = FIELD_SITES.filter((f) => f.land === spec.id).map((f) => ({ x: f.x - c.x, z: f.z - c.z }));
  // Each town's four water squares and, in the Islamic lands, the sebils along its streets (landWaters.ts).
  const squaresHere = squaresOf(spec.id), sebilsHere = sebilsOf(spec.id);
  // Gulabi Nagar's city gates stand astride its avenues (gulabi.ts).
  const gatesHere = spec.id === 'indianorth' ? gateTowers() : [];
  // The neighbourhood's place of worship and its market (neighbourhood.ts).
  const civicHere = civicOf(spec.id);
  const nearPlot = (x: number, z: number, pad: number) => inCastle(x, z, pad) || reservedAt(spec.id, x, z, pad) ||
    gatesHere.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + pad) ||
    civicHere.some((q) => Math.hypot(x - q.x, z - q.z) < CIVIC_R + pad) ||
    squaresHere.some((q) => Math.hypot(x - q.x, z - q.z) < SQUARE_R + pad) ||
    sebilsHere.some((q) => Math.hypot(x - q.x, z - q.z) < 2 + pad) ||
    fieldsHere.some((p) => Math.abs(x - p.x) < FIELD_SIZE / 2 + pad && Math.abs(z - p.z) < FIELD_SIZE / 2 + pad) ||
    plotsHere.some((p) => Math.abs(x - p.x) < PLOT_SIZE / 2 + pad && Math.abs(z - p.z) < PLOT_SIZE / 2 + pad) ||
    sitesHere.some((p) => Math.abs(x - p.x) < SITE_SIZE / 2 + pad && Math.abs(z - p.z) < SITE_SIZE / 2 + pad);
  const isSky = spec.id === 'skyisles';

  // Roads: two avenues and a ring, laid in short segments that follow the ground.
  if (!isSky) {
    // Draped over the ground (roads.ts), so they follow every rise and dip without steps.
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const pts: Array<[number, number]> = [];
      for (let d = 48; d <= CITY_RADIUS + 40; d += 2) pts.push([ax * d, az * d]);
      drapeStrip(g, pts, AVENUE * 1.6, spec.road, H);
    }
    // Highways: where a neighbouring land lies, the avenue runs on to the border to meet its road
    // (traffic/schedule.ts), laid in short lengths that follow the ground, with a dashed centre line.
    for (const n of neighbours(spec.id)) {
      const [ax, az] = n.dir, ry = az !== 0 ? 0 : Math.PI / 2;
      let run: Array<[number, number]> = [];
      for (let d = CITY_RADIUS + 38; d < REGION_SIZE / 2 + 4; d += 2.5) {
        const x = ax * d, z = az * d, y = H(x, z);
        if (y < WATER_Y - 0.2) { drapeStrip(g, run, AVENUE * 1.6, spec.road, H); run = []; continue; } // a bridge carries it over the water
        run.push([x, z]);
        if (Math.round(d / 2.5) % 4 === 0) box(g, 0.22, 0.02, 2.4, '#f4f0e0', x, y + 0.08, z, ry);
      }
      drapeStrip(g, run, AVENUE * 1.6, spec.road, H);
    }
    const ring: Array<[number, number]> = [];
    for (let a = 0; a <= Math.PI * 2 + 1e-6; a += 0.02) ring.push([Math.cos(a) * RING, Math.sin(a) * RING]);
    drapeStrip(g, ring, 9, spec.road, H);
    drapeDisc(g, 50, spec.road, H);
    // Patterned paths in the land's own colours: a mosaic runner down each avenue, a tiled
    // border along the ring road, and a star mosaic in the plaza.
    const [pa, pb] = LAND_STYLE[spec.id].frieze;
    for (let d = 58; d < CITY_RADIUS + 36; d += 3) {
      const k = Math.round(d / 3) % 2;
      for (const [x, z, ry] of [[0, d, 0], [0, -d, 0], [d, 0, Math.PI / 2], [-d, 0, Math.PI / 2]] as const) {
        g.frame(x, H(x, z) + 0.1, z, ry, 1, () => {
          box(g, 0.9, 0.04, 0.9, k ? pa : pb, 0, 0, 0, Math.PI / 4);
          for (const sx of [-1, 1]) box(g, 0.35, 0.04, 0.35, k ? pb : pa, sx * 1.4, 0, 0, Math.PI / 4);
          for (const sx of [-1, 1]) box(g, 0.12, 0.035, 3, pb, sx * (AVENUE * 0.8 - 0.3), 0, 0);
        });
      }
    }
    for (let a = 0; a < Math.PI * 2; a += 0.045) for (const r of [RING - 5.8, RING + 5.8]) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      box(g, 0.55, 0.035, 0.55, Math.round(a / 0.045) % 2 ? pa : pb, x, H(x, z) + 0.1, z, -a + Math.PI / 4);
    }
    for (let ring = 0; ring < 5; ring++) {
      const r = 42 - ring * 3.2, n = 16 + ring * 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.1;
        box(g, 1.1, 0.04, 1.1, (i + ring) % 2 ? pa : pb, Math.cos(a) * r, H(Math.cos(a) * r, Math.sin(a) * r) + 0.1, Math.sin(a) * r, a + Math.PI / 4);
      }
    }
  }

  // Houses on a jittered grid inside the city.
  let placed = 0;
  const cells: Array<[number, number]> = [];
  // Bagh-e-Noor is a garden city: its havelis stand well apart among the gardens.
  const step = spec.id === 'newyork' ? 34 : spec.id === 'london' ? 26 : spec.id === 'mughal' ? 27 : 21;
  for (let x = -CITY_RADIUS; x <= CITY_RADIUS; x += step) for (let z = -CITY_RADIUS; z <= CITY_RADIUS; z += step) cells.push([x, z]);
  // Fill from the plaza outwards (with a little jitter), so every town has a close-built heart
  // and thins out towards the fields rather than scattering thinly over the whole disc.
  const order = new Map(cells.map((c) => [c, Math.hypot(c[0], c[1]) + rng.range(0, 70)]));
  cells.sort((a, b) => order.get(a)! - order.get(b)!);
  for (const [cx, cz] of cells) {
    if (placed >= spec.houses) break;
    const x = cx + rng.range(-3, 3), z = cz + rng.range(-3, 3);
    const d = Math.hypot(x, z);
    if (d < 62 || d > CITY_RADIUS - 6) continue;
    if (onRoad(x, z, spec.id === 'newyork' ? 14 : 9) || nearPlot(x, z, 9)) continue;
    const y = H(x, z);
    if (y < WATER_Y + 0.4) continue;
    // Never on the banks of a river or lake.
    if (waterEdge(c.x + x, c.z + z).d < 12) continue;
    // Face the nearest avenue.
    const ry = Math.abs(x) < Math.abs(z) ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : z > 0 ? Math.PI : 0;
    let fp = { r: 4, h: 6 };
    const hs = houseScale(spec.id);
    // Lands built from real traditions (facade kit, New Yonder, the Meadow) build only their own kinds; others mix in generic variants.
    const variant = LAND_STYLE[spec.id].kinds.length > 0 && spec.id !== 'desert' && spec.id !== 'aurora' && spec.id !== 'skyisles' && !['newyork', 'meadow', 'london', 'renaissance', 'vintage', 'norway', 'switzerland', ...Object.keys(TRADITIONS)].includes(spec.id) && rng.chance(VARIANT_SHARE);
    g.frame(x, y, z, ry, hs, () => glow.frame(x, y, z, ry, hs, () => { fp = variant ? buildVariant(ctx) : buildHouse(ctx); if (variant) houseDecor(ctx, fp); houseLights(ctx, fp); }));
    const kind = (fp as { kind?: string }).kind ?? 'house';
    fp = { r: fp.r * hs, h: fp.h * hs };
    colliders.push({ x: c.x + x, z: c.z + z, r: fp.r * 0.85, h: y + fp.h });
    buildings.push({ x, z, r: fp.r });
    // The front door: on the street face, where the building faces the avenue.
    {
      const reach = fp.r * 0.95 + 0.6;
      doors.push({ id: `${spec.id}:${placed}`, land: spec.id, x: c.x + x + Math.sin(ry) * reach, z: c.z + z + Math.cos(ry) * reach, y, facing: ry, kind, r: fp.r });
    }
    placed++;
    recordDecor(spec.id, 'town: houses');
    if (rng.chance(0.25)) spots.push({ x: x + Math.sin(ry) * (fp.r + 3), z: z + Math.cos(ry) * (fp.r + 3) });
  }

  // The town's water: a fountain, pool or spring in each square, and sebils along the streets.
  squaresHere.forEach((q, k) => {
    const y = H(q.x, q.z);
    let cols: Collide[] = [];
    g.frame(q.x, y, q.z, 0, 1, () => glow.frame(q.x, y, q.z, 0, 1, () => { cols = buildSquare(ctx, spec.id, k, 0, 0); }));
    recordDecor(spec.id, 'town: fountain squares');
    for (const col of cols) colliders.push({ x: c.x + q.x + col.x, z: c.z + q.z + col.z, r: col.r, h: y + col.h });
  });
  for (const sb of sebilsHere) {
    const y = H(sb.x, sb.z);
    let col: Collide | null = null;
    g.frame(0, y, 0, 0, 1, () => glow.frame(0, y, 0, 0, 1, () => { col = buildSebil(ctx, sb.x, sb.z, sb.ry); }));
    recordDecor(spec.id, 'street: drinking fountains');
    if (col) colliders.push({ x: c.x + sb.x, z: c.z + sb.z, r: (col as Collide).r, h: y + (col as Collide).h });
  }

  // The neighbourhood: its place of worship and its market, each in the land's tradition, doors to the town.
  for (const q of civicHere) {
    const y = H(q.x, q.z), ry = Math.atan2(-q.x, -q.z);
    g.frame(q.x, y, q.z, ry, 1, () => glow.frame(q.x, y, q.z, ry, 1, () => (q.kind === 'worship' ? buildWorship(ctx) : buildMarket(ctx))));
    recordDecor(spec.id, q.kind === 'worship' ? 'town: place of worship' : 'town: market');
    buildings.push({ x: q.x, z: q.z, r: CIVIC_R });
    // Its halls, towers and walls; its courts, gates and market aisles stay open to walk.
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (const k of civicColliders(spec.id, q.kind)) colliders.push({ x: c.x + q.x + k.x * cs + k.z * sn, z: c.z + q.z - k.x * sn + k.z * cs, r: k.r, h: y + k.h });
  }

  // What the land hangs across its streets (streetGarlands.ts): midway between the lamps, clear of
  // the ring road and the landmark grounds, high enough for buses beneath.
  const gar = GARLANDS[spec.id];
  if (gar && !isSky) {
    const lg = LANDMARK_GROUNDS[spec.id];
    for (const d of [71, 93, 115, 163, 185, 207]) {
      for (const [x, z, ry] of [[0, d, 0], [0, -d, 0], [d, 0, Math.PI / 2], [-d, 0, Math.PI / 2]] as const) {
        if (lg && x >= lg.x0 && x <= lg.x1 && z >= lg.z0 && z <= lg.z1) continue;
        const y = H(x, z);
        g.frame(x, y, z, ry, 1, () => glow.frame(x, y, z, ry, 1, () => garland(ctx, gar.style, gar.colours, AVENUE * 2 + 3, 7.2, Math.round(d + x + z))));
        recordDecor(spec.id, `street: ${gar.style} string`);
      }
    }
  }

  // Lamps and street props along the avenues.
  if (!isSky) {
    for (let d = 60; d < CITY_RADIUS; d += 22) {
      for (const [x, z] of [[AVENUE + 2, d], [-AVENUE - 2, -d], [d, AVENUE + 2], [-d, -AVENUE - 2]] as const) {
        // The land's own street light from the 3D side (world/models/lights.ts), else its lamp post.
        if (!streetLight(ctx, x, H(x, z), z)) lampPost(ctx, x, H(x, z), z);
        recordDecor(spec.id, 'street: lamps');
        colliders.push({ x: c.x + x, z: c.z + z, r: 0.4, h: H(x, z) + 4 });
      }
      for (const [x, z] of [[-AVENUE - 3, d + 8], [AVENUE + 3, -d - 8], [d + 8, -AVENUE - 3], [-d - 8, AVENUE + 3]] as const) {
        if (rng.chance(0.55)) {
          const ry = Math.abs(x) < Math.abs(z) ? 0 : Math.PI / 2;
          streetProp(ctx, x + (Math.abs(x) < Math.abs(z) ? Math.sign(x) * 3 : 0), H(x, z), z + (Math.abs(x) < Math.abs(z) ? 0 : Math.sign(z) * 3), ry);
          recordDecor(spec.id, 'street: stalls and benches');
          colliders.push({ x: c.x + x, z: c.z + z, r: 1.2, h: H(x, z) + 3 });
        } else if (rng.chance(0.6)) {
          tree(g, rng.pick(spec.flora), x, H(x, z), z, rng.range(0.8, 1.2) * TREE_SCALE * 0.8, () => rng.next());
        }
        spots.push({ x: x * 0.95, z: z * 0.95 });
      }
    }
  }

  // The Sky Isles are a crystal meadow: clusters of pastel crystals growing all over the land,
  // thick in drifts and sparse between, a few great spires out in the wild (islands.ts).
  if (isSky) {
    const half = REGION_SIZE / 2;
    for (let i = 0; i < 1700; i++) {
      const x = rng.range(-half, half), z = rng.range(-half, half), d = Math.hypot(x, z);
      // Drifts: most clusters grow where a broad, slow pattern says so.
      const drift = 0.5 + 0.5 * Math.sin(x * 0.021 + Math.sin(z * 0.017) * 2) * Math.sin(z * 0.019 - x * 0.007);
      if (rng.next() > 0.25 + drift * 0.75) continue;
      if (d < 56 || onRoad(x, z, 1) || nearPlot(x, z, 1)) continue;
      if (buildings.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 1.2)) continue;
      if (CAVES.some((cv) => cv.land === spec.id && Math.hypot(c.x + x - cv.x, c.z + z - cv.z) < cv.r + 3)) continue;
      const y = H(x, z);
      if (y < WATER_Y + 0.3) continue;
      const spire = d > CITY_RADIUS && rng.chance(0.04);
      const size = spire ? rng.range(3.5, 6.5) : rng.range(0.35, 1.5) * (d < CITY_RADIUS ? 0.8 : 1);
      crystalCluster(g, glow, x, y, z, size, () => rng.next());
      if (size > 1.2) colliders.push({ x: c.x + x, z: c.z + z, r: size * 0.35, h: y + size * 1.2 });
    }
  }

  // Gulabi Nagar in festival season: gates, rangolis, Holi stalls, torans, chhatris (gulabi.ts).
  if (spec.id === 'indianorth') dressGulabi(ctx, c.x, c.z, H, colliders, doors, (x, z, pad) => onRoad(x, z, pad - 3) || nearPlot(x, z, pad));

  // The banks of the land's waters: quay walls, towpaths with lanterns, ghats, stone-edged ponds (banks.ts).
  const banks = buildBanks(ctx, spec.id, c.x, c.z, H, WATER_Y);
  for (const l of banks.lamps) colliders.push({ x: c.x + l.x, z: c.z + l.z, r: 0.4, h: H(l.x, l.z) + 4 });
  const onTowpath = (x: number, z: number, pad: number) => banks.paths.some((p) => Math.abs(x - p.x) < 2 + pad && Math.abs(z - p.z) < 2 + pad);

  // Nature beyond the city.
  const half = REGION_SIZE / 2;
  // Trees grow by terrain (nature.ts): the zone of each spot decides what grows there, how thickly,
  // and each land how large its trees stand.
  const nature = NATURE[spec.id];
  const dunesHere = DUNES[spec.id] ?? 0;
  const grove = new Grove();
  const cavesHere = CAVES.filter((cv) => cv.land === spec.id).map((cv) => ({ x: cv.x - c.x, z: cv.z - c.z, r: cv.r }));
  for (let i = 0; i < nature.count; i++) {
    const x = rng.range(-half, half), z = rng.range(-half, half);
    const d = Math.hypot(x, z);
    if (d < CITY_RADIUS + 10 && !isSky) {
      // Parks: a few trees inside the city between houses.
      if (rng.chance(0.85) || onRoad(x, z, 4) || d < 60) continue;
    }
    if (isSky && (d < 60 || onRoad(x, z, 4))) continue;
    if (nearPlot(x, z, 2)) continue;
    const y = H(x, z);
    if (y < WATER_Y + 0.3) continue;
    const slope = Math.hypot(H(x + 2, z) - H(x - 2, z), H(x, z + 2) - H(x, z - 2)) / 4;
    const zone = zoneAt(spec, y, slope, waterEdge(c.x + x, c.z + z).d, d > CITY_RADIUS ? dunesHere : 0, duneShape(c.x + x, c.z + z));
    const kind = pickTree(spec, zone, () => rng.next());
    if (!kind) continue;
    // Sizes vary; out in the country about one tree in twelve is a giant, as tall as a building.
    const giant = d > CITY_RADIUS + 30 && HABITS[kind] && rng.chance(isSky ? 0.12 : 0.08);
    const s = giant ? rng.range(18, 26) / speciesHeight(kind) : rng.range(0.7, 1.6) * TREE_SCALE * nature.size;
    // Crowns stand clear of the buildings and (mostly) of each other: woods, not a tangle.
    const crown = speciesHeight(kind) * s * 0.28;
    if (buildings.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + crown * 0.8 + 1)) continue;
    if (cavesHere.some((cv) => Math.hypot(x - cv.x, z - cv.z) < cv.r + 2)) continue;
    if (onTowpath(x, z, crown * 0.5)) continue;
    if (grove.near(x, z, crown)) continue;
    grove.add(x, z, crown);
    tree(g, kind, x, y, z, s, () => rng.next());
    if (kind !== 'bamboo' && kind !== 'crystal') colliders.push({ x: c.x + x, z: c.z + z, r: (HABITS[kind]?.r ?? 0.25) * s * 1.1, h: y + 4 * s });
  }
  // The understory (understory.ts): reeds, papyrus and mangroves at the water, heather, alpenrose,
  // edelweiss, saltbush, ferns, tea and flowering shrubs by ground — in clumps, on their own seed.
  {
    const urng = new Rng(`understory:${spec.id}`), us = UNDERSTORY[spec.id];
    let planted = 0;
    for (let i = 0; i < us.count; i++) {
      const x = urng.range(-half, half), z = urng.range(-half, half), d = Math.hypot(x, z);
      if (isSky ? d < 60 : d < CITY_RADIUS + 4) continue;
      if (onRoad(x, z, 3) || nearPlot(x, z, 3)) continue;
      const y = H(x, z);
      if (y < WATER_Y + 0.05) continue;
      const slope = Math.hypot(H(x + 2, z) - H(x - 2, z), H(x, z + 2) - H(x, z - 2)) / 4;
      const zone = zoneAt(spec, y, slope, waterEdge(c.x + x, c.z + z).d, dunesHere, duneShape(c.x + x, c.z + z));
      const kinds = understoryFor(spec.id, zone);
      if (!kinds.length) continue;
      if (buildings.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2) || cavesHere.some((cv) => Math.hypot(x - cv.x, z - cv.z) < cv.r + 2) || onTowpath(x, z, 1.5)) continue;
      const kind = kinds[Math.floor(urng.next() * kinds.length) % kinds.length];
      // A clump of two to five, one kind, a little apart.
      const n = urng.int(2, 5);
      for (let k = 0; k < n; k++) {
        const px = x + urng.range(-2.4, 2.4), pz = z + urng.range(-2.4, 2.4), py = H(px, pz);
        if (py < WATER_Y + 0.02) continue;
        plant(g, kind, px, py - 0.05, pz, urng.range(0.8, 1.3), () => urng.next(), us.blooms);
        planted++;
      }
    }
    if (planted) recordDecor(spec.id, 'nature: understory');
  }
  // Caves out in the wild (caves.ts), built by the 3D side's buildCave.
  const caves = CAVES.filter((cv) => cv.land === spec.id);
  for (const cv of caves) {
    const x = cv.x - c.x, z = cv.z - c.z, y = H(x, z);
    g.frame(x, y - 0.5, z, cv.facing, 1, () => glow.frame(x, y - 0.5, z, cv.facing, 1, () => buildCave({ g, glow, rng, s: spec }, cv.style, cv.r)));
    colliders.push({ x: cv.x, z: cv.z, r: cv.r * 0.85, h: y + cv.r * 0.8 });
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
  // Outcrops shaped by the land (rocks.ts): sandstone formations and hoodoos in the deserts, crags
  // and shards of blue ice in the snow, giant crystals in the Sky Isles.
  {
    const kind = OUTCROPS[spec.id];
    for (let i = 0, placed = 0; kind && i < kind.n * 8 && placed < kind.n; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(CITY_RADIUS + 25, half - 25);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, s = rng.range(2, 6) * kind.size;
      if (onRoad(x, z, s + 4) || nearPlot(x, z, s + 3) || onTowpath(x, z, s + 2)) continue;
      if (cavesHere.some((cv) => Math.hypot(x - cv.x, z - cv.z) < cv.r + s + 6)) continue;
      if (waterEdge(c.x + x, c.z + z).d < s + 8) continue;
      const y = H(x, z), seed = Math.floor(rng.next() * 997);
      if (y < WATER_Y + 0.5) continue;
      g.frame(x, y, z, rng.range(0, Math.PI * 2), 1, () => glow.frame(x, y, z, 0, 1, () => outcrop(ctx, kind.style, s, seed)));
      colliders.push({ x: c.x + x, z: c.z + z, r: Math.min(2, s * 0.6), h: y + s * 1.5 });
      placed++;
      recordDecor(spec.id, `land: ${kind.style} outcrops`);
    }
  }
  // Scree and fallen boulders round the feet of the land's mountains, plateaus and hills (landforms.ts).
  {
    const lrng = new Rng(`lfrocks:${spec.id}`);
    const STYLE: Record<string, 'sandstone' | 'crag' | 'ice'> = { mesa: 'sandstone', butte: 'sandstone', arctic: 'ice' };
    for (const lf of LANDFORMS.filter((l) => l.land === spec.id)) {
      const n = Math.round(lf.r / (lf.kind === 'hill' ? 14 : 7));
      for (let k = 0; k < n; k++) {
        const a = lrng.range(0, Math.PI * 2), rr = lf.r * lrng.range(0.86, 1.12);
        const x = lf.x - c.x + Math.cos(a) * rr, z = lf.z - c.z + Math.sin(a) * rr, sz = lrng.range(1.2, 3.4) * (lf.kind === 'hill' ? 0.7 : 1);
        if (onRoad(x, z, sz + 4) || nearPlot(x, z, sz + 3) || onTowpath(x, z, sz + 2)) continue;
        if (cavesHere.some((cv) => Math.hypot(x - cv.x, z - cv.z) < cv.r + sz + 4)) continue;
        if (waterEdge(c.x + x, c.z + z).d < sz + 6) continue;
        const y = H(x, z), seed = Math.floor(lrng.next() * 997);
        if (y < WATER_Y + 0.5) continue;
        g.frame(x, y - 0.3, z, lrng.range(0, Math.PI * 2), 1, () => glow.frame(x, y - 0.3, z, 0, 1, () => outcrop(ctx, STYLE[lf.kind] ?? 'crag', sz, seed)));
        colliders.push({ x: c.x + x, z: c.z + z, r: Math.min(2, sz * 0.6), h: y + sz * 1.5 });
        recordDecor(spec.id, 'land: scree boulders');
      }
    }
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
  // Egypt: reeds and papyrus along the Nile, between its quay walls and the towpaths.
  if (spec.id === 'egypt') for (let i = 0; i < 90; i++) {
    const z = rng.range(-330, 430), x = nileX(z) + rng.pick([-1, 1]) * (NILE_W / 2 + rng.range(2.2, 5));
    if (bridgesOf(spec.id).some((b) => Math.hypot(c.x + x - b.x, c.z + z - b.z) < b.length / 2 + 6)) continue;
    cone(g, 0.3, rng.range(1.4, 2.4), rng.chance(0.5) ? '#6a9a4a' : '#7aa85a', x, H(x, z), z, 4);
    if (rng.chance(0.3)) sphere(g, 0.35, '#8ab86a', x, H(x, z) + 2.2, z, 5, 0.4);
  }
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(CITY_RADIUS + 20, half - 30);
    wild.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }

  // Lily pads and lotus flowers on the ponds and the lake; the flowers glow after dusk.
  for (const l of lotusSpots(spec.id)) {
    const x = l.x - c.x, z = l.z - c.z;
    cyl(g, 0.9, 0.9, 0.05, '#4f9a5a', x, WATER_Y + 0.02, z, 9);
    if (l.flower) {
      for (let k = 0; k < 6; k++) cone(glow, 0.16, 0.4, k % 2 ? '#ffb8d8' : '#ffe0f0', x + Math.cos(k) * 0.18, WATER_Y + 0.08, z + Math.sin(k) * 0.18, 4);
      sphere(glow, 0.1, '#fff08a', x, WATER_Y + 0.22, z, 5);
    }
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

  // Built and paved ground, so the meadow never grows through it (paved.ts).
  {
    const paved: Paved[] = [];
    const W = (x: number, z: number) => ({ x: c.x + x, z: c.z + z });
    for (const b of buildings) paved.push({ ...W(b.x, b.z), r: b.r + 1.6 });
    for (const q of squaresHere) paved.push({ ...W(q.x, q.z), r: SQUARE_R + 1 });
    for (const q of sebilsHere) paved.push({ ...W(q.x, q.z), r: 3 });
    for (const p of fieldsHere) paved.push({ ...W(p.x, p.z), hw: FIELD_SIZE / 2 + 1, hd: FIELD_SIZE / 2 + 1 });
    for (const p of sitesHere) paved.push({ ...W(p.x, p.z), hw: SITE_SIZE / 2, hd: SITE_SIZE / 2 });
    for (const cv of caves) paved.push({ x: cv.x, z: cv.z, r: cv.r + 1 });
    for (const h of harbours().filter((q) => q.land === spec.id)) paved.push({ x: h.x, z: h.z, r: 16 });
    const lg = LANDMARK_GROUNDS[spec.id];
    if (lg) paved.push({ ...W((lg.x0 + lg.x1) / 2, (lg.z0 + lg.z1) / 2), hw: (lg.x1 - lg.x0) / 2, hd: (lg.z1 - lg.z0) / 2 });
    for (const q of RESERVED[spec.id] ?? []) paved.push({ ...W(q.x, q.z), r: q.r });
    for (const q of banks.paths) paved.push({ ...W(q.x, q.z), r: 2 });
    setPaved(spec.id, paved);
  }

  const group = new THREE.Group();
  group.position.set(c.x, 0, c.z);
  // Tree crowns: translucent leafy blobs and the leaf cards that cover them.
  const leafMesh = g.buildLeaves(blobMaterial());
  const cardMesh = leafCardMesh(g.cards);
  if (leafMesh) { leafMesh.castShadow = true; group.add(leafMesh); }
  if (cardMesh) group.add(cardMesh);
  const solidMesh = g.build(solid);
  const glowMesh = glow.build(glowMat);
  if (solidMesh) {
    solidMesh.castShadow = true;
    solidMesh.receiveShadow = true;
    group.add(solidMesh);
  }
  if (glowMesh) group.add(glowMesh);
  const waterMesh = water && waterMat ? water.build(waterMat) : null;
  if (waterMesh) { waterMesh.renderOrder = 1; group.add(waterMesh); }

  // Resource nodes: individual objects so they can be gathered and regrow.
  const nodes: ResourceNode[] = [];
  const mats = spec.materials;
  for (let i = 0; i < 24; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = i < 6 && !isSky ? rng.range(70, CITY_RADIUS - 30) : rng.range(CITY_RADIUS - 20, half - 40);
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (onRoad(x, z, 3)) x += 12;
    if (nearPlot(x, z, 2)) continue;
    // Never inside (or against) a building: step outwards along the street until clear.
    for (let k = 0; k < 12 && buildings.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2.5); k++) {
      const nb = buildings.find((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2.5)!;
      const d = Math.hypot(x - nb.x, z - nb.z) || 1;
      x = nb.x + ((x - nb.x) / d) * (nb.r + 3);
      z = nb.z + ((z - nb.z) / d) * (nb.r + 3);
    }
    if (buildings.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + 2.5) || onRoad(x, z, 1)) continue;
    // Never inside a cave's mound either.
    if (caves.some((cv) => Math.hypot(x - (cv.x - c.x), z - (cv.z - c.z)) < cv.r + 2)) continue;
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

  for (const lf of LANDFORMS) if (lf.land === spec.id) recordDecor(spec.id, `land: ${lf.kind}`);
  for (const cv of CAVES) if (cv.land === spec.id) recordDecor(spec.id, `land: ${cv.style === 'den' ? 'den' : 'cave'}`);
  return {
    spec,
    group,
    colliders,
    nodes,
    spots,
    doors,
    caves,
    wild,
    dispose() {
      clearPaved(spec.id);
      solidMesh?.geometry.dispose();
      glowMesh?.geometry.dispose();
      group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o !== solidMesh && o !== glowMesh) (o as THREE.Mesh).geometry.dispose();
      });
    },
  };
}
