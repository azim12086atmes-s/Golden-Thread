import * as THREE from 'three';
import { GeoBuilder, cyl, sphere } from '../kit';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §10): balloons.
 *
 * `heldBalloon(colour)`: a balloon on a ~1 m string whose lower end is at the group's origin; the game
 * hangs it from a child's free hand and keeps it upright (characters/CharacterModel.ts `holdBalloon`).
 * Tag every mesh `userData.part = 'accessory'`. No faces on balloons.
 *
 * `balloonCluster(g, x, y, z, colours)`: 5–9 balloons on strings tied to a little weight standing at
 * (x, y, z) — house and garden decor (the `balloons` decor item).
 *
 * A proper party balloon: a gently teardrop body with a shine on it, the tied knot at its foot, a
 * ribbon string that curls near the end; the cluster tied to a little weighted bag with ribbon tails.
 */
export function heldBalloon(colour: string): THREE.Group {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: 0.05 });
  const body = new THREE.LatheGeometry([[0.001, 0], [0.05, 0.02], [0.14, 0.08], [0.2, 0.2], [0.21, 0.3], [0.18, 0.4], [0.1, 0.46], [0.001, 0.48]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const ball = new THREE.Mesh(body, mat);
  ball.position.y = 0.84;
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.04, 6), mat);
  knot.position.y = 0.82;
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4).scale(1, 1.6, 0.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }));
  shine.position.set(-0.08, 1.16, 0.17);
  // The ribbon: straight most of the way, curling in its last stretch.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16, curl = Math.max(0, 0.3 - u) / 0.3; pts.push(new THREE.Vector3(Math.sin(u * 30) * 0.03 * curl, u * 0.82, Math.cos(u * 30) * 0.03 * curl)); }
  const string = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.004, 3), new THREE.MeshBasicMaterial({ color: '#f4f0e8' }));
  for (const m of [ball, knot, shine, string]) { m.userData.part = 'accessory'; grp.add(m); }
  return grp;
}

export function balloonCluster(g: GeoBuilder, x: number, y: number, z: number, colours: string[]): void {
  // A little weighted bag, ribbon tails spilling from its neck.
  g.add(new THREE.SphereGeometry(0.14, 8, 6).scale(1, 0.8, 1), '#e8c48a', new THREE.Matrix4().makeTranslation(x, y + 0.1, z));
  cyl(g, 0.04, 0.07, 0.1, '#e8c48a', x, y + 0.2, z, 6);
  for (let i = 0; i < 4; i++) cyl(g, 0.004, 0.004, 0.3, colours[i % colours.length], x + Math.cos(i * 1.6) * 0.1, y, z + Math.sin(i * 1.6) * 0.1, 3);
  const n = Math.min(9, Math.max(5, colours.length));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = 0.25 + (i % 3) * 0.12, h = 1.5 + (i % 4) * 0.18;
    const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
    cyl(g, 0.006, 0.006, h, '#f4f0e8', (x + bx) / 2, y + 0.1, (z + bz) / 2, 3);
    sphere(g, 0.22, colours[i % colours.length], bx, y + 0.1 + h + 0.2, bz, 10, 1.15);
    g.add(new THREE.ConeGeometry(0.025, 0.05, 6), colours[i % colours.length], new THREE.Matrix4().makeTranslation(bx, y + 0.1 + h - 0.05, bz));
  }
}
