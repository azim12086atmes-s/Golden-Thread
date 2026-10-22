import { EventBus } from '../src/core/events';
import { newGame } from '../src/core/state';
import { serialize, deserialize } from '../src/core/save';
import { addItem, craft, sell, sellPrice, teach } from '../src/economy/economy';
import { ITEMS, RECIPES, SKILLS } from '../src/economy/items';
import { QuestSystem } from '../src/quests/QuestSystem';
import { QUESTS } from '../src/quests/quests';
import { Messages } from '../src/social/Messages';
import { Housing, PLOTS } from '../src/housing/housing';
import { HousingView } from '../src/housing/HousingView';
import { VanInterior, VAN_OPTIONS, SLOT_NAMES } from '../src/housing/VanInterior';
import { OUTFITS } from '../src/characters/outfits';
import { Npcs } from '../src/npc/Npcs';
import { Townsfolk } from '../src/npc/Townsfolk';
import { Animals } from '../src/animals/Animals';
import { SPECIES } from '../src/animals/AnimalModel';
import { TownDressing } from '../src/world/TownDressing';
import { regionAt, REGION_BY_ID, REGIONS } from '../src/world/regions';
import { surfaceAt } from '../src/world/terrain';
import { VEHICLES } from '../src/vehicles/vehicles';
import { PEOPLE_BY_ID } from '../src/npc/people';
import { WONDERS, wonderHint, foundWonder } from '../src/world/wonders';
import { WonderSites } from '../src/world/WonderSites';
import { Guide } from '../src/guide/Guide';

const REGROW_MINUTES = 180;
const TABS = {
  journal: ['YOUR JOURNAL', 'A world of little journeys', 'Quests, lanterns, and the places you have found.'],
  bag: ['WHAT YOU CARRY', 'Your travelling bag', 'Gather materials and make useful things to trade or keep.'],
  craft: ['KEEPER CRAFTS', 'Make something by hand', 'Learn a land’s craft from its Keeper, then use what you have gathered.'],
  trade: ['THE MARKET', 'Trade for the road', 'Prices change from land to land. Goods wanted here are worth more.'],
  friends: ['LETTERS & KINDNESS', 'Friends along the way', 'Talk, share a gift, or answer a little favour.'],
  home: ['A PLACE TO RETURN TO', 'Land, home, and garden', 'Buy a plot, decorate it, plant a garden, and care for animals who live there.'],
  rides: ['WAYS TO TRAVEL', 'Choose your next ride', 'Explore, complete journeys, and save coins to unlock new ways across the world.'],
  van: ['INSIDE SAFAR', 'A small home on wheels', 'Customize the cabin with things you have made.'],
};

const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = String(text); if (cls) e.className = cls; return e; };
const row = () => node('div', undefined, 'button-row');
const actionButton = (label, fn, cls = 'subtle-button') => { const b = node('button', label, cls); b.type = 'button'; b.addEventListener('click', () => { try { fn(); } catch (e) { console.error(e); } }); return b; };
const amount = (s, id) => s.inventory[id] || 0;
const fmt = (id, qty = 1) => `${ITEMS[id]?.icon || '✦'} ${ITEMS[id]?.name || id}${qty === 1 ? '' : ` × ${qty}`}`;

