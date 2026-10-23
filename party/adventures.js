import * as THREE from 'three';

export const CHASE_GAMES = ['tag', 'hide-and-seek', 'laser-tag'];
export const EXTRA_GAMES = [
  { id: 'tag', title: 'Catch a little starlight', icon: '✺', time: '90 SECONDS', goal: 'Chase the glowing player when you are It. Come within three steps and press E to pass the light. Runners earn a bonus for finishing free.', objective: 'Pass the light, or keep it away.' },
  { id: 'hide-and-seek', title: 'Hush, the meadow is listening', icon: '◈', time: '120 SECONDS', goal: 'Hiders get twenty seconds to find cover. The seeker then looks around the meadow and presses E near a visible hider. Found players watch the rest of the round.', objective: 'Hide among the hedges, or find every hider.' },
  { id: 'laser-tag', title: 'The light-wand arena', icon: '⌖', time: '120 SECONDS', goal: 'Turn the camera to aim. Press E, R, or tap the world to send a light pulse. Cover blocks beams. Three shields recharge after four seconds.', objective: 'Aim your light wand and protect your shields.' },
];

/** Extra scene layers are split so guest-view photos can omit all private effects. */
export class Adventures {
  constructor(scene, layout, scenery) {
    this.scene = scene; this.layout = layout; this.scenery = scenery;
    this.arena = new THREE.Group(); this.trail = new THREE.Group(); this.publicEffects = new THREE.Group(); this.privateEffects = new THREE.Group();
    scene.add(this.arena, this.trail, this.publicEffects, this.privateEffects);
    this.wisps = new Map(); this.beams = []; this.seen = new Set(); this.markers = [];
    const coverMaterial = new THREE.MeshStandardMaterial({ color:'#72608e', roughness:.9, emissive:'#382344', emissiveIntensity:.12 });
    const gold = new THREE.MeshBasicMaterial({ color:'#edcd92' });
    for (const box of layout.ARENA_COVER || []) {
      if (box.existing) continue;
      const w=box.max.x-box.min.x, d=box.max.z-box.min.z, h=box.max.y-box.min.y;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h+.6,d), coverMaterial);
      mesh.position.set((box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2-.3,(box.min.z+box.max.z)/2); mesh.castShadow=mesh.receiveShadow=true;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({color:'#c5a1c7'})); mesh.add(edge); this.arena.add(mesh);
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(.65),gold);crest.position.set(mesh.position.x,box.max.y+.7,mesh.position.z);this.arena.add(crest);
    }
    const boundary = new THREE.Mesh(new THREE.TorusGeometry(layout.PARTY_ARENA?.radius || 50,.1,4,100),gold);
    boundary.rotation.x=Math.PI/2;boundary.position.y=.55;this.arena.add(boundary);
    for (let i=0;i<2;i++) {
      const root = new THREE.Group();
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.9),new THREE.MeshBasicMaterial({color:i?'#d4b6ff':'#ffe0a1'}));
      crystal.position.y=2.3;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35,1.3,10,6,1,true),new THREE.MeshBasicMaterial({color:i?'#d4b6ff':'#ffe0a1',transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=5;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1,.09,4,28),gold);ring.rotation.x=Math.PI/2;ring.position.y=.14;
      root.add(crystal,beam,ring);this.trail.add(root);this.markers.push({root,crystal});
    }
    this.crown = new THREE.InstancedMesh(new THREE.SphereGeometry(.22,6,4),new THREE.MeshBasicMaterial({color:'#fff3b0'}),20);
    this.trail.add(this.crown);const dummy=new THREE.Object3D();
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2;dummy.position.set(Math.cos(a)*8,54+Math.sin(a*3)*.7,-448+Math.sin(a)*8);dummy.scale.setScalar(.45);dummy.updateMatrix();this.crown.setMatrixAt(i,dummy.matrix);}
    this.crown.instanceMatrix.needsUpdate=true;
  }
  update(state, t, dt) {
    this.arena.visible=CHASE_GAMES.includes(state?.party.game);
    const journey=state?.party.journey;
    this.trail.visible=Boolean(journey?.active);
    const quest=journey?.current;
    this.markers.forEach((m,i)=>{
      m.root.visible=Boolean(quest)&&!journey.waiting&&state?.party.phase!=='playing';
      if(!quest)return;const point=i?quest.beacon:quest.collect;
      const ground=this.scenery.ground(point.x,point.z);
      m.root.position.set(point.x,Math.max(point.y,ground),point.z);m.crystal.rotation.y=t*.7;
      m.root.scale.setScalar((i===1)===(journey.stage==='beacon')?1:.6);
    });
    if(journey&&journey.stars!==this.lastStars){this.lastStars=journey.stars;const dummy=new THREE.Object3D();for(let i=0;i<20;i++){const a=i/20*Math.PI*2;dummy.position.set(Math.cos(a)*8,54+Math.sin(a*3)*.7,-448+Math.sin(a)*8);dummy.scale.setScalar(i<journey.stars?1:.22);dummy.updateMatrix();this.crown.setMatrixAt(i,dummy.matrix);}this.crown.instanceMatrix.needsUpdate=true;}
    const matches=[];
    if(state?.party.chase?.practice)matches.push(state.party.chase);
    for(const match of state?.party.privatePractices||[])matches.push(match);
    const visible=new Set();
    for(const match of matches){for(const wisp of match.wisps||[]){visible.add(wisp.id);let model=this.wisps.get(wisp.id);if(!model){model=new THREE.Mesh(new THREE.IcosahedronGeometry(.75,0),new THREE.MeshBasicMaterial({color:'#b2f2ed',transparent:true}));this.privateEffects.add(model);this.wisps.set(wisp.id,model);}model.position.lerp(new THREE.Vector3(wisp.x,wisp.y+1.1+Math.sin(t*2)*.2,wisp.z),1-Math.exp(-dt*18));model.rotation.y=t;model.material.color.set(match.itId===wisp.id?'#ffabd1':'#b2f2ed');model.material.opacity=match.publicStatus?.[wisp.id]?.health===0?.25:1;}}
    for(const[id,mesh]of this.wisps)mesh.visible=visible.has(id);
    const consume=(match,isPrivate)=>{for(const event of match?.events||[]){if(event.type!=='laser'||this.seen.has(event.id)||Date.now()-event.at>1000)continue;this.seen.add(event.id);const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(event.origin.x,event.origin.y,event.origin.z),new THREE.Vector3(event.end.x,event.end.y,event.end.z)]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:event.hit?'#ffb6d8':'#a7e9ff',transparent:true,opacity:.9}));(isPrivate?this.privateEffects:this.publicEffects).add(line);this.beams.push({line,until:t+.3});}};
    consume(state?.party.chase,Boolean(state?.party.chase?.practice));for(const match of state?.party.privatePractices||[])consume(match,true);
    if(this.seen.size>500)this.seen=new Set([...this.seen].slice(-250));
    for(let i=this.beams.length-1;i>=0;i--){const b=this.beams[i];b.line.material.opacity=Math.max(0,(b.until-t)*3);if(t>=b.until){b.line.removeFromParent();b.line.geometry.dispose();b.line.material.dispose();this.beams.splice(i,1);}}
  }
  resolve(p, radius=.5) {
    for(const c of this.layout.ARENA_COVER||[]){if(p.y+.8<c.min.y||p.y+.8>c.max.y)continue;const minX=c.min.x-radius,maxX=c.max.x+radius,minZ=c.min.z-radius,maxZ=c.max.z+radius;if(p.x>minX&&p.x<maxX&&p.z>minZ&&p.z<maxZ){const options=[{d:p.x-minX,x:minX,z:p.z},{d:maxX-p.x,x:maxX,z:p.z},{d:p.z-minZ,x:p.x,z:minZ},{d:maxZ-p.z,x:p.x,z:maxZ}];options.sort((a,b)=>a.d-b.d);p.x=options[0].x;p.z=options[0].z;}}
    const max=(this.layout.PARTY_ARENA?.radius||50)-.6,d=Math.hypot(p.x,p.z);if(d>max){p.x*=max/d;p.z*=max/d;}
  }
  targets(state, selfPosition) {
    const chase=state?.party.chase;if(!chase)return[];
    if(chase.practice)return(chase.wisps||[]).map(w=>({...w,status:chase.publicStatus?.[w.id]}));
    return state.players.filter(p=>p.id!==state.self.id&&p.role!=='companion'&&chase.publicStatus?.[p.id]).map(p=>({...p,status:chase.publicStatus[p.id]}));
  }
  guestPhoto(hidden) { this.privateEffects.visible=!hidden; }
}
