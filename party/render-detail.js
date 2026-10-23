import * as THREE from 'three';

/** Cull bounded garden tiles, then pack visible plants into a few shared draws.
 * Exact transforms/colours and close geometry survive; ground/collision stay independent. */
export function tileGardenInstances(root, tileSize = 160) {
  const names = new Set(['modeled-bed-curbs', 'planted-garden-beds', 'garden-tree-trunks', 'garden-canopy-masses', 'garden-hedges', 'garden-tree-branches']);
  const sources = [];
  root.traverse(o => { if (o.isInstancedMesh && names.has(o.name)) sources.push(o); });
  const tiles = [], batches = [], matrix = new THREE.Matrix4(), position = new THREE.Vector3();
  const coarseCrown = new THREE.SphereGeometry(1, 6, 4), coarseHedge = new THREE.SphereGeometry(1, 6, 3);
  for (const source of sources) {
    const cells = new Map();
    for (let i = 0; i < source.count; i++) {
      source.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
      const key = `${Math.floor(position.x / tileSize)},${Math.floor(position.y / 80)},${Math.floor(position.z / tileSize)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(i);
    }
    source.computeBoundingSphere();
    const coarse = source.name === 'garden-canopy-masses' ? coarseCrown : source.name === 'garden-hedges' ? coarseHedge : null;
    const make = (geometry, suffix) => {
      const mesh = new THREE.InstancedMesh(geometry, source.material, source.count);
      mesh.name = source.name + suffix;
      mesh.position.copy(source.position); mesh.quaternion.copy(source.quaternion); mesh.scale.copy(source.scale);
      mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (source.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(source.count * 3), 3);
      // Per-tile frustum testing happens before packing; no stale dynamic bounds.
      mesh.frustumCulled = false; mesh.count = 0;
      source.parent.add(mesh); return mesh;
    };
    const full = make(source.geometry, '-near'), far = coarse ? make(coarse, '-far') : null;
    const batch = { full, far, tiles: [] }; batches.push(batch);
    source.geometry.computeBoundingSphere();
    for (const indices of cells.values()) {
      const matrices = new Float32Array(indices.length * 16), colours = source.instanceColor ? new Float32Array(indices.length * 3) : null;
      const bounds = new THREE.Box3(), plantSphere = new THREE.Sphere();
      indices.forEach((i, j) => {
        matrices.set(source.instanceMatrix.array.subarray(i * 16, i * 16 + 16), j * 16);
        if (colours) colours.set(source.instanceColor.array.subarray(i * 3, i * 3 + 3), j * 3);
        source.getMatrixAt(i, matrix);
        plantSphere.copy(source.geometry.boundingSphere).applyMatrix4(matrix);
        bounds.expandByPoint(position.copy(plantSphere.center).addScalar(plantSphere.radius));
        bounds.expandByPoint(position.copy(plantSphere.center).addScalar(-plantSphere.radius));
      });
      const sphere = bounds.getBoundingSphere(new THREE.Sphere()); sphere.radius += 4;
      const tile = { sphere, matrices, colours, count: indices.length,
        range: source.name === 'garden-tree-branches' ? 360 : source.name === 'modeled-bed-curbs' ? 900 : Infinity,
        detailed: true, visible: true };
      tiles.push(tile); batch.tiles.push(tile);
      full.instanceMatrix.array.set(matrices, full.count * 16);
      if (colours) full.instanceColor.array.set(colours, full.count * 3);
      full.count += indices.length;
    }
    full.instanceMatrix.needsUpdate = true;
    if (full.instanceColor) full.instanceColor.needsUpdate = true;
    source.removeFromParent(); source.dispose();
  }
  const frustum = new THREE.Frustum(), projection = new THREE.Matrix4();
  const lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity), lastRotation = new THREE.Quaternion();
  const lastProjection = new THREE.Matrix4();
  let lastLight = null;
  return {
    tiles, batches,
    update(camera, light = false) {
      if (lastLight === light && lastProjection.equals(camera.projectionMatrix) && camera.position.distanceToSquared(lastPosition) < 1 && camera.quaternion.angleTo(lastRotation) < .008) return;
      lastPosition.copy(camera.position); lastRotation.copy(camera.quaternion); lastProjection.copy(camera.projectionMatrix); lastLight = light;
      camera.updateMatrixWorld(true);
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (const batch of batches) {
        batch.full.count = 0; if (batch.far) batch.far.count = 0;
        for (const tile of batch.tiles) {
          const distance = camera.position.distanceTo(tile.sphere.center) - tile.sphere.radius;
          tile.visible = distance < tile.range + (tile.visible ? 40 : 0) && frustum.intersectsSphere(tile.sphere);
          if (!tile.visible) continue;
          const edge = light ? 150 : 240;
          tile.detailed = !batch.far || distance < edge + (tile.detailed ? 40 : 0);
          const mesh = tile.detailed ? batch.full : batch.far;
          mesh.instanceMatrix.array.set(tile.matrices, mesh.count * 16);
          if (tile.colours) mesh.instanceColor.array.set(tile.colours, mesh.count * 3);
          mesh.count += tile.count;
        }
        for (const mesh of [batch.full, batch.far]) if (mesh) {
          mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
    },
  };
}
