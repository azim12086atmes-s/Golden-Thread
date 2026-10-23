// Pointed (gothic) arch helpers shared by the palace, landmarks and island arches.
import * as THREE from 'three';

// --- shared shape helpers (also used by the island arches) -----------------------
export function pointedArchShape(w, h, shape = new THREE.Shape()) {
  const hw = w / 2;
  const hs = Math.max(0, h - w * 0.866);
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, hs);
  shape.absarc(-hw, hs, w, 0, Math.PI / 3, false);
  shape.absarc(hw, hs, w, (2 * Math.PI) / 3, Math.PI, false);
  shape.lineTo(-hw, 0);
  return shape;
}

export function pointedArchPath(w, h) {
  const hw = w / 2, hs = Math.max(0, h - w * 0.866);
  const pts = [new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(-hw, hs, 0)];
  for (let i = 1; i <= 12; i++) { const a = Math.PI - (i / 12) * (Math.PI / 3); pts.push(new THREE.Vector3(hw + Math.cos(a) * w, hs + Math.sin(a) * w, 0)); }
  for (let i = 1; i <= 12; i++) { const a = Math.PI / 3 - (i / 12) * (Math.PI / 3); pts.push(new THREE.Vector3(-hw + Math.cos(a) * w, hs + Math.sin(a) * w, 0)); }
  pts.push(new THREE.Vector3(hw, 0, 0));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
}

export function archFrameGeometry(w, h, thick, depth) {
  const outer = pointedArchShape(w + thick * 2, h + thick * 1.2);
  outer.holes.push(new THREE.Path(pointedArchShape(w, h).getPoints(24)));
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}
