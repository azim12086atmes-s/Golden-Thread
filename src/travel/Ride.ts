import * as THREE from 'three';
import { buildAirTaxi, buildCoach, buildFerryBoat, buildStreetTram, buildTramCabin } from '../vehicles/vehicles';
import { WATER_Y, surfaceAt } from '../world/terrain';
import { bridgeDeckAt } from '../world/bridges';
import { harbourOf } from '../world/harbours';
import { HARBOUR_DECK } from '../economy/HarboursView';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import { COACH_FAMILY_SEATS, COACH_SEATS, busPath, keepSide, type BusStop } from './bus';
import { FERRY_FAMILY_SEATS, FERRY_SEATS, ferryRoute, mooring } from './ferry';
import { AIR_FAMILY_SEATS, AIR_SEATS, airArrival, airCourse, type AirPoint } from './air';
import { TRAM_FAMILY_SEATS, TRAM_SEATS, tramAlight, tramCourseWorld } from './gondola';
import { STREET_TRAM_FAMILY_SEATS, STREET_TRAM_SEATS, TRAM_TOWNS, tramPath, type TramStop } from './streetTram';
import type { Travellers } from '../player/Travellers';

type V3 = readonly [number, number, number];
export type RideKind = 'coach' | 'ferry' | 'air' | 'tram' | 'streetcar';

interface RideSpec {
  kind: RideKind;
  to: RegionId;
  /** The course (world x, y, z); y is followed only in the air and on the cable. */
  pts: Array<[number, number, number]>;
  model: THREE.Object3D;
  seats: { girl: V3; boy: V3 };
  family: readonly V3[];
  /** Cruising speed, how fast it gathers way, and how hard it brakes (m/s, m/s²). */
  vmax: number;
  accel: number;
  brake: number;
  /** Where they step down, which way they face, and the height if it is a deck (a pier). */
  alight: { x: number; z: number; facing: number; y?: number; bx?: number; bz?: number; van?: [number, number] };
  /** Going up (the cable car); otherwise down. */
  up?: boolean;
}

/**
 * A ride on someone else's vehicle — the intercity coach, a city tram, the coastal ferry, the air
 * taxi or the Sky Isles cable car. It takes them at the stop, pier, pad or station, the two in their separate seats and the family theirs, and
 * carries them along its course to where they step down. The world streams in as it goes; E or
 * Esc skips to the arrival.
 */
export class Ride {
  readonly root: THREE.Object3D;
  readonly kind: RideKind;
  readonly to: RegionId;
  readonly up: boolean;
  private pts: Array<[number, number, number]>;
  private cum: number[] = [0];
  private u = 0;
  private v = 0;
  private i = 0;
  private y: number;
  private heading = 0;
  private t = 0;
  private rotors: THREE.Object3D[] = [];
  done = false;

  constructor(private scene: THREE.Scene, private trav: Travellers, private spec: RideSpec) {
    this.kind = spec.kind;
    this.to = spec.to;
    this.up = spec.up ?? true;
    this.pts = spec.pts;
    this.root = spec.model;
    this.root.traverse((o) => { if (o.userData.rotor) this.rotors.push(o); });
    for (let k = 1; k < this.pts.length; k++) {
      const [ax, ay, az] = this.pts[k - 1], [bx, by, bz] = this.pts[k];
      this.cum.push(this.cum[k - 1] + Math.hypot(bx - ax, this.aloft ? by - ay : 0, bz - az));
    }
    const [x0, y0, z0] = this.pts[0];
    this.y = this.aloft ? y0 : this.kind === 'ferry' ? WATER_Y : surfaceAt(x0, z0, 1e9);
    // Facing the way it will go: the first point a few metres off along the ground.
    const ahead = this.pts.find((p) => Math.hypot(p[0] - x0, p[2] - z0) > 3) ?? this.pts[this.pts.length - 1];
    this.heading = Math.atan2(ahead[0] - x0, ahead[2] - z0);
    this.place();
    scene.add(this.root);
    trav.carriage = { root: this.root, girl: spec.seats.girl, boy: spec.seats.boy, family: spec.family };
  }

  /** Following its course's own heights: flying, or hanging from the cable. */
  private get aloft(): boolean {
    return this.kind === 'air' || this.kind === 'tram';
  }

  /** On the road: the coach and the city tram. */
  private get onRoad(): boolean {
    return this.kind === 'coach' || this.kind === 'streetcar';
  }

  get length(): number {
    return this.cum[this.cum.length - 1];
  }

  /** How far along the ride is, 0…1. */
  get progress(): number {
    return this.u / this.length;
  }

