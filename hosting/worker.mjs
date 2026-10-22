// The build prepends the tested game engine and the compiled, public asset map.
import { createHmac } from 'node:crypto';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const ROOM_KEY = 'birthday';
const RPC_PATHS = new Set(['/api/move','/api/action','/api/signal','/api/state']);
export function voiceRelay(secret, now = Date.now()) {
  if(!secret)return [];
  const username=`${Math.floor(now/1000)+86400}:starlight`;
  return [{urls:['turn:staticauth.openrelay.metered.ca:80?transport=udp','turn:staticauth.openrelay.metered.ca:443?transport=tcp','turns:staticauth.openrelay.metered.ca:443?transport=tcp'],username,credential:createHmac('sha1',secret).update(username).digest('base64')}];
}

class Message {
  constructor(method, url, ticket) { this.method=method; this.url=url; this.headers=ticket?{authorization:`Bearer ${ticket}`}:{ }; this.callbacks=new Map(); }
  on(name, callback) { const list=this.callbacks.get(name)||[];list.push(callback);this.callbacks.set(name,list);return this; }
  emit(name, value) { for(const fn of this.callbacks.get(name)||[])fn(value); }
  destroy() {}
}

export async function engineRequest(engine, method, path, ticket, data) {
  const req=new Message(method,path,ticket);
  const res={status:200,headers:{},headersSent:false,writableEnded:false,destroyed:false,body:'',
    setHeader(key,value){this.headers[key]=value;},
    writeHead(status,headers={}){this.status=status;this.headersSent=true;Object.assign(this.headers,headers);},
    end(body=''){this.body=body;this.writableEnded=true;},destroy(){this.destroyed=true;},
  };
  const running=engine.handler(req,res);
  if(method==='POST'){req.emit('data',JSON.stringify(data??{}));req.emit('end');}
  await running;
  let body;try{body=JSON.parse(String(res.body||'{}'));}catch{body={error:'The room could not complete that request.'};}
  return {status:res.status,data:body};
}

