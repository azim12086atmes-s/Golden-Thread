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
 * PLACEHOLDERS: a sphere on a thin string; a cluster of them.
 */
export function heldBalloon(colour: string): THREE.Group {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: 0.05 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10).scale(1, 1.18, 1), mat);
  ball.position.y = 1.02;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.8, 4).translate(0, 0.4, 0), new THREE.MeshBasicMaterial({ color: '#f4f0e8' }));
  for (const m of [ball, string]) { m.userData.part = 'accessory'; grp.add(m); }
  return grp;
}

export function balloonCluster(g: GeoBuilder, x: number, y: number, z: number, colours: string[]): void {
  cyl(g, 0.12, 0.14, 0.12, '#b8a88a', x, y, z, 8);
  const n = Math.min(9, Math.max(5, colours.length));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = 0.25 + (i % 3) * 0.12, h = 1.5 + (i % 4) * 0.18;
    const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
    cyl(g, 0.006, 0.006, h, '#f4f0e8', (x + bx) / 2, y + 0.1, (z + bz) / 2, 3);
    sphere(g, 0.22, colours[i % colours.length], bx, y + 0.1 + h + 0.2, bz, 10, 1.15);
  }
}
