import { piece, skyWhale, type Piece } from './creatures';
import type { Shaper, V3 } from './shaper';
import type { Design } from './designs';

/**
 * The fantasy and sci-fi vehicle kit (DRAGONS_FANTASY_SCIFI_PLAN.md §4): hover pads and glow
 * skirts, ducted fans, maglev skids, walker legs, solar sails, crystal hulls, ornithopter wings,
 * gear trains, envelope rigs — and the vehicles built from them, each for its land. Traffic only:
 * nothing here carries a person; seats are empty, cabins glow at night.
 */

type C = string;
const P = (fn: (s: Shaper) => void, anim: Piece['anim'] = 'none', pivot: V3 = [0, 0, 0], amp = 0) => piece(fn, 'vehicle', anim, pivot, amp);
const GLASS = '#1c2836', WARM = '#ffd9a0', CHROME = '#d8dce4', BRASS = '#c8963a', DARK_BRASS = '#8a6a2a', WOOD = '#7a5236';

// ───── the kit's parts ─────

/** A glowing hover skirt: a flat ring under the body, lit from within. */
function hoverSkirt(s: Shaper, rx: number, rz: number, y: number, neon: C): void {
  s.ball(1, '#2a2e36', [0, y, 0], { s: [rx, 0.12, rz], seg: 16 });
  s.ball(1, neon, [0, y - 0.05, 0], { s: [rx * 0.8, 0.05, rz * 0.8], glow: true, seg: 14 });
}
/** A ducted fan: a ring and its hub (the blades spin as a separate piece). */
function duct(s: Shaper, x: number, y: number, z: number, r: number, c: C, neon?: C): void {
  s.cyl(r, r, r * 0.4, c, [x, y, z], { seg: 16 });
  s.cyl(r * 0.2, r * 0.2, r * 0.5, '#3a3a44', [x, y, z], { seg: 8 });
  if (neon) s.cyl(r * 1.02, r * 1.02, r * 0.08, neon, [x, y + r * 0.21, z], { glow: true, seg: 16 });
}
const fanBlades = (x: number, y: number, z: number, r: number) => P((s) => {
  for (let k = 0; k < 3; k++) s.box(r * 1.8, 0.02, r * 0.28, '#2a2a30', [x, y, z], { r: [0, (k / 3) * Math.PI, 0.15] });
}, 'spinY', [x, y, z], 5);
/** A gear on the side of a machine, facing x; it turns about x. */
const gear = (x: number, y: number, z: number, r: number, c: C = BRASS) => P((s) => {
  s.cyl(r, r, 0.08, c, [x, y, z], { r: [0, 0, Math.PI / 2], seg: 14 });
  for (let t = 0; t < 10; t++) { const a = (t / 10) * Math.PI * 2; s.box(0.09, r * 0.22, r * 0.22, c, [x, y + Math.sin(a) * r * 1.05, z + Math.cos(a) * r * 1.05], { r: [a, 0, 0] }); }
  s.cyl(r * 0.25, r * 0.25, 0.12, DARK_BRASS, [x, y, z], { r: [0, 0, Math.PI / 2], seg: 8 });
}, 'spinX', [x, y, z], 0.3);

// ───── New Yonder ─────

/** A hover-bike: a teardrop body over two glowing skirts, a windscreen, neon stripes. */
function hoverBike(id: string, body: C, neon: C): Design {
  return {
    id, name: 'hover-bike', realm: 'road', len: 2.4, speed: 15,
    pieces: [P((s) => {
      s.lathe([[0.05, -1.1], [0.28, -0.8], [0.34, 0], [0.3, 0.6], [0.08, 1.1]], body, [0, 0.75, 0], { s: [1, 0.8, 1], seg: 14 });
      for (const z of [0.75, -0.75]) { hoverSkirt(s, 0.42, 0.42, 0.35, neon); s.cyl(0.12, 0.12, 0.3, '#3a3a44', [0, 0.5, z]); }
      s.box(0.5, 0.3, 0.05, GLASS, [0, 1.05, 0.55], { r: [-0.5, 0, 0] });
      s.box(0.36, 0.08, 0.7, '#2a2a30', [0, 1.0, -0.15]); // the (empty) saddle
      for (const x of [0.3, -0.3]) s.box(0.02, 0.04, 1.6, neon, [x, 0.72, 0], { glow: true });
      s.ball(0.07, '#fff6d8', [0, 0.8, 1.12], { glow: true });
      s.box(0.2, 0.06, 0.04, '#ff4a3a', [0, 0.85, -1.1], { glow: true });
    })],
  };
}

