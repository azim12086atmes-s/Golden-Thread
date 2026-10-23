// The original Golden Thread regions are unchanged. The palace keeps the donor's
// physical dimensions; only this translation places it beyond the twenty lands.
export const PALACE_TRANSFORM=Object.freeze({scale:1,offset:Object.freeze({x:0,y:-600,z:-8000}),sourceScale:2.75});
export const SKY_BRIDGE=Object.freeze({x:-355,y:88,z:-1580,halfLength:4019.7,halfWidth:11,angle:-1.65931});
const bridgePoint=u=>Object.freeze({x:SKY_BRIDGE.x+Math.cos(SKY_BRIDGE.angle)*u,y:SKY_BRIDGE.y,z:SKY_BRIDGE.z-Math.sin(SKY_BRIDGE.angle)*u});
export const BRIDGE_START=bridgePoint(1100);
export const BRIDGE_CHECKPOINTS=Object.freeze([1000,850,700,550,400].map(bridgePoint));
export const CAKE_SPOT=Object.freeze({x:-192.5,y:792,z:-8412.5});
export const SKY_RINGS=Object.freeze([[-80,18,40],[-40,28,-40],[40,38,-110],[65,48,-240],[0,54,-430]].map(([x,y,z])=>Object.freeze({x,y,z})));
export const INGREDIENTS=Object.freeze([-30,30,0].map((dx,i)=>Object.freeze({x:CAKE_SPOT.x+dx,y:CAKE_SPOT.y,z:CAKE_SPOT.z+(i===2?32:0)})));
export const PALACE_DESTINATIONS=Object.freeze([
 Object.freeze({id:'golden-landing',name:'Golden Thread Skybridge',...BRIDGE_START}),
 Object.freeze({id:'bridge-south',name:'Southern Bridge Lookout',...bridgePoint(3700)}),
 Object.freeze({id:'lower-terrace',name:'Lower Palace Gardens',x:0,y:87.5,z:-5700}),
 Object.freeze({id:'upper-terrace',name:'Rose Terraces',x:-412.5,y:197.5,z:-6611.25}),
 Object.freeze({id:'palace-gate',name:'Rose Gate',x:0,y:340.5,z:-7405}),
 Object.freeze({id:'palace',name:'Crown Garden',...CAKE_SPOT}),
]);
