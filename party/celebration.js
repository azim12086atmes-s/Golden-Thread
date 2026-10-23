import * as THREE from 'three';
import { Festivities } from '../src/event/Festivities';
import { CAKE_SPOT } from '../shared/party-layout.js';

/** Original Golden Thread festivities, placed in the Great Palace's crown garden. */
export class PartyCelebration {
  constructor(game) {
    this.game=game;
    this.effects=new Festivities(0);
    this.effects.group.name='golden-thread-birthday-festivities';
    this.offset=new THREE.Vector3(CAKE_SPOT.x-this.effects.centre.x,CAKE_SPOT.y,CAKE_SPOT.z-this.effects.centre.z);
    this.centre=new THREE.Vector3(CAKE_SPOT.x,CAKE_SPOT.y,CAKE_SPOT.z);
    this.effects.group.position.copy(this.offset);
    this.focus=new THREE.Vector3();
    this.crowdReady=false;
    game.scene.add(this.effects.group);
  }
  update(dt,t,night,party) {
    const festival=party?.festival;
    const active=party?.phase==='celebration';
    const near=this.game.pos.distanceTo(this.centre)<550;
    const target=active&&near?1:0;
    this.effects.level+=(target-this.effects.level)*Math.min(1,dt*1.5);
    if(target&&!this.crowdReady){this.effects.showCrowd();this.crowdReady=true;}
    this.focus.copy(this.game.pos).sub(this.offset);
    this.effects.update(dt,t,night,this.focus);
    this.game.scenery.updateFestival(festival,dt,t);
    // The original event earns the dragon after the celebration, with no purchase shortcut.
    if(festival?.afterparty&&this.game.self.role!=='observer'){
      const st=this.game.life.st;
      if(!st.flags.includes('celebration-done')){
        st.flags.push('celebration-done');st.light+=1;
        if(!st.vehicles.includes('dragon'))st.vehicles.push('dragon');
        this.game.life.save();
      }
    }
  }
  destroy(){this.game.scene.remove(this.effects.group);}
}