/** A maglev pod: a glass-roofed capsule gliding on a lit skid. */
function maglevPod(): Design {
  return {
    id: 'maglev-pod', name: 'maglev pod', realm: 'road', len: 4.2, speed: 12,
    pieces: [P((s) => {
      s.lathe([[0.1, -2.1], [0.8, -1.7], [1.0, -0.8], [1.0, 0.8], [0.8, 1.7], [0.1, 2.1]], '#f4f6f8', [0, 1.2, 0], { s: [1, 0.85, 1], seg: 18 });
      s.ball(1, GLASS, [0, 1.55, 0], { s: [0.85, 0.5, 1.6], seg: 16 });
      s.ball(1, WARM, [0, 1.55, 0], { s: [0.8, 0.45, 1.5], glow: true, seg: 12 });
      s.box(0.7, 0.18, 3.6, '#3a3e4a', [0, 0.25, 0]);
      s.box(0.72, 0.04, 3.6, '#5af0ff', [0, 0.15, 0], { glow: true });
      for (const x of [0.99, -0.99]) s.box(0.02, 0.06, 3.2, '#5af0ff', [x, 1.1, 0], { glow: true });
    })],
  };
}

/** A cargo walker: a container on four piston legs, striding slowly. */
function cargoWalker(): Design {
  const leg = (x: number, z: number, anim: 'swingA' | 'swingB') => P((s) => {
    s.box(0.3, 0.3, 0.3, '#3a3e4a', [x, 2.6, z]);
    s.rod([x, 2.6, z], [x * 1.2, 1.3, z + 0.2], 0.12, '#c8ccd4');
    s.rod([x * 1.2, 1.3, z + 0.2], [x * 1.1, 0.1, z], 0.09, '#8a8e98');
    s.cyl(0.3, 0.36, 0.14, '#2a2a30', [x * 1.1, 0.07, z]);
    s.ball(0.08, '#ffb84a', [x * 1.2, 1.3, z + 0.2], { glow: true });
  }, anim, [x, 2.6, z], 0.35);
  return {
    id: 'cargo-walker', name: 'cargo walker', realm: 'road', len: 5, speed: 3,
    pieces: [
      P((s) => {
        s.box(2.4, 1.6, 4.4, '#e2842a', [0, 3.5, 0]);
        for (let i = 0; i < 8; i++) s.box(2.42, 1.4, 0.06, '#c86a1a', [0, 3.5, -2 + i * 0.57]);
        s.box(2.0, 0.4, 3.8, '#3a3e4a', [0, 2.55, 0]);
        s.box(1.2, 0.3, 0.05, '#ffd24a', [0, 3.9, 2.21], { glow: true });
        s.ball(0.12, '#fff6d8', [0.8, 2.6, 2.1], { glow: true }); s.ball(0.12, '#fff6d8', [-0.8, 2.6, 2.1], { glow: true });
      }),
      leg(1.1, 1.5, 'swingA'), leg(-1.1, 1.5, 'swingB'), leg(1.1, -1.5, 'swingB'), leg(-1.1, -1.5, 'swingA'),
    ],
  };
}

/** A drone swarm: a flight of little quad-drones with coloured running lights. */
function droneSwarm(): Design {
  return {
    id: 'drone-swarm', name: 'drone swarm', realm: 'sky', len: 0.8, speed: 12, alt: [25, 60], radius: [60, 240], bob: 1.2, bank: 0.3, group: { n: 7, spacing: 4 },
    pieces: [P((s) => {
      s.box(0.35, 0.12, 0.35, '#f4f6f8', [0, 0.3, 0]);
      for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) { s.rod([0, 0.3, 0], [x, 0.34, z], 0.02, '#3a3e4a'); s.cyl(0.14, 0.14, 0.02, '#5af0ff', [x, 0.36, z], { glow: true, seg: 10 }); }
      s.ball(0.05, '#ff5ad8', [0, 0.22, 0], { glow: true });
    })],
  };
}

