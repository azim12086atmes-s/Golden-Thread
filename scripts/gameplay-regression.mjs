/** Offline, portable gameplay regression over the checked-in compiled build.
 * Run `node scripts/gameplay-regression.mjs` after `npm run party:build`.
 * This intentionally exercises original pure systems without Vitest or a browser.
 */
import assert from 'node:assert/strict';
import { newGame } from '../dist/src/core/state.js';
import { EventBus } from '../dist/src/core/events.js';
import { saveGame, loadGame } from '../dist/src/core/save.js';
import { addItem, craft, count, sellPrice, teach } from '../dist/src/economy/economy.js';
import { ITEMS, RECIPES, skillLevel } from '../dist/src/economy/items.js';
import { Housing, PLOTS, PLOT_SIZE, DECOR_BY_ID } from '../dist/src/housing/housing.js';
import { SPECIES } from '../dist/src/animals/AnimalModel.js';
import { PEOPLE_BY_ID } from '../dist/src/npc/people.js';
import { QUESTS } from '../dist/src/quests/quests.js';
import { QuestSystem } from '../dist/src/quests/QuestSystem.js';
import { Messages } from '../dist/src/social/Messages.js';
import { REGION_BY_ID } from '../dist/src/world/regions.js';
import { OUTFITS, DESIGN_REFERENCES } from '../dist/src/characters/outfits.js';
import { isModest } from '../dist/src/characters/modesty.js';
import { fusionOutfits } from '../dist/src/fusion/fusion.js';
import { MIN_GAP, IDEAL_GAP, followStep } from '../dist/src/characters/follow.js';
import { Rng } from '../dist/src/core/rng.js';
import { CHILDREN, COMPANIONS, MAX_CHILDREN, MAX_PETS, PETS, MEMBER_CLEARANCE, TRAVELLER_CLEARANCE, canJoin, caravanStep } from '../dist/src/caravan/caravan.js';

let checks = 0;
function check(label, fn) {
  fn(); checks++; console.log(`PASS ${label}`);
}
const memoryStore = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
};
function makeable(item, mats, skill, maxLevel, depth = 0) {
  if (mats.has(item)) return true;
  if (depth > 4) return false;
  return RECIPES.some((r) => r.out === item && r.level <= (r.skill === skill ? maxLevel : 0)
    && Object.keys(r.needs).every((k) => makeable(k, mats, skill, maxLevel, depth + 1)));
}

check('economy recipes, skill gates, and distance-based market pricing', () => {
  const st = newGame(); st.inventory = { wool: 2 };
  assert.equal(craft(st, 'scarf').ok, true); assert.equal(count(st, 'scarf'), 1);
  assert.equal(count(st, 'wool'), 0); assert.ok(st.skills.weaving > 0);
  const gated = newGame(); gated.inventory = { silk: 3, spool: 1 };
  assert.deepEqual(craft(gated, 'shawl'), { ok: false, reason: 'skill' });
  assert.ok(sellPrice('tea', 'london') > sellPrice('tea', 'japan'));
  assert.equal(sellPrice('minttea', 'aurora', ['minttea']), 2 * sellPrice('minttea', 'aurora'));
  for (const r of RECIPES) { assert.ok(ITEMS[r.out], r.id); for (const k of Object.keys(r.needs)) assert.ok(ITEMS[k], `${r.id} needs ${k}`); }
});

check('all 19 local land chapters are craftable from their own land materials and Keeper skill', () => {
  const local = QUESTS.filter((q) => q.main && q.region !== 'skyisles');
  assert.equal(local.length, 19);
  for (const q of local) {
    const region = REGION_BY_ID[q.region], delivery = q.steps.find((s) => s.kind === 'deliver');
    assert.ok(region && delivery && 'item' in delivery, q.id);
    assert.ok(makeable(delivery.item, new Set(region.materials), region.skill, 1), `${q.id}: ${delivery.item}`);
  }
});

