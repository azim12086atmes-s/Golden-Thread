// The crescent world (study thread's world fill, design/world-fill): a 20 km map of
// sea mountains ringing the mainland, with the waterfall gate in the south wall.
// Heights come as a 1024 x 1024 grid of uint16 ((h + 500) * 7), about 20 m per cell,
// and a painted colour map of the same area. Round it lies the outer world (40 m a
// cell, 41 km across, same centre): the great crescent ridge the owner drew, peaks
// near 7.8 km, open to the east. Inside the map it repeats the map's heights.
// Both are loaded once, before the world is built (data/world/world.json).
const N = 1024;
const S = 2.75;
export const CRESCENT_FRAME = { x0: -670 * 6 * S, z0: -490 * 6 * S, span: 1254 * 6 * S, n: N };
const F = CRESCENT_FRAME;
export const OUTER_FRAME = { x0: -709.5 - 20480, z0: 2260.5 - 20480, span: 40960, n: N };

async function load(name) {
  const [hb, img] = await Promise.all([
    fetch(`data/world/${name}-h.bin`).then((r) => r.arrayBuffer()),
    fetch(`data/world/${name}-colour.jpg`).then((r) => r.blob()).then((b) => createImageBitmap(b)),
  ]);
  const q = new Uint16Array(hb), h = new Float32Array(N * N);
  for (let i = 0; i < h.length; i++) h[i] = q[i] / 7 - 500;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, N, N);
  return { h, rgb: g.getImageData(0, 0, N, N).data };
}
const [C, O] = await Promise.all([load('crescent'), load('outer')]);

function cell(x, z, f) {
  const fx = (x - f.x0) / f.span * N - 0.5, fz = (z - f.z0) / f.span * N - 0.5;
  if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return null;
  const i = Math.floor(fx), j = Math.floor(fz);
  return [i, j, fx - i, fz - j];
}
function height(c, h) {
  const [i, j, u, v] = c, o = j * N + i;
  const a = h[o], b = h[o + 1], d = h[o + N], e = h[o + N + 1];
  return a + (b - a) * u + (d - a) * v + (a - b - d + e) * u * v;
}
const rgb = (c, d) => { const o = (c[1] * N + c[0]) * 4; return [d[o] / 255, d[o + 1] / 255, d[o + 2] / 255]; };

// ground height in metres: the map, then the outer world, then open ocean
export function crescentH(x, z) {
  const c = cell(x, z, F);
  if (c) return height(c, C.h);
  return outerH(x, z);
}
export function outerH(x, z) {
  const c = cell(x, z, OUTER_FRAME);
  return c ? height(c, O.h) : -200;
}

// painted ground colour as [r, g, b] 0..1, or null beyond the outer world
export function crescentRGB(x, z) {
  const c = cell(x, z, F);
  return c ? rgb(c, C.rgb) : outerRGB(x, z);
}
export function outerRGB(x, z) {
  const c = cell(x, z, OUTER_FRAME);
  return c ? rgb(c, O.rgb) : null;
}