/** A VTOL shuttle: a white lifting body on four ducted fans, a lit cabin band, fins. */
function vtolShuttle(): Design {
  return {
    id: 'vtol-shuttle', name: 'VTOL shuttle', realm: 'sky', len: 8, speed: 16, alt: [50, 110], radius: [150, 320], bob: 1, bank: 0.2,
    pieces: [
      P((s) => {
        s.lathe([[0.1, -4], [0.9, -3.2], [1.3, -1], [1.3, 1.5], [0.9, 3.2], [0.1, 4]], '#f4f6f8', [0, 2, 0], { s: [1.1, 0.8, 1], seg: 18 });
        s.box(2.9, 0.4, 5, GLASS, [0, 2.25, 0.2]);
        for (let i = 0; i < 7; i++) s.box(2.92, 0.3, 0.5, WARM, [0, 2.25, -2.2 + i * 0.75], { glow: true });
        for (const [x, z] of [[2.4, 2.2], [-2.4, 2.2], [2.4, -2.4], [-2.4, -2.4]]) { s.rod([Math.sign(x) * 1.2, 2, z * 0.8], [x, 2.2, z], 0.12, '#c8ccd4'); duct(s, x, 2.2, z, 0.9, '#e8ecf2', '#3ae8ff'); }
        for (const sx of [1, -1]) s.shape([[0, 0], [1.2, 0], [0.2, 1.4]], 0.06, '#3ae8ff', [sx * 0.6, 2.6, -3.4], { r: [0, -Math.PI / 2, sx * 0.4] });
      }),
      fanBlades(2.4, 2.2, 2.2, 0.9), fanBlades(-2.4, 2.2, 2.2, 0.9), fanBlades(2.4, 2.2, -2.4, 0.9), fanBlades(-2.4, 2.2, -2.4, 0.9),
    ],
  };
}

// ───── Old London ─────

/** A steam ornithopter: a brass-and-mahogany cabin, a funnel, canvas wings that beat. */
function steamOrnithopter(): Design {
  const wing = (sx: number) => P((s) => {
    for (let i = 0; i < 5; i++) s.rod([sx * 0.4, 1.4, 0.4 - i * 0.1], [sx * (1.4 + i * 0.9), 1.6 - i * 0.05, 0.3 - i * 0.5], 0.035, DARK_BRASS);
    s.shape([[0, 0], [5, 0.2], [4.6, -1.4], [3, -2.3], [1.2, -1.9], [0, -1]].map(([x, y]) => [x * sx, y]), 0.03, '#e8dcc0', [sx * 0.4, 1.45, 0.45], { r: [Math.PI / 2, 0, 0] });
  }, sx > 0 ? 'flapL' : 'flapR', [sx * 0.4, 1.4, 0.2], 0.55);
  return {
    id: 'steam-ornithopter', name: 'steam ornithopter', realm: 'sky', len: 5, speed: 10, alt: [45, 90], radius: [120, 280], bob: 2, bank: 0.25,
    pieces: [
      P((s) => {
        s.lathe([[0.1, -2.4], [0.6, -1.6], [0.8, 0], [0.7, 1.4], [0.2, 2.2]], '#6a3a22', [0, 1.2, 0], { seg: 14 });
        for (const z of [-1.2, 0, 1.2]) s.cyl(0.82, 0.82, 0.08, BRASS, [0, 1.2, z], { r: [Math.PI / 2, 0, 0], seg: 14 });
        s.ball(0.5, GLASS, [0, 1.6, 1.0], { s: [1, 0.7, 1] });
        s.ball(0.45, WARM, [0, 1.6, 1.0], { s: [1, 0.7, 1], glow: true });
        s.cyl(0.14, 0.18, 0.9, '#2a2a30', [0, 2.2, -0.6]);
        s.cyl(0.2, 0.2, 0.08, BRASS, [0, 2.65, -0.6]);
        s.shape([[0, 0], [0.9, 0], [0.1, 1.1]], 0.04, BRASS, [0, 1.4, -2.3], { r: [0, -Math.PI / 2, 0] });
      }),
      wing(1), wing(-1),
    ],
  };
}

