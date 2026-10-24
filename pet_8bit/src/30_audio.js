'use strict';
// ============================================================================
// AUDIO — original 128 BPM electronic score in E minor + event-synced SFX.
// 60 s = exactly 32 bars, so the beat grid is continuous across the loop.
// Hook riff from frame one; the first annihilation lands on bar 4; clinical
// groove; mechanical 16ths for the scanner; a build with half a beat of
// silence, then THE DROP exactly on the matter-antimatter annihilation
// (26.25 s, bar 15); precise half-time detector physics (crystal, light and
// SiPM each on a bar downbeat); a rhythmic coincidence section; a warm
// reveal on the reconstructed image (bar 28); recap, title, pickup -> 0:00.
// Atomic-scale sounds are artistic representations (annihilation is silent).
// ============================================================================
const SR = 48000, BAR = 4 * BEAT, TAIL = 3.0;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const CH = { Em: ['E', 'G', 'B'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], D: ['D', 'F#', 'A'], Am: ['A', 'C', 'E'], B: ['B', 'D#', 'F#'], Em9: ['E', 'G', 'B', 'F#'], Cmaj7: ['C', 'E', 'G', 'B'] };
const BARS = ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Am', 'C', 'D', 'Em', 'C', 'B', 'Em', 'C', 'Am', 'Em', 'C', 'B', 'Em', 'C', 'G', 'D', 'B', 'C', 'D', 'Em9', 'Cmaj7', 'Em', 'C', 'D'];
const NBARS = BARS.length;
function chordMidi(name, oct) { let prev = -1; return CH[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
function sec(b) { return b <= 4 ? 'hook' : b <= 8 ? 'clinic' : b <= 11 ? 'mach' : b <= 13 ? 'build' : b === 14 ? 'peak' : b <= 16 ? 'climax' : b <= 20 ? 'detect' : b <= 25 ? 'coinc' : b <= 27 ? 'image' : b <= 29 ? 'reveal' : b <= 31 ? 'recap' : 'pickup'; }
const RIFF = [
  [['B', 4, 0, .5], ['B', 4, .75, .25], ['G', 4, 1, .5], ['B', 4, 1.5, .5], ['E', 5, 2, .75], ['D', 5, 2.75, .25], ['B', 4, 3, 1]],
  [['C', 5, 0, .5], ['C', 5, .75, .25], ['G', 4, 1, .5], ['C', 5, 1.5, .5], ['E', 5, 2, .75], ['D', 5, 2.75, .25], ['C', 5, 3, 1]],
  [['B', 4, 0, .5], ['B', 4, .75, .25], ['G', 4, 1, .5], ['B', 4, 1.5, .5], ['D', 5, 2, .5], ['E', 5, 2.5, .5], ['F#', 5, 3, 1]],
  [['A', 4, 0, .5], ['A', 4, .75, .25], ['F#', 4, 1, .5], ['A', 4, 1.5, .5], ['D', 5, 2, .5], ['C', 5, 2.5, .5], ['B', 4, 3, .5], ['A', 4, 3.5, .5]],
];
function musicEvents() {
  const ev = [];
  const N = (t, d, k, m, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d, k, f: mtof(m), v, p: p || 0 }, x || {})); };
  const D = (t, k, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d: 0.5, k, v, p: p || 0 }, x || {})); };
  const riff = (bar, idx, inst, v, oct, dbl, p) => RIFF[idx].forEach(([n, o, b, l]) => { const t = (bar - 1) * BAR + b * BEAT, m = nm(n, o + (oct || 0)); N(t, l * BEAT, inst, m, v, p || 0); if (dbl) N(t, l * BEAT, inst, m - 12, v * 0.55, -0.25); });
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], s = sec(b), at = beat => t0 + beat * BEAT;
    const root = nm(CH[ch][0], 1), t5 = chordMidi(ch, 5), t4 = chordMidi(ch, 4);
    const padV = { hook: 0.05, clinic: 0.068, mach: 0.045, build: 0.055 + 0.005 * (b - 12), peak: 0.07, climax: 0.07, detect: 0.085, coinc: 0.05, image: 0.06, reveal: 0.085, recap: 0.055, pickup: 0.06 }[s];
    const cut = { hook: 1500, clinic: 1700, mach: 1300, build: 1100 + 500 * (b - 12), peak: 2000, climax: 3200, detect: 1400, coinc: 1600, image: 1400 + 600 * (b - 26), reveal: 2600, recap: 2400, pickup: 1800 }[s];
    const cut1 = { build: 1500 + 500 * (b - 12), peak: 6000, image: 2400 + 900 * (b - 26), pickup: 4200 }[s] || cut;
    for (const m of chordMidi(ch, 3)) N(t0, BAR + 0.04, 'pad', m, padV, (m % 3 - 1) * 0.45, { cut, cut1 });
    if (s === 'climax' || s === 'reveal') for (const m of chordMidi(ch, 4)) N(t0, BAR, 'vox', m, s === 'climax' ? 0.05 : 0.035, (m % 2 ? 0.35 : -0.35));
    // bass
    if (s === 'hook' || s === 'recap') for (let i = 0; i < 8; i++) N(at(i / 2), BEAT / 2 * 0.7, 'bass', root + (i % 2 ? 12 : 0), i % 2 ? 0.16 : 0.22);
    if (s === 'clinic') for (let i = 0; i < 8; i++) N(at(i / 2), BEAT / 2 * 0.8, 'bass', root + (i % 4 === 3 ? 7 : 0), i % 2 ? 0.14 : 0.2, 0, { cut: 950 });
    if (s === 'mach') { const pat = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12]; for (let i = 0; i < 16; i++) N(at(i / 4), BEAT / 4 * 0.6, 'ebass', root + 12 + pat[i], i % 4 === 0 ? 0.2 : 0.12); }
    if (s === 'build') for (let i = 0; i < 16; i++) N(at(i / 4), BEAT / 4 * 0.62, 'bass', root + (i % 4 === 2 ? 12 : 0), i % 4 === 0 ? 0.22 : 0.14, 0, { cut: 600 + 400 * (b - 12) });
    if (s === 'peak') for (let i = 0; i < 14; i++) N(at(i / 4), BEAT / 4 * 0.6, 'bass', root + (i % 2 ? 12 : 0), 0.14 + 0.007 * i, 0, { cut: 2400 });
    if (s === 'climax') { for (let i = 0; i < 16; i++) N(at(i / 4), BEAT / 4 * 0.62, 'bass', root + (i % 4 === 2 ? 12 : 0) + (i % 8 === 7 ? 7 : 0), i % 4 === 0 ? 0.24 : 0.15); N(t0, BAR * 0.95, 'sub', root + 12, 0.2); }
    if (s === 'detect') { N(at(0), BEAT * 1.4, 'bass', root, 0.24); N(at(1.5), BEAT * 0.4, 'bass', root + 12, 0.15); N(at(2.5), BEAT * 0.45, 'bass', root + 7, 0.17); N(at(3.25), BEAT * 0.5, 'bass', root + 12, 0.14); }
    if (s === 'coinc') for (let i = 0; i < 16; i++) N(at(i / 4), BEAT / 4 * 0.6, 'bass', root + ([0, 0, 12, 0][i % 4]), i % 4 === 0 ? 0.21 : 0.13, 0, { cut: 900 });
    if (s === 'image') for (let i = 0; i < (b === 26 ? 8 : 16); i++) N(at(i / (b === 26 ? 2 : 4)), BEAT / (b === 26 ? 2 : 4) * 0.65, 'bass', root + (i % 2 ? 12 : 0), 0.15 + 0.004 * i);
    if (s === 'reveal') { N(t0, BEAT * 1.9, 'bass', root, 0.19); N(at(2), BEAT * 1.9, 'bass', root + 7, 0.15); }
    if (s === 'pickup') { N(t0, BAR, 'bass', nm('D', 2), 0.18); N(t0, BAR, 'sub', nm('D', 2), 0.18, 0, { rise: true }); }
    // drums
    const kick = (beat, v) => D(at(beat), 'kick', v), clap = (beat, v) => D(at(beat), 'clap', v);
    const hat = (beat, v, open) => D(at(beat), open ? 'ohat' : 'hat', v, ((beat * 0.37) % 0.6) - 0.3);
    if (['hook', 'mach', 'build', 'climax', 'coinc', 'image', 'recap'].includes(s)) {
      for (let i = 0; i < 4; i++) kick(i, s === 'climax' ? 0.6 : 0.52);
      if (!(s === 'build' && b === 13)) { clap(1, s === 'climax' ? 0.36 : 0.32); clap(3, s === 'climax' ? 0.36 : 0.32); }
      for (let i = 0; i < 4; i++) hat(i + 0.5, s === 'hook' ? 0.07 : 0.09, s === 'climax' || s === 'coinc' || s === 'recap');
    }
    if (s === 'clinic') { kick(0, 0.5); kick(1, 0.38); kick(2, 0.46); kick(3, 0.38); clap(1, 0.24); clap(3, 0.3); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.075); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.08 : 0.05, 0.25); }
    if (s === 'mach') { for (let i = 0; i < 16; i++) if (i % 2) hat(i / 4, i % 4 === 3 ? 0.06 : 0.04); for (let i = 0; i < 4; i++) D(at(i + 0.75), 'perc', 0.08, i % 2 ? 0.4 : -0.4); }
    if (s === 'climax' || s === 'coinc' || s === 'recap') for (let i = 0; i < 16; i++) if (i % 4 === 1 || i % 4 === 3) hat(i / 4, 0.035);
    if (s === 'hook' && b >= 2) for (let i = 0; i < 16; i++) if (i % 4) hat(i / 4, 0.03);
    if (s === 'build') for (let i = 0; i < (b === 12 ? 8 : 16); i++) D(at(i / (b === 12 ? 2 : 4)), 'snare', 0.05 + i * (b === 12 ? 0.012 : 0.008));
    if (s === 'peak') { for (let i = 0; i < 3; i++) kick(i, 0.55); for (let i = 0; i < 8; i++) D(at(i / 4), 'snare', 0.13 + i * 0.012); for (let i = 0; i < 6; i++) D(at(2 + i / 8), 'snare', 0.2 + i * 0.015); }
    if (s === 'detect') { kick(0, 0.6); kick(1.75, 0.3); kick(2.5, 0.46); clap(2, 0.44); for (let i = 0; i < 16; i++) D(at(i / 4), 'tick', i % 4 === 2 ? 0.09 : 0.04, ((i * 5) % 7) / 7 - 0.5); hat(0.5, 0.05); hat(1.5, 0.07); hat(2.5, 0.05); hat(3.5, 0.07, true); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.06 : 0.035, -0.25); }
    if (s === 'image' && b === 27) for (let i = 0; i < 16; i++) D(at(i / 4), 'snare', 0.06 + i * 0.012);
    if (s === 'reveal') { kick(0, 0.46); kick(1, 0.3); kick(2, 0.4); kick(3, 0.3); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.07 : 0.04, 0.25); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.05); clap(1, 0.16); clap(3, 0.22); }
    if (s === 'pickup') { kick(0, 0.55); kick(1, 0.45); for (let i = 8; i < 16; i++) D(at(i / 4), 'snare', 0.08 + (i - 8) * 0.022); }
    if (b === 11) for (let i = 12; i < 16; i++) D(at(i / 4), 'tom', 0.2 + (i - 12) * 0.04, 0, { f: 190 - (i - 12) * 26 });
    if ([1, 4, 15, 17, 21, 28, 30].includes(b)) D(t0, 'crash', b === 15 || b === 28 ? 0.4 : 0.3);
    // arps / bells
    if (s === 'mach' || s === 'build' || s === 'climax' || s === 'coinc' || s === 'recap') {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let i = 0; i < 16; i++) N(at(i / 4), BEAT / 4 * 0.6, 'arp', t5[pat[i % 8] % t5.length] + (i % 8 >= 6 || (s === 'build' && b === 13) ? 12 : 0), s === 'climax' ? 0.034 : 0.026, i % 2 ? 0.45 : -0.45);
    }
    if (s === 'clinic') [[0.5, 0], [1.5, 1], [2.5, 2], [3.25, 1]].forEach(([p, i], j) => N(at(p), 0.18, 'pluck', t5[i] + 12, 0.05, j % 2 ? 0.3 : -0.3));
    if (s === 'detect') [[0.75, 2], [1.5, 0], [2.25, 1], [3.0, 2], [3.5, 0]].forEach(([p, i], j) => N(at(p), 0.35, 'bell', t5[i] + 12, 0.08 + 0.012 * (j % 2), j % 2 ? 0.4 : -0.4));
    if (s === 'reveal') { N(at(0.5), 0.6, 'bell', t5[0] + 12, 0.08, -0.3); N(at(2), 0.6, 'bell', t5[2], 0.07, 0.3); N(at(3.25), 0.5, 'bell', t5[1] + 12, 0.06, 0); }
  }
  // melodies
  for (let b = 1; b <= 4; b++) riff(b, b - 1, 'lead', 0.08, 0, false);
  for (let b = 5; b <= 8; b++) riff(b, b - 5, 'pluck', 0.06, 1, false, 0.2);
  [['B', 4, 0], ['D#', 5, 0.75], ['F#', 5, 1.5], ['B', 5, 2.25]].forEach(([n, o, p]) => N(13 * BAR + p * BEAT, BEAT * 0.7, 'saw', nm(n, o), 0.06));
  for (let b = 15; b <= 16; b++) riff(b, b - 15, 'saw', 0.075, 0, true);                   // THE DROP: supersaw hook
  for (let b = 21; b <= 24; b++) riff(b, b - 21, 'pluck', 0.04, 1, false, -0.2);
  for (let b = 30; b <= 31; b++) riff(b, b - 30, 'lead', 0.075, 0, false);
  riff(32, 3, 'pluck', 0.05, 1, false);
  return ev;
}
// ---------------------------------------------------------------- SFX: every one tied to a visible event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => { if (t >= 0 && t < DUR) ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {})); };
  const E6 = mtof(nm('E', 6)), B6 = mtof(nm('B', 6)), pent = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
  // S01-S02 PET image -> tissue -> cell -> FDG
  S(0, 'scanimpact', 0.9); S(0.12, 'ping', 0.4, { f: E6 }); S(0.32, 'dive', 0.45, { d: 0.88 });
  S(1.2, 'molzoom', 0.45, { d: 0.4 }); S(1.44, 'select', 0.4); S(1.66, 'lensw', 0.45, { d: 0.26 }); S(1.9, 'glint', 0.5, { f: B6 });
  // S03 / S13 beta-plus decay
  for (const [tD, l0] of [[T_EMIT1, 2.42], [T_DECAY2, 21.2]]) {
    S(l0, 'lensw', 0.4, { d: 0.3 }); S(tD - 0.5, 'dive', 0.3, { d: 0.35 }); S(tD - 0.22, 'charge', 0.3, { d: 0.2 });
    S(tD, 'nuclear', 0.8); S(tD + 0.01, 'emit', 0.6); S(tD + 0.04, 'neutrino', 0.3);
  }
  S(21.95, 'ui', 0.35, { f: mtof(nm('B', 5)) });
  // S04 / S14 the positron loses energy: decelerating, descending ticks
  for (const [t0, t1] of [[4.02, 5.45], [23.05, 24.9]]) PT_VERT.forEach((uv, i) => S(t0 + uv * (t1 - t0), 'ptick', 0.32, { f: 3200 - i * 150, p: (i % 2 ? 0.35 : -0.35) }));
  // S05 first annihilation (bar 4): precise dual-channel impact
  S(T_ANN1 - 0.33, 'orbit', 0.4, { d: 0.32 });
  for (const p of [-0.75, 0.75]) { S(T_ANN1, 'annihilate', 0.75, { p }); S(T_ANN1 + 0.04, 'gammaout', 0.45, { p }); }
  S(T_ANN1, 'boom', 0.6); S(T_ANN1, 'duck', 1, { d: 0.35, amt: 0.55 });
  // S06 pull-out, two synchronized detector clicks
  S(6.25, 'whoosh', 0.22, { d: 0.75 }); S(7.0, 'revwhoosh', 0.6, { d: 0.95 }); for (const p of [-0.7, 0.7]) S(T_DET1, 'detect', 0.7, { p });
  // S07-S10 the tracer
  S(9.05, 'ui', 0.35, { f: E6 }); S(9.55, 'lensw', 0.3, { d: 0.35 }); S(10.0, 'molzoom', 0.4, { d: 0.26 }); S(T_F18, 'glint', 0.55, { f: B6 });
  S(11.05, 'glove', 0.4); S(11.25, 'syringe', 0.45, { d: 0.94 }); S(12.2, 'lensw', 0.35, { d: 0.4 });
  S(13.0, 'enter', 0.5, { d: 0.3 }); S(28 * BEAT, 'bloodpulse', 0.45); S(30 * BEAT, 'bloodpulse', 0.4); S(13.1, 'flow', 0.3, { d: 1.8 });
  S(15.05, 'tl', 0.4, { d: 0.4 }); for (let k = 0; k < 11; k++) S(15.3 + k * 0.15, 'trap', 0.28, { f: mtof(nm('E', 6) + pent[k % 10]), p: (hash(k + 3) - 0.5) * 0.8 });
  // S11-S12 the scanner
  S(17.05, 'swish', 0.3, { d: 0.3 }); S(17.25, 'table', 0.5, { d: 1.4 }); S(18.35, 'beep', 0.4);
  for (let i = 0; i < RING.n; i += 4) S(19.15 + i * 0.022, 'activate', 0.25, { f: 900 + i * 40, p: Math.cos(modAngle(i)) * 0.7 });
  S(20.15, 'dive', 0.3, { d: 0.75 });
  // S15 matter + antimatter: rising tension, the dance, half a beat of silence, THE DROP on the annihilation
  S(25.05, 'tense', 0.5, { d: T_ANN2 - 0.234 - 25.05 }); S(T_ANN2 - 0.65, 'orbit', 0.5, { d: 0.42, accel: true });
  S(T_ANN2 - 0.234, 'duck', 1, { d: 0.234, amt: 0.03, rel: 0.004 });
  for (const p of [-0.8, 0.8]) { S(T_ANN2, 'annihilate', 1.0, { p }); S(T_ANN2 + 0.05, 'gammaout', 0.6, { p }); }
  S(T_ANN2, 'boom', 0.9); S(T_ANN2 + 0.02, 'shimmer', 0.5, { d: 1.0 });
  // S16 dual synchronized energy pulses
  for (const p of [-0.7, 0.7]) S(27.0, 'gammaout', 0.5, { p }); S(27.25, 'ui', 0.3, { f: E6 }); S(27.75, 'ui', 0.3, { f: B6 });
  // S17 photons cross the body: sweeps, a scatter, an absorption, the pair arrives
  { const hA = hitRing(EV_A.p[0], EV_A.p[1], Math.cos(EV_A.th), Math.sin(EV_A.th)), hB = hitRing(EV_A.p[0], EV_A.p[1], -Math.cos(EV_A.th), -Math.sin(EV_A.th)), v = Math.max(hA[2], hB[2]) / (T_REACH - EV_A.t0);
    for (const E of [EV_B, EV_C, EV_A]) { S(E.t0, 'emitsoft', 0.35); S(E.t0 + 0.02, 'sweep', 0.35, { p: Math.cos(E.th) * 0.7, d: 0.5 }); }
    S(EV_B.t0 + EV_B.sc / v, 'scatter', 0.5, { p: -0.4 }); S(EV_C.t0 + EV_C.ab / v, 'absorb', 0.5);
    S(EV_A.t0 + hA[2] / v, 'detect', 0.75, { p: 0.7 }); S(EV_A.t0 + hB[2] / v, 'detect', 0.75, { p: -0.7 }); }
  // S18-S20 crystal -> light -> electric signal (each on a bar downbeat)
  S(31.0, 'dive', 0.4, { d: 0.4 }); S(31.3, 'gammain', 0.5, { d: T_XTAL - 31.3 }); S(T_XTAL, 'crystal', 0.8); S(T_XTAL + 0.02, 'etrack', 0.45, { d: 0.32 });
  S(T_SCINT, 'scint', 0.75); for (let k = 0; k < 9; k++) S(T_SCINT + 0.22 + k * 0.055, 'sparkle', 0.22, { f: 4000 + hash(k + 40) * 3000, p: (hash(k) - 0.5) * 0.6 });
  S(T_SIPM, 'convert', 0.7); FIRED.forEach(([i, j, tf], k) => S(tf, 'cell', 0.16, { f: 1800 + j * 120 + i * 30, p: (i / SP.cols - 0.5) * 0.8 }));
  S(36.05, 'amp', 0.4, { d: 0.25 }); S(36.25, 'digit', 0.4, { f: 2400 }); S(36.35, 'digit', 0.4, { f: 3000 });
  // S21-S24 coincidence, line of response, many events, time of flight
  S(T_C1, 'ping', 0.55, { f: E6, p: -0.7 }); S(T_C2, 'ping', 0.55, { f: E6, p: 0.7 }); S(T_CC, 'coin', 0.7);
  S(T_LOR, 'track', 0.55, { d: 0.4 });
  for (let k = 0; k < EVN; k++) S(T_EV0 + k * BEAT / 4, 'evtick', 0.26 + 0.004 * k, { f: mtof(nm('E', 6) + pent[(k * 3) % 10]), p: (k % 2 ? 0.5 : -0.5) });
  S(42.0, 'data', 0.3, { d: 1.9 }); S(42.75, 'shimmer', 0.3, { d: 1.2 });
  { const c = Math.cos(TOF.th), s = Math.sin(TOF.th), h1 = hitRing(TOF.p[0], TOF.p[1], c, s), h2 = hitRing(TOF.p[0], TOF.p[1], -c, -s), v = (h1[2] - h2[2]) / 0.36;
    S(TOF.t0, 'emitsoft', 0.35); S(TOF.t0 + h2[2] / v, 'tofclick', 0.6, { p: -0.6 }); S(TOF.t0 + h1[2] / v, 'tofclick', 0.6, { p: 0.6 });
    S(45.0, 'compare', 0.55); S(45.3, 'shimmer', 0.35, { d: 0.8 });
    for (const r0 of TOF_REPLAY) { S(r0 + h2[2] / (2 * v), 'tofclick', 0.3, { p: -0.6 }); S(r0 + h1[2] / (2 * v), 'tofclick', 0.3, { p: 0.6 }); } }
  // S25 reconstruction -> warm reveal on bar 28
  S(47.05, 'ui', 0.3, { f: E6 }); S(47.55, 'dive', 0.4, { d: 0.45 }); S(48.0, 'data', 0.45, { d: 1.3 }); S(48.6, 'swish', 0.3, { d: 0.8 });
  for (let i = 0; i < 4; i++) S(49.4 + i * 0.25, 'iter', 0.45, { f: mtof(nm('B', 5) + [0, 3, 5, 7][i]) });
  S(T_REVEAL, 'complete', 0.85);
  // S26 PET + CT
  S(51.0, 'pop', 0.35); S(51.65, 'slide', 0.45, { d: 0.85 }); S(T_FUSE, 'align', 0.75); S(53.34, 'select', 0.4); S(53.9, 'ui', 0.3, { f: E6 }); S(54.42, 'select', 0.4);
  // S27 recap on the beat, title, smooth reverse zoom into the loop
  S(55.0, 'swish', 0.35, { d: 0.3 });
  RECAP.forEach(([name, t], i) => S(t, 'cut', 0.45, { f: mtof(nm('E', 5) + pent[i]) }));
  S(T_TITLE, 'titlee', 0.85); S(59.45, 'revzoom', 0.35, { d: 0.5 });
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
  const ir = ctx.createBuffer(2, Math.floor(SR * 2.2), SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (rnd() * 2 - 1) * Math.pow(1 - t / 2.2, 2) * Math.exp(-t * 2.0) * (t < 0.01 ? t / 0.01 : 1); } }
  G.rev = ctx.createConvolver(); G.rev.buffer = ir;
  G.revIn = ctx.createGain(); G.revIn.connect(G.rev);
  G.mix = ctx.createGain();
  G.revOut = ctx.createGain(); G.revOut.gain.value = 0.28; G.rev.connect(G.revOut); G.revOut.connect(G.mix);
  G.dIn = ctx.createGain();   // dotted-8th ping-pong delay (leads, plucks, rewards)
  const dl = ctx.createDelay(1.0), dr = ctx.createDelay(1.0); dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.34; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  const pl = ctx.createStereoPanner(); pl.pan.value = -0.6; const prr = ctx.createStereoPanner(); prr.pan.value = 0.6;
  G.dIn.connect(dl); dl.connect(dlp); dlp.connect(dr); dr.connect(fb); fb.connect(dl); dl.connect(pl); dr.connect(prr);
  G.dOut = ctx.createGain(); G.dOut.gain.value = 0.5; pl.connect(G.dOut); prr.connect(G.dOut); G.dOut.connect(G.mix);
  G.music = ctx.createGain(); G.music.gain.value = MUSIC_GAIN; G.music.connect(G.mix);
  G.pump = ctx.createGain(); G.pump.gain.value = 1; G.pump.connect(G.music);       // sidechain sub-bus
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
const PUMPED = { pad: 1, bass: 1, ebass: 1, arp: 1, sub: 1, vox: 1 };
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
    case 'vox': { // formant "choir" ("ah": ~730 / 1090 / 2440 Hz)
      V = voice(G, ev, when, 0.5); const sum = ctx.createGain(); sum.gain.value = 1; sum.connect(V.vg);
      for (const [fr, g] of [[730, 1], [1090, 0.55], [2440, 0.3]]) { const bp = filt(G, 'bandpass', fr, 6); const gg = ctx.createGain(); gg.gain.value = g; bp.connect(gg); gg.connect(sum); for (const det of [-7, 7]) { const o = osc(G, V, 'sawtooth', f, when, when + d + 0.8); o.detune.value = det; o.connect(bp); } }
      adsr(V.vg, when, 0.18, 0.4, 0.9, 0.3, d, v * 1.4); V.end = when + d + 1.0; break;
    }
    case 'bass': {
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', ev.cut || 1100, 2); lp.frequency.setValueAtTime(Math.max(2400, (ev.cut || 1100) * 2), when); lp.frequency.setTargetAtTime(ev.cut ? ev.cut * 0.6 : 420, when, 0.06); lp.connect(V.vg);
      osc(G, V, 'sawtooth', f, when, when + d + 0.15).connect(lp);
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.15); const sg = ctx.createGain(); sg.gain.value = 0.9; s.connect(sg); sg.connect(V.vg);
      adsr(V.vg, when, 0.004, 0.09, 0.7, 0.04, d, v); break;
    }
    case 'ebass': { // pulse-wave "electrical" bass
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', 3000, 3); lp.frequency.setValueAtTime(3200, when); lp.frequency.setTargetAtTime(520, when, 0.035); lp.connect(V.vg);
      osc(G, V, 0.25, f, when, when + d + 0.1).connect(lp);
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.1); const sg = ctx.createGain(); sg.gain.value = 0.8; s.connect(sg); sg.connect(V.vg);
      adsr(V.vg, when, 0.003, 0.06, 0.6, 0.03, d, v); break;
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
    case 'saw': {
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
      G.pump.gain.setValueAtTime(0.38, when); G.pump.gain.setTargetAtTime(1.0, when + 0.02, 0.075);
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
      G.music.gain.setTargetAtTime(MUSIC_GAIN * (ev.amt || 0.6), when, 0.03); G.music.gain.setTargetAtTime(MUSIC_GAIN, when + d, ev.rel || 0.12); break;
    }
    case 'stut': { // 32nd-note gate on the music bus (glitch stutter before the drop)
      V = { vg: ctx.createGain(), srcs: [], end: when + d + 0.2 };
      const n = Math.max(2, Math.round(d / (BEAT / 8)));
      for (let i = 0; i < n; i++) G.music.gain.setValueAtTime(MUSIC_GAIN * (i % 2 ? 0.12 : 1), when + i * d / n);
      G.music.gain.setValueAtTime(MUSIC_GAIN, when + d); break;
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
// SFX design: microscopic events are artistic sonifications (real ones are ultrasonic / silent)
function sfx(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  const rewards = { accent: 1, confirm: 1, uion: 1, ui: 1, cut: 1, achieve: 1, ping: 1, glint: 1, plink: 1, lens: 1, ctick: 1, coin: 1, scint: 1, iter: 1, select: 1, emit: 1, trap: 1, align: 1 };
  const V = voice(G, ev, when, 0.3, rewards[k] ? 0.35 : 0);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  const blip = (type, fr, t, dec, peak, dest) => { const g = ctx.createGain(); g.gain.value = 0; tone(type, fr, t, t + dec * 4 + 0.05, g); g.connect(dest || V.vg); perc(g, t, 0.002, dec, peak); return g; };
  const nz = (t, dur, type, fr, q, peak, att, dec, rate) => { const s = noiseSrc(G, V, t, t + dur, rate || 1), b = filt(G, type, fr, q), g = ctx.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(V.vg); perc(g, t, att || 0.001, dec, peak); return b; };
  const boom = (f0, f1, t, dec, peak) => { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', f0, t, t + dec * 4 + 0.1, g); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6); g.connect(V.vg); perc(g, t, 0.003, dec, peak); };
  const level = (x, end) => { V.vg.gain.setValueAtTime(x, when); V.end = when + (end || 1); };
  switch (k) {
    case 'impact': { // deep impact: sub drop, pressure burst, glassy transient, dark chord
      boom(95, 32, when, 0.7, 1); nz(when, 1.0, 'lowpass', 2400, 0.7, 0.35, 0.002, 0.35);
      blip('sine', 3200, when, 0.04, 0.15);
      for (const m of [nm('F', 2), nm('C', 3), nm('Ab', 3)]) { const g = ctx.createGain(); g.gain.value = 0; tone('sawtooth', mtof(m), when, when + 1.4, g); const lp = filt(G, 'lowpass', 900); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.01, 0.6, 0.05); }
      level(v * 0.6, 1.8); break;
    }
    case 'touch': boom(72, 48, when, 0.18, 1); nz(when, 0.2, 'lowpass', 400, 0.7, 0.4, 0.002, 0.08); level(v * 0.4); break;
    case 'ppulse': { // the pressure pulse rushing in: swelling whoomp that ends on contact
      const n = noiseSrc(G, V, when, when + d + 0.05, 0.8), bp = filt(G, 'bandpass', 180, 1.2); bp.frequency.setValueAtTime(180, when); bp.frequency.exponentialRampToValueAtTime(950, when + d); n.connect(bp); bp.connect(V.vg);
      const o = tone('sine', 42, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(88, when + d);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.42, when + d * 0.94); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.3; break;
    }
    case 'crack': { // crystalline crack: broadband snap + inharmonic glassy partials
      nz(when, 0.12, 'highpass', 3000, 0.7, 0.7, 0.001, 0.05);
      [2140, 3370, 5230, 7810].forEach((fr, i) => { const g = blip('sine', fr, when + i * 0.006, 0.05 + 0.04 * (3 - i), 0.45 / (i + 1)); });
      blip('triangle', 4200, when + 0.02, 0.03, 0.4); level(v * 0.35); break;
    }
    case 'ctick': blip('triangle', f, when, 0.04, 1); nz(when, 0.03, 'highpass', 6000, 0.7, 0.4, 0.001, 0.01); level(v * 0.28, 0.6); break;
    case 'revwhoosh': {
      sweepNoise(G, V, when, d, 3200, 260, 1.3, v * 0.38, 0.15);
      const o = tone('sine', 900, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(90, when + d);
      const s2 = noiseSrc(G, V, when, when + d * 0.4, 1); const hp = filt(G, 'highpass', 4000); const g2 = ctx.createGain(); g2.gain.value = 0; s2.connect(hp); hp.connect(g2); g2.connect(V.vg); adsr(g2, when, d * 0.35, 0.02, 0.5, 0.05, d * 0.36, 0.5);
      break;
    }
    case 'whoosh': sweepNoise(G, V, when, d, 300, 2600, 0.9, v * 0.32, 0.4); break;
    case 'swish': sweepNoise(G, V, when, d, 700, 4200, 0.8, v * 0.22, 0.5); break;
    case 'dive': sweepNoise(G, V, when, d, 220, 5200, 1.4, v * 0.36, 0.75); { const o = tone('sine', 200, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1300, when + d); } break;
    case 'land': boom(90, 50, when, 0.2, 1); nz(when, 0.2, 'lowpass', 600, 0.7, 0.3, 0.002, 0.1); level(v * 0.35); break;
    case 'uion': { [0, 3, 7].forEach((s, i) => blip('sine', f * Math.pow(2, s / 12), when + i * 0.04, 0.06, 1)); level(v * 0.2, 0.9); break; }
    case 'ui': blip(0.25, f, when, 0.08, 1); level(v * 0.22, 0.8); break;
    case 'click': { const s = noiseSrc(G, V, when, when + 0.03, 2); const hp = filt(G, 'highpass', 3500); s.connect(hp); hp.connect(V.vg); blip('square', 2200, when, 0.008, 0.3); perc(V.vg, when, 0.001, 0.014, v * 0.4); break; }
    case 'confirm': { [nm('C', 6), nm('F', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.07, 0.08, 1)); level(v * 0.16, 0.9); break; }
    case 'accent': { for (const [m, dt] of [[nm('F', 5), 0], [nm('C', 6), 0.04]]) blip(0.25, mtof(m), when + dt, 0.09, 1); level(v * 0.18, 0.8); break; }
    case 'ping': blip('sine', f, when, 0.25, 1); level(v * 0.2); break;
    case 'chirp': { const o = tone('sine', 900, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(3200, when + 0.15); perc(V.vg, when, 0.003, 0.12, v * 0.15); break; }
    case 'lock': {
      for (const dt of [0, 0.06]) nz(when + dt, 0.03, 'highpass', 2000, 0.7, 0.6, 0.001, 0.02, 2);
      const o = tone('sine', 110, when + 0.06, when + 0.5); o.frequency.exponentialRampToValueAtTime(70, when + 0.3);
      blip(0.25, mtof(nm('C', 6)), when + 0.1, 0.1, 0.35); blip(0.25, mtof(nm('F', 6)), when + 0.17, 0.14, 0.35);
      perc(V.vg, when, 0.001, 0.5, v * 0.45); V.vg.gain.setValueAtTime(v * 0.45, when + 0.05); V.end = when + 1; break;
    }
    case 'scan': { // ultrasound imaging: soft high chirps
      const n = Math.max(2, Math.round(d / 0.12));
      for (let i = 0; i < n; i++) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 2400, when + i * 0.12, when + i * 0.12 + 0.06, g); o.frequency.exponentialRampToValueAtTime(4200, when + i * 0.12 + 0.04); g.connect(V.vg); perc(g, when + i * 0.12, 0.002, 0.025, 1); }
      level(v * 0.1, d + 0.4); break;
    }
    case 'servo': { // positioning motor
      const lp = filt(G, 'lowpass', 700, 2); lp.connect(V.vg); const o = tone('sawtooth', 95, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(150, when + d * 0.7); o.frequency.linearRampToValueAtTime(110, when + d);
      const s = noiseSrc(G, V, when, when + d, 1); const bp = filt(G, 'bandpass', 1200, 3); s.connect(bp); bp.connect(V.vg);
      adsr(V.vg, when, 0.05, 0.1, 0.8, 0.06, d, v * 0.12); break;
    }
    case 'gel': { nz(when, 0.25, 'lowpass', 600, 0.7, 0.5, 0.01, 0.12); const o = tone('sine', 220, when, when + 0.25); o.frequency.exponentialRampToValueAtTime(105, when + 0.15); perc(V.vg, when, 0.005, 0.15, v * 0.35); break; }
    case 'reflect': { // a ping that bounces back (pressure inverted at the air)
      [[0, 1], [0.09, 0.55], [0.18, 0.3]].forEach(([dt, a], i) => blip('sine', 2600 - i * 180, when + dt, 0.07, a));
      const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 1800, when, when + 0.3, g); o.frequency.exponentialRampToValueAtTime(800, when + 0.2); g.connect(V.vg); perc(g, when, 0.003, 0.12, 0.4);
      level(v * 0.22); break;
    }
    case 'pop': { const o = tone('sine', 700, when, when + 0.08); o.frequency.exponentialRampToValueAtTime(1800, when + 0.03); nz(when, 0.02, 'highpass', 4000, 0.7, 0.5, 0.001, 0.008); perc(V.vg, when, 0.001, 0.04, v * 0.35); break; }
    case 'pass': sweepNoise(G, V, when, 0.3, 400, 1800, 1, v * 0.2, 0.4); { const o = tone('sine', 600, when, when + 0.35); o.frequency.exponentialRampToValueAtTime(900, when + 0.3); } break;
    case 'charge': { // capacitor charging whine (rises fast, then levels off)
      const o = tone('triangle', 300, when, when + d + 0.2); o.frequency.setTargetAtTime(2600, when, d / 3.5);
      const vib = tone('sine', 6, when, when + d + 0.2); vib.disconnect(); const vg = ctx.createGain(); vg.gain.value = 25; vib.connect(vg); vg.connect(o.frequency);
      const o2 = tone('sine', 600, when, when + d + 0.2); o2.frequency.setTargetAtTime(5200, when, d / 3.5); const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.disconnect(); o2.connect(g2); g2.connect(V.vg);
      adsr(V.vg, when, 0.3, 0.2, 0.85, 0.08, d, v * 0.1); break;
    }
    case 'qtick': blip('square', f, when, 0.012, 1); level(v * 0.12, 0.4); break;
    case 'zap': { // switch closes: sharp electrical crack + buzz + thump (inside the machine)
      nz(when, 0.08, 'bandpass', 3000, 0.7, 0.9, 0.001, 0.035);
      const lp = filt(G, 'lowpass', 2000); lp.connect(V.vg); const bz = ctx.createGain(); bz.gain.value = 0; tone('sawtooth', 120, when, when + 0.2, bz); bz.connect(lp); perc(bz, when, 0.002, 0.09, 0.5);
      boom(80, 40, when, 0.2, 0.8); level(v * 0.45, 1); break;
    }
    case 'hum': { // changing magnetic field
      const lp = filt(G, 'lowpass', 600, 2); lp.frequency.setValueAtTime(600, when); lp.frequency.exponentialRampToValueAtTime(1700, when + d * 0.5); lp.frequency.exponentialRampToValueAtTime(500, when + d);
      const tr = ctx.createGain(); tr.gain.value = 0.7; const lfo = tone('sine', 12, when, when + d + 0.2); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(tr.gain);
      tone('sawtooth', 110, when, when + d + 0.2, lp); tone('sawtooth', 110.6, when, when + d + 0.2, lp); tone('square', 220, when, when + d + 0.2, lp);
      lp.disconnect(); lp.connect(tr); tr.connect(V.vg);
      adsr(V.vg, when, d * 0.4, 0.2, 0.9, 0.15, d, v * 0.1); break;
    }
    case 'thump': boom(78, 40, when, 0.3, 1); nz(when, 0.02, 'highpass', 2000, 0.7, 0.4, 0.001, 0.008); nz(when, 0.15, 'lowpass', 300, 0.7, 0.5, 0.002, 0.06); level(v * 0.6); break;
    case 'swell': { const n = noiseSrc(G, V, when, when + d + 0.3, 0.8), bp = filt(G, 'bandpass', 300, 1.4); bp.frequency.setValueAtTime(300, when); bp.frequency.exponentialRampToValueAtTime(1400, when + d * 0.5); bp.frequency.exponentialRampToValueAtTime(500, when + d); n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.3, d * 0.3, 0.7, 0.3, d * 0.8, v * 0.25); V.end = when + d + 0.8; break; }
    case 'bloop': { const o = tone('sine', 420, when, when + 0.35); o.frequency.exponentialRampToValueAtTime(640, when + 0.08); o.frequency.exponentialRampToValueAtTime(380, when + 0.25); perc(V.vg, when, 0.01, 0.2, v * 0.25); break; }
    case 'lens': { [nm('C', 7), nm('Eb', 7), nm('G', 7)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.03, 0.12, 1)); level(v * 0.14); break; }
    case 'converge': { // contours converge: rising shimmer, tremolo speeding up
      const o = tone('sine', 300, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(2400, when + d);
      const tr = ctx.createGain(); tr.gain.value = 0.6; const lfo = tone('sine', 4, when, when + d + 0.1); lfo.frequency.exponentialRampToValueAtTime(24, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(tr.gain);
      o.disconnect(); o.connect(tr); tr.connect(V.vg); sweepNoise(G, V, when, d, 500, 6000, 1, v * 0.1, 0.9);
      adsr(V.vg, when, d * 0.9, 0.05, 1, 0.03, d, v * 0.12); break;
    }
    case 'trace': { const o = tone('sine', 800, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(1600, when + d); adsr(V.vg, when, 0.02, 0.1, 0.8, 0.03, d, v * 0.07); break; }
    case 'steepen': { const lp = filt(G, 'lowpass', 400, 4); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(4000, when + d); lp.connect(V.vg); const o = tone('sawtooth', 180, when, when + d + 0.05, lp); o.frequency.exponentialRampToValueAtTime(720, when + d); adsr(V.vg, when, d * 0.8, 0.05, 1, 0.02, d, v * 0.12); break; }
    case 'snap': { nz(when, 0.06, 'highpass', 2000, 0.7, 1, 0.0005, 0.025); blip('sine', 2600, when, 0.05, 0.6); blip('sine', 4100, when, 0.03, 0.4); boom(110, 45, when, 0.18, 0.8); level(v * 0.5); break; }
    case 'thud': { boom(f, f * 0.6, when, 0.16, 1); nz(when, 0.12, 'lowpass', ev.cut || 1200, 0.7, 0.5, 0.002, 0.06); level(v * 0.35, 0.6); break; }
    case 'rise': { // rising tone into the strong impact
      const lp = filt(G, 'lowpass', 500, 3); lp.frequency.setValueAtTime(500, when); lp.frequency.exponentialRampToValueAtTime(5000, when + d); lp.connect(V.vg);
      const o = tone(0.25, mtof(nm('F', 3)), when, when + d + 0.02, lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('F', 5)), when + d);
      const s = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 3000), g = ctx.createGain(); g.gain.value = 0; s.connect(hp); hp.connect(g); g.connect(V.vg); adsr(g, when, d * 0.95, 0.02, 1, 0.01, d, 0.4);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.12, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d + 0.01); V.end = when + d + 0.3; break;
    }
    case 'hit': { // the wave reaches a stone surface: thud + stone ring
      boom(140, 70, when, 0.12, 1); nz(when, 0.06, 'bandpass', 1800, 0.8, 0.5, 0.001, 0.03);
      blip('sine', 1900, when, 0.18, 0.35); blip('sine', 2950, when, 0.12, 0.25); level(v * 0.4); break;
    }
    case 'creak': { for (let i = 0; i < 8; i++) { const tt = when + d * hash(i * 13 + Math.floor(when * 100)); blip('sine', 160 + 160 * hash(i * 7 + 1), tt, 0.02, 0.8); } nz(when, d, 'lowpass', 500, 0.7, 0.25, d * 0.4, d * 0.4); level(v * 0.3, d + 0.5); break; }
    case 'glint': blip('sine', f, when, 0.12, 1); blip('sine', f * 2, when, 0.05, 0.4); level(v * 0.12, 0.8); break;
    case 'tension': { const o = tone('sine', 1400, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(500, when + d); nz(when, d, 'bandpass', 900, 2, 0.3, 0.01, d * 0.5); adsr(V.vg, when, 0.01, 0.1, 0.7, 0.1, d, v * 0.15); break; }
    case 'spall': { // crack activity accelerating as the spall plane opens
      const n = 14; for (let i = 0; i < n; i++) { const tt = when + d * (1 - Math.pow(1 - i / n, 1.8)); nz(tt, 0.03, 'highpass', 2500 + 3000 * hash(i + 5), 0.7, 0.3 + 0.05 * i, 0.0005, 0.012); blip('sine', 2000 + 3000 * hash(i + 9), tt, 0.03, 0.2 + 0.03 * i); }
      level(v * 0.3, d + 0.5); break;
    }
    case 'grind': {
      const n = noiseSrc(G, V, when, when + d + 0.1, 1), bp = filt(G, 'bandpass', 700, 2), am = ctx.createGain(); am.gain.value = 0.5; n.connect(bp); bp.connect(am); am.connect(V.vg);
      const lfo = tone('sawtooth', 30, when, when + d + 0.1); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
      const lp = filt(G, 'lowpass', 300); lp.connect(V.vg); tone('sawtooth', 55, when, when + d + 0.1, lp);
      adsr(V.vg, when, 0.3, 0.3, 0.8, 0.3, d, v * 0.15); break;
    }
    case 'zip': { sweepNoise(G, V, when, d, 1000, 7000, 1.2, v * 0.25, 0.6); for (let i = 0; i < 8; i++) blip('triangle', 2500 + i * 300, when + d * i / 8, 0.02, 0.3); break; }
    case 'bub': { const o = tone('sine', f * 2.2, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(f, when + d); adsr(V.vg, when, d * 0.3, 0.2, 0.7, 0.05, d, v * 0.12); break; }  // pitch falls as the bubble grows
    case 'collapse': { nz(when, 0.04, 'highpass', 3000, 0.7, 1, 0.0005, 0.018); blip('sine', 2400, when, 0.03, 0.5); boom(180, 60, when, 0.07, 0.6); level(v * 0.45, 0.6); break; }
    case 'jet': { const n = noiseSrc(G, V, when, when + 0.08, 1.5), hp = filt(G, 'highpass', 2500); hp.frequency.setValueAtTime(2500, when); hp.frequency.exponentialRampToValueAtTime(9000, when + 0.05); n.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.002, 0.04, v * 0.3); break; }
    case 'pulse': { boom(130, 50, when, 0.09, 1); nz(when, 0.03, 'bandpass', 2500, 0.8, 0.6, 0.001, 0.015); blip('triangle', f, when, 0.06, 0.5); level(v * 0.4, 0.6); break; }
    case 'riser': { // white-noise riser + rising saw into the stutter
      const s = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 800); hp.frequency.setValueAtTime(800, when); hp.frequency.exponentialRampToValueAtTime(9000, when + d); s.connect(hp); hp.connect(V.vg);
      const lp = filt(G, 'lowpass', 1200); lp.frequency.setValueAtTime(1200, when); lp.frequency.exponentialRampToValueAtTime(6000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', mtof(nm('F', 3)), when, when + d, lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('F', 5)), when + d);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.14, when + d * 0.98); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.2; break;
    }
    case 'shatter': { // the stone separates: boom + cascade of crystalline fragments
      boom(90, 32, when, 0.8, 1); nz(when, 0.6, 'lowpass', 4000, 0.7, 0.45, 0.001, 0.25);
      for (let i = 0; i < 24; i++) { const tt = when + 0.9 * Math.pow(i / 24, 1.4); blip(i % 3 ? 'sine' : 'triangle', 6000 - 4200 * (i / 24) + 900 * hash(i + 31), tt, 0.05 + 0.04 * hash(i), 0.5 * (1 - i / 30)); }
      level(v * 0.5, 1.6); break;
    }
    case 'achieve': { [nm('Ab', 5), nm('C', 6), nm('Eb', 6), nm('Ab', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.06, 0.14, 1)); blip('sine', mtof(nm('Eb', 7)), when + 0.24, 0.35, 0.6); nz(when, 0.6, 'highpass', 7000, 0.7, 0.3, 0.02, 0.25); level(v * 0.22, 1.4); break; }
    case 'settle': blip('triangle', 900, when, 0.05, 0.8); boom(120, 70, when, 0.1, 0.8); level(v * 0.25, 0.6); break;
    case 'flow': { const n = noiseSrc(G, V, when, when + d + 0.3, 0.7), lp = filt(G, 'lowpass', 900, 1.5); n.connect(lp); lp.connect(V.vg); const lfo = tone('sine', 0.8, when, when + d + 0.3); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); adsr(V.vg, when, 0.6, 0.5, 0.8, 0.6, d, v * 0.12); V.end = when + d + 1; break; }
    case 'plink': { const o = tone('sine', f, when, when + 0.3); o.frequency.exponentialRampToValueAtTime(f * 1.5, when + 0.02); nz(when, 0.02, 'highpass', 5000, 0.7, 0.3, 0.001, 0.006); perc(V.vg, when, 0.002, 0.15, v * 0.18); break; }
    case 'cut': { blip(0.25, f, when, 0.07, 1); nz(when, 0.05, 'highpass', 5000, 0.7, 0.5, 0.001, 0.03, 1.5); level(v * 0.25, 0.6); break; }
    case 'title': {
      boom(70, 30, when, 1.2, 1); nz(when, 1.0, 'highpass', 6000, 0.7, 0.25, 0.01, 0.5);
      for (const m of [nm('F', 4), nm('Ab', 4), nm('C', 5), nm('G', 5)]) for (const det of [-10, 10]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', mtof(m), when, when + 1.8, g); o.detune.value = det; const lp = filt(G, 'lowpass', 3000); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.01, 1.0, 0.045); }
      level(v * 0.5, 2.2); break;
    }
    // ---------------- PET-specific SFX (atomic-scale ones are artistic representations)
    case 'scanimpact': { // deep digital scan impact on frame one
      boom(92, 34, when, 0.7, 1); nz(when, 0.5, 'highpass', 3000, 0.7, 0.35, 0.001, 0.12);
      const g = ctx.createGain(); g.gain.value = 0; const o = tone('square', 2400, when, when + 0.2, g); o.frequency.exponentialRampToValueAtTime(500, when + 0.12); const lp = filt(G, 'lowpass', 3500); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.002, 0.07, 0.25);
      for (const m of [nm('E', 2), nm('B', 2), nm('G', 3)]) { const gg = ctx.createGain(); gg.gain.value = 0; tone('sawtooth', mtof(m), when, when + 1.3, gg); const f2 = filt(G, 'lowpass', 1100); gg.connect(f2); f2.connect(V.vg); perc(gg, when, 0.01, 0.55, 0.05); }
      level(v * 0.6, 1.6); break;
    }
    case 'molzoom': sweepNoise(G, V, when, d, 400, 7000, 1.2, v * 0.3, 0.8); { const o = tone('sine', 300, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(2000, when + d); } break;
    case 'select': blip('sine', mtof(nm('E', 6)), when, 0.06, 1); blip('sine', mtof(nm('B', 6)), when + 0.05, 0.08, 0.8); level(v * 0.2, 0.7); break;
    case 'lensw': sweepNoise(G, V, when, d, 600, 5200, 1.1, v * 0.3, 0.7); blip('triangle', 2400, when + d, 0.08, v * 0.2); break;
    case 'nuclear': { // sharp nuclear transition
      nz(when, 0.02, 'highpass', 5000, 0.7, 1, 0.0005, 0.006);
      const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 1800, when, when + 0.15, g); o.frequency.exponentialRampToValueAtTime(600, when + 0.06); g.connect(V.vg); perc(g, when, 0.001, 0.05, 0.7);
      boom(150, 70, when, 0.06, 0.6); level(v * 0.45, 0.6); break;
    }
    case 'emit': { const o = tone(0.25, mtof(nm('E', 6)), when, when + 0.3); o.frequency.exponentialRampToValueAtTime(mtof(nm('E', 7)), when + 0.12); perc(V.vg, when, 0.003, 0.12, v * 0.16); break; }
    case 'emitsoft': blip('sine', 1400, when, 0.04, 1); nz(when, 0.03, 'highpass', 4000, 0.7, 0.4, 0.001, 0.01); level(v * 0.2, 0.5); break;
    case 'neutrino': nz(when, 0.15, 'highpass', 6500, 0.7, 1, 0.01, 0.06); level(v * 0.12, 0.5); break;
    case 'ptick': blip('triangle', f, when, 0.02, 1); blip('sine', f * 0.5, when, 0.03, 0.4); level(v * 0.22, 0.4); break;
    case 'orbit': { // the e+/e- pair circling before annihilation (wobble speeds up)
      const tr = ctx.createGain(); tr.gain.value = 0.5; const lfo = tone('sine', 6, when, when + d + 0.05); lfo.disconnect(); if (ev.accel) lfo.frequency.exponentialRampToValueAtTime(40, when + d); const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(tr.gain);
      const a = tone('sine', mtof(nm('B', 4)), when, when + d + 0.05), b = tone('sine', mtof(nm('E', 5)), when, when + d + 0.05); a.disconnect(); b.disconnect(); a.connect(tr); b.connect(tr); tr.connect(V.vg);
      if (ev.accel) { a.frequency.exponentialRampToValueAtTime(mtof(nm('B', 5)), when + d); b.frequency.exponentialRampToValueAtTime(mtof(nm('E', 6)), when + d); }
      adsr(V.vg, when, d * 0.6, 0.05, 1, 0.01, d, v * 0.1); break;
    }
    case 'annihilate': { // precise, bright, short: two channels (panned left / right), no explosion
      nz(when, 0.03, 'highpass', 2500, 0.7, 1, 0.0005, 0.012);
      blip('sine', 1022, when, 0.12, 0.8); blip('sine', 2044, when, 0.06, 0.4); blip(0.25, mtof(nm('E', 6)), when + 0.01, 0.16, 0.35);
      level(v * 0.4, 0.8); break;
    }
    case 'boom': boom(70, 30, when, 0.5, 1); level(v * 0.6, 1.2); break;
    case 'gammaout': case 'sweep': { const n = noiseSrc(G, V, when, when + 0.3, 1.3), bp = filt(G, 'bandpass', 2000, 1.4); bp.frequency.setValueAtTime(2000, when); bp.frequency.exponentialRampToValueAtTime(8000, when + 0.18); n.connect(bp); bp.connect(V.vg); const o = tone('sine', 1500, when, when + 0.25); o.frequency.exponentialRampToValueAtTime(3000, when + 0.18); perc(V.vg, when, 0.005, k === 'sweep' ? 0.12 : 0.18, v * 0.25); break; }
    case 'detect': nz(when, 0.01, 'highpass', 4000, 0.7, 1, 0.0005, 0.004); blip('square', 3000, when, 0.015, 0.5); blip('sine', mtof(nm('B', 6)), when, 0.06, 0.4); level(v * 0.35, 0.5); break;
    case 'glove': { const o = tone('sine', 600, when, when + 0.15); o.frequency.exponentialRampToValueAtTime(950, when + 0.1); nz(when, 0.12, 'lowpass', 1200, 0.7, 0.4, 0.005, 0.05); perc(V.vg, when, 0.005, 0.08, v * 0.2); break; }
    case 'syringe': { const n = noiseSrc(G, V, when, when + d + 0.2, 0.6), lp = filt(G, 'lowpass', 700, 2); n.connect(lp); lp.connect(V.vg); const lfo = tone('sine', 5, when, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 200; lfo.connect(lg); lg.connect(lp.frequency); const o = tone('sine', 300, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(520, when + d); adsr(V.vg, when, 0.1, 0.1, 0.8, 0.15, d, v * 0.18); break; }
    case 'enter': sweepNoise(G, V, when, d, 200, 1500, 1, v * 0.3, 0.6); boom(110, 60, when + d * 0.8, 0.15, 0.5); break;
    case 'bloodpulse': { for (const [dt, a] of [[0, 1], [0.2, 0.6]]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 66, when + dt, when + dt + 0.5, g); o.frequency.exponentialRampToValueAtTime(38, when + dt + 0.18); g.connect(V.vg); perc(g, when + dt, 0.004, 0.18, a); } V.vg.gain.setValueAtTime(v * 0.6, when); V.end = when + 1; break; }
    case 'tl': sweepNoise(G, V, when, d, 5000, 600, 1, v * 0.28, 0.2); for (let i = 0; i < 6; i++) blip('square', 2600 - i * 200, when + i * d / 6, 0.01, 0.3); break;
    case 'trap': blip('sine', f, when, 0.05, 1); blip('triangle', f * 2, when, 0.02, 0.3); level(v * 0.22, 0.5); break;
    case 'table': { const lp = filt(G, 'lowpass', 600, 2); lp.connect(V.vg); const o = tone('sawtooth', 70, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(110, when + d * 0.5); o.frequency.linearRampToValueAtTime(80, when + d); const s2 = noiseSrc(G, V, when, when + d, 0.8); const bp = filt(G, 'bandpass', 900, 3); s2.connect(bp); bp.connect(V.vg); adsr(V.vg, when, 0.15, 0.1, 0.8, 0.12, d, v * 0.14); break; }
    case 'beep': blip('square', mtof(nm('E', 6)), when, 0.06, 0.6); blip('square', mtof(nm('B', 5)), when + 0.12, 0.08, 0.6); level(v * 0.14, 0.6); break;
    case 'activate': blip('square', f, when, 0.02, 1); level(v * 0.12, 0.3); break;
    case 'tense': { // rising microsecond-style tension into the annihilation
      const lp = filt(G, 'lowpass', 400, 4); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(5000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', 110, when, when + d + 0.02, lp); o.frequency.exponentialRampToValueAtTime(880, when + d);
      const s2 = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 2000), g = ctx.createGain(); g.gain.value = 0; s2.connect(hp); hp.connect(g); g.connect(V.vg); adsr(g, when, d * 0.95, 0.02, 1, 0.01, d, 0.4);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.11, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d + 0.01); V.end = when + d + 0.3; break;
    }
    case 'shimmer': { nz(when, d, 'highpass', 7000, 0.7, 0.5, 0.02, d * 0.4); [nm('B', 6), nm('E', 7), nm('G', 7)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.05, 0.25, 0.5)); level(v * 0.18, d + 0.5); break; }
    case 'scatter': { const o = tone('sine', 2400, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(900, when + 0.12); nz(when, 0.05, 'bandpass', 3000, 1, 0.5, 0.001, 0.02); perc(V.vg, when, 0.002, 0.1, v * 0.22); break; }
    case 'absorb': boom(200, 80, when, 0.12, 1); nz(when, 0.1, 'lowpass', 800, 0.7, 0.5, 0.002, 0.05); level(v * 0.3, 0.5); break;
    case 'gammain': { const n = noiseSrc(G, V, when, when + d + 0.1, 1.2), bp = filt(G, 'bandpass', 6000, 1.5); bp.frequency.setValueAtTime(6000, when); bp.frequency.exponentialRampToValueAtTime(1500, when + d); n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.5, 0.1, 0.9, 0.02, d, v * 0.2); break; }
    case 'crystal': { // bright crystalline activation
      nz(when, 0.03, 'highpass', 4000, 0.7, 0.8, 0.0005, 0.01);
      [nm('E', 7), nm('B', 7), nm('G#', 7)].forEach((m, i) => { const c = tone('sine', mtof(m), when, when + 0.8), mo = tone('sine', mtof(m) * 2.76, when, when + 0.8); mo.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime(mtof(m), when); mg.gain.setTargetAtTime(0, when, 0.08); mo.connect(mg); mg.connect(c.frequency); });
      perc(V.vg, when, 0.002, 0.45, v * 0.16); break;
    }
    case 'etrack': { const n = noiseSrc(G, V, when, when + d + 0.05, 1.5), bp = filt(G, 'bandpass', 4000, 2), am = ctx.createGain(); am.gain.value = 0.5; n.connect(bp); bp.connect(am); am.connect(V.vg); const lfo = tone('square', 37, when, when + d); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain); adsr(V.vg, when, 0.01, 0.1, 0.6, 0.05, d, v * 0.22); break; }
    case 'scint': { [nm('E', 6), nm('G#', 6), nm('B', 6), nm('E', 7)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.03, 0.18, 1)); nz(when, 0.4, 'highpass', 6000, 0.7, 0.4, 0.005, 0.15); level(v * 0.2, 1); break; }
    case 'sparkle': blip('sine', f, when, 0.03, 1); level(v * 0.14, 0.3); break;
    case 'convert': { nz(when, 0.01, 'highpass', 3000, 0.7, 1, 0.0005, 0.004); const g = ctx.createGain(); g.gain.value = 0; const o = tone('square', 1500, when, when + 0.1, g); o.frequency.exponentialRampToValueAtTime(3000, when + 0.04); g.connect(V.vg); perc(g, when, 0.001, 0.03, 0.6); boom(160, 90, when, 0.05, 0.5); level(v * 0.35, 0.5); break; }
    case 'cell': blip('square', f, when, 0.008, 1); level(v * 0.12, 0.2); break;
    case 'amp': { const o = tone('sine', 400, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(1600, when + d); adsr(V.vg, when, 0.02, 0.05, 0.8, 0.03, d, v * 0.12); break; }
    case 'digit': blip('square', f, when, 0.03, 1); blip('square', f * 1.5, when + 0.04, 0.03, 0.7); level(v * 0.12, 0.4); break;
    case 'coin': { nz(when, 0.01, 'highpass', 4000, 0.7, 0.8, 0.0005, 0.004); [nm('E', 6), nm('B', 6), nm('E', 7)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.025, 0.2, 1)); level(v * 0.18, 1); break; }
    case 'track': { const pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(-0.8, when); pn.pan.linearRampToValueAtTime(0.8, when + d); pn.connect(V.vg); const o = tone('sine', 800, when, when + d + 0.05, pn); o.frequency.exponentialRampToValueAtTime(1600, when + d); adsr(V.vg, when, 0.02, 0.1, 0.8, 0.05, d, v * 0.14); break; }
    case 'evtick': nz(when, 0.01, 'highpass', 5000, 0.7, 0.6, 0.0005, 0.004); blip('sine', f, when, 0.04, 1); level(v * 0.22, 0.4); break;
    case 'tofclick': nz(when, 0.008, 'highpass', 6000, 0.7, 1, 0.0003, 0.003); blip('sine', 4200, when, 0.015, 0.6); level(v * 0.35, 0.3); break;
    case 'compare': { blip('square', mtof(nm('B', 5)), when, 0.05, 1); blip('square', mtof(nm('C', 6)), when + 0.06, 0.05, 1); blip(0.25, mtof(nm('E', 6)), when + 0.16, 0.12, 1); level(v * 0.13, 0.7); break; }
    case 'data': { const n = Math.round(d / (BEAT / 4)); for (let i = 0; i < n; i++) blip('square', 800 + 2400 * hash(i * 7 + Math.floor(when * 10)), when + i * BEAT / 4, 0.02, 0.6); nz(when, d, 'bandpass', 3000, 1, 0.2, d * 0.3, d * 0.3); level(v * 0.12, d + 0.4); break; }
    case 'iter': blip(0.25, f, when, 0.1, 1); blip('sine', f * 2, when + 0.03, 0.08, 0.4); level(v * 0.16, 0.7); break;
    case 'complete': { // warm scientific completion (E major colour over the minor key)
      boom(82, 41, when, 0.5, 0.6);
      for (const m of [nm('E', 4), nm('G#', 4), nm('B', 4), nm('E', 5)]) for (const det of [-8, 8]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', mtof(m), when, when + 2.0, g); o.detune.value = det; const lp = filt(G, 'lowpass', 2600); g.connect(lp); lp.connect(V.vg); adsr(g, when, 0.03, 0.4, 0.7, 0.6, 1.0, 0.035); }
      [nm('B', 5), nm('E', 6), nm('G#', 6), nm('B', 6)].forEach((m, i) => blip('sine', mtof(m), when + 0.08 + i * 0.07, 0.3, 0.5));
      level(v * 0.5, 2.4); break;
    }
    case 'slide': { const s2 = noiseSrc(G, V, when, when + d + 0.2, 0.7), bp = filt(G, 'bandpass', 1400, 3); s2.connect(bp); bp.connect(V.vg); const lp = filt(G, 'lowpass', 600); lp.connect(V.vg); const o = tone('sawtooth', 92, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(118, when + d); adsr(V.vg, when, 0.06, 0.1, 0.8, 0.08, d, v * 0.12); break; }
    case 'align': { nz(when, 0.01, 'highpass', 3500, 0.7, 0.8, 0.0005, 0.004); nz(when + 0.07, 0.01, 'highpass', 3500, 0.7, 0.8, 0.0005, 0.004); blip(0.25, mtof(nm('B', 5)), when + 0.08, 0.1, 1); blip(0.25, mtof(nm('E', 6)), when + 0.16, 0.25, 1); level(v * 0.2, 1); break; }
    case 'revzoom': sweepNoise(G, V, when, d, 3000, 300, 1.2, v * 0.3, 0.3); { const o = tone('sine', 1200, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(150, when + d); } break;
    case 'titlee': {
      boom(70, 30, when, 1.2, 1); nz(when, 1.0, 'highpass', 6000, 0.7, 0.25, 0.01, 0.5);
      for (const m of [nm('E', 4), nm('G', 4), nm('B', 4), nm('F#', 5)]) for (const det of [-10, 10]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', mtof(m), when, when + 1.8, g); o.detune.value = det; const lp = filt(G, 'lowpass', 3000); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.01, 1.0, 0.045); }
      level(v * 0.5, 2.2); break;
    }
    default: { tone('sine', 880, when, when + 0.1); perc(V.vg, when, 0.001, 0.05, 0.05); }
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export): the tail past 55 s is folded onto 0:00 (seamless loop)
async function renderAudioOffline() {
  const len = Math.round(SR * DUR), lenT = Math.round(SR * (DUR + TAIL));
  const ctx = new OfflineAudioContext(2, lenT, SR);
  const G = makeAudioGraph(ctx);
  for (const ev of allEvents()) playEvent(G, ev, ev.t);
  const r = await ctx.startRendering();
  const out = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) { const a = r.getChannelData(c), o = out.getChannelData(c); o.set(a.subarray(0, len)); for (let i = 0; i < lenT - len; i++) o[i] += a[len + i]; }
  return out;
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
const SUSTAINED = { pad: 1, vox: 1, flow: 1, charge: 1, tense: 1, syringe: 1, table: 1, data: 1 };
function livePlay(pos) {
  const ctx = liveInit();
  if (ctx.state === 'suspended') ctx.resume();
  liveStopVoices();
  LIVE.pos0 = pos; LIVE.t0ctx = ctx.currentTime + 0.05; LIVE.playing = true;
  LIVE.idx = 0; while (LIVE.idx < LIVE.ev.length && LIVE.ev[LIVE.idx].t < pos) {
    const ev = LIVE.ev[LIVE.idx++], rem = ev.t + (ev.d || 0) - pos;
    if (SUSTAINED[ev.k] && rem > 0.3) LIVE.voices.push(playEvent(LIVE.G, Object.assign({}, ev, { t: pos, d: rem }), LIVE.t0ctx));
  }
  clearInterval(LIVE.timer); LIVE.timer = setInterval(liveTick, 25); liveTick();
}
function livePause() {
  if (!LIVE.ctx) return;
  LIVE.pos0 = liveNow(); LIVE.playing = false; clearInterval(LIVE.timer); liveStopVoices();
}
function liveMute(m) { LIVE.muted = m; if (LIVE.G) LIVE.G.master.gain.setTargetAtTime(m ? 0 : 0.9, LIVE.ctx.currentTime, 0.02); }
