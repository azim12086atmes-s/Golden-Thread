// Audio connections use only peers admitted by the server's recipient projection.
export class PartyAudio {
  constructor(send, onStatus = () => {}) {
    this.send = send; this.onStatus = onStatus; this.peers = new Map(); this.seen = new Set();
    this.self = null; this.players = []; this.mic = null; this.talking = false; this.routing = 0;
    this.channel = 'guests'; this.music = false; this.effects = true; this.volume = .65;
    this.handsFree = false; this.playbackBlocked = false;
    this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.context = null; this.lastNote = 0;
    addEventListener('keyup', e => { if (e.key.toLowerCase() === 'q') this.setTalking(this.handsFree); });
    addEventListener('keydown', e => { if (e.key.toLowerCase() === 'q' && !/INPUT|TEXTAREA/.test(e.target.tagName)) this.setTalking(true); });
    addEventListener('blur', () => this.mute());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.mute(); });
  }
  async unlock() {
    for (const p of this.peers.values()) p.audio.play().then(() => { this.playbackBlocked = false; }).catch(() => { this.playbackBlocked = true; });
    try { const Context = globalThis.AudioContext || globalThis.webkitAudioContext; if (Context) { this.context ??= new Context(); await this.context.resume(); } } catch { /* voice remains available */ }
  }
  async enableMic() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access needs HTTPS or localhost.');
    await this.unlock();
    if (!this.mic?.getAudioTracks().some(t => t.readyState !== 'ended')) {
      try { this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
      catch (error) { throw new Error(error.name === 'NotAllowedError' ? 'Microphone permission was blocked. Allow microphone access in this site’s browser settings, then try again.' : error.name === 'NotFoundError' ? 'No microphone was found. Check your headset or phone microphone.' : 'The microphone is busy. Close other calls or recording apps, then try again.'); }
      for (const track of this.mic.getAudioTracks()) track.onended = () => { this.mute(); this.onStatus('The microphone disconnected. Enable it again in Audio.'); };
      if (this.context?.createMediaStreamSource) {
        this.micSource?.disconnect(); this.micSource = this.context.createMediaStreamSource(this.mic);
        this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 256;
        this.micSource.connect(this.analyser); this.meterData = new Uint8Array(this.analyser.fftSize);
      }
    }
    this.mic.getAudioTracks().forEach(t => { t.enabled = false; });
    await this.applyTracks(); this.onStatus('Microphone ready, muted. Tap the mic button to talk, or hold Q.');
  }
  disableMic() {
    this.mute(); this.mic?.getTracks().forEach(t => { t.onended = null; t.stop(); }); this.mic = null;
    this.micSource?.disconnect(); this.micSource = null; this.analyser = null;
    this.applyTracks();
  }
  setTalking(value) {
    this.talking = Boolean(value && this.mic && !this.routing);
    this.mic?.getAudioTracks().forEach(t => { t.enabled = this.talking; });
  }
  mute() { this.handsFree = false; this.setTalking(false); }
  setHandsFree(value) { this.handsFree = Boolean(value && this.mic && !this.routing); this.setTalking(this.handsFree); }
  level() {
    if (!this.analyser || !this.talking) return 0;
    this.analyser.getByteTimeDomainData(this.meterData);
    let power = 0; for (const n of this.meterData) power += ((n - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(power / this.meterData.length) * 5);
  }
  canSendTo(player) {
    if (['companion','observer'].includes(this.self?.role)) return player.isBirthday;
    if (this.self?.role === 'birthday') return this.channel === 'private' ? ['companion','observer'].includes(player.role) : !['companion','observer'].includes(player.role);
    return true;
  }
  async applyTracks() {
    this.routing++; this.mute();
    try {
      const track = this.mic?.getAudioTracks()[0] ?? null;
      await Promise.allSettled([...this.peers.values()].filter(p => p.sender).map(p => p.sender.replaceTrack(this.canSendTo(p.player) ? track : null)));
    } finally { this.routing--; }
  }
  async refresh(players, self) {
    this.self = self; this.players = players;
    if (typeof RTCPeerConnection !== 'function') return;
    const allowed = players.filter(p => p.id !== self.id && (!['companion','observer'].includes(self.role) || p.isBirthday));
    const ids = new Set(allowed.map(p => p.id));
    for (const [id, p] of this.peers) if (!ids.has(id)) { p.pc.close(); p.audio.remove(); this.peers.delete(id); }
    for (const player of allowed) {
      const existing = this.peers.get(player.id);
      if (existing && existing.player.connectionId === player.connectionId) { existing.player = player; continue; }
      if (existing) { existing.pc.close(); existing.audio.remove(); this.peers.delete(player.id); }
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const audio = document.createElement('audio'); audio.autoplay = true; audio.playsInline = true; audio.volume = this.volume; audio.hidden = true; document.body.append(audio);
      // One side owns the offer. The answerer reuses its received audio transceiver,
      // avoiding duplicate m-lines when two phones join/enable microphones together.
      const initiator = self.id < player.id;
      const sender = initiator ? pc.addTransceiver('audio', { direction: 'sendrecv' }).sender : null;
      const peer = { pc, audio, player, sender, initiator, makingOffer: false, candidates: [], retries: 0 };
      this.peers.set(player.id, peer);
      pc.onicecandidate = e => { if (e.candidate && this.peers.get(player.id) === peer) this.send({ to: player.id, kind: 'candidate', payload: e.candidate.toJSON() }).catch(() => {}); };
      pc.ontrack = e => { audio.srcObject = e.streams[0] || new MediaStream([e.track]); audio.play().then(() => { this.playbackBlocked = false; }).catch(() => { this.playbackBlocked = true; this.onStatus('Tap Enable sound in Audio to hear the party.'); }); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') peer.retries = 0;
        if (pc.connectionState === 'failed') {
          if (peer.initiator && peer.retries++ < 2) pc.restartIce();
          else this.onStatus('Voice did not connect. Open Audio and tap Reconnect voice.');
        }
      };
      pc.onnegotiationneeded = async () => {
        if (!peer.initiator || peer.makingOffer || pc.signalingState !== 'stable') return;
        try { peer.makingOffer = true; await pc.setLocalDescription(); if (this.peers.get(player.id) === peer) await this.send({ to: player.id, kind: 'description', payload: pc.localDescription.toJSON() }); }
        catch { peer.lastError = 'Voice setup could not reach the party. Try Reconnect voice.'; } finally { peer.makingOffer = false; }
      };
      if (sender && this.mic && this.canSendTo(player)) sender.replaceTrack(this.mic.getAudioTracks()[0]).catch(() => {});
    }
  }
  signal(signal) {
    const key = signal.id ?? JSON.stringify(signal);
    const peer = this.peers.get(signal.from);
    if (!peer || this.seen.has(key)) return Promise.resolve();
    this.seen.add(key);
    if (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value);
    const run = (peer.signalChain || Promise.resolve()).then(() => this.peers.get(signal.from) === peer ? this.handleSignal(signal) : undefined);
    peer.signalChain = run.catch(() => {}); return run;
  }
  async handleSignal(signal) {
    const p = this.peers.get(signal.from); if (!p) return;
    const { pc } = p;
    try {
      if (signal.kind === 'description') {
        const description = signal.payload;
        if (description.type === 'offer' && p.initiator || description.type === 'answer' && pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(description);
        if (description.type === 'offer') {
          const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio');
          if (transceiver) {
            transceiver.direction = 'sendrecv'; p.sender = transceiver.sender;
            await p.sender.replaceTrack(this.canSendTo(p.player) ? this.mic?.getAudioTracks()[0] ?? null : null);
          }
        }
        for (const candidate of p.candidates.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
        if (description.type === 'offer') { await pc.setLocalDescription(); await this.send({ to: signal.from, kind: 'description', payload: pc.localDescription.toJSON() }); }
      } else if (pc.remoteDescription) await pc.addIceCandidate(signal.payload);
      else p.candidates.push(signal.payload);
    } catch { p.lastError = 'Voice setup was interrupted. Try Reconnect voice.'; }
  }
  setVolume(value) { this.volume = Number(value); for (const p of this.peers.values()) p.audio.volume = this.volume; }
  tone(frequency = 660, duration = .15, volume = .05, force = false) {
    if (!force && !this.effects || !this.context || this.context.state !== 'running') return;
    const c = this.context, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = frequency;
    g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(volume * this.volume + .0001, c.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + duration + .02);
  }
  update(t) {
    if (!this.music || this.frozen || !this.context || t - this.lastNote < .9) return;
    this.lastNote = t; const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
    this.tone(notes[Math.floor(t / .9) % notes.length], 1.7, .015, true);
  }
  reset() { this.mute(); for (const p of this.peers.values()) { p.pc.close(); p.audio.remove(); } this.peers.clear(); this.seen.clear(); }
  close() { this.disableMic(); this.reset(); this.context?.close?.().catch(() => {}); }
}
