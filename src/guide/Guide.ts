import * as THREE from 'three';
import type { Game } from '../Game';
import { surfaceAt } from '../world/terrain';
import { currentObjective, cycleTracked, targetAnchor, type Objective, type Target } from './objectives';

const GOLD = new THREE.Color('#ffd27a');
const MOTES = 18;
const SPACING = 2.2;
const TRAIL_MAX = 38;

const ICON: Record<Target['kind'], string> = { npc: '◆', region: '➜', resource: '✦', lantern: '🏮', animal: '🐾' };

const el = (tag: string, cls: string, text = '') => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const metres = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`);

/**
 * Shows the way: a beam of light over the next task's target, golden motes drifting from the
 * girl towards it along the ground, a screen-edge waypoint with distance, and a compass. The plan
 * itself comes from the pure planner in objectives.ts.
 */
export class Guide {
  objective: Objective;
  /** Live world position of the next task's target, when it has one. */
  readonly targetPos = new THREE.Vector3();
  hasTarget = false;
  distance = Infinity;
  trail = true;

  private beam: THREE.Mesh;
  private ring: THREE.Mesh;
  private motes: THREE.Mesh[] = [];
  private waypoint = el('div', 'waypoint');
  private wpIcon = el('span', 'wp-icon');
  private wpDist = el('span', 'wp-dist');
  private wpArrow = el('span', 'wp-arrow', '▲');
  private compass = el('div', 'compass');
  private compassMarks: Array<[HTMLElement, number]> = [];
  private compassTarget = el('span', 'c-target', '◆');
  private refreshIn = 0;
  private lastNext = '';
  onNextChanged?: (o: Objective, first: boolean) => void;

  constructor(private g: Game) {
    this.objective = this.plan();
    try { this.trail = localStorage.getItem('golden-thread/trail') !== 'off'; } catch { /* default on */ }

    // A tall soft beam, brightest at the ground, fading upwards.
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: GOLD }, uTime: { value: 0 }, uAlpha: { value: 1 } },
      vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uTime; uniform float uAlpha; varying float vY; void main(){ float a = pow(1.0 - vY, 1.6) * (0.55 + 0.15 * sin(uTime * 2.0 - vY * 18.0)); gl_FragColor = vec4(uColor * 1.6, a * uAlpha); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.1, 70, 18, 1, true).translate(0, 35, 0), beamMat);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.45, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.beam.renderOrder = this.ring.renderOrder = 5;
    this.beam.frustumCulled = false;
    g.scene.add(this.beam, this.ring);

    const moteGeo = new THREE.SphereGeometry(0.075, 8, 6);
    for (let i = 0; i < MOTES; i++) {
      const m = new THREE.Mesh(moteGeo, new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(1.9), transparent: true, depthWrite: false, toneMapped: false }));
      m.visible = false;
      this.motes.push(m);
      g.scene.add(m);
    }

    // Screen overlay: waypoint and compass (DOM, so text stays crisp and accessible).
    this.waypoint.append(this.wpArrow, this.wpIcon, this.wpDist);
    this.waypoint.setAttribute('aria-hidden', 'true');
    const strip = el('div', 'c-strip');
    const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    names.forEach((n, i) => {
      const m = el('span', n.length === 1 ? 'c-mark major' : 'c-mark', n);
      strip.append(m);
      this.compassMarks.push([m, (i * Math.PI) / 4]);
    });
    for (let i = 0; i < 24; i++) if (i % 3) {
      const t = el('span', 'c-tick');
      strip.append(t);
      this.compassMarks.push([t, (i * Math.PI) / 12]);
    }
    strip.append(this.compassTarget);
    this.compass.append(strip);
    this.compass.setAttribute('aria-hidden', 'true');
    document.getElementById('ui')?.append(this.compass, this.waypoint);

    for (const e of ['quest:started', 'quest:progress', 'quest:completed', 'item:gained', 'item:crafted', 'region:entered', 'animal:befriended', 'npc:talked', 'lantern:lit'] as const) {
      g.bus.on(e, () => (this.refreshIn = 0));
    }
  }

  private plan(): Objective {
    const p = this.g.trav.gPos;
    return currentObjective(this.g.st, { region: this.g.region.id, x: p.x, z: p.z });
  }

  refresh(): void {
    this.objective = this.plan();
    const id = `${this.objective.questId}:${this.objective.step[0]}:${this.objective.next?.id ?? ''}`;
    if (id !== this.lastNext) {
      const first = this.lastNext === '';
      this.lastNext = id;
      this.onNextChanged?.(this.objective, first);
    }
  }

  /** Follow the next journey underway (G). */
  cycle(): void {
    cycleTracked(this.g.st);
    this.refreshIn = 0;
  }

  track(questId: string): void {
    this.g.st.tracked = questId;
    this.refreshIn = 0;
  }

  setTrail(on: boolean): void {
    this.trail = on;
    try { localStorage.setItem('golden-thread/trail', on ? 'on' : 'off'); } catch { /* session only */ }
  }

  /** The live position of a target: the actual person, node or animal if it is streamed in. */
  private resolve(t: Target, out: THREE.Vector3): void {
    const g = this.g, p = g.trav.gPos;
    switch (t.kind) {
      case 'npc': {
        const n = g.npcs.list.find((x) => x.def.id === t.npc);
        if (n) return void out.copy(n.pos);
        break;
      }
      case 'resource': {
        let best = Infinity;
        for (const r of g.world.loadedRegions()) {
          if (r.spec.id !== t.region) continue;
          for (const n of r.nodes) {
            if (n.item !== t.item || !n.mesh.visible) continue;
            const d = Math.hypot(n.x - p.x, n.z - p.z);
            if (d < best) { best = d; out.set(n.x, n.y, n.z); }
          }
        }
        if (best < Infinity) return;
        break;
      }
      case 'animal': {
        let best = Infinity;
        for (const a of g.animals.list) {
          if (a.species !== t.species || g.st.animals[a.id]?.befriended) continue;
          const d = a.pos.distanceTo(p);
          if (d < best) { best = d; out.copy(a.pos); }
        }
        if (best < Infinity) return;
        break;
      }
      case 'lantern': {
        const lp = g.world.landmarkPos.get(t.region);
        if (lp) {
          out.set(lp.x, surfaceAt(lp.x, lp.z, t.region === 'skyisles' ? Infinity : 1e9), lp.z);
          return;
        }
        break;
      }
      case 'region':
        break;
    }
    const a = targetAnchor(t);
    out.set(a.x, surfaceAt(a.x, a.z, 1e9), a.z);
  }

  update(dt: number, t: number): void {
    const g = this.g;
    this.refreshIn -= dt;
    if (this.refreshIn <= 0) {
      this.refreshIn = 0.5;
      this.refresh();
    }
    const next = this.objective.next;
    this.hasTarget = !!next?.target && g.started && !g.inVan;
    if (this.hasTarget) {
      this.resolve(next!.target!, this.targetPos);
      const p = g.trav.gPos;
      this.distance = Math.hypot(this.targetPos.x - p.x, this.targetPos.z - p.z);
    } else this.distance = Infinity;

    this.updateBeam(t);
    this.updateMotes(t);
    this.updateOverlay(next?.target?.kind);
  }

  private updateBeam(t: number): void {
    const show = this.hasTarget && this.distance > 4;
    this.beam.visible = this.ring.visible = show;
    if (!show) return;
    this.beam.position.copy(this.targetPos);
    this.ring.position.copy(this.targetPos).setY(this.targetPos.y + 0.06);
    const pulse = 1 + Math.sin(t * 3) * 0.12;
    this.ring.scale.setScalar(pulse);
    // Nearby the beam softens so it never blinds the view of the person you are walking up to.
    const near = THREE.MathUtils.clamp((this.distance - 4) / 30, 0.25, 1);
    const u = (this.beam.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = t;
    u.uAlpha.value = near * (0.7 + this.g.sky.night * 0.5);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + near * 0.45;
  }

  private updateMotes(t: number): void {
    const g = this.g, p = g.trav.gPos;
    const len = Math.min(TRAIL_MAX, this.distance - 2);
    const show = this.trail && this.hasTarget && len > 2 && !g.ui.modal;
    const dx = this.targetPos.x - p.x, dz = this.targetPos.z - p.z, dl = Math.hypot(dx, dz) || 1;
    const ux = dx / dl, uz = dz / dl;
    const phase = (t * 0.9) % 1;
    const airborne = g.trav.mode !== 'walk';
    for (let i = 0; i < MOTES; i++) {
      const m = this.motes[i];
      const s = (i + phase) * SPACING + 1.2;
      if (!show || s > len) { m.visible = false; continue; }
      // A gentle weave, like thread drawn through cloth.
      const side = Math.sin(s * 0.45 - t * 1.3) * 0.35;
      const x = p.x + ux * s - uz * side, z = p.z + uz * s + ux * side;
      const ground = surfaceAt(x, z, p.y + 3);
      const y = airborne ? p.y + 0.6 + (this.targetPos.y - p.y) * (s / Math.max(1, dl)) : ground + 0.75;
      m.position.set(x, y + Math.sin(t * 3 + i) * 0.12, z);
      const fade = Math.min(1, (s - 1.2) / 2) * Math.min(1, (len - s) / 4);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade) * 0.95;
      m.scale.setScalar(0.8 + 0.4 * Math.sin(t * 5 + i * 1.7) ** 2);
      m.visible = true;
    }
  }

  private updateOverlay(kind: Target['kind'] | undefined): void {
    const g = this.g, cam = g.camera;
    const show = this.hasTarget && !g.ui.modal && this.distance > 3;
    this.waypoint.classList.toggle('show', show);
    this.compass.classList.toggle('show', g.started && !g.inVan && !g.ui.modal);

    // Compass: bearings relative to where the camera looks. North is -z.
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const heading = Math.atan2(dir.x, -dir.z);
    const HALF = Math.PI / 2; // the strip shows 180°
    for (const [m, b] of this.compassMarks) {
      const rel = wrap(b - heading);
      m.style.opacity = Math.abs(rel) > HALF ? '0' : String(1 - Math.abs(rel) / HALF * 0.6);
      m.style.insetInlineStart = `${50 + (rel / HALF) * 50}%`;
    }
    this.compassTarget.hidden = !this.hasTarget;
    if (this.hasTarget) {
      const p = g.trav.gPos;
      const rel = wrap(Math.atan2(this.targetPos.x - p.x, -(this.targetPos.z - p.z)) - heading);
      const c = THREE.MathUtils.clamp(rel / HALF, -1, 1);
      this.compassTarget.style.insetInlineStart = `${50 + c * 50}%`;
      this.compassTarget.classList.toggle('edge', Math.abs(rel) > HALF);
      this.compassTarget.textContent = Math.abs(rel) > HALF ? (rel > 0 ? '▶' : '◀') : '◆';
    }

    if (!show || !kind) return;
    this.wpIcon.textContent = ICON[kind];
    this.wpDist.textContent = metres(this.distance);
    // Above a person the name label sits at 2.25 m; keep the waypoint clear of it.
    const lift = kind === 'lantern' ? 8 : kind === 'npc' ? 3.3 : 2.6;
    const v = this.targetPos.clone().setY(this.targetPos.y + lift).project(cam);
    const behind = v.z > 1;
    let x = v.x, y = v.y;
    if (behind) { x = -x; y = -y; }
    const W = innerWidth / 2, H = innerHeight / 2, margin = 56;
    let sx = x * W, sy = -y * H;
    const lim = { x: W - margin, y: H - margin };
    const off = behind || Math.abs(sx) > lim.x || Math.abs(sy) > lim.y;
    if (off) {
      // Push the marker to the screen edge along its direction from the centre.
      if (behind && Math.hypot(sx, sy) < 1) sy = lim.y;
      const k = Math.min(lim.x / Math.max(1e-3, Math.abs(sx)), lim.y / Math.max(1e-3, Math.abs(sy)));
      sx *= k; sy *= k;
      this.wpArrow.style.transform = `rotate(${Math.atan2(sx, -sy)}rad)`;
    }
    this.waypoint.classList.toggle('edge', off);
    this.waypoint.style.transform = `translate(${W + sx}px, ${H + sy}px) translate(-50%, -50%)`;
  }
}
