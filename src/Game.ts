import * as THREE from 'three';
import { CASTLE_DOOR } from './event/site';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Animals, type Animal } from './animals/Animals';
import { SPECIES } from './animals/AnimalModel';
import { OUTFITS } from './characters/outfits';
import './characters/wardrobe'; // registers the fusion outfits
import { EventBus } from './core/events';
import { Guide } from './guide/Guide';
import { CakeScene } from './story/CakeScene';
import { FestivalAir } from './world/FestivalAir';
import { CivicMarkers } from './world/CivicMarkers';
import { CityScreens } from './world/CityScreens';
import { THREAD_FLAG, ThreadScene } from './story/ThreadScene';
import { StoryScene } from './story/StoryScene';
import { STORY_FLAG } from './story/storyline';
import { Celebration } from './event/Celebration';
import { Input } from './core/Input';
import { loadGame, saveGame, clearSave, storage } from './core/save';
import { currentPlayer, currentSaveKey } from './core/profiles';
import { MILESTONES, dayKey, entryOn, replyFor, streak, writeEntry, type MoodId } from './diary/diary';
import { SKY_PAUSED, TIME_LABEL, jumpTo, type TimeOfDay } from './core/time';
import { DAY_MINUTES, hourOf, newGame, type GameState, type VanSlot } from './core/state';
import { addItem, craft, removeItems, teach, type CraftResult } from './economy/economy';
import { ITEMS, SKILLS } from './economy/items';
import { CROPS, Housing, PLOTS, PLOT_BY_ID, PLOT_SIZE, buySeed, seedPrice, type PlotSite } from './housing/housing';
import { HousingView } from './housing/HousingView';
import { VAN_OPTIONS, VanInterior } from './housing/VanInterior';
import { Npcs, type Npc } from './npc/Npcs';
import { Townsfolk, type Walker } from './npc/Townsfolk';
import { talkToFolk } from './npc/folk';
import { CaravanView } from './caravan/CaravanView';
import { dress } from './caravan/dress';
import { parentsAsResidents, tickParents, visit, type Whose } from './housing/parents';
import { MeetScene, metFlag } from './story/MeetScene';
import { PETS, strayHome, type PetDef } from './caravan/caravan';
import { WonderSites } from './world/WonderSites';
import { PEOPLE, keeperOf } from './npc/people';
import { Travellers } from './player/Travellers';
import { QuestSystem } from './quests/QuestSystem';
import { Messages } from './social/Messages';
import { UI } from './ui/UI';
import { VEHICLES, setVehicleEnvironment, setVehicleNight, type VehicleId } from './vehicles/vehicles';
import { Traffic } from './traffic/Traffic';
import { PERSON_BY_ID, floorBuilding, floorsOf, residentsOf, tickCharity } from './charity/charity';
import { InstitutesView } from './institutions/InstitutesView';
import { NeedFolkView } from './charity/NeedFolkView';
import { PlotsView } from './housing/PlotsView';
import { NEED_LABEL, PEOPLE_IN_NEED, hasMet, meet, needSpot, sponsorOf, type Person } from './charity/charity';
import { FieldsView } from './economy/FieldsView';
import { HarboursView } from './economy/HarboursView';
import { harbours } from './world/harbours';
import { BridgesView } from './world/BridgesView';
import { FIELD_SITES, FIELD_SIZE, fieldGrowth, tickFields } from './economy/fields';
import { couriersIn, marketPrice, sellHere, tickSupply } from './economy/supply';
import { tickBusinesses } from './economy/business';
import { tickInventions } from './economy/inventions';
import { befriend, befriendMet } from './social/friends';
import { tickHomes } from './economy/storage';
import { Dragons } from './creatures/Dragons';
import { DRAGON_NIGHT } from './creatures/dragonKit';
import { designOf } from './housing/designs';
import { keepInTouch, tickLearning } from './charity/upskill';
import { carryNews } from './economy/economy';
import { expireErrands } from './npc/folk';
import { tickWeavers } from './economy/crews';
import { CAVE_LANDS, CAVE_NAME, caveMouth, type Cave } from './world/caves';
import { SITE_BY_ID, instituteAt, landScience, siteAt, standingStage, tickInstitutes } from './institutions/institutions';
import { INSTITUTE_BY_KIND } from './institutions/catalogue';
import { Ambience } from './world/Ambience';
import { RegionFX } from './world/RegionFX';
import { TownDressing } from './world/TownDressing';
import { SkyLanterns } from './world/SkyLanterns';
import type { Door, ResourceNode } from './world/RegionBuilder';
import { HouseInterior, doorLabel, interiorSpecFor, roomTitle, safeInterior } from './housing/HouseInterior';
import { buildInterior } from './world/models/interiors';
import { REGION_BY_ID, regionAt, regionCenter, type RegionId, type RegionSpec } from './world/regions';
import { Sky } from './world/Sky';
import { SkyFX } from './world/SkyFX';
import { Weather } from './world/Weather';
import { surfaceAt, terrainHeight } from './world/terrain';
import { World } from './world/World';
import { FOLIAGE_UNIFORMS, updateWind } from './world/wind';
import { EVENT_TEXT, leafSeason, seasonOf, weatherEvent, type WeatherEvent } from './world/seasons';
import { setLamps } from './world/lamplight';
import { Atmos } from './world/Atmos';
import { Ride, airRide, coachRide, ferryRide, streetTramRide, tramRide } from './travel/Ride';
import { SkyTram } from './travel/SkyTram';
import { tramBoarding } from './travel/gondola';
import { ferryFare } from './travel/ferry';
import { airFare, skyPadPoint, type AirPoint } from './travel/air';
import { busFare, busStops, type BusStop } from './travel/bus';
import { PENTHOUSE_PRICE, buyPenthouse, ownsPenthouse } from './housing/penthouses';
import { TRAM_FARE, TRAM_NAME, TRAM_TOWNS, tramStops, type TramStop } from './travel/streetTram';

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
  | { kind: 'chariot'; label: string }
  | { kind: 'companion'; id: string; label: string }
  | { kind: 'folk'; walker: Walker; label: string }
  | { kind: 'door'; door: Door; label: string }
  | { kind: 'market'; walker: Walker; label: string }
  | { kind: 'stray'; pet: PetDef; label: string }
  | { kind: 'bed'; plotId: string; decorId: string; label: string }
  | { kind: 'institute'; site: string; label: string }
  | { kind: 'cave'; cave: Cave; label: string }
  | { kind: 'field'; field: string; label: string }
  | { kind: 'harbour'; land: RegionId; label: string }
  | { kind: 'need'; person: Person; label: string }
  | { kind: 'busstop'; stop: BusStop; label: string }
  | { kind: 'tramstop'; stop: TramStop; label: string }
  | { kind: 'skypad'; label: string }
  | { kind: 'tram'; up: boolean; label: string };

