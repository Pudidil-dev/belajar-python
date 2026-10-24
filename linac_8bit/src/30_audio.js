'use strict';
// ============================================================================
// AUDIO (Web Audio): 128 BPM, 4/4, 56 bars = 105 s, D minor. Chiptune pulses,
// triangle bass, noise drums, FM bells, saw pads + event-synced SFX.
// One deterministic event list feeds both the live lookahead scheduler
// (preview) and an OfflineAudioContext render (MP4 export).
// ============================================================================
const SR = 48000, BAR = 4 * BEAT;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const CHORD = {
  Dm9: ['D', 'F', 'A', 'E'], Dm: ['D', 'F', 'A'], Bb: ['Bb', 'D', 'F'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'],
  Gm: ['G', 'Bb', 'D'], A: ['A', 'C#', 'E'], Csus: ['C', 'F', 'G'], Fadd9: ['F', 'A', 'C', 'G'],
};
const BARS = [].concat(
  ['Dm9', 'Bb', 'F', 'C'],
  ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
  ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'Csus'],
  ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'F', 'A'],
  ['Dm', 'C', 'Bb', 'C', 'Dm', 'C', 'Bb', 'A'],
  ['Gm', 'Dm', 'Bb', 'A', 'Gm', 'Dm', 'Bb', 'C', 'Dm', 'Dm'],
  ['Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'Fadd9'],
);
function chordMidi(name, oct) { // ascending voicing from the root in octave oct
  const ns = CHORD[name]; let prev = -1; const out = [];
  for (const n of ns) { let m = nm(n, oct); while (m <= prev) m += 12; out.push(m); prev = m; }
  return out;
}
function section(b) { // b: 1-based bar
  return b <= 4 ? 'hook' : b <= 12 ? 'init' : b <= 23 ? 'build' : b <= 31 ? 'precise' : b <= 39 ? 'servo' : b <= 49 ? 'sparse' : 'end';
}
// ---------------------------------------------------------------- score
function musicEvents() {
  const ev = [];
  const N = (t, d, k, m, v, p, x) => ev.push(Object.assign({ t, d, k, f: mtof(m), v, p: p || 0 }, x || {}));
  const D = (t, k, v, p, x) => ev.push(Object.assign({ t, d: 0.5, k, v, p: p || 0 }, x || {}));
  for (let b = 1; b <= 56; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], sec = section(b);
    const root = nm(CHORD[ch][0], 2), tones = chordMidi(ch, 4), tones5 = chordMidi(ch, 5);
    // pad (all sections, level by section)
    const padV = { hook: 0.07, init: 0.055, build: 0.06, precise: 0.045, servo: 0.05, sparse: 0.06, end: 0.075 }[sec];
    const cut = { hook: 900, init: 1100, build: 900 + (b - 13) * 160, precise: 1300, servo: 1500, sparse: 900, end: 1700 }[sec];
    const padEnd = b === 56 ? 104.85 - t0 : BAR + 0.05;
    for (const m of chordMidi(ch, 3)) N(t0, padEnd, 'pad', m, padV, (m % 3 - 1) * 0.4, { cut });
    // bass
    if (sec === 'hook') { if (b === 1) N(0, 1.6, 'sub', nm('D', 1), 0.55); }
    else if (sec === 'init' || sec === 'build') {
      for (let i = 0; i < 8; i++) {
        if (b === 5 && i < 1) continue;
        const m = (i === 7) ? root + 7 : (sec === 'build' && b >= 19 && i % 2 === 1) ? root + 12 : root;
        N(t0 + i * BEAT / 2, BEAT / 2 * 0.8, 'bass', m, sec === 'build' ? 0.22 : 0.19);
      }
    } else if (sec === 'precise') { for (let i = 0; i < 4; i++) N(t0 + i * BEAT, BEAT * 0.9, 'bass', i === 3 ? root + 7 : root, 0.19); }
    else if (sec === 'servo') { for (let i = 0; i < 16; i++) N(t0 + i * BEAT / 4, BEAT / 4 * 0.6, 'bass', (i % 8 === 6) ? root + 12 : root, i % 4 === 0 ? 0.2 : 0.13); }
    else if (sec === 'sparse') N(t0, BAR * 0.95, 'bass', root, 0.15);
    else if (sec === 'end') { N(t0, BAR * 0.5, 'bass', root, 0.17); N(t0 + 2 * BEAT, BAR * 0.45, 'bass', root + 7, 0.13); }
    // drums
    const kick = (beat, v) => D(t0 + beat * BEAT, 'kick', v);
    const clap = (beat, v) => D(t0 + beat * BEAT, 'clap', v);
    const hat = (pos, v, open) => D(t0 + pos * BEAT, open ? 'ohat' : 'hat', v, (pos * 0.37 % 0.6) - 0.3);
    if (sec === 'init') { if (b > 5 || true) { kick(b === 5 ? 2 : 0, 0.5); kick(2, 0.42); } for (let i = 0; i < 8; i++) if (b > 5 || i > 1) hat(i / 2, i % 2 ? 0.1 : 0.05); }
    if (sec === 'build') {
      if (b >= 17) for (let i = 0; i < 4; i++) kick(i, 0.5); else { kick(0, 0.5); kick(2, 0.45); }
      if (b >= 15) { clap(1, 0.32); clap(3, 0.32); }
      for (let i = 0; i < 8; i++) hat(i / 2, i % 2 ? 0.12 : 0.06, b >= 19 && i % 2 === 1);
      if (b === 23) for (let i = 8; i < 16; i++) D(t0 + i * BEAT / 4, 'snare', 0.12 + (i - 8) * 0.03);
    }
    if (sec === 'precise') { kick(0, 0.48); clap(2, 0.3); for (let i = 0; i < 8; i++) hat(i / 2, i % 2 ? 0.08 : 0.04); if (b === 24) D(t0, 'crash', 0.32); }
    if (sec === 'servo') {
      for (let i = 0; i < 4; i++) kick(i, 0.42); clap(1, 0.26); clap(3, 0.26);
      for (let i = 0; i < 16; i++) D(t0 + i * BEAT / 4, 'tick', i % 4 === 2 ? 0.14 : 0.07, ((i * 5) % 7) / 7 - 0.5);
    }
    if (sec === 'end' && b >= 52 && b <= 55) { kick(0, 0.35); for (let i = 1; i < 8; i += 2) hat(i / 2, 0.05); }
    // arps
    if ((sec === 'init' && b >= 6) || sec === 'build' || (sec === 'end' && b >= 52 && b <= 55)) {
      const v = sec === 'build' ? 0.032 + 0.0028 * (b - 13) : 0.03;
      const pat = [0, 1, 2, 3, 2, 1, 0, 2];
      for (let i = 0; i < 16; i++) { const k = pat[i % 8] % tones5.length; N(t0 + i * BEAT / 4, BEAT / 4 * 0.7, 'arp', tones5[k] + (i >= 8 && sec === 'build' && b >= 19 ? 12 : 0), v, i % 2 ? 0.35 : -0.35); }
    }
    if (sec === 'precise') { // syncopated plucks
      for (const pos of [0.5, 1.5, 2.25, 3.0, 3.5]) N(t0 + pos * BEAT, 0.16, 'pluck', tones[Math.floor(pos * 2) % tones.length] + 12, 0.08, pos > 2 ? 0.3 : -0.3);
    }
    if (sec === 'sparse' && b !== 49) { N(t0 + BEAT * 1.5, 0.5, 'pluck', tones[1] + 12, 0.06, -0.3); N(t0 + BEAT * 3, 0.5, 'pluck', tones[2] + 12, 0.05, 0.3); }
  }
  // hook motif (bells) at the reveal + dive sparkle
  [['D', 5, 0.55], ['A', 4, 0.78], ['F', 5, 1.02], ['E', 5, 1.3]].forEach(([n, o, t]) => N(t, 1.4, 'bell', nm(n, o), 0.16, 0.2));
  for (let i = 0; i < 12; i++) { const ts = chordMidi('Dm', 4 + Math.floor(i / 3)); N(2.32 + i * 0.11, 0.18, 'arp', ts[i % 3], 0.04 + i * 0.004, (i % 2) ? 0.4 : -0.4); }
  // lead melodies
  const lead = (bar, notes, v) => notes.forEach(([n, o, beat, len]) => N((bar - 1) * BAR + beat * BEAT, len * BEAT, 'lead', nm(n, o), v, 0));
  lead(17, [['D', 5, 0, 1], ['F', 5, 1, 1], ['A', 5, 2, 1.5], ['G', 5, 3.5, 0.5]], 0.05);
  lead(18, [['F', 5, 0, 1], ['E', 5, 1, 1], ['D', 5, 2, 1], ['C', 5, 3, 1]], 0.05);
  lead(19, [['D', 5, 0, 1], ['F', 5, 1, 1], ['A', 5, 2, 1], ['C', 6, 3, 1]], 0.055);
  lead(20, [['A', 5, 0, 2], ['G', 5, 2, 1], ['E', 5, 3, 1]], 0.055);
  lead(34, [['A', 4, 0, 0.5], ['D', 5, 0.5, 0.5], ['E', 5, 1, 1], ['F', 5, 2, 2]], 0.04);
  lead(36, [['A', 4, 0, 0.5], ['D', 5, 0.5, 0.5], ['E', 5, 1, 1], ['C', 5, 2, 2]], 0.04);
  lead(38, [['F', 5, 0, 1], ['E', 5, 1, 1], ['D', 5, 2, 1], ['C#', 5, 3, 1]], 0.04);
  // ending bells: resolve to F (add9)
  [['F', 5, 50, 0], ['E', 5, 50, 2], ['D', 5, 51, 0], ['C', 5, 51, 2], ['D', 5, 52, 0], ['A', 4, 52, 2], ['Bb', 4, 53, 0], ['C', 5, 53, 2],
   ['D', 5, 54, 0], ['F', 5, 54, 2], ['E', 5, 55, 0], ['C', 5, 55, 2]].forEach(([n, o, bar, beat]) => N((bar - 1) * BAR + beat * BEAT, 1.6, 'bell', nm(n, o), 0.1, 0.15));
  [['F', 4], ['A', 4], ['C', 5], ['G', 5]].forEach(([n, o], i) => N(103.13 + i * 0.03, 1.8, 'bell', nm(n, o), 0.09, (i - 1.5) * 0.3));
  return ev;
}
// ---------------------------------------------------------------- SFX list
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {}));
  const type = (t, n) => S(t, 'type', 0.5, { n: n || 6 });
  // 01 hook
  S(0.0, 'boom', 0.5); S(0.1, 'swish', 0.6, { d: 0.5 }); [0.26, 0.4, 0.54].forEach(t => S(t, 'flip', 0.5)); type(0.26, 5); S(1.5, 'rise', 0.4, { d: 0.55 });
  // 02-03 scale travel
  S(2.32, 'dive', 0.55, { d: 1.35 }); S(3.72, 'zap', 0.55, { d: 0.45 }); S(3.96, 'crack', 0.7); type(4.04, 5);
  S(5.3, 'pull', 0.55, { d: 1.65 }); S(6.95, 'land', 0.6); type(6.95, 7);
  // 04-05 planning
  S(8.0, 'swish', 0.35, { d: 0.3 }); type(8.28, 7); S(8.45, 'click', 0.5); S(8.75, 'draw', 0.35, { d: 1.2 }); S(10.05, 'click', 0.5); S(10.15, 'draw', 0.3, { d: 0.45 });
  S(11.0, 'click', 0.5); type(11.25, 6); S(11.2, 'arc', 0.35, { d: 0.75 }); S(11.95, 'bloom', 0.55, { d: 1.2 });
  // 06-07 alignment, kV imaging
  S(14.0, 'swish', 0.35, { d: 0.3 }); S(14.3, 'laser', 0.3, { d: 2.8 }); type(14.35, 7);
  S(14.75, 'servo', 0.45, { d: 0.75, f: 70 }); S(15.62, 'servo', 0.45, { d: 0.7, f: 82 }); S(16.36, 'lock', 0.7);
  S(17.0, 'servo', 0.35, { d: 0.5, f: 110 }); type(17.2, 6); S(17.6, 'kv', 0.55, { d: 0.45 }); S(18.12, 'pop', 0.45);
  S(18.7, 'servo', 0.3, { d: 0.5, f: 95 }); S(19.28, 'ding', 0.4);
  // 08 console
  S(20.0, 'swish', 0.3, { d: 0.25 }); type(20.15, 5); S(20.24, 'key', 0.5);
  S(20.39, 'beep', 0.4, { f: 880 }); S(20.86, 'beep', 0.4, { f: 988 }); S(21.33, 'beep', 0.45, { f: 1175 }); S(21.36, 'rise', 0.35, { d: 0.36 }); S(21.72, 'press', 0.8);
  // 09 inside
  S(22.0, 'swish', 0.3, { d: 0.25 }); type(22.25, 6); S(22.3, 'reveal', 0.55, { d: 0.65 });
  S(22.9, 'zip', 0.35, { d: 0.25, f: 300 }); S(22.95, 'rf', 0.3, { d: 0.6, f: 220 }); S(23.15, 'zip', 0.45, { d: 0.5, f: 900 }); S(23.6, 'ping', 0.35, { f: 1760 });
  // 10 modulator
  S(24.0, 'whoosh', 0.45, { d: 0.32 }); type(24.36, 6); S(24.3, 'charge', 0.45, { d: 1.22 });
  for (const f of FIRE) { S(f, 'fire', 0.85); }
  S(25.7, 'charge', 0.4, { d: 0.85 }); S(26.7, 'whoosh', 0.35, { d: 0.32 });
  // 11 klystron
  type(27.4, 6); S(27.35, 'rf', 0.18, { d: 2.4, f: 440 }); S(27.5, 'rfamp', 0.42, { d: 2.3 }); S(29.68, 'whoosh', 0.35, { d: 0.34 });
  // 12 gun
  type(30.35, 5); S(30.3, 'heater', 0.3, { d: 0.65 }); S(30.55, 'hv', 0.4);
  for (const b of GUN_BUNCH) S(b, 'gun', 0.5, { d: 0.45 });
  // 13 acceleration: rising sweep + one tick per cavity crossing (grouped)
  S(33.0, 'whoosh', 0.35, { d: 0.3 }); type(33.35, 8); S(AWG_T0, 'accel', 0.45, { d: AWG_T1 - AWG_T0 });
  for (let k = 0; k <= 11; k++) S(AWG_T0 + (k + 0.6) * ((AWG_T1 - AWG_T0) / 11.8), 'cavity', 0.25 + 0.02 * k, { f: 660 * Math.pow(2, k / 12) });
  // 14 transport, 15 magnet
  S(37.7, 'whoosh', 0.35, { d: 0.32 }); S(38.2, 'coil', 0.4, { d: 1.7 }); type(38.25, 6);
  S(40.0, 'whoosh', 0.35, { d: 0.3 }); type(40.3, 8); S(40.2, 'magnet', 0.55, { d: 2.2 }); S(42.42, 'whoosh', 0.3, { d: 0.58 });
  // 16 bremsstrahlung
  S(43.0, 'impact', 0.6); S(43.0, 'rise', 0.3, { d: 0.3 }); S(43.3, 'dive', 0.55, { d: 0.85 }); type(44.3, 6);
  FLIGHTS.forEach((F, i) => { S(F.d.t0 + F.emitT, 'brems', i === 0 ? 0.75 : 0.45, { f: 1200 + 1800 * F.d.loss, p: (F.emitPt[0] / 150) }); S(F.d.t0 + 0.2, 'zip', 0.18, { d: 0.6, f: 500 + 200 * i }); });
  S(47.6, 'pull', 0.5, { d: 0.8 }); S(47.9, 'beam', 0.12, { d: 10.1 });
  // 17-19 head
  S(49.0, 'whoosh', 0.3, { d: 0.3 }); type(49.3, 6); S(49.45, 'pop', 0.35); S(49.9, 'flatten', 0.4, { d: 1.0 });
  S(52.0, 'whoosh', 0.3, { d: 0.3 }); type(52.3, 6); S(52.45, 'pop', 0.35); S(52.6, 'counter', 0.3, { d: 2.3 });
  S(55.0, 'whoosh', 0.3, { d: 0.3 }); type(55.3, 7); S(55.3, 'jaw', 0.55, { d: 0.65 }); S(56.2, 'jaw', 0.55, { d: 0.65 }); S(57.62, 'dive', 0.4, { d: 0.43 });
  // 20 MLC
  S(58.0, 'swish', 0.3, { d: 0.25 }); type(58.35, 8); S(58.25, 'beam', 0.09, { d: 5.7 });
  S(58.4, 'leaves', 0.5, { d: 1.25 }); for (const t of [60.7, 61.5, 62.25, 63.0]) S(t, 'leaves', 0.45, { d: 0.55 });
  // 21-22 VMAT + dose
  S(64.0, 'swish', 0.3, { d: 0.25 }); type(64.35, 8); S(64.3, 'gantry', 0.5, { d: 5.4 }); S(64.4, 'beam', 0.11, { d: 5.2 }); S(64.5, 'bloom', 0.3, { d: 5.0 });
  S(70.0, 'whoosh', 0.35, { d: 0.5 }); type(70.25, 8); S(70.65, 'pop', 0.35); S(71.25, 'shimmer', 0.35, { d: 0.6 }); S(71.92, 'shimmer', 0.35, { d: 0.6 });
  // 23 Compton
  S(73.0, 'rise', 0.35, { d: 0.3 }); S(73.3, 'dive', 0.55, { d: 0.85 }); type(74.25, 8);
  S(COMPTON_T, 'compton', 0.8); S(76.7, 'compton', 0.4); S(77.45, 'absorb', 0.35);
  // 24 secondary electrons: one pop per ionisation, a soft glow per excitation
  S(78.0, 'whoosh', 0.3, { d: 0.6 }); type(78.25, 8);
  for (const e of EION) { const tp = ePathTime(e.s); if (tp > 78 && tp < 82) S(tp, e.kind === 'ion' ? 'ionize' : 'excite', e.kind === 'ion' ? 0.4 : 0.22, { p: clamp((WAT[e.id].x - MSTAR.x) / 80, -0.8, 0.8) }); }
  // 25 radiolysis
  S(82.0, 'whoosh', 0.3, { d: 0.6 }); type(82.3, 8); S(83.2, 'hop', 0.5, { d: 0.55 }); S(83.75, 'radical', 0.6); S(84.15, 'pop', 0.3); S(84.8, 'radical', 0.35); S(85.3, 'radical', 0.35);
  // 26 DNA damage
  S(87.0, 'whoosh', 0.3, { d: 0.45 }); type(87.3, 9); S(87.45, 'drift', 0.3, { d: 1.3 }); S(88.75, 'crack', 0.7); S(88.95, 'zap', 0.45, { d: 0.45 }); S(89.2, 'crack', 0.75); S(89.65, 'split', 0.5);
  // 27 cellular response
  S(92.0, 'swish', 0.3, { d: 0.25 }); type(92.2, 7); S(92.4, 'pop', 0.3); S(92.6, 'pop', 0.3); S(92.3, 'proteins', 0.35, { d: 0.7 }); S(93.35, 'zipper', 0.4, { d: 0.6 });
  S(94.0, 'repair', 0.55); S(94.1, 'ding', 0.35); S(93.55, 'pull', 0.25, { d: 0.7 }); S(94.3, 'stretch', 0.3, { d: 0.6 }); S(95.05, 'fragment', 0.4, { d: 0.8 });
  // 28 sessions
  S(96.0, 'swish', 0.3, { d: 0.25 }); type(96.25, 7); for (const s of SESS) S(s, 'session', 0.45, { d: 0.25 }); type(96.9, 4);
  // 29 ending
  S(100.0, 'swish', 0.3, { d: 0.25 }); S(100.15, 'pull', 0.6, { d: 1.35 }); S(100.3, 'pop', 0.3); S(101.45, 'swell', 0.45, { d: 2.0 });
  type(101.6, 8); type(101.95, 8); for (const t of [102.19, 102.66, 103.13, 103.59]) S(t, 'iconpop', 0.45); type(103.75, 6); S(104.45, 'swish', 0.25, { d: 0.5 });
  return ev;
}
function allEvents() {
  const ev = musicEvents().map(e => Object.assign(e, { bus: 'm' })).concat(sfxEvents().map(e => Object.assign(e, { bus: 's' })));
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
// ---------------------------------------------------------------- synthesis
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeAudioGraph(ctx) {
  const G = { ctx };
  const rnd = mulberry(1234);
  const nb = ctx.createBuffer(1, SR * 2, SR); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  G.noise = nb;
  const ir = ctx.createBuffer(2, Math.floor(SR * 2.4), SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (rnd() * 2 - 1) * Math.pow(1 - t / 2.4, 2.2) * Math.exp(-t * 1.6) * (t < 0.012 ? t / 0.012 : 1); } }
  G.rev = ctx.createConvolver(); G.rev.buffer = ir;
  G.revIn = ctx.createGain(); G.revIn.gain.value = 1; G.revIn.connect(G.rev);
  G.revOut = ctx.createGain(); G.revOut.gain.value = 0.32; G.rev.connect(G.revOut);
  G.mix = ctx.createGain(); G.mix.gain.value = 1;
  G.music = ctx.createGain(); G.music.gain.value = 0.62; G.music.connect(G.mix);
  G.sfx = ctx.createGain(); G.sfx.gain.value = 0.9; G.sfx.connect(G.mix);
  G.revOut.connect(G.mix);
  G.comp = ctx.createDynamicsCompressor(); G.comp.threshold.value = -12; G.comp.knee.value = 6; G.comp.ratio.value = 3; G.comp.attack.value = 0.004; G.comp.release.value = 0.18;
  G.master = ctx.createGain(); G.master.gain.value = 0.9;
  G.mix.connect(G.comp); G.comp.connect(G.master); G.master.connect(ctx.destination);
  // pulse waves (duty 12.5 / 25 / 50 %)
  G.pw = {};
  for (const duty of [0.125, 0.25, 0.5]) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI); im[k] = 2 * Math.pow(Math.sin(Math.PI * k * duty), 2) / (k * Math.PI); }
    G.pw[duty] = ctx.createPeriodicWave(re, im);
  }
  return G;
}
// voice: sources -> ... -> vg (gain) -> pan -> bus (+ reverb send)
function voice(G, ev, when, send) {
  const ctx = G.ctx, vg = ctx.createGain(); vg.gain.value = 0;
  const pan = ctx.createStereoPanner(); pan.pan.value = clamp(ev.p || 0, -1, 1);
  vg.connect(pan); pan.connect(ev.bus === 'm' ? G.music : G.sfx);
  if (send) { const s = ctx.createGain(); s.gain.value = send; pan.connect(s); s.connect(G.revIn); }
  return { vg, srcs: [], end: when + (ev.d || 0.5) + 0.6 };
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
  const tr = t + Math.max(a, dur); g.gain.setTargetAtTime(0, tr, r / 3 + 1e-4);
}
function perc(g, t, a, dec, peak) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, dec / 3 + 1e-4); }
// play one event at context time `when`; returns the voice (for stopping)
function playEvent(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  let V;
  switch (k) {
    // ------------------------------------------------ music
    case 'pad': {
      V = voice(G, ev, when, 0.5); const lp = filt(G, 'lowpass', ev.cut || 1200, 0.8); lp.connect(V.vg);
      for (const det of [-9, 0, 8]) { const o = osc(G, V, 'sawtooth', f, when, when + d + 1.2); o.detune.value = det; o.connect(lp); }
      adsr(V.vg, when, 0.35, 0.6, 0.85, 0.7, d, v * 0.33); V.end = when + d + 1.4; break;
    }
    case 'bass': {
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', 900); lp.connect(V.vg);
      osc(G, V, 'triangle', f, when, when + d + 0.2).connect(lp);
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.2); const sg = ctx.createGain(); sg.gain.value = 0.5; s.connect(sg); sg.connect(lp);
      adsr(V.vg, when, 0.005, 0.08, 0.8, 0.05, d, v); break;
    }
    case 'sub': { V = voice(G, ev, when, 0); osc(G, V, 'sine', f, when, when + d + 0.5).connect(V.vg); adsr(V.vg, when, 0.01, 0.4, 0.5, 0.6, d, v); break; }
    case 'arp': { V = voice(G, ev, when, 0.35); osc(G, V, 0.125, f, when, when + d + 0.3).connect(V.vg); perc(V.vg, when, 0.003, Math.max(0.08, d), v); break; }
    case 'pluck': {
      V = voice(G, ev, when, 0.4); const lp = filt(G, 'lowpass', 3200, 1.2); lp.frequency.setValueAtTime(4200, when); lp.frequency.setTargetAtTime(700, when, 0.08); lp.connect(V.vg);
      osc(G, V, 0.25, f, when, when + d + 0.4).connect(lp); perc(V.vg, when, 0.003, 0.32, v); break;
    }
    case 'lead': {
      V = voice(G, ev, when, 0.45); const o = osc(G, V, 0.5, f, when, when + d + 0.4); const vib = osc(G, V, 'sine', 5.2, when, when + d + 0.4); const vg2 = ctx.createGain(); vg2.gain.value = f * 0.006; vib.connect(vg2); vg2.connect(o.frequency);
      const lp = filt(G, 'lowpass', 2600); o.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.01, 0.15, 0.7, 0.18, d, v); break;
    }
    case 'bell': {
      V = voice(G, ev, when, 0.6); const c = osc(G, V, 'sine', f, when, when + d + 0.5); const m = osc(G, V, 'sine', f * 3.5, when, when + d + 0.5);
      const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 2.4, when); mg.gain.setTargetAtTime(f * 0.2, when, 0.25); m.connect(mg); mg.connect(c.frequency);
      c.connect(V.vg); perc(V.vg, when, 0.004, d * 0.8, v); break;
    }
    case 'kick': {
      V = voice(G, ev, when, 0); const o = osc(G, V, 'sine', 155, when, when + 0.5); o.frequency.setValueAtTime(155, when); o.frequency.exponentialRampToValueAtTime(46, when + 0.12);
      o.connect(V.vg); perc(V.vg, when, 0.002, 0.34, v);
      const n = noiseSrc(G, V, when, when + 0.02, 1); const hp = filt(G, 'highpass', 2500); const ng = ctx.createGain(); ng.gain.value = 0.15; n.connect(hp); hp.connect(ng); ng.connect(V.vg); break;
    }
    case 'clap': case 'snare': {
      V = voice(G, ev, when, 0.3); const n = noiseSrc(G, V, when, when + 0.3, 1); const bp = filt(G, 'bandpass', k === 'clap' ? 1500 : 2200, 0.9); n.connect(bp); bp.connect(V.vg);
      const o = osc(G, V, 'triangle', 190, when, when + 0.12); const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(V.vg);
      perc(V.vg, when, 0.002, k === 'clap' ? 0.16 : 0.1, v); break;
    }
    case 'hat': case 'ohat': case 'tick': {
      V = voice(G, ev, when, 0.1); const n = noiseSrc(G, V, when, when + 0.3, 1); const hp = filt(G, 'highpass', k === 'tick' ? 9000 : 7000, 0.7); n.connect(hp); hp.connect(V.vg);
      perc(V.vg, when, 0.001, k === 'ohat' ? 0.16 : k === 'tick' ? 0.018 : 0.035, v); break;
    }
    case 'crash': { V = voice(G, ev, when, 0.5); const n = noiseSrc(G, V, when, when + 2.0, 1); const hp = filt(G, 'highpass', 4500); n.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.003, 1.4, v); break; }
    // ------------------------------------------------ sfx
    default: V = sfx(G, ev, when);
  }
  return V;
}
function sweepNoise(G, V, when, d, f0, f1, q, peak, att) {
  const n = noiseSrc(G, V, when, when + d + 0.3, 1); const bp = filt(G, 'bandpass', f0, q || 1.2);
  bp.frequency.setValueAtTime(f0, when); bp.frequency.exponentialRampToValueAtTime(Math.max(30, f1), when + d);
  n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, (att || 0.5) * d, d * 0.3, 0.9, 0.15, d * 0.85, peak);
}
function sfx(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  const V = voice(G, ev, when, 0.35);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  switch (k) {
    case 'type': { // grouped soft clicks while a label types
      const n = ev.n || 6; const hp = filt(G, 'highpass', 3000); hp.connect(V.vg); V.vg.gain.value = 0;
      for (let i = 0; i < n; i++) { const t = when + i * 0.055; const s = noiseSrc(G, V, t, t + 0.015, 1.4); const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(hp); perc(g, t, 0.001, 0.012, 1); }
      V.vg.gain.setValueAtTime(v * 0.18, when); V.end = when + n * 0.055 + 0.3; break;
    }
    case 'boom': { tone('sine', 55, when, when + 2).frequency.exponentialRampToValueAtTime(36, when + 1.2); perc(V.vg, when, 0.005, 1.1, v * 0.7); V.end = when + 2.4; break; }
    case 'swish': sweepNoise(G, V, when, d, 600, 4000, 0.8, v * 0.25, 0.5); break;
    case 'whoosh': sweepNoise(G, V, when, d, 300, 2400, 0.9, v * 0.35, 0.4); break;
    case 'dive': sweepNoise(G, V, when, d, 200, 6000, 1.4, v * 0.4, 0.75); { const o = tone('sine', 180, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1400, when + d); } break;
    case 'pull': sweepNoise(G, V, when, d, 5000, 180, 1.2, v * 0.4, 0.3); { const o = tone('sine', 1100, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(120, when + d); } break;
    case 'flip': { const s = noiseSrc(G, V, when, when + 0.08, 1); const bp = filt(G, 'bandpass', 2600, 1.5); s.connect(bp); bp.connect(V.vg); perc(V.vg, when, 0.002, 0.05, v * 0.4); break; }
    case 'rise': { const o = tone('triangle', 220, when, when + d + 0.3); o.frequency.exponentialRampToValueAtTime(660, when + d); adsr(V.vg, when, d * 0.8, 0.1, 0.6, 0.15, d, v * 0.15); break; }
    case 'zap': { const lp = filt(G, 'lowpass', 3000); lp.connect(V.vg); const o = tone('sawtooth', 1400, when, when + d, lp); o.frequency.exponentialRampToValueAtTime(180, when + d); perc(V.vg, when, 0.003, d * 0.7, v * 0.2); break; }
    case 'crack': {
      const s = noiseSrc(G, V, when, when + 0.25, 1); const hp = filt(G, 'highpass', 1200); s.connect(hp); hp.connect(V.vg);
      const o = tone('sine', 140, when, when + 0.3); o.frequency.exponentialRampToValueAtTime(60, when + 0.2);
      const pg = ctx.createGain(); pg.gain.value = 0.25; const p = tone('sine', 2349, when, when + 0.6, pg); pg.connect(V.vg); perc(pg, when, 0.002, 0.4, 0.25);
      perc(V.vg, when, 0.001, 0.14, v * 0.5); V.end = when + 1; break;
    }
    case 'land': { const o = tone('sine', 98, when, when + 0.6); o.frequency.exponentialRampToValueAtTime(55, when + 0.4); perc(V.vg, when, 0.004, 0.4, v * 0.5); break; }
    case 'click': { const s = noiseSrc(G, V, when, when + 0.03, 2); const hp = filt(G, 'highpass', 4000); s.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.001, 0.012, v * 0.35); break; }
    case 'draw': { const s = noiseSrc(G, V, when, when + d, 0.7); const bp = filt(G, 'bandpass', 1800, 2); const lfo = tone('sine', 9, when, when + d); const lg = ctx.createGain(); lg.gain.value = 600; lfo.disconnect(); lfo.connect(lg); lg.connect(bp.frequency); s.connect(bp); bp.connect(V.vg); adsr(V.vg, when, 0.05, 0.1, 0.8, 0.08, d, v * 0.12); break; }
    case 'arc': { const o = tone(0.25, 587, when, when + d + 0.2); o.frequency.linearRampToValueAtTime(880, when + d); adsr(V.vg, when, 0.05, 0.1, 0.7, 0.1, d, v * 0.08); break; }
    case 'bloom': case 'shimmer': {
      const s = noiseSrc(G, V, when, when + d + 0.5, 1); const hp = filt(G, 'highpass', 5000); s.connect(hp); hp.connect(V.vg);
      for (const [fr, dt] of [[1175, 0], [1397, 0.08], [1760, 0.16]]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', fr, when + dt, when + d + 0.6, g); g.connect(V.vg); adsr(g, when + dt, 0.1, 0.3, 0.5, 0.3, d * 0.8, 0.5); }
      adsr(V.vg, when, d * 0.3, d * 0.3, 0.7, 0.3, d * 0.9, v * 0.08); V.end = when + d + 1; break;
    }
    case 'laser': { tone('sine', 1567, when, when + d + 0.2); tone('sine', 1571, when, when + d + 0.2); adsr(V.vg, when, 0.08, 0.2, 0.25, 0.15, d, v * 0.06); break; }
    case 'servo': {
      const lp = filt(G, 'lowpass', 900, 2); lp.connect(V.vg); const o = tone('sawtooth', f || 80, when, when + d + 0.2, lp);
      o.frequency.setValueAtTime(f || 80, when); o.frequency.linearRampToValueAtTime((f || 80) * 1.6, when + d * 0.3); o.frequency.linearRampToValueAtTime((f || 80) * 1.1, when + d);
      const s = noiseSrc(G, V, when, when + d, 0.5); const bp = filt(G, 'bandpass', 1400, 3); const ng = ctx.createGain(); ng.gain.value = 0.2; s.connect(bp); bp.connect(ng); ng.connect(lp);
      adsr(V.vg, when, 0.04, 0.1, 0.8, 0.06, d, v * 0.22); break;
    }
    case 'lock': {
      for (const dt of [0, 0.07]) { const s = noiseSrc(G, V, when + dt, when + dt + 0.03, 2); const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(V.vg); perc(g, when + dt, 0.001, 0.02, 0.5); }
      const o = tone('sine', 110, when + 0.07, when + 0.5); o.frequency.exponentialRampToValueAtTime(70, when + 0.3);
      const bl = ctx.createGain(); bl.gain.value = 0; const b = tone('sine', 1175, when + 0.1, when + 0.8, bl); bl.connect(V.vg); perc(bl, when + 0.1, 0.003, 0.4, 0.3);
      perc(V.vg, when, 0.001, 0.5, v * 0.45); V.vg.gain.setValueAtTime(v * 0.45, when + 0.06); V.end = when + 1; break;
    }
    case 'kv': {
      const lp = filt(G, 'lowpass', 2400); lp.connect(V.vg); tone(0.5, 120, when, when + d + 0.1, lp); tone(0.25, 180, when, when + d + 0.1, lp);
      const s = noiseSrc(G, V, when, when + d, 1); const bp = filt(G, 'bandpass', 3000, 1); const ng = ctx.createGain(); ng.gain.value = 0.4; s.connect(bp); bp.connect(ng); ng.connect(V.vg);
      adsr(V.vg, when, 0.02, 0.05, 0.9, 0.04, d, v * 0.12); break;
    }
    case 'pop': case 'iconpop': { const o = tone('sine', 420, when, when + 0.15); o.frequency.exponentialRampToValueAtTime(k === 'iconpop' ? 1175 : 900, when + 0.06); perc(V.vg, when, 0.002, 0.08, v * 0.35); break; }
    case 'ding': case 'session': {
      const fr = k === 'session' ? 1397 : 1760; const c = tone('sine', fr, when, when + 1.2); const m = tone('sine', fr * 2.01, when, when + 1.2); m.disconnect(); const mg = ctx.createGain(); mg.gain.value = fr * 0.6; m.connect(mg); mg.connect(c.frequency);
      perc(V.vg, when, 0.003, 0.5, v * 0.25);
      if (k === 'session') { const s = noiseSrc(G, V, when, when + 0.3, 1); const bp = filt(G, 'bandpass', 2000, 0.8); const g = ctx.createGain(); g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(V.vg); adsr(g, when, 0.08, 0.05, 0.5, 0.05, 0.2, 0.3); }
      V.end = when + 1.4; break;
    }
    case 'key': { for (const dt of [0, 0.05]) { const s = noiseSrc(G, V, when + dt, when + dt + 0.04, 1.5); const g = ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(V.vg); perc(g, when + dt, 0.001, 0.03, 1); } V.vg.gain.setValueAtTime(v * 0.3, when); V.end = when + 0.4; break; }
    case 'beep': { tone(0.5, f, when, when + 0.18); adsr(V.vg, when, 0.004, 0.02, 0.8, 0.02, 0.12, v * 0.09); break; }
    case 'press': {
      const o = tone('sine', 120, when, when + 0.5); o.frequency.exponentialRampToValueAtTime(50, when + 0.3);
      const s = noiseSrc(G, V, when, when + 0.05, 1); const g = ctx.createGain(); g.gain.value = 0.4; s.connect(g); g.connect(V.vg);
      const up = tone('triangle', 110, when + 0.05, when + 0.7); up.frequency.exponentialRampToValueAtTime(440, when + 0.6);
      perc(V.vg, when, 0.002, 0.5, v * 0.45); V.end = when + 1; break;
    }
    case 'reveal': sweepNoise(G, V, when, d, 400, 2600, 1, v * 0.3, 0.3); { const o = tone('triangle', 147, when, when + d); o.frequency.linearRampToValueAtTime(220, when + d); } break;
    case 'zip': { const o = tone('square', f || 600, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime((f || 600) * 2.2, when + d); const lp = filt(G, 'lowpass', 2500); o.disconnect(); o.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.01, 0.05, 0.6, 0.05, d, v * 0.06); break; }
    case 'rf': case 'rfamp': {
      const base = k === 'rf' ? (f || 440) : 294;
      const trm = ctx.createGain(); trm.gain.value = 0.75; trm.connect(V.vg);
      const c = tone('sine', base, when, when + d + 0.4, trm); const m = tone('sine', base * 1.5, when, when + d + 0.4); m.disconnect(); const mg = ctx.createGain(); mg.gain.value = base * (k === 'rf' ? 0.4 : 0.2); m.connect(mg); mg.connect(c.frequency);
      if (k === 'rfamp') { mg.gain.linearRampToValueAtTime(base * 1.6, when + d * 0.6); const sub = tone(0.25, base / 2, when, when + d + 0.4); const sg = ctx.createGain(); sg.gain.value = 0; sub.disconnect(); sub.connect(sg); sg.connect(trm); adsr(sg, when + 0.5, 0.6, 0.3, 0.7, 0.3, d - 0.6, 0.3); }
      const trem = tone('sine', 7, when, when + d + 0.4); trem.disconnect(); const tg = ctx.createGain(); tg.gain.value = 0.25; trem.connect(tg); tg.connect(trm.gain);
      adsr(V.vg, when, k === 'rf' ? 0.1 : 0.8, 0.2, 0.8, 0.3, d, v * 0.1); break;
    }
    case 'charge': { const o = tone('sawtooth', 70, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(420, when + d); const lp = filt(G, 'lowpass', 1500); o.disconnect(); o.connect(lp); lp.connect(V.vg); adsr(V.vg, when, d * 0.7, 0.05, 0.9, 0.04, d, v * 0.12); break; }
    case 'fire': {
      const o = tone('sine', 90, when, when + 0.6); o.frequency.exponentialRampToValueAtTime(40, when + 0.4);
      const s = noiseSrc(G, V, when, when + 0.35, 1); const bp = filt(G, 'bandpass', 3500, 0.6); const ng = ctx.createGain(); ng.gain.value = 0.6; s.connect(bp); bp.connect(ng); ng.connect(V.vg);
      const sq = tone('square', 196, when, when + 0.09); const sqg = ctx.createGain(); sqg.gain.value = 0.15; sq.disconnect(); sq.connect(sqg); sqg.connect(V.vg);
      perc(V.vg, when, 0.001, 0.35, v * 0.5); V.end = when + 1; break;
    }
    case 'heater': { const o = tone('triangle', 110, when, when + d + 0.2); o.frequency.linearRampToValueAtTime(165, when + d); adsr(V.vg, when, d * 0.6, 0.1, 0.7, 0.1, d, v * 0.12); break; }
    case 'hv': { const o = tone('sine', 80, when, when + 0.3); perc(V.vg, when, 0.002, 0.2, v * 0.3); const s = noiseSrc(G, V, when, when + 0.05, 2); const g = ctx.createGain(); g.gain.value = 0.3; s.connect(g); g.connect(V.vg); break; }
    case 'gun': {
      const s = noiseSrc(G, V, when, when + d, 1.5); const hp = filt(G, 'highpass', 5000); s.connect(hp); hp.connect(V.vg);
      const o = tone('square', 880, when, when + d); o.frequency.exponentialRampToValueAtTime(1760, when + d * 0.8); const og = ctx.createGain(); og.gain.value = 0.15; o.disconnect(); o.connect(og); og.connect(V.vg);
      adsr(V.vg, when, 0.02, 0.1, 0.6, 0.1, d, v * 0.12); break;
    }
    case 'accel': {
      const lp = filt(G, 'lowpass', 600, 4); lp.frequency.setValueAtTime(500, when); lp.frequency.exponentialRampToValueAtTime(5000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', 110, when, when + d + 0.2, lp); o.frequency.exponentialRampToValueAtTime(440, when + d);
      const o2 = tone(0.25, 220, when, when + d + 0.2, lp); o2.frequency.exponentialRampToValueAtTime(880, when + d);
      adsr(V.vg, when, 0.3, 0.2, 0.9, 0.2, d, v * 0.09); break;
    }
    case 'cavity': { tone('sine', f, when, when + 0.25); const p2 = tone('sine', f * 2, when, when + 0.25); perc(V.vg, when, 0.002, 0.12, v * 0.18); break; }
    case 'coil': { const o = tone('sawtooth', 100, when, when + d + 0.2); const lp = filt(G, 'lowpass', 400, 6); o.disconnect(); o.connect(lp); lp.connect(V.vg); const o2 = tone('sine', 200, when, when + d + 0.2); adsr(V.vg, when, 0.2, 0.3, 0.7, 0.3, d, v * 0.12); break; }
    case 'magnet': {
      const o = tone('sine', 55, when, when + d + 0.3); o.frequency.linearRampToValueAtTime(62, when + d);
      const w = tone('sawtooth', 110, when, when + d + 0.3); const lp = filt(G, 'lowpass', 300, 8); lp.frequency.setValueAtTime(200, when); lp.frequency.linearRampToValueAtTime(900, when + d * 0.5); lp.frequency.linearRampToValueAtTime(300, when + d); w.disconnect(); w.connect(lp); lp.connect(V.vg);
      adsr(V.vg, when, 0.15, 0.4, 0.7, 0.3, d, v * 0.2); break;
    }
    case 'impact': { const o = tone('sine', 140, when, when + 0.5); o.frequency.exponentialRampToValueAtTime(60, when + 0.25); const s = noiseSrc(G, V, when, when + 0.2, 1); const hp = filt(G, 'highpass', 2000); s.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.002, 0.3, v * 0.4); break; }
    case 'brems': {
      const c = tone('sine', f, when, when + 1.2); const m = tone('sine', f * 2.76, when, when + 1.2); m.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, when); mg.gain.setTargetAtTime(0, when, 0.15); m.connect(mg); mg.connect(c.frequency);
      const s = noiseSrc(G, V, when, when + 0.1, 2); const hp = filt(G, 'highpass', 6000); const ng = ctx.createGain(); ng.gain.value = 0.25; s.connect(hp); hp.connect(ng); ng.connect(V.vg);
      perc(V.vg, when, 0.002, 0.6, v * 0.3); V.end = when + 1.4; break;
    }
    case 'beam': { const s = noiseSrc(G, V, when, when + d + 0.3, 1); const hp = filt(G, 'highpass', 6500); const lp = filt(G, 'lowpass', 11000); s.connect(hp); hp.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.3, 0.2, 0.8, 0.3, d, v * 0.12); break; }
    case 'flatten': { const s = noiseSrc(G, V, when, when + d + 0.2, 1); const lp = filt(G, 'bandpass', 2500, 4); lp.frequency.setValueAtTime(3500, when); lp.frequency.exponentialRampToValueAtTime(900, when + d); s.connect(lp); lp.connect(V.vg); adsr(V.vg, when, 0.1, 0.2, 0.8, 0.2, d, v * 0.25); break; }
    case 'counter': {
      const n = Math.floor(d / (BEAT / 4)); V.vg.gain.value = 0;
      for (let i = 0; i < n; i++) { const t = when + i * BEAT / 4; const g = ctx.createGain(); g.gain.value = 0; tone('square', i % 4 === 0 ? 1760 : 1320, t, t + 0.03, g); g.connect(V.vg); perc(g, t, 0.001, 0.015, 1); }
      V.vg.gain.setValueAtTime(v * 0.06, when); V.end = when + d + 0.3; break;
    }
    case 'jaw': {
      const lp = filt(G, 'lowpass', 700, 3); lp.connect(V.vg); const o = tone('sawtooth', 65, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(95, when + d * 0.5); o.frequency.linearRampToValueAtTime(70, when + d);
      const c = tone('sine', 90, when + d - 0.05, when + d + 0.3); perc(V.vg, when, 0.03, d, v * 0.25); break;
    }
    case 'leaves': {
      const n = Math.max(3, Math.round(d / 0.07)); V.vg.gain.value = 0;
      for (let i = 0; i < n; i++) { const t = when + i * d / n; const g = ctx.createGain(); g.gain.value = 0; const o = tone('square', 200 + 40 * (i % 3), t, t + 0.06, g); g.connect(V.vg); perc(g, t, 0.002, 0.035, 1); }
      const lp = filt(G, 'lowpass', 1200); V.vg.disconnect(); V.vg.connect(lp); lp.connect(G.sfx); V.vg.gain.setValueAtTime(v * 0.12, when); V.end = when + d + 0.3; break;
    }
    case 'gantry': {
      const lp = filt(G, 'lowpass', 500, 2); lp.connect(V.vg); const o = tone('sawtooth', 58, when, when + d + 0.3, lp); const o2 = tone('triangle', 87, when, when + d + 0.3, lp);
      const lfo = tone('sine', 1 / d, when, when + d + 0.3); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg); lg.connect(lp.frequency);
      adsr(V.vg, when, 0.5, 0.5, 0.8, 0.5, d, v * 0.2); break;
    }
    case 'compton': {
      const c = tone('sine', 1568, when, when + 0.8); const p2 = tone('triangle', 1046, when + 0.02, when + 0.8);
      const s = noiseSrc(G, V, when, when + 0.06, 2); const ng = ctx.createGain(); ng.gain.value = 0.4; s.connect(ng); ng.connect(V.vg);
      const z = tone('square', 700, when + 0.03, when + 0.3); z.frequency.exponentialRampToValueAtTime(240, when + 0.28); const zg = ctx.createGain(); zg.gain.value = 0.12; z.disconnect(); z.connect(zg); zg.connect(V.vg);
      perc(V.vg, when, 0.002, 0.45, v * 0.28); V.end = when + 1; break;
    }
    case 'absorb': { const o = tone('sine', 900, when, when + 0.3); o.frequency.exponentialRampToValueAtTime(300, when + 0.2); perc(V.vg, when, 0.002, 0.15, v * 0.25); break; }
    case 'ionize': { const o = tone('sine', 520 + 300 * hash(Math.floor(when * 100)), when, when + 0.15); o.frequency.exponentialRampToValueAtTime(1300, when + 0.05); perc(V.vg, when, 0.002, 0.06, v * 0.3); break; }
    case 'excite': { tone('sine', 1975, when, when + 0.4); perc(V.vg, when, 0.01, 0.2, v * 0.12); break; }
    case 'hop': { const o = tone('sine', 300, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(900, when + d * 0.6); o.frequency.exponentialRampToValueAtTime(500, when + d); adsr(V.vg, when, 0.05, 0.1, 0.6, 0.08, d, v * 0.18); break; }
    case 'radical': {
      for (let i = 0; i < 3; i++) { const t = when + i * 0.06; const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 600 + i * 220, t, t + 0.12, g); o.frequency.exponentialRampToValueAtTime(1400 + i * 300, t + 0.05); g.connect(V.vg); perc(g, t, 0.002, 0.05, 1); }
      V.vg.gain.setValueAtTime(v * 0.3, when); V.end = when + 0.6; break;
    }
    case 'drift': { const o = tone('sine', 700, when, when + d); const lfo = tone('sine', 6, when, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency); adsr(V.vg, when, 0.2, 0.2, 0.6, 0.2, d, v * 0.08); break; }
    case 'split': { const o = tone('triangle', 220, when, when + 0.6); o.frequency.exponentialRampToValueAtTime(90, when + 0.5); perc(V.vg, when, 0.004, 0.4, v * 0.35); break; }
    case 'proteins': { for (let i = 0; i < 4; i++) { const t = when + i * d / 4; const g = ctx.createGain(); g.gain.value = 0; tone('sine', [392, 440, 523, 587][i], t, t + 0.2, g); g.connect(V.vg); perc(g, t, 0.003, 0.1, 1); } V.vg.gain.setValueAtTime(v * 0.2, when); V.end = when + d + 0.4; break; }
    case 'zipper': { const trm = ctx.createGain(); trm.gain.value = 0.5; trm.connect(V.vg); const o = tone(0.25, 330, when, when + d + 0.1, trm); o.frequency.exponentialRampToValueAtTime(880, when + d); const lfo = tone('square', 24, when, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(trm.gain); adsr(V.vg, when, 0.05, 0.1, 0.6, 0.06, d, v * 0.08); break; }
    case 'repair': {
      for (const [fr, dt] of [[587, 0], [880, 0.09], [1175, 0.18]]) { const g = ctx.createGain(); g.gain.value = 0; const c = tone('sine', fr, when + dt, when + dt + 1.2, g); g.connect(V.vg); perc(g, when + dt, 0.003, 0.6, 1); }
      V.vg.gain.setValueAtTime(v * 0.25, when); V.end = when + 1.6; break;
    }
    case 'stretch': { const o = tone('triangle', 196, when, when + d + 0.1); o.frequency.linearRampToValueAtTime(174, when + d); adsr(V.vg, when, 0.1, 0.1, 0.6, 0.1, d, v * 0.12); break; }
    case 'fragment': { for (let i = 0; i < 6; i++) { const t = when + i * d / 6; const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 300 - i * 25, t, t + 0.15, g); o.frequency.exponentialRampToValueAtTime(120, t + 0.12); g.connect(V.vg); perc(g, t, 0.003, 0.08, 1); } V.vg.gain.setValueAtTime(v * 0.25, when); V.end = when + d + 0.4; break; }
    case 'swell': { const lp = filt(G, 'lowpass', 500, 0.7); lp.frequency.setValueAtTime(500, when); lp.frequency.exponentialRampToValueAtTime(3000, when + d * 0.6); lp.connect(V.vg); for (const m of [nm('F', 3), nm('C', 4), nm('A', 4), nm('G', 5)]) tone('sawtooth', mtof(m), when, when + d + 0.6, lp); adsr(V.vg, when, d * 0.5, 0.4, 0.7, 0.6, d, v * 0.05); V.end = when + d + 1; break; }
    case 'ping': { tone('sine', f, when, when + 0.6); perc(V.vg, when, 0.002, 0.3, v * 0.2); break; }
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
// start playback at timeline position pos (seconds)
function livePlay(pos) {
  const ctx = liveInit();
  if (ctx.state === 'suspended') ctx.resume();
  liveStopVoices();
  LIVE.pos0 = pos; LIVE.t0ctx = ctx.currentTime + 0.05; LIVE.playing = true;
  // resume long sustained events already in progress (pads/beds) without duplicates
  LIVE.idx = 0; while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos) {
    const ev = LIVE.ev[LIVE.idx++];
    const rem = ev.t + (ev.d || 0) - pos;
    if ((ev.k === 'pad' || ev.k === 'beam' || ev.k === 'gantry' || ev.k === 'laser') && rem > 0.3) {
      const e2 = Object.assign({}, ev, { t: pos, d: rem });
      LIVE.voices.push(playEvent(LIVE.G, e2, LIVE.t0ctx));
    }
  }
  clearInterval(LIVE.timer); LIVE.timer = setInterval(liveTick, 25); liveTick();
}
function livePause() {
  if (!LIVE.ctx) return;
  LIVE.pos0 = liveNow(); LIVE.playing = false; clearInterval(LIVE.timer); liveStopVoices();
}
function liveMute(m) { LIVE.muted = m; if (LIVE.G) LIVE.G.master.gain.setTargetAtTime(m ? 0 : 0.9, LIVE.ctx.currentTime, 0.02); }
