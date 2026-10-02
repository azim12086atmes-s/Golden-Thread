import { THREAD_FLAG } from '../story/ThreadScene';
import * as THREE from 'three';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import { BODY_RADIUS, MIN_GAP, belowWings, clearBelow, enforceGap, followStep, wingRoom } from '../characters/follow';
import type { Outfit } from '../characters/modesty';
import { Thread } from '../characters/Thread';
import { MIN_BACK, WING_FLOOR } from '../characters/wings';
import type { Input } from '../core/Input';
import { clamp, damp } from '../core/rng';
import type { GameState } from '../core/state';
import { VEHICLES, buildVehicle, type Mount, type VehicleId, type VehicleModel } from '../vehicles/vehicles';
import { WATER_Y, groundAt, surfaceAt, terrainHeight } from '../world/terrain';
import type { World } from '../world/World';

const GRAVITY = 24;
const UP = new THREE.Vector3(0, 1, 0);
/** Two unicorns are big; keep the riders — and the animals — well apart. */
const MOUNT_GAP = 2.6;

/**
 * The girl (player) and the boy (companion), and how they travel. The girl is driven by input;
 * the boy follows via follow.ts, or sits in his own seat, or rides his own unicorn. The no-touch
 * rule is enforced after every movement step, including collision resolution.
 */
export class Travellers {
  readonly girl: CharacterModel;
  readonly boy: CharacterModel;
  readonly thread = new Thread();
  readonly gPos = new THREE.Vector3();
  readonly bPos = new THREE.Vector3();
  heading = 0;
  private bHeading = 0;
  mode: VehicleId = 'walk';
  private speed = 0;
  private vel = new THREE.Vector3();
  private vy = 0;
  private grounded = true;
  energy = 1;
  private tension = 0;
  private bSpeed = 0;
  private vehicle: VehicleModel | null = null;
  private boyUnicorn: Mount | null = null;
  parkedVan: { model: VehicleModel; pos: THREE.Vector3; heading: number } | null = null;
  /**
   * The Night Dragon where they landed and stepped down: he stays there, standing with his wings
   * folded and looking about, until they ride him again (from close by) or go far away.
   */
  parkedDragon: { model: VehicleModel; pos: THREE.Vector3; heading: number } | null = null;
  /**
   * Riding someone else's vehicle (the coach, the ferry, the air taxi; travel/Ride.ts): its body,
   * their two seats in its frame — separate seats either side of an aisle or a divider — and the
   * family's behind. While set they sit and ride.
   */
  carriage: { root: THREE.Object3D; girl: readonly [number, number, number]; boy: readonly [number, number, number]; family: ReadonlyArray<readonly [number, number, number]> } | null = null;

  /** Riding their own mounts (unicorns, or the dragon and a unicorn). */
  get mounted(): boolean {
    return VEHICLES[this.mode].kind === 'mount';
  }
  private pitch = 0;
  private roll = 0;
  // Camera rig.
  camYaw = 0;
  camPitch = 0.32;
  camDist = 8;
  private camPos = new THREE.Vector3();
  private camInit = false;