/** One coordinator per isolate; D1 compare-and-swap merges batches across isolates. */
export class RoomCoordinator {
  constructor(env) {
    this.env=env;this.jobs=[];this.peers=new Map();this.busy=false;this.timer=null;this.lastCycleAt=0;this.clock=Date.now();this.version=-1;
    this.engine=createPartyServer({config:JSON.parse(env.PARTY_CONFIG_JSON),autoTick:false,distDir:'/dist',now:()=>this.clock,serverFactory:()=>({on(){}})}).partyInternals;
  }
  async enqueue(method,path,ticket,data,kind='rpc') {
    if(this.jobs.length>=2048)return Promise.resolve({status:429,data:{error:'The party is catching up. Try again in a moment.'}});
    const job={method,path,ticket,data,kind,at:Date.now(),done:false,reply:null,resolve(reply){this.reply=reply;this.done=true;}};
    this.jobs.push(job);
    // Each request drives its own pending work. Timers from completed fetches
    // cannot keep a Cloudflare isolate alive for a later request.
    while(!job.done){
      await wait(Math.max(10,Math.min(200,200-(Date.now()-this.lastCycleAt))));
      if(!this.busy)await this.cycle();
    }
    return job.reply;
  }
  async load() {
    let row=await this.env.DB.prepare('SELECT version, snapshot, clock FROM party_room WHERE id = ?').bind(ROOM_KEY).first();
    if(!row){await this.env.DB.prepare('INSERT OR IGNORE INTO party_room (id, version, snapshot, clock) VALUES (?, 0, ?, ?)').bind(ROOM_KEY,JSON.stringify(this.engine.exportSnapshot()),Date.now()).run();row=await this.env.DB.prepare('SELECT version, snapshot, clock FROM party_room WHERE id = ?').bind(ROOM_KEY).first();}
    if(!row)throw new Error('The shared room is not ready.');
    this.clock=Math.max(Date.now(),row.clock||0);this.engine.restoreSnapshot(JSON.parse(row.snapshot));this.version=row.version;
    return row;
  }
  session(ticket) { return [...this.engine.sessionsBySlot.values()].find(s=>s.ticket===ticket&&s.expiresAt>this.clock); }
  async cycle() {
    if(this.busy)return;this.busy=true;this.lastCycleAt=Date.now();
    const jobs=this.jobs.splice(0);let committed=false;
    try {
      for(let attempt=0;attempt<40;attempt++) {
        const row=await this.load(),results=[];
        this.engine.tickRoom();
        for(const job of jobs){
          this.clock=Math.max(this.clock,job.at);
          if(job.kind==='ack'){const session=this.session(job.ticket);if(session)this.engine.ackSignals(session.slot.id,job.data.ids);results.push({status:200,data:{ok:true}});}
          else results.push(await engineRequest(this.engine,job.method,job.path,job.ticket,job.data));
        }
        this.clock=Math.max(this.clock,Date.now());this.engine.tickRoom();
        if(jobs.every(job=>job.method==='GET'&&job.kind!=='heartbeat')){
          committed=true;for(let i=0;i<jobs.length;i++)jobs[i].resolve(results[i]);break;
        }
        for(const peer of this.peers.values()){const session=this.session(peer.ticket);if(session){session.lastSeen=this.clock;session.expiresAt=this.clock+30*60*1000;}}
        const snapshot=JSON.stringify(this.engine.exportSnapshot());
        const result=await this.env.DB.prepare('UPDATE party_room SET version = version + 1, snapshot = ?, clock = ? WHERE id = ? AND version = ?').bind(snapshot,this.clock,ROOM_KEY,row.version).run();
        if(result.meta?.changes!==1){await wait(15+Math.random()*65);continue;}
        committed=true;this.version=row.version+1;
        for(let i=0;i<jobs.length;i++){
          const job=jobs[i],reply=results[i];
          if(job.path==='/api/photo'&&reply.status===201){
            try{await this.persistPhoto(this.engine.takePhoto(reply.data.id));}
            catch{reply.status=503;reply.data={error:'The album could not save that photo. You can save it to your device and try again.'};}
          }
          job.resolve(reply);
        }
        break;
      }
      if(!committed)for(const job of jobs)job.resolve({status:503,data:{error:'The room is catching up. Please try that once more.'}});
    }catch(error){
      console.error('Room storage unavailable:',String(error?.message||'unknown error').slice(0,150));
      for(const job of jobs)job.resolve({status:503,data:{error:'The party is reconnecting. Please try again shortly.'}});
    }finally{
      this.busy=false;
    }
  }
  async connect(request,ticket) {
    const auth=await this.enqueue('GET',`/api/state?ticket=${encodeURIComponent(ticket)}`,ticket);
    if(auth.status!==200)return json(auth.data,auth.status);
    const pair=new WebSocketPair(),client=pair[0],socket=pair[1];socket.accept();
    this.peers.set(socket,{ticket});
    socket.send(JSON.stringify({kind:'state',state:auth.data}));
    let windowStart=Date.now(),count=0,pending=0,lastHeartbeat=0;
    socket.addEventListener('message',event=>{
      if(typeof event.data!=='string'||event.data.length>40000){socket.close(1009,'Message too large.');return;}
      if(Date.now()-windowStart>=1000){windowStart=Date.now();count=0;}
      if(++count>150||pending>=128)return;
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.kind==='poll'){
        if(pending>=2)return;pending++;
        const heartbeat=Date.now()-lastHeartbeat>60000;if(heartbeat)lastHeartbeat=Date.now();
        this.enqueue('GET',`/api/state?ticket=${encodeURIComponent(ticket)}`,ticket,undefined,heartbeat?'heartbeat':'rpc').then(reply=>{
          try{if(reply.status===200)socket.send(JSON.stringify({kind:'state',state:reply.data}));else socket.close(4001,'This invitation was reopened.');}catch{}
        }).finally(()=>{pending--;});return;
      }
      if(msg.kind==='ack'&&Array.isArray(msg.ids)){this.enqueue('POST','',ticket,{ids:msg.ids.slice(0,256)},'ack').catch(()=>{});return;}
      if(msg.kind!=='rpc'||!Number.isSafeInteger(msg.id)||!RPC_PATHS.has(msg.path))return;
      pending++;
      const path=msg.path==='/api/state'?`/api/state?ticket=${encodeURIComponent(ticket)}`:msg.path;
      this.enqueue(msg.path==='/api/state'?'GET':'POST',path,ticket,msg.data).then(reply=>{
        try{socket.send(JSON.stringify({kind:'reply',id:msg.id,...reply}));}catch{}
      }).finally(()=>{pending--;});
    });
    const close=()=>{this.peers.delete(socket);};socket.addEventListener('close',close);socket.addEventListener('error',close);
    return new Response(null,{status:101,webSocket:client});
  }
  async persistPhoto(photo) {
    if(!photo)throw new Error('Missing photo.');
    const publicKey=`photos/${photo.id}/public.jpg`,privateKey=photo.privateImage?`photos/${photo.id}/private.jpg`:null;
    await this.env.BUCKET.put(publicKey,photo.publicImage,{httpMetadata:{contentType:'image/jpeg'}});
    if(privateKey)await this.env.BUCKET.put(privateKey,photo.privateImage,{httpMetadata:{contentType:'image/jpeg'}});
    await this.env.DB.prepare('INSERT INTO party_photos (id, caption, created_at, public_key, private_key) VALUES (?, ?, ?, ?, ?)').bind(photo.id,photo.caption,photo.createdAt,publicKey,privateKey).run();
    const old=await this.env.DB.prepare('SELECT id, public_key, private_key FROM party_photos ORDER BY created_at DESC LIMIT 100 OFFSET 28').all();
    for(const item of old.results||[]){await this.env.DB.prepare('DELETE FROM party_photos WHERE id = ?').bind(item.id).run();await this.env.BUCKET.delete(item.private_key?[item.public_key,item.private_key]:item.public_key);}
  }
  async photo(request,url,ticket) {
    const auth=await this.enqueue('GET',`/api/state?ticket=${encodeURIComponent(ticket)}`,ticket);
    if(auth.status!==200)return json(auth.data,auth.status);
    if(url.pathname==='/api/photos'){
      const list=await this.env.DB.prepare('SELECT id, caption, created_at FROM party_photos ORDER BY created_at').all();
      return json({photos:(list.results||[]).map(p=>({id:p.id,caption:p.caption,createdAt:p.created_at}))});
    }
    const id=url.pathname.slice('/api/photo/'.length);
    if(!/^[a-zA-Z0-9-]{1,60}$/.test(id))return json({error:'Photo not found.'},404);
    const row=await this.env.DB.prepare('SELECT public_key, private_key FROM party_photos WHERE id = ?').bind(id).first();
    if(!row)return json({error:'Photo not found.'},404);
    const key=auth.data.self.role==='birthday'&&row.private_key?row.private_key:row.public_key;
    const object=await this.env.BUCKET.get(key);if(!object)return json({error:'Photo not found.'},404);
    return new Response(object.body,{headers:{'content-type':'image/jpeg','cache-control':'private, no-store'}});
  }
}