/** Reuses the original exploration systems in the multiplayer world, with one private local save per invite. */
export class PartyLife {
  constructor(game, { toast = () => {}, openPanel = () => null } = {}) {
    this.game = game;
    this.toast = toast;
    this.beginPanel = openPanel;
    this.observer = game.self?.role === 'observer';
    this.key = `golden-thread/party-life/v1/${String(game.self?.id || 'guest').slice(0, 80)}`;
    this.st = this.load();
    this.bus = new EventBus();
    this.quests = new QuestSystem(this.st, this.bus);
    this.messages = new Messages(this.st, this.bus);
    this.housing = new Housing(this.st, this.bus);
    this.npcs = new Npcs(game.scene);
    this.townsfolk = new Townsfolk(game.scene);
    this.animals = new Animals(game.scene, this.st);
    this.dressing = new TownDressing(game.scene, game.world.solid, game.world.glow);
    this.housingView = new HousingView(game.scene, this.st, game.world);
    this.van = this.makeVanInterior();
    this.worldHook = true;
    this.attached = false;
    this.housingDirty = true;
    this.interior = false;
    this.target = null;
    this.gameSeconds = 0;
    this.lastSave = 0;
    this.messageTimer = 0;
    this.region = regionAt(game.pos.x, game.pos.z);
    this.attachWorld();
    this.wonders = new WonderSites({
      st: this.st, bus: this.bus, scene: game.scene, world: game.world, started: !this.observer, cutscene: null,
      trav: { get gPos() { return game.pos; } }, ui: { lanternMomentText: () => {} },
      toast: (text, kind) => this.toast(text.replace(/ · the thread shines brighter/gi, ''), kind),
    });
    this.bus.on('toast', e => this.toast(e.text, e.kind));
    this.bus.on('plot:bought', () => { this.housingDirty = true; });
    this.bus.on('plot:changed', () => { this.housingDirty = true; });
    this.bus.on('item:gained', () => this.save());
    this.bus.on('quest:completed', () => this.save());
    const life = this;
    const guideGame = {
      st: this.st, bus: this.bus, world: game.world, scene: game.scene, npcs: this.npcs, animals: this.animals,
      sky: game.sky, camera: game.camera, trav: {
        get gPos() { return game.pos; },
        get mode() { return game.vehicle || 'walk'; },
        get camYaw() { return game.yaw || 0; },
      },
      celebration: { objective: () => null },
      get region() { return life.region; },
      get started() { return !life.observer && !game.party?.game && !game.party?.journey?.active; },
      get inVan() { return life.interior; },
      get cutscene() { return null; },
      ui: {
        get modal() { return !!document.querySelector('#panel')?.open; },
        getmodal() { return !!document.querySelector('#panel')?.open; },
      },
      getregion() { return life.region; },
      getstarted() { return !life.observer && !game.party?.game && !game.party?.journey?.active; },
      getinVan() { return life.interior; },
      toast: this.toast,
    };
    this.guide = new Guide(guideGame);
  }

  load() {
    let st = null;
    try { const raw = localStorage.getItem(this.key); if (raw) st = deserialize(raw); } catch {}
    st ||= newGame();
    // Multiplayer keeps the original quests and economy but never imports the paired protagonists' names or story state.
    st.names = { girl: this.game.self?.name || 'Guest', boy: 'Traveller' };
    st.player = { x: this.game.pos.x, y: this.game.pos.y, z: this.game.pos.z, heading: 0 };
    return st;
  }

