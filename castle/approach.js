// The Grand Approach: the arrival dais, a humpback bridge over the Lotus Pond, and
// one dead-straight avenue on the castle's axis, lined with big lush trees and
// lamps, rising on a pink marble viaduct over the lake to the stair-foot pool.
// The castle stands at the end of it the whole way.
import * as THREE from 'three';
import { Kit, kitMaterials, box, cyl, lathe, waterMaterial, haloPoints } from './kit.js';
import { giantTrees } from './nature.js';
import { rng } from './textures.js';
import { AXIS, AXIS_LINE, POND, ARRIVAL, addCollider, groundAt } from './layout.js';

const MARBLE = '#f6dce8', ROSE = '#e7a9c0', PAVE = '#efe0ea';

export function createApproach(scene, preset) {
  const low = preset.grass < 4000;
  const K = new Kit(), group = new THREE.Group(), r = rng(515);
  const S = AXIS_LINE.samples, hw = AXIS.hw;
  const ground = (x, z) => groundAt(x, z, 0) ?? 0;
  // natural ground under the deck (the deck itself counts as built ground)
  const below = (z) => Math.min(ground(hw + 3, z), ground(-hw - 3, z));

  // --- the paved deck and its parapets -----------------------------------------------
  {
    const pos = [], uv = [];
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1];
      pos.push(-hw, a.y + 0.05, a.z, hw, a.y + 0.05, a.z, hw, b.y + 0.05, b.z, -hw, a.y + 0.05, a.z, hw, b.y + 0.05, b.z, -hw, b.y + 0.05, b.z);
      uv.push(0, a.s / 4, hw / 2, a.s / 4, hw / 2, b.s / 4, 0, a.s / 4, hw / 2, b.s / 4, 0, b.s / 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    K.add('plain', g, PAVE);
    // a gold-edged rose runner down the middle
    const run = g.clone(), rp = run.attributes.position;
    for (let i = 0; i < rp.count; i++) { rp.setX(i, Math.sign(rp.getX(i)) * 2.2); rp.setY(i, rp.getY(i) + 0.04); }
    K.add('plain', run, '#d77fa6');
    for (const sd of [-1, 1]) {
      const e = g.clone(), ep = e.attributes.position;
      for (let i = 0; i < ep.count; i++) { ep.setX(i, ep.getX(i) < 0 ? (sd > 0 ? 2.2 : -2.6) : (sd > 0 ? 2.6 : -2.2)); ep.setY(i, ep.getY(i) + 0.05); }
      K.add('gold', e);
    }
    // continuous balustrade: plinth, rail and a balustre every 1.2 m
    for (const sd of [-1, 1]) {
      const cp = [];
      const prof = [[hw, 0], [hw, 1.1], [hw + 0.7, 1.1], [hw + 0.7, -1.6]];
      for (let i = 0; i < S.length - 1; i++) {
        const A = prof.map(([o, y]) => [sd * o, S[i].y + y, S[i].z]), B = prof.map(([o, y]) => [sd * o, S[i + 1].y + y, S[i + 1].z]);
        for (let k = 0; k < prof.length - 1; k++) {
          if (sd > 0) cp.push(...A[k], ...A[k + 1], ...B[k + 1], ...A[k], ...B[k + 1], ...B[k]);
          else cp.push(...A[k], ...B[k + 1], ...A[k + 1], ...A[k], ...B[k], ...B[k + 1]);
        }
      }
      const b = new THREE.BufferGeometry();
      b.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      b.computeVertexNormals();
      K.add('cloth', b, MARBLE);
    }
    // rails stop people stepping off where the deck stands above the ground
    for (let i = 0; i < S.length - 1; i += 6) {
      const a = S[i], b = S[Math.min(S.length - 1, i + 6)];
      if (Math.min(a.y, b.y) - below((a.z + b.z) / 2) < 1.5) continue;
      for (const sd of [-1, 1]) addCollider({ minX: sd > 0 ? hw - 0.2 : -hw - 0.8, maxX: sd > 0 ? hw + 0.8 : -hw + 0.2, minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) + 3 });
    }
  }

  // --- the viaduct: piers and round arches down to the land and the lake bed ----------
  {
    const span = 26, z0 = AXIS.pts[AXIS.pts.length - 1][1], z1 = AXIS.ground;
    const deckAt = (z) => { let best = S[0]; for (const s of S) if (Math.abs(s.z - z) < Math.abs(best.z - z)) best = s; return best.y; };
    for (let z = z0; z < z1; z += span) {
      const za = z, zb = Math.min(z1, z + span), ya = deckAt(za), yb = deckAt(zb);
      const bot = Math.min(below(za), below(zb), below((za + zb) / 2)) - 4;
      if (Math.max(ya, yb) - bot < 6) continue;
      // one arched panel through the full deck width, so the arches read from both sides
      const sh = new THREE.Shape([new THREE.Vector2(za, bot), new THREE.Vector2(zb, bot), new THREE.Vector2(zb, yb - 0.6), new THREE.Vector2(za, ya - 0.6)]);
      const w = zb - za - 6, top = Math.min(ya, yb) - 4, rad = w / 2, spring = Math.max(bot + 2, top - rad);
      if (w > 4 && spring + rad < top + 0.5) {
        const hole = new THREE.Path();
        hole.moveTo(za + 3, bot - 0.01); hole.lineTo(zb - 3, bot - 0.01); hole.lineTo(zb - 3, spring);
        hole.absarc((za + zb) / 2, spring, rad, 0, Math.PI, false); hole.lineTo(za + 3, bot - 0.01);
        sh.holes.push(hole);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: hw * 2 - 1, bevelEnabled: false, curveSegments: 10 });
      g.rotateY(-Math.PI / 2).translate(hw - 0.5, 0, 0);
      K.add('plain', g, ROSE);
      // a white cornice band and a gold string course at deck level
      K.add('plain', box(hw * 2 + 1.6, 1, zb - za, 0, Math.min(ya, yb) - 1.6, (za + zb) / 2), MARBLE);
      // a lamp glow under each arch
      if (w > 4) K.glow(0, spring + rad * 0.6, (za + zb) / 2, 10);
      addCollider({ minX: -hw, maxX: hw, minZ: za - 0.1, maxZ: za + 3, y0: bot, y1: ya - 2 });
    }
  }

  // --- the arrival dais --------------------------------------------------------------
  {
    const { x, z, y, r: R } = ARRIVAL;
    K.frame();
    K.add('plain', cyl(R + 1.2, R + 2.5, 3, 40, x, y - 3, z), MARBLE);
    K.add('plain', cyl(R, R, 0.2, 40, x, y - 0.15, z), PAVE);
    K.add('gold', new THREE.TorusGeometry(R - 1.2, 0.18, 4, 48).rotateX(Math.PI / 2).translate(x, y + 0.08, z));
    K.add('gold', new THREE.TorusGeometry(R * 0.5, 0.14, 4, 36).rotateX(Math.PI / 2).translate(x, y + 0.08, z));
    // a ring of slim lamp columns with glowing orbs
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.31, lx = x + Math.cos(a) * (R + 0.4), lz = z + Math.sin(a) * (R + 0.4);
      if (Math.abs(Math.cos(a)) < 0.25 && Math.sin(a) < 0) continue;               // open towards the castle
      K.add('plain', lathe([[0.6, 0], [0.45, 0.4], [0.3, 0.6], [0.28, 5], [0.5, 5.3], [0, 5.4]], 8).translate(lx, y, lz), MARBLE);
      K.add('glow', new THREE.SphereGeometry(0.55, 10, 8).translate(lx, y + 6, lz), '#ffe2b0');
      K.glow(lx, y + 6, lz, 5);
    }
  }

  // --- the Lotus Pond and its humpback bridge ---------------------------------------
  const pondMat = waterMaterial(0.12);
  {
    const { x, z, y, r: R } = POND;
    group.add(new THREE.Mesh(new THREE.CircleGeometry(R + 1, 48).rotateX(-Math.PI / 2).translate(x, y, z), pondMat));
    K.frame();
    K.add('plain', new THREE.TorusGeometry(R + 1.2, 0.9, 6, 64).rotateX(Math.PI / 2).translate(x, y + 0.2, z), MARBLE);
    // the bridge's arched sides, following the deck's hump
    const seg = S.filter((s) => Math.abs(s.z - z) <= R + 4);
    for (const sd of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(seg[0].z, y - 3), ...seg.map((s) => new THREE.Vector2(s.z, s.y - 0.2)), new THREE.Vector2(seg[seg.length - 1].z, y - 3)]);
      const hole = new THREE.Path(), rad = R * 0.62;
      hole.moveTo(z - rad, y - 3.01); hole.lineTo(z - rad, y - 0.5); hole.absarc(z, y - 0.5, rad, Math.PI, 0, true); hole.lineTo(z + rad, y - 3.01);
      sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false, curveSegments: 16 });
      g.rotateY(-Math.PI / 2).translate(sd * (hw + 0.2) + 0.6, 0, 0);
      K.add('plain', g, ROSE);
    }
    // lotus pads and glowing lotus flowers
    for (let i = 0; i < (low ? 26 : 44); i++) {
      const a = r() * Math.PI * 2, d = 6 + Math.sqrt(r()) * (R - 8), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (Math.abs(px - x) < hw + 2) continue;
      const pr = 1 + r() * 1.4;
      K.add('plain', new THREE.CircleGeometry(pr, 10, 0.4, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2).translate(px, y + 0.06, pz), '#3f8a5a');
      if (r() < 0.45) {
        K.add('glow', new THREE.ConeGeometry(0.5, 0.7, 6, 1, true).rotateX(Math.PI).translate(px, y + 0.5, pz), r() < 0.5 ? '#ff9fd0' : '#ffd6f0');
        K.glow(px, y + 0.6, pz, 2.5);
      }
    }
  }

  // --- lamps all the way along the deck ---------------------------------------------
  for (let i = 0; i < S.length; i += 9) {
    const s = S[i];
    if (Math.abs(s.z - POND.z) < POND.r) continue;
    for (const sd of [-1, 1]) {
      const lx = sd * (hw - 0.3);
      K.add('plain', lathe([[0.35, 0], [0.22, 0.3], [0.16, 4.2], [0.3, 4.4], [0, 4.5]], 6).translate(lx, s.y + 1.1, s.z), '#3a2a48');
      K.add('glow', new THREE.SphereGeometry(0.4, 8, 6).translate(lx, s.y + 5.9, s.z), '#ffd49a');
      K.glow(lx, s.y + 5.9, s.z, 4);
    }
  }

  // --- big lush trees lining the avenue, crowns framing the path ------------------------
  const spots = [];
  const tree = (x, z, deckY, inner) => {
    const g = ground(x, z);
    if (g < 1) return;                                             // not in the water
    const crownY = deckY + (inner ? 18 : 26) + r() * 6;
    const sc = inner ? 17 + r() * 4 : 22 + r() * 6;
    spots.push({ x, y: g, z, h: Math.max(14, crownY - g - sc * 0.2), sc, w: inner ? 3.4 + r() : 4.5 + r() * 1.5, pink: r() < 0.08 });
  };
  for (let i = 0; i < S.length; i += low ? 13 : 10) {
    const s = S[i];
    if (Math.abs(s.z - POND.z) < POND.r + 8 || Math.abs(s.z - ARRIVAL.z) < ARRIVAL.r + 6) continue;
    for (const sd of [-1, 1]) {
      tree(sd * (hw + 38 + r() * 5), s.z + (r() - 0.5) * 4, s.y, true);
      if (!low && i % 20 === 0) tree(sd * (hw + 72 + r() * 12), s.z + (r() - 0.5) * 10, s.y, false);
    }
  }
  // a ring of trees round the pond
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    const x = POND.x + Math.cos(a) * (POND.r + 14), z = POND.z + Math.sin(a) * (POND.r + 14);
    if (Math.abs(x) < 38) continue;
    tree(x, z, POND.y, true);
  }
  giantTrees(group, spots, preset);

  const mats = kitMaterials();
  K.build(mats, group, 'approach');
  const halos = haloPoints(K.glows, [1, 0.85, 0.7]);
  group.add(halos);
  scene.add(group);
  return {
    update(t) {
      mats.update();
      halos.material.uniforms.uTime.value = t;
      pondMat.uniforms.uTime.value = t;
    },
  };
}

