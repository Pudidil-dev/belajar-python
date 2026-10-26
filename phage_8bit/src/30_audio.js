'use strict';
// ============================================================================
// AUDIO — original 130 BPM bio-electronic score in D minor + event-synced SFX.
// 72 s = exactly 39 bars. Chord loop Dm-Bb-F-C (friendly, singable); the
// takeover darkens it to Dm-Bb-Gm-A. The hook is a tresillo arpeggio
// (3+3+2 sixteenths up, then a stepwise fall) that returns in every act:
// glassy bell in the reveal, chip lead when the invasion starts, a
// "hacked" glitch lead for the takeover, plucks in the factory, supersaw +
// vocal chops on THE DROP (the burst, bar 35 = 62.77 s), soft bells for the
// release, and an A-major turnaround that resolves into bar 1 (loop).
// SFX are tuned to D minor pentatonic so every click, lock and snap is
// part of the music. Microscopic sounds are artistic sonifications.
// ============================================================================
const SR = 48000, BAR = 4 * BEAT, TAIL = 3.0;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const CH = { Dm: ['D', 'F', 'A'], Bb: ['Bb', 'D', 'F'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], Gm: ['G', 'Bb', 'D'], A: ['A', 'C#', 'E'] };
const BARS = ['Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A', 'A',
  'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'F', 'C', 'A'];
const NBARS = BARS.length;   // 39
function chordMidi(name, oct) { let prev = -1; return CH[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
function sec(b) { return b <= 3 ? 'intro' : b <= 10 ? 'invade' : b <= 13 ? 'inside' : b <= 21 ? 'take' : b === 22 ? 'build' : b <= 30 ? 'factory' : b <= 32 ? 'fill' : b <= 34 ? 'tension' : b <= 36 ? 'drop' : b <= 38 ? 'release' : 'turn'; }
// melodies: [16th step, note, octave, length in 16ths]
const HOOK = [
  [[0, 'D', 5, 3], [3, 'F', 5, 3], [6, 'A', 5, 2], [8, 'G', 5, 2], [10, 'F', 5, 2], [12, 'E', 5, 2], [14, 'D', 5, 2]],
  [[0, 'D', 5, 3], [3, 'F', 5, 3], [6, 'Bb', 5, 2], [8, 'A', 5, 2], [10, 'G', 5, 2], [12, 'F', 5, 2], [14, 'D', 5, 2]],
  [[0, 'C', 5, 3], [3, 'F', 5, 3], [6, 'A', 5, 2], [8, 'C', 6, 3], [11, 'Bb', 5, 1], [12, 'A', 5, 2], [14, 'F', 5, 2]],
  [[0, 'E', 5, 3], [3, 'G', 5, 3], [6, 'C', 6, 2], [8, 'D', 6, 2], [10, 'C', 6, 2], [12, 'Bb', 5, 2], [14, 'A', 5, 2]],
];
const TAKE = [
  [[0, 'D', 5, 3], [3, 'F', 5, 3], [6, 'A', 5, 2], [8, 'G#', 5, 2], [10, 'A', 5, 2], [12, 'F', 5, 2], [14, 'E', 5, 2]],
  [[0, 'D', 5, 3], [3, 'F', 5, 3], [6, 'Bb', 5, 2], [8, 'A', 5, 2], [10, 'G', 5, 2], [12, 'F', 5, 2], [14, 'D', 5, 2]],
  [[0, 'D', 5, 3], [3, 'G', 5, 3], [6, 'Bb', 5, 2], [8, 'A', 5, 2], [10, 'G', 5, 2], [12, 'D', 5, 2], [14, 'Bb', 4, 2]],
  [[0, 'C#', 5, 3], [3, 'E', 5, 3], [6, 'A', 5, 2], [8, 'G', 5, 2], [10, 'F', 5, 2], [12, 'E', 5, 2], [14, 'C#', 5, 2]],
];
const CNTR = [
  [[0, 'A', 4, 6], [6, 'C', 5, 2], [8, 'D', 5, 6], [14, 'F', 5, 2]],
  [[0, 'F', 5, 6], [6, 'D', 5, 2], [8, 'Bb', 4, 6], [14, 'D', 5, 2]],
  [[0, 'C', 5, 6], [6, 'A', 4, 2], [8, 'C', 5, 4], [12, 'F', 5, 4]],
  [[0, 'E', 5, 6], [6, 'G', 5, 2], [8, 'E', 5, 4], [12, 'C', 5, 4]],
];
const PENT = ['D', 'F', 'G', 'A', 'C'];
const pent = (i, o) => nm(PENT[((i % 5) + 5) % 5], o + Math.floor(i / 5));
function musicEvents() {
  const ev = [];
  // mix: tuned for phone speakers (lighter low end, a clear hook and some sparkle)
  const MIX = { bass: 0.62, ebass: 0.7, sub: 0.55, kick: 0.85, pad: 1.0, lead: 1.4, glead: 1.35, pluck: 1.35, bell: 1.3, saw: 1.3, chop: 1.3, arp: 1.25, hat: 1.3, ohat: 1.25, shaker: 1.2, clap: 1.1, snare: 1.05, vox: 1.1 };
  const N = (t, d, k, m, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d, k, f: mtof(m), v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const D = (t, k, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d: 0.5, k, v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const S16 = BEAT / 4;
  const mel = (bar, arr, idx, inst, v, oct, opt) => {
    opt = opt || {};
    arr[idx].forEach(([st, n, o, l], j) => {
      if (opt.only && !opt.only(st)) return;
      const t = (bar - 1) * BAR + st * S16, m = nm(n, o + (oct || 0));
      N(t, l * S16 * (opt.leg || 0.92), inst, m, v * (j === 0 ? 1.08 : 1), opt.p || 0);
      if (opt.dbl) N(t, l * S16 * 0.9, opt.dbl, m - 12, v * (opt.dv || 0.5), -(opt.p || 0));
    });
  };
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], s = sec(b), at = beat => t0 + beat * BEAT;
    const root = nm(CH[ch][0], 1), r2 = root + 12, t5 = chordMidi(ch, 5), t4 = chordMidi(ch, 4);
    // pads (always; colour changes by act)
    const padV = { intro: 0.06, invade: 0.05, inside: 0.075, take: 0.055, build: 0.06, factory: 0.05, fill: 0.06, tension: 0.07, drop: 0.075, release: 0.075, turn: 0.07 }[s];
    const cut = { intro: 1300 + 300 * (b - 1), invade: 1700, inside: 1100, take: 1500, build: 1200, factory: 1900, fill: 2300, tension: 900 + 500 * (b - 33), drop: 3200, release: 2400, turn: 2000 }[s];
    const cut1 = { build: 5200, tension: b === 34 ? 4200 : 1800, intro: b === 3 ? 3000 : cut }[s] || cut;
    for (const m of chordMidi(ch, 3)) N(t0, BAR + 0.04, 'pad', m, padV, (m % 3 - 1) * 0.45, { cut, cut1 });
    if (s === 'drop' || s === 'release' || s === 'fill') for (const m of chordMidi(ch, 4)) N(t0, BAR, 'vox', m, s === 'drop' ? 0.045 : 0.032, (m % 2 ? 0.35 : -0.35));
    // bass
    if (s === 'intro') { if (b >= 2) N(t0, BAR * 0.95, 'sub', root + 12, b === 2 ? 0.1 : 0.14, 0, b === 3 ? { rise: true } : null); if (b === 3) for (let i = 8; i < 16; i++) N(at(i / 4), S16 * 0.7, 'bass', root + (i % 2 ? 12 : 0), 0.08 + 0.008 * i, 0, { cut: 500 + 60 * i }); }
    if (s === 'invade' || s === 'factory' || s === 'drop' || s === 'fill') {
      for (let i = 0; i < 8; i++) {
        if (b === 7 && i < 2) continue;                          // the stop before the sheath snap
        N(at(i / 2), BEAT / 2 * 0.72, 'bass', root + (i % 2 ? 12 : 0), i % 2 ? 0.15 : 0.21, 0, { cut: s === 'drop' ? 1500 : 1100 });
      }
      if (s === 'drop') N(t0, BAR * 0.95, 'sub', r2, 0.17);
    }
    if (s === 'inside') { N(at(0), BEAT * 1.8, 'bass', root, 0.2, 0, { cut: 700 }); N(at(2.5), BEAT * 0.45, 'bass', root + 12, 0.12, 0, { cut: 700 }); N(at(3.25), BEAT * 0.5, 'bass', root + 7, 0.11, 0, { cut: 700 }); N(t0, BAR * 0.95, 'sub', r2, 0.12); }
    if (s === 'take') { const pat = [0, 0, 12, 0, 0, 12, 7, 0, 0, 0, 12, 0, 3, 12, 7, 12]; for (let i = 0; i < 16; i++) if ([0, 3, 6, 8, 10, 11, 13, 14].includes(i)) N(at(i / 4), S16 * 0.7, 'ebass', root + 12 + pat[i] - 12, i === 0 ? 0.22 : 0.14); }
    if (s === 'build') for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.62, 'bass', root + (i % 4 === 2 ? 12 : 0), 0.1 + 0.008 * i, 0, { cut: 600 + 140 * i });
    if (s === 'tension') { for (let i = 0; i < (b === 34 ? 12 : 8); i++) N(at(b === 34 ? i / 4 : i / 2), (b === 34 ? S16 : BEAT / 2) * 0.6, 'bass', root, 0.16 + 0.01 * i, 0, { cut: 500 + 120 * i }); N(t0, b === 34 ? BEAT * 3 : BAR, 'sub', r2, 0.12, 0, b === 34 ? { rise: true } : null); }
    if (s === 'release') { N(t0, BEAT * 1.9, 'bass', root, 0.18); N(at(2), BEAT * 1.9, 'bass', root + 7, 0.14); }
    if (s === 'turn') { N(t0, BEAT * 1.5, 'bass', root, 0.17); N(at(2), BEAT * 0.9, 'bass', root + 4, 0.13); N(at(3), BEAT * 0.9, 'bass', root + 7, 0.12); }
    // drums
    const kick = (beat, v) => D(at(beat), 'kick', v), clap = (beat, v) => D(at(beat), 'clap', v), snare = (beat, v) => D(at(beat), 'snare', v);
    const hat = (beat, v, open) => D(at(beat), open ? 'ohat' : 'hat', v, ((beat * 0.37) % 0.6) - 0.3);
    if (s === 'intro') {
      kick(0, b === 1 ? 0.42 : 0.38); if (b >= 2) kick(2, 0.3);
      for (let i = 0; i < 16; i++) if (i % 2 && b >= 2) D(at(i / 4), 'shaker', 0.03 + 0.01 * (b - 2), 0.25);
      if (b === 3) for (let i = 8; i < 16; i++) snare(i / 4, 0.05 + 0.017 * (i - 8));
    }
    if (s === 'invade' || s === 'factory' || s === 'drop') {
      const kv = s === 'drop' ? 0.62 : 0.54;
      for (let i = 0; i < 4; i++) { if (b === 7 && i === 0) continue; kick(i, kv); }
      clap(1, s === 'drop' ? 0.38 : 0.32); clap(3, s === 'drop' ? 0.38 : 0.32);
      for (let i = 0; i < 4; i++) hat(i + 0.5, 0.085, s !== 'invade' || b >= 8);
      if (s !== 'invade' || b >= 5) for (let i = 0; i < 16; i++) if (i % 2) hat(i / 4, 0.03);
      if (s === 'factory') for (let i = 0; i < 4; i++) D(at(i + 0.75), 'perc', 0.07, i % 2 ? 0.45 : -0.45);       // the factory "clank"
    }
    if (s === 'fill') { for (let i = 0; i < 4; i++) kick(i, 0.56); clap(1, 0.34); clap(3, 0.34); for (let i = 0; i < 16; i++) hat(i / 4, i % 2 ? 0.04 : 0.025, i % 4 === 2); if (b === 32) for (let i = 0; i < 16; i++) snare(i / 4, 0.06 + 0.012 * i); }
    if (s === 'inside') { kick(0, 0.46); kick(2.5, 0.32); clap(2, 0.26); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.06 : 0.035, -0.25); for (let i = 0; i < 16; i++) D(at(i / 4), 'tick', i % 4 === 2 ? 0.06 : 0.025, ((i * 5) % 7) / 7 - 0.5); }
    if (s === 'take') {
      kick(0, 0.56); kick(1.5, 0.4); kick(2, 0.5); kick(3.25, 0.34); clap(1, 0.3); clap(3, 0.32);
      for (let i = 0; i < 16; i++) hat(i / 4, i % 4 === 2 ? 0.06 : 0.032, i % 8 === 6);
      if (b >= 20) for (let i = 0; i < 8; i++) snare(2 + i / 4, 0.04 + 0.012 * i + (b - 20) * 0.03);
    }
    if (s === 'build') { for (let i = 0; i < 16; i++) snare(i / 4, 0.07 + 0.016 * i); kick(0, 0.5); }
    if (s === 'tension') { for (let i = 0; i < (b === 34 ? 8 : 4); i++) kick(b === 34 ? i / 2 : i, 0.4 + 0.02 * i); if (b === 33) { clap(1, 0.24); clap(3, 0.28); } else for (let i = 0; i < 8; i++) snare(i / 4 + (i > 3 ? 0 : 0), 0.08 + 0.02 * i); }
    if (s === 'release') { kick(0, 0.46); kick(2, 0.4); clap(3, 0.24); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.06, true); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.05 : 0.03, 0.25); }
    if (s === 'turn') { kick(0, 0.42); clap(1, 0.2); for (let i = 0; i < 8; i++) D(at(2 + i / 4), 'snare', 0.03 + 0.012 * i); }
    if ([4, 14, 23, 31, 35, 37].includes(b)) D(t0, 'crash', b === 35 ? 0.45 : b === 31 ? 0.34 : 0.3);
    // arps / bells
    if (s === 'factory' || s === 'fill' || s === 'drop' || (s === 'invade' && b >= 8)) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', t5[pat[i % 8] % t5.length] + (i % 8 >= 6 ? 12 : 0), s === 'drop' ? 0.03 : 0.022, i % 2 ? 0.45 : -0.45);
    }
    if (s === 'inside') [[0.5, 0], [1.5, 1], [2.5, 2], [3.25, 1]].forEach(([p, i], j) => N(at(p), 0.3, 'bell', t5[i] + 12, 0.05, j % 2 ? 0.3 : -0.3));
    if (s === 'take') [[0.75, 2], [2.75, 0]].forEach(([p, i]) => N(at(p), 0.2, 'pluck', t5[i] + 12, 0.035, p > 2 ? 0.4 : -0.4));
  }
  // ---- the hook through the film
  for (let b = 1; b <= 3; b++) mel(b, HOOK, [0, 1, 3][b - 1], 'bell', 0.075, 0, { only: st => b < 3 || st < 8, p: 0.1 });       // the reveal: glassy bell
  for (let b = 4; b <= 7; b++) mel(b, HOOK, b - 4, 'lead', 0.072, 0, { only: st => !(b === 7 && st < 4) });                    // invasion: chip lead
  for (let b = 8; b <= 10; b++) mel(b, CNTR, b - 8, 'pluck', 0.055, 0, { p: 0.2 });
  for (let b = 14; b <= 21; b++) mel(b, TAKE, (b - 14) % 4, 'glead', b < 18 ? 0.06 : 0.068, 0, { only: st => b < 16 || b > 17 || st % 2 === 0 });  // takeover: hacked lead
  for (let b = 23; b <= 26; b++) mel(b, HOOK, b - 23, 'pluck', 0.062, 0, { dbl: 'pluck', dv: 0.45, p: 0.15 });                 // factory: pluck hook
  for (let b = 27; b <= 30; b++) mel(b, CNTR, b - 27, 'lead', 0.05, 0);
  for (let b = 31; b <= 32; b++) mel(b, HOOK, b - 31, 'lead', 0.066, 1);                                                       // fill: hook an octave up
  for (let b = 35; b <= 36; b++) { mel(b, HOOK, b - 35, 'saw', 0.08, 0, { dbl: 'saw', dv: 0.5 }); mel(b, HOOK, b - 35, 'chop', 0.07, 0, { p: 0.3, leg: 0.4 }); }   // THE DROP
  for (let b = 37; b <= 38; b++) mel(b, HOOK, b - 35, 'bell', 0.07, 0, { p: -0.1 });                                           // release
  [['A', 4, 0, 2], ['C#', 5, 2, 2], ['E', 5, 4, 2], ['G', 5, 6, 2], ['A', 5, 8, 4], ['G', 5, 12, 1], ['F', 5, 13, 1], ['E', 5, 14, 1], ['C#', 5, 15, 1]].forEach(([n, o, st, l]) => N(38 * BAR + st * S16, l * S16 * 0.9, 'bell', nm(n, o), 0.06, 0.1));
  return ev;
}
// ---------------------------------------------------------------- SFX: every sound belongs to a visible event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => { if (t >= 0 && t < DUR + TAIL) ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {})); };
  const S16 = BEAT / 4;
  // S01 the hero: fibres unfold like landing legs (three pairs, on the beat), a glint runs down the head
  [0.46, 0.69, 0.92].forEach((t, i) => S(t, 'unfold', 0.5, { f: mtof(pent(5 + i * 2, 5)), p: i % 2 ? 0.3 : -0.3 }));
  S(1.12, 'glint', 0.45, { f: mtof(nm('A', 6)) });
  // S02 pull-out reveal, target lock-on, the phage turns
  S(T_REV, 'revzoom', 0.32, { d: 1.2 }); S(T_TGT, 'lockon', 0.5); S(2.6, 'servo', 0.25, { d: 0.7 });
  // S03 the approach (tension into the beat)
  S(T_GO + 0.1, 'whoosh', 0.28, { d: 1.2 }); S(4.62, 'tense', 0.32, { d: 5.538 - 4.62 });
  // S04 attachment: a tap, a slip, then six locks rising up the pentatonic scale
  S(T_TOUCH, 'tap', 0.5, { p: -0.3 }); S(T_TOUCH + 0.08, 'slip', 0.35, { d: T_LOCK[0] - T_TOUCH - 0.1, p: -0.3 });
  T_LOCK.forEach((t, i) => S(t, 'bind', i === 3 ? 0.75 : 0.6, { f: mtof(pent(5 + i, 5)), p: [-0.4, 0.4, -0.6, 0.6, -0.2, 0.2][i] }));
  S(8.0, 'creak', 0.25, { d: 1.0 });
  // S05 baseplate clunk + short fibres ratchet tight
  S(T_BP, 'clunk', 0.7); T_STF.forEach((t, i) => S(t, 'ratchet', 0.4, { f: mtof(pent(3 + i, 5)), p: i % 2 ? 0.35 : -0.35 }));
  // S06 charge -> SNAP (spring release) -> thrust
  S(T_CHG, 'charge', 0.35, { d: T_SNAP - T_CHG }); S(T_SNAP, 'boing', 0.9); S(T_SNAP + 0.02, 'thrust', 0.6);
  // S07 the envelope: puncture, wall digested, inner membrane pore
  S(T_OM, 'puncture', 0.55); S(T_PG, 'crunch', 0.4, { d: T_IM - T_PG }); S(T_IM, 'creak', 0.2, { d: T_PORE - T_IM }); S(T_PORE, 'porepop', 0.6); S(T_DNA0, 'glint', 0.4, { f: mtof(nm('D', 7)) });
  // S08 the genome streams in
  S(T_INJ0 - 0.2, 'stream', 0.5, { d: T_INJ1 - T_INJ0 + 0.3 }); S(17.95, 'swish', 0.25, { d: 0.5 }); S(20.4, 'swish', 0.2, { d: 0.5 });
  // S09 inside: reveal whoosh, part tags
  S(21.0, 'revzoom', 0.28, { d: 1.0 }); [21.46, 21.92, 22.38].forEach((t, i) => S(t, 'ui', 0.2, { f: mtof(pent(5 + i * 2, 5)) }));
  // S10 takeover: glitch hit, the host chromosome is cut, ribosomes switch over
  S(T_TAKE, 'glitch', 0.75);
  HOST0_CUTS().forEach((t, i) => S(t, 'snip', 0.32, { f: mtof(pent(9 - (i % 6), 5)), p: (i % 2 ? 0.4 : -0.4) }));
  S(25.5, 'shift', 0.3); S(26.6, 'shift', 0.3, { f: 2 });
  // S11 polymerase lands, then copies the gene: soft writing ticks
  S(T_POL, 'clunk', 0.35, { small: 1 });
  for (let k = 0; k * S16 < T_TX1 - T_TX0; k++) S(T_TX0 + k * S16, 'write', 0.18 + (k % 4 === 0 ? 0.06 : 0), { f: mtof(pent([0, 2, 4, 1, 3, 5, 2, 4][k % 8] + 5, 5)), p: (k % 2 ? 0.25 : -0.25) });
  // S12 glide to the polysome; translation clicks; three parts pop out
  S(32.1, 'swish', 0.22, { d: 0.8 });
  for (let k = 0; k < 14; k++) S(32.31 + k * BEAT / 2, 'tclick', 0.2, { p: (k % 2 ? 0.3 : -0.3) });
  T_PART.forEach((t, i) => S(t, 'partpop', 0.55, { f: mtof(pent(5 + i * 2, 5)) }));
  S(35.3, 'revzoom', 0.25, { d: 0.7 });
  // S13 replication: duplication pulses climbing on every doubling
  T_COPY.forEach((t, i) => S(t, 'dup', 0.55 + 0.05 * i, { f: mtof(pent(5 + i * 2, 4)) }));
  S(barT(22), 'riser', 0.55, { d: BAR - 0.02 });
  // S14 factory reveal, parts popping into existence
  S(39.95, 'revzoom', 0.3, { d: 1.0 });
  for (let k = 0; k < 28; k++) S(40.62 + k * BEAT / 2 * 0.5 + (k > 13 ? BEAT : 0), 'pop', 0.16 + 0.004 * k, { p: (hash(k + 50) - 0.5) * 0.9 });
  // S15 capsid tiles snap together (rising), the shell completes
  S(44.1, 'swish', 0.22, { d: 0.8 });
  for (let k = 0; k < 16; k++) S(T_TILE0 + k * S16 * 2 * (T_TILE1 - T_TILE0) / (32 * S16), 'snapt', 0.24, { f: mtof(pent(3 + Math.floor(k / 2), 5)), p: (k % 2 ? 0.3 : -0.3) });
  S(T_TILE1 + 0.05, 'chime', 0.5);
  // S16 detach, motor docks, packaging ratchet (pitch rises as the head fills), the cut
  S(T_DETACH, 'swish', 0.22, { d: 0.5 }); S(T_MOTOR, 'clunk', 0.5); S(T_PACK0, 'motor', 0.45, { d: T_PACK1 - T_PACK0 }); S(T_PACK1, 'cutsnip', 0.55);
  // S17 tail assembly: wedges, tube rings, sheath rings, cap
  S(50.1, 'swish', 0.22, { d: 0.7 });
  for (let q = 0; q < 6; q++) S(T_WEDGE0 + q * S16, 'snapt', 0.25, { f: mtof(pent(q, 5)) });
  for (let q = 0; q < 6; q++) S(T_TUBE0 + 0.05 + q * 0.1, 'tclick', 0.18);
  for (let q = 0; q < 12; q++) S(T_SH0 + q * S16 / 2 * 1.0, 'snapt', 0.18, { f: mtof(pent(q, 5)), p: (q % 2 ? 0.25 : -0.25) });
  S(T_CAP, 'clunk', 0.4, { small: 1 });
  // S18 the head docks, fibres snap on, the new phage is complete
  S(53.3, 'whoosh', 0.22, { d: 0.7 }); S(T_DOCK, 'dock', 0.7);
  for (let q = 0; q < 6; q++) S(T_FIB0 + q * S16, 'bind', 0.42, { f: mtof(pent(5 + q, 5)), p: (q % 2 ? 0.4 : -0.4) });
  S(T_DONE, 'reward', 0.6); S(55.0, 'dock', 0.35, { small: 1 });
  // S19 the cell fills: new phages pop on every 8th, pressure builds
  S(56.1, 'revzoom', 0.22, { d: 0.8 });
  for (let k = 0; k < 22; k++) S(56.3 + k * BEAT / 2 * 0.62, 'partpop', 0.16 + 0.006 * k, { f: mtof(pent(5 + (k % 7), 5)), p: (hash(k + 70) - 0.5) * 0.8 });
  S(56.4, 'pressure', 0.4, { d: T_BURST - 56.4 });
  // S20 lysis: hit, holin pores, endolysin chewing, crackles accelerating, the suck before the burst
  S(T_LYS, 'glitch', 0.4, { soft: 1 });
  for (let i = 0; i < 9; i++) S(T_HOL + i * 0.06, 'pop', 0.14, { p: -0.4 + i * 0.1 });
  S(T_ENDO, 'crunch', 0.35, { d: 1.2 }); S(T_CRACK, 'crackle', 0.5, { d: T_BURST - T_CRACK });
  S(T_BURST - BEAT * 1.5, 'suck', 0.5, { d: BEAT * 1.5 - 0.11 });
  S(T_BURST - BEAT / 2, 'duck', 1, { d: BEAT / 2, amt: 0.04, rel: 0.003 });
  // S21 THE BURST
  S(T_BURST, 'burst', 1.0); S(T_BURST + 0.05, 'swarm', 0.5, { d: 1.6 }); S(T_BURST + 0.05, 'shatter', 0.4);
  // S22 release: landings on new cells, the dive into the progeny (-> frame one)
  S(T_REL, 'shimmer', 0.3, { d: 1.2 });
  S(T_LAND, 'bind', 0.4, { f: mtof(nm('A', 6)), p: 0.5 }); S(T_LAND + 0.46, 'bind', 0.4, { f: mtof(nm('D', 7)), p: -0.5 });
  S(T_PUSH, 'dive', 0.32, { d: DUR - T_PUSH });
  return ev;
}
function HOST0_CUTS() { const out = []; for (let k = 0; k < 18; k++) out.push(24.35 + 3.1 * hash(1000 + k * 5 + 9)); return out.sort((a, b) => a - b); }
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
    case 'stut': { // 32nd-note gate on the music bus (glitch stutter before the drop)
      V = { vg: ctx.createGain(), srcs: [], end: when + d + 0.2 };
      const n = Math.max(2, Math.round(d / (BEAT / 8)));
      for (let i = 0; i < n; i++) G.music.gain.setValueAtTime(MUSIC_GAIN * (i % 2 ? 0.12 : 1), when + i * d / n);
      G.music.gain.setValueAtTime(MUSIC_GAIN, when + d); break;
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
  const rewards = { bind: 1, lockon: 1, unfold: 1, partpop: 1, dup: 1, snapt: 1, chime: 1, dock: 1, reward: 1, write: 1, accent: 1, confirm: 1, uion: 1, ui: 1, cut: 1, achieve: 1, ping: 1, glint: 1, plink: 1, lens: 1, ctick: 1, coin: 1, scint: 1, iter: 1, select: 1, emit: 1, trap: 1, align: 1 };
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
    case 'revzoom': sweepNoise(G, V, when, d, 3000, 300, 1.2, v * 0.3, 0.3); { const o = tone('sine', 1200, when, when + d + 0.1); o.frequency.exponentialRampToValueAtTime(150, when + d); } break;
    case 'tense': { // rising tension into a downbeat
      const lp = filt(G, 'lowpass', 400, 4); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(5000, when + d); lp.connect(V.vg);
      const o = tone('sawtooth', mtof(nm('D', 3)), when, when + d + 0.02, lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('D', 5)), when + d);
      const s2 = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 2000), g = ctx.createGain(); g.gain.value = 0; s2.connect(hp); hp.connect(g); g.connect(V.vg); adsr(g, when, d * 0.95, 0.02, 1, 0.01, d, 0.4);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.11, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d + 0.01); V.end = when + d + 0.3; break;
    }
    case 'shimmer': { nz(when, d, 'highpass', 7000, 0.7, 0.5, 0.02, d * 0.4); [nm('A', 6), nm('D', 7), nm('F', 7)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.05, 0.25, 0.5)); level(v * 0.18, d + 0.5); break; }
    // ---------------- T4 phage SFX (microscopic events: artistic sonifications)
    case 'unfold': { // a landing leg locks out: click + servo whir + pitched blip
      nz(when, 0.02, 'highpass', 3500, 0.7, 0.8, 0.0005, 0.006);
      const lp = filt(G, 'lowpass', 900, 2); lp.connect(V.vg); const o = tone('sawtooth', 90, when, when + 0.16, lp); o.frequency.exponentialRampToValueAtTime(150, when + 0.12);
      blip('triangle', f, when + 0.05, 0.07, 0.9); level(v * 0.32, 0.6); break;
    }
    case 'lockon': { [nm('A', 6), nm('D', 7)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.08, 0.1, 1)); sweepNoise(G, V, when, 0.2, 3000, 8000, 2, 0.15, 0.3); level(v * 0.2, 0.8); break; }
    case 'tap': blip('sine', 1700, when, 0.02, 1); nz(when, 0.02, 'highpass', 5000, 0.7, 0.4, 0.0005, 0.008); level(v * 0.25, 0.3); break;
    case 'slip': sweepNoise(G, V, when, d, 1800, 3600, 3, v * 0.18, 0.3); break;
    case 'bind': { // the satisfying lock: double click, a bell note, a soft thump
      nz(when, 0.01, 'highpass', 4000, 0.7, 1, 0.0003, 0.004); nz(when + 0.035, 0.01, 'highpass', 4000, 0.7, 0.7, 0.0003, 0.004);
      const c = tone('sine', f, when + 0.02, when + 0.7), m = tone('sine', f * 3.01, when + 0.02, when + 0.7); m.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime(f * 1.4, when + 0.02); mg.gain.setTargetAtTime(0, when + 0.02, 0.07); m.connect(mg); mg.connect(c.frequency);
      boom(140, 70, when, 0.06, 0.35); perc(V.vg, when, 0.002, 0.28, v * 0.3); break;
    }
    case 'clunk': { const s = ev.small ? 0.55 : 1; boom(120 * (ev.small ? 1.4 : 1), 55, when, 0.14, 1); blip('sine', 820, when, 0.12, 0.25 * s); blip('sine', 1310, when + 0.004, 0.09, 0.18 * s); nz(when, 0.05, 'lowpass', 1800, 0.7, 0.4, 0.001, 0.02); level(v * 0.42 * s, 0.7); break; }
    case 'ratchet': { for (let i = 0; i < 3; i++) { nz(when + i * 0.028, 0.008, 'highpass', 3000, 0.7, 0.8, 0.0003, 0.003); blip('square', f * (1 + i * 0.06), when + i * 0.028, 0.012, 0.5); } level(v * 0.22, 0.4); break; }
    case 'boing': { // spring release: wobbling down-sweep + thump + snap noise
      const o = tone('sine', 900, when, when + 0.5); o.frequency.exponentialRampToValueAtTime(130, when + 0.26);
      const vib = tone('sine', 32, when, when + 0.5); vib.disconnect(); const vg = ctx.createGain(); vg.gain.setValueAtTime(120, when); vg.gain.setTargetAtTime(0, when, 0.08); vib.connect(vg); vg.connect(o.frequency);
      boom(110, 38, when, 0.35, 0.9); nz(when, 0.12, 'bandpass', 2500, 0.8, 0.7, 0.0005, 0.04); nz(when, 0.9, 'highpass', 5500, 0.7, 0.25, 0.002, 0.35);
      perc(V.vg, when, 0.002, 0.5, v * 0.5); V.end = when + 1.4; break;
    }
    case 'thrust': sweepNoise(G, V, when, 0.22, 3000, 400, 1.2, v * 0.3, 0.2); boom(90, 40, when + 0.12, 0.2, 0.6); break;
    case 'puncture': nz(when, 0.012, 'highpass', 4500, 0.7, 1, 0.0002, 0.004); { const o = tone('sine', 1300, when, when + 0.1); o.frequency.exponentialRampToValueAtTime(320, when + 0.05); } perc(V.vg, when, 0.001, 0.06, v * 0.35); break;
    case 'crunch': { const n = Math.max(6, Math.round(d * 26)); for (let i = 0; i < n; i++) { const tt = when + d * hash(i * 7 + Math.floor(when * 100)); nz(tt, 0.012, 'bandpass', 1800 + 2600 * hash(i * 3 + 1), 1.2, 0.5, 0.0004, 0.005); } level(v * 0.3, d + 0.4); break; }
    case 'porepop': { const o = tone('sine', 380, when, when + 0.14); o.frequency.exponentialRampToValueAtTime(1250, when + 0.06); nz(when, 0.01, 'highpass', 4000, 0.7, 0.5, 0.0003, 0.004); perc(V.vg, when, 0.002, 0.07, v * 0.32); break; }
    case 'stream': { // the genome streaming through the tail: a sliding, shimmering thread
      const n = noiseSrc(G, V, when, when + d + 0.2, 1.2), bp = filt(G, 'bandpass', 600, 4); bp.frequency.setValueAtTime(600, when); bp.frequency.exponentialRampToValueAtTime(2800, when + d);
      const tr = ctx.createGain(); tr.gain.value = 0.6; n.connect(bp); bp.connect(tr); tr.connect(V.vg);
      const lfo = tone('sine', 22, when, when + d + 0.2); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(tr.gain);
      const o = tone('sine', mtof(nm('D', 5)), when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(mtof(nm('A', 5)), when + d); o.disconnect(); const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(V.vg);
      adsr(V.vg, when, 0.25, 0.3, 0.85, 0.3, d, v * 0.16); V.end = when + d + 0.8; break;
    }
    case 'glitch': { // takeover: stuttering square jumps across the scale + a low hit
      const notes = [nm('D', 6), nm('A', 5), nm('F', 6), nm('C', 6), nm('D', 7), nm('G', 5), nm('A', 6), nm('D', 5)];
      for (let i = 0; i < 8; i++) blip('square', mtof(notes[i]), when + i * 0.03, 0.02, ev.soft ? 0.4 : 0.7);
      boom(95, 35, when, 0.4, ev.soft ? 0.5 : 1); nz(when, 0.15, 'bandpass', 1200, 1, 0.5, 0.001, 0.06);
      level(v * 0.45, 1.0); break;
    }
    case 'snip': { nz(when, 0.008, 'highpass', 5000, 0.7, 1, 0.0002, 0.003); nz(when + 0.025, 0.008, 'highpass', 5500, 0.7, 0.8, 0.0002, 0.003); const o = tone('triangle', f, when + 0.01, when + 0.12); o.frequency.exponentialRampToValueAtTime(f * 0.6, when + 0.08); perc(V.vg, when, 0.001, 0.06, v * 0.28); break; }
    case 'shift': { const up = ev.f === 2 ? 12 : 0; [nm('D', 5), nm('F', 5), nm('A', 5), nm('D', 6)].forEach((m, i) => blip(0.25, mtof(m + up), when + i * 0.045, 0.05, 1)); level(v * 0.16, 0.6); break; }
    case 'write': blip('triangle', f, when, 0.035, 1); blip('sine', f * 2, when, 0.015, 0.3); level(v * 0.2, 0.25); break;
    case 'tclick': { const o = tone('sine', 1500, when, when + 0.06); o.frequency.exponentialRampToValueAtTime(900, when + 0.03); nz(when, 0.015, 'bandpass', 2500, 2, 0.5, 0.0005, 0.006); perc(V.vg, when, 0.001, 0.028, v * 0.3); break; }
    case 'partpop': { const o = tone('sine', 520, when, when + 0.1); o.frequency.exponentialRampToValueAtTime(1500, when + 0.03); nz(when, 0.015, 'highpass', 4000, 0.7, 0.4, 0.0005, 0.006); blip('triangle', f, when + 0.025, 0.09, 0.8); perc(V.vg, when, 0.002, 0.12, v * 0.28); break; }
    case 'dup': { sweepNoise(G, V, when - 0.12, 0.2, 500, 3200, 1.6, v * 0.16, 0.8); blip('triangle', f, when, 0.18, 0.9); blip('triangle', f * 1.5, when + 0.03, 0.16, 0.6); blip('sine', f * 2, when + 0.06, 0.2, 0.5); level(v * 0.24, 0.9); break; }
    case 'snapt': nz(when, 0.008, 'highpass', 3500, 0.7, 0.9, 0.0003, 0.003); blip('square', f, when, 0.025, 0.6); level(v * 0.18, 0.3); break;
    case 'chime': { [nm('D', 6), nm('F', 6), nm('A', 6), nm('D', 7)].forEach((m, i) => { const fr = mtof(m), c = tone('sine', fr, when + i * 0.05, when + 1.4), mo = tone('sine', fr * 3.5, when + i * 0.05, when + 1.4); mo.disconnect(); const mg = ctx.createGain(); mg.gain.setValueAtTime(fr * 1.2, when + i * 0.05); mg.gain.setTargetAtTime(0, when + i * 0.05, 0.15); mo.connect(mg); mg.connect(c.frequency); }); perc(V.vg, when, 0.003, 0.7, v * 0.12); V.end = when + 1.6; break; }
    case 'motor': { // packaging motor ratchet: clicks accelerate, pitch climbs as the head fills
      const n = Math.round(d / 0.045); for (let i = 0; i < n; i++) { const u = i / n, tt = when + d * (1 - Math.pow(1 - u, 1.25)); nz(tt, 0.008, 'highpass', 3000, 0.7, 0.6, 0.0003, 0.003); blip('square', 500 + 1100 * u, tt, 0.012, 0.35); }
      const lp = filt(G, 'lowpass', 800, 2); lp.connect(V.vg); const o = tone('sawtooth', 70, when, when + d, lp); o.frequency.linearRampToValueAtTime(130, when + d);
      level(v * 0.2, d + 0.4); break;
    }
    case 'cutsnip': nz(when, 0.01, 'highpass', 5000, 0.7, 1, 0.0002, 0.004); blip('sine', mtof(nm('A', 6)), when + 0.02, 0.35, 0.9); blip('sine', mtof(nm('D', 7)), when + 0.02, 0.25, 0.4); level(v * 0.22, 1); break;
    case 'dock': { // head meets tail: a big satisfying click and a chord stab
      const s = ev.small ? 0.5 : 1;
      nz(when, 0.012, 'highpass', 3000, 0.7, 1, 0.0003, 0.005); nz(when + 0.04, 0.012, 'highpass', 3000, 0.7, 0.8, 0.0003, 0.005);
      boom(130, 55, when, 0.16, 0.9);
      [nm('D', 5), nm('F', 5), nm('A', 5), nm('C', 6)].forEach((m, i) => blip(0.25, mtof(m), when + 0.03, 0.22, 0.45));
      level(v * 0.32 * s, 1); break;
    }
    case 'reward': { [nm('D', 6), nm('F', 6), nm('A', 6), nm('C', 7), nm('D', 7)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.06, 0.16, 1)); blip('sine', mtof(nm('A', 7)), when + 0.3, 0.4, 0.5); nz(when, 0.7, 'highpass', 7000, 0.7, 0.25, 0.02, 0.3); level(v * 0.22, 1.5); break; }
    case 'pressure': { const lp = filt(G, 'lowpass', 300, 3); lp.frequency.setValueAtTime(300, when); lp.frequency.exponentialRampToValueAtTime(1400, when + d); lp.connect(V.vg); const o = tone('sawtooth', 55, when, when + d + 0.05, lp); o.frequency.exponentialRampToValueAtTime(82, when + d); const o2 = tone('sawtooth', 55.6, when, when + d + 0.05, lp); o2.frequency.exponentialRampToValueAtTime(83, when + d); adsr(V.vg, when, d * 0.85, 0.05, 1, 0.05, d, v * 0.12); break; }
    case 'crackle': { const n = 30; for (let i = 0; i < n; i++) { const tt = when + d * (1 - Math.pow(1 - i / n, 2.2)); nz(tt, 0.02, 'highpass', 2200 + 3000 * hash(i + 9), 0.7, 0.3 + 0.03 * i, 0.0005, 0.008); blip('sine', 1800 + 2600 * hash(i + 3), tt, 0.02, 0.15 + 0.02 * i); } level(v * 0.32, d + 0.5); break; }
    case 'suck': { const n = noiseSrc(G, V, when, when + d, 1), bp = filt(G, 'bandpass', 300, 1.5); bp.frequency.setValueAtTime(300, when); bp.frequency.exponentialRampToValueAtTime(5000, when + d); n.connect(bp); bp.connect(V.vg); V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.35, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.1; break; }
    case 'burst': { // the cell bursts: sub drop, pressure blast, bright debris
      boom(95, 28, when, 0.9, 1); nz(when, 1.2, 'lowpass', 5200, 0.7, 0.55, 0.001, 0.45); nz(when, 2.0, 'highpass', 6000, 0.7, 0.3, 0.003, 0.9);
      for (const m of [nm('D', 2), nm('A', 2), nm('F', 3)]) { const g = ctx.createGain(); g.gain.value = 0; tone('sawtooth', mtof(m), when, when + 1.4, g); const lp = filt(G, 'lowpass', 1200); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.01, 0.6, 0.05); }
      level(v * 0.62, 2.6); break;
    }
    case 'swarm': { const n = 46; for (let i = 0; i < n; i++) { const tt = when + d * Math.pow(i / n, 1.5), pn = ctx.createStereoPanner(); pn.pan.value = (hash(i * 5 + 1) - 0.5) * 1.8; pn.connect(V.vg); blip('triangle', mtof(pent(5 + Math.floor(hash(i * 5 + 2) * 8), 5)), tt, 0.02, 0.6 * (1 - i / n), pn); } level(v * 0.18, d + 0.4); break; }
    default: { tone('sine', 880, when, when + 0.1); perc(V.vg, when, 0.001, 0.05, 0.05); }
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export): the tail past 72 s is folded onto 0:00 (seamless loop)
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
const SUSTAINED = { pad: 1, vox: 1, flow: 1, charge: 1, tense: 1, stream: 1, pressure: 1, motor: 1 };
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
