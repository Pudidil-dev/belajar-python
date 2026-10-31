'use strict';
// ============================================================================
// AUDIO — a fun 8-bit chiptune score at 120 BPM in F major (65 bars =
// 130.000 s) plus event-synced SFX built from the same chip voices, so music
// and effects share one sound. Synthesised sample by sample in plain JS (no
// Web Audio graph): two pulse channels (12.5 / 25 / 50 % duty, band-limited
// edges), a 4-bit stepped triangle for the bass and the kick, LFSR noise for
// snare, hats and crashes, a dotted-eighth echo on the lead, light ducking
// under the big hits. Notes that run past 130 s wrap to 0:00, so the loop is
// seamless. The same code renders the player's audio and the MP4's.
// Arc: hook (bars 1-2) → rewind → light intro → mystery (virus) → groove
// (lysis, beads) → theme A (mix) → machine section → theme A (reverse
// transcription) → heat riser (denaturation) → theme B (primers, probe) →
// build (polymerase) → THE DROP on the probe cut (bar 43, 84 s) → glow
// (fluorescence, optics) → blips (photodiode) → climb (cycles) → drive (data)
// → suspense → victory fanfare on the result (bar 63, 124 s) → hook reprise →
// a C bar that falls back into bar 1.
// Molecules, light and electrons make no sound: these are sonifications.
// ============================================================================
const SR = 48000, NS = Math.round(DUR * SR);
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const nm = (n, o) => 12 * (o + 1) + NOTE[n];
const PENT = ['F', 'G', 'A', 'C', 'D'];
const pent = (i, o) => { const k = ((i % 5) + 5) % 5; return nm(PENT[k], o + Math.floor(i / 5)) + (k >= 3 ? 12 : 0); };
const CHD = { F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], Dm: ['D', 'F', 'A'], Bb: ['Bb', 'D', 'F'], Am: ['A', 'C', 'E'], Gm: ['G', 'Bb', 'D'] };
function chordMidi(name, oct) { let prev = -1; return CHD[name].map(n => { let m = nm(n, oct); while (m <= prev) m += 12; prev = m; return m; }); }
const BARS = ['F', 'C', 'Dm', 'Bb', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'F', 'C', 'Dm', 'Bb',
  'Dm', 'C', 'Bb', 'C', 'Dm', 'C', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'C',
  'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'Bb', 'C', 'C',
  'F', 'C', 'Dm', 'Bb', 'Bb', 'C', 'Am', 'Dm', 'Dm', 'C', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'C', 'F', 'C', 'C'];
