import * as THREE from 'three';
import { M, box, cone, cyl, sphere, type GeoBuilder } from './kit';
import type { Zone } from './nature';
import type { RegionId } from './regions';

/**
 * The understory: what grows beneath and between the trees, by land and by ground (owner: "nature
 * models by terrain — shrubs, reeds, lotus, mangroves, alpine flowers"). Reeds and bulrushes at the
 * water's edge, papyrus along the Nile, mangroves on the Gulf, Kerala and Balinese shores, heather,
 * juniper and cotton-grass in the north, alpenrose and edelweiss with gentians on the Alpine slopes,
 * saltbush and desert grass in the sands, ferns in the wet lands, tea bushes in their rows, lavender
 * and rosemary round the Mediterranean, flowering shrubs (hibiscus, azalea, bougainvillea, roses,
 * hydrangea) in each land's own colours, and crystal blooms and cloud puffs on the Sky Isles.
 *
 * Each plant is small, low and sways in the wind; RegionBuilder scatters them with their own seed so
 * the trees and houses stay where they were.
 */
export type Plant =
  | 'reeds' | 'papyrus' | 'mangrove' | 'shrub' | 'bloom' | 'heather' | 'juniper' | 'cottongrass'
  | 'alpenrose' | 'edelweiss' | 'saltbush' | 'tussock' | 'fern' | 'tea' | 'lavender' | 'crystalBloom' | 'cloudPuff';

export interface Understory {
  zones: Partial<Record<Zone, Plant[]>>;
  /** The colours of the land's flowering shrubs. */
  blooms: string[];
  /** Candidate spots tried. */
  count: number;
}

const U = (count: number, blooms: string[], zones: Partial<Record<Zone, Plant[]>>): Understory => ({ count, blooms, zones });
const REEDS: Plant[] = ['reeds', 'reeds', 'tussock'];

export const UNDERSTORY: Record<RegionId, Understory> = {
  desert: U(220, ['#e8b8d8'], { dune: ['saltbush'], sand: ['saltbush', 'tussock', 'tussock'], rock: ['saltbush'], waterside: ['reeds', 'tussock'] }),
  egypt: U(260, ['#f2d27a'], { sand: ['saltbush', 'tussock'], rock: ['saltbush'], waterside: ['papyrus', 'papyrus', 'reeds'], grass: ['tussock', 'saltbush'] }),
  middleeast: U(260, ['#ff6fa8'], { sand: ['saltbush', 'tussock'], rock: ['saltbush'], waterside: ['mangrove', 'mangrove', 'reeds'], grass: ['saltbush', 'bloom'] }),
  aurora: U(300, ['#c83a6a'], { snow: ['cottongrass'], alpine: ['heather', 'juniper'], rock: ['juniper'], waterside: ['cottongrass', 'cottongrass', 'reeds'], grass: ['heather', 'juniper', 'cottongrass'] }),
  norway: U(320, ['#b85aa8'], { snow: ['juniper'], alpine: ['heather', 'heather', 'juniper'], rock: ['juniper', 'heather'], waterside: REEDS, grass: ['fern', 'heather', 'juniper'] }),
  switzerland: U(340, ['#e8342a'], { snow: ['edelweiss'], alpine: ['alpenrose', 'edelweiss', 'alpenrose'], rock: ['alpenrose', 'edelweiss'], waterside: REEDS, grass: ['edelweiss', 'shrub', 'alpenrose'] }),
  skyisles: U(260, ['#c9a0ff', '#8ae8ff', '#ffb8e8'], { cloud: ['crystalBloom', 'cloudPuff', 'bloom'] }),
  indonesia: U(340, ['#e8242a', '#ff8a1f', '#ffd23a'], { waterside: ['mangrove', 'mangrove', 'fern'], grass: ['fern', 'bloom', 'fern'], rock: ['fern'] }),
  indiasouth: U(340, ['#e8242a', '#ff6fa8'], { waterside: ['mangrove', 'reeds'], grass: ['tea', 'tea', 'bloom', 'fern'], rock: ['fern'] }),
  indianorth: U(300, ['#e8347a', '#ff9a1f', '#c83ad8'], { sand: ['saltbush', 'tussock'], grass: ['bloom', 'tussock', 'shrub'], waterside: REEDS, rock: ['saltbush'] }),
  mughal: U(300, ['#e8345a', '#ffffff', '#ffb8c8'], { grass: ['bloom', 'shrub', 'bloom'], waterside: ['reeds', 'bloom'], rock: ['shrub'] }),
  islamic: U(300, ['#c8a0e8', '#ffffff'], { grass: ['lavender', 'shrub', 'bloom'], rock: ['shrub', 'lavender'], waterside: REEDS }),
  renaissance: U(300, ['#8a6ad8'], { grass: ['lavender', 'lavender', 'shrub'], rock: ['juniper', 'lavender'], waterside: REEDS }),
  meadow: U(340, ['#ff8fb8', '#ffd24a', '#c9a0ff'], { grass: ['bloom', 'lavender', 'fern', 'bloom'], waterside: REEDS }),
  japan: U(320, ['#ff7ab8', '#e8345a'], { grass: ['bloom', 'shrub', 'fern'], rock: ['shrub', 'fern'], waterside: ['reeds', 'reeds', 'fern'] }),
  korea: U(320, ['#e85ab8', '#ff9ad8'], { grass: ['bloom', 'bloom', 'fern'], rock: ['shrub', 'juniper'], waterside: REEDS }),
  china: U(320, ['#e8345a', '#ffb8c8'], { grass: ['tea', 'tea', 'bloom', 'fern'], rock: ['fern', 'juniper'], waterside: REEDS }),
  london: U(300, ['#ffd23a', '#b85aa8'], { grass: ['shrub', 'fern', 'heather'], rock: ['heather', 'juniper'], waterside: REEDS }),
  newyork: U(280, ['#ff6fa8', '#ffffff'], { grass: ['shrub', 'bloom', 'tussock'], waterside: REEDS }),
  vintage: U(300, ['#6a8ae8', '#e8a0d8', '#ffffff'], { grass: ['bloom', 'shrub', 'fern'], waterside: REEDS }),
};

