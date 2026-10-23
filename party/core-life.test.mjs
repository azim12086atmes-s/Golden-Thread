import test from 'node:test';
import assert from 'node:assert/strict';
import { CoreLife } from './core-life.js';

test('story changes save after the event settles and page hiding flushes the latest progress', async () => {
  const win=new EventTarget(),doc=new EventTarget(),handlers=new Map(),saved=[];
  globalThis.addEventListener=win.addEventListener.bind(win);globalThis.removeEventListener=win.removeEventListener.bind(win);
  globalThis.document=doc;doc.getElementById=()=>null;doc.hidden=false;
  const st={chapter:1,flags:[]};
  const core={st,save:()=>saved.push(JSON.parse(JSON.stringify(st))),bus:{on(name,callback){handlers.set(name,callback);return()=>handlers.delete(name);}}};
  const life=new CoreLife({core},()=>{});
  try{
    handlers.get('quest:progress')();st.chapter=2;st.flags.push('lantern-lit');
    await Promise.resolve();assert.deepEqual(saved.at(-1),st);
    st.chapter=3;win.dispatchEvent(new Event('pagehide'));assert.equal(saved.at(-1).chapter,3);
    st.chapter=4;doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(saved.at(-1).chapter,4);
  }finally{life.destroy();}
  assert.equal(handlers.size,0);
});