  /** Jump to just short of the arrival (it slows and comes in). */
  skip(): void {
    const back = this.kind === 'air' ? 40 : this.kind === 'ferry' ? 45 : this.kind === 'tram' ? 12 : this.kind === 'streetcar' ? 20 : 30;
    this.u = Math.max(this.u, this.length - back);
    this.v = Math.min(this.v, 8);
    while (this.i < this.cum.length - 2 && this.cum[this.i + 1] < this.u) this.i++;
    const p = this.at(this.u);
    this.y = this.onRoad ? surfaceAt(p[0], p[2], 1e9) : this.height(p);
    this.place(p);
  }

  update(dt: number): void {
    if (this.done) return;
    this.t += dt;
    const left = this.length - this.u, s = this.spec;
    // Gather way gently, cruise, and brake to a stop at the kerb, the pier or the pad.
    const vmax = Math.min(s.vmax, Math.sqrt(2 * s.brake * Math.max(left, 0)) + 0.5);
    this.v = Math.min(vmax, this.v + s.accel * dt);
    this.u = Math.min(this.length, this.u + this.v * dt);
    while (this.i < this.cum.length - 2 && this.cum[this.i + 1] < this.u) this.i++;
    const p = this.at(this.u);
    const ahead = this.at(Math.min(this.length, this.u + (this.kind === 'ferry' ? 14 : 6)));
    if (Math.hypot(ahead[0] - p[0], ahead[2] - p[2]) > 0.5) {
      const want = Math.atan2(ahead[0] - p[0], ahead[2] - p[2]);
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * (this.kind === 'ferry' ? 1.2 : 3));
    }
    const g = this.onRoad ? bridgeDeckAt(p[0], p[2]) ?? surfaceAt(p[0], p[2], this.y + 3) : this.height(p);
    this.y = this.kind === 'tram' ? g : this.y + (g - this.y) * Math.min(1, dt * (this.kind === 'air' ? 20 : 8));
    for (const r of this.rotors) r.rotation.y += dt * 40;
    this.place(p);
    if (left < 0.05 && this.v < 0.6) this.arrive();
  }

  /** The height it rides at: on the swell at sea, on its course in the air (never into the ground). */
  private height(p: [number, number, number]): number {
    if (this.kind === 'ferry') return WATER_Y + Math.sin(this.t * 0.9) * 0.12;
    if (this.kind === 'tram') return p[1];
    const hover = Math.min(1, this.v / 10) * Math.sin(this.t * 1.3) * 0.25;
    return Math.max(p[1] + hover, surfaceAt(p[0], p[2], p[1] + 0.5));
  }

  /** Step down, and it goes on its way. */
  private arrive(): void {
    this.done = true;
    this.trav.carriage = null;
    this.scene.remove(this.root);
    const a = this.spec.alight;
    this.trav.teleport(a.x, a.z);
    if (a.y !== undefined) {
      this.trav.gPos.y = Math.max(this.trav.gPos.y, a.y);
      if (a.bx !== undefined && a.bz !== undefined) this.trav.bPos.set(a.bx, a.y, a.bz);
      else this.trav.bPos.y = Math.max(this.trav.bPos.y, a.y);
    }
    this.trav.heading = a.facing;
    // Safar waits somewhere it can stand (on the quay, not in the sea).
    const van = this.trav.parkedVan;
    if (van && a.van) van.pos.set(a.van[0], surfaceAt(a.van[0], a.van[1], 1e9), a.van[1]);
  }

  /** Remove it (the ride is abandoned, e.g. a new game). */
  dispose(): void {
    if (this.trav.carriage?.root === this.root) this.trav.carriage = null;
    this.scene.remove(this.root);
    this.done = true;
  }

  private at(u: number): [number, number, number] {
    let k = this.i;
    while (k > 0 && this.cum[k] > u) k--;
    while (k < this.cum.length - 2 && this.cum[k + 1] < u) k++;
    const seg = this.cum[k + 1] - this.cum[k] || 1, t = Math.min(1, Math.max(0, (u - this.cum[k]) / seg));
    const a = this.pts[k], b = this.pts[k + 1] ?? a;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  private place(p = this.at(this.u)): void {
    this.root.position.set(p[0], this.y, p[2]);
    // At sea she pitches and rolls a little with the swell.
    // On the cable the cabin swings gently from its grip.
    const sway = this.kind === 'tram' ? Math.min(1, this.v / 3) : 0;
    const roll = this.kind === 'ferry' ? Math.sin(this.t * 0.7) * 0.025 : Math.sin(this.t * 1.1) * 0.02 * sway;
    const pitch = this.kind === 'ferry' ? Math.sin(this.t * 0.55 + 1) * 0.015 : Math.sin(this.t * 0.8 + 2) * 0.012 * sway;
    this.root.rotation.set(pitch, this.heading, roll, 'YXZ');
  }
}

