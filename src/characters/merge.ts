import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Fewer draw calls for a built figure (a person or an animal): under each group, the leaf meshes
 * that share a material, part tag and shadow settings are merged into one mesh, their placement
 * baked in. Only what never moves by itself is merged — the groups that animate (limbs, head,
 * tail, wings) keep their place and their children merge inside them. `keep` lists what must stay
 * exactly as built; `skip` excludes more (e.g. identity parts).
 */
export function mergeStaticMeshes(root: THREE.Object3D, keep: ReadonlySet<THREE.Object3D>, skip: (m: THREE.Mesh) => boolean = () => false, frozen: ReadonlySet<THREE.Object3D> = new Set()): void {
  // `keep`: never removed (their own code moves them); `frozen`: nothing inside them is touched.
  const parents: THREE.Object3D[] = [];
  root.traverse((o) => { if (o.children.length > 1 && !frozen.has(o)) parents.push(o); });
  for (const parent of parents) {
    const groups = new Map<string, THREE.Mesh[]>();
    for (const c of parent.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || keep.has(m) || m.children.length || Array.isArray(m.material) || !m.visible || skip(m)) continue;
      if (!m.geometry.getAttribute('position') || m.geometry.morphAttributes.position) continue;
      const attrs = Object.keys(m.geometry.attributes).sort().join(',');
      const key = `${m.material.uuid}|${m.userData.part}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}|${m.geometry.index ? 'i' : 'n'}|${attrs}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map((m) => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); });
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      const first = list[0], out = new THREE.Mesh(merged, first.material);
      out.userData.part = first.userData.part;
      out.castShadow = first.castShadow; out.receiveShadow = first.receiveShadow; out.renderOrder = first.renderOrder;
      for (const m of list) parent.remove(m);
      parent.add(out);
    }
  }
}

/** Every Object3D an object holds in its own fields (directly or in arrays): what its code moves. */
export function referencedObjects(owner: object): Set<THREE.Object3D> {
  const out = new Set<THREE.Object3D>();
  for (const v of Object.values(owner)) {
    if (v instanceof THREE.Object3D) out.add(v);
    else if (Array.isArray(v)) for (const x of v) if (x instanceof THREE.Object3D) out.add(x);
  }
  return out;
}
