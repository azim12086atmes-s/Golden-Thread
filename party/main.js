import * as THREE from 'three';
import { World } from '../src/world/World';
import { Sky } from '../src/world/Sky';
import { regionAt, regionCenter, REGIONS } from '../src/world/regions';
import { CharacterModel } from '../src/characters/CharacterModel';
import { OUTFITS } from '../src/characters/outfits';
import '../src/characters/wardrobe';
import { Input } from '../src/core/Input';
import { PartyScenery } from './scenery.js';
import { PartyAudio } from './audio.js';

const $ = id => document.getElementById(id);
const text = (id, value) => { if ($(id).textContent !== String(value)) $(id).textContent = value; };
const el = (tag, label, className) => { const n = document.createElement(tag); if (label !== undefined) n.textContent = label; if (className) n.className = className; return n; };
const GAMES = [
  { id: 'lantern-hunt', title: 'The lost lanterns', icon: '♢', time: '90 SECONDS', goal: 'Find all twelve golden lanterns around the meadow. Walk close and press E to collect.', objective: 'Find the twelve lost lanterns.' },
  { id: 'bridge-dash', title: 'The grand bridge dash', icon: '⌁', time: '75 SECONDS', goal: 'Run through five glowing gates along the palace bridge. Follow them in order; keep your feet on the bridge.', objective: 'Race five gates to the palace.' },
  { id: 'starlight-memory', title: 'Constellation echoes', icon: '✧', time: '60 SECONDS', goal: 'Watch five stars light up, then repeat their order. Everyone gets a turn to make the constellation shine.', objective: 'Remember the five-star constellation.' },
  { id: 'sky-rings', title: 'A ribbon through the sky', icon: '◎', time: '120 SECONDS', goal: 'Press F to fly. Pass through the five sky rings in order. Space rises; X descends. Follow the glowing next ring.', objective: 'Fly through five sky rings.' },
  { id: 'cake-courier', title: 'The cake needs you', icon: '♧', time: '150 SECONDS', goal: 'Collect one ingredient at a time from the meadow and deliver it to the palace cake. Deliver all three ingredients.', objective: 'Deliver three ingredients to the cake.' },
  { id: 'starlight-statues', title: 'Starlight statues', icon: '✦', time: '60 SECONDS', goal: 'Dance or run while the sky says GO. Freeze when it says STILL. Move during each green phase and hold still through the red phase.', objective: 'Move on green. Freeze on red.' },
];
const SYMBOLS = ['✦', '☾', '♢', '✿', '☀', '❖'];
let token = new URLSearchParams(location.hash.slice(1)).get('invite') || new URLSearchParams(location.search).get('invite');
try { token ||= sessionStorage.getItem('starlight-invite'); } catch {}
let ticket = null, state = null, game = null, events = null, layout = null, activePanel = null, playlist = null;
let toastTimer, reconnecting = false, reconnectTimer;
const panel = $('panel'), content = $('panel-content');
const audio = new PartyAudio(data => api('/api/signal', data), message => toast(message));
function toast(message) { text('toast', message); $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
async function api(path, data, quiet = false) {
  const response = await fetch(path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data === undefined ? {} : { 'content-type': 'application/json' }), ...(ticket ? { authorization: `Bearer ${ticket}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401 && ticket && !reconnecting) reconnect(); if (!quiet) toast(result.error || 'That action could not be completed.'); throw new Error(result.error || 'Request failed.'); }
  return result;
}
function action(data, quiet = false) { return api('/api/action', data, quiet); }
function connection(connected) { text('connection', connected ? 'Together, live' : 'Reconnecting…'); $('connection-dot').classList.toggle('live', connected); }

$('join').disabled = !token;
if (token) text('join-status', 'Your place among the stars is ready.');
$('join').addEventListener('click', async () => {
  $('join').disabled = true; text('join-status', 'Lighting the lanterns…');
  await audio.unlock();
  try {
    const joined = await api('/api/join', { token }); ticket = joined.ticket;
    try { sessionStorage.setItem('starlight-invite', token); } catch {}
    history.replaceState(null, '', location.pathname);
    layout = await (await fetch('/party/world.json')).json();
    const voiceConfig = await api(`/api/voice-config?ticket=${encodeURIComponent(ticket)}`, undefined, true).catch(() => null);
    if (voiceConfig?.iceServers?.length) audio.iceServers = voiceConfig.iceServers;
    game = new PartyGame($('world'), joined.self);
    $('invitation').hidden = true; $('hud').hidden = false;
    await receive(await api(`/api/state?ticket=${encodeURIComponent(ticket)}`));
    listen();
    if (joined.self.role === 'birthday') {
      setTimeout(() => {
        openPanel('welcome');
      }, 1000);
    } else toast('Welcome. Explore freely, or open Play for tonight’s games.');
  } catch (error) {
    game?.stop(); game = null; $('invitation').hidden = false; $('hud').hidden = true;
    text('join-status', error.message.includes('fetch') ? 'The party server is unreachable. Open this invitation on the running party server.' : error.message);
    $('join').disabled = false;
  }
});
function listen() {
  events?.close(); events = new EventSource(`/api/events?ticket=${encodeURIComponent(ticket)}`);
  events.onopen = () => connection(true);
  events.addEventListener('state', e => { receive(JSON.parse(e.data)).catch(() => {}); });
  events.onerror = () => { connection(false); clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => reconnect(), 6000); };
}
async function reconnect() {
  if (reconnecting || !token || !game) return; reconnecting = true; events?.close(); connection(false);
  try { const joined = await api('/api/join', { token }, true); ticket = joined.ticket; await receive(await api(`/api/state?ticket=${encodeURIComponent(ticket)}`, undefined, true)); listen(); }
  catch { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => reconnect(), 5000); }
  finally { reconnecting = false; }
}
async function receive(next) {
  const previous = state; state = next; game?.sync(next, previous);
  text('presence', `${next.players.length} here`);
  const birthday = next.players.find(p => p.isBirthday || p.role === 'birthday');
  if (birthday) { game.scenery.setCelebrationName(birthday.name); text('birthday-title', `Happy Birthday, ${birthday.name}!`); }
  $('celebration-banner').hidden = next.party.phase !== 'celebration';
  await audio.refresh(next.players, next.self);
  for (const signal of next.signals || []) await audio.signal(signal);
  if (previous?.party.game !== next.party.game && next.party.game) {
    if (activePanel === 'memory') closePanel();
    const spec = GAMES.find(g => g.id === next.party.game); toast(`${spec.title} · ${spec.objective}`); audio.tone(880, .5);
    if (next.party.game === 'starlight-memory') openPanel('memory');
  }
  if (previous?.party.phase !== 'celebration' && next.party.phase === 'celebration') {
    toast('Happy Birthday! Gather by the cake, release a wish, and save a polaroid.'); audio.tone(523, .8); setTimeout(() => audio.tone(659, .8), 200); setTimeout(() => audio.tone(784, 1.2), 400);
  }
  if (playlist && previous?.party.phase === 'playing' && next.party.phase === 'lobby') {
    const nextIndex = playlist.index + 1;
    toast(nextIndex < GAMES.length ? 'Round complete. The next adventure begins in five seconds.' : 'All six adventures complete. The palace celebration is next.');
    setTimeout(async () => { if (!playlist) return; playlist.index = nextIndex; if (nextIndex < GAMES.length) await startGame(GAMES[nextIndex].id); else { playlist = null; action({ type: 'rally' }).catch(() => {}); } }, 5000);
  }
  if (activePanel === 'games' && JSON.stringify(previous?.party.scores) !== JSON.stringify(next.party.scores)) renderGames();
}
function isHost() { return state && ['birthday', 'companion'].includes(state.self.role); }
async function startGame(id) { if (!isHost()) return; await action({ type: 'start-game', game: id }); closePanel(); }
function closePanel() { panel.close(); activePanel = null; if (game) { game.input.blocked = false; game.input.reset(); } }
function beginPanel(name, eyebrow, heading, description) {
  activePanel = name; content.replaceChildren(el('div', eyebrow, 'eyebrow'), el('h2', heading));
  if (description) content.append(el('p', description));
  if (!panel.open) panel.showModal();
  if (game) { game.input.blocked = true; game.input.reset(); }
}
function button(label, callback, className = 'subtle-button') { const b = el('button', label, className); b.addEventListener('click', () => Promise.resolve(callback()).catch(e => toast(e.message))); return b; }
function openPanel(name) {
  if (!state) return;
  if (name === 'games') return renderGames();
  if (name === 'map') return renderMap();
  if (name === 'wardrobe') return renderWardrobe();
  if (name === 'voice') return renderAudio();
  if (name === 'album') return renderAlbum();
  if (name === 'memory') return renderMemory();
  if (name === 'wishes') return renderWishes();
  if (name === 'welcome') {
    beginPanel(name, 'A LITTLE MAGIC, JUST FOR YOU', `Welcome, ${state.self.name}.`, 'This evening is yours to explore. Your private companions are visible and audible only to you. Other guests do not receive their presence, and the shared album gives guests a view without them.');
    const names = state.players.filter(p => p.role === 'companion').map(p => p.name);
    content.append(el('p', names.length ? `With you tonight: ${names.join(', ')}.` : 'Your private companions will appear when they join.', 'privacy-note'));
    content.append(button('Let the evening begin', closePanel, 'gold-button')); return;
  }
  beginPanel('help', 'MAKE YOURSELF AT HOME', 'A little field guide.', 'Drag the world to turn the camera. Scroll to come closer. On a phone, drag the left half to walk and the right half to look.');
  const keys = el('div', undefined, 'keyboard');
  for (const [k, v] of [['WASD / arrows','Walk'],['Shift','Run'],['F','Toggle flight'],['Space / X','Jump or rise / descend'],['E','Collect or deliver'],['T','Twirl'],['P','Save a polaroid'],['Q (hold)','Push to talk after enabling your microphone'],['Esc','Close a panel']]) { const row = el('div'); row.append(el('kbd', `${k} `), document.createTextNode(` · ${v}`)); keys.append(row); }
  content.append(keys);
  const row = el('div', undefined, 'button-row'); row.append(button('Low graphics', () => game.setQuality('low')), button('High graphics', () => game.setQuality('high')), button('Return to meadow', () => { game.travel({ x:0,z:70,name:'Meadow' }); closePanel(); })); content.append(row);
  content.append(el('p', 'Your invitation belongs to one player. Reopening it in another browser moves your session there. Audio starts only with your permission.'));
}
function renderGames() {
  beginPanel('games', 'A LITTLE FRIENDLY COMPETITION', 'Six ways to make memories.', 'Every round is shared by the party. Explore between rounds, or play through the evening’s playlist.');
  if (isHost()) {
    const row = el('div', undefined, 'button-row');
    row.append(button(playlist ? 'Stop the playlist' : 'Play the six-game playlist', async () => { if (playlist) { playlist = null; renderGames(); } else { playlist = { index: 0 }; await startGame(GAMES[0].id); } }, 'gold-button'), button('Gather everyone for the cake', async () => { playlist = null; await action({ type: 'rally' }); closePanel(); })); content.append(row);
  } else content.append(el('p', 'The celebration host starts each round for everyone. The objective and countdown appear in your world.'));
  const grid = el('div', undefined, 'card-grid');
  GAMES.forEach((g, i) => { const card = el('section', undefined, 'game-card'); card.append(el('div', `${String(i + 1).padStart(2, '0')} / ${g.time}`, 'number'), el('h3', `${g.icon} ${g.title}`), el('p', g.goal)); if (isHost()) card.append(button(state.party.game === g.id ? 'Restart this round' : 'Start for everyone', () => { playlist = null; return startGame(g.id); })); if (g.id === 'starlight-memory' && state.party.game === g.id) card.append(button('Open the constellation', () => renderMemory())); grid.append(card); }); content.append(grid);
  content.append(el('h3', 'A little stardust earned'));
  const scores = Object.entries(state.party.scores || {}).sort((a,b) => b[1]-a[1]);
  const list = el('ol', undefined, 'score-list');
  for (const [id, score] of scores) { const p = state.players.find(p => p.id === id); if (!p) continue; const li = el('li'); li.append(el('span', p.name), el('span', `${score} ✦`)); list.append(li); }
  if (!scores.length) content.append(el('p', 'The first stars are still waiting to be earned.')); content.append(list);
}
function renderMap() {
  beginPanel('map', 'FOLLOW THE GOLDEN PATH', 'A world worth wandering.', 'Take a skyboat to a party venue, or visit the existing lands. Everyone can return to the cake with the host’s gathering call.');
  const grid = el('div', undefined, 'card-grid');
  for (const d of game.scenery.destinations || []) grid.append(button('', () => { game.travel(d); closePanel(); }, 'destination'));
  [...grid.children].forEach((b, i) => { const d = game.scenery.destinations[i]; b.append(el('strong', d.name), el('small', 'TAKE A SKYBOAT ↗')); });
  content.append(grid, el('h3', 'The lands of Golden Thread'));
  const lands = el('div', undefined, 'card-grid');
  for (const r of REGIONS) { const c = regionCenter(r); const b = button('', () => { game.travel({ x:c.x+12,z:c.z+70,name:r.name }); closePanel(); }, 'destination'); b.append(el('strong', r.name), el('small', r.subtitle)); lands.append(b); } content.append(lands);
}
function renderWardrobe() {
  beginPanel('wardrobe', 'DRESS FOR A LITTLE WONDER', 'Your evening wardrobe.', 'Choose a fully covering outfit. Everyone sees your chosen look.');
  const grid = el('div', undefined, 'card-grid');
  for (const id of ['g-star','g-petal','g-anarkali','g-abaya','g-kimono','g-nova','b-moon','b-sherwani','b-thobe','b-kimono','b-parka','b-nova']) {
    const outfit = OUTFITS[id]; if (!outfit) continue;
    const b = button('', async () => { await action({ type:'outfit',avatar:id }); toast(`${outfit.name} selected.`); }, 'destination');
    const swatch = el('span', '● '); swatch.style.color = outfit.topColor; b.append(swatch, el('strong', outfit.name), el('small', outfit.culture)); grid.append(b);
  } content.append(grid);
}
function renderAudio() {
  beginPanel('voice', 'SOUNDTRACK TO THE EVENING', 'A little closer, by voice.', 'Voice is optional. Enable your microphone, then hold Q or the talk button to speak. Music and effects are made in your browser.');
  const row = el('div', undefined, 'button-row'); row.append(button('Enable sound', () => audio.unlock()), button(audio.mic ? 'Turn microphone off' : 'Enable microphone', async () => { if (audio.mic) audio.disableMic(); else await audio.enableMic(); renderAudio(); })); content.append(row);
  if (audio.mic) { const talk = button('Hold to talk', () => {}, 'gold-button'); talk.onpointerdown = e => { talk.setPointerCapture(e.pointerId); audio.setTalking(true); }; talk.onpointerup = talk.onpointercancel = () => audio.setTalking(false); content.append(talk); }
  if (state.self.role === 'birthday') {
    const field = el('label', 'Speak to', 'field'); const select = el('select'); for (const [v,l] of [['guests','Party guests'],['private','Private companions only']]) { const option = el('option',l); option.value=v; option.selected=audio.channel===v; select.append(option); }
    select.onchange = () => { audio.setTalking(false); audio.channel=select.value; audio.applyTracks(); toast(`Voice channel: ${select.selectedOptions[0].textContent}.`); }; field.append(select); content.append(field, el('p','Private companions’ audio reaches only you. Select the private channel before replying to them.', 'privacy-note'));
  } else if (state.self.role === 'companion') content.append(el('p','Your microphone reaches only the birthday guest. Party guests cannot see or hear you.', 'privacy-note'));
  const switches = el('div', undefined, 'button-row'); switches.append(button(audio.music ? 'Music: on' : 'Music: off', async () => { await audio.unlock(); audio.music=!audio.music; renderAudio(); }), button(audio.effects ? 'Effects: on' : 'Effects: off', () => { audio.effects=!audio.effects; renderAudio(); })); content.append(switches);
  const volume = el('label','Party volume','field'); const slider = el('input'); slider.type='range';slider.min='0';slider.max='1';slider.step='.05';slider.value=String(audio.volume); slider.className='volume'; slider.oninput=()=>audio.setVolume(slider.value); volume.append(slider);content.append(volume);
}
let memoryTimeouts = [];
function renderMemory() {
  beginPanel('memory','CONSTELLATION ECHOES','Watch. Remember. Shine.','Watch five symbols glow, then tap them in the same order. You can replay the pattern.');
  memoryTimeouts.forEach(clearTimeout); memoryTimeouts=[];
  if (state.party.game !== 'starlight-memory') { content.append(el('p','The constellation round has not started yet.'));return; }
  const sequence = state.party.round?.sequence || []; let answer=[], watching=true;
  const progress=el('div','','memory-progress'), grid=el('div',undefined,'memory-keys');
  const keys = SYMBOLS.map((symbol,index)=> { const b=button(symbol,async()=>{ if(watching)return;audio.tone(330+index*90); answer.push(index);progress.textContent=answer.map(i=>SYMBOLS[i]).join(' ');if(answer.length===sequence.length){try{await action({type:'submit-sequence',sequence:answer});toast('Your constellation is shining. One more birthday star earned!');}catch{toast('Try again — your stars are still waiting.');}answer=[];} });grid.append(b);return b; });
  const play=()=>{watching=true;answer=[];progress.textContent='Watch the stars…'; keys.forEach(b=>b.classList.remove('lit')); sequence.forEach((n,i)=>{memoryTimeouts.push(setTimeout(()=>{keys[n]?.classList.add('lit');audio.tone(330+n*90,.4);},600+i*850));memoryTimeouts.push(setTimeout(()=>keys[n]?.classList.remove('lit'),1200+i*850));});memoryTimeouts.push(setTimeout(()=>{watching=false;progress.textContent='Your turn';},650+sequence.length*850));};
  content.append(grid,progress,button('Replay the constellation',play)); play();
}
function renderWishes() {
  beginPanel('wishes','MAKE A LITTLE WISH','Send a lantern into the sky.','Your birthday wish is delivered to the birthday guest. A little light rises into your world.');
  const form=el('form'); const field=el('label','Your wish (140 characters)','field'); const input=el('input'); input.maxLength=140;input.placeholder='May the year ahead be full of beautiful things.';field.append(input);form.append(field);const send=el('button','Release my lantern','gold-button');send.type='submit';form.append(send);form.onsubmit=async e=>{e.preventDefault();if(!input.value.trim())return;try{await action({type:'wish',text:input.value.trim()});game.scenery.releaseLantern(game.pos.x,game.pos.z);audio.tone(740,.8);toast('Your wish is on its way.');closePanel();}catch{}};content.append(form);
  if (state.wishes?.length) { content.append(el('h3','Little wishes, kept safe'));for(const wish of state.wishes)content.append(el('p',`✧ ${wish.text}`)); }
}
async function renderAlbum() {
  beginPanel('album','MOMENTS WORTH KEEPING','The birthday polaroids.','Every shared photo is delivered in the view intended for you. Save a keepsake to your device.');
  content.append(el('p','Opening the album…'));
  try { const result=await api(`/api/photos?ticket=${encodeURIComponent(ticket)}`);if(activePanel!=='album')return;
    content.lastChild.remove();const photos=Array.isArray(result)?result:result.photos||[];const grid=el('div',undefined,'photo-grid');
    for(const photo of photos){const figure=el('figure',undefined,'polaroid');const img=el('img');img.src=photo.url||`/api/photo/${encodeURIComponent(photo.id)}?ticket=${encodeURIComponent(ticket)}`;img.alt='A birthday moment in the world';img.loading='lazy';const a=el('a','Save this polaroid ↗');a.href=img.src;a.download='starlight-polaroid.jpg';figure.append(img,el('figcaption',photo.caption||'Under the birthday stars.'),a);grid.append(figure);}
    if(!photos.length)content.append(el('p','The first page is still blank. Take a polaroid to begin.'));content.append(grid);
  }catch{content.lastChild.textContent='The album is unavailable. You can still save photos directly to your device.';}
}

document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
$('panel-close').onclick=closePanel;panel.addEventListener('cancel',e=>{e.preventDefault();closePanel();});
$('help-button').onclick=()=>openPanel('help');$('wish-button').onclick=()=>openPanel('wishes');$('photo-button').onclick=()=>game?.photo();
$('interact-button').onclick=()=>game?.interact();$('fly-button').onclick=()=>game?.toggleFlight();
for(const [id,key]of[['rise-button',' '],['lower-button','x'],['run-button','shift']]){const b=$(id);b.onpointerdown=e=>{if(!game)return;b.setPointerCapture(e.pointerId);game.input.setVirtual(key,true);};b.onpointerup=b.onpointercancel=()=>game?.input.setVirtual(key,false);}

class PartyGame {
  constructor(host,self) {
    this.self=self;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#29223f');
    this.camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.1,6000);this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.14;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));host.replaceChildren(this.renderer.domElement);
    this.input=new Input(this.renderer.domElement);this.world=new World();this.sky=new Sky();this.scene.add(this.world.group,this.sky.group,this.sky.sunLight,this.sky.sunLight.target,this.sky.hemi);this.scene.fog=this.sky.fog;
    this.scene.add(new THREE.HemisphereLight('#c2d2ff','#695465',.5));this.scenery=new PartyScenery(this.scene,'low');
    this.players=new Map();this.pos=new THREE.Vector3(layout.SPAWN.x,0,layout.SPAWN.z);this.pos.y=this.scenery.ground(this.pos.x,this.pos.z);this.yaw=0;this.pitch=.25;this.distance=10;this.fly=false;this.vy=0;this.t=0;this.last=performance.now();this.lastSend=0;this.sending=false;this.lastCollect=0;this.pending=false;this.checkpoint=0;this.trip=null;this.photoBusy=false;this.lastPhase='';
    this.pickups=new Map();this.rings=[];this.ingredients=[];
    const glow=new THREE.MeshBasicMaterial({color:'#f2cd87'});
    for(const p of layout.LANTERN_PICKUPS){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.85),glow);m.position.set(p.x,this.scenery.ground(p.x,p.z)+2,p.z);this.scene.add(m);this.pickups.set(p.id,m);}
    for(const p of layout.SKY_RINGS||[]){const m=new THREE.Mesh(new THREE.TorusGeometry(5,.2,6,36),glow.clone());m.position.set(p.x,p.y,p.z);this.scene.add(m);this.rings.push(m);}
    const ingredientCoords=layout.INGREDIENTS||[{x:-65,y:0,z:25},{x:65,y:0,z:25},{x:0,y:0,z:-100}];
    ingredientCoords.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2),new THREE.MeshStandardMaterial({color:['#eea4be','#b4deca','#f1d49e'][i],emissive:'#68434e',emissiveIntensity:.4}));m.position.set(p.x,this.scenery.ground(p.x,p.z)+1.5,p.z);this.scene.add(m);this.ingredients.push(m);});
    this.clockTimer=setInterval(()=>this.objective(),200);this.resize=()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);};addEventListener('resize',this.resize);this.resize();
    this.renderer.setAnimationLoop(()=>this.frame());
  }
  stop(){this.renderer.setAnimationLoop(null);clearInterval(this.clockTimer);removeEventListener('resize',this.resize);audio.close();}
  setQuality(quality){this.renderer.setPixelRatio(quality==='high'?Math.min(devicePixelRatio,1.75):Math.min(devicePixelRatio,1));this.renderer.shadowMap.enabled=quality==='high';this.resize();toast(`${quality==='high'?'High':'Low'} graphics selected.`);}
  sync(next,previous){
    const present=new Set(next.players.map(p=>p.id));for(const[id,p]of this.players)if(!present.has(id)){this.scene.remove(p.model.root);this.players.delete(id);}
    for(const data of next.players){let p=this.players.get(data.id);const outfitId=OUTFITS[data.avatar]?data.avatar:(data.isBirthday||data.role==='birthday'?'g-star':'b-moon');
      if(!p){const model=new CharacterModel(OUTFITS[outfitId],'#b88b70',1,1,null);model.root.name=data.id;const label=this.nameTag(data.name);label.position.y=2.35;model.root.add(label);this.scene.add(model.root);p={model,label,target:new THREE.Vector3(data.x,data.y,data.z),yaw:data.yaw||0,outfitId,last:new THREE.Vector3(data.x,data.y,data.z),data};model.root.position.copy(p.target);this.players.set(data.id,p);}
      p.data=data;p.target.set(data.x,data.y,data.z);p.yaw=data.yaw||0;
      if(p.outfitId!==outfitId){p.outfitId=outfitId;p.model.setOutfit(OUTFITS[outfitId]);}
      if(data.id===next.self.id){const changed=previous?.party.game!==next.party.game||previous?.party.phase!==next.party.phase;if(!previous||changed&&p.target.distanceTo(this.pos)>5||p.target.distanceTo(this.pos)>75){this.pos.copy(p.target);this.pos.y=Math.max(this.pos.y,this.scenery.ground(this.pos.x,this.pos.z,this.pos.y));this.fly=false;this.trip=null;this.checkpoint=0;this.input.reset();}}
    }
    if(previous?.party.game!==next.party.game){this.checkpoint=0;this.pending=false;}
    this.self=next.self;this.objective();
  }
  nameTag(name){const c=document.createElement('canvas');c.width=512;c.height=88;const ctx=c.getContext('2d');ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillStyle='#171329bb';ctx.fillRect(50,8,412,66);ctx.fillStyle='#f9e8c7';ctx.fillText(name,256,50);const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false});const sprite=new THREE.Sprite(material);sprite.scale.set(3.3,.57,1);return sprite;}
  objective(){if(!state)return;const party=state.party,spec=GAMES.find(g=>g.id===party.game),progress=party.selfProgress||{};
    if(party.phase==='rally'){text('objective-label','THE PALACE IS CALLING');text('objective-title','Everyone, to the cake.');text('objective-description','A skyboat is on its way for everyone. Finish your little moment, then gather at the palace.');text('objective-progress','✦ The celebration is about to begin');}
    else if(spec){text('objective-label',`${spec.icon} PARTY CHALLENGE`);text('objective-title',spec.title);text('objective-description',spec.goal);let detail=spec.objective;
      if(party.game==='lantern-hunt')detail=`${party.round?.items?.filter(i=>i.found).length||0} / 12 lanterns found`;
      if(party.game==='bridge-dash'||party.game==='sky-rings')detail=`${progress.checkpoint??this.checkpoint} / 5 gates crossed`;
      if(party.game==='cake-courier')detail=progress.carrying!==undefined&&progress.carrying!==null?`Carrying an ingredient · deliver at the cake`:`${Array.isArray(progress.delivered)?progress.delivered.length:progress.delivered||0} / 3 ingredients delivered`;
      if(party.game==='starlight-memory')detail=progress.sequenceDone?'✦ Your constellation is complete':'Open Play → constellation, or press E';
      if(party.game==='starlight-statues'){const started=party.round?.startedAt??party.startedAt??(party.endsAt-60000);const red=(Date.now()-started)%10000>=6000;detail=red?'● STILL — hold your pose':'● GO — run, dance, or twirl';text('movement-mode',red?'FREEZE':'MOVE');}
      text('objective-progress',detail);
    }else if(party.phase==='celebration'){text('objective-label','MAKE A WISH');text('objective-title','A birthday among the stars.');text('objective-description','Gather at the cake, release a wish lantern, and keep a photo of this little evening.');text('objective-progress','✦ The palace is glowing for you');}
    else{text('objective-label','THE EVENING IS YOURS');text('objective-title','Follow your curiosity.');text('objective-description','Explore the meadow, cross the grand bridge, and find the palace. Open Play to see the evening’s challenges.');text('objective-progress','✦ Explore at your own pace');}
    const end=party.rallyAt||party.endsAt;const remaining=end?Math.max(0,Math.ceil((end-Date.now())/1000)):null;text('round-clock',remaining===null?'':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`);
  }
  toggleFlight(){if(state?.party.game==='bridge-dash'){toast('This is a running race — keep your feet on the bridge.');return;}this.fly=!this.fly;this.vy=0;toast(this.fly?'Flight · Space to rise, X to descend.':'Back on foot.');}
  travel(destination){if(state?.party.phase==='playing'){toast('Finish this round before taking a skyboat.');return;}const target=new THREE.Vector3(destination.x,destination.y??this.scenery.ground(destination.x,destination.z),destination.z);this.trip={from:this.pos.clone(),to:target,start:this.t,duration:Math.min(10,Math.max(3,this.pos.distanceTo(target)/150))};this.fly=false;toast(`A skyboat to ${destination.name}.`);}
  async interact(){if(!state||this.pending)return;const party=state.party;try{this.pending=true;
    if(party.game==='starlight-memory'){openPanel('memory');return;}
    if(party.game==='lantern-hunt'){const target=(party.round?.items||[]).filter(i=>!i.found).sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.z)-Math.hypot(b.x-this.pos.x,b.z-this.pos.z))[0];if(!target||Math.hypot(target.x-this.pos.x,target.z-this.pos.z)>8){toast('Follow a golden lantern and come a little closer.');return;}await action({type:'collect',itemId:target.id});audio.tone(990,.3);return;}
    if(party.game==='cake-courier'){const progress=party.selfProgress||{};if(progress.carrying!==null&&progress.carrying!==undefined){await action({type:'deliver-ingredient'});audio.tone(880,.4);toast('One ingredient delivered. The cake is coming together!');}else{const index=this.ingredients.findIndex((p,i)=>Math.hypot(p.position.x-this.pos.x,p.position.z-this.pos.z)<8&&!(progress.delivered||[]).includes(i));if(index<0){toast('Find one of the three pastel ingredient parcels in the meadow.');return;}await action({type:'pick-ingredient',index});toast('Ingredient collected. Fly it to the cake at the palace!');}return;}
    if(party.game==='starlight-statues'){this.twirlUntil=this.t+1;return;}
    openPanel('wishes');
    }catch{}finally{this.pending=false;}}
  async send(){if(this.sending||!ticket)return;this.sending=true;try{await api('/api/move',{x:this.pos.x,y:this.pos.y,z:this.pos.z,yaw:this.bodyYaw||0},true);}catch(error){if(state?.party.game==='bridge-dash'){const p=state.players.find(p=>p.id===this.self.id);if(p)this.pos.set(p.x,p.y,p.z);}}finally{this.sending=false;}}
  async checkpoints(){if(!state||this.pending)return;const id=state.party.game;if(id!=='bridge-dash'&&id!=='sky-rings')return;const points=id==='sky-rings'?layout.SKY_RINGS:layout.BRIDGE_CHECKPOINTS;const index=state.party.selfProgress?.checkpoint??this.checkpoint;const p=points?.[index];if(!p)return;const d=id==='sky-rings'?Math.hypot(this.pos.x-p.x,this.pos.y-p.y,this.pos.z-p.z):Math.hypot(this.pos.x-p.x,this.pos.z-p.z);if(d>6)return;this.pending=true;try{await this.send();await action({type:'checkpoint',index},true);this.checkpoint=index+1;audio.tone(660+index*90,.3);toast(index===4?'All five gates complete! A little stardust earned.':`Gate ${index+1} / 5`);}catch{}finally{this.pending=false;}}
  frame(){const now=performance.now(),dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.t+=dt;
    if(this.input.hit('escape')&&panel.open)closePanel();
    if(!this.input.blocked){if(this.input.hit('f'))this.toggleFlight();if(this.input.hit('p'))this.photo();if(this.input.hit('e'))this.interact();if(this.input.hit('t'))this.twirlUntil=this.t+1.2;}
    this.yaw-=this.input.dx*.004;this.pitch=THREE.MathUtils.clamp(this.pitch+this.input.dy*.003,-.1,1.1);this.distance=THREE.MathUtils.clamp(this.distance+this.input.wheel*.8,4,30);
    const axis=this.input.axis(),old=this.pos.clone();let speed=this.fly?(this.input.held('shift')?34:22):(this.input.held('shift')?12:7);
    if(state?.party.game==='bridge-dash'){this.fly=false;speed=this.input.held('shift')?12:8;}
    if(this.trip){const k=THREE.MathUtils.clamp((this.t-this.trip.start)/this.trip.duration,0,1);this.pos.lerpVectors(this.trip.from,this.trip.to,k*k*(3-2*k));this.pos.y+=Math.sin(k*Math.PI)*Math.min(95,this.trip.from.distanceTo(this.trip.to)*.15);if(k>=1)this.trip=null;}
    else{const dx=(axis.x*Math.cos(this.yaw)-axis.y*Math.sin(this.yaw))*speed*dt,dz=(-axis.x*Math.sin(this.yaw)-axis.y*Math.cos(this.yaw))*speed*dt;this.pos.x+=dx;this.pos.z+=dz;
      if(this.fly){if(this.input.held(' '))this.pos.y+=17*dt;if(this.input.held('x'))this.pos.y-=17*dt;this.pos.y=Math.max(this.pos.y,this.scenery.ground(this.pos.x,this.pos.z,this.pos.y)+.2);}
      else{if(this.input.hit(' ')&&this.pos.y<=this.scenery.ground(this.pos.x,this.pos.z,this.pos.y)+.15)this.vy=6;this.vy-=18*dt;this.pos.y+=this.vy*dt;const floor=this.scenery.ground(this.pos.x,this.pos.z,this.pos.y);if(this.pos.y<floor){this.pos.y=floor;this.vy=0;}this.world.resolve(this.pos,.5);this.scenery.resolve(this.pos,.5);}
      for(const[id,p]of this.players)if(id!==this.self.id&&Math.abs(p.model.root.position.y-this.pos.y)<2){const dx=this.pos.x-p.model.root.position.x,dz=this.pos.z-p.model.root.position.z,d=Math.hypot(dx,dz);if(d<1.8&&d>.001){this.pos.x+=dx/d*(1.8-d);this.pos.z+=dz/d*(1.8-d);}}
    }
    this.pos.x=THREE.MathUtils.clamp(this.pos.x,-1740,1740);this.pos.z=THREE.MathUtils.clamp(this.pos.z,-1040,1740);this.pos.y=THREE.MathUtils.clamp(this.pos.y,-10,780);
    if(old.distanceTo(this.pos)>.001)this.bodyYaw=Math.atan2(this.pos.x-old.x,this.pos.z-old.z);
    for(const[id,p]of this.players){const root=p.model.root;if(id===this.self.id)root.position.copy(this.pos);else root.position.lerp(p.target,1-Math.exp(-dt*14));const moving=root.position.distanceTo(p.last)/Math.max(dt,.001);p.last.copy(root.position);root.rotation.y=id===this.self.id?(this.t<this.twirlUntil?this.t*5:this.bodyYaw||0):p.yaw;p.model.update(dt,{speed:Math.min(10,moving),airborne:id===this.self.id?this.fly:false,riding:false,t:this.t});}
    for(const[id,m]of this.pickups){const item=state?.party.round?.items?.find(i=>i.id===id);m.visible=state?.party.game==='lantern-hunt'&&!item?.found;m.rotation.y=this.t*.8;m.position.y=this.scenery.ground(m.position.x,m.position.z)+2+Math.sin(this.t*2+m.position.x)*.3;}
    this.rings.forEach((m,i)=>{m.visible=state?.party.game==='sky-rings';m.material.color.set(i===(state?.party.selfProgress?.checkpoint??this.checkpoint)?'#fff0b0':'#9584bc');m.material.opacity=i<(state?.party.selfProgress?.checkpoint??this.checkpoint)?.2:1;m.material.transparent=true;if(i===0)m.lookAt(this.pos);else m.lookAt(this.rings[i-1].position);});
    this.ingredients.forEach((m,i)=>{m.visible=state?.party.game==='cake-courier'&&!(state.party.selfProgress?.delivered||[]).includes(i);m.rotation.y=this.t*.7;});
    this.world.update(this.pos);const region=regionAt(this.pos.x,this.pos.z);this.sky.update(state?.party.phase==='celebration'?21:18.8+Math.sin(this.t/240)*1.2,this.pos,this.t,region.id);this.world.glow.color.setScalar(1.1);this.scenery.update(this.t,dt,state?.party.phase==='celebration');
    const target=this.pos.clone().add(new THREE.Vector3(0,1.3,0)),desired=target.clone().add(new THREE.Vector3(Math.sin(this.yaw)*this.distance,Math.sin(this.pitch)*this.distance+2.8,Math.cos(this.yaw)*this.distance));this.camera.position.lerp(desired,1-Math.exp(-dt*9));this.camera.lookAt(target);
    if(!this.photoBusy)this.renderer.render(this.scene,this.camera);
    const statueRed=state?.party.game==='starlight-statues'&&state.party.selfProgress?.statueStatus==='red';
    if(this.statueRed!==statueRed&&state?.party.game==='starlight-statues')audio.tone(statueRed?220:880,.35);
    this.statueRed=statueRed;audio.frozen=statueRed;
    audio.update(this.t);if(this.t-this.lastSend>.14){this.lastSend=this.t;this.send();this.checkpoints();}
    if(Math.floor(this.t*2)!==this.locationTick){this.locationTick=Math.floor(this.t*2);text('location-name',this.pos.z< -380&&Math.abs(this.pos.x)<230?'Palace of Starlight':region.name);if(state?.party.game!=='starlight-statues')text('movement-mode',this.trip?'BY SKYBOAT':this.fly?'IN FLIGHT':'ON FOOT');}
    this.input.endFrame();
  }
  snapshot(guestView=false){const hidden=[];for(const p of this.players.values())if((guestView&&p.data.role==='companion')||guestView&&this.self.role==='companion'&&p.data.id===this.self.id){hidden.push(p.model.root);p.model.root.visible=false;}
    this.renderer.render(this.scene,this.camera);const c=document.createElement('canvas');c.width=960;c.height=780;const ctx=c.getContext('2d');ctx.fillStyle='#faf1e5';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(this.renderer.domElement,20,20,920,660);ctx.fillStyle='#433249';ctx.font='italic 27px Georgia';ctx.textAlign='center';ctx.fillText('A birthday under the stars.',480,730);hidden.forEach(o=>{o.visible=true;});this.renderer.render(this.scene,this.camera);return c.toDataURL('image/jpeg',.8);}
  async photo(){if(this.photoBusy||!state)return;this.photoBusy=true;try{const privateImage=this.snapshot(false),publicImage=this.self.role==='birthday'||this.self.role==='companion'?this.snapshot(true):privateImage;audio.tone(1200,.09);
    beginPanel('photo','A MOMENT, KEPT FOREVER','Your little polaroid.','Save it to your device, or add it to the birthday album.');const figure=el('figure',undefined,'polaroid'),img=el('img');img.src=privateImage;img.alt='Your birthday polaroid';figure.append(img,el('figcaption','A birthday under the stars.'));content.append(figure);
    const row=el('div',undefined,'button-row');const a=el('a','Save to my device ↗','gold-button');a.href=privateImage;a.download='starlight-polaroid.jpg';row.append(a);
    if(this.self.role!=='companion')row.append(button('Add to the birthday album',async()=>{await api('/api/photo',{publicImage,...(this.self.role==='birthday'?{privateImage}:{}),caption:'A birthday under the stars.'});toast('A new memory is waiting in the birthday album.');closePanel();}));
    if(this.self.role==='birthday'){const safe=el('a','Save the guest view','subtle-button');safe.href=publicImage;safe.download='starlight-guest-polaroid.jpg';row.append(safe);content.append(el('p','Your version keeps your private companions. The guest version leaves them out.', 'privacy-note'));}content.append(row);
    }catch(e){toast(`The photo could not be saved: ${e.message}`);}finally{this.photoBusy=false;}}
}