/** A brass airship tug: a small striped envelope, a riveted gondola, a turning screw. */
function brassTug(): Design {
  return {
    id: 'brass-tug', name: 'brass airship tug', realm: 'sky', len: 9, speed: 7, alt: [55, 95], radius: [150, 300], bob: 1.5, bank: 0.1,
    pieces: [
      P((s) => {
        s.lathe([[0.2, -4.5], [1.6, -3.4], [2.1, -1], [2.1, 1.2], [1.5, 3.4], [0.2, 4.5]], '#8a2a22', [0, 5, 0], { seg: 18 });
        for (let i = -3; i <= 3; i++) s.cyl(2.12 - Math.abs(i) * 0.18, 2.12 - Math.abs(i) * 0.18, 0.12, BRASS, [0, 5, i * 1.1], { r: [Math.PI / 2, 0, 0], seg: 18 });
        s.box(1.2, 0.9, 3, DARK_BRASS, [0, 2.3, 0]);
        for (let z = -1.2; z <= 1.2; z += 0.6) s.box(1.22, 0.3, 0.3, WARM, [0, 2.45, z], { glow: true });
        for (const x of [0.5, -0.5]) s.rod([x, 2.75, 1.2], [x * 2, 3.3, 1.8], 0.03, '#3a3a40');
        for (const [a, b] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) s.shape([[0, 0], [1.2, 0], [0, 1.1]], 0.05, BRASS, [a, 5 + b, -3.9], { r: [0, a !== 0 ? -Math.PI / 2 : 0, b !== 0 ? Math.PI / 2 * Math.sign(b) : 0] });
      }),
      P((s) => { for (let k = 0; k < 3; k++) s.box(0.14, 1.4, 0.05, WOOD, [0, 2.3, -1.9], { r: [0, 0, (k / 3) * Math.PI] }); }, 'spinZ', [0, 2.3, -1.9], 3),
    ],
  };
}

// ───── Firenzia ─────

/** Leonardo's clockwork carriage: no horses — wound springs, turning gears, a painted canopy. */
function clockworkCarriage(): Design {
  return {
    id: 'clockwork-carriage', name: 'clockwork carriage', realm: 'road', len: 3.6, speed: 4,
    pieces: [
      P((s) => {
        s.box(1.6, 0.9, 2.6, WOOD, [0, 1.1, 0]);
        s.box(1.66, 0.12, 2.66, BRASS, [0, 1.58, 0]);
        s.box(1.5, 0.1, 2.2, '#b5552e', [0, 2.6, -0.1]);
        for (const [x, z] of [[0.7, 0.9], [-0.7, 0.9], [0.7, -1.1], [-0.7, -1.1]]) s.rod([x, 1.6, z], [x, 2.55, z], 0.03, BRASS);
        s.cyl(0.5, 0.5, 1.2, DARK_BRASS, [0, 1.2, -1.5], { r: [0, 0, Math.PI / 2], seg: 14 }); // the spring drum
        for (let i = 0; i < 4; i++) s.cyl(0.52, 0.52, 0.04, BRASS, [-0.45 + i * 0.3, 1.2, -1.5], { r: [0, 0, Math.PI / 2], seg: 14 });
        s.rod([0, 1.7, -1.5], [0, 2.1, -1.5], 0.05, BRASS);
        s.cyl(0.25, 0.25, 0.05, BRASS, [0, 2.15, -1.5], { r: [Math.PI / 2, 0, 0], seg: 12 }); // its key
        for (const [x, z, r] of [[0.9, 0.9, 0.5], [-0.9, 0.9, 0.5], [0.9, -1.0, 0.65], [-0.9, -1.0, 0.65]]) s.wheel(r, 0.1, [x, r, z], WOOD, BRASS);
        s.ball(0.1, WARM, [0.75, 1.8, 1.3], { glow: true }); s.ball(0.1, WARM, [-0.75, 1.8, 1.3], { glow: true });
      }),
      gear(0.85, 1.1, 0.1, 0.35), gear(-0.85, 1.1, -0.2, 0.28),
    ],
  };
}

// ───── the Sky Isles ─────

/** A crystal sled: a hull of glowing crystal on silver runners, a little pastel sail. */
function crystalSled(): Design {
  return {
    id: 'crystal-sled', name: 'crystal sled', realm: 'sky', len: 4, speed: 8, alt: [30, 80], radius: [80, 200], bob: 1.5, bank: 0.2,
    pieces: [P((s) => {
      s.hull(4, 1.4, 0.7, '#e8e0ff', [0, 0.6, 0], { sheer: 0.5, deck: '#fff4ff' });
      for (let i = 0; i < 6; i++) s.cone(0.14, 0.7, ['#ffd6f0', '#bfe8ff', '#fff4c0'][i % 3], [(i % 2 ? 0.55 : -0.55), 0.95, -1.4 + i * 0.55], { glow: true, seg: 5 });
      for (const x of [0.5, -0.5]) { s.box(0.06, 0.06, 4.6, CHROME, [x, 0.1, 0]); s.rod([x, 0.1, 1.2], [x * 0.9, 0.45, 1.0], 0.03, CHROME); s.rod([x, 0.1, -1.2], [x * 0.9, 0.45, -1.0], 0.03, CHROME); }
      s.rod([0, 0.9, 0.4], [0, 3.2, 0.4], 0.04, CHROME);
      s.shape([[0, 0], [1.2, 0.2], [0, 2.1]], 0.02, '#ffd6f0', [0, 1.0, 0.45], { r: [0, -Math.PI / 2, 0] });
    })],
  };
}

