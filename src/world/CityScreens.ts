import * as THREE from 'three';
import { GeoBuilder, box, cyl } from './kit';
import { REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { surfaceAt } from './terrain';

/**
 * New Yonder's big screens (owner: "large display screens, TV panels, cyberpunk and solarpunk
 * artifacts"): towers of screens round the plaza like Times Square, panels on poles along the
 * avenues, a curved screen wrapped round a pylon. Each shows moving pictures made in the shader —
 * neon waves, scrolling bars like headlines, drifting blobs of light, a sunrise over solar fields —
 * each screen its own programme; never a face. Brighter at night. Built only in New Yonder.
 */
const SCREEN_VERT = `varying vec2 vUv; attribute float prog; varying float vProg; void main() { vUv = uv; vProg = prog; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SCREEN_FRAG = `
uniform float uTime; uniform float uNight; varying vec2 vUv; varying float vProg;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  vec2 uv = vUv; float t = uTime; vec3 col;
  float p = floor(mod(vProg + floor(t / 12.0), 5.0));
  if (p < 0.5) { // neon waves
    float w = sin(uv.x * 12.0 + t * 2.0) * 0.15 + sin(uv.x * 5.0 - t) * 0.1;
    col = hue(uv.x * 0.3 + t * 0.05) * smoothstep(0.03, 0.0, abs(uv.y - 0.5 - w)) * 2.0 + vec3(0.05, 0.02, 0.12);
  } else if (p < 1.5) { // headlines scrolling
    float row = floor(uv.y * 6.0); float x = fract(uv.x * 3.0 + t * (0.2 + mod(row, 3.0) * 0.1));
    float bar = step(0.15, fract(uv.y * 6.0)) * step(fract(uv.y * 6.0), 0.75) * step(0.2, x) * step(x, 0.2 + 0.6 * fract(sin(row * 7.1) * 43.7));
    col = mix(vec3(0.02, 0.03, 0.08), hue(0.55 + row * 0.07), bar);
  } else if (p < 2.5) { // blobs of light drifting
    col = vec3(0.04, 0.0, 0.08);
    for (int i = 0; i < 4; i++) { float fi = float(i); vec2 c = vec2(0.5 + 0.35 * sin(t * 0.4 + fi * 1.7), 0.5 + 0.3 * cos(t * 0.5 + fi * 2.3)); col += hue(fi * 0.23 + t * 0.03) * 0.06 / (length(uv - c) + 0.05); }
  } else if (p < 3.5) { // sunrise over solar fields
    float sky = smoothstep(0.35, 1.0, uv.y); vec3 s = mix(vec3(1.0, 0.55, 0.3), vec3(0.3, 0.6, 1.0), sky);
    float sun = smoothstep(0.12, 0.1, length(uv - vec2(0.5, 0.35 + 0.1 * sin(t * 0.2))));
    float rows = step(uv.y, 0.35) * step(0.5, fract((uv.x - 0.5) / (0.4 - uv.y + 0.02) * 2.0 + t * 0.1));
    col = s + sun * vec3(1.0, 0.9, 0.5) - rows * 0.5 * vec3(0.8, 0.7, 0.2);
  } else { // a mosaic of colour tiles flipping
    vec2 cell = floor(uv * vec2(12.0, 7.0)); float r = fract(sin(dot(cell, vec2(12.9, 78.2)) + floor(t * 1.5)) * 43758.5);
    col = hue(r) * (0.4 + 0.6 * step(0.5, r));
  }
  col *= 0.7 + uNight * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`;

export class CityScreens {
  readonly group = new THREE.Group();
  readonly material = new THREE.ShaderMaterial({ vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG, uniforms: { uTime: { value: 0 }, uNight: { value: 0 } }, toneMapped: false });
  private land: RegionId | null = null;

  constructor(private solid: THREE.Material) {}

  update(t: number, land: RegionId, night: number): void {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uNight.value = night;
    if (land === this.land) return;
    this.land = land;
    for (const ch of [...this.group.children]) { this.group.remove(ch); ch.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); }
    if (land === 'newyork') this.build();
  }

  private build(): void {
    const c = regionCenter(REGION_BY_ID.newyork), frame = new GeoBuilder();
    const screens: THREE.BufferGeometry[] = [];
    let prog = 0;
    /** A screen w × h, its centre at (x, y, z), facing along ry. */
    const screen = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const geo = new THREE.PlaneGeometry(w, h);
      geo.setAttribute('prog', new THREE.BufferAttribute(new Float32Array(4).fill(prog++), 1));
      geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
      screens.push(geo);
    };
    const H = (x: number, z: number) => surfaceAt(c.x + x, c.z + z, 1e9);
    // Screen towers round the plaza, each stacking three screens, facing the centre.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6, r = 56, x = Math.cos(a) * r, z = Math.sin(a) * r, y = H(x, z), ry = Math.atan2(-x, -z);
      const px = c.x + x, pz = c.z + z;
      frame.frame(px, y, pz, ry, 1, () => {
        box(frame, 9.4, 22, 1.2, '#2a2a34', 0, 0, -0.7);
        for (let k = 0; k < 6; k++) box(frame, 9.6, 0.15, 0.2, '#4ad8ff', 0, 3 + k * 3.4, 0.02);
        box(frame, 10, 0.6, 1.6, '#1f1f28', 0, 22, -0.6);
        for (let k = 0; k < 5; k++) box(frame, 1.8, 0.1, 1.2, '#2a3a6a', -3.6 + k * 1.8, 22.6, -0.6); // solar panels on top
      });
      screen(8.6, 5, px + Math.sin(ry) * 0.02, y + 6, pz + Math.cos(ry) * 0.02, ry);
      screen(8.6, 5, px + Math.sin(ry) * 0.02, y + 11.8, pz + Math.cos(ry) * 0.02, ry);
      screen(8.6, 4, px + Math.sin(ry) * 0.02, y + 17.2, pz + Math.cos(ry) * 0.02, ry);
    }
    // Panels on poles along the avenues, facing the traffic both ways.
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) for (const d of [80, 110, 170, 200]) {
      const x = ax * d + az * 12, z = az * d - ax * 12, y = H(x, z), ry = Math.atan2(ax, az);
      cyl(frame, 0.15, 0.2, 5, '#3a3a44', c.x + x, y, c.z + z, 8);
      frame.frame(c.x + x, y + 5.9, c.z + z, ry, 1, () => box(frame, 3.6, 2.2, 0.25, '#2a2a34', 0, -1.1, 0));
      for (const s of [1, -1]) screen(3.3, 1.9, c.x + x + Math.sin(ry) * 0.14 * s, y + 5.9, c.z + z + Math.cos(ry) * 0.14 * s, s > 0 ? ry : ry + Math.PI);
    }
    // A curved screen wrapped round a pylon by the plaza.
    const px = c.x + 42, pz = c.z - 42, py = H(42, -42);
    cyl(frame, 3, 3.2, 26, '#2a2a34', px, py, pz, 24);
    const wrap = new THREE.CylinderGeometry(3.05, 3.05, 8, 32, 1, true, 0, Math.PI * 1.4);
    wrap.setAttribute('prog', new THREE.BufferAttribute(new Float32Array(wrap.getAttribute('position').count).fill(prog++), 1));
    wrap.translate(px, py + 16, pz);
    screens.push(wrap);
    cyl(frame, 3.3, 3.3, 0.3, '#4ad8ff', px, py + 12, pz, 24); cyl(frame, 3.3, 3.3, 0.3, '#4ad8ff', px, py + 20, pz, 24);
    const f = frame.build(this.solid);
    if (f) this.group.add(f);
    // All the screens in one draw (merge by concatenating).
    const merged = mergeScreens(screens);
    this.group.add(new THREE.Mesh(merged, this.material));
  }
}

function mergeScreens(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of parts) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), prog = new Float32Array(n);
  let o = 0;
  for (const g of parts) {
    const p = g.getAttribute('position'), u = g.getAttribute('uv'), q = g.getAttribute('prog');
    for (let i = 0; i < p.count; i++) { pos.set([p.getX(i), p.getY(i), p.getZ(i)], (o + i) * 3); uv.set([u.getX(i), u.getY(i)], (o + i) * 2); prog[o + i] = q.getX(i); }
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('prog', new THREE.BufferAttribute(prog, 1));
  return out;
}
