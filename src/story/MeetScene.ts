import * as THREE from 'three';
import type { Game } from '../Game';
import type { GameState } from '../core/state';
import { SKILLS } from '../economy/items';
import type { NpcDef } from '../npc/people';
import type { Npc } from '../npc/Npcs';
import { REGION_BY_ID, regionCenter } from '../world/regions';
import { surfaceAt } from '../world/terrain';

/**
 * Meeting a land's Keeper for the first time (owner, 2026-09-30: "a storyline where cutscenes are
 * played, new people are befriended in places"): a short film before the conversation. The land
 * from above, with its name and its line; the Keeper seen past the two of them, speaking their own
 * first words; the Keeper close, telling what they teach and how the land's lantern is lit; and
 * the two of them with their new friend, the thread glowing. Skippable (Esc or Skip); the world is
 * left exactly as it was. The captions are pure (`meetingLines`, tests/meet.test.ts).
 */
export function meetingLines(st: GameState, def: NpcDef): string[] {
  const r = REGION_BY_ID[def.region], skill = SKILLS[r.skill];
  return [
    `${r.name} — ${r.subtitle.charAt(0).toLowerCase()}${r.subtitle.slice(1)}. ${st.names.girl} and ${st.names.boy} arrive together.`,
    `${def.name}: "${def.lines[0] ?? 'Welcome, travellers.'}"`,
    `${def.name}: "I keep the craft of ${skill.name.toLowerCase()} here. Help this land with what it needs, and we will light its lantern together."`,
    `A new friend on the road. The golden thread between them shines a little brighter.`,
  ];
}

/** The flag that marks a Keeper met with a film (so it plays once per land). */
export const metFlag = (npcId: string) => `met-film:${npcId}`;

const SHOT = 3.6;

export class MeetScene {
  private t = 0;
  private i = -1;
  private done = false;
  private lines: string[];
  private overlay = document.createElement('div');
  private caption = document.createElement('p');
  private fade = document.createElement('i');
  private chapter = document.createElement('small');
  private centre = new THREE.Vector3();
  view = null;
  caravan = true;
  onDone?: () => void;

  constructor(private g: Game, private npc: Npc) {
    this.lines = meetingLines(g.st, npc.def);
    const c = regionCenter(REGION_BY_ID[npc.def.region]);
    this.centre.set(c.x, surfaceAt(c.x, c.z, 1e9), c.z);
    this.overlay.className = 'cinema story';
    this.caption.className = 'caption';
    this.fade.className = 'fade';
    this.chapter.className = 'chapter';
    this.chapter.textContent = REGION_BY_ID[npc.def.region].name;
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
      span.style.animationDelay = `${k * 0.06}s`;
      this.caption.append(span);
    });
    void this.caption.offsetWidth;
    this.caption.classList.add('show');
  }

  update(dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.done) return;
    this.t += dt;
    if (this.g.input.hit('escape')) return this.finish();
    const i = Math.floor(this.t / SHOT);
    if (i >= this.lines.length) return this.finish();
    if (i !== this.i) { this.i = i; this.say(this.lines[i]); }
    const k = this.t - i * SHOT, u = k / SHOT;
    this.fade.style.opacity = String(Math.max(1 - Math.min(1, k / 0.6), Math.max(0, (k - (SHOT - 0.6)) / 0.6)));
    const tr = this.g.trav, kp = this.npc.pos, p = tr.gPos;
    // The Keeper turns to greet them.
    this.npc.heading = Math.atan2(p.x - kp.x, p.z - kp.z);
    const mid = new THREE.Vector3((p.x + kp.x) / 2, (p.y + kp.y) / 2, (p.z + kp.z) / 2);
    switch (i) {
      case 0: { // The land from above, turning slowly.
        const a = 0.6 + u * 0.5, r = 90 - u * 20;
        camera.position.set(this.centre.x + Math.sin(a) * r, this.centre.y + 48 - u * 8, this.centre.z + Math.cos(a) * r);
        camera.lookAt(this.centre.x, this.centre.y + 8, this.centre.z);
        break;
      }
      case 1: { // Past the two of them, towards the Keeper.
        const dx = kp.x - p.x, dz = kp.z - p.z, d = Math.hypot(dx, dz) || 1;
        camera.position.set(p.x - (dx / d) * (4.5 - u), p.y + 2.2, p.z - (dz / d) * (4.5 - u) + 1.2);
        camera.lookAt(kp.x, kp.y + 1.3, kp.z);
        break;
      }
      case 2: { // The Keeper close, the camera drifting round them.
        const face = this.npc.heading, a = face + 0.5 - u * 0.5;
        camera.position.set(kp.x + Math.sin(a) * 3.2, kp.y + 1.6, kp.z + Math.cos(a) * 3.2);
        camera.lookAt(kp.x, kp.y + 1.35, kp.z);
        break;
      }
      default: { // All of them, rising.
        const a = 1.2 + u * 0.6;
        camera.position.set(mid.x + Math.sin(a) * 9, mid.y + 3 + u * 3, mid.z + Math.cos(a) * 9);
        camera.lookAt(mid.x, mid.y + 1.2, mid.z);
      }
    }
  }

  finish(): void {
    if (this.done) return;
    this.done = true;
    this.overlay.classList.remove('show');
    document.body.classList.remove('cinematic');
    setTimeout(() => this.overlay.remove(), 700);
    this.onDone?.();
  }
}
