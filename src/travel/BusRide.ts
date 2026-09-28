import * as THREE from 'three';
import { buildCoach } from '../vehicles/vehicles';
import { surfaceAt } from '../world/terrain';
import { bridgeDeckAt } from '../world/bridges';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import { COACH_SEATS, busPath, keepSide, type BusStop } from './bus';
import type { Travellers } from '../player/Travellers';

/**
 * A ride on the intercity coach: it pulls in at the stop, the two take their seats (separate
 * window seats either side of the aisle) and the family theirs behind, and it drives — out
 * along the avenue, round the ring road, down the highway through each town between — to the
 * stop in the town they chose, where they step down onto the kerb. The world streams in as it
 * goes; E or Esc skips to the arrival.
 */
export class BusRide {
  readonly root: THREE.Group;
  private pts: Array<[number, number]>;
  private cum: number[] = [0];
  private u = 0;
  private v = 0;
  private i = 0;
  private y: number;
  private heading = 0;
  readonly stop: BusStop;
  done = false;

  constructor(private scene: THREE.Scene, private trav: Travellers, start: BusStop, readonly to: RegionId) {
    const r = busPath(start, to);
    if (!r) throw new Error(`no road from ${start.land} to ${to}`);
    this.stop = r.stop;
    this.pts = keepSide(r.pts, 3.5);
    for (let k = 1; k < this.pts.length; k++) this.cum.push(this.cum[k - 1] + Math.hypot(this.pts[k][0] - this.pts[k - 1][0], this.pts[k][1] - this.pts[k - 1][1]));
    this.root = buildCoach(REGION_BY_ID[to].name);
    this.y = surfaceAt(this.pts[0][0], this.pts[0][1], 1e9);
    const [ax, az] = this.pts[0], [bx, bz] = this.pts[Math.min(3, this.pts.length - 1)];
    this.heading = Math.atan2(bx - ax, bz - az);
    this.place();
    scene.add(this.root);
    trav.carriage = { root: this.root, girl: COACH_SEATS.girl, boy: COACH_SEATS.boy };
  }

  get length(): number {
    return this.cum[this.cum.length - 1];
  }

  /** How far along the ride is, 0…1. */
  get progress(): number {
    return this.u / this.length;
  }

  /** Jump to just short of the arrival stop (it slows and pulls in). */
  skip(): void {
    this.u = Math.max(this.u, this.length - 30);
    this.v = Math.min(this.v, 8);
    while (this.i < this.cum.length - 2 && this.cum[this.i + 1] < this.u) this.i++;
    const p = this.at(this.u);
    this.y = surfaceAt(p[0], p[1], 1e9);
    this.place();
  }

  update(dt: number): void {
    if (this.done) return;
    const left = this.length - this.u;
    // Pull away gently, cruise, and brake to a stop at the kerb.
    const vmax = Math.min(20, Math.sqrt(2 * 2.5 * Math.max(left, 0)) + 0.5);
    this.v = Math.min(vmax, this.v + 3 * dt);
    this.u = Math.min(this.length, this.u + this.v * dt);
    while (this.i < this.cum.length - 2 && this.cum[this.i + 1] < this.u) this.i++;
    const p = this.at(this.u);
    const ahead = this.at(Math.min(this.length, this.u + 6));
    if (Math.hypot(ahead[0] - p[0], ahead[1] - p[1]) > 0.5) {
      const want = Math.atan2(ahead[0] - p[0], ahead[1] - p[1]);
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.heading += d * Math.min(1, dt * 3);
    }
    const g = bridgeDeckAt(p[0], p[1]) ?? surfaceAt(p[0], p[1], this.y + 3);
    this.y += (g - this.y) * Math.min(1, dt * 8);
    this.place(p);
    if (left < 0.05 && this.v < 0.6) this.arrive();
  }

  /** Step down at the kerb, and the coach goes on its way. */
  private arrive(): void {
    this.done = true;
    this.trav.carriage = null;
    this.scene.remove(this.root);
    // The kerb, and a step toward the shelter.
    const s = this.stop, dx = s.x - s.kerbX, dz = s.z - s.kerbZ, d = Math.hypot(dx, dz) || 1;
    this.trav.teleport(s.kerbX + (dx / d) * 2.5, s.kerbZ + (dz / d) * 2.5);
    this.trav.heading = s.facing + Math.PI;
  }

  /** Remove the coach (the ride is abandoned, e.g. a new game). */
  dispose(): void {
    if (this.trav.carriage?.root === this.root) this.trav.carriage = null;
    this.scene.remove(this.root);
    this.done = true;
  }

  private at(u: number): [number, number] {
    let k = this.i;
    while (k > 0 && this.cum[k] > u) k--;
    while (k < this.cum.length - 2 && this.cum[k + 1] < u) k++;
    const seg = this.cum[k + 1] - this.cum[k] || 1, t = Math.min(1, Math.max(0, (u - this.cum[k]) / seg));
    const [ax, az] = this.pts[k], [bx, bz] = this.pts[k + 1] ?? this.pts[k];
    return [ax + (bx - ax) * t, az + (bz - az) * t];
  }

  private place(p = this.at(this.u)): void {
    this.root.position.set(p[0], this.y, p[1]);
    this.root.rotation.set(0, this.heading, 0);
  }
}