/** A scripted scene that takes the camera (and optionally renders its own scene). */
export interface Cutscene {
  update(dt: number, camera: THREE.PerspectiveCamera): void;
  finish(skipped?: boolean): void;
  readonly finished: boolean;
  view?: { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null;
  /** The caravan walks on screen during this scene. */
  caravan?: boolean;
}

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
  readonly regionFx = new RegionFX();
  readonly skyLanterns = new SkyLanterns();
  /** What each land flies in its air on a festival day (FestivalAir.ts). */
  private festivalAir!: FestivalAir;
  /** New Yonder's big screens (CityScreens.ts). */
  private cityScreens!: CityScreens;
  /** Pointers over the town's place of worship and market (CivicMarkers.ts). */
  private civicMarkers = new CivicMarkers();
  /** Each land's own sky effects (world/skies.ts). */
  readonly skyFx = new SkyFX();
  /** Each land's weather: dust, snow, mist, haze or pollen on the wind. */
  readonly weather = new Weather();
  /** Each land's traffic: its roads, waters and skies alive with vehicles, boats, craft and creatures. */
  readonly traffic = new Traffic();
  private charityClock = 0;
  /** The weather event over the land they are in (seasons.ts), checked every couple of seconds. */
  weatherNow: WeatherEvent = 'none';
  private tmpTint = new THREE.Vector3();
  private floorsSig = '';
  readonly quests: QuestSystem;
  readonly msgs: Messages;
  readonly housing: Housing;
  readonly housingView: HousingView;
  /** Institute sites: the town's own institute and the ones you found (institutions/). */
  readonly institutesView: InstitutesView;
  readonly fieldsView: FieldsView;
  readonly harboursView: HarboursView;
  /** The Sky Isles cable car's two shuttling cabins. */
  private readonly skyTram: SkyTram;
  readonly bridgesView: BridgesView;
  readonly needFolk: NeedFolkView;
  readonly plotsView: PlotsView;
  readonly trav: Travellers;
  readonly npcs: Npcs;
  readonly townsfolk: Townsfolk;
  readonly dressing: TownDressing;
  readonly animals: Animals;
  readonly van: VanInterior;
  /** The room behind whichever front door they stepped through. */
  readonly house: HouseInterior;
  inHouse = false;
  readonly ui: UI;
  readonly guide: Guide;
  readonly celebration: Celebration;
  readonly caravan: CaravanView;
  readonly wonders: WonderSites;
  region: RegionSpec;
  inVan = false;
  cutscene: Cutscene | null = null;
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
  /** A soft light around each traveller (hers blush, his warm gold), brighter at night. */
  /** The great dragon circling the temple of the Jade Terraces. */
  private dragons!: Dragons;
  private auras = [new THREE.PointLight('#ffc4dd', 0, 7, 2), new THREE.PointLight('#ffdca0', 0, 7, 2)];
  private dress = { blend: 0, yaw: 0, savedYaw: 0, from: new THREE.Vector3(), goal: new THREE.Vector3(), look: new THREE.Vector3() };

  /** Where this journey is kept, and who is signed in ('' = playing as a guest). */
  readonly saveKey: string;
  readonly player: string;

  constructor(host: HTMLElement) {
    // The signed-in player's journey, or the device's own (core/profiles.ts).
    this.saveKey = currentSaveKey(storage());
    this.player = currentPlayer(storage())?.name ?? '';
    this.st = loadGame(storage(), this.saveKey) ?? newGame();
    // One-time: journeys still in the old default clothes move to the new everyday default.
    if (!this.st.flags.includes('kurti-default')) {
      if (this.st.outfits.girl === 'g-meadow') this.st.outfits.girl = 'g-kurti-jeans';
      if (this.st.outfits.boy === 'b-meadow') this.st.outfits.boy = 'b-kurta-jeans';
      this.st.flags.push('kurti-default');
    }
    if (!this.st.flags.includes('kurti-default-2')) {
      this.st.outfits = { girl: 'g-kurti-jeans', boy: 'b-kurta-jeans' };
      this.st.flags.push('kurti-default-2');
    }
    befriendMet(this.st);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    host.appendChild(this.renderer.domElement);
    this.input = new Input(this.renderer.domElement);

    // A small studio light for vehicle paint and metal to reflect (the world itself is not lit by it).
    {
      const pm = new THREE.PMREMGenerator(this.renderer);
      const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      setVehicleEnvironment(env);
      this.traffic.setEnvironment(env);
      pm.dispose();
    }
    this.scene.fog = this.sky.fog;
    this.scene.add(...this.auras);
    this.dragons = new Dragons(this.scene);
    this.scene.add(this.atmos.group);
    this.scene.add(this.world.group, this.sky.group, this.sky.sunLight, this.sky.sunLight.target, this.sky.hemi, this.ambience.points, this.regionFx.points, this.skyLanterns.mesh, this.skyFx.group, this.weather.group, this.traffic.group);
    this.festivalAir = new FestivalAir(this.world.solid, this.world.glow);
    this.cityScreens = new CityScreens(this.world.solid);
    this.scene.add(this.festivalAir.group, this.cityScreens.group, this.civicMarkers.group);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.regionFx.grade);
    this.composer.addPass(new OutputPass());