  constructor(private scene: THREE.Scene, private world: World, private st: GameState, girlOutfit: Outfit, boyOutfit: Outfit) {
    this.girl = new CharacterModel(girlOutfit, '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    this.boy = new CharacterModel(boyOutfit, '#c99a74', HERO_SCALE.boy, -1, 'boy');
    scene.add(this.girl.root, this.boy.root, this.thread.group);
    // The golden thread each tied round the other's wrist in the opening stays tied.
    if (st.flags.includes(THREAD_FLAG)) { this.girl.setBand(true); this.boy.setBand(true); }
    this.gPos.set(st.player.x, st.player.y, st.player.z);
    this.heading = st.player.heading;
    this.camYaw = this.heading;
    this.gPos.y = surfaceAt(this.gPos.x, this.gPos.z, this.gPos.y + 2);
    this.bPos.copy(this.gPos).add(new THREE.Vector3(1.8, 0, -0.75));
    this.bPos.y = surfaceAt(this.bPos.x, this.bPos.z);
    // Safar waits nearby wherever the journey resumes.
    if (st.vehicles.includes('van')) {
      const at = this.gPos.clone().add(new THREE.Vector3(-7, 0, 3));
      at.y = surfaceAt(at.x, at.z, at.y + 2);
      const model = buildVehicle('van', st.van)!;
      scene.add(model.root);
      this.parkedVan = { model, pos: at, heading: this.heading + 0.6 };
    }
  }

  /** The vehicle being driven or flown, if any (the caravan rides inside the van). */
  get vehicleRoot(): THREE.Object3D | null {
    return this.vehicle && VEHICLES[this.mode].seats.length ? this.vehicle.root : null;
  }

  get airborne(): boolean {
    return !this.grounded;
  }

  get currentSpeed(): number {
    return Math.abs(this.speed) + this.vel.length();
  }

  /** Change how they travel. Returns a reason when it is not possible right now. */
  setMode(id: VehicleId): string | null {
    if (id === this.mode) return null;
    if (id === 'fly' && this.energy < 0.15) return 'Your cape needs light. Stay close together to recharge.';
    if (this.mode === 'plane' && !this.grounded) return 'Land the plane first.';
    if (this.mode === 'dragon' && !this.grounded) return 'Land the dragon first (Shift to descend).';
    const prev = this.mode;
    // Leaving a vehicle: step out on opposite sides.
    if (this.vehicle) {
      const right = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
      const at = this.gPos.clone();
      if (prev === 'van') {
        this.parkedVan = { model: this.vehicle, pos: at.clone(), heading: this.heading };
      } else if (prev === 'dragon') {
        this.dropParkedDragon();
        this.parkedDragon = { model: this.vehicle, pos: at.clone(), heading: this.heading };
      } else {
        this.scene.remove(this.vehicle.root);
      }
      this.vehicle = null;
      this.gPos.copy(at).addScaledVector(right, -2.4);
      this.bPos.copy(at).addScaledVector(right, 2.4);
      this.gPos.y = surfaceAt(this.gPos.x, this.gPos.z, at.y + 1);
      this.bPos.y = surfaceAt(this.bPos.x, this.bPos.z, at.y + 1);
      this.world.resolve(this.gPos, 0.35);
      this.world.resolve(this.bPos, 0.35);
    }
    if (this.boyUnicorn) {
      this.scene.remove(this.boyUnicorn.root);
      this.boyUnicorn = null;
    }
    this.mode = id;
    this.speed = 0;
    this.vy = 0;
    // On the Night Dragon her wings are always out, open behind her saddle.
    this.girl.setRideWings(id === 'dragon');
    const def = VEHICLES[id];
    if (def.kind === 'ground' || def.kind === 'air') {
      if (id === 'van' && this.parkedVan && this.parkedVan.pos.distanceTo(this.gPos) < 40) {
        this.vehicle = this.parkedVan.model;
        this.gPos.copy(this.parkedVan.pos);
        this.heading = this.parkedVan.heading;
        this.parkedVan = null;
      } else if (id === 'dragon' && this.parkedDragon && this.parkedDragon.pos.distanceTo(this.gPos) < 40) {
        // Back up into the saddles of the dragon who waited for them.
        this.vehicle = this.parkedDragon.model;
        if (this.vehicle.dragon) this.vehicle.dragon.gaze = 0;
        this.gPos.copy(this.parkedDragon.pos);
        this.heading = this.parkedDragon.heading;
        this.parkedDragon = null;
      } else {
        if (id === 'dragon') this.dropParkedDragon();
        if (id === 'van' && this.parkedVan) {
          this.scene.remove(this.parkedVan.model.root);
          this.parkedVan = null;
        }
        this.vehicle = buildVehicle(id, this.st.van);
        this.scene.add(this.vehicle!.root);
      }
      this.grounded = true;
    } else if (def.kind === 'mount') {
      this.vehicle = buildVehicle(id);
      this.scene.add(this.vehicle!.root);
      this.boyUnicorn = this.vehicle!.unicorns![1];
      this.scene.add(this.boyUnicorn.root);
    } else if (id === 'fly') {
      this.grounded = false;
      this.vy = 6;
    }
    this.camDist = def.kind === 'air' ? 20 : def.kind === 'ground' ? (id === 'truck' || id === 'van' ? 16 : 12) : def.kind === 'mount' ? 10 : 8;
    return null;
  }

  /** Rebuild the van (after decorating) so its outside shows the change. */
  refreshVan(): void {
    if (this.mode === 'van' && this.vehicle) {
      this.scene.remove(this.vehicle.root);
      this.vehicle = buildVehicle('van', this.st.van);
      this.scene.add(this.vehicle!.root);
    } else if (this.parkedVan) {
      this.scene.remove(this.parkedVan.model.root);
      this.parkedVan.model = buildVehicle('van', this.st.van)!;
      this.scene.add(this.parkedVan.model.root);
    }
  }

  /** The waiting Night Dragon goes home (they rode off another way, or went far). */
  private dropParkedDragon(): void {
    if (!this.parkedDragon) return;
    this.scene.remove(this.parkedDragon.model.root);
    this.parkedDragon = null;
  }

  teleport(x: number, z: number): void {
    // Travelling on lands you: the "land the plane first" rule is for the player, not the road.
    this.grounded = true;
    if (this.mode !== 'walk' && !this.mounted) this.setMode('walk');
    this.dropParkedDragon();
    this.gPos.set(x, surfaceAt(x, z, 1e9), z);
    this.world.resolve(this.gPos, 0.5);
    this.bPos.set(x + 1.95, surfaceAt(x + 1.95, z, 1e9), z);
    // Safar comes along — it is how they travel.
    if (this.parkedVan) {
      const at = parkingNear(x - 7, z + 3, (px, pz) => { const q = new THREE.Vector3(px, 0, pz); this.world.resolve(q, 3.2); return Math.hypot(q.x - px, q.z - pz) < 0.05; });
      this.parkedVan.pos.set(at.x, 0, at.z);
      this.parkedVan.pos.y = surfaceAt(at.x, at.z, 1e9);
    }
    this.camInit = false;
  }

  update(dt: number, input: Input, t: number): void {
    // Camera control.
    this.camYaw -= input.dx * 0.005;
    this.camPitch = clamp(this.camPitch + input.dy * 0.004, -1.35, 1.3);
    this.camDist = clamp(this.camDist + input.wheel * 1.2, 4, 40);

    if (this.carriage) return this.rideCarriage(dt, t);
    const a = input.axis();
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const kind = VEHICLES[this.mode].kind;

    if (kind === 'foot' || kind === 'mount') this.moveOnFoot(dt, input, a, fwd, right);
    else if (kind === 'cape') this.moveFlying(dt, input, a, fwd, right);
    else if (kind === 'ground') this.moveDriving(dt, input, a);
    else this.moveFlyingPlane(dt, input, a);

    // Flight light: recharges on the ground, and in the air while the two stay close (the
    // thread shares its light — no touching needed).
    const close = this.gPos.distanceTo(this.bPos) < 4.5;
    if (this.mode === 'fly' || (this.mounted && !this.grounded)) {
      const drain = (this.mounted ? 0.03 : 0.055) / (1 + this.st.light * 0.15);
      this.energy = clamp(this.energy - drain * dt + (close ? 0.025 * dt : 0), 0, 1);
    } else if (this.grounded) {
      this.energy = clamp(this.energy + 0.25 * dt, 0, 1);
    }

    this.updateBoy(dt);
    this.place(dt, t);
  }

  private moveOnFoot(dt: number, input: Input, a: { x: number; y: number }, fwd: THREE.Vector3, right: THREE.Vector3): void {
    const mount = this.mounted;
    const sprint = input.held('shift') && this.grounded;
    const max = mount ? (sprint ? 24 : 15) : sprint ? 11 : 6.5;
    const want = fwd.clone().multiplyScalar(a.y).addScaledVector(right, a.x).multiplyScalar(max);
    const swimming = !mount && groundAt(this.gPos.x, this.gPos.z, this.gPos.y) < WATER_Y - 0.9;
    if (swimming) want.multiplyScalar(0.5);
    this.vel.x = damp(this.vel.x, want.x, this.grounded ? 10 : 3, dt);
    this.vel.z = damp(this.vel.z, want.z, this.grounded ? 10 : 3, dt);
    if (want.lengthSq() > 0.1) this.heading = turnToward(this.heading, Math.atan2(want.x, want.z), 10 * dt);

    const jumpKey = input.hit(' ');
    if (mount && input.held(' ') && this.energy > 0.02) {
      this.vy = damp(this.vy, 7, 4, dt); // unicorns take to the air
      this.grounded = false;
    } else if (jumpKey && this.grounded) {
      this.vy = mount ? 9 : 7.5;
      this.grounded = false;
    }
    this.vy -= GRAVITY * dt * (mount && !this.grounded && input.held(' ') ? 0.2 : 1);

    this.gPos.x += this.vel.x * dt;
    this.gPos.z += this.vel.z * dt;
    this.gPos.y += this.vy * dt;
    this.world.resolve(this.gPos, mount ? 0.9 : 0.35);

    // Unicorns walk on water; people swim in it.
    let ground = groundAt(this.gPos.x, this.gPos.z, this.gPos.y);
    if (mount) ground = Math.max(ground, WATER_Y);
    else if (swimming) ground = WATER_Y - 1.1;
    else ground = Math.max(ground, WATER_Y - 1.1);
    if (this.gPos.y <= ground) {
      this.gPos.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else if (this.gPos.y > ground + 0.35) {
      this.grounded = false;
    } else if (this.vy <= 0) {
      // Stick to gentle downhill slopes instead of hopping.
      this.gPos.y = ground;
      this.vy = 0;
      this.grounded = true;
    }
  }

  private moveFlying(dt: number, input: Input, a: { x: number; y: number }, fwd: THREE.Vector3, right: THREE.Vector3): void {
    const max = 20 + Math.min(14, this.st.light * 1.2);
    const want = fwd.clone().multiplyScalar(a.y).addScaledVector(right, a.x).multiplyScalar(max);
    this.vel.x = damp(this.vel.x, want.x, 2.5, dt);
    this.vel.z = damp(this.vel.z, want.z, 2.5, dt);
    if (want.lengthSq() > 0.1) this.heading = turnToward(this.heading, Math.atan2(want.x, want.z), 4 * dt);
    let vyWant = input.held(' ') ? 9 : input.held('shift') ? -10 : -0.6;
    if (this.energy <= 0.001) vyWant = Math.min(vyWant, -4); // out of light: glide down
    this.vy = damp(this.vy, vyWant, 3, dt);
    const ground = surfaceAt(this.gPos.x, this.gPos.z, this.gPos.y);
    const ceiling = ground + 40 + this.st.light * 24;
    this.gPos.x += this.vel.x * dt;
    this.gPos.z += this.vel.z * dt;
    this.gPos.y = Math.min(ceiling, this.gPos.y + this.vy * dt);
    this.world.resolve(this.gPos, 0.35);
    const g2 = surfaceAt(this.gPos.x, this.gPos.z, this.gPos.y);
    if (this.gPos.y <= g2) {
      this.gPos.y = g2;
      if (this.vy < 0) {
        this.setMode('walk');
        this.grounded = true;
      }
    }
  }

  private moveDriving(dt: number, input: Input, a: { x: number; y: number }): void {
    const def = VEHICLES[this.mode];
    const target = a.y > 0 ? def.maxSpeed * (input.held('shift') ? 1 : 0.75) : a.y < 0 ? -def.maxSpeed * 0.3 : 0;
    const rate = a.y === 0 ? 1.2 : Math.sign(target - this.speed) !== Math.sign(this.speed) && this.speed !== 0 ? 3 : def.accel / def.maxSpeed * 2;
    this.speed = damp(this.speed, target, rate, dt);
    const steer = -a.x * def.turn * Math.min(1, Math.abs(this.speed) / 6) * Math.sign(this.speed || 1);
    this.heading += steer * dt;
    // Camera drifts behind the vehicle.
    if (Math.abs(this.speed) > 2) this.camYaw = turnToward(this.camYaw, this.heading, 1.5 * dt);

    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const next = this.gPos.clone().addScaledVector(dir, this.speed * dt);
    if (terrainHeight(next.x, next.z) < WATER_Y + 0.1) {
      this.speed *= -0.2; // bumped the shore
      return;
    }
    const before = next.clone();
    this.world.resolve(next, this.mode === 'truck' ? 2.6 : this.mode === 'van' ? 2.9 : 1.8);
    if (before.distanceToSquared(next) > 1e-4) this.speed *= 0.6;
    this.gPos.copy(next);
    this.gPos.y = groundAt(this.gPos.x, this.gPos.z, this.gPos.y + 1.5);
    // Tilt to the terrain.
    const f = 1.8;
    const hF = terrainHeight(this.gPos.x + dir.x * f, this.gPos.z + dir.z * f), hB = terrainHeight(this.gPos.x - dir.x * f, this.gPos.z - dir.z * f);
    const hR = terrainHeight(this.gPos.x + dir.z * f, this.gPos.z - dir.x * f), hL = terrainHeight(this.gPos.x - dir.z * f, this.gPos.z + dir.x * f);
    this.pitch = damp(this.pitch, Math.atan2(hB - hF, 2 * f), 8, dt);
    this.roll = damp(this.roll, Math.atan2(hR - hL, 2 * f), 8, dt);
    this.grounded = true;
  }

  private moveFlyingPlane(dt: number, input: Input, a: { x: number; y: number }): void {
    const def = VEHICLES[this.mode];
    const dragon = this.mode === 'dragon';
    const throttle = a.y > 0 ? def.maxSpeed : a.y < 0 ? 0 : this.speed;
    this.speed = damp(this.speed, throttle, a.y === 0 ? 0.1 : 0.6, dt);
    this.heading += -a.x * def.turn * dt * (this.grounded ? 0.8 : 1);
    this.roll = damp(this.roll, a.x * 0.6 * (this.grounded ? 0 : 1), 3, dt);
    this.camYaw = turnToward(this.camYaw, this.heading, 1.2 * dt);
    const lift = dragon || this.speed > 24;
    let climb = 0;
    if (input.held(' ') && lift) climb = 1;
    else if (input.held('shift')) climb = -1;
    else if (!lift && !this.grounded) climb = -0.6; // too slow: sink
    this.pitch = damp(this.pitch, -climb * 0.35, 3, dt);
    const dir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.gPos.addScaledVector(dir, this.speed * dt);
    this.gPos.y += climb * (dragon ? Math.max(8, this.speed * 0.4) : this.speed * 0.4) * dt;
    const ground = surfaceAt(this.gPos.x, this.gPos.z, this.gPos.y);
    this.gPos.y = Math.min(this.gPos.y, 900);
    if (this.gPos.y <= ground) {
      this.gPos.y = ground;
      this.grounded = true;
      if (this.speed > 30 && climb < 0) this.speed *= 0.97;
    } else {
      this.grounded = this.gPos.y - ground < 0.05;
    }
    if (this.grounded) this.world.resolve(this.gPos, 3);
  }

  /** Her wings and his jetpack must never reach each other or him: the gap they need (0 without them). */
  backGap(): number {
    const g = this.girl.backReach(), b = this.boy.backReach();
    return g || b ? g + Math.max(b, BODY_RADIUS) + 0.2 : 0;
  }

  /** How far below her feet her wings reach, and his height (m). */
  private wingFloor(): number { return WING_FLOOR * this.girl.figureScale; }
  private boyHeight(): number { return 2.0 * this.boy.figureScale; }

  private updateBoy(dt: number): void {
    const def = VEHICLES[this.mode];
    if (def.seats.length) {
      // Seated in his own seat. Positions are applied in place().
      this.bSpeed = 0;
      this.tension = 0;
      return;
    }
    const airborne = this.mode === 'fly' || !this.grounded;
    const px = this.bPos.x, pz = this.bPos.z;
    // With her wings on he stands beside her, just clear of where they sweep back; in flight he
    // flies close by her, below the wings' lowest reach. Her wings fold whenever he is anywhere
    // else (walking round to his place as she turns, or kept up by the ground), so they never reach him.
    const wings = this.girl.hasWings && !this.mounted;
    const under = belowWings(this.wingFloor(), this.boyHeight()), far = this.backGap() + 0.45;
    // Too near the ground to fly under her: behind her, beyond the wings' reach, until she climbs.
    const room = this.gPos.y - surfaceAt(this.gPos.x, this.gPos.z, this.gPos.y + 2) > -(under.up ?? 0) + 0.5;
    const stance = !wings ? undefined : this.mode === 'fly'
      ? (room ? under : { forward: -far * 0.8, side: far * 0.6, up: -0.5 })
      : { forward: 0.35, side: 2.1 };
    const out = followStep({
      boy: this.bPos, girl: this.gPos, heading: this.heading, speed: this.currentSpeed, dt, airborne,
      groundAt: (x, z) => this.mounted ? Math.max(surfaceAt(x, z, this.gPos.y + 2), WATER_Y) : surfaceAt(x, z, this.gPos.y + 2),
      gap: wings ? MIN_GAP : this.backGap(),
      stance,
    });
    this.bPos.set(out.pos.x, out.pos.y, out.pos.z);
    // Under her wings he keeps under them even as she dives (never lagging up into them), and
    // flying low below her, he never goes under the ground.
    if (wings && this.mode === 'fly' && room) this.bPos.y = Math.min(this.bPos.y, this.gPos.y + (under.up ?? 0));
    if (airborne) this.bPos.y = Math.max(this.bPos.y, surfaceAt(this.bPos.x, this.bPos.z, this.bPos.y + 2));
    this.world.resolve(this.bPos, this.mounted ? 0.9 : 0.35);
    // Collision can push him — the gap always wins.
    const gap = Math.max(this.mounted ? MOUNT_GAP : MIN_GAP, wings ? 0 : this.backGap());
    const safe = enforceGap(this.bPos, this.gPos, gap);
    this.bPos.set(safe.x, safe.y, safe.z);
    this.bSpeed = out.speed;
    this.tension = out.tension;
    this.bHeading = turnToward(this.bHeading, companionHeading(this.bPos.x - px, this.bPos.z - pz, dt, this.heading, this.bHeading), (out.speed > 0.3 ? 8 : 2) * dt);
  }

  private place(dt: number, t: number): void {
    // Her wings open fully while he is wholly in front of them; otherwise they fold in to the room
    // between them (never touching him or his pack). Airborne she leans into her flight, tilting
    // them, so there only the distance counts.
    const own = Math.max(this.boy.backReach(), BODY_RADIUS) + 0.2, plane = this.girl.wingPlane();
    // On the night dragon he sits wholly in front of her (he drives), so her wings open fully
    // behind her however they fly.
    const level = (this.mode !== 'fly' && this.grounded) || this.mode === 'dragon';
    // Measured from where she is: on the dragon her saddle, not its centre.
    const her = this.mode === 'dragon' && this.vehicle ? this.girl.root.position : this.gPos;
    this.girl.setBackRoom(plane !== null && level
      ? wingRoom(this.bPos, her, this.heading, own, plane, MIN_BACK)
      // In the air: wholly below them, they open fully; anywhere else they fold to the distance.
      : plane !== null && clearBelow(this.bPos, her, this.wingFloor(), this.boyHeight()) ? Infinity
      : Math.hypot(her.x - this.bPos.x, her.z - this.bPos.z) - own);
    const def = VEHICLES[this.mode];
    const riding = def.seats.length > 0 || def.kind === 'mount';
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.heading, this.roll, 'YXZ'));

    if (this.vehicle && def.seats.length) {
      this.vehicle.root.position.copy(this.gPos);
      this.vehicle.root.quaternion.copy(q);
      this.vehicle.update(dt, this.speed, t);
      const [sg, sb] = def.seats as [{ x: number; y: number; z: number }, { x: number; y: number; z: number }];
      const g = new THREE.Vector3(sg.x, sg.y - 0.55, sg.z).applyQuaternion(q).add(this.gPos);
      const b = new THREE.Vector3(sb.x, sb.y - 0.55, sb.z).applyQuaternion(q).add(this.gPos);
      this.girl.root.position.copy(g);
      this.boy.root.position.copy(b);
      this.girl.root.quaternion.copy(q);
      this.boy.root.quaternion.copy(q);
      this.bPos.copy(b);
    } else if (this.vehicle && def.kind === 'mount') {
      const [ug, ub] = this.vehicle.unicorns!;
      ug.root.position.copy(this.gPos);
      ug.root.rotation.set(0, this.heading, 0);
      ub.root.position.copy(this.bPos);
      ub.root.rotation.set(0, this.bHeading, 0);
      ug.update(dt, this.currentSpeed, t);
      ub.update(dt, this.bSpeed, t);
      this.girl.root.position.copy(this.gPos).addScaledVector(UP, ug.saddleY - 0.5);
      this.boy.root.position.copy(this.bPos).addScaledVector(UP, ub.saddleY - 0.5);
      this.girl.root.rotation.set(0, this.heading, 0);
      this.boy.root.rotation.set(0, this.bHeading, 0);
    } else {
      this.girl.root.position.copy(this.gPos);
      this.boy.root.position.copy(this.bPos);
      this.girl.root.rotation.set(0, this.heading, 0);
      this.boy.root.rotation.set(0, this.bHeading, 0);
    }
    if (this.parkedVan) {
      this.parkedVan.model.root.position.copy(this.parkedVan.pos);
      this.parkedVan.model.root.rotation.set(0, this.parkedVan.heading, 0);
    }
    const pd = this.parkedDragon;
    if (pd) {
      if (pd.pos.distanceTo(this.gPos) > 300) this.dropParkedDragon();
      else {
        pd.model.root.position.copy(pd.pos);
        pd.model.root.rotation.set(0, pd.heading, 0);
        pd.model.update(dt, 0, t);
      }
    }

    const flying = this.mode === 'fly' || (!this.grounded && !riding);
    this.girl.update(dt, { speed: this.currentSpeed, airborne: flying, riding, t });
    const boyAir = this.mode === 'fly' || (!riding && this.bPos.y > surfaceAt(this.bPos.x, this.bPos.z, this.bPos.y) + 0.4);
    this.boy.update(dt, { speed: this.bSpeed, airborne: boyAir, riding, t });

    const ga = new THREE.Vector3(), ba = new THREE.Vector3();
    this.girl.handAnchor.getWorldPosition(ga);
    this.boy.handAnchor.getWorldPosition(ba);
    this.thread.update(ga, ba, this.tension, this.st.light, t, dt);
  }

