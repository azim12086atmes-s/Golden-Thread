import * as THREE from 'three';
import { World } from '../src/world/World';
import { Sky } from '../src/world/Sky';
import { regionAt, regionCenter, REGIONS } from '../src/world/regions';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { Thread } from '../src/characters/Thread';
import { enforceGap } from '../shared/follow.js';
import { OUTFITS } from '../src/characters/outfits';
import '../src/characters/wardrobe';
import { Input } from '../src/core/Input';
import { PartyScenery } from './scenery.js';
import { PartyAudio } from './audio.js';
import { Adventures, EXTRA_GAMES, CHASE_GAMES } from './adventures.js';
import { PartyLife } from './life.js';
import { PartyAtmosphere } from './atmosphere.js';
import { renderWardrobe as renderFullWardrobe, closeWardrobePreview } from './wardrobe.js';
import { buildVehicle, VEHICLES } from '../src/vehicles/vehicles';
import { appendAtlas } from './atlas-map.js';
import { Travellers } from '../src/player/Travellers';
import { Chariot, SEATS as CHARIOT_SEATS } from '../src/event/Chariot';
import { PartyCelebration } from './celebration.js';

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
GAMES.push(...EXTRA_GAMES);
const SYMBOLS = ['✦', '☾', '♢', '✿', '☀', '❖'];
const query = new URLSearchParams(location.search), fragment = new URLSearchParams(location.hash.slice(1));
const token = fragment.get('invite') || query.get('invite');
const guestNumber = query.get('guest');
const invited = Boolean(token || guestNumber !== null && /^\d{1,10}$/.test(guestNumber));
const isPrivate = role => role === 'companion' || role === 'observer';
function entry() { return token ? { token } : { guestNumber, ...($('guest-name').value.trim() ? { name: $('guest-name').value.trim() } : {}) }; }
let ticket = null, state = null, game = null, events = null, layout = null, activePanel = null, playlist = null;
let toastTimer, reconnecting = false, reconnectTimer;
let socket = null, rpcId = 0, socketPoll = null;
const rpcPending = new Map();
const panel = $('panel'), content = $('panel-content');
const audio = new PartyAudio(data => api('/api/signal', data), message => toast(message));
function toast(message) { text('toast', message); $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
async function api(path, data, quiet = false) {
  let response;
  if (socket?.readyState === WebSocket.OPEN && data !== undefined && ['/api/move','/api/action','/api/signal'].includes(path)) {
    const reply = await liveRequest(path, data);
    response = { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.data };
  } else response = await fetch(path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data === undefined ? {} : { 'content-type': 'application/json' }), ...(ticket ? { authorization: `Bearer ${ticket}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401 && ticket && !reconnecting) reconnect(); if (!quiet) toast(result.error || 'That action could not be completed.'); const error = new Error(result.error || 'Request failed.'); error.status = response.status; throw error; }
  return result;
}
function liveRequest(path, data) {
  return new Promise((resolve, reject) => {
    const id = ++rpcId, timer = setTimeout(() => { rpcPending.delete(id); reject(new Error('The party is reconnecting. Try again shortly.')); }, 12000);
    rpcPending.set(id, { resolve, reject, timer });
    try { socket.send(JSON.stringify({ kind:'rpc', id, path, data })); }
    catch (error) { clearTimeout(timer); rpcPending.delete(id); reject(error); }
  });
}
function action(data, quiet = false) { return api('/api/action', data, quiet); }
function connection(connected) { text('connection', connected ? 'Together, live' : 'Reconnecting…'); $('connection-dot').classList.toggle('live', connected); }

$('join').disabled = !invited;
$('guest-name-field').hidden = !invited || Boolean(token);
if (invited) text('join-status', token ? 'Your place among the stars is ready.' : `Guest ${guestNumber} · Your place among the stars is ready.`);
else { text('invite-title', 'Not invited'); text('invite-description', 'Open your numbered guest link or your private invitation to enter the celebration.'); text('join-status', 'This page needs an invitation.'); }
$('join').addEventListener('click', async () => {
  $('join').disabled = true; text('join-status', 'Lighting the lanterns…');
  await audio.unlock();
  try {
    const joined = await api('/api/join', entry()); ticket = joined.ticket;
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
    } else if (joined.self.role === 'observer') { openPanel('voice'); toast('You follow the birthday guest automatically. Only she can see and hear you.'); }
    else toast('Welcome. Explore freely, or open Play for tonight’s games.');
  } catch (error) {
    game?.stop(); game = null; $('invitation').hidden = false; $('hud').hidden = true;
    text('join-status', error.message.includes('fetch') ? 'The party server is unreachable. Open this invitation on the running party server.' : error.message);
    $('join').disabled = false;
  }
});
function listen() {
  if (layout?.TRANSPORT === 'websocket') {
    events?.close();
    clearInterval(socketPoll);
    if (socket) { socket.onclose = null; socket.close(); }
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/socket?ticket=${encodeURIComponent(ticket)}`);
    socket.onopen = () => { clearTimeout(reconnectTimer); connection(true); socketPoll = setInterval(() => { if(socket?.readyState===WebSocket.OPEN)socket.send('{"kind":"poll"}'); },200); };
    socket.onmessage = async event => {
      let msg; try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.kind === 'reply') { const pending = rpcPending.get(msg.id); if (pending) { clearTimeout(pending.timer); rpcPending.delete(msg.id); pending.resolve(msg); } }
      else if (msg.kind === 'state') {
        await receive(msg.state).catch(() => {});
        if (msg.state.signals?.length && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ kind:'ack', ids:msg.state.signals.map(s=>s.id) }));
      }
    };
    socket.onclose = () => {
      clearInterval(socketPoll);
      connection(false); for (const p of rpcPending.values()) { clearTimeout(p.timer); p.reject(new Error('The live connection is restarting.')); } rpcPending.clear();
      clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => reconnect(), 2500);
    };
    socket.onerror = () => connection(false);
    return;
  }
  events?.close(); events = new EventSource(`/api/events?ticket=${encodeURIComponent(ticket)}`);
  events.onopen = () => connection(true);
  events.addEventListener('state', e => { receive(JSON.parse(e.data)).catch(() => {}); });
  events.onerror = () => { connection(false); clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => reconnect(), 6000); };
}
async function reconnect() {
  if (reconnecting || !invited || !game) return; reconnecting = true; events?.close(); connection(false);
  try { const joined = await api('/api/join', entry(), true); ticket = joined.ticket; await receive(await api(`/api/state?ticket=${encodeURIComponent(ticket)}`, undefined, true)); listen(); }
  catch { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(() => reconnect(), 5000); }
  finally { reconnecting = false; }
}
async function receive(next) {
  const previous = state; state = next; game?.sync(next, previous);
  text('presence', `${next.party.presenceCount ?? next.players.length} here`);
  const birthday = next.players.find(p => p.isBirthday || p.role === 'birthday');
  if (birthday) { game.scenery.setCelebrationName(birthday.name); text('birthday-title', `Happy Birthday, ${birthday.name}!`); }
  $('celebration-banner').hidden = next.party.phase !== 'celebration';
  await audio.refresh(next.voicePeers || next.players, next.self);
  for (const signal of next.signals || []) await audio.signal(signal);
  if (previous?.party.game !== next.party.game && next.party.game) {
    if (activePanel === 'memory') closePanel();
    const spec = GAMES.find(g => g.id === next.party.game); toast(`${spec.title} · ${spec.objective}`); audio.tone(880, .5);
    if (next.party.game === 'starlight-memory' && next.self.role !== 'observer') openPanel('memory');
  }
  if (previous?.party.phase !== 'celebration' && next.party.phase === 'celebration') {
    toast('Happy Birthday! Gather by the cake, release a wish, and save a polaroid.'); audio.tone(523, .8); setTimeout(() => audio.tone(659, .8), 200); setTimeout(() => audio.tone(784, 1.2), 400);
  }
  if (playlist && previous?.party.phase === 'playing' && next.party.phase === 'lobby') {
    const nextIndex = playlist.index + 1;
    toast(nextIndex < GAMES.length ? 'Round complete. The next adventure begins in five seconds.' : 'All nine adventures complete. The palace celebration is next.');
    setTimeout(async () => { if (!playlist) return; playlist.index = nextIndex; if (nextIndex < GAMES.length) await startGame(GAMES[nextIndex].id); else { playlist = null; action({ type: 'rally' }).catch(() => {}); } }, 5000);
  }
  if (activePanel === 'games' && JSON.stringify(previous?.party.scores) !== JSON.stringify(next.party.scores)) renderGames();
  if (previous?.party.journey && next.party.journey?.stars > previous.party.journey.stars) toast(`Another beacon is shining. ${next.party.journey.stars} / 20 lights for the birthday crown.`);
  if (activePanel === 'journey' && (previous?.party.journey?.version !== next.party.journey?.version || previous?.party.phase !== next.party.phase)) renderJourney();
  if (activePanel === 'festival' && JSON.stringify(previous?.party.festival)!==JSON.stringify(next.party.festival)) renderFestival();
  if (previous?.party.festival?.stage!==next.party.festival?.stage&&next.party.festival?.stage==='afterparty'&&next.self.role!=='observer') toast('A birthday wish, kept forever. The night dragon is now part of your Golden Thread journey.');
}
if(['localhost','127.0.0.1'].includes(location.hostname))window.partyTest={get game(){return game;},get state(){return state;},openPanel,closePanel,action};
function isHost() { return state && ['birthday', 'companion'].includes(state.self.role); }
async function startGame(id) { if (!isHost()) return; await action({ type: 'start-game', game: id }); closePanel(); }
function closePanel() { closeWardrobePreview(); panel.close(); activePanel = null; if (game) { game.life?.closeInterior(); game.input.blocked = false; game.input.reset(); } }
function beginPanel(name, eyebrow, heading, description) {
  closeWardrobePreview();
  if (name !== 'van') game?.life?.closeInterior();
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
  if (name === 'journey') return renderJourney();
  if (name === 'chronicle') return renderChronicle();
  if (name === 'festival') return renderFestival();
  if (name === 'life') return renderLife();
  if (['journal','bag','craft','trade','friends','home','rides','van','company'].includes(name)) return game.life.open(name);
  if (name === 'welcome') {
    beginPanel(name, 'A LITTLE MAGIC, JUST FOR YOU', `Welcome, ${state.self.name}.`, 'This evening is yours to explore. Your private companions are visible and audible only to you. Other guests do not receive their presence, and the shared album gives guests a view without them.');
    const names = state.players.filter(p => isPrivate(p.role)).map(p => p.name);
    content.append(el('p', names.length ? `With you tonight: ${names.join(', ')}.` : 'Your private companions will appear when they join.', 'privacy-note'));
    content.append(el('p', 'Your golden-thread companion follows you automatically. His microphone reaches only you; choose Private voice in Audio when you reply.', 'privacy-note'));
    content.append(button('Let the evening begin', closePanel, 'gold-button')); return;
  }
  beginPanel('help', 'MAKE YOURSELF AT HOME', 'A little field guide.', 'Drag the world to turn the camera. Scroll to come closer. On a phone, drag the left half to walk and the right half to look.');
  const keys = el('div', undefined, 'keyboard');
  for (const [k, v] of [['WASD / arrows','Walk'],['Shift','Run'],['F','Toggle flight outside arena rounds'],['Space / X','Jump or rise / descend'],['E','Collect, solve a beacon, tag, find, or fire'],['R / click','Fire a light pulse in laser tag'],['T','Twirl'],['P','Save a polaroid'],['Q (hold)','Push to talk after enabling your microphone'],['Esc','Close a panel']]) { const row = el('div'); row.append(el('kbd', `${k} `), document.createTextNode(` · ${v}`)); keys.append(row); }
  content.append(keys);
  const row = el('div', undefined, 'button-row'); row.append(button('Automatic graphics', () => game.setQuality('auto')), button('Low graphics', () => game.setQuality('low')), button('High graphics', () => game.setQuality('high')), button('Return to meadow', () => { game.travel({ x:0,y:0,z:70,name:'Meadow' }); closePanel(); })); content.append(row);
  content.append(el('p', 'Your invitation belongs to one player. Reopening it in another browser moves your session there. Audio starts only with your permission.'));
}
function renderGames() {
  beginPanel('games', 'A LITTLE FRIENDLY COMPETITION', 'Nine ways to make memories.', 'Every round is shared by the party. Explore between rounds, or play through the evening’s playlist. Tag, hide-and-seek and laser tag need two visible players.');
  if (isHost()) {
    const row = el('div', undefined, 'button-row');
    row.append(button(playlist ? 'Stop the playlist' : 'Play the nine-game playlist', async () => { if (playlist) { playlist = null; renderGames(); } else { playlist = { index: 0 }; await startGame(GAMES[0].id); } }, 'gold-button'), button('Gather everyone for the cake', async () => { playlist = null; await action({ type: 'rally' }); closePanel(); })); content.append(row);
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
  beginPanel('map', 'FOLLOW THE GOLDEN PATH', 'A world worth wandering.', 'The twenty lands keep their original places. A raised golden causeway crosses above them to the Great Palace in the north. Take a skyboat, drive, or walk the long route.');
  if (state.self.role === 'observer') { content.append(el('p', 'Your character follows the birthday guest automatically, including on her skyboat journeys. You can turn and zoom the camera.')); return; }
  appendAtlas(content,game,d=>{game.travel(d);closePanel();});
  const grid = el('div', undefined, 'card-grid');
  for (const d of game.scenery.destinations || []) grid.append(button('', () => { game.travel(d); closePanel(); }, 'destination'));
  [...grid.children].forEach((b, i) => { const d = game.scenery.destinations[i]; b.append(el('strong', d.name), el('small', 'TAKE A SKYBOAT ↗')); });
  content.append(grid, el('h3', 'The lands of Golden Thread'));
  const lands = el('div', undefined, 'card-grid');
  for (const r of REGIONS) { const c = regionCenter(r); const b = button('', () => { game.travel({ x:c.x+12,z:c.z+70,name:r.name }); closePanel(); }, 'destination'); b.append(el('strong', r.name), el('small', r.subtitle)); lands.append(b); } content.append(lands);
}
function renderJourney() {
  const info=layout.JOURNEY_INFO||{title:'The Twenty Lights',premise:'Gather twenty little lights for the palace birthday crown.'};
  beginPanel('journey','A STORY ACROSS TWENTY LANDS',info.title,info.premise);
  const trail=state.party.journey,partyTrail=state.party.partyJourney||trail;
  const observing=state.self.role==='observer';
  const row=el('div',undefined,'button-row');
  if(!trail){if(isHost())row.append(button('Begin the journey',async()=>{playlist=null;await action({type:'start-journey'});renderJourney();},'gold-button'));else content.append(el('p','The host can begin the story whenever the party is ready. The nine minigames remain available between chapters.'));}
  else if(trail.complete){content.append(el('h3','Twenty lights. One birthday crown.'),el('p','Every beacon is shining. Return to the palace for the constellation finale.'));if(isHost())row.append(button('Gather for the crown finale',async()=>{await action({type:'journey-finale'});closePanel();},'gold-button'));}
  else{
    const quest=trail.current;content.append(el('div',`CHAPTER ${trail.chapter+1} / 20 · ${quest.act?.title||''}`,'eyebrow'),el('h3',`${quest.name} · ${quest.title}`),el('p',quest.intro));
    const progress=el('div',undefined,'journey-progress');for(let i=0;i<20;i++)progress.append(el('span',i<trail.stars?'✦':'·',i<trail.stars?'complete':''));content.append(progress);
    if(trail.waiting)content.append(el('p','Your light is ready. Enjoy the view while the party lights this beacon.'));
    else if(!observing){
      const point=trail.stage==='collect'?quest.collect:quest.beacon;
      const distance=Math.round(Math.hypot(game.pos.x-point.x,game.pos.z-point.z));
      content.append(el('p',`${trail.stage==='collect'?quest.collectText:'Bring the keepsake’s light to the violet beacon.'} ${distance} metres away.`));
      row.append(button('Skyboat to my next objective',()=>{game.travel({...point,name:`${quest.name} · ${trail.stage==='collect'?'collector':'beacon'}`});closePanel();}));
      if(trail.stage==='collect')row.append(button('Recover the keepsake',async()=>{await game.send();await action({type:'journey-collect',chapterId:quest.id});},'gold-button'));
      else{content.append(el('h3',quest.puzzle.prompt));const choices=el('div',undefined,'journey-choices');quest.puzzle.options.forEach((option,answer)=>choices.append(button(option,async()=>{await game.send();await action({type:'journey-light',chapterId:quest.id,answer});audio.tone(880,.6);})));content.append(choices);}
    }
    if(isHost()&&partyTrail?.current)row.append(button(`Gather everyone in ${partyTrail.current.name}`,async()=>{playlist=null;await action({type:'journey-travel'});closePanel();}));
  }
  content.append(row);
  if(state.self.role==='companion'&&trail)content.append(el('p','Your trail and wisp rounds stay private. Your actions never reveal you to the other guests. The host’s gathering button follows the party’s current chapter.','privacy-note'));
  const catalog=el('div',undefined,'journey-catalog');
  for(const [index,chapter]of(layout.JOURNEY_CATALOG||[]).entries()){const item=el('section',undefined,'journey-chapter');item.append(el('span',trail?.completed.includes(chapter.id)?'✦':String(index+1).padStart(2,'0'),'chapter-number'),el('div',undefined,'chapter-copy'));item.lastChild.append(el('strong',chapter.name),el('small',chapter.title));catalog.append(item);}content.append(catalog);
}
function renderWardrobe() {
  return renderFullWardrobe({game,state,action,toast,beginPanel,content});
}
function renderLife() {
  beginPanel('life','THE GOLDEN THREAD WORLD','A little life along the way.','Meet each land’s Keeper, learn a craft, help the townspeople, and make a home. Your party adventures are always waiting in Play and Story.');
  if(state.self.role==='observer'){content.append(el('p','You follow the birthday guest and can speak to her through Audio.'));return;}
  const grid=el('div',undefined,'card-grid');
  for(const[id,title,description]of[['journal','Journeys & wonders','Twenty original chapters, side quests and hidden places.'],['bag','Bag & supplies','Your gathered materials, coins and keepsakes.'],['craft','Eight crafts','Learn from Keepers and turn materials into useful gifts.'],['trade','Local markets','Buy local materials and trade your creations.'],['friends','Friends & letters','Meet residents, exchange gifts, and answer their requests.'],['company','Travelling company','Invite the original fictional travellers and pets under their chapter and friendship rules.'],['home','Homes & gardens','Buy land, decorate, grow crops and care for animals.'],['rides','The travelling garage','Car, van, truck, biplane, unicorn and dragon.'],['van','Safar’s cabin','A home on wheels, decorated in your favourite colours.']]) {const b=button('',()=>game.life.open(id),'destination');b.append(el('strong',title),el('small',description));grid.append(b);}content.append(grid);
  content.append(el('p','Walk close to a resident, animal or glowing resource and press E. Your personal finds and home are saved in this browser; the party, games, outfits and rides are shared live.'));
}
function renderChronicle(){
  beginPanel('chronicle','THE GOLDEN THREAD','One world. An evening of stories.','The lands’ lanterns are fading. Meet their Keepers, learn their crafts and bring a little light back to each place. Tonight, those same roads lead to a birthday at the Great Palace.');
  if(state.self.role==='observer'){content.append(el('p','You follow the birthday guest through her journey. Your private voice remains available in Audio.'));return;}
  const personal=game.life.st,festival=state.party.festival;
  content.append(el('div',`${personal.lanterns.length} / 20 original lanterns · ${state.party.journey?.stars||0} / 20 party beacons · ${festival?.keepsakes.length||0} party rounds remembered`,'chronicle-progress'));
  const grid=el('div',undefined,'card-grid');
  for(const[eyebrow,title,copy,target]of[
    ['I · THE ORIGINAL JOURNEY','Keep the world’s light','Follow every original chapter and side quest. Gather, craft, trade, make friends, care for animals and find a home.','journal'],
    ['II · A BIRTHDAY TRAIL','The Twenty Lights','Take the party through the existing twenty lands. Find keepsakes and solve each beacon together.','journey'],
    ['III · PLAY ALONG THE WAY','Nine shared adventures','Race the causeway, fly through sky rings, remember constellations, deliver the cake and play tag, hide-and-seek or laser tag.','games'],
    ['IV · THE PALACE EVENING','A wish under the stars','Travel by unicorn chariot, choose from the entire wardrobe, release lanterns, blow out the candles and cut the birthday cake.','festival']
  ]){const card=el('section',undefined,'game-card');card.append(el('div',eyebrow,'eyebrow'),el('h3',title),el('p',copy),button('Continue this story',()=>openPanel(target),'gold-button'));grid.append(card);}content.append(grid);
  content.append(el('p','Your original journey keeps its earned skills, coins, vehicle requirements and saved progress. The birthday gathering can begin whenever the host is ready.'));
}
function renderFestival(){
  const f=state.party.festival;
  beginPanel('festival','THE GREAT PALACE EVENING','A birthday woven into the journey.','Every lantern lit along the road has brought a little more wonder to this world. Now the crown garden is ready for a birthday wish, a first slice of cake, and a sky full of light.');
  const observing=state.self.role==='observer',privateGuest=isPrivate(state.self.role),stage=f?.stage||'waiting';
  const steps=el('div',undefined,'festival-steps');
  for(const[id,label]of[['lanterns','Lanterns & a wish'],['cake','The first slice'],['fireworks','A sky full of light'],['afterparty','The journey continues']])steps.append(el('span',label,id===stage?'current':''));content.append(steps);
  if(stage==='waiting'){
    content.append(el('p','Meet people, follow a story or enjoy a minigame until the host calls everyone to the palace.'));
    if(isHost())content.append(button('Gather everyone at the Great Palace',async()=>{await action({type:'rally'});closePanel();},'gold-button'));
  }else{
    content.append(el('p',`${f.lanternsReleased} wish lantern${f.lanternsReleased===1?'':'s'} released · ${f.optionalStory.beaconsLit} / 20 party beacons · ${f.keepsakes.length} completed rounds`));
    const row=el('div',undefined,'button-row');
    if(!observing){
      row.append(button('Ride to the crown garden',()=>{game.travel({...layout.CAKE_SPOT,z:layout.CAKE_SPOT.z+14,name:'Crown Garden'});closePanel();}));
      if(stage==='lanterns')row.append(button(privateGuest?'Send a private birthday wish':'Release my birthday wish',()=>renderWishes(),'gold-button'));
      if(state.self.role==='birthday'&&stage==='lanterns')row.append(button('Make my wish · blow out the candles',async()=>{await game.send();await action({type:'festival',event:'blow-candles'});renderFestival();},'gold-button'));
      if(state.self.role==='birthday'&&stage==='cake')row.append(button('Cut the birthday cake',async()=>{await game.send();await action({type:'festival',event:'cut-cake'});audio.tone(784,.7);renderFestival();},'gold-button'));
      if(isHost()&&stage==='fireworks')row.append(button('Keep this memory · begin the afterparty',async()=>{await action({type:'festival',event:'finish-finale'});closePanel();},'gold-button'));
    }
    content.append(row);
    if(stage==='lanterns')content.append(el('p','The birthday guest can make her wish and blow out the candles when she is ready. Come close to the cake for the birthday activities.'));
    if(stage==='cake')content.append(el('p','The candles are out. Gather around for the birthday guest’s first slice.'));
    if(stage==='fireworks')content.append(el('p','The original Golden Thread celebration fills the courtyard: rose petals, rainbow dust, lanterns, unicorns, a circling dragon and guests from every land.'));
    if(stage==='afterparty')content.append(el('p','The celebration becomes part of your saved journey. Your night dragon awaits under Living → Rides; every unfinished quest, home and friendship is still yours.'));
  }
  if(!observing){const row=el('div',undefined,'button-row');row.append(button('The complete dressing room',()=>openPanel('wardrobe')),button('Save a birthday polaroid',()=>game.photo()),button('Play another shared game',()=>openPanel('games')));if(state.self.role==='birthday')row.append(button('Wear the original Starlight Gown',async()=>{await action({type:'outfit',avatar:'g-starlight-gown'});toast('The Starlight Gown is ready for your evening.');}));content.append(row);}
}
function renderAudio() {
  beginPanel('voice', 'SOUNDTRACK TO THE EVENING', 'A little closer, by voice.', 'Voice is optional. Enable your microphone, then hold Q or the talk button to speak. Music and effects are made in your browser.');
  const row = el('div', undefined, 'button-row'); row.append(button('Enable sound', () => audio.unlock()), button(audio.mic ? 'Turn microphone off' : 'Enable microphone', async () => { if (audio.mic) audio.disableMic(); else await audio.enableMic(); renderAudio(); })); content.append(row);
  if (audio.mic) { const talk = button('Hold to talk', () => {}, 'gold-button'); talk.onpointerdown = e => { talk.setPointerCapture(e.pointerId); audio.setTalking(true); }; talk.onpointerup = talk.onpointercancel = () => audio.setTalking(false); content.append(talk); }
  if (state.self.role === 'birthday') {
    const field = el('label', 'Speak to', 'field'); const select = el('select'); for (const [v,l] of [['guests','Party guests'],['private','Private voice']]) { const option = el('option',l); option.value=v; option.selected=audio.channel===v; select.append(option); }
    select.onchange = () => { audio.setTalking(false); audio.channel=select.value; audio.applyTracks(); toast(`Voice channel: ${select.selectedOptions[0].textContent}.`); }; field.append(select); content.append(field, el('p','Private companions’ audio reaches only you. Select the private channel before replying to them.', 'privacy-note'));
  } else if (isPrivate(state.self.role)) content.append(el('p',state.self.role === 'observer' ? 'You are here to watch and speak privately with the birthday guest. Your character follows her automatically. Nobody else receives your character or your microphone.' : 'Your microphone reaches only the birthday guest. Party guests cannot see or hear you.', 'privacy-note'));
  const switches = el('div', undefined, 'button-row'); switches.append(button(audio.music ? 'Music: on' : 'Music: off', async () => { await audio.unlock(); audio.music=!audio.music; renderAudio(); }), button(audio.effects ? 'Effects: on' : 'Effects: off', () => { audio.effects=!audio.effects; renderAudio(); })); content.append(switches);
  const volume = el('label','Party volume','field'); const slider = el('input'); slider.type='range';slider.min='0';slider.max='1';slider.step='.05';slider.value=String(audio.volume); slider.className='volume'; slider.oninput=()=>audio.setVolume(slider.value); volume.append(slider);content.append(volume);
}
let memoryTimeouts = [];
function renderMemory() {
  beginPanel('memory','CONSTELLATION ECHOES','Watch. Remember. Shine.','Watch five symbols glow, then tap them in the same order. You can replay the pattern.');
  memoryTimeouts.forEach(clearTimeout); memoryTimeouts=[];
  if (state.self.role === 'observer') { content.append(el('p', 'You are watching this round. Enjoy the stars with the birthday guest.')); return; }
  if (state.party.game !== 'starlight-memory') { content.append(el('p','The constellation round has not started yet.'));return; }
  const sequence = state.party.round?.sequence || []; let answer=[], watching=true;
  const progress=el('div','','memory-progress'), grid=el('div',undefined,'memory-keys');
  const keys = SYMBOLS.map((symbol,index)=> { const b=button(symbol,async()=>{ if(watching)return;audio.tone(330+index*90); answer.push(index);progress.textContent=answer.map(i=>SYMBOLS[i]).join(' ');if(answer.length===sequence.length){try{await action({type:'submit-sequence',sequence:answer});toast('Your constellation is shining. One more birthday star earned!');}catch{toast('Try again — your stars are still waiting.');}answer=[];} });grid.append(b);return b; });
  const play=()=>{watching=true;answer=[];progress.textContent='Watch the stars…'; keys.forEach(b=>b.classList.remove('lit')); sequence.forEach((n,i)=>{memoryTimeouts.push(setTimeout(()=>{keys[n]?.classList.add('lit');audio.tone(330+n*90,.4);},600+i*850));memoryTimeouts.push(setTimeout(()=>keys[n]?.classList.remove('lit'),1200+i*850));});memoryTimeouts.push(setTimeout(()=>{watching=false;progress.textContent='Your turn';},650+sequence.length*850));};
  content.append(grid,progress,button('Replay the constellation',play)); play();
}
function renderWishes() {
  beginPanel('wishes','MAKE A LITTLE WISH','Send a lantern into the sky.','Your birthday wish is delivered to the birthday guest. A little light rises into your world.');
  if (state.self.role === 'observer') { content.append(el('p', 'Open Audio to share your wish privately with the birthday guest.')); return; }
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
    this.camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.1,7000);this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.14;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));host.replaceChildren(this.renderer.domElement);
    this.input=new Input(this.renderer.domElement);this.world=new World();this.sky=new Sky();this.scene.add(this.world.group,this.sky.group,this.sky.sunLight,this.sky.sunLight.target,this.sky.hemi);this.scene.fog=this.sky.fog;
    this.scene.add(new THREE.HemisphereLight('#c2d2ff','#695465',.5));this.scenery=new PartyScenery(this.scene,'low');
    this.adventures=new Adventures(this.scene,layout,this.scenery);
    this.thread=new Thread();this.thread.group.visible=false;this.scene.add(this.thread.group);this.threadA=new THREE.Vector3();this.threadB=new THREE.Vector3();
    this.players=new Map();this.pos=new THREE.Vector3(layout.SPAWN.x,0,layout.SPAWN.z);this.pos.y=this.scenery.ground(this.pos.x,this.pos.z);this.yaw=0;this.pitch=.25;this.distance=10;this.fly=false;this.vy=0;this.t=0;this.last=performance.now();this.lastSend=0;this.sending=false;this.lastCollect=0;this.pending=false;this.checkpoint=0;this.trip=null;this.photoBusy=false;this.lastPhase='';
    this.vehicle='walk';this.vehicleModels=new Map();
    this.camera.position.copy(this.pos).add(new THREE.Vector3(0,6,10));this.camera.lookAt(this.pos.clone().add(new THREE.Vector3(0,1.3,0)));
    this.life=new PartyLife(this,{toast,openPanel:(...args)=>{beginPanel(...args);return content;}});
    // Reuse Golden Thread's movement rules. Its local visual pair stays offscreen;
    // the invitation-filtered multiplayer models are the only rendered travellers.
    const collisionWorld=Object.create(this.world);collisionWorld.resolve=(p,r)=>{this.world.resolve(p,r);this.scenery.resolve(p,r);};
    const ground=(x,z,y=Infinity)=>this.scenery.ground(x,z,y);
    this.controller=new Travellers(new THREE.Scene(),collisionWorld,this.life.st,OUTFITS['g-kurti-jeans'],OUTFITS['b-kurta-jeans'],{surfaceAt:ground,groundAt:ground,terrainHeight:(x,z)=>ground(x,z,this.pos.y+2)});
    this.controller.gPos.copy(this.pos);this.controller.bPos.copy(this.pos).add(new THREE.Vector3(1.95,0,0));
    this.atmosphere=new PartyAtmosphere(this);
    this.celebration=new PartyCelebration(this);
    try{const saved=localStorage.getItem('starlight/quality');if(['auto','low','high'].includes(saved))this.atmosphere.setQuality(saved);}catch{}
    this.pickups=new Map();this.rings=[];this.ingredients=[];
    const glow=new THREE.MeshBasicMaterial({color:'#f2cd87'});
    for(const p of layout.LANTERN_PICKUPS){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.85),glow);m.position.set(p.x,this.scenery.ground(p.x,p.z)+2,p.z);this.scene.add(m);this.pickups.set(p.id,m);}
    for(const p of layout.SKY_RINGS||[]){const m=new THREE.Mesh(new THREE.TorusGeometry(5,.2,6,36),glow.clone());m.position.set(p.x,p.y,p.z);this.scene.add(m);this.rings.push(m);}
    const ingredientCoords=layout.INGREDIENTS||[{x:-65,y:0,z:25},{x:65,y:0,z:25},{x:0,y:0,z:-100}];
    ingredientCoords.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2),new THREE.MeshStandardMaterial({color:['#eea4be','#b4deca','#f1d49e'][i],emissive:'#68434e',emissiveIntensity:.4}));m.position.set(p.x,this.scenery.ground(p.x,p.z)+1.5,p.z);this.scene.add(m);this.ingredients.push(m);});
    this.clockTimer=setInterval(()=>this.objective(),200);this.resize=()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.atmosphere?.resize();this.life?.resize();};addEventListener('resize',this.resize);this.resize();
    this.renderer.setAnimationLoop(()=>this.frame());
    let pointer=null;this.renderer.domElement.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};});this.renderer.domElement.addEventListener('pointerup',e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)<7&&state?.party.game==='laser-tag'&&!this.input.blocked)this.interact();pointer=null;});
  }
  stop(){this.renderer.setAnimationLoop(null);clearInterval(this.clockTimer);removeEventListener('resize',this.resize);closeWardrobePreview();this.life?.destroy();this.celebration?.destroy();this.atmosphere?.destroy();this.renderer.dispose();audio.close();}
  setQuality(quality){this.atmosphere.setQuality(quality);this.resize();try{localStorage.setItem('starlight/quality',quality);}catch{}toast(`${quality==='auto'?'Automatic':quality==='high'?'High':'Low'} graphics selected.`);}
  setVehicle(id){if(this.self.role==='observer')return 'You follow automatically.';if(!VEHICLES[id])return 'That ride is unavailable.';if(!this.life.st.vehicles.includes(id))return 'You do not own this ride yet.';if(state?.party.phase==='playing')return 'Finish this round before changing rides.';this.controller.gPos.copy(this.pos);const err=this.controller.setMode(id);if(err)return err;this.pos.copy(this.controller.gPos);this.vehicle=id;this.fly=['fly','plane','dragon'].includes(id);this.vy=0;this.distance=Math.max(this.distance,id==='dragon'?18:id==='plane'?16:10);this.send();return null;}
  sync(next,previous){
    this.party=next.party;
    const present=new Set(next.players.map(p=>p.id));for(const[id,p]of this.players)if(!present.has(id)){this.scene.remove(p.model.root);p.model.root.traverse(o=>o.geometry?.dispose());if(p.ride){this.scene.remove(p.ride.root);p.ride.root.traverse(o=>o.geometry?.dispose());}this.players.delete(id);}
    for(const data of next.players){let p=this.players.get(data.id);const outfitId=OUTFITS[data.avatar]?data.avatar:(data.isBirthday||data.role==='birthday'?'g-star':'b-moon');
      if(!p){const identity=data.isBirthday?'girl':data.role==='observer'||data.id===next.self.id&&next.self.role==='observer'?'boy':null;const model=new CharacterModel(OUTFITS[outfitId],'#b88b70',identity?HERO_SCALE[identity]:1,identity==='boy'?-1:1,identity);model.root.name=data.id;const label=this.nameTag(data.name);label.position.y=2.35;const statusRing=new THREE.Mesh(new THREE.TorusGeometry(.8,.055,4,24),new THREE.MeshBasicMaterial({color:'#b9f0ed'}));statusRing.rotation.x=Math.PI/2;statusRing.position.y=.09;model.root.add(label,statusRing);this.scene.add(model.root);p={model,label,statusRing,target:new THREE.Vector3(data.x,data.y,data.z),yaw:data.yaw||0,outfitId,last:new THREE.Vector3(data.x,data.y,data.z),data};model.root.position.copy(p.target);this.players.set(data.id,p);}
      p.data=data;p.target.set(data.x,data.y,data.z);p.yaw=data.yaw||0;
      if(p.outfitId!==outfitId){p.outfitId=outfitId;p.model.setOutfit(OUTFITS[outfitId]);}
      p.label.visible=next.party.game!=='hide-and-seek'||isPrivate(data.role);
      p.statusRing.visible=Boolean(next.party.chase?.publicStatus?.[data.id]);p.statusRing.material.color.set(next.party.chase?.itId===data.id?'#ffadd9':next.party.chase?.seekerId===data.id?'#ffe0a0':next.party.chase?.foundIds?.includes(data.id)?'#8a7d9a':'#b9f0ed');
      if(data.id===next.self.id){const changed=previous?.party.game!==next.party.game||previous?.party.phase!==next.party.phase;const transferred=previous?.party.teleportVersion!==next.party.teleportVersion;if(!previous||changed&&p.target.distanceTo(this.pos)>5||transferred||next.self.role==='observer'&&p.target.distanceTo(this.pos)>40){this.pos.copy(p.target);if(next.self.role!=='observer')this.pos.y=Math.max(this.pos.y,this.scenery.ground(this.pos.x,this.pos.z,this.pos.y));this.fly=false;this.trip=null;this.checkpoint=0;this.input.reset();}}
    }
    if(previous?.party.game!==next.party.game){this.checkpoint=0;this.pending=false;if(next.party.game){this.vehicle='walk';this.fly=false;this.life?.closeInterior();}}
    this.self=next.self;const observing=next.self.role==='observer';document.querySelector('.touch-actions').hidden=observing;document.querySelector('.desktop-hint').textContent=observing?'Following automatically · Drag to look · Scroll to zoom · Q private voice · P photo':'WASD move · Drag to look · Shift run · F fly · Space rise · E interact · P photo';$('wish-button').hidden=observing;this.objective();
  }
  nameTag(name){const c=document.createElement('canvas');c.width=512;c.height=88;const ctx=c.getContext('2d');ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillStyle='#171329bb';ctx.fillRect(50,8,412,66);ctx.fillStyle='#f9e8c7';ctx.fillText(name,256,50);const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false});const sprite=new THREE.Sprite(material);sprite.scale.set(3.3,.57,1);return sprite;}
  objective(){if(!state)return;const party=state.party,spec=GAMES.find(g=>g.id===party.game),progress=party.selfProgress||{};
    if(this.self.role==='observer'){const birthday=state.players.find(p=>p.isBirthday);text('objective-label','A LITTLE MAGIC, JUST FOR HER');text('objective-title',`Following ${birthday?.name||'the birthday guest'}.`);text('objective-description','Your golden thread keeps you by her side. Turn the camera and enjoy the evening together.');text('objective-progress','✧ Only she can see you · Open Audio to speak privately');}
    else if(party.phase==='journey-travel'){text('objective-label','THE NEXT LIGHT IS CALLING');text('objective-title','The skyboat is gathering everyone.');text('objective-description','A new chapter is waiting in another corner of the world.');text('objective-progress','✦ Five seconds to the next destination');}
    else if(party.phase==='rally'){text('objective-label','THE PALACE IS CALLING');text('objective-title','Everyone, to the cake.');text('objective-description','A skyboat is on its way for everyone. Finish your little moment, then gather at the palace.');text('objective-progress','✦ The celebration is about to begin');}
    else if(spec){text('objective-label',`${spec.icon} PARTY CHALLENGE`);text('objective-title',spec.title);text('objective-description',spec.goal);let detail=spec.objective;
      if(party.game==='lantern-hunt')detail=`${party.round?.items?.filter(i=>i.found).length||0} / 12 lanterns found`;
      if(party.game==='bridge-dash'||party.game==='sky-rings')detail=`${progress.checkpoint??this.checkpoint} / 5 gates crossed`;
      if(party.game==='cake-courier')detail=progress.carrying!==undefined&&progress.carrying!==null?`Carrying an ingredient · deliver at the cake`:`${Array.isArray(progress.delivered)?progress.delivered.length:progress.delivered||0} / 3 ingredients delivered`;
      if(party.game==='starlight-memory')detail=progress.sequenceDone?'✦ Your constellation is complete':'Open Play → constellation, or press E';
      if(party.game==='starlight-statues'){const started=party.round?.startedAt??party.startedAt??(party.endsAt-60000);const red=(Date.now()-started)%10000>=6000;detail=red?'● STILL — hold your pose':'● GO — run, dance, or twirl';text('movement-mode',red?'FREEZE':'MOVE');}
      if(party.game==='tag')detail=party.chase?.itId===state.self.id?'✺ You have the light — catch someone and press E':'Stay free of the glowing player until the timer ends';
      if(party.game==='hide-and-seek'){const chase=party.chase;detail=chase?.seekerId===state.self.id?(Date.now()<chase.hideUntil?`Counting… ${Math.max(0,Math.ceil((chase.hideUntil-Date.now())/1000))}`:`Find the hiders · ${chase.foundIds.length} found`):chase?.foundIds.includes(state.self.id)?'Found — watch the rest of the round':Date.now()<chase?.hideUntil?'Find a hiding place behind cover':'Stay hidden from the seeker';}
      if(party.game==='laser-tag')detail=party.chase?.self.health===0?'Your shields are recharging…':`${'◈'.repeat(party.chase?.self.health||0)} shields · E / R / tap to fire`;
      if(party.chase?.practice)detail=`Private wisps · ${detail}`;
      text('objective-progress',detail);
    }else if(party.phase==='celebration'){
      const f=party.festival,stage=f?.stage||'lanterns',birthday=this.self.role==='birthday';
      const beat={lanterns:['A sky full of wishes.','Release a wish lantern, then gather around the birthday cake.',birthday?'E at the cake · Make your wish and blow out the candles':`${f?.lanternsReleased||0} wish lanterns released · Story → Celebration`],cake:['Time for the first slice.','The candles are out. The palace is waiting for the birthday guest to cut the cake.',birthday?'E at the cake · Cut the birthday cake':'Gather at the cake for the first slice'],fireworks:['The stars are celebrating.','Enjoy the original lanterns, petals, rainbows and palace fireworks together.','Story → Celebration · Keep a polaroid of this moment'],afterparty:['The evening is yours.','Take a dragon ride, return to the twenty lands, or play another round together.','Story → Celebration · Play · Wardrobe']}[stage]||['A birthday among the stars.','Gather at the palace cake for the birthday celebration.','Story → Celebration'];
      text('objective-label','A BIRTHDAY AMONG THE STARS');text('objective-title',beat[0]);text('objective-description',beat[1]);text('objective-progress',beat[2]);
    }
    else if(party.journey?.active){const trail=party.journey,quest=trail.current;const point=quest&&(trail.stage==='collect'?quest.collect:quest.beacon);text('objective-label',`THE TWENTY LIGHTS · ${trail.stars} / 20`);text('objective-title',trail.complete?'The birthday crown is ready.':quest.title);text('objective-description',trail.complete?'Return to the palace and open Story for the crown finale.':trail.waiting?'Your light is ready. Enjoy the view while the party lights this beacon.':trail.stage==='collect'?`${quest.name}: ${quest.collectText}`:`Solve the clue at ${quest.name}’s violet beacon.`);text('objective-progress',point?`✧ ${Math.round(Math.hypot(this.pos.x-point.x,this.pos.z-point.z))} m · E at the marker · Story for skyboats`:'✦ All twenty beacons are shining');}
    else{const original=this.life.guide?.objective;text('objective-label','THE GOLDEN THREAD JOURNEY');text('objective-title',original?.title||'Follow your curiosity.');text('objective-description',original?.next?.text||'Meet the meadow Keeper, help the townspeople, or take a skyboat to the Great Palace.');text('objective-progress',original?.next?.hint||'Living → Journal · Play for party games');}
    $('aim-reticle').hidden=party.game!=='laser-tag'||this.self.role==='observer';
    const counting=party.chase?.kind==='hide-and-seek'&&party.chase.seekerId===state.self.id&&Date.now()<party.chase.hideUntil;$('seeker-screen').hidden=!counting;if(counting)text('seeker-count',Math.max(0,Math.ceil((party.chase.hideUntil-Date.now())/1000)));
    text('interact-button',party.game==='tag'?'E · Tag':party.game==='hide-and-seek'?'E · Find':party.game==='laser-tag'?'E · Fire':party.journey?.active?'E · Objective':'E · Collect');
    const end=party.rallyAt||party.travelAt||party.endsAt;const remaining=end?Math.max(0,Math.ceil((end-Date.now())/1000)):null;text('round-clock',remaining===null?'':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`);
  }
  toggleFlight(){if(this.self.role==='observer')return;if(state?.party.game==='bridge-dash'||CHASE_GAMES.includes(state?.party.game)){toast('Keep your feet on the ground during this round.');return;}const id=this.vehicle==='fly'?'walk':'fly';const err=this.setVehicle(id);if(err&&state?.party.phase==='playing'&&['sky-rings','cake-courier'].includes(state.party.game)){this.controller.gPos.copy(this.pos);const failure=this.controller.setMode(id);if(failure)return toast(failure);this.vehicle=id;this.fly=id==='fly';}else if(err)return toast(err);toast(this.fly?'Cape of light · Space rises; Shift or X descends.':'Back on foot.');}
  travel(destination){if(this.self.role==='observer'){toast('You follow the birthday guest automatically.');return;}if(state?.party.phase==='playing'){toast('Finish this round before taking a skyboat.');return;}const target=new THREE.Vector3(destination.x,destination.y??this.scenery.ground(destination.x,destination.z),destination.z);this.controller.grounded=true;this.controller.setMode('walk');this.vehicle='walk';this.trip={from:this.pos.clone(),to:target,start:this.t,duration:Math.min(10,Math.max(3,this.pos.distanceTo(target)/150))};this.fly=false;toast(`A skyboat to ${destination.name}.`);}
  async interact(){if(!state||this.pending||this.self.role==='observer')return;const party=state.party;try{this.pending=true;
    if(CHASE_GAMES.includes(party.game)){
      const chase=party.chase;if(!chase)return;
      if(!chase.self.canMove){toast('Hold your place until the countdown or recharge finishes.');return;}
      const targets=this.adventures.targets(state,this.pos).filter(p=>p.status?.health!==0&&!chase.foundIds?.includes(p.id));
      if(party.game==='laser-tag'){
        if(this.t-(this.lastShot??-1)<.7)return;this.lastShot=this.t;
        const forward=new THREE.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
        const aimed=targets.map(p=>({p,d:new THREE.Vector3(p.x-this.pos.x,p.y-this.pos.y,p.z-this.pos.z)})).filter(c=>c.d.length()<=60&&c.d.clone().normalize().dot(forward)>.985).sort((a,b)=>a.d.length()-b.d.length())[0];
        const direction=aimed?.d||forward;await this.send();const result=await action({type:'laser',direction:{x:direction.x,y:direction.y,z:direction.z}},true);audio.tone(result.hit?990:440,.1);return;
      }
      if(party.game==='tag'&&chase.itId!==state.self.id){toast('You are free — keep away from the glowing player!');return;}
      if(party.game==='hide-and-seek'&&chase.seekerId!==state.self.id){toast('Find a little cover and stay hidden.');return;}
      const limit=party.game==='tag'?3.2:5;const target=targets.map(p=>({p,d:Math.hypot(p.x-this.pos.x,p.y-this.pos.y,p.z-this.pos.z)})).filter(c=>c.d<=limit).sort((a,b)=>a.d-b.d)[0];
      if(!target){toast(party.game==='tag'?'Come a little closer to pass the light.':'Look around the cover and come closer to a hider.');return;}
      await this.send();await action({type:party.game==='tag'?'tag':'seek',targetId:target.p.id});audio.tone(880,.3);return;
    }
    if(party.game==='starlight-memory'){openPanel('memory');return;}
    if(party.game==='lantern-hunt'){const target=(party.round?.items||[]).filter(i=>!i.found).sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.z)-Math.hypot(b.x-this.pos.x,b.z-this.pos.z))[0];if(!target||Math.hypot(target.x-this.pos.x,target.z-this.pos.z)>8){toast('Follow a golden lantern and come a little closer.');return;}await action({type:'collect',itemId:target.id});audio.tone(990,.3);return;}
    if(party.game==='cake-courier'){const progress=party.selfProgress||{};if(progress.carrying!==null&&progress.carrying!==undefined){await action({type:'deliver-ingredient'});audio.tone(880,.4);toast('One ingredient delivered. The cake is coming together!');}else{const index=this.ingredients.findIndex((p,i)=>Math.hypot(p.position.x-this.pos.x,p.position.z-this.pos.z)<8&&!(progress.delivered||[]).includes(i));if(index<0){toast('Find one of the three pastel ingredient parcels in the meadow.');return;}await action({type:'pick-ingredient',index});toast('Ingredient collected. Fly it to the cake at the palace!');}return;}
    if(party.game==='starlight-statues'){this.twirlUntil=this.t+1;return;}
    if(party.phase==='celebration'&&this.pos.distanceTo(new THREE.Vector3(layout.CAKE_SPOT.x,layout.CAKE_SPOT.y,layout.CAKE_SPOT.z))<12){
      const stage=party.festival?.stage;
      if(this.self.role==='birthday'&&['lanterns','cake'].includes(stage)){
        await this.send();await action({type:'festival',event:stage==='lanterns'?'blow-candles':'cut-cake'});audio.tone(stage==='lanterns'?880:1320,.5);
      }else openPanel('festival');
      return;
    }
    const lift=this.scenery.lifts?.find(l=>this.pos.distanceTo(new THREE.Vector3(l.x,l.y,l.z))<8);
    if(lift){this.travel(lift.to);return;}
    if(party.journey?.active&&party.phase!=='playing'){const trail=party.journey;if(!trail.complete&&!trail.waiting){const point=trail.stage==='collect'?trail.current.collect:trail.current.beacon;if(Math.hypot(this.pos.x-point.x,this.pos.z-point.z)<=8){if(trail.stage==='collect'){await this.send();await action({type:'journey-collect',chapterId:trail.current.id});toast('Kept safe. Bring its light to the violet beacon.');}else openPanel('journey');return;}}}
    const van=this.controller.parkedVan;if(van&&this.pos.distanceTo(van.pos)<4.5){this.life.open('van');return;}
    if(this.life.interact())return;
    openPanel('life');
    }catch{}finally{this.pending=false;}}
  async send(){if(this.sending||!ticket||this.self.role==='observer')return;this.sending=true;try{await api('/api/move',{x:this.pos.x,y:this.pos.y,z:this.pos.z,yaw:this.bodyYaw||0,vehicle:this.trip?'chariot':this.vehicle},true);}catch(error){if(error.status===400&&(state?.party.game==='bridge-dash'||state?.party.chase)){const p=state.players.find(p=>p.id===this.self.id);if(p)this.pos.set(p.x,p.y,p.z);}}finally{this.sending=false;}}
  updateRide(p,mode,dt,speed){
    const vanStyle=JSON.stringify(this.life.st.van);
    if(p.rideMode!==mode||mode==='van'&&p.vanStyle!==vanStyle){
      if(p.ride){this.scene.remove(p.ride.root);p.ride.root.traverse(o=>o.geometry?.dispose());}
      p.rideMode=mode;p.vanStyle=vanStyle;p.ride=mode==='chariot'?new Chariot():buildVehicle(mode,this.life.st.van);
      if(p.ride){p.ride.root.name=`ride-${p.data.id}`;this.scene.add(p.ride.root);}
    }
    if(!p.ride)return;
    const root=p.model.root,heading=root.rotation.y;
    p.ride.root.position.copy(p.groundPos);p.ride.root.rotation.y=heading;p.ride.update(dt,speed,this.t,mode==='chariot');
    const seat=mode==='chariot'?CHARIOT_SEATS.girl:VEHICLES[mode]?.seats[0];
    if(seat){root.position.x+=seat.x*Math.cos(heading)+seat.z*Math.sin(heading);root.position.z+=-seat.x*Math.sin(heading)+seat.z*Math.cos(heading);root.position.y+=seat.y;}
    else if(mode==='unicorn')root.position.y+=1.1;
  }
  async checkpoints(){if(!state||this.pending||this.self.role==='observer')return;const id=state.party.game;if(id!=='bridge-dash'&&id!=='sky-rings')return;const points=id==='sky-rings'?layout.SKY_RINGS:layout.BRIDGE_CHECKPOINTS;const index=state.party.selfProgress?.checkpoint??this.checkpoint;const p=points?.[index];if(!p)return;const d=id==='sky-rings'?Math.hypot(this.pos.x-p.x,this.pos.y-p.y,this.pos.z-p.z):Math.hypot(this.pos.x-p.x,this.pos.z-p.z);if(d>6)return;this.pending=true;try{await this.send();await action({type:'checkpoint',index},true);this.checkpoint=index+1;audio.tone(660+index*90,.3);toast(index===4?'All five gates complete! A little stardust earned.':`Gate ${index+1} / 5`);}catch{}finally{this.pending=false;}}
  frame(){const now=performance.now(),dt=Math.min(.05,(now-this.last)/1000);this.last=now;this.t+=dt;
    if(this.input.hit('escape')&&panel.open)closePanel();
    const observing=this.self.role==='observer';
    if(!this.input.blocked&&!observing){for(const[key,name]of[['i','bag'],['j','journal'],['v','rides'],['n','friends'],['b','home'],['c','wardrobe'],['m','map']])if(this.input.hit(key))openPanel(name);}
    if(!this.input.blocked){if(this.input.hit('p'))this.photo();if(!observing){if(this.input.hit('f'))this.toggleFlight();if(this.input.hit('e')||this.input.hit('r')&&state?.party.game==='laser-tag')this.interact();if(this.input.hit('t'))this.twirlUntil=this.t+1.2;}}
    this.yaw-=this.input.dx*.004;this.pitch=THREE.MathUtils.clamp(this.pitch+this.input.dy*.003,-.1,1.1);this.distance=THREE.MathUtils.clamp(this.distance+this.input.wheel*.8,4,30);
    const frozen=observing||this.life.interior||Boolean(state?.party.chase&&!state.party.chase.self.canMove),old=this.pos.clone();
    if(state?.party.game==='bridge-dash'||state?.party.chase){this.fly=false;this.vehicle='walk';if(state?.party.chase)this.trip=null;}
    if(observing){this.fly=false;this.trip=null;const target=this.players.get(this.self.id)?.target;if(target)this.pos.lerp(target,1-Math.exp(-dt*14));const birthday=this.players.get(this.self.followingId);if(birthday){const safe=enforceGap(this.pos,birthday.model.root.position);this.pos.set(safe.x,safe.y,safe.z);this.bodyYaw=Math.atan2(birthday.model.root.position.x-this.pos.x,birthday.model.root.position.z-this.pos.z);}}
    else if(this.trip){const k=THREE.MathUtils.clamp((this.t-this.trip.start)/this.trip.duration,0,1);this.pos.lerpVectors(this.trip.from,this.trip.to,k*k*(3-2*k));this.pos.y+=Math.sin(k*Math.PI)*Math.min(95,this.trip.from.distanceTo(this.trip.to)*.15);if(k>=1)this.trip=null;}
    else{
      this.controller.gPos.copy(this.pos);this.controller.camYaw=this.yaw+Math.PI;
      if(this.controller.mode!==this.vehicle){this.controller.grounded=true;this.controller.setMode(this.vehicle);}
      const controls={dx:0,dy:0,wheel:0,axis:()=>frozen?{x:0,y:0}:this.input.axis(),held:k=>!frozen&&(this.input.held(k)||(k==='shift'&&this.fly&&this.input.held('x'))),hit:k=>!frozen&&this.input.hit(k)};
      if(!frozen)this.controller.update(dt,controls,this.t);
      this.pos.copy(this.controller.gPos);this.vehicle=this.controller.mode;this.fly=['fly','plane','dragon'].includes(this.vehicle);this.bodyYaw=this.controller.heading;
      if(['car','van','truck','plane','dragon'].includes(this.vehicle))this.yaw=this.controller.camYaw-Math.PI;
      for(const[id,p]of this.players)if(id!==this.self.id&&p.data.role!=='observer'&&Math.abs(p.model.root.position.y-this.pos.y)<2){const dx=this.pos.x-p.model.root.position.x,dz=this.pos.z-p.model.root.position.z,d=Math.hypot(dx,dz);if(d<1.8&&d>.001){this.pos.x+=dx/d*(1.8-d);this.pos.z+=dz/d*(1.8-d);}}
    }
    if(state?.party.chase)this.adventures.resolve(this.pos,.5);
    this.pos.x=THREE.MathUtils.clamp(this.pos.x,-1740,1740);this.pos.z=THREE.MathUtils.clamp(this.pos.z,-3450,1740);this.pos.y=THREE.MathUtils.clamp(this.pos.y,-10,880);
    if(!observing&&!['car','van','truck','plane','dragon'].includes(this.vehicle)&&old.distanceTo(this.pos)>.001)this.bodyYaw=Math.atan2(this.pos.x-old.x,this.pos.z-old.z);
    for(const[id,p]of this.players){
      const root=p.model.root;p.groundPos??=p.target.clone();
      if(id===this.self.id)p.groundPos.copy(this.pos);else p.groundPos.lerp(p.target,1-Math.exp(-dt*14));
      const moving=p.groundPos.distanceTo(p.last)/Math.max(dt,.001);p.last.copy(p.groundPos);root.position.copy(p.groundPos);
      root.rotation.y=id===this.self.id?(this.t<this.twirlUntil?this.t*5:this.bodyYaw||0):p.yaw;
      const mode=id===this.self.id?(this.trip?'chariot':this.vehicle):(p.data.vehicle||'walk');
      this.updateRide(p,mode,dt,moving);
      root.visible=id===this.self.id||p.groundPos.distanceTo(this.pos)<320;
      if(p.ride)p.ride.root.visible=root.visible;
      if(root.visible)p.model.update(dt,{speed:Math.min(10,moving),airborne:['fly','plane','dragon'].includes(mode),riding:!['walk','fly'].includes(mode),t:this.t});
    }
    const birthdayModel=[...this.players.values()].find(p=>p.data.isBirthday),observerModel=[...this.players.values()].find(p=>p.data.role==='observer'||observing&&p.data.id===this.self.id);
    if(birthdayModel&&observerModel&&(this.self.role==='birthday'||observing)){const a=birthdayModel.model.root.position,b=observerModel.model.root.position,safe=enforceGap(b,a);b.set(safe.x,safe.y,safe.z);if(observing)this.pos.copy(b);birthdayModel.model.root.updateMatrixWorld(true);observerModel.model.root.updateMatrixWorld(true);birthdayModel.model.handAnchor.getWorldPosition(this.threadA);observerModel.model.handAnchor.getWorldPosition(this.threadB);this.thread.update(this.threadA,this.threadB,Math.max(0,Math.min(1,(a.distanceTo(b)-1.95)/7.05)),3+(state?.party.journey?.stars||0),this.t,dt);this.thread.group.visible=true;}else this.thread.group.visible=false;
    for(const[id,m]of this.pickups){const item=state?.party.round?.items?.find(i=>i.id===id);m.visible=state?.party.game==='lantern-hunt'&&!item?.found;m.rotation.y=this.t*.8;m.position.y=this.scenery.ground(m.position.x,m.position.z)+2+Math.sin(this.t*2+m.position.x)*.3;}
    this.rings.forEach((m,i)=>{m.visible=state?.party.game==='sky-rings';m.material.color.set(i===(state?.party.selfProgress?.checkpoint??this.checkpoint)?'#fff0b0':'#9584bc');m.material.opacity=i<(state?.party.selfProgress?.checkpoint??this.checkpoint)?.2:1;m.material.transparent=true;if(i===0)m.lookAt(this.pos);else m.lookAt(this.rings[i-1].position);});
    this.ingredients.forEach((m,i)=>{m.visible=state?.party.game==='cake-courier'&&!(state.party.selfProgress?.delivered||[]).includes(i);m.rotation.y=this.t*.7;});
    const region=regionAt(this.pos.x,this.pos.z),night=this.atmosphere.update(dt,this.t,region,state?.party);
    if(this.t-(this.worldAt||-1)>.06){this.worldAt=this.t;this.world.update(this.pos,night);}
    this.life.update(dt,this.t,region,night);this.scenery.update(this.t,dt,state?.party.phase==='celebration',this.camera,night);this.celebration.update(dt,this.t,night,state?.party);this.adventures.update(state,this.t,dt);
    if(!observing){const parked=this.controller.parkedVan,style=JSON.stringify(this.life.st.van);if(!this.parkedView||this.parkedStyle!==style){if(this.parkedView){this.scene.remove(this.parkedView.root);this.parkedView.root.traverse(o=>o.geometry?.dispose());}this.parkedView=buildVehicle('van',this.life.st.van);this.parkedStyle=style;this.scene.add(this.parkedView.root);}this.parkedView.root.visible=Boolean(parked);if(parked){this.parkedView.root.position.copy(parked.pos);this.parkedView.root.rotation.y=parked.heading;}}
    const target=(observing&&birthdayModel?birthdayModel.model.root.position:this.pos).clone().add(new THREE.Vector3(0,1.3,0)),desired=target.clone().add(new THREE.Vector3(Math.sin(this.yaw)*this.distance,Math.sin(this.pitch)*this.distance+2.8,Math.cos(this.yaw)*this.distance));this.camera.position.lerp(desired,1-Math.exp(-dt*9));this.camera.lookAt(target);
    if(!this.photoBusy&&(!panel.open||this.t-(this.renderAt||-1)>.12)){this.atmosphere.render();this.renderAt=this.t;}
    const statueRed=state?.party.game==='starlight-statues'&&state.party.selfProgress?.statueStatus==='red';
    if(this.statueRed!==statueRed&&state?.party.game==='starlight-statues')audio.tone(statueRed?220:880,.35);
    this.statueRed=statueRed;audio.frozen=statueRed;
    audio.update(this.t);if(this.t-this.lastSend>.14){this.lastSend=this.t;this.send();this.checkpoints();}
    if(Math.floor(this.t*2)!==this.locationTick){this.locationTick=Math.floor(this.t*2);text('location-name',this.pos.z< -1850?'The Great Palace':this.pos.y>70&&this.pos.z<180?'The Golden Causeway':region.name);if(state?.party.game!=='starlight-statues')text('movement-mode',this.trip?'BY SKYBOAT':`${VEHICLES[this.vehicle].name.toUpperCase()}${this.vehicle==='fly'?' · '+Math.round(this.controller.energy*100)+'% LIGHT':''}`);const lift=this.scenery.lifts?.find(l=>this.pos.distanceTo(new THREE.Vector3(l.x,l.y,l.z))<8),van=this.controller.parkedVan,atCake=state?.party.phase==='celebration'&&this.pos.distanceTo(new THREE.Vector3(layout.CAKE_SPOT.x,layout.CAKE_SPOT.y,layout.CAKE_SPOT.z))<12;const hint=!observing&&state?.party.phase!=='playing'?(atCake?(this.self.role==='birthday'&&state.party.festival?.stage==='lanterns'?'Blow out the birthday candles':this.self.role==='birthday'&&state.party.festival?.stage==='cake'?'Cut the birthday cake':'Join the celebration'):lift?`Sky lift to ${lift.to.name}`:van&&this.pos.distanceTo(van.pos)<4.5?'Step inside Safar':this.life.hint()):'';text('nearby-prompt',hint?`E · ${hint}`:'');$('nearby-prompt').hidden=!hint;}
    this.input.endFrame();
  }
  snapshot(guestView=false){const hidden=[];for(const p of this.players.values())if(guestView&&(isPrivate(p.data.role)||isPrivate(this.self.role)&&p.data.id===this.self.id)){hidden.push([p.model.root,p.model.root.visible]);p.model.root.visible=false;if(p.ride){hidden.push([p.ride.root,p.ride.root.visible]);p.ride.root.visible=false;}}const threadVisible=this.thread.group.visible;if(guestView)this.thread.group.visible=false;
    this.adventures.guestPhoto(guestView);try{this.atmosphere.render();const c=document.createElement('canvas');c.width=960;c.height=780;const ctx=c.getContext('2d');ctx.fillStyle='#faf1e5';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(this.renderer.domElement,20,20,920,660);ctx.fillStyle='#433249';ctx.font='italic 27px Georgia';ctx.textAlign='center';ctx.fillText('A birthday under the stars.',480,730);return c.toDataURL('image/jpeg',.8);}finally{hidden.forEach(([o,v])=>{o.visible=v;});this.thread.group.visible=threadVisible;this.adventures.guestPhoto(false);this.atmosphere.render();}}
  async photo(){if(this.photoBusy||!state)return;this.photoBusy=true;try{const privateImage=this.snapshot(false),publicImage=this.self.role==='birthday'||isPrivate(this.self.role)?this.snapshot(true):privateImage;audio.tone(1200,.09);
    beginPanel('photo','A MOMENT, KEPT FOREVER','Your little polaroid.','Save it to your device, or add it to the birthday album.');const figure=el('figure',undefined,'polaroid'),img=el('img');img.src=privateImage;img.alt='Your birthday polaroid';figure.append(img,el('figcaption','A birthday under the stars.'));content.append(figure);
    const row=el('div',undefined,'button-row');const a=el('a','Save to my device ↗','gold-button');a.href=privateImage;a.download='starlight-polaroid.jpg';row.append(a);
    if(!isPrivate(this.self.role))row.append(button('Add to the birthday album',async()=>{await api('/api/photo',{publicImage,...(this.self.role==='birthday'?{privateImage}:{}),caption:'A birthday under the stars.'});toast('A new memory is waiting in the birthday album.');closePanel();}));
    if(this.self.role==='birthday'){const safe=el('a','Save the guest view','subtle-button');safe.href=publicImage;safe.download='starlight-guest-polaroid.jpg';row.append(safe);content.append(el('p','Your version keeps your private companions. The guest version leaves them out.', 'privacy-note'));}content.append(row);
    }catch(e){toast(`The photo could not be saved: ${e.message}`);}finally{this.photoBusy=false;}}
}
