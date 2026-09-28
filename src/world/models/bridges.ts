import * as THREE from 'three';
import type { Ctx } from '../architecture';
import { M, box, cone, cyl, dome, gable, onion, sphere } from '../kit';
import { HEAD_GAP } from '../../characters/anatomy';
import type { RegionId } from '../regions';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §5): a bridge in the land `c.s`'s
 * style spanning `length` metres along x (from x = −length/2 to +length/2), `width` wide along z,
 * rising to its deck top at y = `deck` in the middle (the banks are at y = 0 at both ends; the
 * water is below). Walkable: return the deck height profile so the game lays a walkway along it —
 * keep it within ~0.3 m of the banks at the ends so people can step on.
 *
 * Wired: world/bridges.ts places one wherever a land's river crosses the line of an avenue
 * (22 bridges in 17 lands), and world/BridgesView.ts draws them for the lands that are loaded.
 *
 * Every land its own bridge, lit at night by its own lamps (owner: "beautiful lit bridges per land"):
 *  - Old London: a stone bridge of segmental arches, a balustrade, cast-iron lamp standards;
 *  - Firenzia: a Ponte Vecchio-like stone bridge of three arches with statues on its piers;
 *  - Sakura Hollow: a vermilion taiko-bashi, a high drum bridge with giboshi-capped posts;
 *  - Jade Terraces: a marble hump bridge with carved posts and red lanterns;
 *  - Hanok Village: a granite rainbow bridge (hongyegyo) with a plain stone rail;
 *  - Alpenrose: a covered timber bridge like the Kapellbrücke, flower boxes and a shingled roof;
 *  - Maple Row: a red covered bridge; Fjordhavn: a timber trestle with carved scroll ends;
 *  - New Yonder: a little cable-stayed bridge, its cables lit;
 *  - Madinat an-Nur and Souq al-Qamar: a bridge of pointed arches with a crenellated parapet;
 *  - Tents of Rimal: palm logs with rope rails and brass lanterns; the Nile: a causeway with papyrus lamps;
 *  - Gulabi Nagar and Bagh-e-Noor: sandstone arches, a jali parapet, a chhatri at each end;
 *  - Kaveri Coast: a timber bridge with coconut-log rails and brass lamps; Nusa Rinjani: bamboo, a penjor at each end;
 *  - Aurora Huts: timber with snow on the rails and candle lanterns; the Meadow: stone with flowers and fairy lights;
 *  - the Sky Isles: a bridge of light.
 */

type Parapet = 'balustrade' | 'rail' | 'solid' | 'rope' | 'jali' | 'crenel' | 'giboshi' | 'marble' | 'bamboo' | 'glass';
type Lamp = 'iron' | 'paper' | 'brass' | 'crystal' | 'candle' | 'fairy' | 'papyrus' | 'led' | 'none';
interface Style {
  deck: string;
  /** How high the deck rises in the middle (a drum bridge rises more). */
  rise?: number;
  /** Masonry arches under the deck: how many, their colour, pointed or round; 0 for a beam or truss. */
  arches: number;
  archCol?: string;
  pointed?: boolean;
  /** Timber posts standing in the water instead of arches. */
  trestle?: string;
  parapet: Parapet;
  rail: string;
  lamp: Lamp;
  lampEvery?: number;
  /** A roof over the whole bridge (covered bridges). */
  roof?: { col: string; walls?: string };
  ends?: 'giboshi' | 'lions' | 'chhatri' | 'penjor' | 'scroll' | 'obelisk' | 'statues' | 'pylons' | 'crystal';
}

