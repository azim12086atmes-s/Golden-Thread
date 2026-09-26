import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Animals, type Animal } from './animals/Animals';
import { SPECIES } from './animals/AnimalModel';
import { OUTFITS } from './characters/outfits';
import './characters/wardrobe'; // registers the fusion outfits
import { EventBus } from './core/events';
import { Guide } from './guide/Guide';
import { CakeScene } from './story/CakeScene';
import { Input } from './core/Input';
import { loadGame, saveGame, clearSave } from './core/save';
import { DAY_MINUTES, hourOf, newGame, type GameState, type VanSlot } from './core/state';
import { addItem, craft, removeItems, sell, sellPrice, teach, type CraftResult } from './economy/economy';
import { ITEMS, SKILLS } from './economy/items';
import { Housing, PLOTS, PLOT_BY_ID, PLOT_SIZE, type PlotSite } from './housing/housing';
import { HousingView } from './housing/HousingView';
import { VAN_OPTIONS, VanInterior } from './housing/VanInterior';
import { Npcs, type Npc } from './npc/Npcs';
import { keeperOf } from './npc/people';
import { Travellers } from './player/Travellers';
import { QuestSystem } from './quests/QuestSystem';
import { Messages } from './social/Messages';
import { UI } from './ui/UI';
import { VEHICLES, type VehicleId } from './vehicles/vehicles';
import { Ambience } from './world/Ambience';
import type { ResourceNode } from './world/RegionBuilder';
import { REGION_BY_ID, regionAt, regionCenter, type RegionId, type RegionSpec } from './world/regions';
import { Sky } from './world/Sky';
import { surfaceAt } from './world/terrain';
import { World } from './world/World';

/** Real seconds per game minute: a day lasts 16 real minutes. */
const MINUTES_PER_SECOND = DAY_MINUTES / (16 * 60);
const REGROW = 180; // game-minutes before a gathered resource returns