/** A solar sailship: a sleek hull under three tiers of shimmering sail panels. */
function solarSailship(): Design {
  return {
    id: 'solar-sailship', name: 'solar sailship', realm: 'sky', len: 12, speed: 6, alt: [70, 130], radius: [180, 360], bob: 2, bank: 0.12,
    pieces: [P((s) => {
      s.hull(12, 3, 1.8, '#f4f0ff', [0, 1, 0], { sheer: 0.4, deck: '#dcd8f0' });
      s.box(3.1, 0.06, 11, '#b8a4ff', [0, 1.9, 0], { glow: true });
      for (const z of [3, -1.5]) {
        s.rod([0, 1.9, z], [0, 10, z], 0.1, CHROME);
        for (let t = 0; t < 3; t++) s.box(5 - t * 1.2, 1.9, 0.05, '#1d3566', [0, 3.6 + t * 2.2, z]);
        for (let t = 0; t < 3; t++) s.box(5.1 - t * 1.2, 0.08, 0.06, '#b8e6ff', [0, 4.6 + t * 2.2, z + 0.03], { glow: true });
      }
      for (let i = 0; i < 5; i++) s.box(0.3, 0.3, 0.06, WARM, [1.52, 1.4, -4 + i * 2], { glow: true });
    })],
  };
}

// ───── Wanderers' Meadow ─────

/** A leaf glider: a great curled leaf on a stem, gliding in slow circles. */
function leafGlider(): Design {
  return {
    id: 'leaf-glider', name: 'leaf glider', realm: 'sky', len: 4, speed: 5, alt: [25, 60], radius: [60, 160], bob: 2.5, bank: 0.4,
    pieces: [P((s) => {
      s.ball(1, '#6ab85a', [0, 1, 0], { s: [3.2, 0.12, 1.8], seg: 16 });
      s.ball(1, '#8fd46a', [0, 1.06, 0], { s: [2.9, 0.08, 1.5], seg: 14 });
      s.box(0.08, 0.1, 3.4, '#4a8a3a', [0, 1.12, 0]);
      for (let i = 0; i < 6; i++) for (const sx of [1, -1]) s.rod([0, 1.12, 1.2 - i * 0.5], [sx * 2.4, 1.1, 0.5 - i * 0.55], 0.02, '#4a8a3a');
      s.rod([0, 1, -1.7], [0, 0.6, -2.6], 0.06, '#6a8a3a');
      s.ball(0.1, '#fff4c0', [0, 1.2, 0.3], { glow: true });
    })],
  };
}

/** A dandelion balloon: a clock of seed-plumes carrying a little woven basket. */
function dandelionBalloon(): Design {
  return {
    id: 'dandelion-balloon', name: 'dandelion balloon', realm: 'sky', len: 5, speed: 2, alt: [40, 80], radius: [60, 180], bob: 2, bank: 0,
    pieces: [P((s) => {
      s.ball(0.6, '#e8e0c8', [0, 6, 0]);
      for (let i = 0; i < 60; i++) {
        const y = 1 - (i / 59) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        s.rod([dx * 0.6, 6 + y * 0.6, dz * 0.6], [dx * 2.6, 6 + y * 2.6, dz * 2.6], 0.012, '#f4f0e0');
        s.ball(0.28, '#ffffff', [dx * 2.8, 6 + y * 2.8, dz * 2.8], { s: [1, 1, 1], seg: 5 });
      }
      s.rod([0, 5.4, 0], [0, 1.2, 0], 0.05, '#8ab85a');
      s.cyl(0.6, 0.45, 0.6, '#b8864a', [0, 0.9, 0], { seg: 12 });
      s.ball(0.12, '#fff4c0', [0, 1.3, 0], { glow: true });
    })],
  };
}

// ───── Aurora Huts, the coasts, Tents of Rimal ─────

