import * as THREE from 'three';
import { FOLIAGE_UNIFORMS, WIND_GLSL, WIND_UNIFORMS, swayMaterial } from './wind';

/**
 * Tree foliage, the way games draw lush trees: each crown is a few smooth blobs (slightly
 * translucent, so the branches show faintly inside) covered with leaf cards, small upright
 * pictures of leafy sprigs that stick out of the blob's surface and overlap so the leaves touch.
 * Every card is lit as if it were part of one rounded crown (its normal points out of the blob),
 * glows when the sun is behind it, and flutters in the wind. All the cards of a land are one
 * instanced draw.
 */

/** Numbers per card in GeoBuilder.cards: position, outward normal, size, colour, kind, sway, roll, tilt. */
export const CARD_STRIDE = 14;

/** The leaf pictures (4 × 2 atlas cells): broad, small, needles, blossom; palm frond, bamboo, banana, crystal. */
export const LeafKind = { Broad: 0, Small: 1, Needles: 2, Blossom: 3, Frond: 4, Bamboo: 5, Banana: 6, Crystal: 7 } as const;

function leafAtlas(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const C = 256, c = document.createElement('canvas');
  c.width = C * 4; c.height = C * 2;
  const x = c.getContext('2d')!;
  let seed = 17;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grey = (v: number) => `rgb(${Math.round(v * 0.95)},${Math.round(v)},${Math.round(v * 0.88)})`;
  /** A leaf of length `len` at (lx, ly) pointing along `a`, `wid` wide, with a pale midrib. */
  const leaf = (lx: number, ly: number, len: number, wid: number, a: number, v: number, lobed = false) => {
    x.save(); x.translate(lx, ly); x.rotate(a);
    x.fillStyle = grey(v);
    x.beginPath(); x.moveTo(0, 0);
    if (lobed) {
      for (let i = 0; i <= 6; i++) { const t = i / 6; x.lineTo(t * len, -wid * Math.sin(t * Math.PI) * (i % 2 ? 1 : 0.72)); }
      for (let i = 6; i >= 0; i--) { const t = i / 6; x.lineTo(t * len, wid * Math.sin(t * Math.PI) * (i % 2 ? 1 : 0.72)); }
    } else {
      x.quadraticCurveTo(len * 0.45, -wid, len, 0); x.quadraticCurveTo(len * 0.45, wid, 0, 0);
    }
    x.fill();
    x.strokeStyle = grey(Math.min(255, v + 45)); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.9, 0); x.stroke();
    x.restore();
  };
  const cell = (i: number, draw: (cx: number, cy: number) => void) => {
    x.save(); x.beginPath(); x.rect((i % 4) * C + 4, Math.floor(i / 4) * C + 4, C - 8, C - 8); x.clip();
    draw((i % 4) * C + C / 2, Math.floor(i / 4) * C + C / 2); x.restore();
  };
  // Broad leaves: a full spray of large ovate and lobed leaves, filling the card.
  cell(0, (cx, cy) => {
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * 70;
      leaf(cx + Math.cos(a) * d - Math.cos(a) * 30, cy + Math.sin(a) * d - Math.sin(a) * 30, 46 + r() * 30, 17 + r() * 8, a + (r() - 0.5) * 0.8, 150 + r() * 90, r() < 0.4);
    }
  });
  // Small leaves: many little oval leaves on fine twigs (birch, olive, willow, ginkgo).
  cell(1, (cx, cy) => {
    x.strokeStyle = 'rgb(120,110,95)'; x.lineWidth = 2;
    for (let t = 0; t < 7; t++) { const a = (t / 7) * Math.PI * 2 + r(); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110); x.stroke(); }
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 95;
      leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 20 + r() * 12, 7 + r() * 4, a + (r() - 0.5) * 1.6, 150 + r() * 95);
    }
  });
  // Needles: radiating bundles of fine needles (pines).
  cell(2, (cx, cy) => {
    for (let b = 0; b < 14; b++) {
      const a0 = r() * Math.PI * 2, d = r() * 70, bx = cx + Math.cos(a0) * d, by = cy + Math.sin(a0) * d;
      for (let k = 0; k < 22; k++) {
        const a = a0 + (r() - 0.5) * 2.4, len = 26 + r() * 30;
        x.strokeStyle = grey(140 + r() * 100); x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); x.stroke();
      }
    }
  });
  // Blossom: clusters of five-petalled flowers with gold hearts, a few green leaves between.
  cell(3, (cx, cy) => {
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2, d = r() * 80; leaf(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 34, 12, a, 120 + r() * 40); }
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, d = r() * 100, fx = cx + Math.cos(a) * d, fy = cy + Math.sin(a) * d, pr = 9 + r() * 6;
      for (let k = 0; k < 5; k++) {
        const pa = (k / 5) * Math.PI * 2 + a;
        x.fillStyle = k % 2 ? 'rgb(252,250,248)' : 'rgb(236,232,232)';
        x.beginPath(); x.ellipse(fx + Math.cos(pa) * pr * 0.7, fy + Math.sin(pa) * pr * 0.7, pr * 0.62, pr * 0.46, pa, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = 'rgb(246,200,80)'; x.beginPath(); x.arc(fx, fy, pr * 0.28, 0, Math.PI * 2); x.fill();
    }
  });
  // Palm frond: a rib up the middle, narrow leaflets angled forward along both sides.
  cell(4, (cx, cy) => {
    x.strokeStyle = grey(200); x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx, cy + 124); x.lineTo(cx, cy - 124); x.stroke();
    for (let i = 0; i < 22; i++) {
      const yy = cy + 118 - i * 11;
      for (const sd of [-1, 1]) leaf(cx, yy, 64 + r() * 34 - i * 1.2, 5 + r() * 2, sd < 0 ? Math.PI + 0.55 + (r() - 0.5) * 0.2 : -0.55 + (r() - 0.5) * 0.2, 150 + r() * 80);
    }
  });
  // Bamboo: long narrow lance leaves in fans from a twig.
  cell(5, (cx, cy) => {
    x.strokeStyle = 'rgb(150,150,110)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx - 100, cy + 100); x.lineTo(cx + 60, cy - 60); x.stroke();
    for (let i = 0; i < 16; i++) {
      const t = i / 16, bx = cx - 100 + t * 160, by = cy + 100 - t * 160;
      leaf(bx, by, 90 + r() * 30, 9 + r() * 3, -0.8 + (i % 2 ? 1 : -1) * (0.5 + r() * 0.5), 150 + r() * 90);
    }
  });
  // Banana: one great paddle leaf, parallel veins from the midrib, torn at the edges.
  cell(6, (cx, cy) => {
    x.fillStyle = grey(190);
    x.beginPath(); x.moveTo(cx, cy + 126); x.bezierCurveTo(cx - 118, cy + 60, cx - 118, cy - 70, cx, cy - 126); x.bezierCurveTo(cx + 118, cy - 70, cx + 118, cy + 60, cx, cy + 126); x.fill();
    x.strokeStyle = grey(235); x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy + 126); x.lineTo(cx, cy - 126); x.stroke();
    x.strokeStyle = grey(160); x.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const yy = cy + 110 - i * 9; for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(cx, yy); x.lineTo(cx + sd * 110, yy - 34); x.stroke(); } }
    // Tears: wedges cut in from the edge, along the veins.
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) {
      const yy = cy + 90 - i * 28 - r() * 10, sd = r() < 0.5 ? -1 : 1;
      x.beginPath(); x.moveTo(cx + sd * 120, yy - 30); x.lineTo(cx + sd * (20 + r() * 30), yy - 4); x.lineTo(cx + sd * 120, yy - 26); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
  });
  // Crystal leaves: faceted gem leaves, pale, with bright facet edges.
  cell(7, (cx, cy) => {
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = r() * 80, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, len = 34 + r() * 26, wd = 10 + r() * 6;
      x.save(); x.translate(px, py); x.rotate(a + (r() - 0.5));
      x.fillStyle = grey(200 + r() * 55);
      x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.4, -wd); x.lineTo(len, 0); x.lineTo(len * 0.4, wd); x.closePath(); x.fill();
      x.strokeStyle = 'rgb(255,255,255)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(len, 0); x.moveTo(len * 0.4, -wd); x.lineTo(len * 0.4, wd); x.stroke();
      x.restore();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let blobMat: THREE.MeshStandardMaterial | null = null;
/** The crown clumps: painted as masses of leaves, lit through by the sun, open at their edges. */
export function blobMaterial(): THREE.MeshStandardMaterial {
  return (blobMat ??= swayMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 0.45, true));
}

