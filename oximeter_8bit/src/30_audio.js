'use strict';
// ============================================================================
// AUDIO — an original electronic medical-tech score at 127.74 BPM in F# minor
// (33 bars = 62.000 s) plus event-synced SFX. Chord loop F#m-D-A-E. The hook
// is built from the oximeter's own pulse beep: "beep ... beep-beep, boop"
// (a repeated C#6, then a step up), answered by a falling line. The device's
// pulse tone (C#6) also sounds on every heartbeat — every two beats, the same
// beat as the artery, the light dips and the waveform peaks (PR 64).
// Arc: hook (bars 1-3) → LEDs taking turns (a 3-against-4 arp: red note,
// infrared note, rest) → the heartbeat groove → under blood (low-passed) →
// hemoglobin plucks → build through the photodiode → THE DROP on the raw
// signal (bar 17) → data lead for processing → breakdown for the estimate →
// the payoff on the display (bar 28, A major) → recap → calm → a C# dominant
// that falls back into bar 1, so the loop is seamless (tail folded to 0:00).
// SFX are tuned to F# minor pentatonic so clicks and pings sit in the music.
// Light, molecules and photons make no sound in reality: these are educational
// sonifications.
// ============================================================================
const SR = 48000, TAIL = 3.0;
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const PENT = ['F#', 'A', 'B', 'C#', 'E'];
const pent = (i, o) => nm(PENT[((i % 5) + 5) % 5], o + Math.floor(i / 5));
const CHD = { 'F#m': ['F#', 'A', 'C#'], D: ['D', 'F#', 'A'], A: ['A', 'C#', 'E'], E: ['E', 'G#', 'B'], Bm: ['B', 'D', 'F#'], 'C#': ['C#', 'F', 'G#'] };
const BARS = ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'E', 'F#m', 'D', 'Bm', 'C#',
  'F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'E', 'Bm', 'D', 'E', 'A', 'F#m', 'D', 'A', 'E', 'C#'];
