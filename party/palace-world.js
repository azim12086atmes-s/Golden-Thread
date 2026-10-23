import * as THREE from 'three';
import { createPalace } from '../great-palace/js/world/palace.js';
import { createApproach } from '../great-palace/js/world/approach.js';
import { createPalaceGardens } from '../great-palace/js/world/palace-gardens.js';
import { createSkyBridge } from '../great-palace/js/world/skybridge.js';
import {
  builtHeight, COLLIDERS, addPad, CAUSEWAY, B20, BRANCHES,
} from '../great-palace/js/world/layout.js';
import { MOOD } from '../great-palace/js/world/sky.js';
import { createPalaceTerrain } from './palace-terrain.js';

// Golden Thread coordinates preserve every original region. The donor palace is
// appended in its measured world units, below the original game's highlands.
export const PALACE_WORLD_OFFSET = Object.freeze({ x: 0, y: -600, z: -8000 });
const BRIDGE = Object.freeze({ x: -355, z: 6420, halfLength: 4019.7, halfWidth: 11, angle: -1.65931, y: 688 });

export function sourceToWorld(point) {
  return new THREE.Vector3(point.x + PALACE_WORLD_OFFSET.x, point.y + PALACE_WORLD_OFFSET.y, point.z + PALACE_WORLD_OFFSET.z);
}

export function worldToSource(point) {
  return new THREE.Vector3(point.x - PALACE_WORLD_OFFSET.x, point.y - PALACE_WORLD_OFFSET.y, point.z - PALACE_WORLD_OFFSET.z);
}

function bridgeLocal(x, z) {
  const dx = x - BRIDGE.x, dz = z - BRIDGE.z, c = Math.cos(BRIDGE.angle), s = Math.sin(BRIDGE.angle);
  return { u: dx * c - dz * s, v: dx * s + dz * c };
}

function obsoleteRoadZone(z) {
  return z >= CAUSEWAY.z0 - 8 && z <= B20.z + B20.r + 12;
}

function sourceColliderCenter(c) {
  return c.z !== undefined ? c.z : (c.minZ + c.maxZ) / 2;
}