  makeVanInterior() {
    return new VanInterior(this.st, OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans'], false);
  }

  attachWorld() {
    if (this.attached) return;
    this.attached = true;
    this.game.world.onRegionLoaded = inst => this.onRegionLoaded(inst);
    this.game.world.onRegionUnloaded = inst => this.onRegionUnloaded(inst);
    for (const inst of this.game.world.loadedRegions()) this.onRegionLoaded(inst);
  }
  onRegionLoaded(inst) {
    this.npcs.onRegionLoaded(inst);
    this.townsfolk.onRegionLoaded(inst);
    this.dressing.onRegionLoaded(inst);
    this.animals.onRegionLoaded(inst);
    this.housingDirty = true;
  }
  onRegionUnloaded(inst) {
    this.npcs.onRegionUnloaded(inst);
    this.townsfolk.onRegionUnloaded(inst);
    this.dressing.onRegionUnloaded(inst);
    this.animals.onRegionUnloaded(inst);
    this.housingDirty = true;
  }

  update(dt, t, region = regionAt(this.game.pos.x, this.game.pos.z), night = 0) {
    if (this.interior) { this.van.update(dt); this.guide.update(dt, t); return; }
    this.observer = this.game.self?.role === 'observer';
    this.gameSeconds += dt;
    const previousRegion = this.region;
    this.region = region;
    this.st.minutes += dt * 1.5;
    this.st.playSeconds += dt;
    const p = this.game.pos;
    this.st.player = { x: p.x, y: p.y, z: p.z, heading: this.game.yaw || 0 };
    const next = regionAt(p.x, p.z);
    if (!this.st.discovered.includes(next.id)) {
      this.st.discovered.push(next.id);
      this.bus.emit('region:entered', { regionId: next.id, first: true });
    } else if (next.id !== previousRegion.id) this.bus.emit('region:entered', { regionId: next.id, first: false });
    this.npcs.update(dt, t, p);
    this.townsfolk.update(dt, t, p);
    this.animals.update(dt, t, p);
    this.dressing.update(night);
    this.wonders.update(dt, t);
    this.guide.update(dt, t);
    this.messageTimer += dt;
    if (this.messageTimer >= 1) { this.messageTimer = 0; this.messages.tick(); }
    if (this.housingDirty) {
      this.housingView.refresh(d => this.housing.growth(d));
      this.housingDirty = false;
    }
    this.updateNodes(t);
    if (this.gameSeconds >= this.lastSave + 15) { this.lastSave = this.gameSeconds; this.save(); }
  }

  updateNodes(t) {
    for (const inst of this.game.world.loadedRegions()) for (const n of inst.nodes) {
      const gathered = this.st.gathered[n.id];
      n.mesh.visible = gathered === undefined || this.st.minutes - gathered > REGROW_MINUTES;
      if (!n.mesh.visible) continue;
      for (const c of n.mesh.children) if (c.userData.mote) {
        c.position.y = 1.9 + Math.sin(t * 2 + n.x) * 0.15;
        c.rotation.y += 0.02;
      }
    }
  }

  nearest() {
    const p = this.game.pos; const candidates = [];
    if (this.game.vehicle && this.game.vehicle !== 'walk') return null;
    const npc = this.npcs.nearest(p, 4);
    if (npc) candidates.push([p.distanceTo(npc.pos), { kind: 'npc', value: npc, label: `Talk to ${npc.def.name}` }]);
    for (const n of this.game.world.nodesNear(p.x, p.z, 3.2)) if (n.mesh.visible && Math.abs(n.y - p.y) < 3) candidates.push([Math.hypot(n.x - p.x, n.z - p.z), { kind: 'node', value: n, label: `Gather ${fmt(n.item)}` }]);
    const animal = this.animals.nearest(p, 3.8);
    if (animal) {
      const state = this.st.animals[animal.id], species = SPECIES[animal.species];
      candidates.push([p.distanceTo(animal.pos) + .5, { kind: 'animal', value: animal, label: !state?.befriended ? `Offer ${fmt(species.diet)} to ${species.name}` : `Care for ${state.name}` }]);
    }
    for (const plot of PLOTS) {
      const d = Math.hypot(p.x - plot.x, p.z - (plot.z - 16));
      if (d < 3.5) candidates.push([d, { kind: 'plot', value: plot, label: this.housing.owns(plot.id) ? 'Your home and garden' : `Land for sale · ${plot.price} coins` }]);
    }
    const owned = this.housing.plotAt(p.x, p.z);
    if (owned && this.housing.owns(owned.id)) for (const decor of this.st.plots[owned.id].decor) if (decor.kind === 'farmbed') {
      const d = Math.hypot(owned.x + decor.x - p.x, owned.z + decor.z - p.z);
      if (d < 2.6) candidates.push([d, { kind: 'bed', value: { plot: owned, decor }, label: !decor.crop ? 'Plant seeds' : this.housing.growth(decor) >= 1 ? 'Harvest' : `Growing · ${Math.round(this.housing.growth(decor) * 100)}%` }]);
    }
    const lantern = this.quests.lanternReady(this.region.id), lm = this.game.world.landmarkPos.get(this.region.id);
    if (lantern && lm) { const d = Math.hypot(lm.x - p.x, lm.z - p.z); if (d < 45) candidates.push([d * .2, { kind: 'lantern', value: this.region.id, label: 'Light this land’s lantern' }]); }
    candidates.sort((a, b) => a[0] - b[0]);
    return candidates[0]?.[1] || null;
  }
  hint() { if (this.observer) return ''; this.target = this.nearest(); return this.target?.label || ''; }
  interact() {
    if (this.observer) return true;
    const target = this.nearest(); if (!target) return false;
    if (target.kind === 'npc') this.talk(target.value);
    else if (target.kind === 'node') this.gather(target.value);
    else if (target.kind === 'animal') this.openAnimal(target.value);
    else if (target.kind === 'plot') this.openProperty(target.value);
    else if (target.kind === 'bed') this.useBed(target.value.plot, target.value.decor);
    else if (target.kind === 'lantern') { if (this.quests.lightLantern(target.value)) { this.toast(`The ${this.region.name} lantern glows above the town.`, 'reward'); this.save(); } }
    return true;
  }
  talk(npc) {
    const def = npc.def; const skill = def.keeper ? REGION_BY_ID[def.region].skill : null;
    if (skill && teach(this.st, skill)) this.toast(`${def.name} taught you ${SKILLS[skill].icon} ${SKILLS[skill].name}.`, 'reward');
    this.quests.talk(def.id);
    const friend = this.st.friends[def.id] ||= { hearts: 0, befriended: false, lastMessageAt: this.st.minutes };
    if (!friend.hearts) friend.hearts = 1;
    this.openNpc(npc);
  }
  gather(n) {
    const qty = this.st.light > 4 ? 2 : 1;
    addItem(this.st, n.item, qty); this.st.gathered[n.id] = this.st.minutes;
    this.bus.emit('item:gained', { id: n.item, qty }); this.toast(`+${fmt(n.item, qty)}`); this.save();
  }
  useBed(plot, decor) {
    if (!decor.crop) {
      const seed = ['seed_flower', 'seed_herb', 'seed_rice'].find(id => amount(this.st, id) > 0);
      if (!seed) return this.toast('Find or craft seeds, then plant them here.');
      if (this.housing.plant(plot.id, decor.id, seed)) this.toast(`Planted ${ITEMS[seed].name}.`);
    } else {
      const out = this.housing.harvest(plot.id, decor.id); if (!out) return this.toast('This crop is still growing.');
      this.bus.emit('item:gained', { id: out, qty: 1 }); this.toast(`Harvested ${fmt(out, 4)}.`, 'reward');
    }
    this.housingDirty = true; this.save();
  }
  openAnimal(animal) {
    const s = SPECIES[animal.species], saved = this.st.animals[animal.id];
    const body = this.panel('animal', 'A WILD FRIEND', s.name, saved?.befriended ? `${saved.name} is your friend. Happiness: ${Math.round(this.housing.happiness(animal.id))}%.` : `A ${s.name.toLowerCase()} lives nearby. It likes ${ITEMS[s.diet].name}.`);
    if (!body) return;
    const actions = row();
    if (!saved?.befriended) actions.append(actionButton(`Offer ${fmt(s.diet)}`, () => {
      const result = this.housing.befriendAnimal(animal.id, animal.species, Animals.nameFor(animal.id));
      if (result === 'ok') { this.toast(`${Animals.nameFor(animal.id)} trusts you now.`, 'reward'); this.save(); this.openAnimal(animal); }
      else this.toast(result === 'food' ? `You need ${ITEMS[s.diet].name}.` : 'This animal is already your friend.');
    }, 'gold-button'));
    else {
      actions.append(actionButton(`Feed ${fmt(s.diet)}`, () => { if (this.housing.feed(animal.id)) { this.toast(`${saved.name} is happy.`, 'reward'); this.save(); this.openAnimal(animal); } else this.toast(`You need ${ITEMS[s.diet].name}.`); }));
      actions.append(actionButton('Collect a gift', () => { const item = this.housing.collect(animal.id); if (item) { this.toast(`${saved.name} shared ${fmt(item, 2)}.`, 'reward'); this.save(); } else this.toast('A cared-for animal may share something each day.'); }));
      const plots = PLOTS.filter(p => p.region === animal.region && this.housing.owns(p.id));
      if (!saved.plotId && plots.length) actions.append(actionButton('Move to your nearby plot', () => { this.housing.adopt(animal.id, plots[0].id); this.animals.relocate(animal.id, plots[0].id); this.save(); this.toast(`${saved.name} has a home in your garden.`); }, 'subtle-button'));
    }
    actions.append(actionButton('Done', () => {})); body.append(actions);
  }
  openProperty(plot) {
    const site = plot, region = REGION_BY_ID[plot.region];
    const body = this.panel('home', 'A PLOT IN ' + region.name.toUpperCase(), this.housing.owns(site.id) ? 'Your little homestead' : 'A place to make your own', `Land costs ${site.price} coins. A ready-made home costs ${this.housing.homePrice(site.id)}.`);
    if (!body) return;
    const actions = row();
    if (!this.housing.owns(site.id)) {
      actions.append(actionButton(`Buy land · ${site.price} coins`, () => { const r = this.housing.buy(site.id); if (r === 'ok') { this.toast('This plot is yours.', 'reward'); this.save(); this.openProperty(site); } else this.toast('You need more coins. Trade some goods.'); }, 'gold-button'));
      actions.append(actionButton(`Buy a home · ${this.housing.homePrice(site.id)} coins`, () => { const r = this.housing.buyHome(site.id); if (r === 'ok') { this.toast('A home is waiting for you.', 'reward'); this.housingDirty = true; this.save(); this.openProperty(site); } else this.toast('You need more coins. Trade some goods.'); }));
    } else {
      const owned = this.st.plots[site.id];
      body.append(node('p', `${owned.decor.length} decorations · ${owned.decor.filter(x => x.crop).length} growing crops.`));
      const add = row();
      for (const d of this.housing.unlocked()) add.append(actionButton(`${d.icon} ${d.name} · ${d.price} coins`, () => this.openPlacement(site, d.id)));
      body.append(add);
      owned.decor.slice().forEach(d => body.append(actionButton(`Remove ${d.kind} · refund`, () => { this.housing.remove(site.id, d.id); this.housingDirty = true; this.save(); this.openProperty(site); })));
    }
    body.append(actions);
  }

  openPlacement(plot, kind) {
    const def = this.housing.unlocked().find(d => d.id === kind);
    if (!def || !this.housing.owns(plot.id)) return;
    const region = REGION_BY_ID[plot.region];
    const body = this.panel('home', `BUILD IN ${region.name.toUpperCase()}`, `Place ${def.name}`, 'Set the decoration position within your plot. The preview turns green where the original building rules allow it.');
    if (!body) return;
    this.placement = { plot, kind, x: 0, z: 0, rot: 0 };
    this.housingView.setGhost(kind, plot.region);
    const controls = row();
    const fields = {};
    for (const [key, label] of [['x', 'Plot X'], ['z', 'Plot Z'], ['rot', 'Rotation (degrees)']]) {
      const wrap = node('label', label, 'field');
      const input = node('input'); input.type = 'number'; input.step = key === 'rot' ? '15' : '1'; input.value = '0';
      wrap.append(input); fields[key] = input; controls.append(wrap);
      input.addEventListener('input', () => {
        this.placement[key] = input.valueAsNumber;
        this.refreshPlacementPreview(body, fields, plot, def);
      });
    }
    body.append(controls);
    const status = node('p', ''); status.className = 'placement-status'; body.append(status);
    const actions = row();
    actions.append(actionButton('Place decoration', () => {
      const { x, z, rot } = this.placement;
      if (this.housing.canPlace(plot.id, kind, x, z) !== 'ok') return this.toast('Choose a valid position with enough coins.');
      if (!this.housing.place(plot.id, kind, x, z, rot * Math.PI / 180)) return this.toast('That decoration cannot be placed there.');
      this.housingView.setGhost(null, plot.region); this.placement = null; this.housingDirty = true; this.save(); this.openProperty(plot);
    }, 'gold-button'));
    actions.append(actionButton('Cancel', () => { this.housingView.setGhost(null, plot.region); this.placement = null; this.openProperty(plot); }));
    body.append(actions);
    this.refreshPlacementPreview(body, fields, plot, def);
  }

  refreshPlacementPreview(body, fields, plot, def) {
    const p = this.placement;
    if (!p) return;
    const x = fields.x.valueAsNumber, z = fields.z.valueAsNumber, rot = fields.rot.valueAsNumber;
    p.x = x; p.z = z; p.rot = rot;
    const result = [x, z, rot].every(Number.isFinite) ? this.housing.canPlace(plot.id, p.kind, x, z) : 'bounds';
    const wx = plot.x + (Number.isFinite(x) ? x : 0), wz = plot.z + (Number.isFinite(z) ? z : 0);
    this.housingView.moveGhost(wx, surfaceAt(wx, wz), wz, Number.isFinite(rot) ? rot * Math.PI / 180 : 0, result === 'ok');
    const status = body.querySelector('.placement-status');
    if (status) status.textContent = result === 'ok' ? `Valid · ${def.price} coins · ${this.st.coins} coins available` : result === 'coins' ? `You need ${def.price} coins.` : `This position is blocked or outside the plot (${result}).`;
  }

  panel(tab, eyebrow, title, description = '') {
    if (this.observer) return null;
    return this.beginPanel(tab, eyebrow, title, description) || null;
  }
  open(tab = 'journal') {
    if (this.observer || !TABS[tab]) return;
    if (tab === 'van') this.interior = true;
    const [eyebrow, title, description] = TABS[tab]; const body = this.panel(tab, eyebrow, title, description); if (!body) return;
    if (tab === 'journal') this.renderJournal(body);
    else if (tab === 'bag') this.renderBag(body);
    else if (tab === 'craft') this.renderCraft(body);
    else if (tab === 'trade') this.renderTrade(body);
    else if (tab === 'friends') this.renderFriends(body);
    else if (tab === 'home') this.renderHome(body);
    else if (tab === 'rides') this.renderRides(body);
    else if (tab === 'van') this.renderVan(body);
  }

  renderJournal(body) {
    body.append(node('p', `Day ${Math.floor(this.st.minutes / 1440) + 1} · ${Math.floor(this.st.minutes % 1440 / 60)}:00 · ${this.st.coins} coins · ${this.st.lanterns.length}/${REGIONS.length} lanterns`));
    for (const q of this.quests.active()) {
      const card = node('article', `${q.title} · ${this.quests.stepText(q.id)}`, 'game-card');
      card.append(actionButton(this.st.tracked === q.id ? 'Following this journey' : 'Follow this journey', () => {
        this.guide.track(q.id); this.guide.refresh(); this.save(); this.open('journal');
      }));
      body.append(card);
    }
    const offered = QUESTS.filter(q => this.st.discovered.includes(q.region) && this.quests.isAvailable(q));
    if (offered.length) body.append(node('h3', 'Journeys to begin by meeting their Keeper'));
    for (const q of offered) body.append(node('p', `${REGION_BY_ID[q.region].name} · ${q.title}`));
    body.append(node('p', `Visited: ${this.st.discovered.map(id => REGION_BY_ID[id]?.name).filter(Boolean).join(' · ') || 'The meadow'}`));
    body.append(node('p', `Lanterns lit: ${this.st.lanterns.map(id => REGION_BY_ID[id]?.name).join(' · ') || 'None yet'}`));
    body.append(node('h3', `Hidden wonders · ${WONDERS.filter(w => foundWonder(this.st, w.id)).length}/${WONDERS.length}`));
    for (const w of WONDERS) body.append(node('p', `${foundWonder(this.st, w.id) ? '✦' : '◇'} ${w.name} · ${foundWonder(this.st, w.id) ? 'Found' : wonderHint(w)}`));
    const completed = this.quests.done(); if (completed.length) body.append(node('p', `Completed: ${completed.map(q => q.title).join(' · ')}`));
  }
  renderBag(body) {
    const entries = Object.entries(this.st.inventory).filter(([, n]) => n > 0);
    body.append(node('p', 'Your finds, friendships, and home are saved on this device. Gather resources, trade carefully, and learn crafts from each land’s Keeper.'));
    body.append(node('p', entries.map(([id, n]) => `${fmt(id)} × ${n}`).join('  ·  ') || 'Your bag is empty. Find a resource node and press E.'));
    const actions = row(); actions.append(actionButton('Open crafting', () => this.open('craft'), 'gold-button'), actionButton('Trade goods', () => this.open('trade'))); body.append(actions);
  }
  renderCraft(body) {
    const skill = REGION_BY_ID[this.region.id].skill;
    body.append(node('p', `${SKILLS[skill].icon} ${SKILLS[skill].name} · level ${this.st.skills[skill]}`));
    for (const recipe of RECIPES) {
      const need = Object.entries(recipe.needs).map(([id, n]) => `${fmt(id)} ${amount(this.st, id)}/${n}`).join(' · ');
      const b = actionButton(`${fmt(recipe.out, recipe.qty)} · ${need} · ${SKILLS[recipe.skill].name}`, () => { const result = craft(this.st, recipe.id); if (result.ok) { this.bus.emit('item:crafted', { id: result.recipe.out, qty: result.recipe.qty }); this.toast(`Made ${fmt(result.recipe.out, result.recipe.qty)}.`, result.levelUp ? 'reward' : 'info'); this.save(); this.open('craft'); } else this.toast(result.reason === 'skill' ? 'Talk with a Keeper to learn this craft.' : 'Gather the materials first.'); });
      b.disabled = this.st.skills[recipe.skill] < recipe.level || !Object.entries(recipe.needs).every(([id, n]) => amount(this.st, id) >= n);
      body.append(b);
    }
  }
  renderTrade(body) {
    const r = this.region;
    body.append(node('p', `${r.name} wants ${r.wanted.map(id => ITEMS[id]?.name).join(', ')}.`));
    for (const [id, qty] of Object.entries(this.st.inventory)) if (qty > 0) body.append(actionButton(`Sell ${fmt(id)} · ${sellPrice(id, r.id, r.wanted)} coins`, () => { const coins = sell(this.st, id, r.id, r.wanted); if (coins) { this.toast(`+${coins} coins`, 'reward'); this.bus.emit('coins:changed', { coins: this.st.coins }); this.save(); this.open('trade'); } }));
    const localMaterials = r.materials.filter(id => ITEMS[id]);
    for (const id of localMaterials) body.append(actionButton(`Buy ${fmt(id)} · ${Math.ceil(ITEMS[id].value * 1.5)} coins`, () => {
      const cost = Math.ceil(ITEMS[id].value * 1.5); if (this.st.coins < cost) return this.toast('You need more coins.');
      this.st.coins -= cost; addItem(this.st, id, 1); this.bus.emit('item:gained', { id, qty: 1 }); this.save(); this.open('trade');
    }));
  }
  renderFriends(body) {
    const friends = this.messages.friends();
    if (!friends.length) body.append(node('p', 'Meet a Keeper or neighbour in town to begin a friendship.'));
    for (const id of Object.keys(this.st.friends)) {
      const person = PEOPLE_BY_ID[id]; if (!person) continue;
      const f = this.st.friends[id], box = node('article', undefined, 'game-card');
      box.append(node('h3', `${person.name} · ${'♥'.repeat(f.hearts)}${'♡'.repeat(5 - f.hearts)}`));
      const latest = this.messages.thread(id).slice(-2); for (const m of latest) box.append(node('p', `${m.from === 'us' ? 'You' : person.name}: ${m.text}`));
      const actions = row(); actions.append(actionButton('Ask how they are', () => { this.messages.reply(id, 'ask'); this.save(); this.open('friends'); }));
      actions.append(actionButton('Send a gift', () => { const item = Object.keys(this.st.inventory).find(key => amount(this.st, key) > 0); if (item && this.messages.gift(id, item)) { this.toast(`Sent ${fmt(item)} to ${person.name}.`, 'reward'); this.save(); this.open('friends'); } else this.toast('Gather something to share first.'); }));
      const thread = this.messages.thread(id); const request = [...thread].reverse().find(m => m.request && !m.request.done);
      if (request) actions.append(actionButton(`Send favour · ${request.request.qty} ${ITEMS[request.request.item].name}`, () => { if (this.messages.fulfil(request.id)) { this.toast('Your favour reached its destination.', 'reward'); this.save(); this.open('friends'); } else this.toast('Gather the requested goods first.'); }));
      box.append(actions); body.append(box);
    }
    body.append(actionButton('Open letters', () => { const unread = this.messages.unread(); for (const id of friends) this.messages.markRead(id); this.toast(unread ? `${unread} letters read.` : 'All caught up.'); this.save(); }));
  }
  renderHome(body) {
    for (const p of PLOTS) {
      const owned = this.housing.owns(p.id); const site = row();
      site.append(node('span', `${REGION_BY_ID[p.region].name} · ${owned ? `${this.st.plots[p.id].decor.length} decorations` : `${p.price} coins`}`));
      site.append(actionButton(owned ? 'Decorate' : 'Buy plot', () => owned ? this.openProperty(p) : this.openProperty(p)));
      body.append(site);
    }
  }
  renderRides(body) {
    for (const v of Object.values(VEHICLES)) {
      const owned = this.st.vehicles.includes(v.id), r = row();
      r.append(node('p', `${v.icon} ${v.name} · ${v.blurb}`));
      if (owned) r.append(actionButton('Choose ride', () => { const err = this.game.setVehicle?.(v.id); if (err) this.toast(err); else { this.toast(`${v.name} selected.`); if (v.id === 'van') this.open('van'); } }, 'gold-button'));
      else r.append(actionButton(`Buy · ${v.price} coins`, () => {
        const err = v.requires?.flag && !this.st.flags.includes(v.requires.flag) ? 'Earned through friendship, not coins.' : v.requires?.lanterns && this.st.lanterns.length < v.requires.lanterns ? `Light ${v.requires.lanterns} lanterns first.` : this.st.coins < v.price ? `You need ${v.price} coins.` : '';
        if (err) return this.toast(err);
        this.st.coins -= v.price; this.st.vehicles.push(v.id); this.bus.emit('coins:changed', { coins: this.st.coins }); this.save(); this.open('rides');
      }));
      body.append(r);
    }
  }
  renderVan(body) {
    body.append(actionButton('Step back outside', () => { this.closeInterior(); this.open('rides'); }));
    for (const [slot, options] of Object.entries(VAN_OPTIONS)) {
      body.append(node('h3', SLOT_NAMES[slot])); const choices = row();
      for (const option of options) choices.append(actionButton(`${option.name}${Object.keys(option.cost).length ? ` · ${Object.entries(option.cost).map(([id, n]) => `${fmt(id, n)} (${amount(this.st, id)})`).join(', ')}` : ''}`, () => {
        const current = this.st.van[slot] === option.id; if (current) return;
        const enough = Object.entries(option.cost).every(([id, n]) => amount(this.st, id) >= n);
        if (!enough) return this.toast('Gather or craft the materials first.');
        for (const [id, n] of Object.entries(option.cost)) this.st.inventory[id] -= n;
        this.st.van[slot] = option.id; this.van.rebuild(); this.save(); this.open('van');
      }, this.st.van[slot] === option.id ? 'gold-button' : 'subtle-button'));
      body.append(choices);
    }
  }
  openNpc(npc) {
    const def = npc.def, skill = def.keeper ? REGION_BY_ID[def.region].skill : null;
    const body = this.panel('dialogue', def.keeper ? `${SKILLS[skill].icon} KEEPER OF ${REGION_BY_ID[def.region].name.toUpperCase()}` : REGION_BY_ID[def.region].name.toUpperCase(), def.name, def.lines?.[0] || 'A neighbour waves you over.');
    if (!body) return;
    const actions = row();
    for (const q of this.quests.offeredBy(def.id)) actions.append(actionButton(`Take journey: ${q.title}`, () => { this.quests.start(q.id); this.save(); this.toast(`Journey started: ${q.title}.`, 'story'); this.open('journal'); }, 'gold-button'));
    for (const q of this.quests.deliverable(def.id)) actions.append(actionButton(`Deliver ${q.steps[this.st.quests[q.id].step].qty} goods`, () => { if (this.quests.deliver(q.id)) { this.toast('Your delivery made someone’s day.', 'reward'); this.save(); this.openNpc(npc); } }));
    if (skill) actions.append(actionButton(`Learn ${SKILLS[skill].name}`, () => { if (teach(this.st, skill)) this.toast(`${SKILLS[skill].name} learned.`, 'reward'); else this.toast('You already know this craft.'); this.save(); this.open('craft'); }));
    if (skill) for (const item of REGION_BY_ID[def.region].materials) if (ITEMS[item]) actions.append(actionButton(`Buy ${fmt(item)} · ${Math.ceil(ITEMS[item].value * 1.5)} coins`, () => {
      const cost = Math.ceil(ITEMS[item].value * 1.5); if (this.st.coins < cost) return this.toast('You need more coins.');
      this.st.coins -= cost; addItem(this.st, item, 1); this.bus.emit('item:gained', { id: item, qty: 1 }); this.save(); this.openNpc(npc);
    }));
    actions.append(actionButton('Trade here', () => this.open('trade')));
    actions.append(actionButton('Friends & letters', () => this.open('friends')));
    body.append(actions);
  }

  get view() { return this.interior ? { scene: this.van.scene, camera: this.van.camera } : null; }
  resize(width = innerWidth, height = innerHeight) { this.van.resize(width, height); }
  closeInterior() {
    this.interior = false;
    if (this.placement) { this.housingView.setGhost(null, this.placement.plot.region); this.placement = null; }
    this.game.input && (this.game.input.blocked = false);
  }
  save() {
    if (this.observer) return false;
    this.st.names = { girl: this.game.self?.name || 'Guest', boy: 'Traveller' };
    try { localStorage.setItem(this.key, serialize(this.st)); return true; } catch { return false; }
  }
  destroy() {
    this.save();
    const guide = this.guide;
    if (guide) {
      guide.waypoint?.remove(); guide.compass?.remove();
      const objects = [guide.beam, guide.ring, ...(guide.motes || [])].filter(Boolean);
      const geometries = new Set(), materials = new Set();
      for (const object of objects) {
        this.game.scene.remove(object);
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
      }
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    }
    if (this.worldHook) { this.game.world.onRegionLoaded = undefined; this.game.world.onRegionUnloaded = undefined; this.attached = false; }
    for (const r of this.game.world.loadedRegions()) { this.npcs.onRegionUnloaded(r); this.townsfolk.onRegionUnloaded(r); this.dressing.onRegionUnloaded(r); this.animals.onRegionUnloaded(r); }
    this.interior = false;
  }
}