let coordinator;
function room(env){if(!coordinator)coordinator=new RoomCoordinator(env);return coordinator;}
function staticResponse(request,url) {
  const path=url.pathname==='/'?'/index.html':url.pathname,asset=STATIC_ASSETS[path];
  if(!asset)return json({error:'Not found.'},404);
  const headers={'content-type':asset.type,'cache-control':path==='/index.html'?'no-cache':'public, max-age=3600','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
  if(path==='/index.html'){
    const match=/<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>/i.exec(asset.body);
    const hash=match?`'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`:'';
    headers['content-security-policy']=`default-src 'self'; script-src 'self' ${hash}; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' wss:; style-src 'self'; object-src 'none'; frame-ancestors 'none'`;
  }
  return new Response(request.method==='HEAD'?null:asset.body,{headers});
}
export async function workerFetch(request,env,ctx) {
  const url=new URL(request.url);
  try{
    if(url.pathname==='/healthz')return json({ok:true});
    if(!url.pathname.startsWith('/api/'))return ['GET','HEAD'].includes(request.method)?staticResponse(request,url):json({error:'Method not allowed.'},405);
    if(!env.PARTY_CONFIG_JSON||!env.DB||!env.BUCKET)return json({error:'The organiser is finishing the room setup.'},503);
    const game=room(env),ticket=url.searchParams.get('ticket')||request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(url.pathname==='/api/socket'&&request.headers.get('upgrade')?.toLowerCase()==='websocket')return game.connect(request,ticket||'');
    if(request.method==='GET'&&(url.pathname==='/api/photos'||url.pathname.startsWith('/api/photo/')))return game.photo(request,url,ticket||'');
    if(url.pathname==='/api/events')return json({error:'This room uses the live connection.'},400);
    const allowed=request.method==='POST'?['/api/join','/api/move','/api/action','/api/signal','/api/photo']:['/api/state','/api/voice-config'];
    if(!allowed.includes(url.pathname))return json({error:'Unknown API route.'},404);
    let data;
    if(request.method==='POST'){
      const limit=url.pathname==='/api/photo'?1024*1024:32768;
      const declared=Number(request.headers.get('content-length')||0);if(declared>limit)return json({error:'Message too large.'},413);
      const raw=await request.text();if(raw.length>limit)return json({error:'Message too large.'},413);
      try{data=JSON.parse(raw);}catch{return json({error:'Expected a JSON object.'},400);}
    }
    const reply=await game.enqueue(request.method,url.pathname+url.search,ticket,data);
    if(url.pathname==='/api/voice-config'&&reply.status===200)reply.data.iceServers.push(...voiceRelay(env.TURN_SHARED_SECRET));
    return json(reply.data,reply.status);
  }catch(error){console.error('Room request failed:',String(error?.message||'unknown').slice(0,150));return json({error:'The party is reconnecting. Please try again.'},503);}
}
export default {fetch:workerFetch};