  /** Sitting in their seats on a coach, carried along. */
  private rideCarriage(dt: number, t: number): void {
    const c = this.carriage!;
    c.root.updateMatrixWorld();
    const q = c.root.getWorldQuaternion(new THREE.Quaternion());
    const g = new THREE.Vector3(c.girl[0], c.girl[1] - 0.55, c.girl[2]).applyMatrix4(c.root.matrixWorld);
    const b = new THREE.Vector3(c.boy[0], c.boy[1] - 0.55, c.boy[2]).applyMatrix4(c.root.matrixWorld);
    this.gPos.copy(g);
    this.bPos.copy(b);
    this.heading = this.bHeading = c.root.rotation.y;
    this.speed = this.bSpeed = 0;
    this.vel.set(0, 0, 0);
    this.grounded = true;
    this.girl.setBackRoom(0.2);
    this.girl.root.position.copy(g);
    this.boy.root.position.copy(b);
    this.girl.root.quaternion.copy(q);
    this.boy.root.quaternion.copy(q);
    this.girl.update(dt, { speed: 0, airborne: false, riding: true, t });
    this.boy.update(dt, { speed: 0, airborne: false, riding: true, t });
    const ga = new THREE.Vector3(), ba = new THREE.Vector3();
    this.girl.handAnchor.getWorldPosition(ga);
    this.boy.handAnchor.getWorldPosition(ba);
    this.thread.update(ga, ba, this.tension, this.st.light, t, dt);
  }