let cardMat: THREE.MeshLambertMaterial | null = null;
/** The leaf cards' material (one for every land). */
export function cardMaterial(): THREE.MeshLambertMaterial {
  if (cardMat) return cardMat;
  const m = new THREE.MeshLambertMaterial({ map: leafAtlas(), alphaTest: 0.45, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND_UNIFORMS, FOLIAGE_UNIFORMS);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aKind; attribute float aSway; varying float vKind; varying vec3 vCW;
        ${WIND_GLSL}`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vMapUv = (clamp(vMapUv, 0.02, 0.98) + vec2(mod(aKind, 4.0), floor(aKind / 4.0))) * vec2(0.25, 0.5);`)
      .replace('#include <project_vertex>', `
        vKind = aKind;
        vec4 wpC = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vec2 wo = windOffset(wpC.xyz, aSway) * 0.45;
        // A little flutter of each card on top of the branch's sway.
        wo += vec2(sin(uWindTime * 5.3 + wpC.x * 2.1), cos(uWindTime * 4.7 + wpC.z * 1.9)) * 0.035 * aSway * uWindStrength;
        wpC.xz += wo;
        vCW = wpC.xyz;
        vec4 mvPosition = viewMatrix * wpC;
        gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vKind; varying vec3 vCW; uniform vec3 uSunDir; uniform float uLeafNight;`)
      .replace('#include <color_fragment>', `
        vec3 tx = diffuseColor.rgb;
        #ifdef USE_COLOR
          // Blossom cards: only the petals take the tree's colour; leaves and hearts keep their paint.
          float petalW = vKind > 2.5 ? smoothstep(0.7, 0.85, min(tx.r, min(tx.g, tx.b))) : 1.0;
          diffuseColor.rgb = mix(tx * vec3(0.55, 0.85, 0.5), tx * vColor.rgb, petalW);
        #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // Sunlight coming through the leaves, and a soft light within so crowns never go dead-dark.
          float back = pow(max(dot(normalize(vCW - cameraPosition), normalize(uSunDir)), 0.0), 3.0);
          totalEmissiveRadiance += diffuseColor.rgb * (back * 0.55 + 0.1) * (1.0 - uLeafNight);
        }`);
  };
  m.customProgramCacheKey = () => 'leaf-cards';
  return (cardMat = m);
}