    this.quests = new QuestSystem(this.st, this.bus);
    this.msgs = new Messages(this.st, this.bus);
    this.housing = new Housing(this.st, this.bus);
    this.npcs = new Npcs(this.scene);
    this.townsfolk = new Townsfolk(this.scene);
    this.dressing = new TownDressing(this.scene, this.world.solid, this.world.glow, this.world.builtWater);
    this.animals = new Animals(this.scene, this.st);
    this.housingView = new HousingView(this.scene, this.st, this.world);
    this.institutesView = new InstitutesView(this.scene, this.st, this.world);
    this.fieldsView = new FieldsView(this.scene, this.st, this.world);
    this.harboursView = new HarboursView(this.scene, this.world);
    this.skyTram = new SkyTram(this.scene, this.world);
    this.bridgesView = new BridgesView(this.scene, this.world);
    this.needFolk = new NeedFolkView(this.scene, this.st, this.world);
    this.plotsView = new PlotsView(this.scene, this.st, this.world);
    this.trav = new Travellers(this.scene, this.world, this.st, OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.van = new VanInterior(this.st, OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.house = new HouseInterior(OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.region = regionAt(this.trav.gPos.x, this.trav.gPos.z);

    this.world.onRegionLoaded = (inst) => {
      this.npcs.onRegionLoaded(inst);
      this.townsfolk.onRegionLoaded(inst);
      this.dressing.onRegionLoaded(inst);
      this.animals.onRegionLoaded(inst);
      this.housingDirty = true;
    };
    this.world.onRegionUnloaded = (inst) => {
      this.npcs.onRegionUnloaded(inst);
      this.townsfolk.onRegionUnloaded(inst);
      this.dressing.onRegionUnloaded(inst);
      this.animals.onRegionUnloaded(inst);
      this.housingDirty = true;
    };
    for (const e of ['plot:bought', 'plot:changed', 'quest:completed'] as const) this.bus.on(e, () => (this.housingDirty = true));

    this.ui = new UI(this);
    this.celebration = new Celebration(this);
    this.caravan = new CaravanView(this);
    this.wonders = new WonderSites(this);
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
    this.warmUp();
  }

  /**
   * Shaders are compiled before the world is first drawn, in parallel and off the main thread
   * where the browser allows (renderer.compileAsync), instead of freezing the first frames; new
   * lands and monuments are compiled the same way before they are shown.
   */
  private ready = false;
  private async warmUp(): Promise<void> {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 30 && !this.world.loadedRegions().length; i++) await wait(100);
    try { await Promise.race([this.renderer.compileAsync(this.scene, this.camera), wait(15000)]); } catch { /* draw anyway */ }
    this.ready = true;
    this.world.compile = (o) => this.renderer.compileAsync(o, this.camera, this.scene);
    this.bus.emit('world:ready', {});
  }

  resize(): void {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.van.resize(w, h);
    this.house.resize(w, h);
  }

  setQuality(quality: 'low' | 'high'): void {
    this.quality = quality;
    this.renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderer.shadowMap.enabled = quality === 'high';
    this.bloom.enabled = quality === 'high';
    this.world.grass = quality === 'high';
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
    else if (this.inHouse) this.renderer.render(this.house.scene, this.house.camera);
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

  /** Move the clock forward to dawn, day, dusk or night (never backwards). */
  setTimeOfDay(which: TimeOfDay): void {
    this.st.minutes = jumpTo(this.st.minutes, which);
    this.toast(`${TIME_LABEL[which]} — the sky turns.`);
  }

  /** Keep the sky at its hour, or let the day run again. */
  toggleSkyPause(): boolean {
    const i = this.st.flags.indexOf(SKY_PAUSED);
    if (i >= 0) this.st.flags.splice(i, 1);
    else this.st.flags.push(SKY_PAUSED);
    return i < 0;
  }

  get hour(): number {
    return hourOf(this.st.minutes);
  }

  // ───────────────────────── main loop ─────────────────────────

  private lampTick = 1;
  /** Butterflies, dragonflies, fireflies, chimney smoke, dawn mist and sunbeams (Atmos.ts). */
  private readonly atmos = new Atmos();

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

    if (this.inHouse) {
      if (!this.st.flags.includes(SKY_PAUSED)) this.st.minutes += dt * MINUTES_PER_SECOND;
      // They walk about the room (housing/roomWalk.ts) while only the room's own panel is open.
      this.input.blocked = this.ui.modal && this.ui.panelId !== 'house';
      this.house.update(dt, this.input);
      this.guide.update(dt, this.t);
      this.renderer.render(this.house.scene, this.house.camera);
      this.ui.update(dt);
      if (this.input.hit('escape')) this.exitHouse();
      else if (this.input.hit('e') && !this.input.blocked) {
        const did = this.house.interact();
        if (did === 'exit') this.exitHouse();
        else if (did === 'sit') this.toast('You sit down together. E to stand up again.', 'info');
      }
      this.input.endFrame();
      return;
    }

    if (this.started) {
      if (!this.st.flags.includes(SKY_PAUSED)) this.st.minutes += dt * MINUTES_PER_SECOND;
      this.st.playSeconds += dt;
      this.diaryNudge(dt);
      if (!this.cutscene) this.ui.handleKeys();
      this.input.blocked = (this.ui.modal && !this.build) || !!this.cutscene;
      // On the coach, the ferry or the air taxi: it carries them; E or Esc skips ahead to the arrival.
      if (this.ride) {
        // The pier they will step onto is walkable as soon as its land streams in.
        if (this.ride.kind === 'ferry') this.harboursView.update();
        this.ride.update(dt);
        if (!this.ui.modal && (this.input.hit('e') || this.input.hit('escape'))) this.ride.skip();
        if (this.ride.done) this.arriveByRide();
      }
      this.skyTram.update(dt, this.ride);
      this.trav.update(dt, this.input, this.t);
      this.trackRegion();
    } else {
      // Title screen: a slow orbit around the travellers while the world streams in.
      this.trav.camYaw += dt * 0.08;
      this.trav.update(dt, this.input, this.t);
    }

    updateWind(this.t, this.region.id, dt);
    FOLIAGE_UNIFORMS.uSunDir.value.copy(this.sky.sunDirection);
    FOLIAGE_UNIFORMS.uLeafNight.value = this.sky.night;
    setVehicleNight(this.sky.night);
    DRAGON_NIGHT.value = this.sky.night;
    this.world.setWaterLook(this.t, this.sky.night, this.region.id, this.sky.sunDirection);
    this.world.update(this.trav.gPos, this.sky.night);
    // Lamplight: the nearest lamps light the ground and walls round them after dusk (a few times a second).
    if ((this.lampTick += dt) > 0.15) { this.lampTick = 0; setLamps(this.world.lamps(), this.trav.gPos, this.sky.night); }
    this.sky.update(this.hour, this.trav.gPos, this.t, this.region.id);
    this.atmos.update(dt, this.t, this.trav.gPos, this.region.id, this.hour, this.sky.night, this.sky.sunDirection, this.world.smokeTops(), this.sky.fog.color);
    this.ambience.setMode(this.region.ambient);
    this.ambience.update(dt, this.trav.gPos, this.t, this.sky.night);
    this.regionFx.setRegion(this.region.id);
    this.regionFx.update(dt, this.trav.gPos, this.t, this.sky.night);
    // The season turns the leaves of the temperate lands (eased, so crossing a border is gentle).
    {
      const ls = leafSeason(this.region.id, seasonOf(Math.floor(this.st.minutes / DAY_MINUTES))), k = Math.min(1, dt * 0.5);
      FOLIAGE_UNIFORMS.uSeasonTint.value.lerp(this.tmpTint.set(...ls.tint), k);
      FOLIAGE_UNIFORMS.uSeasonAmt.value += (ls.amount - FOLIAGE_UNIFORMS.uSeasonAmt.value) * k;
    }
    this.weather.update(dt, this.t, this.region.id, this.trav.gPos, this.sky.night, surfaceAt(this.trav.gPos.x, this.trav.gPos.z, this.trav.gPos.y + 2), this.weatherNow);
    this.skyLanterns.everyLand = this.region.id === 'meadow' && this.celebration.festivities.level > 0.5;
    this.skyLanterns.update(dt, this.t, this.trav.gPos, this.region.id, this.sky.night);
    this.festivalAir.update(dt, this.t, this.region.id, this.sky.night);
    this.cityScreens.update(this.t, this.region.id, this.sky.night);
    this.civicMarkers.update(this.t, this.region.id, this.trav.gPos);
    this.skyFx.party = this.celebration.festivities.level;
    this.skyFx.partyAt.copy(this.celebration.festivities.centre);
    this.camera.getWorldDirection(this.skyFx.lookDir);
    this.skyFx.update(dt, this.t, this.trav.gPos, this.region.id, this.sky.night, this.sky.sunDirection);
    this.traffic.update(dt, this.t, this.region.id, this.trav.gPos, this.sky.night, couriersIn(this.st, this.region.id), hourOf(this.st.minutes));
    // The people in your care: news when someone thrives or their paid days run out.
    if ((this.charityClock -= dt) <= 0) {
      this.charityClock = 2;
      for (const n of tickCharity(this.st)) this.toast(`🤲 ${n.text}`, 'story');
      for (const n of tickInstitutes(this.st)) this.toast(`🏛️ ${n.text}`, 'reward');
      this.institutesView.update(this.camera.position, this.t);
      // Fields tended by farmhands, and couriers carrying their harvest to market.
      for (const n of tickFields(this.st)) this.toast(`🌾 ${n.text}`, 'reward');
      for (const n of tickSupply(this.st)) this.toast(`🚚 ${n.text}`, 'reward');
      for (const n of tickBusinesses(this.st)) this.toast(n.text, 'reward');
      for (const n of tickInventions(this.st)) this.toast(n.text, 'reward');
      for (const n of tickHomes(this.st)) this.toast(n.text, 'info');
      for (const n of tickLearning(this.st)) this.toast(n.text, 'reward');
      for (const name of expireErrands(this.st)) this.toast(`${name} could not wait any longer and went on with their day.`, 'info');
      while (carryNews.length) this.toast(carryNews.shift()!, 'info');
      for (const n of tickWeavers(this.st)) this.toast(`🧶 ${n.text}`, 'reward');
      for (const n of tickParents(this.st)) this.toast(n.text, 'story');
      // The day's weather over this land: a shower, a flurry, a sandstorm or a morning fog.
      const ev = weatherEvent(this.region.id, Math.floor(this.st.minutes / DAY_MINUTES), hourOf(this.st.minutes));
      if (ev !== this.weatherNow) {
        if (ev !== 'none' && this.started) this.toast(`${EVENT_TEXT[ev].icon} ${EVENT_TEXT[ev].words} ${this.region.name}.`, 'info');
        this.weatherNow = ev;
      }
      this.fieldsView.update();
      this.harboursView.update();
      this.bridgesView.update();
      // Homes change shape as floors start and finish.
      const sig = Object.keys(this.st.homeFloors).map((id) => `${id}:${floorsOf(this.st, id)}:${floorBuilding(this.st, id) !== null}`).join('|');
      if (sig !== this.floorsSig) { this.floorsSig = sig; this.housingDirty = true; }
    }
    this.sky.moonHidden = this.skyFx.hideMoon;
    this.npcs.update(dt, this.t, this.trav.gPos);
    this.needFolk.update(dt, this.t, this.camera.position);
    this.dragons.update(this.t, this.camera, (land) => this.world.isLoaded(land));
    this.plotsView.update(dt, this.t, this.sky.night, this.housing.plotAt(this.trav.gPos.x, this.trav.gPos.z)?.id ?? null, this.camera.position);
    this.townsfolk.update(dt, this.t, this.trav.gPos, this.st.errands);
    this.dressing.update(this.sky.night, this.trav.gPos);
    this.animals.update(dt, this.t, this.trav.gPos, hourOf(this.st.minutes));
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
    // A faint light round each of them after dark (owner: the light from the body was too much).
    const glow = 0.02 + this.sky.night * 0.18;
    [this.trav.girl, this.trav.boy].forEach((m, i) => {
      this.auras[i].position.copy(m.root.position).add(new THREE.Vector3(0, 1.3, 0));
      this.auras[i].intensity = glow;
    });
    this.dressCamera(dt);
    this.celebration.update(dt, this.t);
    this.caravan.update(dt, this.t);
    this.wonders.update(dt, this.t);
    this.guide.update(dt, this.t);
    const view = this.cutscene?.view;
    if (view) this.renderer.render(view.scene, view.camera);
    else if (this.ready) this.composer.render();
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
    // Fathima, Azim, or one of the brothers, sisters and children (framed at their own height).
    const pick = this.ui.wardrobeWho;
    const who = pick === 'girl' ? this.trav.girl : pick === 'boy' ? this.trav.boy : this.caravan.figureOf(pick) ?? this.trav.girl;
    const sc = pick === 'girl' || pick === 'boy' ? 1 : who.figureScale;
    const p = who.root.position, face = who.root.rotation.y + d.yaw; // models face +z
    // Frame the whole figure in the band of screen above the shelf.
    const band = THREE.MathUtils.clamp(this.ui.sheetTop() / innerHeight, 0.35, 1);
    const half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const dist = (2.1 * sc) / (2 * 0.82 * band * Math.tan(half));
    d.goal.set(p.x + Math.sin(face) * dist, p.y + 1.1 * sc, p.z + Math.cos(face) * dist);
    // Aim so the figure's middle sits at the centre of that band, not of the screen.
    const centre = new THREE.Vector3(p.x, p.y + 0.95 * sc, p.z);
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
    if (this.trav.carriage) return null;
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
      if (d < 3.5 && onFoot) cands.push([d, { kind: 'plot', site, label: this.housing.owns(site.id) ? 'Build on your land (B)' : `Land for sale · or a home · from ${site.price} coins` }]);
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
    if (this.trav.parkedVan && onFoot && this.trav.parkedVan.pos.distanceTo(p) < 6) cands.push([this.trav.parkedVan.pos.distanceTo(p), { kind: 'van', label: 'Step inside Safar' }]);
    const stray = onFoot ? this.caravan.nearestStray(p, 2.6) : null;
    if (stray) cands.push([1.0, { kind: 'stray', pet: stray, label: `🐾 Offer ${ITEMS[stray.likes].icon} ${ITEMS[stray.likes].name} to ${stray.name}` }]);
    const pal = onFoot ? this.caravan.nearest(p, 2.4) : null;
    if (pal) cands.push([1.2, { kind: 'companion', id: pal.id, label: pal.kind === 'pet' ? `Pet ${pal.name}` : `Chat with ${pal.name}` }]);
    const ride = onFoot ? this.celebration.label(p) : null;
    if (ride) cands.push([0.5, { kind: 'chariot', label: ride }]);
    // Caves: explore once a day.
    if (onFoot) for (const r of this.world.loadedRegions()) for (const cv of r.caves) {
      const m = caveMouth(cv), dd = Math.hypot(m.x - p.x, m.z - p.z);
      if (dd < 3.2) cands.push([dd + 0.2, { kind: 'cave', cave: cv, label: `🕳️ Explore the ${CAVE_NAME[cv.style]}` }]);
    }
    // Institute sites: the town's own institute, and open ground to found one.
    if (onFoot) {
      const site = siteAt(p.x, p.z, 4);
      if (site) {
        const inst = instituteAt(this.st, site.id);
        const name = site.established ? `the ${INSTITUTE_BY_KIND[landScience(site.land)].name.toLowerCase()} institute` : inst ? `your ${INSTITUTE_BY_KIND[inst.kind].stages[Math.max(0, inst.stage)].name.toLowerCase()}` : 'an open site — found an institute';
        cands.push([2.2, { kind: 'institute', site: site.id, label: `🏛️ ${site.established ? 'Visit' : inst ? 'Visit' : 'Here:'} ${name}` }]);
      }
    }
    // Farmland: buy a field, farm it, hire hands and couriers.
    if (onFoot) {
      const fs = FIELD_SITES.find((f) => Math.abs(p.x - f.x) < FIELD_SIZE / 2 + 1 && Math.abs(p.z - f.z) < FIELD_SIZE / 2 + 1);
      if (fs) {
        const f = this.st.fields[fs.id];
        const label = !f ? '🌾 Farmland for sale' : !f.crop ? '🌾 Your field — sow it' : fieldGrowth(this.st, fs.id) >= 1 ? '🌾 Your field — ready to harvest' : '🌾 Your field';
        cands.push([2.4, { kind: 'field', field: fs.id, label }]);
      }
    }
    // People in need, on their town's pavement: meet them, then care for them.
    const need = onFoot ? this.needFolk.nearest(p.x, p.z, 2.6) : null;
    if (need) cands.push([0.9, { kind: 'need', person: need, label: hasMet(this.st, need.id) ? `🤲 Visit ${need.name}` : `🤲 ${need.name} looks as if they need help` }]);
    // Harbours: on the quay or along the pier.
    if (onFoot) for (const hb of harbours()) {
      const [dx, dz] = hb.dir, rx = p.x - hb.x, rz = p.z - hb.z, along = rx * dx + rz * dz, across = Math.abs(rx * dz - rz * dx);
      if ((along > -14 && along < 4 && across < 14) || (along >= 4 && along < hb.pier + 2 && across < 3.5)) {
        cands.push([2.3, { kind: 'harbour', land: hb.land, label: `⚓ The harbour of ${REGION_BY_ID[hb.land].name}` }]);
        break;
      }
    }
    // Bus stops: the coach to any town the roads reach.
    if (onFoot) for (const r of this.world.loadedRegions()) for (const s of busStops(r.spec.id)) {
      const dd = Math.min(Math.hypot(s.x - p.x, s.z - p.z), Math.hypot(s.kerbX - p.x, s.kerbZ - p.z));
      if (dd < 3.5) cands.push([dd + 0.2, { kind: 'busstop', stop: s, label: '🚌 Bus stop — the coach or an air taxi to another town' }]);
    }
    // Tram stops, in the towns with trams: across town to another stop.
    if (onFoot) for (const r of this.world.loadedRegions()) for (const s of tramStops(r.spec.id)) {
      const dd = Math.min(Math.hypot(s.x - p.x, s.z - p.z), Math.hypot(s.kerbX - p.x, s.kerbZ - p.z));
      if (dd < 4) cands.push([dd + 0.2, { kind: 'tramstop', stop: s, label: `🚋 ${s.name} tram stop — the ${TRAM_NAME[TRAM_TOWNS[s.land]!]} across town` }]);
    }
    // The air-taxi stage on the Sky Isles.
    if (onFoot && this.region.id === 'skyisles') {
      const sp = skyPadPoint(), dd = Math.hypot(sp.x - p.x, sp.z - p.z);
      if (dd < 7 && Math.abs(p.y - sp.y) < 3) cands.push([dd * 0.3, { kind: 'skypad', label: '🚁 Air taxi — fly down to any land' }]);
      // The cable car's stations: up to the temple, or down to the meadow.
      for (const up of [true, false]) {
        const b = tramBoarding(up), db = Math.hypot(b.x - p.x, b.z - p.z);
        if (db < 7 && Math.abs(p.y - b.y) < 3) cands.push([db * 0.3, { kind: 'tram', up, label: up ? '🚡 Cable car up to the Temple of the Great Lantern' : '🚡 Cable car down to the meadow' }]);
      }
    }
    // Front doors: every building in town can be entered.
    if (onFoot) for (const d of [...this.world.loadedRegions().flatMap((r) => r.doors), ...this.world.landmarkDoors, ...this.homeDoors(), CASTLE_DOOR]) {
      const dd = Math.hypot(d.x - p.x, d.z - p.z);
      if (dd < 2.6 && Math.abs(d.y - p.y) < 2.5) cands.push([dd + 0.3, { kind: 'door', door: d, label: `🚪 ${doorLabel(d)}` }]);
    }
    // Anyone in town: stop and talk; some need a hand today.
    const folk = onFoot ? this.townsfolk.nearest(p, 2.6) : null;
    if (folk) {
      const f = this.townsfolk.who(folk, this.day);
      const errand = this.st.errands.find((e) => e.key === `${folk.land}:${folk.idx}`);
      const needs = errand || (f.favour && !(this.st.folk.day === this.day && this.st.folk.helped.includes(`${folk.land}:${folk.idx}`)));
      const stall = folk.path.kind === 'stall' && folk.path.working;
      cands.push([Math.hypot(folk.x - p.x, folk.z - p.z) + 0.4, stall
        ? { kind: 'market', walker: folk, label: `🛒 ${f.name}'s stall — seeds & produce` }
        : { kind: 'folk', walker: folk, label: errand ? `❗ Give ${f.name} ${errand.qty}× ${ITEMS[errand.item]?.icon ?? ''} ${ITEMS[errand.item]?.name ?? errand.item}` : needs ? `❗ ${f.name} needs a hand` : `💬 Talk with ${f.name}` }]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    return cands[0]?.[1] ?? null;
  }

  private get day(): number { return Math.floor(this.st.minutes / DAY_MINUTES); }

  /** Talking with someone in town — and helping them, which is how the two earn their way. */
  private talkFolk(w: Walker): void {
    this.townsfolk.turnTo(w, this.trav.gPos);
    const r = talkToFolk(this.st, w.land, w.idx, { x: w.x, z: w.z });
    if (r.kind === 'helped') this.bus.emit('coins:changed', { coins: this.st.coins });
    this.toast(r.text, r.kind === 'helped' ? 'reward' : r.kind === 'need' ? 'info' : 'story');
  }

  interact(t: Interactable): void {
    switch (t.kind) {
      case 'folk': return this.talkFolk(t.walker);
      case 'door': return this.enterHouse(t.door);
      case 'institute': return this.ui.openInstitute(t.site);
      case 'field': return this.ui.openField(t.field);
      case 'harbour': return this.ui.openHarbour(t.land);
      case 'busstop': return this.ui.openBusStop(t.stop);
      case 'tramstop': return this.ui.openTramStop(t.stop);
      case 'skypad': return this.ui.openSkyPad();
      case 'tram': { const e = this.rideTram(t.up); if (e) this.toast(e, 'info'); return; }
      case 'need': {
        if (meet(this.st, t.person.id)) this.toast(`🤲 ${t.person.name} — ${NEED_LABEL[t.person.kind].name.toLowerCase()}: “${t.person.hope}” They are in your people finder now.`, 'story');
        // Meeting them makes a friend: they write to you, and a marker stays over them in town.
        keepInTouch(this.st, t.person.id);
        if (befriend(this.st, t.person.id)) { this.bus.emit('npc:befriended', { npcId: t.person.id }); this.toast(`💛 ${t.person.name} is now your friend`, 'reward'); }
        return this.ui.openCare();
      }
      case 'cave': { this.toast(this.exploreCave(t.cave), 'reward'); const d = this.cavernDoor(t.cave); if (d) this.enterHouse(d); return; }
      case 'stray': return this.toast(this.caravan.adopt(t.pet), 'story');
      case 'market': this.townsfolk.turnTo(t.walker, this.trav.gPos); return this.ui.openMarket(t.walker.land);
      case 'npc': return this.talk(t.npc);
      case 'node': return this.gather(t.node);
      case 'animal': return this.ui.openAnimal(t.animal);
      case 'plot': {
        if (this.housing.owns(t.site.id)) return this.enterBuild(t.site.id);
        this.ui.openProperty(t.site);
        return;
      }
      case 'bed':
        return this.ui.openFarm(t.plotId, t.decorId);
      case 'lantern':
        if (this.quests.lightLantern(t.region)) this.ui.lanternMoment(REGION_BY_ID[t.region]);
        return;
      case 'van':
        return this.enterVan();
      case 'chariot':
        return this.celebration.begin();
      case 'companion': {
        const def = this.caravan.list().find((c) => c.id === t.id);
        if (def) this.toast(this.caravan.chat(def), 'story');
        return;
      }
    }
  }

  talk(npc: Npc): void {
    const def = npc.def;
    // The first meeting with a land's Keeper is a short film, then the conversation.
    if (def.keeper && !this.st.flags.includes(metFlag(def.id)) && !this.cutscene && !this.inVan && this.trav.mode === 'walk') {
      this.st.flags.push(metFlag(def.id));
      this.ui.closePanel();
      const scene = new MeetScene(this, npc);
      this.cutscene = scene;
      scene.onDone = () => { this.cutscene = null; this.talk(npc); };
      return;
    }
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

  /** Buy land, or land with a house already on it. */
  buyProperty(site: PlotSite, home: boolean): void {
    const r = home ? this.housing.buyHome(site.id) : this.housing.buy(site.id);
    const place = REGION_BY_ID[site.region].name;
    if (r === 'ok') this.toast(home ? `🏡 Your home in ${place} is ready. Press B here to decorate and build more.` : `🏡 This land in ${place} is yours. Press B here to build.`, 'reward');
    else if (r === 'coins') this.toast(`You need ${home ? this.housing.homePrice(site.id) : site.price} coins. Make and trade goods to earn more.`);
    this.housingDirty = true;
  }

  // ───── the diary (diary/diary.ts) ─────

  private sessionSeconds = 0;
  /** Once a day, a little while into playing, the diary asks how the day was. */
  private diaryNudge(dt: number): void {
    if (this.cutscene || this.ui.modal || (this.sessionSeconds += dt) < 40) return;
    const now = new Date(), today = dayKey(now);
    if (entryOn(this.st.diary, today)) return;
    // Once early on, and once more in the evening if the page is still empty.
    const evening = now.getHours() >= 19, mark = evening ? `${today}-eve` : today;
    if (this.st.diaryNudged === mark || (!evening && this.st.diaryNudged === `${today}-eve`)) return;
    this.st.diaryNudged = mark;
    const run = streak(this.st.diary, today);
    this.bus.emit('diary:nudge', { text: evening
      ? (run > 0 ? `🌙 The day is ending — write a few lines and keep your ${run}-day streak glowing.` : '🌙 Before the day ends: how was it? Even one line counts. (Q)')
      : run > 0 ? `📔 ${run} day${run > 1 ? 's' : ''} in a row in your diary — keep the lanterns lit! How was today?` : '📔 Your diary is here for you. How was your day? (Q)' });
  }

  /**
   * Write today's page. The first page of the day lights its lantern; days in a row bring a gift
   * from Grandmother Syeda Sarvatara at each milestone.
   */
  writeDiary(text: string, mood: MoodId | ''): { reply: string; gift: string; kept: boolean } {
    const today = dayKey(new Date());
    const r = writeEntry(this.st.diary, today, text, mood, Date.now());
    let gift = '';
    if (r.first) {
      const run = streak(this.st.diary, today), m = MILESTONES.filter((x) => x <= run && !this.st.diaryGifts.includes(x)).pop();
      if (m) {
        this.st.diaryGifts.push(m);
        const coins = Math.min(500, m * 10);
        this.st.coins += coins;
        this.bus.emit('coins:changed', { coins: this.st.coins });
        gift = `🏮 ${m} days in a row! Grandmother Syeda Sarvatara slips you ${coins} coins: “A page a day keeps the heart light, Shumaela.”`;
      }
    }
    this.save();
    return { reply: r.entry ? replyFor(mood, Date.now() / 997) : '', gift, kept: !!r.entry };
  }

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
    // Your own sales fill the market just as the couriers' do (supply.ts).
    const got = sellHere(this.st, item, this.region.id);
    if (got) this.bus.emit('coins:changed', { coins: this.st.coins });
    return got;
  }

  priceHere(item: string): number {
    return marketPrice(this.st, item, this.region.id);
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
    this.house.setOutfits(OUTFITS[this.st.outfits.girl], OUTFITS[this.st.outfits.boy]);
    this.bus.emit('outfit:changed', { who });
  }

  /** Dress a brother, sister or child travelling with them (caravan/dress.ts). */
  dressCompanion(id: string, outfitId: string): string | null {
    const err = dress(this.st, id, outfitId);
    if (!err) this.caravan.redress(id);
    return err;
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
  /** The coach, ferry or air taxi carrying them now, if any. */
  ride: Ride | null = null;

  /** Pay the fare and take their seats. Returns why not, if not. */
  private board(coins: number, make: () => Ride, toast: string): string | null {
    if (this.ride) return 'You are already on your way.';
    if (this.st.coins < coins) return `The fare is ${coins} coins.`;
    if (this.trav.mode !== 'walk') this.trav.setMode('walk');
    this.st.coins -= coins;
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.ride = make();
    this.toast(`${toast} (E to skip ahead)`, 'story');
    return null;
  }

  /** Board the coach at `stop` for `to`. */
  rideBus(stop: BusStop, to: RegionId): string | null {
    const f = busFare(stop.land, to);
    if (!f) return 'No road reaches there.';
    return this.board(f.coins, () => coachRide(this.scene, this.trav, stop, to), `🚌 All aboard for ${REGION_BY_ID[to].name} — ${f.towns === 1 ? 'the next town' : `${f.towns} towns`} down the road.`);
  }

  /** Buy the penthouse behind the tower door `id` (you are standing in it). */
  buyPenthouse(id: string): string {
    const r = buyPenthouse(this.st, id);
    if (r === 'coins') return `A penthouse costs ${PENTHOUSE_PRICE} coins.`;
    if (r === 'owned') return 'It is yours already.';
    this.bus.emit('coins:changed', { coins: this.st.coins });
    this.save();
    // Yours now: the room is redrawn as your home, ready to furnish.
    const d = this.house.door;
    if (this.inHouse && d?.id === id) { const at = this.house.standing(); this.buildRoom(d, true); this.house.standAt(at); }
    return '🏙️ The keys are yours. A home above New Yonder — the pool, the pergola and the whole city at your feet.';
  }

  /** Board the city tram at `from` for the stop `to` across town. */
  rideStreetTram(from: TramStop, to: TramStop): string | null {
    if (from.land !== to.land || from.id === to.id) return 'That is this stop.';
    const style = TRAM_TOWNS[from.land]!;
    return this.board(TRAM_FARE, () => streetTramRide(this.scene, this.trav, from, to), `🚋 Ding ding — the ${TRAM_NAME[style]} pulls away for ${to.name}. Your seats are at the front, either side of the aisle.`);
  }

  /** Board the ferry at the harbour of `from` for the harbour of `to`. */
  rideFerry(from: RegionId, to: RegionId): string | null {
    const f = ferryFare(from, to);
    if (!f) return 'No ferry sails there.';
    return this.board(f.coins, () => ferryRide(this.scene, this.trav, from, to), `⛴️ Cast off for ${REGION_BY_ID[to].name} — ${f.km.toFixed(1)} km round the coast. Your benches are on the foredeck.`);
  }

  /** Call an air taxi at `from` (a stop, or the Sky Isles stage) to `to`. */
  rideAir(from: AirPoint, to: RegionId): string | null {
    const f = airFare(from, to);
    return this.board(f.coins, () => airRide(this.scene, this.trav, from, to), `🚁 The air taxi lifts off for ${REGION_BY_ID[to].name} — ${f.km.toFixed(1)} km as the crow flies.`);
  }

  /** Ride the Sky Isles cable car up to the temple's isle, or down to the meadow. It is free. */
  rideTram(up: boolean): string | null {
    return this.board(0, () => tramRide(this.scene, this.trav, up), up ? '🚡 The cabin glides out of the station and up toward the Great Lantern.' : '🚡 The cabin sinks away from the isle, down over the meadow.');
  }

  private arriveByRide(): void {
    const r = this.ride!, name = REGION_BY_ID[r.to].name;
    this.ride = null;
    this.toast(r.kind === 'ferry' ? `⛴️ ${name}. She comes alongside, and you step onto the pier together.`
      : r.kind === 'air' ? `🚁 ${name}. The rotors slow, and you step down together.`
      : r.kind === 'tram' ? (r.up ? '🚡 The mountain station. The temple is a few steps away.' : '🚡 The valley station, on the meadow.')
      : `🚌 ${name}. You step down at the stop together.`, 'story');
  }

  /**
   * The guided tour's "Show me" for a place (guide/tour.ts): light the golden trail to the nearest
   * one — the Keeper, a pet waiting at a plaza, someone in need, an animal, people to talk to, or
   * land for sale. Returns a note when there is nothing of that kind near.
   */
  showTourPlace(place: 'stray' | 'needy' | 'animal' | 'friend' | 'plot' | 'keeper'): string | null {
    const land = this.region.id, c = regionCenter(REGION_BY_ID[land]), here = this.trav.gPos;
    const pin = (title: string, text: string, x: number, z: number, region: RegionId = land) => { this.guide.pin({ title, text, x, z, region }); return null; };
    switch (place) {
      case 'keeper': {
        const k = keeperOf(land), [kx, kz] = k.at ?? [0, 30];
        return pin(`${k.name}, the Keeper`, `Talk to ${k.name} (E): they teach their land's craft.`, c.x + kx, c.z + kz);
      }
      case 'stray': {
        const waiting = PETS.filter((p) => !this.st.caravan.includes(p.id));
        const own = waiting.filter((p) => p.origin === land);
        const def = own[0] ?? waiting.filter((p) => this.st.discovered.includes(p.origin)).sort((a, b) => {
          const ca = regionCenter(REGION_BY_ID[a.origin]), cb = regionCenter(REGION_BY_ID[b.origin]);
          return Math.hypot(ca.x - here.x, ca.z - here.z) - Math.hypot(cb.x - here.x, cb.z - here.z);
        })[0] ?? waiting[0];
        if (!def) return 'Every pet on the island already travels with you.';
        const pc = regionCenter(REGION_BY_ID[def.origin]), h = strayHome(def);
        return pin(`${def.name} the ${def.species}`, `${def.name} waits at the plaza of ${REGION_BY_ID[def.origin].name} and loves ${ITEMS[def.likes]?.name ?? def.likes}.`, pc.x + h.x, pc.z + h.z, def.origin);
      }
      case 'needy': {
        const p = PEOPLE_IN_NEED.find((q) => q.land === land && !sponsorOf(this.st, q.id)) ?? PEOPLE_IN_NEED.find((q) => !sponsorOf(this.st, q.id));
        if (!p) return 'Everyone in need on the island is already in your care.';
        const at = needSpot(p);
        return pin(p.name, `${p.name} is waiting for someone to notice. Talk to them (E).`, at.x, at.z, p.land);
      }
      case 'animal': {
        const a = this.animals.nearest(here, 400);
        if (!a) return 'No animals nearby just now — try the edge of town.';
        const sp = SPECIES[a.species];
        return pin(`A ${sp.name.toLowerCase()}`, `Walk up gently and offer it ${ITEMS[sp.diet]?.name ?? 'its food'} (E).`, a.pos.x, a.pos.z);
      }
      case 'friend': {
        const f = PEOPLE.find((q) => q.region === land && !q.keeper && q.at && !this.st.friends[q.id]?.befriended) ?? keeperOf(land);
        const [fx, fz] = f.at ?? [0, 30];
        return pin(f.name, `${f.name} (${f.role}). Talk to them and ask how you can help (E).`, c.x + fx, c.z + fz);
      }
      case 'plot': {
        const p = PLOTS.find((q) => q.region === land && !this.housing.owns(q.id)) ?? PLOTS.filter((q) => !this.housing.owns(q.id)).sort((a, b) => Math.hypot(a.x - here.x, a.z - here.z) - Math.hypot(b.x - here.x, b.z - here.z))[0];
        if (!p) return 'You own every plot on the island.';
        return pin(`Land for sale in ${REGION_BY_ID[p.region].name}`, 'Stand on the land and open Homes & land (L) to buy it.', p.x, p.z, p.region);
      }
    }
  }

  /** Visit her parents or his at the home they live in: the road takes you to their door. */
  visitParents(whose: Whose): string | null {
    const r = visit(this.st, whose);
    if ('error' in r) return r.error;
    const p = PLOT_BY_ID[r.plotId];
    if (!this.st.discovered.includes(p.region)) this.st.discovered.push(p.region);
    this.trav.teleport(p.x, p.z + 9);
    this.trav.heading = Math.PI;
    this.toast(`👪 ${r.text}`, 'story');
    return null;
  }

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

  // ───── the farm ─────

  /** Plant a chosen seed in a bed. */
  plantBed(plotId: string, decorId: string, seed: string): string {
    if (!this.housing.plant(plotId, decorId, seed)) return (this.st.inventory[seed] ?? 0) > 0 ? 'Something is already growing here.' : `You have no ${ITEMS[seed].name}. Market stallholders in every town sell seeds.`;
    this.housingDirty = true;
    return `Planted ${ITEMS[seed].name}. ${ITEMS[CROPS[seed].out].icon} in about ${Math.round(CROPS[seed].grow / 60)} hours.`;
  }

  waterBed(plotId: string, decorId: string): string {
    const ok = this.housing.water(plotId, decorId);
    this.housingDirty = true;
    return ok ? 'You water the bed together. The plants perk up — the harvest comes sooner.' : 'It has had its water.';
  }

  harvestBed(plotId: string, decorId: string): string {
    const out = this.housing.harvest(plotId, decorId);
    this.housingDirty = true;
    if (!out) return 'Not ripe yet.';
    this.st.light += 0.05;
    return `Harvested ${ITEMS[out].icon} ${ITEMS[out].name}! Cook it (I), sell it at a market stall, or share it with someone who needs it.`;
  }

  buySeed(seed: string): string {
    const r = buySeed(this.st, this.region.id, seed);
    if (r === 'ok') { this.bus.emit('coins:changed', { coins: this.st.coins }); this.bus.emit('item:gained', { id: seed, qty: 1 }); return `+1 ${ITEMS[seed].name}`; }
    return r === 'coins' ? `You need ${seedPrice(seed)} coins.` : 'Not sold here.';
  }

  // ───── inside a house ─────

  /** Minutes since this house's basket was last gathered from (it refills each day). */
  private houseKey(d: Door): string { return `house:${d.id}`; }
  houseGathered(d: Door): boolean {
    const last = this.st.gathered[this.houseKey(d)];
    return last !== undefined && this.st.minutes - last < DAY_MINUTES;
  }

  /** Which home of yours this door opens (its key in `st.homes`), or '' if it is not yours. */
  homeKey(d: Door): string {
    if (d.kind === 'home') return d.id.slice(5);
    if (d.kind === 'penthouse' && ownsPenthouse(this.st, d.id)) return `penthouse:${d.id}`;
    return '';
  }

  /** Build the room behind a door, with who lives there and the brothers, sisters and children coming in with you. */
  private buildRoom(d: Door, gathered: boolean): void {
    const key = this.homeKey(d), plot = d.kind === 'home' ? key : '';
    // Her parents or his first, if they live here, then the people in your care.
    const residents = plot ? [...parentsAsResidents(this.st, plot), ...residentsOf(this.st, plot).map((r) => PERSON_BY_ID[r.id]).filter((p) => !!p)] : [];
    this.house.setCompanions(this.caravan.indoorFolk());
    this.house.setThread(this.st.flags.includes(THREAD_FLAG), this.st.light);
    this.house.enter(d, this.sky.night, gathered, key ? this.homeDecor(key) : undefined, residents);
  }

  enterHouse(d: Door): void {
    this.inHouse = true;
    this.target = null;
    // Institutes and caverns have nothing to gather inside.
    const gathered = d.kind === 'institute' || d.kind === 'cavern' || this.houseGathered(d);
    this.buildRoom(d, gathered);
    this.ui.openHouse(d);
    if (!this.st.flags.includes('walk-inside')) {
      this.st.flags.push('walk-inside');
      this.toast('Walk about inside (WASD, drag to look round). Press E by your seats to sit down together, or at the door (or Esc anywhere) to step out.', 'info');
    }
  }

  /** Step inside an institute: the town's own, or one you have founded (its standing stage). */
  enterInstitute(siteId: string): void {
    const site = SITE_BY_ID[siteId], inst = instituteAt(this.st, siteId);
    const kind = site?.established ? landScience(site.land) : inst?.kind;
    const stage = site?.established ? 3 : inst ? standingStage(this.st, inst) : -1;
    if (!site || !kind || stage < 0) { this.toast('Nothing stands here yet to step into.'); return; }
    const name = `${site.established ? 'the' : 'your'} ${INSTITUTE_BY_KIND[kind].stages[stage].name.toLowerCase()} in ${REGION_BY_ID[site.land].name}`;
    this.enterHouse({ id: `inst:${siteId}:${kind}:${stage}`, land: site.land, x: site.x, z: site.z, y: surfaceAt(site.x, site.z), facing: 0, kind: 'institute', r: 1, name });
  }

  /** A cavern you can walk into, when the 3D side has built one for this cave's style. */
  private cavernDoor(cv: Cave): Door | null {
    const d: Door = { id: `cavern:${cv.style}:${cv.id}`, land: cv.land, x: cv.x, z: cv.z, y: surfaceAt(cv.x, cv.z), facing: 0, kind: 'cavern', r: 1, name: `the ${CAVE_NAME[cv.style]}` };
    const spec = interiorSpecFor(d, this.sky.night), b = spec ? safeInterior(buildInterior(spec)) : null;
    if (!b) return null;
    b.group.traverse((o) => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose(); });
    return d;
  }

  /** Explore a cave (once a day): bring out two of what it holds. */
  exploreCave(cv: Cave): string {
    const key = `cave:${cv.id}`, last = this.st.gathered[key];
    if (last !== undefined && this.st.minutes - last < DAY_MINUTES) return 'You explored this cave today — its echoes will have new things tomorrow.';
    const finds = CAVE_LANDS[cv.land]?.finds ?? ['cavecrystal'], day = Math.floor(this.st.minutes / DAY_MINUTES);
    const got = [finds[(day + cv.id.length) % finds.length], finds[(day + 1) % finds.length]];
    for (const id of got) { addItem(this.st, id, 1); this.bus.emit('item:gained', { id, qty: 1 }); }
    this.st.gathered[key] = this.st.minutes;
    return `${cv.style === 'ice' ? 'Blue light glimmers through the ice.' : cv.style === 'crystal' ? 'The crystals ring softly and light the way in every colour.' : 'Your lantern finds the glint of the cave walls.'} You bring out ${got.map((id) => `${ITEMS[id].icon} ${ITEMS[id].name}`).join(' and ')}.`;
  }

  /** Something on your land changed (a house built or improved): redraw the homes. */
  housingChanged(): void {
    this.housingDirty = true;
  }

  /** The front doors of the homes you own (a home stands on the plot once you buy it). */
  homeDoors(): Door[] {
    const out: Door[] = [];
    for (const [plotId, plot] of Object.entries(this.st.plots)) {
      const site = PLOT_BY_ID[plotId];
      if (!site) continue;
      for (const d of plot.decor) {
        if (!d.kind.startsWith('house-')) continue;
        const reach = (designOf(d)?.r ?? 5) + 0.4, x = site.x + d.x + Math.sin(d.rot) * reach, z = site.z + d.z + Math.cos(d.rot) * reach;
        out.push({ id: `home:${plotId}`, land: site.region, x, z, y: terrainHeight(x, z), facing: d.rot, kind: 'home', r: 5, shape: designOf(d)?.kind });
        break;
      }
    }
    return out;
  }

  /** How a home you own is furnished (plain until you decorate it): a plot's, or `penthouse:<door id>`. */
  homeDecor(plotId: string): Record<VanSlot, string> {
    return (this.st.homes[plotId] ??= { rug: 'plain', curtains: 'plain', quilt: 'plain', lights: 'none', plant: 'none', art: 'none', lamp: 'none', cushions: 'plain' });
  }

  /** Furnish a home you own with something you have made (the item is used up). */
  setHomeSlot(plotId: string, slot: VanSlot, optionId: string): string | null {
    const opt = VAN_OPTIONS[slot].find((o) => o.id === optionId);
    if (!opt) return 'Unknown.';
    const home = this.homeDecor(plotId);
    if (home[slot] === optionId) return null;
    if (!removeItems(this.st, opt.cost)) return `Needs ${Object.entries(opt.cost).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}.`;
    home[slot] = optionId;
    // Redraw the room with it, the two staying where they stand.
    const d = this.house.door;
    if (d && this.homeKey(d) === plotId) { const at = this.house.standing(); this.buildRoom(d, true); this.house.standAt(at); }
    return null;
  }

  exitHouse(): void {
    this.inHouse = false;
    this.ui.closePanel();
  }

  /** What the house has to share: the land's own material, twice, once a day. */
  gatherInHouse(): string {
    const d = this.house.door;
    if (!d) return '';
    if (this.houseGathered(d)) return 'You have already been given something here today — come back tomorrow.';
    const mats = REGION_BY_ID[d.land as RegionId].materials, item = mats[(d.id.length + Math.floor(this.st.minutes / DAY_MINUTES)) % mats.length];
    addItem(this.st, item, 2);
    this.st.gathered[this.houseKey(d)] = this.st.minutes;
    this.bus.emit('item:gained', { id: item, qty: 2 });
    this.house.setGathered(true);
    return `The family shares +2 ${ITEMS[item].icon} ${ITEMS[item].name}.`;
  }

  /** Talk with the host (who may need a hand, like anyone in town). */
  talkInHouse(): string {
    const d = this.house.door;
    if (!d) return '';
    let h = 0;
    for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = talkToFolk(this.st, d.land as RegionId, 300 + (h % 600));
    if (r.kind === 'helped') this.bus.emit('coins:changed', { coins: this.st.coins });
    return r.text;
  }

  /** Where they are (for the panel). */
  houseTitle(): string {
    return this.house.door ? roomTitle(this.house.door) : '';
  }


  // ───── the van ─────

  enterVan(): void {
    this.inVan = true;
    this.target = null;
    this.van.rebuild();
    this.van.setThread(this.st.flags.includes(THREAD_FLAG), this.st.light);
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
    const after = () => {
      const cake = !this.st.quests['main-meadow'] && !this.st.flags.includes('cake');
      if (cake || !this.st.flags.includes(THREAD_FLAG)) this.playOpening(cake);
      else {
        if (!this.st.quests['main-meadow']) this.wakeToast();
        this.celebration.invite();
      }
    };
    // The story comes first, once — told as a cinematic over the world itself.
    if (!this.st.flags.includes(STORY_FLAG)) {
      this.st.flags.push(STORY_FLAG);
      if (!this.st.flags.includes('prologue')) this.st.flags.push('prologue');
      this.playStory(() => this.ui.showIntroGuide(after));
    } else after();
  }

  private wakeToast(): void {
    this.toast(`${this.st.names.girl} and ${this.st.names.boy} set out from Wanderers' Meadow. Grandmother Syeda Sarvatara is waiting by the Great Oak.`, 'story');
  }

  /** The story of the journey, over the world (replayable from the journal). */
  playStory(done?: () => void): void {
    if (this.cutscene || this.inVan) return;
    this.ui.closePanel();
    if (this.trav.mode !== 'walk') this.chooseVehicle('walk');
    const scene = new StoryScene(this);
    this.cutscene = scene;
    scene.onDone = () => {
      this.cutscene = null;
      this.guide.refresh();
      this.ui.refreshTracker();
      done?.();
    };
  }

  /**
   * The opening under the Great Oak: the golden thread tied round each other's wrists, then the
   * cake. Plays on a new journey; replayable from Help.
   */
  playOpening(cake = true): void {
    if (this.cutscene || this.inVan) return;
    this.ui.closePanel();
    if (this.trav.mode !== 'walk') this.chooseVehicle('walk');
    const end = () => {
      this.cutscene = null;
      if (!this.st.quests['main-meadow']) this.wakeToast();
      this.celebration.invite();
      this.guide.refresh();
      this.ui.refreshTracker();
    };
    const thread = new ThreadScene(this);
    this.cutscene = thread;
    thread.onDone = () => {
      this.cutscene = null;
      if (!cake) return end();
      const scene = new CakeScene(this);
      this.cutscene = scene;
      scene.onDone = end;
    };
  }

  /** Set while the page reloads into another journey: nothing more is saved over it. */
  private leaving = false;

  save(): void {
    if (this.leaving) return;
    this.saveTimer = 0;
    this.trav.save();
    saveGame(this.st, storage(), this.saveKey);
  }

  newJourney(): void {
    this.leaving = true;
    clearSave(storage(), this.saveKey);
    location.reload();
  }

  /**
   * Sign in, sign out, or bring a journey from a file: keep this journey safe first, make the
   * change, then reload into the journey that is now current (core/profiles.ts).
   */
  switchJourney(change: () => boolean): boolean {
    this.save();
    if (!change()) return false;
    this.leaving = true;
    location.reload();
    return true;
  }
}

