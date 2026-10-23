import * as THREE from 'three';
import { surfaceAt } from '../src/world/terrain';
import { createPalaceWorld } from './palace-world.js';
import { makeBirthdayDecor } from './birthday-decor.js';
import { CAKE_SPOT, PALACE_DESTINATIONS } from '../shared/party-layout.js';

/** Additive venue only. Golden Thread owns its complete terrain, plants, towns and sky. */
export class PartyScenery {
  constructor(scene,quality='high') {
    this.venue=createPalaceWorld(scene,{key:quality,particles:quality==='low'?160:400,trees:quality==='low'?80:200},{onReady:()=>this.addEntranceLift(scene)});
    this.decor=makeBirthdayDecor(scene,CAKE_SPOT);
    this.cake=this.decor.cake;
    this.destinations=PALACE_DESTINATIONS;
    this.lifts=[];
    for(const stop of [PALACE_DESTINATIONS[0],PALACE_DESTINATIONS[1]]) {
      const y=surfaceAt(stop.x,stop.z);
      const root=new THREE.Group(); root.position.set(stop.x,y,stop.z);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(4,4.5,.3,24),new THREE.MeshStandardMaterial({color:'#e7d9be',roughness:.85}));disc.position.y=.15;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.07,4,40),new THREE.MeshBasicMaterial({color:'#f5c451'}));ring.rotation.x=-Math.PI/2;ring.position.y=.35;
      root.add(disc,ring);scene.add(root);this.lifts.push({x:stop.x,y,z:stop.z,to:stop});
    }
  }
  addEntranceLift(scene) {
    const at={x:0,y:340.5,z:-7496.75};
    this.lifts.push({...at,to:{...CAKE_SPOT,z:CAKE_SPOT.z+14,name:'Crown Garden'}});
    const gate=new THREE.Group();gate.position.set(at.x,at.y,at.z);
    const stone=new THREE.MeshStandardMaterial({color:'#e7d9be',roughness:.85});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.18,6,40,Math.PI),stone);
    ring.position.y=2;gate.add(ring);
    for(const side of [-1,1]){const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,2,8),stone);pillar.position.set(side*2.4,1,0);gate.add(pillar);}
    const light=new THREE.Mesh(new THREE.CircleGeometry(2.15,40),new THREE.MeshBasicMaterial({color:'#f5c451',transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));light.position.y=2.15;gate.add(light);
    scene.add(gate);
  }
  ground(x,z,fromY=Infinity) { return surfaceAt(x,z,fromY); }
  resolve(p,r) { this.venue.resolve(p,r); }
  update(t,dt,celebrating,camera,night,focus,light=false) {this.venue.update(t,dt,camera,night,light);this.decor.update(t,dt,celebrating,night);}
  updateFestival(festival,dt,t) {this.decor.updateFestival(festival,dt,t);}
  setCelebrationName(name) {this.decor.setCelebrationName(name);}
  releaseLantern(x,z) {this.decor.releaseLantern(x,z);}
  destroy() {this.decor.dispose();this.venue.group.removeFromParent();}
}
