import { ASSIST_LEVEL, PROFESSORS, THESIS_LEVEL, TOPIC_BY_ID, assist, dayProgress, startThesis, topicsAt, workOnThesis } from '../institutions/research';
import { INSTITUTE_BY_KIND, institutesOf, type InstituteKind } from '../institutions/catalogue';
import { isEmployed, SERVE_PER_DAY, pantryOf, servesWith, stockPantry, COURSE_FEE, DAILY_INCOME, EXPERTS, EXPERT_BY_ID, SITE_BY_ID, assignStaff, buildStage, candidates, employ, freelanceFee, hireOf, instituteAt, intern, isBuilding, kindFood, landScience, learnerLevel, standingStage, takeCourse, teachClass, teachLearner, wage, type Staff } from '../institutions/institutions';
import { hasMet, needSpot, DAY_COINS, FLOOR_COST, MAX_FLOORS, NEED_LABEL, PEOPLE_IN_NEED, PERSON_BY_ID, buildFloor, daysLeft, floorBuilding, floorsOf, giftsFor, give, homeCapacity, ownedHomes, ownsHome, residentsOf, sponsorOf, takeHome, type Person } from '../charity/charity';
import * as THREE from 'three';
import { FIELD_BY_ID, FIELD_ROWS, barnCount, buyField, fieldGrowTime, fieldGrowth, fieldYield, harvestField, plantField, setHand, takeFromBarn, waterField, type Hand } from '../economy/fields';
import { addRoute, bestMarkets, destLabel, destLand, homeDest, marketDest, pantryDest, removeRoute, shipmentOf, tripMinutes } from '../economy/supply';
import { WORKER_BY_ID, roleTitle, workersOf, type Role, type Worker } from '../economy/workers';
import { HAND_HOURS, helpedToday, hurry, hurryShare, type Project } from '../economy/crews';
import { harbours, hasHarbour } from '../world/harbours';
import { ferryFare } from '../travel/ferry';
import { airDestinations, airFare, airPointAtStop, skyPadPoint, type AirPoint } from '../travel/air';
import { RANKS, doGig, gigsFor, jobsIn, shiftPay, titleAt, workShift, workedToday } from '../economy/services';
import { buySeed } from '../housing/housing';
import { DESIGN_LANDS, LEVELS, MAX_LEVEL, buildCost, buildDesign, designOf, designsOf, houseOn, levelOf, upgradeCost, upgradeHouse } from '../housing/designs';
import type { Animal } from '../animals/Animals';
import { SPECIES } from '../animals/AnimalModel';
import { OUTFITS, outfitsFor } from '../characters/outfits';
import { DRESS_GROUPS, dressGroup, type DressGroup } from '../characters/wardrobe';
import { choicesFor, dressable, outfitOf } from '../caravan/dress';
import { TOUR, TOUR_BY_ID, currentStep, later, setTour, tourProgress } from '../guide/tour';
import { EVENT_TEXT, SEASON_ICON, SEASON_NAME, seasonOf } from '../world/seasons';
import { LAND_PAGES } from '../guide/lands';
import { WHOSE, familyName, giveToParents, lastLetter, parentsHome, parentsIn, visitedToday } from '../housing/parents';
import type { Outfit } from '../characters/modesty';
import { dayOf, type VanSlot } from '../core/state';
import { SKY_PAUSED, TIMES, TIME_LABEL, nextTime, timeOfDay } from '../core/time';
import { BAG_CAP, bagRoom, canCraft, count, level, loadOf } from '../economy/economy';
import { ITEMS, LEVEL_XP, RECIPES, SKILLS, type SkillId } from '../economy/items';
import { CROPS, DECOR, DECOR_BY_ID, PLOT_BY_ID, SEED_SHOP, seedPrice } from '../housing/housing';
import { SLOT_NAMES, VAN_OPTIONS } from '../housing/VanInterior';
import type { Npc } from '../npc/Npcs';
import { PEOPLE_BY_ID } from '../npc/people';
import { friendDef } from '../social/friends';
import { mealsIn, putAway, storeCap, storeOf, storeRoom, takeOut } from '../economy/storage';
import { dayLearning, daysOutOfTouch, inTouch, trainingOf } from '../charity/upskill';
import { wantedCrafts } from '../guide/objectives';
import { QUESTS } from '../quests/quests';
import { REPLY_OPTIONS } from '../social/Messages';
import { HOME_PRICE, PLOTS, type PlotSite } from '../housing/housing';
import { prologue } from '../story/prologue';
import { features, objectives, type Card } from '../story/intro';
import { WONDERS, foundWonder, wonderHint, wonderPos } from '../world/wonders';
import { VEHICLES, type VehicleId } from '../vehicles/vehicles';
import { GRID_COLS, GRID_ROWS, REGIONS, REGION_BY_ID, regionCenter, type RegionId, type RegionSpec } from '../world/regions';
import { busFare, type BusStop } from '../travel/bus';
import { PENTHOUSE_PRICE, ownsPenthouse } from '../housing/penthouses';
import { TRAM_FARE, TRAM_MINUTES, TRAM_NAME, TRAM_TOWNS, tramStops, type TramStop } from '../travel/streetTram';
import { INSTITUTE_SITES } from '../institutions/sites';
import { certificatesOf, rankCap } from '../institutions/certificates';
import { BENCH_FEE, PRODUCT_BY_INVENTION, bestMarkets as bestProductMarkets, manufacture, productPrice, sellProduct, workshopAt } from '../economy/manufacture';
import { USES, placeName, placesFor, putToUse } from '../economy/inventions';
import { MANAGER, TRADES, TRADE_IDS, canBegin, candidatesFor, clientsOf, firstHire, handOut, homesWithRoom, isPaid, managerBlock, memberLevel, monthlyWage, orderPay, perDay, personName, stageOf, startBusiness, takeOn, takeOrder, teachMember, appoint, payWage, letGo, businessTitle } from '../economy/business';
import { courseCost, courseOffer, payWithCourse } from '../institutions/opportunities';
import { CAVES, CAVE_NAME, caveMouth } from '../world/caves';
import { CIVIC_LABEL, civicDoor, civicOf } from '../world/neighbourhood';
import { FIELD_SITES } from '../world/plots';
import type { Game } from '../Game';
import { btn, h } from './dom';
import { DiaryPanel } from './DiaryPanel';
import { dayKey, entryOn, streak } from '../diary/diary';
import { AccountPanel } from './AccountPanel';