check('meadow chapter completes through original talk, craft, delivery, and lantern reward flow', () => {
  const st = newGame(), qs = new QuestSystem(st, new EventBus());
  assert.ok(qs.offeredBy('noor').some((q) => q.id === 'main-meadow'));
  assert.equal(qs.start('main-meadow'), true); assert.equal(qs.step('main-meadow')?.kind, 'deliver');
  teach(st, 'weaving'); addItem(st, 'wool', 2); assert.equal(craft(st, 'scarf').ok, true);
  assert.deepEqual(qs.deliverable('noor').map((q) => q.id), ['main-meadow']);
  const coins = st.coins; assert.equal(qs.deliver('main-meadow'), true);
  assert.equal(qs.lanternReady('meadow')?.id, 'main-meadow'); assert.equal(qs.lightLantern('meadow'), true);
  assert.equal(qs.status('main-meadow'), 'done'); assert.ok(st.lanterns.includes('meadow'));
  assert.equal(st.coins, coins + 40); assert.equal(st.light, 2); assert.equal(st.friends.noor.befriended, true);
});

check('finale gate and earned vehicle quest retain original prerequisites', () => {
  const st = newGame(), qs = new QuestSystem(st, new EventBus());
  assert.deepEqual(qs.offeredBy('lamplighter'), []);
  st.lanterns = ['a','b','c','d','e','f','g','h'];
  assert.ok(qs.offeredBy('lamplighter').some((q) => q.id === 'main-skyisles'));
  assert.ok(!st.vehicles.includes('truck')); qs.start('side-marcus'); addItem(st, 'gearkit', 1);
  assert.equal(qs.deliver('side-marcus'), true); assert.ok(st.vehicles.includes('truck'));
});

check('housing, land-style unlocks, farming, adoption, feed and daily animal production', () => {
  const st = newGame(); st.coins = 1000; const h = new Housing(st, new EventBus());
  assert.equal(h.buy('meadow-a'), 'ok'); assert.equal(h.buy('meadow-a'), 'owned');
  const plot = PLOTS.find((p) => p.id === 'meadow-a'); assert.equal(st.coins, 1000 - plot.price);
  assert.ok(h.place('meadow-a', 'bench', 0, 0, 0)); assert.equal(h.canPlace('meadow-a','bench',.5,0), 'overlap');
  assert.equal(h.canPlace('meadow-a','bench',PLOT_SIZE/2,0), 'bounds'); assert.equal(h.canPlace('meadow-a','house-japan',8,8), 'locked');
  st.lanterns.push('japan'); assert.equal(h.canPlace('meadow-a','house-japan',7,7), 'ok');
  const before = st.coins, decor = h.place('meadow-a','cottage',5,5,0); assert.ok(decor);
  h.remove('meadow-a',decor.id); assert.equal(st.coins,before-DECOR_BY_ID.cottage.price+Math.floor(DECOR_BY_ID.cottage.price/2));
  const bed = h.place('meadow-a','farmbed',0,5,0); assert.ok(bed); addItem(st,'seed_rice',1);
  assert.equal(h.plant('meadow-a',bed.id,'seed_rice'),true); assert.equal(h.harvest('meadow-a',bed.id),null);
  st.minutes += 1440; assert.equal(h.harvest('meadow-a',bed.id),'rice'); assert.equal(h.harvest('meadow-a',bed.id),null);
  addItem(st,'wildflower',3); assert.equal(h.befriendAnimal('sheep-1','sheep','Cloud'),'ok'); assert.equal(h.adopt('sheep-1','meadow-a'),true);
  assert.equal(h.collect('sheep-1'),'wool'); assert.equal(h.collect('sheep-1'),null); st.minutes += 4320;
  assert.equal(h.collect('sheep-1'),null); h.feed('sheep-1'); assert.ok(h.happiness('sheep-1') >= 30);
});

check('social messages generate requests that consume goods for the stated reward; gifts affect friendship', () => {
  const st = newGame(), bus = new EventBus(), received = [];
  bus.on('message:received', (m) => received.push(m.text));
  st.friends.haruka = { hearts: 2, befriended: true, lastMessageAt: st.minutes };
  const messages = new Messages(st,bus);
  for(let i=0;i<200;i++){st.minutes+=60;messages.tick();}
  assert.ok(received.length > 5); const req = st.messages.find((m) => m.request);
  assert.ok(req?.request); addItem(st,req.request.item,req.request.qty); const coins=st.coins;
  assert.equal(messages.fulfil(req.id),true); assert.equal(st.coins,coins+req.request.reward);
  const giftState = newGame(), gifts = new Messages(giftState,new EventBus()); addItem(giftState,'curry',1);
  assert.equal(gifts.gift('haruka','curry'),true); assert.equal(giftState.friends.haruka.hearts,2);
});