export type Interactable =
  | { kind: 'npc'; npc: Npc; label: string }
  | { kind: 'node'; node: ResourceNode; label: string }
  | { kind: 'animal'; animal: Animal; label: string }
  | { kind: 'plot'; site: PlotSite; label: string }
  | { kind: 'lantern'; region: RegionId; label: string }
  | { kind: 'van'; label: string }
  | { kind: 'bed'; plotId: string; decorId: string; label: string };

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
  quality: 'low' | 'high' = 'high';
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  readonly bus = new EventBus();
  st: GameState;
  readonly input: Input;
  readonly world = new World();
  readonly sky = new Sky();
  readonly ambience = new Ambience();
  readonly quests: QuestSystem;
  readonly msgs: Messages;
  readonly housing: Housing;
  readonly housingView: HousingView;
  readonly trav: Travellers;
  readonly npcs: Npcs;
  readonly animals: Animals;
  readonly van: VanInterior;
  readonly ui: UI;
  readonly guide: Guide;
  region: RegionSpec;
  inVan = false;
  cutscene: CakeScene | null = null;
  started = false;
  build: { plotId: string; kind: string | null; rot: number } | null = null;
  target: Interactable | null = null;
  private clock = new THREE.Clock();
  private t = 0;
  private saveTimer = 0;
  private tickTimer = 0;
  private mouse = new THREE.Vector2();
  private housingDirty = true;
  private raycaster = new THREE.Raycaster();
  private dress = { blend: 0, yaw: 0, savedYaw: 0, from: new THREE.Vector3(), goal: new THREE.Vector3(), look: new THREE.Vector3() };

  constructor(host: HTMLElement) {
    this.st = loadGame() ?? newGame();
    // One-time: journeys still in the old default clothes move to the new everyday default.
    if (!this.st.flags.includes('kurti-default')) {
      if (this.st.outfits.girl === 'g-meadow') this.st.outfits.girl = 'g-kurti-jeans';
      if (this.st.outfits.boy === 'b-meadow') this.st.outfits.boy = 'b-kurta-jeans';
      this.st.flags.push('kurti-default');
    }
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    host.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);

    this.scene.fog = this.sky.fog;
    this.scene.add(this.world.group, this.sky.group, this.sky.sunLight, this.sky.sunLight.target, this.sky.hemi, this.ambience.points);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.quests = new QuestSystem(this.st, this.bus);
    this.msgs = new Messages(this.st, this.bus);
    this.housing = new Housing(this.st, this.bus);
    this.npcs = new Npcs(this.scene);
    this.animals = new Animals(this.scene, this.st);
    this.housingView = new HousingView(this.scene, this.st, this.world);
    this.trav = new Travellers(this.scene, this.world, this.st, OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.van = new VanInterior(this.st, OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.region = regionAt(this.trav.gPos.x, this.trav.gPos.z);

    this.world.onRegionLoaded = (inst) => {
      this.npcs.onRegionLoaded(inst);
      this.animals.onRegionLoaded(inst);
      this.housingDirty = true;
    };
    this.world.onRegionUnloaded = (inst) => {
      this.npcs.onRegionUnloaded(inst);
      this.animals.onRegionUnloaded(inst);
      this.housingDirty = true;
    };
    for (const e of ['plot:bought', 'plot:changed', 'quest:completed'] as const) this.bus.on(e, () => (this.housingDirty = true));

    this.ui = new UI(this);
    this.guide = new Guide(this);
    this.guide.onNextChanged = (o, first) => {
      this.ui.refreshTracker();
      if (!first && this.started && o.next) this.ui.nextStep(o.next.text);
    };
    this.ui.refreshTracker();
    addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      this.mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    this.renderer.domElement.addEventListener('click', () => this.buildClick());
    addEventListener('beforeunload', () => this.save());
    try { this.setQuality(localStorage.getItem('golden-thread/quality') === 'low' ? 'low' : 'high'); } catch { this.resize(); }
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize(): void {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.van.resize(w, h);
  }

  setQuality(quality: 'low' | 'high'): void {
    this.quality = quality;
    this.renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderer.shadowMap.enabled = quality === 'high';
    this.bloom.enabled = quality === 'high';
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { material.needsUpdate = true; });
      }
    });
    this.resize();
    try { localStorage.setItem('golden-thread/quality', quality); } catch { /* session-only */ }
  }

  takePhoto(): void {
    // Render and copy synchronously before WebGL clears its drawing buffer. DOM UI is excluded.
    if (this.inVan) this.renderer.render(this.van.scene, this.van.camera);
    else this.composer.render();
    const snapshot = document.createElement('canvas');
    snapshot.width = this.renderer.domElement.width;
    snapshot.height = this.renderer.domElement.height;
    snapshot.getContext('2d')!.drawImage(this.renderer.domElement, 0, 0);
    snapshot.toBlob((blob) => {
      if (!blob) return this.toast('Photo could not be saved. Please try again.');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url;
      link.download = 'golden-thread-' + this.region.id + '-' + Date.now() + '.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.toast('Your journey photo is ready.');
    }, 'image/png');
  }

  get hour(): number {
    return hourOf(this.st.minutes);
  }

  // ───────────────────────── main loop ─────────────────────────

  private frame(): void {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;

    if (this.inVan) {
      this.van.update(dt);
      this.guide.update(dt, this.t);
      this.renderer.render(this.van.scene, this.van.camera);
      this.ui.update(dt);
      if (this.input.hit('escape') || this.input.hit('e')) this.exitVan();
      this.input.endFrame();
      return;
    }

    if (this.started) {
      this.st.minutes += dt * MINUTES_PER_SECOND;
      this.st.playSeconds += dt;
      if (!this.cutscene) this.ui.handleKeys();
      this.input.blocked = (this.ui.modal && !this.build) || !!this.cutscene;
      this.trav.update(dt, this.input, this.t);
      this.trackRegion();
    } else {
      // Title screen: a slow orbit around the travellers while the world streams in.
      this.trav.camYaw += dt * 0.08;
      this.trav.update(dt, this.input, this.t);
    }

    this.world.update(this.trav.gPos, this.sky.night);
    this.sky.update(this.hour, this.trav.gPos, this.t, this.region.id);
    this.ambience.setMode(this.region.ambient);
    this.ambience.update(dt, this.trav.gPos, this.t, this.sky.night);
    this.npcs.update(dt, this.t, this.trav.gPos);
    this.animals.update(dt, this.t, this.trav.gPos);
    this.animateNodes();
    if (this.housingDirty) {
      this.housingView.refresh((d) => this.housing.growth(d));
      this.housingDirty = false;
    }

    if (this.started) {
      this.target = this.build || this.cutscene ? null : this.findTarget();
      if (this.input.hit('e') && this.target && !this.ui.modal) this.interact(this.target);
      if (this.build) this.updateBuild();
      this.tickTimer += dt;
      if (this.tickTimer > 1) {
        this.tickTimer = 0;
        this.msgs.tick();
        if (Object.values(this.st.plots).some((p) => p.decor.some((d) => d.crop))) this.housingDirty = this.housingDirty || Math.floor(this.st.minutes) % 30 === 0;
      }
      this.saveTimer += dt;
      if (this.saveTimer > 20) this.save();
    }

    this.trav.updateCamera(this.camera, dt);
    this.cutscene?.update(dt, this.camera);
    this.dressCamera(dt);
    this.guide.update(dt, this.t);
    this.composer.render();
    this.ui.update(dt);
    this.input.endFrame();
  }

  /**
   * The dressing room: the camera swings round to face whoever is being dressed, framed in the
   * upper part of the screen above the outfit shelf. Drag to turn around them.
   */
  private dressCamera(dt: number): void {
    const d = this.dress, open = this.ui.panel === 'wardrobe' && !this.inVan && !this.cutscene;
    if (open && d.blend === 0) { d.yaw = 0; d.savedYaw = this.trav.camYaw; }
    d.blend = THREE.MathUtils.clamp(d.blend + (open ? dt : -dt) * 2.2, 0, 1);
    if (d.blend === 0) return;
    if (open) {
      d.yaw -= this.input.dx * 0.006;
      this.trav.camYaw = d.savedYaw;
    }
    const who = this.ui.wardrobeWho === 'girl' ? this.trav.girl : this.trav.boy;
    const p = who.root.position, face = who.root.rotation.y + d.yaw; // models face +z
    // Frame the whole figure in the band of screen above the shelf.
    const band = THREE.MathUtils.clamp(this.ui.sheetTop() / innerHeight, 0.35, 1);
    const half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const dist = 2.1 / (2 * 0.82 * band * Math.tan(half));
    d.goal.set(p.x + Math.sin(face) * dist, p.y + 1.1, p.z + Math.cos(face) * dist);
    // Aim so the figure's middle sits at the centre of that band, not of the screen.
    const centre = new THREE.Vector3(p.x, p.y + 0.95, p.z);
    const toC = centre.clone().sub(d.goal);
    const drop = (0.5 - band / 2) * 2 * half;
    const right = new THREE.Vector3(-Math.cos(face), 0, Math.sin(face));
    d.look.copy(d.goal).add(toC.applyAxisAngle(right, drop));
    const k = d.blend * d.blend * (3 - 2 * d.blend);
    d.from.copy(this.camera.position);
    this.camera.position.lerpVectors(d.from, d.goal, k);
    const gameLook = new THREE.Vector3().copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()));
    this.camera.lookAt(gameLook.lerp(d.look, k));
  }

  private trackRegion(): void {
    const r = regionAt(this.trav.gPos.x, this.trav.gPos.z);
    if (r.id === this.region.id) return;
    this.region = r;
    const first = !this.st.discovered.includes(r.id);
    if (first) this.st.discovered.push(r.id);
    this.bus.emit('region:entered', { regionId: r.id, first });
  }

  private animateNodes(): void {
    for (const r of this.world.loadedRegions()) for (const n of r.nodes) {
      const last = this.st.gathered[n.id];
      n.mesh.visible = last === undefined || this.st.minutes - last > REGROW;
      if (!n.mesh.visible) continue;
      for (const c of n.mesh.children) if (c.userData.mote) {
        c.position.y = 1.9 + Math.sin(this.t * 2 + n.x) * 0.15;
        c.rotation.y += 0.02;
      }
    }
  }

  // ───────────────────────── interaction ─────────────────────────

  private findTarget(): Interactable | null {
    const p = this.trav.gPos;
    const onFoot = this.trav.mode === 'walk';
    const cands: Array<[number, Interactable]> = [];
    const npc = this.npcs.nearest(p, 4);
    if (npc && onFoot) cands.push([p.distanceTo(npc.pos), { kind: 'npc', npc, label: `Talk to ${npc.def.name}` }]);
    if (onFoot) for (const n of this.world.nodesNear(p.x, p.z, 3.2)) {
      if (!n.mesh.visible || Math.abs(n.y - p.y) > 3) continue;
      cands.push([Math.hypot(n.x - p.x, n.z - p.z), { kind: 'node', node: n, label: `Gather ${ITEMS[n.item].icon} ${ITEMS[n.item].name}` }]);
    }
    const an = this.animals.nearest(p, 3.8);
    if (an && onFoot) {
      const s = this.st.animals[an.id];
      const sp = SPECIES[an.species];
      const label = !s?.befriended ? `Offer ${ITEMS[sp.diet].icon} ${ITEMS[sp.diet].name} to the ${sp.name}`
        : s.plotId ? `Care for ${s.name}` : `${s.name} the ${sp.name}`;
      cands.push([p.distanceTo(an.pos) + 0.5, { kind: 'animal', animal: an, label }]);
    }
    for (const site of PLOTS) {
      const sx = site.x, sz = site.z - PLOT_SIZE / 2 - 1;
      const d = Math.hypot(p.x - sx, p.z - sz);
      if (d < 3.5 && onFoot) cands.push([d, { kind: 'plot', site, label: this.housing.owns(site.id) ? 'Build on your land (B)' : `Buy this land · ${site.price} coins` }]);
    }
    const plot = this.housing.plotAt(p.x, p.z);
    if (plot && this.housing.owns(plot.id) && onFoot) {
      for (const d of this.st.plots[plot.id].decor) {
        if (d.kind !== 'farmbed') continue;
        const dd = Math.hypot(plot.x + d.x - p.x, plot.z + d.z - p.z);
        if (dd > 2.6) continue;
        const g = this.housing.growth(d);
        cands.push([dd, { kind: 'bed', plotId: plot.id, decorId: d.id, label: !d.crop ? 'Plant seeds' : g >= 1 ? 'Harvest' : `Growing… ${Math.round(g * 100)}%` }]);
      }
    }
    const ready = this.quests.lanternReady(this.region.id);
    if (ready) {
      const lp = this.world.landmarkPos.get(this.region.id)!;
      const d = Math.hypot(lp.x - p.x, lp.z - p.z);
      if (d < (this.region.id === 'skyisles' ? 200 : 45)) cands.push([d * 0.2, { kind: 'lantern', region: this.region.id, label: '🏮 Light the lantern together' }]);
    }
    if (this.trav.parkedVan && onFoot && this.trav.parkedVan.pos.distanceTo(p) < 4.5) cands.push([this.trav.parkedVan.pos.distanceTo(p), { kind: 'van', label: 'Step inside Safar' }]);
    cands.sort((a, b) => a[0] - b[0]);
    return cands[0]?.[1] ?? null;
  }

  interact(t: Interactable): void {
    switch (t.kind) {
      case 'npc': return this.talk(t.npc);
      case 'node': return this.gather(t.node);
      case 'animal': return this.ui.openAnimal(t.animal);
      case 'plot': {
        if (this.housing.owns(t.site.id)) return this.enterBuild(t.site.id);
        const r = this.housing.buy(t.site.id);
        if (r === 'ok') this.toast(`🏡 This land is yours. Press B here to build.`, 'reward');
        else if (r === 'coins') this.toast(`You need ${t.site.price} coins for this land.`);
        return;
      }
      case 'bed': {
        const d = this.st.plots[t.plotId].decor.find((x) => x.id === t.decorId)!;
        if (!d.crop) {
          const seed = ['seed_flower', 'seed_herb', 'seed_rice'].find((s) => (this.st.inventory[s] ?? 0) > 0);
          if (!seed) return this.toast('You have no seeds. Craft some with Gardening (I).');
          this.housing.plant(t.plotId, t.decorId, seed);
          this.toast(`Planted ${ITEMS[seed].name}.`);
        } else {
          const out = this.housing.harvest(t.plotId, t.decorId);
          if (out) this.toast(`Harvested ${ITEMS[out].icon} ${ITEMS[out].name}!`, 'reward');
        }
        this.housingDirty = true;
        return;
      }
      case 'lantern':
        if (this.quests.lightLantern(t.region)) this.ui.lanternMoment(REGION_BY_ID[t.region]);
        return;
      case 'van':
        return this.enterVan();
    }
  }

  talk(npc: Npc): void {
    const def = npc.def;
    // Meeting a Keeper for the first time teaches their land's craft.
    if (def.keeper) {
      const skill = REGION_BY_ID[def.region].skill;
      if (teach(this.st, skill)) this.toast(`${def.name} teaches you ${SKILLS[skill].icon} ${SKILLS[skill].name}!`, 'reward');
    }
    this.quests.talk(def.id);
    const f = (this.st.friends[def.id] ??= { hearts: 0, befriended: false, lastMessageAt: this.st.minutes });
    // A first conversation always counts as a small kindness.
    if (f.hearts === 0) f.hearts = 1;
    this.ui.openDialogue(npc);
  }

  gather(n: ResourceNode): void {
    const qty = 1 + (this.st.light > 4 ? 1 : 0);
    addItem(this.st, n.item, qty);
    this.st.gathered[n.id] = this.st.minutes;
    this.bus.emit('item:gained', { id: n.item, qty });
    this.toast(`+${qty} ${ITEMS[n.item].icon} ${ITEMS[n.item].name}`);
  }

  // ───────────────────────── actions the UI calls ─────────────────────────

  toast(text: string, kind: 'info' | 'reward' | 'story' = 'info'): void {
    this.bus.emit('toast', { text, kind });
  }

  craft(recipeId: string): CraftResult {
    const r = craft(this.st, recipeId);
    if (r.ok) {
      this.bus.emit('item:crafted', { id: r.recipe.out, qty: r.recipe.qty });
      this.toast(`Made ${ITEMS[r.recipe.out].icon} ${ITEMS[r.recipe.out].name}${r.levelUp ? ` · ${SKILLS[r.recipe.skill].name} level up!` : ''}`, r.levelUp ? 'reward' : 'info');
    }
    return r;
  }

  sell(item: string): number {
    const got = sell(this.st, item, this.region.id, this.region.wanted);
    if (got) this.bus.emit('coins:changed', { coins: this.st.coins });
    return got;
  }

  priceHere(item: string): number {
    return sellPrice(item, this.region.id, this.region.wanted);
  }

  /** Keepers sell their land's materials. */
  buyMaterial(item: string): boolean {
    const price = Math.ceil(ITEMS[item].value * 1.5);
    if (this.st.coins < price) return false;
    this.st.coins -= price;
    addItem(this.st, item, 1);
    this.bus.emit('item:gained', { id: item, qty: 1 });
    this.bus.emit('coins:changed', { coins: this.st.coins });
    return true;
  }

  wear(who: 'girl' | 'boy', id: string): void {
    this.st.outfits[who] = id;
    (who === 'girl' ? this.trav.girl : this.trav.boy).setOutfit(OUTFITS[id]);
    this.van.setOutfits(OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.bus.emit('outfit:changed', { who });
  }

  chooseVehicle(id: VehicleId): string | null {
    if (!this.st.vehicles.includes(id)) return 'Not yours yet.';
    const err = this.trav.setMode(id);
    if (!err) this.bus.emit('vehicle:changed', { vehicleId: id });
    return err;
  }

  buyVehicle(id: VehicleId): string | null {
    const v = VEHICLES[id];
    if (this.st.vehicles.includes(id)) return null;
    if (v.requires?.flag && !this.st.flags.includes(v.requires.flag)) return 'Earned through friendship, not coins.';
    if (v.requires?.lanterns && this.st.lanterns.length < v.requires.lanterns) return `Light ${v.requires.lanterns} lanterns first.`;
    if (this.st.coins < v.price) return `You need ${v.price} coins.`;
    this.st.coins -= v.price;
    this.st.vehicles.push(id);
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.toast(`${v.icon} ${v.name} is yours!`, 'reward');
    return null;
  }

  /** Travel to a land you have already visited. The journey is implied — the van drives you. */
  travelTo(id: RegionId): void {
    if (!this.st.discovered.includes(id)) return;
    const c = regionCenter(REGION_BY_ID[id]);
    const k = keeperOf(id).at ?? [0, 30];
    this.trav.teleport(c.x + k[0] + 6, c.z + k[1] + 10);
    this.toast(`The road carries you to ${REGION_BY_ID[id].name}.`, 'story');
  }

  befriendAnimal(a: Animal): string {
    const r = this.housing.befriendAnimal(a.id, a.species, Animals.nameFor(a.id));
    const sp = SPECIES[a.species];
    if (r === 'food') return `The ${sp.name} would love ${ITEMS[sp.diet].icon} ${ITEMS[sp.diet].name}.`;
    if (r === 'ok') {
      this.st.light += 0.2;
      this.toast(`💛 ${Animals.nameFor(a.id)} the ${sp.name} is your friend!`, 'reward');
    }
    return '';
  }

  adopt(a: Animal, plotId: string): boolean {
    if (!this.housing.adopt(a.id, plotId)) return false;
    this.animals.relocate(a.id, plotId);
    this.toast(`${this.st.animals[a.id].name} now lives on your land in ${REGION_BY_ID[PLOT_BY_ID[plotId].region].name}.`, 'reward');
    return true;
  }

  // ───── build mode ─────

  enterBuild(plotId: string): void {
    if (!this.housing.owns(plotId)) return;
    this.build = { plotId, kind: null, rot: 0 };
    this.ui.openBuild();
  }

  selectDecor(kind: string | null): void {
    if (!this.build) return;
    this.build.kind = kind;
    this.housingView.setGhost(kind, PLOT_BY_ID[this.build.plotId].region);
  }

  exitBuild(): void {
    this.build = null;
    this.housingView.setGhost(null, 'meadow');
  }

  private buildPoint(): { x: number; z: number; y: number } | null {
    if (!this.build) return null;
    const site = PLOT_BY_ID[this.build.plotId];
    const y = surfaceAt(site.x, site.z);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit)) return null;
    const snap = (v: number) => Math.round(v * 2) / 2;
    return { x: snap(hit.x - site.x), z: snap(hit.z - site.z), y };
  }

  private updateBuild(): void {
    const b = this.build!;
    if (this.input.hit('r')) b.rot += Math.PI / 4;
    if (!b.kind) return;
    const p = this.buildPoint();
    if (!p) return;
    const site = PLOT_BY_ID[b.plotId];
    const ok = this.housing.canPlace(b.plotId, b.kind, p.x, p.z) === 'ok';
    this.housingView.moveGhost(site.x + p.x, surfaceAt(site.x + p.x, site.z + p.z), site.z + p.z, b.rot, ok);
  }

  private buildClick(): void {
    if (!this.build?.kind) return;
    const p = this.buildPoint();
    if (!p) return;
    const r = this.housing.canPlace(this.build.plotId, this.build.kind, p.x, p.z);
    if (r !== 'ok') {
      this.toast({ bounds: 'That is outside your land.', overlap: 'Something is already there.', coins: 'Not enough coins.', locked: 'Not unlocked yet.', plot: 'Not your land.' }[r]);
      return;
    }
    this.housing.place(this.build.plotId, this.build.kind, p.x, p.z, this.build.rot);
    this.housingDirty = true;
  }

  removeDecor(plotId: string, decorId: string): void {
    this.housing.remove(plotId, decorId);
    this.housingDirty = true;
  }

  // ───── the van ─────

  enterVan(): void {
    this.inVan = true;
    this.van.rebuild();
    this.ui.openVan();
  }

  exitVan(): void {
    this.inVan = false;
    this.ui.closePanel();
  }

  setVanSlot(slot: VanSlot, optionId: string): string | null {
    const opt = VAN_OPTIONS[slot].find((o) => o.id === optionId);
    if (!opt) return 'Unknown.';
    if (this.st.van[slot] === optionId) return null;
    if (!removeItems(this.st, opt.cost)) return `Needs ${Object.entries(opt.cost).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}.`;
    this.st.van[slot] = optionId;
    this.van.rebuild();
    this.trav.refreshVan();
    return null;
  }

  // ───── lifecycle ─────

  start(names?: { girl: string; boy: string }): void {
    if (names) this.st.names = names;
    this.started = true;
    this.trav.camYaw = this.trav.heading;
    if (!this.st.quests['main-meadow'] && !this.st.flags.includes('cake')) this.playOpening();
    else if (!this.st.quests['main-meadow']) this.wakeToast();
  }

  private wakeToast(): void {
    this.toast(`${this.st.names.girl} and ${this.st.names.boy} set out from Wanderers' Meadow. Grandmother Noor is waiting by the Great Oak.`, 'story');
  }

  /** The cake under the Great Oak. Plays on a new journey; replayable from Help. */
  playOpening(): void {
    if (this.cutscene || this.inVan) return;
    this.ui.closePanel();
    const scene = new CakeScene(this);
    this.cutscene = scene;
    scene.onDone = () => {
      this.cutscene = null;
      if (!this.st.quests['main-meadow']) this.wakeToast();
      this.guide.refresh();
      this.ui.refreshTracker();
    };
  }

  save(): void {
    this.saveTimer = 0;
    this.trav.save();
    saveGame(this.st);
  }

  newJourney(): void {
    clearSave();
    location.reload();
  }
}

