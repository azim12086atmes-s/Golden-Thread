import * as THREE from 'three';
import { GeoBuilder, M } from '../world/kit';

/**
 * A small modelling kit for the things that travel the lands — vehicles, boats, aircraft and
 * creatures. Every primitive is centred on the point given (unlike the building kit, whose
 * boxes stand on it), may be turned and stretched freely, and goes either into the solid body
 * or into its `glow` (windows, lamps and lights that shine at night).
 *
 * Axes: forward is +z, up is +y, the right-hand side is −x. Origin: on the ground (or the
 * waterline) under the middle of the thing.
 */

export type V3 = [number, number, number];
export interface Opts {
  /** Euler rotation (x, y, z), radians. */
  r?: V3;
  /** Scale (x, y, z). */
  s?: V3;
  /** Into the night glow instead of the solid body. */
  glow?: boolean;
  seg?: number;
}

type C = THREE.ColorRepresentation;

export class Shaper {
  private g = new GeoBuilder();
  private gl = new GeoBuilder();

  add(geo: THREE.BufferGeometry, c: C, p: V3, o: Opts = {}): this {
    const r = o.r ?? [0, 0, 0], s = o.s ?? [1, 1, 1];
    (o.glow ? this.gl : this.g).add(geo, c, M(p[0], p[1], p[2], r[1], s[0], s[1], s[2], r[0], r[2]));
    return this;
  }

  box(w: number, h: number, d: number, c: C, p: V3, o: Opts = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), c, p, o);
  }

  /** A sphere, stretched by `o.s` into an ellipsoid. */
  ball(r: number, c: C, p: V3, o: Opts = {}): this {
    const seg = o.seg ?? 12;
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7))), c, p, o);
  }

  /** A cylinder along y (turn it with `o.r`: [π/2, 0, 0] lays it along +z, top forward). */
  cyl(rTop: number, rBot: number, len: number, c: C, p: V3, o: Opts = {}): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, len, o.seg ?? 10), c, p, o);
  }

  /** A rod from a to b. */
  rod(a: V3, b: V3, r: number, c: C, o: Opts = {}): this {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
    const geo = new THREE.CylinderGeometry(r, r, len, o.seg ?? 6);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    const mid = va.add(vb).multiplyScalar(0.5);
    return this.add(geo, c, [mid.x, mid.y, mid.z], { glow: o.glow });
  }

  cone(r: number, len: number, c: C, p: V3, o: Opts = {}): this {
    return this.add(new THREE.ConeGeometry(r, len, o.seg ?? 10), c, p, o);
  }

  /** A wheel on an axle along x. */
  wheel(r: number, w: number, p: V3, tyre: C = '#1e1e22', hub: C = '#c9ccd6'): this {
    this.cyl(r, r, w, tyre, p, { r: [0, 0, Math.PI / 2], seg: 14 });
    return this.cyl(r * 0.55, r * 0.55, w + 0.02, hub, p, { r: [0, 0, Math.PI / 2], seg: 10 });
  }

  /** A body of revolution along z: `pts` are [radius, z] from tail to nose. */
  lathe(pts: Array<[number, number]>, c: C, p: V3, o: Opts = {}): this {
    const geo = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), o.seg ?? 16);
    geo.rotateX(Math.PI / 2);
    return this.add(geo, c, p, o);
  }

  /** A flat shape in the x–y plane (x across, y up), extruded `depth` along z and centred on it. */
  shape(pts: Array<[number, number]>, depth: number, c: C, p: V3, o: Opts = {}): this {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
    geo.translate(0, 0, -depth / 2);
    return this.add(geo, c, p, o);
  }

  /**
   * A boat's hull: `len` long, `beam` wide, `depth` deep below its deck line, pointed at the
   * bow (+z), fuller at the stern. `sheer` lifts the deck line towards both ends (gondolas,
   * dragon boats); `bluff` (0–1) squares the stern off.
   */
  hull(len: number, beam: number, depth: number, c: C, p: V3, o: Opts & { sheer?: number; bluff?: number; deck?: C } = {}): this {
    const N = 14, K = 8, sheer = o.sheer ?? 0.15, bluff = o.bluff ?? 0.75;
    const pos: number[] = [], deck: number[] = [];
    const sec = (i: number) => {
      const t = i / N, z = -len / 2 + t * len;
      const w = (beam / 2) * (t < 0.4 ? bluff + (1 - bluff) * Math.sin((t / 0.4) * Math.PI / 2) : Math.pow(Math.cos(((t - 0.4) / 0.6) * Math.PI / 2), 0.75));
      const y0 = sheer * Math.pow(2 * t - 1, 2) * (t > 0.5 ? 1.4 : 1);
      const d = depth * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.2 + 0.15) * Math.PI) ** 0.6);
      const ring: V3[] = [];
      for (let k = 0; k <= K; k++) { const a = (k / K) * Math.PI; ring.push([-Math.cos(a) * w, y0 - Math.sin(a) * d, z]); }
      return ring;
    };
    const push = (...v: V3[]) => { for (const q of v) pos.push(...q); };
    let prev = sec(0);
    // The transom: close the stern.
    for (let k = 1; k < K; k++) push(prev[0], prev[k + 1], prev[k]);
    for (let i = 1; i <= N; i++) {
      const cur = sec(i);
      for (let k = 0; k < K; k++) { push(prev[k], cur[k], cur[k + 1]); push(prev[k], cur[k + 1], prev[k + 1]); }
      deck.push(...prev[0], ...prev[K], ...cur[K], ...prev[0], ...cur[K], ...cur[0]);
      prev = cur;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    this.add(geo, c, p, o);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(deck, 3));
    dg.computeVertexNormals();
    return this.add(dg, o.deck ?? c, [p[0], p[1] - 0.02, p[2]], { r: o.r, s: o.s });
  }

  /** The solid body and its glow, merged (either may be null). */
  build(): { solid: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null } {
    const tmp = new THREE.MeshBasicMaterial();
    const s = this.g.build(tmp)?.geometry ?? null, gl = this.gl.build(tmp)?.geometry ?? null;
    tmp.dispose();
    return { solid: s, glow: gl };
  }
}