check('local save/load preserves economy and progress and rejects corrupt data', () => {
  const st=newGame(); st.coins=777; st.inventory.silk=4; st.lanterns.push('meadow');
  const store=memoryStore(); assert.equal(saveGame(st,store),true); assert.deepEqual(loadGame(store),st);
});

check('base and fusion wardrobe outfits all satisfy coverage invariants (175 total)', () => {
  const outfits = [...Object.values(OUTFITS), ...Object.values(fusionOutfits(24))];
  assert.equal(Object.keys(OUTFITS).length,127); assert.equal(outfits.length,175);
  assert.equal(DESIGN_REFERENCES.length,127);
  for (const outfit of outfits) assert.ok(isModest(outfit), outfit.id);
});

check('companion follow keeps the minimum gap through long randomized walking and teleports', () => {
  const rng=new Rng(42), d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z), ground=(x,z)=>Math.sin(x*.1)*2+Math.cos(z*.07)*3;
  let girl={x:0,y:0,z:0}, boy={x:3,y:0,z:0}, heading=0,speed=0,airborne=false;
  for(let i=0;i<20000;i++){
    const dt=rng.range(.004,.05); if(rng.chance(.02))heading+=rng.range(-Math.PI,Math.PI);
    if(rng.chance(.01))speed=rng.pick([0,0,6.5,12,20,36]); if(rng.chance(.004))airborne=!airborne;
    if(rng.chance(.05))heading=Math.atan2(boy.x-girl.x,boy.z-girl.z);
    girl={x:girl.x+Math.sin(heading)*speed*dt,y:airborne?girl.y+rng.range(-1,1):ground(girl.x,girl.z),z:girl.z+Math.cos(heading)*speed*dt};
    if(rng.chance(.001))girl={x:girl.x+500,y:girl.y,z:girl.z};
    boy=followStep({boy,girl,heading,speed,dt,airborne,groundAt:ground}).pos;
    assert.ok(d(boy,girl)>=MIN_GAP-1e-9,`gap at step ${i}`);
  }
  let still={x:20,y:0,z:5}; const target={x:0,y:0,z:0};
  for(let i=0;i<600;i++) still=followStep({boy:still,girl:target,heading:0,speed:0,dt:1/60,airborne:false}).pos;
  assert.ok(Math.abs(d(still,target)-IDEAL_GAP)<.05);
});

check('caravan members retain traveller clearance and original join prerequisites', () => {
  const rng=new Rng(7), d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z); let girl={x:0,z:0}, heading=0;
  let members=[{id:'a',kind:'child',x:-1,z:-3,speed:0},{id:'b',kind:'child',x:1,z:-3,speed:0},
    {id:'c',kind:'pet',x:0,z:-5,speed:0},{id:'d',kind:'pet',x:2,z:-5,speed:0},{id:'e',kind:'pet',x:-2,z:-5,speed:0}];
  for(let i=0;i<5000;i++){
    if(rng.chance(.02))heading+=rng.range(-2,2); const speed=rng.pick([0,0,6.5,11,20]);
    girl={x:girl.x+Math.sin(heading)*speed/60,z:girl.z+Math.cos(heading)*speed/60};
    const boy={x:girl.x+Math.cos(heading)*2.4,z:girl.z-Math.sin(heading)*2.4};
    members=caravanStep(members,girl,boy,heading,speed,1/60);
    for(const m of members){assert.ok(d(m,girl)>=TRAVELLER_CLEARANCE-1e-9);assert.ok(d(m,boy)>=TRAVELLER_CLEARANCE-1e-9);}
  }
  for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)assert.ok(d(members[i],members[j])>MEMBER_CLEARANCE*.5);
  const [child1,child2,child3]=CHILDREN; assert.equal(canJoin(child1,[],[],[]).ok,false);
  assert.equal(canJoin(child1,[],[child1.joinsAfter],[]).ok,true);
  assert.equal(canJoin(child3,[child1,child2],[child3.joinsAfter],[]).ok,false);
  assert.equal(MAX_CHILDREN,2); assert.equal(MAX_PETS,3); assert.ok(COMPANIONS.length>=10);
  const [p1,p2,p3,p4]=PETS; assert.equal(canJoin(p1,[],[],[]).ok,false); assert.equal(canJoin(p1,[],[],[p1.id]).ok,true);
  assert.equal(canJoin(p4,[p1,p2,p3],[],[p4.id]).ok,false); assert.equal(canJoin(p1,[p1],[],[p1.id]).ok,false);
});

console.log(`\n${checks} original-system regression groups passed.`);
