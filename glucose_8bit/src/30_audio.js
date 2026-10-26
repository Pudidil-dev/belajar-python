'use strict';
// ============================================================================
// AUDIO — original 129.23 BPM medical-lab electronic score in E minor + SFX.
// 78 s = exactly 42 bars. Friendly chord loop Em-C-G-D. The hook opens with
// the meter's own beep interval (B up to E, a fourth) and comes back in every
// act: glass bell for the drop of blood, plucks inside the strip, an 8-bit
// chip lead for the enzyme reaction, saw stabs on the current surge, a
// "data" lead in the circuit board, then THE DROP on the number (bar 31 =
// 55.71 s) where a B-major dominant lifts straight into G major. A soft
// bell outro thins back to the intro texture so the loop is seamless.
// SFX are tuned to E minor pentatonic so clicks, beeps and pops are part of
// the music. Microscopic sounds are artistic sonifications.
// ============================================================================
const SR = 48000, TAIL = 3.0;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const CHD = { Em: ['E', 'G', 'B'], C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], D: ['D', 'F#', 'A'], Am: ['A', 'C', 'E'], B: ['B', 'D#', 'F#'] };
const BARS = ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'B', 'G', 'D', 'Em',
  'C', 'G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'B', 'G', 'D', 'Em', 'C', 'Am', 'B', 'Em', 'C', 'G', 'D', 'Em', 'D'];