  updateCamera(cam: THREE.PerspectiveCamera, dt: number): void {
    const target = this.gPos.clone().add(new THREE.Vector3(0, VEHICLES[this.mode].kind === 'ground' ? 2.2 : 1.5, 0));
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    // With her wings on, the camera stays back past their swept tips, so the glass never fills the view.
    const dist = Math.max(this.camDist, this.girl.hasWings && !this.mounted ? this.girl.backReach() + 4 : 0);
    const want = target.clone().add(new THREE.Vector3(-Math.sin(this.camYaw) * cp * dist, sp * dist, -Math.cos(this.camYaw) * cp * dist));
    const floor = surfaceAt(want.x, want.z, want.y) + 0.8;
    // Below the travellers the camera stops at the ground and tilts up instead, so turning the
    // view down past them looks up into the sky.
    let lookY = target.y;
    if (want.y < floor) { lookY += (floor - want.y) * 2.2; want.y = floor; }
    if (!this.camInit) {
      this.camPos.copy(want);
      this.camInit = true;
    } else {
      this.camPos.x = damp(this.camPos.x, want.x, 8, dt);
      this.camPos.y = damp(this.camPos.y, want.y, 8, dt);
      this.camPos.z = damp(this.camPos.z, want.z, 8, dt);
    }
    cam.position.copy(this.camPos);
    cam.lookAt(target.x, lookY, target.z);
  }

