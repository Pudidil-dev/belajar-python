'use strict';
// ============================================================================
// AUDIO — original 128 BPM electronic score in A minor + game-like SFX.
// 4-bar hook (Am-F-C-G) heard from frame one, sidechain-pumped bass/pads,
// dotted-8th delay on leads, a DROP exactly when the balloon reaches full
// inflation (26.25 s = bar 15), and a 1.33-beat pickup that loops into 0:00.
// One deterministic event list -> live lookahead scheduler + offline export.
// ============================================================================
const SR = 48000, BAR = 4 * BEAT;
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const CH = { Am: ['A', 'C', 'E'], Am9: ['A', 'C', 'E', 'B'], F: ['F', 'A', 'C'], Fmaj7: ['F', 'A', 'C', 'E'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Em: ['E', 'G', 'B'], E: ['E', 'G#', 'B'] };
const BARS = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Am', 'Em', 'F', 'E', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am9', 'Fmaj7', 'Am', 'F', 'C', 'G', 'Am', 'E'];
function chordMidi(name, oct) { let prev = -1; return CH[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
function sec(b) { return b <= 4 ? 'hook' : b <= 8 ? 'disc' : b <= 12 ? 'prec' : b === 13 ? 'calm' : b === 14 ? 'build' : b <= 19 ? 'climax' : b <= 22 ? 'relief' : b <= 24 ? 'micro' : b <= 29 ? 'res' : 'pickup'; }
// the hook (beats, length) over Am | F | C | G
const HOOK = [
  [['E', 5, 0, .5], ['A', 5, .5, .5], ['E', 5, 1, .5], ['D', 5, 1.5, .5], ['C', 5, 2, .75], ['D', 5, 2.75, .25], ['E', 5, 3, 1]],
  [['C', 5, 0, .5], ['D', 5, .5, .5], ['C', 5, 1, .5], ['A', 4, 1.5, 1], ['G', 4, 2.5, .5], ['A', 4, 3, 1]],
  [['E', 5, 0, .5], ['G', 5, .5, .5], ['E', 5, 1, .5], ['D', 5, 1.5, .5], ['C', 5, 2, .5], ['E', 5, 2.5, .5], ['G', 5, 3, 1]],
  [['D', 5, 0, .5], ['E', 5, .5, .5], ['D', 5, 1, .5], ['B', 4, 1.5, 1], ['G', 4, 2.5, .5], ['B', 4, 3, .5], ['D', 5, 3.5, .5]],
];
function musicEvents() {
  const ev = [];
  const N = (t, d, k, m, v, p, x) => ev.push(Object.assign({ t, d, k, f: mtof(m), v, p: p || 0 }, x || {}));
  const D = (t, k, v, p, x) => ev.push(Object.assign({ t, d: 0.5, k, v, p: p || 0 }, x || {}));
  const hook = (bar, idx, inst, v, oct, harm) => HOOK[idx].forEach(([n, o, b, l]) => {
    const t = (bar - 1) * BAR + b * BEAT; if (t >= DUR) return;
    N(t, l * BEAT, inst, nm(n, o + (oct || 0)), v, 0);
    if (harm) N(t, l * BEAT, inst, nm(n, o + (oct || 0)) - (['E', 'B'].includes(n) ? 3 : 4), v * 0.55, 0.3);
  });
  for (let b = 1; b <= 30; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], s = sec(b);
    const root = nm(CH[ch][0], 1), t5 = chordMidi(ch, 5), t4 = chordMidi(ch, 4);
    const barLen = Math.min(BAR, DUR - t0);
    // pads (sidechained)
    const padV = { hook: 0.05, disc: 0.06, prec: 0.05, calm: 0.07, build: 0.08, climax: 0.065, relief: 0.08, micro: 0.07, res: 0.065, pickup: 0.06 }[s];
    const cut = { hook: 1400, disc: 1800, prec: 1600, calm: 900, build: 700, climax: 2600, relief: 2000, micro: 1500, res: 2600, pickup: 2000 }[s];
    for (const m of chordMidi(ch, 3)) N(t0, barLen + (b === 30 ? 0 : 0.04), 'pad', m, padV, (m % 3 - 1) * 0.45, { cut, cut1: s === 'build' ? 4200 : cut });
    // bass
    const n8 = Math.round(barLen / (BEAT / 2)), n16 = Math.round(barLen / (BEAT / 4));
    if (s === 'hook' || s === 'disc' || s === 'res') for (let i = 0; i < n8; i++) N(t0 + i * BEAT / 2, BEAT / 2 * 0.7, 'bass', root + (i % 2 ? 12 : 0), i % 2 ? 0.17 : 0.22);
    if (s === 'prec' || s === 'calm' || s === 'climax') for (let i = 0; i < n16; i++) N(t0 + i * BEAT / 4, BEAT / 4 * 0.62, 'bass', root + ((i % 4 === 2) ? 12 : 0) + (s === 'climax' && i % 8 === 7 ? 7 : 0), i % 4 === 0 ? 0.23 : 0.15);
    if (s === 'relief') { N(t0, BEAT * 1.9, 'bass', root, 0.2); N(t0 + 2 * BEAT, BEAT * 1.9, 'bass', root + 7, 0.16); }
    if (s === 'micro') N(t0, BAR * 0.95, 'sub', root + 12, 0.16);
    if (s === 'build') N(t0, BAR, 'sub', nm('E', 1), 0.22, 0, { rise: true });
    if (s === 'pickup') N(t0, barLen, 'bass', nm('E', 2), 0.2);
    // drums
    const kick = (beat, v) => { const t = t0 + beat * BEAT; if (t < DUR) D(t, 'kick', v); };
    const clap = (beat, v) => { const t = t0 + beat * BEAT; if (t < DUR) D(t, 'clap', v); };
    const hat = (pos, v, open) => { const t = t0 + pos * BEAT; if (t < DUR) D(t, open ? 'ohat' : 'hat', v, ((pos * 0.37) % 0.6) - 0.3); };
    if (['hook', 'disc', 'prec', 'climax', 'res'].includes(s)) {
      for (let i = 0; i < 4; i++) kick(i, s === 'climax' ? 0.58 : 0.52);
      if (!(s === 'hook' && b === 1)) { clap(1, 0.32); clap(3, 0.32); }
      for (let i = 0; i < 8; i++) if (i % 2) hat(i / 2, s === 'hook' ? 0.07 : 0.1, s === 'disc' || s === 'climax' || s === 'res');
      if (s !== 'hook' || b >= 3) for (let i = 0; i < 16; i++) if (i % 4) hat(i / 4, (i % 2 ? 0.045 : 0.03) * (s === 'prec' ? 1.5 : 1));
      if (s === 'climax') { clap(3.75, 0.12); D(t0 + 1.5 * BEAT, 'perc', 0.18, -0.4); }
      if (b === 12) for (let i = 12; i < 16; i++) D(t0 + i * BEAT / 4, 'tom', 0.2 + (i - 12) * 0.04, 0, { f: 180 - (i - 12) * 22 });
      if (b === 4) for (let i = 8; i < 16; i++) D(t0 + i * BEAT / 4, 'snare', 0.08 + (i - 8) * 0.025);
    }
    if (s === 'calm') { for (let i = 0; i < 4; i++) kick(i, 0.42); }
    if (s === 'build') {
      kick(0, 0.5); kick(2, 0.42);
      for (let i = 0; i < 8; i++) D(t0 + i * BEAT / 2, 'snare', 0.07 + i * 0.012);
      for (let i = 0; i < 8; i++) D(t0 + 2 * BEAT + i * BEAT / 4, 'snare', 0.13 + i * 0.016);
    }
    if (b === 15 || b === 25) D(t0, 'crash', 0.34);
    if (s === 'relief') { kick(0, 0.4); kick(2, 0.36); D(t0 + BEAT, 'perc', 0.16, 0.3); D(t0 + 3 * BEAT, 'perc', 0.16, -0.3); for (let i = 0; i < 8; i++) D(t0 + i * BEAT / 2, 'shaker', i % 2 ? 0.06 : 0.035, 0.25); }
    if (s === 'micro') for (let i = 0; i < 16; i++) D(t0 + i * BEAT / 4, 'tick', i % 4 === 2 ? 0.09 : 0.04, ((i * 5) % 7) / 7 - 0.5);
    if (s === 'pickup') { for (let i = 0; i < 5; i++) D(t0 + i * BEAT / 4, 'snare', 0.12 + i * 0.04); D(t0, 'kick', 0.5); }
    // arps (sidechained)
    if (s === 'disc' || s === 'climax' || s === 'res') {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let i = 0; i < 16; i++) N(t0 + i * BEAT / 4, BEAT / 4 * 0.6, 'arp', t5[pat[i % 8] % t5.length] + (i % 8 >= 6 ? 12 : 0), s === 'climax' ? 0.034 : 0.03, i % 2 ? 0.45 : -0.45);
    }
    if (s === 'prec' || s === 'calm') { // shorter rhythmic notes: staccato plucks on the 16th grid
      const pat = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1];
      for (let i = 0; i < 16; i++) if (pat[i]) N(t0 + i * BEAT / 4, 0.09, 'pluck', t4[(i + b) % t4.length] + 12, s === 'calm' ? 0.035 : 0.05 + 0.004 * (b - 9), i % 2 ? 0.3 : -0.3);
    }
    if (s === 'micro') { N(t0 + 0.5 * BEAT, 0.6, 'bell', t5[0], 0.07, -0.3); N(t0 + 2 * BEAT, 0.6, 'bell', t5[2], 0.06, 0.3); N(t0 + 3.25 * BEAT, 0.5, 'bell', t5[1] + 12, 0.05, 0); }
  }
  // melodies
  for (let b = 1; b <= 4; b++) hook(b, b - 1, 'lead', 0.085, 0);            // immediate hook
  hook(5, 0, 'pluck', 0.06, 0); hook(6, 1, 'pluck', 0.06, 0); hook(7, 2, 'pluck', 0.065, 0); hook(8, 3, 'pluck', 0.065, 0);
  for (let b = 15; b <= 18; b++) hook(b, b - 15, 'saw', 0.07, 0, true);   // climax: supersaw + harmony
  [['A', 4, 0, .5], ['C', 5, .5, .5], ['E', 5, 1, .5], ['A', 5, 1.5, 2.5]].forEach(([n, o, b, l]) => N(18 * BAR + b * BEAT, l * BEAT, 'saw', nm(n, o), 0.07));
  [[20, [['C', 5, 0, 2], ['A', 4, 2, 2]]], [21, [['E', 5, 0, 2], ['G', 5, 2, 2]]], [22, [['D', 5, 0, 2], ['B', 4, 2, 1], ['D', 5, 3, 1]]]].forEach(([bar, ns]) => ns.forEach(([n, o, b, l]) => N((bar - 1) * BAR + b * BEAT, l * BEAT, 'bell', nm(n, o), 0.11, 0.1)));
  for (let b = 25; b <= 28; b++) hook(b, b - 25, 'saw', 0.065, 0, true);
  [['A', 4, 0, .5], ['C', 5, .5, .5], ['E', 5, 1, .5], ['A', 5, 1.5, 2.5]].forEach(([n, o, b, l]) => N(28 * BAR + b * BEAT, l * BEAT, 'saw', nm(n, o), 0.07));
  [['E', 5, 0], ['G#', 5, 0.33], ['B', 5, 0.66], ['E', 6, 1.0]].forEach(([n, o, b]) => { const t = 29 * BAR + b * BEAT; if (t < DUR) N(t, 0.15, 'pluck', nm(n, o), 0.07, 0); });
  return ev;
}
// ---------------------------------------------------------------- SFX (every one tied to a visible event)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {}));
  // S01-S04: inside the artery
  S(0.0, 'heart', 0.9); S(0.2, 'flowpulse', 0.5, { d: 1.2 }); S(0.8, 'accent', 0.6);
  S(1.5, 'bioticks', 0.5, { d: 1.5 }); S(1.55, 'tension', 0.3, { d: 1.45 });
  S(3.0, 'tension', 0.45, { d: 1.5, f0: 110, f1: 165 }); S(3.75, 'lowpulse', 0.6);
  S(4.5, 'heart', 0.9); S(4.6, 'lowpulse', 0.45); S(5.25, 'warn', 0.45);
  // S05-S09: zoom out, lab, access, route, imaging
  S(6.0, 'revwhoosh', 0.5, { d: 1.75 }); S(6.56, 'heart', 0.45); S(7.5, 'heart', 0.5); S(7.85, 'accent', 0.5);
  S(8.1, 'uion', 0.55); S(8.6, 'click', 0.6); S(9.0, 'confirm', 0.5); S(9.25, 'whoosh', 0.45, { d: 0.75 });
  S(10.15, 'click', 0.3); S(10.65, 'slide', 0.3, { d: 0.9 }); S(11.55, 'click', 0.75); S(11.6, 'confirm', 0.45);
  S(12.15, 'track', 0.5, { d: 1.7 }); S(12.2, 'ticks', 0.3, { d: 1.6 }); S(13.85, 'ping', 0.4, { f: 1318 });
  S(14.05, 'scanpulse', 0.6); S(14.25, 'chirp', 0.5); S(14.3, 'contrast', 0.35, { d: 0.8 }); S(14.95, 'ping', 0.35, { f: 1760 }); S(15.2, 'dive', 0.45, { d: 0.8 });
  // S10-S13: wire, crossing, delivery, lock
  S(16.0, 'swish', 0.35, { d: 0.25 }); S(16.15, 'track', 0.35, { d: 1.8 }); S(16.2, 'ticks', 0.35, { d: 1.75 });
  S(18.2, 'rising', 0.5, { d: 1.2 }); S(19.4, 'success', 0.7);
  S(20.0, 'slide', 0.5, { d: 1.75 }); S(20.05, 'mticks', 0.35, { d: 1.7 });
  S(22.0, 'slide', 0.35, { d: 0.85 }); S(22.85, 'lock', 0.8); S(22.95, 'drone', 0.35, { d: 1.35 });
  // S14: the climax — pressure rises, struts click (accelerating), DROP at full inflation
  S(24.3, 'pressure', 0.6, { d: 1.95 }); S(24.3, 'duck', 1, { d: 1.95, amt: 0.62 });
  for (let i = 0; i < 12; i++) { const u = i / 12; S(24.9 + (1 - Math.pow(1 - u, 2)) * 1.3, 'strut', 0.3 + 0.03 * i, { f: 1800 + i * 90, p: (i % 2 ? 0.35 : -0.35) }); }
  S(26.25, 'drop', 1.0); S(26.3, 'deploy', 0.6);
  // S15-S18: strut close-up, widening, deflation, removal
  S(27.0, 'swish', 0.3, { d: 0.25 }); S(27.0, 'duck', 1, { d: 1.6, amt: 0.75 });
  for (let i = 0; i < 10; i++) S(27.1 + i * 0.14, 'strut', 0.32, { f: 1500 + (i % 5) * 220, p: (i % 3 - 1) * 0.5 });
  S(28.0, 'deploy', 0.55);
  S(29.1, 'deep', 0.6, { d: 1.0 }); S(30.2, 'release', 0.3, { d: 0.5 });
  S(31.15, 'release', 0.6, { d: 1.25 });
  S(33.1, 'retreat', 0.5, { d: 1.2 }); S(34.25, 'retreat', 0.3, { d: 0.6 }); S(34.5, 'success', 0.5);
  // S19-S21: improved flow, before/after, assessment
  S(35.0, 'fluidsweep', 0.65, { d: 2.6 }); S(35.6, 'warm', 0.45, { d: 1.6 }); S(35.625, 'heart', 0.7); S(36.56, 'heart', 0.6); S(37.5, 'heart', 0.6);
  S(38.0, 'compare', 0.6); S(38.3, 'click', 0.5);
  S(40.0, 'scanpulse', 0.5); S(40.15, 'contrast', 0.35, { d: 0.75 }); S(40.8, 'confirm', 0.45);
  // S22: drug release (molecular ticks on the 16th grid, pentatonic)
  S(42.0, 'dive', 0.45, { d: 0.7 }); S(42.8, 'process', 0.3, { d: 2.8 });
  const pent = [0, 3, 5, 7, 10];
  for (let i = 0; i < 22; i++) { const t = 42.9 + i * BEAT / 4 * 1.0 + (i > 11 ? BEAT / 4 * (i - 11) * 0.5 : 0); if (t < 45.8) S(t, 'molecule', 0.22 + 0.01 * (i % 4), { f: mtof(nm('A', 6) + pent[(i * 3) % 5]), p: (hash(i * 7) - 0.5) * 0.9 }); }
  // S23: circulation
  S(46.0, 'pull', 0.35, { d: 1.6 }); S(46.875, 'heart', 0.6); S(47.8, 'heart', 0.75); S(48.75, 'heart', 0.75); S(49.7, 'heart', 0.7); S(50.6, 'heart', 0.65);
  S(47.4, 'fluidsweep', 0.5, { d: 2.0 }); S(47.8, 'success', 0.4);
  // S24: recap cuts, title, loop pickup
  RECAP.forEach(([name, t], i) => S(t, 'cut', 0.45, { f: mtof(nm('A', 5) + [0, 3, 5, 7, 10, 12][i]) }));
  S(53.7, 'impact', 0.85); S(54.35, 'swish', 0.35, { d: 0.5 }); S(54.62, 'accent', 0.5);
  return ev;
}
function allEvents() {
  const ev = musicEvents().map(e => Object.assign(e, { bus: 'm' })).concat(sfxEvents().map(e => Object.assign(e, { bus: 's' })));
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
// ---------------------------------------------------------------- synthesis core
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const MUSIC_GAIN = 0.6;
function makeAudioGraph(ctx) {
  const G = { ctx };
  const rnd = mulberry(2468);
  const nb = ctx.createBuffer(1, SR * 2, SR); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  G.noise = nb;
  const ir = ctx.createBuffer(2, Math.floor(SR * 2.0), SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (rnd() * 2 - 1) * Math.pow(1 - t / 2.0, 2) * Math.exp(-t * 2.2) * (t < 0.01 ? t / 0.01 : 1); } }
  G.rev = ctx.createConvolver(); G.rev.buffer = ir;
  G.revIn = ctx.createGain(); G.revIn.connect(G.rev);
  G.mix = ctx.createGain();
  G.revOut = ctx.createGain(); G.revOut.gain.value = 0.28; G.rev.connect(G.revOut); G.revOut.connect(G.mix);
  // dotted-8th ping-pong delay (leads, plucks, rewards)
  G.dIn = ctx.createGain();
  const dl = ctx.createDelay(1.0), dr = ctx.createDelay(1.0); dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.34; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  const pl = ctx.createStereoPanner(); pl.pan.value = -0.6; const prr = ctx.createStereoPanner(); prr.pan.value = 0.6;
  G.dIn.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl); dl.connect(pl); dr.connect(prr);
  G.dOut = ctx.createGain(); G.dOut.gain.value = 0.5; pl.connect(G.dOut); prr.connect(G.dOut); G.dOut.connect(G.mix);
  // music bus with a sidechain "pump" sub-bus (pads, bass, arps duck on every kick)
  G.music = ctx.createGain(); G.music.gain.value = MUSIC_GAIN; G.music.connect(G.mix);
  G.pump = ctx.createGain(); G.pump.gain.value = 1; G.pump.connect(G.music);
  G.sfx = ctx.createGain(); G.sfx.gain.value = 0.92; G.sfx.connect(G.mix);
  G.comp = ctx.createDynamicsCompressor(); G.comp.threshold.value = -12; G.comp.knee.value = 6; G.comp.ratio.value = 3; G.comp.attack.value = 0.004; G.comp.release.value = 0.15;
  G.master = ctx.createGain(); G.master.gain.value = 0.9;
  G.mix.connect(G.comp); G.comp.connect(G.master); G.master.connect(ctx.destination);
  G.pw = {};
  for (const duty of [0.125, 0.25, 0.5]) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI); im[k] = 2 * Math.pow(Math.sin(Math.PI * k * duty), 2) / (k * Math.PI); }
    G.pw[duty] = ctx.createPeriodicWave(re, im);
  }
  return G;
}
const PUMPED = { pad: 1, bass: 1, arp: 1, sub: 1 };
function voice(G, ev, when, send, delay) {
  const ctx = G.ctx, vg = ctx.createGain(); vg.gain.value = 0;
  const pan = ctx.createStereoPanner(); pan.pan.value = clamp(ev.p || 0, -1, 1);
  vg.connect(pan); pan.connect(ev.bus === 'm' ? (PUMPED[ev.k] ? G.pump : G.music) : G.sfx);
  if (send) { const s = ctx.createGain(); s.gain.value = send; pan.connect(s); s.connect(G.revIn); }
  if (delay) { const s = ctx.createGain(); s.gain.value = delay; pan.connect(s); s.connect(G.dIn); }
  return { vg, srcs: [], end: when + (ev.d || 0.5) + 0.8 };
}
function osc(G, V, type, f, t0, t1) {
  const o = G.ctx.createOscillator();
  if (typeof type === 'number') o.setPeriodicWave(G.pw[type]); else o.type = type;
  o.frequency.setValueAtTime(f, t0); o.start(t0); o.stop(t1); V.srcs.push(o); return o;
}
function noiseSrc(G, V, t0, t1, rate) {
  const s = G.ctx.createBufferSource(); s.buffer = G.noise; s.loop = true; s.playbackRate.value = rate || 1;
  s.start(t0, hash(Math.floor(t0 * 1000)) * 1.5); s.stop(t1); V.srcs.push(s); return s;
}
function filt(G, type, f, q) { const b = G.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; return b; }
function adsr(g, t, a, d, s, r, dur, peak) {
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3 + 1e-4);
  g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 3 + 1e-4);
}
function perc(g, t, a, dec, peak) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, dec / 3 + 1e-4); }
function playEvent(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  let V;
  switch (k) {
    case 'pad': {
      V = voice(G, ev, when, 0.45); const lp = filt(G, 'lowpass', ev.cut || 1500, 0.9); lp.connect(V.vg);
      if (ev.cut1 && ev.cut1 !== ev.cut) { lp.frequency.setValueAtTime(ev.cut, when); lp.frequency.exponentialRampToValueAtTime(ev.cut1, when + d); }
      for (const det of [-11, -4, 4, 11]) { const o = osc(G, V, 'sawtooth', f, when, when + d + 1.0); o.detune.value = det; o.connect(lp); }
      adsr(V.vg, when, 0.06, 0.5, 0.85, 0.35, d, v * 0.26); V.end = when + d + 1.2; break;
    }
    case 'bass': {
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', 1100, 2); lp.frequency.setValueAtTime(2400, when); lp.frequency.setTargetAtTime(420, when, 0.06); lp.connect(V.vg);
      osc(G, V, 'sawtooth', f, when, when + d + 0.15).connect(lp);
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.15); const sg = ctx.createGain(); sg.gain.value = 0.9; s.connect(sg); sg.connect(V.vg);
      adsr(V.vg, when, 0.004, 0.09, 0.7, 0.04, d, v); break;
    }
    case 'sub': {
      V = voice(G, ev, when, 0); const o = osc(G, V, 'sine', f, when, when + d + 0.4); o.connect(V.vg);
      if (ev.rise) o.frequency.exponentialRampToValueAtTime(f * 2, when + d);
      adsr(V.vg, when, ev.rise ? d * 0.8 : 0.02, 0.3, 0.8, 0.2, d, v); break;
    }
    case 'arp': { V = voice(G, ev, when, 0.25, 0.25); osc(G, V, 0.125, f, when, when + d + 0.2).connect(V.vg); perc(V.vg, when, 0.002, Math.max(0.07, d), v); break; }
    case 'pluck': {
      V = voice(G, ev, when, 0.3, 0.42); const lp = filt(G, 'lowpass', 4000, 3); lp.frequency.setValueAtTime(6000, when); lp.frequency.setTargetAtTime(900, when, 0.07); lp.connect(V.vg);
      osc(G, V, 0.25, f, when, when + Math.max(d, 0.1) + 0.35).connect(lp); osc(G, V, 'triangle', f * 2, when, when + 0.2).connect(lp);
      perc(V.vg, when, 0.002, Math.max(0.16, d * 0.9), v); break;
    }
    case 'lead': {
      V = voice(G, ev, when, 0.35, 0.45); const lp = filt(G, 'lowpass', 5200, 1.5); lp.frequency.setValueAtTime(7000, when); lp.frequency.setTargetAtTime(2400, when, 0.12); lp.connect(V.vg);
      const o1 = osc(G, V, 0.25, f, when, when + d + 0.3), o2 = osc(G, V, 0.5, f * 1.003, when, when + d + 0.3); o1.connect(lp); o2.connect(lp);
      adsr(V.vg, when, 0.005, 0.12, 0.55, 0.12, d, v); break;
    }
    case 'saw': { // climax supersaw
      V = voice(G, ev, when, 0.35, 0.38); const lp = filt(G, 'lowpass', 4800, 1); lp.connect(V.vg);
      for (const det of [-16, -7, 0, 7, 16]) { const o = osc(G, V, 'sawtooth', f, when, when + d + 0.3); o.detune.value = det; o.connect(lp); }
      const o2 = osc(G, V, 0.25, f * 2, when, when + d + 0.3); const og = ctx.createGain(); og.gain.value = 0.35; o2.connect(og); og.connect(lp);
      adsr(V.vg, when, 0.006, 0.15, 0.65, 0.14, d, v * 0.5); break;
    }
    case 'bell': {
      V = voice(G, ev, when, 0.55, 0.3); const c = osc(G, V, 'sine', f, when, when + d + 0.8); const m = osc(G, V, 'sine', f * 3.5, when, when + d + 0.8);
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 2.2, when); mg.gain.setTargetAtTime(f * 0.15, when, 0.2); m.connect(mg); mg.connect(c.frequency);
      c.connect(V.vg); perc(V.vg, when, 0.004, Math.max(0.5, d), v); break;
    }
    case 'kick': {
      V = voice(G, ev, when, 0); const o = osc(G, V, 'sine', 170, when, when + 0.45); o.frequency.exponentialRampToValueAtTime(48, when + 0.1);
      o.connect(V.vg); perc(V.vg, when, 0.0015, 0.3, v);
      const n = noiseSrc(G, V, when, when + 0.015, 1); const hp = filt(G, 'highpass', 3000); const ng = ctx.createGain(); ng.gain.value = 0.18; n.connect(hp); hp.connect(ng); ng.connect(V.vg);
      G.pump.gain.setValueAtTime(0.38, when); G.pump.gain.setTargetAtTime(1.0, when + 0.02, 0.075);   // sidechain pump
      break;
    }
    case 'clap': case 'snare': {
      V = voice(G, ev, when, 0.35); const n = noiseSrc(G, V, when, when + 0.3, 1); const bp = filt(G, 'bandpass', k === 'clap' ? 1300 : 2100, 0.8); n.connect(bp); bp.connect(V.vg);
      const o = osc(G, V, 'triangle', 200, when, when + 0.1); const og = ctx.createGain(); og.gain.value = 0.3; o.connect(og); og.connect(V.vg);
      if (k === 'clap') { V.vg.gain.setValueAtTime(0, when); for (const dt of [0, 0.011, 0.022]) { V.vg.gain.setValueAtTime(v, when + dt); V.vg.gain.setTargetAtTime(v * 0.25, when + dt + 0.001, 0.004); } V.vg.gain.setTargetAtTime(0, when + 0.03, 0.05); }
      else perc(V.vg, when, 0.002, 0.09, v);
      break;
    }
    case 'hat': case 'ohat': case 'tick': case 'shaker': {
      V = voice(G, ev, when, 0.08); const n = noiseSrc(G, V, when, when + 0.3, 1); const hp = filt(G, k === 'shaker' ? 'bandpass' : 'highpass', k === 'shaker' ? 6500 : k === 'tick' ? 9000 : 7500, 0.8); n.connect(hp); hp.connect(V.vg);
      perc(V.vg, when, k === 'shaker' ? 0.012 : 0.001, k === 'ohat' ? 0.14 : k === 'tick' ? 0.016 : k === 'shaker' ? 0.05 : 0.03, v); break;
    }
    case 'perc': { V = voice(G, ev, when, 0.2); const o = osc(G, V, 'triangle', 820, when, when + 0.1); o.frequency.exponentialRampToValueAtTime(460, when + 0.05); o.connect(V.vg); perc(V.vg, when, 0.001, 0.05, v); break; }
    case 'tom': { V = voice(G, ev, when, 0.25); const o = osc(G, V, 'sine', ev.f || 150, when, when + 0.35); o.frequency.exponentialRampToValueAtTime((ev.f || 150) * 0.55, when + 0.25); o.connect(V.vg); perc(V.vg, when, 0.002, 0.22, v); break; }
    case 'crash': { V = voice(G, ev, when, 0.45); const n = noiseSrc(G, V, when, when + 2.2, 1); const hp = filt(G, 'highpass', 5200); n.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.002, 1.5, v); V.end = when + 2.4; break; }
    case 'duck': {
      V = { vg: ctx.createGain(), srcs: [], end: when + d + 0.5 };
      G.music.gain.setTargetAtTime(MUSIC_GAIN * (ev.amt || 0.6), when, 0.03); G.music.gain.setTargetAtTime(MUSIC_GAIN, when + d, 0.12); break;
    }
    default: V = sfx(G, ev, when);
  }
  return V;
}
function sweepNoise(G, V, when, d, f0, f1, q, peak, att) {
  const n = noiseSrc(G, V, when, when + d + 0.3, 1); const bp = filt(G, 'bandpass', f0, q || 1.2);
  bp.frequency.setValueAtTime(f0, when); bp.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + d);
  n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, (att || 0.5) * d, d * 0.3, 0.9, 0.12, d * 0.85, peak);
}
function sfx(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  const rewards = { accent: 1, confirm: 1, success: 1, uion: 1, cut: 1, deploy: 1, molecule: 1, ping: 1 };
  const V = voice(G, ev, when, 0.3, rewards[k] ? 0.35 : 0);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  const blip = (type, fr, t, dec, peak, dest) => { const g = ctx.createGain(); g.gain.value = 0; tone(type, fr, t, t + dec * 4 + 0.05, g); g.connect(dest || V.vg); perc(g, t, 0.002, dec, peak); return g; };
  switch (k) {
    case 'heart': { // lub-dub
      for (const [dt, a] of [[0, 1], [0.21, 0.6]]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 68, when + dt, when + dt + 0.5, g); o.frequency.exponentialRampToValueAtTime(38, when + dt + 0.18); g.connect(V.vg); perc(g, when + dt, 0.004, 0.2, a);
        const n = noiseSrc(G, V, when + dt, when + dt + 0.06, 0.6); const lp = filt(G, 'lowpass', 300); const ng = ctx.createGain(); ng.gain.value = 0.25 * a; n.connect(lp); lp.connect(ng); ng.connect(V.vg); }
      V.vg.gain.setValueAtTime(v * 0.75, when); V.end = when + 1; break;
    }
    case 'flowpulse': case 'fluidsweep': {
      const n = noiseSrc(G, V, when, when + d + 0.4, 0.8); const bp = filt(G, 'bandpass', 500, 1.6);
      bp.frequency.setValueAtTime(380, when); bp.frequency.exponentialRampToValueAtTime(k === 'fluidsweep' ? 2400 : 900, when + d * 0.6); bp.frequency.exponentialRampToValueAtTime(600, when + d);
      const lfo = tone('sine', k === 'fluidsweep' ? 3.4 : 2.1, when, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(bp.frequency);
      n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.3, d * 0.3, 0.8, 0.3, d * 0.8, v * 0.3); V.end = when + d + 0.8; break;
    }
    case 'accent': { for (const [m, dt] of [[nm('A', 5), 0], [nm('E', 6), 0.04]]) blip(0.25, mtof(m), when + dt, 0.09, 1); V.vg.gain.setValueAtTime(v * 0.18, when); V.end = when + 0.8; break; }
    case 'bioticks': {
      const n = Math.round(d / (BEAT / 4)); for (let i = 0; i < n; i++) blip('triangle', 520 + i * 45, when + i * BEAT / 4, 0.02, 0.5 + i * 0.04);
      V.vg.gain.setValueAtTime(v * 0.22, when); V.end = when + d + 0.4; break;
    }
    case 'tension': {
      const lp = filt(G, 'lowpass', 400, 6); lp.frequency.setValueAtTime(300, when); lp.frequency.exponentialRampToValueAtTime(2400, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', ev.f0 || 82, when, when + d + 0.2, lp); o.frequency.exponentialRampToValueAtTime(ev.f1 || 110, when + d);
      const o2 = tone('sawtooth', (ev.f0 || 82) * 1.5, when, when + d + 0.2, lp); o2.detune.value = 9;
      adsr(V.vg, when, d * 0.6, 0.1, 0.9, 0.1, d, v * 0.12); break;
    }
    case 'lowpulse': { const o = tone('sine', 55, when, when + 0.6); o.frequency.exponentialRampToValueAtTime(41, when + 0.4); perc(V.vg, when, 0.01, 0.4, v * 0.55); break; }
    case 'warn': { const lp = filt(G, 'lowpass', 2000); lp.connect(V.vg); for (const [fr, dt] of [[880, 0], [660, 0.16]]) blip(0.5, fr, when + dt, 0.08, 1, lp); V.vg.gain.setValueAtTime(v * 0.12, when); V.end = when + 0.8; break; }
    case 'revwhoosh': {
      sweepNoise(G, V, when, d, 3200, 260, 1.3, v * 0.38, 0.15);
      const o = tone('sine', 900, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(90, when + d);
      const s2 = noiseSrc(G, V, when, when + d * 0.4, 1); const hp = filt(G, 'highpass', 4000); const g2 = ctx.createGain(); g2.gain.value = 0; s2.connect(hp); hp.connect(g2); g2.connect(V.vg); adsr(g2, when, d * 0.35, 0.02, 0.5, 0.05, d * 0.36, 0.5);
      break;
    }
    case 'whoosh': sweepNoise(G, V, when, d, 300, 2600, 0.9, v * 0.32, 0.4); break;
    case 'swish': sweepNoise(G, V, when, d, 700, 4200, 0.8, v * 0.22, 0.5); break;
    case 'dive': sweepNoise(G, V, when, d, 220, 5200, 1.4, v * 0.36, 0.75); { const o = tone('sine', 200, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1300, when + d); } break;
    case 'pull': sweepNoise(G, V, when, d, 4800, 220, 1.2, v * 0.36, 0.3); { const o = tone('sine', 1000, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(130, when + d); } break;
    case 'uion': { [nm('A', 5), nm('C', 6), nm('E', 6), nm('A', 6)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.045, 0.06, 1)); V.vg.gain.setValueAtTime(v * 0.2, when); V.end = when + 0.9; break; }
    case 'click': { const s = noiseSrc(G, V, when, when + 0.03, 2); const hp = filt(G, 'highpass', 3500); s.connect(hp); hp.connect(V.vg); blip('square', 2200, when, 0.008, 0.3); perc(V.vg, when, 0.001, 0.014, v * 0.4); break; }
    case 'confirm': { [nm('C', 6), nm('E', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.07, 0.08, 1)); V.vg.gain.setValueAtTime(v * 0.16, when); V.end = when + 0.9; break; }
    case 'success': { [nm('A', 5), nm('C', 6), nm('E', 6), nm('A', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.06, 0.12, 1)); blip('sine', mtof(nm('E', 7)), when + 0.24, 0.3, 0.5); V.vg.gain.setValueAtTime(v * 0.2, when); V.end = when + 1.2; break; }
    case 'track': {
      const lp = filt(G, 'lowpass', 1800, 2); lp.connect(V.vg); const o = tone('square', 220, when, when + d + 0.1, lp); o.frequency.exponentialRampToValueAtTime(440, when + d);
      sweepNoise(G, V, when, d, 600, 1800, 1.5, v * 0.12, 0.5); adsr(V.vg, when, 0.1, 0.2, 0.7, 0.1, d, v * 0.1); break;
    }
    case 'ticks': case 'mticks': {
      const n = Math.max(2, Math.round(d / (BEAT / (k === 'mticks' ? 2 : 4))));
      for (let i = 0; i < n; i++) blip(k === 'mticks' ? 'sine' : 'square', k === 'mticks' ? 3200 + (i % 2) * 400 : 1600 + (i % 4) * 120, when + i * d / n, k === 'mticks' ? 0.03 : 0.008, 1);
      V.vg.gain.setValueAtTime(v * (k === 'mticks' ? 0.1 : 0.08), when); V.end = when + d + 0.3; break;
    }
    case 'ping': { blip('sine', f, when, 0.25, 1); V.vg.gain.setValueAtTime(v * 0.2, when); V.end = when + 1; break; }
    case 'scanpulse': {
      const s = noiseSrc(G, V, when, when + 0.15, 1); const hp = filt(G, 'highpass', 2500); const g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(g); g.connect(V.vg); perc(g, when, 0.002, 0.08, 0.6);
      blip('sine', 1975, when, 0.12, 0.6); blip('sine', 988, when + 0.05, 0.15, 0.5); V.vg.gain.setValueAtTime(v * 0.3, when); V.end = when + 0.8; break;
    }
    case 'chirp': { const o = tone('sine', 900, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(3200, when + 0.15); perc(V.vg, when, 0.003, 0.12, v * 0.15); break; }
    case 'contrast': { const s = noiseSrc(G, V, when, when + d + 0.2, 1); const bp = filt(G, 'bandpass', 900, 2); bp.frequency.setValueAtTime(700, when); bp.frequency.exponentialRampToValueAtTime(2000, when + d); s.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.3, 0.2, 0.7, 0.15, d, v * 0.2); break; }
    case 'slide': {
      const s = noiseSrc(G, V, when, when + d + 0.2, 0.7); const bp = filt(G, 'bandpass', 1400, 3); s.connect(bp); bp.connect(V.vg);
      const lp = filt(G, 'lowpass', 600); lp.connect(V.vg); const o = tone('sawtooth', 92, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(118, when + d);
      adsr(V.vg, when, 0.06, 0.1, 0.8, 0.08, d, v * 0.12); break;
    }
    case 'rising': { const o = tone(0.25, mtof(nm('A', 4)), when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(mtof(nm('E', 6)), when + d); const lp = filt(G, 'lowpass', 3000); o.disconnect(); o.connect(lp); lp.connect(V.vg); adsr(V.vg, when, d * 0.5, 0.1, 0.8, 0.05, d, v * 0.07); break; }
    case 'lock': {
      for (const dt of [0, 0.06]) { const s = noiseSrc(G, V, when + dt, when + dt + 0.03, 2); const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(V.vg); perc(g, when + dt, 0.001, 0.02, 0.6); }
      const o = tone('sine', 110, when + 0.06, when + 0.5); o.frequency.exponentialRampToValueAtTime(70, when + 0.3);
      blip(0.25, mtof(nm('E', 6)), when + 0.1, 0.1, 0.35); blip(0.25, mtof(nm('A', 6)), when + 0.17, 0.14, 0.35);
      perc(V.vg, when, 0.001, 0.5, v * 0.45); V.vg.gain.setValueAtTime(v * 0.45, when + 0.05); V.end = when + 1; break;
    }
    case 'drone': { const lp = filt(G, 'lowpass', 500, 3); lp.connect(V.vg); tone('sawtooth', mtof(nm('E', 2)), when, when + d + 0.3, lp); tone('sawtooth', mtof(nm('E', 2)) * 1.005, when, when + d + 0.3, lp); adsr(V.vg, when, 0.2, 0.2, 0.8, 0.2, d, v * 0.12); break; }
    case 'pressure': {
      const lp = filt(G, 'lowpass', 500, 5); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(4000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', 110, when, when + d + 0.1, lp); o.frequency.exponentialRampToValueAtTime(330, when + d);
      const o2 = tone('square', 165, when, when + d + 0.1, lp); o2.frequency.exponentialRampToValueAtTime(495, when + d);
      const s = noiseSrc(G, V, when, when + d, 1); const hp = filt(G, 'highpass', 3000); const g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(g); g.connect(V.vg); adsr(g, when, d * 0.9, 0.05, 1, 0.03, d, 0.35);
      adsr(V.vg, when, d * 0.85, 0.05, 1, 0.03, d, v * 0.13); break;
    }
    case 'strut': { // metallic deformation click
      const c = tone('sine', f || 2000, when, when + 0.25); const m = tone('sine', (f || 2000) * 2.76, when, when + 0.25); m.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime((f || 2000) * 1.2, when); mg.gain.setTargetAtTime(0, when, 0.03); m.connect(mg); mg.connect(c.frequency);
      const s = noiseSrc(G, V, when, when + 0.02, 2); const g = ctx.createGain(); g.gain.value = 0.4; s.connect(g); g.connect(V.vg);
      perc(V.vg, when, 0.001, 0.07, v * 0.22); break;
    }
    case 'drop': { // strongest mechanical payoff
      const o = tone('sine', 120, when, when + 1.2); o.frequency.exponentialRampToValueAtTime(38, when + 0.35);
      const s = noiseSrc(G, V, when, when + 1.0, 1); const hp = filt(G, 'highpass', 1800); const g = ctx.createGain(); g.gain.value = 0.35; s.connect(hp); hp.connect(g); g.connect(V.vg);
      for (const m of [nm('A', 4), nm('E', 5), nm('A', 5), nm('C', 6)]) { const gg = ctx.createGain(); gg.gain.value = 0; tone('sawtooth', mtof(m), when, when + 1.2, gg); const lp = filt(G, 'lowpass', 3000); gg.connect(lp); lp.connect(V.vg); perc(gg, when, 0.003, 0.5, 0.1); }
      perc(V.vg, when, 0.002, 0.9, v * 0.6); V.end = when + 1.6; break;
    }
    case 'deploy': { [nm('E', 6), nm('A', 6), nm('C', 7)].forEach((m, i) => blip('triangle', mtof(m), when + i * 0.035, 0.18, 1)); const s = noiseSrc(G, V, when, when + 0.6, 1); const hp = filt(G, 'highpass', 7000); const g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(g); g.connect(V.vg); perc(g, when, 0.01, 0.35, 0.4); V.vg.gain.setValueAtTime(v * 0.22, when); V.end = when + 1.2; break; }
    case 'deep': { const lp = filt(G, 'lowpass', 300, 4); lp.frequency.setValueAtTime(200, when); lp.frequency.exponentialRampToValueAtTime(900, when + d * 0.5); lp.connect(V.vg); tone('sawtooth', 55, when, when + d + 0.2, lp); const o = tone('sine', 82, when, when + 0.5); o.frequency.exponentialRampToValueAtTime(41, when + 0.3); adsr(V.vg, when, 0.02, 0.3, 0.6, 0.3, d, v * 0.35); break; }
    case 'release': sweepNoise(G, V, when, d, 5200, 500, 0.8, v * 0.3, 0.05); break;
    case 'retreat': { const o = tone('sine', 660, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(220, when + d); sweepNoise(G, V, when, d, 2500, 700, 1, v * 0.12, 0.3); adsr(V.vg, when, 0.05, 0.2, 0.7, 0.1, d, v * 0.18); break; }
    case 'warm': { const lp = filt(G, 'lowpass', 600); lp.frequency.setValueAtTime(600, when); lp.frequency.exponentialRampToValueAtTime(2600, when + d * 0.6); lp.connect(V.vg); for (const m of [nm('F', 3), nm('C', 4), nm('A', 4), nm('E', 5)]) tone('sawtooth', mtof(m), when, when + d + 0.5, lp); adsr(V.vg, when, d * 0.4, 0.3, 0.7, 0.4, d, v * 0.045); V.end = when + d + 1; break; }
    case 'compare': { const s = noiseSrc(G, V, when, when + 0.15, 1.5); const hp = filt(G, 'highpass', 2500); s.connect(hp); hp.connect(V.vg); const o = tone('square', 1400, when, when + 0.15); o.frequency.exponentialRampToValueAtTime(350, when + 0.12); perc(V.vg, when, 0.001, 0.1, v * 0.25); break; }
    case 'molecule': { blip('sine', f, when, 0.06, 1); blip('triangle', f * 2, when, 0.03, 0.4); V.vg.gain.setValueAtTime(v * 0.25, when); V.end = when + 0.6; break; }
    case 'process': { const n = Math.round(d / 0.09); for (let i = 0; i < n; i++) blip('sine', 2400 + 900 * hash(i * 7 + 3), when + i * 0.09 + hash(i) * 0.04, 0.015, 0.6); V.vg.gain.setValueAtTime(v * 0.08, when); V.end = when + d + 0.3; break; }
    case 'cut': { blip(0.25, f, when, 0.07, 1); const s = noiseSrc(G, V, when, when + 0.05, 1.5); const hp = filt(G, 'highpass', 5000); const g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(g); g.connect(V.vg); perc(g, when, 0.001, 0.03, 0.5); V.vg.gain.setValueAtTime(v * 0.25, when); V.end = when + 0.6; break; }
    case 'impact': {
      const o = tone('sine', 90, when, when + 1.6); o.frequency.exponentialRampToValueAtTime(35, when + 0.5);
      const s = noiseSrc(G, V, when, when + 1.2, 1); const lp = filt(G, 'lowpass', 2500); const g = ctx.createGain(); g.gain.value = 0.3; s.connect(lp); lp.connect(g); g.connect(V.vg);
      for (const m of [nm('A', 3), nm('E', 4), nm('A', 4), nm('C', 5), nm('E', 5)]) { const gg = ctx.createGain(); gg.gain.value = 0; tone('sawtooth', mtof(m), when, when + 1.6, gg); const f2 = filt(G, 'lowpass', 2200); gg.connect(f2); f2.connect(V.vg); perc(gg, when, 0.01, 0.9, 0.06); }
      perc(V.vg, when, 0.002, 1.1, v * 0.55); V.end = when + 1.8; break;
    }
    default: { tone('sine', 880, when, when + 0.1); perc(V.vg, when, 0.001, 0.05, 0.05); }
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export)
async function renderAudioOffline() {
  const ctx = new OfflineAudioContext(2, Math.round(SR * DUR), SR);
  const G = makeAudioGraph(ctx);
  for (const ev of allEvents()) playEvent(G, ev, ev.t);
  return await ctx.startRendering();
}
// ---------------------------------------------------------------- live scheduler (preview)
const LIVE = { ctx: null, G: null, ev: null, playing: false, t0ctx: 0, pos0: 0, idx: 0, voices: [], timer: null, muted: false };
function liveInit() {
  if (LIVE.ctx) return LIVE.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  LIVE.ctx = new AC({ sampleRate: SR, latencyHint: 'interactive' });
  LIVE.G = makeAudioGraph(LIVE.ctx);
  LIVE.ev = allEvents();
  return LIVE.ctx;
}
function liveNow() { return LIVE.playing ? LIVE.pos0 + (LIVE.ctx.currentTime - LIVE.t0ctx) : LIVE.pos0; }
function liveStopVoices() {
  const now = LIVE.ctx.currentTime;
  for (const V of LIVE.voices) {
    try { V.vg.gain.cancelScheduledValues(now); V.vg.gain.setValueAtTime(V.vg.gain.value, now); V.vg.gain.linearRampToValueAtTime(0, now + 0.02); } catch (e) { }
    for (const s of V.srcs) { try { s.stop(now + 0.03); } catch (e) { } }
  }
  LIVE.voices = [];
  for (const [p, v] of [[LIVE.G.music.gain, MUSIC_GAIN], [LIVE.G.pump.gain, 1]]) { try { p.cancelScheduledValues(now); p.setValueAtTime(v, now); } catch (e) { } }
}
function liveTick() {
  if (!LIVE.playing) return;
  const ctx = LIVE.ctx, ahead = 0.18, now = ctx.currentTime, pos = liveNow();
  while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos + ahead) {
    const ev = LIVE.ev[LIVE.idx++];
    if (ev.t >= DUR) continue;
    const when = LIVE.t0ctx + (ev.t - LIVE.pos0);
    if (when < now - 0.02) continue;
    LIVE.voices.push(playEvent(LIVE.G, ev, Math.max(when, now + 0.005)));
  }
  LIVE.voices = LIVE.voices.filter(V => V.end > now);
}
function livePlay(pos) {
  const ctx = liveInit();
  if (ctx.state === 'suspended') ctx.resume();
  liveStopVoices();
  LIVE.pos0 = pos; LIVE.t0ctx = ctx.currentTime + 0.05; LIVE.playing = true;
  LIVE.idx = 0; while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos) {
    const ev = LIVE.ev[LIVE.idx++];
    const rem = ev.t + (ev.d || 0) - pos;
    if ((ev.k === 'pad' || ev.k === 'drone' || ev.k === 'flowpulse' || ev.k === 'fluidsweep' || ev.k === 'process') && rem > 0.3) {
      LIVE.voices.push(playEvent(LIVE.G, Object.assign({}, ev, { t: pos, d: rem }), LIVE.t0ctx));
    }
  }
  clearInterval(LIVE.timer); LIVE.timer = setInterval(liveTick, 25); liveTick();
}
function livePause() {
  if (!LIVE.ctx) return;
  LIVE.pos0 = liveNow(); LIVE.playing = false; clearInterval(LIVE.timer); liveStopVoices();
}
function liveMute(m) { LIVE.muted = m; if (LIVE.G) LIVE.G.master.gain.setTargetAtTime(m ? 0 : 0.9, LIVE.ctx.currentTime, 0.02); }