function sec(b) {
  return b <= 2 ? 'hook' : b <= 4 ? 'intro' : b <= 8 ? 'myst' : b <= 12 ? 'groove' : b <= 16 ? 'themeA' : b <= 22 ? 'mech' : b <= 28 ? 'themeA2' :
    b <= 30 ? 'heat' : b <= 38 ? 'themeB' : b <= 42 ? 'build' : b <= 46 ? 'drop' : b <= 50 ? 'glow' : b <= 52 ? 'blip' : b <= 56 ? 'climb' :
    b <= 60 ? 'drive' : b <= 62 ? 'susp' : b === 63 ? 'fanfare' : b === 64 ? 'outro' : 'loop';
}
// melodies: [16th step, note, octave, length in 16ths]
const THEME_A = {
  F: [[0, 'C', 5, 2], [3, 'C', 5, 1], [4, 'F', 5, 2], [6, 'A', 5, 2], [8, 'C', 6, 3], [11, 'A', 5, 1], [12, 'G', 5, 2], [14, 'F', 5, 2]],
  C: [[0, 'E', 5, 2], [3, 'E', 5, 1], [4, 'G', 5, 2], [6, 'C', 6, 2], [8, 'E', 6, 3], [11, 'D', 6, 1], [12, 'C', 6, 2], [14, 'G', 5, 2]],
  Dm: [[0, 'D', 5, 2], [3, 'D', 5, 1], [4, 'F', 5, 2], [6, 'A', 5, 2], [8, 'D', 6, 3], [11, 'C', 6, 1], [12, 'A', 5, 2], [14, 'F', 5, 2]],
  Bb: [[0, 'D', 5, 2], [3, 'F', 5, 1], [4, 'Bb', 5, 2], [6, 'D', 6, 2], [8, 'F', 6, 2], [10, 'E', 6, 1], [11, 'D', 6, 1], [12, 'C', 6, 4]],
  Gm: [[0, 'D', 5, 2], [3, 'D', 5, 1], [4, 'G', 5, 2], [6, 'Bb', 5, 2], [8, 'D', 6, 3], [11, 'C', 6, 1], [12, 'Bb', 5, 2], [14, 'A', 5, 2]],
  Am: [[0, 'C', 5, 2], [3, 'C', 5, 1], [4, 'E', 5, 2], [6, 'A', 5, 2], [8, 'C', 6, 3], [11, 'B', 5, 1], [12, 'A', 5, 2], [14, 'E', 5, 2]],
};
const THEME_B = {
  Bb: [[0, 'F', 5, 3], [3, 'D', 5, 1], [4, 'F', 5, 2], [6, 'Bb', 5, 2], [8, 'A', 5, 4], [12, 'F', 5, 4]],
  C: [[0, 'G', 5, 3], [3, 'E', 5, 1], [4, 'G', 5, 2], [6, 'C', 6, 2], [8, 'Bb', 5, 4], [12, 'G', 5, 4]],
  Am: [[0, 'A', 5, 3], [3, 'E', 5, 1], [4, 'A', 5, 2], [6, 'C', 6, 2], [8, 'E', 6, 4], [12, 'D', 6, 2], [14, 'C', 6, 2]],
  Dm: [[0, 'D', 6, 6], [6, 'C', 6, 2], [8, 'A', 5, 4], [12, 'F', 5, 4]],
  F: [[0, 'A', 5, 3], [3, 'F', 5, 1], [4, 'A', 5, 2], [6, 'C', 6, 2], [8, 'F', 6, 4], [12, 'E', 6, 2], [14, 'C', 6, 2]],
  Gm: [[0, 'Bb', 5, 3], [3, 'G', 5, 1], [4, 'Bb', 5, 2], [6, 'D', 6, 2], [8, 'G', 6, 4], [12, 'F', 6, 4]],
};
const MYST = { Dm: [[0, 'A', 5, 6], [6, 'F', 5, 2], [8, 'E', 5, 8]], Bb: [[0, 'D', 6, 6], [6, 'C', 6, 2], [8, 'Bb', 5, 8]], F: [[0, 'C', 6, 6], [6, 'A', 5, 2], [8, 'G', 5, 8]], C: [[0, 'E', 6, 4], [4, 'D', 6, 4], [8, 'C', 6, 4], [12, 'G', 5, 4]] };
// ---------------------------------------------------------------- score → events
function musicEvents() {
  const ev = [];
  const N = (t, d, k, m, v, p, x) => ev.push(Object.assign({ t, d, k, f: m === null ? 0 : mtof(m), m, v, p: p || 0 }, x || {}));
  const mel = (b, set, inst, v, oct, opt) => {
    opt = opt || {}; const arr = set[BARS[b - 1]]; if (!arr) return;
    arr.forEach(([st, n, o, l]) => { if (opt.only && !opt.only(st)) return; const t = (b - 1) * BAR + st * S16; N(t, l * S16 * (opt.leg || 0.9), inst, nm(n, o + (oct || 0)), v, opt.p || 0, { duty: opt.duty, vib: opt.vib !== false }); });
  };
  for (let b = 1; b <= NBARS; b++) {
    const t0 = (b - 1) * BAR, ch = BARS[b - 1], s = sec(b), at = beat => t0 + beat * BEAT;
    const tri = chordMidi(ch, 4), root = nm(CHD[ch][0], 3) - (NOTE[CHD[ch][0]] > 7 ? 12 : 0);
    if (b === 3) { /* the rewind owns the first beat of bar 3 */ }
    const skip = tt => b === 3 && tt < t0 + 0.5;
    // ---- bass (triangle)
    const b8 = (v, oct) => { for (let i = 0; i < 8; i++) { const tt = at(i / 2); if (!skip(tt)) N(tt, E8 * 0.85, 'tri', root + (oct || 0) + (i % 2 ? 12 : 0), v); } };
    const b4 = v => { for (let i = 0; i < 4; i++) { const tt = at(i); if (!skip(tt)) N(tt, BEAT * 0.9, 'tri', root + (i === 3 ? 7 : 0), v); } };
    if (['hook', 'groove', 'themeA', 'themeA2', 'drop', 'climb', 'drive', 'outro'].includes(s)) b8(0.5);
    if (s === 'mech' || s === 'build') for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.7, 'tri', root + (i % 4 === 2 ? 12 : 0), (i % 2 ? 0.36 : 0.5) * (s === 'build' ? 0.75 : 1));
    if (s === 'intro' || s === 'glow') b4(0.45);
    if (s === 'myst') { N(t0, BAR * 0.95, 'tri', root, 0.42); }
    if (s === 'heat' || s === 'blip') b8(0.44);
    if (s === 'themeB') { if (b <= 34) b4(0.48); else b8(0.46); }
    if (s === 'susp') for (let i = 0; i < 8; i++) N(at(i / 2), E8 * 0.6, 'tri', root, 0.3 + 0.03 * i);
    if (s === 'fanfare') { N(t0, BEAT * 1.4, 'tri', root, 0.55); N(at(1.5), BEAT * 0.4, 'tri', root + 7, 0.5); N(at(2), BEAT * 1.8, 'tri', root + 12, 0.5); }
    if (s === 'loop') { for (let i = 0; i < 4; i++) N(at(i), BEAT * 0.8, 'tri', root + [0, 4, 7, 11][i], 0.45); }
    // ---- drums
    const kick = (beat, v) => { const tt = at(beat); if (!skip(tt)) ev.push({ t: tt, d: 0.12, k: 'kick', v }); };
    const snare = (beat, v) => { const tt = at(beat); if (!skip(tt)) ev.push({ t: tt, d: 0.16, k: 'snare', v, p: 0.12 }); };
    const hat = (beat, v, open) => { const tt = at(beat); if (!skip(tt)) ev.push({ t: tt, d: open ? 0.14 : 0.04, k: 'hat', v, p: (beat * 2) % 2 ? 0.35 : -0.35, open }); };
    const four = (kv, sv, hv, h16) => { kick(0, kv); kick(2, kv); kick(2.75, kv * 0.6); snare(1, sv); snare(3, sv); for (let i = 0; i < (h16 ? 16 : 8); i++) hat(i * (h16 ? 0.25 : 0.5), hv * (i % 2 ? 0.7 : 1), !h16 && i % 4 === 3); };
    if (s === 'hook' || s === 'drop') four(0.95, 0.75, 0.42, true);
    if (s === 'groove' || s === 'themeA' || s === 'themeA2' || s === 'climb' || s === 'drive' || s === 'outro') four(0.9, 0.7, 0.38, s === 'drive' || (s === 'climb' && b >= 55));
    if (s === 'intro') { kick(0, 0.55); if (b === 4) kick(2, 0.5); for (let i = 1; i < 8; i++) hat(i * 0.5, 0.22); }
    if (s === 'myst') { kick(0, 0.5); for (let i = 0; i < 4; i++) hat(i + 0.5, 0.2, i === 3); }
    if (s === 'mech') { kick(0, 0.85); kick(1.5, 0.6); kick(2, 0.85); snare(1, 0.6); snare(3, 0.66); for (let i = 0; i < 16; i++) hat(i * 0.25, i % 4 === 0 ? 0.36 : 0.22); }
    if (s === 'heat') { kick(0, 0.8); kick(2, 0.8); for (let i = 0; i < (b === 30 ? 16 : 8); i++) snare(i * (b === 30 ? 0.25 : 0.5), 0.2 + 0.03 * i); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.3); }
    if (s === 'themeB') { if (b <= 34) { kick(0, 0.85); snare(2, 0.7); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.3, i === 7); } else four(0.88, 0.68, 0.34, false); }
    if (s === 'build') { for (let i = 0; i < 4; i++) kick(i, 0.62 + 0.03 * (b - 39)); if (b < 42) { snare(1, 0.42); snare(3, 0.42); } else for (let i = 0; i < 16; i++) snare(i * 0.25, 0.2 + 0.03 * i); for (let i = 0; i < 16; i++) hat(i * 0.25, 0.18); }
    if (s === 'glow') { kick(0, 0.7); kick(2.5, 0.5); snare(3, 0.4); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.26, i % 4 === 3); }
    if (s === 'blip') { kick(0, 0.8); kick(1.5, 0.55); kick(2, 0.8); snare(3, 0.6); for (let i = 0; i < 16; i++) hat(i * 0.25, 0.22); }
    if (s === 'susp') { for (let i = 0; i < 4; i++) kick(i, 0.6 + 0.05 * i); if (b === 62) for (let i = 0; i < 16; i++) snare(i * 0.25, 0.22 + 0.035 * i); }
    if (s === 'fanfare') { kick(0, 1.0); snare(1, 0.7); kick(2, 0.9); snare(3, 0.7); for (let i = 0; i < 8; i++) hat(i * 0.5, 0.36); }
    if (s === 'loop') { kick(0, 0.8); kick(2, 0.7); snare(3, 0.5); snare(3.5, 0.6); snare(3.75, 0.7); }
    if ([1, 13, 23, 31, 43, 53, 63].includes(b)) ev.push({ t: t0, d: 1.4, k: 'crash', v: b === 43 || b === 63 ? 0.62 : 0.45 });
    // ---- arps (pulse 12.5 %): chord tones in 16ths, or the classic fast chip arpeggio
    const arp16 = (v, oct, pan) => { const tones = [...tri, tri[0] + 12]; for (let i = 0; i < 16; i++) { const tt = at(i / 4); if (!skip(tt)) N(tt, S16 * 0.7, 'arp', tones[[0, 1, 2, 3, 2, 1, 2, 1][i % 8]] + (oct || 0), v, (i % 2 ? pan : -pan)); } };
    if (['hook', 'groove', 'themeA', 'themeA2', 'drop', 'climb', 'drive'].includes(s)) arp16(s === 'drop' ? 0.24 : 0.16, s === 'drop' || s === 'climb' ? 12 : 0, 0.35);
    if (s === 'myst' || s === 'glow') { for (let i = 0; i < 8; i++) { const tt = at(i / 2); N(tt, E8 * 0.9, 'arp', [...tri, tri[1] + 12][i % 4] + 12, s === 'glow' ? 0.17 : 0.13, i % 2 ? 0.4 : -0.4, { echo: true }); } }
    if (s === 'mech') { for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.5, 'arp', (i % 2 ? tri[2] : tri[0]) + 12, 0.14, i % 2 ? 0.3 : -0.3); }
    if (s === 'heat') { for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', tri[i % 3] + 12 + Math.floor(i / 4) + (b === 30 ? 4 : 0), 0.14 + 0.004 * i, i % 2 ? 0.35 : -0.35); }
    if (s === 'themeB') N(t0, BAR * 0.96, 'chord', tri[0] + 12, 0.11, 0, { chord: tri.map(m => m + 12) });
    if (s === 'build') { for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.55, 'arp', tri[i % 3] + 12 + (b - 39) * 2, 0.11 + 0.012 * (b - 39), i % 2 ? 0.3 : -0.3); }
    if (s === 'blip') { for (let i = 0; i < 16; i++) if (hash(b * 31 + i) > 0.35) N(at(i / 4), S16 * 0.45, 'arp', pent(Math.floor(hash(b * 17 + i) * 10), 5), 0.15, i % 2 ? 0.45 : -0.45); }
    if (s === 'susp') { for (let i = 0; i < 16; i++) N(at(i / 4), S16 * 0.6, 'arp', tri[i % 3] + 12 + Math.floor(i / 2) + (b - 61) * 6, 0.14 + 0.006 * i, i % 2 ? 0.35 : -0.35); }
  }
  // ---- the lead (pulse 25 %), with echo
  const LEAD = (b, set, v, oct, o) => mel(b, set, 'lead', v, oct, Object.assign({ duty: 0.25 }, o || {}));
  LEAD(1, THEME_A, 0.34); LEAD(2, THEME_A, 0.34);
  for (const b of [5, 6, 7, 8]) mel(b, MYST, 'lead', 0.24, 0, { duty: 0.125, leg: 0.95 });
  for (let b = 13; b <= 16; b++) LEAD(b, THEME_A, 0.3);
  for (const b of [17, 19, 21]) LEAD(b, THEME_A, 0.22, 0, { only: st => st < 8, duty: 0.5 });
  for (let b = 23; b <= 28; b++) LEAD(b, THEME_A, 0.3, b >= 27 ? 1 : 0);
  for (let b = 31; b <= 38; b++) LEAD(b, THEME_B, 0.29, 0);
  for (const b of [39, 41]) LEAD(b, THEME_A, 0.22, 0, { only: st => st < 8 });
  for (let b = 43; b <= 46; b++) { LEAD(b, THEME_A, 0.4); mel(b, THEME_A, 'lead2', 0.24, 1, { duty: 0.125 }); }
  for (let b = 47; b <= 50; b++) mel(b, THEME_B, 'lead', 0.26, 0, { duty: 0.125 });
  for (let b = 53; b <= 56; b++) LEAD(b, THEME_A, 0.28 + 0.02 * (b - 53), b >= 55 ? 1 : 0);
  for (let b = 57; b <= 60; b++) LEAD(b, THEME_A, 0.32);
  // victory fanfare (bar 63): triplet run up, a held F6, a chord stab
  { const t0 = (63 - 1) * BAR, tr = BEAT / 3; ['F', 'A', 'C'].forEach((n, i) => N(t0 + i * tr, tr * 0.9, 'lead', nm(n, 5) + (n === 'C' ? 12 : 0), 0.36)); N(t0 + 3 * tr, BEAT * 1.5, 'lead', nm('F', 6), 0.38); N(t0 + 3 * tr + BEAT * 1.5, BEAT * 0.5, 'lead', nm('E', 6), 0.32); N(t0 + 3 * tr + BEAT * 2, BEAT * 1.0, 'lead', nm('F', 6), 0.36); }
  LEAD(64, THEME_A, 0.3, 0, { only: st => st < 12 });
  { const t0 = (65 - 1) * BAR; [['C', 5], ['E', 5], ['G', 5], ['Bb', 5], ['C', 6], ['E', 6]].forEach(([n, o], i) => N(t0 + BEAT * 2 + i * S16 * 1.33, S16 * 1.2, 'lead', nm(n, o), 0.22 + 0.02 * i)); }
  return ev;
}
// ---------------------------------------------------------------- SFX map (every cue belongs to a visible event)
function sfxEvents() {
  const ev = [];
  const S = (t, k, v, x) => ev.push(Object.assign({ t, k, v: v === undefined ? 1 : v, p: 0, f: 440 }, x || {}));
  const P5 = i => mtof(pent(i, 5)), P6 = i => mtof(pent(i, 6));
  // S01 hook
  S(0.0, 'power', 0.5); S(0.5, 'coin', 0.75, { f: P6(3) }); S(0.8, 'zoom', 0.55, { d: 0.7 }); S(1.12, 'lens', 0.45);
  S(2.5, 'snip', 0.9); S(2.55, 'release', 0.5); S(3.0, 'excite', 0.55); S(3.06, 'shimmer', 0.55, { d: 0.6 }); S(3.6, 'detect', 0.7);
  // S02 rewind, swab, tube
  S(T(1), 'rewind', 0.7); S(T(1) + 0.55, 'whoosh', 0.35, { d: 0.5 }); S(T(1) + 1.55, 'swish', 0.3); S(T(1) + 2.2, 'swirl', 0.35, { d: 0.4 });
  S(T(1) + 2.35, 'snap', 0.7); S(T(1) + 2.97, 'click', 0.7, { f: P6(0) }); S(T(1) + 3.35, 'zoom', 0.45, { d: 0.6 }); S(T(1) + 3.7, 'ping', 0.35, { f: P6(2) });
  // S03 virus
  S(T(2), 'lens', 0.45); S(T(2) + 0.8, 'blip', 0.35, { f: P5(4) }); S(T(2) + 1.2, 'blip', 0.35, { f: P5(2) }); S(T(2) + 2.0, 'zip', 0.5, { d: 1.4 });
  S(T(2) + 3.4, 'shimmer', 0.45, { d: 0.6 }); S(T(2) + 4.2, 'zoom', 0.3, { d: 0.6 });
  // S04 lysis
  for (let k = 0; k < 3; k++) S(T(3) + 0.15 + k * 0.22, 'drip', 0.4, { f: P5(5 + k) });
  S(T(3) + 0.95, 'lens', 0.4);
  for (let k = 0; k < 10; k++) S(T(3) + 2.1 + k * 0.17 + 0.05 * hash(k + 70), 'pop', 0.32, { f: P5(Math.floor(hash(k + 71) * 8)) });
  S(T(3) + 4.0, 'shimmer', 0.5, { d: 0.8 });
  // S05 purification
  for (let k = 0; k < 6; k++) S(T(4) + 0.3 + k * 0.18, 'clink', 0.3, { f: P6(k % 5) });
  S(T(4) + 1.5, 'magnet', 0.5, { d: 1.0 }); S(T(4) + 2.1, 'wash', 0.4, { d: 0.9 }); S(T(4) + 3.1, 'bloop', 0.5); S(T(4) + 3.6, 'shimmer', 0.35, { d: 0.5 });
  // S06 mix
  S(T(5) + 0.05, 'bloop', 0.45); [0.9, 1.3, 1.7, 2.1, 2.4].forEach((d, i) => S(T(5) + d, 'blip', 0.3, { f: P6(i) }));
  S(T(5) + 3.5, 'zoom', 0.35, { d: 0.6 }); S(T(5) + 4.75, 'click', 0.6, { f: P5(0) });
  // S07 machine
  S(T(6) + 0.1, 'mech', 0.45); [0.3, 0.7, 2.0, 3.5, 3.8].forEach((d, i) => S(T(6) + d, 'blip', 0.26, { f: P5(i * 2) }));
  // S08 Peltier: heat up, cool down, the sensor settles
  S(T(7), 'lens', 0.4); S(T(7) + 0.3, 'heatup', 0.45, { d: 1.6 }); S(T(7) + 2.0, 'cooldown', 0.45, { d: 1.4 }); S(T(7) + 3.5, 'sensor', 0.5);
  // S09 program: three temperature cues
  S(T(8) + 0.3, 'tempcue', 0.5, { f: P5(0) }); S(T(8) + 1.6, 'tempcue', 0.55, { f: P6(0) }); S(T(8) + 3.0, 'tempcue', 0.5, { f: P5(2), alt: P6(0) });
  for (let c = 0; c < 6; c++) S(T(8) + 3.05 + c * 0.17, 'tick', 0.2, { f: P6(2) });
  // S10 reverse transcription: dive, lock, nucleotides
  S(T(9), 'zoom', 0.5, { d: 0.6 }); S(T(9) + 2.3, 'lock', 0.55);
  RT_T.forEach((tt, i) => S(tt, i < 6 ? 'join' : 'tick', i < 6 ? 0.5 : 0.18, { f: P6(Math.min(9, i)) }));
  // S11 template
  S(T(10) + 1.5, 'heatup', 0.4, { d: 0.9 }); S(T(10) + 2.2, 'whoosh', 0.35, { d: 0.6 }); S(T(10) + 3.4, 'lock', 0.5);
  T2_T.forEach((tt, i) => { if (i % 2 === 0) S(tt, 'tick', 0.16, { f: P6(i % 8) }); });
  // S12 denaturation: heat, unzip crackle
  S(T(11) + 1.0, 'heatup', 0.45, { d: 1.4 }); for (let k = 0; k < 14; k++) S(T(11) + 2.0 + k * 0.13, 'crackle', 0.28, { f: P6(k % 5) }); S(T(11) + 3.5, 'whoosh', 0.35, { d: 0.6 });
  // S13 primers: search, no match, base-by-base locks
  S(T(12), 'cooldown', 0.35, { d: 1.2 }); S(T(12) + 1.4, 'whoosh', 0.3, { d: 0.5 }); S(T(12) + 2.45, 'wrong', 0.55);
  for (let k = 0; k < 8; k++) S(T(12) + 3.6 + k * 0.1, 'click', 0.36, { f: P5(k) }); S(T(12) + 4.45, 'lock', 0.55); S(T(12) + 5.0, 'lock', 0.5); S(T(12) + 5.1, 'swish', 0.3);
  // S14 probe
  S(T(13) + 1.0, 'blip', 0.3, { f: P6(2) }); S(T(13) + 2.0, 'whoosh', 0.3, { d: 0.6 }); for (let k = 0; k < 9; k++) S(T(13) + 3.0 + k * 0.11, 'click', 0.32, { f: P6(k % 5) });
  S(T(13) + 4.2, 'excite', 0.4); S(T(13) + 4.5, 'muffle', 0.5);
  // S15 polymerase: dock, nucleotide, catalysis close-up, rhythm of joins
  S(T(14) + 1.6, 'lock', 0.6); S(T(14) + 3.0, 'blip', 0.35, { f: P6(0) }); S(T(14) + 3.6, 'lens', 0.4); S(T(14) + 4.2, 'click', 0.3, { f: P6(4) });
  S(T(14) + 5.1, 'bond', 0.75); S(T(14) + 5.45, 'pop', 0.45, { f: P5(8) }); S(T(14) + 6.0, 'lens', 0.4);
  POL_T.forEach((tt, i) => { if (tt > T(14) + 6) S(tt, 'join', 0.42, { f: P6(i % 10) }); });
  // S16 the cut (84.0) and the release
  S(T(15) + 2.4, 'tension', 0.4, { d: 0.6 }); S(T(15) + 3.0, 'snip', 1.0); S(T(15) + 3.05, 'release', 0.6);
  for (let k = 1; k < 9; k++) S(T(15) + 3.0 + k * 0.3, 'pop', 0.3, { f: P6(k % 5) }); S(T(15) + 5.6, 'pop', 0.4, { f: P5(2) });
  // S17 fluorescence
  S(T(16), 'lens', 0.4); S(T(16) + 1.4, 'excite', 0.6); S(T(16) + 2.9, 'relax', 0.45); S(T(16) + 3.9, 'shimmer', 0.7, { d: 0.9 });
  // S18 optics
  S(T(17) + 0.8, 'power', 0.35); S(T(17) + 1.2, 'sweep', 0.4, { d: 0.6 }); S(T(17) + 2.0, 'buzz', 0.4); S(T(17) + 3.0, 'buzz', 0.35); S(T(17) + 3.4, 'detect', 0.55);
  // S19 photodiode: photon → electron, current, ADC
  S(T(18), 'zoom', 0.4, { d: 0.6 }); PD_EV.forEach((e, i) => { S(T(18) + e + 0.32, 'zap', 0.45, { f: P6(i % 5) }); }); S(T(18) + 1.3, 'hum', 0.3, { d: 2.0 }); S(T(18) + 3.6, 'data', 0.4, { d: 1.2 });
  // S20 cycles and doubling
  S(T(19), 'lens', 0.35); for (let k = 0; k < 3; k++) S(T(19) + 1.5 + k * 0.5, 'tick', 0.3, { f: P6(k * 2) });
  [3.0, 3.5, 4.0, 4.5].forEach((d, i) => S(T(19) + d, 'coin', 0.55, { f: P6(i * 2) }));
  // S21 more signal: layered shimmer
  for (let k = 0; k < 9; k++) S(T(20) + 0.6 + k * 0.48, 'ping', 0.2 + 0.03 * k, { f: P6(k % 5) });
  // S22 data: sampling ticks
  for (let k = 0; k < 14; k++) S(T(21) + 0.4 + k * 0.25, 'tick', 0.24, { f: P6(k % 3) });
  // S23 the curve: one tick per reading, pitch rising with the fluorescence; the threshold crossing dings
  for (let c = 1; c <= 40; c++) { const tc = T(22) + 0.3 + (c - 1) / 39 * 3.1, f = ampF(c); S(tc, 'tick', 0.16, { f: 600 + (f - 100) * 0.45 }); }
  S(T(22) + 0.3 + (CQ - 1) / 39 * 3.1, 'coin', 0.6, { f: P6(3) });
  // S24 result: checks, then the banner on bar 63 (with the fanfare)
  for (let k = 0; k < 4; k++) S(T(23) + 0.4 + k * 0.6, 'check', 0.45, { f: P6(k) }); S(T(23) + 3.0, 'win', 0.8);
  // S25 recap: one chime per link, the title, the reset into the loop
  S(T(24) + 0.1, 'whoosh', 0.35, { d: 0.8 }); for (let i = 0; i < 8; i++) S(T(24) + 2.0 + i * E8, 'blip', 0.38, { f: P6(i) });
  S(128.6, 'shimmer', 0.45, { d: 0.8 }); S(129.15, 'rewind', 0.35);
  return ev;
}
const DUCK = { snip: 0.5, win: 0.55, coin: 0.25, bond: 0.35, detect: 0.25, power: 0.2 };
// ---------------------------------------------------------------- the chip
const LFSR = (() => {
  const long = new Float32Array(32767), short = new Float32Array(93);
  let r = 1; for (let i = 0; i < 32767; i++) { const b = ((r >> 0) ^ (r >> 1)) & 1; r = (r >> 1) | (b << 14); long[i] = r & 1 ? 1 : -1; }
  r = 1; for (let i = 0; i < 93; i++) { const b = ((r >> 0) ^ (r >> 6)) & 1; r = (r >> 1) | (b << 14); short[i] = r & 1 ? 1 : -1; }
  return { long, short };
})();
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
// write one voice into (L, R): gen(i, tSec) returns a sample; env(tSec) the envelope
function voice(L, R, t0, dur, pan, gain, fn) {
  const i0 = Math.round(t0 * SR), n = Math.max(1, Math.round(dur * SR));
  const pl = Math.cos((pan + 1) * Math.PI / 4) * gain, pr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) { const s = fn(k / SR, k); if (s === 0) continue; let i = i0 + k; i = ((i % NS) + NS) % NS; L[i] += s * pl; R[i] += s * pr; }
}
const env = (t, a, d, sus, rel, dur) => { const e = t < a ? t / a : t < a + d ? 1 - (1 - sus) * (t - a) / d : sus; return t > dur ? e * Math.max(0, 1 - (t - dur) / rel) : e; };
// pulse oscillator with polyBLEP edges; fAt(t) frequency (Hz), duty
function pulseFn(fAt, duty, envFn) {
  let ph = 0;
  return (t) => {
    const f = Math.min(12000, fAt(t)), dt = f / SR; ph += dt; if (ph >= 1) ph -= 1;
    let v = ph < duty ? 1 : -1;
    v += polyblep(ph, dt); let p2 = ph - duty; if (p2 < 0) p2 += 1; v -= polyblep(p2, dt);
    return (v - (2 * duty - 1)) * envFn(t);
  };
}
function triFn(fAt, envFn) {
  let ph = 0;
  return (t) => { ph += fAt(t) / SR; if (ph >= 1) ph -= 1; const q = Math.floor(ph * 32), s = q < 16 ? q : 31 - q; return (s / 7.5 - 1) * envFn(t); };
}
function noiseFn(rateAt, envFn, short) {
  let ph = 0; const tab = short ? LFSR.short : LFSR.long, n = tab.length;
  return (t) => { ph += rateAt(t) / SR; return tab[Math.floor(ph) % n] * envFn(t); };
}
const vibAt = (f, t, depth, rate, delay) => t < delay ? f : f * Math.pow(2, depth / 12 * Math.sin((t - delay) * rate * TAU));
// one music event
function playMusic(e, L, R, LL, LR) {
  const k = e.k;
  if (k === 'lead' || k === 'lead2') {
    const d = e.d, duty = e.duty || 0.25, gain = (k === 'lead' ? 0.52 : 0.36) * e.v;
    const fn = pulseFn(t => vibAt(e.f, t, 0.22, 5.8, 0.14), duty, t => env(t, 0.004, 0.08, 0.72, 0.05, d));
    voice(L, R, e.t, d + 0.06, -0.08, gain, fn); voice(LL, LR, e.t, d + 0.06, -0.08, gain * 0.55, pulseFn(t => vibAt(e.f, t, 0.22, 5.8, 0.14), duty, t => env(t, 0.004, 0.08, 0.72, 0.05, d)));
  } else if (k === 'arp') {
    const fn = pulseFn(() => e.f, 0.125, t => env(t, 0.002, 0.05, 0.45, 0.03, e.d));
    voice(L, R, e.t, e.d + 0.04, e.p, 0.36 * e.v, fn);
    if (e.echo) voice(LL, LR, e.t, e.d + 0.04, -e.p, 0.25 * e.v, pulseFn(() => e.f, 0.125, t => env(t, 0.002, 0.05, 0.45, 0.03, e.d)));
  } else if (k === 'chord') {
    // the classic chip chord: one pulse channel cycling the chord tones at 60 Hz
    const ch = e.chord, fn = pulseFn(t => mtof(ch[Math.floor(t * 60) % ch.length]), 0.25, t => env(t, 0.01, 0.3, 0.5, 0.2, e.d));
    voice(L, R, e.t, e.d + 0.2, 0.15, 0.3 * e.v, fn);
  } else if (k === 'tri') {
    voice(L, R, e.t, e.d + 0.02, 0, 0.4 * e.v, triFn(() => e.f, t => env(t, 0.002, 0.02, 1, 0.02, e.d)));
  } else if (k === 'kick') {
    voice(L, R, e.t, 0.14, 0, 0.62 * e.v, triFn(t => 58 + 190 * Math.exp(-t * 36), t => env(t, 0.001, 0.02, 0.8, 0.05, 0.07)));
    voice(L, R, e.t, 0.014, 0, 0.32 * e.v, noiseFn(() => 26000, t => 1 - t / 0.014));
  } else if (k === 'snare') {
    voice(L, R, e.t, 0.17, e.p, 0.42 * e.v, noiseFn(() => 18000, t => Math.exp(-t * 22)));
    voice(L, R, e.t, 0.06, e.p, 0.22 * e.v, triFn(t => 220 - 600 * t, t => Math.exp(-t * 40)));
  } else if (k === 'hat') {
    voice(L, R, e.t, e.open ? 0.16 : 0.05, e.p, 0.2 * e.v, noiseFn(() => 40000, t => Math.exp(-t * (e.open ? 18 : 80)), true));
  } else if (k === 'crash') {
    voice(L, R, e.t, 1.5, 0, 0.3 * e.v, noiseFn(() => 30000, t => Math.exp(-t * 2.6)));
  }
}
// one SFX: chip blips, sweeps and noises tuned to F major pentatonic
function playSfx(e, L, R) {
  const k = e.k, v = e.v, f = e.f || 440, p = e.p || 0;
  const pls = (t0, d, fAt, duty, envFn, g, pan) => voice(L, R, t0, d, pan === undefined ? p : pan, g * v, pulseFn(fAt, duty, envFn));
  const nz = (t0, d, rateAt, envFn, g, short) => voice(L, R, t0, d, p, g * v, noiseFn(rateAt, envFn, short));
  const tr = (t0, d, fAt, envFn, g) => voice(L, R, t0, d, p, g * v, triFn(fAt, envFn));
  const dec = r => t => Math.exp(-t * r);
  switch (k) {
    case 'coin': pls(e.t, 0.07, () => f * 0.75, 0.5, dec(10), 0.34); pls(e.t + 0.07, 0.35, () => f, 0.5, dec(7), 0.34); break;
    case 'power': pls(e.t, 0.35, t => 200 * Math.pow(4, t / 0.3), 0.5, t => env(t, 0.005, 0.1, 0.6, 0.05, 0.3), 0.26); break;
    case 'zoom': nz(e.t, e.d || 0.6, t => 2000 + 30000 * (t / (e.d || 0.6)), t => Math.sin(Math.PI * clamp(t / (e.d || 0.6), 0, 1)), 0.16); break;
    case 'whoosh': nz(e.t, e.d || 0.5, t => 9000 - 6000 * (t / (e.d || 0.5)), t => Math.sin(Math.PI * clamp(t / (e.d || 0.5), 0, 1)), 0.14); break;
    case 'swish': nz(e.t, 0.25, t => 20000 - 50000 * t, t => Math.sin(Math.PI * clamp(t / 0.25, 0, 1)), 0.13); break;
    case 'lens': pls(e.t, 0.12, t => 880 + 2600 * t, 0.25, dec(18), 0.22); break;
    case 'snip': nz(e.t, 0.06, () => 36000, dec(60), 0.5, true); pls(e.t, 0.22, t => 1400 * Math.pow(0.25, t / 0.2), 0.5, dec(14), 0.32); tr(e.t, 0.2, t => 180 * Math.exp(-t * 10) + 40, dec(12), 0.6); break;
    case 'release': for (let i = 0; i < 4; i++) pls(e.t + i * 0.045, 0.08, () => mtof(pent(5 + i * 2, 5)), 0.125, dec(30), 0.22); break;
    case 'excite': for (let i = 0; i < 3; i++) pls(e.t + i * 0.035, 0.1, () => mtof(pent(i * 2, 5)), 0.25, dec(25), 0.24); break;
    case 'shimmer': { const d = e.d || 0.6; for (let i = 0; i < Math.floor(d / 0.04); i++) pls(e.t + i * 0.04, 0.06, () => mtof(pent(8 + (i * 3) % 7, 5)), 0.125, dec(40), 0.2 * (1 - i * 0.04 / d)); break; }
    case 'detect': pls(e.t, 0.08, () => mtof(pent(3, 6)), 0.5, dec(18), 0.28); pls(e.t + 0.09, 0.2, () => mtof(pent(5, 6)), 0.5, dec(12), 0.28); break;
    case 'rewind': pls(e.t, 0.48, t => 1600 * Math.pow(0.12, t / 0.48) * (1 + 0.15 * Math.sign(Math.sin(t * 90))), 0.25, t => env(t, 0.005, 0.1, 0.8, 0.05, 0.42), 0.26); nz(e.t, 0.48, () => 12000, t => 0.4 * Math.sin(Math.PI * t / 0.48), 0.1); break;
    case 'swirl': for (let i = 0; i < 6; i++) pls(e.t + i * 0.06, 0.07, () => mtof(pent(i % 3 + 4, 5)), 0.5, dec(30), 0.12); break;
    case 'snap': nz(e.t, 0.05, () => 30000, dec(70), 0.5, true); pls(e.t, 0.05, () => 2400, 0.5, dec(60), 0.2); break;
    case 'click': pls(e.t, 0.045, () => f, 0.5, dec(60), 0.38); nz(e.t, 0.01, () => 40000, dec(200), 0.22, true); break;
    case 'ping': pls(e.t, 0.2, () => f, 0.125, dec(14), 0.22); break;
    case 'blip': pls(e.t, 0.1, () => f, 0.25, dec(22), 0.34); break;
    case 'zip': pls(e.t, e.d || 1, t => 300 + 900 * (t / (e.d || 1)), 0.125, t => 0.6 * Math.sin(Math.PI * clamp(t / (e.d || 1), 0, 1)), 0.18); break;
    case 'drip': pls(e.t, 0.1, t => f * (1 + 2 * t), 0.5, dec(24), 0.26); break;
    case 'pop': pls(e.t, 0.07, t => f * (1 + 6 * t), 0.5, dec(36), 0.34); break;
    case 'clink': pls(e.t, 0.12, () => f, 0.125, dec(20), 0.3); pls(e.t, 0.12, () => f * 2.01, 0.125, dec(30), 0.14); break;
    case 'magnet': pls(e.t, e.d || 1, t => vibAt(110, t, 1.2, 9, 0), 0.5, t => env(t, 0.1, 0.2, 0.7, 0.2, (e.d || 1) - 0.2), 0.2); break;
    case 'wash': nz(e.t, e.d || 0.9, t => 4000 + 3000 * Math.sin(t * 9), t => Math.sin(Math.PI * clamp(t / (e.d || 0.9), 0, 1)), 0.14); break;
    case 'bloop': pls(e.t, 0.18, t => 300 * Math.pow(3, t / 0.15), 0.5, dec(12), 0.28); break;
    case 'mech': for (let i = 0; i < 4; i++) pls(e.t + i * 0.08, 0.08, () => mtof(pent([0, 3, 1, 5][i], 4)), 0.5, dec(30), 0.22); break;
    case 'heatup': { const d = e.d || 1.4; for (let i = 0; i < Math.floor(d / 0.07); i++) pls(e.t + i * 0.07, 0.07, () => mtof(pent(i, 4)), 0.5, dec(30), 0.13 + 0.006 * i); break; }
    case 'cooldown': { const d = e.d || 1.4; for (let i = 0; i < Math.floor(d / 0.07); i++) pls(e.t + i * 0.07, 0.07, () => mtof(pent(14 - i, 4)), 0.125, dec(30), 0.18); break; }
    case 'sensor': pls(e.t, 0.06, () => mtof(pent(5, 6)), 0.5, dec(30), 0.25); pls(e.t + 0.12, 0.06, () => mtof(pent(5, 6)), 0.5, dec(30), 0.25); break;
    case 'tempcue': pls(e.t, 0.25, () => f, 0.25, t => env(t, 0.005, 0.05, 0.6, 0.05, 0.2), 0.26); if (e.alt) pls(e.t + 0.25, 0.25, () => e.alt, 0.25, t => env(t, 0.005, 0.05, 0.6, 0.05, 0.2), 0.26); break;
    case 'tick': pls(e.t, 0.035, () => f, 0.5, dec(80), 0.34); break;
    case 'lock': pls(e.t, 0.05, () => mtof(pent(2, 5)), 0.5, dec(40), 0.3); pls(e.t + 0.05, 0.12, () => mtof(pent(7, 5)), 0.5, dec(22), 0.3); nz(e.t, 0.02, () => 30000, dec(120), 0.25, true); break;
    case 'join': pls(e.t, 0.08, () => f, 0.25, dec(30), 0.36); nz(e.t, 0.012, () => 36000, dec(200), 0.2, true); break;
    case 'crackle': nz(e.t, 0.04, () => 26000, dec(80), 0.34, true); pls(e.t, 0.03, () => f, 0.125, dec(80), 0.16); break;
    case 'wrong': pls(e.t, 0.12, () => 160, 0.5, t => env(t, 0.002, 0.02, 0.9, 0.03, 0.1), 0.26); pls(e.t + 0.14, 0.16, () => 140, 0.5, t => env(t, 0.002, 0.02, 0.9, 0.04, 0.12), 0.26); break;
    case 'muffle': tr(e.t, 0.18, () => 120, dec(16), 0.5); pls(e.t, 0.1, () => mtof(pent(0, 4)), 0.125, dec(30), 0.1); break;
    case 'bond': pls(e.t, 0.05, () => mtof(pent(5, 5)), 0.5, dec(40), 0.3); pls(e.t + 0.05, 0.3, () => mtof(pent(10, 5)), 0.5, dec(9), 0.32); tr(e.t, 0.12, () => mtof(pent(0, 3)), dec(20), 0.5); break;
    case 'tension': pls(e.t, e.d || 0.6, t => vibAt(mtof(pent(3, 4)) * (1 + t), t, 0.5, 12, 0), 0.125, t => Math.sin(Math.PI * 0.5 * clamp(t / (e.d || 0.6), 0, 1)), 0.18); break;
    case 'relax': for (let i = 0; i < 4; i++) pls(e.t + i * 0.09, 0.08, () => mtof(pent(9 - i, 5)), 0.125, dec(30), 0.2); break;
    case 'sweep': pls(e.t, e.d || 0.6, t => 600 + 1600 * (t / (e.d || 0.6)), 0.125, t => Math.sin(Math.PI * clamp(t / (e.d || 0.6), 0, 1)), 0.16); break;
    case 'buzz': pls(e.t, 0.12, () => 92, 0.5, t => env(t, 0.002, 0.03, 0.8, 0.02, 0.1), 0.2); nz(e.t, 0.05, () => 9000, dec(50), 0.15); break;
    case 'zap': pls(e.t, 0.12, t => f * Math.pow(0.3, t / 0.1), 0.5, dec(22), 0.26); break;
    case 'hum': tr(e.t, e.d || 2, () => mtof(pent(0, 3)), t => 0.5 * env(t, 0.2, 0.2, 0.8, 0.2, (e.d || 2) - 0.2), 0.4); break;
    case 'data': for (let i = 0; i < Math.floor((e.d || 1) / 0.0625); i++) if (hash(i + 900) > 0.35) pls(e.t + i * 0.0625, 0.04, () => mtof(pent(5 + Math.floor(hash(i + 901) * 6), 5)), 0.5, dec(70), 0.14); break;
    case 'check': pls(e.t, 0.06, () => f, 0.5, dec(30), 0.26); pls(e.t + 0.06, 0.12, () => f * 1.5, 0.5, dec(20), 0.26); break;
    case 'win': [0, 4, 7, 12].forEach((s, i) => pls(e.t + i * 0.06, 0.4, () => mtof(nm('F', 6) + s), 0.25, dec(5), 0.16)); break;
  }
}
// ---------------------------------------------------------------- render: opts.bus 'm' (music only) / 's' (SFX only) / both
// memory: two output channels plus a temporary lead bus (released after the echo)
function renderAudio(opts) {
  opts = opts || {};
  const L = new Float32Array(NS), R = new Float32Array(NS);
  const sfx = sfxEvents();
  if (opts.bus !== 's') {
    let LL = new Float32Array(NS), LR = new Float32Array(NS);
    for (const e of musicEvents()) playMusic(e, L, R, LL, LR);
    // dotted-eighth ping-pong echo on the lead bus (feedback 0.34, unrolled to 6 taps, circular)
    const D = Math.round(0.375 * SR), fb = 0.34, mix = 0.36;
    for (let i = 0; i < NS; i++) {
      let el = 0, er = 0, w = 1;
      for (let k = 1; k <= 6; k++) { w *= fb; const j = (i - k * D + NS * 6) % NS; if (k % 2) { el += w * LR[j]; er += w * LL[j]; } else { el += w * LL[j]; er += w * LR[j]; } }
      L[i] += (LL[i] + el) * mix; R[i] += (LR[i] + er) * mix;
    }
    LL = null; LR = null;
    // ducking: the music dips under the big hits
    for (const e of sfx) {
      const dk = DUCK[e.k]; if (!dk) continue;
      const i0 = Math.round(e.t * SR), n = Math.round(0.45 * SR), att = 0.01 * SR;
      for (let k = 0; k < n; k++) { const i = (i0 + k) % NS, a = k < att ? k / att : Math.exp(-(k / SR - 0.01) * 7), gg = 1 - dk * a; L[i] *= gg; R[i] *= gg; }
    }
  }
  if (opts.bus !== 'm') for (const e of sfx) playSfx(e, L, R);
  // gentle low-pass (the chip's output filter), DC blocking and soft clipping; circular, in place
  const a = Math.exp(-TAU * 11000 / SR);
  for (const ch of [L, R]) {
    let y = 0, x1 = 0, hp = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < NS; i++) {
      const x = ch[i];
      y = a * y + (1 - a) * x;
      hp = 0.9995 * (hp + y - x1); x1 = y;
      if (pass === 1) ch[i] = Math.tanh(hp * 0.9);
    }
  }
  return { L, R };
}
// ---------------------------------------------------------------- player playback (one buffer, the audio clock drives the picture)
const LIVE = { ctx: null, buf: null, src: null, gain: null, muted: false, startAt: 0, offset: 0, ready: false };
function liveInit() {
  if (LIVE.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  LIVE.ctx = new AC({ sampleRate: SR });
  LIVE.gain = LIVE.ctx.createGain(); LIVE.gain.gain.value = 0.9; LIVE.gain.connect(LIVE.ctx.destination);
}
function liveBuild() {
  if (LIVE.buf) return;
  liveInit();
  const a = renderAudio();
  const b = LIVE.ctx.createBuffer(2, NS, SR); b.getChannelData(0).set(a.L); b.getChannelData(1).set(a.R);
  LIVE.buf = b; LIVE.ready = true;
}
function livePlay(t) {
  liveBuild();
  if (LIVE.ctx.state === 'suspended') LIVE.ctx.resume();
  const s = LIVE.ctx.createBufferSource(); s.buffer = LIVE.buf; s.connect(LIVE.gain);
  LIVE.startAt = LIVE.ctx.currentTime + 0.03; LIVE.offset = t; s.start(LIVE.startAt, t); LIVE.src = s;
}
function livePause() { if (LIVE.src) { try { LIVE.src.stop(); } catch (e) { } LIVE.src = null; } }
function liveNow() { return LIVE.offset + Math.max(0, LIVE.ctx.currentTime - LIVE.startAt); }
function liveMute(m) { LIVE.muted = m; if (LIVE.gain) LIVE.gain.gain.value = m ? 0 : 0.9; }
