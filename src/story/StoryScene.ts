import * as THREE from 'three';
import { CASTLE } from '../event/site';
import type { Game } from '../Game';
import { keeperOf } from '../npc/people';
import { REGION_BY_ID, regionCenter } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { storyline, type Shot } from './storyline';

/**
 * The story, told over the world itself: the camera visits real places — the meadow at dawn, a
 * waking market, busy towns, the castle at dusk, the two walking the road with the children and
 * pets who travel with them, a word from Grandmother Sarvatara — while captions appear word by word.
 * The travellers are placed where each shot is so that land streams in, and are put back exactly
 * where they were at the end. Skippable at any moment.
 */
export class StoryScene {
  private t = 0;
  private i = -1;
  private done = false;
  private shots: Shot[];
  private starts: number[] = [];
  private overlay = document.createElement('div');
  private caption = document.createElement('p');
  private fade = document.createElement('i');
  private chapter = document.createElement('small');
  private home: { x: number; z: number; heading: number; minutes: number };
  private target = new THREE.Vector3();
  private centre = new THREE.Vector3();
  private shown = -1;
  view = null;
  /** The caravan walks on screen during the road, children, pets and Sarvatara shots. */
  caravan = false;
  onDone?: () => void;

  constructor(private g: Game) {
    this.shots = storyline(g.st);
    let acc = 0;
    for (const s of this.shots) { this.starts.push(acc); acc += s.dur; }
    const tr = g.trav;
    this.home = { x: tr.gPos.x, z: tr.gPos.z, heading: tr.heading, minutes: g.st.minutes };

    this.overlay.className = 'cinema story';
    this.caption.className = 'caption';
    this.fade.className = 'fade';
    this.chapter.className = 'chapter';
    const skip = document.createElement('button');
    skip.className = 'btn small ghost skip';
    skip.type = 'button';
    skip.textContent = 'Skip ›';
    skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
    const bar = (cls: string) => Object.assign(document.createElement('i'), { className: `bar ${cls}` });
    this.overlay.append(Object.assign(document.createElement('i'), { className: 'vignette' }), bar('top'), bar('bottom'), this.fade, this.chapter, this.caption, skip);
    document.getElementById('ui')?.append(this.overlay);
    requestAnimationFrame(() => this.overlay.classList.add('show'));
    document.body.classList.add('cinematic');
  }

  get finished(): boolean {
    return this.done;
  }

  private walking(s: Shot): boolean {
    return s.focus === 'travellers' || s.focus === 'siblings' || s.focus === 'children' || s.focus === 'pets' || s.focus === 'noor';
  }

  private begin(i: number): void {
    const s = this.shots[i], g = this.g, tr = g.trav;
    this.i = i;
    const day = Math.floor(this.home.minutes / 1440) * 1440;
    g.st.minutes = day + s.hour * 60;
    const c = regionCenter(REGION_BY_ID[s.land]);
    this.centre.set(c.x, 0, c.z);
    if (s.focus === 'castle') this.target.set(CASTLE.keep.x, 0, CASTLE.keep.z + 10);
    else if (s.focus === 'market') this.target.set(c.x, 0, c.z + 78);
    else if (s.focus === 'noor') {
      const at = keeperOf(s.land).at ?? [0, 20];
      this.target.set(c.x + at[0], 0, c.z + at[1]);
    } else this.target.set(c.x, 0, c.z);
    // Put the travellers where the shot is (so the land streams in), hidden unless they are in it.
    if (s.focus === 'noor') {
      tr.teleport(this.target.x - 1, this.target.z + 13);
      tr.heading = Math.PI;
    } else if (this.walking(s)) {
      tr.teleport(c.x + 3, c.z + 150 - (s.focus === 'travellers' ? 0 : 14));
      tr.heading = Math.PI;
    } else tr.teleport(this.target.x + 6, this.target.z + 40);
    this.target.y = surfaceAt(this.target.x, this.target.z, 1e9);
    const inShot = this.walking(s);
    tr.girl.root.visible = tr.boy.root.visible = tr.thread.group.visible = inShot;
    this.caravan = inShot;
    this.chapter.textContent = REGION_BY_ID[s.land].name;
  }