  save(): void {
    this.st.player = { x: this.gPos.x, y: this.gPos.y, z: this.gPos.z, heading: this.heading };
  }
}

/**
 * Which way he faces: the way he is actually walking — and when that is roughly her way, exactly
 * her way, so side by side they walk straight together instead of him turning to face her.
 */
export function companionHeading(dx: number, dz: number, dt: number, herHeading: number, current: number): number {
  const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
  if (speed < 0.3) return herHeading;
  const moving = Math.atan2(dx, dz);
  const off = Math.atan2(Math.sin(moving - herHeading), Math.cos(moving - herHeading));
  if (Math.abs(off) < Math.PI / 3) return herHeading;
  return Number.isFinite(moving) ? moving : current;
}

function turnToward(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}

/**
 * Where Safar parks when they arrive somewhere: the spot asked for if it is dry ground, else the
 * nearest dry, open ground round it (never on the sea, a river, or a pier over the water; bugs
 * seen 2026-09-27). `clear` says whether a spot is free of buildings.
 */
export function parkingNear(x: number, z: number, clear: (x: number, z: number) => boolean = () => true): { x: number; z: number } {
  const dry = (px: number, pz: number) => {
    // Its whole length on land: the middle and both ends a few metres out.
    for (const [dx, dz] of [[0, 0], [3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) if (terrainHeight(px + dx, pz + dz) < WATER_Y + 0.4) return false;
    return clear(px, pz);
  };
  if (dry(x, z)) return { x, z };
  for (let r = 4; r <= 160; r += 4) {
    const n = Math.max(8, Math.round(r * 0.8));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (dry(px, pz)) return { x: px, z: pz };
    }
  }
  return { x, z };
}