const STYLE: Record<RegionId, Style> = {
  london: { deck: '#8a8478', arches: 3, archCol: '#b8ad98', parapet: 'balustrade', rail: '#d8cfbd', lamp: 'iron', lampEvery: 6 },
  renaissance: { deck: '#b8a888', arches: 3, archCol: '#c8b898', parapet: 'solid', rail: '#d8c8a8', lamp: 'iron', lampEvery: 8, ends: 'statues' },
  japan: { deck: '#8a5a36', rise: 2.3, arches: 0, trestle: '#3a2a22', parapet: 'giboshi', rail: '#d8342a', lamp: 'paper', lampEvery: 7 },
  china: { deck: '#d8d0c0', rise: 2, arches: 1, archCol: '#e8e2d4', parapet: 'marble', rail: '#f0ece2', lamp: 'paper', lampEvery: 5, ends: 'lions' },
  korea: { deck: '#a8a498', rise: 1.6, arches: 1, archCol: '#b8b4a8', parapet: 'rail', rail: '#b8b4a8', lamp: 'paper', lampEvery: 9 },
  switzerland: { deck: '#8a6444', arches: 0, trestle: '#6b4a2a', parapet: 'solid', rail: '#8a6444', lamp: 'iron', lampEvery: 8, roof: { col: '#8a5a3a', walls: '#a8784a' } },
  vintage: { deck: '#8a6444', arches: 0, trestle: '#7a5a3a', parapet: 'solid', rail: '#b83a2a', lamp: 'iron', lampEvery: 10, roof: { col: '#4a3a3a', walls: '#b83a2a' } },
  norway: { deck: '#8a6444', arches: 0, trestle: '#3a2418', parapet: 'rail', rail: '#3a2418', lamp: 'candle', lampEvery: 7, ends: 'scroll' },
  newyork: { deck: '#6a6a72', arches: 0, parapet: 'glass', rail: '#c8d0d8', lamp: 'led', lampEvery: 4, ends: 'pylons' },
  islamic: { deck: '#d8c8a8', arches: 4, archCol: '#e8dcc6', pointed: true, parapet: 'crenel', rail: '#e8dcc6', lamp: 'brass', lampEvery: 6 },
  middleeast: { deck: '#d8c8a8', arches: 4, archCol: '#e2d6bc', pointed: true, parapet: 'crenel', rail: '#e2d6bc', lamp: 'brass', lampEvery: 6 },
  desert: { deck: '#8a6a4a', arches: 0, trestle: '#7a5a3a', parapet: 'rope', rail: '#c8a878', lamp: 'brass', lampEvery: 6 },
  egypt: { deck: '#d8c08a', arches: 3, archCol: '#e0c48a', parapet: 'solid', rail: '#e0c48a', lamp: 'papyrus', lampEvery: 7, ends: 'obelisk' },
  indianorth: { deck: '#d27466', arches: 3, archCol: '#e8917a', pointed: true, parapet: 'jali', rail: '#e8917a', lamp: 'brass', lampEvery: 7, ends: 'chhatri' },
  mughal: { deck: '#b5552e', arches: 3, archCol: '#b5552e', pointed: true, parapet: 'jali', rail: '#fbf7ee', lamp: 'brass', lampEvery: 7, ends: 'chhatri' },
  indiasouth: { deck: '#8a5a36', arches: 0, trestle: '#5a3422', parapet: 'bamboo', rail: '#8a6a3a', lamp: 'brass', lampEvery: 6 },
  indonesia: { deck: '#c8a86a', arches: 0, trestle: '#8a7a4a', parapet: 'bamboo', rail: '#c8a86a', lamp: 'paper', lampEvery: 8, ends: 'penjor' },
  aurora: { deck: '#8a6444', arches: 0, trestle: '#6a4a30', parapet: 'rail', rail: '#6a4a30', lamp: 'candle', lampEvery: 6 },
  meadow: { deck: '#c8bca8', arches: 2, archCol: '#d8ccb8', parapet: 'solid', rail: '#e0d4c0', lamp: 'fairy', lampEvery: 3 },
  skyisles: { deck: '#f4f0ff', arches: 0, parapet: 'glass', rail: '#b8a4ff', lamp: 'crystal', lampEvery: 3, ends: 'crystal' },
};

