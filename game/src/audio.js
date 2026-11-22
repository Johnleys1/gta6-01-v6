// Aurora Falls — sound, all procedural WebAudio: engine hum, sirens,
// gunshots, explosions and three radio stations with distinct moods.
export function createAudio(G) {
  const state = G.state;
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let radioTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = state.muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = "sawtooth";
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      engineOsc.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function resume() {
    if (ensure() && ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  function noiseBurst(dur, freq, vol) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }

  function tone(freq, dur, type, vol, when) {
    if (!ensure()) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function gunshot(kind) {
    if (kind === "shotgun") noiseBurst(0.28, 900, 0.5);
    else if (kind === "rifle") noiseBurst(0.18, 1600, 0.4);
    else if (kind === "smg") noiseBurst(0.09, 2000, 0.28);
    else noiseBurst(0.14, 1400, 0.35);
  }

  function explosion() {
    noiseBurst(1.1, 320, 0.8);
    tone(48, 0.9, "sine", 0.6);
  }

  function thud() {
    noiseBurst(0.16, 300, 0.5);
    tone(70, 0.18, "sine", 0.4);
  }

  function sirenBlip() {
    tone(720, 0.16, "sine", 0.16);
    tone(960, 0.16, "sine", 0.16, ctx ? ctx.currentTime + 0.18 : 0);
  }

  // Radio: a tiny step sequencer, one pattern per station.
  const SCALES = {
    synthwave: [0, 3, 5, 7, 10, 12, 15],
    rock: [0, 3, 5, 6, 7, 10, 12],
    ambient: [0, 2, 4, 7, 9, 12, 14],
  };
  function radioStep() {
    if (!ensure() || state.muted) return;
    const st = G.progress.RADIO[state.radioStation];
    const scale = SCALES[st.mood];
    const bar = Math.floor(step / 8) % 4;
    const deg = scale[(step * 3 + bar) % scale.length];
    const freq = st.root * Math.pow(2, deg / 12) * (step % 16 === 0 ? 0.5 : 1);
    if (step % 2 === 0) tone(freq, 0.22, st.wave, st.mood === "ambient" ? 0.05 : 0.09);
    if (st.mood === "rock" && step % 4 === 0) tone(st.root / 2, 0.2, "square", 0.12);
    if (st.mood === "synthwave" && step % 8 === 4) tone(st.root * 4, 0.3, "sine", 0.05);
    step++;
  }

  function setStation(i) {
    step = 0;
    if (radioTimer) return;
    radioTimer = setInterval(() => {
      if (state.mode !== "playing") return;
      radioStep();
    }, 60000 / 112 / 2);
  }

  function update(dt) {
    if (!ctx || !engineOsc) return;
    const speed = Math.abs(G.vehicles.player.speed);
    engineGain.gain.value += ((state.onFoot ? 0 : 0.02 + speed * 0.0022) - engineGain.gain.value) * Math.min(1, dt * 6);
    engineOsc.frequency.value = 48 + speed * 4.5;
    // Siren wail while wanted.
    if (state.wanted > 0 && G.police.units.length > 0) {
      const t = ctx.currentTime;
      if (!update._nextSiren || t > update._nextSiren) {
        tone(660, 0.4, "sine", 0.05, t);
        tone(880, 0.4, "sine", 0.05, t + 0.42);
        update._nextSiren = t + 0.85;
      }
    }
  }

  function setMuted(m) {
    state.muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
  }

  return { ensure, resume, gunshot, explosion, thud, sirenBlip, setStation, update, setMuted };
}
