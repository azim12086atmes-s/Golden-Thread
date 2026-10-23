import assert from 'node:assert/strict';
import * as THREE from 'three';
// Geometry/collision inspection needs texture objects, not a GPU or fabricated game screenshot.
const gradient={addColorStop(){}};
globalThis.fetch=async()=>({arrayBuffer:async()=>new Uint16Array(1024*1024).fill(3500).buffer,blob:async()=>({})});
globalThis.createImageBitmap=async()=>({width:1024,height:1024});
const context=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='measureText')return text=>({width:String(text).length*8});if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;if(key==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>{};}});
globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>context})};
const {createPalace}=await import('../../great-palace/js/world/palace.js');
const {COLLIDERS,CASTLE,S,builtHeight}=await import('../../great-palace/js/world/layout.js');
const {spandrelGeometry}=await import('../../great-palace/js/world/palace-entrance.js');
const scene=new THREE.Scene(),castle=createPalace(scene,{key:'low',particles:100,trees:80});
const invalid=[];scene.traverse(o=>{const p=o.geometry?.attributes.position;if(p&&Array.from(p.array).some(v=>!Number.isFinite(v)))invalid.push({name:o.name,count:p.count,type:o.geometry.type});});
assert.equal(invalid.length,0,'Invalid geometry coordinates: '+JSON.stringify(invalid));
const opaque=[];scene.traverse(o=>{if(o.isMesh&&!o.material.transparent)opaque.push(o);});
const ray=new THREE.Raycaster(new THREE.Vector3(0,CASTLE.y+2,235*S),new THREE.Vector3(0,0,-1),0,50*S);
castle.setGate(false,true);castle.update(0,.016,{position:new THREE.Vector3(0,CASTLE.y+3,235*S)});scene.updateMatrixWorld(true);
const closed=ray.intersectObjects(opaque,false);
assert(closed.some(h=>h.object.name.startsWith('palace-gate-leaf')),'Closed leaves must visibly occupy the doorway');
castle.setGate(true,true);castle.update(1,.016,{position:new THREE.Vector3(0,CASTLE.y+3,235*S)});scene.updateMatrixWorld(true);
const open=ray.intersectObjects(opaque,false);
assert.equal(open.length,0,'An opaque surface still crosses the open route: '+open.map(h=>h.object.name).join(','));
let tested=0;
for(let z=230*S;z>=180*S;z-=2){
 assert(Math.abs(builtHeight(0,z,CASTLE.y+.1)-CASTLE.y)<.001,'Unsupported or raised gate floor at '+z);
 const blockers=COLLIDERS.filter(c=>{
   if(c.y0!==undefined&&CASTLE.y+.1<c.y0)return false;
   if(c.y1!==undefined&&CASTLE.y+.1>c.y1)return false;
   if(c.r!==undefined)return Math.hypot(c.x,c.z-z)<c.r+.35;
   return 0>c.minX-.35&&0<c.maxX+.35&&z>c.minZ-.35&&z<c.maxZ+.35;
 });
 assert.equal(blockers.length,0,'A collider obstructs the open gate centreline at '+z);tested++;
}
const relief=new THREE.Mesh(spandrelGeometry(48.6,74,82.4,39,74),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));relief.updateMatrixWorld(true);
ray.set(new THREE.Vector3(0,70,2),new THREE.Vector3(0,0,-1));ray.far=4;
assert.equal(ray.intersectObject(relief,false).length,0,'Spandrel relief crosses the glass at the arch apex');
console.log(JSON.stringify({closedGateHits:closed.length,openGateHits:open.length,clearRouteSamples:tested,windowReliefClear:true,gateOpening:castle.gateOpening()}));