/** The arched side wall under a masonry deck, from the deck down into the water, n arches through it. */
function spandrel(L: number, deckAt: (x: number) => number, n: number, pointed: boolean): THREE.Shape {
  const s = new THREE.Shape(), low = -2.6, pier = Math.min(1.4, L / (n * 4)), span = (L - pier * (n + 1)) / n;
  s.moveTo(-L / 2, low);
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + pier * (i + 1) + span * i, x1 = x0 + span, mid = (x0 + x1) / 2;
    const top = Math.min(deckAt(mid) - 0.55, low + span * 0.62);
    s.lineTo(x0, low); s.lineTo(x0, low + 0.4);
    if (pointed) { s.quadraticCurveTo(x0, top - 0.1, mid, top); s.quadraticCurveTo(x1, top - 0.1, x1, low + 0.4); }
    else s.quadraticCurveTo(mid, top + (top - low) * 0.7, x1, low + 0.4);
    s.lineTo(x1, low);
  }
  s.lineTo(L / 2, low);
  for (let i = 20; i >= 0; i--) { const x = -L / 2 + (i / 20) * L; s.lineTo(x, deckAt(x) - 0.3); }
  return s;
}

/** A lamp on its post (or hanging), at (x, y, z) in the bridge's frame. */
function bridgeLamp(c: Ctx, kind: Lamp, x: number, y: number, z: number): void {
  const { g, glow } = c;
  switch (kind) {
    case 'iron': cyl(g, 0.05, 0.07, 2.4, '#1f1f24', x, y, z, 6); box(glow, 0.26, 0.4, 0.26, '#ffe2a0', x, y + 2.5, z); cone(g, 0.24, 0.25, '#1f1f24', x, y + 2.9, z, 4, Math.PI / 4); break;
    case 'paper': cyl(g, 0.03, 0.03, 1.5, '#3a2a22', x, y, z, 4); sphere(glow, 0.22, '#ff8a4a', x, y + 1.7, z, 8, 1.3); break;
    case 'brass': cyl(g, 0.03, 0.04, 1.8, '#8a6a3a', x, y, z, 5); glow.add(new THREE.OctahedronGeometry(0.17).scale(1, 1.4, 1), '#ffcf7a', M(x, y + 2, z)); dome(g, 0.15, '#c8a040', x, y + 2.2, z, 6); break;
    case 'crystal': glow.add(new THREE.OctahedronGeometry(0.2).scale(0.6, 1.5, 0.6), '#bfe8ff', M(x, y + 1.2, z)); break;
    case 'candle': cyl(g, 0.06, 0.06, 1.3, '#3a2418', x, y, z, 5); cyl(g, 0.12, 0.12, 0.3, '#2a2a2e', x, y + 1.3, z, 6); cyl(glow, 0.09, 0.09, 0.24, '#ffcf7a', x, y + 1.33, z, 6); break;
    case 'fairy': sphere(glow, 0.08, ['#ffe98a', '#ffd6f0', '#c8f0ff'][Math.abs(Math.round(x)) % 3], x, y + 1.1, z, 5); break;
    case 'papyrus': cyl(g, 0.08, 0.1, 1.9, '#d8c08a', x, y, z, 8); g.add(new THREE.CylinderGeometry(0.25, 0.08, 0.35, 10, 1, true), '#5aa05a', M(x, y + 2.05, z)); cone(glow, 0.12, 0.26, '#ffa84a', x, y + 2.2, z, 6); break;
    case 'led': box(glow, 0.05, 0.05, 0.05, '#bfe8ff', x, y + 1.1, z); break;
    default: break;
  }
}

/** The deck's height above its banks at `x` along a bridge of `length` in `land`'s style. */
export function bridgeDeck(land: RegionId, length: number, x: number, deck = 1.2): number {
  const rise = STYLE[land].rise ?? deck;
  return 0.15 + (rise - 0.15) * (1 - (2 * x / length) ** 2);
}

