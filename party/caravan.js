import * as THREE from 'three';
import { AnimalModel } from '../src/animals/AnimalModel';
import { CharacterModel } from '../src/characters/CharacterModel';
import { wardrobeFor } from '../src/npc/Townsfolk';
import { COMPANION_BY_ID, caravanStep } from '../src/caravan/caravan';

/** Private local caravan rendering. It follows only this client's public position. */
export class PartyCaravan {
  constructor(scene, world, scenery, state) {
    this.scene = scene;
    this.world = world;
    this.scenery = scenery;
    this.state = state;
    this.bodies = new Map();
    this.sync();
  }

  sync() {
    const wanted = new Set(this.state.caravan.filter(id => COMPANION_BY_ID[id]));
    for (const [id, body] of this.bodies) if (!wanted.has(id)) {
      this.scene.remove(body.root);
      this.bodies.delete(id);
    }
    for (const id of wanted) {
      if (this.bodies.has(id)) continue;
      const def = COMPANION_BY_ID[id];
      let model;
      if (def.kind === 'child') {
        const outfits = wardrobeFor(def.origin, def.who);
        model = new CharacterModel(outfits[(def.name.length * 7) % outfits.length], '#c99a74', 0.62);
      } else model = new AnimalModel(def.species, def.scale);
      const root = model.root;
      root.visible = false;
      this.scene.add(root);
      this.bodies.set(id, { def, model, root, member: { id, kind: def.kind, x: 0, z: 0, speed: 0 } });
    }
  }

  update(dt, t, game) {
    this.sync();
    const p = game.pos;
    const heading = game.yaw || 0;
    const visible = !game.interior && (game.vehicle === 'walk' || game.vehicle === 'fly');
    const members = [...this.bodies.values()];
    if (!visible) {
      for (const b of members) b.root.visible = false;
      return;
    }
    // The sibling traveller is derived from the public local avatar, never an invitee/observer
    // coordinate or a hidden player's state.
    const boy = { x: p.x + Math.cos(heading) * 1.95, z: p.z - Math.sin(heading) * 1.95 };
    const next = caravanStep(members.map(b => b.member), { x: p.x, z: p.z }, boy, heading, Math.min(8, game.controller?.currentSpeed || 0), dt);
    members.forEach((b, i) => {
      b.member = next[i];
      const { x, z } = b.member;
      const y = this.scenery.ground(x, z, p.y + 3);
      const flying = game.vehicle === 'fly' && p.y > this.scenery.ground(p.x, p.z, p.y + 3) + 1.2;
      b.root.visible = true;
      b.root.position.set(x, flying ? Math.max(y, p.y - 1.1 - (i % 3) * 0.35) : y, z);
      b.root.rotation.y = heading;
      if (b.def.kind === 'child') b.model.update(dt, { speed: b.member.speed, airborne: flying, riding: false, t: t + i });
      else b.model.update(dt, flying ? 6 : b.member.speed, t + i);
    });
  }

  chat(id) {
    const def = COMPANION_BY_ID[id];
    if (!def || !this.bodies.has(id)) return '';
    return def.kind === 'pet' ? `${def.name} · ${def.blurb}` : `${def.name} · ${def.blurb} Travelling to ${def.destination}.`;
  }

  destroy() {
    for (const b of this.bodies.values()) this.scene.remove(b.root);
    this.bodies.clear();
  }
}
