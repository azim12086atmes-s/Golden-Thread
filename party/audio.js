// Audio connections use only peers admitted by the server's recipient projection.
export class PartyAudio {
  constructor(send, onStatus = () => {}) {
    this.send = send; this.onStatus = onStatus; this.peers = new Map(); this.seen = new Set();
    this.self = null; this.players = []; this.mic = null; this.talking = false;
    this.channel = 'guests'; this.music = false; this.effects = true; this.volume = .65;
    this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.context = null; this.lastNote = 0;
    addEventListener('keyup', e => { if (e.key.toLowerCase() === 'q') this.setTalking(false); });
    addEventListener('keydown', e => { if (e.key.toLowerCase() === 'q' && !/INPUT|TEXTAREA/.test(e.target.tagName)) this.setTalking(true); });
    addEventListener('blur', () => this.setTalking(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.setTalking(false); });
  }
  async unlock() {
    try { this.context ??= new AudioContext(); await this.context.resume(); } catch { /* voice remains available */ }
    for (const p of this.peers.values()) p.audio.play().catch(() => {});
  }
  async enableMic() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access needs HTTPS or localhost.');
    await this.unlock();
    this.mic ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    this.mic.getAudioTracks().forEach(t => { t.enabled = false; });
    await this.applyTracks(); this.onStatus('Microphone ready. Hold Q or the talk button to speak.');
  }
  disableMic() {
    this.setTalking(false); this.mic?.getTracks().forEach(t => t.stop()); this.mic = null;
    this.applyTracks();
  }
  setTalking(value) {
    this.talking = Boolean(value && this.mic);
    this.mic?.getAudioTracks().forEach(t => { t.enabled = this.talking; });
  }
  canSendTo(player) {
    if (this.self?.role === 'companion') return player.isBirthday;
    if (this.self?.role === 'birthday') return this.channel === 'private' ? player.role === 'companion' : player.role !== 'companion';
    return true;
  }
  async applyTracks() {
    const track = this.mic?.getAudioTracks()[0] ?? null;
    await Promise.allSettled([...this.peers.values()].map(p => p.sender.replaceTrack(this.canSendTo(p.player) ? track : null)));
  }
  async refresh(players, self) {
    this.self = self; this.players = players;
    if (typeof RTCPeerConnection !== 'function') return;
    const allowed = players.filter(p => p.id !== self.id && (self.role !== 'companion' || p.isBirthday));
    const ids = new Set(allowed.map(p => p.id));
    for (const [id, p] of this.peers) if (!ids.has(id)) { p.pc.close(); p.audio.remove(); this.peers.delete(id); }
    for (const player of allowed) {
      if (this.peers.has(player.id)) { this.peers.get(player.id).player = player; continue; }
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      const audio = document.createElement('audio'); audio.autoplay = true; audio.volume = this.volume; audio.hidden = true; document.body.append(audio);
      const sender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
      const peer = { pc, audio, player, sender, makingOffer: false, ignoreOffer: false, candidates: [], polite: self.id > player.id };
      this.peers.set(player.id, peer);
      pc.onicecandidate = e => { if (e.candidate) this.send({ to: player.id, kind: 'candidate', payload: e.candidate.toJSON() }).catch(() => {}); };
      pc.ontrack = e => { audio.srcObject = e.streams[0] || new MediaStream([e.track]); audio.play().catch(() => this.onStatus('Open Audio and enable sound to hear the party.')); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') this.onStatus('A voice connection needs a relay. Text-free gameplay is still connected.');
      };
      pc.onnegotiationneeded = async () => {
        try { peer.makingOffer = true; await pc.setLocalDescription(); await this.send({ to: player.id, kind: 'description', payload: pc.localDescription.toJSON() }); }
        catch { /* a late peer may already have disconnected */ } finally { peer.makingOffer = false; }
      };
      if (this.mic && this.canSendTo(player)) sender.replaceTrack(this.mic.getAudioTracks()[0]).catch(() => {});
    }
  }
  async signal(signal) {
    const key = signal.id ?? JSON.stringify(signal);
    if (this.seen.has(key)) return; this.seen.add(key);
    if (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value);
    const p = this.peers.get(signal.from); if (!p) return;
    const { pc } = p;
    try {
      if (signal.kind === 'description') {
        const description = signal.payload;
        const collision = description.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
        p.ignoreOffer = !p.polite && collision; if (p.ignoreOffer) return;
        await pc.setRemoteDescription(description);
        for (const candidate of p.candidates.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
        if (description.type === 'offer') { await pc.setLocalDescription(); await this.send({ to: signal.from, kind: 'description', payload: pc.localDescription.toJSON() }); }
      } else if (pc.remoteDescription) await pc.addIceCandidate(signal.payload);
      else p.candidates.push(signal.payload);
    } catch { /* signaling may race a peer reconnect */ }
  }
  setVolume(value) { this.volume = Number(value); for (const p of this.peers.values()) p.audio.volume = this.volume; }
  tone(frequency = 660, duration = .15, volume = .05) {
    if (!this.effects || !this.context || this.context.state !== 'running') return;
    const c = this.context, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = frequency;
    g.gain.setValueAtTime(.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(volume * this.volume + .0001, c.currentTime + .02);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + duration + .02);
  }
  update(t) {
    if (!this.music || this.frozen || !this.context || t - this.lastNote < .9) return;
    this.lastNote = t; const notes = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
    this.tone(notes[Math.floor(t / .9) % notes.length], 1.7, .015);
  }
  close() { this.disableMic(); for (const p of this.peers.values()) { p.pc.close(); p.audio.remove(); } this.peers.clear(); }
}