type Panel = 'guidebook' | 'finder' | 'work' | 'harbour' | 'bus' | 'tram' | 'air' | 'field' | 'institute' | 'care' | 'wardrobe' | 'bag' | 'journal' | 'map' | 'messages' | 'vehicles' | 'dialogue' | 'animal' | 'build' | 'van' | 'house' | 'farm' | 'market' | 'help' | 'homes' | 'houses' | 'property' | 'diary' | 'account' | null;

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
  /** Who the dressing room is dressing: the two, or a brother, sister or child (their caravan id). */
  wardrobeWho: string = 'girl';
  private wardrobeGroup: DressGroup = 'all';
  private wardrobeQuery = '';
  private vanSlot: VanSlot = 'rug';
  /** The van's menu tucked away (the van stays open), so the room can be seen whole. */
  private vanHidden = false;
  /** The room's menu tucked away inside someone's house, so the room can be seen whole. */
  private houseHidden = false;
  private propertySite: PlotSite | null = null;
  private storyOpen = false;
  private mapSel: RegionId | null = null;
  private hudTimer = 0;
  /** Grandmother Sarvatara's letter (the guided tour, guide/tour.ts): which one shows, folded or open. */
  private tourEl = h('div', { class: 'tour', role: 'complementary', 'aria-label': 'A letter from Grandmother Sarvatara' });
  private tourId = '';
  private tourFolded = false;
  private tourTimer = 0;
  private guideTab: 'letters' | 'how' | 'lands' = 'letters';
  private labelEls = new Map<string, HTMLElement>();
  private bubbleEls: HTMLElement[] = [];

  constructor(private g: Game) {
    this.diary = new DiaryPanel(g, () => this.render());
    this.account = new AccountPanel(g, () => this.render());
    document.body.append(this.root);
    this.root.append(this.labels, this.tl, this.tr, this.tracker, this.feed, this.prompt, this.dock, this.panelEl, this.card, this.flash, this.title);
    this.root.append(this.touchActions, this.tourEl);
    this.buildTouchActions();
    this.buildDock();
    this.buildTitle();
    g.bus.on('toast', ({ text, kind }) => this.toast(text, kind ?? 'info'));
    g.bus.on('diary:nudge', ({ text }) => {
      const el = h('div', { class: 'toast diary-nudge' }, h('p', {}, text), h('div', { class: 'acts' }, btn('📔 Write', () => { el.remove(); this.open('diary'); }, 'small primary'), btn('Later', () => el.remove(), 'small ghost')));
      this.feed.prepend(el);
      setTimeout(() => el.classList.add('out'), 14000);
      setTimeout(() => el.remove(), 14600);
    });
    g.bus.on('message:received', ({ npcId, text }) => this.notify(npcId, text));
    g.bus.on('region:entered', ({ regionId, first }) => this.titleCard(REGION_BY_ID[regionId as RegionId], first));
    for (const e of ['quest:started', 'quest:progress', 'quest:completed', 'item:gained', 'item:crafted'] as const) g.bus.on(e, () => this.refreshTracker());
    this.refreshTracker();
  }

  /** Top edge of the bottom sheet in px (the screen height when no sheet is open). */
  sheetTop(): number {
    return this.panelEl.classList.contains('sheet') && this.panelEl.classList.contains('show') ? this.panelEl.getBoundingClientRect().top : innerHeight;
  }

  /** The panel that is open, if any. */
  get panelId(): string | null {
    return this.panel;
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
    const keys: Array<[string, Panel]> = [['c', 'wardrobe'], ['i', 'bag'], ['j', 'journal'], ['m', 'map'], ['n', 'messages'], ['v', 'vehicles'], ['h', 'help'], ['l', 'homes'], ['k', 'care'], ['u', 'work'], ['y', 'finder'], ['q', 'diary']];
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
    this.tourTimer -= dt;
    if (this.tourTimer <= 0) { this.tourTimer = 0.5; this.renderTour(); }
  }

  /**
   * Grandmother Sarvatara's letter, bottom left: why the next thing matters and how to do it, "Show me"
   * (the right panel, or the golden trail to the right place), "Later", and a fold to a small pill.
   * It steps aside while a panel, a story, a cutscene or a room is open, and thanks them when a
   * step is done.
   */
  private renderTour(): void {
    const g = this.g, st = g.st;
    const away = !g.started || this.modal || !!g.cutscene || g.inHouse || g.inVan;
    this.tourEl.hidden = away;
    if (away) return;
    const step = currentStep(st), id = step?.id ?? '';
    if (id === this.tourId && this.tourEl.dataset.folded === String(this.tourFolded)) return;
    const prev = TOUR_BY_ID[this.tourId];
    if (prev && prev.done(st)) {
      const p = tourProgress(st);
      this.toast(`💛 ${prev.icon} ${prev.title} — done. Grandmother Sarvatara would be so proud. (${p.done} of ${p.of})`, 'reward');
      this.tourFolded = false;
    }
    this.tourId = id;
    this.tourEl.dataset.folded = String(this.tourFolded);
    if (!step) { this.tourEl.replaceChildren(); this.tourEl.hidden = true; return; }
    const p = tourProgress(st);
    if (this.tourFolded) {
      this.tourEl.replaceChildren(btn(`✉ ${step.icon} ${step.title}`, () => { this.tourFolded = false; this.renderTour(); }, 'tour-pill'));
      return;
    }
    const show = () => {
      const sm = step.show;
      if (!sm) return;
      if ('panel' in sm) { this.open(sm.panel); return; }
      const e = g.showTourPlace(sm.place);
      this.toast(e ?? '✨ Follow the golden motes — they lead the way.', e ? 'info' : 'reward');
      this.tourFolded = true;
      this.renderTour();
    };
    const fold = btn('✕', () => { this.tourFolded = true; this.renderTour(); }, 'tour-fold');
    fold.setAttribute('aria-label', 'Fold the letter');
    this.tourEl.replaceChildren(
      fold,
      h('div', { class: 'eyebrow' }, `A letter from Grandmother Sarvatara · ${p.done + 1} of ${p.of}`),
      h('h3', {}, `${step.icon} ${step.title}`),
      // She writes to Fathima by her pet name, Shumaela (owner, 2026-09-30), and to him by his.
      h('p', { class: 'letter' }, `My dear Shumaela, and dear ${st.names.boy.trim().split(/\s+/).pop()}: ${step.letter}`),
      h('p', { class: 'how' }, step.how),
      h('div', { class: 'acts' },
        step.show ? btn('Show me', show, 'small primary') : null,
        btn('Later', () => { later(st, step.id); this.renderTour(); }, 'small ghost'),
        btn('Guidebook', () => { this.guideTab = 'letters'; this.open('guidebook'); }, 'small ghost')));
  }

  /**
   * The guidebook: every letter of the tour and how far along they are; how each part of the
   * journey works; and a page for each land — what to see, whom to meet, what to learn there.
   */
  private guidebook(body: HTMLElement): void {
    const g = this.g, st = g.st;
    const tabs = h('div', { class: 'seg', role: 'tablist' },
      ...([['letters', '✉ Letters'], ['how', '📜 How things work'], ['lands', '🗺️ The lands']] as const).map(([id, label]) =>
        btn(label, () => { this.guideTab = id; this.render(); }, this.guideTab === id ? 'on' : '')));
    body.append(tabs);
    if (this.guideTab === 'letters') {
      const p = tourProgress(st);
      body.append(h('p', { class: 'dim' }, `Grandmother Sarvatara's letters walk you through the journey, one thing at a time. ${p.done} of ${p.of} done.`));
      for (const s of TOUR) {
        const done = s.done(st), now = currentStep(st)?.id === s.id;
        const card = h('div', { class: `quest ${done ? '' : now ? 'main' : ''}` },
          h('b', {}, `${done ? '✓' : s.icon} ${s.title}`), h('p', { class: 'story' }, s.letter), h('small', {}, s.how));
        if (!done && s.show) card.append(h('div', { class: 'acts' }, btn('Show me', () => {
          const sm = s.show!;
          if ('panel' in sm) this.open(sm.panel);
          else { const e = g.showTourPlace(sm.place); this.toast(e ?? '✨ Follow the golden motes — they lead the way.', e ? 'info' : 'reward'); this.closePanel(); }
        }, 'small')));
        body.append(card);
      }
      body.append(h('div', { class: 'acts' },
        st.tour.off || st.tour.later.length
          ? btn('Bring back all the letters', () => { setTour(st, true); this.tourFolded = false; this.render(); }, 'small primary')
          : btn('Put the letters away', () => { setTour(st, false); this.render(); }, 'small ghost')));
      return;
    }
    if (this.guideTab === 'how') {
      for (const [icon, title, text] of HOW_IT_WORKS) body.append(h('div', { class: 'quest' }, h('b', {}, `${icon} ${title}`), h('p', { class: 'story' }, text)));
      return;
    }
    body.append(h('p', { class: 'dim' }, `Twenty lands, each with its own sky, its own science and its own people. You have found ${st.discovered.length}.`));
    const list = (label: string, xs: string[]) => xs.length ? h('small', {}, h('b', {}, `${label} `), xs.join(' · ')) : null;
    for (const lp of LAND_PAGES) {
      const known = st.discovered.includes(lp.id);
      body.append(h('div', { class: `quest ${known ? 'main' : ''}` },
        h('b', {}, `${known ? '' : '🔒 '}${lp.name}`), h('small', { class: 'dim' }, lp.subtitle),
        list('Keeper:', [`${lp.keeper.name} (${lp.keeper.role.replace('Keeper · ', '')}) teaches ${lp.keeper.craft}`]),
        list('Learn:', [lp.science]),
        list('See:', [lp.monument, ...(lp.dragon ? [lp.dragon] : [])]),
        list('Pets waiting:', lp.pets),
        list('Animals:', lp.animals),
        list('Fields grow:', lp.crops),
        list('Glad to receive:', lp.wanted),
        known ? h('div', { class: 'acts' }, btn('Travel there', () => { g.travelTo(lp.id); this.closePanel(); }, 'small ghost')) : null));
    }
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

  /** The diary's note under the land's name (kept, so a click is never lost to a redraw). */
  private diaryChip = btn('📔', () => this.open('diary'), 'diary-chip');

  private renderHud(): void {
    const g = this.g, st = g.st;
    // The diary calls softly until today's page is written (diary/diary.ts): a glowing note under
    // the land's name and a pulsing book in the dock; once written, the streak shows instead.
    const today = dayKey(new Date()), written = !!entryOn(st.diary, today), run = streak(st.diary, today);
    const calling = g.started && !written && st.playSeconds > 20;
    const chip = this.diaryChip;
    chip.textContent = calling
      ? `📔 ${new Date().getHours() >= 17 ? 'How was your day? Your page is waiting' : 'Today\'s page is waiting'}${run ? ` · 🔥 ${run}` : ''}`
      : `📔 🔥 ${run} day${run > 1 ? 's' : ''}`;
    chip.classList.toggle('calling', calling);
    const diaryChip = calling || (written && run > 0) ? chip : null;
    this.tl.replaceChildren(
      h('div', { class: 'region' }, g.region.name),
      h('div', { class: 'sub' }, g.region.subtitle),
      h('div', { class: 'names' }, `${st.names.girl} ✦ ${st.names.boy}`),
      ...(diaryChip ? [diaryChip] : []),
    );
    this.dock.querySelector('[data-p="diary"]')?.classList.toggle('calling', calling);
    const mode = VEHICLES[g.trav.mode], season = seasonOf(dayOf(st.minutes) - 1);
    const showEnergy = g.trav.mode === 'fly' || g.trav.mounted || g.trav.energy < 0.99;
    this.tr.replaceChildren(...[
      h('div', { class: 'row' }, this.clockText(`${g.sky.night > 0.5 ? '🌙' : SEASON_ICON[season]} ${SEASON_NAME[season]} · Day ${dayOf(st.minutes)} · ${clock(st.minutes)}${g.weatherNow !== 'none' ? ` ${EVENT_TEXT[g.weatherNow].icon}` : ''}${st.flags.includes(SKY_PAUSED) ? ' ⏸' : ''}`)),
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
    const p = friendDef(npcId);
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
    // Until the world's shaders are ready (Game.warmUp) the way in waits, so it opens smoothly.
    const label = fresh ? 'Begin the journey' : 'Continue the journey';
    const begin = btn('✨ Preparing the world…', go, 'primary', true);
    this.g.bus.on('world:ready', () => { begin.disabled = false; begin.textContent = label; });
    this.title.append(
      h('div', { class: 'inner' },
        h('div', { class: 'eyebrow' }, 'A journey for two'),
        h('h1', {}, 'The Golden Thread'),
        h('p', {}, 'Travel the world together. Help whoever you meet. Light the lanterns of twenty lands.'),
        fresh ? h('div', { class: 'names-in' }, h('label', {}, 'Her', girl), h('span', { class: 'gold' }, '✦'), h('label', {}, 'His', boy)) : h('p', { class: 'dim' }, `${st.names.girl} and ${st.names.boy} · Day ${dayOf(st.minutes)} · ${st.lanterns.length} lanterns lit`),
        h('div', { class: 'acts' },
          begin,
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
    const items: Array<[Panel, string, string]> = [['wardrobe', '👗', 'Dressing room (C)'], ['bag', '🎒', 'Bag & crafts (I)'], ['journal', '📖', 'Journal (J)'], ['map', '🗺️', 'Map (M)'], ['messages', '💌', 'Messages (N)'], ['vehicles', '🚐', 'Travel (V)'], ['homes', '🏡', 'Homes & land (L)'], ['care', '🤲', 'Care & sponsorship (K)'], ['finder', '🔎', 'People finder (Y)'], ['work', '💼', 'Work & services (U)'], ['guidebook', '📜', 'Guidebook'], ['diary', '📔', 'My diary (Q)'], ['account', '👤', 'Sign in · players'], ['help', '❔', 'Help (H)']];
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
    if (this.panel === 'van') { this.g.inVan = false; this.vanHidden = false; }
    if (this.panel === 'house') this.g.inHouse = false;
    if (this.panel === 'property') this.g.plotsView.selected = null;
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

  private farmBed: { plotId: string; decorId: string } | null = null;
  private marketLand: RegionId = 'meadow';
  private farmNote = '';

  openFarm(plotId: string, decorId: string): void {
    this.farmBed = { plotId, decorId };
    this.farmNote = '';
    this.open('farm');
  }

  openMarket(land: RegionId): void {
    this.marketLand = land;
    this.farmNote = '';
    this.open('market');
  }

  /** A farm bed: what grows, how far along, and what you can do — plant, water, harvest. */
  private farmPanel(body: HTMLElement): void {
    const g = this.g, st = g.st, b = this.farmBed;
    const d = b && st.plots[b.plotId]?.decor.find((x) => x.id === b.decorId);
    if (!b || !d) return;
    if (d.crop) {
      const cd = CROPS[d.crop.seed], gr = g.housing.growth(d), out = ITEMS[cd.out];
      body.append(h('p', {}, `${out.icon} ${out.name} — ${gr >= 1 ? 'ripe and ready!' : `${Math.round(gr * 100)}% grown`}${d.crop.watered ? ' · watered' : ''}`),
        h('div', { class: 'meter' }, h('i', { style: `inline-size:${Math.round(gr * 100)}%` })),
        h('div', { class: 'acts' },
          btn(`🧺 Harvest ${cd.qty}× ${out.icon}`, () => { this.farmNote = g.harvestBed(b.plotId, b.decorId); this.render(); }, gr >= 1 ? 'primary' : 'ghost', gr < 1),
          btn('💧 Water', () => { this.farmNote = g.waterBed(b.plotId, b.decorId); this.render(); }, 'ghost', !!d.crop.watered || gr >= 1)));
    } else {
      const seeds = Object.keys(CROPS).filter((k) => (st.inventory[k] ?? 0) > 0);
      body.append(h('p', {}, 'An empty bed, dug and ready. What shall we grow?'));
      body.append(seeds.length
        ? h('div', { class: 'acts' }, ...seeds.map((k) => btn(`${ITEMS[CROPS[k].out].icon} ${ITEMS[k].name} ×${st.inventory[k]}`, () => { this.farmNote = g.plantBed(b.plotId, b.decorId, k); this.render(); }, 'ghost')))
        : h('p', { class: 'dim' }, 'You have no seeds. Stallholders at every town market sell their land\'s seeds; you can also make flower, herb, rice and wheat seed with Gardening (I).'));
    }
    if (this.farmNote) body.append(h('p', { class: 'story' }, this.farmNote));
  }

  /** A market stall: this land's seeds to buy, and your produce and goods to sell. */
  private marketPanel(body: HTMLElement): void {
    const g = this.g, st = g.st, land = this.marketLand;
    body.append(h('h3', {}, `Seeds of ${REGION_BY_ID[land].name}`),
      h('div', { class: 'acts' }, ...SEED_SHOP[land].map((k) => btn(`${ITEMS[CROPS[k].out].icon} ${ITEMS[k].name} · 🪙${seedPrice(k)}`, () => { this.farmNote = g.buySeed(k); this.render(); }, 'ghost', st.coins < seedPrice(k)))));
    const sellable = Object.entries(st.inventory).filter(([k, n]) => n > 0 && ['crop', 'food', 'good'].includes(ITEMS[k]?.kind));
    body.append(h('h3', {}, 'Sell your harvest and your makings'),
      sellable.length
        ? h('div', { class: 'acts' }, ...sellable.map(([k, n]) => btn(`${ITEMS[k].icon} ${ITEMS[k].name} ×${n} · 🪙${g.priceHere(k)}`, () => { const got = g.sell(k); this.farmNote = got ? `Sold for ${got} coins.` : ''; this.render(); }, 'small ghost')))
        : h('p', { class: 'dim' }, 'Nothing to sell yet — grow something, or cook what you grow (dishes fetch more).'));
    if (this.farmNote) body.append(h('p', { class: 'story' }, this.farmNote));
  }

  private diary!: DiaryPanel;
  private account!: AccountPanel;
  private houseNote = '';
  openHouse(_d: unknown): void {
    this.houseNote = '';
    this.houseHidden = false;
    this.open('house');
  }

  private housePanel(body: HTMLElement): void {
    const g = this.g, d = g.house.door;
    if (!d) return;
    if (d.kind === 'home') return this.homePanel(body, d.id.slice(5));
    if (d.kind === 'penthouse') {
      const own = ownsPenthouse(g.st, d.id);
      body.append(h('p', { class: 'dim' }, own
        ? 'Your penthouse: the glass pavilion, the pool, the pergola and the whole city below. Rest here whenever you are in New Yonder.'
        : `The lift opens onto a glass pavilion high above New Yonder: a pool on the terrace, a pergola grown with vines, the city all round. It can be yours for ${PENTHOUSE_PRICE} coins.`),
        h('div', { class: 'acts' },
          own ? null : btn(`🏙️ Buy it — ${PENTHOUSE_PRICE} coins`, () => { this.houseNote = g.buyPenthouse(d.id); this.render(); }, 'primary', g.st.coins < PENTHOUSE_PRICE),
          own ? btn('🌅 Rest until morning', () => { g.setTimeOfDay('dawn'); this.houseNote = 'You rest — each in your own room — and wake to the sun on the towers.'; this.render(); }, 'primary') : null,
          own ? btn('🌙 Stay until night', () => { g.setTimeOfDay('night'); this.houseNote = 'The city lights up below the terrace.'; this.render(); }, 'ghost') : null,
          btn('🚪 Take the lift down', () => g.exitHouse(), 'ghost')));
      if (this.houseNote) body.append(h('p', { class: 'story' }, this.houseNote));
      if (own) { body.append(h('h3', {}, '🛋️ Make it yours')); this.decorSection(body, `penthouse:${d.id}`); }
      return;
    }
    if (d.kind === 'institute' || d.kind === 'cavern') {
      body.append(h('p', { class: 'dim' }, d.kind === 'cavern' ? 'Your lanterns light the cavern: crystal and stone, and the sound of water somewhere below.' : 'Students at their benches, the masters at work, and the smell of ink and tea.'),
        h('div', { class: 'acts' },
          d.kind === 'institute' ? btn('🏛️ Learn, research and run things here', () => this.openInstitute(d.id.split(':')[1]), 'primary') : null,
          btn('🚪 Step outside', () => g.exitHouse(), 'ghost')));
      return;
    }
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
    const titles: Record<string, string> = { guidebook: 'Guidebook', wardrobe: 'Dressing room', bag: 'Bag & Crafts', journal: 'Journal', map: 'The World', messages: 'Messages', vehicles: 'Ways to Travel', dialogue: '', animal: '', build: 'Build', van: 'Inside Safar', house: this.g.houseTitle(), farm: 'Farm bed', market: 'Market stall', help: 'How to play', care: 'Care & sponsorship', institute: this.instituteTitle(), field: this.fieldTitle(), work: `Work in ${this.g.region.name}`, finder: 'People finder', harbour: `The harbour of ${REGION_BY_ID[this.harbourLand]?.name ?? ''}`, bus: `Bus stop · ${this.busStop ? REGION_BY_ID[this.busStop.land].name : ''}`, tram: `Tram stop · ${this.tramStop ? `${this.tramStop.name}, ${REGION_BY_ID[this.tramStop.land].name}` : ''}`, air: 'Air taxi · the Sky Isles', homes: 'Homes & Land', houses: 'Build a house', property: 'Land for sale', diary: 'My Diary', account: this.g.player ? `👤 ${this.g.player}` : 'Sign in' };
    const head = this.panel === 'van'
      ? h('header', {}, h('h2', {}, titles.van),
        h('span', { class: 'head-acts' },
          btn(this.vanHidden ? '▴ Show' : '▾ Hide', () => { this.vanHidden = !this.vanHidden; this.render(); }, 'small ghost'),
          btn('✕', () => this.g.exitVan(), 'close')))
      : this.panel === 'house'
        ? h('header', {}, h('h2', {}, titles.house),
          h('span', { class: 'head-acts' },
            btn(this.houseHidden ? '▴ Show' : '▾ Hide', () => { this.houseHidden = !this.houseHidden; this.render(); }, 'small ghost'),
            btn('✕', () => this.g.exitHouse(), 'close')))
        : h('header', {}, h('h2', {}, titles[this.panel ?? ''] ?? ''), btn('✕', () => this.closePanel(), 'close'));
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
      case 'farm': this.farmPanel(body); break;
      case 'market': this.marketPanel(body); break;
      case 'help': this.help(body); break;
      case 'guidebook': this.guidebook(body); break;
      case 'homes': this.homes(body); break;
      case 'houses': this.houseCatalogue(body); break;
      case 'care': this.carePanel(body); break;
      case 'institute': this.institutePanel(body); break;
      case 'field': this.fieldPanel(body); break;
      case 'harbour': this.harbourPanel(body); break;
      case 'bus': this.busPanel(body); break;
      case 'tram': this.tramPanel(body); break;
      case 'air': this.airRows(body, skyPadPoint()); break;
      case 'work': this.workPanel(body); break;
      case 'finder': this.finderPanel(body); break;
      case 'property': this.property(body); break;
      case 'diary': this.diary.render(body); break;
      case 'account': this.account.render(body); break;
      default: return this.closePanel();
    }
    this.panelEl.replaceChildren(head, body);
    const sheet = this.panel === 'wardrobe' || this.panel === 'van' || this.panel === 'house';
    this.panelEl.className = `panel show p-${this.panel}${sheet ? ' sheet' : ''}${(this.panel === 'van' && this.vanHidden) || (this.panel === 'house' && this.houseHidden) ? ' tucked' : ''}`;
    this.root.classList.toggle('sheet-open', sheet);
  }

  private wardrobe(body: HTMLElement): void {
    const st = this.g.st;
    const family = dressable(st);
    // Someone who has gone home (or left) can no longer be dressed here.
    if (this.wardrobeWho !== 'girl' && this.wardrobeWho !== 'boy' && !family.some((f) => f.id === this.wardrobeWho)) this.wardrobeWho = 'girl';
    const who = this.wardrobeWho, hero = who === 'girl' || who === 'boy';
    const kin = hero ? null : family.find((f) => f.id === who)!;
    const worn = hero ? OUTFITS[st.outfits[who as 'girl' | 'boy']] : outfitOf(st, who);
    const top = h('div', { class: 'sheet-row' },
      h('div', { class: 'seg', role: 'tablist' },
        btn(`${st.names.girl}`, () => { this.wardrobeWho = 'girl'; this.render(); }, who === 'girl' ? 'on' : ''),
        btn(`${st.names.boy}`, () => { this.wardrobeWho = 'boy'; this.render(); }, who === 'boy' ? 'on' : ''),
        ...family.map((f) => btn(`${f.kind === 'child' ? '🧒 ' : ''}${f.name}`, () => { this.wardrobeWho = f.id; this.render(); }, who === f.id ? 'on' : ''))),
      worn ? h('div', { class: 'worn' }, h('b', {}, worn.name), h('small', {}, worn.culture), worn.merged.length ? h('small', { class: 'merged' }, `+ ${worn.merged.join(', ')}`) : null) : null,
    );
    const search = h('input', { type: 'search', placeholder: 'Search outfits', 'aria-label': 'Search outfits', value: this.wardrobeQuery }) as HTMLInputElement;
    const chips = h('div', { class: 'chips' }, search, ...DRESS_GROUPS.map(([id, label]) =>
      btn(label, () => { this.wardrobeGroup = id; this.render(); }, `small ${this.wardrobeGroup === id ? 'on' : 'ghost'}`)));
    const shelf = h('div', { class: 'shelf', role: 'list' });
    const fill = () => {
      const q = this.wardrobeQuery.trim().toLowerCase();
      const pool = kin ? choicesFor(kin) : outfitsFor(who as 'girl' | 'boy');
      const list = pool.filter((o) => (this.wardrobeGroup === 'all' || dressGroup(o) === this.wardrobeGroup)
        && (!q || `${o.name} ${o.culture}`.toLowerCase().includes(q)));
      shelf.replaceChildren(...list.map((o) => {
        const on = worn?.id === o.id;
        const card = h('button', { class: `outfit ${on ? 'on' : ''}`, type: 'button', role: 'listitem', title: o.note ?? o.name }, swatch(o), h('b', {}, o.name), h('small', {}, o.culture));
        card.addEventListener('click', () => { if (kin) this.g.dressCompanion(kin.id, o.id); else this.g.wear(who as 'girl' | 'boy', o.id); this.render(); });
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
    body.append(h('h3', {}, `Carrying ${loadOf(st.inventory)} / ${BAG_CAP} · 🪙 ${st.coins}`));
    if (bagRoom(st) === 0) body.append(h('p', { class: 'dim' }, 'Your bag is full — anything more goes to the van. Put things away in the van or at a home.'));
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
    this.g.plotsView.selected = site.id;
    this.open('property');
  }

  /** Every piece of land in the world: where it is, its price, and the way there. */
  /** Which plot the house catalogue builds on, and which land's houses it shows. */
  private designPlot = '';
  private designLand: RegionId = 'meadow';

  /**
   * The house catalogue: every kind of house in the world, land by land; choose one and it is
   * built on your land as its bare shell, to be improved a level at a time.
   */
  private houseCatalogue(body: HTMLElement): void {
    const st = this.g.st, site = PLOT_BY_ID[this.designPlot];
    if (!site || !st.plots[site.id]) { body.append(h('p', { class: 'dim' }, 'Choose a plot you own in Homes & land first.')); return; }
    body.append(h('p', { class: 'dim' }, `Any house from any land can stand on your land in ${REGION_BY_ID[site.region].name}. It begins as its shell — walls, roof and door — and you improve it from there: finished, a garden, lit for the evening; and you can add storeys. You have 🪙 ${st.coins} and ${count(st, 'wood')} wood.`));
    const tabs = h('div', { class: 'chips wrap' }, ...DESIGN_LANDS.map((id) => btn(REGION_BY_ID[id].name, () => { this.designLand = id; this.render(); }, `small ${this.designLand === id ? 'primary' : 'ghost'}`)));
    body.append(tabs);
    const now = houseOn(st, site.id);
    const cards = h('div', { class: 'cards' });
    for (const d of designsOf(this.designLand)) {
      const c = buildCost(d), here = now?.design === d.id;
      cards.append(h('div', { class: `quest ${here ? 'main' : ''}` },
        h('b', {}, `🏠 ${d.name}`),
        h('small', {}, `${REGION_BY_ID[d.land].name} · about ${Math.round(d.r * 2)} m across, ${Math.round(d.h)} m high${here ? ' · standing on your land' : ''}`),
        h('div', { class: 'acts' }, btn(here ? 'Built' : `Build · ${c.coins}🪙 + ${c.wood} wood`, () => {
          const e = buildDesign(st, site.id, d.id);
          this.g.toast(e ?? `🏗️ The builders raise the shell of ${d.name.toLowerCase().startsWith('the ') ? d.name : `your ${d.name.toLowerCase()}`} in ${REGION_BY_ID[site.region].name}. Improve it from Homes & land.`, e ? 'info' : 'reward');
          if (!e) { this.g.housingChanged(); this.open('homes'); }
        }, 'small primary', here || st.coins < c.coins || count(st, 'wood') < c.wood))));
    }
    body.append(cards);
  }

  private homes(body: HTMLElement): void {
    const st = this.g.st, hs = this.g.housing;
    body.append(h('p', { class: 'dim' }, `Every land has two plots for sale just outside its town. Buy the bare land and build it yourself, or buy a ready-made home in that land's own style (land + ${HOME_PRICE} coins). You have 🪙 ${st.coins}.`));
    const owned = PLOTS.filter((p) => hs.owns(p.id));
    // Your parents and his: a home each, and a visit whenever you like (housing/parents.ts).
    body.append(h('h3', {}, '👪 Your parents'));
    const fam = h('div', { class: 'cards' });
    for (const w of WHOSE) {
      const home = parentsHome(st, w), letter = lastLetter(st, w);
      fam.append(h('div', { class: `quest ${home ? 'main' : ''}` },
        h('b', {}, familyName(st, w)),
        h('small', {}, home ? `Living in your home in ${REGION_BY_ID[PLOT_BY_ID[home].region].name}${visitedToday(st, w) ? ' · visited today' : ''}` : ownedHomes(st).length ? 'Give them one of your homes below.' : 'Buy or build a home first, then give it to them.'),
        letter ? h('p', { class: 'story' }, `“${letter}”`) : null,
        home ? h('div', { class: 'acts' }, btn(`Visit ${w === 'hers' ? 'her' : 'his'} parents`, () => { const e = this.g.visitParents(w); if (e) this.g.toast(e, 'info'); else this.closePanel(); }, 'small primary')) : null));
    }
    body.append(fam);
    if (owned.length) {
      body.append(h('h3', {}, 'Yours'));
      for (const p of owned) {
        const lives = parentsIn(st, p.id);
        const card = h('div', { class: 'quest main' }, h('b', {}, `🏡 ${REGION_BY_ID[p.region].name}`),
          h('small', {}, `${st.plots[p.id].decor.length} things built · stand on it and press B to build${lives ? ` · ${familyName(st, lives)} live here` : ''}`));
        // The house: any design from any land, improved a level at a time (housing/designs.ts).
        const house = houseOn(st, p.id), design = house ? designOf(house) : undefined, lvl = house ? levelOf(house) : 0;
        if (house) card.append(h('small', {}, `🏠 ${design?.name ?? `${REGION_BY_ID[DECOR_BY_ID[house.kind]?.style ?? p.region].name} house`} · level ${lvl} of ${MAX_LEVEL} — ${LEVELS[lvl - 1].name}`));
        const acts = h('div', { class: 'acts' }, btn('Show the way', () => this.showWay(p, `Your land in ${REGION_BY_ID[p.region].name}`), 'small'));
        acts.append(btn(house ? '🏗️ Build a different house' : '🏗️ Choose a house to build', () => { this.designPlot = p.id; this.designLand = design?.land ?? p.region; this.open('houses'); }, 'small'));
        if (house && lvl < MAX_LEVEL) {
          const c = upgradeCost(lvl + 1);
          acts.append(btn(`⬆️ ${LEVELS[lvl].name} · ${c.coins}🪙 + ${c.wood} wood`, () => {
            const e = upgradeHouse(st, p.id);
            this.g.toast(e ?? `🏠 ${LEVELS[lvl].does}`, e ? 'info' : 'reward');
            if (!e) this.g.housingChanged();
            this.render();
          }, 'small primary', st.coins < c.coins));
        }
        if (ownsHome(st, p.id)) for (const w of WHOSE) if (lives !== w) {
          acts.append(btn(`Give to ${w === 'hers' ? 'her' : 'his'} parents`, () => {
            const e = giveToParents(st, p.id, w);
            this.g.toast(e ?? `🏡 ${familyName(st, w)} move into your home in ${REGION_BY_ID[p.region].name}. Visit them whenever you pass.`, e ? 'info' : 'reward');
            this.render();
          }, 'small ghost', lives !== null));
        }
        card.append(acts);
        body.append(card);
      }
    }
    body.append(h('p', { class: 'dim' }, st.penthouses.length
      ? `🏙️ Your ${st.penthouses.length === 1 ? 'penthouse' : `${st.penthouses.length} penthouses`} above New Yonder — take the lift up from the tower's lobby.`
      : `🏙️ Penthouses crown New Yonder's tallest glass towers: take the lift up from the lobby to look round, and buy one for 🪙 ${PENTHOUSE_PRICE}.`));
    body.append(...this.buildGuide(this.g.region.id));
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

  /**
   * Care & sponsorship (charity/charity.ts): the people in need in this land — sponsor them in
   * coins or in kind, take them into a home you own — everyone in your care, and your homes'
   * floors and residents.
   */
  private carePanel(body: HTMLElement): void {
    const g = this.g, st = g.st, land = g.region.id;
    const act = (fn: () => string | null, ok: string) => { const e = fn(); g.toast(e ?? ok, e ? 'info' : 'reward'); this.render(); };
    const homes = ownedHomes(st);
    const card = (p: Person) => {
      const s = sponsorOf(st, p.id), need = NEED_LABEL[p.kind];
      const row = h('div', { class: `quest ${s ? 'main' : ''}` },
        h('b', {}, `${need.icon} ${p.name}`), h('small', {}, `${need.name} · ${REGION_BY_ID[p.land].name} · needs ${need.needs}`),
        h('p', { class: 'story' }, `“${p.hope}”`));
      if (s) {
        const left = daysLeft(st, s);
        row.append(h('small', {}, `Wellbeing ${Math.round(s.wellbeing)} · ${left > 0 ? `${left.toFixed(1)} days of care paid` : 'waiting on your care'}${s.home ? ` · lives in your home in ${REGION_BY_ID[PLOT_BY_ID[s.home].region].name}` : ''}`),
          h('div', { class: 'meter' }, h('i', { style: `inline-size:${Math.round(s.wellbeing)}%` })));
        // Their learning, paid for by your sponsorship, and whether you are in touch.
        const skill = trainingOf(s), lv = learnerLevel(st, p.id, skill), xp = st.learners[p.id]?.[skill] ?? 0;
        const next = LEVEL_XP[lv + 1], prev = LEVEL_XP[lv], pct = next ? Math.round(((xp - prev) / (next - prev)) * 100) : 100;
        const away = Math.floor(daysOutOfTouch(st, s));
        row.append(h('small', {}, `📚 Learning ${SKILLS[skill].icon} ${SKILLS[skill].name} (their choice) · level ${lv}${next ? ` · ${pct}% to the next` : ''} · +${dayLearning(st, s)} a day${s.home ? ' (faster in your home)' : ''}`),
          h('small', { class: inTouch(st, s) ? '' : 'warn' }, inTouch(st, s)
            ? `📇 Their contact is in your messages · last in touch ${away ? `${away} day${away > 1 ? 's' : ''} ago` : 'today'}`
            : `📇 Not in touch for ${away} days — they learn at half the pace. Visit, write, or give to them.`));
        row.append(h('div', { class: 'acts' }, btn('✉ Write to them', () => { this.msgFriend = p.id; this.open('messages'); }, 'small ghost')));
      }
      const acts = h('div', { class: 'acts' },
        btn(`${s ? 'Give' : 'Sponsor'} a day · ${DAY_COINS}🪙`, () => act(() => give(st, p.id, { coins: DAY_COINS }), `${p.name} is cared for today.`), 'small primary', st.coins < DAY_COINS),
        btn(`A week · ${DAY_COINS * 7}🪙`, () => act(() => give(st, p.id, { coins: DAY_COINS * 7 }), `A week of care for ${p.name}.`), 'small ghost', st.coins < DAY_COINS * 7),
        ...giftsFor(st, p.id).slice(0, 3).map((gf) => btn(`${ITEMS[gf.item].icon} ${ITEMS[gf.item].name} · +${gf.days} day${gf.days === 1 ? '' : 's'}`, () => act(() => give(st, p.id, { item: gf.item }), `${p.name} thanks you for the ${ITEMS[gf.item].name.toLowerCase()}.`), 'small ghost')));
      // Pay in opportunities: a place on a course at an institute here, instead of coins.
      const site = s ? INSTITUTE_SITES.find((q) => q.land === land && courseCost(st, q.id) !== null) : undefined;
      if (s && site) acts.append(btn(courseOffer(st, p.id, site.id), () => act(() => payWithCourse(st, p.id, site.id), `${p.name} starts a course.`), 'small ghost'));
      if (s) for (const hid of homes) if (s.home !== hid) {
        const room = residentsOf(st, hid).length < homeCapacity(st, hid);
        acts.append(btn(`🏡 Take home to ${REGION_BY_ID[PLOT_BY_ID[hid].region].name}${room ? '' : ' (full)'}`, () => act(() => takeHome(st, p.id, hid), `${p.name} moves into your home.`), 'small ghost', !room));
      }
      row.append(acts);
      return row;
    };
    body.append(h('p', { class: 'dim' }, `Sponsor people in need with coins (🪙 ${st.coins}) or in kind — meals, blankets, balms, lamps. Cared for, they grow in wellbeing; in your own home, faster. Each has a hope you may one day help them reach.`));
    const here = PEOPLE_IN_NEED.filter((p) => p.land === land), known = here.filter((p) => hasMet(st, p.id));
    body.append(h('h3', {}, `In ${REGION_BY_ID[land].name}`), ...known.map(card));
    if (known.length < here.length) body.append(h('p', { class: 'dim' }, `${here.length - known.length} more ${here.length - known.length > 1 ? 'people' : 'person'} in need here, not met yet — look along the avenues for someone with a soft rose glow above them, and stop to talk. (🔎 People finder, Y)`));
    const elsewhere = st.sponsored.filter((s) => PERSON_BY_ID[s.id] && PERSON_BY_ID[s.id].land !== land);
    if (elsewhere.length) body.append(h('h3', {}, 'In your care elsewhere'), ...elsewhere.map((s) => card(PERSON_BY_ID[s.id])));
    body.append(h('h3', {}, 'Your homes'));
    if (!homes.length) body.append(h('p', { class: 'dim' }, 'Buy a home (🏡 Homes & land) to take people in and build more floors for more of them.'));
    for (const hid of homes) {
      const building = floorBuilding(st, hid), floors = floorsOf(st, hid), res = residentsOf(st, hid);
      body.append(h('div', { class: 'quest' },
        h('b', {}, `🏡 ${REGION_BY_ID[PLOT_BY_ID[hid].region].name} · ${floors + 1} storey${floors ? 's' : ''}`),
        h('small', {}, `Room for ${homeCapacity(st, hid)} · living here: ${res.length ? res.map((r) => PERSON_BY_ID[r.id]?.name).join(', ') : 'no one yet'}${building ? ` · a floor is being built (${Math.max(0, (building - st.minutes) / 60).toFixed(1)} h left)` : ''}`),
        floors >= MAX_FLOORS ? h('small', { class: 'dim' }, 'All the floors it can take.') : h('div', { class: 'acts' },
          btn(`Build a floor · ${FLOOR_COST.coins.coins}🪙 + ${FLOOR_COST.coins.items.wood} wood`, () => act(() => buildFloor(st, hid, 'coins'), 'The builders begin — the floor will be ready in a day.'), 'small primary', !!building),
          btn(`Pay in kind · ${FLOOR_COST.kind.items.wood} wood + ${FLOOR_COST.kind.food} food for the builders`, () => act(() => buildFloor(st, hid, 'kind'), 'The builders begin, fed from your stores — ready in a day.'), 'small ghost', !!building))));
      if (building) this.hurryRow(body, { kind: 'floor', plot: hid }, PLOT_BY_ID[hid].region);
    }
  }

  /** Speed up something being built: lend a hand yourselves, or put the land's builder to work. */
  private hurryRow(body: HTMLElement, p: Project, land: RegionId): void {
    const g = this.g, st = g.st, [b] = workersOf(land, 'builder');
    const go = (who: string, ok: string) => { const e = hurry(st, p, who); g.toast(e ?? ok, e ? 'info' : 'reward'); g.institutesView.update(); this.render(); };
    const hired = isEmployed(st, b.id);
    body.append(h('div', { class: 'acts' },
      btn(`🧱 Lend a hand · ${HAND_HOURS} h · saves ${Math.round(hurryShare('you', level(st, 'building')) * 100)}% of what is left`, () => go('you', 'You work alongside the builders — and learn.'), 'small ghost', helpedToday(st, p, 'you')),
      hired
        ? btn(`👷 Put ${b.name} the ${roleTitle(b)} to work · saves ${Math.round(hurryShare('builder', b.level) * 100)}%`, () => go(b.id, `${b.name} gets the work moving.`), 'small primary', helpedToday(st, p, b.id))
        : btn(`👷 Employ ${b.name} the ${roleTitle(b)} · 5 days · ${wage(b) * 5}🪙`, () => { const e = employ(st, b.id, 5); g.toast(e ?? `${b.name} is employed.`, e ? 'info' : 'reward'); this.render(); }, 'small ghost', st.coins < wage(b) * 5)));
  }

  // ───── farmland and the supply chain ─────
  private fieldId = '';

  openField(id: string): void {
    this.fieldId = id;
    this.open('field');
  }

  private fieldTitle(): string {
    const f = FIELD_BY_ID[this.fieldId];
    return f ? `${this.g.st.fields[f.id] ? 'Your field' : 'Farmland'} in ${REGION_BY_ID[f.land].name}` : 'Farmland';
  }

  /**
   * A field: buy it, sow the land's own crops (eight rows), water and harvest into the barn, or
   * employ the land's farmhand (or someone you sponsor who knows gardening) to keep it producing;
   * then employ couriers to carry the barn's store to the best markets or your soup kitchens.
   */
  private fieldPanel(body: HTMLElement): void {
    const g = this.g, st = g.st, site = FIELD_BY_ID[this.fieldId];
    if (!site) return;
    const land = site.land, landName = REGION_BY_ID[land].name;
    const act = (fn: () => string | null, ok: string) => { const e = fn(); g.toast(e ?? ok, e ? 'info' : 'reward'); g.fieldsView.update(); this.render(); };
    const f = st.fields[site.id];
    if (!f) {
      body.append(h('p', { class: 'dim' }, `Forty metres square of good land at the edge of ${landName}: eight long rows, and a barn. It grows what ${landName} grows — ${SEED_SHOP[land].map((id) => ITEMS[id]?.name ?? id).join(', ')}. Farm it yourselves, or employ a farmhand and couriers so it feeds the markets and your kitchens while you travel.`),
        h('div', { class: 'acts' }, btn(`🌾 Buy this field · ${site.price}🪙`, () => act(() => buyField(st, site.id), `The field in ${landName} is yours.`), 'primary', st.coins < site.price)));
      return;
    }
    // The crop.
    const lvl = level(st, 'gardening');
    body.append(h('h3', {}, 'The crop'));
    if (!f.crop) {
      body.append(h('p', { class: 'dim' }, `Sow all eight rows with one crop (${FIELD_ROWS} seeds). Your Gardening: level ${lvl} — a harvest yields a tenth more for every level.`),
        h('div', { class: 'acts' }, ...SEED_SHOP[land].filter((id) => CROPS[id]).map((id) => {
          const have = count(st, id), cd = CROPS[id];
          return have >= FIELD_ROWS
            ? btn(`🌱 Sow ${ITEMS[cd.out]?.name ?? cd.out} · ${have} seeds · yields ~${fieldYield(id, lvl)}`, () => act(() => plantField(st, site.id, id), 'Eight rows sown.'), 'small')
            : btn(`🛒 Buy ${FIELD_ROWS - have}× ${ITEMS[id]?.name ?? id} · ${seedPrice(id) * (FIELD_ROWS - have)}🪙`, () => act(() => { for (let k = have; k < FIELD_ROWS; k++) if (buySeed(st, land, id) !== 'ok') return 'Not enough coins.'; return null; }, 'Seeds bought.'), 'small ghost', st.coins < seedPrice(id) * (FIELD_ROWS - have));
        })));
    } else {
      const gr = fieldGrowth(st, site.id), cd = CROPS[f.crop.seed], name = ITEMS[cd.out]?.name ?? cd.out;
      const left = Math.max(0, Math.ceil((f.crop.plantedAt + fieldGrowTime(f.crop.seed) - st.minutes) / 60));
      body.append(h('div', { class: 'quest' }, h('b', {}, `${name} · ${Math.round(gr * 100)}% grown`), h('small', {}, gr >= 1 ? 'Ripe — bring it in.' : `About ${left} hours to go${f.crop.watered ? ' · watered' : ''}.`)),
        h('div', { class: 'acts' },
          btn('💧 Water the rows', () => act(() => waterField(st, site.id), 'The rows drink deep — the harvest comes sooner.'), 'ghost', !!f.crop.watered || gr >= 1),
          btn(`🧺 Harvest · ~${fieldYield(f.crop.seed, lvl)}× ${name}`, () => { const r = harvestField(st, site.id); g.toast('error' in r ? r.error : `${r.n}× ${ITEMS[r.item]?.name} into the barn.`, 'error' in r ? 'info' : 'reward'); g.fieldsView.update(); this.render(); }, 'primary', gr < 1)));
    }
    // Who tends it.
    body.append(h('h3', {}, 'Who tends it'));
    const [hand] = workersOf(land, 'farmhand');
    const tending = f.hand ? (f.hand.who === 'hire' ? hand.name : PERSON_BY_ID[f.hand.id]?.name) : null;
    body.append(h('p', { class: 'dim' }, tending ? `${tending} tends the field: waters it, brings in each harvest, saves seed and sows again.` : 'No one yet — the crop waits for you. A farmhand keeps it producing while you travel.'));
    const hired = hireOf(st, hand.id), paid = !!hired && st.minutes < hired.paidUntil;
    const setH = (x: Hand) => act(() => setHand(st, site.id, x), 'They will tend it from today.');
    const learners = st.sponsored.filter((s) => PERSON_BY_ID[s.id]?.land === land && learnerLevel(st, s.id, 'gardening') >= 1);
    body.append(h('div', { class: 'acts' },
      btn(`🧑‍🌾 Employ ${hand.name} · 5 days · ${wage(hand) * 5}🪙${paid ? ` (paid ${Math.ceil((hired!.paidUntil - st.minutes) / 1440)} days)` : ''}`, () => act(() => employ(st, hand.id, 5), `${hand.name} is employed.`), 'small', st.coins < wage(hand) * 5),
      btn('🍲 …or 5 days for 5 food', () => act(() => employ(st, hand.id, 5, 'kind'), `${hand.name} is employed.`), 'small ghost'),
      paid && f.hand?.id !== hand.id ? btn(`🌾 Ask ${hand.name} to tend it`, () => setH({ who: 'hire', id: hand.id }), 'small primary') : null,
      ...learners.filter((s) => f.hand?.id !== s.id).map((s) => btn(`🤲 ${PERSON_BY_ID[s.id].name} (gardening ${learnerLevel(st, s.id, 'gardening')})`, () => setH({ who: 'learner', id: s.id }), 'small ghost')),
      f.hand ? btn('Tend it yourselves', () => act(() => setHand(st, site.id, null), 'The field is yours to tend.'), 'small ghost') : null));
    // The barn.
    body.append(h('h3', {}, `The barn · ${barnCount(st, site.id)} stored`));
    const store = Object.entries(f.store);
    if (!store.length) body.append(h('p', { class: 'dim' }, 'Empty. Harvests are stored here until you or a courier take them.'));
    for (const [id, n] of store) {
      const best = bestMarkets(st, id).slice(0, 3).map((m) => `${REGION_BY_ID[m.land].name} ${m.price}🪙`).join(' · ');
      body.append(h('div', { class: 'quest' }, h('b', {}, `${ITEMS[id]?.icon ?? ''} ${n}× ${ITEMS[id]?.name ?? id}`), h('small', {}, `Best markets today: ${best}`)),
        h('div', { class: 'acts' }, btn('Take 5', () => { takeFromBarn(st, site.id, id, 5); this.render(); }, 'small ghost'), btn('Take all', () => { takeFromBarn(st, site.id, id, n); this.render(); }, 'small ghost')));
    }
    // Couriers and ships.
    body.append(h('h3', {}, 'Couriers and ships'));
    body.append(h('p', { class: 'dim' }, `A courier collects from this barn, carries a load to a market or your soup kitchen or clinic, and comes back for the next.${hasHarbour(land) ? ' From a harbour land, a chartered ship carries far more, to any other harbour.' : ''} Markets fill up — spread your goods, and carry them far from where they grow.`));
    const carriers = [...new Set([...workersOf(land, 'courier'), ...(hasHarbour(land) ? workersOf(land, 'ship') : []),
      ...st.hires.map((x) => WORKER_BY_ID[x.id]).filter((w): w is Worker => !!w && w.role !== 'farmhand')])];
    this.carrierRows(body, carriers, site.id, store[0]?.[0], act);
  }

  /** Each courier or ship: employ them, and send them from this barn to a market or pantry. */
  private carrierRows(body: HTMLElement, carriers: Worker[], fieldId: string, main: string | undefined, act: (fn: () => string | null, ok: string) => void): void {
    const st = this.g.st, from = FIELD_BY_ID[fieldId]?.land;
    const pantries = st.institutes.filter((i) => i.kind === 'kitchen' || i.kind === 'clinic');
    for (const w of carriers) {
      const ship = w.role === 'ship', hw = hireOf(st, w.id), on = !!hw && st.minutes < hw.paidUntil;
      const route = st.routes.find((r) => r.courier === w.id), trip = shipmentOf(st, w.id);
      const ok = (l: RegionId) => !ship || hasHarbour(l);
      const dests = !from || !ok(from) ? [] : [
        ...(main ? bestMarkets(st, main).filter((m) => ok(m.land)).slice(0, 4).map((m) => marketDest(m.land)) : [marketDest(from)]),
        ...pantries.filter((i) => ok(SITE_BY_ID[i.site].land)).map((i) => pantryDest(i.site)),
        ...ownedHomes(st).filter((id) => ok(PLOT_BY_ID[id].region)).map((id) => homeDest(id))];
      const note = trip ? `${ship ? 'At sea' : 'On the road'} to ${destLabel(st, trip.to)} — arrives in about ${Math.max(1, Math.ceil((trip.arrive - st.minutes) / 60))} h.`
        : route ? `Carries from ${route.from === fieldId ? 'this barn' : 'another barn'} to ${destLabel(st, route.to)}.` : on ? 'Employed — give them a route.' : 'Not employed.';
      body.append(h('div', { class: 'quest' }, h('b', {}, `${ship ? '🚢' : '🚚'} ${w.name} of ${REGION_BY_ID[w.land].name} · ${w.vehicle} · carries ${w.capacity}`), h('small', {}, note)),
        h('div', { class: 'acts' },
          btn(`${ship ? 'Charter' : 'Employ'} · 5 days · ${wage(w) * 5}🪙`, () => act(() => employ(st, w.id, 5), `${w.name} is ${ship ? 'chartered' : 'employed'}.`), 'small ghost', st.coins < wage(w) * 5),
          ...(on && from ? dests.map((to) => btn(`→ ${destLabel(st, to).replace(/^the market in /, '🛒 ').replace(/^your home in /, '🏡 ')} · ${Math.round(tripMinutes(w, from, (destLand(to) ?? from) as RegionId) / 60)} h`,
            () => act(() => addRoute(st, w.id, fieldId, to), `${w.name} will carry from this barn to ${destLabel(st, to)}.`), `small ${route?.to === to && route?.from === fieldId ? 'on' : 'ghost'}`)) : []),
          route ? btn('Stop the route', () => { removeRoute(st, w.id); this.render(); }, 'small ghost') : null));
    }
  }

  openCare(): void {
    this.open('care');
  }

  /**
   * The people finder: everyone in need you have met, land by land — who they are, what they need,
   * whether they are in your care — with the way to them; and how many are still to be found.
   */
  private finderPanel(body: HTMLElement): void {
    const g = this.g, st = g.st;
    body.append(h('p', { class: 'dim' }, 'Everyone in need you have met on your travels. In every land four people need someone: stop and talk with whoever has a soft rose glow above them along the avenues.'));
    for (const r of REGIONS) {
      const people = PEOPLE_IN_NEED.filter((p) => p.land === r.id), known = people.filter((p) => hasMet(st, p.id));
      if (!known.length && !st.discovered.includes(r.id)) continue;
      body.append(h('h3', {}, `${r.name} · ${known.length} of ${people.length} met`));
      for (const p of known) {
        const s = sponsorOf(st, p.id), need = NEED_LABEL[p.kind];
        body.append(h('div', { class: `quest ${s ? 'main' : ''}` }, h('b', {}, `${need.icon} ${p.name}`),
          h('small', {}, `${need.name} · needs ${need.needs}${s ? ` · in your care${s.home ? ` · lives in your home in ${REGION_BY_ID[PLOT_BY_ID[s.home].region].name}` : ''}` : ' · not yet sponsored'}`),
          h('p', { class: 'story' }, `“${p.hope}”`)),
        h('div', { class: 'acts' },
          btn('📍 Show the way', () => { const at = needSpot(p); g.guide.pin({ title: `Visiting ${p.name}`, text: `${p.name} is on the avenue in ${r.name}`, x: at.x, z: at.z, region: p.land }); this.closePanel(); }, 'small'),
          btn('🤲 Care for them', () => this.open('care'), 'small ghost', p.land !== g.region.id && !s)));
      }
      if (known.length < people.length) body.append(h('p', { class: 'dim' }, `${people.length - known.length} still to meet in ${r.name}.`));
    }
  }

  // ───── work and services ─────

  /**
   * Service work in the land you are in: a shift a day at its employers (title and pay rise with
   * your skill), and today's freelance board — this land's gigs, plus software work posted from
   * anywhere, which can be done remotely. Skills grow only by doing.
   */
  private workPanel(body: HTMLElement): void {
    const g = this.g, st = g.st, land = g.region.id, day = Math.floor(st.minutes / 1440);
    const say = (r: { error: string } | { pay: number; promoted: string | null; capped?: string | null }, ok: string) => {
      if ('error' in r) g.toast(r.error, 'info');
      else {
        g.toast(`${ok} +${r.pay}🪙`, 'reward');
        if (r.promoted) g.toast(`🎓 You are now ${r.promoted}.`, 'story');
        if (r.capped) g.toast(r.capped, 'info');
        g.bus.emit('coins:changed', { coins: st.coins });
      }
      this.render();
    };
    body.append(h('p', { class: 'dim' }, `Everyone starts as an apprentice. Skills grow only by doing: each shift and gig raises yours, and better-skilled work pays more (${RANKS.join(' → ')}). Above Associate, employers ask for a certificate — earn one by taking a course at an institute.`));
    const certs = certificatesOf(st, 'you');
    if (certs.length) body.append(h('div', { class: 'chips wrap' }, ...certs.map((c) => h('span', { class: 'chip' }, `🎓 ${SKILLS[c.skill].name} · level ${c.level} · ${REGION_BY_ID[c.land].name}`))));
    const jobs = jobsIn(land);
    body.append(h('h3', {}, 'Employers here'));
    if (!jobs.length) body.append(h('p', { class: 'dim' }, 'No one is hiring here.'));
    for (const j of jobs) {
      const lv = Math.min(level(st, j.skill), rankCap(st, j.skill)), done = workedToday(st, j.id);
      body.append(h('div', { class: 'quest' }, h('b', {}, `${SKILLS[j.skill].icon} ${j.employer}`),
        h('small', {}, `${titleAt(j, lv)} · ${SKILLS[j.skill].name} level ${lv} · ${j.hours} h shift${st.work.worked[j.id] ? ` · ${st.work.worked[j.id]} shifts worked` : ''}`)),
      h('div', { class: 'acts' }, btn(done ? 'Shift done today' : `💼 Work a shift · +${shiftPay(lv)}🪙`, () => say(workShift(st, j.id), `A good day at ${j.employer}.`), 'small', done)));
    }
    // People you can employ here, and what each does for you.
    const does: Record<Role, string> = {
      farmhand: 'tends your fields here', courier: 'carries your harvest to markets and kitchens', ship: 'sails your cargo harbour to harbour',
      builder: 'speeds up what you build here', weaver: 'weaves the fibre you carry into cloth each day',
    };
    const crew = (['builder', 'weaver', 'farmhand', 'courier', 'ship'] as Role[]).flatMap((r) => workersOf(land, r));
    body.append(h('h3', {}, 'People you can employ here'));
    for (const w of crew) {
      const hw = hireOf(st, w.id), left = hw && st.minutes < hw.paidUntil ? Math.ceil((hw.paidUntil - st.minutes) / 1440) : 0;
      body.append(h('div', { class: 'quest' }, h('b', {}, `${w.name} · ${roleTitle(w)}`), h('small', {}, `${does[w.role]}${left ? ` · employed, ${left} days paid` : ''}`)),
        h('div', { class: 'acts' },
          btn(`Employ · 5 days · ${wage(w) * 5}🪙`, () => { const e = employ(st, w.id, 5); g.toast(e ?? `${w.name} is employed.`, e ? 'info' : 'reward'); this.render(); }, 'small ghost', st.coins < wage(w) * 5),
          btn('…or for 5 food', () => { const e = employ(st, w.id, 5, 'kind'); g.toast(e ?? `${w.name} is employed.`, e ? 'info' : 'reward'); this.render(); }, 'small ghost')));
    }
    // Freelance: this land's board, and remote software work from two other lands.
    const rest = REGIONS.filter((r) => r.id !== land), others = [rest[(day * 3) % rest.length], rest[(day * 3 + 7) % rest.length]];
    const board = [...gigsFor(land, day), ...others.flatMap((r) => gigsFor(r.id, day).filter((x) => x.remote))];
    body.append(h('h3', {}, 'Freelance board · today'));
    for (const x of board) {
      const lv = level(st, x.skill), done = st.work.done.includes(x.id);
      const parts = Object.entries(x.needs).map(([id, n]) => `${n}× ${ITEMS[id]?.name ?? id} (have ${count(st, id)})`).join(', ');
      body.append(h('div', { class: `quest ${lv < x.min ? 'dim' : ''}` }, h('b', {}, `${SKILLS[x.skill].icon} ${x.title}`),
        h('small', {}, `${x.remote && x.land !== land ? `remote · for a client in ${REGION_BY_ID[x.land].name} · ` : ''}${SKILLS[x.skill].name} level ${x.min}+ (yours ${lv}) · ${x.hours} h${parts ? ` · needs ${parts}` : ''}`)),
      h('div', { class: 'acts' }, btn(done ? 'Done ✓' : `🧾 Take it · +${x.pay}🪙`, () => say(doGig(st, x), 'The client is delighted.'), 'small ghost', done || lv < x.min)));
    }
    this.inventionsSection(body);
    this.businessSection(body);
  }

  /** Your inventions: make them at an institute of their science here, and sell them where they are wanted. */
  private inventionsSection(body: HTMLElement): void {
    const g = this.g, st = g.st, land = g.region.id;
    const act = (e: string | null, ok: string) => { g.toast(e ?? ok, e ? 'info' : 'reward'); g.bus.emit('coins:changed', { coins: st.coins }); this.render(); };
    body.append(h('h3', {}, '💡 Your inventions'));
    if (!st.inventions.length) { body.append(h('p', { class: 'dim' }, 'Finish a thesis under a professor to invent something of your own — then make it, put it to use at your homes and fields or carry it, and sell the rest.')); return; }
    const sites = INSTITUTE_SITES.filter((q) => q.land === land);
    for (const inv of st.inventions) {
      const p = PRODUCT_BY_INVENTION[inv];
      if (!p) continue;
      const site = sites.find((q) => workshopAt(st, inv, q.id));
      const need = Object.entries(p.needs).map(([k, v]) => `${v}× ${ITEMS[k]?.name ?? k}`).join(', ');
      const best = bestProductMarkets(st, inv).map((m) => `${REGION_BY_ID[m.land].name} ${m.price}🪙`).join(' · ');
      const have = st.products[inv] ?? 0;
      const use = USES[inv], at = placesFor(st, inv, land)[0], inUse = st.installed.filter((i) => i.invention === inv);
      body.append(h('div', { class: 'quest' }, h('b', {}, `💡 ${inv}`),
        use ? h('small', {}, `${use.does}${inUse.length ? ` · in use: ${inUse.map((i) => placeName(i.at)).join(', ')}` : ''}`) : null,
        h('small', {}, `${have} made · needs ${need} a piece · best markets: ${best}`),
        h('div', { class: 'acts' },
          use ? btn(at ? `🔧 Put to use · ${placeName(at)}` : use.place === 'home' ? 'Built at a home of yours' : use.place === 'field' ? 'Built in a field of yours' : 'In use', () => act(putToUse(st, inv, at!), `The ${inv} is put to use — ${use.does.toLowerCase()}.`), 'small', !at || have <= 0) : null,
          site ? btn(`🛠️ Make 1${workshopAt(st, inv, site.id) === 'bench' ? ` · bench ${BENCH_FEE}🪙` : ''}`, () => act(manufacture(st, inv, site.id, 1), `You make a ${inv}.`), 'small') : h('small', { class: 'dim' }, 'Made at an institute of its science'),
          btn(`Sell here · ${productPrice(st, inv, land)}🪙`, () => { const c = sellProduct(st, inv, land); act(c ? null : 'You have none made.', `Sold for ${c} coins.`); }, 'small ghost', have <= 0))));
    }
  }

  /**
   * Businesses grown from the ground up: take the orders yourself, teach or hire people, hand the
   * orders out, then make one of them manager (economy/business.ts).
   */
  private businessSection(body: HTMLElement): void {
    const g = this.g, st = g.st, land = g.region.id;
    const act = (e: string | null, ok: string) => { g.toast(e ?? ok, e ? 'info' : 'reward'); g.bus.emit('coins:changed', { coins: st.coins }); this.render(); };
    body.append(h('h3', {}, '🏪 Your businesses'));
    body.append(h('p', { class: 'dim' }, 'Begin by taking orders yourself. As word spreads, more clients come — teach the trade to someone you sponsor or someone looking for work (or hire someone who knows it), hand the orders out, and when the team is big enough make one of them manager.'));
    const stageText = { solo: 'You take the orders yourself', team: 'Your people do the orders — you hand them out', managed: 'Run by your manager' } as const;
    for (const b of st.businesses) {
      const t = TRADES[b.trade], here = b.land === land, stage = stageOf(st, b);
      const card = h('div', { class: 'quest main' }, h('b', {}, `${t.icon} ${businessTitle(b)}`),
        h('small', {}, `${stageText[stage]}${b.manager && stage === 'managed' ? ` (${personName(b.manager)})` : ''} · ${clientsOf(b, st)} clients · ${here || stage === 'managed' ? `${b.orders} orders waiting · ` : ''}${b.done} done · earned ${b.earned}🪙${t.good ? ` · ${t.good}` : ''}`));
      const acts = h('div', { class: 'acts' });
      if (here) {
        acts.append(btn(`${t.icon} Take an order · ${t.hours} h · +${orderPay(b.trade, level(st, t.skill))}🪙`, () => act(takeOrder(st, b.id, land), `Done — ${t.order}. The client will tell their friends.`), 'small', level(st, t.skill) < 1 || b.orders <= 0));
        if (b.team.length) acts.append(btn('📋 Hand out orders · 1 h', () => { const r = handOut(st, b.id, land); act('error' in r ? r.error : null, 'error' in r ? '' : `Your people take ${r.n} orders and earn ${r.coins} coins.`); }, 'small ghost', b.orders <= 0));
      } else if (stage !== 'managed') acts.append(h('small', { class: 'dim' }, `Its orders are taken in ${REGION_BY_ID[b.land].name}.`));
      card.append(acts);
      // The team: what each knows, how they are paid, and what you can do for them.
      for (const m of b.team) {
        const lvl = memberLevel(st, b, m.id), paid = isPaid(st, m), days = Math.max(0, Math.ceil((m.paidUntil - st.minutes) / 1440));
        const pay = m.pay === 'care' ? 'cared for by you' : m.pay === 'keep' ? 'works for their keep (a room and food)' : `wage · ${days} days paid`;
        const block = managerBlock(st, b, m.id);
        card.append(h('div', { class: 'acts' }, h('small', {}, `${b.manager === m.id ? '⭐ ' : ''}${personName(m.id)} · ${lvl < 1 ? 'apprentice' : `level ${lvl} · ${perDay(lvl)} orders a day`} · ${pay}${paid ? '' : ' · not paid — not working'}`),
          here && lvl < level(st, t.skill) ? btn('🧑‍🏫 Teach · 2 h', () => act(teachMember(st, b.id, m.id, land), `You teach ${personName(m.id)}.`), 'small ghost') : null,
          m.pay === 'wage' ? btn(`Pay a month · ${monthlyWage(lvl)}🪙`, () => act(payWage(st, b.id, m.id), 'Paid for another month.'), 'small ghost', st.coins < monthlyWage(lvl)) : null,
          b.manager !== m.id ? btn('⭐ Make manager', () => act(appoint(st, b.id, m.id), `${personName(m.id)} will run it now.`), 'small ghost', !!block) : null,
          btn('Let go', () => { letGo(st, b.id, m.id); this.render(); }, 'small ghost')));
      }
      if (!b.manager && b.team.length) card.append(h('small', { class: 'dim' }, `A manager needs level ${MANAGER.level}, ${MANAGER.crew} others working, and ${MANAGER.clients} clients.`));
      // People who could join, and how you can pay them.
      if (here) {
        const homes = homesWithRoom(st, land);
        for (const c of candidatesFor(st, b).slice(0, 5)) {
          card.append(h('div', { class: 'acts' }, h('small', {}, `${c.name} · ${c.note}${c.level ? ` · level ${c.level}` : ''}`),
            ...c.pays.map((p) => p === 'care'
              ? btn('Take on', () => act(takeOn(st, b.id, c.id, 'care'), `${c.name} joins — teach them the trade.`), 'small ghost')
              : p === 'wage'
                ? btn(`Monthly wage · ${monthlyWage(c.level)}🪙`, () => act(takeOn(st, b.id, c.id, 'wage'), `${c.name} joins.`), 'small ghost', st.coins < monthlyWage(c.level))
                : btn('Room and food', () => act(takeOn(st, b.id, c.id, 'keep'), `${c.name} moves into your home and joins.`), 'small ghost', !homes.length))));
        }
      }
      body.append(card);
    }
    // Begin a business here: in a trade you know, or by hiring someone who knows it.
    const begin = TRADE_IDS.map((id) => ({ id, how: canBegin(st, id, land) })).filter((x) => x.how);
    if (begin.length) body.append(h('div', { class: 'chips wrap' }, ...begin.map(({ id, how }) => {
      const t = TRADES[id], hire = how === 'hire' ? firstHire(land, id) : undefined;
      return btn(how === 'yourself' ? `${t.icon} Begin a ${t.name.toLowerCase()}` : `${t.icon} Begin a ${t.name.toLowerCase()} with ${personName(hire!)} · a month's wage`,
        () => act(startBusiness(st, id, land, hire), how === 'yourself' ? `Your ${t.name.toLowerCase()} begins — take the first orders yourself.` : `Your ${t.name.toLowerCase()} begins with ${personName(hire!)}.`), 'small ghost chip');
    })));
  }

  // ───── harbours ─────
  private harbourLand: RegionId = 'london';

  private busStop: BusStop | null = null;
  private tramStop: TramStop | null = null;

  openTramStop(stop: TramStop): void {
    this.tramStop = stop;
    this.open('tram');
  }

  /** A tram stop: the other stops across town, and the flat fare. */
  private tramPanel(body: HTMLElement): void {
    const g = this.g, stop = this.tramStop;
    if (!stop) return;
    const style = TRAM_TOWNS[stop.land]!;
    body.append(h('p', { class: 'dim' }, `The ${TRAM_NAME[style]} runs out along ${stop.name}, round the ring road and in along the other avenues. You sit at the front in your own seats, either side of the aisle, the family behind. ${TRAM_FARE} coins, any stop.`));
    for (const s of tramStops(stop.land)) {
      if (s.id === stop.id) continue;
      body.append(h('div', { class: 'quest' },
        h('b', {}, s.name),
        h('small', {}, `about ${TRAM_MINUTES} minutes · ${TRAM_FARE} coins`),
        btn('🚋 Ride', () => { const e = g.rideStreetTram(stop, s); if (e) g.toast(e, 'info'); else this.closePanel(); }, 'small primary', g.st.coins < TRAM_FARE)));
    }
  }

  openBusStop(stop: BusStop): void {
    this.busStop = stop;
    this.open('bus');
  }

  /** A bus stop: every town the roads reach, how far, and the fare. */
  private busPanel(body: HTMLElement): void {
    const g = this.g, stop = this.busStop;
    if (!stop) return;
    body.append(h('p', { class: 'dim' }, 'The Golden Thread Lines coach runs from here to every town on the ground — out along the avenue, round the ring road and down the highway. You sit in your own window seats, either side of the aisle, the family in the rows behind.'));
    const dests = REGIONS.filter((r) => r.id !== stop.land).map((r) => ({ r, f: busFare(stop.land, r.id) })).filter((x) => x.f).sort((a, b) => a.f!.towns - b.f!.towns || a.r.name.localeCompare(b.r.name));
    for (const { r, f } of dests) {
      body.append(h('div', { class: 'quest' },
        h('b', {}, r.name),
        h('small', {}, `${f!.towns === 1 ? 'the next town' : `${f!.towns} towns`} · ${f!.coins} coins`),
        btn('🚌 Ride', () => { const e = g.rideBus(stop, r.id); if (e) g.toast(e, 'info'); else this.closePanel(); }, 'small primary', g.st.coins < f!.coins)));
    }
    body.append(h('p', { class: 'dim' }, 'The Sky Isles float above the clouds: no road reaches them — but an air taxi does.'));
    body.append(h('h3', {}, '🚁 Air taxi'));
    this.airRows(body, airPointAtStop(stop));
  }

  openSkyPad(): void {
    this.open('air');
  }

  /** Every land an air taxi flies to from `from`, how far and the fare. */
  private airRows(body: HTMLElement, from: AirPoint): void {
    const g = this.g;
    body.append(h('p', { class: 'dim' }, 'It settles beside you, lifts straight up and flies straight there, high over the roofs, and comes down beside the stop — or on the stage beside the top island of the Sky Isles. Two seats either side of the console, the family behind.'));
    const dests = airDestinations(from.land).map((id) => ({ r: REGION_BY_ID[id], f: airFare(from, id) })).sort((a, b) => a.f.km - b.f.km);
    for (const { r, f } of dests) {
      body.append(h('div', { class: 'quest' },
        h('b', {}, r.name),
        h('small', {}, `${f.km.toFixed(1)} km · ${f.coins} coins`),
        btn('🚁 Fly', () => { const e = g.rideAir(from, r.id); if (e) g.toast(e, 'info'); else this.closePanel(); }, 'small primary', g.st.coins < f.coins)));
    }
  }

  openHarbour(land: RegionId): void {
    this.harbourLand = land;
    this.open('harbour');
  }

  /** A harbour: its shipping line, the ships on this coast, and your cargo coming and going. */
  private harbourPanel(body: HTMLElement): void {
    const g = this.g, st = g.st, land = this.harbourLand, name = REGION_BY_ID[land].name;
    const act = (fn: () => string | null, ok: string) => { const e = fn(); g.toast(e ?? ok, e ? 'info' : 'reward'); this.render(); };
    body.append(h('p', { class: 'dim' }, `Ships sail out and back along the coast of ${name} and tie up at the pier head. Charter the shipping line to carry the harvest of your fields in any harbour land to the market or kitchens of another — ninety loads at a time.`));
    const [ship] = workersOf(land, 'ship');
    const mine = Object.keys(st.fields).filter((id) => hasHarbour(FIELD_BY_ID[id]?.land));
    if (ship) {
      body.append(h('h3', {}, 'The shipping line'));
      if (!mine.length) body.append(h('p', { class: 'dim' }, 'You have no field in a harbour land yet — buy one (walk onto farmland at the edge of a coastal town), then send its harvest by sea.'));
      if (mine.length) for (const id of mine) {
        body.append(h('p', { class: 'dim' }, `From your field in ${REGION_BY_ID[FIELD_BY_ID[id].land].name} (${Object.values(st.fields[id].store).reduce((a, b) => a + b, 0)} in the barn):`));
        this.carrierRows(body, [ship], id, Object.keys(st.fields[id].store)[0], act);
      }
      if (!mine.length) this.carrierRows(body, [ship], '', undefined, act);
    }
    // The ferry: from the pier head to any other harbour.
    body.append(h('h3', {}, '⛴️ The coastal ferry'));
    body.append(h('p', { class: 'dim' }, 'From the pier head the ferry sails round the island, outside the shipping lanes, to any other harbour. You sit on the open foredeck, her bench to port and his to starboard with a planter between; the family on the benches behind.'));
    const sails = harbours().filter((x) => x.land !== land).map((x) => ({ r: REGION_BY_ID[x.land], f: ferryFare(land, x.land)! })).filter((x) => x.f).sort((a, b) => a.f.km - b.f.km);
    for (const { r, f } of sails) {
      body.append(h('div', { class: 'quest' },
        h('b', {}, r.name),
        h('small', {}, `${f.km.toFixed(1)} km · ${f.coins} coins`),
        btn('⛴️ Sail', () => { const e = g.rideFerry(land, r.id); if (e) g.toast(e, 'info'); else this.closePanel(); }, 'small primary', st.coins < f.coins)));
    }
    // Cargo at sea to or from here.
    const here = st.shipments.filter((x) => WORKER_BY_ID[x.courier]?.role === 'ship' && (FIELD_BY_ID[x.from]?.land === land || x.to.endsWith(`:${land}`)));
    body.append(h('h3', {}, 'Your cargo at sea'));
    body.append(here.length ? h('div', {}, ...here.map((x) => h('div', { class: 'quest' }, h('b', {}, `🚢 ${Object.entries(x.items).map(([i, n]) => `${n}× ${ITEMS[i]?.name ?? i}`).join(', ')}`), h('small', {}, `to ${destLabel(st, x.to)} · in about ${Math.max(1, Math.ceil((x.arrive - st.minutes) / 60))} h`))))
      : h('p', { class: 'dim' }, 'None at the moment.'));
  }

  // ───── institutes ─────
  private instSite = '';
  private instKind: InstituteKind | null = null;

  openInstitute(siteId: string): void {
    this.instSite = siteId;
    this.instKind = null;
    this.open('institute');
  }

  private instituteTitle(): string {
    const site = SITE_BY_ID[this.instSite];
    if (!site) return 'Institute';
    const inst = instituteAt(this.g.st, site.id);
    if (site.established) return `${INSTITUTE_BY_KIND[landScience(site.land)].name} — the institute of ${REGION_BY_ID[site.land].name}`;
    if (inst) return `Your ${INSTITUTE_BY_KIND[inst.kind].name.toLowerCase()} in ${REGION_BY_ID[site.land].name}`;
    return `Open ground in ${REGION_BY_ID[site.land].name}`;
  }

  /**
   * An institute site: learn at the town's own institute (courses, interning, teaching, enrolling
   * someone you sponsor), or found and grow your own — stage by stage, paid in coins or in kind,
   * run by you, someone you sponsor and have taught, or an expert you employ or pay as a freelancer.
   */
  private institutePanel(body: HTMLElement): void {
    const g = this.g, st = g.st, site = SITE_BY_ID[this.instSite];
    if (!site) return;
    const act = (fn: () => string | null, ok: string) => { const e = fn(); g.toast(e ?? ok, e ? 'info' : 'reward'); g.institutesView.update(); this.render(); };
    const inst = instituteAt(st, site.id);
    const science = INSTITUTE_BY_KIND[landScience(site.land)];
    // Step inside (the 3D side's interior when there is one, else a hall with a counter).
    const standing = site.established ? 3 : inst ? standingStage(st, inst) : -1;
    if (standing >= 0 && !g.inHouse) body.append(h('div', { class: 'acts' }, btn('🚪 Step inside', () => g.enterInstitute(site.id), 'small ghost')));
    const staffButtons = (skill: SkillId, lvl: number, go: (s: Staff) => void, freelance = true) => h('div', { class: 'acts' },
      ...candidates(st, site.land, skill).filter((c) => c.level >= lvl && (freelance || c.staff.who !== 'freelance')).map((c) => btn(`${c.staff.who === 'you' ? '🧭' : c.staff.who === 'learner' ? '🤲' : c.staff.who === 'freelance' ? '🧾' : '🧑‍🔧'} ${c.name} · lvl ${c.level} · ${c.note}`, () => go(c.staff), 'small ghost')));
    if (site.established) {
      const lvl = level(st, science.skill), mat = REGION_BY_ID[site.land].materials[0];
      body.append(h('p', { class: 'dim' }, `${science.blurb} This is the land's ${science.stages[3].name.toLowerCase()}. Your ${SKILLS[science.skill].name}: level ${lvl}. Skills grow by doing.`),
        h('div', { class: 'acts' },
          btn(`📚 Take a course · ${COURSE_FEE}🪙`, () => act(() => takeCourse(st, site.id, 'you'), `A good day's learning (+${SKILLS[science.skill].name}).`), 'primary', st.coins < COURSE_FEE),
          btn(`📚 Pay in kind · 3× ${ITEMS[mat].name}`, () => act(() => takeCourse(st, site.id, 'you', 'kind'), 'A good day’s learning.'), 'ghost'),
          btn('🧑‍🎓 Intern under the masters · +6🪙', () => act(() => intern(st, site.id), 'You learn by working beside the masters.'), 'ghost'),
          btn('🧑‍🏫 Teach a class (level 3)', () => act(() => teachClass(st, site.id), 'Your class goes well — you are paid, and you learn by teaching.'), 'ghost', lvl < 3)));
      // Research under the professor: assist, then a thesis of your own.
      body.append(h('h3', {}, `Research under ${PROFESSORS[site.land]}`));
      body.append(h('div', { class: 'acts' }, btn(`🔬 Assist the professor · +${12 + lvl * 3}🪙 (level ${ASSIST_LEVEL})`, () => act(() => assist(st, site.id), 'A day in the laboratory: paid, and wiser.'), 'ghost', lvl < ASSIST_LEVEL)));
      if (st.thesis && st.thesis.site === site.id) {
        const t = TOPIC_BY_ID[st.thesis.topic];
        body.append(h('div', { class: 'quest main' }, h('b', {}, `${t.magic ? '🪄 Magic thesis' : '🔭 Scientific thesis'}: ${t.title}`), h('small', {}, `${Math.round(st.thesis.progress)}% written · a day's work adds about ${dayProgress(lvl)}% and uses 1× ${ITEMS[mat].name}`),
          h('div', { class: 'meter' }, h('i', { style: `inline-size:${Math.round(st.thesis.progress)}%` })),
          btn('📝 Work on the thesis today', () => { const r = workOnThesis(st, site.id); if ('error' in r) g.toast(r.error); else if (r.done) g.toast(`🎓 Thesis complete: “${r.done.title}”. You earn a degree, the institute's purse of 150🪙 — and your invention: ${r.done.invention}!`, 'reward'); else g.toast(`The thesis grows: ${Math.round(r.progress)}%.`, 'reward'); this.render(); }, 'primary')));
      } else if (st.thesis) {
        body.append(h('small', { class: 'dim' }, `You are writing “${TOPIC_BY_ID[st.thesis.topic]?.title}” at another institute.`));
      } else {
        for (const t of topicsAt(site.id)) body.append(h('div', { class: 'quest' }, h('b', {}, `${t.magic ? '🪄' : '🔭'} ${t.title}`), h('small', {}, st.degrees.includes(t.id) ? `Written — your invention: ${t.invention}` : `Leads to: ${t.invention} · needs level ${THESIS_LEVEL}`),
          st.degrees.includes(t.id) ? h('span') : btn('Take on this thesis', () => act(() => startThesis(st, site.id, t.id), `The professor agrees to supervise you. Work on it a little each day.`), 'small ghost', lvl < THESIS_LEVEL)));
      }
      const learners = st.sponsored.filter((s) => PERSON_BY_ID[s.id]);
      if (learners.length) {
        body.append(h('h3', {}, 'Enrol someone you sponsor'));
        for (const s of learners) {
          const p = PERSON_BY_ID[s.id];
          body.append(h('div', { class: 'quest' }, h('b', {}, `${p.name}`), h('small', {}, `${SKILLS[science.skill].name} level ${learnerLevel(st, p.id, science.skill)} · hopes to learn ${SKILLS[p.learn].name.toLowerCase()}`),
            h('div', { class: 'acts' },
              btn(`Enrol in a course · ${COURSE_FEE}🪙`, () => act(() => takeCourse(st, site.id, p.id), `${p.name} starts the course, eyes bright.`), 'small ghost', st.coins < COURSE_FEE),
              btn(`Teach them ${SKILLS[science.skill].name} yourself`, () => act(() => teachLearner(st, p.id, science.skill), `You teach ${p.name}; you both grow.`), 'small ghost'))));
        }
      }
    } else if (inst) {
      const def = INSTITUTE_BY_KIND[inst.kind], stage = standingStage(st, inst), next = inst.stage + 1;
      const staffName = inst.staff ? (inst.staff.who === 'you' ? 'you both' : inst.staff.who === 'learner' ? PERSON_BY_ID[inst.staff.id]?.name : EXPERT_BY_ID[inst.staff.id]?.name) : 'no one';
      body.append(h('p', { class: 'dim' }, `${def.blurb}`),
        h('div', { class: 'quest main' }, h('b', {}, stage >= 0 ? def.stages[stage].name : 'Being founded'), h('small', {}, stage >= 0 ? def.stages[stage].what : ''),
          h('small', {}, `Run by ${staffName}${stage >= 0 ? ` · earns ${DAILY_INCOME[stage]}🪙 a day when staffed at ${SKILLS[def.skill].name} level ${def.stages[stage].level}` : ''}`)));
      if (isBuilding(st, inst)) {
        body.append(h('p', { class: 'story' }, `Building the ${def.stages[inst.stage].name.toLowerCase()} — ${((inst.buildingUntil! - st.minutes) / 60).toFixed(1)} hours left.`));
        this.hurryRow(body, { kind: 'institute', site: site.id }, site.land);
      }
      else if (next <= 3) {
        const s = def.stages[next];
        body.append(h('h3', {}, `Grow it: ${s.name}`), h('p', { class: 'dim' }, `${s.what} ${s.days} day${s.days > 1 ? 's' : ''} to build. Needs ${SKILLS[def.skill].name} level ${s.level}. Costs ${s.coins}🪙 + ${s.goods.wood} wood — or in kind: ${Object.entries(s.goods).map(([k, n]) => `${n}× ${ITEMS[k]?.name ?? k}`).join(', ')} and ${kindFood(s)} food for the builders.`));
        for (const how of ['coins', 'kind'] as const) {
          body.append(h('small', {}, how === 'coins' ? 'Pay in coins, led by:' : 'Pay in kind, led by:'), staffButtons(def.skill, s.level, (sf) => act(() => buildStage(st, site.id, inst.kind, how, sf), `Work begins on the ${s.name.toLowerCase()}.`)));
        }
      }
      if (stage >= 0) body.append(h('h3', {}, 'Who runs it'), staffButtons(def.skill, def.stages[stage].level, (sf) => act(() => assignStaff(st, site.id, sf), 'They take charge.'), false));
      if (stage >= 0 && (inst.kind === 'kitchen' || inst.kind === 'clinic')) {
        const pantry = pantryOf(st, site.id), stocked = Object.entries(pantry);
        body.append(h('h3', {}, inst.kind === 'kitchen' ? 'The pantry' : 'Medicines'),
          h('p', { class: 'dim' }, `${inst.kind === 'kitchen' ? `Serves up to ${SERVE_PER_DAY[stage]} meals a day — first to the people you sponsor in this land (each meal a day of their care), then to anyone hungry. Served so far: ${st.served.meals}.` : `Treats up to ${SERVE_PER_DAY[stage]} people a day. Treated so far: ${st.served.treated}.`} In stock: ${stocked.length ? stocked.map(([k, n]) => `${n}× ${ITEMS[k]?.icon ?? ''} ${ITEMS[k]?.name ?? k}`).join(', ') : 'nothing yet'}.`),
          h('div', { class: 'acts' }, ...Object.keys(st.inventory).filter((k) => count(st, k) > 0 && servesWith(inst.kind, k)).slice(0, 8).map((k) =>
            btn(`${ITEMS[k].icon} ${ITEMS[k].name} ×${Math.min(5, count(st, k))}`, () => act(() => stockPantry(st, site.id, k, Math.min(5, count(st, k))), `Stocked with ${ITEMS[k].name.toLowerCase()}.`), 'small ghost'))));
      }
    } else {
      body.append(h('p', { class: 'dim' }, 'Found an institute here. Each begins small and grows in four stages, each its own building. Choose what it will be:'));
      body.append(h('div', { class: 'chips' }, ...institutesOf(site.land).map((d) => btn(`${d.land ? '✨ ' : ''}${d.name}`, () => { this.instKind = d.kind; this.render(); }, `small ${this.instKind === d.kind ? 'on' : 'ghost'}`))));
      const d = this.instKind ? INSTITUTE_BY_KIND[this.instKind] : null;
      if (d) {
        const s = d.stages[0];
        body.append(h('div', { class: 'quest main' }, h('b', {}, `${s.name} → ${d.stages[1].name} → ${d.stages[2].name} → ${d.stages[3].name}`), h('small', {}, d.blurb), h('small', {}, `First: ${s.what} ${s.days} day to build · needs ${SKILLS[d.skill].name} level ${s.level} · ${s.coins}🪙 + ${s.goods.wood} wood, or in kind`)));
        for (const how of ['coins', 'kind'] as const) {
          body.append(h('small', {}, how === 'coins' ? 'Pay in coins, led by:' : 'Pay in kind, led by:'), staffButtons(d.skill, s.level, (sf) => act(() => buildStage(st, site.id, d.kind, how, sf), `Work begins on the ${s.name.toLowerCase()}.`)));
        }
        body.append(h('small', { class: 'dim' }, `No one skilled enough? Learn at the town's institute, teach someone you sponsor, or employ one of the land's experts below.`));
      }
    }
    body.append(h('h3', {}, 'Experts of this land'));
    for (const e of EXPERTS.filter((x) => x.land === site.land)) {
      const hr = hireOf(st, e.id), on = hr && st.minutes < hr.paidUntil;
      body.append(h('div', { class: 'quest' }, h('b', {}, `${e.name} · ${SKILLS[e.skill].icon} ${SKILLS[e.skill].name} level ${e.level}`),
        h('small', {}, on ? `Employed · paid ${((hr!.paidUntil - st.minutes) / 1440).toFixed(1)} more days` : `Wage ${wage(e)}🪙 a day, or their keep in food · freelance from ${freelanceFee(e, 0)}🪙 a build`),
        h('div', { class: 'acts' },
          btn(`Employ 3 days · ${wage(e) * 3}🪙`, () => act(() => employ(st, e.id, 3), `${e.name} joins you.`), 'small ghost', st.coins < wage(e) * 3),
          btn('Employ 3 days · 3 food', () => act(() => employ(st, e.id, 3, 'kind'), `${e.name} joins you, fed from your stores.`), 'small ghost'),
          ...ownedHomes(st).map((hid) => btn(`Employ 5 days · a home in ${REGION_BY_ID[PLOT_BY_ID[hid].region].name}`, () => act(() => employ(st, e.id, 5, 'home', hid), `${e.name} moves into your home as their pay.`), 'small ghost')))));
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
      ...this.buildGuide(site.region),
    );
  }

  /**
   * What can be built, and where: on a plot of your own (with B), and in the land itself — its
   * institute sites and farmland — so the player can see it all before buying.
   */
  private buildGuide(land: RegionId): HTMLElement[] {
    const name = REGION_BY_ID[land].name;
    const onPlot = DECOR.filter((d) => !d.style && d.price > 0);
    const houses = DECOR.filter((d) => d.style);
    const own = houses.find((d) => d.style === land);
    const sites = INSTITUTE_SITES.filter((q) => q.land === land).length, fields = FIELD_SITES.filter((f) => f.land === land).length;
    return [
      h('h3', {}, '🔨 What you can build on your land'),
      h('div', { class: 'chips wrap' }, ...onPlot.map((d) => h('span', { class: 'chip' }, `${d.icon} ${d.name} · 🪙 ${d.price}`))),
      h('small', { class: 'dim' }, `A house in any land's style (🪙 ${houses[0]?.price ?? 220})${own ? ` — here, the ${own.name}` : ''}. Stand on your land and press B to place things; walk in to furnish your home.`),
      h('h3', {}, `🏛️ What you can build in ${name}`),
      h('p', { class: 'dim' }, `${sites} open institute site${sites === 1 ? '' : 's'}: found ${institutesOf(land).map((d) => d.name.toLowerCase()).join(', ')} — and grow it in four stages. ${fields ? `${fields} field${fields === 1 ? '' : 's'} of farmland to rent and sow.` : ''} Walk onto a site or field and press E.`),
    ];
  }

  private journal(body: HTMLElement): void {
    const q = this.g.quests, st = this.g.st, g2 = this.g;
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
    if (st.errands.length) {
      body.append(h('h3', {}, '❗ People waiting for you'));
      for (const e of st.errands) body.append(h('div', { class: 'quest' }, h('b', {}, `${e.name} in ${REGION_BY_ID[e.land as RegionId]?.name ?? e.land}`),
        h('small', {}, `needs ${e.qty}× ${ITEMS[e.item]?.icon ?? ''} ${ITEMS[e.item]?.name ?? e.item} · waits ${Math.max(1, Math.ceil((e.until - st.minutes) / 60))} more hours · you have ${count(st, e.item)}`),
        btn('Show the way', () => { g2.guide.pin({ title: `Bringing ${ITEMS[e.item]?.name ?? e.item} to ${e.name}`, text: 'They are waiting under the ❗', x: e.x, z: e.z, region: e.land as RegionId }); this.closePanel(); }, 'small')));
    }
    body.append(h('h3', {}, 'The caravan'));
    for (const c of this.g.caravan.list()) body.append(h('div', { class: 'quest' },
      h('b', {}, `${c.kind === 'pet' ? '🐾' : c.kind === 'sibling' ? (c.who === 'girl' ? '👩' : '👨') : '🧒'} ${c.name}`),
      h('small', {}, c.kind === 'child' ? `${c.tradition} · going to ${REGION_BY_ID[c.destination].name}` : c.kind === 'sibling' ? (c.who === 'girl' ? 'Sister · travels with you always' : 'Brother · travels with you always') : `from ${REGION_BY_ID[c.origin].name}`),
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
      // The land's caves: out past the ends of the avenues, their mouths facing the town.
      const caves = CAVES.filter((cv) => cv.land === sel.id);
      if (known && caves.length) {
        const rc = regionCenter(sel);
        body.append(h('h3', {}, `🕳️ Caves of ${sel.name}`), ...caves.map((cv) => {
          const dx = cv.x - rc.x, dz = cv.z - rc.z;
          const side = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : dz > 0 ? 'south' : 'north';
          const name = CAVE_NAME[cv.style];
          return h('div', { class: 'quest' }, h('b', {}, `${cv.style === 'ice' ? '🧊' : cv.style === 'crystal' ? '💎' : '🪨'} A ${name}`),
            h('small', {}, `${Math.round(Math.hypot(dx, dz))} m ${side} of the town`),
            btn('Show the way', () => {
              const m = caveMouth(cv);
              this.g.guide.pin({ title: `The ${name}`, text: `Walk to the ${name}'s mouth and press E to explore`, x: m.x, z: m.z, region: cv.land });
              this.closePanel();
              this.g.toast(`Follow the golden motes to the ${name}.`);
            }, 'small'));
        }));
      }
      // Its place of worship and its market (world/neighbourhood.ts), with the way there.
      const civic = civicOf(sel.id);
      if (known && civic.length) {
        const rc = regionCenter(sel);
        body.append(h('h3', {}, `🧭 Around ${sel.name}`), ...civic.map((q) => {
          const [icon, name] = CIVIC_LABEL[sel.id][q.kind];
          const door = civicDoor(q);
          const title = name.charAt(0).toUpperCase() + name.slice(1);
          return h('div', { class: 'quest' }, h('b', {}, `${icon} ${title}`),
            h('small', {}, q.kind === 'worship' ? 'Its place of worship, beyond the ring road' : 'Its market, beyond the ring road'),
            btn('Show the way', () => {
              this.g.guide.pin({ title, text: `Walk to ${name}`, x: rc.x + door.x, z: rc.z + door.z, region: sel.id });
              this.closePanel();
              this.g.toast(`Follow the golden motes to ${name}.`);
            }, 'small'));
        }));
      }
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
      const p = friendDef(id)!;
      const unread = m.thread(id).filter((x) => x.from === 'them' && !x.read).length;
      const b = btn('', () => { this.msgFriend = id; this.render(); }, `friend ${id === this.msgFriend ? 'on' : ''}`);
      b.append(h('span', { class: 'av' }, p.name[0]), h('span', {}, p.name), unread ? h('span', { class: 'badge' }, String(unread)) : '');
      list.append(b);
    }
    const id = this.msgFriend;
    const p = friendDef(id)!;
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
    body.append(h('p', { class: 'dim' }, 'In every vehicle you sit in separate seats. On unicorns, each of you rides your own; the night dragon has two separate saddles — he drives from the front one, she rides behind with her wings open, and the Light Fury carries the children.'));
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

  /** Your own home: furnish it slot by slot with things you have made, as in the van. */
  private homePanel(body: HTMLElement, plotId: string): void {
    const g = this.g;
    this.decorSection(body, plotId);
    body.append(h('div', { class: 'acts' },
      btn('🌅 Rest until morning', () => { g.setTimeOfDay('dawn'); this.render(); }, 'ghost small'),
      btn('🌙 Stay until night', () => { g.setTimeOfDay('night'); this.render(); }, 'ghost small'),
      btn('🚪 Step outside', () => g.exitHouse(), 'ghost small')));
    this.storeSection(body, plotId);
  }

  /** Furnish a home of yours (a plot's, or a penthouse), slot by slot, with what you have made. */
  private decorSection(body: HTMLElement, plotId: string): void {
    const g = this.g, st = g.st, home = g.homeDecor(plotId);
    const slots = Object.keys(VAN_OPTIONS) as VanSlot[];
    const slot = this.vanSlot;
    body.append(h('div', { class: 'chips' }, ...slots.map((s) =>
      btn(SLOT_NAMES[s], () => { this.vanSlot = s; this.render(); }, `small ${s === slot ? 'on' : 'ghost'}`))));
    const shelf = h('div', { class: 'shelf van-shelf', role: 'list' });
    for (const o of VAN_OPTIONS[slot]) {
      const on = home[slot] === o.id;
      const cost = Object.entries(o.cost);
      const afford = cost.every(([k, n]) => count(st, k) >= n);
      const card = h('button', { class: `outfit ${on ? 'on' : ''} ${!on && !afford ? 'dim' : ''}`, type: 'button', role: 'listitem' },
        h('b', {}, o.name),
        h('small', {}, on ? 'In your home' : cost.length ? cost.map(([k, n]) => `${n}× ${ITEMS[k].icon} ${ITEMS[k].name}`).join(' · ') : 'Free'));
      card.addEventListener('click', () => { const e = g.setHomeSlot(plotId, slot, o.id); if (e) g.toast(e); this.render(); });
      shelf.append(card);
    }
    body.append(shelf);
  }

  /** A store (the van, or a home): what is in it, what you carry, and moving things between them. */
  private storeSection(body: HTMLElement, id: string): void {
    const g = this.g, st = g.st, s = storeOf(st, id);
    const act = (e: string | null) => { if (e) g.toast(e); this.render(); };
    body.append(h('h3', {}, `${id === 'van' ? '🚐 The van\'s store' : '🏡 The store room'} · ${loadOf(s)} / ${storeCap(st, id)}`));
    if (id !== 'van') {
      const people = residentsOf(st, id);
      body.append(h('p', { class: 'dim' }, people.length
        ? `${people.map((p) => PERSON_BY_ID[p.id]?.name ?? p.id).join(', ')} ${people.length > 1 ? 'live' : 'lives'} here and eat from this store each day — ${mealsIn(st, id)} meals' worth now. Raw produce is cooked two to a meal (one, for someone who has learnt to cook). Bring food, or send a courier here from your fields.`
        : 'Keep your harvest here. Anyone you invite to live here eats from this store.'));
    }
    const inStore = Object.entries(s).filter(([, n]) => n > 0);
    const grid = h('div', { class: 'grid items' });
    if (!inStore.length) grid.append(h('p', { class: 'dim' }, 'Empty.'));
    for (const [k, n] of inStore) grid.append(h('div', { class: 'item', title: ITEMS[k]?.name ?? k }, h('span', { class: 'ic' }, ITEMS[k]?.icon ?? '?'), h('small', {}, ITEMS[k]?.name ?? k), h('b', {}, `×${n}`),
      btn('Take 1', () => act(takeOut(st, id, k, 1)), 'small ghost'), n > 1 ? btn(`All`, () => act(takeOut(st, id, k, Math.min(n, bagRoom(st)))), 'small ghost') : null));
    body.append(grid, h('small', { class: 'dim' }, `From your bag (${loadOf(st.inventory)} / ${BAG_CAP}):`));
    const bagGrid = h('div', { class: 'grid items' });
    for (const [k, n] of Object.entries(st.inventory).filter(([, v]) => v > 0)) bagGrid.append(h('div', { class: 'item', title: ITEMS[k]?.name ?? k }, h('span', { class: 'ic' }, ITEMS[k]?.icon ?? '?'), h('small', {}, ITEMS[k]?.name ?? k), h('b', {}, `×${n}`),
      btn('Put away', () => act(putAway(st, id, k, 1)), 'small ghost'), n > 1 ? btn('All', () => act(putAway(st, id, k, Math.min(n, storeRoom(st, id)))), 'small ghost') : null));
    body.append(bagGrid);
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
    body.append(shelf, h('p', { class: 'dim fine' }, 'Each piece uses up the item. ✕ or Esc to step outside.'));
    this.storeSection(body, 'van');
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
        btn('📜 Guidebook', () => this.open('guidebook'), 'ghost'),
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
      ['J', 'Journal'], ['G', 'Follow another journey'], ['L', 'Homes & land for sale'], ['M', 'Map and travel to known lands'], ['N', 'Messages from friends'], ['B', 'Build on your land'], ['Q', 'Your diary'], ['Esc', 'Close'],
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


/** The guidebook's "How things work": each part of the journey, plainly. */
const HOW_IT_WORKS: Array<[string, string, string]> = [
  ['🧵', 'The two of you', 'You play as her; he follows, joined by the golden thread. You never touch: in every vehicle you sit in separate seats, on unicorns each rides your own, and on the Night Dragon he drives from the front saddle while she rides behind.'],
  ['👗', 'Clothes', 'The dressing room (C) dresses the two of you and your brothers, sisters and the children travelling with you. Every outfit is fully covering; where an inspiration was not, sleeves, trousers or a headscarf were merged in.'],
  ['🐾', 'Pets', 'Each land has a pet waiting at its plaza. Offer it the food it loves (E) and it joins the caravan; up to four pets travel with you, riding in the van or on the flying carpet.'],
  ['🦌', 'Animals', 'Wild animals are shy. Walk up gently and offer what they eat (E) to befriend them. Friends can live on land you own, in a pen you build.'],
  ['💛', 'People and friends', 'Talk to people (E). Help with what they need and they become friends: they write to you (Messages, N), ask for small things, and remember you.'],
  ['🤲', 'Caring for people', 'The People finder (Y) shows who needs help in each town. Sponsor them in coins or in kind from Care & sponsorship (K), teach them a craft, and give them a room in a home you own.'],
  ['🏡', 'Homes and land', 'Every land has plots for sale. Buy bare land and build (B), or a home in the land\'s own style. Add floors to house more people, grow food in farm beds, and give a home to your parents and his, then visit them.'],
  ['💼', 'Work', 'Work & services (U): a shift a day at an employer raises your skill and your pay; freelance jobs are posted fresh each day. Certificates from institutes open the higher ranks.'],
  ['🏪', 'Businesses', 'Begin in one town by taking orders yourself. Teach the trade to someone who wants work, hand out the orders, then appoint a manager who runs the day. Pay with care, a wage, or keep (a room and food).'],
  ['🌾', 'Farming and supply', 'Buy a field, plant, water and harvest, or employ a farmhand. Couriers and ships carry your harvest to markets or to your kitchens and clinics. Markets pay less the more you sell to them.'],
  ['🏛️', 'Institutes', 'Every land has an institute of its own science. Take a course, assist the professor, write a thesis, and found an institute of your own, stage by stage.'],
  ['🚐', 'Travelling', 'Walk, fly on the cape of light (F), drive Safar, ride a unicorn or the Night Dragon, or take the coach, tram, ferry or air taxi (V). The map (M) takes you to lands you know.'],
  ['🏮', 'The story', 'In each land, help its Keeper and light its lantern together. The objective panel (O) always shows the next step; Grandmother Sarvatara\'s letters show you everything else.'],
];