/** A hover sled: a runnered sledge riding on glowing runes instead of dogs. */
function hoverSled(): Design {
  return {
    id: 'hover-sled', name: 'hover sled', realm: 'road', len: 3.2, speed: 9,
    pieces: [P((s) => {
      s.box(1.2, 0.5, 2.6, '#8a5a3c', [0, 0.9, 0]);
      s.box(1.26, 0.08, 2.66, '#f4f8ff', [0, 1.18, 0]);
      for (const x of [0.6, -0.6]) {
        s.box(0.08, 0.08, 3.2, '#d8dce4', [x, 0.35, 0.1]);
        s.rod([x, 0.35, 1.6], [x, 0.7, 1.9], 0.04, '#d8dce4');
        for (let i = 0; i < 5; i++) s.box(0.1, 0.02, 0.3, '#8affc8', [x, 0.28, -1.2 + i * 0.6], { glow: true });
      }
      s.box(1.1, 0.5, 0.08, '#8a5a3c', [0, 1.3, -1.25]);
      s.ball(0.1, '#ffcf7a', [0, 1.6, -1.3], { glow: true });
    })],
  };
}

/** A bubble submarine: a glass sphere in a brass ring, a turning screw, lamps below. */
function bubbleSub(): Design {
  return {
    id: 'bubble-sub', name: 'bubble submarine', realm: 'water', len: 3.2, speed: 1.8, bob: 0.1,
    pieces: [
      P((s) => {
        s.ball(1.2, GLASS, [0, 0.4, 0], { s: [1, 1, 1.1], seg: 16 });
        s.ball(1.1, WARM, [0, 0.4, 0], { s: [0.95, 0.95, 1.05], glow: true, seg: 12 });
        s.cyl(1.25, 1.25, 0.18, BRASS, [0, 0.4, 0], { seg: 18 });
        s.cyl(1.25, 1.25, 0.12, BRASS, [0, 0.4, 0], { r: [Math.PI / 2, 0, 0], seg: 18 });
        s.cyl(0.25, 0.4, 1.0, DARK_BRASS, [0, 0.4, -1.5], { r: [Math.PI / 2, 0, 0], seg: 10 });
        s.cyl(0.08, 0.08, 1.3, BRASS, [0, 1.7, -0.3]);
        s.ball(0.14, '#fff6d8', [0, 2.35, -0.3], { glow: true });
      }),
      P((s) => { for (let k = 0; k < 3; k++) s.box(0.12, 0.8, 0.05, BRASS, [0, 0.4, -2.05], { r: [0, 0, (k / 3) * Math.PI] }); }, 'spinZ', [0, 0.4, -2.05], 2),
    ],
  };
}

/** A sand skiff: a slim hull on hover runners under a lateen sail, skimming the dunes. */
function sandSkiff(): Design {
  return {
    id: 'sand-skiff', name: 'sand skiff', realm: 'road', len: 5, speed: 11,
    pieces: [P((s) => {
      s.hull(5, 1.4, 0.7, '#a8743a', [0, 0.9, 0], { sheer: 0.4, deck: '#e8d0a0' });
      for (const x of [0.6, -0.6]) { s.box(0.1, 0.08, 4.6, '#6a4a2a', [x, 0.35, 0]); for (let i = 0; i < 4; i++) s.box(0.14, 0.02, 0.5, '#ffb84a', [x, 0.3, -1.5 + i]); }
      for (let i = 0; i < 3; i++) s.rod([0, 0.4, 1.5 - i * 1.5], [0, 0.8, 1.5 - i * 1.5], 0.05, '#6a4a2a');
      s.rod([0, 1.2, 0.6], [0, 5.2, 0.6], 0.07, '#6a4a2a');
      s.rod([0, 1.6, 2.3], [0, 5.8, -1.2], 0.05, '#6a4a2a');
      s.shape([[0, 0], [3.5, 3.9], [-0.5, 3.4]], 0.02, '#f4ead8', [0, 1.7, 2.1], { r: [0, -Math.PI / 2, 0] });
      s.box(0.8, 0.04, 0.4, '#c23b2a', [0, 1.3, 2.0]);
    })],
  };
}

// ───── creatures and craft of the high sky and the canals ─────

/**
 * The starlight whale of the Sky Isles: a sky whale of deep indigo, its back scattered with stars
 * and a constellation traced between them in light. Its head floats, as every creature's does.
 */