/** A 1 × 1 card facing +z, its normals leaning outwards at the corners so a crown shades round. */
function cardGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i) * 0.7, p.getY(i) * 0.7, 1).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

/** All the leaf cards gathered by a GeoBuilder, as one instanced mesh (null if there are none). */
export function leafCardMesh(cards: number[] | null, material: THREE.Material = cardMaterial()): THREE.InstancedMesh | null {
  if (!cards || !cards.length) return null;
  const count = cards.length / CARD_STRIDE;
  const geo = cardGeometry();
  const kind = new Float32Array(count), sway = new Float32Array(count);
  const im = new THREE.InstancedMesh(geo, material, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const z = new THREE.Vector3(0, 0, 1), s = new THREE.Vector3(), c = new THREE.Color(), tAxis = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const o = i * CARD_STRIDE;
    p.set(cards[o], cards[o + 1], cards[o + 2]);
    n.set(cards[o + 3], cards[o + 4], cards[o + 5]).normalize();
    q.setFromUnitVectors(z, n);
    // Roll round the facing, then tilt a little so the crown's outline is ragged with leaves.
    q.multiply(q2.setFromAxisAngle(z, cards[o + 12]));
    tAxis.set(1, 0, 0);
    q.multiply(q2.setFromAxisAngle(tAxis, cards[o + 13]));
    s.setScalar(cards[o + 6]);
    im.setMatrixAt(i, m.compose(p, q, s));
    im.setColorAt(i, c.setRGB(cards[o + 7], cards[o + 8], cards[o + 9]));
    kind[i] = cards[o + 10];
    sway[i] = cards[o + 11];
  }
  geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));
  geo.setAttribute('aSway', new THREE.InstancedBufferAttribute(sway, 1));
  im.computeBoundingSphere();
  return im;
}