  /** Show a caption, its words appearing one after another. Speech gets its speaker set apart. */
  private say(text: string): void {
    this.caption.classList.remove('show');
    this.caption.replaceChildren();
    const m = /^([^:"]{2,40}): (".*")$/.exec(text);
    if (m) {
      const who = document.createElement('b');
      who.className = 'speaker';
      who.textContent = m[1];
      this.caption.append(who);
      text = m[2];
    }
    text.split(' ').forEach((w, k) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = `${w} `;
      span.style.animationDelay = `${k * 0.07}s`;
      this.caption.append(span);
    });
    void this.caption.offsetWidth;
    this.caption.classList.add('show');
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.done) return;
    this.t += dt;
    if (this.g.input.hit('escape')) return this.finish();
    const i = this.starts.findIndex((st, k) => this.t >= st && this.t < st + this.shots[k].dur);
    if (i < 0) return this.finish();
    if (i !== this.i) this.begin(i);
    const s = this.shots[i], k = this.t - this.starts[i], u = k / s.dur;

    const line = k < s.dur * 0.46 ? 0 : 1;
    if (i * 10 + line !== this.shown) {
      this.shown = i * 10 + line;
      this.say(s.lines[line] ?? '');
    }
    // Fade through black between shots.
    this.fade.style.opacity = String(Math.max(1 - Math.min(1, k / 0.8), Math.max(0, (k - (s.dur - 0.8)) / 0.8)));

    const tr = this.g.trav;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    if (this.walking(s)) {
      // They walk together (towards Sarvatara, they stop a few steps short and face her).
      const stopZ = s.focus === 'noor' ? this.target.z + 3.2 : -Infinity;
      if (tr.gPos.z > stopZ) {
        tr.gPos.z = Math.max(stopZ, tr.gPos.z - 1.4 * dt);
        tr.gPos.y = surfaceAt(tr.gPos.x, tr.gPos.z, tr.gPos.y + 2);
        tr.girl.update(dt, { speed: 1.4, airborne: false, riding: false, t: this.t });
      }
      tr.heading = Math.PI;
      const p = tr.gPos;
      if (s.focus === 'children' || s.focus === 'pets' || s.focus === 'siblings') {
        const who = this.g.caravan.centroid(s.focus === 'children' ? 'child' : s.focus === 'siblings' ? 'sibling' : 'pet') ?? p.clone().add(V(0, 0, 3));
        const a = 0.6 + u * s.spin;
        camera.position.set(who.x + Math.sin(a) * s.radius, who.y + s.height, who.z - Math.cos(a) * s.radius);
        camera.lookAt(who.x, who.y + (s.focus === 'siblings' ? 1.2 : s.focus === 'children' ? 0.7 : 0.3), who.z);
      } else if (s.focus === 'noor') {
        // A two-shot from the side: the travellers on one side, Sarvatara on the other.
        const mid = V((p.x + this.target.x) / 2, p.y, (p.z + this.target.z) / 2);
        camera.position.set(mid.x + s.radius, mid.y + s.height, mid.z + 1.5 - u * 1.2);
        camera.lookAt(mid.x, mid.y + 1.1, mid.z);
      } else {
        const a = 0.9 + u * s.spin;
        camera.position.set(p.x + Math.sin(a) * s.radius, p.y + s.height, p.z - Math.cos(a) * s.radius);
        camera.lookAt(p.x + 1, p.y + 1.1, p.z + 1.5);
      }
      return;
    }
    if (s.focus === 'market') {
      // A slow walk down the market street at eye height, the stalls passing on either side.
      const z = this.target.z + 26 - u * 22;
      const y = surfaceAt(this.target.x, z, 1e9);
      camera.position.set(this.target.x + Math.sin(u * 3) * 1.2, y + s.height, z);
      camera.lookAt(this.target.x + Math.sin(u * 2) * 4, y + 1.6, z - 14);
      return;
    }
    // A slow rising orbit, pushing in.
    const a = u * s.spin + i * 1.3;
    const r = s.radius * (1 - u * 0.12);
    camera.position.set(this.target.x + Math.sin(a) * r, this.target.y + s.height + k * 0.6, this.target.z + Math.cos(a) * r);
    camera.lookAt(this.target.clone().add(V(0, s.focus === 'castle' ? 20 : 12, 0)));
  }

  /** End (or skip): everything goes back exactly as it was. */
  finish(): void {
    if (this.done) return;
    this.done = true;
    const g = this.g, tr = g.trav;
    tr.teleport(this.home.x, this.home.z);
    tr.heading = this.home.heading;
    tr.camYaw = this.home.heading;
    g.st.minutes = this.home.minutes;
    tr.girl.root.visible = tr.boy.root.visible = tr.thread.group.visible = true;
    this.caravan = false;
    this.overlay.classList.remove('show');
    document.body.classList.remove('cinematic');
    setTimeout(() => this.overlay.remove(), 700);
    this.onDone?.();
  }
}
