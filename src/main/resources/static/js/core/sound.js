/* =====================================================================
 * Sound effects synthesised with the Web Audio API (no audio files).
 * TM.Sound.play('correct') etc. Mute state is persisted.
 * ===================================================================== */
window.TM = window.TM || {};

(function (TM) {
  'use strict';

  let ctx = null;
  let muted = TM.Store.get('muted', false);
  const listeners = [];

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Plays a single oscillator tone with an exponential fade. */
  function tone(freq, dur = 0.1, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Short filtered noise burst (explosions, splats). */
  function noise(dur = 0.25, vol = 0.25, freq = 800, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = a.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(t0);
  }

  const SFX = {
    key: () => tone(1200, 0.025, 'square', 0.025),
    correct: () => { tone(660, 0.08, 'sine', 0.12); tone(990, 0.1, 'sine', 0.1, null, 0.06); },
    wrong: () => tone(160, 0.16, 'sawtooth', 0.08, 110),
    pop: () => tone(500, 0.12, 'sine', 0.18, 1400),
    explode: () => { noise(0.35, 0.35, 900); tone(120, 0.3, 'triangle', 0.15, 40); },
    shoot: () => { tone(900, 0.08, 'square', 0.06, 200); noise(0.08, 0.12, 3000); },
    groan: () => tone(110, 0.5, 'sawtooth', 0.05, 70),
    hurt: () => { tone(300, 0.25, 'sawtooth', 0.12, 80); noise(0.2, 0.15, 500); },
    countdown: () => tone(520, 0.18, 'square', 0.1),
    go: () => tone(1040, 0.4, 'square', 0.12),
    levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, null, i * 0.08)),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, null, i * 0.11)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.08, null, i * 0.16)),
    tick: () => tone(1500, 0.03, 'sine', 0.05),
    boost: () => tone(300, 0.3, 'sawtooth', 0.06, 900)
  };

  /**
   * Continuous car engine + exhaust (silencer) sound.
   * set(level) with level 0..1 (0 = idle, 1 = full speed): pitch and volume rise with speed,
   * the exhaust rumble gets louder and the silencer "pops" at high revs.
   */
  function createEngine() {
    const a = audio(); if (!a) return null;
    const out = a.createGain(); out.gain.value = 0; out.connect(a.destination);

    // engine: two detuned sawtooth/square oscillators through a low-pass filter
    const filter = a.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400; filter.Q.value = 4;
    const engGain = a.createGain(); engGain.gain.value = 0.5;
    const o1 = a.createOscillator(); o1.type = 'sawtooth';
    const o2 = a.createOscillator(); o2.type = 'square';
    // a slow wobble on the pitch makes it sound like firing cylinders
    const lfo = a.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 18;
    const lfoGain = a.createGain(); lfoGain.gain.value = 4;
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfoGain.connect(o2.frequency);
    o1.connect(filter); o2.connect(filter); filter.connect(engGain).connect(out);

    // exhaust / silencer: looping noise through a low band-pass filter
    const len = a.sampleRate * 2;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const nz = a.createBufferSource(); nz.buffer = buf; nz.loop = true;
    const exFilter = a.createBiquadFilter(); exFilter.type = 'bandpass'; exFilter.frequency.value = 120; exFilter.Q.value = 1.2;
    const exGain = a.createGain(); exGain.gain.value = 0.3;
    nz.connect(exFilter).connect(exGain).connect(out);

    [o1, o2, lfo, nz].forEach((n) => n.start());
    let level = 0, paused = false, stopped = false, lastPop = 0;

    function apply() {
      if (stopped) return;
      const t = a.currentTime;
      const on = !muted && !paused;
      const base = 38 + level * 150;                        // engine pitch (Hz)
      o1.frequency.setTargetAtTime(base, t, 0.12);
      o2.frequency.setTargetAtTime(base * 0.5 + 1.5, t, 0.12);
      lfo.frequency.setTargetAtTime(14 + level * 40, t, 0.12);
      filter.frequency.setTargetAtTime(300 + level * 1600, t, 0.12);
      exFilter.frequency.setTargetAtTime(90 + level * 260, t, 0.12);
      exGain.gain.setTargetAtTime(0.25 + level * 0.55, t, 0.12);
      out.gain.setTargetAtTime(on ? 0.05 + level * 0.17 : 0, t, 0.08);  // louder when faster
    }

    return {
      set(v) {
        level = Math.max(0, Math.min(1, v || 0));
        apply();
        // silencer backfire pops at high speed
        const now = a.currentTime;
        if (!muted && !paused && level > 0.55 && now - lastPop > 0.25 && Math.random() < level * 0.08) {
          lastPop = now;
          noise(0.07, 0.12 + level * 0.12, 450);
        }
      },
      pause() { paused = true; apply(); },
      resume() { paused = false; apply(); },
      stop() {
        if (stopped) return;
        const t = a.currentTime;
        out.gain.setTargetAtTime(0, t, 0.1);
        stopped = true;
        setTimeout(() => { [o1, o2, lfo, nz].forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); out.disconnect(); }, 600);
      },
      refresh: apply
    };
  }

  const engines = new Set();

  TM.Sound = {
    /** Starts a car engine sound; returns { set(0..1), pause(), resume(), stop() } (no-op if audio is unavailable). */
    engine() {
      let e = null;
      try { e = createEngine(); } catch (err) { e = null; }
      if (!e) return { set() {}, pause() {}, resume() {}, stop() {} };
      engines.add(e);
      const stop = e.stop;
      e.stop = () => { engines.delete(e); stop(); };
      return e;
    },
    play(name) {
      if (muted || !SFX[name]) return;
      try { SFX[name](); } catch (e) { /* audio not available */ }
    },
    isMuted: () => muted,
    setMuted(v) {
      muted = !!v;
      TM.Store.set('muted', muted);
      engines.forEach((e) => e.refresh());
      listeners.forEach((fn) => fn(muted));
    },
    toggle() { TM.Sound.setMuted(!muted); if (!muted) TM.Sound.play('correct'); return muted; },
    onChange(fn) { listeners.push(fn); },
    /** Must be called from a user gesture once so browsers allow audio. */
    unlock() { if (!muted) audio(); }
  };
})(window.TM);
