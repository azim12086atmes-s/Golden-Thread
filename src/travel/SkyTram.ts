import * as THREE from 'three';
import { buildTramCabin } from '../vehicles/vehicles';
import type { World } from '../world/World';
import { tramCourseWorld, tramLine } from './gondola';
import type { Ride } from './Ride';

type P3 = [number, number, number];

/** Cabin speed on the span (m/s) and how long it waits at each station (s). */
const SPEED = 5, DWELL = 12;

/**
 * The Sky Isles cable car's two cabins, shuttling as an aerial tramway does: A on the right-hand
 * cable goes up while B on the left comes down, they pass in the middle, wait at the stations, and
 * swap. While the two ride, their cabin is the one on its cable and the other keeps pace opposite.
 */
export class SkyTram {
  private group = new THREE.Group();
  private cabins: [THREE.Group, THREE.Group];
  private courses: [P3[], P3[]];
  private cums: [number[], number[]];
  private t = 0;
  private shown = false;
  private wasRiding = false;

  constructor(private scene: THREE.Scene, private world: World) {
    this.cabins = [buildTramCabin(), buildTramCabin()];
    this.group.add(...this.cabins);
    this.courses = [tramCourseWorld(1, true), tramCourseWorld(-1, true)];
    this.cums = this.courses.map((c) => {
      const out = [0];
      for (let k = 1; k < c.length; k++) out.push(out[k - 1] + Math.hypot(c[k][0] - c[k - 1][0], c[k][1] - c[k - 1][1], c[k][2] - c[k - 1][2]));
      return out;
    }) as [number[], number[]];
  }

  private get travel(): number {
    return this.cums[0][this.cums[0].length - 1] / SPEED;
  }

  /** Where A is along its cable (0 valley … 1 mountain), and whether it is climbing. */
  private phase(): { q: number; rising: boolean } {
    const T = this.travel, cyc = 2 * T + 2 * DWELL, t = this.t % cyc;
    if (t < T) return { q: t / T, rising: true };
    if (t < T + DWELL) return { q: 1, rising: true };
    if (t < 2 * T + DWELL) return { q: 1 - (t - T - DWELL) / T, rising: false };
    return { q: 0, rising: false };
  }

  update(dt: number, ride: Ride | null): void {
    const want = this.world.isLoaded('skyisles');
    if (want !== this.shown) {
      this.shown = want;
      if (want) this.scene.add(this.group);
      else this.scene.remove(this.group);
    }
    this.t += dt;
    const riding = ride?.kind === 'tram' && !ride.done;
    // When they step off, their cabin is at the top (up) or the other has come up (down): A is up.
    if (this.wasRiding && !riding) this.t = this.travel;
    this.wasRiding = riding;
    if (!this.shown) return;
    const u = tramLine();
    let qa: number, rising: boolean;
    if (riding) {
      // Up on A's cable, or down on B's; the other cabin opposite.
      qa = ride!.progress;
      rising = true;
      this.cabins[ride!.up ? 0 : 1].visible = false;
      this.cabins[ride!.up ? 1 : 0].visible = true;
    } else {
      ({ q: qa, rising } = this.phase());
      this.cabins[0].visible = this.cabins[1].visible = true;
    }
    const up = Math.atan2(u.ux, u.uz);
    this.place(0, qa, rising ? up : up + Math.PI);
    this.place(1, 1 - qa, rising ? up + Math.PI : up);
  }

  private place(i: 0 | 1, q: number, heading: number): void {
    const c = this.courses[i], cum = this.cums[i], d = Math.min(1, Math.max(0, q)) * cum[cum.length - 1];
    let k = 0;
    while (k < cum.length - 2 && cum[k + 1] < d) k++;
    const f = Math.min(1, (d - cum[k]) / (cum[k + 1] - cum[k] || 1)), a = c[k], b = c[k + 1] ?? a;
    this.cabins[i].position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    this.cabins[i].rotation.set(0, heading, 0);
  }
}
