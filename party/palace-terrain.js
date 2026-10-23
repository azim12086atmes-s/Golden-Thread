import * as THREE from 'three';
import { MAIN, groundHSL, terrainHeight } from '../great-palace/js/world/layout.js';

// A bounded, coarse mesh of the donor's actual MAIN island terrain. Palace
// structures, terraces and the bridge remain separate authored geometry.
const BOUNDS = Object.freeze({ minX: -5000, maxX: 5000, minZ: -4000, maxZ: 2600 });
const STEP = 40;

function triangleHeight(h00, h10, h01, h11, u, v) {
  // The grid uses (a,c,b) and (b,c,d) faces, so this follows the same diagonal.
  if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
  return h10 * (1 - v) + h01 * (1 - u) + h11 * (u + v - 1);
}

export function createPalaceTerrain(parent) {
  const nx = Math.round((BOUNDS.maxX - BOUNDS.minX) / STEP);
  const nz = Math.round((BOUNDS.maxZ - BOUNDS.minZ) / STEP);
  const width = nx + 1, height = nz + 1, count = width * height;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const heights = new Float32Array(count);

  for (let j = 0; j <= nz; j++) {
    const z = BOUNDS.minZ + j * STEP;
    for (let i = 0; i <= nx; i++) {
      const x = BOUNDS.minX + i * STEP, k = j * width + i;
      const y = terrainHeight(MAIN, x, z);
      heights[k] = y;
      positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = z;
      const [h, s, l] = groundHSL(MAIN, x, z, y);
      const color = new THREE.Color().setHSL(h, s, l);
      colors[k * 3] = color.r; colors[k * 3 + 1] = color.g; colors[k * 3 + 2] = color.b;
    }
  }

  const indices = new Uint16Array(nx * nz * 6);
  let cursor = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * width + i, b = a + 1, c = a + width, d = c + 1;
    indices[cursor++] = a; indices[cursor++] = c; indices[cursor++] = b;
    indices[cursor++] = b; indices[cursor++] = c; indices[cursor++] = d;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const group = new THREE.Group();
  group.name = 'donor-palace-main-terrain';
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'donor-palace-heightfield';
  mesh.receiveShadow = true;
  group.add(mesh);
  parent.add(group);

  function ground(x, z) {
    if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return null;
    const fx = (x - BOUNDS.minX) / STEP, fz = (z - BOUNDS.minZ) / STEP;
    const i = Math.min(nx - 1, Math.floor(fx)), j = Math.min(nz - 1, Math.floor(fz));
    return triangleHeight(
      heights[j * width + i], heights[j * width + i + 1],
      heights[(j + 1) * width + i], heights[(j + 1) * width + i + 1],
      fx - i, fz - j,
    );
  }

  return {
    group,
    ground,
    bounds: BOUNDS,
    dispose() { parent.remove(group); geometry.dispose(); material.dispose(); },
  };
}