const NBARS = BARS.length;   // 42
function chordMidi(name, oct) { let prev = -1; return CHD[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
function sec(b) {
  return b <= 2 ? 'intro' : b === 3 ? 'touch' : b === 4 ? 'dive' : b <= 8 ? 'flow' : b <= 10 ? 'wake' : b <= 16 ? 'react' : b <= 18 ? 'carry' : b <= 20 ? 'surge' :
    b <= 23 ? 'signal' : b <= 28 ? 'meter' : b <= 30 ? 'build' : b <= 33 ? 'drop' : b === 34 ? 'drop2' : b <= 36 ? 'calm' : b <= 38 ? 'resolve' : 'outro';
}
// melodies: [16th step, note, octave, length in 16ths] — one bar per chord
const HOOK = {
  Em: [[0, 'B', 4, 2], [2, 'E', 5, 3], [5, 'G', 5, 3], [8, 'F#', 5, 2], [10, 'E', 5, 2], [12, 'D', 5, 2], [14, 'E', 5, 2]],
  C: [[0, 'C', 5, 2], [2, 'E', 5, 3], [5, 'G', 5, 3], [8, 'A', 5, 2], [10, 'G', 5, 2], [12, 'E', 5, 2], [14, 'C', 5, 2]],
  G: [[0, 'B', 4, 2], [2, 'D', 5, 3], [5, 'G', 5, 3], [8, 'B', 5, 3], [11, 'A', 5, 1], [12, 'G', 5, 2], [14, 'D', 5, 2]],
  D: [[0, 'A', 4, 2], [2, 'D', 5, 3], [5, 'F#', 5, 3], [8, 'A', 5, 2], [10, 'B', 5, 2], [12, 'A', 5, 2], [14, 'F#', 5, 2]],
  B: [[0, 'B', 4, 2], [2, 'D#', 5, 3], [5, 'F#', 5, 3], [8, 'B', 5, 4], [12, 'A', 5, 2], [14, 'F#', 5, 2]],
  Am: [[0, 'A', 4, 2], [2, 'C', 5, 3], [5, 'E', 5, 3], [8, 'A', 5, 2], [10, 'G', 5, 2], [12, 'E', 5, 2], [14, 'C', 5, 2]],
};
const CNTR = {
  Em: [[0, 'G', 4, 6], [6, 'B', 4, 2], [8, 'E', 5, 6], [14, 'D', 5, 2]], C: [[0, 'E', 5, 6], [6, 'C', 5, 2], [8, 'G', 4, 6], [14, 'C', 5, 2]],
  G: [[0, 'D', 5, 6], [6, 'B', 4, 2], [8, 'D', 5, 4], [12, 'G', 5, 4]], D: [[0, 'F#', 5, 6], [6, 'A', 5, 2], [8, 'F#', 5, 4], [12, 'D', 5, 4]],
  B: [[0, 'F#', 5, 6], [6, 'D#', 5, 2], [8, 'B', 4, 8]], Am: [[0, 'E', 5, 6], [6, 'C', 5, 2], [8, 'A', 4, 8]],
};
const PENT = ['E', 'G', 'A', 'B', 'D'];
const pent = (i, o) => nm(PENT[((i % 5) + 5) % 5], o + Math.floor(i / 5));
function musicEvents() {
  const ev = [];
  // mix: tuned for phone speakers (lighter low end, a clear hook and some sparkle)
  const MIX = { bass: 0.55, ebass: 0.62, sub: 0.42, kick: 0.78, pad: 1.0, lead: 1.55, glead: 1.42, pluck: 1.5, bell: 1.45, saw: 1.4, chop: 1.35, arp: 1.3, hat: 1.45, ohat: 1.35, shaker: 1.3, clap: 1.2, snare: 1.1, vox: 1.15, tick: 1.15 };
  const N = (t, d, k, m, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d, k, f: mtof(m), v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const D = (t, k, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d: 0.5, k, v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const S16 = BEAT / 4;
  const mel = (bar, set, inst, v, oct, opt) => {
    opt = opt || {};
    const arr = set[BARS[bar - 1]];
    arr.forEach(([st, n, o, l], j) => {
      if (opt.only && !opt.only(st)) return;
      const t = (bar - 1) * BAR + st * S16, m = nm(n, o + (oct || 0));
      N(t, l * S16 * (opt.leg || 0.92), inst, m, v * (j === 0 ? 1.08 : 1), opt.p || 0);
      if (opt.dbl) N(t, l * S16 * 0.9, opt.dbl, m - 12, v * (opt.dv || 0.5), -(opt.p || 0));
    });
  };
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], s = sec(b), at = beat => t0 + beat * BEAT;
    const root = nm(CHD[ch][0], 1), r2 = root + 12, t5 = chordMidi(ch, 5);
    // ---- pads (always; colour by act)
    const padV = { intro: 0.06, touch: 0.06, dive: 0.06, flow: 0.05, wake: 0.055, react: 0.05, carry: 0.07, surge: 0.06, signal: 0.05, meter: 0.05, build: 0.065, drop: 0.072, drop2: 0.066, calm: 0.07, resolve: 0.075, outro: 0.068 }[s];
    const cut = { intro: 1200 + 300 * (b - 1), touch: 1800, dive: 1500, flow: 1800, wake: 2200, react: 1900, carry: 1000, surge: 3000, signal: 2000, meter: 1900, build: 1000, drop: 3400, drop2: 3000, calm: 1500, resolve: 2200, outro: b === 42 ? 1300 : 1800 }[s];
    const cut1 = { dive: 4600, build: b === 30 ? 5200 : 2000, carry: b === 18 ? 4200 : 1500, drop2: 1300, outro: b === 42 ? 1200 : cut }[s] || cut;
    for (const m of chordMidi(ch, 3)) N(t0, BAR + 0.04, 'pad', m, padV, (m % 3 - 1) * 0.45, { cut, cut1 });
    if (s === 'drop' || s === 'resolve') for (const m of chordMidi(ch, 4)) N(t0, BAR, 'vox', m, s === 'drop' ? 0.045 : 0.03, (m % 2 ? 0.35 : -0.35));
    // ---- bass
    const b8 = (v, cutv, oct) => { for (let i = 0; i < 8; i++) N(at(i / 2), BEAT / 2 * 0.72, 'bass', root + (i % 2 ? 12 : 0) + (oct || 0), i % 2 ? v * 0.72 : v, 0, { cut: cutv }); };
    if (s === 'intro' && b === 2) N(t0, BAR * 0.95, 'sub', r2, 0.09);
    if (s === 'touch') { N(t0, BEAT * 1.6, 'bass', root, 0.2, 0, { cut: 800 }); N(at(2.5), BEAT * 0.45, 'bass', root + 12, 0.12, 0, { cut: 800 }); N(at(3.5), BEAT * 0.45, 'bass', root + 7, 0.12, 0, { cut: 800 }); N(t0, BAR * 0.95, 'sub', r2, 0.12); }
    if (s === 'dive') { for (let i = 4; i < 16; i++) N(at(i / 4), S16 * 0.62, 'bass', root + (i % 4 === 2 ? 12 : 0), 0.08 + 0.01 * i, 0, { cut: 500 + 160 * i }); N(t0, BAR * 0.95, 'sub', r2, 0.1, 0, { rise: true }); }
    if (s === 'flow' || s === 'wake') { b8(s === 'wake' ? 0.2 : 0.18, 1000); N(t0, BAR * 0.95, 'sub', r2, 0.1); }
    if (s === 'react' || s === 'signal') { const pat = [0, 0, 12, 0, 0, 12, 7, 0, 0, 0, 12, 0, 3, 12, 7, 12]; for (let i = 0; i < 16; i++) if ([0, 3, 6, 8, 10, 11, 13, 14].includes(i)) N(at(i / 4), S16 * 0.7, 'ebass', root + pat[i], (i === 0 ? 0.22 : 0.14) * (s === 'signal' ? 0.85 : 1)); }
    if (s === 'carry') { N(t0, BAR * 0.98, 'sub', r2, 0.13); if (b === 17) { N(t0, BEAT * 1.8, 'bass', root, 0.16, 0, { cut: 600 }); N(at(2), BEAT * 1.8, 'bass', root, 0.13, 0, { cut: 600 }); } else for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'bass', root, 0.1 + 0.008 * i, 0, { cut: 500 + 150 * i }); }
    if (s === 'surge' || s === 'drop') { b8(0.21, 1500); N(t0, BAR * 0.95, 'sub', r2, s === 'drop' ? 0.17 : 0.14); }
    if (s === 'meter') b8(0.18, 1150);
    if (s === 'build') { if (b === 29) b8(0.17, 900); else for (let i = 0; i < 14; i++) N(at(i / 4), S16 * 0.6, 'bass', root, 0.12 + 0.01 * i, 0, { cut: 500 + 180 * i }); N(t0, b === 30 ? BEAT * 3.4 : BAR, 'sub', r2, 0.12, 0, b === 30 ? { rise: true } : null); }
    if (s === 'drop2') { for (let i = 0; i < 6; i++) N(at(i / 2), BEAT / 2 * 0.72, 'bass', root + (i % 2 ? 12 : 0), 0.18 - 0.02 * i, 0, { cut: 1400 - 150 * i }); N(t0, BEAT * 3, 'sub', r2, 0.12); }
    if (s === 'calm') { N(t0, BEAT * 1.9, 'bass', root, 0.17, 0, { cut: 700 }); N(at(2), BEAT * 1.9, 'bass', root + 7, 0.13, 0, { cut: 700 }); }
    if (s === 'resolve') { N(t0, BEAT * 1.9, 'bass', root, 0.18); N(at(2), BEAT * 0.9, 'bass', root + 7, 0.14); N(at(3), BEAT * 0.9, 'bass', root + 12, 0.12); N(t0, BAR * 0.95, 'sub', r2, 0.1); }
    if (s === 'outro') { if (b <= 40) { N(t0, BEAT * 1.9, 'bass', root, 0.15, 0, { cut: 800 }); N(at(2), BEAT * 1.9, 'bass', root + 7, 0.11, 0, { cut: 800 }); } else N(t0, BAR * 0.95, 'sub', r2, 0.09); }
    // ---- drums
    const kick = (beat, v) => D(at(beat), 'kick', v), clap = (beat, v) => D(at(beat), 'clap', v), snare = (beat, v) => D(at(beat), 'snare', v);
    const hat = (beat, v, open) => D(at(beat), open ? 'ohat' : 'hat', v, ((beat * 0.37) % 0.6) - 0.3);
    const tick = (beat, v) => D(at(beat), 'tick', v, ((beat * 5) % 7) / 7 - 0.5);
    if (s === 'intro' || (s === 'outro' && b >= 41)) {
      kick(0, 0.36); if (b !== 1) kick(2, 0.28);
      for (let i = 0; i < 8; i++) if (i % 2) D(at(i / 2), 'shaker', 0.035, 0.25);
    }
    if (s === 'touch') { kick(0, 0.5); clap(2, 0.2); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.05); for (let i = 0; i < 16; i++) D(at(i / 4), 'shaker', i % 2 ? 0.04 : 0.02, 0.25); }
    if (s === 'dive') { kick(0, 0.46); for (let i = 4; i < 16; i++) snare(i / 4, 0.04 + 0.016 * (i - 4)); }
    if (s === 'flow') {
      kick(0, 0.52); kick(2, 0.48); kick(2.75, 0.26); clap(1, 0.28); clap(3, 0.3);
      for (let i = 0; i < 4; i++) hat(i + 0.5, 0.07, b >= 7); for (let i = 0; i < 16; i++) if (i % 2) D(at(i / 4), 'shaker', 0.035, -0.25);
      D(at(1.75), 'tom', 0.12, 0.4, { f: 330 }); D(at(3.75), 'tom', 0.1, -0.4, { f: 247 });
    }
    if (s === 'wake' || s === 'react' || s === 'surge' || s === 'meter' || s === 'drop') {
      const kv = s === 'drop' ? 0.64 : s === 'surge' ? 0.6 : 0.54;
      for (let i = 0; i < 4; i++) kick(i, kv);
      clap(1, s === 'drop' ? 0.4 : 0.32); clap(3, s === 'drop' ? 0.4 : 0.32);
      for (let i = 0; i < 4; i++) hat(i + 0.5, 0.085, s !== 'wake');
      for (let i = 0; i < 16; i++) if (i % 2) hat(i / 4, 0.03);
      if (s === 'meter') for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 2 ? 0.07 : 0.03);
      if (s === 'react') D(at(3.75), 'perc', 0.07, 0.45);
    }
    if (s === 'signal') { kick(0, 0.52); kick(2, 0.48); clap(1, 0.28); clap(3, 0.3); for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 2 ? 0.07 : 0.035); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.06); }
    if (s === 'carry') {
      if (b === 17) { clap(3, 0.2); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.05 : 0.03, 0.25); }
      else { for (let i = 0; i < 8; i++) kick(i / 2, 0.36 + 0.02 * i); for (let i = 0; i < 16; i++) snare(i / 4, 0.05 + 0.013 * i); }
    }
    if (s === 'build') {
      if (b === 29) { for (let i = 0; i < 4; i++) kick(i, 0.48); for (let i = 0; i < 8; i++) snare(i / 2, 0.05 + 0.012 * i); }
      else { for (let i = 0; i < 7; i++) kick(i / 2, 0.42 + 0.02 * i); for (let i = 0; i < 14; i++) snare(i / 4, 0.08 + 0.016 * i); }
    }
    if (s === 'drop2') { kick(0, 0.56); kick(1, 0.5); kick(2, 0.44); clap(1, 0.32); clap(3, 0.22); for (let i = 0; i < 2; i++) hat(i + 0.5, 0.07, true); }
    if (s === 'calm') { kick(0, 0.4); clap(2, 0.2); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.045 : 0.025, 0.25); for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 0 ? 0.04 : 0.018); }
    if (s === 'resolve' || (s === 'outro' && b <= 40)) { const kv = s === 'outro' ? 0.4 : 0.46; kick(0, kv); kick(2, kv * 0.9); clap(1, 0.22); clap(3, 0.24); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.05, true); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.045 : 0.025, 0.25); }
    if ([5, 9, 11, 19, 24, 31, 33, 37].includes(b)) D(t0, 'crash', b === 31 ? 0.46 : b === 19 ? 0.38 : 0.28);
    // ---- arps / bells
    if (s === 'wake' || s === 'surge' || s === 'meter' || s === 'drop' || (s === 'flow' && b >= 7)) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', t5[pat[i % 8] % t5.length] + (i % 8 >= 6 ? 12 : 0) + (s === 'wake' ? 12 : 0), s === 'drop' ? 0.03 : 0.022, i % 2 ? 0.45 : -0.45);
    }
    if (s === 'calm') [[0.5, 0], [1.5, 1], [2.5, 2], [3.25, 1]].forEach(([p, i], j) => N(at(p), 0.3, 'bell', t5[i] + 12, 0.045, j % 2 ? 0.3 : -0.3));
  }
  // ---- the hook through the film
  for (let b = 1; b <= 2; b++) mel(b, HOOK, 'bell', 0.075, 0, { p: 0.1 });                                     // the drop of blood: glass bell
  mel(3, HOOK, 'bell', 0.07, 0, { only: st => st >= 8, p: 0.1 });                                                // (the touch beep owns beat 1)
  for (let b = 5; b <= 8; b++) mel(b, HOOK, 'pluck', 0.062, 0, { dbl: 'pluck', dv: 0.4, p: 0.15 });            // inside the strip: plucks
  for (let b = 9; b <= 10; b++) mel(b, CNTR, 'bell', 0.05, 0, { p: -0.2 });
  for (let b = 11; b <= 14; b++) mel(b, HOOK, 'lead', 0.07, 0);                                                  // the reaction: chip lead
  for (let b = 15; b <= 16; b++) mel(b, CNTR, 'pluck', 0.055, 0, { p: 0.2 });
  mel(18, HOOK, 'bell', 0.05, 0, { only: st => st < 8 });
  for (let b = 19; b <= 20; b++) mel(b, HOOK, 'saw', 0.07, 0, { dbl: 'saw', dv: 0.45 });                         // the current surge
  for (let b = 21; b <= 23; b++) mel(b, HOOK, 'glead', 0.06, 0, { only: st => b < 23 || st % 2 === 0 });         // the signal: data lead
  for (let b = 24; b <= 27; b++) mel(b, HOOK, 'pluck', 0.062, 0, { dbl: 'pluck', dv: 0.45, p: 0.15 });           // the meter: pluck hook
  mel(28, CNTR, 'lead', 0.05, 0);
  mel(29, HOOK, 'lead', 0.06, 1); mel(30, HOOK, 'lead', 0.066, 1, { only: st => st < 12 });                     // build: an octave up, then the stop
  for (let b = 31; b <= 33; b++) { mel(b, HOOK, 'saw', 0.08, 0, { dbl: 'saw', dv: 0.5 }); mel(b, HOOK, 'chop', 0.07, 0, { p: 0.3, leg: 0.4 }); }   // THE DROP (the number)
  mel(34, HOOK, 'saw', 0.06, 0, { only: st => st < 10 });
  for (let b = 35; b <= 36; b++) mel(b, CNTR, 'pluck', 0.045, 0, { p: 0.2 });
  for (let b = 37; b <= 38; b++) mel(b, HOOK, 'pluck', 0.06, 0, { dbl: 'bell', dv: 0.6, p: 0.1 });              // the hand: warm
  for (let b = 39; b <= 42; b++) mel(b, HOOK, 'bell', b >= 41 ? 0.06 : 0.07, 0, { p: -0.1 });                   // title + loop: back to the bell
  return ev;
}
// ---------------------------------------------------------------- SFX: every sound belongs to a visible event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => { if (t >= 0 && t < DUR + TAIL) ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {})); };
  const S16 = BEAT / 4;
  // S01 the click, the drop swells
  S(T_CLICK, 'lancet', 0.85, { p: 0.35 }); S(0.62, 'drip', 0.5, { d: 0.95 }); S(1.6, 'plip', 0.3, { f: mtof(nm('E', 6)) });
  // S02 the meter rises, the strip kisses the drop; the meter beeps (B -> E, the hook interval)
  S(T_STRIP0 + 0.05, 'whoosh', 0.3, { d: 1.4 }); S(T_TOUCH, 'touchw', 0.6); S(T_TOUCH + 0.06, 'beep', 0.55);
  // S03 the blood is sipped into the strip
  S(T_TOUCH + 0.12, 'sip', 0.45, { d: 2.0 });
  // S04 the dive: the lens opens, we land inside
  S(T_DIVE0, 'dive', 0.34, { d: T_DIVE1 - T_DIVE0 }); S(T_DIVE0 + 0.45, 'lensw', 0.4, { d: 0.6 }); S(T_DIVE1, 'land', 0.4);
  // S05 capillary action: flow, air out of the vent, the fill-detect chirp
  S(T_FILL0, 'flow', 0.55, { d: T_FILL1 - T_FILL0 + 0.6 }); S(T_FILL0 + 0.4, 'capi', 0.3, { d: 2.4 }); S(8.6, 'hiss', 0.22, { d: 1.9 }); S(fillDetectT(), 'detect', 0.5);
  // S06 cells and glucose: soft bubbles
  for (let k = 0; k < 6; k++) S(11.2 + k * BEAT, 'bub', 0.22, { f: mtof(pent(5 + (k * 2) % 5, 4)), d: 0.25, p: (k % 2 ? 0.4 : -0.4) });
  S(11.55, 'ui', 0.18, { f: mtof(nm('B', 5)) }); S(12.1, 'ui', 0.2, { f: mtof(nm('E', 6)) });
  // S07 the dry reagent wakes: pops on the 16ths, climbing the scale; three tags
  const wsteps = new Set(); for (const m of ENZ_S.concat(MED_S)) wsteps.add(Math.round((m.tw - T_WAKE) / S16 * 2) / 2);
  [...wsteps].sort((a, b) => a - b).forEach((st, i) => S(T_WAKE + st * S16, 'wake', 0.24 + 0.01 * i, { f: mtof(pent(4 + Math.floor(st), 5)), p: (i % 2 ? 0.35 : -0.35) }));
  S(T_WAKE - 0.05, 'swell', 0.3, { d: 1.2 });
  [15.12, 15.58, 16.05].forEach((t, i) => S(t, 'ui', 0.18, { f: mtof(pent(5 + i * 2, 5)) }));
  // S08 into the molecules; the glucose finds the pocket
  S(T_SR0 + 0.2, 'lensw', 0.36, { d: 0.6 }); S(T_SR1 - 0.1, 'land', 0.3); S(18.2, 'drift', 0.25, { d: 1.2 }); S(T_DOCKG, 'dockg', 0.5);
  // S09 the enzyme grips, two electrons leave the glucose, the product is released
  S(T_GRIP, 'grip', 0.7); S(T_E1, 'eminus', 0.55, { f: mtof(nm('B', 6)) }); S(T_E2, 'eminus', 0.55, { f: mtof(nm('E', 7)) });
  S(T_E2 + 0.15, 'fizz', 0.3); S(T_REL, 'release', 0.5);
  // S10 two mediators dock and charge up (cyan -> green)
  S(T_MD1, 'dockg', 0.35, { small: 1, p: -0.3 }); S(T_MD2, 'dockg', 0.35, { small: 1, p: 0.3 });
  S(T_H1, 'charge2', 0.55, { f: mtof(nm('E', 6)), p: -0.3 }); S(T_H2, 'charge2', 0.55, { f: mtof(nm('G', 6)), p: 0.3 });
  // S11 they carry the electrons away
  S(26.15, 'swish', 0.24, { d: 0.6 }); S(26.6, 'carry', 0.22, { d: 2.2 });
  // S12 the gold electrode comes into view
  S(SC_T[11] + 0.05, 'revzoom', 0.3, { d: 1.4 }); S(30.4, 'gleam', 0.4);
  // S13 the hand-over, then the current surges
  S(T_WALL, 'handoff', 0.6, { p: -0.4 }); S(T_WALL + BEAT, 'handoff', 0.55, { p: -0.2, f: 2 });
  S(T_SURGE - 0.45, 'tense', 0.35, { d: 0.45 }); S(T_SURGE, 'surge', 0.85); S(T_SURGE + 0.1, 'hum', 0.35, { d: 1.5 });
  // S14 the split: low vs high, gauges rise
  S(SC_T[13], 'cut', 0.35, { f: mtof(nm('E', 6)) }); S(35.65, 'gauge', 0.32, { d: 1.2, f: 1, p: -0.5 }); S(35.65, 'gauge', 0.4, { d: 1.2, f: 2, p: 0.5 });
  // S15 out of the molecules, out of the strip, pulses race to the meter
  S(T_OUT0, 'revzoom', 0.3, { d: 0.8 }); S(38.9, 'revzoom', 0.3, { d: 0.85 });
  for (let k = 0; k < 8; k++) S(39.75 + k * S16 * 2, 'pulseb', 0.22 + 0.02 * k, { f: mtof(pent(9 - k, 5)) });
  S(T_PORT, 'connect', 0.55);
  // S16 the meter opens, the current reaches the amplifier
  S(T_OPEN0, 'slide', 0.4, { d: T_OPEN1 - T_OPEN0 }); S(T_OPEN1, 'latch', 0.35);
  for (let k = 0; k < 4; k++) S(41.75 + k * S16 * 2, 'pulseb', 0.2, { f: mtof(pent(5 + k, 5)) });
  S(T_AFE, 'amp', 0.5, { d: 0.9 });
  // S17 the trace: spike, decay, reading window
  S(T_SPIKE, 'spike', 0.5, { d: 1.75 }); S(T_WIN, 'confirm', 0.5);
  // S18 the converter samples the curve (16 ticks following the trace), bits stream out
  for (let k = 0; k < 16; k++) S(T_ADC0 + k * S16, 'qtick', 0.32, { f: 600 + 1500 * iCurve((k + 0.5) / 16), p: (k / 15 - 0.5) * 0.6 });
  S(T_BITS, 'bits', 0.32, { d: 1.35 });
  // S19 the processor: compute, plot, the value
  S(50.35, 'compute', 0.35); S(T_CAL - 0.75, 'plot', 0.3, { d: 0.75 }); S(T_104 - 0.7, 'plot', 0.25, { d: 0.7, f: 2 }); S(T_104, 'beep', 0.35, { small: 1 });
  // S20 the meter closes; dashes blink on the beat; the unit lights
  S(T_CLOSE0, 'slide', 0.35, { d: T_CLOSE1 - T_CLOSE0, rev: 1 }); S(T_CLOSE1, 'latch', 0.4); S(T_CLOSE0 + 0.05, 'revzoom', 0.25, { d: 1.2 });
  for (let k = 1; k < 5; k++) S(T_CLOSE0 + k * BEAT, 'lcd', 0.25);
  S(T_UNIT, 'ui', 0.22, { f: mtof(nm('B', 5)) }); S(T_UNIT, 'riser', 0.45, { d: T_NUM - T_UNIT - 0.03 });
  // S21 the snap and the number: 1 - 0 - 4, the result beep
  S(T_SNAP, 'whoosh', 0.3, { d: 0.25 }); S(T_D1, 'digit', 0.5, { f: mtof(nm('B', 5)) }); S(T_D2, 'digit', 0.5, { f: mtof(nm('D#', 6)) });
  S(T_NUM, 'digit', 0.6, { f: mtof(nm('E', 6)) }); S(T_NUM, 'reveal', 0.9); S(T_NUM + 0.03, 'beep', 0.7, { big: 1 });
  S(T_NUM - BEAT / 2, 'duck', 1, { d: BEAT / 2, amt: 0.06, rel: 0.004 });
  // S22 the recap: one hit per cut, climbing the scale
  for (let k = 0; k < 8; k++) S(T_RECAP + k * BEAT, 'cut', 0.3 + 0.02 * k, { f: mtof(pent(5 + k, 5)), p: (k % 2 ? 0.3 : -0.3) });
  // S23 cells pass, the electrode keeps counting
  S(SC_T[22], 'swish', 0.2, { d: 0.6 }); for (let k = 0; k < 8; k++) S(63.1 + k * BEAT / 2, 'count', 0.16, { f: mtof(pent(7 + (k % 3), 5)), p: -0.4 });
  // S24 enough vs. too little
  S(SC_T[23], 'cut', 0.3, { f: mtof(nm('B', 5)) }); const BMAJ = [nm('B', 5), nm('D#', 6), nm('F#', 6), nm('B', 6), nm('D#', 7), nm('F#', 7)].map(mtof);
  S(65.25, 'sip', 0.3, { d: 1.5, p: -0.4, notes: BMAJ }); S(65.25, 'sip', 0.22, { d: 0.95, p: 0.4, short: 1, notes: BMAJ });
  S(T_RES, 'okchime', 0.55, { p: -0.4 }); S(T_RES + 0.12, 'nope', 0.4, { p: 0.4 });
  // S25 the hand turns the meter to us; the reading glows
  S(SC_T[24], 'swish', 0.22, { d: 0.5 }); S(T_TURN0, 'turn', 0.35, { d: T_TURN1 - T_TURN0 }); S(T_GLOW, 'shimmer', 0.32, { d: 1.4 });
  // S26 back to the fingertip: the strip sips the last of the drop, pulls away, the pen returns (-> frame one)
  S(71.1, 'whoosh', 0.24, { d: 1.2 }); S(T_RET, 'touchw', 0.4); S(T_RET + 0.06, 'sip', 0.3, { d: T_SIP1 - T_RET });
  S(72.62, 'title', 0.45); S(T_AWAY0, 'whoosh', 0.22, { d: 1.1, down: 1 });
  S(T_PEN0 + 0.1, 'servo', 0.22, { d: T_PEN1 - T_PEN0 - 0.2 }); S(T_PEN1, 'seat', 0.4, { p: 0.35 });
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
const PUMPED = { pad: 1, bass: 1, ebass: 1, arp: 1, sub: 1, vox: 1, chop: 1 };
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
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.15); const sg = ctx.createGain(); sg.gain.value = 0.35; s.connect(sg); sg.connect(V.vg);
      adsr(V.vg, when, 0.004, 0.09, 0.7, 0.04, d, v); break;
    }
    case 'ebass': { // pulse-wave "electrical" bass
      V = voice(G, ev, when, 0); const lp = filt(G, 'lowpass', 3000, 3); lp.frequency.setValueAtTime(3200, when); lp.frequency.setTargetAtTime(520, when, 0.035); lp.connect(V.vg);
      osc(G, V, 0.25, f, when, when + d + 0.1).connect(lp);
      const s = osc(G, V, 'sine', f / 2, when, when + d + 0.1); const sg = ctx.createGain(); sg.gain.value = 0.35; s.connect(sg); sg.connect(V.vg);
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
      V = voice(G, ev, when, 0.35, 0.45); const lp = filt(G, 'lowpass', 5200, 1.5); lp.frequency.setValueAtTime(8000, when); lp.frequency.setTargetAtTime(3400, when, 0.14); lp.connect(V.vg);
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
    case 'glead': { // "hacked" chip lead for the takeover: pulse + square, a quick downward bend, digital tremolo
      V = voice(G, ev, when, 0.3, 0.42); const lp = filt(G, 'lowpass', 4200, 2); lp.connect(V.vg);
      const o1 = osc(G, V, 0.125, f * 1.04, when, when + d + 0.3), o2 = osc(G, V, 'square', f * 0.5 * 1.04, when, when + d + 0.3);
      for (const o of [o1, o2]) o.frequency.exponentialRampToValueAtTime(o === o1 ? f : f * 0.5, when + 0.035);
      const og = ctx.createGain(); og.gain.value = 0.25; o2.connect(og); og.connect(lp); o1.connect(lp);
      const tr = ctx.createGain(); tr.gain.value = 1; lp.disconnect(); lp.connect(tr); tr.connect(V.vg);
      const lfo = osc(G, V, 'square', 16, when, when + d + 0.3); const lg = ctx.createGain(); lg.gain.value = 0.18; lfo.connect(lg); lg.connect(tr.gain);
      adsr(V.vg, when, 0.004, 0.1, 0.6, 0.08, d, v); break;
    }
    case 'chop': { // vocal chop: short formant "ah"/"oh" with a tiny pitch scoop
      V = voice(G, ev, when, 0.35, 0.3); const sum = ctx.createGain(); sum.gain.value = 1; sum.connect(V.vg);
      const oh = (Math.round(f) % 2) === 0, fm = oh ? [[570, 1], [840, 0.5], [2410, 0.25]] : [[730, 1], [1090, 0.55], [2440, 0.3]];
      for (const [fr, g] of fm) { const bp = filt(G, 'bandpass', fr, 7); const gg = ctx.createGain(); gg.gain.value = g; bp.connect(gg); gg.connect(sum); for (const det of [-9, 9]) { const o = osc(G, V, 'sawtooth', f * 0.94, when, when + d + 0.3); o.frequency.exponentialRampToValueAtTime(f, when + 0.04); o.detune.value = det; o.connect(bp); } }
      adsr(V.vg, when, 0.008, 0.08, 0.7, 0.06, d, v * 1.6); break;
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
  const rewards = { beep: 1, detect: 1, wake: 1, charge2: 1, handoff: 1, confirm: 1, ui: 1, cut: 1, compute: 1, digit: 1, okchime: 1, eminus: 1, connect: 1, lancet: 1 };
  const V = voice(G, ev, when, 0.3, rewards[k] ? 0.35 : 0);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  const blip = (type, fr, t, dec, peak, dest) => { const g = ctx.createGain(); g.gain.value = 0; tone(type, fr, t, t + dec * 4 + 0.05, g); g.connect(dest || V.vg); perc(g, t, 0.002, dec, peak); return g; };
  const nz = (t, dur, type, fr, q, peak, att, dec, rate) => { const s = noiseSrc(G, V, t, t + dur, rate || 1), b = filt(G, type, fr, q), g = ctx.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(V.vg); perc(g, t, att || 0.001, dec, peak); return b; };
  const boom = (f0, f1, t, dec, peak) => { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', f0, t, t + dec * 4 + 0.1, g); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6); g.connect(V.vg); perc(g, t, 0.003, dec, peak); };
  const level = (x, end) => { V.vg.gain.setValueAtTime(x, when); V.end = when + (end || 1); };
  switch (k) {
    case 'whoosh': if (ev.down) sweepNoise(G, V, when, d, 2600, 300, 0.9, v * 0.3, 0.3); else sweepNoise(G, V, when, d, 300, 2600, 0.9, v * 0.32, 0.4); break;
    case 'swish': sweepNoise(G, V, when, d, 700, 4200, 0.8, v * 0.22, 0.5); break;
    case 'dive': sweepNoise(G, V, when, d, 220, 5200, 1.4, v * 0.36, 0.75); { const o = tone('sine', 200, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1300, when + d); } break;
    case 'land': boom(90, 50, when, 0.2, 1); nz(when, 0.2, 'lowpass', 600, 0.7, 0.3, 0.002, 0.1); level(v * 0.35); break;
    case 'ui': blip(0.25, f, when, 0.08, 1); level(v * 0.22, 0.8); break;
    case 'confirm': { [nm('C', 6), nm('F', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.07, 0.08, 1)); level(v * 0.16, 0.9); break; }
    case 'servo': { // positioning motor
      const lp = filt(G, 'lowpass', 700, 2); lp.connect(V.vg); const o = tone('sawtooth', 95, when, when + d + 0.1, lp); o.frequency.linearRampToValueAtTime(150, when + d * 0.7); o.frequency.linearRampToValueAtTime(110, when + d);
      const s = noiseSrc(G, V, when, when + d, 1); const bp = filt(G, 'bandpass', 1200, 3); s.connect(bp); bp.connect(V.vg);
      adsr(V.vg, when, 0.05, 0.1, 0.8, 0.06, d, v * 0.12); break;
    }
    case 'qtick': blip('square', f, when, 0.012, 1); level(v * 0.12, 0.4); break;
    case 'hum': { // changing magnetic field
      const lp = filt(G, 'lowpass', 600, 2); lp.frequency.setValueAtTime(600, when); lp.frequency.exponentialRampToValueAtTime(1700, when + d * 0.5); lp.frequency.exponentialRampToValueAtTime(500, when + d);
      const tr = ctx.createGain(); tr.gain.value = 0.7; const lfo = tone('sine', 12, when, when + d + 0.2); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(tr.gain);
      tone('sawtooth', 110, when, when + d + 0.2, lp); tone('sawtooth', 110.6, when, when + d + 0.2, lp); tone('square', 220, when, when + d + 0.2, lp);
      lp.disconnect(); lp.connect(tr); tr.connect(V.vg);
      adsr(V.vg, when, d * 0.4, 0.2, 0.9, 0.15, d, v * 0.1); break;
    }
    case 'swell': { const n = noiseSrc(G, V, when, when + d + 0.3, 0.8), bp = filt(G, 'bandpass', 300, 1.4); bp.frequency.setValueAtTime(300, when); bp.frequency.exponentialRampToValueAtTime(1400, when + d * 0.5); bp.frequency.exponentialRampToValueAtTime(500, when + d); n.connect(bp); bp.connect(V.vg); adsr(V.vg, when, d * 0.3, d * 0.3, 0.7, 0.3, d * 0.8, v * 0.25); V.end = when + d + 0.8; break; }
    case 'bub': { const o = tone('sine', f * 2.2, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(f, when + d); adsr(V.vg, when, d * 0.3, 0.2, 0.7, 0.05, d, v * 0.12); break; }  // pitch falls as the bubble grows
    case 'riser': { // white-noise riser + rising saw into the stutter
      const s = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 800); hp.frequency.setValueAtTime(800, when); hp.frequency.exponentialRampToValueAtTime(9000, when + d); s.connect(hp); hp.connect(V.vg);
      const lp = filt(G, 'lowpass', 1200); lp.frequency.setValueAtTime(1200, when); lp.frequency.exponentialRampToValueAtTime(6000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', mtof(nm('F', 3)), when, when + d, lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('F', 5)), when + d);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.14, when + d * 0.98); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.2; break;
    }
    case 'flow': { const n = noiseSrc(G, V, when, when + d + 0.3, 0.7), lp = filt(G, 'lowpass', 900, 1.5); n.connect(lp); lp.connect(V.vg); const lfo = tone('sine', 0.8, when, when + d + 0.3); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); adsr(V.vg, when, 0.6, 0.5, 0.8, 0.6, d, v * 0.12); V.end = when + d + 1; break; }
    case 'cut': { blip(0.25, f, when, 0.07, 1); nz(when, 0.05, 'highpass', 5000, 0.7, 0.5, 0.001, 0.03, 1.5); level(v * 0.25, 0.6); break; }
    case 'title': {
      boom(70, 35, when, 1.0, 0.7); nz(when, 1.2, 'highpass', 6000, 0.7, 0.22, 0.05, 0.5);
      for (const m of [nm('D', 4), nm('F#', 4), nm('A', 4), nm('E', 5)]) for (const det of [-10, 10]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', mtof(m), when, when + 2.2, g); o.detune.value = det; const lp = filt(G, 'lowpass', 2600); g.connect(lp); lp.connect(V.vg); adsr(g, when, 0.25, 0.6, 0.6, 0.6, 1.2, 0.04); }
      blip('sine', mtof(nm('A', 6)), when + 0.3, 0.6, 0.35); level(v * 0.5, 2.6); break;
    }
    case 'revzoom': sweepNoise(G, V, when, d, 3000, 300, 1.2, v * 0.3, 0.3); { const o = tone('sine', 1200, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(150, when + d); } break;
    case 'tense': { // rising tension into a downbeat
      const lp = filt(G, 'lowpass', 400, 4); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(5000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', mtof(nm('D', 3)), when, when + d + 0.02, lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('D', 5)), when + d);
      const s2 = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 2000), g = ctx.createGain(); g.gain.value = 0; s2.connect(hp); hp.connect(g); g.connect(V.vg); adsr(g, when, d * 0.95, 0.02, 1, 0.01, d, 0.4);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.11, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d + 0.01); V.end = when + d + 0.3; break;
    }
    case 'shimmer': { nz(when, d, 'highpass', 7000, 0.7, 0.5, 0.02, d * 0.4); [nm('B', 6), nm('E', 7), nm('G', 7)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.05, 0.25, 0.5)); level(v * 0.18, d + 0.5); break; }
    // ---------------- glucose meter SFX (microscopic events are artistic sonifications)
    case 'lancet': { // spring-loaded lancing pen: sharp click, tiny thunk, a tuned metallic ting
      nz(when, 0.012, 'highpass', 5000, 0.7, 1, 0.0002, 0.004); blip('square', 2600, when, 0.006, 0.4);
      boom(180, 70, when + 0.004, 0.06, 0.6); nz(when + 0.01, 0.06, 'bandpass', 1800, 2, 0.4, 0.001, 0.02);
      blip('sine', mtof(nm('B', 6)), when + 0.02, 0.14, 0.28); level(v * 0.5, 0.7); break;
    }
    case 'drip': { // the drop swells: a rising, wobbling liquid tone
      const o = tone('sine', 250, when, when + d + 0.15); o.frequency.exponentialRampToValueAtTime(640, when + d * 0.85);
      const vib = tone('sine', 10, when, when + d + 0.15); vib.disconnect(); const vg = ctx.createGain(); vg.gain.value = 16; vib.connect(vg); vg.connect(o.frequency);
      nz(when, d, 'lowpass', 700, 0.7, 0.25, d * 0.4, d * 0.3);
      adsr(V.vg, when, d * 0.45, 0.1, 0.85, 0.12, d, v * 0.22); V.end = when + d + 0.5; break;
    }
    case 'plip': { const o = tone('sine', f * 0.6, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(f * 1.2, when + 0.04); perc(V.vg, when, 0.002, 0.09, v * 0.25); break; }
    case 'touchw': { boom(170, 90, when, 0.07, 0.6); nz(when, 0.05, 'bandpass', 1300, 1.5, 0.5, 0.001, 0.02); const o = tone('sine', 700, when, when + 0.12); o.frequency.exponentialRampToValueAtTime(1400, when + 0.05); level(v * 0.4, 0.5); break; }
    case 'beep': { // the meter's beep: B up to E (the hook interval)
      const notes = [[nm('B', 5), 0, 0.085], [nm('E', 6), 0.1, ev.big ? 0.32 : 0.1]];
      for (const [m, dt, du] of notes) {
        const g = ctx.createGain(); g.gain.value = 0; const lp = filt(G, 'lowpass', 5200); tone(0.25, mtof(m), when + dt, when + dt + du + 0.05, lp); lp.connect(g); g.connect(V.vg);
        g.gain.setValueAtTime(0, when + dt); g.gain.linearRampToValueAtTime(1, when + dt + 0.004); g.gain.setValueAtTime(1, when + dt + du); g.gain.linearRampToValueAtTime(0, when + dt + du + 0.012);
        if (ev.big) { const g2 = ctx.createGain(); g2.gain.value = 0; tone('sine', mtof(m + 12), when + dt, when + dt + du + 0.05, g2); g2.connect(V.vg); g2.gain.setValueAtTime(0, when + dt); g2.gain.linearRampToValueAtTime(0.4, when + dt + 0.004); g2.gain.setTargetAtTime(0, when + dt + du, 0.02); }
      }
      level(v * (ev.small ? 0.13 : 0.2), 0.9); break;
    }
    case 'sip': { // capillary suction: a fluttering filtered rush that climbs, with little bubbles
      const n = noiseSrc(G, V, when, when + d + 0.1, 1), bp = filt(G, 'bandpass', 500, 2.5); bp.frequency.setValueAtTime(500, when); bp.frequency.exponentialRampToValueAtTime(ev.short ? 1600 : 3200, when + d);
      const tr = ctx.createGain(); tr.gain.value = 0.7; n.connect(bp); bp.connect(tr); tr.connect(V.vg);
      const lfo = tone('sine', 18, when, when + d + 0.1); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(tr.gain);
      for (let i = 0; i < 6; i++) blip('sine', ev.notes ? ev.notes[i] : mtof(pent(5 + i, 5)), when + d * (i + 0.5) / 7, 0.03, 0.25);
      if (ev.short) { const o = tone('sine', 1800, when + d, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(800, when + d + 0.15); }
      adsr(V.vg, when, 0.06, 0.3, 0.8, 0.1, d, v * 0.2); V.end = when + d + 0.6; break;
    }
    case 'lensw': sweepNoise(G, V, when, d, 600, 5200, 1.1, v * 0.3, 0.7); blip('triangle', 2400, when + d, 0.08, v * 0.2); blip('sine', mtof(nm('B', 6)), when + d, 0.25, v * 0.12); break;
    case 'capi': { const o = tone('triangle', 330, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(990, when + d); adsr(V.vg, when, 0.2, 0.2, 0.7, 0.2, d, v * 0.06); break; }
    case 'hiss': { const n = noiseSrc(G, V, when, when + d + 0.1, 1), hp = filt(G, 'highpass', 6000); n.connect(hp); hp.connect(V.vg); adsr(V.vg, when, 0.3, 0.3, 0.8, 0.3, d, v * 0.12); break; }
    case 'detect': { [nm('E', 6), nm('G', 6), nm('B', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.055, 0.06, 1)); level(v * 0.16, 0.8); break; }
    case 'wake': { const o = tone('sine', 520, when, when + 0.1); o.frequency.exponentialRampToValueAtTime(1500, when + 0.03); nz(when, 0.015, 'highpass', 4000, 0.7, 0.4, 0.0005, 0.006); blip('triangle', f, when + 0.025, 0.09, 0.8); perc(V.vg, when, 0.002, 0.12, v * 0.28); break; }
    case 'drift': { sweepNoise(G, V, when, d, 1500, 3200, 2, v * 0.12, 0.5); const o = tone('sine', mtof(nm('B', 5)), when, when + d); const vb = tone('sine', 5, when, when + d); vb.disconnect(); const g = ctx.createGain(); g.gain.value = 9; vb.connect(g); g.connect(o.frequency); o.disconnect(); const og = ctx.createGain(); og.gain.value = 0.15; o.connect(og); og.connect(V.vg); break; }
    case 'dockg': { const s = ev.small ? 0.6 : 1; nz(when, 0.01, 'highpass', 4000, 0.7, 1, 0.0003, 0.004); nz(when + 0.03, 0.01, 'highpass', 4000, 0.7, 0.7, 0.0003, 0.004); const o = tone('sine', 300, when, when + 0.15); o.frequency.exponentialRampToValueAtTime(520, when + 0.08); boom(140, 70, when, 0.06, 0.4); perc(V.vg, when, 0.002, 0.14, v * 0.3 * s); break; }
    case 'grip': { // the enzyme closes on the glucose: clicks, a rubbery squelch, a thump, a tuned clamp note
      nz(when, 0.01, 'highpass', 4000, 0.7, 1, 0.0003, 0.004); nz(when + 0.04, 0.01, 'highpass', 4000, 0.7, 0.8, 0.0003, 0.004);
      const lp = filt(G, 'lowpass', 900, 3); lp.connect(V.vg); const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', 180, when, when + 0.3, g); o.frequency.exponentialRampToValueAtTime(85, when + 0.18); g.connect(lp); perc(g, when, 0.004, 0.12, 0.6);
      boom(120, 60, when, 0.12, 0.8); blip(0.25, mtof(nm('E', 5)), when + 0.05, 0.12, 0.45); level(v * 0.42, 0.8); break;
    }
    case 'eminus': { // an electron leaves: a bright blip with a falling sparkle
      blip('square', f, when, 0.05, 0.7); const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', f * 2, when, when + 0.15, g); o.frequency.exponentialRampToValueAtTime(f, when + 0.09); g.connect(V.vg); perc(g, when, 0.002, 0.07, 0.5);
      nz(when, 0.03, 'highpass', 6000, 0.7, 0.4, 0.0005, 0.01); level(v * 0.25, 0.6); break;
    }
    case 'fizz': { const n = noiseSrc(G, V, when, when + 0.35, 1), hp = filt(G, 'highpass', 4000); const tr = ctx.createGain(); tr.gain.value = 0.6; n.connect(hp); hp.connect(tr); tr.connect(V.vg); const lfo = tone('square', 26, when, when + 0.35); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(tr.gain); blip('sine', mtof(nm('G', 6)), when + 0.12, 0.1, 0.5); perc(V.vg, when, 0.01, 0.15, v * 0.25); break; }
    case 'release': { sweepNoise(G, V, when, 0.35, 500, 3200, 1, v * 0.22, 0.4); const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', 400, when, when + 0.15, g); o.frequency.exponentialRampToValueAtTime(1200, when + 0.05); g.connect(V.vg); perc(g, when, 0.002, 0.08, v * 0.3); break; }
    case 'charge2': { // a mediator takes an electron and turns green: a two-step power-up
      blip(0.25, f, when, 0.06, 1); blip(0.25, f * 1.5, when + 0.06, 0.08, 0.9); blip('sine', f * 2, when + 0.12, 0.22, 0.6);
      nz(when + 0.1, 0.3, 'highpass', 7000, 0.7, 0.3, 0.01, 0.12); level(v * 0.24, 0.9); break;
    }
    case 'carry': { const o = tone('sine', 220, when, when + d + 0.2); const vb = tone('sine', 1.6, when, when + d + 0.2); vb.disconnect(); const g = ctx.createGain(); g.gain.value = 18; vb.connect(g); g.connect(o.frequency); nz(when, d, 'lowpass', 500, 0.7, 0.3, d * 0.3, d * 0.4); adsr(V.vg, when, d * 0.3, 0.3, 0.7, 0.3, d, v * 0.12); break; }
    case 'gleam': { const f0 = mtof(nm('E', 6)); [1, 2.76, 5.4, 8.93].forEach((r, i) => blip('sine', f0 * r, when + i * 0.02, 0.6 - i * 0.1, 0.6 / (i + 1))); nz(when, 0.8, 'highpass', 7000, 0.7, 0.25, 0.02, 0.3); level(v * 0.2, 1.4); break; }
    case 'handoff': { // the electron jumps into the gold: blip + metallic ting + soft thump
      const fr = f === 2 ? mtof(nm('G', 6)) : mtof(nm('E', 6));
      blip('square', fr, when, 0.05, 0.6); blip('sine', 3100, when + 0.02, 0.18, 0.35); blip('sine', 4700, when + 0.02, 0.12, 0.2); boom(130, 60, when, 0.08, 0.5);
      level(v * 0.3, 0.8); break;
    }
    case 'surge': { // the current switches on: rising buzz, impact, crackle, a G-major stab
      const lp = filt(G, 'lowpass', 400, 3); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(4000, when + 0.4); lp.connect(V.vg);
      const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', 80, when, when + 0.9, g); o.frequency.exponentialRampToValueAtTime(220, when + 0.45); g.connect(lp); adsr(g, when, 0.01, 0.2, 0.5, 0.2, 0.5, 0.35);
      boom(110, 40, when, 0.5, 0.9);
      for (let i = 0; i < 10; i++) nz(when + 0.03 + 0.6 * hash(i + 401), 0.02, 'highpass', 2500 + 3000 * hash(i + 402), 0.7, 0.5, 0.0005, 0.008);
      for (const m of [nm('G', 4), nm('B', 4), nm('D', 5)]) blip(0.25, mtof(m), when, 0.25, 0.25);
      level(v * 0.45, 1.6); break;
    }
    case 'gauge': { const top = ev.f === 2 ? 2.6 : 1.45; const o = tone('sine', 380, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(380 * top, when + d); const tr = ctx.createGain(); tr.gain.value = 0.7; o.disconnect(); o.connect(tr); tr.connect(V.vg); const lfo = tone('sine', 12, when, when + d + 0.1); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(tr.gain); adsr(V.vg, when, 0.05, 0.2, 0.9, 0.1, d, v * 0.08); break; }
    case 'pulseb': blip('square', f, when, 0.04, 1); nz(when, 0.01, 'highpass', 5000, 0.7, 0.4, 0.0003, 0.004); level(v * 0.18, 0.4); break;
    case 'connect': { // the strip contacts meet the meter's spring contacts
      nz(when, 0.01, 'highpass', 4500, 0.7, 1, 0.0003, 0.004); nz(when + 0.03, 0.01, 'highpass', 4500, 0.7, 0.8, 0.0003, 0.004);
      blip(0.25, mtof(nm('E', 6)), when + 0.02, 0.09, 0.7); blip(0.25, mtof(nm('B', 6)), when + 0.08, 0.14, 0.6); boom(120, 55, when, 0.1, 0.6);
      const g = ctx.createGain(); g.gain.value = 0; tone('sawtooth', 120, when, when + 0.15, g); const lp = filt(G, 'lowpass', 1500); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.002, 0.06, 0.3);
      level(v * 0.32, 0.8); break;
    }
    case 'slide': { const a = ev.rev ? 3000 : 800, b = ev.rev ? 800 : 3000; sweepNoise(G, V, when, d, a, b, 1.6, v * 0.18, 0.3); nz(when, 0.01, 'highpass', 3500, 0.7, 0.5, 0.0003, 0.004); break; }
    case 'latch': { nz(when, 0.012, 'highpass', 3500, 0.7, 1, 0.0003, 0.005); boom(150, 70, when, 0.08, 0.7); blip('triangle', 1400, when, 0.04, 0.4); level(v * 0.35, 0.5); break; }
    case 'amp': { // the amplifier wakes: a low drone opens up, then a ping
      const lp = filt(G, 'lowpass', 200, 4); lp.frequency.setValueAtTime(200, when); lp.frequency.exponentialRampToValueAtTime(2600, when + d * 0.8); lp.connect(V.vg);
      tone('sawtooth', mtof(nm('E', 2)), when, when + d + 0.2, lp); tone('sawtooth', mtof(nm('E', 2)) * 1.006, when, when + d + 0.2, lp);
      blip('sine', mtof(nm('E', 6)), when + d * 0.85, 0.2, 0.4); adsr(V.vg, when, d * 0.6, 0.2, 0.8, 0.2, d, v * 0.12); V.end = when + d + 0.6; break;
    }
    case 'spike': { // the trace: a sharp rise, then the tone decays like the current
      nz(when, 0.01, 'highpass', 4000, 0.7, 0.6, 0.0003, 0.004);
      const o = tone('sine', 500, when, when + d + 0.1); o.frequency.setValueAtTime(500, when); o.frequency.exponentialRampToValueAtTime(2000, when + 0.04); o.frequency.setTargetAtTime(640, when + 0.05, d / 3);
      const o2 = tone('triangle', 1000, when, when + d + 0.1); o2.frequency.setValueAtTime(1000, when); o2.frequency.exponentialRampToValueAtTime(4000, when + 0.04); o2.frequency.setTargetAtTime(1280, when + 0.05, d / 3); o2.disconnect(); const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(V.vg);
      adsr(V.vg, when, 0.01, d * 0.5, 0.5, 0.15, d, v * 0.12); break;
    }
    case 'bits': { const n = Math.round(d / 0.045); for (let i = 0; i < n; i++) blip('square', mtof(pent(8 + Math.floor(hash(i + 601) * 6), 5)), when + i * 0.045, 0.012, hash(i + 602) > 0.4 ? 0.9 : 0.35); level(v * 0.16, d + 0.3); break; }
    case 'compute': { for (let i = 0; i < 8; i++) blip(0.25, mtof(pent(5 + i, 5)), when + i * 0.035, 0.03, 0.8); blip('sine', mtof(pent(13, 5)), when + 0.3, 0.2, 0.6); level(v * 0.18, 0.9); break; }
    case 'plot': { const o = tone('sine', ev.f === 2 ? 1300 : 500, when, when + d + 0.05); if (ev.f !== 2) o.frequency.exponentialRampToValueAtTime(1300, when + d); adsr(V.vg, when, 0.03, 0.1, 0.8, 0.04, d, v * 0.08); break; }
    case 'lcd': blip('square', 1800, when, 0.02, 1); nz(when, 0.01, 'highpass', 6000, 0.7, 0.3, 0.0003, 0.004); level(v * 0.12, 0.3); break;
    case 'digit': { // a digit slams onto the display
      boom(120, 50, when, 0.12, 0.9); nz(when, 0.012, 'highpass', 3500, 0.7, 1, 0.0003, 0.005); nz(when, 0.06, 'bandpass', 2500, 1.5, 0.4, 0.001, 0.02);
      blip('square', f, when, 0.07, 0.6); level(v * 0.42, 0.6); break;
    }
    case 'reveal': { // the number lands: sub drop, air, a bright G-major stab and bells
      boom(90, 30, when, 0.9, 1); nz(when, 1.0, 'lowpass', 3000, 0.7, 0.4, 0.002, 0.35); nz(when, 1.6, 'highpass', 6500, 0.7, 0.3, 0.004, 0.6);
      for (const m of [nm('G', 3), nm('B', 3), nm('D', 4), nm('G', 4)]) for (const det of [-9, 9]) { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sawtooth', mtof(m), when, when + 1.6, g); o.detune.value = det; const lp = filt(G, 'lowpass', 3200); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.01, 0.8, 0.045); }
      [nm('B', 6), nm('E', 7), nm('G', 7)].forEach((m, i) => blip('sine', mtof(m), when + 0.05 + i * 0.06, 0.4, 0.35));
      level(v * 0.55, 2.2); break;
    }
    case 'count': blip('sine', f, when, 0.03, 1); nz(when, 0.008, 'highpass', 6000, 0.7, 0.3, 0.0003, 0.003); level(v * 0.18, 0.3); break;
    case 'okchime': { [nm('G', 5), nm('B', 5), nm('D', 6), nm('G', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.06, 0.14, 1)); blip('sine', mtof(nm('B', 6)), when + 0.24, 0.35, 0.5); nz(when, 0.5, 'highpass', 7000, 0.7, 0.25, 0.02, 0.2); level(v * 0.2, 1.3); break; }
    case 'nope': { // too little blood: a soft two-note "uh-oh", not an alarm
      for (const [m, dt] of [[nm('F#', 5), 0], [nm('C', 5), 0.14]]) { const g = ctx.createGain(); g.gain.value = 0; const lp = filt(G, 'lowpass', 2000); tone('square', mtof(m), when + dt, when + dt + 0.2, lp); lp.connect(g); g.connect(V.vg); perc(g, when + dt, 0.004, 0.12, 1); }
      level(v * 0.16, 0.8); break;
    }
    case 'turn': sweepNoise(G, V, when, d, 400, 2400, 1, v * 0.2, 0.5); break;
    case 'seat': { nz(when, 0.012, 'highpass', 4000, 0.7, 1, 0.0003, 0.005); const o = tone('sine', 900, when, when + 0.18); o.frequency.exponentialRampToValueAtTime(650, when + 0.1); boom(150, 80, when, 0.06, 0.5); perc(V.vg, when, 0.002, 0.12, v * 0.3); break; }
    default: { tone('sine', 880, when, when + 0.1); perc(V.vg, when, 0.001, 0.05, 0.05); }
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export): the tail past 78 s is folded onto 0:00 (seamless loop)
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
const SUSTAINED = { pad: 1, vox: 1, flow: 1, tense: 1, sip: 1, hum: 1, carry: 1, riser: 1, drip: 1 };
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
