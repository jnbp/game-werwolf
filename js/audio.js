/* ==========================================================================
   Werwolf Manager – SOUND
   Everything is synthesised live in the browser (Web Audio); there are no sound
   files – except the recorded narration listed in voices.js (hosted by Fish Audio).
     WW_AUDIO.setAmbient('night' | 'day' | null)
     WW_AUDIO.fx('howl' | 'gong' | 'rooster' | 'swoosh' | 'bell' | 'alarm' | 'shot' | 'fanfare' | 'owl' | 'click')
     WW_AUDIO.narrate(key, fallbackText, lang)  → Promise (end of the announcement)
     WW_AUDIO.speak(text, lang)                 → browser voice for dynamic texts
   ========================================================================== */
(function (global) {
  'use strict';

  const opts = { ambient: false, effects: true, voice: 'recorded', volume: 0.8 };
  let ctx = null, master = null, ambBus = null, fxBus = null, voiceDuck = 1;
  let ambientMode = null, ambientNodes = [], ambientTimers = [];

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = opts.volume; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = 0; ambBus.connect(master);
    fxBus = ctx.createGain(); fxBus.gain.value = 0.9; fxBus.connect(master);
    return ctx;
  }
  // Audio may only start after a user gesture (browser rule).
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => global.addEventListener && global.addEventListener(ev, () => {
    ensure();
    if (ambientMode && !ambientNodes.length) startAmbient(ambientMode);
  }, { passive: true }));

  // ---------------------------------------------------------------- Building blocks
  const now = () => ctx.currentTime;
  function noiseBuffer(type = 'white', seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === 'pink') { b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 0.9; }
      else d[i] = w;
    }
    return buf;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(bus, { type = 'sine', f = 440, f2 = null, t = now(), a = 0.01, d = 0.3, peak = 0.3, detune = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    o.connect(g); g.connect(bus); env(g, t, a, peak, d);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function noiseBurst(bus, { t = now(), d = 0.3, peak = 0.3, f = 1000, q = 1, type = 'bandpass', f2 = null }) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer('white', d + 0.1);
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = ctx.createGain(); src.connect(flt); flt.connect(g); g.connect(bus);
    env(g, t, 0.005, peak, d); src.start(t); src.stop(t + d + 0.1);
  }

  // ---------------------------------------------------------------- Effects
  const FX = {
    click() { tone(fxBus, { f: 1200, d: 0.04, peak: 0.08 }); },
    swoosh() { noiseBurst(fxBus, { d: 0.45, peak: 0.35, f: 400, f2: 3500, q: 2 }); },
    bell(t = now(), f = 880, peak = 0.35) {
      [1, 2.76, 5.4].forEach((m, i) => tone(fxBus, { f: f * m, t, a: 0.005, d: 1.6 / (i + 1), peak: peak / (i + 1.5) }));
    },
    alarm() { const t = now(); [0, 0.35, 0.7].forEach(dt => FX.bell(t + dt, 988, 0.4)); },
    gong() {
      const t = now();
      [[110, 0.5], [174, 0.25], [221, 0.2], [305, 0.12], [420, 0.08]].forEach(([f, p]) => tone(fxBus, { f, t, a: 0.02, d: 4, peak: p, detune: Math.random() * 10 }));
      noiseBurst(fxBus, { t, d: 0.2, peak: 0.12, f: 300 });
    },
    shot() {
      const t = now();
      noiseBurst(fxBus, { t, d: 0.35, peak: 0.9, f: 1800, q: 0.6, type: 'lowpass', f2: 300 });
      tone(fxBus, { type: 'sine', f: 120, f2: 40, t, d: 0.3, peak: 0.6 });
    },
    owl(bus = fxBus, vol = 0.25) {
      const t = now();
      const hoot = (tt, f, d) => { const o = tone(bus, { f, f2: f * 0.92, t: tt, a: 0.06, d, peak: vol }); return o; };
      hoot(t, 390, 0.35); hoot(t + 0.55, 360, 0.25); hoot(t + 0.85, 350, 0.6);
    },
    howl(bus = fxBus, vol = 0.22) {
      const t = now();
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      const flt = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'triangle';
      [o, o2].forEach((x, i) => {
        x.frequency.setValueAtTime(280 * (i ? 2 : 1), t);
        x.frequency.exponentialRampToValueAtTime(560 * (i ? 2 : 1), t + 0.9);
        x.frequency.setValueAtTime(560 * (i ? 2 : 1), t + 2.2);
        x.frequency.exponentialRampToValueAtTime(380 * (i ? 2 : 1), t + 3.4);
      });
      lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      flt.type = 'bandpass'; flt.frequency.value = 900; flt.Q.value = 1.2;
      o.connect(flt); o2.connect(flt); flt.connect(g); g.connect(bus);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.6);
      g.gain.setValueAtTime(vol, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + 3.7); });
    },
    rooster() {
      const t = now();
      const seg = [[600, 900, 0.12], [900, 1100, 0.14], [1100, 1300, 0.18], [1300, 850, 0.6]];
      let tt = t;
      seg.forEach(([f1, f2, d]) => {
        const o = ctx.createOscillator(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f1, tt); o.frequency.linearRampToValueAtTime(f2, tt + d);
        flt.type = 'bandpass'; flt.frequency.value = 1500; flt.Q.value = 3;
        o.connect(flt); flt.connect(g); g.connect(fxBus); env(g, tt, 0.02, 0.35, d);
        o.start(tt); o.stop(tt + d + 0.05); tt += d + 0.03;
      });
    },
    fanfare() {
      const t = now();
      [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.75], [1047, 0.9]].forEach(([f, dt]) =>
        tone(fxBus, { type: 'triangle', f, t: t + dt, a: 0.01, d: dt > 0.8 ? 0.9 : 0.22, peak: 0.25 }));
    },
    heartbeat() {
      const t = now();
      [0, 0.22, 0.9, 1.12].forEach((dt, i) => tone(fxBus, { f: 60, f2: 40, t: t + dt, a: 0.01, d: 0.15, peak: i % 2 ? 0.35 : 0.5 }));
    }
  };

  // ---------------------------------------------------------------- Ambience
  function loopNoise(type, filterType, freq, gainVal) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(type, 4); src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = filterType; flt.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gainVal;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + Math.random() * 0.05; lg.gain.value = gainVal * 0.6;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(flt); flt.connect(g); g.connect(ambBus); src.start(); lfo.start();
    ambientNodes.push(src, lfo);
  }
  function every(minS, maxS, fn) {
    const tick = () => {
      if (!ambientMode) return;
      try { fn(); } catch (e) { /* ignore */ }
      ambientTimers.push(setTimeout(tick, (minS + Math.random() * (maxS - minS)) * 1000));
    };
    ambientTimers.push(setTimeout(tick, (minS * Math.random() + 0.5) * 1000));
  }
  function cricket(f) {
    const t = now();
    for (let i = 0; i < 3; i++) tone(ambBus, { f, t: t + i * 0.055, a: 0.005, d: 0.035, peak: 0.05 });
  }
  function bird() {
    const t = now();
    const base = 2200 + Math.random() * 2400, n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.07 + Math.random() * 0.06);
      tone(ambBus, { f: base * (0.9 + Math.random() * 0.3), f2: base * (1.1 + Math.random() * 0.4), t: tt, a: 0.008, d: 0.06 + Math.random() * 0.05, peak: 0.07 });
    }
  }
  function startAmbient(mode) {
    stopAmbientNodes();
    if (!ensure() || !opts.ambient || !mode) return;
    if (mode === 'night') {
      loopNoise('brown', 'lowpass', 420, 0.35);
      [4300, 4700, 3900].forEach((f, i) => every(0.6 + i * 0.2, 1.8 + i * 0.4, () => cricket(f)));
      every(18, 40, () => FX.owl(ambBus, 0.07));
      every(50, 110, () => FX.howl(ambBus, 0.05));
    } else {
      loopNoise('pink', 'bandpass', 900, 0.12);
      every(1.2, 4.5, bird);
      every(2.5, 7, bird);
    }
    ambBus.gain.cancelScheduledValues(now());
    ambBus.gain.setTargetAtTime(0.9 * voiceDuck, now(), 1.2);
  }
  function stopAmbientNodes() {
    ambientTimers.forEach(clearTimeout); ambientTimers = [];
    ambientNodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }); ambientNodes = [];
  }
  function fadeOutAmbient() {
    if (ambBus) ambBus.gain.setTargetAtTime(0, now(), 0.6);
    setTimeout(() => { if (!ambientMode || !opts.ambient) stopAmbientNodes(); }, 1500);
  }
  function setAmbient(mode) {
    if (mode === ambientMode && (ambientNodes.length || !opts.ambient)) return;
    ambientMode = mode;
    if (!ctx) return; // starts after the first touch
    if (!mode || !opts.ambient) return fadeOutAmbient();
    // soft crossfade
    ambBus.gain.setTargetAtTime(0, now(), 0.4);
    setTimeout(() => { if (ambientMode === mode) startAmbient(mode); }, 900);
  }
  function duck(on) {
    voiceDuck = on ? 0.35 : 1;
    if (ctx && ambBus && ambientNodes.length) ambBus.gain.setTargetAtTime(0.9 * voiceDuck, now(), 0.3);
  }

  // ---------------------------------------------------------------- Voice
  let currentAudio = null;
  function stopVoice() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (global.speechSynthesis) global.speechSynthesis.cancel();
  }
  function speak(text, lang = 'de') {
    return new Promise(resolve => {
      if (!global.speechSynthesis || !text || opts.voice === 'off') return resolve();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{200D}\u{FE0F}]/gu, ''));
      u.lang = lang === 'en' ? 'en-GB' : 'de-DE';
      u.rate = 0.95;
      u.volume = opts.volume;
      const v = global.speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang));
      if (v) u.voice = v;
      duck(true);
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(safety); duck(false); resolve(); };
      // safety net: some browsers never report the end
      const safety = setTimeout(finish, Math.min(20000, 1500 + String(text).length * 85));
      u.onend = u.onerror = finish;
      global.speechSynthesis.speak(u);
    });
  }
  /** Play the recorded text, otherwise use the browser voice. */
  function narrate(key, fallbackText, lang = 'de') {
    stopVoice();
    if (opts.voice === 'off') return Promise.resolve();
    if (opts.voice !== 'recorded' || !key) return speak(fallbackText, lang);
    return new Promise(resolve => {
      const V = global.WW_VOICES;
      const id = V && V[lang] && V[lang][key];
      if (!id) { speak(fallbackText, lang).then(resolve); return; }
      const a = new Audio(V.base + id + '.mp3');
      a.volume = Math.min(1, opts.volume * 1.1);
      currentAudio = a;
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(safety); duck(false); resolve(); };
      const safety = setTimeout(finish, 20000);
      a.onended = finish;
      a.onerror = () => { if (done) return; done = true; clearTimeout(safety); speak(fallbackText, lang).then(resolve); };
      duck(true);
      const p = a.play();
      if (p && p.catch) p.catch(() => { if (done) return; done = true; clearTimeout(safety); speak(fallbackText, lang).then(resolve); });
    });
  }

  global.WW_AUDIO = {
    configure(o) {
      Object.assign(opts, o);
      if (master) master.gain.setTargetAtTime(opts.volume, now(), 0.1);
      if (!ctx) return;
      if (!opts.ambient) fadeOutAmbient();
      else if (ambientMode && !ambientNodes.length) startAmbient(ambientMode);
    },
    get options() { return Object.assign({}, opts); },
    unlock: ensure,
    setAmbient,
    fx(name) { if (!opts.effects || !FX[name] || !ensure()) return; try { FX[name](); } catch (e) { /* no audio */ } },
    narrate, speak, stopVoice
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
