import * as THREE from 'three';
import { PERSON_BY_ID, residentsOf } from '../charity/charity';
import { CharacterModel } from '../characters/CharacterModel';
import type { GameState } from '../core/state';
import { wardrobeFor } from '../npc/Townsfolk';
import { PLOTS, PLOT_SIZE } from '../world/plots';
import { terrainHeight } from '../world/terrain';
import type { World } from '../world/World';

const VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FRAG = /* glsl */ `
  uniform float uOwned; uniform float uSelected; uniform float uTime; uniform float uNight;
  varying vec2 vUv; varying vec3 vW;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main() {
    // Distance in from the plot's edge (0 at the edge, 0.5 in the middle).
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    // A lawn laid into the land: mottled greens, fading softly into the ground at the edges.
    float m = sn(vW.xz * 0.3) * 0.5 + sn(vW.xz * 1.1) * 0.3 + sn(vW.xz * 4.7) * 0.2;
    vec3 grass = mix(vec3(0.2, 0.46, 0.13), vec3(0.38, 0.64, 0.2), m);
    grass = mix(grass, grass * vec3(0.85, 1.08, 0.8), uOwned);
    float a = smoothstep(0.0, 0.12, edge) * mix(0.62, 0.8, uOwned) * (0.85 + 0.15 * m);
    // The selected plot: a band of soft green light along its boundary, gently pulsing.
    float band = exp(-pow((edge - 0.035) * 60.0, 2.0)) * uSelected * (0.75 + 0.25 * sin(uTime * 2.5));
    vec3 col = grass * (1.0 - uNight * 0.55) + vec3(0.55, 1.2, 0.5) * band;
    gl_FragColor = vec4(col, max(a, band));
  }`;

/**
 * The plots of land, painted into the ground: every plot is a soft lawn that fades into the land
 * round it (richer where it is yours), and the one you are looking at — in the land-for-sale panel,
 * or standing on it — has a glowing green boundary. The people you have given a home stand in its
 * garden (and inside it, HouseInterior.ts).
 */
export class PlotsView {
  private lawns = new Map<string, { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }>();
  private folk = new Map<string, { model: CharacterModel; ph: number }>();
  /** The plot shown as selected (set by the UI while its panel is open). */
  selected: string | null = null;

  constructor(private scene: THREE.Scene, private st: GameState, private world: World) {}

  update(dt: number, t: number, night: number, standingOn: string | null): void {
    for (const p of PLOTS) {
      const loaded = this.world.isLoaded(p.region), have = this.lawns.get(p.id);
      if (loaded && !have) this.addLawn(p.id, p.x, p.z);
      else if (!loaded && have) { this.scene.remove(have.mesh); have.mesh.geometry.dispose(); have.mat.dispose(); this.lawns.delete(p.id); }
    }
    for (const [id, l] of this.lawns) {
      const u = l.mat.uniforms;
      u.uOwned.value = this.st.plots[id] ? 1 : 0;
      u.uSelected.value = id === this.selected || id === standingOn ? 1 : 0;
      u.uTime.value = t;
      u.uNight.value = night;
    }
    this.updateResidents(dt, t);
  }

  private addLawn(id: string, x: number, z: number): void {
    const S = PLOT_SIZE + 4, n = 18;
    const geo = new THREE.PlaneGeometry(S, S, n, n).rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(x + pos.getX(i), z + pos.getZ(i)) + 0.06);
    geo.computeVertexNormals();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOwned: { value: 0 }, uSelected: { value: 0 }, uTime: { value: 0 }, uNight: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, z);
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    this.lawns.set(id, { mesh, mat });
  }

  /** The people living in your homes, standing about the garden in front of the house. */
  private updateResidents(dt: number, t: number): void {
    const want = new Set<string>();
    for (const p of PLOTS) {
      if (!this.lawns.has(p.id) || !this.st.plots[p.id]) continue;
      residentsOf(this.st, p.id).forEach((s, i) => {
        const person = PERSON_BY_ID[s.id];
        if (!person) return;
        const key = `${p.id}:${s.id}`;
        want.add(key);
        if (this.folk.has(key)) return;
        const pool = wardrobeFor(person.land, person.id.length % 2 ? 'girl' : 'boy');
        const model = new CharacterModel(pool[(person.name.length * 3) % pool.length], ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a'][person.name.length % 5],
          person.kind === 'orphan' ? 0.72 : person.kind === 'elder' ? 0.94 : 1);
        // In the front garden, spread in an arc before the door (the house stands at local z −5).
        const a = -0.9 + (i % 5) * 0.45, r = 5 + Math.floor(i / 5) * 2.2;
        const x = p.x + Math.sin(a) * r, z = p.z + 1.5 + Math.cos(a) * r * 0.6;
        model.root.position.set(x, terrainHeight(x, z), z);
        model.root.rotation.y = Math.atan2(p.x - x, p.z - 3 - z) + Math.PI;
        this.scene.add(model.root);
        this.folk.set(key, { model, ph: i * 1.3 });
      });
    }
    for (const [key, f] of this.folk) {
      if (!want.has(key)) { this.scene.remove(f.model.root); this.folk.delete(key); continue; }
      f.model.update(dt, { speed: 0, airborne: false, riding: false, t: t + f.ph });
    }
  }
}