const flat = (pts: Array<[number, number]>): Array<[number, number, number]> => pts.map(([x, z]) => [x, 0, z]);

/** The coach from `start` to the stop in `to`. */
export function coachRide(scene: THREE.Scene, trav: Travellers, start: BusStop, to: RegionId): Ride {
  const r = busPath(start, to);
  if (!r) throw new Error(`no road from ${start.land} to ${to}`);
  const s = r.stop, dx = s.x - s.kerbX, dz = s.z - s.kerbZ, d = Math.hypot(dx, dz) || 1;
  return new Ride(scene, trav, {
    kind: 'coach', to, pts: flat(keepSide(r.pts, 3.5)), model: buildCoach(REGION_BY_ID[to].name),
    seats: COACH_SEATS, family: COACH_FAMILY_SEATS, vmax: 20, accel: 3, brake: 2.5,
    // The kerb, and a step toward the shelter.
    alight: { x: s.kerbX + (dx / d) * 2.5, z: s.kerbZ + (dz / d) * 2.5, facing: s.facing + Math.PI },
  });
}

/** The ferry from the pier of `from` to the pier of `to`. */
export function ferryRide(scene: THREE.Scene, trav: Travellers, from: RegionId, to: RegionId): Ride {
  const pts = ferryRoute(from, to), h = harbourOf(to);
  if (!pts || !h) throw new Error(`no ferry from ${from} to ${to}`);
  const m = mooring(h), [dx, dz] = h.dir;
  return new Ride(scene, trav, {
    kind: 'ferry', to, pts: flat(pts), model: buildFerryBoat(),
    seats: FERRY_SEATS, family: FERRY_FAMILY_SEATS, vmax: 24, accel: 1.6, brake: 1.2,
    // Onto the pier beside her, facing the shore; he a couple of steps nearer it.
    alight: {
      x: m.pierX, z: m.pierZ, y: HARBOUR_DECK, bx: m.pierX - dx * 2.2, bz: m.pierZ - dz * 2.2, facing: Math.atan2(-dx, -dz),
      van: [h.x - dx * 22 + dz * 10, h.z - dz * 22 - dx * 10],
    },
  });
}

/** The air taxi from `from` (a stop or the Sky Isles pad) to `to`. */
export function airRide(scene: THREE.Scene, trav: Travellers, from: AirPoint, to: RegionId): Ride {
  const b = airArrival(to, from.x, from.z);
  return new Ride(scene, trav, {
    kind: 'air', to, pts: airCourse(from, b), model: buildAirTaxi(),
    seats: AIR_SEATS, family: AIR_FAMILY_SEATS, vmax: 45, accel: 5, brake: 3,
    // On the Sky Isles stage he stands beside her, not over its edge.
    alight: { x: b.stepX, z: b.stepZ, facing: b.facing, ...(to === 'skyisles' ? { y: b.y, bx: b.stepX + Math.cos(b.facing) * 1.95, bz: b.stepZ - Math.sin(b.facing) * 1.95 } : {}) },
  });
}

/** The Sky Isles cable car, up from the valley station to the temple's isle or back down. */
export function tramRide(scene: THREE.Scene, trav: Travellers, up: boolean): Ride {
  const a = tramAlight(up);
  return new Ride(scene, trav, {
    kind: 'tram', to: 'skyisles', up, pts: tramCourseWorld(up ? 1 : -1, up), model: buildTramCabin(),
    seats: TRAM_SEATS, family: TRAM_FAMILY_SEATS, vmax: 6, accel: 0.8, brake: 0.7,
    alight: { x: a.x, z: a.z, y: a.y, bx: a.bx, bz: a.bz, facing: a.facing },
  });
}

/** A city tram from `from` to another stop `to` in the same town. */
export function streetTramRide(scene: THREE.Scene, trav: Travellers, from: TramStop, to: TramStop): Ride {
  const style = TRAM_TOWNS[from.land];
  const pts = tramPath(from, to);
  if (!style || pts.length < 2) throw new Error(`no tram from ${from.id} to ${to.id}`);
  const dx = to.x - to.kerbX, dz = to.z - to.kerbZ, d = Math.hypot(dx, dz) || 1;
  return new Ride(scene, trav, {
    kind: 'streetcar', to: to.land, pts: flat(keepSide(pts, 3.5)), model: buildStreetTram(style),
    seats: STREET_TRAM_SEATS, family: STREET_TRAM_FAMILY_SEATS, vmax: 12, accel: 1.8, brake: 1.8,
    alight: { x: to.kerbX + (dx / d) * 2.5, z: to.kerbZ + (dz / d) * 2.5, facing: to.facing + Math.PI },
  });
}