export function createPalaceWorld(scene, quality, { clearRoof, onReady } = {}) {
  const group = new THREE.Group();
  group.name = 'golden-thread-palace-world';
  group.position.set(PALACE_WORLD_OFFSET.x, PALACE_WORLD_OFFSET.y, PALACE_WORLD_OFFSET.z);
  scene.add(group);

  let palace = null, approach = null, gardens = null, skyBridge = null, terrain = null;
  let routeColliders = [];
  const sourceCamera = new THREE.PerspectiveCamera();

  function ensurePalace() {
    if (palace) return;
    terrain = createPalaceTerrain(group);
    palace = createPalace(group, quality);
    const beforeApproach = new Set(COLLIDERS);
    const originalBranches = BRANCHES.splice(0, BRANCHES.length);
    try {
      approach = createApproach(group, quality);
    } finally {
      BRANCHES.push(...originalBranches);
    }
    // Keep the donor's actual palace and terrace obstacles. Its buried causeway,
    // pavilion and unrelated island-branch obstacles are outside this integration.
    const added = COLLIDERS.filter(c => !beforeApproach.has(c));
    routeColliders = added.filter(c => obsoleteRoadZone(sourceColliderCenter(c)));
    if (routeColliders.length) {
      const omitted = new Set(routeColliders);
      for (let i = COLLIDERS.length - 1; i >= 0; i--) if (omitted.has(COLLIDERS[i])) COLLIDERS.splice(i, 1);
    }
    gardens = createPalaceGardens(group, quality, { clearRoof: clearRoof || palace.roofGardenClear });
    onReady?.({ palace, approach, gardens });
  }

  function ensureBridge() {
    if (skyBridge) return;
    skyBridge = createSkyBridge(group, quality);
    // Skybridge geometry is authored outside layout.js; register its deck as a
    // true elevated walkable rectangle so Golden Thread ground/collision agree.
    addPad({ x: BRIDGE.x, z: BRIDGE.z, hw: BRIDGE.halfLength, hd: BRIDGE.halfWidth, a: BRIDGE.angle, y: BRIDGE.y, y0: 640 });
  }

  function ground(x, z, fromY = Infinity) {
    const q = worldToSource({ x, y: fromY, z });
    if (Math.hypot(q.x, q.z) < 5200) ensurePalace();
    const b = bridgeLocal(q.x, q.z);
    if (Math.abs(b.u) <= BRIDGE.halfLength && Math.abs(b.v) <= BRIDGE.halfWidth && q.y >= 640) {
      ensureBridge();
      return BRIDGE.y + PALACE_WORLD_OFFSET.y;
    }
    // The original causeway is intentionally omitted: the independent Golden
    // Thread regions and its elevated SkyBridge remain the only route below.
    if (obsoleteRoadZone(q.z)) return null;
    const h = builtHeight(q.x, q.z, q.y);
    if(h!==null&&h!==undefined)return h+PALACE_WORLD_OFFSET.y;
    const base=terrain?.ground(q.x,q.z);
    return base===null||base===undefined?null:base+PALACE_WORLD_OFFSET.y;
  }

  function resolve(position, radius = 0.5) {
    const q = worldToSource(position);
    if (Math.hypot(q.x, q.z) < 5200) ensurePalace();
    const pad = radius;
    for (const c of COLLIDERS) {
      if (c.y0 !== undefined && q.y < c.y0 - 1) continue;
      if (c.y1 !== undefined && q.y > c.y1) continue;
      if (c.r !== undefined) {
        const dx = q.x - c.x, dz = q.z - c.z, min = c.r + pad, d = Math.hypot(dx, dz);
        if (d < min && d > 1e-4) { q.x = c.x + dx / d * min; q.z = c.z + dz / d * min; }
      } else if (q.x > c.minX - pad && q.x < c.maxX + pad && q.z > c.minZ - pad && q.z < c.maxZ + pad) {
        const choices = [[c.minX - pad - q.x, 0], [c.maxX + pad - q.x, 0], [0, c.minZ - pad - q.z], [0, c.maxZ + pad - q.z]];
        choices.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        q.x += choices[0][0]; q.z += choices[0][1];
      }
    }
    // The raised bridge's side rails are solid, with open ends for the walk-on.
    const local = bridgeLocal(q.x, q.z), safeU = Math.max(-BRIDGE.halfLength, Math.min(BRIDGE.halfLength, local.u));
    if (q.y >= BRIDGE.y - 1 && q.y <= BRIDGE.y + 3 && Math.abs(local.v) < BRIDGE.halfWidth + radius && Math.abs(local.u) < BRIDGE.halfLength - 2) {
      if (Math.abs(local.v) > BRIDGE.halfWidth - radius) {
        const insideEdge = Math.max(0, BRIDGE.halfWidth - radius), outsideEdge = BRIDGE.halfWidth + radius;
        const target = Math.abs(local.v) <= BRIDGE.halfWidth ? insideEdge : outsideEdge;
        local.v = Math.sign(local.v) * target;
      }
      const c = Math.cos(BRIDGE.angle), s = Math.sin(BRIDGE.angle);
      q.x = BRIDGE.x + safeU * c + local.v * s;
      q.z = BRIDGE.z - safeU * s + local.v * c;
    }
    const w = sourceToWorld(q);
    position.x = w.x; position.z = w.z;
    return position;
  }

  function update(t, dt, camera, night) {
    if (night !== undefined && MOOD?.night) MOOD.night.value = Math.max(0, Math.min(1, night));
    if (!camera?.position) return;
    const q = worldToSource(camera.position);
    const palaceDistance = Math.hypot(q.x, q.z);
    const bridgePoint = bridgeLocal(q.x, q.z);
    const nearBridge = Math.abs(bridgePoint.u) < BRIDGE.halfLength + 500 && Math.abs(bridgePoint.v) < 1200;
    if (palaceDistance < 5200) ensurePalace();
    if (nearBridge) ensureBridge();
    sourceCamera.position.copy(q);
    skyBridge?.update();
    palace?.update(t, dt, sourceCamera);
    approach?.update(t, dt, sourceCamera);
    gardens?.update(t, sourceCamera);
  }

  return {
    group,
    get palace() { return palace; },
    get approach() { return approach; },
    get gardens() { return gardens; },
    get skyBridge() { return skyBridge; },
    get terrain() { return terrain; },
    sourceToWorld,
    worldToSource,
    ground,
    resolve,
    update,
  };
}