function starlightWhale(): Design {
  const len = 34, R = len * 0.14;
  // The body's radius along its length (the sky whale's own profile).
  const prof: Array<[number, number]> = [[-0.5, 0.02], [-0.42, 0.35], [-0.25, 0.7], [0, 1], [0.2, 0.95], [0.3, 0.7]];
  const radius = (zf: number) => {
    for (let i = 1; i < prof.length; i++) if (zf <= prof[i][0]) { const [a, ra] = prof[i - 1], [b, rb] = prof[i]; return R * (ra + ((zf - a) / (b - a)) * (rb - ra)); }
    return R * 0.7;
  };
  const star = (i: number): V3 => {
    const zf = -0.44 + ((i * 0.618) % 1) * 0.66, a = 0.25 + ((i * 0.377) % 1) * 2.6, r = radius(zf) * 1.01;
    return [Math.cos(a) * r, Math.sin(a) * r * 0.85, zf * len];
  };
  const stars = piece((s) => {
    for (let i = 0; i < 70; i++) s.ball(0.1 + (i % 4) * 0.05, i % 5 ? '#fff4c0' : '#bfe8ff', star(i), { glow: true, seg: 5 });
    // A constellation along the back: a few stars joined by threads of light.
    const pts: V3[] = [-0.38, -0.26, -0.14, -0.02, 0.1, 0.2].map((zf, k) => [Math.sin(k * 1.7) * R * 0.3, radius(zf) * 0.86, zf * len]);
    for (let k = 0; k < pts.length; k++) { s.ball(0.3, '#ffffff', pts[k], { glow: true, seg: 6 }); if (k) s.rod(pts[k - 1], pts[k], 0.05, '#bfe8ff', { glow: true }); }
  }, 'body');
  return {
    id: 'starlight-whale', name: 'starlight whale', realm: 'sky', len, speed: 4, alt: [110, 170], radius: [220, 420], bob: 5, bank: 0.05,
    pieces: [...skyWhale('#1a1f4a', '#2e3570', len, '#fff4c0'), stars],
  };
}

/** A cloud galleon: a pale-timbered galleon under sails of cloud, riding a cloud bank. */
function cloudGalleon(): Design {
  const len = 26, beam = 6, GOLD = '#e2b43a', CLOUD = '#ffffff', BLUSH = '#ffe4f0';
  const billow = (s: Shaper, x: number, y: number, z: number, w: number, h: number, c: C) => {
    // A sail of cloud: puffs packed into a bellied rectangle.
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      const u = (i / 4 - 0.5) * w, v = (j / 2 - 0.5) * h, belly = 0.6 * (1 - (2 * u / w) ** 2);
      s.ball(h * 0.28 + ((i + j) % 2) * h * 0.06, c, [x + u, y + v, z + belly], { s: [1, 0.9, 0.55], seg: 8 });
    }
  };
  return {
    id: 'cloud-galleon', name: 'cloud galleon', realm: 'sky', len, speed: 6, alt: [90, 150], radius: [180, 380], bob: 2.5, bank: 0.08,
    pieces: [P((s) => {
      s.hull(len, beam, 2.8, '#e8dcc8', [0, 0, 0], { sheer: 1.6, deck: '#c8b08a' });
      s.box(beam * 0.9, 0.18, len * 0.9, GOLD, [0, 1.35, 0]);
      // The stern castle with lit windows, and a gilded rail.
      s.box(beam * 0.8, 2.4, len * 0.18, '#e8dcc8', [0, 2.4, -len * 0.38]);
      s.box(beam * 0.84, 0.16, len * 0.2, GOLD, [0, 3.65, -len * 0.38]);
      for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) s.box(0.04, 0.6, 0.7, WARM, [sx * beam * 0.41, 2.4, -len * 0.44 + i * 0.95], { glow: true });
      // Three masts, their sails of cloud; a bowsprit.
      for (const [z, h] of [[len * 0.26, 14], [0, 17], [-len * 0.22, 13]] as const) {
        s.cyl(0.18, 0.26, h, '#8a6a4a', [0, 1.4 + h / 2, z], { seg: 6 });
        for (let k = 0; k < 2; k++) {
          const y = 1.4 + h * (0.42 + k * 0.33), w = beam * (1.5 - k * 0.35);
          s.rod([-w / 2, y + h * 0.13, z], [w / 2, y + h * 0.13, z], 0.08, '#8a6a4a');
          billow(s, 0, y, z + 0.4, w, h * 0.26, k ? BLUSH : CLOUD);
        }
        s.shape([[0, 0], [1.8, -0.3], [0, -0.6]], 0.02, '#ff8fb8', [0, 1.4 + h + 0.2, z], { r: [0, Math.PI / 2, 0] });
      }
      s.rod([0, 1.6, len * 0.48], [0, 3.8, len * 0.7], 0.14, '#8a6a4a');
      billow(s, 0, 3.4, len * 0.6, 2.6, 2.2, CLOUD);
      // Lanterns along the rail, and the cloud bank it sails on.
      for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) s.ball(0.16, WARM, [sx * beam * 0.46, 1.7, -len * 0.3 + i * len * 0.09], { glow: true, seg: 6 });
      for (let i = 0; i < 16; i++) {
        const z = -len * 0.5 + (i / 15) * len, x = Math.sin(i * 2.3) * beam * 0.5;
        s.ball(2.2 + (i % 3) * 0.6, i % 4 ? CLOUD : BLUSH, [x, -1.6 - (i % 2) * 0.6, z], { s: [1.3, 0.6, 1], seg: 8 });
      }
    })],
  };
}

