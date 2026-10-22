import * as THREE from 'three';

/** Colours for sponge, cream, icing, the upper tier, roses, and piping beads. */
export interface CakePalette { sponge: string; cream: string; icing: string; top: string; rose: string; bead: string }
export const VANILLA: CakePalette = { sponge: '#f3d49a', cream: '#fff8ef', icing: '#fff8ef', top: '#f7b8cc', rose: '#f7b8cc', bead: '#fff8ef' };
export const CHOCOLATE: CakePalette = { sponge: '#5a3322', cream: '#f3e2cf', icing: '#4a2718', top: '#3b1f14', rose: '#e0344f', bead: '#f5c451' };

const GOLD = '#f5c451';
const WEDGE = Math.PI / 4;
const materials = new Map<string, THREE.Material>();

function material(color: string, glow = false): THREE.Material {
  const key = color + glow;
  if (!materials.has(key)) materials.set(key, glow
    ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, side: THREE.DoubleSide }));
  return materials.get(key)!;
}

function cakeMesh(geometry: THREE.BufferGeometry, color: string, glow = false): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material(color, glow));
  result.castShadow = !glow;
  return result;
}

/** A cylinder sector with its two cut faces closed — sponge inside, a cream stripe through it. */
function sector(r: number, h: number, start: number, len: number, outside: string, palette: CakePalette): THREE.Group {
  const result = new THREE.Group();
  result.add(cakeMesh(new THREE.CylinderGeometry(r, r, h, 40, 1, false, start, len), outside));
  for (const angle of [start, start + len]) {
    const face = new THREE.Group();
    const sponge = cakeMesh(new THREE.PlaneGeometry(r, h), palette.sponge);
    sponge.position.x = r / 2;
    const stripe = cakeMesh(new THREE.PlaneGeometry(r * 0.98, h * 0.14), palette.cream);
    stripe.position.set(r / 2, 0, 0.001);
    const stripeBack = stripe.clone();
    stripeBack.position.z = -0.001;
    face.add(sponge, stripe, stripeBack);
    // CylinderGeometry measures theta from +z towards +x; the face plane lies along local +x.
    face.rotation.y = angle - Math.PI / 2;
    result.add(face);
  }
  return result;
}

/** Build the original two-tier cake at unit scale, with its bottom at local y = 0. */
export function buildCake(palette: CakePalette = VANILLA): { cake: THREE.Group; slice: THREE.Group } {
  const cake = new THREE.Group();
  const slice = sector(0.27, 0.17, 0, WEDGE, palette.icing, palette);
  const rest = sector(0.27, 0.17, WEDGE, Math.PI * 2 - WEDGE, palette.icing, palette);
  rest.position.y = 0.17 / 2;
  cake.add(rest);

  // A rose on the slice makes the piece recognisable as it floats.
  const sliceRose = cakeMesh(new THREE.SphereGeometry(0.03, 8, 6), palette.rose);
  sliceRose.position.set(Math.sin(WEDGE / 2) * 0.27 * 0.7, 0.17 / 2 + 0.02, Math.cos(WEDGE / 2) * 0.27 * 0.7);
  slice.add(sliceRose);
  slice.position.y = 0.17 / 2;
  cake.add(slice);

  const upper = cakeMesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 36), palette.top);
  upper.position.y = 0.17 + 0.14 / 2;
  cake.add(upper);
  cake.add(cakeMesh(new THREE.TorusGeometry(0.18 + 0.004, 0.012, 6, 40).rotateX(Math.PI / 2).translate(0, 0.17 + 0.03, 0), GOLD, true));
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const bead = cakeMesh(new THREE.SphereGeometry(0.018, 6, 5), palette.bead);
    bead.position.set(Math.sin(angle) * 0.18, 0.17 + 0.14, Math.cos(angle) * 0.18);
    cake.add(bead);
    if (i % 2) continue;
    const rose = cakeMesh(new THREE.SphereGeometry(0.026, 7, 5), i % 4 ? palette.rose : '#ffffff');
    rose.position.set(Math.sin(angle + 0.2) * (0.27 - 0.02), 0.17 + 0.01, Math.cos(angle + 0.2) * (0.27 - 0.02));
    if (angle > WEDGE) cake.add(rose);
  }
  const star = cakeMesh(new THREE.OctahedronGeometry(0.045), GOLD, true);
  star.position.y = 0.17 + 0.14 + 0.09;
  star.name = 'star';
  star.userData.y = star.position.y;
  cake.add(star);
  return { cake, slice };
}