export function buildBridge(c: Ctx, length: number, width: number, deck = 1.2): { deckAt: (x: number) => number } {
  const st = STYLE[c.s.id], L = length, W = width, g = c.g;
  const deckAt = (x: number) => bridgeDeck(c.s.id, L, x, deck);
  const n = Math.max(6, Math.round(L / 1.1)), step = L / n;
  // The deck: planks or paving following the curve.
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * step, y = deckAt(x), slope = Math.atan2(deckAt(x + step / 2) - deckAt(x - step / 2), step);
    g.add(new THREE.BoxGeometry(step + 0.06, 0.3, W), i % 2 && !st.arches ? st.deck : st.deck, M(x, y - 0.15, 0, 0, 1, 1, 1, 0, slope));
    // A road bridge: a lane each way with a dashed line between, and raised pavements at the sides.
    if (W >= 8) {
      if (i % 2 === 0) g.add(new THREE.BoxGeometry(step * 0.7, 0.02, 0.14), '#f4f0e0', M(x, y + 0.01, 0, 0, 1, 1, 1, 0, slope));
      for (const sz of [-1, 1]) g.add(new THREE.BoxGeometry(step + 0.06, 0.16, 1.4), '#' + new THREE.Color(st.deck).multiplyScalar(1.12).getHexString(), M(x, y + 0.08, sz * (W / 2 - 0.9), 0, 1, 1, 1, 0, slope));
    }
  }
  // What holds it up: masonry arches, or posts standing in the water.
  if (st.arches > 0) {
    const geo = new THREE.ExtrudeGeometry(spandrel(L, deckAt, st.arches, !!st.pointed), { depth: W + 0.4, bevelEnabled: false, curveSegments: 8 });
    geo.translate(0, 0, -(W + 0.4) / 2);
    g.add(geo, st.archCol ?? st.deck);
    // Voussoir rings picked out round each arch on both faces.
    const pier = Math.min(1.4, L / (st.arches * 4)), span = (L - pier * (st.arches + 1)) / st.arches;
    for (let i = 0; i < st.arches; i++) for (const s of [-1, 1]) {
      const mid = -L / 2 + pier * (i + 1) + span * (i + 0.5);
      g.add(new THREE.TorusGeometry(span / 2, 0.14, 4, 16, Math.PI), '#' + new THREE.Color(st.archCol ?? st.deck).multiplyScalar(0.85).getHexString(), M(mid, -2.2, s * (W / 2 + 0.22), 0, 1, st.pointed ? 1.5 : 1.15, 1));
    }
  } else if (st.trestle) {
    for (let i = 1; i < 4; i++) { const x = -L / 2 + (i / 4) * L; for (const s of [-1, 1]) { cyl(g, 0.18, 0.2, deckAt(x) + 2.5, st.trestle, x, -2.5, s * (W / 2 - 0.3), 6); } box(g, 0.3, 0.3, W, st.trestle, x, deckAt(x) - 0.6, 0); for (const s of [-1, 1]) g.add(new THREE.CylinderGeometry(0.08, 0.08, 3, 5), st.trestle, M(x, deckAt(x) - 1.5, s * (W / 2 - 0.3), 0, 1, 1, 1, 0, 0.5)); }
  } else if (c.s.id === 'newyork') {
    // Cable-stayed: a pylon at each end, cables fanning down to the deck edges, lit.
    for (const e of [-1, 1]) {
      const px = e * (L / 2 - 1);
      for (const s of [-1, 1]) cyl(g, 0.22, 0.3, 9, '#c8d0d8', px, 0, s * (W / 2 + 0.3), 8);
      box(g, 0.4, 0.4, W + 1, '#c8d0d8', px, 8.6, 0);
      for (let k = 1; k <= 5; k++) for (const s of [-1, 1]) {
        const x = px - e * k * (L / 12), a = new THREE.Vector3(px, 8.4, s * (W / 2 + 0.3)), b = new THREE.Vector3(x, deckAt(x) + 0.1, s * (W / 2 + 0.2));
        const d = b.clone().sub(a), mid = a.clone().add(b).multiplyScalar(0.5);
        c.glow.add(new THREE.CylinderGeometry(0.02, 0.02, d.length(), 3).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())), '#bfe8ff', M(mid.x, mid.y, mid.z));
      }
    }
  } else if (c.s.id === 'skyisles') {
    box(c.glow, L, 0.05, W - 0.4, '#e8e0ff', 0, deckAt(0) + 0.02, 0);
  }
  // The parapets along both sides.
  for (const s of [-1, 1]) {
    const z = s * (W / 2 - 0.1);
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (i + 0.5) * step, y = deckAt(x), slope = Math.atan2(deckAt(x + step / 2) - deckAt(x - step / 2), step);
      const along = (h: number, t: number, col: string, yy = y) => g.add(new THREE.BoxGeometry(step + 0.04, h, t), col, M(x, yy + h / 2, z, 0, 1, 1, 1, 0, slope));
      switch (st.parapet) {
        case 'balustrade': along(0.12, 0.3, st.rail, y + 0.85); for (let q = 0; q < 3; q++) cyl(g, 0.06, 0.09, 0.85, st.rail, x - step / 3 + q * step / 3, y, z, 6); break;
        case 'solid': along(1.0, 0.28, st.rail); along(0.1, 0.38, '#' + new THREE.Color(st.rail).multiplyScalar(0.9).getHexString(), y + 1.0); if (st.roof && i % 2 === 0) box(g, step * 0.8, 0.25, 0.4, '#8a5a36', x, y + 1.05, z + s * 0.15); break;
        case 'rail': along(0.1, 0.12, st.rail, y + 0.95); if (i % 2 === 0) box(g, 0.12, 1.05, 0.12, st.rail, x, y, z); if (c.s.id === 'aurora') along(0.12, 0.2, '#f4f8ff', y + 1.05); break;
        case 'rope': if (i % 3 === 0) cyl(g, 0.06, 0.07, 1.1, st.trestle ?? st.rail, x, y, z, 5); along(0.04, 0.04, st.rail, y + 1.0); along(0.04, 0.04, st.rail, y + 0.55); break;
        case 'jali': along(0.14, 0.3, st.rail, y + 0.9); along(0.2, 0.3, st.rail, y); for (let q = 0; q < 4; q++) box(g, 0.05, 0.7, 0.1, st.rail, x - step * 0.37 + q * step * 0.25, y + 0.2, z); break;
        case 'crenel': along(0.9, 0.35, st.rail); if (i % 2 === 0) box(g, step * 0.5, 0.4, 0.35, st.rail, x, y + 0.9, z); break;
        case 'giboshi': along(0.08, 0.1, st.rail, y + 0.9); along(0.06, 0.08, st.rail, y + 0.45); if (i % 3 === 0) { box(g, 0.14, 1.05, 0.14, st.rail, x, y, z); sphere(g, 0.13, '#c8a040', x, y + 1.15, z, 8, 1.3); } break;
        case 'marble': along(0.2, 0.28, st.rail); along(0.12, 0.28, st.rail, y + 0.85); if (i % 2 === 0) { box(g, 0.24, 1.1, 0.24, st.rail, x, y, z); sphere(g, 0.15, st.rail, x, y + 1.2, z, 8); } else for (let q = 0; q < 2; q++) box(g, 0.3, 0.3, 0.08, st.rail, x - 0.2 + q * 0.4, y + 0.4, z); break;
        case 'bamboo': for (const h of [0.5, 0.95]) along(0.08, 0.08, st.rail, y + h); if (i % 2 === 0) cyl(g, 0.05, 0.05, 1.05, st.rail, x, y, z, 5); break;
        case 'glass': c.glow.add(new THREE.BoxGeometry(step, 0.04, 0.04), c.s.id === 'skyisles' ? '#fff0c8' : '#bfe8ff', M(x, y + 1.0, z, 0, 1, 1, 1, 0, slope)); g.add(new THREE.BoxGeometry(step, 0.9, 0.04), st.rail, M(x, y + 0.5, z, 0, 1, 1, 1, 0, slope)); break;
      }
    }
    // The lamps along the parapet.
    const every = st.lampEvery ?? 6;
    for (let x = -L / 2 + every / 2; x < L / 2; x += every) bridgeLamp(c, st.lamp, x, deckAt(x) + (st.parapet === 'solid' || st.parapet === 'crenel' ? 1.1 : 0), z + s * (st.lamp === 'fairy' ? 0.1 : 0.05));
  }
  // A roof over a covered bridge: posts, gables at each end, painted boards along the eaves.
  if (st.roof) {
    for (let i = 0; i <= Math.round(L / 3); i++) { const x = -L / 2 + (i / Math.round(L / 3)) * L; for (const s of [-1, 1]) box(g, 0.2, 2.6, 0.2, st.roof.walls ?? st.rail, x, deckAt(x), s * (W / 2 - 0.1)); }
    for (let i = 0; i < n; i += 2) { const x = -L / 2 + (i + 1) * step; gable(g, step * 2 + 0.05, W + 1.2, 1.4, st.roof.col, x, deckAt(x) + 2.6, 0); }
    if (st.roof.walls) for (const e of [-1, 1]) gable(g, 0.2, W + 0.4, 1.3, st.roof.walls, e * L / 2, deckAt(e * L / 2) + 2.6, 0);
  }
  // What stands at each end.
  for (const e of [-1, 1]) for (const s of [-1, 1]) {
    const x = e * (L / 2 - 0.4), z = s * (W / 2 + 0.3), y = 0;
    switch (st.ends) {
      case 'lions': box(g, 0.7, 0.8, 0.7, '#e8e2d4', x, y, z); sphere(g, 0.35, '#e8e2d4', x, y + 1.15, z, 8); break; // a carved ball on its plinth (no faces)
      case 'chhatri': for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.06, 0.06, 1.4, '#fbf7ee', x + dx * 0.4, y, z + dz * 0.4, 5); box(g, 1.1, 0.12, 1.1, '#fbf7ee', x, y + 1.4, z); onion(g, 0.4, '#fbf7ee', x, y + 1.52, z); break;
      case 'penjor': { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(x + e * u * u * 1.2, y + u * 5, z)); } g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.05, 4), '#c8a86a'); c.glow.add(new THREE.ConeGeometry(0.15, 0.4, 6), '#ffd88a', M(x + e * 1.2, y + 4.6, z, 0, 1, 1, 1, Math.PI, 0)); break; }
      case 'scroll': { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 1.5; pts.push(new THREE.Vector3(x + e * Math.sin(a) * 0.3, y + 1.2 + (1 - Math.cos(a)) * 0.3, z)); } cyl(g, 0.12, 0.14, 1.3, '#3a2418', x, y, z, 6); g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.07, 4), '#3a2418'); break; }
      case 'obelisk': box(g, 0.6, 0.4, 0.6, '#c8b088', x, y, z); g.add(new THREE.CylinderGeometry(0.14, 0.25, 2.6, 4).rotateY(Math.PI / 4), '#d8c08a', M(x, y + 1.7, z)); cone(g, 0.2, 0.3, '#d4af37', x, y + 3, z, 4, Math.PI / 4); break;
      case 'statues': box(g, 0.8, 1.2, 0.8, '#c8b898', x, y, z); cyl(g, 0.2, 0.28, 1.2, '#e8e0d0', x, y + 1.2, z, 8); sphere(g, 0.2, '#e8e0d0', x, y + 2.4 + HEAD_GAP + 0.2, z, 8); break; // a draped figure, abstract, its head floating
      case 'crystal': c.glow.add(new THREE.OctahedronGeometry(0.4).scale(0.6, 1.8, 0.6), '#bfe8ff', M(x, y + 1.2, z)); break;
      default: break;
    }
  }
  return { deckAt };
}