/**
 * New Yonder's drone fish: little silver machines that swim the canals in shoals, blue light in
 * their seams, a dorsal fin above the water and a tail that beats. Machines, not creatures — no
 * head, no face.
 */
function droneFish(): Design {
  const len = 1.4, R = 0.24;
  return {
    id: 'drone-fish', name: 'drone fish', realm: 'water', len, speed: 2.6, bob: 0.08, group: { n: 6, spacing: 1.6 },
    pieces: [
      P((s) => {
        s.lathe([[0.02, -len * 0.42], [R * 0.55, -len * 0.3], [R, -len * 0.05], [R * 0.95, len * 0.2], [R * 0.6, len * 0.4], [0.02, len * 0.48]], '#c8ccd4', [0, 0, 0], { s: [0.75, 1, 1], seg: 12 });
        for (const zf of [-0.2, 0.05, 0.3]) s.cyl(R * 0.78 * (1 - Math.abs(zf) * 0.8), R * 0.78 * (1 - Math.abs(zf) * 0.8), 0.03, '#3ae8ff', [0, 0, zf * len], { r: [Math.PI / 2, 0, 0], glow: true, seg: 12 });
        s.shape([[0, 0], [0.34, 0.26], [0.42, 0]], 0.02, '#8a909c', [0, R * 0.85, -0.2], { r: [0, -Math.PI / 2, 0] });
        for (const sx of [-1, 1]) s.box(0.22, 0.02, 0.12, '#8a909c', [sx * R * 0.85, -R * 0.2, len * 0.12], { r: [0, 0, sx * 0.4] });
        s.ball(0.05, '#3ae8ff', [0, R * 0.95, len * 0.18], { glow: true, seg: 5 });
      }),
      P((s) => { s.shape([[0, 0], [0.3, 0.26], [0.22, 0], [0.3, -0.26]], 0.02, '#8a909c', [0, 0, -len * 0.42], { r: [0, Math.PI / 2, 0] }); }, 'tail', [0, 0, -len * 0.4], 0.5),
    ],
  };
}

export const FANTASY_DESIGNS: Record<string, () => Design> = {
  'hover-bike': () => hoverBike('hover-bike', '#f4f6f8', '#3ae8ff'),
  'hover-bike-2': () => hoverBike('hover-bike-2', '#1f1f28', '#ff3ad8'),
  'maglev-pod': () => maglevPod(),
  'cargo-walker': () => cargoWalker(),
  'drone-swarm': () => droneSwarm(),
  'vtol-shuttle': () => vtolShuttle(),
  'steam-ornithopter': () => steamOrnithopter(),
  'brass-tug': () => brassTug(),
  'clockwork-carriage': () => clockworkCarriage(),
  'crystal-sled': () => crystalSled(),
  'solar-sailship': () => solarSailship(),
  'leaf-glider': () => leafGlider(),
  'dandelion-balloon': () => dandelionBalloon(),
  'hover-sled': () => hoverSled(),
  'bubble-sub': () => bubbleSub(),
  'sand-skiff': () => sandSkiff(),
  'starlight-whale': () => starlightWhale(),
  'cloud-galleon': () => cloudGalleon(),
  'drone-fish': () => droneFish(),
};