const NBARS = BARS.length;   // 33
function chordMidi(name, oct) { let prev = -1; return CHD[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
function bassNote(name) { let m = nm(CHD[name][0], 1); while (m < 33) m += 12; while (m > 44) m -= 12; return m; }
function sec(b) {
  return b <= 3 ? 'hook' : b <= 5 ? 'leds' : b <= 7 ? 'pulse' : b === 8 ? 'blood' : b <= 11 ? 'hemo' : b <= 13 ? 'trans' : b <= 16 ? 'build' :
    b <= 20 ? 'drop' : b <= 24 ? 'drop2' : b <= 27 ? 'est' : b === 28 ? 'payoff' : b <= 30 ? 'recap' : b <= 32 ? 'calm' : 'loop';
}
// melodies: [16th step, note, octave, length in 16ths] — one bar per chord
const HOOK = {
  'F#m': [[0, 'C#', 6, 2], [3, 'C#', 6, 1], [4, 'E', 6, 2], [6, 'F#', 6, 2], [8, 'E', 6, 2], [10, 'C#', 6, 2], [12, 'B', 5, 2], [14, 'A', 5, 2]],
  D: [[0, 'A', 5, 2], [3, 'A', 5, 1], [4, 'B', 5, 2], [6, 'D', 6, 2], [8, 'C#', 6, 2], [10, 'B', 5, 2], [12, 'A', 5, 2], [14, 'F#', 5, 2]],
  A: [[0, 'C#', 6, 2], [3, 'C#', 6, 1], [4, 'E', 6, 2], [6, 'A', 6, 2], [8, 'G#', 6, 2], [10, 'E', 6, 2], [12, 'C#', 6, 2], [14, 'E', 6, 2]],
  E: [[0, 'B', 5, 2], [3, 'B', 5, 1], [4, 'E', 6, 2], [6, 'G#', 6, 3], [9, 'F#', 6, 1], [10, 'E', 6, 2], [12, 'B', 5, 4]],
  Bm: [[0, 'B', 5, 2], [3, 'B', 5, 1], [4, 'D', 6, 2], [6, 'F#', 6, 2], [8, 'E', 6, 2], [10, 'D', 6, 2], [12, 'C#', 6, 2], [14, 'B', 5, 2]],
  'C#': [[0, 'G#', 5, 2], [3, 'G#', 5, 1], [4, 'C#', 6, 2], [6, 'F', 6, 3], [9, 'D#', 6, 1], [10, 'C#', 6, 2], [12, 'G#', 5, 4]],
};
const CNTR = {
  'F#m': [[0, 'A', 5, 6], [6, 'C#', 6, 2], [8, 'F#', 5, 6], [14, 'E', 5, 2]], D: [[0, 'F#', 5, 6], [6, 'A', 5, 2], [8, 'D', 5, 6], [14, 'E', 5, 2]],
  A: [[0, 'E', 5, 6], [6, 'C#', 5, 2], [8, 'A', 4, 6], [14, 'B', 4, 2]], E: [[0, 'G#', 5, 6], [6, 'B', 5, 2], [8, 'E', 5, 8]],
  Bm: [[0, 'F#', 5, 6], [6, 'D', 5, 2], [8, 'B', 4, 8]], 'C#': [[0, 'F', 5, 6], [6, 'G#', 5, 2], [8, 'C#', 5, 8]],
};
const BEEP_N = nm('C#', 6);                       // the device's pulse tone
function musicEvents() {
  const ev = [];
  // mix: tuned for phone speakers (lighter low end, a clear hook and some sparkle)
  const MIX = { bass: 0.44, ebass: 0.5, sub: 0.3, kick: 0.7, pad: 1.0, lead: 1.6, glead: 1.5, pluck: 1.65, bell: 1.6, saw: 1.45, chop: 1.35, arp: 1.35, hat: 1.55, ohat: 1.4, shaker: 1.35, clap: 1.2, snare: 0.85, vox: 1.15, tick: 1.2, pbeep: 1.0, crash: 1.0, riser: 0.75, tom: 1.0, revcym: 1.0 };
  const N = (t, d, k, m, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d, k, f: m === null ? 0 : mtof(m), v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
  const D = (t, k, v, p, x) => { if (t >= 0 && t < DUR - 1e-6) ev.push(Object.assign({ t, d: 0.5, k, v: v * (MIX[k] || 1), p: p || 0 }, x || {})); };
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
    const root = bassNote(ch), sub = root - 12, t5 = chordMidi(ch, 5);
    // ---- pads (always; colour by act)
    const padV = { hook: 0.05, leds: 0.05, pulse: 0.055, blood: 0.075, hemo: 0.05, trans: 0.05, build: 0.06, drop: 0.07, drop2: 0.065, est: 0.075, payoff: 0.075, recap: 0.06, calm: 0.075, loop: 0.07 }[s];
    const cut = { hook: 2600, leds: 1700, pulse: 1500, blood: 700, hemo: 2000, trans: 2200, build: 1400 + 700 * (b - 14), drop: 3400, drop2: 3000, est: 1300 + 500 * (b - 25), payoff: 3600, recap: 3000, calm: 1500, loop: 1200 }[s];
    for (const m of chordMidi(ch, 3)) N(t0, BAR + 0.04, 'pad', m, padV, (m % 3 - 1) * 0.45, { cut, cut1: s === 'build' || s === 'loop' || (s === 'est' && b === 27) ? cut * 2.4 : cut });
    if (s === 'drop' || s === 'payoff') for (const m of chordMidi(ch, 4)) N(t0, BAR, 'vox', m, s === 'payoff' ? 0.05 : 0.042, (m % 2 ? 0.35 : -0.35));
    // ---- bass
    const b8 = (v, cutv) => { for (let i = 0; i < 8; i++) N(at(i / 2), BEAT / 2 * 0.72, 'bass', root + (i % 2 ? 12 : 0), i % 2 ? v * 0.72 : v, 0, { cut: cutv }); };
    const e16 = (v) => { const pat = [0, 0, 12, 0, 0, 12, 7, 0, 0, 0, 12, 0, 3, 12, 7, 12]; for (let i = 0; i < 16; i++) if ([0, 3, 6, 8, 10, 11, 13, 14].includes(i)) N(at(i / 4), S16 * 0.7, 'ebass', root + pat[i], i === 0 ? v : v * 0.66); };
    if (s === 'hook' || s === 'trans' || s === 'recap' || s === 'payoff') { e16(s === 'payoff' ? 0.24 : 0.21); N(t0, BAR * 0.95, 'sub', sub + 12, 0.1); }
    if (s === 'leds' || s === 'hemo') b8(0.18, 1100);
    if (s === 'pulse') { for (const bb of [0, 2]) { N(at(bb), BEAT * 0.4, 'bass', root, 0.22, 0, { cut: 900 }); N(at(bb + 0.375), BEAT * 0.4, 'bass', root, 0.13, 0, { cut: 700 }); } N(t0, BAR * 0.95, 'sub', sub + 12, 0.1); }
    if (s === 'blood') { N(t0, BAR * 0.98, 'sub', sub + 12, 0.14); N(t0, BEAT * 1.8, 'bass', root, 0.12, 0, { cut: 380 }); N(at(2), BEAT * 1.8, 'bass', root, 0.1, 0, { cut: 380 }); }
    if (s === 'build') { if (b === 14) b8(0.17, 1000); else for (let i = 0; i < (b === 16 ? 14 : 16); i++) N(at(i / 4), S16 * 0.6, 'bass', root, 0.1 + 0.008 * i, 0, { cut: 500 + 160 * i + (b === 16 ? 900 : 0) }); N(t0, b === 16 ? BEAT * 3.4 : BAR, 'sub', sub + 12, 0.11, 0, b === 16 ? { rise: true } : null); }
    if (s === 'drop') { e16(0.24); N(t0, BAR * 0.95, 'sub', sub + 12, 0.15); }
    if (s === 'drop2') { b8(0.2, 1500); N(t0, BAR * 0.95, 'sub', sub + 12, 0.13); }
    if (s === 'est') { if (b === 25) N(t0, BAR * 0.98, 'sub', sub + 12, 0.12); else if (b === 26) b8(0.15, 900); else for (let i = 0; i < 14; i++) N(at(i / 4), S16 * 0.6, 'bass', root, 0.1 + 0.009 * i, 0, { cut: 500 + 180 * i }); }
    if (s === 'calm') { N(t0, BEAT * 1.9, 'bass', root, 0.16, 0, { cut: 700 }); N(at(2), BEAT * 1.9, 'bass', root + 7, 0.12, 0, { cut: 700 }); }
    if (s === 'loop') { N(t0, BAR * 0.9, 'sub', sub + 12, 0.1, 0, { rise: true }); N(t0, BEAT * 1.6, 'bass', root, 0.14, 0, { cut: 900 }); }
    // ---- drums
    const kick = (beat, v) => D(at(beat), 'kick', v), clap = (beat, v) => D(at(beat), 'clap', v), snare = (beat, v) => D(at(beat), 'snare', v);
    const hat = (beat, v, open) => D(at(beat), open ? 'ohat' : 'hat', v, ((beat * 0.37) % 0.6) - 0.3);
    const tick = (beat, v) => D(at(beat), 'tick', v, ((beat * 5) % 7) / 7 - 0.5);
    const four = (kv, cv, hv, open) => { for (let i = 0; i < 4; i++) kick(i, kv); clap(1, cv); clap(3, cv); for (let i = 0; i < 4; i++) hat(i + 0.5, hv, open); for (let i = 0; i < 16; i++) if (i % 2) hat(i / 4, hv * 0.38); };
    if (s === 'hook') { four(0.6, 0.34, 0.08, true); for (let i = 0; i < 16; i++) D(at(i / 4), 'shaker', i % 2 ? 0.04 : 0.022, 0.25); if (b === 3) { for (let i = 0; i < 4; i++) D(at(3 + i / 4), 'tom', 0.1 + 0.03 * i, (i % 2 ? 0.3 : -0.3), { f: 260 - i * 30 }); } }
    if (s === 'leds') { kick(0, 0.54); kick(2, 0.5); clap(1, 0.26); clap(3, 0.28); for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 2 ? 0.06 : 0.025); }
    if (s === 'pulse') { for (const bb of [0, 2]) { kick(bb, 0.6); kick(bb + 0.375, 0.32); } clap(1, 0.28); clap(3, 0.3); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.07); }
    if (s === 'blood') { kick(0, 0.4); kick(2, 0.34); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.03 : 0.016, -0.25); }
    if (s === 'hemo') { four(0.54, 0.3, 0.075, b >= 10); if (b === 11) for (let i = 0; i < 4; i++) snare(3 + i / 4, 0.06 + 0.03 * i); }
    if (s === 'trans') { for (const bb of [0, 2]) { kick(bb, 0.6); kick(bb + 0.375, 0.3); } kick(1, 0.45); kick(3, 0.45); clap(1, 0.32); clap(3, 0.32); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.08, true); for (let i = 0; i < 16; i++) if (i % 2) hat(i / 4, 0.03); }
    if (s === 'build') {
      if (b === 14) { for (let i = 0; i < 4; i++) kick(i, 0.52); for (let i = 0; i < 8; i++) hat(i / 2, 0.05); clap(3, 0.24); }
      else if (b === 15) { for (let i = 0; i < 8; i++) kick(i / 2, 0.4 + 0.016 * i); for (let i = 0; i < 8; i++) snare(i / 2, 0.04 + 0.011 * i); }
      else { for (let i = 0; i < 6; i++) kick(i / 2, 0.44); for (let i = 0; i < 14; i++) snare(i / 4, 0.06 + 0.013 * i); }
    }
    if (s === 'drop' || s === 'drop2' || s === 'payoff' || s === 'recap') {
      four(s === 'payoff' ? 0.68 : 0.64, s === 'payoff' ? 0.44 : 0.4, 0.09, true);
      if (s === 'drop2') for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 2 ? 0.07 : 0.03);
      if (s === 'recap' && b === 30) for (let i = 0; i < 4; i++) snare(3 + i / 4, 0.06 + 0.035 * i);
    }
    if (s === 'est') {
      if (b === 25) { kick(0, 0.4); for (let i = 0; i < 16; i++) tick(i / 4, i % 4 === 0 ? 0.05 : 0.02); }
      else if (b === 26) { kick(0, 0.5); kick(2, 0.46); clap(1, 0.24); clap(3, 0.26); for (let i = 0; i < 8; i++) hat(i / 2, 0.05); }
      else { for (let i = 0; i < 8; i++) kick(i / 2, 0.4 + 0.02 * i); for (let i = 0; i < 16; i++) snare(i / 4, 0.045 + 0.012 * i); }
    }
    if (s === 'calm') { kick(0, 0.44); clap(2, 0.22); for (let i = 0; i < 8; i++) D(at(i / 2), 'shaker', i % 2 ? 0.045 : 0.025, 0.25); }
    if (s === 'loop') { kick(0, 0.5); for (let i = 0; i < 12; i++) snare(1 + i / 4, 0.04 + 0.018 * i); }
    if ([9, 17, 21, 28, 29].includes(b)) D(t0, 'crash', b === 17 || b === 28 ? 0.5 : b === 29 ? 0.24 : 0.32);
    if (b === 1) D(t0, 'crash', 0.18);            // light: the clip snap owns the first downbeat
    if (b === 16 || b === 27 || b === 33) N(t0, BAR - 0.02, 'riser', null, b === 16 ? 0.12 : 0.09);
    if (b === 3 || b === 8 || b === 13 || b === 24) D(at(2), 'revcym', 0.1, 0, { d: BEAT * 2 });
    // ---- the pulse tone: one beep per heartbeat (every two beats)
    const beepV = { hook: b >= 2 ? 0.07 : 0, pulse: 0.08, trans: 0.07, est: 0.075, payoff: 0.07, calm: 0.05, loop: 0.05 }[s] || 0;
    if (beepV > 0) for (const bb of [0, 2]) N(at(bb), 0.09, 'pbeep', BEEP_N, beepV, 0.1);
    // ---- arps
    if (s === 'leds') { for (let i = 0; i < 8; i++) { const slot = i % 3; if (slot === 2) continue; N(at(i / 2), E8 * 0.7, 'arp', slot === 0 ? t5[2] : t5[0], 0.034, slot === 0 ? 0.35 : -0.35); } }
    if (s === 'drop2' || s === 'recap') { const pat = [0, 1, 2, 1, 0, 2, 1, 2]; for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', t5[pat[i % 8] % t5.length] + (i % 8 >= 6 ? 12 : 0), 0.026, i % 2 ? 0.45 : -0.45); }
    if (s === 'build' && b >= 15) for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', t5[i % 3] + (i >= 8 ? 12 : 0), 0.018 + 0.0015 * i, i % 2 ? 0.4 : -0.4);
  }
  // ---- the hook through the film
  mel(1, HOOK, 'pluck', 0.064, 0, { dbl: 'bell', dv: 0.55, p: 0.1 }); mel(2, HOOK, 'pluck', 0.064, 0, { dbl: 'bell', dv: 0.55, p: 0.1 }); mel(3, HOOK, 'pluck', 0.06, 0, { p: 0.1 });
  for (const b of [4, 5]) mel(b, CNTR, 'bell', 0.05, 0, { p: -0.2 });
  for (const b of [6, 7]) mel(b, HOOK, 'bell', 0.052, 0, { only: st => st < 8, p: 0.15 });
  for (const b of [9, 10, 11]) mel(b, HOOK, 'pluck', 0.06, 0, { dbl: 'pluck', dv: 0.4, p: 0.15 });
  for (const b of [12, 13]) mel(b, CNTR, 'lead', 0.06, 0);
  mel(14, HOOK, 'bell', 0.05, 0, { only: st => st < 8 });
  mel(15, HOOK, 'lead', 0.06, 1); mel(16, HOOK, 'lead', 0.066, 1, { only: st => st < 12 });
  for (let b = 17; b <= 20; b++) { mel(b, HOOK, 'saw', 0.08, 0, { dbl: 'saw', dv: 0.5 }); mel(b, HOOK, 'chop', 0.065, 0, { p: 0.3, leg: 0.4 }); }
  for (let b = 21; b <= 24; b++) mel(b, HOOK, 'glead', 0.06, 0, { only: st => b < 24 || st < 12 });
  mel(25, HOOK, 'bell', 0.055, 0); mel(26, HOOK, 'bell', 0.058, 0, { dbl: 'pluck', dv: 0.6 }); mel(27, HOOK, 'lead', 0.06, 1, { only: st => st < 12 });
  mel(28, HOOK, 'saw', 0.085, 0, { dbl: 'saw', dv: 0.5 }); mel(28, HOOK, 'bell', 0.06, 1); mel(28, HOOK, 'chop', 0.065, 0, { p: 0.3, leg: 0.4 });
  for (const b of [29, 30]) { mel(b, HOOK, 'pluck', 0.068, 0, { dbl: 'bell', dv: 0.5, p: 0.12 }); }
  for (const b of [31, 32]) mel(b, HOOK, 'bell', 0.058, 0, { p: -0.1 });
  mel(33, HOOK, 'pluck', 0.058, 0, { only: st => st < 8, p: 0.1 });
  return ev;
}
// ---------------------------------------------------------------- SFX: every sound belongs to a visible event
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => { if (t >= 0 && t < DUR + TAIL) ev.push(Object.assign({ t, d: 0.5, k, v: v === undefined ? 1 : v, p: 0 }, x || {})); };
  // S01 the clip snaps shut, the display boots
  S(0.0, 'snap', 0.85, { p: 0.15 }); S(0.34, 'boot', 0.45, { p: 0.2 }); S(0.94, 'lcd', 0.3, { p: 0.2 });
  // "measuring": one rising tick per step of the segment chase, up into the SpO2 slam
  for (let i = 0; i < 8; i++) S(bt(2) + i * S16, 'uitick', 0.2 + 0.03 * i, { f: mtof(pent(12 + i, 4)), p: i % 2 ? 0.25 : -0.25 });
  // S02 SpO2 98 appears
  S(T(1), 'wake', 0.6, { p: 0.15 });
  // S03 the X-ray dive, red and infrared light crosses the finger, the detector answers
  S(T(2), 'dive', 0.4, { d: 0.5 }); S(T(2) + 0.2, 'xray', 0.35, { d: 0.5 });
  B03.forEach(([tE, kind], i) => { S(tE, 'photon', 0.4, { f: mtof(kind === 'red' ? pent(18, 4) : pent(15, 4)), p: 0.35 }); S(tE + 0.42, 'pdclick', 0.28, { p: -0.35 }); });
  // S04 the LEDs take turns (red, infrared, off) — a click per lit slot
  S(T(3), 'swish', 0.3, { d: 0.5 });
  for (let i = 0; i < 8; i++) { const slot = i % 3; if (slot < 2) S(T(3) + i * E8, 'led', 0.3, { f: mtof(slot === 0 ? pent(18, 4) : pent(15, 4)), p: slot === 0 ? 0.3 : -0.1 }); }
  // S05 light enters the tissue
  S(T(4), 'swish', 0.28, { d: 0.5, down: 1 });
  B05.forEach(([tE, kind]) => S(tE, 'photon', 0.32, { f: mtof(kind === 'red' ? pent(18, 4) : pent(15, 4)), p: 0.3 }));
  // S06 the artery throbs with each heartbeat
  S(T(5), 'swish', 0.25, { d: 0.6 });
  for (let i = 0; i < 4; i++) S(bt(20 + 2 * i), 'throb', 0.55);
  // S07 into the blood, into a red cell
  S(T(6) + 0.05, 'lens', 0.42, { d: 0.4 }); S(T(6) + 0.3, 'fluid', 0.4, { d: 1.6 }); S(T(6) + 0.6, 'lens', 0.36, { d: 0.4 });
  // S08 four oxygens bind (rising pops), the two forms are named
  for (let i = 0; i < 4; i++) S(T(7) + 0.12 + i * E8, 'o2pop', 0.4, { f: mtof(pent(15 + i, 4)), p: -0.3 });
  S(T(7) + 0.35, 'compare', 0.35, { f: mtof(nm('C#', 6)), p: -0.3 }); S(T(7) + 0.6, 'compare', 0.35, { f: mtof(nm('F#', 5)), p: 0.3, dark: 1 });
  // S09 red light: the deoxy one swallows it; infrared: the oxy one takes a little more
  S(T(8) + 0.2, 'rain', 0.35, { d: 1.0, f: mtof(pent(18, 4)) }); S(T(8) + 0.62, 'absorb', 0.4, { p: 0.35 });
  S(T(8) + 1.45, 'rain', 0.32, { d: 1.0, f: mtof(pent(15, 4)) }); S(T(8) + 1.87, 'absorb', 0.4, { p: -0.35 });
  // S10 back out; the light meter dips with each pulse
  S(T(9), 'lensout', 0.4, { d: 0.45 }); S(T(9) + 0.75, 'meter', 0.35, { d: 2.4 });
  for (let i = 0; i < 4; i++) S(bt(44 + 2 * i), 'throb', 0.32);
  // S11 the photodiode catches the light
  S(T(10), 'swish', 0.28, { d: 0.6 });
  B11.forEach(([tE], i) => { if (i < 4) S(tE + 0.42, 'pdclick', 0.35, { p: -0.3 }); });
  S(T(10) + 0.95, 'lens', 0.38, { d: 0.42 });
  // S12 light becomes current
  S(T(11), 'lens', 0.38, { d: 0.45 });
  EV12.forEach(([tE, kind], i) => S(tE + 0.32, 'zap', 0.45, { f: mtof(pent(16 + i, 4)), p: 0.2 }));
  S(T(11) + 0.5, 'current', 0.3, { d: 2.3 });
  // S13 THE DROP: the raw signal slams in
  S(T(12), 'slam', 0.8); S(T(12) + 0.05, 'scope', 0.3, { d: 1.2 });
  // S14 the signal splits into DC and AC
  S(T(13), 'swish', 0.22, { d: 0.45, down: 1 }); S(T(13) + 0.55, 'split', 0.4, { d: 0.75 });
  [0, 1, 2].forEach(i => S(T(13) + 1.3 + i * 0.2, 'uitick', 0.35, { f: mtof(pent(16 + i * 2, 4)) }));
  // S15 two channels
  S(T(14), 'swish', 0.22, { d: 0.45, down: 1 }); S(T(14) + 0.5, 'dual', 0.4, { f: mtof(pent(18, 4)), p: -0.3 }); S(T(14) + 0.75, 'dual', 0.4, { f: mtof(pent(15, 4)), p: 0.3 });
  // S16 ratio of ratios
  S(T(15), 'swish', 0.22, { d: 0.45, down: 1 }); S(T(15) + 0.4, 'bars', 0.4, { d: 0.6 });
  [1.0, 1.2, 1.6].forEach((dt, i) => S(T(15) + dt, 'calc', 0.35, { f: mtof(pent(14 + i * 2, 5)) })); S(T(15) + 2.1, 'ding', 0.55);
  // S17 processing
  S(T(16), 'lensout', 0.4, { d: 0.45 }); S(T(16) + 0.6, 'bits', 0.32, { d: 2.6 });
  [0.9, 1.6, 2.3].forEach((dt, i) => S(T(16) + dt, 'compute', 0.4, { f: mtof(pent(12 + i * 2, 4)) }));
  // S18 the estimate: the curve, the marker, 98 %
  S(T(17) + 0.3, 'lens', 0.38, { d: 0.4 }); S(T(17) + 0.68, 'plot', 0.3, { d: 0.6 }); S(T(17) + 1.38, 'slide', 0.35, { d: 0.9 }); S(T(17) + 2.28, 'ding', 0.6);
  // S19 pulse rate from the peaks
  S(T(18), 'swish', 0.22, { d: 0.45, down: 1 }); S(T(18) + 0.6, 'calc', 0.32, { f: mtof(pent(15, 5)) }); S(T(18) + 1.0, 'calc', 0.3, { f: mtof(pent(17, 5)) }); S(T(18) + 1.6, 'prchime', 0.5);
  // S20 back to the display: the result lands with the beep
  S(T(19), 'lensout', 0.42, { d: 0.42 }); S(50.727, 'success', 0.8);
  // S21 recap: one pop per tile, up the scale
  for (let k = 0; k < 8; k++) S(bt(112 + k), 'tile', 0.42, { f: mtof(pent(12 + k, 4)), p: k % 2 ? 0.3 : -0.3 });
  // S22, S23 clarifications
  S(T(21), 'clarity', 0.45, { d: 1.2 }); S(T(22) + 0.45, 'wrong', 0.4); S(T(22) + 0.8, 'right', 0.45);
  // S24 back to the finger, the title, the display powers off, the clip springs open into frame one
  S(T(23), 'whoosh', 0.32, { d: 0.9, down: 1 }); S(60.5, 'title', 0.4, { d: 1.2 }); S(61.55, 'poweroff', 0.4); S(61.72, 'spring', 0.45);
  return ev;
}
function allEvents() {
  const ev = musicEvents().map(e => Object.assign(e, { bus: 'm' })).concat(sfxEvents().map(e => Object.assign(e, { bus: 's' })));
  ev.sort((a, b) => a.t - b.t);
  return ev;
}
// ---------------------------------------------------------------- synthesis core
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
  G.music = ctx.createGain(); G.music.gain.value = MUSIC_GAIN;
  G.duck = ctx.createGain(); G.duck.gain.value = 1;            // short dips under the low SFX (summed offsets, see duck())
  G.music.connect(G.duck); G.duck.connect(G.mix);
  G.pump = ctx.createGain(); G.pump.gain.value = 1; G.pump.connect(G.music);       // sidechain sub-bus
  G.sfx = ctx.createGain(); G.sfx.gain.value = 0.95; G.sfx.connect(G.mix);
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
// the music dips a few dB under these effects so they land: [depth (gain offset), hold s]
const DUCK = { snap: [0.35, 0.2], slam: [0.3, 0.25], throb: [0.22, 0.2], success: [0.3, 0.45], wake: [0.25, 0.3], ding: [0.25, 0.3], prchime: [0.22, 0.3] };
function duck(G, V, when, depth, hold) {
  const c = G.ctx.createConstantSource(), t0 = Math.max(0, when - 0.03);
  c.offset.setValueAtTime(0, t0); c.offset.linearRampToValueAtTime(-depth, when + 0.01);
  c.offset.setValueAtTime(-depth, when + hold); c.offset.linearRampToValueAtTime(0, when + hold + 0.25);
  c.connect(G.duck.gain); c.start(t0); c.stop(when + hold + 0.3); V.srcs.push(c);
}
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
    case 'pbeep': { // the oximeter's pulse tone: a clean sine with a touch of square, ~90 ms
      V = voice(G, ev, when, 0.12, 0.18);
      const o = osc(G, V, 'sine', f, when, when + 0.3); o.connect(V.vg);
      const q = osc(G, V, 0.5, f, when, when + 0.3); const qg = ctx.createGain(); qg.gain.value = 0.12; q.connect(qg); qg.connect(V.vg);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v, when + 0.004); V.vg.gain.setValueAtTime(v, when + 0.07); V.vg.gain.linearRampToValueAtTime(0, when + 0.095); break;
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
    case 'tom': { V = voice(G, ev, when, 0.25); const o = osc(G, V, 'sine', ev.f || 150, when, when + 0.35); o.frequency.exponentialRampToValueAtTime((ev.f || 150) * 0.55, when + 0.25); o.connect(V.vg); perc(V.vg, when, 0.002, 0.22, v); break; }
    case 'crash': { V = voice(G, ev, when, 0.45); const n = noiseSrc(G, V, when, when + 2.2, 1); const hp = filt(G, 'highpass', 5200); n.connect(hp); hp.connect(V.vg); perc(V.vg, when, 0.002, 1.5, v); V.end = when + 2.4; break; }
    case 'revcym': { V = voice(G, ev, when, 0.4); const n = noiseSrc(G, V, when, when + d + 0.05, 1); const hp = filt(G, 'highpass', 4500); n.connect(hp); hp.connect(V.vg); V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v, when + d * 0.97); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.2; break; }
    case 'riser': { // white-noise riser + rising saw into the next downbeat
      V = voice(G, ev, when, 0.3);
      const s = noiseSrc(G, V, when, when + d, 1), hp = filt(G, 'highpass', 800); hp.frequency.setValueAtTime(800, when); hp.frequency.exponentialRampToValueAtTime(9000, when + d); s.connect(hp); hp.connect(V.vg);
      const lp = filt(G, 'lowpass', 1200); lp.frequency.setValueAtTime(1200, when); lp.frequency.exponentialRampToValueAtTime(6000, when + d); lp.connect(V.vg);
      const o = osc(G, V, 'sawtooth', mtof(nm('C#', 3)), when, when + d); o.connect(lp); o.frequency.exponentialRampToValueAtTime(mtof(nm('C#', 5)), when + d);
      V.vg.gain.setValueAtTime(0, when); V.vg.gain.linearRampToValueAtTime(v * 0.9, when + d * 0.98); V.vg.gain.linearRampToValueAtTime(0, when + d); V.end = when + d + 0.2; break;
    }
    case 'glead': { // "data" chip lead: pulse + square, a quick downward bend, digital tremolo
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
// SFX design: tuned to F# minor pentatonic; light and molecules are silent in reality (educational sonification)
function sfx(G, ev, when) {
  const ctx = G.ctx, k = ev.k, v = ev.v, d = ev.d || 0.5, f = ev.f;
  const rewards = { wake: 1, ding: 1, success: 1, prchime: 1, tile: 1, o2pop: 1, compute: 1, calc: 1, led: 1, photon: 1, zap: 1, title: 1, right: 1, clarity: 1 };
  const V = voice(G, ev, when, 0.3, rewards[k] ? 0.3 : 0);
  if (DUCK[k]) duck(G, V, when, DUCK[k][0], DUCK[k][1]);
  const tone = (type, fr, t0, t1, dest) => { const o = osc(G, V, type, fr, t0, t1); o.connect(dest || V.vg); return o; };
  const blip = (type, fr, t, dec, peak, dest) => { const g = ctx.createGain(); g.gain.value = 0; tone(type, fr, t, t + dec * 4 + 0.05, g); g.connect(dest || V.vg); perc(g, t, 0.002, dec, peak); return g; };
  const nz = (t, dur, type, fr, q, peak, att, dec, rate) => { const s = noiseSrc(G, V, t, t + dur, rate || 1), b = filt(G, type, fr, q), g = ctx.createGain(); g.gain.value = 0; s.connect(b); b.connect(g); g.connect(V.vg); perc(g, t, att || 0.001, dec, peak); return b; };
  const boom = (f0, f1, t, dec, peak) => { const g = ctx.createGain(); g.gain.value = 0; const o = tone('sine', f0, t, t + dec * 4 + 0.1, g); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.6); g.connect(V.vg); perc(g, t, 0.003, dec, peak); };
  const level = (x, end) => { V.vg.gain.setValueAtTime(x, when); V.end = when + (end || 1); };
  const P5 = i => mtof(pent(i, 5)), P6 = i => mtof(pent(i, 6));
  switch (k) {
    case 'snap': { // plastic jaws close: a hard click, a spring thunk, a short rattle
      nz(when, 0.012, 'highpass', 3200, 0.7, 1, 0.0003, 0.006); nz(when + 0.004, 0.03, 'bandpass', 1500, 1.4, 0.7, 0.001, 0.018);
      boom(210, 85, when, 0.06, 0.9); blip('triangle', 1250, when, 0.03, 0.35);
      for (const dt of [0.045, 0.075]) nz(when + dt, 0.01, 'bandpass', 2600, 2, 0.25, 0.0005, 0.006);
      nz(when, 0.008, 'bandpass', 4600, 1.2, 0.6, 0.0002, 0.004);
      level(v * 0.95, 0.5); break;
    }
    case 'boot': { const o = tone('sine', 600, when, when + 0.16); o.frequency.exponentialRampToValueAtTime(1500, when + 0.1); blip(0.25, mtof(nm('C#', 6)), when + 0.1, 0.06, 0.6); perc(V.vg, when, 0.003, 0.14, v * 0.48); V.end = when + 0.6; break; }
    case 'lcd': blip('square', 1800, when, 0.015, 1); blip('square', 2400, when + 0.05, 0.015, 0.7); level(v * 0.2, 0.4); break;
    case 'wake': { // the reading appears: a bright rising two-note chime
      [nm('A', 5), nm('E', 6), nm('A', 6)].forEach((m, i) => blip(i === 2 ? 'sine' : 0.25, mtof(m), when + i * 0.05, i === 2 ? 0.3 : 0.07, i === 2 ? 0.6 : 1));
      nz(when, 0.3, 'highpass', 7000, 0.7, 0.3, 0.01, 0.12); level(v * 0.22, 1.0); break;
    }
    case 'dive': sweepNoise(G, V, when, d, 240, 5600, 1.4, v * 0.34, 0.75); { const o = tone('sine', 200, when, when + d + 0.2); o.frequency.exponentialRampToValueAtTime(1300, when + d); } break;
    case 'xray': { nz(when, d, 'highpass', 6500, 0.7, 0.35, d * 0.4, d * 0.4); [P6(0), P6(2), P6(4)].forEach((fr, i) => blip('sine', fr, when + i * 0.06, 0.25, 0.4)); level(v * 0.2, d + 0.5); break; }
    case 'photon': { const o = tone('sine', f * 2, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(f, when + 0.12); blip('triangle', f * 2, when, 0.03, 0.4); perc(V.vg, when, 0.002, 0.16, v * 0.18); V.end = when + 0.6; break; }
    case 'pdclick': { nz(when, 0.01, 'highpass', 5000, 0.7, 1, 0.0003, 0.004); blip('square', mtof(nm('F#', 6)), when + 0.004, 0.02, 0.5); level(v * 0.3, 0.3); break; }
    case 'led': { blip(0.25, f, when, 0.035, 1); nz(when, 0.006, 'highpass', 6000, 0.7, 0.4, 0.0003, 0.003); level(v * 0.2, 0.3); break; }
    case 'swish': if (ev.down) sweepNoise(G, V, when, d, 3200, 500, 0.9, v * 0.28, 0.3); else sweepNoise(G, V, when, d, 500, 3600, 0.9, v * 0.3, 0.5); break;
    case 'whoosh': sweepNoise(G, V, when, d, 3000, 300, 0.8, v * 0.32, 0.3); break;
    case 'throb': { boom(78, 46, when, 0.13, 1); boom(150, 92, when, 0.06, 0.6); boom(260, 140, when, 0.05, 0.55); nz(when, 0.07, 'lowpass', 340, 1, 0.7, 0.004, 0.045); nz(when, 0.05, 'bandpass', 520, 1.1, 0.45, 0.002, 0.03); boom(70, 44, when + 0.17, 0.1, 0.5); boom(220, 120, when + 0.17, 0.04, 0.35); level(v * 0.5, 0.6); break; }
    case 'lens': sweepNoise(G, V, when, d, 700, 5600, 1.1, v * 0.3, 0.7); blip('sine', P6(1), when + d, 0.25, v * 0.15); break;
    case 'lensout': sweepNoise(G, V, when, d, 5200, 600, 1.1, v * 0.3, 0.3); blip('sine', P5(3), when + d, 0.2, v * 0.12); break;
    case 'fluid': { const n = noiseSrc(G, V, when, when + d + 0.3, 0.7), lp = filt(G, 'lowpass', 800, 1.5); n.connect(lp); lp.connect(V.vg); const lfo = tone('sine', 1.07, when, when + d + 0.3); lfo.disconnect(); const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency); for (let i = 0; i < 5; i++) { const t = when + 0.2 + i * 0.27, o = tone('sine', P5(i * 2) * 0.5, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(P5(i * 2), t + 0.08); } adsr(V.vg, when, 0.3, 0.3, 0.85, 0.3, d, v * 0.16); V.end = when + d + 0.8; break; }
    case 'o2pop': { const o = tone('sine', f * 0.6, when, when + 0.16); o.frequency.exponentialRampToValueAtTime(f * 1.2, when + 0.05); blip('triangle', f * 2, when + 0.02, 0.05, 0.3); perc(V.vg, when, 0.002, 0.1, v * 0.3); V.end = when + 0.5; break; }
    case 'compare': { const o = tone(ev.dark ? 'triangle' : 'sine', f, when, when + 0.6); if (ev.dark) { const lp = filt(G, 'lowpass', 700); o.disconnect(); o.connect(lp); lp.connect(V.vg); } blip('sine', f * 2, when, 0.12, 0.3); perc(V.vg, when, 0.004, 0.35, v * 0.22); V.end = when + 0.9; break; }
    case 'rain': { for (let i = 0; i < 10; i++) { const t = when + i * d / 10 + 0.02 * hash(i + 990); blip('sine', f * (1 + 0.5 * (i % 3)), t, 0.04, 0.5 + 0.4 * hash(i + 991)); } level(v * 0.16, d + 0.4); break; }
    case 'absorb': { for (let i = 0; i < 4; i++) { const t = when + i * 0.07; boom(320 - i * 30, 160, t, 0.05, 0.6); nz(t, 0.02, 'bandpass', 1800, 2, 0.3, 0.001, 0.012); } level(v * 0.32, 0.6); break; }
    case 'meter': { const o = tone('sine', P5(2), when, when + d); const lfo = tone('sine', 1 / HB, when, when + d); lfo.disconnect(); const g = ctx.createGain(); g.gain.value = 18; lfo.connect(g); g.connect(o.frequency); adsr(V.vg, when, 0.2, 0.3, 0.8, 0.2, d, v * 0.06); V.end = when + d + 0.5; break; }
    case 'zap': { const o = tone('sawtooth', f * 2, when, when + 0.12), lp = filt(G, 'lowpass', 3000); o.disconnect(); o.connect(lp); lp.connect(V.vg); o.frequency.exponentialRampToValueAtTime(f * 0.5, when + 0.1); blip('square', f, when, 0.03, 0.5); nz(when, 0.01, 'highpass', 5000, 0.7, 0.4, 0.0003, 0.004); perc(V.vg, when, 0.002, 0.1, v * 0.5); V.end = when + 0.5; break; }
    case 'current': { const o = tone('sawtooth', 110, when, when + d), lp = filt(G, 'lowpass', 600, 4); o.disconnect(); o.connect(lp); lp.connect(V.vg); lp.frequency.setValueAtTime(400, when); lp.frequency.exponentialRampToValueAtTime(2600, when + d); adsr(V.vg, when, d * 0.6, 0.2, 0.9, 0.1, d, v * 0.11); V.end = when + d + 0.3; break; }
    case 'slam': { boom(120, 40, when, 0.32, 1); nz(when, 0.5, 'lowpass', 1200, 0.7, 0.6, 0.002, 0.25); nz(when, 0.4, 'highpass', 5000, 0.7, 0.35, 0.002, 0.2); [nm('F#', 3), nm('C#', 4), nm('F#', 4)].forEach(m => { const g = ctx.createGain(); g.gain.value = 0; tone('sawtooth', mtof(m), when, when + 0.6, g); const lp = filt(G, 'lowpass', 1800); g.disconnect(); g.connect(lp); lp.connect(V.vg); perc(g, when, 0.004, 0.35, 0.18); }); level(v * 0.5, 1.2); break; }
    case 'scope': { const o = tone('sine', P5(3), when, when + d); o.frequency.setValueAtTime(P5(3), when); for (let i = 0; i < 3; i++) o.frequency.setValueAtTime(P5(3) * (i % 2 ? 0.94 : 1), when + i * HB / 2); adsr(V.vg, when, 0.02, 0.3, 0.6, 0.2, d, v * 0.08); V.end = when + d + 0.3; break; }
    case 'split': { sweepNoise(G, V, when, d, 900, 3800, 2, v * 0.16, 0.3); const a = tone('sine', P5(0), when, when + d), b2 = tone('sine', P5(0), when, when + d); b2.frequency.exponentialRampToValueAtTime(P6(0), when + d); a.frequency.exponentialRampToValueAtTime(P5(0) * 0.5, when + d); adsr(V.vg, when, 0.05, 0.2, 0.8, 0.1, d, v * 0.08); break; }
    case 'uitick': blip(0.25, f, when, 0.03, 1); nz(when, 0.005, 'highpass', 7000, 0.7, 0.3, 0.0002, 0.003); level(v * 0.28, 0.3); break;
    case 'dual': { blip(0.25, f, when, 0.06, 1); blip('sine', f * 2, when + 0.06, 0.08, 0.5); level(v * 0.36, 0.5); break; }
    case 'bars': { for (let i = 0; i < 6; i++) blip('triangle', P5(i), when + i * (d / 6), 0.05, 0.7); level(v * 0.3, d + 0.4); break; }
    case 'calc': blip('square', f, when, 0.02, 1); blip('square', f * 1.5, when + 0.045, 0.02, 0.6); level(v * 0.3, 0.4); break;
    case 'ding': { [nm('A', 5), nm('C#', 6), nm('E', 6), nm('A', 6)].forEach((m, i) => blip(i < 3 ? 0.25 : 'sine', mtof(m), when + i * 0.045, i < 3 ? 0.06 : 0.4, i < 3 ? 0.9 : 0.6)); nz(when, 0.4, 'highpass', 7000, 0.7, 0.2, 0.01, 0.15); level(v * 0.2, 1.2); break; }
    case 'compute': { for (let i = 0; i < 6; i++) blip(0.25, f * Math.pow(2, [0, 3, 5, 7, 10, 12][i] / 12), when + i * 0.035, 0.03, 0.8); level(v * 0.16, 0.8); break; }
    case 'bits': { const n = Math.round(d / 0.06); for (let i = 0; i < n; i++) blip('square', mtof(pent(8 + Math.floor(hash(i + 601) * 6), 5)), when + i * 0.06, 0.012, hash(i + 602) > 0.4 ? 0.9 : 0.35); level(v * 0.12, d + 0.3); break; }
    case 'plot': { const o = tone('sine', 520, when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(1300, when + d); adsr(V.vg, when, 0.03, 0.1, 0.8, 0.04, d, v * 0.12); break; }
    case 'slide': { const o = tone('triangle', P5(0), when, when + d + 0.05); o.frequency.exponentialRampToValueAtTime(P6(3), when + d); adsr(V.vg, when, 0.03, 0.1, 0.8, 0.05, d, v * 0.12); break; }
    case 'prchime': { [nm('C#', 6), nm('F#', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.08, 0.09, 1)); blip('sine', mtof(nm('C#', 7)), when + 0.16, 0.3, 0.5); level(v * 0.26, 1.0); break; }
    case 'success': { // the result lands: a clean beep, a sub, a bright A-major bloom
      boom(110, 50, when, 0.25, 0.9); blip('sine', mtof(nm('C#', 6)), when, 0.09, 1); blip('sine', mtof(nm('C#', 6)), when + 0.12, 0.09, 1);
      [nm('A', 5), nm('C#', 6), nm('E', 6), nm('A', 6)].forEach((m, i) => blip('sine', mtof(m), when + 0.24 + i * 0.03, 0.5, 0.45));
      nz(when, 0.6, 'highpass', 6500, 0.7, 0.28, 0.01, 0.25); level(v * 0.28, 1.6); break;
    }
    case 'tile': { blip(0.25, f, when, 0.05, 1); blip('sine', f * 2, when + 0.02, 0.12, 0.4); nz(when, 0.01, 'highpass', 6000, 0.7, 0.3, 0.0003, 0.004); level(v * 0.32, 0.5); break; }
    case 'clarity': { [nm('F#', 5), nm('C#', 6), nm('F#', 6)].forEach((m, i) => blip('sine', mtof(m), when + i * 0.12, 0.6, 0.5)); level(v * 0.18, d + 0.6); break; }
    case 'wrong': { const o = tone('square', mtof(nm('E', 4)), when, when + 0.22), lp = filt(G, 'lowpass', 1400); o.disconnect(); o.connect(lp); lp.connect(V.vg); o.frequency.setValueAtTime(mtof(nm('C#', 4)), when + 0.1); perc(V.vg, when, 0.003, 0.2, v * 0.26); V.end = when + 0.6; break; }
    case 'right': { [nm('C#', 6), nm('E', 6)].forEach((m, i) => blip(0.25, mtof(m), when + i * 0.07, 0.08, 1)); level(v * 0.26, 0.8); break; }
    case 'title': { nz(when, d, 'highpass', 7000, 0.7, 0.4, 0.02, d * 0.4); [P6(0), P6(2), P6(4), P6(5)].forEach((fr, i) => blip('sine', fr, when + i * 0.07, 0.4, 0.4)); level(v * 0.18, d + 0.5); break; }
    case 'poweroff': { const o = tone('sine', 1400, when, when + 0.2); o.frequency.exponentialRampToValueAtTime(260, when + 0.16); perc(V.vg, when, 0.003, 0.16, v * 0.25); V.end = when + 0.5; break; }
    case 'spring': { const o = tone('triangle', 300, when, when + 0.3); o.frequency.exponentialRampToValueAtTime(900, when + 0.12); nz(when, 0.08, 'bandpass', 2400, 3, 0.4, 0.002, 0.05); for (let i = 0; i < 4; i++) blip('sine', 700 + 90 * i, when + 0.02 + i * 0.025, 0.02, 0.3); perc(V.vg, when, 0.003, 0.2, v * 0.25); V.end = when + 0.5; break; }
    default: level(0, 0.1);
  }
  return V;
}
// ---------------------------------------------------------------- offline render (export): the tail past 62 s is folded onto 0:00 (seamless loop)
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
const SUSTAINED = { pad: 1, vox: 1, fluid: 1, current: 1, meter: 1, riser: 1, bits: 1, sub: 1 };
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