/** What grows in this zone of this land (nothing where the land names nothing). */
export function understoryFor(land: RegionId, zone: Zone): Plant[] {
  return UNDERSTORY[land].zones[zone] ?? [];
}

const LEAF = ['#3f7a3a', '#4f8a3a', '#2f6a3a'];

/** Build one plant with its base at (x, y, z), s its size; everything sways from the base. */
export function plant(g: GeoBuilder, kind: Plant, x: number, y: number, z: number, s: number, rnd: () => number, blooms: string[]): number {
  const m = g.mark();
  let h = 1;
  const r = (a: number, b: number) => a + (b - a) * rnd();
  const bloom = () => blooms[Math.floor(rnd() * blooms.length) % blooms.length];
  g.frame(x, y, z, r(0, Math.PI * 2), s, () => {
    switch (kind) {
      case 'reeds': // bulrushes: tall thin blades and brown seed heads
        for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r(0.05, 0.5), t = r(1.2, 2); g.add(new THREE.CylinderGeometry(0.012, 0.025, t, 3).translate(0, t / 2, 0), i % 3 ? '#6a8a3a' : '#8a9a4a', M(Math.cos(a) * d, 0, Math.sin(a) * d, 0, 1, 1, 1, r(-0.15, 0.15), r(-0.15, 0.15))); if (i % 3 === 0) cyl(g, 0.045, 0.045, 0.28, '#6a4226', Math.cos(a) * d, t * 0.82, Math.sin(a) * d, 5); }
        h = 2; break;
      case 'papyrus': // tall green stems each crowned with a burst of fine rays
        for (let i = 0; i < 6; i++) { const a = i * 2.4, d = r(0.05, 0.45), t = r(1.8, 2.8), tx = Math.cos(a) * d * 1.4, tz = Math.sin(a) * d * 1.4; cyl(g, 0.02, 0.035, t, '#4f8a3a', tx, 0, tz, 3); g.add(new THREE.ConeGeometry(0.4, 0.35, 8, 1, true).rotateX(Math.PI), '#7aa84a', M(tx, t + 0.15, tz)); }
        h = 2.8; break;
      case 'mangrove': { // a rounded crown on a trunk that stands on arching stilt roots
        cyl(g, 0.08, 0.12, 1.4, '#5a4a3a', 0, 0.6, 0, 5);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r(-0.2, 0.2), d = r(0.6, 0.9); const pts = [new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(Math.cos(a) * d * 0.5, 0.75, Math.sin(a) * d * 0.5), new THREE.Vector3(Math.cos(a) * d, -0.05, Math.sin(a) * d)]; g.add(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]), 5, 0.035, 3), '#6a5a48'); }
        for (let i = 0; i < 5; i++) sphere(g, r(0.6, 0.9), LEAF[i % 3], r(-0.7, 0.7), r(2, 2.6), r(-0.7, 0.7), 6, 0.7);
        h = 3; break;
      }
      case 'shrub': // a clipped, rounded bush of layered leaf-balls
        for (let i = 0; i < 4; i++) sphere(g, r(0.35, 0.55), LEAF[i % 3], r(-0.35, 0.35), r(0.35, 0.65), r(-0.35, 0.35), 6, 0.85);
        h = 1.1; break;
      case 'bloom': // a flowering shrub: hibiscus, azalea, bougainvillea, roses, hydrangea — the land's colours
        for (let i = 0; i < 4; i++) sphere(g, r(0.35, 0.5), LEAF[i % 3], r(-0.35, 0.35), r(0.35, 0.6), r(-0.35, 0.35), 6, 0.85);
        for (let i = 0; i < 12; i++) { const a = rnd() * Math.PI * 2, e = r(0.1, 1.2); sphere(g, r(0.07, 0.12), bloom(), Math.cos(a) * Math.cos(e) * 0.72, 0.5 + Math.sin(e) * 0.55, Math.sin(a) * Math.cos(e) * 0.72, 4); }
        h = 1.1; break;
      case 'heather': // a low cushion of purple bells
        sphere(g, 0.55, '#4a5a3a', 0, 0.05, 0, 7, 0.45);
        for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, d = r(0, 0.5); cone(g, 0.05, 0.18, i % 3 ? '#9a4a8a' : '#c86ab0', Math.cos(a) * d, 0.18 + (0.5 - d) * 0.3, Math.sin(a) * d, 4); }
        h = 0.45; break;
      case 'juniper': // a dark spreading conifer shrub, blue berries
        for (let i = 0; i < 3; i++) cone(g, r(0.5, 0.75), r(0.8, 1.3), '#2f4a36', r(-0.35, 0.35), 0, r(-0.35, 0.35), 6);
        for (let i = 0; i < 6; i++) sphere(g, 0.04, '#4a5a8a', r(-0.4, 0.4), r(0.3, 0.8), r(-0.4, 0.4), 4);
        h = 1.2; break;
      case 'cottongrass': // tufts of grass with white cotton heads bobbing
        for (let i = 0; i < 7; i++) { const a = i * 2.4, d = r(0, 0.35), t = r(0.4, 0.7); cyl(g, 0.01, 0.015, t, '#8a9a5a', Math.cos(a) * d, 0, Math.sin(a) * d, 3); sphere(g, 0.07, '#fbfbf6', Math.cos(a) * d, t + 0.04, Math.sin(a) * d, 5, 1.3); }
        h = 0.75; break;
      case 'alpenrose': // Rhododendron ferrugineum: glossy dark leaves, clusters of rose-red bells
        for (let i = 0; i < 3; i++) sphere(g, r(0.35, 0.5), '#2f5a2f', r(-0.35, 0.35), r(0.25, 0.45), r(-0.35, 0.35), 6, 0.7);
        for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2, d = r(0.2, 0.6); for (let k = 0; k < 3; k++) cone(g, 0.05, 0.12, i % 2 ? '#e8342a' : '#d8285a', Math.cos(a) * d + (k - 1) * 0.05, 0.62, Math.sin(a) * d, 4); }
        h = 0.8; break;
      case 'edelweiss': { // a scatter of felted white stars and deep-blue gentian trumpets among the grass
        for (let i = 0; i < 5; i++) { const a = i * 2.4, d = r(0.1, 0.6), fx = Math.cos(a) * d, fz = Math.sin(a) * d; cyl(g, 0.015, 0.015, 0.22, '#8a9a7a', fx, 0, fz, 3); for (let k = 0; k < 6; k++) { const b = (k / 6) * Math.PI * 2; g.add(new THREE.BoxGeometry(0.12, 0.012, 0.04), '#f4f4ea', M(fx + Math.cos(b) * 0.06, 0.23, fz + Math.sin(b) * 0.06, -b)); } sphere(g, 0.03, '#e8d88a', fx, 0.24, fz, 4); }
        for (let i = 0; i < 4; i++) { const a = i * 1.7 + 1, d = r(0.2, 0.7); g.add(new THREE.ConeGeometry(0.06, 0.16, 5, 1, true).rotateX(Math.PI), '#2a4ad8', M(Math.cos(a) * d, 0.2, Math.sin(a) * d)); }
        h = 0.3; break;
      }
      case 'saltbush': // a grey-green desert bush, woody at the base
        for (let i = 0; i < 4; i++) cyl(g, 0.015, 0.03, 0.4, '#8a7a5a', r(-0.2, 0.2), 0, r(-0.2, 0.2), 3);
        for (let i = 0; i < 5; i++) sphere(g, r(0.25, 0.4), i % 2 ? '#9aa88a' : '#8a9878', r(-0.45, 0.45), r(0.3, 0.5), r(-0.45, 0.45), 5, 0.7);
        h = 0.8; break;
      case 'tussock': // a fountain of dry grass blades
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, t = r(0.5, 0.9); g.add(new THREE.ConeGeometry(0.03, t, 3).translate(0, t / 2, 0), i % 2 ? '#b8a86a' : '#a8984a', M(0, 0, 0, a, 1, 1, 1, 0.45, 0)); }
        h = 0.8; break;
      case 'fern': // fronds arching out from the crown
        for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + r(-0.2, 0.2); g.add(new THREE.BoxGeometry(0.22, 0.02, 1.1).translate(0, 0, 0.55), i % 2 ? '#3f8a3a' : '#4f9a42', M(0, 0.25, 0, a, 1, 1, 1, -0.45, 0)); }
        h = 0.7; break;
      case 'tea': // a clipped tea bush, flat-topped, bright new leaves on top
        box(g, 1.3, 0.8, 1, '#2f6a32', 0, 0, 0); box(g, 1.34, 0.08, 1.04, '#7ab84a', 0, 0.8, 0);
        h = 0.9; break;
      case 'lavender': // a grey-green mound with purple spikes
        sphere(g, 0.45, '#7a8a6a', 0, 0.05, 0, 6, 0.6);
        for (let i = 0; i < 12; i++) { const a = rnd() * Math.PI * 2, d = r(0, 0.4); cyl(g, 0.01, 0.01, 0.35, '#7a8a6a', Math.cos(a) * d, 0.3, Math.sin(a) * d, 3); g.add(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 4), '#8a6ad8', M(Math.cos(a) * d, 0.72, Math.sin(a) * d)); }
        h = 0.8; break;
      case 'crystalBloom': // Sky Isles: faceted crystal petals on a stalk
        cyl(g, 0.03, 0.04, 0.8, '#8ab8a8', 0, 0, 0, 4);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(new THREE.OctahedronGeometry(0.18).scale(0.6, 1.4, 0.6), bloom(), M(Math.cos(a) * 0.14, 0.9, Math.sin(a) * 0.14, a, 1, 1, 1, 0.5, 0)); }
        h = 1.1; break;
      case 'cloudPuff': // Sky Isles: a little cloud of blossom resting on the ground
        for (let i = 0; i < 4; i++) sphere(g, r(0.3, 0.45), i % 2 ? '#fbf7ff' : '#f0e8ff', r(-0.4, 0.4), r(0.2, 0.4), r(-0.4, 0.4), 6, 0.8);
        for (let i = 0; i < 5; i++) sphere(g, 0.07, bloom(), r(-0.4, 0.4), r(0.5, 0.7), r(-0.4, 0.4), 4);
        h = 0.8; break;
    }
  });
  g.sway(m, y, h * s, kind === 'reeds' || kind === 'papyrus' || kind === 'cottongrass' || kind === 'tussock' ? 1 : 0.4);
  return h * s;
}
