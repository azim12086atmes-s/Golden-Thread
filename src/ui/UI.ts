import * as THREE from 'three';
import type { Animal } from '../animals/Animals';
import { SPECIES } from '../animals/AnimalModel';
import { OUTFITS, outfitsFor } from '../characters/outfits';
import { DRESS_GROUPS, dressGroup, type DressGroup } from '../characters/wardrobe';
import type { Outfit } from '../characters/modesty';
import { dayOf, type VanSlot } from '../core/state';
import { SKY_PAUSED, TIMES, TIME_LABEL, nextTime, timeOfDay } from '../core/time';
import { canCraft, count, level } from '../economy/economy';
import { ITEMS, LEVEL_XP, RECIPES, SKILLS, type SkillId } from '../economy/items';
import { DECOR, DECOR_BY_ID, PLOT_BY_ID } from '../housing/housing';
import { SLOT_NAMES, VAN_OPTIONS } from '../housing/VanInterior';
import type { Npc } from '../npc/Npcs';
import { PEOPLE_BY_ID } from '../npc/people';
import { wantedCrafts } from '../guide/objectives';
import { QUESTS } from '../quests/quests';
import { REPLY_OPTIONS } from '../social/Messages';
import { HOME_PRICE, PLOTS, type PlotSite } from '../housing/housing';
import { prologue } from '../story/prologue';
import { features, objectives, type Card } from '../story/intro';
import { WONDERS, foundWonder, wonderHint, wonderPos } from '../world/wonders';
import { VEHICLES, type VehicleId } from '../vehicles/vehicles';
import { GRID_COLS, GRID_ROWS, REGIONS, REGION_BY_ID, regionCenter, type RegionId, type RegionSpec } from '../world/regions';
import type { Game } from '../Game';

type Panel = 'wardrobe' | 'bag' | 'journal' | 'map' | 'messages' | 'vehicles' | 'dialogue' | 'animal' | 'build' | 'van' | 'house' | 'help' | 'homes' | 'property' | null;

