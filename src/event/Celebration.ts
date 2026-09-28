import * as THREE from 'three';
import type { Game } from '../Game';
import type { Objective } from '../guide/objectives';
import { CHOCOLATE, CakeScene } from '../story/CakeScene';
import { surfaceAt } from '../world/terrain';
import { buildCastle, type CastleBuild } from './Castle';
import { CASTLE, DONE_FLAG, celebrationObjective, lines, stageOf } from './site';
import { CelebrationScene } from './CelebrationScene';
import { Chariot } from './Chariot';
import { Festivities } from './Festivities';

/**
 * Runs the celebration evening: the castle (always standing in the meadow), the chariot that
 * waits beside the travellers until they ride, the party effects, and the cinematic.
 */
export class Celebration {
  readonly castle: CastleBuild;
  readonly festivities: Festivities;
  readonly chariot = new Chariot();
  /** Where the chariot waits (valid while `waiting`). */
  readonly chariotPos = new THREE.Vector3();
  private waiting = false;
  private invited = false;
  /** True while the party's own cake is being cut. */
  private partyCake = false;

  constructor(private g: Game) {
    this.castle = buildCastle(g.world.solid, g.world.glow);
    g.scene.add(this.castle.group);
    g.world.addColliders(this.castle.colliders);
    this.festivities = new Festivities(this.castle.y);
    g.scene.add(this.festivities.group, this.chariot.root);
    this.chariot.root.visible = false;
    if (stageOf(g.st) === 'done') {
      this.festivities.showCrowd();
      this.grantDragon(false);
    }
  }

  get done(): boolean {
    return stageOf(this.g.st) === 'done';
  }

  /** The guide follows this while the evening waits for her. */
  objective(): Objective | null {
    if (!this.g.started || this.g.cutscene || !this.waiting) return null;
    return celebrationObjective(this.g.st, this.chariotPos);
  }

  /** Called when the journey starts (after any opening scene). */
  invite(): void {
    if (this.done || this.invited) return;
    this.invited = true;
    const { girl, boy } = this.g.st.names;
    this.g.toast(`✨ ${boy} has planned a surprise for ${girl} tonight. A unicorn chariot is waiting — follow the golden motes.`, 'story');
  }

  /** The chariot draws up a few steps from wherever they are. */
  private placeChariot(): void {
    const tr = this.g.trav;
    const fwd = new THREE.Vector3(Math.sin(tr.heading), 0, Math.cos(tr.heading));
    const side = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const p = tr.gPos.clone().addScaledVector(fwd, 7).addScaledVector(side, -3);
    p.y = surfaceAt(p.x, p.z, tr.gPos.y + 3);
    this.chariotPos.copy(p);
    this.chariot.root.position.copy(p);
    this.chariot.root.rotation.set(0, tr.heading + Math.PI / 2, 0);
    this.chariot.root.visible = true;
    this.waiting = true;
  }

  update(dt: number, t: number): void {
    const g = this.g;
    if (!g.started) return;
    const running = g.cutscene instanceof CelebrationScene;
    if (!this.done && !running && !g.cutscene && !g.inVan && g.trav.mode === 'walk') {
      if (!this.waiting || this.chariotPos.distanceTo(g.trav.gPos) > 140) this.placeChariot();
    }
    if (this.waiting && !running) this.chariot.update(dt, 0, t, false);

    // The party glows around the castle at night once it has begun (and all through the event).
    const near = Math.hypot(g.trav.gPos.x - CASTLE.venue.x, g.trav.gPos.z - CASTLE.venue.z) < 320;
    const want = running || this.partyCake ? 1 : this.done && near && g.sky.night > 0.3 ? 1 : 0;
    const f = this.festivities;
    f.level += (want - f.level) * Math.min(1, dt * (want ? 1.5 : 0.6));
    f.update(dt, t, g.sky.night, g.trav.gPos);
  }

  /** "Step into the chariot" when close enough. */
  label(p: THREE.Vector3): string | null {
    if (!this.waiting || this.done) return null;
    return this.chariotPos.distanceTo(p) < 5 ? '🦄 Step into the unicorn chariot together' : null;
  }

  /** Start the evening (also used by "Replay the celebration evening"). */
  begin(): void {
    const g = this.g;
    if (g.cutscene || g.inVan) return;
    if (!this.waiting) this.placeChariot();
    g.ui.closePanel();
    if (g.trav.mode !== 'walk') g.chooseVehicle('walk');
    this.waiting = false;
    const scene = new CelebrationScene(g, this);
    g.cutscene = scene;
    scene.onDone = () => {
      g.cutscene = null;
      // The chocolate cake, with everyone watching.
      const L = lines(g.st);
      const cake = new CakeScene(g, { palette: CHOCOLATE, lines: L.cake, flag: 'celebration-cake', joy: L.joy });
      g.cutscene = cake;
      this.partyCake = true;
      cake.onDone = () => {
        g.cutscene = null;
        this.partyCake = false;
        if (!g.st.flags.includes(DONE_FLAG)) g.st.flags.push(DONE_FLAG);
        g.st.light += 1;
        this.grantDragon(true);
        const { girl } = g.st.names;
        g.toast(`🎉 Congratulations, ${girl}! The party goes on all night — wander, dance with the lights, visit the unicorns.`, 'reward');
        g.guide.refresh();
        g.ui.refreshTracker();
        g.save();
      };
    };
  }

  /** After the party, the night dragon will carry them both (two saddles). */
  private grantDragon(announce: boolean): void {
    if (this.g.st.vehicles.includes('dragon')) return;
    this.g.st.vehicles.push('dragon');
    if (announce) this.g.toast('🐉 The night dragon has chosen you both. Two saddles — find it under Travel (V).', 'reward');
  }

  /** Replay from Help: the chariot returns and the evening begins again. */
  replay(): void {
    this.placeChariot();
    this.begin();
  }
}