const h = (tag: string, attrs: Record<string, string> = {}, ...kids: Array<Node | string | null | false>) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const k of kids) if (k !== null && k !== false) el.append(k);
  return el;
};
const btn = (label: string, on: () => void, cls = '', disabled = false) => {
  const b = h('button', { class: `btn ${cls}`, type: 'button' }, label) as HTMLButtonElement;
  b.disabled = disabled;
  b.addEventListener('click', (e) => { e.stopPropagation(); on(); });
  return b;
};
/** What a street sounds like, drawn as bubbles. */
const CHATTER = ['💬', '😄', 'Good morning!', 'Did you hear…?', '🎶', 'Fresh bread today!', 'How is your family?', '☕', 'Ha ha!', 'See you at the market!', '🌸', 'Lovely weather!'];
const hearts = (n: number) => '💛'.repeat(Math.floor(n)) + '🤍'.repeat(Math.max(0, 5 - Math.floor(n)));
const clock = (m: number) => {
  const hh = Math.floor((m % 1440) / 60), mm = Math.floor(m % 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export class UI {
  private root = h('div', { id: 'ui' });
  private panelEl = h('aside', { class: 'panel', role: 'dialog' });
  private feed = h('div', { class: 'feed', 'aria-live': 'polite' });
  private prompt = h('div', { class: 'prompt' });
  private tl = h('div', { class: 'hud hud-tl' });
  private tr = h('div', { class: 'hud hud-tr' });
  private tracker = h('div', { class: 'tracker' });
  /** The objective panel can be closed; a small pill brings it back. Remembered on this device. */
  private trackerHidden = (() => { try { return localStorage.getItem('gt-objective-hidden') === '1'; } catch { return false; } })();
  private card = h('div', { class: 'card' });
  private labels = h('div', { class: 'labels' });
  private dock = h('nav', { class: 'dock' });
  private touchActions = h('div', { class: 'touch-actions', 'aria-label': 'Touch actions' });
  private title = h('div', { class: 'title' });
  private flash = h('div', { class: 'flash' });
  panel: Panel = null;
  private dialogueNpc: Npc | null = null;
  private animal: Animal | null = null;
  private msgFriend: string | null = null;
  wardrobeWho: 'girl' | 'boy' = 'girl';
  private wardrobeGroup: DressGroup = 'all';
  private wardrobeQuery = '';
  private vanSlot: VanSlot = 'rug';
  private propertySite: PlotSite | null = null;
  private storyOpen = false;
  private mapSel: RegionId | null = null;
  private hudTimer = 0;
  private labelEls = new Map<string, HTMLElement>();
  private bubbleEls: HTMLElement[] = [];

  constructor(private g: Game) {
    document.body.append(this.root);
    this.root.append(this.labels, this.tl, this.tr, this.tracker, this.feed, this.prompt, this.dock, this.panelEl, this.card, this.flash, this.title);
    this.root.append(this.touchActions);
    this.buildTouchActions();
    this.buildDock();
    this.buildTitle();
    g.bus.on('toast', ({ text, kind }) => this.toast(text, kind ?? 'info'));
    g.bus.on('message:received', ({ npcId, text }) => this.notify(npcId, text));
    g.bus.on('region:entered', ({ regionId, first }) => this.titleCard(REGION_BY_ID[regionId as RegionId], first));
    for (const e of ['quest:started', 'quest:progress', 'quest:completed', 'item:gained', 'item:crafted'] as const) g.bus.on(e, () => this.refreshTracker());
    this.refreshTracker();
  }

  /** Top edge of the bottom sheet in px (the screen height when no sheet is open). */
  sheetTop(): number {
    return this.panelEl.classList.contains('sheet') && this.panelEl.classList.contains('show') ? this.panelEl.getBoundingClientRect().top : innerHeight;
  }

  get modal(): boolean {
    return this.storyOpen || (this.panel !== null && this.panel !== 'build');
  }

  // ───────────────────────── frame ─────────────────────────

  handleKeys(): void {
    if (this.storyOpen) return;
    const i = this.g.input;
    if (i.hit('p') && !this.modal) this.g.takePhoto();
    if (i.hit('t') && !this.modal) this.g.setTimeOfDay(nextTime(this.g.st.minutes));
    if (i.hit('o') && !this.modal) this.setTrackerHidden(!this.trackerHidden);
    const keys: Array<[string, Panel]> = [['c', 'wardrobe'], ['i', 'bag'], ['j', 'journal'], ['m', 'map'], ['n', 'messages'], ['v', 'vehicles'], ['h', 'help'], ['l', 'homes']];
    for (const [k, p] of keys) if (i.hit(k)) return this.toggle(p);
    if (i.hit('b')) {
      if (this.panel === 'build') return this.closePanel();
      const plot = this.g.housing.plotAt(this.g.trav.gPos.x, this.g.trav.gPos.z);
      if (plot && this.g.housing.owns(plot.id)) this.g.enterBuild(plot.id);
      else this.g.toast('Stand on land you own to build. Buy land at the signposts outside each town.');
      return;
    }
    if (i.hit('g') && !this.modal) {
      this.g.guide.cycle();
      this.g.guide.refresh();
      const o = this.g.guide.objective;
      this.g.toast(o.questId ? `Following: ${o.title}` : 'Nothing else underway.');
      this.refreshTracker();
    }
    if (i.hit('f') && !this.modal) {
      const err = this.g.chooseVehicle(this.g.trav.mode === 'fly' ? 'walk' : 'fly');
      if (err) this.g.toast(err);
    }
    if (i.hit('escape')) this.closePanel();
  }

  update(dt: number): void {
    this.touchActions.hidden = !this.g.started || this.modal || this.g.inVan || !!this.g.cutscene;
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this.renderHud();
      if (!this.modal) this.refreshTracker();
    }
    const t = this.g.target;
    if (t && !this.modal) {
      this.prompt.replaceChildren(h('kbd', {}, 'E'), ` ${t.label}`);
      this.prompt.classList.add('show');
    } else this.prompt.classList.remove('show');
    this.renderLabels();
  }

  /** The clock is a button: tap it (or press T) to move on to dawn, day, dusk or night. */
  private clockBtn = (() => {
    const b = h('button', { class: 'time time-btn', type: 'button', title: 'Change the time of day (T)', 'aria-label': 'Move on to the next part of the day' }) as HTMLButtonElement;
    b.addEventListener('click', (e) => { e.stopPropagation(); this.g.setTimeOfDay(nextTime(this.g.st.minutes)); });
    return b;
  })();

  private clockText(t: string): HTMLElement {
    if (this.clockBtn.textContent !== t) this.clockBtn.textContent = t;
    return this.clockBtn;
  }

  private renderHud(): void {
    const g = this.g, st = g.st;
    this.tl.replaceChildren(
      h('div', { class: 'region' }, g.region.name),
      h('div', { class: 'sub' }, g.region.subtitle),
      h('div', { class: 'names' }, `${st.names.girl} ✦ ${st.names.boy}`),
    );
    const mode = VEHICLES[g.trav.mode];
    const showEnergy = g.trav.mode === 'fly' || g.trav.mounted || g.trav.energy < 0.99;
    this.tr.replaceChildren(...[
      h('div', { class: 'row' }, this.clockText(`${g.sky.night > 0.5 ? '🌙' : '☀️'} Day ${dayOf(st.minutes)} · ${clock(st.minutes)}${st.flags.includes(SKY_PAUSED) ? ' ⏸' : ''}`)),
      h('div', { class: 'row' }, h('span', { class: 'coins', title: 'Coins' }, `🪙 ${st.coins}`), h('span', { class: 'light', title: 'Shared light — grows with every kindness' }, `✦ ${st.light.toFixed(st.light % 1 ? 1 : 0)}`), h('span', { title: 'Lanterns lit' }, `🏮 ${st.lanterns.length}/${REGIONS.length}`)),
      h('div', { class: 'row small' }, `${mode.icon} ${mode.name}`),
      showEnergy ? h('div', { class: 'energy', title: 'Cape light — recharges on the ground, or in the air while you stay close together' }, h('i', { style: `inline-size:${Math.round(g.trav.energy * 100)}%` })) : null,
    ].filter((x): x is HTMLElement => x !== null));
    const unread = g.msgs.unread();
    const badge = this.dock.querySelector('[data-p="messages"] .badge') as HTMLElement | null;
    if (badge) {
      badge.textContent = String(unread);
      badge.hidden = unread === 0;
    }
  }

  private renderLabels(): void {
    const cam = this.g.camera, seen = new Set<string>();
    const v = new THREE.Vector3();
    for (const n of this.g.npcs.list) {
      const d = n.pos.distanceTo(this.g.trav.gPos);
      if (d > 22 || this.g.inVan) continue;
      v.copy(n.pos).setY(n.pos.y + 2.25).project(cam);
      if (v.z > 1) continue;
      seen.add(n.def.id);
      let el = this.labelEls.get(n.def.id);
      if (!el) {
        el = h('div', { class: 'label' });
        this.labels.append(el);
        this.labelEls.set(n.def.id, el);
      }
      const q = this.g.quests;
      const mark = q.offeredBy(n.def.id).length ? '❗ ' : q.deliverable(n.def.id).length ? '🎁 ' : '';
      el.textContent = `${mark}${n.def.name}`;
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
      el.style.opacity = String(Math.min(1, (22 - d) / 6));
    }
    for (const [id, el] of this.labelEls) if (!seen.has(id)) { el.remove(); this.labelEls.delete(id); }
    this.renderBubbles();
  }

  /** Speech bubbles over townsfolk chatting nearby — the sound of a street, drawn. */
  private renderBubbles(): void {
    const g = this.g, cam = g.camera, p = g.trav.gPos, v = new THREE.Vector3();
    const t = performance.now() / 1000;
    const near = g.townsfolk.talkers
      .map((k) => { const c = regionCenter(REGION_BY_ID[k.land]); return { ...k, wx: c.x + k.x, wz: c.z + k.z }; })
      .filter((k) => Math.hypot(k.wx - p.x, k.wz - p.z) < 40)
      .slice(0, 4);
    while (this.bubbleEls.length < near.length) { const el = h('div', { class: 'bubble' }); this.labels.append(el); this.bubbleEls.push(el); }
    this.bubbleEls.forEach((el, i) => {
      const k = near[i];
      if (!k || g.inVan || this.modal) { el.hidden = true; return; }
      const beat = Math.floor((t + k.ph) / 3.2);
      v.set(k.wx, p.y + 2.8, k.wz).project(cam);
      el.hidden = v.z > 1 || beat % 3 === 2;
      el.textContent = CHATTER[(beat + Math.floor(k.ph * 7)) % CHATTER.length];
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
    });
  }

  /** Close or reopen the objective panel (✕, the 🎯 pill, or O). Remembered on this device. */
  setTrackerHidden(v: boolean, focus = false): void {
    this.trackerHidden = v;
    try { localStorage.setItem('gt-objective-hidden', v ? '1' : '0'); } catch { /* private window: fine */ }
    this.refreshTracker();
    // Keep keyboard focus on the control that replaced the one just pressed.
    if (focus) (this.tracker.querySelector(v ? '.objective-pill' : '.objective-close') as HTMLElement | null)?.focus();
  }

  refreshTracker(): void {
    const guide = this.g.guide;
    if (!guide || !this.g.started) return void this.tracker.replaceChildren();
    const o = guide.objective;
    const q = this.g.quests;
    const setHidden = (v: boolean) => this.setTrackerHidden(v, true);
    if (this.trackerHidden) {
      const pill = h('button', { class: 'objective-pill', title: 'Show the objective panel (O)', 'aria-label': `Show the objective: ${o.title}` }, h('span', { 'aria-hidden': 'true' }, '🎯'), h('span', {}, o.title));
      pill.addEventListener('click', () => setHidden(false));
      return void this.tracker.replaceChildren(pill);
    }
    const card = h('section', { class: `objective ${o.main ? 'main' : ''}`, 'aria-label': 'Current objective' });
    const close = h('button', { class: 'objective-close', title: 'Close (O) — the golden light still shows the way', 'aria-label': 'Close the objective panel' }, '✕');
    close.addEventListener('click', () => setHidden(true));
    card.append(close);
    const eyebrow = o.questId ? `${o.main ? 'Main story' : 'Side journey'} · step ${o.step[0]} of ${o.step[1]}` : o.main ? 'Your story continues' : 'Suggestion';
    card.append(h('div', { class: 'eyebrow' }, eyebrow), h('b', { class: 'otitle' }, o.title), h('p', { class: 'goal' }, o.goal));
    const list = h('ol', { class: 'tasks' });
    for (const t of o.tasks) {
      const now = t === o.next;
      const li = h('li', { class: `task d${Math.min(t.depth, 2)} ${t.done ? 'done' : ''} ${now ? 'now' : ''}` },
        h('span', { class: 'tick', 'aria-hidden': 'true' }, t.done ? '✓' : now ? '▸' : '○'),
        h('span', { class: 'ttext' }, t.text),
      );
      if (now && t.target && guide.hasTarget && Number.isFinite(guide.distance)) {
        li.append(h('span', { class: 'tdist' }, guide.distance >= 1000 ? `${(guide.distance / 1000).toFixed(1)} km` : `${Math.round(guide.distance)} m`));
      }
      list.append(li);
    }
    if (o.tasks.length) card.append(list);
    if (o.next?.hint) card.append(h('p', { class: 'hint' }, o.next.hint));
    const nearby = QUESTS.filter((x) => !x.main && x.region === this.g.region.id && q.isAvailable(x)).length;
    if (nearby) card.append(h('p', { class: 'others' }, `❗ ${nearby} ${nearby > 1 ? 'people' : 'person'} in ${this.g.region.name} could use your help`));
    const others = q.active().filter((x) => x.id !== o.questId);
    if (others.length) card.append(h('p', { class: 'others' }, h('kbd', {}, 'G'), ` ${others.length} more journey${others.length > 1 ? 's' : ''} underway`));
    this.tracker.replaceChildren(card);
  }

  /** A short nudge when the next task changes. */
  nextStep(text: string): void {
    const el = h('div', { class: 'toast next' }, h('small', {}, 'Next'), h('span', {}, text));
    this.feed.prepend(el);
    setTimeout(() => el.classList.add('out'), 4000);
    setTimeout(() => el.remove(), 4600);
    this.tracker.classList.remove('pulse');
    void this.tracker.offsetWidth;
    this.tracker.classList.add('pulse');
  }

  // ───────────────────────── feed ─────────────────────────

  toast(text: string, kind: 'info' | 'reward' | 'story'): void {
    const el = h('div', { class: `toast ${kind}` }, text);
    this.feed.prepend(el);
    setTimeout(() => el.classList.add('out'), kind === 'story' ? 9000 : 4500);
    setTimeout(() => el.remove(), kind === 'story' ? 9600 : 5100);
    while (this.feed.children.length > 6) this.feed.lastChild?.remove();
  }

  private notify(npcId: string, text: string): void {
    const p = PEOPLE_BY_ID[npcId];
    if (!p) return;
    const el = h('div', { class: 'toast msg' },
      h('div', { class: 'from' }, h('span', { class: 'av' }, p.name[0]), h('b', {}, p.name), h('small', {}, REGION_BY_ID[p.region].name)),
      h('div', {}, text),
      h('div', { class: 'acts' }, btn('Reply', () => { this.msgFriend = npcId; this.open('messages'); }, 'small'), btn('How are you?', () => { this.g.msgs.reply(npcId, 'ask'); el.remove(); }, 'small ghost')),
    );
    this.feed.prepend(el);
    setTimeout(() => el.classList.add('out'), 12000);
    setTimeout(() => el.remove(), 12600);
  }

  private titleCard(r: RegionSpec, first: boolean): void {
    if (this.g.cutscene) return; // cinematics tell their own places
    this.card.replaceChildren(h('div', { class: 'eyebrow' }, first ? 'A new land' : 'Returning to'), h('div', { class: 'big' }, r.name), h('div', { class: 'sub' }, r.subtitle));
    this.card.classList.remove('show');
    void this.card.offsetWidth;
    this.card.classList.add('show');
  }

  /** A centred moment card: an icon, a title, a line. */
  lanternMomentText(icon: string, title: string, sub: string): void {
    this.flash.replaceChildren(h('div', { class: 'big' }, icon), h('div', {}, title), h('small', {}, sub));
    this.flash.classList.remove('show');
    void this.flash.offsetWidth;
    this.flash.classList.add('show');
  }

  /** "Your journey": the objectives and everything there is to do (after the story; and in Help). */
  showIntroGuide(done?: () => void): void {
    this.storyOpen = true;
    this.g.input.reset();
    const st = this.g.st;
    const card = (c: Card) => h('div', { class: 'icard' },
      h('span', { class: 'ic' }, c.icon),
      h('div', {}, h('b', {}, c.title), h('p', {}, c.text), c.how ? h('small', {}, c.how) : null));
    const book = h('div', { class: 'storybook intro', role: 'dialog', 'aria-label': 'Your journey' });
    let closed = false;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const close = () => {
      if (closed) return;
      closed = true;
      removeEventListener('keydown', onKey);
      this.storyOpen = false;
      book.classList.add('out');
      setTimeout(() => book.remove(), 600);
      done?.();
    };
    addEventListener('keydown', onKey);
    const x = btn('✕', close, 'close intro-close');
    x.setAttribute('aria-label', 'Close');
    x.title = 'Close (Esc)';
    book.append(h('div', { class: 'page wide' },
      x,
      h('div', { class: 'eyebrow' }, 'Your journey'),
      h('h2', {}, `${st.names.girl} & ${st.names.boy}`),
      h('h3', {}, 'Objectives'),
      h('div', { class: 'cards' }, ...objectives(st).map(card)),
      h('h3', {}, 'Travel, friends and home'),
      h('div', { class: 'cards' }, ...features(st).map(card)),
      h('div', { class: 'acts' }, h('span', {}), btn('Begin the journey', close, 'primary')),
    ));
    this.root.append(book);
  }

  /** The storybook told before the journey (and again from the journal). */
  showPrologue(done?: () => void): void {
    const pages = prologue(this.g.st);
    let i = 0;
    this.storyOpen = true;
    this.g.input.reset();
    const book = h('div', { class: 'storybook', role: 'dialog', 'aria-label': 'The story' });
    const close = () => {
      this.storyOpen = false;
      book.classList.add('out');
      setTimeout(() => book.remove(), 600);
      done?.();
    };
    const draw = () => {
      const p = pages[i];
      const dots = h('div', { class: 'dots' }, ...pages.map((_, k) => h('i', { class: k === i ? 'on' : '' })));
      book.replaceChildren(h('div', { class: 'page' },
        h('div', { class: 'eyebrow' }, p.eyebrow),
        h('h2', {}, p.title),
        ...p.lines.map((l) => h('p', {}, l)),
        dots,
        h('div', { class: 'acts' },
          i > 0 ? btn('‹ Back', () => { i--; draw(); }, 'ghost') : h('span', {}),
          btn(i < pages.length - 1 ? 'Next ›' : 'Begin the journey', () => { if (i < pages.length - 1) { i++; draw(); } else close(); }, 'primary'),
        ),
        i < pages.length - 1 ? btn('Skip the story', close, 'ghost small skip') : null,
      ));
    };
    draw();
    this.root.append(book);
  }

  lanternMoment(r: RegionSpec): void {
    this.flash.replaceChildren(h('div', { class: 'big' }, '🏮'), h('div', {}, `The lantern of ${r.name} is lit`), h('small', {}, 'The thread shines a little brighter.'));
    this.flash.classList.remove('show');
    void this.flash.offsetWidth;
    this.flash.classList.add('show');
  }

  // ───────────────────────── title ─────────────────────────

  private buildTitle(): void {
    const st = this.g.st;
    const fresh = !st.quests['main-meadow'] && st.playSeconds < 5;
    const girl = h('input', { value: st.names.girl, maxlength: '28', 'aria-label': 'Her name' }) as HTMLInputElement;
    const boy = h('input', { value: st.names.boy, maxlength: '28', 'aria-label': 'His name' }) as HTMLInputElement;
    const go = () => {
      this.title.classList.add('out');
      setTimeout(() => this.title.remove(), 900);
      this.g.start(fresh ? { girl: girl.value.trim() || 'Syeda Fathima', boy: boy.value.trim() || 'Mohammed Abdul Azim' } : undefined);
      this.refreshTracker();
    };
    this.title.append(
      h('div', { class: 'inner' },
        h('div', { class: 'eyebrow' }, 'A journey for two'),
        h('h1', {}, 'The Golden Thread'),
        h('p', {}, 'Travel the world together. Help whoever you meet. Light the lanterns of twenty lands.'),
        fresh ? h('div', { class: 'names-in' }, h('label', {}, 'Her', girl), h('span', { class: 'gold' }, '✦'), h('label', {}, 'His', boy)) : h('p', { class: 'dim' }, `${st.names.girl} and ${st.names.boy} · Day ${dayOf(st.minutes)} · ${st.lanterns.length} lanterns lit`),
        h('div', { class: 'acts' },
          btn(fresh ? 'Begin the journey' : 'Continue the journey', go, 'primary'),
          fresh ? null : btn('Start anew', () => { if (confirm('Start a new journey? This journey will be forgotten.')) this.g.newJourney(); }, 'ghost'),
        ),
        h('small', { class: 'dim' }, 'WASD move · drag to look · E interact · F fly · V travel · C wardrobe · H help'),
      ),
    );
  }

  private buildTouchActions(): void {
    const actions = [['e', 'Interact'], ['f', 'Fly'], [' ', 'Jump / Rise'], ['shift', 'Run / Descend']];
    for (const [key, label] of actions) {
      const button = btn(label, () => {}, 'touch-action');
      button.setAttribute('aria-label', label);
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.g.input.setVirtual(key, true);
      });
      const release = () => this.g.input.setVirtual(key, false);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      this.touchActions.append(button);
    }
  }

  private buildDock(): void {
    const items: Array<[Panel, string, string]> = [['wardrobe', '👗', 'Dressing room (C)'], ['bag', '🎒', 'Bag & crafts (I)'], ['journal', '📖', 'Journal (J)'], ['map', '🗺️', 'Map (M)'], ['messages', '💌', 'Messages (N)'], ['vehicles', '🚐', 'Travel (V)'], ['homes', '🏡', 'Homes & land (L)'], ['help', '❔', 'Help (H)']];
    for (const [p, icon, label] of items) {
      const b = btn(icon, () => this.toggle(p), 'dock-btn');
      b.dataset.p = p ?? '';
      b.title = label;
      b.setAttribute('aria-label', label);
      if (p === 'messages') b.append(h('span', { class: 'badge', hidden: '' }, '0'));
      this.dock.append(b);
    }
  }

  // ───────────────────────── panels ─────────────────────────

  toggle(p: Panel): void {
    if (this.panel === p) this.closePanel();
    else this.open(p);
  }

  open(p: Panel): void {
    if (this.panel === 'build' && p !== 'build') this.g.exitBuild();
    this.g.input.reset();
    this.panel = p;
    this.render();
  }

  closePanel(): void {
    if (this.panel === 'build') this.g.exitBuild();
    if (this.panel === 'van') this.g.inVan = false;
    if (this.panel === 'house') this.g.inHouse = false;
    this.panel = null;
    this.dialogueNpc = null;
    this.panelEl.classList.remove('show');
    this.root.classList.remove('sheet-open');
    this.refreshTracker();
  }

  openDialogue(npc: Npc): void {
    this.dialogueNpc = npc;
    this.open('dialogue');
  }

  openAnimal(a: Animal): void {
    this.animal = a;
    this.open('animal');
  }

  openBuild(): void {
    this.open('build');
  }

  openVan(): void {
    this.open('van');
  }

  private houseNote = '';
  openHouse(_d: unknown): void {
    this.houseNote = '';
    this.open('house');
  }

  private housePanel(body: HTMLElement): void {
    const g = this.g, d = g.house.door;
    if (!d) return;
    const done = g.houseGathered(d);
    body.append(
      h('div', { class: 'acts' },
        btn(done ? '🧺 Shared today' : '🧺 Accept what they share', () => { this.houseNote = g.gatherInHouse(); this.render(); }, done ? 'ghost' : 'primary', done),
        btn('💬 Talk with the family', () => { this.houseNote = g.talkInHouse(); this.render(); }, 'ghost'),
        btn('🌅 Rest until morning', () => { g.setTimeOfDay('dawn'); this.houseNote = 'You rest together — each in your own place — and wake at dawn.'; this.render(); }, 'ghost'),
        btn('🌙 Stay until night', () => { g.setTimeOfDay('night'); this.houseNote = 'Lamps are lit; the evening is long and kind.'; this.render(); }, 'ghost'),
        btn('🚪 Step outside', () => g.exitHouse(), 'ghost')),
      this.houseNote ? h('p', { class: 'story' }, this.houseNote) : h('p', { class: 'dim' }, 'Every home in town opens its door to you. Esc or E to step back outside.'));
  }

  render(): void {
    const body = h('div', { class: 'body' });
    const titles: Record<string, string> = { wardrobe: 'Dressing room', bag: 'Bag & Crafts', journal: 'Journal', map: 'The World', messages: 'Messages', vehicles: 'Ways to Travel', dialogue: '', animal: '', build: 'Build', van: 'Inside Safar', house: this.g.houseTitle(), help: 'How to play', homes: 'Homes & Land', property: 'Land for sale' };
    const head = h('header', {}, h('h2', {}, titles[this.panel ?? ''] ?? ''), btn('✕', () => this.closePanel(), 'close'));
    switch (this.panel) {
      case 'wardrobe': this.wardrobe(body); break;
      case 'bag': this.bag(body); break;
      case 'journal': this.journal(body); break;
      case 'map': this.map(body); break;
      case 'messages': this.messages(body); break;
      case 'vehicles': this.vehicles(body); break;
      case 'dialogue': this.dialogue(body, head); break;
      case 'animal': this.animalPanel(body, head); break;
      case 'build': this.buildPanel(body); break;
      case 'van': this.vanPanel(body); break;
      case 'house': this.housePanel(body); break;
      case 'help': this.help(body); break;
      case 'homes': this.homes(body); break;
      case 'property': this.property(body); break;
      default: return this.closePanel();
    }
    this.panelEl.replaceChildren(head, body);
    const sheet = this.panel === 'wardrobe' || this.panel === 'van' || this.panel === 'house';
    this.panelEl.className = `panel show p-${this.panel}${sheet ? ' sheet' : ''}`;
    this.root.classList.toggle('sheet-open', sheet);
  }

  private wardrobe(body: HTMLElement): void {
    const st = this.g.st, who = this.wardrobeWho;
    const worn = OUTFITS[st.outfits[who]];
    const top = h('div', { class: 'sheet-row' },
      h('div', { class: 'seg', role: 'tablist' },
        btn(`${st.names.girl}`, () => { this.wardrobeWho = 'girl'; this.render(); }, who === 'girl' ? 'on' : ''),
        btn(`${st.names.boy}`, () => { this.wardrobeWho = 'boy'; this.render(); }, who === 'boy' ? 'on' : '')),
      worn ? h('div', { class: 'worn' }, h('b', {}, worn.name), h('small', {}, worn.culture), worn.merged.length ? h('small', { class: 'merged' }, `+ ${worn.merged.join(', ')}`) : null) : null,
    );
    const search = h('input', { type: 'search', placeholder: 'Search outfits', 'aria-label': 'Search outfits', value: this.wardrobeQuery }) as HTMLInputElement;
    const chips = h('div', { class: 'chips' }, search, ...DRESS_GROUPS.map(([id, label]) =>
      btn(label, () => { this.wardrobeGroup = id; this.render(); }, `small ${this.wardrobeGroup === id ? 'on' : 'ghost'}`)));
    const shelf = h('div', { class: 'shelf', role: 'list' });
    const fill = () => {
      const q = this.wardrobeQuery.trim().toLowerCase();
      const list = outfitsFor(who).filter((o) => (this.wardrobeGroup === 'all' || dressGroup(o) === this.wardrobeGroup)
        && (!q || `${o.name} ${o.culture}`.toLowerCase().includes(q)));
      shelf.replaceChildren(...list.map((o) => {
        const on = st.outfits[who] === o.id;
        const card = h('button', { class: `outfit ${on ? 'on' : ''}`, type: 'button', role: 'listitem', title: o.note ?? o.name }, swatch(o), h('b', {}, o.name), h('small', {}, o.culture));
        card.addEventListener('click', () => { this.g.wear(who, o.id); this.render(); });
        return card;
      }));
      if (!list.length) shelf.append(h('p', { class: 'dim' }, 'Nothing matches. Try another shelf.'));
    };
    search.addEventListener('input', () => { this.wardrobeQuery = search.value; fill(); });
    fill();
    body.append(top, chips, shelf, h('p', { class: 'dim fine' }, 'Drag the view to turn around. Every outfit is fully covering; where an inspiration was not, sleeves, trousers or a headscarf were merged in.'));
    requestAnimationFrame(() => shelf.querySelector('.outfit.on')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  }

  private bag(body: HTMLElement): void {
    const st = this.g.st;
    const inv = Object.entries(st.inventory).filter(([, n]) => n > 0);
    body.append(h('h3', {}, `Carrying · 🪙 ${st.coins}`));
    const grid = h('div', { class: 'grid items' });
    if (!inv.length) grid.append(h('p', { class: 'dim' }, 'Empty. Gather things marked with a floating light.'));
    for (const [id, n] of inv) grid.append(h('div', { class: 'item', title: ITEMS[id]?.name ?? id }, h('span', { class: 'ic' }, ITEMS[id]?.icon ?? '?'), h('small', {}, ITEMS[id]?.name ?? id), h('b', {}, `×${n}`)));
    body.append(grid, h('h3', {}, 'Skills'));
    const skills = h('div', { class: 'skills' });
    for (const [id, s] of Object.entries(SKILLS) as Array<[SkillId, (typeof SKILLS)[SkillId]]>) {
      const lv = level(st, id), xp = st.skills[id];
      const next = LEVEL_XP[lv + 1] ?? xp, prev = LEVEL_XP[lv];
      skills.append(h('div', { class: 'skill', title: s.blurb }, h('span', {}, `${s.icon} ${s.name}`), h('b', {}, lv ? `Lv ${lv}` : '—'), h('i', { class: 'bar' }, h('i', { style: `inline-size:${next > prev ? Math.round(((xp - prev) / (next - prev)) * 100) : 100}%` }))));
    }
    body.append(skills, h('h3', {}, 'Make something'), h('p', { class: 'dim' }, 'Keepers teach their land\'s craft when you first meet them.'));
    const list = h('div', { class: 'recipes' });
    const wanted = wantedCrafts(this.g.guide.objective);
    const sorted = [...RECIPES].sort((a, b) => Number(wanted.has(b.out)) - Number(wanted.has(a.out)) || Number(canCraft(st, b).ok) - Number(canCraft(st, a).ok) || a.skill.localeCompare(b.skill));
    for (const r of sorted) {
      const c = canCraft(st, r);
      if (!c.ok && c.reason === 'skill' && level(st, r.skill) + 1 < r.level) continue;
      const needs = Object.entries(r.needs).map(([k, n]) => h('span', { class: count(st, k) >= n ? 'ok' : 'miss' }, `${ITEMS[k].icon}${count(st, k)}/${n}`));
      list.append(h('div', { class: `recipe ${c.ok ? '' : 'dim'} ${wanted.has(r.out) ? 'guided' : ''}` },
        h('span', { class: 'ic' }, ITEMS[r.out].icon),
        h('div', {}, h('b', {}, `${wanted.has(r.out) ? '✦ ' : ''}${ITEMS[r.out].name}${r.qty > 1 ? ` ×${r.qty}` : ''}`), h('small', {}, `${SKILLS[r.skill].icon} ${SKILLS[r.skill].name} ${r.level ? `Lv ${r.level}` : ''}`), h('div', { class: 'needs' }, ...needs)),
        btn('Make', () => { this.g.craft(r.id); this.render(); }, 'small', !c.ok),
      ));
    }
    body.append(list);
  }

  openProperty(site: PlotSite): void {
    this.propertySite = site;
    this.open('property');
  }

  /** Every piece of land in the world: where it is, its price, and the way there. */
  private homes(body: HTMLElement): void {
    const st = this.g.st, hs = this.g.housing;
    body.append(h('p', { class: 'dim' }, `Every land has two plots for sale just outside its town. Buy the bare land and build it yourself, or buy a ready-made home in that land's own style (land + ${HOME_PRICE} coins). You have 🪙 ${st.coins}.`));
    const owned = PLOTS.filter((p) => hs.owns(p.id));
    if (owned.length) {
      body.append(h('h3', {}, 'Yours'));
      for (const p of owned) body.append(h('div', { class: 'quest main' }, h('b', {}, `🏡 ${REGION_BY_ID[p.region].name}`), h('small', {}, `${st.plots[p.id].decor.length} things built · stand on it and press B to build`),
        btn('Show the way', () => this.showWay(p, `Your land in ${REGION_BY_ID[p.region].name}`), 'small')));
    }
    body.append(h('h3', {}, 'For sale'));
    for (const p of PLOTS.filter((x) => !hs.owns(x.id))) {
      const known = st.discovered.includes(p.region);
      body.append(h('div', { class: 'quest' },
        h('b', {}, known ? REGION_BY_ID[p.region].name : 'A land not yet visited'),
        h('small', {}, `Land 🪙 ${p.price} · Home 🪙 ${hs.homePrice(p.id)}`),
        btn('Show the way', () => this.showWay(p, `Land for sale in ${REGION_BY_ID[p.region].name}`), 'small'),
      ));
    }
  }

  private showWay(p: PlotSite, title: string): void {
    this.g.guide.pin({ title, text: 'Walk to the signpost at the land', x: p.x, z: p.z - 17, region: p.region });
    this.closePanel();
    this.g.toast(`Follow the golden motes to ${title.toLowerCase()}.`);
  }

  /** At a signpost: buy the land, or a home. */
  private property(body: HTMLElement): void {
    const site = this.propertySite;
    if (!site) return;
    const hs = this.g.housing, land = REGION_BY_ID[site.region];
    body.append(
      h('p', {}, `A ${30} × ${30} m plot of land at the edge of ${land.name}. Yours to keep: build, farm, keep animals, and come home to it.`),
      h('div', { class: 'quest' }, h('b', {}, '🌱 The land'), h('small', {}, `🪙 ${site.price} — build everything yourself (B)`), btn(`Buy the land · 🪙 ${site.price}`, () => { this.g.buyProperty(site, false); this.closePanel(); }, 'primary')),
      h('div', { class: 'quest main' }, h('b', {}, `🏡 A home in the ${land.name} style`), h('small', {}, `🪙 ${hs.homePrice(site.id)} — the land with a house already standing on it`), btn(`Buy the home · 🪙 ${hs.homePrice(site.id)}`, () => { this.g.buyProperty(site, true); this.closePanel(); }, 'primary')),
      h('p', { class: 'dim' }, `You have 🪙 ${this.g.st.coins}. Earn more by making goods and selling them where they are wanted.`),
    );
  }

  private journal(body: HTMLElement): void {
    const q = this.g.quests, st = this.g.st;
    // The story and the main objective, always at the top.
    const wondersFound = WONDERS.filter((w) => foundWonder(st, w.id)).length;
    body.append(h('div', { class: 'quest main' },
      h('b', {}, '🏮 The main objective'),
      h('p', {}, `Go to new places, work beside the people you meet and solve their problems, make friends — and relight all ${REGIONS.length} lanterns, then wake the Great Lantern above the clouds. Her new job is one chapter of a lifelong journey of exploring and bonding.`),
      h('small', {}, `${st.lanterns.length} of ${REGIONS.length} lanterns · ${wondersFound} of ${WONDERS.length} hidden wonders · ${Object.keys(st.plots).length} homes & lands · ${st.caravan.length} in the caravan`),
      h('div', { class: 'acts' },
        btn('▶ Watch the story again', () => { this.closePanel(); this.g.playStory(); }, 'small'),
        btn('Read it', () => { this.closePanel(); this.showPrologue(); }, 'small ghost')),
    ));
    body.append(h('p', { class: 'dim' }, `Day ${dayOf(st.minutes)} of the journey · ${st.lanterns.length} of ${REGIONS.length} lanterns lit · shared light ✦ ${st.light.toFixed(1)}`));
    const act = q.active();
    body.append(h('h3', {}, 'Now'));
    if (!act.length) body.append(h('p', { class: 'dim' }, 'No journeys underway. Look for ❗ above people\'s heads.'));
    const followed = this.g.guide.objective.questId;
    for (const x of act) body.append(h('div', { class: `quest ${x.main ? 'main' : ''}` },
      h('b', {}, `${x.main ? '🏮 ' : ''}${x.title}`), h('small', {}, `${REGION_BY_ID[x.region].name} · ${PEOPLE_BY_ID[x.giver]?.name ?? ''}`), h('p', {}, x.intro), h('p', { class: 'step' }, `→ ${q.stepText(x.id)}`),
      x.id === followed ? h('span', { class: 'following' }, '✦ Following') : btn('Follow this journey', () => { this.g.guide.track(x.id); this.g.guide.refresh(); this.render(); this.refreshTracker(); }, 'small'),
    ));
    body.append(h('h3', {}, 'The caravan'));
    for (const c of this.g.caravan.list()) body.append(h('div', { class: 'quest' },
      h('b', {}, `${c.kind === 'pet' ? '🐾' : '🧒'} ${c.name}`),
      h('small', {}, c.kind === 'child' ? `${c.tradition} · going to ${REGION_BY_ID[c.destination].name}` : `from ${REGION_BY_ID[c.origin].name}`),
      h('p', {}, c.kind === 'child' ? c.journey : c.blurb)));
    body.append(h('h3', {}, `Hidden wonders · ${wondersFound} of ${WONDERS.length}`));
    for (const w of WONDERS) {
      const f = foundWonder(st, w.id);
      body.append(h('div', { class: `quest ${f ? 'done' : ''}` },
        h('b', {}, f ? `✨ ${w.name}` : `? Somewhere in ${st.discovered.includes(w.land) ? REGION_BY_ID[w.land].name : 'a land not yet visited'}`),
        h('p', {}, f ? w.story : wonderHint(w)),
        !f && st.discovered.includes(w.land) && w.land === this.g.region.id ? btn('Walk towards it', () => { const p = wonderPos(w); this.g.guide.pin({ title: 'Searching for a hidden wonder', text: 'Look for the rising sparkle', x: p.x, z: p.z, region: w.land }); this.closePanel(); }, 'small') : null,
      ));
    }
    const done = q.done();
    if (done.length) {
      body.append(h('h3', {}, 'Remembered'));
      for (const x of done) body.append(h('div', { class: 'quest done' }, h('b', {}, x.title), h('p', {}, x.outro)));
    }
  }

  private map(body: HTMLElement): void {
    const st = this.g.st;
    const grid = h('div', { class: 'map', style: `grid-template-columns:repeat(${GRID_COLS},1fr);grid-template-rows:repeat(${GRID_ROWS},1fr)` });
    for (let row = 0; row < GRID_ROWS; row++) for (let col = 0; col < GRID_COLS; col++) {
      const r = REGIONS.find((x) => x.col === col && x.row === row)!;
      const known = st.discovered.includes(r.id);
      const here = this.g.region.id === r.id;
      const cell = h('button', { class: `cell ${known ? '' : 'fog'} ${here ? 'here' : ''} ${this.mapSel === r.id ? 'sel' : ''}`, type: 'button', style: `--c:${r.ground}` },
        h('b', {}, known ? r.name : '???'),
        st.lanterns.includes(r.id) ? h('span', { class: 'lit' }, '🏮') : null,
        here ? h('span', { class: 'you' }, '✦') : null,
        this.g.guide.objective.next?.target?.region === r.id ? h('span', { class: 'goal-mark', title: 'Your next step is here' }, '◆') : null,
      );
      cell.addEventListener('click', () => { this.mapSel = r.id; this.render(); });
      grid.append(cell);
    }
    body.append(grid);
    const sel = this.mapSel ? REGION_BY_ID[this.mapSel] : null;
    if (sel) {
      const known = st.discovered.includes(sel.id);
      body.append(h('div', { class: 'mapinfo' },
        h('h3', {}, known ? sel.name : 'Unexplored'),
        h('p', {}, known ? sel.subtitle : 'Travel there to discover it. Lands lie in every direction — follow the landmarks on the horizon.'),
        known ? h('p', { class: 'dim' }, `Teaches ${SKILLS[sel.skill].icon} ${SKILLS[sel.skill].name} · Market wants ${sel.wanted.map((w) => ITEMS[w].icon).join(' ')}`) : null,
        known && sel.id !== this.g.region.id ? btn(`Travel to ${sel.name}`, () => { this.g.travelTo(sel.id); this.closePanel(); }, 'primary') : null,
      ));
    } else body.append(h('p', { class: 'dim' }, 'North is at the top. Select a land.'));
  }

  private messages(body: HTMLElement): void {
    const m = this.g.msgs, st = this.g.st;
    const friends = m.friends();
    if (!friends.length) {
      body.append(h('p', { class: 'dim' }, 'No friends yet. Help people, and they will write to you.'));
      return;
    }
    if (!this.msgFriend || !friends.includes(this.msgFriend)) this.msgFriend = friends[0];
    const list = h('div', { class: 'friends' });
    for (const id of friends) {
      const p = PEOPLE_BY_ID[id];
      const unread = m.thread(id).filter((x) => x.from === 'them' && !x.read).length;
      const b = btn('', () => { this.msgFriend = id; this.render(); }, `friend ${id === this.msgFriend ? 'on' : ''}`);
      b.append(h('span', { class: 'av' }, p.name[0]), h('span', {}, p.name), unread ? h('span', { class: 'badge' }, String(unread)) : '');
      list.append(b);
    }
    const id = this.msgFriend;
    const p = PEOPLE_BY_ID[id];
    m.markRead(id);
    const thread = h('div', { class: 'thread' });
    for (const x of m.thread(id).slice(-30)) {
      const bubble = h('div', { class: `bubble ${x.from}` }, x.text);
      if (x.request && !x.request.done) bubble.append(btn(`Send ${x.request.qty} × ${ITEMS[x.request.item].name}`, () => { m.fulfil(x.id); this.render(); }, 'small', !m.canFulfil(x)));
      thread.append(bubble);
    }
    const gifts = Object.entries(st.inventory).filter(([k, n]) => n > 0 && ITEMS[k]?.kind !== 'material').slice(0, 8);
    body.append(list, h('div', { class: 'convo' },
      h('div', { class: 'who' }, h('b', {}, p.name), h('small', {}, `${p.role} · ${REGION_BY_ID[p.region].name} · ${hearts(st.friends[id]?.hearts ?? 0)}`)),
      thread,
      h('div', { class: 'replies' }, ...REPLY_OPTIONS.map((o) => btn(o.label, () => { m.reply(id, o.key); this.render(); }, 'small ghost'))),
      gifts.length ? h('div', { class: 'replies' }, h('small', { class: 'dim' }, 'Send a gift:'), ...gifts.map(([k]) => btn(ITEMS[k].icon, () => { m.gift(id, k); this.render(); }, 'small icon'))) : null,
    ));
    setTimeout(() => (thread.scrollTop = thread.scrollHeight));
  }

  private vehicles(body: HTMLElement): void {
    const st = this.g.st;
    for (const v of Object.values(VEHICLES)) {
      const owned = st.vehicles.includes(v.id);
      const using = this.g.trav.mode === v.id;
      const req = v.requires?.flag ? 'Earned through a friendship in the Meadow' : v.requires?.lanterns ? `Needs ${v.requires.lanterns} lanterns lit` : '';
      const row = h('div', { class: `vehicle ${using ? 'on' : ''}` }, h('span', { class: 'ic' }, v.icon), h('div', {}, h('b', {}, v.name), h('small', {}, v.blurb), !owned && req ? h('small', { class: 'dim' }, req) : null));
      if (owned) row.append(btn(using ? 'Travelling' : 'Go', () => { const e = this.g.chooseVehicle(v.id as VehicleId); if (e) this.g.toast(e); else this.closePanel(); }, 'small', using));
      else if (v.price) row.append(btn(`Buy · 🪙${v.price}`, () => { const e = this.g.buyVehicle(v.id); if (e) this.g.toast(e); this.render(); }, 'small', st.coins < v.price));
      body.append(row);
    }
    body.append(h('p', { class: 'dim' }, 'In every vehicle you sit in separate seats. On unicorns, each of you rides your own; the night dragon has two separate saddles, hers in front and his behind.'));
  }

  private dialogue(body: HTMLElement, head: HTMLElement): void {
    const npc = this.dialogueNpc;
    if (!npc) return;
    const g = this.g, st = g.st, q = g.quests, def = npc.def;
    const f = st.friends[def.id];
    head.firstChild!.replaceWith(h('div', {}, h('h2', {}, def.name), h('small', {}, `${def.role} · ${hearts(f?.hearts ?? 0)}`)));
    const line = def.lines[Math.floor(st.minutes / 7) % def.lines.length];
    body.append(h('blockquote', {}, line));
    for (const quest of q.offeredBy(def.id)) {
      body.append(h('div', { class: 'offer' }, h('b', {}, `${quest.main ? '🏮 ' : '❗ '}${quest.title}`), h('p', {}, quest.intro), btn('We will help', () => { q.start(quest.id); this.render(); }, 'primary')));
    }
    for (const quest of q.deliverable(def.id)) {
      const s = q.step(quest.id);
      if (s?.kind !== 'deliver') continue;
      body.append(h('div', { class: 'offer' }, h('b', {}, quest.title), btn(`Give ${s.qty} × ${ITEMS[s.item].icon} ${ITEMS[s.item].name}`, () => { q.deliver(quest.id); this.render(); }, 'primary')));
    }
    for (const quest of q.active().filter((x) => x.giver === def.id && !q.deliverable(def.id).includes(x))) {
      body.append(h('div', { class: 'offer dim' }, h('b', {}, quest.title), h('p', {}, `→ ${q.stepText(quest.id)}`)));
    }
    if (def.keeper) {
      const r = REGION_BY_ID[def.region];
      const sellable = Object.entries(st.inventory).filter(([k, n]) => n > 0 && ITEMS[k]);
      body.append(h('h3', {}, 'Market'), h('p', { class: 'dim' }, `Goods from far away fetch more here. Wanted: ${r.wanted.map((w) => `${ITEMS[w].icon} ${ITEMS[w].name}`).join(', ')} (double price).`));
      const sellRow = h('div', { class: 'trade' });
      for (const [k, n] of sellable) sellRow.append(btn(`${ITEMS[k].icon} ${n} · sell 🪙${g.priceHere(k)}`, () => { g.sell(k); this.render(); }, 'small ghost'));
      if (!sellable.length) sellRow.append(h('small', { class: 'dim' }, 'Nothing to sell.'));
      const buyRow = h('div', { class: 'trade' });
      for (const k of r.materials) buyRow.append(btn(`Buy ${ITEMS[k].icon} ${ITEMS[k].name} · 🪙${Math.ceil(ITEMS[k].value * 1.5)}`, () => { if (!g.buyMaterial(k)) g.toast('Not enough coins.'); this.render(); }, 'small ghost'));
      body.append(sellRow, buyRow);
    }
    const gifts = Object.entries(st.inventory).filter(([k, n]) => n > 0 && ITEMS[k] && ITEMS[k].kind !== 'material').slice(0, 10);
    if (gifts.length) {
      body.append(h('h3', {}, 'Give a gift'), h('div', { class: 'trade' }, ...gifts.map(([k]) => btn(`${ITEMS[k].icon} ${ITEMS[k].name}`, () => { g.msgs.gift(def.id, k); g.toast(`${def.name} smiles. 💛`, 'reward'); this.render(); }, 'small ghost'))));
    }
    body.append(h('div', { class: 'acts' }, btn('Goodbye', () => this.closePanel(), 'ghost')));
  }

  private animalPanel(body: HTMLElement, head: HTMLElement): void {
    const a = this.animal;
    if (!a) return;
    const g = this.g, st = g.st, s = st.animals[a.id], sp = SPECIES[a.species];
    head.firstChild!.replaceWith(h('h2', {}, s ? `${s.name} the ${sp.name}` : `A ${sp.name}`));
    if (!s?.befriended) {
      body.append(h('p', {}, `The ${sp.name} watches you, curious but shy.`), h('p', { class: 'dim' }, `It would love ${ITEMS[sp.diet].icon} ${ITEMS[sp.diet].name}. You have ${count(st, sp.diet)}.`));
      body.append(btn(`Offer ${ITEMS[sp.diet].name}`, () => { const e = g.befriendAnimal(a); if (e) g.toast(e); this.render(); }, 'primary', count(st, sp.diet) < 1));
      return;
    }
    const happy = g.housing.happiness(a.id);
    body.append(h('p', {}, `Happiness ${hearts(happy / 20)}`));
    body.append(btn(`Feed ${ITEMS[sp.diet].icon}`, () => { if (!g.housing.feed(a.id)) g.toast(`You need ${ITEMS[sp.diet].name}.`); this.render(); }, 'ghost'));
    if (s.plotId) {
      if (sp.produce) body.append(btn(`Collect ${ITEMS[sp.produce].icon} ${ITEMS[sp.produce].name}`, () => { const got = g.housing.collect(a.id); g.toast(got ? `+2 ${ITEMS[got].name}` : 'Not today — come back tomorrow, and keep them happy.'); this.render(); }, 'ghost'));
      body.append(h('p', { class: 'dim' }, `Lives on your land in ${REGION_BY_ID[PLOT_BY_ID[s.plotId].region].name}.`));
    } else {
      const plots = Object.keys(st.plots);
      body.append(h('h3', {}, 'Bring home'));
      if (!plots.length) body.append(h('p', { class: 'dim' }, 'Buy some land first — look for signposts outside each town.'));
      for (const pid of plots) body.append(btn(`To your land in ${REGION_BY_ID[PLOT_BY_ID[pid].region].name}`, () => { g.adopt(a, pid); this.closePanel(); }, 'small ghost'));
    }
  }

  private buildPanel(body: HTMLElement): void {
    const g = this.g, b = g.build;
    if (!b) return;
    const site = PLOT_BY_ID[b.plotId];
    body.append(h('p', { class: 'dim' }, `Your land in ${REGION_BY_ID[site.region].name}. Choose, then click to place · R rotate · Esc done. Light a land's lantern to unlock its house style.`));
    const grid = h('div', { class: 'grid decor' });
    for (const d of g.housing.unlocked()) {
      const c = h('button', { class: `item ${b.kind === d.id ? 'on' : ''}`, type: 'button' }, h('span', { class: 'ic' }, d.icon), h('small', {}, d.name), h('b', {}, d.price ? `🪙${d.price}` : 'free'));
      c.addEventListener('click', () => { g.selectDecor(b.kind === d.id ? null : d.id); this.render(); });
      grid.append(c);
    }
    const locked = DECOR.length - g.housing.unlocked().length;
    body.append(grid, h('small', { class: 'dim' }, `${locked} more to discover on your travels.`));
    const placed = g.st.plots[b.plotId].decor;
    if (placed.length) {
      body.append(h('h3', {}, 'On your land'));
      const list = h('div', { class: 'trade' });
      for (const d of placed.slice(-20)) list.append(btn(`${DECOR_BY_ID[d.kind]?.icon ?? '?'} ✕`, () => { g.removeDecor(b.plotId, d.id); this.render(); }, 'small ghost'));
      body.append(list, h('small', { class: 'dim' }, 'Removing refunds half.'));
    }
    body.append(h('div', { class: 'acts' }, btn('Done', () => this.closePanel(), 'primary')));
  }

  private vanPanel(body: HTMLElement): void {
    const g = this.g, st = g.st;
    const slots = Object.keys(VAN_OPTIONS) as VanSlot[];
    const slot = this.vanSlot;
    body.append(h('div', { class: 'chips' }, ...slots.map((s) =>
      btn(SLOT_NAMES[s], () => { this.vanSlot = s; this.render(); }, `small ${s === slot ? 'on' : 'ghost'}`))));
    const shelf = h('div', { class: 'shelf van-shelf', role: 'list' });
    for (const o of VAN_OPTIONS[slot]) {
      const on = st.van[slot] === o.id;
      const cost = Object.entries(o.cost);
      const afford = cost.every(([k, n]) => count(st, k) >= n);
      const card = h('button', { class: `outfit ${on ? 'on' : ''} ${!on && !afford ? 'dim' : ''}`, type: 'button', role: 'listitem' },
        h('b', {}, o.name),
        h('small', {}, on ? 'In your van' : cost.length ? cost.map(([k, n]) => `${n}× ${ITEMS[k].icon} ${ITEMS[k].name}`).join(' · ') : 'Free'),
      );
      card.addEventListener('click', () => { const e = g.setVanSlot(slot, o.id); if (e) g.toast(e); this.render(); });
      shelf.append(card);
    }
    body.append(shelf, h('p', { class: 'dim fine' }, 'Decorate with things you have made — each piece uses up the item. Esc to step outside.'));
  }


  private help(body: HTMLElement): void {
    body.append(h('h3', {}, 'Graphics & photos'),
      h('p', { class: 'dim' }, 'Low graphics turns off shadows and bloom and reduces resolution. Your choice is remembered on this browser.'),
      h('div', { class: 'acts' },
        btn('Low graphics', () => { this.g.setQuality('low'); this.render(); }, this.g.quality === 'low' ? 'on' : 'ghost'),
        btn('High graphics', () => { this.g.setQuality('high'); this.render(); }, this.g.quality === 'high' ? 'on' : 'ghost'),
        btn('Save photo (P)', () => this.g.takePhoto(), 'primary'),
        btn('🎂 Replay the opening', () => this.g.playOpening(), 'ghost'),
        btn('🏰 Replay the celebration evening', () => this.g.celebration.replay(), 'ghost'),
        btn('🧭 Objectives & features', () => { this.closePanel(); this.showIntroGuide(); }, 'ghost'),
        btn('▶ Watch the story', () => this.g.playStory(), 'ghost')),
      h('h3', {}, 'Day and night'),
      h('p', { class: 'dim' }, 'Choose the sky: the clock moves forward to that hour, as if you rested. T (or tapping the clock) moves on to the next part of the day.'),
      h('div', { class: 'acts' },
        ...TIMES.map((w) => btn(TIME_LABEL[w], () => { this.g.setTimeOfDay(w); this.render(); }, timeOfDay(this.g.st.minutes) === w ? 'on' : 'ghost')),
        btn(this.g.st.flags.includes(SKY_PAUSED) ? '⏸ Sky paused' : '▶ Sky moving', () => { this.g.toggleSkyPause(); this.render(); }, this.g.st.flags.includes(SKY_PAUSED) ? 'on' : 'ghost')),
      h('div', { class: 'acts' },
        btn(this.g.guide.trail ? 'Golden trail: on' : 'Golden trail: off', () => { this.g.guide.setTrail(!this.g.guide.trail); this.render(); }, this.g.guide.trail ? 'on' : 'ghost')),
      h('p', { class: 'dim' }, 'On touch screens: drag the left half to move, the right half to look. Hold Jump / Rise or Run / Descend; tap Interact or Fly. Photos save the view without menus.'));

    const rows: Array<[string, string]> = [
      ['WASD / arrows', 'Walk · steer'], ['Drag · wheel', 'Look around · zoom'], ['Space', 'Jump · rise (flying, unicorn, plane climb)'], ['Shift', 'Run · descend · boost'],
      ['F', 'Cape of light — fly together'], ['T', 'Dawn · day · dusk · night'], ['O', 'Hide or show the objective panel'], ['E', 'Talk · gather · befriend · light lanterns'], ['V', 'Choose how to travel'], ['C', 'Dressing room for both'], ['I', 'Bag, skills and crafting'],
      ['J', 'Journal'], ['G', 'Follow another journey'], ['L', 'Homes & land for sale'], ['M', 'Map and travel to known lands'], ['N', 'Messages from friends'], ['B', 'Build on your land'], ['Esc', 'Close'],
    ];
    body.append(h('table', { class: 'keys' }, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, v)))));
    body.append(
      h('h3', {}, 'The journey'),
      h('p', {}, 'Every land has a Keeper who will teach you their craft. Help them with what they need and light the land\'s lantern together. Help anyone else you meet — they will remember you, write to you, and ask for your help again.'),
      h('p', {}, 'Earn your living by being useful: gather, make, and bring goods from where they are plentiful to where they are wanted. Buy land, build, farm, and give animal friends a home.'),
      h('p', {}, 'Flight uses the cape\'s light. It recharges on the ground — or in the air, while you stay close together.'),
      h('div', { class: 'acts' }, btn('Start a new journey', () => { if (confirm('Start over? This journey will be forgotten.')) this.g.newJourney(); }, 'ghost small')),
    );
  }
}

function swatch(o: Outfit): HTMLElement {
  const cols = [o.head.color, o.topColor, o.trim, o.outer?.color ?? o.topColor, o.lowerColor];
  return h('span', { class: 'swatch' }, ...cols.map((c) => h('i', { style: `background:${c}` })));
}

